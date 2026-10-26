// DeLab Box Model Diagram — React component

import { useState, useCallback } from 'react';
import { BoxModel } from '../style-extractor';
import { useTheme } from '../theme-context';

const CT_DARK = {
  margin:  { bg: 'rgba(244,155,175,0.30)', text: '#c75070' },
  border:  { bg: 'rgba(255,200,215,0.35)', text: '#d46080' },
  padding: { bg: 'rgba(155,185,230,0.35)', text: '#5578b8' },
  content: { bg: 'rgba(130,165,220,0.38)', text: '#4a6faa' },
};

// darker text on lighter fills so numbers stay readable on a light panel
const CT_LIGHT = {
  margin:  { bg: 'rgba(230,120,150,0.22)', text: '#96304b' },
  border:  { bg: 'rgba(240,160,185,0.32)', text: '#a13a58' },
  padding: { bg: 'rgba(120,155,210,0.26)', text: '#2f5285' },
  content: { bg: 'rgba(95,130,195,0.30)', text: '#24406b' },
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
          padding: '8px 12px', cursor: 'pointer', userSelect: 'none',
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.5px', color: 'var(--delab-accent, #5e6ad2)',
        }}
      >
        <span>Box Model</span>
        <span style={{ fontSize: 14, lineHeight: 1 }}>{collapsed ? '+' : '\u2212'}</span>
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
          border: '1px solid var(--delab-accent, #5e6ad2)',
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
