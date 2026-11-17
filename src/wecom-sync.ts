// DeLab WeCom Sync — 企微智能表格 Webhook 单向上报：配置、校验、payload、错误映射

import type { CommentThread } from './comment-store';

export const WECOM_CONFIG_KEY = 'delab-wecom-config';
export const WECOM_WEBHOOK_HOST = 'qyapi.weixin.qq.com';
export const WECOM_WEBHOOK_PATH = '/cgi-bin/wedoc/smartsheet/webhook';

export type WecomFieldKey =
  | 'commentId' | 'body' | 'url' | 'pageTitle' | 'site'
  | 'selector' | 'domPath' | 'elementText' | 'component'
  | 'createdAt' | 'snapshot' | 'status' | 'reporter';

export interface WecomFieldDef {
  key: WecomFieldKey;
  label: string;
  /** 智能表格里的字段类型，仅用于配置页提示 */
  type: string;
  required?: boolean;
  hint?: string;
}

export const WECOM_FIELD_DEFS: WecomFieldDef[] = [
  { key: 'commentId', label: '评论ID', type: '文本', required: true, hint: '幂等辅助 / 人工排查' },
  { key: 'body', label: '评论内容', type: '文本', required: true },
  { key: 'url', label: '页面链接', type: '链接', required: true },
  { key: 'pageTitle', label: '页面标题', type: '文本' },
  { key: 'site', label: '站点', type: '文本' },
  { key: 'selector', label: '元素选择器', type: '文本' },
  { key: 'domPath', label: 'DOM 路径', type: '文本' },
  { key: 'elementText', label: '元素文案', type: '文本' },
  { key: 'component', label: '组件 / 源码', type: '文本' },
  { key: 'createdAt', label: '评论时间', type: '日期', hint: '毫秒时间戳' },
  { key: 'snapshot', label: '截图', type: '图片', hint: '需开启「包含截图」' },
  { key: 'status', label: '状态', type: '单选', hint: '固定写入「待处理」' },
  { key: 'reporter', label: '上报人', type: '文本', hint: '按姓名原文写入' },
];

export const WECOM_FIELD_LABEL: Record<WecomFieldKey, string> = WECOM_FIELD_DEFS.reduce(
  (acc, def) => ({ ...acc, [def.key]: def.label }),
  {} as Record<WecomFieldKey, string>
);

export interface WecomConfig {
  version: 1;
  enabled: boolean;
  webhookUrl: string;
  fields: Partial<Record<WecomFieldKey, string>>;
  includeSnapshot: boolean;
  stripQuery: boolean;
  reporter: string;
  timeoutMs: number;
}

export const DEFAULT_WECOM_CONFIG: WecomConfig = {
  version: 1,
  enabled: true,
  webhookUrl: '',
  fields: {},
  includeSnapshot: true,
  stripQuery: true,
  reporter: '',
  timeoutMs: 10000,
};

export type WecomSyncSuccess = { ok: true; recordId: string | null; alreadySynced?: boolean };
export type WecomSyncFailure = { ok: false; code: string; message: string; retryable: boolean };
export type WecomSyncResult = WecomSyncSuccess | WecomSyncFailure;

export interface WecomReportContext {
  pageTitle?: string;
  viewport?: { width: number; height: number };
}

