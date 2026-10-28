// DeLab Element Info - React component

import { MONO } from '../theme-context';

interface ElementInfoProps {
  tagName: string;
  id: string;
  classes: string;
  visible: boolean;
}

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function ElementInfo({ tagName, id, classes, visible }: ElementInfoProps) {
  if (!visible) return null;

  const clsList = classes.trim().split(/\s+/).filter(Boolean);

  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
      fontFamily: MONO,
      fontSize: 11,
      lineHeight: 1.6,
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4,
    }}>
      {tagName && (
        <span style={{
          display: 'inline-block',
          background: 'var(--delab-accent-soft, rgba(50,240,140,0.14))',
          color: 'var(--delab-accent, #32f08c)',
          padding: '2px 6px',
          borderRadius: 4,
          fontWeight: 600,
          marginRight: 2,
        }}>
          {tagName}
        </span>
      )}
      {id && <span style={{ color: 'var(--delab-text, #141416)', fontWeight: 600, wordBreak: 'break-all' }} dangerouslySetInnerHTML={{ __html: `#${esc(id)}` }} />}
      {clsList.map(cls => (
        <span key={cls} style={{ color: 'var(--delab-text-secondary, #57575e)', wordBreak: 'break-all' }} dangerouslySetInnerHTML={{ __html: `.${esc(cls)}` }} />
      ))}
    </div>
  );
}
