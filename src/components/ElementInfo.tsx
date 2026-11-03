// DeLab Element Info - React component

import { MONO } from '../theme-context';

interface ElementInfoProps {
  tagName: string;
  id: string;
  classes: string;
  visible: boolean;
  /** 当前样式面板视图：设计面板 / 原始 CSS 列表 */
  view: PanelView;
  onViewChange: (view: PanelView) => void;
}

export type PanelView = 'design' | 'css';

export function ElementInfo({ tagName, id, classes, visible, view, onViewChange }: ElementInfoProps) {
  if (!visible) return null;

  const clsList = classes.trim().split(/\s+/).filter(Boolean);
  // 悬浮时用 title 展示完整标识，行内只保留一行
  const fullText = `${tagName}${id ? `#${id}` : ''}${clsList.map(cls => `.${cls}`).join('')}`;

  return (
    <div
      title={fullText}
      style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
        fontFamily: MONO,
        fontSize: 11,
        lineHeight: 1.6,
        display: 'flex', alignItems: 'center', gap: 4,
        whiteSpace: 'nowrap', overflow: 'hidden',
      }}
    >
      {tagName && (
        <span style={{
          display: 'inline-block',
          flexShrink: 0,
          background: 'var(--delab-accent-soft, rgba(50,240,140,0.14))',
          color: 'var(--delab-accent, #32f08c)',
          padding: '2px 6px',
          borderRadius: 4,
          fontWeight: 600,
        }}>
          {tagName}
        </span>
      )}
      {/* id 与类名作为一整段，只在末尾省略，前面的标识保持完整 */}
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {id && <span style={{ color: 'var(--delab-text, #141416)', fontWeight: 600 }}>#{id}</span>}
        {id && clsList.length > 0 && ' '}
        {clsList.length > 0 && (
          <span style={{ color: 'var(--delab-text-secondary, #57575e)' }}>
            {clsList.map(cls => `.${cls}`).join(' ')}
          </span>
        )}
      </span>
      <ViewToggle view={view} onChange={onViewChange} />
    </div>
  );
}

/** 设计 / CSS 视图切换：元素标识行右侧的小分段按钮 */
function ViewToggle({ view, onChange }: { view: PanelView; onChange: (view: PanelView) => void }) {
  const items: Array<{ value: PanelView; label: string; title: string }> = [
    { value: 'design', label: '设计', title: '设计面板' },
    { value: 'css', label: 'CSS', title: 'CSS 属性列表' },
  ];

  return (
    <div style={{
      marginLeft: 'auto', flexShrink: 0,
      display: 'flex', gap: 2, padding: 2, borderRadius: 6,
      background: 'var(--delab-sel, rgba(0, 0, 0, 0.07))',
    }}>
      {items.map(item => {
        const active = view === item.value;
        return (
          <button
            key={item.value}
            type="button"
            title={item.title}
            aria-label={item.title}
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            style={{
              height: 18, padding: '0 6px',
              display: 'flex', alignItems: 'center',
              border: 'none', borderRadius: 4, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 10,
              fontWeight: active ? 600 : 400,
              background: active ? 'var(--delab-btn-bg, #141416)' : 'transparent',
              color: active ? 'var(--delab-btn-text, #ffffff)' : 'var(--delab-text-secondary, #57575e)',
              transition: 'background 0.12s ease, color 0.12s ease',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
