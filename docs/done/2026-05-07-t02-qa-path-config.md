# T-02 QA Scripts Path Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task after explicit user approval. Parallel agents are prohibited for this task by repo instructions.

**Goal:** Move shared file-path string literals used by the QA contract scripts into `scripts/qa/_path-config.mjs` without changing QA logic, regexes, or failure messages.

**Architecture:** Add one QA-local ESM config module that exports named path groups. Each affected QA script imports only the path groups it consumes and replaces repeated path literals with config references. Single-source paths explicitly called out by the request remain inline.

**Tech Stack:** Node ESM QA scripts, existing `scripts/qa/_utils.mjs`, Vitest via `npm test`.

---

## Startup And Baseline

- Root `AGENTS.md` was read on 2026-05-07.
- `.planning/STATE.md` was not present.
- No child `AGENTS.md` exists under `scripts/`.
- Relevant docs read: `docs/agent-guides/verification-commands.md`, `docs/agent-guides/project-rules.md §Directory Ownership`, `docs/project-analysis.md §7.3`.
- Pre-work baseline already executed: `npm run qa:rules`
- Baseline result: all 12 QA scripts passed:
  - `check-phase1-contracts.mjs`
  - `check-phase4-grid-contracts.mjs`
  - `check-phase5-card-contracts.mjs`
  - `check-phase6-spacing-contracts.mjs`
  - `check-phase7-state-contracts.mjs`
  - `check-phase8-accessibility-contracts.mjs`
  - `check-phase9-performance-contracts.mjs`
  - `check-phase10-transition-contracts.mjs`
  - `check-phase11-telemetry-contracts.mjs`
  - `check-variant-registry-contracts.mjs`
  - `check-variant-only-contracts.mjs`
  - `check-blocker-traceability.mjs`

## Files To Be Modified

- Create: `scripts/qa/_path-config.mjs`
  - Exact content must match the user-provided module.
  - Export keys must remain unchanged: `landing`, `gnb`, `telemetry`, `transition`, `blog`, `styles`, `e2e`.
- Modify: `scripts/qa/check-phase4-grid-contracts.mjs`
  - Add `import {landing, e2e} from './_path-config.mjs';` immediately below the existing `_utils.mjs` import.
  - Replace the configured grid/e2e path literals in `requiredFiles`, `fileExists()`, and `read()` calls.
  - Keep `src/features/landing/grid/layout-plan.ts` inline.
- Modify: `scripts/qa/check-phase5-card-contracts.mjs`
  - Add `import {landing, e2e} from './_path-config.mjs';`.
  - Replace configured card/grid/e2e path literals in `requiredFiles`, `fileExists()`, and `read()` calls.
- Modify: `scripts/qa/check-phase6-spacing-contracts.mjs`
  - Add `import {landing, styles, e2e} from './_path-config.mjs';`.
  - Replace configured path literals in `requiredFiles`, `readExisting([...])`, `fileExists()`, and `read()` calls.
- Modify: `scripts/qa/check-phase7-state-contracts.mjs`
  - Add `import {landing, e2e} from './_path-config.mjs';`.
  - Replace configured path literals in `requiredFiles`, both `readExisting([...])` arrays, `fileExists()`, and `read()` calls.
- Modify: `scripts/qa/check-phase8-accessibility-contracts.mjs`
  - Add `import {landing, gnb, styles, e2e} from './_path-config.mjs';`.
  - Replace configured path literals in `requiredFiles`, `fileExists()`, `read()`, and the `readExisting([styles.globals, landing.grid.gridCardCss])` call.
- Modify: `scripts/qa/check-phase9-performance-contracts.mjs`
  - Add `import {landing, gnb, styles, e2e} from './_path-config.mjs';`.
  - Replace configured path literals in `requiredFiles`, `fileExists()`, `read()`, and the CSS `readExisting([landing.grid.gridCardCss, styles.globals])` call.
  - Keep `src/app/layout.tsx`, `public/theme-bootstrap.js`, `package.json`, and `playwright.config.ts` inline.
- Modify: `scripts/qa/check-phase10-transition-contracts.mjs`
  - Add `import {landing, transition, blog, e2e} from './_path-config.mjs';`.
  - Replace configured path literals in `requiredFiles`, `fileExists()`, and `read()` calls.
  - Keep `src/features/landing/landing-runtime.tsx` and `src/features/test/test-question-client.tsx` inline.
- Modify: `scripts/qa/check-phase11-telemetry-contracts.mjs`
  - Add `import {telemetry, e2e} from './_path-config.mjs';`.
  - Replace configured telemetry and listed e2e spec path literals in `requiredFiles`, `fileExists()`, and `read()` calls.
  - Keep helper, manifest, snapshot directory, API route, correlation-id, package, and Playwright config paths inline.
- Modify: `scripts/qa/check-variant-only-contracts.mjs`
  - Add `import {e2e} from './_path-config.mjs';`.
  - Replace only the three e2e paths in `scanFiles`.
  - Leave `requiredFiles` and other source/doc paths inline.
