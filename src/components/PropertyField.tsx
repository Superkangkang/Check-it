// DeLab Property Field — always-editable value control (Figma-style inspector field)

import { useEffect, useRef, useState } from 'react';
import { normalizeInput } from '../property-controls';
import { toHex } from '../style-extractor';

export interface FieldSpec {
  /** Value currently applied on the page */
  value: string;
  /** CSS property written back to the element */
  cssProp: string;
  control: 'length' | 'number' | 'color' | 'enum' | 'text';
  unit?: string;
  options?: string[];
  /** Tiny label rendered inside the field (T / R / B / L …) */
  prefix?: string;
  readOnly?: boolean;
  /** Display transform applied while the field is not focused (e.g. color format) */
  format?: (value: string) => string;
}

interface PropertyFieldProps {
  spec: FieldSpec;
  /** Write a declaration to the inspected element; returns false when rejected */
  onCommit: (prop: string, value: string) => boolean;
}

const FIELD_BG = 'var(--delab-field-bg, #ffffff)';
const FIELD_BG_HOVER = 'var(--delab-field-hover, #f3f3f5)';

const baseField: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace", fontSize: 11, lineHeight: '16px',
  height: 28, padding: '0 8px', borderRadius: 6,
  background: FIELD_BG,
  color: 'var(--delab-text, #141416)',
  border: '1px solid transparent',
  outline: 'none', cursor: 'text', textAlign: 'left',
};

function PrefixLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      position: 'absolute', left: 7, top: 0, height: 28, display: 'flex', alignItems: 'center',
      fontSize: 9, lineHeight: 1, color: 'var(--delab-text-tertiary, #8a8a90)',
      pointerEvents: 'none', zIndex: 1,
    }}>
      {children}
    </span>
  );
}

export function PropertyField({ spec, onCommit }: PropertyFieldProps) {
  const { cssProp, control, unit, prefix, readOnly } = spec;
  const [draft, setDraft] = useState(spec.value);
  const [focused, setFocused] = useState(false);
  const [hover, setHover] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** value at focus time, used to undo a whole edit with Esc */
  const focusValueRef = useRef(spec.value);

  // keep the field in sync with the page while it is not being edited
  useEffect(() => {
    if (!focused) {
      setDraft(spec.value);
      setInvalid(false);
    }
  }, [spec.value, focused]);

  const commit = (raw: string): boolean => {
    const value = normalizeInput(raw, unit);
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
    if (!commit(draft)) {
      // discard an invalid value and fall back to the page's value
      setDraft(spec.value);
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
      setDraft(original);
      setInvalid(false);
      inputRef.current?.blur();
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
               (control === 'length' || control === 'number')) {
      e.preventDefault();
      step((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1));
    }
  };

  const borderColor = invalid
    ? 'var(--delab-danger, #e5484d)'
    : focused
      ? 'var(--delab-accent, #32f08c)'
      : hover
        ? 'var(--delab-field-border, rgba(0,0,0,0.12))'
        : 'transparent';

  const fieldStyle: React.CSSProperties = {
    ...baseField,
    background: hover && !focused ? FIELD_BG_HOVER : FIELD_BG,
    borderColor,
    paddingLeft: prefix ? 20 : 8,
  };

  // ── enum ──
  if (control === 'enum' && spec.options && spec.options.length > 0) {
    return (
      <div
        style={{ flex: 1, minWidth: 0, position: 'relative' }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {prefix && <PrefixLabel>{prefix}</PrefixLabel>}
        <select
          value={spec.value}
          onChange={e => onCommit(cssProp, e.target.value)}
          onKeyDown={e => e.stopPropagation()}
          style={{ ...fieldStyle, cursor: 'pointer', paddingRight: 20, appearance: 'none' }}
        >
          {spec.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <svg
          width="8" height="8" viewBox="0 0 8 8" aria-hidden
          style={{
            position: 'absolute', right: 6, top: '50%', marginTop: -4,
            pointerEvents: 'none', color: 'var(--delab-text-tertiary, #8a8a90)',
          }}
        >
          <path d="M1 3l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  // ── color ──
  if (control === 'color') {
    const hex = toHex(spec.value);
    const swatch = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#000000';
    const shown = focused ? draft : (spec.format ? spec.format(spec.value) : spec.value);
    return (
      <div
        style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', position: 'relative' }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <input
          type="color"
          value={swatch}
          onChange={e => { setDraft(e.target.value); commit(e.target.value); }}
          title="Pick a color"
          style={{
            position: 'absolute', left: 4, top: 5, width: 14, height: 14,
            padding: 0, border: '1px solid rgba(127,127,127,0.45)', borderRadius: 3,
            background: 'none', cursor: 'pointer', zIndex: 1,
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={shown}
          onChange={e => handleChange(e.target.value)}
          onFocus={e => { setFocused(true); focusValueRef.current = spec.value; setDraft(spec.value); }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          style={{ ...fieldStyle, paddingLeft: 28 }}
        />
      </div>
    );
  }

  // ── read-only (e.g. detected font) ──
  if (readOnly) {
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <input
          readOnly
          value={spec.value}
          title={spec.value}
          style={{ ...baseField, background: 'transparent', cursor: 'default', color: 'var(--delab-text-secondary, #57575e)' }}
        />
      </div>
    );
  }

  // ── text / length / number ──
  return (
    <div
      style={{ flex: 1, minWidth: 0, position: 'relative' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {prefix && <PrefixLabel>{prefix}</PrefixLabel>}
      <input
        ref={inputRef}
        type="text"
        value={focused ? draft : spec.value}
        onChange={e => handleChange(e.target.value)}
        onFocus={e => { setFocused(true); focusValueRef.current = spec.value; setDraft(spec.value); e.target.select(); }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        title={spec.value}
        style={fieldStyle}
      />
    </div>
  );
}
