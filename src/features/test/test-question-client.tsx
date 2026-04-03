'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import type {AppLocale} from '@/config/site';
import type {LandingTestCard} from '@/features/landing/data';
import {setTelemetryConsentState, useTelemetryConsentSource} from '@/features/landing/telemetry/consent-source';
import {trackAttemptStart, trackFinalSubmit} from '@/features/landing/telemetry/runtime';
import {
  completePendingLandingTransition,
  terminatePendingLandingTransition
} from '@/features/landing/transition/runtime';
import {
  clearLandingIngress,
  consumeLandingIngress,
  hasSeenInstruction,
  markInstructionSeen,
  type LandingIngressRecord,
  readLandingIngress,
  readPendingLandingTransition,
  type PendingLandingTransition
} from '@/features/landing/transition/store';
import {resolveTestEntryPolicy, type TestInstructionAction} from '@/features/test/entry-policy';
import {InstructionOverlay} from '@/features/test/instruction-overlay';
import {buildLandingTestQuestionBank} from '@/features/test/question-bank';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';

interface TestQuestionClientProps {
  locale: AppLocale;
  card: LandingTestCard;
}

interface QuestionRuntimeState {
  ready: boolean;
  landingIngressFlag: boolean;
  currentQuestionIndex: number;
  answers: Record<string, 'A' | 'B'>;
}

interface QuestionBootstrapState {
  runtimeState: QuestionRuntimeState;
  pendingTransitionToComplete: string | null;
  instructionSeen: boolean;
}

function buildInitialRuntimeState(): QuestionRuntimeState {
  return {
    ready: false,
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
      landingIngressFlag,
      currentQuestionIndex: landingIngressFlag ? 2 : 1,
      answers: input.landingIngress ? {q1: input.landingIngress.preAnswerChoice} : {}
    },
    pendingTransitionToComplete: matchingPendingTransition?.transitionId ?? null,
    instructionSeen: input.instructionSeen
  };
}

export function TestQuestionClient({locale, card}: TestQuestionClientProps) {
  const t = useTranslations('test');
  const pathname = usePathname();
  const router = useRouter();
  const consentSnapshot = useTelemetryConsentSource();
  const variant = card.variant;
  const landingPath = useMemo(() => buildLocalizedPath(RouteBuilder.landing(), locale), [locale]);
  const questions = useMemo(() => buildLandingTestQuestionBank(card, locale), [card, locale]);
  const [runtimeState, setRuntimeState] = useState<QuestionRuntimeState>(buildInitialRuntimeState);
  const [instructionSeen, setInstructionSeen] = useState(false);
  const [entryCommitted, setEntryCommitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const dwellStartRef = useRef<number | null>(null);
  const dwellByQuestionRef = useRef<Record<string, number>>({});
  const attemptStartedRef = useRef(false);
  const bootstrapRuntimeStateRef = useRef<QuestionRuntimeState | null>(null);
  const pendingTransitionToCompleteRef = useRef<string | null>(null);
  const runtimeEntryCommittedRef = useRef(false);

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
    const nextInstructionSeen = hasSeenInstruction(variant);
    const bootstrapState = resolveQuestionBootstrapState({
      instructionSeen: nextInstructionSeen,
      landingIngress,
      pendingTransition: nextPendingTransition,
      variant
    });

    pendingTransitionToCompleteRef.current = bootstrapState.pendingTransitionToComplete;
    bootstrapRuntimeStateRef.current = bootstrapState.runtimeState;
    queueMicrotask(() => {
      setInstructionSeen(bootstrapState.instructionSeen);
      setRuntimeState(bootstrapState.runtimeState);
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
  }, [runtimeState.ready]);

  const consentState = consentSnapshot.synced ? consentSnapshot.consentState : 'UNKNOWN';
  const entryPolicy = useMemo(
    () =>
      resolveTestEntryPolicy({
        instructionText: card.test.instruction,
        cardType: card.cardType,
        consentState,
        landingIngressFlag: runtimeState.landingIngressFlag
      }),
    [card.cardType, card.test.instruction, consentState, runtimeState.landingIngressFlag]
  );

  const isBooting = !runtimeState.ready || !consentSnapshot.synced;
  const instructionVisible =
    !isBooting &&
    !entryCommitted &&
    !redirecting &&
    (!instructionSeen || !entryPolicy.canAutoCommitAfterInstructionSeen);

  const executeInstructionAction = useCallback(
    (action: TestInstructionAction) => {
      const effect = entryPolicy.effects[action];
      if (!runtimeState.ready || redirecting) {
        return;
      }

      if (effect.writesConsent) {
        setTelemetryConsentState(effect.writesConsent);
      }

      if (effect.recordsInstructionSeen && !instructionSeen) {
        markInstructionSeen(variant);
        setInstructionSeen(true);
      }

      if (effect.redirectHome) {
        if (runtimeState.landingIngressFlag) {
          clearLandingIngress(variant);
        }

        setRedirecting(true);
        router.replace(landingPath);
        return;
      }

      if (!effect.commitsRuntimeEntry || runtimeEntryCommittedRef.current) {
        return;
      }

      runtimeEntryCommittedRef.current = true;
      setEntryCommitted(true);
    },
    [entryPolicy.effects, instructionSeen, landingPath, redirecting, router, runtimeState.landingIngressFlag, runtimeState.ready, variant]
  );

  useEffect(() => {
    if (
      isBooting ||
      redirecting ||
      entryCommitted ||
      !instructionSeen ||
      !entryPolicy.canAutoCommitAfterInstructionSeen
    ) {
      return;
    }

    queueMicrotask(() => {
      executeInstructionAction('start');
    });
  }, [
    entryCommitted,
    entryPolicy.canAutoCommitAfterInstructionSeen,
    executeInstructionAction,
    instructionSeen,
    isBooting,
    redirecting
  ]);

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

  const primaryButton = entryPolicy.cta.primary;
  const secondaryButton = entryPolicy.cta.secondary;
  const instructionNote = entryPolicy.content.consentNoteKey ? t(entryPolicy.content.consentNoteKey) : undefined;

  return (
    <section
      className="landing-shell-card test-shell-card"
      data-testid="test-shell-card"
      data-entry-status={redirecting ? 'redirecting' : isBooting ? 'booting' : started ? 'started' : 'ready'}
    >
      <header className="test-shell-header">
        <div>
          <h1>{card.title}</h1>
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
              <Link className="test-primary-button" href={landingPath}>
                {t('goHome')}
              </Link>
              <Link className="test-secondary-button" href={buildLocalizedPath(RouteBuilder.history(), locale)}>
                {t('goHistory')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {instructionVisible ? (
              <InstructionOverlay
                title={t('instructionTitle')}
                instructionText={entryPolicy.content.instructionText}
                consentNote={instructionNote}
                showDivider={entryPolicy.content.showDivider}
                primaryLabel={t(primaryButton.labelKey)}
                secondaryLabel={secondaryButton ? t(secondaryButton.labelKey) : undefined}
                onPrimaryAction={() => {
                  executeInstructionAction(primaryButton.action);
                }}
                onSecondaryAction={
                  secondaryButton
                    ? () => {
                        executeInstructionAction(secondaryButton.action);
                      }
                    : undefined
                }
                primaryTestId={primaryButton.testId}
                secondaryTestId={secondaryButton?.testId}
              />
            ) : null}

            <article
              className="test-question-panel"
              aria-hidden={instructionVisible ? 'true' : undefined}
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
