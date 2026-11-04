// DeLab Field Base — 输入控件共用的尺寸、外壳样式与单位拆分

import { MONO } from '../theme-context';

/** 所有输入控件统一高度 */
export const FIELD_HEIGHT = 28;

/**
 * 输入框外壳：数值 / 文本 / 枚举 / 颜色共用同一套高度、圆角、描边与内边距。
 * 默认不画线框（只留透明描边占位），悬停才出现细描边，聚焦用品牌绿。
 */
export function fieldShell(state?: {
  focused?: boolean;
  hover?: boolean;
  invalid?: boolean;
}): React.CSSProperties {
  return {
    flex: 1, minWidth: 0,
    display: 'flex', alignItems: 'center', gap: 2,
    height: FIELD_HEIGHT, padding: '0 7px', boxSizing: 'border-box',
    borderRadius: 6,
    background: state?.hover ? 'var(--delab-field-hover, #f3f3f5)' : 'var(--delab-field-bg, #ffffff)',
    border: `1px solid ${
      state?.invalid
        ? 'var(--delab-danger, #e5484d)'
        : state?.focused
          ? 'var(--delab-accent, #32f08c)'
          : state?.hover
            ? 'var(--delab-field-border, rgba(0,0,0,0.12))'
            : 'transparent'
    }`,
    transition: 'border-color 0.12s ease, background 0.12s ease',
  };
}

/** 外壳里的原生输入：无描边、无背景，样式由外壳负责 */
export const fieldInput: React.CSSProperties = {
  flex: 1, minWidth: 0, height: '100%',
  padding: 0, border: 'none', background: 'transparent',
  fontFamily: MONO, fontSize: 11, lineHeight: '16px',
  color: 'var(--delab-text, #141416)',
  outline: 'none', cursor: 'text', textAlign: 'left',
};

/** 框内前缀（X / 宽 / 旋转）与单位后缀（px / % / deg），文字与图标都垂直居中 */
export const fieldAffix: React.CSSProperties = {
  flexShrink: 0,
  display: 'flex', alignItems: 'center',
  fontFamily: MONO, fontSize: 10, lineHeight: 1,
  color: 'var(--delab-text-tertiary, #8a8a90)',
};

/** 拆分「数值 + 单位」：420px → { number: '420', unit: 'px' }；auto 原样返回 */
export function splitUnit(value: string): { number: string; unit: string } {
  const v = value.trim();
  const m = v.match(/^(-?\d*\.?\d+)\s*([a-z%]+)?$/i);
  if (m) return { number: m[1], unit: m[2] || '' };

  // 合并态的多值：`0px, 32px`（逗号）或 `4px 12px 12px`（border-radius 等空格简写）
  const list = v.includes(',') ? v.split(',').map(s => s.trim()) : v.split(/\s+/);
  if (list.length > 1) {
    const matches = list.map(s => s.match(/^(-?\d*\.?\d+)\s*([a-z%]+)?$/i));
    if (matches.every(Boolean)) {
      const units = new Set(matches.map(x => (x![2] || '').toLowerCase()));
      if (units.size === 1) {
        return { number: matches.map(x => x![1]).join(', '), unit: matches[0]![2] || '' };
      }
    }
  }
  return { number: v, unit: '' };
}
