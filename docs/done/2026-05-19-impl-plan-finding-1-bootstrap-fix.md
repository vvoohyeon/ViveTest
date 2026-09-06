# Finding 1 Bootstrap Fix Implementation Plan

> Status: pending approval. Implementation must not begin until this plan is approved.

**Goal:** Preserve raw qualifier tokens during Strict Mode cached active-run resume replay and make `useTestRunBootstrap` easier to read through three named module-local blocks.

**Architecture:** Keep `resolveQuestionBootstrapState()` pure and storage-free. Cache the reducer dispatch payload in `use-test-run-bootstrap.ts` with a hook-local `CachedBootstrapState`, so first-run bootstrap and cached replay dispatch the same raw `answers` payload while semantic prerequisite math still uses `buildBootstrapResponseSet()`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library `renderHook`, Playwright.

---

## Contract And Scope

- Task route: test flow / domain.
- Relevant SSOT contracts: `docs/req-test.md`, `docs/req-test-plan.md`.
- Project rules: `docs/agent-guides/project-rules.md` `#TestFlow`.
- Verification anchor: `docs/agent-guides/verification-commands.md` `#test-flow`.
- Primary directive: `docs/plans/codex-directive-finding-1-bootstrap-fix.md`.
- Supporting evidence only: `docs/plans/2026-05-19-use-test-run-bootstrap-replay-cache.md`.

## Bug Summary

`useTestRunBootstrap` has two bootstrap dispatch paths. The first execution computes `bootstrapAnswers` from the raw response set, so EGTT qualifier token `M` is dispatched into reducer state. The cached Strict Mode replay path instead dispatches `cachedBootstrapState.runtimeState.answers`, which came from `buildBootstrapResponseSet()` and may normalize the qualifier token to `A` for prerequisite math. The fix is to cache the raw reducer payload beside the pure bootstrap state and replay that cached raw payload.

## Impact Assessment

- Shared components, shell, GNB: no impact.
- Localization: no message or locale changes.
- A11y: no DOM, focus, or keyboard behavior change.
- State contracts: targeted change to `BOOTSTRAP_COMPLETE.answers` on the cached replay path.
- Core user flow: active-run resume for qualifier variants keeps raw qualifier tokens, so qualifier chip labels can resolve stored tokens instead of falling back to pending text.

## Approved Decisions

- Do not modify `src/features/test/question-runtime-utils.ts`.
- Do not add `bootstrapAnswers` to exported `QuestionBootstrapState`.
- Add a hook-local `CachedBootstrapState` wrapper in `src/features/test/use-test-run-bootstrap.ts`.
- Compute `bootstrapAnswers` inline in the effect body after `resolveQuestionBootstrapState()`.
- Extract exactly three module-local functions: `tryReplayFromCache`, `tryTerminateMismatchedTransition`, and `resolveBootstrapInputs`.
- Do not create new source or test files.
- Do not change the `useEffect` dependency array.
- Do not change `UseTestRunBootstrapParams`.
- Do not change `test-run-reducer.ts` or the `BOOTSTRAP_COMPLETE` action type.
- Add exactly one new regression test in `tests/unit/use-test-run-controller.test.ts`.

## Decisions Requiring User Confirmation

- No design decisions are open; the primary directive marks the hook-local cache design, exact named functions, test placement, dependency array, and docs correction as approved.
- The only required confirmation before source/test edits is approval of this plan.

## Files To Modify

- `src/features/test/use-test-run-bootstrap.ts`
  - Bug fix, local cache wrapper, named block extraction.
- `tests/unit/use-test-run-controller.test.ts`
  - Exactly one Strict Mode EGTT active-run resume regression test.
- `docs/req-test-plan.md`
  - Minimal correction for response-set value wording.

## Files To Read But Not Modify

- `src/features/test/question-runtime-utils.ts`
  - `QuestionBootstrapState`, `buildBootstrapResponseSet()`, `resolveQuestionBootstrapState()`.
- `src/features/test/test-run-reducer.ts`
  - `StoredAnswer`, `BOOTSTRAP_COMPLETE` payload shape, reducer copy behavior.
- `src/features/test/storage/active-run.ts`
  - `ActiveRun` export path and active-run metadata shape.
- `src/features/test/storage/response-set.ts`
  - `ResponseSet = Record<string, string>` and storage filtering behavior.
