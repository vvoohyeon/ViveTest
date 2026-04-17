import type {MouseEvent as ReactMouseEvent} from 'react';

import {localeOptions, type AppLocale} from '@/config/site';
import {ThemeModeIcon} from '@/features/landing/gnb/components/theme-mode-icon';

const settingsControlsBaseClassName = 'gnb-settings-controls grid gap-3';
const settingsControlsDesktopClassName =
  `${settingsControlsBaseClassName} gnb-settings-controls-desktop relative z-[1] col-start-1 row-start-2 min-w-0 pb-[var(--gnb-settings-panel-inner-bottom)]`;
const settingsControlsMobileClassName = `${settingsControlsBaseClassName} gnb-settings-controls-mobile`;
const settingsGridRowClassName = 'gnb-settings-row grid gap-2';
const settingsThemeRowClassName = 'gnb-settings-row gnb-settings-row-theme flex items-center justify-between gap-3';
const settingsThemeHeadingClassName =
  'gnb-settings-theme-heading flex min-h-[var(--gnb-settings-trigger-size,40px)] flex-1 items-center';
const settingsThemeActionsClassName = 'gnb-settings-theme-actions flex shrink-0 items-center justify-end gap-2';
const settingsLabelClassName =
  'gnb-settings-label text-[0.78rem] font-bold uppercase tracking-[0.03em] text-[var(--muted-ink)]';
const chipRowClassName = 'gnb-chip-row flex flex-wrap gap-2';
const chipBaseClassName =
  "gnb-chip inline-flex cursor-pointer items-center justify-center rounded-full border border-[var(--gnb-chip-border)] bg-[var(--gnb-chip-bg)] px-[10px] py-[5px] text-[0.8rem] font-semibold text-[var(--gnb-chip-ink)] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color] [transition-timing-function:ease] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring-inner),0_0_0_4px_var(--focus-ring-outer)] disabled:cursor-default disabled:opacity-70 [--gnb-chip-bg:var(--interactive-neutral-bg)] [--gnb-chip-border:var(--interactive-neutral-border)] [--gnb-chip-ink:var(--interactive-neutral-ink)] [--gnb-chip-hover-bg:var(--landing-answer-bg-hover)] [--gnb-chip-hover-border:var(--landing-answer-border-hover)] [--gnb-chip-hover-shadow:var(--landing-answer-shadow-hover)]";
const chipSelectedStateClassName = 'border-transparent bg-[var(--interactive-accent-bg-strong)] [box-shadow:none]';
const chipUnselectedStateClassName =
  'hover:border-[var(--gnb-chip-hover-border)] hover:bg-[var(--gnb-chip-hover-bg)] hover:shadow-[var(--gnb-chip-hover-shadow)]';
const chipThemePreviewLightClassName =
  '[--gnb-chip-bg:var(--theme-preview-light-bg)] [--gnb-chip-border:var(--theme-preview-light-border)] [--gnb-chip-ink:var(--theme-preview-light-ink)] [--gnb-chip-hover-bg:var(--theme-preview-light-hover-bg)] [--gnb-chip-hover-border:var(--theme-preview-light-hover-border)] [--gnb-chip-hover-shadow:var(--theme-preview-light-hover-shadow)]';
const chipThemePreviewDarkClassName =
  '[--gnb-chip-bg:var(--theme-preview-dark-bg)] [--gnb-chip-border:var(--theme-preview-dark-border)] [--gnb-chip-ink:var(--theme-preview-dark-ink)] [--gnb-chip-hover-bg:var(--theme-preview-dark-hover-bg)] [--gnb-chip-hover-border:var(--theme-preview-dark-hover-border)] [--gnb-chip-hover-shadow:var(--theme-preview-dark-hover-shadow)]';

