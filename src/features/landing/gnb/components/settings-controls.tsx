import {locales, type AppLocale} from '@/config/site';
import type {ThemePreference} from '@/features/landing/gnb/types';

interface SettingsControlLabels {
  language: string;
  theme: string;
  light: string;
  dark: string;
}

interface SettingsControlsProps {
  scope: 'desktop' | 'mobile';
  locale: AppLocale;
  themePreference: ThemePreference;
  labels: SettingsControlLabels;
  onLocaleChange: (locale: AppLocale) => void;
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export function SettingsControls({
  scope,
  locale,
  themePreference,
  labels,
  onLocaleChange,
  onThemeChange
}: SettingsControlsProps) {
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
            className="gnb-chip"
            aria-pressed={themePreference === 'light'}
            onClick={() => onThemeChange('light')}
          >
            {labels.light}
          </button>
          <button
            type="button"
            className="gnb-chip"
            aria-pressed={themePreference === 'dark'}
            onClick={() => onThemeChange('dark')}
          >
            {labels.dark}
          </button>
        </div>
      </div>
    </>
  );
}
