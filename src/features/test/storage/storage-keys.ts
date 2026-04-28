/**
 * Test storage key SSOT - Phase 3 owner.
 *
 * ADR-B fixed the test:{variant}:... prefix contract. This file is only a
 * placeholder declaration before Phase 3 starts; actual storage reads/writes
 * are intentionally not implemented here.
 */

/**
 * test:{variant}: prefix 기반 key 생성.
 * VariantId brand type은 Phase 3에서 import해서 적용한다.
 * 현재는 string으로 받고 Phase 3에서 타입을 좁힌다.
 */
export const testStorageKeys = {
  /**
   * 해당 variant의 active run 상태 전체.
   * TODO(phase3): 구체적인 값 구조는 Phase 3에서 확정한다.
   */
  run: (variant: string) => `test:${variant}:run` as const,

  /**
   * 해당 variant의 5개 상태 플래그.
   * flagName: 'derivation_in_progress' | 'derivation_computed' |
   *           'min_loading_duration_elapsed' | 'result_entry_committed' | 'result_persisted'
   * TODO(phase3): StateFlags 타입과 함께 구현한다.
   */
  flag: (variant: string, flagName: string) => `test:${variant}:flag:${flagName}` as const
} as const;

// TODO(phase3): 위 함수들의 variant 인자를 VariantId brand type으로 교체한다.
// import type {VariantId} from 'src/features/test/domain';
