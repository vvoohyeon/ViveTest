export const MOBILE_BREAKPOINT_MAX = 767;
export const DESKTOP_SETTINGS_HOVER_MIN_WIDTH = 1024;
export const DESKTOP_SETTINGS_HOVER_CLOSE_DELAY_MS = 140;
export const MOBILE_MENU_CLOSE_DURATION_MS = 180;
export const MOBILE_MENU_SCROLL_CANCEL_THRESHOLD_PX = 10;

export function shouldOpenDesktopSettingsByHover(input: {
  viewportWidth: number;
  hoverCapable: boolean;
}): boolean {
  return input.viewportWidth >= DESKTOP_SETTINGS_HOVER_MIN_WIDTH && input.hoverCapable;
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
