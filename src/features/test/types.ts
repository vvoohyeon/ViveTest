import type {LandingTestCard} from '@/features/landing/data';

export const TEST_VARIANT_PATTERN = /^[a-z0-9-]+$/u;

export type TestVariantId = string & {
  readonly __brand: 'TestVariantId';
};

export type TestAnswerChoice = 'A' | 'B';

export interface TestQuestion {
  id: string;
  prompt: string;
  choiceA: string;
  choiceB: string;
}

export type TestVariantRecoveryReason = 'invalid_variant' | 'unknown_variant' | 'unavailable_variant';

export interface TestQuestionReadyState {
  status: 'ready';
  variantId: TestVariantId;
  card: LandingTestCard;
  questions: TestQuestion[];
}

export interface TestQuestionRecoverableState {
  status: 'recoverable';
  rawVariant: string;
  reason: TestVariantRecoveryReason;
  recommendedCards: LandingTestCard[];
}

export type TestQuestionDefinition = TestQuestionReadyState | TestQuestionRecoverableState;

export function parseTestVariantId(value: string): TestVariantId | null {
  return TEST_VARIANT_PATTERN.test(value) ? (value as TestVariantId) : null;
}
