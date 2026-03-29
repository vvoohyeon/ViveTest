import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';

import {createLandingCatalog, normalizeLandingCards} from '../../src/features/landing/data/adapter';
import {normalizeRawLandingCardType} from '../../src/features/landing/data/card-type';
import {buildFixtureContractReport} from '../../src/features/landing/data/fixture-contract';
import {landingRawFixtures} from '../../src/features/landing/data/raw-fixtures';
import {getDefaultCardCopy, LandingGridCard} from '../../src/features/landing/grid/landing-grid-card';
import type {RawLandingCard} from '../../src/features/landing/data/types';

describe('landing fixture and adapter contract', () => {
  it('satisfies fixture minimum counts and diversity requirements', () => {
    const report = buildFixtureContractReport(landingRawFixtures);

    expect(report.testCount).toBeGreaterThanOrEqual(4);
    expect(report.blogCount).toBeGreaterThanOrEqual(3);
    expect(report.unavailableTestCount).toBeGreaterThanOrEqual(2);
    expect(report.unavailableBlogCount).toBe(0);
    expect(report.optOutTestCount).toBeGreaterThanOrEqual(1);
    expect(report.hideCardCount).toBeGreaterThanOrEqual(1);
    expect(report.debugCardCount).toBeGreaterThanOrEqual(1);

    expect(report.hasLongTokenSubtitle).toBe(true);
    expect(report.hasLongBodyText).toBe(true);
    expect(report.hasEmptyTags).toBe(true);
    expect(report.hasDebugSample).toBe(true);
    expect(report.hasRequiredSlotOmission).toBe(false);
  });

  it('normalizes localized Korean text and tags while blocking unavailable blog cards', () => {
    const catalogKr = createLandingCatalog('kr');

    const qmbtiTest = catalogKr.find((card) => card.id === 'test-qmbti');
    expect(qmbtiTest?.type).toBe('test');
    if (!qmbtiTest || qmbtiTest.type !== 'test') {
      throw new Error('Expected test-qmbti to be present as a test card');
    }

    expect(qmbtiTest.title).toBe('10분컷 MBTI');
    expect(qmbtiTest.subtitle).toBe('내 기본 딥워크 리듬을 빠르게 찾아보세요.');
    expect(qmbtiTest.tags).toEqual(['순식간에', '쌉가능', '어서와']);
    expect(qmbtiTest.test.previewQuestion).toBe('🎉 파티나 생일잔치에 가면 나는');

    const opsHandbookBlog = catalogKr.find((card) => card.id === 'blog-ops-handbook');
    expect(opsHandbookBlog?.type).toBe('blog');
    if (!opsHandbookBlog || opsHandbookBlog.type !== 'blog') {
      throw new Error('Expected blog-ops-handbook to be present as a blog card');
    }

    expect(opsHandbookBlog.title).toBe('안정적인 배포를 위한 운영 핸드북');
    expect(opsHandbookBlog.tags).toEqual(['운영', '배포']);
    expect(opsHandbookBlog.blog.summary).toContain('사고 대응 태세');
    expect('primaryCTA' in opsHandbookBlog.blog).toBe(false);
    expect(catalogKr.some((card) => card.type === 'blog' && card.cardType === 'unavailable')).toBe(false);
  });

  it('falls back to default-locale and default values for Japanese requests without localized text and tags', () => {
    const fallbackInput: Array<Partial<RawLandingCard>> = [
      {
        id: 'fallback-test',
        type: 'test',
        cardType: 'available',
        title: {
          en: 'English fallback title'
        },
        subtitle: {
          default: 'Default subtitle'
        },
        thumbnailOrIcon: 'icon-fallback',
        tags: {
          en: ['fallback-tag']
        },
        test: {
          variant: 'fallback-variant',
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

    const [fallbackCard] = normalizeLandingCards(fallbackInput, 'ja');

    expect(fallbackCard.title).toBe('English fallback title');
    expect(fallbackCard.subtitle).toBe('Default subtitle');
    expect(fallbackCard.tags).toEqual(['fallback-tag']);

    if (fallbackCard.type !== 'test') {
      throw new Error('Expected fallback card to normalize as a test card');
    }

    expect(fallbackCard.test.previewQuestion).toBe('English fallback question');
    expect(fallbackCard.test.answerChoiceA).toBe('Default choice A');
    expect(fallbackCard.test.answerChoiceB).toBe('Default choice B');
  });

  it('hides debug/sample fixtures from the end-user catalog while keeping them available for QA', () => {
    const endUserCatalog = createLandingCatalog('en');
    const qaCatalog = createLandingCatalog('en', {audience: 'qa'});
    const inventory = createLandingCatalog('en', {audience: 'qa', includeHiddenCards: true});

    expect(endUserCatalog.some((card) => card.id === 'test-debug-sample')).toBe(false);
    expect(qaCatalog.some((card) => card.id === 'test-debug-sample')).toBe(true);
    expect(qaCatalog.some((card) => card.id === 'test-hidden-labs')).toBe(false);
    expect(inventory.some((card) => card.id === 'test-hidden-labs')).toBe(true);
  });

  it('filters available cards immediately when consent is opted out while keeping opt-out and unavailable cards visible', () => {
    const defaultCatalog = createLandingCatalog('en');
    const optedOutCatalog = createLandingCatalog('en', {consentState: 'OPTED_OUT'});

    expect(defaultCatalog.some((card) => card.id === 'test-qmbti')).toBe(true);
    expect(defaultCatalog.some((card) => card.id === 'test-energy-check')).toBe(true);

    expect(optedOutCatalog.some((card) => card.id === 'test-qmbti')).toBe(false);
    expect(optedOutCatalog.some((card) => card.id === 'test-energy-check')).toBe(true);
    expect(optedOutCatalog.some((card) => card.id === 'test-coming-soon-1')).toBe(true);
  });

  it('inserts defaults for missing required slots instead of throwing', () => {
    const malformed: Array<Partial<RawLandingCard>> = [
      {
        id: 'broken-test',
        type: 'test',
        cardType: 'available',
        tags: [''],
        test: {
          variant: ''
        }
      } as unknown as Partial<RawLandingCard>,
      {
        id: 'broken-blog',
        type: 'blog',
        unavailable: true
      } as unknown as Partial<RawLandingCard>
    ];

    expect(() => normalizeLandingCards(malformed, 'en')).not.toThrow();

    const normalized = normalizeLandingCards(malformed, 'en');
    expect(normalized).toHaveLength(1);

    const onlyCard = normalized[0];
    expect(onlyCard.type).toBe('test');
    expect(onlyCard.title).toBe('');
    expect(onlyCard.subtitle).toBe('');
    expect(onlyCard.thumbnailOrIcon).toBe('icon-placeholder');
    expect(onlyCard.tags).toEqual([]);
    expect(onlyCard.sourceParam).toBe('broken-test');

    if (onlyCard.type !== 'test') {
      throw new Error('Expected normalized card to be a test card');
    }

    expect(onlyCard.test.previewQuestion).toBe('');
    expect(onlyCard.test.answerChoiceA).toBe('');
    expect(onlyCard.test.answerChoiceB).toBe('');
    expect(onlyCard.test.meta).toEqual({
      estimatedMinutes: 0,
      shares: 0,
      attempts: 0
    });
  });

  it('normalizes legacy unavailable flags into the unavailable card type', () => {
    expect(normalizeRawLandingCardType({unavailable: true})).toBe('unavailable');
    expect(
      normalizeLandingCards(
        [
          {
            id: 'legacy-unavailable',
            type: 'test',
            unavailable: true,
            title: {en: 'Legacy unavailable'},
            subtitle: {en: 'Legacy unavailable subtitle'},
            thumbnailOrIcon: 'icon-legacy',
            tags: {en: ['legacy']},
            test: {
              variant: 'legacy-unavailable',
              previewQuestion: {en: 'Legacy preview'},
              answerChoiceA: {en: 'A'},
              answerChoiceB: {en: 'B'},
              meta: {
                estimatedMinutes: 1,
                shares: 0,
                attempts: 0
              }
            }
          }
        ],
        'en'
      )[0]?.cardType
    ).toBe('unavailable');
  });

  it('renders blog CTA text from copy even if a legacy fixture CTA leaks in', () => {
    const blogCard = createLandingCatalog('kr').find((card) => card.id === 'blog-release-gate');

    if (!blogCard || blogCard.type !== 'blog') {
      throw new Error('Expected blog-release-gate as a blog card fixture');
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
