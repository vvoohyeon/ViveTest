'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';

export type ThemeSetting = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  themeSetting: ThemeSetting;
  resolvedTheme: ResolvedTheme;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = 'vt:theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({children}: {children: ReactNode}) {
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextSetting: ThemeSetting = stored === 'light' || stored === 'dark' ? stored : 'system';

    setThemeSetting(nextSetting);
    setResolvedTheme(nextSetting === 'system' ? resolveSystemTheme() : nextSetting);
  }, []);

  useEffect(() => {
    if (themeSetting !== 'system') {
      applyTheme(resolvedTheme);
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setResolvedTheme(media.matches ? 'dark' : 'light');
    sync();

    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [themeSetting, resolvedTheme]);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const toggleTheme = useCallback(() => {
    setThemeSetting((prev) => {
      const next: ThemeSetting = prev === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      setResolvedTheme(next as ResolvedTheme);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      themeSetting,
      resolvedTheme,
      toggleTheme
    }),
    [themeSetting, resolvedTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeSetting(): ThemeContextValue {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useThemeSetting must be used inside ThemeProvider');
  }

  return value;
}
