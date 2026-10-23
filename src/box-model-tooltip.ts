// DeLab Glass Label — 玻璃态元素悬浮标签（锚定在元素上方而非跟随光标）

export class GlassLabel {
  private el: HTMLElement | null = null;
  private parent: ShadowRoot | HTMLElement;
  private _visible = false;
  private _pinned = false; // 点击后固定

  constructor(parent: ShadowRoot | HTMLElement) {
    this.parent = parent;
    this.create();
  }

  private create() {
    const el = document.createElement('div');
    el.id = 'delab-glass-label';
    el.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483647;
      font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
      font-size: 12px;
      line-height: 1;
      padding: 6px 10px;
      border-radius: 6px;
      white-space: nowrap;
      display: none;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.15s ease, transform 0.15s ease;
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
      background: var(--delab-glass-bg, rgba(15, 16, 17, 0.85));
      color: var(--delab-glass-text, #f7f8f8);
      border: 1px solid var(--delab-glass-border, rgba(255,255,255,0.12));
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    `;
    this.parent.appendChild(el);
    this.el = el;
  }

  /** 悬浮时显示 */
  show(target: Element) {
    if (!this.el) return;
    const tagName = target.tagName.toLowerCase();
    const rect = target.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    // 取元素 class 列表中前两个作为快捷提示
    const cls = (target as HTMLElement).className;
    const clsShort = cls
      ? '.' + cls.split(/\s+/).filter(Boolean).slice(0, 2).join('.')
      : '';

    this.el.innerHTML = [
      `<span style="color:var(--delab-accent,#5e6ad2);font-weight:600;">${tagName}</span>`,
      `<span style="color:var(--delab-glass-dim, #8a8f98);margin:0 6px;">${w}\u00d7${h}</span>`,
      clsShort ? `<span style="color:var(--delab-glass-dim, #8a8f98);">${clsShort.slice(0, 30)}${clsShort.length > 30 ? '\u2026' : ''}</span>` : '',
    ].join('');

    // 锚定在元素顶部上方
    const left = rect.left;
    const top = rect.top - 34;

    this.el.style.left = `${Math.max(4, Math.min(left, window.innerWidth - 200))}px`;
    this.el.style.top = `${Math.max(4, top)}px`;

    if (!this._visible) {
      this._visible = true;
      this.el.style.display = 'block';
      requestAnimationFrame(() => {
        if (this.el) {
          this.el.style.opacity = '1';
          this.el.style.transform = 'translateY(0)';
        }
      });
    }
  }

  hide() {
    if (!this.el) return;
    if (this._pinned) return; // 选中固定时保持显示
    this._visible = false;
    this.el.style.opacity = '0';
    this.el.style.transform = 'translateY(4px)';
    setTimeout(() => {
      if (!this._visible && this.el) this.el.style.display = 'none';
    }, 150);
  }

  /** 点击后固定标签，加 \u2713 标记 */
  pin(target: Element) {
    if (!this.el) return;
    this._pinned = true;
    this.show(target);

    // 在标签末尾追加选中标记
    setTimeout(() => {
      if (!this.el) return;
      const mark = document.createElement('span');
      mark.style.cssText = 'color:var(--delab-accent,#5e6ad2);margin-left:6px;font-weight:600;';
      mark.textContent = '\u2713';
      this.el.appendChild(mark);
    }, 200);
  }

  /** 取消固定 */
  unpin() {
    this._pinned = false;
    this.hide();
  }

  destroy() {
    if (this.el) { this.el.remove(); this.el = null; }
  }
}
