import type {
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEvent,
  MouseEventHandler
} from 'react';

import type {AppLocale} from '@/config/site';
import type {
  LandingCardDesktopMotionRole,
  LandingCardDesktopShellPhase
} from '@/features/landing/grid/desktop-shell-phase';
import type {LandingCardVisualState} from '@/features/landing/model/interaction-selectors';
import type {LandingCard} from '@/features/variant-registry';

// 카드의 공개 계약 — 타입과 기본 copy 만 산다. 렌더 코드는 여기 오지 않는다.
//
// 이 파일이 따로 있는 이유는 의존 방향이다. 훅 9 종(`use-landing-interaction-controller` ·
// `use-hover-intent-controller` · `use-keyboard-handoff` · `use-card-keyboard-handler` ·
// `use-grid-geometry-controller` · `use-mobile-card-lifecycle` · `use-mobile-backdrop-gesture` ·
// `use-mobile-scroll-lock` · `landing-card-interaction-bindings`)이 카드에서 **타입만** 가져가는데,
// 그 타입이 1,300 행짜리 컴포넌트 파일에 살면 훅 → 컴포넌트 간선이 그대로 남는다.
// `landing-grid-card.tsx` 가 이 파일을 재수출하므로 기존 import 경로는 한 줄도 바뀌지 않는다.

export type {LandingCardVisualState} from '@/features/landing/model/interaction-selectors';
export type LandingCardInteractionMode = 'hover' | 'tap';
export type LandingCardViewportTier = 'mobile' | 'tablet' | 'desktop';
/**
 * 폰의 확장 위상. 이름은 계약 표면(`data-mobile-phase`)이라 유지하되, 값을 만드는 것은 이제
 * 바텀시트다(`mobile-lifecycle.ts`). transient 셸 모드와 스냅샷 뷰가 여기 있었으나 둘 다
 * in-flow 확장에만 있던 사정이라 시트와 함께 사라졌다 — 시트는 형제를 밀지 않으므로 되돌릴
 * 좌표가 없고, 모션 전용 표면을 따로 띄울 이유도 없다.
 */
export type LandingCardMobilePhase = 'NORMAL' | 'OPENING' | 'OPEN' | 'CLOSING';

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

export interface LandingGridCardProps {
  card: LandingCard;
  hasAssetMedia?: boolean;
  locale: AppLocale;
  state?: LandingCardVisualState;
  interactionMode?: LandingCardInteractionMode;
  viewportTier?: LandingCardViewportTier;
  mobilePhase?: LandingCardMobilePhase;
  desktopMotionRole?: LandingCardDesktopMotionRole;
  desktopShellPhase?: LandingCardDesktopShellPhase;
  reducedMotion?: boolean;
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
  onCardKeyDown?: KeyboardEventHandler<HTMLElement>;
  onCardBlur?: FocusEventHandler<HTMLElement>;
  onFocus?: FocusEventHandler<HTMLElement>;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
  onClick?: MouseEventHandler<HTMLElement>;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  onExpandedBodyKeyDown?: KeyboardEventHandler<HTMLElement>;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
  /** 제자리 오버레이의 숨은 닫기(마지막 탭 스톱). 폰 시트의 닫기는 시트가 갖는다. */
  onOverlayClose?: () => void;
}

export function getDefaultCardCopy(): LandingCardCopy {
  return {
    comingSoon: 'coming soon',
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
