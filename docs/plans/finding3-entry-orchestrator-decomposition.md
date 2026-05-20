# Finding 3 Entry Orchestrator Decomposition Plan

**Goal:** Decompose `useTestEntryOrchestrator` by inlining the current entry side-effect hook and extracting the logic inside `executeInstructionAction` into four non-exported module-level helpers, with no observable behavior change.

**Architecture:** `useTestEntryOrchestrator` remains the single runtime entry adapter for instruction CTA execution, qualifier wizard progression, redirect-home routing, reentry commit, fresh entry commit, and auto-commit wiring. The refactor removes a single-consumer hook (`useEntrySideEffects`) and keeps the new helper functions private to `src/features/test/use-test-entry-orchestrator.ts`, so the public hook API and existing tests stay unchanged.

**Tech Stack:** Next.js 16 / React 19 hook code, TypeScript 5.9, Vitest unit coverage, existing Node-based QA scripts.

---

## Startup And Routing Evidence

- Root `AGENTS.md` was read. This task is test-flow/domain work and routes to `docs/req-test.md`, `docs/req-test-plan.md`, `docs/agent-guides/project-rules.md §TestFlow`, and `docs/agent-guides/verification-commands.md §test-flow`.
- `.planning/STATE.md` does not exist, so there is no saved task state to restore.
- No child `AGENTS.md` files exist under the repository, so root `AGENTS.md` is the only project-specific instruction layer.
- `package.json` confirms `npm test` runs `vitest run`, `npm run typecheck` runs `npm run typegen && tsc --noEmit`, and `npm run qa:rules` runs `node scripts/qa/run-all.mjs`.
- `next.config.ts`, `playwright.config.ts`, and `src/config/site.ts` were checked for current flags and locale/runtime assumptions before specifying validation commands.

## Relevant Contracts

- `docs/req-test.md` states that `instructionSeen` is recorded immediately after Start-family CTA execution, qualifier variants must not auto-commit from `instructionSeen` alone, reentry confirm preserves only qualifier answers and resets scoring answers, and `instructionSeen` reset policy remains governed by §6.8.
- `docs/req-test-plan.md` currently says `useTestEntryOrchestrator` owns CTA action interpretation and composes the qualifier wizard, entry side effects, and auto-commit hook, with consent writes, `markInstructionSeen`, and redirect-home cleanup executed through `useEntrySideEffects`.
- `docs/agent-guides/project-rules.md §TestFlow` keeps `instructionSeen` as a variant-scoped sessionStorage key and preserves the legacy external key boundary until a separate migration.
- `scripts/qa/*.mjs` is an Ask First surface. Implementation must wait for explicit approval of this plan before editing `scripts/qa/_path-config.mjs`.

## Files To Modify

### Modify: `src/features/test/use-test-entry-orchestrator.ts`

Current responsibilities:
- imports `useEntrySideEffects`;
- calls `useEntrySideEffects({variant})` to obtain three callbacks;
- keeps the full `executeInstructionAction` decision tree inline.

Planned changes:
- remove the `useEntrySideEffects` import;
- add direct imports:

```ts
import {setTelemetryConsentState} from '@/features/telemetry/consent-source';
import {clearLandingIngress, markInstructionSeen} from '@/features/transition/store';
```

- import `TestInstructionActionEffect` as a type from `@/features/test/entry-policy` because helper parameter interfaces need the effect shape:

```ts
import type {
  TestEntryPolicy,
  TestInstructionAction,
  TestInstructionActionEffect
} from '@/features/test/entry-policy';
```

- add four private module-level helpers above `useTestEntryOrchestrator`;
- rewrite `executeInstructionAction` as a linear sequence of calls to those helpers;
- update the `useCallback` dependency array by removing stale side-effect callback dependencies and keeping direct imported functions out of the dependency array because they are module imports.

Expected behavior preservation:
- consent write still happens before redirect or commit decisions when `effect.writesConsent` is set;
- `markInstructionSeen(variant)` still happens before redirect or commit decisions when `effect.recordsInstructionSeen && !instructionSeen`;
- redirect-home still resets wizard, dispatches `REDIRECT_HOME`, conditionally clears landing ingress, calls `router.replace`, and returns;
- qualifier progression still blocks commit until required tokens exist;
- reentry still writes qualifier-only responses, resets scoring answers, and resets wizard without dispatching `COMMIT_ENTRY`;
- fresh entry still dispatches `COMMIT_ENTRY`, conditionally writes qualifier answers, and resets wizard.

