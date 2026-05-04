import {useCallback} from 'react';

import {
  isVisibleFocusableElement,
  queueFocusCallback
} from '@/features/landing/grid/interaction-dom';

interface UseLandingKeyboardEntryInput {
  isMobileViewport: boolean;
}

interface UseLandingKeyboardEntryOutput {
  focusLandingReverseGnbTarget: () => boolean;
  queueLandingReverseGnbTargetFocus: () => void;
}

/**
 * Resolves and focuses the last focusable GNB element when the user
 * Shift+Tabs out of the first landing card.
 *
 * @future-move R-06
 * Currently uses DOM selectors (data-testid, CSS class) to locate GNB elements.
 * During R-06 namespace reorganisation, GNB hooks (use-gnb-mobile-menu.ts,
 * use-gnb-desktop-settings.ts) should expose a `focusTrigger(): void` callback
 * so this module no longer needs knowledge of GNB DOM structure.
 * Target files for that change:
 *   - src/features/gnb/use-gnb-mobile-menu.ts
 *   - src/features/gnb/use-gnb-desktop-settings.ts (planned)
 */
export function useLandingKeyboardEntry({
  isMobileViewport
}: UseLandingKeyboardEntryInput): UseLandingKeyboardEntryOutput {
  const focusLandingReverseGnbTarget = useCallback((): boolean => {
    if (typeof document === 'undefined') {
      return false;
    }

    const selectors = isMobileViewport
      ? ['[data-testid="gnb-mobile-menu-trigger"]', '.gnb-mobile .gnb-ci-link']
      : ['[data-testid="gnb-settings-trigger"]', '.gnb-desktop-links a:last-of-type', '.gnb-desktop .gnb-ci-link'];

    for (const selector of selectors) {
      const candidate = document.querySelector<HTMLElement>(selector);
      if (!isVisibleFocusableElement(candidate)) {
        continue;
      }

      candidate.focus();
      return true;
    }

    return false;
  }, [isMobileViewport]);

  const queueLandingReverseGnbTargetFocus = useCallback(() => {
    queueFocusCallback(() => {
      focusLandingReverseGnbTarget();
    });
  }, [focusLandingReverseGnbTarget]);

  return {
    focusLandingReverseGnbTarget,
    queueLandingReverseGnbTargetFocus
  };
}
