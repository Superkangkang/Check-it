// DeLab Mode Switcher — 底部居中的模式切换器

import { SANS, MONO } from './theme';

export type DelabMode = 'browse' | 'inspect' | 'comment';

interface ModeSwitcherOptions {
  onSelect: (mode: DelabMode) => void;
  onClose: () => void;
  /** 应用自定义视口尺寸（debugger 模拟） */
  onViewportChange?: (width: number, height: number) => void;
  /** 还原为真实窗口尺寸 */
  onViewportReset?: () => void;
}

const STYLE_ID = 'delab-mode-switcher-style';

export class ModeSwitcher {
  private el: HTMLElement;
  private style: HTMLStyleElement;
  private buttons: Record<DelabMode, HTMLButtonElement>;
  private countEl: HTMLElement;
  private options: ModeSwitcherOptions;
  private visible = false;

  private viewportBtn: HTMLButtonElement;
  private viewportLabel: HTMLElement;
  private popover: HTMLElement;
  private vpWidth: HTMLInputElement;
  private vpHeight: HTMLInputElement;
  private vpReset: HTMLButtonElement;
  private popoverOpen = false;
  private viewport: { width: number; height: number } | null = null;

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
        width: max-content;
        max-width: calc(100vw - 12px);
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
        white-space: nowrap;
        flex-shrink: 0;
        cursor: pointer;
        transition: color 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
      }
      #delab-mode-switcher button:hover {
        color: var(--delab-glass-text, #ececee);
        background: var(--delab-row-hover, rgba(255, 255, 255, 0.05));
      }
      /* 去掉浏览器默认的蓝色焦点框，键盘聚焦时改用品牌绿描边 */
      #delab-mode-switcher button:focus { outline: none; }
      #delab-mode-switcher button:focus-visible {
        outline: 2px solid var(--delab-accent, #32f08c);
        outline-offset: -2px;
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
      /* 窄视口下隐藏快捷键提示，避免切换器在 375 宽时溢出 */
      @media (max-width: 460px) {
        #delab-mode-switcher kbd { display: none; }
      }
      /* 更窄时只留图标，保证切换器仍在视口内 */
      @media (max-width: 350px) {
        #delab-mode-switcher .delab-switch-text { display: none; }
      }
      #delab-mode-switcher .delab-switch-viewport {
        gap: 5px;
        padding: 6px 8px;
        font-family: ${MONO};
        font-size: 9px;
        font-weight: 500;
      }
      #delab-mode-switcher .delab-switch-viewport[data-active='true'] {
        color: var(--delab-accent, #32f08c);
      }
      /* --- 视口尺寸弹层 --- */
      #delab-mode-switcher .delab-vp-popover {
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        display: none;
        width: 236px;
        max-height: min(70vh, 380px);
        overflow-y: auto;
        padding: 8px;
        border-radius: 10px;
        background: var(--delab-glass-bg, rgba(23, 23, 24, 0.94));
        border: 1px solid var(--delab-glass-border, rgba(255, 255, 255, 0.12));
        box-shadow: var(--delab-shadow, 0 12px 32px -4px rgba(0, 0, 0, 0.4));
        backdrop-filter: blur(16px);
        color: var(--delab-glass-text, #ececee);
        text-align: left;
        cursor: default;
      }
      #delab-mode-switcher .delab-vp-popover[data-open='true'] { display: block; }
      #delab-mode-switcher .delab-vp-title {
        padding: 2px 4px 6px;
        font-family: ${SANS};
        font-size: 10px;
        font-weight: 500;
        color: var(--delab-glass-dim, #a1a1a6);
      }
      #delab-mode-switcher .delab-vp-popover button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 28px;
        padding: 0 8px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--delab-glass-text, #ececee);
        font-family: ${SANS};
        font-size: 11px;
        font-weight: 400;
        cursor: pointer;
      }
      #delab-mode-switcher .delab-vp-popover button:hover {
        background: var(--delab-row-hover, rgba(255, 255, 255, 0.05));
        color: var(--delab-glass-text, #ececee);
      }
      #delab-mode-switcher .delab-vp-presets em {
        font-family: ${MONO};
        font-size: 9px;
        font-style: normal;
        color: var(--delab-glass-dim, #a1a1a6);
      }
      #delab-mode-switcher .delab-vp-custom {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
        padding: 8px 4px 2px;
        border-top: 1px solid var(--delab-glass-border, rgba(255, 255, 255, 0.12));
      }
      #delab-mode-switcher .delab-vp-custom input {
        width: 0;
        min-width: 0;
        flex: 1 1 0;
        height: 26px;
        padding: 0 6px;
        border-radius: 6px;
        border: 1px solid var(--delab-field-border, rgba(255, 255, 255, 0.14));
        background: var(--delab-field-bg, #1a1a1c);
        color: var(--delab-text, #ececee);
        font-family: ${MONO};
        font-size: 10px;
      }
      #delab-mode-switcher .delab-vp-custom input:focus {
        outline: none;
        border-color: var(--delab-accent, #32f08c);
      }
      #delab-mode-switcher .delab-vp-custom input::-webkit-inner-spin-button,
      #delab-mode-switcher .delab-vp-custom input::-webkit-outer-spin-button {
        appearance: none;
        margin: 0;
      }
      #delab-mode-switcher .delab-vp-custom span {
        color: var(--delab-glass-dim, #a1a1a6);
        font-size: 10px;
      }
      #delab-mode-switcher .delab-vp-reset {
        justify-content: center;
        margin-top: 4px;
        color: var(--delab-glass-dim, #a1a1a6);
      }
      #delab-mode-switcher .delab-vp-reset:disabled {
        opacity: 0.4;
        cursor: default;
      }
      #delab-mode-switcher .delab-vp-reset:disabled:hover {
        background: transparent;
      }
      #delab-mode-switcher .delab-vp-hint {
        padding: 6px 4px 2px;
        font-family: ${SANS};
        font-size: 9px;
        line-height: 1.45;
        color: var(--delab-glass-dim, #a1a1a6);
      }
    `;
    parent.appendChild(this.style);

    this.el = document.createElement('div');
    this.el.id = 'delab-mode-switcher';
    this.el.innerHTML = `
      <button type="button" data-mode="browse" title="浏览器模式 (A)">
        <svg width="12" height="12" viewBox="0 0 48 48" fill="none" stroke="currentColor"
          stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M42 24C42 33.9411 33.9411 42 24 42C14.0589 42 6 33.9411 6 24C6 14.0589 14.0589 6 24 6C33.9411 6 42 14.0589 42 24Z" />
          <path d="M6 24H42" />
          <path d="M24 6C27.8947 11.1929 30 17.5089 30 24C30 30.4911 27.8947 36.8071 24 42C20.1053 36.8071 18 30.4911 18 24C18 17.5089 20.1053 11.1929 24 6Z" />
        </svg>
        <span class="delab-switch-text">浏览器</span>
        <kbd>A</kbd>
      </button>
      <button type="button" data-mode="inspect" title="走查模式 (C)">
        <svg width="12" height="12" viewBox="0 0 48 48" fill="none" stroke="currentColor"
          stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M38 24C38 31.732 31.732 38 24 38C16.268 38 10 31.732 10 24C10 16.268 16.268 10 24 10C31.732 10 38 16.268 38 24Z" />
          <path d="M24 4V12M24 36V44M4 24H12M36 24H44" />
        </svg>
        <span class="delab-switch-text">走查</span>
        <kbd>C</kbd>
      </button>
      <button type="button" data-mode="comment" title="评论模式 (M)">
        <svg width="12" height="12" viewBox="0 0 48 48" fill="none" stroke="currentColor"
          stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M42 30C42 31.0609 41.5786 32.0783 40.8284 32.8284C40.0783 33.5786 39.0609 34 38 34H14L6 42V10C6 8.93913 6.42143 7.92172 7.17157 7.17157C7.92172 6.42143 8.93913 6 10 6H38C39.0609 6 40.0783 6.42143 40.8284 7.17157C41.5786 7.92172 42 8.93913 42 10V30Z" />
        </svg>
        <span class="delab-switch-text">评论</span>
        <kbd>M</kbd>
        <span class="delab-switch-count"></span>
      </button>
      <span class="delab-switch-divider"></span>
      <button type="button" class="delab-switch-viewport" title="调节网页视口尺寸">
        <svg width="12" height="12" viewBox="0 0 48 48" fill="none" stroke="currentColor"
          stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="15" y="5" width="18" height="38" rx="4" />
          <path d="M21 37H27" />
        </svg>
        <span class="delab-vp-label">视口</span>
      </button>
      <span class="delab-switch-divider"></span>
      <button type="button" class="delab-switch-close" title="退出插件">
        <svg width="12" height="12" viewBox="0 0 48 48" fill="none" stroke="currentColor"
          stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M38 10L10 38" /><path d="M10 10L38 38" />
        </svg>
      </button>
      <div class="delab-vp-popover">
        <div class="delab-vp-title">视口尺寸</div>
        <div class="delab-vp-presets">
          <button type="button" data-vp="1440x900"><span>桌面</span><em>1440 × 900</em></button>
          <button type="button" data-vp="1280x800"><span>笔记本</span><em>1280 × 800</em></button>
          <button type="button" data-vp="768x1024"><span>平板</span><em>768 × 1024</em></button>
          <button type="button" data-vp="390x844"><span>手机</span><em>390 × 844</em></button>
          <button type="button" data-vp="375x812"><span>手机</span><em>375 × 812</em></button>
        </div>
        <div class="delab-vp-custom">
          <input type="number" class="delab-vp-w" min="320" max="3840" step="1" aria-label="视口宽度" placeholder="宽" />
          <span>×</span>
          <input type="number" class="delab-vp-h" min="480" max="2160" step="1" aria-label="视口高度" placeholder="高" />
          <button type="button" class="delab-vp-apply"
            style="width:auto;flex:0 0 auto;padding:0 10px;background:var(--delab-btn-bg,#ececee);color:var(--delab-btn-text,#0b0b0c);font-weight:600;">应用</button>
        </div>
        <button type="button" class="delab-vp-reset" disabled>还原为窗口大小</button>
        <div class="delab-vp-hint">在新的标签页打开设备预览工作区：左侧拖边缘改视口尺寸，右侧同步显示样式面板</div>
      </div>
    `;
    parent.appendChild(this.el);

    this.buttons = {
      browse: this.el.querySelector<HTMLButtonElement>('[data-mode="browse"]')!,
      inspect: this.el.querySelector<HTMLButtonElement>('[data-mode="inspect"]')!,
      comment: this.el.querySelector<HTMLButtonElement>('[data-mode="comment"]')!,
    };
    this.countEl = this.el.querySelector('.delab-switch-count')!;
    this.viewportBtn = this.el.querySelector<HTMLButtonElement>('.delab-switch-viewport')!;
    this.viewportLabel = this.el.querySelector<HTMLElement>('.delab-vp-label')!;
    this.popover = this.el.querySelector<HTMLElement>('.delab-vp-popover')!;
    this.vpWidth = this.el.querySelector<HTMLInputElement>('.delab-vp-w')!;
    this.vpHeight = this.el.querySelector<HTMLInputElement>('.delab-vp-h')!;
    this.vpReset = this.el.querySelector<HTMLButtonElement>('.delab-vp-reset')!;

    this.el.addEventListener('click', this.handleClick);
    document.addEventListener('mousedown', this.handleDocMouseDown, true);
    document.addEventListener('keydown', this.handleDocKeyDown);
  }

  show(mode: DelabMode) {
    this.visible = true;
    this.el.style.display = 'flex';
    this.setMode(mode);
  }

  hide() {
    this.visible = false;
    this.closePopover();
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

  /** 同步当前模拟视口；null 表示按真实窗口大小 */
  setViewport(state: { width: number; height: number } | null) {
    this.viewport = state;
    this.viewportLabel.textContent = state ? `${state.width}×${state.height}` : '视口';
    this.viewportBtn.dataset.active = String(!!state);
    this.viewportBtn.title = state
      ? `视口 ${state.width} × ${state.height}（点击调节）`
      : '调节网页视口尺寸';
    this.vpReset.disabled = !state;
    this.vpWidth.value = String(state?.width ?? Math.round(window.innerWidth));
    this.vpHeight.value = String(state?.height ?? Math.round(window.innerHeight));
  }

  destroy() {
    this.el.removeEventListener('click', this.handleClick);
    document.removeEventListener('mousedown', this.handleDocMouseDown, true);
    document.removeEventListener('keydown', this.handleDocKeyDown);
    this.el.remove();
    this.style.remove();
  }

  private togglePopover() {
    if (this.popoverOpen) {
      this.closePopover();
      return;
    }
    const state = this.viewport;
    this.vpWidth.value = String(state?.width ?? Math.round(window.innerWidth));
    this.vpHeight.value = String(state?.height ?? Math.round(window.innerHeight));
    this.popoverOpen = true;
    this.popover.dataset.open = 'true';
  }

  private closePopover() {
    this.popoverOpen = false;
    this.popover.dataset.open = 'false';
  }

  private submitViewport(widthRaw: string | number, heightRaw: string | number) {
    const width = Math.round(Number(widthRaw));
    const height = Math.round(Number(heightRaw));
    if (!Number.isFinite(width) || !Number.isFinite(height)) return;

    this.options.onViewportChange?.(
      Math.max(320, Math.min(3840, width)),
      Math.max(480, Math.min(2160, height)),
    );
    this.closePopover();
  }

  private handleDocMouseDown = (event: MouseEvent) => {
    if (!this.popoverOpen) return;
    // 事件在 Shadow DOM 内会被重定向到宿主，必须用 composedPath 判断
    if (event.composedPath().includes(this.el)) return;
    this.closePopover();
  };

  private handleDocKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.popoverOpen) this.closePopover();
  };

  private handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    if (target.closest('.delab-switch-close')) {
      this.options.onClose();
      return;
    }
    if (target.closest('.delab-switch-viewport')) {
      this.togglePopover();
      return;
    }
    const preset = target.closest<HTMLElement>('[data-vp]')?.dataset.vp;
    if (preset) {
      const [width, height] = preset.split('x');
      this.submitViewport(width, height);
      return;
    }
    if (target.closest('.delab-vp-apply')) {
      this.submitViewport(this.vpWidth.value, this.vpHeight.value);
      return;
    }
    if (target.closest('.delab-vp-reset')) {
      this.options.onViewportReset?.();
      this.closePopover();
      return;
    }

    const mode = target.closest<HTMLElement>('[data-mode]')?.dataset.mode as DelabMode | undefined;
    if (mode === 'browse' || mode === 'inspect' || mode === 'comment') {
      this.options.onSelect(mode);
    }
  };
}
