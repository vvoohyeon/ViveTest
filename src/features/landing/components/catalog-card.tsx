'use client';

import {memo, useRef} from 'react';
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
  isMobile: boolean;
  transformOriginX: '0%' | '50%' | '100%';
  holdNormalHeightPx?: number;
  onExpand: (cardId: string) => void;
  onCollapse: (cardId: string) => void;
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
  isMobile,
  transformOriginX,
  holdNormalHeightPx,
  onExpand,
  onCollapse,
  onUnavailableActiveChange,
  onTriggerTestChoice,
  onTriggerBlogReadMore,
  onRegisterElement
}: CatalogCardProps) {
  const t = useTranslations();
  const hoverDelayTimerRef = useRef<number | null>(null);

  const isAvailable = card.availability === 'available';
  const isHoverMode = interactionMode === 'HOVER_MODE';
  const canInteract = pageState === 'ACTIVE' || pageState === 'REDUCED_MOTION';
  const shouldExpandOnClick = isAvailable && interactionMode === 'TAP_MODE';

  const triggerHoverExpand = () => {
    if (!canInteract || !isHoverMode || !isAvailable || isMobile) {
      return;
    }

    if (hoverDelayTimerRef.current) {
      window.clearTimeout(hoverDelayTimerRef.current);
    }

    hoverDelayTimerRef.current = window.setTimeout(() => {
      onExpand(card.id);
    }, 150);
  };

  const clearHoverTimer = () => {
    if (hoverDelayTimerRef.current) {
      window.clearTimeout(hoverDelayTimerRef.current);
      hoverDelayTimerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    clearHoverTimer();

    if (!isHoverMode || isMobile) {
      return;
    }

    if (isAvailable && isExpanded) {
      onCollapse(card.id);
    }

    if (!isAvailable) {
      onUnavailableActiveChange(card.id, false);
    }
  };

  const handleMouseEnterUnavailable = () => {
    if (!canInteract || isAvailable || isMobile || interactionMode !== 'HOVER_MODE') {
      return;
    }

    clearHoverTimer();
    hoverDelayTimerRef.current = window.setTimeout(() => {
      onUnavailableActiveChange(card.id, true);
    }, 150);
  };

  const tabIndex = shouldDisableByHoverLock ? -1 : 0;
  const showExpanded = isExpanded && isAvailable;
  const frontTitleClass = `${styles.title} ${styles.titleClamp}`;

  return (
    <article
      className={styles.wrapper}
      ref={(element) => onRegisterElement(card.id, element)}
      onMouseEnter={isAvailable ? triggerHoverExpand : handleMouseEnterUnavailable}
      onMouseLeave={handleMouseLeave}
      onFocus={() => {
        if (!isAvailable && interactionMode === 'HOVER_MODE' && !isMobile) {
          onUnavailableActiveChange(card.id, true);
        }
      }}
      onBlur={(event) => {
        if (!isAvailable && interactionMode === 'HOVER_MODE' && !isMobile) {
          const next = event.relatedTarget as Node | null;
          if (!event.currentTarget.contains(next)) {
            onUnavailableActiveChange(card.id, false);
          }
        }
      }}
      style={holdNormalHeightPx && !showExpanded && !isMobile ? {height: `${holdNormalHeightPx}px`} : undefined}
    >
      <div
        role={isAvailable ? 'button' : 'group'}
        aria-disabled={!isAvailable}
        aria-expanded={isAvailable ? showExpanded : undefined}
        tabIndex={tabIndex}
        className={[
          styles.shell,
          isAvailable ? styles.available : styles.unavailable,
          shouldDisableByHoverLock ? styles.disabledByLock : '',
          showExpanded && !isMobile ? styles.expandedDesktop : '',
          showExpanded && isMobile ? styles.expandedMobile : ''
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          ['--origin-x' as string]: transformOriginX,
          ['--motion-duration' as string]: pageState === 'REDUCED_MOTION' ? '180ms' : '220ms'
        }}
        onClick={() => {
          if (!canInteract || !isAvailable) {
            return;
          }

          if (shouldExpandOnClick && !showExpanded) {
            onExpand(card.id);
          }
        }}
        onKeyDown={(event) => {
          if (!isAvailable || !canInteract) {
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
        <div className={`${styles.titleRow} ${showExpanded && isMobile ? styles.mobileStickyHeader : ''}`}>
          <h3 className={showExpanded && isMobile ? frontTitleClass : styles.title}>{card.cardTitle}</h3>
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

        {showExpanded ? (
          <div className={styles.expandedBlock}>
            {card.type === 'test' ? (
              <>
                <p className={styles.previewQuestion}>{card.previewQuestion}</p>
                <div className={styles.answerButtons}>
                  <button
                    type="button"
                    className={styles.answerButton}
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
                    onClick={(event) => {
                      event.stopPropagation();
                      onTriggerTestChoice(card, 'B');
                    }}
                  >
                    {card.answerChoiceB}
                  </button>
                </div>
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
              </>
            ) : (
              <>
                <p className={styles.summary}>{card.summary}</p>
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
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    onTriggerBlogReadMore(card);
                  }}
                >
                  {t(card.primaryCTAKey)}
                </button>
              </>
            )}
          </div>
        ) : (
          <>
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
          </>
        )}

        {showUnavailableOverlay ? <div className={styles.overlay}>{t('common.comingSoon')}</div> : null}
      </div>
    </article>
  );
}

export const CatalogCardView = memo(CatalogCardComponent);
