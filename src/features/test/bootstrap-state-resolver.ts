import type {LandingIngressRecord, PendingLandingTransition} from '@/features/transition/store';
import {CANONICAL_INDEX_KEY_PATTERN} from '@/features/test/canonical-key';
import type {ResolvedQuestion} from '@/features/test/question-bank';
import type {ActiveRun} from '@/features/test/storage/active-run';
import {findFirstScoringQuestion} from './question-runtime-utils';

type ResponseSet = Record<string, 'A' | 'B'>;

export interface QuestionRuntimeState {
  ready: boolean;
  landingIngressFlag: boolean;
  currentQuestionIndex: number;
  answers: Record<string, 'A' | 'B'>;
}

export type QuestionBootstrapEntryMode = 'new' | 'resume';

export interface QuestionBootstrapState {
  runtimeState: QuestionRuntimeState;
  pendingTransitionToComplete: string | null;
  instructionSeen: boolean;
  entryMode: QuestionBootstrapEntryMode;
}

export function resolveInitialQuestionIndex(input: {
  landingIngressFlag: boolean;
  questions: ReadonlyArray<ResolvedQuestion>;
}): number {
  if (!input.landingIngressFlag) {
    return 1;
  }

  const firstScoringQuestion = findFirstScoringQuestion(input.questions);
  if (!firstScoringQuestion) {
    return 1;
  }

  return (
    input.questions.find((question) => question.canonicalIndex !== firstScoringQuestion.canonicalIndex)
      ?.canonicalIndex ?? firstScoringQuestion.canonicalIndex
  );
}

export function resolveInitialAnswers(input: {
  landingIngress: LandingIngressRecord | null;
  questions: ReadonlyArray<ResolvedQuestion>;
}): ResponseSet {
  if (!input.landingIngress) {
    return {};
  }

  const firstScoringQuestion = findFirstScoringQuestion(input.questions);
  return firstScoringQuestion ? {[String(firstScoringQuestion.canonicalIndex)]: input.landingIngress.preAnswerChoice} : {};
}

function filterResponseSetForQuestions(input: {
  questions: ReadonlyArray<ResolvedQuestion>;
  responseSet: ResponseSet;
}): ResponseSet | null {
  const questionIndexes = new Set(input.questions.map((question) => question.canonicalIndex));
  const answers: ResponseSet = {};

  for (const [key, answer] of Object.entries(input.responseSet)) {
    if (!CANONICAL_INDEX_KEY_PATTERN.test(key)) {
      continue;
    }

    const canonicalIndex = Number(key);
    if (!questionIndexes.has(canonicalIndex)) {
      continue;
    }

    answers[key] = answer;
  }

  return Object.keys(answers).length > 0 ? answers : null;
}

function hasAnswerForQuestion(answers: ResponseSet, question: ResolvedQuestion): boolean {
  const answer = answers[String(question.canonicalIndex)];
  return answer === 'A' || answer === 'B';
}

function findFirstUnansweredProfileQuestion(input: {
  questions: ReadonlyArray<ResolvedQuestion>;
  responseSet: ResponseSet;
}): ResolvedQuestion | null {
  return input.questions.find((question) => question.questionType === 'profile' && !hasAnswerForQuestion(input.responseSet, question)) ?? null;
}

export function resolveResumeQuestionIndex(input: {
  questions: ReadonlyArray<ResolvedQuestion>;
  responseSet: ResponseSet;
}): number | null {
  const validAnswers = filterResponseSetForQuestions(input);
  if (!validAnswers) {
    return null;
  }

  const firstUnansweredProfileQuestion = findFirstUnansweredProfileQuestion({
    questions: input.questions,
    responseSet: validAnswers
  });
  if (firstUnansweredProfileQuestion) {
    return firstUnansweredProfileQuestion.canonicalIndex;
  }

  const firstUnansweredQuestion = input.questions.find((question) => !hasAnswerForQuestion(validAnswers, question));
  return firstUnansweredQuestion?.canonicalIndex ?? input.questions.at(-1)?.canonicalIndex ?? null;
}

export function buildBootstrapResponseSet(
  responseSet: Record<string, string>,
  qualifierItems: ReadonlyArray<{canonicalIndex: number}>
): ResponseSet {
  const qualifierIndexes = new Set(qualifierItems.map((item) => String(item.canonicalIndex)));
  const bootstrapResponses: ResponseSet = {};

  for (const [key, value] of Object.entries(responseSet)) {
    if (value === 'A' || value === 'B') {
      bootstrapResponses[key] = value;
      continue;
    }

    if (qualifierIndexes.has(key)) {
      bootstrapResponses[key] = 'A';
    }
  }

  return bootstrapResponses;
}

export function resolveQuestionBootstrapState(input: {
  activeRun?: ActiveRun | null;
  instructionSeen: boolean;
  landingIngress: LandingIngressRecord | null;
  pendingTransition: PendingLandingTransition | null;
  questions: ReadonlyArray<ResolvedQuestion>;
  responseSet?: ResponseSet | null;
  variant: string;
}): QuestionBootstrapState {
  const matchingPendingTransition =
    input.pendingTransition &&
    input.pendingTransition.targetType === 'test' &&
    input.pendingTransition.variant === input.variant
      ? input.pendingTransition
      : null;
  const landingIngressFlag = input.landingIngress !== null;
  const resumeAnswers =
    !landingIngressFlag && input.activeRun && input.responseSet
      ? filterResponseSetForQuestions({
          questions: input.questions,
          responseSet: input.responseSet
        })
      : null;
  const resumeQuestionIndex = resumeAnswers
    ? resolveResumeQuestionIndex({
        questions: input.questions,
        responseSet: resumeAnswers
      })
    : null;
  const resumeMissingProfilePrerequisite =
    resumeAnswers && resumeQuestionIndex !== null
      ? findFirstUnansweredProfileQuestion({
          questions: input.questions,
          responseSet: resumeAnswers
        }) !== null
      : false;
  const answers =
    resumeAnswers && resumeQuestionIndex !== null
      ? resumeAnswers
      : resolveInitialAnswers({
          landingIngress: input.landingIngress,
          questions: input.questions
        });

  return {
    runtimeState: {
      ready: true,
      landingIngressFlag,
      currentQuestionIndex:
        resumeQuestionIndex ??
        resolveInitialQuestionIndex({
          landingIngressFlag,
          questions: input.questions
        }),
      answers
    },
    pendingTransitionToComplete: matchingPendingTransition?.transitionId ?? null,
    instructionSeen: resumeMissingProfilePrerequisite ? false : input.instructionSeen,
    entryMode: resumeAnswers && resumeQuestionIndex !== null ? 'resume' : 'new'
  };
}
