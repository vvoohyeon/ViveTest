import {readdirSync, statSync} from 'node:fs';
import path from 'node:path';

import {createChecker, fileExists, read} from './_utils.mjs';
import {e2e, telemetry, test} from './_path-config.mjs';

const {fail, finish} = createChecker();
const THEME_MATRIX_SNAPSHOT_SUFFIX = '-chromium-darwin.png';
const SAFARI_GHOSTING_SNAPSHOT_SUFFIX = '-webkit-ghosting-darwin.png';
const REQUIRED_SAFARI_GHOSTING_SNAPSHOT_STEMS = [
  'hover-out-lower-row-settled',
  'hover-out-row1-settled',
  'settings-panel-top-seam-free',
  'steady-lower-row-expanded-shadow',
  'steady-row1-short-expanded-content-fit'
];

function directoryExists(relativePath) {
  try {
    return statSync(path.join(process.cwd(), relativePath)).isDirectory();
  } catch {
    return false;
  }
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function listPngFiles(relativePath) {
  if (!directoryExists(relativePath)) {
    return [];
  }

  return readdirSync(path.join(process.cwd(), relativePath))
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
  'src/lib/correlation-id.ts',
  telemetry.runtime,
  telemetry.validation,
  test.questionClient,
  test.answerHandler,
  'src/app/api/telemetry/route.ts',
  'playwright.config.ts',
  'tests/unit/landing-telemetry-validation.test.ts',
  'tests/e2e/helpers/landing-fixture.ts',
  e2e.themeMatrixSmoke,
  'tests/e2e/theme-matrix-manifest.json',
  e2e.safariHoverGhosting
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
  'mobile-menu-open'
]);

for (const relativePath of requiredFiles) {
  if (!fileExists(relativePath)) {
    fail(`Missing required Phase 11 file: ${relativePath}`);
  }
}

if (fileExists(telemetry.runtime)) {
  const runtimeFile = read(telemetry.runtime);
  const correlationIdFile = fileExists('src/lib/correlation-id.ts')
    ? read('src/lib/correlation-id.ts')
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
    !/trackFinalSubmit/u.test(runtimeFile) ||
    !/trackQuestionAnswered/u.test(runtimeFile) ||
    !/trackResultViewed/u.test(runtimeFile)
  ) {
    fail('Telemetry runtime must expose landing_view, card_answered, attempt_start, final_submit, question_answered, and result_viewed helpers.');
  }

  if (/trackTransitionStart/u.test(runtimeFile) || /trackTransitionTerminal/u.test(runtimeFile)) {
    fail('Telemetry runtime must not expose transition_* network helpers.');
  }
}

if (fileExists(telemetry.validation)) {
  const validationFile = read(telemetry.validation);
  if (
    !/Forbidden telemetry field/u.test(validationFile) ||
    !/Legacy telemetry field/u.test(validationFile) ||
    !/card_answered/u.test(validationFile) ||
    !/final_responses/u.test(validationFile) ||
    !/question_answered/u.test(validationFile) ||
    !/result_viewed/u.test(validationFile)
  ) {
    fail('Telemetry validation must reject forbidden/legacy fields, validate card_answered/question_answered/result_viewed, and require final_responses completeness.');
  }
}

if (fileExists(test.questionClient)) {
  const questionClient = read(test.questionClient);

  if (!/disabled=\{isAnswerLocked\}/u.test(questionClient)) {
    fail('Test question client must keep answer buttons disabled while the answer lock is active.');
  }
}

if (fileExists(test.answerHandler)) {
  const answerHandler = read(test.answerHandler);

  if (!/submitted \|\| isAnswerLocked/u.test(answerHandler)) {
    fail('useAnswerHandler must keep submitted and answer-lock guard checks before updating answers.');
  }

  if (!/trackQuestionAnswered\(\{/u.test(answerHandler)) {
    fail('useAnswerHandler must emit question_answered from the answer choice call site.');
  }

  if (!/submittedRef\.current/u.test(answerHandler)) {
    fail('useAnswerHandler must keep the submittedRef stale-closure guard before auto-advance.');
  }
}

if (fileExists(test.answerLock)) {
  const answerLock = read(test.answerLock);

  if (!/setTimeout/u.test(answerLock) || !/isAnswerLocked/u.test(answerLock)) {
    fail('useAnswerLock must own the answer-lock timer and lock state.');
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

    // `/test/error` 는 variant 라우트가 아니라 복구 화면이다 — 대표 variant 정렬 규칙의 대상이 아니다.
    if (
      representativeVariant &&
      matrixCase.routeTemplate.includes('/test/') &&
      matrixCase.routeTemplate !== '/{locale}/test/error' &&
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

    // 캡처 루트를 직접 적는 케이스는 **`.page-shell` 이 없는 표면**이다(복구 화면·404).
    // 임의의 선택자를 허용하면 다음 세션이 「잘 찍히는 조각」을 골라 피사체를 좀힐 수 있으므로
    // 문서 전체를 덮는 둘만 받는다.
    if (matrixCase.captureRoot !== undefined && !['main', 'body'].includes(matrixCase.captureRoot)) {
      fail(`Theme matrix case ${matrixCase.id} may only widen its capture root to main or body.`);
    }

    // 동의 축은 상태 이름으로만 적는다 — 임의 문자열이 들어오면 시드가 조용히 안 된다.
    if (matrixCase.consent !== undefined && !['UNKNOWN', 'OPTED_IN', 'OPTED_OUT'].includes(matrixCase.consent)) {
      fail(`Theme matrix case ${matrixCase.id} declares an unknown consent state ${matrixCase.consent}.`);
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

if (fileExists(e2e.themeMatrixSmoke)) {
  const e2eSpec = read(e2e.themeMatrixSmoke);
  if (!/toHaveScreenshot/u.test(e2eSpec)) {
    fail('Theme matrix smoke must capture screenshot baselines.');
  }

  if (!/theme-matrix-manifest\.json/u.test(e2eSpec)) {
    fail('Theme matrix smoke must consume the shared theme-matrix manifest.');
  }

  if (!/data-desktop-motion-role', 'steady'/u.test(e2eSpec) || !/data-mobile-phase', 'OPEN'/u.test(e2eSpec)) {
    fail('Theme matrix smoke must wait for expanded desktop/mobile representative states before capturing screenshots.');
  }

  // 결과 표면의 앵커가 `test-result-panel` 에서 `result-screen` 으로 옮겨 갔다 — 제출이 결과
  // **주소**로 이동하면서 피사체가 인계 패널에서 도착 화면으로 바뀌었기 때문이다(명세 §2-6).
  // manifest 의 케이스 이름(`test-result` · `mobile-test-result`)은 그대로다.
  if (!/gnb-settings-panel/u.test(e2eSpec) || !/result-screen/u.test(e2eSpec)) {
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

if (fileExists(e2e.safariHoverGhosting)) {
  const safariSpec = read(e2e.safariHoverGhosting);
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

finish('Phase 11 telemetry');
