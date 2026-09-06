# Landing Namespace Relocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in this session. Do not use subagents, automated multi-wave execution, or implementation pipelines; the project instructions require one approved unit at a time.

**Goal:** Move non-landing-only modules out of `src/features/landing/` into independent feature namespaces while preserving runtime behavior.

**Architecture:** This is a path-only refactor: move tracked files, update imports and QA hardcoded path strings, delete obsolete compatibility/data directories, and synchronize active documentation. No re-export shim is left behind at the old paths, and no function implementation, type shape, storage key value, or runtime contract is changed.

**Tech Stack:** Next.js 16.2.4, React 19.2.4, TypeScript 5.9.3, Vitest, Playwright, custom `scripts/qa/*.mjs` contract checks.

---

## Plan Mode Trigger

Plan mode is active because the task touches:

- High-Risk paths: `src/features/landing/gnb/site-gnb.tsx`, `src/features/landing/shell/page-shell.tsx`, `src/features/landing/telemetry/consent-source.ts`, and `src/features/landing/transition/**`.
- Ask-First paths: `scripts/qa/*.mjs`.
- SSOT-linked areas: landing GNB/theme, transition/telemetry/consent, blog destination, and variant-registry/data boundary references.

## Relevant SSOT Contracts

- `docs/req-landing.md §6-11`: GNB, layout, a11y, responsive, performance contracts.
- `docs/req-landing.md §8, §12, §13`: transition trigger, telemetry payload/consent, transition rollback and GNB swap contracts.
- `docs/req-landing.md §12.6`: generated runtime registry and resolver/adapter boundary.
- `docs/req-test.md §2`: source topology and fixture/registry consumer boundary.
- `docs/project-analysis.md §3, §5.2, §5.3, §5.4, §5.5, §5.6, §8, §9`: current architecture and task entry references that must match the moved files.
- `docs/agent-guides/project-rules.md §Ownership`, `§VariantRegistry`, `§Blog-Telemetry-Theme`: ownership and contract routing.
- `docs/agent-guides/verification-commands.md §landing`, `§telemetry`, `§variant-registry`: scope-specific verification anchors.

## Impact Assessment

- Shared components (shell/GNB): `PageShell` continues to mount `SiteGnb` and `TransitionGnbOverlay`; only import targets change. Risk dimensions: usability, a11y, responsiveness, design system consistency.
- Localization: route files, GNB locale switcher, telemetry, and blog server model keep existing locale APIs. No locale set or message key changes.
- A11y: GNB keyboard/focus behavior remains the same; Playwright GNB/a11y smoke coverage stays in the regression gate.
- State contracts: transition pending state, ingress, return-scroll, telemetry consent state, storage key values, and correlation ID generation stay unchanged.
- Core user flow: landing -> blog/test transition, blog detail redirect, telemetry consent gating, and test entry flow are expected to be behaviorally identical.

## Decisions Requiring User Confirmation Before Execution

Approval of this plan confirms:

- Delete `src/features/landing/data/**` because the directory exists and `src/` has no `@/features/landing/data` consumers.
- Remove the untracked `src/features/landing/gnb/.DS_Store` artifact if it is the only thing keeping the old GNB directory present after tracked files are moved.
- Update active project-maintenance docs beyond the requested `docs/project-analysis.md` where required by `AGENTS.md §9`: `AGENTS.md`, `docs/agent-guides/project-rules.md`, and the one stale `docs/req-test.md §2` reference to `src/features/landing/data`.
- Treat the final acceptance command order as the task-requested order: `typecheck` -> `lint` -> `test` -> `qa:rules` -> `build`. Targeted RED/GREEN checks may run before that final sequence.

## Files To Move

### GNB

