# Finding 2 Answer Handler Extraction Implementation Plan

> **For agentic workers:** implement only after explicit user approval. Use an inline, step-by-step execution flow; do not invoke parallel agents or automated multi-wave execution for this repo.

**Goal:** Extract `TestQuestionClient` answer-choice business logic into a dedicated `useAnswerHandler` hook with focused unit coverage, while keeping runtime behavior identical.

**Architecture:** `TestQuestionClient` keeps rendering, entry orchestration, qualifier display, and slide-direction state ownership. The new `useAnswerHandler` owns only answer-choice guards, persistence, `question_answered` telemetry, timer clearing, answer locking, and the stale-closure `submittedRef` pattern. `instructionVisible` stays in `test-question-client.tsx` but moves from an inline boolean expression to a module-local helper.

**Tech Stack:** Next.js 16, React 19 hooks, TypeScript strict mode, Vitest with `@testing-library/react`, Playwright for the qualifier-overlay E2E regression anchor.

**Relevant SSOT and Project Rules:**
- `docs/req-test.md` sections `3.6`, `4.3`, `9.1`, and `9.2`: instruction/qualifier visibility, scoring-only runtime panel, automatic answer advance, and `question_answered` telemetry semantics.
- `docs/req-test-plan.md` SD-1 and Gate C-2: `useAnswerLock` owns the 150 ms timer, delayed advance captures the clicked choice, and Phase 11 currently guards `question_answered` helper/call-site behavior.
- `docs/agent-guides/project-rules.md#TestFlow`: canonical test surface remains `src/features/test/**`; no unauthorized storage keys or domain API changes.
- `AGENTS.md` sections `5` and `8`: `qa:rules` is not directly wired to the visible GitHub Actions workflow, but it is maintained as the release-level reference pipeline and must not be left broken by this extraction.
- `docs/agent-guides/verification-commands.md#test-flow`: test-flow scope checks listed below.

**Implementation must not begin until this plan is approved.**

---

## Scope

### Files to create
- `src/features/test/use-answer-handler.ts`
  - New hook that encapsulates the answer-choice flow.
  - Owns the `submittedRef` stale-closure guard internally.
- `tests/unit/use-answer-handler.test.ts`
  - New self-contained unit test file with exactly six cases.

### Files to modify after approval
- `src/features/test/test-question-client.tsx`
  - Remove local `submittedRef` and sync effect.
  - Remove inline `handleAnswerChoice`.
  - Import and call `useAnswerHandler`.
  - Replace the inline `instructionVisible` expression with `resolveInstructionVisible`.
- `scripts/qa/_path-config.mjs`
  - Add a `test.answerHandler` path for `src/features/test/use-answer-handler.ts`.
- `scripts/qa/check-phase11-telemetry-contracts.mjs`
  - Re-home answer-choice guard and `trackQuestionAnswered` static checks from `test-question-client.tsx` to `use-answer-handler.ts`.
  - Keep the client-side `disabled={isAnswerLocked}` assertion on `test-question-client.tsx`.

### Files to read but not modify during implementation
- `src/features/test/use-answer-lock.ts`
- `src/features/telemetry/runtime.ts`
- `src/features/test/use-test-run-controller.ts`
- `src/features/test/question-runtime-utils.ts`
- `tests/e2e/qualifier-overlay.spec.ts`

### Files explicitly out of scope
- `src/features/test/use-test-run-bootstrap.ts`
- `src/features/test/use-test-run-controller.ts`
- `src/features/test/test-run-reducer.ts`
- `src/features/test/use-test-entry-orchestrator.ts`
- `src/features/test/use-answer-lock.ts`
- Overlay components
- Any file not listed in the create/modify scope above

## Current Source Confirmations

