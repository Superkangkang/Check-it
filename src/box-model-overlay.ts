// DeLab Box Model Overlay — 分层色带填充（DevTools 惯例）
// margin 琥珀 / padding 青 / content 蓝紫（border 不展示）
// 每层只填充自己那一圈（border-width 即色带厚度），各层互不叠加，避免颜色混浊

import { StyleExtractor } from './style-extractor';

// 先把色相压向黑色再做低透明度叠加，深色页面上不发灰
const tint = (color: string, pct: number) =>
  `color-mix(in srgb, color-mix(in srgb, ${color} 42%, #000) ${pct}%, transparent)`;
const COLORS = {
  margin: { fill: tint('#e879f9', 26) },
  padding: { fill: tint('#38c7de', 24) },
  content: { fill: tint('#6b9bf5', 18) },
};

type BoxLayer = 'margin' | 'padding' | 'content';
type Box = { top: number; left: number; width: number; height: number };
type Ring = { top: number; right: number; bottom: number; left: number };

const clamp = (v: number, max: number) => Math.max(0, Math.min(v, max));

/** 外框向内收 ring */
const inset = (box: Box, ring: Ring): Box => ({
  top: box.top + ring.top,
  left: box.left + ring.left,
  width: box.width - ring.left - ring.right,
  height: box.height - ring.top - ring.bottom,
});

/** 外框向外扩 ring */
const outset = (box: Box, ring: Ring): Box => inset(box, {
  top: -ring.top, right: -ring.right, bottom: -ring.bottom, left: -ring.left,
});

export class BoxModelOverlay {
  private layers: Record<BoxLayer, HTMLElement>;
  private extractor: StyleExtractor;
  private rafId: number | null = null;
  private parent: ShadowRoot | HTMLElement;
  /** 当前展示中的目标元素，滚动时据此重新贴合 */
  private target: Element | null = null;

  constructor(parent: ShadowRoot | HTMLElement) {
    this.parent = parent;
    this.extractor = new StyleExtractor();
    this.layers = this.createLayers();
    window.addEventListener('scroll', this.schedule, true);
    window.addEventListener('resize', this.schedule);
  }

  private createLayers(): Record<BoxLayer, HTMLElement> {
    const layers = {} as Record<BoxLayer, HTMLElement>;
    const order = ['margin', 'padding', 'content'] as BoxLayer[];

    for (const key of order) {
      const el = document.createElement('div');
      el.classList.add('delab-overlay');
      el.style.cssText = `
        position: fixed;
        pointer-events: none;
        box-sizing: border-box;
        border-style: solid;
        border-width: 0;
        background: transparent;
        z-index: ${2147483630 + order.indexOf(key)};
        display: none;
      `;
      this.parent.appendChild(el);
      layers[key] = el;
    }
    return layers;
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
      const borderBox: Box = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
      const paddingBox = inset(borderBox, bm.border);
      const contentBox = inset(paddingBox, bm.padding);
      const marginBox = outset(borderBox, bm.margin);

      // 每层色带厚度 = 该区域向外一圈的宽度；content 直接整块填充
      // padding 区从 border 内沿开始，border 本身不画
      this.paint('margin', marginBox, bm.margin);
      this.paint('padding', paddingBox, bm.padding);
      this.paint('content', contentBox, { top: 0, right: 0, bottom: 0, left: 0 });
    } catch {
      this.hide();
    }
  }

  private paint(key: BoxLayer, box: Box, ring: Ring) {
    const el = this.layers[key];
    const w = Math.max(0, box.width);
    const h = Math.max(0, box.height);
    const band = [
      clamp(ring.top, h / 2),
      clamp(ring.right, w / 2),
      clamp(ring.bottom, h / 2),
      clamp(ring.left, w / 2),
    ];
    // content 整块填充；margin / padding 只画外圈，厚度为 0 时直接隐藏
    if (key !== 'content' && band.every(v => v <= 0)) {
      el.style.display = 'none';
      return;
    }

    el.style.display = 'block';
    el.style.top = `${box.top}px`;
    el.style.left = `${box.left}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.borderWidth = band.map(v => `${v}px`).join(' ');
    el.style.borderColor = COLORS[key].fill;
    el.style.background = key === 'content' ? COLORS[key].fill : 'transparent';
  }

  hide() {
    this.target = null;
    for (const key of ['margin', 'padding', 'content'] as BoxLayer[]) {
      this.layers[key].style.display = 'none';
    }
  }

  destroy() {
    window.removeEventListener('scroll', this.schedule, true);
    window.removeEventListener('resize', this.schedule);
    this.target = null;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    for (const key of ['margin', 'padding', 'content'] as BoxLayer[]) {
      this.layers[key].remove();
    }
  }
}
