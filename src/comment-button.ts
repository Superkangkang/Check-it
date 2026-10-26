// DeLab Comment Button — 选中元素下方出现的「评论」按钮

const GAP = 8;
const SIZE = 28;

export class CommentButton {
  private node: HTMLButtonElement;
  private target: Element | null = null;
  private offsetX = 0;
  private frame = 0;
  private onClick: () => void;

  constructor(root: ShadowRoot, onClick: () => void) {
    this.onClick = onClick;

    this.node = document.createElement('button');
    this.node.id = 'delab-comment-button';
    this.node.type = 'button';
    this.node.title = '添加评论';
    this.node.setAttribute('aria-label', '添加评论');
    this.node.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>
      </svg>
    `;
    this.node.style.cssText = `
      position: fixed;
      display: none;
      align-items: center;
      justify-content: center;
      width: ${SIZE}px;
      height: ${SIZE}px;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 50%;
      background: rgba(14, 15, 18, 0.98);
      color: #fff;
      line-height: 1;
      pointer-events: auto;
      z-index: 2147483644;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
    `;
    this.node.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      this.onClick();
    });
    root.appendChild(this.node);

    window.addEventListener('scroll', this.schedule, true);
    window.addEventListener('resize', this.schedule);
  }

  show(target: Element, offsetX = 0) {
    this.target = target;
    this.offsetX = offsetX;
    this.node.style.display = 'inline-flex';
    this.position();
  }

  hide() {
    this.target = null;
    this.node.style.display = 'none';
  }

  destroy() {
    window.removeEventListener('scroll', this.schedule, true);
    window.removeEventListener('resize', this.schedule);
    if (this.frame) cancelAnimationFrame(this.frame);
    this.node.remove();
  }

  private schedule = () => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.position();
    });
  };

  private position() {
    const target = this.target;
    if (!target || !target.isConnected) return;

    const rect = target.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      this.node.style.display = 'none';
      return;
    }
    this.node.style.display = 'inline-flex';

    const width = this.node.offsetWidth || SIZE;
    let top = rect.bottom + GAP;
    if (top + SIZE + GAP > window.innerHeight) {
      top = rect.top - SIZE - GAP;
    }
    const left = Math.max(GAP, Math.min(rect.left + this.offsetX, window.innerWidth - width - GAP));

    this.node.style.left = `${Math.round(left)}px`;
    this.node.style.top = `${Math.round(Math.max(GAP, top))}px`;
  }
}
