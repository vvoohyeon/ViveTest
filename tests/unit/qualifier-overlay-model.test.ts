import {describe, expect, it} from 'vitest';

import {asQuestionIndex, type QualifierFieldSpec} from '@/features/test/domain';
import {buildVariantQuestionBank, type ResolvedQuestion} from '@/features/test/question-bank';
import {buildQualifierOverlayModel} from '@/features/test/qualifier-overlay-model';
import {getSchemaForVariant} from '@/features/test/schema-registry';

function makeQualifierField(questionIndex: number, values: string[]): QualifierFieldSpec {
  return {
    key: `qualifier-${questionIndex}`,
    questionIndex: asQuestionIndex(questionIndex),
    values,
    tokenLength: 1
  };
}

function makeQuestion(canonicalIndex: number, answerA = 'Alpha', answerB = 'Beta'): ResolvedQuestion {
  return {
    id: `q${canonicalIndex}`,
    canonicalIndex,
    questionType: 'profile',
    question: `Question ${canonicalIndex}`,
    poleA: undefined,
    poleB: undefined,
    answerA,
    answerB
  };
}

describe('buildQualifierOverlayModel', () => {
  it('joins the EGTT qualifier field to the resolved profile question', () => {
    const qualifierFields = getSchemaForVariant('egtt')?.qualifierFields ?? [];
    const questions = buildVariantQuestionBank('egtt', 'en');
    const result = buildQualifierOverlayModel(qualifierFields, questions);

    expect(result.length).toBe(1);
    expect(result[0].canonicalIndex).toBe(1);
    expect(result[0].choices[0].token).toBe('M');
    expect(result[0].choices[1].token).toBe('F');
    expect(typeof result[0].choices[0].label).toBe('string');
    expect(result[0].choices[0].label.length > 0).toBe(true);
  });

  it('returns an empty array for variants without qualifier fields', () => {
    const qualifierFields = getSchemaForVariant('qmbti')?.qualifierFields ?? [];
    const questions = buildVariantQuestionBank('qmbti', 'en');

    expect(buildQualifierOverlayModel(qualifierFields, questions)).toEqual([]);
  });

  it('silently omits a qualifier field when its question is missing', () => {
    const qualifierFields = [makeQualifierField(99, ['X'])];

    expect(buildQualifierOverlayModel(qualifierFields, [])).toEqual([]);
  });

  it('sorts output items by ascending canonical index', () => {
    const qualifierFields = [makeQualifierField(5, ['A']), makeQualifierField(2, ['B'])];
    const questions = [makeQuestion(5), makeQuestion(2)];
    const result = buildQualifierOverlayModel(qualifierFields, questions);

    expect(result[0].canonicalIndex < result[1].canonicalIndex).toBe(true);
  });

  it('maps tokens beyond answerB to empty-label choices', () => {
    const qualifierFields = [makeQualifierField(1, ['X', 'Y', 'Z'])];
    const questions = [makeQuestion(1, 'Ex', 'Why')];
    const result = buildQualifierOverlayModel(qualifierFields, questions);

    expect(result[0].choices.length).toBe(3);
    expect(result[0].choices[0]).toEqual({token: 'X', label: 'Ex'});
    expect(result[0].choices[1]).toEqual({token: 'Y', label: 'Why'});
    expect(result[0].choices[2]).toEqual({token: 'Z', label: ''});
  });
});
