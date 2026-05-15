export type SemanticAnswer = 'A' | 'B';
export type StoredAnswer = string;

export type TestRunPhase = 'booting' | 'instruction' | 'active' | 'submitted' | 'redirecting';

export type TestRunEntryMode = 'new' | 'resume';

export interface TestRunState {
  phase: TestRunPhase;
  landingIngressFlag: boolean;
  currentQuestionIndex: number;
  answers: Record<string, StoredAnswer>;
  instructionSeen: boolean;
  entrySequence: number;
  entryMode: TestRunEntryMode | null;
  entryAnswersSnapshot: Record<string, StoredAnswer>;
}

export type TestRunAction =
  | {
      type: 'BOOTSTRAP_COMPLETE';
      instructionSeen: boolean;
      landingIngressFlag: boolean;
      currentQuestionIndex: number;
      answers: Record<string, StoredAnswer>;
      autoCommitEntry?: boolean;
      entryMode?: TestRunEntryMode;
    }
  | {
      type: 'COMMIT_ENTRY';
      recordsInstructionSeen?: boolean;
      entryMode?: TestRunEntryMode;
      qualifierAnswers?: Record<string, StoredAnswer>;
    }
  | {type: 'REDIRECT_HOME'}
  | {
      type: 'SELECT_ANSWER';
      canonicalIndex: number | string;
      choice: SemanticAnswer;
      totalQuestions: number;
      advance?: boolean;
      nextQuestionIndex?: number;
    }
  | {type: 'NAVIGATE_PREVIOUS'; nextQuestionIndex?: number}
  | {type: 'SUBMIT'; totalQuestions: number};

export function buildInitialTestRunState(): TestRunState {
  return {
    phase: 'booting',
    landingIngressFlag: false,
    currentQuestionIndex: 1,
    answers: {},
    instructionSeen: false,
    entrySequence: 0,
    entryMode: null,
    entryAnswersSnapshot: {}
  };
}

export function hasAllRequiredAnswers(
  answers: Record<string, StoredAnswer>,
  totalQuestions: number
): boolean {
  for (let index = 1; index <= totalQuestions; index += 1) {
    const answer = answers[String(index)];
    if (typeof answer !== 'string' || answer.length === 0) {
      return false;
    }
  }

  return totalQuestions > 0;
}

export function isRuntimeActive(state: TestRunState): boolean {
  return state.phase === 'active';
}

export function isRuntimeSubmitted(state: TestRunState): boolean {
  return state.phase === 'submitted';
}

function commitActiveEntry(
  state: TestRunState,
  input: {
    instructionSeen: boolean;
    entryMode?: TestRunEntryMode;
    answers?: Record<string, StoredAnswer>;
  }
): TestRunState {
  const answers = input.answers ?? state.answers;

  return {
    ...state,
    phase: 'active',
    instructionSeen: input.instructionSeen,
    answers,
    entrySequence: state.entrySequence + 1,
    entryMode: input.entryMode ?? 'new',
    entryAnswersSnapshot: {...answers}
  };
}

function filterAnswersBeforeIndex(
  answers: Record<string, StoredAnswer>,
  nextIndex: number
): Record<string, StoredAnswer> {
  return Object.fromEntries(
    Object.entries(answers).filter(([key]) => Number(key) < nextIndex)
  ) as Record<string, StoredAnswer>;
}

export function testRunReducer(state: TestRunState, action: TestRunAction): TestRunState {
  switch (action.type) {
    case 'BOOTSTRAP_COMPLETE': {
      if (state.phase !== 'booting') {
        return state;
      }

      const bootstrappedState: TestRunState = {
        ...state,
        phase: 'instruction',
        landingIngressFlag: action.landingIngressFlag,
        currentQuestionIndex: Math.max(1, action.currentQuestionIndex),
        answers: {...action.answers},
        instructionSeen: action.instructionSeen,
        entryMode: action.entryMode ?? null,
        entryAnswersSnapshot: {}
      };

      if (!action.autoCommitEntry) {
        return bootstrappedState;
      }

      return commitActiveEntry(bootstrappedState, {
        instructionSeen: action.instructionSeen,
        entryMode: action.entryMode,
        answers: bootstrappedState.answers
      });
    }

    case 'COMMIT_ENTRY': {
      if (state.phase !== 'instruction') {
        return state;
      }

      const answers = {
        ...state.answers,
        ...(action.qualifierAnswers ?? {})
      };

      return commitActiveEntry(state, {
        instructionSeen: action.recordsInstructionSeen ? true : state.instructionSeen,
        entryMode: action.entryMode ?? state.entryMode ?? undefined,
        answers
      });
    }

    case 'REDIRECT_HOME': {
      if (state.phase !== 'instruction') {
        return state;
      }

      return {...state, phase: 'redirecting'};
    }

    case 'SELECT_ANSWER': {
      if (state.phase !== 'active') {
        return state;
      }

      const answers = {...state.answers, [String(action.canonicalIndex)]: action.choice};
      return {
        ...state,
        answers,
        currentQuestionIndex: action.advance
          ? Math.min(action.totalQuestions, Math.max(1, action.nextQuestionIndex ?? state.currentQuestionIndex + 1))
          : state.currentQuestionIndex
      };
    }

    case 'NAVIGATE_PREVIOUS': {
      if (state.phase !== 'active') {
        return state;
      }

      const nextIndex = Math.max(1, action.nextQuestionIndex ?? state.currentQuestionIndex - 1);
      return {
        ...state,
        currentQuestionIndex: nextIndex,
        answers: filterAnswersBeforeIndex(state.answers, nextIndex)
      };
    }

    case 'SUBMIT': {
      if (state.phase !== 'active' || !hasAllRequiredAnswers(state.answers, action.totalQuestions)) {
        return state;
      }

      return {...state, phase: 'submitted'};
    }

    default:
      return state;
  }
}
