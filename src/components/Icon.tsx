// Inspect Lab Icons — React components

interface IconProps {
  size?: number;
}

export function SunIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor"
      strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="24" cy="24" r="8" />
      <path d="M24 4V8" /><path d="M24 40V44" />
      <path d="M9.86 9.86 12.68 12.68" /><path d="m35.32 35.32 2.82 2.82" />
      <path d="M4 24h4" /><path d="M40 24h4" />
      <path d="m12.68 35.32-2.82 2.82" /><path d="m38.14 9.86-2.82 2.82" />
    </svg>
  );
}

export function MoonIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor"
      strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M24 6C21.6131 8.38695 20.2721 11.6243 20.2721 15C20.2721 18.3757 21.6131 21.6131 24 24C26.387 26.3869 29.6244 27.7279 33 27.7279C36.3757 27.7279 39.6131 26.3869 42 24C42 27.5601 40.9443 31.0402 38.9665 34.0003C36.9886 36.9603 34.1774 39.2675 30.8883 40.6298C27.5992 41.9922 23.98 42.3487 20.4884 41.6541C16.9967 40.9596 13.7894 39.2453 11.2721 36.7279C8.75474 34.2106 7.04041 31.0033 6.34587 27.5116C5.65134 24.02 6.0078 20.4008 7.37018 17.1117C8.73255 13.8226 11.0397 11.0114 13.9997 9.03355C16.9598 7.05568 20.4399 6 24 6Z" />
    </svg>
  );
}

export function CloseIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor"
      strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M38 10 10 38" /><path d="M10 10l28 28" />
    </svg>
  );
}

export function GearIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor"
      strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M30 10 16 24l14 14" />
    </svg>
  );
}

export function InspectIcon({ size = 36 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor"
      strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M4 24C4 24 10 10 24 10C38 10 44 24 44 24C44 24 38 38 24 38C10 38 4 24 4 24Z" />
      <circle cx="24" cy="24" r="6" />
    </svg>
  );
}

export function CommentIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor"
      strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M42 30C42 31.0609 41.5786 32.0783 40.8284 32.8284C40.0783 33.5786 39.0609 34 38 34H14L6 42V10C6 8.93913 6.42143 7.92172 7.17157 7.17157C7.92172 6.42143 8.93913 6 10 6H38C39.0609 6 40.0783 6.42143 40.8284 7.17157C41.5786 7.92172 42 8.93913 42 10V30Z" />
    </svg>
  );
}

export function CircleCheckIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor"
      strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="24" cy="24" r="18" />
      <path d="m17 24 5 5 9-9" />
    </svg>
  );
}

export function CloudUploadIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor"
      strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14 34C9.6 34 6 30.4 6 26c0-4 3-7.4 6.9-7.9C14.4 13.9 18.7 11 23.6 11c5.2 0 9.7 3.2 11.3 7.8 4.3.2 7.7 3.7 7.7 8.1 0 4.4-3.6 8-8 8" />
      <path d="M24 42V24" />
      <path d="m18 30 6-6 6 6" />
    </svg>
  );
}

export function ResetIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor"
      strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M6 24C5.99624 28.1221 7.40741 32.1206 9.99765 35.3272C12.5879 38.5338 16.2002 40.7542 20.231 41.6173C24.2617 42.4805 28.4665 41.934 32.1428 40.0693C35.819 38.2045 38.7438 35.1345 40.4283 31.3723C42.1129 27.6102 42.4551 23.3838 41.3978 19.3996C40.3406 15.4154 37.9478 11.9147 34.6196 9.4828C31.2913 7.05086 27.2292 5.83494 23.1121 6.03828C18.995 6.24162 15.0724 7.85189 12 10.6" />
      <path d="M6 8V18H16" />
    </svg>
  );
}

/**
 * 字段内小图标：宽 / 高 / 旋转 / 上下 / 左右 / 四方向
 * 形状取自 Figma「INSPECT LAB」label 图标集合（node 742:276）
 * 48 网格，3.6 单位线宽的描边 / 填充混合风格
 */
interface FieldIconSpec {
  /** 设计稿原始画板尺寸 [x, y, w, h] */
  vb: [number, number, number, number];
  /** stroke 存在时按线宽渲染描边路径，否则按 fill 渲染 */
  paths: Array<{
    d?: string;
    rect?: [number, number, number, number, number];
    eo?: boolean;
    stroke?: number;
    opacity?: number;
  }>;
}

export type FieldIconName =
  | 'width' | 'height' | 'rotate'
  | 'x' | 'y' | 'z'
  | 'vertical' | 'horizontal'
  | 'pad-top' | 'pad-right' | 'pad-bottom' | 'pad-left'
  | 'opacity' | 'radius'
  | 'radius-tl' | 'radius-tr' | 'radius-br' | 'radius-bl';

