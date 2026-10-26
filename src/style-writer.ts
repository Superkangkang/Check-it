// DeLab Style Writer — validate and write inline styles on the inspected element

/** Whether the browser accepts `value` for `prop`. */
export function isValidValue(prop: string, value: string): boolean {
  const v = value.trim();
  if (!v || !prop) return false;
  try {
    return CSS.supports(prop, v);
  } catch {
    return false;
  }
}

/** Write a single declaration to the element's inline style. Returns false when rejected. */
export function applyInline(el: HTMLElement, prop: string, value: string): boolean {
  if (!isValidValue(prop, value)) return false;
  el.style.setProperty(prop, value.trim());
  // the browser drops declarations it cannot parse
  return el.style.getPropertyValue(prop) !== '';
}

/** Current inline value of `prop` ('' when the value comes from a stylesheet). */
export function readInline(el: HTMLElement, prop: string): string {
  return el.style.getPropertyValue(prop).trim();
}

/** Current inline priority of `prop` ('important' | ''). */
export function readInlinePriority(el: HTMLElement, prop: string): string {
  return el.style.getPropertyPriority(prop) || '';
}
