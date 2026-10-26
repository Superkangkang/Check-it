// DeLab Glass Label — 选中元素下方展示标签名

const GAP = 8;
const HEIGHT = 22;

export class GlassLabel {
  private el: HTMLElement | null = null;
  private parent: ShadowRoot | HTMLElement;
  private target: Element | null = null;
  private _visible = false;
  private _pinned = false; // 点击后固定
  private frame = 0;

  constructor(parent: ShadowRoot | HTMLElement) {
    this.parent = parent;
    this.create();
    window.addEventListener('scroll', this.schedule, true);
    window.addEventListener('resize', this.schedule);
  }

  private create() {
    const el = document.createElement('div');
    el.id = 'delab-glass-label';
    el.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483641;
      font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
      font-size: 11px;
      font-weight: 400;
      line-height: 1;
      height: ${HEIGHT}px;
      display: none;
      align-items: center;
      padding: 0 8px;
      border-radius: 6px;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.15s ease;
      background: var(--delab-accent, #5e6ad2);
      color: #fff;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    `;
    this.parent.appendChild(el);
    this.el = el;
  }

  /** 选中后显示标签名（只展示标签本身） */
  show(target: Element) {
    if (!this.el) return;
    this.target = target;
    this.el.textContent = target.tagName.toLowerCase();
    this.place();

    if (!this._visible) {
      this._visible = true;
      this.el.style.display = 'flex';
      requestAnimationFrame(() => {
        if (this.el) this.el.style.opacity = '1';
      });
    }
  }

  /** 标签当前宽度，供评论按钮紧随其后 */
  width(): number {
    return this.el?.offsetWidth ?? 0;
  }

  hide() {
    this.target = null;
    if (!this.el) return;
    if (this._pinned) return; // 选中固定时保持显示
    this._visible = false;
    this.el.style.opacity = '0';
    setTimeout(() => {
      if (!this._visible && this.el) this.el.style.display = 'none';
    }, 150);
  }

  /** 点击后固定标签 */
  pin(target: Element) {
    if (!this.el) return;
    this._pinned = true;
    this.show(target);
  }

  /** 取消固定 */
  unpin() {
    this._pinned = false;
    this.hide();
  }

  destroy() {
    window.removeEventListener('scroll', this.schedule, true);
    window.removeEventListener('resize', this.schedule);
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.el) { this.el.remove(); this.el = null; }
  }

  /** 滚动 / 尺寸变化时重新贴合目标元素 */
  private schedule = () => {
    if (!this.target || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.place();
    });
  };

  private place() {
    const target = this.target;
    const el = this.el;
    if (!el || !target || !target.isConnected) return;

    const rect = target.getBoundingClientRect();
    const width = el.offsetWidth || 40;
    const left = Math.max(4, Math.min(rect.left, window.innerWidth - width - 4));
    const top = Math.max(4, Math.min(rect.bottom + GAP, window.innerHeight - HEIGHT - 4));

    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }
}
