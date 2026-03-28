import type {
  AxisSpec,
  BlockingDataErrorReason,
  Question,
  QualifierFieldSpec,
  ScoringMode,
  VariantDataIntegrityResult,
  VariantSchema
} from '@/features/test/domain/types';
import {validateQuestionModel} from '@/features/test/domain/validate-question-model';

function getAxisId(axis: Pick<AxisSpec, 'poleA' | 'poleB'>): string {
  return `${axis.poleA}${axis.poleB}`;
}

function resolveScoringMode(axis: AxisSpec): ScoringMode {
  return axis.scoringMode ?? 'binary_majority';
}

function checkDuplicateAxisSpecs(axes: AxisSpec[]): VariantDataIntegrityResult {
  const axisIds = new Set<string>();

  for (const axis of axes) {
    const axisId = getAxisId(axis);
    if (axisIds.has(axisId)) {
      return {ok: false, reason: 'DUPLICATE_AXIS_SPEC', detail: axisId};
    }
    axisIds.add(axisId);
  }

  return {ok: true};
}

function checkScoringModes(axes: AxisSpec[]): VariantDataIntegrityResult {
  for (const axis of axes) {
    if (resolveScoringMode(axis) !== 'binary_majority') {
      return {ok: false, reason: 'UNSUPPORTED_SCORING_MODE', detail: getAxisId(axis)};
    }
  }

  return {ok: true};
}

function checkQualifierFields(
  qualifierFields: QualifierFieldSpec[] | undefined,
  questions: Question[]
): VariantDataIntegrityResult {
  if (!qualifierFields || qualifierFields.length === 0) {
    return {ok: true};
  }

  const keys = new Set<string>();

  for (const field of qualifierFields) {
    if (keys.has(field.key)) {
      return {ok: false, reason: 'DUPLICATE_QUALIFIER_KEY', detail: field.key};
    }
    keys.add(field.key);

    const question = questions.find((candidate) => candidate.index === field.questionIndex);
    if (!question) {
      return {
        ok: false,
        reason: 'QUALIFIER_QUESTION_NOT_FOUND',
        detail: String(field.questionIndex)
      };
    }

    if (question.questionType !== 'profile') {
      return {
        ok: false,
        reason: 'QUALIFIER_QUESTION_NOT_PROFILE',
        detail: String(field.questionIndex)
      };
    }
  }

  return {ok: true};
}

function checkOddCountRule(questions: Question[], axes: AxisSpec[]): VariantDataIntegrityResult {
  const scoringQuestions = questions.filter((question) => question.questionType === 'scoring');

  for (const axis of axes) {
    if (resolveScoringMode(axis) !== 'binary_majority') {
      continue;
    }

    const axisQuestions = scoringQuestions.filter(
      (question) => question.poleA === axis.poleA && question.poleB === axis.poleB
    );

    if (axisQuestions.length % 2 === 0) {
      return {
        ok: false,
        reason: 'EVEN_AXIS_QUESTION_COUNT',
        detail: `${getAxisId(axis)}:${String(axisQuestions.length)}`
      };
    }
  }

  return {ok: true};
}

function axisCountMatchesSchema(schema: VariantSchema): boolean {
  return schema.schema.axes.length === schema.schema.axisCount;
}

export function validateVariantDataIntegrity(schema: VariantSchema): VariantDataIntegrityResult {
  if (schema.questions.length === 0) {
    return {ok: false, reason: 'EMPTY_QUESTION_SET'};
  }

  if (!axisCountMatchesSchema(schema)) {
    return {ok: false, reason: 'AXIS_COUNT_SCHEMA_MISMATCH'};
  }

  const duplicateAxisCheck = checkDuplicateAxisSpecs(schema.schema.axes);
  if (!duplicateAxisCheck.ok) {
    return duplicateAxisCheck;
  }

  const scoringModeCheck = checkScoringModes(schema.schema.axes);
  if (!scoringModeCheck.ok) {
    return scoringModeCheck;
  }

  const questionModelValidation = validateQuestionModel(schema.questions, schema.schema);
  if (!questionModelValidation.ok) {
    return {
      ok: false,
      reason: 'QUESTION_MODEL_VIOLATION',
      detail: questionModelValidation.detail
    };
  }

  const qualifierFieldCheck = checkQualifierFields(schema.schema.qualifierFields, schema.questions);
  if (!qualifierFieldCheck.ok) {
    return qualifierFieldCheck;
  }

  const oddCountCheck = checkOddCountRule(schema.questions, schema.schema.axes);
  if (!oddCountCheck.ok) {
    return oddCountCheck;
  }

  return {ok: true};
}

export type {BlockingDataErrorReason};

