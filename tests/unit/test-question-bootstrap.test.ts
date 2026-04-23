import {describe, expect, it} from 'vitest';

import {buildVariantQuestionBank} from '../../src/features/test/question-bank';
import {resolveQuestionBootstrapState} from '../../src/features/test/test-question-client';

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
});
