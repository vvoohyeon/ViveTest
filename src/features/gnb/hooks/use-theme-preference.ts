'use client';

import {useCallback, useEffect, useState} from 'react';
import {flushSync} from 'react-dom';

import type {ThemePreference} from '@/features/gnb/types';
import {runBlurCircleTransition} from '@/features/gnb/hooks/theme-transition';
import {THEME_GROUND_COLOR} from '@/app/theme-ground-color';
import {LOCAL_STORAGE_KEYS} from '@/features/landing/storage/storage-keys';

type ResolvedTheme = Exclude<ThemePreference, 'system'>;

interface ApplyThemeOptions {
  sourceEl?: HTMLElement | null;
  transitionOrigin?: {
    x: number;
    y: number;
  };
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
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEYS.THEME);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? resolveSystemTheme() : preference;
}

/**
 * 브라우저 크롬 색을 **해석된 테마**로 맞춘다.
 *
 * `meta[name=theme-color]` 의 `media` 두 값은 OS 를 따르므로, OS-다크에서 라이트를 고른
 * 사용자는 페이지만 라이트고 크롬은 다크로 남는다. 부트스트랩이 첫 페인트에서 같은 일을 하고
 * 이 함수가 세션 중 변경을 잇는다 — 둘 중 하나만 있으면 어긋남이 한쪽 경로에 남는다.
 */
function syncThemeColorMeta(resolvedTheme: ResolvedTheme) {
  if (typeof document === 'undefined') {
    return;
  }

  const metas = document.querySelectorAll('meta[name="theme-color"]');

  for (const meta of metas) {
    meta.removeAttribute('media');
    meta.setAttribute('content', THEME_GROUND_COLOR[resolvedTheme]);
  }
}

function writeThemePreferenceToDom(themePreference: ThemePreference, resolvedTheme: ResolvedTheme) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolvedTheme;
    syncThemeColorMeta(resolvedTheme);
  }

  if (typeof window === 'undefined') {
    return;
  }

  if (themePreference === 'system') {
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_KEYS.THEME);
    } catch {
      // Ignore storage failures and keep runtime theme only.
    }
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, themePreference);
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
      origin: options?.transitionOrigin,
      applyThemeDomWrite: commitThemeChange
    });
  }, []);

  return {
    themePreference,
    resolvedTheme,
    applyTheme
  };
}
