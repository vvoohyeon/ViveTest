import type {QuestionSourceRow} from './types';

export const debugSampleQuestions: ReadonlyArray<QuestionSourceRow> = [
  {
    seq: '1',
    question: {
      en: 'Do you prefer deterministic or exploratory planning?',
      kr: '계획은 정해진 흐름과 탐색형 접근 중 어느 쪽이 더 편한가요?'
    },
    poleA: 'T',
    poleB: 'F',
    answerA: {en: 'Deterministic', kr: '정해진 흐름'},
    answerB: {en: 'Exploratory', kr: '탐색형 접근'}
  },
  {
    seq: '2',
    question: {
      en: 'Which block keeps your focus the longest?',
      kr: '하루 중 가장 안정적으로 흐름을 유지하는 시간대는 언제인가요?'
    },
    poleA: 'S',
    poleB: 'N',
    answerA: {en: 'Morning work sessions', kr: '오전 블록'},
    answerB: {en: 'Afternoon work sessions', kr: '오후 블록'}
  },
  {
    seq: '3',
    question: {
      en: 'What breaks your pace more often?',
      kr: '집중이 깨질 때 더 자주 영향을 주는 요인은 무엇인가요?'
    },
    poleA: 'T',
    poleB: 'F',
    answerA: {en: 'Meetings and pings', kr: '회의와 메시지'},
    answerB: {en: 'Context switching', kr: '맥락 전환'}
  },
  {
    seq: '4',
    question: {
      en: 'Do you usually review results right away?',
      kr: '테스트를 끝낸 뒤 결과를 바로 정리하는 편인가요?'
    },
    poleA: 'J',
    poleB: 'P',
    answerA: {en: 'Yes, immediately', kr: '바로 정리한다'},
    answerB: {en: 'Later, in a batch', kr: '나중에 몰아서 본다'}
  }
];