- Move: `src/features/landing/gnb/behavior.ts` -> `src/features/gnb/behavior.ts`
- Move: `src/features/landing/gnb/components/index.ts` -> `src/features/gnb/components/index.ts`
- Move: `src/features/landing/gnb/components/settings-controls.tsx` -> `src/features/gnb/components/settings-controls.tsx`
- Move: `src/features/landing/gnb/components/theme-mode-icon.tsx` -> `src/features/gnb/components/theme-mode-icon.tsx`
- Move: `src/features/landing/gnb/hooks/index.ts` -> `src/features/gnb/hooks/index.ts`
- Move: `src/features/landing/gnb/hooks/theme-transition.ts` -> `src/features/gnb/hooks/theme-transition.ts`
- Move: `src/features/landing/gnb/hooks/use-gnb-back-navigation.ts` -> `src/features/gnb/hooks/use-gnb-back-navigation.ts`
- Move: `src/features/landing/gnb/hooks/use-gnb-capability.ts` -> `src/features/gnb/hooks/use-gnb-capability.ts`
- Move: `src/features/landing/gnb/hooks/use-gnb-desktop-settings.ts` -> `src/features/gnb/hooks/use-gnb-desktop-settings.ts`
- Move: `src/features/landing/gnb/hooks/use-gnb-mobile-menu.ts` -> `src/features/gnb/hooks/use-gnb-mobile-menu.ts`
- Move: `src/features/landing/gnb/hooks/use-keyboard-mode-tracker.ts` -> `src/features/gnb/hooks/use-keyboard-mode-tracker.ts`
- Move: `src/features/landing/gnb/hooks/use-theme-preference.ts` -> `src/features/gnb/hooks/use-theme-preference.ts`
- Move: `src/features/landing/gnb/index.ts` -> `src/features/gnb/index.ts`
- Move: `src/features/landing/gnb/site-gnb.tsx` -> `src/features/gnb/site-gnb.tsx`
- Move: `src/features/landing/gnb/types.ts` -> `src/features/gnb/types.ts`

### Telemetry

- Move: `src/features/landing/telemetry/consent-source.ts` -> `src/features/telemetry/consent-source.ts`
- Move: `src/features/landing/telemetry/runtime.ts` -> `src/features/telemetry/runtime.ts`
- Move: `src/features/landing/telemetry/types.ts` -> `src/features/telemetry/types.ts`
- Move: `src/features/landing/telemetry/validation.ts` -> `src/features/telemetry/validation.ts`

### Transition

- Move: `src/features/landing/transition/constants.ts` -> `src/features/transition/constants.ts`
- Move: `src/features/landing/transition/runtime.ts` -> `src/features/transition/runtime.ts`
- Move: `src/features/landing/transition/signals.ts` -> `src/features/transition/signals.ts`
- Move: `src/features/landing/transition/store.ts` -> `src/features/transition/store.ts`
- Move: `src/features/landing/transition/transition-gnb-overlay.tsx` -> `src/features/transition/transition-gnb-overlay.tsx`
- Move: `src/features/landing/transition/transition-runtime-monitor.tsx` -> `src/features/transition/transition-runtime-monitor.tsx`
- Move: `src/features/landing/transition/use-landing-transition.ts` -> `src/features/transition/use-landing-transition.ts`
- Move: `src/features/landing/transition/use-pending-landing-transition.ts` -> `src/features/transition/use-pending-landing-transition.ts`

### Blog

- Move: `src/features/landing/blog/blog-destination-client.tsx` -> `src/features/blog/blog-destination-client.tsx`
- Move: `src/features/landing/blog/server-model.ts` -> `src/features/blog/server-model.ts`

### Correlation ID

- Move: `src/features/landing/lib/correlation-id.ts` -> `src/lib/correlation-id.ts`
- Delete old `src/features/landing/lib/` if empty after the move.

### Landing Data Compatibility Directory

- Delete: `src/features/landing/data/adapter.ts`
- Delete: `src/features/landing/data/fixture-contract.ts`
- Delete: `src/features/landing/data/index.ts`
- Delete: `src/features/landing/data/types.ts`
- Delete old `src/features/landing/data/` directory.

## Files To Modify

### Source Imports And Comments

