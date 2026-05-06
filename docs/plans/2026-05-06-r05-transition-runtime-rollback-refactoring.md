# R-05 Transition Runtime Rollback Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task after explicit user approval. Project override: execute inline only; do not use subagents, parallel agents, automated multi-wave execution, or automated implementation pipelines.

**Goal:** Refactor the landing transition runtime/store/signal boundary so duplicate-locale starts are side-effect-free, rollback is storage-atomic, and body scroll ownership stays in React hooks.

**Architecture:** Keep `runtime.ts` as the transition lifecycle coordinator, `store.ts` as the sessionStorage/event abstraction, and `signals.ts` as the lifecycle signal emitter. Add regression tests first around the duplicate-locale no-op path, rollback event count, no-DOM store behavior, and independent return-scroll consumption, then make the smallest production changes that satisfy those tests.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest with JSDOM, Playwright transition smoke coverage, custom Phase 10/11 QA scripts.

---

## Approval Status

Plan mode is required because this task touches the High-Risk `src/features/landing/transition/` surface and the transition/telemetry SSOT contracts.

Implementation is not approved yet. Do not edit runtime/test files until the user explicitly approves this plan.

Approval of this plan confirms these scope decisions:

- Use existing unit test anchors `tests/unit/landing-transition-runtime.test.ts` and `tests/unit/landing-transition-store.test.ts` instead of creating `tests/unit/transition-store.test.ts`. The repo's verified transition command in `docs/agent-guides/verification-commands.md` names the existing files.
- Unit test files are in scope despite the narrow runtime-file constraint, because the request explicitly requires T-1 through T-4 tests and AGENTS requires regression coverage for behavior changes.
- No production call-site edits are expected for CHANGE-07. Investigation found `consumeLandingReturnScrollY` only in `tests/unit/landing-transition-store.test.ts`; `consumeLandingReturnVariant` has no current call site. Because the functions are not always paired, preserve both exports and fix them to delete only their own keys.
- Do not modify `tests/e2e/transition-telemetry-smoke.spec.ts`.
- Do not modify docs other than this plan during implementation unless a required post-implementation docs inspection finds a concrete contract divergence. If that happens, stop and ask before expanding file scope.

## Relevant SSOT And Guides

- `AGENTS.md §2`: transition / telemetry / consent route maps to `docs/req-landing.md §8, §12, §13`, `docs/agent-guides/project-rules.md §Blog-Telemetry-Theme`, and `docs/agent-guides/verification-commands.md §telemetry`.
- `AGENTS.md §4`: `src/features/landing/transition/` is High-Risk and requires Playwright E2E regression coverage.
- `docs/req-landing.md §8.6`: CTA-triggered valid transitions still emit `transition_start`; this plan changes only duplicate-locale preflight no-op behavior.
- `docs/req-landing.md §12.1`: `transition_start|complete|fail|cancel` are internal signals only, not telemetry payloads.
- `docs/req-landing.md §13.3`: started transitions must terminate exactly once; rollback cleanup remains centralized.
- `docs/req-landing.md §13.6`: failure/cancel cleanup must not leak pre-answer, ingress, pending state, interaction lock, body lock, or queued close state.
- `docs/req-landing.md §13.8`: return scroll is saved immediately before routing and restored once on landing remount.
- `docs/project-analysis.md §5.4` and `§6`: transition persistence is session-scoped, browser event names are fixed, and storage keys are contract-level.
- `docs/agent-guides/verification-commands.md §telemetry`: scope checks include Phase 10/11 scripts, transition/telemetry unit tests, and transition/consent E2E smoke.

## Files To Modify

- Modify: `src/features/landing/transition/signals.ts`
  - CHANGE-05 only: make `emitLandingTransitionSignal()` return `void`; remove `return detail`.