/** 48 网格外框：36×36、圆角 7.38、3.6 单位描边，坐标与 Figma 一致 */
const SIDE_FRAME: [number, number, number, number, number] = [6, 6, 36, 36, 7.38462];
/** 不透明度点阵：15 个 3.69 单位圆点，间距 5.08 */
const OPACITY_DOTS = [
  [34.1542, 13.8462], [29.0772, 18.9231], [34.1542, 18.9231],
  [24, 24], [29.0772, 24], [34.1542, 24],
  [18.9232, 29.0769], [24, 29.0769], [29.0772, 29.0769], [34.1542, 29.0769],
  [13.8462, 34.1538], [18.9232, 34.1538], [24, 34.1538], [29.0772, 34.1538], [34.1542, 34.1538],
];

const FIELD_ICON_PATHS: Record<FieldIconName, FieldIconSpec> = {
  // 字母 W
  width: {
    vb: [0, 0, 48, 48],
    paths: [{ d: 'M13.8068 39L5.85227 9.90906H9.43182L15.5114 33.6022H15.7955L21.9886 9.90906H25.9659L32.1591 33.6022H32.4432L38.5227 9.90906H42.1023L34.1477 39H30.5114L24.0909 15.8181H23.8636L17.4432 39H13.8068Z' }],
  },
  // 字母 H
  height: {
    vb: [0, 0, 48, 48],
    paths: [{ d: 'M12.5227 39V9.90906H16.0455V22.8636H31.5568V9.90906H35.0795V39H31.5568V25.9886H16.0455V39H12.5227Z' }],
  },
  // 字母 X / Y / Z：与宽高字母同字重的填充字形，用于位置坐标
  x: {
    vb: [0, 0, 48, 48],
    paths: [
      { d: 'M7.586 10.414 10.414 7.586 40.414 37.586 37.586 40.414Z' },
      { d: 'M37.586 7.586 40.414 10.414 10.414 40.414 7.586 37.586Z' },
    ],
  },
  y: {
    vb: [0, 0, 48, 48],
    paths: [
      { d: 'M22 21H26V39H22Z' },
      { d: 'M7.69 10.51 10.31 7.49 25.31 20.49 22.69 23.51Z' },
      { d: 'M37.69 7.49 40.31 10.51 25.31 23.51 22.69 20.49Z' },
    ],
  },
  z: {
    vb: [0, 0, 48, 48],
    paths: [{ d: 'M9 9H39V13.6L14.2 35H39V39H9V34.4L33.8 13H9Z' }],
  },
  // 旋转：3 单位描边圆环 + 实心箭头
  rotate: {
    vb: [0, 0, 48, 48],
    paths: [
      { d: 'M40 26.1282C40 29.2927 39.0616 32.3861 37.3035 35.0173C35.5454 37.6485 33.0465 39.6992 30.1229 40.9102C27.1993 42.1212 23.9822 42.4381 20.8785 41.8207C17.7749 41.2034 14.9239 39.6795 12.6863 37.4419C10.4486 35.2042 8.9248 32.3533 8.30744 29.2496C7.69007 26.1459 8.00692 22.9289 9.21793 20.0052C10.4289 17.0816 12.4797 14.5828 15.1109 12.8247C17.7421 11.0666 20.8355 10.1282 24 10.1282', stroke: 3.6 },
      { d: 'M22.1538 6.01577C22.1538 4.94714 23.3131 4.28131 24.2361 4.81977L31.1805 8.87064C32.0964 9.40493 32.0964 10.7283 31.1805 11.2626L24.2361 15.3135C23.3131 15.852 22.1538 15.1861 22.1538 14.1175V6.01577Z' },
    ],
  },
  // 上下内边距：外框 + 上下两条横线
  vertical: {
    vb: [0, 0, 48, 48],
    paths: [
      { rect: SIDE_FRAME, stroke: 3.6 },
      { d: 'M14.5385 14.7693H33.4615', stroke: 3.6 },
      { d: 'M14.5385 33.2307H33.4615', stroke: 3.6 },
    ],
  },
  // 左右内边距：外框 + 左右两条竖线
  horizontal: {
    vb: [0, 0, 48, 48],
    paths: [
      { rect: SIDE_FRAME, stroke: 3.6 },
      { d: 'M33.2308 14.5385L33.2308 33.4615', stroke: 3.6 },
      { d: 'M14.7692 14.5385L14.7692 33.4615', stroke: 3.6 },
    ],
  },
  // 上下左右单边内边距：外框 + 内缩的单条边线
  'pad-top': {
    vb: [0, 0, 48, 48],
    paths: [
      { rect: SIDE_FRAME, stroke: 3.6 },
      { d: 'M14.5385 14.7693H33.4615', stroke: 3.6 },
    ],
  },
  'pad-right': {
    vb: [0, 0, 48, 48],
    paths: [
      { rect: SIDE_FRAME, stroke: 3.6 },
      { d: 'M33.2308 14.5385L33.2308 33.4615', stroke: 3.6 },
    ],
  },
  'pad-bottom': {
    vb: [0, 0, 48, 48],
    paths: [
      { rect: SIDE_FRAME, stroke: 3.6 },
      { d: 'M14.5385 33.2307H33.4615', stroke: 3.6 },
    ],
  },
  'pad-left': {
    vb: [0, 0, 48, 48],
    paths: [
      { rect: SIDE_FRAME, stroke: 3.6 },
      { d: 'M14.7692 14.5385L14.7692 33.4615', stroke: 3.6 },
    ],
  },
  // 不透明度：外框 + 75% 透明度的点阵
  opacity: {
    vb: [0, 0, 48, 48],
    paths: [
      { rect: SIDE_FRAME, stroke: 3.6 },
      ...OPACITY_DOTS.map(([x, y]): FieldIconSpec['paths'][number] => ({
        d: `M${x} ${y}H${x + 0.0001}`, stroke: 3.69231, opacity: 0.75,
      })),
    ],
  },
  // 圆角（合并态）：四角括号
  radius: {
    vb: [0, 0, 48, 48],
    paths: [
      { d: 'M6 17.25V10.5C6 9.30652 6.47411 8.16193 7.31802 7.31802C8.16193 6.47411 9.30652 6 10.5 6H17.25', stroke: 3.6 },
      { d: 'M30.75 6H37.5C38.6935 6 39.8381 6.47411 40.682 7.31802C41.5259 8.16193 42 9.30652 42 10.5V17.25', stroke: 3.6 },
      { d: 'M42 30.75V37.5C42 38.6935 41.5259 39.8381 40.682 40.682C39.8381 41.5259 38.6935 42 37.5 42H30.75', stroke: 3.6 },
      { d: 'M17.25 42H10.5C9.30652 42 8.16193 41.5259 7.31802 40.682C6.47411 39.8381 6 38.6935 6 37.5V30.75', stroke: 3.6 },
    ],
  },
  // 单角圆角：左上 / 右上 / 右下 / 左下
  'radius-tl': {
    vb: [0, 0, 48, 48],
    paths: [{ d: 'M11 37V21.4C11 18.6417 12.0957 15.9965 14.0461 14.0461C15.9965 12.0957 18.6417 11 21.4 11H37', stroke: 3.6 }],
  },
  'radius-tr': {
    vb: [0, 0, 48, 48],
    paths: [{ d: 'M37 37V21.4C37 18.6417 35.9043 15.9965 33.9539 14.0461C32.0035 12.0957 29.3583 11 26.6 11H11', stroke: 3.6 }],
  },
  'radius-br': {
    vb: [0, 0, 48, 48],
    paths: [{ d: 'M37 11V26.6C37 29.3583 35.9043 32.0035 33.9539 33.9539C32.0035 35.9043 29.3583 37 26.6 37H11', stroke: 3.6 }],
  },
  'radius-bl': {
    vb: [0, 0, 48, 48],
    paths: [{ d: 'M11 11V26.6C11 29.3583 12.0957 32.0035 14.0461 33.9539C15.9965 35.9043 18.6417 37 21.4 37H37', stroke: 3.6 }],
  },
};

