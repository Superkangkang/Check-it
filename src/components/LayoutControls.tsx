// DeLab Layout Controls — 对齐 Figma 自动布局的方向分段与对齐九宫格

import { MONO } from '../theme-context';

interface LayoutControlsProps {
  display: string;
  direction: string;
  /** flex-wrap 当前值，用于换行开关 */
  wrap: string;
  justify: string;
  align: string;
  onCommit: (prop: string, value: string) => boolean;
}

/** display 可选项（与 property-controls 保持一致） */
const DISPLAY_OPTIONS = [
  'block', 'flex', 'grid', 'inline', 'inline-block', 'inline-flex', 'inline-grid', 'none',
];

const DIRECTIONS: Array<{ value: string; path: string; label: string }> = [
  { value: 'row', path: 'M5 12h14M13 6l6 6-6 6', label: '横向排列' },
  { value: 'column', path: 'M12 5v14M6 13l6 6 6-6', label: '纵向排列' },
  { value: 'row-reverse', path: 'M19 12H5M11 18l-6-6 6-6', label: '横向反序' },
  { value: 'column-reverse', path: 'M12 19V5M18 11l-6-6-6 6', label: '纵向反序' },
];

const DISTRIBUTIONS = ['space-between', 'space-around', 'space-evenly'] as const;
const DISTRIBUTION_LABEL: Record<string, string> = {
  'space-between': '两端',
  'space-around': '环绕',
  'space-evenly': '均分',
};

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
  display, direction, wrap, justify, align, onCommit,
}: LayoutControlsProps) {
  const isFlex = /inline-flex|^flex$/.test(display.trim());
  const isGrid = /inline-grid|^grid$/.test(display.trim());
  const managed = isFlex || isGrid;
  const wrapped = wrap.trim().startsWith('wrap');

  const col = colIndex(justify);
  const row = rowIndex(align);
  const activeDistribution = DISTRIBUTIONS.find(d => justify.trim() === d) ?? null;

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
      {/* display */}
      <div>
        <span style={labelStyle}>display</span>
        <select
          value={DISPLAY_OPTIONS.includes(display.trim()) ? display.trim() : ''}
          onChange={e => onCommit('display', e.target.value)}
          style={{
            width: '100%', height: 28, padding: '0 8px', boxSizing: 'border-box',
            fontFamily: MONO, fontSize: 11,
            border: '1px solid transparent', borderRadius: 6,
            background: 'var(--delab-field-bg, #ffffff)',
            color: 'var(--delab-text, #141416)',
            appearance: 'none', cursor: 'pointer', outline: 'none',
          }}
        >
          {!DISPLAY_OPTIONS.includes(display.trim()) && (
            <option value="">{display}</option>
          )}
          {DISPLAY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>

      {/* 方向：仅 flex 系列 */}
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
                flex: 'none', width: 28, height: 24, padding: 0,
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
            <span style={labelStyle}>distribution</span>
            <div style={{
              display: 'flex', gap: 2, padding: 2, borderRadius: 8,
              background: 'var(--delab-sel, rgba(0, 0, 0, 0.07))',
            }}>
              {DISTRIBUTIONS.map(value => {
                const active = activeDistribution === value;
                return (
                  <button
                    key={value}
                    type="button"
                    title={value}
                    onClick={() => onCommit('justify-content', value)}
                    style={{
                      flex: 1, height: 24, padding: 0,
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                      fontSize: 10, fontWeight: 500,
                      background: active ? 'var(--delab-btn-bg, #141416)' : 'transparent',
                      color: active ? 'var(--delab-btn-text, #ffffff)' : 'var(--delab-text-secondary, #57575e)',
                      transition: 'background 0.12s ease, color 0.12s ease',
                    }}
                  >
                    {DISTRIBUTION_LABEL[value]}
                  </button>
                );
              })}
            </div>
            {/* 没有落在九宫格或分布上的值（stretch / baseline / 自定义）直接显示出来 */}
            {col === -1 && !activeDistribution && (
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