### Delete: `src/features/test/use-entry-side-effects.ts`

Current file:
- wraps `setTelemetryConsentState`, `markInstructionSeen`, and `clearLandingIngress` in three `useCallback` closures;
- has one production consumer: `use-test-entry-orchestrator.ts`.

Planned change:
- delete the file after inlining all three calls into `use-test-entry-orchestrator.ts`.

### Modify: `scripts/qa/_path-config.mjs`

Current `test` object includes:

```js
entryOrchestrator: 'src/features/test/use-test-entry-orchestrator.ts',
entrySideEffects: 'src/features/test/use-entry-side-effects.ts'
```

Planned change:

```js
entryOrchestrator: 'src/features/test/use-test-entry-orchestrator.ts'
```

No new replacement key is planned. `scripts/qa/check-phase10-transition-contracts.mjs` currently calls `fileExists(test.entrySideEffects)` before reading the hook; `fileExists(undefined)` is caught by the helper and returns `false`, so the obsolete hook check is skipped once the path key is removed. This keeps the QA script diff scoped to the user-requested file.

### Modify: `docs/req-test-plan.md`

Current line near 234 says:

```md
- `useTestEntryOrchestrator`가 CTA action 해석을 소유하고, qualifier wizard / entry side-effect / auto-commit hook을 조합한다. consent write, `markInstructionSeen`, redirect-home cleanup은 `useEntrySideEffects`를 통해 실행한다.
```

Planned replacement:

```md
- `useTestEntryOrchestrator`가 CTA action 해석을 소유하고, qualifier wizard / inline entry side-effect calls / auto-commit hook을 조합한다. consent write, `markInstructionSeen`, redirect-home cleanup은 별도 `useEntrySideEffects` hook 없이 orchestrator 내부에서 `setTelemetryConsentState`, `markInstructionSeen`, `clearLandingIngress` 직접 호출로 실행한다.
```

No other existing docs are planned for this Finding 3 scope.

## Files Not To Modify

- `tests/unit/use-test-entry-orchestrator.test.ts`
- `tests/unit/test-entry-orchestrator-qualifier.test.ts`
- `tests/unit/test-entry-orchestrator-reentry.test.ts`
- `src/features/test/use-auto-commit.ts`
- `src/features/test/use-qualifier-overlay-wizard.ts`
- `scripts/qa/check-phase10-transition-contracts.mjs`
- `docs/req-test.md`
- `docs/project-analysis.md`
- E2E files and screenshot baselines

## Helper Extraction Design

All helper functions will be non-exported and placed above `useTestEntryOrchestrator`.

### Helper A: `applyPreActionSideEffects`

Purpose: preserve the current Stage 1 consent write and instructionSeen mark before any routing or commit decision.

Planned interface:

```ts
interface ApplyPreActionSideEffectsInput {
  effect: TestInstructionActionEffect;
  instructionSeen: boolean;
  variant: string;
}
```

Planned function:

```ts
function applyPreActionSideEffects({
  effect,
  instructionSeen,
  variant
}: ApplyPreActionSideEffectsInput): void {
  if (effect.writesConsent) {
    setTelemetryConsentState(effect.writesConsent);
  }

  if (effect.recordsInstructionSeen && !instructionSeen) {
    markInstructionSeen(variant);
  }
}
```

Why this shape:
- it keeps the direct imports explicit at module scope;
- it keeps `variant` visible in the helper input rather than creating per-render closures;
- it matches the exact current conditions from `executeInstructionAction`.

### Helper B: `tryAdvanceQualifierStep`

Purpose: preserve Stage 3 qualifier wizard progression and early-return behavior.

Planned interface:

```ts
interface TryAdvanceQualifierStepInput {
  overlayStep: OverlayStepId;
  qualifierItems: ReadonlyArray<QualifierOverlayItem>;
  qualifierDraft: Record<number, string>;
  setOverlayStep: (next: OverlayStepId) => void;
}
```

Planned function:

```ts
function tryAdvanceQualifierStep({
  overlayStep,
  qualifierItems,
  qualifierDraft,
  setOverlayStep
}: TryAdvanceQualifierStepInput): boolean {
  if (overlayStep === 'instruction' && qualifierItems.length > 0) {
    setOverlayStep(0);
    return true;
  }

  if (typeof overlayStep === 'number') {
    const currentQualifierItem = qualifierItems[overlayStep];
    if (currentQualifierItem) {
      const selectedToken = qualifierDraft[currentQualifierItem.canonicalIndex];
      if (!selectedToken) {
        return true;
      }

      if (overlayStep < qualifierItems.length - 1) {
        setOverlayStep(overlayStep + 1);
        return true;
      }
    }
  }

  return false;
}
```