- Modify: `src/features/landing/transition/store.ts`
  - CHANGE-06: rename private `dispatchTransitionEvent()` to `dispatchStoreChangeEvent()` throughout this file.
  - CHANGE-08: make `clearLandingReturnScroll()` event detail report both removed return keys via `keys`.
  - CHANGE-07: fix `consumeLandingReturnScrollY()` and `consumeLandingReturnVariant()` as independent consumers.
  - CHANGE-02: remove all direct DOM/body style mutation from `rollbackLandingTransition()`.
  - CHANGE-03: make rollback remove storage keys directly and dispatch exactly one pending-key `LANDING_TRANSITION_STORE_EVENT` plus one `LANDING_TRANSITION_CLEANUP_EVENT`.
- Modify: `src/features/landing/transition/runtime.ts`
  - CHANGE-01: duplicate-locale pattern check becomes the first operation in `beginLandingTransition()`.
  - CHANGE-04: save return scroll before writing the pending transition.
- Modify: `tests/unit/landing-transition-runtime.test.ts`
  - Add/replace T-1 coverage for duplicate-locale no side effects.
- Modify: `tests/unit/landing-transition-store.test.ts`
  - Add/update T-2, T-3, T-4 coverage.
  - Update existing rollback expectation so body styles remain unchanged.
- Modify: `docs/plans/2026-05-06-r05-transition-runtime-rollback-refactoring.md`
  - Keep this plan current if implementation outcome materially differs from the planned units.

Do not modify:

- `src/features/landing/transition/use-pending-landing-transition.ts`
- `src/features/landing/transition/use-landing-transition.ts`
- `src/features/landing/transition/transition-gnb-overlay.tsx`
- `src/features/landing/transition/transition-runtime-monitor.tsx`
- `src/features/landing/gnb/hooks/use-gnb-mobile-menu.ts`
- `src/features/landing/grid/use-mobile-scroll-lock.ts`
- `src/features/landing/storage/storage-keys.ts`
- `tests/e2e/transition-telemetry-smoke.spec.ts`
- `PendingLandingTransition`, `LandingTransitionResultReason`, `terminatePendingLandingTransition()`, or `completePendingLandingTransition()` public shapes
- `LANDING_TRANSITION_STORE_EVENT` or `LANDING_TRANSITION_CLEANUP_EVENT` string constants
- build artifacts or `docs/archive/**`

## Impact Assessment

- Shared components / shell / GNB: `TransitionGnbOverlay` and landing grid cleanup still observe the same public event constants. Rollback still emits cleanup once so the expanded-card collapse path remains intact.
- Localization: duplicate-locale target routes become a silent preflight no-op before transition ID allocation, storage writes, telemetry, or internal signal emission.
- A11y: no focus or ARIA changes. Avoiding extra rollback store events reduces redundant React updates during failure paths.
- State contracts: rollback becomes atomic from subscriber perspective: pending subscribers see one null update, cleanup subscribers see one cleanup event.
- Core user flow: valid test/blog CTA transitions continue to save return scroll, write pending state, write ingress for test pre-answer, fire `card_answered`, and emit `transition_start`.
- Usability risk: body scroll lock restoration is left to `use-gnb-mobile-menu.ts` and `use-mobile-scroll-lock.ts`, preserving their previous-value cleanup contracts.
- Responsiveness risk: fewer rollback store events should reduce unnecessary rerenders during timeout/cancel paths.
- Performance risk: positive only; direct key removal avoids 3-4 redundant store events.
- Design system consistency: no visual styling or component layout change.

## Spec Corrections And Resolutions

- CHANGE-03 wording first says "emit only one CLEANUP_EVENT", then later requires a pending-key store event too. The final accepted behavior is T-2: exactly two events during rollback, one `LANDING_TRANSITION_STORE_EVENT` and one `LANDING_TRANSITION_CLEANUP_EVENT`.
- CHANGE-07 investigation result is "independently consumed or not consumed", not "always paired". Preserve both helpers and make each remove only its own key.
- Existing runtime unit test currently asserts the old duplicate-locale behavior: `card_answered` telemetry plus `transition_start` then `transition_fail`. This is now explicitly a defect, so replace that assertion with side-effect-free expectations.
- The requested new test path `tests/unit/transition-store.test.ts` does not match current repo anchors. Use the existing transition test files named by the verification guide.

## Decisions Requiring User Confirmation

