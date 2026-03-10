'use client';

import {usePathname} from 'next/navigation';
import {useEffect, useRef} from 'react';

import type {AppLocale} from '@/config/site';
import {trackLandingView, useTelemetryBootstrap} from '@/features/landing/telemetry/runtime';
import {terminatePendingLandingTransition} from '@/features/landing/transition/runtime';
import {
  clearLandingReturnScroll,
  readLandingReturnScrollY,
  readPendingLandingTransition
} from '@/features/landing/transition/store';

interface LandingRuntimeProps {
  locale: AppLocale;
}

interface PendingReturnScrollRestore {
  pathname: string;
  scrollY: number;
}

export function consumePendingReturnScrollRestore(pathname: string): PendingReturnScrollRestore | null {
  const scrollY = readLandingReturnScrollY();
  if (scrollY === null) {
    return null;
  }

  clearLandingReturnScroll();
  return {
    pathname,
    scrollY
  };
}

export function resolveLandingReturnScrollTop(scrollY: number, maxScrollTop: number): number {
  return Math.min(Math.max(0, scrollY), Math.max(0, maxScrollTop));
}

export function LandingRuntime({locale}: LandingRuntimeProps) {
  const pathname = usePathname();
  const telemetrySnapshot = useTelemetryBootstrap();
  const pendingReturnRestoreRef = useRef<PendingReturnScrollRestore | null>(null);

  useEffect(() => {
    if (pendingReturnRestoreRef.current?.pathname !== pathname) {
      pendingReturnRestoreRef.current = consumePendingReturnScrollRestore(pathname);
    }

    const pendingReturnRestore = pendingReturnRestoreRef.current;
    if (!pendingReturnRestore || pendingReturnRestore.pathname !== pathname) {
      return;
    }

    const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const nextScrollTop = resolveLandingReturnScrollTop(pendingReturnRestore.scrollY, maxScrollTop);

    window.scrollTo({
      top: nextScrollTop,
      left: 0,
      behavior: 'auto'
    });
    pendingReturnRestoreRef.current = null;
  }, [pathname]);

  useEffect(() => {
    const pendingTransition = readPendingLandingTransition();
    if (!pendingTransition) {
      return;
    }

    terminatePendingLandingTransition({
      locale,
      route: pathname,
      eventType: 'transition_cancel',
      resultReason: 'USER_CANCEL'
    });
  }, [locale, pathname]);

  useEffect(() => {
    if (!telemetrySnapshot.synced) {
      return;
    }

    trackLandingView({
      locale,
      route: pathname
    });
  }, [locale, pathname, telemetrySnapshot.synced]);

  return null;
}
