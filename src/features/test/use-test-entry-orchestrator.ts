import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';

import {setTelemetryConsentState} from '@/features/telemetry/consent-source';
import {clearLandingIngress, hasSeenInstruction, markInstructionSeen} from '@/features/transition/store';
import type {TestEntryPolicy, TestInstructionAction} from '@/features/test/entry-policy';
import type {LocalizedRoutePath} from '@/i18n/localized-path';

interface UseTestEntryOrchestratorInput {
  variant: string;
  landingPath: string;
  runtimeReady: boolean;
  landingIngressFlag: boolean;
  entryPolicy: TestEntryPolicy;
  router: ReturnType<typeof useRouter>;
}

interface UseTestEntryOrchestratorOutput {
  instructionSeen: boolean;
  entryCommitted: boolean;
  redirecting: boolean;
  executeInstructionAction: (action: TestInstructionAction) => void;
}

export function useTestEntryOrchestrator({
  variant,
  landingPath,
  runtimeReady,
  landingIngressFlag,
  entryPolicy,
  router
}: UseTestEntryOrchestratorInput): UseTestEntryOrchestratorOutput {
  const [instructionSeen, setInstructionSeen] = useState(() => hasSeenInstruction(variant));
  const [entryCommitted, setEntryCommitted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  // Guards commitsRuntimeEntry against double-fire when the auto-commit microtask
  // runs more than once (e.g. React Strict Mode double-invoke).
  const entryCommittedRef = useRef(false);

  const executeInstructionAction = useCallback(
    (action: TestInstructionAction) => {
      const effect = entryPolicy.effects[action];
      if (!runtimeReady || redirecting) {
        return;
      }

      if (effect.writesConsent) {
        setTelemetryConsentState(effect.writesConsent);
      }

      if (effect.recordsInstructionSeen && !instructionSeen) {
        markInstructionSeen(variant);
        setInstructionSeen(true);
      }

      if (effect.redirectHome) {
        if (landingIngressFlag) {
          clearLandingIngress(variant);
        }
        setRedirecting(true);
        router.replace(landingPath as LocalizedRoutePath);
        return;
      }

      if (!effect.commitsRuntimeEntry || entryCommittedRef.current) {
        return;
      }

      entryCommittedRef.current = true;
      setEntryCommitted(true);
    },
    [entryPolicy.effects, instructionSeen, landingIngressFlag, landingPath, redirecting, router, runtimeReady, variant]
  );

  useEffect(() => {
    if (
      !runtimeReady ||
      redirecting ||
      entryCommitted ||
      !instructionSeen ||
      !entryPolicy.canAutoCommitAfterInstructionSeen
    ) {
      return;
    }

    queueMicrotask(() => {
      if (entryCommittedRef.current) {
        return;
      }
      executeInstructionAction('start');
    });
  }, [
    entryCommitted,
    entryPolicy.canAutoCommitAfterInstructionSeen,
    executeInstructionAction,
    instructionSeen,
    redirecting,
    runtimeReady
  ]);

  return {instructionSeen, entryCommitted, redirecting, executeInstructionAction};
}
