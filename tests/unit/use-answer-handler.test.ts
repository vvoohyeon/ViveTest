// @vitest-environment jsdom
import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {trackQuestionAnswered} from '@/features/telemetry/runtime';
import type {ResolvedQuestion} from '@/features/test/question-bank';
import {useAnswerHandler} from '@/features/test/use-answer-handler';

vi.mock('@/features/telemetry/runtime', () => ({
  trackQuestionAnswered: vi.fn()
}));

type UseAnswerHandlerInput = Parameters<typeof useAnswerHandler>[0];

const scoringQuestion = {
  id: 'q2',
  canonicalIndex: 2,
  questionType: 'scoring',
  question: 'Question',
  poleA: 'E',
  poleB: 'T',
  answerA: 'Answer A',
  answerB: 'Answer B'
} satisfies ResolvedQuestion;

function makeInput(overrides: Partial<UseAnswerHandlerInput> = {}): UseAnswerHandlerInput {
  return {
    currentQuestion: scoringQuestion,
    submitted: false,
    isAnswerLocked: false,
    updateAnswer: vi.fn(),
    currentScoringQuestionOrdinal: 1,
    lastScoringCanonicalIndex: 10,
    locale: 'en',
    pathname: '/en/test/egtt',
    variant: 'egtt',
    getCurrentDwellMs: vi.fn(() => 200),
    landingIngressFlag: false,
    started: true,
    isLastQuestion: false,
    clearTimer: vi.fn(),
    lockAnswer: vi.fn(),
    slideDirectionRef: {current: 'forward'},
    setSlideDirection: vi.fn(),
    moveQuestion: vi.fn(),
    ...overrides
  };
}

function renderUseAnswerHandler(input: UseAnswerHandlerInput) {
  return renderHook((props: UseAnswerHandlerInput) => useAnswerHandler(props), {
    initialProps: input
  });
}

describe('useAnswerHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not call updateAnswer when submitted is true', () => {
    const input = makeInput({submitted: true});
    const {result} = renderUseAnswerHandler(input);

    result.current.handleAnswerChoice('A');

    expect(input.updateAnswer).not.toHaveBeenCalled();
    expect(trackQuestionAnswered).not.toHaveBeenCalled();
  });

  it('does not call updateAnswer when isAnswerLocked is true', () => {
    const input = makeInput({isAnswerLocked: true});
    const {result} = renderUseAnswerHandler(input);

    result.current.handleAnswerChoice('A');

    expect(input.updateAnswer).not.toHaveBeenCalled();
    expect(trackQuestionAnswered).not.toHaveBeenCalled();
  });

  it('emits trackQuestionAnswered for a non-final scoring question', () => {
    const input = makeInput();
    const {result} = renderUseAnswerHandler(input);

    result.current.handleAnswerChoice('B');

    expect(input.updateAnswer).toHaveBeenCalledWith('B');
    expect(trackQuestionAnswered).toHaveBeenCalledTimes(1);
    expect(trackQuestionAnswered).toHaveBeenCalledWith({
      locale: 'en',
      route: '/en/test/egtt',
      variant: 'egtt',
      questionIndex: 1,
      choice: 'B',
      dwellMs: 200,
      landingIngressFlag: false
    });
    expect(input.lockAnswer).toHaveBeenCalledTimes(1);
  });

  it('does not emit trackQuestionAnswered for the final scoring question', () => {
    const finalQuestion = {...scoringQuestion, canonicalIndex: 10} satisfies ResolvedQuestion;
    const input = makeInput({
      currentQuestion: finalQuestion,
      currentScoringQuestionOrdinal: 8,
      isLastQuestion: true
    });
    const {result} = renderUseAnswerHandler(input);

    result.current.handleAnswerChoice('A');

    expect(input.updateAnswer).toHaveBeenCalledWith('A');
    expect(trackQuestionAnswered).not.toHaveBeenCalled();
    expect(input.clearTimer).toHaveBeenCalledTimes(1);
    expect(input.lockAnswer).not.toHaveBeenCalled();
  });

  it('calls lockAnswer with a callback when not last question and started', () => {
    const slideDirectionRef: UseAnswerHandlerInput['slideDirectionRef'] = {current: 'backward'};
    const input = makeInput({
      slideDirectionRef,
      lockAnswer: vi.fn((onAdvance: () => void) => {
        onAdvance();
      })
    });
    const {result} = renderUseAnswerHandler(input);

    result.current.handleAnswerChoice('A');

    expect(input.moveQuestion).toHaveBeenCalledWith(1, 'A');
    expect(input.setSlideDirection).toHaveBeenCalledWith('forward');
    expect(slideDirectionRef.current).toBe('forward');
  });

  it('lockAnswer callback does not call moveQuestion when submitted becomes true before callback fires', () => {
    const capturedCallbackRef: {current: (() => void) | null} = {current: null};
    const input = makeInput({
      lockAnswer: vi.fn((onAdvance: () => void) => {
        capturedCallbackRef.current = onAdvance;
      })
    });
    const {result, rerender} = renderUseAnswerHandler(input);

    result.current.handleAnswerChoice('A');
    rerender({...input, submitted: true});
    capturedCallbackRef.current?.();

    expect(input.moveQuestion).not.toHaveBeenCalled();
  });
});
