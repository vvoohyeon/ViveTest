import {describe, expect, it} from 'vitest';

import {MOBILE_MAX_VIEWPORT_WIDTH} from '@/features/landing/grid/layout-plan';

import {readRepoFile, walkRepoFiles} from './helpers/repo';

/**
 * Tailwind 임의 variant 는 TS 상수를 읽지 못하므로 모바일 경계가 리터럴로 적힐 수밖에 없는
 * 자리가 있다. 그 리터럴이 저장소의 경계와 갈라지는 것을 이 검사가 막는다.
 *
 * 종전에 두 종류의 사각지대가 있었다. 동의 배너는 **719** 라는 근거 없는 고아 값을 7 곳에
 * 썼고, instruction 오버레이는 값은 맞았지만 **어떤 가드도 보지 않았다**. 둘 다 폭 축이
 * 바뀌어도 따라오지 않는 자리다.
 *
 * **소유자 목록을 훑지 않는다.** 2026-09-15 고장 주입에서 목록 밖 파일(`site-gnb.tsx`)에
 * `max-[719px]:` 를 넣었더니 이 검사도 `tailwind-candidate-hygiene` 도 초록이었다 — 목록형
 * 가드는 목록 밖의 같은 결함을 구조적으로 보지 못한다(L30). 그래서 `src` 전수를 훑고 발견된
 * 임의 폭 variant 전부에 규칙을 묻는다.
 *
 * **범위와 그 밖에 남는 것.** 여기 걸리는 것은 `.ts`/`.tsx` 의 Tailwind 임의 폭 variant 뿐이다.
 * 폭 리터럴은 CSS 미디어 쿼리로도 생길 수 있고(`src/app/globals.css` 의 `--shell-gutter` 가
 * `768px`·`900px` 두 단을 갖는다) **그 계열을 보는 가드는 없다** — 900 이 무엇의 경계인지가
 * 어디에도 등재돼 있지 않아 기대값을 쓸 수 없기 때문이다. 범위를 넓히려면 그 등재가 먼저다.
 * 축소가 아니라 구멍이므로 여기 적어 둔다(L30 ⑵).
 *
 * 입력 축(hover/pointer)은 리터럴이 아니라 `input-profile.ts` 가 소유하며
 * `input-profile-axis.test.ts` 가 따로 고정한다.
 */
const WIDTH_VARIANT_PATTERN = /\b(max|min)-\[(\d+)px\]:/gu;

describe('모바일 경계 리터럴', () => {
  it('src 전수의 Tailwind 임의 폭 variant 가 저장소의 모바일 경계만 쓴다', () => {
    const sources = walkRepoFiles('src', ['.ts', '.tsx']);
    expect(sources.length, '전제: src 를 훑지 못하면 아래 단언이 공허하게 초록이 된다').toBeGreaterThan(0);

    const found: string[] = [];
    const offenders: string[] = [];

    for (const file of sources) {
      for (const match of readRepoFile(file).matchAll(WIDTH_VARIANT_PATTERN)) {
        const [literal, bound, rawValue] = match;
        // `max-` 는 모바일까지, `min-` 은 그 다음 픽셀부터다 — 한 경계의 두 표현이다.
        const expected = bound === 'max' ? MOBILE_MAX_VIEWPORT_WIDTH : MOBILE_MAX_VIEWPORT_WIDTH + 1;
        found.push(`${file} → ${literal}`);
        if (Number(rawValue) !== expected) {
          offenders.push(`${file} → ${literal} (기대 ${expected}px)`);
        }
      }
    }

    expect(
      found.length,
      '전제: 임의 폭 variant 를 하나도 못 찾으면 아래 단언이 공허하게 초록이 된다'
    ).toBeGreaterThan(0);
    expect(
      offenders,
      `저장소의 모바일 경계(${MOBILE_MAX_VIEWPORT_WIDTH}px)와 갈라진 임의 폭 variant:\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});
