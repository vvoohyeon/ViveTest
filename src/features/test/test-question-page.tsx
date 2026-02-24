'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {SiteHeader} from '@/features/landing/components/site-header';
import {useInteractionMode} from '@/features/landing/hooks/use-interaction-mode';
import {
  clearPendingTransition,
  consumePreAnswer,
  getInstructionSeen,
  getPendingTransition,
  hasLandingIngressFlag,
  readPreAnswer,
  setInstructionSeen
} from '@/features/landing/session-state';
import {useTelemetry} from '@/features/telemetry/telemetry-provider';
import {
  resolveRunnableVariant,
  type BinaryChoiceCode,
  type TestVariantFixture
} from '@/features/test/data/test-fixture';
import {unlockBodyScroll} from '@/lib/body-lock';
import styles from './test-question-page.module.css';

type TestQuestionPageProps = {
  variant: string;
};

function encodeAnswers(answers: Array<BinaryChoiceCode | null>): string {
  return answers.map((value, index) => `${index + 1}:${value ?? '-'}`).join('|');
}

function encodeDwell(dwell: number[]): string {
  return dwell.map((value, index) => `${index + 1}:${Math.round(value)}`).join('|');
}

export function TestQuestionPage({variant}: TestQuestionPageProps) {
  const t = useTranslations('test');
  const capability = useInteractionMode();
  const {emit} = useTelemetry();

  const resolvedVariant = useMemo<TestVariantFixture>(
    () => resolveRunnableVariant(variant),
    [variant]
  );

  const totalQuestions = resolvedVariant.questions.length;

  const [bootstrapped, setBootstrapped] = useState(false);
  const [started, setStarted] = useState(false);
  const [instructionVisible, setInstructionVisible] = useState(true);
  const [startIndex, setStartIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<BinaryChoiceCode | null>>(() =>
    Array.from({length: totalQuestions}, () => null)
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const dwellRef = useRef<number[]>(Array.from({length: totalQuestions}, () => 0));
  const enteredAtRef = useRef<number>(0);
  const currentIndexRef = useRef(0);
  const attemptStartedRef = useRef(false);
  const entryTransitionIdRef = useRef<string | null>(null);
  const hasCorrelatedPreAnswerRef = useRef(false);

  useEffect(() => {
    unlockBodyScroll({force: true});

    const pending = getPendingTransition();
    if (pending?.type === 'test' && pending.variant === resolvedVariant.id) {
      entryTransitionIdRef.current = pending.transitionId;
      emit('transition_complete', {
        transitionId: pending.transitionId,
        targetType: pending.type,
        cardId: pending.cardId
      });
      clearPendingTransition();
      return;
    }

    entryTransitionIdRef.current = null;
  }, [emit, resolvedVariant.id]);

  useEffect(() => {
    const ingressFlag = hasLandingIngressFlag(resolvedVariant.id);
    const seenInstruction = getInstructionSeen(resolvedVariant.id);
    const correlatedTransitionId = ingressFlag ? entryTransitionIdRef.current : null;
    const preAnswer = correlatedTransitionId ? readPreAnswer(resolvedVariant.id) : undefined;
    const correlatedPreAnswer =
      preAnswer && correlatedTransitionId && preAnswer.transitionId === correlatedTransitionId
        ? preAnswer
        : undefined;

    const initialAnswers = Array.from({length: totalQuestions}, () => null as BinaryChoiceCode | null);
    if (correlatedPreAnswer) {
      initialAnswers[0] = correlatedPreAnswer.answer;
    }

    hasCorrelatedPreAnswerRef.current = Boolean(correlatedPreAnswer);

    const nextStartIndex = ingressFlag ? 1 : 0;

    setAnswers(initialAnswers);
    setCurrentIndex(nextStartIndex);
    currentIndexRef.current = nextStartIndex;
    setStartIndex(nextStartIndex);

    if (seenInstruction) {
      setInstructionVisible(false);
      setStarted(true);
      if (correlatedPreAnswer) {
        consumePreAnswer(resolvedVariant.id);
        hasCorrelatedPreAnswerRef.current = false;
      }

      if (!attemptStartedRef.current) {
        attemptStartedRef.current = true;
        emit('test_attempt_start', {
          variant: resolvedVariant.id,
          startQuestionIndex: nextStartIndex + 1
        });
      }
    } else {
      setInstructionVisible(true);
      setStarted(false);
    }

    setBootstrapped(true);
  }, [emit, resolvedVariant.id, totalQuestions]);

  useEffect(() => {
    if (!started || submitted) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [started, submitted]);

  useEffect(() => {
    if (!started || submitted) {
      return;
    }

    enteredAtRef.current = Date.now();
    const observedIndex = currentIndex;
    const dwellBucket = dwellRef.current;

    return () => {
      const delta = Date.now() - enteredAtRef.current;
      dwellBucket[observedIndex] += delta;
    };
  }, [currentIndex, started, submitted]);

  const selectAnswer = (choice: BinaryChoiceCode) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = choice;
      return next;
    });
  };

  const allAnswered = answers.every((answer) => answer !== null);
  const currentQuestion = resolvedVariant.questions[currentIndex] ?? resolvedVariant.questions[0];
  const selectedAtCurrent = answers[currentIndex];

  const beginAttemptFromInstruction = () => {
    if (hasCorrelatedPreAnswerRef.current) {
      consumePreAnswer(resolvedVariant.id);
      hasCorrelatedPreAnswerRef.current = false;
    }
    setInstructionSeen(resolvedVariant.id);
    setInstructionVisible(false);
    setStarted(true);

    if (!attemptStartedRef.current) {
      attemptStartedRef.current = true;
      emit('test_attempt_start', {
        variant: resolvedVariant.id,
        startQuestionIndex: startIndex + 1
      });
    }
  };

  const goPrev = () => {
    setCurrentIndex((prev) => {
      const next = Math.max(0, prev - 1);
      currentIndexRef.current = next;
      return next;
    });
  };

  const goNext = () => {
    setCurrentIndex((prev) => {
      const next = Math.min(totalQuestions - 1, prev + 1);
      currentIndexRef.current = next;
      return next;
    });
  };

  const submitResult = () => {
    if (!allAnswered) {
      return;
    }

    const now = Date.now();
    dwellRef.current[currentIndex] += now - enteredAtRef.current;

    emit('test_final_submit', {
      variant: resolvedVariant.id,
      totalQuestions,
      answers: encodeAnswers(answers),
      dwellMs: encodeDwell(dwellRef.current)
    });

    setSubmitted(true);
  };

  const progressCurrent = started ? currentIndex + 1 : startIndex + 1;

  return (
    <div className={styles.page}>
      <SiteHeader context="test" capability={capability} timerSeconds={elapsedSeconds} />
      <main className={styles.container}>
        <section className={styles.panel}>
          <p className={styles.progress}>{t('questionOf', {current: progressCurrent, total: totalQuestions})}</p>

          {!submitted ? (
            <>
              <h1 className={styles.prompt} data-display>
                {currentQuestion.prompt}
              </h1>

              <div className={styles.optionList}>
                <button
                  type="button"
                  className={`${styles.optionButton} ${selectedAtCurrent === 'A' ? styles.optionSelected : ''}`}
                  onClick={() => selectAnswer('A')}
                >
                  {currentQuestion.optionA}
                </button>
                <button
                  type="button"
                  className={`${styles.optionButton} ${selectedAtCurrent === 'B' ? styles.optionSelected : ''}`}
                  onClick={() => selectAnswer('B')}
                >
                  {currentQuestion.optionB}
                </button>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                >
                  {t('prev')}
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={goNext}
                  disabled={currentIndex >= totalQuestions - 1 || selectedAtCurrent === null}
                >
                  {t('next')}
                </button>
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.actionPrimary}`}
                  onClick={submitResult}
                  disabled={currentIndex !== totalQuestions - 1 || !allAnswered}
                >
                  {t('submit')}
                </button>
              </div>
            </>
          ) : (
            <section className={styles.resultPanel}>
              <h2 className={styles.resultTitle}>{t('resultTitle')}</h2>
              <p className={styles.resultText}>{t('resultBody')}</p>
            </section>
          )}
        </section>
      </main>

      {bootstrapped && instructionVisible ? (
        <div className={styles.instructionOverlay} role="dialog" aria-modal="true" aria-labelledby="instruction-title">
          <section className={styles.instructionCard}>
            <h2 className={styles.instructionTitle} id="instruction-title" data-display>
              {t('instructionTitle')}
            </h2>
            <p className={styles.progress}>{t('questionOf', {current: startIndex + 1, total: totalQuestions})}</p>
            <p className={styles.instructionBody}>{t('instructionBody')}</p>
            <button type="button" className={`${styles.actionButton} ${styles.actionPrimary}`} onClick={beginAttemptFromInstruction}>
              {t('start')}
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
