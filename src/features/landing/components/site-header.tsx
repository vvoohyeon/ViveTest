'use client';

import {useLocale, useTranslations} from 'next-intl';
import {usePathname, useRouter, Link} from '@/i18n/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import {appRoutes} from '@/lib/route-builder';
import {lockBodyScroll, unlockBodyScroll} from '@/lib/body-lock';
import {useThemeSetting} from '@/features/ui/theme-provider';
import type {InteractionCapability} from '@/features/landing/hooks/use-interaction-mode';
import styles from './site-header.module.css';

type HeaderContext = 'landing' | 'blog' | 'test';

type SiteHeaderProps = {
  context: HeaderContext;
  capability: InteractionCapability;
  timerSeconds?: number;
  disableInteractions?: boolean;
};

const MOBILE_MENU_CLOSE_MS = 220;

function ThemeGlyph({resolvedTheme}: {resolvedTheme: 'light' | 'dark'}) {
  return <span aria-hidden>{resolvedTheme === 'dark' ? 'D' : 'L'}</span>;
}

function LanguageIcon() {
  return (
    <svg className={styles.mobileSettingIcon} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.7 10H17.3M10 2.7C11.8 4.6 13 7.2 13 10C13 12.8 11.8 15.4 10 17.3M10 2.7C8.2 4.6 7 7.2 7 10C7 12.8 8.2 15.4 10 17.3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function ThemeIcon({resolvedTheme}: {resolvedTheme: 'light' | 'dark'}) {
  return (
    <svg className={styles.mobileSettingIcon} viewBox="0 0 20 20" fill="none" aria-hidden>
      {resolvedTheme === 'dark' ? (
        <path d="M13.8 3.8C9.9 4.4 7 7.9 7 11.9C7 14.3 8.1 16.5 9.8 17.9C6.1 17.8 3.1 14.8 3.1 11.1C3.1 7.1 6.4 3.8 10.4 3.8C11.6 3.8 12.8 4.1 13.8 4.6V3.8Z" fill="currentColor" />
      ) : (
        <>
          <circle cx="10" cy="10" r="3.6" fill="currentColor" />
          <path d="M10 2.2V4.1M10 15.9V17.8M17.8 10H15.9M4.1 10H2.2M15.5 4.5L14.1 5.9M5.9 14.1L4.5 15.5M15.5 15.5L14.1 14.1M5.9 5.9L4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function useScrolledShadow(): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return scrolled;
}

export function SiteHeader({context, capability, timerSeconds = 0, disableInteractions = false}: SiteHeaderProps) {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const scrolled = useScrolledShadow();
  const {resolvedTheme, toggleTheme} = useThemeSetting();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuClosing, setMobileMenuClosing] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);

  const isMobile = capability.isMobile;
  const hoverOpenEnabled = capability.isDesktop && capability.isHoverCapable;
  const languageValueLabel = locale === 'en' ? t('languageEnglish') : t('languageKorean');

  const changeLocale = useCallback(() => {
    const nextLocale = locale === 'en' ? 'kr' : 'en';
    router.replace(pathname, {locale: nextLocale});
  }, [locale, pathname, router]);

  const closeSettings = useCallback(() => {
    if (hoverCloseTimerRef.current) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    setSettingsOpen(false);
  }, []);

  const openSettings = useCallback(() => {
    if (disableInteractions) {
      return;
    }
    if (hoverCloseTimerRef.current) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    setSettingsOpen(true);
  }, [disableInteractions]);

  const handleMouseEnterSettings = useCallback(() => {
    if (!hoverOpenEnabled) {
      return;
    }
    openSettings();
  }, [hoverOpenEnabled, openSettings]);

  const handleMouseLeaveSettings = useCallback(() => {
    if (!hoverOpenEnabled) {
      return;
    }

    hoverCloseTimerRef.current = window.setTimeout(() => {
      setSettingsOpen(false);
    }, 140);
  }, [hoverOpenEnabled]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const onPointerDown = (event: globalThis.MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (!settingsRef.current?.contains(target)) {
        closeSettings();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSettings();
      }
    };

    document.addEventListener('mousedown', onPointerDown as EventListener);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown as EventListener);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeSettings, settingsOpen]);

  const closeMobileMenu = useCallback(() => {
    if (!mobileMenuOpen && !mobileMenuClosing) {
      return;
    }

    setMobileMenuOpen(false);
    setMobileMenuClosing(true);

    window.setTimeout(() => {
      setMobileMenuClosing(false);
      unlockBodyScroll();
    }, MOBILE_MENU_CLOSE_MS);
  }, [mobileMenuClosing, mobileMenuOpen]);

  const openMobileMenu = useCallback(() => {
    if (disableInteractions) {
      return;
    }

    if (mobileMenuClosing) {
      setMobileMenuClosing(false);
    }

    setMobileMenuOpen(true);
    lockBodyScroll();
  }, [disableInteractions, mobileMenuClosing]);

  useEffect(() => {
    return () => {
      if (mobileMenuOpen || mobileMenuClosing) {
        unlockBodyScroll({force: true});
      }
    };
  }, [mobileMenuClosing, mobileMenuOpen]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    router.replace(appRoutes.landing);
  }, [router]);

  const canOpenHamburger = context !== 'test';

  const desktopNavigation = useMemo<ReactNode>(() => {
    if (context === 'test') {
      return (
        <>
          <Link href={appRoutes.landing} className={styles.brand}>
            {t('brand')}
          </Link>
          <div className={styles.timer}>{timerSeconds}s</div>
          <div className={styles.menu}>
            <Link href={appRoutes.history} className={styles.menuLink}>
              {t('history')}
            </Link>
          </div>
        </>
      );
    }

    return (
      <>
        <Link href={appRoutes.landing} className={styles.brand}>
          {t('brand')}
        </Link>
        <nav className={styles.menu} aria-label="Main">
          <Link href={appRoutes.history} className={styles.menuLink}>
            {t('history')}
          </Link>
          <Link href={appRoutes.blog} className={styles.menuLink}>
            {t('blog')}
          </Link>
        </nav>
        <div className={styles.actionRow}>
          <div
            className={styles.settingsWrap}
            ref={settingsRef}
            onMouseEnter={handleMouseEnterSettings}
            onMouseLeave={handleMouseLeaveSettings}
            onFocus={openSettings}
            onBlur={(event) => {
              const next = event.relatedTarget as Node | null;
              if (!next || !settingsRef.current?.contains(next)) {
                closeSettings();
              }
            }}
          >
            <button
              type="button"
              className={styles.settingsTrigger}
              onClick={() => setSettingsOpen((prev) => !prev)}
              aria-label={t('openSettings')}
              aria-expanded={settingsOpen}
              disabled={disableInteractions}
            >
              <span>{locale.toUpperCase()}</span>
              <ThemeGlyph resolvedTheme={resolvedTheme} />
            </button>
            {settingsOpen ? (
              <div className={styles.settingsLayer} role="menu" aria-label={t('openSettings')}>
                <button type="button" className={styles.settingsButton} onClick={changeLocale}>
                  <span>{t('language')}</span>
                  <span>{locale.toUpperCase()}</span>
                </button>
                <button type="button" className={styles.settingsButton} onClick={toggleTheme}>
                  <span>{t('theme')}</span>
                  <span>{resolvedTheme === 'dark' ? t('themeDark') : t('themeLight')}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </>
    );
  }, [
    changeLocale,
    closeSettings,
    context,
    disableInteractions,
    handleMouseEnterSettings,
    handleMouseLeaveSettings,
    locale,
    openSettings,
    resolvedTheme,
    settingsOpen,
    t,
    timerSeconds,
    toggleTheme
  ]);

  if (isMobile) {
    return (
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
        <div className={`${styles.inner} ${styles.mobileInner}`}>
          {context === 'test' || context === 'blog' ? (
            <button type="button" className={styles.backButton} onClick={handleBack} aria-label={t('back')}>
              {t('back')}
            </button>
          ) : (
            <Link href={appRoutes.landing} className={styles.brand}>
              {t('brand')}
            </Link>
          )}

          {context === 'test' ? <div className={styles.timer}>{timerSeconds}s</div> : null}

          {canOpenHamburger ? (
            <button
              type="button"
              className={styles.mobileIconButton}
              onClick={openMobileMenu}
              aria-label={t('openMenu')}
              disabled={disableInteractions}
            >
              |||
            </button>
          ) : (
            <div />
          )}
        </div>

        {mobileMenuOpen || mobileMenuClosing ? (
          <div className={styles.mobileMenuLayer}>
            <button
              type="button"
              className={styles.mobileBackdrop}
              onClick={closeMobileMenu}
              aria-label={t('closeMenu')}
            />
            <aside
              className={`${styles.mobilePanel} ${mobileMenuClosing ? styles.mobilePanelClosing : ''}`}
              aria-label="Mobile menu"
            >
              <div>
                <div className={styles.brand}>{t('brand')}</div>
                <nav className={styles.mobileLinks}>
                  <Link href={appRoutes.landing} className={styles.mobileLink} onClick={closeMobileMenu}>
                    {t('brand')}
                  </Link>
                  <Link href={appRoutes.history} className={styles.mobileLink} onClick={closeMobileMenu}>
                    {t('history')}
                  </Link>
                  <Link href={appRoutes.blog} className={styles.mobileLink} onClick={closeMobileMenu}>
                    {t('blog')}
                  </Link>
                </nav>
              </div>
              <div className={styles.mobileSettings}>
                <button
                  type="button"
                  className={styles.mobileSettingButton}
                  onClick={changeLocale}
                  aria-label={`${t('language')}: ${languageValueLabel}`}
                >
                  <span className={styles.mobileSettingContent}>
                    <LanguageIcon />
                    <span>{languageValueLabel}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.mobileSettingButton}
                  onClick={toggleTheme}
                  aria-label={`${t('theme')}: ${resolvedTheme === 'dark' ? t('themeDark') : t('themeLight')}`}
                >
                  <span className={styles.mobileSettingContent}>
                    <ThemeIcon resolvedTheme={resolvedTheme} />
                    <span>{resolvedTheme === 'dark' ? t('themeDark') : t('themeLight')}</span>
                  </span>
                </button>
              </div>
            </aside>
          </div>
        ) : null}
      </header>
    );
  }

  return <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}><div className={styles.inner}>{desktopNavigation}</div></header>;
}
