// DeLab Comment Popover — 页面内评论弹层（输入 / 查看）

import { CommentThread } from './comment-store';
import { SANS, MONO } from './theme';

export interface PopoverActions {
  onSubmit: (body: string) => void;
  onToggleResolve: (thread: CommentThread) => void;
  /** 同步这条评论到企微智能表格 */
  onSync: (thread: CommentThread) => void;
  /** 清除评论 = 归档：只隐藏，不删除 */
  onArchive: (thread: CommentThread) => void;
  /** 未配置时打开插件内的企微同步设置 */
  onOpenSettings: () => void;
  /** 复制全部未解决评论给 AI */
  onCopyAll: () => void;
  /** 查看评论截图大图 */
  onPreviewImage: (dataUrl: string) => void;
  /** 弹层被关闭（Esc / 点击外部 / 关闭按钮） */
  onDismiss: () => void;
}

const WIDTH = 300;
const GAP = 8;

/** 头部图标按钮用的 48 格描边图形 */
const icon = (paths: string) =>
  `<svg width="13" height="13" viewBox="0 0 48 48" fill="none" stroke="currentColor"
    stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICON_COPY = icon('<path d="M21.9381 17.9258H37.9876C40.2036 17.9258 42 19.7222 42 21.9382V37.9877C42 40.2037 40.2036 42.0001 37.9876 42.0001H21.9381C19.7221 42.0001 17.9257 40.2037 17.9257 37.9877V21.9382C17.9257 19.7222 19.7221 17.9258 21.9381 17.9258Z"/><path d="M12.0186 32.0805H10.0124C8.94823 32.0805 7.92767 31.6578 7.1752 30.9053C6.42273 30.1528 6 29.1323 6 28.0681V10.0124C6 8.94823 6.42273 7.92767 7.1752 7.1752C7.92767 6.42273 8.94823 6 10.0124 6H28.0681C29.1323 6 30.1528 6.42273 30.9053 7.1752C31.6578 7.92767 32.0805 8.94823 32.0805 10.0124V12.0186"/>');
const ICON_RESOLVE = icon('<path d="M42 24C42 33.9411 33.9411 42 24 42C14.0589 42 6 33.9411 6 24C6 14.0589 14.0589 6 24 6C33.9411 6 42 14.0589 42 24Z"/><path d="M17 24L22 29L31 20"/>');
const ICON_CLOSE = icon('<path d="M38 10L10 38"/><path d="M10 10L38 38"/>');
const ICON_ARCHIVE = icon('<path d="M8 12H40"/><path d="M18 12V7H30V12"/><path d="M12 12L14 42H34L36 12"/><path d="M20 20V34"/><path d="M28 20V34"/>');

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
  openThread(target: Element, thread: CommentThread, index: number, syncing = false) {
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
      // 已解决评论在气泡与列表中均不可达（等同删除），这里只会是「标记解决」
      this.iconButton(ICON_RESOLVE, '标记解决', () => this.actions.onToggleResolve(thread)),
      this.iconButton(ICON_ARCHIVE, '清除评论（归档，不删除）', () => this.actions.onArchive(thread)),
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

    this.body.append(this.buildSyncSection(thread, syncing));

    this.show();
  }

  /** 弹层底部的企微同步区：未同步 / 同步中 / 已同步 / 失败重试 */
  private buildSyncSection(thread: CommentThread, syncing: boolean): HTMLElement {
    const box = document.createElement('div');
    box.style.cssText = `
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid var(--delab-border, rgba(0, 0, 0, 0.08));
    `;

    const synced = Boolean(thread.reportedAt);
    const failed = !synced && thread.reportState === 'failed';
    const pending = syncing && !synced;

    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = pending || synced;

    const base = `
      display: block;
      width: 100%;
      height: 28px;
      padding: 0 10px;
      border-radius: 7px;
      font-family: ${SANS};
      font-size: 11px;
      font-weight: 600;
      line-height: 26px;
      cursor: pointer;
      transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
    `;

    if (synced) {
      button.textContent = '已同步到企微';
      button.style.cssText = `${base}
        border: 1px solid var(--delab-accent-soft, rgba(14, 182, 104, 0.24));
        background: var(--delab-accent-soft, rgba(14, 182, 104, 0.14));
        color: var(--delab-accent, #0eb668);
        cursor: default;
      `;
    } else if (pending) {
      button.textContent = '同步中…';
      button.style.cssText = `${base}
        border: 1px solid var(--delab-border, rgba(0, 0, 0, 0.08));
        background: var(--delab-field-bg, #ffffff);
        color: var(--delab-text-tertiary, #8a8a90);
        cursor: default;
        opacity: 0.7;
      `;
    } else if (failed) {
      button.textContent = '重试同步';
      button.style.cssText = `${base}
        border: 1px solid rgba(229, 72, 77, 0.36);
        background: transparent;
        color: var(--delab-danger, #e5484d);
      `;
    } else {
      button.textContent = '同步到企微';
      button.style.cssText = `${base}
        border: 1px solid var(--delab-accent, #0eb668);
        background: var(--delab-accent-soft, rgba(14, 182, 104, 0.14));
        color: var(--delab-accent, #0eb668);
      `;
    }

    if (!pending && !synced) {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        this.actions.onSync(thread);
      });
    }

    box.append(button);

    const note = document.createElement('div');
    note.style.cssText = `
      margin-top: 5px;
      font-family: ${MONO};
      font-size: 9px;
      line-height: 1.5;
      color: var(--delab-text-tertiary, #8a8a90);
      word-break: break-all;
    `;
    const extras: HTMLElement[] = [];

    if (synced) {
      const when = thread.reportedAt ? formatTime(thread.reportedAt) : '';
      note.textContent = thread.remoteRecordId
        ? `已同步 ${when} · ${thread.remoteRecordId}`
        : `已同步 ${when}`;
      note.title = note.textContent;
    } else if (failed && thread.lastReportError) {
      note.textContent = thread.lastReportError.message;
      note.style.color = 'var(--delab-danger, #e5484d)';
      if (thread.reportAttempts) {
        note.textContent += `（已尝试 ${thread.reportAttempts} 次）`;
      }
      if (thread.lastReportError.code === 'timeout' || thread.lastReportError.code === 'network') {
        const warn = document.createElement('div');
        warn.textContent = '上次可能已写入，重试前请先在表格确认';
        warn.style.cssText = 'margin-top:3px;color:var(--delab-text-tertiary,#8a8a90);';
        extras.push(warn);
      }
      if ((thread.reportAttempts ?? 0) >= 3) {
        const warn = document.createElement('div');
        warn.textContent = '已连续失败 3 次，建议先检查配置或网络';
        warn.style.cssText = 'margin-top:3px;color:var(--delab-text-tertiary,#8a8a90);';
        extras.push(warn);
      }
      if (/^config_/.test(thread.lastReportError.code)) {
        const link = document.createElement('button');
        link.type = 'button';
        link.textContent = '打开插件设置';
        link.style.cssText = `
          appearance: none;
          margin-top: 5px;
          padding: 0;
          border: none;
          background: transparent;
          color: var(--delab-accent, #0eb668);
          font-family: ${SANS};
          font-size: 10px;
          cursor: pointer;
          text-decoration: underline;
        `;
        link.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          this.actions.onOpenSettings();
        });
        extras.push(link);
      }
    } else {
      note.textContent = '单向上报，不读取表格';
    }

    box.append(note, ...extras);
    return box;
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
