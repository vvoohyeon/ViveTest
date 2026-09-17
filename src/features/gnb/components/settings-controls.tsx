import type {MouseEvent as ReactMouseEvent} from 'react';

import {localeOptions, resolveHtmlLang, type AppLocale} from '@/config/site';
import {ThemeModeIcon} from '@/features/gnb/components/theme-mode-icon';
import type {ThemePreference} from '@/features/gnb/types';
import {focusRingClassName} from '@/features/ui/button-class-names';

/**
 * 설정 한 벌 — 데스크톱 레이어와 모바일 드로어가 **같은 것**을 쓴다(명세 §2-4 · §2-9).
 *
 * **주장이 둘이면 마크도 둘이다**(규칙 5). 「내가 고른 것」(preference)과 「지금 적용 중인
 * 것」(effective)은 서로 다른 주장이고, 한 마크가 둘을 겸직하면 `System` 을 표현할 자리가
 * 없어진다 — 종전에 이 파일이 정확히 그 상태였다: 컨트롤이 둘(dark·light)뿐이라 「시스템을
 * 따른다」는 상태를 **고를 수도 읽을 수도** 없었고, 한 번 명시 선택을 하면 되돌릴 길이 제품에
 * 없었다. 적용 중인 쪽을 `disabled` 로 만들던 것도 같은 겸직의 결과다.
 *
 * 그래서 컨트롤은 셋이고 순서가 고정이다 — `System` 텍스트 버튼 · dark 스와치 · light 스와치.
 * **해석된 테마에 따라 순서를 바꾸지 않는다**: 같은 것을 두 번 열면 같은 자리에 있어야 한다.
 */

const settingsControlsBaseClassName = 'gnb-settings-controls grid gap-3';
const settingsControlsDesktopClassName =
  `${settingsControlsBaseClassName} gnb-settings-controls-desktop min-w-0`;
const settingsControlsMobileClassName =
  `${settingsControlsBaseClassName} gnb-settings-controls-mobile`;
// 라벨은 행 **위**에 선다 — 설계 정의의 `.vt-settings__row` 가 한 열짜리 grid 다
// (`docs/design/ds/app-components.css:471`). 종전에는 나란히 있었고, 그럴 수밖에 없었다:
// 합성 라벨(`Language ⋅ Theme`)은 제 행에 두면 두 줄로 접혔다.
//
// 다른 것도 한줄 따라온다 — 레이어가 트리거를 덮으며 펼쳐지므로(규칙 8) pill 의 발자국에
// 놓이는 것이 **누를 수 없는 라벨**이 된다. 그 자리에 테마 컸트롤을 두면 레이어를 연 것과
// 같은 자리를 한 번 더 탭했을 때 테마가 바뀜다 — 닫으려는 동작이 다른 일을 한다.
const settingsGridRowClassName = 'gnb-settings-row grid gap-2';
const settingsThemeRowClassName = 'gnb-settings-row gnb-settings-row-theme grid gap-2';
const settingsThemeActionsClassName = 'gnb-settings-theme-actions flex flex-wrap items-center gap-2';
// ds-literal: off-ladder — 0.78rem = 12.48px. 위 drawer 라벨과 같은 값이고 같은 이유다.
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
// ds-literal: off-ladder — 0.8rem = 12.8px. `--overline` 12px 도 `--caption` 13px 도 아니고,
// 칩 하나만 쓰는 크기를 사다리 단계로 올리지 않는다(D-18 이 지속시간에 대해 같은 판단을 했다).
const chipBaseClassName =
  `gnb-chip relative inline-flex min-h-8 cursor-pointer items-center justify-center rounded-full border border-[var(--gnb-chip-border)] bg-[var(--gnb-chip-bg)] px-[10px] py-[5px] text-[0.8rem] font-semibold text-[var(--gnb-chip-ink,var(--ink))] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color] [transition-timing-function:ease] ${focusRingClassName} disabled:cursor-default disabled:opacity-70 [--gnb-chip-bg:var(--surface-muted)] [--gnb-chip-border:var(--hairline)] [--gnb-chip-hover-bg:var(--surface-sunken)] [--gnb-chip-hover-border:var(--border-strong)] [--gnb-chip-hover-shadow:var(--shadow-sm)]`;
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
// a ring instead.
//
// **링은 하나다**(규칙 5). 종전에는 2px 지면 + 2px sage 의 이중 링이었고, 그 바깥 층까지
// 세면 스와치가 8px 자라 보였다 — 규칙 5 가 「과하다」고 적은 그 모양이다. 링은 레이아웃을
// 건드리지 않는 `box-shadow` 로만 그린다(규칙 6).
const chipSwatchSelectedStateClassName =
  'border-[var(--gnb-chip-border)] [box-shadow:0_0_0_2px_var(--accent)]';
