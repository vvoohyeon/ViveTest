'use client';

import type {useRouter} from 'next/navigation';
import {useCallback, useEffect, useRef} from 'react';

import {shouldUseHistoryBack} from '@/features/landing/gnb/behavior';
import {SESSION_STORAGE_KEYS} from '@/features/landing/storage/storage-keys';
import type {LocalizedRoutePath} from '@/i18n/localized-path';

const MOBILE_TEST_BACK_FALLBACK_TIMEOUT_MS = 220;

type AppRouter = ReturnType<typeof useRouter>;

/**
 * @future-move R-06
 * Keep this hook with the GNB behavior extraction group until the follow-up
 * ownership move is explicitly approved.
 */
export function useGnbBackNavigation({
  pathname,
  homeHref,
  router
}: {
  pathname: string;
  homeHref: LocalizedRoutePath;
  router: AppRouter;
}) {
  const mobileBackFallbackTimerRef = useRef<number | null>(null);
  const previousInternalPathRef = useRef<string | null>(null);

  const clearMobileBackFallbackTimer = useCallback(() => {
    if (mobileBackFallbackTimerRef.current !== null) {
      window.clearTimeout(mobileBackFallbackTimerRef.current);
      mobileBackFallbackTimerRef.current = null;
    }
  }, []);

  const handleTestBack = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const previousInternalPath = previousInternalPathRef.current;
    const hasInternalPrevious = !!previousInternalPath && previousInternalPath !== pathname;

    if (!hasInternalPrevious || window.history.length <= 1) {
      router.push(homeHref, {scroll: false});
      return;
    }

    const beforePathname = window.location.pathname;
    window.history.back();

    clearMobileBackFallbackTimer();
    mobileBackFallbackTimerRef.current = window.setTimeout(() => {
      if (window.location.pathname === beforePathname) {
        router.push(homeHref, {scroll: false});
      }
    }, MOBILE_TEST_BACK_FALLBACK_TIMEOUT_MS);
  }, [clearMobileBackFallbackTimer, homeHref, pathname, router]);

  const handleStandardBack = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (
      shouldUseHistoryBack({
        historyLength: window.history.length,
        referrer: document.referrer,
        currentOrigin: window.location.origin
      })
    ) {
      window.history.back();
      return;
    }

    router.push(homeHref, {scroll: false});
  }, [homeHref, router]);

  useEffect(() => {
    if (pathname.length === 0) {
      return;
    }

    try {
      const currentStoredPath = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.CURRENT_PATH);
      if (currentStoredPath && currentStoredPath !== pathname) {
        window.sessionStorage.setItem(SESSION_STORAGE_KEYS.PREVIOUS_PATH, currentStoredPath);
      }
      window.sessionStorage.setItem(SESSION_STORAGE_KEYS.CURRENT_PATH, pathname);
      previousInternalPathRef.current = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.PREVIOUS_PATH);
    } catch {
      previousInternalPathRef.current = null;
    }
  }, [pathname]);

  return {
    handleTestBack,
    handleStandardBack,
    clearMobileBackFallbackTimer
  };
}