- Modify: `src/app/[locale]/layout.tsx`
- Modify: `src/app/[locale]/blog/page.tsx`
- Modify: `src/app/[locale]/blog/[variant]/page.tsx`
- Modify: `src/app/api/telemetry/route.ts`
- Modify: `src/app/vercel-analytics-gate.tsx`
- Modify: `src/app/vercel-speed-insights-gate.tsx`
- Modify: `src/features/blog/blog-destination-client.tsx` after move
- Modify: `src/features/gnb/index.ts` after move
- Modify: `src/features/gnb/site-gnb.tsx` after move
- Modify: `src/features/gnb/components/index.ts` after move
- Modify: `src/features/gnb/components/settings-controls.tsx` after move
- Modify: `src/features/gnb/hooks/index.ts` after move
- Modify: `src/features/gnb/hooks/use-gnb-back-navigation.ts` after move
- Modify: `src/features/gnb/hooks/use-gnb-desktop-settings.ts` after move
- Modify: `src/features/gnb/hooks/use-gnb-mobile-menu.ts` after move
- Modify: `src/features/gnb/hooks/use-theme-preference.ts` after move
- Modify: `src/features/landing/grid/landing-catalog-grid.tsx`
- Modify: `src/features/landing/grid/landing-catalog-grid-loader.tsx`
- Modify: `src/features/landing/grid/use-landing-interaction-controller.ts`
- Modify: `src/features/landing/landing-runtime.tsx`
- Modify: `src/features/landing/shell/page-shell.tsx`
- Modify: `src/features/landing/shell/telemetry-consent-banner.tsx`
- Modify: `src/features/landing/storage/storage-keys.ts` comments only, to keep owner-path documentation accurate.
- Modify: `src/features/telemetry/consent-source.ts` after move
- Modify: `src/features/telemetry/runtime.ts` after move
- Modify: `src/features/telemetry/validation.ts` after move
- Modify: `src/features/test/entry-policy.ts`
- Modify: `src/features/test/test-question-client.tsx`
- Modify: `src/features/transition/runtime.ts` after move
- Modify: `src/features/transition/signals.ts` after move
- Modify: `src/features/transition/transition-gnb-overlay.tsx` after move
- Modify: `src/features/transition/transition-runtime-monitor.tsx` after move
- Modify: `src/features/transition/use-landing-transition.ts` after move
- Modify: `src/features/transition/use-pending-landing-transition.ts` after move
- Modify: `src/features/variant-registry/attribute.ts`
- Modify: `src/features/variant-registry/resolvers.ts`

### Unit Test Imports

- Modify: `tests/unit/blog-server-model.test.ts`
- Modify: `tests/unit/gnb-back-navigation.test.ts`
- Modify: `tests/unit/gnb-behavior.test.ts`
- Modify: `tests/unit/gnb-desktop-settings.test.ts`
- Modify: `tests/unit/gnb-mobile-menu.test.ts`
- Modify: `tests/unit/gnb-theme-transition.test.ts`
- Modify: `tests/unit/landing-runtime.test.ts`
- Modify: `tests/unit/landing-telemetry-runtime.test.ts`
- Modify: `tests/unit/landing-telemetry-validation.test.ts`
- Modify: `tests/unit/landing-transition-runtime.test.ts`
- Modify: `tests/unit/landing-transition-store.test.ts`
- Modify: `tests/unit/telemetry-consent-banner.test.ts`
- Modify: `tests/unit/vercel-analytics-gate.test.ts`
- Modify: `tests/unit/vercel-speed-insights-gate.test.ts`

### QA Scripts

- Modify: `scripts/qa/check-phase8-accessibility-contracts.mjs`
- Modify: `scripts/qa/check-phase9-performance-contracts.mjs`
- Modify: `scripts/qa/check-phase10-transition-contracts.mjs`
- Modify: `scripts/qa/check-phase11-telemetry-contracts.mjs`
- Modify: `scripts/qa/check-variant-registry-contracts.mjs`
- Modify: `scripts/qa/check-variant-only-contracts.mjs`

### Documentation

- Modify: `AGENTS.md`
- Modify: `docs/agent-guides/project-rules.md`
- Modify: `docs/project-analysis.md`
- Modify: `docs/req-test.md`
- Modify: `docs/plans/2026-05-06-landing-namespace-relocation.md` after implementation to record actual outcome, deviations, and gate results.

## Import And Path Replacement Rules

