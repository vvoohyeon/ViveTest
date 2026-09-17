import type {AppLocale} from '@/config/site';
import {
  buildTypeSegment,
  computeScoreStats,
  decodeResultPayload,
  deriveDerivedType,
  encodeResultPayload,
  parseTypeSegment,
  type ComputeScoreStatsResult,
  type InvalidResultPayloadReason
} from '@/features/test/domain';
import type {ScoreStats} from '@/features/test/domain';
import type {ResolvedQuestion} from '@/features/test/question-bank';
import {projectRunResponses, type ProjectResponsesFailure} from '@/features/test/response-projection';
import {getSchemaForVariant} from '@/features/test/schema-registry';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';

/**
 * Result URL 한 개를 화면이 그릴 수 있는 것 하나로 바꾼다 — `req-test.md` §5.1 · §5.2 · §6.3.
 *
 * **이 파일의 존재 이유는 「부분 렌더링 금지」(§6.3)를 구조로 만드는 것이다.** 라우트가 검증
 * 단계마다 조금씩 그리면 어느 실패는 절반 그려진 화면을 남긴다. 그래서 여기서 **전부 통과한
 * 것 하나** 또는 **이유 하나**만 돌려준다: 화면은 `ok` 를 보고 갈래를 고르고, 실패 쪽 갈래는
 * 결과 내용을 한 조각도 손에 쥐지 못한다.
 *
 * §6.3 이 세는 실패는 열 갈래이고 전부 같은 곳으로 모인다.
 *
 * | 갈래 | 내는 곳 |
 * |:---|:---|
 * | `VARIANT_MISSING` · `TYPE_MISSING` | 여기 (경로 세그먼트) |
 * | `SCHEMA_NOT_FOUND` | 여기 (`schema-registry` 조회) |
 * | `PAYLOAD_QUERY_MISSING` | 여기 (키 없는 query string 부재) |
 * | `BASE64_DECODE_FAILED` · `JSON_PARSE_FAILED` · `MISSING_SCORE_STATS` · `SCORE_STATS_SCHEMA_MISMATCH` · `INVALID_SHARED` | `decodeResultPayload` |
 * | `LENGTH_MISMATCH` · `INVALID_QUALIFIER_VALUE` | `parseTypeSegment` |
 *
 * **순서는 §5.1 의 불변식 그대로다** — Base64 → JSON → schema validation → type segment 파싱.
 * schema **조회**만 그 앞에 온다: 뒤의 두 단계가 둘 다 schema 를 인자로 받으므로 조회 없이는
 * 시작할 수 없고, 조회 실패는 §6.3 이 따로 세는 갈래다.
 */

export type ResultViewFailure =
  | 'VARIANT_MISSING'
  | 'TYPE_MISSING'
  | 'SCHEMA_NOT_FOUND'
  | 'PAYLOAD_QUERY_MISSING'
  | InvalidResultPayloadReason
  | 'LENGTH_MISMATCH'
  | 'INVALID_QUALIFIER_VALUE';

/**
 * §5.2 케이스 매트릭스의 갈래 이름.
 *
 * 케이스 3(공유 payload 인데 로컬에 같은 회차가 있다)은 history 가 생긴 뒤에 나뉜다 —
 * `req-test.md` §5.2 가 AR-006 으로 그렇게 정해 두었고, 그때까지 케이스 2 와 같이 다룬다.
 */
export type ResultAudience = 'own' | 'shared';

export interface ResultView {
  variant: string;
  derivedType: string;
  qualifiers: Record<string, string>;
  scoreStats: ScoreStats;
  audience: ResultAudience;
}

export type ResolveResultViewResult = {ok: true; view: ResultView} | {ok: false; reason: ResultViewFailure};

export interface ResultRouteInput {
  variant: string;
  typeSegment: string;
  /** 키 없는 query string 의 값. 그런 것이 없으면 `null` 이다 — 빈 문자열과 구별한다. */
  payload: string | null;
}

/**
 * 키 없는 query string 을 읽는다 — §5.1 은 payload 를 그 자리에 **단독으로** 둔다고 정했다.
 *
 * Next 는 `?abc` 를 `{abc: ''}` 로 준다. 그래서 「값이 빈 문자열인 키」가 payload 이고, 그런
 * 것이 **정확히 하나**일 때만 받는다. 둘 이상이면 어느 쪽이 payload 인지 URL 이 말해 주지
 * 않으므로 고르지 않는다 — 고르면 그 선택은 우리가 발명한 규칙이 된다.
 */
export function readKeylessQuery(searchParams: Record<string, string | string[] | undefined>): string | null {
  const keyless = Object.entries(searchParams)
    .filter(([, value]) => value === '')
    .map(([key]) => key);

  return keyless.length === 1 ? keyless[0] : null;
}