- Approve replacing the existing duplicate-locale unit expectation with the new no-side-effects contract.
- Approve modifying `tests/unit/landing-transition-runtime.test.ts` and `tests/unit/landing-transition-store.test.ts` for T-1 through T-4, even though the production implementation scope remains limited to `runtime.ts`, `store.ts`, and `signals.ts`.
- Approve the CHANGE-07 independent-consumer path: keep `consumeLandingReturnScrollY()` and `consumeLandingReturnVariant()` as separate exports and make each delete only its own key.
- Approve stopping for a separate docs-scope decision if post-implementation inspection finds active docs that explicitly describe the old duplicate-locale side effects or store-owned body style mutation.

## Implementation Plan

### Unit 0: Restore Context And Confirm Baseline

**Files to read before editing:** `AGENTS.md`, `.planning/STATE.md` if present, `docs/req-landing.md §8.6, §12, §13.3, §13.6, §13.8, §14.2`, `docs/project-analysis.md §5.4, §6`, `docs/agent-guides/project-rules.md §Blog-Telemetry-Theme`, `docs/agent-guides/verification-commands.md §telemetry`, `package.json`, `next.config.ts`, `playwright.config.ts`, `src/config/site.ts`.

- [ ] Confirm this plan is approved.
- [ ] Confirm no child `AGENTS.md` applies under `src/features/landing/transition/`.
- [ ] Confirm no `.planning/STATE.md` exists or restore it if present.
- [ ] Run `git status --short`. Expected: no unrelated changes made by this task. If unrelated user changes exist, leave them untouched.
- [ ] Optional baseline command before test edits:

```bash
npm test -- tests/unit/landing-transition-runtime.test.ts tests/unit/landing-transition-store.test.ts
```

Expected before edits: current tests pass in the old implementation. If they fail, stop and report baseline drift.

### Unit 1: Write Failing Unit Tests

**Files:** `tests/unit/landing-transition-runtime.test.ts`, `tests/unit/landing-transition-store.test.ts`

Use Vitest/JSDOM only. Do not edit E2E tests.

#### `tests/unit/landing-transition-runtime.test.ts`

Update imports so runtime tests can observe store events and storage keys:

```ts
import {SESSION_STORAGE_KEYS} from '../../src/features/landing/storage/storage-keys';
import {
  beginLandingTransition,
  terminatePendingLandingTransition
} from '../../src/features/landing/transition/runtime';
import {LANDING_TRANSITION_SIGNAL_EVENT} from '../../src/features/landing/transition/signals';
import {
  LANDING_TRANSITION_STORE_EVENT,
  readLandingIngress,
  readPendingLandingTransition
} from '../../src/features/landing/transition/store';
```

Replace the duplicate-locale test with:

```ts
it('returns null without side effects for duplicate-locale target routes', () => {
  const signals: Array<Record<string, unknown>> = [];
  const storeEvents: Array<Record<string, unknown>> = [];
  window.addEventListener(LANDING_TRANSITION_SIGNAL_EVENT, ((event: Event) => {
    if (event instanceof window.CustomEvent) {
      signals.push(event.detail as Record<string, unknown>);
    }
  }) as EventListener);
  window.addEventListener(LANDING_TRANSITION_STORE_EVENT, ((event: Event) => {
    if (event instanceof window.CustomEvent) {
      storeEvents.push(event.detail as Record<string, unknown>);
    }
  }) as EventListener);

  const pending = beginLandingTransition({
    locale: 'ja',
    route: '/ja',
    sourceVariant: 'qmbti',
    targetType: 'test',
    targetRoute: '/ja/ja/test/qmbti',
    variant: 'qmbti',
    preAnswerChoice: 'A'
  });

  expect(pending).toBeNull();
  expect(window.sessionStorage.getItem(SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION)).toBeNull();
  expect(readPendingLandingTransition()).toBeNull();
  expect(readLandingIngress('qmbti')).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  expect(storeEvents).toHaveLength(0);
  expect(signals).toHaveLength(0);
});
```

Expected RED before production edits: this test fails because current code writes pending state, writes ingress, fires `card_answered`, emits `transition_start`, then emits `transition_fail`.

