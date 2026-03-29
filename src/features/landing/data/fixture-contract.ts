import {defaultLocale} from '@/config/site';
import {normalizeRawLandingCardType} from '@/features/landing/data/card-type';
import type {
  FixtureContractReport,
  LocalizedStringList,
  LocalizedText,
  RawLandingCard
} from '@/features/landing/data/types';

function hasLongToken(value: string): boolean {
  return /[A-Za-z0-9_\-]{30,}/u.test(value);
}

function resolveForInspection(text: LocalizedText | undefined): string {
  if (!text || typeof text !== 'object') {
    return '';
  }

  if (typeof text[defaultLocale] === 'string') {
    return text[defaultLocale];
  }

  if (typeof text.default === 'string') {
    return text.default;
  }

  for (const candidate of Object.values(text)) {
    if (typeof candidate === 'string') {
      return candidate;
    }
  }

  return '';
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

function normalizeTagList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
}

function resolveTagsForInspection(value: LocalizedStringList | ReadonlyArray<string> | undefined): string[] {
  const normalized = asLocalizedStringList(value);

  const direct = normalizeTagList(normalized[defaultLocale]);
  if (direct.length > 0) {
    return direct;
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

function hasLocalizedListShape(value: unknown): boolean {
  return Array.isArray(value) || (!!value && typeof value === 'object');
}

function hasRequiredSlotOmission(card: RawLandingCard): boolean {
  if (!card.id || !card.type || !card.cardType) {
    return true;
  }

  if (!card.title || !card.subtitle || !card.thumbnailOrIcon || !hasLocalizedListShape(card.tags)) {
    return true;
  }

  if (card.type === 'test') {
    return (
      !card.test ||
      !card.test.variant ||
      !card.test.previewQuestion ||
      !card.test.answerChoiceA ||
      !card.test.answerChoiceB ||
      !card.test.meta
    );
  }

  return !card.blog || !card.blog.articleId || !card.blog.summary || !card.blog.meta;
}

export function buildFixtureContractReport(fixtures: ReadonlyArray<RawLandingCard>): FixtureContractReport {
  const testCount = fixtures.filter((card) => card.type === 'test').length;
  const blogCount = fixtures.filter((card) => card.type === 'blog').length;
  const unavailableTestCount = fixtures.filter(
    (card) => card.type === 'test' && normalizeRawLandingCardType(card) === 'unavailable'
  ).length;
  const unavailableBlogCount = fixtures.filter(
    (card) => card.type === 'blog' && normalizeRawLandingCardType(card) === 'unavailable'
  ).length;
  const optOutTestCount = fixtures.filter(
    (card) => card.type === 'test' && normalizeRawLandingCardType(card) === 'opt_out'
  ).length;
  const hideCardCount = fixtures.filter((card) => normalizeRawLandingCardType(card) === 'hide').length;
  const debugCardCount = fixtures.filter((card) => normalizeRawLandingCardType(card) === 'debug').length;

  const hasLongTokenSubtitle = fixtures.some((card) => hasLongToken(resolveForInspection(card.subtitle)));
  const hasLongBodyText = fixtures
    .filter((card) => card.type === 'blog')
    .some((card) => resolveForInspection(card.blog.summary).length >= 220);
  const hasEmptyTags = fixtures.some((card) => resolveTagsForInspection(card.tags).length === 0);
  const hasDebugSample = fixtures.some((card) => card.debug === true || card.sample === true);
  const hasRequiredSlotOmissionValue = fixtures.some((card) => hasRequiredSlotOmission(card));

  return {
    testCount,
    blogCount,
    unavailableTestCount,
    unavailableBlogCount,
    optOutTestCount,
    hideCardCount,
    debugCardCount,
    hasLongTokenSubtitle,
    hasLongBodyText,
    hasEmptyTags,
    hasDebugSample,
    hasRequiredSlotOmission: hasRequiredSlotOmissionValue
  };
}
