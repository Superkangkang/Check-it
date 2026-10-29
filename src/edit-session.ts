// DeLab Edit Session — records edits on a single element so they can be reverted

import { applyInline, readInline, readInlinePriority } from './style-writer';

interface EditRecord {
  /** Inline value before the first edit; null means the value came from a stylesheet */
  originalInline: string | null;
  originalPriority: string;
  /** 首次编辑前该属性的有效样式，用于判断输入是否真的改变了元素表现 */
  originalComputed: string;
  value: string;
}

export class EditSession {
  readonly element: HTMLElement;

  /** Whole `style` attribute captured before the first edit (for reset-all) */
  private styleSnapshot: string | null = null;
  private snapshotTaken = false;
  private records = new Map<string, EditRecord>();

  constructor(element: HTMLElement) {
    this.element = element;
  }

  /** Apply a declaration. Returns false when the value is invalid. */
  apply(prop: string, value: string): boolean {
    const existing = this.records.get(prop);
    const originalInline = existing
      ? existing.originalInline
      : readInline(this.element, prop) || null;
    const originalPriority = existing
      ? existing.originalPriority
      : readInlinePriority(this.element, prop);
    // 首次编辑前读一次有效样式；此时还没有 inline 覆盖，读到的是样式表里的值
    const originalComputed = existing ? existing.originalComputed : this.computed(prop);

    if (!this.snapshotTaken) {
      this.styleSnapshot = this.element.getAttribute('style');
      this.snapshotTaken = true;
    }

    if (!applyInline(this.element, prop, value)) return false;

    // 输入值与原来的有效样式等价（只进了录入状态、没真改）：撤销 inline，不计入修改
    if (originalComputed && this.computed(prop) === originalComputed) {
      if (originalInline) {
        this.element.style.setProperty(prop, originalInline, originalPriority);
      } else {
        this.element.style.removeProperty(prop);
      }
      this.records.delete(prop);
      if (this.records.size === 0) {
        this.styleSnapshot = null;
        this.snapshotTaken = false;
      }
      return true;
    }

    this.records.set(prop, { originalInline, originalPriority, originalComputed, value: value.trim() });
    return true;
  }

  /** 元素当前生效的样式值（简写属性可能读不到，此时返回空串） */
  private computed(prop: string): string {
    return getComputedStyle(this.element).getPropertyValue(prop).trim();
  }

  /** Revert a single property to its pre-edit state. */
  reset(prop: string): void {
    const record = this.records.get(prop);
    if (!record) return;

    if (record.originalInline === null) {
      this.element.style.removeProperty(prop);
    } else {
      this.element.style.setProperty(prop, record.originalInline, record.originalPriority);
    }

    this.records.delete(prop);
    if (this.records.size === 0) {
      this.styleSnapshot = null;
      this.snapshotTaken = false;
    }
  }

  /** Revert every edit made in this session by restoring the original style attribute. */
  resetAll(): void {
    if (!this.snapshotTaken) return;
    if (this.styleSnapshot === null) {
      this.element.removeAttribute('style');
    } else {
      this.element.setAttribute('style', this.styleSnapshot);
    }
    this.records.clear();
    this.styleSnapshot = null;
    this.snapshotTaken = false;
  }

  isModified(prop: string): boolean {
    return this.records.has(prop);
  }

  /** Pre-edit value, used for the row's tooltip. */
  originalOf(prop: string): string | null {
    const record = this.records.get(prop);
    return record ? record.originalInline : null;
  }

  count(): number {
    return this.records.size;
  }
}
