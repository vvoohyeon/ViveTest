# AGENTS.md

> **이 파일의 역할**: 프로젝트 고유의 사실·아키텍처 제약·검증 명령을 담는 선언적 저장소다.
> 브레인스토밍·계획 수립·TDD·코드 리뷰 등 개발 절차는 Superpowers 스킬이 담당한다. 이 파일에 절차적 워크플로우를 추가하지 않는다.

---

## 1. 작업 시작 전 필수 확인 항목

먼저 실제 스크립트와 플래그를 확인한다.
- `package.json`
- `next.config.ts`
- `playwright.config.ts`
- `src/config/site.ts`

현재 구현 기준 계약 문서는 아래 순서로 읽는다. **항상 전부 읽지 말고, 해당 작업 유형과 관련된 문서만 읽는다.**
- `docs/project-analysis.md`
- `docs/req-landing.md`
- `docs/req-test.md`
- `docs/req-test-plan.md`
- 필요 시 `docs/blocker-traceability.json`

`docs/requirements.md`는 배경 문서다. 현재 구현의 직접 SSOT로 취급하지 않는다.
`docs/archive/**`는 역사 문서다. 현재 계약 근거로 사용하지 않는다.

아래 경로를 건드리면 변경 전에 관련 계약 문서와 테스트 앵커를 먼저 확인한다.
- `src/proxy.ts`
- `src/i18n/**`
- `src/app/[locale]/**`
- `src/lib/routes/route-builder.ts`
- `src/i18n/localized-path.ts`
- `src/features/test/**`
- `src/features/variant-registry/**`
- `public/theme-bootstrap.js`
- `tests/e2e/theme-matrix-manifest.json`
- `docs/blocker-traceability.json`

### 작업 유형별 진입 맵
- routing / locale / not-found: `docs/req-landing.md` §5, `docs/project-analysis.md` §4, `src/proxy.ts`, `src/i18n/**`, `tests/e2e/routing-smoke.spec.ts`
- landing grid / GNB / theme: `docs/req-landing.md` §6~11, `src/features/landing/grid/**`, `src/features/landing/gnb/**`, `public/theme-bootstrap.js`
- transition / telemetry / consent: `docs/req-landing.md` §8, §12, §13, `src/features/landing/transition/**`, `src/features/landing/telemetry/**`, `tests/e2e/transition-telemetry-smoke.spec.ts`, `tests/e2e/consent-smoke.spec.ts`
- test flow / domain: `docs/req-test.md`, `docs/req-test-plan.md`, `src/features/test/**`, `src/features/test/domain/**`, `tests/unit/test-domain-*.test.ts`
- variant registry / fixture boundary: `docs/req-landing.md` §12, `docs/req-test.md` §2, `docs/project-analysis.md` §5.3, `src/features/variant-registry/**`, `scripts/sync/**`, `tests/unit/landing-data-contract.test.ts`, `scripts/qa/check-variant-registry-contracts.mjs`

---

## 2. 현재 런타임 표면과 ownership

- 활성 라우트 표면: `/{locale}`, `/{locale}/blog`, `/{locale}/blog/{variant}`, `/{locale}/history`, `/{locale}/test/{variant}`, `/{locale}/test/error`, `/api/telemetry`
- 404 surface: `src/app/not-found.tsx`, `src/app/global-not-found.tsx`
- 지원 locale: `en`, `kr`, `zs`, `zt`, `ja`, `es`, `fr`, `pt`, `de`, `hi`, `id`, `ru`
- 플랫폼 플래그:
  - `src/app/[locale]/layout.tsx`: `dynamicParams = false`
  - `next.config.ts`: `typedRoutes = true`, `experimental.globalNotFound = true`
  - locale normalization: `ko* -> kr`, Simplified Chinese -> `zs`, Traditional Chinese -> `zt`
