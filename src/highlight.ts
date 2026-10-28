// DeLab Viewfinder — 悬停 / 选中的 2px 实线线框

export class Viewfinder {
  private wireframe: HTMLElement | null = null;
  private parent: ShadowRoot | HTMLElement;
  private target: Element | null = null;
  private frame = 0;

  constructor(
    parent: ShadowRoot | HTMLElement,
    color = 'var(--delab-accent, #32f08c)',
    id = 'delab-hover-frame',
    private opacity = 0.6
  ) {
    this.parent = parent;
    this.create(color, id);
    window.addEventListener('scroll', this.schedule, true);
    window.addEventListener('resize', this.schedule);
  }

  private create(color: string, id: string) {
    this.wireframe = document.createElement('div');
    this.wireframe.id = id;
    this.wireframe.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483640;
      border: 2px solid ${color};
      border-radius: 2px;
      display: none;
      opacity: 0;
      transition: opacity 0.15s ease;
    `;
    this.parent.appendChild(this.wireframe);
  }

  show(target: Element) {
    this.target = target;
    this.place();
  }

  hide() {
    this.target = null;
    if (!this.wireframe) return;
    this.wireframe.style.opacity = '0';
    setTimeout(() => {
      if (this.wireframe) this.wireframe.style.display = 'none';
    }, 150);
  }

  destroy() {
    window.removeEventListener('scroll', this.schedule, true);
    window.removeEventListener('resize', this.schedule);
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.wireframe) { this.wireframe.remove(); this.wireframe = null; }
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
    if (!this.wireframe || !target) return;
    if (!target.isConnected) { this.hide(); return; }

    try {
      const r = target.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) { this.hide(); return; }

      this.wireframe.style.top = `${r.top}px`;
      this.wireframe.style.left = `${r.left}px`;
      this.wireframe.style.width = `${r.width}px`;
      this.wireframe.style.height = `${r.height}px`;
      this.wireframe.style.display = 'block';
      this.wireframe.style.opacity = String(this.opacity);
    } catch {
      this.hide();
    }
  }
}
