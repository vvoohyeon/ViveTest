## Resolve State-Smoke Visual Diff, Then Proceed to Phase B Timer Consolidation

Phase A (Candidate 2 — predicate injection) is complete. Before starting Phase B, you
must resolve a blocking screenshot baseline diff in `state-smoke.spec.ts`. Then proceed
to Phase B (Candidate 1 — timer consolidation) as defined in the amended implementation
plan at `docs/plans/2026-05-10-mobile-card-lifecycle-boundary-audit.md`.

---

## Step 1 — Determine whether the visual diff predates Phase A

Phase A changes are purely structural: a function reference is now injected via a hook
parameter instead of being imported directly inside `use-mobile-restore-polling.ts`.
This change produces no DOM output difference, no CSS change, and no React state
change. Therefore the `expanded-focus-shell.png` diff (32255 pixels) is almost certainly
a pre-existing baseline drift, not a Phase A regression. Verify this before any other action.

Run the following in order:

1. Stash or branch the Phase A changes temporarily so you can run `state-smoke` on the
   previous baseline:

```bash
   git stash
   npx playwright test tests/e2e/state-smoke.spec.ts --project=chromium \
     --grep "expanded-focus-shell"
   git stash pop
```

   - If the test ALSO fails on the pre-Phase-A code: the diff is pre-existing. The
     baseline was already stale. Proceed to Step 2a.
   - If the test PASSES on the pre-Phase-A code: Phase A introduced an unexpected visual
     change. Stop immediately. Report the discrepancy in detail — what changed, which
     component, what the diff shows — and do NOT proceed to Phase B until this is
     understood.

2. Confirm the diff artifact location so you can inspect it:

```bash
   ls test-results/state-smoke-Phase-7-state--1e001-s-the-visible-overlay-shell-chromium/
```

   Open or describe the actual vs expected screenshots to understand what visual area
   changed (overlay opacity, shadow, border, color token, or layout shift).

---

## Step 2a — Pre-existing drift confirmed: adjudicate and re-baseline

If Step 1 confirms the diff predates Phase A, do the following:

1. Read `tests/e2e/state-smoke.spec.ts` and locate the `expanded-focus-shell` snapshot
   assertion. Confirm what component or state it captures (the keyboard-mode expanded
   overlay shell).

2. Check `tests/e2e/README.md` for the official baseline regeneration procedure:

```bash
   cat tests/e2e/README.md
```

3. Run the preview-mode baseline regeneration command as documented in README.md.
   Do NOT use `--update-snapshots` directly in Chromium headless mode unless README.md
   explicitly permits it. If README.md specifies `PLAYWRIGHT_SERVER_MODE=preview`, use that.

4. After regeneration, run:

```bash
   npx playwright test tests/e2e/state-smoke.spec.ts --project=chromium
```

   Expected: pass. If it fails again, stop and report.

5. Record the baseline update in `tests/e2e/theme-matrix-baseline-provenance.md` (or
   wherever README.md says baseline changes are tracked) with:
   - Date: today
   - Reason: pre-existing drift resolved; expanded-focus-shell baseline regenerated after
     Phase A predicate injection refactor (structural only, no visual change intended)
   - SHA: current HEAD

6. Run the full Candidate 2 gate to confirm Phase A is clean:

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

   All must pass before Phase B starts. If `qa:gate:once` fails for any reason other
   than the now-resolved baseline, stop and report.

---

## Step 2b — Phase A caused an unexpected visual regression: stop and report

If Step 1 shows the diff does NOT exist before Phase A, do NOT proceed. Report:
- Which file change caused the visual diff
- What component is affected in `expanded-focus-shell.png`
- The approximate pixel region of the diff (top-left area, opacity, border, etc.)
- Whether the change is in a CSS file, a React state output, or a DOM attribute

Do not update any baseline and do not start Phase B.

---

## Step 3 — Proceed to Phase B (after Step 2a gate passes)

Once `npm run qa:gate:once` passes with Phase A code, proceed to Phase B as defined in
the amended plan. The amendments supersede any conflicting instructions in the original plan.

**Phase B entry checklist (verify before writing any code):**

- [ ] `npm run qa:gate:once` passed with Phase A code in place
- [ ] `expanded-focus-shell.png` baseline is current and committed (or staged)
- [ ] `docs/plans/2026-05-10-mobile-card-lifecycle-boundary-audit.md` open for reference

**Phase B task order (from the amended plan):**

Execute in strict order. Do not skip or reorder.

1. **Task B0** — Confirm transient shell CSS position and bounding box isolation.
   Read `src/features/landing/grid/landing-grid-card.module.css`.
   Find the CSS rule applying to `[data-slot="mobileTransientShell"]` or its module
   class equivalent. Confirm:
   - The element uses `position: absolute` or `position: fixed`
   - It does NOT add height to the card root's bounding box in normal document flow
   
   If it IS in normal flow and affects bounding box:
     `resetMobileTransientShell()` must be called inside `markMobileRestoreReady()`
     (after RESTORE_READY dispatch, before the CLOSE_SETTLED RAF), NOT in the close
     timer callback. Adjust Task B4 accordingly.
   
   If it is `position: absolute` or `fixed`:
     The synchronous `resetMobileTransientShell()` call in the close timer callback is safe.
   
   Record this finding. You will need it in Task B4.

