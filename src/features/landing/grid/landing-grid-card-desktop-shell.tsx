import type {CSSProperties, KeyboardEventHandler, MouseEvent} from 'react';

import type {AppLocale} from '@/config/site';
import type {LandingCardDesktopShellPhase} from '@/features/landing/grid/desktop-shell-phase';
import type {LandingCardTitleSplit} from '@/features/landing/grid/landing-card-title-continuity';
import type {LandingCardCopy} from '@/features/landing/grid/landing-card-contract';
import {
  joinClassNames,
  LANDING_GRID_CARD_EXPANDED_CLASSNAME,
  LANDING_GRID_CARD_EXPANDED_CONTEXT_CLASSNAME,
  LANDING_GRID_CARD_EXPANDED_LAYER_CLASSNAME,
  LANDING_GRID_CARD_EXPANDED_SHADOW_CLASSNAME,
  LANDING_GRID_CARD_EXPANDED_SHELL_CLASSNAME,
  LANDING_GRID_CARD_EXPANDED_SHELL_FRAME_CLASSNAME,
  LANDING_GRID_CARD_EXPANDED_SURFACE_CLASSNAME
} from '@/features/landing/grid/landing-grid-card-classnames';
import {ExpandedCardBody} from '@/features/landing/grid/landing-grid-card-expanded-body';
import {CONSENT_BANNER_AVOID_ATTRIBUTE} from '@/features/landing/shell/consent-banner';
import type {LandingCard} from '@/features/variant-registry';
import styles from '@/features/landing/grid/landing-grid-card.module.css';

// 데스크톱 오버레이 셸 — 확장이 제자리에서 떠오르는 층 전체와 그 안의 확장 제목.
// 래퍼 깊이와 slot 이름이 CSS·QA 기하 계약이므로 구조를 평평하게 만들지 않는다.

type LandingTestCard = Extract<LandingCard, {type: 'test'}>;

export interface DesktopExpandedShellProps {
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

export function DesktopExpandedShell({
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
      aria-hidden={isInteractive ? undefined : 'true'}
    >
      {/* Desktop shell wrapper depth and slot names are CSS/QA geometry contracts. */}
      {isVisible ? (
        <div className={LANDING_GRID_CARD_EXPANDED_LAYER_CLASSNAME} data-slot="expandedLayer">
          {/* 확장 카드가 실제로 그리는 상자다 — 동의 배너가 이 사각형을 피한다. */}
          <div
            className={joinClassNames(LANDING_GRID_CARD_EXPANDED_SHELL_FRAME_CLASSNAME, styles.expandedShellFrame)}
            {...{[CONSENT_BANNER_AVOID_ATTRIBUTE]: ''}}
          >
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
                      LANDING_GRID_CARD_EXPANDED_CONTEXT_CLASSNAME,
                      'landing-grid-card-expanded-title m-0 grid min-w-0 gap-0'
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
