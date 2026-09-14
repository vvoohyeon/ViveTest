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
        'focus-visible:pointer-events-auto',
        // 포커스를 받으면 GNB 좌측 상단에 뜬다. `fixed` 라 문서 흐름을 밀지 않는다.
        'focus-visible:not-sr-only focus-visible:fixed focus-visible:left-[var(--shell-gutter)] focus-visible:top-2.5 focus-visible:z-[1200]',
        'focus-visible:inline-flex focus-visible:h-9 focus-visible:items-center focus-visible:rounded-[var(--radius-md)]',
        'focus-visible:bg-[var(--accent)] focus-visible:px-4 focus-visible:text-[var(--accent-fg)]',
        'focus-visible:[font:var(--button)]',
        focusRingClassName
      ].join(' ')}
    >
      {t('skipToContent')}
    </a>
  );
}
