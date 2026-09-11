'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useCallback, useEffect, useId, useMemo, useRef} from 'react';

import type {AppLocale} from '@/config/site';
import {SettingsControls} from '@/features/gnb/components/settings-controls';
import {ThemeModeIcon} from '@/features/gnb/components/theme-mode-icon';
import {shouldOpenDesktopSettingsByHover} from '@/features/gnb/behavior';
import {focusFirstLandingCardTrigger} from '@/features/gnb/gnb-keyboard-dom';
import {useGnbBackNavigation} from '@/features/gnb/hooks/use-gnb-back-navigation';
import {useGnbCapability} from '@/features/gnb/hooks/use-gnb-capability';
import {useGnbDesktopSettings} from '@/features/gnb/hooks/use-gnb-desktop-settings';
import {useGnbKeyboardTargets} from '@/features/gnb/hooks/use-gnb-keyboard-targets';
import {useGnbTabRouting} from '@/features/gnb/hooks/use-gnb-tab-routing';
import {useGnbMobileMenu} from '@/features/gnb/hooks/use-gnb-mobile-menu';
import {useLandingGnbEntryMode} from '@/features/gnb/hooks/use-landing-gnb-entry-mode';
import {getTransitionOrigin} from '@/features/gnb/hooks/theme-transition';
import {useThemePreference} from '@/features/gnb/hooks/use-theme-preference';
import type {GnbContext} from '@/features/gnb/types';
import {focusRingClassName} from '@/features/ui/button-class-names';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder, type LocaleFreeRoute} from '@/lib/routes/route-builder';

interface SiteGnbProps {
  locale: AppLocale;
  context: GnbContext;
  currentRoute: LocaleFreeRoute;
}

// design.md 6.7: flat until content scrolls beneath it, then a hairline. The bar
// carried the pair the other way round -- a divider at rest that swapped to a
// shadow on scroll -- so the resting state was the loud one. req-landing.md 6.4
// accepts either mark above `scrollY > 4px`; the hairline is the one 6.7 asks for.
const gnbShellClassName =
  'gnb-shell sticky top-0 z-[1100] border-b border-transparent bg-[var(--gnb-surface)] [backdrop-filter:blur(12px)] [-webkit-backdrop-filter:blur(12px)] [transition:border-color_180ms_ease] motion-reduce:transition-none data-[elevated=true]:border-[var(--hairline)]';
const gnbInnerClassName = 'gnb-inner mx-auto flex max-w-[1280px] items-center px-[var(--shell-gutter)]';
const gnbDesktopInnerClassName = `${gnbInnerClassName} gnb-desktop hidden h-16 md:flex`;
const gnbMobileInnerClassName = `${gnbInnerClassName} gnb-mobile flex h-14 md:hidden`;
const gnbLeadingColumnClassName = 'gnb-column gnb-column-leading flex min-w-0 flex-1 items-center justify-start';
const gnbCenterColumnClassName = 'gnb-column gnb-column-center flex min-w-0 flex-1 items-center justify-center';
const gnbTrailingColumnClassName = 'gnb-column gnb-column-trailing flex min-w-0 flex-1 items-center justify-end';
const gnbBrandLinkClassName = 'gnb-ci-link text-base font-bold tracking-[0.02em]';
const gnbDesktopLinksClassName = 'gnb-desktop-links flex items-center gap-4';
// The rest colour is `--muted-aa`, not `--muted`: BQ-29 measured `--muted` at
// 4.23:1 on white, and a nav link is normal-sized text however small it looks.
const gnbDesktopLinkClassName =
  'gnb-desktop-link relative py-2 text-[0.96rem] text-[color:var(--muted-aa)] [transition-duration:140ms] [transition-property:color] [transition-timing-function:ease] motion-reduce:transition-none hover:text-[color:var(--ink)] aria-[current=page]:text-[color:var(--ink)]';
// design.md 7.6 asks the menu to mark its current item with a dot. Same signal on
// the desktop row and in the drawer rather than inventing a second one.
const gnbDesktopLinkCurrentMarkerClassName =
  'gnb-desktop-link-marker pointer-events-none absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--accent)]';
