import {defaultLocale, type AppLocale} from '@/config/site';
import {
  deriveAvailability,
  isCatalogVisibleCard,
  resolveCardType
} from '@/features/landing/data/card-type';
import {getLandingRawFixtures} from '@/features/landing/data/raw-fixtures';
import type {TelemetryConsentState} from '@/features/landing/telemetry/types';
import type {
  LandingBlogCard,
  LandingCard,
  LandingCatalogAudience,
  LandingContentType,
  LandingTestCard,
  LocalizedStringList,
  LocalizedText,
  RawBlogPayload,
  RawLandingCard,
  RawTestPayload
} from '@/features/landing/data/types';

const DEFAULT_CATALOG_AUDIENCE = 'end-user';
const LANDING_VARIANT_PATTERN = /^[a-z0-9-]+$/u;

type LooseRawLandingCard = Partial<RawLandingCard> & {
  id?: unknown;
  thumbnailOrIcon?: unknown;
  test?: Partial<RawTestPayload> & {
    variant?: unknown;
  };
  blog?: Partial<RawBlogPayload> & {
    articleId?: unknown;
  };
};

export interface LandingCatalogOptions {
  audience?: LandingCatalogAudience;
  consentState?: TelemetryConsentState;
}

function asLocalizedText(value: LocalizedText | string | undefined): LocalizedText {
  if (typeof value === 'string') {
    return {default: value};
  }

  return value && typeof value === 'object' ? value : {};
}

function asLocalizedStringList(
  value: LocalizedStringList | ReadonlyArray<string> | undefined
): LocalizedStringList {
  if (Array.isArray(value)) {
    return {default: value};
  }

  if (value && typeof value === 'object') {
    return value as LocalizedStringList;
  }

  return {};
}

function resolveLocalizedText(value: LocalizedText | string | undefined, locale: AppLocale): string {
  const normalized = asLocalizedText(value);

  const direct = normalized[locale];
  if (typeof direct === 'string' && direct.trim().length > 0) {
    return direct;
  }

  const fallbackLocaleText = normalized[defaultLocale];
  if (typeof fallbackLocaleText === 'string' && fallbackLocaleText.trim().length > 0) {
    return fallbackLocaleText;
  }

  if (typeof normalized.default === 'string' && normalized.default.trim().length > 0) {
    return normalized.default;
  }

  for (const candidate of Object.values(normalized)) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return '';
}

function normalizeTagList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
}

function resolveLocalizedTagList(
  value: LocalizedStringList | ReadonlyArray<string> | undefined,
  locale: AppLocale
): string[] {
  const normalized = asLocalizedStringList(value);

  const direct = normalizeTagList(normalized[locale]);
  if (direct.length > 0) {
    return direct;
  }

  const fallbackLocaleTags = normalizeTagList(normalized[defaultLocale]);
  if (fallbackLocaleTags.length > 0) {
    return fallbackLocaleTags;
  }

  const defaultTags = normalizeTagList(normalized.default);
  if (defaultTags.length > 0) {
    return defaultTags;
  }

  for (const candidate of Object.values(normalized)) {
    const candidateTags = normalizeTagList(candidate);
    if (candidateTags.length > 0) {
      return candidateTags;
    }
  }

  return [];
}

function normalizeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeType(value: unknown, variant: string): LandingContentType {
  if (value === 'test' || value === 'blog') {
    return value;
  }

  throw new Error(`Landing card "${variant}" must declare type "test" or "blog".`);
}