/** 字段图标：48 网格，描边与填充混排，与 Figma 图标集合一致 */
export function FieldIcon({ name, size = 14 }: { name: FieldIconName; size?: number }) {
  const vb = FIELD_ICON_PATHS[name].vb;
  return (
    <svg width={size} height={size}
      viewBox={`${vb[0]} ${vb[1]} ${vb[2]} ${vb[3]}`} fill="currentColor" aria-hidden
      style={{ flexShrink: 0 }}>
      {FIELD_ICON_PATHS[name].paths.map((p, i) => {
        const paint = {
          fill: p.stroke ? 'none' : undefined,
          stroke: p.stroke ? 'currentColor' : undefined,
          strokeWidth: p.stroke,
          strokeLinecap: p.stroke ? 'round' as const : undefined,
          opacity: p.opacity,
        };
        return p.rect
          ? <rect key={i} x={p.rect[0]} y={p.rect[1]} width={p.rect[2]} height={p.rect[3]}
              rx={p.rect[4]} {...paint} />
          : <path key={i} d={p.d} {...paint}
              fillRule={p.eo ? 'evenodd' : undefined}
              clipRule={p.eo ? 'evenodd' : undefined} />;
      })}
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
    // 图标自带 6/48 的内边距，再补 5px 让左右留白与框内 padding 视觉对称
    <span title={title} style={{ display: 'flex', alignItems: 'center', marginRight: 5 }}>
      <FieldIcon name={name} size={size} />
    </span>
  );
}
