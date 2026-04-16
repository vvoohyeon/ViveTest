'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import type {AppLocale} from '@/config/site';
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
import type {LandingTestCard} from '@/features/variant-registry';
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

const testPanelSurfaceClassName =
  'rounded-[18px] p-5 [background:color-mix(in_srgb,var(--panel-solid)_94%,transparent)] [box-shadow:var(--dialog-shadow)]';
const testShellCardClassName =
  'landing-shell-card grid gap-[18px] rounded-[16px] p-[18px] [background:color-mix(in_srgb,var(--panel-solid)_90%,transparent)] [box-shadow:var(--card-shadow)]';
const testShellHeaderClassName = 'test-shell-header grid gap-1';
const testShellStageClassName = 'test-shell-stage relative';
const testQuestionPanelClassName = `test-question-panel ${testPanelSurfaceClassName} grid gap-[14px]`;
const testResultPanelClassName = `test-result-panel ${testPanelSurfaceClassName}`;
const testButtonBaseClassName =
  'inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-[14px] border border-[var(--interactive-neutral-border)] px-[14px] py-3 text-center font-semibold leading-[1.35] text-[var(--text-strong)] [font:inherit] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color,transform] [transition-timing-function:ease]';
const testPrimaryButtonClassName = `${testButtonBaseClassName} test-primary-button`;
const testSecondaryButtonClassName = `${testButtonBaseClassName} test-secondary-button [background:var(--interactive-neutral-bg-strong)]`;
const testAnswerButtonClassName =
  `${testButtonBaseClassName} test-answer-button justify-start text-left [background:var(--interactive-neutral-bg-soft)]`;
const testNavRowClassName = 'test-nav-row flex flex-wrap gap-[10px]';
const testResultActionsClassName = 'test-result-actions flex flex-wrap gap-[10px]';
const testAnswerGridClassName = 'test-answer-grid grid gap-[10px]';
const testResultGridClassName = 'test-result-grid m-0 grid gap-2';
const testResultRowClassName = 'test-result-row flex justify-between gap-3';
const testResultActionButtonClassName = `${testPrimaryButtonClassName} min-w-[132px]`;
const testResultSecondaryActionButtonClassName = `${testSecondaryButtonClassName} min-w-[132px]`;

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
        attribute: card.attribute,
        consentState,
        landingIngressFlag: runtimeState.landingIngressFlag
      }),
    [card.attribute, card.test.instruction, consentState, runtimeState.landingIngressFlag]
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
      className={testShellCardClassName}
      data-testid="test-shell-card"
      data-entry-status={redirecting ? 'redirecting' : isBooting ? 'booting' : started ? 'started' : 'ready'}
    >
      <header className={testShellHeaderClassName}>
        <div>
          <h1 className="m-0">{card.title}</h1>
          <p className="m-0 text-[var(--muted-ink)]" data-testid="test-progress">
            {t('progress', {current: runtimeState.currentQuestionIndex, total: totalQuestions})}
          </p>
        </div>
      </header>

      <div className={testShellStageClassName} data-testid="test-stage">
        {submitted ? (
          <div className={testResultPanelClassName} data-testid="test-result-panel">
            <h2 className="m-0">{t('resultLabel')}</h2>
            <p className="m-0">{t('resultBody')}</p>
            <dl className={testResultGridClassName}>
              {questions.map((question) => (
                <div key={question.id} className={testResultRowClassName}>
                  <dt className="m-0">{question.id.toUpperCase()}</dt>
                  <dd className="m-0">{runtimeState.answers[question.id]}</dd>
                </div>
              ))}
            </dl>
            <div className={testResultActionsClassName}>
              <Link className={testResultActionButtonClassName} href={landingPath}>
                {t('goHome')}
              </Link>
              <Link className={testResultSecondaryActionButtonClassName} href={buildLocalizedPath(RouteBuilder.history(), locale)}>
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
              className={testQuestionPanelClassName}
              aria-hidden={instructionVisible ? 'true' : undefined}
              data-testid="test-question-panel"
            >
              <h2 className="m-0">{currentQuestion.prompt}</h2>
              <div className={testAnswerGridClassName}>
                <button
                  type="button"
                  className={testAnswerButtonClassName}
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
                  className={testAnswerButtonClassName}
                  data-selected={currentAnswer === 'B' ? 'true' : 'false'}
                  onClick={() => {
                    updateAnswer('B');
                  }}
                  data-testid="test-choice-b"
                >
                  {currentQuestion.choiceB}
                </button>
              </div>

              <div className={testNavRowClassName}>
                <button
                  type="button"
                  className={testSecondaryButtonClassName}
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
                    className={testPrimaryButtonClassName}
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
                    className={testPrimaryButtonClassName}
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
