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
  'src/features/landing/grid/landing-grid-card.tsx',
  'tests/unit/landing-card-contract.test.ts',
  'tests/e2e/grid-smoke.spec.ts'
];

for (const relativePath of requiredFiles) {
  if (!fileExists(relativePath)) {
    fail(`Missing required Phase 5 file: ${relativePath}`);
  }
}

if (fileExists('src/features/landing/grid/landing-catalog-grid.tsx')) {
  const gridFile = read('src/features/landing/grid/landing-catalog-grid.tsx');
  if (!/LandingGridCard/u.test(gridFile)) {
    fail('LandingCatalogGrid must render LandingGridCard in Phase 5.');
  }
}

if (fileExists('src/features/landing/grid/landing-grid-card.tsx')) {
  const cardFile = read('src/features/landing/grid/landing-grid-card.tsx');

  if (!/data-slot=(["'])cardTitle\1/u.test(cardFile) || !/cardThumbnail/u.test(cardFile)) {
    fail('LandingGridCard must define normal slot markers.');
  }

  if (!/previewQuestion/u.test(cardFile) || !/cardSubtitleExpanded/u.test(cardFile)) {
    fail('LandingGridCard must define expanded slot markers for both content types.');
  }

  if (!/data-card-state/u.test(cardFile) || !/data-interaction-mode/u.test(cardFile)) {
    fail('LandingGridCard must expose card state and interaction mode markers.');
  }
}

if (fileExists('tests/unit/landing-card-contract.test.ts')) {
  const unitSpec = read('tests/unit/landing-card-contract.test.ts');

  if (!/Normal slot order/u.test(unitSpec)) {
    fail('Phase 5 unit spec must cover Normal slot order contract.');
  }

  if (!/Test Expanded slots/u.test(unitSpec) || !/Blog Expanded/u.test(unitSpec)) {
    fail('Phase 5 unit spec must cover Expanded contracts for both test and blog cards.');
  }

  if (!/forces unavailable cards to stay normal/u.test(unitSpec)) {
    fail('Phase 5 unit spec must cover unavailable expanded-guard contract.');
  }
}

if (fileExists('tests/e2e/grid-smoke.spec.ts')) {
  const e2eSpec = read('tests/e2e/grid-smoke.spec.ts');

  if (!/normal card slot order and unavailable overlay contract/u.test(e2eSpec)) {
    fail('Grid smoke spec must include normal slot + unavailable overlay contract assertion.');
  }

  if (!/subtitle overflow does not contaminate card or sibling slot inline sizes/u.test(e2eSpec)) {
    fail('Grid smoke spec must include subtitle overflow contamination assertion.');
  }

  if (!/unavailable overlay is always visible in tap mode/u.test(e2eSpec)) {
    fail('Grid smoke spec must include unavailable overlay behavior assertion for tap mode.');
  }
}

if (errors.length > 0) {
  console.error('Phase 5 contract checks failed:');
  for (const issue of errors) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Phase 5 contract checks passed.');
