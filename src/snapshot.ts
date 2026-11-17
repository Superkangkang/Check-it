// DeLab Snapshot — 评论时截取元素及周边区域

/** 元素外扩的上下文范围 */
const PADDING = 80;
/** 输出图片最大宽度，控制单条评论的存储体积 */
const MAX_WIDTH = 360;
const QUALITY = 0.72;

/** 截图前需要临时隐藏的插件 UI（与截图区域重叠才隐藏，避免整屏闪烁） */
const OVERLAY_SELECTORS = [
  '#delab-comment-pins',
  '#delab-glass-label',
  '#delab-comment-button',
  '#delab-comment-popover',
  '#delab-hover-frame',
  '#delab-pointer',
  '#delab-toast',
  '.delab-overlay',
  '#delab-mode-switcher',
  '#delab-inline-panel',
];

interface HiddenOverlay {
  el: HTMLElement;
  value: string;
  priority: string;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export async function captureElementSnapshot(target: Element, host: HTMLElement): Promise<string | null> {
  const rect = target.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // 元素完全在视口外时不截图，避免截到无关内容
  if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= vw || rect.top >= vh) return null;

  const crop: Rect = {
    left: Math.max(0, rect.left - PADDING),
    top: Math.max(0, rect.top - PADDING),
    right: Math.min(vw, rect.right + PADDING),
    bottom: Math.min(vh, rect.bottom + PADDING),
  };

  const hidden = hideOverlaysIn(host, crop);
  let dataUrl: string | null = null;
  try {
    dataUrl = await requestViewportCapture();
  } finally {
    restoreOverlays(hidden);
  }
  if (!dataUrl) {
    console.warn('[Inspect Lab] 截图失败：没有拿到可视区图像');
    return null;
  }

  try {
    const blob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    const dpr = window.devicePixelRatio || 1;

    // 工作区把页面放在 iframe 里，截图却是整个标签页：
    // 需要父页面提供 iframe 的位置和缩放，才能把 iframe 内坐标换算成整页坐标
    const frame = await requestFrameGeometry();
    const frameLeft = frame ? frame.left : 0;
    const frameTop = frame ? frame.top : 0;
    const frameScale = frame ? frame.scale : 1;

    const sx = Math.max(0, Math.round((frameLeft + crop.left * frameScale) * dpr));
    const sy = Math.max(0, Math.round((frameTop + crop.top * frameScale) * dpr));
    const sw = Math.min(
      Math.round((crop.right - crop.left) * frameScale * dpr),
      bitmap.width - sx
    );
    const sh = Math.min(
      Math.round((crop.bottom - crop.top) * frameScale * dpr),
      bitmap.height - sy
    );
    if (sw <= 0 || sh <= 0) {
      bitmap.close?.();
      return null;
    }

    const outW = Math.min(MAX_WIDTH, sw);
    const outH = Math.max(1, Math.round(sh * (outW / sw)));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return null;
    }
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);
    bitmap.close?.();

    return canvas.toDataURL('image/jpeg', QUALITY);
  } catch {
    return null;
  }
}

/** 只隐藏与截图区域重叠的浮层，其余界面保持原样 */
function hideOverlaysIn(host: HTMLElement, crop: Rect): HiddenOverlay[] {
  const root = host.shadowRoot;
  if (!root) return [];

  const nodes = new Set<HTMLElement>();
  for (const selector of OVERLAY_SELECTORS) {
    root.querySelectorAll<HTMLElement>(selector).forEach(el => nodes.add(el));
  }

  const hidden: HiddenOverlay[] = [];
  nodes.forEach(el => {
    if (el.style.display === 'none') return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if (!overlaps(rect, crop)) return;

    hidden.push({
      el,
      value: el.style.getPropertyValue('visibility'),
      priority: el.style.getPropertyPriority('visibility'),
    });
    // 用 important 覆盖组件自己写入的 visibility（如评论弹层的 visible）
    el.style.setProperty('visibility', 'hidden', 'important');
  });

  return hidden;
}

function restoreOverlays(hidden: HiddenOverlay[]) {
  for (const { el, value, priority } of hidden) {
    if (value) el.style.setProperty('visibility', value, priority);
    else el.style.removeProperty('visibility');
  }
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

interface FrameGeometry {
  /** iframe 左上角在标签页视口中的位置 */
  left: number;
  top: number;
  /** iframe 的 CSS 缩放比例 */
  scale: number;
}

/**
 * 向父页面（工作区）要 iframe 的位置和缩放。
 * 顶层页面直接返回 null；嵌在普通网站里的 iframe 等不到回复也会返回 null。
 */
async function requestFrameGeometry(): Promise<FrameGeometry | null> {
  if (window.parent === window) return null;

  const token = `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  return new Promise<FrameGeometry | null>(resolve => {
    const finish = (value: FrameGeometry | null) => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      resolve(value);
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        token?: string;
        left?: number;
        top?: number;
        scale?: number;
      } | null;
      if (data?.type !== 'DELAB_SNAPSHOT_GEOMETRY' || data.token !== token) return;
      finish({
        left: Number(data.left) || 0,
        top: Number(data.top) || 0,
        scale: Number(data.scale) || 1,
      });
    };
    const timer = setTimeout(() => finish(null), 200);
    window.addEventListener('message', onMessage);
    try {
      window.parent.postMessage({ type: 'DELAB_SNAPSHOT_GEOMETRY_REQUEST', token }, '*');
    } catch {
      finish(null);
    }
  });
}

async function requestViewportCapture(): Promise<string | null> {
  await nextPaint();

  return new Promise<string | null>(resolve => {
    try {
      chrome.runtime.sendMessage({ type: 'CAPTURE_VIEWPORT' }, response => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve((response as { dataUrl?: string } | undefined)?.dataUrl ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

function nextPaint(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
