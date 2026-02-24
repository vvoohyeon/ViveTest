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
                <button type="button" className={styles.mobileSettingButton} onClick={changeLocale}>
                  <span>Lang {t('language')}</span>
                  <span>{locale.toUpperCase()}</span>
                </button>
                <button type="button" className={styles.mobileSettingButton} onClick={toggleTheme}>
                  <span>Mode {t('theme')}</span>
                  <span>{resolvedTheme === 'dark' ? t('themeDark') : t('themeLight')}</span>
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
