import {describe, expect, it} from 'vitest';

import {resolveQuestionBootstrapState} from '../../src/features/test/test-question-client';

describe('test question bootstrap state', () => {
  it('starts at Q2 whenever landing ingress exists, even after pending transition is gone', () => {
    const bootstrap = resolveQuestionBootstrapState({
      instructionSeen: false,
      landingIngress: {
        variant: 'qmbti',
        preAnswerChoice: 'A',
        createdAtMs: 1,
        landingIngressFlag: true
      },
      pendingTransition: null,
      variant: 'qmbti'
    });

    expect(bootstrap.pendingTransitionToComplete).toBeNull();
    expect(bootstrap.instructionSeen).toBe(false);
    expect(bootstrap.runtimeState.landingIngressFlag).toBe(true);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(2);
    expect(bootstrap.runtimeState.answers).toEqual({q1: 'A'});
  });

  it('keeps matching pending transition completion separate from ingress-derived start-question state', () => {
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
      variant: 'qmbti'
    });

    expect(bootstrap.pendingTransitionToComplete).toBe('pending-transition');
    expect(bootstrap.instructionSeen).toBe(false);
    expect(bootstrap.runtimeState.landingIngressFlag).toBe(true);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(2);
    expect(bootstrap.runtimeState.answers).toEqual({q1: 'B'});
  });

  it('falls back to Q1 when ingress is absent on re-entry', () => {
    const bootstrap = resolveQuestionBootstrapState({
      instructionSeen: true,
      landingIngress: null,
      pendingTransition: null,
      variant: 'qmbti'
    });

    expect(bootstrap.pendingTransitionToComplete).toBeNull();
    expect(bootstrap.instructionSeen).toBe(true);
    expect(bootstrap.runtimeState.landingIngressFlag).toBe(false);
    expect(bootstrap.runtimeState.currentQuestionIndex).toBe(1);
    expect(bootstrap.runtimeState.answers).toEqual({});
  });
});
