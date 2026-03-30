import type {TelemetryConsentState} from '@/features/landing/telemetry/types';

import type {
  LandingAvailability,
  LandingCardType,
  LandingCatalogAudience
} from '@/features/landing/data/types';

interface CardTypeLike {
  cardType: LandingCardType;
}

function resolveCardTypeValue(input: CardTypeLike | LandingCardType): LandingCardType {
  return typeof input === 'string' ? input : input.cardType;
}

function isLandingCardType(value: unknown): value is LandingCardType {
  return value === 'available' || value === 'unavailable' || value === 'hide' || value === 'opt_out' || value === 'debug';
}

export function resolveCardType(input: {
  cardType?: unknown;
  availability?: unknown;
  unavailable?: unknown;
  debug?: unknown;
}): LandingCardType {
  if (isLandingCardType(input.cardType)) {
    return input.cardType;
  }

  if (input.unavailable === true || input.availability === 'unavailable') {
    return 'unavailable';
  }

  if (input.debug === true) {
    return 'debug';
  }

  return 'available';
}

export function deriveAvailability(cardType: CardTypeLike | LandingCardType): LandingAvailability {
  return resolveCardTypeValue(cardType) === 'unavailable' ? 'unavailable' : 'available';
}

export function isEnterableCard(cardType: CardTypeLike | LandingCardType): boolean {
  const resolvedCardType = resolveCardTypeValue(cardType);
  return resolvedCardType === 'available' || resolvedCardType === 'opt_out';
}

export function isCatalogVisibleCard(
  cardType: CardTypeLike | LandingCardType,
  input: {
    audience?: LandingCatalogAudience;
    consentState?: TelemetryConsentState;
  } = {}
): boolean {
  const audience = input.audience ?? 'end-user';
  const consentState = input.consentState ?? 'UNKNOWN';
  const resolvedCardType = resolveCardTypeValue(cardType);

  if (audience === 'qa') {
    return true;
  }

  if (resolvedCardType === 'hide' || resolvedCardType === 'debug') {
    return false;
  }

  if (resolvedCardType === 'available') {
    return consentState !== 'OPTED_OUT';
  }

  return true;
}

export function isUnavailablePresentation(cardType: CardTypeLike | LandingCardType): boolean {
  return resolveCardTypeValue(cardType) === 'unavailable';
}

export function isDebugOnlyCard(cardType: CardTypeLike | LandingCardType): boolean {
  return resolveCardTypeValue(cardType) === 'debug';
}
