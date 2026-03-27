'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useEffect, useMemo, useRef, useState} from 'react';

import type {AppLocale} from '@/config/site';
import {trackAttemptStart, trackFinalSubmit} from '@/features/landing/telemetry/runtime';
import {
  completePendingLandingTransition,
  terminatePendingLandingTransition
} from '@/features/landing/transition/runtime';
import {
  consumeLandingIngress,
  hasSeenInstruction,
  markInstructionSeen,
  type LandingIngressRecord,
  readLandingIngress,
  readPendingLandingTransition,
  type PendingLandingTransition
} from '@/features/landing/transition/store';
import {buildLandingTestQuestionBank} from '@/features/landing/test/question-bank';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';

interface TestQuestionClientProps {
  locale: AppLocale;
  variant: string;
}

interface QuestionRuntimeState {
  ready: boolean;
  instructionVisible: boolean;
  landingIngressFlag: boolean;
  currentQuestionIndex: number;
  answers: Record<string, 'A' | 'B'>;
}

interface QuestionBootstrapState {
  runtimeState: QuestionRuntimeState;
  pendingTransitionToComplete: string | null;
}

function buildInitialRuntimeState(): QuestionRuntimeState {
  return {
    ready: false,
    instructionVisible: true,
    landingIngressFlag: false,
    currentQuestionIndex: 1,
    answers: {}
  };
}

export function resolveQuestionBootstrapState(input: {
  instructionSeen: boolean;
  landingIngress: LandingIngressRecord | null;
  pendingTransition: PendingLandingTransition | null;
  variant: string;
}): QuestionBootstrapState {
  const matchingPendingTransition =
    input.pendingTransition &&
    input.pendingTransition.targetType === 'test' &&
    input.pendingTransition.variant === input.variant
      ? input.pendingTransition
      : null;
  const landingIngressFlag = input.landingIngress !== null;

  return {
    runtimeState: {
      ready: true,
      instructionVisible: !input.instructionSeen,
      landingIngressFlag,
      currentQuestionIndex: landingIngressFlag ? 2 : 1,
      answers: input.landingIngress ? {q1: input.landingIngress.preAnswerChoice} : {}
    },
    pendingTransitionToComplete: matchingPendingTransition?.transitionId ?? null
  };
}

