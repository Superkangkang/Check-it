// DeLab Viewfinder — 仅保留 1px 虚线线框

export class Viewfinder {
  private wireframe: HTMLElement | null = null;
  private parent: ShadowRoot | HTMLElement;

  constructor(parent: ShadowRoot | HTMLElement) {
    this.parent = parent;
    this.create();
  }

  private create() {
    this.wireframe = document.createElement('div');
    this.wireframe.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483643;
      border: 1px dashed var(--delab-accent, #5e6ad2);
      border-radius: 2px;
      display: none;
      opacity: 0;
      transition: opacity 0.15s ease;
    `;
    this.parent.appendChild(this.wireframe);
  }

  show(target: Element) {
    if (!this.wireframe) return;
    try {
      const r = target.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) { this.hide(); return; }

      this.wireframe.style.top = `${r.top}px`;
      this.wireframe.style.left = `${r.left}px`;
      this.wireframe.style.width = `${r.width}px`;
      this.wireframe.style.height = `${r.height}px`;
      this.wireframe.style.display = 'block';
      this.wireframe.style.opacity = '0.7';
    } catch {
      this.hide();
    }
  }

  hide() {
    if (!this.wireframe) return;
    this.wireframe.style.opacity = '0';
    setTimeout(() => {
      if (this.wireframe) this.wireframe.style.display = 'none';
    }, 150);
  }

  destroy() {
    if (this.wireframe) { this.wireframe.remove(); this.wireframe = null; }
  }
}
