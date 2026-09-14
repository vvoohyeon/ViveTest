import Image from 'next/image';
import type {RefObject} from 'react';
import {useRef} from 'react';

import type {LandingCardInteractionMode} from '@/features/landing/grid/landing-card-contract';
import {
  joinClassNames,
  LANDING_GRID_CARD_SUBTITLE_BASE_CLASSNAME,
  LANDING_GRID_CARD_TAG_CHIP_CLASSNAME,
  LANDING_GRID_CARD_TAG_ITEM_CLASSNAME,
  LANDING_GRID_CARD_TAGS_CLASSNAME,
  LANDING_GRID_CARD_TAGS_GAP_CLASSNAME,
  LANDING_GRID_CARD_THUMBNAIL_SLOT_CLASSNAME,
  LANDING_GRID_CARD_TITLE_BASE_CLASSNAME
} from '@/features/landing/grid/landing-grid-card-classnames';
import {useCardInlineGeometry} from '@/features/landing/grid/use-card-inline-geometry';
import type {LandingCard} from '@/features/variant-registry';
import styles from '@/features/landing/grid/landing-grid-card.module.css';

// 접힌 얼굴 전체 — 썸네일 · 제목 · 부제 · 태그 행, 그리고 데스크톱 확장 중 뒤에 남는 ghost 본문.
// 카드가 확장해도 이 얼굴은 사라지지 않는다: 데스크톱에서는 제목만 남기고(expandedTitleOnly),
// ghost 가 접힌 상태의 높이를 그대로 차지해 그리드 리듬을 지킨다.

const thumbnailDataUriCache = new Map<string, string>();

