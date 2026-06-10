import {createChecker, fileExists, read} from './_utils.mjs';
import {e2e, landing} from './_path-config.mjs';

const {fail, finish} = createChecker();

const requiredFiles = [
  landing.grid.gridCard,
  landing.grid.gridCardCss,
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

  if (
    !/data-visible-tag-count/u.test(cardFile) ||
    !/data-tag-tail-ellipsis/u.test(cardFile) ||
    !/isMobileViewport\s*\?\s*'overflow-visible text-clip'\s*:\s*'overflow-hidden text-ellipsis line-clamp-2'/u.test(cardFile)
  ) {
    fail('LandingGridCard must keep visible-prefix markers and the Mobile/full versus Desktop/Tablet clamp branch.');
  }

  const tagChipClassSource =
    cardFile.match(/const LANDING_GRID_CARD_TAG_CHIP_CLASSNAME\s*=\s*([\s\S]*?);/u)?.[1] ?? '';
  if (!tagChipClassSource || /\bborder(?:\s|-\[)/u.test(tagChipClassSource)) {
    fail('LandingGridCard tag-chip utility source must be borderless.');
  }
}

if (fileExists(landing.grid.gridCardCss)) {
  const cardCss = read(landing.grid.gridCardCss);
  const tagChipCssBlocks =
    cardCss.match(/[^{}]*landing-grid-card-tag-chip[^{}]*\{[^{}]*\}/gu)?.join('\n') ?? '';

  if (
    !/--normal-tag-bg\s*:\s*#ece8df/u.test(cardCss) ||
    !/--unavailable-tag-bg\s*:\s*#e6e2d8/u.test(cardCss) ||
    !/--tag-min-width\s*:\s*56px/u.test(cardCss)
  ) {
    fail('LandingGridCard CSS must keep the Wave 10 available/unavailable fills and 56px tag minimum.');
  }
  if (/--normal-tag-border/u.test(cardCss) || /\bborder(?:-[a-z]+)?\s*:/u.test(tagChipCssBlocks)) {
    fail('LandingGridCard CSS must not restore a tag-chip border token or declaration.');
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

  if (
    !/applies the responsive title\/subtitle clamp matrix and BQ-30 tag treatment/u.test(unitSpec) ||
    !/unmounts hidden tag suffix while preserving CTA and status semantics/u.test(unitSpec)
  ) {
    fail('Phase 5 unit spec must cover responsive clamps, BQ-30, and hidden-suffix DOM semantics.');
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

  if (
    !/tag tail ellipsis hides right-first and reappears on widen across all 12 locales/u.test(e2eSpec) ||
    !/mobile full subtitle preserves tag-row geometry across all 12 locales/u.test(e2eSpec) ||
    !/BQ-30 tag visuals stay borderless with available and unavailable fills/u.test(e2eSpec)
  ) {
    fail('Grid smoke spec must cover Wave 10 tag fitting, Mobile subtitle, and BQ-30 visuals.');
  }
}

finish('Phase 5');
