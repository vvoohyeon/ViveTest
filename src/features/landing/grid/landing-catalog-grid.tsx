'use client';

import {type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useLocale, useTranslations} from 'next-intl';

import {defaultLocale, isLocale} from '@/config/site';
import type {LandingCard} from '@/features/landing/data';
import {type LandingCardSpacingContract, LandingGridCard} from '@/features/landing/grid/landing-grid-card';
import {buildLandingGridPlan, resolveLandingAvailableWidth} from '@/features/landing/grid/layout-plan';
import {
  buildRowCompensationModel,
  deriveNaturalHeightFromGeometry,
  LANDING_CARD_BASE_GAP_PX
} from '@/features/landing/grid/spacing-plan';

const INITIAL_VIEWPORT_WIDTH = 1280;

export const LANDING_GRID_PLAN_CHANGED_EVENT = 'landing:grid-plan-changed';

interface LandingCatalogGridProps {
  cards: LandingCard[];
}

type CardSpacingMap = Record<string, LandingCardSpacingContract>;

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.5;
}

function isSameSpacingModel(a: CardSpacingMap, b: CardSpacingMap): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    const left = a[key];
    const right = b[key];

    if (!right) {
      return false;
    }

    if (
      !nearlyEqual(left.baseGapPx, right.baseGapPx) ||
      !nearlyEqual(left.compGapPx, right.compGapPx) ||
      left.needsComp !== right.needsComp ||
      !nearlyEqual(left.naturalHeightPx, right.naturalHeightPx) ||
      !nearlyEqual(left.rowMaxNaturalHeightPx, right.rowMaxNaturalHeightPx)
    ) {
      return false;
    }
  }

  return true;
}

function readViewportWidth(): number {
  if (typeof window === 'undefined') {
    return INITIAL_VIEWPORT_WIDTH;
  }

  return window.innerWidth;
}

export function LandingCatalogGrid({cards}: LandingCatalogGridProps) {
  const previousPlanKeyRef = useRef<string | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const localeFromContext = useLocale();
  const t = useTranslations('landing');
  const locale = isLocale(localeFromContext) ? localeFromContext : defaultLocale;

  const [viewportWidth, setViewportWidth] = useState<number>(readViewportWidth);
  const [interactionMode, setInteractionMode] = useState<'hover' | 'tap'>('tap');
  const [spacingModel, setSpacingModel] = useState<CardSpacingMap>({});
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

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const shell = shellRef.current;
      if (!shell) {
        return;
      }

      const nextSpacingModel: CardSpacingMap = {};

      for (const row of plan.rows) {
        const rowCards = cards.slice(row.startIndex, row.endIndex);
        if (rowCards.length === 0) {
          continue;
        }

        const rowElement = shell.querySelector<HTMLElement>(`[data-row-index="${row.rowIndex}"]`);
        if (!rowElement) {
          continue;
        }

        const cardElements = Array.from(rowElement.querySelectorAll<HTMLElement>('[data-testid="landing-grid-card"]'));
        const cardElementById = new Map<string, HTMLElement>();
        for (const element of cardElements) {
          const cardId = element.dataset.cardId;
          if (cardId) {
            cardElementById.set(cardId, element);
          }
        }

        const rowMeasurements = rowCards
          .map((card) => {
            const cardElement = cardElementById.get(card.id);
            if (!cardElement) {
              return null;
            }

            const cardContentElement = cardElement.querySelector<HTMLElement>('.landing-grid-card-content');
            if (!cardContentElement) {
              return null;
            }

            const tagsElement = cardContentElement.querySelector<HTMLElement>('[data-slot="tags"]');
            if (!tagsElement) {
              return null;
            }

            const appliedCompGap = Number.parseFloat(cardElement.dataset.compGap ?? '0') || 0;
            const contentRect = cardContentElement.getBoundingClientRect();
            const tagsRect = tagsElement.getBoundingClientRect();

            return deriveNaturalHeightFromGeometry({
              cardId: card.id,
              contentTop: contentRect.top,
              tagsBottom: tagsRect.bottom,
              appliedCompGap
            });
          })
          .filter((measurement): measurement is {cardId: string; naturalHeight: number} => measurement !== null);

        const rowCompensation = buildRowCompensationModel(rowMeasurements);
        for (const decision of rowCompensation) {
          nextSpacingModel[decision.cardId] = {
            baseGapPx: LANDING_CARD_BASE_GAP_PX,
            compGapPx: decision.compGap,
            needsComp: decision.needsComp,
            naturalHeightPx: decision.naturalHeight,
            rowMaxNaturalHeightPx: decision.rowMaxNaturalHeight
          };
        }
      }

      for (const card of cards) {
        if (nextSpacingModel[card.id]) {
          continue;
        }

        nextSpacingModel[card.id] = {
          baseGapPx: LANDING_CARD_BASE_GAP_PX,
          compGapPx: 0,
          needsComp: false,
          naturalHeightPx: 0,
          rowMaxNaturalHeightPx: 0
        };
      }

      setSpacingModel((previous) => (isSameSpacingModel(previous, nextSpacingModel) ? previous : nextSpacingModel));
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [cards, plan, viewportWidth]);

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
      ref={shellRef}
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
                  spacing={spacingModel[card.id]}
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
