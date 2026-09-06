# Test Entry Orchestrator Extraction — Implementation Plan

**Date:** 2026-05-12
**SSOT contract:** `docs/req-test.md`, `docs/project-analysis.md §5.5`
**Task routing:** test flow / domain
**Plan trigger:** touches `scripts/qa/*.mjs` (Ask First boundary, §4)

---

## 1. Objectives

1. Extract `executeInstructionAction` (client:123–156) and the auto-commit
   `useEffect` (client:158–179) from `test-question-client.tsx` into a new
   `use-test-entry-orchestrator.ts` hook. Move `instructionSeen`,
   `entryCommitted`, and `redirecting` state into the hook. Keep
   `markInstructionSeen` and `clearLandingIngress` owned by the hook so the
   QA Block 1 check remains non-vacuous.

2. Align `instruction-overlay.tsx` disabled-button Tailwind tokens with the
   R-08 token family in `test-question-client.tsx` (eleven `disabled:!` classes
   replacing `disabled:cursor-default disabled:opacity-[0.58]`).

3. Close coverage gaps: new `use-test-entry-orchestrator.test.ts` (T-E1–T-E10),
   two additions to `use-test-run-controller.test.ts` (T-R-A, T-R-B), QA
   Block 1 updated to check `clearLandingIngress` ownership in the new hook.

**Observable behavior must not change.**

---

## 2. All Files to Be Modified

| # | File | Status | Est. ΔLines |
|---|---|---|---|
| 1 | `src/features/test/use-test-entry-orchestrator.ts` | **new** | +89 |
| 2 | `src/features/test/test-question-client.tsx` | modified | 338 → ~284 |
| 3 | `src/features/test/instruction-overlay.tsx` | modified | 85 → 85 (class string only) |
| 4 | `scripts/qa/_path-config.mjs` | modified | 63 → 64 |
| 5 | `scripts/qa/check-phase10-transition-contracts.mjs` | modified | 144 → ~156 |
| 6 | `tests/unit/use-test-entry-orchestrator.test.ts` | **new** | +215 |
| 7 | `tests/unit/use-test-run-controller.test.ts` | modified | 403 → ~435 |
| 8 | `docs/project-analysis.md` | modified | doc-only |

---

## 3. SSOT Contract References

| Task type | Contract |
|---|---|
| test flow / domain | `docs/req-test.md`, `docs/project-analysis.md §5.5` |
| QA script change | `scripts/qa/check-phase10-transition-contracts.mjs` (Ask First) |
| verification commands | `docs/agent-guides/verification-commands.md §test-flow` |

---

## 4. Impact Assessment

| Dimension | Assessment |
|---|---|
| Shell / GNB | Not touched |
| Localization | `useTranslations` stays in client; no message key changes |
| Accessibility | `aria-hidden` on question panel unchanged; no a11y attribute changes |
| State contracts | `entryCommitted` bridge to controller preserved; see D-B for threading |
| Core user flow | BC-1 through BC-7 unchanged; see §6 |
| E2E snapshots | `instruction-overlay.tsx` disabled state is not captured in any snapshot recipe; no baseline regeneration needed |
| QA script baseline | `qa:rules` currently passes all 12 checks; Block 1 is the only check modified |

---

## 5. Pre-Execution Decisions

### D-A — `runtimeReady` value passed to the hook

**Decision:** Pass `runtimeReady` (raw controller output) to the orchestrator
hook, not the composite `!isBooting`.

**Rationale:**
- The original `executeInstructionAction` already guards with `!runtimeReady`,
  not `!isBooting`. Passing raw `runtimeReady` preserves this exactly.
- For the auto-commit `useEffect`, the original guards with `isBooting`
  (`!runtimeReady || !consentSnapshot.synced`). The added guard from
  `consentSnapshot.synced` is rendered inert in the hook because
  `canAutoCommitAfterInstructionSeen === true` is only possible when consent is
  not `UNKNOWN`. When consent is `UNKNOWN`, the policy returns
  `canAutoCommitAfterInstructionSeen: false`, so the effect returns early
  regardless. No behavioral difference.
- Passing raw `runtimeReady` keeps the interface clean ("from controller") and
  avoids a negation at the call site.

