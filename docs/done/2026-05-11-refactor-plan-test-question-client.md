# Refactor Plan: `test-question-client.tsx` Structural Refactoring

> **Status**: Pending implementation approval  
> **Scope**: 6 confirmed items — canonical index conversion, tail reset invariant,
> response-set storage write, controller extraction + telemetry relocation, and QA
> script update. No observable behavior changes except tail-reset answer cleanup.

---

## Overview

The goal of this refactoring is to decompose `src/features/test/test-question-client.tsx`
into a maintainable set of focused modules without changing any observable behavior visible
to users or telemetry consumers. The six scope items — executed in safe, independently
verifiable increments — are:

1. **Canonical index conversion** — replace all `question.id` answer-map keys with
   `String(question.canonicalIndex)` throughout the runtime state, derived values, and
   final-submit payload; remove `buildCanonicalFinalResponses`.
2. **Tail reset invariant** — enforce that navigating backward with `moveQuestion(-1)`
   atomically discards all answers from the current question index onward, consistent with
   the req-test.md §3.9 tail-reset contract.
3. **`test:{variant}:responses` write** — add a write-only storage path that persists the
   current answer set to localStorage after every `updateAnswer` call via a new dedicated
   module `src/features/test/storage/response-set.ts`.
4. **Controller extraction + telemetry relocation** — move all question-runtime state,
   refs, effects, and handlers into a new `src/features/test/use-test-run-controller.ts`
   hook; relocate pure utility functions to `src/features/test/question-runtime-utils.ts`.
5. **QA script update** — update `scripts/qa/_path-config.mjs` and
   `scripts/qa/check-phase10-transition-contracts.mjs` to track the new module boundaries
   (lands atomically with Step 4).

---

## Pre-resolved Decisions

| # | Topic | Resolution |
|---|---|---|
| 1 | Dwell on tail reset | `dwellByQuestionRef` entries are **NOT** removed on tail reset. Dwell accumulates for time-on-screen regardless of whether the associated answer was later discarded. |
| 2 | Transition completion ownership | `completePendingLandingTransition` remains in the client component. The controller exposes `pendingTransitionId: string | null` and `clearPendingTransitionId: () => void`. The client `useEffect` that calls `completePendingLandingTransition` watches `pendingTransitionId` from the controller. |
| 3 | `writeResponseSet` location | New dedicated file `src/features/test/storage/response-set.ts`. Do **not** add to `active-run.ts`. |
| 4 | `buildCanonicalFinalResponses` fate | **Remove entirely** after canonical index conversion. `handleSubmit` passes `{ ...runtimeState.answers }` directly as `finalResponses`. Remove the corresponding test in `tests/unit/test-question-bootstrap.test.ts` and update the import. |
| 5 | `bootstrapRuntimeStateRef` pattern | Preserve the existing `if (bootstrapRuntimeStateRef.current)` re-bootstrap guard inside the controller using an identical `useRef` pattern. Do **not** convert to `useMemo`. |
| 6 | `runtimeEntryCommittedRef` fate | **Eliminate** this ref. Replace the synchronous duplicate-commit guard in `executeInstructionAction` with a direct read of the `entryCommitted` boolean already in the callback's closure dependency array. |

---

## Implementation Steps

---

### Step 1 — Canonical Index Conversion

#### Files changed

| File | What changes |
|---|---|
| `src/features/test/test-question-client.tsx` | 7 answer-map key sites + `buildCanonicalFinalResponses` removal + `handleSubmit` simplification |
| `tests/unit/test-question-bootstrap.test.ts` | Answer-shape assertions updated; `buildCanonicalFinalResponses` test case and import removed |

#### Change description

**Answer-map key sites in `test-question-client.tsx`** — replace every `question.id`
used as an answer-map key with `String(question.canonicalIndex)`:

- Line ~123 (`resolveInitialAnswers`): `{[firstScoringQuestion.id]: ...}` →
  `{[String(firstScoringQuestion.canonicalIndex)]: ...}`
- Lines ~135, ~136 (`buildCanonicalFinalResponses`): remove the entire function body and
  export; the function itself is deleted (see below).
- Line ~148 (`resolveScoringProgress`): `input.answers[question.id]` →
  `input.answers[String(question.canonicalIndex)]` (appears twice inside the filter chain).
- Line ~377 (`currentAnswer` derivation): `runtimeState.answers[currentQuestion.id]` →
  `runtimeState.answers[String(currentQuestion.canonicalIndex)]`
- Line ~378 (`allAnswered` derivation): `runtimeState.answers[question.id]` →
  `runtimeState.answers[String(question.canonicalIndex)]` (appears twice in the `.every`
  predicate).
- Line ~399 (`updateAnswer`): `[currentQuestion.id]: choice` →
  `[String(currentQuestion.canonicalIndex)]: choice`
- Line ~484 (JSX result panel `<dd>`): `runtimeState.answers[question.id]` →
  `runtimeState.answers[String(question.canonicalIndex)]`

**`buildCanonicalFinalResponses` removal:**
Delete the entire exported function (lines ~130–141). Update `handleSubmit` (~line 423):

```typescript
// Before
const finalResponses = buildCanonicalFinalResponses({ questions, answers: runtimeState.answers });

// After
const finalResponses = { ...runtimeState.answers };
```

Because answers are now stored with canonical index keys, no mapping step is needed.

