// DeLab Comments View — 面板内的站点级评论列表

import type { CommentThread } from '../comment-store';
import { MONO } from '../theme-context';
import { CircleCheckIcon } from './Icon';

interface CommentsViewProps {
  comments: CommentThread[];
  activeId: string | null;
  /** 点击条目即定位到对应元素 */
  onLocate: (id: string) => void;
  /** 标记已解决：解决后该评论从列表中移除 */
  onToggleResolve: (thread: CommentThread) => void;
  onCopyAll: () => void;
  /** 点击缩略图查看大图 */
  onPreview: (dataUrl: string) => void;
}

export function CommentsView({
  comments, activeId, onLocate, onToggleResolve, onCopyAll, onPreview,
}: CommentsViewProps) {
  // 已解决的评论等同于处理完毕，不再占用列表
  const visible = comments.filter(thread => !thread.resolved);

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
          justify-content: flex-end;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid var(--delab-border, rgba(0,0,0,0.08));
          flex-shrink: 0;
        }
        /* 计数徽标：与样式面板里的元素标签同款 */
        .delab-cm-count {
          display: inline-block;
          margin-right: auto;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--delab-accent-soft, rgba(50,240,140,0.14));
          color: var(--delab-accent, #32f08c);
          font-family: ${MONO};
          font-size: 11px;
          font-weight: 600;
          line-height: 1.6;
        }
        .delab-cm-copy {
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
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.12s ease;
        }
        .delab-cm-item + .delab-cm-item { margin-top: 2px; }
        .delab-cm-item:hover { background: var(--delab-row-hover, rgba(0,0,0,0.045)); }
        .delab-cm-item[data-active='true'] {
          background: var(--delab-accent-soft, rgba(50,240,140,0.14));
        }
        /* 缩略图容器：角标要压在图片外沿，不能裁切 */
        .delab-cm-media {
          position: relative;
          flex: none;
          width: 44px;
          height: 44px;
        }
        .delab-cm-thumb {
          display: block;
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
        /* 无截图时占位，保证列表左边缘对齐 */
        .delab-cm-thumb-empty {
          background: var(--delab-sel, rgba(0,0,0,0.07));
          border-style: dashed;
          cursor: default;
        }
        /* 序号角标：对应页面上的评论气泡编号 */
        .delab-cm-index {
          position: absolute;
          top: -5px;
          left: -5px;
          z-index: 1;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 999px;
          border: 1.5px solid var(--delab-bg, #f5f5f6);
          background: var(--delab-accent, #32f08c);
          color: var(--delab-accent-contrast, #0b0b0c);
          font-size: 10px;
          font-weight: 700;
          line-height: 13px;
          text-align: center;
          box-sizing: border-box;
        }
        .delab-cm-main {
          flex: 1;
          min-width: 0;
        }
        .delab-cm-body {
          margin: 0;
          font-size: 12px;
          line-height: 1.55;
          color: var(--delab-text, #141416);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .delab-cm-meta {
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          color: var(--delab-text-tertiary, #8a8a90);
        }
        .delab-cm-time {
          flex: none;
        }
        .delab-cm-sep {
          flex: none;
          opacity: 0.6;
        }
        .delab-cm-page {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .delab-cm-op {
          appearance: none;
          flex: none;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          padding: 0;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: var(--delab-text-tertiary, #8a8a90);
          cursor: pointer;
          transition: color 0.12s ease, background 0.12s ease;
        }
        .delab-cm-op:hover {
          color: var(--delab-accent, #32f08c);
          background: var(--delab-sel, rgba(0,0,0,0.07));
        }
      `}</style>

      <div className="delab-cm-toolbar">
        <span className="delab-cm-count">{visible.length} 条评论</span>
        <button type="button" className="delab-cm-copy" onClick={onCopyAll} disabled={!visible.length}>
          复制全部
        </button>
      </div>

      <div className="delab-cm-list">
        {!visible.length && (
          <div className="delab-cm-empty">还没有评论</div>
        )}
        {visible.map(thread => (
          <article
            key={thread.id}
            className="delab-cm-item"
            data-active={thread.id === activeId}
            onClick={() => onLocate(thread.id)}
          >
            <div className="delab-cm-media">
              {thread.snapshot ? (
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
              ) : (
                <div className="delab-cm-thumb delab-cm-thumb-empty" aria-hidden />
              )}
              <span className="delab-cm-index">{comments.indexOf(thread) + 1}</span>
            </div>
            <div className="delab-cm-main">
              <p className="delab-cm-body">{thread.body}</p>
              <div className="delab-cm-meta">
                <span className="delab-cm-time">{formatTime(thread.createdAt)}</span>
                <span className="delab-cm-sep" aria-hidden>·</span>
                <span className="delab-cm-page">{pagePath(thread.url)}</span>
                <button
                  type="button"
                  className="delab-cm-op"
                  title="标记解决"
                  aria-label="标记解决"
                  onClick={event => { event.stopPropagation(); onToggleResolve(thread); }}
                >
                  <CircleCheckIcon size={12} />
                </button>
              </div>
            </div>
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
