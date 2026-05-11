import {useCallback, useState} from 'react';

import type {LandingCardMobileTransientMode} from '@/features/landing/grid/landing-grid-card';
import type {LandingMobileLifecycleState} from '@/features/landing/grid/mobile-lifecycle';

export interface MobileTransientShellState {
  mode: LandingCardMobileTransientMode;
  cardVariant: string | null;
  snapshot: LandingMobileLifecycleState['snapshot'];
}

export const initialMobileTransientShellState: MobileTransientShellState = {
  mode: 'NONE',
  cardVariant: null,
  snapshot: null
};

export interface UseMobileTransientShellOutput {
  mobileTransientShellState: MobileTransientShellState;
  resetMobileTransientShell: () => void;
  startMobileTransientShell: (
    mode: Exclude<LandingCardMobileTransientMode, 'NONE'>,
    cardVariant: string,
    snapshot: NonNullable<LandingMobileLifecycleState['snapshot']>
  ) => void;
}

export function useMobileTransientShell(): UseMobileTransientShellOutput {
  const [mobileTransientShellState, setMobileTransientShellState] = useState<MobileTransientShellState>(
    initialMobileTransientShellState
  );

  const resetMobileTransientShell = useCallback(() => {
    setMobileTransientShellState(initialMobileTransientShellState);
  }, []);

  const startMobileTransientShell = useCallback(
    (
      mode: Exclude<LandingCardMobileTransientMode, 'NONE'>,
      cardVariant: string,
      snapshot: NonNullable<LandingMobileLifecycleState['snapshot']>
    ) => {
      setMobileTransientShellState({
        mode,
        cardVariant,
        snapshot
      });
    },
    []
  );

  return {
    mobileTransientShellState,
    resetMobileTransientShell,
    startMobileTransientShell
  };
}
