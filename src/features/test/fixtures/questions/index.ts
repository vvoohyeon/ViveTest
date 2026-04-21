import {burnoutRiskQuestions} from './burnout-risk';
import {creativityProfileQuestions} from './creativity-profile';
import {debugSampleQuestions} from './debug-sample';
import {egttQuestions} from './egtt';
import {energyCheckQuestions} from './energy-check';
import {qmbtiQuestions} from './qmbti';
import {rhythmBQuestions} from './rhythm-b';
import type {QuestionSourceFixtureMap, QuestionSourceRow} from './types';

export type {QuestionSourceRow, QuestionSourceFixtureMap};

export const questionSourceFixture: QuestionSourceFixtureMap = {
  'qmbti': qmbtiQuestions,
  'rhythm-b': rhythmBQuestions,
  'debug-sample': debugSampleQuestions,
  'energy-check': energyCheckQuestions,
  'creativity-profile': creativityProfileQuestions,
  'burnout-risk': burnoutRiskQuestions,
  'egtt': egttQuestions
} as const;

/**
 * 지정한 variant의 Questions 행 배열을 반환한다.
 * variant가 fixture에 존재하지 않으면 빈 배열을 반환한다.
 */
export function getVariantQuestionRows(variantId: string): ReadonlyArray<QuestionSourceRow> {
  return questionSourceFixture[variantId] ?? [];
}
