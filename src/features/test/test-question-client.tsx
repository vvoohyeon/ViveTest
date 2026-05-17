'use client';

import {usePathname, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {motion, useReducedMotion} from 'motion/react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import type {AppLocale} from '@/config/site';
import {useTelemetryConsentSource} from '@/features/telemetry/consent-source';
import {trackQuestionAnswered} from '@/features/telemetry/runtime';
import {completePendingLandingTransition} from '@/features/transition/runtime';
import {resolveTestEntryPolicy} from '@/features/test/entry-policy';
import {InstructionOverlay} from '@/features/test/instruction-overlay';
import {TestResultPanel} from '@/features/test/test-result-panel';
import {buildVariantQuestionBank} from '@/features/test/question-bank';
import {isProfileQuestion} from '@/features/test/question-runtime-utils';
import {buildQualifierOverlayModel, type QualifierOverlayItem} from './qualifier-overlay-model';
import {getSchemaForVariant} from './schema-registry';
import type {LandingTestCard} from '@/features/variant-registry';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';
import {useTestRunController} from '@/features/test/use-test-run-controller';
import {useTestEntryOrchestrator} from '@/features/test/use-test-entry-orchestrator';

interface TestQuestionClientProps {
  locale: AppLocale;
  card: LandingTestCard;
}

type SlideDirection = 'forward' | 'backward';

const testPanelSurfaceClassName =
  'rounded-[18px] p-5 [background:color-mix(in_srgb,var(--panel-solid)_94%,transparent)] [box-shadow:var(--dialog-shadow)]';
const testShellCardClassName =
  'landing-shell-card grid gap-[18px] rounded-[16px] p-[18px] [background:color-mix(in_srgb,var(--panel-solid)_90%,transparent)] [box-shadow:var(--card-shadow)]';
const testShellHeaderClassName = 'test-shell-header grid gap-1';
const testQuestionPanelClassName = `test-question-panel ${testPanelSurfaceClassName} grid gap-[14px]`;
const testButtonFocusRingClassName =
  'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring-inner),0_0_0_4px_var(--focus-ring-outer)]';
const testButtonBaseClassName =
  `inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-[14px] border px-[14px] py-3 text-center font-semibold leading-[1.35] text-[var(--text-strong)] [font:inherit] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color,transform] [transition-timing-function:ease] disabled:!cursor-not-allowed disabled:!border-[var(--interactive-disabled-border)] disabled:!bg-[var(--interactive-disabled-bg)] disabled:!text-[var(--interactive-disabled-ink)] disabled:!opacity-100 disabled:!shadow-none disabled:hover:!border-[var(--interactive-disabled-border)] disabled:hover:!bg-[var(--interactive-disabled-bg)] disabled:hover:!text-[var(--interactive-disabled-ink)] disabled:hover:!shadow-none disabled:hover:!translate-y-0 ${testButtonFocusRingClassName}`;
const testPrimaryButtonClassName =
  `${testButtonBaseClassName} border-[var(--interactive-accent-border)] bg-[var(--interactive-accent-bg)] shadow-[inset_0_0_0_1px_var(--interactive-accent-outline),var(--interactive-accent-shadow)] hover:border-[var(--interactive-accent-border-strong)] hover:bg-[var(--interactive-accent-bg-hover)] hover:-translate-y-px active:bg-[var(--interactive-accent-bg-pressed)] active:translate-y-0 focus-visible:shadow-[inset_0_0_0_1px_var(--interactive-accent-outline),0_0_0_2px_var(--focus-ring-inner),0_0_0_4px_var(--focus-ring-outer),var(--interactive-accent-shadow)]`;
const testSecondaryButtonClassName =
  `${testButtonBaseClassName} border-[var(--interactive-neutral-border)] bg-[var(--interactive-neutral-bg-strong)] hover:border-[var(--interactive-neutral-border-strong)] hover:bg-[var(--interactive-neutral-bg-hover)] active:bg-[var(--interactive-neutral-bg-pressed)]`;
const testAnswerButtonClassName =
  `${testButtonBaseClassName} justify-start border-[var(--interactive-neutral-border)] bg-[var(--interactive-neutral-bg-soft)] text-left hover:border-[var(--interactive-neutral-border-strong)] hover:bg-[var(--interactive-neutral-bg-hover)] active:bg-[var(--interactive-neutral-bg-pressed)] data-[selected=true]:border-[var(--interactive-accent-border)] data-[selected=true]:bg-[var(--interactive-accent-bg)] data-[selected=true]:shadow-[inset_0_0_0_1px_var(--interactive-accent-outline),var(--interactive-accent-shadow)] data-[selected=true]:hover:border-[var(--interactive-accent-border-strong)] data-[selected=true]:hover:bg-[var(--interactive-accent-bg-hover)] data-[selected=true]:hover:-translate-y-px data-[selected=true]:active:bg-[var(--interactive-accent-bg-pressed)] data-[selected=true]:active:translate-y-0 data-[selected=true]:focus-visible:shadow-[inset_0_0_0_1px_var(--interactive-accent-outline),0_0_0_2px_var(--focus-ring-inner),0_0_0_4px_var(--focus-ring-outer),var(--interactive-accent-shadow)]`;
const testNavRowClassName = 'test-nav-row flex flex-wrap gap-[10px]';
const testAnswerGridClassName = 'test-answer-grid grid gap-[10px]';
const testQuestionNumberClassName = 'test-question-number text-sm font-semibold text-[var(--muted-ink)]';
const testQualifierChipClassName =
  `test-qualifier-chip inline-flex w-fit cursor-pointer items-center gap-[6px] rounded-full border border-[var(--interactive-neutral-border)] bg-[var(--interactive-neutral-bg-soft)] px-3 py-1 text-sm font-semibold text-[var(--text-strong)] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color,transform] [transition-timing-function:ease] hover:border-[var(--interactive-neutral-border-strong)] hover:bg-[var(--interactive-neutral-bg-hover)] active:bg-[var(--interactive-neutral-bg-pressed)] ${testButtonFocusRingClassName}`;

export function TestQuestionClient({locale, card}: TestQuestionClientProps) {
  const t = useTranslations('test');
  const pathname = usePathname();
  const router = useRouter();
  const consentSnapshot = useTelemetryConsentSource();
  const variant = card.variant;
  const landingPath = useMemo(() => buildLocalizedPath(RouteBuilder.landing(), locale), [locale]);
  const questions = useMemo(() => buildVariantQuestionBank(variant, locale), [locale, variant]);
  const qualifierItems = useMemo((): QualifierOverlayItem[] => {
    const schema = getSchemaForVariant(variant);
    if (!schema?.qualifierFields?.length) {
      return [];
    }
    return buildQualifierOverlayModel(schema.qualifierFields, questions);
  }, [variant, questions]);
  const slideDirectionRef = useRef<SlideDirection>('forward');
  const autoAdvanceTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>('forward');
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const {
    runtimeReady,
    runPhase,
    landingIngressFlag,
    instructionSeen,
    currentQuestionIndex,
    started,
    submitted,
    currentQuestion,
    currentAnswer,
    allAnswered,
    scoringProgress,
    totalQuestions,
    answers,
    pendingTransitionId,
    dispatchRunAction,
    clearPendingTransitionId,
    updateAnswer,
    moveQuestion,
    handleSubmit,
    resetScoringAnswers,
    getCurrentDwellMs
  } = useTestRunController({variant, locale, pathname, questions, qualifierItems});
  const submittedRef = useRef(submitted);

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  useEffect(() => {
    return () => {
      clearAutoAdvanceTimer();
    };
  }, [clearAutoAdvanceTimer]);

  useEffect(() => {
    clearAutoAdvanceTimer();
  }, [clearAutoAdvanceTimer, currentQuestionIndex]);

  useEffect(() => {
    if (!started || submitted) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [started, submitted]);

  useEffect(() => {
    if (!runtimeReady || pendingTransitionId === null) {
      return;
    }

    const expectedTransitionId = pendingTransitionId;
    const frame = window.requestAnimationFrame(() => {
      const completed = completePendingLandingTransition({targetType: 'test'});
      if (completed?.transitionId === expectedTransitionId) {
        clearPendingTransitionId();
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [runtimeReady, pendingTransitionId, clearPendingTransitionId]);

  const consentState = consentSnapshot.synced ? consentSnapshot.consentState : 'UNKNOWN';
  const entryPolicy = useMemo(
    () =>
      resolveTestEntryPolicy({
        instructionText: card.test.instruction,
        attribute: card.attribute,
        consentState,
        landingIngressFlag
      }),
    [card.attribute, card.test.instruction, consentState, landingIngressFlag]
  );

  const isBooting = !runtimeReady || !consentSnapshot.synced;

  const {
    entryCommitted,
    redirecting,
    overlayStep,
    overlayMode,
    qualifierDraft,
    executeInstructionAction,
    onQualifierSelect,
    onQualifierBack,
    reopenQualifierOverlay
  } =
    useTestEntryOrchestrator({
      variant,
      landingPath,
      runtimeReady,
      landingIngressFlag,
      instructionSeen,
      runPhase,
      entryPolicy,
      qualifierItems,
      answers,
      router,
      dispatchRunAction,
      resetScoringAnswers
    });

  const instructionVisible =
    overlayMode === 'reentry' ||
    (!isBooting &&
      !entryCommitted &&
      !redirecting &&
      (
        overlayStep !== 'instruction' ||
        !instructionSeen ||
        !entryPolicy.canAutoCommitAfterInstructionSeen ||
        qualifierItems.length > 0
      ));

  const primaryButton = entryPolicy.cta.primary;
  const secondaryButton = entryPolicy.cta.secondary;
  const instructionNote = entryPolicy.content.consentNoteKey ? t(entryPolicy.content.consentNoteKey) : undefined;
  const scoringProgressPercentText = t('progressValue', {percent: scoringProgress.percent});
  const isProgressLabelClamped = scoringProgress.percent >= 85;
  const isLastQuestion = currentQuestionIndex >= totalQuestions;
  const currentScoringQuestionOrdinal =
    currentQuestion?.questionType === 'scoring'
      ? questions.filter((question) => question.questionType === 'scoring' && question.canonicalIndex <= currentQuestion.canonicalIndex).length
      : null;
  const answerGridInitialX = prefersReducedMotion ? 0 : slideDirection === 'forward' ? 18 : -18;
  const currentQualifierStepIndex = typeof overlayStep === 'number' ? overlayStep : null;
  const currentQualifierItem =
    currentQualifierStepIndex !== null ? qualifierItems[currentQualifierStepIndex] : undefined;
  const lastScoringCanonicalIndex = useMemo(
    () => questions.filter((question) => !isProfileQuestion(question)).at(-1)?.canonicalIndex ?? 0,
    [questions]
  );
  const qualifierChipLabel = useMemo(
    () =>
      qualifierItems
        .map((item) => {
          const token = answers[String(item.canonicalIndex)];
          const choice = item.choices.find((entry) => entry.token === token);
          return choice?.label ?? t('qualifierPending');
        })
        .join(' · '),
    [qualifierItems, answers, t]
  );

  function handleAnswerChoice(choice: 'A' | 'B') {
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
      clearAutoAdvanceTimer();
      return;
    }

    clearAutoAdvanceTimer();
    setIsAnswerLocked(true);

    autoAdvanceTimerRef.current = (
      window.setTimeout(() => {
        autoAdvanceTimerRef.current = null;

        if (submittedRef.current) {
          return;
        }

        setIsAnswerLocked(false);
        slideDirectionRef.current = 'forward';
        setSlideDirection('forward');
        moveQuestion(1, choice);
      }, 150) as unknown
    ) as ReturnType<typeof window.setTimeout>;
  }

  return (
    <section
      className={testShellCardClassName}
      data-testid="test-shell-card"
      data-entry-status={
        redirecting ? 'redirecting'
          : isBooting ? 'booting'
          : submitted ? 'submitted'
          : started ? 'started'
          : 'ready'
      }
    >
      <header className={testShellHeaderClassName}>
        <div>
          <h1 className="m-0">{card.title}</h1>
          <div className="grid gap-2" data-testid="test-progress">
            <div
              aria-label={t('progressLabel')}
              aria-valuemax={scoringProgress.total}
              aria-valuemin={0}
              aria-valuenow={scoringProgress.answered}
              aria-valuetext={scoringProgressPercentText}
              className="relative h-6 overflow-hidden rounded-full bg-[var(--interactive-neutral-bg-strong)]"
              data-testid="test-progress-bar"
              role="progressbar"
            >
              <div
                className="relative h-full overflow-visible rounded-full bg-[var(--interactive-accent-bg)] transition-[width] duration-150 ease-out"
                style={{width: `${scoringProgress.percent}%`}}
              >
                <span
                  className="absolute top-1/2 whitespace-nowrap text-xs font-semibold leading-none text-[var(--text-strong)] -translate-y-1/2"
                  data-testid="test-progress-percent"
                  style={
                    isProgressLabelClamped
                      ? {minWidth: '2.5rem', right: '0.5rem', textAlign: 'right'}
                      : {minWidth: '2.5rem', right: '-2.5rem', textAlign: 'left'}
                  }
                >
                  {scoringProgressPercentText}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {submitted ? (
        <TestResultPanel
          questions={questions}
          answers={answers}
          locale={locale}
          landingPath={landingPath}
          route={pathname}
          variant={variant}
          landingIngressFlag={landingIngressFlag}
        />
      ) : (
        <>
          {instructionVisible ? (
            <InstructionOverlay
              title={t('instructionTitle')}
              instructionText={entryPolicy.content.instructionText}
              consentNote={instructionNote}
              showDivider={entryPolicy.content.showDivider}
              primaryLabel={
                overlayStep === 'instruction' && qualifierItems.length > 0
                  ? t('next')
                  : t(primaryButton.labelKey)
              }
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
              qualifierStep={
                currentQualifierItem
                  ? {
                      item: currentQualifierItem,
                      selectedToken: qualifierDraft[currentQualifierItem.canonicalIndex] ?? null,
                      onSelect: (token) => {
                        onQualifierSelect(currentQualifierItem.canonicalIndex, token);
                      },
                      onBack: onQualifierBack,
                      continueLabel:
                        (currentQualifierStepIndex ?? 0) < qualifierItems.length - 1
                          ? t('next')
                          : overlayMode === 'reentry'
                            ? t('qualifierRestartConfirm')
                            : t('start'),
                      continueDisabled: !qualifierDraft[currentQualifierItem.canonicalIndex],
                      showBack: true,
                      isReentry: overlayMode === 'reentry',
                      backLabel: overlayMode === 'reentry' ? t('cancel') : t('overlayBack')
                    }
                  : undefined
              }
            />
          ) : null}

          <div
            className={testQuestionPanelClassName}
            aria-hidden={instructionVisible ? 'true' : undefined}
            data-testid="test-question-panel"
          >
            {entryCommitted && qualifierItems.length > 0 && overlayMode !== 'reentry' ? (
              <div
                role="button"
                tabIndex={0}
                className={testQualifierChipClassName}
                aria-label={t('qualifierChipAriaLabel')}
                data-testid="test-qualifier-chip"
                onClick={reopenQualifierOverlay}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    reopenQualifierOverlay();
                  }
                }}
              >
                {qualifierChipLabel}
              </div>
            ) : null}
            {currentQuestion && currentScoringQuestionOrdinal !== null ? (
              <p className={testQuestionNumberClassName} data-testid="test-question-number">
                Q{currentScoringQuestionOrdinal}
              </p>
            ) : null}
            <h2 className="m-0">{currentQuestion?.question}</h2>
            <motion.div
              key={currentQuestionIndex}
              className={testAnswerGridClassName}
              initial={{x: answerGridInitialX}}
              animate={{x: 0}}
              transition={prefersReducedMotion ? {duration: 0} : {duration: 0.18, ease: 'easeOut'}}
            >
              <button
                type="button"
                className={testAnswerButtonClassName}
                data-selected={currentAnswer === 'A' ? 'true' : 'false'}
                disabled={isAnswerLocked}
                onClick={() => {
                  handleAnswerChoice('A');
                }}
                data-testid="test-choice-a"
              >
                {currentQuestion?.answerA}
              </button>
              <button
                type="button"
                className={testAnswerButtonClassName}
                data-selected={currentAnswer === 'B' ? 'true' : 'false'}
                disabled={isAnswerLocked}
                onClick={() => {
                  handleAnswerChoice('B');
                }}
                data-testid="test-choice-b"
              >
                {currentQuestion?.answerB}
              </button>
            </motion.div>

            <div className={testNavRowClassName}>
              <button
                type="button"
                className={testSecondaryButtonClassName}
                onClick={() => {
                  clearAutoAdvanceTimer();
                  setIsAnswerLocked(false);
                  slideDirectionRef.current = 'backward';
                  setSlideDirection('backward');
                  moveQuestion(-1);
                }}
                disabled={!started}
                style={{visibility: currentQuestionIndex === 1 ? 'hidden' : 'visible'}}
                data-testid="test-prev-button"
              >
                {t('prev')}
              </button>

              {isLastQuestion ? (
                <button
                  type="button"
                  className={testPrimaryButtonClassName}
                  onClick={handleSubmit}
                  disabled={!started || !allAnswered}
                  data-testid="test-submit-button"
                >
                  {t('submit')}
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
