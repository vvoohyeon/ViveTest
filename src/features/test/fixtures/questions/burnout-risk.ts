import type {QuestionSourceRow} from './types';

// 이 은행의 자리표시자는 **의도된 것**이다 — 이 variant 는 진입이 닫혀 있어(랜딩 카드가
// 확장되지 않고 미리보기 문항도 렌더되지 않는다) 화면에 한 글자도 나오지 않는다.
// 여는 커밋에서 `tests/unit/reachable-question-copy.test.ts` 가 이것을 붉힌다 — 그것이 문구를
// 채울 시점이고, 그전에 미리 채울 이유가 없다.

export const burnoutRiskQuestions: ReadonlyArray<QuestionSourceRow> = [
  {
    seq: '1',
    question: {en: 'Placeholder preview question for upcoming card.', kr: '공개 예정 카드를 위한 임시 미리보기 질문입니다.'},
    poleA: 'T',
    poleB: 'F',
    answerA: {en: 'Option A', kr: '옵션 A'},
    answerB: {en: 'Option B', kr: '옵션 B'}
  },
  {
    seq: '2',
    question: {en: '💔 When a friend misunderstands me, I usually', kr: '💔 친구가 오해하고 삐졌을 때 나는'},
    poleA: 'N',
    poleB: 'S',
    answerA: {en: 'want to clear up the misunderstanding quickly.', kr: '빨리 오해를 풀고 다시 노는게 더 좋아'},
    answerB: {en: 'wait until my friend feels better.', kr: '친구 마음이 풀릴 때까지 기다려주는 편이야'}
  }
];
