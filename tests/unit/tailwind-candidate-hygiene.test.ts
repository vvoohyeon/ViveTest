import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';

import {describe, expect, it} from 'vitest';

/**
 * Tailwind v4 는 **주석과 산문까지** 훑어 클래스 후보를 뽑는다.
 *
 * 그래서 문서에 자리표시자를 끼운 임의값(예: 테두리 색 유틸리티에 `…` 를 넣은 것)을 적으면
 * 그것이 후보로 잡혀 무효 CSS 선언이 생성되고, **dev 서버의 PostCSS 가 거기서 죽는다**
 * (2026-09-09 ~ 2026-09-11, `/en` 이 500). 프로덕션 빌드는 minifier 가 무효 선언을 버려
 * 통과하므로 `npm run build` 도 `npm test` 도 이것을 잡지 못한다 — 어느 게이트도 dev 서버를
 * 띄우지 않기 때문이다. 그 사각지대를 이 검사가 메운다.
 *
 * 범위는 **실측으로** 좁혔다. 위험한 것은 임의값 안의 **괄호가 닫힌 함수 호출에 자리표시자가
 * 든 것**(`…` 또는 `...`)이다. `.md` 와 `.ts` 양쪽에 그 형태를 넣어 dev 가 500 이 되는 것을
 * 확인했고 — markdown 도 훑힌다 — 괄호가 없거나 닫히지 않은 형태는 저장소에 이미 있는데도
 * dev 가 200 임을 확인했다(`docs/done/**` 의 3 건). 그래서 그 셋은 잡지 않는다: 역사 문서는
 * 소급 수정하지 않으며(`AGENTS.md` §7-1), 무해한 것을 잡는 가드는 그 규칙과 충돌한다.
 */
const CANDIDATE_WITH_PLACEHOLDER =
  /[a-z][a-z0-9-]*-\[[^\]\s]*\([^)\]\s]*(?:…|\.\.\.)[^)\]\s]*\)[^\]\s]*\]/u;
const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.md', '.html', '.json']);

const repoRoot = process.cwd();
// 추적분만 보면 **방금 쓴 파일**을 놓친다 — 세션이 문서를 새로 쓰고 `npm test` 를 돌리는
// 그 순간이 정확히 사각지대다. `--others --exclude-standard` 로 작업 트리 전체를 보되
// `.gitignore` 는 존중한다(Tailwind 의 자동 탐지도 그것을 존중한다).
const trackedFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {cwd: repoRoot, encoding: 'utf8'})
  .split('\n')
  .filter((file) => file.length > 0 && SCANNED_EXTENSIONS.has(path.extname(file)));

describe('Tailwind 후보 위생', () => {
  it('훑을 파일 목록이 비어 있지 않다', () => {
    // 전제: 목록이 비면 아래 검사가 0 회 돌고 조용히 초록이 된다.
    expect(trackedFiles.length).toBeGreaterThan(50);
  });

  it('탐지기가 실제로 그 형태를 잡는다', () => {
    // 대조 문자열을 **조립한다.** 리터럴로 적으면 이 파일 자신이 후보가 되어(Tailwind 는
    // tests/ 도 훑는다) 가드가 스스로를 붉히고, 그것을 예외로 빼면 가드에 구멍이 남는다(L03).
    const ellipsis = String.fromCharCode(0x2026);
    const dots = '.'.repeat(3);
    const candidate = (utility: string, fn: string, placeholder: string) =>
      `${utility}-[${fn}(${placeholder})]`;

    // dev 를 실제로 죽인 형태 (2026-09-09 사건, 그리고 .md/.ts 프로브 둘 다 500)
    expect(CANDIDATE_WITH_PLACEHOLDER.test(candidate('border', 'var', ellipsis))).toBe(true);
    expect(CANDIDATE_WITH_PLACEHOLDER.test(candidate('mt', 'var', ellipsis))).toBe(true);
    expect(CANDIDATE_WITH_PLACEHOLDER.test(candidate('text', 'calc', dots))).toBe(true);

    // 실측상 무해했던 형태 — 괄호가 없거나 닫히지 않았다. 역사 문서에 이미 있다.
    expect(CANDIDATE_WITH_PLACEHOLDER.test(`mt-[${ellipsis}]`)).toBe(false);
    expect(CANDIDATE_WITH_PLACEHOLDER.test(`tracking-[${ellipsis}]`)).toBe(false);
    expect(CANDIDATE_WITH_PLACEHOLDER.test(`bg-[var(--expanded-card-s${ellipsis}]`)).toBe(false);

    // 실제 코드에 흔한 형태들.
    expect(CANDIDATE_WITH_PLACEHOLDER.test(`const merged = [${dots}items];`)).toBe(false);
    expect(CANDIDATE_WITH_PLACEHOLDER.test('min-h-[46px]')).toBe(false);
    expect(CANDIDATE_WITH_PLACEHOLDER.test('[font:var(--button)]')).toBe(false);
  });

  it('자리표시자를 품은 임의값 후보가 저장소에 없다', () => {
    const offenders: string[] = [];

    for (const file of trackedFiles) {
      const lines = readFileSync(path.join(repoRoot, file), 'utf8').split('\n');
      lines.forEach((line, index) => {
        const matched = CANDIDATE_WITH_PLACEHOLDER.exec(line);
        if (matched) {
          offenders.push(`${file}:${index + 1} → ${matched[0]}`);
        }
      });
    }

    expect(offenders, `dev 서버를 죽이는 후보:\n${offenders.join('\n')}`).toEqual([]);
  });
});
