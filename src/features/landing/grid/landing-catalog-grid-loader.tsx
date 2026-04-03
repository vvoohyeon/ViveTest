'use client';

import {useMemo} from 'react';

import type {AppLocale} from '@/config/site';
import {createLandingCatalog} from '@/features/landing/data';
import {LandingCatalogGrid} from '@/features/landing/grid/landing-catalog-grid';
import {useTelemetryConsentSource} from '@/features/landing/telemetry/consent-source';

interface LandingCatalogGridLoaderProps {
  locale: AppLocale;
  assetBackedVariants: ReadonlyArray<string>;
}

export function LandingCatalogGridLoader({locale, assetBackedVariants}: LandingCatalogGridLoaderProps) {
  const consentSnapshot = useTelemetryConsentSource();
  const cards = useMemo(
    () =>
      createLandingCatalog(locale, {
        consentState: consentSnapshot.synced ? consentSnapshot.consentState : 'UNKNOWN'
      }),
    [consentSnapshot.consentState, consentSnapshot.synced, locale]
  );

  return <LandingCatalogGrid cards={cards} assetBackedVariants={assetBackedVariants} />;
}
