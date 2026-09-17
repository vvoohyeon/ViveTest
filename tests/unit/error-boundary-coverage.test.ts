import {existsSync, readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';

import {describe, expect, it} from 'vitest';

const APP_ROOT = path.join(process.cwd(), 'src/app');

/**
 * 예외 하나가 제품을 Next 의 기본 오류 화면으로 바꾸지 않게 한다 — 명세 §2-8.
 *
 * 그 화면은 영어 한 벌에 테마가 없고 제목이 브라우저 기본 32px 이며 **앞으로 가는 경로가
 * 0 개**다. 제품이 12 locale 로 번역돼 있고 테마가 둘인데 가장 나쁜 순간에만 그 둘이 사라진다.
 *
 * E2E 로는 이것을 매번 재지 않는다 — 렌더를 실패시키려면 제품에 「던지는 길」을 만들어야 하고,
 * 그 길 자체가 새 표면이 된다. 대신 **경계가 있고, 클라이언트 컴포넌트이며, 앞으로 가는 행동을
 * 가진다**는 구조를 여기서 고정하고, 실제 렌더는 고장 주입으로 한 번 확인했다(기록은 커밋 메시지).
 */

function read(relative: string): string {
  return readFileSync(path.join(process.cwd(), relative), 'utf8');
}

describe('error boundary coverage', () => {
  it('keeps a boundary inside the locale segment and one outside it', () => {
    // 안쪽은 번역되고 테마가 살아 있다. 바깥쪽은 루트 레이아웃까지 무너졌을 때의 마지막 그물이다.
    expect(existsSync(path.join(APP_ROOT, '[locale]/error.tsx')), '[locale]/error.tsx').toBe(true);
    expect(existsSync(path.join(APP_ROOT, 'global-error.tsx')), 'global-error.tsx').toBe(true);
  });

  it('gives every boundary a way forward and the client directive it needs', () => {
    for (const relative of ['src/app/[locale]/error.tsx', 'src/app/global-error.tsx']) {
      const source = read(relative);

      // 경계는 `reset` 을 받는 클라이언트 컴포넌트여야 Next 가 그것을 경계로 인식한다.
      expect(source.startsWith("'use client';"), `${relative} 는 클라이언트 컴포넌트다`).toBe(true);
      expect(/reset:\s*\(\)\s*=>\s*void/u.test(source), `${relative} 는 reset 을 받는다`).toBe(true);
      // 막다른 곳에 막다른 화면을 두지 않는다 — 다시 시도가 그 최소 하나다.
      expect(/onClick=\{reset\}/u.test(source), `${relative} 는 reset 을 실제로 부른다`).toBe(true);
      // 네 표면이 같은 완성형을 쓴다 — 사본이 늘면 하나를 고칠 때 나머지가 남는다.
      expect(/RecoverySurface/u.test(source), `${relative} 는 공통 완성형을 쓴다`).toBe(true);
    }
  });

  it('makes the outer boundary carry its own stylesheet', () => {
    // 루트 레이아웃을 거치지 않는 문서는 스타일시트를 **스스로** 실어야 한다. `global-not-found`
    // 가 같은 자리에서 그것을 놓쳐 모든 Tailwind 클래스가 한 번도 적용되지 않은 적이 있다(L12).
    for (const relative of ['src/app/global-error.tsx', 'src/app/global-not-found.tsx']) {
      const source = read(relative);
      expect(/<html/u.test(source), `${relative} 는 제 문서를 그린다`).toBe(true);
      expect(/import '\.\/globals\.css'/u.test(source), `${relative} 는 스타일시트를 스스로 싣는다`).toBe(true);
    }
  });

  it('leaves no route segment that resolves a 404 inside the locale boundary', () => {
    // 실측(2026-09-16): `[locale]` 안에서 해결되는 404 는 `<body>` 가 빈 Next 오류 문서
    // (`html#__next_error__`)로 나간다 — 상태 코드는 404 인데 스크립트 전에는 글자가 0 이다.
    // 그래서 도달 가능한 `notFound()` 를 두지 않는다. locale 판정 분기는 프록시가 먼저 잡으므로
    // 도달하지 않고, 그것만 예외로 센다.
    const pages = readdirSync(path.join(APP_ROOT, '[locale]'), {recursive: true, withFileTypes: true})
      .filter((entry) => entry.isFile() && entry.name === 'page.tsx')
      .map((entry) => path.join(entry.parentPath, entry.name));

    expect(pages.length, '전제: 훑을 라우트가 없으면 아래 단언이 공허하다').toBeGreaterThan(4);

    const offenders = pages.flatMap((absolute) => {
      const source = readFileSync(absolute, 'utf8');
      const relative = path.relative(process.cwd(), absolute);
      const reachable = [...source.matchAll(/notFound\(\)/gu)].length;
      const localeGuards = [...source.matchAll(/if \(!isLocale\(locale\)\) \{\s*\n\s*notFound\(\);/gu)].length;

      return reachable > localeGuards ? [`${relative}: notFound() ${reachable}건 중 ${localeGuards}건만 locale 판정`] : [];
    });

    expect(offenders).toEqual([]);
  });
});
