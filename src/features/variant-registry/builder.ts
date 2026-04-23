import {findFirstScoringRow} from '@/features/test/question-source-parser';
import {resolveAttribute} from '@/features/variant-registry/attribute';
import type {
  LandingMeta,
  LocalizedStringList,
  LocalizedText,
  VariantRegistry,
  VariantRegistryRuntimeLandingCard,
  VariantRegistryRuntimePreviewPayload,
  VariantRegistrySourceBlogCard,
  VariantRegistrySourceCard,
  VariantRegistrySourceTestCard
} from '@/features/variant-registry/types';

const LANDING_VARIANT_PATTERN = /^[a-z0-9-]+$/u;
const SOURCE_CARD_ALLOWED_KEYS = new Set([
  'seq',
  'type',
  'variant',
  'attribute',
  'title',
  'subtitle',
  'tags',
  'durationM',
  'sharedC',
  'engagedC',
  'instruction'
]);
const SOURCE_TEST_REQUIRED_KEYS = [
  'seq',
  'type',
  'variant',
  'attribute',
  'title',
  'subtitle',
  'tags',
  'durationM',
  'sharedC',
  'engagedC',
  'instruction'
] as const;
const SOURCE_BLOG_REQUIRED_KEYS = [
  'seq',
  'type',
  'variant',
  'attribute',
  'title',
  'subtitle',
  'tags',
  'durationM',
  'sharedC',
  'engagedC'
] as const;

type LooseRecord = Record<string, unknown>;

export interface VariantRegistryQuestionSourceRow {
  seq: string;
  question: LocalizedText;
  answerA: LocalizedText;
  answerB: LocalizedText;
}

export type QuestionSourcesByVariant = Readonly<Record<string, ReadonlyArray<VariantRegistryQuestionSourceRow>>>;

function isPlainRecord(value: unknown): value is LooseRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function assertAllowedKeys(value: LooseRecord, allowedKeys: ReadonlySet<string>, context: string): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`${context} contains unexpected key "${key}".`);
    }
  }
}

function assertHasRequiredKeys(value: LooseRecord, keys: ReadonlyArray<string>, context: string): void {
  for (const key of keys) {
    if (!(key in value)) {
      throw new Error(`${context} is missing required key "${key}".`);
    }
  }
}

function normalizeSeq(value: unknown, variant: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`Landing registry source "${variant}" must declare a positive integer seq.`);
  }

  return value as number;
}

