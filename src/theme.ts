// DeLab 主题管理器 — 参考 getgradients.com 的双主题设计语言
// 近黑 / 暖灰底、发丝级边框、品牌绿点缀、黑白反转主按钮

export type Theme = 'light' | 'dark';

/** UI 无衬线字体（getgradients 同款系统栈） */
export const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif";

/** 数值 / 代码 / 标签用等宽字体（随扩展打包） */
export const MONO = "'JetBrains Mono', 'SF Mono', Menlo, monospace";

const CSS_VARIABLES: Record<Theme, Record<string, string>> = {
  light: {
    // 表面
    '--delab-bg': '#f5f5f6',
    '--delab-elevated': '#ffffff',
    '--delab-row-hover': 'rgba(0, 0, 0, 0.045)',
    '--delab-sel': 'rgba(0, 0, 0, 0.07)',
    // 文本
    '--delab-text': '#141416',
    '--delab-text-secondary': '#57575e',
    '--delab-text-tertiary': '#8a8a90',
    // 边框
    '--delab-border': 'rgba(0, 0, 0, 0.08)',
    '--delab-border-strong': 'rgba(0, 0, 0, 0.16)',
    // 输入字段
    '--delab-field-bg': '#ffffff',
    '--delab-field-hover': '#f3f3f5',
    '--delab-field-border': 'rgba(0, 0, 0, 0.12)',
    // 品牌绿
    '--delab-accent': '#0eb668',
    '--delab-accent-contrast': '#0b0b0c',
    '--delab-accent-soft': 'rgba(14, 182, 104, 0.14)',
    // 主按钮：黑底白字（对应站点 Export 按钮）
    '--delab-btn-bg': '#141416',
    '--delab-btn-text': '#ffffff',
    // 状态
    '--delab-danger': '#e5484d',
    // 阴影
    '--delab-shadow': '0 2px 8px -1px rgba(0, 0, 0, 0.10), 0 12px 32px -4px rgba(0, 0, 0, 0.18)',
    // 页面浮层（toast / 标签等贴页面元素的玻璃面）
    '--delab-glass-bg': 'rgba(255, 255, 255, 0.92)',
    '--delab-glass-text': '#141416',
    '--delab-glass-dim': '#57575e',
    '--delab-glass-border': 'rgba(0, 0, 0, 0.10)',
  },
  dark: {
    // 表面
    '--delab-bg': '#0b0b0c',
    '--delab-elevated': '#171718',
    '--delab-row-hover': 'rgba(255, 255, 255, 0.05)',
    '--delab-sel': 'rgba(255, 255, 255, 0.09)',
    // 文本
    '--delab-text': '#ececee',
    '--delab-text-secondary': '#a1a1a6',
    '--delab-text-tertiary': '#6e6e73',
    // 边框
    '--delab-border': 'rgba(255, 255, 255, 0.08)',
    '--delab-border-strong': 'rgba(255, 255, 255, 0.14)',
    // 输入字段
    '--delab-field-bg': '#1a1a1c',
    '--delab-field-hover': '#232325',
    '--delab-field-border': 'rgba(255, 255, 255, 0.14)',
    // 品牌绿
    '--delab-accent': '#32f08c',
    '--delab-accent-contrast': '#0b0b0c',
    '--delab-accent-soft': 'rgba(50, 240, 140, 0.14)',
    // 主按钮：白底黑字
    '--delab-btn-bg': '#ececee',
    '--delab-btn-text': '#0b0b0c',
    // 状态
    '--delab-danger': '#f65a5a',
    // 阴影
    '--delab-shadow': '0 2px 8px -1px rgba(0, 0, 0, 0.40), 0 12px 32px -4px rgba(0, 0, 0, 0.60)',
    // 页面浮层
    '--delab-glass-bg': 'rgba(23, 23, 24, 0.94)',
    '--delab-glass-text': '#ececee',
    '--delab-glass-dim': '#a1a1a6',
    '--delab-glass-border': 'rgba(255, 255, 255, 0.12)',
  },
};

export class ThemeManager {
  private currentTheme: Theme;
  private target: HTMLElement;

  constructor(target?: HTMLElement) {
    this.target = target || document.documentElement;
    this.currentTheme = this.loadTheme();
    this.applyTheme();
  }

  setTarget(target: HTMLElement) {
    this.target = target;
    this.applyTheme();
  }

  private loadTheme(): Theme {
    const stored = localStorage.getItem('delab-theme');
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  private applyTheme() {
    const variables = CSS_VARIABLES[this.currentTheme];
    for (const [key, value] of Object.entries(variables)) {
      this.target.style.setProperty(key, value);
    }
  }

  toggle() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('delab-theme', this.currentTheme);
    this.applyTheme();
  }

  isDark(): boolean {
    return this.currentTheme === 'dark';
  }

  getTheme(): Theme {
    return this.currentTheme;
  }
}
