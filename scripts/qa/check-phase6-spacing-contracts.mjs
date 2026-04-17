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

function readExisting(relativePaths) {
  return relativePaths.filter(fileExists).map(read).join('\n');
}

function readCssBlock(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, 'u'));
  return match?.[1] ?? '';
}

const requiredFiles = [
  'src/features/landing/grid/spacing-plan.ts',
  'tests/unit/landing-spacing-plan.test.ts',
  'tests/e2e/grid-smoke.spec.ts'
];

for (const relativePath of requiredFiles) {
  if (!fileExists(relativePath)) {
    fail(`Missing required Phase 6 file: ${relativePath}`);
  }
}

if (fileExists('src/features/landing/grid/landing-catalog-grid.tsx')) {
  const gridFile = read('src/features/landing/grid/landing-catalog-grid.tsx');
  if (!/buildRowCompensationModel/u.test(gridFile)) {
    fail('LandingCatalogGrid must use row-local compensation model in Phase 6.');
  }
  if (!/deriveNaturalHeightFromGeometry/u.test(gridFile)) {
    fail('LandingCatalogGrid must derive natural height from geometry in Phase 6.');
  }
  if (/scrollHeight/u.test(gridFile)) {
    fail('LandingCatalogGrid must not depend on scrollHeight for row-local natural height in Phase 6.');
  }

  if (!/data-base-gap/u.test(gridFile) && !/spacing=/u.test(gridFile)) {
    fail('LandingCatalogGrid must pass spacing contract props to card renderer in Phase 6.');
  }
}

if (fileExists('src/features/landing/grid/landing-grid-card.tsx')) {
  const cardFile = read('src/features/landing/grid/landing-grid-card.tsx');
  if (!/data-base-gap/u.test(cardFile) || !/data-comp-gap/u.test(cardFile) || !/data-needs-comp/u.test(cardFile)) {
    fail('LandingGridCard must expose spacing contract metrics in data attributes.');
  }

  if (!/landing-grid-card-tags-gap/u.test(cardFile)) {
    fail('LandingGridCard must render explicit tags-gap element for base_gap + comp_gap model.');
  }

  if (!/LANDING_GRID_CARD_TAGS_GAP_CLASSNAME[\s\S]*calc\(var\(--landing-card-base-gap\)_\+_var\(--landing-card-comp-gap\)\)/u.test(cardFile)) {
    fail('LandingGridCard must compute tags-gap height from base_gap + comp_gap in component-owned class source.');
  }
}

{
  const css = readExisting([
    'src/app/globals.css',
    'src/features/landing/grid/landing-grid-card.module.css'
  ]);
  const cardBlock = readCssBlock(css, '.landing-grid-card');
  const contentBlock = readCssBlock(css, '.landing-grid-card-content');
  const tagsGapBlock = readCssBlock(css, '.landing-grid-card-tags-gap');
  const tagsBlock = readCssBlock(css, '.landing-grid-card-tags');
  const landingCardPseudoSelectorPattern =
    /\.landing-grid-card(?:-[a-z0-9-]+)?[^\{]*::(?:before|after)\s*\{/iu;
  const fillerFlexPattern = /(flex-grow\s*:\s*1|flex\s*:\s*1(?:\s|;|$)|flex\s*:\s*\d+(?:\.\d+)?\s+1\s+)/u;

  if (/margin-top\s*:\s*auto/u.test(cardBlock) || /margin-top\s*:\s*auto/u.test(contentBlock) || /margin-top\s*:\s*auto/u.test(tagsBlock)) {
    fail('Auto spacer pattern (margin-top:auto) is not allowed for landing grid cards (Blocker #10/#11).');
  }

  if (/space-between/u.test(contentBlock)) {
    fail('Auto space distribution (space-between) is not allowed for landing card compensation (Blocker #10/#11).');
  }

  if (fillerFlexPattern.test(contentBlock) || fillerFlexPattern.test(tagsGapBlock) || fillerFlexPattern.test(tagsBlock)) {
    fail('Filler flex pattern (flex-grow/flex:1) is not allowed for landing card compensation (Blocker #10/#11).');
  }

  if (landingCardPseudoSelectorPattern.test(css)) {
    fail('Pseudo spacer pattern (::before/::after on landing card selectors) is not allowed (Blocker #10/#11).');
  }
}

if (fileExists('tests/unit/landing-spacing-plan.test.ts')) {
  const unitSpec = read('tests/unit/landing-spacing-plan.test.ts');
  if (!/row-local decision rule/u.test(unitSpec) || !/comp gap only/u.test(unitSpec)) {
    fail('Phase 6 unit test must cover row-local compensation and non-comp zero-gap contracts.');
  }
}

if (fileExists('tests/e2e/grid-smoke.spec.ts')) {
  const e2eSpec = read('tests/e2e/grid-smoke.spec.ts');
  if (!/base-gap and comp-gap follow row-local compensation rule for row1 and row2\+/u.test(e2eSpec)) {
    fail('Grid smoke must verify row-local base_gap + comp_gap contract in Phase 6.');
  }
  if (!/contentBottom\s*-\s*metric\.tagsBottom/u.test(e2eSpec)) {
    fail('Grid smoke must assert tags-bottom residual convergence using direct geometry in Phase 6.');
  }
  if (!/rowBaseGapFromGeometry/u.test(e2eSpec)) {
    fail('Grid smoke must derive base gap from geometry instead of only data attributes in Phase 6.');
  }
}

if (errors.length > 0) {
  console.error('Phase 6 contract checks failed:');
  for (const issue of errors) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Phase 6 contract checks passed.');