- `src/features/test/test-question-client.tsx` currently has 406 lines.
- `handleAnswerChoice` currently lives at `src/features/test/test-question-client.tsx:189`.
- `submittedRef` currently lives at `src/features/test/test-question-client.tsx:97`, and its sync effect is at `src/features/test/test-question-client.tsx:100`.
- `trackQuestionAnswered` is imported only for `handleAnswerChoice`; `rg` finds only the import at line 10 and the call at line 197 in `test-question-client.tsx`.
- `slideDirectionRef` is declared as `useRef<SlideDirection>('forward')` at `src/features/test/test-question-client.tsx:70`; the hook input must use the same `'forward' | 'backward'` direction domain.
- `useAnswerLock` exposes `lockAnswer: (onAdvance: () => void, delayMs?: number) => void`, plus `isAnswerLocked`, `unlockAnswer`, and `clearTimer`.
- `trackQuestionAnswered` accepts `{locale, route, variant, questionIndex, choice, dwellMs, landingIngressFlag}` and returns a `QuestionAnsweredEvent`.
- `useTestRunController` exposes `updateAnswer: (choice: SemanticAnswer) => void`, `moveQuestion: (direction: -1 | 1, choiceOverride?: SemanticAnswer) => void`, and `getCurrentDwellMs: () => number`.
- `useTestEntryOrchestrator` returns `overlayMode: 'entry' | 'reentry'`, so `resolveInstructionVisible` does not need a cast for `overlayMode`.
- `vitest.config.ts` maps `@/*` to `src/*`; tests may mock `@/features/telemetry/runtime` directly.

## Approval Points

### AP-1: Compile-safe `useAnswerHandler` call placement

The directive says to add the hook call immediately after `useAnswerLock`. That exact position cannot compile because these required inputs are declared later in the component:

- `isLastQuestion`
- `currentScoringQuestionOrdinal`
- `lastScoringCanonicalIndex`

Approved implementation should add `useAnswerHandler` only after all required inputs are declared, without moving existing hook calls. The safe placement is after the `lastScoringCanonicalIndex` `useMemo` block and before `qualifierChipLabel`. This preserves all existing hook calls in their current relative order and only inserts the new hook at the first compile-safe point.

Rejected alternative: move `lastScoringCanonicalIndex` above `useAnswerLock`. That would reorder an existing hook call and conflict with the directive to avoid hook-call reordering.

### AP-2: Release-level QA static anchor is in scope

Current CI inspection found one visible GitHub Actions workflow, `.github/workflows/sync.yml`, and it runs `npm run sync` only. It does not call `npm run qa:rules`, `npm run qa:static`, or `npm run qa:gate:*`.

However, project rules classify `npm run qa:rules` as the release-level reference pipeline. `scripts/qa/run-all.mjs` includes `check-phase11-telemetry-contracts.mjs`, and that script currently checks `test-question-client.tsx` for both:

- `submitted || isAnswerLocked`
- `trackQuestionAnswered({`

Both move to `use-answer-handler.ts` after this extraction, so leaving the QA script unchanged would make the release-level gate fail by construction. The implementation scope is therefore expanded to include the two QA files listed above.

### AP-3: React ref type import

The requested interface spells the ref as `React.MutableRefObject<'forward' | 'backward'>`, while the requested import list says not to import anything beyond `useEffect` and `useRef` from React. Local project hook style uses `import type {MutableRefObject} from 'react'`.

Approved implementation should use:

```typescript
import {useEffect, useRef, type MutableRefObject} from 'react';
```

and type the input as:

```typescript
slideDirectionRef: MutableRefObject<SlideDirection>;
```

This is type-only surface, has no runtime effect, and matches existing local hook patterns.

## Impact Assessment

- Shared components / shell / GNB: no impact. No shell, GNB, route, or layout files are touched.
- Localization: no copy changes and no message-file changes.
- A11y: answer buttons, disabled state, progress, and overlay props are unchanged.
- State contracts: answer selection still flows through `updateAnswer`; delayed auto-advance still flows through `lockAnswer`; `submittedRef` continues to prevent stale submitted state from advancing after submission.
- Core user flow: scoring answer selection, final-question timer clearing, previous navigation, qualifier reentry, and submit behavior must remain identical.
- Telemetry: `question_answered` payload timing and fields stay identical, but the call site moves from the component to the hook.
- QA release gate: Phase 11 static assertions must follow the extraction so `npm run qa:rules` remains green. This is an Ask First surface, now included by review feedback because the release-level gate would otherwise drift.
- Documentation: no documentation updates are planned beyond this implementation plan. If implementation reveals a current doc that explicitly says `trackQuestionAnswered` remains in `TestQuestionClient`, stop and request approval before editing unlisted docs.

## New Hook Interface