**Result panel key prop** (line ~481 `<div key={question.id}>`): This is a React `key`
prop for list rendering, not an answer-map lookup. Leave it unchanged.

#### Behavioral contract

**Observable behavior change: No.**

The answers map keys change from opaque `id` strings (e.g. `"q1"`) to canonical index
strings (e.g. `"1"`), but no UI renders raw answer-map keys. The telemetry payload
`finalResponses` already used canonical index keys via `buildCanonicalFinalResponses`; the
removal of that function is a no-op from the payload consumer's perspective because the
new direct pass-through produces the same shape.

#### Tests to update

**`tests/unit/test-question-bootstrap.test.ts`**

1. **Remove the test case** at line 140: `'builds final_submit responses keyed by canonical question index instead of UI ids'`. This test exercises `buildCanonicalFinalResponses`, which is deleted.

2. **Remove `buildCanonicalFinalResponses` from the import** at lines 5–8:
   ```typescript
   // Before
   import {
     buildCanonicalFinalResponses,
     resolveQuestionBootstrapState,
     resolveScoringProgress
   } from '../../src/features/test/test-question-client';

   // After
   import {
     resolveQuestionBootstrapState,
     resolveScoringProgress
   } from '../../src/features/test/test-question-client';
   ```

3. **Update answer-shape assertions** that currently assert `{ q1: 'A' }` or `{ q2: 'A' }` style keys:
   - Line 30: `expect(bootstrap.runtimeState.answers).toEqual({q1: 'A'})` →
     `toEqual({'1': 'A'})` (qmbti scoring1 has canonicalIndex 1)
   - Line 60: `expect(bootstrap.runtimeState.answers).toEqual({q1: 'B'})` →
     `toEqual({'1': 'B'})`
   - Line 80: `expect(bootstrap.runtimeState.answers).toEqual({q2: 'A'})` →
     `toEqual({'2': 'A'})` (egtt scoring1 has canonicalIndex 2, because q.1 is a profile row at index 1)
   - Line 97: `expect(bootstrap.runtimeState.answers).toEqual({})` — unchanged (already empty)

4. **`resolveScoringProgress` assertions** (lines 164–196): All `answers` arguments use `question.id` keys (`q1`, `q2`, etc.) that are fed directly to `resolveScoringProgress`. After Step 1, `resolveScoringProgress` will look up answers by canonical index string, so the test fixture answers must use canonical index keys too:
   - `{q1: 'A'}` → `{'1': 'A'}` (egtt q1 = profile, canonicalIndex 1)
   - `{q2: 'A'}` → `{'2': 'A'}` (egtt q2 = scoring1, canonicalIndex 2)
   - `{q1: 'A', q2: 'A', q3: 'B', q4: 'A'}` → `{'1': 'A', '2': 'A', '3': 'B', '4': 'A'}`
   - Same for the landing-ingress seeded progress assertions at lines 221–230.

#### Tests to add

None in this step. The deleted `buildCanonicalFinalResponses` test is not replaced because
the function is removed.

#### QA script impact

None. The QA script at `check-phase10-transition-contracts.mjs` does not check for
`buildCanonicalFinalResponses`.

#### Screenshot baseline impact

**No.** Answer-map keys are internal state; no rendered output changes.

#### Verification command

```
npm test -- tests/unit/test-question-bootstrap.test.ts
npm run typecheck
```

#### Rollback boundary

**Yes — independently revertable.** Revert scope: `test-question-client.tsx` (7 sites +
function removal) and `test-question-bootstrap.test.ts` (import + 4 assertion updates +
1 deleted test). No new files created.

---

### Step 2 — Tail Reset Invariant

#### Files changed

| File | What changes |
|---|---|
| `src/features/test/test-question-client.tsx` | `moveQuestion` body only |

#### Change description

Current `moveQuestion` when `direction === -1` decrements the index but leaves all answers
intact. Add an atomic answer filter inside the same `setRuntimeState` updater:

```typescript
const moveQuestion = (direction: -1 | 1) => {
  if (!started || !currentQuestion) {
    return;
  }

  settleCurrentQuestionDwell();
  setRuntimeState((previous) => {
    const nextIndex = Math.min(
      totalQuestions,
      Math.max(1, previous.currentQuestionIndex + direction)
    );

    if (direction === -1) {
      const filteredAnswers = Object.fromEntries(
        Object.entries(previous.answers).filter(([key]) => Number(key) < nextIndex)
      ) as Record<string, 'A' | 'B'>;
      return { ...previous, currentQuestionIndex: nextIndex, answers: filteredAnswers };
    }

    return { ...previous, currentQuestionIndex: nextIndex };
  });
};
```

The filter predicate `Number(key) < nextIndex` retains answers whose canonical index is
strictly less than the index we are navigating *to*. This means: answers for the current
question (about to be left) and all later questions are discarded; answers before the
destination are preserved.

**Clamp behavior**: If `previous.currentQuestionIndex === 1` and `direction === -1`, then
`nextIndex === 1` (clamped). The filter would retain only answers where `Number(key) < 1`,
which is an empty set — this is the no-op case for Q1. However, in practice the Prev
button is disabled when `currentQuestionIndex === 1` (see JSX line ~560), so the handler
is never invoked from Q1 via the UI.

