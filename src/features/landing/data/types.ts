import type {AppLocale} from '@/config/site';

export type LandingContentType = 'test' | 'blog';
export type LandingCardType = 'available' | 'unavailable' | 'hide' | 'opt_out' | 'debug';
export type LandingAvailability = 'available' | 'unavailable';
export type LandingCatalogAudience = 'end-user' | 'qa';

export type LocalizedText = Partial<Record<AppLocale, string>> & {
  default?: string;
};

export type LocalizedStringList = Partial<Record<AppLocale, ReadonlyArray<string>>> & {
  default?: ReadonlyArray<string>;
};

export interface RawTestPayload {
  variant: string;
  instruction: LocalizedText | string;
  previewQuestion: LocalizedText;
  answerChoiceA: LocalizedText;
  answerChoiceB: LocalizedText;
  meta: {
    estimatedMinutes: number;
    shares: number;
    attempts: number;
  };
}

export interface RawBlogPayload {
  articleId: string;
  meta: {
    readMinutes: number;
    shares: number;
    views: number;
  };
}

interface RawLandingCardCommon {
  id: string;
  type: LandingContentType;
  cardType?: LandingCardType;
  availability?: LandingAvailability;
  unavailable?: boolean;
  title: LocalizedText;
  subtitle: LocalizedText;
  thumbnailOrIcon: string;
  tags: LocalizedStringList;
  isHero?: boolean;
  debug?: boolean;
  sample?: boolean;
}

export interface RawTestCard extends RawLandingCardCommon {
  type: 'test';
  test: RawTestPayload;
}

export interface RawBlogCard extends RawLandingCardCommon {
  type: 'blog';
  blog: RawBlogPayload;
}

export type RawLandingCard = RawTestCard | RawBlogCard;

export interface LocaleResolvedText {
  title: string;
  subtitle: string;
  instruction?: string;
  previewQuestion?: string;
  answerChoiceA?: string;
  answerChoiceB?: string;
}

export interface LandingCardCommon {
  id: string;
  type: LandingContentType;
  cardType: LandingCardType;
  availability: LandingAvailability;
  title: string;
  subtitle: string;
  thumbnailOrIcon: string;
  tags: string[];
  isHero: boolean;
  sourceParam: string;
  localeResolvedText: LocaleResolvedText;
  debug: boolean;
  sample: boolean;
}

export interface LandingTestCard extends LandingCardCommon {
  type: 'test';
  test: {
    instruction: string;
    previewQuestion: string;
    answerChoiceA: string;
    answerChoiceB: string;
    meta: {
      estimatedMinutes: number;
      shares: number;
      attempts: number;
    };
  };
}

export interface LandingBlogCard extends LandingCardCommon {
  type: 'blog';
  blog: {
    meta: {
      readMinutes: number;
      shares: number;
      views: number;
    };
  };
}

export type LandingCard = LandingTestCard | LandingBlogCard;

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
  hasDebugSample: boolean;
  hasRequiredSlotOmission: boolean;
}
