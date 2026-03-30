## 구현 변경 요약
문서 개정은 제외하고, 이번 instruction contract rework 과정에서 실제 구현 측에서 바뀐 내용만 정리한 목록입니다.

## 1. 핵심 구조 변경
### A. instruction 계약 재구성
- `variant별 고유 instruction 본문`을 fixture 데이터가 직접 소유하도록 변경
- `consent note`, `divider 표시`, `CTA 세트`, `CTA 클릭 결과`를 분리된 레이어로 재구성
- test route에서 consent 관련 저장은 CTA action 실행 시점에만 발생하도록 제한

### B. test route consent UX clean-slate 교체
- test 페이지 하단 consent UI 제거
- route-local consent banner 제거
- popup 기반 blocked/confirm flow 제거
- direct `available + OPTED_OUT` 즉시 redirect 제거
- 새 계약:
  - known consent + enterable card => plain instruction + `[Start]`
  - `UNKNOWN + available` => note + `[Accept All and Start] / [Deny and Abandon]`
  - `UNKNOWN + opt_out` => note + `[Accept All and Start] / [Deny and Start]`
  - deep-link `OPTED_OUT + available` => warning + `[Accept All and Start] / [Keep Current Preference]`

### C. landing/test 연결 유지
- landing ingress면 start-like CTA 이후 Q2부터 이어서 진행
- deep-link면 Q1부터 시작
- `landing + OPTED_OUT + available`는 여전히 카탈로그 단계 비도달 invariant로 유지

---

## 2. 수정된 파일 그룹

### A. Landing data / normalization
- [types.ts](/src/features/landing/data/types.ts)
- [adapter.ts](/src/features/landing/data/adapter.ts)
- [fixture-contract.ts](/src/features/landing/data/fixture-contract.ts)
- [raw-fixtures.ts](/src/features/landing/data/raw-fixtures.ts)

변경 내용:
- `RawTestPayload`에 `instruction` 필드 추가
- normalized `LandingTestCard.test.instruction` 생성
- locale-resolved instruction normalization 추가
- fixture contract에서 test card instruction 필수화
- 각 test variant에 서로 다른 dummy instruction 추가
- `en`, `kr` 기준 variant별 구분 가능한 instruction 연결

### B. Test instruction policy / runtime
- [entry-policy.ts](/src/features/test/entry-policy.ts)
- [instruction-overlay.tsx](/src/features/test/instruction-overlay.tsx)
- [test-question-client.tsx](/src/features/test/test-question-client.tsx)
- [question-bank.ts](/src/features/test/question-bank.ts)

변경 내용:
- `entry-policy`를 old mode/flag 중심 구조에서 `content / cta / effects` 구조로 재작성
- semantic action 집합 고정:
  - `start`
  - `accept_all_and_start`
  - `deny_and_start`
  - `deny_and_abandon`
  - `keep_current_preference`
- overlay가 단일 body가 아니라 `instruction + divider + note + CTA` 조합 렌더
- `test-question-client`를 `bootstrap -> policy resolve -> action dispatch -> commit/redirect` 구조로 재정리
- `instructionSeen` 기록 시점과 redirect/commit side effect 분리
- strict card/instruction 기반 question bootstrap 유지

### C. Landing/test shell 및 진입 관련 연계 변경
- [page.tsx](/src/app/[locale]/page.tsx)
- [page.tsx](/src/app/[locale]/test/[variant]/page.tsx)
- [page-shell.tsx](/src/features/landing/shell/page-shell.tsx)
- [telemetry-consent-banner.tsx](/src/features/landing/shell/telemetry-consent-banner.tsx)
- [landing-catalog-grid-loader.tsx](/src/features/landing/grid/landing-catalog-grid-loader.tsx)
- [use-landing-interaction-controller.ts](/src/features/landing/grid/use-landing-interaction-controller.ts)
- [hover-intent.ts](/src/features/landing/grid/hover-intent.ts)
- [landing-grid-card.tsx](/src/features/landing/grid/landing-grid-card.tsx)
- [blog-destination-client.tsx](/src/features/landing/blog/blog-destination-client.tsx)
- [index.ts](/src/features/landing/data/index.ts)

변경 내용:
- 기존 `availability === available` 중심 판단을 `cardType`/enterable helper 기준으로 이동
- landing catalog filtering과 test route 진입 계약을 현재 `cardType` 모델에 맞게 정렬
- test route는 default landing banner를 쓰지 않는 방향으로 유지
- loader/controller/handoff 쪽은 enterable card(`available|opt_out`) 기준으로 정리

### D. 스타일
- [globals.css](/src/app/globals.css)

변경 내용:
- 새 instruction overlay의 divider/note 스타일 추가
- 제거된 dialog 관련 스타일 정리

### E. 메시지 / locale
- [en.json](/src/messages/en.json)
- [kr.json](/src/messages/kr.json)
- [ja.json](/src/messages/ja.json)
- [de.json](/src/messages/de.json)
- [es.json](/src/messages/es.json)
- [fr.json](/src/messages/fr.json)
- [hi.json](/src/messages/hi.json)
- [id.json](/src/messages/id.json)
- [pt.json](/src/messages/pt.json)
- [ru.json](/src/messages/ru.json)
- [zs.json](/src/messages/zs.json)
- [zt.json](/src/messages/zt.json)

