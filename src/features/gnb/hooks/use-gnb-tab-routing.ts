'use client';

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef
} from 'react';

import type {LandingKeyboardEntryMode} from '@/features/gnb/hooks/use-landing-gnb-entry-mode';

interface UseGnbTabRoutingInput {
  getOrderedKeyboardTargets: () => HTMLElement[];
  isLandingContext: boolean;
  shouldDeferLandingGnbEntry: boolean;
  landingKeyboardEntryMode: LandingKeyboardEntryMode;
  settingsOpen: boolean;
  closeSettingsImmediate: () => void;
  focusFirstLandingCardTrigger: () => boolean;
}

interface UseGnbTabRoutingOutput {
  handleGnbKeyDownCapture: (event: ReactKeyboardEvent<HTMLElement>) => void;
}

type GnbTabRoutableEvent = Pick<
  KeyboardEvent,
  'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey' | 'preventDefault'
>;

function shouldIgnoreKeyboardEvent(event: GnbTabRoutableEvent) {
  return event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey;
}

function routeKeyboardWithinGnb(event: GnbTabRoutableEvent, input: UseGnbTabRoutingInput) {
  if (shouldIgnoreKeyboardEvent(event)) {
    return;
  }

  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const targets = input.getOrderedKeyboardTargets();
  if (targets.length === 0 || !activeElement) {
    return;
  }

  const currentIndex = targets.indexOf(activeElement);
  if (currentIndex === -1) {
    return;
  }

  const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
  if (nextIndex >= 0 && nextIndex < targets.length) {
    event.preventDefault();
    targets[nextIndex]?.focus();
    return;
  }

  if (!event.shiftKey && input.isLandingContext && input.focusFirstLandingCardTrigger()) {
    if (input.settingsOpen) {
      input.closeSettingsImmediate();
    }
    event.preventDefault();
  }
}

export function useGnbTabRouting(input: UseGnbTabRoutingInput): UseGnbTabRoutingOutput {
  const inputRef = useRef(input);

  useEffect(() => {
    inputRef.current = input;
  });

  useEffect(() => {
    const handleKeyboardTabRouting = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyboardEvent(event)) {
        return;
      }

      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const targets = inputRef.current.getOrderedKeyboardTargets();
      if (targets.length === 0) {
        return;
      }

      const isDocumentLevelTarget =
        activeElement === document.body || activeElement === document.documentElement || activeElement === null;

      if (!isDocumentLevelTarget) {
        return;
      }

      if (event.shiftKey) {
        return;
      }

      if (
        inputRef.current.isLandingContext &&
        inputRef.current.shouldDeferLandingGnbEntry &&
        inputRef.current.landingKeyboardEntryMode === 'card-first'
      ) {
        return;
      }

      event.preventDefault();
      targets[0]?.focus();
    };

    document.addEventListener('keydown', handleKeyboardTabRouting, true);
    return () => {
      document.removeEventListener('keydown', handleKeyboardTabRouting, true);
    };
  }, []);

  const handleGnbKeyDownCapture = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    routeKeyboardWithinGnb(event, inputRef.current);
  }, []);

  return {handleGnbKeyDownCapture};
}
