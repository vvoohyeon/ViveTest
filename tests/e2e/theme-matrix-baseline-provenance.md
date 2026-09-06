# Theme Matrix Baseline Provenance

This tracked document records the latest shared theme-matrix baseline regeneration
and verification result. The PNG baselines themselves remain local-only under
`tests/e2e/*-snapshots/`.

- Date generated: 2026-05-07 13:55:06 KST
- Git commit SHA: 9b5e62e3f28b633687d7bc22f7cec34301e8a9f5
- Working tree note: generated with visual-improvement token changes present
- OS: macOS 26.4.1 (25E253)
- Node version: v22.18.0
- Playwright version: 1.57.0
- Regeneration command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run qa:visual:full`
- Regeneration result: `288 passed`
- Gate verification command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:gate`
- Gate verification result: `126 passed`
- Reason for regeneration: Accept visual-improvement baseline for dark
  unavailable treatment, landing expanded answer contrast, and disabled Next
  affordance. Implementation notes are recorded in
  `docs/done/2026-05-07-theme-matrix-visual-improvement-followup.md`.

## Theme Matrix Baseline Regeneration 2026-05-11

- Date generated: 2026-05-11 KST
- Git commit SHA: 4a2cf8b4a84620deca8e948e7bfbcc81a86b3947
- Working tree note: Phase A predicate injection refactor committed (commit 90bfaee); 34 pre-existing theme-matrix diffs confirmed — Phase A is structural-only (no DOM/CSS output change) and cannot cause visual regressions.
- OS: macOS Darwin 25.4.0
- Node version: v22.18.0
- Playwright version: 1.57.0
- Regeneration command: `npm run qa:visual:full`
- Regeneration result: `288 passed`
- Reason for regeneration: 34 pre-existing local theme-matrix baseline drifts resolved; Phase A predicate injection refactor confirmed as structural-only with no visual change. Baselines were stale since 2026-05-07 (SHA 9b5e62e).

## Theme Matrix Baseline Regeneration 2026-05-13

- Date generated: 2026-05-13 KST
- Git commit SHA: 0870bbb3a647af185611ccbb9217c79eb8d99859
- Working tree note: Prompt 2 UX/UI implementation present; unrelated shared-surface diffs were classified as preview/dev-runtime environment drift, with no Prompt 2 regression confirmed.
- OS: macOS 26.4.1 (25E253), Darwin 25.4.0 arm64
- Node version: v22.18.0
- Playwright version: 1.57.0
- Regeneration command: `npm run qa:visual:full`
- Regeneration result: `288 passed`
- Theme-matrix rerun command: `npx playwright test tests/e2e/theme-matrix-smoke.spec.ts` against a preview server on port 4173
- Theme-matrix rerun result: `288 passed`
- Gate verification command: `npm run qa:rules`; `npm run lint && npm run typecheck && npm test && npm run build`
- Gate verification result: `qa:rules` passed; lint passed; typecheck passed; `npm test` passed with 381 tests; build passed.
- Reason for regeneration: Prompt 2 UX/UI pass — accepted pre-existing drift accumulated since last regeneration; no Prompt 2 regression confirmed.

## Theme Matrix Baseline Regeneration 2026-05-17

- Date generated: 2026-05-17 KST
- Git commit SHA: 09d7503eca67831284ade9dfe4ce35710f213dd9
- Working tree note: qualifier-reentry-ui implementation present (uncommitted; plan `docs/done/2026-05-16-qualifier-reentry-ui.md`). Theme-matrix test states use `qmbti` (no qualifier/profile): the reentry chip is guarded off (`qualifierItems.length === 0`), the §8f profile filter is a no-op, the §8-D4/Q-F1 `instructionVisible` change is a strict superset (`overlayMode` always `entry`), and the §8-D14 result-panel extraction reproduces byte-identical class strings — so qmbti DOM is unchanged vs pre-change. The pre-regen @gate showed ~117 broad ~1% sub-pixel diffs spanning blog/landing/history-menu and test surfaces (no shared code path to this change); post-regen only 6 PNGs were byte-different, all `theme-layout-test-instruction-kr-*` (Korean instruction-overlay text-wrap across 3 viewports × 2 themes), confirming preview/dev-runtime environment drift, not a qualifier-reentry regression.
- OS: macOS 26.5 (25F71), Darwin 25.5.0 arm64
- Node version: v24.2.0
- Playwright version: 1.57.0
- Regeneration command: `npm run qa:visual:full`
- Regeneration result: `288 passed`
- Gate verification command: `npm run test:e2e:gate`
- Gate verification result: `126 passed`
- Reason for regeneration: qualifier-reentry-ui implementation pass — accepted pre-existing environment drift accumulated since 2026-05-13 (SHA 0870bbb). No qualifier-reentry regression: change diff scope is telemetry + test-feature + `src/messages` + tests only (zero shared code with the drifted blog/landing/history surfaces); qmbti theme-matrix DOM is byte-identical. User-authorized §4 baseline regeneration.

## State Smoke Local Baseline Adjudication

- Date generated: 2026-05-10 10:10:20 KST
- Git commit SHA: 76df1aca2f3040a013ac5e73c4a00c36c45d2839
- Working tree note: Phase A predicate injection refactor present; verified the
  `expanded-focus-shell.png` diff also reproduced before Phase A by stashing the
  refactor and rerunning the focused state-smoke assertion.
- OS: macOS Darwin 25.5.0 arm64
- Node version: v24.2.0
- Playwright version: 1.57.0
- Regeneration command:
  `PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/state-smoke.spec.ts --project=chromium --grep "expanded keyboard focus boundary"`
- Regeneration result: `1 passed`
- Gate verification command:
  `npx playwright test tests/e2e/state-smoke.spec.ts --project=chromium`
- Gate verification result: `15 passed`
- Reason for regeneration: Pre-existing local baseline drift resolved;
  `expanded-focus-shell.png` baseline regenerated after Phase A predicate
  injection refactor, which is structural only and has no intended visual output
  change.