The hook should keep its public surface narrow. Interfaces may stay module-local unless tests need a type; tests can use `Parameters<typeof useAnswerHandler>[0]` or a local fixture return type instead of exporting the interfaces.

```typescript
import {useEffect, useRef, type MutableRefObject} from 'react';

import type {AppLocale} from '@/config/site';
import {trackQuestionAnswered} from '@/features/telemetry/runtime';
import type {ResolvedQuestion} from '@/features/test/question-bank';
import type {SemanticAnswer} from '@/features/test/test-run-reducer';

type SlideDirection = 'forward' | 'backward';

interface UseAnswerHandlerInput {
  // Current scoring runtime context. Null currentQuestion means no answer work is allowed.
  currentQuestion: ResolvedQuestion | null;
  submitted: boolean;
  isAnswerLocked: boolean;

  // Controller-owned persistence/navigation callbacks.
  updateAnswer: (choice: SemanticAnswer) => void;
  moveQuestion: (direction: -1 | 1, choiceOverride?: SemanticAnswer) => void;
  getCurrentDwellMs: () => number;

  // Telemetry context. The ordinal is scoring-order based, while canonicalIndex stays on the question.
  currentScoringQuestionOrdinal: number | null;
  lastScoringCanonicalIndex: number;
  locale: AppLocale;
  pathname: string;
  variant: string;
  landingIngressFlag: boolean;

  // Runtime state and answer-lock controls.
  started: boolean;
  isLastQuestion: boolean;
  clearTimer: () => void;
  lockAnswer: (onAdvance: () => void, delayMs?: number) => void;

  // Shared mutable slide direction owned by TestQuestionClient.
  slideDirectionRef: MutableRefObject<SlideDirection>;
  setSlideDirection: (direction: SlideDirection) => void;
}

interface UseAnswerHandlerOutput {
  handleAnswerChoice: (choice: SemanticAnswer) => void;
}
```

## Hook Pseudocode

The implementation body must preserve the current order of operations exactly: guard, persist answer, maybe emit telemetry, maybe clear timer, then maybe lock and auto-advance.

```typescript
export function useAnswerHandler({
  currentQuestion,
  submitted,
  isAnswerLocked,
  updateAnswer,
  currentScoringQuestionOrdinal,
  lastScoringCanonicalIndex,
  locale,
  pathname,
  variant,
  getCurrentDwellMs,
  landingIngressFlag,
  started,
  isLastQuestion,
  clearTimer,
  lockAnswer,
  slideDirectionRef,
  setSlideDirection,
  moveQuestion
}: UseAnswerHandlerInput): UseAnswerHandlerOutput {
  const submittedRef = useRef(submitted);

  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  function handleAnswerChoice(choice: SemanticAnswer) {
    if (!currentQuestion || submitted || isAnswerLocked) {
      return;
    }

    updateAnswer(choice);

    if (currentScoringQuestionOrdinal !== null && currentQuestion.canonicalIndex !== lastScoringCanonicalIndex) {
      trackQuestionAnswered({
        locale,
        route: pathname,
        variant,
        questionIndex: currentScoringQuestionOrdinal,
        choice,
        dwellMs: getCurrentDwellMs(),
        landingIngressFlag
      });
    }

    if (!started || submitted || isLastQuestion) {
      clearTimer();
      return;
    }

    lockAnswer(() => {
      if (!submittedRef.current) {
        slideDirectionRef.current = 'forward';
        setSlideDirection('forward');
        moveQuestion(1, choice);
      }
    });
  }

  return {handleAnswerChoice};
}
```

## `TestQuestionClient` Changes

### Import changes

Remove:

```typescript
import {useEffect, useMemo, useRef, useState} from 'react';
import {trackQuestionAnswered} from '@/features/telemetry/runtime';
```

Add:

```typescript
import {useMemo, useRef, useState} from 'react';
import {useAnswerHandler} from '@/features/test/use-answer-handler';
```

### Remove component-local stale-closure state

Remove the component-owned `submittedRef` and its sync effect:

```typescript
const submittedRef = useRef(submitted);

useEffect(() => {
  submittedRef.current = submitted;
}, [submitted]);
```

### Remove inline handler

Remove the complete inline `handleAnswerChoice(choice: 'A' | 'B')` function. No logic from this function should remain in `TestQuestionClient`.

### Add compile-safe hook call