**Dwell behavior**: `settleCurrentQuestionDwell()` runs before the state update,
accumulating dwell for the question being departed. Dwell is not rolled back; it remains in
`dwellByQuestionRef` for the discarded question per Decision 1.

#### Behavioral contract

**Observable behavior change: Yes** — answer keys beyond the destination index are now
cleared when the user navigates backward. Previously they were silently retained. This is
a bug fix; the req-test.md §3.9 tail-reset contract requires this cleanup. The progress
bar and `allAnswered` gate will reflect the reduced answer count immediately.

#### Tests to update

None. No existing test exercises `moveQuestion`.

#### Tests to add

These test cases should be written in the future
`tests/unit/use-test-run-controller.test.ts` (created in Step 4). Document them here so
the test author has a complete specification:

**Test: backward navigation discards tail answers**
- Setup: controller initialized with qmbti, Q3 active (`currentQuestionIndex = 3`),
  answers seeded as `{'1': 'A', '2': 'B', '3': 'A'}`.
- Action: call `moveQuestion(-1)`.
- Assertions:
  - `currentQuestionIndex` is `2`.
  - `answers` equals `{'1': 'A'}` — key `'2'` is dropped (it equals `nextIndex = 2`,
    which is not `< 2`) and key `'3'` is dropped.

**Test: backward navigation from Q1 is a no-op**
- Setup: Q1 active (`currentQuestionIndex = 1`), answers `{'1': 'A'}`.
- Action: call `moveQuestion(-1)`.
- Assertions: `currentQuestionIndex` remains `1`. `answers` unchanged (guard: the
  Prev button is disabled when at Q1, but the function clamping still ensures index stays
  at 1).

**Test: forward navigation does not touch answers**
- Setup: Q2 active, answers `{'1': 'A'}`.
- Action: call `moveQuestion(1)`.
- Assertions: `currentQuestionIndex` is `3`. `answers` equals `{'1': 'A'}` — unchanged.

#### QA script impact

None.

#### Screenshot baseline impact

**Inspect** — `theme-matrix-smoke.spec.ts` navigates forward only (recipe does not use
backward navigation). The tail-reset filter cannot affect those screenshots. No baseline
regeneration required.

#### Verification command

```
npm test
npm run typecheck
```

#### Rollback boundary

**Yes — independently revertable.** Revert scope: `moveQuestion` body in
`test-question-client.tsx` only (≈ 10 lines changed).

---

### Step 3 — `test:{variant}:responses` Write

#### Files changed

| File | What changes |
|---|---|
| `src/features/test/storage/response-set.ts` | Create (new file) |
| `src/features/test/test-question-client.tsx` | `updateAnswer` body — add `writeResponseSet` call |

#### Change description

**New file `src/features/test/storage/response-set.ts`:**

```typescript
import {testVariantKey} from '@/features/test/storage/test-storage-keys';

export function writeResponseSet(
  variantId: string,
  responses: Record<string, 'A' | 'B'>
): void {
  localStorage.setItem(testVariantKey.responseSet(variantId as never), JSON.stringify(responses));
}
```

The storage key `test:{variantId}:responses` is produced by the existing
`testVariantKey.responseSet(variantId)` helper in
`src/features/test/storage/test-storage-keys.ts` (line 16). The function uses
`localStorage.setItem` directly; it does not perform reads or merge.

**Note on the type cast**: `testVariantKey.responseSet` accepts `VariantId` (the branded
type from `src/features/test/domain`). The controller receives `variant: string` from the
client. Use a cast to `VariantId` or `never` only inside `writeResponseSet` to avoid
leaking the branded type requirement into the controller's parameter contract. The
alternative (making the controller accept `VariantId`) would require the client to perform
a validation-site cast, which is a larger scope change. Use the cast inside the helper
only.

**Wire-in in `updateAnswer`** — after the `setRuntimeState` call, call `writeResponseSet`:

```typescript
const updateAnswer = (choice: 'A' | 'B') => {
  if (!currentQuestion || submitted) {
    return;
  }

  const canonicalKey = String(currentQuestion.canonicalIndex);
  const newAnswers = { ...runtimeState.answers, [canonicalKey]: choice };
  setRuntimeState((previous) => ({
    ...previous,
    answers: { ...previous.answers, [canonicalKey]: choice }
  }));
  writeResponseSet(variant, newAnswers);
};
```

Because Step 2 already removes tail answers atomically inside `moveQuestion`'s
`setRuntimeState` updater, `updateAnswer` does not need to synchronize with any tail-reset
logic — the answer being written is always the current in-progress answer at the current
question index, and tail answers from a prior backward navigation have already been
removed.

**On reading stale state**: `runtimeState.answers` in the closure may be stale by one
render cycle in React's concurrent model. For the `writeResponseSet` call, compute
`newAnswers` from the last known `runtimeState.answers` plus the new entry, matching what
the functional updater inside `setRuntimeState` will produce. This keeps the written value
consistent with what the state will settle to.

#### Behavioral contract

**Observable behavior change: No** (additive). A new key is written to localStorage; no
existing read path consumes it yet (active-run resume read path is out of scope per
Prohibited Changes).

#### Tests to update

None.

#### Tests to add

In `tests/unit/use-test-run-controller.test.ts` (Step 4):

**Test: `updateAnswer` persists answers to localStorage**
- Setup: mock `localStorage`; initialize controller for `qmbti`, Q2 active,
  pre-seed answer `{'1': 'A'}` in state.
