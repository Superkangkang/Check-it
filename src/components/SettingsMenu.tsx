// DeLab 设置入口 — 右上角齿轮 + 下拉菜单（面板 header / 工作区顶栏共用）

import { useEffect, useRef, useState } from 'react';
import { SANS } from '../theme';
import { CloudUploadIcon, GearIcon } from './Icon';

const MENU_WIDTH = 188;
const MENU_HEIGHT = 62;

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

export function SettingsMenu({ onConfigure }: { onConfigure: () => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /** 贴在按钮下方并夹在视口内；下方放不下时翻到按钮上方 */
  const place = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    let top = rect.bottom + 6;
    if (top + MENU_HEIGHT > window.innerHeight - 8) {
      top = Math.max(8, rect.top - MENU_HEIGHT - 6);
    }
    setPos({ top, left });
  };

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    place();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    // 用 composedPath 判断内部点击：面板在 Shadow DOM 里时 target 会被重定向到宿主
    const onDown = (event: Event) => {
      const path = event.composedPath();
      if (menuRef.current && path.includes(menuRef.current)) return;
      if (btnRef.current && path.includes(btnRef.current)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onReflow = () => setOpen(false);
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title="设置"
        aria-haspopup="menu"
        aria-expanded={open}
        style={iconBtn}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--delab-row-hover, rgba(0,0,0,0.045))'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <GearIcon size={15} />
      </button>

      {open && pos && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: MENU_WIDTH,
            padding: 5,
            zIndex: 2147483647,
            borderRadius: 10,
            background: 'var(--delab-elevated, #ffffff)',
            border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
            boxShadow: 'var(--delab-shadow, 0 12px 32px rgba(0,0,0,0.24))',
            fontFamily: SANS,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onConfigure();
            }}
            style={{
              appearance: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              height: 32,
              padding: '0 8px',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--delab-text, #141416)',
              fontFamily: SANS,
              fontSize: 12,
              textAlign: 'left',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--delab-row-hover, rgba(0,0,0,0.045))'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <CloudUploadIcon size={14} />
            <span>配置企微同步</span>
          </button>
        </div>
      )}
    </>
  );
}
