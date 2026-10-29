// DeLab Style Panel - React component

import { useState } from 'react';
import { StyleGroup, StyleProperty, ColorFormat, SizeMode, isEmptyValue } from '../style-extractor';
import { PropertyRow } from './PropertyRow';
import { LayoutControls } from './LayoutControls';

/** 这几个属性合成「方向 + 对齐」控件，不再逐条列出 */
const LAYOUT_KEYS = [
  'width', 'height', 'display', 'flex-direction', 'flex-wrap',
  'justify-content', 'align-items', 'gap',
];

/** flex 三件套是落码细节，面板默认不展示，只在「显示全部」时露出 */
const FLEX_DETAIL_KEYS = ['flex-grow', 'flex-shrink', 'flex-basis'];

/** display 常用值，其余（inline / inline-block / none …）暂不提供 */
const DISPLAY_OPTIONS = ['block', 'flex', 'grid'];

/** 分组标题右侧的小选择器样式 */
const headerSelectStyle: React.CSSProperties = {
  height: 20, padding: '0 4px',
  fontFamily: 'inherit', fontSize: 10,
  border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
  borderRadius: 5, background: 'var(--delab-field-bg, #ffffff)',
  color: 'var(--delab-text-secondary, #57575e)',
  cursor: 'pointer', outline: 'none',
};

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

  const visibleGroups: Array<{ name: string; props: StyleProperty[] }> = [];
  for (const group of groups) {
    // flex 三件套属于实现细节，默认隐藏，开「显示全部」时才出现在面板里
    const props = showAll
      ? group.properties
      : group.properties.filter(p =>
          !FLEX_DETAIL_KEYS.includes(p.name) && (p.modified || !isEmptyValue(p.name, p.value)));
    if (props.length === 0) continue;
    visibleGroups.push({ name: group.name, props });
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {visibleGroups.map(({ name, props }, groupIndex) => {
        // 布局相关属性抽出来交给 LayoutControls，其余照常两列排布
        const layoutValues: Record<string, string> = {};
        const layoutSize: Record<string, SizeMode> = {};
        const layoutParent: Record<string, 'row' | 'column' | 'block'> = {};
        const list = name === 'Layout'
          ? props.filter(p => {
              if (!LAYOUT_KEYS.includes(p.name)) return true;
              layoutValues[p.name] = p.value;
              if (p.sizeMode) layoutSize[p.name] = p.sizeMode;
              if (p.parentAxis) layoutParent[p.name] = p.parentAxis;
              return false;
            })
          : props;
        const hasColor = props.some(p => p.isColor);

        return (
        <section
          key={name}
          style={{
            borderTop: groupIndex === 0 ? 'none' : '1px solid var(--delab-border, rgba(0,0,0,0.08))',
            padding: groupIndex === 0 ? '4px 0 14px' : '14px 0',
          }}
        >
          {/* 分组标题：Figma 式小标题，右侧留操作位 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0 12px', marginBottom: 8,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '-0.01em',
              color: 'var(--delab-text, #141416)',
            }}>
              {name}
            </span>
            {hasColor && (
              <select
                value={colorFormat}
                onChange={e => setColorFormat(e.target.value as ColorFormat)}
                style={{ ...headerSelectStyle, marginLeft: 'auto' }}
              >
                <option value="hex">Hex</option>
                <option value="rgb">RGB</option>
                <option value="hsl">HSL</option>
              </select>
            )}
            {layoutValues.display !== undefined && (
              <select
                value={DISPLAY_OPTIONS.includes(layoutValues.display) ? layoutValues.display : ''}
                onChange={e => onCommit('display', e.target.value)}
                style={{ ...headerSelectStyle, marginLeft: 'auto' }}
              >
                {!DISPLAY_OPTIONS.includes(layoutValues.display) && (
                  <option value="">{layoutValues.display}</option>
                )}
                {DISPLAY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px' }}>
            {layoutValues.display && (
              <LayoutControls
                display={layoutValues.display}
                direction={layoutValues['flex-direction'] ?? 'row'}
                wrap={layoutValues['flex-wrap'] ?? 'nowrap'}
                justify={layoutValues['justify-content'] ?? 'normal'}
                align={layoutValues['align-items'] ?? 'normal'}
                gap={layoutValues.gap ?? '0'}
                width={layoutValues.width ?? ''}
                height={layoutValues.height ?? ''}
                widthMode={layoutSize.width ?? 'fixed'}
                heightMode={layoutSize.height ?? 'fixed'}
                widthParent={layoutParent.width ?? 'block'}
                heightParent={layoutParent.height ?? 'block'}
                onCommit={onCommit}
              />
            )}
            {toRows(list).map((row, rowIndex) => (
              <div
                key={`${row[0].name}-${rowIndex}`}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
              >
                {row.map(property => (
                  <PropertyRow
                    key={property.name}
                    property={property}
                    isColorGroup={property.isColor}
                    colorFormat={colorFormat}
                    onCommit={onCommit}
                    onReset={onReset}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
        );
      })}
    </div>
  );
}

/**
 * 把属性排成两列：普通属性两两并排；
 * 多值属性（margin / padding / 圆角 …）独占一行，内部自己排 2 列网格
 */
function toRows(props: StyleProperty[]): StyleProperty[][] {
  const rows: StyleProperty[][] = [];
  let buffer: StyleProperty[] = [];

  for (const property of props) {
    const isMulti = (property.parts?.length ?? 0) > 1 || property.isColor;
    if (isMulti) {
      if (buffer.length) {
        rows.push(buffer);
        buffer = [];
      }
      rows.push([property]);
      continue;
    }
    buffer.push(property);
    if (buffer.length === 2) {
      rows.push(buffer);
      buffer = [];
    }
  }
  if (buffer.length) rows.push(buffer);
  return rows;
}
