import {useCallback, type Dispatch} from 'react';
import {useRouter} from 'next/navigation';

import {setTelemetryConsentState} from '@/features/telemetry/consent-source';
import type {
  TestEntryPolicy,
  TestInstructionAction,
  TestInstructionActionEffect
} from '@/features/test/entry-policy';
import type {QualifierOverlayItem} from '@/features/test/qualifier-overlay-model';
import {writeResponseSet} from '@/features/test/storage/response-set';
import {useAutoCommit} from '@/features/test/use-auto-commit';
import {useQualifierOverlayWizard} from '@/features/test/use-qualifier-overlay-wizard';
import type {TestRunAction, TestRunPhase} from '@/features/test/test-run-reducer';
import {clearLandingIngress, markInstructionSeen} from '@/features/transition/store';
import type {LocalizedRoutePath} from '@/i18n/localized-path';

type OverlayStepId = 'instruction' | number;

interface UseTestEntryOrchestratorInput {
  variant: string;
  landingPath: string;
  runtimeReady: boolean;
  landingIngressFlag: boolean;
  instructionSeen: boolean;
  runPhase: TestRunPhase;
  entryPolicy: TestEntryPolicy;
  qualifierItems: ReadonlyArray<QualifierOverlayItem>;
  answers: Record<string, string>;
  router: ReturnType<typeof useRouter>;
  dispatchRunAction: Dispatch<TestRunAction>;
  resetScoringAnswers: (qualifierAnswers: Record<string, string>) => void;
}

interface UseTestEntryOrchestratorOutput {
  instructionSeen: boolean;
  entryCommitted: boolean;
  redirecting: boolean;
  overlayStep: OverlayStepId;
  overlayMode: 'entry' | 'reentry';
  qualifierDraft: Record<number, string>;
  executeInstructionAction: (action: TestInstructionAction) => void;
  onQualifierSelect: (canonicalIndex: number, token: string) => void;
  onQualifierBack: () => void;
  reopenQualifierOverlay: () => void;
}

interface ApplyPreActionSideEffectsInput {
  effect: TestInstructionActionEffect;
  instructionSeen: boolean;
  variant: string;
}

function applyPreActionSideEffects({
  effect,
  instructionSeen,
  variant
}: ApplyPreActionSideEffectsInput): void {
  if (effect.writesConsent) {
    setTelemetryConsentState(effect.writesConsent);
  }

  if (effect.recordsInstructionSeen && !instructionSeen) {
    markInstructionSeen(variant);
  }
}

interface TryAdvanceQualifierStepInput {
  overlayStep: OverlayStepId;
  qualifierItems: ReadonlyArray<QualifierOverlayItem>;
  qualifierDraft: Record<number, string>;
  setOverlayStep: (next: OverlayStepId) => void;
}

function tryAdvanceQualifierStep({
  overlayStep,
  qualifierItems,
  qualifierDraft,
  setOverlayStep
}: TryAdvanceQualifierStepInput): boolean {
  if (overlayStep === 'instruction' && qualifierItems.length > 0) {
    setOverlayStep(0);
    return true;
  }

  if (typeof overlayStep === 'number') {
    const currentQualifierItem = qualifierItems[overlayStep];
    if (currentQualifierItem) {
      const selectedToken = qualifierDraft[currentQualifierItem.canonicalIndex];
      if (!selectedToken) {
        return true;
      }

      if (overlayStep < qualifierItems.length - 1) {
        setOverlayStep(overlayStep + 1);
        return true;
      }
    }
  }

  return false;
}

interface ExecuteReentryCommitInput {
  variant: string;
  qualifierItems: ReadonlyArray<QualifierOverlayItem>;
  buildQualifierAnswers: (
    qualifierItems: ReadonlyArray<QualifierOverlayItem>
  ) => Record<string, string>;
  resetScoringAnswers: (qualifierAnswers: Record<string, string>) => void;
  resetWizard: () => void;
}

function executeReentryCommit({
  variant,
  qualifierItems,
  buildQualifierAnswers,
  resetScoringAnswers,
  resetWizard
}: ExecuteReentryCommitInput): void {
  const qualifierOnlyResponses = buildQualifierAnswers(qualifierItems);
  resetScoringAnswers(qualifierOnlyResponses);
  writeResponseSet(variant, qualifierOnlyResponses);
  resetWizard();
}

