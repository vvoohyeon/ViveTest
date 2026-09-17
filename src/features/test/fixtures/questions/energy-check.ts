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
  },
  {
    seq: '3',
    question: {en: '☕ On a break between tasks, I usually', kr: '☕ 일 사이에 잠깐 쉬될 때 나는'},
    poleA: 'E',
    poleB: 'I',
    answerA: {en: 'go find someone to talk to.', kr: '누군가와 이야기하러 가는 편'},
    answerB: {en: 'step away on my own for a bit.', kr: '혼자 잠깐 빠져 있는 편'}
  },
  {
    seq: '4',
    question: {en: '🗓️ When the day starts, I feel better if', kr: '🗓️ 하루를 시작할 때 나는'},
    poleA: 'J',
    poleB: 'P',
    answerA: {en: 'the order of things is already settled.', kr: '뭐부터 할지 정해져 있어야 마음이 편해'},
    answerB: {en: 'I can pick what to do as I go.', kr: '그때그때 골라가며 하는 게 더 편해'}
  }
];
