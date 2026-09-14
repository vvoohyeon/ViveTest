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

export interface LandingGridCardProps {
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
  onCardKeyDown?: KeyboardEventHandler<HTMLElement>;
  onCardBlur?: FocusEventHandler<HTMLElement>;
  onFocus?: FocusEventHandler<HTMLElement>;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
  onClick?: MouseEventHandler<HTMLElement>;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  onExpandedBodyKeyDown?: KeyboardEventHandler<HTMLElement>;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
  onMobileClose?: MouseEventHandler<HTMLButtonElement>;
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
