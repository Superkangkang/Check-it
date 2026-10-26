// DeLab 主题管理器

type Theme = 'light' | 'dark';

const CSS_VARIABLES: Record<Theme, Record<string, string>> = {
  light: {
    '--delab-bg': '#fdfcfc',
    '--delab-text': '#000000',
    '--delab-text-secondary': '#777169',
    '--delab-border': '#e5e5e5',
    '--delab-accent': '#5e6ad2',
    '--delab-row-hover': '#f5f3f1',
    '--delab-field-bg': '#f2f0ee',
    '--delab-field-hover': '#eae7e4',
    '--delab-field-border': 'rgba(0, 0, 0, 0.18)',
    '--delab-glass-bg': 'rgba(255, 255, 255, 0.88)',
    '--delab-glass-text': '#000000',
    '--delab-glass-dim': '#777169',
    '--delab-glass-border': 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    '--delab-bg': '#08090a',
    '--delab-text': '#f7f8f8',
    '--delab-text-secondary': '#8a8f98',
    '--delab-border': '#23252a',
    '--delab-accent': '#5e6ad2',
    '--delab-row-hover': '#161718',
    '--delab-field-bg': '#1c1d20',
    '--delab-field-hover': '#232529',
    '--delab-field-border': 'rgba(255, 255, 255, 0.16)',
    '--delab-glass-bg': 'rgba(15, 16, 17, 0.85)',
    '--delab-glass-text': '#f7f8f8',
    '--delab-glass-dim': '#8a8f98',
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
