// DeLab Pointer Cursor — 跟随鼠标的 Figma 风格指针（DOM 绘制，Retina 下依然锐利）

/** Figma 多人协作指针路径（与 komo 页面中的 multiplayer 图标一致） */
const CURSOR_PATH = 'M41.012 21.55C42.244 21.07 42.862 20.83 43.036 20.49C43.1095 20.3456 43.1468 20.1856 43.1447 20.0236C43.1426 19.8616 43.1012 19.7025 43.024 19.56C42.842 19.224 42.218 19 40.972 18.554L9.192 7.14604C8.172 6.78004 7.664 6.59604 7.332 6.71204C7.18856 6.76129 7.0582 6.84252 6.95078 6.94959C6.84337 7.05666 6.76171 7.18675 6.712 7.33004C6.598 7.66404 6.78 8.17204 7.146 9.19204L18.554 40.972C19.002 42.218 19.224 42.84 19.56 43.022C19.7027 43.0996 19.8621 43.1412 20.0245 43.1433C20.1869 43.1454 20.3474 43.1079 20.492 43.034C20.832 42.862 21.072 42.244 21.552 41.01L26.744 27.656C26.838 27.414 26.884 27.294 26.958 27.192C27.0225 27.1016 27.1016 27.0225 27.192 26.958C27.292 26.886 27.414 26.838 27.656 26.744L41.012 21.55Z';

/** 路径尖端在 48 网格里的坐标，用来把尖角对齐到鼠标位置 */
const TIP_X = 6.7;
const TIP_Y = 7.3;
const SIZE = 20;
/** 声明尺寸与 viewBox 的比例，用于把尖端换算成实际像素 */
const SCALE = SIZE / 48;

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
      <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 48 48">
        <path d="${CURSOR_PATH}" stroke="#FFFFFF" stroke-width="4.4"
          stroke-linejoin="round" stroke-linecap="round" paint-order="stroke"
          style="fill: var(--delab-accent, #32f08c);"/>
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
