import {useCallback, useEffect, useRef, useState} from 'react';

import type {AppLocale} from '@/config/site';
import {trackAttemptStart, trackFinalSubmit} from '@/features/telemetry/runtime';
import {terminatePendingLandingTransition} from '@/features/transition/runtime';
import {
  consumeLandingIngress,
  hasSeenInstruction,
  readLandingIngress,
  readPendingLandingTransition
} from '@/features/transition/store';
import type {ResolvedQuestion} from '@/features/test/question-bank';
import {writeResponseSet} from '@/features/test/storage/response-set';
import {
  buildInitialRuntimeState,
  resolveQuestionBootstrapState,
  resolveScoringProgress,
  type QuestionRuntimeState,
  type ScoringProgress
} from '@/features/test/question-runtime-utils';

interface TestRunControllerInput {
  variant: string;
  locale: AppLocale;
  pathname: string;
  questions: ReadonlyArray<ResolvedQuestion>;
  entryCommitted: boolean;
}

interface TestRunControllerOutput {
  runtimeReady: boolean;
  landingIngressFlag: boolean;
  currentQuestionIndex: number;
  started: boolean;
  submitted: boolean;
  currentQuestion: ResolvedQuestion | null;
  currentAnswer: 'A' | 'B' | undefined;
  allAnswered: boolean;
  scoringProgress: ScoringProgress;
  totalQuestions: number;
  answers: Record<string, 'A' | 'B'>;
  pendingTransitionId: string | null;
  clearPendingTransitionId: () => void;
  updateAnswer: (choice: 'A' | 'B') => void;
  moveQuestion: (direction: -1 | 1) => void;
  handleSubmit: () => void;
}

export function useTestRunController({
  variant,
  locale,
  pathname,
  questions,
  entryCommitted
}: TestRunControllerInput): TestRunControllerOutput {
  const [runtimeState, setRuntimeState] = useState<QuestionRuntimeState>(buildInitialRuntimeState);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const dwellStartRef = useRef<number | null>(null);
  const dwellByQuestionRef = useRef<Record<string, number>>({});
  const attemptStartedRef = useRef(false);
  const bootstrapRuntimeStateRef = useRef<QuestionRuntimeState | null>(null);
  const pendingTransitionIdRef = useRef<string | null>(null);
  const [pendingTransitionId, setPendingTransitionId] = useState<string | null>(null);

  useEffect(() => {
    if (bootstrapRuntimeStateRef.current) {
      queueMicrotask(() => {
        setRuntimeState(bootstrapRuntimeStateRef.current ?? buildInitialRuntimeState());
        setPendingTransitionId(pendingTransitionIdRef.current);
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
    const nextInstructionSeen = hasSeenInstruction(variant);
    const bootstrapState = resolveQuestionBootstrapState({
      instructionSeen: nextInstructionSeen,
      landingIngress,
      pendingTransition: nextPendingTransition,
      questions,
      variant
    });

    pendingTransitionIdRef.current = bootstrapState.pendingTransitionToComplete;
    bootstrapRuntimeStateRef.current = bootstrapState.runtimeState;
    queueMicrotask(() => {
      setRuntimeState(bootstrapState.runtimeState);
      setPendingTransitionId(bootstrapState.pendingTransitionToComplete);
    });
  }, [locale, pathname, questions, variant]);

  useEffect(() => {
    if (!runtimeState.ready || !entryCommitted || attemptStartedRef.current) {
      return;
    }

    attemptStartedRef.current = true;
    trackAttemptStart({
      locale,
      route: pathname,
      variant,
      questionIndex: runtimeState.currentQuestionIndex,
      dwellMsAccumulated: 0,
      landingIngressFlag: runtimeState.landingIngressFlag
    });
    queueMicrotask(() => {
      setStarted(true);
    });
    dwellStartRef.current = Date.now();

    if (runtimeState.landingIngressFlag) {
      consumeLandingIngress(variant);
    }
  }, [entryCommitted, locale, pathname, runtimeState.currentQuestionIndex, runtimeState.landingIngressFlag, runtimeState.ready, variant]);

  const totalQuestions = questions.length;
  const currentQuestion = questions[runtimeState.currentQuestionIndex - 1] ?? questions[0] ?? null;
  const scoringProgress = resolveScoringProgress({questions, answers: runtimeState.answers});
  const currentAnswer = currentQuestion ? runtimeState.answers[String(currentQuestion.canonicalIndex)] : undefined;
  const allAnswered = questions.every(
    (question) =>
      runtimeState.answers[String(question.canonicalIndex)] === 'A' ||
      runtimeState.answers[String(question.canonicalIndex)] === 'B'
  );

  const settleCurrentQuestionDwell = () => {
    if (!currentQuestion || dwellStartRef.current === null) {
      return;
    }

    const delta = Math.max(0, Date.now() - dwellStartRef.current);
    dwellByQuestionRef.current[currentQuestion.id] = (dwellByQuestionRef.current[currentQuestion.id] ?? 0) + delta;
    dwellStartRef.current = Date.now();
  };

  const updateAnswer = (choice: 'A' | 'B') => {
    if (!currentQuestion || submitted) {
      return;
    }

    const canonicalKey = String(currentQuestion.canonicalIndex);
    const newAnswers = {...runtimeState.answers, [canonicalKey]: choice};
    setRuntimeState((previous) => ({
      ...previous,
      answers: {...previous.answers, [canonicalKey]: choice}
    }));
    // write-only storage: read path (readResponseSet, getActiveRun) is Phase 4/5 scope
    writeResponseSet(variant, newAnswers);
  };

  const moveQuestion = (direction: -1 | 1) => {
    if (!started || !currentQuestion) {
      return;
    }

    settleCurrentQuestionDwell();
    setRuntimeState((previous) => {
      const nextIndex = Math.min(
        totalQuestions,
        Math.max(1, previous.currentQuestionIndex + direction)
      );

      if (direction === -1) {
        const filteredAnswers = Object.fromEntries(
          Object.entries(previous.answers).filter(
            ([key]) => Number(key) < nextIndex
          )
        ) as Record<string, 'A' | 'B'>;
        return {...previous, currentQuestionIndex: nextIndex, answers: filteredAnswers};
      }

      return {...previous, currentQuestionIndex: nextIndex};
    });
  };

  const handleSubmit = () => {
    if (!started || !allAnswered) {
      return;
    }

    settleCurrentQuestionDwell();
    const dwellMsAccumulated = Object.values(dwellByQuestionRef.current).reduce((sum, value) => sum + value, 0);
    const finalResponses = {...runtimeState.answers};
    trackFinalSubmit({
      locale,
      route: pathname,
      variant,
      questionIndex: totalQuestions,
      dwellMsAccumulated,
      landingIngressFlag: runtimeState.landingIngressFlag,
      finalResponses
    });
    setSubmitted(true);
  };

  const clearPendingTransitionId = useCallback(() => {
    pendingTransitionIdRef.current = null;
    setPendingTransitionId(null);
  }, []);

  return {
    runtimeReady: runtimeState.ready,
    landingIngressFlag: runtimeState.landingIngressFlag,
    currentQuestionIndex: runtimeState.currentQuestionIndex,
    started,
    submitted,
    currentQuestion,
    currentAnswer,
    allAnswered,
    scoringProgress,
    totalQuestions,
    answers: runtimeState.answers,
    pendingTransitionId,
    clearPendingTransitionId,
    updateAnswer,
    moveQuestion,
    handleSubmit
  };
}
