// DeLab 面板预览入口（开发用）
// 不依赖任何 chrome.* API，把面板挂到普通网页上，方便快速调 UI

import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingPanel } from './components/FloatingPanel';
import { ThemeProvider, SANS } from './theme-context';
import { ShadowHost } from './shadow-dom';
import { StyleExtractor } from './style-extractor';
import { EditSession } from './edit-session';
import { CommentPopover } from './comment-popover';
import { CommentButton } from './comment-button';
import { PointerCursor } from './pointer';
import { CommentThread, toMarkdown } from './comment-store';
import { describeElement } from './element-identity';

const extractor = new StyleExtractor();

// 与生产一致：面板挂在 shadow root 内，隔离页面样式
const host = new ShadowHost();
const container = document.createElement('div');
container.id = 'delab-floating-root';
host.getRoot().appendChild(container);

const sessions = new WeakMap<Element, EditSession>();
function sessionOf(el: Element): EditSession {
  let s = sessions.get(el);
  if (!s) {
    s = new EditSession(el as HTMLElement);
    sessions.set(el, s);
  }
  return s;
}

type PanelData = React.ComponentProps<typeof FloatingPanel>['data'];

function payloadFor(target: Element, session: EditSession | null): PanelData {
  return {
    tagName: target.tagName.toLowerCase(),
    id: target.id || '',
    classes: (target as HTMLElement).className || '',
    groups: extractor.extract(target, session),
    boxModel: extractor.getBoxModel(target),
    modifiedCount: session ? session.count() : 0,
  };
}

function App() {
  const [targets] = useState<Element[]>(() => Array.from(document.querySelectorAll('[data-mock]')));
  const [index, setIndex] = useState(0);
  const [data, setData] = useState<PanelData>(() => payloadFor(targets[0], null));
  const [visible, setVisible] = useState(true);
  const [threads, setThreads] = useState<CommentThread[]>([]);

  const target = targets[index];
  const selectedRef = useRef<Element>(targets[0]);
  selectedRef.current = target;

  const threadsRef = useRef<CommentThread[]>(threads);
  threadsRef.current = threads;

  const popoverRef = useRef<CommentPopover | null>(null);
  const buttonRef = useRef<CommentButton | null>(null);

  const refresh = (el: Element = targets[index]) => setData(payloadFor(el, sessionOf(el)));

  // 页内指针 + 评论按钮 + 评论弹层（与插件行为一致）
  useEffect(() => {
    const pointer = new PointerCursor(host.getRoot());
    pointer.enable();
    host.setCursorHidden(true);
    const cursorStyle = document.createElement('style');
    cursorStyle.textContent = 'html, html body * { cursor: none !important; }';
    document.head.appendChild(cursorStyle);

    const button = new CommentButton(host.getRoot(), () => {
      const el = selectedRef.current;
      if (!el) return;
      button.hide();
      popoverRef.current?.openComposer(el, describeElement(el));
    });
    buttonRef.current = button;

    const popover = new CommentPopover(host.getRoot(), {
      onSubmit: body => {
        const el = selectedRef.current;
        if (!el) return;
        const thread: CommentThread = {
          id: `preview_${Date.now()}`,
          page: location.pathname,
          url: location.href,
          identity: describeElement(el),
          body,
          resolved: false,
          createdAt: Date.now(),
        };
        setThreads(prev => [...prev, thread]);
        popover.close();
        button.show(el);
      },
      onToggleResolve: thread => {
        setThreads(prev => prev.map(item => (
          item.id === thread.id ? { ...item, resolved: !item.resolved } : item
        )));
        popover.close();
      },
      onDelete: thread => {
        setThreads(prev => prev.filter(item => item.id !== thread.id));
        popover.close();
      },
      // 预览页的 mock 评论没有截图，大图预览仅在生产插件里生效
      onPreviewImage: () => {},
      onCopyAll: () => { void navigator.clipboard?.writeText(toMarkdown(threadsRef.current, location.href)); },
      onDismiss: () => {
        const el = selectedRef.current;
        if (el) button.show(el);
      },
    });
    popoverRef.current = popover;

    return () => {
      popover.destroy();
      button.destroy();
      pointer.destroy();
      popoverRef.current = null;
      buttonRef.current = null;
      cursorStyle.remove();
    };
  }, []);

  // 预览页没有插件的快捷键逻辑，单独补一个 Esc 关闭弹层
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (!popoverRef.current?.isOpen()) return;
      popoverRef.current.close();
      buttonRef.current?.show(selectedRef.current);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, []);

  // 切换 mock 元素时把评论按钮挂到当前元素下方
  useEffect(() => {
    buttonRef.current?.show(targets[index]);
  }, [index, targets]);

  // 预览条是页面里的普通 DOM，通过自定义事件驱动
  useEffect(() => {
    const handler = (e: Event) => {
      const action = (e as CustomEvent<string>).detail;
      if (action === 'reset') {
        sessionOf(target).resetAll();
        refresh();
        return;
      }
      const i = targets.findIndex(t => t.getAttribute('data-mock') === action);
      if (i >= 0) {
        setIndex(i);
        refresh(targets[i]);
        document.querySelectorAll('#delab-preview-bar button[data-target]').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-target') === action);
        });
      }
    };
    window.addEventListener('delab-preview', handler);
    return () => window.removeEventListener('delab-preview', handler);
  }, [targets, index]);

  return (
    <ThemeProvider>
      <FloatingPanel
        data={data}
        mode="content"
        visible={visible}
        onClose={() => setVisible(false)}
        onCommit={(prop, value) => {
          if (!sessionOf(target).apply(prop, value)) return false;
          requestAnimationFrame(() => refresh());
          return true;
        }}
        onReset={(prop) => {
          sessionOf(target).reset(prop);
          requestAnimationFrame(() => refresh());
        }}
        onResetAll={() => {
          sessionOf(target).resetAll();
          requestAnimationFrame(() => refresh());
        }}
      />
    </ThemeProvider>
  );
}

createRoot(container).render(<App />);