function normalizeVariant(value: unknown, index: number): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Landing card at index ${index} is missing required top-level variant.`);
  }

  const variant = value.trim();
  if (!LANDING_VARIANT_PATTERN.test(variant)) {
    throw new Error(`Landing card "${variant}" must match ${LANDING_VARIANT_PATTERN}.`);
  }

  return variant;
}

function assertNoLegacyIdentifierFields(rawCard: LooseRawLandingCard, variant: string): void {
  if (rawCard.id !== undefined) {
    throw new Error(`Landing card "${variant}" must not define legacy id.`);
  }

  if (rawCard.thumbnailOrIcon !== undefined) {
    throw new Error(`Landing card "${variant}" must not define legacy thumbnailOrIcon.`);
  }

  if (rawCard.test?.variant !== undefined) {
    throw new Error(`Landing card "${variant}" must not define nested test.variant.`);
  }

  if (rawCard.blog?.articleId !== undefined) {
    throw new Error(`Landing card "${variant}" must not define nested blog.articleId.`);
  }
}

function assertUniqueVariants(rawCards: ReadonlyArray<LooseRawLandingCard>): void {
  const seenVariants = new Set<string>();

  rawCards.forEach((rawCard, index) => {
    const variant = normalizeVariant(rawCard.variant, index);
    if (seenVariants.has(variant)) {
      throw new Error(`Landing variant "${variant}" must be globally unique across test and blog cards.`);
    }
    seenVariants.add(variant);
  });
}

export function normalizeAllLandingCards(
  rawCards: ReadonlyArray<Partial<RawLandingCard>>,
  locale: AppLocale
): LandingCard[] {
  const looseCards = rawCards.map((rawCard) => (rawCard ?? {}) as LooseRawLandingCard);
  assertUniqueVariants(looseCards);

  return looseCards.map((rawCard, index) => {
    const variant = normalizeVariant(rawCard.variant, index);
    assertNoLegacyIdentifierFields(rawCard, variant);

    const type = normalizeType(rawCard.type, variant);
    const cardType = resolveCardType(rawCard);
    const availability = deriveAvailability(cardType);
    const title = resolveLocalizedText(rawCard.title, locale);
    const subtitle = resolveLocalizedText(rawCard.subtitle, locale);
    const tags = resolveLocalizedTagList(rawCard.tags, locale);
    const isHero = rawCard.isHero === true;
    const debug = rawCard.debug === true;
    const sample = rawCard.sample === true;

    if (type === 'blog') {
      if (!rawCard.blog) {
        throw new Error(`Landing blog card "${variant}" must define blog payload.`);
      }

      const blog = rawCard.blog;
      const normalizedBlogCard: LandingBlogCard = {
        variant,
        type,
        cardType,
        availability,
        title,
        subtitle,
        tags,
        isHero,
        debug,
        sample,
        localeResolvedText: {
          title,
          subtitle
        },
        blog: {
          meta: {
            readMinutes: normalizeNumber(blog.meta?.readMinutes),
            shares: normalizeNumber(blog.meta?.shares),
            views: normalizeNumber(blog.meta?.views)
          }
        }
      };

      return normalizedBlogCard;
    }

    if (!rawCard.test) {
      throw new Error(`Landing test card "${variant}" must define test payload.`);
    }

    const test = rawCard.test;
    const instruction = resolveLocalizedText(test.instruction, locale);
    const previewQuestion = resolveLocalizedText(test.previewQuestion, locale);
    const answerChoiceA = resolveLocalizedText(test.answerChoiceA, locale);
    const answerChoiceB = resolveLocalizedText(test.answerChoiceB, locale);

    const normalizedTestCard: LandingTestCard = {
      variant,
      type,
      cardType,
      availability,
      title,
      subtitle,
      tags,
      isHero,
      debug,
      sample,
      localeResolvedText: {
        title,
        subtitle,
        instruction,
        previewQuestion,
        answerChoiceA,
        answerChoiceB
      },
      test: {
        instruction,
        previewQuestion,
        answerChoiceA,
        answerChoiceB,
        meta: {
          estimatedMinutes: normalizeNumber(test.meta?.estimatedMinutes),
          shares: normalizeNumber(test.meta?.shares),
          attempts: normalizeNumber(test.meta?.attempts)
        }
      }
    };

    return normalizedTestCard;
  });
}

export const normalizeLandingCards = normalizeAllLandingCards;

export function filterLandingCatalog(cards: ReadonlyArray<LandingCard>, options: LandingCatalogOptions = {}): LandingCard[] {
  const audience = options.audience ?? DEFAULT_CATALOG_AUDIENCE;
  const consentState = options.consentState ?? 'UNKNOWN';

  return cards.filter((card) =>
    isCatalogVisibleCard(card, {
      audience,
      consentState
    })
  );
}

export function createLandingCatalog(locale: AppLocale, options: LandingCatalogOptions = {}): LandingCard[] {
  return filterLandingCatalog(normalizeAllLandingCards(getLandingRawFixtures(), locale), options);
}

export function findLandingTestCardByVariant(locale: AppLocale, variant: string): LandingTestCard | null {
  return (
    normalizeAllLandingCards(getLandingRawFixtures(), locale).find(
      (card): card is LandingTestCard => card.type === 'test' && card.variant === variant
    ) ?? null
  );
}