export function createThumbnailFallbackDataUri(): string {
  // Safety net for a variant that ships without its own drawing (design §4.9: no text).
  //
  // It used to be the *same artwork* as `qmbti/thumbnail.svg`, and since only that one
  // variant had an asset, the catalog rendered one illustration eight times (D-08).
  // So this is deliberately NOT one of the compositions: a single tinted slot, with
  // nothing to mistake for cadence, layers, signal or any other member of the set.
  // Ground stays transparent so it inherits the card surface in both themes.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 240" width="640" height="240" role="img" aria-hidden="true" data-thumbnail-fallback="true"><rect x="0" y="0" width="640" height="240" rx="0" fill="#e8f0ec" opacity="0.55"/></svg>`;

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

export type NormalCardFacePresentation = 'collapsed' | 'expandedTitleOnly';

export interface NormalCardFaceProps {
  card: LandingCard;
  hasAssetMedia: boolean;
  interactionMode?: LandingCardInteractionMode;
  isMobileViewport: boolean;
  exposePublicSlots: boolean;
  presentation: NormalCardFacePresentation;
  readMoreLabel?: string;
  comingSoonLabel?: string;
  titleId?: string;
  statusId?: string;
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
  titleId?: string;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}

interface NormalCardThumbnailProps {
  card: LandingCard;
  hasAssetMedia: boolean;
  exposePublicSlot: boolean;
}

interface NormalCardSubtitleProps {
  card: LandingCard;
  isMobileViewport: boolean;
  exposePublicSlot: boolean;
  subtitleRef?: RefObject<HTMLParagraphElement | null>;
}

interface NormalCardTagRowProps {
  card: LandingCard;
  exposePublicSlot: boolean;
  interactionMode?: LandingCardInteractionMode;
  readMoreLabel?: string;
  comingSoonLabel?: string;
  statusId?: string;
}

function LandingCardSubtitleText({
  text,
  clamp,
  textRef,
  slot,
  motionSlot,
  isMobileViewport = false
}: {
  text: string;
  clamp: 'normal' | 'expanded';
  textRef?: RefObject<HTMLParagraphElement | null>;
  slot?: string;
  motionSlot?: string;
  isMobileViewport?: boolean;
}) {
  return (
    <p
      ref={textRef}
      className={joinClassNames(
        LANDING_GRID_CARD_SUBTITLE_BASE_CLASSNAME,
        `landing-grid-card-subtitle-${clamp}`,
        clamp === 'normal'
          ? joinClassNames(
              'mt-[var(--landing-card-base-gap)] shrink-0',
              isMobileViewport ? 'overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-2',
              styles.normalSubtitle
            )
          : joinClassNames('m-0 overflow-hidden text-ellipsis line-clamp-4', styles.motionStageEarly)
      )}
      data-slot={slot}
      data-motion-slot={motionSlot}
    >
      {text}
    </p>
  );
}

function NormalCardTitle({
  card,
  isMobileViewport,
  exposePublicSlot,
  topGap,
  titleId,
  titleRef
}: NormalCardTitleProps) {
  return (
    <h2
      id={titleId}
      ref={titleRef}
      className={joinClassNames(
        LANDING_GRID_CARD_TITLE_BASE_CLASSNAME,
        'landing-grid-card-title-normal min-w-0',
        topGap && 'mt-[var(--landing-card-base-gap)]',
        isMobileViewport ? 'block overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-1',
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

function NormalCardSubtitle({card, isMobileViewport, exposePublicSlot, subtitleRef}: NormalCardSubtitleProps) {
  return (
    <LandingCardSubtitleText
      text={card.subtitle}
      clamp="normal"
      textRef={subtitleRef}
      slot={exposePublicSlot ? 'cardSubtitle' : undefined}
      isMobileViewport={isMobileViewport}
    />
  );
}

function NormalCardTagRow({
  card,
  exposePublicSlot,
  interactionMode = 'tap',
  readMoreLabel,
  comingSoonLabel,
  statusId
}: NormalCardTagRowProps) {
  const rowRef = useRef<HTMLElement | null>(null);
  const probeRef = useRef<HTMLDivElement | null>(null);
  const normalizedTags = comingSoonLabel ? [comingSoonLabel] : card.tags;
  const {decision} = useCardInlineGeometry({
    rowRef,
    probeRef,
    tagCount: normalizedTags.length,
    requiredVisiblePrefixCount: comingSoonLabel ? 1 : 0,
    ctaVisibility: readMoreLabel ? (interactionMode === 'hover' ? 'hover-focus' : 'always') : 'never'
  });
  const visibleTags = normalizedTags.slice(0, decision.visibleCount);
  const tags = (
    <ul
      ref={readMoreLabel ? undefined : (rowRef as RefObject<HTMLUListElement | null>)}
      className={joinClassNames(
        LANDING_GRID_CARD_TAGS_CLASSNAME,
        styles.normalTags,
        readMoreLabel && 'flex-1 [flex-shrink:1]'
      )}
      data-slot={exposePublicSlot ? 'tags' : undefined}
      data-tag-count={normalizedTags.length}
      data-visible-tag-count={decision.visibleCount}
      data-tag-tail-ellipsis={decision.tailMayEllipsize ? 'true' : 'false'}
    >
      {visibleTags.map((tag, index) => (
        <li
          key={`${card.variant}-${tag}`}
          className={joinClassNames(
            LANDING_GRID_CARD_TAG_ITEM_CLASSNAME,
            decision.tailMayEllipsize && index === decision.tailIndex ? styles.flexibleTagItem : styles.fixedTagItem
          )}
        >
          <span
            id={comingSoonLabel ? statusId : undefined}
            className={LANDING_GRID_CARD_TAG_CHIP_CLASSNAME}
            data-slot={comingSoonLabel && exposePublicSlot ? 'comingSoonTag' : undefined}
          >
            {tag}
          </span>
        </li>
      ))}
    </ul>
  );

  const readMore = readMoreLabel ? (
    <span
      className={joinClassNames(
        'landing-grid-card-blog-read-more ml-auto inline-flex shrink-0 items-center gap-[6px] whitespace-nowrap text-[13px] font-medium leading-[1.35] no-underline',
        styles.blogReadMore,
        interactionMode === 'hover'
          ? joinClassNames(
              styles.blogReadMoreHover,
              'opacity-0 duration-[140ms] ease-out group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none'
            )
          : 'opacity-100'
      )}
      data-slot="blogReadMore"
      aria-hidden="true"
    >
      <span data-slot="blogReadMoreLabel">{readMoreLabel}</span>
      <span data-slot="blogReadMoreArrow">→</span>
    </span>
  ) : null;
  const probe = (
    <div
      ref={probeRef}
      className={styles.tagMeasurementProbe}
      data-slot="tagMeasurementProbe"
      aria-hidden="true"
      inert
    >
      {normalizedTags.map((tag) => (
        <span key={`${card.variant}-${tag}-probe`} className={LANDING_GRID_CARD_TAG_CHIP_CLASSNAME} data-inline-probe-tag>
          {tag}
        </span>
      ))}
      {readMoreLabel ? (
        <span
          className={joinClassNames(
            styles.blogReadMore,
            'inline-flex items-center gap-[6px] whitespace-nowrap text-[13px] font-medium leading-[1.35]'
          )}
          data-slot="blogReadMoreProbe"
        >
          <span>{readMoreLabel}</span>
          <span>→</span>
        </span>
      ) : null}
    </div>
  );

  return (
    <>
      <div className={joinClassNames(LANDING_GRID_CARD_TAGS_GAP_CLASSNAME, styles.normalTagsGap)} aria-hidden="true" />

      {readMore ? (
        <div ref={rowRef as RefObject<HTMLDivElement | null>} className="landing-grid-card-tag-row relative flex min-h-7 min-w-0 shrink-0 items-center gap-3">
          {tags}
          {readMore}
          <div className={styles.tagMeasurementProbeAnchor}>{probe}</div>
        </div>
      ) : (
        <>
          {tags}
          <div className={styles.tagMeasurementProbeAnchor}>{probe}</div>
        </>
      )}
    </>
  );
}

export function NormalCardGhostBody({
  card,
  hasAssetMedia,
  subtitleRef
}: Pick<NormalCardFaceProps, 'card' | 'hasAssetMedia' | 'subtitleRef'>) {
  return (
    <>
      <NormalCardThumbnail card={card} hasAssetMedia={hasAssetMedia} exposePublicSlot={false} />
      <NormalCardSubtitle
        card={card}
        isMobileViewport={false}
        exposePublicSlot={false}
        subtitleRef={subtitleRef}
      />
      <NormalCardTagRow card={card} exposePublicSlot={false} />
    </>
  );
}

export function NormalCardFace({
  card,
  hasAssetMedia,
  interactionMode,
  isMobileViewport,
  exposePublicSlots,
  presentation,
  readMoreLabel,
  comingSoonLabel,
  titleId,
  statusId,
  titleRef,
  subtitleRef
}: NormalCardFaceProps) {
  const title = (
    <NormalCardTitle
      card={card}
      isMobileViewport={isMobileViewport}
      exposePublicSlot={exposePublicSlots}
      topGap={presentation === 'collapsed'}
      titleId={titleId}
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
      <NormalCardSubtitle
        card={card}
        isMobileViewport={isMobileViewport}
        exposePublicSlot={exposePublicSlots}
        subtitleRef={subtitleRef}
      />
      <NormalCardTagRow
        card={card}
        exposePublicSlot={exposePublicSlots}
        interactionMode={interactionMode}
        readMoreLabel={readMoreLabel}
        comingSoonLabel={comingSoonLabel}
        statusId={statusId}
      />
    </>
  );
}
