// DeLab Style Extractor — designer-focused property listing

import { controlMeta, ControlType } from './property-controls';
import { EditSession } from './edit-session';

export interface StyleGroup {
  name: string;
  properties: StyleProperty[];
}

export interface StyleProperty {
  name: string;
  value: string;
  isColor: boolean;
  /** Control used when the value goes into edit mode */
  control: ControlType;
  /** CSS properties written back to the element (first one is the primary key) */
  cssProps: string[];
  /** Unit hint for numeric inputs */
  unit?: string;
  /** Candidates for enum controls */
  options?: string[];
  /** Rows that cannot be edited (e.g. detected font) */
  readOnly?: boolean;
  /** Whether this property was edited in the current session */
  modified?: boolean;
  /** Pre-edit inline value, shown as a tooltip when modified */
  original?: string | null;
  /** Sub-fields for multi-value properties (margin / padding / border / radius / gap) */
  parts?: StylePart[];
}

/** One editable sub-value of a multi-value property */
export interface StylePart {
  /** Tiny label inside the field: T / R / B / L / ↖ … */
  label: string;
  cssProp: string;
  value: string;
  control: ControlType;
  unit?: string;
  options?: string[];
}

/** Property as gathered from computed style, before control metadata is attached */
interface RawProperty {
  name: string;
  value: string;
  isColor: boolean;
  parts?: StylePart[];
}

interface RawGroup {
  name: string;
  properties: RawProperty[];
}

