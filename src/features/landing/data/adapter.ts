import {defaultLocale, type AppLocale} from '@/config/site';
import {
  isCatalogVisibleCard,
  normalizeRawLandingCardType,
  resolveAvailabilityFromCardType,
  resolveLandingCatalogEnvironment,
  type LandingCatalogAudience,
  type LandingCatalogEnvironment
} from '@/features/landing/data/card-type';
import {getLandingRawFixtures} from '@/features/landing/data/raw-fixtures';
import type {TelemetryConsentState} from '@/features/landing/telemetry/types';
import type {
  LandingBlogCard,
  LandingCard,
  LandingCardType,
  LandingTestCard,
  LocalizedStringList,
  LocalizedText,
  RawBlogPayload,
  RawLandingCard,
  RawTestPayload
} from '@/features/landing/data/types';

const DEFAULT_THUMBNAIL_OR_ICON = 'icon-placeholder';
const DEFAULT_CATALOG_AUDIENCE = 'end-user';
const DEFAULT_CONSENT_STATE: TelemetryConsentState = 'UNKNOWN';

type LooseRawLandingCard = Partial<RawLandingCard> & {
  test?: Partial<RawTestPayload>;
  blog?: Partial<RawBlogPayload>;
};

export interface LandingCatalogOptions {
  audience?: LandingCatalogAudience;
  consentState?: TelemetryConsentState;
  includeHiddenCards?: boolean;
  environment?: LandingCatalogEnvironment;
}

function asLocalizedText(value: LocalizedText | undefined): LocalizedText {
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

function resolveLocalizedText(value: LocalizedText | undefined, locale: AppLocale): string {
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

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeType(value: unknown): LandingCardType {
  return value === 'blog' ? 'blog' : 'test';
}

export function normalizeLandingCards(
  rawCards: ReadonlyArray<Partial<RawLandingCard>>,
  locale: AppLocale
): LandingCard[] {
  const normalizedCards: LandingCard[] = [];

  for (const [index, inputCard] of rawCards.entries()) {
    const rawCard = (inputCard ?? {}) as LooseRawLandingCard;
    const type = normalizeType(rawCard.type);
    const cardType = normalizeRawLandingCardType(rawCard);
    const availability = resolveAvailabilityFromCardType(cardType);

    if (type === 'blog' && cardType === 'unavailable') {
      continue;
    }

    const id = normalizeString(rawCard.id, `missing-card-${index + 1}`);
    const title = resolveLocalizedText(rawCard.title, locale);
    const subtitle = resolveLocalizedText(rawCard.subtitle, locale);
    const thumbnailOrIcon = normalizeString(rawCard.thumbnailOrIcon, DEFAULT_THUMBNAIL_OR_ICON);
    const tags = resolveLocalizedTagList(rawCard.tags, locale);
    const isHero = rawCard.isHero === true;
    const debug = rawCard.debug === true;
    const sample = rawCard.sample === true;

    if (type === 'blog') {
      const blog = rawCard.blog ?? {};
      const sourceParam = normalizeString(blog.articleId, id);
      const summary = resolveLocalizedText(blog.summary, locale);

      const normalizedBlogCard: LandingBlogCard = {
        id,
        type,
        cardType,
        availability,
        title,
        subtitle,
        thumbnailOrIcon,
        tags,
        isHero,
        sourceParam,
        debug,
        sample,
        localeResolvedText: {
          title,
          subtitle,
          summary
        },
        blog: {
          summary,
          meta: {
            readMinutes: normalizeNumber(blog.meta?.readMinutes),
            shares: normalizeNumber(blog.meta?.shares),
            views: normalizeNumber(blog.meta?.views)
          }
        }
      };

      normalizedCards.push(normalizedBlogCard);
      continue;
    }

    const test = rawCard.test ?? {};
    const sourceParam = normalizeString(test.variant, id);
    const previewQuestion = resolveLocalizedText(test.previewQuestion, locale);
    const answerChoiceA = resolveLocalizedText(test.answerChoiceA, locale);
    const answerChoiceB = resolveLocalizedText(test.answerChoiceB, locale);

    const normalizedTestCard: LandingTestCard = {
      id,
      type,
      cardType,
      availability,
      title,
      subtitle,
      thumbnailOrIcon,
      tags,
      isHero,
      sourceParam,
      debug,
      sample,
      localeResolvedText: {
        title,
        subtitle,
        previewQuestion,
        answerChoiceA,
        answerChoiceB
      },
      test: {
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

    normalizedCards.push(normalizedTestCard);
  }

  return normalizedCards;
}

export function createLandingCatalog(locale: AppLocale, options: LandingCatalogOptions = {}): LandingCard[] {
  const audience = options.audience ?? DEFAULT_CATALOG_AUDIENCE;
  const consentState = options.consentState ?? DEFAULT_CONSENT_STATE;
  const environment = options.environment ?? resolveLandingCatalogEnvironment();
  const cards = normalizeLandingCards(getLandingRawFixtures(), locale);

  if (options.includeHiddenCards) {
    return cards;
  }

  return cards.filter((card) => isCatalogVisibleCard(card, consentState, audience, environment));
}
