## Resolve Theme-Matrix Baseline Drift and Complete Phase B Timer Consolidation

Resolve the 34 theme-matrix baseline diffs blocking `qa:gate:once`, confirm Phase A is
clean, then complete Phase B (timer consolidation) and the final Done gate.

---

## Step 1 — Determine whether the theme-matrix diffs predate Phase A

Phase A is a purely structural change: a predicate function is now injected via a hook
parameter instead of imported inside a sub-module. It produces no DOM, CSS, or React
state output difference. The theme-matrix diffs are therefore almost certainly pre-existing
local baseline drift, not a Phase A regression. Verify this before any baseline action.

```bash
git stash
npm run qa:visual:full 2>&1 | tail -20
git stash pop
```

- If the same 34 diffs appear **before** Phase A: pre-existing drift confirmed.
  Proceed to Step 2.
- If the diffs disappear **before** Phase A: Phase A caused a visual regression.
  Stop immediately. Report which files differ, what component is affected, and the
  approximate pixel region. Do NOT update any baseline and do NOT start Phase B.

---

## Step 2 — Pre-existing drift confirmed: regenerate theme-matrix baselines

Follow the regeneration procedure documented in `tests/e2e/README.md` exactly.
Use the preview-mode command if specified; do NOT use `--update-snapshots` in headless
mode unless README.md explicitly permits it.

After regeneration:

```bash
npm run qa:visual:full
```

Expected: 0 diffs. If any diff remains after regeneration, stop and report the
remaining file names and pixel counts.

Update `tests/e2e/theme-matrix-baseline-provenance.md` with:
- Date: today
- Reason: 34 pre-existing local theme-matrix baseline drifts regenerated; Phase A
  predicate injection refactor confirmed as structural-only with no visual change
- SHA: current HEAD

---

## Step 3 — Confirm Phase A final gate

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

All must pass. If `qa:gate:once` fails for any reason other than the now-resolved
baselines, stop and report before starting Phase B.

---

## Step 4 — Phase B: timer consolidation

Start only after Step 3 `qa:gate:once` passes.

### B0 — Confirm transient shell CSS bounding-box isolation

Read `src/features/landing/grid/landing-grid-card.module.css`.
Find the rule applying to `[data-slot="mobileTransientShell"]` or its module class.

- If `position: absolute` or `position: fixed` (does NOT add height to card root):
  `resetMobileTransientShell()` may be called synchronously inside the close timer
  callback. Use the inline placement in B4.
- If in normal flow and affects the card bounding box:
  `resetMobileTransientShell()` must be called inside `markMobileRestoreReady()`, after
  `dispatchMobileLifecycle({type: 'RESTORE_READY'})` and before the CLOSE_SETTLED RAF.
  Pass it as an optional `onRestoreReady?: () => void` parameter to
  `useMobileRestorePolling` to avoid a cross-cluster dependency. Adjust B4 accordingly.

Record this finding. It determines the exact placement in B4.

### B1 — Confirm animation duration safety

Read `src/features/landing/grid/landing-grid-card.module.css`.
Read the DEFAULT value of `--landing-card-motion-ms` from the `:root {}` block only.
Do NOT use the `@media (prefers-reduced-motion)` override value.
Confirm `landing-card-detail-quiet-exit` animation-duration resolves to this default.

- If default > 280ms: stop Phase B. Report: "Phase B skipped — animation duration
  conflict. Default `--landing-card-motion-ms` is Xms, exceeds 280ms."
- If default ≤ 280ms: proceed.

### B3 — Remove the independent timer from `use-mobile-transient-shell.ts`

This produces the TypeScript RED signal for Phase B.

Changes to `src/features/landing/grid/use-mobile-transient-shell.ts`:
- Remove `mobileTransientShellTimerRef` (`useRef` for the auto-reset timeout)
- Remove `clearMobileTransientShellTimer` callback
- Remove `MOBILE_EXPANDED_DURATION_MS` import if now unused
- Remove `useRef` import if now unused
- Remove the `window.setTimeout` inside `startMobileTransientShell`
- Remove the `useEffect` cleanup for `clearMobileTransientShellTimer`
- Make `resetMobileTransientShell` synchronous state-only:
```typescript
  const resetMobileTransientShell = useCallback(() => {
    setMobileTransientShellState(initialMobileTransientShellState);
  }, []);
```
- `startMobileTransientShell` now only calls `setMobileTransientShellState`
- Remove `clearMobileTransientShellTimer` from `UseMobileTransientShellOutput` and
  the return value

