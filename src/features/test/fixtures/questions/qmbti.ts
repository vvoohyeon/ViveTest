import type {QuestionSourceRow} from './types';

export const qmbtiQuestions: ReadonlyArray<QuestionSourceRow> = [
  {
    seq: '1',
    question: {en: '🎉 At parties or birthday celebrations,', kr: '🎉 파티나 생일잔치에 가면 나는'},
    poleA: 'E',
    poleB: 'I',
    answerA: {en: 'Early morning blocks', kr: '처음 보는 친구랑도 금방 친해져'},
    answerB: {en: 'Late-night sprints', kr: '원래 잘 아는 친구랑 주로 어울려'}
  },
  {
    seq: '2',
    question: {en: "🔮 Between these two, I'm better at noticing", kr: '🔮 둘 중 내가 더 잘 알아채는건'},
    poleA: 'S',
    poleB: 'N',
    answerA: {en: 'what someone needs right now.', kr: '다른 사람이 지금 당장 필요한 것'},
    answerB: {en: 'how someone might feel a little later.', kr: '다른 사람이 조금 뒤 어떤 기분을 느낄지'}
  },
  {
    seq: '3',
    question: {
      en: "📍 When I don't like the place my friends chose to meet, I usually",
      kr: '📍 친구들과 약속장소가 맘에 안들 때'
    },
    poleA: 'T',
    poleB: 'F',
    answerA: {en: "say clearly that I don't like it.", kr: '나는 싫다고 확실히 표현하는 편이야'},
    answerB: {
      en: "go along with it even if I don't like it, as long as everyone else does.",
      kr: '나 빼고 전부 좋다면 하면, 싫어도 그냥 동의하는 편이야'
    }
  },
  {
    seq: '4',
    question: {en: '📝 When I get a new homework assignment, I usually', kr: '📝 새로운 숙제를 받으면'},
    poleA: 'J',
    poleB: 'P',
    answerA: {en: 'start early without putting it off.', kr: '미루지 않고 여유 있게 먼저 시작하는 편'},
    answerB: {
      en: 'start when I feel like it, even if I end up rushing later.',
      kr: '시간에 쫓기더라도 마음이 내킬 때 시작하는 편'
    }
  },
  {
    seq: '5',
    question: {en: '🛒 When shopping at the grocery store, I usually', kr: '🛒 마트에서 장을 볼 때 나는'},
    poleA: 'P',
    poleB: 'J',
    answerA: {
      en: 'like to look around slowly and buy what catches my eye.',
      kr: '천천히 구경하면서 눈에 보이는거 위주로 사고 싶어'
    },
    answerB: {
      en: 'feel more comfortable deciding in advance and buying only what I need.',
      kr: '뭘 살지 미리 정해서 필요한 것만 사는게 더 편해'
    }
  },
  {
    seq: '6',
    question: {en: '🧠 When learning something new, I prefer to', kr: '🧠 새로운걸 배울 때 나는'},
    poleA: 'I',
    poleB: 'E',
    answerA: {en: 'learn by talking and sharing ideas with friends.', kr: '친구들이랑 같이 이야기하면서 배우는게 좋아'},
    answerB: {en: 'focus quietly and learn on my own.', kr: '조용히 혼자 집중하면서 배우는게 더 편해'}
  }
];
