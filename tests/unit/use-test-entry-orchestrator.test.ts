// @vitest-environment jsdom
import {StrictMode} from 'react';
import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {useTestEntryOrchestrator} from '../../src/features/test/use-test-entry-orchestrator';
import type {TestEntryPolicy} from '../../src/features/test/entry-policy';

vi.mock('../../src/features/telemetry/consent-source', () => ({
  setTelemetryConsentState: vi.fn()
}));

vi.mock('../../src/features/transition/store', () => ({
  hasSeenInstruction: vi.fn(() => false),
  markInstructionSeen: vi.fn(),
  clearLandingIngress: vi.fn()
}));

import {setTelemetryConsentState} from '../../src/features/telemetry/consent-source';
import {clearLandingIngress, hasSeenInstruction, markInstructionSeen} from '../../src/features/transition/store';

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
  entryPolicy: TestEntryPolicy;
}> = {}) {
  if (overrides.instructionSeen !== undefined) {
    vi.mocked(hasSeenInstruction).mockReturnValue(overrides.instructionSeen);
  }
  return {
    variant: 'qmbti',
    landingPath: '/en',
    runtimeReady: overrides.runtimeReady ?? true,
    landingIngressFlag: overrides.landingIngressFlag ?? false,
    entryPolicy: overrides.entryPolicy ?? makePlainStartPolicy(),
    router: mockRouter
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
  vi.mocked(hasSeenInstruction).mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useTestEntryOrchestrator', () => {
  describe('T-E1: Auto-commit fires when instructionSeen=true and canAutoCommit=true and runtimeReady=true', () => {
    it('sets entryCommitted=true without manual executeInstructionAction call', async () => {
      const {result} = renderHook(() =>
        useTestEntryOrchestrator(makeInput({instructionSeen: true, entryPolicy: makePlainStartPolicy()}))
      );
      await flushMicrotasks();

      expect(result.current.entryCommitted).toBe(true);
    });
  });

  describe('T-E2: Auto-commit does NOT fire when canAutoCommitAfterInstructionSeen=false', () => {
    it('does not set entryCommitted even when instructionSeen=true', async () => {
      const {result} = renderHook(() =>
        useTestEntryOrchestrator(makeInput({instructionSeen: true, entryPolicy: makeConsentPolicy()}))
      );
      await flushMicrotasks();

      expect(result.current.entryCommitted).toBe(false);
    });
  });

  describe('T-E3: Auto-commit is idempotent under Strict Mode double-invoke', () => {
    it('sets entryCommitted=true exactly once and does not double-call markInstructionSeen', async () => {
      const {result} = renderHook(
        () => useTestEntryOrchestrator(makeInput({instructionSeen: true, entryPolicy: makePlainStartPolicy()})),
        {wrapper: StrictMode}
      );
      await flushMicrotasks();

      expect(result.current.entryCommitted).toBe(true);
      // instructionSeen=true on init means recordsInstructionSeen guard skips markInstructionSeen.
      // The idempotency ref prevents any double state mutation on the commit path.
      expect(vi.mocked(markInstructionSeen)).not.toHaveBeenCalled();
    });
  });

  describe('T-E4: deny_and_abandon action', () => {
    it('calls clearLandingIngress, navigates home, does not commit entry', async () => {
      const {result} = renderHook(() =>
        useTestEntryOrchestrator(makeInput({landingIngressFlag: true}))
      );
      await flushMicrotasks();

      act(() => {
        result.current.executeInstructionAction('deny_and_abandon');
      });

      expect(vi.mocked(clearLandingIngress)).toHaveBeenCalledWith('qmbti');
      expect(mockRouter.replace).toHaveBeenCalledWith('/en');
      expect(result.current.entryCommitted).toBe(false);
      expect(vi.mocked(markInstructionSeen)).not.toHaveBeenCalled();
    });
  });

  describe('T-E5: keep_current_preference action', () => {
    it('calls router.replace, does not commit entry or call markInstructionSeen', async () => {
      const {result} = renderHook(() =>
        useTestEntryOrchestrator(makeInput({landingIngressFlag: false}))
      );
      await flushMicrotasks();

      act(() => {
        result.current.executeInstructionAction('keep_current_preference');
      });

      expect(mockRouter.replace).toHaveBeenCalledWith('/en');
      expect(result.current.entryCommitted).toBe(false);
      expect(vi.mocked(clearLandingIngress)).not.toHaveBeenCalled();
      expect(vi.mocked(markInstructionSeen)).not.toHaveBeenCalled();
    });
  });

  describe('T-E6: start action', () => {
    it('calls markInstructionSeen, sets entryCommitted=true, does not navigate', async () => {
      const {result} = renderHook(() => useTestEntryOrchestrator(makeInput()));
      await flushMicrotasks();

      act(() => {
        result.current.executeInstructionAction('start');
      });

      expect(vi.mocked(markInstructionSeen)).toHaveBeenCalledWith('qmbti');
      expect(result.current.entryCommitted).toBe(true);
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe('T-E7: accept_all_and_start action', () => {
    it('calls setTelemetryConsentState(OPTED_IN), markInstructionSeen, sets entryCommitted=true', async () => {
      const {result} = renderHook(() => useTestEntryOrchestrator(makeInput()));
      await flushMicrotasks();

      act(() => {
        result.current.executeInstructionAction('accept_all_and_start');
      });

      expect(vi.mocked(setTelemetryConsentState)).toHaveBeenCalledWith('OPTED_IN');
      expect(vi.mocked(markInstructionSeen)).toHaveBeenCalledWith('qmbti');
      expect(result.current.entryCommitted).toBe(true);
    });
  });

  describe('T-E8: deny_and_start action', () => {
    it('calls setTelemetryConsentState(OPTED_OUT), markInstructionSeen, sets entryCommitted=true', async () => {
      const {result} = renderHook(() => useTestEntryOrchestrator(makeInput()));
      await flushMicrotasks();

      act(() => {
        result.current.executeInstructionAction('deny_and_start');
      });

      expect(vi.mocked(setTelemetryConsentState)).toHaveBeenCalledWith('OPTED_OUT');
      expect(vi.mocked(markInstructionSeen)).toHaveBeenCalledWith('qmbti');
      expect(result.current.entryCommitted).toBe(true);
    });
  });

  describe('T-E9: runtimeReady=false guard', () => {
    it('does nothing when runtimeReady is false', async () => {
      const {result} = renderHook(() =>
        useTestEntryOrchestrator(makeInput({runtimeReady: false}))
      );
      await flushMicrotasks();

      act(() => {
        result.current.executeInstructionAction('start');
      });

      expect(result.current.entryCommitted).toBe(false);
      expect(result.current.redirecting).toBe(false);
      expect(vi.mocked(markInstructionSeen)).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe('T-E10: redirecting=true guard', () => {
    it('does nothing on any subsequent action once redirecting is true', async () => {
      const {result} = renderHook(() =>
        useTestEntryOrchestrator(makeInput({landingIngressFlag: false}))
      );
      await flushMicrotasks();

      // First action sets redirecting=true
      act(() => {
        result.current.executeInstructionAction('keep_current_preference');
      });
      expect(result.current.redirecting).toBe(true);

      vi.clearAllMocks();

      // Subsequent action must be a no-op
      act(() => {
        result.current.executeInstructionAction('start');
      });

      expect(result.current.entryCommitted).toBe(false);
      expect(vi.mocked(markInstructionSeen)).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });
});
