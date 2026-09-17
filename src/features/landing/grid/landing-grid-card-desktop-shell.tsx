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
import {LANDING_OVERLAY_VIEWPORT_INSET_PX} from '@/features/landing/grid/layout-plan';
import hiddenControlStyles from '@/features/ui/visually-hidden.module.css';
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
  /** 마지막 탭 스톱의 숨은 닫기. 보조기술은 「빈 곳」을 탭할 수 없다(설계 명세 규칙 3). */
  onOverlayClose?: () => void;
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
  onOverlayClose,
  onExpandedBodyKeyDown,
  onAnswerChoiceSelect
}: DesktopExpandedShellProps) {
  const overlayMaxHeight = `calc(100dvh - ${LANDING_OVERLAY_VIEWPORT_INSET_PX}px)`;
  // 바닥을 상한으로 자른다. CSS 에서 `min-height` 는 `max-height` 를 이기므로, 자르지 않으면
  // 짧은 뷰포트(가로 폰 390px)에서 바닥이 상한을 넘겨 상한이 무위가 된다.
  const floorStyle =
    typeof floorPx === 'number' && Number.isFinite(floorPx) && floorPx > 0
      ? ({
          minHeight: `min(${floorPx}px, ${overlayMaxHeight})`
        } as CSSProperties)
      : undefined;

  return (
    <div
      className={stageClassName}
      data-testid="landing-grid-card-desktop-stage"
      data-slot="desktopStage"
      data-phase={phase}
      aria-hidden={isInteractive ? undefined : 'true'}
      style={{'--landing-overlay-max-height': overlayMaxHeight} as CSSProperties}
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
                  {/* 보이는 X 를 두지 않는다 — 카드 밖이 곧 닫기 영역이므로 중복이다. 대신
                      **시각적으로 숨긴** 닫기를 마지막 탭 스톱에 둔다: 스크린리더 사용자에게는
                      「빈 곳」이 없고, `Escape` 말고 닫을 길이 있어야 한다(설계 명세 규칙 3). */}
                  {isInteractive ? (
                    <button
                      type="button"
                      className={hiddenControlStyles.hiddenControl}
                      data-slot="overlayHiddenClose"
                      onClick={onOverlayClose}
                    >
                      {copy.closeExpandedAria}
                    </button>
                  ) : null}
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