변경 내용:
- 제거:
  - `instructionBody`
  - `consentBranchBody`
  - popup/confirm 관련 key들
- 추가:
  - `keepCurrentPreference`
  - `unknownAvailableNote`
  - `unknownOptOutNote`
  - `optedOutAvailableWarning`

---

## 3. 삭제/제거된 구조
실제 구현에서 제거 대상으로 다룬 항목입니다.

### A. 삭제된 파일
- deleted `/src/features/test/instruction-dialog.tsx`

### B. 제거된 UI / 상태 / 분기
- test route bottom consent render
- route-local consent banner usage
- popup 기반 `start_blocked`
- popup 기반 `deny_confirm`
- `showBottomConsentUi`
- `blocked_until_consent`
- deep-link `available + OPTED_OUT` immediate redirect branch
- generic `instructionBody` fallback
- generic `consentBranchBody` copy flow

### C. 제거된 test id / selector 흔적
- `test-local-consent-banner`
- `test-local-consent-accept`
- `test-local-consent-deny`
- `test-dialog-close-button`
- `test-dialog-confirm-button`

현재 구현에서는 위 식별자들이 부재해야 한다는 negative assertion 쪽만 유지됩니다.

---

## 4. 테스트 변경
### A. Unit tests
- [landing-data-contract.test.ts](/tests/unit/landing-data-contract.test.ts)
- [landing-hover-intent.test.ts](/tests/unit/landing-hover-intent.test.ts)
- [landing-question-bank.test.ts](/tests/unit/landing-question-bank.test.ts)
- [test-question-bootstrap.test.ts](/tests/unit/test-question-bootstrap.test.ts)
- [test-entry-policy.test.ts](/tests/unit/test-entry-policy.test.ts)

변경 내용:
- instruction normalization 검증 추가
- variant별 instruction uniqueness 검증 추가
- new entry policy matrix 검증
- instructionSeen 기록 타이밍 검증
- landing ingress / deep-link의 Q2/Q1 시작 계약 반영

### B. E2E tests
- [consent-smoke.spec.ts](/tests/e2e/consent-smoke.spec.ts)
- [grid-smoke.spec.ts](/tests/e2e/grid-smoke.spec.ts)
- [state-smoke.spec.ts](/tests/e2e/state-smoke.spec.ts)
- [transition-telemetry-smoke.spec.ts](/tests/e2e/transition-telemetry-smoke.spec.ts)
- [theme-matrix-smoke.spec.ts](/tests/e2e/theme-matrix-smoke.spec.ts)
- [a11y-smoke.spec.ts](/tests/e2e/a11y-smoke.spec.ts)
- [gnb-smoke.spec.ts](/tests/e2e/gnb-smoke.spec.ts)
- [safari-hover-ghosting.spec.ts](/tests/e2e/safari-hover-ghosting.spec.ts)
- [landing-fixture.ts](/tests/e2e/helpers/landing-fixture.ts)

변경 내용:
- consent smoke를 새 instruction contract 기준으로 전면 재작성
- CTA만이 아니라 아래까지 검증하도록 강화:
  - variant-specific instruction body
  - divider 유무
  - consent note 문구
  - CTA label
  - 클릭 후 consent write / redirect / commit / instructionSeen
  - legacy UI 부재
- blocker 20~23 traceability에 새 smoke assertion id 연결
- `test-instruction` representative state 기준 theme snapshots 갱신

### C. Snapshot 갱신
- [theme-matrix-smoke.spec.ts-snapshots](/tests/e2e/theme-matrix-smoke.spec.ts-snapshots)

변경 내용:
- `layout test-instruction` 24장 스냅샷을 새 overlay 구조 기준으로 재생성

---

## 5. 구현 관점에서 남긴 최종 계약
외부 LLM이 코드와 문서를 비교할 때 기준으로 볼 핵심 구현 계약입니다.

### A. authoritative source
- variant instruction text: fixture data
- consent note text: locale messages
- CTA labels: locale messages
- CTA result semantics: `entry-policy.ts`

### B. start semantics
- landing ingress start-like action => Q2
- deep-link start-like action => Q1

### C. consent write semantics
- `Start` => consent write 없음
- `Accept All and Start` => `OPTED_IN`
- `Deny and Start` => `OPTED_OUT`
- `Deny and Abandon` => `OPTED_OUT` + home redirect
- `Keep Current Preference` => write 없음 + home redirect

### D. instructionSeen semantics
- 기록:
  - `Start`
  - `Accept All and Start`
  - `Deny and Start`
- 미기록:
  - `Deny and Abandon`
  - `Keep Current Preference`

### E. removed legacy behavior
- test page consent banner/dialog/popup 없음
- deep-link unknown에서 bottom consent UI 없음
- available opted-out direct access immediate redirect 없음
- generic instruction fallback 없음

---

## 6. 검증 결과
구현 기준 최종 검증은 다음으로 통과했습니다.
- `npm run qa:gate:once`
- 포함 결과:
  - `qa:static` 통과
  - `build` 통과
  - `vitest` 135개 통과
  - `test:e2e:smoke` 258개 통과
