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

  constructor(root: ShadowRoot) {
    this.layer = document.createElement('div');
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
  }

  private onViewportChange = () => this.scheduleUpdate();

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
      const record: PinRecord = { node, input, target: resolveElement(input.identity) };
      this.records.set(input.id, record);
      this.paint(record);
    });

    this.scheduleUpdate();
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
      border-radius: ${PIN_SIZE / 2}px ${PIN_SIZE / 2}px ${PIN_SIZE / 2}px 2px;
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
    this.records.forEach(record => {
      // 元素被重渲染销毁时，用指纹重新找回
      if (!record.target || !record.target.isConnected) {
        record.target = resolveElement(record.input.identity);
      }
      const target = record.target;
      if (!target) {
        record.node.style.display = 'none';
        return;
      }
      const rect = target.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        record.node.style.display = 'none';
        return;
      }
      record.node.style.display = 'flex';
      record.node.style.left = `${Math.round(rect.right - PIN_SIZE / 2)}px`;
      record.node.style.top = `${Math.round(rect.top - PIN_SIZE / 2)}px`;
    });
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
    this.records.forEach(record => record.node.remove());
    this.records.clear();
  }

  destroy() {
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
    if (this.frame) cancelAnimationFrame(this.frame);
    this.clear();
    this.layer.remove();
  }
}
