'use client';

import {useEffect, useRef, useState} from 'react';

import {
  buttonBaseClassName,
  buttonPrimaryClassName,
  buttonPrimaryPressedClassName,
  buttonQuietClassName,
  buttonSecondaryClassName
} from '@/features/ui/button-class-names';

/**
 * SSR/최초 렌더의 **추정값**이지 하한이 아니다. 종전에는 `Math.max` 의 하한이라 실측 높이가
 * 이보다 낮아도 절대 줄지 않았고, 실측(2026-09-10, chromium 1280×720) 배너 80px · 하단 gap
 * 16px 에 대해 spacer 가 120px 을 잡아 **24px 과다 예약**이었다. 마운트 뒤에는 실측이 정본이다.
 */
const SSR_BANNER_SPACER_ESTIMATE_PX = 120;
const CONSENT_BANNER_SPACER_CLASS = 'telemetry-consent-banner-spacer flex-none';
const CONSENT_BANNER_LAYER_CLASS =
  'telemetry-consent-banner-layer pointer-events-none fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-[1075] flex justify-center px-4';

/**
 * 「나를 덮지 말라」는 한 방향 DOM 계약. 이 표식을 단 원소와 배너가 실제로 겹치는 동안만
 * 배너가 비켜선다.
 *
 * **표식은 카드 루트가 아니라 카드가 실제로 그리는 상자에 단다.** 실측(2026-09-10, chromium
 * 1280×720): 확장 카드의 루트가 `[468, 720]` 일 때 shell frame 은 `[468, 749]` 로 29px 더
 * 내려온다 — 루트로 재면 그 29px 만큼 가림을 놓친다.
 *
 * 왜 기하로 재고 확장 상태로 재지 않는가: 배너는 뷰포트 고정이고 카드는 문서 흐름이라 둘의
 * 겹침은 **스크롤 위치의 함수**다. 같은 카드가 화면 중앙에서는 0px, 바닥에서는 80px 겹친다
 * (실측). 그래서 「확장 중이면 숨긴다」는 가리지도 않는 상황에서 동의 UI 를 지우고,
 * 「확장 기하에 하단 여유를 준다」는 한 칸 더 스크롤하면 무너진다.
 */
export const CONSENT_BANNER_AVOID_ATTRIBUTE = 'data-consent-banner-avoid';
const CONSENT_BANNER_AVOID_SELECTOR = `[${CONSENT_BANNER_AVOID_ATTRIBUTE}]`;
/** 숨김은 `visibility` 로 한다 — 레이아웃을 남겨 배너 사각형을 계속 잴 수 있고, 접근성 트리와 탭 순서에서는 함께 빠진다. */
const CONSENT_BANNER_OCCLUDED_CLASS = 'invisible opacity-0';
// `.vt-banner` — floating 표면이되 scrim 은 없다. 배너는 페이지 **위에** 떠 있지만 아무것도
// 막지 않으므로, 아닌 것(모달)처럼 읽혀서는 안 된다. 종전에는 94% 반투명 패널에
// `--surface-divider` 를 두르고 18px 반경이었다.
// 배너의 접힘 경계는 저장소의 유일한 모바일 경계(`MOBILE_MAX_VIEWPORT_WIDTH`, `layout-plan.ts`)를
// 따른다. 종전 값 719 는 저장소·문서·테스트 어디에도 근거가 없는 고아 임계값이었고(전수 검색
// 결과 이 파일 7 곳이 유일한 출현), 그 때문에 브라우저가 받는 폭 경계가 두 벌로 갈려 있었다.
// 리터럴로 적을 수밖에 없는 것은 Tailwind 임의 variant 가 TS 상수를 읽지 못하기 때문이고,
// 그 결합은 `tests/unit/mobile-breakpoint-literals.test.ts` 가 고정한다 — 그 검사는 소유자
// 목록이 아니라 `src` 전수를 훑으므로 이 파일 밖에 생긴 같은 리터럴도 함께 잡는다.
const CONSENT_BANNER_SURFACE_CLASS =
  'rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-raised)] shadow-[var(--shadow-lg)]';
