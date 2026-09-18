import type {ReactNode} from 'react';

import {linkButtonPrimaryClassName} from '@/features/ui/button-class-names';

/**
 * 「막다른 곳」 한 장의 완성형 — 404 와 오류 경계가 같은 모양을 쓴다.
 *
 * 네 표면(`not-found` · `global-not-found` · `[locale]/not-found` · 오류 경계 둘)이 같은 패널과
 * 같은 마크를 그리고, 종전에는 그것이 **파일마다 한 벌씩** 복사돼 있었다. 사본이 넷이면 하나를
 * 고칠 때 셋이 남고, 남은 셋 중 어느 것이 정본인지 다음 사람은 알 수 없다.
 *
 * 문구도 행동도 여기서 정하지 않는다 — 이 파일이 아는 것은 **모양**뿐이다. 무엇이 일어났는지와
 * 어디로 갈 수 있는지는 부르는 쪽이 넘긴다. `design.md` 의 voice 규칙(무엇이 일어났는지 한 줄 ·
 * 행동 하나 · 사과도 오류 코드도 없이)은 그 문구 쪽의 규칙이다.
 */

// **`grid place-items-center` 를 쓰지 않는다.** 그 정렬은 자식을 max-content 로 재게 하므로
// 패널이 뷰포트보다 넓어질 수 있고, `w-full` 은 그때 그 max-content 를 가리킨다 — 막아 주는 것이
// 없다. 실측(2026-09-17, 390px / 최소 글꼴 26px = 200% 확대): 패널이 **502px** 가 돼 문서가
// 가로로 128px 끌렸다. flex 에서는 `w-full` 이 컨테이너의 콘텐츠 폭을 가리킨다.
const recoveryMainClassName = 'flex min-h-screen items-center justify-center px-4 py-6';
const recoveryPanelClassName =
  'w-full max-w-[520px] rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--canvas-elevated)] p-5 shadow-[var(--shadow-rest)]';
// 열을 `minmax(0, 1fr)` 로 묶는다. `grid` 의 기본 `auto` 열은 **가장 넓은 자식의 max-content**
// 로 풀리므로, 줄바꿈 기회가 없는 문장이 하나라도 들어오면 상자가 뷰포트 밖으로 자란다.
const recoveryLayoutClassName =
  'mx-auto grid w-full max-w-[460px] grid-cols-[minmax(0,1fr)] justify-items-center gap-4 px-4 py-10 text-center';
const recoveryMarkClassName =
  'grid h-11 w-11 place-items-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent-fg)]';
const recoveryTitleClassName = 'm-0 [font:var(--h3)] text-[var(--ink)] [word-break:keep-all] [overflow-wrap:anywhere]';
const recoveryBodyClassName =
  'm-0 [font:var(--body-sm)] text-[var(--muted-aa)] [word-break:keep-all] [overflow-wrap:anywhere]';
const recoveryActionsClassName = 'flex flex-wrap items-center justify-center gap-2';

/** 두 404 가 쓰는 경고 삼각형. */
export function RecoveryAlertMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.75]"
    >
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

export const recoveryActionClassName = linkButtonPrimaryClassName;

export function RecoverySurface({
  testId,
  title,
  body,
  actions,
  mark = <RecoveryAlertMark />,
  children
}: {
  testId: string;
  title: string;
  body: string;
  /** 앞으로 가는 경로를 **최소 하나** 둔다(명세 §2-8). 막다른 곳에 막다른 화면을 두지 않는다. */
  actions: ReactNode;
  mark?: ReactNode;
  /**
   * 행동 아래에 붙는 것. 이 파일은 여전히 **모양만** 알고, 무엇이 붙는지는 부르는 쪽이 정한다 —
   * 지금은 `/test/error` 의 복구 카드 하나뿐이고 나머지 세 표면은 넘기지 않는다.
   */
  children?: ReactNode;
}) {
  return (
    <main className={recoveryMainClassName}>
      <section className={recoveryPanelClassName} data-testid={testId}>
        <div className={recoveryLayoutClassName}>
          <span className={recoveryMarkClassName} aria-hidden="true">
            {mark}
          </span>
          <h1 className={recoveryTitleClassName}>{title}</h1>
          <p className={recoveryBodyClassName}>{body}</p>
          <div className={recoveryActionsClassName}>{actions}</div>
          {children}
        </div>
      </section>
    </main>
  );
}
