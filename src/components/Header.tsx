// DeLab Header — shared header bar for both panel modes

import { useTheme } from '../theme-context';
import { SunIcon, MoonIcon, CloseIcon } from './Icon';

interface HeaderProps {
  onClose: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
  /** Number of edited properties on the current element */
  modifiedCount?: number;
  onResetAll?: () => void;
}

const iconBtn: React.CSSProperties = {
  appearance: 'none',
  background: 'transparent',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  padding: 5,
  color: 'var(--delab-text-secondary, #57575e)',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.12s ease, color 0.12s ease',
};

/** 面板 header 的品牌图：扩展环境走 runtime URL，预览页回落到相对路径 */
function logoUrl(): string {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      return chrome.runtime.getURL('icons/logo-128.png');
    }
  } catch { /* ignore */ }
  return 'icons/logo-128.png';
}

export function Header({ onClose, onDragStart, modifiedCount = 0, onResetAll }: HeaderProps) {
  const { isDark, toggle } = useTheme();

  return (
    <div
      onMouseDown={onDragStart}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderBottom: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
        flexShrink: 0, userSelect: 'none',
        cursor: onDragStart ? 'grab' : 'default',
      }}
    >
      {/* Brand：logo + 字标 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
        <img
          src={logoUrl()}
          alt=""
          width={20}
          height={20}
          style={{ display: 'block', width: 20, height: 20, borderRadius: 5 }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--delab-text, #141416)' }}>
          Inspect Lab
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {modifiedCount > 0 && onResetAll && (
          <button
            onClick={onResetAll}
            title="Revert all edits on this element"
            style={{
              ...iconBtn, gap: 4, padding: '4px 8px', fontSize: 11,
              color: 'var(--delab-accent, #32f08c)',
            }}
          >
            Reset {modifiedCount}
          </button>
        )}
        <button onClick={toggle} title="Toggle theme" style={iconBtn}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--delab-row-hover, rgba(0,0,0,0.045))'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          {isDark ? <SunIcon size={15} /> : <MoonIcon size={15} />}
        </button>
        <button onClick={onClose} title="Close" style={iconBtn}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--delab-row-hover, rgba(0,0,0,0.045))'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <CloseIcon size={15} />
        </button>
      </div>
    </div>
  );
}