export interface ConfigValidation {
  ok: boolean;
  errors: Record<string, string>;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeConfig(raw: unknown): WecomConfig {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<WecomConfig>;
  const fields: Partial<Record<WecomFieldKey, string>> = {};

  const storedFields = source.fields && typeof source.fields === 'object' ? source.fields : {};
  for (const def of WECOM_FIELD_DEFS) {
    const value = (storedFields as Record<string, unknown>)[def.key];
    if (typeof value === 'string' && value.trim()) fields[def.key] = value.trim();
  }

  const timeout = typeof source.timeoutMs === 'number' && Number.isFinite(source.timeoutMs)
    ? clamp(Math.round(source.timeoutMs), 3000, 30000)
    : DEFAULT_WECOM_CONFIG.timeoutMs;

  return {
    version: 1,
    enabled: typeof source.enabled === 'boolean' ? source.enabled : DEFAULT_WECOM_CONFIG.enabled,
    webhookUrl: typeof source.webhookUrl === 'string' ? source.webhookUrl.trim() : '',
    fields,
    includeSnapshot: typeof source.includeSnapshot === 'boolean'
      ? source.includeSnapshot
      : DEFAULT_WECOM_CONFIG.includeSnapshot,
    stripQuery: typeof source.stripQuery === 'boolean'
      ? source.stripQuery
      : DEFAULT_WECOM_CONFIG.stripQuery,
    reporter: typeof source.reporter === 'string' ? source.reporter.trim() : '',
    timeoutMs: timeout,
  };
}

export async function readConfig(): Promise<WecomConfig> {
  try {
    const stored = await chrome.storage.local.get(WECOM_CONFIG_KEY);
    return normalizeConfig(stored[WECOM_CONFIG_KEY]);
  } catch {
    return { ...DEFAULT_WECOM_CONFIG, fields: {} };
  }
}

export async function writeConfig(config: WecomConfig): Promise<void> {
  await chrome.storage.local.set({ [WECOM_CONFIG_KEY]: normalizeConfig(config) });
}

/** URL 非法时返回错误文案，合法返回 null */
export function validateWebhookUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return '请填写 Webhook 地址';
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return 'Webhook 地址格式不正确';
  }
  if (url.protocol !== 'https:') return 'Webhook 必须使用 https';
  if (url.hostname !== WECOM_WEBHOOK_HOST) return `Webhook 域名必须是 ${WECOM_WEBHOOK_HOST}`;
  if (url.pathname !== WECOM_WEBHOOK_PATH) return `Webhook 路径必须是 ${WECOM_WEBHOOK_PATH}`;
  if (!url.searchParams.get('key')) return 'Webhook 缺少 key 参数';
  return null;
}

/** 脱敏展示：保留 host / path，key 只露首尾 4 位 */
export function maskWebhook(raw: string): string {
  const value = raw.trim();
  if (!value) return '未配置';
  try {
    const url = new URL(value);
    const key = url.searchParams.get('key') ?? '';
    if (key) {
      const masked = key.length > 8 ? `${key.slice(0, 4)}…${key.slice(-4)}` : '••••';
      url.searchParams.set('key', masked);
    }
    return url.toString().replace('%E2%80%A6', '…');
  } catch {
    return '未配置';
  }
}

