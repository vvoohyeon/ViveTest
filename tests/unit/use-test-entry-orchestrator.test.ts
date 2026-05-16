// @vitest-environment jsdom
import {StrictMode} from 'react';
import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {TestEntryPolicy} from '../../src/features/test/entry-policy';
import type {TestRunAction, TestRunPhase} from '../../src/features/test/test-run-reducer';
import {useTestEntryOrchestrator} from '../../src/features/test/use-test-entry-orchestrator';

vi.mock('../../src/features/telemetry/consent-source', () => ({
  setTelemetryConsentState: vi.fn()
}));

vi.mock('../../src/features/transition/store', () => ({
  markInstructionSeen: vi.fn(),
  clearLandingIngress: vi.fn()
}));

import {setTelemetryConsentState} from '../../src/features/telemetry/consent-source';
import {clearLandingIngress, markInstructionSeen} from '../../src/features/transition/store';

const ACTION_EFFECTS = {
  start: {writesConsent: null, redirectHome: false, commitsRuntimeEntry: true, recordsInstructionSeen: true},
  accept_all_and_start: {writesConsent: 'OPTED_IN' as const, redirectHome: false, commitsRuntimeEntry: true, recordsInstructionSeen: true},
  deny_and_start: {writesConsent: 'OPTED_OUT' as const, redirectHome: false, commitsRuntimeEntry: true, recordsInstructionSeen: true},
  deny_and_abandon: {writesConsent: 'OPTED_OUT' as const, redirectHome: true, commitsRuntimeEntry: false, recordsInstructionSeen: false},
  keep_current_preference: {writesConsent: null, redirectHome: true, commitsRuntimeEntry: false, recordsInstructionSeen: false}
} as TestEntryPolicy['effects'];

function makePlainStartPolicy(): TestEntryPolicy {
  return {
    ingressType: 'direct',
    content: {instructionText: 'Test instruction', showConsentNote: false, consentNoteKey: null, showDivider: false},
    cta: {primary: {action: 'start', labelKey: 'start', testId: 'test-start-button'}},
    effects: ACTION_EFFECTS,
    canAutoCommitAfterInstructionSeen: true
  };
}

