'use client';

import {useLocale} from 'next-intl';
import {usePathname} from 'next/navigation';
import {useId, useMemo} from 'react';

import {defaultLocale, isLocale, type AppLocale} from '@/config/site';
import {createLandingCatalog, type LandingCard} from '@/features/landing/data';
import {useTelemetryConsentSource} from '@/features/landing/telemetry/consent-source';
import type {TelemetryConsentState} from '@/features/landing/telemetry/types';
import {usePendingLandingTransition} from '@/features/landing/transition/use-pending-landing-transition';
import type {PendingLandingTransition} from '@/features/landing/transition/store';
import {TelemetryConsentShell} from '@/features/landing/shell/telemetry-consent-shell';
import {resolveTestEntryConsentMode} from '@/features/test/entry-consent';
export interface PersistentConsentShellState {
  mode: 'hidden' | 'banner' | 'gate';
  testVariant: string | null;
}

function resolveAppLocale(value: string): AppLocale {
  return isLocale(value) ? value : defaultLocale;
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function extractTestVariantFromPath(pathname: string, locale: AppLocale): string | null {
  const match = pathname.match(new RegExp(`^/${escapeForRegex(locale)}/test/([a-z0-9-]+)$`, 'u'));
  return match?.[1] ?? null;
}

function resolveTestCard(cards: LandingCard[], variant: string | null): LandingCard | null {
  if (!variant) {
    return null;
  }

  return cards.find((card) => card.type === 'test' && card.sourceParam === variant) ?? null;
}

export function resolvePersistentConsentShellState(input: {
  pathname: string;
  locale: AppLocale;
  cards: LandingCard[];
  pendingTransition: PendingLandingTransition | null;
  consentState: TelemetryConsentState;
  synced: boolean;
}): PersistentConsentShellState {
  const routeVariant = extractTestVariantFromPath(input.pathname, input.locale);
  const pendingVariant =
    input.pendingTransition?.targetType === 'test' ? (input.pendingTransition.variant ?? null) : null;
  const testVariant = routeVariant ?? pendingVariant;
  const testCard = resolveTestCard(input.cards, testVariant);
  const testEntryConsentMode = resolveTestEntryConsentMode({
    card: testCard,
    consentState: input.consentState,
    synced: input.synced
  });

  if (testEntryConsentMode === 'gate') {
    return {
      mode: 'gate',
      testVariant
    };
  }

  if (input.synced && input.consentState === 'UNKNOWN') {
    return {
      mode: 'banner',
      testVariant: null
    };
  }

  return {
    mode: 'hidden',
    testVariant: null
  };
}

export function PersistentConsentShell() {
  const locale = resolveAppLocale(useLocale());
  const pathname = usePathname();
  const pendingTransition = usePendingLandingTransition();
  const consentSnapshot = useTelemetryConsentSource();
  const instanceId = `consent-shell-${useId()}`;
  const cards = useMemo(
    () => createLandingCatalog(locale, {audience: 'qa', includeHiddenCards: true}),
    [locale]
  );
  const shellState = useMemo(
    () =>
      resolvePersistentConsentShellState({
        pathname,
        locale,
        cards,
        pendingTransition,
        consentState: consentSnapshot.consentState,
        synced: consentSnapshot.synced
      }),
    [cards, consentSnapshot.consentState, consentSnapshot.synced, locale, pathname, pendingTransition]
  );

  if (shellState.mode === 'hidden') {
    return null;
  }

  return (
    <TelemetryConsentShell
      key={`${shellState.mode}:${shellState.testVariant ?? 'none'}`}
      instanceId={instanceId}
      mode={shellState.mode}
    />
  );
}
