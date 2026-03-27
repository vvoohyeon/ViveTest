import type {AppLocale} from '@/config/site';
import {createLandingCatalog} from '@/features/landing/data';

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

export function buildLandingTestQuestionBank(locale: AppLocale, variant: string): LandingTestQuestion[] {
  const matchingCard = createLandingCatalog(locale).find(
    (card) => card.type === 'test' && card.availability === 'available' && card.sourceParam === variant
  );
  const useKoreanFallbackCopy = usesKoreanFallbackCopy(locale);

  const q1: LandingTestQuestion = matchingCard && matchingCard.type === 'test'
    ? {
        id: 'q1',
        prompt: matchingCard.test.previewQuestion,
        choiceA: matchingCard.test.answerChoiceA,
        choiceB: matchingCard.test.answerChoiceB
      }
    : useKoreanFallbackCopy
      ? {
          id: 'q1',
          prompt: '지금 가장 집중하기 좋은 시작 방식은 무엇인가요?',
          choiceA: '조용한 단독 시작',
          choiceB: '짧은 정렬 후 시작'
        }
      : {
          id: 'q1',
          prompt: 'What feels like the cleanest way to begin?',
          choiceA: 'A quiet solo start',
          choiceB: 'A short alignment first'
        };

  return [q1, ...buildLocalizedFallbackQuestions(locale)];
}
