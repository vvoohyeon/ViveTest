import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {THEME_GROUND_COLOR} from '@/app/theme-ground-color';

/**
 * `meta[name=theme-color]` 는 CSS 변수를 읽지 못하므로 지면 색이 리터럴로 한 벌 더 존재한다.
 * 그 사본이 `--canvas` 와 갈라지면 브라우저 크롬만 옛 색으로 남고, 그 어긋남은 실기기에서만
 * 보인다 — 어느 게이트도 잡지 못하는 자리다. 이 검사가 그 결합을 고정한다.
 */
describe('theme-color 지면 색 동기화', () => {
  const globals = readFileSync(resolve(__dirname, '../../src/app/globals.css'), 'utf8');

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
});