- Action: call `updateAnswer('B')`.
- Assertion: `localStorage.getItem('test:qmbti:responses')` equals
  `JSON.stringify({'1': 'A', '2': 'B'})`.

**Test: after `moveQuestion(-1)` tail reset, stored value drops tail keys**
- Setup: mock `localStorage`; Q3 active, answers `{'1': 'A', '2': 'B', '3': 'A'}`.
- Action: call `moveQuestion(-1)` (tail reset to Q2). Then call
  `updateAnswer('A')` (re-answer Q2).
- Assertion: `localStorage.getItem('test:qmbti:responses')` equals
  `JSON.stringify({'1': 'A', '2': 'A'})` (key `'3'` absent).

#### QA script impact

None.

#### Screenshot baseline impact

**No.** localStorage writes do not affect rendered output.

#### Verification command

```
npm test
npm run typecheck
```

#### Rollback boundary

**Yes — independently revertable.** Delete `src/features/test/storage/response-set.ts`
and remove the `writeResponseSet` call + import from `test-question-client.tsx`.

---

### Step 4 — Controller Extraction + Telemetry Relocation

#### Files changed

| File | What changes |
|---|---|
| `src/features/test/use-test-run-controller.ts` | Create (new file — all extracted logic) |
| `src/features/test/question-runtime-utils.ts` | Create (new file — relocated pure functions) |
| `src/features/test/test-question-client.tsx` | Remove extracted code; wire hook; remove `runtimeEntryCommittedRef` |
| `tests/unit/test-question-bootstrap.test.ts` | Update import paths for relocated pure functions |
| `tests/unit/use-test-run-controller.test.ts` | Create (new controller unit tests) |

#### Change description

**New file `src/features/test/question-runtime-utils.ts`**

Move these functions out of `test-question-client.tsx` as a group. They are pure
(no React imports, no side effects):

- `buildInitialRuntimeState`
- `findFirstScoringQuestion`
- `resolveInitialQuestionIndex`
- `resolveInitialAnswers`
- `hasSemanticAnswer`
- `resolveScoringProgress` (currently exported; re-export from here)
- `resolveQuestionBootstrapState` (currently exported; re-export from here)

The `QuestionRuntimeState`, `QuestionBootstrapState`, and `ScoringProgress` interfaces
move to this file as well (or to the controller file, whichever provides cleaner
co-location — prefer this utility file so the controller does not own types consumed by
tests importing from the utility module).

After relocation, `test-question-client.tsx` imports these from
`./question-runtime-utils`.

**Update import in `tests/unit/test-question-bootstrap.test.ts`:**

```typescript
// Before
import {
  resolveQuestionBootstrapState,
  resolveScoringProgress
} from '../../src/features/test/test-question-client';

// After
import {
  resolveQuestionBootstrapState,
  resolveScoringProgress
} from '../../src/features/test/question-runtime-utils';
```

**New file `src/features/test/use-test-run-controller.ts`**

