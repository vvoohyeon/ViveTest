import {describe, expect, it} from 'vitest';

import {buildVariantQuestionBank} from '../../src/features/test/question-bank';
import {
  buildCanonicalFinalResponses,
  resolveQuestionBootstrapState,
  resolveScoringProgress
} from '../../src/features/test/test-question-client';

describe('test question bootstrap state', () => {
  it('starts at Q2 whenever landing ingress exists, even after pending transition is gone', () => {
    const questions = buildVariantQuestionBank('qmbti', 'en');
    const bootstrap = resolveQuestionBootstrapState({
      instructionSeen: false,
      landingIngress: {
        variant: 'qmbti',
        preAnswerChoice: 'A',
        createdAtMs: 1,
        landingIngressFlag: true
      },
      pendingTransition: null,
      questions,
      variant: 'qmbti'
    });

    expect(bootstrap.pendingTransitionToComplete).toBeNull();
    expect(bootstrap.instructionSeen).toBe(false);
    expect(bootstrap.runtimeState.landingIngressFlag).toBe(true);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(2);
    expect(bootstrap.runtimeState.answers).toEqual({q1: 'A'});
  });

  it('keeps matching pending transition completion separate from ingress-derived start-question state', () => {
    const questions = buildVariantQuestionBank('qmbti', 'en');
    const bootstrap = resolveQuestionBootstrapState({
      instructionSeen: false,
      landingIngress: {
        variant: 'qmbti',
        preAnswerChoice: 'B',
        createdAtMs: 1,
        landingIngressFlag: true
      },
      pendingTransition: {
        transitionId: 'pending-transition',
        sourceVariant: 'qmbti',
        targetRoute: '/en/test/qmbti',
        targetType: 'test',
        startedAtMs: 2,
        variant: 'qmbti',
        preAnswerChoice: 'B'
      },
      questions,
      variant: 'qmbti'
    });

    expect(bootstrap.pendingTransitionToComplete).toBe('pending-transition');
    expect(bootstrap.instructionSeen).toBe(false);
    expect(bootstrap.runtimeState.landingIngressFlag).toBe(true);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(2);
    expect(bootstrap.runtimeState.answers).toEqual({q1: 'B'});
  });

  it('starts at profile Q1 while preserving a scoring1 pre-answer when the variant has a profile row', () => {
    const questions = buildVariantQuestionBank('egtt', 'en');
    const bootstrap = resolveQuestionBootstrapState({
      instructionSeen: false,
      landingIngress: {
        variant: 'egtt',
        preAnswerChoice: 'A',
        createdAtMs: 1,
        landingIngressFlag: true
      },
      pendingTransition: null,
      questions,
      variant: 'egtt'
    });

    expect(bootstrap.runtimeState.landingIngressFlag).toBe(true);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(1);
    expect(bootstrap.runtimeState.answers).toEqual({q2: 'A'});
  });

  it('falls back to Q1 when ingress is absent on re-entry', () => {
    const questions = buildVariantQuestionBank('qmbti', 'en');
    const bootstrap = resolveQuestionBootstrapState({
      instructionSeen: true,
      landingIngress: null,
      pendingTransition: null,
      questions,
      variant: 'qmbti'
    });

    expect(bootstrap.pendingTransitionToComplete).toBeNull();
    expect(bootstrap.instructionSeen).toBe(true);
    expect(bootstrap.runtimeState.landingIngressFlag).toBe(false);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(1);
    expect(bootstrap.runtimeState.answers).toEqual({});
  });

  it('resolves attempt_start question_index_1based from the first runtime question canonical index', () => {
    const qmbtiQuestions = buildVariantQuestionBank('qmbti', 'en');
    const egttQuestions = buildVariantQuestionBank('egtt', 'en');

    const directQmbti = resolveQuestionBootstrapState({
      instructionSeen: false,
      landingIngress: null,
      pendingTransition: null,
      questions: qmbtiQuestions,
      variant: 'qmbti'
    });
    const directEgtt = resolveQuestionBootstrapState({
      instructionSeen: false,
      landingIngress: null,
      pendingTransition: null,
      questions: egttQuestions,
      variant: 'egtt'
    });
    const landingIngressQmbti = resolveQuestionBootstrapState({
      instructionSeen: false,
      landingIngress: {
        variant: 'qmbti',
        preAnswerChoice: 'A',
        createdAtMs: 1,
        landingIngressFlag: true
      },
      pendingTransition: null,
      questions: qmbtiQuestions,
      variant: 'qmbti'
    });

    expect(directQmbti.runtimeState.currentQuestionIndex).toBe(1);
    expect(qmbtiQuestions[directQmbti.runtimeState.currentQuestionIndex - 1]?.canonicalIndex).toBe(1);
    expect(directEgtt.runtimeState.currentQuestionIndex).toBe(1);
    expect(egttQuestions[directEgtt.runtimeState.currentQuestionIndex - 1]?.canonicalIndex).toBe(1);
    expect(egttQuestions[directEgtt.runtimeState.currentQuestionIndex - 1]?.questionType).toBe('profile');
    expect(landingIngressQmbti.runtimeState.currentQuestionIndex).toBe(2);
    expect(qmbtiQuestions[landingIngressQmbti.runtimeState.currentQuestionIndex - 1]?.canonicalIndex).toBe(2);
  });

  it('builds final_submit responses keyed by canonical question index instead of UI ids', () => {
    const questions = buildVariantQuestionBank('egtt', 'en');

    expect(
      buildCanonicalFinalResponses({
        questions,
        answers: {
          q1: 'B',
          q2: 'A',
          q3: 'B',
          q4: 'A'
        }
      })
    ).toEqual({
      '1': 'B',
      '2': 'A',
      '3': 'B',
      '4': 'A'
    });
  });

  it('calculates main progress from answered scoring questions while ignoring profile answers', () => {
    const questions = buildVariantQuestionBank('egtt', 'en');

    expect(resolveScoringProgress({questions, answers: {}})).toEqual({
      answered: 0,
      total: 3,
      percent: 0
    });

    expect(resolveScoringProgress({questions, answers: {q1: 'A'}})).toEqual({
      answered: 0,
      total: 3,
      percent: 0
    });

    expect(resolveScoringProgress({questions, answers: {q2: 'A'}})).toEqual({
      answered: 1,
      total: 3,
      percent: 33
    });

    expect(
      resolveScoringProgress({
        questions,
        answers: {
          q1: 'A',
          q2: 'A',
          q3: 'B',
          q4: 'A'
        }
      })
    ).toEqual({
      answered: 3,
      total: 3,
      percent: 100
    });
  });

  it('includes the landing-ingress seeded scoring1 answer in initial main progress', () => {
    const questions = buildVariantQuestionBank('qmbti', 'en');
    const directBootstrap = resolveQuestionBootstrapState({
      instructionSeen: false,
      landingIngress: null,
      pendingTransition: null,
      questions,
      variant: 'qmbti'
    });
    const landingIngressBootstrap = resolveQuestionBootstrapState({
      instructionSeen: false,
      landingIngress: {
        variant: 'qmbti',
        preAnswerChoice: 'A',
        createdAtMs: 1,
        landingIngressFlag: true
      },
      pendingTransition: null,
      questions,
      variant: 'qmbti'
    });

    expect(resolveScoringProgress({questions, answers: directBootstrap.runtimeState.answers})).toEqual({
      answered: 0,
      total: 8,
      percent: 0
    });
    expect(resolveScoringProgress({questions, answers: landingIngressBootstrap.runtimeState.answers})).toEqual({
      answered: 1,
      total: 8,
      percent: 13
    });
  });
});
