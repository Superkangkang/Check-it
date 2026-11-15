// DeLab Measure Overlay — 选中元素后按住 Alt 悬浮其他元素，量取两者间距（对标 Figma）
// 左右 / 上下分离时标最近两侧的间距；完全包含时标内层到外层四条边的距离

const COLOR = '#f24822';
/** 小于该值视为贴边，不画 0 距离 */
const MIN_GAP = 0.5;
/** 最多同时展示的测量线：完全包含时四向各一条 */
const MAX_ITEMS = 4;

type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };
type Axis = 'h' | 'v';

/** 一条测量线：axis 决定方向，from/to 为起止坐标，cross 为垂直方向上的位置 */
type Measurement = {
  axis: Axis;
  from: number;
  to: number;
  cross: number;
  value: number;
};

type Item = {
  root: HTMLElement;
  capA: HTMLElement;
  capB: HTMLElement;
  label: HTMLElement;
};

const rectOf = (el: Element): Rect | null => {
  try {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  } catch {
    return null;
  }
};

/** 内层是否完全落在外层内（留 0.5px 容差，避免亚像素抖动误判） */
const contains = (outer: Rect, inner: Rect): boolean =>
  inner.left >= outer.left - MIN_GAP &&
  inner.right <= outer.right + MIN_GAP &&
  inner.top >= outer.top - MIN_GAP &&
  inner.bottom <= outer.bottom + MIN_GAP;

const formatValue = (value: number): string => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const computeMeasurements = (a: Rect, b: Rect): Measurement[] => {
  const list: Measurement[] = [];

  // 完全包含：量内层到外层四条边的距离
  const bInA = contains(a, b);
  const aInB = contains(b, a);
  if (bInA || aInB) {
    const outer = bInA ? a : b;
    const inner = bInA ? b : a;
    const cy = inner.top + inner.height / 2;
    const cx = inner.left + inner.width / 2;
    const left = inner.left - outer.left;
    const right = outer.right - inner.right;
    const top = inner.top - outer.top;
    const bottom = outer.bottom - inner.bottom;

    if (left > MIN_GAP) list.push({ axis: 'h', from: outer.left, to: inner.left, cross: cy, value: left });
    if (right > MIN_GAP) list.push({ axis: 'h', from: inner.right, to: outer.right, cross: cy, value: right });
    if (top > MIN_GAP) list.push({ axis: 'v', from: outer.top, to: inner.top, cross: cx, value: top });
    if (bottom > MIN_GAP) list.push({ axis: 'v', from: inner.bottom, to: outer.bottom, cross: cx, value: bottom });
    return list;
  }

  const overlapTop = Math.max(a.top, b.top);
  const overlapBottom = Math.min(a.bottom, b.bottom);
  const overlapLeft = Math.max(a.left, b.left);
  const overlapRight = Math.min(a.right, b.right);

  // 水平间距：只量左右分离时最近的两条竖边；线画在两者垂直重叠区中部
  const hCross = overlapBottom - overlapTop > MIN_GAP
    ? (overlapTop + overlapBottom) / 2
    : b.top + b.height / 2;
  if (b.left - a.right > MIN_GAP) {
    list.push({ axis: 'h', from: a.right, to: b.left, cross: hCross, value: b.left - a.right });
  } else if (a.left - b.right > MIN_GAP) {
    list.push({ axis: 'h', from: b.right, to: a.left, cross: hCross, value: a.left - b.right });
  }

  // 垂直间距：只量上下分离时最近的两条横边
  const vCross = overlapRight - overlapLeft > MIN_GAP
    ? (overlapLeft + overlapRight) / 2
    : b.left + b.width / 2;
  if (b.top - a.bottom > MIN_GAP) {
    list.push({ axis: 'v', from: a.bottom, to: b.top, cross: vCross, value: b.top - a.bottom });
  } else if (a.top - b.bottom > MIN_GAP) {
    list.push({ axis: 'v', from: b.bottom, to: a.top, cross: vCross, value: a.top - b.bottom });
  }

  return list;
};

export class MeasureOverlay {
  private parent: ShadowRoot | HTMLElement;
  /** 被测量元素（悬浮目标）的虚线框 */
  private frame: HTMLElement;
  private items: Item[] = [];
  private from: Element | null = null;
  private to: Element | null = null;
  private raf = 0;

