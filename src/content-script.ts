// DeLab Content Script

import { InspectState, InspectStateManager } from './state';
import { BoxModelOverlay } from './box-model-overlay';
import { GlassLabel } from './box-model-tooltip';
import { ShadowHost } from './shadow-dom';
import { StyleExtractor } from './style-extractor';
import { Viewfinder } from './highlight';
import { injectFonts } from './fonts';
import { EditSession } from './edit-session';
import { FloatingPanelManager } from './components/FloatingPanel';
import { CommentPins } from './comment-pins';
import { CommentPopover } from './comment-popover';
import { CommentButton } from './comment-button';
import { PointerCursor } from './pointer';
import {
  CommentThread,
  createThread,
  loadComments,
  pageKey,
  patchThread,
  removeThread,
  saveThread,
  toMarkdown,
} from './comment-store';
import { ElementIdentity, describeElement } from './element-identity';

class DelabApp {
  private stateManager: InspectStateManager;
  private shadowHost: ShadowHost;
  private boxModelOverlay: BoxModelOverlay;
  private glassLabel: GlassLabel;
  private hoverFinder: Viewfinder;
  private selectionFinder: Viewfinder;
  private extractor: StyleExtractor;
  private panelMgr: FloatingPanelManager;
  private pins: CommentPins;
  private popover: CommentPopover;
  private commentButton: CommentButton;
  private pointer: PointerCursor;

  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  private lastHoverTarget: Element | null = null;

  /** Element currently locked for inspection */
  private lockedTarget: Element | null = null;
  /** Edit records for the locked element */
  private session: EditSession | null = null;
  private refreshQueued = false;

  private comments: CommentThread[] = [];
  /** 正在写评论的目标元素 */
  private composing: { target: Element; identity: ElementIdentity } | null = null;
  private activeCommentId: string | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private cursorStyle: HTMLStyleElement | null = null;

  constructor() {
    this.stateManager = new InspectStateManager();
    this.shadowHost = new ShadowHost();
    const root = this.shadowHost.getRoot();
    this.boxModelOverlay = new BoxModelOverlay(root);
    this.glassLabel = new GlassLabel(root);
    this.hoverFinder = new Viewfinder(root);
    // 选中态用更深一级的紫色，和悬停态区分开
    this.selectionFinder = new Viewfinder(root, '#3b4590');
    this.pins = new CommentPins(root);
    this.pointer = new PointerCursor(root);
    this.commentButton = new CommentButton(root, () => this.startComment());
    this.popover = new CommentPopover(root, {
      onSubmit: body => { void this.submitComment(body); },
      onToggleResolve: thread => { void this.toggleResolve(thread); },
      onDelete: thread => { void this.deleteComment(thread); },
      onCopyAll: () => { void this.handleCopyAll(); },
      onDismiss: () => this.restoreCommentButton(),
    });
    this.extractor = new StyleExtractor();

    // 传入 close 回调：直接退出检查模式，无需消息往返
    this.panelMgr = new FloatingPanelManager(root, {
      onClose: () => {
        this.exitInspectMode();
        chrome.runtime.sendMessage({ type: 'INSPECT_MODE_CHANGED', active: false });
      },
      onCommit: this.handleCommit,
      onReset: this.handleReset,
      onResetAll: this.handleResetAll,
    });

    injectFonts();
    this.init();
  }

