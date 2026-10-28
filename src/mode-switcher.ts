// DeLab Mode Switcher — 底部居中的模式切换器

import { SANS, MONO } from './theme';

export type DelabMode = 'browse' | 'inspect' | 'comment';

interface ModeSwitcherOptions {
  onSelect: (mode: DelabMode) => void;
  onClose: () => void;
}

const STYLE_ID = 'delab-mode-switcher-style';

export class ModeSwitcher {
  private el: HTMLElement;
  private style: HTMLStyleElement;
  private buttons: Record<DelabMode, HTMLButtonElement>;
  private countEl: HTMLElement;
  private options: ModeSwitcherOptions;
  private visible = false;

  constructor(parent: ShadowRoot | HTMLElement, options: ModeSwitcherOptions) {
    this.options = options;

    this.style = document.createElement('style');
    this.style.id = STYLE_ID;
    this.style.textContent = `
      #delab-mode-switcher {
        position: fixed;
        left: 50%;
        bottom: 16px;
        transform: translateX(-50%);
        display: none;
        align-items: center;
        gap: 2px;
        padding: 3px;
        border-radius: 10px;
        background: var(--delab-glass-bg, rgba(23, 23, 24, 0.94));
        border: 1px solid var(--delab-glass-border, rgba(255, 255, 255, 0.12));
        box-shadow: var(--delab-shadow, 0 12px 32px -4px rgba(0, 0, 0, 0.4));
        backdrop-filter: blur(16px);
        font-family: ${SANS};
        font-size: 11px;
        line-height: 1;
        z-index: 2147483646;
        pointer-events: auto;
        user-select: none;
      }
      #delab-mode-switcher button {
        appearance: none;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 7px;
        border: none;
        background: transparent;
        color: var(--delab-glass-dim, #a1a1a6);
        font: inherit;
        font-weight: 500;
        cursor: pointer;
        transition: color 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
      }
      #delab-mode-switcher button:hover {
        color: var(--delab-glass-text, #ececee);
        background: var(--delab-row-hover, rgba(255, 255, 255, 0.05));
      }
      /* 激活态：反转色胶囊（对应站点 Export 按钮的黑白反转） */
      #delab-mode-switcher button[data-active='true'] {
        color: var(--delab-btn-text, #0b0b0c);
        background: var(--delab-btn-bg, #ececee);
      }
      #delab-mode-switcher kbd {
        font-family: ${MONO};
        font-size: 9px;
        font-weight: 600;
        color: var(--delab-glass-dim, #a1a1a6);
        padding: 2px 4px;
        border-radius: 4px;
        border: 1px solid var(--delab-glass-border, rgba(255, 255, 255, 0.12));
      }
      #delab-mode-switcher button[data-active='true'] kbd {
        color: inherit;
        border-color: color-mix(in srgb, currentColor 35%, transparent);
      }
      #delab-mode-switcher .delab-switch-count {
        display: none;
        min-width: 15px;
        padding: 0 4px;
        border-radius: 999px;
        background: var(--delab-accent, #32f08c);
        color: var(--delab-accent-contrast, #0b0b0c);
        font-family: ${MONO};
        font-size: 9px;
        font-weight: 700;
        line-height: 15px;
        text-align: center;
      }
      #delab-mode-switcher .delab-switch-count[data-visible='true'] {
        display: inline-block;
      }
      #delab-mode-switcher .delab-switch-divider {
        width: 1px;
        align-self: stretch;
        margin: 3px 3px;
        background: var(--delab-glass-border, rgba(255, 255, 255, 0.12));
      }
      #delab-mode-switcher .delab-switch-close {
        padding: 6px 7px;
        color: var(--delab-glass-dim, #a1a1a6);
      }
      #delab-mode-switcher .delab-switch-close:hover {
        color: var(--delab-danger, #f65a5a);
        background: color-mix(in srgb, var(--delab-danger, #f65a5a) 12%, transparent);
      }
    `;
    parent.appendChild(this.style);

    this.el = document.createElement('div');
    this.el.id = 'delab-mode-switcher';
    this.el.innerHTML = `
      <button type="button" data-mode="browse" title="浏览器模式 (A)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
        </svg>
        浏览器
        <kbd>A</kbd>
      </button>
      <button type="button" data-mode="inspect" title="走查模式 (C)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
        走查
        <kbd>C</kbd>
      </button>
      <button type="button" data-mode="comment" title="评论模式 (M)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
        </svg>
        评论
        <kbd>M</kbd>
        <span class="delab-switch-count"></span>
      </button>
      <span class="delab-switch-divider"></span>
      <button type="button" class="delab-switch-close" title="退出插件">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    `;
    parent.appendChild(this.el);

    this.buttons = {
      browse: this.el.querySelector<HTMLButtonElement>('[data-mode="browse"]')!,
      inspect: this.el.querySelector<HTMLButtonElement>('[data-mode="inspect"]')!,
      comment: this.el.querySelector<HTMLButtonElement>('[data-mode="comment"]')!,
    };
    this.countEl = this.el.querySelector('.delab-switch-count')!;

    this.el.addEventListener('click', this.handleClick);
  }

  show(mode: DelabMode) {
    this.visible = true;
    this.el.style.display = 'flex';
    this.setMode(mode);
  }

  hide() {
    this.visible = false;
    this.el.style.display = 'none';
  }

  isVisible(): boolean {
    return this.visible;
  }

  setMode(mode: DelabMode) {
    for (const key of ['browse', 'inspect', 'comment'] as DelabMode[]) {
      this.buttons[key].dataset.active = String(key === mode);
    }
  }

  /** 评论模式下按钮上展示未解决数量 */
  setCommentCount(count: number) {
    this.countEl.textContent = count > 0 ? String(count) : '';
    this.countEl.dataset.visible = String(count > 0);
  }

  destroy() {
    this.el.removeEventListener('click', this.handleClick);
    this.el.remove();
    this.style.remove();
  }

  private handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    if (target.closest('.delab-switch-close')) {
      this.options.onClose();
      return;
    }

    const mode = target.closest<HTMLElement>('[data-mode]')?.dataset.mode as DelabMode | undefined;
    if (mode === 'browse' || mode === 'inspect' || mode === 'comment') {
      this.options.onSelect(mode);
    }
  };
}
