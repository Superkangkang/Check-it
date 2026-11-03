// DeLab Style Panel - React component

import { StyleGroup, StyleProperty, ColorFormat, SizeMode, isEmptyValue } from '../style-extractor';
import { PropertyRow } from './PropertyRow';
import { LayoutControls } from './LayoutControls';
import { PositionControls } from './PositionControls';
import { Dropdown } from './Dropdown';

/** 这几个属性合成「方向 + 对齐」控件，不再逐条列出 */
const LAYOUT_KEYS = [
  'width', 'height', 'display', 'flex-direction', 'flex-wrap',
  'justify-content', 'align-items', 'gap',
];

/** flex 三件套是落码细节，面板默认不展示，只在「显示全部」时露出 */
export const FLEX_DETAIL_KEYS = ['flex-grow', 'flex-shrink', 'flex-basis'];

/** display 常用值，其余（inline / inline-block / none …）暂不提供 */
const DISPLAY_OPTIONS = ['block', 'flex', 'grid'];

interface StylePanelProps {
  groups: StyleGroup[];
  showAll: boolean;
  colorFormat: ColorFormat;
  /** 颜色格式由外层持有，切换设计 / CSS 视图时保持一致 */
  onColorFormatChange: (format: ColorFormat) => void;
  /** Write a declaration to the inspected element; returns false when rejected */
  onCommit: (prop: string, value: string) => boolean;
  /** Revert a single property to its pre-edit value */
  onReset: (prop: string) => void;
}

export function StylePanel({
  groups, showAll, colorFormat, onColorFormatChange, onCommit, onReset,
}: StylePanelProps) {
  const visibleGroups: Array<{ name: string; props: StyleProperty[] }> = [];
  for (const group of groups) {
    // 位置组始终完整展示；flex 三件套属于实现细节，默认隐藏
    const props = showAll || group.name === 'Position'
      ? group.properties
      : group.properties.filter(p =>
          !FLEX_DETAIL_KEYS.includes(p.name) && (p.modified || !isEmptyValue(p.name, p.value)));
    if (props.length === 0) continue;
    visibleGroups.push({ name: group.name, props });
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {visibleGroups.map(({ name, props }, groupIndex) => {
        // 布局 / 位置相关属性抽出来交给专用控件，其余照常两列排布
        const layoutValues: Record<string, string> = {};
        const layoutSize: Record<string, SizeMode> = {};
        const layoutParent: Record<string, 'row' | 'column' | 'block'> = {};
        const positionValues: Record<string, string> = {};
        const list = name === 'Layout'
          ? props.filter(p => {
              if (!LAYOUT_KEYS.includes(p.name)) return true;
              layoutValues[p.name] = p.value;
              if (p.sizeMode) layoutSize[p.name] = p.sizeMode;
              if (p.parentAxis) layoutParent[p.name] = p.parentAxis;
              return false;
            })
          : name === 'Position'
            ? props.filter(p => { positionValues[p.name] = p.value; return false; })
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
              <Dropdown
                variant="header"
                value={colorFormat}
                items={[
                  { value: 'hex', label: 'Hex' },
                  { value: 'rgb', label: 'RGB' },
                  { value: 'hsl', label: 'HSL' },
                ]}
                onChange={v => onColorFormatChange(v as ColorFormat)}
                title="颜色格式"
                style={{ marginLeft: 'auto' }}
              />
            )}
            {layoutValues.display !== undefined && (
              <Dropdown
                variant="header"
                value={layoutValues.display}
                items={[
                  // 非预设值（inline 等）先占一项，保证当前值有对应选项
                  ...(!DISPLAY_OPTIONS.includes(layoutValues.display)
                    ? [{ value: layoutValues.display, label: layoutValues.display }]
                    : []),
                  ...DISPLAY_OPTIONS.map(opt => ({ value: opt, label: opt })),
                ]}
                onChange={v => onCommit('display', v)}
                title="display"
                style={{ marginLeft: 'auto' }}
              />
            )}
            {positionValues.position !== undefined && (
              <PositionModeButton
                position={positionValues.position}
                onCommit={onCommit}
              />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px' }}>
            {positionValues.position !== undefined && (
              <PositionControls
                position={positionValues.position}
                x={positionValues.left ?? 'auto'}
                y={positionValues.top ?? 'auto'}
                z={positionValues['z-index'] ?? 'auto'}
                transform={positionValues.transform ?? 'none'}
                xHint={positionValues['x-hint']}
                yHint={positionValues['y-hint']}
                onCommit={onCommit}
              />
            )}
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

/** 位置分组标题右侧的绝对定位开关（对应 Trae 位置面板右上角的按钮） */
function PositionModeButton({ position, onCommit }: {
  position: string;
  onCommit: (prop: string, value: string) => boolean;
}) {
  const absolute = position.trim() === 'absolute';
  return (
    <button
      type="button"
      title={absolute ? '取消绝对定位' : '绝对定位'}
      aria-label={absolute ? '取消绝对定位' : '绝对定位'}
      onClick={() => onCommit('position', absolute ? 'relative' : 'absolute')}
      style={{
        marginLeft: 'auto', width: 26, height: 26, padding: 0, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, cursor: 'pointer',
        border: absolute ? 'none' : '1px solid var(--delab-border, rgba(0,0,0,0.08))',
        background: absolute
          ? 'var(--delab-accent, #32f08c)'
          : 'var(--delab-field-bg, #ffffff)',
        color: absolute
          ? 'var(--delab-accent-contrast, #0b0b0c)'
          : 'var(--delab-text-secondary, #57575e)',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 8V5a1 1 0 0 1 1-1h3" />
        <path d="M16 4h3a1 1 0 0 1 1 1v3" />
        <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
        <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    </button>
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
