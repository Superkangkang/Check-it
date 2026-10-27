// DeLab Lightbox — 评论截图大图预览

const STYLE = `
  #delab-lightbox {
    position: fixed;
    inset: 0;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 32px;
    background: rgba(8, 9, 10, 0.72);
    backdrop-filter: blur(4px);
    z-index: 2147483647;
    pointer-events: auto;
  }
  #delab-lightbox img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: #111213;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
  }
  #delab-lightbox button {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font: inherit;
    cursor: pointer;
  }
  #delab-lightbox button:hover {
    background: rgba(255, 255, 255, 0.18);
  }
`;

export class Lightbox {
  private el: HTMLElement;
  private img: HTMLImageElement;
  private opened = false;

  constructor(root: ShadowRoot) {
    const style = document.createElement('style');
    style.textContent = STYLE;
    root.appendChild(style);

    this.el = document.createElement('div');
    this.el.id = 'delab-lightbox';
    this.el.innerHTML = `
      <button type="button" title="关闭">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    `;
    this.img = document.createElement('img');
    this.img.alt = '';
    this.el.insertBefore(this.img, this.el.firstChild);
    root.appendChild(this.el);

    // 点击遮罩关闭；点图片本身不关闭
    this.el.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      if (target === this.el || target.closest('button')) {
        event.preventDefault();
        event.stopPropagation();
        this.hide();
      }
    });
    this.img.addEventListener('click', event => event.stopPropagation());
  }

  show(dataUrl: string) {
    this.img.src = dataUrl;
    this.opened = true;
    this.el.style.display = 'flex';
  }

  hide() {
    this.opened = false;
    this.el.style.display = 'none';
    this.img.removeAttribute('src');
  }

  isOpen(): boolean {
    return this.opened;
  }

  destroy() {
    this.el.remove();
  }
}
