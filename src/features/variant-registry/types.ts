import type {AppLocale} from '@/config/site';

export type LandingContentType = 'test' | 'blog';
export type LandingCardAttribute = 'available' | 'unavailable' | 'hide' | 'opt_out' | 'debug';
export type LandingAvailability = 'available' | 'unavailable';
export type LandingCatalogAudience = 'end-user' | 'qa';

export type LocalizedText = Partial<Record<AppLocale, string>> & {
  default?: string;
};

export type LocalizedStringList = Partial<Record<AppLocale, ReadonlyArray<string>>> & {
  default?: ReadonlyArray<string>;
};

export interface LandingMeta {
  durationM: number;
  sharedC: number;
  engagedC: number;
}

/**
 * Runtime-facing Q1 preview projection used by landing/test consumers.
 *
 * @migration Q1 Preview:
 * This shape is intentionally stable while its source is temporary. Today the
 * values are projected from `source-fixture.ts` inline bridge fields
 * (`previewQuestion` / `answerA` / `answerB`). The canonical target is the
 * first scoring question (`scoring1`) in the corresponding Questions sheet.
 *
 * Consumers must keep using `resolveTestPreviewPayload()` and must not read
 * raw fixture fields directly. Sync may replace the source projection without
 * changing this runtime shape.
 */
export interface InlineQ1PreviewIsTemporaryUntilQuestionsQ1MigrationBridge {
  previewQuestion: LocalizedText;
  answerChoiceA: LocalizedText;
  answerChoiceB: LocalizedText;
}

export interface VariantRegistrySourceInlineQ1Preview {
  previewQuestion: LocalizedText;
  answerA: LocalizedText;
  answerB: LocalizedText;
}

interface VariantRegistrySourceCardCommon {
  seq: number;
  type: LandingContentType;
  variant: string;
  attribute: LandingCardAttribute;
  title: LocalizedText;
  subtitle: LocalizedText;
  tags: LocalizedStringList;
  durationM: number;
  sharedC: number;
  engagedC: number;
}

export interface VariantRegistrySourceTestCard
  extends VariantRegistrySourceCardCommon,
    VariantRegistrySourceInlineQ1Preview {
  type: 'test';
  instruction: LocalizedText | string;
}

export interface VariantRegistrySourceBlogCard extends VariantRegistrySourceCardCommon {
  type: 'blog';
}

export type VariantRegistrySourceCard = VariantRegistrySourceTestCard | VariantRegistrySourceBlogCard;

interface VariantRegistryRuntimeCardCommon {
  variant: string;
  type: LandingContentType;
  attribute: LandingCardAttribute;
  title: LocalizedText;
  subtitle: LocalizedText;
  tags: LocalizedStringList;
}

export interface VariantRegistryRuntimeTestCard extends VariantRegistryRuntimeCardCommon {
  type: 'test';
  test: {
    instruction: LocalizedText | string;
    meta: LandingMeta;
  };
}

export interface VariantRegistryRuntimeBlogCard extends VariantRegistryRuntimeCardCommon {
  type: 'blog';
  blog: {
    meta: LandingMeta;
  };
}

export type VariantRegistryRuntimeLandingCard =
  | VariantRegistryRuntimeTestCard
  | VariantRegistryRuntimeBlogCard;

export interface VariantRegistry {
  landingCards: ReadonlyArray<VariantRegistryRuntimeLandingCard>;
  testPreviewPayloadByVariant: Readonly<Record<string, InlineQ1PreviewIsTemporaryUntilQuestionsQ1MigrationBridge>>;
}

export interface LocaleResolvedText {
  title: string;
  subtitle: string;
  instruction?: string;
}

export interface LandingCardCommon {
  variant: string;
  type: LandingContentType;
  attribute: LandingCardAttribute;
  availability: LandingAvailability;
  title: string;
  subtitle: string;
  tags: string[];
  localeResolvedText: LocaleResolvedText;
}

export interface LandingTestCard extends LandingCardCommon {
  type: 'test';
  test: {
    instruction: string;
    meta: LandingMeta;
  };
}

export interface LandingBlogCard extends LandingCardCommon {
  type: 'blog';
  blog: {
    meta: LandingMeta;
  };
}

export type LandingCard = LandingTestCard | LandingBlogCard;

export interface TestPreviewPayload {
  variant: string;
  previewQuestion: string;
  answerChoiceA: string;
  answerChoiceB: string;
}

export interface FixtureContractReport {
  testCount: number;
  blogCount: number;
  availableCount: number;
  unavailableCount: number;
  optOutCount: number;
  hideCount: number;
  debugCount: number;
  hasLongTokenSubtitle: boolean;
  hasLongBlogSubtitle: boolean;
  hasEmptyTags: boolean;
  hasRequiredSlotOmission: boolean;
}