// 어휘는 `@/features/ui/button-class-names` 가 갖는다. 배너가 더하는 것은 표식 클래스뿐이고,
// 조합은 셋 다 색만 전이하는 바탕이다 — 배너의 버튼은 이동하지 않으므로 lift 도 disabled 도 없다.
const CONSENT_BUTTON_BASE_CLASS = ['telemetry-consent-banner-button', buttonBaseClassName].join(' ');
const CONSENT_PRIMARY_BUTTON_CLASS = [
  CONSENT_BUTTON_BASE_CLASS,
  'telemetry-consent-banner-button-accent',
  buttonPrimaryClassName,
  buttonPrimaryPressedClassName
].join(' ');
// 거부는 수락과 **같은 버튼 무게**를 유지한다. 명세 표본은 이 자리에 quiet 를 두지만, 배너의
// 두 선택지는 서로 대칭인 동의 응답이고 어느 한쪽을 텍스트로 낮추면 그 대칭이 깨진다. quiet 는
// 셋째 행동(설정)이 가져간다. 지시 오버레이의 거부는 흐름을 빠져나가는 탈출구라 다르다.
const CONSENT_SECONDARY_BUTTON_CLASS = [
  CONSENT_BUTTON_BASE_CLASS,
  'telemetry-consent-banner-button-neutral',
  buttonSecondaryClassName
].join(' ');
const CONSENT_LINK_CLASS = [
  CONSENT_BUTTON_BASE_CLASS,
  'telemetry-consent-banner-link',
  buttonQuietClassName
].join(' ');

interface ConsentBannerProps {
  regionLabel: string;
  message: string;
  primaryLabel: string;
  secondaryLabel: string;
  preferencesLabel: string;
  preferencesTitle: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onPreferencesAction?: () => void;
  rootTestId?: string;
  primaryTestId?: string;
  secondaryTestId?: string;
  preferencesTestId?: string;
}

