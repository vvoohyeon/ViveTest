'use client';

import Link from 'next/link';
import type {CSSProperties} from 'react';
import {useId, useRef} from 'react';

import {
  isDesktopShellLogicallyInteractive,
  shouldRenderDesktopStageShell
} from '@/features/landing/grid/desktop-shell-phase';
import {useLandingCardTitleSplit} from '@/features/landing/grid/landing-card-title-continuity';
import type {
  LandingCardSpacingContract,
  LandingCardVisualState,
  LandingGridCardProps
} from '@/features/landing/grid/landing-card-contract';
import {
  joinClassNames,
  resolveTransformOriginClassName,
  LANDING_GRID_CARD_CONTENT_CLASSNAME,
  LANDING_GRID_CARD_DESKTOP_STAGE_CLASSNAME,
  LANDING_GRID_CARD_MOBILE_TRANSIENT_SHELL_CLASSNAME,
  LANDING_GRID_CARD_ROOT_CLASSNAME,
  LANDING_GRID_CARD_SHELL_GHOST_CLASSNAME,
  LANDING_GRID_CARD_TRIGGER_BASE_CLASSNAME
} from '@/features/landing/grid/landing-grid-card-classnames';
import {DesktopExpandedShell} from '@/features/landing/grid/landing-grid-card-desktop-shell';
import {
  MobileExpandedSurface,
  MobileTransientShell
} from '@/features/landing/grid/landing-grid-card-mobile-surfaces';
import {
  NormalCardFace,
  NormalCardGhostBody
} from '@/features/landing/grid/landing-grid-card-normal-face';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';
import {LANDING_CARD_BASE_GAP_PX} from '@/features/landing/grid/spacing-plan';
import {useCardExpandedScale} from '@/features/landing/grid/use-card-inline-geometry';
import {isUnavailablePresentation} from '@/features/variant-registry';
import styles from '@/features/landing/grid/landing-grid-card.module.css';

const SPACING_PRECISION_SCALE = 10000;

export type {
  LandingCardVisualState,
  LandingCardInteractionMode,
  LandingCardViewportTier,
  LandingCardMobilePhase,
  LandingCardMobileTransientMode,
  LandingMobileSnapshotView,
  LandingCardSpacingContract,
  LandingCardCopy,
  LandingGridCardProps
} from '@/features/landing/grid/landing-card-contract';
export {getDefaultCardCopy} from '@/features/landing/grid/landing-card-contract';
export {createThumbnailFallbackDataUri} from '@/features/landing/grid/landing-grid-card-normal-face';

function roundSpacing(value: number): number {
  return Math.round(value * SPACING_PRECISION_SCALE) / SPACING_PRECISION_SCALE;
}

function resolveSpacingContract(spacing: LandingCardSpacingContract | undefined): LandingCardSpacingContract {
  if (!spacing) {
    return {
      baseGapPx: LANDING_CARD_BASE_GAP_PX,
      compGapPx: 0,
      needsComp: false,
      naturalHeightPx: 0,
      rowMaxNaturalHeightPx: 0
    };
  }

  const baseGapPx = Number.isFinite(spacing.baseGapPx)
    ? Math.max(1, roundSpacing(spacing.baseGapPx))
    : LANDING_CARD_BASE_GAP_PX;
  const compGapPx = Number.isFinite(spacing.compGapPx)
    ? Math.max(0, roundSpacing(spacing.compGapPx))
    : 0;
  const naturalHeightPx = Number.isFinite(spacing.naturalHeightPx)
    ? Math.max(0, roundSpacing(spacing.naturalHeightPx))
    : 0;
  const rowMaxNaturalHeightPx = Number.isFinite(spacing.rowMaxNaturalHeightPx)
    ? Math.max(0, roundSpacing(spacing.rowMaxNaturalHeightPx))
    : 0;

  return {
    baseGapPx,
    compGapPx,
    needsComp: spacing.needsComp === true && compGapPx > 0,
    naturalHeightPx,
    rowMaxNaturalHeightPx
  };
}

