import type {TelemetryConsentState} from '@/features/telemetry/types';
import type {
  LandingAvailability,
  LandingCardAttribute,
  LandingCatalogAudience
} from '@/features/variant-registry/types';

interface AttributeLike {
  attribute: LandingCardAttribute;
}

function resolveAttributeValue(input: AttributeLike | LandingCardAttribute): LandingCardAttribute {
  return typeof input === 'string' ? input : input.attribute;
}

export function isLandingCardAttribute(value: unknown): value is LandingCardAttribute {
  return value === 'available' || value === 'unavailable' || value === 'hide' || value === 'opt_out' || value === 'debug';
}

export function resolveAttribute(value: unknown, context = 'Landing card attribute'): LandingCardAttribute {
  if (isLandingCardAttribute(value)) {
    return value;
  }

  throw new Error(`${context} must be one of available, unavailable, hide, opt_out, or debug.`);
}

export function deriveAvailability(attribute: AttributeLike | LandingCardAttribute): LandingAvailability {
  return resolveAttributeValue(attribute) === 'unavailable' ? 'unavailable' : 'available';
}

export function isEnterableCard(attribute: AttributeLike | LandingCardAttribute): boolean {
  const resolvedAttribute = resolveAttributeValue(attribute);
  return resolvedAttribute === 'available' || resolvedAttribute === 'opt_out';
}

export function isCatalogVisibleCard(
  attribute: AttributeLike | LandingCardAttribute,
  input: {
    audience?: LandingCatalogAudience;
    consentState?: TelemetryConsentState;
  } = {}
): boolean {
  const audience = input.audience ?? 'end-user';
  const consentState = input.consentState ?? 'UNKNOWN';
  const resolvedAttribute = resolveAttributeValue(attribute);

  if (audience === 'qa') {
    return true;
  }

  if (resolvedAttribute === 'hide' || resolvedAttribute === 'debug') {
    return false;
  }

  if (resolvedAttribute === 'available') {
    return consentState !== 'OPTED_OUT';
  }

  return true;
}

export function isUnavailablePresentation(attribute: AttributeLike | LandingCardAttribute): boolean {
  return resolveAttributeValue(attribute) === 'unavailable';
}

export function isDebugOnlyCard(attribute: AttributeLike | LandingCardAttribute): boolean {
  return resolveAttributeValue(attribute) === 'debug';
}
