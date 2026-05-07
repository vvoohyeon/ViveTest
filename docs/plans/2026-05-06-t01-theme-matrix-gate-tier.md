# T-01 Theme Matrix Gate Tier Implementation Plan

> **For agentic workers:** Execute this plan inline, one approved unit at a time. Do not use parallel agents, automated multi-wave execution, or broad implementation pipelines for this plan.

**Goal:** Split the Phase 11 theme matrix into a full `@smoke` visual suite and a smaller `@gate` suite while keeping full local baseline regeneration available.

**Architecture:** Keep the existing full `buildThemeMatrixCases()` path untouched for `@smoke`. Add a separate gate builder that filters only `gate === true` case templates and `stateCanonical === true` viewport keys, then append a new `@gate @smoke` describe block that reuses the same capture path and screenshot names. Update package scripts and documentation so `qa:gate:once` runs the gate tier and `qa:visual:full` remains the full baseline regeneration path.

**Tech Stack:** Next.js 16, Playwright 1.57, TypeScript, JSON manifest-driven E2E generation, existing local snapshot helper.

---

## Interpretation

- Corrected target counts are authoritative:
  - Theme matrix gate cases: `120`.
  - Chromium `@gate` run: `120` because `safari-hover-ghosting.spec.ts` is ignored by the `chromium` project.
  - WebKit ghosting `@gate` run: `6`.
  - Total cross-project gate smoke coverage: `126`.
- Existing `themeMatrixCases` and `test.describe('Phase 11 theme matrix smoke', ...)` must remain unchanged.
- Existing full matrix remains `168` cases: layout `96` + state `72`.
- `tests/e2e/theme-matrix-manifest.json` is an Ask First file, so this plan requires approval before implementation.
- The task changes command/script behavior, so `AGENTS.md` requires a minimal maintenance update under §9.

## Files To Modify

- Modify: `tests/e2e/theme-matrix-manifest.json`
  - Add `"gate": true` to all 4 `layoutCases`.
  - Add `"gate": true` to all 14 `stateCases`.
  - Add `"localeKeys": ["en", "kr"]` to `mobile-test-result`.
  - Do not change `closure`, viewport definitions, route templates, settle recipes, or viewport key arrays.
- Modify: `tests/e2e/theme-matrix-smoke.spec.ts`
  - Add optional `gate?: boolean` to `ThemeMatrixCaseTemplate`.
  - Keep `ManifestViewport.stateCanonical` as-is; it already exists.
  - Add `buildGateThemeMatrixCases(manifest: ThemeMatrixManifest): ThemeMatrixCase[]` immediately after `buildThemeMatrixCases`.
  - Add `const themeMatrixGateCases = buildGateThemeMatrixCases(themeMatrixManifest);` below the existing `themeMatrixCases` constant.
  - Append a new `test.describe('Phase 11 theme matrix gate', ...)` block after the existing smoke describe.
  - Reuse `captureRepresentativeState`, `applySettleRecipe`, and the existing screenshot name pattern exactly.
- Modify: `playwright.config.ts`
  - Add `expect.toHaveScreenshot.threshold = 0.01`.
  - Add `expect.toHaveScreenshot.maxDiffPixels = 20`.
  - Do not modify `projects`, `webServer`, `fullyParallel`, `retries`, reporter, timeout, or base URL handling.
- Modify: `package.json`
  - Add `"test:e2e:gate": "PLAYWRIGHT_SERVER_MODE=preview playwright test --grep @gate"`.
  - Add `"qa:visual:full": "PLAYWRIGHT_SERVER_MODE=preview playwright test tests/e2e/theme-matrix-smoke.spec.ts --update-snapshots"`.
  - Change `qa:gate:once` from `test:e2e:smoke` to `test:e2e:gate`.
  - Do not modify `qa:gate`, `test:e2e:smoke`, `test:e2e`, or unrelated scripts.
- Modify: `tests/e2e/safari-hover-ghosting.spec.ts`
  - Add `@gate` to all 6 test title strings by changing each `@smoke` prefix to `@smoke @gate`.
  - Do not modify test logic, helpers, constants, or assertions.
- Read-only confirm: `scripts/qa/check-phase11-telemetry-contracts.mjs`
  - Confirm the existing validation does not reject unknown `gate` fields.
  - Confirm `stateCase.themeKeys` validation remains unaffected.
  - Confirm `buildExpectedThemeSnapshotFiles()` ignores `gate`.
  - Expected outcome: no file change.
