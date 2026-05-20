import {useEffect, useRef, type Dispatch} from 'react';

import type {AppLocale} from '@/config/site';
import {terminatePendingLandingTransition} from '@/features/transition/runtime';
import {
  readLandingIngress,
  readPendingLandingTransition,
  type LandingIngressRecord
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
import {getActiveRun, type ActiveRun} from '@/features/test/storage/active-run';
import {clearInstructionSeen, hasSeenInstruction} from '@/features/test/storage/instruction-seen';
import {readResponseSet, type ResponseSet} from '@/features/test/storage/response-set';
import {volatilizeRunData} from '@/features/test/storage/volatility';
import type {StoredAnswer, TestRunAction} from '@/features/test/test-run-reducer';

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

type CachedBootstrapState = QuestionBootstrapState & {
  bootstrapAnswers: Record<string, StoredAnswer>;
};

interface BootstrapInputs {
  landingIngress: LandingIngressRecord | null;
  effectiveActiveRun: ActiveRun | null;
  effectiveResponseSet: ResponseSet | null;
  qualifierResumeIsValid: boolean;
  nextInstructionSeen: boolean;
}

function tryReplayFromCache(
  cached: CachedBootstrapState | null,
  dispatchRunAction: Dispatch<TestRunAction>,
  pendingTransitionIdRef: {current: string | null},
  onPendingTransitionIdChange: (id: string | null) => void
): boolean {
  if (!cached) {
    return false;
  }

  queueMicrotask(() => {
    dispatchRunAction({
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: cached.instructionSeen,
      landingIngressFlag: cached.runtimeState.landingIngressFlag,
      currentQuestionIndex: cached.runtimeState.currentQuestionIndex,
      answers: cached.bootstrapAnswers,
      autoCommitEntry: cached.entryMode === 'resume' && cached.instructionSeen,
      entryMode: cached.entryMode
    });
    onPendingTransitionIdChange(pendingTransitionIdRef.current);
  });

  return true;
}

function tryTerminateMismatchedTransition(variant: string): void {
  const pendingTransition = readPendingLandingTransition();
  if (!pendingTransition || (pendingTransition.targetType === 'test' && pendingTransition.variant === variant)) {
    return;
  }

  terminatePendingLandingTransition({
    signal: 'transition_fail',
    resultReason: 'DESTINATION_LOAD_ERROR'
  });
}

function resolveBootstrapInputs(
  variant: string,
  variantId: VariantId,
  qualifierItems: ReadonlyArray<QualifierOverlayItem>
): BootstrapInputs {
  const landingIngress = readLandingIngress(variant);
  const activeRun = landingIngress ? null : getActiveRun(variantId);
  const responseSet = activeRun ? readResponseSet(variant) : null;
  const qualifierResumeIsValid = activeRun ? hasValidQualifierAnswers(qualifierItems, responseSet ?? {}) : true;

  return {
    landingIngress,
    effectiveActiveRun: qualifierResumeIsValid ? activeRun : null,
    effectiveResponseSet: qualifierResumeIsValid ? responseSet : null,
    qualifierResumeIsValid,
    nextInstructionSeen: hasSeenInstruction(variant)
  };
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
  const bootstrapStateRef = useRef<CachedBootstrapState | null>(null);

  useEffect(() => {
    if (
      tryReplayFromCache(
        bootstrapStateRef.current,
        dispatchRunAction,
        pendingTransitionIdRef,
        onPendingTransitionIdChange
      )
    ) {
      return;
    }

    tryTerminateMismatchedTransition(variant);
    const nextPendingTransition = readPendingLandingTransition();
    const inputs = resolveBootstrapInputs(variant, variantId, qualifierItems);
    let nextInstructionSeen = inputs.nextInstructionSeen;

    if (!inputs.qualifierResumeIsValid) {
      volatilizeRunData(variantId, 'restart');
      nextInstructionSeen = false;
    }

    const bootstrapResponseSet = inputs.effectiveResponseSet
      ? buildBootstrapResponseSet(inputs.effectiveResponseSet, qualifierItems)
      : null;
    const bootstrapState = resolveQuestionBootstrapState({
      activeRun: inputs.effectiveActiveRun,
      instructionSeen: nextInstructionSeen,
      landingIngress: inputs.landingIngress,
      pendingTransition: nextPendingTransition,
      questions,
      responseSet: bootstrapResponseSet,
      variant
    });
    const bootstrapAnswers =
      bootstrapState.entryMode === 'resume' && inputs.effectiveResponseSet
        ? inputs.effectiveResponseSet
        : bootstrapState.runtimeState.answers;

    if (nextInstructionSeen && !bootstrapState.instructionSeen) {
      clearInstructionSeen(variant);
    }

    pendingTransitionIdRef.current = bootstrapState.pendingTransitionToComplete;
    bootstrapStateRef.current = {...bootstrapState, bootstrapAnswers};
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