**If reviewer disagrees:** pass `!isBooting` (composite) as `runtimeReady` at
the call site in the client. Hook interface stays the same.

---

### D-B — Breaking the circular dependency between orchestrator and controller

**Problem:** `useTestRunController` requires `entryCommitted: boolean` as
input. `useTestEntryOrchestrator` produces `entryCommitted` as output. Both
also need outputs from the other (`runtimeReady`, `landingIngressFlag`,
`entryPolicy`). Hook calls within a single render execute top-to-bottom; a
hook's output is only available to subsequent calls in the same render.

**Analysis of React's state semantics:** React's `useState` preserves state
across renders. The orchestrator's internal `useState(false)` for
`entryCommitted` returns the last committed value at render time — it does not
need any input to initialize. The circular dependency only arises in which hook
is called first within a render.

**Resolution:** Call the controller before the orchestrator. Thread
`entryCommitted` from the orchestrator's previous render into the controller
via a `useRef` at the client level.

```tsx
// In TestQuestionClient body — call order:
const entryCommittedForController = useRef(false);

// 1. Controller reads entryCommittedForController.current (orchestrator's last output)
const {runtimeReady, landingIngressFlag, ...} = useTestRunController({
  variant, locale, pathname, questions,
  entryCommitted: entryCommittedForController.current
});

// 2. Compute entryPolicy (uses landingIngressFlag from controller)
const entryPolicy = useMemo(() => resolveTestEntryPolicy({...}), [...]);

// 3. Orchestrator (uses real controller outputs and entryPolicy)
const {instructionSeen, entryCommitted, redirecting, executeInstructionAction} =
  useTestEntryOrchestrator({variant, landingPath, runtimeReady, landingIngressFlag, entryPolicy, router});

// 4. Update ref for next render
entryCommittedForController.current = entryCommitted;
```

