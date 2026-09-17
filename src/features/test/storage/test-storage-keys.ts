import type {VariantId} from '@/features/test/domain';

// instructionSeen keeps its ADR-B legacy key format in
// src/features/test/storage/instruction-seen.ts until the Phase 5 key migration.
export const STATE_FLAG_NAMES = [
  'derivation_in_progress',
  'derivation_computed',
  'min_loading_duration_elapsed',
  'result_entry_committed',
  'result_persisted'
] as const;

export type FlagName = (typeof STATE_FLAG_NAMES)[number];

export const testVariantKey = {
  flag: (variantId: VariantId, flagName: FlagName) => `test:${variantId}:flag:${flagName}` as const,
  activeRun: (variantId: VariantId) => `test:${variantId}:activeRun` as const,
  responseSet: (variantId: VariantId) => `test:${variantId}:responses` as const
} as const;

/**
 * 회차 이력 — **variant 로 나뉘지 않는 유일한 test 키**다.
 *
 * 목록이 여러 variant 를 시간순으로 한 줄에 세우므로 variant 별로 흩어 두면 읽을 때마다 모든
 * variant 를 훑어야 하고, 그 목록의 정본은 registry 가 아니라 **사용자가 한 일**이라 훑을 목록
 * 자체가 없다. 그리고 이 키는 `volatilizeRunData` 의 삭제 대상이 **아니다** — 휘발은 한 회차의
 * 작업 데이터를 지우는 것이고, 이력은 그 회차가 있었다는 사실이다(`req-test.md` §8.4).
 */
export const TEST_RUN_HISTORY_KEY = 'test:runHistory' as const;