#### `tests/unit/landing-transition-store.test.ts`

Update imports:

```ts
import {SESSION_STORAGE_KEYS, variantSessionKeys} from '../../src/features/landing/storage/storage-keys';
import {
  clearLandingReturnScroll,
  clearPendingLandingTransition,
  consumeLandingIngress,
  consumeLandingReturnScrollY,
  consumeLandingReturnVariant,
  LANDING_TRANSITION_CLEANUP_EVENT,
  LANDING_TRANSITION_STORE_EVENT,
  readLandingIngress,
  readLandingReturnVariant,
  readLandingReturnScrollY,
  readPendingLandingTransition,
  rollbackLandingTransition,
  saveLandingReturnScrollY,
  writeLandingIngress,
  writePendingLandingTransition
} from '../../src/features/landing/transition/store';
```

Update the existing consume test so independent deletion is explicit:

```ts
it('persists pending transitions and consumes return scroll values independently', () => {
  installDom();
  writePendingLandingTransition({
    transitionId: 'transition-1',
    sourceVariant: 'qmbti',
    targetRoute: '/en/test/qmbti',
    targetType: 'test',
    startedAtMs: 1,
    variant: 'qmbti',
    preAnswerChoice: 'A'
  });

  expect(readPendingLandingTransition()?.transitionId).toBe('transition-1');

  saveLandingReturnScrollY(742.8, 'build-metrics');
  expect(readLandingReturnScrollY()).toBe(742);
  expect(readLandingReturnVariant()).toBe('build-metrics');
  expect(consumeLandingReturnScrollY()).toBe(742);
  expect(readLandingReturnScrollY()).toBeNull();
  expect(readLandingReturnVariant()).toBe('build-metrics');

  saveLandingReturnScrollY(512, 'qmbti');
  expect(consumeLandingReturnVariant()).toBe('qmbti');
  expect(readLandingReturnScrollY()).toBe(512);
  expect(readLandingReturnVariant()).toBeNull();

  clearLandingReturnScroll();
  clearPendingLandingTransition();
});
```

Extend the `clears return scroll keys atomically` test with event detail:

```ts
const storeEvents: Array<Record<string, unknown>> = [];
window.addEventListener(LANDING_TRANSITION_STORE_EVENT, ((event: Event) => {
  if (event instanceof window.CustomEvent) {
    storeEvents.push(event.detail as Record<string, unknown>);
  }
}) as EventListener);
```

Then after `clearLandingReturnScroll()` assert:

```ts
expect(storeEvents.at(-1)).toEqual({
  keys: [
    SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y,
    SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT
  ],
  sourceVariant: null
});
```

Replace or update the rollback test so it captures T-2 and T-3 together:

```ts
it('assertion:B16-rollback-cleanup dispatches one pending store event and one cleanup event without mutating body styles', () => {
  installDom();
  document.body.style.overflow = 'hidden';
  document.body.style.touchAction = 'none';
  const storeEvents: Array<Record<string, unknown>> = [];
  const cleanupEvents: Array<Record<string, unknown>> = [];
  window.addEventListener(LANDING_TRANSITION_STORE_EVENT, ((event: Event) => {
    if (event instanceof window.CustomEvent) {
      storeEvents.push(event.detail as Record<string, unknown>);
    }
  }) as EventListener);
  window.addEventListener(LANDING_TRANSITION_CLEANUP_EVENT, ((event: Event) => {
    if (event instanceof window.CustomEvent) {
      cleanupEvents.push(event.detail as Record<string, unknown>);
    }
  }) as EventListener);

  writePendingLandingTransition({
    transitionId: 'transition-1',
    sourceVariant: 'qmbti',
    targetRoute: '/en/test/qmbti',
    targetType: 'test',
    startedAtMs: 1,
    variant: 'qmbti',
    preAnswerChoice: 'A'
  });
  writeLandingIngress({
    variant: 'qmbti',
    preAnswerChoice: 'A',
    createdAtMs: 1,
    landingIngressFlag: true
  });
  saveLandingReturnScrollY(256, 'qmbti');
  storeEvents.length = 0;
  cleanupEvents.length = 0;

  rollbackLandingTransition({variant: 'qmbti'});

  expect(storeEvents).toEqual([
    {
      key: SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION,
      transitionId: null
    }
  ]);
  expect(cleanupEvents).toEqual([{variant: 'qmbti'}]);
  expect(storeEvents.length + cleanupEvents.length).toBe(2);
  expect(window.sessionStorage.getItem(SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION)).toBeNull();
  expect(window.sessionStorage.getItem(SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y)).toBeNull();
  expect(window.sessionStorage.getItem(SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT)).toBeNull();
  expect(window.sessionStorage.getItem(variantSessionKeys.landingIngress('qmbti'))).toBeNull();
  expect(readPendingLandingTransition()).toBeNull();
  expect(readLandingIngress('qmbti')).toBeNull();
  expect(consumeLandingIngress('qmbti')).toBeNull();
  expect(document.body.style.overflow).toBe('hidden');
  expect(document.body.style.touchAction).toBe('none');
});
```

