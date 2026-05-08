'use client';

import {useEffect, useState} from 'react';
import type {RefObject} from 'react';

import type {MobileMenuState} from '@/features/gnb/types';

export type LandingKeyboardEntryMode = 'card-first' | 'gnb';

interface UseLandingGnbEntryModeInput {
  isLandingContext: boolean;
  gnbShellRef: RefObject<HTMLElement | null>;
  mobileMenuPanelId: string;
  settingsOpen: boolean;
  mobileMenuState: MobileMenuState;
}

interface UseLandingGnbEntryModeOutput {
  landingKeyboardEntryMode: LandingKeyboardEntryMode;
  shouldDeferLandingGnbEntry: boolean;
  desktopLandingTabIndex: -1 | undefined;
  mobileLandingTabIndex: -1 | undefined;
}

function isWithinInteractiveGnb(
  target: EventTarget | null,
  gnbShellRef: RefObject<HTMLElement | null>,
  mobileMenuPanelId: string
): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const mobilePanel = document.getElementById(mobileMenuPanelId);
  const interactiveTarget = target.closest<HTMLElement>(
    'a[href], button, [data-testid="gnb-settings-panel"], [data-testid="gnb-mobile-menu-panel"]'
  );
  if (!interactiveTarget) {
    return false;
  }

  return !!gnbShellRef.current?.contains(interactiveTarget) || !!mobilePanel?.contains(interactiveTarget);
}

export function useLandingGnbEntryMode(input: UseLandingGnbEntryModeInput): UseLandingGnbEntryModeOutput {
  const {isLandingContext, gnbShellRef, mobileMenuPanelId, settingsOpen, mobileMenuState} = input;
  const [landingKeyboardEntryMode, setLandingKeyboardEntryMode] = useState<LandingKeyboardEntryMode>(
    isLandingContext ? 'card-first' : 'gnb'
  );

  const shouldDeferLandingGnbEntry =
    isLandingContext && !settingsOpen && mobileMenuState === 'closed' && landingKeyboardEntryMode === 'card-first';
  const desktopLandingTabIndex = shouldDeferLandingGnbEntry ? -1 : undefined;
  const mobileLandingTabIndex = shouldDeferLandingGnbEntry ? -1 : undefined;

  useEffect(() => {
    if (!isLandingContext) {
      return;
    }

    const handleFocusIn = (event: FocusEvent) => {
      setLandingKeyboardEntryMode(
        isWithinInteractiveGnb(event.target, gnbShellRef, mobileMenuPanelId) ? 'gnb' : 'card-first'
      );
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isWithinInteractiveGnb(event.target, gnbShellRef, mobileMenuPanelId)) {
        setLandingKeyboardEntryMode('card-first');
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [gnbShellRef, isLandingContext, mobileMenuPanelId]);

  return {
    landingKeyboardEntryMode,
    shouldDeferLandingGnbEntry,
    desktopLandingTabIndex,
    mobileLandingTabIndex
  };
}