  private init() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TOGGLE_INSPECT') {
        message.active ? this.enterInspectMode() : this.exitInspectMode();
      }
      if (message.type === 'EXIT_INSPECT') {
        this.exitInspectMode();
      }
    });
  }

  private enterInspectMode() {
    this.stateManager.setState(InspectState.INSPECTING);
    document.addEventListener('mouseover', this.handleMouseOver, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    this.applyCursor();
    this.pointer.enable();
    this.panelMgr.showEmpty();
    void this.openComments();
  }

  private exitInspectMode() {
    this.stateManager.setState(InspectState.IDLE);
    document.removeEventListener('mouseover', this.handleMouseOver, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    this.clearCursor();
    this.pointer.disable();
    if (this.hoverTimer) { clearTimeout(this.hoverTimer); this.hoverTimer = null; }
    this.lastHoverTarget = null;
    // 页面上的修改保留，仅丢弃会话引用
    this.lockedTarget = null;
    this.session = null;
    this.composing = null;
    this.activeCommentId = null;
    this.popover.close();
    this.commentButton.hide();
    this.pins.clear();
    this.hoverFinder.hide();
    this.selectionFinder.hide();
    this.boxModelOverlay.hide();
    this.glassLabel.unpin();
    this.panelMgr.hide();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    // 面板里正在编辑数值时，Esc 由字段自己处理（撤销本次修改）
    if (this.isEditingField()) return;

    // 先关评论弹层，再退出插件
    if (this.popover.isOpen()) {
      this.popover.close();
      this.composing = null;
      this.restoreCommentButton();
      return;
    }
    this.exitInspectMode();
    chrome.runtime.sendMessage({ type: 'INSPECT_MODE_CHANGED', active: false });
  };

  /** 面板里是否正在编辑数值输入框 */
  private isEditingField(): boolean {
    const shadowActive = this.shadowHost.getRoot().activeElement as HTMLElement | null;
    if (shadowActive && /^(INPUT|SELECT)$/.test(shadowActive.tagName)) return true;

    const pageActive = document.activeElement as HTMLElement | null;
    return !!pageActive && /^(INPUT|SELECT)$/.test(pageActive.tagName);
  }

  private handleMouseOver = (e: MouseEvent) => {
    const target = e.target as Element;
    if (target === document.body || target === document.documentElement) return;
    if (target.closest('#delab-root') || target.closest('#delab-floating-root')) return;

    // 已选中的元素保留自己的实线框，悬停不再覆盖它
    if (target === this.lockedTarget) this.hoverFinder.hide();
    else this.hoverFinder.show(target);

    // 锁定后盒模型保持显示在选中元素上，不跟随悬停
    if (this.lockedTarget) return;

    if (target === this.lastHoverTarget) return;
    this.lastHoverTarget = target;

    if (this.hoverTimer) clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => {
      this.hoverTimer = null;
      this.boxModelOverlay.show(target);
    }, 80);
  };

  private handleClick = (e: MouseEvent) => {
    const target = e.target as Element;
    if (target === document.body || target === document.documentElement) return;
    if (target.closest('#delab-root') || target.closest('#delab-floating-root')) return;

    e.preventDefault();
    e.stopPropagation();

    this.stateManager.setState(InspectState.LOCKED);
    this.lockElement(target);
    this.glassLabel.pin(target);
    this.boxModelOverlay.show(target);
    this.refresh();
  };

  // --- 评论 ---

  /** 点击元素下方的「评论」按钮 */
  private startComment() {
    const target = this.lockedTarget;
    if (!target) return;
    const identity = describeElement(target);
    this.composing = { target, identity };
    this.commentButton.hide();
    this.popover.openComposer(target, identity);
  }

  private async openComments() {
    this.comments = await loadComments();
    this.renderPins();
  }

  private renderPins() {
    this.pins.render(
      this.comments.map((thread, index) => ({
        id: thread.id,
        index: index + 1,
        identity: thread.identity,
        active: thread.id === this.activeCommentId,
        onClick: (id: string) => this.openThread(id),
      }))
    );
  }

  private async submitComment(body: string) {
    const composing = this.composing;
    if (!composing) return;

    const thread = createThread(composing.identity, body);
    this.comments = await saveThread(thread);
    this.composing = null;
    this.activeCommentId = thread.id;
    this.renderPins();
    this.popover.close();
    this.restoreCommentButton();
    this.showToast('评论已添加');
  }

  private openThread(id: string) {
    const index = this.comments.findIndex(item => item.id === id);
    const thread = this.comments[index];
    if (!thread) return;

    this.activeCommentId = id;
    this.renderPins();

    const target = this.pins.getTarget(id);
    if (!target) return;
    this.glassLabel.pin(target);
    this.selectionFinder.show(target);
    this.commentButton.hide();
    this.popover.openThread(target, thread, index + 1);
  }

  private async toggleResolve(thread: CommentThread) {
    this.comments = await patchThread(pageKey(), thread.id, { resolved: !thread.resolved });
    this.renderPins();

    const index = this.comments.findIndex(item => item.id === thread.id);
    const updated = this.comments[index];
    const target = this.pins.getTarget(thread.id);
    if (updated && target && this.popover.isOpen()) {
      this.popover.openThread(target, updated, index + 1);
    }
  }

  private async deleteComment(thread: CommentThread) {
    this.comments = await removeThread(pageKey(), thread.id);
    if (this.activeCommentId === thread.id) this.activeCommentId = null;
    this.popover.close();
    this.renderPins();
    this.restoreCommentButton();
  }

  private restoreCommentButton() {
    this.composing = null;
    if (this.lockedTarget && this.popover.isOpen() === false) {
      this.commentButton.show(this.lockedTarget, this.glassLabel.width() + 6);
    }
  }

  private async handleCopyAll() {
    const openCount = this.comments.filter(thread => !thread.resolved).length;
    if (!this.comments.length) return;
    try {
      await this.writeClipboard(toMarkdown(this.comments, location.href));
      this.showToast(`已复制 ${openCount || this.comments.length} 条评论，粘贴给 AI 即可`);
    } catch {
      this.showToast('复制失败，请再点一次');
    }
  }

  private writeClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position: fixed; top: 0; left: 0; opacity: 0;';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    return Promise.resolve();
  }

  private showToast(text: string) {
    const root = this.shadowHost.getRoot();
    let node = root.querySelector<HTMLElement>('#delab-toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'delab-toast';
      node.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 14px;
        border-radius: 8px;
        background: var(--delab-glass-bg, rgba(15, 16, 17, 0.9));
        color: var(--delab-glass-text, #fff);
        border: 1px solid var(--delab-glass-border, rgba(255, 255, 255, 0.12));
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        z-index: 2147483646;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.18s ease;
      `;
      root.appendChild(node);
    }
    node.textContent = text;
    node.style.opacity = '1';
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      if (node) node.style.opacity = '0';
    }, 1800);
  }

  // --- 指针 ---

  /** 隐藏系统指针，改用跟随鼠标的 DOM 指针 */
  private applyCursor() {
    if (!this.cursorStyle) {
      this.cursorStyle = document.createElement('style');
      this.cursorStyle.id = 'delab-cursor';
      document.head.appendChild(this.cursorStyle);
    }
    // 用 :not(#id) 抬高优先级，压过页面自己的 cursor 声明；插件 UI 在 Shadow DOM 内不受影响
    this.cursorStyle.textContent = `
      html,
      html body *:not(#delab-root) {
        cursor: none !important;
      }
    `;
  }

  private clearCursor() {
    this.cursorStyle?.remove();
    this.cursorStyle = null;
  }

  // --- 测量 ---

  /** Start (or reuse) an edit session for the locked element. */
  private lockElement(target: Element) {
    if (target === this.lockedTarget) return;
    this.lockedTarget = target;
    const el = target as HTMLElement;
    this.session = el && el.style ? new EditSession(el) : null;
  }

  /** Write a declaration to the locked element, then refresh the panel. */
  private handleCommit = (prop: string, value: string): boolean => {
    if (!this.session) return false;
    if (!this.session.apply(prop, value)) return false;
    this.requestRefresh();
    return true;
  };

  private handleReset = (prop: string): void => {
    if (!this.session) return;
    this.session.reset(prop);
    this.requestRefresh();
  };

  private handleResetAll = (): void => {
    if (!this.session) return;
    this.session.resetAll();
    this.requestRefresh();
  };

  private requestRefresh() {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    requestAnimationFrame(() => {
      this.refreshQueued = false;
      this.refresh();
    });
  }

  /** Re-read the locked element and redraw panel / overlays. */
  private refresh() {
    const target = this.lockedTarget;
    if (!target) return;

    const groups = this.extractor.extract(target, this.session);
    const boxModel = this.extractor.getBoxModel(target);

    this.panelMgr.showData({
      tagName: target.tagName.toLowerCase(),
      id: target.id || '',
      classes: (target as HTMLElement).className || '',
      groups,
      boxModel,
      modifiedCount: this.session ? this.session.count() : 0,
    });

    this.showSelectionChrome(target);
    this.boxModelOverlay.show(target);
    this.selectionFinder.show(target);
  }

  /** 元素下方的「标签名 + 评论按钮」，两者等高并排 */
  private showSelectionChrome(target: Element) {
    this.glassLabel.show(target);
    if (this.popover.isOpen()) return;
    this.commentButton.show(target, this.glassLabel.width() + 6);
  }
}

new DelabApp();
