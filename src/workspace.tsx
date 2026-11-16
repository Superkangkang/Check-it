// DeLab Workspace — 独立设备预览标签页：左侧设备画布 + 右侧样式面板

import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingPanel, StylePayload } from './components/FloatingPanel';
import { CommentThread, toMarkdown } from './comment-store';
import { ThemeManager, SANS, MONO } from './theme';
import { isValidValue } from './style-writer';
import { injectFonts } from './fonts';
import { SunIcon, MoonIcon } from './components/Icon';
import type { DomNode } from './panel-bridge';

const themeManager = new ThemeManager();
injectFonts();

type Mode = 'inspect' | 'comment' | 'browse';

type PanelState = {
  visible: boolean;
  mode: 'empty' | 'content';
  view: 'style' | 'comments';
  data: StylePayload | null;
  activeCommentId: string | null;
  url: string;
};

const EMPTY_PANEL: PanelState = {
  visible: false,
  mode: 'empty',
  view: 'style',
  data: null,
  activeCommentId: null,
  url: '',
};

const PRESETS = [
  { label: '375 × 812', kind: '手机', width: 375, height: 812 },
  { label: '390 × 844', kind: '手机', width: 390, height: 844 },
  { label: '768 × 1024', kind: '平板', width: 768, height: 1024 },
  { label: '1280 × 800', kind: '笔记本', width: 1280, height: 800 },
  { label: '1440 × 900', kind: '桌面', width: 1440, height: 900 },
];

type ModeItem = { key: Mode; label: string; shortcut: string; icon: React.ReactNode };

const MODES: ModeItem[] = [
  {
    key: 'inspect',
    label: '走查',
    shortcut: 'C',
    icon: (
      <svg width="16" height="16" viewBox="0 0 48 48" fill="none" stroke="currentColor"
        strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M38 24C38 31.732 31.732 38 24 38C16.268 38 10 31.732 10 24C10 16.268 16.268 10 24 10C31.732 10 38 16.268 38 24Z" />
        <path d="M24 4V12M24 36V44M4 24H12M36 24H44" />
      </svg>
    ),
  },
  {
    key: 'comment',
    label: '评论',
    shortcut: 'M',
    icon: (
      <svg width="16" height="16" viewBox="0 0 48 48" fill="none" stroke="currentColor"
        strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M42 30C42 31.0609 41.5786 32.0783 40.8284 32.8284C40.0783 33.5786 39.0609 34 38 34H14L6 42V10C6 8.93913 6.42143 7.92172 7.17157 7.17157C7.92172 6.42143 8.93913 6 10 6H38C39.0609 6 40.0783 6.42143 40.8284 7.17157C41.5786 7.92172 42 8.93913 42 10V30Z" />
      </svg>
    ),
  },
  {
    key: 'browse',
    label: '浏览',
    shortcut: 'A',
    icon: (
      <svg width="16" height="16" viewBox="0 0 48 48" fill="none" stroke="currentColor"
        strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M42 24C42 33.9411 33.9411 42 24 42C14.0589 42 6 33.9411 6 24C6 14.0589 14.0589 6 24 6C33.9411 6 42 14.0589 42 24Z" />
        <path d="M6 24H42" />
        <path d="M24 6C27.8947 11.1929 30 17.5089 30 24C30 30.4911 27.8947 36.8071 24 42C20.1053 36.8071 18 30.4911 18 24C18 17.5089 20.1053 11.1929 24 6Z" />
      </svg>
    ),
  },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
/** 非「适应画布」时画布四周的留白 */
const CANVAS_PAD = 24;

/** 预览 iframe 的沙箱能力：不给 allow-top-navigation，防止页面把工作区顶掉 */
const FRAME_SANDBOX = [
  'allow-scripts',
  'allow-same-origin',
  'allow-forms',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-modals',
  'allow-downloads',
].join(' ');

function readParams() {
  const params = new URLSearchParams(location.search);
  return {
    url: params.get('url') ?? '',
    width: clamp(Number(params.get('w')) || 375, 240, 3840),
    height: clamp(Number(params.get('h')) || 812, 400, 2160),
    fit: params.get('fit') === '1',
  };
}

function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement('textarea');
  area.value = text;
  area.style.cssText = 'position: fixed; top: 0; left: 0; opacity: 0;';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
  return Promise.resolve();
}