const chipUnselectedStateClassName =
  'hover:border-[var(--gnb-chip-hover-border)] hover:bg-[var(--gnb-chip-hover-bg)] hover:shadow-[var(--gnb-chip-hover-shadow)] active:border-[var(--gnb-chip-hover-border)] active:bg-[var(--gnb-chip-hover-bg)]';
// 「지금 적용 중」 배지 점 — sage, 스와치 우상단, 지면 2px 외곽(규칙 5). 절대 위치라 행 높이를
// 건드리지 않는다(규칙 6). 색만으로 말하지 않게 텍스트 대안이 접근 가능한 이름에 함께 간다.
const chipEffectiveBadgeClassName =
  'gnb-chip-effective-badge pointer-events-none absolute right-[-1px] top-[-1px] h-[9px] w-[9px] rounded-full bg-[var(--accent)] [box-shadow:0_0_0_2px_var(--surface-raised)]';
const chipThemePreviewLightClassName =
  '[--gnb-chip-bg:var(--theme-preview-light-bg)] [--gnb-chip-border:var(--theme-preview-light-border)] [--gnb-chip-ink:var(--theme-preview-light-ink)] [--gnb-chip-hover-bg:var(--theme-preview-light-hover-bg)] [--gnb-chip-hover-border:var(--theme-preview-light-hover-border)] [--gnb-chip-hover-shadow:var(--theme-preview-light-hover-shadow)]';
const chipThemePreviewDarkClassName =
  '[--gnb-chip-bg:var(--theme-preview-dark-bg)] [--gnb-chip-border:var(--theme-preview-dark-border)] [--gnb-chip-ink:var(--theme-preview-dark-ink)] [--gnb-chip-hover-bg:var(--theme-preview-dark-hover-bg)] [--gnb-chip-hover-border:var(--theme-preview-dark-hover-border)] [--gnb-chip-hover-shadow:var(--theme-preview-dark-hover-shadow)]';
const chipCheckGlyphClassName = 'gnb-chip-check h-3.5 w-3.5 shrink-0 fill-none stroke-current [stroke-width:2.25]';

