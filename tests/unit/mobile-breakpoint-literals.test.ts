import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {MOBILE_MAX_VIEWPORT_WIDTH} from '@/features/landing/grid/layout-plan';

/**
 * Tailwind 임의 variant 는 TS 상수를 읽지 못하므로 모바일 경계가 리터럴로 적힐 수밖에 없는
 * 자리가 있다. 그 리터럴이 저장소의 경계와 갈라지는 것을 이 검사가 막는다.
 *
 * 종전에 두 종류의 사각지대가 있었다. 동의 배너는 **719** 라는 근거 없는 고아 값을 7 곳에
 * 썼고(저장소·문서·테스트 전수 검색에서 그 파일이 유일한 출현이었다), instruction 오버레이는
 * 값은 맞았지만 **어떤 가드도 보지 않았다**. 둘 다 결정 2 를 실행할 때 조용히 뒤처지는
 * 자리다 — 폭 축이 바뀌어도 따라오지 않기 때문이다.
 *
 * 여기 걸리는 리터럴은 전부 **폭 축**이다. 입력 축(hover/pointer)은 리터럴이 아니라
 * `input-profile.ts` 가 소유하며 `input-profile-axis.test.ts` 가 따로 고정한다.
 */
const WIDTH_AXIS_LITERAL_OWNERS = [
  'src/features/landing/shell/consent-banner.tsx',
  'src/features/test/instruction-overlay.tsx'
] as const;

describe('모바일 경계 리터럴', () => {
  it.each(WIDTH_AXIS_LITERAL_OWNERS)('%s 는 저장소의 모바일 경계만 쓴다', (relativePath) => {
    const source = readFileSync(resolve(__dirname, '../..', relativePath), 'utf8');

    const thresholds = new Set(
      Array.from(source.matchAll(/max-\[(\d+)px\]:/gu), (match) => Number(match[1]))
    );

    // 전제: 하나도 못 찾으면 아래 단언이 공허하게 초록이 된다.
    expect(thresholds.size).toBeGreaterThan(0);
    expect([...thresholds]).toEqual([MOBILE_MAX_VIEWPORT_WIDTH]);
  });
});
