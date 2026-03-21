'use client';

import {useCallback, useEffect, useState} from 'react';

import type {ThemePreference} from '@/features/landing/gnb/types';

const THEME_STORAGE_KEY = 'vibetest-theme';
type ResolvedTheme = Exclude<ThemePreference, 'system'>;

interface ThemePreferenceController {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  applyManualTheme: (theme: 'light' | 'dark') => void;
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

export function useThemePreference(): ThemePreferenceController {
  const [manualThemePreference, setManualThemePreference] = useState<ThemePreference | null>(null);
  const [clientReady, setClientReady] = useState(false);
  const [, setSystemThemeVersion] = useState(0);
  const themePreference = manualThemePreference ?? (clientReady ? readStoredThemePreference() : 'system');
  const resolvedTheme = clientReady ? resolveTheme(themePreference) : 'light';

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

    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;

    if (themePreference === 'system') {
      try {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      } catch {
        // Ignore storage failures and keep runtime theme only.
      }
      return undefined;
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    } catch {
      // Ignore storage failures and keep runtime theme only.
    }

    return undefined;
  }, [clientReady, resolvedTheme, themePreference]);

  const applyManualTheme = useCallback((theme: 'light' | 'dark') => {
    setManualThemePreference(theme);
  }, []);

  return {
    themePreference,
    resolvedTheme,
    applyManualTheme
  };
}