- `src/features/transition/store.ts`
  - `LandingIngressRecord`, pending transition reads, and current cross-namespace `instructionSeen` helpers.
- `docs/req-test.md`
  - Already states scoring responses are `A` / `B` and qualifier responses are schema tokens; no planned change unless implementation discovers drift.

## Verified Current Evidence

- `src/features/test/use-test-run-bootstrap.ts` is 136 lines.
- Branch A cached replay currently dispatches `answers: cachedBootstrapState.runtimeState.answers` at lines 51-64.
- Branch B currently computes raw `bootstrapAnswers` at lines 102-105 and dispatches it at line 119.
- `bootstrapStateRef` currently stores `QuestionBootstrapState | null` at line 48.
- Current dependency array is lines 125-135 and must remain unchanged.
- `QuestionBootstrapState` is exported from `question-runtime-utils.ts` lines 17-22 and must remain unchanged.
- `buildBootstrapResponseSet()` normalizes qualifier tokens to `A` for prerequisite math at `question-runtime-utils.ts` lines 155-174.
- `BOOTSTRAP_COMPLETE.answers` already accepts `Record<string, StoredAnswer>` at `test-run-reducer.ts` lines 19-28.
- `readResponseSet()` currently returns `ResponseSet = Record<string, string>` at `response-set.ts` lines 5 and 51-77.
- `docs/req-test-plan.md` line 286 and code sample line 306 still describe `readResponseSet()` as `A | B` only.
- `docs/req-test.md` lines 444-447 already contain the correct scoring `A` / `B` plus qualifier-token distinction.

## Structural Checklist

- [x] Current line count of `use-test-run-bootstrap.ts`: 136.
- [x] Estimated line count after change: about 220-240 lines.
- [x] Estimated line count remains below 500.
- [x] No new source files are created.
- [x] No new test files are created.
- [x] `question-runtime-utils.ts` remains untouched.
- [x] `UseTestRunBootstrapParams` remains unchanged; current code keeps it module-local.
- [x] `BOOTSTRAP_COMPLETE` action type definition remains unchanged.
- [x] The `useEffect` dependency array remains unchanged.

## Task 1: Add Failing Regression Test First

**Files:**
- Modify: `tests/unit/use-test-run-controller.test.ts` lines 6-8, 55-57, and immediately after lines 212-235.

- [ ] Add imports if missing.

Before:

```ts
import {asVariantId} from '../../src/features/test/domain';
import {buildVariantQuestionBank} from '../../src/features/test/question-bank';
import {useTestRunController} from '../../src/features/test/use-test-run-controller';
```

After:

```ts
import {asVariantId} from '../../src/features/test/domain';
import {buildQualifierOverlayModel} from '../../src/features/test/qualifier-overlay-model';
import {buildVariantQuestionBank} from '../../src/features/test/question-bank';
import {getSchemaForVariant} from '../../src/features/test/schema-registry';
import {useTestRunController} from '../../src/features/test/use-test-run-controller';
```

- [ ] Add EGTT qualifier fixture near the existing question fixtures.

Before:

```ts
const qmbtiQuestions = buildVariantQuestionBank('qmbti', 'en');
const egttQuestions = buildVariantQuestionBank('egtt', 'en');
```

After:

```ts
const qmbtiQuestions = buildVariantQuestionBank('qmbti', 'en');
const egttQuestions = buildVariantQuestionBank('egtt', 'en');
const egttSchema = getSchemaForVariant('egtt');
const egttQualifierItems = buildQualifierOverlayModel(egttSchema?.qualifierFields ?? [], egttQuestions);
```

- [ ] Add exactly one test immediately after `starts runtime from reducer commit and emits attempt_start exactly once under Strict Mode`.

