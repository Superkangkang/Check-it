// DeLab Property Field — always-editable value control (Figma-style inspector field)

import { useEffect, useRef, useState } from 'react';
import { normalizeInput } from '../property-controls';
import { toHex } from '../style-extractor';
import { fieldShell, fieldInput, fieldAffix, splitUnit } from './field-base';
import { Dropdown } from './Dropdown';

export interface FieldSpec {
  /** Value currently applied on the page */
  value: string;
  /** CSS property written back to the element */
  cssProp: string;
  control: 'length' | 'number' | 'color' | 'enum' | 'text';
  unit?: string;
  options?: string[];
  /** 框内前缀：短文字（T / R / X）或图标 */
  prefix?: React.ReactNode;
  readOnly?: boolean;
  /** Display transform applied while the field is not focused (e.g. color format) */
  format?: (value: string) => string;
}

interface PropertyFieldProps {
  spec: FieldSpec;
  /** Write a declaration to the inspected element; returns false when rejected */
  onCommit: (prop: string, value: string) => boolean;
}

/** 纯数字，或合并态的「上, 下」两个数字 */
const NUMERIC = /^-?\d*\.?\d*(\s*,\s*-?\d*\.?\d*)?$/;

export function PropertyField({ spec, onCommit }: PropertyFieldProps) {
  const { cssProp, control, unit, prefix, readOnly } = spec;
  const numeric = control === 'length' || control === 'number';
  // 数值类把单位拆出来固定在框内右侧，编辑时只需要输入数字
  const parts = numeric ? splitUnit(spec.value) : { number: spec.value, unit: '' };
  const writeUnit = unit ?? parts.unit;

  const [draft, setDraft] = useState(parts.number);
  const [focused, setFocused] = useState(false);
  const [hover, setHover] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** value at focus time, used to undo a whole edit with Esc */
  const focusValueRef = useRef(spec.value);
  /** Escape already committed the revert; the blur it triggers must not commit again */
  const suppressBlurRef = useRef(false);

  // keep the field in sync with the page while it is not being edited
  useEffect(() => {
    if (!focused) {
      setDraft(parts.number);
      setInvalid(false);
    }
  }, [spec.value, focused, parts.number]);

  const commit = (raw: string): boolean => {
    const value = normalizeInput(raw, writeUnit);
    if (!value) return false;
    return onCommit(cssProp, value);
  };

  const handleChange = (raw: string) => {
    setDraft(raw);
    setInvalid(false);
    commit(raw);
  };

  const handleBlur = () => {
    setFocused(false);
    if (suppressBlurRef.current) {
      suppressBlurRef.current = false;
      return;
    }
    if (!commit(draft)) {
      // discard an invalid value and fall back to the page's value
      setDraft(parts.number);
      setInvalid(false);
    }
  };

  const step = (delta: number) => {
    const m = draft.match(/^(-?\d+(?:\.\d+)?)(.*)$/);
    if (!m) return;
    const next = `${Math.round((parseFloat(m[1]) + delta) * 100) / 100}${m[2]}`;
    setDraft(next);
    commit(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // page-level shortcuts (Esc exits inspect mode) must not fire while typing
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // undo the live edits made during this focus session
      const original = focusValueRef.current;
      if (original && original !== draft) commit(original);
      setDraft(parts.number);
      setInvalid(false);
      // blur() fires handleBlur synchronously with a stale closure draft;
      // suppress its commit or it would overwrite the revert above
      suppressBlurRef.current = true;
      inputRef.current?.blur();
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
               (control === 'length' || control === 'number')) {
      e.preventDefault();
      step((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1));
    }
  };

  const shell = (extra?: React.CSSProperties): React.CSSProperties => ({
    ...fieldShell({ focused, hover, invalid }),
    ...extra,
  });

  // 未编辑时显示数字部分，单位作为固定后缀；编辑中只有当输入仍是纯数字时才显示后缀
  const suffix = focused
    ? (NUMERIC.test(draft) ? writeUnit ?? '' : '')
    : parts.unit;
  const shown = focused ? draft : parts.number;

  // ── enum ──
  if (control === 'enum' && spec.options && spec.options.length > 0) {
    return (
      <Dropdown
        value={spec.value}
        items={spec.options.map(opt => ({ value: opt, label: opt }))}
        onChange={value => onCommit(cssProp, value)}
        prefix={prefix}
        title={`${cssProp}: ${spec.value}`}
      />
    );
  }

  // ── color ──
  if (control === 'color') {
    const hex = toHex(spec.value);
    const swatch = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#000000';
    return (
      <div
        style={shell()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <input
          type="color"
          value={swatch}
          onChange={e => { setDraft(e.target.value); commit(e.target.value); }}
          title="Pick a color"
          style={{
            flexShrink: 0, width: 14, height: 14, padding: 0,
            border: '1px solid rgba(127,127,127,0.45)', borderRadius: 3,
            background: 'none', cursor: 'pointer',
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={focused ? draft : (spec.format ? spec.format(spec.value) : spec.value)}
          onChange={e => handleChange(e.target.value)}
          onFocus={e => { setFocused(true); focusValueRef.current = spec.value; setDraft(spec.value); e.target.select(); }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          style={fieldInput}
        />
      </div>
    );
  }

  // ── read-only (e.g. detected font)：灰底弱文字，明确表示不可编辑 ──
  if (readOnly) {
    return (
      <div style={{
        ...fieldShell(),
        background: 'var(--delab-sel, rgba(0,0,0,0.07))',
        cursor: 'default',
      }}>
        <input
          readOnly
          value={spec.value}
          title={spec.value}
          style={{
            ...fieldInput,
            cursor: 'default',
            color: 'var(--delab-text-tertiary, #8a8a90)',
          }}
        />
      </div>
    );
  }

  // ── text / length / number ──
  return (
    <div
      style={shell()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {prefix && <span style={fieldAffix}>{prefix}</span>}
      <input
        ref={inputRef}
        type="text"
        value={shown}
        onChange={e => handleChange(e.target.value)}
        onFocus={e => { setFocused(true); focusValueRef.current = spec.value; setDraft(parts.number); e.target.select(); }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        title={spec.value}
        style={fieldInput}
      />
      {suffix && <span style={fieldAffix}>{suffix}</span>}
    </div>
  );
}
