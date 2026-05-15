import {describe, expect, it} from 'vitest';

import {buildVariantQuestionBank} from '@/features/test/question-bank';
import {isProfileQuestion} from '@/features/test/question-runtime-utils';

describe('isProfileQuestion', () => {
  it('returns true for a profile question', () => {
    const question = buildVariantQuestionBank('egtt', 'en')[0];

    expect(isProfileQuestion(question)).toBe(true);
  });

  it('returns false for a scoring question', () => {
    const question = buildVariantQuestionBank('egtt', 'en')[1];

    expect(isProfileQuestion(question)).toBe(false);
  });

  it('does not mutate the input question object', () => {
    const question = buildVariantQuestionBank('egtt', 'en')[0];
    const before = {...question};

    Object.freeze(question);

    expect(isProfileQuestion(question)).toBe(true);
    expect(question).toEqual(before);
  });
});
