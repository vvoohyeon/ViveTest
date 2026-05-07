import {createChecker, fileExists, read} from './_utils.mjs';
import {e2e, landing} from './_path-config.mjs';

const {fail, finish} = createChecker();

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
}

if (fileExists(e2e.gridSmoke)) {
  const e2eSpec = read(e2e.gridSmoke);
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
}

finish('Phase 4');
