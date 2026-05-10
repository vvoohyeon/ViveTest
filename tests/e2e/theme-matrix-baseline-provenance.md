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
  `docs/plans/2026-05-07-theme-matrix-visual-improvement-followup.md`.

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
