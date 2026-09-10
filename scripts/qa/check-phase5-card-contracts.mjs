import {createChecker, fileExists, read} from './_utils.mjs';
import {e2e, landing, styles} from './_path-config.mjs';

const {fail, finish} = createChecker();

/* WAVE-16 FOLLOW-UP, 2026-09-10. The three tag values below were asserted as
   literal hexes inside the card CSS. The 2026-09-07 theme cut (986a956) moved
   them to the global token layer, so the literals were gone and this checker had
   been red ever since while the product rendered byte-for-byte the same values.

   It now follows the chain instead of the spelling: read what the card points
   at, resolve the reference through the light `:root` of `globals.css`, and
   compare the final value. `[data-theme='dark']` redeclares the same names, so
   only blocks whose selector is exactly `:root` are collected — the dark branch
   must never be able to satisfy a light expectation. An unresolvable reference
   is a failure, not a pass: `var()` of anything is not evidence of anything. */

const TAG_FILL_EXPECTATIONS = [
  ['--normal-tag-bg', '#ece8df'],
  ['--unavailable-tag-bg', '#e6e2d8']
];
const EXPECTED_TAG_MIN_WIDTH = '56px';
const MAX_TOKEN_CHAIN_DEPTH = 4;

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//gu, '');
}

function collectCustomProperties(css, matchesSelector) {
  const source = stripCssComments(css);
  const tokens = new Map();
  let depth = 0;
  let selectorStart = 0;
  let blockStart = 0;
  let selector = '';

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (char === '{') {
      if (depth === 0) {
        selector = source.slice(selectorStart, index).trim();
        blockStart = index + 1;
      }
      depth += 1;
      continue;
    }

    if (char !== '}') {
      continue;
    }

    depth -= 1;
    if (depth > 0) {
      continue;
    }

    if (matchesSelector(selector)) {
      for (const [, name, value] of source
        .slice(blockStart, index)
        .matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+)/giu)) {
        tokens.set(name.toLowerCase(), value.trim());
      }
    }
    selectorStart = index + 1;
  }

  return tokens;
}

function resolveToken(value, tokens) {
  let current = value;

  for (let step = 0; step <= MAX_TOKEN_CHAIN_DEPTH; step += 1) {
    const reference = /^var\(\s*(--[a-z0-9-]+)\s*\)$/iu.exec(current.trim());
    if (!reference) {
      return current.trim().toLowerCase();
    }

    const next = tokens.get(reference[1].toLowerCase());
    if (next === undefined) {
      return null;
    }
    current = next;
  }

  return null;
}

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
  const cardRootTokens = collectCustomProperties(cardCss, (selector) => selector === '.root');
  const lightRootTokens = fileExists(styles.globals)
    ? collectCustomProperties(read(styles.globals), (selector) => selector === ':root')
    : new Map();
  const tokens = new Map([...lightRootTokens, ...cardRootTokens]);

  for (const [name, expected] of TAG_FILL_EXPECTATIONS) {
    const declared = cardRootTokens.get(name);

    if (declared === undefined) {
      fail(`LandingGridCard CSS must declare ${name} on its .root block.`);
      continue;
    }

    const resolved = resolveToken(declared, tokens);
    if (resolved !== expected) {
      fail(
        `LandingGridCard ${name} must resolve to ${expected} through the light :root of ${styles.globals}; ` +
          `declared as "${declared}", resolved to ${resolved ?? 'an unresolved reference'}.`
      );
    }
  }

  const declaredTagMinWidth = tokens.get('--tag-min-width');
  const resolvedTagMinWidth =
    declaredTagMinWidth === undefined ? null : resolveToken(declaredTagMinWidth, tokens);
  if (resolvedTagMinWidth !== EXPECTED_TAG_MIN_WIDTH) {
    fail(
      `The landing tag minimum must resolve to ${EXPECTED_TAG_MIN_WIDTH}; ` +
        `resolved to ${resolvedTagMinWidth ?? 'nothing declared in the card CSS or the light :root'}.`
    );
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