// D-09: design.md 4.10 names the hamburger and the close button at 44x44. Fixed on
// the shared pill rather than on one button, so back / menu / settings all clear it.
//
// 포커스 링은 `focusRingClassName` 을 그대로 쓴다. 종전에는 두 층 box-shadow 였고 안쪽 층이
// `--canvas` 였는데, 그것은 *페이지* 지면이지 *이 요소의* 지면이 아니다 — 실측(2026-09-10,
// chromium): 링 안쪽 틈이 `241,243,239` 인데 바로 바깥 지면은 `251,250,247` 이라, 투명한
// 틈이 아니라 옅은 크림색 테가 하나 더 보였다. `outline-offset` 은 아무것도 칠하지 않으므로
// 어떤 표면 위에서든 지면이 그대로 비친다.
const gnbInteractiveButtonBaseClassName =
  `inline-flex min-h-[var(--tap-min)] cursor-pointer items-center justify-center rounded-full border border-[var(--hairline)] bg-[var(--surface-muted)] px-3 py-[7px] text-[0.88rem] font-semibold text-[var(--ink)] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color] [transition-timing-function:ease] hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-sunken)] active:bg-[var(--surface-strong)] ${focusRingClassName}`;
const gnbSettingsRootClassName =
  'gnb-settings-root relative flex items-stretch [--gnb-settings-trigger-size:var(--tap-min)] [--gnb-settings-trigger-icon-size:18px] [--gnb-settings-panel-base-width:324px] [--gnb-settings-panel-extra-top:12px] [--gnb-settings-panel-inner-left:15px] [--gnb-settings-panel-extra-right:var(--gnb-settings-panel-inner-left)] [--gnb-settings-panel-inner-bottom:15px]';
const gnbSettingsTriggerClassName =
  `${gnbInteractiveButtonBaseClassName} gnb-settings-trigger h-[var(--gnb-settings-trigger-size)] w-[var(--gnb-settings-trigger-size)] shrink-0 !p-0`;
const gnbSettingsTriggerIconClassName =
  'gnb-settings-trigger-icon h-[var(--gnb-settings-trigger-icon-size)] w-[var(--gnb-settings-trigger-icon-size)] shrink-0';
// design.md 6.6 / 6.8: the layer is an overlay surface -- `--surface-raised` with a
// `--border-strong` edge, the same pair the drawer takes and for the same measured
// reason in dark. Identical to the previous fill in light (both resolve to #fff).
const gnbSettingsPanelClassName =
  "gnb-settings-panel absolute z-[1] grid isolate rounded-b-[12px] top-[calc(var(--gnb-settings-panel-extra-top)*-1)] right-[calc(var(--gnb-settings-panel-extra-right)*-1)] [width:min(calc(var(--gnb-settings-panel-base-width)_+_var(--gnb-settings-panel-extra-right)),calc(100vw_-_24px_+_var(--gnb-settings-panel-extra-right)))] [grid-template-columns:minmax(0,1fr)_var(--gnb-settings-panel-extra-right)] [grid-template-rows:var(--gnb-settings-panel-extra-top)_auto] before:pointer-events-none before:absolute before:z-0 before:content-[''] before:[inset:-1px_0_0_0] before:rounded-[inherit] before:bg-[var(--surface-raised)] after:pointer-events-none after:absolute after:z-0 after:content-[''] after:inset-0 after:rounded-[inherit] after:[border-right:1px_solid_var(--border-strong)] after:[border-bottom:1px_solid_var(--border-strong)] after:[border-left:1px_solid_var(--border-strong)] after:shadow-[var(--shadow-overlay)]";
const gnbBackButtonClassName = `${gnbInteractiveButtonBaseClassName} gnb-back-button`;
const gnbMenuTriggerClassName = `${gnbInteractiveButtonBaseClassName} gnb-menu-trigger`;
const gnbDesktopTimerClassName = 'gnb-desktop-timer m-0 font-semibold tabular-nums text-[var(--ink-body)]';
const gnbMobileTimerClassName = 'gnb-mobile-timer m-0 font-semibold tabular-nums text-[var(--ink-body)]';
const gnbMobileLayerClassName = 'gnb-mobile-layer fixed inset-0 z-[1200]';
const gnbMobileBackdropClassName =
  'gnb-mobile-backdrop absolute inset-0 bg-[var(--overlay-scrim-strong)] [transition:opacity_180ms_ease] data-[state=closing]:opacity-0';