function joinClassNames(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

function resolveChipSurfaceClassName(surface: 'theme-preview-light' | 'theme-preview-dark' | undefined): string | undefined {
  if (surface === 'theme-preview-light') {
    return chipThemePreviewLightClassName;
  }

  if (surface === 'theme-preview-dark') {
    return chipThemePreviewDarkClassName;
  }

  return undefined;
}

interface SettingsControlLabels {
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

export function SettingsControls({
  scope,
  locale,
  resolvedTheme,
  labels,
  onLocaleChange,
  onThemeChange
}: SettingsControlsProps) {
  const orderedThemeOptions =
    resolvedTheme === 'light'
      ? (['dark', 'light'] as const)
      : (['light', 'dark'] as const);

  const handleThemeClick =
    (theme: 'light' | 'dark') => (event: ReactMouseEvent<HTMLButtonElement>) => {
      onThemeChange(theme, event.currentTarget);
    };

  const controlsClassName = scope === 'desktop' ? settingsControlsDesktopClassName : settingsControlsMobileClassName;
  const themeRowClassName =
    scope === 'desktop'
      ? `${settingsThemeRowClassName} min-h-[var(--gnb-settings-trigger-size)] pl-[var(--gnb-settings-panel-inner-left)]`
      : settingsThemeRowClassName;
  const localeRowClassName =
    scope === 'desktop'
      ? `${settingsGridRowClassName} gnb-settings-row-locale pl-[var(--gnb-settings-panel-inner-left)] pr-0`
      : `${settingsGridRowClassName} gnb-settings-row-locale`;
  const themeChipClassName =
    scope === 'desktop'
      ? `${chipBaseClassName} gnb-chip-theme min-h-[var(--gnb-settings-trigger-size)] min-w-[var(--gnb-settings-trigger-size)] p-0`
      : `${chipBaseClassName} gnb-chip-theme min-h-9 min-w-9 p-0`;
  const localeChipClassName = chipBaseClassName;
  const themeIconClassName =
    scope === 'desktop'
      ? 'gnb-chip-icon h-[var(--gnb-settings-trigger-icon-size)] w-[var(--gnb-settings-trigger-icon-size)] shrink-0'
      : 'gnb-chip-icon h-4 w-4 shrink-0';

  return (
    <div className={controlsClassName}>
      <div className={themeRowClassName} data-testid={`${scope}-gnb-theme-controls`}>
        <div className={settingsThemeHeadingClassName}>
          <span
            className={joinClassNames(
              settingsLabelClassName,
              'leading-none supports-[font:-apple-system-body]:translate-y-[2px]'
            )}
          >
            {labels.theme}
          </span>
        </div>
        <div className={settingsThemeActionsClassName}>
          {orderedThemeOptions.map((theme) => {
            const isCurrentTheme = resolvedTheme === theme;
            const themeLabel = theme === 'light' ? labels.light : labels.dark;
            const chipSurface = isCurrentTheme ? undefined : (`theme-preview-${theme}` as const);

            return (
              <button
                key={theme}
                type="button"
                className={joinClassNames(
                  themeChipClassName,
                  resolveChipSurfaceClassName(chipSurface),
                  isCurrentTheme ? chipSelectedStateClassName : chipUnselectedStateClassName
                )}
                aria-pressed={isCurrentTheme}
                aria-label={themeLabel}
                title={themeLabel}
                data-testid={`${scope}-gnb-theme-${theme}`}
                data-theme-option={theme}
                data-chip-surface={chipSurface}
                disabled={isCurrentTheme}
                onClick={handleThemeClick(theme)}
              >
                <ThemeModeIcon theme={theme} className={themeIconClassName} />
              </button>
            );
          })}
        </div>
      </div>

      <div className={localeRowClassName} data-testid={`${scope}-gnb-locale-controls`}>
        <div className={chipRowClassName}>
          {localeOptions.map(({code, label}) => {
            const isCurrentLocale = code === locale;

            return (
              <button
                key={code}
                type="button"
                className={joinClassNames(
                  localeChipClassName,
                  isCurrentLocale ? chipSelectedStateClassName : chipUnselectedStateClassName
                )}
                aria-pressed={isCurrentLocale}
                disabled={isCurrentLocale}
                onClick={isCurrentLocale ? undefined : () => onLocaleChange(code)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
