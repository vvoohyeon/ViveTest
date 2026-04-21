import type {QuestionSourceRow} from './types';

export const creativityProfileQuestions: ReadonlyArray<QuestionSourceRow> = [
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
