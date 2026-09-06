/**
 * `qa:rules` 체커 등록부와 그것을 세는 계약 문장을 함께 붙든다.
 *
 * `scripts/qa/run-all.mjs`는 돌릴 체커를 손으로 적은 배열로 갖는다. 새 체커를 만들고
 * 배열에 적지 않으면 그 체커는 **조용히 한 번도 돌지 않는다** — 파일이 있으니 있는 줄
 * 알고, 실패가 없으니 통과로 읽힌다. 등록부와 파일 집합을 대조하는 것이 그 침묵의 유일한
 * 탐지 수단이다.
 *
 * 같은 이유로 AGENTS.md §5가 적은 개수도 여기서 붙든다. 산문에 박힌 수는 스스로 낡고,
 * 낡은 수는 「12개가 다 돈다」는 잘못된 안심을 만든다.
 */
import {describe, expect, it} from 'vitest';

import {readRepoFile, REPO_ROOT} from './helpers/repo';
import {readdirSync} from 'node:fs';
import path from 'node:path';

const RUN_ALL = 'scripts/qa/run-all.mjs';

function registeredCheckers(): string[] {
  const source = readRepoFile(RUN_ALL);
  const block = /const scripts = \[([\s\S]*?)\];/u.exec(source);
  expect(block, `${RUN_ALL}의 체커 배열을 찾지 못했다 — 형태가 바뀌었으면 이 가드를 함께 고쳐라`).not.toBeNull();
  return [...block![1].matchAll(/'([^']+)'/gu)].map((match) => match[1]);
}

function checkerFiles(): string[] {
  return readdirSync(path.join(REPO_ROOT, 'scripts/qa'))
    .filter((name) => name.startsWith('check-') && name.endsWith('.mjs'))
    .sort();
}

describe('qa:rules 체커 등록부', () => {
  it('등록부와 체커 파일 집합이 정확히 일치한다', () => {
    const registered = [...registeredCheckers()].sort();
    const onDisk = checkerFiles();
    const unregistered = onDisk.filter((name) => !registered.includes(name));
    const ghosts = registered.filter((name) => !onDisk.includes(name));

    expect(unregistered, `체커 파일이 run-all.mjs에 등재되지 않아 한 번도 돌지 않는다:\n${unregistered.join('\n')}`).toEqual([]);
    expect(ghosts, `등재됐지만 파일이 없다:\n${ghosts.join('\n')}`).toEqual([]);
  });

  it('AGENTS.md §5가 적은 체커 개수가 실제와 같다', () => {
    const stated = /run-all\.mjs \((\d+) contract checks\)/u.exec(readRepoFile('AGENTS.md'));
    expect(stated, 'AGENTS.md §5의 「N contract checks」 문장을 찾지 못했다').not.toBeNull();
    expect(Number(stated![1])).toBe(checkerFiles().length);
  });
});

describe('blocker 추적 원장', () => {
  type Row = {blocker: number; kind: string; file: string; assertionId: string};

  const rows = Object.values(JSON.parse(readRepoFile('docs/blocker-traceability.json'))) as Row[];

  it('project-rules.md가 적은 건수·종류별 분포·blocker 범위가 실제와 같다', () => {
    const text = readRepoFile('docs/agent-guides/project-rules.md');
    const stated =
      /(\d+) entries across blockers `(\d+)\.\.(\d+)` \((\d+) `automated_assertion`, (\d+) `manual_checkpoint`, (\d+) `scenario_test`/u.exec(text);
    expect(stated, 'project-rules.md의 blocker 원장 요약 문장을 찾지 못했다').not.toBeNull();

    const blockers = rows.map((row) => row.blocker);
    const counted = (kind: string) => rows.filter((row) => row.kind === kind).length;

    expect({
      entries: Number(stated![1]),
      min: Number(stated![2]),
      max: Number(stated![3]),
      automated: Number(stated![4]),
      manual: Number(stated![5]),
      scenario: Number(stated![6])
    }).toEqual({
      entries: rows.length,
      min: Math.min(...blockers),
      max: Math.max(...blockers),
      automated: counted('automated_assertion'),
      manual: counted('manual_checkpoint'),
      scenario: counted('scenario_test')
    });
  });

  it('원장이 아는 kind는 세 가지뿐이다', () => {
    const unknown = [...new Set(rows.map((row) => row.kind))]
      .filter((kind) => !['automated_assertion', 'manual_checkpoint', 'scenario_test'].includes(kind))
      .sort();

    expect(unknown, `check-blocker-traceability.mjs가 모르는 kind:\n${unknown.join(', ')}`).toEqual([]);
  });
});
