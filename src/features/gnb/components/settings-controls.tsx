import type {MouseEvent as ReactMouseEvent} from 'react';

import {localeOptions, type AppLocale} from '@/config/site';
import {ThemeModeIcon} from '@/features/gnb/components/theme-mode-icon';
import {focusRingClassName} from '@/features/ui/button-class-names';

const settingsControlsBaseClassName = 'gnb-settings-controls grid gap-3';
const settingsControlsDesktopClassName =
  `${settingsControlsBaseClassName} gnb-settings-controls-desktop relative z-[1] col-start-1 row-start-2 min-w-0 pb-[var(--gnb-settings-panel-inner-bottom)]`;
const settingsControlsMobileClassName =
  `${settingsControlsBaseClassName} gnb-settings-controls-mobile`;
const settingsGridRowClassName = 'gnb-settings-row grid gap-2';
const settingsThemeRowClassName = 'gnb-settings-row gnb-settings-row-theme flex items-center justify-between gap-3';
const settingsThemeHeadingClassName =
  'gnb-settings-theme-heading flex min-h-[var(--gnb-settings-trigger-size,40px)] flex-1 items-center';
const settingsThemeActionsClassName = 'gnb-settings-theme-actions flex shrink-0 items-center justify-end gap-2';
const settingsLabelClassName =
  'gnb-settings-label text-[0.78rem] font-bold uppercase tracking-[0.03em] text-[var(--ink-body)]';
const chipRowClassName = 'gnb-chip-row flex flex-wrap gap-2';
// 32px is deliberate for the 12-locale grid on the desktop layer: WCAG 2.2 AA's
// target floor there is 24px, design.md 4.10's 44px list names choices, Read more,
// the close button and the hamburger -- not these -- and at 44 each the grid becomes
// a wall. Inside the drawer the same chips are a primary touch target and take the
// floor, which is what the mobile scope below does.
// 포커스 링은 `focusRingClassName` 한 벌이다 — 칩도 pill 도 버튼도 같은 링을 쓴다.
// 종전의 두 층 box-shadow 는 안쪽 층에 `--canvas` 를 칠했는데, 그것은 요소의 지면이 아니라
// 페이지의 지면이라 칩 위에서 옅은 크림색 테로 보였다(실측 2026-09-10).
const chipBaseClassName =
  `gnb-chip inline-flex min-h-8 cursor-pointer items-center justify-center rounded-full border border-[var(--gnb-chip-border)] bg-[var(--gnb-chip-bg)] px-[10px] py-[5px] text-[0.8rem] font-semibold text-[var(--gnb-chip-ink,var(--ink))] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color] [transition-timing-function:ease] ${focusRingClassName} disabled:cursor-default disabled:opacity-70 [--gnb-chip-bg:var(--surface-muted)] [--gnb-chip-border:var(--hairline)] [--gnb-chip-hover-bg:var(--surface-sunken)] [--gnb-chip-hover-border:var(--border-strong)] [--gnb-chip-hover-shadow:var(--shadow-sm)]`;
// design.md 7.6 fixes the active chip: `--sage-muted` fill, `--accent-fg` text,
// transparent border, no hover.
// The ink goes through `--gnb-chip-ink`, and the base above supplies its default as a
// CSS fallback rather than as a second definition. Two arbitrary-property utilities on
// one element carry equal specificity, so which one lands is decided by Tailwind's emit
// order, not by this file -- measured: `var(--accent-fg)` lost to the base's
// `var(--ink)` while `var(--theme-preview-dark-ink)` beat it. With
// the default moved into the fallback, exactly one rule ever defines the variable.
const chipSelectedStateClassName =
  'border-transparent bg-[var(--sage-muted)] [--gnb-chip-ink:var(--accent-fg)] [box-shadow:none]';
// A swatch's content IS a colour, so selection cannot be a fill swap: painting the
// light swatch sage hides the very thing it is showing, and the unselected swatch --
// still wearing its own strong colour -- then reads as the chosen one. Selection is
// a ring instead. Its inner gap is `--surface-raised` -- the surface both the
// settings layer and the drawer are painted with -- so the ring reads as a ring
// rather than as a halo floating on a mismatched ground.
const chipSwatchSelectedStateClassName =
  'border-[var(--gnb-chip-border)] [box-shadow:0_0_0_2px_var(--surface-raised),0_0_0_4px_var(--accent)]';
const chipUnselectedStateClassName =
  'hover:border-[var(--gnb-chip-hover-border)] hover:bg-[var(--gnb-chip-hover-bg)] hover:shadow-[var(--gnb-chip-hover-shadow)] active:border-[var(--gnb-chip-hover-border)] active:bg-[var(--gnb-chip-hover-bg)]';
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
      : `${chipBaseClassName} gnb-chip-theme min-h-[var(--tap-min)] min-w-[var(--tap-min)] p-0`;
  const localeChipClassName =
    scope === 'desktop' ? chipBaseClassName : `${chipBaseClassName} min-h-[var(--tap-min)] px-[14px]`;
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
            const chipSurface = `theme-preview-${theme}` as const;

            return (
              <button
                key={theme}
                type="button"
                className={joinClassNames(
                  themeChipClassName,
                  resolveChipSurfaceClassName(chipSurface),
                  isCurrentTheme ? chipSwatchSelectedStateClassName : chipUnselectedStateClassName
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
