// DeLab Floating Panel — React panel component（页面浮窗 / 侧边栏停靠共用）

import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { StyleGroup, BoxModel, ColorFormat } from '../style-extractor';
import type { CommentThread } from '../comment-store';
import { ThemeProvider, useTheme, SANS } from '../theme-context';
import { Header } from './Header';
import { SunIcon, MoonIcon } from './Icon';
import { ElementInfo, PanelView } from './ElementInfo';
import { BoxModelDiagram } from './BoxModelDiagram';
import { StylePanel } from './StylePanel';
import { CssPanel } from './CssPanel';
import { CommentsView } from './CommentsView';
import { InspectIcon } from './Icon';
import { WecomSettings } from './WecomSettings';

const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 280;
const EDGE_GAP = 16;
/** 内容自适应高度，超过该值才出现滚动 */
const MAX_HEIGHT = '70vh';

export interface StylePayload {
  tagName: string;
  id: string;
  classes: string;
  groups: StyleGroup[];
  boxModel?: BoxModel;
  /** How many declarations were edited on this element */
  modifiedCount?: number;
  /** 左侧 DOM 树中的路径，用于选中联动 */
  domPath?: number[];
}

interface PanelPosition {
  left: number;
  /** 用 bottom 定位：高度随内容变化时依然贴着视口底部 */
  bottom: number;
  width: number;
}

/** 位置不持久化：每次打开都按当前视口重算，避免窗口变小后面板落在视口外 */
function defaultPosition(): PanelPosition {
  try {
    // 清掉旧版本存过的位置，避免沿用过期的越界坐标
    localStorage.removeItem('delab-panel-pos');
  } catch { /* ignore */ }
  return {
    left: window.innerWidth - DEFAULT_WIDTH - EDGE_GAP,
    bottom: EDGE_GAP,
    width: DEFAULT_WIDTH,
  };
}

/** 记住上次用的样式面板视图，默认设计面板 */
function initialPanelView(): PanelView {
  try {
    return localStorage.getItem('delab-panel-view') === 'css' ? 'css' : 'design';
  } catch {
    return 'design';
  }
}

