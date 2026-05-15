import {describe, expect, it} from 'vitest';

import type {QualifierOverlayItem} from '@/features/test/qualifier-overlay-model';
import {hasValidQualifierAnswers} from '@/features/test/qualifier-resume-validator';

const qualifierItems: QualifierOverlayItem[] = [
  {
    canonicalIndex: 1,
    questionText: 'My sexual identity is',
    choices: [
      {token: 'M', label: 'Male'},
      {token: 'F', label: 'Female'}
    ]
  }
];

describe('hasValidQualifierAnswers', () => {
  it('returns true for empty qualifier items', () => {
    expect(hasValidQualifierAnswers([], {})).toBe(true);
  });

  it('returns true when every qualifier index has a valid token', () => {
    expect(hasValidQualifierAnswers(qualifierItems, {'1': 'M', '2': 'A'})).toBe(true);
  });

  it('returns false when a qualifier index is absent from stored responses', () => {
    expect(hasValidQualifierAnswers(qualifierItems, {'2': 'A'})).toBe(false);
  });

  it('returns false when a stored value is not in the choices token list', () => {
    expect(hasValidQualifierAnswers(qualifierItems, {'1': 'X'})).toBe(false);
  });

  it('returns true for a non-EGTT variant represented by empty qualifier items', () => {
    expect(hasValidQualifierAnswers([], {'1': 'A'})).toBe(true);
  });
});