- ownership:
  - `src/app/[locale]/**`: thin route / server entry
  - `src/features/landing/**`: grid, GNB, transition, telemetry, shell, blog destination
  - `src/features/test/**`: canonical test surface
  - `src/features/test/domain/**`: pure domain module, public surface는 `index.ts`만
  - `src/features/test/schema-registry.ts`: variant → ScoringLogicType → ScoringSchema 매핑 소유
  - `src/features/test/response-projection.ts`: 미래 A/B 응답 → 도메인 토큰 projection layer 예약 (현재 미구현 placeholder)
  - `src/features/variant-registry/**`: fixture source, builder, resolver, generated runtime registry
  - `scripts/sync/**`: Sheets 로딩(`sheets-loader.ts`), sync 오케스트레이션(`sync.ts`), dry-run 검증(`sync-dry-run.ts`), 레지스트리 직렬화(`registry-serializer.ts`). 계약 문서: `docs/req-test.md §2`.
  - `src/i18n/**`: locale resolution, request policy, SSR `html lang` sync
  - `src/lib/routes/**`: locale-free typed route authoring
  - `src/i18n/localized-path.ts`: locale prefix 적용
  - `src/messages/*.json`: shared UI copy, namespace는 `gnb`, `landing`, `test`, `blog`, `history`, `consent`
  - `public/theme-bootstrap.js`: pre-hydration theme bootstrap
  - `scripts/qa/*.mjs`: machine-enforced contract checks
  - `docs/blocker-traceability.json`: blocker evidence registry, 현재 blocker `1..30`
  - `tests/e2e/helpers/landing-fixture.ts`: representative route anchor SSOT

---

## 3. 수정 가능 / 수정 주의 / 수정 금지

### 수정 가능
- `src/features/**`
- `src/i18n/**`
- `src/lib/routes/**`
- `src/messages/**`
- `tests/**`
- `docs/**`
- `public/**` 단, bootstrap 계약을 깨지 않는 범위

### 수정 주의
- `src/proxy.ts`
- `src/app/layout.tsx`
- `src/app/[locale]/layout.tsx`
- `public/theme-bootstrap.js`
- `src/lib/routes/route-builder.ts`
- `src/i18n/localized-path.ts`
- `src/features/variant-registry/source-fixture.ts`
- `src/features/variant-registry/builder.ts`
- `src/features/variant-registry/resolvers.ts`
- `src/features/variant-registry/types.ts`
- `src/features/variant-registry/variant-registry.generated.ts`
- `scripts/qa/*.mjs`
- `tests/e2e/theme-matrix-manifest.json`
- `docs/blocker-traceability.json`

주의 이유:
- 위 파일들은 locale entry, SSR `html lang`, route authoring, runtime registry export, screenshot closure, blocker evidence 계약과 직접 연결된다.
- `variant-registry.generated.ts`는 hand-written source of truth가 아니다. 직접 수정이 필요해 보여도 먼저 `source-fixture.ts`, `builder.ts`, `resolvers.ts`를 확인한다.
- `scripts/qa/*.mjs`는 machine-enforced contract check를 담당하므로 변경 시 QA gate 해석 자체가 바뀔 수 있다.

### 수정 금지 / 수동 생성물
- `src/middleware.ts` 재도입 금지. request entry point는 `src/proxy.ts` 하나로 유지한다.
- `.next/`, `node_modules/`, `coverage/`, `test-results/`, `playwright-report/`, `dist/`, `out/`, `output/`, `tsconfig.tsbuildinfo`
- 생성물은 직접 편집하지 않는다. 필요한 변경은 소스 또는 빌더를 통해 반영한다.

---

## 4. 로컬 실행 명령어

Superpowers의 `verification-before-completion` 스킬이 완료를 증명할 때 아래 명령어를 사용한다.

### 기본 게이트
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

### 참고 명령
- `npm run sync`
- `npm run sync:dry`
- `npm run qa:rules`
- `npm run qa:static`
- `npm run qa:gate:once`
- `npm run qa:gate`
- `npm run test:e2e`
- `npm run test:e2e:smoke`

