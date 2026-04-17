'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react';

import type {AppLocale} from '@/config/site';
import {SettingsControls} from '@/features/landing/gnb/components/settings-controls';
import {ThemeModeIcon} from '@/features/landing/gnb/components/theme-mode-icon';
import {
  DESKTOP_SETTINGS_HOVER_CLOSE_DELAY_MS,
  MOBILE_MENU_CLOSE_DURATION_MS,
  shouldCancelOutsideCloseAsScroll,
  shouldOpenDesktopSettingsByHover,
  shouldUseHistoryBack
} from '@/features/landing/gnb/behavior';
import {useGnbCapability} from '@/features/landing/gnb/hooks/use-gnb-capability';
import {getTransitionOrigin} from '@/features/landing/gnb/hooks/theme-transition';
import {useThemePreference} from '@/features/landing/gnb/hooks/use-theme-preference';
import type {GnbContext, MobileMenuState} from '@/features/landing/gnb/types';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder, type LocaleFreeRoute} from '@/lib/routes/route-builder';

const MOBILE_TEST_BACK_FALLBACK_TIMEOUT_MS = 220;
const CURRENT_PATH_STORAGE_KEY = 'vivetest-current-path';
const PREVIOUS_PATH_STORAGE_KEY = 'vivetest-previous-path';

type CloseReason = 'button' | 'outside' | 'escape';

interface SiteGnbProps {
  locale: AppLocale;
  context: GnbContext;
  currentRoute: LocaleFreeRoute;
}

interface OutsideGesture {
  active: boolean;
  startX: number;
  startY: number;
}

type LandingKeyboardEntryMode = 'card-first' | 'gnb';

const gnbShellClassName =
  'gnb-shell sticky top-0 z-[1100] bg-[var(--surface)] [backdrop-filter:blur(12px)] [-webkit-backdrop-filter:blur(12px)] data-[elevated=true]:shadow-[var(--surface-shadow)] data-[elevated=false]:border-b data-[elevated=false]:border-[var(--surface-divider)]';
const gnbInnerClassName = 'gnb-inner mx-auto flex max-w-[1280px] items-center px-4 md:px-6 min-[768px]:max-[899px]:px-5';
const gnbDesktopInnerClassName = `${gnbInnerClassName} gnb-desktop hidden h-16 md:flex`;
const gnbMobileInnerClassName = `${gnbInnerClassName} gnb-mobile flex h-14 md:hidden`;
const gnbLeadingColumnClassName = 'gnb-column gnb-column-leading flex min-w-0 flex-1 items-center justify-start';
const gnbCenterColumnClassName = 'gnb-column gnb-column-center flex min-w-0 flex-1 items-center justify-center';
const gnbTrailingColumnClassName = 'gnb-column gnb-column-trailing flex min-w-0 flex-1 items-center justify-end';
const gnbBrandLinkClassName = 'gnb-ci-link text-base font-bold tracking-[0.02em]';
const gnbDesktopLinksClassName = 'gnb-desktop-links flex items-center gap-4';
const gnbDesktopLinkClassName =
  'text-[0.96rem] text-[var(--muted-ink)] [transition-duration:140ms] [transition-property:color] [transition-timing-function:ease] hover:text-[var(--link-ink)]';
const gnbInteractiveButtonBaseClassName =
  'inline-flex cursor-pointer items-center justify-center rounded-full border border-[var(--interactive-neutral-border)] bg-[var(--interactive-neutral-bg)] px-3 py-[7px] text-[0.88rem] font-semibold text-[var(--interactive-neutral-ink)] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color] [transition-timing-function:ease] hover:border-[var(--interactive-neutral-border-strong)] hover:bg-[var(--interactive-neutral-bg-hover)] active:bg-[var(--interactive-neutral-bg-pressed)] focus-visible:outline-none focus-visible:[box-shadow:0_0_0_2px_var(--focus-ring-inner),0_0_0_4px_var(--focus-ring-outer)]';
const gnbSettingsRootClassName =
  'gnb-settings-root relative flex items-stretch [--gnb-settings-trigger-size:40px] [--gnb-settings-trigger-icon-size:18px] [--gnb-settings-panel-base-width:324px] [--gnb-settings-panel-extra-top:12px] [--gnb-settings-panel-inner-left:15px] [--gnb-settings-panel-extra-right:var(--gnb-settings-panel-inner-left)] [--gnb-settings-panel-inner-bottom:15px]';
