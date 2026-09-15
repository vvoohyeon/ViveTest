import {describe, expect, it} from 'vitest';

import {buildInitialTestRunState, testRunReducer} from '../../src/features/test/test-run-reducer';

describe('testRunReducer', () => {
  it('moves from booting to instruction when instruction has not been seen', () => {
    const state = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: false,
      landingIngressFlag: false,
      currentQuestionIndex: 1,
      answers: {}
    });

    expect(state.phase).toBe('instruction');
    expect(state.entrySequence).toBe(0);
  });

  it('moves from booting to active when bootstrap can auto-commit', () => {
    const state = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: true,
      landingIngressFlag: false,
      currentQuestionIndex: 1,
      answers: {},
      autoCommitEntry: true
    });

    expect(state.phase).toBe('active');
    expect(state.entrySequence).toBe(1);
    expect(state.entryMode).toBe('new');
  });

  it('commits entry from instruction and records instructionSeen', () => {
    const instruction = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: false,
      landingIngressFlag: false,
      currentQuestionIndex: 1,
      answers: {}
    });

    const state = testRunReducer(instruction, {type: 'COMMIT_ENTRY', recordsInstructionSeen: true});

    expect(state.phase).toBe('active');
    expect(state.instructionSeen).toBe(true);
    expect(state.entrySequence).toBe(1);
  });

  it('preserves bootstrap resume entry mode when committing after instruction', () => {
    const instruction = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: false,
      landingIngressFlag: false,
      currentQuestionIndex: 2,
      answers: {'1': 'A'},
      entryMode: 'resume'
    });

    const state = testRunReducer(instruction, {type: 'COMMIT_ENTRY', recordsInstructionSeen: true});

    expect(state.phase).toBe('active');
    expect(state.entryMode).toBe('resume');
    expect(state.entryAnswersSnapshot).toEqual({'1': 'A'});
  });

  it('redirects home from instruction', () => {
    const instruction = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: false,
      landingIngressFlag: true,
      currentQuestionIndex: 2,
      answers: {'1': 'A'}
    });

    const state = testRunReducer(instruction, {type: 'REDIRECT_HOME'});

    expect(state.phase).toBe('redirecting');
  });

  it('ignores commit entry outside instruction phase', () => {
    const state = testRunReducer(buildInitialTestRunState(), {type: 'COMMIT_ENTRY'});

    expect(state.phase).toBe('booting');
    expect(state.entrySequence).toBe(0);
  });

  it('writes a canonical answer only while active', () => {
    const active = testRunReducer(
      testRunReducer(buildInitialTestRunState(), {
        type: 'BOOTSTRAP_COMPLETE',
        instructionSeen: true,
        landingIngressFlag: false,
        currentQuestionIndex: 1,
        answers: {},
        autoCommitEntry: true
      }),
      {type: 'SELECT_ANSWER', canonicalIndex: 1, choice: 'A', totalQuestions: 4}
    );

    const booting = testRunReducer(buildInitialTestRunState(), {
      type: 'SELECT_ANSWER',
      canonicalIndex: 1,
      choice: 'B',
      totalQuestions: 4
    });

    expect(active.answers).toEqual({'1': 'A'});
    expect(booting.answers).toEqual({});
  });

  it('blocks submit until all required answers exist', () => {
    const active = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: true,
      landingIngressFlag: false,
      currentQuestionIndex: 1,
      answers: {'1': 'A'},
      autoCommitEntry: true
    });

    const state = testRunReducer(active, {type: 'SUBMIT', allAnswered: false});

    expect(state.phase).toBe('active');
  });

  it('submits when all required answers exist', () => {
    const active = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: true,
      landingIngressFlag: false,
      currentQuestionIndex: 4,
      answers: {'1': 'A', '2': 'B', '3': 'A', '4': 'B'},
      autoCommitEntry: true
    });

    const state = testRunReducer(active, {type: 'SUBMIT', allAnswered: true});

    expect(state.phase).toBe('submitted');
  });

  // 종전 두 케이스의 제목은 「clears all answers」·「resets the tail」이었고 이동이 응답을
  // 지우는 것을 계약으로 고정했다. `req-test.md` §3.9 개정으로 **이동은 응답을 제거하지
  // 않는다** — 도출이 축별 독립 집계(§3.11)이고 문항 집합이 고정(§3.8)이라 앞 응답을 고쳐도
  // 뒤 응답이 무의미해지는 경로가 없기 때문이다. 제목과 단언을 함께 바꾼다.
  it('keeps previous navigation at index 1 and preserves the answer there', () => {
    const active = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: true,
      landingIngressFlag: false,
      currentQuestionIndex: 1,
      answers: {'1': 'A'},
      autoCommitEntry: true
    });

    const state = testRunReducer(active, {type: 'NAVIGATE_PREVIOUS'});

    expect(state.currentQuestionIndex).toBe(1);
    expect(state.answers).toEqual({'1': 'A'});
  });

  it('navigates back from index 3 to 2 without touching any answer', () => {
    const active = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: true,
      landingIngressFlag: false,
      currentQuestionIndex: 3,
      answers: {'1': 'A', '2': 'B', '3': 'A'},
      autoCommitEntry: true
    });

    const state = testRunReducer(active, {type: 'NAVIGATE_PREVIOUS'});

    expect(state.currentQuestionIndex).toBe(2);
    expect(state.answers).toEqual({'1': 'A', '2': 'B', '3': 'A'});
  });

  it('keeps the tail when an earlier answer is changed', () => {
    // 이것이 종전 계약이 실제로 파괴하던 것이다 — Q2 를 고치면 Q3 이 사라졌다.
    const active = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: true,
      landingIngressFlag: false,
      currentQuestionIndex: 2,
      answers: {'1': 'A', '2': 'B', '3': 'A'},
      autoCommitEntry: true
    });

    const state = testRunReducer(active, {
      type: 'SELECT_ANSWER',
      canonicalIndex: 2,
      choice: 'A',
      totalQuestions: 3
    });

    expect(state.answers).toEqual({'1': 'A', '2': 'A', '3': 'A'});
  });

  it('ignores runtime actions after submit', () => {
    const submitted = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: true,
      landingIngressFlag: false,
      currentQuestionIndex: 2,
      answers: {'1': 'A', '2': 'B'},
      autoCommitEntry: true
    });
    const submittedState = testRunReducer(submitted, {type: 'SUBMIT', allAnswered: true});

    expect(testRunReducer(submittedState, {
      type: 'SELECT_ANSWER',
      canonicalIndex: 2,
      choice: 'A',
      totalQuestions: 2
    })).toBe(submittedState);
    expect(testRunReducer(submittedState, {type: 'NAVIGATE_PREVIOUS'})).toBe(submittedState);
    expect(testRunReducer(submittedState, {type: 'SUBMIT', allAnswered: true})).toBe(submittedState);
  });
});

