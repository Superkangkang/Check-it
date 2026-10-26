// DeLab Property Row - React component

import { useState, useCallback, useMemo } from 'react';
import { StyleProperty, ColorFormat, displayLabel, formatColor } from '../style-extractor';
import { PropertyField, FieldSpec } from './PropertyField';
import { CopyIcon, ResetIcon } from './Icon';

interface PropertyRowProps {
  property: StyleProperty;
  isColorGroup: boolean;
  colorFormat: ColorFormat;
  /** Write a declaration to the inspected element; returns false when rejected */
  onCommit: (prop: string, value: string) => boolean;
  /** Revert a single property to its pre-edit value */
  onReset: (prop: string) => void;
}

export function PropertyRow({ property, isColorGroup, colorFormat, onCommit, onReset }: PropertyRowProps) {
  const [copied, setCopied] = useState(false);
  const [hover, setHover] = useState(false);

  const specs: FieldSpec[] = useMemo(() => {
    if (property.parts && property.parts.length > 0) {
      return property.parts.map(part => ({
        value: part.value,
        cssProp: part.cssProp,
        control: part.control,
        unit: part.unit,
        options: part.options,
        prefix: part.label,
      }));
    }
    return [{
      value: property.value,
      cssProp: property.cssProps[0],
      control: property.control,
      unit: property.unit,
      options: property.options,
      readOnly: property.readOnly,
      format: isColorGroup ? (v: string) => formatColor(v, colorFormat) : undefined,
    }];
  }, [property, isColorGroup, colorFormat]);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${property.name}: ${property.value}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }).catch(() => {});
  }, [property.name, property.value]);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (property.parts && property.parts.length > 0) {
      property.parts.forEach(part => onReset(part.cssProp));
    } else {
      onReset(property.cssProps[0]);
    }
  }, [onReset, property.parts, property.cssProps]);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '3px 12px', position: 'relative',
      }}
    >
      {property.modified && (
        <span style={{
          position: 'absolute', left: 0, top: 6, bottom: 6, width: 2,
          background: 'var(--delab-accent, #5e6ad2)', borderRadius: 1,
        }} />
      )}

      <span
        title={property.modified ? `original: ${property.original ?? 'stylesheet value'}` : property.name}
        style={{
          fontSize: 12, color: 'var(--delab-text-secondary, #888)',
          width: 100, flexShrink: 0, lineHeight: '16px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {displayLabel(property.name)}
      </span>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 4 }}>
        {specs.map(spec => (
          <PropertyField key={spec.cssProp} spec={spec} onCommit={onCommit} />
        ))}
      </div>

      <div style={{ width: 22, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
        {hover && property.modified && (
          <IconButton title="Reset to original" onClick={handleReset}>
            <ResetIcon size={12} />
          </IconButton>
        )}
        {hover && !property.modified && (
          <IconButton title={copied ? 'Copied' : 'Copy'} onClick={handleCopy}>
            <CopyIcon size={12} />
          </IconButton>
        )}
      </div>
    </div>
  );
}

function IconButton({ title, onClick, children }: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: 'none', border: 'none', padding: 1, cursor: 'pointer',
        color: 'var(--delab-text-secondary, #888)', display: 'inline-flex',
        alignItems: 'center', borderRadius: 3, height: 20,
      }}
    >
      {children}
    </button>
  );
}
