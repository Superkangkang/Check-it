// DeLab Header — shared header bar for both panel modes

import { useTheme } from '../theme-context';
import { SunIcon, MoonIcon, CloseIcon } from './Icon';

interface HeaderProps {
  onClose: () => void;
  showDragHint?: boolean;
  onDragStart?: (e: React.MouseEvent) => void;
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--delab-border, #23252a)',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
  padding: '3px 6px',
  color: 'var(--delab-text, #f7f8f8)',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export function Header({ onClose, showDragHint, onDragStart }: HeaderProps) {
  const { isDark, toggle } = useTheme();

  return (
    <div
      onMouseDown={onDragStart}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid var(--delab-border, #e8e8e8)',
        flexShrink: 0, userSelect: 'none',
        cursor: onDragStart ? 'grab' : 'default',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 26, height: 26, background: 'var(--delab-accent, #5e6ad2)',
          color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 800,
        }}>
          DL
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--delab-text, #1a1a2e)' }}>
          DeLab
        </span>
        {showDragHint && (
          <span style={{ fontSize: 10, color: 'var(--delab-text-secondary, #aaa)', marginLeft: 8 }}>
            drag to move
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={toggle} title="Toggle theme" style={btnStyle}>
          {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>
        <button onClick={onClose} title="Close" style={btnStyle}>
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}
