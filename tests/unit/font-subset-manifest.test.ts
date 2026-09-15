import {readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';

import {describe, expect, it} from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '../..');
const SLICE_DIR = path.join(REPO_ROOT, 'public/fonts/pretendard');
const GENERATED_CSS = path.join(REPO_ROOT, 'src/app/fonts.generated.css');
const GLOBALS_CSS = path.join(REPO_ROOT, 'src/app/globals.css');

function readGeneratedCss(): string {
  return readFileSync(GENERATED_CSS, 'utf8');
}

function declaredSliceHrefs(css: string): string[] {
  return [...css.matchAll(/url\('([^']+\.woff2)'\)/gu)].map((match) => match[1]);
}

/**
 * **CSS 와 자산이 갈라지지 않는다.**
 *
 * 2026-09-07 에 이 저장소가 subset 을 물렀던 근거가 「subset 은 빌드 단계를 요구하고 두 쪽이
 * 「어느 글리프가 있는지」로 갈라지는 표면이 된다」였다. 그 갈라짐은 딱 두 모양으로 나타난다 —
 * 선언은 있는데 파일이 없거나(404 → 그 문자만 조용히 fallback), 파일은 있는데 선언이 없거나
 * (죽은 2.9 MB). 둘 다 어떤 기존 게이트에도 나타나지 않으므로 여기서 잡는다.
 */
describe('폰트 조각 매니페스트', () => {
  it('선언된 조각이 전부 실재하고, 실재하는 조각이 전부 선언돼 있다', () => {
    const declared = declaredSliceHrefs(readGeneratedCss());
    const onDisk = readdirSync(SLICE_DIR).filter((name) => name.endsWith('.woff2')).sort();

    const declaredNames = declared.map((href) => path.basename(href)).sort();
    expect(new Set(declaredNames).size, '같은 파일을 두 번 선언한다').toBe(declaredNames.length);
    expect(declaredNames).toEqual(onDisk);

    for (const href of declared) {
      expect(href.startsWith('/fonts/pretendard/'), `조각 경로가 공개 경로 밖이다: ${href}`).toBe(true);
      const size = statSync(path.join(REPO_ROOT, 'public', href.replace(/^\//u, ''))).size;
      expect(size, `빈 조각: ${href}`).toBeGreaterThan(1024);
    }
  });

  it('커버리지 backstop 은 조각들과 겹치지 않는다', () => {
    // 겹치면 **나중 선언이 이긴다** — backstop 이 전체 face 이므로 겹치는 문자 하나가
    // 모든 방문자에게 2 MB 를 받게 만든다.
    const sliceRanges = parseRanges(readGeneratedCss());
    const backstop = parseRanges(readFileSync(GLOBALS_CSS, 'utf8'));
    expect(backstop.length, 'backstop 선언이 사라졌다').toBeGreaterThan(0);

    const covered = new Set<number>();
    for (const [lo, hi] of sliceRanges) {
      for (let cp = lo; cp <= hi; cp += 1) covered.add(cp);
    }

    const overlaps: string[] = [];
    for (const [lo, hi] of backstop) {
      for (let cp = lo; cp <= hi; cp += 1) {
        if (covered.has(cp)) overlaps.push(`U+${cp.toString(16)}`);
      }
    }

    expect(overlaps.slice(0, 10)).toEqual([]);
  });
});

function parseRanges(css: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const match of css.matchAll(/unicode-range:\s*([^;]+);/gu)) {
    for (const rawPart of match[1].split(',')) {
      const part = rawPart.trim();
      const parsed = /^U\+([0-9a-fA-F?]+)(?:-([0-9a-fA-F]+))?$/u.exec(part);
      if (!parsed) {
        throw new Error(`해석할 수 없는 unicode-range 조각: ${part}`);
      }

      const head = parsed[1];
      if (head.includes('?')) {
        ranges.push([Number.parseInt(head.replaceAll('?', '0'), 16), Number.parseInt(head.replaceAll('?', 'f'), 16)]);
        continue;
      }

      const low = Number.parseInt(head, 16);
      ranges.push([low, parsed[2] ? Number.parseInt(parsed[2], 16) : low]);
    }
  }

  return ranges;
}
