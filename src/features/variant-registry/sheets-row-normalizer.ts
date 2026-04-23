import type {QuestionSourceRow} from '@/features/test/fixtures/questions/types';

export type LocaleColumnField = 'question' | 'answerA' | 'answerB';

export interface ParsedLocaleColumnKey {
  field: LocaleColumnField | null;
  locale: string | null;
}

export interface NormalizedQuestionSourceRow {
  seq: QuestionSourceRow['seq'];
  question: QuestionSourceRow['question'];
  poleA?: QuestionSourceRow['poleA'];
  poleB?: QuestionSourceRow['poleB'];
  answerA: QuestionSourceRow['answerA'];
  answerB: QuestionSourceRow['answerB'];
}

const localeColumnPattern = /^(question|answerA|answerB)_([A-Z]{2})$/u;

function hasTextValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function parseLocaleColumnKey(columnName: string): ParsedLocaleColumnKey {
  // Sheets locale suffixes are uppercase ASCII codes, so lowercasing maps EN/KR/ZS to runtime locale keys.
  const match = localeColumnPattern.exec(columnName);
  if (!match) {
    return {field: null, locale: null};
  }

  const [, field, suffix] = match;

  return {
    field: field as LocaleColumnField,
    locale: suffix.toLowerCase()
  };
}

export function normalizeQuestionSheetRow(
  rawRow: Record<string, string>,
  supportedLocales: ReadonlyArray<string>
): NormalizedQuestionSourceRow {
  const supportedLocaleSet = new Set(supportedLocales.map((locale) => locale.toLowerCase()));
  const localizedTextByField: Record<LocaleColumnField, Record<string, string>> = {
    question: {},
    answerA: {},
    answerB: {}
  };

  for (const [columnName, value] of Object.entries(rawRow)) {
    const {field, locale} = parseLocaleColumnKey(columnName);

    if (!field || !locale || !supportedLocaleSet.has(locale) || !hasTextValue(value)) {
      continue;
    }

    localizedTextByField[field][locale] = value;
  }

  const normalizedRow: NormalizedQuestionSourceRow = {
    seq: rawRow.seq ?? '',
    question: localizedTextByField.question,
    answerA: localizedTextByField.answerA,
    answerB: localizedTextByField.answerB
  };

  if (hasTextValue(rawRow.pole_A)) {
    normalizedRow.poleA = rawRow.pole_A;
  }

  if (hasTextValue(rawRow.pole_B)) {
    normalizedRow.poleB = rawRow.pole_B;
  }

  return normalizedRow;
}
