## Refactory 1. Storage Key Constants SSOT 파일 생성

### 작업 목표
현재 코드베이스에 흩어진 storage key string을 하나의 SSOT 파일로 통합하고,
기존 파일-로컬 상수와 inline string literal을 SSOT import로 교체한다.
Phase 3에서 도입할 `test:{variant}:...` key topology는 placeholder로 포함한다.

### 착수 전 필수 확인 (코드 직접 읽기)

아래 파일에서 storage key string이 정확히 어떤 형태로 쓰이는지 확인한 뒤 작업을 시작한다.

1. `src/features/landing/gnb/hooks/use-theme-preference.ts`
   - `THEME_STORAGE_KEY` 상수의 실제 값 확인
2. `src/features/landing/gnb/site-gnb.tsx`
   - `CURRENT_PATH_STORAGE_KEY`, `PREVIOUS_PATH_STORAGE_KEY` 상수의 실제 값 확인
3. `src/features/landing/telemetry/consent-source.ts`
   - `getLocalStorage()` 호출 후 어떤 key string으로 get/set/remove하는지 확인
4. `src/features/landing/telemetry/runtime.ts`
   - 동일하게 telemetry session ID key string 확인
5. `src/features/landing/transition/store.ts`
   - `getSessionStorage()` 호출 후 사용하는 key string 전체 확인
6. variant-scoped key 사용처 파악:
   ```bash
   grep -r "instruction-seen\|landing-ingress" src --include="*.ts" --include="*.tsx"
   ```
   - 어떤 파일에서 어떤 형태로 만드는지 확인 (inline 템플릿 리터럴 vs 함수 vs 상수)

위 확인이 완료되기 전에 파일을 생성하지 않는다.

---

### 파일 구조 결정

**파일 1: `src/features/landing/storage/storage-keys.ts`**

landing이 소유하는 모든 current live key + variant-scoped key 함수를 담는다.

```ts
/**
 * Landing storage key SSOT.
 *
 * 이 파일이 landing feature의 localStorage / sessionStorage key 선언 유일 기준이다.
 * public/theme-bootstrap.js는 TS import가 불가능하므로 예외적으로 string literal을 유지하며,
 * 해당 파일 상단 주석에서 이 파일을 참조한다.
 *
 * Phase 3 test-side key는 src/features/test/storage/storage-keys.ts 가 소유한다.
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
  TELEMETRY_SESSION_ID: 'vivetest-telemetry-session-id',
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
   * 진행 중인 landing → destination transition 상태.
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
  LANDING_RETURN_VARIANT: 'vivetest-landing-return-card-id',
} as const;

/**
 * variant-scoped sessionStorage key 생성 함수.
 * variant별로 격리된 상태를 저장할 때 사용한다.
 */
export const variantSessionKeys = {
  /**
   * 해당 variant의 instruction overlay를 이미 확인했는지 여부.
   * 소유: src/features/test/entry-policy.ts (또는 실제 소유 파일로 교체)
   */
  instructionSeen: (variant: string) =>
    `vivetest-test-instruction-seen:${variant}` as const,

  /**
   * landing 카드에서 진입할 때 기록되는 ingress 레코드.
   * { variant, preAnswerChoice, createdAtMs, landingIngressFlag } 형태.
   * 소유: src/features/landing/transition/runtime.ts
   */
  landingIngress: (variant: string) =>
    `vivetest-landing-ingress:${variant}` as const,
} as const;
```

> **주의**: 착수 전 확인 결과에 따라 key 값과 JSDoc 소유 파일 경로를 실제 코드와 일치하도록 수정한다. 위 구조는 형식 예시이므로 값을 그대로 복사하지 않는다.

---

**파일 2: `src/features/test/storage/storage-keys.ts`**

Phase 3에서 도입할 test-side key topology를 placeholder로 선언한다.
지금은 실제 구현이 아닌 예약 선언이다.

