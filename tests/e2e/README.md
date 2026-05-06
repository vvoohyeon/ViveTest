# E2E Local Setup

This directory contains the Playwright smoke coverage for routing, GNB, grid,
state, accessibility, transition, telemetry, theme-matrix, and WebKit ghosting
checks.

## Playwright Browser Installation

Install the browsers used by the local E2E smoke suite before running the full
smoke gate:

```bash
npx playwright install chromium webkit
```

The full E2E smoke run includes the WebKit ghosting project. If WebKit is not
installed, the 6 WebKit ghosting smoke cases fail because the browser executable
is missing.

WebKit build `webkit-2227` was verified locally on 2026-05-03.

## Theme-Matrix Local Baseline Regeneration

Theme-matrix baselines are excluded from git by `.gitignore`:

```text
tests/e2e/*-snapshots/
```

On a new machine, or when local baseline staleness is confirmed, regenerate the
theme-matrix baselines from the current preview build:

```bash
npm run qa:visual:full
```

After regeneration, update the tracked provenance record at:

```text
tests/e2e/theme-matrix-baseline-provenance.md
```

Include these fields:

- Date generated
- Git commit SHA from `git rev-parse HEAD`
- OS, Node version, and Playwright version
- Regeneration and gate verification commands/results
- Reason for regeneration

The PNG baselines remain local-only because they live under the ignored
`tests/e2e/*-snapshots/` folders. The provenance document is tracked so
distributed local environments can see the latest accepted regeneration and
gate verification result. The `@gate` tier is the reduced gate path, and
`npm run qa:visual:full` remains the full theme-matrix baseline regeneration
path.
