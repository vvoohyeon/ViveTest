import {readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const errors = [];
const THEME_MATRIX_SNAPSHOT_SUFFIX = '-chromium-darwin.png';
const SAFARI_GHOSTING_SNAPSHOT_SUFFIX = '-webkit-ghosting-darwin.png';
const REQUIRED_SAFARI_GHOSTING_SNAPSHOT_STEMS = [
  'hover-out-lower-row-settled',
  'hover-out-row1-settled',
  'settings-panel-top-seam-free',
  'steady-lower-row-expanded-shadow',
  'steady-row1-short-expanded-content-fit'
];

function fail(message) {
  errors.push(message);
}

function fileExists(relativePath) {
  try {
    return statSync(path.join(rootDir, relativePath)).isFile();
  } catch {
    return false;
  }
}

function directoryExists(relativePath) {
  try {
    return statSync(path.join(rootDir, relativePath)).isDirectory();
  } catch {
    return false;
  }
}

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function listPngFiles(relativePath) {
  if (!directoryExists(relativePath)) {
    return [];
  }

  return readdirSync(path.join(rootDir, relativePath))
    .filter((fileName) => fileName.endsWith('.png'))
    .sort();
}

function buildExpectedThemeSnapshotFiles(manifest) {
  const expectedFiles = [];

  for (const matrixCase of [...manifest.layoutCases, ...manifest.stateCases]) {
    const locales = matrixCase.localeKeys ?? manifest.locales;
    const themes = matrixCase.themeKeys ?? manifest.themes;

    for (const locale of locales) {
      for (const theme of themes) {
        for (const viewportKey of matrixCase.viewportKeys) {
          expectedFiles.push(
            `theme-${matrixCase.suite}-${matrixCase.id}-${locale}-${theme}-${viewportKey}${THEME_MATRIX_SNAPSHOT_SUFFIX}`
          );
        }
      }
    }
  }

  return expectedFiles.sort();
}

function buildExpectedSafariGhostingSnapshotFiles() {
  return REQUIRED_SAFARI_GHOSTING_SNAPSHOT_STEMS.map(
    (snapshotStem) => `${snapshotStem}${SAFARI_GHOSTING_SNAPSHOT_SUFFIX}`
  ).sort();
}

function assertExactSnapshotSet({label, actualFiles, expectedFiles}) {
  const actualSet = new Set(actualFiles);
  const expectedSet = new Set(expectedFiles);

  for (const fileName of expectedFiles) {
    if (!actualSet.has(fileName)) {
      fail(`${label} must include ${fileName}.`);
    }
  }

  for (const fileName of actualFiles) {
    if (!expectedSet.has(fileName)) {
      fail(`${label} must not include unexpected snapshot ${fileName}.`);
    }
  }

  if (actualFiles.length !== expectedFiles.length) {
    fail(`${label} must contain exactly ${expectedFiles.length} PNG baselines; found ${actualFiles.length}.`);
  }
}

const requiredFiles = [
  'src/features/landing/lib/correlation-id.ts',
  'src/features/landing/telemetry/runtime.ts',
  'src/features/landing/telemetry/validation.ts',
  'src/app/api/telemetry/route.ts',
  'playwright.config.ts',
  'tests/unit/landing-telemetry-validation.test.ts',
  'tests/e2e/helpers/landing-fixture.ts',
  'tests/e2e/theme-matrix-smoke.spec.ts',
  'tests/e2e/theme-matrix-manifest.json',
  'tests/e2e/safari-hover-ghosting.spec.ts'
];

const allowedSettleRecipes = new Set([
  'landing-normal',
  'landing-test-expanded',
  'landing-blog-expanded',
  'desktop-settings-open',
  'test-instruction',
  'test-question',
  'test-result',
  'mobile-landing-test-expanded',
  'mobile-landing-blog-expanded',
  'mobile-menu-open'
]);

for (const relativePath of requiredFiles) {
  if (!fileExists(relativePath)) {
    fail(`Missing required Phase 11 file: ${relativePath}`);
  }
}

if (fileExists('src/features/landing/telemetry/runtime.ts')) {
  const runtimeFile = read('src/features/landing/telemetry/runtime.ts');
  const correlationIdFile = fileExists('src/features/landing/lib/correlation-id.ts')
    ? read('src/features/landing/lib/correlation-id.ts')
    : '';

  if (!/UNKNOWN/u.test(runtimeFile) || !/OPTED_OUT/u.test(runtimeFile) || !/OPTED_IN/u.test(runtimeFile)) {
    fail('Telemetry runtime must encode the consent state machine.');
  }

  if (!/randomUUID/u.test(correlationIdFile) || !/getRandomValues/u.test(correlationIdFile)) {
    fail('Correlation ID utilities must prefer randomUUID -> getRandomValues for anonymous IDs.');
  }

  if (
    !/trackLandingView/u.test(runtimeFile) ||
    !/trackCardAnswered/u.test(runtimeFile) ||
    !/trackAttemptStart/u.test(runtimeFile) ||
    !/trackFinalSubmit/u.test(runtimeFile)
  ) {
    fail('Telemetry runtime must expose landing_view, card_answered, attempt_start, and final_submit helpers.');
  }

  if (/trackTransitionStart/u.test(runtimeFile) || /trackTransitionTerminal/u.test(runtimeFile)) {
    fail('Telemetry runtime must not expose transition_* network helpers.');
  }
}

if (fileExists('src/features/landing/telemetry/validation.ts')) {
  const validationFile = read('src/features/landing/telemetry/validation.ts');
  if (
    !/Forbidden telemetry field/u.test(validationFile) ||
    !/Legacy telemetry field/u.test(validationFile) ||
    !/card_answered/u.test(validationFile) ||
    !/final_responses/u.test(validationFile)
  ) {
    fail('Telemetry validation must reject forbidden/legacy fields, validate card_answered, and require final_responses completeness.');
  }
}

if (fileExists('tests/e2e/theme-matrix-manifest.json')) {
  const manifest = readJson('tests/e2e/theme-matrix-manifest.json');
  const landingFixtureHelper = fileExists('tests/e2e/helpers/landing-fixture.ts')
    ? read('tests/e2e/helpers/landing-fixture.ts')
    : '';
  const representativeVariantMatch = landingFixtureHelper.match(
    /PRIMARY_AVAILABLE_TEST_VARIANT\s*=\s*['"`]([^'"`]+)['"`]/u
  );
  const representativeVariant = representativeVariantMatch?.[1] ?? null;
  const viewports = manifest.viewports ?? {};
  const closure = manifest.closure ?? {};
  const requiredLayoutCaseViewportKeys = closure.layoutCaseViewportKeys ?? {};
  const requiredStateCaseViewportKeys = closure.stateCaseViewportKeys ?? {};
  const layoutCases = manifest.layoutCases ?? [];
  const stateCases = manifest.stateCases ?? [];
  const allCases = [...layoutCases, ...stateCases];

  if (JSON.stringify(manifest.locales) !== JSON.stringify(['en', 'kr'])) {
    fail('Theme matrix manifest must encode the active locale set as en/kr.');
  }

  if (JSON.stringify(manifest.themes) !== JSON.stringify(['light', 'dark'])) {
    fail('Theme matrix manifest must encode the active theme set as light/dark.');
  }

  for (const viewportKey of [
    'desktop-wide',
    'desktop-medium',
    'desktop-narrow',
    'tablet-wide',
    'tablet-narrow',
    'mobile'
  ]) {
    const viewport = viewports[viewportKey];
    if (!viewport || typeof viewport.width !== 'number' || typeof viewport.height !== 'number') {
      fail(`Theme matrix manifest must define viewport ${viewportKey}.`);
    }
  }

  if (!layoutCases.length || !stateCases.length) {
    fail('Theme matrix manifest must contain both layout and state case groups.');
  }

  if (!representativeVariant) {
    fail('Theme matrix manifest drift guard requires PRIMARY_AVAILABLE_TEST_VARIANT in tests/e2e/helpers/landing-fixture.ts.');
  }

  const layoutCaseIds = new Set(layoutCases.map((matrixCase) => matrixCase.id));
  const stateCaseIds = new Set(stateCases.map((matrixCase) => matrixCase.id));

  for (const requiredId of Object.keys(requiredLayoutCaseViewportKeys)) {
    if (!layoutCaseIds.has(requiredId)) {
      fail(`Theme matrix manifest must keep exhaustive layout case ${requiredId}.`);
    }
  }

  for (const requiredId of Object.keys(requiredStateCaseViewportKeys)) {
    if (!stateCaseIds.has(requiredId)) {
      fail(`Theme matrix manifest must keep exhaustive state case ${requiredId}.`);
    }
  }

  for (const matrixCase of allCases) {
    if (!matrixCase.id || !matrixCase.routeTemplate || !matrixCase.settleRecipe || !matrixCase.suite) {
      fail(`Theme matrix manifest case is missing required fields: ${JSON.stringify(matrixCase)}`);
      continue;
    }

    if (!matrixCase.routeTemplate.includes('{locale}')) {
      fail(`Theme matrix case ${matrixCase.id} must express locale-aware routes via {locale}.`);
    }

    if (
      representativeVariant &&
      matrixCase.routeTemplate.includes('/test/') &&
      matrixCase.routeTemplate !== `/{locale}/test/${representativeVariant}`
    ) {
      fail(
        `Theme matrix case ${matrixCase.id} must align with representative test route /{locale}/test/${representativeVariant}.`
      );
    }

    if (!allowedSettleRecipes.has(matrixCase.settleRecipe)) {
      fail(`Theme matrix case ${matrixCase.id} must use a supported settle recipe.`);
    }

    if (!Array.isArray(matrixCase.viewportKeys) || matrixCase.viewportKeys.length === 0) {
      fail(`Theme matrix case ${matrixCase.id} must define one or more viewport keys.`);
      continue;
    }

    for (const viewportKey of matrixCase.viewportKeys) {
      if (!viewports[viewportKey]) {
        fail(`Theme matrix case ${matrixCase.id} references unknown viewport key ${viewportKey}.`);
      }
    }
  }

  for (const layoutCase of layoutCases) {
    const localeKeys = layoutCase.localeKeys ?? manifest.locales;
    if (JSON.stringify(localeKeys) !== JSON.stringify(manifest.locales)) {
      fail(`Layout theme matrix case ${layoutCase.id} must cover the full locale set.`);
    }

    const expectedViewportKeys = requiredLayoutCaseViewportKeys[layoutCase.id];
    if (!expectedViewportKeys) {
      fail(`Layout theme matrix case ${layoutCase.id} is not part of the required exhaustive layout inventory.`);
      continue;
    }

    if (JSON.stringify(layoutCase.viewportKeys) !== JSON.stringify(expectedViewportKeys)) {
      fail(`Layout theme matrix case ${layoutCase.id} must cover viewport pattern ${expectedViewportKeys.join(', ')}.`);
    }
  }

  for (const stateCase of stateCases) {
    const localeKeys = stateCase.localeKeys ?? manifest.locales;
    if (JSON.stringify(localeKeys) !== JSON.stringify(manifest.locales)) {
      fail(`State theme matrix case ${stateCase.id} must cover the full locale set.`);
    }

    if (stateCase.themeKeys) {
      fail(`State theme matrix case ${stateCase.id} must not narrow theme coverage below light/dark exhaustive closure.`);
    }

    const expectedViewportKeys = requiredStateCaseViewportKeys[stateCase.id];
    if (!expectedViewportKeys) {
      fail(`State theme matrix case ${stateCase.id} is not part of the required exhaustive state inventory.`);
      continue;
    }

    if (JSON.stringify(stateCase.viewportKeys) !== JSON.stringify(expectedViewportKeys)) {
      fail(`State theme matrix case ${stateCase.id} must use viewport pattern ${expectedViewportKeys.join(', ')}.`);
    }
  }
}

if (fileExists('tests/e2e/theme-matrix-smoke.spec.ts')) {
  const e2eSpec = read('tests/e2e/theme-matrix-smoke.spec.ts');
  if (!/toHaveScreenshot/u.test(e2eSpec)) {
    fail('Theme matrix smoke must capture screenshot baselines.');
  }

  if (!/theme-matrix-manifest\.json/u.test(e2eSpec)) {
    fail('Theme matrix smoke must consume the shared theme-matrix manifest.');
  }

  if (!/data-desktop-motion-role', 'steady'/u.test(e2eSpec) || !/data-mobile-phase', 'OPEN'/u.test(e2eSpec)) {
    fail('Theme matrix smoke must wait for expanded desktop/mobile representative states before capturing screenshots.');
  }

  if (!/gnb-settings-panel/u.test(e2eSpec) || !/test-result-panel/u.test(e2eSpec)) {
    fail('Theme matrix smoke must include destination settings-open and test-result representative states.');
  }
}

if (fileExists('tests/e2e/theme-matrix-manifest.json')) {
  const manifest = readJson('tests/e2e/theme-matrix-manifest.json');
  const snapshotDir = 'tests/e2e/theme-matrix-smoke.spec.ts-snapshots';
  if (!directoryExists(snapshotDir)) {
    fail(`Missing theme matrix snapshot directory: ${snapshotDir}`);
  } else {
    assertExactSnapshotSet({
      label: 'Theme matrix snapshots',
      actualFiles: listPngFiles(snapshotDir),
      expectedFiles: buildExpectedThemeSnapshotFiles(manifest)
    });
  }
}

if (fileExists('tests/e2e/safari-hover-ghosting.spec.ts')) {
  const safariSpec = read('tests/e2e/safari-hover-ghosting.spec.ts');
  if (!/toMatchSnapshot/u.test(safariSpec)) {
    fail('Safari ghosting smoke must capture screenshot baselines.');
  }

  for (const snapshotStem of REQUIRED_SAFARI_GHOSTING_SNAPSHOT_STEMS) {
    if (!new RegExp(`${snapshotStem}\\.png`, 'u').test(safariSpec)) {
      fail(`Safari ghosting smoke must reference snapshot ${snapshotStem}.png.`);
    }
  }

  const safariSnapshotDir = 'tests/e2e/safari-hover-ghosting.spec.ts-snapshots';
  if (!directoryExists(safariSnapshotDir)) {
    fail(`Missing safari ghosting snapshot directory: ${safariSnapshotDir}`);
  } else {
    assertExactSnapshotSet({
      label: 'Safari ghosting snapshots',
      actualFiles: listPngFiles(safariSnapshotDir),
      expectedFiles: buildExpectedSafariGhostingSnapshotFiles()
    });
  }
}

if (fileExists('playwright.config.ts')) {
  const playwrightConfig = read('playwright.config.ts');
  if (!/testIgnore:\s*\/safari-hover-ghosting\\.spec\\.ts\//u.test(playwrightConfig)) {
    fail('Playwright chromium project must exclude safari-hover-ghosting so safari baselines stay webkit-scoped.');
  }
}

if (errors.length > 0) {
  console.error('Phase 11 telemetry contract checks failed:');
  for (const issue of errors) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Phase 11 telemetry contract checks passed.');
