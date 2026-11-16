// DeLab Content Script

import { InspectState, InspectStateManager } from './state';
import { BoxModelOverlay } from './box-model-overlay';
import { GlassLabel } from './box-model-tooltip';
import { ShadowHost } from './shadow-dom';
import { StyleExtractor, countModifiedControls } from './style-extractor';
import { Viewfinder } from './highlight';
import { MeasureOverlay } from './measure-overlay';
import { injectFonts } from './fonts';
import { EditSession } from './edit-session';
import { PanelBridge, type DomNode } from './panel-bridge';
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
  saveThread,
  toMarkdown,
} from './comment-store';
import { ElementIdentity, describeElement } from './element-identity';
import { captureElementSnapshot } from './snapshot';
import { ThemeManager } from './theme';

/** 左侧 DOM 树中不展示的标签 */
const DOM_TREE_SKIP = new Set([
  'SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE', 'BASE',
]);

class DelabApp {
  private stateManager: InspectStateManager;
  private shadowHost: ShadowHost;
  private boxModelOverlay: BoxModelOverlay;
  private glassLabel: GlassLabel;
  private hoverFinder: Viewfinder;
  private selectionFinder: Viewfinder;
  private measureOverlay: MeasureOverlay;
  private extractor: StyleExtractor;
  private panelMgr: PanelBridge;
  private pins: CommentPins;
  private popover: CommentPopover;
  private commentButton: CommentButton;
  private pointer: PointerCursor;
  private lightbox: Lightbox;
  /** 设备预览的 iframe 内不创建切换器与视口控制，模式由父页面下发 */
  private switcher: ModeSwitcher | null = null;
  private embedded: boolean;
  /** iframe 内是否已激活 */
  private embeddedActive = false;

  /** 当前模式，插件激活时默认进入走查模式 */
  private mode: DelabMode = 'inspect';
  /** 已经生效的模式，避免重复应用 */
  private appliedMode: DelabMode | null = null;

  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  private lastHoverTarget: Element | null = null;
  /** 当前鼠标悬停的元素，供按住 Alt 时实时量距 */
  private hoveredTarget: Element | null = null;
  /** 当前模拟视口尺寸（null = 按真实窗口） */
  private viewportState: { width: number; height: number } | null = null;
  /** 按住 Alt 进入测量态 */
  private measuring = false;

  /** Element currently locked for inspection */
  private lockedTarget: Element | null = null;
  /** Edit records for the locked element */
  private session: EditSession | null = null;
  /** 按元素缓存会话：切回已改过的元素时仍保留「已修改」高亮 */
  private sessions = new WeakMap<HTMLElement, EditSession>();
  private refreshQueued = false;

  private comments: CommentThread[] = [];
  /** 正在写评论的目标元素 */
  private composing: { target: Element; identity: ElementIdentity } | null = null;
  private activeCommentId: string | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private cursorStyle: HTMLStyleElement | null = null;

