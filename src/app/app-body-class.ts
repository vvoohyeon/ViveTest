/**
 * `<body>`의 공통 클래스. `layout.tsx`와 `global-not-found.tsx`가 함께 쓴다.
 *
 * **2026-09-07 theme cut.** 종전 값은 두 개의 radial wash — teal `rgb(31 181 143 / 12%)`와
 * blue `rgb(52 119 255 / 14%)` — 를 `var(--bg)` 위에 깔았다. 어느 쪽도 이 시스템의 색이 아니고,
 * `design.md` §4.9는 "no neon, no cold blue tech imagery"를, README는 페이지 바닥을
 * "a warm off-white, never cool grey or pure white"로 못 박는다. D-05가 이것을 legacy 잔존
 * 6건 중 가장 큰 표면으로 기록했다 — 카드가 아니라 body에 칠해져 있어 놓치기 쉬웠다.
 *
 * wash를 걷어내면 바닥은 `--canvas` 하나가 된다. `--bg`는 theme cut에서 `--canvas`로
 * 매핑됐으므로 이 파일은 토큰 이름을 그대로 두고도 warm off-white를 칠한다.
 *
 * **서체도 옮겼다(BQ-25 wave-16 Pretendard 전환).** 종전 스택 `Avenir Next → Noto Sans KR →
 * Segoe UI`는 시스템이 이름으로 부르는 서체를 하나도 포함하지 않았다 — 제품이 렌더한 모든
 * 한글은 Noto Sans KR이었고, `design.md` §4.3의 이중 언어 주장은 모든 표면에서 미실현이었다.
 * 이제 `--font-sans` 하나만 가리키고, 그 값은 설계 정의에서 미러된다.
 */
export const APP_BODY_CLASSNAME =
  'bg-[var(--bg)] min-h-screen text-[var(--ink)] leading-[1.5] [font-family:var(--font-sans)]';
