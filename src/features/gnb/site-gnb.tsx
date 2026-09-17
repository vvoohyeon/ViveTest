'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useCallback, useEffect, useId, useMemo, useRef} from 'react';

import {localeOptions, type AppLocale} from '@/config/site';
import {
  gnbControlHitClassName,
  gnbControlShellClassName
} from '@/features/gnb/components/gnb-control-class-names';
import {GnbMobileDrawer} from '@/features/gnb/components/gnb-mobile-drawer';
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
import {getTransitionOrigin} from '@/features/gnb/hooks/theme-transition';
import {useThemePreference} from '@/features/gnb/hooks/use-theme-preference';
import type {GnbContext, ThemePreference} from '@/features/gnb/types';
import {discardOverlayHistoryEntry, useOverlayHistoryEntry} from '@/features/ui/use-overlay-history-entry';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder, type LocaleFreeRoute} from '@/lib/routes/route-builder';

interface SiteGnbProps {
  locale: AppLocale;
  context: GnbContext;
  currentRoute: LocaleFreeRoute;
  /**
   * 모바일 띄의 화면 이름(명세 §2-3). 지금은 테스트 표면만 준다 — instruction 이 열려
   * 있는 동안 카드의 `h1` 이 시트 뒤에 가려 **지금 어디인지를 말하는 것이 하나도 없었다.**
   */
  screenTitle?: string;
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
// 보이는 껍데기(글자)는 그대로 두고 히트 영역만 `--tap-min` 까지 키운다 — 텍스트 높이만으로는
// 24px 이라 WCAG 2.5.5/저장소 `--tap-min` 하한에 미달했다(`assertion:TT-01`). 선행 열은
// `flex items-center` 라 상자만 커지고 글자 위치는 움직이지 않는다.
const gnbBrandLinkClassName =
  'gnb-ci-link inline-flex items-center min-h-[var(--tap-min)] text-base font-bold tracking-[0.02em]';
const gnbDesktopLinksClassName = 'gnb-desktop-links flex items-center gap-4';
// The rest colour is `--muted-aa`, not `--muted`: BQ-29 measured `--muted` at
// 4.23:1 on white, and a nav link is normal-sized text however small it looks.
// ds-literal: off-ladder — 0.96rem = 15.36px. `--button` 15px 이 가장 가깝지만 그것은 무게
// 600 이고 이 링크는 기본 무게다. 이 크기는 옆의 설정 트리거와 함께 서야 하는 값이고
// (`assertion:GN-04` 가 둘을 같게 고정한다) 사다리에는 없다.
const gnbDesktopLinkClassName =
  'gnb-desktop-link relative py-2 text-[0.96rem] text-[color:var(--muted-aa)] [transition-duration:140ms] [transition-property:color] [transition-timing-function:ease] motion-reduce:transition-none hover:text-[color:var(--ink)] active:text-[color:var(--ink)] aria-[current=page]:text-[color:var(--ink)]';
// design.md 7.6 asks the menu to mark its current item with a dot. Same signal on
// the desktop row and in the drawer rather than inventing a second one.
const gnbDesktopLinkCurrentMarkerClassName =
  'gnb-desktop-link-marker pointer-events-none absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--accent)]';
// 레이어의 우측 상단 모서리가 트리거의 우측 상단 모서리와 **일치**한다(규칙 8). 뿌리를
// `items-center` 로 두어 그 상자가 44px 히트 영역과 같아지고, 그 안에서 36px 껍데기의 위쪽
// 여백이 4px 이다 — 레이어의 `top` 은 그 뺄셈의 결과다.
const gnbSettingsRootClassName =
  'gnb-settings-root relative flex items-center [--gnb-settings-control-size:var(--tap-min)] [--gnb-settings-trigger-icon-size:18px]';
// 명세 §2-9 — 조용한 pill 이다. 테두리도 배경도 없고 글자 무게는 기본값이며, 옆의 `History`·
// `Blog` 텍스트 링크와 같은 무게로 선다(규칙 7). hover 에서만 면이 들어온다.
// ds-literal: off-ladder — 0.96rem = 15.36px. 위 nav 링크와 **같은 값이어야 한다**(규칙 7,
// `assertion:GN-04`). 두 자리가 같은 리터럴을 쓰는 것이 여기서는 결함이 아니라 계약이다.
const gnbSettingsTriggerShellClassName =
  'gnb-settings-trigger-shell pointer-events-none inline-flex h-9 items-center gap-2 rounded-full border border-transparent bg-transparent px-3 text-[0.96rem] font-normal text-[color:var(--ink-body)] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color] [transition-timing-function:ease] group-hover:bg-[var(--surface-muted)] group-focus-visible:[outline:2px_solid_var(--focus-ring)] group-focus-visible:[outline-offset:2px]';
const gnbSettingsTriggerLocaleClassName = 'gnb-settings-trigger-locale truncate';
const gnbSettingsTriggerDividerClassName =
  'gnb-settings-trigger-divider h-4 w-px shrink-0 bg-[var(--hairline-strong)]';
const gnbSettingsTriggerIconClassName =
  'gnb-settings-trigger-icon h-[var(--gnb-settings-trigger-icon-size)] w-[var(--gnb-settings-trigger-icon-size)] shrink-0';
// design.md 6.6 / 6.8: the layer is an overlay surface -- `--surface-raised` with a
// `--border-strong` edge, the same pair the drawer takes and for the same measured
// reason in dark. Identical to the previous fill in light (both resolve to #fff).
//
// `top-1` 은 (44 − 36) / 2 = 4px 이고 `right-0` 은 히트 상자의 우변이다 — 그 둘이 곧 껍데기의
// 우측 상단 모서리다. 레이어는 트리거를 **덮으며** 아래·왼쪽으로 펼쳐진다(규칙 8).
const gnbSettingsPanelClassName =
  'gnb-settings-panel absolute right-0 top-1 z-[1] w-[min(324px,calc(100vw_-_24px))] rounded-[12px] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-[15px] shadow-[var(--shadow-overlay)]';
const gnbDesktopTimerClassName = 'gnb-desktop-timer m-0 font-semibold tabular-nums text-[var(--ink-body)]';
const gnbMobileTimerClassName = 'gnb-mobile-timer m-0 font-semibold tabular-nums text-[var(--ink-body)]';
/**
 * 화면 이름의 띄 — 명세 §2-3 · §4 결함 1.
 *
 * **중앙 정렬의 기준은 컬테이너 전체 폭이다.** 양쪽 컨트롤을 열로 두고 그 사이에서 가운데
 * 정렬하면 둘의 폭이 다를 때마다 제목이 한쪽으로 밀린다 — `Back` 과 타이머는 글자 수가 다르고
 * 12 locale 에서 그 차가 더 벌어진다. 그래서 제목이 띄의 전체 폭을 갖고 컨트롤 둘은 절대 위치로
 * **엹힌다.** 양쪽 예약 폭은 하나의 값(`--gnb-title-reserve`)이므로 좌우가 어긋날 수 없다.
 *
 * 접힘을 방치하지 않는다(§4 결함 3) — 긴 이름은 한 줄로 잘린다.
 *
 * 예약 폭 88px 는 고른 값이 아니라 재서 나온 것이다 — 12 locale 에서 `Back` 이 가장 넓은 것이
 * `id`(`Kembali`, 우변 93.9px)이고 그것을 넘기는 최소값에 여유를 더했다. 상수가 아니라
 * **겹치지 않음**이 계약이고, `assertion:TB-01` 이 12 locale × 두 폭에서 그것을 재다.
 */
const gnbMobileTitleClassName =
  'gnb-mobile-title pointer-events-none m-0 w-full truncate px-[var(--gnb-title-reserve)] text-center [font:var(--label)] !font-semibold text-[var(--ink)]';
const gnbMobileTitleBarClassName = `${gnbMobileInnerClassName} relative [--gnb-title-reserve:88px]`;
const gnbMobileTitleSideClassName = 'gnb-column absolute inset-y-0 flex items-center';

function isCurrentSection(currentRoute: LocaleFreeRoute, section: 'landing' | 'history' | 'blog'): boolean {
  if (section === 'landing') {
    return currentRoute.pathname === '/';
  }

  if (section === 'history') {
    return currentRoute.pathname === '/history';
  }

  return currentRoute.pathname === '/blog' || currentRoute.pathname === '/blog/[variant]';
}

export function SiteGnb({locale, context, currentRoute, screenTitle}: SiteGnbProps) {
  const t = useTranslations('gnb');
  const router = useRouter();
  const pathname = usePathname();
  const {viewportWidth, hoverCapable, elevated} = useGnbCapability();
  const {themePreference, resolvedTheme, applyTheme} = useThemePreference();
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

  const {getOrderedKeyboardTargets} = useGnbKeyboardTargets({
    settingsPanelId,
    mobileMenuPanelId,
    settingsOpen,
    mobileMenuState
  });

  const boundFocusFirstLandingCard = useCallback(() => focusFirstLandingCardTrigger(), []);

  const {handleGnbKeyDownCapture} = useGnbTabRouting({
    getOrderedKeyboardTargets,
    isLandingContext,
    settingsOpen,
    closeSettingsImmediate,
    focusFirstLandingCardTrigger: boundFocusFirstLandingCard,
    trapFocus: mobileMenuState !== 'closed'
  });

  // 규칙 3 — 설정 레이어도 시스템 뒤로가기로 닫힌다. 드로어와 시트만 답하고 이 층은 페이지를
  // 떠나게 두면 같은 제스처가 표면마다 다른 뜻이 된다.
  useOverlayHistoryEntry({
    layerId: 'gnb-desktop-settings',
    open: settingsOpen,
    onPopClose: closeSettingsImmediate
  });

  const handleLocaleChange = useCallback(
    (nextLocale: AppLocale) => {
      if (nextLocale === locale) {
        return;
      }

      closeSettingsImmediate();
      closeMobileMenuImmediate();
      // 층을 닫고 **동시에** 페이지를 떠난다 — 닫힌 층이 제 항목을 되돌리려 들면 그 되돌림이
      // 방금의 이동을 지운다. 표시를 먼저 걷어 되돌릴 것이 없게 한다.
      discardOverlayHistoryEntry();
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
    language: t('language'),
    settings: t('settings'),
    system: t('system'),
    light: t('light'),
    dark: t('dark'),
    effective: t('themeEffective')
  };

  const currentLocaleLabel = localeOptions.find(({code}) => code === locale)?.label ?? locale;
  // 타이틀은 모바일 테스트 띄에만 둔다. 럜딩·블로그·히스토리는 GNB 자체가 현재 위치를 표시하고
  // (드로어의 sage 점), 데스크톱은 중앙 열에 타이머가 이미 서 있다.
  const showMobileTitle = context === 'test' && typeof screenTitle === 'string' && screenTitle.length > 0;

  const handleDesktopThemeChange = useCallback(
    (preference: ThemePreference, sourceEl: HTMLElement | null) => {
      const transitionOrigin = sourceEl ? getTransitionOrigin(sourceEl) : undefined;

      closeSettingsImmediate();
      applyTheme(preference, {transitionOrigin});
    },
    [applyTheme, closeSettingsImmediate]
  );

  const handleMobileThemeChange = useCallback(
    (preference: ThemePreference, sourceEl: HTMLElement | null) => {
      applyTheme(preference, {sourceEl});
    },
    [applyTheme]
  );

  const drawerNavItems = useMemo(
    () =>
      (
        [
          {key: 'landing', href: homeHref, label: t('home'), scroll: false},
          {key: 'history', href: historyHref, label: t('history'), scroll: true},
          {key: 'blog', href: blogHref, label: t('blog'), scroll: true}
        ] as const
      ).map((item) => ({
        ...item,
        current: isCurrentSection(currentRoute, item.key)
      })),
    [blogHref, currentRoute, historyHref, homeHref, t]
  );

  const desktopLeading =
    context === 'test' ? (
      <button
        type="button"
        className={gnbControlHitClassName}
        onClick={handleTestBack}
        aria-label={t('backAria')}
        data-testid="gnb-desktop-test-back"
      >
        <span className={gnbControlShellClassName}>{t('back')}</span>
      </button>
    ) : (
      <Link href={{pathname: homeHref}} className={`${gnbBrandLinkClassName}`} scroll={false}>
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
          className={gnbControlHitClassName}
          // 보이는 글자가 값(현재 언어)이므로 접근 가능한 이름이 그것을 포함해야 한다
          // (WCAG 2.5.3) — 이름만 `Settings` 로 두면 「English」라고 말한 사용자의 음성
          // 명령이 이 컨트롤에 닿지 않는다.
          aria-label={`${t('settings')} — ${currentLocaleLabel}`}
          aria-expanded={settingsOpen}
          aria-controls={settingsPanelId}
          data-current-theme={resolvedTheme}
          data-theme-preference={themePreference}
          onFocus={() => {
            if (!hoverOpenEnabled) {
              openSettingsImmediate();
            }
          }}
          onClick={toggleSettingsOpen}
          data-testid="gnb-settings-trigger"
        >
          <span className={gnbSettingsTriggerShellClassName}>
            <span className={gnbSettingsTriggerLocaleClassName}>{currentLocaleLabel}</span>
            <span className={gnbSettingsTriggerDividerClassName} aria-hidden="true" />
            <ThemeModeIcon theme={resolvedTheme} className={gnbSettingsTriggerIconClassName} />
          </span>
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
            themePreference={themePreference}
            resolvedTheme={resolvedTheme}
            labels={settingsLabels}
            onLocaleChange={handleLocaleChange}
            onThemeChange={handleDesktopThemeChange}
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

        <div className={showMobileTitle ? gnbMobileTitleBarClassName : gnbMobileInnerClassName}>
          <div
            className={
              showMobileTitle
                ? `${gnbMobileTitleSideClassName} left-[var(--shell-gutter)] justify-start`
                : gnbLeadingColumnClassName
            }
          >
            {context === 'landing' ? (
              <Link href={{pathname: homeHref}} className={gnbBrandLinkClassName} scroll={false}>
                ViveTest
              </Link>
            ) : (
              <button
                type="button"
                className={gnbControlHitClassName}
                onClick={context === 'test' ? handleTestBack : handleStandardBack}
                aria-label={t('backAria')}
                data-testid={context === 'test' ? 'gnb-mobile-test-back' : 'gnb-mobile-back'}
              >
                <span className={gnbControlShellClassName}>{t('back')}</span>
              </button>
            )}
          </div>

          {showMobileTitle ? (
            <p className={gnbMobileTitleClassName} data-testid="gnb-mobile-title">
              {screenTitle}
            </p>
          ) : null}

          <div
            className={
              showMobileTitle
                ? `${gnbMobileTitleSideClassName} right-[var(--shell-gutter)] justify-end`
                : gnbTrailingColumnClassName
            }
          >
            {mobileMenuEnabled ? (
              <button
                ref={mobileMenuTriggerRef}
                type="button"
                className={gnbControlHitClassName}
                aria-label={mobileMenuState === 'closed' ? t('menuAria') : t('closeMenuAria')}
                aria-expanded={mobileMenuState !== 'closed'}
                aria-controls={mobileMenuPanelId}
                onClick={() => {
                  if (mobileMenuState === 'closed') {
                    setMobileMenuOpen();
                    return;
                  }
                  requestMobileMenuClose('button');
                }}
                data-testid="gnb-mobile-menu-trigger"
              >
                <span className={gnbControlShellClassName}>
                  {mobileMenuState === 'closed' ? t('menu') : t('close')}
                </span>
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
        <GnbMobileDrawer
          panelId={mobileMenuPanelId}
          state={mobileMenuState}
          locale={locale}
          themePreference={themePreference}
          resolvedTheme={resolvedTheme}
          labels={{...settingsLabels, menu: t('menu'), close: t('closeMenuAria')}}
          navItems={drawerNavItems}
          onLocaleChange={handleLocaleChange}
          onThemeChange={handleMobileThemeChange}
          onRequestClose={() => requestMobileMenuClose('button')}
          onCloseImmediate={closeMobileMenuImmediate}
          onKeyDownCapture={handleGnbKeyDownCapture}
          onBackdropPointerDown={mobileMenuBackdropPointerDown}
          onBackdropPointerMove={mobileMenuBackdropPointerMove}
          onBackdropPointerEnd={mobileMenuBackdropPointerEnd}
        />
      ) : null}
    </>
  );
}
