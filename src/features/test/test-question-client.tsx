'use client';

import {usePathname, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {motion, useReducedMotion} from 'motion/react';
import {useMemo, useRef, useState} from 'react';

import type {AppLocale} from '@/config/site';
import {useTelemetryConsentSource} from '@/features/telemetry/consent-source';
import {resolveTestEntryPolicy} from '@/features/test/entry-policy';
import {OverlayConnector} from '@/features/test/overlay-connector';
import {QualifierChip} from '@/features/test/qualifier-chip';
import {ResultConnector} from '@/features/test/result-connector';
import {buildVariantQuestionBank} from '@/features/test/question-bank';
import {isProfileQuestion} from '@/features/test/question-runtime-utils';
import {resolveAnswerChoiceState} from '@/features/test/answer-choice-state';
import {useAnswerHandler} from '@/features/test/use-answer-handler';
import {useAnswerLock} from '@/features/test/use-answer-lock';
import {useBeforeUnloadGuard} from '@/features/test/use-before-unload-guard';
import {useLandingTransitionCompletion} from '@/features/test/use-landing-transition-completion';
import {buildQualifierOverlayModel, type QualifierOverlayItem} from './qualifier-overlay-model';
import {getSchemaForVariant} from './schema-registry';
import {
  testAnswerChoiceClassName,
  testAnswerChoiceMarkClassName,
  testAnswerChoiceTextClassName,
  testOverlineClassName,
  testPanelClassName,
  testPrimaryButtonClassName,
  testSecondaryButtonClassName,
  testTitleClassName
} from './surface-class-names';
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

// 종전에는 셸 카드와 문항 패널이 **서로 다른 두 개의 반투명 면**으로 겹쳐 있었다 —
// 16px/90% 위에 18px/94%. 이제 바깥이 `.vt-panel` 하나를 지고 안쪽은 면을 갖지 않는다.
// `test-question-panel` 은 `aria-hidden` 과 E2E 앵커를 지므로 원소 자체는 남는다.
const testShellCardClassName = `landing-shell-card grid gap-5 ${testPanelClassName}`;
const testShellHeaderClassName = 'test-shell-header grid gap-3';
const testQuestionPanelClassName = 'test-question-panel grid gap-4';
const testNavRowClassName = 'test-nav-row flex flex-wrap items-center justify-between gap-2';
const testAnswerGridClassName = 'test-answer-grid grid gap-2';
const testQuestionNumberClassName = `test-question-number ${testOverlineClassName}`;
// `--t-expanded-question`(600 21px/1.3). 확장된 카탈로그 카드가 미리 보여 주는 질문과 같은
// 타입이다 — 랜딩에서 본 문항과 테스트 안의 문항이 같은 것으로 읽혀야 한다.
const testQuestionClassName =
  'm-0 [font:var(--t-expanded-question)] [letter-spacing:var(--track-tight)] text-[var(--ink)] [word-break:keep-all] [overflow-wrap:anywhere]';
// 진행 표시는 표면이 아니라 표시다. 종전 트랙은 24px 높이에 퍼센트 라벨이 채움 **안에서**
// 떠다니다가 채움이 좁으면 `right: -2.5rem` 로 탈출했다 — 컨트롤 하나에 레이아웃이 둘이고,
// 답할 때마다 숫자가 좌우로 자리를 옮겼다. 라벨은 트랙 밖 고정 위치로, 트랙은 6px 로 내린다.
const testProgressHeadClassName = 'flex items-baseline justify-between gap-3';
const testProgressLabelClassName = '[font:var(--caption)] text-[var(--muted-aa)]';
const testProgressValueClassName =
  'text-[13px] font-semibold leading-[1.45] tabular-nums text-[var(--ink-body)]';
const testProgressTrackClassName = 'h-1.5 overflow-hidden rounded-full bg-[var(--surface-strong)]';
const testProgressFillClassName =
  'h-full rounded-[inherit] bg-[var(--accent)] [transition-duration:var(--dur-slow)] [transition-property:width] [transition-timing-function:var(--ease-in-out)] motion-reduce:transition-none';

interface InstructionVisibleInput {
  overlayMode: 'entry' | 'reentry';
  isBooting: boolean;
  entryCommitted: boolean;
  redirecting: boolean;
  overlayStep: 'instruction' | number;
  instructionSeen: boolean;
  canAutoCommitAfterInstructionSeen: boolean;
  hasQualifierItems: boolean;
}

function resolveInstructionVisible(input: InstructionVisibleInput): boolean {
  if (input.overlayMode === 'reentry') {
    return true;
  }
  if (input.isBooting || input.entryCommitted || input.redirecting) {
    return false;
  }
  return (
    input.overlayStep !== 'instruction' ||
    !input.instructionSeen ||
    !input.canAutoCommitAfterInstructionSeen ||
    input.hasQualifierItems
  );
}

/**
 * 「이전에 고른 쪽」 표식. **마크 슬롯 안에** 그린다 — 슬롯은 항상 렌더되는 14×14 고정 상자라
 * 표식이 붙고 빠져도 라벨이 움직이지 않는다. 옆에 새 원소로 붙이면 그 성질이 깨진다.
 */
function PreviousAnswerGlyph() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-full w-full">
      <path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  const [slideDirection, setSlideDirection] = useState<SlideDirection>('forward');
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
  const {isAnswerLocked, lockAnswer, unlockAnswer, clearTimer} = useAnswerLock({currentQuestionIndex});

  useBeforeUnloadGuard({started, submitted});
  useLandingTransitionCompletion({runtimeReady, pendingTransitionId, clearPendingTransitionId});

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

  const instructionVisible = resolveInstructionVisible({
    overlayMode,
    isBooting,
    entryCommitted,
    redirecting,
    overlayStep,
    instructionSeen,
    canAutoCommitAfterInstructionSeen: entryPolicy.canAutoCommitAfterInstructionSeen,
    hasQualifierItems: qualifierItems.length > 0
  });

  const primaryButton = entryPolicy.cta.primary;
  const secondaryButton = entryPolicy.cta.secondary;
  const instructionNote = entryPolicy.content.consentNoteKey ? t(entryPolicy.content.consentNoteKey) : undefined;
  const scoringProgressPercentText = t('progressValue', {percent: scoringProgress.percent});
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
  const {handleAnswerChoice} = useAnswerHandler({
    currentQuestion,
    submitted,
    isAnswerLocked,
    updateAnswer,
    currentScoringQuestionOrdinal,
    lastScoringCanonicalIndex,
    locale,
    pathname,
    variant,
    getCurrentDwellMs,
    landingIngressFlag,
    started,
    isLastQuestion,
    clearTimer,
    lockAnswer,
    slideDirectionRef,
    setSlideDirection,
    moveQuestion
  });
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
        <h1 className={testTitleClassName}>{card.title}</h1>
        <div className="grid gap-2">
          <div className={testProgressHeadClassName}>
            <span className={testProgressLabelClassName}>{t('progressLabel')}</span>
            <span className={testProgressValueClassName} data-testid="test-progress">
              {scoringProgressPercentText}
            </span>
          </div>
          <div
            aria-label={t('progressLabel')}
            aria-valuemax={scoringProgress.total}
            aria-valuemin={0}
            aria-valuenow={scoringProgress.answered}
            aria-valuetext={scoringProgressPercentText}
            className={testProgressTrackClassName}
            data-testid="test-progress-bar"
            role="progressbar"
          >
            <div
              className={testProgressFillClassName}
              style={{width: `${scoringProgress.percent}%`}}
            />
          </div>
        </div>
      </header>

      {submitted ? (
        <ResultConnector
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
          <OverlayConnector
            visible={instructionVisible}
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
            qualifierContinueNextLabel={t('next')}
            qualifierRestartConfirmLabel={t('qualifierRestartConfirm')}
            qualifierStartLabel={t('start')}
            qualifierReentryCancelLabel={t('cancel')}
            qualifierEntryBackLabel={t('overlayBack')}
            overlayStep={overlayStep}
            overlayMode={overlayMode}
            qualifierDraft={qualifierDraft}
            qualifierItems={qualifierItems}
            currentQualifierItem={currentQualifierItem}
            currentQualifierStepIndex={currentQualifierStepIndex}
            onQualifierSelect={onQualifierSelect}
            onQualifierBack={onQualifierBack}
          />

          <div
            className={testQuestionPanelClassName}
            aria-hidden={instructionVisible ? 'true' : undefined}
            data-testid="test-question-panel"
          >
            {/* 칩은 재진입 창이 열려 있는 동안에도 마운트를 유지한다. 칩이 그 창을 연 원소이고,
                창이 닫힐 때 포커스가 돌아갈 곳이기 때문이다 — 언마운트하면 돌아갈 원소가 사라진다.
                열려 있는 동안 이 패널은 aria-hidden 이고 창이 포커스를 가두므로 칩에 닿을 수 없다. */}
            {entryCommitted && qualifierItems.length > 0 ? (
              <QualifierChip
                label={qualifierChipLabel}
                ariaLabel={t('qualifierChipAriaLabel')}
                onActivate={reopenQualifierOverlay}
              />
            ) : null}
            {currentQuestion && currentScoringQuestionOrdinal !== null ? (
              <p className={testQuestionNumberClassName} data-testid="test-question-number">
                Q{currentScoringQuestionOrdinal}
              </p>
            ) : null}
            <h2 className={testQuestionClassName}>{currentQuestion?.question}</h2>
            <motion.div
              key={currentQuestionIndex}
              className={testAnswerGridClassName}
              initial={{x: answerGridInitialX}}
              animate={{x: 0}}
              transition={prefersReducedMotion ? {duration: 0} : {duration: 0.18, ease: 'easeOut'}}
            >
              {(['A', 'B'] as const).map((choice) => {
                const choiceState = resolveAnswerChoiceState({
                  choice,
                  storedAnswer: currentAnswer ?? null,
                  justAnswered: isAnswerLocked,
                  isLastQuestion
                });

                return (
                  <button
                    key={choice}
                    type="button"
                    className={testAnswerChoiceClassName}
                    data-selected={choiceState === 'selected' ? 'true' : 'false'}
                    data-previous-answer={choiceState === 'previous-answer' ? 'true' : 'false'}
                    disabled={isAnswerLocked}
                    onClick={() => {
                      handleAnswerChoice(choice);
                    }}
                    data-testid={choice === 'A' ? 'test-choice-a' : 'test-choice-b'}
                  >
                    <span className={testAnswerChoiceTextClassName}>
                      {choice === 'A' ? currentQuestion?.answerA : currentQuestion?.answerB}
                    </span>
                    {/* 표식은 선택이 아니므로 `aria-checked`·`aria-pressed` 를 쓰지 않는다. 보조기술에는
                        버튼 이름 안의 텍스트 대안으로 간다(`req-test.md` §4.3). */}
                    {choiceState === 'previous-answer' ? (
                      <span className="sr-only">{t('previouslySelected')}</span>
                    ) : null}
                    <span className={testAnswerChoiceMarkClassName} aria-hidden="true">
                      {choiceState === 'previous-answer' ? <PreviousAnswerGlyph /> : null}
                    </span>
                  </button>
                );
              })}
            </motion.div>

            <div className={testNavRowClassName}>
              <button
                type="button"
                className={testSecondaryButtonClassName}
                onClick={() => {
                  clearTimer();
                  unlockAnswer();
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
                // 제출은 회차 전체를 확정하는, 한 번뿐인 결정이다. 답변 행이 빌려 쓰던 채워진
                // accent 무게는 여기 하나에만 남는다(catalog `.vt-cta`).
                <button
                  type="button"
                  className={`${testPrimaryButtonClassName} px-[18px]`}
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
