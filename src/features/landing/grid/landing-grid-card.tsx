import Link from 'next/link';
import Image from 'next/image';
import type {
  CSSProperties,
  FocusEventHandler,
  MouseEvent,
  KeyboardEventHandler,
  MouseEventHandler,
  PointerEventHandler,
  WheelEventHandler
} from 'react';

import type {AppLocale} from '@/config/site';
import type {LandingCard} from '@/features/landing/data';
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
export type LandingCardDesktopMotionRole =
  | 'idle'
  | 'opening'
  | 'steady'
  | 'closing'
  | 'handoff-target'
  | 'handoff-source';

export interface LandingMobileSnapshotView {
  cardHeightPx: number;
  anchorTopPx: number;
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
  mobileRestoreReady?: boolean;
  desktopMotionRole?: LandingCardDesktopMotionRole;
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

export function LandingGridCard({
  card,
  locale,
  state = 'normal',
  interactionMode = 'tap',
  viewportTier = 'desktop',
  mobilePhase = 'NORMAL',
  mobileRestoreReady = false,
  desktopMotionRole = 'idle',
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
  onPointerMove,
  onMouseDown,
  onWheel,
  onAnswerChoiceSelect,
  onPrimaryCtaClick,
  onMobileClose
}: LandingGridCardProps) {
  const isUnavailable = card.availability === 'unavailable';
  const resolvedState: LandingCardVisualState = isUnavailable && state === 'expanded' ? 'normal' : state;
  const isExpanded = resolvedState === 'expanded';
  const isMobileViewport = viewportTier === 'mobile';
  const isDesktopExpanded = isExpanded && !isMobileViewport;
  const isMobileExpanded = isExpanded && isMobileViewport;
  const resolvedSpacing = resolveSpacingContract(spacing);

  const handlePrimaryCtaClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (onPrimaryCtaClick) {
      onPrimaryCtaClick(event);
    }
  };

  return (
    <div
      className="landing-grid-card"
      data-testid="landing-grid-card"
      data-card-id={card.id}
      data-card-seq={typeof sequence === 'number' ? sequence : undefined}
      data-card-type={card.type}
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
      data-desktop-motion-role={!isMobileViewport ? desktopMotionRole : undefined}
      data-mobile-snapshot-height={mobileSnapshot ? mobileSnapshot.cardHeightPx : undefined}
      data-mobile-snapshot-anchor-top={mobileSnapshot ? mobileSnapshot.anchorTopPx : undefined}
      data-mobile-snapshot-title-top={mobileSnapshot ? mobileSnapshot.titleTopPx : undefined}
      data-mobile-snapshot-writes={mobileSnapshot ? mobileSnapshot.snapshotWriteCount : undefined}
      data-mobile-restore-ready={
        isMobileViewport && mobilePhase !== 'NORMAL' ? (mobileRestoreReady ? 'true' : 'false') : undefined
      }
      data-expanded-layer={isDesktopExpanded ? 'desktop-overlay' : isMobileExpanded ? 'mobile-in-flow' : 'none'}
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
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onClick={onClick}
      >
        <div className="landing-grid-card-content">
          <h2 className="landing-grid-card-title" data-slot="cardTitle">
            {card.title}
          </h2>

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

      {isDesktopExpanded ? (
        <div className="landing-grid-card-expanded-layer" data-slot="expandedLayer">
          <div className="landing-grid-card-expanded" data-slot="expandedBody">
            <h2 className="landing-grid-card-title landing-grid-card-expanded-title" data-slot="cardTitleExpanded">
              {card.title}
            </h2>
            {card.type === 'test' ? (
              <>
                <p className="landing-grid-card-preview-question" data-slot="previewQuestion">
                  {card.test.previewQuestion}
                </p>

                <div className="landing-grid-card-answer-grid" data-slot="answerChoices">
                  <button
                    type="button"
                    className="landing-grid-card-answer-choice"
                    data-slot="answerChoiceA"
                    onClick={(event) => {
                      onAnswerChoiceSelect?.('A', event);
                    }}
                  >
                    {card.test.answerChoiceA}
                  </button>
                  <button
                    type="button"
                    className="landing-grid-card-answer-choice"
                    data-slot="answerChoiceB"
                    onClick={(event) => {
                      onAnswerChoiceSelect?.('B', event);
                    }}
                  >
                    {card.test.answerChoiceB}
                  </button>
                </div>

                <dl className="landing-grid-card-meta-grid" data-slot="meta">
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
              </>
            ) : (
              <>
                <p className="landing-grid-card-summary" data-slot="summary">
                  {card.blog.summary}
                </p>

                <dl className="landing-grid-card-meta-grid" data-slot="meta">
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

                <Link
                  className="landing-grid-card-primary-cta"
                  href={buildLocalizedPath(RouteBuilder.blog(), locale)}
                  data-slot="primaryCTA"
                  onClick={handlePrimaryCtaClick}
                >
                  {card.blog.primaryCTA || copy.readMore}
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}

      {isMobileExpanded ? (
        <>
          <button
            type="button"
            className="landing-grid-card-mobile-close"
            aria-label={copy.closeExpandedAria}
            data-slot="mobileClose"
            onClick={onMobileClose}
            disabled={mobilePhase === 'CLOSING'}
          >
            <span aria-hidden="true">×</span>
          </button>
          <div className="landing-grid-card-mobile-expanded" data-slot="expandedBody">
            {card.type === 'test' ? (
              <>
                <p className="landing-grid-card-preview-question" data-slot="previewQuestion">
                  {card.test.previewQuestion}
                </p>

                <div className="landing-grid-card-answer-grid" data-slot="answerChoices">
                  <button
                    type="button"
                    className="landing-grid-card-answer-choice"
                    data-slot="answerChoiceA"
                    onClick={(event) => {
                      onAnswerChoiceSelect?.('A', event);
                    }}
                  >
                    {card.test.answerChoiceA}
                  </button>
                  <button
                    type="button"
                    className="landing-grid-card-answer-choice"
                    data-slot="answerChoiceB"
                    onClick={(event) => {
                      onAnswerChoiceSelect?.('B', event);
                    }}
                  >
                    {card.test.answerChoiceB}
                  </button>
                </div>

                <dl className="landing-grid-card-meta-grid" data-slot="meta">
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
              </>
            ) : (
              <>
                <p className="landing-grid-card-summary" data-slot="summary">
                  {card.blog.summary}
                </p>

                <dl className="landing-grid-card-meta-grid" data-slot="meta">
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

                <Link
                  className="landing-grid-card-primary-cta"
                  href={buildLocalizedPath(RouteBuilder.blog(), locale)}
                  data-slot="primaryCTA"
                  onClick={handlePrimaryCtaClick}
                >
                  {card.blog.primaryCTA || copy.readMore}
                </Link>
              </>
            )}
          </div>
        </>
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
