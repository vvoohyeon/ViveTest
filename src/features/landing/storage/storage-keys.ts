/**
 * Landing storage key SSOT.
 *
 * This file is the single declaration source for landing-owned localStorage
 * and sessionStorage keys. public/theme-bootstrap.js cannot import TypeScript,
 * so it keeps its string literal with a comment pointing back here.
 *
 * Phase 3 test-side keys are owned by src/features/test/storage/storage-keys.ts.
 */

/** localStorage에 저장되는 key 목록 */
export const LOCAL_STORAGE_KEYS = {
  /**
   * 사용자가 수동으로 선택한 테마 preference.
   * 값: 'light' | 'dark'. system preference일 때는 key 자체가 없음.
   * 소유: src/features/landing/gnb/hooks/use-theme-preference.ts
   * 참조: public/theme-bootstrap.js (TS import 불가로 string literal 유지)
   */
  THEME: 'vivetest-theme',

  /**
   * 텔레메트리 동의 상태.
   * 소유: src/features/landing/telemetry/consent-source.ts
   */
  TELEMETRY_CONSENT: 'vivetest-telemetry-consent',

  /**
   * 익명 텔레메트리 세션 ID.
   * 소유: src/features/landing/telemetry/runtime.ts
   */
  TELEMETRY_SESSION_ID: 'vivetest-telemetry-session-id'
} as const;

/** sessionStorage에 저장되는 key 목록 */
export const SESSION_STORAGE_KEYS = {
  /**
   * 현재 방문 중인 내부 경로.
   * 소유: src/features/landing/gnb/site-gnb.tsx
   */
  CURRENT_PATH: 'vivetest-current-path',

  /**
   * 직전에 방문했던 내부 경로. back 버튼 동작에 사용.
   * 소유: src/features/landing/gnb/site-gnb.tsx
   */
  PREVIOUS_PATH: 'vivetest-previous-path',

  /**
   * 진행 중인 landing -> destination transition 상태.
   * 소유: src/features/landing/transition/store.ts
   */
  LANDING_PENDING_TRANSITION: 'vivetest-landing-pending-transition',

  /**
   * 카드 클릭 시점의 스크롤 위치. 복귀 시 scroll restore에 사용.
   * 소유: src/features/landing/transition/store.ts
   */
  LANDING_RETURN_SCROLL_Y: 'vivetest-landing-return-scroll-y',

  /**
   * 전환 출발 카드 variant id. 복귀 시 복원 대상 카드 식별에 사용.
   * 소유: src/features/landing/transition/store.ts
   */
  LANDING_RETURN_VARIANT: 'vivetest-landing-return-variant'
} as const;

/**
 * variant-scoped sessionStorage key 생성 함수.
 * variant별로 격리된 상태를 저장할 때 사용한다.
 */
export const variantSessionKeys = {
  /**
   * 해당 variant의 instruction overlay를 이미 확인했는지 여부.
   * 소유: src/features/landing/transition/store.ts
   * 소비: src/features/test/test-question-client.tsx
   */
  instructionSeen: (variant: string) => `vivetest-test-instruction-seen:${variant}` as const,

  /**
   * landing 카드에서 진입할 때 기록되는 ingress 레코드.
   * { variant, preAnswerChoice, createdAtMs, landingIngressFlag } 형태.
   * 소유: src/features/landing/transition/store.ts
   */
  landingIngress: (variant: string) => `vivetest-landing-ingress:${variant}` as const
} as const;
