import {isVisibleFocusableElement} from '@/features/landing/grid/interaction-dom';

export const LANDING_CARD_TRIGGER_SELECTOR = '[data-testid="landing-grid-card-trigger"]:not([aria-disabled="true"])';

export function focusFirstLandingCardTrigger(options?: {root?: ParentNode}): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const candidates = Array.from((options?.root ?? document).querySelectorAll<HTMLElement>(LANDING_CARD_TRIGGER_SELECTOR));
  const trigger = candidates.find((candidate) => !candidate.closest('[inert]') && isVisibleFocusableElement(candidate));
  if (!trigger) {
    return false;
  }

  trigger.focus();
  return true;
}

export function isVisibleFocusableGnbElement(element: HTMLElement | null): element is HTMLElement {
  return isVisibleFocusableElement(element, {excludeDisabled: true});
}
