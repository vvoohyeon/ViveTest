/**
 * 브라우저 크롬이 따라갈 **해석된 테마의 지면 색**.
 *
 * `--canvas` 토큰(`src/app/globals.css`: light `--warm-50` · dark `--warm-950`)과 같은 값이며,
 * `meta[name=theme-color]` 는 CSS 변수를 읽지 못하므로 리터럴이 필요하다. 그 결합은
 * `tests/unit/theme-color-parity.test.ts` 가 고정한다 — 한쪽만 바뀌면 붉어진다.
 */
export const THEME_GROUND_COLOR = {
  light: '#fbfaf7',
  dark: '#141110'
} as const;

export type ThemeGroundName = keyof typeof THEME_GROUND_COLOR;
