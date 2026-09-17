import type {ResultPayload, ScoreStats, ScoringSchema} from '@/features/test/domain/types';

/**
 * Result URL 의 키 없는 query string — `req-test.md` §5.1.
 *
 * 이 모듈이 소유하는 것은 **payload 하나**다. `variant` 와 `type` 세그먼트는 경로가 나르고
 * `parseTypeSegment` 가 검증한다. §5.1 이 정한 순서(Base64 → JSON → schema)가 이 파일의
 * 함수 하나에 그대로 들어 있는 이유는, 순서를 바꾸면 검증이 조용히 약해지기 때문이다 —
 * 예컨대 JSON 을 먼저 믿으면 디코딩 실패가 파싱 실패로 보고된다.
 *
 * payload 는 **신뢰할 수 없는 입력**이다. 공유 링크를 받은 사람의 브라우저가 이것을 그대로
 * 들고 오므로, 여기 들어오는 값에 대해 "우리가 만든 것" 이라는 가정을 하나도 두지 않는다.
 */

export type InvalidResultPayloadReason =
  | 'BASE64_DECODE_FAILED'
  | 'JSON_PARSE_FAILED'
  | 'MISSING_SCORE_STATS'
  | 'SCORE_STATS_SCHEMA_MISMATCH'
  | 'INVALID_SHARED';

export type DecodeResultPayloadResult =
  | {ok: true; value: ResultPayload}
  | {ok: false; reason: InvalidResultPayloadReason};

function axisId(poleA: string, poleB: string): string {
  return `${poleA}${poleB}`;
}

function toUrlSafeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromUrlSafeBase64(value: string): Uint8Array | null {
  // 패딩을 지운 것은 우리이므로 되돌려 준다. `atob` 는 길이가 4 의 배수가 아니면 던진다.
  const restored = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = restored.padEnd(restored.length + ((4 - (restored.length % 4)) % 4), '=');

  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    return null;
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * `scoreStats` 가 이 variant 의 축 선언과 **같은 이름·같은 순서**인지 본다.
 *
 * 순서까지 보는 이유는 §5.1 이 "schema 선언 순서로 직렬화한다" 로 정했기 때문이고, 그것이
 * 정해져 있어야 같은 회차가 같은 URL 을 낸다 — 공유 링크가 안정적이려면 직렬화가 결정적이어야
 * 한다. profile 문항의 축은 여기 없어야 하고, 있으면 그 자체가 불일치다(§6.3).
 */
function matchesSchema(scoreStats: unknown, schema: ScoringSchema): scoreStats is ScoreStats {
  if (!isPlainObject(scoreStats)) {
    return false;
  }

  const expected = schema.axes.map((axis) => axisId(axis.poleA, axis.poleB));
  const actual = Object.keys(scoreStats);

  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    return false;
  }

  return schema.axes.every((axis, index) => {
    const entry = scoreStats[expected[index]];

    if (!isPlainObject(entry)) {
      return false;
    }

    if (entry.poleA !== axis.poleA || entry.poleB !== axis.poleB) {
      return false;
    }

    if (entry.dominant !== axis.poleA && entry.dominant !== axis.poleB) {
      return false;
    }

    if (!isPlainObject(entry.counts)) {
      return false;
    }

    const countKeys = Object.keys(entry.counts);
    if (countKeys.length !== 2 || !countKeys.includes(axis.poleA) || !countKeys.includes(axis.poleB)) {
      return false;
    }

    return isCount(entry.counts[axis.poleA]) && isCount(entry.counts[axis.poleB]);
  });
}

export function encodeResultPayload(payload: ResultPayload): string {
  return toUrlSafeBase64(new TextEncoder().encode(JSON.stringify(payload)));
}

export function decodeResultPayload(raw: string, schema: ScoringSchema): DecodeResultPayloadResult {
  const bytes = raw.length === 0 ? null : fromUrlSafeBase64(raw);

  if (!bytes) {
    return {ok: false, reason: 'BASE64_DECODE_FAILED'};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  } catch {
    // UTF-8 로 읽히지 않는 바이트도 여기서 걸린다 — Base64 로는 멀쩡히 디코딩되지만 JSON 이
    // 아닌 입력이므로, 보고할 이름은 파싱 실패다.
    return {ok: false, reason: 'JSON_PARSE_FAILED'};
  }

  if (!isPlainObject(parsed) || !('scoreStats' in parsed)) {
    return {ok: false, reason: 'MISSING_SCORE_STATS'};
  }

  if (!matchesSchema(parsed.scoreStats, schema)) {
    return {ok: false, reason: 'SCORE_STATS_SCHEMA_MISMATCH'};
  }

  // §6.3 은 `shared` 를 필수 필드로 세지 않으므로 없는 것은 `false` 다. 그러나 **있는데 boolean
  // 이 아닌 것**은 통과시키지 않는다 — 이 값 하나가 §5.2 의 케이스 매트릭스에서 어느 UX 로 갈지를
  // 고르므로, 참도 거짓도 아닌 값이 그 분기에 닿으면 안 된다.
  if ('shared' in parsed && typeof parsed.shared !== 'boolean') {
    return {ok: false, reason: 'INVALID_SHARED'};
  }

  return {ok: true, value: {scoreStats: parsed.scoreStats, shared: parsed.shared === true}};
}