export function TestQuestionClient({locale, variant}: TestQuestionClientProps) {
  const t = useTranslations('test');
  const pathname = usePathname();

  const questions = useMemo(() => buildLandingTestQuestionBank(locale, variant), [locale, variant]);
  const [runtimeState, setRuntimeState] = useState<QuestionRuntimeState>(buildInitialRuntimeState);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const dwellStartRef = useRef<number | null>(null);
  const dwellByQuestionRef = useRef<Record<string, number>>({});
  const attemptStartedRef = useRef(false);
  const bootstrapRuntimeStateRef = useRef<QuestionRuntimeState | null>(null);
  const pendingTransitionToCompleteRef = useRef<string | null>(null);

  useEffect(() => {
    if (bootstrapRuntimeStateRef.current) {
      queueMicrotask(() => {
        setRuntimeState(bootstrapRuntimeStateRef.current ?? buildInitialRuntimeState());
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
    const instructionSeen = hasSeenInstruction(variant);
    const bootstrapState = resolveQuestionBootstrapState({
      instructionSeen,
      landingIngress,
      pendingTransition: nextPendingTransition,
      variant
    });

    pendingTransitionToCompleteRef.current = bootstrapState.pendingTransitionToComplete;
    const nextRuntimeState = bootstrapState.runtimeState;

    bootstrapRuntimeStateRef.current = nextRuntimeState;
    queueMicrotask(() => {
      setRuntimeState(nextRuntimeState);
    });
  }, [locale, pathname, variant]);

  useEffect(() => {
    if (!runtimeState.ready || pendingTransitionToCompleteRef.current === null) {
      return;
    }

    const expectedTransitionId = pendingTransitionToCompleteRef.current;
    const frame = window.requestAnimationFrame(() => {
      const completed = completePendingLandingTransition({
        targetType: 'test'
      });

      if (completed?.transitionId === expectedTransitionId) {
        pendingTransitionToCompleteRef.current = null;
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [locale, pathname, runtimeState.ready]);

  useEffect(() => {
    if (!runtimeState.ready || runtimeState.instructionVisible || attemptStartedRef.current) {
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
  }, [
    locale,
    pathname,
    runtimeState.currentQuestionIndex,
    runtimeState.instructionVisible,
    runtimeState.landingIngressFlag,
    runtimeState.ready,
    variant
  ]);

  const currentQuestion = questions[runtimeState.currentQuestionIndex - 1] ?? questions[0];
  const totalQuestions = questions.length;
  const currentAnswer = currentQuestion ? runtimeState.answers[currentQuestion.id] : undefined;
  const allAnswered = questions.every((question) => runtimeState.answers[question.id] === 'A' || runtimeState.answers[question.id] === 'B');

  const settleCurrentQuestionDwell = () => {
    if (!currentQuestion || dwellStartRef.current === null) {
      return;
    }

    const delta = Math.max(0, Date.now() - dwellStartRef.current);
    dwellByQuestionRef.current[currentQuestion.id] = (dwellByQuestionRef.current[currentQuestion.id] ?? 0) + delta;
    dwellStartRef.current = Date.now();
  };

  const startAttemptFromInstruction = () => {
    if (!runtimeState.ready || attemptStartedRef.current) {
      return;
    }

    markInstructionSeen(variant);
    setRuntimeState((previous) => ({
      ...previous,
      instructionVisible: false
    }));
  };

  const updateAnswer = (choice: 'A' | 'B') => {
    if (!currentQuestion || submitted) {
      return;
    }

    setRuntimeState((previous) => ({
      ...previous,
      answers: {
        ...previous.answers,
        [currentQuestion.id]: choice
      }
    }));
  };

  const moveQuestion = (direction: -1 | 1) => {
    if (!started || !currentQuestion) {
      return;
    }

    settleCurrentQuestionDwell();
    setRuntimeState((previous) => ({
      ...previous,
      currentQuestionIndex: Math.min(totalQuestions, Math.max(1, previous.currentQuestionIndex + direction))
    }));
  };

  const handleSubmit = () => {
    if (!started || !allAnswered) {
      return;
    }

    settleCurrentQuestionDwell();
    const dwellMsAccumulated = Object.values(dwellByQuestionRef.current).reduce((sum, value) => sum + value, 0);
    const finalResponses = questions.reduce<Record<string, 'A' | 'B'>>((accumulator, question) => {
      const answer = runtimeState.answers[question.id];
      if (answer) {
        accumulator[question.id] = answer;
      }
      return accumulator;
    }, {});
    const finalQ1Response = finalResponses.q1;
    if (!finalQ1Response) {
      return;
    }

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

  return (
    <section className="landing-shell-card test-shell-card" data-testid="test-shell-card">
      <header className="test-shell-header">
        <div>
          <h1>{variant}</h1>
          <p data-testid="test-progress">{t('progress', {current: runtimeState.currentQuestionIndex, total: totalQuestions})}</p>
        </div>
      </header>

      <div className="test-shell-stage" data-testid="test-stage">
        {submitted ? (
          <div className="test-result-panel" data-testid="test-result-panel">
            <h2>{t('resultLabel')}</h2>
            <p>{t('resultBody')}</p>
            <dl className="test-result-grid">
              {questions.map((question) => (
                <div key={question.id} className="test-result-row">
                  <dt>{question.id.toUpperCase()}</dt>
                  <dd>{runtimeState.answers[question.id]}</dd>
                </div>
              ))}
            </dl>
            <div className="test-result-actions">
              <Link className="test-primary-button" href={buildLocalizedPath(RouteBuilder.landing(), locale)}>
                {t('goHome')}
              </Link>
              <Link className="test-secondary-button" href={buildLocalizedPath(RouteBuilder.history(), locale)}>
                {t('goHistory')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {runtimeState.instructionVisible ? (
              <div className="test-instruction-overlay" data-testid="test-instruction-overlay">
                <div className="test-instruction-card">
                  <h2>{t('instructionTitle')}</h2>
                  <p>{t('instructionBody')}</p>
                  <button
                    type="button"
                    className="test-primary-button"
                    onClick={startAttemptFromInstruction}
                    data-testid="test-start-button"
                  >
                    {t('start')}
                  </button>
                </div>
              </div>
            ) : null}

            <article
              className="test-question-panel"
              aria-hidden={runtimeState.instructionVisible ? 'true' : undefined}
              data-testid="test-question-panel"
            >
              <h2>{currentQuestion.prompt}</h2>
              <div className="test-answer-grid">
                <button
                  type="button"
                  className="test-answer-button"
                  data-selected={currentAnswer === 'A' ? 'true' : 'false'}
                  onClick={() => {
                    updateAnswer('A');
                  }}
                  data-testid="test-choice-a"
                >
                  {currentQuestion.choiceA}
                </button>
                <button
                  type="button"
                  className="test-answer-button"
                  data-selected={currentAnswer === 'B' ? 'true' : 'false'}
                  onClick={() => {
                    updateAnswer('B');
                  }}
                  data-testid="test-choice-b"
                >
                  {currentQuestion.choiceB}
                </button>
              </div>

              <div className="test-nav-row">
                <button
                  type="button"
                  className="test-secondary-button"
                  onClick={() => {
                    moveQuestion(-1);
                  }}
                  disabled={!started || runtimeState.currentQuestionIndex === 1}
                  data-testid="test-prev-button"
                >
                  {t('prev')}
                </button>

                {runtimeState.currentQuestionIndex < totalQuestions ? (
                  <button
                    type="button"
                    className="test-primary-button"
                    onClick={() => {
                      moveQuestion(1);
                    }}
                    disabled={!started || !currentAnswer}
                    data-testid="test-next-button"
                  >
                    {t('next')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="test-primary-button"
                    onClick={handleSubmit}
                    disabled={!started || !allAnswered}
                    data-testid="test-submit-button"
                  >
                    {t('submit')}
                  </button>
                )}
              </div>
            </article>
          </>
        )}
      </div>
    </section>
  );
}
