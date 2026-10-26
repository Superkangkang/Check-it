// DeLab Pointer Cursor — 跟随鼠标的 Figma 风格指针（DOM 绘制，Retina 下依然锐利）

/** Figma 多人协作指针路径（与 komo 页面中的 multiplayer 图标一致） */
const CURSOR_PATH = 'M20.506 10.775c.616-.24.925-.36 1.012-.53a.5.5 0 0 0-.006-.465c-.091-.168-.403-.28-1.026-.503L4.596 3.573c-.51-.183-.764-.275-.93-.217a.5.5 0 0 0-.31.309c-.057.167.034.421.217.931l5.704 15.89c.224.623.335.934.503 1.025a.5.5 0 0 0 .466.006c.17-.086.29-.395.53-1.012l2.596-6.677c.047-.121.07-.181.107-.232a.501.501 0 0 1 .117-.117c.05-.036.111-.06.232-.107l6.678-2.597Z';

/** 路径尖端在 24 网格里的坐标，用来把尖角对齐到鼠标位置 */
const TIP_X = 3.4;
const TIP_Y = 3.4;
const SIZE = 20;
/** 声明尺寸与 viewBox 的比例，用于把尖端换算成实际像素 */
const SCALE = SIZE / 24;

export class PointerCursor {
  private node: HTMLElement;
  private frame = 0;
  private x = 0;
  private y = 0;
  private active = false;
  private placed = false;

  constructor(root: ShadowRoot) {
    this.node = document.createElement('div');
    this.node.id = 'delab-pointer';
    this.node.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${SIZE}px;
      height: ${SIZE}px;
      pointer-events: none;
      z-index: 2147483647;
      display: none;
      will-change: transform;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
    `;
    this.node.innerHTML = `
      <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 24 24">
        <path d="${CURSOR_PATH}" fill="#0D99FF" stroke="#FFFFFF" stroke-width="2.2"
          stroke-linejoin="round" stroke-linecap="round" paint-order="stroke"/>
      </svg>
    `;
    root.appendChild(this.node);

    document.addEventListener('mousemove', this.handleMove, true);
    document.addEventListener('mouseleave', this.handleWindowLeave);
    document.addEventListener('mouseenter', this.handleWindowEnter);
  }

  /** 插件激活时启用自定义指针 */
  enable() {
    this.active = true;
    if (this.placed) {
      this.place();
      this.node.style.display = 'block';
    }
  }

  disable() {
    this.active = false;
    this.node.style.display = 'none';
  }

  destroy() {
    document.removeEventListener('mousemove', this.handleMove, true);
    document.removeEventListener('mouseleave', this.handleWindowLeave);
    document.removeEventListener('mouseenter', this.handleWindowEnter);
    if (this.frame) cancelAnimationFrame(this.frame);
    this.node.remove();
  }

  private handleMove = (event: MouseEvent) => {
    this.x = event.clientX;
    this.y = event.clientY;
    this.placed = true;

    if (this.active) this.node.style.display = 'block';

    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.place();
    });
  };

  private place() {
    const tipX = TIP_X * SCALE;
    const tipY = TIP_Y * SCALE;
    this.node.style.transform = `translate3d(${this.x - tipX}px, ${this.y - tipY}px, 0)`;
  }

  private handleWindowLeave = () => {
    this.node.style.display = 'none';
  };

  private handleWindowEnter = () => {
    if (this.active && this.placed) this.node.style.display = 'block';
  };
}