RED verification:

```bash
npm test -- tests/unit/landing-transition-runtime.test.ts tests/unit/landing-transition-store.test.ts
```

Expected before production edits: FAIL for the new duplicate-locale no-side-effects test, independent consume assertions, rollback event-count assertions, rollback body-style assertions, and clear-return-scroll event-detail assertion.

### Unit 2: CHANGE-05 `signals.ts` Return Type

**File:** `src/features/landing/transition/signals.ts`

Replace `emitLandingTransitionSignal()` with:

```ts
export function emitLandingTransitionSignal(
  detail: LandingTransitionSignalDetail
): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new window.CustomEvent(LANDING_TRANSITION_SIGNAL_EVENT, {
        detail
      })
    );
  }
}
```

Verification:

```bash
npm test -- tests/unit/landing-transition-runtime.test.ts
```

Expected after this isolated change: the duplicate-locale test still fails until Unit 6; no new TypeScript/runtime failure from return-type change.

### Unit 3: CHANGE-06 And CHANGE-08 Store Helper Rename And Return-Scroll Event Detail

**File:** `src/features/landing/transition/store.ts`

Rename the private helper:

```ts
function dispatchStoreChangeEvent(name: string, detail: Record<string, unknown>): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new window.CustomEvent(name, {
      detail
    })
  );
}
```

Update every internal call from `dispatchTransitionEvent(...)` to `dispatchStoreChangeEvent(...)`.

Change `clearLandingReturnScroll()` dispatch detail to:

```ts
dispatchStoreChangeEvent(LANDING_TRANSITION_STORE_EVENT, {
  keys: [
    SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y,
    SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT
  ],
  sourceVariant: null
});
```

Verification:

```bash
npm test -- tests/unit/landing-transition-store.test.ts
```

Expected after this unit: clear-return-scroll event-detail test passes; rollback and consume tests still fail until later units.

### Unit 4: CHANGE-07 Independent Return-Scroll Consumers

**File:** `src/features/landing/transition/store.ts`

Because call sites are not paired, replace the consume helpers with independent removals:

```ts
export function consumeLandingReturnScrollY(): number | null {
  const value = readLandingReturnScrollY();
  const storage = getSessionStorage();
  storage?.removeItem(SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y);
  return value;
}

export function consumeLandingReturnVariant(): string | null {
  const value = readLandingReturnVariant();
  const storage = getSessionStorage();
  storage?.removeItem(SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT);
  return value;
}
```

Do not update production call sites. `src/features/landing/landing-runtime.tsx` already uses `readLandingReturnScrollY()` plus `clearLandingReturnScroll()` for pair cleanup, which remains correct for return restoration.

Verification:

```bash
npm test -- tests/unit/landing-transition-store.test.ts
```

Expected after this unit: independent consume coverage passes; rollback body/event tests still fail until Unit 5.

### Unit 5: CHANGE-02 And CHANGE-03 Atomic Rollback

**File:** `src/features/landing/transition/store.ts`

