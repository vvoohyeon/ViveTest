export interface CrossSheetValidationResult {
  /** 양쪽 모두 정합하면 true */
  ok: boolean;
  /** Landing에 있으나 Questions Sheets에 시트가 없는 test variant 목록 */
  missingInQuestions: string[];
  /** Questions Sheets에 시트가 있으나 Landing에 없는 variant 목록 */
  extraInQuestions: string[];
}

/**
 * Landing test variant 목록과 Questions 시트 이름 목록의 정합성을 검증한다.
 *
 * @param landingTestVariants Landing Sheets에서 type='test'인 variant ID 목록
 * @param questionVariants Questions Sheets의 시트 이름 목록(= variant ID 목록)
 *
 * 검증 규칙:
 * - landingTestVariants에 있지만 questionVariants에 없으면 missingInQuestions
 * - questionVariants에 있지만 landingTestVariants에 없으면 extraInQuestions
 * - 양쪽이 완전히 일치하면 ok: true
 *
 * 이 함수는 sync 스크립트의 pre-commit 검증과 runtime 방어선 양쪽에서 사용한다.
 */
export function validateCrossSheetIntegrity(
  landingTestVariants: string[],
  questionVariants: string[]
): CrossSheetValidationResult {
  const landingSet = new Set(landingTestVariants);
  const questionSet = new Set(questionVariants);

  const missingInQuestions = landingTestVariants.filter((variant) => !questionSet.has(variant));
  const extraInQuestions = questionVariants.filter((variant) => !landingSet.has(variant));

  return {
    ok: missingInQuestions.length === 0 && extraInQuestions.length === 0,
    missingInQuestions,
    extraInQuestions
  };
}
