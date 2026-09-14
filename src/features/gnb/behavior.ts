import {MOBILE_MAX_VIEWPORT_WIDTH} from '@/features/landing/grid/layout-plan';

/**
 * 데스크톱 설정 pill 이 **존재하는** 폭 경계. `site-gnb` 의 데스크톱 GNB 가 `md:`(768px)부터
 * 렌더되므로 그 경계와 같아야 한다.
 *
 * 종전 값은 `1024` 였고, 그래서 hover 가능한 768~1023px 창에서 **pill 은 보이는데 hover 가
 * 아무 일도 하지 않는** 죽은 어포던스가 났다. 폭이 입력을 대리하던 자리다 — pill 이
 * 있는가는 공간이 정하고, hover 로 열리는가는 입력이 정한다(BQ-40).
 */
export const DESKTOP_SETTINGS_PILL_MIN_WIDTH = MOBILE_MAX_VIEWPORT_WIDTH + 1;
export const DESKTOP_SETTINGS_HOVER_CLOSE_DELAY_MS = 140;
export const MOBILE_MENU_CLOSE_DURATION_MS = 180;
export const MOBILE_TEST_BACK_FALLBACK_TIMEOUT_MS = 220;
export const MOBILE_MENU_SCROLL_CANCEL_THRESHOLD_PX = 10;

export function shouldOpenDesktopSettingsByHover(input: {
  viewportWidth: number;
  hoverCapable: boolean;
}): boolean {
  // 폭은 「pill 이 거기 있는가」만 답하고, 「hover 로 열리는가」는 입력이 답한다.
  return input.viewportWidth >= DESKTOP_SETTINGS_PILL_MIN_WIDTH && input.hoverCapable;
}

export function shouldCancelOutsideCloseAsScroll(input: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thresholdPx?: number;
}): boolean {
  const threshold = input.thresholdPx ?? MOBILE_MENU_SCROLL_CANCEL_THRESHOLD_PX;
  const dx = Math.abs(input.endX - input.startX);
  const dy = Math.abs(input.endY - input.startY);

  return dx > threshold || dy > threshold;
}

export function shouldUseHistoryBack(input: {
  historyLength: number;
  referrer: string;
  currentOrigin: string;
}): boolean {
  if (input.historyLength <= 1 || input.referrer.length === 0) {
    return false;
  }

  try {
    return new URL(input.referrer).origin === input.currentOrigin;
  } catch {
    return false;
  }
}
