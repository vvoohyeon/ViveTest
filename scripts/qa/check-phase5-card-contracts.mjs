import {createChecker, fileExists, read} from './_utils.mjs';
import {e2e, landing} from './_path-config.mjs';

const {fail, finish} = createChecker();

const requiredFiles = [
  landing.grid.gridCard,
  'tests/unit/landing-card-contract.test.ts',
  e2e.gridSmoke
];

for (const relativePath of requiredFiles) {
  if (!fileExists(relativePath)) {
    fail(`Missing required Phase 5 file: ${relativePath}`);
  }
}

if (fileExists(landing.grid.catalogGrid)) {
  const gridFile = read(landing.grid.catalogGrid);
  if (!/LandingGridCard/u.test(gridFile)) {
    fail('LandingCatalogGrid must render LandingGridCard in Phase 5.');
  }
}

if (fileExists(landing.grid.gridCard)) {
  const cardFile = read(landing.grid.gridCard);

  if (!/data-slot=(["'])cardTitle\1/u.test(cardFile) || !/cardThumbnail/u.test(cardFile)) {
    fail('LandingGridCard must define normal slot markers.');
  }

  if (
    !/data-slot=\{interactive \? 'previewQuestion' : undefined\}/u.test(cardFile) ||
    !/\(isUnavailable \|\| isBlogCard\) && state === 'expanded' \? 'normal' : state/u.test(cardFile) ||
    !/\{isBlogCard \? \([\s\S]*<Link[\s\S]*data-slot="primaryTrigger"/u.test(cardFile) ||
    /cardSubtitleExpanded/u.test(cardFile)
  ) {
    fail('LandingGridCard must keep Test-only expanded slots and Blog whole-card Normal navigation.');
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

  if (
    !/Test Expanded slots without subtitle\/thumbnail\/tags/u.test(unitSpec) ||
    !/Blog cards as whole-card navigation links without an Expanded surface/u.test(unitSpec)
  ) {
    fail('Phase 5 unit spec must cover Test Expanded slots and the Blog whole-card no-Expanded contract.');
  }

  if (!/forces unavailable cards to stay normal/u.test(unitSpec)) {
    fail('Phase 5 unit spec must cover unavailable expanded-guard contract.');
  }
}

if (fileExists(e2e.gridSmoke)) {
  const e2eSpec = read(e2e.gridSmoke);

  if (!/normal card slot order and unavailable coming-soon tag contract/u.test(e2eSpec)) {
    fail('Grid smoke spec must include normal slot + unavailable coming-soon tag contract assertion.');
  }

  if (!/subtitle overflow does not contaminate card or sibling slot inline sizes/u.test(e2eSpec)) {
    fail('Grid smoke spec must include subtitle overflow contamination assertion.');
  }

  if (!/unavailable coming-soon tag is always visible in tap mode/u.test(e2eSpec)) {
    fail('Grid smoke spec must include unavailable coming-soon tag behavior assertion for tap mode.');
  }
}

finish('Phase 5');
