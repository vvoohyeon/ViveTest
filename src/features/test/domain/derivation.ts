import type {
  AxisScoreStat,
  ComputeScoreStatsResult,
  DeriveDerivedTypeResult,
  Question,
  ScoringSchema,
  ScoreStats
} from '@/features/test/domain/types';

function getAxisId(poleA: string, poleB: string): string {
  return `${poleA}${poleB}`;
}

function buildAxisScoreStat(poleA: string, poleB: string): AxisScoreStat {
  return {
    poleA,
    poleB,
    counts: {
      [poleA]: 0,
      [poleB]: 0
    },
    dominant: poleA
  };
}

export function computeScoreStats(
  questions: Question[],
  responses: Map<Question['index'], string>,
  schema: ScoringSchema
): ComputeScoreStatsResult {
  const scoringQuestions = questions.filter((question) => question.questionType === 'scoring');

  for (const question of scoringQuestions) {
    if (!responses.has(question.index)) {
      return {error: 'INCOMPLETE_SCORING_RESPONSES'};
    }
  }

  const scoreStats: ScoreStats = {};

  for (const axis of schema.axes) {
    const axisQuestions = scoringQuestions.filter(
      (question) => question.poleA === axis.poleA && question.poleB === axis.poleB
    );
    const axisScoreStat = buildAxisScoreStat(axis.poleA, axis.poleB);

    for (const question of axisQuestions) {
      const response = responses.get(question.index);
      if (response === undefined) {
        return {error: 'INCOMPLETE_SCORING_RESPONSES'};
      }

      if (response !== axis.poleA && response !== axis.poleB) {
        return {error: 'UNMATCHED_QUESTION'};
      }

      axisScoreStat.counts[response] += 1;
    }

    axisScoreStat.dominant =
      axisScoreStat.counts[axis.poleA] >= axisScoreStat.counts[axis.poleB] ? axis.poleA : axis.poleB;
    scoreStats[getAxisId(axis.poleA, axis.poleB)] = axisScoreStat;
  }

  return scoreStats;
}

export function deriveDerivedType(scoreStats: ScoreStats, schema: ScoringSchema): DeriveDerivedTypeResult {
  let derivedType = '';

  for (const axis of schema.axes) {
    const axisId = getAxisId(axis.poleA, axis.poleB);
    const axisScoreStat = scoreStats[axisId];

    if (!axisScoreStat) {
      return {error: 'AXIS_NOT_FOUND'};
    }

    derivedType += axisScoreStat.dominant;
  }

  if (derivedType.length !== schema.axisCount) {
    return {error: 'TOKEN_LENGTH_MISMATCH'};
  }

  return derivedType;
}

