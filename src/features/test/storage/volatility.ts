import type {VariantId} from '@/features/test/domain';

import {instructionSeenKey} from '@/features/test/storage/instruction-seen';
import {STATE_FLAG_NAMES, testVariantKey} from '@/features/test/storage/test-storage-keys';
import {removeLocal, removeSession} from '@/lib/safe-storage';

export type VolatilityTrigger = 'result_entry_committed' | 'inactivity' | 'restart';

/**
 * 한 회차의 **작업 데이터**를 지운다. 회차 이력은 대상이 아니다 — 휘발은 이어서 할 수 있게 하던
 * 것을 거두는 일이고, 이력은 그 회차가 있었다는 사실이다(`req-test.md` §8.4).
 *
 * 지우기는 저장소가 막힌 브라우저에서도 던지지 않는다. 지우지 못한 값은 다음 읽기에서 유효성
 * 검사에 걸리므로, 여기서 멈추는 것보다 지나가는 쪽이 낫다.
 */
export function volatilizeRunData(variantId: VariantId, trigger: VolatilityTrigger): void {
  // `trigger` 는 호출자가 **왜** 지우는지를 적는 자리다. 지우는 범위는 세 경우 모두 같으므로
  // 여기서 읽지 않는다 — 범위가 갈리는 날 이 인자가 그 분기의 입력이 된다(`req-test.md` §8.3).
  void trigger;

  removeLocal(testVariantKey.activeRun(variantId));
  removeLocal(testVariantKey.responseSet(variantId));
  for (const flagName of STATE_FLAG_NAMES) {
    removeLocal(testVariantKey.flag(variantId, flagName));
  }

  removeSession(instructionSeenKey(variantId));
}
