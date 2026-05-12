// @vitest-environment jsdom
import {StrictMode} from 'react';
import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {buildVariantQuestionBank} from '../../src/features/test/question-bank';
import {useTestRunController} from '../../src/features/test/use-test-run-controller';

vi.mock('../../src/features/telemetry/runtime', () => ({
  trackAttemptStart: vi.fn(),
  trackFinalSubmit: vi.fn()
}));

vi.mock('../../src/features/transition/runtime', () => ({
  terminatePendingLandingTransition: vi.fn(),
  completePendingLandingTransition: vi.fn()
}));

vi.mock('../../src/features/transition/store', () => ({
  consumeLandingIngress: vi.fn(),
  hasSeenInstruction: vi.fn(() => false),
  readLandingIngress: vi.fn(() => null),
  readPendingLandingTransition: vi.fn(() => null),
  markInstructionSeen: vi.fn(),
  clearLandingIngress: vi.fn(),
  writeLandingIngress: vi.fn(),
  writePendingLandingTransition: vi.fn(),
  terminatePendingLandingTransition: vi.fn()
}));

vi.mock('../../src/features/test/storage/response-set', () => ({
  writeResponseSet: vi.fn()
}));

import {trackAttemptStart, trackFinalSubmit} from '../../src/features/telemetry/runtime';
import {consumeLandingIngress, readLandingIngress, readPendingLandingTransition} from '../../src/features/transition/store';
import {writeResponseSet} from '../../src/features/test/storage/response-set';

const qmbtiQuestions = buildVariantQuestionBank('qmbti', 'en');

