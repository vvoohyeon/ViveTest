import {createChecker, fileExists, read} from './_utils.mjs';
import {e2e, landing} from './_path-config.mjs';

const {fail, finish} = createChecker();

function readNamedTestBlock(source, title) {
  const start = source.indexOf(title);
  if (start === -1) {
    return '';
  }

  const nextTest = source.indexOf('\n  test(', start + title.length);
  return source.slice(start, nextTest === -1 ? source.length : nextTest);
}

const requiredFiles = [
  'src/features/landing/grid/layout-plan.ts',
  landing.grid.catalogGrid,
  landing.grid.geometryController,
  'tests/unit/landing-grid-plan.test.ts',
  e2e.gridSmoke
];

for (const relativePath of requiredFiles) {
  if (!fileExists(relativePath)) {
    fail(`Missing required Phase 4 file: ${relativePath}`);
  }
}

if (fileExists('src/app/[locale]/page.tsx')) {
  const landingPage = read('src/app/[locale]/page.tsx');
  if (!/LandingCatalogGridLoader/u.test(landingPage) && !/LandingCatalogGrid/u.test(landingPage)) {
    fail('Landing page must render LandingCatalogGrid (directly or via loader) in Phase 4.');
  }
}

if (fileExists('src/features/landing/grid/layout-plan.ts')) {
  const layoutPlan = read('src/features/landing/grid/layout-plan.ts');
  if (
    !/DESKTOP_EXPANDED_DESIRED_FINAL_SCALE\s*=\s*1\.1/u.test(layoutPlan) ||
    !/TABLET_EXPANDED_DESIRED_FINAL_SCALE\s*=\s*1\.04/u.test(layoutPlan) ||
    !/resolveLandingExpandedScale/u.test(layoutPlan) ||
    !/resolvedFinalScale\s*=\s*Math\.min\(desiredFinalScale,\s*maxSurfaceScale\)/u.test(layoutPlan)
  ) {
    fail('Layout plan must keep the measured Desktop 1.10 / Tablet 1.04 expanded-scale resolver and safety clamp.');
  }
}

if (fileExists('tests/unit/landing-grid-plan.test.ts')) {
  const unitSpec = read('tests/unit/landing-grid-plan.test.ts');
  if (
    !/desktop wide/u.test(unitSpec) ||
    !/desktop medium/u.test(unitSpec) ||
    (!/desktop narrow/u.test(unitSpec) && !/two-column/u.test(unitSpec)) ||
    !/tablet/u.test(unitSpec) ||
    !/mobile/u.test(unitSpec)
  ) {
    fail('Unit test must cover Desktop Wide/Medium and the non-mobile two-column rule.');
  }
  if (!/constrains desktop final scale to 1\.10 while keeping tablet at 1\.04/u.test(unitSpec)) {
    fail('Unit test must cover the Desktop 1.10 / Tablet 1.04 measured expanded-scale contract.');
  }
}

if (fileExists(e2e.gridSmoke)) {
  const e2eSpec = read(e2e.gridSmoke);
  const activeWidthTitle =
    'active expanded width and zero horizontal overflow cover edge and center cards across all column modes';
  const activeWidthBlock = readNamedTestBlock(e2eSpec, activeWidthTitle);
  if (!/@smoke/u.test(e2eSpec)) {
    fail('Grid smoke spec must be tagged with @smoke.');
  }
  if (!/underfilled/u.test(e2eSpec)) {
    fail('Grid smoke spec must assert underfilled final row behavior.');
  }
  if (!/desktop narrow/u.test(e2eSpec)) {
    fail('Grid smoke spec must assert Desktop Narrow reachability.');
  }
  if (!/threshold sweeps/u.test(e2eSpec)) {
    fail('Grid smoke spec must include threshold sweep regression coverage.');
  }
  if (!/content type label is removed/u.test(e2eSpec) || !/subtitle clamp/u.test(e2eSpec)) {
    fail('Grid smoke spec must assert content-type label removal and subtitle clamp consistency.');
  }
  if (!/title clamp and expanded title continuity/u.test(e2eSpec)) {
    fail('Grid smoke spec must assert desktop/tablet title clamp and expanded title continuity.');
  }
  if (!activeWidthBlock) {
    fail('Grid smoke spec must include the active expanded width and zero-overflow contract.');
  } else if (
    !/scrollWidth/u.test(activeWidthBlock) ||
    !/clientWidth/u.test(activeWidthBlock) ||
    !/desktop-wide/u.test(activeWidthBlock) ||
    !/desktop-medium/u.test(activeWidthBlock) ||
    !/two-column/u.test(activeWidthBlock) ||
    !/anchor:\s*'start'/u.test(activeWidthBlock) ||
    !/anchor:\s*'center'/u.test(activeWidthBlock) ||
    !/anchor:\s*'end'/u.test(activeWidthBlock)
  ) {
    fail('Active-width smoke must cover overflow plus Desktop Wide/Medium/two-column edge and center anchors.');
  }
}

finish('Phase 4');
