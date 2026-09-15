import type {SemanticAnswer} from '@/features/test/test-run-reducer';

/**
 * 답변 선택지 하나가 지금 어떤 상태로 보여야 하는가.
 *
 * - `selected` — 지금 고른 것. 채워진 마크.
 * - `previous-answer` — **과거에 골랐던 것.** 마크 자리에 표식만 있고 선택은 아니다.
 * - `none` — 아무것도 아님.
 *
 * **왜 `selected` 와 `previous-answer` 를 가르는가.** 이 플로우에는 [다음] 버튼이 없고 선택이
 * 곧 진행이라(`req-test.md` §4.3), 선택된 상태로 머무는 문항이 존재할 수 없다. 그래서 「과거에
 * 골랐다」는 정보를 선택 상태로 표현할 수 없고 별도 표식이 져야 한다. 표식은 선택이 아니므로
 * 선택으로 읽히는 시각 무게를 갖지 않고, 보조기술에도 선택 상태가 아니라 텍스트 대안으로 간다.
 *
 * **예외 둘이 `selected` 를 되살린다.**
 * - 마지막 문항(§4.4): 자동 진행이 없어 선택 상태가 머무를 수 있고, 그 상태가 곧 "결과 보기"
 *   CTA 가 활성인 이유다. CTA 는 켜졌는데 아무것도 선택돼 보이지 않는 화면을 만들지 않는다.
 * - 탭 직후 잠금 구간(현재 150ms): 그 구간이 곧 탭 피드백이다.
 */
export type AnswerChoiceState = 'selected' | 'previous-answer' | 'none';

export function resolveAnswerChoiceState(input: {
  choice: SemanticAnswer;
  storedAnswer: SemanticAnswer | null;
  /** 이 문항이 화면에 있는 동안 방금 탭이 일어났는가(응답 잠금 구간). */
  justAnswered: boolean;
  isLastQuestion: boolean;
}): AnswerChoiceState {
  if (input.storedAnswer !== input.choice) {
    return 'none';
  }

  return input.isLastQuestion || input.justAnswered ? 'selected' : 'previous-answer';
}
