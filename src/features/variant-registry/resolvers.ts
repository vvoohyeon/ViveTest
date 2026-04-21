import type {AppLocale} from '@/config/site';
import type {TelemetryConsentState} from '@/features/landing/telemetry/types';
import {
  deriveAvailability,
  isCatalogVisibleCard
} from '@/features/variant-registry/attribute';
import {
  resolveLocalizedTagList,
  resolveLocalizedText
} from '@/features/variant-registry/localization';
import {variantRegistryGenerated} from '@/features/variant-registry/variant-registry.generated';
import type {
  LandingBlogCard,
  LandingCard,
  LandingCatalogAudience,
  LandingTestCard,
  TestPreviewPayload,
  VariantRegistry,
  VariantRegistryRuntimeBlogCard,
  VariantRegistryRuntimeLandingCard,
  VariantRegistryRuntimeTestCard
} from '@/features/variant-registry/types';

const DEFAULT_CATALOG_AUDIENCE: LandingCatalogAudience = 'end-user';

export interface LandingCatalogOptions {
  audience?: LandingCatalogAudience;
  consentState?: TelemetryConsentState;
}

export function loadVariantRegistry(): VariantRegistry {
  return variantRegistryGenerated;
}

function resolveLandingCard(card: VariantRegistryRuntimeLandingCard, locale: AppLocale): LandingCard {
  const title = resolveLocalizedText(card.title, locale);
  const subtitle = resolveLocalizedText(card.subtitle, locale);
  const tags = resolveLocalizedTagList(card.tags, locale);
  const availability = deriveAvailability(card.attribute);

  if (card.type === 'test') {
    const instruction = resolveLocalizedText(card.test.instruction, locale);
    const resolvedTestCard: LandingTestCard = {
      variant: card.variant,
      type: card.type,
      attribute: card.attribute,
      availability,
      title,
      subtitle,
      tags,
      localeResolvedText: {
        title,
        subtitle,
        instruction
      },
      test: {
        instruction,
        meta: card.test.meta
      }
    };

    return resolvedTestCard;
  }

  const resolvedBlogCard: LandingBlogCard = {
    variant: card.variant,
    type: card.type,
    attribute: card.attribute,
    availability,
    title,
    subtitle,
    tags,
    localeResolvedText: {
      title,
      subtitle
    },
    blog: {
      meta: card.blog.meta
    }
  };

  return resolvedBlogCard;
}

function resolveLandingCardByVariantInternal(variant: string): VariantRegistryRuntimeLandingCard | null {
  return loadVariantRegistry().landingCards.find((card) => card.variant === variant) ?? null;
}

export function resolveLandingCatalog(locale: AppLocale, options: LandingCatalogOptions = {}): LandingCard[] {
  const audience = options.audience ?? DEFAULT_CATALOG_AUDIENCE;
  const consentState = options.consentState ?? 'UNKNOWN';

  return loadVariantRegistry().landingCards
    .filter((card) =>
      isCatalogVisibleCard(card.attribute, {
        audience,
        consentState
      })
    )
    .map((card) => resolveLandingCard(card, locale));
}

export function resolveLandingCardByVariant(locale: AppLocale, variant: string): LandingCard | null {
  const card = resolveLandingCardByVariantInternal(variant);
  return card ? resolveLandingCard(card, locale) : null;
}

export function resolveLandingTestCardByVariant(locale: AppLocale, variant: string): LandingTestCard | null {
  const card = resolveLandingCardByVariantInternal(variant);
  if (!card || card.type !== 'test') {
    return null;
  }

  return resolveLandingCard(card, locale) as LandingTestCard;
}

export function resolveLandingBlogCardByVariant(locale: AppLocale, variant: string): LandingBlogCard | null {
  const card = resolveLandingCardByVariantInternal(variant);
  if (!card || card.type !== 'blog') {
    return null;
  }

  return resolveLandingCard(card, locale) as LandingBlogCard;
}

/**
 * Resolves the stable landing preview payload consumed by UI/runtime code.
 *
 * This is the only consumer boundary for the temporary inline Q1 preview
 * bridge. Callers must not read `source-fixture.ts` preview fields directly.
 * The source projection can migrate to Questions `scoring1` without changing
 * this function's return shape.
 */
export function resolveTestPreviewPayload(variant: string, locale: AppLocale): TestPreviewPayload {
  const previewPayload = loadVariantRegistry().testPreviewPayloadByVariant[variant];

  if (!previewPayload) {
    throw new Error(`Missing test preview payload for variant "${variant}".`);
  }

  return {
    variant,
    previewQuestion: resolveLocalizedText(previewPayload.previewQuestion, locale),
    answerChoiceA: resolveLocalizedText(previewPayload.answerChoiceA, locale),
    answerChoiceB: resolveLocalizedText(previewPayload.answerChoiceB, locale)
  };
}

export function resolveRuntimeTestCardByVariant(variant: string): VariantRegistryRuntimeTestCard | null {
  const card = resolveLandingCardByVariantInternal(variant);
  return card?.type === 'test' ? card : null;
}

export function resolveRuntimeBlogCardByVariant(variant: string): VariantRegistryRuntimeBlogCard | null {
  const card = resolveLandingCardByVariantInternal(variant);
  return card?.type === 'blog' ? card : null;
}
