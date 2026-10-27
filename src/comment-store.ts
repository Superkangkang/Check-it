// DeLab Comment Store — 评论持久化与 AI 交接文本

import { ElementIdentity } from './element-identity';

export interface CommentThread {
  id: string;
  /** 页面键：站点 origin，评论按站点归档（页内 tab / 路由跳转不重置） */
  page: string;
  url: string;
  identity: ElementIdentity;
  body: string;
  resolved: boolean;
  createdAt: number;
  /** 评论时的元素区域截图（JPEG dataURL），跨页面定位失效时用于辨认 */
  snapshot?: string;
}

type CommentMap = Record<string, CommentThread[]>;

const STORAGE_KEY = 'delab-comments';

export function pageKey(): string {
  return location.origin;
}

export function createThread(identity: ElementIdentity, body: string): CommentThread {
  return {
    id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    page: pageKey(),
    url: location.href,
    identity,
    body: body.trim(),
    resolved: false,
    createdAt: Date.now(),
  };
}

async function readAll(): Promise<CommentMap> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY];
    return stored && typeof stored === 'object' ? (stored as CommentMap) : {};
  } catch {
    return {};
  }
}

async function writeAll(map: CommentMap): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: map });
}

export async function loadComments(page = pageKey()): Promise<CommentThread[]> {
  const map = await readAll();
  return (map[page] || []).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveThread(thread: CommentThread): Promise<CommentThread[]> {
  const map = await readAll();
  const list = map[thread.page] || [];
  map[thread.page] = [...list, thread];
  await writeAll(map);
  return map[thread.page];
}

export async function patchThread(
  page: string,
  id: string,
  patch: Partial<Pick<CommentThread, 'resolved' | 'body'>>
): Promise<CommentThread[]> {
  const map = await readAll();
  const list = (map[page] || []).map(item => (item.id === id ? { ...item, ...patch } : item));
  map[page] = list;
  await writeAll(map);
  return list;
}

export async function removeThread(page: string, id: string): Promise<CommentThread[]> {
  const map = await readAll();
  const list = (map[page] || []).filter(item => item.id !== id);
  if (list.length) map[page] = list;
  else delete map[page];
  await writeAll(map);
  return list;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 生成给 AI 的 Markdown：未解决评论优先，包含完整元素定位 */
export function toMarkdown(threads: CommentThread[], pageUrl: string): string {
  const open = threads.filter(t => !t.resolved);
  const list = open.length ? open : threads;

  const lines: string[] = [
    '# DeLab 走查评论',
    '',
    `页面：${pageUrl}`,
    `导出时间：${formatTime(Date.now())}`,
    `评论数量：${list.length} 条${open.length ? '（未解决）' : '（全部已解决）'}`,
    '',
    '请按下述元素定位修改源码；每条评论都附有选择器、DOM 路径与组件信息。',
    '',
    '---',
  ];

  list.forEach((thread, index) => {
    const { identity } = thread;
    const cls = identity.classes.trim().split(/\s+/).filter(Boolean).slice(0, 3);
    const title = `${identity.tag}${identity.id ? `#${identity.id}` : ''}${cls.map(c => `.${c}`).join('')}`;

    lines.push('');
    lines.push(`## ${index + 1}. ${title}${identity.text ? `「${identity.text}」` : ''}`);
    lines.push('');
    lines.push(`- 选择器：\`${identity.selector}\``);
    if (identity.path && identity.path !== identity.selector) {
      lines.push(`- DOM 路径：\`${identity.path}\``);
    }
    if (identity.component) {
      lines.push(
        identity.source
          ? `- React 组件：\`${identity.component}\` — \`${identity.source}\``
          : `- React 组件：\`${identity.component}\``
      );
    }
    lines.push(`- 评论：${thread.body}`);
  });

  lines.push('');
  return lines.join('\n');
}