  constructor(options: { embedded?: boolean } = {}) {
    this.embedded = options.embedded === true;
    this.stateManager = new InspectStateManager();
    this.shadowHost = new ShadowHost();
    // 先于任何浮层把主题变量写到页面上，避免切换器等先用错误的 fallback 闪一下
    new ThemeManager();
    const root = this.shadowHost.getRoot();
    this.boxModelOverlay = new BoxModelOverlay(root);
    this.glassLabel = new GlassLabel(root);
    this.hoverFinder = new Viewfinder(root);
    // 选中态用不透明的品牌绿，和半透明悬停态区分开
    this.selectionFinder = new Viewfinder(root, 'var(--delab-accent, #32f08c)', 'delab-selection-frame', 1);
    this.measureOverlay = new MeasureOverlay(root);
    this.pins = new CommentPins(root);
    // 大图预览要压在最上层，先于指针创建，保证自定义指针仍可见
    this.lightbox = new Lightbox(root);
    this.pointer = new PointerCursor(root);
    this.commentButton = new CommentButton(root, () => this.startComment());
    this.popover = new CommentPopover(root, {
      onSubmit: body => { void this.submitComment(body); },
      onToggleResolve: thread => { void this.toggleResolve(thread); },
      onCopyAll: () => { void this.handleCopyAll(); },
      onPreviewImage: dataUrl => this.lightbox.show(dataUrl),
      onDismiss: () => this.restoreCommentButton(),
    });
    this.extractor = new StyleExtractor();

    if (!this.embedded) {
      this.switcher = new ModeSwitcher(root, {
        onSelect: mode => this.setMode(mode),
        onClose: () => {
          this.exitInspectMode();
          chrome.runtime.sendMessage({ type: 'INSPECT_MODE_CHANGED', active: false });
        },
        onViewportChange: (width, height) => this.openWorkspace(width, height),
        onViewportReset: () => this.resetViewport(true),
      });
    }

    // 面板 UI 在浏览器侧边栏 / 设备预览工作区：这里只负责同步数据、接收指令
    this.panelMgr = new PanelBridge({
      onClose: () => {
        if (this.embedded) return;
        this.exitInspectMode();
        chrome.runtime.sendMessage({ type: 'INSPECT_MODE_CHANGED', active: false });
      },
      onCommit: this.handleCommit,
      onReset: this.handleReset,
      onResetAll: this.handleResetAll,
      onLocateComment: id => this.locateComment(id),
      onToggleResolveComment: id => {
        const thread = this.comments.find(item => item.id === id);
        if (thread) void this.toggleResolve(thread);
      },
      onSelectDom: path => this.selectDomPath(path),
      onHoverDom: path => this.hoverDomPath(path),
      onRefreshDom: () => this.sendDomTree(),
    }, {
      respondToHello: !this.embedded,
      scope: this.embedded ? 'workspace' : undefined,
    });

    window.addEventListener('blur', this.handleWindowBlur);
    injectFonts();
    if (!this.embedded) this.init();
  }

