import {describe, expect, it} from 'vitest';

import {locales} from '../../src/config/site';
import type {QuestionSourceRow} from '../../src/features/test/fixtures/questions';
import {buildCanonicalQuestions} from '../../src/features/test/question-source-parser';
import {
  normalizeQuestionSheetRow,
  parseLocaleColumnKey
} from '../../src/features/variant-registry/sheets-row-normalizer';

describe('parseLocaleColumnKey', () => {
  it('Sheets locale suffix를 runtime locale key로 변환한다', () => {
    expect(parseLocaleColumnKey('question_EN')).toEqual({field: 'question', locale: 'en'});
    expect(parseLocaleColumnKey('answerA_KR')).toEqual({field: 'answerA', locale: 'kr'});
    expect(parseLocaleColumnKey('answerB_ZS')).toEqual({field: 'answerB', locale: 'zs'});
    expect(parseLocaleColumnKey('answerB_RU')).toEqual({field: 'answerB', locale: 'ru'});
  });

  it('locale 컬럼이 아닌 key는 null pair로 반환한다', () => {
    expect(parseLocaleColumnKey('seq')).toEqual({field: null, locale: null});
    expect(parseLocaleColumnKey('pole_A')).toEqual({field: null, locale: null});
    expect(parseLocaleColumnKey('pole_B')).toEqual({field: null, locale: null});
    expect(parseLocaleColumnKey('variantId')).toEqual({field: null, locale: null});
    expect(parseLocaleColumnKey('answerC_EN')).toEqual({field: null, locale: null});
  });
});

describe('normalizeQuestionSheetRow', () => {
  it('전체 locale 컬럼을 LocalizedText shape로 재조합한다', () => {
    const rawRow = locales.reduce<Record<string, string>>(
      (accumulator, locale) => {
        const suffix = locale.toUpperCase();

        accumulator[`question_${suffix}`] = `Question ${locale}`;
        accumulator[`answerA_${suffix}`] = `Answer A ${locale}`;
        accumulator[`answerB_${suffix}`] = `Answer B ${locale}`;

        return accumulator;
      },
      {
        seq: '1',
        pole_A: 'E',
        pole_B: 'I'
      }
    );

    const normalized = normalizeQuestionSheetRow(rawRow, locales);

    for (const locale of locales) {
      expect(normalized.question[locale]).toBe(`Question ${locale}`);
      expect(normalized.answerA[locale]).toBe(`Answer A ${locale}`);
      expect(normalized.answerB[locale]).toBe(`Answer B ${locale}`);
    }

    expect(normalized.seq).toBe('1');
    expect(normalized.poleA).toBe('E');
    expect(normalized.poleB).toBe('I');
  });

  it('parser input row shape와 타입 수준에서 호환된다', () => {
    const normalized = normalizeQuestionSheetRow(
      {
        seq: '1',
        question_EN: 'Parser compatible question',
        answerA_EN: 'Choice A',
        answerB_EN: 'Choice B',
        pole_A: 'E',
        pole_B: 'I'
      },
      locales
    );

    const parserRows = [normalized] satisfies ReadonlyArray<QuestionSourceRow>;

    expect(buildCanonicalQuestions(parserRows, 'en')).toEqual([
      expect.objectContaining({
        index: 1,
        poleA: 'E',
        poleB: 'I',
        questionType: 'scoring'
      })
    ]);
  });

  it('일부 locale 컬럼이 없으면 해당 locale key를 만들지 않아 기존 fallback 경계를 보존한다', () => {
    const normalized = normalizeQuestionSheetRow(
      {
        seq: '1',
        question_EN: 'Default question',
        answerA_EN: 'Default A',
        answerB_EN: 'Default B',
        pole_A: 'S',
        pole_B: 'N'
      },
      ['en', 'kr']
    );

    expect(normalized.question).toEqual({en: 'Default question'});
    expect(normalized.answerA).toEqual({en: 'Default A'});
    expect(normalized.answerB).toEqual({en: 'Default B'});
    expect('kr' in normalized.question).toBe(false);
  });

  it('locale 무관 컬럼을 canonical row field로 유지하고 알 수 없는 컬럼은 무시한다', () => {
    const normalized = normalizeQuestionSheetRow(
      {
        seq: 'q.1',
        pole_A: 'T',
        pole_B: 'F',
        question_EN: 'Known question',
        answerA_EN: 'Known A',
        answerB_EN: 'Known B',
        question_XX: 'Unsupported locale question',
        answerC_EN: 'Unknown answer',
        variantId: 'qmbti',
        notes: 'operator note'
      },
      ['en', 'kr']
    );

    expect(normalized).toEqual({
      seq: 'q.1',
      poleA: 'T',
      poleB: 'F',
      question: {en: 'Known question'},
      answerA: {en: 'Known A'},
      answerB: {en: 'Known B'}
    });
    expect(normalized).not.toHaveProperty('variantId');
    expect(normalized.question).not.toHaveProperty('xx');
  });

  it('빈 문자열과 공백-only locale 값은 누락으로 처리한다', () => {
    const normalized = normalizeQuestionSheetRow(
      {
        seq: '1',
        pole_A: '',
        pole_B: '   ',
        question_EN: '',
        question_KR: '   ',
        answerA_EN: 'Choice A',
        answerB_EN: 'Choice B'
      },
      ['en', 'kr']
    );

    expect(normalized).toEqual({
      seq: '1',
      question: {},
      answerA: {en: 'Choice A'},
      answerB: {en: 'Choice B'}
    });
  });
});
