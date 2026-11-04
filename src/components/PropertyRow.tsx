// DeLab Property Row - React component

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleProperty, ColorFormat, displayLabel, formatColor, getAlpha, withAlpha,
} from '../style-extractor';
import { PropertyField, FieldSpec } from './PropertyField';
import { fieldShell, fieldInput, fieldAffix } from './field-base';
import { normalizeInput } from '../property-controls';
import { ResetIcon, FieldGlyph, FieldIconName } from './Icon';

/** margin / padding 四个方向：字母标签换成「方框 + 单边」图标 */
const SIDE_META: Record<string, { icon: FieldIconName; title: string }> = {
  T: { icon: 'pad-top', title: '上' },
  R: { icon: 'pad-right', title: '右' },
  B: { icon: 'pad-bottom', title: '下' },
  L: { icon: 'pad-left', title: '左' },
};

interface PropertyRowProps {
  property: StyleProperty;
  isColorGroup: boolean;
  colorFormat: ColorFormat;
  /** Write a declaration to the inspected element; returns false when rejected */
  onCommit: (prop: string, value: string) => boolean;
  /** Revert a single property to its pre-edit value */
  onReset: (prop: string) => void;
}

export function PropertyRow({ property, isColorGroup, colorFormat, onCommit, onReset }: PropertyRowProps) {
  const [hover, setHover] = useState(false);

  const specs: FieldSpec[] = useMemo(() => {
    if (property.parts && property.parts.length > 0) {
      return property.parts.map(part => {
        const side = SIDE_META[part.label];
        return {
          value: part.value,
          cssProp: part.cssProp,
          control: part.control,
          unit: part.unit,
          options: part.options,
          prefix: side ? <FieldGlyph name={side.icon} title={side.title} /> : part.label,
        };
      });
    }
    return [{
      value: property.value,
      cssProp: property.cssProps[0],
      control: property.control,
      unit: property.unit,
      options: property.options,
      readOnly: property.readOnly,
      format: isColorGroup ? (v: string) => formatColor(v, colorFormat) : undefined,
    }];
  }, [property, isColorGroup, colorFormat]);

  /** 多值属性：一个标签 + 2 列输入格 */
  const isMulti = specs.length > 1;

  // margin / padding：默认合并成「垂直」「水平」两个框，可展开成四个方向
  const boxParts = property.parts && property.parts.length === 4
    && (property.name === 'margin' || property.name === 'padding')
    ? property.parts
    : null;
  const [expanded, setExpanded] = useState(false);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (property.parts && property.parts.length > 0) {
      property.parts.forEach(part => onReset(part.cssProp));
    } else {
      onReset(property.cssProps[0]);
    }
  }, [onReset, property.parts, property.cssProps]);

  /**
   * 合并态提交：单个值同时写两侧；「上, 下」两个值时分别写。
   * 单位在输入框里作为后缀展示，这里负责补回。
   */
  const commitPair = (first: string, second: string, raw: string): boolean => {
    const tokens = raw.split(',').map(t => t.trim()).filter(Boolean);
    if (tokens.length === 0 || tokens.length > 2) return false;
    const values = tokens.map(t => (/^-?\d*\.?\d+(px|%)?$/.test(t) ? normalizeInput(t, 'px') : ''));
    if (values.some(v => !v)) return false;
    const [a, b] = values.length === 2 ? values : [values[0], values[0]];
    onCommit(first, a);
    onCommit(second, b);
    return true;
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column', gap: 4,
        position: 'relative',
      }}
    >
      {property.modified && (
        <span style={{
          position: 'absolute', left: -8, top: 1, bottom: 1, width: 2,
          background: 'var(--delab-accent, #32f08c)', borderRadius: 1,
        }} />
      )}

      {/* 标签行：名称 + 尺寸三态 + hover 时的重置 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 14 }}>
        <span
          title={property.modified ? `original: ${property.original ?? 'stylesheet value'}` : property.name}
          style={{
            flex: 1, minWidth: 0,
            fontSize: 10, lineHeight: '14px',
            color: 'var(--delab-text-tertiary, #8a8a90)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {displayLabel(property.name)}
        </span>
        {boxParts && (
          <button
            type="button"
            title={expanded ? '合并为上下 / 左右' : '按四个方向编辑'}
            aria-label={expanded ? '合并为上下 / 左右' : '按四个方向编辑'}
            onClick={() => setExpanded(v => !v)}
            style={{
              flexShrink: 0, width: 16, height: 16, padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', borderRadius: 3, background: 'transparent', cursor: 'pointer',
              color: expanded
                ? 'var(--delab-accent, #32f08c)'
                : 'var(--delab-text-tertiary, #8a8a90)',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>
        )}
        {hover && property.modified && (
          <IconButton title="Reset to original" onClick={handleReset}>
            <ResetIcon size={11} />
          </IconButton>
        )}
      </div>

      {boxParts && !expanded ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {/* 垂直：同时写 top / bottom；两侧不等时显示「上, 下」 */}
          <PropertyField
            spec={{
              value: pairValue(boxParts[0].value, boxParts[2].value),
              cssProp: `${property.name}-vertical`,
              control: 'length', unit: 'px',
              prefix: <FieldGlyph name="vertical" title="上下" />,
            }}
            onCommit={(_, value) => commitPair(boxParts[0].cssProp, boxParts[2].cssProp, value)}
          />
          {/* 水平：同时写 right / left；两侧不等时显示「右, 左」 */}
          <PropertyField
            spec={{
              value: pairValue(boxParts[1].value, boxParts[3].value),
              cssProp: `${property.name}-horizontal`,
              control: 'length', unit: 'px',
              prefix: <FieldGlyph name="horizontal" title="左右" />,
            }}
            onCommit={(_, value) => commitPair(boxParts[1].cssProp, boxParts[3].cssProp, value)}
          />
        </div>
      ) : (
      <div style={isMulti
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }
        : { display: 'flex', gap: 8 }}>
        {specs.map(spec => (
          <PropertyField key={spec.cssProp} spec={spec} onCommit={onCommit} />
        ))}
        {/* 颜色行额外提供透明度百分比，对应 Figma 填充行右侧的 100% */}
        {!isMulti && property.isColor && (
          <AlphaField
            color={property.value}
            onCommit={value => onCommit(property.cssProps[0], value)}
          />
        )}
      </div>
      )}
    </div>
  );
}