Confirm RED:
```bash
npm run typecheck
```
Expected: TypeScript error on `clearMobileTransientShellTimer` in
`use-mobile-card-lifecycle.ts`. If no error appears, the output interface was not
actually modified — check and report.

### B4 — Drive teardown from the orchestrator close timer

Changes to `src/features/landing/grid/use-mobile-card-lifecycle.ts`:
- Remove `clearMobileTransientShellTimer` from the destructured output of
  `useMobileTransientShell()`
- Remove all calls to `clearMobileTransientShellTimer()` wherever they appear
  (`clearMobileTimers`, `resetMobileRuntime`, any `useCallback` dependency array)

In the CLOSING phase `useEffect`, apply the placement rule from B0:

**If position: absolute/fixed (safe for synchronous call):**
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

**If in normal flow (must not call before restore polling):**
Pass `onRestoreReady: resetMobileTransientShell` into `useMobileRestorePolling` and call
it inside `markMobileRestoreReady` after `dispatchMobileLifecycle({type: 'RESTORE_READY'})`.
The close timer callback itself does NOT call `resetMobileTransientShell()`.

Preserve the cleanup return unchanged:
```typescript
return () => {
  clearMobileCloseTimer();
  cancelRestore?.();
};
```

Add `resetMobileTransientShell` to the CLOSING `useEffect` dependency array.

Confirm GREEN:
```bash
npm run typecheck
npm run lint
```
Both must pass before continuing.

### B2 — Add GREEN verification tests

Add to `tests/unit/landing-mobile-lifecycle.test.ts` after the existing
`useMobileRestorePolling` describe block:

```typescript
describe('transient shell timer consolidation', () => {
  it('transient shell teardown occurs after the orchestrator close lifecycle timer', async () => {
    // Build a minimal shellRef with a card DOM node
    const shellEl = document.createElement('section');
    const cardEl = document.createElement('div');
    cardEl.setAttribute('data-testid', 'landing-grid-card');
    cardEl.setAttribute('data-card-variant', 'qmbti');
    shellEl.appendChild(cardEl);
    const shellRef = createRef<HTMLElement | null>();
    shellRef.current = shellEl;

    const dispatchInteraction = vi.fn();
    const dispatchMobileLifecycle = vi.fn();
    const snapshot = createMobileSnapshot();
    const openState: LandingMobileLifecycleState = {
      phase: 'OPEN',
      cardVariant: 'qmbti',
      snapshot,
      queuedClose: false,
      snapshotWriteCount: 1,
      restoreReady: false
    };

    const {result, rerender} = renderHook(
      (props) => useMobileCardLifecycle(props),
      {
        initialProps: {
          interactionMode: 'tap' as LandingCardInteractionMode,
          interactionState: {expandedCardVariant: 'qmbti'} as LandingInteractionState,
          dispatchInteraction,
          mobileLifecycleState: openState,
          dispatchMobileLifecycle,
          isMobileViewport: true,
          shellRef,
          clearHoverTimer: vi.fn()
        }
      }
    );

    act(() => { result.current.beginMobileClose(); });

    const closingState: LandingMobileLifecycleState = {
      ...openState,
      phase: 'CLOSING'
    };
    rerender({
      interactionMode: 'tap' as LandingCardInteractionMode,
      interactionState: {expandedCardVariant: null} as LandingInteractionState,
      dispatchInteraction,
      mobileLifecycleState: closingState,
      dispatchMobileLifecycle,
      isMobileViewport: true,
      shellRef,
      clearHoverTimer: vi.fn()
    });

    expect(result.current.mobileTransientShellState.mode).not.toBe('NONE');

    act(() => { vi.advanceTimersByTime(MOBILE_EXPANDED_DURATION_MS - 1); });
    expect(result.current.mobileTransientShellState.mode).not.toBe('NONE');

    act(() => { vi.advanceTimersByTime(1); });
    act(() => { flushNextRaf(); });

    expect(result.current.mobileTransientShellState.mode).toBe('NONE');
  });

  it('manual resetMobileRuntime clears transient shell synchronously without timers', () => {
    const shellEl = document.createElement('section');
    const shellRef = createRef<HTMLElement | null>();
    shellRef.current = shellEl;
    const dispatchMobileLifecycle = vi.fn();
    const normalState = initialLandingMobileLifecycleState;

    const {result} = renderHook(() =>
      useMobileCardLifecycle({
        interactionMode: 'tap' as LandingCardInteractionMode,
        interactionState: {expandedCardVariant: null} as LandingInteractionState,
        dispatchInteraction: vi.fn(),
        mobileLifecycleState: normalState,
        dispatchMobileLifecycle,
        isMobileViewport: true,
        shellRef,
        clearHoverTimer: vi.fn()
      })
    );

    // Force a non-NONE transient shell state via beginMobileOpen
    act(() => { result.current.beginMobileOpen('qmbti', false); });
    expect(result.current.mobileTransientShellState.mode).not.toBe('NONE');

    act(() => { result.current.resetMobileRuntime(); });
    expect(result.current.mobileTransientShellState.mode).toBe('NONE');
  });

  it('clearMobileTransientShellTimer is not part of the hook output type', () => {
    type Output = ReturnType<typeof useMobileTransientShell>;
    type HasTimer = 'clearMobileTransientShellTimer' extends keyof Output ? true : false;
    const check: HasTimer = false;
    expect(check).toBe(false);
  });
});
```

