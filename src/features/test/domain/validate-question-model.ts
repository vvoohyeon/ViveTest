import type {
  AxisSpec,
  Question,
  QuestionModelValidationResult,
  QuestionType,
  ScoringSchema
} from '@/features/test/domain/types';

const allowedQuestionTypes: ReadonlySet<QuestionType> = new Set(['scoring', 'profile']);

function isValidQuestionIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 1;
}

function hasRequiredQuestionFields(question: Question): boolean {
  return (
    typeof question.poleA === 'string' &&
    question.poleA.length > 0 &&
    typeof question.poleB === 'string' &&
    question.poleB.length > 0 &&
    allowedQuestionTypes.has(question.questionType) &&
    isValidQuestionIndex(question.index)
  );
}

function countAxisMatches(question: Question, axes: AxisSpec[]): number {
  return axes.filter((axis) => axis.poleA === question.poleA && axis.poleB === question.poleB).length;
}

export function validateQuestionModel(
  questions: Question[],
  schema: ScoringSchema
): QuestionModelValidationResult {
  const indexes = new Set<number>();

  for (const question of questions) {
    if (!hasRequiredQuestionFields(question)) {
      return {
        ok: false,
        reason: 'QUESTION_MODEL_VIOLATION',
        detail: `Question ${String(question.index)} is missing required fields.`
      };
    }

    if (question.poleA === question.poleB) {
      return {
        ok: false,
        reason: 'QUESTION_MODEL_VIOLATION',
        detail: `Question ${String(question.index)} must declare distinct poles.`
      };
    }

    if (indexes.has(question.index)) {
      return {
        ok: false,
        reason: 'QUESTION_MODEL_VIOLATION',
        detail: `Question index ${String(question.index)} is duplicated.`
      };
    }

    indexes.add(question.index);

    if (question.questionType === 'scoring' && countAxisMatches(question, schema.axes) !== 1) {
      return {
        ok: false,
        reason: 'QUESTION_MODEL_VIOLATION',
        detail: `Scoring question ${String(question.index)} must match exactly one schema axis.`
      };
    }
  }

  return {ok: true, value: questions};
}