/** 两个方向的值相等时只显示一个，不等时显示「第一个, 第二个」 */
function pairValue(first: string, second: string): string {
  return first === second ? first : `${first}, ${second}`;
}

/** 颜色透明度输入：显示/编辑百分比，写回时转成 #rrggbbaa */
function AlphaField({ color, onCommit }: { color: string; onCommit: (value: string) => void }) {
  const pct = Math.round(getAlpha(color) * 100);
  const [draft, setDraft] = useState(`${pct}`);
  const [focused, setFocused] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(`${pct}`);
  }, [pct, focused]);

  const commit = () => {
    const n = parseFloat(draft);
    if (Number.isFinite(n)) {
      onCommit(withAlpha(color, Math.max(0, Math.min(100, n)) / 100));
    }
    setFocused(false);
  };

  return (
    <div
      style={{
        ...fieldShell({ focused, hover }),
        flex: 'none', width: 54, justifyContent: 'flex-end',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <input
        value={focused ? draft : `${pct}`}
        onFocus={e => { setFocused(true); setDraft(`${pct}`); e.target.select(); }}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          e.stopPropagation();
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
          else if (e.key === 'Escape') { e.preventDefault(); setDraft(`${pct}`); e.currentTarget.blur(); }
        }}
        spellCheck={false}
        title="透明度"
        style={{ ...fieldInput, textAlign: 'right' }}
      />
      <span style={fieldAffix}>%</span>
    </div>
  );
}

function IconButton({ title, onClick, children }: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: 'var(--delab-text-tertiary, #8a8a90)', display: 'inline-flex',
        alignItems: 'center', borderRadius: 3, width: 14, height: 14,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
