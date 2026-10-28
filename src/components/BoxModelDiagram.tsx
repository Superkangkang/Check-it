// DeLab Box Model Diagram — React component

import { useState, useCallback } from 'react';
import { BoxModel } from '../style-extractor';
import { useTheme } from '../theme-context';

// 色系与页面 overlay 保持一致：margin 品红 / border 绿 / padding 青 / content 蓝
// 内层填充叠在外层之上，透明度控制较低避免混色发闷
const CT_DARK = {
  margin:  { bg: 'rgba(244, 114, 182, 0.13)', text: '#f472b6' },
  border:  { bg: 'rgba(50, 240, 140, 0.13)', text: '#72dda3' },
  padding: { bg: 'rgba(56, 199, 222, 0.13)', text: '#6fd4e4' },
  content: { bg: 'rgba(107, 155, 245, 0.17)', text: '#93b7f7' },
};

const CT_LIGHT = {
  margin:  { bg: 'rgba(219, 39, 119, 0.14)', text: '#be185d' },
  border:  { bg: 'rgba(14, 182, 104, 0.15)', text: '#0a7245' },
  padding: { bg: 'rgba(20, 160, 185, 0.15)', text: '#0e6377' },
  content: { bg: 'rgba(80, 125, 230, 0.17)', text: '#2d4f9e' },
};

type Side = 'top' | 'bottom' | 'left' | 'right';
type Vals = { top: number; right: number; bottom: number; left: number };

interface Props {
  bm: BoxModel;
  /** Write a declaration to the inspected element; returns false when rejected */
  onCommit?: (prop: string, value: string) => boolean;
}

export function BoxModelDiagram({ bm, onCommit }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { isDark } = useTheme();
  const CT = isDark ? CT_DARK : CT_LIGHT;

  const toggle = useCallback(() => setCollapsed(v => !v), []);

  const S = { margin: 18, border: 14, padding: 16 };
  const CW = 50, CH = 32;

  return (
    <div style={{ borderBottom: '1px solid var(--delab-border,#e8e8e8)' }}>
      <div
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', cursor: 'pointer', userSelect: 'none',
          fontSize: 12, fontWeight: 600, letterSpacing: '-0.01em',
          color: 'var(--delab-text, #141416)',
        }}
      >
        <span>Box Model</span>
        <span style={{ fontSize: 13, lineHeight: 1, color: 'var(--delab-text-tertiary, #8a8a90)' }}>{collapsed ? '+' : '\u2212'}</span>
      </div>
      <div style={{
        padding: collapsed ? '0 12px' : '6px 12px 10px',
        maxHeight: collapsed ? 0 : 400,
        overflow: 'hidden',
        transition: 'max-height 0.25s ease, padding 0.25s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* margin box */}
          <div style={{ position: 'relative', background: CT.margin.bg, padding: S.margin }}>
            <NameTag name="margin" color={CT.margin.text} />
            <Values vals={bm.margin} padding={S.margin} color={CT.margin.text} prefix="margin" onCommit={onCommit} />
            {/* border box */}
            <div style={{ position: 'relative', background: CT.border.bg, padding: S.border }}>
              <NameTag name="border" color={CT.border.text} />
              <Values vals={bm.border} padding={S.border} color={CT.border.text} />
              {/* padding box */}
              <div style={{ position: 'relative', background: CT.padding.bg, padding: S.padding }}>
                <NameTag name="padding" color={CT.padding.text} />
                <Values vals={bm.padding} padding={S.padding} color={CT.padding.text} prefix="padding" onCommit={onCommit} />
                {/* content box */}
                <div style={{
                  background: CT.content.bg, width: CW, height: CH,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  color: 'var(--delab-text, #1a1a2e)',
                }}>
                  {bm.content.width}&#215;{bm.content.height}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NameTag({ name, color }: { name: string; color: string }) {
  return (
    <span style={{
      position: 'absolute', top: 2, left: 3,
      fontSize: 8, fontWeight: 600, color, lineHeight: 1, opacity: 0.7,
    }}>
      {name}
    </span>
  );
}

function Values({ vals, padding, color, prefix, onCommit }: {
  vals: Vals;
  padding: number;
  color: string;
  prefix?: string;
  onCommit?: (prop: string, value: string) => boolean;
}) {
  const half = padding / 2;
  const sides: { s: Side; v: number }[] = [
    { s: 'top', v: vals.top }, { s: 'bottom', v: vals.bottom },
    { s: 'left', v: vals.left }, { s: 'right', v: vals.right },
  ];

  const posMap: Record<Side, React.CSSProperties> = {
    top:    { top: half, left: '50%', transform: 'translate(-50%,-50%)' },
    bottom: { bottom: half, left: '50%', transform: 'translate(-50%,50%)' },
    left:   { left: half, top: '50%', transform: 'translate(-50%,-50%)' },
    right:  { right: half, top: '50%', transform: 'translate(50%,-50%)' },
  };

  return (
    <>
      {sides.map(({ s, v }) => (
        <ValueLabel
          key={s}
          value={v}
          color={color}
          style={posMap[s]}
          cssProp={prefix && onCommit ? `${prefix}-${s}` : undefined}
          onCommit={onCommit}
        />
      ))}
    </>
  );
}

function ValueLabel({ value, color, style, cssProp, onCommit }: {
  value: number;
  color: string;
  style: React.CSSProperties;
  cssProp?: string;
  onCommit?: (prop: string, value: string) => boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [hover, setHover] = useState(false);

  const editable = !!cssProp && !!onCommit;

  const commit = () => {
    if (!cssProp || !onCommit) return;
    const raw = draft.trim();
    if (!raw) return;
    const value = /^-?\d+(?:\.\d+)?$/.test(raw) ? `${raw}px` : raw;
    onCommit(cssProp, value);
  };

  if (editing && editable) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onClick={e => e.stopPropagation()}
        onFocus={e => e.target.select()}
        onBlur={() => { commit(); setEditing(false); }}
        onKeyDown={e => {
          e.stopPropagation();
          if (e.key === 'Enter') { commit(); setEditing(false); }
          else if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); }
        }}
        style={{
          position: 'absolute', width: 40, height: 16, padding: 0,
          fontSize: 9, fontWeight: 700, textAlign: 'center',
          fontFamily: 'inherit', color: 'var(--delab-text, #1a1a2e)',
          background: 'var(--delab-bg, #fff)',
          border: '1px solid var(--delab-accent, #32f08c)',
          borderRadius: 2, outline: 'none', zIndex: 2,
          ...style,
        }}
      />
    );
  }

  return (
    <span
      onClick={editable ? (e) => { e.stopPropagation(); setDraft(String(value)); setEditing(true); } : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={editable ? 'Click to edit' : undefined}
      style={{
        position: 'absolute', fontSize: 9, fontWeight: 700,
        color,
        lineHeight: 1, whiteSpace: 'nowrap',
        cursor: editable ? 'text' : 'default',
        padding: '1px 2px', borderRadius: 2,
        background: hover && editable ? 'var(--delab-row-hover, rgba(255,255,255,0.6))' : 'transparent',
        transition: 'background 0.15s',
        ...style,
      }}
    >
      {value}
    </span>
  );
}
