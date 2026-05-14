import {describe, expect, it} from 'vitest';

import {asVariantId} from '../../src/features/test/domain';
import {buildVariantQuestionBank} from '../../src/features/test/question-bank';
import {
  resolveQuestionBootstrapState,
  resolveResumeQuestionIndex,
  resolveScoringProgress
} from '../../src/features/test/question-runtime-utils';

function buildActiveRun(variant: string) {
  const variantId = asVariantId(variant);

  return {
    variantId,
    startedAtMs: 1,
    lastAnsweredAtMs: 2
  };
}

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
    expect(bootstrap.runtimeState.answers).toEqual({'1': 'A'});
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
    expect(bootstrap.runtimeState.answers).toEqual({'1': 'B'});
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
    expect(bootstrap.runtimeState.answers).toEqual({'2': 'A'});
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
    expect(bootstrap.entryMode).toBe('new');
    expect(bootstrap.runtimeState.landingIngressFlag).toBe(false);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(1);
    expect(bootstrap.runtimeState.answers).toEqual({});
  });

  it('resolves active-run resume to the next unanswered canonical index capped at the final question', () => {
    const questions = buildVariantQuestionBank('qmbti', 'en');

    expect(resolveResumeQuestionIndex({questions, responseSet: {'1': 'A'}})).toBe(2);
    expect(resolveResumeQuestionIndex({questions, responseSet: {'1': 'A', '2': 'B', '3': 'A'}})).toBe(4);
    expect(
      resolveResumeQuestionIndex({
        questions,
        responseSet: Object.fromEntries(
          questions.map((question) => [String(question.canonicalIndex), 'A'])
        ) as Record<string, 'A'>
      })
    ).toBe(questions.length);
    expect(resolveResumeQuestionIndex({questions, responseSet: {'999': 'A'}})).toBeNull();
  });

  it('loads active-run answers and resumes at the next unanswered index', () => {
    const questions = buildVariantQuestionBank('qmbti', 'en');
    const bootstrap = resolveQuestionBootstrapState({
      activeRun: buildActiveRun('qmbti'),
      instructionSeen: true,
      landingIngress: null,
      pendingTransition: null,
      questions,
      responseSet: {'1': 'A'},
      variant: 'qmbti'
    });

    expect(bootstrap.instructionSeen).toBe(true);
    expect(bootstrap.runtimeState.landingIngressFlag).toBe(false);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(2);
    expect(bootstrap.runtimeState.answers).toEqual({'1': 'A'});
    expect(bootstrap.entryMode).toBe('resume');
  });

  it('caps active-run resume at the final question when the final answer is stored', () => {
    const questions = buildVariantQuestionBank('qmbti', 'en');
    const responseSet = Object.fromEntries(
      questions.map((question, index) => [String(question.canonicalIndex), index % 2 === 0 ? 'A' : 'B'])
    ) as Record<string, 'A' | 'B'>;
    const bootstrap = resolveQuestionBootstrapState({
      activeRun: buildActiveRun('qmbti'),
      instructionSeen: true,
      landingIngress: null,
      pendingTransition: null,
      questions,
      responseSet,
      variant: 'qmbti'
    });

    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(questions.length);
    expect(bootstrap.runtimeState.answers).toEqual(responseSet);
    expect(bootstrap.entryMode).toBe('resume');
  });

  it('keeps landing ingress ahead of active-run resume and ignores old response sets', () => {
    const questions = buildVariantQuestionBank('qmbti', 'en');
    const bootstrap = resolveQuestionBootstrapState({
      activeRun: buildActiveRun('qmbti'),
      instructionSeen: false,
      landingIngress: {
        variant: 'qmbti',
        preAnswerChoice: 'B',
        createdAtMs: 1,
        landingIngressFlag: true
      },
      pendingTransition: null,
      questions,
      responseSet: {'1': 'A', '2': 'A', '3': 'A'},
      variant: 'qmbti'
    });

    expect(bootstrap.runtimeState.landingIngressFlag).toBe(true);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(2);
    expect(bootstrap.runtimeState.answers).toEqual({'1': 'B'});
    expect(bootstrap.entryMode).toBe('new');
  });

  it('cold-starts when active run metadata is absent', () => {
    const questions = buildVariantQuestionBank('qmbti', 'en');
    const bootstrap = resolveQuestionBootstrapState({
      activeRun: null,
      instructionSeen: true,
      landingIngress: null,
      pendingTransition: null,
      questions,
      responseSet: {'1': 'A'},
      variant: 'qmbti'
    });

    expect(bootstrap.runtimeState.landingIngressFlag).toBe(false);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(1);
    expect(bootstrap.runtimeState.answers).toEqual({});
    expect(bootstrap.entryMode).toBe('new');
  });

  it('cold-starts when the response set is absent even if active run metadata exists', () => {
    const questions = buildVariantQuestionBank('qmbti', 'en');
    const bootstrap = resolveQuestionBootstrapState({
      activeRun: buildActiveRun('qmbti'),
      instructionSeen: true,
      landingIngress: null,
      pendingTransition: null,
      questions,
      responseSet: null,
      variant: 'qmbti'
    });

    expect(bootstrap.runtimeState.landingIngressFlag).toBe(false);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(1);
    expect(bootstrap.runtimeState.answers).toEqual({});
    expect(bootstrap.entryMode).toBe('new');
  });

  it('returns profile-first variants with a missing profile answer to the profile prerequisite path', () => {
    const questions = buildVariantQuestionBank('egtt', 'en');
    const bootstrap = resolveQuestionBootstrapState({
      activeRun: buildActiveRun('egtt'),
      instructionSeen: true,
      landingIngress: null,
      pendingTransition: null,
      questions,
      responseSet: {'2': 'A'},
      variant: 'egtt'
    });

    expect(bootstrap.runtimeState.landingIngressFlag).toBe(false);
    expect(bootstrap.instructionSeen).toBe(false);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(1);
    expect(bootstrap.runtimeState.answers).toEqual({'2': 'A'});
    expect(bootstrap.entryMode).toBe('resume');
  });

  it('resumes sparse scoring responses at the first unanswered canonical question', () => {
    const questions = buildVariantQuestionBank('qmbti', 'en');
    const bootstrap = resolveQuestionBootstrapState({
      activeRun: buildActiveRun('qmbti'),
      instructionSeen: true,
      landingIngress: null,
      pendingTransition: null,
      questions,
      responseSet: {'1': 'B', '3': 'A'},
      variant: 'qmbti'
    });

    expect(bootstrap.instructionSeen).toBe(true);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(2);
    expect(bootstrap.runtimeState.answers).toEqual({'1': 'B', '3': 'A'});
    expect(bootstrap.entryMode).toBe('resume');
  });

  it('resumes profile-first variants to the next scoring gap after profile is complete', () => {
    const questions = buildVariantQuestionBank('egtt', 'en');
    const bootstrap = resolveQuestionBootstrapState({
      activeRun: buildActiveRun('egtt'),
      instructionSeen: true,
      landingIngress: null,
      pendingTransition: null,
      questions,
      responseSet: {'1': 'B', '2': 'A'},
      variant: 'egtt'
    });

    expect(bootstrap.instructionSeen).toBe(true);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(3);
    expect(bootstrap.runtimeState.answers).toEqual({'1': 'B', '2': 'A'});
    expect(bootstrap.entryMode).toBe('resume');
  });

  it('keeps landing ingress ahead of old profile-first active-run state', () => {
    const questions = buildVariantQuestionBank('egtt', 'en');
    const bootstrap = resolveQuestionBootstrapState({
      activeRun: buildActiveRun('egtt'),
      instructionSeen: true,
      landingIngress: {
        variant: 'egtt',
        preAnswerChoice: 'A',
        createdAtMs: 1,
        landingIngressFlag: true
      },
      pendingTransition: null,
      questions,
      responseSet: {'1': 'B', '2': 'B', '3': 'B'},
      variant: 'egtt'
    });

    expect(bootstrap.instructionSeen).toBe(true);
    expect(bootstrap.runtimeState.landingIngressFlag).toBe(true);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(1);
    expect(bootstrap.runtimeState.answers).toEqual({'2': 'A'});
    expect(bootstrap.entryMode).toBe('new');
  });

  it('cold-starts when no stored answer key belongs to the current question bank', () => {
    const questions = buildVariantQuestionBank('qmbti', 'en');
    const bootstrap = resolveQuestionBootstrapState({
      activeRun: buildActiveRun('qmbti'),
      instructionSeen: true,
      landingIngress: null,
      pendingTransition: null,
      questions,
      responseSet: {'999': 'A'},
      variant: 'qmbti'
    });

    expect(bootstrap.runtimeState.landingIngressFlag).toBe(false);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(1);
    expect(bootstrap.runtimeState.answers).toEqual({});
    expect(bootstrap.entryMode).toBe('new');
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

  it('calculates main progress from answered scoring questions while ignoring profile answers', () => {
    const questions = buildVariantQuestionBank('egtt', 'en');

    expect(resolveScoringProgress({questions, answers: {}})).toEqual({
      answered: 0,
      total: 3,
      percent: 0
    });

    expect(resolveScoringProgress({questions, answers: {'1': 'A'}})).toEqual({
      answered: 0,
      total: 3,
      percent: 0
    });

    expect(resolveScoringProgress({questions, answers: {'2': 'A'}})).toEqual({
      answered: 1,
      total: 3,
      percent: 33
    });

    expect(
      resolveScoringProgress({
        questions,
        answers: {
          '1': 'A',
          '2': 'A',
          '3': 'B',
          '4': 'A'
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
