# Theme Matrix Baseline Provenance

This tracked document records the latest shared theme-matrix baseline regeneration
and verification result. The PNG baselines themselves remain local-only under
`tests/e2e/*-snapshots/`.

- Date generated: 2026-05-06 11:05:32 KST
- Git commit SHA: 45e6654f61ba3158b1627b2187af183ab6744850
- OS: macOS 26.4.1 (25E253)
- Node version: v22.18.0
- Playwright version: 1.57.0
- Regeneration command: `npm run qa:visual:full`
- Regeneration result: `288 passed`
- Gate verification command: `npm run test:e2e:gate`
- Gate verification result: `126 passed`
- Reason for regeneration: Refresh local theme-matrix baselines after introducing
  the reduced `@gate` tier and confirming prior local baseline drift.
