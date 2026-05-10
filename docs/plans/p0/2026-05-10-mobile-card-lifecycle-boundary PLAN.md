# Mobile Card Lifecycle Boundary Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development` for each production change. Execute inline only; project rules prohibit subagents, parallel implementation waves, and automated multi-wave execution for this task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement two mobile card lifecycle refactoring candidates in strict sequence: Candidate 2 first, then Candidate 1 only after Candidate 2 passes the full E2E gate.

**Architecture:** Keep `use-mobile-card-lifecycle.ts` as the hub orchestrator for the mobile lifecycle cluster. Candidate 2 restores hub-and-spoke dependency direction by injecting the restore-settled predicate into `use-mobile-restore-polling.ts`. Candidate 1 removes the transient shell hook's independent close timer and lets the orchestrator's `mobileCloseTimerRef` perform teardown after the existing `MOBILE_EXPANDED_DURATION_MS` close lifecycle delay.

**Tech Stack:** Next.js 16.2.4, React 19.2.4, Vitest, Playwright, CSS Modules.

---

## Required Plan Fields

### All Files To Be Modified

- `src/features/landing/grid/use-mobile-restore-polling.ts`
- `src/features/landing/grid/use-mobile-card-lifecycle.ts`
- `src/features/landing/grid/use-mobile-transient-shell.ts` *(Candidate 1 only, after Candidate 2 gate passes)*
- `tests/unit/landing-mobile-lifecycle.test.ts`
- `docs/project-analysis.md`
- This plan file: `docs/plans/2026-05-10-mobile-card-lifecycle-boundary-audit.md`

### Files To Read Or Re-check Without Planned Modification

- `src/features/landing/grid/mobile-card-lifecycle-dom.ts`
- `src/features/landing/grid/mobile-lifecycle.ts`
- `src/features/landing/grid/landing-grid-card.module.css`
- `scripts/qa/check-phase10-transition-contracts.mjs`
- `tests/unit/landing-mobile-scroll-lock.test.ts`
- `docs/req-landing.md`
- `docs/agent-guides/project-rules.md`
- `docs/agent-guides/verification-commands.md`

### Relevant SSOT Contract

- Landing grid / GNB / theme: `docs/req-landing.md §6-11`
- Transition / telemetry / consent: `docs/req-landing.md §8, §12, §13`
- Implementation map: `docs/project-analysis.md §5.1`
- Project rules: `docs/agent-guides/project-rules.md §Blog-Telemetry-Theme`
- Verification anchors: `docs/agent-guides/verification-commands.md §landing` and `§telemetry`

### Impact Assessment

- Shared components / shell / GNB: No planned GNB or page-shell file changes. Risk is indirect: mobile card close timing affects the visual layer below the sticky GNB.
- Localization: No locale data or copy changes.
- A11y: No control semantics, focus labels, or keyboard route changes planned. Existing mobile close lifecycle and keyboard handoff APIs must remain stable.
- State contracts: High risk. `use-mobile-card-lifecycle.ts` is a High-Risk Area. Candidate 2 must preserve restore polling termination conditions. Candidate 1 must preserve `OPENING -> OPEN -> CLOSING -> NORMAL`, `shouldLockMobilePageScroll`, restore-ready timing, and body overflow lock/unlock behavior.
- Core user flow: High risk for mobile card open/close choreography, title continuity, close perception, reduced motion, and landing-to-destination transition smoke.
- Risk dimension required by `AGENTS.md §4`: usability, responsiveness, performance, and design system consistency. The work changes timing ownership in a mobile animation lifecycle, so Playwright E2E regression coverage is mandatory.

## Prohibited Changes

These items must not be touched during this implementation session:

- `mobile-lifecycle.ts` (state machine / reducer) — frozen.
- `use-mobile-scroll-lock.ts` — healthy boundary, no changes.
- `use-mobile-backdrop-gesture.ts` — healthy boundary, no changes.
- `mobile-card-lifecycle-dom.ts` — read-only; do not merge into `interaction-dom.ts`.
- `MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX` — do not unify with GNB mobile menu behavior.
- Any visual screenshot baseline files (`*.png` under `tests/e2e/*-snapshots/`).
  Do not run `--update-snapshots`. If a baseline diff appears, treat it as a regression.