function normalizeVariant(value: unknown, index: number): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Landing registry source row at index ${index} is missing required variant.`);
  }

  const variant = value.trim();
  if (!LANDING_VARIANT_PATTERN.test(variant)) {
    throw new Error(`Landing registry source "${variant}" must match ${LANDING_VARIANT_PATTERN}.`);
  }

  return variant;
}

function normalizeType(value: unknown, variant: string): 'test' | 'blog' {
  if (value === 'test' || value === 'blog') {
    return value;
  }

  throw new Error(`Landing registry source "${variant}" must declare type "test" or "blog".`);
}

function normalizeAttribute(value: unknown, variant: string) {
  return resolveAttribute(value, `Landing registry source "${variant}" attribute`);
}

function normalizeSourceMeta(rawCard: LooseRecord): LandingMeta {
  return {
    durationM: normalizeMetric(rawCard.durationM),
    sharedC: normalizeMetric(rawCard.sharedC),
    engagedC: normalizeMetric(rawCard.engagedC)
  };
}

function normalizeMetric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeLocalizedText(value: unknown, context: string): LocalizedText | string {
  if (typeof value === 'string') {
    return value;
  }

  if (isPlainRecord(value)) {
    return value as LocalizedText;
  }

  throw new Error(`${context} must be a localized text map or string.`);
}

function normalizeLocalizedStringList(value: unknown, context: string): LocalizedStringList {
  if (Array.isArray(value)) {
    return {default: value.filter((tag): tag is string => typeof tag === 'string')};
  }

  if (isPlainRecord(value)) {
    return value as LocalizedStringList;
  }

  throw new Error(`${context} must be a localized string-list map.`);
}

function normalizeSourceCard(rawCard: unknown, index: number): VariantRegistrySourceCard {
  if (!isPlainRecord(rawCard)) {
    throw new Error(`Landing registry source row at index ${index} must be an object.`);
  }

  assertAllowedKeys(rawCard, SOURCE_CARD_ALLOWED_KEYS, `Landing registry source row at index ${index}`);

  const variant = normalizeVariant(rawCard.variant, index);
  const type = normalizeType(rawCard.type, variant);
  const seq = normalizeSeq(rawCard.seq, variant);

  if (type === 'test') {
    assertHasRequiredKeys(rawCard, SOURCE_TEST_REQUIRED_KEYS as unknown as string[], `Landing registry source "${variant}"`);

    const normalizedTestCard: VariantRegistrySourceTestCard = {
      seq,
      type,
      variant,
      attribute: normalizeAttribute(rawCard.attribute, variant),
      title: normalizeLocalizedText(rawCard.title, `Landing registry source "${variant}" title`) as LocalizedText,
      subtitle: normalizeLocalizedText(rawCard.subtitle, `Landing registry source "${variant}" subtitle`) as LocalizedText,
      tags: normalizeLocalizedStringList(rawCard.tags, `Landing registry source "${variant}" tags`),
      ...normalizeSourceMeta(rawCard),
      instruction: normalizeLocalizedText(rawCard.instruction, `Landing registry source "${variant}" instruction`)
    };

    return normalizedTestCard;
  }

  assertHasRequiredKeys(rawCard, SOURCE_BLOG_REQUIRED_KEYS as unknown as string[], `Landing registry source "${variant}"`);

  const normalizedBlogCard: VariantRegistrySourceBlogCard = {
    seq,
    type,
    variant,
    attribute: normalizeAttribute(rawCard.attribute, variant),
    title: normalizeLocalizedText(rawCard.title, `Landing registry source "${variant}" title`) as LocalizedText,
    subtitle: normalizeLocalizedText(rawCard.subtitle, `Landing registry source "${variant}" subtitle`) as LocalizedText,
    tags: normalizeLocalizedStringList(rawCard.tags, `Landing registry source "${variant}" tags`),
    ...normalizeSourceMeta(rawCard)
  };

  return normalizedBlogCard;
}

function assertUniqueVariantAndSeq(sourceCards: ReadonlyArray<VariantRegistrySourceCard>): void {
  const seenVariants = new Set<string>();
  const seenSeqs = new Set<number>();

  for (const sourceCard of sourceCards) {
    if (seenVariants.has(sourceCard.variant)) {
      throw new Error(`Landing registry source variant "${sourceCard.variant}" must be globally unique.`);
    }

    if (seenSeqs.has(sourceCard.seq)) {
      throw new Error(`Landing registry source seq "${String(sourceCard.seq)}" must be globally unique.`);
    }

    seenVariants.add(sourceCard.variant);
    seenSeqs.add(sourceCard.seq);
  }
}

function buildRuntimeLandingCard(sourceCard: VariantRegistrySourceCard): VariantRegistryRuntimeLandingCard {
  const meta = {
    durationM: sourceCard.durationM,
    sharedC: sourceCard.sharedC,
    engagedC: sourceCard.engagedC
  };

  if (sourceCard.type === 'test') {
    return {
      variant: sourceCard.variant,
      type: sourceCard.type,
      attribute: sourceCard.attribute,
      title: sourceCard.title,
      subtitle: sourceCard.subtitle,
      tags: sourceCard.tags,
      test: {
        instruction: sourceCard.instruction,
        meta
      }
    };
  }

  return {
    variant: sourceCard.variant,
    type: sourceCard.type,
    attribute: sourceCard.attribute,
    title: sourceCard.title,
    subtitle: sourceCard.subtitle,
    tags: sourceCard.tags,
    blog: {
      meta
    }
  };
}

export function buildVariantRegistry(
  sourceCards: ReadonlyArray<unknown>,
  questionSourcesByVariant: QuestionSourcesByVariant
): VariantRegistry {
  const normalizedSourceCards = sourceCards.map((sourceCard, index) => normalizeSourceCard(sourceCard, index));
  assertUniqueVariantAndSeq(normalizedSourceCards);

  const sortedSourceCards = [...normalizedSourceCards].sort((left, right) => left.seq - right.seq);
  const landingCards = sortedSourceCards.map((sourceCard) => buildRuntimeLandingCard(sourceCard));
  const testPreviewPayloadByVariant = sortedSourceCards.reduce<
    Record<string, VariantRegistryRuntimePreviewPayload>
  >((accumulator, sourceCard) => {
    if (sourceCard.type === 'test') {
      const firstScoringRow = findFirstScoringRow(questionSourcesByVariant[sourceCard.variant] ?? []);
      if (!firstScoringRow) {
        return accumulator;
      }

      accumulator[sourceCard.variant] = {
        previewQuestion: firstScoringRow.question,
        answerChoiceA: firstScoringRow.answerA,
        answerChoiceB: firstScoringRow.answerB
      };
    }

    return accumulator;
  }, {});

  return {
    landingCards,
    testPreviewPayloadByVariant
  };
}