const gnbSettingsTriggerClassName =
  `${gnbInteractiveButtonBaseClassName} gnb-settings-trigger h-[var(--gnb-settings-trigger-size)] w-[var(--gnb-settings-trigger-size)] shrink-0 !p-0`;
const gnbSettingsTriggerIconClassName =
  'gnb-settings-trigger-icon h-[var(--gnb-settings-trigger-icon-size)] w-[var(--gnb-settings-trigger-icon-size)] shrink-0';
const gnbSettingsPanelClassName =
  "gnb-settings-panel absolute z-[1] grid isolate rounded-b-[12px] top-[calc(var(--gnb-settings-panel-extra-top)*-1)] right-[calc(var(--gnb-settings-panel-extra-right)*-1)] [width:min(calc(var(--gnb-settings-panel-base-width)_+_var(--gnb-settings-panel-extra-right)),calc(100vw_-_24px_+_var(--gnb-settings-panel-extra-right)))] [grid-template-columns:minmax(0,1fr)_var(--gnb-settings-panel-extra-right)] [grid-template-rows:var(--gnb-settings-panel-extra-top)_auto] before:pointer-events-none before:absolute before:z-0 before:content-[''] before:[inset:-1px_0_0_0] before:rounded-[inherit] before:bg-[var(--panel-solid)] after:pointer-events-none after:absolute after:z-0 after:content-[''] after:inset-0 after:rounded-[inherit] after:[border-right:1px_solid_var(--surface-divider)] after:[border-bottom:1px_solid_var(--surface-divider)] after:[border-left:1px_solid_var(--surface-divider)] after:shadow-[var(--panel-shadow)]";
const gnbBackButtonClassName = `${gnbInteractiveButtonBaseClassName} gnb-back-button`;
const gnbMenuTriggerClassName = `${gnbInteractiveButtonBaseClassName} gnb-menu-trigger`;
const gnbDesktopTimerClassName = 'gnb-desktop-timer m-0 font-semibold tabular-nums text-[var(--muted-ink)]';
const gnbMobileTimerClassName = 'gnb-mobile-timer m-0 font-semibold tabular-nums text-[var(--muted-ink)]';
const gnbMobileLayerClassName = 'gnb-mobile-layer fixed inset-0 z-[1200]';
const gnbMobileBackdropClassName =
  'gnb-mobile-backdrop absolute inset-0 bg-[var(--overlay-scrim-strong)] [transition:opacity_180ms_ease] data-[state=closing]:opacity-0';
const gnbMobilePanelClassName =
  'gnb-mobile-panel absolute right-0 top-0 flex h-screen max-h-screen w-[min(87vw,340px)] flex-col gap-5 overflow-y-auto border-l border-[var(--surface-divider)] bg-[var(--panel-solid)] px-4 pt-[72px] pb-[calc(32px+env(safe-area-inset-bottom,0px))] opacity-100 shadow-[var(--sheet-shadow)] overscroll-contain [height:100dvh] [max-height:100dvh] [-webkit-overflow-scrolling:touch] [transform:translateX(0)] [transition:transform_180ms_ease,opacity_180ms_ease] data-[state=closing]:translate-x-[12px] data-[state=closing]:opacity-0';
const gnbMobileLinksClassName = 'gnb-mobile-links grid gap-[14px]';
const gnbMobileLinkClassName = 'text-base font-semibold';
const gnbMobileSettingsClassName = 'gnb-mobile-settings mt-auto grid gap-3';