Add the missing import at the top of the test file:
```typescript
import {useMobileTransientShell} from '../../src/features/landing/grid/use-mobile-transient-shell';
import type {LandingMobileLifecycleState} from '../../src/features/landing/grid/mobile-lifecycle';
import type {LandingCardInteractionMode, LandingInteractionState} from ...
```
(Use the exact import paths already present in the file for those types.)

```bash
npm run typecheck
npm test -- --reporter=verbose tests/unit/landing-mobile-lifecycle.test.ts
```
All three new tests must pass.

### B5 — Re-verify CSS contract script

```bash
node scripts/qa/check-phase10-transition-contracts.mjs
```
Expected: pass. Confirm `landing-grid-card.module.css` still contains all four patterns:
`.root.mobileTransientOpening`, `.root.mobileTransientClosing`,
`.transientShell.transientOpening`, `.transientShell.transientClosing`.

### B6 — Full Candidate 1 gate

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
npx playwright test tests/e2e/transition-telemetry-smoke.spec.ts \
  --project=chromium --grep "B14"
```

- Any B14 assertion failure is a blocking regression. Stop and report.
- Any unexpected screenshot baseline diff is a blocking regression.
  Do NOT update baselines. Report the file name and pixel count.

---

## Step 5 — Documentation update

```bash
wc -l \
  src/features/landing/grid/use-mobile-card-lifecycle.ts \
  src/features/landing/grid/use-mobile-restore-polling.ts \
  src/features/landing/grid/use-mobile-transient-shell.ts \
  src/features/landing/grid/mobile-card-lifecycle-dom.ts
```

Update `docs/project-analysis.md §5.1`:
- Update line counts for all four files
- `use-mobile-restore-polling.ts`: remove mention of direct DOM-helper dependency;
  add "predicate injected from hub orchestrator"
- `use-mobile-transient-shell.ts`: add "no independent auto-reset timer; teardown
  driven by orchestrator's close timer via `resetMobileTransientShell()`"

---

## Step 6 — Final Done gate

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All four must pass.

---

## Prohibited Changes

- `mobile-lifecycle.ts` — frozen, do not touch
- `use-mobile-scroll-lock.ts`, `use-mobile-backdrop-gesture.ts` — healthy boundaries
- `mobile-card-lifecycle-dom.ts` — do not merge into `interaction-dom.ts`
- Any `*.png` baseline file during Phase B — do not run `--update-snapshots`
- `docs/req-landing.md`, `docs/req-test-plan.md` — do not modify

---

## Completion Report Format

```markdown
### Theme-matrix baseline disposition
- Pre-existing drift confirmed (stash test): Yes / No
- Baselines regenerated: Yes / skipped (regression found)
- Provenance record updated: Yes / No

### Phase A final gate
- `npm run qa:gate:once` result: Pass / Fail

### Phase B — Candidate 1 result
- B0 — Transient shell CSS position: [value] / affects bounding box: Yes / No
- B0 — resetMobileTransientShell placement chosen: [close timer / markMobileRestoreReady]
- B1 — Default --landing-card-motion-ms: [value]ms / Phase B: proceed / skipped
- B3 — TypeScript RED confirmed: Yes / No
- B4 — clearMobileTransientShellTimer fully removed: Yes / No
- B2 — Three GREEN tests added and passing: Yes / No
- B5 — check-phase10 CSS contract: Pass / Fail
- B6 — Full gate: Pass / Fail
- B14 assertions: [list each tag: pass / fail]
- Screenshot baseline: No unexpected diffs / [file + pixel count]

### Documentation updates applied
- docs/project-analysis.md §5.1: [summary of changes]

### Final Done gate
- lint / typecheck / test / build: Pass / Fail

### Open items
- [Any issue not in the original plan]
```
