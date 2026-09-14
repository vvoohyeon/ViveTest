import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {
  INITIAL_INPUT_PROFILE,
  INPUT_PROFILE_MEDIA_QUERY,
  isHoverCapable,
  resolveInputProfile
} from '@/features/landing/grid/input-profile';

const REPO_ROOT = resolve(__dirname, '../..');

function read(relativePath: string): string {
  return readFileSync(resolve(REPO_ROOT, relativePath), 'utf8');
}

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

  it('keeps exactly one JS definition of the input media query', () => {
    // 종전에 이 질의가 JS 두 곳(`use-landing-interaction-controller` · `use-gnb-capability`)에
    // 독립적으로 적혀 있었다. 하나로 접은 뒤 다시 갈라지는 것을 이 단언이 막는다.
    const jsSources = [
      'src/features/landing/grid/use-landing-interaction-controller.ts',
      'src/features/gnb/hooks/use-gnb-capability.ts',
      'src/features/landing/grid/input-profile.ts'
    ];

    const owners = jsSources.filter((path) => read(path).includes(`'${INPUT_PROFILE_MEDIA_QUERY}'`));

    expect(owners).toEqual(['src/features/landing/grid/input-profile.ts']);
  });

  it('pins the CSS copy of the input gate to the JS definition', () => {
    // CSS 사본은 JS 와 동기화할 방법이 없다 — 브라우저가 직접 평가하기 때문이다. 그래서
    // 사본 자체는 남기되, **두 곳이 같은 질의를 적고 있다는 사실**을 문자열로 고정한다.
    // 한쪽만 바뀌면 이 단언이 붉어진다.
    const cardStyles = read('src/features/landing/grid/landing-grid-card.module.css');

    expect(cardStyles).toContain(`@media ${INPUT_PROFILE_MEDIA_QUERY} {`);
  });
});
