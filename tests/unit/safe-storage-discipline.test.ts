import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';

import {describe, expect, it} from 'vitest';

const SRC_ROOT = path.join(process.cwd(), 'src');
const SAFE_STORAGE = path.join('src', 'lib', 'safe-storage.ts');

/**
 * 저장소 쓰기는 **한 곳에서만** 일어난다 — `src/lib/safe-storage.ts`.
 *
 * Safari 의 「모든 쿠키 차단」에서 `setItem` 은 던진다. 그 브라우저에서 실측한 증상은 크래시가
 * 아니라 **멈춤**이었다: 테스트의 `시작` 을 눌러도 instruction 시트가 영원히 닫히지 않는다.
 * 저장 한 줄이 던지면서 그 뒤의 상태 전이가 통째로 사라지기 때문이고, 화면은 멀쩡해 보인다.
 *
 * 그래서 **목록이 아니라 조건**으로 막는다. 파일을 하나씩 세어 두면 다음에 생기는 파일은 그
 * 목록 밖이라 구조적으로 보이지 않는다(L30·L36). 여기서는 `src` 전체를 훑어 한 자리를 뺀
 * 모든 직접 쓰기를 금지한다 — 새 파일이 생겨도 같은 조건에 걸린다.
 */

function walk(directory: string): string[] {
  return readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walk(absolute);
    }

    return /\.(ts|tsx)$/u.test(entry.name) ? [absolute] : [];
  });
}

describe('storage write discipline', () => {
  it('routes every storage write through the one place that cannot throw', () => {
    const files = walk(SRC_ROOT);

    expect(files.length, '전제: 훑을 파일이 없으면 아래 단언이 공허하다').toBeGreaterThan(50);

    const offenders = files
      .map((absolute) => ({relative: path.relative(process.cwd(), absolute), source: readFileSync(absolute, 'utf8')}))
      .filter(({relative}) => relative !== SAFE_STORAGE)
      .flatMap(({relative, source}) =>
        [...source.matchAll(/\.(setItem|removeItem)\(/gu)].map((matched) => `${relative}: .${matched[1]}(`)
      );

    expect(offenders).toEqual([]);
  });

  it('keeps the one place guarded on both storages', () => {
    // 이 파일이 조건의 **예외**이므로, 예외가 실제로 안전한지는 따로 본다.
    const source = readFileSync(path.join(process.cwd(), SAFE_STORAGE), 'utf8');

    const writes = [...source.matchAll(/\.(setItem|removeItem)\(/gu)];
    expect(writes.length, '쓰기가 하나도 없으면 이 모듈은 아무것도 대신하고 있지 않다').toBeGreaterThanOrEqual(4);

    // 쓰기마다 `try`/`catch` 가 있어야 한다 — 개수로 세면 한 자리가 빠져도 통과하므로 함수마다 본다.
    const unguarded = ['writeLocal', 'removeLocal', 'writeSession', 'removeSession'].filter((name) => {
      const body = source.match(new RegExp(`export function ${name}\\([\\s\\S]*?\\n\\}`, 'u'))?.[0] ?? '';
      return !/try \{[\s\S]*?\} catch \{/u.test(body);
    });

    expect(unguarded).toEqual([]);
  });
});
