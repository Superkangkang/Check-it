// DeLab Comments View — 面板内的站点级评论列表

import { useState } from 'react';
import type { CommentThread } from '../comment-store';
import { summarizeElement } from '../element-identity';

interface CommentsViewProps {
  comments: CommentThread[];
  activeId: string | null;
  onLocate: (id: string) => void;
  onToggleResolve: (thread: CommentThread) => void;
  onDelete: (thread: CommentThread) => void;
  onCopyAll: () => void;
  /** 点击缩略图查看大图 */
  onPreview: (dataUrl: string) => void;
}

type Filter = 'all' | 'open';

export function CommentsView({
  comments, activeId, onLocate, onToggleResolve, onDelete, onCopyAll, onPreview,
}: CommentsViewProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const openCount = comments.filter(thread => !thread.resolved).length;
  const visible = filter === 'open' ? comments.filter(thread => !thread.resolved) : comments;

  return (
    <div className="delab-cm">
      <style>{`
        .delab-cm {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .delab-cm-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid var(--delab-border, rgba(0,0,0,0.08));
          flex-shrink: 0;
        }
        /* 分段选择器：getgradients 的 Flow / Points 样式 */
        .delab-cm-segments {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 2px;
          border-radius: 8px;
          background: var(--delab-sel, rgba(0, 0, 0, 0.07));
        }
        .delab-cm-seg {
          appearance: none;
          font: inherit;
          font-size: 11px;
          font-weight: 500;
          line-height: 1;
          padding: 4px 8px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--delab-text-secondary, #57575e);
          cursor: pointer;
          transition: background 0.12s ease, color 0.12s ease;
        }
        .delab-cm-seg:hover { color: var(--delab-text, #141416); }
        .delab-cm-seg[data-active='true'] {
          color: var(--delab-text, #141416);
          background: var(--delab-bg, #f5f5f6);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
        }
        .delab-cm-copy {
          margin-left: auto;
          appearance: none;
          font: inherit;
          font-size: 11px;
          line-height: 1;
          padding: 5px 9px;
          border-radius: 6px;
          border: none;
          background: var(--delab-btn-bg, #141416);
          color: var(--delab-btn-text, #ffffff);
          cursor: pointer;
          transition: opacity 0.12s ease;
        }
        .delab-cm-copy:hover { opacity: 0.85; }
        .delab-cm-copy:disabled { opacity: 0.4; cursor: default; }
        .delab-cm-list {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 8px;
        }
        .delab-cm-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          font-size: 12px;
          color: var(--delab-text-tertiary, #8a8a90);
        }
        .delab-cm-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.12s ease;
        }
        .delab-cm-main {
          flex: 1;
          min-width: 0;
        }
        .delab-cm-thumb {
          flex: none;
          width: 44px;
          height: 44px;
          padding: 0;
          overflow: hidden;
          border-radius: 6px;
          border: 1px solid var(--delab-border, rgba(0,0,0,0.08));
          background: var(--delab-field-bg, #ffffff);
          cursor: zoom-in;
        }
        .delab-cm-thumb:hover {
          border-color: var(--delab-accent, #32f08c);
        }
        .delab-cm-thumb img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .delab-cm-item + .delab-cm-item { margin-top: 2px; }
        .delab-cm-item:hover { background: var(--delab-row-hover, rgba(0,0,0,0.045)); }
        .delab-cm-item[data-active='true'] {
          background: var(--delab-accent-soft, rgba(50,240,140,0.14));
        }
        .delab-cm-item[data-resolved='true'] .delab-cm-summary,
        .delab-cm-item[data-resolved='true'] .delab-cm-body {
          color: var(--delab-text-tertiary, #8a8a90);
          text-decoration: line-through;
        }
        .delab-cm-head {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .delab-cm-index {
          flex: none;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 999px;
          background: var(--delab-accent, #32f08c);
          color: var(--delab-accent-contrast, #0b0b0c);
          font-size: 10px;
          font-weight: 700;
          line-height: 16px;
          text-align: center;
          box-sizing: border-box;
        }
        .delab-cm-summary {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          color: var(--delab-text-secondary, #57575e);
        }
        .delab-cm-state {
          flex: none;
          padding: 0 5px;
          border-radius: 4px;
          border: 1px solid var(--delab-border-strong, rgba(0,0,0,0.16));
          font-size: 10px;
          line-height: 16px;
          color: var(--delab-text-tertiary, #8a8a90);
        }
        .delab-cm-body {
          margin: 4px 0 0 22px;
          font-size: 12px;
          line-height: 1.55;
          color: var(--delab-text, #141416);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .delab-cm-meta {
          margin: 6px 0 0 22px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          color: var(--delab-text-tertiary, #8a8a90);
        }
        .delab-cm-page {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .delab-cm-ops {
          display: flex;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.12s ease;
        }
        .delab-cm-item:hover .delab-cm-ops { opacity: 1; }
        .delab-cm-ops button {
          appearance: none;
          font: inherit;
          font-size: 10px;
          padding: 2px 5px;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: var(--delab-text-secondary, #57575e);
          cursor: pointer;
        }
        .delab-cm-ops button:hover {
          color: var(--delab-text, #141416);
          background: var(--delab-sel, rgba(0,0,0,0.07));
        }
        .delab-cm-ops button.delab-cm-danger:hover {
          color: var(--delab-danger, #e5484d);
        }
      `}</style>

      <div className="delab-cm-toolbar">
        <div className="delab-cm-segments">
          <button
            type="button"
            className="delab-cm-seg"
            data-active={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            全部 {comments.length}
          </button>
          <button
            type="button"
            className="delab-cm-seg"
            data-active={filter === 'open'}
            onClick={() => setFilter('open')}
          >
            未解决 {openCount}
          </button>
        </div>
        <button type="button" className="delab-cm-copy" onClick={onCopyAll} disabled={!comments.length}>
          复制全部
        </button>
      </div>

      <div className="delab-cm-list">
        {!visible.length && (
          <div className="delab-cm-empty">
            {filter === 'open' ? '没有未解决的评论' : '还没有评论'}
          </div>
        )}
        {visible.map(thread => (
          <article
            key={thread.id}
            className="delab-cm-item"
            data-active={thread.id === activeId}
            data-resolved={thread.resolved}
            onClick={() => onLocate(thread.id)}
          >
            <div className="delab-cm-main">
              <div className="delab-cm-head">
                <span className="delab-cm-index">{comments.indexOf(thread) + 1}</span>
                <span className="delab-cm-summary">{summarizeElement(thread.identity)}</span>
                {thread.resolved && <span className="delab-cm-state">已解决</span>}
              </div>
              <p className="delab-cm-body">{thread.body}</p>
              <div className="delab-cm-meta">
                <span className="delab-cm-page">{pagePath(thread.url)}</span>
                <span>{formatTime(thread.createdAt)}</span>
                <div className="delab-cm-ops">
                  <button
                    type="button"
                    onClick={event => { event.stopPropagation(); onLocate(thread.id); }}
                  >
                    定位
                  </button>
                  <button
                    type="button"
                    onClick={event => { event.stopPropagation(); onToggleResolve(thread); }}
                  >
                    {thread.resolved ? '重开' : '解决'}
                  </button>
                  <button
                    type="button"
                    className="delab-cm-danger"
                    onClick={event => { event.stopPropagation(); onDelete(thread); }}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
            {thread.snapshot && (
              <button
                type="button"
                className="delab-cm-thumb"
                title="查看大图"
                onClick={event => {
                  event.stopPropagation();
                  onPreview(thread.snapshot!);
                }}
              >
                <img src={thread.snapshot} alt="" loading="lazy" />
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

/** 站点级列表里需要区分评论所属页面 */
function pagePath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