### 변경 유형별 추가 체크
- routing / locale / not-found: `node scripts/qa/check-phase1-contracts.mjs`, `npm test -- tests/unit/route-builder.test.ts tests/unit/localized-path.test.ts tests/unit/locale-resolution.test.ts tests/unit/proxy-policy.test.ts tests/unit/request-locale-header.test.ts tests/unit/locale-config.test.ts`, `npx playwright test tests/e2e/routing-smoke.spec.ts`
- variant registry / fixture boundary: `node scripts/qa/check-variant-registry-contracts.mjs`, `node scripts/qa/check-variant-only-contracts.mjs`, `npm test -- tests/unit/landing-data-contract.test.ts tests/unit/landing-card-contract.test.ts`
- telemetry / consent / transition: `node scripts/qa/check-phase11-telemetry-contracts.mjs`, `npm test -- tests/unit/landing-telemetry-validation.test.ts tests/unit/landing-telemetry-runtime.test.ts tests/unit/landing-transition-store.test.ts`, `npx playwright test tests/e2e/consent-smoke.spec.ts tests/e2e/transition-telemetry-smoke.spec.ts`
- landing grid / state / GNB / theme: `node scripts/qa/check-phase4-grid-contracts.mjs`, `node scripts/qa/check-phase5-card-contracts.mjs`, `node scripts/qa/check-phase6-spacing-contracts.mjs`, `node scripts/qa/check-phase7-state-contracts.mjs`, `node scripts/qa/check-phase8-accessibility-contracts.mjs`, `node scripts/qa/check-phase9-performance-contracts.mjs`, `node scripts/qa/check-phase10-transition-contracts.mjs`, `npm test -- tests/unit/landing-interaction-dom.test.ts tests/unit/landing-hover-intent.test.ts tests/unit/landing-mobile-lifecycle.test.ts tests/unit/landing-desktop-shell-phase.test.ts tests/unit/landing-grid-plan.test.ts`, `npx playwright test tests/e2e/grid-smoke.spec.ts tests/e2e/state-smoke.spec.ts tests/e2e/gnb-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts`
- test flow / domain: `npm test -- tests/unit/test-domain-variant-validation.test.ts tests/unit/test-domain-question-model.test.ts tests/unit/test-domain-derivation.test.ts tests/unit/test-domain-type-segment.test.ts tests/unit/test-entry-policy.test.ts tests/unit/test-question-bootstrap.test.ts`, `npx playwright test tests/e2e/consent-smoke.spec.ts`

### `qa:rules` 제외 메모
- 2026-04-16 기준 Phase 11 visual smoke baseline은 로컬 QA 자산으로 정리되었다.
- Playwright screenshot baseline은 `tests/e2e/*-snapshots/` 아래 로컬 PNG로 저장하며, Git tracked completeness는 요구하지 않는다.
- visual smoke helper는 missing baseline을 같은 경로에 자동 생성하고, baseline이 이미 있으면 기존 PNG와 비교한다.
- 2026-04-25 기준 `npm run qa:rules`는 Phase 11, variant registry, variant-only, blocker traceability까지 모두 통과한다.
- `npm run qa:gate`는 release / flake 확인용의 무거운 파이프라인이다.

---

## 5. 골드 스탠다드 참조

외부 인터넷의 코드 패턴을 임의로 참조하지 말고 아래 파일을 100% 모방한다.

- thin route 기준: `src/app/[locale]/page.tsx`
- locale-free route authoring 기준: `src/lib/routes/route-builder.ts`
- locale prefix 적용 기준: `src/i18n/localized-path.ts`
- resolver boundary 기준: `src/features/variant-registry/resolvers.ts`
- builder 기준: `src/features/variant-registry/builder.ts`
- source/runtime type 분리 기준: `src/features/variant-registry/types.ts`
- pure domain public surface 기준: `src/features/test/domain/index.ts`
- pure validator 기준: `src/features/test/domain/validate-variant.ts`
- instruction entry policy 기준: `src/features/test/entry-policy.ts`
- telemetry payload hygiene 기준: `src/features/landing/telemetry/validation.ts`
- transition storage/runtime 기준: `src/features/landing/transition/runtime.ts`
- representative e2e anchor 기준: `tests/e2e/helpers/landing-fixture.ts`

---

## 6. 프로젝트 특화 규칙

### 아키텍처 / 라우팅 / locale
- 실제 페이지 파일은 `src/app/[locale]/**` 아래에만 둔다.
- 경로 문자열 수동 결합을 금지한다. app code의 route authoring은 `RouteBuilder`, locale 적용은 `buildLocalizedPath()`를 사용한다.
- `src/proxy.ts`는 단일 request entry point다. locale prefix 규칙을 우회하는 별도 진입점이나 `src/middleware.ts`를 만들지 않는다.
- `src/app/layout.tsx`는 top-level document shell만 담당한다. locale-specific branching은 `src/app/[locale]/layout.tsx`와 route layer에서 처리한다.
- duplicate locale prefix는 `/_not-found` rewrite로 처리한다. locale-less app path는 localized path로 redirect한다.

