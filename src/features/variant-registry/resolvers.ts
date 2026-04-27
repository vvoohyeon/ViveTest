import type {AppLocale} from '@/config/site';
import type {TelemetryConsentState} from '@/features/landing/telemetry/types';
import {questionSourceFixture} from '@/features/test/fixtures/questions';
import {resolveResultsVariantIds} from '@/features/test/fixtures/results';
import {
  deriveAvailability,
  isCatalogVisibleCard
} from '@/features/variant-registry/attribute';
import {buildVariantRegistry} from '@/features/variant-registry/builder';
import {
  applyCrossSheetRuntimeFallback,
  validateCrossSheetIntegrity
} from '@/features/variant-registry/cross-sheet-integrity';
import {
  resolveLocalizedTagList,
  resolveLocalizedText
} from '@/features/variant-registry/localization';
import {getVariantRegistrySourceFixture} from '@/features/variant-registry/source-fixture';
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
import {variantRegistryGenerated} from '@/features/variant-registry/variant-registry.generated';

const DEFAULT_CATALOG_AUDIENCE: LandingCatalogAudience = 'end-user';
let fixtureRuntimeRegistryStateCache: RuntimeRegistryState | null = null;
let generatedRuntimeRegistryStateCache: RuntimeRegistryState | null = null;

/** @internal 테스트 전용. 프로덕션 코드에서 호출하지 않는다. */
export function clearDevRegistryCacheForTesting(): void {
  fixtureRuntimeRegistryStateCache = null;
}

interface RuntimeRegistryState {
  registry: VariantRegistry;
  blockedRuntimeVariants: ReadonlySet<string>;
}

export interface LandingCatalogOptions {
  audience?: LandingCatalogAudience;
  consentState?: TelemetryConsentState;
}

/**
 * 환경에 따라 적절한 VariantRegistry를 로드한다.
 *
 * - fixture: dev/test 환경. source-fixture.ts 기반의 현재 구현을 사용한다.
 * - generated: production 환경. Google Sheets Sync가 생성한
 *   variant-registry.generated.ts를 사용한다.
 *
 * 현재 generated 파일은 fixture-built bridge지만, Action이 파일을 재생성하면
 * production은 같은 static import 경계로 Sheets-built registry를 읽는다.
 *
 * @see docs/req-test-plan.md ADR-D
 */
export function loadVariantRegistry(): VariantRegistry {
  return getRuntimeRegistryState().registry;
}

function getRuntimeRegistryState(): RuntimeRegistryState {
  return process.env.NODE_ENV === 'production'
    ? getGeneratedRuntimeRegistryState()
    : getFixtureRuntimeRegistryState();
}

function getFixtureRuntimeRegistryState(): RuntimeRegistryState {
  fixtureRuntimeRegistryStateCache ??= buildFixtureRuntimeRegistryState();
  return fixtureRuntimeRegistryStateCache;
}

function getGeneratedRuntimeRegistryState(): RuntimeRegistryState {
  generatedRuntimeRegistryStateCache ??= {
    registry: variantRegistryGenerated,
    blockedRuntimeVariants: new Set()
  };
  return generatedRuntimeRegistryStateCache;
}

function buildFixtureRuntimeRegistryState(): RuntimeRegistryState {
  const registry = buildVariantRegistry(getVariantRegistrySourceFixture(), questionSourceFixture);
  const landingTestVariants = registry.landingCards
    .filter((card): card is VariantRegistryRuntimeTestCard => card.type === 'test')
    .map((card) => card.variant);
  const questionVariants = Object.keys(questionSourceFixture);
  const resultsVariants = resolveResultsVariantIds();
  const integrity = validateCrossSheetIntegrity(landingTestVariants, questionVariants, resultsVariants);
  const fallback = applyCrossSheetRuntimeFallback(registry, integrity);

  return {
    registry: fallback.registry,
    blockedRuntimeVariants: new Set(fallback.blockedRuntimeVariants)
  };
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

export function resolveLandingTestEntryCardByVariant(locale: AppLocale, variant: string): LandingTestCard | null {
  if (getRuntimeRegistryState().blockedRuntimeVariants.has(variant)) {
    return null;
  }

  return resolveLandingTestCardByVariant(locale, variant);
}

export function isRuntimeTestEntryBlocked(variant: string): boolean {
  return getRuntimeRegistryState().blockedRuntimeVariants.has(variant);
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
 * This is the only consumer boundary for Q1 preview projection. The live
 * source is Questions `scoring1`; callers must not read raw fixture fields
 * directly, and this return shape stays stable across source migrations.
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

export function resolveRuntimeTestEntryCardByVariant(variant: string): VariantRegistryRuntimeTestCard | null {
  if (getRuntimeRegistryState().blockedRuntimeVariants.has(variant)) {
    return null;
  }

  return resolveRuntimeTestCardByVariant(variant);
}

export function resolveRuntimeBlogCardByVariant(variant: string): VariantRegistryRuntimeBlogCard | null {
  const card = resolveLandingCardByVariantInternal(variant);
  return card?.type === 'blog' ? card : null;
}
