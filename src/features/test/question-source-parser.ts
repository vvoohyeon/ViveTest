import type {AppLocale} from '@/config/site';
import {asQuestionIndex, type Question, type QuestionType} from '@/features/test/domain';
import type {QuestionSourceRow} from '@/features/test/fixtures/questions';

type QuestionSourceLocalizedText = QuestionSourceRow['question'];

interface ResolvedQuestionSourceTexts {
  question: string;
  answerA: string;
  answerB: string;
}

/**
 * Sheets seq 컬럼 표기에서 questionType을 판정한다.
 *
 * 규칙 (Google Sheets Sync / Runtime 정책 결정 §3.2):
 *   - "q.{임의 문자}" 패턴 → 'profile'
 *   - 순수 숫자 문자열 → 'scoring'
 *
 * 그 외 패턴은 파싱 오류로 보고 호출자가 처리해야 한다.
 */
export function parseSeqToQuestionType(seq: string): QuestionType {
  if (/^q\..+$/.test(seq)) {
    return 'profile';
  }

  if (/^\d+$/.test(seq)) {
    return 'scoring';
  }

  throw new Error(`[question-source-parser] 알 수 없는 seq 패턴: "${seq}"`);
}

function resolveLocalizedText(localized: QuestionSourceLocalizedText, locale: AppLocale): string {
  return (
    localized[locale] ??
    localized.en ??
    Object.values(localized).find((value): value is string => typeof value === 'string') ??
    ''
  );
}

function resolveQuestionSourceTexts(row: QuestionSourceRow, locale: AppLocale): ResolvedQuestionSourceTexts {
  return {
    question: resolveLocalizedText(row.question, locale),
    answerA: resolveLocalizedText(row.answerA, locale),
    answerB: resolveLocalizedText(row.answerB, locale)
  };
}

/**
 * QuestionSourceRow 배열에서 locale 텍스트를 resolve하고
 * Phase 1 도메인 Question[] 형태로 변환한다.
 *
 * canonical index 규칙:
 *   - seq 값과 무관하게 배열 출현 순서 기준 1-based 정수를 부여한다.
 *   - 예: egtt → q.1→1, 1→2, 2→3
 *
 * locale fallback 순서: locale → 'en' → 첫 번째 키 값
 */
export function buildCanonicalQuestions(rows: ReadonlyArray<QuestionSourceRow>, locale: AppLocale): Question[] {
  return rows.map((row, index) => {
    resolveQuestionSourceTexts(row, locale);

    return {
      index: asQuestionIndex(index + 1),
      poleA: row.poleA ?? '',
      poleB: row.poleB ?? '',
      questionType: parseSeqToQuestionType(row.seq)
    };
  });
}

/**
 * 주어진 rows에서 첫 번째 scoring question의 원본 행을 반환한다.
 * landing preview Q1 파생에 사용된다.
 *
 * 없으면 null을 반환한다.
 */
export function findFirstScoringRow(rows: ReadonlyArray<QuestionSourceRow>): QuestionSourceRow | null {
  return rows.find((row) => parseSeqToQuestionType(row.seq) === 'scoring') ?? null;
}
