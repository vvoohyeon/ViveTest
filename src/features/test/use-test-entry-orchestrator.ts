import {useCallback, useEffect, useRef, type Dispatch} from 'react';
import {useRouter} from 'next/navigation';

import {setTelemetryConsentState} from '@/features/telemetry/consent-source';
import {clearLandingIngress, markInstructionSeen} from '@/features/transition/store';
import type {TestEntryPolicy, TestInstructionAction} from '@/features/test/entry-policy';
import type {TestRunAction, TestRunPhase} from '@/features/test/test-run-reducer';
import type {LocalizedRoutePath} from '@/i18n/localized-path';

interface UseTestEntryOrchestratorInput {
  variant: string;
  landingPath: string;
  runtimeReady: boolean;
  landingIngressFlag: boolean;
  instructionSeen: boolean;
  runPhase: TestRunPhase;
  entryPolicy: TestEntryPolicy;
  router: ReturnType<typeof useRouter>;
  dispatchRunAction: Dispatch<TestRunAction>;
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
  instructionSeen,
  runPhase,
  entryPolicy,
  router,
  dispatchRunAction
}: UseTestEntryOrchestratorInput): UseTestEntryOrchestratorOutput {
  const entryCommitted = runPhase === 'active' || runPhase === 'submitted';
  const redirecting = runPhase === 'redirecting';
  const autoCommitScheduledRef = useRef(false);

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
      }

      if (effect.redirectHome) {
        dispatchRunAction({type: 'REDIRECT_HOME'});
        if (landingIngressFlag) {
          clearLandingIngress(variant);
        }
        router.replace(landingPath as LocalizedRoutePath);
        return;
      }

      if (!effect.commitsRuntimeEntry) {
        return;
      }

      dispatchRunAction({
        type: 'COMMIT_ENTRY',
        recordsInstructionSeen: effect.recordsInstructionSeen
      });
    },
    [
      dispatchRunAction,
      entryPolicy.effects,
      instructionSeen,
      landingIngressFlag,
      landingPath,
      redirecting,
      router,
      runtimeReady,
      variant
    ]
  );

  useEffect(() => {
    if (
      !runtimeReady ||
      redirecting ||
      entryCommitted ||
      runPhase !== 'instruction' ||
      !instructionSeen ||
      !entryPolicy.canAutoCommitAfterInstructionSeen ||
      autoCommitScheduledRef.current
    ) {
      return;
    }

    autoCommitScheduledRef.current = true;
    queueMicrotask(() => {
      executeInstructionAction('start');
    });
  }, [
    entryCommitted,
    entryPolicy.canAutoCommitAfterInstructionSeen,
    executeInstructionAction,
    instructionSeen,
    redirecting,
    runPhase,
    runtimeReady
  ]);

  return {instructionSeen, entryCommitted, redirecting, executeInstructionAction};
}
