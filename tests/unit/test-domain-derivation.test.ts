import {describe, expect, it} from 'vitest';

import {
  asQuestionIndex,
  asVariantId,
  computeScoreStats,
  deriveDerivedType,
  type AxisCount,
  type AxisSpec,
  type Question,
  type QuestionType,
  type ScoringSchema
} from '../../src/features/test/domain';

function makeAxis(poleA: string, poleB: string): AxisSpec {
  return {poleA, poleB, scoringMode: 'binary_majority'};
}

function makeQuestion(index: number, poleA: string, poleB: string, questionType: QuestionType): Question {
  return {
    index: asQuestionIndex(index),
    poleA,
    poleB,
    questionType
  };
}

function makeSchema(variant: string, axisCount: AxisCount, axes: AxisSpec[]): ScoringSchema {
  return {
    variantId: asVariantId(variant),
    scoringSchemaId: `${variant}-schema`,
    axisCount,
    axes,
    supportedSections: ['derived_type', 'axis_chart']
  };
}

function makeResponses(entries: Array<[number, string]>) {
  return new Map(entries.map(([index, value]) => [asQuestionIndex(index), value]));
}

describe('test domain derivation', () => {
  it('assertion:B11-derivation-correctness computes axisCount=1 score stats and derivedType while ignoring profile responses', () => {
    const schema = makeSchema('egtt', 1, [makeAxis('e', 't')]);
    const questions = [
      makeQuestion(1, 'm', 'f', 'profile'),
      makeQuestion(2, 'e', 't', 'scoring'),
      makeQuestion(3, 'e', 't', 'scoring'),
      makeQuestion(4, 'e', 't', 'scoring')
    ];
    const responses = makeResponses([
      [1, 'm'],
      [2, 'e'],
      [3, 't'],
      [4, 'e']
    ]);

    const scoreStats = computeScoreStats(questions, responses, schema);
    if ('error' in scoreStats) {
      throw new Error(`Unexpected scoreStats error: ${scoreStats.error}`);
    }

    expect(scoreStats).toEqual({
      et: {
        poleA: 'e',
        poleB: 't',
        counts: {e: 2, t: 1},
        dominant: 'e'
      }
    });
    expect(scoreStats.et.counts).not.toHaveProperty('m');
    expect(deriveDerivedType(scoreStats, schema)).toBe('e');
  });

  it('assertion:B11-derivation-correctness computes axisCount=2 and axisCount=4 derived tokens in schema axis order', () => {
    const schema2 = makeSchema('dual', 2, [makeAxis('E', 'I'), makeAxis('S', 'N')]);
    const questions2 = [
      makeQuestion(1, 'E', 'I', 'scoring'),
      makeQuestion(2, 'E', 'I', 'scoring'),
      makeQuestion(3, 'E', 'I', 'scoring'),
      makeQuestion(4, 'S', 'N', 'scoring'),
      makeQuestion(5, 'S', 'N', 'scoring'),
      makeQuestion(6, 'S', 'N', 'scoring')
    ];
    const responses2 = makeResponses([
      [1, 'I'],
      [2, 'I'],
      [3, 'E'],
      [4, 'N'],
      [5, 'N'],
      [6, 'S']
    ]);

    const scoreStats2 = computeScoreStats(questions2, responses2, schema2);
    if ('error' in scoreStats2) {
      throw new Error(`Unexpected axisCount=2 error: ${scoreStats2.error}`);
    }

    expect(deriveDerivedType(scoreStats2, schema2)).toBe('IN');

    const schema4 = makeSchema('mbti', 4, [
      makeAxis('E', 'I'),
      makeAxis('S', 'N'),
      makeAxis('T', 'F'),
      makeAxis('J', 'P')
    ]);
    const questions4 = [
      makeQuestion(1, 'E', 'I', 'scoring'),
      makeQuestion(2, 'E', 'I', 'scoring'),
      makeQuestion(3, 'E', 'I', 'scoring'),
      makeQuestion(4, 'S', 'N', 'scoring'),
      makeQuestion(5, 'S', 'N', 'scoring'),
      makeQuestion(6, 'S', 'N', 'scoring'),
      makeQuestion(7, 'T', 'F', 'scoring'),
      makeQuestion(8, 'T', 'F', 'scoring'),
      makeQuestion(9, 'T', 'F', 'scoring'),
      makeQuestion(10, 'J', 'P', 'scoring'),
      makeQuestion(11, 'J', 'P', 'scoring'),
      makeQuestion(12, 'J', 'P', 'scoring')
    ];
    const responses4 = makeResponses([
      [1, 'I'],
      [2, 'E'],
      [3, 'I'],
      [4, 'N'],
      [5, 'N'],
      [6, 'S'],
      [7, 'F'],
      [8, 'F'],
      [9, 'T'],
      [10, 'J'],
      [11, 'P'],
      [12, 'J']
    ]);

    const scoreStats4 = computeScoreStats(questions4, responses4, schema4);
    if ('error' in scoreStats4) {
      throw new Error(`Unexpected axisCount=4 error: ${scoreStats4.error}`);
    }

    expect(deriveDerivedType(scoreStats4, schema4)).toBe('INFJ');
  });

  it('assertion:B11-derivation-correctness returns explicit errors for incomplete responses, unmatched answers, and missing axis stats', () => {
    const schema = makeSchema('dual', 2, [makeAxis('E', 'I'), makeAxis('S', 'N')]);
    const questions = [
      makeQuestion(1, 'E', 'I', 'scoring'),
      makeQuestion(2, 'E', 'I', 'scoring'),
      makeQuestion(3, 'E', 'I', 'scoring'),
      makeQuestion(4, 'S', 'N', 'scoring'),
      makeQuestion(5, 'S', 'N', 'scoring'),
      makeQuestion(6, 'S', 'N', 'scoring')
    ];

    expect(computeScoreStats(questions, makeResponses([[1, 'E']]), schema)).toEqual({
      error: 'INCOMPLETE_SCORING_RESPONSES'
    });

    expect(
      computeScoreStats(
        questions,
        makeResponses([
          [1, 'E'],
          [2, 'I'],
          [3, 'X'],
          [4, 'S'],
          [5, 'N'],
          [6, 'N']
        ]),
        schema
      )
    ).toEqual({
      error: 'UNMATCHED_QUESTION'
    });

    expect(
      deriveDerivedType(
        {
          EI: {
            poleA: 'E',
            poleB: 'I',
            counts: {E: 2, I: 1},
            dominant: 'E'
          }
        },
        schema
      )
    ).toEqual({
      error: 'AXIS_NOT_FOUND'
    });
  });

  it('returns scoreStats counts keyed by poles and detects token length mismatches', () => {
    const schema = makeSchema('single', 1, [makeAxis('A', 'B')]);
    const questions = [
      makeQuestion(1, 'A', 'B', 'scoring'),
      makeQuestion(2, 'A', 'B', 'scoring'),
      makeQuestion(3, 'A', 'B', 'scoring')
    ];
    const responses = makeResponses([
      [1, 'A'],
      [2, 'A'],
      [3, 'B']
    ]);

    const scoreStats = computeScoreStats(questions, responses, schema);
    if ('error' in scoreStats) {
      throw new Error(`Unexpected single-axis error: ${scoreStats.error}`);
    }

    expect(Object.keys(scoreStats.AB.counts)).toEqual(['A', 'B']);
    expect(
      deriveDerivedType(scoreStats, {
        ...schema,
        axisCount: 2
      })
    ).toEqual({
      error: 'TOKEN_LENGTH_MISMATCH'
    });
  });
});