function joinClassNames(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

function resolveChipSurfaceClassName(surface: 'theme-preview-light' | 'theme-preview-dark'): string {
  return surface === 'theme-preview-light' ? chipThemePreviewLightClassName : chipThemePreviewDarkClassName;
}

interface SettingsControlLabels {
  /** 테마 `radiogroup` 의 접근 가능한 이름. 화면에 보이는 라벨은 `settings` 다(명세 §3-2). */
  theme: string;
  /** 12 개 칩 묶음의 접근 가능한 이름 — 형태를 지키기로 한 결정이 접근성까지 처분하지 않는다. */
  language: string;
  settings: string;
  system: string;
  light: string;
  dark: string;
  /** 배지 점의 텍스트 대안. 색만으로 상태를 말하지 않는다(WCAG 1.4.1). */
  effective: string;
}

interface SettingsControlsProps {
  scope: 'desktop' | 'mobile';
  locale: AppLocale;
  themePreference: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  labels: SettingsControlLabels;
  onLocaleChange: (locale: AppLocale) => void;
  onThemeChange: (preference: ThemePreference, sourceEl: HTMLElement | null) => void;
}

export function SettingsControls({
  scope,
  locale,
  themePreference,
  resolvedTheme,
  labels,
  onLocaleChange,
  onThemeChange
}: SettingsControlsProps) {
  const handleThemeClick =
    (preference: ThemePreference) => (event: ReactMouseEvent<HTMLButtonElement>) => {
      // 이미 고른 것을 다시 누르는 것은 radio 의 정의상 무의미다. 그렇게 하지 않으면
      // 아무것도 바뀌지 않는 변경을 위해 테마 전환 모션이 통째로 한 번 돌고, 데스크톱에서는
      // 레이어까지 닫힌다.
      if (preference === themePreference) {
        return;
      }

      onThemeChange(preference, event.currentTarget);
    };

  const controlsClassName = scope === 'desktop' ? settingsControlsDesktopClassName : settingsControlsMobileClassName;
  const localeRowClassName = `${settingsGridRowClassName} gnb-settings-row-locale`;
  const controlSizeClassName =
    scope === 'desktop'
      ? 'min-h-[var(--gnb-settings-control-size)]'
      : 'min-h-[var(--tap-min)]';
  const swatchChipClassName = `${chipBaseClassName} gnb-chip-theme ${controlSizeClassName} ${
    scope === 'desktop' ? 'min-w-[var(--gnb-settings-control-size)]' : 'min-w-[var(--tap-min)]'
  } p-0`;
  const systemChipClassName = `${chipBaseClassName} gnb-chip-theme gnb-chip-theme-system ${controlSizeClassName} gap-1 px-[12px]`;
  const localeChipClassName =
    scope === 'desktop' ? chipBaseClassName : `${chipBaseClassName} min-h-[var(--tap-min)] px-[14px]`;
  const themeIconClassName =
    scope === 'desktop'
      ? 'gnb-chip-icon h-[var(--gnb-settings-trigger-icon-size)] w-[var(--gnb-settings-trigger-icon-size)] shrink-0'
      : 'gnb-chip-icon h-4 w-4 shrink-0';

  const followsSystem = themePreference === 'system';

  return (
    <div className={controlsClassName}>
      <div
        className={settingsThemeRowClassName}
        data-testid={`${scope}-gnb-theme-controls`}
        data-theme-preference={themePreference}
      >
        <span className={joinClassNames(settingsLabelClassName, 'leading-none')}>{labels.settings}</span>
        {/*
          `radiogroup` 은 「셋 중 하나」라는 사실을 보조기술에 전하는 유일한 구조다. 세 컨트롤을
          전부 탭 가능하게 두는 것은 APG 의 roving tabindex 에서 벗어나지만 의도적이다 — 이
          묶음은 GNB 순회 안에 있고, 로빙을 걸면 드로어에서 테마 하나만 도달 가능해진다.
        */}
        <div className={settingsThemeActionsClassName} role="radiogroup" aria-label={labels.theme}>
          <button
            type="button"
            className={joinClassNames(
              systemChipClassName,
              followsSystem ? chipSelectedStateClassName : chipUnselectedStateClassName
            )}
            role="radio"
            aria-checked={followsSystem}
            data-testid={`${scope}-gnb-theme-system`}
            data-theme-option="system"
            onClick={handleThemeClick('system')}
          >
            {followsSystem ? (
              <svg viewBox="0 0 24 24" className={chipCheckGlyphClassName} aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            ) : null}
            {labels.system}
          </button>
          {(['dark', 'light'] as const).map((theme) => {
            const isChosen = themePreference === theme;
            // 규칙 5 — 배지 점은 **시스템을 따르는 동안에만** 붙는다. 명시 선택에서는 고른 것이
            // 곧 적용 중인 것이라 구분할 것이 없다.
            const isEffectiveUnderSystem = followsSystem && resolvedTheme === theme;
            const themeLabel = theme === 'light' ? labels.light : labels.dark;

            return (
              <button
                key={theme}
                type="button"
                className={joinClassNames(
                  swatchChipClassName,
                  resolveChipSurfaceClassName(`theme-preview-${theme}`),
                  isChosen ? chipSwatchSelectedStateClassName : chipUnselectedStateClassName
                )}
                role="radio"
                aria-checked={isChosen}
                aria-label={isEffectiveUnderSystem ? `${themeLabel} — ${labels.effective}` : themeLabel}
                title={themeLabel}
                data-testid={`${scope}-gnb-theme-${theme}`}
                data-theme-option={theme}
                data-theme-effective={isEffectiveUnderSystem ? 'true' : undefined}
                data-chip-surface={`theme-preview-${theme}`}
                onClick={handleThemeClick(theme)}
              >
                <ThemeModeIcon theme={theme} className={themeIconClassName} />
                {isEffectiveUnderSystem ? <span className={chipEffectiveBadgeClassName} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className={localeRowClassName} data-testid={`${scope}-gnb-locale-controls`}>
        <div className={chipRowClassName} role="group" aria-label={labels.language}>
          {localeOptions.map(({code, label}) => {
            const isCurrentLocale = code === locale;

            return (
              <button
                key={code}
                type="button"
                // 칩의 글자는 그 언어로 적혀 있다 — `lang` 이 없으면 스크린리더가 12 개를 전부
                // 현재 문서 언어의 발음으로 읽는다. 표시용 BCP 47 태그는 `site.ts` 가 소유한다.
                lang={resolveHtmlLang(code)}
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