2. **Task B1** — Confirm animation duration safety.
   Read `src/features/landing/grid/landing-grid-card.module.css`.
   Locate the `:root {}` block (NOT `@media (prefers-reduced-motion)`).
   Read the DEFAULT value of `--landing-card-motion-ms` from the non-reduced-motion context.
   Confirm `landing-card-detail-quiet-exit` animation-duration resolves to this default value.
   
   If default `--landing-card-motion-ms` > 280ms:
     Stop Phase B. Report: "Phase B skipped — animation duration conflict.
     Default --landing-card-motion-ms is Xms which exceeds MOBILE_EXPANDED_DURATION_MS 280ms."
   
   If default <= 280ms: proceed.

3. **Task B3** — Remove the independent timer from `use-mobile-transient-shell.ts`.
   This step is the RED signal for Phase B. After B3, `npm run typecheck` will fail
   because `use-mobile-card-lifecycle.ts` still destructures `clearMobileTransientShellTimer`
   from the hook output. That TypeScript error IS the expected RED state. Do not fix it
   until Task B4.
   
   Changes:
   - Remove `mobileTransientShellTimerRef` (the `useRef` for the auto-reset timeout)
   - Remove `clearMobileTransientShellTimer` callback and its `useRef` import if unused
   - Remove `MOBILE_EXPANDED_DURATION_MS` import if it is now unused in this file
   - Remove the `window.setTimeout` call inside `startMobileTransientShell`
   - Remove the `useEffect` cleanup that called `clearMobileTransientShellTimer`
   - Make `resetMobileTransientShell` synchronous state-only:
```typescript
     const resetMobileTransientShell = useCallback(() => {
       setMobileTransientShellState(initialMobileTransientShellState);
     }, []);
```
   - `startMobileTransientShell` now only calls `setMobileTransientShellState({mode, cardVariant, snapshot})`
   - Remove `clearMobileTransientShellTimer` from `UseMobileTransientShellOutput` and the return value
   
   Confirm RED:
```bash
   npm run typecheck
```
   Expected: TypeScript error referencing `clearMobileTransientShellTimer` in
   `use-mobile-card-lifecycle.ts`. If no error appears, check that the return type was
   actually modified and report.

4. **Task B4** — Drive transient shell teardown from the orchestrator close timer.
   File: `src/features/landing/grid/use-mobile-card-lifecycle.ts`
   
   - Remove `clearMobileTransientShellTimer` from the destructured output of
     `useMobileTransientShell()`
   - Remove all calls to `clearMobileTransientShellTimer()` (from `clearMobileTimers`,
     `resetMobileRuntime`, and anywhere else it appears)
   - Remove `clearMobileTransientShellTimer` from all `useCallback` dependency arrays
   
   In the CLOSING phase `useEffect`, update the `window.setTimeout` callback using the
   placement rule determined in Task B0:
   
   IF transient shell does NOT affect card bounding box (position: absolute/fixed):
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
   
   IF transient shell IS in normal flow and affects card bounding box:
   Do NOT call `resetMobileTransientShell()` in the close timer callback.
   Instead, open `use-mobile-restore-polling.ts` and call `resetMobileTransientShell()`
   inside `markMobileRestoreReady`, after `dispatchMobileLifecycle({type: 'RESTORE_READY'})`
   and before the RAF that dispatches `CLOSE_SETTLED`. To do this without creating a
   cross-cluster dependency, pass `onRestoreReady?: () => void` as an optional input to
   `useMobileRestorePolling` and call it inside `markMobileRestoreReady` at that position.
   
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
   Both must pass.

5. **Task B2** — Add GREEN verification tests (NOT red-first for this phase).
   Add to `tests/unit/landing-mobile-lifecycle.test.ts`:
   
