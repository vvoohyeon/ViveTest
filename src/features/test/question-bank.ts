import type {AppLocale} from '@/config/site';
import {getVariantQuestionRows} from '@/features/test/fixtures/questions';
import {findFirstScoringRow, parseSeqToQuestionType} from '@/features/test/question-source-parser';
import {resolveTestPreviewPayload, type LandingTestCard} from '@/features/variant-registry';
import type {LocalizedText} from '@/features/variant-registry/types';

export interface LandingTestQuestion {
  id: string;
  prompt: string;
  choiceA: string;
  choiceB: string;
}

/**
 * locale 해석이 완료된 runtime question 단위.
 * Phase 1 domain Question과 달리 UI 표시용 텍스트를 포함한다.
 */
export interface ResolvedQuestion {
  canonicalIndex: number;
  questionType: 'scoring' | 'profile';
  question: string;
  poleA: string | undefined;
  poleB: string | undefined;
  answerA: string;
  answerB: string;
}

/**
 * landing preview에 사용할 Q1 데이터.
 * scoring1 기준으로 파생되며 profile question은 사용하지 않는다.
 */
export interface ResolvedPreviewQ1 {
  question: string;
  answerA: string;
  answerB: string;
}

function usesKoreanFallbackCopy(locale: AppLocale): boolean {
  return locale === 'kr';
}

function resolveLocalizedText(localized: LocalizedText, locale: AppLocale): string {
  return (
    localized[locale] ??
    localized.en ??
    Object.values(localized).find((value): value is string => typeof value === 'string') ??
    ''
  );
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

/**
 * variant fixture에서 locale 해석된 question 배열을 반환한다.
 * canonical index는 출현 순서 기준 1-based다.
 *
 * variant fixture가 없으면 빈 배열을 반환한다.
 */
export function buildVariantQuestionBank(variantId: string, locale: AppLocale): ResolvedQuestion[] {
  const rows = getVariantQuestionRows(variantId);

  return rows.map((row, index) => ({
    canonicalIndex: index + 1,
    questionType: parseSeqToQuestionType(row.seq),
    question: resolveLocalizedText(row.question, locale),
    poleA: row.poleA,
    poleB: row.poleB,
    answerA: resolveLocalizedText(row.answerA, locale),
    answerB: resolveLocalizedText(row.answerB, locale)
  }));
}

/**
 * variant fixture에서 landing preview용 Q1(scoring1)을 반환한다.
 *
 * 규칙:
 *   - profile question은 landing preview 대상이 아니다.
 *   - 첫 번째 scoring question이 scoring1이다.
 *   - scoring question이 없으면 null을 반환한다.
 */
export function resolveVariantPreviewQ1(variantId: string, locale: AppLocale): ResolvedPreviewQ1 | null {
  const firstScoringRow = findFirstScoringRow(getVariantQuestionRows(variantId));
  if (!firstScoringRow) {
    return null;
  }

  return {
    question: resolveLocalizedText(firstScoringRow.question, locale),
    answerA: resolveLocalizedText(firstScoringRow.answerA, locale),
    answerB: resolveLocalizedText(firstScoringRow.answerB, locale)
  };
}

export function buildLandingTestQuestionBank(card: LandingTestCard, locale: AppLocale): LandingTestQuestion[] {
  const previewPayload = resolveTestPreviewPayload(card.variant, locale);

  return [
    {
      id: 'q1',
      prompt: previewPayload.previewQuestion,
      choiceA: previewPayload.answerChoiceA,
      choiceB: previewPayload.answerChoiceB
    },
    ...buildLocalizedFallbackQuestions(locale)
  ];
}
