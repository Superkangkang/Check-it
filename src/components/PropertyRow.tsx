// DeLab Property Row - React component

import { useState, useCallback } from 'react';
import { displayLabel, formatColor, ColorFormat } from '../style-extractor';
import { ColorPreview } from './ColorPreview';

interface PropertyRowProps {
  name: string;
  value: string;
  isColor: boolean;
  isColorGroup: boolean;
  colorFormat: ColorFormat;
}

export function PropertyRow({ name, value, isColor, isColorGroup, colorFormat }: PropertyRowProps) {
  const [copied, setCopied] = useState(false);
  const displayValue = isColorGroup ? formatColor(value, colorFormat) : value;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`${name}: ${displayValue}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }).catch(() => {});
  }, [name, displayValue]);

  return (
    <div
      onClick={handleCopy}
      title="Click to copy"
      style={{
        display: 'flex', alignItems: 'flex-start', padding: '4px 12px', gap: 8,
        cursor: 'pointer',
      }}
    >
      <span style={{
        fontSize: 13, color: 'var(--delab-text-secondary, #888)',
        width: 100, wordBreak: 'break-word', lineHeight: 1.4,
      }}>
        {displayLabel(name)}
      </span>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0,
        pointerEvents: 'none',
      }}>
        {isColor && <ColorPreview colorValue={value} />}
        <span style={{
          flex: 1, fontSize: 13, color: copied ? 'var(--delab-accent, #5e6ad2)' : 'var(--delab-text, #1a1a2e)',
          wordBreak: 'break-all', lineHeight: 1.4,
        }}>
          {copied ? 'Copied' : displayValue}
        </span>
      </div>
    </div>
  );
}

interface PropertyRowRef {
  name: string;
  value: string;
  isColor: boolean;
  isColorGroup: boolean;
}

export type { PropertyRowRef };