```typescript
   describe('transient shell timer consolidation') {
```
   
   Test 1: `'transient shell teardown occurs after the orchestrator close lifecycle timer'`
   - Use `renderHook` with `useMobileCardLifecycle` and `vi.useFakeTimers()`
   - Build minimal props: `isMobileViewport: true`, a valid `interactionMode` string from
     `LandingCardInteractionMode`, `mobileLifecycleState.phase: 'OPEN'` with `cardVariant`
     and `snapshot`, `shellRef.current` pointing to a minimal DOM node containing a
     `[data-testid="landing-grid-card"]` element with `data-card-variant` attribute,
     `dispatchInteraction` and `dispatchMobileLifecycle` as `vi.fn()`
   - Call `beginMobileClose()`
   - Rerender with `mobileLifecycleState.phase: 'CLOSING'` (same `cardVariant` and `snapshot`)
   - Assert `mobileTransientShellState.mode` is NOT `'NONE'` immediately
   - `act(() => { vi.advanceTimersByTime(MOBILE_EXPANDED_DURATION_MS - 1); })`
   - Assert `mobileTransientShellState.mode` is still NOT `'NONE'`
   - `act(() => { vi.advanceTimersByTime(1); })`
   - Flush any pending RAF via `act(() => { flushNextRaf(); })`
   - Assert `mobileTransientShellState.mode` IS `'NONE'`
   
   Test 2: `'manual resetMobileRuntime clears transient shell synchronously without timers'`
   - Establish a non-NONE transient shell by calling `beginMobileOpen()`
   - Call `act(() => { result.current.resetMobileRuntime(); })`
   - Assert `mobileTransientShellState.mode === 'NONE'` without advancing timers
   
   Test 3: `'use-mobile-transient-shell no longer exports clearMobileTransientShellTimer'`
   - Add as a TypeScript-level compile assertion:
```typescript
     import type {UseMobileTransientShellOutput} from
       '../../src/features/landing/grid/use-mobile-transient-shell';
     it('clearMobileTransientShellTimer is not part of the hook output type', () => {
       type HasTimer = 'clearMobileTransientShellTimer' extends
         keyof UseMobileTransientShellOutput ? true : false;
       const check: HasTimer = false;
       expect(check).toBe(false);
     });
```
   
   Run:
```bash
   npm run typecheck
   npm test -- --reporter=verbose tests/unit/landing-mobile-lifecycle.test.ts
```
   All three tests must pass.

6. **Task B5** — Re-verify CSS contract script:
```bash
   node scripts/qa/check-phase10-transition-contracts.mjs
```
   Expected: pass. Confirm the four CSS class patterns still exist in
   `landing-grid-card.module.css`:
   `.root.mobileTransientOpening`, `.root.mobileTransientClosing`,
   `.transientShell.transientOpening`, `.transientShell.transientClosing`

7. **Task B6** — Full Candidate 1 gate:
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
   
   - Any B14 assertion failure is a blocking regression. Do not continue.
   - Any unexpected screenshot baseline diff is a blocking regression. Do not update
     baselines. Report the diff with pixel count and affected file name.

---

## Step 4 — Documentation update (after Phase B passes)

Run:
```bash
wc -l \
  src/features/landing/grid/use-mobile-card-lifecycle.ts \
  src/features/landing/grid/use-mobile-restore-polling.ts \
  src/features/landing/grid/use-mobile-transient-shell.ts \
  src/features/landing/grid/mobile-card-lifecycle-dom.ts
```

Update `docs/project-analysis.md §5.1`:
- Update line counts for all four files
- For `use-mobile-restore-polling.ts`: remove mention of direct DOM-helper dependency;
  add "predicate injected from hub orchestrator"
- For `use-mobile-transient-shell.ts`: add "teardown driven by orchestrator's close timer;
  no independent auto-reset timer"

---

## Final Done gate

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

---

## Prohibited Changes

Do not touch any of the following regardless of what you find during Phase B:
- `mobile-lifecycle.ts` (state machine — frozen)
- `use-mobile-scroll-lock.ts`
- `use-mobile-backdrop-gesture.ts`
- `mobile-card-lifecycle-dom.ts` (do not merge into `interaction-dom.ts`)
- Any `*.png` baseline file — do not run `--update-snapshots` in Phase B
- `docs/req-landing.md`
- `docs/req-test-plan.md` (pre-existing unrelated worktree modification)

---

## Completion Report Format

```markdown
### Screenshot diff disposition
- Pre-existing drift or Phase A regression: [answer]
- Baseline action taken: [regenerated / no action needed / blocked]
- Baseline provenance record updated: Yes / No

### Phase A — Candidate 2 final gate
- `npm run qa:gate:once` result after baseline resolution: Pass / Fail

### Phase B — Candidate 1 result
- Task B0 — CSS position finding: [position value] / [affects bounding box: Yes/No]
- Task B0 — resetMobileTransientShell placement: [in close timer / in markMobileRestoreReady]
- Task B1 — Default --landing-card-motion-ms: [value]ms — Phase B [proceed/skipped]
- Task B3 — TypeScript RED confirmed: Yes / No
- Task B4 — clearMobileTransientShellTimer fully removed: Yes / No
- Task B2 — Three GREEN tests added and passing: Yes / No
- Task B5 — check-phase10 CSS contract: Pass / Fail
- Task B6 — Full gate: Pass / Fail
- B14 assertions: [list each tag and pass/fail]
- Screenshot baseline: No unexpected diffs / [diff file + pixel count]

### Documentation updates applied
- Lines changed in docs/project-analysis.md §5.1: [summary]

### Open items
- [Any issue discovered not in the original plan]

### Context Restore
- Current Task: [...]
- Last Known State: [...]
- Key Decisions: [...]
- Open Questions: [...]
- Deferred Options: [...]
- Recommended Next Step: [...]
```
