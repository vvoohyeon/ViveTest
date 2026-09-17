import {describe, expect, it} from 'vitest';

import {decodeResultPayload, encodeResultPayload, type ResultPayload} from '../../src/features/test/domain';
import {getSchemaForVariant} from '../../src/features/test/schema-registry';

function schemaOf(variant: string) {
  const schema = getSchemaForVariant(variant);

  if (!schema) {
    throw new Error(`Expected a scoring schema for ${variant}.`);
  }

  return schema;
}

const mbtiSchema = schemaOf('qmbti');
const egttSchema = schemaOf('egtt');

const mbtiPayload: ResultPayload = {
  scoreStats: {
    EI: {poleA: 'E', poleB: 'I', counts: {E: 4, I: 5}, dominant: 'I'},
    SN: {poleA: 'S', poleB: 'N', counts: {S: 8, N: 9}, dominant: 'N'},
    TF: {poleA: 'T', poleB: 'F', counts: {T: 6, F: 11}, dominant: 'F'},
    JP: {poleA: 'J', poleB: 'P', counts: {J: 10, P: 7}, dominant: 'J'}
  },
  shared: false
};

const egttPayload: ResultPayload = {
  scoreStats: {ET: {poleA: 'E', poleB: 'T', counts: {E: 3, T: 4}, dominant: 'T'}},
  shared: true
};

/** 텍스트를 그대로 URL-safe Base64 로 만든다 — payload 형식을 거치지 않는 입력을 만들 때 쓴다. */
function toUrlSafeBase64OfText(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64url');
}

/** payload 를 고쳐 쓴 링크를 흉내 낸다 — 디코딩은 성공하고 내용만 다른 입력이다. */
function reencode(mutate: (payload: Record<string, unknown>) => void): string {
  const draft = JSON.parse(JSON.stringify(mbtiPayload)) as Record<string, unknown>;
  mutate(draft);

  return encodeResultPayload(draft as unknown as ResultPayload);
}

describe('result payload codec (req-test §5.1 · §6.3)', () => {
  it('왕복한다 — 축 넷도 하나도', () => {
    for (const [payload, schema] of [
      [mbtiPayload, mbtiSchema],
      [egttPayload, egttSchema]
    ] as const) {
      const decoded = decodeResultPayload(encodeResultPayload(payload), schema);

      expect(decoded).toEqual({ok: true, value: payload});
    }
  });

  it('URL-safe 알파벳만 쓰고 패딩을 남기지 않는다', () => {
    // 이 문자열은 키 없는 query string 으로 들어가므로, `+`·`/`·`=` 가 남으면 그 자리에서
    // 퍼센트 인코딩되거나 잘린다.
    const encoded = encodeResultPayload(mbtiPayload);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/u);
  });

  it('같은 회차는 같은 문자열을 낸다 — 공유 링크가 안정적이려면 직렬화가 결정적이어야 한다', () => {
    expect(encodeResultPayload(mbtiPayload)).toBe(encodeResultPayload(mbtiPayload));
  });

  it('Base64 가 아니면 파싱 이전에 멈춘다', () => {
    for (const raw of ['', '!!!!', 'a']) {
      expect(decodeResultPayload(raw, mbtiSchema).ok).toBe(false);
    }

    expect(decodeResultPayload('!!!!', mbtiSchema)).toEqual({ok: false, reason: 'BASE64_DECODE_FAILED'});
  });

  it('Base64 로는 읽히지만 JSON 이 아닌 입력은 파싱 실패로 보고한다', () => {
    // 순서가 요점이다 — 디코딩은 성공하고 파싱에서 멈춰야 한다. 이름이 바뀌면 §6.3 의 두 줄을
    // 구분할 수 없게 된다.
    const notJson = toUrlSafeBase64OfText('{oops');

    expect(decodeResultPayload(notJson, mbtiSchema)).toEqual({ok: false, reason: 'JSON_PARSE_FAILED'});
  });

  it('`scoreStats` 가 없으면 필수 필드 누락이다', () => {
    const encoded = encodeResultPayload({shared: false} as unknown as ResultPayload);

    expect(decodeResultPayload(encoded, mbtiSchema)).toEqual({ok: false, reason: 'MISSING_SCORE_STATS'});
  });

  it('축 선언과 어긋나는 `scoreStats` 를 전부 거절한다', () => {
    const mismatches: Array<[string, string]> = [
      ['축 하나가 빠졌다', reencode((p) => delete (p.scoreStats as Record<string, unknown>).JP)],
      [
        '선언에 없는 축이 들어왔다',
        reencode((p) => {
          (p.scoreStats as Record<string, unknown>).XY = {poleA: 'X', poleB: 'Y', counts: {X: 1, Y: 0}, dominant: 'X'};
        })
      ],
      [
        '순서가 다르다',
        reencode((p) => {
          const stats = p.scoreStats as Record<string, unknown>;
          p.scoreStats = {JP: stats.JP, EI: stats.EI, SN: stats.SN, TF: stats.TF};
        })
      ],
      [
        'dominant 가 두 극 어느 쪽도 아니다',
        reencode((p) => {
          ((p.scoreStats as Record<string, Record<string, unknown>>).EI as Record<string, unknown>).dominant = 'Z';
        })
      ],
      [
        'counts 의 키가 극과 다르다',
        reencode((p) => {
          ((p.scoreStats as Record<string, Record<string, unknown>>).EI as Record<string, unknown>).counts = {E: 4, Z: 5};
        })
      ],
      [
        'counts 가 정수가 아니다',
        reencode((p) => {
          ((p.scoreStats as Record<string, Record<string, unknown>>).EI as Record<string, unknown>).counts = {E: 4.5, I: 5};
        })
      ],
      [
        'counts 가 음수다',
        reencode((p) => {
          ((p.scoreStats as Record<string, Record<string, unknown>>).EI as Record<string, unknown>).counts = {E: -1, I: 5};
        })
      ],
      ['scoreStats 가 배열이다', reencode((p) => (p.scoreStats = []))]
    ];

    for (const [label, encoded] of mismatches) {
      expect(decodeResultPayload(encoded, mbtiSchema), label).toEqual({
        ok: false,
        reason: 'SCORE_STATS_SCHEMA_MISMATCH'
      });
    }
  });

  it('다른 variant 의 payload 는 그 축이 이 스키마에 없으므로 거절된다', () => {
    expect(decodeResultPayload(encodeResultPayload(egttPayload), mbtiSchema)).toEqual({
      ok: false,
      reason: 'SCORE_STATS_SCHEMA_MISMATCH'
    });
  });

  it('`shared` 가 없으면 false 이고, boolean 이 아니면 거절한다', () => {
    const withoutShared = reencode((p) => delete p.shared);
    const decoded = decodeResultPayload(withoutShared, mbtiSchema);

    expect(decoded).toEqual({ok: true, value: {...mbtiPayload, shared: false}});

    // 이 값 하나가 §5.2 의 케이스 매트릭스에서 어느 UX 로 갈지를 고른다 — 참도 거짓도 아닌
    // 값이 그 분기에 닿으면 안 된다.
    for (const bad of ['true', 1, null, {}]) {
      expect(decodeResultPayload(reencode((p) => (p.shared = bad)), mbtiSchema)).toEqual({
        ok: false,
        reason: 'INVALID_SHARED'
      });
    }
  });
});
