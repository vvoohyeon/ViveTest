import {describe, expect, it} from 'vitest';

import {
  INITIAL_INPUT_PROFILE,
  INPUT_PROFILE_MEDIA_QUERY,
  isHoverCapable,
  resolveInputProfile
} from '@/features/landing/grid/input-profile';

import {readRepoFile, walkRepoFiles} from './helpers/repo';

const INPUT_PROFILE_MODULE = 'src/features/landing/grid/input-profile.ts';
const INPUT_PROFILE_CSS_COPY = 'src/features/landing/grid/landing-grid-card.module.css';

describe('input profile axis', () => {
  it('resolves the axis from hover capability alone — width is not an input', () => {
    expect(resolveInputProfile(true)).toBe('hover-capable');
    expect(resolveInputProfile(false)).toBe('touch');
    expect(isHoverCapable(resolveInputProfile(true))).toBe(true);
    expect(isHoverCapable(resolveInputProfile(false))).toBe(false);
  });

  it('treats the pre-mount neutral value as touch', () => {
    // SSR 중립값이 터치인 것은 모바일 최적 기본값과 같은 방향이다(`req-landing.md` §8.1).
    expect(INITIAL_INPUT_PROFILE).toBe('touch');
  });

  it('keeps exactly one JS definition of the input media query — src 전수', () => {
    // 종전 이 단언은 파일 셋짜리 **허용목록**을 훑었다. 그 형태는 목록 밖에 생긴 네 번째
    // 사본을 구조적으로 보지 못한다 — 2026-09-15 고장 주입에서 목록 밖 파일에 같은 질의를
    // 적었더니 이 검사도 `check-phase7` 도 초록이었다. 가드의 규칙은 사건의 모양이 아니라
    // **고장의 조건**으로 쓴다(L30): 조건은 「JS 정의처가 둘이 된다」이지 「그 셋 중 하나가
    // 사본을 갖는다」가 아니다.
    const sources = walkRepoFiles('src', ['.ts', '.tsx']);
    expect(sources.length, '전제: src 를 훑지 못하면 아래 단언이 공허하게 초록이 된다').toBeGreaterThan(0);

    const owners = sources.filter((file) => readRepoFile(file).includes(INPUT_PROFILE_MEDIA_QUERY));

    expect(owners, '입력 축 질의의 JS 정의처는 하나뿐이어야 한다').toEqual([INPUT_PROFILE_MODULE]);
  });

  it('pins the CSS copy of the input gate to the JS definition — 사본도 하나뿐이다', () => {
    // CSS 사본은 JS 와 동기화할 방법이 없다 — 브라우저가 직접 평가하기 때문이다. 그래서
    // 사본 자체는 남기되 둘을 문자열로 묶는다. 사본의 **개수**도 함께 고정한다: 두 번째
    // 사본이 다른 스타일시트에 생기면 갈라질 자리가 하나 더 늘고, 종전 형태는 그것을
    // 보지 못했다.
    const cssOwners = walkRepoFiles('src', ['.css']).filter((file) =>
      readRepoFile(file).includes(INPUT_PROFILE_MEDIA_QUERY)
    );

    expect(cssOwners, '입력 축 질의의 CSS 사본은 카드 모듈 하나뿐이어야 한다').toEqual([INPUT_PROFILE_CSS_COPY]);
    expect(readRepoFile(INPUT_PROFILE_CSS_COPY)).toContain(`@media ${INPUT_PROFILE_MEDIA_QUERY} {`);
  });
});
