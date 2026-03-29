# Test Flow 구현 계획

---

## 사전 구현 요구사항 — 카드 타입 시스템

> **이 섹션은 Phase 0 착수 이전에 완료해야 하는 랜딩 측 구현 항목이다.**
> Test Flow Phase 1 이상은 variant registry에서 `cardType` 컬럼을 읽는 것을
> 전제하므로, 카드 타입 시스템 구현이 선행되지 않으면 Phase 2 registry
> 인터페이스 설계가 불완전해진다.

### 배경

`available` | `unavailable` | `hide` | `opt_out` | `debug` 5종 카드 타입
분류가 결정되었으나 현재 코드베이스에는 구현되지 않은 상태다.

- **요구사항 SSOT**: `docs/req-landing.md` §2(Terms), §13.9(Opt-out Card Contract)
- **데이터 소스 계약**: `docs/req-test.md` §2.5(카드 타입 계약)

### 구현 대상

| 산출물 | 내용 | 참조 |
|---|---|---|
| `cardType` 컬럼 인식 | `raw-fixtures.ts` 및 `adapter.ts`가 `cardType` 5종 값을 인식하도록 갱신 | req-landing.md §2 |
| `normalizeLandingCards()` 갱신 | `hide`, `debug` 카드를 카탈로그에서 제외. production 환경에서 `debug` → `hide`와 동일 처리 | req-landing.md §2 |
| consent 기반 필터링 | `available` 카드: Disagree All 시 비노출. `opt_out` 카드: consent 상태와 무관하게 항상 노출. `unavailable` 카드: consent 상태와 무관하게 badge 노출 유지 | req-landing.md §13.9 |
| `unavailable: boolean` 레거시 필드 호환 | `true` → `cardType: 'unavailable'`로 해석 | req-test.md §2.5 |
| 관련 unit/e2e/QA 스크립트 갱신 | `check-phase5-card-contracts.mjs`, `landing-card-contract.test.ts`, `grid-smoke.spec.ts` 등 5종 카드 타입 계약 반영 | — |

### 완료 조건

- [ ] `normalizeLandingCards()`가 `hide`, `debug` 카드를 카탈로그에서 제외함
- [ ] Disagree All 상태에서 `available` 카드 0건, `opt_out` 카드 정상 노출을
  자동으로 검증하는 단언이 존재함
- [ ] `qa:gate:once` GREEN 유지
- [ ] `docs/req-test.md` §2.5 `cardType` 계약과 코드베이스 구현이 정합함
- [ ] default 상태 + available 카드 진입 시 consent 게이트가 발동하고, Agree → 정상 진행 / Disagree 최종 확인 → 차단·복귀의 동작이 자동으로 검증하는 단언이 존재함
- [ ] opt_out 카드 진입 시 consent 게이트가 발동하지 않음이 자동으로 검증되는 단언이 존재함

### 랜딩 QA Gate 재통과 범위

이 구현은 랜딩 카드 계약을 변경하므로 아래 항목의 재통과가 필요하다:
- blocker #13 (`assertion:B13-handoff-enterable-only`): `available` + `opt_out`
  카드가 handoff 대상인지 확인 필요
- `check-phase5-card-contracts.mjs`: 5종 타입 반영
- `landing-card-contract.test.ts`: unavailable test 카드 fixture 2장의 위상 재확인
- §13.10 consent 게이트: 신규 e2e 단언 추가 대상.
  instruction overlay와 consent UI 동시 표시 시나리오를 blocker-traceability.json에 신규 blocker로 등록 여부를 구현 시 결정한다.

> **blocker #13 주의**: `handoff-enterable-only` 단언은 `available` + `opt_out`
> enterable 카드를 handoff 대상으로 본다. 기존 available-only 단언은 본 변경셋에서
> enterable 기준으로 동기화한다.

> **instruction + gate blocker 결정 규칙**: `qa:gate:once` 안에서 instruction overlay와
> consent gate 공존이 독립 `@smoke assertion:*` 시나리오로 분리될 때만 신규 blocker를
> 발급한다. 현재 결정은 신규 blocker 미발급이며, 공존 검증은 consent-gate smoke
> coverage 안에 유지한다.

---

> **기준 문서**: `docs/req-test.md` (이하 요구사항)  
> **구성**: Phase 전체 요약 (Phase 0~11) → Phase 0 선결 조건 → Phase 1 세부 계획 → Phase 2·3 예비 요약 → Phase Entry Gates (Phase 4·9·11 착수 전 확인)
> **원칙**: 이 문서만으로 구현 착수 가능 수준. 구현 방식 결정은 구현자 재량이며, 요구사항이 명시한 계약과 검증 기준을 충족하는 한 어떤 접근도 허용.

---

## Part 1 — 전체 Phase 요약 (Phase 0~11, 총 12단계)

| Phase | 핵심 목표 | 주요 산출물 | 전제 Phase |
|---|---|---|---|
| **0** | 착수 전 ADR 확정 (Phase 1 착수 차단 조건) | ADR-A: `src/features/test` 분리 + `test-question-client.tsx` clean-room ADR 확정. ADR-B: Storage Key 네이밍 + 5개 상태 플래그 계약 + variant-scope 격리 전략. ADR-E: Representative variant 범위 + QA baseline 정비 + `qa:gate:once` GREEN 복구 | — |
| **1** | Domain Foundation | 타입 정의, schema-driven 도출 모델, pure 함수 | **0** |
| **2** | Data Source & Sync Layer | variant-registry 인터페이스, cross-sheet 검증, lazy validation + 캐싱 | 1 |
| **3** | Storage · Session Lifecycle · Data Volatility | storage 추상 레이어, active run 판정, 5개 상태 플래그, 3가지 휘발 트리거 | 1, 2 |
| **4** | Entry Path · Staged Entry · Invalid Variant Recovery | 3-경로 분류기, staged entry lifecycle, 에러 복구 페이지 | 1, 2, 3 |
| **5** | Instruction Gate · Runtime Entry Commit | instruction overlay (비-라우트), `instructionSeen` lifecycle, commit 도메인 이벤트 | 1, 2, 3, 4 |
| **6** | Question Runtime Core | 응답 루프, tail reset, result-entry eligibility 즉시 반영 | 1, 2, 3, 4, 5 |
| **7** | Derivation · Loading Screen | scoreStats/derivedType 계산, 5초 최소 로딩 AND 조건, back-from-loading | 1, 2, 3, 6 |
| **8** | Result URL Payload · Validation | URL 구조, base64 인코딩, payload 검증 실패 경로 | 1 |
| **9** | Result Page · Content Fallback | 케이스 매트릭스(1/2/4), mandatory/optional 섹션, content fallback | 7, 8 |
| **10** | Error States · Terminal Exclusivity · Cleanup Set | commit-failure / derivation-failure taxonomy, §8.1 전이 테이블, §8.3 cleanup 원자성 | 5, 6, 7 |
| **11** | Telemetry Skeleton · Release Gate | §9.1 hook 6개, traceability closure (blocker 1~30 매핑) | 전체 |

---

## Part 2 — Phase 0: 착수 전 필수 선결 조건

> **Phase 0은 구현 Phase가 아니다.** Phase 1 착수 이전에 아래 세 ADR이 모두 완료 상태여야 한다.  
> 어느 하나라도 미완료 상태에서 Phase 1 파일을 생성하면 안 된다.
> 이 Part 자체가 Phase 0 착수 게이트의 canonical summary이며, `docs/project-analysis.md`는 현재 상태와 운영 해석을 보강하는 문서로 취급한다.

### ADR-A — `src/features/test` 네임스페이스 분리 + `test-question-client.tsx` clean-room 교체

현재 워크트리에서는 canonical test runtime이 `src/features/test/*`로 이동했고, route/unit/QA consumer도 모두 이 경로를 기준으로 본다. 이 cutover는 병행 경로 추가가 아니라 기존 `src/features/landing/test/*` 구현 파일 제거까지 끝난 상태이며, shim/alias도 남아 있지 않다. Phase 0에서는 clean-room implementation 자체를 수행하지 않으며, ADR-A의 완료 의미는 **clean-room 범위, 타이밍, 인터페이스를 문서로 확정했다는 뜻**이다. 현재 구현은 provisional runtime으로 유지된다.

