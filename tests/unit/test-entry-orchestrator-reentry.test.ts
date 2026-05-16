// @vitest-environment jsdom
import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {QualifierOverlayItem} from '@/features/test/qualifier-overlay-model';
import type {TestEntryPolicy} from '@/features/test/entry-policy';
import type {TestRunAction, TestRunPhase} from '@/features/test/test-run-reducer';
import {useTestEntryOrchestrator} from '@/features/test/use-test-entry-orchestrator';

vi.mock('@/features/telemetry/consent-source', () => ({
  setTelemetryConsentState: vi.fn()
}));

vi.mock('@/features/transition/store', () => ({
  markInstructionSeen: vi.fn(),
  clearLandingIngress: vi.fn()
}));

vi.mock('@/features/test/storage/response-set', () => ({
  writeResponseSet: vi.fn()
}));

import {writeResponseSet} from '@/features/test/storage/response-set';

const ACTION_EFFECTS = {
  start: {writesConsent: null, redirectHome: false, commitsRuntimeEntry: true, recordsInstructionSeen: true},
  accept_all_and_start: {writesConsent: 'OPTED_IN' as const, redirectHome: false, commitsRuntimeEntry: true, recordsInstructionSeen: true},
  deny_and_start: {writesConsent: 'OPTED_OUT' as const, redirectHome: false, commitsRuntimeEntry: true, recordsInstructionSeen: true},
  deny_and_abandon: {writesConsent: 'OPTED_OUT' as const, redirectHome: true, commitsRuntimeEntry: false, recordsInstructionSeen: false},
  keep_current_preference: {writesConsent: null, redirectHome: true, commitsRuntimeEntry: false, recordsInstructionSeen: false}
} as TestEntryPolicy['effects'];

const qualifierItems: QualifierOverlayItem[] = [
  {
    canonicalIndex: 1,
    questionText: 'My sexual identity is',
    choices: [
      {token: 'M', label: 'Male'},
      {token: 'F', label: 'Female'}
    ]
  }
];

function makePolicy(): TestEntryPolicy {
  return {
    ingressType: 'direct',
    content: {instructionText: 'Test instruction', showConsentNote: false, consentNoteKey: null, showDivider: false},
    cta: {primary: {action: 'start', labelKey: 'start', testId: 'test-start-button'}},
    effects: ACTION_EFFECTS,
    canAutoCommitAfterInstructionSeen: true
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRouter = {replace: vi.fn()} as any;

function makeInput(overrides: Partial<{
  answers: Record<string, string>;
  runPhase: TestRunPhase;
  dispatchRunAction: (action: TestRunAction) => void;
  resetScoringAnswers: (qualifierAnswers: Record<string, string>) => void;
}> = {}) {
  return {
    variant: 'egtt',
    landingPath: '/en',
    runtimeReady: true,
    landingIngressFlag: false,
    instructionSeen: true,
    runPhase: overrides.runPhase ?? ('active' as TestRunPhase),
    entryPolicy: makePolicy(),
    qualifierItems,
    answers: overrides.answers ?? {'1': 'M', '2': 'A', '3': 'B'},
    router: mockRouter,
    dispatchRunAction: overrides.dispatchRunAction ?? vi.fn(),
    resetScoringAnswers: overrides.resetScoringAnswers ?? vi.fn()
  };
}

describe('useTestEntryOrchestrator qualifier reentry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reopenQualifierOverlay enters reentry mode at qualifier step 0', () => {
    const {result} = renderHook(() => useTestEntryOrchestrator(makeInput()));

    act(() => {
      result.current.reopenQualifierOverlay();
    });

    expect(result.current.overlayMode).toBe('reentry');
    expect(result.current.overlayStep).toBe(0);
  });

  it('reopenQualifierOverlay seeds qualifierDraft from existing answers', () => {
    const {result} = renderHook(() => useTestEntryOrchestrator(makeInput({answers: {'1': 'F'}})));

    act(() => {
      result.current.reopenQualifierOverlay();
    });

    expect(result.current.qualifierDraft).toEqual({1: 'F'});
  });

  it('reentry cancel closes the overlay without touching answers/storage', () => {
    const resetScoringAnswers = vi.fn();
    const {result} = renderHook(() =>
      useTestEntryOrchestrator(makeInput({resetScoringAnswers}))
    );

    act(() => {
      result.current.reopenQualifierOverlay();
    });
    act(() => {
      result.current.onQualifierBack();
    });

    expect(result.current.overlayMode).toBe('entry');
    expect(result.current.overlayStep).toBe('instruction');
    expect(result.current.qualifierDraft).toEqual({});
    expect(resetScoringAnswers).not.toHaveBeenCalled();
    expect(writeResponseSet).not.toHaveBeenCalled();
  });

  it('reentry confirm resets scoring answers and closes the overlay', () => {
    const dispatchRunAction = vi.fn();
    const resetScoringAnswers = vi.fn();
    const {result} = renderHook(() =>
      useTestEntryOrchestrator(makeInput({dispatchRunAction, resetScoringAnswers}))
    );

    act(() => {
      result.current.reopenQualifierOverlay();
    });
    act(() => {
      result.current.onQualifierSelect(1, 'F');
    });
    act(() => {
      result.current.executeInstructionAction('start');
    });

    expect(resetScoringAnswers).toHaveBeenCalledWith({'1': 'F'});
    expect(result.current.overlayMode).toBe('entry');
    expect(result.current.overlayStep).toBe('instruction');
    expect(result.current.qualifierDraft).toEqual({});
    expect(dispatchRunAction).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'COMMIT_ENTRY'})
    );
  });

  it('reentry confirm writes the new qualifier-only responses to storage', () => {
    const {result} = renderHook(() => useTestEntryOrchestrator(makeInput()));

    act(() => {
      result.current.reopenQualifierOverlay();
    });
    act(() => {
      result.current.onQualifierSelect(1, 'F');
    });
    act(() => {
      result.current.executeInstructionAction('start');
    });

    expect(writeResponseSet).toHaveBeenCalledWith('egtt', {'1': 'F'});
  });
});
