// DeLab Position Controls — 参考 Trae CSS 检查器的位置栏
// 标签与单位都放在输入框内部，一行并排 X / Y / Z

import { useState } from 'react';
import { fieldShell, fieldInput, fieldAffix, splitUnit } from './field-base';
import { FieldIcon, FieldIconName } from './Icon';

interface PositionControlsProps {
  /** 当前 position，用于判断输入 X/Y 时是否需要补 relative */
  position: string;
  x: string;
  y: string;
  z: string;
  transform: string;
  /** left / top 为 auto 时的实际坐标提示 */
  xHint?: string;
  yHint?: string;
  onCommit: (prop: string, value: string) => boolean;
}

/** 从 computed / inline transform 里解出旋转角度与翻转 */
function parseTransform(value: string): { rotate: number; flipX: boolean; flipY: boolean } {
  if (!value || value === 'none') return { rotate: 0, flipX: false, flipY: false };

  // 优先按可读的 rotate / scaleX / scaleY 写法解析（可能是只有翻转、没有旋转）
  const flipX = /scaleX\(\s*-1/.test(value);
  const flipY = /scaleY\(\s*-1\)/.test(value);
  const rotate = value.match(/rotate\(\s*(-?[\d.]+)deg/);
  if (rotate || flipX || flipY) {
    return { rotate: rotate ? parseFloat(rotate[1]) || 0 : 0, flipX, flipY };
  }

  // 计算值可能是 matrix(a, b, c, d, e, f)：用 atan2 反解角度，负值判断翻转
  const matrix = value.match(/matrix\(\s*([^)]+)\)/);
  if (matrix) {
    const [a, b, , d] = matrix[1].split(',').map(Number);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return {
        rotate: Math.round((Math.atan2(b, a) * 180) / Math.PI),
        flipX: a < 0,
        flipY: d < 0,
      };
    }
  }
  return { rotate: 0, flipX: false, flipY: false };
}

/** 拼回 transform 字符串，全部为默认值时写 none */
function buildTransform(rotate: number, flipX: boolean, flipY: boolean): string {
  const parts: string[] = [];
  if (rotate) parts.push(`rotate(${rotate}deg)`);
  if (flipX) parts.push('scaleX(-1)');
  if (flipY) parts.push('scaleY(-1)');
  return parts.length ? parts.join(' ') : 'none';
}

export function PositionControls({
  position, x, y, z, transform, xHint, yHint, onCommit,
}: PositionControlsProps) {
  const { rotate, flipX, flipY } = parseTransform(transform);

  // 输入 X / Y 时 static 元素的 left / top 不生效，先补 relative
  const setOffset = (prop: 'left' | 'top', value: string) => {
    if (position.trim() === 'static') onCommit('position', 'relative');
    onCommit(prop, value);
  };

  const setTransform = (next: { rotate?: number; flipX?: boolean; flipY?: boolean }) => {
    onCommit('transform', buildTransform(
      next.rotate ?? rotate,
      next.flipX ?? flipX,
      next.flipY ?? flipY
    ));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NumField label="X" value={x} hint={xHint} unit="px" onCommit={v => setOffset('left', v)} />
        <NumField label="Y" value={y} hint={yHint} unit="px" onCommit={v => setOffset('top', v)} />
        <NumField label="Z" value={z} unit="" onCommit={v => onCommit('z-index', v)} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NumField
          flex={2}
          label="旋转"
          icon="rotate"
          value={String(rotate)}
          unit="deg"
          onCommit={v => {
            const n = parseFloat(v);
            setTransform({ rotate: Number.isFinite(n) ? n : 0 });
          }}
        />
        {/* 三个变换按钮共享剩余 1/3 宽度，整体拉宽与上行字段底边对齐 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconButton label="重置旋转" active={rotate !== 0} onClick={() => setTransform({ rotate: 0 })}>
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </IconButton>
          <IconButton label="水平翻转" active={flipX} onClick={() => setTransform({ flipX: !flipX })}>
            <path d="M12 3v18" />
            <path d="M8 8 4 12l4 4" />
            <path d="m16 8 4 4-4 4" />
          </IconButton>
          <IconButton label="垂直翻转" active={flipY} onClick={() => setTransform({ flipY: !flipY })}>
            <path d="M3 12h18" />
            <path d="m8 8 4-4 4 4" />
            <path d="m8 16 4 4 4-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

/** 数值输入：标签与单位都内嵌在框内；值为 auto 时展示实际坐标提示，且不改页面 */
function NumField({ label, icon, value, hint, unit, flex, onCommit }: {
  label: string;
  /** 用图标代替框内文案（如旋转），label 仍作为 title */
  icon?: FieldIconName;
  value: string;
  hint?: string;
  unit: string;
  /** 可选 flex 占比（旋转行让字段占 2/3 用） */
  flex?: number;
  onCommit: (value: string) => void;
}) {
  const isAuto = value.trim() === 'auto';
  const parts = splitUnit(isAuto ? '' : value);
  // auto 且有实际坐标时用它当显示值（浅灰），只作参考
  const shown = isAuto && hint ? hint : parts.number;
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [hover, setHover] = useState(false);

  // auto 且没有坐标可显示时不带单位
  const suffix = isAuto && !hint ? '' : (unit || parts.unit);

  const commit = () => {
    // 没真正编辑过就不写，避免把 auto 变成具体值
    if (draft === null) { return; }
    const v = draft.trim();
    setDraft(null);
    if (!v) { onCommit('auto'); return; }
    onCommit(/^-?\d*\.?\d+$/.test(v) ? `${v}${unit}` : v);
  };

  return (
    <div
      style={{ ...fieldShell({ focused, hover }), ...(flex !== undefined ? { flex } : {}) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span style={fieldAffix} title={label}>
        {icon ? <FieldIcon name={icon} /> : label}
      </span>
      <input
        value={draft ?? shown}
        placeholder={isAuto ? 'auto' : '0'}
        spellCheck={false}
        onChange={e => setDraft(e.target.value)}
        onFocus={e => { setFocused(true); e.target.select(); }}
        onBlur={() => { setFocused(false); commit(); }}
        onKeyDown={e => {
          e.stopPropagation();
          if (e.key === 'Enter') { commit(); e.currentTarget.blur(); }
          else if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); }
        }}
        style={{
          ...fieldInput,
          // auto 的提示值用次级色，和真实设置值区分
          color: isAuto && draft === null
            ? 'var(--delab-text-tertiary, #8a8a90)'
            : 'var(--delab-text, #141416)',
        }}
      />
      {suffix && <span style={fieldAffix}>{suffix}</span>}
    </div>
  );
}

/** 方形图标按钮，激活态用品牌绿 */
function IconButton({ label, active, onClick, children }: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{
        flex: 1, minWidth: 0, height: 28, padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, cursor: 'pointer',
        border: `1px solid ${active ? 'var(--delab-accent, #32f08c)' : 'var(--delab-border, rgba(0,0,0,0.08))'}`,
        background: active
          ? 'var(--delab-accent-soft, rgba(50,240,140,0.14))'
          : 'var(--delab-field-bg, #ffffff)',
        color: active
          ? 'var(--delab-accent, #32f08c)'
          : 'var(--delab-text-secondary, #57575e)',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
