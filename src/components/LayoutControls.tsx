// DeLab Layout Controls — 对齐 Figma 自动布局的方向分段、宽高尺寸与对齐九宫格

import { useEffect, useRef, useState } from 'react';
import { MONO } from '../theme-context';
import { SizeMode } from '../style-extractor';

interface LayoutControlsProps {
  display: string;
  direction: string;
  /** flex-wrap 当前值，用于换行开关 */
  wrap: string;
  justify: string;
  align: string;
  /** flex / grid 的间距，两端 / 环绕 / 均分时显示 auto */
  gap: string;
  width: string;
  height: string;
  widthMode: SizeMode;
  heightMode: SizeMode;
  widthParent: 'row' | 'column' | 'block';
  heightParent: 'row' | 'column' | 'block';
  onCommit: (prop: string, value: string) => boolean;
}

/** display 由分组标题右侧的选择器负责，这里只保留 flex / grid 的布局控件 */
const DIRECTIONS: Array<{ value: string; path: string; label: string }> = [
  { value: 'row', path: 'M5 12h14M13 6l6 6-6 6', label: '横向排列' },
  { value: 'column', path: 'M12 5v14M6 13l6 6 6-6', label: '纵向排列' },
];

/** 主轴分布类值：这些值下 gap 由浏览器自动撑开，输入框显示 auto */
const DISTRIBUTIONS = ['space-between', 'space-around', 'space-evenly'];

const JUSTIFY_VALUES = ['flex-start', 'center', 'flex-end'];
const ALIGN_VALUES = ['flex-start', 'center', 'flex-end'];

/** 归一 CSS 计算值到九宫格的列（0 左 / 1 中 / 2 右），分布类返回 -1 */
function colIndex(justify: string): number {
  const v = justify.trim();
  if (/^(flex-start|start|left|normal)$/.test(v)) return 0;
  if (v === 'center') return 1;
  if (/^(flex-end|end|right)$/.test(v)) return 2;
  return -1;
}

/** 归一交叉轴对齐到九宫格的行（0 上 / 1 中 / 2 下），stretch / baseline 返回 -1 */
function rowIndex(align: string): number {
  const v = align.trim();
  if (/^(flex-start|start)$/.test(v)) return 0;
  if (v === 'center') return 1;
  if (/^(flex-end|end)$/.test(v)) return 2;
  return -1;
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 4,
  fontSize: 10, lineHeight: '14px',
  color: 'var(--delab-text-tertiary, #8a8a90)',
};