export interface BoxModelValue {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BoxModel {
  margin: BoxModelValue;
  border: BoxModelValue;
  padding: BoxModelValue;
  content: { width: number; height: number };
}

// 7 groups, 18 base properties (margin/padding/border auto-merged to shorthand)
const GROUP_DEFS: Record<string, string[]> = {
  'Size':       ['width', 'height'],
  'Layout':     ['display', 'flex-direction', 'justify-content', 'align-items', 'gap'],
  'Spacing':    [], // merged: margin / padding
  'Color':      [], // merged: color / background-color / border-color
  'Typography': ['font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align'],
  'Border':     [], // merged: border
  'Shape & Effect': ['box-shadow'], // + opacity, border-radius
};

const COLOR_REGEX = /^(#([0-9a-fA-F]{3,8})|rgba?\(.+\)|hsla?\(.+\)|transparent|currentColor|inherit)(\s|$)/;

// Display name mapping — keep labels ≤ 12 chars to avoid wrapping
const LABEL_MAP: Record<string, string> = {
  'flex-direction': 'flex-dir',
  'justify-content': 'justify',
  'letter-spacing': 'letter-sp',
  'border-radius': 'radius',
};

export function displayLabel(name: string): string {
  return LABEL_MAP[name] || name;
}

/** Convert computed `rgb()`/`rgba()` color to hex. Returns null if not a valid color. */
export function rgbToHex(rgb: string): string | null {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
  if (!m) return null;
  const r = parseInt(m[1]), g = parseInt(m[2]), b = parseInt(m[3]);
  const a = m[4] !== undefined ? parseFloat(m[4]) : null;
  const h = (n: number) => n.toString(16).padStart(2, '0');
  if (a !== null && a < 1) {
    return `#${h(r)}${h(g)}${h(b)}${h(Math.round(a * 255))}`;
  }
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Convert hex back to `rgb()`/`rgba()`. */
export function hexToRgb(hex: string): string | null {
  const h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6,8}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (h.length === 8) {
    const a = parseInt(h.slice(6, 8), 16) / 255;
    const aStr = Number.isInteger(a) ? a.toString() : a.toFixed(2);
    return `rgba(${r}, ${g}, ${b}, ${aStr})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/** Convert hex to `hsl()`/`hsla()`. */
export function hexToHsl(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
  if (!m) return null;
  let r = parseInt(m[1]) / 255, g = parseInt(m[2]) / 255, b = parseInt(m[3]) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const H = Math.round(h * 360), S = Math.round(s * 100), L = Math.round(l * 100);
  const a = m[4] !== undefined ? parseFloat(m[4]) : null;
  if (a !== null && a < 1) {
    const aStr = Number.isInteger(a) ? a.toString() : a.toFixed(2);
    return `hsla(${H}, ${S}%, ${L}%, ${aStr})`;
  }
  return `hsl(${H}, ${S}%, ${L}%)`;
}

export type ColorFormat = 'hex' | 'rgb' | 'hsl';

/** Format a hex color to the given format. */
export function formatColor(hex: string, fmt: ColorFormat): string {
  if (fmt === 'rgb') return hexToRgb(hex) || hex;
  if (fmt === 'hsl') return hexToHsl(hex) || hex;
  return hex;
}

/** Normalize a color value to hex if possible, otherwise return original. */
export function toHex(value: string): string {
  return rgbToHex(value) || value;
}

export class StyleExtractor {
  extract(target: Element, session?: EditSession | null): StyleGroup[] {
    const c = window.getComputedStyle(target);
    const groups: RawGroup[] = [];

    for (const [name, props] of Object.entries(GROUP_DEFS)) {
      if (name === 'Spacing') {
        const mg = this.mergeBoxShorthand(c, 'margin');
        const pd = this.mergeBoxShorthand(c, 'padding');
        const merged: RawProperty[] = [];
        if (mg) merged.push({ ...mg, parts: this.boxParts(c, 'margin') });
        if (pd) merged.push({ ...pd, parts: this.boxParts(c, 'padding') });
        if (merged.length) groups.push({ name, properties: merged });
        continue;
      }
      if (name === 'Border') {
        const bd = this.mergeBorder(c);
        if (bd) {
          groups.push({
            name,
            properties: [{
              ...bd,
              parts: [
                {
                  label: 'W', cssProp: 'border-width', control: 'length', unit: 'px',
                  value: c.getPropertyValue('border-top-width') || '0px',
                },
                {
                  label: 'S', cssProp: 'border-style', control: 'enum',
                  options: ['none', 'solid', 'dashed', 'dotted', 'double'],
                  value: c.getPropertyValue('border-top-style') || 'none',
                },
              ],
            }],
          });
        }
        continue;
      }
      if (name === 'Shape & Effect') {
        const merged: RawProperty[] = [];
        // opacity
        const o = c.getPropertyValue('opacity');
        if (o && o !== '1') merged.push({ name: 'opacity', value: o, isColor: false });
        // border-radius
        const r = c.getPropertyValue('border-radius');
        if (r && r !== '0px') {
          merged.push({
            name: 'border-radius', value: r, isColor: false,
            parts: [
              { label: '\u2196', cssProp: 'border-top-left-radius', control: 'length', unit: 'px', value: c.getPropertyValue('border-top-left-radius') || '0px' },
              { label: '\u2197', cssProp: 'border-top-right-radius', control: 'length', unit: 'px', value: c.getPropertyValue('border-top-right-radius') || '0px' },
              { label: '\u2198', cssProp: 'border-bottom-right-radius', control: 'length', unit: 'px', value: c.getPropertyValue('border-bottom-right-radius') || '0px' },
              { label: '\u2199', cssProp: 'border-bottom-left-radius', control: 'length', unit: 'px', value: c.getPropertyValue('border-bottom-left-radius') || '0px' },
            ],
          });
        }
        // box-shadow (from GROUP_DEFS)
        for (const prop of props) {
          const v = c.getPropertyValue(prop);
          if (v && v !== 'none') merged.push({ name: prop, value: v, isColor: false });
        }
        if (merged.length) groups.push({ name, properties: merged });
        continue;
      }
      if (name === 'Color') {
        const colorProps: RawProperty[] = [];
        const textColor = c.getPropertyValue('color');
        if (textColor) colorProps.push({ name: 'color', value: toHex(textColor), isColor: true });
        const bgColor = c.getPropertyValue('background-color');
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') colorProps.push({ name: 'background', value: toHex(bgColor), isColor: true });
        const bdColor = c.getPropertyValue('border-color');
        // only show border-color if there is actually a visible border
        const bdStyle = c.getPropertyValue('border-style');
        const bdWidth = c.getPropertyValue('border-top-width');
        if (bdColor && bdStyle !== 'none' && bdWidth !== '0px') {
          colorProps.push({ name: 'border-color', value: toHex(bdColor), isColor: true });
        }
        if (colorProps.length) groups.push({ name, properties: colorProps });
        continue;
      }

      const properties: RawProperty[] = [];
      for (const prop of props) {
        const value = c.getPropertyValue(prop);
        if (!value) continue;
        const isColor = COLOR_REGEX.test(value.trim()) || (prop.includes('color') && value !== '');

        // gap can hold two values (row / column) — split them into separate fields
        if (prop === 'gap') {
          const [rowGap, colGap] = value.split(/\s+/);
          if (rowGap && colGap) {
            properties.push({
              name: prop, value, isColor: false,
              parts: [
                { label: 'R', cssProp: 'row-gap', control: 'length', unit: 'px', value: rowGap },
                { label: 'C', cssProp: 'column-gap', control: 'length', unit: 'px', value: colGap },
              ],
            });
            continue;
          }
        }

        properties.push({ name: prop, value, isColor });
      }

      // Typography: prepend detected font
      if (name === 'Typography') {
        const font = this.detectRenderedFont(c);
        if (font) properties.unshift({ name: 'font', value: font, isColor: false });
      }

      if (properties.length) groups.push({ name, properties });
    }

    return groups.map(group => ({
      name: group.name,
      properties: group.properties.map(p => this.describe(p, session)),
    }));
  }

  /** Attach control metadata and edit state to a raw property. */
  private describe(p: RawProperty, session?: EditSession | null): StyleProperty {
    const meta = controlMeta(p.name, p.value);
    const primary = meta.cssProps[0];
    const modified = session
      ? (p.parts && p.parts.length
          ? p.parts.some(part => session.isModified(part.cssProp))
          : session.isModified(primary))
      : false;

    return {
      name: p.name,
      value: p.value,
      isColor: p.isColor,
      ...meta,
      parts: p.parts,
      modified,
      original: session ? session.originalOf(primary) : null,
    };
  }

  /** Four-side sub-fields for margin / padding. */
  private boxParts(c: CSSStyleDeclaration, prefix: string): StylePart[] {
    const sides: Array<[string, string]> = [
      ['T', `${prefix}-top`],
      ['R', `${prefix}-right`],
      ['B', `${prefix}-bottom`],
      ['L', `${prefix}-left`],
    ];
    return sides.map(([label, prop]) => ({
      label,
      cssProp: prop,
      control: 'length' as ControlType,
      unit: 'px',
      value: c.getPropertyValue(prop) || '0px',
    }));
  }

  // ── Margin / Padding 简写 ──
  private mergeBoxShorthand(c: CSSStyleDeclaration, prefix: string): RawProperty | null {
    const t = c.getPropertyValue(`${prefix}-top`);
    const r = c.getPropertyValue(`${prefix}-right`);
    const b = c.getPropertyValue(`${prefix}-bottom`);
    const l = c.getPropertyValue(`${prefix}-left`);
    if (!t && !r && !b && !l) return null;

    if (t === b && r === l && t === r) {
      return { name: prefix, value: t || '0px', isColor: false };
    }
    if (t === b && r === l) {
      return { name: prefix, value: `${t} ${r}`, isColor: false };
    }
    return { name: prefix, value: `${t} ${r} ${b} ${l}`, isColor: false };
  }

  // ── Border 简写 ──
  private mergeBorder(c: CSSStyleDeclaration): RawProperty | null {
    const tw = c.getPropertyValue('border-top-width');
    const rw = c.getPropertyValue('border-right-width');
    const bw = c.getPropertyValue('border-bottom-width');
    const lw = c.getPropertyValue('border-left-width');
    const style = c.getPropertyValue('border-style');

    // 四边宽度一致且 style 非 none
    if (!(tw === rw && tw === bw && tw === lw)) return null;
    if (tw === '0px' && style === 'none') return null;

    let value = tw;
    // 附加 style（非 none 时展示）
    const styles = style.split(' ')[0];
    if (styles && styles !== 'none') value += ` ${styles}`;

    return { name: 'border', value, isColor: false };
  }

  // ── Font detection ──
  private detectRenderedFont(c: CSSStyleDeclaration): string | null {
    try {
      const ff = c.fontFamily;
      if (!ff) return null;
      const fonts = ff.split(',').map(f => f.trim().replace(/^["']|["']$/g, ''));
      const size = c.fontSize, weight = c.fontWeight, style = c.fontStyle;

      for (const font of fonts) {
        const isGen = ['serif','sans-serif','monospace','cursive','fantasy',
          'system-ui','ui-serif','ui-sans-serif','ui-monospace','ui-rounded',
          'math','emoji','fangsong'].includes(font.toLowerCase());
        if (isGen) continue;
        try {
          if (document.fonts.check(`${style} ${weight} ${size} "${font}"`)) return font;
        } catch { /* skip */ }
      }
      return this.detectByWidth(fonts, c);
    } catch { return null; }
  }

  private detectByWidth(fonts: string[], c: CSSStyleDeclaration): string | null {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return fonts[0] || null;
      const base = `${c.fontStyle} ${c.fontWeight} ${c.fontSize}`;
      const s = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      ctx.font = `${base} serif`;    const sw = ctx.measureText(s).width;
      ctx.font = `${base} sans-serif`; const nw = ctx.measureText(s).width;
      ctx.font = `${base} monospace`;  const mw = ctx.measureText(s).width;
      for (const f of fonts) {
        if (['serif','sans-serif','monospace','cursive','fantasy'].includes(f.toLowerCase())) continue;
        ctx.font = `${base} "${f}"`;
        const w = ctx.measureText(s).width;
        if (w !== sw && w !== nw && w !== mw) return f;
      }
      return fonts[0];
    } catch { return null; }
  }

  /** Extract box model values from computed style. */
  getBoxModel(target: Element): BoxModel {
    const c = window.getComputedStyle(target);
    const px = (v: string) => parseFloat(v) || 0;

    const margin: BoxModelValue = {
      top: px(c.getPropertyValue('margin-top')),
      right: px(c.getPropertyValue('margin-right')),
      bottom: px(c.getPropertyValue('margin-bottom')),
      left: px(c.getPropertyValue('margin-left')),
    };
    const border: BoxModelValue = {
      top: px(c.getPropertyValue('border-top-width')),
      right: px(c.getPropertyValue('border-right-width')),
      bottom: px(c.getPropertyValue('border-bottom-width')),
      left: px(c.getPropertyValue('border-left-width')),
    };
    const padding: BoxModelValue = {
      top: px(c.getPropertyValue('padding-top')),
      right: px(c.getPropertyValue('padding-right')),
      bottom: px(c.getPropertyValue('padding-bottom')),
      left: px(c.getPropertyValue('padding-left')),
    };

    const rect = target.getBoundingClientRect();
    // getBoundingClientRect 返回 border-box，减去 border + padding 得到 content
    const content = {
      width: Math.round(rect.width - padding.left - padding.right - border.left - border.right),
      height: Math.round(rect.height - padding.top - padding.bottom - border.top - border.bottom),
    };

    return { margin, border, padding, content };
  }
}

// ── 空值判断 ──
export function isEmptyValue(name: string, value: string): boolean {
  const v = value.trim();
  if (v === '0px' || v === '0' || v === 'none' || v === 'normal' ||
      v === 'auto' || v === 'static' || v === 'start' || v === 'row' || v === '1' ||
      v === '#00000000' || v === 'transparent') return true;
  // border with 0px and no style
  if (name === 'border' && /^0px( none)?( rgb\(0, 0, 0\))?/.test(v)) return true;
  return false;
}
