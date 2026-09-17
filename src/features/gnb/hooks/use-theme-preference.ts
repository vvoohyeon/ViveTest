'use client';

import {useCallback, useEffect, useState} from 'react';
import {flushSync} from 'react-dom';

import type {ThemePreference} from '@/features/gnb/types';
import {runBlurCircleTransition} from '@/features/gnb/hooks/theme-transition';
import {THEME_GROUND_COLOR} from '@/app/theme-ground-color';
import {LOCAL_STORAGE_KEYS} from '@/features/landing/storage/storage-keys';
import {readLocal, removeLocal, writeLocal} from '@/lib/safe-storage';

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
  /**
   * `'system'` 도 받는다 — 명세 규칙 5 의 두 주장(고른 것 · 적용 중인 것)을 화면이 구분해
   * 그리려면 **고른 것으로 돌아갈 길**이 있어야 한다. 종전에는 `light`/`dark` 만 받아서 한 번
   * 명시 선택을 하면 시스템을 따르는 상태로 되돌아갈 방법이 제품에 없었다.
   */
  applyTheme: (preference: ThemePreference, options?: ApplyThemeOptions) => void;
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

  const stored = readLocal(LOCAL_STORAGE_KEYS.THEME);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
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
    removeLocal(LOCAL_STORAGE_KEYS.THEME);
    return;
  }

  // 못 써도 그대로 간다 — 이번 방문 동안의 테마는 런타임이 들고 있다.
  writeLocal(LOCAL_STORAGE_KEYS.THEME, themePreference);
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

  const applyTheme = useCallback((preference: ThemePreference, options?: ApplyThemeOptions) => {
    const commitThemeChange = () => {
      // `system` 으로 돌아갈 때 실제로 그려질 테마는 OS 가 정한다 — 선호와 해석을 여기서
      // 갈라 두지 않으면 DOM 에 `data-theme="system"` 이라는 없는 값이 적힌다.
      const nextResolvedTheme = resolveTheme(preference);

      flushSync(() => {
        setManualThemePreference(preference);
      });
      writeThemePreferenceToDom(preference, nextResolvedTheme);
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
