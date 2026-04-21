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
export {
  validateCrossSheetIntegrity,
  type CrossSheetValidationResult
} from '@/features/variant-registry/cross-sheet-integrity';
export {buildFixtureContractReport} from '@/features/variant-registry/fixture-contract';
export {
  loadVariantRegistry,
  resolveLandingBlogCardByVariant,
  resolveLandingCardByVariant,
  resolveLandingCatalog,
  resolveLandingTestCardByVariant,
  resolveRuntimeBlogCardByVariant,
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
  InlineQ1PreviewIsTemporaryUntilQuestionsQ1MigrationBridge,
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
  VariantRegistryRuntimeBlogCard,
  VariantRegistryRuntimeLandingCard,
  VariantRegistryRuntimeTestCard,
  VariantRegistrySourceBlogCard,
  VariantRegistrySourceCard,
  VariantRegistrySourceTestCard
} from '@/features/variant-registry/types';
