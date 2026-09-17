import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';

import {describe, expect, it} from 'vitest';

import {buildLocaleFreePath, RouteBuilder} from '../../src/lib/routes/route-builder';

const APP_LOCALE_ROOT = path.join(process.cwd(), 'src/app/[locale]');
const ROUTE_BUILDER_SOURCE = path.join(process.cwd(), 'src/lib/routes/route-builder.ts');

/**
 * `src/app/[locale]` 아래의 `page.tsx` 들을 locale-free 경로로 읽는다.
 *
 * route group `(...)` 과 parallel route `@...` 는 이 사상이 다루지 않는다. 생기면 조용히 틀린
 * 경로를 내는 대신 멈춘다 — 측정기가 스스로 틀리면 결과는 발견처럼 생긴다(L08).
 */
function readAppRoutePathnames(): string[] {
  const found: string[] = [];

  const walk = (absolute: string, segments: string[]) => {
    for (const entry of readdirSync(absolute, {withFileTypes: true})) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith('(') || entry.name.startsWith('@')) {
          throw new Error(`route group / parallel route 를 이 사상이 다루지 않는다: ${entry.name}`);
        }

        walk(path.join(absolute, entry.name), [...segments, entry.name]);
        continue;
      }

      if (entry.name === 'page.tsx') {
        found.push(segments.length === 0 ? '/' : `/${segments.join('/')}`);
      }
    }
  };

  walk(APP_LOCALE_ROOT, []);

  return found.sort();
}

function readDeclaredPathnames(): string[] {
  const source = readFileSync(ROUTE_BUILDER_SOURCE, 'utf8');
  const union = source.match(/export type LocaleFreeRoute =([\s\S]*?)\n\n/u)?.[1] ?? '';

  return [...union.matchAll(/pathname: '([^']+)'/gu)].map((matched) => matched[1]).sort();
}

describe('RouteBuilder', () => {
  it('builds locale-free route objects for landing/blog/history', () => {
    expect(RouteBuilder.landing()).toEqual({pathname: '/'});
    expect(RouteBuilder.blog()).toEqual({pathname: '/blog'});
    expect(RouteBuilder.blogArticle('ops-handbook')).toEqual({
      pathname: '/blog/[variant]',
      params: {variant: 'ops-handbook'}
    });
    expect(RouteBuilder.history()).toEqual({pathname: '/history'});
    expect(RouteBuilder.result('qmbti', 'INFJ')).toEqual({
      pathname: '/result/[variant]/[type]',
      params: {variant: 'qmbti', type: 'INFJ'}
    });
    expect(RouteBuilder.testError()).toEqual({pathname: '/test/error'});
  });

  it('builds locale-free paths from route objects only', () => {
    expect(buildLocaleFreePath(RouteBuilder.landing())).toBe('/');
    expect(buildLocaleFreePath(RouteBuilder.blog())).toBe('/blog');
    expect(buildLocaleFreePath(RouteBuilder.blogArticle('ops-handbook'))).toBe('/blog/ops-handbook');
    expect(buildLocaleFreePath(RouteBuilder.history())).toBe('/history');
    expect(buildLocaleFreePath(RouteBuilder.result('qmbti', 'INFJ'))).toBe('/result/qmbti/INFJ');
    expect(buildLocaleFreePath(RouteBuilder.question('beta'))).toBe('/test/beta');
    expect(buildLocaleFreePath(RouteBuilder.testError())).toBe('/test/error');
  });

  /**
   * 라우트를 하나 더하면 `LocaleFreeRoute` 도 함께 자라야 한다 — `PageShell` 의 `currentRoute`
   * 와 GNB 의 현재 위치 표시가 이 타입 하나에서 나오기 때문이다. 등록을 잊은 라우트는 **붉지
   * 않는다**: 페이지는 잘 열리고 GNB 만 조용히 거짓을 말한다.
   *
   * 그래서 **양방향으로** 묻는다. 한쪽만 물으면 반대 방향이 구조적으로 보이지 않는다 —
   * 파일만 세면 지워진 라우트의 선언이 남고, 선언만 세면 등록 없는 파일이 그대로 산다.
   */
  it('keeps the app route files and the LocaleFreeRoute union in step, both directions', () => {
    const fromFiles = readAppRoutePathnames();
    const fromUnion = readDeclaredPathnames();

    expect(fromFiles.length, '전제: 라우트를 하나도 못 찾으면 아래 비교가 공허하다').toBeGreaterThan(3);
    expect(fromUnion).toEqual(fromFiles);
  });
});
