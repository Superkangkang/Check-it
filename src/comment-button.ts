// DeLab Comment Button — 选中元素下方出现的「评论」按钮

import { SANS } from './theme';

const GAP = 8;
/** 与元素下方标签（GlassLabel）齐高 */
const HEIGHT = 22;

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
      <svg width="12" height="12" viewBox="0 0 48 48" fill="none" stroke="currentColor"
        stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M42 30C42 31.0609 41.5786 32.0783 40.8284 32.8284C40.0783 33.5786 39.0609 34 38 34H14L6 42V10C6 8.93913 6.42143 7.92172 7.17157 7.17157C7.92172 6.42143 8.93913 6 10 6H38C39.0609 6 40.0783 6.42143 40.8284 7.17157C41.5786 7.92172 42 8.93913 42 10V30Z"/>
      </svg>
      <span>评论</span>
    `;
    this.node.style.cssText = `
      position: fixed;
      display: none;
      align-items: center;
      justify-content: center;
      gap: 4px;
      height: ${HEIGHT}px;
      padding: 0 8px;
      border: 1px solid var(--delab-glass-border, rgba(255, 255, 255, 0.12));
      border-radius: 6px;
      background: var(--delab-glass-bg, rgba(23, 23, 24, 0.94));
      color: var(--delab-glass-text, #ececee);
      font-family: ${SANS};
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.02em;
      line-height: 1;
      white-space: nowrap;
      pointer-events: auto;
      z-index: 2147483644;
      box-shadow: var(--delab-shadow, 0 8px 24px rgba(0, 0, 0, 0.35));
      backdrop-filter: blur(12px);
      transition: color 0.12s ease, background 0.12s ease;
    `;
    this.node.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      this.onClick();
    });
    // 悬停时点亮品牌绿
    this.node.addEventListener('mouseenter', () => {
      this.node.style.background = 'var(--delab-accent, #32f08c)';
      this.node.style.color = 'var(--delab-accent-contrast, #0b0b0c)';
      this.node.style.borderColor = 'transparent';
    });
    this.node.addEventListener('mouseleave', () => {
      this.node.style.background = 'var(--delab-glass-bg, rgba(23, 23, 24, 0.94))';
      this.node.style.color = 'var(--delab-glass-text, #ececee)';
      this.node.style.borderColor = 'var(--delab-glass-border, rgba(255, 255, 255, 0.12))';
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

    // 不做视口边界吸附：跟随元素一起滚出视口
    const left = rect.left + this.offsetX;
    const top = rect.bottom + GAP;

    this.node.style.left = `${Math.round(left)}px`;
    this.node.style.top = `${Math.round(top)}px`;
  }
}
