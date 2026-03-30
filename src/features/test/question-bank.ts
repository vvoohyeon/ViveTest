import type {AppLocale} from '@/config/site';
import type {LandingTestCard} from '@/features/landing/data';

export interface LandingTestQuestion {
  id: string;
  prompt: string;
  choiceA: string;
  choiceB: string;
}

function usesKoreanFallbackCopy(locale: AppLocale): boolean {
  return locale === 'kr';
}

function buildLocalizedFallbackQuestions(locale: AppLocale): LandingTestQuestion[] {
  if (usesKoreanFallbackCopy(locale)) {
    return [
      {
        id: 'q2',
        prompt: '하루 중 가장 안정적으로 흐름을 유지하는 시간대는 언제인가요?',
        choiceA: '오전 블록',
        choiceB: '오후 블록'
      },
      {
        id: 'q3',
        prompt: '집중이 깨질 때 더 자주 영향을 주는 요인은 무엇인가요?',
        choiceA: '회의와 메시지',
        choiceB: '맥락 전환'
      },
      {
        id: 'q4',
        prompt: '테스트를 끝낸 뒤 결과를 바로 정리하는 편인가요?',
        choiceA: '바로 정리한다',
        choiceB: '나중에 몰아서 본다'
      }
    ];
  }

  return [
    {
      id: 'q2',
      prompt: 'Which block keeps your focus the longest?',
      choiceA: 'Morning work sessions',
      choiceB: 'Afternoon work sessions'
    },
    {
      id: 'q3',
      prompt: 'What breaks your pace more often?',
      choiceA: 'Meetings and pings',
      choiceB: 'Context switching'
    },
    {
      id: 'q4',
      prompt: 'Do you usually review results right away?',
      choiceA: 'Yes, immediately',
      choiceB: 'Later, in a batch'
    }
  ];
}

export function buildLandingTestQuestionBank(card: LandingTestCard, locale: AppLocale): LandingTestQuestion[] {
  return [
    {
      id: 'q1',
      prompt: card.test.previewQuestion,
      choiceA: card.test.answerChoiceA,
      choiceB: card.test.answerChoiceB
    },
    ...buildLocalizedFallbackQuestions(locale)
  ];
}