```ts
it('preserves raw qualifier token in reducer state during Strict Mode cached active-run resume replay', async () => {
  vi.mocked(hasSeenInstruction).mockReturnValue(true);
  vi.mocked(getActiveRun).mockReturnValue({
    variantId: asVariantId('egtt'),
    startedAtMs: 100,
    lastAnsweredAtMs: 200
  });
  vi.mocked(readResponseSet).mockReturnValue({'1': 'M', '2': 'A'});

  const {result} = renderHook(
    () =>
      useTestRunController({
        ...makeInput(),
        variant: 'egtt',
        pathname: '/en/test/egtt',
        questions: egttQuestions,
        qualifierItems: egttQualifierItems
      }),
    {wrapper: StrictMode}
  );
  await flushMicrotasks();

  expect(result.current.runPhase).toBe('active');
  expect(result.current.currentQuestionIndex).toBeGreaterThanOrEqual(3);
  expect(result.current.answers['1']).toBe('M');
  expect(result.current.answers['2']).toBe('A');
  expect(result.current.answers['1']).not.toBe('A');
  expect(vi.mocked(trackAttemptStart)).not.toHaveBeenCalled();
});
```

- [ ] Run the focused test and verify RED before editing source.

```bash
npm test -- tests/unit/use-test-run-controller.test.ts \
  --reporter=verbose \
  -t "preserves raw qualifier token"
```

Expected result: FAIL on the `answers['1']` assertion because the cached replay path dispatches normalized answers.

## Task 2: Apply Cached Replay Payload Fix

**Files:**
- Modify: `src/features/test/use-test-run-bootstrap.ts` lines 1-23, 25-35 unchanged, 48-64, 102-123.

- [ ] Add only the needed type imports.

Before:

```ts
import {
  clearInstructionSeen,
  hasSeenInstruction,
  readLandingIngress,
  readPendingLandingTransition
} from '@/features/transition/store';
import {getActiveRun} from '@/features/test/storage/active-run';
import {readResponseSet} from '@/features/test/storage/response-set';
import type {TestRunAction} from '@/features/test/test-run-reducer';
```

After:

```ts
import {
  clearInstructionSeen,
  hasSeenInstruction,
  readLandingIngress,
  readPendingLandingTransition,
  type LandingIngressRecord
} from '@/features/transition/store';
import {getActiveRun, type ActiveRun} from '@/features/test/storage/active-run';
import {readResponseSet, type ResponseSet} from '@/features/test/storage/response-set';
import type {StoredAnswer, TestRunAction} from '@/features/test/test-run-reducer';
```

- [ ] Add local cache/input types below `UseTestRunBootstrapParams`.

```ts
type CachedBootstrapState = QuestionBootstrapState & {
  bootstrapAnswers: Record<string, StoredAnswer>;
};

interface BootstrapInputs {
  landingIngress: LandingIngressRecord | null;
  effectiveActiveRun: ActiveRun | null;
  effectiveResponseSet: ResponseSet | null;
  qualifierResumeIsValid: boolean;
  nextInstructionSeen: boolean;
}
```

- [ ] Change the ref type only.

Before:

```ts
const bootstrapStateRef = useRef<QuestionBootstrapState | null>(null);
```

After:

```ts
const bootstrapStateRef = useRef<CachedBootstrapState | null>(null);
```

- [ ] Store raw `bootstrapAnswers` in the ref before Branch B dispatch.

Before:

```ts
pendingTransitionIdRef.current = bootstrapState.pendingTransitionToComplete;
bootstrapStateRef.current = bootstrapState;
queueMicrotask(() => {
```

After:

```ts
pendingTransitionIdRef.current = bootstrapState.pendingTransitionToComplete;
bootstrapStateRef.current = {...bootstrapState, bootstrapAnswers};
queueMicrotask(() => {
```

- [ ] Change cached replay dispatch to use the cached raw reducer payload.

Before:

```ts
answers: cachedBootstrapState.runtimeState.answers,
```

After:

```ts
answers: cachedBootstrapState.bootstrapAnswers,
```

- [ ] Rerun the focused test and verify GREEN.

```bash
npm test -- tests/unit/use-test-run-controller.test.ts \
  --reporter=verbose \
  -t "preserves raw qualifier token"
```

Expected result: PASS.

## Task 3: Extract Three Named Module-Local Blocks

**Files:**
- Modify: `src/features/test/use-test-run-bootstrap.ts` current lines 50-88, preserving lines 90-123 as inline computation and dispatch.

- [ ] Extract cached replay into `tryReplayFromCache`.