export function LayoutControls({
  display, direction, wrap, justify, align, gap,
  width, height, widthMode, heightMode, widthParent, heightParent, onCommit,
}: LayoutControlsProps) {
  const isFlex = /inline-flex|^flex$/.test(display.trim());
  const isGrid = /inline-grid|^grid$/.test(display.trim());
  const managed = isFlex || isGrid;
  const wrapped = wrap.trim().startsWith('wrap');

  const col = colIndex(justify);
  const row = rowIndex(align);
  const autoGap = DISTRIBUTIONS.includes(justify.trim());
  // 未设置间距时 computed 值是 normal，按 0 展示
  const gapValue = gap.trim() === 'normal' || !gap.trim() ? '0' : gap.trim();

  const setDirection = (value: string) => {
    // 方向只对 flex 生效，顺带把 display 切到 flex
    if (!isFlex) onCommit('display', display.startsWith('inline') ? 'inline-flex' : 'flex');
    onCommit('flex-direction', value);
  };

  const setCell = (r: number, c: number) => {
    onCommit('justify-content', JUSTIFY_VALUES[c]);
    onCommit('align-items', ALIGN_VALUES[r]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* 方向 + 换行：仅 flex 系列 */}
      {isFlex && (
        <div>
          <span style={labelStyle}>direction</span>
          <div style={{
            display: 'flex', gap: 2, padding: 2, borderRadius: 8,
            background: 'var(--delab-sel, rgba(0, 0, 0, 0.07))',
          }}>
            {DIRECTIONS.map(item => {
              const active = direction.trim() === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  onClick={() => setDirection(item.value)}
                  style={{
                    flex: 1, height: 24, padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', borderRadius: 6, cursor: 'pointer',
                    background: active ? 'var(--delab-btn-bg, #141416)' : 'transparent',
                    color: active ? 'var(--delab-btn-text, #ffffff)' : 'var(--delab-text-secondary, #57575e)',
                    transition: 'background 0.12s ease, color 0.12s ease',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={item.path} />
                  </svg>
                </button>
              );
            })}
            {/* 换行开关，对应 Figma 自动布局的方向选项里的「换行」 */}
            <button
              type="button"
              title={wrapped ? '取消换行' : '换行'}
              aria-label={wrapped ? '取消换行' : '换行'}
              onClick={() => onCommit('flex-wrap', wrapped ? 'nowrap' : 'wrap')}
              style={{
                flex: 1, height: 24, padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', borderRadius: 6, cursor: 'pointer',
                background: wrapped ? 'var(--delab-btn-bg, #141416)' : 'transparent',
                color: wrapped ? 'var(--delab-btn-text, #ffffff)' : 'var(--delab-text-secondary, #57575e)',
                transition: 'background 0.12s ease, color 0.12s ease',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 5h18" />
                <path d="M3 12h11a3.5 3.5 0 0 1 0 7H9" />
                <path d="m12 16-3 3 3 3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 宽高：数值输入 + 右侧尺寸模式（固定 / 适应 / 填充） */}
      <div style={{ display: 'flex', gap: 8 }}>
        <SizeRow axis="width" parent={widthParent} value={width} mode={widthMode} onCommit={onCommit} />
        <SizeRow axis="height" parent={heightParent} value={height} mode={heightMode} onCommit={onCommit} />
      </div>

      {/* 对齐：flex / grid 容器才有意义 */}
      {managed && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <span style={labelStyle}>alignment</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 22px)', gap: 2 }}>
              {[0, 1, 2].map(r => [0, 1, 2].map(c => {
                const strong = col === c && row === r;
                // 交叉轴对齐是 stretch / baseline 时无法落格，先弱高亮主轴所在列
                const weak = !strong && row === -1 && col === c;
                const active = strong || weak;
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    title={`${['上', '居中', '下'][r]}${['左', '中', '右'][c]}`}
                    aria-label={`${['上', '居中', '下'][r]}${['左', '中', '右'][c]}`}
                    onClick={() => setCell(r, c)}
                    style={{
                      width: 22, height: 22, padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 4, cursor: 'pointer',
                      border: `1px solid ${active ? 'var(--delab-accent, #32f08c)' : 'var(--delab-border, rgba(0,0,0,0.08))'}`,
                      background: active
                        ? `var(--delab-accent-soft, rgba(50,240,140,0.14))`
                        : 'transparent',
                      opacity: strong || !weak ? 1 : 0.55,
                      transition: 'background 0.12s ease, border-color 0.12s ease',
                    }}
                  >
                    <span style={{
                      width: 4, height: 4, borderRadius: 999,
                      background: active ? 'var(--delab-accent, #32f08c)' : 'var(--delab-text-tertiary, #8a8a90)',
                    }} />
                  </button>
                );
              }))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <GapField gap={gapValue} auto={autoGap} onCommit={onCommit} />
            {/* 没有落在九宫格上的值（stretch / baseline / 自定义）直接显示出来 */}
            {col === -1 && !autoGap && (
              <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 10, color: 'var(--delab-text-tertiary, #8a8a90)' }}>
                justify: {justify}
              </div>
            )}
            {row === -1 && (
              <div style={{ marginTop: 2, fontFamily: MONO, fontSize: 10, color: 'var(--delab-text-tertiary, #8a8a90)' }}>
                align: {align}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** gap 输入框：取值为两端 / 环绕 / 均分时显示 auto，可切回固定间距或直接输入数值 */
function GapField({ gap, auto, onCommit }: {
  gap: string;
  auto: boolean;
  onCommit: (prop: string, value: string) => boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? (auto ? 'auto' : gap);

  const commit = (raw: string) => {
    setDraft(null);
    const v = raw.trim();
    if (!v) return;
    if (v.toLowerCase() === 'auto') {
      onCommit('justify-content', 'space-between');
      return;
    }
    onCommit('gap', /^-?\d+(?:\.\d+)?$/.test(v) ? `${v}px` : v);
    // 手动填了间距就退出自动分布，否则两者会叠加
    if (auto) onCommit('justify-content', 'flex-start');
  };

  return (
    <>
      <span style={labelStyle}>gap</span>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2, padding: 2, borderRadius: 8,
        background: 'var(--delab-sel, rgba(0, 0, 0, 0.07))',
      }}>
        <input
          value={value}
          placeholder="0"
          spellCheck={false}
          onChange={e => setDraft(e.target.value)}
          onFocus={e => e.target.select()}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Enter') { commit(e.currentTarget.value); e.currentTarget.blur(); }
            else if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); }
          }}
          style={{
            flex: 1, minWidth: 0, height: 24, padding: '0 6px',
            border: 'none', borderRadius: 6,
            background: 'var(--delab-field-bg, #ffffff)',
            fontFamily: MONO, fontSize: 11,
            color: 'var(--delab-text, #141416)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          title={auto ? '改为固定间距' : '自动撑开（space-between）'}
          onClick={() => {
            setDraft(null);
            onCommit('justify-content', auto ? 'flex-start' : 'space-between');
          }}
          style={{
            flex: 'none', height: 24, padding: '0 8px',
            border: 'none', borderRadius: 6, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 10, fontWeight: 500,
            background: auto ? 'var(--delab-btn-bg, #141416)' : 'transparent',
            color: auto ? 'var(--delab-btn-text, #ffffff)' : 'var(--delab-text-secondary, #57575e)',
            transition: 'background 0.12s ease, color 0.12s ease',
          }}
        >
          Auto
        </button>
      </div>
    </>
  );
}

const SIZE_LABEL: Record<'width' | 'height', string> = { width: '宽', height: '高' };
const SIZE_MODE_TEXT: Record<SizeMode, string> = { fixed: '固定', hug: '适应', fill: '填充' };

/**
 * 宽 / 高输入：数值 + 右侧尺寸模式（对应 Figma 的 Fixed / Hug / Fill）
 * 模式菜单挂在按钮下方，用 fixed 定位避免被面板滚动区裁掉
 */
function SizeRow({ axis, parent, value, mode, onCommit }: {
  axis: 'width' | 'height';
  /** 父级布局方向，决定 Fill 走 flex 还是百分比 */
  parent: 'row' | 'column' | 'block';
  value: string;
  mode: SizeMode;
  onCommit: (prop: string, value: string) => boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ left: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const current = value.trim();
  const number = current.replace(/px$/, '');
  const flexProp = axis === 'width' ? 'flex' : 'align-self';
  const flexReset = axis === 'width' ? '0 1 auto' : 'auto';

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  // 固定 → 写具体像素；适应 → fit-content；填充 → 父级是 flex 主轴用 flex，其余用百分比
  const setMode = (next: SizeMode) => {
    setMenu(null);
    if (next === 'hug') {
      onCommit(axis, 'fit-content');
      onCommit(flexProp, flexReset);
      return;
    }
    if (next === 'fill') {
      const mainAxis = axis === 'width' ? parent === 'row' : parent === 'column';
      if (mainAxis) {
        // 主轴撑满：先清掉固定尺寸，再交给 flex-grow
        onCommit(axis, 'auto');
        onCommit('flex', '1 1 0');
      } else if (axis === 'width') {
        onCommit('width', '100%');
        onCommit('flex', flexReset);
      } else {
        onCommit('height', '100%');
        onCommit('align-self', parent === 'row' ? 'stretch' : 'auto');
      }
      return;
    }
    const n = parseFloat(current);
    onCommit(axis, Number.isFinite(n) ? `${Math.round(n)}px` : current);
    onCommit(flexProp, flexReset);
  };

  const commit = (raw: string) => {
    setDraft(null);
    const v = raw.trim();
    if (!v) return;
    onCommit(axis, /^-?\d*\.?\d+$/.test(v) ? `${v}px` : v);
    // 手填数值即视为固定尺寸，顺手清掉撑满设置
    if (mode !== 'fixed') onCommit(flexProp, flexReset);
  };

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setMenu({ left: Math.max(8, r.right - 168), top: r.bottom + 4 });
  };

  const items: Array<{ value: SizeMode; text: string }> = [
    { value: 'fixed', text: `${axis === 'width' ? '固定宽度' : '固定高度'}（${number}）` },
    { value: 'hug', text: '适应内容' },
    { value: 'fill', text: '填充容器' },
  ];

  return (
    <div style={{
      flex: 1, minWidth: 0,
      display: 'flex', alignItems: 'center', gap: 2,
      height: 28, padding: '0 4px 0 6px', boxSizing: 'border-box',
      borderRadius: 6,
      background: 'var(--delab-field-bg, #ffffff)',
      border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
    }}>
      <span style={{
        flexShrink: 0, fontSize: 10, lineHeight: 1,
        color: 'var(--delab-text-tertiary, #8a8a90)',
      }}>
        {SIZE_LABEL[axis]}
      </span>
      <input
        value={draft ?? number}
        spellCheck={false}
        onChange={e => setDraft(e.target.value)}
        onFocus={e => e.target.select()}
        onBlur={e => commit(e.target.value)}
        onKeyDown={e => {
          e.stopPropagation();
          if (e.key === 'Enter') { commit(e.currentTarget.value); e.currentTarget.blur(); }
          else if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); }
        }}
        style={{
          flex: 1, minWidth: 0, height: 24, padding: '0 2px',
          border: 'none', background: 'transparent',
          fontFamily: MONO, fontSize: 11,
          color: 'var(--delab-text, #141416)',
          outline: 'none',
        }}
      />
      <button
        ref={btnRef}
        type="button"
        title="尺寸模式"
        onClick={() => (menu ? setMenu(null) : openMenu())}
        style={{
          flexShrink: 0, height: 22, padding: '0 4px',
          display: 'flex', alignItems: 'center', gap: 2,
          border: 'none', borderRadius: 4, background: 'transparent', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 10,
          color: 'var(--delab-text-secondary, #57575e)',
        }}
      >
        {SIZE_MODE_TEXT[mode]}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {menu && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'fixed', left: menu.left, top: menu.top, width: 168,
            padding: 4, borderRadius: 8, zIndex: 30,
            background: 'var(--delab-field-bg, #ffffff)',
            boxShadow: 'var(--delab-shadow, 0 8px 24px rgba(0,0,0,0.18))',
            border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
          }}
        >
          {items.map(item => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              style={{
                display: 'block', width: '100%', height: 26, padding: '0 8px',
                border: 'none', borderRadius: 5, cursor: 'pointer', textAlign: 'left',
                fontFamily: 'inherit', fontSize: 11,
                background: mode === item.value
                  ? 'var(--delab-row-hover, rgba(0,0,0,0.06))'
                  : 'transparent',
                color: 'var(--delab-text, #141416)',
              }}
            >
              {item.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