function isVisibleFocusableElement(element: HTMLElement | null): element is HTMLElement {
  if (!element || element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  if ('disabled' in element && (element as HTMLButtonElement).disabled) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

export function SiteGnb({locale, context, currentRoute}: SiteGnbProps) {
  const t = useTranslations('gnb');
  const router = useRouter();
  const pathname = usePathname();
  const {viewportWidth, hoverCapable, elevated} = useGnbCapability();
  const {resolvedTheme, applyTheme} = useThemePreference();
  const settingsPanelId = useId();
  const mobileMenuPanelId = useId();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuState, setMobileMenuState] = useState<MobileMenuState>('closed');
  const [landingKeyboardEntryMode, setLandingKeyboardEntryMode] = useState<LandingKeyboardEntryMode>(
    context === 'landing' ? 'card-first' : 'gnb'
  );

  const gnbShellRef = useRef<HTMLElement | null>(null);
  const settingsRootRef = useRef<HTMLDivElement | null>(null);
  const settingsHoverCloseTimerRef = useRef<number | null>(null);

  const mobileMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuCloseTimerRef = useRef<number | null>(null);
  const mobileMenuCloseReasonRef = useRef<CloseReason | null>(null);
  const mobileBackFallbackTimerRef = useRef<number | null>(null);
  const previousInternalPathRef = useRef<string | null>(null);
  const outsideGestureRef = useRef<OutsideGesture>({
    active: false,
    startX: 0,
    startY: 0
  });

  const homeHref = useMemo(() => buildLocalizedPath(RouteBuilder.landing(), locale), [locale]);
  const blogHref = useMemo(() => buildLocalizedPath(RouteBuilder.blog(), locale), [locale]);
  const historyHref = useMemo(() => buildLocalizedPath(RouteBuilder.history(), locale), [locale]);

  const isLandingContext = context === 'landing';
  const mobileMenuEnabled = context !== 'test';
  const hoverOpenEnabled = shouldOpenDesktopSettingsByHover({
    viewportWidth,
    hoverCapable
  });
  const canOpenDesktopSettingsByHover = () => {
    if (hoverOpenEnabled) {
      return true;
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }

    return shouldOpenDesktopSettingsByHover({
      viewportWidth: window.innerWidth,
      hoverCapable: window.matchMedia('(hover: hover) and (pointer: fine)').matches
    });
  };

  const shouldDeferLandingGnbEntry = isLandingContext && !settingsOpen && mobileMenuState === 'closed';
  const desktopLandingTabIndex =
    shouldDeferLandingGnbEntry && landingKeyboardEntryMode === 'card-first' ? -1 : undefined;
  const mobileLandingTabIndex =
    shouldDeferLandingGnbEntry && landingKeyboardEntryMode === 'card-first' ? -1 : undefined;

  const isWithinInteractiveGnb = useCallback(
    (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        return false;
      }

      const mobilePanel = document.getElementById(mobileMenuPanelId);
      const interactiveTarget = target.closest<HTMLElement>(
        'a[href], button, [data-testid="gnb-settings-panel"], [data-testid="gnb-mobile-menu-panel"]'
      );
      if (!interactiveTarget) {
        return false;
      }

      return !!gnbShellRef.current?.contains(interactiveTarget) || !!mobilePanel?.contains(interactiveTarget);
    },
    [mobileMenuPanelId]
  );

  const getOrderedKeyboardTargets = useCallback((): HTMLElement[] => {
    if (typeof document === 'undefined') {
      return [];
    }

    const desktopContainer = document.querySelector<HTMLElement>('.gnb-desktop');
    const mobileContainer = document.querySelector<HTMLElement>('.gnb-mobile');
    const settingsPanel = document.getElementById(settingsPanelId);
    const mobilePanel = document.getElementById(mobileMenuPanelId);

    const getTopLevelTargets = (container: HTMLElement | null, excludedRoot: HTMLElement | null) => {
      if (!isVisibleFocusableElement(container)) {
        return [];
      }

      return Array.from(container.querySelectorAll<HTMLElement>('a[href], button')).filter((element) => {
        if (!isVisibleFocusableElement(element)) {
          return false;
        }

        return !excludedRoot || !excludedRoot.contains(element);
      });
    };

    const getPanelTargets = (panel: HTMLElement | null) => {
      if (!isVisibleFocusableElement(panel)) {
        return [];
      }

      return Array.from(panel.querySelectorAll<HTMLElement>('a[href], button')).filter((element) =>
        isVisibleFocusableElement(element)
      );
    };

    const desktopTargets = getTopLevelTargets(desktopContainer, settingsPanel);
    if (desktopTargets.length > 0) {
      return settingsOpen ? [...desktopTargets, ...getPanelTargets(settingsPanel)] : desktopTargets;
    }

    const mobileTargets = getTopLevelTargets(mobileContainer, mobilePanel);
    if (mobileTargets.length === 0) {
      return [];
    }

    if (mobileMenuState !== 'closed') {
      const trigger = mobileMenuTriggerRef.current;
      const orderedTargets = [
        ...(isVisibleFocusableElement(trigger) ? [trigger] : []),
        ...getPanelTargets(mobilePanel)
      ];
      return orderedTargets;
    }

    return mobileTargets;
  }, [mobileMenuPanelId, mobileMenuState, settingsOpen, settingsPanelId]);

  const focusFirstLandingCardTrigger = useCallback(() => {
    if (typeof document === 'undefined') {
      return false;
    }

    const trigger = document.querySelector<HTMLElement>(
      '[data-testid="landing-grid-card-trigger"]:not([aria-disabled="true"])'
    );
    if (!isVisibleFocusableElement(trigger)) {
      return false;
    }

    trigger.focus();
    return true;
  }, []);

  const clearSettingsHoverCloseTimer = useCallback(() => {
    if (settingsHoverCloseTimerRef.current !== null) {
      window.clearTimeout(settingsHoverCloseTimerRef.current);
      settingsHoverCloseTimerRef.current = null;
    }
  }, []);

  const closeSettingsImmediate = useCallback(() => {
    clearSettingsHoverCloseTimer();
    setSettingsOpen(false);
  }, [clearSettingsHoverCloseTimer]);

  const routeKeyboardWithinGnb = useCallback(
    (event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey' | 'preventDefault'>) => {
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const targets = getOrderedKeyboardTargets();
      if (targets.length === 0 || !activeElement) {
        return;
      }

      const currentIndex = targets.indexOf(activeElement);
      if (currentIndex === -1) {
        return;
      }

      const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
      if (nextIndex >= 0 && nextIndex < targets.length) {
        event.preventDefault();
        targets[nextIndex]?.focus();
        return;
      }

      if (!event.shiftKey && isLandingContext && focusFirstLandingCardTrigger()) {
        if (settingsOpen) {
          closeSettingsImmediate();
        }
        event.preventDefault();
      }
    },
    [closeSettingsImmediate, focusFirstLandingCardTrigger, getOrderedKeyboardTargets, isLandingContext, settingsOpen]
  );

  const clearMobileMenuCloseTimer = useCallback(() => {
    if (mobileMenuCloseTimerRef.current !== null) {
      window.clearTimeout(mobileMenuCloseTimerRef.current);
      mobileMenuCloseTimerRef.current = null;
    }
  }, []);

  const clearMobileBackFallbackTimer = useCallback(() => {
    if (mobileBackFallbackTimerRef.current !== null) {
      window.clearTimeout(mobileBackFallbackTimerRef.current);
      mobileBackFallbackTimerRef.current = null;
    }
  }, []);

  const completeMobileMenuClose = useCallback(() => {
    mobileMenuCloseReasonRef.current = null;
    setMobileMenuState('closed');
    mobileMenuTriggerRef.current?.focus();
  }, []);

  const requestMobileMenuClose = useCallback(
    (reason: CloseReason) => {
      if (mobileMenuState !== 'open') {
        return;
      }

      mobileMenuCloseReasonRef.current = reason;
      setMobileMenuState('closing');
      clearMobileMenuCloseTimer();
      mobileMenuCloseTimerRef.current = window.setTimeout(() => {
        completeMobileMenuClose();
      }, MOBILE_MENU_CLOSE_DURATION_MS);
    },
    [clearMobileMenuCloseTimer, completeMobileMenuClose, mobileMenuState]
  );

  const cancelMobileMenuCloseFromScroll = useCallback(() => {
    if (mobileMenuState !== 'closing' || mobileMenuCloseReasonRef.current !== 'outside') {
      return;
    }

    clearMobileMenuCloseTimer();
    mobileMenuCloseReasonRef.current = null;
    setMobileMenuState('open');
  }, [clearMobileMenuCloseTimer, mobileMenuState]);

  const handleLocaleChange = useCallback(
    (nextLocale: AppLocale) => {
      if (nextLocale === locale) {
        return;
      }

      closeSettingsImmediate();
      clearMobileMenuCloseTimer();
      setMobileMenuState('closed');
      router.push(buildLocalizedPath(currentRoute, nextLocale));
    },
    [clearMobileMenuCloseTimer, closeSettingsImmediate, currentRoute, locale, router]
  );

  const handleTestBack = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const previousInternalPath = previousInternalPathRef.current;
    const hasInternalPrevious = !!previousInternalPath && previousInternalPath !== pathname;

    if (!hasInternalPrevious || window.history.length <= 1) {
      router.push(homeHref, {scroll: false});
      return;
    }

    const beforePathname = window.location.pathname;
    window.history.back();

    clearMobileBackFallbackTimer();
    mobileBackFallbackTimerRef.current = window.setTimeout(() => {
      if (window.location.pathname === beforePathname) {
        router.push(homeHref, {scroll: false});
      }
    }, MOBILE_TEST_BACK_FALLBACK_TIMEOUT_MS);
  }, [clearMobileBackFallbackTimer, homeHref, pathname, router]);

  const handleStandardBack = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (
      shouldUseHistoryBack({
        historyLength: window.history.length,
        referrer: document.referrer,
        currentOrigin: window.location.origin
      })
    ) {
      window.history.back();
      return;
    }

    router.push(homeHref, {scroll: false});
  }, [homeHref, router]);

  useEffect(() => {
    if (pathname.length === 0) {
      return;
    }

    try {
      const currentStoredPath = window.sessionStorage.getItem(CURRENT_PATH_STORAGE_KEY);
      if (currentStoredPath && currentStoredPath !== pathname) {
        window.sessionStorage.setItem(PREVIOUS_PATH_STORAGE_KEY, currentStoredPath);
      }
      window.sessionStorage.setItem(CURRENT_PATH_STORAGE_KEY, pathname);
      previousInternalPathRef.current = window.sessionStorage.getItem(PREVIOUS_PATH_STORAGE_KEY);
    } catch {
      previousInternalPathRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!settingsRootRef.current?.contains(target)) {
        closeSettingsImmediate();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [closeSettingsImmediate, settingsOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (mobileMenuState === 'open') {
        requestMobileMenuClose('escape');
        return;
      }

      if (settingsOpen) {
        closeSettingsImmediate();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeSettingsImmediate, mobileMenuState, requestMobileMenuClose, settingsOpen]);

  useEffect(() => {
    if (mobileMenuState === 'closed') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [mobileMenuState]);

  useEffect(() => {
    if (!isLandingContext) {
      return;
    }

    const handleFocusIn = (event: FocusEvent) => {
      setLandingKeyboardEntryMode(isWithinInteractiveGnb(event.target) ? 'gnb' : 'card-first');
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isWithinInteractiveGnb(event.target)) {
        setLandingKeyboardEntryMode('card-first');
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isLandingContext, isWithinInteractiveGnb]);

  useEffect(() => {
    const handleKeyboardTabRouting = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const targets = getOrderedKeyboardTargets();
      if (targets.length === 0) {
        return;
      }

      const isDocumentLevelTarget =
        activeElement === document.body || activeElement === document.documentElement || activeElement === null;

      if (isDocumentLevelTarget) {
        if (event.shiftKey) {
          return;
        }

        if (isLandingContext && shouldDeferLandingGnbEntry && landingKeyboardEntryMode === 'card-first') {
          return;
        }

        event.preventDefault();
        targets[0]?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyboardTabRouting, true);
    return () => {
      document.removeEventListener('keydown', handleKeyboardTabRouting, true);
    };
  }, [getOrderedKeyboardTargets, isLandingContext, landingKeyboardEntryMode, shouldDeferLandingGnbEntry]);

  const handleGnbKeyDownCapture = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      routeKeyboardWithinGnb(event);
    },
    [routeKeyboardWithinGnb]
  );

  useEffect(() => {
    return () => {
      clearSettingsHoverCloseTimer();
      clearMobileMenuCloseTimer();
      clearMobileBackFallbackTimer();
    };
  }, [clearMobileBackFallbackTimer, clearMobileMenuCloseTimer, clearSettingsHoverCloseTimer]);

  const desktopSettingsEnter = () => {
    if (!canOpenDesktopSettingsByHover()) {
      return;
    }
    clearSettingsHoverCloseTimer();
    setSettingsOpen(true);
  };

  const desktopSettingsLeave = () => {
    if (!canOpenDesktopSettingsByHover()) {
      return;
    }
    clearSettingsHoverCloseTimer();
    settingsHoverCloseTimerRef.current = window.setTimeout(() => {
      setSettingsOpen(false);
    }, DESKTOP_SETTINGS_HOVER_CLOSE_DELAY_MS);
  };

  const desktopSettingsBlurCapture = () => {
    if (!settingsOpen) {
      return;
    }

    window.requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active instanceof Node && settingsRootRef.current?.contains(active)) {
        return;
      }

      closeSettingsImmediate();
    });
  };

  const mobileMenuBackdropPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (mobileMenuState !== 'open') {
      return;
    }

    outsideGestureRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY
    };

    requestMobileMenuClose('outside');
  };

  const mobileMenuBackdropPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!outsideGestureRef.current.active) {
      return;
    }

    if (
      shouldCancelOutsideCloseAsScroll({
        startX: outsideGestureRef.current.startX,
        startY: outsideGestureRef.current.startY,
        endX: event.clientX,
        endY: event.clientY
      })
    ) {
      outsideGestureRef.current.active = false;
      cancelMobileMenuCloseFromScroll();
    }
  };

  const mobileMenuBackdropPointerEnd = () => {
    outsideGestureRef.current.active = false;
  };

  const settingsLabels = {
    theme: t('theme'),
    light: t('light'),
    dark: t('dark')
  };

  const desktopLeading =
    context === 'test' ? (
      <button
        type="button"
        className={gnbBackButtonClassName}
        onClick={handleTestBack}
        aria-label={t('backAria')}
        data-testid="gnb-desktop-test-back"
      >
        {t('back')}
      </button>
    ) : (
      <Link href={{pathname: homeHref}} className={`${gnbBrandLinkClassName}`} scroll={false} tabIndex={desktopLandingTabIndex}>
        ViveTest
      </Link>
    );

  const desktopCenter =
    context === 'test' ? (
      <p className={gnbDesktopTimerClassName} data-testid="gnb-test-timer">
        {t('timerPlaceholder')}
      </p>
    ) : (
      <nav className={gnbDesktopLinksClassName} aria-label="Primary">
        <Link className={gnbDesktopLinkClassName} href={{pathname: historyHref}} tabIndex={desktopLandingTabIndex}>
          {t('history')}
        </Link>
        <Link className={gnbDesktopLinkClassName} href={{pathname: blogHref}} tabIndex={desktopLandingTabIndex}>
          {t('blog')}
        </Link>
      </nav>
    );

  const desktopTrailing =
    context === 'test' ? null : (
      <div
        ref={settingsRootRef}
        className={gnbSettingsRootClassName}
        onMouseEnter={desktopSettingsEnter}
        onMouseLeave={desktopSettingsLeave}
        onBlurCapture={desktopSettingsBlurCapture}
      >
        <button
          type="button"
          className={gnbSettingsTriggerClassName}
          aria-label={t('settings')}
          title={t('settings')}
          aria-expanded={settingsOpen}
          aria-controls={settingsPanelId}
          data-current-theme={resolvedTheme}
          tabIndex={desktopLandingTabIndex}
          onFocus={() => {
            if (!hoverOpenEnabled) {
              setSettingsOpen(true);
            }
          }}
          onClick={() => {
            setSettingsOpen((previous) => !previous);
          }}
          data-testid="gnb-settings-trigger"
        >
          <ThemeModeIcon theme={resolvedTheme} className={gnbSettingsTriggerIconClassName} />
        </button>
        <div
          id={settingsPanelId}
          role="dialog"
          aria-label={t('settings')}
          className={gnbSettingsPanelClassName}
          data-open={settingsOpen ? 'true' : 'false'}
          hidden={!settingsOpen}
          data-testid="gnb-settings-panel"
        >
          <SettingsControls
            scope="desktop"
            locale={locale}
            resolvedTheme={resolvedTheme}
            labels={settingsLabels}
            onLocaleChange={handleLocaleChange}
            onThemeChange={(theme, sourceEl) => {
              const transitionOrigin = sourceEl ? getTransitionOrigin(sourceEl) : undefined;

              closeSettingsImmediate();
              applyTheme(theme, {transitionOrigin});
            }}
          />
        </div>
      </div>
    );

  return (
    <>
      <header
        ref={gnbShellRef}
        className={gnbShellClassName}
        data-elevated={elevated ? 'true' : 'false'}
        data-gnb-context={context}
        onKeyDownCapture={handleGnbKeyDownCapture}
      >
        <div className={gnbDesktopInnerClassName}>
          <div className={gnbLeadingColumnClassName}>{desktopLeading}</div>
          <div className={gnbCenterColumnClassName}>{desktopCenter}</div>
          <div className={gnbTrailingColumnClassName}>{desktopTrailing}</div>
        </div>

        <div className={gnbMobileInnerClassName}>
          <div className={gnbLeadingColumnClassName}>
            {context === 'landing' ? (
              <Link href={{pathname: homeHref}} className={gnbBrandLinkClassName} scroll={false} tabIndex={mobileLandingTabIndex}>
                ViveTest
              </Link>
            ) : (
              <button
                type="button"
                className={gnbBackButtonClassName}
                onClick={context === 'test' ? handleTestBack : handleStandardBack}
                aria-label={t('backAria')}
                data-testid={context === 'test' ? 'gnb-mobile-test-back' : 'gnb-mobile-back'}
              >
                {t('back')}
              </button>
            )}
          </div>

          <div className={gnbTrailingColumnClassName}>
            {mobileMenuEnabled ? (
              <button
                ref={mobileMenuTriggerRef}
                type="button"
                className={gnbMenuTriggerClassName}
                aria-label={mobileMenuState === 'closed' ? t('menuAria') : t('closeMenuAria')}
                aria-expanded={mobileMenuState !== 'closed'}
                aria-controls={mobileMenuPanelId}
                tabIndex={mobileLandingTabIndex}
                onClick={() => {
                  if (mobileMenuState === 'closed') {
                    setMobileMenuState('open');
                    return;
                  }
                  requestMobileMenuClose('button');
                }}
                data-testid="gnb-mobile-menu-trigger"
              >
                {mobileMenuState === 'closed' ? t('menu') : t('close')}
              </button>
            ) : (
              <p className={gnbMobileTimerClassName} data-testid="gnb-mobile-test-timer">
                {t('timerPlaceholder')}
              </p>
            )}
          </div>
        </div>
      </header>

      {mobileMenuEnabled && mobileMenuState !== 'closed' ? (
        <div className={gnbMobileLayerClassName} data-state={mobileMenuState} data-testid="gnb-mobile-layer">
          <div
            className={gnbMobileBackdropClassName}
            data-testid="gnb-mobile-backdrop"
            data-state={mobileMenuState}
            onPointerDown={mobileMenuBackdropPointerDown}
            onPointerMove={mobileMenuBackdropPointerMove}
            onPointerUp={mobileMenuBackdropPointerEnd}
            onPointerCancel={mobileMenuBackdropPointerEnd}
          />
          <div
            id={mobileMenuPanelId}
            className={gnbMobilePanelClassName}
            role="dialog"
            aria-modal="true"
            aria-label={t('menu')}
            data-state={mobileMenuState}
            data-testid="gnb-mobile-menu-panel"
            onKeyDownCapture={handleGnbKeyDownCapture}
          >
            <nav className={gnbMobileLinksClassName} aria-label="Mobile Primary">
              <Link className={gnbMobileLinkClassName} href={{pathname: homeHref}} scroll={false}>
                {t('home')}
              </Link>
              <Link className={gnbMobileLinkClassName} href={{pathname: historyHref}}>
                {t('history')}
              </Link>
              <Link className={gnbMobileLinkClassName} href={{pathname: blogHref}}>
                {t('blog')}
              </Link>
            </nav>
            <div className={gnbMobileSettingsClassName}>
              <SettingsControls
                scope="mobile"
                locale={locale}
                resolvedTheme={resolvedTheme}
                labels={settingsLabels}
                onLocaleChange={handleLocaleChange}
                onThemeChange={(theme, sourceEl) => {
                  applyTheme(theme, {sourceEl});
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
