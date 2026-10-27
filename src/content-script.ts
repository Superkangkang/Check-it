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
import { Lightbox } from './lightbox';
import { DelabMode, ModeSwitcher } from './mode-switcher';
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
import { captureElementSnapshot } from './snapshot';

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
  private lightbox: Lightbox;
  private switcher: ModeSwitcher;

  /** 当前模式，插件激活时默认进入走查模式 */
  private mode: DelabMode = 'inspect';
  /** 已经生效的模式，避免重复应用 */
  private appliedMode: DelabMode | null = null;

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
    this.selectionFinder = new Viewfinder(root, '#3b4590', 'delab-selection-frame');
    this.pins = new CommentPins(root);
    // 大图预览要压在最上层，先于指针创建，保证自定义指针仍可见
    this.lightbox = new Lightbox(root);
    this.pointer = new PointerCursor(root);
    this.commentButton = new CommentButton(root, () => this.startComment());
    this.popover = new CommentPopover(root, {
      onSubmit: body => { void this.submitComment(body); },
      onToggleResolve: thread => { void this.toggleResolve(thread); },
      onDelete: thread => { void this.deleteComment(thread); },
      onCopyAll: () => { void this.handleCopyAll(); },
      onPreviewImage: dataUrl => this.lightbox.show(dataUrl),
      onDismiss: () => this.restoreCommentButton(),
    });
    this.extractor = new StyleExtractor();

    this.switcher = new ModeSwitcher(root, {
      onSelect: mode => this.setMode(mode),
      onClose: () => {
        this.exitInspectMode();
        chrome.runtime.sendMessage({ type: 'INSPECT_MODE_CHANGED', active: false });
      },
    });

    // 传入 close 回调：直接退出检查模式，无需消息往返
    this.panelMgr = new FloatingPanelManager(root, {
      onClose: () => {
        this.exitInspectMode();
        chrome.runtime.sendMessage({ type: 'INSPECT_MODE_CHANGED', active: false });
      },
      onCommit: this.handleCommit,
      onReset: this.handleReset,
      onResetAll: this.handleResetAll,
      onLocateComment: id => this.locateComment(id),
      onToggleResolveComment: thread => { void this.toggleResolve(thread); },
      onDeleteComment: thread => { void this.deleteComment(thread); },
      onCopyAllComments: () => { void this.handleCopyAll(); },
      onPreviewCommentImage: dataUrl => this.lightbox.show(dataUrl),
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

  /** 插件激活：进入走查模式并展示模式切换器 */
  private enterInspectMode() {
    this.mode = 'inspect';
    document.addEventListener('keydown', this.handleKeyDown, true);
    this.switcher.show(this.mode);
    void this.openComments();
    this.applyMode();
  }

  /** 退出插件：清理模式切换器与全部浮层 */
  private exitInspectMode() {
    this.teardownMode();
    document.removeEventListener('keydown', this.handleKeyDown, true);
    this.switcher.hide();
    this.appliedMode = null;
    this.stateManager.setState(InspectState.IDLE);
  }

  /** 切换模式（快捷键 / 切换器） */
  private setMode(mode: DelabMode) {
    if (!this.switcher.isVisible()) return;
    this.mode = mode;
    this.switcher.setMode(mode);
    this.applyMode();
  }

  /** 按当前模式应用交互与面板 */
  private applyMode() {
    if (this.mode === 'browse') {
      this.applyBrowseMode();
      return;
    }
    if (this.appliedMode === this.mode) return;

    // 走查 / 评论都需要拦截页面交互并高亮元素
    this.teardownMode();
    this.appliedMode = this.mode;
    this.stateManager.setState(InspectState.INSPECTING);
    document.addEventListener('mouseover', this.handleMouseOver, true);
    document.addEventListener('click', this.handleClick, true);
    this.applyCursor();
    this.pointer.enable();

    if (this.mode === 'comment') {
      this.panelMgr.showComments(this.comments, this.activeCommentId);
    } else {
      this.panelMgr.showEmpty();
    }
    this.renderPins();
  }

  /** 浏览器模式：不拦截页面交互，仅保留切换器；已写入的样式保留 */
  private applyBrowseMode() {
    this.teardownMode();
    this.appliedMode = 'browse';
    this.stateManager.setState(InspectState.IDLE);
  }

  /** 清理走查 / 评论模式的交互与浮层 */
  private teardownMode() {
    document.removeEventListener('mouseover', this.handleMouseOver, true);
    document.removeEventListener('click', this.handleClick, true);
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
    this.lightbox.hide();
    this.pins.clear();
    this.hoverFinder.hide();
    this.selectionFinder.hide();
    this.boxModelOverlay.hide();
    this.glassLabel.unpin();
    this.panelMgr.hide();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // 大图优先关闭，保留底下的评论弹层
      if (this.lightbox.isOpen()) {
        e.preventDefault();
        e.stopPropagation();
        this.lightbox.hide();
        return;
      }

      // 面板里正在编辑数值时，Esc 由字段自己处理（撤销本次修改）
      if (this.isEditingField()) return;

      // Esc 只收起评论弹层，退出插件由用户点关闭按钮
      if (this.popover.isOpen()) {
        this.popover.close();
        this.composing = null;
        this.restoreCommentButton();
      }
      return;
    }

    // 单键快捷键：输入中或带修饰键时不响应
    if (this.isEditingField() || e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === 'a') {
      e.preventDefault();
      this.setMode('browse');
    } else if (key === 'c') {
      e.preventDefault();
      this.setMode('inspect');
    } else if (key === 'm') {
      e.preventDefault();
      this.setMode('comment');
    }
  };

  /** 面板里是否正在编辑数值输入框 */
  private isEditingField(): boolean {
    const shadowActive = this.shadowHost.getRoot().activeElement as HTMLElement | null;
    if (isTextField(shadowActive)) return true;

    return isTextField(document.activeElement as HTMLElement | null);
  }

  private handleMouseOver = (e: MouseEvent) => {
    const target = e.target as Element;
    if (target === document.body || target === document.documentElement) {
      // 评论模式悬停标签跟随光标，移出元素后收起
      if (this.mode === 'comment') this.glassLabel.hide();
      return;
    }
    if (target.closest('#delab-root') || target.closest('#delab-floating-root')) return;

    // 已选中的元素保留自己的实线框，悬停不再覆盖它
    if (target === this.lockedTarget) this.hoverFinder.hide();
    else this.hoverFinder.show(target);

    // 评论模式：悬停即显示标签，明确即将评论的对象（弹层打开时保持钉住不动）
    if (this.mode === 'comment' && !this.popover.isOpen()) this.glassLabel.show(target);

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

    // 评论模式：点击即评论，直接弹出输入框
    if (this.mode === 'comment') {
      this.stateManager.setState(InspectState.LOCKED);
      this.lockedTarget = target;
      this.session = null;
      this.selectionFinder.show(target);
      this.boxModelOverlay.show(target);
      this.glassLabel.pin(target);
      this.commentButton.hide();
      this.startCommentOn(target);
      return;
    }

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
    this.startCommentOn(target);
  }

  /** 对指定元素打开评论输入框 */
  private startCommentOn(target: Element) {
    const identity = describeElement(target);
    this.composing = { target, identity };
    this.commentButton.hide();
    this.popover.openComposer(target, identity);
  }

  private async openComments() {
    this.comments = await loadComments();
    this.refreshCommentsUI();
  }

  /** 评论数据变化后统一同步：页面气泡 + 面板列表 + 切换器计数 */
  private refreshCommentsUI() {
    this.renderPins();
    this.panelMgr.setComments(this.comments, this.activeCommentId);
    this.switcher.setCommentCount(this.comments.filter(thread => !thread.resolved).length);
  }

  private renderPins() {
    // 仅走查 / 评论模式展示评论气泡（异步加载完成时可能晚于模式切换）
    if (this.appliedMode !== 'inspect' && this.appliedMode !== 'comment') {
      this.pins.clear();
      return;
    }

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

    // 提交瞬间截取元素及周边区域，跨页面定位失效时靠图辨认
    const snapshot = composing.target.isConnected
      ? await captureElementSnapshot(composing.target, this.shadowHost.getElement())
      : null;

    const thread = createThread(composing.identity, body);
    if (snapshot) thread.snapshot = snapshot;

    this.comments = await saveThread(thread);
    this.composing = null;
    this.activeCommentId = thread.id;
    this.refreshCommentsUI();
    this.popover.close();
    this.restoreCommentButton();
    this.showToast('评论已添加');
  }

  private openThread(id: string) {
    const index = this.comments.findIndex(item => item.id === id);
    const thread = this.comments[index];
    if (!thread) return;

    this.activeCommentId = id;
    this.refreshCommentsUI();

    const target = this.pins.getTarget(id);
    if (!target) return;
    this.glassLabel.pin(target);
    this.selectionFinder.show(target);
    this.commentButton.hide();
    this.popover.openThread(target, thread, index + 1);
  }

  /** 从评论面板点击定位：滚动到元素并高亮 */
  private locateComment(id: string) {
    const index = this.comments.findIndex(item => item.id === id);
    const thread = this.comments[index];
    if (!thread) return;

    if (this.mode !== 'comment') this.setMode('comment');

    const target = this.pins.getTarget(id);
    if (!target) {
      this.showToast('元素已不在当前页面');
      return;
    }

    this.activeCommentId = id;
    this.glassLabel.pin(target);
    this.selectionFinder.show(target);
    this.commentButton.hide();
    this.refreshCommentsUI();
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.popover.openThread(target, thread, index + 1);
  }

  private async toggleResolve(thread: CommentThread) {
    this.comments = await patchThread(pageKey(), thread.id, { resolved: !thread.resolved });
    this.refreshCommentsUI();

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
    this.refreshCommentsUI();
    this.restoreCommentButton();
  }

  private restoreCommentButton() {
    this.composing = null;

    // 评论模式点击即评论，不需要额外的评论按钮；弹层关闭后结束本轮选中
    if (this.mode === 'comment') {
      this.lockedTarget = null;
      this.glassLabel.unpin();
      this.selectionFinder.hide();
      this.boxModelOverlay.hide();
      return;
    }

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
        bottom: 64px;
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
    this.shadowHost.setCursorHidden(true);
  }

  private clearCursor() {
    this.cursorStyle?.remove();
    this.cursorStyle = null;
    this.shadowHost.setCursorHidden(false);
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

/** 焦点是否落在可输入控件上（单键快捷键需避让） */
function isTextField(node: HTMLElement | null): boolean {
  if (!node) return false;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName)) return true;
  return node.isContentEditable;
}

new DelabApp();