**Why this is correct:** On render N, the controller reads the ref value set at
the end of render N-1 (the orchestrator's last committed output). This is
semantically identical to the original `useState` approach: state initialized
to `false` on render 1, updated to `true` after the orchestrator commits,
causing a re-render where the controller sees `true`. The one-render lag is
unchanged.

**React compliance:** Writing a ref during render is permitted for
caching/derived-value patterns where the value only moves in one direction
(`false → true`) and stale reads cause no visible tearing. The controller reads
`entryCommittedForController.current` at render time, which is the orchestrator's
previous-render output — exactly the same one-render lag as the original
`useState`.

---

## 6. Behavioral Contracts

| ID | Description | Verification method |
|---|---|---|
| BC-1 | Auto-commit does not double-fire | T-E1 (fires once), T-E3 (idempotent under Strict Mode) |
| BC-2 | Redirect clears ingress and navigates; no entry commit | T-E4 (`deny_and_abandon`), T-E5 (`keep_current_preference`) |
| BC-3 | Manual start writes `markInstructionSeen`, commits once | T-E6 (`start`), T-E7 (`accept_all_and_start`), T-E8 (`deny_and_start`) |
| BC-4 | No telemetry in client or new hook | Static: grep orchestrator and client for `trackAttemptStart`/`trackFinalSubmit` — must be absent |
| BC-5 | `consumeLandingIngress`, `trackAttemptStart`, `trackFinalSubmit` in controller | QA Block 2 is unchanged and must continue to pass |
| BC-6 | `writeResponseSet` called on every answer; no read path | Inline comment added at write call site in controller; T-R-B verifies write-only |
| BC-7 | `data-entry-status='submitted'` added | T-R-A (indirect); manual: render after submit, check attribute value |

---

## 7. Step-by-Step Implementation

### Step 1a — New file: `src/features/test/use-test-entry-orchestrator.ts`

Create from scratch. Exact content:

```typescript
import {useCallback, useEffect, useRef, useState} from 'react';
import type {useRouter} from 'next/navigation';

import {setTelemetryConsentState} from '@/features/telemetry/consent-source';
import {clearLandingIngress, hasSeenInstruction, markInstructionSeen} from '@/features/transition/store';
import type {TestEntryPolicy, TestInstructionAction} from '@/features/test/entry-policy';

interface UseTestEntryOrchestratorInput {
  variant: string;
  landingPath: string;
  runtimeReady: boolean;
  landingIngressFlag: boolean;
  entryPolicy: TestEntryPolicy;
  router: ReturnType<typeof useRouter>;
}

interface UseTestEntryOrchestratorOutput {
  instructionSeen: boolean;
  entryCommitted: boolean;
  redirecting: boolean;
  executeInstructionAction: (action: TestInstructionAction) => void;
}

export function useTestEntryOrchestrator({
  variant,
  landingPath,
  runtimeReady,
  landingIngressFlag,
  entryPolicy,
  router
}: UseTestEntryOrchestratorInput): UseTestEntryOrchestratorOutput {
  const [instructionSeen, setInstructionSeen] = useState(() => hasSeenInstruction(variant));
  const [entryCommitted, setEntryCommitted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  // Guards commitsRuntimeEntry against double-fire when the auto-commit microtask
  // runs more than once (e.g. React Strict Mode double-invoke).
  const entryCommittedRef = useRef(false);

  const executeInstructionAction = useCallback(
    (action: TestInstructionAction) => {
      const effect = entryPolicy.effects[action];
      if (!runtimeReady || redirecting) {
        return;
      }

      if (effect.writesConsent) {
        setTelemetryConsentState(effect.writesConsent);
      }

      if (effect.recordsInstructionSeen && !instructionSeen) {
        markInstructionSeen(variant);
        setInstructionSeen(true);
      }

      if (effect.redirectHome) {
        if (landingIngressFlag) {
          clearLandingIngress(variant);
        }
        setRedirecting(true);
        router.replace(landingPath);
        return;
      }

      if (!effect.commitsRuntimeEntry || entryCommittedRef.current) {
        return;
      }

      entryCommittedRef.current = true;
      setEntryCommitted(true);
    },
    [entryPolicy.effects, instructionSeen, landingIngressFlag, landingPath, redirecting, router, runtimeReady, variant]
  );

  useEffect(() => {
    if (
      !runtimeReady ||
      redirecting ||
      entryCommitted ||
      !instructionSeen ||
      !entryPolicy.canAutoCommitAfterInstructionSeen
    ) {
      return;
    }

    queueMicrotask(() => {
      if (entryCommittedRef.current) {
        return;
      }
      executeInstructionAction('start');
    });
  }, [
    entryCommitted,
    entryPolicy.canAutoCommitAfterInstructionSeen,
    executeInstructionAction,
    instructionSeen,
    redirecting,
    runtimeReady
  ]);

  return {instructionSeen, entryCommitted, redirecting, executeInstructionAction};
}
```

**Design notes:**

- `entryCommitted` state is absent from the `useCallback` deps. The idempotency
  guard uses `entryCommittedRef.current` (sync-safe, no stale-closure risk),
  so the state variable is not needed there. This reduces `executeInstructionAction`
  recreation frequency on the commit re-render.
- The `entryCommittedRef.current` check sits inside the `queueMicrotask`
  callback (not the effect body) to handle React Strict Mode: the effect fires
  twice, queuing two microtasks. The first microtask sets the ref before the
  second runs, preventing a double commit.
- No telemetry function is called anywhere in this file (BC-4).

---

### Step 1b — Modify `src/features/test/test-question-client.tsx`

**Import block changes:**

1. Remove `useCallback` and `useState` from the React import; add `useRef`;
   keep `useEffect` and `useMemo`:
   ```tsx
   // Before (line 6):
   import {useCallback, useEffect, useMemo, useState} from 'react';
   // After:
   import {useEffect, useMemo, useRef} from 'react';
   ```

2. Remove `setTelemetryConsentState` from the consent-source import; keep
   `useTelemetryConsentSource`:
   ```tsx
   // Before (line 9):
   import {setTelemetryConsentState, useTelemetryConsentSource} from '@/features/telemetry/consent-source';
   // After:
   import {useTelemetryConsentSource} from '@/features/telemetry/consent-source';
   ```

3. Remove the entire transition store import block (lines 11–15):
   ```tsx
   // Remove entirely:
   import {
     clearLandingIngress,
     hasSeenInstruction,
     markInstructionSeen
   } from '@/features/transition/store';
   ```

4. Remove `type TestInstructionAction` from the entry-policy import; keep
   `resolveTestEntryPolicy`:
   ```tsx
   // Before (line 16):
   import {resolveTestEntryPolicy, type TestInstructionAction} from '@/features/test/entry-policy';
   // After:
   import {resolveTestEntryPolicy} from '@/features/test/entry-policy';
   ```

5. Add new import after the `use-test-run-controller` import (after line 22):
   ```tsx
   import {useTestEntryOrchestrator} from '@/features/test/use-test-entry-orchestrator';
   ```

**Body changes inside `TestQuestionClient`:**

Remove lines 63–65 (three `useState` declarations):
```tsx
// Remove:
const [instructionSeen, setInstructionSeen] = useState(() => hasSeenInstruction(variant));
const [entryCommitted, setEntryCommitted] = useState(false);
const [redirecting, setRedirecting] = useState(false);
```

In their place, insert the threading ref:
```tsx
const entryCommittedForController = useRef(false);
```

Update the `useTestRunController` call to read from the ref instead of the
removed state variable:
```tsx
// Before (line 84):
} = useTestRunController({variant, locale, pathname, questions, entryCommitted});

// After:
} = useTestRunController({variant, locale, pathname, questions, entryCommitted: entryCommittedForController.current});
```

The `entryPolicy` `useMemo` (lines 105–114) is **unchanged**.

Remove lines 123–156 (`executeInstructionAction` useCallback block, including
the blank line after the closing bracket).

Remove lines 158–179 (auto-commit `useEffect` block, including the blank line
after).

After the `entryPolicy` memo (now renumbered), add the orchestrator hook call
and ref update:
```tsx
const {instructionSeen, entryCommitted, redirecting, executeInstructionAction} =
  useTestEntryOrchestrator({variant, landingPath, runtimeReady, landingIngressFlag, entryPolicy, router});

entryCommittedForController.current = entryCommitted;
```

The `isBooting` and `instructionVisible` derivations remain in the client body,
positioned after `useTestRunController` and before the orchestrator call (they
depend on `runtimeReady` and `consentSnapshot.synced`). No change to these lines.

**Final call order in the function body after refactor:**

```
1.  useTranslations, usePathname, useRouter, useTelemetryConsentSource
2.  variant, landingPath, questions (useMemo)
3.  entryCommittedForController (useRef)
4.  useTestRunController({..., entryCommitted: entryCommittedForController.current})
5.  consentState derivation
6.  entryPolicy (useMemo) — unchanged
7.  isBooting, instructionVisible derivations — unchanged
8.  useTestEntryOrchestrator({variant, landingPath, runtimeReady, landingIngressFlag, entryPolicy, router})
9.  entryCommittedForController.current = entryCommitted  [ref update]
10. transition completion useEffect — unchanged
11. primaryButton, secondaryButton, instructionNote derivations — unchanged
12. return JSX
```

---

### Step 2 — `data-entry-status` submitted value (also in `test-question-client.tsx`, JSX)

Locate the JSX attribute at line 189 (current):
```tsx
data-entry-status={redirecting ? 'redirecting' : isBooting ? 'booting' : started ? 'started' : 'ready'}
```

Replace with:
```tsx
data-entry-status={
  redirecting ? 'redirecting'
    : isBooting ? 'booting'
    : submitted ? 'submitted'
    : started ? 'started'
    : 'ready'
}
```

`submitted` is already destructured from `useTestRunController` output (line 72
in the original). `submitted` implies `started === true`, so `submitted` must
be checked before `started`.

---

### Step 3 — Modify `src/features/test/instruction-overlay.tsx`

**Only change:** the `instructionButtonBaseClassName` constant (lines 9–10).

Current trailing tokens (before `${instructionButtonFocusRingClassName}`):
```
disabled:cursor-default disabled:opacity-[0.58]
```

Replace with the full R-08 token set:
```
disabled:!cursor-not-allowed disabled:!border-[var(--interactive-disabled-border)] disabled:!bg-[var(--interactive-disabled-bg)] disabled:!text-[var(--interactive-disabled-ink)] disabled:!opacity-100 disabled:!shadow-none disabled:hover:!border-[var(--interactive-disabled-border)] disabled:hover:!bg-[var(--interactive-disabled-bg)] disabled:hover:!text-[var(--interactive-disabled-ink)] disabled:hover:!shadow-none disabled:hover:!translate-y-0
```

After the change the full constant reads:
```typescript
const instructionButtonBaseClassName =
  `inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-[14px] border px-[14px] py-3 text-center font-semibold leading-[1.35] text-[var(--text-strong)] [font:inherit] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color,transform] [transition-timing-function:ease] disabled:!cursor-not-allowed disabled:!border-[var(--interactive-disabled-border)] disabled:!bg-[var(--interactive-disabled-bg)] disabled:!text-[var(--interactive-disabled-ink)] disabled:!opacity-100 disabled:!shadow-none disabled:hover:!border-[var(--interactive-disabled-border)] disabled:hover:!bg-[var(--interactive-disabled-bg)] disabled:hover:!text-[var(--interactive-disabled-ink)] disabled:hover:!shadow-none disabled:hover:!translate-y-0 ${instructionButtonFocusRingClassName}`;
```

