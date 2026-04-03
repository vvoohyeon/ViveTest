import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';

import {
  createLandingCatalog,
  findLandingTestCardByVariant,
  normalizeAllLandingCards
} from '../../src/features/landing/data/adapter';
import {buildFixtureContractReport} from '../../src/features/landing/data/fixture-contract';
import {landingRawFixtures} from '../../src/features/landing/data/raw-fixtures';
import {getDefaultCardCopy, LandingGridCard} from '../../src/features/landing/grid/landing-grid-card';
import type {LandingTestCard, RawLandingCard} from '../../src/features/landing/data/types';

describe('landing fixture and adapter contract', () => {
  it('satisfies fixture minimum counts and diversity requirements', () => {
    const report = buildFixtureContractReport(landingRawFixtures);

    expect(report.testCount).toBeGreaterThanOrEqual(5);
    expect(report.blogCount).toBeGreaterThanOrEqual(3);
    expect(report.availableCount).toBeGreaterThanOrEqual(4);
    expect(report.unavailableCount).toBeGreaterThanOrEqual(2);
    expect(report.optOutCount).toBeGreaterThanOrEqual(1);
    expect(report.hideCount).toBeGreaterThanOrEqual(1);
    expect(report.debugCount).toBeGreaterThanOrEqual(1);

    expect(report.hasLongTokenSubtitle).toBe(true);
    expect(report.hasLongBlogSubtitle).toBe(true);
    expect(report.hasEmptyTags).toBe(true);
    expect(report.hasDebugSample).toBe(true);
    expect(report.hasRequiredSlotOmission).toBe(false);
  });

  it('normalizes localized Korean text and tags while blocking unavailable blog cards', () => {
    const catalogKr = createLandingCatalog('kr');

    const qmbtiTest = catalogKr.find((card) => card.variant === 'qmbti');
    expect(qmbtiTest?.type).toBe('test');
    if (!qmbtiTest || qmbtiTest.type !== 'test') {
      throw new Error('Expected qmbti to be present as a test card');
    }

    expect(qmbtiTest.title).toBe('10분컷 MBTI');
    expect(qmbtiTest.subtitle).toBe('내 기본 딥워크 리듬을 빠르게 찾아보세요.');
    expect(qmbtiTest.tags).toEqual(['순식간에', '쌉가능', '어서와']);
    expect(qmbtiTest.test.instruction).toBe('더미 안내문: QMBTI는 본 문항에 들어가기 전에 작업 리듬 성향을 짧게 점검하는 테스트입니다.');
    expect(qmbtiTest.test.previewQuestion).toBe('🎉 파티나 생일잔치에 가면 나는');

    const opsHandbookBlog = catalogKr.find((card) => card.variant === 'ops-handbook');
    expect(opsHandbookBlog?.type).toBe('blog');
    if (!opsHandbookBlog || opsHandbookBlog.type !== 'blog') {
      throw new Error('Expected ops-handbook to be present as a blog card');
    }

    expect(opsHandbookBlog.title).toBe('안정적인 배포를 위한 운영 핸드북');
    expect(opsHandbookBlog.subtitle).toContain('사고 대응 태세');
    expect(opsHandbookBlog.tags).toEqual(['운영', '배포']);
    expect('summary' in opsHandbookBlog.blog).toBe(false);
    expect('primaryCTA' in opsHandbookBlog.blog).toBe(false);
    expect(catalogKr.some((card) => card.type === 'blog' && card.availability === 'unavailable')).toBe(false);
  });

  it('falls back to default-locale and default values for Japanese requests without localized text and tags', () => {
    const fallbackInput: Array<Partial<RawLandingCard>> = [
      {
        variant: 'fallback-variant',
        type: 'test',
        availability: 'available',
        title: {
          en: 'English fallback title'
        },
        subtitle: {
          default: 'Default subtitle'
        },
        tags: {
          en: ['fallback-tag']
        },
        test: {
          instruction: {
            en: 'English fallback instruction'
          },
          previewQuestion: {
            en: 'English fallback question'
          },
          answerChoiceA: {
            default: 'Default choice A'
          },
          answerChoiceB: {
            default: 'Default choice B'
          },
          meta: {
            estimatedMinutes: 1,
            shares: 2,
            attempts: 3
          }
        }
      } as Partial<RawLandingCard>
    ];

    const [fallbackCard] = normalizeAllLandingCards(fallbackInput, 'ja');

    expect(fallbackCard.title).toBe('English fallback title');
    expect(fallbackCard.subtitle).toBe('Default subtitle');
    expect(fallbackCard.tags).toEqual(['fallback-tag']);

    if (fallbackCard.type !== 'test') {
      throw new Error('Expected fallback card to normalize as a test card');
    }

    expect(fallbackCard.test.instruction).toBe('English fallback instruction');
    expect(fallbackCard.test.previewQuestion).toBe('English fallback question');
    expect(fallbackCard.test.answerChoiceA).toBe('Default choice A');
    expect(fallbackCard.test.answerChoiceB).toBe('Default choice B');
  });

  it('hides debug/sample fixtures from the end-user catalog while keeping them available for QA', () => {
    const endUserCatalog = createLandingCatalog('en');
    const qaCatalog = createLandingCatalog('en', {audience: 'qa'});

    expect(endUserCatalog.some((card) => card.variant === 'debug-sample')).toBe(false);
    expect(endUserCatalog.some((card) => card.variant === 'hidden-beta')).toBe(false);
    expect(qaCatalog.some((card) => card.variant === 'debug-sample')).toBe(true);
    expect(qaCatalog.some((card) => card.variant === 'hidden-beta')).toBe(true);
  });

  it('filters available cards immediately when consent switches to OPTED_OUT while keeping opt_out and unavailable cards', () => {
    const optedOutCatalog = createLandingCatalog('en', {consentState: 'OPTED_OUT'});

    expect(optedOutCatalog.some((card) => card.variant === 'qmbti')).toBe(false);
    expect(optedOutCatalog.some((card) => card.variant === 'ops-handbook')).toBe(false);
    expect(optedOutCatalog.some((card) => card.variant === 'energy-check')).toBe(true);
    expect(optedOutCatalog.some((card) => card.variant === 'creativity-profile')).toBe(true);
  });

  it('fails closed when legacy or invalid identifier fields are present', () => {
    const malformed: Array<Partial<RawLandingCard>> = [
      {
        variant: '',
        type: 'test',
        availability: 'available',
        tags: [''],
        test: {
          instruction: {en: 'legacy'},
          previewQuestion: {en: 'legacy'},
          answerChoiceA: {en: 'A'},
          answerChoiceB: {en: 'B'},
          meta: {
            estimatedMinutes: 1,
            shares: 1,
            attempts: 1
          }
        }
      } as unknown as Partial<RawLandingCard>,
      {
        variant: 'legacy-unavailable',
        type: 'test',
        unavailable: true,
        id: 'legacy-unavailable-test',
        test: {
          instruction: {en: 'legacy'},
          previewQuestion: {en: 'legacy'},
          answerChoiceA: {en: 'A'},
          answerChoiceB: {en: 'B'},
          meta: {
            estimatedMinutes: 1,
            shares: 1,
            attempts: 1
          }
        }
      } as unknown as Partial<RawLandingCard>,
      {
        variant: 'broken-blog',
        type: 'blog',
        availability: 'unavailable',
        blog: {
          articleId: 'legacy-blog-id'
        }
      } as unknown as Partial<RawLandingCard>
    ];

    expect(() => normalizeAllLandingCards(malformed, 'en')).toThrow();
  });

  it('uses strict variant lookup without generating fallback test cards', () => {
    const matchingCard = findLandingTestCardByVariant('ja', 'qmbti');
    const missingCard = findLandingTestCardByVariant('en', 'missing-variant');

    expect(matchingCard?.variant).toBe('qmbti');
    expect(missingCard).toBeNull();
  });

  it('assigns a distinct resolved instruction to every fixture test variant', () => {
    const testCards = normalizeAllLandingCards(landingRawFixtures, 'en').filter(
      (card): card is LandingTestCard => card.type === 'test'
    );
    const instructions = testCards.map((card) => card.test.instruction);

    expect(new Set(instructions).size).toBe(instructions.length);
  });

  it('renders blog CTA text from copy even if a legacy fixture CTA leaks in', () => {
    const blogCard = createLandingCatalog('kr').find((card) => card.variant === 'release-gate');

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
