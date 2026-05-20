import type {ResolvedQuestion} from '@/features/test/question-bank';

type ResponseSet = Record<string, 'A' | 'B'>;

export interface ScoringProgress {
  answered: number;
  total: number;
  percent: number;
}

export function findFirstScoringQuestion(questions: ReadonlyArray<ResolvedQuestion>): ResolvedQuestion | null {
  return questions.find((question) => question.questionType === 'scoring') ?? null;
}

export function skipForwardPastProfile(
  index: number,
  questions: ReadonlyArray<ResolvedQuestion>
): number {
  let i = index;
  while (i <= questions.length && isProfileQuestion(questions[i - 1])) {
    i += 1;
  }
  return Math.min(i, questions.length);
}

export function skipBackwardPastProfile(
  index: number,
  questions: ReadonlyArray<ResolvedQuestion>
): number {
  let i = index;
  while (i > 1 && isProfileQuestion(questions[i - 1])) {
    i -= 1;
  }
  return i;
}

export function resolveScoringProgress(input: {
  questions: ReadonlyArray<ResolvedQuestion>;
  answers: ResponseSet;
}): ScoringProgress {
  const scoringQuestions = input.questions.filter((question) => question.questionType === 'scoring');
  const answered = scoringQuestions.filter((question) => {
    const answer = input.answers[String(question.canonicalIndex)];
    return answer === 'A' || answer === 'B';
  }).length;
  const total = scoringQuestions.length;

  return {
    answered,
    total,
    percent: total === 0 ? 0 : Math.round((answered / total) * 100)
  };
}

export function isProfileQuestion(q: ResolvedQuestion): boolean {
  return q.questionType === 'profile';
}
