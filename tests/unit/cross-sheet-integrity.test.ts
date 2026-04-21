import {describe, expect, it} from 'vitest';

import {validateCrossSheetIntegrity} from '../../src/features/variant-registry/cross-sheet-integrity';

const LANDING_TEST_VARIANTS = [
  'qmbti',
  'rhythm-b',
  'debug-sample',
  'energy-check',
  'creativity-profile',
  'burnout-risk',
  'egtt'
];

const QUESTION_VARIANTS = [
  'qmbti',
  'rhythm-b',
  'debug-sample',
  'energy-check',
  'creativity-profile',
  'burnout-risk',
  'egtt'
];

describe('validateCrossSheetIntegrity', () => {
  it('현재 fixture 기준: 양쪽이 완전히 일치한다', () => {
    const result = validateCrossSheetIntegrity(LANDING_TEST_VARIANTS, QUESTION_VARIANTS);

    expect(result.ok).toBe(true);
    expect(result.missingInQuestions).toHaveLength(0);
    expect(result.extraInQuestions).toHaveLength(0);
  });

  it('Questions에 시트 없는 Landing variant는 missingInQuestions에 포함된다', () => {
    const result = validateCrossSheetIntegrity([...LANDING_TEST_VARIANTS, 'new-variant'], QUESTION_VARIANTS);

    expect(result.ok).toBe(false);
    expect(result.missingInQuestions).toContain('new-variant');
  });

  it('Landing에 없는 Questions 시트는 extraInQuestions에 포함된다', () => {
    const result = validateCrossSheetIntegrity(LANDING_TEST_VARIANTS, [...QUESTION_VARIANTS, 'orphan-sheet']);

    expect(result.ok).toBe(false);
    expect(result.extraInQuestions).toContain('orphan-sheet');
  });

  it('blog variant는 landingTestVariants에서 제외하고 전달해야 한다', () => {
    const result = validateCrossSheetIntegrity([...LANDING_TEST_VARIANTS, 'ops-handbook'], QUESTION_VARIANTS);

    expect(result.ok).toBe(false);
    expect(result.missingInQuestions).toContain('ops-handbook');
  });
});
