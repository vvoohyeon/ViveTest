import {describe, expect, it} from 'vitest';

import {asQuestionIndex} from '../../src/features/test/domain';
import {buildVariantQuestionBank, type ResolvedQuestion} from '../../src/features/test/question-bank';
import {projectRunResponses} from '../../src/features/test/response-projection';
import {buildResultAddress, resolveResultView, readKeylessQuery} from '../../src/features/test/result-view-model';

const MBTI_QUESTIONS = buildVariantQuestionBank('qmbti', 'en');
const EGTT_QUESTIONS = buildVariantQuestionBank('egtt', 'en');

function answerEverything(questions: ReadonlyArray<ResolvedQuestion>, choice: 'A' | 'B'): Record<string, string> {
  return Object.fromEntries(
    questions
      .filter((question) => question.questionType === 'scoring')
      .map((question) => [String(question.canonicalIndex), choice])
  );
}

function splitAddress(address: string): {path: string; payload: string} {
  const [path, payload = ''] = address.split('?');
  return {path, payload};
}

describe('runtime response projection', () => {
  it('moves scoring answers onto poles and leaves qualifier tokens alone', () => {
    // `'A' | 'B'` 는 화면의 어휘다. 축 이름은 문항마다 다르고 뒤집혀 있기도 하다 —
    // `qmbti` 의 q6 은 `poleA: 'I'` 라 같은 `'A'` 가 q1 에서는 `E`, q6 에서는 `I` 가 된다.
    const projected = projectRunResponses({
      questions: MBTI_QUESTIONS,
      answers: answerEverything(MBTI_QUESTIONS, 'A')
    });

    expect(projected.ok).toBe(true);
    if (!projected.ok) {
      return;
    }

    expect(projected.value.responses.get(asQuestionIndex(1))).toBe('E');
    expect(projected.value.responses.get(asQuestionIndex(6))).toBe('I');
  });

  it('passes a qualifier answer through without a second translation', () => {
    // 오버레이가 `QualifierFieldSpec.values` 를 그대로 토큰으로 쓰므로 여기서 또 옮기면
    // 같은 변환이 두 곳에 생긴다. 파일을 예약해 둔 주석의 사상과 다른 지점이다.
    const projected = projectRunResponses({
      questions: EGTT_QUESTIONS,
      answers: {...answerEverything(EGTT_QUESTIONS, 'A'), '1': 'M'}
    });

    expect(projected.ok).toBe(true);
    if (!projected.ok) {
      return;
    }

    expect(projected.value.responses.get(asQuestionIndex(1))).toBe('M');
  });

  it('refuses a scoring answer it cannot place instead of dropping the question', () => {
    // 떨어뜨리면 남은 문항만으로 그럴듯한 결과가 나온다 — 그것이 가장 나쁜 결과다.
    expect(
      projectRunResponses({questions: MBTI_QUESTIONS, answers: {}})
    ).toEqual({ok: false, reason: 'MISSING_SCORING_ANSWER'});

    expect(
      projectRunResponses({
        questions: MBTI_QUESTIONS,
        answers: {...answerEverything(MBTI_QUESTIONS, 'A'), '3': 'M'}
      })
    ).toEqual({ok: false, reason: 'UNPROJECTABLE_SCORING_ANSWER'});

    const polelessScoring: ResolvedQuestion[] = [
      {...MBTI_QUESTIONS[0], poleA: undefined, poleB: undefined}
    ];
    expect(projectRunResponses({questions: polelessScoring, answers: {'1': 'A'}})).toEqual({
      ok: false,
      reason: 'MISSING_AXIS_POLES'
    });
  });
});

describe('result address (req-test.md §5.1)', () => {
  it('builds an address the route can read back — 두 방향이 한 계약이다', () => {
    const answers = answerEverything(MBTI_QUESTIONS, 'A');
    const built = buildResultAddress({locale: 'en', variant: 'qmbti', questions: MBTI_QUESTIONS, answers});

    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }

    const {path, payload} = splitAddress(built.address);
    expect(path).toBe('/en/result/qmbti/ESTJ');

    // 여기가 이 검사의 요점이다 — 우리가 만든 주소를 우리가 읽을 수 있어야 한다.
    const resolved = resolveResultView({
      variant: 'qmbti',
      typeSegment: 'ESTJ',
      payload: readKeylessQuery({[payload]: ''})
    });

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) {
      return;
    }

    expect(resolved.view.derivedType).toBe('ESTJ');
    expect(resolved.view.audience).toBe('own');
    expect(Object.keys(resolved.view.scoreStats)).toEqual(['EI', 'SN', 'TF', 'JP']);
  });

  it('carries the qualifier in the type segment rather than in the payload', () => {
    const answers = {...answerEverything(EGTT_QUESTIONS, 'A'), '1': 'M'};
    const built = buildResultAddress({locale: 'ja', variant: 'egtt', questions: EGTT_QUESTIONS, answers});

    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }

    const {path, payload} = splitAddress(built.address);
    expect(path).toBe('/ja/result/egtt/EM');

    const decodedPayload = JSON.parse(
      Buffer.from(payload.replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString('utf8')
    );
    expect(Object.keys(decodedPayload.scoreStats)).toEqual(['ET']);
    expect(decodedPayload).not.toHaveProperty('gender');
  });

  it('refuses to build an address instead of building half of one', () => {
    expect(
      buildResultAddress({locale: 'en', variant: 'ops-handbook', questions: MBTI_QUESTIONS, answers: {}})
    ).toEqual({ok: false, reason: 'SCHEMA_NOT_FOUND'});

    expect(
      buildResultAddress({locale: 'en', variant: 'qmbti', questions: MBTI_QUESTIONS, answers: {}})
    ).toEqual({ok: false, reason: 'MISSING_SCORING_ANSWER'});

    // qualifier 를 고르지 않은 채 끝난 회차 — `type` 세그먼트를 만들 수 없다.
    expect(
      buildResultAddress({
        locale: 'en',
        variant: 'egtt',
        questions: EGTT_QUESTIONS,
        answers: answerEverything(EGTT_QUESTIONS, 'A')
      })
    ).toEqual({ok: false, reason: 'QUALIFIER_RESPONSE_MISSING'});

    // `values` 밖의 토큰은 여기서 한 번, 라우트에서 다시 한 번 걸린다 — 검증의 자리는 하나다.
    expect(
      buildResultAddress({
        locale: 'en',
        variant: 'egtt',
        questions: EGTT_QUESTIONS,
        answers: {...answerEverything(EGTT_QUESTIONS, 'A'), '1': 'X'}
      })
    ).toEqual({ok: false, reason: 'INVALID_QUALIFIER_VALUE'});
  });

  it('keeps the address stable for the same run — 공유 링크가 흔들리지 않는다', () => {
    const answers = answerEverything(MBTI_QUESTIONS, 'B');
    const first = buildResultAddress({locale: 'kr', variant: 'qmbti', questions: MBTI_QUESTIONS, answers});
    const second = buildResultAddress({
      locale: 'kr',
      variant: 'qmbti',
      // 키 순서를 뒤집어도 같은 주소여야 한다 — 직렬화 순서는 schema 선언이 정한다(§5.1).
      questions: MBTI_QUESTIONS,
      answers: Object.fromEntries(Object.entries(answers).reverse())
    });

    expect(first).toEqual(second);
  });
});
