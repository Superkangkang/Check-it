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
              borderTop: first ? 'none' : '1px solid var(--delab-border, #23252a)',
              paddingBottom: 12,
              paddingTop: first ? 4 : 0,
            }}
          >
            {/* Group header */}
            <div style={{
              padding: '10px 12px', fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.5px',
              color: 'var(--delab-accent, #5e6ad2)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>{name}</span>
              {name === 'Color' && (
                <select
                  value={colorFormat}
                  onChange={e => setColorFormat(e.target.value as ColorFormat)}
                  style={{
                    marginLeft: 'auto', fontSize: 10, padding: '1px 4px',
                    border: '1px solid var(--delab-border, #23252a)',
                    borderRadius: 4, background: 'var(--delab-bg, #08090a)',
                    color: 'var(--delab-text, #f7f8f8)', cursor: 'pointer',
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