Replace `rollbackLandingTransition()` with direct storage deletion and exactly two events:

```ts
export function rollbackLandingTransition(input: {
  variant?: string;
}): void {
  const storage = getSessionStorage();

  storage?.removeItem(SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION);
  storage?.removeItem(SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y);
  storage?.removeItem(SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT);
  if (input.variant) {
    storage?.removeItem(variantSessionKeys.landingIngress(input.variant));
  }

  dispatchStoreChangeEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION,
    transitionId: null
  });
  dispatchStoreChangeEvent(LANDING_TRANSITION_CLEANUP_EVENT, {
    variant: input.variant ?? null
  });
}
```

Constraints:

- Do not touch `document`, `document.body`, `overflow`, or `touchAction` in `store.ts`.
- Do not call `clearPendingLandingTransition()`, `clearLandingReturnScroll()`, or `clearLandingIngress()` from rollback.
- Keep `clearPendingLandingTransition()`, `clearLandingReturnScroll()`, and `clearLandingIngress()` public behavior unchanged except for the Unit 3 event-detail shape in `clearLandingReturnScroll()`.

Verification:

```bash
npm test -- tests/unit/landing-transition-store.test.ts
```

Expected after this unit: all store tests pass.

### Unit 6: CHANGE-01 Duplicate-Locale Preflight Guard

**File:** `src/features/landing/transition/runtime.ts`

Make duplicate-locale validation the first operation in `beginLandingTransition()`:

```ts
export function beginLandingTransition(input: BeginLandingTransitionInput): PendingLandingTransition | null {
  if (DUPLICATE_LOCALE_PATH_PATTERN.test(input.targetRoute)) {
    return null;
  }

  const transitionId = createCorrelationId('transition');
  const pendingTransition: PendingLandingTransition = {
    transitionId,
    sourceVariant: input.sourceVariant,
    targetRoute: input.targetRoute,
    targetType: input.targetType,
    startedAtMs: Date.now(),
    variant: input.variant,
    preAnswerChoice: input.preAnswerChoice
  };

  ...
}
```

Remove the old bottom block entirely:

```ts
if (DUPLICATE_LOCALE_PATH_PATTERN.test(input.targetRoute)) {
  terminatePendingLandingTransition({
    signal: 'transition_fail',
    resultReason: 'DUPLICATE_LOCALE'
  });
  return null;
}
```

Verification:

```bash
npm test -- tests/unit/landing-transition-runtime.test.ts
```

Expected after this unit: duplicate-locale test passes for no sessionStorage writes, no store event, no signal event, no telemetry `fetch`, and `null` return.

### Unit 7: CHANGE-04 Save Return Scroll Before Pending Write

**File:** `src/features/landing/transition/runtime.ts`

Move `saveLandingReturnScrollY()` ahead of `writePendingLandingTransition()`:

```ts
if (typeof window !== 'undefined') {
  saveLandingReturnScrollY(window.scrollY, input.sourceVariant);
}
writePendingLandingTransition(pendingTransition);
```

Keep this below the duplicate-locale guard and above landing ingress/telemetry/signal work.

Verification:

```bash
npm test -- tests/unit/landing-transition-runtime.test.ts tests/unit/landing-transition-store.test.ts
```

Expected after this unit: both transition unit test files pass.

### Unit 8: Targeted Transition And Telemetry Checks

Run the targeted unit and contract checks in this order:

```bash
node scripts/qa/check-phase10-transition-contracts.mjs
node scripts/qa/check-phase11-telemetry-contracts.mjs
npm test -- \
  tests/unit/landing-telemetry-validation.test.ts \
  tests/unit/landing-telemetry-runtime.test.ts \
  tests/unit/landing-transition-runtime.test.ts \
  tests/unit/landing-transition-store.test.ts
```

Expected: all commands PASS. If `check-phase10-transition-contracts.mjs` encodes the old duplicate-locale signal behavior, stop and report the script mismatch instead of editing `scripts/qa/*.mjs` without approval, because `scripts/qa/*.mjs` is Ask First and outside this R-05 scope.

### Unit 9: Required E2E Regression