- `docs/req-test-plan.md` — pre-existing unrelated worktree modification; do not touch.
- `docs/req-landing.md` — mobile lifecycle timing is an implementation detail not described
  at spec level; no changes needed.
- `src/features/gnb/` — no changes; outside scope.

### Validation Commands

Candidate 2, in order:

```bash
npm run typecheck
npm run lint
npm test -- --reporter=verbose tests/unit/landing-mobile-lifecycle.test.ts
npm test -- --reporter=verbose tests/unit/landing-mobile-scroll-lock.test.ts
npm run qa:rules
npx playwright test tests/e2e/transition-telemetry-smoke.spec.ts --project=chromium
npx playwright test tests/e2e/state-smoke.spec.ts --project=chromium
npx playwright test tests/e2e/grid-smoke.spec.ts --project=chromium
npm run qa:gate:once
```

Candidate 1, only after Candidate 2 `npm run qa:gate:once` passes:

```bash
npm run typecheck
npm run lint
npm test -- --reporter=verbose tests/unit/landing-mobile-lifecycle.test.ts
npm test -- --reporter=verbose tests/unit/landing-mobile-scroll-lock.test.ts
npm run qa:rules
npx playwright test tests/e2e/transition-telemetry-smoke.spec.ts --project=chromium
npx playwright test tests/e2e/state-smoke.spec.ts --project=chromium
npx playwright test tests/e2e/grid-smoke.spec.ts --project=chromium
npm run qa:gate:once
npm run typecheck
npm test -- --reporter=verbose tests/unit/landing-mobile-lifecycle.test.ts
npx playwright test tests/e2e/transition-telemetry-smoke.spec.ts --project=chromium --grep "B14"
```

Final Basic Done gate after both candidates and documentation update:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### Decisions Requiring User Confirmation Before Execution

- Approval to execute this plan is required before implementation because `src/features/landing/grid/use-mobile-card-lifecycle.ts` is listed as a High-Risk Area.
- Candidate 1 is contingent on Candidate 2 passing `npm run qa:gate:once`.
- Candidate 1 is also contingent on confirming `landing-card-detail-quiet-exit` animation duration is `<= 280ms`. If it exceeds 280ms, Candidate 1 must stop and be reported as skipped.
- No visual screenshot baselines may be updated unless the user later gives explicit approval after a confirmed genuine baseline change. The expected result is no visual baseline diff.

---

## Current Findings Before Implementation

- `.planning/STATE.md`: not present at session start.
- Child `AGENTS.md`: none found under the repository with `rg --files -g 'AGENTS.md'`.
- Existing unrelated worktree change: `docs/req-test-plan.md` is modified and must not be touched for this task.
- `tests/unit/landing-mobile-scroll-lock.test.ts`: found.
- `MOBILE_EXPANDED_DURATION_MS`: currently `280` in `src/features/landing/grid/mobile-lifecycle.ts`.
- `landing-card-detail-quiet-exit`: currently uses `var(--landing-card-motion-ms)` in `src/features/landing/grid/landing-grid-card.module.css`; Candidate 1 must confirm the variable's resolved source before editing.
- `scripts/qa/check-phase10-transition-contracts.mjs`: enforces the four required transient CSS selectors.

---

## Phase A — Candidate 2: Predicate Injection

### Task A1: Write RED Tests For Restore Predicate Injection

**Files:**
- Modify: `tests/unit/landing-mobile-lifecycle.test.ts`

- [ ] Add `@vitest-environment jsdom` if needed for hook tests.
- [ ] Add imports from `@testing-library/react`: `act`, `renderHook`, and `cleanup` if the file does not already have them.
- [ ] Add imports from `vitest`: `afterEach`, `beforeEach`, and `vi` if needed.
- [ ] Add import for `useMobileRestorePolling` from `../../src/features/landing/grid/use-mobile-restore-polling`.
- [ ] Add a `describe('useMobileRestorePolling - predicate injection')` block.
- [ ] Use fake timers and stub RAF with controllable callbacks:

```typescript
type RafCallback = FrameRequestCallback;

let rafCallbacks: Map<number, RafCallback>;
let nextRafId: number;

function installRafStubs() {
  rafCallbacks = new Map();
  nextRafId = 1;
  vi.stubGlobal('requestAnimationFrame', (callback: RafCallback) => {
    const id = nextRafId;
    nextRafId += 1;
    rafCallbacks.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafCallbacks.delete(id);
  });
}

function flushNextRaf() {
  const [id, callback] = rafCallbacks.entries().next().value ?? [];
  if (id === undefined || callback === undefined) {
    return false;
  }
  rafCallbacks.delete(id);
  callback(window.performance.now());
  return true;
}
```

- [ ] Add test `settled predicate returning true ends polling immediately`.
  - Render `useMobileRestorePolling({shellRef, dispatchMobileLifecycle, isRestoreSettled})`.
  - Call `settleMobileCloseAfterRestore('qmbti', snapshot)`.
  - Flush the first RAF.
  - Assert `isRestoreSettled` called once with `shellRef.current`, `'qmbti'`, and `snapshot`.
  - Assert `mobileRestoreReadyVariant` becomes `'qmbti'`.
  - Assert only the close-settled marker RAF remains, meaning no additional restore polling RAF was scheduled.

- [ ] Add test `settled predicate returning false for N attempts ends at max attempts`.
  - Use local expected attempt count `30`, matching the private `MOBILE_RESTORE_POLLING_MAX_ATTEMPTS`.
  - Set `isRestoreSettled` to return `false`.
  - Flush restore polling RAFs until the marker is set.
  - Assert predicate call count is `30`.
  - Assert `mobileRestoreReadyVariant` becomes `'qmbti'`.

- [ ] Add test `cleanup cancels pending RAF`.
  - Start `settleMobileCloseAfterRestore`.
  - Call the returned cancel function before flushing RAF.
  - Flush any available RAF callbacks.
  - Assert the predicate was not called after cancellation.

- [ ] Run:

```bash
npm test -- --reporter=verbose tests/unit/landing-mobile-lifecycle.test.ts
```

Expected RED: tests fail at compile/type level because `useMobileRestorePolling` does not yet accept `isRestoreSettled`.

### Task A2: Implement Predicate Injection In Restore Polling Hook

**Files:**
- Modify: `src/features/landing/grid/use-mobile-restore-polling.ts`

- [ ] Remove:

```typescript
import {isMobileSnapshotRestoreSettled} from '@/features/landing/grid/mobile-card-lifecycle-dom';
```

- [ ] Extend `UseMobileRestorePollingInput`:

```typescript
interface UseMobileRestorePollingInput {
  shellRef: RefObject<HTMLElement | null>;
  dispatchMobileLifecycle: Dispatch<LandingMobileLifecycleEvent>;
  isRestoreSettled: (
    shellElement: HTMLElement | null,
    cardVariant: string,
    snapshot: LandingMobileSnapshot
  ) => boolean;
}
```

- [ ] Destructure `isRestoreSettled` in `useMobileRestorePolling`.
- [ ] Replace the restore loop predicate:

```typescript
isRestoreSettled(shellRef.current, cardVariant, snapshot)
```

- [ ] Include `isRestoreSettled` in the `settleMobileCloseAfterRestore` callback dependency array.
- [ ] Do not change `UseMobileRestorePollingOutput` or returned values.

### Task A3: Inject Predicate From The Hub

**Files:**
- Modify: `src/features/landing/grid/use-mobile-card-lifecycle.ts`

- [ ] Add the hub import:

```typescript
import {captureMobileSnapshot, isMobileSnapshotRestoreSettled} from '@/features/landing/grid/mobile-card-lifecycle-dom';
```

- [ ] Update the hook call:

```typescript
} = useMobileRestorePolling({
  shellRef,
  dispatchMobileLifecycle,
  isRestoreSettled: isMobileSnapshotRestoreSettled
});
```

- [ ] Make no other source changes in this file during Phase A.

