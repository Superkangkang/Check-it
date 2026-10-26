// DeLab Edit Session — records edits on a single element so they can be reverted

import { applyInline, readInline, readInlinePriority } from './style-writer';

interface EditRecord {
  /** Inline value before the first edit; null means the value came from a stylesheet */
  originalInline: string | null;
  originalPriority: string;
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

    if (!this.snapshotTaken) {
      this.styleSnapshot = this.element.getAttribute('style');
      this.snapshotTaken = true;
    }

    if (!applyInline(this.element, prop, value)) return false;

    this.records.set(prop, { originalInline, originalPriority, value: value.trim() });
    return true;
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
