'use client';

import {useCallback, useEffect, useState} from 'react';

import type {ThemePreference} from '@/features/landing/gnb/types';

const THEME_STORAGE_KEY = 'vibetest-theme';

interface ThemePreferenceController {
  themePreference: ThemePreference;
  applyManualTheme: (theme: 'light' | 'dark') => void;
}

export function useThemePreference(): ThemePreferenceController {
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        window.requestAnimationFrame(() => {
          setThemePreference(stored);
        });
      }
    } catch {
      // Ignore storage failures and keep system-follow fallback.
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyResolvedTheme = () => {
      const resolved = themePreference === 'system' ? (darkQuery.matches ? 'dark' : 'light') : themePreference;
      root.dataset.theme = resolved;
    };

    applyResolvedTheme();

    if (themePreference === 'system') {
      try {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      } catch {
        // Ignore storage failures and keep runtime theme only.
      }

      darkQuery.addEventListener('change', applyResolvedTheme);
      return () => {
        darkQuery.removeEventListener('change', applyResolvedTheme);
      };
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    } catch {
      // Ignore storage failures and keep runtime theme only.
    }

    return undefined;
  }, [themePreference]);

  const applyManualTheme = useCallback((theme: 'light' | 'dark') => {
    setThemePreference(theme);
  }, []);

  return {
    themePreference,
    applyManualTheme
  };
}
