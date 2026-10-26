// DeLab Comment Popover — 页面内评论弹层（输入 / 查看）

import { CommentThread } from './comment-store';
import { ElementIdentity, summarizeElement } from './element-identity';

export interface PopoverActions {
  onSubmit: (body: string) => void;
  onToggleResolve: (thread: CommentThread) => void;
  onDelete: (thread: CommentThread) => void;
  /** 复制全部未解决评论给 AI */
  onCopyAll: () => void;
  /** 弹层被关闭（Esc / 点击外部 / 关闭按钮） */
  onDismiss: () => void;
}

const WIDTH = 300;
const GAP = 8;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export class CommentPopover {
  private card: HTMLElement;
  private header: HTMLElement;
  private title: HTMLElement;
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
      background: var(--delab-bg, #fff);
      color: var(--delab-text, #000);
      border: 1px solid var(--delab-border, #e5e5e5);
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.38);
      font-family: 'JetBrains Mono', monospace;
      z-index: 2147483646;
      overflow: hidden;
    `;

    this.header = document.createElement('div');
    this.header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 10px;
      border-bottom: 1px solid var(--delab-border, #e5e5e5);
    `;

    this.title = document.createElement('span');
    this.title.style.cssText = `
      font-size: 11px;
      color: var(--delab-accent, #5e6ad2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    const closeBtn = this.button('×', false);
    closeBtn.title = '关闭';
    closeBtn.style.cssText += 'width:20px;height:20px;padding:0;border:none;font-size:15px;line-height:1;';
    closeBtn.addEventListener('click', () => this.dismiss());

    this.header.append(this.title, closeBtn);

    this.body = document.createElement('div');
    this.body.style.cssText = 'padding: 10px;';

    this.card.append(this.header, this.body);
    root.appendChild(this.card);

    window.addEventListener('scroll', this.schedulePosition, true);
    window.addEventListener('resize', this.schedulePosition);
    document.addEventListener('mousedown', this.handleOutside, true);
  }

  /** 点击图标后弹出的纯输入框：整个容器就是输入区 */
  openComposer(target: Element, identity: ElementIdentity) {
    this.mount(target, identity);
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
      color: var(--delab-text, #000);
      font-family: 'JetBrains Mono', monospace;
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
    this.mount(target, thread.identity);
    this.header.style.display = 'flex';
    this.card.style.border = '1px solid var(--delab-border, #e5e5e5)';
    this.body.style.padding = '10px';
    this.body.replaceChildren();

    const text = document.createElement('div');
    text.textContent = thread.body;
    text.style.cssText = 'font-size: 12px; line-height: 1.55; white-space: pre-wrap; word-break: break-word;';

    const meta = document.createElement('div');
    meta.textContent = `#${index} · ${formatTime(thread.createdAt)}${thread.resolved ? ' · 已解决' : ''}`;
    meta.style.cssText = 'margin-top: 6px; font-size: 10px; color: var(--delab-text-secondary, #777169);';

    const footer = document.createElement('div');
    footer.style.cssText = 'display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px;';

    const remove = this.button('删除', false);
    const resolve = this.button(thread.resolved ? '重新打开' : '标记解决', false);
    const copy = this.button('复制给 AI', true);
    remove.addEventListener('click', () => this.actions.onDelete(thread));
    resolve.addEventListener('click', () => this.actions.onToggleResolve(thread));
    copy.addEventListener('click', () => this.actions.onCopyAll());

    footer.append(remove, resolve, copy);
    this.body.append(text, meta, footer);

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

  private mount(target: Element, identity: ElementIdentity) {
    this.target = target;
    this.title.textContent = summarizeElement(identity);
    this.title.title = identity.selector;
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
    // 点在「评论」按钮上时由按钮自己处理，不算点外部
    const onButton = path.some(node => (node as HTMLElement)?.id === 'delab-comment-button');
    if (onButton) return;
    this.dismiss();
  };

  private button(label: string, primary: boolean): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.style.cssText = `
      padding: 4px 10px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      cursor: pointer;
      border: 1px solid ${primary ? 'transparent' : 'var(--delab-border, #e5e5e5)'};
      background: ${primary ? 'var(--delab-accent, #5e6ad2)' : 'none'};
      color: ${primary ? '#fff' : 'var(--delab-text, #000)'};
    `;
    return button;
  }
}