// `--surface-raised` and a `--border-strong` edge, per design.md 6.8. The edge is
// load-bearing in dark: the scrim can only dim a near-black page 1.04:1, so the
// panel's own boundary is what separates it (4.73:1 against the scrimmed ground).
const gnbMobilePanelClassName =
  'gnb-mobile-panel absolute right-0 top-0 flex h-screen max-h-screen w-[min(87vw,340px)] flex-col gap-5 overflow-y-auto border-l border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 pt-4 pb-[calc(32px+env(safe-area-inset-bottom,0px))] opacity-100 shadow-[var(--shadow-overlay)] overscroll-contain [height:100dvh] [max-height:100dvh] [-webkit-overflow-scrolling:touch] [transform:translateX(0)] [transition:transform_180ms_ease,opacity_180ms_ease] motion-reduce:[transition:opacity_180ms_ease] motion-reduce:data-[state=closing]:translate-x-0 data-[state=closing]:translate-x-[12px] data-[state=closing]:opacity-0';
// The head names the surface, matching the foot's overline. It deliberately carries
// NO close control: the panel sits above the bar (z 1200 over 1100) and covers the
// hamburger, so while the drawer is open there is no visible close affordance --
// measured with elementFromPoint at the hamburger's centre, which returns the panel.
// The specimen answers that with a 44x44 close in this row, but adding a focusable
// control here re-orders the drawer's tab traversal, which two @smoke keyboard-matrix
// checks fix. Behaviour outranks the visual, so the control is deferred rather than
// landed here.
const gnbMobileHeadClassName = 'gnb-mobile-head flex min-h-10 items-center gap-3';
const gnbMobileHeadLabelClassName =
  'gnb-mobile-head-label text-[0.78rem] font-bold uppercase leading-none tracking-[0.03em] text-[color:var(--muted-aa)]';
const gnbMobileLinksClassName = 'gnb-mobile-links grid gap-1';
const gnbMobileLinkClassName =
  'gnb-mobile-link -mx-3 flex min-h-[var(--tap-min)] items-center gap-2 rounded-[8px] px-3 text-base font-semibold [transition:background-color_140ms_ease] motion-reduce:transition-none hover:bg-[var(--surface-sunken)]';
const gnbMobileLinkCurrentMarkerClassName =
  'gnb-mobile-link-marker pointer-events-none h-[5px] w-[5px] flex-none rounded-full bg-[var(--accent)]';
const gnbMobileSettingsClassName = 'gnb-mobile-settings mt-auto grid gap-3';

function isCurrentSection(currentRoute: LocaleFreeRoute, section: 'landing' | 'history' | 'blog'): boolean {
  if (section === 'landing') {
    return currentRoute.pathname === '/';
  }

  if (section === 'history') {
    return currentRoute.pathname === '/history';
  }

  return currentRoute.pathname === '/blog' || currentRoute.pathname === '/blog/[variant]';
}