/** 顶栏尺寸控制器：当前尺寸 + 预设 / 自定义下拉 */
function SizeControl({
  size, open, onToggle, menuRef, toggleRef, onPick,
  draftWidth, draftHeight, onDraftWidth, onDraftHeight, onApply,
  fit, fitSize, onFit,
}: {
  size: { width: number; height: number };
  open: boolean;
  onToggle: () => void;
  menuRef: React.RefObject<HTMLDivElement>;
  toggleRef: React.RefObject<HTMLButtonElement>;
  onPick: (width: number, height: number) => void;
  draftWidth: string;
  draftHeight: string;
  onDraftWidth: (value: string) => void;
  onDraftHeight: (value: string) => void;
  onApply: () => void;
  fit: boolean;
  fitSize: { width: number; height: number };
  onFit: () => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: 0,
    minWidth: 0,
    flex: '1 1 0',
    height: 26,
    padding: '0 6px',
    borderRadius: 6,
    border: '1px solid var(--delab-field-border, rgba(0,0,0,0.12))',
    background: 'var(--delab-field-bg, #ffffff)',
    color: 'var(--delab-text, #141416)',
    fontFamily: MONO,
    fontSize: 10,
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        ref={toggleRef}
        type="button"
        onClick={onToggle}
        title="调整视口尺寸"
        style={{
          appearance: 'none',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 28,
          padding: '0 8px',
          borderRadius: 6,
          border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
          background: 'var(--delab-field-bg, #ffffff)',
          color: 'var(--delab-text, #141416)',
          fontFamily: MONO,
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        {size.width} × {size.height}
        <svg width="9" height="9" viewBox="0 0 48 48" fill="none" stroke="currentColor"
          strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: 'var(--delab-text-tertiary, #8a8a90)' }} aria-hidden="true">
          <path d="M14 20L24 30L34 20" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 30,
            width: 236,
            padding: 8,
            borderRadius: 10,
            background: 'var(--delab-elevated, #ffffff)',
            border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
            boxShadow: 'var(--delab-shadow, 0 12px 32px rgba(0,0,0,0.24))',
          }}
        >
          <div style={{
            padding: '2px 6px 6px',
            fontSize: 10,
            color: 'var(--delab-text-tertiary, #8a8a90)',
          }}>
            视口尺寸
          </div>

          <button
            type="button"
            onClick={onFit}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              height: 28,
              padding: '0 8px',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              background: fit ? 'var(--delab-row-hover, rgba(0,0,0,0.045))' : 'transparent',
              color: fit ? 'var(--delab-accent, #0eb668)' : 'var(--delab-text-secondary, #57575e)',
              fontFamily: SANS,
              fontSize: 11,
            }}
          >
            <span>适应画布</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: 'inherit' }}>
              {fitSize.width} × {fitSize.height}
            </span>
          </button>

          <div style={{
            height: 1,
            margin: '4px 4px',
            background: 'var(--delab-border, rgba(0,0,0,0.08))',
          }} />

          {PRESETS.map(preset => {
            const active = size.width === preset.width && size.height === preset.height;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onPick(preset.width, preset.height)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  height: 28,
                  padding: '0 8px',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: active ? 'var(--delab-row-hover, rgba(0,0,0,0.045))' : 'transparent',
                  color: active ? 'var(--delab-accent, #0eb668)' : 'var(--delab-text-secondary, #57575e)',
                  fontFamily: SANS,
                  fontSize: 11,
                }}
              >
                <span>{preset.kind}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: 'inherit' }}>{preset.label}</span>
              </button>
            );
          })}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 4,
            padding: '8px 4px 2px',
            borderTop: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
          }}>
            <input
              type="number"
              value={draftWidth}
              onChange={e => onDraftWidth(e.target.value)}
              aria-label="视口宽度"
              style={inputStyle}
            />
            <span style={{ fontSize: 10, color: 'var(--delab-text-tertiary, #8a8a90)' }}>×</span>
            <input
              type="number"
              value={draftHeight}
              onChange={e => onDraftHeight(e.target.value)}
              aria-label="视口高度"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={onApply}
              style={{
                appearance: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0 10px',
                height: 26,
                borderRadius: 6,
                background: 'var(--delab-btn-bg, #141416)',
                color: 'var(--delab-btn-text, #ffffff)',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              应用
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 顶栏模式按钮：独立的方形图标按钮，选中态为实心块 */
function ModeButton({
  item, active, onClick,
}: {
  item: ModeItem;
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`${item.label} (${item.shortcut})`}
      aria-label={`${item.label} (${item.shortcut})`}
      aria-pressed={active}
      style={{
        appearance: 'none',
        border: 'none',
        cursor: 'pointer',
        width: 26,
        height: 26,
        padding: 0,
        flexShrink: 0,
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active
          ? 'var(--delab-btn-bg, #141416)'
          : hover
            ? 'var(--delab-row-hover, rgba(0,0,0,0.045))'
            : 'transparent',
        color: active ? 'var(--delab-btn-text, #ffffff)' : 'var(--delab-text-secondary, #57575e)',
        transition: 'background 0.12s ease, color 0.12s ease',
      }}
    >
      {item.icon}
    </button>
  );
}

function DomTreeRow({
  node, depth, expanded, selected, onToggle, onSelect, onHover,
}: {
  node: DomNode;
  depth: number;
  expanded: Set<string>;
  selected: string | null;
  onToggle: (key: string) => void;
  onSelect: (node: DomNode) => void;
  onHover: (path: number[] | null) => void;
}) {
  const [hover, setHover] = useState(false);
  const key = node.path.join('/');
  const open = expanded.has(key);
  const hasChildren = Boolean(node.children && node.children.length);
  return (
    <>
      <div
        data-dom-key={key}
        onClick={() => onSelect(node)}
        onMouseEnter={() => { setHover(true); onHover(node.path); }}
        onMouseLeave={() => { setHover(false); onHover(null); }}
        title={`<${node.tag}>${node.id ? `#${node.id}` : ''}${node.cls ? `.${node.cls}` : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          height: 24,
          paddingLeft: 4 + depth * 14,
          paddingRight: 8,
          cursor: 'default',
          background: selected === key
            ? 'var(--delab-sel, rgba(0,0,0,0.07))'
            : hover
              ? 'var(--delab-row-hover, rgba(0,0,0,0.045))'
              : 'transparent',
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            if (hasChildren) onToggle(key);
          }}
          aria-label={open ? '收起' : '展开'}
          style={{
            appearance: 'none',
            border: 'none',
            background: 'transparent',
            width: 16,
            height: 24,
            padding: 0,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: hasChildren ? 'pointer' : 'default',
            color: 'var(--delab-text-tertiary, #8a8a90)',
          }}
        >
          {hasChildren && (
            <svg width="8" height="8" viewBox="0 0 48 48" fill="none" stroke="currentColor"
              strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={open ? 'M10 18L24 32L38 18' : 'M18 10L32 24L18 38'} />
            </svg>
          )}
        </button>
        <span style={{
          fontFamily: MONO,
          fontSize: 11,
          color: 'var(--delab-text, #141416)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          &lt;{node.tag}&gt;
        </span>
        {node.id && (
          <span style={{
            fontFamily: MONO,
            fontSize: 11,
            color: 'var(--delab-text-secondary, #57575e)',
            whiteSpace: 'nowrap',
            flexShrink: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            #{node.id}
          </span>
        )}
        {node.cls && (
          <span style={{
            fontFamily: MONO,
            fontSize: 11,
            color: 'var(--delab-text-tertiary, #8a8a90)',
            whiteSpace: 'nowrap',
            flexShrink: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            .{node.cls}
          </span>
        )}
      </div>
      {open && node.children?.map(child => (
        <DomTreeRow
          key={child.path.join('/')}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          selected={selected}
          onToggle={onToggle}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </>
  );
}

function WorkspaceApp() {
  const params = useMemo(readParams, []);
  const [size, setSize] = useState({ width: params.width, height: params.height });
  const [fitCanvas, setFitCanvas] = useState(params.fit);
  const [url, setUrl] = useState(params.url);
  const [urlDraft, setUrlDraft] = useState(params.url);
  const [leftWidth, setLeftWidth] = useState(260);
  const [domTree, setDomTree] = useState<DomNode[]>([]);
  const [domExpanded, setDomExpanded] = useState<Set<string>>(() => new Set(['']));
  const [domSelected, setDomSelected] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(360);
  const [mode, setMode] = useState<Mode>('inspect');
  const [theme, setTheme] = useState(themeManager.getTheme());
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [panel, setPanel] = useState<PanelState>(EMPTY_PANEL);
  const [comments, setComments] = useState<CommentThread[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const [draftWidth, setDraftWidth] = useState(String(params.width));
  const [draftHeight, setDraftHeight] = useState(String(params.height));

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const tokenRef = useRef('');
  const modeRef = useRef<Mode>('inspect');
  const pingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sizeMenuRef = useRef<HTMLDivElement>(null);
  const sizeToggleRef = useRef<HTMLButtonElement>(null);
  const domScrollRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  const applyUrl = () => {
    const next = urlDraft.trim();
    if (!next || next === url) return;
    if (!/^https:\/\//i.test(next)) {
      showToast('请输入 https 开头的链接');
      return;
    }
    setUrlDraft(next);
    setUrl(next);
    setConnected(false);
    setLoading(true);
    setBlocked(false);
    setPanel(EMPTY_PANEL);
    setComments([]);
  };

  useEffect(() => {
    void chrome.tabs.getCurrent().then(tab => {
      tabRef.current = tab?.id ?? null;
    }).catch(() => {});
  }, []);

  // 记住上次使用的显式视口尺寸，供切换预设时参考
  useEffect(() => {
    if (fitCanvas) return;
    void chrome.storage.local.set({ 'delab-workspace-size': size }).catch(() => {});
  }, [size, fitCanvas]);

  // 来自 iframe 内 content script 的面板数据
  useEffect(() => {
    const onMessage = (
      message: { type?: string; scope?: string; [key: string]: unknown },
      sender: chrome.runtime.MessageSender
    ) => {
      if (!tabRef.current || sender.tab?.id !== tabRef.current) return;
      if (message.scope !== 'workspace') return;
      if (typeof sender.frameId === 'number') frameRef.current = sender.frameId;

      if (message.type === 'PANEL_STATE') {
        const data = (message.data as StylePayload | null) ?? null;
        setPanel({
          visible: Boolean(message.visible),
          mode: message.mode === 'content' ? 'content' : 'empty',
          view: message.view === 'comments' ? 'comments' : 'style',
          data,
          activeCommentId: (message.activeCommentId as string | null) ?? null,
          url: String(message.url ?? ''),
        });
        if (data && Array.isArray(data.domPath)) {
          const domPath = data.domPath;
          setDomSelected(domPath.join('/'));
          setDomExpanded(prev => {
            const next = new Set(prev);
            next.add('');
            let prefix: number[] = [];
            for (const index of domPath.slice(0, -1)) {
              prefix = [...prefix, index];
              next.add(prefix.join('/'));
            }
            return next;
          });
        }
        return;
      }
      if (message.type === 'PANEL_DOM') {
        setDomTree((message.tree as DomNode[]) ?? []);
        return;
      }
      if (message.type === 'PANEL_COMMENTS') {
        setComments((message.comments as CommentThread[]) ?? []);
        setPanel(prev => ({
          ...prev,
          activeCommentId: (message.activeCommentId as string | null) ?? null,
        }));
      }
    };

    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, []);

  // 页面里选中元素后，把左侧树滚动到对应节点，并让它停在面板中间（树替换或展开后都要重试）
  useEffect(() => {
    if (domSelected === null) return;
    const raf = requestAnimationFrame(() => {
      const container = domScrollRef.current;
      const row = container?.querySelector<HTMLElement>(`[data-dom-key="${domSelected}"]`);
      if (!container || !row) return;
      const containerRect = container.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const top = container.scrollTop
        + (rowRect.top - containerRect.top)
        - (container.clientHeight - rowRect.height) / 2;
      container.scrollTo({ top: Math.max(0, top) });
    });
    return () => cancelAnimationFrame(raf);
  }, [domSelected, domExpanded, domTree]);

  // iframe 内容尺寸变化时重算缩放
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) setBox({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fitCanvasSize = {
    width: box.width > 0
      ? Math.max(1, Math.round(box.width) + (fitCanvas ? 0 : CANVAS_PAD * 2))
      : 375,
    height: box.height > 0
      ? Math.max(1, Math.round(box.height) + (fitCanvas ? 0 : CANVAS_PAD * 2))
      : 812,
  };
  const effectiveSize = fitCanvas ? fitCanvasSize : size;
  const fitWidth = box.width > 0 ? box.width / effectiveSize.width : 1;
  const fitHeight = box.height > 0 ? box.height / effectiveSize.height : 1;
  const scale = fitCanvas ? 1 : clamp(Math.min(1, fitWidth, fitHeight), 0.08, 1);

  const sendCommand = useCallback((command: string, payload: Record<string, unknown> = {}) => {
    const id = tabRef.current;
    if (id == null || frameRef.current === 0) return;
    void chrome.tabs
      .sendMessage(id, { type: 'PANEL_COMMAND', command, ...payload }, { frameId: frameRef.current })
      .catch(() => {});
  }, []);

  const stopPing = () => {
    if (pingTimer.current) clearTimeout(pingTimer.current);
    pingTimer.current = null;
  };

  const ensureInjected = useCallback(async () => {
    const id = tabRef.current;
    if (id == null) return;
    try {
      const frames = await chrome.webNavigation.getAllFrames({ tabId: id });
      const child = frames?.find(frame => frame.frameId !== 0 && frame.parentFrameId === 0);
      if (!child) return;
      // 幂等：content script 内有 __delabPreviewChild 标记
      await chrome.scripting.executeScript({
        target: { tabId: id, frameIds: [child.frameId] },
        files: ['content-script.js'],
      }).catch(() => {});
    } catch { /* ignore */ }
  }, []);

  const startHandshake = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    stopPing();

    const token = `ws_${Math.random().toString(36).slice(2)}`;
    tokenRef.current = token;
    setConnected(false);
    setBlocked(false);
    setLoading(true);
    setPanel(EMPTY_PANEL);
    setComments([]);
    setDomTree([]);
    setDomSelected(null);
    frameRef.current = 0;

    let attempts = 0;
    const ping = () => {
      if (tokenRef.current !== token) return;
      attempts++;
      if (attempts === 1 || attempts === 4) void ensureInjected();
      try {
        iframe.contentWindow?.postMessage({ type: 'DELAB_PREVIEW_INIT', token, mode: modeRef.current }, '*');
      } catch { /* ignore */ }
      if (attempts > 33) {
        setLoading(false);
        setBlocked(true);
        return;
      }
      pingTimer.current = setTimeout(ping, 300);
    };
    ping();
  }, [ensureInjected]);

  // READY：iframe 内的 content script 已激活
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;
      const data = event.data as { type?: string; token?: string; mode?: Mode } | null;
      if (
        data?.type === 'DELAB_PREVIEW_MODE_REQUEST'
        && (data.mode === 'inspect' || data.mode === 'comment' || data.mode === 'browse')
      ) {
        setMode(data.mode);
        modeRef.current = data.mode;
        try {
          iframe.contentWindow?.postMessage({ type: 'DELAB_PREVIEW_MODE', mode: data.mode }, '*');
        } catch { /* ignore */ }
        return;
      }
      if (data?.type === 'DELAB_PREVIEW_READY' && data.token === tokenRef.current) {
        stopPing();
        setConnected(true);
        setLoading(false);
        setBlocked(false);
        try {
          iframe.contentWindow?.postMessage({ type: 'DELAB_PREVIEW_MODE', mode: modeRef.current }, '*');
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => () => {
    stopPing();
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const changeMode = (next: Mode) => {
    setMode(next);
    modeRef.current = next;
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: 'DELAB_PREVIEW_MODE', mode: next }, '*');
    } catch { /* ignore */ }
  };

  const toggleDom = (key: string) => {
    setDomExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectDom = (node: DomNode) => {
    setDomSelected(node.path.join('/'));
    if (mode !== 'inspect') changeMode('inspect');
    sendCommand('selectDom', { path: node.path });
  };

  const hoverDom = (path: number[] | null) => {
    sendCommand('hoverDom', { path });
  };

  const startLeftResize = (event: React.MouseEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startW = leftWidth;
    const onMove = (e: MouseEvent) => {
      setLeftWidth(clamp(startW + (e.clientX - startX), 220, Math.min(560, window.innerWidth - 420)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
    };
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
  };

  // 快捷键：A 浏览 / C 走查 / M 评论（与上一版一致）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const key = event.key.toLowerCase();
      const next: Mode | null = key === 'a' ? 'browse' : key === 'c' ? 'inspect' : key === 'm' ? 'comment' : null;
      if (!next) return;
      event.preventDefault();
      changeMode(next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleTheme = () => {
    themeManager.toggle();
    setTheme(themeManager.getTheme());
  };

  const applyPreset = (width: number, height: number) => {
    setFitCanvas(false);
    setSize({ width, height });
    setSizeMenuOpen(false);
  };

  const toggleSizeMenu = () => {
    if (!sizeMenuOpen) {
      setDraftWidth(String(effectiveSize.width));
      setDraftHeight(String(effectiveSize.height));
    }
    setSizeMenuOpen(open => !open);
  };

  const applyCustomSize = () => {
    const width = clamp(Math.round(Number(draftWidth)) || effectiveSize.width, 240, 3840);
    const height = clamp(Math.round(Number(draftHeight)) || effectiveSize.height, 400, 2160);
    setFitCanvas(false);
    setSize({ width, height });
    setSizeMenuOpen(false);
  };

  useEffect(() => {
    if (!sizeMenuOpen) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (sizeMenuRef.current?.contains(target) || sizeToggleRef.current?.contains(target)) return;
      setSizeMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [sizeMenuOpen]);

  const startPanelResize = (event: React.MouseEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startW = panelWidth;
    const onMove = (e: MouseEvent) => {
      setPanelWidth(clamp(startW + (startX - e.clientX), 280, Math.min(560, window.innerWidth - 420)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
    };
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
  };

  const copyAll = async () => {
    if (!comments.length) return;
    const openCount = comments.filter(thread => !thread.resolved).length;
    try {
      await writeClipboard(toMarkdown(comments, panel.url || url));
      showToast(`已复制 ${openCount || comments.length} 条评论，粘贴给 AI 即可`);
    } catch {
      showToast('复制失败，请再点一次');
    }
  };

  const closeTab = () => {
    const id = tabRef.current;
    if (id != null) void chrome.tabs.remove(id).catch(() => {});
  };

  const useDebuggerFallback = () => {
    void chrome.runtime
      .sendMessage({ type: 'WORKSPACE_FALLBACK', width: effectiveSize.width, height: effectiveSize.height })
      .catch(() => {});
  };

  const iconBtn: React.CSSProperties = {
    appearance: 'none',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    padding: 5,
    color: 'var(--delab-text-secondary, #57575e)',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--delab-bg, #f5f5f6)',
      color: 'var(--delab-text, #141416)',
      fontFamily: SANS,
    }}>
      {/* 顶栏 */}
      <header style={{
        height: 48,
        flexShrink: 0,
        position: 'relative',
        // 画布里的设备框带 transform，会形成更高的层叠上下文，这里抬高顶栏保证下拉菜单不被盖住
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 10px 0 12px',
        background: 'var(--delab-bg, #f5f5f6)',
        borderBottom: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
      }}>
        <img
          src={chrome.runtime.getURL('icons/logo-128.png')}
          alt=""
          width={20}
          height={20}
          style={{ display: 'block', borderRadius: 5, flexShrink: 0 }}
        />
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap', flexShrink: 0 }}>
          Inspect Lab
        </span>

        {/* 顶部居中：模式切换 + 尺寸 */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {MODES.map(item => (
            <ModeButton
              key={item.key}
              item={item}
              active={mode === item.key}
              onClick={() => changeMode(item.key)}
            />
          ))}

          <span style={{
            width: 1,
            height: 16,
            flexShrink: 0,
            background: 'var(--delab-border, rgba(0,0,0,0.08))',
          }} />

          <SizeControl
            size={effectiveSize}
            open={sizeMenuOpen}
            onToggle={toggleSizeMenu}
            menuRef={sizeMenuRef}
            toggleRef={sizeToggleRef}
            onPick={applyPreset}
            draftWidth={draftWidth}
            draftHeight={draftHeight}
            onDraftWidth={setDraftWidth}
            onDraftHeight={setDraftHeight}
            onApply={applyCustomSize}
            fit={fitCanvas}
            fitSize={fitCanvasSize}
            onFit={() => { setFitCanvas(true); setSizeMenuOpen(false); }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
            style={{
              appearance: 'none',
              cursor: 'pointer',
              position: 'relative',
              width: 42,
              height: 28,
              boxSizing: 'border-box',
              padding: 0,
              flexShrink: 0,
              borderRadius: 999,
              border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
              background: 'var(--delab-field-bg, #ffffff)',
              transition: 'background 0.15s ease',
            }}
          >
            <span style={{
              position: 'absolute',
              top: 3,
              left: theme === 'dark' ? 16 : 4,
              width: 20,
              height: 20,
              boxSizing: 'border-box',
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--delab-bg, #f5f5f6)',
              border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
              color: 'var(--delab-text-secondary, #57575e)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
              transition: 'left 0.15s ease',
            }}>
              {theme === 'dark' ? <MoonIcon size={10} /> : <SunIcon size={10} />}
            </span>
          </button>
        </div>
      </header>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        {/* 左侧 DOM 结构 */}
        <aside style={{
          flex: `0 0 ${leftWidth}px`,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--delab-bg, #f5f5f6)',
        }}>
          <div style={{
            padding: 8,
            borderBottom: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
          }}>
            <input
              type="text"
              value={urlDraft}
              onChange={e => setUrlDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyUrl();
                  e.currentTarget.blur();
                }
              }}
              spellCheck={false}
              aria-label="预览页面链接"
              title="粘贴链接后按回车加载"
              placeholder="粘贴页面链接，回车加载"
              style={{
                width: '100%',
                height: 28,
                boxSizing: 'border-box',
                padding: '0 8px',
                borderRadius: 6,
                background: 'var(--delab-field-bg, #ffffff)',
                border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
                color: 'var(--delab-text, #141416)',
                fontFamily: MONO,
                fontSize: 11,
                outline: 'none',
              }}
            />
          </div>

          {/* 标题行：与样式面板的分组标题同规格 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            margin: '10px 0 8px',
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '-0.01em' }}>DOM</span>
            <button
              type="button"
              onClick={() => sendCommand('refreshDom')}
              title="刷新 DOM 结构"
              style={{ ...iconBtn, marginLeft: 'auto' }}
            >
              <svg width="12" height="12" viewBox="0 0 48 48" fill="none" stroke="currentColor"
                strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M40 24C40 32.8366 32.8366 40 24 40C15.1634 40 8 32.8366 8 24C8 15.1634 15.1634 8 24 8C30.5 8 36 10.8 39.6 15.2" />
                <path d="M40 8V20H28" />
              </svg>
            </button>
          </div>

          <div
            ref={domScrollRef}
            style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', paddingBottom: 8 }}
          >
            {domTree.length > 0 ? domTree.map(node => (
              <DomTreeRow
                key={node.path.join('/') || 'root'}
                node={node}
                depth={0}
                expanded={domExpanded}
                selected={domSelected}
                onToggle={toggleDom}
                onSelect={selectDom}
                onHover={hoverDom}
              />
            )) : (
              <div style={{
                padding: '10px 12px',
                fontSize: 11,
                color: 'var(--delab-text-tertiary, #8a8a90)',
              }}>
                等待页面加载…
              </div>
            )}
          </div>
        </aside>

        {/* 左侧分隔：视觉只有 1px 线，保留加宽的可拖拽区域 */}
        <div
          onMouseDown={startLeftResize}
          style={{
            flex: '0 0 5px',
            position: 'relative',
            cursor: 'ew-resize',
          }}
        >
          <span style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 2,
            width: 1,
            background: 'var(--delab-border, rgba(0,0,0,0.08))',
          }} />
        </div>

        {/* 画布区 */}
        <section style={{
          flex: '1 1 auto',
          minWidth: 0,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}>

          <div
            ref={canvasRef}
            style={{
              flex: '1 1 auto',
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: fitCanvas ? 0 : CANVAS_PAD,
              overflow: 'auto',
              background: 'var(--delab-bg, #f5f5f6)',
              backgroundImage: 'radial-gradient(circle, var(--delab-border, rgba(0,0,0,0.08)) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          >
            <div style={{
              position: 'relative',
              flex: '0 0 auto',
              width: Math.round(effectiveSize.width * scale),
              height: Math.round(effectiveSize.height * scale),
            }}>

              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: effectiveSize.width,
                height: effectiveSize.height,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                boxSizing: 'border-box',
                background: '#ffffff',
                border: 'none',
                borderRadius: fitCanvas ? 0 : 8,
                boxShadow: fitCanvas
                  ? 'none'
                  : '0 0 0 1px var(--delab-border-strong, rgba(0,0,0,0.16)), var(--delab-shadow-float, 0 8px 20px rgba(0,0,0,0.16))',
                overflow: 'hidden',
              }}>
                <iframe
                  ref={iframeRef}
                  src={url || 'about:blank'}
                  title="设备预览"
                  // 站点若检测到自己被嵌入，可能会用 top.location / top.close() 把工作区跳走或关掉；
                  // 沙箱禁用顶层跳转，但保留脚本、同源、表单等能力，不影响走查
                  sandbox={FRAME_SANDBOX}
                  onLoad={startHandshake}
                  style={{ display: 'block', width: '100%', height: '100%', border: 0, background: '#ffffff' }}
                />
              </div>

              {loading && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--delab-bg, #f5f5f6)',
                  color: 'var(--delab-text-tertiary, #8a8a90)',
                  fontSize: 12,
                  borderRadius: 8,
                }}>
                  正在加载页面…
                </div>
              )}

              {blocked && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                  background: 'var(--delab-bg, #f5f5f6)',
                  borderRadius: 8,
                }}>
                  <div style={{
                    maxWidth: 300,
                    padding: 16,
                    borderRadius: 10,
                    background: 'var(--delab-elevated, #ffffff)',
                    border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
                    boxShadow: 'var(--delab-shadow, 0 8px 24px rgba(0,0,0,0.18))',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>该页面仍无法嵌入预览</div>
                    <div style={{
                      fontSize: 11,
                      lineHeight: 1.6,
                      color: 'var(--delab-text-secondary, #57575e)',
                      marginBottom: 12,
                    }}>
                      可能由 meta CSP 或浏览器策略限制。可以改用调试器视口模式，或直接关闭工作区。
                    </div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={useDebuggerFallback}
                        style={{
                          appearance: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: 'var(--delab-btn-bg, #141416)',
                          color: 'var(--delab-btn-text, #ffffff)',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        用调试器视口打开
                      </button>
                      <button
                        type="button"
                        onClick={closeTab}
                        style={{
                          appearance: 'none',
                          border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
                          cursor: 'pointer',
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: 'transparent',
                          color: 'var(--delab-text-secondary, #57575e)',
                          fontSize: 11,
                        }}
                      >
                        关闭
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 右侧分隔：同样只画一条线 */}
        <div
          onMouseDown={startPanelResize}
          style={{
            flex: '0 0 5px',
            position: 'relative',
            zIndex: 2,
            cursor: 'ew-resize',
          }}
        >
          <span style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 2,
            width: 1,
            background: 'var(--delab-border, rgba(0,0,0,0.08))',
          }} />
        </div>
        <aside style={{
          flex: `0 0 ${panelWidth}px`,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--delab-bg, #f5f5f6)',
        }}>
          {connected ? (
            mode === 'browse' ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 24,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>浏览器模式</div>
                <div style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--delab-text-secondary, #57575e)' }}>
                  页面保持可交互，切回「走查」即可选择元素
                </div>
              </div>
            ) : (
              <FloatingPanel
                docked
                visible
                showThemeToggle={false}
                data={panel.data}
                mode={panel.mode}
                view={panel.view}
                comments={comments}
                activeCommentId={panel.activeCommentId}
                onClose={() => {}}
                onCommit={(prop, value) => {
                  if (!isValidValue(prop, value)) return false;
                  sendCommand('commit', { prop, value });
                  return true;
                }}
                onReset={prop => sendCommand('reset', { prop })}
                onResetAll={() => sendCommand('resetAll')}
                onLocateComment={id => sendCommand('locateComment', { id })}
                onToggleResolveComment={thread => sendCommand('toggleResolve', { id: thread.id })}
                onCopyAllComments={() => { void copyAll(); }}
                onPreviewCommentImage={dataUrl => setPreview(dataUrl)}
              />
            )
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              color: 'var(--delab-text-tertiary, #8a8a90)',
              fontSize: 11,
              textAlign: 'center',
            }}>
              {blocked ? '页面未嵌入，无法读取样式' : '正在连接页面…'}
            </div>
          )}
        </aside>
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, background: 'rgba(0, 0, 0, 0.82)', cursor: 'zoom-out',
          }}
        >
          <img src={preview} alt="评论截图" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} />
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)',
          padding: '8px 14px', borderRadius: 8, zIndex: 30, pointerEvents: 'none',
          background: 'var(--delab-glass-bg, rgba(23, 23, 24, 0.94))',
          color: 'var(--delab-glass-text, #ececee)',
          border: '1px solid var(--delab-glass-border, rgba(255, 255, 255, 0.12))',
          fontFamily: SANS, fontSize: 11, whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const container = document.getElementById('root');
if (container) createRoot(container).render(<WorkspaceApp />);
