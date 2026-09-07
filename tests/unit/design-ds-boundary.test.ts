/**
 * `docs/design/ds/`가 런타임 밖에 머무는지 검사한다.
 *
 * AGENTS.md §1·§2는 이 디렉터리를 「런타임이 소비하지 않는 문서 계층」이라고 선언하고,
 * `catalog-components.css`를 「제품에 이식할 수 없는 스펙 스타일시트」라고 적는다. 그
 * 선언은 지금 참이지만(2026-09-07 실측 참조 0건) 참인 채로 있으리라는 보장이 없다 —
 * 스펙 스타일시트를 제품이 import 하는 것은 한 줄이면 되고, 그 한 줄은 어떤 기존 게이트도
 * 잡지 않는다. 이 가드가 그 선언의 집행부다.
 *
 * 방향에 주의: 금지되는 것은 **런타임이 ds/를 읽는 것**이다. ds/가 제품을 인용하는 것은
 * 정반대로 정상이며(명세는 실현값을 근거로 적힌다) 여기서 막지 않는다.
 */
import {describe, expect, it} from 'vitest';

import {REPO_ROOT} from './helpers/repo';
import {readFileSync} from 'node:fs';
import {readdirSync} from 'node:fs';
import path from 'node:path';

const RUNTIME_ROOTS = ['src', 'public'];

/**
 * 금지 대상은 **소비**다 — import / @import / url() / require / fetch 로 ds/ 를 끌어오는 것.
 *
 * 종전 패턴은 경로가 텍스트로 나타나기만 해도 걸렸고, 2026-09-07 theme cut 에서 처음으로
 * 그 과잉이 드러났다: `globals.css` 가 자기 토큰이 **어느 파일에서 베껴졌는지** 주석으로
 * 밝히자 가드가 걸었다. 출처 표기는 AGENTS.md §3-1 이 요구하는 것이고 위험이 아니다 —
 * 주석은 파일을 읽지 않는다. 그래서 위험의 모양(가져오기 구문)으로 좁힌다.
 */
const FORBIDDEN = [
  /@import\s+['"][^'"]*(?:docs\/design\/ds|catalog-components\.css|colors_and_type\.css|app-components\.css)/u,
  // `from '…'`, `require('…')`, `import('…')` AND the bare side-effect form
  // `import '…';`, which is how a stylesheet would actually be pulled in and which
  // an earlier version of this pattern let through — caught by fault injection.
  /(?:from|require\(|import\(|import)\s*['"][^'"]*(?:docs\/design\/ds|catalog-components\.css|colors_and_type\.css|app-components\.css)/u,
  /url\(\s*['"]?[^'")]*(?:docs\/design\/ds|catalog-components\.css|colors_and_type\.css|app-components\.css)/u
];

function walk(directory: string): string[] {
  const absolute = path.join(REPO_ROOT, directory);
  const found: string[] = [];
  for (const entry of readdirSync(absolute, {withFileTypes: true})) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) found.push(...walk(relative));
    else found.push(relative);
  }
  return found;
}

describe('설계 정의 계층은 런타임 밖에 있다', () => {
  it('런타임 소스가 docs/design/ds/를 참조하지 않는다', () => {
    const offenders: string[] = [];
    for (const root of RUNTIME_ROOTS) {
      for (const file of walk(root)) {
        if (/\.(png|jpg|jpeg|gif|webp|woff2?|ico|svg)$/u.test(file)) continue;
        const text = readFileSync(path.join(REPO_ROOT, file), 'utf8');
        for (const pattern of FORBIDDEN) {
          if (pattern.test(text)) offenders.push(`${file} → ${pattern.source}`);
        }
      }
    }

    expect(
      offenders,
      `런타임이 설계 정의 계층을 소비한다 — AGENTS.md §2의 「런타임이 소비하지 않는 문서 계층」 선언이 깨졌다:\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  it('선언이 계약 문서에 실제로 적혀 있다', () => {
    expect(readFileSync(path.join(REPO_ROOT, 'AGENTS.md'), 'utf8')).toContain('런타임이 소비하지 않는 문서 계층');
  });
});