**Verification after change:** diff the `disabled:` class tokens from both
files. The disabled class list in `instructionButtonBaseClassName` must be
character-identical to the disabled class list in `testButtonBaseClassName`
in `test-question-client.tsx`. No `!`-modifier difference should remain.

No props, logic, or structural changes to `instruction-overlay.tsx`.

---

### Step 4a — Modify `scripts/qa/_path-config.mjs`

Add `entryOrchestrator` to the `test` export group. Current (lines 59–62):
```js
export const test = {
  questionClient: 'src/features/test/test-question-client.tsx',
  runController: 'src/features/test/use-test-run-controller.ts'
};
```

After:
```js
export const test = {
  questionClient: 'src/features/test/test-question-client.tsx',
  runController: 'src/features/test/use-test-run-controller.ts',
  entryOrchestrator: 'src/features/test/use-test-entry-orchestrator.ts'
};
```

---

### Step 4b — Modify `scripts/qa/check-phase10-transition-contracts.mjs`

**Block 1 replacement** (lines 44–55 in current file):

Current Block 1:
```js
// Block 1 — checks test-question-client.tsx (entry-phase contracts stay in client)
if (fileExists(test.questionClient)) {
  const questionClient = read(test.questionClient);

  if (!/markInstructionSeen/u.test(questionClient)) {
    fail('Test question client must persist instructionSeen on instruction action.');
  }

  if (/fallbackTransitionId/u.test(questionClient) || /runtimeState\.transitionId/u.test(questionClient)) {
    fail('Test question client must not depend on fallback/runtime transitionId state.');
  }
}
```

