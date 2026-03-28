export type VariantId = string & {readonly __brand: 'VariantId'};
export type QuestionIndex = number & {readonly __brand: 'QuestionIndex'};
export type AxisCount = 1 | 2 | 4;
export type SectionId = string;

export type QuestionType = 'scoring' | 'profile';
export type ScoringMode = 'binary_majority' | 'scale';

export interface AxisSpec {
  poleA: string;
  poleB: string;
  scoringMode: ScoringMode;
}

export interface Question {
  index: QuestionIndex;
  poleA: string;
  poleB: string;
  questionType: QuestionType;
}

export interface QualifierFieldSpec {
  key: string;
  questionIndex: QuestionIndex;
  values: string[];
  tokenLength: number;
}

export interface AxisScoreStat {
  poleA: string;
  poleB: string;
  counts: Record<string, number>;
  dominant: string;
}

export type ScoreStats = Record<string, AxisScoreStat>;
export type DerivedType = string;

export interface ScoringSchema {
  variantId: VariantId;
  scoringSchemaId: string;
  axisCount: AxisCount;
  axes: AxisSpec[];
  supportedSections: SectionId[];
  qualifierFields?: QualifierFieldSpec[];
}

export interface VariantSchema {
  variant: VariantId;
  schema: ScoringSchema;
  questions: Question[];
}

export interface ResultPayload {
  scoreStats: ScoreStats;
  shared: boolean;
}

export type VariantValidationResult =
  | {ok: true; value: VariantId}
  | {ok: false; reason: 'MISSING' | 'UNKNOWN' | 'UNAVAILABLE'};

export type QuestionModelValidationResult =
  | {ok: true; value: Question[]}
  | {ok: false; reason: 'QUESTION_MODEL_VIOLATION'; detail?: string};

export type BlockingDataErrorReason =
  | 'EMPTY_QUESTION_SET'
  | 'QUESTION_MODEL_VIOLATION'
  | 'EVEN_AXIS_QUESTION_COUNT'
  | 'AXIS_COUNT_SCHEMA_MISMATCH'
  | 'DUPLICATE_AXIS_SPEC'
  | 'UNSUPPORTED_SCORING_MODE'
  | 'QUALIFIER_QUESTION_NOT_FOUND'
  | 'QUALIFIER_QUESTION_NOT_PROFILE'
  | 'DUPLICATE_QUALIFIER_KEY';

export type VariantDataIntegrityResult =
  | {ok: true}
  | {ok: false; reason: BlockingDataErrorReason; detail?: string};

export type ComputeScoreStatsResult =
  | ScoreStats
  | {error: 'INCOMPLETE_SCORING_RESPONSES' | 'UNMATCHED_QUESTION'};

export type DeriveDerivedTypeResult =
  | DerivedType
  | {error: 'AXIS_NOT_FOUND' | 'TOKEN_LENGTH_MISMATCH'};

export type ParseTypeSegmentResult =
  | {ok: true; derivedType: string; qualifiers: Record<string, string>}
  | {ok: false; reason: 'LENGTH_MISMATCH' | 'INVALID_QUALIFIER_VALUE'};

export type BuildTypeSegmentResult =
  | {ok: true; typeSegment: string}
  | {ok: false; reason: 'QUALIFIER_RESPONSE_MISSING' | 'INVALID_QUALIFIER_VALUE'};

export function asVariantId(value: string): VariantId {
  return value as VariantId;
}

export function asQuestionIndex(value: number): QuestionIndex {
  return value as QuestionIndex;
}

