import {readFileSync, statSync} from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const errors = [];

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

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8');
}

const requiredFiles = [
  'src/features/landing/grid/layout-plan.ts',
  'src/features/landing/grid/landing-catalog-grid.tsx',
  'src/features/landing/grid/use-grid-geometry-controller.ts',
  'tests/unit/landing-grid-plan.test.ts',
  'tests/e2e/grid-smoke.spec.ts'
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

if (fileExists('tests/e2e/grid-smoke.spec.ts')) {
  const e2eSpec = read('tests/e2e/grid-smoke.spec.ts');
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

if (errors.length > 0) {
  console.error('Phase 4 contract checks failed:');
  for (const issue of errors) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Phase 4 contract checks passed.');
