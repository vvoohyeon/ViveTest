import {useCallback, useEffect, useReducer, useRef, useState, type Dispatch} from 'react';

import type {AppLocale} from '@/config/site';
import {trackAttemptStart, trackFinalSubmit} from '@/features/telemetry/runtime';
import {terminatePendingLandingTransition} from '@/features/transition/runtime';
import {
  clearInstructionSeen,
  consumeLandingIngress,
  hasSeenInstruction,
  readLandingIngress,
  readPendingLandingTransition
} from '@/features/transition/store';
import {asVariantId} from '@/features/test/domain';
import type {QualifierOverlayItem} from '@/features/test/qualifier-overlay-model';
import {hasValidQualifierAnswers} from '@/features/test/qualifier-resume-validator';
import type {ResolvedQuestion} from '@/features/test/question-bank';
import {getActiveRun, saveActiveRun, writeLastAnsweredAt} from '@/features/test/storage/active-run';
import {readResponseSet, writeResponseSet, type ResponseSet} from '@/features/test/storage/response-set';
import {volatilizeRunData} from '@/features/test/storage/volatility';
import {
  isProfileQuestion,
  resolveQuestionBootstrapState,
  resolveScoringProgress,
  type QuestionBootstrapState,
  type ScoringProgress
} from '@/features/test/question-runtime-utils';
import {
  hasAllRequiredAnswers,
  isRuntimeActive,
  isRuntimeSubmitted,
  testRunReducer,
  buildInitialTestRunState,
  type SemanticAnswer,
  type TestRunAction,
  type TestRunPhase
} from '@/features/test/test-run-reducer';

interface TestRunControllerInput {
  variant: string;
  locale: AppLocale;
  pathname: string;
  questions: ReadonlyArray<ResolvedQuestion>;
  qualifierItems?: ReadonlyArray<QualifierOverlayItem>;
}

interface TestRunControllerOutput {
  runtimeReady: boolean;
  runPhase: TestRunPhase;
  landingIngressFlag: boolean;
  instructionSeen: boolean;
  currentQuestionIndex: number;
  started: boolean;
  submitted: boolean;
  currentQuestion: ResolvedQuestion | null;
  currentAnswer: 'A' | 'B' | undefined;
  allAnswered: boolean;
  scoringProgress: ScoringProgress;
  totalQuestions: number;
  answers: Record<string, string>;
  pendingTransitionId: string | null;
  dispatchRunAction: Dispatch<TestRunAction>;
  clearPendingTransitionId: () => void;
  updateAnswer: (choice: SemanticAnswer) => void;
  moveQuestion: (direction: -1 | 1, choiceOverride?: SemanticAnswer) => void;
  handleSubmit: () => void;
}

const EMPTY_QUALIFIER_ITEMS: ReadonlyArray<QualifierOverlayItem> = [];

function skipForwardPastProfile(
  index: number,
  questions: ReadonlyArray<ResolvedQuestion>
): number {
  let i = index;
  while (i <= questions.length && isProfileQuestion(questions[i - 1])) {
    i += 1;
  }
  return Math.min(i, questions.length);
}

function skipBackwardPastProfile(
  index: number,
  questions: ReadonlyArray<ResolvedQuestion>
): number {
  let i = index;
  while (i > 1 && isProfileQuestion(questions[i - 1])) {
    i -= 1;
  }
  return i;
}

function buildBootstrapResponseSet(
  responseSet: ResponseSet,
  qualifierItems: ReadonlyArray<QualifierOverlayItem>
): Record<string, 'A' | 'B'> {
  const qualifierIndexes = new Set(qualifierItems.map((item) => String(item.canonicalIndex)));
  const bootstrapResponses: Record<string, 'A' | 'B'> = {};

  for (const [key, value] of Object.entries(responseSet)) {
    if (value === 'A' || value === 'B') {
      bootstrapResponses[key] = value;
      continue;
    }

    if (qualifierIndexes.has(key)) {
      bootstrapResponses[key] = 'A';
    }
  }

  return bootstrapResponses;
}