  constructor(parent: ShadowRoot | HTMLElement) {
    this.parent = parent;
    this.frame = document.createElement('div');
    this.frame.id = 'delab-measure-frame';
    this.frame.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483642;
      border: 1px dashed ${COLOR};
      border-radius: 2px;
      display: none;
    `;
    this.parent.appendChild(this.frame);
    window.addEventListener('scroll', this.schedule, true);
    window.addEventListener('resize', this.schedule);
  }

  /** 展示 from（选中元素）与 to（悬浮元素）之间的距离 */
  show(from: Element, to: Element) {
    this.from = from;
    this.to = to;
    this.render();
  }

  hide() {
    this.from = null;
    this.to = null;
    this.frame.style.display = 'none';
    for (const item of this.items) item.root.style.display = 'none';
  }

  destroy() {
    window.removeEventListener('scroll', this.schedule, true);
    window.removeEventListener('resize', this.schedule);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.frame.remove();
    for (const item of this.items) item.root.remove();
    this.items = [];
  }

  /** 滚动 / 尺寸变化时重新贴合两个元素 */
  private schedule = () => {
    if (!this.from || !this.to || this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.render();
    });
  };

  private render() {
    const from = this.from;
    const to = this.to;
    if (!from || !to || !from.isConnected || !to.isConnected) {
      this.hide();
      return;
    }

    const a = rectOf(from);
    const b = rectOf(to);
    if (!a || !b) {
      this.hide();
      return;
    }

    this.frame.style.left = `${b.left}px`;
    this.frame.style.top = `${b.top}px`;
    this.frame.style.width = `${b.width}px`;
    this.frame.style.height = `${b.height}px`;
    this.frame.style.display = 'block';

    this.paint(computeMeasurements(a, b));
  }

  private createItem(): Item {
    const root = document.createElement('div');
    root.className = 'delab-measure';
    root.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483643;
      background: ${COLOR};
      display: none;
    `;

    const capA = document.createElement('div');
    const capB = document.createElement('div');
    for (const cap of [capA, capB]) {
      cap.style.cssText = `position: absolute; background: ${COLOR};`;
      root.appendChild(cap);
    }

    const label = document.createElement('div');
    label.className = 'delab-measure-label';
    label.style.cssText = `
      position: absolute;
      padding: 2px 4px;
      border-radius: 3px;
      background: ${COLOR};
      color: #ffffff;
      font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.1;
      letter-spacing: 0.01em;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
    `;
    root.appendChild(label);

    this.parent.appendChild(root);
    return { root, capA, capB, label };
  }

  private paint(list: Measurement[]) {
    const shown = list.slice(0, MAX_ITEMS);
    while (this.items.length < shown.length) this.items.push(this.createItem());

    this.items.forEach((item, i) => {
      const m = shown[i];
      if (!m) {
        item.root.style.display = 'none';
        return;
      }

      const lo = Math.min(m.from, m.to);
      const len = Math.max(1, Math.abs(m.to - m.from));
      const { root, capA, capB, label } = item;

      root.style.display = 'block';
      label.textContent = formatValue(m.value);

      if (m.axis === 'h') {
        root.style.left = `${lo}px`;
        root.style.top = `${m.cross}px`;
        root.style.width = `${len}px`;
        root.style.height = '1px';

        capA.style.cssText = `position: absolute; background: ${COLOR}; left: 0; top: -3px; width: 1px; height: 7px;`;
        capB.style.cssText = `position: absolute; background: ${COLOR}; left: ${len - 1}px; top: -3px; width: 1px; height: 7px;`;

        // 靠近视口顶部时把数值翻到线下方，避免被裁掉
        const above = m.cross > 22;
        label.style.left = '50%';
        label.style.top = above ? '-3px' : '3px';
        label.style.transform = above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)';
      } else {
        root.style.left = `${m.cross}px`;
        root.style.top = `${lo}px`;
        root.style.width = '1px';
        root.style.height = `${len}px`;

        capA.style.cssText = `position: absolute; background: ${COLOR}; left: -3px; top: 0; width: 7px; height: 1px;`;
        capB.style.cssText = `position: absolute; background: ${COLOR}; left: -3px; top: ${len - 1}px; width: 7px; height: 1px;`;

        // 靠近视口左侧时把数值翻到线右侧
        const flip = m.cross < 40;
        label.style.left = flip ? '3px' : '-3px';
        label.style.top = '50%';
        label.style.transform = flip ? 'translate(0, -50%)' : 'translate(-100%, -50%)';
      }
    });
  }
}