**완료 조건**:
- [x] `src/features/test` 디렉토리 분리 범위 결정 및 문서화
- [x] test 런타임 파일의 `src/features/test/` 이관 대상 목록 확정 및 cutover 완료
- [x] `test-question-client.tsx` clean-room 교체 범위 및 타이밍 ADR 확정
- [x] Phase 1 T1-1~T1-7 파일이 생성될 디렉토리 경로 결정

**결정 요약**:
- Phase 0에서는 `src/features/test/test-question-client.tsx`, `src/features/test/question-bank.ts`, `src/app/[locale]/test/[variant]/page.tsx`를 수정 대상으로 취급하지 않으며, 소스 코드 변경도 하지 않는다.
- 위 세 파일은 legacy compatibility shell로 간주하고, 경계 고정은 코드가 아니라 `docs/req-test-plan.md`와 `docs/project-analysis.md`의 문서 계약으로만 수행한다.
- clean-room 구현은 Phase 1 첫 변경셋 소유다.
- Phase 1 T1-1~T1-7 순수 도메인 산출물의 canonical 위치는 `src/features/test/domain/`으로 고정한다. 파일 네이밍은 `types.ts`, `validate-variant.ts`, `validate-question-model.ts`, `validate-variant-data-integrity.ts`, `derivation.ts`, `type-segment.ts`, `index.ts`를 기준으로 유지한다.
- `src/features/test/domain/index.ts`는 Phase 1 pure domain의 유일한 public surface로 간주한다. `question-bank.ts`, `test-question-client.tsx`, route page는 Phase 1에서 이 public surface를 소비하지 않아도 된다.
- `VariantId` 브랜드 타입은 `type VariantId = string & { readonly __brand: 'VariantId' }` 형태의 string intersection으로 구현한다. object-wrapping 방식은 Phase 3 storage key prefix(`test:${variant}:...`)와 타입 수준에서 충돌하므로 금지한다.
- `QuestionIndex` 브랜드 타입은 `type QuestionIndex = number & { readonly __brand: 'QuestionIndex' }` 형태의 number intersection으로 구현한다. 동일 이유로 object-wrapping 방식은 금지한다.
- `AxisCount` 브랜드 타입은 `type AxisCount = (1 | 2 | 4) & { readonly __brand: 'AxisCount' }` 형태로 구현한다. 단, `AxisCount`는 storage key prefix에 직접 사용되지 않으므로 위 두 타입과 달리 object-wrapping 금지 이유가 다르다 — 리터럴 유니온 제약을 타입 수준에서 유지하기 위함이다. 테스트 픽스처에서 숫자 리터럴 `1`, `2`, `4`를 이 타입으로 전달할 때는 `1 as AxisCount`와 같은 타입 단언이 필요하다. 이는 구현 오류가 아니라 branded literal union의 정상 사용 패턴이다.
- canonical semantic variant gate는 `validateVariant(input: unknown, registeredVariants: VariantId[], availableVariants: VariantId[]): VariantValidationResult`로 고정한다.
- `validateVariant()`의 `UNAVAILABLE` 판정 기준은 "registered에는 있으나 available에는 없음"으로 고정한다.
- `VariantValidationResult = { ok: true; value: VariantId } | { ok: false; reason: 'MISSING' | 'UNKNOWN' | 'UNAVAILABLE' }` shape는 Phase 1에서 구현만 하며 변경하지 않는다. shape 변경은 새 ADR 대상이다.
- `question-bank.ts`의 unknown variant generic fallback 제거와 recovery page 연결은 Phase 4 첫 커밋에서 함께 수행한다.

**후속 구현 경계**:
- malformed variant `notFound()`와 unknown variant generic fallback은 현행 runtime 동작으로 남아 있다.
- same-route recoverable invalid-variant는 아직 구현되지 않았으며, 그 부재는 Phase 0 미완료가 아니라 Phase 4 invalid-variant recovery 산출물의 소유 경계로 본다.
- 따라서 Phase 1에서 `validateVariant()` pure contract를 도입하더라도 runtime same-route recovery wiring은 Phase 4까지 연결하지 않는다.
- Phase 0 closure review에서는 `docs/blocker-traceability.json`의 blocker 27/28 entry에 대해 file path와 evidence kind를 점검했고, stale이 아니어서 registry JSON은 그대로 유지한다.

### ADR-B — Storage Key 네이밍 + 5개 상태 플래그 계약

현재 changeset에서는 storage topology를 문서로만 고정한다. 런타임 key migration은 수행하지 않는다.

**완료 조건**:
- [x] `derivation_in_progress`, `derivation_computed`, `min_loading_duration_elapsed`, `result_entry_committed`, `result_persisted` 5개 플래그의 storage key reserved segment 확정
- [x] `VariantId`를 storage key prefix로 사용하는 variant-scope 격리 전략 확정
- [x] cleanup set 원자성 보장을 위한 key 그룹핑 구조 결정
- [x] ADR 문서 작성 완료

**결정 요약**:
- storage prefix는 `test:{variant}:...`로 고정한다.
- cleanup bundle은 반드시 variant-scoped prefix 내부에서만 정리한다.
- 5개 future flag는 `test:{variant}:flag:{flagName}` reserved segment로 선언한다.

### ADR-E — Representative Variant 범위 + QA Baseline 정비

representative test route anchor의 single source of truth는 `tests/e2e/helpers/landing-fixture.ts`의 `PRIMARY_AVAILABLE_TEST_VARIANT`다. local-only baseline 정책과 mixed-evidence blocker registry(`automated_assertion` / `scenario_test` / `manual_checkpoint`)는 이 anchor를 기준으로 유지한다. combined theme label은 메시지 JSON의 의도값인 `Language ⋅ Theme` 계열로 고정했고, 관련 스냅샷 baseline까지 현재 워크트리에 맞게 갱신했다.

**완료 조건**:
- [x] representative route anchor single source(`PRIMARY_AVAILABLE_TEST_VARIANT`)와 `theme-matrix-manifest.json` 대표 케이스 유지 기준이 본 ADR-E 요약에 반영되어 있음
- [x] baseline PNG는 로컬 QA 자산이며 Git tracked completeness를 완료 조건으로 보지 않음을 문서화
- [x] Safari ghosting baseline 디렉토리 유지 범위를 local QA 기준으로 기록
- [x] test flow 신규 settle recipe 케이스 추가 시 manifest + local baseline 갱신 기준 문서화
- [x] `qa:gate:once` GREEN 복구 완료

**상태 요약**: ADR-E는 완료다.

### Phase 0 완료 게이트

아래 세 ADR 모두 완료된 경우에만 Phase 1 착수를 허용한다.

| ADR | 완료 여부 |
|---|---|
| ADR-A: 네임스페이스 분리 + clean-room ADR | done (scope/timing/interface freeze 완료, runtime 교체는 Phase 1 첫 변경셋 소유) |
| ADR-B: Storage Key + 5개 플래그 계약 | done |
| ADR-E: Representative Variant 범위 + QA Baseline 정비 | done (`qa:gate:once` GREEN) |

---

## Part 3 — Phase 1 세부 구현 계획

### 개요

**목적**: 이후 모든 런타임 로직의 타입 전제를 확립한다.  
**포함 요구사항 섹션**: §3.1, §3.2, §3.8, §3.11, §6.2  
**출력 형태**: 코드 산출물은 타입 정의와 pure 함수만. 부수효과(storage, 라우팅, UI 렌더링) 없음.  
**완료 조건**: 아래 태스크 전부 + 릴리스 블로커 #7, #11, #12, #27 자동 단언 매핑 완료.

---

### 태스크 목록

#### T1-1 — Core Entity 타입 정의

**목적**: §3.1, §3.8에서 명시된 core entity를 코드 상 명확한 타입으로 고정한다.

**구현 범위**:

