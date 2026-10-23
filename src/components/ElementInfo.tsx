// DeLab Element Info - React component

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

const tagStyle: React.CSSProperties = {
  display: 'inline-block',
  border: '1px solid var(--delab-accent, #5e6ad2)',
  color: 'var(--delab-accent, #5e6ad2)',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 13,
  fontWeight: 600,
  marginRight: 8,
};

const idStyle: React.CSSProperties = {
  display: 'inline',
  color: 'var(--delab-accent, #5e6ad2)',
  fontSize: 13,
  fontWeight: 600,
  marginRight: 8,
  wordBreak: 'break-all',
};

const clsStyle: React.CSSProperties = {
  display: 'inline',
  color: 'var(--delab-text-secondary, #888)',
  fontSize: 13,
  marginRight: 4,
  wordBreak: 'break-all',
};

export function ElementInfo({ tagName, id, classes, visible }: ElementInfoProps) {
  if (!visible) return null;

  const clsList = classes.trim().split(/\s+/).filter(Boolean);

  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px solid var(--delab-border, #e8e8e8)',
      lineHeight: 1.5,
    }}>
      <span style={tagName ? tagStyle : undefined}>{tagName}</span>
      {id && <span style={idStyle} dangerouslySetInnerHTML={{ __html: `#${esc(id)}` }} />}
      {clsList.map(cls => (
        <span key={cls} style={clsStyle} dangerouslySetInnerHTML={{ __html: `.${esc(cls)}` }} />
      ))}
    </div>
  );
}
