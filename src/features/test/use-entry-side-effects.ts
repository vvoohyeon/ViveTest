import {useCallback} from 'react';

import {setTelemetryConsentState} from '@/features/telemetry/consent-source';
import type {TelemetryConsentState} from '@/features/telemetry/types';
import {clearLandingIngress, markInstructionSeen} from '@/features/transition/store';

type WritableConsentState = Exclude<TelemetryConsentState, 'UNKNOWN'>;

interface UseEntrySideEffectsInput {
  variant: string;
}

interface UseEntrySideEffectsOutput {
  applyConsentEffect: (consent: WritableConsentState) => void;
  applyInstructionSeenEffect: () => void;
  applyLandingIngressClearEffect: () => void;
}

export function useEntrySideEffects({
  variant
}: UseEntrySideEffectsInput): UseEntrySideEffectsOutput {
  const applyConsentEffect = useCallback((consent: WritableConsentState) => {
    setTelemetryConsentState(consent);
  }, []);

  const applyInstructionSeenEffect = useCallback(() => {
    markInstructionSeen(variant);
  }, [variant]);

  const applyLandingIngressClearEffect = useCallback(() => {
    clearLandingIngress(variant);
  }, [variant]);

  return {
    applyConsentEffect,
    applyInstructionSeenEffect,
    applyLandingIngressClearEffect
  };
}