Return contract:
- `true` means the caller must return early because a step advanced or a guard blocked progression;
- `false` means the final qualifier step has enough data or no qualifier progression applies, so the caller may commit entry.

### Helper C: `executeReentryCommit`

Purpose: preserve Stage 4a qualifier reentry commit behavior.

Planned interface:

```ts
interface ExecuteReentryCommitInput {
  variant: string;
  qualifierItems: ReadonlyArray<QualifierOverlayItem>;
  buildQualifierAnswers: (
    qualifierItems: ReadonlyArray<QualifierOverlayItem>
  ) => Record<string, string>;
  resetScoringAnswers: (qualifierAnswers: Record<string, string>) => void;
  resetWizard: () => void;
}
```

Planned function:

```ts
function executeReentryCommit({
  variant,
  qualifierItems,
  buildQualifierAnswers,
  resetScoringAnswers,
  resetWizard
}: ExecuteReentryCommitInput): void {
  const qualifierOnlyResponses = buildQualifierAnswers(qualifierItems);
  resetScoringAnswers(qualifierOnlyResponses);
  writeResponseSet(variant, qualifierOnlyResponses);
  resetWizard();
}
```

Behavior boundary:
- no `COMMIT_ENTRY` dispatch;
- no scoring answers preserved;
- storage write remains through `writeResponseSet`.

### Helper D: `executeFreshEntryCommit`

Purpose: preserve Stage 4b fresh entry commit behavior.

Planned interface:

```ts
interface ExecuteFreshEntryCommitInput {
  variant: string;
  qualifierItems: ReadonlyArray<QualifierOverlayItem>;
  buildQualifierAnswers: (
    qualifierItems: ReadonlyArray<QualifierOverlayItem>
  ) => Record<string, string>;
  dispatchRunAction: Dispatch<TestRunAction>;
  effect: TestInstructionActionEffect;
  resetWizard: () => void;
}
```

Planned function:

```ts
function executeFreshEntryCommit({
  variant,
  qualifierItems,
  buildQualifierAnswers,
  dispatchRunAction,
  effect,
  resetWizard
}: ExecuteFreshEntryCommitInput): void {
  const qualifierAnswers = buildQualifierAnswers(qualifierItems);
  const hasQualifierAnswers = Object.keys(qualifierAnswers).length > 0;
  dispatchRunAction({
    type: 'COMMIT_ENTRY',
    recordsInstructionSeen: effect.recordsInstructionSeen,
    ...(hasQualifierAnswers ? {qualifierAnswers} : {})
  });

  if (hasQualifierAnswers) {
    writeResponseSet(variant, qualifierAnswers);
  }

  resetWizard();
}
```

Behavior boundary:
- `recordsInstructionSeen` continues to come from the action effect;
- `qualifierAnswers` is included only when non-empty;
- storage write still happens only when qualifier answers exist.

## `executeInstructionAction` Rewrite

Planned `useCallback` body shape:

```ts
const executeInstructionAction = useCallback(
  (action: TestInstructionAction) => {
    const effect = entryPolicy.effects[action];
    if (!runtimeReady || redirecting) {
      return;
    }

    applyPreActionSideEffects({
      effect,
      instructionSeen,
      variant
    });

    if (effect.redirectHome) {
      resetWizard();
      dispatchRunAction({type: 'REDIRECT_HOME'});
      if (landingIngressFlag) {
        clearLandingIngress(variant);
      }
      router.replace(landingPath as LocalizedRoutePath);
      return;
    }

    if (!effect.commitsRuntimeEntry) {
      return;
    }

    if (
      tryAdvanceQualifierStep({
        overlayStep,
        qualifierItems,
        qualifierDraft,
        setOverlayStep
      })
    ) {
      return;
    }

    if (overlayMode === 'reentry') {
      executeReentryCommit({
        variant,
        qualifierItems,
        buildQualifierAnswers,
        resetScoringAnswers,
        resetWizard
      });
      return;
    }

    executeFreshEntryCommit({
      variant,
      qualifierItems,
      buildQualifierAnswers,
      dispatchRunAction,
      effect,
      resetWizard
    });
  },
  [
    buildQualifierAnswers,
    dispatchRunAction,
    entryPolicy.effects,
    instructionSeen,
    landingIngressFlag,
    landingPath,
    overlayMode,
    overlayStep,
    qualifierDraft,
    qualifierItems,
    redirecting,
    resetScoringAnswers,
    resetWizard,
    router,
    runtimeReady,
    setOverlayStep,
    variant
  ]
);
```

