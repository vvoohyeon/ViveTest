import {describe, expect, it} from 'vitest';

import {getVariantQuestionRows} from '../../src/features/test/fixtures/questions';
import {
  buildCanonicalQuestions,
  findFirstScoringRow,
  parseSeqToQuestionType
} from '../../src/features/test/question-source-parser';

describe('parseSeqToQuestionType', () => {
  it('q.* 패턴은 profile로 판정한다', () => {
    expect(parseSeqToQuestionType('q.1')).toBe('profile');
    expect(parseSeqToQuestionType('q.2')).toBe('profile');
    expect(parseSeqToQuestionType('q.10')).toBe('profile');
  });

  it('숫자 문자열은 scoring으로 판정한다', () => {
    expect(parseSeqToQuestionType('1')).toBe('scoring');
    expect(parseSeqToQuestionType('10')).toBe('scoring');
    expect(parseSeqToQuestionType('100')).toBe('scoring');
  });

  it('알 수 없는 패턴은 오류를 던진다', () => {
    expect(() => parseSeqToQuestionType('profile')).toThrow();
    expect(() => parseSeqToQuestionType('')).toThrow();
  });
});

describe('buildCanonicalQuestions - egtt', () => {
  it('canonical index는 출현 순서 기준 1-based다', () => {
    const rows = getVariantQuestionRows('egtt');
    const questions = buildCanonicalQuestions(rows, 'en');

    expect(questions[0].index).toBe(1);
    expect(questions[1].index).toBe(2);
    expect(questions[2].index).toBe(3);
  });

  it('q.1은 profile, 나머지는 scoring이다', () => {
    const rows = getVariantQuestionRows('egtt');
    const questions = buildCanonicalQuestions(rows, 'en');

    expect(questions[0].questionType).toBe('profile');
    expect(questions[1].questionType).toBe('scoring');
    expect(questions[2].questionType).toBe('scoring');
  });
});

describe('findFirstScoringRow', () => {
  it('egtt: 첫 번째 scoring row는 seq="1" 행이다', () => {
    const rows = getVariantQuestionRows('egtt');
    const first = findFirstScoringRow(rows);

    expect(first?.seq).toBe('1');
  });

  it('qmbti: 모두 scoring이므로 첫 행이 반환된다', () => {
    const rows = getVariantQuestionRows('qmbti');
    const first = findFirstScoringRow(rows);

    expect(first?.seq).toBe('1');
  });
});
