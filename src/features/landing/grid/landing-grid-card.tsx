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
import {Fragment, useRef} from 'react';

import type {AppLocale} from '@/config/site';
import {
  type LandingCardTitleSplit,
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
  expandedRestingFloorPx?: number;
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

function createThumbnailFallbackDataUri(): string {
  // Calm abstract placeholder (design §4.9): warm-neutral → sage wash with soft circles, no text.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 240" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FBFAF7"/><stop offset="100%" stop-color="#C9DBD1"/></linearGradient></defs><rect width="640" height="240" fill="url(#g)"/><circle cx="556" cy="120" r="82" fill="#E8F0EC" opacity="0.6"/><circle cx="602" cy="70" r="40" fill="#5C8E78" opacity="0.14"/></svg>`;

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

  const dataUri = createThumbnailFallbackDataUri();
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
  'landing-grid-card-title relative z-[3] m-0 text-[20px] font-semibold leading-[1.3] [overflow-wrap:anywhere]';
const LANDING_GRID_CARD_SUBTITLE_BASE_CLASSNAME =
  'landing-grid-card-subtitle min-w-0 overflow-hidden text-ellipsis text-[0.92rem] leading-[1.4] text-[var(--muted-ink)] [overflow-wrap:anywhere]';
const LANDING_GRID_CARD_THUMBNAIL_SLOT_CLASSNAME =
  'landing-grid-card-thumbnail-slot relative aspect-[16/6] w-full min-w-0 shrink-0 overflow-hidden rounded-[var(--normal-thumb-radius)] bg-[color-mix(in_srgb,var(--chip-bg)_85%,transparent)]';
const LANDING_GRID_CARD_TAGS_CLASSNAME =
  'landing-grid-card-tags m-0 flex min-h-7 min-w-0 shrink-0 list-none items-center gap-2 overflow-hidden p-0';
const LANDING_GRID_CARD_TAGS_GAP_CLASSNAME =
  'landing-grid-card-tags-gap h-[calc(var(--landing-card-base-gap)_+_var(--landing-card-comp-gap))]';
const LANDING_GRID_CARD_TAG_ITEM_CLASSNAME = 'landing-grid-card-tag-item min-w-0 flex-[0_1_auto]';
const LANDING_GRID_CARD_TAG_CHIP_CLASSNAME =
  'landing-grid-card-tag-chip block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--normal-tag-radius)] border border-transparent bg-[var(--normal-tag-bg)] px-[9px] py-1 text-[13px] font-medium leading-[1.2] text-[var(--normal-tag-ink)]';
const LANDING_GRID_CARD_PREVIEW_QUESTION_CLASSNAME =
  'landing-grid-card-preview-question m-0 text-[21px] font-semibold leading-[1.3] tracking-[-0.01em] text-[var(--expanded-question-ink)] [word-break:keep-all] [overflow-wrap:anywhere]';
const LANDING_GRID_CARD_ANSWER_GRID_CLASSNAME = 'landing-grid-card-answer-grid grid gap-2';
const LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME =
  'landing-grid-card-answer-choice group/answerChoice flex items-start gap-3 cursor-pointer overflow-visible rounded-[12px] border border-[var(--expanded-choice-border)] bg-[var(--expanded-choice-surface)] px-3.5 py-3 text-left text-clip transition-[border-color,background-color] duration-[140ms] [transition-timing-function:ease] motion-reduce:transition-none disabled:cursor-default hover:border-[var(--expanded-choice-accent)] hover:bg-[var(--expanded-choice-accent-surface)] focus-visible:[outline:2px_solid_var(--expanded-choice-accent)] focus-visible:[outline-offset:2px]';
const LANDING_GRID_CARD_ANSWER_CHOICE_TEXT_CLASSNAME =
  'landing-grid-card-answer-choice-text min-w-0 flex-1 text-[15px] font-normal leading-[1.45] text-[var(--expanded-choice-ink)] [word-break:keep-all] [overflow-wrap:anywhere]';
const LANDING_GRID_CARD_ANSWER_CHOICE_ARROW_CLASSNAME =
  'landing-grid-card-answer-choice-arrow shrink-0 text-[15px] leading-[1.45] text-[var(--expanded-choice-arrow-ink)] transition-colors duration-[140ms] [transition-timing-function:ease] motion-reduce:transition-none group-hover/answerChoice:text-[var(--expanded-choice-accent)]';
// design §6.10 quiet data row: horizontal wrapping row, dot separators, 13px/500/--muted,
// leading value optionally emphasized. Inline value+label per item (no dt/dd stack).
const LANDING_GRID_CARD_META_ROW_CLASSNAME =
  'landing-grid-card-meta-row m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] font-medium leading-[1.35] text-[var(--muted-ink)]';
const LANDING_GRID_CARD_META_ITEM_CLASSNAME =
  'landing-grid-card-meta-item inline-flex items-baseline gap-1 whitespace-nowrap';
const LANDING_GRID_CARD_META_SEPARATOR_CLASSNAME =
  'landing-grid-card-meta-separator select-none [color:color-mix(in_srgb,var(--muted-ink)_55%,transparent)]';
const LANDING_GRID_CARD_META_VALUE_CLASSNAME = 'landing-grid-card-meta-value';
const LANDING_GRID_CARD_META_VALUE_LEAD_CLASSNAME =
  'landing-grid-card-meta-value landing-grid-card-meta-value-lead font-semibold text-[var(--text-strong)]';
const LANDING_GRID_CARD_META_LABEL_CLASSNAME = 'landing-grid-card-meta-label';
// Desktop overlay expandedBody is a flex column so the BQ-24 height-floor surplus can be absorbed
// by a single spacer (design §7.3). Mobile expanded/transient bodies keep their own grid layout.
const LANDING_GRID_CARD_EXPANDED_CLASSNAME = 'landing-grid-card-expanded mt-0 flex min-w-0 flex-col gap-[10px] p-4';
// desktop-overlay-floor body chain: flex-1 body fills the floored expandedBody; the single spacer
// (flex:1, min-height 14px) sits between the last choice / subtitle and the meta(+CTA) group so the
// meta anchors to the bottom and the card grows downward (content-fit) when content overflows.
const LANDING_GRID_CARD_EXPANDED_FLOOR_BODY_CLASSNAME = 'landing-grid-card-expanded-floor-body flex min-w-0 flex-1 flex-col';
const LANDING_GRID_CARD_EXPANDED_FLOOR_GROUP_CLASSNAME = 'landing-grid-card-expanded-floor-group flex min-w-0 flex-col gap-[10px]';
const LANDING_GRID_CARD_EXPANDED_FLOOR_SPACER_CLASSNAME = 'landing-grid-card-expanded-floor-spacer min-h-[14px] flex-1';
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

type NormalCardFacePresentation = 'collapsed' | 'expandedTitleOnly';

// 'desktop-overlay-floor' opts the expanded body into the BQ-24 floor layout (flex column + single
// bottom spacer). 'flow' keeps the shared mobile expanded/transient grid layout untouched.
type ExpandedBodyLayoutMode = 'flow' | 'desktop-overlay-floor';

interface NormalCardFaceProps {
  card: LandingCard;
  hasAssetMedia: boolean;
  interactionMode?: LandingCardInteractionMode;
  isMobileViewport: boolean;
  exposePublicSlots: boolean;
  presentation: NormalCardFacePresentation;
  readMoreLabel?: string;
  titleRef?: RefObject<HTMLHeadingElement | null>;
  subtitleRef?: RefObject<HTMLParagraphElement | null>;
}

interface NormalCardTitleProps {
  card: LandingCard;
  isMobileViewport: boolean;
  exposePublicSlot: boolean;
  // Pure base_gap above the title in the collapsed face (thumbnail → title rhythm, req-landing §6.7).
  // Off in expandedTitleOnly, where the thumbnail is absent and the title sits at the content inset.
  topGap: boolean;
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
  interactionMode?: LandingCardInteractionMode;
  readMoreLabel?: string;
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

function NormalCardTitle({card, isMobileViewport, exposePublicSlot, topGap, titleRef}: NormalCardTitleProps) {
  return (
    <h2
      ref={titleRef}
      className={joinClassNames(
        LANDING_GRID_CARD_TITLE_BASE_CLASSNAME,
        'landing-grid-card-title-normal min-w-0 overflow-hidden text-ellipsis',
        topGap && 'mt-[var(--landing-card-base-gap)]',
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

function NormalCardTagRow({card, exposePublicSlot, interactionMode = 'tap', readMoreLabel}: NormalCardTagRowProps) {
  const tags = (
    <ul
      className={joinClassNames(
        LANDING_GRID_CARD_TAGS_CLASSNAME,
        styles.normalTags,
        readMoreLabel && 'flex-1 [flex-shrink:1]'
      )}
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
  );

  const readMore = readMoreLabel ? (
    <span
      className={joinClassNames(
        'landing-grid-card-blog-read-more ml-auto shrink-0 whitespace-nowrap text-[13px] font-medium leading-[1.35] text-[var(--muted-ink)] no-underline',
        interactionMode === 'hover'
          ? 'opacity-0 transition-opacity duration-[140ms] group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none'
          : 'opacity-100'
      )}
      data-slot="blogReadMore"
      aria-hidden="true"
    >
      {readMoreLabel} →
    </span>
  ) : null;

  return (
    <>
      <div className={joinClassNames(LANDING_GRID_CARD_TAGS_GAP_CLASSNAME, styles.normalTagsGap)} aria-hidden="true" />

      {readMore ? (
        <div className="landing-grid-card-tag-row flex min-h-7 min-w-0 shrink-0 items-center gap-3">
          {tags}
          {readMore}
        </div>
      ) : (
        tags
      )}
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
  interactionMode,
  isMobileViewport,
  exposePublicSlots,
  presentation,
  readMoreLabel,
  titleRef,
  subtitleRef
}: NormalCardFaceProps) {
  const title = (
    <NormalCardTitle
      card={card}
      isMobileViewport={isMobileViewport}
      exposePublicSlot={exposePublicSlots}
      topGap={presentation === 'collapsed'}
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
      <NormalCardTagRow
        card={card}
        exposePublicSlot={exposePublicSlots}
        interactionMode={interactionMode}
        readMoreLabel={readMoreLabel}
      />
    </>
  );
}

interface ExpandedCardBodyProps {
  card: LandingTestCard;
  locale: AppLocale;
  copy: LandingCardCopy;
  interactive: boolean;
  layoutMode?: ExpandedBodyLayoutMode;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
}

interface ExpandedTestBodyProps {
  card: LandingTestCard;
  locale: AppLocale;
  copy: LandingCardCopy;
  interactive: boolean;
  layoutMode: ExpandedBodyLayoutMode;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
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
  card: LandingTestCard;
  locale: AppLocale;
  copy: LandingCardCopy;
  // Layout floor in CSS pixels (resting outer height / shell scale), applied to expandedBody only.
  floorPx?: number;
  titleSplit: LandingCardTitleSplit;
  onExpandedBodyKeyDown?: KeyboardEventHandler<HTMLElement>;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
}

function ExpandedTestAnswerChoice({
  choice,
  label,
  interactive,
  onSelect
}: {
  choice: 'A' | 'B';
  label: string;
  interactive: boolean;
  onSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className={LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME}
      data-slot={interactive ? `answerChoice${choice}` : undefined}
      onClick={(event) => {
        if (interactive) {
          onSelect?.(choice, event);
        }
      }}
      tabIndex={interactive ? undefined : -1}
      aria-hidden={interactive ? undefined : 'true'}
    >
      <span className={LANDING_GRID_CARD_ANSWER_CHOICE_TEXT_CLASSNAME}>{label}</span>
      <span className={LANDING_GRID_CARD_ANSWER_CHOICE_ARROW_CLASSNAME} aria-hidden="true">→</span>
    </button>
  );
}

interface ExpandedMetaEntry {
  label: string;
  value: number;
}

// Quiet data row (design §6.10): inline "value label" items separated by decorative dots,
// the leading (first) value emphasized. data-slot/data-motion-slot preserved for QA + expand motion.
function ExpandedMetaRow({entries, interactive}: {entries: [ExpandedMetaEntry, ...ExpandedMetaEntry[]]; interactive: boolean}) {
  return (
    <p
      className={joinClassNames(LANDING_GRID_CARD_META_ROW_CLASSNAME, styles.motionStageMiddle)}
      data-slot={interactive ? 'meta' : undefined}
      data-motion-slot="meta"
    >
      {entries.map((entry, index) => (
        <Fragment key={entry.label}>
          {index > 0 ? (
            <span className={LANDING_GRID_CARD_META_SEPARATOR_CLASSNAME} aria-hidden="true">
              ·
            </span>
          ) : null}
          <span className={LANDING_GRID_CARD_META_ITEM_CLASSNAME}>
            <span
              className={index === 0 ? LANDING_GRID_CARD_META_VALUE_LEAD_CLASSNAME : LANDING_GRID_CARD_META_VALUE_CLASSNAME}
            >
              {formatMetaValue(entry.value)}
            </span>
            <span className={LANDING_GRID_CARD_META_LABEL_CLASSNAME}>{entry.label}</span>
          </span>
        </Fragment>
      ))}
    </p>
  );
}

function ExpandedTestBody({card, locale, copy, interactive, layoutMode, onAnswerChoiceSelect}: ExpandedTestBodyProps) {
  // Preserve the registry resolver boundary; card UI must not read fixture source directly.
  const previewPayload = resolveTestPreviewPayload(card.variant, locale);
  const bodyDataSlot = interactive ? undefined : 'mobileTransientExpandedBody';

  const previewQuestion = (
    <p
      className={joinClassNames(LANDING_GRID_CARD_PREVIEW_QUESTION_CLASSNAME, styles.motionStageEarly)}
      data-slot={interactive ? 'previewQuestion' : undefined}
      data-motion-slot="preview"
    >
      {previewPayload.previewQuestion}
    </p>
  );

  const answerChoices = (
    <div
      className={joinClassNames(LANDING_GRID_CARD_ANSWER_GRID_CLASSNAME, styles.motionStageMiddle)}
      data-slot={interactive ? 'answerChoices' : undefined}
      data-motion-slot="answerChoices"
    >
      <ExpandedTestAnswerChoice
        choice="A"
        label={previewPayload.answerChoiceA}
        interactive={interactive}
        onSelect={onAnswerChoiceSelect}
      />
      <ExpandedTestAnswerChoice
        choice="B"
        label={previewPayload.answerChoiceB}
        interactive={interactive}
        onSelect={onAnswerChoiceSelect}
      />
    </div>
  );

  const meta = (
    <ExpandedMetaRow
      interactive={interactive}
      entries={[
        {label: copy.metaEstimated, value: card.test.meta.durationM},
        {label: copy.metaShares, value: card.test.meta.sharedC},
        {label: copy.metaAttempts, value: card.test.meta.engagedC}
      ]}
    />
  );

  if (layoutMode === 'desktop-overlay-floor') {
    // Single spacer between the last choice and the meta row (design §7.3).
    return (
      <div className={LANDING_GRID_CARD_EXPANDED_FLOOR_BODY_CLASSNAME} data-slot={bodyDataSlot}>
        <div className={LANDING_GRID_CARD_EXPANDED_FLOOR_GROUP_CLASSNAME}>
          {previewQuestion}
          {answerChoices}
        </div>
        <div className={LANDING_GRID_CARD_EXPANDED_FLOOR_SPACER_CLASSNAME} aria-hidden="true" />
        {meta}
      </div>
    );
  }

  return (
    <div className={LANDING_GRID_CARD_MOBILE_BODY_CLASSNAME} data-slot={bodyDataSlot}>
      {previewQuestion}
      {answerChoices}
      {meta}
    </div>
  );
}

function ExpandedCardBody({
  card,
  locale,
  copy,
  interactive,
  layoutMode = 'flow',
  onAnswerChoiceSelect
}: ExpandedCardBodyProps) {
  return (
    <ExpandedTestBody
      card={card}
      locale={locale}
      copy={copy}
      interactive={interactive}
      layoutMode={layoutMode}
      onAnswerChoiceSelect={onAnswerChoiceSelect}
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
  floorPx,
  titleSplit,
  onExpandedBodyKeyDown,
  onAnswerChoiceSelect
}: DesktopExpandedShellProps) {
  const floorStyle =
    typeof floorPx === 'number' && Number.isFinite(floorPx) && floorPx > 0
      ? ({
          minHeight: `${floorPx}px`
        } as CSSProperties)
      : undefined;

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
                  style={floorStyle}
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
                    layoutMode="desktop-overlay-floor"
                    onAnswerChoiceSelect={onAnswerChoiceSelect}
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
  expandedRestingFloorPx,
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
  onMobileClose
}: LandingGridCardProps) {
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
  const normalTitleRef = useRef<HTMLHeadingElement | null>(null);
  const normalSubtitleRef = useRef<HTMLParagraphElement | null>(null);
  const desktopTitleSplit = useLandingCardTitleSplit({
    enabled: !isMobileViewport,
    freeze: !isMobileViewport && desktopStagePhase !== 'idle',
    text: card.title,
    titleRef: normalTitleRef
  });
  const transformOriginClassName = resolveTransformOriginClassName(desktopTransformOriginX);
  const resolvedShellScale = reducedMotion ? 1 : 1.04;
  const resolvedShellInlineScale = reducedMotion ? 1 : desktopShellInlineScale;
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
    isBlogCard && styles.blogCard,
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
          aria-label={isMobileExpanded ? card.title : undefined}
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
          isInteractive={desktopStagePhase !== 'cleanup-pending'}
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
          />
        </div>
      ) : null}

      {showMobileTransientShell && isTestCard ? (
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
    metaAttempts: 'Completed',
    metaReadTime: 'Read time',
    metaViews: 'Views',
    readMore: 'Read more'
  };
}
