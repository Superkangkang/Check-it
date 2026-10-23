// DeLab Box Model Overlay — 低透明度线框层叠

import { StyleExtractor } from './style-extractor';

// 粉蓝配色：填充极淡，线框清晰
const COLORS = {
  margin:  { bg: 'rgba(244, 155, 175, 0.05)',  border: 'rgba(244, 155, 175, 0.60)' },
  border:  { bg: 'rgba(255, 200, 215, 0.06)',  border: 'rgba(255, 200, 215, 0.55)' },
  padding: { bg: 'rgba(155, 185, 230, 0.06)',  border: 'rgba(155, 185, 230, 0.55)' },
  content: { bg: 'rgba(130, 165, 220, 0.07)',  border: 'rgba(130, 165, 220, 0.65)' },
};

type BoxLayer = 'margin' | 'border' | 'padding' | 'content';

export class BoxModelOverlay {
  private layers: Record<BoxLayer, HTMLElement>;
  private lines: Record<BoxLayer, HTMLElement>;
  private extractor: StyleExtractor;
  private rafId: number | null = null;
  private parent: ShadowRoot | HTMLElement;

  constructor(parent: ShadowRoot | HTMLElement) {
    this.parent = parent;
    this.extractor = new StyleExtractor();
    const result = this.createLayers();
    this.layers = result.bg;
    this.lines = result.line;
  }

  private createLayers(): { bg: Record<BoxLayer, HTMLElement>; line: Record<BoxLayer, HTMLElement> } {
    const bg: Partial<Record<BoxLayer, HTMLElement>> = {};
    const line: Partial<Record<BoxLayer, HTMLElement>> = {};
    const order = ['margin', 'border', 'padding', 'content'] as BoxLayer[];

    for (const key of order) {
      const bgEl = document.createElement('div');
      bgEl.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: ${2147483640 + order.indexOf(key) * 2 + 1};
        display: none;
      `;
      bgEl.dataset.bgColor = COLORS[key].bg;
      this.parent.appendChild(bgEl);
      bg[key] = bgEl;

      const lineEl = document.createElement('div');
      lineEl.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: ${2147483640 + order.indexOf(key) * 2 + 2};
        display: none;
      `;
      lineEl.dataset.borderColor = COLORS[key].border;
      this.parent.appendChild(lineEl);
      line[key] = lineEl;
    }
    return { bg: bg as Record<BoxLayer, HTMLElement>, line: line as Record<BoxLayer, HTMLElement> };
  }

  show(target: Element) {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.update(target);
    });
  }

  private update(target: Element) {
    try {
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
    for (const key of ['margin','border','padding','content'] as BoxLayer[]) {
      this.layers[key].style.display = 'none';
      this.lines[key].style.display = 'none';
    }
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    for (const key of ['margin','border','padding','content'] as BoxLayer[]) {
      this.layers[key].remove();
      this.lines[key].remove();
    }
  }
}
