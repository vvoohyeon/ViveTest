## Amendments to the Implementation Plan

The following corrections and additions apply to
`docs/plans/2026-05-10-mobile-card-lifecycle-boundary-audit.md`.
Read the existing plan first, then apply each amendment before writing any code.

---

### Amendment 1 — Redefine Task B2 test strategy (Critical)

**Problem:** The plan expects Task B2 tests to be RED under the current code. They are not.
`use-mobile-transient-shell.ts` already uses `MOBILE_EXPANDED_DURATION_MS = 280ms` for
its independent timer. `vi.advanceTimersByTime(280)` will cause the existing independent
timer to expire and set `mode === 'NONE'`, making the test GREEN before any code change.
This is a structural refactoring without observable timing change, so RED-GREEN TDD does
not apply to the timer consolidation tests.

**Correction — revised Task B2:**

Replace the Task B2 instructions with the following:

(1) Do NOT write RED tests before Task B3. Instead, implement Task B3 first (remove the
independent timer from `use-mobile-transient-shell.ts`). The TypeScript compiler will
produce an error in `use-mobile-card-lifecycle.ts` where `clearMobileTransientShellTimer`
is destructured from the hook output — this is the RED signal confirming the
interface change landed. Resolve the TypeScript error by completing Task B4.

(2) After Tasks B3 and B4 are complete and `npm run typecheck` passes, THEN add the
following tests to `tests/unit/landing-mobile-lifecycle.test.ts` as GREEN verification:

  describe('transient shell timer consolidation') {
    test 1: 'transient shell teardown occurs after the orchestrator close lifecycle timer'
      - Use renderHook with useMobileCardLifecycle and vi.useFakeTimers().
      - Build minimal props: isMobileViewport=true, interactionMode as a valid tap/mobile
        value from LandingCardInteractionMode, mobileLifecycleState.phase='OPEN' with
        cardVariant and a valid snapshot, shellRef pointing to a minimal DOM node
        containing a [data-testid="landing-grid-card"] element, dispatchInteraction and
        dispatchMobileLifecycle as vi.fn().
      - Trigger beginMobileClose(), then rerender with mobileLifecycleState.phase='CLOSING'.
      - Assert mobileTransientShellState.mode is NOT 'NONE' immediately.
      - Advance fake timers by MOBILE_EXPANDED_DURATION_MS - 1.
      - Assert mobileTransientShellState.mode is still NOT 'NONE'.
      - Advance fake timers by 1.
      - Flush any pending RAF callbacks (at least one RAF after timer fires).
      - Assert mobileTransientShellState.mode IS 'NONE'.

    test 2: 'manual resetMobileRuntime clears transient shell synchronously without timers'
      - Establish a non-NONE transient shell state via beginMobileOpen().
      - Call resetMobileRuntime().
      - Assert mobileTransientShellState.mode === 'NONE' without advancing any timer.

    test 3: 'use-mobile-transient-shell no longer exports clearMobileTransientShellTimer'
      - Import UseMobileTransientShellOutput type from use-mobile-transient-shell.ts.
      - Assert that the type does NOT have a clearMobileTransientShellTimer property.
      - Use TypeScript-level type assertion: this test exists to document the interface
        contract change and will fail to compile if the property is re-introduced.
  }

(3) Run these tests AFTER B4 and confirm all three pass.

---

### Amendment 2 — Add pre-condition check for transient shell CSS position before Task B4 (High)

**Problem:** Task B4 calls resetMobileTransientShell() synchronously immediately after
settleMobileCloseAfterRestore(). The restore polling's RAF callbacks call
isMobileSnapshotRestoreSettled(), which measures card height and title position via
getBoundingClientRect(). If the transient shell element influences the card's bounding box
(e.g. via position:relative, changing card height), resetting the shell state before the
first RAF runs could produce incorrect settled readings.

