import {describe, expect, it} from 'vitest';

import {readRepoFile, walkRepoFiles} from './helpers/repo';

/**
 * CSS 모듈 참조는 **양방향**으로 짝이어야 한다.
 *
 * `landing-motion-stages.test.ts` 는 정의 → 소비자 방향만 본다(정의한 칸이 배정되지 않은 채
 * 남는 것). 반대 방향은 그 가드가 **구조적으로** 못 본다: 제품이 `styles.normalTitle` 처럼
 * 정의가 없는 이름을 읽으면 값이 `undefined` 이고, `undefined` 는 클래스 목록에서 조용히
 * 빠진다. 그래서 렌더는 멀쩡하고 타입도 통과하며(CSS 모듈 타입이 인덱스 시그니처다) 스냅샷도
 * 같다 — **읽는 사람만 「여기 규칙이 걸려 있다」고 오해한다.**
 *
 * 단위 7 이 지나가며 다섯을 봤다(`desktopStage` · `normalSubtitle` · `normalTitle` ·
 * `normalTags` · `normalTagsGap`). `desktopStage` 는 특히 나빴다 — 정의가 있는
 * `desktopStageActive` · `desktopStageCleanupPending` 바로 옆에 적혀 있어 그 둘의 **기본
 * 규칙**처럼 읽혔다.
 *
 * **소유자 목록이 아니라 조건이다**(L30·L36) — `src` 전수에서 CSS 모듈을 import 하는 파일을
 * 찾고, 그 파일이 읽는 이름이 해당 모듈에 실제로 있는지 묻는다. 새 모듈이 생겨도 함께 걸린다.
 */

const MODULE_IMPORT = /import\s+(\w+)\s+from\s+'([^']+\.module\.css)'/gu;
/** 주석 안의 클래스 이름은 정의가 아니다 — 정의처럼 보이는 산문에 속지 않는다. */
const CSS_COMMENT = /\/\*[\s\S]*?\*\//gu;

function resolveModulePath(importer: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) {
    return `src/${specifier.slice(2)}`;
  }

  if (!specifier.startsWith('.')) {
    return null;
  }

  const segments = `${importer.split('/').slice(0, -1).join('/')}/${specifier}`.split('/');
  const resolved: string[] = [];

  for (const segment of segments) {
    if (segment === '.' || segment === '') {
      continue;
    }
    if (segment === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }

  return resolved.join('/');
}

describe('CSS 모듈 참조 무결성', () => {
  it('제품이 읽는 이름은 그 모듈에 정의돼 있다', () => {
    const definitionsByModule = new Map<string, Set<string>>();
    const orphaned: string[] = [];
    let scannedImports = 0;

    for (const file of walkRepoFiles('src', ['.ts', '.tsx'])) {
      const source = readRepoFile(file);

      for (const [, binding, specifier] of source.matchAll(MODULE_IMPORT)) {
        const modulePath = resolveModulePath(file, specifier);

        if (!modulePath) {
          continue;
        }

        scannedImports += 1;

        if (!definitionsByModule.has(modulePath)) {
          const css = readRepoFile(modulePath).replace(CSS_COMMENT, '');
          definitionsByModule.set(modulePath, new Set([...css.matchAll(/\.([A-Za-z_][\w-]*)/gu)].map((m) => m[1])));
        }

        const defined = definitionsByModule.get(modulePath) as Set<string>;
        const usagePattern = new RegExp(String.raw`\b${binding}\.([A-Za-z_]\w*)`, 'gu');

        for (const [, name] of source.matchAll(usagePattern)) {
          if (!defined.has(name)) {
            orphaned.push(`${file}: ${binding}.${name} — ${modulePath} 에 정의가 없다`);
          }
        }
      }
    }

    expect(scannedImports, '전제: CSS 모듈을 읽는 파일이 없으면 아래 단언이 공허하다').toBeGreaterThan(0);
    expect([...new Set(orphaned)]).toEqual([]);
  });
});
