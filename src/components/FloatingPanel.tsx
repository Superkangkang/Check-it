// DeLab Floating Panel — React component + imperative manager

import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { StyleGroup, BoxModel } from '../style-extractor';
import type { CommentThread } from '../comment-store';
import { ThemeProvider, SANS } from '../theme-context';
import { Header } from './Header';
import { ElementInfo } from './ElementInfo';
import { BoxModelDiagram } from './BoxModelDiagram';
import { StylePanel } from './StylePanel';
import { CommentsView } from './CommentsView';
import { InspectIcon } from './Icon';

const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 280;
const MIN_HEIGHT = 300;

interface StylePayload {
  tagName: string;
  id: string;
  classes: string;
  groups: StyleGroup[];
  boxModel?: BoxModel;
  /** How many declarations were edited on this element */
  modifiedCount?: number;
}

interface PanelPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

function loadPosition(): PanelPosition {
  try {
    const stored = localStorage.getItem('delab-panel-pos');
    if (stored) {
      const p = JSON.parse(stored);
      if (typeof p.left === 'number' && typeof p.top === 'number' &&
          typeof p.width === 'number' && typeof p.height === 'number') {
        p.left = Math.max(0, Math.min(p.left, window.innerWidth - 100));
        p.top = Math.max(0, Math.min(p.top, window.innerHeight - 100));
        p.width = Math.max(MIN_WIDTH, Math.min(p.width, window.innerWidth));
        p.height = Math.max(MIN_HEIGHT, Math.min(p.height, window.innerHeight));
        return p;
      }
    }
  } catch { /* ignore */ }
  const h = Math.floor(window.innerHeight * 0.7);
  return {
    left: window.innerWidth - DEFAULT_WIDTH - 16,
    top: window.innerHeight - h - 16,
    width: DEFAULT_WIDTH,
    height: h,
  };
}

export function FloatingPanel({
  data, mode, view = 'style', comments = [], activeCommentId = null,
  visible, onClose, onCommit, onReset, onResetAll,
  onLocateComment, onToggleResolveComment, onDeleteComment, onCopyAllComments, onPreviewCommentImage,
}: {
  data: StylePayload | null;
  mode: 'empty' | 'content';
  /** style = 元素样式，comments = 站点级评论列表 */
  view?: 'style' | 'comments';
  comments?: CommentThread[];
  activeCommentId?: string | null;
  visible: boolean;
  onClose: () => void;
  onCommit: (prop: string, value: string) => boolean;
  onReset: (prop: string) => void;
  onResetAll: () => void;
  onLocateComment?: (id: string) => void;
  onToggleResolveComment?: (thread: CommentThread) => void;
  onDeleteComment?: (thread: CommentThread) => void;
  onCopyAllComments?: () => void;
  onPreviewCommentImage?: (dataUrl: string) => void;
}) {
  const [pos, setPos] = useState<PanelPosition>(loadPosition);
  const [showAll, setShowAll] = useState(false);

  const dragRef = useRef({ active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const resizeRef = useRef({ active: false, startX: 0, startY: 0, startW: 0, startH: 0 });
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  const savePos = useCallback((p: PanelPosition) => {
    localStorage.setItem('delab-panel-pos', JSON.stringify(p));
  }, []);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, startLeft: pos.left, startTop: pos.top };
  }, [pos]);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    resizeRef.current = { active: true, startX: e.clientX, startY: e.clientY, startW: pos.width, startH: pos.height };
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current.active) {
        setPos(prev => ({
          ...prev,
          left: Math.max(0, Math.min(dragRef.current.startLeft + e.clientX - dragRef.current.startX, window.innerWidth - 60)),
          top: Math.max(0, Math.min(dragRef.current.startTop + e.clientY - dragRef.current.startY, window.innerHeight - 40)),
        }));
      }
      if (resizeRef.current.active) {
        setPos(prev => ({
          ...prev,
          width: Math.max(MIN_WIDTH, resizeRef.current.startW + e.clientX - resizeRef.current.startX),
          height: Math.max(MIN_HEIGHT, resizeRef.current.startH + e.clientY - resizeRef.current.startY),
        }));
      }
    };
    const onUp = () => {
      if (dragRef.current.active || resizeRef.current.active) {
        dragRef.current.active = false;
        resizeRef.current.active = false;
        setPos(prev => { savePos(prev); return prev; });
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [savePos]);

  if (!visible) return null;

  return (
    <ThemeProvider>
      <div
        id="delab-inline-panel"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        style={{
          position: 'fixed', left: pos.left, top: pos.top,
          width: pos.width, height: pos.height,
          zIndex: 2147483646,
          background: 'var(--delab-bg, #f5f5f6)',
          color: 'var(--delab-text, #141416)',
          fontFamily: SANS,
          fontSize: 12,
          textAlign: 'left',
          borderRadius: 12,
          boxShadow: 'var(--delab-shadow, 0 12px 32px -4px rgba(0, 0, 0, 0.25))',
          border: '1px solid var(--delab-border-strong, rgba(0, 0, 0, 0.16))',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <Header
          onClose={onClose}
          onDragStart={onDragStart}
          modifiedCount={view === 'style' ? data?.modifiedCount ?? 0 : 0}
          onResetAll={view === 'style' ? onResetAll : undefined}
        />

        {view === 'comments' ? (
          <CommentsView
            comments={comments}
            activeId={activeCommentId}
            onLocate={id => onLocateComment?.(id)}
            onToggleResolve={thread => onToggleResolveComment?.(thread)}
            onDelete={thread => onDeleteComment?.(thread)}
            onCopyAll={() => onCopyAllComments?.()}
            onPreview={dataUrl => onPreviewCommentImage?.(dataUrl)}
          />
        ) : mode === 'empty' ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--delab-text-secondary, #aaa)', fontSize: 13,
            gap: 10, userSelect: 'none',
          }}>
            <InspectIcon size={36} />
            <span>Click an element to measure</span>
          </div>
        ) : data && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ElementInfo tagName={data.tagName} id={data.id} classes={data.classes} visible />
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {data.boxModel && <BoxModelDiagram bm={data.boxModel} onCommit={onCommit} />}
              <StylePanel groups={data.groups} showAll={showAll} onCommit={onCommit} onReset={onReset} />
            </div>
            <ToggleBar showAll={showAll} onChange={setShowAll} />
          </div>
        )}

        <div
          ref={resizeHandleRef}
          onMouseDown={onResizeStart}
          onMouseEnter={() => { if (resizeHandleRef.current) resizeHandleRef.current.style.opacity = '1'; }}
          onMouseLeave={() => { if (resizeHandleRef.current) resizeHandleRef.current.style.opacity = '0'; }}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 20, height: 20, cursor: 'nwse-resize',
            zIndex: 10, opacity: 0, transition: 'opacity 0.15s',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ position: 'absolute', bottom: 2, right: 2 }}>
            <path d="M0 12 L12 0" stroke="var(--delab-text-secondary, #aaa)" strokeWidth="1.5" fill="none" />
            <path d="M4 12 L12 4" stroke="var(--delab-text-secondary, #aaa)" strokeWidth="1.5" fill="none" />
            <path d="M8 12 L12 8" stroke="var(--delab-text-secondary, #aaa)" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
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

