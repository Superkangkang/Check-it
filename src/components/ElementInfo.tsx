// DeLab Element Info - React component

import { MONO } from '../theme-context';

interface ElementInfoProps {
  tagName: string;
  id: string;
  classes: string;
  visible: boolean;
}

export function ElementInfo({ tagName, id, classes, visible }: ElementInfoProps) {
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
    </div>
  );
}