interface ExecuteFreshEntryCommitInput {
  variant: string;
  qualifierItems: ReadonlyArray<QualifierOverlayItem>;
  buildQualifierAnswers: (
    qualifierItems: ReadonlyArray<QualifierOverlayItem>
  ) => Record<string, string>;
  dispatchRunAction: Dispatch<TestRunAction>;
  effect: TestInstructionActionEffect;
  resetWizard: () => void;
}

function executeFreshEntryCommit({
  variant,
  qualifierItems,
  buildQualifierAnswers,
  dispatchRunAction,
  effect,
  resetWizard
}: ExecuteFreshEntryCommitInput): void {
  const qualifierAnswers = buildQualifierAnswers(qualifierItems);
  const hasQualifierAnswers = Object.keys(qualifierAnswers).length > 0;
  dispatchRunAction({
    type: 'COMMIT_ENTRY',
    recordsInstructionSeen: effect.recordsInstructionSeen,
    ...(hasQualifierAnswers ? {qualifierAnswers} : {})
  });

  if (hasQualifierAnswers) {
    writeResponseSet(variant, qualifierAnswers);
  }

  resetWizard();
}

export function useTestEntryOrchestrator({
  variant,
  landingPath,
  runtimeReady,
  landingIngressFlag,
  instructionSeen,
  runPhase,
  entryPolicy,
  qualifierItems,
  answers,
  router,
  dispatchRunAction,
  resetScoringAnswers
}: UseTestEntryOrchestratorInput): UseTestEntryOrchestratorOutput {
  const entryCommitted = runPhase === 'active' || runPhase === 'submitted';
  const redirecting = runPhase === 'redirecting';
  const {
    overlayStep,
    overlayMode,
    qualifierDraft,
    setOverlayStep,
    onQualifierSelect,
    onQualifierBack,
    reopenQualifierOverlay: reopenQualifierOverlayWizard,
    buildQualifierAnswers,
    resetWizard
  } = useQualifierOverlayWizard();

  const reopenQualifierOverlay = useCallback(() => {
    reopenQualifierOverlayWizard(answers, qualifierItems);
  }, [answers, qualifierItems, reopenQualifierOverlayWizard]);

  const executeInstructionAction = useCallback(
    (action: TestInstructionAction) => {
      const effect = entryPolicy.effects[action];
      if (!runtimeReady || redirecting) {
        return;
      }

      applyPreActionSideEffects({
        effect,
        instructionSeen,
        variant
      });

      if (effect.redirectHome) {
        resetWizard();
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

      if (
        tryAdvanceQualifierStep({
          overlayStep,
          qualifierItems,
          qualifierDraft,
          setOverlayStep
        })
      ) {
        return;
      }

      if (overlayMode === 'reentry') {
        executeReentryCommit({
          variant,
          qualifierItems,
          buildQualifierAnswers,
          resetScoringAnswers,
          resetWizard
        });
        return;
      }

      executeFreshEntryCommit({
        variant,
        qualifierItems,
        buildQualifierAnswers,
        dispatchRunAction,
        effect,
        resetWizard
      });
    },
    [
      buildQualifierAnswers,
      dispatchRunAction,
      entryPolicy.effects,
      instructionSeen,
      landingIngressFlag,
      landingPath,
      overlayMode,
      overlayStep,
      qualifierDraft,
      qualifierItems,
      redirecting,
      resetScoringAnswers,
      resetWizard,
      router,
      runtimeReady,
      setOverlayStep,
      variant
    ]
  );

  useAutoCommit({
    runtimeReady,
    redirecting,
    entryCommitted,
    runPhase,
    instructionSeen,
    canAutoCommitAfterInstructionSeen: entryPolicy.canAutoCommitAfterInstructionSeen,
    qualifierItemsCount: qualifierItems.length,
    executeInstructionAction
  });

  return {
    instructionSeen,
    entryCommitted,
    redirecting,
    overlayStep,
    overlayMode,
    qualifierDraft,
    executeInstructionAction,
    onQualifierSelect,
    onQualifierBack,
    reopenQualifierOverlay
  };
}
