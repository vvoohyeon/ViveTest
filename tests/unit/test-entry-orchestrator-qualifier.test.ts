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

import {markInstructionSeen} from '@/features/transition/store';
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
  qualifierItems: QualifierOverlayItem[];
  runtimeReady: boolean;
  landingIngressFlag: boolean;
  instructionSeen: boolean;
  runPhase: TestRunPhase;
  entryPolicy: TestEntryPolicy;
  dispatchRunAction: (action: TestRunAction) => void;
}> = {}) {
  return {
    variant: 'egtt',
    landingPath: '/en',
    runtimeReady: overrides.runtimeReady ?? true,
    landingIngressFlag: overrides.landingIngressFlag ?? false,
    instructionSeen: overrides.instructionSeen ?? false,
    runPhase: overrides.runPhase ?? 'instruction',
    entryPolicy: overrides.entryPolicy ?? makePolicy(),
    qualifierItems: overrides.qualifierItems ?? qualifierItems,
    router: mockRouter,
    dispatchRunAction: overrides.dispatchRunAction ?? vi.fn()
  };
}

describe('useTestEntryOrchestrator qualifier wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('advances to the first qualifier step without committing entry', () => {
    const dispatchRunAction = vi.fn();
    const {result} = renderHook(() => useTestEntryOrchestrator(makeInput({dispatchRunAction})));

    act(() => {
      result.current.executeInstructionAction('start');
    });

    expect(result.current.overlayStep).toBe(0);
    expect(dispatchRunAction).not.toHaveBeenCalledWith(expect.objectContaining({type: 'COMMIT_ENTRY'}));
  });

  it('updates qualifier draft by canonical index', () => {
    const {result} = renderHook(() => useTestEntryOrchestrator(makeInput()));

    act(() => {
      result.current.onQualifierSelect(1, 'M');
    });

    expect(result.current.qualifierDraft).toEqual({1: 'M'});
  });

  it('dispatches final qualifier answers with string canonical keys', () => {
    const dispatchRunAction = vi.fn();
    const {result} = renderHook(() => useTestEntryOrchestrator(makeInput({dispatchRunAction})));

    act(() => {
      result.current.executeInstructionAction('start');
    });
    act(() => {
      result.current.onQualifierSelect(1, 'F');
    });
    act(() => {
      result.current.executeInstructionAction('start');
    });

    expect(dispatchRunAction).toHaveBeenCalledWith({
      type: 'COMMIT_ENTRY',
      recordsInstructionSeen: true,
      qualifierAnswers: {'1': 'F'}
    });
    expect(writeResponseSet).toHaveBeenCalledWith('egtt', {'1': 'F'});
    expect(markInstructionSeen).toHaveBeenCalledWith('egtt');
    expect(result.current.qualifierDraft).toEqual({});
  });

  it('returns from qualifier step zero to the instruction step', () => {
    const {result} = renderHook(() => useTestEntryOrchestrator(makeInput()));

    act(() => {
      result.current.executeInstructionAction('start');
    });
    act(() => {
      result.current.onQualifierBack();
    });

    expect(result.current.overlayStep).toBe('instruction');
  });

  it('preserves qualifier draft across back and forward navigation', () => {
    const {result} = renderHook(() => useTestEntryOrchestrator(makeInput()));

    act(() => {
      result.current.executeInstructionAction('start');
    });
    act(() => {
      result.current.onQualifierSelect(1, 'M');
    });
    act(() => {
      result.current.onQualifierBack();
    });
    act(() => {
      result.current.executeInstructionAction('start');
    });

    expect(result.current.overlayStep).toBe(0);
    expect(result.current.qualifierDraft).toEqual({1: 'M'});
  });

  it('commits entry directly when no qualifier items exist', () => {
    const dispatchRunAction = vi.fn();
    const {result} = renderHook(() =>
      useTestEntryOrchestrator(makeInput({qualifierItems: [], dispatchRunAction}))
    );

    act(() => {
      result.current.executeInstructionAction('start');
    });

    expect(result.current.overlayStep).toBe('instruction');
    expect(dispatchRunAction).toHaveBeenCalledWith({type: 'COMMIT_ENTRY', recordsInstructionSeen: true});
  });
});
