'use client';

import Link from 'next/link';
import Image from 'next/image';
import type {
  CSSProperties,
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEvent,
  MouseEventHandler,
  PointerEventHandler,
  WheelEventHandler
} from 'react';
import {useRef} from 'react';

import type {AppLocale} from '@/config/site';
import {isUnavailablePresentation, type LandingCard} from '@/features/landing/data';
import {useLandingCardTitleSplit} from '@/features/landing/grid/landing-card-title-continuity';
import {
  type LandingCardDesktopMotionRole,
  type LandingCardDesktopShellPhase,
  shouldRenderDesktopStageShell
} from '@/features/landing/grid/desktop-shell-phase';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';
import {LANDING_CARD_BASE_GAP_PX} from '@/features/landing/grid/spacing-plan';

const metaValueFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0
});
const thumbnailDataUriCache = new Map<string, string>();
const SPACING_PRECISION_SCALE = 10000;

export type LandingCardVisualState = 'normal' | 'expanded' | 'focused';
export type LandingCardInteractionMode = 'hover' | 'tap';
export type LandingCardViewportTier = 'mobile' | 'tablet' | 'desktop';
export type LandingCardMobilePhase = 'NORMAL' | 'OPENING' | 'OPEN' | 'CLOSING';
export type LandingCardMobileTransientMode = 'NONE' | 'OPENING' | 'CLOSING';

export interface LandingMobileSnapshotView {
  cardHeightPx: number;
  anchorTopPx: number;
  cardLeftPx: number;
  cardWidthPx: number;
  titleTopPx: number;
  snapshotWriteCount: number;
  restoreReady: boolean;
}

export interface LandingCardSpacingContract {
  baseGapPx: number;
  compGapPx: number;
  needsComp: boolean;
  naturalHeightPx: number;
  rowMaxNaturalHeightPx: number;
}

export interface LandingCardCopy {
  comingSoon: string;
  close: string;
  closeExpandedAria: string;
  metaEstimated: string;
  metaShares: string;
  metaAttempts: string;
  metaReadTime: string;
  metaViews: string;
  readMore: string;
}

interface LandingGridCardProps {
  card: LandingCard;
  locale: AppLocale;
  state?: LandingCardVisualState;
  interactionMode?: LandingCardInteractionMode;
  viewportTier?: LandingCardViewportTier;
  mobilePhase?: LandingCardMobilePhase;
  mobileTransientMode?: LandingCardMobileTransientMode;
  mobileRestoreReady?: boolean;
  desktopMotionRole?: LandingCardDesktopMotionRole;
  desktopShellPhase?: LandingCardDesktopShellPhase;
  mobileSnapshot?: LandingMobileSnapshotView | null;
  desktopTransformOriginX?: '0%' | '50%' | '100%';
  spacing?: LandingCardSpacingContract;
  copy: LandingCardCopy;
  sequence?: number;
  tabIndex?: number;
  ariaDisabled?: boolean;
  interactionBlocked?: boolean;
  hoverLockEnabled?: boolean;
  keyboardMode?: boolean;
  onFocus?: FocusEventHandler<HTMLElement>;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
  onClick?: MouseEventHandler<HTMLElement>;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  onExpandedBodyKeyDown?: KeyboardEventHandler<HTMLElement>;
  onPointerMove?: PointerEventHandler<HTMLElement>;
  onMouseDown?: MouseEventHandler<HTMLElement>;
  onWheel?: WheelEventHandler<HTMLElement>;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
  onPrimaryCtaClick?: MouseEventHandler<HTMLAnchorElement>;
  onMobileClose?: MouseEventHandler<HTMLButtonElement>;
}

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

function formatMetaValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return metaValueFormatter.format(Math.max(0, Math.trunc(value)));
}

