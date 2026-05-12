import type {LandingIngressRecord, PendingLandingTransition} from '@/features/transition/store';
import type {ResolvedQuestion} from '@/features/test/question-bank';

export interface QuestionRuntimeState {
  ready: boolean;
  landingIngressFlag: boolean;
  currentQuestionIndex: number;
  answers: Record<string, 'A' | 'B'>;
}

export interface QuestionBootstrapState {
  runtimeState: QuestionRuntimeState;
  pendingTransitionToComplete: string | null;
  instructionSeen: boolean;
}

export interface ScoringProgress {
  answered: number;
  total: number;
  percent: number;
}

export function buildInitialRuntimeState(): QuestionRuntimeState {
  return {
    ready: false,
    landingIngressFlag: false,
    currentQuestionIndex: 1,
    answers: {}
  };
}

export function findFirstScoringQuestion(questions: ReadonlyArray<ResolvedQuestion>): ResolvedQuestion | null {
  return questions.find((question) => question.questionType === 'scoring') ?? null;
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
}): Record<string, 'A' | 'B'> {
  if (!input.landingIngress) {
    return {};
  }

  const firstScoringQuestion = findFirstScoringQuestion(input.questions);
  return firstScoringQuestion ? {[String(firstScoringQuestion.canonicalIndex)]: input.landingIngress.preAnswerChoice} : {};
}

export function hasSemanticAnswer(answer: 'A' | 'B' | undefined): answer is 'A' | 'B' {
  return answer === 'A' || answer === 'B';
}

export function resolveScoringProgress(input: {
  questions: ReadonlyArray<ResolvedQuestion>;
  answers: Record<string, 'A' | 'B'>;
}): ScoringProgress {
  const scoringQuestions = input.questions.filter((question) => question.questionType === 'scoring');
  const answered = scoringQuestions.filter((question) => hasSemanticAnswer(input.answers[String(question.canonicalIndex)])).length;
  const total = scoringQuestions.length;

  return {
    answered,
    total,
    percent: total === 0 ? 0 : Math.round((answered / total) * 100)
  };
}

export function resolveQuestionBootstrapState(input: {
  instructionSeen: boolean;
  landingIngress: LandingIngressRecord | null;
  pendingTransition: PendingLandingTransition | null;
  questions: ReadonlyArray<ResolvedQuestion>;
  variant: string;
}): QuestionBootstrapState {
  const matchingPendingTransition =
    input.pendingTransition &&
    input.pendingTransition.targetType === 'test' &&
    input.pendingTransition.variant === input.variant
      ? input.pendingTransition
      : null;
  const landingIngressFlag = input.landingIngress !== null;

  return {
    runtimeState: {
      ready: true,
      landingIngressFlag,
      currentQuestionIndex: resolveInitialQuestionIndex({
        landingIngressFlag,
        questions: input.questions
      }),
      answers: resolveInitialAnswers({
        landingIngress: input.landingIngress,
        questions: input.questions
      })
    },
    pendingTransitionToComplete: matchingPendingTransition?.transitionId ?? null,
    instructionSeen: input.instructionSeen
  };
}
