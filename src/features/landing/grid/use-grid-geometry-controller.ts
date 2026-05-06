import type {MutableRefObject, RefObject} from 'react';
import {useEffect, useLayoutEffect, useReducer, useRef, useState} from 'react';

import type {LandingCard} from '@/features/variant-registry';
import type {LandingCardSpacingContract} from '@/features/landing/grid/landing-grid-card';
import {
  freezeBaselineRows,
  initialLandingBaselineState,
  releaseBaselineRows,
  type BaselineSnapshot,
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

// allow closing animation frame to settle before releasing frozen rows
const BASELINE_RELEASE_DELAY_MS = 32;

type CardSpacingMap = Record<string, LandingCardSpacingContract>;

interface UseGridGeometryControllerInput {
  cards: LandingCard[];
  shellRef: RefObject<HTMLElement | null>;
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

type BaselineAction =
  | {type: 'FREEZE'; activeCardVariant: string; snapshots: readonly BaselineSnapshot[]}
  | {type: 'RELEASE'};

function baselineReducer(state: LandingBaselineState, action: BaselineAction): LandingBaselineState {
  switch (action.type) {
    case 'FREEZE':
      if (state.phase === 'BASELINE_READY') {
        return freezeBaselineRows({
          state,
          activeCardVariant: action.activeCardVariant,
          snapshots: action.snapshots
        });
      }
      if (state.activeCardVariant === action.activeCardVariant) return state;
      return {...state, activeCardVariant: action.activeCardVariant};
    case 'RELEASE':
      return releaseBaselineRows();
    default:
      return state;
  }
}

function captureBaselineSnapshots(shellElement: HTMLElement, rowIndexes: readonly number[]): BaselineSnapshot[] {
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

function serializePlanKey(plan: LandingGridPlan): string {
  return [
    plan.tier,
    plan.columnMode,
    plan.row1Columns,
    plan.rowNColumns,
    plan.rows.map((row) => `${row.columns}-${row.cardCount}`).join('|')
  ].join(':');
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
  const [baselineState, dispatchBaseline] = useReducer(baselineReducer, initialLandingBaselineState);
  const baselineReleaseTimerRef = useRef<number>(0);

  useLayoutEffect(() => {
    // Skip spacing remeasurement while a card is expanded on desktop;
    // the expanded overlay does not change row compensation values.
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
  }, [
    activeVisualCardVariant,
    cards,
    plan,
    shellRef,
    viewportWidth // viewportWidth is intentionally listed as a deps re-trigger signal even though it is not read in the effect body.
  ]);

  useEffect(() => {
    let frameId = 0;
    const clearTimer = () => {
      if (baselineReleaseTimerRef.current !== 0) {
        window.clearTimeout(baselineReleaseTimerRef.current);
        baselineReleaseTimerRef.current = 0;
      }
    };
    const dispatchViaRaf = (action: BaselineAction) => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        dispatchBaseline(action);
      });
    };
    const cleanup = () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      clearTimer();
    };

    if (plan.tier === 'mobile') {
      clearTimer();
      dispatchViaRaf({type: 'RELEASE'});
      return cleanup;
    }

    if (activeVisualCardVariant) {
      clearTimer();
      const shell = shellRef.current;
      if (!shell) {
        return cleanup;
      }

      const snapshots = captureBaselineSnapshots(
        shell,
        plan.rows.map((row) => row.rowIndex)
      );
      dispatchViaRaf({
        type: 'FREEZE',
        activeCardVariant: activeVisualCardVariant,
        snapshots
      });
      return cleanup;
    }

    if (baselineReleaseTimerRef.current === 0) {
      baselineReleaseTimerRef.current = window.setTimeout(() => {
        baselineReleaseTimerRef.current = 0;
        dispatchBaseline({type: 'RELEASE'});
      }, BASELINE_RELEASE_DELAY_MS);
    }

    return cleanup;
  }, [activeVisualCardVariant, plan.rows, plan.tier, shellRef]);

  useEffect(() => {
    const nextPlanKey = serializePlanKey(plan);

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
