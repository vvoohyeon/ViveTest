### Screenshot diff disposition
- Pre-existing drift or Phase A regression: **Pre-existing drift**. I stashed Phase A and reran the focused state-smoke assertion; the same `expanded-focus-shell.png` diff reproduced before Phase A.
- Baseline action taken: Regenerated the ignored local `expanded-focus-shell-chromium-darwin.png` baseline using preview mode. The focused test then passed, and full `state-smoke.spec.ts` passed `15 passed`.
- Baseline provenance record updated: **Yes**, in `tests/e2e/theme-matrix-baseline-provenance.md`.

Note: `--grep "expanded-focus-shell"` matched no tests because the test title does not include the snapshot filename, so I reran the actual assertion title: `--grep "expanded keyboard focus boundary"`.

### Phase A — Candidate 2 final gate
- `npm run qa:gate:once` result after baseline resolution: **Fail**
- Passed before that failure: `typecheck`, `lint`, lifecycle unit test, scroll-lock unit test, `qa:rules`, `transition-telemetry-smoke`, `state-smoke`, and `grid-smoke`.
- Blocker: `qa:gate:once` failed in `theme-matrix-smoke.spec.ts` with **34 screenshot baseline diffs**, unrelated to the resolved `expanded-focus-shell.png` baseline. Representative diffs:
  - `theme-layout-landing-normal-en-dark-mobile.png`: `63577` pixels
  - `theme-layout-landing-normal-kr-dark-mobile.png`: `63746` pixels
  - `theme-layout-test-instruction-en-light-desktop-wide.png`: `3310` pixels
  - `theme-state-mobile-test-question-en-dark-mobile.png`: `23127` pixels
  - `theme-state-mobile-test-question-kr-light-mobile.png`: `25820` pixels

Per your instruction, I stopped here and did **not** start Phase B.

### Phase B — Candidate 1 result
- Task B0 — CSS position finding: Not run
- Task B0 — resetMobileTransientShell placement: Not run
- Task B1 — Default `--landing-card-motion-ms`: Not run
- Task B3 — TypeScript RED confirmed: No, not started
- Task B4 — `clearMobileTransientShellTimer` fully removed: No, not started
- Task B2 — Three GREEN tests added and passing: No, not started
- Task B5 — check-phase10 CSS contract: Not run
- Task B6 — Full gate: Not run
- B14 assertions: Not run for Phase B
- Screenshot baseline: Blocked by unrelated `theme-matrix` diffs during Phase A final gate

### Documentation updates applied
- `docs/project-analysis.md §5.1`: already updated for Phase A predicate injection and line counts.
- `tests/e2e/theme-matrix-baseline-provenance.md`: added the state-smoke local baseline adjudication entry for `expanded-focus-shell.png`.

### Open items
- Adjudicate the 34 `theme-matrix-smoke` baseline diffs from `qa:gate:once`.
- After `qa:gate:once` passes with Phase A code, resume at Phase B0.

### Context Restore
- Current Task: Mobile card lifecycle boundary audit, blocked before Phase B.
- Last Known State: Phase A implemented; `expanded-focus-shell.png` pre-existing drift resolved; `qa:gate:once` failed on unrelated theme-matrix baselines.
- Key Decisions: Phase A was not the cause of the state-smoke diff; Phase B remains gated behind a clean `qa:gate:once`.
- Open Questions: Should the 34 theme-matrix baseline diffs be treated as accepted pre-existing local drift and regenerated, or investigated as regressions?
- Deferred Options: Phase B timer consolidation.
- Recommended Next Step: Resolve the theme-matrix baseline diffs, rerun `npm run qa:gate:once`, then continue Phase B.
