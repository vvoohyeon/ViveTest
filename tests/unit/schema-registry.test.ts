import {describe, expect, it} from 'vitest';

import {getLogicTypeForVariant, getSchemaForVariant} from '../../src/features/test/schema-registry';

describe('test schema registry', () => {
  it('maps known variants to scoring logic types and returns null for unknown variants', () => {
    expect(getLogicTypeForVariant('qmbti')).toBe('mbti');
    expect(getLogicTypeForVariant('rhythm-b')).toBe('mbti');
    expect(getLogicTypeForVariant('energy-check')).toBe('mbti');
    expect(getLogicTypeForVariant('egtt')).toBe('egtt');
    expect(getLogicTypeForVariant('unknown')).toBeNull();
  });

  it('returns the shared 4-axis MBTI schema shape for MBTI variants', () => {
    const qmbtiSchema = getSchemaForVariant('qmbti');
    const energyCheckSchema = getSchemaForVariant('energy-check');

    if (!qmbtiSchema || !energyCheckSchema) {
      throw new Error('Expected MBTI schemas to resolve');
    }

    expect(qmbtiSchema).toEqual({
      variantId: 'qmbti',
      scoringSchemaId: 'mbti-4axis-v1',
      axisCount: 4,
      axes: [
        {poleA: 'E', poleB: 'I', scoringMode: 'binary_majority'},
        {poleA: 'S', poleB: 'N', scoringMode: 'binary_majority'},
        {poleA: 'T', poleB: 'F', scoringMode: 'binary_majority'},
        {poleA: 'J', poleB: 'P', scoringMode: 'binary_majority'}
      ],
      supportedSections: ['derived_type', 'axis_chart', 'type_desc'],
      qualifierFields: undefined
    });

    expect(energyCheckSchema).toEqual({
      ...qmbtiSchema,
      variantId: 'energy-check'
    });
  });

  it('returns the uppercase 1-axis EGTT schema with gender qualifier tokens', () => {
    const egttSchema = getSchemaForVariant('egtt');

    if (!egttSchema) {
      throw new Error('Expected EGTT schema to resolve');
    }

    expect(egttSchema).toEqual({
      variantId: 'egtt',
      scoringSchemaId: 'egtt-1axis-qualifier-v1',
      axisCount: 1,
      axes: [{poleA: 'E', poleB: 'T', scoringMode: 'binary_majority'}],
      supportedSections: ['derived_type', 'axis_chart', 'type_desc'],
      qualifierFields: [{key: 'gender', questionIndex: 1, values: ['M', 'F'], tokenLength: 1}]
    });
  });

  it('returns null for unknown schema lookups', () => {
    expect(getSchemaForVariant('unknown')).toBeNull();
  });
});

describe('variantLogicTypeMap 커버리지', () => {
  // 현재 등록된 모든 variant가 getLogicTypeForVariant()에서 값을 반환하는지 확인한다.
  // 새 variant가 schema-registry에 추가될 때 이 테스트가 갱신 신호 역할을 한다.
  const registeredVariants = [
    'qmbti',
    'rhythm-b',
    'debug-sample',
    'energy-check',
    'creativity-profile',
    'burnout-risk',
    'egtt'
  ];

  it.each(registeredVariants)('%s는 getLogicTypeForVariant()에서 non-null 값을 반환한다', (variantId) => {
    expect(getLogicTypeForVariant(variantId)).not.toBeNull();
  });

  it('등록되지 않은 variant는 null을 반환한다', () => {
    expect(getLogicTypeForVariant('non-existent')).toBeNull();
    expect(getSchemaForVariant('non-existent')).toBeNull();
  });
});
