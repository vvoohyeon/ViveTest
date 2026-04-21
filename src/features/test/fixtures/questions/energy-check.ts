import type {QuestionSourceRow} from './types';

export const energyCheckQuestions: ReadonlyArray<QuestionSourceRow> = [
  {
    seq: '1',
    question: {en: 'Which block drains your energy the most?', kr: '어떤 시간대가 에너지를 가장 많이 소모시키나요?'},
    poleA: 'T',
    poleB: 'F',
    answerA: {en: 'Context switching', kr: '잦은 맥락 전환'},
    answerB: {en: 'Long meetings', kr: '긴 회의'}
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
