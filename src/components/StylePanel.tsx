// DeLab Style Panel - React component

import { useState } from 'react';
import { StyleGroup, ColorFormat, isEmptyValue } from '../style-extractor';
import { PropertyRow } from './PropertyRow';

interface StylePanelProps {
  groups: StyleGroup[];
  showAll: boolean;
  initialColorFormat?: ColorFormat;
  /** Write a declaration to the inspected element; returns false when rejected */
  onCommit: (prop: string, value: string) => boolean;
  /** Revert a single property to its pre-edit value */
  onReset: (prop: string) => void;
}

export function StylePanel({
  groups, showAll, initialColorFormat = 'hex', onCommit, onReset,
}: StylePanelProps) {
  const [colorFormat, setColorFormat] = useState<ColorFormat>(initialColorFormat);

  let isFirst = true;
  const visibleGroups: Array<{ name: string; props: StyleGroup['properties'] }> = [];

  for (const group of groups) {
    const filtered = showAll
      ? group.properties
      : group.properties.filter(p => p.modified || !isEmptyValue(p.name, p.value));
    if (filtered.length === 0) continue;
    visibleGroups.push({ name: group.name, props: filtered });
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {visibleGroups.map(({ name, props }) => {
        const first = isFirst;
        isFirst = false;
        return (
          <div
            key={name}
            style={{
              borderTop: first ? 'none' : '1px solid var(--delab-border, rgba(0,0,0,0.08))',
              paddingBottom: 12,
              paddingTop: first ? 4 : 0,
            }}
          >
            {/* Group header */}
            <div style={{
              padding: '10px 12px 6px', fontSize: 12, fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--delab-text, #141416)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>{name}</span>
              {name === 'Color' && (
                <select
                  value={colorFormat}
                  onChange={e => setColorFormat(e.target.value as ColorFormat)}
                  style={{
                    marginLeft: 'auto', fontFamily: 'inherit', fontSize: 10, padding: '2px 6px',
                    border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
                    borderRadius: 4, background: 'var(--delab-field-bg, #ffffff)',
                    color: 'var(--delab-text-secondary, #57575e)', cursor: 'pointer', outline: 'none',
                  }}
                >
                  <option value="hex">Hex</option>
                  <option value="rgb">RGB</option>
                  <option value="hsl">HSL</option>
                </select>
              )}
            </div>

            {/* Property rows */}
            <div>
              {props.map(p => (
                <PropertyRow
                  key={p.name}
                  property={p}
                  isColorGroup={name === 'Color'}
                  colorFormat={colorFormat}
                  onCommit={onCommit}
                  onReset={onReset}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
