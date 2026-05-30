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
  RefObject,
  WheelEventHandler
} from 'react';
import {useRef} from 'react';

import type {AppLocale} from '@/config/site';
import {
  type LandingCardTitleSplit,
  type LandingCardSubtitleSplit,
  useLandingCardSubtitleSplit,
  useLandingCardTitleSplit
} from '@/features/landing/grid/landing-card-title-continuity';
import {
  type LandingCardDesktopMotionRole,
  type LandingCardDesktopShellPhase,
  shouldRenderDesktopStageShell
} from '@/features/landing/grid/desktop-shell-phase';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';
import {LANDING_CARD_BASE_GAP_PX} from '@/features/landing/grid/spacing-plan';
import type {LandingCardVisualState} from '@/features/landing/model/interaction-state';
import {
  isUnavailablePresentation,
  resolveTestPreviewPayload,
  type LandingCard
} from '@/features/variant-registry';
import styles from '@/features/landing/grid/landing-grid-card.module.css';

const metaValueFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0
});
const thumbnailDataUriCache = new Map<string, string>();
const SPACING_PRECISION_SCALE = 10000;

export type {LandingCardVisualState} from '@/features/landing/model/interaction-state';
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
  hasAssetMedia?: boolean;
  locale: AppLocale;
  state?: LandingCardVisualState;
  interactionMode?: LandingCardInteractionMode;
  viewportTier?: LandingCardViewportTier;
  mobilePhase?: LandingCardMobilePhase;
  mobileTransientMode?: LandingCardMobileTransientMode;
  mobileRestoreReady?: boolean;
  desktopMotionRole?: LandingCardDesktopMotionRole;
  desktopShellPhase?: LandingCardDesktopShellPhase;
  desktopShellInlineScale?: number;
  reducedMotion?: boolean;
  mobileSnapshot?: LandingMobileSnapshotView | null;
  desktopTransformOriginX?: '0%' | '50%' | '100%';
  spacing?: LandingCardSpacingContract;
  copy: LandingCardCopy;
  sequence?: number;
  tabIndex?: number;
  ariaDisabled?: boolean;
  interactionBlocked?: boolean;
  keyboardModeBlocked?: boolean;
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

