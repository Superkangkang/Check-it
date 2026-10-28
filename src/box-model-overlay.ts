// DeLab Box Model Overlay — 低透明度线框层叠

import { StyleExtractor } from './style-extractor';

// 多色系线框（DevTools 惯例）：margin 琥珀 / border 品牌绿 / padding 青 / content 蓝
// 填充为中性黑渐变，content 层即黑色透明遮罩
const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const COLORS = {
  margin:  { bg: 'rgba(0, 0, 0, 0.02)', border: tint('#e8a33d', 50) },
  border:  { bg: 'rgba(0, 0, 0, 0.03)', border: tint('var(--delab-accent, #32f08c)', 55) },
  padding: { bg: 'rgba(0, 0, 0, 0.04)', border: tint('#38c7de', 55) },
  content: { bg: 'rgba(0, 0, 0, 0.24)', border: tint('#6b9bf5', 75) },
};

type BoxLayer = 'margin' | 'border' | 'padding' | 'content';

export class BoxModelOverlay {
  private layers: Record<BoxLayer, HTMLElement>;
  private lines: Record<BoxLayer, HTMLElement>;
  private extractor: StyleExtractor;
  private rafId: number | null = null;
  private parent: ShadowRoot | HTMLElement;
  /** 当前展示中的目标元素，滚动时据此重新贴合 */
  private target: Element | null = null;

  constructor(parent: ShadowRoot | HTMLElement) {
    this.parent = parent;
    this.extractor = new StyleExtractor();
    const result = this.createLayers();
    this.layers = result.bg;
    this.lines = result.line;
    window.addEventListener('scroll', this.schedule, true);
    window.addEventListener('resize', this.schedule);
  }

  private createLayers(): { bg: Record<BoxLayer, HTMLElement>; line: Record<BoxLayer, HTMLElement> } {
    const bg: Partial<Record<BoxLayer, HTMLElement>> = {};
    const line: Partial<Record<BoxLayer, HTMLElement>> = {};
    const order = ['margin', 'border', 'padding', 'content'] as BoxLayer[];

    for (const key of order) {
      const bgEl = document.createElement('div');
      bgEl.classList.add('delab-overlay');
      bgEl.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: ${2147483630 + order.indexOf(key) * 2 + 1};
        display: none;
      `;
      bgEl.dataset.bgColor = COLORS[key].bg;
      this.parent.appendChild(bgEl);
      bg[key] = bgEl;

      const lineEl = document.createElement('div');
      lineEl.classList.add('delab-overlay');
      lineEl.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: ${2147483630 + order.indexOf(key) * 2 + 2};
        display: none;
      `;
      lineEl.dataset.borderColor = COLORS[key].border;
      this.parent.appendChild(lineEl);
      line[key] = lineEl;
    }
    return { bg: bg as Record<BoxLayer, HTMLElement>, line: line as Record<BoxLayer, HTMLElement> };
  }

  show(target: Element) {
    this.target = target;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.update(target);
    });
  }

  /** 滚动 / 尺寸变化时重新贴合目标元素 */
  private schedule = () => {
    if (!this.target || this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (this.target) this.update(this.target);
    });
  };

  private update(target: Element) {
    try {
      if (!target.isConnected) { this.hide(); return; }
      const rect = target.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) { this.hide(); return; }

      const bm = this.extractor.getBoxModel(target);
      const pad = bm.padding, bd = bm.border, mg = bm.margin;

      const bw = bd.left + bd.right, bh = bd.top + bd.bottom;
      const pw = pad.left + pad.right, ph = pad.top + pad.bottom;

      // border = rect（border-box 原位）
      this.setLayer('border', rect.top, rect.left, rect.width, rect.height);

      // padding = border-box 向内缩 border
      this.setLayer('padding',
        rect.top + bd.top, rect.left + bd.left,
        rect.width - bw, rect.height - bh);

      // content = border-box 向内缩 border + padding
      this.setLayer('content',
        rect.top + bd.top + pad.top, rect.left + bd.left + pad.left,
        rect.width - bw - pw, rect.height - bh - ph);

      // margin = border-box 向外扩 margin
      this.setLayer('margin',
        rect.top - mg.top, rect.left - mg.left,
        rect.width + mg.left + mg.right, rect.height + mg.top + mg.bottom);
    } catch {
      this.hide();
    }
  }

  private setLayer(key: BoxLayer, top: number, left: number, w: number, h: number) {
    const bgEl = this.layers[key];
    bgEl.style.display = 'block';
    bgEl.style.background = bgEl.dataset.bgColor || '';
    bgEl.style.top = `${top}px`;
    bgEl.style.left = `${left}px`;
    bgEl.style.width = `${Math.max(0, w)}px`;
    bgEl.style.height = `${Math.max(0, h)}px`;

    const lineEl = this.lines[key];
    lineEl.style.display = 'block';
    lineEl.style.top = `${top}px`;
    lineEl.style.left = `${left}px`;
    lineEl.style.width = `${Math.max(0, w)}px`;
    lineEl.style.height = `${Math.max(0, h)}px`;
    lineEl.style.border = `1px dashed ${lineEl.dataset.borderColor}`;
    lineEl.style.background = 'transparent';
  }

  hide() {
    this.target = null;
    for (const key of ['margin','border','padding','content'] as BoxLayer[]) {
      this.layers[key].style.display = 'none';
      this.lines[key].style.display = 'none';
    }
  }

  destroy() {
    window.removeEventListener('scroll', this.schedule, true);
    window.removeEventListener('resize', this.schedule);
    this.target = null;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    for (const key of ['margin','border','padding','content'] as BoxLayer[]) {
      this.layers[key].remove();
      this.lines[key].remove();
    }
  }
}
