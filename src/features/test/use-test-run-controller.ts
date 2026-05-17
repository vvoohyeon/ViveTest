import {useCallback, useEffect, useReducer, useRef, useState, type Dispatch} from 'react';

import type {AppLocale} from '@/config/site';
import {trackAttemptStart, trackFinalSubmit} from '@/features/telemetry/runtime';
import {consumeLandingIngress} from '@/features/transition/store';
import {asVariantId} from '@/features/test/domain';
import type {QualifierOverlayItem} from '@/features/test/qualifier-overlay-model';
import type {ResolvedQuestion} from '@/features/test/question-bank';
import {saveActiveRun, writeLastAnsweredAt} from '@/features/test/storage/active-run';
import {writeResponseSet} from '@/features/test/storage/response-set';
import {
  findFirstScoringQuestion,
  isProfileQuestion,
  resolveScoringProgress,
  skipBackwardPastProfile,
  skipForwardPastProfile,
  type ScoringProgress
} from '@/features/test/question-runtime-utils';
import {
  isRuntimeActive,
  isRuntimeSubmitted,
  testRunReducer,
  buildInitialTestRunState,
  type SemanticAnswer,
  type TestRunAction,
  type TestRunPhase
} from '@/features/test/test-run-reducer';
import {useQuestionDwell} from '@/features/test/use-question-dwell';
import {useTestRunBootstrap} from '@/features/test/use-test-run-bootstrap';

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
  resetScoringAnswers: (qualifierAnswers: Record<string, string>) => void;
  getCurrentDwellMs: () => number;
}

const EMPTY_QUALIFIER_ITEMS: ReadonlyArray<QualifierOverlayItem> = [];

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

  const processedEntrySequenceRef = useRef(0);
  const pendingTransitionIdRef = useRef<string | null>(null);
  const [pendingTransitionId, setPendingTransitionId] = useState<string | null>(null);
  const {getCurrentDwellMs, settleDwell, resetDwellForQuestion, accumulatedDwellMs} = useQuestionDwell();

  useTestRunBootstrap({
    variant,
    variantId,
    locale,
    pathname,
    questions,
    qualifierItems,
    dispatchRunAction,
    pendingTransitionIdRef,
    onPendingTransitionIdChange: setPendingTransitionId
  });

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

    resetDwellForQuestion();
  }, [
    locale,
    pathname,
    resetDwellForQuestion,
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
  const allAnswered = scoringProgress.total > 0 && scoringProgress.answered === scoringProgress.total;
  const started = isRuntimeActive(runState) || isRuntimeSubmitted(runState);
  const submitted = isRuntimeSubmitted(runState);

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

    settleDwell(currentQuestion);

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

    settleDwell(currentQuestion);
    const dwellMsAccumulated = accumulatedDwellMs();
    const profileIndexes = new Set(
      questions.filter((question) => isProfileQuestion(question)).map((question) => question.canonicalIndex)
    );
    const finalResponses = Object.fromEntries(
      Object.entries(runState.answers).filter(([key]) => !profileIndexes.has(Number(key)))
    ) as Record<string, string>;
    trackFinalSubmit({
      locale,
      route: pathname,
      variant,
      questionIndex: totalQuestions,
      dwellMsAccumulated,
      landingIngressFlag: runState.landingIngressFlag,
      finalResponses
    });
    dispatchRunAction({type: 'SUBMIT', allAnswered});
  };

  const resetScoringAnswers = useCallback(
    (qualifierAnswers: Record<string, string>) => {
      const firstScoringCanonicalIndex = findFirstScoringQuestion(questions)?.canonicalIndex ?? 1;
      dispatchRunAction({
        type: 'RESET_SCORING_ANSWERS',
        firstScoringCanonicalIndex,
        qualifierAnswers
      });
    },
    [questions]
  );

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
    handleSubmit,
    resetScoringAnswers,
    getCurrentDwellMs
  };
}
