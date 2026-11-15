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

const MODES: { key: Mode; label: string; icon: React.ReactNode }[] = [
  {
    key: 'inspect',
    label: '走查',
    icon: (
      <svg width="14" height="14" viewBox="0 0 48 48" fill="none" stroke="currentColor"
        strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M38 24C38 31.732 31.732 38 24 38C16.268 38 10 31.732 10 24C10 16.268 16.268 10 24 10C31.732 10 38 16.268 38 24Z" />
        <path d="M24 4V12M24 36V44M4 24H12M36 24H44" />
      </svg>
    ),
  },
  {
    key: 'comment',
    label: '评论',
    icon: (
      <svg width="14" height="14" viewBox="0 0 48 48" fill="none" stroke="currentColor"
        strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M42 30C42 31.0609 41.5786 32.0783 40.8284 32.8284C40.0783 33.5786 39.0609 34 38 34H14L6 42V10C6 8.93913 6.42143 7.92172 7.17157 7.17157C7.92172 6.42143 8.93913 6 10 6H38C39.0609 6 40.0783 6.42143 40.8284 7.17157C41.5786 7.92172 42 8.93913 42 10V30Z" />
      </svg>
    ),
  },
  {
    key: 'browse',
    label: '浏览',
    icon: (
      <svg width="14" height="14" viewBox="0 0 48 48" fill="none" stroke="currentColor"
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

function readParams() {
  const params = new URLSearchParams(location.search);
  return {
    url: params.get('url') ?? '',
    width: clamp(Number(params.get('w')) || 375, 240, 3840),
    height: clamp(Number(params.get('h')) || 812, 400, 2160),
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
          height: 26,
          padding: '0 8px',
          borderRadius: 6,
          border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
          background: 'var(--delab-bg, #f5f5f6)',
          color: 'var(--delab-text, #141416)',
          fontFamily: MONO,
          fontSize: 10,
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

function WorkspaceApp() {
  const params = useMemo(readParams, []);
  const [size, setSize] = useState({ width: params.width, height: params.height });
  const [fitCanvas, setFitCanvas] = useState(false);
  const [panelWidth, setPanelWidth] = useState(360);
  const [collapsed, setCollapsed] = useState(false);
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

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  useEffect(() => {
    void chrome.tabs.getCurrent().then(tab => {
      tabRef.current = tab?.id ?? null;
    }).catch(() => {});
  }, []);

  // 记住上次使用的显式视口尺寸，下次点插件直接沿用
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
        setPanel({
          visible: Boolean(message.visible),
          mode: message.mode === 'content' ? 'content' : 'empty',
          view: message.view === 'comments' ? 'comments' : 'style',
          data: (message.data as StylePayload | null) ?? null,
          activeCommentId: (message.activeCommentId as string | null) ?? null,
          url: String(message.url ?? ''),
        });
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
      const data = event.data as { type?: string; token?: string } | null;
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
      await writeClipboard(toMarkdown(comments, panel.url || params.url));
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
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 10px 0 12px',
        background: 'var(--delab-elevated, #ffffff)',
        borderBottom: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
      }}>
        <img
          src={chrome.runtime.getURL('icons/logo-128.png')}
          alt=""
          width={20}
          height={20}
          style={{ display: 'block', borderRadius: 5 }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>Inspect Lab</span>

        <div style={{
          flex: '1 1 auto',
          minWidth: 0,
          height: 26,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          borderRadius: 999,
          background: 'var(--delab-bg, #f5f5f6)',
          border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
          color: 'var(--delab-text-tertiary, #8a8a90)',
          fontFamily: MONO,
          fontSize: 11,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {params.url}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
            style={{
              appearance: 'none',
              cursor: 'pointer',
              position: 'relative',
              width: 38,
              height: 22,
              padding: 0,
              flexShrink: 0,
              borderRadius: 999,
              border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
              background: 'var(--delab-sel, rgba(0,0,0,0.07))',
              transition: 'background 0.15s ease',
            }}
          >
            <span style={{
              position: 'absolute',
              top: 2,
              left: theme === 'dark' ? 18 : 2,
              width: 16,
              height: 16,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--delab-elevated, #ffffff)',
              border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
              color: 'var(--delab-text-secondary, #57575e)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
              transition: 'left 0.15s ease',
            }}>
              {theme === 'dark' ? <MoonIcon size={9} /> : <SunIcon size={9} />}
            </span>
          </button>

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
      </header>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        {/* 左侧固定模式栏 */}
        <nav style={{
          flex: '0 0 48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          padding: '10px 0',
          background: 'var(--delab-elevated, #ffffff)',
          borderRight: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
          flexShrink: 0,
        }}>
          {MODES.map(item => {
            const active = mode === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => changeMode(item.key)}
                title={item.label}
                aria-label={item.label}
                aria-pressed={active}
                style={{
                  appearance: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: 7,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: active ? 'var(--delab-btn-bg, #141416)' : 'transparent',
                  color: active ? 'var(--delab-btn-text, #ffffff)' : 'var(--delab-text-secondary, #57575e)',
                  transition: 'background 0.12s ease, color 0.12s ease',
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.background = 'var(--delab-row-hover, rgba(0,0,0,0.045))';
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                {item.icon}
              </button>
            );
          })}
        </nav>

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
                  src={params.url || 'about:blank'}
                  title="设备预览"
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

        {/* 分隔 + 面板 */}
        {collapsed ? (
          <aside style={{
            flex: '0 0 36px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '8px 0',
            borderLeft: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
            background: 'var(--delab-elevated, #ffffff)',
          }}>
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              title="展开样式面板"
              style={iconBtn}
            >
              <svg width="12" height="12" viewBox="0 0 48 48" fill="none" stroke="currentColor"
                strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M30 10L18 24L30 38" />
              </svg>
            </button>
            <span style={{
              writingMode: 'vertical-rl',
              fontSize: 10,
              color: 'var(--delab-text-tertiary, #8a8a90)',
              letterSpacing: '0.08em',
            }}>
              样式面板
            </span>
          </aside>
        ) : (
          <>
            <div
              onMouseDown={startPanelResize}
              style={{
                flex: '0 0 8px',
                position: 'relative',
                zIndex: 2,
                cursor: 'ew-resize',
                background: 'var(--delab-border, rgba(0,0,0,0.08))',
              }}
            >
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                onMouseDown={e => e.stopPropagation()}
                title="收起样式面板"
                style={{
                  ...iconBtn,
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 18,
                  height: 34,
                  padding: 0,
                  border: '1px solid var(--delab-border, rgba(0,0,0,0.08))',
                  background: 'var(--delab-elevated, #ffffff)',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 48 48" fill="none" stroke="currentColor"
                  strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 10L30 24L18 38" />
                </svg>
              </button>
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
          </>
        )}
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