### Task A4: Verify Candidate 2 Boundary And Tests

**Files:**
- Read-only verification: `src/features/landing/grid/use-mobile-restore-polling.ts`
- Read-only verification: `tests/unit/landing-mobile-scroll-lock.test.ts`

- [ ] Confirm import direction:

```bash
rg -n "from ['\\\"](?:@/features/landing/grid|\\./).*['\\\"]" src/features/landing/grid/use-mobile-restore-polling.ts
```

Expected: imports only from React and `mobile-lifecycle.ts`; no import from `mobile-card-lifecycle-dom.ts` or sibling cluster submodules.

- [ ] Confirm scroll lock test file exists:

```bash
test -f tests/unit/landing-mobile-scroll-lock.test.ts && echo FOUND || echo NOT_FOUND
```

Expected: `FOUND`. Run its unit test because it exists.

- [ ] Run Candidate 2 validation commands in the exact order listed above.
- [ ] Stop after any failure. Diagnose with `superpowers:systematic-debugging` if a runtime error occurs or two fix attempts fail.

---

## Phase B — Candidate 1: Timer Consolidation

**Precondition:** Do not start Phase B unless Phase A `npm run qa:gate:once` passes.

### Task B0: Confirm Transient Shell CSS Isolation From Card Bounding Box

**Files:**
- Read-only: `src/features/landing/grid/landing-grid-card.module.css`

- [ ] Read `landing-grid-card.module.css`.
- [ ] Locate the CSS rule for `[data-slot="mobileTransientShell"]` or the equivalent class.
- [ ] Confirm the transient shell element uses `position: absolute` or `position: fixed`, not `position: relative` or normal-flow `position: static`.
- [ ] Confirm the transient shell does not add height to the card root element's bounding box.
- [ ] If the transient shell is in normal flow and affects the card bounding box, do not call `resetMobileTransientShell()` synchronously in the close timer callback. Instead, update Task B4 to call `resetMobileTransientShell()` inside `markMobileRestoreReady()`, after `dispatchMobileLifecycle({type: 'RESTORE_READY'})` and before the RAF for `CLOSE_SETTLED`, then record this altered implementation path in the completion report.
- [ ] If the transient shell is `position: absolute` or `fixed` and does not affect the card bounding box, proceed with Task B4 as written. Record the finding in the completion report under `Phase B — Candidate 1 result`.

### Task B1: Confirm Animation Duration Safety Before Code Changes

**Files:**
- Read-only: `src/features/landing/grid/landing-grid-card.module.css`
- Read-only: `src/features/landing/grid/mobile-lifecycle.ts`

- [ ] Confirm `MOBILE_EXPANDED_DURATION_MS` remains `280`.
- [ ] Locate the `:root { }` or equivalent block in `landing-grid-card.module.css`, excluding the `@media (prefers-reduced-motion)` block.
- [ ] Read the default non-reduced-motion value of `--landing-card-motion-ms`.
- [ ] Read the `landing-card-detail-quiet-exit` keyframes usage and confirm the `animation-duration` property resolves to the default `--landing-card-motion-ms` value.
- [ ] If the default value is `<= 280ms`, proceed with Phase B.
- [ ] If the default value is `> 280ms`, stop Phase B and report: `Phase B skipped — animation duration conflict. Default --landing-card-motion-ms is Xms which exceeds MOBILE_EXPANDED_DURATION_MS 280ms.`
- [ ] Do not use the `@media (prefers-reduced-motion)` value as the basis for this check.

### Task B2: Add GREEN Tests For Timer Consolidation After Interface Change

**Files:**
- Modify: `tests/unit/landing-mobile-lifecycle.test.ts`