  private init() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TOGGLE_INSPECT') {
        message.active ? this.enterInspectMode() : this.exitInspectMode();
      }
      if (message.type === 'EXIT_INSPECT') {
        this.exitInspectMode();
      }
      if (message.type === 'VIEWPORT_STATE') {
        this.viewportState = message.state ?? null;
        this.switcher?.setViewport(this.viewportState);
      }
      if (message.type === 'DEBUGGER_VIEWPORT') {
        this.applyViewport(Number(message.width) || 375, Number(message.height) || 812);
      }
    });
  }

  /** 插件激活：进入走查模式并展示模式切换器 */
  private enterInspectMode() {
    this.mode = 'inspect';
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('keyup', this.handleKeyUp, true);
    this.switcher?.show(this.mode);
    this.syncViewport();
    void this.openComments();
    this.applyMode();
  }

  /** 退出插件：清理模式切换器与全部浮层 */
  private exitInspectMode() {
    this.teardownMode();
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('keyup', this.handleKeyUp, true);
    this.switcher?.hide();
    // 退出时还原真实视口，避免页面停留在模拟尺寸
    this.resetViewport(false);
    this.appliedMode = null;
    this.stateManager.setState(InspectState.IDLE);
  }

  /** 切换模式（快捷键 / 切换器） */
  private setMode(mode: DelabMode) {
    if (!this.switcher?.isVisible()) return;
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
    this.hoveredTarget = null;
    this.measuring = false;
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
    this.measureOverlay.hide();
    this.boxModelOverlay.hide();
    this.glassLabel.unpin();
    this.panelMgr.hide();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // 按住 Alt：选中元素后进入量距态，悬浮其他元素即显示两者间距
    if (e.key === 'Alt') {
      if (!this.isEditingField()) this.setMeasuring(true);
      return;
    }

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

    // 嵌入预览：快捷键通过父页面切换模式
    if (this.embedded) {
      if (this.isEditingField() || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const mode = key === 'a' ? 'browse' : key === 'c' ? 'inspect' : key === 'm' ? 'comment' : null;
      if (!mode) return;
      e.preventDefault();
      try {
        window.parent.postMessage({ type: 'DELAB_PREVIEW_MODE_REQUEST', mode }, '*');
      } catch { /* ignore */ }
      return;
    }

    // 单键快捷键：输入中或带修饰键时不响应
    if (this.isEditingField() || e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === 'a') {
      e.preventDefault();
      this.switchModeByKey('browse');
    } else if (key === 'c') {
      e.preventDefault();
      this.switchModeByKey('inspect');
    } else if (key === 'm') {
      e.preventDefault();
      this.switchModeByKey('comment');
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Alt') this.setMeasuring(false);
  };

  private handleWindowBlur = () => {
    this.setMeasuring(false);
  };

  /** 快捷键切换：把焦点从切换器按钮移开，避免原按钮残留焦点描边 */
  private switchModeByKey(mode: DelabMode) {
    if (!this.switcher) return;
    this.setMode(mode);
    const active = this.shadowHost.getRoot().activeElement as HTMLElement | null;
    if (active && active.closest('#delab-mode-switcher')) active.blur();
  }

  /** 面板里是否正在编辑数值输入框 */
  private isEditingField(): boolean {
    const shadowActive = this.shadowHost.getRoot().activeElement as HTMLElement | null;
    if (isTextField(shadowActive)) return true;

    return isTextField(document.activeElement as HTMLElement | null);
  }

  /** 悬停离开页面元素（进入 body / 插件 UI）时清掉悬停态，避免旧框残留 */
  private clearHover() {
    this.hoverFinder.hide();
    this.hoveredTarget = null;
    this.measureOverlay.hide();
    if (this.lockedTarget) return; // 锁定后盒模型固定在选中元素上，不清
    this.boxModelOverlay.hide();
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    this.lastHoverTarget = null;
  }

  private handleMouseOver = (e: MouseEvent) => {
    const target = e.target as Element;
    if (target === document.body || target === document.documentElement) {
      if (this.mode === 'comment') this.glassLabel.hide();
      this.clearHover();
      return;
    }
    if (target.closest('#delab-root') || target.closest('#delab-floating-root')) {
      this.clearHover();
      return;
    }

    this.hoveredTarget = target;

    // 以真实的 Alt 键状态为准，避免窗口失焦等情况下状态残留
    if (e.altKey !== this.measuring) this.setMeasuring(e.altKey);

    // 测量态：用悬浮元素与选中元素量距，不显示常规悬停框
    if (this.measuring) {
      this.refreshMeasurement();
      return;
    }

    // 已选中的元素保留自己的实线框，悬停不再覆盖它
    if (target === this.lockedTarget) this.hoverFinder.hide();
    else this.hoverFinder.show(target);

    // 评论模式只高亮对象、不显示类名标签
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

  // --- 量距（按住 Alt） ---

  /** 开 / 关测量态；仅走查模式下、已选中元素且没有在写评论时生效 */
  private setMeasuring(on: boolean) {
    if (on === this.measuring) return;

    if (on) {
      if (this.mode !== 'inspect' || !this.lockedTarget) return;
      if (this.composing || this.popover.isOpen()) return;
      this.measuring = true;
      this.refreshMeasurement();
      return;
    }

    this.measuring = false;
    this.measureOverlay.hide();
    this.restoreHoverFrame();
  }

  /** 按当前悬停元素重算测量线 */
  private refreshMeasurement() {
    const from = this.lockedTarget;
    const to = this.hoveredTarget;

    // 测量态下不显示常规悬停框，用虚线框 + 测量线代替
    this.hoverFinder.hide();

    if (!this.measuring || !from || !to || to === from || !to.isConnected) {
      this.measureOverlay.hide();
      return;
    }
    this.measureOverlay.show(from, to);
  }

  /** 松开 Alt 后恢复当前悬停元素的常规高亮 */
  private restoreHoverFrame() {
    const target = this.hoveredTarget;
    if (!target || !target.isConnected || target === this.lockedTarget) {
      this.hoverFinder.hide();
      return;
    }
    this.hoverFinder.show(target);
  }

  private handleClick = (e: MouseEvent) => {
    const target = e.target as Element;
    if (target === document.body || target === document.documentElement) return;
    if (target.closest('#delab-root') || target.closest('#delab-floating-root')) return;

    e.preventDefault();
    e.stopPropagation();
    this.measureOverlay.hide();

    // 评论模式：点击即评论，直接弹出输入框（不显示类名标签）
    if (this.mode === 'comment') {
      this.stateManager.setState(InspectState.LOCKED);
      this.lockedTarget = target;
      this.session = null;
      this.selectionFinder.show(target);
      this.boxModelOverlay.show(target);
      this.commentButton.hide();
      this.startCommentOn(target);
      return;
    }

    this.stateManager.setState(InspectState.LOCKED);
    this.lockElement(target);
    this.glassLabel.pin(target);
    this.boxModelOverlay.show(target);
    this.refresh();
    // 页面结构可能已变化，同步一次树，保证左侧能定位到该元素
    this.sendDomTree();
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
    this.popover.openComposer(target);
  }

  private async openComments() {
    this.comments = await loadComments();
    this.refreshCommentsUI();
  }

  /** 评论数据变化后统一同步：页面气泡 + 面板列表 + 切换器计数 */
  private refreshCommentsUI() {
    this.renderPins();
    this.panelMgr.setComments(this.comments, this.activeCommentId);
    const openCount = this.comments.filter(thread => !thread.resolved).length;
    this.switcher?.setCommentCount(openCount);
  }

  private renderPins() {
    // 仅走查 / 评论模式展示评论气泡（异步加载完成时可能晚于模式切换）
    if (this.appliedMode !== 'inspect' && this.appliedMode !== 'comment') {
      this.pins.clear();
      return;
    }

    // 已解决的评论视为处理完毕：气泡与面板列表一起收起，编号仍按原始顺序
    this.pins.render(
      this.comments
        .map((thread, index) => ({ thread, index: index + 1 }))
        .filter(({ thread }) => !thread.resolved)
        .map(({ thread, index }) => ({
          id: thread.id,
          index,
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
        background: var(--delab-glass-bg, rgba(23, 23, 24, 0.94));
        color: var(--delab-glass-text, #ececee);
        border: 1px solid var(--delab-glass-border, rgba(255, 255, 255, 0.12));
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
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

  // --- 视口尺寸（chrome.debugger 模拟，作为设备预览的回退） ---

  /** 打开插件时同步后台记录的模拟视口，刷新页面后按钮状态不丢失 */
  private syncViewport() {
    if (this.embedded) return;
    chrome.runtime.sendMessage({ type: 'VIEWPORT_GET' }, response => {
      if (chrome.runtime.lastError) return;
      this.viewportState = response?.state ?? null;
      this.switcher?.setViewport(this.viewportState);
    });
  }

  private applyViewport(width: number, height: number) {
    if (this.embedded) return;
    chrome.runtime.sendMessage(
      {
        type: 'VIEWPORT_SET',
        width,
        height,
        deviceScaleFactor: window.devicePixelRatio || 1,
      },
      response => {
        if (chrome.runtime.lastError || !response?.ok) {
          this.showToast(response?.error || '视口调整失败：请先关闭该标签页的 DevTools');
          return;
        }
        this.viewportState = {
          width: response.width ?? width,
          height: response.height ?? height,
        };
        this.switcher?.setViewport(this.viewportState);
        this.showToast(`视口 ${this.viewportState.width} × ${this.viewportState.height}`);
      }
    );
  }

  private resetViewport(notify: boolean) {
    if (this.embedded) return;
    chrome.runtime.sendMessage({ type: 'VIEWPORT_RESET' }, () => {
      this.viewportState = null;
      if (chrome.runtime.lastError) return;
      this.switcher?.setViewport(null);
      if (notify) this.showToast('视口已还原为窗口大小');
    });
  }

  // --- 设备预览工作区（独立标签页） ---

  /** 在新标签页打开设备预览：左侧设备画布 + 右侧样式面板 */
  private openWorkspace(width: number, height: number) {
    if (this.embedded) return;
    // 避免原页面停留在 debugger 模拟尺寸
    if (this.viewportState) this.resetViewport(false);
    chrome.runtime.sendMessage(
      { type: 'OPEN_WORKSPACE', url: location.href, width, height },
      response => {
        if (chrome.runtime.lastError || !response?.ok) {
          this.showToast(response?.error || '无法打开设备预览');
          return;
        }
        this.showToast('已在新标签页打开设备预览');
      }
    );
  }

  // --- iframe 内：设备预览子页面 ---

  /** 父页面握手成功后激活走查（iframe 内不创建切换器） */
  activateEmbedded(mode: DelabMode) {
    this.mode = mode;
    if (this.embeddedActive) {
      this.applyMode();
      this.sendDomTree();
      return;
    }
    this.embeddedActive = true;
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('keyup', this.handleKeyUp, true);
    void this.openComments();
    this.applyMode();
    this.sendDomTree();
  }

  /** 父页面切换走查 / 评论 / 浏览器模式 */
  setEmbeddedMode(mode: DelabMode) {
    if (!this.embeddedActive) return;
    this.mode = mode;
    this.applyMode();
  }

  // --- 左侧 DOM 树 ---

  private sendDomTree() {
    this.panelMgr.showDom(this.buildDomTree());
  }

  private domChildren(el: Element): Element[] {
    return Array.from(el.children).filter(child => (
      !DOM_TREE_SKIP.has(child.tagName)
      && child.id !== 'delab-root'
      && child.id !== 'delab-floating-root'
    ));
  }

  private buildDomTree(): DomNode[] {
    const body = document.body;
    if (!body) return [];

    let count = 0;
    const walk = (el: Element, path: number[], depth: number): DomNode => {
      count++;
      const children = depth >= 14 || count >= 2000
        ? []
        : this.domChildren(el).map((child, index) => walk(child, [...path, index], depth + 1));
      const cls = Array.from(el.classList).slice(0, 2).join('.');
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id && !el.id.startsWith('delab') ? el.id : undefined,
        cls: cls || undefined,
        path,
        children,
      };
    };

    return [walk(body, [], 0)];
  }

  private resolveDomPath(path: number[]): Element | null {
    let el: Element | null = document.body;
    for (const index of path) {
      if (!el) return null;
      el = this.domChildren(el)[index] ?? null;
    }
    return el;
  }

  private computeDomPath(target: Element): number[] {
    const path: number[] = [];
    let node: Element | null = target;
    while (node && node !== document.body) {
      const parent: Element | null = node.parentElement;
      if (!parent) return [];
      const index = this.domChildren(parent).indexOf(node);
      if (index < 0) return [];
      path.unshift(index);
      node = parent;
    }
    return node === document.body ? path : [];
  }

  private selectDomPath(path: number[]) {
    const el = this.resolveDomPath(path);
    if (!el) return;

    if (this.mode !== 'inspect') {
      this.setEmbeddedMode('inspect');
      try {
        window.parent.postMessage({ type: 'DELAB_PREVIEW_MODE_REQUEST', mode: 'inspect' }, '*');
      } catch { /* ignore */ }
    }

    this.stateManager.setState(InspectState.LOCKED);
    this.lockElement(el);
    this.glassLabel.pin(el);
    this.boxModelOverlay.show(el);
    this.refresh();
  }

  private hoverDomPath(path: number[] | null) {
    if (path && this.mode !== 'browse') {
      const el = this.resolveDomPath(path);
      if (el) {
        this.hoverFinder.show(el);
        return;
      }
    }
    this.hoverFinder.hide();
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
    if (!el || !el.style) { this.session = null; return; }
    let session = this.sessions.get(el);
    if (!session) {
      session = new EditSession(el);
      this.sessions.set(el, session);
    }
    this.session = session;
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
      modifiedCount: countModifiedControls(groups),
      domPath: this.computeDomPath(target),
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

if (window.top !== window && !(window as unknown as { __delabPreviewChild?: boolean }).__delabPreviewChild) {
  // 设备预览工作区的 iframe：等父页面握手后再激活
  // 幂等标记：manifest 注入与工作区补注入可能同时发生
  (window as unknown as { __delabPreviewChild?: boolean }).__delabPreviewChild = true;
  let app: DelabApp | null = null;

  window.addEventListener('message', event => {
    if (event.source !== window.parent) return;

    const data = event.data as { type?: string; token?: string; mode?: DelabMode } | null;
    if (!data) return;

    if (data.type === 'DELAB_PREVIEW_INIT') {
      const mode: DelabMode = data.mode === 'browse' || data.mode === 'comment' ? data.mode : 'inspect';
      app ??= new DelabApp({ embedded: true });
      app.activateEmbedded(mode);
      // 父页面是扩展工作区（跨域），用 * 回传随机 token
      window.parent.postMessage({ type: 'DELAB_PREVIEW_READY', token: data.token }, '*');
      return;
    }

    if (data.type === 'DELAB_PREVIEW_MODE' && app) {
      if (data.mode === 'inspect' || data.mode === 'browse' || data.mode === 'comment') {
        app.setEmbeddedMode(data.mode);
      }
    }
  });
}