// prop → 파생 플래그 → root 속성 → 자식 선택. 이 파일이 하는 일은 그 하나다.
// 얼굴·확장 본문·데스크톱 셸·모바일 표면은 각자의 파일이 그리고, 클래스 문자열과 공개 타입도
// 각자의 파일이 갖는다. root `<div>` 의 `data-*` 28 개는 QA 가 읽는 계약 표면이므로
// 여기 모여 있는 것이 옳다 — 그것이 이 오케스트레이터의 산출물이다.

export function LandingGridCard({
  card,
  hasAssetMedia = false,
  locale,
  state = 'normal',
  interactionMode = 'tap',
  viewportTier = 'desktop',
  mobilePhase = 'NORMAL',
  mobileTransientMode = 'NONE',
  mobileRestoreReady = false,
  desktopMotionRole = 'idle',
  desktopShellPhase = 'idle',
  reducedMotion = false,
  mobileSnapshot = null,
  desktopTransformOriginX = '50%',
  spacing,
  expandedRestingFloorPx,
  copy,
  sequence,
  tabIndex = 0,
  ariaDisabled = false,
  interactionBlocked = false,
  keyboardModeBlocked = false,
  hoverLockEnabled = false,
  keyboardMode = false,
  onCardKeyDown,
  onCardBlur,
  onFocus,
  onKeyDown,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onExpandedBodyKeyDown,
  onAnswerChoiceSelect,
  onMobileClose
}: LandingGridCardProps) {
  const cardA11yId = useId();
  const isUnavailable = isUnavailablePresentation(card);
  const isBlogCard = card.type === 'blog';
  const isTestCard = card.type === 'test';
  const resolvedState: LandingCardVisualState = (isUnavailable || isBlogCard) && state === 'expanded' ? 'normal' : state;
  const isMobileViewport = viewportTier === 'mobile';
  const isMobileOpening = isMobileViewport && isTestCard && mobileTransientMode === 'OPENING' && !isUnavailable;
  const isMobileClosing = isMobileViewport && isTestCard && mobileTransientMode === 'CLOSING' && !isUnavailable;
  const isMobileExpanded = isMobileViewport && isTestCard && mobilePhase === 'OPEN' && !isUnavailable;
  const desktopStagePhase = !isMobileViewport && isTestCard && !isUnavailable ? desktopShellPhase : 'idle';
  const showDesktopExpandedShell =
    !isMobileViewport && isTestCard && !isUnavailable && shouldRenderDesktopStageShell(desktopStagePhase);
  const isExpanded = showDesktopExpandedShell || isMobileExpanded;
  const isDesktopExpanded = showDesktopExpandedShell;
  const showMobileExpandedBody = isMobileExpanded;
  const showMobileTransientShell = isMobileOpening || isMobileClosing;
  const resolvedSpacing = resolveSpacingContract(spacing);
  const cardRootRef = useRef<HTMLDivElement | null>(null);
  const normalTitleRef = useRef<HTMLHeadingElement | null>(null);
  const normalSubtitleRef = useRef<HTMLParagraphElement | null>(null);
  const desktopTitleSplit = useLandingCardTitleSplit({
    enabled: !isMobileViewport,
    freeze: !isMobileViewport && desktopStagePhase !== 'idle',
    text: card.title,
    titleRef: normalTitleRef
  });
  const transformOriginClassName = resolveTransformOriginClassName(desktopTransformOriginX);
  const expandedScale = useCardExpandedScale({
    rootRef: cardRootRef,
    viewportTier,
    transformOriginX: desktopTransformOriginX,
    reducedMotion
  });
  const resolvedShellScale = reducedMotion ? 1 : 1.04;
  const resolvedShellInlineScale = expandedScale.frameInlineScale;
  const resolvedMotionDurationMs = reducedMotion ? 180 : 280;
  const resolvedExpandedFloorPx =
    showDesktopExpandedShell &&
    typeof expandedRestingFloorPx === 'number' &&
    Number.isFinite(expandedRestingFloorPx) &&
    expandedRestingFloorPx > 0 &&
    resolvedShellScale > 0
      ? expandedRestingFloorPx / resolvedShellScale
      : undefined;
  const isDesktopOverlayLayer = showDesktopExpandedShell;
  const isDesktopMotionEnter = desktopMotionRole === 'opening' || desktopMotionRole === 'handoff-target';
  const isDesktopMotionExit = desktopMotionRole === 'closing';
  const isDesktopMotionSteady = desktopMotionRole === 'steady';
  const hasDesktopStageGeometry = showDesktopExpandedShell;
  const isDesktopCleanupPending = desktopStagePhase === 'cleanup-pending';
  const isDesktopLogicallyExpanded = isDesktopShellLogicallyInteractive(desktopStagePhase);
  const titleId = `${cardA11yId}-title`;
  const statusId = `${cardA11yId}-status`;
  const isMobileClosingPhase = isMobileViewport && mobilePhase === 'CLOSING';
  const resolvedRootVisualClassName = showDesktopExpandedShell
    ? '[background:transparent] [box-shadow:none]'
    : isMobileExpanded
      ? '[background:var(--expanded-card-surface)] [box-shadow:none]'
      : isMobileOpening || isMobileClosing
        ? '[background:color-mix(in_srgb,var(--canvas-elevated)_90%,transparent)] [box-shadow:none]'
        : '[background:var(--normal-card-surface)] [box-shadow:var(--normal-card-shadow)] [border:1px_solid_var(--normal-card-border)]';
  const resolvedRootClassName = joinClassNames(
    LANDING_GRID_CARD_ROOT_CLASSNAME,
    styles.root,
    isBlogCard && styles.blogCard,
    isUnavailable && styles.unavailableCard,
    isDesktopOverlayLayer && styles.desktopOverlayLayer,
    isDesktopMotionEnter && styles.desktopMotionEnter,
    isDesktopMotionExit && styles.desktopMotionExit,
    isDesktopMotionSteady && styles.desktopMotionSteady,
    isMobileOpening && styles.mobileTransientOpening,
    isMobileClosing && styles.mobileTransientClosing,
    isMobileClosingPhase && styles.mobilePhaseClosing,
    transformOriginClassName,
    reducedMotion && styles.reducedMotion,
    resolvedRootVisualClassName,
    (resolvedState === 'expanded' || isMobileOpening || isMobileClosing) && 'z-20',
    isMobileExpanded && 'rounded-none w-screen min-h-0 mx-[calc(50%-50vw)]'
  );
  const resolvedDesktopStageClassName = joinClassNames(
    LANDING_GRID_CARD_DESKTOP_STAGE_CLASSNAME,
    styles.desktopStage,
    hasDesktopStageGeometry && styles.desktopStageActive,
    isDesktopCleanupPending && styles.desktopStageCleanupPending
  );
  const resolvedTransientShellClassName = joinClassNames(
    LANDING_GRID_CARD_MOBILE_TRANSIENT_SHELL_CLASSNAME,
    styles.transientShell,
    isMobileOpening && styles.transientOpening,
    isMobileClosing && styles.transientClosing
  );
  const resolvedTriggerClassName = joinClassNames(
    LANDING_GRID_CARD_TRIGGER_BASE_CLASSNAME,
    isMobileExpanded ? '[min-height:0] [padding:0]' : '[min-height:100%] [padding:16px]',
    showDesktopExpandedShell && 'pointer-events-none',
    isMobileExpanded && 'bg-transparent cursor-default'
  );
  const resolvedContentClassName = joinClassNames(
    LANDING_GRID_CARD_CONTENT_CLASSNAME,
    isMobileExpanded ? '[height:0] [min-height:0] overflow-hidden' : 'h-full min-h-full'
  );
  const triggerContent = (
    <div className={resolvedContentClassName}>
      {isMobileExpanded ? null : (
        <NormalCardFace
          card={card}
          hasAssetMedia={hasAssetMedia}
          interactionMode={interactionMode}
          isMobileViewport={isMobileViewport}
          presentation={isDesktopExpanded ? 'expandedTitleOnly' : 'collapsed'}
          exposePublicSlots
          readMoreLabel={isBlogCard ? copy.readMore : undefined}
          comingSoonLabel={isUnavailable ? copy.comingSoon : undefined}
          titleId={titleId}
          statusId={statusId}
          titleRef={normalTitleRef}
          subtitleRef={normalSubtitleRef}
        />
      )}

      {isDesktopExpanded ? (
        <div className={LANDING_GRID_CARD_SHELL_GHOST_CLASSNAME} aria-hidden="true">
          <NormalCardGhostBody
            card={card}
            hasAssetMedia={hasAssetMedia}
            subtitleRef={normalSubtitleRef}
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      ref={cardRootRef}
      className={resolvedRootClassName}
      data-testid="landing-grid-card"
      data-card-variant={card.variant}
      data-card-seq={typeof sequence === 'number' ? sequence : undefined}
      data-card-attribute={card.attribute}
      data-card-content-type={card.type}
      data-card-availability={card.availability}
      data-card-state={resolvedState}
      data-interaction-mode={interactionMode}
      data-hover-lock={hoverLockEnabled ? 'true' : 'false'}
      data-keyboard-mode={keyboardMode ? 'true' : 'false'}
      data-hover-lock-blocked={interactionBlocked || keyboardModeBlocked ? 'true' : 'false'}
      data-base-gap={resolvedSpacing.baseGapPx}
      data-comp-gap={resolvedSpacing.compGapPx}
      data-needs-comp={resolvedSpacing.needsComp ? 'true' : 'false'}
      data-natural-height={resolvedSpacing.naturalHeightPx}
      data-row-natural-max={resolvedSpacing.rowMaxNaturalHeightPx}
      data-expanded-desired-scale={expandedScale.desiredFinalScale}
      data-expanded-max-scale={expandedScale.maxSurfaceScale}
      data-expanded-resolved-scale={expandedScale.resolvedFinalScale}
      data-expanded-frame-scale={expandedScale.frameInlineScale}
      data-expanded-resting-floor={expandedRestingFloorPx}
      data-card-viewport-tier={viewportTier}
      data-mobile-phase={isMobileViewport ? mobilePhase : undefined}
      data-mobile-transient-mode={isMobileViewport ? mobileTransientMode : undefined}
      data-desktop-motion-role={!isMobileViewport ? desktopMotionRole : undefined}
      data-desktop-shell-phase={!isMobileViewport ? desktopStagePhase : undefined}
      data-mobile-snapshot-height={mobileSnapshot ? mobileSnapshot.cardHeightPx : undefined}
      data-mobile-snapshot-anchor-top={mobileSnapshot ? mobileSnapshot.anchorTopPx : undefined}
      data-mobile-snapshot-left={mobileSnapshot ? mobileSnapshot.cardLeftPx : undefined}
      data-mobile-snapshot-width={mobileSnapshot ? mobileSnapshot.cardWidthPx : undefined}
      data-mobile-snapshot-title-top={mobileSnapshot ? mobileSnapshot.titleTopPx : undefined}
      data-mobile-restore-ready={
        isMobileViewport && mobilePhase !== 'NORMAL' ? (mobileRestoreReady ? 'true' : 'false') : undefined
      }
      data-expanded-layer={
        showDesktopExpandedShell
          ? 'desktop-overlay'
          : isMobileOpening
            ? 'mobile-opening-shell'
            : isMobileExpanded
              ? 'mobile-in-flow'
              : isMobileClosing
                ? 'mobile-closing-shell'
                : 'none'
      }
      inert={keyboardModeBlocked}
      onKeyDown={onCardKeyDown}
      onBlur={onCardBlur}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={
        {
          '--landing-card-base-gap': `${resolvedSpacing.baseGapPx}px`,
          '--landing-card-comp-gap': `${resolvedSpacing.compGapPx}px`,
          '--landing-card-shell-scale': resolvedShellScale,
          '--landing-card-shell-inline-scale': resolvedShellInlineScale,
          '--landing-card-motion-ms': `${resolvedMotionDurationMs}ms`,
          '--landing-card-origin-x': desktopTransformOriginX,
          '--landing-mobile-anchor-top': mobileSnapshot ? `${mobileSnapshot.anchorTopPx}px` : undefined,
          '--landing-mobile-card-left': mobileSnapshot ? `${mobileSnapshot.cardLeftPx}px` : undefined,
          '--landing-mobile-card-width': mobileSnapshot ? `${mobileSnapshot.cardWidthPx}px` : undefined,
          '--landing-mobile-card-height': mobileSnapshot ? `${mobileSnapshot.cardHeightPx}px` : undefined,
          pointerEvents: interactionBlocked ? 'none' : 'auto'
        } as CSSProperties
      }
    >
      {isBlogCard ? (
        <Link
          className={resolvedTriggerClassName}
          href={buildLocalizedPath(RouteBuilder.blogArticle(card.variant), locale)}
          data-testid="landing-grid-card-trigger"
          data-slot="primaryTrigger"
          data-trigger-state={isExpanded ? 'expanded' : 'collapsed'}
          tabIndex={tabIndex}
          aria-disabled={ariaDisabled ? 'true' : undefined}
          aria-label={card.title}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          onClick={onClick}
        >
          {triggerContent}
        </Link>
      ) : (
        <button
          type="button"
          className={resolvedTriggerClassName}
          data-testid="landing-grid-card-trigger"
          data-slot="primaryTrigger"
          data-trigger-state={isExpanded ? 'expanded' : 'collapsed'}
          tabIndex={tabIndex}
          aria-disabled={ariaDisabled ? 'true' : undefined}
          aria-label={!isUnavailable ? card.title : undefined}
          aria-labelledby={isUnavailable ? titleId : undefined}
          aria-describedby={isUnavailable ? statusId : undefined}
          aria-expanded={
            !isMobileViewport && !isUnavailable ? isDesktopLogicallyExpanded : undefined
          }
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          onClick={onClick}
        >
          {triggerContent}
        </button>
      )}

      {!isMobileViewport && !isUnavailable && isTestCard ? (
        <DesktopExpandedShell
          stageClassName={resolvedDesktopStageClassName}
          phase={desktopStagePhase}
          isVisible={showDesktopExpandedShell}
          isInteractive={isDesktopShellLogicallyInteractive(desktopStagePhase)}
          card={card}
          locale={locale}
          copy={copy}
          floorPx={resolvedExpandedFloorPx}
          titleSplit={desktopTitleSplit}
          onExpandedBodyKeyDown={onExpandedBodyKeyDown}
          onAnswerChoiceSelect={onAnswerChoiceSelect}
        />
      ) : null}

      {showMobileExpandedBody && isTestCard ? (
        <MobileExpandedSurface
          card={card}
          locale={locale}
          copy={copy}
          closeDisabled={mobileTransientMode === 'CLOSING'}
          onClose={onMobileClose}
          onExpandedBodyKeyDown={onExpandedBodyKeyDown}
          onAnswerChoiceSelect={onAnswerChoiceSelect}
        />
      ) : null}

      {showMobileTransientShell && isTestCard ? (
        <MobileTransientShell
          card={card}
          locale={locale}
          copy={copy}
          shellClassName={resolvedTransientShellClassName}
          transientMode={mobileTransientMode}
          onAnswerChoiceSelect={onAnswerChoiceSelect}
        />
      ) : null}
    </div>
  );
}