```typescript
// 변경 없는 타입
QuestionIndex   // 1-based 숫자 brand type
VariantId       // string brand type
AxisCount       // 1 | 2 | 4
SectionId       // string (supportedSections 항목 식별자)

// 신규/변경 타입
QuestionType = 'scoring' | 'profile'

ScoringMode = 'binary_majority' | 'scale'
// 현재 구현 대상: 'binary_majority'만.
// 'scale'은 타입 예약 상태. validateVariantDataIntegrity에서 'scale' 선언 시 blocking error 반환.

AxisSpec = {
  poleA: string
  poleB: string
  scoringMode: ScoringMode  // default: 'binary_majority'
}

Question = {
  index: QuestionIndex        // 1-based, 불변
  poleA: string
  poleB: string
  questionType: QuestionType  // 'scoring' | 'profile'
  // 축 소속(scoring): poleA+poleB 쌍이 schema.axes 중 동일 쌍과 일치하는 항목으로 결정
  // profile 문항은 axis 귀속 없음
  // 표시용 텍스트는 별도 i18n 레이어 — 이 타입에 포함하지 않음
}

// 응답 저장 타입 (변경 없음)
// Map<QuestionIndex, string>: 선택된 pole 문자열 직접 저장
// scoring question: axis pole값 (e.g., 'E' 또는 'I')
// profile question: qualifier pole값 (e.g., 'm' 또는 'f')

QualifierFieldSpec = {
  key: string              // qualifier 식별자 (e.g., 'sex')
  questionIndex: QuestionIndex  // 이 qualifier 값을 제공하는 profile 문항의 index
  values: string[]         // 허용 응답값 목록 (e.g., ['m', 'f'])
  tokenLength: number      // type segment에서 이 qualifier가 차지하는 문자 수 (일반적으로 1)
}

AxisScoreStat = {
  poleA: string
  poleB: string
  counts: Record<string, number>  // e.g., { 'E': 7, 'I': 3 }
  dominant: string                 // counts 기준 다수 pole
}

ScoreStats = Record<string, AxisScoreStat>
// key: axisId = poleA + poleB (scoring axis만. profile 문항 응답 포함하지 않음)
// key 순서는 schema.axes 선언 순서와 일치

DerivedType = string  // 길이 = axisCount, 각 위치 = schema.axes 순서 매핑

// type segment 구조
// typeSegment = derivedType(길이=axisCount) + qualifier토큰들(qualifierFields 순서대로)
// 전체 길이 = axisCount + sum(qualifierFields[i].tokenLength)
// qualifierFields 없음/빈 배열 → 길이 = axisCount (MBTI 등)

ScoringSchema = {
  variantId: VariantId
  scoringSchemaId: string         // URL에 노출하지 않음 (§5.1 불변식)
  axisCount: AxisCount
  axes: AxisSpec[]                // ordered, 길이 = axisCount, scoring axes만
  supportedSections: SectionId[]
  qualifierFields?: QualifierFieldSpec[]  // 없거나 빈 배열 = qualifier 없음
}

VariantSchema = {
  variant: VariantId
  schema: ScoringSchema
  questions: Question[]           // scoring + profile 문항 모두 포함. 실행 순서 소스
}

ResultPayload = {
  scoreStats: ScoreStats    // scoring axis만 포함
  shared: boolean
}
```

**브랜드 타입 구현 제약**:
- `VariantId`는 반드시 `string & { readonly __brand: 'VariantId' }` 형태의 intersection brand로 구현한다.
- `QuestionIndex`는 반드시 `number & { readonly __brand: 'QuestionIndex' }` 형태의 intersection brand로 구현한다.
- object wrapper, class wrapper, `{ value: ... }` 구조는 금지한다. brand 캐스팅은 domain 내부 helper로 제한하고 산발적 `as` 남용을 피한다.

**검증 기준**:
- `ScoringSchema.axes` 배열 길이가 `axisCount`와 다르면 T1-4 차단.
- `DerivedType` 길이 = `axisCount` — 생성 함수에서 검증.
- 동일 poleA+poleB 쌍이 `schema.axes` 내에서 중복되면 안 된다 — T1-4에서 검증.
- `qualifierFields`의 `questionIndex`는 반드시 `questionType === 'profile'`인 문항을 가리켜야 한다 — T1-4에서 검증.
- `qualifierFields` 내 `key` 중복 없음 — T1-4에서 검증.

---

#### T1-2 — Variant Resolution 계약 (pure 함수)

**목적**: §3.2에서 명시된 "variant 입력 검증 → 성공/실패 분기" 경계를 pure 함수로 확립한다.

**구현 범위**:

```
validateVariant(
  input: unknown,
  registeredVariants: VariantId[],
  availableVariants: VariantId[]
): VariantValidationResult

type VariantValidationResult =
  | { ok: true; value: VariantId }
  | { ok: false; reason: 'MISSING' | 'UNKNOWN' | 'UNAVAILABLE' }
```

> 위 시그니처와 union shape는 Phase 0 ADR-A에서 canonical contract로 고정한다. Phase 1 구현은 이 shape를 변경하지 않으며, Phase 4의 invalid-variant recovery wiring은 이 exact union을 소비한다. shape 변경이 필요하면 새 ADR을 연다.

