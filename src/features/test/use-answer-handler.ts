'use client';

import {useEffect, useRef, type MutableRefObject} from 'react';

import type {AppLocale} from '@/config/site';
import {trackQuestionAnswered} from '@/features/telemetry/runtime';
import type {ResolvedQuestion} from '@/features/test/question-bank';
import type {SemanticAnswer} from '@/features/test/test-run-reducer';

type SlideDirection = 'forward' | 'backward';

interface UseAnswerHandlerInput {
  currentQuestion: ResolvedQuestion | null;
  submitted: boolean;
  isAnswerLocked: boolean;
  updateAnswer: (choice: SemanticAnswer) => void;
  moveQuestion: (direction: -1 | 1, choiceOverride?: SemanticAnswer) => void;
  getCurrentDwellMs: () => number;
  currentScoringQuestionOrdinal: number | null;
  lastScoringCanonicalIndex: number;
  locale: AppLocale;
  pathname: string;
  variant: string;
  landingIngressFlag: boolean;
  started: boolean;
  isLastQuestion: boolean;
  clearTimer: () => void;
  lockAnswer: (onAdvance: () => void, delayMs?: number) => void;
  slideDirectionRef: MutableRefObject<SlideDirection>;
  setSlideDirection: (direction: SlideDirection) => void;
}

interface UseAnswerHandlerOutput {
  handleAnswerChoice: (choice: SemanticAnswer) => void;
}

export function useAnswerHandler({
  currentQuestion,
  submitted,
  isAnswerLocked,
  updateAnswer,
  moveQuestion,
  getCurrentDwellMs,
  currentScoringQuestionOrdinal,
  lastScoringCanonicalIndex,
  locale,
  pathname,
  variant,
  landingIngressFlag,
  started,
  isLastQuestion,
  clearTimer,
  lockAnswer,
  slideDirectionRef,
  setSlideDirection
}: UseAnswerHandlerInput): UseAnswerHandlerOutput {
  const submittedRef = useRef(submitted);

  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  function handleAnswerChoice(choice: SemanticAnswer) {
    if (!currentQuestion || submitted || isAnswerLocked) {
      return;
    }

    updateAnswer(choice);

    if (currentScoringQuestionOrdinal !== null && currentQuestion.canonicalIndex !== lastScoringCanonicalIndex) {
      trackQuestionAnswered({
        locale,
        route: pathname,
        variant,
        questionIndex: currentScoringQuestionOrdinal,
        choice,
        dwellMs: getCurrentDwellMs(),
        landingIngressFlag
      });
    }

    if (!started || submitted || isLastQuestion) {
      clearTimer();
      return;
    }

    lockAnswer(() => {
      if (!submittedRef.current) {
        slideDirectionRef.current = 'forward';
        setSlideDirection('forward');
        moveQuestion(1, choice);
      }
    });
  }

  return {handleAnswerChoice};
}
