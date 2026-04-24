import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';

import {
  buildFixtureContractReport,
  buildVariantRegistry as buildVariantRegistryFromSources,
  getVariantRegistrySourceFixture,
  isEnterableCard,
  loadVariantRegistry,
  resolveLandingBlogCardByVariant,
  resolveLandingCardByVariant,
  resolveLandingCatalog,
  resolveLandingTestCardByVariant,
  resolveTestPreviewPayload,
  type LandingBlogCard,
  type LandingTestCard,
  type QuestionSourcesByVariant,
  type VariantRegistrySourceCard
} from '../../src/features/variant-registry';
import {getDefaultCardCopy, LandingGridCard} from '../../src/features/landing/grid/landing-grid-card';

const emptyQuestionSources: QuestionSourcesByVariant = {};

function buildVariantRegistry(
  sourceCards: ReadonlyArray<unknown>,
  questionSourcesByVariant: QuestionSourcesByVariant = emptyQuestionSources
) {
  return buildVariantRegistryFromSources(sourceCards, questionSourcesByVariant);
}

describe('landing registry and resolver contract', () => {
  const legacyHeroFlagKey = 'is' + 'Hero';
  const legacyBlogTextKey = 'blog' + 'Summary';

  it('satisfies fixture minimum counts and diversity requirements', () => {
    const report = buildFixtureContractReport(loadVariantRegistry());

    expect(report.testCount).toBeGreaterThanOrEqual(5);
    expect(report.blogCount).toBeGreaterThanOrEqual(3);
    expect(report.availableCount).toBe(6);
    expect(report.unavailableCount).toBe(1);
    expect(report.optOutCount).toBe(1);
    expect(report.hideCount).toBe(1);
    expect(report.debugCount).toBe(1);

    expect(report.hasLongTokenSubtitle).toBe(true);
    expect(report.hasLongBlogSubtitle).toBe(true);
    expect(report.hasEmptyTags).toBe(true);
    expect(report.hasRequiredSlotOmission).toBe(false);
  });

  it('keeps fixture authoring order pinned to seq -> type -> variant -> attribute', () => {
    const sourceRows = getVariantRegistrySourceFixture();

    for (const sourceRow of sourceRows) {
      expect(Object.keys(sourceRow).slice(0, 4)).toEqual(['seq', 'type', 'variant', 'attribute']);
    }
  });

  it('sorts source rows by seq and drops seq from the exported runtime registry', () => {
    const sourceRows: VariantRegistrySourceCard[] = [
      {
        seq: 20,
        type: 'blog',
        variant: 'later-blog',
        attribute: 'available',
        title: {en: 'Later blog'},
        subtitle: {en: 'Later subtitle'},
        tags: {en: ['later']},
        durationM: 2,
        sharedC: 4,
        engagedC: 8
      },
      {
        seq: 10,
        type: 'test',
        variant: 'earlier-test',
        attribute: 'available',
        title: {en: 'Earlier test'},
        subtitle: {en: 'Earlier subtitle'},
        tags: {en: ['earlier']},
        instruction: {en: 'Earlier instruction'},
        durationM: 1,
        sharedC: 2,
        engagedC: 3
      }
    ];
    const injectedQuestionSources: QuestionSourcesByVariant = {
      'earlier-test': [
        {
          seq: '1',
          question: {en: 'Earlier preview'},
          answerA: {en: 'Choice A'},
          answerB: {en: 'Choice B'}
        }
      ]
    };

    const registry = buildVariantRegistry(sourceRows, injectedQuestionSources);

    expect(registry.landingCards.map((card) => card.variant)).toEqual(['earlier-test', 'later-blog']);
    expect(registry.testPreviewPayloadByVariant['earlier-test'].previewQuestion.en).toBe('Earlier preview');
    expect('seq' in registry.landingCards[0]).toBe(false);
    expect('seq' in registry.landingCards[1]).toBe(false);
    expect('debug' in registry.landingCards[0]).toBe(false);
    expect('sample' in registry.landingCards[0]).toBe(false);
    expect('debug' in registry.landingCards[1]).toBe(false);
    expect('sample' in registry.landingCards[1]).toBe(false);
    expect(registry.landingCards[0].type === 'test' ? registry.landingCards[0].test.meta.durationM : null).toBe(1);
    expect(registry.landingCards[1].type === 'blog' ? registry.landingCards[1].blog.meta.sharedC : null).toBe(4);
  });

  it('fails registry build when seq is missing, duplicated, or non-positive', () => {
    const validTestRow: VariantRegistrySourceCard = {
      seq: 1,
      variant: 'valid-test',
      type: 'test',
      attribute: 'available',
      title: {en: 'Valid test'},
      subtitle: {en: 'Valid subtitle'},
      tags: {en: ['valid']},
      instruction: {en: 'Valid instruction'},
      durationM: 1,
      sharedC: 2,
      engagedC: 3
    };

    expect(() =>
      buildVariantRegistry([
        {
          ...validTestRow,
          seq: 0,
          variant: 'zero-seq'
        }
      ])
    ).toThrow(/positive integer seq/u);

    expect(() =>
      buildVariantRegistry([
        validTestRow,
        {
          ...validTestRow,
          variant: 'duplicate-seq',
          seq: validTestRow.seq
        }
      ])
    ).toThrow(/globally unique/u);

    expect(() =>
      buildVariantRegistry([
        {
          ...validTestRow,
          seq: undefined as unknown as number,
          variant: 'missing-seq'
        }
      ])
    ).toThrow(/positive integer seq/u);
  });

  it('keeps legacy hero metadata out of the exported runtime registry', () => {
    const registry = loadVariantRegistry();

    for (const runtimeCard of registry.landingCards) {
      expect(runtimeCard).not.toHaveProperty(legacyHeroFlagKey);
      expect(runtimeCard).not.toHaveProperty('debug');
      expect(runtimeCard).not.toHaveProperty('sample');
    }
  });

  it('keeps the Q1 preview projection behind the resolver boundary', () => {
    const qmbtiTest = resolveLandingTestCardByVariant('ja', 'qmbti');
    const qmbtiPreview = resolveTestPreviewPayload('qmbti', 'ja');
    const egttPreview = resolveTestPreviewPayload('egtt', 'en');

    expect(qmbtiTest?.title).toBe('10m MBTI test');
    expect(qmbtiTest?.subtitle).toBe('Find your default deep-work cadence.');
    expect(qmbtiTest?.tags).toEqual(['Rapid', 'ipsum', 'Lorem']);
    expect(qmbtiTest?.test.instruction).toBe(
      'QMBTI opens with a quick personality rhythm check before you move into the main questions.'
    );
    expect(qmbtiPreview).toEqual({
      variant: 'qmbti',
      previewQuestion: '🎉 At parties or birthday celebrations,',
      answerChoiceA: 'Early morning blocks',
      answerChoiceB: 'Late-night sprints'
    });
    expect(egttPreview.previewQuestion).toBe('I`m interested in making me charming...');
    expect(egttPreview.answerChoiceA).toBe('A lot');
    expect(egttPreview.answerChoiceB).toBe('Not at all');
    expect(qmbtiTest?.test).not.toHaveProperty('previewQuestion');
  });

  it('resolves Korean blog cards with unified meta keys while preserving subtitle as the only source text', () => {
    const opsHandbookBlog = resolveLandingBlogCardByVariant('kr', 'ops-handbook');

    expect(opsHandbookBlog?.title).toBe('안정적인 배포를 위한 운영 핸드북');
    expect(opsHandbookBlog?.subtitle).toContain('사고 대응 태세');
    expect(opsHandbookBlog?.tags).toEqual(['운영', '배포']);
    expect(opsHandbookBlog?.blog.meta).toEqual({
      durationM: 8,
      sharedC: 1920,
      engagedC: 42401
    });
    expect(Object.keys(opsHandbookBlog?.blog ?? {})).toEqual(['meta']);
  });

  it('hides debug and hidden fixtures from the end-user catalog while keeping them available for QA', () => {
    const endUserCatalog = resolveLandingCatalog('en');
    const qaCatalog = resolveLandingCatalog('en', {audience: 'qa'});

    expect(endUserCatalog.some((card) => card.variant === 'debug-sample')).toBe(false);
    expect(endUserCatalog.some((card) => card.variant === 'burnout-risk')).toBe(false);
    expect(qaCatalog.some((card) => card.variant === 'debug-sample')).toBe(true);
    expect(qaCatalog.some((card) => card.variant === 'burnout-risk')).toBe(true);

    for (const card of [...endUserCatalog, ...qaCatalog]) {
      expect(card).not.toHaveProperty('debug');
      expect(card).not.toHaveProperty('sample');
    }
  });

  it('filters available cards immediately when consent switches to OPTED_OUT while keeping opt_out and unavailable cards', () => {
    const optedOutCatalog = resolveLandingCatalog('en', {consentState: 'OPTED_OUT'});

    expect(optedOutCatalog.some((card) => card.variant === 'qmbti')).toBe(false);
    expect(optedOutCatalog.some((card) => card.variant === 'ops-handbook')).toBe(false);
    expect(optedOutCatalog.some((card) => card.variant === 'energy-check')).toBe(true);
    expect(optedOutCatalog.some((card) => card.variant === 'creativity-profile')).toBe(true);
  });

  it('fails closed when source rows contain unexpected or legacy schema keys', () => {
    expect(() =>
      buildVariantRegistry([
        {
          seq: 1,
          variant: 'unexpected-top-level',
          type: 'test',
          attribute: 'available',
          title: {en: 'Broken'},
          subtitle: {en: 'Broken'},
          tags: {en: ['broken']},
          instruction: {en: 'Broken'},
          durationM: 1,
          sharedC: 1,
          engagedC: 1,
          unexpectedKey: 'should-fail'
        }
      ])
    ).toThrow();

    expect(() =>
      buildVariantRegistry([
        {
          seq: 1,
          variant: 'legacy-blog-field',
          type: 'blog',
          attribute: 'available',
          title: {en: 'Broken blog'},
          subtitle: {en: 'Broken subtitle'},
          tags: {en: ['broken']},
          durationM: 1,
          sharedC: 1,
          engagedC: 1,
          [legacyBlogTextKey]: 'should-fail'
        }
      ])
    ).toThrow();

    expect(() =>
      buildVariantRegistry([
        {
          seq: 1,
          variant: 'legacy-hero-flag',
          type: 'blog',
          attribute: 'available',
          title: {en: 'Legacy hero flag'},
          subtitle: {en: 'Should fail closed when layout metadata leaks into fixtures.'},
          tags: {en: ['legacy']},
          durationM: 1,
          sharedC: 1,
          engagedC: 1,
          [legacyHeroFlagKey]: true
        }
      ])
    ).toThrow();

    expect(() =>
      buildVariantRegistry([
        {
          seq: 1,
          type: 'test',
          variant: 'legacy-sample-flag',
          attribute: 'debug',
          title: {en: 'Legacy sample'},
          subtitle: {en: 'Legacy sample subtitle'},
          tags: {en: []},
          sample: true,
          instruction: {en: 'Legacy sample instruction'},
          durationM: 1,
          sharedC: 1,
          engagedC: 1
        }
      ])
    ).toThrow(/unexpected key "sample"/u);

    expect(() =>
      buildVariantRegistry([
        {
          seq: 1,
          type: 'test',
          variant: 'legacy-debug-flag',
          attribute: 'debug',
          title: {en: 'Legacy debug'},
          subtitle: {en: 'Legacy debug subtitle'},
          tags: {en: []},
          debug: true,
          instruction: {en: 'Legacy debug instruction'},
          durationM: 1,
          sharedC: 1,
          engagedC: 1
        }
      ])
    ).toThrow(/unexpected key "debug"/u);
  });

  it('looks up cards strictly by variant and preserves enterable blog order', () => {
    const matchingCard = resolveLandingCardByVariant('ja', 'qmbti');
    const matchingTestCard = resolveLandingTestCardByVariant('ja', 'qmbti');
    const missingCard = resolveLandingTestCardByVariant('en', 'missing-variant');
    const blogCard = resolveLandingBlogCardByVariant('en', 'build-metrics');
    const enterableBlogs = resolveLandingCatalog('en', {audience: 'qa'}).filter(
      (card): card is LandingBlogCard => card.type === 'blog' && isEnterableCard(card.attribute)
    );

    expect(matchingCard?.variant).toBe('qmbti');
    expect(matchingTestCard?.variant).toBe('qmbti');
    expect(missingCard).toBeNull();
    expect(blogCard?.variant).toBe('build-metrics');
    expect(enterableBlogs.map((card) => card.variant)).toEqual(['ops-handbook', 'build-metrics', 'release-gate']);
  });

  it('assigns a distinct resolved instruction to every registry test variant', () => {
    const testCards = resolveLandingCatalog('en', {audience: 'qa'}).filter(
      (card): card is LandingTestCard => card.type === 'test'
    );
    const instructions = testCards.map((card) => card.test.instruction);

    expect(new Set(instructions).size).toBe(instructions.length);
  });

  it('renders blog CTA text from copy even if a legacy fixture CTA leaks in', () => {
    const blogCard = resolveLandingCatalog('kr').find((card) => card.variant === 'release-gate');

    if (!blogCard || blogCard.type !== 'blog') {
      throw new Error('Expected release-gate as a blog card fixture');
    }

    const legacyCard = {
      ...blogCard,
      blog: {
        ...blogCard.blog,
        primaryCTA: 'LEGACY_FIXTURE_CTA'
      }
    } as typeof blogCard & {
      blog: typeof blogCard.blog & {
        primaryCTA: string;
      };
    };
    const copy = {
      ...getDefaultCardCopy(),
      readMore: 'CTA_FROM_COPY'
    };

    const html = renderToStaticMarkup(
      createElement(LandingGridCard, {
        card: legacyCard,
        locale: 'kr',
        viewportTier: 'mobile',
        mobilePhase: 'OPEN',
        copy,
        sequence: 0
      })
    );

    expect(html).toContain('CTA_FROM_COPY');
    expect(html).not.toContain('LEGACY_FIXTURE_CTA');
  });
});