- [ ] Do not write RED tests before Task B3. The existing independent timer already uses `MOBILE_EXPANDED_DURATION_MS = 280ms`, so timer-delay assertions would pass before any code change and would not be a valid RED signal.
- [ ] Implement Task B3 first. Run `npm run typecheck` and confirm it fails where `use-mobile-card-lifecycle.ts` destructures `clearMobileTransientShellTimer` from the hook output. This TypeScript failure is the RED signal confirming the interface change landed.
- [ ] Complete Task B4, then run `npm run typecheck` and confirm it passes.
- [ ] After Tasks B3 and B4 are complete, add `describe('transient shell timer consolidation')`.
- [ ] Test 1: `transient shell teardown occurs after the orchestrator close lifecycle timer`.
  - Use `renderHook` with `useMobileCardLifecycle` and `vi.useFakeTimers()`.
  - Build minimal props: `isMobileViewport=true`, `interactionMode` as a valid tap/mobile value from `LandingCardInteractionMode`, `mobileLifecycleState.phase='OPEN'` with `cardVariant` and a valid snapshot, `shellRef` pointing to a minimal DOM node containing a `[data-testid="landing-grid-card"]` element, and `dispatchInteraction` / `dispatchMobileLifecycle` as `vi.fn()`.
  - Trigger `beginMobileClose()`, then rerender with `mobileLifecycleState.phase='CLOSING'`.
  - Assert `mobileTransientShellState.mode` is not `'NONE'` immediately.
  - Advance fake timers by `MOBILE_EXPANDED_DURATION_MS - 1`.
  - Assert `mobileTransientShellState.mode` is still not `'NONE'`.
  - Advance fake timers by `1`.
  - Flush any pending RAF callbacks, including at least one RAF after the timer fires.
  - Assert `mobileTransientShellState.mode` is `'NONE'`.
- [ ] Test 2: `manual resetMobileRuntime clears transient shell synchronously without timers`.
  - Establish a non-`NONE` transient shell state via `beginMobileOpen()`.
  - Call `resetMobileRuntime()`.
  - Assert `mobileTransientShellState.mode === 'NONE'` without advancing any timer.
- [ ] Test 3: `use-mobile-transient-shell no longer exports clearMobileTransientShellTimer`.
  - Import `UseMobileTransientShellOutput` type from `use-mobile-transient-shell.ts`.
  - Assert that the type does not have a `clearMobileTransientShellTimer` property.
  - Use a TypeScript-level type assertion so this test documents the interface contract change and fails to compile if the property is reintroduced.
- [ ] Run after adding the three tests:

```bash
npm run typecheck
npm test -- --reporter=verbose tests/unit/landing-mobile-lifecycle.test.ts
```

Expected GREEN: both commands pass after Task B4. Run these tests before proceeding to Task B5.

### Task B3: Remove Independent Transient Shell Timer

**Files:**
- Modify: `src/features/landing/grid/use-mobile-transient-shell.ts`

- [ ] Remove `useEffect` and `useRef` imports if no longer used.
- [ ] Remove `MOBILE_EXPANDED_DURATION_MS` import.
- [ ] Remove `mobileTransientShellTimerRef`.
- [ ] Remove `clearMobileTransientShellTimer`.
- [ ] Remove the timeout inside `startMobileTransientShell`.
- [ ] Make `resetMobileTransientShell` set state synchronously only:

```typescript
const resetMobileTransientShell = useCallback(() => {
  setMobileTransientShellState(initialMobileTransientShellState);
}, []);
```

- [ ] Ensure `startMobileTransientShell` only sets the requested state.
- [ ] Remove `clearMobileTransientShellTimer` from `UseMobileTransientShellOutput` and the returned object.

### Task B4: Drive Teardown From Orchestrator Close Timer

**Files:**
- Modify: `src/features/landing/grid/use-mobile-card-lifecycle.ts`

- [ ] Remove `clearMobileTransientShellTimer` from destructuring.
- [ ] Remove `clearMobileTransientShellTimer()` from `clearMobileTimers`.
- [ ] Remove it from `clearMobileTimers` dependencies.
- [ ] Remove any `clearMobileTransientShellTimer()` call from `resetMobileRuntime`.
- [ ] In the CLOSING phase `useEffect`, inside the `window.setTimeout` callback after `mobileCloseTimerRef.current = null`, call `resetMobileTransientShell()` after restore-ready work:

```typescript
mobileCloseTimerRef.current = window.setTimeout(() => {
  mobileCloseTimerRef.current = null;
  if (cardVariant && snapshot) {
    cancelRestore = settleMobileCloseAfterRestore(cardVariant, snapshot);
    resetMobileTransientShell();
    return;
  }

  markMobileRestoreReady(cardVariant);
  resetMobileTransientShell();
}, MOBILE_EXPANDED_DURATION_MS);
```

- [ ] Include `resetMobileTransientShell` in that effect dependency array.
- [ ] Preserve the cleanup behavior:

```typescript
return () => {
  clearMobileCloseTimer();
  cancelRestore?.();
};
```

### Task B5: Re-verify CSS Contract Script Inputs

**Files:**
- Read-only: `scripts/qa/check-phase10-transition-contracts.mjs`
- Read-only: `src/features/landing/grid/landing-grid-card.module.css`

- [ ] Re-read `scripts/qa/check-phase10-transition-contracts.mjs`.
- [ ] Confirm the CSS still contains:
  - `.root.mobileTransientOpening`
  - `.root.mobileTransientClosing`
  - `.transientShell.transientOpening`
  - `.transientShell.transientClosing`
- [ ] Run:

```bash
node scripts/qa/check-phase10-transition-contracts.mjs
```

Expected: pass.

### Task B6: Verify Candidate 1

- [ ] Run Candidate 1 validation commands in order.
- [ ] Inspect screenshots from the B14 mobile close choreography and title continuity runs if generated by Playwright failure or report output.
- [ ] Treat any B14 failure as blocking regression.
- [ ] Treat any theme-matrix or GNB screenshot baseline diff as unexpected regression; do not update baselines.

---

## Documentation Update

### Task D1: Update `docs/project-analysis.md §5.1`

**Files:**
- Modify: `docs/project-analysis.md`

- [ ] Recompute affected line counts:

```bash
wc -l \
  src/features/landing/grid/use-mobile-card-lifecycle.ts \
  src/features/landing/grid/use-mobile-restore-polling.ts \
  src/features/landing/grid/use-mobile-transient-shell.ts \
  src/features/landing/grid/mobile-card-lifecycle-dom.ts
```

- [ ] Update `use-mobile-restore-polling.ts` description to remove direct DOM-helper dependency and add: `predicate injected from hub orchestrator`.
- [ ] If Candidate 1 completed, update `use-mobile-transient-shell.ts` description to note teardown is driven by the orchestrator's close timer.
- [ ] Update line counts for all affected files.
- [ ] Do not modify `docs/req-landing.md`.

---

## Final Completion Report Requirements

Use the user's requested markdown sections exactly:

```markdown
### Phase A — Candidate 2 result
- Files changed (with diff summary)
- Import direction confirmation: ...
- `landing-mobile-scroll-lock.test.ts` existence: Found / Not found
- New unit tests added: ...
- Commands run and results

### Phase B — Candidate 1 result (or skip reason)
- Animation duration finding ...
- Timer consolidation ...
- E2E B14 assertions ...
- Screenshot baseline ...
- Commands run and results

### Documentation updates applied
- Lines changed in `docs/project-analysis.md §5.1`

### Open items
- ...

### Context Restore
- Current Task: ...
- Last Known State: ...
- Key Decisions: ...
- Open Questions: ...
- Deferred Options: ...
- Files to Revisit: ...
- Recommended Next Step: ...
```

---

## Self-Review

- Spec coverage: Candidate 2 structural injection, import direction verification, scroll-lock test existence, Candidate 1 timer removal, animation safety precheck, CSS contract re-verification, E2E B14 regression, screenshot baseline expectation, and documentation updates are all represented.
- Placeholder scan: No implementation step relies on `TBD`, generic "write tests", or unspecified files.
- Type consistency: Uses existing names `isRestoreSettled`, `resetMobileTransientShell`, `settleMobileCloseAfterRestore`, `MOBILE_EXPANDED_DURATION_MS`, and `mobileTransientShellState.mode`.
- Scope guard: No prohibited files are planned for modification; `mobile-lifecycle.ts`, scroll-lock, backdrop gesture, and visual baselines remain unchanged.
