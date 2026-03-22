export {LandingCatalogGrid, LANDING_GRID_PLAN_CHANGED_EVENT} from '@/features/landing/grid/landing-catalog-grid';
export {LandingCatalogGridLoader} from '@/features/landing/grid/landing-catalog-grid-loader';
export {getDefaultCardCopy, LandingGridCard} from '@/features/landing/grid/landing-grid-card';
export type {
  LandingCardCopy,
  LandingCardInteractionMode,
  LandingCardSpacingContract,
  LandingCardVisualState
} from '@/features/landing/grid/landing-grid-card';
export {
  buildLandingGridPlan,
  CONTAINER_MAX_WIDTH,
  DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE,
  DESKTOP_WIDE_MIN_GRID_INLINE_SIZE,
  MOBILE_SIDE_PADDING,
  MOBILE_MAX_VIEWPORT_WIDTH,
  NARROW_PADDING_MAX_VIEWPORT_WIDTH,
  NARROW_TABLET_SIDE_PADDING,
  resolveLandingGridColumns,
  resolveLandingViewportTier,
  TABLET_DESKTOP_SIDE_PADDING,
  TABLET_MAX_VIEWPORT_WIDTH
} from '@/features/landing/grid/layout-plan';
export {buildRowCompensationModel, LANDING_CARD_BASE_GAP_PX} from '@/features/landing/grid/spacing-plan';
export type {RowCompensationDecision, RowNaturalMeasurement} from '@/features/landing/grid/spacing-plan';
export type {
  LandingGridColumnMode,
  LandingGridInput,
  LandingGridPlan,
  LandingGridRowPlan,
  LandingGridTier
} from '@/features/landing/grid/layout-plan';
