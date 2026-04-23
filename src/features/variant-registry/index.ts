export {
  deriveAvailability,
  isCatalogVisibleCard,
  isDebugOnlyCard,
  isEnterableCard,
  isLandingCardAttribute,
  isUnavailablePresentation,
  resolveAttribute
} from '@/features/variant-registry/attribute';
export {buildVariantRegistry} from '@/features/variant-registry/builder';
export type {
  QuestionSourcesByVariant,
  VariantRegistryQuestionSourceRow
} from '@/features/variant-registry/builder';
export {
  applyCrossSheetRuntimeFallback,
  validateCrossSheetIntegrity,
  type CrossSheetRuntimeFallbackResult,
  type CrossSheetValidationResult
} from '@/features/variant-registry/cross-sheet-integrity';
export {buildFixtureContractReport} from '@/features/variant-registry/fixture-contract';
export {
  loadVariantRegistry,
  isRuntimeTestEntryBlocked,
  resolveLandingBlogCardByVariant,
  resolveLandingCardByVariant,
  resolveLandingCatalog,
  resolveLandingTestEntryCardByVariant,
  resolveLandingTestCardByVariant,
  resolveRuntimeBlogCardByVariant,
  resolveRuntimeTestEntryCardByVariant,
  resolveRuntimeTestCardByVariant,
  resolveTestPreviewPayload,
  type LandingCatalogOptions
} from '@/features/variant-registry/resolvers';
export {
  getVariantRegistrySourceFixture,
  variantRegistrySourceFixture
} from '@/features/variant-registry/source-fixture';
export {variantRegistryGenerated} from '@/features/variant-registry/variant-registry.generated';
export type {
  FixtureContractReport,
  LandingAvailability,
  LandingBlogCard,
  LandingCard,
  LandingCardAttribute,
  LandingCatalogAudience,
  LandingContentType,
  LandingMeta,
  LandingTestCard,
  LocalizedStringList,
  LocalizedText,
  TestPreviewPayload,
  VariantRegistry,
  VariantRegistryRuntimePreviewPayload,
  VariantRegistryRuntimeBlogCard,
  VariantRegistryRuntimeLandingCard,
  VariantRegistryRuntimeTestCard,
  VariantRegistrySourceBlogCard,
  VariantRegistrySourceCard,
  VariantRegistrySourceTestCard
} from '@/features/variant-registry/types';
