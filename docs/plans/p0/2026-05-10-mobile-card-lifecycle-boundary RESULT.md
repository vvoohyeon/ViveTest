### Phase A — Candidate 2 result

- Files changed: `use-mobile-restore-polling.ts` now receives `isRestoreSettled`; `use-mobile-card-lifecycle.ts` injects `isMobileSnapshotRestoreSettled`; `landing-mobile-lifecycle.test.ts` adds restore-polling predicate injection coverage.
- Import direction confirmation: `use-mobile-restore-polling.ts` now imports only `mobile-lifecycle.ts` from the landing grid cluster; no `mobile-card-lifecycle-dom.ts` sibling import remains.
- `landing-mobile-scroll-lock.test.ts` existence: Found.
- New unit tests added: 3 predicate-injection tests covering immediate settled, max-attempt fallback, and RAF cancellation.
- Commands passed: `npm run typecheck`, `npm run lint`, lifecycle unit test, scroll-lock unit test, `npm run qa:rules`, and `transition-telemetry-smoke.spec.ts` on Chromium. B14 assertions inside that transition smoke run passed.

### Phase B — Candidate 1 result (or skip reason)

- Phase B not started.
- Skip reason: Candidate 2 verification hit a blocking screenshot baseline diff in `npx playwright test tests/e2e/state-smoke.spec.ts --project=chromium`.
- I reran the failing test alone; it failed consistently on `expanded-focus-shell.png` with `32255` differing pixels.
- Screenshot baseline: no baselines were updated. Actual/diff artifacts are under `test-results/state-smoke-Phase-7-state--1e001-s-the-visible-overlay-shell-chromium/`.

### Documentation updates applied

- `docs/plans/2026-05-10-mobile-card-lifecycle-boundary-audit.md` was amended with all four requested changes.
- `docs/project-analysis.md §5.1` was updated for the completed Phase A line counts and predicate-injection ownership note.

### Open items

- Resolve or explicitly adjudicate the existing `expanded-focus-shell.png` visual diff before Phase B.
- After Candidate 2 fully passes, resume at Phase B0/B1 prechecks, then B3/B4/B2 in the amended order.

### Context Restore

- Current Task: Mobile card lifecycle boundary audit implementation.
- Last Known State: Phase A code implemented; Candidate 2 verification blocked at `state-smoke` screenshot diff after earlier gates passed.
- Key Decisions: B2 RED tests were not written; amended plan uses the TypeScript interface-removal RED signal for Phase B.
- Open Questions: Is the `expanded-focus-shell.png` diff an accepted baseline drift or a real regression to fix first?
- Deferred Options: Phase B timer consolidation, B0 CSS isolation check, B1 default motion-duration check.
- Files to Revisit: `tests/e2e/state-smoke.spec.ts-snapshots/expanded-focus-shell-chromium-darwin.png`, generated `test-results/.../expanded-focus-shell-{actual,diff}.png`, then `use-mobile-transient-shell.ts` and `use-mobile-card-lifecycle.ts`.
- Recommended Next Step: Decide the visual diff disposition, then rerun Candidate 2 `state-smoke` before continuing to Phase B.
