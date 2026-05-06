# Theme Matrix Baseline Provenance

This tracked document records the latest shared theme-matrix baseline regeneration
and verification result. The PNG baselines themselves remain local-only under
`tests/e2e/*-snapshots/`.

- Date generated: 2026-05-06 22:31:08 KST
- Git commit SHA: 736f0762cddb38d273f23fec303ad693bebae4ab
- Working tree note: generated with R-06 path-only relocation changes present
- OS: macOS 26.5 (25F71)
- Node version: v24.2.0
- Playwright version: 1.57.0
- Regeneration command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run qa:visual:full`
- Regeneration result: `288 passed`
- Gate verification command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:gate`
- Gate verification result: `126 passed`
- Reason for regeneration: Promote current R-06 rendering after diagnosing 35
  theme-matrix `@gate` screenshot mismatches as local baseline/provenance drift.
  Deferred visual improvements are recorded in
  `docs/plans/2026-05-06-theme-matrix-visual-improvement-followup.md`.
