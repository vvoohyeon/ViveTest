/**
 * 복구 카드 선정 — `req-test.md` §6.1 「Phase 4 확장 계약」.
 *
 * 계약이 규칙 넷과 엣지 둘, 그리고 자동 검증 다섯을 문장으로 갖고 있다. 이 파일은 그 다섯 중
 * 순수하게 판정되는 넷을 고정한다(나머지 하나 — 실제 화면에 몇 장이 그려지는가 — 는 E2E 다).
 *
 * **완료 판정이 두 갈래인 이유를 여기 적어 둔다.** 계약 3 항이 「local storage + history 모두
 * 적용」이라 말하는데, 오늘 저장소 쪽 증거는 **쓰는 사람이 없다** — `STATE_FLAG_NAMES` 의 다섯
 * 플래그 중 `result_entry_committed` 를 `setFlag` 으로 쓰는 호출부가 `src` 전체에 0 건이고
 * (2026-09-19 실측), `volatilizeRunData` 는 회차가 끝날 때 그 플래그를 지우는 쪽에 있다. 그래서
 * 오늘 참이 되는 갈래는 history 하나뿐이다. 그래도 두 갈래를 **둘 다** 구현하고 둘 다 고정한다 —
 * 계약이 둘을 말하고, 쓰는 쪽이 생기는 날 이 판정이 저절로 맞아야 하기 때문이다.
 */
import {describe, expect, it} from 'vitest';

import {
  isVariantCompleted,
  RECOVERY_CARD_LIMIT,
  selectRecoveryCards,
  type RecoveryCandidate
} from '@/features/test/recovery-cards';
import type {ResolvedRunHistoryEntry} from '@/features/test/storage/run-history';

/** 카탈로그 선언 순서를 흉내 낸 후보 목록. 이름은 순서를 읽기 쉽게만 지었다. */
const CANDIDATES: RecoveryCandidate[] = (
  ['first', 'second', 'third', 'fourth'] as const
).map((variantId) => ({
  variantId,
  name: variantId,
  href: `/en/test/${variantId}` as RecoveryCandidate['href']
}));

function historyEntry(
  variantId: string,
  status: ResolvedRunHistoryEntry['status']
): ResolvedRunHistoryEntry {
  return {variantId, startedAtMs: 1, completedAtMs: status === 'completed' ? 2 : null, status};
}

const completedIn = (...variantIds: string[]) => (variantId: string) => variantIds.includes(variantId);

describe('복구 카드 선정 — req-test.md §6.1 Phase 4 확장', () => {
  it('상한은 2 다', () => {
    expect(RECOVERY_CARD_LIMIT).toBe(2);
  });

  // 검증 2 — 미완료 카드 2 개 이상 존재 시 카드 2 개 표시.
  it('미완료가 둘 이상이면 두 장을 고른다', () => {
    expect(selectRecoveryCards(CANDIDATES, completedIn()).map((card) => card.variantId)).toEqual([
      'first',
      'second'
    ]);
  });

  // 검증 5 — 카드 선택 순서가 카탈로그 선언 순서 기준 앞에서부터.
  it('제외 후에도 앞에서부터 고른다 — 뒤의 것이 앞으로 당겨지지 규칙이 뒤집히지 않는다', () => {
    expect(selectRecoveryCards(CANDIDATES, completedIn('first', 'third')).map((card) => card.variantId)).toEqual([
      'second',
      'fourth'
    ]);
  });

  // 엣지 — 미완료 카드가 1 개뿐인 경우 1 개만 표시(검증 3).
  it('미완료가 하나면 한 장만 고른다', () => {
    expect(
      selectRecoveryCards(CANDIDATES, completedIn('first', 'second', 'third')).map((card) => card.variantId)
    ).toEqual(['fourth']);
  });

  // 엣지 — 전체 완료 시 카드 0 개(검증 4). 랜딩 CTA 는 화면이 항상 갖는다(E2E 가 잰다).
  it('전부 완료면 한 장도 고르지 않는다', () => {
    expect(selectRecoveryCards(CANDIDATES, completedIn('first', 'second', 'third', 'fourth'))).toEqual([]);
  });

  it('후보가 비면 빈 목록이다 — 빈 카탈로그에서 던지지 않는다', () => {
    expect(selectRecoveryCards([], completedIn())).toEqual([]);
  });
});

describe('완료 판정 — 두 갈래를 OR 로 묶는다', () => {
  const history = [
    historyEntry('done', 'completed'),
    historyEntry('running', 'in-progress'),
    historyEntry('left', 'abandoned')
  ];

  it('history 에 완료 항목이 있으면 완료다', () => {
    expect(isVariantCompleted({variantId: 'done', history, hasCommittedResultFlag: false})).toBe(true);
  });

  it('진행 중·중단은 완료가 아니다 — 그것들이야말로 복구 카드가 집어 줘야 하는 것이다', () => {
    expect(isVariantCompleted({variantId: 'running', history, hasCommittedResultFlag: false})).toBe(false);
    expect(isVariantCompleted({variantId: 'left', history, hasCommittedResultFlag: false})).toBe(false);
  });

  it('이력에 아예 없으면 완료가 아니다', () => {
    expect(isVariantCompleted({variantId: 'never', history, hasCommittedResultFlag: false})).toBe(false);
  });

  it('저장소 플래그만으로도 완료다 — 오늘 이 갈래를 참으로 만드는 호출부는 없지만 계약이 둘을 말한다', () => {
    expect(isVariantCompleted({variantId: 'never', history, hasCommittedResultFlag: true})).toBe(true);
  });

  it('같은 variant 의 완료 항목 하나면 충분하다 — 뒤에 중단 항목이 더 있어도 완료다', () => {
    const replayed = [...history, historyEntry('done', 'abandoned')];
    expect(isVariantCompleted({variantId: 'done', history: replayed, hasCommittedResultFlag: false})).toBe(true);
  });
});
