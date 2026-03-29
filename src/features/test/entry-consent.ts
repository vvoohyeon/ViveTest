import type {LandingCard} from '@/features/landing/data';
import type {TelemetryConsentState} from '@/features/landing/telemetry/types';

export type TestEntryConsentMode = 'open' | 'gate' | 'blocked' | 'unsupported';

export function resolveTestEntryConsentMode(input: {
  card: LandingCard | null;
  consentState: TelemetryConsentState;
  synced: boolean;
}): TestEntryConsentMode {
  const {card, consentState, synced} = input;

  if (!card || card.type !== 'test') {
    return 'unsupported';
  }

  if (card.cardType === 'opt_out') {
    return 'open';
  }

  if (card.cardType !== 'available') {
    return 'unsupported';
  }

  if (!synced || consentState === 'UNKNOWN') {
    return 'gate';
  }

  if (consentState === 'OPTED_OUT') {
    return 'blocked';
  }

  return 'open';
}