This hook encapsulates all question-runtime state and handlers. See the
[`use-test-run-controller` interface (final)](#use-test-run-controller-interface-final)
section for the exact TypeScript interface.

**What moves into the controller** (exhaustive):

- `useState<QuestionRuntimeState>` (all of `runtimeState`)
- `useState` for `started`
- `useState` for `submitted`
- `dwellStartRef`, `dwellByQuestionRef`, `attemptStartedRef`, `bootstrapRuntimeStateRef`
- Internal `pendingTransitionToCompleteRef` (the `string | null` ref, exposed as
  `pendingTransitionId` + `clearPendingTransitionId`)
- Bootstrap `useEffect` (reads sessionStorage, calls `resolveQuestionBootstrapState`)
- `trackAttemptStart` effect (fires on `entryCommitted && runtimeState.ready`)
- `consumeLandingIngress(variant)` call (inside the attempt-start effect)
- `settleCurrentQuestionDwell`, `updateAnswer`, `moveQuestion`, `handleSubmit`
- `writeResponseSet` call (inside `updateAnswer`)
- All imports: `trackAttemptStart`, `trackFinalSubmit`, `consumeLandingIngress`,
  `writeResponseSet`, `readPendingLandingTransition`, `terminatePendingLandingTransition`,
  `readLandingIngress`, `hasSeenInstruction`, `resolveQuestionBootstrapState`, etc.
- All derived values: `currentQuestion`, `currentAnswer`, `allAnswered`,
  `scoringProgress`, `totalQuestions`

**The transition completion effect remains in the client:**

```typescript
// In test-question-client.tsx — watches controller's pendingTransitionId
useEffect(() => {
  if (!runtimeReady || pendingTransitionId === null) {
    return;
  }

  const expectedTransitionId = pendingTransitionId;
  const frame = window.requestAnimationFrame(() => {
    const completed = completePendingLandingTransition({ targetType: 'test' });
    if (completed?.transitionId === expectedTransitionId) {
      clearPendingTransitionId();
    }
  });

  return () => {
    window.cancelAnimationFrame(frame);
  };
}, [runtimeReady, pendingTransitionId, clearPendingTransitionId]);
```

**`runtimeEntryCommittedRef` elimination** (Decision 6):

Remove the ref declaration and all usages. In `executeInstructionAction`, replace:

```typescript
// Before
if (!effect.commitsRuntimeEntry || runtimeEntryCommittedRef.current) {
  return;
}
runtimeEntryCommittedRef.current = true;
setEntryCommitted(true);
```

With:

```typescript
// After
if (!effect.commitsRuntimeEntry || entryCommitted) {
  return;
}
setEntryCommitted(true);
```

`entryCommitted` is already listed in the `executeInstructionAction` `useCallback`
dependency array (implicitly via `runtimeState.ready` / `redirecting` which are in the
array — verify the dependency array and add `entryCommitted` explicitly if absent).

**`bootstrapRuntimeStateRef` guard** (Decision 5):

Preserve inside the controller with no structural change:

```typescript
// Inside the controller's bootstrap useEffect — identical guard pattern
if (bootstrapRuntimeStateRef.current) {
  queueMicrotask(() => {
    setRuntimeState(bootstrapRuntimeStateRef.current ?? buildInitialRuntimeState());
  });
  return;
}
```

**`attemptStartedRef` rationale** (must remain ref, not state):

`started` state is set via `queueMicrotask` (asynchronous). The attempt-start effect
reads `attemptStartedRef.current` synchronously within the same effect invocation to
prevent double-fire under React 18 Strict Mode double-invoke. Converting to state would
create a race window between the effect body and the microtask queue where a second effect
invocation could see `started === false` and fire again.

**`pendingTransitionToCompleteRef` internal storage**:

Inside the controller, the ref remains as before. The ref's `.current` value is surfaced
to the client by returning a stable pair:

```typescript
const pendingTransitionId = pendingTransitionToCompleteRef.current;
const clearPendingTransitionId = useCallback(() => {
  pendingTransitionToCompleteRef.current = null;
}, []);
```

Because the ref `.current` is read at render time and written inside effects, the client's
effect dependency on `pendingTransitionId` will re-run whenever the controller re-renders
with a new value.

**What remains in `test-question-client.tsx`:**

- `instructionSeen`, `entryCommitted`, `redirecting` `useState` calls
- `executeInstructionAction` + its `markInstructionSeen` / `clearLandingIngress` calls
- Auto-commit `useEffect`
- Transition completion `useEffect` (watches `pendingTransitionId` from controller)
- `setTelemetryConsentState` call
- All JSX rendering
- `entryPolicy` derivation (via `resolveTestEntryPolicy`)
- `isBooting`, `instructionVisible` derived booleans
- `landingPath` and `questions` memos
- Imports for `completePendingLandingTransition`, `clearLandingIngress`,
  `markInstructionSeen`, `resolveTestEntryPolicy`, `InstructionOverlay`, JSX-related hooks

#### Behavioral contract

**Observable behavior change: No.** The refactoring moves logic between files; the runtime
execution order and React hook call sequence within a component tree are unchanged. The
transition completion effect's dependency changes from `runtimeState.ready` to the
controller's `runtimeReady` value, which is derived from the same state.

#### Tests to update

**`tests/unit/test-question-bootstrap.test.ts`**: Update the import path for
`resolveQuestionBootstrapState` and `resolveScoringProgress` to
`../../src/features/test/question-runtime-utils` (as shown above).

#### Tests to add

Full test plan in the [Test Plan section](#test-plan-for-use-test-run-controllertest).
Minimum cases required before Step 4 is considered done:

- Initial state shape (direct entry and landing ingress)
- `updateAnswer` canonical key write
- `updateAnswer` `writeResponseSet` localStorage call
- `moveQuestion(1)` index increment, answers unchanged
- `moveQuestion(-1)` tail reset filter
- `moveQuestion(-1)` from Q1 no-op
- `handleSubmit` guard (`!started || !allAnswered`)
- `trackAttemptStart` fires exactly once under Strict Mode double-invoke
- `trackFinalSubmit` payload uses canonical index keys

#### QA script impact

See Step 5 for full QA script changes (lands atomically with this step).

#### Screenshot baseline impact

**No.** Pure logic extraction; all JSX rendering remains in the client component.

#### Verification command

```
npm run lint
npm run typecheck
npm test
npm run build
npm run qa:rules
```

#### Rollback boundary

**Partial** — Step 4 and Step 5 must be reverted together because Step 5 updates the QA
script to track the new file. If Step 4 is reverted alone, `npm run qa:rules` will fail
because it expects `use-test-run-controller.ts` to contain `consumeLandingIngress`. The
combined revert scope is: delete `use-test-run-controller.ts`, delete
`question-runtime-utils.ts`, restore `test-question-client.tsx` to pre-Step-4 state,
restore `test-question-bootstrap.test.ts` imports, restore `_path-config.mjs` and
`check-phase10-transition-contracts.mjs`.

---

### Step 5 — QA Script Update

**(Lands atomically with Step 4)**

#### Files changed

| File | What changes |
|---|---|
| `scripts/qa/_path-config.mjs` | Add `test` export group |
| `scripts/qa/check-phase10-transition-contracts.mjs` | Split the single test-client checker block into two blocks |

#### Change description

**`scripts/qa/_path-config.mjs`** — add at the end of the file:

```javascript
export const test = {
  questionClient: 'src/features/test/test-question-client.tsx',
  runController: 'src/features/test/use-test-run-controller.ts'
};
```

**`scripts/qa/check-phase10-transition-contracts.mjs`** — update the import and replace
the existing `test-question-client.tsx` block:

```javascript
// Updated import line
import {blog, e2e, landing, test, transition} from './_path-config.mjs';
```

Replace the current block at lines 44–58:

```javascript
if (fileExists('src/features/test/test-question-client.tsx')) {
  const questionClient = read('src/features/test/test-question-client.tsx');

  if (!/consumeLandingIngress/u.test(questionClient) || !/markInstructionSeen/u.test(questionClient)) {
    fail('Test question client must separate ingress read/consume and persist instructionSeen.');
  }

  if (!/trackAttemptStart/u.test(questionClient) || !/trackFinalSubmit/u.test(questionClient)) {
    fail('Test question client must emit attempt_start and final_submit.');
  }

  if (/fallbackTransitionId/u.test(questionClient) || /runtimeState\.transitionId/u.test(questionClient)) {
    fail('Test question client must not depend on fallback/runtime transitionId state.');
  }
}
```

With two separate blocks:

```javascript
// Block 1 — checks test-question-client.tsx (stays in client)
if (fileExists(test.questionClient)) {
  const questionClient = read(test.questionClient);

  if (!/markInstructionSeen/u.test(questionClient)) {
    fail('Test question client must persist instructionSeen on instruction action.');
  }

  if (/fallbackTransitionId/u.test(questionClient) || /runtimeState\.transitionId/u.test(questionClient)) {
    fail('Test question client must not depend on fallback/runtime transitionId state.');
  }
}

// Block 2 — checks use-test-run-controller.ts (moved telemetry and ingress)
if (fileExists(test.runController)) {
  const runController = read(test.runController);

  if (!/consumeLandingIngress/u.test(runController)) {
    fail('Test run controller must consume landing ingress on attempt start.');
  }

  if (!/trackAttemptStart/u.test(runController) || !/trackFinalSubmit/u.test(runController)) {
    fail('Test run controller must emit attempt_start and final_submit.');
  }
}
```

The `consumeLandingIngress` and `trackAttemptStart` / `trackFinalSubmit` checks move from
Block 1 to Block 2. The `markInstructionSeen` check stays in Block 1. The
`fallbackTransitionId` / `runtimeState.transitionId` absence check stays in Block 1
because `test-question-client.tsx` is still the file that previously contained the
transition ID state.

Also update the `requiredFiles` array at lines 6–16 to use the path-config reference:

```javascript
const requiredFiles = [
  transition.runtime,
  transition.signals,
  transition.hook,
  'src/features/landing/landing-runtime.tsx',
  test.questionClient,       // replaces the hardcoded path
  blog.destinationClient,
  landing.grid.mobileCardLifecycle,
  landing.grid.gridCardCss,
  e2e.transitionTelemetrySmoke
];
```

#### Behavioral contract

**Observable behavior change: No.** QA script logic only.

#### Tests to update

None.

#### Tests to add

None.

#### QA script impact

This step *is* the QA script change. After it lands, `npm run qa:rules` passes with both
blocks correctly guarding the new module boundary.

#### Screenshot baseline impact

**No.**

#### Verification command

```
npm run qa:rules
```

#### Rollback boundary

Revert together with Step 4 (see Step 4 rollback boundary above).

---

## `use-test-run-controller` Interface (final)

```typescript
import type {AppLocale} from '@/config/site';
import type {ResolvedQuestion} from '@/features/test/question-bank';
import type {ScoringProgress} from '@/features/test/question-runtime-utils';

interface TestRunControllerInput {
  variant: string;
  locale: AppLocale;
  /** Current pathname from `usePathname()` — used for telemetry event payload. */
  pathname: string;
  questions: ReadonlyArray<ResolvedQuestion>;
  /**
   * True when the user has committed to the runtime entry (accepted instruction or
   * auto-committed). The controller's attempt-start effect gates on this value.
   */
  entryCommitted: boolean;
}

interface TestRunControllerOutput {
  /** True once the bootstrap effect has resolved session/storage state. */
  runtimeReady: boolean;
  /**
   * True when the session was entered via a landing ingress (pre-answered Q1 path).
   * Used by the client to compute `entryPolicy`.
   */
  landingIngressFlag: boolean;
  /** 1-based index into the questions array for the currently displayed question. */
  currentQuestionIndex: number;
  /**
   * True once `trackAttemptStart` has fired and `started` state has settled.
   * Set via queueMicrotask; the Prev/Next/Submit buttons gate on this.
   */
  started: boolean;
  /** True once `handleSubmit` has successfully fired `trackFinalSubmit`. */
  submitted: boolean;
  /** The question object at `currentQuestionIndex`, or `null` if questions is empty. */
  currentQuestion: ResolvedQuestion | null;
  /**
   * The user's current answer for `currentQuestion`, keyed by canonical index.
   * `undefined` if not yet answered.
   */
  currentAnswer: 'A' | 'B' | undefined;
  /** True when every question in `questions` has an answer in the answers map. */
  allAnswered: boolean;
  scoringProgress: ScoringProgress;
  totalQuestions: number;
  /**
   * The transition ID that the client's completion effect must pass to
   * `completePendingLandingTransition`. Null when no transition is pending or after
   * completion. The client effect watches this value to trigger the rAF callback.
   */
  pendingTransitionId: string | null;
  /**
   * Clears `pendingTransitionId` after the client effect has successfully completed
   * the transition. Stable reference (useCallback with empty deps).
   */
  clearPendingTransitionId: () => void;
  /** Record the user's answer for the current question; no-op if already submitted. */
  updateAnswer: (choice: 'A' | 'B') => void;
  /**
   * Navigate to the adjacent question. When `direction === -1`, atomically removes
   * all answers at indices >= the destination index (tail reset per §3.9).
   */
  moveQuestion: (direction: -1 | 1) => void;
  /**
   * Guard: no-op unless `started && allAnswered`. Fires `trackFinalSubmit` and sets
   * `submitted`.
   */
  handleSubmit: () => void;
}
```

---

## `question-runtime-utils` Module Plan

All functions are pure (no React imports, no side effects).

| Function | Current location in `test-question-client.tsx` | Signature after relocation |
|---|---|---|
| `buildInitialRuntimeState` | Line ~82 | `(): QuestionRuntimeState` |
| `findFirstScoringQuestion` | Line ~91 | `(questions: ReadonlyArray<ResolvedQuestion>): ResolvedQuestion \| null` |
| `resolveInitialQuestionIndex` | Line ~95 | `(input: { landingIngressFlag: boolean; questions: ReadonlyArray<ResolvedQuestion> }): number` |
| `resolveInitialAnswers` | Line ~114 | `(input: { landingIngress: LandingIngressRecord \| null; questions: ReadonlyArray<ResolvedQuestion> }): Record<string, 'A' \| 'B'>` |
| `hasSemanticAnswer` | Line ~126 | `(answer: 'A' \| 'B' \| undefined): answer is 'A' \| 'B'` |
| `resolveScoringProgress` | Line ~143 (exported) | `(input: { questions: ReadonlyArray<ResolvedQuestion>; answers: Record<string, 'A' \| 'B'> }): ScoringProgress` |
| `resolveQuestionBootstrapState` | Line ~158 (exported) | `(input: { instructionSeen: boolean; landingIngress: LandingIngressRecord \| null; pendingTransition: PendingLandingTransition \| null; questions: ReadonlyArray<ResolvedQuestion>; variant: string }): QuestionBootstrapState` |

**Interfaces that move to this file:**
- `QuestionRuntimeState`
- `QuestionBootstrapState`
- `ScoringProgress`

The `test-question-bootstrap.test.ts` import is updated from
`test-question-client` to `question-runtime-utils` for `resolveQuestionBootstrapState`
and `resolveScoringProgress`.

---

## `response-set.ts` Module Plan

**File:** `src/features/test/storage/response-set.ts`

**Exported API:**

```typescript
/**
 * Writes the current in-progress response set to localStorage.
 * Key: test:{variantId}:responses (testVariantKey.responseSet)
 * Value: JSON-serialized Record<string, 'A' | 'B'> with canonical index keys.
 *
 * This is a write-only path. Reading for active-run resume is out of scope.
 */
export function writeResponseSet(
  variantId: string,
  responses: Record<string, 'A' | 'B'>
): void
```

**Storage key used:** `testVariantKey.responseSet(variantId)` →
`test:{variantId}:responses`

The key builder is defined in
`src/features/test/storage/test-storage-keys.ts` at line 16. `writeResponseSet` imports
this builder and applies a type cast to satisfy the `VariantId` branded type without
requiring callers to hold or validate a `VariantId` token.

---

## Test Plan for `use-test-run-controller.test.ts`

All tests use a test harness that renders the hook with `@testing-library/react`'s
`renderHook`. Mock `localStorage`, `trackAttemptStart`, `trackFinalSubmit`,
`consumeLandingIngress`, `writeResponseSet`, and session storage helpers at the module
boundary.

---

### T-01: Initial state shape — direct entry

**Setup:** `entryCommitted = false`, `landingIngress = null`.  
**Action:** Render hook; wait for bootstrap effect to settle.  
**Assertions:**
- `runtimeReady` is `true`.
- `landingIngressFlag` is `false`.
- `currentQuestionIndex` is `1`.
- `started` is `false`.
- `submitted` is `false`.
- `allAnswered` is `false`.
- `currentAnswer` is `undefined`.
- `pendingTransitionId` is `null`.

---

### T-02: Initial state shape — landing ingress

**Setup:** `entryCommitted = false`, mock `readLandingIngress('qmbti')` to return
`{ variant: 'qmbti', preAnswerChoice: 'A', ... }`.  
**Action:** Render hook; wait for bootstrap.  
**Assertions:**
- `landingIngressFlag` is `true`.
- `currentQuestionIndex` is `2` (skips to Q2 per ingress logic).
- `currentAnswer` for Q2 is `undefined` (Q2 not yet answered; seeded answer is for Q1).
- `answers` contains key `'1'` with value `'A'` (canonical index 1 = scoring1 for qmbti).

---

### T-03: `updateAnswer` — canonical key write

**Setup:** Bootstrap complete, Q2 active, `entryCommitted = true`, `started = true`.  
**Action:** Call `updateAnswer('B')`.  
**Assertions:**
- `currentAnswer` is `'B'`.
- Internal `runtimeState.answers` contains `{'2': 'B'}` (key `'2'` = canonicalIndex of Q2).
- No key uses the legacy `question.id` format.

---

### T-04: `updateAnswer` — `writeResponseSet` call

**Setup:** Mock `localStorage`; Q2 active, pre-existing answer `{'1': 'A'}`.  
**Action:** Call `updateAnswer('B')`.  
**Assertions:**
- `localStorage.getItem('test:qmbti:responses')` equals
  `JSON.stringify({'1': 'A', '2': 'B'})`.
- `writeResponseSet` was called exactly once with `('qmbti', {'1': 'A', '2': 'B'})`.

---

### T-05: `moveQuestion(1)` — forward navigation

**Setup:** Q1 active, answer `{'1': 'A'}`, `started = true`.  
**Action:** Call `moveQuestion(1)`.  
**Assertions:**
- `currentQuestionIndex` is `2`.
- `answers` still equals `{'1': 'A'}` — forward navigation does not discard answers.

---

### T-06: `moveQuestion(-1)` — tail reset filter

**Setup:** Q3 active, answers `{'1': 'A', '2': 'B', '3': 'A'}`, `started = true`.  
**Action:** Call `moveQuestion(-1)`.  
**Assertions:**
- `currentQuestionIndex` is `2`.
- `answers` equals `{'1': 'A'}`.
- Keys `'2'` and `'3'` are absent (key `'2'` equals `nextIndex`, not `< nextIndex`).

---

### T-07: `moveQuestion(-1)` from Q1 — no-op

**Setup:** Q1 active, answers `{'1': 'A'}`, `started = true`.  
**Action:** Call `moveQuestion(-1)`.  
**Assertions:**
- `currentQuestionIndex` remains `1`.
- `answers` is unchanged (`{'1': 'A'}`).

---

### T-08: `handleSubmit` guard — not started

**Setup:** `started = false`, all answers present.  
**Action:** Call `handleSubmit()`.  
**Assertions:**
- `submitted` remains `false`.
- `trackFinalSubmit` is not called.

---

### T-09: `handleSubmit` guard — not all answered

**Setup:** `started = true`, only 7 of 8 qmbti questions answered.  
**Action:** Call `handleSubmit()`.  
**Assertions:**
- `submitted` remains `false`.
- `trackFinalSubmit` is not called.

---

### T-10: `trackAttemptStart` fires exactly once under Strict Mode

**Setup:** Render hook with React 18 Strict Mode (effects fire twice). `entryCommitted`
changes from `false` to `true` after mount.  
**Action:** Flip `entryCommitted` to `true`; wait for effects.  
**Assertions:**
- `trackAttemptStart` is called exactly **once**, not twice.
- `attemptStartedRef.current` prevents the second invocation.

---

### T-11: `trackFinalSubmit` — canonical index keys in payload

**Setup:** All 8 qmbti questions answered with canonical index keys
(`{'1': 'A', '2': 'B', ..., '8': 'A'}`). `started = true`, `allAnswered = true`.  
**Action:** Call `handleSubmit()`.  
**Assertions:**
- `trackFinalSubmit` is called once.
- The `finalResponses` field in the call payload equals
  `{'1': 'A', '2': 'B', ..., '8': 'A'}` — canonical index keys, no `q`-prefixed keys.
- `submitted` becomes `true`.

---

### T-12: `pendingTransitionId` is surfaced correctly

**Setup:** Mock `readPendingLandingTransition` to return a matching pending transition
with `transitionId: 'tid-123'`.  
**Action:** Render hook; wait for bootstrap.  
**Assertions:**
- `pendingTransitionId` is `'tid-123'`.
- After calling `clearPendingTransitionId()`, `pendingTransitionId` becomes `null` on
  the next render.

---

## Prohibited Changes

The following must **not** change as part of this refactoring:

- `src/features/test/entry-policy.ts` — no changes.
- `src/features/test/instruction-overlay.tsx` — no changes.
- All files under `src/features/test/domain/` — no changes.
- Delayed auto-advance logic — do not introduce.
- Telemetry payload semantics — `trackAttemptStart` and `trackFinalSubmit` call sites
  may move files but payload shape and field values must be byte-for-byte identical.
- Active-run resume read path — `response-set.ts` is write-only; do not add
  `readResponseSet` or any read/hydration logic in this refactoring.
- Phase-integrated reducer — do not introduce.
- `docs/req-test-plan.md` Phase roadmap — no changes.
- `src/features/test/storage/active-run.ts` — `writeResponseSet` must not be added here.
- Any file not listed in the "Files to change" table in the Confirmed Scope section.

---

## Completion Criteria

- [ ] `npm run lint` passes with no errors.
- [ ] `npm run typecheck` passes with no errors.
- [ ] `npm test` passes — all existing unit tests and all new controller tests in
  `tests/unit/use-test-run-controller.test.ts`.
- [ ] `npm run build` passes.
- [ ] `npm run qa:rules` passes all 12 checks, including the updated
  Phase 10 transition contracts check with the new two-block structure.
- [ ] `tests/unit/test-question-bootstrap.test.ts` passes with updated import paths
  (`question-runtime-utils`) and canonical index answer-shape assertions (`'1': 'A'`
  instead of `q1: 'A'`). The `buildCanonicalFinalResponses` test case is absent.
- [ ] `tests/unit/use-test-run-controller.test.ts` passes all 12 new test cases (T-01
  through T-12).
- [ ] `theme-matrix-smoke.spec.ts` screenshot baselines are unaffected — no regeneration
  required. Verify by running `npm run test:e2e -- theme-matrix` and confirming zero
  diff pixels.
- [ ] `consent-smoke.spec.ts` passes without any changes to the spec file.
