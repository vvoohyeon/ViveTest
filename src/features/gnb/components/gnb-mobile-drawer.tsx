'use client';

import Link from 'next/link';
import type {KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent} from 'react';

import type {AppLocale} from '@/config/site';
import {
  gnbControlHitClassName,
  gnbControlIconShellClassName
} from '@/features/gnb/components/gnb-control-class-names';
import {SettingsControls} from '@/features/gnb/components/settings-controls';
import type {MobileMenuState, ThemePreference} from '@/features/gnb/types';
import {ConsentRecallLink} from '@/features/landing/shell/consent-recall-link';
import {useOverlayHistoryEntry} from '@/features/ui/use-overlay-history-entry';

/**
 * GNB 드로어 — 명세 §2-4.
 *
 * **위에서 아래로 헤더 → 설정 → 여백 → 이동이다.** 종전에는 이동이 위였고 설정이 `mt-auto` 로
 * 바닥에 붙어 있었다. 규칙 7 이 그 순서를 뒤집는다: 엄지가 닿는 자리를 자주 쓰는 것(이동)이
 * 갖고, 자주 바꾸지 않는 설정이 위로 간다.
 *
 * **`aria-modal` 이 사실이 되게 한다.** 종전에는 그 속성이 붙어 있었지만 실측(2026-09-16)
 * 드로어를 연 채 Tab 을 22 회 누르면 17 번째부터 여섯 번이 **드로어 뒤의 랜딩 카드**로 나갔다.
 * 마지막 대상에서 Tab 이 브라우저에게 넘어가기 때문이고, 그 뒤에 있는 것은 보이지도 않는다.
 * 순회를 여기서 닫는다 — 트랩의 실제 구현은 `use-gnb-tab-routing` 이 갖고(GNB 전체가 한
 * 순회 규칙을 쓴다), 이 컴포넌트는 그 순회에 들어갈 컨트롤만 정한다.
 *
 * **헤더에 보이는 닫기가 있다.** 패널이 바 위층(z 1200 > 1100)이라 열린 동안 햄버거를 덮는다 —
 * 종전에는 그래서 화면에 닫는 어포던스가 하나도 없었다. 그 컨트롤을 두면 순회 순서가 바뀌고
 * 키보드 검사 둘이 그것을 고정하고 있었는데, **고정된 쪽이 명세에 어긋난 상태**였다.
 */

const gnbMobileLayerClassName = 'gnb-mobile-layer fixed inset-0 z-[1200]';
const gnbMobileBackdropClassName =
  'gnb-mobile-backdrop absolute inset-0 bg-[var(--overlay-scrim-strong)] [transition:opacity_180ms_ease] data-[state=closing]:opacity-0';
// `--surface-raised` and a `--border-strong` edge, per design.md 6.8. The edge is
// load-bearing in dark: the scrim can only dim a near-black page 1.04:1, so the
// panel's own boundary is what separates it (4.73:1 against the scrimmed ground).
//
// 높이는 `100dvh` 하나다. 종전에는 `h-screen max-h-screen` 두 유틸리티가 함께 붙어 있었고,
// 그 둘은 `100vh` 를 쓴다 — 주소 표시줄이 보이는 동안 뷰포트보다 커져 드로어 바닥이 잘린다.
const gnbMobilePanelClassName =
  'gnb-mobile-panel absolute right-0 top-0 flex w-[min(87vw,340px)] flex-col gap-5 overflow-y-auto border-l border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 pt-4 pb-[calc(32px+env(safe-area-inset-bottom,0px))] opacity-100 shadow-[var(--shadow-overlay)] overscroll-contain [height:100dvh] [max-height:100dvh] [-webkit-overflow-scrolling:touch] [transform:translateX(0)] [transition:transform_180ms_ease,opacity_180ms_ease] motion-reduce:[transition:opacity_180ms_ease] motion-reduce:data-[state=closing]:translate-x-0 data-[state=closing]:translate-x-[12px] data-[state=closing]:opacity-0';
const gnbMobileHeadClassName = 'gnb-mobile-head flex min-h-[var(--tap-min)] items-center justify-between gap-3';
// ds-literal: off-ladder — 0.78rem = 12.48px. 가장 가까운 `--overline` 은 12px 이고 무게도
// 600 인데 이 라벨은 700 이다. 12.48px 단계는 사다리에 없다.
const gnbMobileHeadLabelClassName =
  'gnb-mobile-head-label text-[0.78rem] font-bold uppercase leading-none tracking-[0.03em] text-[color:var(--muted-aa)]';
const gnbMobileCloseGlyphClassName =
  'gnb-mobile-close-glyph h-[18px] w-[18px] fill-none stroke-current [stroke-linecap:round] [stroke-width:1.75]';
