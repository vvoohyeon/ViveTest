'use client';

import {useCallback, useEffect, useState} from 'react';
import {flushSync} from 'react-dom';

import type {ThemePreference} from '@/features/landing/gnb/types';
import {runBlurCircleTransition} from '@/features/landing/gnb/hooks/theme-transition';

const THEME_STORAGE_KEY = 'vibetest-theme';
type ResolvedTheme = Exclude<ThemePreference, 'system'>;

interface ApplyThemeOptions {
  sourceEl?: HTMLElement | null;
}

interface ThemePreferenceController {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  applyTheme: (theme: 'light' | 'dark', options?: ApplyThemeOptions) => void;
}

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system';
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? resolveSystemTheme() : preference;
}

function writeThemePreferenceToDom(themePreference: ThemePreference, resolvedTheme: ResolvedTheme) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolvedTheme;
  }

  if (typeof window === 'undefined') {
    return;
  }

  if (themePreference === 'system') {
    try {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // Ignore storage failures and keep runtime theme only.
    }
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
  } catch {
    // Ignore storage failures and keep runtime theme only.
  }
}

export function useThemePreference(): ThemePreferenceController {
  const [manualThemePreference, setManualThemePreference] = useState<ThemePreference | null>(null);
  const [clientReady, setClientReady] = useState(false);
  const [, setSystemThemeVersion] = useState(0);
  const themePreference = manualThemePreference ?? (clientReady ? readStoredThemePreference() : 'system');
  const resolvedTheme = manualThemePreference ? resolveTheme(manualThemePreference) : clientReady ? resolveTheme(themePreference) : 'light';

  useEffect(() => {
    queueMicrotask(() => {
      setClientReady(true);
    });
  }, []);

  useEffect(() => {
    if (
      !clientReady ||
      themePreference !== 'system' ||
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }

    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      setSystemThemeVersion((current) => current + 1);
    };

    darkQuery.addEventListener('change', handleSystemThemeChange);
    return () => {
      darkQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [clientReady, themePreference]);

  useEffect(() => {
    if (!clientReady) {
      return;
    }

    writeThemePreferenceToDom(themePreference, resolvedTheme);
    return undefined;
  }, [clientReady, resolvedTheme, themePreference]);

  const applyTheme = useCallback((theme: 'light' | 'dark', options?: ApplyThemeOptions) => {
    const commitThemeChange = () => {
      flushSync(() => {
        setManualThemePreference(theme);
      });
      writeThemePreferenceToDom(theme, theme);
    };

    void runBlurCircleTransition({
      sourceEl: options?.sourceEl,
      applyThemeDomWrite: commitThemeChange
    });
  }, []);

  return {
    themePreference,
    resolvedTheme,
    applyTheme
  };
}
