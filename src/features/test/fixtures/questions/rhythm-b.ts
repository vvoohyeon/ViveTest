import type {QuestionSourceRow} from './types';

export const rhythmBQuestions: ReadonlyArray<QuestionSourceRow> = [
  {
    seq: '1',
    question: {
      en: 'How often do interruptions break your pace? How often do interruptions break your pace? How often do interruptions break your pace?',
      kr: '방해가 흐름을 끊는 빈도는 어느 정도인가요? 방해가 흐름을 끊는 빈도는 어느 정도인가요? 방해가 흐름을 끊는 빈도는 어느 정도인가요?'
    },
    poleA: 'E',
    poleB: 'I',
    answerA: {en: 'Almost never', kr: '거의 없다 동해물과 백두산이 마르고 닳도록 긴 응답 예시 여기'},
    answerB: {en: 'Multiple times each hour', kr: '한 시간에도 여러 번 있다 동해물과 백두산이 마르고 닳도록 긴 응답 예시 여기'}
  },
  {
    seq: '2',
    question: {en: '📋 When I do something familiar, I usually', kr: '📋 익숙한 일을 할 때 나는'},
    poleA: 'S',
    poleB: 'N',
    answerA: {en: 'feel more comfortable doing it the way people usually do.', kr: '사람들이 보통 하는대로 따라하는게 편해'},
    answerB: {en: 'prefer changing it and doing it in my own way.', kr: '내 스타일로 바꿔서 하는 게 더 편하고 좋아'}
  },
  {
    seq: '3',
    question: {en: '⚖️ What I care about more is', kr: '⚖️ 내가 더 중요하게 생각하는건'},
    poleA: 'T',
    poleB: 'F',
    answerA: {en: 'clear standards and being consistent all the time.', kr: '기준이 확실하고 언제나 일관된 태도'},
    answerB: {en: 'being flexible and adjusting to the situation.', kr: '상황에 맞춰 유연하게 바꿀 수 있는 태도'}
  },
  {
    seq: '4',
    question: {en: '⚙️ When playing a new game with friends, I usually', kr: '⚙️ 친구들과 새로운 게임을 하면'},
    poleA: 'J',
    poleB: 'P',
    answerA: {
      en: 'set the rules and make sure everyone understands before we start.',
      kr: '규칙을 정하고 모두가 이해한 후 시작해'
    },
    answerB: {en: 'am okay with changing the rules as we go when needed.', kr: '하면서 필요할 때마다 규칙을 바꿔도 괜찮아'}
  }
];
