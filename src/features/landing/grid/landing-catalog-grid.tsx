'use client';

import {type CSSProperties, useEffect, useMemo, useRef, useState} from 'react';
import {useLocale, useTranslations} from 'next-intl';

import {defaultLocale, isLocale} from '@/config/site';
import type {LandingCard} from '@/features/landing/data';
import {LandingGridCard} from '@/features/landing/grid/landing-grid-card';
import {buildLandingGridPlan, resolveLandingAvailableWidth} from '@/features/landing/grid/layout-plan';

const INITIAL_VIEWPORT_WIDTH = 1280;

export const LANDING_GRID_PLAN_CHANGED_EVENT = 'landing:grid-plan-changed';

interface LandingCatalogGridProps {
  cards: LandingCard[];
}

function readViewportWidth(): number {
  if (typeof window === 'undefined') {
    return INITIAL_VIEWPORT_WIDTH;
  }

  return window.innerWidth;
}

export function LandingCatalogGrid({cards}: LandingCatalogGridProps) {
  const previousPlanKeyRef = useRef<string | null>(null);
  const localeFromContext = useLocale();
  const t = useTranslations('landing');
  const locale = isLocale(localeFromContext) ? localeFromContext : defaultLocale;

  const [viewportWidth, setViewportWidth] = useState<number>(readViewportWidth);
  const [interactionMode, setInteractionMode] = useState<'hover' | 'tap'>('tap');
  const availableWidth = useMemo(() => resolveLandingAvailableWidth(viewportWidth), [viewportWidth]);
  const cardCopy = {
    comingSoon: t('comingSoon'),
    metaEstimated: t('metaEstimated'),
    metaShares: t('metaShares'),
    metaAttempts: t('metaAttempts'),
    metaReadTime: t('metaReadTime'),
    metaViews: t('metaViews'),
    readMore: t('readMore')
  };

  const plan = useMemo(
    () =>
      buildLandingGridPlan({
        viewportWidth,
        availableWidth,
        cardCount: cards.length
      }),
    [availableWidth, cards.length, viewportWidth]
  );

  useEffect(() => {
    let frame = 0;

    const syncViewportWidth = () => {
      const nextViewportWidth = readViewportWidth();
      setViewportWidth((previous) => (previous === nextViewportWidth ? previous : nextViewportWidth));
    };

    const scheduleSync = () => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        syncViewportWidth();
      });
    };

    syncViewportWidth();
    window.addEventListener('resize', scheduleSync, {passive: true});

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener('resize', scheduleSync);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const query = window.matchMedia('(hover: hover) and (pointer: fine)');

    const syncInteractionMode = () => {
      setInteractionMode(query.matches ? 'hover' : 'tap');
    };

    syncInteractionMode();
    query.addEventListener('change', syncInteractionMode);

    return () => {
      query.removeEventListener('change', syncInteractionMode);
    };
  }, []);

  useEffect(() => {
    const nextPlanKey = `${plan.tier}:${plan.row1Columns}:${plan.rowNColumns}:${plan.rows
      .map((row) => `${row.columns}-${row.cardCount}`)
      .join('|')}`;

    if (
      previousPlanKeyRef.current &&
      previousPlanKeyRef.current !== nextPlanKey &&
      typeof window !== 'undefined'
    ) {
      window.dispatchEvent(
        new CustomEvent(LANDING_GRID_PLAN_CHANGED_EVENT, {
          detail: {
            previousPlanKey: previousPlanKeyRef.current,
            nextPlanKey
          }
        })
      );
    }

    previousPlanKeyRef.current = nextPlanKey;
  }, [plan]);

  return (
    <section
      className="landing-grid-shell"
      aria-label="Landing Catalog Grid"
      data-testid="landing-grid-shell"
      data-grid-tier={plan.tier}
      data-row1-columns={plan.row1Columns}
      data-rown-columns={plan.rowNColumns}
    >
      <div className="landing-grid-container" data-testid="landing-grid-container">
        {plan.rows.map((row) => (
          <div
            key={row.rowIndex}
            className="landing-grid-row"
            data-testid={`landing-grid-row-${row.rowIndex}`}
            data-row-index={row.rowIndex}
            data-row-role={row.role}
            data-columns={row.columns}
            data-card-count={row.cardCount}
            data-underfilled={row.isUnderfilled ? 'true' : 'false'}
            style={{'--landing-grid-columns': String(row.columns)} as CSSProperties}
          >
            {cards.slice(row.startIndex, row.endIndex).map((card, offset) => {
              const sequence = row.startIndex + offset;

              return (
                <LandingGridCard
                  key={card.id}
                  card={card}
                  locale={locale}
                  interactionMode={interactionMode}
                  sequence={sequence}
                  copy={cardCopy}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