- Replace `@/features/landing/gnb` with `@/features/gnb`.
- Replace `@/features/landing/telemetry/` with `@/features/telemetry/`.
- Replace `@/features/landing/transition/` with `@/features/transition/`.
- Replace `@/features/landing/blog/` with `@/features/blog/`.
- Replace `@/features/landing/lib/correlation-id` with `@/lib/correlation-id`.
- Replace test relative imports from `../../src/features/landing/gnb/` with `../../src/features/gnb/`.
- Replace test relative imports from `../../src/features/landing/telemetry/` with `../../src/features/telemetry/`.
- Replace test relative imports from `../../src/features/landing/transition/` with `../../src/features/transition/`.
- Replace test relative imports from `../../src/features/landing/blog/` with `../../src/features/blog/`.
- Replace QA path strings `src/features/landing/gnb/` with `src/features/gnb/`.
- Replace QA path strings `src/features/landing/telemetry/` with `src/features/telemetry/`.
- Replace QA path strings `src/features/landing/transition/` with `src/features/transition/`.
- Replace QA path strings `src/features/landing/blog/` with `src/features/blog/`.
- Replace QA path string `src/features/landing/lib/correlation-id.ts` with `src/lib/correlation-id.ts`.
- Replace `src/features/landing/data/*` QA scan entries with direct `src/features/variant-registry/*` entries that already own those re-exported contracts.

## Task 1: RED - Update Static Contract Checks To Expect New Paths

**Files:**

- Modify: `scripts/qa/check-phase8-accessibility-contracts.mjs`
- Modify: `scripts/qa/check-phase9-performance-contracts.mjs`
- Modify: `scripts/qa/check-phase10-transition-contracts.mjs`
- Modify: `scripts/qa/check-phase11-telemetry-contracts.mjs`
- Modify: `scripts/qa/check-variant-registry-contracts.mjs`
- Modify: `scripts/qa/check-variant-only-contracts.mjs`

- [ ] Replace the hardcoded path strings in those QA scripts according to the replacement rules above.
- [ ] Run the targeted contract checks before moving source files:

```bash
node scripts/qa/check-phase8-accessibility-contracts.mjs
node scripts/qa/check-phase9-performance-contracts.mjs
node scripts/qa/check-phase10-transition-contracts.mjs
node scripts/qa/check-phase11-telemetry-contracts.mjs
node scripts/qa/check-variant-registry-contracts.mjs
node scripts/qa/check-variant-only-contracts.mjs
```

Expected RED result: at least one check fails with missing required files under `src/features/gnb`, `src/features/telemetry`, `src/features/transition`, `src/features/blog`, or `src/lib/correlation-id.ts`. If these checks pass before files move, stop and inspect whether a prior partial move already happened.

## Task 2: Move Files And Remove Obsolete Directories

**Files:**

- Move every file listed in **Files To Move**.
- Delete every file listed in **Landing Data Compatibility Directory**.
- Remove the old moved directories when empty.

- [ ] Use `git mv` for tracked file moves so history remains visible.
- [ ] Do not create re-export shim files under `src/features/landing/gnb`, `src/features/landing/telemetry`, `src/features/landing/transition`, `src/features/landing/blog`, or `src/features/landing/lib`.
- [ ] Remove `src/features/landing/gnb/.DS_Store` if it remains as the only obstacle to removing `src/features/landing/gnb/`.
- [ ] Confirm the excluded paths still exist in place when applicable:

```bash
test -d src/features/landing/grid
test -d src/features/landing/model
test -d src/features/landing/shell
test -d src/features/landing/storage
test -f src/features/landing/landing-runtime.tsx
```

## Task 3: Update Source Imports

**Files:** every file listed under **Source Imports And Comments**.

- [ ] Apply the replacement rules to all moved module internals and all consumers under `src/`.
- [ ] Keep `src/features/landing/storage/storage-keys.ts` in place; update only owner-path comments that point to moved modules.
- [ ] Do not modify `src/features/test/**` runtime logic; only update imports in `entry-policy.ts` and `test-question-client.tsx`.
- [ ] Run:

```bash
rg -n "@/features/landing/(gnb|telemetry|transition|blog|lib/correlation-id|data)" src
```

Expected GREEN result: no matches.

## Task 4: Update Unit Test Imports

**Files:** every file listed under **Unit Test Imports**.