**Insert a new Task B0 before Task B1:**

  Task B0: Confirm transient shell CSS isolation from card bounding box

  - Read landing-grid-card.module.css.
  - Locate the CSS rule for [data-slot="mobileTransientShell"] or the equivalent class.
  - Confirm the element uses position: absolute or position: fixed (NOT position: relative
    or position: static with layout impact).
  - Confirm it does NOT add height to the card root element's bounding box.

  If the transient shell IS in normal flow and affects the card bounding box:
    DO NOT call resetMobileTransientShell() synchronously in the close timer callback.
    Instead, call resetMobileTransientShell() inside markMobileRestoreReady(), after
    dispatchMobileLifecycle({type: 'RESTORE_READY'}) and before the RAF for CLOSE_SETTLED.
    Update Task B4 accordingly and add a note to the completion report.

  If the transient shell is position: absolute or fixed (does NOT affect card bounding box):
    Proceed with Task B4 as written. The synchronous resetMobileTransientShell() call is safe.

  Record the finding in the completion report under "Phase B — Candidate 1 result".

---

### Amendment 3 — Narrow the CSS animation duration check in Task B1 (Medium)

**Problem:** The plan checks whether landing-card-detail-quiet-exit duration is ≤ 280ms.
However, --landing-card-motion-ms is overridden to 180ms in reduced-motion mode. Reading
the reduced-motion override would pass the check even if the full-motion value exceeds 280ms.

**Correction to Task B1:**

Replace the existing B1 CSS check with the following:

  - Read landing-grid-card.module.css.
  - Locate the :root { } or equivalent block (NOT the @media (prefers-reduced-motion) block).
  - Read the DEFAULT value of --landing-card-motion-ms as defined in the non-reduced-motion
    context.
  - Read the landing-card-detail-quiet-exit @keyframes rule and confirm the animation-duration
    property resolves to the default --landing-card-motion-ms value.
  - If the default value is <= 280ms: proceed with Phase B.
  - If the default value is > 280ms: stop Phase B and report "Phase B skipped —
    animation duration conflict. Default --landing-card-motion-ms is Xms which exceeds
    MOBILE_EXPANDED_DURATION_MS 280ms."
  - Do NOT use the @media (prefers-reduced-motion) value as the basis for this check.

---

### Amendment 4 — Add Prohibited Changes section (Low)

Add the following section to the implementation plan immediately after "Impact Assessment":

  ## Prohibited Changes

  These items must not be touched during this implementation session:

  - mobile-lifecycle.ts (state machine / reducer) — frozen.
  - use-mobile-scroll-lock.ts — healthy boundary, no changes.
  - use-mobile-backdrop-gesture.ts — healthy boundary, no changes.
  - mobile-card-lifecycle-dom.ts — read-only; do not merge into interaction-dom.ts.
  - MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX — do not unify with GNB mobile menu behavior.
  - Any visual screenshot baseline files (*.png under tests/e2e/*-snapshots/).
    Do not run --update-snapshots. If a baseline diff appears, treat it as a regression.
  - docs/req-test-plan.md — pre-existing unrelated worktree modification; do not touch.
  - docs/req-landing.md — mobile lifecycle timing is an implementation detail not described
    at spec level; no changes needed.
  - src/features/gnb/ — no changes; outside scope.

---

### Unchanged sections

All other sections of the plan remain as written:
- Task A1 (RED tests for predicate injection): correct. The RED signal here IS real —
  adding isRestoreSettled to the input interface creates a TypeScript error before A2.
- Task A2, A3, A4: correct.
- Task B3 (remove timer from use-mobile-transient-shell.ts): correct.
- Task B5 (re-verify CSS contract script): correct.
- Task B6 (E2E verification): correct; treat any B14 assertion failure as blocking.
- Task D1 (documentation update): correct.
- Completion report format: correct; use as specified.

---

### Verification command addition for Amendment 1, Test 3

After adding the three B2 tests, run:

  npm run typecheck
  npm test -- --reporter=verbose tests/unit/landing-mobile-lifecycle.test.ts

Both must pass before proceeding to Task B5.

---

### Summary of Amendment priority

| # | Severity | Task affected | Action |
|---|---|---|---|
| 1 | Critical | B2 | Reorder: implement B3 first, then add GREEN tests after B4 |
| 2 | High | B4 (new B0 pre-check) | Confirm transient shell CSS isolation before calling reset |
| 3 | Medium | B1 | Use default (non-reduced-motion) CSS variable value only |
| 4 | Low | Plan structure | Add Prohibited Changes section |
