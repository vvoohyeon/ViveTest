import type {BinaryChoiceCode} from '@/features/test/data/test-fixture';

export type PageState =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'REDUCED_MOTION'
  | 'SENSOR_DENIED'
  | 'TRANSITIONING';

export type CardState = 'NORMAL' | 'EXPANDED' | 'FOCUSED';

export type InteractionMode = 'TAP_MODE' | 'HOVER_MODE';

export type CatalogCardType = 'test' | 'blog';
export type CatalogAvailability = 'available' | 'unavailable';

export type TestMeta = {
  estimatedMinutes: number;
  shares: number;
  totalRuns: number;
};

export type BlogMeta = {
  readMinutes: number;
  shares: number;
  views: number;
};

export type CatalogCardBase = {
  id: string;
  type: CatalogCardType;
  availability: CatalogAvailability;
  cardTitle: string;
  cardSubtitle: string;
  thumbnailOrIcon: string;
  tags: string[];
  isDebug?: boolean;
};

export type TestCatalogCard = CatalogCardBase & {
  type: 'test';
  variant: string;
  previewQuestion: string;
  answerChoiceA: string;
  answerChoiceB: string;
  meta: TestMeta;
};

export type BlogCatalogCard = CatalogCardBase & {
  type: 'blog';
  summary: string;
  meta: BlogMeta;
  primaryCTAKey: 'landing.readMore';
};

export type CatalogCard = TestCatalogCard | BlogCatalogCard;

export type TransitionTarget = {
  transitionId: string;
  startedAt: number;
  type: 'test' | 'blog';
  cardId: string;
  path: string;
  variant?: string;
  answer?: BinaryChoiceCode;
};

export type TransitionFailReason = 'locale_duplicate' | 'route_entry_timeout' | 'navigation_error';
