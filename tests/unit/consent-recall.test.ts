import {afterEach, describe, expect, it, vi} from 'vitest';

import {
  dismissConsentRecall,
  getConsentRecallSnapshot,
  requestConsentRecall,
  resetConsentRecallForTests,
  subscribeToConsentRecall
} from '../../src/features/telemetry/consent-recall';

afterEach(() => {
  resetConsentRecallForTests();
});

describe('consent recall source', () => {
  it('요청마다 requestId 가 오른다 — 이미 열린 배너에서 다시 눌러도 포커스가 옮겨져야 한다', () => {
    const first = requestConsentRecall();
    const second = requestConsentRecall();

    expect(first.requested).toBe(true);
    expect(second.requested).toBe(true);
    expect(second.requestId).toBe(first.requestId + 1);
  });

  it('닫기는 요청만 거두고 requestId 는 되돌리지 않는다', () => {
    const requested = requestConsentRecall();
    const dismissed = dismissConsentRecall();

    expect(dismissed.requested).toBe(false);
    expect(dismissed.requestId).toBe(requested.requestId);
  });

  it('이미 닫힌 상태에서의 닫기는 같은 스냅샷을 돌려주고 알리지 않는다', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToConsentRecall(listener);

    const before = getConsentRecallSnapshot();
    const after = dismissConsentRecall();

    expect(after).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('구독자는 요청과 닫기에 각각 한 번씩 불린다', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToConsentRecall(listener);

    requestConsentRecall();
    dismissConsentRecall();

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
