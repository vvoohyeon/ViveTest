import {readFileSync} from 'node:fs';
import path from 'node:path';

import {describe, expect, it} from 'vitest';

import {encodeResultPayload, type ResultPayload, type ScoreStats} from '../../src/features/test/domain';
import {
  readKeylessQuery,
  resolveResultView,
  type ResultViewFailure
} from '../../src/features/test/result-view-model';

const MBTI_SCORE_STATS: ScoreStats = {
  EI: {poleA: 'E', poleB: 'I', counts: {E: 4, I: 5}, dominant: 'I'},
  SN: {poleA: 'S', poleB: 'N', counts: {S: 8, N: 9}, dominant: 'N'},
  TF: {poleA: 'T', poleB: 'F', counts: {T: 6, F: 11}, dominant: 'F'},
  JP: {poleA: 'J', poleB: 'P', counts: {J: 10, P: 7}, dominant: 'J'}
};

const EGTT_SCORE_STATS: ScoreStats = {
  ET: {poleA: 'E', poleB: 'T', counts: {E: 5, T: 2}, dominant: 'E'}
};

function encode(payload: ResultPayload): string {
  return encodeResultPayload(payload);
}

const MBTI_PAYLOAD = encode({scoreStats: MBTI_SCORE_STATS, shared: false});

/**
 * §6.3 이 세는 실패 전부를 한 표로 둔다.
 *
 * 표 하나에 모아 두는 이유는 §6.3 이 요구하는 것이 갈래마다의 처리가 아니라 **모든 갈래가 같은
 * 곳으로 간다**는 것이기 때문이다. 그리고 갈래 이름을 함께 적어 두면 아래 마지막 검사가
 * 「선언된 갈래 중 아무도 밟지 않는 것」을 잡을 수 있다.
 */
const FAILURE_CASES: ReadonlyArray<{
  reason: ResultViewFailure;
  input: {variant: string; typeSegment: string; payload: string | null};
}> = [
  {reason: 'VARIANT_MISSING', input: {variant: '', typeSegment: 'INFJ', payload: MBTI_PAYLOAD}},
  {reason: 'TYPE_MISSING', input: {variant: 'qmbti', typeSegment: '', payload: MBTI_PAYLOAD}},
  {reason: 'SCHEMA_NOT_FOUND', input: {variant: 'ops-handbook', typeSegment: 'INFJ', payload: MBTI_PAYLOAD}},
  {reason: 'PAYLOAD_QUERY_MISSING', input: {variant: 'qmbti', typeSegment: 'INFJ', payload: null}},
  {reason: 'BASE64_DECODE_FAILED', input: {variant: 'qmbti', typeSegment: 'INFJ', payload: ''}},
  {
    reason: 'JSON_PARSE_FAILED',
    input: {variant: 'qmbti', typeSegment: 'INFJ', payload: encodeUrlSafe('not json at all')}
  },
  {
    reason: 'MISSING_SCORE_STATS',
    input: {variant: 'qmbti', typeSegment: 'INFJ', payload: encodeUrlSafe(JSON.stringify({shared: false}))}
  },
  {
    reason: 'SCORE_STATS_SCHEMA_MISMATCH',
    input: {
      variant: 'qmbti',
      typeSegment: 'INFJ',
      payload: encodeUrlSafe(JSON.stringify({scoreStats: EGTT_SCORE_STATS, shared: false}))
    }
  },
  {
    reason: 'INVALID_SHARED',
    input: {
      variant: 'qmbti',
      typeSegment: 'INFJ',
      payload: encodeUrlSafe(JSON.stringify({scoreStats: MBTI_SCORE_STATS, shared: 'yes'}))
    }
  },
  {reason: 'LENGTH_MISMATCH', input: {variant: 'qmbti', typeSegment: 'INF', payload: MBTI_PAYLOAD}},
  {
    reason: 'INVALID_QUALIFIER_VALUE',
    input: {
      variant: 'egtt',
      typeSegment: 'EX',
      payload: encode({scoreStats: EGTT_SCORE_STATS, shared: false})
    }
  }
];