Insert this after `lastScoringCanonicalIndex` is declared, before `qualifierChipLabel`:

```typescript
const {handleAnswerChoice} = useAnswerHandler({
  currentQuestion,
  submitted,
  isAnswerLocked,
  updateAnswer,
  currentScoringQuestionOrdinal,
  lastScoringCanonicalIndex,
  locale,
  pathname,
  variant,
  getCurrentDwellMs,
  landingIngressFlag,
  started,
  isLastQuestion,
  clearTimer,
  lockAnswer,
  slideDirectionRef,
  setSlideDirection,
  moveQuestion
});
```

This is the only planned deviation from the literal "after `useAnswerLock`" placement in the directive, because the literal placement cannot reference the later consts.

## `resolveInstructionVisible` Helper

Declare this module-local helper above `TestQuestionClient`, after the constants and before the component function:

```typescript
interface InstructionVisibleInput {
  overlayMode: 'entry' | 'reentry';
  isBooting: boolean;
  entryCommitted: boolean;
  redirecting: boolean;
  overlayStep: 'instruction' | number;
  instructionSeen: boolean;
  canAutoCommitAfterInstructionSeen: boolean;
  hasQualifierItems: boolean;
}

function resolveInstructionVisible(input: InstructionVisibleInput): boolean {
  if (input.overlayMode === 'reentry') return true;
  if (input.isBooting || input.entryCommitted || input.redirecting) return false;
  return (
    input.overlayStep !== 'instruction' ||
    !input.instructionSeen ||
    !input.canAutoCommitAfterInstructionSeen ||
    input.hasQualifierItems
  );
}
```

Replace the inline boolean expression with:

```typescript
const instructionVisible = resolveInstructionVisible({
  overlayMode,
  isBooting,
  entryCommitted,
  redirecting,
  overlayStep,
  instructionSeen,
  canAutoCommitAfterInstructionSeen: entryPolicy.canAutoCommitAfterInstructionSeen,
  hasQualifierItems: qualifierItems.length > 0
});
```

Confirmed type: `overlayMode` is returned from `useTestEntryOrchestrator` as `'entry' | 'reentry'`, so no cast is needed.

## Unit Test Plan

Create `tests/unit/use-answer-handler.test.ts` with:

- `// @vitest-environment jsdom`
- A single top-level `describe('useAnswerHandler', ...)`
- Exactly six `it(...)` cases
- No shared fixture files
- No nested `describe`
- No `waitFor`
- No `act` unless a concrete React warning appears during implementation

Use `vi.mock('@/features/telemetry/runtime', ...)` for `trackQuestionAnswered`. Use local fixture helpers inside the file:

```typescript
const scoringQuestion = {
  id: 'q2',
  canonicalIndex: 2,
  questionType: 'scoring',
  question: 'Question',
  poleA: 'E',
  poleB: 'T',
  answerA: 'Answer A',
  answerB: 'Answer B'
} satisfies ResolvedQuestion;
```

The default input fixture should set:

```typescript
{
  currentQuestion: scoringQuestion,
  submitted: false,
  isAnswerLocked: false,
  updateAnswer: vi.fn(),
  currentScoringQuestionOrdinal: 1,
  lastScoringCanonicalIndex: 10,
  locale: 'en',
  pathname: '/en/test/egtt',
  variant: 'egtt',
  getCurrentDwellMs: vi.fn(() => 200),
  landingIngressFlag: false,
  started: true,
  isLastQuestion: false,
  clearTimer: vi.fn(),
  lockAnswer: vi.fn(),
  slideDirectionRef: {current: 'forward'},
  setSlideDirection: vi.fn(),
  moveQuestion: vi.fn()
}
```

Required cases:

1. `does not call updateAnswer when submitted is true`
   - Setup: `submitted=true`, `isAnswerLocked=false`, valid current question.
   - Assert: `updateAnswer` not called, `trackQuestionAnswered` not called.

2. `does not call updateAnswer when isAnswerLocked is true`
   - Setup: `submitted=false`, `isAnswerLocked=true`, valid current question.
   - Assert: `updateAnswer` not called, `trackQuestionAnswered` not called.