export function ConsentBanner({
  regionLabel,
  message,
  primaryLabel,
  secondaryLabel,
  preferencesLabel,
  preferencesTitle,
  onPrimaryAction,
  onSecondaryAction,
  onPreferencesAction,
  rootTestId = 'telemetry-consent-banner',
  primaryTestId = 'telemetry-consent-accept',
  secondaryTestId = 'telemetry-consent-deny',
  preferencesTestId = 'telemetry-consent-preferences'
}: ConsentBannerProps) {
  const bannerRef = useRef<HTMLElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [spacerHeight, setSpacerHeight] = useState(SSR_BANNER_SPACER_ESTIMATE_PX);
  const [isOccluding, setIsOccluding] = useState(false);

  useEffect(() => {
    const bannerElement = bannerRef.current;
    const layerElement = layerRef.current;
    if (!bannerElement || !layerElement) {
      return;
    }

    /**
     * spacer 가 예약해야 하는 것은 배너 상자만이 아니라 **배너가 바닥에서 띄운 만큼까지**다.
     * 그 오프셋은 `max(16px, env(safe-area-inset-bottom))` 이라 상수로 적을 수 없으므로
     * 뷰포트와 레이어 사각형의 차로 잰다 — safe-area 가 있는 기기에서도 그대로 따라간다.
     */
    const updateSpacerHeight = () => {
      const bannerHeightPx = Math.ceil(bannerElement.getBoundingClientRect().height);
      const bottomGapPx = Math.max(0, Math.round(window.innerHeight - layerElement.getBoundingClientRect().bottom));
      setSpacerHeight(bannerHeightPx + bottomGapPx);
    };

    updateSpacerHeight();
    window.addEventListener('resize', updateSpacerHeight);

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', updateSpacerHeight);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateSpacerHeight();
    });
    resizeObserver.observe(bannerElement);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSpacerHeight);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let frameHandle: number | null = null;

    const intersectsBanner = () => {
      const bannerElement = bannerRef.current;
      if (!bannerElement) {
        return false;
      }

      // 배너가 포커스를 품고 있으면 비켜서지 않는다. `visibility: hidden` 은 탭 순서에서
      // 빠지는 것이라, 눌리고 있던 동의 버튼이 사라지면 포커스가 문서로 떨어진다.
      if (bannerElement.contains(document.activeElement)) {
        return false;
      }

      const bannerRect = bannerElement.getBoundingClientRect();
      for (const avoidElement of document.querySelectorAll(CONSENT_BANNER_AVOID_SELECTOR)) {
        const avoidRect = avoidElement.getBoundingClientRect();
        if (avoidRect.width <= 0 || avoidRect.height <= 0) {
          continue;
        }

        if (
          avoidRect.left < bannerRect.right &&
          avoidRect.right > bannerRect.left &&
          avoidRect.top < bannerRect.bottom &&
          avoidRect.bottom > bannerRect.top
        ) {
          return true;
        }
      }

      return false;
    };

    /**
     * 표식이 하나라도 있는 동안에만 프레임 루프를 돌린다. 확장은 hover 로 소멸하는 일시
     * 상태이므로 루프도 그동안만 존재한다 — 쉴 때의 비용은 0 이고, 확장 모션(280ms 동안
     * 프레임이 아래로 29px 자란다)과 그 사이의 스크롤을 같은 방식으로 따라간다.
     */
    const runFrame = () => {
      setIsOccluding(intersectsBanner());
      frameHandle = document.querySelector(CONSENT_BANNER_AVOID_SELECTOR)
        ? window.requestAnimationFrame(runFrame)
        : null;
    };

    const syncFrameLoop = () => {
      if (frameHandle !== null) {
        return;
      }

      if (!document.querySelector(CONSENT_BANNER_AVOID_SELECTOR)) {
        setIsOccluding(false);
        return;
      }

      frameHandle = window.requestAnimationFrame(runFrame);
    };

    syncFrameLoop();

    if (typeof MutationObserver === 'undefined') {
      return () => {
        if (frameHandle !== null) {
          window.cancelAnimationFrame(frameHandle);
        }
      };
    }

    // 표식은 원소가 마운트되면서 함께 오기도 하고(desktop shell frame) 값이 바뀌기도 하므로
    // `childList` 와 속성 변경을 함께 본다. 콜백은 선택자 하나만 확인한다.
    const mutationObserver = new MutationObserver(syncFrameLoop);
    mutationObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [CONSENT_BANNER_AVOID_ATTRIBUTE]
    });

    return () => {
      mutationObserver.disconnect();
      if (frameHandle !== null) {
        window.cancelAnimationFrame(frameHandle);
      }
    };
  }, []);

  return (
    <>
      <div className={CONSENT_BANNER_SPACER_CLASS} aria-hidden="true" style={{height: `${spacerHeight}px`}} />
      <div ref={layerRef} className={CONSENT_BANNER_LAYER_CLASS}>
        <section
          ref={bannerRef}
          data-occluding={isOccluding ? 'true' : 'false'}
          className={`telemetry-consent-banner pointer-events-auto ${isOccluding ? CONSENT_BANNER_OCCLUDED_CLASS : ''} flex w-full max-w-[1280px] items-center justify-between gap-5 px-5 py-4 max-[767px]:flex-wrap max-[767px]:justify-start max-[767px]:gap-[14px] max-[767px]:p-[14px] ${CONSENT_BANNER_SURFACE_CLASS}`}
          aria-label={regionLabel}
          data-testid={rootTestId}
        >
          <p className="telemetry-consent-banner-message m-0 min-w-0 flex-1 basis-[520px] [font:var(--body-sm)] text-[var(--ink-body)] max-[767px]:basis-full">
            {message}
          </p>
          <div className="telemetry-consent-banner-actions flex shrink-0 flex-wrap items-center justify-end gap-2 max-[767px]:basis-full max-[767px]:justify-start">
            <button
              type="button"
              className={CONSENT_PRIMARY_BUTTON_CLASS}
              data-testid={primaryTestId}
              onClick={onPrimaryAction}
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              className={CONSENT_SECONDARY_BUTTON_CLASS}
              data-testid={secondaryTestId}
              onClick={onSecondaryAction}
            >
              {secondaryLabel}
            </button>
            <button
              type="button"
              className={CONSENT_LINK_CLASS}
              data-testid={preferencesTestId}
              title={preferencesTitle}
              onClick={onPreferencesAction}
            >
              {preferencesLabel}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