**계약**:
- `input`이 null/undefined/빈 문자열이면 `ok: false; reason: 'MISSING'`.
- `input`이 registeredVariants에 없으면 `ok: false; reason: 'UNKNOWN'`.
- `input`이 registeredVariants에는 있으나 availableVariants에는 없으면 `ok: false; reason: 'UNAVAILABLE'`.
- 성공 시 `ok: true; value: VariantId`.
- 이 함수는 session/run context를 생성하거나 부수효과를 일으키지 않는다.
- Phase 4 에서 이 결과를 소비해 경로 분기를 수행한다 (`ok: false` → §6.1 에러 복구 페이지).
- MISSING 판정 기준:input이 null, undefined, 또는 빈 문자열('')인 경우
- UNKNOWN 판정 기준:input이 non-empty string이지만 registeredVariants에 없는 경우
- UNAVAILABLE 판정 기준:registeredVariants에는 있으나 availableVariants에는 없는 경우
- 비-string 타입 입력(number, object 등) 처리: **MISSING으로 처리한다.**
  URL 세그먼트는 항상 string이므로 비-string 입력은 사용자의 잘못된 URL이
  아니라 코드 버그다. 에러 복구 페이지에서 MISSING 계열 메시지("테스트를
  찾을 수 없습니다")를 표시하는 것이 자연스럽다.
  런타임에서 Next.js App Router가 route segment를 string으로 강제하므로
  이 분기는 주로 unit test fixture와 내부 호출 방어선으로 기능한다.
---

#### T1-3 — Question Model 검증 (pure 함수)

**목적**: §3.8에서 명시된 불변식을 검증하는 pure 함수를 확립한다.

**불변식 체크리스트 (question 단위)**:

*공통 (questionType 무관)*:
1. 각 question은 `poleA`, `poleB`, `questionType`, `index` 필드를 모두 가져야 한다.
2. `poleA`와 `poleB`는 서로 달라야 한다 (`poleA ≠ poleB`).
3. 각 question의 `index`는 1-based이며, 동일 variant 내 중복이 없어야 한다.

*scoring question 전용*:
4. `poleA`+`poleB` 쌍이 `schema.axes` 중 정확히 1개와 일치해야 한다. 0개 또는 2개 이상 일치 시 위반.

*profile question 전용*:
5. axis 귀속 요구 없음. `poleA`+`poleB` 쌍이 `schema.axes`와 일치하지 않아도 통과.

```typescript
validateQuestionModel(
  questions: Question[],
  schema: ScoringSchema
): QuestionModelValidationResult

type QuestionModelValidationResult =
  | { ok: true; value: Question[] }
  | { ok: false; reason: 'QUESTION_MODEL_VIOLATION'; detail?: string }
```

> `validateVariant()`와 `validateQuestionModel()`은 실패 사유의 도메인이 다르므로 동일한 범용 `ValidationResult<T>`를 재사용하지 않는다. variant 입력 검증은 `VariantValidationResult`, question 모델 불변식 검증은 `QuestionModelValidationResult`를 각각 별도 사용한다.
> scoring question의 axis 매핑 검증(불변식 4)은 schema 참조가 필요하므로 `schema`를 인자로 추가한다. profile question은 schema 참조 없이 검증 가능하나 동일 함수 시그니처로 통일한다.

---

#### T1-4 — Blocking Data Error 검증 (pure 함수)

**목적**: §6.2의 blocking data error 조건을 variant 로드 시점에 검증하는 pure 함수를 확립한다.

**차단 조건 (하나라도 해당 시 `BlockingDataError` 반환)**:

```typescript
type BlockingDataErrorReason =
  | 'EMPTY_QUESTION_SET'
  | 'QUESTION_MODEL_VIOLATION'
  | 'EVEN_AXIS_QUESTION_COUNT'       // odd-count rule 위반 (binary_majority scoring axis에만 적용)
  | 'AXIS_COUNT_SCHEMA_MISMATCH'     // axes 배열 길이 ≠ axisCount
  | 'DUPLICATE_AXIS_SPEC'            // schema.axes 내 동일 poleA+poleB 쌍 중복
  | 'UNSUPPORTED_SCORING_MODE'       // 'scale' 등 미구현 scoringMode 선언
  | 'QUALIFIER_QUESTION_NOT_FOUND'   // qualifierFields의 questionIndex에 해당하는 문항 없음
  | 'QUALIFIER_QUESTION_NOT_PROFILE' // qualifierFields의 questionIndex가 scoring 문항을 가리킴
  | 'DUPLICATE_QUALIFIER_KEY'        // qualifierFields 내 key 중복
  | 'QUALIFIER_SPEC_INVALID'    // values 빈 배열, tokenLength<=0, 또는 values[i].length !== tokenLength
  | 'DUPLICATE_QUALIFIER_VALUE' // values 배열 내 중복 값 존재

validateVariantDataIntegrity(
  schema: VariantSchema
): { ok: true } | { ok: false; reason: BlockingDataErrorReason; detail?: string }
```

**Odd-count rule 구현 세부 (binary_majority scoring axis에만 적용)**:
```typescript
function checkOddCountRule(
  questions: Question[],
  axes: AxisSpec[]
): { ok: true } | { ok: false; axisId: string; count: number } {
  // binary_majority scoring 문항만 필터링
  const scoringQuestions = questions.filter(
    q => q.questionType === 'scoring'
  )
  for (const axis of axes) {
    if (axis.scoringMode !== 'binary_majority') continue  // scale 등은 별도 차단
    const axisId = axis.poleA + axis.poleB
    const axisQuestions = scoringQuestions.filter(
      q => q.poleA === axis.poleA && q.poleB === axis.poleB
    )
    if (axisQuestions.length % 2 === 0) {
      return { ok: false, axisId, count: axisQuestions.length }
    }
  }
  return { ok: true }
}
```

**Unsupported scoring mode 검증**:
```typescript
function checkScoringModes(axes: AxisSpec[]): { ok: true } | { ok: false; axisId: string } {
  for (const axis of axes) {
    if (axis.scoringMode !== 'binary_majority') {
      return { ok: false, axisId: axis.poleA + axis.poleB }
    }
  }
  return { ok: true }
}
```

**QualifierFields 검증**:
```typescript
function checkQualifierFields(
  qualifierFields: QualifierFieldSpec[] | undefined,
  questions: Question[]
): { ok: true } | { ok: false; reason: BlockingDataErrorReason; detail: string } {
  if (!qualifierFields || qualifierFields.length === 0) return { ok: true }
  const keys = new Set<string>()
  for (const field of qualifierFields) {
    if (keys.has(field.key)) return { ok: false, reason: 'DUPLICATE_QUALIFIER_KEY', detail: field.key }
    keys.add(field.key)
    const question = questions.find(q => q.index === field.questionIndex)
    if (!question) return { ok: false, reason: 'QUALIFIER_QUESTION_NOT_FOUND', detail: String(field.questionIndex) }
    if (question.questionType !== 'profile') return { ok: false, reason: 'QUALIFIER_QUESTION_NOT_PROFILE', detail: String(field.questionIndex) }
    // QUALIFIER_SPEC_INVALID 검증
    if (field.tokenLength <= 0)
      return { ok: false, reason: 'QUALIFIER_SPEC_INVALID', detail: `${field.key}: tokenLength must be > 0` }
    if (field.values.length === 0)
      return { ok: false, reason: 'QUALIFIER_SPEC_INVALID', detail: `${field.key}: values is empty` }
    for (const v of field.values) {
      if (v.length !== field.tokenLength)
        return { ok: false, reason: 'QUALIFIER_SPEC_INVALID', detail: `${field.key}: value "${v}" length ${v.length} !== tokenLength ${field.tokenLength}` }
    }
    // DUPLICATE_QUALIFIER_VALUE 검증
    const valueSet = new Set<string>()
    for (const v of field.values) {
      if (valueSet.has(v))
        return { ok: false, reason: 'DUPLICATE_QUALIFIER_VALUE', detail: `${field.key}: duplicate value "${v}"` }
      valueSet.add(v)
    }
  }
  return { ok: true }
}
```

---

#### T1-5 — Derivation Model (pure 함수)

**목적**: §3.11의 schema-driven derivation 계약을 pure 함수로 구현한다. UI, 라우팅, storage 의존 없음.

**구현 범위**:

```typescript
// Step 1: scoring 문항 응답에서 axis별 점수를 집계 → ScoreStats 구성
computeScoreStats(
  questions: Question[],
  responses: Map<QuestionIndex, string>,
  schema: ScoringSchema
): ScoreStats | { error: 'INCOMPLETE_SCORING_RESPONSES' | 'UNMATCHED_QUESTION' }

// Step 2: ScoreStats에서 derivedType 토큰 생성
deriveDerivedType(
  scoreStats: ScoreStats,
  schema: ScoringSchema
): DerivedType | { error: 'AXIS_NOT_FOUND' | 'TOKEN_LENGTH_MISMATCH' }
```

**`computeScoreStats` 계약**:
- `questions[]`에서 `questionType === 'scoring'`인 문항만 필터링해 처리한다. profile 문항은 완전히 무시한다.
- 필터링 후 scoring 문항 수 = `scoringQuestions.length`이어야 한다. `responses`의 scoring 문항 응답 완료 여부는 `scoringQuestions`를 기준으로 검증한다.
- `scoringQuestions`의 각 index에 대한 응답이 `responses`에 없으면 `INCOMPLETE_SCORING_RESPONSES` 반환.
- `schema.axes`를 선언 순서대로 순회한다.
- 각 `AxisSpec { poleA, poleB }`에 대해 `axisId = poleA + poleB`를 파생한다.
- 해당 axis 소속 scoring 문항: 필터링된 scoring 문항 중 `q.poleA === axis.poleA && q.poleB === axis.poleB`인 항목.
- 응답이 `poleA`도 `poleB`도 아닌 값이면 `UNMATCHED_QUESTION` 반환.
- `counts` 집계 후 더 높은 카운트 pole을 `dominant`로 결정.
- 결과: `scoreStats[axisId] = { poleA, poleB, counts, dominant }`.
- MBTI 문자를 하드코딩하지 않는다. axisCount 1/2/4 모두 동일 함수로 처리.

**`deriveDerivedType` 계약 (변경 없음)**:
- `schema.axes` 선언 순서대로 각 axis의 `scoreStats[axisId].dominant`를 연결한다.
- `axisId`가 `scoreStats`에 없으면 `AXIS_NOT_FOUND` 반환.
- 생성된 토큰 길이가 `schema.axisCount`와 불일치하면 `TOKEN_LENGTH_MISMATCH` 반환.

**예시 (axisCount=4, MBTI 기준)**:
```typescript
schema.axes = [
  { poleA: 'E', poleB: 'I' },
  { poleA: 'S', poleB: 'N' },
  { poleA: 'T', poleB: 'F' },
  { poleA: 'J', poleB: 'P' }
]
// responses: { 1→'I', 2→'N', 3→'N', 4→'E', ... }
// scoreStats['EI'] = { ..., counts: {E:4, I:5}, dominant: 'I' }
// scoreStats['SN'] = { ..., counts: {S:8, N:9}, dominant: 'N' }
// scoreStats['TF'] = { ..., counts: {T:6, F:11}, dominant: 'F' }
// scoreStats['JP'] = { ..., counts: {J:10, P:7}, dominant: 'J' }
// derivedType = "INFJ"
```

**EGTT 예시 (axisCount=1)**:
```typescript
// scoring 문항만 필터링 후 처리 (Q1 profile 문항은 제외)
// schema.axes = [{ poleA: 'e', poleB: 't', scoringMode: 'binary_majority' }]
// scoringQuestions = questions.filter(q => q.questionType === 'scoring')
// scoreStats['et'] = { ..., counts: { e:15, t:10 }, dominant: 'e' }
// derivedType = 'e'
```

---

#### T1-6 — Type Segment 인코딩/파싱 (pure 함수)

**목적**: §5.1의 `type` segment 인코딩과 파싱 계약을 pure 함수로 확립한다. Phase 8 URL 인코딩/디코딩 구현의 전제.

**구현 범위**:

```typescript
// type segment 파싱 (result URL 수신 시 사용)
parseTypeSegment(
  typeSegment: string,
  schema: ScoringSchema
):
  | { ok: true; derivedType: string; qualifiers: Record<string, string> }
  | { ok: false; reason: 'LENGTH_MISMATCH' | 'INVALID_QUALIFIER_VALUE' }

// type segment 생성 (result URL 생성 시 사용)
buildTypeSegment(
  derivedType: string,
  responses: Map<QuestionIndex, string>,
  schema: ScoringSchema
):
  | { ok: true; typeSegment: string }
  | { ok: false; reason: 'QUALIFIER_RESPONSE_MISSING' | 'INVALID_QUALIFIER_VALUE' }
```

**`parseTypeSegment` 계약**:
```typescript
function parseTypeSegment(typeSegment, schema) {
  const qualifierFields = schema.qualifierFields ?? []
  const expectedLength = schema.axisCount + qualifierFields.reduce((sum, f) => sum + f.tokenLength, 0)
  if (typeSegment.length !== expectedLength) return { ok: false, reason: 'LENGTH_MISMATCH' }

  const derivedType = typeSegment.slice(0, schema.axisCount)
  const qualifiers: Record<string, string> = {}
  let cursor = schema.axisCount

  for (const field of qualifierFields) {
    const value = typeSegment.slice(cursor, cursor + field.tokenLength)
    if (!field.values.includes(value)) return { ok: false, reason: 'INVALID_QUALIFIER_VALUE' }
    qualifiers[field.key] = value
    cursor += field.tokenLength
  }

  return { ok: true, derivedType, qualifiers }
}
```

**`buildTypeSegment` 계약**:
```typescript
function buildTypeSegment(derivedType, responses, schema) {
  const qualifierFields = schema.qualifierFields ?? []
  let typeSegment = derivedType

  for (const field of qualifierFields) {
    const value = responses.get(field.questionIndex)
    if (value === undefined) return { ok: false, reason: 'QUALIFIER_RESPONSE_MISSING' }
    if (!field.values.includes(value)) return { ok: false, reason: 'INVALID_QUALIFIER_VALUE' }
    typeSegment += value
  }

  return { ok: true, typeSegment }
}
```

**MBTI 검증 (qualifierFields 없음)**:
- `parseTypeSegment('infj', mbtiSchema)` → `{ ok: true, derivedType: 'infj', qualifiers: {} }`
- expectedLength = 4 + 0 = 4. `'infj'.length === 4` → 통과.

**EGTT 검증 (qualifierFields 1개)**:
- `parseTypeSegment('em', egttSchema)` → `{ ok: true, derivedType: 'e', qualifiers: { sex: 'm' } }`
- expectedLength = 1 + 1 = 2. `'em'.length === 2` → 통과.
- `parseTypeSegment('ex', egttSchema)` → `{ ok: false, reason: 'INVALID_QUALIFIER_VALUE' }` ('x' ∉ ['m','f'])
- `parseTypeSegment('e', egttSchema)` → `{ ok: false, reason: 'LENGTH_MISMATCH' }` (길이 1 ≠ 2)

---

#### T1-7 — Payload Schema 타입 정의 (Phase 8 전제 확립)

**목적**: §5.1 Self-contained Payload 구조를 Phase 8에서 일관되게 참조할 수 있도록 canonical 타입 참조와 URL 계약을 확정한다. `ResultPayload` 타입의 canonical definition은 **T1-1**에서 유지하며, 본 태스크에서는 이를 재정의하지 않는다.

```
//canonical type definition: T1-1의 ResultPayload 사용
ResultPayload = {
  scoreStats: ScoreStats
  shared: boolean
}

// URL 구조 (§1.3 Locked Decisions, §5.1)
// /result/{variant}/{type}?{base64Payload}
// scoringSchemaId는 URL 어느 위치에도 포함하지 않음
// variant 하나로 schema를 유일하게 식별
```

**T1-7 구현 산출물 범위**:
- `ResultPayload`의 canonical definition은 `types.ts`에만 둔다. 이 파일에서 재선언하지 않는다.
- T1-7의 실질적 코드 산출물은 `index.ts` 조립이다. `src/features/test/domain/index.ts`에서 T1-1~T1-6의 타입과 순수 함수를 모아 Phase 1 public surface를 구성한다.
- `index.ts`에서 export할 대상: 모든 타입(T1-1), `validateVariant` (T1-2), `validateQuestionModel` (T1-3), `validateVariantDataIntegrity` (T1-4), `computeScoreStats` · `deriveDerivedType` (T1-5), `parseTypeSegment` · `buildTypeSegment` (T1-6).
- `index.ts`에서 export하지 않을 대상: 내부 helper 함수(`checkOddCountRule`, `checkScoringModes`, `checkQualifierFields` 등).

---

### 단위 테스트 요구사항

Phase 1은 pure 함수만 포함하므로 100% 단위 테스트 커버리지 목표.

| 테스트 | 검증 내용 | 릴리스 블로커 |
|---|---|---|
| validateVariant — 누락 입력 | `ok: false; reason: 'MISSING'` | #1 |
| validateVariant — 등록된 variant | `ok: true` 반환 | #1 (간접) |
| validateVariant — 미등록 variant | `ok: false; reason: 'UNKNOWN'` | #1 |
| validateVariant — 등록됐지만 비활성 variant | `ok: false; reason: 'UNAVAILABLE'` | #1 |
| validateQuestionModel — poleA≠poleB | pass | #7 |
| validateQuestionModel — poleA=poleB | `QUESTION_MODEL_VIOLATION` | #7 |
| validateQuestionModel — poleA=poleB (동일값) | `QUESTION_MODEL_VIOLATION` | #7 |
| validateQuestionModel — index 중복 | `QUESTION_MODEL_VIOLATION` | #7 |
| odd-count rule — 홀수 배정 | pass | #12 |
| odd-count rule — 짝수 배정 | `EVEN_AXIS_QUESTION_COUNT` | #12 |
| duplicate axis spec — 중복 쌍 | `DUPLICATE_AXIS_SPEC` | #12 |
| computeScoreStats — axisCount=1 | ScoreStats entry 1개, dominant 올바름 | #11 |
| computeScoreStats — axisCount=2 | ScoreStats entry 2개, dominant 올바름 | #11 |
| computeScoreStats — axisCount=4 | ScoreStats entry 4개, dominant 올바름 | #11 |
| computeScoreStats — partial responses | `INCOMPLETE_SCORING_RESPONSES` 반환 | #11 |
| computeScoreStats — 응답값이 poleA/poleB 외 값 | `UNMATCHED_QUESTION` 반환 | #11 |
| deriveDerivedType — axisCount=1 | 토큰 길이 1 | #11 |
| deriveDerivedType — axisCount=2 | 토큰 길이 2 | #11 |
| deriveDerivedType — axisCount=4 | 토큰 길이 4 | #11 |
| deriveDerivedType — axis 순서 보장 | schema.axes 선언 순서 = 토큰 위치 순서 | #11 |
| deriveDerivedType — axisId 누락 | `AXIS_NOT_FOUND` 반환 | #11 |
| ScoreStats — counts key는 pole 문자열 | Record<string, number> key = poleA 또는 poleB | #11 |
| validateVariantDataIntegrity — 빈 questions | `EMPTY_QUESTION_SET` | #12 |
| validateVariantDataIntegrity — axes 길이≠axisCount | `AXIS_COUNT_SCHEMA_MISMATCH` | #12 |
| validateVariantDataIntegrity — 정상 schema | pass | — |
| validateQuestionModel — scoring 문항 + schema axis 일치 | pass | #7 |
| validateQuestionModel — scoring 문항 + axis 불일치 | `QUESTION_MODEL_VIOLATION` | #7 |
| validateQuestionModel — profile 문항 + axis 불일치 | pass (axis 귀속 불필요) | #7 |
| validateQuestionModel — profile 문항 + poleA=poleB | `QUESTION_MODEL_VIOLATION` | #7 |
| validateVariantDataIntegrity — scale mode axis | `UNSUPPORTED_SCORING_MODE` | #12 |
| validateVariantDataIntegrity — qualifierFields.questionIndex가 없는 index | `QUALIFIER_QUESTION_NOT_FOUND` | #27 |
| validateVariantDataIntegrity — qualifierFields.questionIndex가 scoring 문항 | `QUALIFIER_QUESTION_NOT_PROFILE` | #27 |
| validateVariantDataIntegrity — qualifierFields 중복 key | `DUPLICATE_QUALIFIER_KEY` | #27 |
| validateVariantDataIntegrity — qualifierFields.values 빈 배열 | `QUALIFIER_SPEC_INVALID` | #27 |
| validateVariantDataIntegrity — qualifierFields.tokenLength <= 0 | `QUALIFIER_SPEC_INVALID` | #27 |
| validateVariantDataIntegrity — qualifierFields.values 항목 길이 ≠ tokenLength | `QUALIFIER_SPEC_INVALID` | #27 |
| validateVariantDataIntegrity — qualifierFields.values 중복 값 | `DUPLICATE_QUALIFIER_VALUE` | #27 |
| validateVariantDataIntegrity — 정상 EGTT schema | pass | — |
| computeScoreStats — profile 문항 응답이 scoring 결과에 영향 없음 | ScoreStats에 profile axis 없음 | #11 |
| computeScoreStats — scoring 문항 미응답 (profile 응답은 있음) | `INCOMPLETE_SCORING_RESPONSES` | #11 |
| parseTypeSegment — MBTI (qualifierFields 없음) | derivedType='infj', qualifiers={} | #27 |
| parseTypeSegment — EGTT (qualifierFields 1개) | derivedType='e', qualifiers={sex:'m'} | #27 |
| parseTypeSegment — 길이 불일치 | `LENGTH_MISMATCH` | #27 |
| parseTypeSegment — qualifier 값 목록 외 값 | `INVALID_QUALIFIER_VALUE` | #27 |
| buildTypeSegment — MBTI | typeSegment='infj' | #27 |
| buildTypeSegment — EGTT | typeSegment='em' | #27 |
| buildTypeSegment — qualifier 응답 누락 | `QUALIFIER_RESPONSE_MISSING` | #27 |

---

### 구현 및 검증 순서

1. `docs/req-test-plan.md` 문서 보완을 먼저 수행한다.
2. 이 단계에서는 `docs/blocker-traceability.json`을 수정하지 않는다.
3. `src/features/test/domain/` 구현은 `types → validators → derivation → type-segment → index` 순서로 진행한다.
4. `tests/unit/` Phase 1 전용 테스트 파일을 생성하고 `npm test`로 GREEN을 먼저 확인한다.
5. 테스트 파일 경로와 assertion id가 실제로 확정된 시점에만 `docs/blocker-traceability.json`에 Phase 1 automated_assertion entry를 append 한다.
6. 최종 검증은 `npm test` 다음 `npm run qa:static` 순서로만 수행한다. 각 단계 실패 시 다음 단계로 진행하지 않는다.

### Phase 1 완료 정의 (DoD)

- [ ] T1-1~T1-7 타입 및 pure 함수 구현 완료
- [ ] 위 단위 테스트 전부 GREEN
- [ ] `tests/unit/` Phase 1 전용 테스트 파일 생성 이후에만 `docs/blocker-traceability.json`에 blocker #7, #11, #12, #27 automated_assertion entry append 완료
- [ ] `npm test` GREEN
- [ ] `npm run qa:static` GREEN
- [ ] MBTI 4축 하드코딩 없음 (axisCount 1/2/4 동일 경로 처리 확인)
- [ ] `qualifierFields` 부재 시 MBTI 기존 동작 회귀 없음 (`parseTypeSegment` + `buildTypeSegment` MBTI 케이스 통과)
- [ ] `computeScoreStats`가 profile 문항을 scoring 결과에 포함하지 않음 확인
- [ ] `scale` scoringMode 선언 variant에서 blocking error 확인
- [ ] storage, UI, 라우팅 의존 없음 (import 트리 검사)

### Cross-phase Migration Note — `question-bank.ts` fallback 제거

Phase 1 T1-2 `validateVariant()` pure 함수 구현은 canonical variant gate를 제공하지만, 해당 시점에 `question-bank.ts`의 **unknown variant → generic questions fallback** 동작을 제거하지 않는다.

- **현재 동작**: unknown variant가 유입되면 generic 문항을 fallback으로 제공 → req-test.md AR-001 계약과 역방향 충돌
- **목표 동작**: unknown/invalid variant → `validateVariant()` ok:false → §6.1 에러 복구 페이지 이동. session/run context 미생성.
- **Phase 1 경계**: T1-2는 pure contract와 unit test만 추가한다. runtime 분기는 바꾸지 않는다.
- **제거 타이밍**: Phase 4 첫 커밋. recovery page wiring과 함께 수행한다.
- **미이행 시 리스크**: Phase 4 진입 경로 분류기 구현 시 기존 fallback 동작과 AR-001 계약이 충돌. blocker #1 자동 단언 매핑 불가.

---

## Part 4 — Phase 2 예비 요약 (Data Source & Sync Layer)

> Phase 1 완료 전에 본 섹션을 확인한다. 아래는 Phase 2 착수 전 결정사항과 산출물 요약이다.

### ⚠️ Phase 2 착수 전 미결 설계 결정 (ADR 신호)

아래 항목은 Phase 2 착수 전에 결정 및 ADR 기록이 완료되어야 한다.  
결정 없이 Phase 2 구현을 시작하면 안 된다.

| # | ADR 주제 | 선택지 | 결정 상태 |
|---|---|---|---|
| ADR-C | Google Sheets API 인증 방식 | Service Account vs OAuth (GitHub Action 시크릿 구성 포함) | ⬜ 미결 |
| ADR-D | `variant-registry.generated.json` 버전 관리 방식 | `.gitignore` 제외 / versioned file / 별도 아티팩트 저장소 | ⬜ 미결 |
| ADR-F | `unavailable` test card 필터링 레이어 결정 | `normalizeLandingCards()` 수정(landing-side 단독 처리) vs `loadVariantRegistry()` 소비 레이어 처리(registry-side 처리) | ⬜ 미결 |

> ⚠️ **ADR-F 선택지에 따른 Phase 2 DoD 범위 차이**: `normalizeLandingCards()` 수정(landing-side 단독 처리) 선택 시 landing Phase 코드가 변경되며, `req-landing.md §14.1` 릴리스 게이트 재통과가 Phase 2 DoD의 일부가 된다. `loadVariantRegistry()` 소비 레이어 처리(registry-side) 선택 시 landing 코드를 수정하지 않으므로 landing QA 재실행이 불필요하다.
> 모든 ADR 결정 내용은 별도 ADR 또는 ops 설계 문서에 기록한다.

### ⚠️ Phase 2 착수 전 코드 정리

`question-bank.ts`의 unknown variant → generic questions fallback 제거는 **Part 3의 `Cross-phase Migration Note — question-bank.ts fallback 제거`**를 canonical 기준으로 따른다.

- Phase 2 착수 전 확인 사항은 해당 섹션의 제거 타이밍, 목표 동작, 리스크 정의를 그대로 따른다.
- 본 Part에서는 중복 정의하지 않고, Phase 2 착수 조건으로만 참조한다.

### Phase 2 의 목적과 주요 산출물

Phase 2의 목적은 variant registry 계약, cross-sheet integrity 검증, lazy validation/caching을 하나의 데이터 접근 레이어로 정립하는 것이다.

| 산출물 | 내용 |
|---|---|
| `VariantRegistry` 타입 | `variant-registry.generated.json`의 스키마. `VariantSchema[]`, `LandingCardMeta[]`(`unavailable` 플래그 포함) 포함 |
| `loadVariantRegistry()` | 환경별 registry 파일 로딩 인터페이스. production과 dev fixture가 동일 시그니처 |
| `validateCrossSheetIntegrity(registry)` | 3개 Sheet cross-sheet 검증 pure 함수. GitHub Action 스크립트와 runtime 2차 방어선 모두에서 사용 |
| `getLazyValidatedVariant(variantId)` | 캐싱 포함 lazy validation. 첫 호출 시 `validateVariantDataIntegrity()` 실행 → 이후 캐시 반환 |
| GitHub Action 스크립트 골격 | Sheets 읽기 → cross-sheet 검증 → 성공 시 registry 파일 생성 → 커밋 트리거. sync_script.js 인터페이스 확정 |
| EGTT dev/test fixture | `axisCount=1`, `qualifierFields` 1개 구조의 dev fixture. Phase 1 EGTT schema 지원 검증 및 Phase 4 이후 진입 경로 테스트에 사용. fixture 구조는 `variant-registry.generated.json` 인터페이스와 동일해야 한다 |
| consent 기반 카드 필터링 | `cardType` 컬럼을 registry에서 읽어 consent 상태에 따라 `available` 카드 비노출(Disagree All) / opt_out 카드 항상 노출 규칙을 적용. Landing Requirements §13.9가 SSOT. |
  
### Phase 1과의 인터페이스 제약

Phase 2는 Phase 1의 `VariantSchema`를 registry 계약의 기반 타입으로 사용한다. 따라서 Phase 1 타입이 불완전하면 Phase 2의 registry/validation 레이어가 즉시 불안정해진다.

### Phase 2 완료 후 Phase 3이 안전하게 전제할 수 있는 것

Phase 3는 본 Part에서 정의한 registry/validation 계약을 전제로 착수한다. 상세 전제는 Part 5에서 다룬다.

---

## Part 5 — Phase 3 예비 요약

> Phase 1 완료 전에 이 섹션을 확인한다. Phase 3은 Phase 1, 2의 기반 위에 "상태가 저장되는 레이어"를 쌓는 Phase다.

### 목적

Phase 3는 아래 세 관심사를 **하나의 레이어**에서 함께 확립한다. 이 셋을 분리해 구현하면 Phase 4 이후 경로 분기 로직이 불완전한 storage 계약에 의존하게 되어 테스트 불가능한 상태가 생긴다. Phase 3 착수 전 Phase 2의 registry 인터페이스 확정을 전제한다.

1. **Active run 판정** (§3.7): 30분 inactivity timeout, 재진입 시점 평가, 백그라운드 타이머 불필요
2. **5개 상태 플래그 분리** (§8.2): `derivation_in_progress`, `derivation_computed`, `min_loading_duration_elapsed`, `result_entry_committed`, `result_persisted`를 단일 플래그로 뭉개지 않음
3. **3가지 응답 데이터 휘발 트리거** (§6.8): result screen entry commit 완료 / inactivity timeout 판정 / 처음부터 다시 하기 commit success — 각각 `instructionSeen` 포함/제외 범위가 다름

### 핵심 설계 결정 (Phase 3 착수 전 확정 필요)

**storage 추상 레이어 선택**:
Phase 3는 storage key 네이밍, store 구조, key 목록을 별도 구현/설계 문서에서 정의하는 것이 요구사항의 원칙 (§6.8, §8.3 구현 세부사항 위임 구절).  
**storage key ADR(ADR-B)은 Phase 0 선결 조건으로 Phase 1 착수 전에 이미 완료되어 있어야 한다.** Phase 3 착수 시 ADR-B를 참조해 storage 추상 레이어를 설계한다. ADR-B 미완료 상태에서 Phase 3를 착수하는 경우는 Phase 0 gate 위반이다.

**variant-scoped 격리**:
모든 storage 조작은 해당 variant 범위에만 영향을 준다. 다른 variant 데이터를 건드리지 않는다 (§6.8 삭제 원칙). Phase 3에서 이 격리 경계를 명확히 구조화하지 않으면 Phase 10의 cleanup set 원자성 검증이 불가능해진다.

### 주요 산출물 (예비)

| 산출물 | 내용 |
|---|---|
| `getActiveRun(variantId)` | storage에서 해당 variant의 run 조회 → 30분 경과 여부 판정 → timeout 시 §6.8 휘발 즉시 실행 후 `null` 반환 |
| `StateFlags` 읽기/쓰기 인터페이스 | 5개 플래그를 개별 접근. 단일 플래그 혼용 금지를 구조적으로 강제 |
| `volatilizeRunData(variantId, trigger)` | 3가지 트리거별로 `instructionSeen` 포함/제외 범위를 switch-case로 명확히 분기. 원자적 삭제 보장 |
| timeout fixture 테스트 | 30분 경과 fixture → timeout 처리 + Cold Start 검증. 29분 59초 fixture → active run 유효 검증 |
| cleanup set 원자성 검증 기준 | blocker #17 (Cleanup Set Atomicity) · blocker #22 (Result Derivation Loading) 자동 단언 매핑 대상. ADR-B에서 확정된 key 그룹핑 구조를 기준으로 원자적 삭제 경계를 검증한다 |

### Phase 3이 Phase 1, 2에 주는 설계 제약

Phase 1의 `VariantId` brand type이 storage key prefix로 사용된다. Phase 1에서 `VariantId`를 `string`으로 느슨하게 정의하면 Phase 3에서 격리 경계가 흐려진다. Phase 1 구현 시 `VariantId`를 brand type 또는 nominal type으로 강하게 정의해두면 Phase 3 storage 격리 구현이 타입 수준에서 강제된다.

### Phase 3 완료 후 Phase 4이 안전하게 전제할 수 있는 것

- `validateVariant` 실패 → session 생성 없이 에러 복구 페이지 이동 가능 (storage 레이어 준비됨)
- staged entry 복구 조건 검사 시 active run 유무를 storage에서 신뢰할 수 있음
- 경로 분기 판정(Direct Cold / Direct Resume / Landing Ingress)이 storage 상태를 일관되게 읽을 수 있음

---

## Gate A — Phase 4 착수 전 확인 (Entry Path · Staged Entry · Invalid Variant Recovery)

> Phase 3 완료 후, Phase 4 착수 전에 아래 세 항목을 확인한다.

#### A-1. `instructionSeen` 리셋 계약 — ADR-B 정합성 확인

- `instructionSeen:{variantId}` 키는 ADR-B에서 확정된 storage key 네이밍 규칙을 따라야 한다.
- Phase 3 cleanup set에서 `instructionSeen` 포함/제외 범위(§6.8, §8.3)가 ADR-B의 key 그룹핑 구조와 충돌 없음을 확인한다.
- 불일치 발견 시 Phase 4 착수를 멈추고 ADR-B를 갱신한 뒤 Phase 3 `volatilizeRunData()` 분기를 재확인한다. Phase 1 타입 역수정이 발생하면 안 된다.

#### A-2. Staged Entry Expiry 경계 계약 확인

- Phase 4는 landing-side의 `createdAtMs`를 **읽기 전용**으로 소비한다. landing 코드를 수정하지 않는다.
- staged entry 7분 만료 판정은 test 단에서만 수행한다.
- `createdAtMs`가 landing storage에 저장되어 있으면 Phase 4 착수 조건을 충족한 것으로 간주한다.
- 만약 `createdAtMs` 구조 변경이 필요하다고 판단되면 Phase 4 착수를 멈추고 landing 계약과의 충돌을 별도 확인한 뒤 재개한다. landing Phase QA 재실행 없이 Phase 4 구현이 완결되어야 한다.

#### A-3. Cross-phase Event Integrity 픽스처 소유권 확인

- blocker #28(`attempt_start` cross-phase integrity, `req-test.md §12.2`) 단언은 blocker #15(Landing Requirements §14.3)의 픽스처를 공유한다.
- Phase 4에서 `attempt_start` 단언을 작성하기 전에 아래를 결정한다.

| 확인 항목 | 결정 기준 |
|---|---|
| 공유 픽스처 파일 경로 | `tests/` 하위 landing fixture 경로 또는 신규 shared fixture 경로 중 하나로 확정 |
| 소유 모듈 | landing fixture가 이미 blocker #15 단언을 포함하면 Phase 4에서 import. 없으면 Phase 4에서 공유 픽스처 생성 후 blocker #15 단언도 함께 포함 |
| 픽스처 공유 확정 시점 | Phase 4 첫 번째 커밋 이전 |

#### A-4. `question-bank.ts` unknown variant generic fallback 제거 (Phase 4 첫 커밋 필수)

- **제거 대상**: `src/features/test/question-bank.ts`의 unknown variant → generic questions
  fallback 분기 코드 전체.
- **동시 처리**: `validateVariant()` (`ok: false; reason: 'UNKNOWN'`) 결과를 소비해
  `question-bank.ts` 내부가 아닌 진입 경로에서 §6.1 에러 복구 페이지로 이동시킨다.
- **Phase 1~3 동안**: 이 fallback은 AR-001 계약 위반 상태로 잔존한다.
  known deviation으로 취급하며 Phase 1~3에서 수정하지 않는다.
- **Phase 4 첫 커밋 완료 조건**: `question-bank.ts`에 fallback 분기가 존재하지 않음.
  `validateVariant()` pure contract가 runtime에 연결되어 unknown variant 직접 URL 접근 시
  에러 복구 페이지로 이동함.
- **근거**: ADR-A 결정 요약 "Phase 4 첫 커밋에서 함께 수행"을 산출물 수준으로 격상.

---

## Gate B — Phase 9 착수 전 확인 (Result Page · Content Fallback)

> Phase 8 완료 후, Phase 9 착수 전에 아래 항목을 확인한다.  
> 별도 ADR 불필요. `req-test.md` AR-003·AR-004가 SSOT이며, 아래는 착수 조건 점검 목록이다.

#### B-1. 섹션 등급 계약 확인 (AR-003 기준)

- **Mandatory 섹션**: `derived_type` · `axis_chart` · `type_desc`. `supportedSections` 선언과 무관하게 항상 렌더링.
- **Optional 섹션**: `trait_list` 등. `supportedSections`에 선언된 경우에만 렌더링.
- UI가 고정 4축 MBTI 구조를 전제하면 안 된다.

#### B-2. Content Fallback 동작 확인 (AR-004 기준)

- content mapping 누락 섹션 → 빈 컨테이너 + '준비 중' 류 짧은 안내 문구
- operator console warning 발생
- hard crash 금지. `derived_type` 표시로 최소 결과 경험 보장
- 별도 recoverable CTA 없음

#### B-3. `adapter.ts` tolerant normalization 교체 경로 확인

- [ ] Phase 2에서 `validateCrossSheetIntegrity()` 도입 완료 여부 확인
- [ ] `adapter.ts`의 malformed → empty string/zero normalization이 Phase 2 validator와 역할 분리 완료 여부 확인
- [ ] 미완료 시: Phase 9 구현 범위에서 adapter tolerant 정책과 validator의 경계를 명시한 뒤 착수. 두 레이어가 동일 데이터를 서로 다른 방식으로 처리하는 상태를 Phase 9 내부에 남기면 안 된다.

---

## Gate C — Phase 11 착수 전 확인 (Telemetry Skeleton · Release Gate)

> Phase 10 완료 후, Phase 11 착수 전에 아래 인프라 항목이 모두 준비되어 있어야 한다.  
> 이 항목들이 미완료 상태에서 Phase 11 DoD(traceability closure)를 완결할 수 없다.

#### C-1. blocker-traceability.mjs 상한 확장

pre-start 단계에서는 mixed-evidence scaffold를 먼저 도입해 `1~30` coverage 상한을 열어 두고, Phase 11에서는 이를 executable-only closure 해석에 맞게 다시 조여야 한다. 현재 checkpoint anchor는 `docs/req-test.md` §12.2 blocker 20~30 항목에 직접 연결된다.

- [x] `check-blocker-traceability.mjs` coverage 상한이 `1~30`으로 확장되어 있음
- [x] mixed-evidence registry(`automated_assertion` / `scenario_test` / `manual_checkpoint`)가 `docs/blocker-traceability.json`에 반영되어 있음
- [x] Phase 11 executable-only closure 기준으로 future blocker entry를
  재분류할 타이밍과 책임자 기록 완료.
  **결정**: Phase 11 착수 시점에 `blocker-traceability.json`의
  `manual_checkpoint` 항목(blocker 20~30) 전체를 검토해
  자동화 가능한 항목은 `automated_assertion`으로 재분류한다.
  재분류 책임은 Phase 11 첫 커밋 작성자가 진다.
  재분류 불가 항목은 사유를 blocker-traceability.json 해당 entry에
  `reason` 필드로 기록하고 `manual_checkpoint`를 유지한다.
- 미완료 시: 현재는 pre-start traceability scaffolding까지만 확보된 상태로 남고, Phase 11 final closure 해석이 문서 없이 drift할 수 있다.

#### C-2. test-flow telemetry hook 검사 추가

- [ ] `check-phase11-telemetry-contracts.mjs`에 test flow §9.1의 6개 hook 검사 추가 완료
- [ ] 추가 대상 Phase 확정 및 기록 완료 (Phase 11 착수 시점을 기본값으로 한다)
- 미완료 시: Phase 11 DoD의 "§9.1 hook 6개 위치 확보 누락 0건" 항목을 자동으로 단언할 수 없음. blocker #18 미매핑 상태 유지.

#### C-3. `session_id` non-null 단언 검증

- [ ] `validateTelemetryEvent()` 또는 동등한 검증 함수에서 `attempt_start` 이후 이벤트에 대해 `session_id !== null` 단언 추가 완료
- [ ] e2e smoke에서 session_id non-null 직접 단언 추가 완료
- 근거: `req-test.md §9.2` transport-patch 계약. blocker #18 자동 단언 매핑 전제 조건.

#### C-4. `landing_view` 발화 타이밍 비대칭 해석 규칙

- [ ] blocker #28 픽스처 설계에 아래 해석 규칙이 반영되어 있는지 확인
  - `landing_view`는 telemetry consent sync 이후에만 발화한다. `card_answered` · `attempt_start`와 발화 시점 기준이 다르다.
  - cross-phase event integrity 분석 시 `landing_view`는 분모(세션 수 기준)에서 제외한다. `card_answered → attempt_start` 순서 분석의 분모는 `card_answered` 발화 세션이다.
  - 이 비대칭이 blocker #28 픽스처에 명시되지 않으면 ingress 경로 분석 시 분모 해석 오류가 발생한다.
  - 근거: `req-test.md §9.1` hook 1 주석, `§9.2` transport-patch 계약.

---

*이 문서는 `docs/req-test.md`를 단일 SSOT로 한다. 충돌 시 요구사항 문서 우선.*