// --- Imperative API for content-script ---

export interface PanelCallbacks {
  onClose: () => void;
  /** Write a declaration to the inspected element; returns false when rejected */
  onCommit: (prop: string, value: string) => boolean;
  /** Revert a single property to its pre-edit value */
  onReset: (prop: string) => void;
  /** Revert every edit made on the current element */
  onResetAll: () => void;
  /** 评论列表：定位到元素 */
  onLocateComment: (id: string) => void;
  onToggleResolveComment: (thread: CommentThread) => void;
  onDeleteComment: (thread: CommentThread) => void;
  onCopyAllComments: () => void;
  /** 评论截图查看大图 */
  onPreviewCommentImage: (dataUrl: string) => void;
}

export class FloatingPanelManager {
  private container: HTMLElement;
  private root: ReturnType<typeof createRoot>;
  private _data: StylePayload | null = null;
  private _mode: 'empty' | 'content' = 'empty';
  private _view: 'style' | 'comments' = 'style';
  private _comments: CommentThread[] = [];
  private _activeCommentId: string | null = null;
  private _visible = false;
  private callbacks: PanelCallbacks;

  constructor(mount: ShadowRoot, callbacks: PanelCallbacks) {
    this.callbacks = callbacks;
    this.container = document.createElement('div');
    this.container.id = 'delab-floating-root';
    mount.appendChild(this.container);
    this.root = createRoot(this.container);
    this._render();
  }

  private _render() {
    this.root.render(
      React.createElement(FloatingPanel, {
        data: this._data,
        mode: this._mode,
        view: this._view,
        comments: this._comments,
        activeCommentId: this._activeCommentId,
        visible: this._visible,
        onClose: () => {
          this._visible = false;
          this._render();
          this.callbacks.onClose();
        },
        onCommit: this.callbacks.onCommit,
        onReset: this.callbacks.onReset,
        onResetAll: this.callbacks.onResetAll,
        onLocateComment: this.callbacks.onLocateComment,
        onToggleResolveComment: this.callbacks.onToggleResolveComment,
        onDeleteComment: this.callbacks.onDeleteComment,
        onCopyAllComments: this.callbacks.onCopyAllComments,
        onPreviewCommentImage: this.callbacks.onPreviewCommentImage,
      })
    );
  }

  showEmpty() {
    this._view = 'style';
    this._mode = 'empty';
    this._visible = true;
    this._data = null;
    this._render();
  }

  showData(data: StylePayload) {
    this._view = 'style';
    this._data = data;
    this._mode = 'content';
    this._visible = true;
    this._render();
  }

  /** 评论模式：面板展示站点级评论列表 */
  showComments(comments: CommentThread[], activeId: string | null = null) {
    this._view = 'comments';
    this._comments = comments;
    this._activeCommentId = activeId;
    this._visible = true;
    this._render();
  }

  /** 评论增删改后刷新列表内容，不改变当前视图 */
  setComments(comments: CommentThread[], activeId: string | null = null) {
    this._comments = comments;
    this._activeCommentId = activeId;
    if (this._view === 'comments') this._render();
  }

  hide() {
    this._visible = false;
    this._render();
  }

  isVisible(): boolean {
    return this._visible;
  }

  destroy() {
    this.root.unmount();
    this.container.remove();
  }
}