3. `emits trackQuestionAnswered for a non-final scoring question`
   - Setup: `canonicalIndex=2`, `currentScoringQuestionOrdinal=1`, `lastScoringCanonicalIndex=10`, `started=true`, `isLastQuestion=false`.
   - Assert: `updateAnswer('B')`, one telemetry call with `questionIndex: 1` and `choice: 'B'`, one `lockAnswer` call.

4. `does not emit trackQuestionAnswered for the final scoring question`
   - Setup: `canonicalIndex=10`, `currentScoringQuestionOrdinal=8`, `lastScoringCanonicalIndex=10`, `started=true`, `isLastQuestion=true`.
   - Assert: `updateAnswer('A')`, no telemetry, `clearTimer` called, `lockAnswer` not called.

5. `calls lockAnswer with a callback when not last question and started`
   - Setup: `lockAnswer` immediately invokes the captured callback.
   - Assert: `moveQuestion(1, 'A')`, `setSlideDirection('forward')`, `slideDirectionRef.current === 'forward'`.

6. `lockAnswer callback does not call moveQuestion when submitted becomes true before callback fires`
   - Setup: initial `submitted=false`, `lockAnswer` captures the callback without invoking it.
   - Action: call `handleAnswerChoice('A')`, rerender with `submitted=true`, manually invoke captured callback.
   - Assert: `moveQuestion` not called.

## Execution Steps After Approval

### Task 1: Write failing unit tests

**Files:**
- Create: `tests/unit/use-answer-handler.test.ts`

Steps:
- [ ] Add the self-contained test file with the exact six cases above.
- [ ] Run:

```bash
npm test -- tests/unit/use-answer-handler.test.ts --reporter=verbose
```

Expected before hook implementation: failure because `src/features/test/use-answer-handler.ts` does not exist.

### Task 2: Implement `useAnswerHandler`

**Files:**
- Create: `src/features/test/use-answer-handler.ts`

Steps:
- [ ] Add the hook using the interface and pseudocode above.
- [ ] Run:

```bash
npm test -- tests/unit/use-answer-handler.test.ts --reporter=verbose
```

Expected after hook implementation: all six cases pass.

### Task 3: Wire `TestQuestionClient`

**Files:**
- Modify: `src/features/test/test-question-client.tsx`

Steps:
- [ ] Add `useAnswerHandler` import and remove `trackQuestionAnswered` import.
- [ ] Remove `useEffect` from the React import if no other `useEffect` remains.
- [ ] Remove component-local `submittedRef` and its sync effect.
- [ ] Add `resolveInstructionVisible` helper and replace the inline expression.
- [ ] Remove inline `handleAnswerChoice`.
- [ ] Insert the `useAnswerHandler` call at the compile-safe point after `lastScoringCanonicalIndex`.
- [ ] Do not change JSX structure, answer button props, Previous button logic, `qualifierChipLabel`, or any `useMemo` other than the import cleanup.

### Task 4: Re-home Phase 11 QA static assertions

**Files:**
- Modify: `scripts/qa/_path-config.mjs`
- Modify: `scripts/qa/check-phase11-telemetry-contracts.mjs`

Steps:
- [ ] Add `answerHandler` to the `test` path group:

```javascript
export const test = {
  questionClient: 'src/features/test/test-question-client.tsx',
  answerLock: 'src/features/test/use-answer-lock.ts',
  answerHandler: 'src/features/test/use-answer-handler.ts',
  runController: 'src/features/test/use-test-run-controller.ts',
  testRunBootstrap: 'src/features/test/use-test-run-bootstrap.ts',
  runReducer: 'src/features/test/test-run-reducer.ts',
  entryOrchestrator: 'src/features/test/use-test-entry-orchestrator.ts',
  entrySideEffects: 'src/features/test/use-entry-side-effects.ts'
};
```

- [ ] Add `test.answerHandler` to `requiredFiles` in `check-phase11-telemetry-contracts.mjs` next to `test.questionClient`.
- [ ] Keep the client check focused on UI lock wiring:

```javascript
if (fileExists(test.questionClient)) {
  const questionClient = read(test.questionClient);

  if (!/disabled=\{isAnswerLocked\}/u.test(questionClient)) {
    fail('Test question client must keep answer buttons disabled while the answer lock is active.');
  }
}
```

- [ ] Add a new hook check for the extracted business logic:

