import {readFileSync} from 'node:fs';
import path from 'node:path';

import {describe, expect, it} from 'vitest';

import {DESKTOP_WIDE_MIN_GRID_INLINE_SIZE} from '@/features/landing/grid/layout-plan';

const repoRoot = process.cwd();
const gridModuleCss = readFileSync(
  path.join(repoRoot, 'src/features/landing/grid/landing-catalog-grid.module.css'),
  'utf8'
);
const gridComponent = readFileSync(
  path.join(repoRoot, 'src/features/landing/grid/landing-catalog-grid.tsx'),
  'utf8'
);

describe('랜딩 그리드 첫 페인트 게이트', () => {
  it('컨테이너 쿼리 임계값이 DESKTOP_WIDE_MIN_GRID_INLINE_SIZE 와 같다', () => {
    // 미디어/컨테이너 쿼리는 토큰을 읽지 못해 리터럴을 적을 수밖에 없다. 그 리터럴이
    // 상수에서 떨어져 나가면 게이트가 조용히 엉뚱한 폭에서 열린다.
    const matched = /@container\s+landing-grid\s*\(\s*width\s*<\s*(\d+)px\s*\)/u.exec(gridModuleCss);

    expect(matched, '컨테이너 쿼리를 찾지 못했다').not.toBeNull();
    expect(Number(matched![1])).toBe(DESKTOP_WIDE_MIN_GRID_INLINE_SIZE);
  });

  it('게이트는 measured inline-size 로만 열린다 — viewport 미디어 쿼리로 대체되지 않았다', () => {
    // §6.2: 컬럼 규칙의 정본은 measured grid inline-size 이며 viewport 추정값이 아니다.
    expect(gridModuleCss).toMatch(/container-type:\s*inline-size/u);
    expect(gridModuleCss).not.toMatch(/@media[^{]*\(\s*(?:min|max)-width/u);
  });

  it('첫 페인트 상태는 중립 상수이고 초기 렌더에서 window 를 읽지 않는다', () => {
    // §11.1: 초기 렌더 경로의 비결정 API 분기 금지. SSR 이 내보내는 값은 리터럴 'false' 다.
    expect(gridComponent).toMatch(/data-measured="false"/u);
    // 측정 완료 표시는 레이아웃 패스에서 DOM 에 직접 쓴다(상태 경유 금지 — 연쇄 렌더).
    expect(gridComponent).toMatch(/setAttribute\('data-measured', 'true'\)/u);

    const initialRenderSlice = gridComponent.slice(0, gridComponent.indexOf('useLayoutEffect(('));
    expect(initialRenderSlice).not.toMatch(/\bwindow\./u);
  });
});