Run the full transition telemetry smoke spec without modifying it:

```bash
npx playwright test tests/e2e/transition-telemetry-smoke.spec.ts
```

Expected: PASS. Pay specific attention in the report to:

- `assertion:B16-timeout`
- `assertion:B16-user-cancel`
- `assertion:B17-return-restore`

If the spec fails from browser setup or server startup, diagnose setup first. If it fails from product behavior, fix only within the approved R-05 file scope unless the failure proves the scope is insufficient.

### Unit 10: Basic Done Gates

Run Basic Gates in AGENTS order:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: all PASS with zero errors.

### Unit 11: Post-Implementation Documentation Inspection

Inspect these non-archive docs for drift:

```bash
rg -n "DUPLICATE_LOCALE|duplicate locale|rollback|transition_start|transition_fail|body lock|return scroll|landing:transition-store-change|landing:transition-cleanup" docs/req-landing.md docs/project-analysis.md docs/agent-guides/project-rules.md docs/agent-guides/verification-commands.md
```

Expected: no doc edits required unless a statement explicitly says duplicate-locale preflight emits `transition_start`, emits `transition_fail`, writes pending/ingress, or that `store.ts` directly owns body style restoration.

If a concrete divergence is found, stop and ask for permission to expand scope to docs sync. Do not modify active contract docs silently because the R-05 constraints did not list docs as implementation targets.

## Validation Commands Summary

Targeted TDD:

```bash
npm test -- tests/unit/landing-transition-runtime.test.ts tests/unit/landing-transition-store.test.ts
```

Telemetry/transition scope:

```bash
node scripts/qa/check-phase10-transition-contracts.mjs
node scripts/qa/check-phase11-telemetry-contracts.mjs
npm test -- \
  tests/unit/landing-telemetry-validation.test.ts \
  tests/unit/landing-telemetry-runtime.test.ts \
  tests/unit/landing-transition-runtime.test.ts \
  tests/unit/landing-transition-store.test.ts
npx playwright test tests/e2e/transition-telemetry-smoke.spec.ts
```

Basic Done gate:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Acceptance Checklist

- [ ] `beginLandingTransition()` returns `null` immediately for duplicate-locale target routes before ID allocation or side effects.
- [ ] Duplicate-locale no-op dispatches no `LANDING_TRANSITION_STORE_EVENT`.
- [ ] Duplicate-locale no-op dispatches no `LANDING_TRANSITION_SIGNAL_EVENT`; `transition_start` does not fire.
- [ ] Duplicate-locale no-op does not call telemetry `fetch`.
- [ ] Valid transitions still save return scroll and write pending transition.
- [ ] Return scroll is saved before pending transition write.
- [ ] `emitLandingTransitionSignal()` returns `void`.
- [ ] `store.ts` has no `document.body.style` mutation.
- [ ] `dispatchTransitionEvent` no longer exists; internal helper is `dispatchStoreChangeEvent`.
- [ ] `clearLandingReturnScroll()` event detail contains both return keys.
- [ ] `consumeLandingReturnScrollY()` removes only `LANDING_RETURN_SCROLL_Y`.
- [ ] `consumeLandingReturnVariant()` removes only `LANDING_RETURN_VARIANT`.
- [ ] `rollbackLandingTransition()` deletes pending, return scroll Y, return variant, and variant ingress directly.
- [ ] `rollbackLandingTransition()` dispatches exactly one pending-key store event and exactly one cleanup event.
- [ ] `tests/e2e/transition-telemetry-smoke.spec.ts` remains unmodified and passes.
- [ ] Basic gates pass in order.

## Self-Review

- Spec coverage: CHANGE-01 through CHANGE-08 are covered by Units 2 through 7, with required T-1 through T-4 tests in Unit 1.
- Placeholder scan: no unresolved marker text remains.
- Type/API consistency: public type shapes and public runtime function signatures stay unchanged. `emitLandingTransitionSignal()` changes only its unused return type.
- Scope check: production edits are limited to `runtime.ts`, `store.ts`, and `signals.ts`; test edits are limited to the existing transition unit test anchors required for regression coverage.