```ts
function tryReplayFromCache(
  cached: CachedBootstrapState | null,
  dispatchRunAction: Dispatch<TestRunAction>,
  pendingTransitionIdRef: {current: string | null},
  onPendingTransitionIdChange: (id: string | null) => void
): boolean {
  if (!cached) {
    return false;
  }

  queueMicrotask(() => {
    dispatchRunAction({
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: cached.instructionSeen,
      landingIngressFlag: cached.runtimeState.landingIngressFlag,
      currentQuestionIndex: cached.runtimeState.currentQuestionIndex,
      answers: cached.bootstrapAnswers,
      autoCommitEntry: cached.entryMode === 'resume' && cached.instructionSeen,
      entryMode: cached.entryMode
    });
    onPendingTransitionIdChange(pendingTransitionIdRef.current);
  });

  return true;
}
```

- [ ] Extract mismatch termination into `tryTerminateMismatchedTransition`.

```ts
function tryTerminateMismatchedTransition(variant: string): void {
  const pendingTransition = readPendingLandingTransition();
  if (!pendingTransition || (pendingTransition.targetType === 'test' && pendingTransition.variant === variant)) {
    return;
  }

  terminatePendingLandingTransition({
    signal: 'transition_fail',
    resultReason: 'DESTINATION_LOAD_ERROR'
  });
}
```

- [ ] Extract storage/input reads into `resolveBootstrapInputs`.

```ts
function resolveBootstrapInputs(
  variant: string,
  variantId: VariantId,
  qualifierItems: ReadonlyArray<QualifierOverlayItem>
): BootstrapInputs {
  const landingIngress = readLandingIngress(variant);
  const activeRun = landingIngress ? null : getActiveRun(variantId);
  const responseSet = activeRun ? readResponseSet(variant) : null;
  const qualifierResumeIsValid = activeRun ? hasValidQualifierAnswers(qualifierItems, responseSet ?? {}) : true;

  return {
    landingIngress,
    effectiveActiveRun: qualifierResumeIsValid ? activeRun : null,
    effectiveResponseSet: qualifierResumeIsValid ? responseSet : null,
    qualifierResumeIsValid,
    nextInstructionSeen: hasSeenInstruction(variant)
  };
}
```

- [ ] Rewrite the `useEffect` body as a linear sequence.

Before:

```ts
if (bootstrapStateRef.current) {
  // inline cached replay
}

const pendingTransition = readPendingLandingTransition();
// inline mismatch termination
const nextPendingTransition = readPendingLandingTransition();
const landingIngress = readLandingIngress(variant);
const activeRun = landingIngress ? null : getActiveRun(variantId);
const responseSet = activeRun ? readResponseSet(variant) : null;
// inline qualifier validation and cleanup
```

After:

```ts
if (
  tryReplayFromCache(
    bootstrapStateRef.current,
    dispatchRunAction,
    pendingTransitionIdRef,
    onPendingTransitionIdChange
  )
) {
  return;
}

tryTerminateMismatchedTransition(variant);
const nextPendingTransition = readPendingLandingTransition();
const inputs = resolveBootstrapInputs(variant, variantId, qualifierItems);
let nextInstructionSeen = inputs.nextInstructionSeen;

if (!inputs.qualifierResumeIsValid) {
  volatilizeRunData(variantId, 'restart');
  nextInstructionSeen = false;
}

const bootstrapResponseSet = inputs.effectiveResponseSet
  ? buildBootstrapResponseSet(inputs.effectiveResponseSet, qualifierItems)
  : null;
const bootstrapState = resolveQuestionBootstrapState({
  activeRun: inputs.effectiveActiveRun,
  instructionSeen: nextInstructionSeen,
  landingIngress: inputs.landingIngress,
  pendingTransition: nextPendingTransition,
  questions,
  responseSet: bootstrapResponseSet,
  variant
});
```

- [ ] Keep `bootstrapAnswers` inline after `resolveQuestionBootstrapState()`.

```ts
const bootstrapAnswers =
  bootstrapState.entryMode === 'resume' && inputs.effectiveResponseSet
    ? inputs.effectiveResponseSet
    : bootstrapState.runtimeState.answers;
```

- [ ] Keep stale instruction cleanup inline and add only this short cross-namespace comment.

```ts
if (nextInstructionSeen && !bootstrapState.instructionSeen) {
  // Cross-namespace: key owned by landing storage, semantically test-domain.
  // Per SSOT volatility rules (docs/req-test.md). Do not move without updating all import sites.
  clearInstructionSeen(variant);
}
```

- [ ] Keep the dependency array unchanged.