function createThumbnailDataUri(token: string): string {
  const safeToken = token.replace(/[^a-z0-9-]/gi, '').slice(0, 12).toUpperCase() || 'CARD';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 100" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3B6EF5"/><stop offset="100%" stop-color="#17A789"/></linearGradient></defs><rect width="600" height="100" fill="url(#g)"/><text x="24" y="62" font-size="36" font-family="Avenir Next, Noto Sans KR, Segoe UI, sans-serif" fill="rgba(255,255,255,0.85)">${safeToken}</text></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function resolveThumbnailDataUri(token: string): string {
  const cacheKey = token.trim();
  const cached = thumbnailDataUriCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const dataUri = createThumbnailDataUri(cacheKey);
  thumbnailDataUriCache.set(cacheKey, dataUri);
  return dataUri;
}

function resolveTransformOriginClassName(originX: '0%' | '50%' | '100%'): string {
  switch (originX) {
    case '0%':
      return 'landing-grid-card-origin-start';
    case '100%':
      return 'landing-grid-card-origin-end';
    case '50%':
    default:
      return 'landing-grid-card-origin-center';
  }
}

interface NormalContentSlotsProps {
  card: LandingCard;
  includeSlotAttributes: boolean;
}

function NormalContentSlots({card, includeSlotAttributes}: NormalContentSlotsProps) {
  return (
    <>
      <div
        className="landing-grid-card-thumbnail-slot"
        data-slot={includeSlotAttributes ? 'thumbnailOrIcon' : undefined}
        aria-hidden="true"
      >
        <Image
          className="landing-grid-card-thumbnail"
          src={resolveThumbnailDataUri(card.thumbnailOrIcon)}
          alt=""
          fill
          sizes="100vw"
          unoptimized
        />
      </div>

      <p
        className="landing-grid-card-subtitle"
        data-slot={includeSlotAttributes ? 'cardSubtitle' : undefined}
      >
        {card.subtitle}
      </p>

      <div className="landing-grid-card-tags-gap" aria-hidden="true" />

      <ul
        className="landing-grid-card-tags"
        data-slot={includeSlotAttributes ? 'tags' : undefined}
        data-tag-count={card.tags.length}
        aria-label="Card tags"
      >
        {card.tags.map((tag) => (
          <li key={`${card.id}-${tag}`} className="landing-grid-card-tag-item">
            <span className="landing-grid-card-tag-chip">{tag}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

interface ExpandedCardBodyContentProps {
  card: LandingCard;
  locale: AppLocale;
  copy: LandingCardCopy;
  interactive: boolean;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
  onPrimaryCtaClick?: MouseEventHandler<HTMLAnchorElement>;
}

function ExpandedCardBodyContent({
  card,
  locale,
  copy,
  interactive,
  onAnswerChoiceSelect,
  onPrimaryCtaClick
}: ExpandedCardBodyContentProps) {
  const bodyProps = interactive ? {} : {'data-slot': 'mobileTransientExpandedBody'};

  if (card.type === 'test') {
    return (
      <div className="landing-grid-card-mobile-body" {...bodyProps}>
        <p
          className="landing-grid-card-preview-question"
          data-slot={interactive ? 'previewQuestion' : undefined}
          data-motion-slot="preview"
        >
          {card.test.previewQuestion}
        </p>

        <div
          className="landing-grid-card-answer-grid"
          data-slot={interactive ? 'answerChoices' : undefined}
          data-motion-slot="answerChoices"
        >
          <button
            type="button"
            className="landing-grid-card-answer-choice"
            data-slot={interactive ? 'answerChoiceA' : undefined}
            onClick={(event) => {
              if (interactive) {
                onAnswerChoiceSelect?.('A', event);
              }
            }}
            tabIndex={interactive ? undefined : -1}
            aria-hidden={interactive ? undefined : 'true'}
          >
            {card.test.answerChoiceA}
          </button>
          <button
            type="button"
            className="landing-grid-card-answer-choice"
            data-slot={interactive ? 'answerChoiceB' : undefined}
            onClick={(event) => {
              if (interactive) {
                onAnswerChoiceSelect?.('B', event);
              }
            }}
            tabIndex={interactive ? undefined : -1}
            aria-hidden={interactive ? undefined : 'true'}
          >
            {card.test.answerChoiceB}
          </button>
        </div>

        <dl
          className="landing-grid-card-meta-grid"
          data-slot={interactive ? 'meta' : undefined}
          data-motion-slot="meta"
        >
          <div className="landing-grid-card-meta-item">
            <dt className="landing-grid-card-meta-label">{copy.metaEstimated}</dt>
            <dd className="landing-grid-card-meta-value">{formatMetaValue(card.test.meta.estimatedMinutes)}</dd>
          </div>
          <div className="landing-grid-card-meta-item">
            <dt className="landing-grid-card-meta-label">{copy.metaShares}</dt>
            <dd className="landing-grid-card-meta-value">{formatMetaValue(card.test.meta.shares)}</dd>
          </div>
          <div className="landing-grid-card-meta-item">
            <dt className="landing-grid-card-meta-label">{copy.metaAttempts}</dt>
            <dd className="landing-grid-card-meta-value">{formatMetaValue(card.test.meta.attempts)}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="landing-grid-card-mobile-body" {...bodyProps}>
      <p
        className="landing-grid-card-summary"
        data-slot={interactive ? 'summary' : undefined}
        data-motion-slot="summary"
      >
        {card.blog.summary}
      </p>

      <dl
        className="landing-grid-card-meta-grid"
        data-slot={interactive ? 'meta' : undefined}
        data-motion-slot="meta"
      >
        <div className="landing-grid-card-meta-item">
          <dt className="landing-grid-card-meta-label">{copy.metaReadTime}</dt>
          <dd className="landing-grid-card-meta-value">{formatMetaValue(card.blog.meta.readMinutes)}</dd>
        </div>
        <div className="landing-grid-card-meta-item">
          <dt className="landing-grid-card-meta-label">{copy.metaShares}</dt>
          <dd className="landing-grid-card-meta-value">{formatMetaValue(card.blog.meta.shares)}</dd>
        </div>
        <div className="landing-grid-card-meta-item">
          <dt className="landing-grid-card-meta-label">{copy.metaViews}</dt>
          <dd className="landing-grid-card-meta-value">{formatMetaValue(card.blog.meta.views)}</dd>
        </div>
      </dl>

      {interactive ? (
        <Link
          className="landing-grid-card-primary-cta"
          href={buildLocalizedPath(RouteBuilder.blog(), locale)}
          data-slot="primaryCTA"
          data-motion-slot="primaryCTA"
          onClick={onPrimaryCtaClick}
        >
          {copy.readMore}
        </Link>
      ) : (
        <span className="landing-grid-card-primary-cta" aria-hidden="true" data-motion-slot="primaryCTA">
          {copy.readMore}
        </span>
      )}
    </div>
  );
}

interface DesktopExpandedTitleProps {
  line1Text: string;
  overflowText: string;
}

function DesktopExpandedTitle({line1Text, overflowText}: DesktopExpandedTitleProps) {
  return (
    <>
      <span className="landing-grid-card-expanded-title-line1" data-title-layer="line1">
        {line1Text}
      </span>
      <span className="landing-grid-card-expanded-title-overflow" data-title-layer="overflow">
        {overflowText}
      </span>
    </>
  );
}

export function LandingGridCard({
  card,
  locale,
  state = 'normal',
  interactionMode = 'tap',
  viewportTier = 'desktop',
  mobilePhase = 'NORMAL',
  mobileTransientMode = 'NONE',
  mobileRestoreReady = false,
  desktopMotionRole = 'idle',
  desktopShellPhase = 'idle',
  mobileSnapshot = null,
  desktopTransformOriginX = '50%',
  spacing,
  copy,
  sequence,
  tabIndex = 0,
  ariaDisabled = false,
  interactionBlocked = false,
  hoverLockEnabled = false,
  keyboardMode = false,
  onFocus,
  onKeyDown,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onExpandedBodyKeyDown,
  onPointerMove,
  onMouseDown,
  onWheel,
  onAnswerChoiceSelect,
  onPrimaryCtaClick,
  onMobileClose
}: LandingGridCardProps) {
  const isUnavailable = isUnavailablePresentation(card);
  const resolvedState: LandingCardVisualState = isUnavailable && state === 'expanded' ? 'normal' : state;
  const isMobileViewport = viewportTier === 'mobile';
  const isMobileOpening = isMobileViewport && mobileTransientMode === 'OPENING' && !isUnavailable;
  const isMobileClosing = isMobileViewport && mobileTransientMode === 'CLOSING' && !isUnavailable;
  const isMobileExpanded = isMobileViewport && mobilePhase === 'OPEN' && !isUnavailable;
  const desktopStagePhase = !isMobileViewport && !isUnavailable ? desktopShellPhase : 'idle';
  const showDesktopExpandedShell =
    !isMobileViewport && !isUnavailable && shouldRenderDesktopStageShell(desktopStagePhase);
  const isExpanded = showDesktopExpandedShell || isMobileExpanded;
  const isDesktopExpanded = showDesktopExpandedShell;
  const showMobileExpandedBody = isMobileExpanded;
  const showMobileTransientShell = isMobileOpening || isMobileClosing;
  const resolvedSpacing = resolveSpacingContract(spacing);
  const normalTitleRef = useRef<HTMLHeadingElement | null>(null);
  const desktopTitleSplit = useLandingCardTitleSplit({
    enabled: !isMobileViewport,
    freeze: !isMobileViewport && desktopStagePhase !== 'idle',
    text: card.title,
    titleRef: normalTitleRef
  });
  const transformOriginClassName = resolveTransformOriginClassName(desktopTransformOriginX);

  const handlePrimaryCtaClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (onPrimaryCtaClick) {
      onPrimaryCtaClick(event);
    }
  };

  return (
    <div
      className={`landing-grid-card ${transformOriginClassName}`}
      data-testid="landing-grid-card"
      data-card-id={card.id}
      data-card-seq={typeof sequence === 'number' ? sequence : undefined}
      data-card-type={card.cardType}
      data-card-content-type={card.type}
      data-card-availability={card.availability}
      data-card-state={resolvedState}
      data-interaction-mode={interactionMode}
      data-hover-lock={hoverLockEnabled ? 'true' : 'false'}
      data-keyboard-mode={keyboardMode ? 'true' : 'false'}
      data-hover-lock-blocked={interactionBlocked ? 'true' : 'false'}
      data-base-gap={resolvedSpacing.baseGapPx}
      data-comp-gap={resolvedSpacing.compGapPx}
      data-needs-comp={resolvedSpacing.needsComp ? 'true' : 'false'}
      data-natural-height={resolvedSpacing.naturalHeightPx}
      data-row-natural-max={resolvedSpacing.rowMaxNaturalHeightPx}
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
      data-mobile-snapshot-writes={mobileSnapshot ? mobileSnapshot.snapshotWriteCount : undefined}
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
      aria-disabled={ariaDisabled ? 'true' : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerMove={onPointerMove}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
      style={
        {
          '--landing-card-base-gap': `${resolvedSpacing.baseGapPx}px`,
          '--landing-card-comp-gap': `${resolvedSpacing.compGapPx}px`,
          '--landing-card-origin-x': desktopTransformOriginX,
          '--landing-mobile-anchor-top': mobileSnapshot ? `${mobileSnapshot.anchorTopPx}px` : undefined,
          '--landing-mobile-card-left': mobileSnapshot ? `${mobileSnapshot.cardLeftPx}px` : undefined,
          '--landing-mobile-card-width': mobileSnapshot ? `${mobileSnapshot.cardWidthPx}px` : undefined,
          '--landing-mobile-card-height': mobileSnapshot ? `${mobileSnapshot.cardHeightPx}px` : undefined,
          pointerEvents: interactionBlocked ? 'none' : 'auto'
        } as CSSProperties
      }
    >
      <button
        type="button"
        className="landing-grid-card-trigger"
        data-testid="landing-grid-card-trigger"
        data-slot="primaryTrigger"
        data-trigger-state={isExpanded ? 'expanded' : 'collapsed'}
        tabIndex={tabIndex}
        aria-disabled={ariaDisabled ? 'true' : undefined}
        aria-label={isMobileExpanded ? card.title : undefined}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onClick={onClick}
      >
        <div className="landing-grid-card-content">
          {isMobileExpanded ? null : (
            <h2 ref={normalTitleRef} className="landing-grid-card-title landing-grid-card-title-normal" data-slot="cardTitle">
              {card.title}
            </h2>
          )}

          {isExpanded ? null : (
            <NormalContentSlots card={card} includeSlotAttributes />
          )}

          {isDesktopExpanded ? (
            <div className="landing-grid-card-shell-ghost" aria-hidden="true">
              <NormalContentSlots card={card} includeSlotAttributes={false} />
            </div>
          ) : null}
        </div>
      </button>

      {!isMobileViewport && !isUnavailable ? (
        <div
          className="landing-grid-card-desktop-stage"
          data-testid="landing-grid-card-desktop-stage"
          data-slot="desktopStage"
          data-phase={desktopStagePhase}
          aria-hidden={showDesktopExpandedShell ? undefined : 'true'}
        >
          {showDesktopExpandedShell ? (
            <div className="landing-grid-card-expanded-layer" data-slot="expandedLayer">
              <div className="landing-grid-card-expanded-shell-frame">
                <div className="landing-grid-card-expanded-shell" data-slot="expandedShell">
                  <div
                    className="landing-grid-card-expanded-shadow"
                    data-slot="expandedShadowPlate"
                    aria-hidden="true"
                  />
                  <div className="landing-grid-card-expanded-surface" data-slot="expandedSurface">
                    <div className="landing-grid-card-expanded" data-slot="expandedBody" onKeyDown={onExpandedBodyKeyDown}>
                      <h2 className="landing-grid-card-title landing-grid-card-expanded-title" data-slot="cardTitleExpanded">
                        <DesktopExpandedTitle
                          line1Text={desktopTitleSplit.line1Text}
                          overflowText={desktopTitleSplit.overflowText}
                        />
                      </h2>
                      <ExpandedCardBodyContent
                        card={card}
                        locale={locale}
                        copy={copy}
                        interactive={desktopStagePhase !== 'cleanup-pending'}
                        onAnswerChoiceSelect={onAnswerChoiceSelect}
                        onPrimaryCtaClick={handlePrimaryCtaClick}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {showMobileExpandedBody ? (
        <div className="landing-grid-card-mobile-expanded" data-slot="expandedBody" onKeyDown={onExpandedBodyKeyDown}>
          <div className="landing-grid-card-mobile-header" data-slot="mobileHeader">
            <h2 className="landing-grid-card-title landing-grid-card-mobile-title" data-slot="cardTitle">
              {card.title}
            </h2>
            <button
              type="button"
              className="landing-grid-card-mobile-close"
              aria-label={copy.closeExpandedAria}
              data-slot="mobileClose"
              onClick={onMobileClose}
              disabled={mobileTransientMode === 'CLOSING'}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <ExpandedCardBodyContent
            card={card}
            locale={locale}
            copy={copy}
            interactive
            onAnswerChoiceSelect={onAnswerChoiceSelect}
            onPrimaryCtaClick={handlePrimaryCtaClick}
          />
        </div>
      ) : null}

      {showMobileTransientShell ? (
        <div
          className="landing-grid-card-mobile-transient-shell"
          data-slot="mobileTransientShell"
          data-state={mobileTransientMode}
          aria-hidden="true"
        >
          <div className="landing-grid-card-mobile-transient-panel" data-slot="mobileTransientPanel" />
          <div className="landing-grid-card-mobile-transient-surface">
            <div className="landing-grid-card-mobile-header landing-grid-card-mobile-transient-header">
              <h2 className="landing-grid-card-title landing-grid-card-mobile-title" data-slot="cardTitleTransient">
                {card.title}
              </h2>
              <span
                className="landing-grid-card-mobile-close landing-grid-card-mobile-close-ghost"
                data-slot="mobileCloseGhost"
              >
                <span aria-hidden="true">×</span>
              </span>
            </div>
            <ExpandedCardBodyContent
              card={card}
              locale={locale}
              copy={copy}
              interactive={false}
              onAnswerChoiceSelect={onAnswerChoiceSelect}
              onPrimaryCtaClick={handlePrimaryCtaClick}
            />
          </div>
        </div>
      ) : null}

      {isUnavailable ? (
        <div className="landing-grid-card-unavailable-overlay" data-slot="unavailableOverlay" aria-hidden="true">
          <span className="landing-grid-card-unavailable-badge">{copy.comingSoon}</span>
        </div>
      ) : null}
    </div>
  );
}

export function getDefaultCardCopy(): LandingCardCopy {
  return {
    comingSoon: 'Coming soon',
    close: 'Close',
    closeExpandedAria: 'Close expanded card',
    metaEstimated: 'Est. time',
    metaShares: 'Shares',
    metaAttempts: 'Total attempts',
    metaReadTime: 'Read time',
    metaViews: 'Views',
    readMore: 'Read more'
  };
}