- [ ] Apply the test relative import replacement rules.
- [ ] Run:

```bash
rg -n "features/landing/(gnb|telemetry|transition|blog|lib/correlation-id|data)" tests
```

Expected GREEN result: no matches.

## Task 5: Update Active Documentation

**Files:**

- Modify: `AGENTS.md`
- Modify: `docs/agent-guides/project-rules.md`
- Modify: `docs/project-analysis.md`
- Modify: `docs/req-test.md`
- Modify: `docs/plans/2026-05-06-landing-namespace-relocation.md`

- [ ] In `AGENTS.md`, update High-Risk path references and Gold Standards for telemetry validation and transition runtime to their new namespaces.
- [ ] In `docs/agent-guides/project-rules.md`, split the ownership row so `src/features/landing/**` owns landing grid/model/shell/storage orchestration while `src/features/gnb/**`, `src/features/telemetry/**`, `src/features/transition/**`, and `src/features/blog/**` own their independent concerns.
- [ ] In `docs/project-analysis.md`, update the requested sections `§3.1`, `§3.2`, `§8`, and `§9`, and also update stale active references in `§2`, `§5.2`, `§5.3`, `§5.4`, `§5.5`, and `§5.6` so the document does not contradict itself.
- [ ] In `docs/req-test.md §2`, replace the stale `src/features/landing/data` compatibility-directory wording with the current direct `src/features/variant-registry` boundary.
- [ ] In this plan, append an implementation outcome section with files changed, data-directory decision, verification results, and any deviations.

## Task 6: GREEN - Run Targeted Contract Checks

**Files:** no new edits unless a path miss is found.

- [ ] Run the targeted RED checks again:

```bash
node scripts/qa/check-phase8-accessibility-contracts.mjs
node scripts/qa/check-phase9-performance-contracts.mjs
node scripts/qa/check-phase10-transition-contracts.mjs
node scripts/qa/check-phase11-telemetry-contracts.mjs
node scripts/qa/check-variant-registry-contracts.mjs
node scripts/qa/check-variant-only-contracts.mjs
```

Expected GREEN result: all targeted checks pass.

- [ ] Run the scope-specific anchors from `docs/agent-guides/verification-commands.md` that correspond to landing/GNB, telemetry/transition, and variant registry if the targeted checks or final gates indicate a path miss:

```bash
node scripts/qa/check-phase4-grid-contracts.mjs
node scripts/qa/check-phase5-card-contracts.mjs
node scripts/qa/check-phase6-spacing-contracts.mjs
node scripts/qa/check-phase7-state-contracts.mjs
npm test -- \
  tests/unit/landing-interaction-dom.test.ts \
  tests/unit/landing-hover-intent.test.ts \
  tests/unit/landing-mobile-lifecycle.test.ts \
  tests/unit/landing-desktop-shell-phase.test.ts \
  tests/unit/landing-grid-plan.test.ts \
  tests/unit/landing-baseline-manager.test.ts \
  tests/unit/gnb-behavior.test.ts \
  tests/unit/gnb-desktop-settings.test.ts \
  tests/unit/gnb-mobile-menu.test.ts \
  tests/unit/gnb-back-navigation.test.ts \
  tests/unit/gnb-theme-transition.test.ts
npm test -- \
  tests/unit/landing-telemetry-validation.test.ts \
  tests/unit/landing-telemetry-runtime.test.ts \
  tests/unit/landing-transition-runtime.test.ts \
  tests/unit/landing-transition-store.test.ts
node scripts/qa/check-variant-registry-contracts.mjs
node scripts/qa/check-variant-only-contracts.mjs
npm test -- \
  tests/unit/landing-data-contract.test.ts \
  tests/unit/landing-card-contract.test.ts \
  tests/unit/registry-serializer.test.ts \
  tests/unit/variant-registry-runtime-integrity.test.ts
npx playwright test \
  tests/e2e/gnb-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts \
  tests/e2e/consent-smoke.spec.ts \
  tests/e2e/transition-telemetry-smoke.spec.ts
```

## Task 7: Final Acceptance Verification

**Files:** no new edits unless a verification failure reveals a missed path update.

- [ ] Confirm required old directories are gone and new directories/files exist:

```bash
test ! -d src/features/landing/gnb
test ! -d src/features/landing/telemetry
test ! -d src/features/landing/transition
test ! -d src/features/landing/blog
test ! -d src/features/landing/data
test -d src/features/gnb
test -d src/features/telemetry
test -d src/features/transition
test -d src/features/blog
test -f src/lib/correlation-id.ts
```

- [ ] Confirm no source import references old paths:

```bash
rg -n "@/features/landing/(gnb|telemetry|transition|blog|lib/correlation-id|data)" src
```

Expected result: no matches.

- [ ] Run the final user-requested gate sequence:

```bash
npm run typecheck
npm run lint
npm test
npm run qa:rules
npm run build
```

Expected result: all commands pass with zero errors.

## Self-Review Checklist

- [ ] No re-export shim remains at old `src/features/landing/*` paths.
- [ ] `src/features/test/**` logic is untouched except import path updates.
- [ ] `grid/`, `model/`, `shell/`, `storage/`, and `landing-runtime.tsx` remain under `src/features/landing/`.
- [ ] No external packages are added.
- [ ] No runtime function implementation, type definition, or constant value is changed.
- [ ] `scripts/qa/run-all.mjs` still lists the same 12 QA scripts.
- [ ] `docs/archive/**` and historical `docs/plans/**` files are not rewritten for path churn.

## Implementation Outcome (2026-05-06)

### Files changed

- Moved GNB files from `src/features/landing/gnb/**` to `src/features/gnb/**`.
- Moved telemetry files from `src/features/landing/telemetry/**` to `src/features/telemetry/**`.
- Moved transition files from `src/features/landing/transition/**` to `src/features/transition/**`.
- Moved blog destination files from `src/features/landing/blog/**` to `src/features/blog/**`.
- Moved correlation ID utilities from `src/features/landing/lib/correlation-id.ts` to `src/lib/correlation-id.ts`.
- Updated source imports, unit-test imports, QA hardcoded path strings, and active docs.
- Updated `src/features/landing/storage/storage-keys.ts` owner-path comments only.

### Data-directory decision

- Removed the obsolete `src/features/landing/data/**` compatibility directory.
- No re-export shim was left under old `src/features/landing/*` namespaces.
- Consumers now use the direct `src/features/variant-registry` resolver/types boundary.

### Verification results

- RED check before moves: updated targeted QA scripts failed on missing new-path files under `src/features/gnb`, `src/features/transition`, `src/features/telemetry`, `src/features/blog`, and `src/lib/correlation-id.ts`.
- GREEN targeted checks after moves:
  - `node scripts/qa/check-phase8-accessibility-contracts.mjs`
  - `node scripts/qa/check-phase9-performance-contracts.mjs`
  - `node scripts/qa/check-phase10-transition-contracts.mjs`
  - `node scripts/qa/check-phase11-telemetry-contracts.mjs`
  - `node scripts/qa/check-variant-registry-contracts.mjs`
  - `node scripts/qa/check-variant-only-contracts.mjs`
- Directory assertions passed for removed old directories and new namespace existence.
- Old import scans passed with no matches:
  - `rg -n "@/features/landing/(gnb|telemetry|transition|blog|lib/correlation-id|data)" src`
  - `rg -n "features/landing/(gnb|telemetry|transition|blog|lib/correlation-id|data)" tests`
- Final acceptance gates passed in approved order:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test` — 53 files / 306 tests passed
  - `npm run qa:rules` — all 12 checks passed
  - `npm run build`
- High-risk Playwright regression subset passed:
  - `npx playwright test tests/e2e/gnb-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts tests/e2e/consent-smoke.spec.ts tests/e2e/transition-telemetry-smoke.spec.ts` — 58 passed

### Deviations

- Ran the focused Playwright subset even though targeted/final gates did not reveal a path miss, to satisfy the High-Risk browser regression requirement.
- The Playwright web server emitted existing `NO_COLOR`/`FORCE_COLOR` warnings and hydration-mismatch logs during stale-pending-transition scenarios, but the Playwright runner completed green.
- No external packages were added.
- No runtime implementation, type shape, storage key value, or telemetry/transition contract was intentionally changed.