- Modify: `AGENTS.md`
  - Add `npm run test:e2e:gate` and `npm run qa:visual:full` to the Reference Commands section.
  - Adjust the local QA note so `qa:gate:once` is understood as the `@gate` subset and `qa:visual:full` as the full theme-matrix baseline regeneration path.
  - Keep this update minimal because it is command/documentation maintenance required by §9.
- Modify: `tests/e2e/README.md`
  - Update the theme-matrix regeneration command to reference `npm run qa:visual:full`.
  - Replace the stale future-facing T-01 sentence with current-state wording about the gate/full split and tracked provenance.
- Add: `tests/e2e/theme-matrix-baseline-provenance.md`
  - Track the latest shared theme-matrix baseline regeneration and gate verification result outside ignored snapshot folders.
  - Keep PNG baselines local-only under `tests/e2e/*-snapshots/`.
- Modify: `docs/project-analysis.md`
  - Update the testing table/current-state prose so it no longer implies `qa:gate` runs the full theme-matrix suite.
  - State current reality: full `@smoke` theme matrix remains 168 screenshots; `@gate` theme matrix is 120 screenshots; WebKit ghosting adds 6 gate cases.

## Relevant SSOT Contract And Guides

- `AGENTS.md §2 Task Routing Table`
  - This is landing grid / GNB / theme QA surface work.
- `AGENTS.md §4 Critical Boundaries`
  - `tests/e2e/theme-matrix-manifest.json` is Ask First.
  - `scripts/qa/*.mjs` is Ask First; this task confirms `check-phase11` read-only unless an unexpected failure appears.
- `AGENTS.md §5 Essential Commands`
  - Basic gates: `lint`, `typecheck`, `test`, `build`.
  - Reference commands include E2E smoke/gate behavior.
- `AGENTS.md §9 Document Maintenance`
  - Script names and QA responsibilities are changing, so `AGENTS.md` must be updated in the same task.
- `docs/req-landing.md §6-11`
  - Theme/grid/GNB visual surface remains the contract being protected by representative screenshots.
- `docs/agent-guides/project-rules.md §Blog-Telemetry-Theme`
  - Theme-matrix uses representative `en`/`kr` rows and local ignored baselines.
- `docs/agent-guides/verification-commands.md §landing`
  - Landing/theme scope includes Playwright E2E regression coverage.
- Test anchor:
  - `assertion:B8-theme-matrix` remains present in both full smoke and gate test titles.

## Impact Assessment

- Shared components / shell / GNB: No runtime component changes. The impact is test selection only, preserving coverage for representative shell/GNB/theme states.
- Localization: No locale expansion or route change. All manifest cases will explicitly carry `["en", "kr"]`, including `mobile-test-result`.
- Accessibility: No accessibility behavior change. Gate tier still includes the representative layout/state screenshots that can expose visible a11y regressions.
- State contracts: Gate selection becomes explicit via `gate: true` and canonical viewport filtering. Full `@smoke` remains exhaustive for non-canonical layout viewports.
- Core user flow: No app behavior change. Test instruction, question, result, landing expanded, menu, and settings states remain represented.
- Responsiveness risk: The only coverage reduction in `qa:gate` is non-canonical layout viewport execution; full coverage remains available through `qa:visual:full`.
- Performance risk: `qa:gate:once` should run fewer theme-matrix screenshots, reducing repeated gate time without removing the full regeneration path.
- Design system consistency risk: Global screenshot tolerance becomes explicit in Playwright config; thresholds are narrow (`threshold: 0.01`, `maxDiffPixels: 20`) and apply globally to `toHaveScreenshot`.

## Options Considered

1. Add `@gate` to selected tests inside the existing full smoke describe.
   - Rejected because it would require modifying the existing smoke block, which the task forbids.
2. Build gate cases from a second manifest file.
   - Rejected because it duplicates source of truth and risks drift between full and gate matrices.
3. Add a separate gate builder over the same manifest.
   - Chosen because it preserves the full smoke path, keeps screenshot names stable, and makes gate tier behavior explicit in code.

## Decisions Requiring User Confirmation

- Approve the corrected expected counts: theme matrix gate `120`, chromium gate `120`, WebKit ghosting gate `6`.
- Approve the minimal documentation maintenance files (`AGENTS.md`, `tests/e2e/README.md`, `docs/project-analysis.md`) required by command and QA responsibility changes.
- No product, UX, package, route, or runtime architecture decision remains open.

## Implementation Plan

### Unit 1: Red Checks Against Current State

- Run a one-off Node assertion before edits to confirm the current checkout does not yet satisfy T-01:

```bash
node - <<'NODE'
const manifest = require('./tests/e2e/theme-matrix-manifest.json');
const allCases = [...manifest.layoutCases, ...manifest.stateCases];
const failures = [];
if (!allCases.every((matrixCase) => matrixCase.gate === true)) {
  failures.push('Not every manifest case has gate:true yet.');
}
const mobileResult = allCases.find((matrixCase) => matrixCase.id === 'mobile-test-result');
if (JSON.stringify(mobileResult?.localeKeys) !== JSON.stringify(['en', 'kr'])) {
  failures.push('mobile-test-result does not explicitly declare localeKeys.');
}
const gateCases = allCases
  .filter((matrixCase) => matrixCase.gate === true)
  .flatMap((matrixCase) => {
    const locales = matrixCase.localeKeys ?? manifest.locales;
    const themes = matrixCase.themeKeys ?? manifest.themes;
    const viewports = matrixCase.viewportKeys.filter(
      (viewportKey) => manifest.viewports[viewportKey]?.stateCanonical === true
    );
    return locales.flatMap((locale) =>
      themes.flatMap((theme) => viewports.map((viewportKey) => ({locale, theme, viewportKey})))
    );
  });
if (gateCases.length !== 120) {
  failures.push(`Expected 120 gate cases, found ${gateCases.length}.`);
}
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
NODE
```

- Expected before implementation: FAIL with missing `gate:true` and missing `mobile-test-result.localeKeys`.
- This is the TDD red check for manifest-driven gate behavior.

### Unit 2: Manifest Gate Markers

- Edit `tests/e2e/theme-matrix-manifest.json`.
- Add `"gate": true` as the final field in each layout/state case object.
- Add `"localeKeys": ["en", "kr"]` to `mobile-test-result` between `settleRecipe` and `viewportKeys`, matching surrounding state cases.
- Do not touch `closure`.
- Re-run the Unit 1 Node assertion.
- Expected after this unit: PASS with `120` gate cases.

### Unit 3: Theme Matrix Gate Builder And Describe Block

- Edit `tests/e2e/theme-matrix-smoke.spec.ts`.
- Extend `ThemeMatrixCaseTemplate`:

```ts
interface ThemeMatrixCaseTemplate {
  id: string;
  suite: MatrixSuite;
  routeTemplate: string;
  settleRecipe: SettleRecipe;
  localeKeys?: MatrixLocale[];
  themeKeys?: MatrixTheme[];
  viewportKeys: ViewportKey[];
  gate?: boolean;
}
```

- Add `buildGateThemeMatrixCases()` immediately after `buildThemeMatrixCases()` using the corrected `stateCanonical` viewport filter.
- Add `const themeMatrixGateCases = buildGateThemeMatrixCases(themeMatrixManifest);` below the existing `themeMatrixCases` constant.
- Append the new `Phase 11 theme matrix gate` describe block below the existing smoke describe.
- Do not edit `buildThemeMatrixCases()`.
- Do not edit the existing `Phase 11 theme matrix smoke` describe block.
- Run:

```bash
npm run typecheck
```

- Expected: PASS.

### Unit 4: Playwright Config, Package Scripts, Safari Gate Tags

- Edit `playwright.config.ts` only inside `expect`:

```ts
expect: {
  timeout: 5_000,
  toHaveScreenshot: {
    threshold: 0.01,
    maxDiffPixels: 20
  }
},
```

- Edit `package.json` scripts:

```json
"test:e2e:gate": "PLAYWRIGHT_SERVER_MODE=preview playwright test --grep @gate",
"qa:visual:full": "PLAYWRIGHT_SERVER_MODE=preview playwright test tests/e2e/theme-matrix-smoke.spec.ts --update-snapshots",
"qa:gate:once": "npm run qa:static && npm run build && npm run test && npm run test:e2e:gate"
```

- Preserve every unrelated script exactly.
- Edit only the 6 first-argument test title strings in `tests/e2e/safari-hover-ghosting.spec.ts` from `@smoke` to `@smoke @gate`.
- Run a script inspection:

```bash
node - <<'NODE'
const fs = require('node:fs');
const pkg = require('./package.json');
if (pkg.scripts['test:e2e:gate'] !== 'PLAYWRIGHT_SERVER_MODE=preview playwright test --grep @gate') {
  throw new Error('test:e2e:gate script mismatch');
}
if (pkg.scripts['qa:visual:full'] !== 'PLAYWRIGHT_SERVER_MODE=preview playwright test tests/e2e/theme-matrix-smoke.spec.ts --update-snapshots') {
  throw new Error('qa:visual:full script mismatch');
}
if (pkg.scripts['qa:gate:once'] !== 'npm run qa:static && npm run build && npm run test && npm run test:e2e:gate') {
  throw new Error('qa:gate:once script mismatch');
}
const safariSpec = fs.readFileSync('tests/e2e/safari-hover-ghosting.spec.ts', 'utf8');
const gateTags = safariSpec.match(/test\('@smoke @gate /g) ?? [];
if (gateTags.length !== 6) {
  throw new Error(`Expected 6 safari @gate tests, found ${gateTags.length}`);
}
NODE
```

