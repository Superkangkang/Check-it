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
  paths: Array<{ d: string; eo?: boolean }>;
}

export type FieldIconName =
  | 'width' | 'height' | 'rotate'
  | 'vertical' | 'horizontal'
  | 'top' | 'right' | 'bottom' | 'left';

const FIELD_ICON_PATHS: Record<FieldIconName, FieldIconSpec> = {
  // arrow-left-right（Figma gap 双向箭头）
  width: {
    vb: [8.3, 11.1, 15.4, 9.8],
    paths: [{
      d: 'm12.2071 16.5 1.6465 1.6464-.7071.7072-2.8536-2.8536 2.8536-2.8536.7071.7072-1.6465 1.6464h7.5858l-1.6464-1.6464.7071-.7072 2.8535 2.8536-2.8535 2.8536-.7071-.7072 1.6464-1.6464z',
    }],
  },
  // arrow-up-down
  height: {
    vb: [11.1, 8.3, 9.8, 15.4],
    paths: [{
      d: 'm16.0005 10.2923 2.8535 2.8536-.7071.7071-1.6464-1.6464v7.5857l1.6464-1.6464.7071.7071-2.8535 2.8536-2.8536-2.8536.7071-.7071 1.6465 1.6464v-7.5857l-1.6465 1.6464-.7071-.7071z',
    }],
  },
  // angle（Figma 旋转字段图标）
  rotate: {
    vb: [10, 10, 12, 12],
    paths: [{
      d: 'm12 12v8h8v-1h-3c0-2.2091-1.7909-4-4-4v-3zm1 4v3h3c0-1.6569-1.3431-3-3-3z',
      eo: true,
    }],
  },
  // vertical-padding
  vertical: {
    vb: [7, 7, 18, 18],
    paths: [
      { d: 'm9 9h14v1h-14zm0 13h14v1h-14z' },
      { d: 'm19 13h-6v6h6zm-7-1v8h8v-8z', eo: true },
    ],
  },
  // horizontal-padding
  horizontal: {
    vb: [7, 7, 18, 18],
    paths: [
      { d: 'm9 9v14h1v-14zm13 0v14h1v-14z' },
      { d: 'm13 19v-6h6v6zm-1-7h8v8h-8z', eo: true },
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