export function resolveResultView(input: ResultRouteInput): ResolveResultViewResult {
  if (input.variant.length === 0) {
    return {ok: false, reason: 'VARIANT_MISSING'};
  }

  if (input.typeSegment.length === 0) {
    return {ok: false, reason: 'TYPE_MISSING'};
  }

  const schema = getSchemaForVariant(input.variant);

  if (!schema) {
    return {ok: false, reason: 'SCHEMA_NOT_FOUND'};
  }

  if (input.payload === null) {
    return {ok: false, reason: 'PAYLOAD_QUERY_MISSING'};
  }

  const decoded = decodeResultPayload(input.payload, schema);

  if (!decoded.ok) {
    return {ok: false, reason: decoded.reason};
  }

  const parsedType = parseTypeSegment(input.typeSegment, schema);

  if (!parsedType.ok) {
    return {ok: false, reason: parsedType.reason};
  }

  return {
    ok: true,
    view: {
      variant: input.variant,
      derivedType: parsedType.derivedType,
      qualifiers: parsedType.qualifiers,
      scoreStats: decoded.value.scoreStats,
      audience: decoded.value.shared ? 'shared' : 'own'
    }
  };
}
/**
 * 끝난 회차 하나를 주소 하나로 바꾼다 — `resolveResultView` 의 반대 방향이다.
 *
 * 두 방향을 한 파일에 두는 이유는 **같은 계약의 앞뒤**이기 때문이다. 직렬화 순서(schema 선언
 * 순서)와 `type` 세그먼트의 조립 규칙이 여기서 어긋나면 우리가 만든 주소를 우리가 읽지 못하고,
 * 그 어긋남은 두 파일에 나뉘어 있으면 리뷰로 보이지 않는다.
 *
 * `shared` 는 여기서 항상 `false` 다 — 회차를 끝낸 사람이 보는 자기 결과이고(§5.2 케이스 1),
 * `true` 는 공유 링크를 **만드는** 자리의 값이다. 그 자리는 아직 없다.
 */
export type ResultAddress = `/${AppLocale}/result/${string}/${string}?${string}`;

export type BuildResultAddressFailure =
  | 'SCHEMA_NOT_FOUND'
  | ProjectResponsesFailure
  | 'INCOMPLETE_SCORING_RESPONSES'
  | 'UNMATCHED_QUESTION'
  | 'AXIS_NOT_FOUND'
  | 'TOKEN_LENGTH_MISMATCH'
  | 'QUALIFIER_RESPONSE_MISSING'
  | 'INVALID_QUALIFIER_VALUE';

/**
 * `ScoreStats` 는 색인 서명을 가진 레코드라 `'error' in result` 로는 갈라지지 않는다 — 축 이름이
 * `error` 인 경우와 구분되지 않기 때문이다. **값의 타입**으로 가른다: 실패 쪽의 `error` 는 문자열
 * 이고 축 쪽의 값은 객체다.
 */
function isComputeError(
  result: ComputeScoreStatsResult
): result is {error: 'INCOMPLETE_SCORING_RESPONSES' | 'UNMATCHED_QUESTION'} {
  return typeof (result as {error?: unknown}).error === 'string';
}

export type BuildResultAddressResult =
  | {ok: true; address: ResultAddress}
  | {ok: false; reason: BuildResultAddressFailure};

export function buildResultAddress(input: {
  locale: AppLocale;
  variant: string;
  questions: ReadonlyArray<ResolvedQuestion>;
  answers: Record<string, string>;
}): BuildResultAddressResult {
  const schema = getSchemaForVariant(input.variant);

  if (!schema) {
    return {ok: false, reason: 'SCHEMA_NOT_FOUND'};
  }

  const projected = projectRunResponses({questions: input.questions, answers: input.answers});

  if (!projected.ok) {
    return {ok: false, reason: projected.reason};
  }

  const computed = computeScoreStats(projected.value.questions, projected.value.responses, schema);

  if (isComputeError(computed)) {
    return {ok: false, reason: computed.error};
  }

  const scoreStats = computed;

  const derivedType = deriveDerivedType(scoreStats, schema);

  if (typeof derivedType !== 'string') {
    return {ok: false, reason: derivedType.error};
  }

  const typeSegment = buildTypeSegment(derivedType, projected.value.responses, schema);

  if (!typeSegment.ok) {
    return {ok: false, reason: typeSegment.reason};
  }

  const path = buildLocalizedPath(RouteBuilder.result(input.variant, typeSegment.typeSegment), input.locale);
  const payload = encodeResultPayload({scoreStats, shared: false});

  return {ok: true, address: `${path}?${payload}`};
}