- Expected: PASS.

### Unit 5: QA Checker Read-Only Confirmation

- Re-read `scripts/qa/check-phase11-telemetry-contracts.mjs`.
- Confirm these unchanged facts:
  - Required case field validation does not reject additional fields.
  - `stateCase.themeKeys` validation does not interact with `gate`.
  - `buildExpectedThemeSnapshotFiles()` reads only `localeKeys`, `themeKeys`, and `viewportKeys`.
- Expected implementation outcome: no diff in this file.

### Unit 6: Documentation Maintenance

- Edit `AGENTS.md` minimally:
  - Add `npm run test:e2e:gate`.
  - Add `npm run qa:visual:full`.
  - Note that `qa:gate:once` uses the `@gate` E2E subset, while `qa:visual:full` regenerates the full theme matrix.
- Edit `tests/e2e/README.md` minimally:
  - Replace the direct regeneration command with `npm run qa:visual:full`.
  - State that full regeneration still uses local-only ignored baselines.
  - State that `@gate` is the reduced CI/gate path and full matrix remains available.
  - Point shared provenance updates to `tests/e2e/theme-matrix-baseline-provenance.md`.
- Add `tests/e2e/theme-matrix-baseline-provenance.md`:
  - Record the latest `npm run qa:visual:full` and `npm run test:e2e:gate` results in a tracked location.
- Edit `docs/project-analysis.md` minimally:
  - Update theme-matrix test inventory from a single full count to full/gate split.
  - Mention WebKit ghosting contributes 6 `@gate` cases under the WebKit project.
- Do not touch `docs/archive/**`.

### Unit 7: Final Verification

- Run the corrected gate count assertion:

```bash
node - <<'NODE'
const manifest = require('./tests/e2e/theme-matrix-manifest.json');
const gateCases = [...manifest.layoutCases, ...manifest.stateCases]
  .filter((matrixCase) => matrixCase.gate === true)
  .flatMap((matrixCase) => {
    const locales = matrixCase.localeKeys ?? manifest.locales;
    const themes = matrixCase.themeKeys ?? manifest.themes;
    const viewports = matrixCase.viewportKeys.filter(
      (viewportKey) => manifest.viewports[viewportKey]?.stateCanonical === true
    );
    return locales.flatMap((locale) =>
      themes.flatMap((theme) => viewports.map((viewportKey) => ({locale, theme, viewportKey})))
    );
  });
console.log(gateCases.length);
if (gateCases.length !== 120) {
  process.exit(1);
}
NODE
```

- Expected: `120`.
- Run repo Basic Gates in AGENTS order:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

- Run requested QA rules:

```bash
npm run qa:rules
```

- Run corrected Playwright gate smoke checks against preview server:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 playwright test --grep @gate --project chromium
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 playwright test --grep @gate --project webkit-ghosting
```

- Expected:
  - Chromium: `120` gate tests.
  - WebKit ghosting: `6` gate tests.
- If no preview server is already running on `127.0.0.1:4173`, start one from the current built app with:

```bash
npm run start -- --port 4173
```

- Stop any server session started for this verification before final reporting.

## Stop Conditions

- Stop before implementation until this plan is explicitly approved.
- Stop and re-confirm if `themeMatrixGateCases.length` computes anything other than `120` after manifest/spec changes.
- Stop and re-confirm if `check-phase11-telemetry-contracts.mjs` requires logic changes beyond the read-only confirmation requested by the task.
- Stop and re-confirm before modifying snapshot PNG files, `local-snapshot.ts`, `closure`, or existing full smoke builder/describe logic.
- Stop and re-confirm if Playwright gate smoke fails because of existing local baseline drift rather than code/test selection behavior.

## Expected Outcome

- `qa:gate:once` runs `test:e2e:gate` instead of full `test:e2e:smoke`.
- Theme matrix gate tier runs `120` screenshots per Chromium gate run.
- Safari hover ghosting contributes `6` WebKit gate tests.
- Full matrix regeneration remains available through `npm run qa:visual:full`.
- Existing full `@smoke` theme matrix and snapshot names remain intact.
