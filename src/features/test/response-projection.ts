import {asQuestionIndex, type Question, type QuestionIndex} from '@/features/test/domain';
import type {ResolvedQuestion} from '@/features/test/question-bank';

/**
 * 런타임 응답을 도메인 함수가 먹는 모양으로 바꾼다.
 *
 * `computeScoreStats` · `buildTypeSegment` 는 pole label 과 qualifier token 을 먹고 `'A' | 'B'`
 * 를 받지 않는다. 그 사이를 잇는 층이 여기다 — 이 파일이 비어 있는 동안 결과 주소를 만들 수
 * 없었고, 그래서 `docs/plans/2026-05-17-result-pipeline-todos.md` §3 이 이것을 1 번으로 적었다.
 *
 * **두 갈래의 사상이 서로 다르고, 그 차이는 이 파일을 예약한 주석이 적어 둔 것과 다르다.**
 * 예약 주석은 qualifier 도 `A → values[0]` · `B → values[1]` 로 옮긴다고 적었는데, 제품은
 * qualifier 응답을 **처음부터 토큰으로** 저장한다: 오버레이의 선택지가 `QualifierFieldSpec.values`
 * 를 그대로 `token` 으로 들고 있고(`qualifier-overlay-model.ts`), 위저드가 그 토큰을 답변 맵에
 * 넣는다(`use-qualifier-overlay-wizard.ts`). 그러므로 여기서 할 일은 **옮기지 않는 것**이다.
 *
 * 옮기는 척하는 사상을 넣으면 두 곳이 같은 변환을 두 번 하게 되고, 둘 중 하나가 바뀌는 날
 * 조용히 어긋난다. 토큰이 `values` 밖의 값이면 `buildTypeSegment` 가 거절하므로 여기서 한 번 더
 * 보지 않는다 — 검증의 자리는 하나다.
 *
 * scoring 응답은 반대로 반드시 옮겨야 한다: `'A' → question.poleA` · `'B' → question.poleB`.
 */

export type ProjectResponsesFailure =
  | 'MISSING_SCORING_ANSWER'
  | 'UNPROJECTABLE_SCORING_ANSWER'
  | 'MISSING_AXIS_POLES';

export interface ProjectedRun {
  /** 도메인 `Question` 목록 — `computeScoreStats` 가 축과 맞추는 데 쓴다. */
  questions: Question[];
  /** canonical index → pole label(scoring) 또는 qualifier token(profile). */
  responses: Map<QuestionIndex, string>;
}

export type ProjectRunResponsesResult =
  | {ok: true; value: ProjectedRun}
  | {ok: false; reason: ProjectResponsesFailure};

export function projectRunResponses(input: {
  questions: ReadonlyArray<ResolvedQuestion>;
  answers: Record<string, string>;
}): ProjectRunResponsesResult {
  const questions: Question[] = [];
  const responses = new Map<QuestionIndex, string>();

  for (const question of input.questions) {
    const index = asQuestionIndex(question.canonicalIndex);
    questions.push({
      index,
      poleA: question.poleA,
      poleB: question.poleB,
      questionType: question.questionType
    });

    const answer = input.answers[String(question.canonicalIndex)];

    if (question.questionType !== 'scoring') {
      // qualifier 응답은 이미 토큰이다 — 있는 그대로 넘긴다. 없으면 넣지 않고,
      // `buildTypeSegment` 가 `QUALIFIER_RESPONSE_MISSING` 으로 보고한다.
      if (answer !== undefined) {
        responses.set(index, answer);
      }
      continue;
    }

    if (answer === undefined) {
      return {ok: false, reason: 'MISSING_SCORING_ANSWER'};
    }

    if (question.poleA === undefined || question.poleB === undefined) {
      // 축을 갖지 않는 scoring 문항은 데이터 결함이다. 여기서 멈추지 않으면 그 문항이 어느 축에도
      // 안 붙은 채 `computeScoreStats` 가 나머지만으로 결과를 내고, 그 결과는 그럴듯하다.
      return {ok: false, reason: 'MISSING_AXIS_POLES'};
    }

    if (answer !== 'A' && answer !== 'B') {
      return {ok: false, reason: 'UNPROJECTABLE_SCORING_ANSWER'};
    }

    responses.set(index, answer === 'A' ? question.poleA : question.poleB);
  }

  return {ok: true, value: {questions, responses}};
}
