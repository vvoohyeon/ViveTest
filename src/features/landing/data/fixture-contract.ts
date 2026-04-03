import {defaultLocale} from '@/config/site';
import {resolveCardType} from '@/features/landing/data/card-type';
import type {
  FixtureContractReport,
  LocalizedStringList,
  LocalizedText,
  RawLandingCard
} from '@/features/landing/data/types';

const LANDING_VARIANT_PATTERN = /^[a-z0-9-]+$/u;

function hasLongToken(value: string): boolean {
  return /[A-Za-z0-9_\-]{30,}/u.test(value);
}

function resolveForInspection(text: LocalizedText | string | undefined): string {
  if (typeof text === 'string') {
    return text;
  }

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
  if (!card.variant || !LANDING_VARIANT_PATTERN.test(card.variant) || !card.type) {
    return true;
  }

  if (!card.title || !card.subtitle || !hasLocalizedListShape(card.tags)) {
    return true;
  }

  if (card.type === 'test') {
    return (
      !card.test ||
      !card.test.instruction ||
      !card.test.previewQuestion ||
      !card.test.answerChoiceA ||
      !card.test.answerChoiceB ||
      !card.test.meta
    );
  }

  return !card.blog || !card.blog.meta;
}

export function buildFixtureContractReport(fixtures: ReadonlyArray<RawLandingCard>): FixtureContractReport {
  const testCount = fixtures.filter((card) => card.type === 'test').length;
  const blogCount = fixtures.filter((card) => card.type === 'blog').length;
  const cardTypeCounts = fixtures.reduce<Record<string, number>>((counts, card) => {
    const cardType = resolveCardType(card);
    counts[cardType] = (counts[cardType] ?? 0) + 1;
    return counts;
  }, {});

  const hasLongTokenSubtitle = fixtures.some((card) => hasLongToken(resolveForInspection(card.subtitle)));
  const hasLongBlogSubtitle = fixtures
    .filter((card) => card.type === 'blog')
    .some((card) => resolveForInspection(card.subtitle).length >= 220);
  const hasEmptyTags = fixtures.some((card) => resolveTagsForInspection(card.tags).length === 0);
  const hasDebugSample = fixtures.some((card) => card.debug === true || card.sample === true);
  const hasRequiredSlotOmissionValue = fixtures.some((card) => hasRequiredSlotOmission(card));

  return {
    testCount,
    blogCount,
    availableCount: cardTypeCounts.available ?? 0,
    unavailableCount: cardTypeCounts.unavailable ?? 0,
    optOutCount: cardTypeCounts.opt_out ?? 0,
    hideCount: cardTypeCounts.hide ?? 0,
    debugCount: cardTypeCounts.debug ?? 0,
    hasLongTokenSubtitle,
    hasLongBlogSubtitle,
    hasEmptyTags,
    hasDebugSample,
    hasRequiredSlotOmission: hasRequiredSlotOmissionValue
  };
}
