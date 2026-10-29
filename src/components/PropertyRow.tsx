// DeLab Property Row - React component

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleProperty, ColorFormat, displayLabel, formatColor, getAlpha, withAlpha,
} from '../style-extractor';
import { PropertyField, FieldSpec } from './PropertyField';
import { CopyIcon, ResetIcon } from './Icon';

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
  const [copied, setCopied] = useState(false);
  const [hover, setHover] = useState(false);

  const specs: FieldSpec[] = useMemo(() => {
    if (property.parts && property.parts.length > 0) {
      return property.parts.map(part => ({
        value: part.value,
        cssProp: part.cssProp,
        control: part.control,
        unit: part.unit,
        options: part.options,
        prefix: part.label,
      }));
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

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${property.name}: ${property.value}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }).catch(() => {});
  }, [property.name, property.value]);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (property.parts && property.parts.length > 0) {
      property.parts.forEach(part => onReset(part.cssProp));
    } else {
      onReset(property.cssProps[0]);
    }
  }, [onReset, property.parts, property.cssProps]);

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

      {/* 标签行：名称 + 尺寸三态 + hover 时的复制 / 重置 */}
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
        {hover && (
          property.modified ? (
            <IconButton title="Reset to original" onClick={handleReset}>
              <ResetIcon size={11} />
            </IconButton>
          ) : (
            <IconButton title={copied ? 'Copied' : 'Copy'} onClick={handleCopy}>
              <CopyIcon size={11} />
            </IconButton>
          )
        )}
      </div>

      <div style={isMulti
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }
        : { display: 'flex', gap: 4 }}>
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
    </div>
  );
}

/** 颜色透明度输入：显示/编辑百分比，写回时转成 #rrggbbaa */
function AlphaField({ color, onCommit }: { color: string; onCommit: (value: string) => void }) {
  const pct = Math.round(getAlpha(color) * 100);
  const [draft, setDraft] = useState(`${pct}%`);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(`${pct}%`);
  }, [pct, focused]);

  const commit = () => {
    const n = parseFloat(draft);
    if (Number.isFinite(n)) {
      onCommit(withAlpha(color, Math.max(0, Math.min(100, n)) / 100));
    }
    setFocused(false);
  };

  return (
    <input
      value={focused ? draft : `${pct}%`}
      onFocus={e => { setFocused(true); setDraft(`${pct}%`); e.target.select(); }}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
        else if (e.key === 'Escape') { e.preventDefault(); setDraft(`${pct}%`); e.currentTarget.blur(); }
      }}
      spellCheck={false}
      title="透明度"
      style={{
        flex: 'none', width: 46, height: 28, boxSizing: 'border-box',
        padding: '0 6px', textAlign: 'right',
        fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
        fontSize: 11, lineHeight: '16px',
        borderRadius: 6, border: '1px solid transparent', outline: 'none',
        background: 'var(--delab-field-bg, #ffffff)',
        color: 'var(--delab-text, #141416)',
        cursor: 'text',
      }}
    />
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
