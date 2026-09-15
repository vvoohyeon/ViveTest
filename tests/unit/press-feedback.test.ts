import {describe, expect, it} from 'vitest';

import {readRepoFile, walkRepoFiles} from './helpers/repo';

/**
 * 누름 피드백 — **조건으로 묻는다.**
 *
 * 규칙은 「이 목록의 컨트롤에 `:active` 가 있다」가 아니라 **「hover 로 스킨을 바꾸는 자리는
 * 누름으로도 바꾼다」**이다. 목록형 규칙은 목록 밖에 생긴 같은 결함을 구조적으로 못 본다
 * (L30·L36). 그래서 `src` 전수를 훑고 발견된 자리 전부에 같은 질문을 한다.
 *
 * **왜 필요한가.** 터치에는 hover 가 없다 — 그리고 Tailwind v4 는 `hover:` 유틸리티를
 * `@media (hover:hover)` 로 감싸므로(빌드 산출물 실측) 그 스킨은 터치 기기에서 **아예 적용되지
 * 않는다.** 게다가 preflight 가 `-webkit-tap-highlight-color` 까지 끄므로, `active:` 가 없는
 * 컨트롤은 손가락이 닿은 순간부터 목적지가 그려질 때까지 화면이 아무 말도 하지 않는다.
 * `active:` 는 미디어로 감싸이지 않는다(같은 산출물 실측) — 그래서 그 자리가 터치의 유일한 답이다.
 *
 * **런타임으로 재려다 접었다.** CDP `CSS.forcePseudoState` 로 강제 hover/active 를 걸고 계산된
 * 스타일을 비교하는 판본을 만들었는데, 강제 상태가 페이지의 `getComputedStyle` 에 반영되지 않아
 * 같은 컨트롤이 실행마다 다르게 보였다(실측 2026-09-16). 재지 못하는 검사를 남기는 것보다
 * 결정론적으로 같은 조건을 묻는 쪽이 낫다.
 */

/** 스킨 = 면·선·글자색·그림자. 드러남(`opacity`·`visibility`)과 밑줄은 스킨이 아니다. */
const HOVER_SKIN = /(?<![\w/-])hover:(bg|border|text|shadow)-/u;
const ACTIVE_SKIN = /(?<![\w/-])active:(bg|border|text|shadow|translate)-/u;
const STRING_LITERAL = /'[^'\n]*'|"[^"\n]*"|`[^`]*`/gu;

/** CSS 파일의 `:hover` 가 스킨을 바꾸는가 — 드러남만 바꾸면 이 규칙의 대상이 아니다. */
const CSS_SKIN_DECLARATION = /(background|border|box-shadow|color)\s*:/u;

describe('누름 피드백', () => {
  it('클래스 문자열에서 hover 스킨을 바꾸는 자리는 누름에도 답한다', () => {
    const sources = walkRepoFiles('src', ['.ts', '.tsx']);
    expect(sources.length, '전제: src 를 훑지 못하면 아래 단언이 공허하게 초록이 된다').toBeGreaterThan(0);

    const found: string[] = [];
    const silent: string[] = [];

    for (const file of sources) {
      for (const literal of readRepoFile(file).match(STRING_LITERAL) ?? []) {
        if (!HOVER_SKIN.test(literal)) {
          continue;
        }
        found.push(file);
        if (!ACTIVE_SKIN.test(literal)) {
          silent.push(`${file} → ${literal.slice(0, 90)}…`);
        }
      }
    }

    expect(
      found.length,
      '전제: hover 스킨을 쓰는 클래스 문자열을 하나도 못 찾으면 이 검사는 아무것도 재지 않는다'
    ).toBeGreaterThan(0);
    expect(
      silent,
      `hover 로 스킨이 바뀌는데 누름에는 답하지 않는 자리 — 터치에는 hover 가 없어 이 자리가 곧 침묵이다:\n${silent.join('\n')}`
    ).toEqual([]);
  });

  it('CSS 의 hover 스킨은 hover 가 있는 기기로 스스로를 좁힌다', () => {
    const stylesheets = walkRepoFiles('src', ['.css']);
    expect(stylesheets.length, '전제: 스타일시트를 훑지 못하면 공허하다').toBeGreaterThan(0);

    const ungated: string[] = [];
    let checked = 0;

    for (const file of stylesheets) {
      const css = readRepoFile(file);
      // 블록 단위로 잘라 각 `:hover` 규칙이 hover 미디어 안에 있는지 본다.
      const hoverRules = [...css.matchAll(/([^{}]*:hover[^{}]*)\{([^}]*)\}/gu)];
      for (const [, selector, body] of hoverRules) {
        if (!CSS_SKIN_DECLARATION.test(body)) {
          // 드러남만 바꾸는 규칙(`visibility`)은 스킨이 아니다 — `:focus-within` 이 짝이다.
          continue;
        }
        checked += 1;
        const upToRule = css.slice(0, css.indexOf(selector));
        const lastHoverMedia = upToRule.lastIndexOf('@media (hover: hover)');
        const openAfter = (upToRule.match(/\{/gu) ?? []).length;
        const closeAfter = (upToRule.match(/\}/gu) ?? []).length;
        const insideSomeBlock = openAfter > closeAfter;
        if (lastHoverMedia < 0 || !insideSomeBlock) {
          ungated.push(`${file} → ${selector.trim().slice(0, 80)}`);
        }
      }
    }

    expect(
      checked,
      '전제: 스킨을 바꾸는 CSS hover 규칙을 하나도 못 찾으면 이 검사는 아무것도 재지 않는다'
    ).toBeGreaterThan(0);
    expect(
      ungated,
      `hover 로 스킨을 바꾸면서 hover 가 있는 기기로 좁히지 않은 규칙 — 터치에서는 켜지지 않거나 탭 뒤에 들러붙는다:\n${ungated.join('\n')}`
    ).toEqual([]);
  });
});
