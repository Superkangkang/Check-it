// DeLab Property Controls — property → editable control mapping

export type ControlType = 'length' | 'number' | 'color' | 'enum' | 'text';

export interface ControlMeta {
  /** Which control to render when editing */
  control: ControlType;
  /** CSS properties actually written to the element (first one is the primary key) */
  cssProps: string[];
  /** Unit hint for numeric inputs */
  unit?: string;
  /** Candidates for enum controls */
  options?: string[];
  /** Read-only rows (e.g. detected font) */
  readOnly?: boolean;
}

const UNIT_REGEX = /^(-?\d+(?:\.\d+)?)(px|%|em|rem|vh|vw|pt)$/;

const ENUM_OPTIONS: Record<string, string[]> = {
  'display': ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'none'],
  'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
  'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
  'justify-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly', 'start', 'end'],
  'align-items': ['stretch', 'flex-start', 'flex-end', 'center', 'baseline', 'start', 'end'],
  'align-content': ['normal', 'stretch', 'flex-start', 'flex-end', 'center', 'space-between', 'space-around'],
  'position': ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  'text-align': ['left', 'right', 'center', 'justify', 'start', 'end'],
  'font-weight': ['100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold'],
};

const META: Record<string, ControlMeta> = {
  // Position
  'position':         { control: 'enum',   cssProps: ['position'] },
  'top':              { control: 'length', cssProps: ['top'] },
  'right':            { control: 'length', cssProps: ['right'] },
  'bottom':           { control: 'length', cssProps: ['bottom'] },
  'left':             { control: 'length', cssProps: ['left'] },
  'z-index':          { control: 'number', cssProps: ['z-index'] },
  // Size
  'width':            { control: 'length', cssProps: ['width'] },
  'height':           { control: 'length', cssProps: ['height'] },
  // Layout
  'display':          { control: 'enum',   cssProps: ['display'] },
  'flex-direction':   { control: 'enum',   cssProps: ['flex-direction'] },
  'flex-wrap':        { control: 'enum',   cssProps: ['flex-wrap'] },
  'justify-content':  { control: 'enum',   cssProps: ['justify-content'] },
  'align-items':      { control: 'enum',   cssProps: ['align-items'] },
  'align-content':    { control: 'enum',   cssProps: ['align-content'] },
  'gap':              { control: 'length', cssProps: ['gap'] },
  'flex-grow':        { control: 'number', cssProps: ['flex-grow'] },
  'flex-shrink':      { control: 'number', cssProps: ['flex-shrink'] },
  'flex-basis':       { control: 'length', cssProps: ['flex-basis'] },
  // Spacing — shorthand, expanded into four sides in a later phase
  'margin':           { control: 'text',   cssProps: ['margin'] },
  'padding':          { control: 'text',   cssProps: ['padding'] },
  // Color
  'color':            { control: 'color',  cssProps: ['color'] },
  'background':       { control: 'color',  cssProps: ['background-color'] },
  'border-color':     { control: 'color',  cssProps: ['border-color'] },
  // Typography
  'font':             { control: 'text',   cssProps: ['font-family'], readOnly: true },
  'font-size':        { control: 'length', cssProps: ['font-size'] },
  'font-weight':      { control: 'enum',   cssProps: ['font-weight'] },
  'line-height':      { control: 'length', cssProps: ['line-height'] },
  'letter-spacing':   { control: 'length', cssProps: ['letter-spacing'] },
  'text-align':       { control: 'enum',   cssProps: ['text-align'] },
  // Border
  'border':           { control: 'text',   cssProps: ['border'] },
  // Shape & Effect
  'opacity':          { control: 'number', cssProps: ['opacity'] },
  'border-radius':    { control: 'text',   cssProps: ['border-radius'] },
  'box-shadow':       { control: 'text',   cssProps: ['box-shadow'] },
};

const FALLBACK: ControlMeta = { control: 'text', cssProps: [] };

/** Extract the unit suffix (px / % / em …) from a computed value. */
export function detectUnit(value: string): string | undefined {
  const m = value.trim().match(UNIT_REGEX);
  return m ? m[2] : undefined;
}

/** Resolve control metadata for a displayed property. */
export function controlMeta(name: string, value: string): ControlMeta {
  const base = META[name] ?? FALLBACK;
  const meta: ControlMeta = { ...base };
  meta.cssProps = base.cssProps.length ? base.cssProps : [name];

  if (meta.control === 'length') {
    // line-height accepts unitless numbers, so a bare "1.5" must stay unitless
    meta.unit = detectUnit(value) ?? (name === 'line-height' ? undefined : 'px');
  }
  // shorthand values made of lengths still accept a bare number ("16" → "16px")
  if (name === 'margin' || name === 'padding' || name === 'border-radius') {
    meta.unit = 'px';
  }
  if (meta.control === 'enum') {
    const options = ENUM_OPTIONS[name] ?? [];
    // keep the current value selectable even when it is not a preset
    meta.options = value && !options.includes(value) ? [value, ...options] : options;
  }
  return meta;
}

/**
 * Normalize user input before writing it back.
 * A bare number inherits the unit of the current value (`20` → `20px`).
 * Returns '' when the input is empty (treated as invalid).
 */
export function normalizeInput(raw: string, unit?: string): string {
  const v = raw.trim();
  if (!v) return '';
  if (unit && /^-?\d+(?:\.\d+)?$/.test(v)) return `${v}${unit}`;
  return v;
}