```ts
/**
 * Test storage key SSOT — Phase 3 소유.
 *
 * ADR-B에서 확정된 test:{variant}:... prefix 계약을 구현한다.
 * 현재는 Phase 3 착수 전 placeholder 선언 상태이며,
 * 실제 스토리지 읽기/쓰기 구현은 Phase 3 첫 커밋에서 추가한다.
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
  flag: (variant: string, flagName: string) =>
    `test:${variant}:flag:${flagName}` as const,
} as const;

// TODO(phase3): 위 함수들의 variant 인자를 VariantId brand type으로 교체한다.
// import type { VariantId } from 'src/features/test/domain';
```

---

### 기존 코드 교체 범위

아래 파일에서 기존 파일-로컬 상수와 inline string literal을 SSOT import로 교체한다.

**`src/features/landing/gnb/hooks/use-theme-preference.ts`**
- `THEME_STORAGE_KEY` 상수 선언을 삭제하고 `LOCAL_STORAGE_KEYS.THEME` import로 교체

**`src/features/landing/gnb/site-gnb.tsx`**
- `CURRENT_PATH_STORAGE_KEY`, `PREVIOUS_PATH_STORAGE_KEY` 상수 선언을 삭제하고
  `SESSION_STORAGE_KEYS.CURRENT_PATH`, `SESSION_STORAGE_KEYS.PREVIOUS_PATH` import로 교체

**`src/features/landing/telemetry/consent-source.ts`**
- telemetry consent key string을 `LOCAL_STORAGE_KEYS.TELEMETRY_CONSENT` import로 교체

**`src/features/landing/telemetry/runtime.ts`**
- telemetry session ID key string을 `LOCAL_STORAGE_KEYS.TELEMETRY_SESSION_ID` import로 교체

**`src/features/landing/transition/store.ts`**
- transition 관련 sessionStorage key string을 `SESSION_STORAGE_KEYS.*` import로 교체

**variant-scoped key 사용처** (착수 전 확인 결과에서 파악한 파일)
- inline 템플릿 리터럴이 있으면 `variantSessionKeys.instructionSeen(variant)` 또는
  `variantSessionKeys.landingIngress(variant)` import로 교체

**`public/theme-bootstrap.js`**
- string literal `'vivetest-theme'`은 TS import가 불가능하므로 그대로 유지한다.
- 파일 상단에 아래 주석을 추가한다:
  ```js
  // Storage key: 'vivetest-theme'
  // SSOT: src/features/landing/storage/storage-keys.ts > LOCAL_STORAGE_KEYS.THEME
  // TS import가 불가능한 pre-hydration 스크립트이므로 string literal을 유지한다.
  ```

---

### AGENTS.md 갱신

`AGENTS.md §6` storage rules의 아래 항목을 수정한다:

```
// 변경 전
Key SSOT: [To be confirmed — no key declaration SSOT file currently exists]

// 변경 후
Key SSOT:
  - Landing keys: src/features/landing/storage/storage-keys.ts
  - Test keys (Phase 3): src/features/test/storage/storage-keys.ts
  - Exception: public/theme-bootstrap.js retains 'vivetest-theme' as string literal (TS import not possible)
```

---

### 절대 깨면 안 되는 계약

- key string **값** 자체를 변경하지 않는다. 이름만 상수화한다.
- `public/theme-bootstrap.js`의 string literal을 제거하거나 import로 대체하려 하지 않는다.
- Phase 3 placeholder를 실제로 구현하지 않는다. 선언과 TODO 주석만 추가한다.
- `src/features/test/domain/` frozen contracts를 건드리지 않는다.

---

### 완료 조건

- [ ] `src/features/landing/storage/storage-keys.ts` 존재, 모든 landing key 선언 및 JSDoc 완료
- [ ] `src/features/test/storage/storage-keys.ts` 존재, Phase 3 placeholder 선언 및 TODO 주석 완료
- [ ] 기존 파일-로컬 상수(`THEME_STORAGE_KEY` 등) 삭제 및 SSOT import로 교체 완료
- [ ] `public/theme-bootstrap.js`에 SSOT 참조 주석 추가, string literal 유지
- [ ] `AGENTS.md §6` Key SSOT 항목 갱신 완료
- [ ] `npm run lint` 통과
- [ ] `npm run typecheck` 통과
- [ ] `npm test` 통과
- [ ] `npm run build` 통과
