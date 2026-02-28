'use client';

import {memo, type CSSProperties, useLayoutEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import Image from 'next/image';
import type {BinaryChoiceCode} from '@/features/test/data/test-fixture';
import type {CatalogCard, InteractionMode, PageState} from '@/features/landing/types';
import styles from './catalog-card.module.css';

type CatalogCardProps = {
  card: CatalogCard;
  isExpanded: boolean;
  shouldDisableByHoverLock: boolean;
  showUnavailableOverlay: boolean;
  interactionMode: InteractionMode;
  pageState: PageState;
  isTransitioning: boolean;
  isMobile: boolean;
  transformOriginX: '0%' | '50%' | '100%';
  normalHeightPx?: number;
  keepDesktopExpandedLayer?: boolean;
  isHoverLockActive: boolean;
  isHoverLockTarget: boolean;
  allowTabFocusWhileHoverLocked: boolean;
  forceInstantTransition?: boolean;
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
  onExpand: (cardId: string) => void;
  onCollapse: (cardId: string) => void;
  onHoverEnterAvailable: (cardId: string) => void;
  onHoverLeaveAvailable: (cardId: string, handoffToAnotherCard: boolean) => void;
  onHoverEnterUnavailable: (cardId: string) => void;
  onHoverLeaveUnavailable: (cardId: string, handoffToAnotherCard: boolean) => void;
  onUnavailableActiveChange: (cardId: string, active: boolean) => void;
  onTriggerTestChoice: (card: Extract<CatalogCard, {type: 'test'}>, answer: BinaryChoiceCode) => void;
  onTriggerBlogReadMore: (card: Extract<CatalogCard, {type: 'blog'}>) => void;
  onRegisterElement: (cardId: string, element: HTMLElement | null) => void;
};

function CatalogCardComponent({
  card,
  isExpanded,
  shouldDisableByHoverLock,
  showUnavailableOverlay,
  interactionMode,
  pageState,
  isTransitioning,
  isMobile,
  transformOriginX,
  normalHeightPx,
  keepDesktopExpandedLayer = false,
  isHoverLockActive,
  isHoverLockTarget,
  allowTabFocusWhileHoverLocked,
  forceInstantTransition = false,
  wrapperClassName,
  wrapperStyle,
  onExpand,
  onCollapse,
  onHoverEnterAvailable,
  onHoverLeaveAvailable,
  onHoverEnterUnavailable,
  onHoverLeaveUnavailable,
  onUnavailableActiveChange,
  onTriggerTestChoice,
  onTriggerBlogReadMore,
  onRegisterElement
}: CatalogCardProps) {
  const t = useTranslations();

  const isAvailable = card.availability === 'available';
  const isHoverMode = interactionMode === 'HOVER_MODE';
  const canInteract = pageState === 'ACTIVE' || pageState === 'REDUCED_MOTION';
  const shouldExpandOnClick = isAvailable && interactionMode === 'TAP_MODE';
  const shouldIgnoreInput = isTransitioning || !canInteract;
  const isLockedNonTarget = isHoverLockActive && !isHoverLockTarget;

  const tabIndex = shouldDisableByHoverLock ? (allowTabFocusWhileHoverLocked ? 0 : -1) : 0;
  const showExpanded = isExpanded && isAvailable;
  const expandedControlTabIndex = showExpanded ? 0 : -1;
  const ariaDisabled = !isAvailable || isLockedNonTarget;
  const expandedBlockRef = useRef<HTMLDivElement | null>(null);
  const [mobileExpandedMaxHeight, setMobileExpandedMaxHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!isMobile) {
      setMobileExpandedMaxHeight(null);
      return;
    }

    const element = expandedBlockRef.current;
    if (!element) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      const target = showExpanded ? element.scrollHeight : 0;
      setMobileExpandedMaxHeight(target);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [card.id, isMobile, showExpanded]);
  const combinedWrapperStyle: CSSProperties = {
    ...(normalHeightPx && !isMobile ? {height: `${normalHeightPx}px`} : {}),
    ...wrapperStyle
  };

  return (
    <article
      data-catalog-card-root="true"
      className={[
        styles.wrapper,
        forceInstantTransition ? styles.instantMotion : '',
        wrapperClassName ?? ''
      ]
        .filter(Boolean)
        .join(' ')}
      ref={(element) => onRegisterElement(card.id, element)}
      onMouseEnter={() => {
        if (isTransitioning || isMobile || !isHoverMode) {
          return;
        }

        if (isAvailable) {
          onHoverEnterAvailable(card.id);
          return;
        }

        onHoverEnterUnavailable(card.id);
      }}
      onMouseLeave={(event) => {
        if (isTransitioning || isMobile || !isHoverMode) {
          return;
        }

        const relatedTarget = event.relatedTarget;
        const handoffToAnotherCard =
          relatedTarget instanceof Element &&
          relatedTarget.closest('[data-catalog-card-root="true"]') !== null;

        if (isAvailable) {
          onHoverLeaveAvailable(card.id, handoffToAnotherCard);
          return;
        }

        onHoverLeaveUnavailable(card.id, handoffToAnotherCard);
      }}
      onFocus={() => {
        if (isTransitioning) {
          return;
        }

        if (!isAvailable && interactionMode === 'HOVER_MODE' && !isMobile) {
          onUnavailableActiveChange(card.id, true);
        }
      }}
      onBlur={(event) => {
        if (isTransitioning) {
          return;
        }

        if (!isAvailable && interactionMode === 'HOVER_MODE' && !isMobile) {
          const next = event.relatedTarget as Node | null;
          if (!event.currentTarget.contains(next)) {
            onUnavailableActiveChange(card.id, false);
          }
        }
      }}
      style={combinedWrapperStyle}
    >
      <div
        role={isAvailable ? 'button' : 'group'}
        aria-disabled={ariaDisabled}
        aria-expanded={isAvailable ? showExpanded : undefined}
        tabIndex={tabIndex}
        className={[
          styles.shell,
          isAvailable ? styles.available : styles.unavailable,
          shouldDisableByHoverLock ? styles.disabledByLock : '',
          (showExpanded || keepDesktopExpandedLayer) && !isMobile ? styles.expandedDesktop : '',
          keepDesktopExpandedLayer && !showExpanded && !isMobile ? styles.collapsingDesktop : '',
          showExpanded && isMobile ? styles.expandedMobile : ''
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          ['--origin-x' as string]: transformOriginX,
          ['--motion-duration' as string]: pageState === 'REDUCED_MOTION' ? '180ms' : '280ms',
          ['--full-bleed-duration' as string]: '280ms'
        }}
        onClick={() => {
          if (shouldIgnoreInput || !isAvailable || isLockedNonTarget) {
            return;
          }

          if (shouldExpandOnClick && !showExpanded) {
            onExpand(card.id);
          }
        }}
        onKeyDown={(event) => {
          if (!isAvailable || shouldIgnoreInput) {
            return;
          }

          if (isLockedNonTarget && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            return;
          }

          if ((event.key === 'Enter' || event.key === ' ') && !showExpanded) {
            event.preventDefault();
            onExpand(card.id);
          }

          if (event.key === 'Escape' && showExpanded) {
            event.preventDefault();
            onCollapse(card.id);
          }
        }}
      >
        <div
          className={[
            styles.titleRow,
            showExpanded ? styles.titleRowExpanded : '',
            showExpanded && isMobile ? styles.mobileStickyHeader : ''
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <h3 className={styles.title}>{card.cardTitle}</h3>
          {showExpanded && isMobile ? (
            <button
              type="button"
              className={styles.closeButton}
              onClick={(event) => {
                event.stopPropagation();
                onCollapse(card.id);
              }}
              aria-label={t('common.close')}
            >
              X
            </button>
          ) : null}
        </div>

        <div className={styles.contentStack}>
          <div
            className={`${styles.frontContent} ${showExpanded ? styles.frontContentCollapsed : styles.frontContentOpen}`}
            aria-hidden={showExpanded}
          >
            <p className={styles.subtitle}>{card.cardSubtitle}</p>
            <Image
              src={card.thumbnailOrIcon}
              alt=""
              className={styles.thumbnail}
              width={1200}
              height={200}
              unoptimized
            />
            <div className={styles.tags}>
              {card.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div
            ref={expandedBlockRef}
            className={[
              styles.expandedBlock,
              showExpanded ? styles.expandedBlockOpen : styles.expandedBlockClosed,
              isMobile ? styles.expandedBodyMobile : ''
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden={!showExpanded}
            style={isMobile && mobileExpandedMaxHeight !== null ? {maxHeight: `${mobileExpandedMaxHeight}px`} : undefined}
          >
            {card.type === 'test' ? (
              <>
                <div className={styles.detailItem}>
                  <p className={styles.previewQuestion}>{card.previewQuestion}</p>
                </div>
                <div className={styles.detailItem}>
                  <div className={styles.answerButtons}>
                    <button
                      type="button"
                      className={styles.answerButton}
                      tabIndex={expandedControlTabIndex}
                      disabled={!showExpanded}
                      onClick={(event) => {
                        event.stopPropagation();
                        onTriggerTestChoice(card, 'A');
                      }}
                    >
                      {card.answerChoiceA}
                    </button>
                    <button
                      type="button"
                      className={styles.answerButton}
                      tabIndex={expandedControlTabIndex}
                      disabled={!showExpanded}
                      onClick={(event) => {
                        event.stopPropagation();
                        onTriggerTestChoice(card, 'B');
                      }}
                    >
                      {card.answerChoiceB}
                    </button>
                  </div>
                </div>
                <div className={styles.detailItem}>
                  <div className={styles.metaRow}>
                    <div className={styles.metaItem}>
                      <p className={styles.metaLabel}>{t('landing.testEstimated')}</p>
                      <p className={styles.metaValue}>{card.meta.estimatedMinutes} {t('common.minutes')}</p>
                    </div>
                    <div className={styles.metaItem}>
                      <p className={styles.metaLabel}>{t('landing.testShares')}</p>
                      <p className={styles.metaValue}>{card.meta.shares}</p>
                    </div>
                    <div className={styles.metaItem}>
                      <p className={styles.metaLabel}>{t('landing.testRuns')}</p>
                      <p className={styles.metaValue}>{card.meta.totalRuns}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className={styles.detailItem}>
                  <p className={styles.summary}>{card.summary}</p>
                </div>
                <div className={styles.detailItem}>
                  <div className={styles.metaRow}>
                    <div className={styles.metaItem}>
                      <p className={styles.metaLabel}>{t('landing.blogRead')}</p>
                      <p className={styles.metaValue}>{card.meta.readMinutes} {t('common.minutes')}</p>
                    </div>
                    <div className={styles.metaItem}>
                      <p className={styles.metaLabel}>{t('landing.blogShares')}</p>
                      <p className={styles.metaValue}>{card.meta.shares}</p>
                    </div>
                    <div className={styles.metaItem}>
                      <p className={styles.metaLabel}>{t('landing.blogViews')}</p>
                      <p className={styles.metaValue}>{card.meta.views}</p>
                    </div>
                  </div>
                </div>
                <div className={styles.detailItem}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    tabIndex={expandedControlTabIndex}
                    disabled={!showExpanded}
                    onClick={(event) => {
                      event.stopPropagation();
                      onTriggerBlogReadMore(card);
                    }}
                  >
                    {t(card.primaryCTAKey)}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {showUnavailableOverlay ? <div className={styles.overlay}>{t('common.comingSoon')}</div> : null}
      </div>
    </article>
  );
}

export const CatalogCardView = memo(CatalogCardComponent);