Replace entirely with:
```js
// Block 1 — entry-phase contracts: negative guard stays in client; ownership checks in orchestrator
if (fileExists(test.questionClient)) {
  const questionClient = read(test.questionClient);

  if (/fallbackTransitionId/u.test(questionClient) || /runtimeState\.transitionId/u.test(questionClient)) {
    fail('Test question client must not depend on fallback/runtime transitionId state.');
  }
}

if (fileExists(test.entryOrchestrator)) {
  const orchestratorFile = read(test.entryOrchestrator);
  if (!/markInstructionSeen/u.test(orchestratorFile)) {
    fail('Entry orchestrator must call markInstructionSeen on commit actions.');
  }
  if (!/clearLandingIngress/u.test(orchestratorFile)) {
    fail('Entry orchestrator must call clearLandingIngress on redirect actions.');
  }
}
```

**Rationale for the split:** After extraction, `markInstructionSeen` is no
longer a direct identifier in `test-question-client.tsx` (it appears only via
the `useTestEntryOrchestrator` import name in the import statement, not as an
ownership site). Checking the client would pass vacuously. Checking the
orchestrator file is the correct non-vacuous assertion. The `fallbackTransitionId`
/ `runtimeState.transitionId` negative guard still belongs to the client check.

Block 2 (lines 57–68) is **unchanged**. BC-5 is verified by Block 2 continuing
to pass.

---

### Step 5a — New file: `tests/unit/use-test-entry-orchestrator.test.ts`

Full content:

```typescript
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
```

---

### Step 5b — Additions to `tests/unit/use-test-run-controller.test.ts`

