/**
 * 문서의 생명주기는 별도 색인이 아니라 **물리 디렉터리 하나**로만 표현한다.
 *
 * 2026-09-07 이전에는 `docs/plans/`에 활성과 완료가 섞여 84 건이 쌓여 있었고, 그 구분을
 * `.claude/CLAUDE.md`의 산문 한 줄이 대신 떠받쳤다 — 「완료된 역사 기록이며 지시가 아니다」.
 * 산문은 어느 파일이 어느 쪽인지 말해 주지 못하므로, 세션은 84 건을 열어 보거나 전부
 * 지시로 읽거나 둘 중 하나였다.
 *
 * 색인 파일을 만들지 않는 이유: 상태를 두 곳이 주장하면 어느 쪽이 옳은지 알 수 없고, 수기
 * 색인은 파일이 늘 때 조용히 어긋난다. 위치가 곧 상태다.
 *
 * 링크 검사는 **계약 문서와 살아 있는 계획서에만** 건다. `docs/done/**`·`docs/archive/**`는
 * 당시 사실의 정확한 기록이라 소급 수정하지 않는다(docs/DECISIONS.md 2026-09-03) — 역사를
 * 고치면 그 계획이 무엇을 근거로 승인됐는지 읽을 수 없게 된다. 같은 이유로 `DECISIONS.md`
 * 자신도 범위 밖이다: 그 문서의 산문은 「무엇이 어디로 옮겨졌다」와 「만들지 않기로 했다」를
 * 적으므로 **없는 경로를 이름으로 부르는 것이 정상**이다.
 *
 * `docs/design/ds/**`를 가리키는 링크도 범위 밖이다 — 그 디렉터리의 파일 집합은 Claude
 * Design 프로젝트와의 미러 상태가 정하고 그 정본은 `SYNC.md`이며, 저장소에 없는 것이 정상인
 * 파일이 있다(`vive-components.css`·`fonts/` 계열은 미러 대상 밖).
 */
import {describe, expect, it} from 'vitest';

import {readRepoFile, REPO_ROOT, repoDirExists, repoPathExists} from './helpers/repo';
import {readdirSync} from 'node:fs';
import path from 'node:path';

const LIFECYCLE_DIRS = {
  active: 'docs/plans',
  done: 'docs/done',
  closed: 'docs/done/closed',
  archived: 'docs/archive'
} as const;

/** 폐기한 생명주기 색인. 되살아나면 위치와 색인이 상태를 두 곳에서 주장한다. */
const RETIRED_INDEX_FILES = ['docs/PLANS_INDEX.md', 'docs/DONE_INDEX.md', 'docs/plans/INDEX.md'];

/** 링크가 살아 있어야 하는 문서 — 계약과 살아 있는 계획서. */
function liveDocuments(): string[] {
  const documents = [
    'AGENTS.md',
    '.claude/CLAUDE.md',
    'tests/e2e/theme-matrix-baseline-provenance.md',
    'docs/design/design.md'
  ];
  for (const directory of ['docs', 'docs/agent-guides', 'docs/plans']) {
    for (const name of readdirSync(path.join(REPO_ROOT, directory))) {
      if (name.endsWith('.md')) documents.push(`${directory}/${name}`);
    }
  }
  return [...new Set(documents)].filter((document) => document !== 'docs/DECISIONS.md').sort();
}

function markdownFilesIn(directory: string): string[] {
  return readdirSync(path.join(REPO_ROOT, directory))
    .filter((name) => name.endsWith('.md'))
    .sort();
}

describe('문서 생명주기는 물리 위치로만 표현된다', () => {
  it('네 생명주기 디렉터리가 전부 존재한다', () => {
    const missing = Object.entries(LIFECYCLE_DIRS)
      .filter(([, directory]) => !repoDirExists(directory))
      .map(([status, directory]) => `${status} → ${directory}`);

    expect(missing, `생명주기 디렉터리 부재:\n${missing.join('\n')}`).toEqual([]);
  });

  it('폐기한 생명주기 색인이 되살아나지 않았다', () => {
    const revived = RETIRED_INDEX_FILES.filter((file) => repoPathExists(file));

    expect(revived, `색인이 되살아나 위치와 이중 정본을 이룬다:\n${revived.join('\n')}`).toEqual([]);
  });

  it('한 문서명이 두 생명주기 상태를 동시에 주장하지 않는다', () => {
    const owners = new Map<string, string[]>();
    for (const [status, directory] of Object.entries(LIFECYCLE_DIRS)) {
      for (const name of markdownFilesIn(directory)) {
        owners.set(name, [...(owners.get(name) ?? []), status]);
      }
    }
    const overlapping = [...owners.entries()]
      .filter(([, statuses]) => statuses.length > 1)
      .map(([name, statuses]) => `${name}: ${statuses.join(' + ')}`);

    expect(overlapping, `한 문서가 여러 상태에 동시에 있다:\n${overlapping.join('\n')}`).toEqual([]);
  });
});

describe('계약 문서와 살아 있는 계획서의 저장소 링크', () => {
  it('가리키는 저장소 경로가 전부 실재한다', () => {
    const broken: string[] = [];
    for (const document of liveDocuments()) {
      const text = readRepoFile(document);
      const targets = new Set<string>();
      for (const match of text.matchAll(/\]\(((?:\.\.\/)*[A-Za-z0-9._/\-[\]]+\.(?:md|json|css|ts|tsx|mjs|html))(?:#[^)]*)?\)/gu)) {
        targets.add(match[1]);
      }
      for (const match of text.matchAll(/`(docs\/[A-Za-z0-9._/\- ]+\.(?:md|json|css|html))`/gu)) {
        targets.add(match[1]);
      }
      for (const target of targets) {
        if (target.includes('YYYY')) continue;
        if (target.startsWith('docs/design/ds/')) continue;
        const resolved = target.startsWith('../')
          ? path.posix.normalize(path.posix.join(path.posix.dirname(document), target))
          : target.startsWith('docs/') || target.startsWith('src/') || target.startsWith('tests/')
            ? target
            : path.posix.normalize(path.posix.join(path.posix.dirname(document), target));
        if (!repoPathExists(resolved)) broken.push(`${document} → ${target}`);
      }
    }

    expect(broken, `살아 있는 문서가 없는 경로를 가리킨다:\n${broken.join('\n')}`).toEqual([]);
  });
});
