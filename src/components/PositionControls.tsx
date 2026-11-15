// DeLab Position Controls — 参考 Trae CSS 检查器的位置栏
// 标签与单位都放在输入框内部，一行并排 X / Y / Z

import { useState } from 'react';
import { fieldShell, fieldInput, fieldAffix, splitUnit, formatNumber } from './field-base';
import { FieldGlyph, FieldIconName } from './Icon';

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
        <NumField label="X" icon="x" value={x} hint={xHint} unit="px" onCommit={v => setOffset('left', v)} />
        <NumField label="Y" icon="y" value={y} hint={yHint} unit="px" onCommit={v => setOffset('top', v)} />
        <NumField label="Z" icon="z" value={z} unit="" onCommit={v => onCommit('z-index', v)} />
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
            <path d="M6 24C5.99624 28.1221 7.40741 32.1206 9.99765 35.3272C12.5879 38.5338 16.2002 40.7542 20.231 41.6173C24.2617 42.4805 28.4665 41.934 32.1428 40.0693C35.819 38.2045 38.7438 35.1345 40.4283 31.3723C42.1129 27.6102 42.4551 23.3838 41.3978 19.3996C40.3406 15.4154 37.9478 11.9147 34.6196 9.4828C31.2913 7.05086 27.2292 5.83494 23.1121 6.03828C18.995 6.24162 15.0724 7.85189 12 10.6" />
            <path d="M6 8V18H16" />
          </IconButton>
          <IconButton label="水平翻转" active={flipX} onClick={() => setTransform({ flipX: !flipX })}>
            <path d="M24 6V42" />
            <path d="M42 32.4127L42 15.5873C42 14.5657 40.8048 14.0113 40.0249 14.6713L30.0826 23.0839C29.5161 23.5633 29.5161 24.4367 30.0826 24.9161L40.0249 33.3287C40.8048 33.9887 42 33.4343 42 32.4127Z" />
            <path d="M6 32.4127L6 15.5873C6 14.5657 7.19523 14.0113 7.97513 14.6713L17.9174 23.0839C18.4839 23.5633 18.4839 24.4367 17.9174 24.9161L7.97513 33.3287C7.19523 33.9887 6 33.4343 6 32.4127Z" />
          </IconButton>
          <IconButton label="垂直翻转" active={flipY} onClick={() => setTransform({ flipY: !flipY })}>
            <path d="M42.5 24H6.5" />
            <path d="M16.0873 42L32.9127 42C33.9343 42 34.4887 40.8048 33.8287 40.0249L25.4161 30.0826C24.9367 29.5161 24.0633 29.5161 23.5839 30.0826L15.1713 40.0249C14.5113 40.8048 15.0657 42 16.0873 42Z" />
            <path d="M16.0873 6L32.9127 6C33.9343 6 34.4887 7.19523 33.8287 7.97513L25.4161 17.9174C24.9367 18.4839 24.0633 18.4839 23.5839 17.9174L15.1713 7.97513C14.5113 7.19523 15.0657 6 16.0873 6Z" />
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
  const shown = formatNumber(isAuto && hint ? hint : parts.number);
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
        {icon ? <FieldGlyph name={icon} title={label} /> : label}
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
      <svg width="13" height="13" viewBox="0 0 48 48" fill="none" stroke="currentColor"
        strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
