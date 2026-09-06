/**
 * 함정 원장의 번호 규약과 항목 형식을 집행한다.
 *
 * 원장은 「제목만 훑고 걸리는 항목만 여는」 문서로 설계됐다. 그 사용법은 제목이 함정 이름과
 * 주장 한 문장을 담을 때만 성립하고, 항목이 검사 절을 가질 때만 다음 세션에 쓸모가 있다.
 * 형식이 무너진 항목은 읽히지 않고, 읽히지 않는 원장은 없는 것과 같다.
 */
import {describe, expect, it} from 'vitest';

import {readRepoFile} from './helpers/repo';

const LEDGER = 'docs/LESSONS_LEARNED.md';
/** 항목 하나의 상한. 넘으면 원장이 아니라 문서다 — 그 내용은 docs/done/이 갖는다. */
const ITEM_BYTE_CAP = 2400;

type Item = {id: string; number: number; title: string; body: string};

function items(): Item[] {
  const text = readRepoFile(LEDGER);
  const headings = [...text.matchAll(/^### (L(\d+)) — (.+)$/gmu)];
  return headings.map((heading, index) => {
    const start = heading.index! + heading[0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index! : text.length;
    return {id: heading[1], number: Number(heading[2]), title: heading[3], body: text.slice(start, end)};
  });
}

describe('함정 원장', () => {
  it('항목이 하나 이상 있다 — 빈 원장은 두지 않는다', () => {
    expect(items().length).toBeGreaterThan(0);
  });

  it('번호가 1부터 연속이고 중복되지 않는다', () => {
    const numbers = items().map((item) => item.number);
    expect(numbers, '번호가 재사용·재번호됐다').toEqual(
      Array.from({length: numbers.length}, (_, index) => index + 1)
    );
  });

  it('제목이 「함정 이름 — 주장 한 문장」 형태다', () => {
    const malformed = items()
      .filter((item) => !item.title.includes(' — ') || item.title.length < 20)
      .map((item) => `${item.id}: ${item.title}`);

    expect(malformed, `제목만으로 관련 여부가 갈리지 않는다:\n${malformed.join('\n')}`).toEqual([]);
  });

  it('모든 항목이 「무엇이 일어났나」와 「검사」 절을 갖는다', () => {
    const incomplete = items()
      .filter((item) => !item.body.includes('**무엇이 일어났나.**') || !item.body.includes('**검사.**'))
      .map((item) => item.id);

    expect(incomplete, `검사 절 없는 항목은 다음 세션이 쓸 수 없다:\n${incomplete.join(', ')}`).toEqual([]);
  });

  it('항목이 바이트 상한을 넘지 않는다', () => {
    const oversized = items()
      .map((item) => ({id: item.id, bytes: Buffer.byteLength(item.body, 'utf8')}))
      .filter(({bytes}) => bytes > ITEM_BYTE_CAP)
      .map(({id, bytes}) => `${id}: ${bytes}B > ${ITEM_BYTE_CAP}B`);

    expect(oversized, `원장 항목이 문서가 됐다 — 경위는 docs/done/이 갖는다:\n${oversized.join('\n')}`).toEqual([]);
  });

  it('낡는 사본이 되는 목차를 두지 않는다', () => {
    expect(readRepoFile(LEDGER)).not.toMatch(/^##\s*(목차|Table of contents)/imu);
  });
});