function makeInput(overrides: {entryCommitted?: boolean} = {}) {
  return {
    variant: 'qmbti',
    locale: 'en' as const,
    pathname: '/en/test/qmbti',
    questions: qmbtiQuestions,
    entryCommitted: overrides.entryCommitted ?? false
  };
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(readLandingIngress).mockReturnValue(null);
  vi.mocked(readPendingLandingTransition).mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('useTestRunController', () => {
  describe('T-01: Initial state shape — direct entry', () => {
    it('produces correct initial state with no ingress', async () => {
      const {result} = renderHook(() => useTestRunController(makeInput()));
      await flushMicrotasks();

      expect(result.current.runtimeReady).toBe(true);
      expect(result.current.landingIngressFlag).toBe(false);
      expect(result.current.currentQuestionIndex).toBe(1);
      expect(result.current.started).toBe(false);
      expect(result.current.submitted).toBe(false);
      expect(result.current.allAnswered).toBe(false);
      expect(result.current.currentAnswer).toBeUndefined();
      expect(result.current.pendingTransitionId).toBeNull();
    });
  });

  describe('T-02: Initial state shape — landing ingress', () => {
    it('starts at Q2 with seeded answer when landing ingress present', async () => {
      vi.mocked(readLandingIngress).mockReturnValue({
        variant: 'qmbti',
        preAnswerChoice: 'A',
        createdAtMs: Date.now(),
        landingIngressFlag: true
      });

      const {result} = renderHook(() => useTestRunController(makeInput()));
      await flushMicrotasks();

      expect(result.current.landingIngressFlag).toBe(true);
      expect(result.current.currentQuestionIndex).toBe(2);
      expect(result.current.answers['1']).toBe('A');
      expect(result.current.currentAnswer).toBeUndefined();
    });
  });

  describe('T-03: updateAnswer — canonical key write', () => {
    it('writes answer with canonical index key', async () => {
      const {result, rerender} = renderHook(
        (props: {entryCommitted: boolean}) => useTestRunController(makeInput(props)),
        {initialProps: {entryCommitted: false}}
      );
      await flushMicrotasks();

      rerender({entryCommitted: true});
      await flushMicrotasks();

      expect(result.current.started).toBe(true);

      act(() => {
        result.current.moveQuestion(1);
      });
      await flushMicrotasks();

      act(() => {
        result.current.updateAnswer('B');
      });
      await flushMicrotasks();

      expect(result.current.currentAnswer).toBe('B');
      expect(result.current.answers['2']).toBe('B');
      expect(Object.keys(result.current.answers).every((k) => !k.startsWith('q'))).toBe(true);
    });
  });

  describe('T-04: updateAnswer — writeResponseSet call', () => {
    it('persists answers to localStorage via writeResponseSet', async () => {
      const {result, rerender} = renderHook(
        (props: {entryCommitted: boolean}) => useTestRunController(makeInput(props)),
        {initialProps: {entryCommitted: false}}
      );
      await flushMicrotasks();

      rerender({entryCommitted: true});
      await flushMicrotasks();

      act(() => {
        result.current.updateAnswer('A');
      });
      await flushMicrotasks();

      expect(vi.mocked(writeResponseSet)).toHaveBeenCalledWith('qmbti', {'1': 'A'});
    });
  });

  describe('T-05: moveQuestion(1) — forward navigation', () => {
    it('increments index without touching answers', async () => {
      const {result, rerender} = renderHook(
        (props: {entryCommitted: boolean}) => useTestRunController(makeInput(props)),
        {initialProps: {entryCommitted: false}}
      );
      await flushMicrotasks();

      rerender({entryCommitted: true});
      await flushMicrotasks();

      act(() => {
        result.current.updateAnswer('A');
      });
      await flushMicrotasks();

      act(() => {
        result.current.moveQuestion(1);
      });
      await flushMicrotasks();

      expect(result.current.currentQuestionIndex).toBe(2);
      expect(result.current.answers).toEqual({'1': 'A'});
    });
  });

  describe('T-06: moveQuestion(-1) — tail reset filter', () => {
    it('removes answers at indices >= destination when navigating back', async () => {
      const {result, rerender} = renderHook(
        (props: {entryCommitted: boolean}) => useTestRunController(makeInput(props)),
        {initialProps: {entryCommitted: false}}
      );
      await flushMicrotasks();

      rerender({entryCommitted: true});
      await flushMicrotasks();

      // Navigate forward to Q3 and answer each
      act(() => { result.current.updateAnswer('A'); });
      await flushMicrotasks();
      act(() => { result.current.moveQuestion(1); });
      await flushMicrotasks();
      act(() => { result.current.updateAnswer('B'); });
      await flushMicrotasks();
      act(() => { result.current.moveQuestion(1); });
      await flushMicrotasks();
      act(() => { result.current.updateAnswer('A'); });
      await flushMicrotasks();

      expect(result.current.currentQuestionIndex).toBe(3);
      expect(result.current.answers).toEqual({'1': 'A', '2': 'B', '3': 'A'});

      act(() => { result.current.moveQuestion(-1); });
      await flushMicrotasks();

      expect(result.current.currentQuestionIndex).toBe(2);
      expect(result.current.answers).toEqual({'1': 'A'});
      expect(result.current.answers['2']).toBeUndefined();
      expect(result.current.answers['3']).toBeUndefined();
    });
  });

  describe('T-07: moveQuestion(-1) from Q1 — clamps to Q1', () => {
    it('clamps index at 1 and applies tail filter (prev button disabled at Q1 in UI)', async () => {
      const {result, rerender} = renderHook(
        (props: {entryCommitted: boolean}) => useTestRunController(makeInput(props)),
        {initialProps: {entryCommitted: false}}
      );
      await flushMicrotasks();

      rerender({entryCommitted: true});
      await flushMicrotasks();

      act(() => { result.current.updateAnswer('A'); });
      await flushMicrotasks();

      act(() => { result.current.moveQuestion(-1); });
      await flushMicrotasks();

      // currentQuestionIndex stays at 1 (clamped)
      expect(result.current.currentQuestionIndex).toBe(1);
      // filter: Number(key) < 1 removes all keys including '1' (academic — Prev disabled at Q1)
      expect(result.current.answers).toEqual({});
    });
  });

  describe('T-08: handleSubmit guard — not started', () => {
    it('does not submit when started is false', async () => {
      const {result} = renderHook(() => useTestRunController(makeInput()));
      await flushMicrotasks();

      act(() => { result.current.handleSubmit(); });
      await flushMicrotasks();

      expect(result.current.submitted).toBe(false);
      expect(vi.mocked(trackFinalSubmit)).not.toHaveBeenCalled();
    });
  });

  describe('T-09: handleSubmit guard — not all answered', () => {
    it('does not submit when not all questions are answered', async () => {
      const {result, rerender} = renderHook(
        (props: {entryCommitted: boolean}) => useTestRunController(makeInput(props)),
        {initialProps: {entryCommitted: false}}
      );
      await flushMicrotasks();

      rerender({entryCommitted: true});
      await flushMicrotasks();

      // Answer only the first question
      act(() => { result.current.updateAnswer('A'); });
      await flushMicrotasks();

      act(() => { result.current.handleSubmit(); });
      await flushMicrotasks();

      expect(result.current.submitted).toBe(false);
      expect(vi.mocked(trackFinalSubmit)).not.toHaveBeenCalled();
    });
  });

  describe('T-10: trackAttemptStart fires exactly once under Strict Mode', () => {
    it('fires trackAttemptStart exactly once despite double-invoke', async () => {
      const {rerender} = renderHook(
        (props: {entryCommitted: boolean}) => useTestRunController(makeInput(props)),
        {
          initialProps: {entryCommitted: false},
          wrapper: StrictMode
        }
      );
      await flushMicrotasks();

      rerender({entryCommitted: true});
      await flushMicrotasks();

      expect(vi.mocked(trackAttemptStart)).toHaveBeenCalledTimes(1);
    });
  });

  describe('T-11: trackFinalSubmit — canonical index keys in payload', () => {
    it('fires trackFinalSubmit with canonical index keys in finalResponses', async () => {
      const {result, rerender} = renderHook(
        (props: {entryCommitted: boolean}) => useTestRunController(makeInput(props)),
        {initialProps: {entryCommitted: false}}
      );
      await flushMicrotasks();

      rerender({entryCommitted: true});
      await flushMicrotasks();

      // Answer all 8 qmbti questions
      for (let i = 0; i < qmbtiQuestions.length; i++) {
        act(() => { result.current.updateAnswer('A'); });
        await flushMicrotasks();
        if (i < qmbtiQuestions.length - 1) {
          act(() => { result.current.moveQuestion(1); });
          await flushMicrotasks();
        }
      }

      expect(result.current.allAnswered).toBe(true);

      act(() => { result.current.handleSubmit(); });
      await flushMicrotasks();

      expect(result.current.submitted).toBe(true);
      expect(vi.mocked(trackFinalSubmit)).toHaveBeenCalledTimes(1);

      const callPayload = vi.mocked(trackFinalSubmit).mock.calls[0]?.[0];
      expect(callPayload).toBeDefined();
      const finalResponses = callPayload?.finalResponses ?? {};

      // All keys must be canonical index strings ('1', '2', ...), not q-prefixed
      for (const key of Object.keys(finalResponses)) {
        expect(key).toMatch(/^\d+$/);
      }
      expect(Object.keys(finalResponses).length).toBe(qmbtiQuestions.length);
    });
  });

  describe('T-12: pendingTransitionId is surfaced correctly', () => {
    it('exposes transitionId from readPendingLandingTransition', async () => {
      vi.mocked(readPendingLandingTransition).mockReturnValue({
        transitionId: 'tid-123',
        sourceVariant: 'qmbti',
        targetRoute: '/en/test/qmbti',
        targetType: 'test',
        startedAtMs: Date.now(),
        variant: 'qmbti',
        preAnswerChoice: 'A'
      });

      const {result} = renderHook(() => useTestRunController(makeInput()));
      await flushMicrotasks();

      expect(result.current.pendingTransitionId).toBe('tid-123');
    });

    it('returns null after clearPendingTransitionId is called and hook re-renders', async () => {
      vi.mocked(readPendingLandingTransition).mockReturnValue({
        transitionId: 'tid-123',
        sourceVariant: 'qmbti',
        targetRoute: '/en/test/qmbti',
        targetType: 'test',
        startedAtMs: Date.now(),
        variant: 'qmbti',
        preAnswerChoice: 'A'
      });

      const {result, rerender} = renderHook(
        (props: {entryCommitted: boolean}) => useTestRunController(makeInput(props)),
        {initialProps: {entryCommitted: false}}
      );
      await flushMicrotasks();

      expect(result.current.pendingTransitionId).toBe('tid-123');

      // clearPendingTransitionId mutates the ref; trigger a re-render to observe the change
      act(() => { result.current.clearPendingTransitionId(); });
      rerender({entryCommitted: true});
      await flushMicrotasks();

      expect(result.current.pendingTransitionId).toBeNull();
    });
  });

  describe('consumeLandingIngress call', () => {
    it('calls consumeLandingIngress when landing ingress flag is set', async () => {
      vi.mocked(readLandingIngress).mockReturnValue({
        variant: 'qmbti',
        preAnswerChoice: 'A',
        createdAtMs: Date.now(),
        landingIngressFlag: true
      });

      const {rerender} = renderHook(
        (props: {entryCommitted: boolean}) => useTestRunController(makeInput(props)),
        {initialProps: {entryCommitted: false}}
      );
      await flushMicrotasks();

      rerender({entryCommitted: true});
      await flushMicrotasks();

      expect(vi.mocked(consumeLandingIngress)).toHaveBeenCalledWith('qmbti');
    });
  });
});
