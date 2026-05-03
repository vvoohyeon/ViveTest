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
PLAYWRIGHT_SERVER_MODE=preview \
npx playwright test tests/e2e/theme-matrix-smoke.spec.ts \
  --update-snapshots \
  --reporter=line
```

After regeneration, write a local provenance record at:

```text
tests/e2e/theme-matrix-smoke.spec.ts-snapshots/BASELINE_PROVENANCE.md
```

Include these fields:

- Date generated
- Git commit SHA from `git rev-parse HEAD`
- OS, Node version, and Playwright version
- Reason for regeneration

This provenance file is local-only because it lives beside the ignored PNG
baselines. T-01 will replace this with a durable CI artifact based baseline
workflow.
