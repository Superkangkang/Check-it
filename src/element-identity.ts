// DeLab Element Identity — 元素指纹，供评论锚点定位与 AI 交接使用

export interface ElementIdentity {
  /** 最短唯一定位符（#id / [data-testid] / DOM 路径） */
  selector: string;
  /** 完整 DOM 路径，作为 selector 失效后的兜底 */
  path: string;
  tag: string;
  id: string;
  classes: string;
  /** 元素可见文案，最多 60 字 */
  text: string;
  /** React 组件名（仅 dev / 未压缩构建可得） */
  component?: string;
  /** React 源码位置 file:line（仅 dev / 未压缩构建可得） */
  source?: string;
}

const MAX_TEXT = 60;
const MAX_FIBER_DEPTH = 60;

function escapeIdent(value: string): string {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value;
}

/** 从 body 向下拼出带 nth-of-type 的稳定路径，遇到 id 提前收束 */
function buildPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;

  while (node && node !== document.documentElement && node.parentElement) {
    const tag = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`${tag}#${escapeIdent(node.id)}`);
      break;
    }
    const siblings = Array.from(node.parentElement.children).filter(
      sibling => sibling.tagName === node!.tagName
    );
    const index = siblings.indexOf(node) + 1;
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
    node = node.parentElement;
  }

  return parts.join(' > ');
}

/** 优先返回能唯一定位该元素的短选择器 */
function buildSelector(el: Element, path: string): string {
  if (el.id) {
    const selector = `#${escapeIdent(el.id)}`;
    if (document.querySelectorAll(selector).length === 1) return selector;
  }

  const testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id');
  if (testId) {
    const selector = `[data-testid="${testId.replace(/"/g, '\\"')}"]`;
    if (document.querySelectorAll(selector).length === 1) return selector;
  }

  return path;
}

/** 取元素上最贴近用户感知的文案 */
function readText(el: Element): string {
  const explicit =
    el.getAttribute('aria-label') ||
    el.getAttribute('placeholder') ||
    el.getAttribute('alt') ||
    el.getAttribute('title');
  const raw = explicit || el.textContent || '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
}

function readReact(el: Element): { component?: string; source?: string } {
  try {
    const propKey = Object.keys(el).find(key => key.startsWith('__reactFiber$'));
    if (!propKey) return {};

    let fiber = (el as unknown as Record<string, unknown>)[propKey] as Record<string, any> | null;
    let component: string | undefined;
    let source: string | undefined;

    for (let depth = 0; fiber && depth < MAX_FIBER_DEPTH; depth += 1) {
      if (!source) {
        const debugSource = fiber._debugSource;
        if (debugSource?.fileName) {
          source = `${debugSource.fileName}:${debugSource.lineNumber}`;
        }
      }
      if (!component) {
        const type = fiber.type;
        const name = typeof type === 'function' ? type.displayName || type.name : undefined;
        if (name && /^[A-Z]/.test(name)) component = name;
      }
      if (component && source) break;
      fiber = fiber._debugOwner || fiber.return || null;
    }

    return { component, source };
  } catch {
    return {};
  }
}

export function describeElement(el: Element): ElementIdentity {
  const path = buildPath(el);
  const { component, source } = readReact(el);

  return {
    selector: buildSelector(el, path),
    path,
    tag: el.tagName.toLowerCase(),
    id: el.id,
    classes: typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '',
    text: readText(el),
    component,
    source,
  };
}

/** 页面重载后用指纹找回元素，找不到返回 null */
export function resolveElement(identity: ElementIdentity): Element | null {
  const candidates = [identity.selector, identity.path].filter(Boolean);
  for (const selector of candidates) {
    try {
      const found = document.querySelector(selector);
      if (found) return found;
    } catch {
      // 选择器非法时继续尝试下一个
    }
  }
  return null;
}

/** 面板里展示的一行元素摘要，例如 button.btn-primary「Choose plan」 */
export function summarizeElement(identity: ElementIdentity): string {
  const cls = identity.classes.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const name = `${identity.tag}${identity.id ? `#${identity.id}` : ''}${cls.map(c => `.${c}`).join('')}`;
  return identity.text ? `${name}「${identity.text}」` : name;
}
