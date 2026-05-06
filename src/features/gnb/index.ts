export {SiteGnb} from '@/features/gnb/site-gnb';
export type {GnbContext, MobileMenuState, ThemePreference} from '@/features/gnb/types';
export {SettingsControls} from '@/features/gnb/components';
export {useGnbKeyboardModeTracker} from '@/features/gnb/hooks/use-keyboard-mode-tracker';
export {useGnbCapability, useThemePreference} from '@/features/gnb/hooks';
export {
  DESKTOP_SETTINGS_HOVER_CLOSE_DELAY_MS,
  DESKTOP_SETTINGS_HOVER_MIN_WIDTH,
  MOBILE_BREAKPOINT_MAX,
  MOBILE_MENU_CLOSE_DURATION_MS,
  MOBILE_MENU_SCROLL_CANCEL_THRESHOLD_PX,
  MOBILE_TEST_BACK_FALLBACK_TIMEOUT_MS,
  shouldCancelOutsideCloseAsScroll,
  shouldOpenDesktopSettingsByHover,
  shouldUseHistoryBack
} from '@/features/gnb/behavior';
