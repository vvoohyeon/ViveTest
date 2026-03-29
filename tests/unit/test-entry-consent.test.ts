import {describe, expect, it} from 'vitest';

import {createLandingCatalog} from '../../src/features/landing/data';
import {resolvePersistentConsentShellState} from '../../src/features/landing/shell/persistent-consent-shell';
import {resolveTestEntryConsentMode} from '../../src/features/test/entry-consent';

describe('test entry consent helpers', () => {
  const cards = createLandingCatalog('en', {audience: 'qa', includeHiddenCards: true});
  const availableCard = cards.find((card) => card.type === 'test' && card.sourceParam === 'qmbti') ?? null;
  const optOutCard = cards.find((card) => card.type === 'test' && card.sourceParam === 'energy-check') ?? null;

  it('routes available cards through gate/open/blocked by consent state', () => {
    expect(resolveTestEntryConsentMode({card: availableCard, consentState: 'UNKNOWN', synced: true})).toBe('gate');
    expect(resolveTestEntryConsentMode({card: availableCard, consentState: 'UNKNOWN', synced: false})).toBe('gate');
    expect(resolveTestEntryConsentMode({card: availableCard, consentState: 'OPTED_IN', synced: true})).toBe('open');
    expect(resolveTestEntryConsentMode({card: availableCard, consentState: 'OPTED_OUT', synced: true})).toBe('blocked');
  });

  it('never gates opt-out cards', () => {
    expect(resolveTestEntryConsentMode({card: optOutCard, consentState: 'UNKNOWN', synced: true})).toBe('open');
    expect(resolveTestEntryConsentMode({card: optOutCard, consentState: 'OPTED_OUT', synced: true})).toBe('open');
  });

  it('switches the persistent shell between banner and gate modes from route metadata', () => {
    expect(
      resolvePersistentConsentShellState({
        pathname: '/en',
        locale: 'en',
        cards,
        pendingTransition: null,
        consentState: 'UNKNOWN',
        synced: true
      }).mode
    ).toBe('banner');

    expect(
      resolvePersistentConsentShellState({
        pathname: '/en/test/qmbti',
        locale: 'en',
        cards,
        pendingTransition: null,
        consentState: 'UNKNOWN',
        synced: true
      }).mode
    ).toBe('gate');

    expect(
      resolvePersistentConsentShellState({
        pathname: '/en',
        locale: 'en',
        cards,
        pendingTransition: {
          transitionId: 'transition-1',
          sourceCardId: 'test-qmbti',
          targetRoute: '/en/test/qmbti',
          targetType: 'test',
          startedAtMs: 1,
          variant: 'qmbti'
        },
        consentState: 'UNKNOWN',
        synced: true
      }).mode
    ).toBe('gate');
  });
});
