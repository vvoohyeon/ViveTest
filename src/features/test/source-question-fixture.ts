/**
 * Questions Sheets 단일 행을 그대로 반영한 타입.
 * seq: Sheets의 원본 seq 표기. 숫자 문자열("1", "2") 또는 profile 표기("q.1", "q.2").
 * poleA, poleB: profile 문항(q.*)에서는 Sheets에 값이 없으므로 undefined.
 */
export interface QuestionSourceRow {
  seq: string;
  questionEN: string;
  questionKR: string;
  poleA?: string;
  poleB?: string;
  answerAEN: string;
  answerAKR: string;
  answerBEN: string;
  answerBKR: string;
}

/**
 * variant ID를 키로, 해당 variant의 Questions 시트 행 배열을 값으로 갖는 맵.
 * 행 순서는 Sheets 원본의 출현 순서와 동일하게 유지한다.
 */
export type QuestionSourceFixtureMap = Readonly<Record<string, ReadonlyArray<QuestionSourceRow>>>;

export const questionSourceFixture: QuestionSourceFixtureMap = {
  'qmbti': [
    {
      seq: '1',
      questionEN: '🎉 At parties or birthday celebrations,',
      questionKR: '🎉 파티나 생일잔치에 가면 나는',
      poleA: 'E',
      poleB: 'I',
      answerAEN: 'Early morning blocks',
      answerAKR: '처음 보는 친구랑도 금방 친해져',
      answerBEN: 'Late-night sprints',
      answerBKR: '원래 잘 아는 친구랑 주로 어울려'
    },
    {
      seq: '2',
      questionEN: '🔮 Between these two, I\'m better at noticing',
      questionKR: '🔮 둘 중 내가 더 잘 알아채는건',
      poleA: 'S',
      poleB: 'N',
      answerAEN: 'what someone needs right now.',
      answerAKR: '다른 사람이 지금 당장 필요한 것',
      answerBEN: 'how someone might feel a little later.',
      answerBKR: '다른 사람이 조금 뒤 어떤 기분을 느낄지'
    },
    {
      seq: '3',
      questionEN: '📍 When I don\'t like the place my friends chose to meet, I usually',
      questionKR: '📍 친구들과 약속장소가 맘에 안들 때',
      poleA: 'T',
      poleB: 'F',
      answerAEN: 'say clearly that I don\'t like it.',
      answerAKR: '나는 싫다고 확실히 표현하는 편이야',
      answerBEN: 'go along with it even if I don\'t like it, as long as everyone else does.',
      answerBKR: '나 빼고 전부 좋다면 하면, 싫어도 그냥 동의하는 편이야'
    },
    {
      seq: '4',
      questionEN: '📝 When I get a new homework assignment, I usually',
      questionKR: '📝 새로운 숙제를 받으면',
      poleA: 'J',
      poleB: 'P',
      answerAEN: 'start early without putting it off.',
      answerAKR: '미루지 않고 여유 있게 먼저 시작하는 편',
      answerBEN: 'start when I feel like it, even if I end up rushing later.',
      answerBKR: '시간에 쫓기더라도 마음이 내킬 때 시작하는 편'
    },
    {
      seq: '5',
      questionEN: '🛒 When shopping at the grocery store, I usually',
      questionKR: '🛒 마트에서 장을 볼 때 나는',
      poleA: 'P',
      poleB: 'J',
      answerAEN: 'like to look around slowly and buy what catches my eye.',
      answerAKR: '천천히 구경하면서 눈에 보이는거 위주로 사고 싶어',
      answerBEN: 'feel more comfortable deciding in advance and buying only what I need.',
      answerBKR: '뭘 살지 미리 정해서 필요한 것만 사는게 더 편해'
    },
    {
      seq: '6',
      questionEN: '🧠 When learning something new, I prefer to',
      questionKR: '🧠 새로운걸 배울 때 나는',
      poleA: 'I',
      poleB: 'E',
      answerAEN: 'learn by talking and sharing ideas with friends.',
      answerAKR: '친구들이랑 같이 이야기하면서 배우는게 좋아',
      answerBEN: 'focus quietly and learn on my own.',
      answerBKR: '조용히 혼자 집중하면서 배우는게 더 편해'
    }
  ],

  'rhythm-b': [
    {
      seq: '1',
      questionEN:
        'How often do interruptions break your pace? How often do interruptions break your pace? How often do interruptions break your pace?',
      questionKR:
        '방해가 흐름을 끊는 빈도는 어느 정도인가요? 방해가 흐름을 끊는 빈도는 어느 정도인가요? 방해가 흐름을 끊는 빈도는 어느 정도인가요?',
      poleA: 'E',
      poleB: 'I',
      answerAEN: 'Almost never',
      answerAKR: '거의 없다 동해물과 백두산이 마르고 닳도록 긴 응답 예시 여기',
      answerBEN: 'Multiple times each hour',
      answerBKR: '한 시간에도 여러 번 있다 동해물과 백두산이 마르고 닳도록 긴 응답 예시 여기'
    },
    {
      seq: '2',
      questionEN: '📋 When I do something familiar, I usually',
      questionKR: '📋 익숙한 일을 할 때 나는',
      poleA: 'S',
      poleB: 'N',
      answerAEN: 'feel more comfortable doing it the way people usually do.',
      answerAKR: '사람들이 보통 하는대로 따라하는게 편해',
      answerBEN: 'prefer changing it and doing it in my own way.',
      answerBKR: '내 스타일로 바꿔서 하는 게 더 편하고 좋아'
    },
    {
      seq: '3',
      questionEN: '⚖️ What I care about more is',
      questionKR: '⚖️ 내가 더 중요하게 생각하는건',
      poleA: 'T',
      poleB: 'F',
      answerAEN: 'clear standards and being consistent all the time.',
      answerAKR: '기준이 확실하고 언제나 일관된 태도',
      answerBEN: 'being flexible and adjusting to the situation.',
      answerBKR: '상황에 맞춰 유연하게 바꿀 수 있는 태도'
    },
    {
      seq: '4',
      questionEN: '⚙️ When playing a new game with friends, I usually',
      questionKR: '⚙️ 친구들과 새로운 게임을 하면',
      poleA: 'J',
      poleB: 'P',
      answerAEN: 'set the rules and make sure everyone understands before we start.',
      answerAKR: '규칙을 정하고 모두가 이해한 후 시작해',
      answerBEN: 'am okay with changing the rules as we go when needed.',
      answerBKR: '하면서 필요할 때마다 규칙을 바꿔도 괜찮아'
    }
  ],

  'debug-sample': [
    {
      seq: '1',
      questionEN: 'Do you prefer deterministic or exploratory planning?',
      questionKR: '계획은 정해진 흐름과 탐색형 접근 중 어느 쪽이 더 편한가요?',
      poleA: 'T',
      poleB: 'F',
      answerAEN: 'Deterministic',
      answerAKR: '정해진 흐름',
      answerBEN: 'Exploratory',
      answerBKR: '탐색형 접근'
    },
    {
      seq: '2',
      questionEN: 'Which block keeps your focus the longest?',
      questionKR: '하루 중 가장 안정적으로 흐름을 유지하는 시간대는 언제인가요?',
      poleA: 'S',
      poleB: 'N',
      answerAEN: 'Morning work sessions',
      answerAKR: '오전 블록',
      answerBEN: 'Afternoon work sessions',
      answerBKR: '오후 블록'
    },
    {
      seq: '3',
      questionEN: 'What breaks your pace more often?',
      questionKR: '집중이 깨질 때 더 자주 영향을 주는 요인은 무엇인가요?',
      poleA: 'T',
      poleB: 'F',
      answerAEN: 'Meetings and pings',
      answerAKR: '회의와 메시지',
      answerBEN: 'Context switching',
      answerBKR: '맥락 전환'
    },
    {
      seq: '4',
      questionEN: 'Do you usually review results right away?',
      questionKR: '테스트를 끝낸 뒤 결과를 바로 정리하는 편인가요?',
      poleA: 'J',
      poleB: 'P',
      answerAEN: 'Yes, immediately',
      answerAKR: '바로 정리한다',
      answerBEN: 'Later, in a batch',
      answerBKR: '나중에 몰아서 본다'
    }
  ],

  'energy-check': [
    {
      seq: '1',
      questionEN: 'Which block drains your energy the most?',
      questionKR: '어떤 시간대가 에너지를 가장 많이 소모시키나요?',
      poleA: 'T',
      poleB: 'F',
      answerAEN: 'Context switching',
      answerAKR: '잦은 맥락 전환',
      answerBEN: 'Long meetings',
      answerBKR: '긴 회의'
    },
    {
      seq: '2',
      questionEN: '💔 When a friend misunderstands me, I usually',
      questionKR: '💔 친구가 오해하고 삐졌을 때 나는',
      poleA: 'N',
      poleB: 'S',
      answerAEN: 'want to clear up the misunderstanding quickly.',
      answerAKR: '빨리 오해를 풀고 다시 노는게 더 좋아',
      answerBEN: 'wait until my friend feels better.',
      answerBKR: '친구 마음이 풀릴 때까지 기다려주는 편이야'
    }
  ],

  'creativity-profile': [
    {
      seq: '1',
      questionEN: 'Placeholder preview question for upcoming card.',
      questionKR: '공개 예정 카드를 위한 임시 미리보기 질문입니다.',
      poleA: 'T',
      poleB: 'F',
      answerAEN: 'Option A',
      answerAKR: '옵션 A',
      answerBEN: 'Option B',
      answerBKR: '옵션 B'
    },
    {
      seq: '2',
      questionEN: '💔 When a friend misunderstands me, I usually',
      questionKR: '💔 친구가 오해하고 삐졌을 때 나는',
      poleA: 'N',
      poleB: 'S',
      answerAEN: 'want to clear up the misunderstanding quickly.',
      answerAKR: '빨리 오해를 풀고 다시 노는게 더 좋아',
      answerBEN: 'wait until my friend feels better.',
      answerBKR: '친구 마음이 풀릴 때까지 기다려주는 편이야'
    }
  ],

  'burnout-risk': [
    {
      seq: '1',
      questionEN: 'Placeholder preview question for upcoming card.',
      questionKR: '공개 예정 카드를 위한 임시 미리보기 질문입니다.',
      poleA: 'T',
      poleB: 'F',
      answerAEN: 'Option A',
      answerAKR: '옵션 A',
      answerBEN: 'Option B',
      answerBKR: '옵션 B'
    },
    {
      seq: '2',
      questionEN: '💔 When a friend misunderstands me, I usually',
      questionKR: '💔 친구가 오해하고 삐졌을 때 나는',
      poleA: 'N',
      poleB: 'S',
      answerAEN: 'want to clear up the misunderstanding quickly.',
      answerAKR: '빨리 오해를 풀고 다시 노는게 더 좋아',
      answerBEN: 'wait until my friend feels better.',
      answerBKR: '친구 마음이 풀릴 때까지 기다려주는 편이야'
    }
  ],

  'egtt': [
    // Profile question: seq='q.1', poleA/poleB undefined
    {
      seq: 'q.1',
      questionEN: 'My sexual identity is',
      questionKR: '나의 성별은',
      poleA: undefined,
      poleB: undefined,
      answerAEN: 'Male',
      answerAKR: '남성',
      answerBEN: 'Female',
      answerBKR: '여성'
    },
    // Scoring questions
    {
      seq: '1',
      questionEN: 'I\'m interested in making me charming...',
      questionKR: '패션이나 나를 꾸미는 일에 관심이',
      poleA: 'E',
      poleB: 'T',
      answerAEN: 'A lot',
      answerAKR: '많다',
      answerBEN: 'Not at all',
      answerBKR: '없다'
    },
    {
      seq: '2',
      questionEN: 'I\'m better at noticing',
      questionKR: '내가 더 잘 알아채는건',
      poleA: 'T',
      poleB: 'E',
      answerAEN: 'what someone needs right now.',
      answerAKR: '다른 사람이 지금 당장 필요한 것',
      answerBEN: 'how someone might feel a little later.',
      answerBKR: '다른 사람이 조금 뒤 어떤 기분을 느낄지'
    }
  ]
} as const;

/**
 * 지정한 variant의 Questions 행 배열을 반환한다.
 * variant가 fixture에 존재하지 않으면 빈 배열을 반환한다.
 */
export function getVariantQuestionRows(variantId: string): ReadonlyArray<QuestionSourceRow> {
  return questionSourceFixture[variantId] ?? [];
}