### variant registry / fixture boundary
- landing / test / blog consumer는 raw fixture shape를 직접 읽지 않는다.
- registry layer 바깥에서 `raw-fixtures`, `source-fixture`, `variant-registry.generated` direct import를 금지한다.
- preview payload 접근은 `resolveTestPreviewPayload()` 단일 경계만 허용한다.
- `variant-registry.generated.ts`는 runtime export다. source fixture authoring shape와 runtime shape를 혼용하지 않는다.
- source row 처리 규칙은 `seq -> sort -> drop`을 유지한다.
- partial activation 금지. cross-source 불일치 상태에서 일부 variant만 반영하는 부분 갱신을 허용하지 않는다.
- unified runtime meta key는 `durationM`, `sharedC`, `engagedC`다.
- resolver의 `{audience: 'qa'}` 경계는 QA catalog에서만 `hide` / `debug` fixture를 드러낸다.
- preview source는 Questions의 first scoring question `scoring1`이다.
  - source fixture에는 inline preview field를 두지 않는다.
  - consumer shape(`previewQuestion`, `answerChoiceA`, `answerChoiceB`)는 유지한다.
  - source 교체 범위는 builder / resolver 내부에 가둔다.

### test flow / domain / storage
- canonical test surface는 `src/features/test/**`다.
- `src/features/landing/test/*` 재도입 금지.
- `src/features/test/domain/index.ts`만 public surface로 취급한다.
- Phase 0-1 ADR(`docs/req-test-plan.md`)에서 동결된 계약은 새 ADR 없이 임의 변경하지 않는다.
  - `VariantId = string & { readonly __brand: 'VariantId' }`
  - `QuestionIndex = number & { readonly __brand: 'QuestionIndex' }`
  - `validateVariant()`의 `MISSING | UNKNOWN | UNAVAILABLE` union shape
  - `BlockingDataErrorReason` surface
- instruction 본문은 fixture가 소유하고, CTA label / consent note는 locale messages가 소유한다.
- question bank의 live 앵커는 `buildVariantQuestionBank()` / `resolveVariantPreviewQ1()`이다. 기존 inline-bridge helper는 deprecated compatibility path로만 export된다.
- test route는 route-local consent banner, confirm dialog, blocked popup을 렌더하지 않는다.
- current runtime key와 Phase 3 문서상의 future key를 혼동하지 않는다.
  - Key SSOT: [확인 필요: key 선언 SSOT 파일 없음]
- 현재 sessionStorage: `vivetest-landing-pending-transition`, `vivetest-landing-return-scroll-y`, `vivetest-landing-return-variant`, `vivetest-test-instruction-seen:{variant}`, `vivetest-landing-ingress:{variant}`
  - 현재 sessionStorage: `vivetest-landing-pending-transition`, `vivetest-landing-return-scroll-y`, `vivetest-landing-return-card-id`, `vivetest-test-instruction-seen:{variant}`, `vivetest-landing-ingress:{variant}`
  - 문서상의 future key: `test:{variant}:...`, `test:{variant}:flag:{flagName}`
- `instructionSeen`은 현재 variant-scoped `sessionStorage` key로 유지된다.
- 승인되지 않은 스토리지 키를 무단으로 생성하지 마라.

### blog / telemetry / theme / QA surface
- `/{locale}/blog`는 list-only route다.
- blog detail은 invalid variant 또는 non-enterable variant에서 다른 글 fallback 없이 localized blog index로 redirect한다.
- telemetry API는 object payload와 `event_type`을 요구하며 shared telemetry transport validation 실패 시 `400`, 성공 시 `204`를 반환한다. persistence는 없다.
- telemetry / Vercel analytics consent source는 하나로 유지한다.
- consent banner의 Preferences 버튼은 현재 visible no-op이다. 요구사항 변경 전 동작을 부여하지 않는다.
- representative anchor SSOT: available test `qmbti`, opt-out test `energy-check`, primary blog `ops-handbook`
- theme-matrix QA는 전체 locale이 아니라 현재 `en`, `kr` 대표 행렬만 사용한다.
- combined theme label wording family는 `Language ⋅ Theme` 계열을 유지한다.
- `public/theme-bootstrap.js`는 hydration 이전에 `vivetest-theme`를 읽는다.
- `motion` 패키지는 설치되어 있지만 현재 `src` / `tests`에서 사용하지 않는다. 도입 시 `docs/req-landing.md` §8.3 Core Motion Contract에 맞춰야 한다. [임시: 2026-04-15 기준]
- Tailwind v4 패키지는 설치되어 있으며, 현재 런타임 styling ownership은 `src/app/globals.css`의 token/base와 feature-local style source로 분리되어 있다. `src/app/globals.css`는 112줄 token/base 표면이고 landing grid/card motion/focus/reduced-motion은 `src/features/landing/grid/landing-grid-card.module.css`가 소유한다. [업데이트: 2026-04-21]
- Tech stack: `next@16.2.4`, `react@19.2.4`, `next-intl@4.9.1`, `motion@12.34.0` (미사용)

