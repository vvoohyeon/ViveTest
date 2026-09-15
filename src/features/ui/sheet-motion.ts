// 시트의 시간값은 여기 하나가 갖는다. 명세 §3-4 가 진입 260ms · 이탈 220ms 를 정했는데
// 저장소의 지속 토큰(`--dur-*`)에 그 두 값이 없다 — 있는 것은 140·180·280 이다. 리터럴을
// 컴포넌트마다 흩뿌리면 다음 세션이 어느 것이 정본인지 알 수 없으므로, 두 값을 여기서 한 번만
// 적고 CSS 는 컴포넌트가 내려 주는 커스텀 프로퍼티로 읽는다.

export const SHEET_ENTER_DURATION_MS = 260;
export const SHEET_EXIT_DURATION_MS = 220;
/** 단계 전환(instruction → qualifier)에서 높이만 움직이는 시간. */
export const SHEET_RESIZE_DURATION_MS = 220;

/** 스와이프를 놓았을 때 닫히는 경계 — 이동량이 시트 높이의 이 비율 이상. */
export const SHEET_SWIPE_CLOSE_RATIO = 0.3;
/** 또는 속도가 이 값(px/ms) 이상. */
export const SHEET_SWIPE_CLOSE_VELOCITY = 0.5;

export type SheetCloseReason =
  | 'control'
  | 'backdrop'
  | 'swipe'
  | 'escape'
  | 'history';

/**
 * `prefers-reduced-motion: reduce` 에서는 이동을 버리고 페이드만 남긴다(명세 §3-4). 시간까지
 * 0 으로 만들지는 않는다 — 페이드가 남아야 층이 바뀐 것을 볼 수 있다.
 */
export function resolveSheetDurationMs(base: number, reducedMotion: boolean): number {
  return reducedMotion ? Math.min(base, 140) : base;
}