```javascript
if (fileExists(test.answerHandler)) {
  const answerHandler = read(test.answerHandler);

  if (!/submitted \|\| isAnswerLocked/u.test(answerHandler)) {
    fail('useAnswerHandler must keep submitted and answer-lock guard checks before updating answers.');
  }

  if (!/trackQuestionAnswered\(\{/u.test(answerHandler)) {
    fail('useAnswerHandler must emit question_answered from the answer choice call site.');
  }

  if (!/submittedRef\.current/u.test(answerHandler)) {
    fail('useAnswerHandler must keep the submittedRef stale-closure guard before auto-advance.');
  }
}
```

- [x] Run the targeted QA script:

```bash
node scripts/qa/check-phase11-telemetry-contracts.mjs
```

Expected: script exits 0.

Actual result (2026-05-19): `node scripts/qa/check-phase11-telemetry-contracts.mjs` exited 0 with
`Phase 11 telemetry contract checks passed.`

### Task 5: Run verification sequence

Run the complete sequence below in order. If any command fails, diagnose and fix only within the approved file scope. If the fix would require an out-of-scope file, stop and request approval.

## Structural Checklist

- [x] Starting line count of `test-question-client.tsx`: 406 lines.
- [x] Final line count of `test-question-client.tsx`: 413 lines. The component stays below the 500-line stop threshold.
- [x] Final line count of `use-answer-handler.ts`: 97 lines, above the 30-line minimum.
- [x] `trackQuestionAnswered` import should be removed from `test-question-client.tsx`; current inspection shows no other use site after extraction.
- [x] `slideDirectionRef` is declared with `useRef<SlideDirection>('forward')`; the hook input type must match the same `'forward' | 'backward'` domain via `MutableRefObject<SlideDirection>`.
- [x] `overlayMode` type matches `'entry' | 'reentry'` at the `resolveInstructionVisible` call site.
- [x] No new files other than `src/features/test/use-answer-handler.ts` and `tests/unit/use-answer-handler.test.ts`.
- [x] QA script edits are limited to `scripts/qa/_path-config.mjs` and `scripts/qa/check-phase11-telemetry-contracts.mjs`.
- [x] `use-test-run-bootstrap.ts` is not touched.
- [x] `test-run-reducer.ts` is not touched.

## Verification Sequence

### Step 1 - New unit tests, isolated

```bash
npm test -- tests/unit/use-answer-handler.test.ts --reporter=verbose
```

Expected: all 6 cases PASS.

### Step 2 - Adjacent controller test, no regression

```bash
npm test -- tests/unit/use-test-run-controller.test.ts --reporter=verbose
```

Expected: all existing cases PASS including the EGTT qualifier token replay case added in Finding 1.

### Step 3 - Basic gates

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: all PASS, zero new errors or warnings.

### Step 4 - Test-flow scope

```bash
npm test -- \
  tests/unit/test-domain-variant-validation.test.ts \
  tests/unit/test-domain-question-model.test.ts \
  tests/unit/test-domain-derivation.test.ts \
  tests/unit/test-domain-type-segment.test.ts \
  tests/unit/test-entry-policy.test.ts \
  tests/unit/test-question-bootstrap.test.ts \
  tests/unit/variant-question-bank.test.ts \
  tests/unit/test-lazy-validation.test.ts \
  tests/unit/schema-registry.test.ts \
  --reporter=verbose
```

Expected: all PASS.

### Step 5 - E2E

```bash
npx playwright test tests/e2e/qualifier-overlay.spec.ts --reporter=list
```

Expected: all 14 cases PASS. Pay particular attention to:

- `Continue on qualifier step closes overlay and shows test-question-panel`
- `first visible question after commit is a scoring question`
- `reentry confirm changes qualifier, clears scoring, restarts at first scoring question`

### Step 6 - Release-level QA rules

```bash
npm run qa:rules
```

Expected: all 12 QA checks PASS, including the re-homed Phase 11 telemetry contract check.

## Implementation Result (2026-05-19)

