// Inspect Lab Icons — React components

interface IconProps {
  size?: number;
}

export function SunIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" /><path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export function MoonIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function CloseIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

export function InspectIcon({ size = 36 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function CommentIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  );
}

export function CircleCheckIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-4.5" />
    </svg>
  );
}

export function TrashIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}

export function ResetIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

/**
 * 字段内小图标：宽 / 高 / 旋转 / 上下 / 左右 / 四方向
 * 形状取自 Figma 原生 UI 图标（figma-plugin-ds，ISC License）
 * https://github.com/thomas-lowry/figma-plugin-ds
 * 32 网格 fill 风格，与 Figma 面板观感一致
 */
interface FieldIconSpec {
  /** 裁掉原生留白后的 viewBox：[x, y, w, h]，四周留 2 单位呼吸边 */
  vb: [number, number, number, number];
  /** stroke 存在时按线宽渲染描边路径，否则按 fill 渲染 */
  paths: Array<{ d: string; eo?: boolean; stroke?: number }>;
}

export type FieldIconName =
  | 'width' | 'height' | 'rotate'
  | 'vertical' | 'horizontal'
  | 'pad-top' | 'pad-right' | 'pad-bottom' | 'pad-left'
  | 'top' | 'right' | 'bottom' | 'left'
  | 'opacity' | 'radius'
  | 'radius-tl' | 'radius-tr' | 'radius-br' | 'radius-bl'
  | 'link';

/** 方框轮廓：外沿 8–24 圆角 3，内沿 9.4–22.6（1.4 单位细框），evenodd 抠空 */
const SIDE_FRAME = 'M11 8h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3zm.4 1.4h9.2a2 2 0 0 1 2 2v9.2a2 2 0 0 1-2 2h-9.2a2 2 0 0 1-2-2v-9.2a2 2 0 0 1 2-2z';

