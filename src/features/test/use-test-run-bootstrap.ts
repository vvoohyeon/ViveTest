import {useEffect, useRef, type Dispatch} from 'react';

import type {AppLocale} from '@/config/site';
import {terminatePendingLandingTransition} from '@/features/transition/runtime';
import {
  clearInstructionSeen,
  hasSeenInstruction,
  readLandingIngress,
  readPendingLandingTransition
} from '@/features/transition/store';
import type {VariantId} from '@/features/test/domain';
import type {QualifierOverlayItem} from '@/features/test/qualifier-overlay-model';
import {hasValidQualifierAnswers} from '@/features/test/qualifier-resume-validator';
import type {ResolvedQuestion} from '@/features/test/question-bank';
import {
  buildBootstrapResponseSet,
  resolveQuestionBootstrapState,
  type QuestionBootstrapState
} from '@/features/test/question-runtime-utils';
import {getActiveRun} from '@/features/test/storage/active-run';
import {readResponseSet} from '@/features/test/storage/response-set';
import {volatilizeRunData} from '@/features/test/storage/volatility';
import type {TestRunAction} from '@/features/test/test-run-reducer';

interface UseTestRunBootstrapParams {
  variant: string;
  variantId: VariantId;
  locale: AppLocale;
  pathname: string;
  questions: ReadonlyArray<ResolvedQuestion>;
  qualifierItems: ReadonlyArray<QualifierOverlayItem>;
  dispatchRunAction: Dispatch<TestRunAction>;
  pendingTransitionIdRef: {current: string | null};
  onPendingTransitionIdChange: (id: string | null) => void;
}

export function useTestRunBootstrap({
  variant,
  variantId,
  locale,
  pathname,
  questions,
  qualifierItems,
  dispatchRunAction,
  pendingTransitionIdRef,
  onPendingTransitionIdChange
}: UseTestRunBootstrapParams): void {
  const bootstrapStateRef = useRef<QuestionBootstrapState | null>(null);

  useEffect(() => {
    if (bootstrapStateRef.current) {
      const cachedBootstrapState = bootstrapStateRef.current;
      queueMicrotask(() => {
        dispatchRunAction({
          type: 'BOOTSTRAP_COMPLETE',
          instructionSeen: cachedBootstrapState.instructionSeen,
          landingIngressFlag: cachedBootstrapState.runtimeState.landingIngressFlag,
          currentQuestionIndex: cachedBootstrapState.runtimeState.currentQuestionIndex,
          answers: cachedBootstrapState.runtimeState.answers,
          autoCommitEntry: cachedBootstrapState.entryMode === 'resume' && cachedBootstrapState.instructionSeen,
          entryMode: cachedBootstrapState.entryMode
        });
        onPendingTransitionIdChange(pendingTransitionIdRef.current);
      });
      return;
    }

    const pendingTransition = readPendingLandingTransition();
    if (pendingTransition && (pendingTransition.targetType !== 'test' || pendingTransition.variant !== variant)) {
      terminatePendingLandingTransition({
        signal: 'transition_fail',
        resultReason: 'DESTINATION_LOAD_ERROR'
      });
    }

    const nextPendingTransition = readPendingLandingTransition();
    const landingIngress = readLandingIngress(variant);
    const activeRun = landingIngress ? null : getActiveRun(variantId);
    const responseSet = activeRun ? readResponseSet(variant) : null;
    const qualifierResumeIsValid = activeRun ? hasValidQualifierAnswers(qualifierItems, responseSet ?? {}) : true;
    const effectiveActiveRun = qualifierResumeIsValid ? activeRun : null;
    const effectiveResponseSet = qualifierResumeIsValid ? responseSet : null;
    let nextInstructionSeen = hasSeenInstruction(variant);

    if (!qualifierResumeIsValid) {
      volatilizeRunData(variantId, 'restart');
      nextInstructionSeen = false;
    }

    const bootstrapResponseSet = effectiveResponseSet
      ? buildBootstrapResponseSet(effectiveResponseSet, qualifierItems)
      : null;
    const bootstrapState = resolveQuestionBootstrapState({
      activeRun: effectiveActiveRun,
      instructionSeen: nextInstructionSeen,
      landingIngress,
      pendingTransition: nextPendingTransition,
      questions,
      responseSet: bootstrapResponseSet,
      variant
    });
    const bootstrapAnswers =
      bootstrapState.entryMode === 'resume' && effectiveResponseSet
        ? effectiveResponseSet
        : bootstrapState.runtimeState.answers;

    if (nextInstructionSeen && !bootstrapState.instructionSeen) {
      clearInstructionSeen(variant);
    }

    pendingTransitionIdRef.current = bootstrapState.pendingTransitionToComplete;
    bootstrapStateRef.current = bootstrapState;
    queueMicrotask(() => {
      dispatchRunAction({
        type: 'BOOTSTRAP_COMPLETE',
        instructionSeen: bootstrapState.instructionSeen,
        landingIngressFlag: bootstrapState.runtimeState.landingIngressFlag,
        currentQuestionIndex: bootstrapState.runtimeState.currentQuestionIndex,
        answers: bootstrapAnswers,
        autoCommitEntry: bootstrapState.entryMode === 'resume' && bootstrapState.instructionSeen,
        entryMode: bootstrapState.entryMode
      });
      onPendingTransitionIdChange(bootstrapState.pendingTransitionToComplete);
    });
  }, [
    dispatchRunAction,
    locale,
    onPendingTransitionIdChange,
    pathname,
    pendingTransitionIdRef,
    qualifierItems,
    questions,
    variant,
    variantId
  ]);
}
