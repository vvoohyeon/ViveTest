import type {ResolvedRunHistoryEntry} from '@/features/test/storage/run-history';
import type {LocalizedRoutePath} from '@/i18n/localized-path';

/**
 * 복구 카드 선정 — `req-test.md` §6.1 「Phase 4 확장 계약」의 순수 부분.
 *
 * 계약의 규칙 넷 중 저장소를 읽는 것은 3 항 하나뿐이고 나머지 셋은 **목록 연산**이다. 그래서
 * 읽기는 부르는 쪽에 두고 여기는 순수하게 남긴다 — 그래야 다섯 검증 중 넷을 렌더 없이 잰다.
 *
 * **`.filter().slice()` 로 적는다.** 「앞에서부터 2 개」를 루프와 카운터로 적으면 제외 규칙이
 * 카운터와 얽혀, 나중에 제외 조건이 하나 늘 때 둘 중 어느 쪽이 상한을 세는지 읽어야 안다.
 */

import {getFlag} from '@/features/test/storage/state-flags';
import type {VariantId} from '@/features/test/domain';

/** 계약 4 항 — 제외 후 앞에서부터 **2 개**. */
export const RECOVERY_CARD_LIMIT = 2;

export interface RecoveryCandidate {
  variantId: string;
  /** 화면에 읽히는 테스트 이름. 서버가 카탈로그에서 locale 로 풀어 내려보낸다. */
  name: string;
  /** locale 이 붙은 진입 주소. `typedRoutes` 가 켜져 있으므로 문자열이 아니라 라우트 타입이다. */
  href: LocalizedRoutePath;
}

/**
 * 계약 1·2·4 항 — 선언 순서대로 훑고, 완료한 것을 빼고, 앞에서부터 상한만큼.
 *
 * 순서를 **정렬하지 않는다**. 후보가 이미 카탈로그 선언 순서로 들어오고, 여기서 다시 정렬하면
 * 그 순서의 정본이 둘이 된다.
 */
export function selectRecoveryCards(
  candidates: readonly RecoveryCandidate[],
  isCompleted: (variantId: string) => boolean,
  limit: number = RECOVERY_CARD_LIMIT
): RecoveryCandidate[] {
  return candidates.filter((candidate) => !isCompleted(candidate.variantId)).slice(0, limit);
}

/**
 * 계약 3 항 — 완료 여부는 **저장소와 이력 둘 다** 본다.
 *
 * 오늘 참이 되는 갈래는 이력 하나다. 저장소 쪽 증거인 `result_entry_committed` 를 `setFlag` 으로
 * 쓰는 호출부가 `src` 전체에 0 건이고(2026-09-19 실측), 그 플래그는 `volatilizeRunData` 의 삭제
 * 대상이기도 하다. 그래도 OR 로 적는 이유는 계약이 둘을 말하기 때문이고, 쓰는 쪽이 생기는 날
 * 이 판정이 **고칠 것 없이** 맞기 때문이다.
 *
 * 이력 쪽은 `status === 'completed'` 하나만 본다. `in-progress` 와 `abandoned` 는 완료가 아니고,
 * 그 둘이야말로 복구 카드가 집어 줘야 하는 것이다.
 */
export function isVariantCompleted({
  variantId,
  history,
  hasCommittedResultFlag
}: {
  variantId: string;
  history: readonly ResolvedRunHistoryEntry[];
  hasCommittedResultFlag: boolean;
}): boolean {
  if (hasCommittedResultFlag) {
    return true;
  }

  return history.some((entry) => entry.variantId === variantId && entry.status === 'completed');
}

/**
 * 저장소 갈래를 읽는다. 서버에서는 `safe-storage` 가 `null` 을 돌려주므로 언제나 `false` 이고,
 * 그것이 참이다 — 서버에는 이 기기의 증거가 없다.
 */
export function hasCommittedResultFlag(variantId: string): boolean {
  return getFlag(variantId as VariantId, 'result_entry_committed');
}