const FIELD_ICON_PATHS: Record<FieldIconName, FieldIconSpec> = {
  // 双向箭头（宽）：2.4 单位粗杆 + 实心箭头，与方框图标的粗线同宽
  width: {
    vb: [7, 7, 18, 18],
    paths: [
      { d: 'M11.5 14.8h9v2.4h-9z' },
      { d: 'M8.6 16l4.4-2.7v5.4z' },
      { d: 'M23.4 16l-4.4-2.7v5.4z' },
    ],
  },
  // 双向箭头（高）
  height: {
    vb: [7, 7, 18, 18],
    paths: [
      { d: 'M14.8 11.5h2.4v9h-2.4z' },
      { d: 'M16 8.6l2.7 4.4h-5.4z' },
      { d: 'M16 23.4l-2.7-4.4h5.4z' },
    ],
  },
  // 旋转：1.4 单位描边圆环箭头，整体居中于 16 光心
  rotate: {
    vb: [7, 7, 18, 18],
    paths: [
      { d: 'M22.5 16.9a6.5 6.5 0 1 1-6.5-6.5', stroke: 1.4 },
      { d: 'M16 8.6l3 1.8-3 1.8z' },
    ],
  },
  // 上下内边距：细方框 + 上下两条粗线
  vertical: {
    vb: [7, 7, 18, 18],
    paths: [
      { d: SIDE_FRAME, eo: true },
      { d: 'M11 11.2h10v2.4h-10z' },
      { d: 'M11 18.4h10v2.4h-10z' },
    ],
  },
  // 左右内边距：细方框 + 左右两条粗线
  horizontal: {
    vb: [7, 7, 18, 18],
    paths: [
      { d: SIDE_FRAME, eo: true },
      { d: 'M11.2 11h2.4v10h-2.4z' },
      { d: 'M18.4 11h2.4v10h-2.4z' },
    ],
  },
  // 上下左右单边内边距：细方框 + 内缩的粗线，靠粗细对比区分方向
  'pad-top': {
    vb: [7, 7, 18, 18],
    paths: [
      { d: SIDE_FRAME, eo: true },
      { d: 'M11 11.2h10v2.4h-10z' },
    ],
  },
  'pad-right': {
    vb: [7, 7, 18, 18],
    paths: [
      { d: SIDE_FRAME, eo: true },
      { d: 'M18.4 11h2.4v10h-2.4z' },
    ],
  },
  'pad-bottom': {
    vb: [7, 7, 18, 18],
    paths: [
      { d: SIDE_FRAME, eo: true },
      { d: 'M11 18.4h10v2.4h-10z' },
    ],
  },
  'pad-left': {
    vb: [7, 7, 18, 18],
    paths: [
      { d: SIDE_FRAME, eo: true },
      { d: 'M11.2 11h2.4v10h-2.4z' },
    ],
  },
  // layout-align-top
  top: {
    vb: [7.5, 7, 17, 17],
    paths: [
      { d: 'm14.5 22v-10h-2v10z' },
      { d: 'm22.5 10v-1h-13v1z' },
      { d: 'm19.5 12v6h-2v-6z' },
    ],
  },
  // layout-align-right
  right: {
    vb: [8, 7.5, 17, 17],
    paths: [
      { d: 'm22 22.5h1v-13h-1z' },
      { d: 'm10 14.5h10v-2h-10z' },
      { d: 'm20 19.5h-6v-2h6z' },
    ],
  },
  // layout-align-bottom
  bottom: {
    vb: [7.5, 8, 17, 17],
    paths: [{ d: 'm14.5 10v10h-2v-10zm8 12v1h-13v-1zm-3-2v-6h-2v6z', eo: true }],
  },
  // layout-align-left
  left: {
    vb: [7, 7.5, 17, 17],
    paths: [
      { d: 'm10 22.5h-1v-13h1z' },
      { d: 'm22 14.5h-10v-2h10z' },
      { d: 'm12 19.5h6v-2h-6z' },
    ],
  },
  // 不透明度：方框 + 内部点阵（表示透明/棋盘格）
  opacity: {
    vb: [7, 7, 18, 18],
    paths: [
      { d: 'M11 8h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z', stroke: 1.6 },
      { d: 'M12 12h2.5v2.5H12zM17.5 12H20v2.5h-2.5zM12 17.5h2.5V20H12zM17.5 17.5H20V20h-2.5z' },
    ],
  },
  // 圆角（合并态）：四角括号
  radius: {
    vb: [7, 7, 18, 18],
    paths: [
      { d: 'M8 13v-3a2 2 0 0 1 2-2h3', stroke: 1.8 },
      { d: 'M19 8h3a2 2 0 0 1 2 2v3', stroke: 1.8 },
      { d: 'M24 19v3a2 2 0 0 1-2 2h-3', stroke: 1.8 },
      { d: 'M13 24h-3a2 2 0 0 1-2-2v-3', stroke: 1.8 },
    ],
  },
  // 单角圆角：左上 / 右上 / 右下 / 左下
  'radius-tl': {
    vb: [7, 7, 18, 18],
    paths: [{ d: 'M11 21v-8a2 2 0 0 1 2-2h8', stroke: 1.8 }],
  },
  'radius-tr': {
    vb: [7, 7, 18, 18],
    paths: [{ d: 'M21 21v-8a2 2 0 0 0-2-2h-8', stroke: 1.8 }],
  },
  'radius-br': {
    vb: [7, 7, 18, 18],
    paths: [{ d: 'M21 11v8a2 2 0 0 1-2 2h-8', stroke: 1.8 }],
  },
  'radius-bl': {
    vb: [7, 7, 18, 18],
    paths: [{ d: 'M11 11v8a2 2 0 0 0 2 2h8', stroke: 1.8 }],
  },
  // 四角联动：竖线穿过上下两个圆点
  link: {
    vb: [7, 7, 18, 18],
    paths: [
      { d: 'M16 10v12', stroke: 1.6 },
      { d: 'M18.4 12a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0z', stroke: 1.6 },
      { d: 'M18.4 20a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0z', stroke: 1.6 },
    ],
  },
};

/** Figma 原生风格字段图标：32 网格 fill 渲染，viewBox 已裁掉原生留白 */
export function FieldIcon({ name, size = 14 }: { name: FieldIconName; size?: number }) {
  const vb = FIELD_ICON_PATHS[name].vb;
  return (
    <svg width={size} height={size}
      viewBox={`${vb[0]} ${vb[1]} ${vb[2]} ${vb[3]}`} fill="currentColor" aria-hidden
      style={{ flexShrink: 0 }}>
      {FIELD_ICON_PATHS[name].paths.map((p, i) => (
        <path key={i} d={p.d}
          fill={p.stroke ? 'none' : undefined}
          stroke={p.stroke ? 'currentColor' : undefined}
          strokeWidth={p.stroke}
          strokeLinecap={p.stroke ? 'round' : undefined}
          fillRule={p.eo ? 'evenodd' : undefined}
          clipRule={p.eo ? 'evenodd' : undefined} />
      ))}
    </svg>
  );
}

/** 输入框内的图标标签：语义交给图标，title 保留可读文案 */
export function FieldGlyph({ name, title, size = 14 }: {
  name: FieldIconName;
  title: string;
  size?: number;
}) {
  return (
    <span title={title} style={{ display: 'flex', alignItems: 'center' }}>
      <FieldIcon name={name} size={size} />
    </span>
  );
}
