import {describe, expect, it} from 'vitest';

import {BRAND_COLORS, BRAND_ICON_FILE_CONTENT, brandMarkSvg} from '@/app/brand-assets';

import {readRepoFile} from './helpers/repo';

/**
 * 브랜드 자산은 제품 화면 **밖**에서만 보인다 — 브라우저 탭, 공유 미리보기, 홈 화면. 그래서
 * 이 사본들이 팔레트와 갈라져도 제품을 아무리 열어 봐도 드러나지 않고, 시각 baseline 170 장
 * 어디에도 잡히지 않는다. 그 사각지대가 이 검사가 있는 이유다.
 *
 * 세 결합을 고정한다. ⑴ 색 리터럴 ↔ `globals.css` 팔레트 ⑵ `src/app/icon.svg` 파일 ↔ 마크
 * 정의 ⑶ maskable 안전 영역(자소가 중앙 지름 80% 원 안에 있다).
 */
const GLOBALS = readRepoFile('src/app/globals.css');

/** `--이름: var(--팔레트)` 를 따라가 팔레트의 리터럴을 돌려준다. 라이트 테마 스코프만 본다. */
function resolveLightToken(tokenName: string): string {
  const lightScope = GLOBALS.slice(GLOBALS.indexOf(':root'), GLOBALS.indexOf("[data-theme='dark']"));
  const alias = lightScope.match(new RegExp(`${tokenName}:\\s*var\\((--[a-z0-9-]+)\\)`, 'u'));

  expect(alias, `${tokenName} 이 팔레트 토큰을 가리키지 않는다`).not.toBeNull();

  const literal = GLOBALS.match(new RegExp(`${alias![1]}:\\s*(#[0-9a-f]{6})`, 'u'));
  expect(literal, `${alias![1]} 의 값을 찾지 못했다`).not.toBeNull();

  return literal![1];
}

describe('브랜드 자산 파리티', () => {
  it('색 리터럴이 라이트 테마 팔레트와 같다', () => {
    expect(BRAND_COLORS.ground, '--canvas').toBe(resolveLightToken('--canvas'));
    expect(BRAND_COLORS.ink, '--ink').toBe(resolveLightToken('--ink'));
    expect(BRAND_COLORS.accentSolid, '--accent-solid').toBe(resolveLightToken('--accent-solid'));
    // 채운 accent 위의 잉크는 지면과 같은 값이다 — 별도 토큰이 아니라 같은 흰 계열을 쓴다.
    expect(BRAND_COLORS.accentFg, '채운 accent 위 잉크').toBe(resolveLightToken('--canvas'));
  });

  it('src/app/icon.svg 가 마크 정의와 바이트 동일이다', () => {
    // 파일이 없으면 파비콘과 홈 화면 아이콘이 조용히 사라진다 — 어느 게이트도 그것을 보지 않는다.
    expect(readRepoFile('src/app/icon.svg')).toBe(BRAND_ICON_FILE_CONTENT);
  });

  it('자소가 maskable 안전 영역 안에 있다', () => {
    // Android 적응형 아이콘은 바깥을 잘라낸다. 안전 영역은 중앙 지름 80% 원 — 512 기준 반경 204.8px.
    // 좌표를 손으로 고칠 때 이 단언이 없으면 잘린 뒤에야 알게 되고, 그 화면은 제품 밖에 있다.
    const mark = brandMarkSvg(512);
    const path = mark.match(/d="M(\d+) (\d+) L(\d+) (\d+) L(\d+) (\d+)"/u);
    const strokeWidth = mark.match(/stroke-width="(\d+)"/u);

    expect(path, '마크 패스를 읽지 못했다').not.toBeNull();
    expect(strokeWidth, '획 두께를 읽지 못했다').not.toBeNull();

    const points = [
      [Number(path![1]), Number(path![2])],
      [Number(path![3]), Number(path![4])],
      [Number(path![5]), Number(path![6])]
    ];
    const halfStroke = Number(strokeWidth![1]) / 2;
    const center = 256;
    const furthest = Math.max(
      ...points.map(([x, y]) => Math.hypot(Math.abs(x - center) + halfStroke, Math.abs(y - center) + halfStroke))
    );

    expect(furthest, `자소 최대 반경 ${furthest.toFixed(1)}px 이 안전 반경 204.8px 을 넘는다`).toBeLessThan(204.8);
  });
});