function makeConsentPolicy(): TestEntryPolicy {
  return {
    ingressType: 'direct',
    content: {instructionText: 'Consent instruction', showConsentNote: true, consentNoteKey: 'unknownAvailableNote', showDivider: true},
    cta: {
      primary: {action: 'accept_all_and_start', labelKey: 'acceptAllAndStart', testId: 'test-accept-all-and-start-button'},
      secondary: {action: 'deny_and_abandon', labelKey: 'denyAndAbandon', testId: 'test-deny-and-abandon-button'}
    },
    effects: ACTION_EFFECTS,
    canAutoCommitAfterInstructionSeen: false
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRouter = {replace: vi.fn()} as any;

function makeInput(overrides: Partial<{
  runtimeReady: boolean;
  landingIngressFlag: boolean;
  instructionSeen: boolean;
  runPhase: TestRunPhase;
  entryPolicy: TestEntryPolicy;
  dispatchRunAction: (action: TestRunAction) => void;
}> = {}) {
  return {
    variant: 'qmbti',
    landingPath: '/en',
    runtimeReady: overrides.runtimeReady ?? true,
    landingIngressFlag: overrides.landingIngressFlag ?? false,
    instructionSeen: overrides.instructionSeen ?? false,
    runPhase: overrides.runPhase ?? 'instruction',
    entryPolicy: overrides.entryPolicy ?? makePlainStartPolicy(),
    qualifierItems: [],
    answers: {},
    router: mockRouter,
    dispatchRunAction: overrides.dispatchRunAction ?? vi.fn(),
    resetScoringAnswers: vi.fn()
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
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useTestEntryOrchestrator', () => {
  it('auto-commits once when instructionSeen=true and policy allows it', async () => {
    const dispatchRunAction = vi.fn();
    renderHook(() =>
      useTestEntryOrchestrator(makeInput({instructionSeen: true, dispatchRunAction}))
    );
    await flushMicrotasks();

    expect(dispatchRunAction).toHaveBeenCalledTimes(1);
    expect(dispatchRunAction).toHaveBeenCalledWith({type: 'COMMIT_ENTRY', recordsInstructionSeen: true});
  });

  it('does not auto-commit when the policy disallows it', async () => {
    const dispatchRunAction = vi.fn();
    renderHook(() =>
      useTestEntryOrchestrator(
        makeInput({instructionSeen: true, entryPolicy: makeConsentPolicy(), dispatchRunAction})
      )
    );
    await flushMicrotasks();

    expect(dispatchRunAction).not.toHaveBeenCalled();
  });

  it('keeps auto-commit idempotent under Strict Mode double invoke', async () => {
    const dispatchRunAction = vi.fn();
    renderHook(
      () => useTestEntryOrchestrator(makeInput({instructionSeen: true, dispatchRunAction})),
      {wrapper: StrictMode}
    );
    await flushMicrotasks();

    expect(dispatchRunAction).toHaveBeenCalledTimes(1);
    expect(vi.mocked(markInstructionSeen)).not.toHaveBeenCalled();
  });

  it('redirect action requests redirect phase, clears landing ingress, and navigates home', async () => {
    const dispatchRunAction = vi.fn();
    const {result} = renderHook(() =>
      useTestEntryOrchestrator(makeInput({landingIngressFlag: true, dispatchRunAction}))
    );
    await flushMicrotasks();

    act(() => {
      result.current.executeInstructionAction('deny_and_abandon');
    });

    expect(dispatchRunAction).toHaveBeenCalledWith({type: 'REDIRECT_HOME'});
    expect(vi.mocked(clearLandingIngress)).toHaveBeenCalledWith('qmbti');
    expect(mockRouter.replace).toHaveBeenCalledWith('/en');
    expect(vi.mocked(markInstructionSeen)).not.toHaveBeenCalled();
  });

  it('keep_current_preference redirects home without clearing non-ingress state', async () => {
    const dispatchRunAction = vi.fn();
    const {result} = renderHook(() => useTestEntryOrchestrator(makeInput({dispatchRunAction})));
    await flushMicrotasks();

    act(() => {
      result.current.executeInstructionAction('keep_current_preference');
    });

    expect(dispatchRunAction).toHaveBeenCalledWith({type: 'REDIRECT_HOME'});
    expect(mockRouter.replace).toHaveBeenCalledWith('/en');
    expect(vi.mocked(clearLandingIngress)).not.toHaveBeenCalled();
    expect(vi.mocked(markInstructionSeen)).not.toHaveBeenCalled();
  });

  it('start action marks instruction seen and requests commit entry', async () => {
    const dispatchRunAction = vi.fn();
    const {result} = renderHook(() => useTestEntryOrchestrator(makeInput({dispatchRunAction})));
    await flushMicrotasks();

    act(() => {
      result.current.executeInstructionAction('start');
    });

    expect(vi.mocked(markInstructionSeen)).toHaveBeenCalledWith('qmbti');
    expect(dispatchRunAction).toHaveBeenCalledWith({type: 'COMMIT_ENTRY', recordsInstructionSeen: true});
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('consent-bearing start actions write consent and request commit entry', async () => {
    const dispatchRunAction = vi.fn();
    const {result} = renderHook(() => useTestEntryOrchestrator(makeInput({dispatchRunAction})));
    await flushMicrotasks();

    act(() => {
      result.current.executeInstructionAction('accept_all_and_start');
    });
    act(() => {
      result.current.executeInstructionAction('deny_and_start');
    });

    expect(vi.mocked(setTelemetryConsentState)).toHaveBeenCalledWith('OPTED_IN');
    expect(vi.mocked(setTelemetryConsentState)).toHaveBeenCalledWith('OPTED_OUT');
    expect(vi.mocked(markInstructionSeen)).toHaveBeenCalledTimes(2);
    expect(dispatchRunAction).toHaveBeenCalledWith({type: 'COMMIT_ENTRY', recordsInstructionSeen: true});
  });

  it('does nothing when runtime is not ready', async () => {
    const dispatchRunAction = vi.fn();
    const {result} = renderHook(() =>
      useTestEntryOrchestrator(makeInput({runtimeReady: false, dispatchRunAction}))
    );
    await flushMicrotasks();

    act(() => {
      result.current.executeInstructionAction('start');
    });

    expect(dispatchRunAction).not.toHaveBeenCalled();
    expect(vi.mocked(markInstructionSeen)).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('does nothing after reducer phase is redirecting', async () => {
    const dispatchRunAction = vi.fn();
    const {result} = renderHook(() =>
      useTestEntryOrchestrator(makeInput({runPhase: 'redirecting', dispatchRunAction}))
    );
    await flushMicrotasks();

    act(() => {
      result.current.executeInstructionAction('start');
    });

    expect(result.current.redirecting).toBe(true);
    expect(dispatchRunAction).not.toHaveBeenCalled();
    expect(vi.mocked(markInstructionSeen)).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
