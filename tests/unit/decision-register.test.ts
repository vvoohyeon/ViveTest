/**
 * `BQ-NN` 원장의 번호 규약과 인용 해석을 붙든다.
 *
 * `docs/decision-register.md`는 append-only 번호 원장이다. 그 형태의 원장은 병행 세션이
 * 각자 「다음 번호」를 읽고 **같은 번호를 쓰는** 고전적 충돌을 갖는다 — 두 세션 모두
 * 로컬에서는 옳고, 착지 순서에 따라 한쪽 결정이 다른 쪽 이름 아래 묻힌다. 중복은 착지
 * 직후 여기서 붉어진다.
 *
 * 인용 해석도 함께 본다. 계약 문서와 살아 있는 계획서가 아직 등재되지 않은 번호를 근거로
 * 들면 그 근거는 읽을 수 없는 근거다.
 *
 * 이 설명에 `BQ-`로 시작하는 실제 번호를 적지 않는 것은 의도다 — 인용 census가 추적 파일
 * 전체를 훑으므로 **자기 설명까지 인용으로 센다**. 가드를 자기 파일에서 눈감게 만드는 것이
 * 쉬운 길이지만, 그러면 테스트 파일에 실재하는 인용도 함께 놓친다.
 */
import {describe, expect, it} from 'vitest';

import {readRepoFile, REPO_ROOT} from './helpers/repo';
import {execFileSync} from 'node:child_process';

const REGISTER = 'docs/decision-register.md';

function registeredIds(): string[] {
  return [...readRepoFile(REGISTER).matchAll(/^## (BQ-\d+)\s*$/gmu)].map((match) => match[1]);
}

/** 추적 중인 파일 전체에서 인용을 모은다 — 원장 자신과 역사 기록은 뺀다. */
function citedIds(): Map<string, string[]> {
  const output = execFileSync(
    'git',
    ['grep', '-ohE', 'BQ-[0-9]+', '--', ':!docs/decision-register.md', ':!docs/archive'],
    {cwd: REPO_ROOT, encoding: 'utf8'}
  );
  const cited = new Map<string, string[]>();
  for (const id of output.split('\n').filter(Boolean)) {
    cited.set(id, cited.get(id) ?? []);
  }
  return cited;
}

describe('BQ 결정 원장', () => {
  it('번호가 중복되지 않는다', () => {
    const ids = registeredIds();
    const duplicated = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))].sort();

    expect(duplicated, `같은 번호가 두 번 등재됐다 — 병행 세션 충돌을 의심하라:\n${duplicated.join(', ')}`).toEqual([]);
  });

  it('번호가 1부터 연속이다', () => {
    const numbers = registeredIds().map((id) => Number(id.slice(3))).sort((a, b) => a - b);
    expect(numbers.length, '원장에서 BQ 항목을 하나도 찾지 못했다').toBeGreaterThan(0);

    const expected = Array.from({length: numbers[numbers.length - 1]}, (_, index) => index + 1);
    const gaps = expected.filter((n) => !numbers.includes(n));

    expect(gaps, `번호가 비어 있다. 의도한 결번이면 이 가드에 사유와 함께 등재하라:\n${gaps.join(', ')}`).toEqual([]);
  });

  it('등재 순서가 번호 순이다', () => {
    const ids = registeredIds().map((id) => Number(id.slice(3)));
    const outOfOrder = ids.filter((n, index) => index > 0 && n < ids[index - 1]);

    expect(outOfOrder, `append-only 원장이 번호 역순으로 적혔다:\n${outOfOrder.join(', ')}`).toEqual([]);
  });

  it('인용된 BQ 번호가 전부 원장에 있다', () => {
    const registered = new Set(registeredIds());
    const dangling = [...citedIds().keys()].filter((id) => !registered.has(id)).sort();

    expect(dangling, `원장에 없는 결정을 근거로 든다:\n${dangling.join(', ')}`).toEqual([]);
  });

  it('원장이 변경 이력 절을 갖는다', () => {
    expect(readRepoFile(REGISTER)).toMatch(/^## 변경 이력\s*$/mu);
  });
});