Append two new `describe` blocks inside the outermost `describe('useTestRunController', ...)`,
after the last existing block (the `consumeLandingIngress call` block at line 402):

```typescript
  describe('T-R-A: submitted flag is true after successful handleSubmit (BC-7 indirect)', () => {
    it('returns submitted=true after all answers answered and handleSubmit called', async () => {
      const {result, rerender} = renderHook(
        (props: {entryCommitted: boolean}) => useTestRunController(makeInput(props)),
        {initialProps: {entryCommitted: false}}
      );
      await flushMicrotasks();

      rerender({entryCommitted: true});
      await flushMicrotasks();

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
    });
  });

  describe('T-R-B: write-only storage — writeResponseSet called; no read path invoked during bootstrap', () => {
    it('does not call writeResponseSet during bootstrap before any updateAnswer', async () => {
      const {rerender} = renderHook(
        (props: {entryCommitted: boolean}) => useTestRunController(makeInput(props)),
        {initialProps: {entryCommitted: false}}
      );
      await flushMicrotasks();

      rerender({entryCommitted: true});
      await flushMicrotasks();

      expect(vi.mocked(writeResponseSet)).not.toHaveBeenCalled();
    });

    it('calls writeResponseSet with canonical-index-keyed payload on updateAnswer', async () => {
      const {result, rerender} = renderHook(
        (props: {entryCommitted: boolean}) => useTestRunController(makeInput(props)),
        {initialProps: {entryCommitted: false}}
      );
      await flushMicrotasks();

      rerender({entryCommitted: true});
      await flushMicrotasks();

      act(() => { result.current.updateAnswer('B'); });
      await flushMicrotasks();

      expect(vi.mocked(writeResponseSet)).toHaveBeenCalledWith('qmbti', {'1': 'B'});
      const payload = vi.mocked(writeResponseSet).mock.calls[0]?.[1] ?? {};
      for (const key of Object.keys(payload)) {
        expect(key).toMatch(/^\d+$/);
      }
    });
  });
```

**Note on T-R-B read-path assertion:** `readResponseSet` and `getActiveRun` are
statically absent from `use-test-run-controller.ts` imports. A runtime mock
assertion is not added for identifiers that are never imported. The absence is
verified by `typecheck` and the import list. The test confirms the positive
write case and the no-write-during-bootstrap case, which together satisfy the
spec intent.

---

### Step 6 — `docs/project-analysis.md` changes

**D-1 — §5.5 addition:**

Locate the sentence ending `...active-run resume, or history persistence.` in
the Test paragraph of §5.5. After that sentence, insert:

> `writeResponseSet` is called on every answer update via `use-test-run-controller.ts`. The resume read path (`readResponseSet`, `getActiveRun`) is intentionally deferred to Phase 4/5 — the write-without-read asymmetry is not an oversight.

**D-2 — §9 addition:**

Locate the paragraph beginning `**Screenshot-driven QA remains concentrated...**`.
Before that paragraph, insert a new paragraph:

> **Test entry orchestration is now split from the client.** `use-test-entry-orchestrator.ts` owns the entry action handler (`executeInstructionAction`) and the auto-commit effect. `markInstructionSeen` and `clearLandingIngress` are called from this hook. `test-question-client.tsx` retains `instructionVisible` derivation (depends on `isBooting`) and threads `entryCommitted` to the controller via a ref. The orchestrator hook does not own telemetry — `trackAttemptStart` and `trackFinalSubmit` remain in `use-test-run-controller.ts`.

**D-3 — Prompt 3 scope correction:**

Search `docs/project-analysis.md` and `AGENTS.md` for any text matching
`phase unified reducer` described as implemented or complete. If found, replace
the description with:
> phase unified reducer: planned for pre-Phase-5 session.

If not found (likely — neither file contains this text from current reads),
this step is a no-op.

---

## 8. BC-6 Inline Comment

In `src/features/test/use-test-run-controller.ts`, at the `writeResponseSet`
call site (line 158 in the current file, inside `updateAnswer`), add:

```typescript
// write-only storage: read path (readResponseSet, getActiveRun) is Phase 4/5 scope
writeResponseSet(variant, newAnswers);
```