export function FloatingPanel({
  data, mode, view = 'style', comments = [], activeCommentId = null, syncingCommentIds = [],
  visible, onClose, onCommit, onReset, onResetAll,
  onLocateComment, onToggleResolveComment, onSyncComment, onCopyAllComments, onPreviewCommentImage,
  docked = false,
  showThemeToggle = true,
  settingsOpen,
  onSettingsOpenChange,
}: {
  data: StylePayload | null;
  mode: 'empty' | 'content';
  /** style = 元素样式，comments = 站点级评论列表 */
  view?: 'style' | 'comments';
  comments?: CommentThread[];
  activeCommentId?: string | null;
  /** 正在上报企微的评论 id */
  syncingCommentIds?: string[];
  visible: boolean;
  onClose: () => void;
  onCommit: (prop: string, value: string) => boolean;
  onReset: (prop: string) => void;
  onResetAll: () => void;
  onLocateComment?: (id: string) => void;
  onToggleResolveComment?: (thread: CommentThread) => void;
  onSyncComment?: (thread: CommentThread) => void;
  onCopyAllComments?: () => void;
  onPreviewCommentImage?: (dataUrl: string) => void;
  /** 停靠在浏览器侧边栏时铺满容器，不再浮动 / 拖拽 */
  docked?: boolean;
  /** 底部工具条是否显示明暗切换；工作区把它移到顶栏时为 false */
  showThemeToggle?: boolean;
  /** 外部控制是否展示企微同步设置；不传则由面板内部管理 */
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
}) {
  const [pos, setPos] = useState<PanelPosition>(defaultPosition);
  const [showAll, setShowAll] = useState(false);
  const [panelView, setPanelView] = useState<PanelView>(initialPanelView);
  const [colorFormat, setColorFormat] = useState<ColorFormat>('hex');
  const [localSettingsOpen, setLocalSettingsOpen] = useState(false);

  const settingsVisible = settingsOpen ?? localSettingsOpen;
  const setSettingsVisible = useCallback((open: boolean) => {
    setLocalSettingsOpen(open);
    onSettingsOpenChange?.(open);
  }, [onSettingsOpenChange]);

  const dragRef = useRef({ active: false, startX: 0, startY: 0, startLeft: 0, startBottom: 0 });
  const resizeRef = useRef({ active: false, startX: 0, startW: 0 });
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, startLeft: pos.left, startBottom: pos.bottom };
  }, [pos]);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    resizeRef.current = { active: true, startX: e.clientX, startW: pos.width };
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current.active) {
        setPos(prev => ({
          ...prev,
          left: Math.max(0, Math.min(dragRef.current.startLeft + e.clientX - dragRef.current.startX, window.innerWidth - 60)),
          // 向上拖 → bottom 变大
          bottom: Math.max(0, Math.min(dragRef.current.startBottom - (e.clientY - dragRef.current.startY), window.innerHeight - 40)),
        }));
      }
      if (resizeRef.current.active) {
        setPos(prev => ({
          ...prev,
          width: Math.max(MIN_WIDTH, resizeRef.current.startW + e.clientX - resizeRef.current.startX),
        }));
      }
    };
    const onUp = () => {
      if (dragRef.current.active || resizeRef.current.active) {
        dragRef.current.active = false;
        resizeRef.current.active = false;
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  // 视口被模拟成较窄尺寸时（如 375 宽），收缩面板并把它拉回可视区
  useEffect(() => {
    const onResize = () => {
      setPos(prev => ({
        ...prev,
        width: Math.min(prev.width, Math.max(MIN_WIDTH, window.innerWidth - EDGE_GAP * 2)),
        left: Math.max(0, Math.min(prev.left, window.innerWidth - 60)),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 每次重新打开（visible 由 false 变 true）都回到默认位置，丢弃上次拖动的坐标
  const prevVisible = useRef(visible);
  useEffect(() => {
    if (visible && !prevVisible.current) setPos(defaultPosition());
    prevVisible.current = visible;
  }, [visible]);

  if (!visible) return null;

  return (
    <ThemeProvider>
      <div
        id="delab-inline-panel"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        style={{
          ...(docked
            ? { position: 'relative' as const, width: '100%', height: '100%' }
            : {
                position: 'fixed' as const,
                left: pos.left,
                bottom: pos.bottom,
                width: pos.width,
                height: 'auto',
                maxHeight: MAX_HEIGHT,
                zIndex: 2147483646,
                borderRadius: 12,
                boxShadow: 'var(--delab-shadow-float, 0 0 0 1px rgba(0, 0, 0, 0.05), 0 8px 20px -4px rgba(0, 0, 0, 0.16), 0 24px 56px -12px rgba(0, 0, 0, 0.26))',
                border: '1px solid var(--delab-border-strong, rgba(0, 0, 0, 0.16))',
              }),
          background: 'var(--delab-bg, #f5f5f6)',
          color: 'var(--delab-text, #141416)',
          fontFamily: SANS,
          fontSize: 12,
          textAlign: 'left',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {!docked && (
          <Header
            onClose={onClose}
            onDragStart={onDragStart}
            modifiedCount={!settingsVisible && view === 'style' ? data?.modifiedCount ?? 0 : 0}
            onResetAll={!settingsVisible && view === 'style' ? onResetAll : undefined}
            onConfigureWecom={() => setSettingsVisible(true)}
          />
        )}

        {settingsVisible ? (
          <WecomSettings compact onBack={() => setSettingsVisible(false)} />
        ) : view === 'comments' ? (
          <CommentsView
            comments={comments}
            activeId={activeCommentId}
            syncingIds={syncingCommentIds}
            onLocate={id => onLocateComment?.(id)}
            onToggleResolve={thread => onToggleResolveComment?.(thread)}
            onSync={thread => onSyncComment?.(thread)}
            onCopyAll={() => onCopyAllComments?.()}
            onPreview={dataUrl => onPreviewCommentImage?.(dataUrl)}
          />
        ) : mode === 'empty' ? (
          <div style={{
            flex: '1 1 auto', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '40px 0',
            color: 'var(--delab-text-secondary, #aaa)', fontSize: 13,
            gap: 10, userSelect: 'none',
          }}>
            <InspectIcon size={36} />
            <span>Click an element to measure</span>
          </div>
        ) : data && (
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ElementInfo
              tagName={data.tagName}
              id={data.id}
              classes={data.classes}
              visible
              view={panelView}
              onViewChange={view => {
                setPanelView(view);
                try { localStorage.setItem('delab-panel-view', view); } catch { /* ignore */ }
              }}
            />
            <div style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0 }}>
              {panelView === 'css' ? (
                <>
                  {/* 盒子模型只在 CSS 视图展示，设计视图让位给属性面板 */}
                  {data.boxModel && <BoxModelDiagram bm={data.boxModel} onCommit={onCommit} />}
                  <CssPanel
                    groups={data.groups}
                    showAll={showAll}
                    colorFormat={colorFormat}
                    onCommit={onCommit}
                    onReset={onReset}
                  />
                </>
              ) : (
                <StylePanel
                  groups={data.groups}
                  showAll={showAll}
                  colorFormat={colorFormat}
                  onColorFormatChange={setColorFormat}
                  onCommit={onCommit}
                  onReset={onReset}
                />
              )}
            </div>
            {!docked && <ToggleBar showAll={showAll} onChange={setShowAll} />}
          </div>
        )}

        {docked && !settingsVisible && (
          <PanelFooter
            showAll={showAll}
            onShowAllChange={setShowAll}
            showAllToggle={view === 'style' && mode === 'content'}
            modifiedCount={view === 'style' ? data?.modifiedCount ?? 0 : 0}
            onResetAll={view === 'style' ? onResetAll : undefined}
            showThemeToggle={showThemeToggle}
          />
        )}

        {!docked && (
          <div
            ref={resizeHandleRef}
            onMouseDown={onResizeStart}
            onMouseEnter={() => { if (resizeHandleRef.current) resizeHandleRef.current.style.opacity = '1'; }}
            onMouseLeave={() => { if (resizeHandleRef.current) resizeHandleRef.current.style.opacity = '0'; }}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 20, height: 20, cursor: 'ew-resize',
              zIndex: 10, opacity: 0, transition: 'opacity 0.15s',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 48 48" fill="none" style={{ position: 'absolute', bottom: 2, right: 2 }}>
              <path d="M8 40L40 8" stroke="var(--delab-text-secondary, #aaa)" strokeWidth="3.6" strokeLinecap="round" />
              <path d="M22 40L40 22" stroke="var(--delab-text-secondary, #aaa)" strokeWidth="3.6" strokeLinecap="round" />
              <path d="M36 40L40 36" stroke="var(--delab-text-secondary, #aaa)" strokeWidth="3.6" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

function ToggleBar({ showAll, onChange }: { showAll: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{
      padding: '6px 12px', borderTop: '1px solid var(--delab-border, #e5e5e5)',
      flexShrink: 0, display: 'flex', alignItems: 'center',
    }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        fontSize: 11, color: 'var(--delab-text-secondary, #57575e)',
      }}>
        <input
          type="checkbox"
          checked={showAll}
          onChange={e => onChange(e.target.checked)}
          style={{ accentColor: 'var(--delab-accent, #32f08c)' }}
        />
        Show all
      </label>
    </div>
  );
}

const footerIconBtn: React.CSSProperties = {
  appearance: 'none',
  background: 'transparent',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  padding: 4,
  color: 'var(--delab-text-secondary, #57575e)',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.12s ease, color 0.12s ease',
};

/** 侧边栏停靠时的底部工具条：Show all + 一键还原 + 明暗切换 */
function PanelFooter({
  showAll, onShowAllChange, showAllToggle, modifiedCount, onResetAll, showThemeToggle,
}: {
  showAll: boolean;
  onShowAllChange: (v: boolean) => void;
  showAllToggle: boolean;
  modifiedCount: number;
  onResetAll?: () => void;
  showThemeToggle: boolean;
}) {
  const { isDark, toggle } = useTheme();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 8, padding: '4px 8px', flexShrink: 0,
      borderTop: '1px solid var(--delab-border, #e5e5e5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        {showAllToggle && (
          <label style={{
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            fontSize: 11, color: 'var(--delab-text-secondary, #57575e)',
          }}>
            <input
              type="checkbox"
              checked={showAll}
              onChange={e => onShowAllChange(e.target.checked)}
              style={{ accentColor: 'var(--delab-accent, #32f08c)' }}
            />
            Show all
          </label>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {modifiedCount > 0 && onResetAll && (
          <button
            onClick={onResetAll}
            title="Revert all edits on this element"
            style={{
              ...footerIconBtn, padding: '4px 8px', fontSize: 11,
              color: 'var(--delab-accent, #32f08c)',
            }}
          >
            Reset {modifiedCount}
          </button>
        )}
        {showThemeToggle && (
          <button
            onClick={toggle}
            title="Toggle theme"
            style={footerIconBtn}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--delab-row-hover, rgba(0,0,0,0.045))'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {isDark ? <SunIcon size={14} /> : <MoonIcon size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