- Do not modify: `scripts/qa/check-phase1-contracts.mjs`, `scripts/qa/check-variant-registry-contracts.mjs`, `scripts/qa/check-blocker-traceability.mjs`.
- Documentation sync candidate: `docs/project-analysis.md §7.3`
  - Update the shared QA plumbing sentence to include `scripts/qa/_path-config.mjs` after implementation, because the new module becomes current QA script architecture.

## Relevant SSOT And Anchors

- Ask First path: `scripts/qa/*.mjs` from root `AGENTS.md §4`.
- Ownership anchor: `docs/agent-guides/project-rules.md §Directory Ownership` defines `scripts/qa/*.mjs` as machine-enforced contract checks.
- QA architecture doc: `docs/project-analysis.md §7.3 Custom QA Scripts`.
- Verification anchor: root `AGENTS.md §5` and `docs/agent-guides/verification-commands.md`.

## Impact Assessment

- Shared components: no runtime component files are modified; QA scripts still inspect the same component files.
- Shell/GNB: no runtime GNB changes; GNB path literals are centralized for QA script reads only.
- Localization: no locale files or locale routing behavior changes.
- A11y: no accessibility behavior changes; Phase 8 still checks the same files and messages.
- State contracts: no state logic changes; Phase 7 still scans the same split hook files.
- Core user flow: no app runtime path changes; this is QA script import/path-location refactoring only.
- Performance: no runtime performance impact; Node QA script module loading adds one local import per affected script.

## Test-First / Regression Strategy

- TDD skill note: this task is a no-behavior refactor of QA script path constants. The failing-test loop is not appropriate without inventing a test-only behavior change, and the user explicitly forbids logic changes.
- Decision update: the no-new-test TDD exception is approved for this task because this is a no-behavior path-config relocation, and adding a new test would be artificial.
- Existing regression harness is the test: `npm run qa:rules` passed before edits and must pass after edits with the same 12 child-script success messages.
- Required after-edits validation: `npm run qa:rules` must pass, then required validation gates must pass.
- No new tests will be added for this task.

## Execution Units

### Unit 1: Add Shared Path Config

- [ ] Create `scripts/qa/_path-config.mjs` with the exact user-provided exports and comments.
- [ ] Do not add helper functions, default exports, computed paths, or extra keys.

### Unit 2: Replace Landing/Grid/State Script Paths

- [ ] Modify `check-phase4-grid-contracts.mjs`, `check-phase5-card-contracts.mjs`, `check-phase6-spacing-contracts.mjs`, and `check-phase7-state-contracts.mjs`.
- [ ] Add each `_path-config.mjs` import immediately below the `_utils.mjs` import.
- [ ] Replace only the requested hardcoded paths with `landing`, `styles`, or `e2e` references.
- [ ] Preserve all regexes, `fail()` message strings, loop shapes, and conditional structure.

### Unit 3: Replace A11y/Performance/Transition/Telemetry Paths

- [ ] Modify `check-phase8-accessibility-contracts.mjs`, `check-phase9-performance-contracts.mjs`, `check-phase10-transition-contracts.mjs`, and `check-phase11-telemetry-contracts.mjs`.
- [ ] Replace only the requested repeated source/style/e2e paths.
- [ ] Preserve the explicitly inline single-source paths.
- [ ] Preserve snapshot directory strings and manifest/helper paths in Phase 11.

### Unit 4: Replace Variant-Only E2E Scan Paths

- [ ] Modify `check-variant-only-contracts.mjs`.
- [ ] Import only `{e2e}`.
- [ ] Replace only `routing-smoke`, `grid-smoke`, and `transition-telemetry-smoke` entries in `scanFiles`.

### Unit 5: Documentation Sync

- [ ] Update `docs/project-analysis.md §7.3` so the shared local QA plumbing sentence mentions `_path-config.mjs` as the path SSOT for shared QA script file paths.
- [ ] Reflect the final implementation result in `docs/project-analysis.md §7.3`, including:
  - `scripts/qa/_path-config.mjs` as the shared path SSOT for QA scripts.
  - The affected QA scripts now import shared path groups from `_path-config.mjs`.
  - The final verification results after implementation.
- [ ] Do not revise historical status, QA script list, or unrelated project analysis prose.

## Validation Commands

Run after implementation:

```bash
npm run qa:rules
npm test
```

Required Done gates before marking complete:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

If a command fails, diagnose the specific import/path replacement error, apply the smallest fix, and rerun the failed command plus any later required gates.

## Decisions Requiring User Confirmation Before Execution

- Approved: the no-new-test TDD exception is acceptable for this pure path-config relocation.
- Approved: use the existing regression harness instead; `npm run qa:rules` must pass before/after, and required validation gates must pass after implementation.
- Approved: include `docs/project-analysis.md §7.3` sync in the implementation.
- Pending: approve this updated plan before any implementation edit to `scripts/qa/*.mjs`.

## Non-Goals

- No runtime source changes under `src/`.
- No regex or `fail()` message changes.
- No package additions.
- No changes to `run-all.mjs`.
- No changes to the three explicitly excluded QA scripts.
- No reformatting beyond lines touched for imports and path references.
