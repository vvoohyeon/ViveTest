import {useCallback, useEffect, useRef, useState, type Dispatch} from 'react';
import {useRouter} from 'next/navigation';

import {setTelemetryConsentState} from '@/features/telemetry/consent-source';
import {clearLandingIngress, markInstructionSeen} from '@/features/transition/store';
import type {TestEntryPolicy, TestInstructionAction} from '@/features/test/entry-policy';
import type {QualifierOverlayItem} from '@/features/test/qualifier-overlay-model';
import {writeResponseSet} from '@/features/test/storage/response-set';
import type {TestRunAction, TestRunPhase} from '@/features/test/test-run-reducer';
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
  const autoCommitScheduledRef = useRef(false);
  const [overlayStep, setOverlayStep] = useState<OverlayStepId>('instruction');
  const [overlayMode, setOverlayMode] = useState<'entry' | 'reentry'>('entry');
  const [qualifierDraft, setQualifierDraft] = useState<Record<number, string>>({});

  const buildQualifierAnswers = useCallback(() => {
    const entries = qualifierItems.flatMap((item): Array<[string, string]> => {
      const token = qualifierDraft[item.canonicalIndex];
      return token ? [[String(item.canonicalIndex), token]] : [];
    });

    return Object.fromEntries(entries);
  }, [qualifierDraft, qualifierItems]);

  const onQualifierBack = useCallback(() => {
    if (overlayMode === 'reentry') {
      if (typeof overlayStep === 'number' && overlayStep > 0) {
        setOverlayStep(overlayStep - 1);
        return;
      }

      setOverlayMode('entry');
      setOverlayStep('instruction');
      setQualifierDraft({});
      return;
    }

    setOverlayStep((prev) => (typeof prev === 'number' && prev > 0 ? prev - 1 : 'instruction'));
  }, [overlayMode, overlayStep]);

  const onQualifierSelect = useCallback((canonicalIndex: number, token: string) => {
    setQualifierDraft((prev) => ({...prev, [canonicalIndex]: token}));
  }, []);

  const reopenQualifierOverlay = useCallback(() => {
    const seededDraft: Record<number, string> = {};
    for (const item of qualifierItems) {
      const storedToken = answers[String(item.canonicalIndex)];
      if (storedToken && item.choices.some((choice) => choice.token === storedToken)) {
        seededDraft[item.canonicalIndex] = storedToken;
      }
    }

    setQualifierDraft(seededDraft);
    setOverlayMode('reentry');
    setOverlayStep(0);
  }, [answers, qualifierItems]);

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
        setOverlayStep('instruction');
        setQualifierDraft({});
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

      if (overlayStep === 'instruction' && qualifierItems.length > 0) {
        setOverlayStep(0);
        return;
      }

      if (typeof overlayStep === 'number') {
        const currentQualifierItem = qualifierItems[overlayStep];
        if (currentQualifierItem) {
          const selectedToken = qualifierDraft[currentQualifierItem.canonicalIndex];
          if (!selectedToken) {
            return;
          }

          if (overlayStep < qualifierItems.length - 1) {
            setOverlayStep(overlayStep + 1);
            return;
          }
        }
      }

      if (overlayMode === 'reentry') {
        const qualifierOnlyResponses = buildQualifierAnswers();
        resetScoringAnswers(qualifierOnlyResponses);
        writeResponseSet(variant, qualifierOnlyResponses);
        setOverlayMode('entry');
        setOverlayStep('instruction');
        setQualifierDraft({});
        return;
      }

      const qualifierAnswers = buildQualifierAnswers();
      const hasQualifierAnswers = Object.keys(qualifierAnswers).length > 0;
      dispatchRunAction({
        type: 'COMMIT_ENTRY',
        recordsInstructionSeen: effect.recordsInstructionSeen,
        ...(hasQualifierAnswers ? {qualifierAnswers} : {})
      });

      if (hasQualifierAnswers) {
        writeResponseSet(variant, qualifierAnswers);
      }

      setQualifierDraft({});
      setOverlayStep('instruction');
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
      qualifierItems.length > 0 ||
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
    qualifierItems.length,
    redirecting,
    runPhase,
    runtimeReady
  ]);

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
