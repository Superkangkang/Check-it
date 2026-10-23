// DeLab Content Script

import { InspectState, InspectStateManager } from './state';
import { BoxModelOverlay } from './box-model-overlay';
import { GlassLabel } from './box-model-tooltip';
import { ShadowHost } from './shadow-dom';
import { StyleExtractor } from './style-extractor';
import { Viewfinder } from './highlight';
import { injectFonts } from './fonts';
import { FloatingPanelManager } from './components/FloatingPanel';

class DelabApp {
  private stateManager: InspectStateManager;
  private shadowHost: ShadowHost;
  private boxModelOverlay: BoxModelOverlay;
  private glassLabel: GlassLabel;
  private viewfinder: Viewfinder;
  private extractor: StyleExtractor;
  private panelMgr: FloatingPanelManager;

  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  private lastHoverTarget: Element | null = null;

  constructor() {
    this.stateManager = new InspectStateManager();
    this.shadowHost = new ShadowHost();
    const root = this.shadowHost.getRoot();
    this.boxModelOverlay = new BoxModelOverlay(root);
    this.glassLabel = new GlassLabel(root);
    this.viewfinder = new Viewfinder(root);
    this.extractor = new StyleExtractor();

    // 传入 close 回调：直接退出检查模式，无需消息往返
    this.panelMgr = new FloatingPanelManager(() => {
      this.exitInspectMode();
      chrome.runtime.sendMessage({ type: 'INSPECT_MODE_CHANGED', active: false });
    });

    injectFonts();
    this.init();
  }

  private init() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TOGGLE_INSPECT') {
        message.active ? this.enterInspectMode() : this.exitInspectMode();
      }
      if (message.type === 'EXIT_INSPECT') {
        this.exitInspectMode();
      }
    });
  }

  private enterInspectMode() {
    this.stateManager.setState(InspectState.INSPECTING);
    document.addEventListener('mouseover', this.handleMouseOver, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.body.style.cursor = 'crosshair';
    this.panelMgr.showEmpty();
  }

  private exitInspectMode() {
    this.stateManager.setState(InspectState.IDLE);
    document.removeEventListener('mouseover', this.handleMouseOver, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.body.style.cursor = '';
    if (this.hoverTimer) { clearTimeout(this.hoverTimer); this.hoverTimer = null; }
    this.lastHoverTarget = null;
    this.viewfinder.hide();
    this.boxModelOverlay.hide();
    this.glassLabel.unpin();
    this.panelMgr.hide();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.exitInspectMode();
      chrome.runtime.sendMessage({ type: 'INSPECT_MODE_CHANGED', active: false });
    }
  };

  private handleMouseOver = (e: MouseEvent) => {
    const target = e.target as Element;
    if (target === document.body || target === document.documentElement) return;
    if (target.closest('#delab-root') || target.closest('#delab-floating-root')) return;

    this.glassLabel.show(target);
    this.viewfinder.show(target);

    if (target === this.lastHoverTarget) return;
    this.lastHoverTarget = target;

    if (this.hoverTimer) clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => {
      this.hoverTimer = null;
      this.boxModelOverlay.show(target);
    }, 80);
  };

  private handleClick = (e: MouseEvent) => {
    const target = e.target as Element;
    if (target === document.body || target === document.documentElement) return;
    if (target.closest('#delab-root') || target.closest('#delab-floating-root')) return;

    e.preventDefault();
    e.stopPropagation();

    this.stateManager.setState(InspectState.LOCKED);
    this.glassLabel.pin(target);
    this.boxModelOverlay.show(target);

    const groups = this.extractor.extract(target);
    const boxModel = this.extractor.getBoxModel(target);
    this.panelMgr.showData({
      tagName: target.tagName.toLowerCase(),
      id: target.id || '',
      classes: (target as HTMLElement).className || '',
      groups,
      boxModel,
    });
  };
}

new DelabApp();
