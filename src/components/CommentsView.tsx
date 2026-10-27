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
          gap: 6px;
          padding: 8px 12px;
          border-bottom: 1px solid var(--delab-border, #e5e5e5);
          flex-shrink: 0;
        }
        .delab-cm-chip {
          appearance: none;
          font: inherit;
          font-size: 11px;
          line-height: 1;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid var(--delab-border, #e5e5e5);
          background: transparent;
          color: var(--delab-text-secondary, #777169);
          cursor: pointer;
        }
        .delab-cm-chip:hover { color: var(--delab-text, #000); }
        .delab-cm-chip[data-active='true'] {
          color: var(--delab-text, #000);
          border-color: var(--delab-accent, #5e6ad2);
          background: color-mix(in srgb, var(--delab-accent, #5e6ad2) 14%, transparent);
        }
        .delab-cm-copy {
          margin-left: auto;
          appearance: none;
          font: inherit;
          font-size: 11px;
          line-height: 1;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid var(--delab-border, #e5e5e5);
          background: transparent;
          color: var(--delab-text-secondary, #777169);
          cursor: pointer;
        }
        .delab-cm-copy:hover {
          color: var(--delab-text, #000);
          border-color: var(--delab-accent, #5e6ad2);
        }
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
          color: var(--delab-text-secondary, #777169);
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
          border: 1px solid var(--delab-border, #e5e5e5);
          background: var(--delab-field-bg, #f2f0ee);
          cursor: zoom-in;
        }
        .delab-cm-thumb:hover {
          border-color: var(--delab-accent, #5e6ad2);
        }
        .delab-cm-thumb img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .delab-cm-item + .delab-cm-item { margin-top: 2px; }
        .delab-cm-item:hover { background: var(--delab-row-hover, #f5f3f1); }
        .delab-cm-item[data-active='true'] {
          background: color-mix(in srgb, var(--delab-accent, #5e6ad2) 14%, transparent);
        }
        .delab-cm-item[data-resolved='true'] .delab-cm-summary,
        .delab-cm-item[data-resolved='true'] .delab-cm-body {
          color: var(--delab-text-secondary, #777169);
          text-decoration: line-through;
        }
        .delab-cm-head {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .delab-cm-index {
          flex: none;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: var(--delab-accent, #5e6ad2);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          line-height: 16px;
          text-align: center;
        }
        .delab-cm-summary {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          color: var(--delab-text-secondary, #777169);
        }
        .delab-cm-state {
          flex: none;
          padding: 0 5px;
          border-radius: 4px;
          border: 1px solid var(--delab-border, #e5e5e5);
          font-size: 10px;
          line-height: 16px;
          color: var(--delab-text-secondary, #777169);
        }
        .delab-cm-body {
          margin: 4px 0 0 22px;
          font-size: 12px;
          line-height: 1.55;
          color: var(--delab-text, #000);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .delab-cm-meta {
          margin: 6px 0 0 22px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          color: var(--delab-text-secondary, #777169);
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
          border: 1px solid transparent;
          border-radius: 4px;
          background: transparent;
          color: var(--delab-text-secondary, #777169);
          cursor: pointer;
        }
        .delab-cm-ops button:hover {
          color: var(--delab-text, #000);
          border-color: var(--delab-border, #e5e5e5);
        }
      `}</style>

      <div className="delab-cm-toolbar">
        <button
          type="button"
          className="delab-cm-chip"
          data-active={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          全部 {comments.length}
        </button>
        <button
          type="button"
          className="delab-cm-chip"
          data-active={filter === 'open'}
          onClick={() => setFilter('open')}
        >
          未解决 {openCount}
        </button>
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
