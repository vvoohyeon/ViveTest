'use client';

import {useCallback, useEffect, useRef, useState} from 'react';

import {
  DESKTOP_SETTINGS_HOVER_CLOSE_DELAY_MS,
  shouldOpenDesktopSettingsByHover
} from '@/features/landing/gnb/behavior';

/**
 * @future-move R-06
 * Keep this hook with the GNB behavior extraction group until the follow-up
 * ownership move is explicitly approved.
 */
export function useGnbDesktopSettings({
  hoverOpenEnabled
}: {
  hoverOpenEnabled: boolean;
  viewportWidth: number;
  hoverCapable: boolean;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRootRef = useRef<HTMLDivElement | null>(null);
  const settingsHoverCloseTimerRef = useRef<number | null>(null);

  const canOpenDesktopSettingsByHover = useCallback(() => {
    if (hoverOpenEnabled) {
      return true;
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }

    return shouldOpenDesktopSettingsByHover({
      viewportWidth: window.innerWidth,
      hoverCapable: window.matchMedia('(hover: hover) and (pointer: fine)').matches
    });
  }, [hoverOpenEnabled]);

  const clearSettingsHoverCloseTimer = useCallback(() => {
    if (settingsHoverCloseTimerRef.current !== null) {
      window.clearTimeout(settingsHoverCloseTimerRef.current);
      settingsHoverCloseTimerRef.current = null;
    }
  }, []);

  const openSettingsImmediate = useCallback(() => {
    clearSettingsHoverCloseTimer();
    setSettingsOpen(true);
  }, [clearSettingsHoverCloseTimer]);

  const toggleSettingsOpen = useCallback(() => {
    clearSettingsHoverCloseTimer();
    setSettingsOpen((previous) => !previous);
  }, [clearSettingsHoverCloseTimer]);

  const closeSettingsImmediate = useCallback(() => {
    clearSettingsHoverCloseTimer();
    setSettingsOpen(false);
  }, [clearSettingsHoverCloseTimer]);

  const desktopSettingsEnter = useCallback(() => {
    if (!canOpenDesktopSettingsByHover()) {
      return;
    }

    clearSettingsHoverCloseTimer();
    setSettingsOpen(true);
  }, [canOpenDesktopSettingsByHover, clearSettingsHoverCloseTimer]);

  const desktopSettingsLeave = useCallback(() => {
    if (!canOpenDesktopSettingsByHover()) {
      return;
    }

    clearSettingsHoverCloseTimer();
    settingsHoverCloseTimerRef.current = window.setTimeout(() => {
      setSettingsOpen(false);
    }, DESKTOP_SETTINGS_HOVER_CLOSE_DELAY_MS);
  }, [canOpenDesktopSettingsByHover, clearSettingsHoverCloseTimer]);

  const desktopSettingsBlurCapture = useCallback(() => {
    if (!settingsOpen) {
      return;
    }

    window.requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active instanceof Node && settingsRootRef.current?.contains(active)) {
        return;
      }

      closeSettingsImmediate();
    });
  }, [closeSettingsImmediate, settingsOpen]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!settingsRootRef.current?.contains(target)) {
        closeSettingsImmediate();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [closeSettingsImmediate, settingsOpen]);

  return {
    settingsOpen,
    settingsRootRef,
    openSettingsImmediate,
    toggleSettingsOpen,
    closeSettingsImmediate,
    clearSettingsHoverCloseTimer,
    desktopSettingsEnter,
    desktopSettingsLeave,
    desktopSettingsBlurCapture
  };
}