const gnbMobileSettingsClassName = 'gnb-mobile-settings grid gap-3';
const gnbMobileLinksClassName = 'gnb-mobile-links mt-auto grid gap-1';
const gnbMobileLinkClassName =
  'gnb-mobile-link -mx-3 flex min-h-[52px] items-center gap-2 rounded-[8px] px-3 text-base font-semibold [transition:background-color_140ms_ease] motion-reduce:transition-none hover:bg-[var(--surface-sunken)] active:bg-[var(--surface-strong)]';
const gnbMobileLinkCurrentMarkerClassName =
  'gnb-mobile-link-marker pointer-events-none h-[5px] w-[5px] flex-none rounded-full bg-[var(--accent)]';

export interface GnbMobileDrawerNavItem {
  key: string;
  href: string;
  label: string;
  scroll: boolean;
  current: boolean;
}

interface GnbMobileDrawerProps {
  panelId: string;
  state: MobileMenuState;
  locale: AppLocale;
  themePreference: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  labels: {
    menu: string;
    close: string;
    theme: string;
    language: string;
    settings: string;
    system: string;
    light: string;
    dark: string;
    effective: string;
  };
  navItems: readonly GnbMobileDrawerNavItem[];
  onLocaleChange: (locale: AppLocale) => void;
  onThemeChange: (preference: ThemePreference, sourceEl: HTMLElement | null) => void;
  onRequestClose: () => void;
  onCloseImmediate: () => void;
  onKeyDownCapture: (event: ReactKeyboardEvent<HTMLElement>) => void;
  onBackdropPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onBackdropPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onBackdropPointerEnd: () => void;
}

export function GnbMobileDrawer({
  panelId,
  state,
  locale,
  themePreference,
  resolvedTheme,
  labels,
  navItems,
  onLocaleChange,
  onThemeChange,
  onRequestClose,
  onCloseImmediate,
  onKeyDownCapture,
  onBackdropPointerDown,
  onBackdropPointerMove,
  onBackdropPointerEnd
}: GnbMobileDrawerProps) {
  // 규칙 3 — 시스템 뒤로가기가 오버레이 층 **전부**를 닫는다. 시트만 답하고 드로어는 페이지를
  // 떠나게 두면 같은 기기에서 같은 제스처가 두 뜻이 된다.
  useOverlayHistoryEntry({
    layerId: 'gnb-mobile-drawer',
    open: state === 'open',
    onPopClose: onCloseImmediate
  });

  return (
    <div className={gnbMobileLayerClassName} data-state={state} data-testid="gnb-mobile-layer">
      <div
        className={gnbMobileBackdropClassName}
        data-testid="gnb-mobile-backdrop"
        data-state={state}
        onPointerDown={onBackdropPointerDown}
        onPointerMove={onBackdropPointerMove}
        onPointerUp={onBackdropPointerEnd}
        onPointerCancel={onBackdropPointerEnd}
      />
      <div
        id={panelId}
        className={gnbMobilePanelClassName}
        role="dialog"
        aria-modal="true"
        aria-label={labels.menu}
        data-state={state}
        data-testid="gnb-mobile-menu-panel"
        onKeyDownCapture={onKeyDownCapture}
      >
        <div className={gnbMobileHeadClassName}>
          <span className={gnbMobileHeadLabelClassName}>{labels.menu}</span>
          <button
            type="button"
            className={gnbControlHitClassName}
            aria-label={labels.close}
            data-testid="gnb-mobile-menu-close"
            onClick={onRequestClose}
          >
            <span className={gnbControlIconShellClassName}>
              <svg viewBox="0 0 24 24" className={gnbMobileCloseGlyphClassName} aria-hidden="true">
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
            </span>
          </button>
        </div>

        <div className={gnbMobileSettingsClassName}>
          <SettingsControls
            scope="mobile"
            locale={locale}
            themePreference={themePreference}
            resolvedTheme={resolvedTheme}
            labels={labels}
            onLocaleChange={onLocaleChange}
            onThemeChange={onThemeChange}
          />
          {/* 행을 차지하지 않는 우측 정렬 얇은 링크다(명세 규칙 7). 누르면 드로어를 먼저
              닫는다 — 드로어가 열린 채면 배너가 자기 스크림 뒤에 뜬다. */}
          <div className="gnb-mobile-consent-recall flex justify-end">
            <ConsentRecallLink testId="gnb-mobile-consent-recall" onActivate={onCloseImmediate} />
          </div>
        </div>

        {/* 이동이 최하단이다(규칙 7) — `mt-auto` 가 위의 여백을 전부 먹는다. */}
        <nav className={gnbMobileLinksClassName} aria-label="Mobile Primary">
          {navItems.map(({key, href, label, scroll, current}) => (
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
          ))}
        </nav>
      </div>
    </div>
  );
}