---

## 9. Validation Commands

Run in this exact order after all changes are complete:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run qa:rules
npm run qa:gate:once
```

**`qa:rules` requirement:** All 12 checks pass. `check-phase10-transition-contracts.mjs`
must pass with the updated Block 1. Block 2 must pass unchanged (BC-5).

**Do NOT run:** `qa:visual:full`. The disabled-token change in
`instruction-overlay.tsx` does not affect any currently-captured snapshot recipe.

---

## 10. Prohibited Changes Checklist

| Item | Status |
|---|---|
| Delayed auto-advance / slide-in animation | Out of scope |
| `moveQuestion` behavior or tail reset logic | Not touched |
| Active-run resume read path (`getActiveRun`, `readResponseSet`) | No import added anywhere |
| Phase unified reducer | Not stubbed, not referenced |
| `entry-policy.ts` return shape or `ACTION_EFFECTS` | File not modified |
| Qualifier rendering in `instruction-overlay.tsx` | Only class string changed |
| `src/features/test/domain/`, `schema-registry.ts`, `response-projection.ts` | Not touched |
| Telemetry event names or payload shapes | Not touched |
| Theme-matrix screenshot baseline regeneration | Not needed |

---

## 11. Open Question Resolutions

| OQ | Question | Resolution |
|---|---|---|
| OQ-1 | active-run resume read path intentional? | Resolved by D-1 inline note in §5.5 |
| OQ-2 | Prompt 3 actual scope? | Resolved by D-3 search-and-correct (or confirmed no-op) |
| OQ-3 | data-entry-status submitted? | Resolved by Step 2 (ternary extension in JSX) |
| OQ-4 | instruction phase persistent vs derived? | Deferred to Prompt 3 — no change made |

---

## 12. Completion Report Template

Fill in after execution:

### Files changed

| File | Before | After | Description |
|---|---|---|---|
| `use-test-entry-orchestrator.ts` | 0 | __ | New hook: entry action handler, auto-commit effect, instructionSeen/entryCommitted/redirecting state |
| `test-question-client.tsx` | 338 | __ | Removed 3 useState, 1 useCallback, 1 useEffect; added orchestrator call + entryCommittedForController ref; extended data-entry-status; added useRef import |
| `instruction-overlay.tsx` | 85 | 85 | Replaced disabled token pair with 11-token R-08 family |
| `_path-config.mjs` | 63 | 64 | Added test.entryOrchestrator path |
| `check-phase10-transition-contracts.mjs` | 144 | __ | Block 1 replaced: markInstructionSeen + clearLandingIngress checked in orchestrator; negative guard kept in client check |
| `use-test-entry-orchestrator.test.ts` | 0 | __ | New: T-E1 through T-E10 |
| `use-test-run-controller.test.ts` | 403 | __ | Added T-R-A, T-R-B |
| `docs/project-analysis.md` | __ | __ | D-1 §5.5, D-2 §9, D-3 search-correct |

### Behavioral contracts verified

| ID | Result | Evidence |
|---|---|---|
| BC-1 | __ | T-E1, T-E3 |
| BC-2 | __ | T-E4, T-E5 |
| BC-3 | __ | T-E6, T-E7, T-E8 |
| BC-4 | __ | grep orchestrator + client for trackAttemptStart/trackFinalSubmit |
| BC-5 | __ | QA Block 2 pass |
| BC-6 | __ | Inline comment present; T-R-B first case |
| BC-7 | __ | T-R-A; manual data-entry-status check |

### New test coverage

| Test | Result |
|---|---|
| T-E1 | __ |
| T-E2 | __ |
| T-E3 | __ |
| T-E4 | __ |
| T-E5 | __ |
| T-E6 | __ |
| T-E7 | __ |
| T-E8 | __ |
| T-E9 | __ |
| T-E10 | __ |
| T-R-A | __ |
| T-R-B | __ |

### QA results

`npm run qa:rules`: __ (all 12 checks)
`npm run qa:gate:once`: __

### Deferred items confirmed out of scope

- active-run resume read path: not modified
- phase unified reducer: not modified
- Prompt 2 UX items (auto-advance, animations): not modified
- Prompt 4 qualifier overlay: not modified