function createThumbnailFallbackDataUri(variant: string): string {
  const safeToken = variant.replace(/[^a-z0-9-]/gi, '').slice(0, 12).toUpperCase() || 'CARD';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 100" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3B6EF5"/><stop offset="100%" stop-color="#17A789"/></linearGradient></defs><rect width="600" height="100" fill="url(#g)"/><text x="24" y="62" font-size="36" font-family="Avenir Next, Noto Sans KR, Segoe UI, sans-serif" fill="rgba(255,255,255,0.85)">${safeToken}</text></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function resolveVariantMediaSource(variant: string, hasAssetMedia: boolean): string {
  if (hasAssetMedia) {
    return `/landing-card-media/${variant}/thumbnail.svg`;
  }

  const cacheKey = variant.trim();
  const cached = thumbnailDataUriCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const dataUri = createThumbnailFallbackDataUri(cacheKey);
  thumbnailDataUriCache.set(cacheKey, dataUri);
  return dataUri;
}

function resolveTransformOriginClassName(originX: '0%' | '50%' | '100%'): string {
  switch (originX) {
    case '0%':
      return '[--landing-card-shell-extra-start:0%] [--landing-card-shell-extra-end:calc((var(--landing-card-shell-inline-scale)-1)*100%)]';
    case '100%':
      return '[--landing-card-shell-extra-start:calc((var(--landing-card-shell-inline-scale)-1)*100%)] [--landing-card-shell-extra-end:0%]';
    case '50%':
    default:
      return '[--landing-card-shell-extra-start:calc((var(--landing-card-shell-inline-scale)-1)*50%)] [--landing-card-shell-extra-end:calc((var(--landing-card-shell-inline-scale)-1)*50%)]';
  }
}

function joinClassNames(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

const LANDING_GRID_CARD_ROOT_CLASSNAME =
  'landing-grid-card group relative isolate min-h-44 min-w-0 overflow-visible rounded-[var(--landing-card-radius)] [--landing-card-radius:16px] [--landing-card-stage-shadow-bleed-x:72px] [--landing-card-stage-shadow-bleed-top:56px] [--landing-card-stage-shadow-bleed-bottom:192px] [--landing-card-origin-y:0%] [--landing-card-shell-scale:1.04] [--landing-card-shell-inline-scale:1] [--landing-card-shell-extra-start:0%] [--landing-card-shell-extra-end:0%] [--landing-card-motion-ms:280ms]';
const LANDING_GRID_CARD_TRIGGER_BASE_CLASSNAME =
  'landing-grid-card-trigger relative block w-full rounded-[inherit] [border:0] bg-transparent text-left [color:inherit] cursor-pointer focus:outline-none aria-[disabled=true]:cursor-default';
const LANDING_GRID_CARD_CONTENT_CLASSNAME =
  'landing-grid-card-content relative z-[1] flex min-w-0 flex-col justify-start';
const LANDING_GRID_CARD_TITLE_BASE_CLASSNAME =
  'landing-grid-card-title relative z-[3] m-0 text-[1.04rem] leading-[1.35] [overflow-wrap:anywhere]';
const LANDING_GRID_CARD_SUBTITLE_BASE_CLASSNAME =
  'landing-grid-card-subtitle min-w-0 overflow-hidden text-ellipsis text-[0.92rem] leading-[1.4] text-[var(--muted-ink)] [overflow-wrap:anywhere]';
const LANDING_GRID_CARD_THUMBNAIL_SLOT_CLASSNAME =
  'landing-grid-card-thumbnail-slot relative mt-[var(--landing-card-base-gap)] aspect-[6/1] w-full min-w-0 shrink-0 overflow-hidden rounded-[var(--normal-thumb-radius)] bg-[color-mix(in_srgb,var(--chip-bg)_85%,transparent)]';
const LANDING_GRID_CARD_TAGS_CLASSNAME =
  'landing-grid-card-tags m-0 flex min-h-7 min-w-0 shrink-0 list-none items-center gap-2 overflow-hidden p-0';
const LANDING_GRID_CARD_TAGS_GAP_CLASSNAME =
  'landing-grid-card-tags-gap h-[calc(var(--landing-card-base-gap)_+_var(--landing-card-comp-gap))]';
const LANDING_GRID_CARD_TAG_ITEM_CLASSNAME = 'landing-grid-card-tag-item min-w-0 flex-[0_1_auto]';
const LANDING_GRID_CARD_TAG_CHIP_CLASSNAME =
  'landing-grid-card-tag-chip block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--normal-tag-radius)] border border-transparent bg-[var(--normal-tag-bg)] px-[9px] py-1 text-[13px] font-medium leading-[1.2] text-[var(--normal-tag-ink)]';
const LANDING_GRID_CARD_PREVIEW_QUESTION_CLASSNAME = 'landing-grid-card-preview-question m-0 text-[var(--muted-ink)]';
const LANDING_GRID_CARD_ANSWER_GRID_CLASSNAME = 'landing-grid-card-answer-grid grid gap-2';
const LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME =
  'landing-grid-card-answer-choice cursor-pointer overflow-visible rounded-[12px] border border-[var(--interactive-neutral-border)] bg-[var(--landing-answer-bg-rest)] bg-none px-3 py-2.5 text-left leading-[1.4] whitespace-normal text-[var(--interactive-neutral-ink)] text-clip transition-[border-color,background-color,box-shadow,color] duration-[140ms] [transition-timing-function:ease] disabled:cursor-default hover:border-[var(--landing-answer-border-hover)] hover:bg-[var(--landing-answer-bg-hover)] hover:bg-none hover:shadow-[var(--landing-answer-shadow-hover)] active:border-[var(--interactive-accent-border)] active:bg-[var(--landing-answer-bg-pressed)] active:bg-none active:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent-solid)_16%,transparent)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring-inner),0_0_0_4px_var(--focus-ring-outer)]';
const LANDING_GRID_CARD_META_GRID_CLASSNAME = 'landing-grid-card-meta-grid m-0 grid grid-cols-3 gap-2';
const LANDING_GRID_CARD_META_ITEM_CLASSNAME = 'landing-grid-card-meta-item m-0 grid min-w-0 gap-0.5';
const LANDING_GRID_CARD_META_LABEL_CLASSNAME =
  'landing-grid-card-meta-label m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.74rem] text-[var(--muted-ink)]';
const LANDING_GRID_CARD_META_VALUE_CLASSNAME =
  'landing-grid-card-meta-value m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.86rem] font-semibold';
const LANDING_GRID_CARD_PRIMARY_CTA_BASE_CLASSNAME =
  'landing-grid-card-primary-cta inline-flex min-h-10 max-w-full min-w-0 self-start items-center justify-center overflow-hidden rounded-full border border-[var(--interactive-accent-border)] bg-[var(--interactive-accent-bg)] px-4 py-2 text-[0.84rem] font-bold tracking-[0.01em] whitespace-nowrap text-[var(--text-strong)] text-ellipsis shadow-[inset_0_0_0_1px_var(--interactive-accent-outline),var(--interactive-accent-shadow)] transition-[border-color,background-color,box-shadow,color] duration-[140ms] [transition-timing-function:ease]';
const LANDING_GRID_CARD_PRIMARY_CTA_CLASSNAME =
  `${LANDING_GRID_CARD_PRIMARY_CTA_BASE_CLASSNAME} cursor-pointer hover:border-[var(--interactive-accent-border-strong)] hover:bg-[var(--interactive-accent-bg-hover)] hover:shadow-[inset_0_0_0_1px_var(--interactive-accent-outline),var(--interactive-accent-shadow-hover)] active:bg-[var(--interactive-accent-bg-pressed)] active:shadow-[inset_0_0_0_1px_var(--interactive-accent-outline),var(--interactive-accent-shadow)] focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--interactive-accent-outline),0_0_0_2px_var(--focus-ring-inner),0_0_0_4px_var(--focus-ring-outer),var(--interactive-accent-shadow)]`;
const LANDING_GRID_CARD_PRIMARY_CTA_STATIC_CLASSNAME = `${LANDING_GRID_CARD_PRIMARY_CTA_BASE_CLASSNAME} cursor-default`;
const LANDING_GRID_CARD_EXPANDED_CLASSNAME = 'landing-grid-card-expanded mt-0 grid min-w-0 gap-[10px] p-4';
const LANDING_GRID_CARD_SHELL_GHOST_CLASSNAME = 'landing-grid-card-shell-ghost invisible';
const LANDING_GRID_CARD_DESKTOP_STAGE_CLASSNAME = 'landing-grid-card-desktop-stage absolute inset-0 z-[3] pointer-events-none';
const LANDING_GRID_CARD_EXPANDED_LAYER_CLASSNAME =
  'landing-grid-card-expanded-layer pointer-events-none absolute z-[1] [inset:var(--landing-card-stage-shadow-bleed-top)_var(--landing-card-stage-shadow-bleed-x)_var(--landing-card-stage-shadow-bleed-bottom)_var(--landing-card-stage-shadow-bleed-x)]';
const LANDING_GRID_CARD_EXPANDED_SHELL_FRAME_CLASSNAME =
  'landing-grid-card-expanded-shell-frame relative left-0 min-h-full min-w-0 w-full pointer-events-none will-change-[left,width] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]';
const LANDING_GRID_CARD_EXPANDED_SHELL_CLASSNAME =
  'landing-grid-card-expanded-shell relative min-h-full min-w-0 w-full pointer-events-none [transform:scale(var(--landing-card-shell-scale))] [transform-origin:var(--landing-card-origin-x)_var(--landing-card-origin-y)] will-change-transform [backface-visibility:hidden] [-webkit-backface-visibility:hidden]';
const LANDING_GRID_CARD_EXPANDED_SHADOW_CLASSNAME =
  'landing-grid-card-expanded-shadow pointer-events-none absolute inset-0 z-0 rounded-[var(--landing-card-radius)] [box-shadow:var(--card-shadow-expanded-mid),var(--card-shadow-expanded-far)]';
const LANDING_GRID_CARD_EXPANDED_SURFACE_CLASSNAME =
  'landing-grid-card-expanded-surface relative z-[1] min-h-full w-full rounded-[var(--landing-card-radius)] [background:color-mix(in_srgb,var(--panel-solid)_96%,transparent)] [box-shadow:0_0_0_1px_color-mix(in_srgb,var(--surface-divider)_92%,transparent)] pointer-events-auto';
const LANDING_GRID_CARD_MOBILE_CLOSE_BASE_CLASSNAME =
  'landing-grid-card-mobile-close relative inline-flex min-h-10 min-w-10 shrink-0 basis-auto items-center justify-center rounded-full border border-[var(--chip-border)] bg-[var(--interactive-neutral-bg-strong)] p-0 font-semibold [color:var(--link-ink)]';
const LANDING_GRID_CARD_MOBILE_CLOSE_CLASSNAME =
  `${LANDING_GRID_CARD_MOBILE_CLOSE_BASE_CLASSNAME} cursor-pointer disabled:cursor-default disabled:opacity-70`;
const LANDING_GRID_CARD_MOBILE_CLOSE_GHOST_CLASSNAME =
  `${LANDING_GRID_CARD_MOBILE_CLOSE_BASE_CLASSNAME} landing-grid-card-mobile-close-ghost pointer-events-none`;
const LANDING_GRID_CARD_MOBILE_EXPANDED_CLASSNAME =
  'landing-grid-card-mobile-expanded grid min-w-0 max-h-[calc(100dvh-116px)] gap-0 overflow-auto overscroll-contain px-4 pb-4';
const LANDING_GRID_CARD_MOBILE_HEADER_CLASSNAME =
  'landing-grid-card-mobile-header sticky top-0 z-[4] flex items-start justify-between gap-3 bg-[color-mix(in_srgb,var(--panel-solid)_96%,transparent)] pt-4 pb-[14px]';
const LANDING_GRID_CARD_MOBILE_TITLE_CLASSNAME = 'landing-grid-card-title landing-grid-card-mobile-title flex-1 min-w-0';
const LANDING_GRID_CARD_MOBILE_BODY_CLASSNAME = 'landing-grid-card-mobile-body grid min-w-0 gap-[10px]';
const LANDING_GRID_CARD_MOBILE_TRANSIENT_SHELL_CLASSNAME =
  'landing-grid-card-mobile-transient-shell fixed left-[var(--landing-mobile-card-left,0px)] top-[var(--landing-mobile-anchor-top,0px)] z-[21] max-h-[calc(100dvh-116px)] max-w-full w-[var(--landing-mobile-card-width,100vw)] overflow-hidden rounded-[var(--landing-card-radius)] [box-shadow:var(--card-shadow-expanded-mid),var(--card-shadow-expanded-far)] pointer-events-none isolate';
const LANDING_GRID_CARD_MOBILE_TRANSIENT_PANEL_CLASSNAME =
  'landing-grid-card-mobile-transient-panel pointer-events-none absolute inset-0 z-0 rounded-[inherit] bg-[var(--panel-solid)]';
const LANDING_GRID_CARD_MOBILE_TRANSIENT_SURFACE_CLASSNAME =
  'landing-grid-card-mobile-transient-surface relative z-[1] grid min-w-0 max-h-[calc(100dvh-116px)] gap-0 overflow-hidden px-4 pb-4';
const LANDING_GRID_CARD_MOBILE_TRANSIENT_HEADER_CLASSNAME =
  `${LANDING_GRID_CARD_MOBILE_HEADER_CLASSNAME} landing-grid-card-mobile-transient-header relative z-[1] bg-transparent`;
const LANDING_GRID_CARD_UNAVAILABLE_OVERLAY_BASE_CLASSNAME =
  'landing-grid-card-unavailable-overlay pointer-events-none absolute inset-0 z-[2] flex items-start justify-end rounded-[inherit] p-3 [background:var(--unavailable-overlay-gradient)] [transition:opacity_140ms_ease]';
const LANDING_GRID_CARD_UNAVAILABLE_BADGE_CLASSNAME =
  'landing-grid-card-unavailable-badge rounded-full border border-[var(--unavailable-badge-border)] bg-[var(--unavailable-badge-bg)] px-[10px] py-1 text-[0.72rem] leading-[1.2] tracking-[0.01em] text-[var(--unavailable-badge-ink)]';

type LandingTestCard = Extract<LandingCard, {type: 'test'}>;
type LandingBlogCard = Extract<LandingCard, {type: 'blog'}>;

type NormalCardFacePresentation = 'collapsed' | 'expandedTitleOnly';

interface NormalCardFaceProps {
  card: LandingCard;
  hasAssetMedia: boolean;
  isMobileViewport: boolean;
  exposePublicSlots: boolean;
  presentation: NormalCardFacePresentation;
  titleRef?: RefObject<HTMLHeadingElement | null>;
  subtitleRef?: RefObject<HTMLParagraphElement | null>;
}

interface NormalCardTitleProps {
  card: LandingCard;
  isMobileViewport: boolean;
  exposePublicSlot: boolean;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}

interface NormalCardThumbnailProps {
  card: LandingCard;
  hasAssetMedia: boolean;
  exposePublicSlot: boolean;
}

interface NormalCardSubtitleProps {
  card: LandingCard;
  exposePublicSlot: boolean;
  subtitleRef?: RefObject<HTMLParagraphElement | null>;
}

interface NormalCardTagRowProps {
  card: LandingCard;
  exposePublicSlot: boolean;
}

function LandingCardSubtitleText({
  text,
  clamp,
  textRef,
  slot,
  motionSlot
}: {
  text: string;
  clamp: 'normal' | 'expanded';
  textRef?: RefObject<HTMLParagraphElement | null>;
  slot?: string;
  motionSlot?: string;
}) {
  return (
    <p
      ref={textRef}
      className={joinClassNames(
        LANDING_GRID_CARD_SUBTITLE_BASE_CLASSNAME,
        `landing-grid-card-subtitle-${clamp}`,
        clamp === 'normal'
          ? joinClassNames('mt-[var(--landing-card-base-gap)] shrink-0 line-clamp-2', styles.normalSubtitle)
          : joinClassNames('m-0 line-clamp-4', styles.motionStageEarly)
      )}
      data-slot={slot}
      data-motion-slot={motionSlot}
    >
      {text}
    </p>
  );
}

function NormalCardTitle({card, isMobileViewport, exposePublicSlot, titleRef}: NormalCardTitleProps) {
  return (
    <h2
      ref={titleRef}
      className={joinClassNames(
        LANDING_GRID_CARD_TITLE_BASE_CLASSNAME,
        'landing-grid-card-title-normal min-w-0 overflow-hidden text-ellipsis',
        isMobileViewport ? 'block overflow-visible text-clip' : 'line-clamp-1',
        styles.normalTitle
      )}
      data-slot={exposePublicSlot ? 'cardTitle' : undefined}
    >
      {card.title}
    </h2>
  );
}

function NormalCardThumbnail({card, hasAssetMedia, exposePublicSlot}: NormalCardThumbnailProps) {
  return (
    <div
      className={joinClassNames(LANDING_GRID_CARD_THUMBNAIL_SLOT_CLASSNAME, styles.normalThumbnail)}
      data-slot={exposePublicSlot ? 'cardThumbnail' : undefined}
      aria-hidden="true"
    >
      <Image
        className="landing-grid-card-thumbnail object-cover"
        src={resolveVariantMediaSource(card.variant, hasAssetMedia)}
        alt=""
        fill
        sizes="100vw"
        unoptimized
      />
    </div>
  );
}

function NormalCardSubtitle({card, exposePublicSlot, subtitleRef}: NormalCardSubtitleProps) {
  return (
    <LandingCardSubtitleText
      text={card.subtitle}
      clamp="normal"
      textRef={subtitleRef}
      slot={exposePublicSlot ? 'cardSubtitle' : undefined}
    />
  );
}

function NormalCardTagRow({card, exposePublicSlot}: NormalCardTagRowProps) {
  return (
    <>
      <div className={joinClassNames(LANDING_GRID_CARD_TAGS_GAP_CLASSNAME, styles.normalTagsGap)} aria-hidden="true" />

      <ul
        className={joinClassNames(LANDING_GRID_CARD_TAGS_CLASSNAME, styles.normalTags)}
        data-slot={exposePublicSlot ? 'tags' : undefined}
        data-tag-count={card.tags.length}
        aria-label="Card tags"
      >
        {card.tags.map((tag) => (
          <li key={`${card.variant}-${tag}`} className={LANDING_GRID_CARD_TAG_ITEM_CLASSNAME}>
            <span className={LANDING_GRID_CARD_TAG_CHIP_CLASSNAME}>{tag}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function NormalCardGhostBody({
  card,
  hasAssetMedia,
  subtitleRef
}: Pick<NormalCardFaceProps, 'card' | 'hasAssetMedia' | 'subtitleRef'>) {
  return (
    <>
      <NormalCardThumbnail card={card} hasAssetMedia={hasAssetMedia} exposePublicSlot={false} />
      <NormalCardSubtitle card={card} exposePublicSlot={false} subtitleRef={subtitleRef} />
      <NormalCardTagRow card={card} exposePublicSlot={false} />
    </>
  );
}

function NormalCardFace({
  card,
  hasAssetMedia,
  isMobileViewport,
  exposePublicSlots,
  presentation,
  titleRef,
  subtitleRef
}: NormalCardFaceProps) {
  const title = (
    <NormalCardTitle
      card={card}
      isMobileViewport={isMobileViewport}
      exposePublicSlot={exposePublicSlots}
      titleRef={titleRef}
    />
  );

  if (presentation === 'expandedTitleOnly') {
    return title;
  }

  return (
    <>
      <NormalCardThumbnail card={card} hasAssetMedia={hasAssetMedia} exposePublicSlot={exposePublicSlots} />
      {title}
      <NormalCardSubtitle card={card} exposePublicSlot={exposePublicSlots} subtitleRef={subtitleRef} />
      <NormalCardTagRow card={card} exposePublicSlot={exposePublicSlots} />
    </>
  );
}

function ExpandedBlogSubtitleContinuity({
  split
}: {
  split: LandingCardSubtitleSplit;
}) {
  return (
    <p
      className={joinClassNames(
        LANDING_GRID_CARD_SUBTITLE_BASE_CLASSNAME,
        'landing-grid-card-subtitle-expanded landing-grid-card-subtitle-expanded-continuity m-0 grid gap-0 text-clip',
        styles.motionStageEarly
      )}
      data-slot="cardSubtitleExpanded"
      data-motion-slot="subtitle"
    >
      <span className="landing-grid-card-subtitle-expanded-lead grid gap-0" data-subtitle-layer="lead">
        <span className="landing-grid-card-subtitle-expanded-line block min-w-0" data-subtitle-line="1">
          {split.line1Text}
        </span>
        <span className="landing-grid-card-subtitle-expanded-line block min-w-0" data-subtitle-line="2">
          {split.line2Text}
        </span>
      </span>
      <span
        className="landing-grid-card-subtitle-expanded-overflow min-w-0 [overflow-wrap:anywhere] line-clamp-2 empty:hidden"
        data-subtitle-layer="overflow"
      >
        {split.overflowText}
      </span>
    </p>
  );
}

interface ExpandedCardBodyProps {
  card: LandingCard;
  locale: AppLocale;
  copy: LandingCardCopy;
  interactive: boolean;
  blogSubtitlePresentation?: 'plain' | 'desktop-continuity';
  blogSubtitleSplit?: LandingCardSubtitleSplit;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
  onPrimaryCtaClick?: MouseEventHandler<HTMLAnchorElement>;
}

interface ExpandedTestBodyProps {
  card: LandingTestCard;
  locale: AppLocale;
  copy: LandingCardCopy;
  interactive: boolean;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
}

interface ExpandedBlogBodyProps {
  card: LandingBlogCard;
  locale: AppLocale;
  copy: LandingCardCopy;
  interactive: boolean;
  subtitlePresentation: 'plain' | 'desktop-continuity';
  subtitleSplit?: LandingCardSubtitleSplit;
  onPrimaryCtaClick?: MouseEventHandler<HTMLAnchorElement>;
}

interface UnavailableCardStatusOverlayProps {
  interactionMode: LandingCardInteractionMode;
  label: string;
}

interface DesktopExpandedShellProps {
  stageClassName: string;
  phase: LandingCardDesktopShellPhase;
  isVisible: boolean;
  isInteractive: boolean;
  card: LandingCard;
  locale: AppLocale;
  copy: LandingCardCopy;
  titleSplit: LandingCardTitleSplit;
  blogSubtitleSplit?: LandingCardSubtitleSplit;
  onExpandedBodyKeyDown?: KeyboardEventHandler<HTMLElement>;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
  onPrimaryCtaClick?: MouseEventHandler<HTMLAnchorElement>;
}

function ExpandedTestBody({card, locale, copy, interactive, onAnswerChoiceSelect}: ExpandedTestBodyProps) {
  // Preserve the registry resolver boundary; card UI must not read fixture source directly.
  const previewPayload = resolveTestPreviewPayload(card.variant, locale);

  return (
    <div className={LANDING_GRID_CARD_MOBILE_BODY_CLASSNAME} data-slot={interactive ? undefined : 'mobileTransientExpandedBody'}>
      <p
        className={joinClassNames(LANDING_GRID_CARD_PREVIEW_QUESTION_CLASSNAME, styles.motionStageEarly)}
        data-slot={interactive ? 'previewQuestion' : undefined}
        data-motion-slot="preview"
      >
        {previewPayload.previewQuestion}
      </p>

      <div
        className={joinClassNames(LANDING_GRID_CARD_ANSWER_GRID_CLASSNAME, styles.motionStageMiddle)}
        data-slot={interactive ? 'answerChoices' : undefined}
        data-motion-slot="answerChoices"
      >
        <button
          type="button"
          className={LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME}
          data-slot={interactive ? 'answerChoiceA' : undefined}
          onClick={(event) => {
            if (interactive) {
              onAnswerChoiceSelect?.('A', event);
            }
          }}
          tabIndex={interactive ? undefined : -1}
          aria-hidden={interactive ? undefined : 'true'}
        >
          {previewPayload.answerChoiceA}
        </button>
        <button
          type="button"
          className={LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME}
          data-slot={interactive ? 'answerChoiceB' : undefined}
          onClick={(event) => {
            if (interactive) {
              onAnswerChoiceSelect?.('B', event);
            }
          }}
          tabIndex={interactive ? undefined : -1}
          aria-hidden={interactive ? undefined : 'true'}
        >
          {previewPayload.answerChoiceB}
        </button>
      </div>

      <dl
        className={joinClassNames(LANDING_GRID_CARD_META_GRID_CLASSNAME, styles.motionStageMiddle)}
        data-slot={interactive ? 'meta' : undefined}
        data-motion-slot="meta"
      >
        <div className={LANDING_GRID_CARD_META_ITEM_CLASSNAME}>
          <dt className={LANDING_GRID_CARD_META_LABEL_CLASSNAME}>{copy.metaEstimated}</dt>
          <dd className={LANDING_GRID_CARD_META_VALUE_CLASSNAME}>{formatMetaValue(card.test.meta.durationM)}</dd>
        </div>
        <div className={LANDING_GRID_CARD_META_ITEM_CLASSNAME}>
          <dt className={LANDING_GRID_CARD_META_LABEL_CLASSNAME}>{copy.metaShares}</dt>
          <dd className={LANDING_GRID_CARD_META_VALUE_CLASSNAME}>{formatMetaValue(card.test.meta.sharedC)}</dd>
        </div>
        <div className={LANDING_GRID_CARD_META_ITEM_CLASSNAME}>
          <dt className={LANDING_GRID_CARD_META_LABEL_CLASSNAME}>{copy.metaAttempts}</dt>
          <dd className={LANDING_GRID_CARD_META_VALUE_CLASSNAME}>{formatMetaValue(card.test.meta.engagedC)}</dd>
        </div>
      </dl>
    </div>
  );
}

function ExpandedBlogBody({
  card,
  locale,
  copy,
  interactive,
  subtitlePresentation,
  subtitleSplit,
  onPrimaryCtaClick
}: ExpandedBlogBodyProps) {
  return (
    <div className={LANDING_GRID_CARD_MOBILE_BODY_CLASSNAME} data-slot={interactive ? undefined : 'mobileTransientExpandedBody'}>
      {subtitlePresentation === 'desktop-continuity' ? (
        <ExpandedBlogSubtitleContinuity
          split={
            subtitleSplit ?? {
              line1Text: card.subtitle,
              line2Text: '',
              leadText: card.subtitle,
              overflowText: ''
            }
          }
        />
      ) : (
        <LandingCardSubtitleText
          text={card.subtitle}
          clamp="expanded"
          slot={interactive ? 'cardSubtitleExpanded' : undefined}
          motionSlot="subtitle"
        />
      )}

      <dl
        className={joinClassNames(LANDING_GRID_CARD_META_GRID_CLASSNAME, styles.motionStageMiddle)}
        data-slot={interactive ? 'meta' : undefined}
        data-motion-slot="meta"
      >
        <div className={LANDING_GRID_CARD_META_ITEM_CLASSNAME}>
          <dt className={LANDING_GRID_CARD_META_LABEL_CLASSNAME}>{copy.metaReadTime}</dt>
          <dd className={LANDING_GRID_CARD_META_VALUE_CLASSNAME}>{formatMetaValue(card.blog.meta.durationM)}</dd>
        </div>
        <div className={LANDING_GRID_CARD_META_ITEM_CLASSNAME}>
          <dt className={LANDING_GRID_CARD_META_LABEL_CLASSNAME}>{copy.metaShares}</dt>
          <dd className={LANDING_GRID_CARD_META_VALUE_CLASSNAME}>{formatMetaValue(card.blog.meta.sharedC)}</dd>
        </div>
        <div className={LANDING_GRID_CARD_META_ITEM_CLASSNAME}>
          <dt className={LANDING_GRID_CARD_META_LABEL_CLASSNAME}>{copy.metaViews}</dt>
          <dd className={LANDING_GRID_CARD_META_VALUE_CLASSNAME}>{formatMetaValue(card.blog.meta.engagedC)}</dd>
        </div>
      </dl>

      {interactive ? (
        <Link
          className={joinClassNames(LANDING_GRID_CARD_PRIMARY_CTA_CLASSNAME, styles.motionStageLate)}
          href={buildLocalizedPath(RouteBuilder.blogArticle(card.variant), locale)}
          data-slot="primaryCTA"
          data-motion-slot="primaryCTA"
          onClick={onPrimaryCtaClick}
        >
          {copy.readMore}
        </Link>
      ) : (
        <span
          className={joinClassNames(LANDING_GRID_CARD_PRIMARY_CTA_STATIC_CLASSNAME, styles.motionStageLate)}
          aria-hidden="true"
          data-motion-slot="primaryCTA"
        >
          {copy.readMore}
        </span>
      )}
    </div>
  );
}

function ExpandedCardBody({
  card,
  locale,
  copy,
  interactive,
  blogSubtitlePresentation = 'plain',
  blogSubtitleSplit,
  onAnswerChoiceSelect,
  onPrimaryCtaClick
}: ExpandedCardBodyProps) {
  if (card.type === 'test') {
    return (
      <ExpandedTestBody
        card={card}
        locale={locale}
        copy={copy}
        interactive={interactive}
        onAnswerChoiceSelect={onAnswerChoiceSelect}
      />
    );
  }

  return (
    <ExpandedBlogBody
      card={card}
      locale={locale}
      copy={copy}
      interactive={interactive}
      subtitlePresentation={blogSubtitlePresentation}
      subtitleSplit={blogSubtitleSplit}
      onPrimaryCtaClick={onPrimaryCtaClick}
    />
  );
}

function UnavailableCardStatusOverlay({interactionMode, label}: UnavailableCardStatusOverlayProps) {
  const statusOverlayClassName = joinClassNames(
    LANDING_GRID_CARD_UNAVAILABLE_OVERLAY_BASE_CLASSNAME,
    interactionMode === 'hover'
      ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
      : 'opacity-100'
  );

  return (
    <div className={statusOverlayClassName} data-slot="unavailableOverlay" aria-hidden="true">
      <span className={LANDING_GRID_CARD_UNAVAILABLE_BADGE_CLASSNAME}>{label}</span>
    </div>
  );
}

function DesktopExpandedShell({
  stageClassName,
  phase,
  isVisible,
  isInteractive,
  card,
  locale,
  copy,
  titleSplit,
  blogSubtitleSplit,
  onExpandedBodyKeyDown,
  onAnswerChoiceSelect,
  onPrimaryCtaClick
}: DesktopExpandedShellProps) {
  return (
    <div
      className={stageClassName}
      data-testid="landing-grid-card-desktop-stage"
      data-slot="desktopStage"
      data-phase={phase}
      aria-hidden={isVisible ? undefined : 'true'}
    >
      {/* Desktop shell wrapper depth and slot names are CSS/QA geometry contracts. */}
      {isVisible ? (
        <div className={LANDING_GRID_CARD_EXPANDED_LAYER_CLASSNAME} data-slot="expandedLayer">
          <div className={joinClassNames(LANDING_GRID_CARD_EXPANDED_SHELL_FRAME_CLASSNAME, styles.expandedShellFrame)}>
            <div className={joinClassNames(LANDING_GRID_CARD_EXPANDED_SHELL_CLASSNAME, styles.expandedShell)} data-slot="expandedShell">
              <div
                className={LANDING_GRID_CARD_EXPANDED_SHADOW_CLASSNAME}
                data-slot="expandedShadowPlate"
                aria-hidden="true"
              />
              <div className={joinClassNames(LANDING_GRID_CARD_EXPANDED_SURFACE_CLASSNAME, styles.expandedSurface)} data-slot="expandedSurface">
                <div
                  className={joinClassNames(LANDING_GRID_CARD_EXPANDED_CLASSNAME, styles.expandedBody)}
                  data-slot="expandedBody"
                  onKeyDown={onExpandedBodyKeyDown}
                >
                  <h2
                    className={joinClassNames(
                      LANDING_GRID_CARD_TITLE_BASE_CLASSNAME,
                      'landing-grid-card-expanded-title grid min-w-0 gap-0'
                    )}
                    data-slot="cardTitleExpanded"
                  >
                    <DesktopExpandedTitle
                      line1Text={titleSplit.line1Text}
                      overflowText={titleSplit.overflowText}
                    />
                  </h2>
                  <ExpandedCardBody
                    card={card}
                    locale={locale}
                    copy={copy}
                    interactive={isInteractive}
                    blogSubtitlePresentation={card.type === 'blog' ? 'desktop-continuity' : 'plain'}
                    blogSubtitleSplit={card.type === 'blog' ? blogSubtitleSplit : undefined}
                    onAnswerChoiceSelect={onAnswerChoiceSelect}
                    onPrimaryCtaClick={onPrimaryCtaClick}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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
      <span className="landing-grid-card-expanded-title-line1 block min-w-0" data-title-layer="line1">
        {line1Text}
      </span>
      <span className="landing-grid-card-expanded-title-overflow block min-w-0 empty:hidden" data-title-layer="overflow">
        {overflowText}
      </span>
    </>
  );
}

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
  desktopShellInlineScale = 1,
  reducedMotion = false,
  mobileSnapshot = null,
  desktopTransformOriginX = '50%',
  spacing,
  copy,
  sequence,
  tabIndex = 0,
  ariaDisabled = false,
  interactionBlocked = false,
  keyboardModeBlocked = false,
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
  const normalSubtitleRef = useRef<HTMLParagraphElement | null>(null);
  const desktopTitleSplit = useLandingCardTitleSplit({
    enabled: !isMobileViewport,
    freeze: !isMobileViewport && desktopStagePhase !== 'idle',
    text: card.title,
    titleRef: normalTitleRef
  });
  const desktopSubtitleSplit = useLandingCardSubtitleSplit({
    enabled: !isMobileViewport && card.type === 'blog',
    freeze: !isMobileViewport && desktopStagePhase !== 'idle',
    text: card.type === 'blog' ? card.subtitle : '',
    subtitleRef: normalSubtitleRef
  });
  const transformOriginClassName = resolveTransformOriginClassName(desktopTransformOriginX);
  const resolvedShellScale = reducedMotion ? 1 : 1.04;
  const resolvedShellInlineScale = reducedMotion ? 1 : desktopShellInlineScale;
  const resolvedMotionDurationMs = reducedMotion ? 180 : 280;
  const isDesktopOverlayLayer = showDesktopExpandedShell;
  const isDesktopMotionEnter = desktopMotionRole === 'opening' || desktopMotionRole === 'handoff-target';
  const isDesktopMotionExit = desktopMotionRole === 'closing';
  const isDesktopMotionSteady = desktopMotionRole === 'steady';
  const hasDesktopStageGeometry = showDesktopExpandedShell;
  const isDesktopCleanupPending = desktopStagePhase === 'cleanup-pending';
  const isMobileClosingPhase = isMobileViewport && mobilePhase === 'CLOSING';
  const resolvedRootVisualClassName = showDesktopExpandedShell
    ? '[background:transparent] [box-shadow:none]'
    : isMobileExpanded
      ? '[background:var(--panel-solid)] [box-shadow:none]'
      : isMobileOpening || isMobileClosing
        ? '[background:color-mix(in_srgb,var(--panel-solid)_90%,transparent)] [box-shadow:none]'
        : '[background:color-mix(in_srgb,var(--panel-solid)_90%,transparent)] [box-shadow:var(--normal-card-shadow)] [border:1px_solid_var(--normal-card-border)]';
  const resolvedRootClassName = joinClassNames(
    LANDING_GRID_CARD_ROOT_CLASSNAME,
    styles.root,
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
  const forwardBlogDestinationCtaClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    // Destination transition and telemetry side effects stay in the parent callback.
    if (onPrimaryCtaClick) {
      onPrimaryCtaClick(event);
    }
  };

  return (
    <div
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
      aria-disabled={ariaDisabled ? 'true' : undefined}
      inert={keyboardModeBlocked}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerMove={onPointerMove}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
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
      <button
        type="button"
        className={resolvedTriggerClassName}
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
        <div className={resolvedContentClassName}>
          {isMobileExpanded ? null : (
            <NormalCardFace
              card={card}
              hasAssetMedia={hasAssetMedia}
              isMobileViewport={isMobileViewport}
              presentation={isDesktopExpanded ? 'expandedTitleOnly' : 'collapsed'}
              exposePublicSlots
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
      </button>

      {!isMobileViewport && !isUnavailable ? (
        <DesktopExpandedShell
          stageClassName={resolvedDesktopStageClassName}
          phase={desktopStagePhase}
          isVisible={showDesktopExpandedShell}
          isInteractive={desktopStagePhase !== 'cleanup-pending'}
          card={card}
          locale={locale}
          copy={copy}
          titleSplit={desktopTitleSplit}
          blogSubtitleSplit={desktopSubtitleSplit}
          onExpandedBodyKeyDown={onExpandedBodyKeyDown}
          onAnswerChoiceSelect={onAnswerChoiceSelect}
          onPrimaryCtaClick={forwardBlogDestinationCtaClick}
        />
      ) : null}

      {showMobileExpandedBody ? (
        <div
          className={joinClassNames(LANDING_GRID_CARD_MOBILE_EXPANDED_CLASSNAME, styles.mobileExpanded, styles.expandedBody)}
          data-slot="expandedBody"
          onKeyDown={onExpandedBodyKeyDown}
        >
          <div className={LANDING_GRID_CARD_MOBILE_HEADER_CLASSNAME} data-slot="mobileHeader">
            <h2 className={LANDING_GRID_CARD_MOBILE_TITLE_CLASSNAME} data-slot="cardTitle">
              {card.title}
            </h2>
            <button
              type="button"
              className={LANDING_GRID_CARD_MOBILE_CLOSE_CLASSNAME}
              aria-label={copy.closeExpandedAria}
              data-slot="mobileClose"
              onClick={onMobileClose}
              disabled={mobileTransientMode === 'CLOSING'}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <ExpandedCardBody
            card={card}
            locale={locale}
            copy={copy}
            interactive
            onAnswerChoiceSelect={onAnswerChoiceSelect}
            onPrimaryCtaClick={forwardBlogDestinationCtaClick}
          />
        </div>
      ) : null}

      {showMobileTransientShell ? (
        <div
          className={resolvedTransientShellClassName}
          data-slot="mobileTransientShell"
          data-state={mobileTransientMode}
          aria-hidden="true"
        >
          <div
            className={joinClassNames(LANDING_GRID_CARD_MOBILE_TRANSIENT_PANEL_CLASSNAME, styles.transientPanel)}
            data-slot="mobileTransientPanel"
          />
          <div className={LANDING_GRID_CARD_MOBILE_TRANSIENT_SURFACE_CLASSNAME}>
            <div className={LANDING_GRID_CARD_MOBILE_TRANSIENT_HEADER_CLASSNAME}>
              <h2 className={LANDING_GRID_CARD_MOBILE_TITLE_CLASSNAME} data-slot="cardTitleTransient">
                {card.title}
              </h2>
              <span
                className={LANDING_GRID_CARD_MOBILE_CLOSE_GHOST_CLASSNAME}
                data-slot="mobileCloseGhost"
              >
                <span aria-hidden="true">×</span>
              </span>
            </div>
            <ExpandedCardBody
              card={card}
              locale={locale}
              copy={copy}
              interactive={false}
              onAnswerChoiceSelect={onAnswerChoiceSelect}
              onPrimaryCtaClick={forwardBlogDestinationCtaClick}
            />
          </div>
        </div>
      ) : null}

      {isUnavailable ? (
        <UnavailableCardStatusOverlay interactionMode={interactionMode} label={copy.comingSoon} />
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