Stale dependencies removed:
- `applyConsentEffect`
- `applyInstructionSeenEffect`
- `applyLandingIngressClearEffect`

No new function dependencies are added for `setTelemetryConsentState`, `markInstructionSeen`, or `clearLandingIngress` because they are stable module imports.

## Expected File-Level Diff Summary

| File | Planned action | Expected diff |
|:---|:---|:---|
| `src/features/test/use-test-entry-orchestrator.ts` | Modify | Remove `useEntrySideEffects` import and call; add direct imports for consent/transition functions; add `TestInstructionActionEffect` type import; add four private helper interfaces/functions; rewrite `executeInstructionAction` into helper-call sequence; update dependency array. |
| `src/features/test/use-entry-side-effects.ts` | Delete | Remove obsolete 39-line single-consumer hook file. |
| `scripts/qa/_path-config.mjs` | Modify | Remove `entrySideEffects` key from the `test` object; keep `entryOrchestrator`. |
| `docs/req-test-plan.md` | Modify | Update the SD-1 current-structure bullet to say entry side effects are now direct inline calls inside `useTestEntryOrchestrator`. |
| tests | No change | Existing orchestrator tests continue mocking `@/features/telemetry/consent-source`, `@/features/transition/store`, and `@/features/test/storage/response-set`; no mock path updates planned. |

Net file count: `-1` source file (`use-entry-side-effects.ts` deleted, no new source files added).

## Impact Assessment

- Shared components / shell / GNB: no impact. No shell, GNB, layout, or route files are touched.
- Localization: no impact. No messages or locale-owned CTA text changes.
- A11y: no impact. Overlay UI and focus behavior are unchanged.
- Responsiveness / design system consistency: no impact. No CSS, layout, or visual surface changes.
- State contracts: behavior-preserving refactor only. `instructionSeen`, consent state, landing ingress clearing, qualifier draft progression, response set writes, reducer actions, and router replacement must fire at the same points and under the same conditions.
- Core user flow: no intended change. Start, consent-bearing start, deny/abandon redirect, qualifier wizard progression, qualifier reentry confirm/cancel, and auto-commit for non-qualifier variants remain covered by existing tests.
- QA contract: `_path-config.mjs` no longer references the deleted hook. The Phase 10 script's existing guarded check for `test.entrySideEffects` becomes a no-op for that obsolete path; no broader QA-script rewrite is planned in Finding 3.

## Implementation Units After Approval

### Unit 1: Inline `useEntrySideEffects`

Files:
- Modify: `src/features/test/use-test-entry-orchestrator.ts`
- Delete later in Unit 3: `src/features/test/use-entry-side-effects.ts`

Steps:
- Remove `useEntrySideEffects` import.
- Add direct imports from `@/features/telemetry/consent-source` and `@/features/transition/store`.
- Remove the destructured `useEntrySideEffects({variant})` call.
- Replace:
  - `applyConsentEffect(effect.writesConsent)` with `setTelemetryConsentState(effect.writesConsent)`;
  - `applyInstructionSeenEffect()` with `markInstructionSeen(variant)`;
  - `applyLandingIngressClearEffect()` with `clearLandingIngress(variant)`.

Stop condition:
- Do not alter condition order or move any side effect across `runtimeReady`, `redirecting`, redirect-home, qualifier progression, reentry, or commit branches.

### Unit 2: Extract Helpers And Rewrite `executeInstructionAction`

Files:
- Modify: `src/features/test/use-test-entry-orchestrator.ts`

Steps:
- Add `TestInstructionActionEffect` type import.
- Add `ApplyPreActionSideEffectsInput` and `applyPreActionSideEffects`.
- Add `TryAdvanceQualifierStepInput` and `tryAdvanceQualifierStep`.
- Add `ExecuteReentryCommitInput` and `executeReentryCommit`.
- Add `ExecuteFreshEntryCommitInput` and `executeFreshEntryCommit`.
- Replace the internal `executeInstructionAction` body with the linear sequence described above.
- Update dependency array by removing stale `apply*` dependencies.

