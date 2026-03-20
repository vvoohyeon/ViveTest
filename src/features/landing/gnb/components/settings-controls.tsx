import type {MouseEvent as ReactMouseEvent} from 'react';

import {locales, type AppLocale} from '@/config/site';

interface SettingsControlLabels {
  language: string;
  theme: string;
  light: string;
  dark: string;
}

interface SettingsControlsProps {
  scope: 'desktop' | 'mobile';
  locale: AppLocale;
  resolvedTheme: 'light' | 'dark';
  labels: SettingsControlLabels;
  onLocaleChange: (locale: AppLocale) => void;
  onThemeChange: (theme: 'light' | 'dark', sourceEl: HTMLElement | null) => void;
}

function ThemeChipIcon({theme}: {theme: 'light' | 'dark'}) {
  if (theme === 'light') {
    return (
      <svg
        aria-hidden="true"
        className="gnb-chip-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4.25" />
        <path d="M12 2.75v2.5" />
        <path d="M12 18.75v2.5" />
        <path d="m4.93 4.93 1.77 1.77" />
        <path d="m17.3 17.3 1.77 1.77" />
        <path d="M2.75 12h2.5" />
        <path d="M18.75 12h2.5" />
        <path d="m4.93 19.07 1.77-1.77" />
        <path d="m17.3 6.7 1.77-1.77" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="gnb-chip-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M14.85 3.8a8.7 8.7 0 1 0 5.35 15.71 9.35 9.35 0 0 1-3.61.72 9.48 9.48 0 0 1-9.47-9.47c0-2.9 1.3-5.54 3.34-7.32a8.65 8.65 0 0 0 4.39.36Z" />
    </svg>
  );
}

export function SettingsControls({
  scope,
  locale,
  resolvedTheme,
  labels,
  onLocaleChange,
  onThemeChange
}: SettingsControlsProps) {
  const handleThemeClick =
    (theme: 'light' | 'dark') => (event: ReactMouseEvent<HTMLButtonElement>) => {
      onThemeChange(theme, event.currentTarget);
    };

  return (
    <>
      <div className="gnb-settings-row" data-testid={`${scope}-gnb-locale-controls`}>
        <span className="gnb-settings-label">{labels.language}</span>
        <div className="gnb-chip-row">
          {locales.map((localeOption) => (
            <button
              key={localeOption}
              type="button"
              className="gnb-chip"
              aria-pressed={locale === localeOption}
              onClick={() => onLocaleChange(localeOption)}
              disabled={locale === localeOption}
            >
              {localeOption.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="gnb-settings-row" data-testid={`${scope}-gnb-theme-controls`}>
        <span className="gnb-settings-label">{labels.theme}</span>
        <div className="gnb-chip-row">
          <button
            type="button"
            className="gnb-chip gnb-chip-theme"
            aria-pressed={resolvedTheme === 'light'}
            aria-label={labels.light}
            title={labels.light}
            data-testid={`${scope}-gnb-theme-light`}
            data-theme-option="light"
            disabled={resolvedTheme === 'light'}
            onClick={handleThemeClick('light')}
          >
            <ThemeChipIcon theme="light" />
          </button>
          <button
            type="button"
            className="gnb-chip gnb-chip-theme"
            aria-pressed={resolvedTheme === 'dark'}
            aria-label={labels.dark}
            title={labels.dark}
            data-testid={`${scope}-gnb-theme-dark`}
            data-theme-option="dark"
            disabled={resolvedTheme === 'dark'}
            onClick={handleThemeClick('dark')}
          >
            <ThemeChipIcon theme="dark" />
          </button>
        </div>
      </div>
    </>
  );
}
