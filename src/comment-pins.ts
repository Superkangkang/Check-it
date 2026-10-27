// DeLab Comment Pins — 页面上按元素位置定位的编号气泡

import { ElementIdentity, resolveElement } from './element-identity';

export interface PinInput {
  id: string;
  /** 展示编号，从 1 开始 */
  index: number;
  identity: ElementIdentity;
  active: boolean;
  onClick: (id: string) => void;
}

interface PinRecord {
  node: HTMLButtonElement;
  input: PinInput;
  target: Element | null;
}

const PIN_SIZE = 22;

export class CommentPins {
  private layer: HTMLElement;
  private records = new Map<string, PinRecord>();
  private frame = 0;
  private observer: MutationObserver | null = null;
  private observing = false;
  private mutationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(root: ShadowRoot) {
    this.layer = document.createElement('div');
    this.layer.id = 'delab-comment-pins';
    this.layer.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483642;
      pointer-events: none;
      contain: layout style;
    `;
    root.appendChild(this.layer);

    window.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange);

    // 页内切换 tab / 路由切换时元素会被移除或隐藏，需要重算，避免气泡停在旧位置
    this.observer = new MutationObserver(this.onDomChange);
  }

  private onViewportChange = () => this.scheduleUpdate();

  /** 页面结构变化较频繁，做一次节流，避免每帧重排 */
  private onDomChange = () => {
    if (this.mutationTimer) return;
    this.mutationTimer = setTimeout(() => {
      this.mutationTimer = null;
      this.scheduleUpdate();
    }, 150);
  };

  render(inputs: PinInput[]) {
    const seen = new Set(inputs.map(input => input.id));

    this.records.forEach((record, id) => {
      if (seen.has(id)) return;
      record.node.remove();
      this.records.delete(id);
    });

    inputs.forEach(input => {
      const existing = this.records.get(input.id);
      if (existing) {
        existing.input = input;
        this.paint(existing);
        return;
      }
      const node = this.createPin(input);
      this.layer.appendChild(node);
      const record: PinRecord = { node, input, target: this.resolveTarget(input.identity) };
      this.records.set(input.id, record);
      this.paint(record);
    });

    this.scheduleUpdate();
    this.startObserving();
  }

  /** 仅有评论气泡时才监听页面结构变化 */
  private startObserving() {
    if (this.observing || !this.observer) return;
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden'],
    });
    this.observing = true;
  }

  private stopObserving() {
    this.observer?.disconnect();
    this.observing = false;
    if (this.mutationTimer) {
      clearTimeout(this.mutationTimer);
      this.mutationTimer = null;
    }
  }

  private createPin(input: PinInput): HTMLButtonElement {
    const node = document.createElement('button');
    node.type = 'button';
    node.title = input.identity.text || input.identity.selector;
    node.style.cssText = `
      position: fixed;
      width: ${PIN_SIZE}px;
      height: ${PIN_SIZE}px;
      padding: 0;
      border: 2px solid var(--delab-bg, #fff);
      border-radius: ${PIN_SIZE / 2}px ${PIN_SIZE / 2}px 2px ${PIN_SIZE / 2}px;
      background: var(--delab-accent, #5e6ad2);
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      display: none;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
      transition: transform 0.12s ease, opacity 0.12s ease;
    `;
    node.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const current = this.records.get(input.id);
      if (current) current.input.onClick(input.id);
    });
    return node;
  }

  private paint(record: PinRecord) {
    const { node, input } = record;
    node.textContent = String(input.index);
    node.style.background = input.active
      ? 'var(--delab-accent, #5e6ad2)'
      : 'color-mix(in srgb, var(--delab-accent, #5e6ad2) 70%, #000)';
    node.style.opacity = input.active ? '1' : '0.85';
    node.style.transform = input.active ? 'scale(1.15)' : 'scale(1)';
  }

  private scheduleUpdate() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.updatePositions();
    });
  }

  private updatePositions() {
    const placed: Rect[] = [];
    const obstacles = this.collectObstacles();

    this.records.forEach(record => {
      // 元素被重渲染销毁时，用指纹重新找回；对不上就隐藏，避免误挂到别的元素上
      if (!record.target || !record.target.isConnected) {
        record.target = this.resolveTarget(record.input.identity);
      }
      const target = record.target;
      if (!target || !isElementVisible(target)) {
        record.node.style.display = 'none';
        return;
      }
      const rect = target.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        record.node.style.display = 'none';
        return;
      }

      // 默认贴元素左上角，被占用时向左右 / 上下挪开，并避开标签与评论按钮
      const base = { left: rect.left - PIN_SIZE / 2, top: rect.top - PIN_SIZE / 2 };
      const position = this.findFreeSpot(base, placed, obstacles);

      record.node.style.display = 'flex';
      record.node.style.left = `${Math.round(position.left)}px`;
      record.node.style.top = `${Math.round(position.top)}px`;
      placed.push(position);
    });
  }

  /** 从最近的候选位开始试，返回第一个不与已有气泡 / 标签 / 按钮重叠的位置 */
  private findFreeSpot(base: { left: number; top: number }, placed: Rect[], obstacles: Rect[]): Rect {
    const step = PIN_SIZE + 2;

    for (const [dx, dy] of SPOT_ORDER) {
      const spot = clampToViewport({
        left: base.left + dx * step,
        top: base.top + dy * step,
      });
      const hit = [...placed, ...obstacles].some(rect => intersects(spot, rect));
      if (!hit) return spot;
    }

    // 全都挤满时退回原位，保证仍能看到
    return clampToViewport(base);
  }

  /** 需要避让的插件 UI：元素标签、评论按钮、评论弹层、模式切换器 */
  private collectObstacles(): Rect[] {
    const root = this.layer.parentElement;
    if (!root) return [];

    const rects: Rect[] = [];
    for (const selector of ['#delab-glass-label', '#delab-comment-button', '#delab-comment-popover', '#delab-mode-switcher']) {
      const el = root.querySelector<HTMLElement>(selector);
      if (!el || el.style.display === 'none') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        rects.push({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
      }
    }
    return rects;
  }

  /** 按指纹找回元素，并要求与评论时记录的标签 / 文案一致 */
  private resolveTarget(identity: ElementIdentity): Element | null {
    const found = resolveElement(identity);
    if (!found) return null;
    if (found.tagName.toLowerCase() !== identity.tag) return null;
    if (identity.id && found.id !== identity.id) return null;
    if (identity.text && readComparableText(found) !== identity.text) return null;
    return found;
  }

  /** 页面滚动到评论对应元素 */
  scrollTo(id: string) {
    const target = this.records.get(id)?.target;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  getTarget(id: string): Element | null {
    return this.records.get(id)?.target ?? null;
  }

  clear() {
    this.stopObserving();
    this.records.forEach(record => record.node.remove());
    this.records.clear();
  }

  destroy() {
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
    this.stopObserving();
    this.observer = null;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.clear();
    this.layer.remove();
  }
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const EDGE = 4;

/** 候选位：先原位，再依次向左 / 向右 / 上下错开 */
const SPOT_ORDER: Array<[number, number]> = [
  [0, 0],
  [-1, 0], [1, 0],
  [-2, 0], [2, 0],
  [0, -1], [-1, -1], [1, -1],
  [0, 1], [-1, 1], [1, 1],
  [-3, 0], [3, 0],
  [-2, -1], [2, -1],
  [-2, 1], [2, 1],
];

function clampToViewport(spot: { left: number; top: number }): Rect {
  const maxLeft = Math.max(EDGE, window.innerWidth - PIN_SIZE - EDGE);
  const maxTop = Math.max(EDGE, window.innerHeight - PIN_SIZE - EDGE);
  const left = Math.min(Math.max(spot.left, EDGE), maxLeft);
  const top = Math.min(Math.max(spot.top, EDGE), maxTop);
  return { left, top, right: left + PIN_SIZE, bottom: top + PIN_SIZE };
}

function intersects(a: Rect, b: Rect): boolean {
  return a.left < b.right + 1 && a.right > b.left - 1 && a.top < b.bottom + 1 && a.bottom > b.top - 1;
}

/** 与 describeElement 记录文案的规则保持一致，用于找回元素时比对 */
function readComparableText(el: Element): string {
  const explicit =
    el.getAttribute('aria-label') ||
    el.getAttribute('placeholder') ||
    el.getAttribute('alt') ||
    el.getAttribute('title');
  const raw = explicit || el.textContent || '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, 60);
}

/** 元素是否可见（display:none / visibility:hidden / 祖先隐藏都算不可见） */
function isElementVisible(el: Element): boolean {
  const check = (el as Element & {
    checkVisibility?: (options?: Record<string, boolean>) => boolean;
  }).checkVisibility;
  if (typeof check === 'function') {
    try {
      // 新旧 Chrome 的选项名不同，两个都传，未知键会被忽略
      return check.call(el, { checkVisibilityCSS: true, visibilityProperty: true });
    } catch {
      return true;
    }
  }
  return true;
}
