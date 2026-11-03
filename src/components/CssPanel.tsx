// DeLab CSS Panel — 原始 CSS 属性列表：一行一个属性，名称在左、值在右

import { useState } from 'react';
import {
  StyleGroup, StyleProperty, ColorFormat, displayLabel, formatColor, isEmptyValue,
} from '../style-extractor';
import { PropertyField, FieldSpec } from './PropertyField';
import { FLEX_DETAIL_KEYS } from './StylePanel';
import { ResetIcon } from './Icon';

interface CssPanelProps {
  groups: StyleGroup[];
  showAll: boolean;
  colorFormat: ColorFormat;
  /** Write a declaration to the inspected element; returns false when rejected */
  onCommit: (prop: string, value: string) => boolean;
  /** Revert a single property to its pre-edit value */
  onReset: (prop: string) => void;
}

export function CssPanel({ groups, showAll, colorFormat, onCommit, onReset }: CssPanelProps) {
  const visibleGroups = groups
    .map(group => ({
      name: group.name,
      props: showAll
        ? group.properties
        : group.properties.filter(p =>
            !FLEX_DETAIL_KEYS.includes(p.name) && (p.modified || !isEmptyValue(p.name, p.value))),
    }))
    .filter(group => group.props.length > 0);

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {visibleGroups.map((group, groupIndex) => (
        <section
          key={group.name}
          style={{
            borderTop: groupIndex === 0 ? 'none' : '1px solid var(--delab-border, rgba(0,0,0,0.08))',
            padding: groupIndex === 0 ? '4px 0 10px' : '10px 0',
          }}
        >
          <div style={{
            padding: '0 12px', marginBottom: 6,
            fontSize: 11, fontWeight: 600, letterSpacing: '-0.01em',
            color: 'var(--delab-text, #141416)',
          }}>
            {group.name}
          </div>
          {group.props.map(property => (
            <CssRow
              key={property.name}
              property={property}
              colorFormat={colorFormat}
              onCommit={onCommit}
              onReset={onReset}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

/** 一行一个属性：名称固定宽度靠左，值占满剩余空间，悬停时显示重置 */
function CssRow({ property, colorFormat, onCommit, onReset }: {
  property: StyleProperty;
  colorFormat: ColorFormat;
  onCommit: (prop: string, value: string) => boolean;
  onReset: (prop: string) => void;
}) {
  const [hover, setHover] = useState(false);

  const specs: FieldSpec[] = property.parts && property.parts.length > 0
    ? property.parts.map(part => ({
        value: part.value,
        cssProp: part.cssProp,
        control: part.control,
        unit: part.unit,
        options: part.options,
        prefix: part.label,
      }))
    : [{
        value: property.value,
        cssProp: property.cssProps[0],
        control: property.control,
        unit: property.unit,
        options: property.options,
        readOnly: property.readOnly,
        format: property.isColor ? (v: string) => formatColor(v, colorFormat) : undefined,
      }];

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (property.parts && property.parts.length > 0) {
      property.parts.forEach(part => onReset(part.cssProp));
    } else {
      onReset(property.cssProps[0]);
    }
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '2px 12px', minHeight: 28, position: 'relative',
      }}
    >
      {property.modified && (
        <span style={{
          position: 'absolute', left: 0, top: 6, bottom: 6, width: 2,
          background: 'var(--delab-accent, #32f08c)', borderRadius: 1,
        }} />
      )}

      <span
        title={property.modified ? `original: ${property.original ?? 'stylesheet value'}` : property.name}
        style={{
          width: 104, flexShrink: 0,
          fontSize: 11, lineHeight: '14px',
          color: 'var(--delab-text-secondary, #57575e)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {displayLabel(property.name)}
      </span>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 8 }}>
        {specs.map(spec => (
          <PropertyField key={spec.cssProp} spec={spec} onCommit={onCommit} />
        ))}
      </div>

      <div style={{ width: 14, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
        {hover && property.modified && (
          <button
            title="Reset to original"
            onClick={handleReset}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--delab-text-tertiary, #8a8a90)', display: 'inline-flex',
              alignItems: 'center', borderRadius: 3, width: 14, height: 14,
            }}
          >
            <ResetIcon size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
