// DeLab Panel Bridge — 把面板数据广播给 Chrome 侧边栏，并接收侧边栏下发的指令
// 面板 UI 已迁到浏览器侧边栏，页面内只保留高亮 / 盒模型 / 评论气泡等浮层

import type { CommentThread } from './comment-store';
import type { StylePayload } from './components/FloatingPanel';

export interface PanelBridgeCallbacks {
  onClose: () => void;
  /** 写入一条声明；返回值表示浏览器是否接受该值 */
  onCommit: (prop: string, value: string) => boolean;
  onReset: (prop: string) => void;
  onResetAll: () => void;
  /** 评论列表定位到元素 */
  onLocateComment: (id: string) => void;
  onToggleResolveComment: (id: string) => void;
}

type PanelView = 'style' | 'comments';

export interface PanelBridgeOptions {
  /** 是否响应侧边栏的 PANEL_HELLO；工作区 iframe 不需要 */
  respondToHello?: boolean;
  /** 工作区 iframe 的消息会带 scope，浏览器侧边栏据此忽略 */
  scope?: 'workspace';
}

export class PanelBridge {
  private visible = false;
  private mode: 'empty' | 'content' = 'empty';
  private view: PanelView = 'style';
  private data: StylePayload | null = null;
  private comments: CommentThread[] = [];
  private activeCommentId: string | null = null;
  /** 上次已发送的评论引用，避免每次改样式都重复传截图 */
  private sentComments: CommentThread[] | null = null;
  private sentActiveId: string | null = null;
  /** 是否曾真正展示过面板；未激活的 frame 不应响应侧边栏的握手 */
  private everShown = false;
  private respondToHello: boolean;
  private scope: 'workspace' | undefined;

  constructor(private callbacks: PanelBridgeCallbacks, options: PanelBridgeOptions = {}) {
    this.respondToHello = options.respondToHello !== false;
    this.scope = options.scope;
    chrome.runtime.onMessage.addListener(this.handleMessage);
  }

  showEmpty() {
    this.visible = true;
    this.everShown = true;
    this.mode = 'empty';
    this.view = 'style';
    this.data = null;
    this.pushState();
  }

  showData(data: StylePayload) {
    this.visible = true;
    this.everShown = true;
    this.mode = 'content';
    this.view = 'style';
    this.data = data;
    this.pushState();
  }

  /** 评论模式：侧边栏展示站点级评论列表 */
  showComments(comments: CommentThread[], activeId: string | null = null) {
    this.visible = true;
    this.everShown = true;
    this.view = 'comments';
    this.comments = comments;
    this.activeCommentId = activeId;
    this.pushComments();
    this.pushState();
  }

  /** 评论增删改后刷新列表，不改变当前视图 */
  setComments(comments: CommentThread[], activeId: string | null = null) {
    this.comments = comments;
    this.activeCommentId = activeId;
    this.pushComments();
  }

  hide() {
    this.visible = false;
    this.pushState();
  }

  private pushState() {
    void chrome.runtime.sendMessage({
      type: 'PANEL_STATE',
      scope: this.scope,
      visible: this.visible,
      mode: this.mode,
      view: this.view,
      data: this.data,
      activeCommentId: this.activeCommentId,
      url: location.href,
    }).catch(() => {});
  }

  private pushComments(force = false) {
    if (!force && this.comments === this.sentComments && this.activeCommentId === this.sentActiveId) return;
    this.sentComments = this.comments;
    this.sentActiveId = this.activeCommentId;
    void chrome.runtime.sendMessage({
      type: 'PANEL_COMMENTS',
      scope: this.scope,
      comments: this.comments,
      activeCommentId: this.activeCommentId,
    }).catch(() => {});
  }

  private handleMessage = (
    message: { type?: string; command?: string; [key: string]: unknown },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (message?.type === 'PANEL_HELLO') {
      // 未激活的 frame（广告位等）与工作区 iframe 不应抢答侧边栏
      if (!this.respondToHello || !this.everShown) return;
      this.pushComments(true);
      this.pushState();
      sendResponse({ ok: true });
      return;
    }
    if (message?.type !== 'PANEL_COMMAND') return;

    switch (message.command) {
      case 'commit':
        sendResponse({
          ok: this.callbacks.onCommit(String(message.prop ?? ''), String(message.value ?? '')),
        });
        return;
      case 'reset':
        this.callbacks.onReset(String(message.prop ?? ''));
        sendResponse({ ok: true });
        return;
      case 'resetAll':
        this.callbacks.onResetAll();
        sendResponse({ ok: true });
        return;
      case 'locateComment':
        this.callbacks.onLocateComment(String(message.id ?? ''));
        sendResponse({ ok: true });
        return;
      case 'toggleResolve':
        this.callbacks.onToggleResolveComment(String(message.id ?? ''));
        sendResponse({ ok: true });
        return;
      case 'close':
        this.callbacks.onClose();
        sendResponse({ ok: true });
        return;
      default:
        sendResponse({ ok: false });
    }
  };
}
