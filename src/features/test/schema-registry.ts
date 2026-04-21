/**
 * @canonical-ownership
 * 이 파일은 variant → ScoringLogicType → ScoringSchema template 매핑의
 * 유일한 소유자(single source of truth)다.
 *
 * `scoringLogicType` 정보를 아래 위치에 중복 선언하지 않는다.
 *   - src/features/variant-registry/source-fixture.ts
 *   - src/features/test/fixtures/questions/ 하위 파일
 *   - Landing Sheets / Questions Sheets 컬럼
 *
 * 새 variant 추가 시: variantLogicTypeMap에만 항목을 추가한다.
 * 새 logic type 추가 시: ScoringLogicType union, schemaTemplates, variantLogicTypeMap을 함께 확장한다.
 */
import {
  asQuestionIndex,
  asVariantId,
  type QualifierFieldSpec,
  type ScoringSchema
} from '@/features/test/domain';

export type ScoringLogicType = 'mbti' | 'egtt';

const schemaTemplates: Readonly<Record<ScoringLogicType, Omit<ScoringSchema, 'variantId'>>> = {
  mbti: {
    scoringSchemaId: 'mbti-4axis-v1',
    axisCount: 4,
    axes: [
      {poleA: 'E', poleB: 'I', scoringMode: 'binary_majority'},
      {poleA: 'S', poleB: 'N', scoringMode: 'binary_majority'},
      {poleA: 'T', poleB: 'F', scoringMode: 'binary_majority'},
      {poleA: 'J', poleB: 'P', scoringMode: 'binary_majority'}
    ],
    supportedSections: ['derived_type', 'axis_chart', 'type_desc']
  },
  egtt: {
    scoringSchemaId: 'egtt-1axis-qualifier-v1',
    axisCount: 1,
    axes: [{poleA: 'E', poleB: 'T', scoringMode: 'binary_majority'}],
    supportedSections: ['derived_type', 'axis_chart', 'type_desc'],
    qualifierFields: [{key: 'gender', questionIndex: asQuestionIndex(1), values: ['M', 'F'], tokenLength: 1}]
  }
};

const variantLogicTypeMap: Readonly<Record<string, ScoringLogicType>> = {
  qmbti: 'mbti',
  'rhythm-b': 'mbti',
  'debug-sample': 'mbti',
  'energy-check': 'mbti',
  'creativity-profile': 'mbti',
  'burnout-risk': 'mbti',
  egtt: 'egtt'
};

function cloneQualifierFields(fields: QualifierFieldSpec[] | undefined): QualifierFieldSpec[] | undefined {
  return fields?.map((field) => ({
    ...field,
    values: [...field.values]
  }));
}

export function getLogicTypeForVariant(variantId: string): ScoringLogicType | null {
  return variantLogicTypeMap[variantId] ?? null;
}

export function getSchemaForVariant(variantId: string): ScoringSchema | null {
  const logicType = getLogicTypeForVariant(variantId);
  if (!logicType) {
    return null;
  }

  const template = schemaTemplates[logicType];

  return {
    ...template,
    variantId: asVariantId(variantId),
    axes: template.axes.map((axis) => ({...axis})),
    supportedSections: [...template.supportedSections],
    qualifierFields: cloneQualifierFields(template.qualifierFields)
  };
}