```ts
[
  dispatchRunAction,
  locale,
  onPendingTransitionIdChange,
  pathname,
  pendingTransitionIdRef,
  qualifierItems,
  questions,
  variant,
  variantId
]
```

- [ ] Run the broader unit suite for the edited hook and adjacent contracts.

```bash
npm test -- \
  tests/unit/use-test-run-controller.test.ts \
  tests/unit/test-question-bootstrap.test.ts \
  tests/unit/qualifier-resume-validator.test.ts \
  --reporter=verbose
```

Expected result: all PASS, no new failures.

## Task 4: Minimal Docs Correction

**Files:**
- Modify: `docs/req-test-plan.md` lines 285-306.
- Read only: `docs/req-test.md` lines 444-447.

- [ ] Replace the current A/B-only response-set wording.

Before:

```md
- `test:{variant}:responses`에 canonical index keyed answers를 run 도중 write하고, `readResponseSet()`이 positive integer canonical key와 `A | B` semantic value만 읽는다.
```

After:

```md
- `test:{variant}:responses`에 canonical index keyed answers를 run 도중 write하고, `readResponseSet()`이 positive integer canonical key와 string value를 읽는다. scoring question 응답은 semantic `A` / `B`이고, qualifier question 응답은 qualifier overlay가 commit한 raw token(예: `M`, `F`)이다. `buildBootstrapResponseSet()`은 prerequisite 판정을 위해 qualifier token을 `A`로 정규화하지만 reducer state는 chip label resolution을 위해 raw token을 유지한다.
```

- [ ] Update the code sample response-set type.

Before:

```ts
responseSet: Record<string, 'A' | 'B'> | null; // readResponseSet(variant) 결과. null = missing/malformed/empty
```

After:

```ts
responseSet: Record<string, string> | null; // readResponseSet(variant) 결과. null = missing/malformed/empty
```

- [ ] Do not edit `docs/req-test.md` unless implementation discovers new drift. Current lines 444-447 already state the correct scoring and qualifier-token distinction.

## Verification Sequence

Run these commands in this exact order during implementation.

### Step 1: Add failing regression test first

```bash
npm test -- tests/unit/use-test-run-controller.test.ts \
  --reporter=verbose \
  -t "preserves raw qualifier token"
```

Expected result: FAIL on `answers['1']` assertion.

### Step 2: Apply source fix, rerun focused test

```bash
npm test -- tests/unit/use-test-run-controller.test.ts \
  --reporter=verbose \
  -t "preserves raw qualifier token"
```

Expected result: PASS.

### Step 3: Extract named blocks, rerun broader unit suite

```bash
npm test -- \
  tests/unit/use-test-run-controller.test.ts \
  tests/unit/test-question-bootstrap.test.ts \
  tests/unit/qualifier-resume-validator.test.ts \
  --reporter=verbose
```

Expected result: all PASS, no new failures.

### Step 4: Basic gates

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected result: all PASS, zero errors or warnings added by this change.

### Step 5: Test-flow scope checks

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

Expected result: all PASS.

### Step 6: E2E smoke

```bash
npx playwright test tests/e2e/qualifier-overlay.spec.ts --reporter=list
```

Expected result: all PASS. Pay particular attention to `resume with valid qualifier in storage skips overlay entirely` and `resume with missing qualifier triggers fresh start and shows overlay`.

## Risk Notes

- Production vs Strict Mode impact: Branch B already dispatches raw `bootstrapAnswers` in the normal production path. The fix targets the cached replay path used by development Strict Mode and future route-context replays.
- Multiple qualifier fields: EGTT has one qualifier field, so the new test covers the current live qualifier variant. The helper is array-based, but multi-field qualifier variants remain uncovered by this single required test.
- `clearInstructionSeen` cross-namespace status: the helper is still exported from transition storage while semantically consumed by the test domain. This plan only adds a local comment where stale instruction state is cleared; it does not move ownership or address Finding 4.
- Response-set dual representation: `bootstrapResponseSet` stays semantic-normalized for prerequisite math, while `bootstrapAnswers` stays raw for reducer state. Do not collapse these without a new approved design.

## Approval Gate

Implementation must not begin until this plan is approved. The approved implementation should execute one task at a time, preserve the primary directive decisions, and stop for confirmation if any source evidence contradicts this plan.
