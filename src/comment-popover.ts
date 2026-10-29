// DeLab Comment Popover — 页面内评论弹层（输入 / 查看）

import { CommentThread } from './comment-store';
import { SANS, MONO } from './theme';

export interface PopoverActions {
  onSubmit: (body: string) => void;
  onToggleResolve: (thread: CommentThread) => void;
  /** 复制全部未解决评论给 AI */
  onCopyAll: () => void;
  /** 查看评论截图大图 */
  onPreviewImage: (dataUrl: string) => void;
  /** 弹层被关闭（Esc / 点击外部 / 关闭按钮） */
  onDismiss: () => void;
}

const WIDTH = 300;
const GAP = 8;

/** 头部图标按钮用的 24 格描边图形 */
const icon = (paths: string) =>
  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICON_COPY = icon('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>');
const ICON_RESOLVE = icon('<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-4.5"/>');
const ICON_REOPEN = icon('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>');
const ICON_CLOSE = icon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>');

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export class CommentPopover {
  private card: HTMLElement;
  private header: HTMLElement;
  private title: HTMLElement;
  private ops: HTMLElement;
  private body: HTMLElement;
  private actions: PopoverActions;
  private target: Element | null = null;
  private opened = false;
  private frame = 0;

  constructor(root: ShadowRoot, actions: PopoverActions) {
    this.actions = actions;

    this.card = document.createElement('div');
    this.card.id = 'delab-comment-popover';
    this.card.style.cssText = `
      position: fixed;
      width: ${WIDTH}px;
      display: none;
      flex-direction: column;
      background: var(--delab-elevated, #ffffff);
      color: var(--delab-text, #141416);
      border: 1px solid var(--delab-border-strong, rgba(0, 0, 0, 0.16));
      border-radius: 12px;
      box-shadow: var(--delab-shadow-float, 0 0 0 1px rgba(0, 0, 0, 0.05), 0 8px 20px -4px rgba(0, 0, 0, 0.16), 0 24px 56px -12px rgba(0, 0, 0, 0.26));
      font-family: ${SANS};
      z-index: 2147483646;
      overflow: hidden;
    `;

    this.header = document.createElement('div');
    this.header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px 6px 10px;
      border-bottom: 1px solid var(--delab-border, rgba(0, 0, 0, 0.08));
    `;

    this.title = document.createElement('span');
    this.title.style.cssText = `
      flex: 1;
      min-width: 0;
      font-family: ${MONO};
      font-size: 10px;
      color: var(--delab-text-tertiary, #8a8a90);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    // 右上角图标操作区，内容随当前评论重建
    this.ops = document.createElement('div');
    this.ops.style.cssText = 'display: flex; align-items: center; gap: 2px; flex: none;';

    this.header.append(this.title, this.ops);

    this.body = document.createElement('div');
    this.body.style.cssText = 'padding: 10px;';

    this.card.append(this.header, this.body);
    root.appendChild(this.card);

    window.addEventListener('scroll', this.schedulePosition, true);
    window.addEventListener('resize', this.schedulePosition);
    document.addEventListener('mousedown', this.handleOutside, true);
  }

  /** 点击图标后弹出的纯输入框：整个容器就是输入区 */
  openComposer(target: Element) {
    this.mount(target);
    this.header.style.display = 'none';
    this.card.style.border = 'none';
    this.body.style.padding = '0';
    this.body.replaceChildren();

    const textarea = document.createElement('textarea');
    textarea.rows = 3;
    textarea.placeholder = '写下评论，回车提交';
    textarea.style.cssText = `
      display: block;
      width: 100%;
      height: 88px;
      box-sizing: border-box;
      resize: none;
      padding: 10px 12px;
      border: none;
      border-radius: 0;
      background: transparent;
      color: var(--delab-text, #141416);
      font-family: ${SANS};
      font-size: 12px;
      line-height: 1.5;
      outline: none;
    `;

    const commit = () => {
      const value = textarea.value.trim();
      if (!value) return;
      this.actions.onSubmit(value);
    };

    textarea.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        // 输入态下 Esc 由输入框自己收起，避免被全局快捷键提前拦下
        event.preventDefault();
        event.stopPropagation();
        this.dismiss();
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        commit();
      }
    });

    this.body.appendChild(textarea);
    this.show();
    textarea.focus();
  }

  /** 点击页面上的编号气泡展开已有评论 */
  openThread(target: Element, thread: CommentThread, index: number) {
    this.mount(target);
    this.header.style.display = 'flex';
    this.card.style.border = '1px solid var(--delab-border-strong, rgba(0, 0, 0, 0.16))';
    this.body.style.padding = '10px';
    this.body.replaceChildren();

    // 头部只留序号与时间，操作用图标放在右上角
    this.title.textContent = `#${index} · ${formatTime(thread.createdAt)}`;
    this.title.title = '';
    this.ops.replaceChildren(
      this.iconButton(ICON_COPY, '复制给 AI', () => this.actions.onCopyAll()),
      this.iconButton(
        thread.resolved ? ICON_REOPEN : ICON_RESOLVE,
        thread.resolved ? '重新打开' : '标记解决',
        () => this.actions.onToggleResolve(thread)
      ),
      this.iconButton(ICON_CLOSE, '关闭', () => this.dismiss())
    );

    const text = document.createElement('div');
    text.textContent = thread.body;
    text.style.cssText = 'font-size: 12px; line-height: 1.55; white-space: pre-wrap; word-break: break-word;';
    this.body.append(text);

    // 元素区域截图：定位失效时帮助确认评论对象
    if (thread.snapshot) {
      const shot = document.createElement('img');
      shot.src = thread.snapshot;
      shot.alt = '';
      shot.title = '查看大图';
      shot.style.cssText = `
        display: block;
        width: 100%;
        max-height: 132px;
        object-fit: cover;
        margin-top: 8px;
        border-radius: 8px;
        border: 1px solid var(--delab-border, rgba(0, 0, 0, 0.08));
        background: var(--delab-field-bg, #ffffff);
        cursor: zoom-in;
      `;
      shot.addEventListener('click', event => {
        event.stopPropagation();
        this.actions.onPreviewImage(thread.snapshot!);
      });
      this.body.append(shot);
    }

    this.show();
  }

  isOpen(): boolean {
    return this.opened;
  }

  close() {
    this.opened = false;
    this.card.style.display = 'none';
    this.target = null;
  }

  destroy() {
    window.removeEventListener('scroll', this.schedulePosition, true);
    window.removeEventListener('resize', this.schedulePosition);
    document.removeEventListener('mousedown', this.handleOutside, true);
    if (this.frame) cancelAnimationFrame(this.frame);
    this.card.remove();
  }

  /** 关闭并把控制权交回调用方 */
  private dismiss() {
    this.close();
    this.actions.onDismiss();
  }

  private mount(target: Element) {
    this.target = target;
    // 靠后挂载，保证与浮窗面板同层级时压在面板之上
    this.card.parentElement?.appendChild(this.card);
  }

  private show() {
    this.opened = true;
    this.card.style.display = 'flex';
    this.card.style.visibility = 'hidden';
    // 同步定位，避免后台标签页 rAF 被节流时一直停留在隐藏状态
    this.position();
    this.card.style.visibility = 'visible';
  }

  private position() {
    if (!this.target) return;
    const rect = this.target.getBoundingClientRect();
    const height = this.card.offsetHeight || 120;

    let left = rect.left;
    let top = rect.bottom + GAP;
    if (top + height + GAP > window.innerHeight) {
      top = rect.top - height - GAP;
    }
    left = Math.max(GAP, Math.min(left, window.innerWidth - WIDTH - GAP));
    top = Math.max(GAP, Math.min(top, window.innerHeight - height - GAP));

    this.card.style.left = `${Math.round(left)}px`;
    this.card.style.top = `${Math.round(top)}px`;
  }

  private schedulePosition = () => {
    if (!this.opened || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.position();
    });
  };

  private handleOutside = (event: MouseEvent) => {
    if (!this.opened) return;
    const path = event.composedPath();
    if (path.includes(this.card)) return;
    // 大图预览开着时，点遮罩只关大图，不收起评论弹层
    if (path.some(node => (node as HTMLElement)?.id === 'delab-lightbox')) return;
    // 点在「评论」按钮上时由按钮自己处理，不算点外部
    const onButton = path.some(node => (node as HTMLElement)?.id === 'delab-comment-button');
    if (onButton) return;
    this.dismiss();
  };

  /** 头部右上角的图标操作按钮 */
  private iconButton(svg: string, label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.innerHTML = svg;
    button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: none;
      border-radius: 5px;
      background: transparent;
      color: var(--delab-text-tertiary, #8a8a90);
      cursor: pointer;
      transition: color 0.12s ease, background 0.12s ease;
    `;
    button.addEventListener('mouseenter', () => {
      button.style.background = 'var(--delab-row-hover, rgba(0, 0, 0, 0.045))';
      button.style.color = 'var(--delab-text, #141416)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'transparent';
      button.style.color = 'var(--delab-text-tertiary, #8a8a90)';
    });
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return button;
  }
}
