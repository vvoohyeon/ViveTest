import type {
  BuildTypeSegmentResult,
  ParseTypeSegmentResult,
  QuestionIndex,
  ScoringSchema
} from '@/features/test/domain/types';

function getQualifierFields(schema: ScoringSchema) {
  return schema.qualifierFields ?? [];
}

function getExpectedTypeSegmentLength(schema: ScoringSchema): number {
  return schema.axisCount + getQualifierFields(schema).reduce((sum, field) => sum + field.tokenLength, 0);
}

export function parseTypeSegment(typeSegment: string, schema: ScoringSchema): ParseTypeSegmentResult {
  const qualifierFields = getQualifierFields(schema);
  const expectedLength = getExpectedTypeSegmentLength(schema);

  if (typeSegment.length !== expectedLength) {
    return {ok: false, reason: 'LENGTH_MISMATCH'};
  }

  const derivedType = typeSegment.slice(0, schema.axisCount);
  const qualifiers: Record<string, string> = {};
  let cursor = schema.axisCount;

  for (const field of qualifierFields) {
    const value = typeSegment.slice(cursor, cursor + field.tokenLength);
    if (!field.values.includes(value)) {
      return {ok: false, reason: 'INVALID_QUALIFIER_VALUE'};
    }

    qualifiers[field.key] = value;
    cursor += field.tokenLength;
  }

  return {ok: true, derivedType, qualifiers};
}

export function buildTypeSegment(
  derivedType: string,
  responses: Map<QuestionIndex, string>,
  schema: ScoringSchema
): BuildTypeSegmentResult {
  let typeSegment = derivedType;

  for (const field of getQualifierFields(schema)) {
    const value = responses.get(field.questionIndex);
    if (value === undefined) {
      return {ok: false, reason: 'QUALIFIER_RESPONSE_MISSING'};
    }

    if (!field.values.includes(value)) {
      return {ok: false, reason: 'INVALID_QUALIFIER_VALUE'};
    }

    typeSegment += value;
  }

  return {ok: true, typeSegment};
}

