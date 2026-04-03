'use client';

import type {LandingTransitionResultReason} from '@/features/landing/transition/store';

export const LANDING_TRANSITION_SIGNAL_EVENT = 'landing:transition-signal';

export type LandingTransitionSignal =
  | 'transition_start'
  | 'transition_complete'
  | 'transition_fail'
  | 'transition_cancel';

export interface LandingTransitionSignalDetail {
  signal: LandingTransitionSignal;
  transitionId: string;
  sourceVariant: string;
  targetRoute: string;
  resultReason?: LandingTransitionResultReason;
}

export function emitLandingTransitionSignal(
  detail: LandingTransitionSignalDetail
): LandingTransitionSignalDetail {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new window.CustomEvent(LANDING_TRANSITION_SIGNAL_EVENT, {
        detail
      })
    );
  }

  return detail;
}