function buildSemanticAnswerMap(answers: Record<string, string>): Record<string, 'A' | 'B'> {
  const semanticAnswers: Record<string, 'A' | 'B'> = {};

  for (const [key, value] of Object.entries(answers)) {
    if (value === 'A' || value === 'B') {
      semanticAnswers[key] = value;
    }
  }

  return semanticAnswers;
}

export function useTestRunController({
  variant,
  locale,
  pathname,
  questions,
  qualifierItems = EMPTY_QUALIFIER_ITEMS
}: TestRunControllerInput): TestRunControllerOutput {
  const [runState, dispatchRunAction] = useReducer(testRunReducer, buildInitialTestRunState());
  const variantId = asVariantId(variant);

  const dwellStartRef = useRef<number | null>(null);
  const dwellByQuestionRef = useRef<Record<string, number>>({});
  const processedEntrySequenceRef = useRef(0);
  const bootstrapStateRef = useRef<QuestionBootstrapState | null>(null);
  const pendingTransitionIdRef = useRef<string | null>(null);
  const [pendingTransitionId, setPendingTransitionId] = useState<string | null>(null);

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
    const activeRun = landingIngress ? null : getActiveRun(variantId);
    const responseSet = activeRun ? readResponseSet(variant) : null;
    const qualifierResumeIsValid = activeRun
      ? hasValidQualifierAnswers(qualifierItems, responseSet ?? {})
      : true;
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
      setPendingTransitionId(bootstrapState.pendingTransitionToComplete);
    });
  }, [locale, pathname, qualifierItems, questions, variant, variantId]);

  useEffect(() => {
    if (runState.phase !== 'active' || runState.entrySequence <= processedEntrySequenceRef.current) {
      return;
    }

    processedEntrySequenceRef.current = runState.entrySequence;

    if (runState.entryMode === 'new') {
      const entryQuestionIndex = skipForwardPastProfile(runState.currentQuestionIndex, questions);
      trackAttemptStart({
        locale,
        route: pathname,
        variant,
        questionIndex: entryQuestionIndex,
        dwellMsAccumulated: 0,
        landingIngressFlag: runState.landingIngressFlag
      });

      if (runState.landingIngressFlag) {
        consumeLandingIngress(variant);
      }

      const now = Date.now();
      saveActiveRun(variantId, {
        variantId,
        startedAtMs: now,
        lastAnsweredAtMs: now
      });

      if (Object.keys(runState.entryAnswersSnapshot).length > 0) {
        writeResponseSet(variant, runState.entryAnswersSnapshot);
      } else {
        writeResponseSet(variant, {});
      }
    }

    dwellStartRef.current = Date.now();
  }, [
    locale,
    pathname,
    runState.currentQuestionIndex,
    runState.entryMode,
    runState.entryAnswersSnapshot,
    runState.entrySequence,
    runState.landingIngressFlag,
    runState.phase,
    questions,
    variant,
    variantId
  ]);

  const totalQuestions = questions.length;
  const currentQuestionIndex =
    isRuntimeActive(runState) || isRuntimeSubmitted(runState)
      ? skipForwardPastProfile(runState.currentQuestionIndex, questions)
      : runState.currentQuestionIndex;
  const currentQuestion = questions[currentQuestionIndex - 1] ?? questions[0] ?? null;
  const scoringProgress = resolveScoringProgress({questions, answers: buildSemanticAnswerMap(runState.answers)});
  const storedCurrentAnswer = currentQuestion ? runState.answers[String(currentQuestion.canonicalIndex)] : undefined;
  const currentAnswer = storedCurrentAnswer === 'A' || storedCurrentAnswer === 'B' ? storedCurrentAnswer : undefined;
  const allAnswered = hasAllRequiredAnswers(runState.answers, totalQuestions);
  const started = isRuntimeActive(runState) || isRuntimeSubmitted(runState);
  const submitted = isRuntimeSubmitted(runState);

  const settleCurrentQuestionDwell = () => {
    if (!currentQuestion || dwellStartRef.current === null) {
      return;
    }

    const delta = Math.max(0, Date.now() - dwellStartRef.current);
    dwellByQuestionRef.current[currentQuestion.id] = (dwellByQuestionRef.current[currentQuestion.id] ?? 0) + delta;
    dwellStartRef.current = Date.now();
  };

  const updateAnswer = (choice: SemanticAnswer) => {
    if (!currentQuestion || !isRuntimeActive(runState)) {
      return;
    }

    const canonicalKey = String(currentQuestion.canonicalIndex);
    const newAnswers = {...runState.answers, [canonicalKey]: choice};
    dispatchRunAction({
      type: 'SELECT_ANSWER',
      canonicalIndex: currentQuestion.canonicalIndex,
      choice,
      totalQuestions
    });
    writeResponseSet(variant, newAnswers);
    writeLastAnsweredAt(variantId);
  };

  const moveQuestion = (direction: -1 | 1, choiceOverride?: SemanticAnswer) => {
    if (!isRuntimeActive(runState) || !currentQuestion) {
      return;
    }

    settleCurrentQuestionDwell();

    if (direction === -1) {
      const nextIndex = skipBackwardPastProfile(Math.max(1, currentQuestionIndex - 1), questions);
      if (nextIndex === currentQuestionIndex || isProfileQuestion(questions[nextIndex - 1])) {
        return;
      }

      const filteredAnswers = Object.fromEntries(
        Object.entries(runState.answers).filter(([key]) => Number(key) < nextIndex)
      ) as Record<string, string>;
      dispatchRunAction({type: 'NAVIGATE_PREVIOUS', nextQuestionIndex: nextIndex});
      writeResponseSet(variant, filteredAnswers);
      return;
    }

    const answerToAdvance = choiceOverride ?? currentAnswer;

    if (answerToAdvance !== 'A' && answerToAdvance !== 'B') {
      return;
    }

    const answersAfterAdvance = {
      ...runState.answers,
      [String(currentQuestion.canonicalIndex)]: answerToAdvance
    };
    const nextUnansweredQuestion = questions
      .slice(currentQuestionIndex)
      .find((question) => {
        const answer = answersAfterAdvance[String(question.canonicalIndex)];
        return typeof answer !== 'string' || answer.length === 0;
      });
    const nextQuestionIndex = nextUnansweredQuestion
      ? skipForwardPastProfile(nextUnansweredQuestion.canonicalIndex, questions)
      : skipForwardPastProfile(currentQuestionIndex + 1, questions);

    dispatchRunAction({
      type: 'SELECT_ANSWER',
      canonicalIndex: currentQuestion.canonicalIndex,
      choice: answerToAdvance,
      totalQuestions,
      advance: true,
      nextQuestionIndex
    });
  };

  const handleSubmit = () => {
    if (!isRuntimeActive(runState) || !allAnswered) {
      return;
    }

    settleCurrentQuestionDwell();
    const dwellMsAccumulated = Object.values(dwellByQuestionRef.current).reduce((sum, value) => sum + value, 0);
    const finalResponses = {...runState.answers};
    trackFinalSubmit({
      locale,
      route: pathname,
      variant,
      questionIndex: totalQuestions,
      dwellMsAccumulated,
      landingIngressFlag: runState.landingIngressFlag,
      finalResponses
    });
    dispatchRunAction({type: 'SUBMIT', totalQuestions});
  };

  const clearPendingTransitionId = useCallback(() => {
    pendingTransitionIdRef.current = null;
    setPendingTransitionId(null);
  }, []);

  return {
    runtimeReady: runState.phase !== 'booting',
    runPhase: runState.phase,
    landingIngressFlag: runState.landingIngressFlag,
    instructionSeen: runState.instructionSeen,
    currentQuestionIndex,
    started,
    submitted,
    currentQuestion,
    currentAnswer,
    allAnswered,
    scoringProgress,
    totalQuestions,
    answers: runState.answers,
    pendingTransitionId,
    dispatchRunAction,
    clearPendingTransitionId,
    updateAnswer,
    moveQuestion,
    handleSubmit
  };
}