function encodeUrlSafe(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

describe('result view model (req-test.md §5.1 · §5.2 · §6.3)', () => {
  it('resolves a self-contained result URL into one view', () => {
    expect(resolveResultView({variant: 'qmbti', typeSegment: 'INFJ', payload: MBTI_PAYLOAD})).toEqual({
      ok: true,
      view: {
        variant: 'qmbti',
        derivedType: 'INFJ',
        qualifiers: {},
        scoreStats: MBTI_SCORE_STATS,
        audience: 'own'
      }
    });
  });

  it('carries the qualifier the type segment holds rather than one from the payload', () => {
    // §5.1 — qualifier 는 `type` 세그먼트가 나르고 payload 에 중복해 담지 않는다.
    expect(
      resolveResultView({
        variant: 'egtt',
        typeSegment: 'EM',
        payload: encode({scoreStats: EGTT_SCORE_STATS, shared: false})
      })
    ).toEqual({
      ok: true,
      view: {
        variant: 'egtt',
        derivedType: 'E',
        qualifiers: {gender: 'M'},
        scoreStats: EGTT_SCORE_STATS,
        audience: 'own'
      }
    });
  });

  it('reads §5.2 케이스 1 과 2 를 `shared` 하나에서 가른다', () => {
    const own = resolveResultView({variant: 'qmbti', typeSegment: 'INFJ', payload: MBTI_PAYLOAD});
    const shared = resolveResultView({
      variant: 'qmbti',
      typeSegment: 'INFJ',
      payload: encode({scoreStats: MBTI_SCORE_STATS, shared: true})
    });

    expect(own.ok && own.view.audience).toBe('own');
    expect(shared.ok && shared.view.audience).toBe('shared');
  });

  it('sends every §6.3 failure to the same shape — 부분적으로 푼 결과를 돌려주지 않는다', () => {
    for (const {reason, input} of FAILURE_CASES) {
      const resolved = resolveResultView(input);

      // 값 비교 하나로 두 가지를 함께 본다: 이유가 맞고, **그 밖에 아무것도 없다**.
      // `view` 가 함께 실려 오는 실패는 라우트가 반쯤 그릴 수 있는 입력이 된다.
      expect(resolved, `${reason} 케이스`).toEqual({ok: false, reason});
    }
  });

  it('keeps the declared failure union and the tested failures identical', () => {
    // 갈래를 하나 더해 놓고 검사를 잊으면 그 갈래는 아무도 밟아 보지 않은 채 제품에 남는다.
    // 그래서 선언을 **읽어서** 비교한다 — 손으로 두 번 적은 목록은 조용히 갈린다(L18 · L30).
    const source = readFileSync(
      path.join(process.cwd(), 'src/features/test/result-view-model.ts'),
      'utf8'
    );
    const union = source.match(/export type ResultViewFailure =([\s\S]*?);/u)?.[1] ?? '';

    expect(union, 'ResultViewFailure 선언을 찾지 못했다').not.toBe('');

    // `[A-Z_]+` 로 시작했더니 `BASE64_DECODE_FAILED` 하나가 숫자 때문에 빠졌고, 그때 이 검사는
    // 「선언에 없는 갈래를 테스트한다」고 보고했다 — 대상이 아니라 도구가 틀린 경우다(L08).
    const declared = new Set([
      ...[...union.matchAll(/'([A-Z0-9_]+)'/gu)].map((matched) => matched[1]),
      // 코덱의 다섯은 이름으로 합쳐져 있다 — 그 목록도 선언에서 읽는다.
      ...(union.includes('InvalidResultPayloadReason')
        ? [
            ...(
              readFileSync(path.join(process.cwd(), 'src/features/test/domain/result-payload.ts'), 'utf8').match(
                /export type InvalidResultPayloadReason =([\s\S]*?);/u
              )?.[1] ?? ''
            ).matchAll(/'([A-Z0-9_]+)'/gu)
          ].map((matched) => matched[1])
        : [])
    ]);
    const tested = new Set(FAILURE_CASES.map((entry) => entry.reason));

    expect([...declared].sort()).toEqual([...tested].sort());
  });
});

describe('keyless query string (req-test.md §5.1)', () => {
  it('takes the single valueless key and nothing else', () => {
    expect(readKeylessQuery({[MBTI_PAYLOAD]: ''})).toBe(MBTI_PAYLOAD);
    expect(readKeylessQuery({})).toBeNull();
    expect(readKeylessQuery({utm_source: 'mail'})).toBeNull();
    // §5.1 은 payload 를 그 자리에 단독으로 둔다 — 둘이면 어느 쪽인지 URL 이 말해 주지 않는다.
    expect(readKeylessQuery({[MBTI_PAYLOAD]: '', other: ''})).toBeNull();
  });
});
