export {
  isCatalogVisibleCard,
  isEnterableCard,
  isUnavailablePresentation,
  normalizeRawLandingCardType,
  resolveAvailabilityFromCardType,
  resolveLandingCatalogEnvironment,
  type LandingCatalogAudience,
  type LandingCatalogEnvironment
} from '@/features/landing/data/card-type';
export {createLandingCatalog, normalizeLandingCards} from '@/features/landing/data/adapter';
export {buildFixtureContractReport} from '@/features/landing/data/fixture-contract';
export {getLandingRawFixtures, landingRawFixtures} from '@/features/landing/data/raw-fixtures';
export type {
  FixtureContractReport,
  LandingAvailability,
  LandingBlogCard,
  LandingCard,
  LandingCatalogCardType,
  LandingCardType,
  LandingTestCard,
  LocalizedStringList,
  LocalizedText,
  RawLandingCard
} from '@/features/landing/data/types';
