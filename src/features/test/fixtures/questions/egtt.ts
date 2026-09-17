import type {QuestionSourceRow} from './types';

// egtt는 profile question(seq='q.1') 1개와 scoring question 3개로 구성된다.
// profile question에서는 poleA / poleB가 존재하지 않는다(Sheets에서도 빈 값).
export const egttQuestions: ReadonlyArray<QuestionSourceRow> = [
  {
    seq: 'q.1',
    question: {en: 'My sexual identity is', kr: '나의 성별은'},
    poleA: undefined,
    poleB: undefined,
    // 표시용 answer label. domain qualifier token(['M','F'])과 다름.
    // token 매핑은 schema-registry.ts의 egtt qualifierFields.values를 기준으로 한다.
    answerA: {en: 'Male', kr: '남성'},
    answerB: {en: 'Female', kr: '여성'}
  },
  {
    seq: '1',
    question: {en: 'I`m interested in making me charming...', kr: '패션이나 나를 꾸미는 일에 관심이'},
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
  },
  {
    seq: '3',
    question: {en: 'When I meet someone new, I tend to notice', kr: '처음 보는 사람을 만나면 나는'},
    poleA: 'E',
    poleB: 'T',
    answerA: {en: 'how they look and carry themselves.', kr: '입고 꾸민 모습이 먼저 눈에 들어와'},
    answerB: {en: 'what they say and how they say it.', kr: '무슨 말을 어떻게 하는지가 먼저 들려'}
  }
];
