import {describe, expect, it} from 'vitest';

import {resolveAnswerChoiceState, type AnswerChoiceState} from '../../src/features/test/answer-choice-state';

/**
 * 답변 선택지의 세 상태를 고정한다(`req-test.md` §4.3 · §4.4).
 *
 * 이 계산이 순수 함수로 나와 있는 이유가 여기다 — 컴포넌트 안에 있었다면 「과거 응답인데
 * 선택된 것처럼 보인다」를 고정하려고 클라이언트 전체를 렌더해야 했을 것이다.
 */
function resolve(input: {
  choice: 'A' | 'B';
  storedAnswer: 'A' | 'B' | null;
  justAnswered?: boolean;
  isLastQuestion?: boolean;
}): AnswerChoiceState {
  return resolveAnswerChoiceState({
    choice: input.choice,
    storedAnswer: input.storedAnswer,
    justAnswered: input.justAnswered ?? false,
    isLastQuestion: input.isLastQuestion ?? false
  });
}

describe('answer choice state', () => {
  it('고르지 않은 쪽은 언제나 아무 상태도 아니다', () => {
    expect(resolve({choice: 'B', storedAnswer: 'A'})).toBe('none');
    expect(resolve({choice: 'B', storedAnswer: 'A', justAnswered: true})).toBe('none');
    expect(resolve({choice: 'B', storedAnswer: 'A', isLastQuestion: true})).toBe('none');
    expect(resolve({choice: 'A', storedAnswer: null})).toBe('none');
  });

  it('되돌아온 문항의 과거 응답은 선택이 아니라 표식이다', () => {
    // 이 한 줄이 개정의 핵심이다. 선택 상태로 그리면 「선택 즉시 진행」 규칙과 충돌한다 —
    // 선택된 채로 머무는 문항이 존재할 수 없기 때문이다.
    expect(resolve({choice: 'A', storedAnswer: 'A'})).toBe('previous-answer');
  });

  it('탭 직후 잠금 구간에는 선택으로 보인다', () => {
    // 그 구간이 곧 탭 피드백이다. 표식으로 그리면 누른 것이 눌리지 않은 것처럼 보인다.
    expect(resolve({choice: 'A', storedAnswer: 'A', justAnswered: true})).toBe('selected');
  });

  it('마지막 문항은 예외라 선택 상태를 유지한다', () => {
    // 자동 진행이 없어 선택이 머무를 수 있고, 그 상태가 "결과 보기" CTA 가 활성인 이유다.
    expect(resolve({choice: 'A', storedAnswer: 'A', isLastQuestion: true})).toBe('selected');
    expect(resolve({choice: 'B', storedAnswer: 'B', isLastQuestion: true, justAnswered: true})).toBe(
      'selected'
    );
  });

  it('세 상태가 서로 배타적이다', () => {
    // 전제: 한 문항에서 두 선택지가 동시에 선택으로 보이면 안 된다.
    for (const stored of ['A', 'B'] as const) {
      const states = (['A', 'B'] as const).map((choice) =>
        resolve({choice, storedAnswer: stored, isLastQuestion: true})
      );

      expect(states.filter((state) => state === 'selected')).toHaveLength(1);
      expect(states.filter((state) => state === 'none')).toHaveLength(1);
    }
  });
});
