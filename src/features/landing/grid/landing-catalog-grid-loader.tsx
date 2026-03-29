'use client';

import {useMemo} from 'react';

import {isCatalogVisibleCard, resolveLandingCatalogEnvironment, type LandingCard} from '@/features/landing/data';
import {LandingCatalogGrid} from '@/features/landing/grid/landing-catalog-grid';
import {useTelemetryConsentSource} from '@/features/landing/telemetry/consent-source';

interface LandingCatalogGridLoaderProps {
  cards: LandingCard[];
}

export function LandingCatalogGridLoader({cards}: LandingCatalogGridLoaderProps) {
  const consentSnapshot = useTelemetryConsentSource();
  const filteredCards = useMemo(
    () =>
      cards.filter((card) =>
        isCatalogVisibleCard(
          card,
          consentSnapshot.synced ? consentSnapshot.consentState : 'UNKNOWN',
          'end-user',
          resolveLandingCatalogEnvironment()
        )
      ),
    [cards, consentSnapshot.consentState, consentSnapshot.synced]
  );

  return <LandingCatalogGrid cards={filteredCards} />;
}
