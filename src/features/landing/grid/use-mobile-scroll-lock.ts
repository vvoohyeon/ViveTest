import type {LandingCardMobilePhase} from '@/features/landing/grid/landing-grid-card';
import {useBodyScrollLock} from '@/features/ui/body-scroll-lock';

const BODY_SCROLL_LOCK_TOKEN = 'landing-mobile-card';

export function shouldLockMobilePageScroll(phase: LandingCardMobilePhase): boolean {
  return phase === 'OPENING' || phase === 'CLOSING';
}

export function useMobileScrollLock(phase: LandingCardMobilePhase): void {
  useBodyScrollLock(BODY_SCROLL_LOCK_TOKEN, shouldLockMobilePageScroll(phase));
}