export function SiteGnb({locale, context, currentRoute}: SiteGnbProps) {
  const t = useTranslations('gnb');
  const router = useRouter();
  const pathname = usePathname();
  const {viewportWidth, hoverCapable, elevated} = useGnbCapability();
  const {resolvedTheme, applyTheme} = useThemePreference();
  const settingsPanelId = useId();
  const mobileMenuPanelId = useId();

  const gnbShellRef = useRef<HTMLElement | null>(null);

  const homeHref = useMemo(() => buildLocalizedPath(RouteBuilder.landing(), locale), [locale]);
  const blogHref = useMemo(() => buildLocalizedPath(RouteBuilder.blog(), locale), [locale]);
  const historyHref = useMemo(() => buildLocalizedPath(RouteBuilder.history(), locale), [locale]);

  const isLandingContext = context === 'landing';
  const mobileMenuEnabled = context !== 'test';
  const hoverOpenEnabled = shouldOpenDesktopSettingsByHover({
    viewportWidth,
    hoverCapable
  });

  const {
    settingsOpen,
    settingsRootRef,
    openSettingsImmediate,
    toggleSettingsOpen,
    closeSettingsImmediate,
    clearSettingsHoverCloseTimer,
    desktopSettingsEnter,
    desktopSettingsLeave,
    desktopSettingsBlurCapture
  } = useGnbDesktopSettings({hoverOpenEnabled});

  const {
    mobileMenuState,
    mobileMenuTriggerRef,
    setMobileMenuOpen,
    requestMobileMenuClose,
    closeMobileMenuImmediate,
    clearMobileMenuCloseTimer,
    mobileMenuBackdropPointerDown,
    mobileMenuBackdropPointerMove,
    mobileMenuBackdropPointerEnd
  } = useGnbMobileMenu();

  const {handleTestBack, handleStandardBack, clearMobileBackFallbackTimer} = useGnbBackNavigation({
    pathname,
    homeHref,
    router
  });

  const {
    landingKeyboardEntryMode,
    shouldDeferLandingGnbEntry,
    desktopLandingTabIndex,
    mobileLandingTabIndex
  } = useLandingGnbEntryMode({
    isLandingContext,
    gnbShellRef,
    mobileMenuPanelId,
    settingsOpen,
    mobileMenuState
  });

  const {getOrderedKeyboardTargets} = useGnbKeyboardTargets({
    settingsPanelId,
    mobileMenuPanelId,
    settingsOpen,
    mobileMenuState,
    mobileMenuTriggerRef
  });

  const boundFocusFirstLandingCard = useCallback(() => focusFirstLandingCardTrigger(), []);

  const {handleGnbKeyDownCapture} = useGnbTabRouting({
    getOrderedKeyboardTargets,
    isLandingContext,
    shouldDeferLandingGnbEntry,
    landingKeyboardEntryMode,
    settingsOpen,
    closeSettingsImmediate,
    focusFirstLandingCardTrigger: boundFocusFirstLandingCard
  });

  const handleLocaleChange = useCallback(
    (nextLocale: AppLocale) => {
      if (nextLocale === locale) {
        return;
      }

      closeSettingsImmediate();
      closeMobileMenuImmediate();
      router.push(buildLocalizedPath(currentRoute, nextLocale));
    },
    [closeMobileMenuImmediate, closeSettingsImmediate, currentRoute, locale, router]
  );

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
    return () => {
      clearSettingsHoverCloseTimer();
      clearMobileMenuCloseTimer();
      clearMobileBackFallbackTimer();
    };
  }, [clearMobileBackFallbackTimer, clearMobileMenuCloseTimer, clearSettingsHoverCloseTimer]);

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
        <Link
          className={gnbDesktopLinkClassName}
          href={{pathname: historyHref}}
          tabIndex={desktopLandingTabIndex}
          aria-current={isCurrentSection(currentRoute, 'history') ? 'page' : undefined}
        >
          {t('history')}
          {isCurrentSection(currentRoute, 'history') ? (
            <span aria-hidden="true" className={gnbDesktopLinkCurrentMarkerClassName} />
          ) : null}
        </Link>
        <Link
          className={gnbDesktopLinkClassName}
          href={{pathname: blogHref}}
          tabIndex={desktopLandingTabIndex}
          aria-current={isCurrentSection(currentRoute, 'blog') ? 'page' : undefined}
        >
          {t('blog')}
          {isCurrentSection(currentRoute, 'blog') ? (
            <span aria-hidden="true" className={gnbDesktopLinkCurrentMarkerClassName} />
          ) : null}
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
              openSettingsImmediate();
            }
          }}
          onClick={toggleSettingsOpen}
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
                    setMobileMenuOpen();
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
            <div className={gnbMobileHeadClassName}>
              <span className={gnbMobileHeadLabelClassName}>{t('menu')}</span>
            </div>
            <nav className={gnbMobileLinksClassName} aria-label="Mobile Primary">
              {(
                [
                  {key: 'landing', href: homeHref, label: t('home'), scroll: false},
                  {key: 'history', href: historyHref, label: t('history'), scroll: true},
                  {key: 'blog', href: blogHref, label: t('blog'), scroll: true}
                ] as const
              ).map(({key, href, label, scroll}) => {
                const current = isCurrentSection(currentRoute, key);

                return (
                  <Link
                    key={key}
                    className={gnbMobileLinkClassName}
                    href={{pathname: href}}
                    scroll={scroll}
                    aria-current={current ? 'page' : undefined}
                  >
                    {current ? <span aria-hidden="true" className={gnbMobileLinkCurrentMarkerClassName} /> : null}
                    {label}
                  </Link>
                );
              })}
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
