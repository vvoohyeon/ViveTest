import type {TelemetryConsentState} from '@/features/landing/telemetry/types';

import type {LandingAvailability, LandingCatalogCardType} from '@/features/landing/data/types';

export type LandingCatalogAudience = 'end-user' | 'qa';
export type LandingCatalogEnvironment = 'production' | 'non-production';

interface RawCardTypeInput {
  cardType?: unknown;
  unavailable?: boolean;
  availability?: unknown;
  debug?: boolean;
}

interface CardTypeCarrier {
  cardType: LandingCatalogCardType;
}

interface CardAvailabilityCarrier extends CardTypeCarrier {
  availability?: LandingAvailability;
}

const LANDING_CARD_TYPES: ReadonlySet<LandingCatalogCardType> = new Set([
  'available',
  'unavailable',
  'hide',
  'opt_out',
  'debug'
]);

export function resolveLandingCatalogEnvironment(): LandingCatalogEnvironment {
  return process.env.NODE_ENV === 'production' ? 'production' : 'non-production';
}

export function normalizeRawLandingCardType(input: RawCardTypeInput): LandingCatalogCardType {
  if (typeof input.cardType === 'string' && LANDING_CARD_TYPES.has(input.cardType as LandingCatalogCardType)) {
    return input.cardType as LandingCatalogCardType;
  }

  if (input.unavailable === true) {
    return 'unavailable';
  }

  if (input.availability === 'unavailable') {
    return 'unavailable';
  }

  if (input.debug === true) {
    return 'debug';
  }

  return 'available';
}

export function resolveAvailabilityFromCardType(cardType: LandingCatalogCardType): LandingAvailability {
  return cardType === 'unavailable' ? 'unavailable' : 'available';
}

export function isEnterableCard(card: CardTypeCarrier): boolean {
  return card.cardType === 'available' || card.cardType === 'opt_out';
}

export function isUnavailablePresentation(card: CardAvailabilityCarrier): boolean {
  return card.cardType === 'unavailable' || card.availability === 'unavailable';
}

export function isCatalogVisibleCard(
  card: CardTypeCarrier,
  consentState: TelemetryConsentState,
  audience: LandingCatalogAudience,
  environment: LandingCatalogEnvironment
): boolean {
  switch (card.cardType) {
    case 'hide':
      return false;
    case 'debug':
      return audience === 'qa' && environment !== 'production';
    case 'available':
      return consentState !== 'OPTED_OUT';
    case 'opt_out':
    case 'unavailable':
      return true;
    default:
      return false;
  }
}
