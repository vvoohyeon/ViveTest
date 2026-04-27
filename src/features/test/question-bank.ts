import type {AppLocale} from '@/config/site';
import {getVariantQuestionRows} from '@/features/test/fixtures/questions';
import {findFirstScoringRow, parseSeqToQuestionType} from '@/features/test/question-source-parser';
import type {LandingTestCard, LocalizedText, TestPreviewPayload} from '@/features/variant-registry/types';

export interface LandingTestQuestion {
  id: string;
  prompt: string;
  choiceA: string;
  choiceB: string;
}

/**
 * locale 해석이 완료된 runtime question 단위.
 *
 * ⚠️ 이 타입은 UI 렌더링용 데이터 구조이며, domain 집계에 직접 사용하지 않는다.
 *
 * A/B → domain token 변환은 이 레이어의 책임이 아니다.
 *   - scoring projection (A→poleA, B→poleB): src/features/test/response-projection.ts 담당
 *   - qualifier projection (A→values[0], B→values[1]): 동일
 *   - 위 파일은 Phase 4/7에서 구현될 예정이며 현재 stub 상태
 *
 * 참조: Phase 1 domain token 모델 (req-test-plan.md §Phase 1 완료 요약)
 *   computeScoreStats() / buildTypeSegment()는 pole label 또는 qualifier token을
 *   직접 소비하며, raw 'A'/'B'를 받지 않는다.
 */
export interface ResolvedQuestion {
  id: string;
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
 *
 * @responsibility
 *   이 함수는 locale resolve와 canonicalIndex 부여까지만 담당한다.
 *   runtime user response('A'|'B')를 domain token으로 변환하는 것은
 *   이 함수의 책임이 아니며, src/features/test/response-projection.ts에서 수행한다.
 */
export function buildVariantQuestionBank(variantId: string, locale: AppLocale): ResolvedQuestion[] {
  const rows = getVariantQuestionRows(variantId);

  return rows.map((row, index) => ({
    id: `q${index + 1}`,
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

export function resolveVariantPreviewPayload(variantId: string, locale: AppLocale): TestPreviewPayload | null {
  const previewQ1 = resolveVariantPreviewQ1(variantId, locale);
  if (!previewQ1) {
    return null;
  }

  return {
    variant: variantId,
    previewQuestion: previewQ1.question,
    answerChoiceA: previewQ1.answerA,
    answerChoiceB: previewQ1.answerB
  };
}

/**
 * @deprecated Live `/test/{variant}` 경로는 `buildVariantQuestionBank()`를 사용한다.
 * 이 함수는 inline-bridge 기반 하위 호환 경로로만 남아 있다.
 * 신규 코드에서 호출하지 않는다.
 */
export function buildLandingTestQuestionBank(card: LandingTestCard, locale: AppLocale): LandingTestQuestion[] {
  const previewPayload = resolveVariantPreviewPayload(card.variant, locale);
  if (!previewPayload) {
    throw new Error(`Missing scoring1 preview question for variant "${card.variant}".`);
  }

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
