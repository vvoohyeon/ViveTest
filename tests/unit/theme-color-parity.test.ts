import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {THEME_GROUND_COLOR} from '@/app/theme-ground-color';

/**
 * `meta[name=theme-color]` 는 CSS 변수를 읽지 못하므로 지면 색이 리터럴로 **두 벌** 더
 * 존재한다 — `theme-ground-color.ts`(서버·런타임 훅이 읽는다)와 `public/theme-bootstrap.js`
 * (하이드레이션 전에 도는 스크립트라 TS 를 import 할 수 없다). 어느 사본이 `--canvas` 와
 * 갈라지든 브라우저 크롬만 옛 색으로 남고, 그 어긋남은 실기기에서만 보인다.
 *
 * 종전에는 TS 사본만 대조했다. 고장 주입으로 확인했다 — 부트스트랩의 dark 리터럴을
 * `#000000` 으로 바꿔도 이 검사와 `assertion:MB-01` 이 **둘 다 초록**이었다. 부트스트랩이
 * 칠하는 것이 사용자가 **첫 페인트에서 실제로 보는 색**인데 그쪽이 무가드였다.
 */
describe('theme-color 지면 색 동기화', () => {
  const globals = readFileSync(resolve(__dirname, '../../src/app/globals.css'), 'utf8');
  const bootstrap = readFileSync(resolve(__dirname, '../../src/features/gnb/theme-bootstrap-source.ts'), 'utf8');

  function resolveBootstrapLiteral(theme: 'light' | 'dark'): string {
    const groundMatch = bootstrap.match(/GROUND\s*=\s*\{([^}]*)\}/u);
    expect(groundMatch, '부트스트랩에서 GROUND 선언을 찾지 못했다').not.toBeNull();

    const literalMatch = groundMatch![1].match(new RegExp(`${theme}:\\s*'(#[0-9a-f]{6})'`, 'u'));
    expect(literalMatch, `부트스트랩 GROUND 에 ${theme} 값이 없다`).not.toBeNull();

    return literalMatch![1];
  }

  function resolveCanvasLiteral(scope: string): string {
    const canvasMatch = scope.match(/--canvas:\s*var\((--[a-z0-9-]+)\)/u);
    expect(canvasMatch, '--canvas 가 팔레트 토큰을 가리키지 않는다').not.toBeNull();

    const paletteName = canvasMatch![1];
    const paletteMatch = globals.match(new RegExp(`${paletteName}:\\s*(#[0-9a-f]{6})`, 'u'));
    expect(paletteMatch, `${paletteName} 의 값을 찾지 못했다`).not.toBeNull();

    return paletteMatch![1];
  }

  it('light 지면 색이 --canvas 와 같다', () => {
    const rootScope = globals.slice(globals.indexOf(':root'), globals.indexOf("[data-theme='dark']"));
    expect(THEME_GROUND_COLOR.light).toBe(resolveCanvasLiteral(rootScope));
  });

  it('dark 지면 색이 --canvas 와 같다', () => {
    const darkStart = globals.indexOf("[data-theme='dark']");
    const darkScope = globals.slice(darkStart, darkStart + 2000);
    expect(THEME_GROUND_COLOR.dark).toBe(resolveCanvasLiteral(darkScope));
  });

  it('첫 페인트에 칠하는 부트스트랩 사본이 두 테마 모두 같다', () => {
    // 이 사본이 사용자가 실제로 처음 보는 색을 정한다. TS 사본만 대조하면 여기 표류가
    // 남는다 — 실제로 남아 있었다.
    expect(resolveBootstrapLiteral('light')).toBe(THEME_GROUND_COLOR.light);
    expect(resolveBootstrapLiteral('dark')).toBe(THEME_GROUND_COLOR.dark);
  });

  it('부트스트랩이 해석된 테마로 media 를 걷어낸다', () => {
    // `media` 두 값은 **OS** 를 따른다. 걷어내지 않으면 OS-다크에서 라이트를 고른 사용자의
    // 크롬만 다크로 남는다. 이 한 줄이 그 동기화의 전부라 지워져도 화면은 멀쩡해 보인다.
    expect(bootstrap).toMatch(/removeAttribute\('media'\)/u);
    expect(bootstrap).toMatch(/setAttribute\('content',\s*GROUND\[theme\]\)/u);
  });
});