### UX 위험 집중 구역
아래 파일·서브시스템은 사용성·접근성·반응성·성능·디자인 일관성에 직접 영향을 준다.
이 경로를 수정하는 Superpowers 계획에는 사용성·접근성·반응성·성능·디자인 일관성 중 해당 항목을 명시하고, 서브에이전트 단위 QA 회귀 테스트를 포함해야 한다.
- `src/features/landing/grid/use-landing-interaction-controller.ts` — 486줄 오케스트레이터. `useReducer` 2개와 capability/reduced-motion/visibility sync, 카드 binding 조합, transition start callback을 소유한다. DOM/focus helper, hover intent, desktop motion, mobile lifecycle, keyboard handoff, grid geometry/RAF는 같은 디렉토리의 전용 hook/module로 분리되어 있다. [업데이트: 2026-04-25]
- `src/features/landing/grid/use-mobile-card-lifecycle.ts` — 543줄. 모바일 카드 생명주기 담당. landing grid 타이밍 계약에 민감하다. [업데이트: 2026-04-25]
- `src/features/landing/grid/use-keyboard-handoff.ts` — 367줄. 키보드 탐색 핸드오프 담당. [업데이트: 2026-04-25]
- `src/features/landing/gnb/site-gnb.tsx` — 키보드 탐색 순서, 포커스 반환, 테마 전환, 로케일 전환을 담당한다.
- `src/features/landing/shell/page-shell.tsx` — 전 로케일 라우트의 공유 런타임 컨트롤러. GNB, TransitionGnbOverlay, TelemetryConsentBanner를 마운트한다.
- `public/theme-bootstrap.js` — hydration 이전 테마 부트스트랩. 변경 시 테마 깜빡임 회귀 위험.
- `src/features/landing/telemetry/consent-source.ts` — 동의 게이트 단일 소스. Vercel analytics와 telemetry의 공통 진입점이다.
- `src/features/landing/transition/` — 전환 핸드셰이크와 sessionStorage 계약. 타임아웃·취소·scroll restore 시맨틱에 민감하다.

### 주석 규칙
- 한국어 주석은 선택적으로 사용한다.
- 허용 / 권장 대상: 비직관적 계약, 타이밍 제약, 예외 처리 이유, 브라우저 / 상태 경합
- 자명한 코드 설명용 주석, 문장형 중복 설명, 주석 남발은 금지한다.

### 미구현 / stub 영역
아래 영역은 현재 미구현 또는 최소 stub 상태다. 구현 완료된 계약처럼 취급하지 마라.
- live score derivation 배선 및 result URL/payload 렌더링
- runtime A/B 응답 → domain token projection (`src/features/test/response-projection.ts`는 예약된 placeholder)
- question-level 텔레메트리 훅
- history persistence
- Results Sheets loading (sync 스크립트는 현재 2-source 모드로 `validateCrossSheetIntegrity` 호출)
- backend 수집 보장 및 branch-protected production push policy

---

## 7. Superpowers 연동 노트

이 섹션은 Superpowers 스킬이 이 프로젝트에서 올바르게 작동하기 위해 반드시 참조해야 하는 프로젝트 고유 정보다.

### 계획 수립 시 필수 포함 항목 (writing-plans 체크리스트)
Superpowers `writing-plans`로 생성되는 계획 문서에는 아래 항목이 포함되어야 한다.

- 수정 대상 파일 경로
- 해당 SSOT 계약 문서 (§1 진입 맵 기준)
- 영향 받는 공유 컴포넌트 (shell, GNB 여부)
- 로컬라이제이션 영향 여부 (`src/messages`, `src/i18n`)
- 접근성 영향 여부 (a11y-smoke 대상 여부)
- 상태 처리 영향 여부 (transition / telemetry / consent 계약)
- 핵심 사용자 플로우 영향 여부 (landing → test 진입, 동의 흐름)
- 실행할 검증 명령어 (§4 기준)

이 항목이 누락된 계획은 승인 전 보완 요청한다.

