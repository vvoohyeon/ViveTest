// @vitest-environment jsdom
import {StrictMode} from 'react';
import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {asVariantId} from '../../src/features/test/domain';
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
  clearInstructionSeen: vi.fn(),
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
  readResponseSet: vi.fn(() => null),
  writeResponseSet: vi.fn()
}));

vi.mock('../../src/features/test/storage/active-run', () => ({
  getActiveRun: vi.fn(() => null),
  saveActiveRun: vi.fn(),
  writeLastAnsweredAt: vi.fn()
}));

import {trackAttemptStart, trackFinalSubmit} from '../../src/features/telemetry/runtime';
import {
  clearInstructionSeen,
  consumeLandingIngress,
  hasSeenInstruction,
  readLandingIngress,
  readPendingLandingTransition
} from '../../src/features/transition/store';
import {getActiveRun, saveActiveRun, writeLastAnsweredAt} from '../../src/features/test/storage/active-run';
import {readResponseSet, writeResponseSet} from '../../src/features/test/storage/response-set';

const qmbtiQuestions = buildVariantQuestionBank('qmbti', 'en');
const egttQuestions = buildVariantQuestionBank('egtt', 'en');

function makeInput() {
  return {
    variant: 'qmbti',
    locale: 'en' as const,
    pathname: '/en/test/qmbti',
    questions: qmbtiQuestions
  };
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function commitRuntimeEntry(result: {current: ReturnType<typeof useTestRunController>}) {
  act(() => {
    result.current.dispatchRunAction({type: 'COMMIT_ENTRY', recordsInstructionSeen: true});
  });
  await flushMicrotasks();
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(getActiveRun).mockReturnValue(null);
  vi.mocked(hasSeenInstruction).mockReturnValue(false);
  vi.mocked(readLandingIngress).mockReturnValue(null);
  vi.mocked(readPendingLandingTransition).mockReturnValue(null);
  vi.mocked(readResponseSet).mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('useTestRunController', () => {
  it('bootstraps direct entry into instruction phase without starting runtime', async () => {
    const {result} = renderHook(() => useTestRunController(makeInput()));
    await flushMicrotasks();

    expect(result.current.runtimeReady).toBe(true);
    expect(result.current.runPhase).toBe('instruction');
    expect(result.current.landingIngressFlag).toBe(false);
    expect(result.current.currentQuestionIndex).toBe(1);
    expect(result.current.started).toBe(false);
    expect(result.current.submitted).toBe(false);
    expect(result.current.allAnswered).toBe(false);
    expect(result.current.currentAnswer).toBeUndefined();
    expect(result.current.pendingTransitionId).toBeNull();
  });

  it('bootstraps landing ingress with seeded answer and Q2 start', async () => {
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
    expect(vi.mocked(getActiveRun)).not.toHaveBeenCalled();
    expect(vi.mocked(readResponseSet)).not.toHaveBeenCalled();
  });

  it('reads active-run responses only when active run metadata exists', async () => {
    const {result} = renderHook(() => useTestRunController(makeInput()));
    await flushMicrotasks();

    expect(result.current.runPhase).toBe('instruction');
    expect(result.current.currentQuestionIndex).toBe(1);
    expect(result.current.answers).toEqual({});
    expect(vi.mocked(getActiveRun)).toHaveBeenCalledWith('qmbti');
    expect(vi.mocked(readResponseSet)).not.toHaveBeenCalled();
  });

  it('resumes an active run without emitting attempt_start or replacing active-run metadata', async () => {
    vi.mocked(hasSeenInstruction).mockReturnValue(true);
    vi.mocked(getActiveRun).mockReturnValue({
      variantId: asVariantId('qmbti'),
      startedAtMs: 100,
      lastAnsweredAtMs: 200
    });
    vi.mocked(readResponseSet).mockReturnValue({'1': 'A'});

    const {result} = renderHook(() => useTestRunController(makeInput()));
    await flushMicrotasks();

    expect(result.current.runPhase).toBe('active');
    expect(result.current.started).toBe(true);
    expect(result.current.currentQuestionIndex).toBe(2);
    expect(result.current.answers).toEqual({'1': 'A'});
    expect(vi.mocked(readResponseSet)).toHaveBeenCalledWith('qmbti');
    expect(vi.mocked(trackAttemptStart)).not.toHaveBeenCalled();
    expect(vi.mocked(saveActiveRun)).not.toHaveBeenCalled();
    expect(vi.mocked(writeResponseSet)).not.toHaveBeenCalled();
  });

  it('returns inconsistent active-run resume with missing profile prerequisite to instruction', async () => {
    vi.mocked(hasSeenInstruction).mockReturnValue(true);
    vi.mocked(getActiveRun).mockReturnValue({
      variantId: asVariantId('egtt'),
      startedAtMs: 100,
      lastAnsweredAtMs: 200
    });
    vi.mocked(readResponseSet).mockReturnValue({'2': 'A'});

    const {result} = renderHook(() =>
      useTestRunController({
        ...makeInput(),
        variant: 'egtt',
        pathname: '/en/test/egtt',
        questions: egttQuestions
      })
    );
    await flushMicrotasks();

    expect(result.current.runPhase).toBe('instruction');
    expect(result.current.instructionSeen).toBe(false);
    expect(result.current.currentQuestionIndex).toBe(1);
    expect(result.current.answers).toEqual({'2': 'A'});
    expect(vi.mocked(clearInstructionSeen)).toHaveBeenCalledWith('egtt');
    expect(vi.mocked(trackAttemptStart)).not.toHaveBeenCalled();
    expect(vi.mocked(saveActiveRun)).not.toHaveBeenCalled();
  });

  it('keeps resume entry mode when instruction must be shown before continuing', async () => {
    vi.mocked(getActiveRun).mockReturnValue({
      variantId: asVariantId('qmbti'),
      startedAtMs: 100,
      lastAnsweredAtMs: 200
    });
    vi.mocked(readResponseSet).mockReturnValue({'1': 'A'});

    const {result} = renderHook(() => useTestRunController(makeInput()));
    await flushMicrotasks();

    expect(result.current.runPhase).toBe('instruction');
    expect(result.current.currentQuestionIndex).toBe(2);
    await commitRuntimeEntry(result);

    expect(result.current.runPhase).toBe('active');
    expect(vi.mocked(trackAttemptStart)).not.toHaveBeenCalled();
    expect(vi.mocked(saveActiveRun)).not.toHaveBeenCalled();
  });

  it('starts runtime from reducer commit and emits attempt_start exactly once under Strict Mode', async () => {
    const {result} = renderHook(() => useTestRunController(makeInput()), {wrapper: StrictMode});
    await flushMicrotasks();

    await commitRuntimeEntry(result);
    act(() => {
      result.current.dispatchRunAction({type: 'COMMIT_ENTRY', recordsInstructionSeen: true});
    });
    await flushMicrotasks();

    expect(result.current.started).toBe(true);
    expect(result.current.runPhase).toBe('active');
    expect(vi.mocked(trackAttemptStart)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveActiveRun)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveActiveRun)).toHaveBeenCalledWith(
      'qmbti',
      expect.objectContaining({
        variantId: 'qmbti',
        startedAtMs: expect.any(Number),
        lastAnsweredAtMs: expect.any(Number)
      })
    );
    expect(vi.mocked(writeResponseSet)).toHaveBeenCalledWith('qmbti', {});
  });

  it('initializes a fresh empty response set when direct cold entry replaces stale responses', async () => {
    vi.mocked(getActiveRun).mockReturnValue(null);
    vi.mocked(readResponseSet).mockReturnValue({'1': 'B', '3': 'A'});

    const {result} = renderHook(() => useTestRunController(makeInput()));
    await flushMicrotasks();
    await commitRuntimeEntry(result);

    expect(vi.mocked(getActiveRun)).toHaveBeenCalledWith('qmbti');
    expect(vi.mocked(readResponseSet)).not.toHaveBeenCalled();
    expect(vi.mocked(saveActiveRun)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(writeResponseSet)).toHaveBeenCalledWith('qmbti', {});
  });

  it('writes a canonical answer and persists the response set', async () => {
    const {result} = renderHook(() => useTestRunController(makeInput()));
    await flushMicrotasks();
    await commitRuntimeEntry(result);

    act(() => {
      result.current.updateAnswer('A');
    });
    await flushMicrotasks();

    expect(result.current.currentAnswer).toBe('A');
    expect(result.current.answers).toEqual({'1': 'A'});
    expect(vi.mocked(writeResponseSet)).toHaveBeenCalledWith('qmbti', {'1': 'A'});
    expect(vi.mocked(writeLastAnsweredAt)).toHaveBeenCalledWith('qmbti');
  });

  it('advances only after the current answer exists', async () => {
    const {result} = renderHook(() => useTestRunController(makeInput()));
    await flushMicrotasks();
    await commitRuntimeEntry(result);

    act(() => {
      result.current.moveQuestion(1);
    });
    await flushMicrotasks();
    expect(result.current.currentQuestionIndex).toBe(1);

    act(() => {
      result.current.updateAnswer('B');
    });
    await flushMicrotasks();
    act(() => {
      result.current.moveQuestion(1);
    });
    await flushMicrotasks();

    expect(result.current.currentQuestionIndex).toBe(2);
    expect(result.current.answers).toEqual({'1': 'B'});
  });

  it('advances with the answer captured at click time before render catches up', async () => {
    const {result} = renderHook(() => useTestRunController(makeInput()));
    await flushMicrotasks();
    await commitRuntimeEntry(result);

    act(() => {
      result.current.updateAnswer('A');
      result.current.moveQuestion(1, 'A');
    });
    await flushMicrotasks();

    expect(result.current.currentQuestionIndex).toBe(2);
    expect(result.current.answers).toEqual({'1': 'A'});
  });

  it('tail-resets answers and persists the truncated response set on previous navigation', async () => {
    const {result} = renderHook(() => useTestRunController(makeInput()));
    await flushMicrotasks();
    await commitRuntimeEntry(result);

    for (const choice of ['A', 'B', 'A'] as const) {
      act(() => {
        result.current.updateAnswer(choice);
      });
      await flushMicrotasks();
      act(() => {
        result.current.moveQuestion(1);
      });
      await flushMicrotasks();
    }

    expect(result.current.currentQuestionIndex).toBe(4);
    expect(result.current.answers).toEqual({'1': 'A', '2': 'B', '3': 'A'});

    const refreshCountBeforePrevious = vi.mocked(writeLastAnsweredAt).mock.calls.length;
    act(() => {
      result.current.moveQuestion(-1);
    });
    await flushMicrotasks();

    expect(result.current.currentQuestionIndex).toBe(3);
    expect(result.current.answers).toEqual({'1': 'A', '2': 'B'});
    expect(vi.mocked(writeResponseSet)).toHaveBeenLastCalledWith('qmbti', {'1': 'A', '2': 'B'});
    expect(vi.mocked(writeLastAnsweredAt)).toHaveBeenCalledTimes(refreshCountBeforePrevious);
  });

  it('keeps submit blocked before active entry or before all answers exist', async () => {
    const {result} = renderHook(() => useTestRunController(makeInput()));
    await flushMicrotasks();

    act(() => {
      result.current.handleSubmit();
    });
    await flushMicrotasks();
    expect(result.current.submitted).toBe(false);

    await commitRuntimeEntry(result);
    act(() => {
      result.current.updateAnswer('A');
    });
    await flushMicrotasks();
    act(() => {
      result.current.handleSubmit();
    });
    await flushMicrotasks();

    expect(result.current.submitted).toBe(false);
    expect(vi.mocked(trackFinalSubmit)).not.toHaveBeenCalled();
  });

  it('emits final_submit once with canonical index keys', async () => {
    const {result} = renderHook(() => useTestRunController(makeInput()));
    await flushMicrotasks();
    await commitRuntimeEntry(result);

    for (let index = 0; index < qmbtiQuestions.length; index += 1) {
      act(() => {
        result.current.updateAnswer('A');
      });
      await flushMicrotasks();
      if (index < qmbtiQuestions.length - 1) {
        act(() => {
          result.current.moveQuestion(1);
        });
        await flushMicrotasks();
      }
    }

    expect(result.current.allAnswered).toBe(true);
    act(() => {
      result.current.handleSubmit();
    });
    await flushMicrotasks();

    expect(result.current.submitted).toBe(true);
    expect(result.current.runPhase).toBe('submitted');
    expect(vi.mocked(trackFinalSubmit)).toHaveBeenCalledTimes(1);
    expect(Object.keys(vi.mocked(trackFinalSubmit).mock.calls[0]?.[0].finalResponses ?? {})).toEqual(
      qmbtiQuestions.map((question) => String(question.canonicalIndex))
    );
  });

  it('submits profile-first variants when all scoring answers exist without a profile runtime answer', async () => {
    const {result} = renderHook(() =>
      useTestRunController({
        ...makeInput(),
        variant: 'egtt',
        pathname: '/en/test/egtt',
        questions: egttQuestions
      })
    );
    await flushMicrotasks();
    await commitRuntimeEntry(result);

    const scoringQuestions = egttQuestions.filter((question) => question.questionType === 'scoring');
    for (let index = 0; index < scoringQuestions.length; index += 1) {
      act(() => {
        result.current.updateAnswer('A');
      });
      await flushMicrotasks();
      act(() => {
        result.current.moveQuestion(1);
      });
      await flushMicrotasks();
    }

    expect(result.current.answers['1']).toBeUndefined();
    expect(result.current.scoringProgress).toMatchObject({
      answered: 3,
      total: 3
    });
    expect(result.current.allAnswered).toBe(true);

    act(() => {
      result.current.handleSubmit();
    });
    await flushMicrotasks();

    expect(result.current.submitted).toBe(true);
    expect(vi.mocked(trackFinalSubmit).mock.calls[0]?.[0].finalResponses).toEqual({
      '2': 'A',
      '3': 'A',
      '4': 'A'
    });
  });

  it('surfaces and clears matching pending transition id', async () => {
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

    act(() => {
      result.current.clearPendingTransitionId();
    });
    await flushMicrotasks();

    expect(result.current.pendingTransitionId).toBeNull();
  });

  it('consumes landing ingress once on new active entry', async () => {
    vi.mocked(readLandingIngress).mockReturnValue({
      variant: 'qmbti',
      preAnswerChoice: 'A',
      createdAtMs: Date.now(),
      landingIngressFlag: true
    });

    const {result} = renderHook(() => useTestRunController(makeInput()));
    await flushMicrotasks();
    await commitRuntimeEntry(result);

    expect(vi.mocked(consumeLandingIngress)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(consumeLandingIngress)).toHaveBeenCalledWith('qmbti');
    expect(vi.mocked(saveActiveRun)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(writeResponseSet)).toHaveBeenCalledWith('qmbti', {'1': 'A'});
  });
});
