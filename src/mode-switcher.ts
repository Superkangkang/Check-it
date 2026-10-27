// DeLab Mode Switcher — 底部居中的模式切换器

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
        padding: 4px;
        border-radius: 10px;
        background: rgba(20, 22, 26, 0.92);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(12px);
        font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
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
        border-radius: 6px;
        border: 1px solid transparent;
        background: transparent;
        color: #9aa1ab;
        font: inherit;
        cursor: pointer;
        transition: color 0.12s ease, background 0.12s ease, border-color 0.12s ease;
      }
      #delab-mode-switcher button:hover {
        color: #f7f8f8;
        background: rgba(255, 255, 255, 0.06);
      }
      #delab-mode-switcher button[data-active='true'] {
        color: #ffffff;
        background: rgba(94, 106, 210, 0.22);
        border-color: rgba(94, 106, 210, 0.65);
      }
      #delab-mode-switcher kbd {
        font: inherit;
        font-size: 10px;
        color: #7b828c;
        padding: 1px 4px;
        border-radius: 3px;
        border: 1px solid rgba(255, 255, 255, 0.14);
      }
      #delab-mode-switcher button[data-active='true'] kbd {
        color: #c7ccff;
        border-color: rgba(150, 160, 255, 0.45);
      }
      #delab-mode-switcher .delab-switch-count {
        display: none;
        min-width: 16px;
        padding: 0 4px;
        border-radius: 999px;
        background: rgba(94, 106, 210, 0.45);
        color: #ffffff;
        font-size: 10px;
        line-height: 16px;
        text-align: center;
      }
      #delab-mode-switcher .delab-switch-count[data-visible='true'] {
        display: inline-block;
      }
      #delab-mode-switcher .delab-switch-divider {
        width: 1px;
        align-self: stretch;
        margin: 2px 4px;
        background: rgba(255, 255, 255, 0.1);
      }
      #delab-mode-switcher .delab-switch-close {
        padding: 6px 7px;
        color: #6f7681;
      }
      #delab-mode-switcher .delab-switch-close:hover {
        color: #ff8b8b;
        background: rgba(255, 107, 107, 0.12);
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
