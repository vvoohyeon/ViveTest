import {readFileSync} from 'node:fs';
import path from 'node:path';

import {describe, expect, it} from 'vitest';

import {questionSourceFixture} from '../../src/features/test/fixtures/questions';
import {resolveResultsVariantIds} from '../../src/features/test/fixtures/results';
import {
  applyCrossSheetRuntimeFallback,
  buildVariantRegistry as buildVariantRegistryFromSources,
  getVariantRegistrySourceFixture,
  isRuntimeTestEntryBlocked,
  resolveLandingCatalog,
  resolveLandingTestCardByVariant,
  resolveLandingTestEntryCardByVariant,
  validateCrossSheetIntegrity,
  variantRegistryGenerated,
  type VariantRegistrySourceCard
} from '../../src/features/variant-registry';

function buildVariantRegistry(sourceCards: ReadonlyArray<unknown>) {
  return buildVariantRegistryFromSources(sourceCards, questionSourceFixture);
}

function buildTestSourceRow(input: {
  seq: number;
  variant: string;
  attribute?: VariantRegistrySourceCard['attribute'];
}): VariantRegistrySourceCard {
  return {
    seq: input.seq,
    type: 'test',
    variant: input.variant,
    attribute: input.attribute ?? 'available',
    title: {en: input.variant},
    subtitle: {en: `${input.variant} subtitle`},
    tags: {en: []},
    instruction: {en: `${input.variant} instruction`},
    durationM: 1,
    sharedC: 0,
    engagedC: 0
  };
}

describe('variant registry runtime cross-sheet fallback', () => {
  it('generated registry matches the current fixture builder output', () => {
    const sourceFixture = getVariantRegistrySourceFixture();
    const fixtureBuiltRegistry = buildVariantRegistry(sourceFixture);

    expect(variantRegistryGenerated).toEqual(fixtureBuiltRegistry);
    expect(variantRegistryGenerated.landingCards.map((card) => card.variant)).toEqual(
      sourceFixture.map((card) => card.variant)
    );
    expect(Object.keys(variantRegistryGenerated.testPreviewPayloadByVariant).sort()).toEqual(
      sourceFixture
        .filter((card) => card.type === 'test')
        .map((card) => card.variant)
        .sort()
    );

    for (const card of variantRegistryGenerated.landingCards) {
      if (card.type === 'test') {
        expect(card.test).not.toHaveProperty('previewQuestion');
        expect(card.test).not.toHaveProperty('answerChoiceA');
        expect(card.test).not.toHaveProperty('answerChoiceB');
      }
    }
  });

  it('Landing에만 있는 variant는 hide로 강등하고 정상 variant는 유지한다', () => {
    const registry = buildVariantRegistry([
      buildTestSourceRow({seq: 1, variant: 'qmbti'}),
      buildTestSourceRow({seq: 2, variant: 'landing-only'})
    ]);
    const integrity = validateCrossSheetIntegrity(['qmbti', 'landing-only'], ['qmbti'], ['qmbti']);
    const fallback = applyCrossSheetRuntimeFallback(registry, integrity);

    const qmbti = fallback.registry.landingCards.find((card) => card.variant === 'qmbti');
    const landingOnly = fallback.registry.landingCards.find((card) => card.variant === 'landing-only');

    expect(qmbti?.attribute).toBe('available');
    expect(landingOnly?.attribute).toBe('hide');
    expect(fallback.blockedRuntimeVariants).toContain('landing-only');
    expect(fallback.blockedRuntimeVariants).not.toContain('qmbti');
  });

  it('Results에만 있는 variant는 entry 차단 대상이지만 landing attribute를 강등하지 않는다', () => {
    const registry = buildVariantRegistry([buildTestSourceRow({seq: 1, variant: 'qmbti'})]);
    const integrity = validateCrossSheetIntegrity(['qmbti'], ['qmbti'], ['qmbti', 'results-only']);
    const fallback = applyCrossSheetRuntimeFallback(registry, integrity);

    const qmbti = fallback.registry.landingCards.find((card) => card.variant === 'qmbti');
    const resultsOnly = fallback.registry.landingCards.find((card) => card.variant === 'results-only');

    expect(fallback.blockedRuntimeVariants).toContain('results-only');
    expect(fallback.blockedRuntimeVariants).not.toContain('qmbti');
    expect(qmbti?.attribute).toBe('available');
    expect(resultsOnly).toBeUndefined();
    expect(fallback.registry.landingCards).toHaveLength(registry.landingCards.length);
  });

  it('assertion:B30-runtime-lazy-validation-unavailable-guard-runtime-wiring blocks Results-missing entry and keeps others visible', () => {
    const resultsMissingCatalogCard = resolveLandingTestCardByVariant('en', 'creativity-profile');
    const resultsMissingEntryCard = resolveLandingTestEntryCardByVariant('en', 'creativity-profile');
    const normalEntryCard = resolveLandingTestEntryCardByVariant('en', 'qmbti');
    const catalog = resolveLandingCatalog('en');

    expect(resultsMissingCatalogCard?.attribute).toBe('unavailable');
    expect(resultsMissingEntryCard).toBeNull();
    expect(isRuntimeTestEntryBlocked('creativity-profile')).toBe(true);
    expect(isRuntimeTestEntryBlocked('qmbti')).toBe(false);
    expect(normalEntryCard?.variant).toBe('qmbti');
    expect(catalog.some((card) => card.variant === 'creativity-profile')).toBe(true);
    expect(catalog.some((card) => card.variant === 'qmbti')).toBe(true);
  });

  it('assertion:B30-runtime-lazy-validation-route-entry-resolver-wiring test route imports the entry resolver guard', () => {
    const routeSource = readFileSync(
      path.join(process.cwd(), 'src/app/[locale]/test/[variant]/page.tsx'),
      'utf8'
    );

    expect(routeSource).toContain('resolveLandingTestEntryCardByVariant');
    expect(routeSource).toContain('isRuntimeTestEntryBlocked');
    expect(routeSource).not.toContain('resolveLandingTestCardByVariant');
  });

  it('fixture runtime integrity check excludes blog variants from landingTestVariants before cross-sheet validation', () => {
    const sourceFixture = getVariantRegistrySourceFixture();
    const blogVariants = sourceFixture.filter((card) => card.type === 'blog').map((card) => card.variant);
    const landingTestVariants = sourceFixture
      .filter((card) => card.type === 'test')
      .map((card) => card.variant);
    const integrity = validateCrossSheetIntegrity(
      landingTestVariants,
      Object.keys(questionSourceFixture),
      resolveResultsVariantIds()
    );

    expect(blogVariants).toEqual(['ops-handbook', 'build-metrics', 'release-gate']);
    expect(integrity.missingInQuestions).not.toEqual(expect.arrayContaining(blogVariants));
    expect(integrity.missingInResults).not.toEqual(expect.arrayContaining(blogVariants));
  });
});