### 서브에이전트 Context Bridge 필수 규칙
서브에이전트 호출 시 아래 제약을 컨텍스트에 반드시 포함한다.
- `src/middleware.ts` 재도입 금지 / `src/proxy.ts` 단일 진입점 유지
- `variant-registry.generated.ts` 직접 수정 금지
- 승인된 스토리지 키 목록 (§6 storage 참조)
- 해당 태스크와 직결되는 수정 금지 경로 (§3 기준)

---

## 8. Done의 로컬 정의

- 기본 Done 게이트 순서: §4 기본 게이트를 따른다.
- `qa:rules`는 기본 Done에서 제외한다. release-surface 전체를 보는 참고 명령으로 유지한다.
- `qa:gate:once` / `qa:gate`는 기본 Done보다 무겁다. release 직전 또는 flake 확인이 필요할 때만 올린다.
- 영향 범위 추가 체크:
  - `proxy` / `i18n` / `route-builder` / `localized-path`: routing / locale unit test + `tests/e2e/routing-smoke.spec.ts`
  - `landing grid` / `GNB` / `theme bootstrap` / `shared shell`: 관련 phase QA script + `grid-smoke`, `state-smoke`, `gnb-smoke`, 필요 시 `a11y-smoke`
  - `transition` / `telemetry` / `consent`: `check-phase10-transition-contracts.mjs`, `check-phase11-telemetry-contracts.mjs`, `tests/e2e/consent-smoke.spec.ts`, `tests/e2e/transition-telemetry-smoke.spec.ts`
  - `test flow` / `entry-policy` / `question-bank` / `domain`: `tests/unit/test-domain-*.test.ts`, `tests/unit/test-entry-policy.test.ts`, `tests/unit/test-question-bootstrap.test.ts`, `tests/unit/variant-question-bank.test.ts`, `tests/unit/test-lazy-validation.test.ts`, `tests/unit/schema-registry.test.ts`, 필요 시 `tests/e2e/consent-smoke.spec.ts`
  - `variant-registry` / `data model`: `check-variant-registry-contracts.mjs`, `check-variant-only-contracts.mjs`, `tests/unit/landing-data-contract.test.ts`, `tests/unit/registry-serializer.test.ts`, `tests/unit/variant-registry-runtime-integrity.test.ts`
  - `blog detail` / `subtitle continuity`: `tests/unit/blog-server-model.test.ts`, `tests/unit/landing-card-contract.test.ts`
  - `AGENTS.md`: 파일 경로, 명령어, locale set, representative anchor, baseline 상태를 현재 저장소와 다시 대조한다.
  - **§9 문서 유지보수 원칙**의 갱신 트리거 항목에 해당하면 관련 계약 문서와 `AGENTS.md`를 코드와 동시에 갱신한다.
- 동작 변경이나 버그 수정을 포함한 경우, 관련 회귀 시나리오의 테스트 커버리지가 추가 또는 갱신되었는지 확인한다.

---

## 9. 문서 유지보수 원칙

- 아래 변경이 생기면 `AGENTS.md`를 함께 갱신한다.
  - 스크립트 이름 또는 실행 순서 변경
  - active contract docs 목록 변경
  - route surface 변경
  - locale set 변경
  - storage key 변경
  - representative anchor 변경
  - `tests/e2e/theme-matrix-manifest.json` closure 변경
  - QA script 목록 또는 책임 변경
  - generated / source-of-truth boundary 변경
  - baseline availability 상태 변경
  - 골드 스탠다드 파일 교체
  - 디렉토리 책임 변경
  - 같은 실수가 코드 리뷰나 에이전트 실행에서 2회 이상 반복
- 역질문 기준, 오케스트레이션 전략, Superpowers 라우팅 전략은 Codex Custom Instructions에 귀속한다. 이 파일에 넣지 않는다.
- 이 저장소에서만 필요한 사실과 명령어만 유지한다.
- 임시 운영 상태는 날짜와 함께 적는다.

---

## 10. 하위 디렉토리 규칙 위임 구조

- 신설 기준:
  - 해당 디렉토리에서만 필요한 규칙이 3개 이상 생길 때
  - 해당 디렉토리 전용 fixture / QA loop / gold standard가 생길 때
- 위임 규칙:
  - 하위 문서는 상위 문서를 반복하지 않는다.
  - 하위 문서는 delta만 적는다.
  - repo-wide 사실과 충돌이 생기면 하위 문서를 덮어쓰지 말고 루트 `AGENTS.md`를 먼저 갱신한다.
