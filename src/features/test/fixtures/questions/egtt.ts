import type {QuestionSourceRow} from './types';

// egtt는 profile question(seq='q.1') 1개와 scoring question 2개로 구성된다.
// profile question에서는 poleA / poleB가 존재하지 않는다(Sheets에서도 빈 값).
export const egttQuestions: ReadonlyArray<QuestionSourceRow> = [
  {
    seq: 'q.1',
    question: {en: 'My sexual identity is', kr: '나의 성별은'},
    poleA: undefined,
    poleB: undefined,
    answerA: {en: 'Male', kr: '남성'},
    answerB: {en: 'Female', kr: '여성'}
  },
  {
    seq: '1',
    question: {en: "I'm interested in making me charming...", kr: '패션이나 나를 꾸미는 일에 관심이'},
    poleA: 'E',
    poleB: 'T',
    answerA: {en: 'A lot', kr: '많다'},
    answerB: {en: 'Not at all', kr: '없다'}
  },
  {
    seq: '2',
    question: {en: "I'm better at noticing", kr: '내가 더 잘 알아채는건'},
    poleA: 'T',
    poleB: 'E',
    answerA: {en: 'what someone needs right now.', kr: '다른 사람이 지금 당장 필요한 것'},
    answerB: {en: 'how someone might feel a little later.', kr: '다른 사람이 조금 뒤 어떤 기분을 느낄지'}
  }
];
