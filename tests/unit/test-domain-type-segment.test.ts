import {describe, expect, it} from 'vitest';

import {
  asQuestionIndex,
  asVariantId,
  buildTypeSegment,
  parseTypeSegment,
  validateVariantDataIntegrity,
  type Question,
  type QuestionType,
  type ScoringSchema,
  type VariantSchema
} from '../../src/features/test/domain';

function makeQuestion(index: number, poleA: string, poleB: string, questionType: QuestionType): Question {
  return {
    index: asQuestionIndex(index),
    poleA,
    poleB,
    questionType
  };
}

function makeMbtiSchema(): ScoringSchema {
  return {
    variantId: asVariantId('qmbti'),
    scoringSchemaId: 'schema-qmbti',
    axisCount: 4,
    axes: [
      {poleA: 'i', poleB: 'e', scoringMode: 'binary_majority'},
      {poleA: 'n', poleB: 's', scoringMode: 'binary_majority'},
      {poleA: 'f', poleB: 't', scoringMode: 'binary_majority'},
      {poleA: 'j', poleB: 'p', scoringMode: 'binary_majority'}
    ],
    supportedSections: ['derived_type', 'type_desc']
  };
}

function makeEgttVariantSchema(questions?: Question[]): VariantSchema {
  return {
    variant: asVariantId('egtt'),
    schema: {
      variantId: asVariantId('egtt'),
      scoringSchemaId: 'schema-egtt',
      axisCount: 1,
      axes: [{poleA: 'e', poleB: 't', scoringMode: 'binary_majority'}],
      supportedSections: ['derived_type'],
      qualifierFields: [{key: 'sex', questionIndex: asQuestionIndex(1), values: ['m', 'f'], tokenLength: 1}]
    },
    questions:
      questions ??
      [
        makeQuestion(1, 'm', 'f', 'profile'),
        makeQuestion(2, 'e', 't', 'scoring'),
        makeQuestion(3, 'e', 't', 'scoring'),
        makeQuestion(4, 'e', 't', 'scoring')
      ]
  };
}

describe('test domain type segment and qualifier validation', () => {
  it('assertion:B27-type-segment-parsing-qualifier-validation-unit parses and builds type segments for MBTI and qualifier-bearing schemas', () => {
    const mbtiSchema = makeMbtiSchema();
    expect(parseTypeSegment('infj', mbtiSchema)).toEqual({
      ok: true,
      derivedType: 'infj',
      qualifiers: {}
    });
    expect(buildTypeSegment('infj', new Map(), mbtiSchema)).toEqual({
      ok: true,
      typeSegment: 'infj'
    });

    const egttSchema = makeEgttVariantSchema().schema;
    expect(parseTypeSegment('em', egttSchema)).toEqual({
      ok: true,
      derivedType: 'e',
      qualifiers: {sex: 'm'}
    });
    expect(
      buildTypeSegment(
        'e',
        new Map([[asQuestionIndex(1), 'm']]),
        egttSchema
      )
    ).toEqual({
      ok: true,
      typeSegment: 'em'
    });
  });

  it('assertion:B27-type-segment-parsing-qualifier-validation-unit rejects malformed qualifier segments and missing qualifier responses', () => {
    const egttSchema = makeEgttVariantSchema().schema;

    expect(parseTypeSegment('e', egttSchema)).toEqual({
      ok: false,
      reason: 'LENGTH_MISMATCH'
    });
    expect(parseTypeSegment('ex', egttSchema)).toEqual({
      ok: false,
      reason: 'INVALID_QUALIFIER_VALUE'
    });
    expect(buildTypeSegment('e', new Map(), egttSchema)).toEqual({
      ok: false,
      reason: 'QUALIFIER_RESPONSE_MISSING'
    });
    expect(
      buildTypeSegment(
        'e',
        new Map([[asQuestionIndex(1), 'x']]),
        egttSchema
      )
    ).toEqual({
      ok: false,
      reason: 'INVALID_QUALIFIER_VALUE'
    });
  });

  it('assertion:B27-type-segment-parsing-qualifier-validation-unit validates qualifier question integrity for EGTT-like schemas', () => {
    expect(validateVariantDataIntegrity(makeEgttVariantSchema())).toEqual({ok: true});

    expect(
      validateVariantDataIntegrity(
        makeEgttVariantSchema([
          makeQuestion(1, 'e', 't', 'scoring'),
          makeQuestion(2, 'e', 't', 'scoring'),
          makeQuestion(3, 'e', 't', 'scoring')
        ])
      )
    ).toEqual({
      ok: false,
      reason: 'QUALIFIER_QUESTION_NOT_PROFILE',
      detail: '1'
    });

    const missingQualifierQuestionSchema = makeEgttVariantSchema();
    missingQualifierQuestionSchema.schema.qualifierFields = [
      {key: 'sex', questionIndex: asQuestionIndex(99), values: ['m', 'f'], tokenLength: 1}
    ];

    expect(validateVariantDataIntegrity(missingQualifierQuestionSchema)).toEqual({
      ok: false,
      reason: 'QUALIFIER_QUESTION_NOT_FOUND',
      detail: '99'
    });

    const duplicateQualifierKeySchema = makeEgttVariantSchema();
    duplicateQualifierKeySchema.schema.qualifierFields = [
      {key: 'sex', questionIndex: asQuestionIndex(1), values: ['m', 'f'], tokenLength: 1},
      {key: 'sex', questionIndex: asQuestionIndex(1), values: ['m', 'f'], tokenLength: 1}
    ];

    expect(validateVariantDataIntegrity(duplicateQualifierKeySchema)).toEqual({
      ok: false,
      reason: 'DUPLICATE_QUALIFIER_KEY',
      detail: 'sex'
    });
  });
});
