import type {AppLocale} from '@/config/site';
import {createLandingCatalog, type LandingCard, type LandingTestCard} from '@/features/landing/data';
import {
  parseTestVariantId,
  type TestQuestion,
  type TestQuestionDefinition,
  type TestQuestionReadyState,
  type TestVariantId
} from '@/features/test/types';

const MAX_RECOVERY_RECOMMENDATIONS = 2;

function usesKoreanFallbackCopy(locale: AppLocale): boolean {
  return locale === 'kr';
}

function isLandingTestCard(card: LandingCard): card is LandingTestCard {
  return card.type === 'test';
}

function listAvailableTestCards(locale: AppLocale): LandingTestCard[] {
  return createLandingCatalog(locale).filter(
    (card): card is LandingTestCard => isLandingTestCard(card) && card.availability === 'available'
  );
}

function buildLocalizedFallbackQuestions(locale: AppLocale): TestQuestion[] {
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

function buildReadyState(
  locale: AppLocale,
  variantId: TestVariantId,
  card: LandingTestCard
): TestQuestionReadyState {
  return {
    status: 'ready',
    variantId,
    card,
    questions: [
      {
        id: 'q1',
        prompt: card.test.previewQuestion,
        choiceA: card.test.answerChoiceA,
        choiceB: card.test.answerChoiceB
      },
      ...buildLocalizedFallbackQuestions(locale)
    ]
  };
}

export function buildTestQuestionDefinition(locale: AppLocale, rawVariant: string): TestQuestionDefinition {
  const recommendedCards = listAvailableTestCards(locale).slice(0, MAX_RECOVERY_RECOMMENDATIONS);
  const variantId = parseTestVariantId(rawVariant);

  if (!variantId) {
    return {
      status: 'recoverable',
      rawVariant,
      reason: 'invalid_variant',
      recommendedCards
    };
  }

  const matchingCard =
    createLandingCatalog(locale).find(
      (card): card is LandingTestCard => isLandingTestCard(card) && card.sourceParam === variantId
    ) ?? null;

  if (!matchingCard) {
    return {
      status: 'recoverable',
      rawVariant,
      reason: 'unknown_variant',
      recommendedCards
    };
  }

  if (matchingCard.availability !== 'available') {
    return {
      status: 'recoverable',
      rawVariant,
      reason: 'unavailable_variant',
      recommendedCards
    };
  }

  return buildReadyState(locale, variantId, matchingCard);
}

export function buildLandingTestQuestionBank(locale: AppLocale, variant: string): TestQuestion[] {
  const definition = buildTestQuestionDefinition(locale, variant);
  return definition.status === 'ready' ? definition.questions : [];
}
