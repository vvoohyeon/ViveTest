import {JSDOM} from 'jsdom';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {asVariantId} from '../../src/features/test/domain';
import {saveActiveRun} from '../../src/features/test/storage/active-run';
import {
  getRunHistorySnapshot,
  getServerRunHistorySnapshot,
  recordRunCompleted,
  recordRunStarted,
  resetRunHistoryForTest,
  RUN_HISTORY_LIMIT
} from '../../src/features/test/storage/run-history';
import {TEST_RUN_HISTORY_KEY} from '../../src/features/test/storage/test-storage-keys';

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/en/history'
  });

  Object.defineProperty(globalThis, 'window', {configurable: true, value: dom.window});
  Object.defineProperty(globalThis, 'document', {configurable: true, value: dom.window.document});
}

function uninstallDom() {
  // @ts-expect-error test cleanup
  delete globalThis.window;
  // @ts-expect-error test cleanup
  delete globalThis.document;
}

function statuses() {
  return getRunHistorySnapshot().map((entry) => `${entry.variantId}:${entry.status}`);
}

describe('run history (req-test.md §8.4)', () => {
  beforeEach(() => {
    installDom();
    resetRunHistoryForTest();
  });

  afterEach(() => {
    resetRunHistoryForTest();
    uninstallDom();
  });

  it('writes a row when the run starts and completes that row when it ends', () => {
    // 끝난 것만 적으면 중단한 회차는 **존재한 적 없는 일**이 되고, 나중에 관찰할 방법이 없다.
    recordRunStarted('qmbti', 1_000);
    expect(statuses()).toEqual(['qmbti:abandoned']);

    recordRunCompleted('qmbti', 2_000);
    expect(statuses()).toEqual(['qmbti:completed']);
    expect(getRunHistorySnapshot()[0].completedAtMs).toBe(2_000);
  });

  it('reads an unfinished run as in-progress while its active run is still alive', () => {
    // 이력에 「중단」을 적어 두면 30 분 안에 돌아와 끝낸 회차가 영원히 중단으로 남는다.
    recordRunStarted('qmbti', 5_000);
    saveActiveRun(asVariantId('qmbti'), {
      variantId: asVariantId('qmbti'),
      startedAtMs: 5_000,
      lastAnsweredAtMs: Date.now()
    });

    expect(statuses()).toEqual(['qmbti:in-progress']);
  });

  it('reads an earlier unfinished run as abandoned once a newer run of the same test is live', () => {
    recordRunStarted('qmbti', 1_000);
    recordRunStarted('qmbti', 9_000);
    saveActiveRun(asVariantId('qmbti'), {
      variantId: asVariantId('qmbti'),
      startedAtMs: 9_000,
      lastAnsweredAtMs: Date.now()
    });

    // 살아 있는 것은 새 회차이고, 앞의 것은 그것으로 확정된 중단이다.
    expect(statuses()).toEqual(['qmbti:in-progress', 'qmbti:abandoned']);
  });

  it('completes the most recent unfinished row rather than an older one', () => {
    recordRunStarted('qmbti', 1_000);
    recordRunStarted('qmbti', 9_000);
    recordRunCompleted('qmbti', 9_500);

    expect(getRunHistorySnapshot().map((entry) => [entry.startedAtMs, entry.completedAtMs])).toEqual([
      [9_000, 9_500],
      [1_000, null]
    ]);
  });

  it('keeps the newest entries only, at the number the copy promises', () => {
    // `history.body` 가 사용자에게 「최대 50 개」라고 말한다 — 두 곳이 갈리면 문구가 거짓이 된다.
    for (let index = 0; index < RUN_HISTORY_LIMIT + 10; index += 1) {
      recordRunStarted('qmbti', 1_000 + index);
    }

    const snapshot = getRunHistorySnapshot();
    expect(snapshot).toHaveLength(RUN_HISTORY_LIMIT);
    expect(snapshot[0].startedAtMs).toBe(1_000 + RUN_HISTORY_LIMIT + 9);
  });

  it('drops a broken row instead of the whole list', () => {
    window.localStorage.setItem(
      TEST_RUN_HISTORY_KEY,
      JSON.stringify([
        {variantId: 'qmbti', startedAtMs: 2_000, completedAtMs: null},
        {variantId: '', startedAtMs: 3_000, completedAtMs: null},
        {variantId: 'egtt', startedAtMs: 'yesterday', completedAtMs: null},
        {variantId: 'egtt', startedAtMs: 1_000, completedAtMs: 1_500}
      ])
    );

    expect(statuses()).toEqual(['qmbti:abandoned', 'egtt:completed']);
  });

  it('survives a stored value that is not a list at all', () => {
    window.localStorage.setItem(TEST_RUN_HISTORY_KEY, 'not json');
    expect(getRunHistorySnapshot()).toEqual([]);
    expect(window.localStorage.getItem(TEST_RUN_HISTORY_KEY)).toBeNull();
  });

  it('gives the server an empty list — 서버에는 이 기기의 이력이 없다', () => {
    recordRunStarted('qmbti', 1_000);
    expect(getServerRunHistorySnapshot()).toEqual([]);
    // 같은 참조여야 `useSyncExternalStore` 가 하이드레이션에서 다시 그리지 않는다.
    expect(getServerRunHistorySnapshot()).toBe(getServerRunHistorySnapshot());
  });

  it('hands out the same array until something writes — 참조가 흔들리면 화면이 영원히 다시 그린다', () => {
    recordRunStarted('qmbti', 1_000);
    const first = getRunHistorySnapshot();
    expect(getRunHistorySnapshot()).toBe(first);

    recordRunCompleted('qmbti', 2_000);
    expect(getRunHistorySnapshot()).not.toBe(first);
  });
});
