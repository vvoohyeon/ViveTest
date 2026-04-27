import type {MutableRefObject, RefObject} from 'react';
import {useEffect, useLayoutEffect, useState} from 'react';

import type {LandingCard} from '@/features/variant-registry';
import type {LandingCardSpacingContract} from '@/features/landing/grid/landing-grid-card';
import {
  freezeBaselineRows,
  initialLandingBaselineState,
  markBaselineRestorePending,
  releaseBaselineRows,
  type LandingBaselineState
} from '@/features/landing/grid/baseline-manager';
import type {
  LandingGridColumnMode,
  LandingGridPlan
} from '@/features/landing/grid/layout-plan';
import {
  buildRowCompensationModel,
  deriveNaturalHeightFromGeometry,
  LANDING_CARD_BASE_GAP_PX
} from '@/features/landing/grid/spacing-plan';

export const LANDING_GRID_PLAN_CHANGED_EVENT = 'landing:grid-plan-changed';

type CardSpacingMap = Record<string, LandingCardSpacingContract>;

interface UseGridGeometryControllerInput {
  cards: LandingCard[];
  shellRef: RefObject<HTMLElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  previousPlanKeyRef: MutableRefObject<string | null>;
  previousColumnModeRef: MutableRefObject<LandingGridColumnMode | null>;
  plan: LandingGridPlan;
  viewportWidth: number;
  activeVisualCardVariant: string | null;
  collapseExpandedCard: () => void;
}

interface UseGridGeometryControllerOutput {
  spacingModel: CardSpacingMap;
  baselineState: LandingBaselineState;
}

function captureBaselineSnapshots(shellElement: HTMLElement, rowIndexes: readonly number[]) {
  return rowIndexes.flatMap((rowIndex) => {
    const rowElement = shellElement.querySelector<HTMLElement>(`[data-row-index="${rowIndex}"]`);
    if (!rowElement) {
      return [];
    }

    const rect = rowElement.getBoundingClientRect();
    return [
      {
        rowId: `row-${rowIndex}`,
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height
      }
    ];
  });
}

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

export function useGridGeometryController(input: UseGridGeometryControllerInput): UseGridGeometryControllerOutput {
  const {
    cards,
    shellRef,
    previousPlanKeyRef,
    previousColumnModeRef,
    plan,
    viewportWidth,
    activeVisualCardVariant,
    collapseExpandedCard
  } = input;
  const [spacingModel, setSpacingModel] = useState<CardSpacingMap>({});
  const [baselineState, setBaselineState] = useState(initialLandingBaselineState);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (plan.tier !== 'mobile' && activeVisualCardVariant) {
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
        const cardElementByVariant = new Map<string, HTMLElement>();
        for (const element of cardElements) {
          const cardVariant = element.dataset.cardVariant;
          if (cardVariant) {
            cardElementByVariant.set(cardVariant, element);
          }
        }

        const rowMeasurements = rowCards
          .map((card) => {
            const cardElement = cardElementByVariant.get(card.variant);
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
              cardVariant: card.variant,
              contentTop: contentRect.top,
              tagsBottom: tagsRect.bottom,
              appliedCompGap
            });
          })
          .filter((measurement): measurement is {cardVariant: string; naturalHeight: number} => measurement !== null);

        const rowCompensation = buildRowCompensationModel(rowMeasurements);
        for (const decision of rowCompensation) {
          nextSpacingModel[decision.cardVariant] = {
            baseGapPx: LANDING_CARD_BASE_GAP_PX,
            compGapPx: decision.compGap,
            needsComp: decision.needsComp,
            naturalHeightPx: decision.naturalHeight,
            rowMaxNaturalHeightPx: decision.rowMaxNaturalHeight
          };
        }
      }

      for (const card of cards) {
        if (nextSpacingModel[card.variant]) {
          continue;
        }

        nextSpacingModel[card.variant] = {
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
  }, [activeVisualCardVariant, cards, plan, shellRef, viewportWidth]);

  useEffect(() => {
    let frame = 0;
    let baselineReleaseTimer = 0;
    const clearBaselineReleaseTimer = () => {
      if (baselineReleaseTimer !== 0) {
        window.clearTimeout(baselineReleaseTimer);
        baselineReleaseTimer = 0;
      }
    };
    const scheduleBaselineState = (
      updater: LandingBaselineState | ((previous: LandingBaselineState) => LandingBaselineState)
    ) => {
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setBaselineState(updater);
      });
    };
    const cleanup = () => {
      clearBaselineReleaseTimer();
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };

    if (typeof window === 'undefined') {
      return;
    }

    if (plan.tier === 'mobile') {
      clearBaselineReleaseTimer();
      scheduleBaselineState((previous) => (previous.phase === 'BASELINE_READY' ? previous : releaseBaselineRows()));
      return cleanup;
    }

    if (activeVisualCardVariant) {
      clearBaselineReleaseTimer();
      const shell = shellRef.current;
      if (!shell) {
        return;
      }

      const snapshots = captureBaselineSnapshots(
        shell,
        plan.rows.map((row) => row.rowIndex)
      );
      scheduleBaselineState((previous) =>
        previous.phase === 'BASELINE_READY'
          ? freezeBaselineRows({
              state: previous,
              activeCardVariant: activeVisualCardVariant,
              snapshots
            })
          : previous.activeCardVariant === activeVisualCardVariant
            ? previous
            : {
                ...previous,
                activeCardVariant: activeVisualCardVariant
              }
      );
      return cleanup;
    }

    if (baselineState.phase === 'BASELINE_READY') {
      clearBaselineReleaseTimer();
      return;
    }

    if (baselineState.phase === 'BASELINE_FROZEN') {
      scheduleBaselineState((previous) => markBaselineRestorePending(previous));
    }

    baselineReleaseTimer = window.setTimeout(() => {
      baselineReleaseTimer = 0;
      setBaselineState(releaseBaselineRows());
    }, 32);

    return cleanup;
  }, [activeVisualCardVariant, baselineState.phase, plan.rows, plan.tier, shellRef]);

  useEffect(() => {
    const nextPlanKey = `${plan.tier}:${plan.columnMode}:${plan.row1Columns}:${plan.rowNColumns}:${plan.rows
      .map((row) => `${row.columns}-${row.cardCount}`)
      .join('|')}`;

    if (
      previousPlanKeyRef.current &&
      previousPlanKeyRef.current !== nextPlanKey &&
      typeof window !== 'undefined'
    ) {
      if (plan.tier !== 'mobile' && activeVisualCardVariant) {
        collapseExpandedCard();
      }

      window.dispatchEvent(
        new CustomEvent(LANDING_GRID_PLAN_CHANGED_EVENT, {
          detail: {
            previousPlanKey: previousPlanKeyRef.current,
            nextPlanKey,
            previousColumnMode: previousColumnModeRef.current,
            nextColumnMode: plan.columnMode
          }
        })
      );
    }

    previousPlanKeyRef.current = nextPlanKey;
    previousColumnModeRef.current = plan.columnMode;
  }, [
    activeVisualCardVariant,
    collapseExpandedCard,
    plan,
    previousColumnModeRef,
    previousPlanKeyRef
  ]);

  return {
    spacingModel,
    baselineState
  };
}
