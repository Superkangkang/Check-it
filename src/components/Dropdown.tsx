// DeLab Dropdown — 统一样式的下拉选择器（触发器 + 浮层菜单）

import { useEffect, useRef, useState } from 'react';
import { fieldShell, fieldInput, fieldAffix } from './field-base';

export interface DropdownItem {
  value: string;
  label: string;
}

interface MenuPanelProps {
  left: number;
  top: number;
  width: number;
  items: DropdownItem[];
  value: string;
  onPick: (value: string) => void;
  menuRef?: React.RefObject<HTMLDivElement>;
}

/** 浮层菜单：宽高尺寸菜单 / 分组标题下拉共用同一套面板样式 */
export function MenuPanel({ left, top, width, items, value, onPick, menuRef }: MenuPanelProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div
      ref={menuRef}
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed', left, top, width,
        padding: 4, borderRadius: 8, zIndex: 30,
        background: 'var(--delab-field-bg, #ffffff)',
        boxShadow: 'var(--delab-shadow, 0 8px 24px rgba(0,0,0,0.18))',
        border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
      }}
    >
      {items.map((item, index) => {
        const selected = item.value === value;
        const active = hovered === index;
        return (
          <button
            key={item.value}
            type="button"
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onPick(item.value)}
            style={{
              display: 'flex', alignItems: 'center',
              width: '100%', height: 26, padding: '0 8px',
              border: 'none', borderRadius: 5, cursor: 'pointer',
              textAlign: 'left', fontFamily: 'inherit', fontSize: 11,
              background: active || selected
                ? 'var(--delab-row-hover, rgba(0,0,0,0.06))'
                : 'transparent',
              color: selected
                ? 'var(--delab-text, #141416)'
                : 'var(--delab-text-secondary, #57575e)',
              transition: 'background 0.1s ease',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

interface DropdownProps {
  value: string;
  items: DropdownItem[];
  onChange: (value: string) => void;
  /** field：和输入框同款外壳（行内枚举）；header：分组标题右侧的小触发器 */
  variant?: 'field' | 'header';
  /** 框内前缀：短文字或图标 */
  prefix?: React.ReactNode;
  title?: string;
  style?: React.CSSProperties;
}

export function Dropdown({
  value, items, onChange, variant = 'field', prefix, title, style,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [menu, setMenu] = useState<{ left: number; top: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.max(r.width, 96);
    setMenu({
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      top: r.bottom + 4,
      width,
    });
    setOpen(true);
  };

  const current = items.find(item => item.value === value);
  const label = current ? current.label : (value || '—');

  const chevron = (
    <svg
      width="8" height="8" viewBox="0 0 8 8" aria-hidden
      style={{ flexShrink: 0, color: 'var(--delab-text-tertiary, #8a8a90)' }}
    >
      <path d="M1 3l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <>
      {variant === 'field' ? (
        <div
          style={{ ...fieldShell({ hover, focused: open }), ...style }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {prefix && <span style={fieldAffix}>{prefix}</span>}
          <button
            ref={btnRef}
            type="button"
            title={title ?? label}
            onClick={toggle}
            style={{
              ...fieldInput,
              display: 'block', cursor: 'pointer',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
          {chevron}
        </div>
      ) : (
        <button
          ref={btnRef}
          type="button"
          title={title ?? label}
          onClick={toggle}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            height: 22, padding: '0 6px', flexShrink: 0,
            fontFamily: 'inherit', fontSize: 10,
            borderRadius: 5, cursor: 'pointer',
            border: `1px solid ${open || hover ? 'var(--delab-border, rgba(0,0,0,0.08))' : 'transparent'}`,
            background: open || hover ? 'var(--delab-field-hover, #f3f3f5)' : 'transparent',
            color: 'var(--delab-text-secondary, #57575e)',
            transition: 'background 0.12s ease, border-color 0.12s ease',
            ...style,
          }}
        >
          {label}
          {chevron}
        </button>
      )}

      {open && menu && (
        <MenuPanel
          menuRef={menuRef}
          left={menu.left}
          top={menu.top}
          width={menu.width}
          items={items}
          value={value}
          onPick={v => { setOpen(false); onChange(v); }}
        />
      )}
    </>
  );
}
