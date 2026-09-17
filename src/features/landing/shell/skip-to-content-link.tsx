'use client';

import {useTranslations} from 'next-intl';

import {focusRingClassName} from '@/features/ui/button-class-names';

export const PAGE_SHELL_MAIN_ID = 'page-shell-main';

/**
 * 본문 건너뛰기 링크 — **포커스를 받을 때만 보인다.**
 *
 * 종전에는 「첫 `Tab` 이 GNB 를 건너뛰고 첫 카드로 간다」를 위해 랜딩에서 GNB 의 `tabIndex` 를
 * 상태에 따라 `-1` 로 내리고, 역방향 진입을 위해 GNB DOM 을 CSS 선택자로 뒤졌다(그 구현이
 * 스스로 계층 위반임을 `@future-move R-06` 으로 인정하고 있었다). 탭 순서를 상태에 따라 바꾸는
 * 것은 예측 가능성을 해치고, 그 예측 불가능성은 키보드 사용자에게만 부과된다.
 *
 * 표준 대안으로 교체한다 — 탭 순서는 **언제나 문서 순서**이고, 본문으로 바로 가고 싶은 사용자는
 * 첫 탭 스톱에서 그것을 **선택**한다.
 *
 * **드러나는 조건은 `:focus` 이지 `:focus-visible` 이 아니다.** 명세 §2-13 은 「포커스를 받을
 * 때만 보인다」이고, `:focus-visible` 은 브라우저의 휴리스틱이 키보드라고 판정한 경우에만
 * 참이다. 그 차이는 실측으로 드러난다 — 마우스 클릭 뒤 `focus()` 로 포커스를 주면 링크의 폭이
 * **1px 에 머물렀다**(2026-09-15, 1280·390 양쪽). 스크립트나 보조기술이 옮긴 포커스가 그
 * 경로이고, 그때 보이지 않는 링크는 「포커스가 어디에 있는지」를 잃게 한다(WCAG 2.4.7).
 * 포커스 **링**만은 `focusRingClassName` 이 `:focus-visible` 로 유지한다 — 링은 키보드 사용자를
 * 위한 표식이고, 드러나는 것과 링이 그려지는 것은 다른 질문이다.
 */
export function SkipToContentLink() {
  const t = useTranslations('gnb');

  return (
    <a
      href={`#${PAGE_SHELL_MAIN_ID}`}
      data-testid="skip-to-content"
      className={[
        // 포커스 전에는 접근성 트리에 남되 레이아웃을 차지하지 않는다.
        //
        // `pointer-events-none` 이 함께 필요하다 — `sr-only` 는 1×1 상자를 문서 좌측 상단에
        // 남기므로, 그것이 없으면 뷰포트 모서리(0,0 근처) 클릭을 이 보이지 않는 링크가
        // 삼킨다(실측: `body` 를 `(1,1)` 에서 클릭하면 링크가 포커스를 가져갔다). 보이지 않는
        // 것은 눌리지도 않아야 한다.
        'sr-only pointer-events-none',
        'focus:pointer-events-auto',
        // 포커스를 받으면 GNB 좌측 상단에 뜬다. `fixed` 라 문서 흐름을 밀지 않는다.
        //
        // 세로 위치는 **GNB 띠의 중앙**이다 — 이 링크는 그 띠 안의 컨트롤로 읽혀야 하고,
        // 명세 §3-1 이 GNB 컨트롤의 보이는 껍데기를 36px 로 정한다. 띠 높이가 모바일 56px
        // (`h-14`) · 데스크톱 64px(`h-16`)이므로 여백은 각각 `(56-36)/2 = 10px` 와
        // `(64-36)/2 = 14px` 다. 종전에는 10px 한 값을 두 폭에 썼고, 데스크톱에서 링크가
        // 로고보다 4px 위로 떠 있었다(실측: 링크 중심 28 대 띠 중심 32).
        'focus:not-sr-only focus:fixed focus:left-[var(--shell-gutter)] focus:top-2.5 md:focus:top-3.5 focus:z-[1200]',
        'focus:inline-flex focus:h-9 focus:items-center focus:rounded-[var(--radius-md)]',
        // **`--accent` + `--accent-fg` 가 아니다.** 명세 §2-13 은 그 둘을 이름으로 적었지만,
        // 그 조합은 라벨이 제 바탕 위에서 **1.89:1(light) · 1.40:1(dark)** 이다 — 비텍스트
        // 기준 3:1 에도 못 미치고 라벨이 필요로 하는 4.5:1 과는 멀다. `--accent-fg` 는
        // *연한 sage 위에 얹는* 어두운 잉크이지 accent 자신 위의 잉크가 아니다.
        //
        // 제 라벨 아래 깔린 **면**은 `--accent-solid` 를 읽고 잉크는 `--fg-on-accent` 다 —
        // D-12 가 제출 CTA 에서 이미 같은 판정을 내렸고, 설계 시스템이 D-19 로 등재했다.
        // 실측 **5.09:1(light) · 7.21:1(dark)** 로 계획서 §0 의 첫 불변식(전 표면 5.08:1)을
        // 넘는다. 읽히지 않는 접근성 컨트롤은 그 중에서도 가장 나쁜 자리다.
        'focus:bg-[var(--accent-solid)] focus:px-4 focus:text-[var(--fg-on-accent)]',
        'focus:[font:var(--button)]',
        focusRingClassName
      ].join(' ')}
    >
      {t('skipToContent')}
    </a>
  );
}