Stop condition:
- The four helpers remain non-exported.
- No new test files or source files are introduced.
- `useAutoCommit` and `useQualifierOverlayWizard` remain unchanged.

### Unit 3: Remove Deleted Hook From QA Path Config

Files:
- Delete: `src/features/test/use-entry-side-effects.ts`
- Modify: `scripts/qa/_path-config.mjs`

Steps:
- Delete `src/features/test/use-entry-side-effects.ts`.
- Remove only the `entrySideEffects` key/value from the `test` object.
- Do not modify `scripts/qa/check-phase10-transition-contracts.mjs` in this Finding 3 scope.

Stop condition:
- `rg -n "useEntrySideEffects|entrySideEffects" src scripts tests` should return no source/test/QA path-config references, except no result is expected after the deletion and config cleanup.

### Unit 4: Update Test Plan Documentation

Files:
- Modify: `docs/req-test-plan.md`

Steps:
- Replace the SD-1 current-structure bullet around line 234 with the planned inline-side-effect wording.
- Do not update other docs for Finding 3.

Stop condition:
- Documentation describes the actual post-refactor ownership: orchestrator applies direct calls, not a separate hook.

## Verification Plan

Run after implementation, in this order.

### Basic Gates From `AGENTS.md`

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected:
- `npm run lint`: 0 errors.
- `npm run typecheck`: `next typegen` completes, then `tsc --noEmit` completes with 0 errors.
- `npm test`: full Vitest suite remains at 73 test files passed and 479 test cases passed, matching the prerequisite baseline.
- `npm run build`: 0 errors.

### User-Requested QA Suite

```bash
npm run qa:rules
```

Expected:
- QA script suite completes with 0 failures.

### Focused Evidence Checks

```bash
npm test -- \
  tests/unit/use-test-entry-orchestrator.test.ts \
  tests/unit/test-entry-orchestrator-qualifier.test.ts \
  tests/unit/test-entry-orchestrator-reentry.test.ts
```

Expected:
- Existing orchestrator tests pass without mock path changes.

```bash
rg -n "useEntrySideEffects|entrySideEffects" src scripts tests
```

Expected:
- No matches after deleting `use-entry-side-effects.ts` and removing the `_path-config.mjs` key.

```bash
rg -n "setTelemetryConsentState|markInstructionSeen|clearLandingIngress" src/features/test/use-test-entry-orchestrator.ts
```

Expected:
- Direct imports and direct helper/call-site references exist in `use-test-entry-orchestrator.ts`.

E2E:
- No E2E run is planned for this structural refactor because no UI, routing, responsiveness, a11y, or browser behavior surface is intentionally changed. The provided prerequisite E2E baseline is 125 passed.

## Regression Coverage

No new test files are planned. Existing tests cover the behavior that must remain unchanged:

- `tests/unit/use-test-entry-orchestrator.test.ts`
  - auto-commit idempotence;
  - redirect-home dispatch/navigation/landing-ingress clearing;
  - `markInstructionSeen` for start actions;
  - consent writes for consent-bearing start actions;
  - runtime-not-ready and redirecting guards.
- `tests/unit/test-entry-orchestrator-qualifier.test.ts`
  - qualifier wizard first-step advance;
  - qualifier draft by canonical index;
  - final qualifier commit payload and response-set write;
  - back/forward qualifier navigation;
  - no-qualifier direct commit.
- `tests/unit/test-entry-orchestrator-reentry.test.ts`
  - reentry mode open and draft seeding;
  - reentry cancel with no storage/reset mutation;
  - reentry confirm scoring reset;
  - qualifier-only response-set write.

## Decisions Requiring Confirmation

Explicit approval of this plan is required before implementation.

No unresolved product, UX, architecture, or test-design questions remain within the provided Finding 3 scope. The implementation will not add tests, export helpers, modify `useAutoCommit`, modify `useQualifierOverlayWizard`, update mock paths, introduce new files, or modify any docs beyond `docs/req-test-plan.md`.

## Self-Review Checklist

- Spec coverage: STEP 1 through STEP 5 are represented above.
- Placeholder scan: no placeholder language or unspecified implementation steps remain.
- Type consistency: helper interfaces use current local types: `OverlayStepId`, `QualifierOverlayItem`, `TestInstructionActionEffect`, `Dispatch<TestRunAction>`, and `Record<string, string>`.
- Scope check: planned source file count is net `-1`, and no source file is expected to exceed 500 lines.
- Approval boundary: implementation must stop here until the user explicitly approves this plan.
