/**
 * GNB 컨트롤 한 벌 — **보이는 것과 만지는 것을 분리한다**(명세 §3-1).
 *
 * 바 높이는 모바일 56px · 데스크톱 64px 그대로이고, 그 안에서 **보이는 껍데기는 36px**,
 * **히트 영역은 44px** 다. 종전에는 껍데기가 곧 히트 영역이라 44px 짜리 알약이 56px 띠를
 * 거의 가득 채웠고(실측 2026-09-16: 위아래 여백 6px), 로고·링크와 무게가 맞지 않았다. 여백이
 * 10px 이 되는 것은 그 뺄셈의 결과이지 새로 고른 값이 아니다.
 *
 * **투명 여백을 가상 원소로 만들지 않는다.** `::before` 로 히트 영역을 넓히면 포인터는
 * 커지지만 원소의 상자는 36px 로 남고, 터치 타깃을 `getBoundingClientRect` 로 재는
 * `assertion:TT-01` 은 그것을 하한 위반으로 읽는다. 실제로 44px 인 것과 44px 로 측정되는 것이
 * 갈리면 다음 세션은 **검사를 고치려 든다.** 그래서 상자는 버튼이 갖고(44px, 투명), 칠은
 * 자식 껍데기가 갖는다(36px).
 */

import {groupFocusRingClassName} from '@/features/ui/button-class-names';

/**
 * 히트 상자. 아무것도 칠하지 않는다 — 칠은 아래 껍데기의 몫이다.
 *
 * 하한은 **둘 다**에 걸린다. 높이만 잡으면 글리프 하나짜리 컸트롤은 내용 너비만큼만 넓어져
 * 36×44 가 된다 — 드로어 헤더의 닫기가 정확히 그러했고 `assertion:TT-01` 이 잡았다. 글자를 담는
 * 컸트롤은 이미 더 넓으므로 이 하한이 그쪽 모양을 바꾸지 않는다.
 */
export const gnbControlHitClassName =
  'gnb-control group inline-flex min-h-[var(--tap-min)] min-w-[var(--tap-min)] cursor-pointer items-center justify-center border-0 bg-transparent p-0 [outline-offset:2px]';

/** 보이는 껍데기. 36px 알약이고 링은 여기에 그려진다. */
export const gnbControlShellClassName =
  `gnb-control-shell pointer-events-none inline-flex h-9 items-center justify-center rounded-full border border-[var(--hairline)] bg-[var(--surface-muted)] px-3 [font:var(--label)] !font-semibold text-[var(--ink)] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color] [transition-timing-function:ease] group-hover:border-[var(--hairline-strong)] group-hover:bg-[var(--surface-sunken)] group-active:bg-[var(--surface-strong)] ${groupFocusRingClassName}`;

/** 아이콘만 담는 정사각 껍데기 — 드로어 헤더의 닫기가 쓴다. */
export const gnbControlIconShellClassName = `${gnbControlShellClassName} w-9 !px-0`;