describe('testRunReducer COMMIT_ENTRY qualifier answers', () => {
  it('merges qualifier tokens into state answers', () => {
    const instruction = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: false,
      landingIngressFlag: false,
      currentQuestionIndex: 1,
      answers: {}
    });

    const state = testRunReducer(instruction, {
      type: 'COMMIT_ENTRY',
      recordsInstructionSeen: true,
      qualifierAnswers: {'1': 'M'}
    });

    expect(state.answers).toEqual({'1': 'M'});
    expect(state.entryAnswersSnapshot).toEqual({'1': 'M'});
  });

  it('preserves seeded answers at different canonical indexes', () => {
    const instruction = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: false,
      landingIngressFlag: true,
      currentQuestionIndex: 1,
      answers: {'2': 'A'}
    });

    const state = testRunReducer(instruction, {
      type: 'COMMIT_ENTRY',
      recordsInstructionSeen: true,
      qualifierAnswers: {'1': 'F'}
    });

    expect(state.answers).toEqual({'1': 'F', '2': 'A'});
    expect(state.entryAnswersSnapshot).toEqual({'1': 'F', '2': 'A'});
  });

  it('keeps existing commit behavior when qualifier answers are absent', () => {
    const instruction = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: false,
      landingIngressFlag: true,
      currentQuestionIndex: 2,
      answers: {'2': 'A'}
    });

    const state = testRunReducer(instruction, {type: 'COMMIT_ENTRY', recordsInstructionSeen: true});

    expect(state.phase).toBe('active');
    expect(state.instructionSeen).toBe(true);
    expect(state.answers).toEqual({'2': 'A'});
    expect(state.entryAnswersSnapshot).toEqual({'2': 'A'});
  });
});

describe('testRunReducer RESET_SCORING_ANSWERS', () => {
  function makeActiveState(answers: Record<string, string>) {
    return testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: true,
      landingIngressFlag: false,
      currentQuestionIndex: 3,
      answers,
      autoCommitEntry: true
    });
  }

  it('replaces answers with the new qualifier map and clears scoring', () => {
    const active = makeActiveState({'1': 'M', '2': 'A', '3': 'B'});

    const state = testRunReducer(active, {
      type: 'RESET_SCORING_ANSWERS',
      firstScoringCanonicalIndex: 2,
      qualifierAnswers: {'1': 'M'}
    });

    expect(state.answers).toEqual({'1': 'M'});
  });

  it('sets currentQuestionIndex to firstScoringCanonicalIndex and stays active', () => {
    const active = makeActiveState({'1': 'M', '2': 'A'});

    const state = testRunReducer(active, {
      type: 'RESET_SCORING_ANSWERS',
      firstScoringCanonicalIndex: 2,
      qualifierAnswers: {'1': 'M'}
    });

    expect(state.currentQuestionIndex).toBe(2);
    expect(state.phase).toBe('active');
  });

  it('returns state unchanged when phase is not active', () => {
    const instruction = testRunReducer(buildInitialTestRunState(), {
      type: 'BOOTSTRAP_COMPLETE',
      instructionSeen: false,
      landingIngressFlag: false,
      currentQuestionIndex: 1,
      answers: {'1': 'M'}
    });

    const state = testRunReducer(instruction, {
      type: 'RESET_SCORING_ANSWERS',
      firstScoringCanonicalIndex: 2,
      qualifierAnswers: {'1': 'F'}
    });

    expect(state).toBe(instruction);
  });

  it('clears all answers when qualifierAnswers is empty', () => {
    const active = makeActiveState({'1': 'M', '2': 'A', '3': 'B'});

    const state = testRunReducer(active, {
      type: 'RESET_SCORING_ANSWERS',
      firstScoringCanonicalIndex: 1,
      qualifierAnswers: {}
    });

    expect(state.answers).toEqual({});
  });

  it('propagates new qualifier values without deriving completion in the reducer', () => {
    const active = makeActiveState({'1': 'M', '2': 'A', '3': 'B', '4': 'A'});

    const state = testRunReducer(active, {
      type: 'RESET_SCORING_ANSWERS',
      firstScoringCanonicalIndex: 2,
      qualifierAnswers: {'1': 'F'}
    });

    expect(state.answers).toEqual({'1': 'F'});
  });
});