- Created `src/features/test/use-answer-handler.ts`; it owns the submitted/locked/current-question guard, answer persistence callback, non-final `question_answered` emission, timer clear path, answer lock callback, and stale-closure `submittedRef` guard.
- Created `tests/unit/use-answer-handler.test.ts` with the planned six cases. RED was confirmed first because `src/features/test/use-answer-handler.ts` did not exist; after implementation all six cases passed.
- Updated `src/features/test/test-question-client.tsx` to remove the local `submittedRef`, remove the inline `handleAnswerChoice`, call `useAnswerHandler` after `lastScoringCanonicalIndex`, and move `instructionVisible` into `resolveInstructionVisible`.
- Updated `scripts/qa/_path-config.mjs` and `scripts/qa/check-phase11-telemetry-contracts.mjs` so Phase 11 keeps the UI `disabled={isAnswerLocked}` assertion on the client and checks answer-handler business logic in `use-answer-handler.ts`.
- Updated `docs/agent-guides/project-rules.md` so the current `question_answered` firing location matches `use-answer-handler.ts`.

Verification evidence:

- `npm test -- tests/unit/use-answer-handler.test.ts --reporter=verbose` — 6 passed.
- `npm test -- tests/unit/use-test-run-controller.test.ts --reporter=verbose` — 18 passed.
- `npm run lint` — passed with no warnings after removing an unused test type import.
- `npm run typecheck` — passed after `next typegen` completed.
- `npm test` — 73 files / 479 tests passed.
- `npm run build` — passed.
- Test-flow scope unit command — 9 files / 81 tests passed.
- `npx playwright test tests/e2e/qualifier-overlay.spec.ts --reporter=list` — 14 passed; existing `NO_COLOR`/`FORCE_COLOR` warnings appeared with exit 0.
- `npm run qa:rules` — all 12 QA checks passed, including Phase 11.

## Risk Notes

### Stale-closure regression risk

The hook must own the same stale-closure guard currently in the component:

```typescript
const submittedRef = useRef(submitted);

useEffect(() => {
  submittedRef.current = submitted;
}, [submitted]);
```

The dependency array must be exactly `[submitted]`. Case 6 fails if the ref does not update when the hook rerenders with `submitted=true`.

### `lockAnswer` callback captures `choice`

The `choice` parameter is intentionally captured by the callback passed to `lockAnswer`. Extraction must preserve that closure. The hook must call `moveQuestion(1, choice)` inside the callback and must not read `currentAnswer` or any later state to decide the advance choice.

### `currentScoringQuestionOrdinal` null guard

Telemetry emission must keep the exact guard:

```typescript
currentScoringQuestionOrdinal !== null
```

Do not replace it with a truthiness check. A truthiness check would incorrectly suppress a valid ordinal if the representation ever changed to `0`, and it would make the guard less exact than the current contract.

### `slideDirectionRef` mutability

`slideDirectionRef` remains owned by `TestQuestionClient` and is passed into the hook by reference. The hook and the Back button must mutate the same ref object. Do not create an independent ref inside `useAnswerHandler` for slide direction.

### `trackQuestionAnswered` import removal

After extraction, the component must no longer import `trackQuestionAnswered`. The hook owns that import. Leaving it in `test-question-client.tsx` creates an unused import and should fail lint.

### `resolveInstructionVisible` input type

`overlayMode` is currently typed as `'entry' | 'reentry'` by `useTestEntryOrchestrator`, so the helper input can use that exact union. No narrowing cast is planned.

### QA script drift

`qa:rules` is not directly called by the visible GitHub Actions workflow, but it is a documented release-level pipeline. The extraction must update `check-phase11-telemetry-contracts.mjs` so the static checks follow the new ownership:

- `test-question-client.tsx`: locked buttons remain disabled with `disabled={isAnswerLocked}`.
- `use-answer-handler.ts`: `submitted || isAnswerLocked` guard, `trackQuestionAnswered({` call, and `submittedRef.current` stale-closure guard.

## Explicit Non-Goals

- Do not extract `qualifierChipLabel`, `lastScoringCanonicalIndex`, `entryPolicy`, or any other `useMemo`.
- Do not extract JSX sections into sub-components.
- Do not modify `useTestEntryOrchestrator`.
- Do not modify `useAnswerLock`.
- Do not modify `use-test-run-bootstrap.ts`.
- Do not modify `test-run-reducer.ts`.
- Do not change `TestRunControllerOutput`.
- Do not add external packages.
- Do not change runtime behavior, data attributes, visible labels, or E2E-visible contracts.
- Do not begin implementation until this plan is approved.