export function validateConfig(config: WecomConfig): ConfigValidation {
  const errors: Record<string, string> = {};
  const urlError = validateWebhookUrl(config.webhookUrl);
  if (urlError) errors.webhookUrl = urlError;

  const seen = new Map<string, WecomFieldKey>();
  for (const def of WECOM_FIELD_DEFS) {
    const fieldId = (config.fields[def.key] ?? '').trim();
    if (def.required && !fieldId) {
      errors[`field:${def.key}`] = `请填写「${def.label}」的 FIELD_ID`;
      continue;
    }
    if (!fieldId) continue;
    const previous = seen.get(fieldId);
    if (previous) {
      errors[`field:${def.key}`] = `与「${WECOM_FIELD_LABEL[previous]}」填了同一个 FIELD_ID`;
    } else {
      seen.set(fieldId, def.key);
    }
  }

  if (!Number.isFinite(config.timeoutMs) || config.timeoutMs < 3000 || config.timeoutMs > 30000) {
    errors.timeoutMs = '超时需在 3–30 秒之间';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/** 上报前的配置检查：返回 null 表示可以发送 */
export function checkConfigForSync(config: WecomConfig): WecomSyncFailure | null {
  if (!config.enabled) {
    return {
      ok: false,
      code: 'config_disabled',
      message: '企微同步未开启，请先在插件右上角「设置 → 配置企微同步」中开启并保存',
      retryable: false,
    };
  }
  const validation = validateConfig(config);
  if (!validation.ok) {
    const first = Object.values(validation.errors)[0] ?? '配置不完整';
    return { ok: false, code: 'config_invalid', message: first, retryable: false };
  }
  return null;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function cleanUrl(raw: string, stripQuery: boolean): string {
  try {
    const url = new URL(raw);
    if (stripQuery) {
      url.hash = '';
      url.search = '';
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function linkText(url: string): string {
  try {
    const parsed = new URL(url);
    return truncate(`${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`, 80);
  } catch {
    return truncate(url, 80);
  }
}

function base64Of(dataUrl?: string): string | null {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  return dataUrl.slice(comma + 1);
}

/** 按字段映射组装一条 add_records 的 values；必填的评论内容为空时返回 null */
export function buildRecordValues(
  thread: CommentThread,
  context: WecomReportContext,
  config: WecomConfig
): Record<string, unknown> | null {
  const body = thread.body.trim();
  if (!body) return null;

  const values: Record<string, unknown> = {};
  const putText = (key: WecomFieldKey, value?: string, max = 500) => {
    const fieldId = config.fields[key];
    if (!fieldId || !value) return;
    const text = truncate(String(value).trim(), max);
    if (text) values[fieldId] = text;
  };

  putText('commentId', thread.id, 120);
  putText('body', body, 10000);
  putText('pageTitle', context.pageTitle, 300);
  putText('site', thread.page, 300);
  putText('selector', thread.identity.selector, 1000);
  putText('domPath', thread.identity.path, 2000);
  putText('elementText', thread.identity.text, 60);
  putText('component', thread.identity.component
    ? `${thread.identity.component}${thread.identity.source ? ` (${thread.identity.source})` : ''}`
    : undefined, 500);

  const urlFieldId = config.fields.url;
  if (urlFieldId) {
    const link = cleanUrl(thread.url, config.stripQuery);
    values[urlFieldId] = [{ text: linkText(link), link }];
  }

  const createdAtFieldId = config.fields.createdAt;
  if (createdAtFieldId) values[createdAtFieldId] = String(thread.createdAt);

  const snapshotFieldId = config.fields.snapshot;
  const image = config.includeSnapshot ? base64Of(thread.snapshot) : null;
  if (snapshotFieldId && image) {
    values[snapshotFieldId] = [{ title: truncate(thread.identity.selector || '评论截图', 40), image_base64: image }];
  }

  const statusFieldId = config.fields.status;
  if (statusFieldId) values[statusFieldId] = [{ text: '待处理' }];

  const reporterFieldId = config.fields.reporter;
  if (reporterFieldId && config.reporter) values[reporterFieldId] = config.reporter;

  return values;
}

/** 测试记录用的示例截图：64×64 绿底白边 PNG，用来验证图片列是否可写入 */
const TEST_SNAPSHOT_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAbElEQVR4nO3PQQ2AQBAEwVNwOlGIveODAx6VJT1pAVPrDN/SB77uBez7GlcAXQBdAF0AXQBdAF0AXQBdAF0AXQBdAF0AXQBdAF0AXQBdAF0AXQBdAF0AXQBdAF0AXQBdAF0AXQDdvwBzNx7wANjXRjv3XfYeAAAAAElFTkSuQmCC';

/** 配置页「发送测试记录」用的固定数据 */
export function buildTestValues(config: WecomConfig, now = Date.now()): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const putText = (key: WecomFieldKey, value: string) => {
    const fieldId = config.fields[key];
    if (fieldId) values[fieldId] = value;
  };

  putText('commentId', `test_${now}`);
  putText('body', 'Inspect Lab 连接测试');
  putText('pageTitle', 'Inspect Lab 连接测试');
  putText('site', 'https://example.com');
  putText('selector', 'body');
  putText('domPath', 'body');
  putText('elementText', '测试记录');
  putText('createdAt', String(now));

  const urlFieldId = config.fields.url;
  if (urlFieldId) {
    values[urlFieldId] = [{ text: 'example.com/inspect-lab', link: 'https://example.com/inspect-lab' }];
  }
  const statusFieldId = config.fields.status;
  if (statusFieldId) values[statusFieldId] = [{ text: '待处理' }];
  const reporterFieldId = config.fields.reporter;
  if (reporterFieldId && config.reporter) values[reporterFieldId] = config.reporter;

  // 让「发送测试记录」也能验证图片字段
  const snapshotFieldId = config.fields.snapshot;
  if (config.includeSnapshot && snapshotFieldId) {
    values[snapshotFieldId] = [{ title: '测试截图', image_base64: TEST_SNAPSHOT_BASE64 }];
  }

  return values;
}

/** 字段名归一化：忽略大小写、空白和常见分隔符 */
function normalizeFieldTitle(raw: string): string {
  return raw.replace(/[\s\u3000:：/\\\-_]/g, '').toLowerCase();
}

/** 企微智能表格的 field_id：fldxxxx 或 6 位以上十六进制（如 f0e1ac） */
function looksLikeFieldId(raw: string): boolean {
  const value = raw.trim();
  return /^fld[\w-]{2,}$/i.test(value) || /^[0-9a-f]{6,}$/i.test(value);
}

const FIELD_ALIASES: Record<WecomFieldKey, string[]> = {
  commentId: ['评论编号', '评论id', 'commentid', 'id'],
  body: ['评论', '内容', '评论正文'],
  url: ['链接', '页面url', '页面地址', 'url'],
  pageTitle: ['标题', '页面名', 'pagetitle'],
  site: ['网站', '页面路径', 'site'],
  selector: ['选择器', 'css选择器', 'selector'],
  domPath: ['路径', 'dom', 'dom路径'],
  elementText: ['文案', '元素文本', '文本', 'elementtext'],
  component: ['组件', '源码', '组件源码', 'component'],
  createdAt: ['时间', '创建时间', '评论时间', 'createdat'],
  snapshot: ['截图', '图片', '评论截图', 'snapshot'],
  status: ['状态', '处理状态', 'status'],
  reporter: ['上报人', '提报人', '报告人', 'reporter'],
};

let titleIndex: Map<string, WecomFieldKey> | null = null;

function fieldKeyByTitle(raw: string): WecomFieldKey | undefined {
  if (!titleIndex) {
    titleIndex = new Map();
    for (const def of WECOM_FIELD_DEFS) {
      titleIndex.set(normalizeFieldTitle(def.label), def.key);
      for (const alias of FIELD_ALIASES[def.key]) {
        const key = normalizeFieldTitle(alias);
        if (!titleIndex.has(key)) titleIndex.set(key, def.key);
      }
    }
  }
  return titleIndex.get(normalizeFieldTitle(raw));
}

interface ParsedFieldEntry {
  id: string;
  title?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function toTitle(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function entriesFromJson(data: unknown): ParsedFieldEntry[] {
  const entries: ParsedFieldEntry[] = [];
  const push = (id: unknown, title: unknown) => {
    if (typeof id !== 'string' || !id.trim()) return;
    entries.push({ id: id.trim(), title: toTitle(title) });
  };

  const fromFieldObject = (item: unknown) => {
    const record = asRecord(item);
    if (!record) return;
    push(
      record.field_id ?? record.fieldId ?? record.id,
      record.field_title ?? record.fieldTitle ?? record.title ?? record.name
    );
  };

  if (Array.isArray(data)) {
    data.forEach(fromFieldObject);
    return entries;
  }

  const root = asRecord(data);
  if (!root) return entries;

  if (Array.isArray(root.fields)) {
    root.fields.forEach(fromFieldObject);
    return entries;
  }

  // 企微「接收外部数据」的示例数据：schema 里带字段名，add_records 里只有值
  const schema = asRecord(root.schema);
  if (schema) {
    for (const [id, meta] of Object.entries(schema)) {
      const record = asRecord(meta);
      if (record) push(id, record.title ?? record.field_title ?? record.fieldTitle ?? record.name);
    }
    if (entries.length) return entries;
  }

  // 只有 field_id、没有字段名的示例数据
  const valuesList = Array.isArray(root.add_records)
    ? root.add_records.map(item => asRecord(asRecord(item)?.values)).filter(Boolean)
    : [asRecord(root.values)].filter(Boolean);
  const valueMap = valuesList.find(values => values && Object.keys(values).length) as Record<string, unknown> | undefined;
  if (valueMap) {
    Object.keys(valueMap).forEach(id => push(id, undefined));
    return entries;
  }

  // 简单键值映射：{"评论内容":"fldxxx"} 或 {"fldxxx":"评论内容"}
  for (const [key, value] of Object.entries(root)) {
    if (typeof value !== 'string') continue;
    if (looksLikeFieldId(key)) push(key, value);
    else if (looksLikeFieldId(value)) push(value, key);
  }

  return entries;
}

function entriesFromLines(text: string): ParsedFieldEntry[] {
  const entries: ParsedFieldEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    let segments = line.split(/[\t,，;；|]+/).map(part => part.trim()).filter(Boolean);
    if (segments.length === 1) segments = segments[0].split(/\s+/).filter(Boolean);
    const id = segments.find(looksLikeFieldId);
    if (!id) continue;
    const title = segments.find(part => part !== id && !looksLikeFieldId(part));
    entries.push({ id, title });
  }
  return entries;
}

export interface FieldMapParseResult {
  /** 可直接合并进 config.fields 的映射 */
  matched: Partial<Record<WecomFieldKey, string>>;
  /** 解析到但没匹配上任何已知字段的标题 */
  unmatchedTitles: string[];
  /** 解析到的 field_id 总数（含没有字段名的） */
  entryCount: number;
  error?: string;
}

/**
 * 解析用户粘贴的字段列表 / 示例数据，按字段名自动匹配 13 项映射。
 * 支持：企微 get_fields 返回的 {fields:[{field_id, field_title}]}、
 * 直接数组、{"评论内容":"fldxxx"} 映射、以及「字段名 + FIELD_ID」两列文本。
 */
export function parseFieldMapText(raw: string): FieldMapParseResult {
  const text = raw.trim();
  if (!text) {
    return { matched: {}, unmatchedTitles: [], entryCount: 0, error: '请先粘贴字段列表或示例数据' };
  }

  let entries: ParsedFieldEntry[];
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      entries = entriesFromJson(JSON.parse(text));
    } catch {
      return { matched: {}, unmatchedTitles: [], entryCount: 0, error: 'JSON 格式有误，请检查括号和引号' };
    }
  } else {
    entries = entriesFromLines(text);
  }

  // 同一个 field_id 只取第一次出现
  const seenIds = new Set<string>();
  const unique = entries.filter(entry => {
    if (seenIds.has(entry.id)) return false;
    seenIds.add(entry.id);
    return true;
  });

  const matched: Partial<Record<WecomFieldKey, string>> = {};
  const unmatchedTitles: string[] = [];
  const usedKeys = new Set<WecomFieldKey>();

  for (const entry of unique) {
    if (!entry.title) continue;
    const key = fieldKeyByTitle(entry.title);
    if (!key) {
      if (!unmatchedTitles.includes(entry.title)) unmatchedTitles.push(entry.title);
      continue;
    }
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    matched[key] = entry.id;
  }

  if (!unique.length) {
    return {
      matched,
      unmatchedTitles,
      entryCount: 0,
      error: '没有识别到 FIELD_ID，请检查粘贴内容',
    };
  }

  return { matched, unmatchedTitles, entryCount: unique.length };
}

const ERROR_MAP: Record<number, { message: string; retryable: boolean }> = {
  40001: { message: 'Webhook 凭证无效或已停用，请重新生成', retryable: false },
  40014: { message: 'Webhook 凭证无效或已停用，请重新生成', retryable: false },
  42001: { message: 'Webhook 凭证已过期，请重新生成', retryable: false },
  40058: { message: '字段映射或字段类型不匹配，请检查 FIELD_ID', retryable: false },
  40056: { message: '请求参数不合法，请检查字段映射', retryable: false },
  60020: { message: '当前出口 IP 不在 Webhook 白名单内', retryable: false },
  45009: { message: '触发频率限制，请稍后重试', retryable: true },
  50001: { message: '企业微信服务暂不可用，请稍后重试', retryable: true },
};

export function mapWecomError(errcode: number, errmsg: string): WecomSyncFailure {
  const known = ERROR_MAP[errcode];
  return {
    ok: false,
    code: String(errcode),
    message: known?.message ?? (errmsg || `企微返回错误 ${errcode}`),
    retryable: known?.retryable ?? false,
  };
}

/** 发一条（或多条）记录；所有结果都转成统一协议，不抛错 */
export async function postRecords(
  config: WecomConfig,
  valuesList: Record<string, unknown>[]
): Promise<WecomSyncResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const started = Date.now();

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ add_records: valuesList.map(values => ({ values })) }),
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: {
      errcode?: number;
      errmsg?: string;
      add_records?: Array<{ record_id?: string }>;
    } | null = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        code: `http_${response.status}`,
        message: `企业微信返回 HTTP ${response.status}`,
        retryable: response.status >= 500 || response.status === 429,
      };
    }

    if (!payload || typeof payload.errcode !== 'number') {
      return {
        ok: false,
        code: 'bad_response',
        message: 'Webhook 返回了无法解析的内容',
        retryable: true,
      };
    }

    if (payload.errcode !== 0) {
      return mapWecomError(payload.errcode, String(payload.errmsg ?? ''));
    }

    const record = Array.isArray(payload.add_records) ? payload.add_records[0] : undefined;
    const recordId = record?.record_id ? String(record.record_id) : null;
    console.debug('[wecom-sync] ok', { ms: Date.now() - started, recordId });
    return { ok: true, recordId };
  } catch (error) {
    const name = (error as Error)?.name;
    const timedOut = name === 'AbortError';
    console.info('[wecom-sync] failed', {
      ms: Date.now() - started,
      code: timedOut ? 'timeout' : 'network',
    });
    return {
      ok: false,
      code: timedOut ? 'timeout' : 'network',
      message: timedOut
        ? `请求超过 ${Math.round(config.timeoutMs / 1000)} 秒未返回`
        : '网络错误，无法连接企业微信',
      retryable: true,
    };
  } finally {
    clearTimeout(timer);
  }
}
