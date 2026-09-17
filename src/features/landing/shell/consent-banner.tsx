'use client';

import {useEffect, useRef, useState} from 'react';

import {
  buttonBaseClassName,
  buttonPrimaryClassName,
  buttonQuietClassName,
  focusRingClassName
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
// 조합은 색만 전이하는 바탕이다 — 배너의 버튼은 이동하지 않으므로 lift 도 disabled 도 없다.
const CONSENT_BUTTON_BASE_CLASS = ['telemetry-consent-banner-button', buttonBaseClassName].join(' ');
const CONSENT_PRIMARY_BUTTON_CLASS = [
  CONSENT_BUTTON_BASE_CLASS,
  'telemetry-consent-banner-button-accent',
  buttonPrimaryClassName
].join(' ');
// **거부는 평문 텍스트 버튼이다.** 종전에는 여기가 수락과 같은 무게(secondary)였고 그 이유로
// 「두 선택지는 대칭인 동의 응답이라 한쪽을 낮추면 대칭이 깨진다」를 적고 있었다. 2026-09-14
// 시각·인터랙션 명세가 사용자 확인 하에 반대로 정했다(규칙 4) — 비대칭이 목적이고, 시각 무게가
// 낮아야 누르기 꺼려진다. 이후 외부 리뷰의 「거부를 다시 올리라」는 권고는 기각됐다(BQ-46).
const CONSENT_SECONDARY_BUTTON_CLASS = [
  CONSENT_BUTTON_BASE_CLASS,
  'telemetry-consent-banner-button-quiet',
  buttonQuietClassName
].join(' ');
// 재호출에서 「지난번에 이것을 골랐다」를 입은 평문 버튼. `--sage-muted` + `--accent-fg` 는 이
// 저장소가 선택됨을 말하는 방식 그대로다.
//
// `!` 가 붙는 이유는 `buttonQuietClassName` 이 같은 속성의 hover 변종을 이미 갖고 있어서다 —
// 한 원소 위에서 같은 속성을 두 유틸리티가 정하면 명시도가 같아 Tailwind 의 emit 순서가 승자를
// 정한다(L10). 문자열 순서로는 이길 수 없다.
const CONSENT_PREVIOUS_CHOICE_CLASS =
  'telemetry-consent-banner-previous-choice !bg-[var(--sage-muted)] !text-[var(--accent-fg)] hover:!bg-[var(--sage-muted)] hover:!text-[var(--accent-fg)]';
// 닫기 X 는 재호출 배너에만 있다. 첫 방문 배너에 두면 「선택하지 않음」이라는 네 번째 답이
// 생긴다 — 거기서는 선택이 곧 닫기다(명세 §2-5).
//
// 링의 offset 이 안쪽(-2px)인 것은 이 버튼이 배너의 우상단 모서리에 붙어 있어서다. 바깥으로
// 그리면 링이 배너 경계 밖으로 나간다.
const CONSENT_CLOSE_BUTTON_CLASS = [
  'telemetry-consent-banner-close absolute right-2 top-2 grid h-[var(--tap-min)] w-[var(--tap-min)] cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-[var(--muted-aa)]',
  'hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] active:bg-[var(--surface-strong)] active:text-[var(--ink)]',
  '[transition-property:background-color,color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-standard)] motion-reduce:transition-none',
  'focus-visible:[outline:2px_solid_var(--focus-ring)] focus-visible:[outline-offset:-2px]'
].join(' ');
// 닫기가 있는 배너는 본문이 그 자리를 비워 준다. 절대 위치 형제가 침범한 영역 **안에서**
// 텍스트를 흘리면 첫 줄의 마지막 낱말 위에 X 가 얹힌다(명세 §4 결함 1 과 같은 종류).
const CONSENT_BODY_DISMISSIBLE_CLASS = 'pr-[calc(var(--tap-min)_+_8px)]';

/** 지난 선택의 체크 글리프. 14×14 · stroke 2.25 — 명세가 답변 표식에 쓰는 것과 같은 규격이다. */
function PreviousChoiceMark() {
  return (
    <svg
      className="telemetry-consent-banner-mark h-[14px] w-[14px] flex-none"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12.5l5.5 5.5L20 7" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export type ConsentPreviousChoice = 'accept' | 'deny' | null;

interface ConsentBannerProps {
  regionLabel: string;
  message: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  /** 재호출로 뜬 배너만 참이다 — 닫기 X 와 지난 선택 표식이 함께 온다. */
  dismissible?: boolean;
  closeLabel?: string;
  onCloseRequest?: () => void;
  previousChoice?: ConsentPreviousChoice;
  previousChoiceLabel?: string;
  /**
   * 값이 바뀌면 배너가 자기 자신에게 포커스를 가져온다. 재호출 링크는 페이지 최하단이나
   * 드로어에 있고 배너는 화면 하단에 뜨므로, 포커스를 옮기지 않으면 키보드·보조기술
   * 사용자는 자기가 부른 UI 를 만나지 못한다. 첫 컨트롤이 아니라 배너 컨테이너로 가는 것은
   * 시트와 같은 이유다 — Enter 한 번이 곧 동의가 되면 안 된다.
   */
  focusToken?: number;
  rootTestId?: string;
  primaryTestId?: string;
  secondaryTestId?: string;
  closeTestId?: string;
}

export function ConsentBanner({
  regionLabel,
  message,
  primaryLabel,
  secondaryLabel,
  onPrimaryAction,
  onSecondaryAction,
  dismissible = false,
  closeLabel,
  onCloseRequest,
  previousChoice = null,
  previousChoiceLabel,
  focusToken = 0,
  rootTestId = 'telemetry-consent-banner',
  primaryTestId = 'telemetry-consent-accept',
  secondaryTestId = 'telemetry-consent-deny',
  closeTestId = 'telemetry-consent-close'
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

  useEffect(() => {
    if (focusToken <= 0) {
      return;
    }

    bannerRef.current?.focus();
  }, [focusToken]);

  return (
    <>
      <div className={CONSENT_BANNER_SPACER_CLASS} aria-hidden="true" style={{height: `${spacerHeight}px`}} />
      <div ref={layerRef} className={CONSENT_BANNER_LAYER_CLASS}>
        <section
          ref={bannerRef}
          tabIndex={-1}
          data-occluding={isOccluding ? 'true' : 'false'}
          data-mode={dismissible ? 'recall' : 'initial'}
          className={`telemetry-consent-banner relative pointer-events-auto ${isOccluding ? CONSENT_BANNER_OCCLUDED_CLASS : ''} flex w-full max-w-[1280px] items-center justify-between gap-5 px-5 py-4 max-[767px]:flex-wrap max-[767px]:justify-start max-[767px]:gap-[14px] max-[767px]:p-[14px] ${CONSENT_BANNER_SURFACE_CLASS} ${focusRingClassName}`}
          aria-label={regionLabel}
          data-testid={rootTestId}
        >
          {dismissible && closeLabel ? (
            <button
              type="button"
              className={CONSENT_CLOSE_BUTTON_CLASS}
              aria-label={closeLabel}
              data-testid={closeTestId}
              onClick={onCloseRequest}
            >
              <CloseGlyph />
            </button>
          ) : null}
          <p
            className={`telemetry-consent-banner-message m-0 min-w-0 flex-1 basis-[520px] [font:var(--body-sm)] text-[var(--ink-body)] max-[767px]:basis-full ${
              dismissible ? CONSENT_BODY_DISMISSIBLE_CLASS : ''
            }`}
          >
            {message}
          </p>
          <div className="telemetry-consent-banner-actions flex shrink-0 flex-wrap items-center justify-end gap-2 max-[767px]:basis-full max-[767px]:justify-start">
            <button
              type="button"
              className={CONSENT_PRIMARY_BUTTON_CLASS}
              data-testid={primaryTestId}
              onClick={onPrimaryAction}
            >
              {previousChoice === 'accept' ? <PreviousChoiceMark /> : null}
              {primaryLabel}
              {previousChoice === 'accept' && previousChoiceLabel ? (
                <span className="sr-only">{previousChoiceLabel}</span>
              ) : null}
            </button>
            <button
              type="button"
              className={`${CONSENT_SECONDARY_BUTTON_CLASS} ${
                previousChoice === 'deny' ? CONSENT_PREVIOUS_CHOICE_CLASS : ''
              }`}
              data-testid={secondaryTestId}
              onClick={onSecondaryAction}
            >
              {previousChoice === 'deny' ? <PreviousChoiceMark /> : null}
              {secondaryLabel}
              {previousChoice === 'deny' && previousChoiceLabel ? (
                <span className="sr-only">{previousChoiceLabel}</span>
              ) : null}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
