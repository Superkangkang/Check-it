// DeLab React 主题 Context

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ThemeManager } from './theme';

// 字体常量透传给 React 组件使用
export { SANS, MONO } from './theme';

interface ThemeContextValue {
  theme: 'light' | 'dark';
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  isDark: false,
  toggle: () => {},
});

export function ThemeProvider({ children, target }: { children: ReactNode; target?: HTMLElement }) {
  const [manager] = useState(() => new ThemeManager(target));
  const [theme, setTheme] = useState<'light' | 'dark'>(() => manager.getTheme());

  const toggle = useCallback(() => {
    manager.toggle();
    setTheme(manager.getTheme());
  }, [manager]);

  const value: ThemeContextValue = {
    theme,
    isDark: theme === 'dark',
    toggle,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
