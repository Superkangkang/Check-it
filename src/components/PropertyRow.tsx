// DeLab Property Row - React component

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleProperty, ColorFormat, SizeMode, displayLabel, formatColor, getAlpha, withAlpha,
} from '../style-extractor';
import { PropertyField, FieldSpec } from './PropertyField';
import { CopyIcon, ResetIcon } from './Icon';

/** 尺寸三态图标：固定 / 贴合内容 / 撑满 */
const SIZE_MODES: Array<{ value: SizeMode; label: string; icon: React.ReactNode }> = [
  { value: 'fixed', label: '固定尺寸', icon: <rect x="4" y="4" width="16" height="16" rx="2" /> },
  {
    value: 'hug',
    label: '贴合内容',
    icon: (
      <>
        <rect x="2.5" y="2.5" width="19" height="19" rx="3" strokeDasharray="3 2.5" />
        <rect x="8" y="8" width="8" height="8" rx="1.5" />
      </>
    ),
  },
  { value: 'fill', label: '撑满父级', icon: <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" /> },
];

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

  /** 尺寸行为切换：固定 / 贴合内容 / 撑满父级 */
  const setSizeMode = useCallback((mode: SizeMode) => {
    const cssProp = property.cssProps[0];
    const isWidth = cssProp === 'width';
    if (mode === 'hug') {
      onCommit(cssProp, 'fit-content');
      return;
    }
    if (mode === 'fill') {
      // 主轴方向靠 flex，交叉轴方向靠 align-self
      onCommit(isWidth ? 'flex' : 'align-self', isWidth ? '1 1 0' : 'stretch');
      return;
    }
    const num = parseFloat(property.value);
    onCommit(cssProp, Number.isFinite(num) ? `${Math.round(num * 100) / 100}px` : property.value);
    onCommit(isWidth ? 'flex' : 'align-self', isWidth ? '0 1 auto' : 'auto');
  }, [onCommit, property.cssProps, property.value]);

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
        {property.sizeMode && SIZE_MODES.map(mode => {
          const active = property.sizeMode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              title={mode.label}
              aria-label={mode.label}
              onClick={() => setSizeMode(mode.value)}
              style={{
                width: 16, height: 16, padding: 0, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', borderRadius: 3, background: 'transparent',
                color: active ? 'var(--delab-accent, #32f08c)' : 'var(--delab-text-tertiary, #8a8a90)',
                cursor: 'pointer',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                {mode.icon}
              </svg>
            </button>
          );
        })}
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
