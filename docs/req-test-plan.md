# Test Flow 구현 계획

> **기준 문서**: `docs/req-test.md` (이하 요구사항)  
> **구성**: Phase 전체 요약 (Phase 0~11) → Phase 0 완료 요약 (ADR-A·B·E) → Phase 1 완료 요약 → Phase 2·3 예비 요약 → Phase Entry Gates (Phase 4·9·11 착수 전 확인)  
> **원칙**: 이 문서만으로 구현 착수 가능 수준. 구현 방식 결정은 구현자 재량이며, 요구사항이 명시한 계약과 검증 기준을 충족하는 한 어떤 접근도 허용.

---

## 완료된 사전 구현 요약

Phase 0 착수 이전에 요구되었던 랜딩 측 선행 구현은 완료되었다. 5종 카드 타입 시스템(`available` | `unavailable` | `hide` | `opt_out` | `debug`)과 consent 상태 기반 instruction 분기 계약이 코드베이스와 정합하며, 관련 QA Gate를 통과했다. 이 계약의 정책 SSOT는 `docs/req-landing.md` §2(Terms), §13.5(Instruction Contract), §13.9(Opt-out Card Contract)와 `docs/req-test.md` §2.5(카드 타입 계약)이며, 구현 현황은 `docs/project-analysis.md`에 기록한다.

---

## Part 1 — 전체 Phase 요약 (Phase 0~11, 총 12단계)

| Phase | 핵심 목표 | 주요 산출물 | 전제 Phase |
|---|---|---|---|
| **0** | 착수 전 ADR 확정 (Phase 1 착수 차단 조건) | ADR-A: `src/features/test` 분리 + `test-question-client.tsx` clean-room ADR 확정. ADR-B: Storage Key 네이밍 + 5개 상태 플래그 계약 + variant-scope 격리 전략. ADR-E: Representative variant 범위 + QA baseline 정비 + `qa:gate:once` GREEN 복구 | — |
| **1** | Domain Foundation | 타입 정의, schema-driven 도출 모델, pure 함수 | **0** |
| **2** | Data Source & Sync Layer | variant-registry 인터페이스, cross-source 검증, lazy validation + 캐싱 | 1 |
| **3** | Storage · Session Lifecycle · Data Volatility | storage 추상 레이어, active run 판정, 5개 상태 플래그, 3가지 휘발 트리거 | 1, 2 |
| **4** | Entry Path · Staged Entry · Invalid Variant Recovery | 3-경로 분류기, staged entry lifecycle, 에러 복구 페이지 | 1, 2, 3 |
| **5** | Instruction Gate · Runtime Entry Commit | instruction overlay (비-라우트), `instructionSeen` lifecycle, commit 도메인 이벤트 | 1, 2, 3, 4 |
| **6** | Question Runtime Core | 응답 루프, tail reset, result-entry eligibility 즉시 반영 | 1, 2, 3, 4, 5 |
| **7** | Derivation · Loading Screen | scoreStats/derivedType 계산, 5초 최소 로딩 AND 조건, back-from-loading | 1, 2, 3, 6 |
| **8** | Result URL Payload · Validation | URL 구조, base64 인코딩, payload 검증 실패 경로 | 1 |
| **9** | Result Page · Content Fallback | 케이스 매트릭스(1/2/4), mandatory/optional 섹션, content fallback | 7, 8 |
| **10** | Error States · Terminal Exclusivity · Cleanup Set | commit-failure / derivation-failure taxonomy, §8.1 전이 테이블, §8.3 cleanup 원자성 | 5, 6, 7 |
| **11** | Telemetry Contract · Release Gate | §9.1 hook 6개와 canonical telemetry 계약, traceability closure (blocker 1~30 매핑) | 전체 |

---

## Part 1A — 최신 확정 정책 반영 기준 (1~17)

> 아래 항목은 앞으로 구현이 따라야 할 **확정 정책 baseline** 이다. 이 문서의 다른 계획 문장과 충돌하면 이 기준을 우선한다. 서술은 모두 구현 예정 관점이다.

### 1. Source topology
- Phase 2는 `Landing / Questions / Results`의 **3개 개별 Spreadsheet** topology를 전제로 구현할 것이다.
- sync 입력 환경값은 `GOOGLE_SHEETS_SA_KEY`, `GOOGLE_SHEETS_ID_LANDING`, `GOOGLE_SHEETS_ID_QUESTIONS`, `GOOGLE_SHEETS_ID_RESULTS` 4개로 고정한다.

### 2. Questions source structure
- Questions Spreadsheet에서는 sheet name을 variant ID로 사용할 것이다.
- Questions source에는 질문 row만 저장하고, `axisCount`, `binary_majority|scale`, variant별 schema 본문은 source에 두지 않을 것이다.
- schema용 4번째 source는 도입하지 않을 것이다.

### 3. Questions row classification
- `kind` 컬럼은 추가하지 않을 것이다.
- parser는 `seq` 패턴만으로 `questionType`을 생성할 것이다.
  - `q.*` → profile
  - 숫자 `n` → scoring
- `q.*` 전체를 profile 문항군으로 취급할 것이다.

### 4. Canonical normalization
- source `seq`는 편집용 원본 표현으로 남겨두고, runtime/export에서는 출현 순서 기준 1-based canonical index를 재부여할 것이다.
- canonical index는 storage, qualifier mapping, schema validation, telemetry, landing pre-answer binding의 기준축으로 유지할 것이다.

### 5. Numbering separation
- canonical index, scoring order, user-facing `Q1/Q2/...`를 별도 축으로 유지할 것이다.
- user-facing `Q 번호`는 scoring order 기준으로만 계산할 것이다.

### 6. Landing preview derivation
- landing preview는 항상 Questions의 **first scoring question (`scoring1`)** 기준으로 파생할 것이다.
- profile 문항은 landing preview에 사용하지 않을 것이다.
- current inline preview bridge는 temporary bridge로 유지하되 consumer shape는 바꾸지 않을 것이다.

### 7. Durable staged entry / fresh-run commit
- landing A/B 선택 시 durable staged entry를 즉시 저장할 것이다.
- landing 단계에서는 provisional pre-answer를 canonical index에 bind하지 않을 것이다.
- runtime entry commit 시 first scoring canonical index를 해석해 bind할 것이다.
- same-variant landing 재선택은 항상 restart intent로 처리할 것이다.
- old active run은 commit success 전까지 보존하고, commit success 시에만 새 run으로 대체할 것이다.
- 새 run은 old response set을 상속하지 않고 first scoring answer 하나만 seed한 fresh response set으로 시작할 것이다.

### 8. Automatic presentation ordering
- landing ingress 이후 자동 제시는 seed된 새 response set 기준으로 동작하게 구현할 것이다.
- unanswered profile → unanswered scoring 순서를 적용할 것이다.
- profile bucket은 canonical 순, scoring bucket은 scoring order 순을 적용할 것이다.
- seed된 `scoring1`은 revisitable 상태로 남기되 auto-present하지 않을 것이다.

### 9. Runtime presentation layer
- profile 문항은 overlay-only flow로 구현할 것이다.
- profile 최초 응답과 수정 모두 overlay flow로만 처리할 것이다.
- instruction CTA 이후 profile이 있으면 instruction shell을 재사용해 profile overlay 단계로 전환할 것이다.
- profile edit에서는 instruction 본문을 재노출하지 않을 것이다.

### 10. Entry flow
- direct entry에서는 profile이 있으면 profile overlay부터, 없으면 `scoring1`부터 시작하게 구현할 것이다.
- landing ingress에서는 landing에서 `scoring1`이 pre-answer된 상태로 진입하게 구현할 것이다.
- landing ingress에서 profile이 있으면 profile overlay부터, 없으면 본문 `scoring2`부터 시작하게 구현할 것이다.

### 11. Progress policy
- main progress는 scoring-only로 계산할 것이다.
- profile은 prerequisite overlay step으로 두고 main progress 분모/분자에 넣지 않을 것이다.
- landing ingress에서는 seed된 `scoring1`을 main progress에 반영할 것이다.
- profile overlay 안에서는 필요 시 local step indicator를 별도로 둘 것이다.
- profile 수정 전후로 main progress는 변하지 않게 구현할 것이다.

### 12. Telemetry policy
- `question_answered`를 profile 포함 전 runtime question에 대해 발화하도록 구현할 것이다.
- `questionIndex` / `question_index_1based`는 canonical index만 사용하도록 유지할 것이다.
- UI `Q1/Q2`는 telemetry payload에 포함하지 않을 것이다.

### 13. `attempt_start` timing
- `attempt_start`는 instruction 이후 첫 runtime question render 시점에 발화하도록 구현할 것이다.
- direct entry는 first profile 또는 `scoring1`, landing ingress는 first profile 또는 `scoring2` 기준으로 해석할 것이다.

### 14. Runtime state partition
- instruction overlay state, profile overlay state, scoring page state, profile edit overlay state를 논리적으로 구분할 것이다.
- instruction/profile 최초 flow는 동일 overlay shell을 재사용하고, profile edit에서는 instruction content를 재노출하지 않을 것이다.

### 15. 구현 해석 원칙
- parser는 `seq` 패턴만으로 profile/scoring을 판정할 것이다.
- landing preview는 항상 `scoring1`을 기준으로 유지할 것이다.
- landing은 profile을 묻지 않을 것이다.
- fresh response set, restart intent, scoring-only progress, canonical telemetry axis를 기본 해석으로 삼을 것이다.

### 16. 열려 있으나 비차단인 UX 항목
- profile summary 위치
- summary 포맷
- profile edit overlay header/CTA copy
- profile edit 완료 후 원래 scoring 문항 복귀 UX
- profile overlay local step indicator 표현

### 17. 최종 확정 요약
- Questions `seq=q.*`는 profile, 숫자 `n`은 scoring으로 구현할 것이다.
- `Q1/Q2`는 scoring order 기준으로 구현할 것이다.
- landing preview는 `scoring1`을 사용하게 유지할 것이다.
- landing A/B 선택은 durable staged entry를 만들고, commit success 시 first scoring answer만 seed한 fresh run으로 이어지게 구현할 것이다.
- landing ingress 후 자동 제시는 unanswered profile → unanswered scoring이 되게 구현할 것이다.
- profile은 overlay-only, main progress는 scoring-only, telemetry index는 canonical-only로 구현할 것이다.

---

## Part 2 — Phase 0: 착수 전 선결 조건 (완료)

> **Phase 0은 구현 Phase가 아니었다.** 아래 세 ADR이 모두 완료된 상태이므로 Phase 1 이상 착수가 허용된다.

### ADR-A — `src/features/test` 네임스페이스 분리 + `test-question-client.tsx` clean-room 교체

**완료 상태**: done (scope/timing/interface freeze 완료, runtime 교체는 Phase 1+ 범위).

**주요 결정 (변경 시 새 ADR 필요)**:

- `src/features/test` 디렉토리가 canonical test destination surface다. `src/features/landing/test/*` 파일은 제거되었으며 shim/alias 없음.
- `src/features/test/domain/` 하위 7개 파일(`index.ts`, `types.ts`, `validate-variant.ts`, `validate-question-model.ts`, `validate-variant-data-integrity.ts`, `derivation.ts`, `type-segment.ts`)이 provisional pure domain baseline으로 존재하며, 전용 unit test가 이를 소비한다. `src/features/test/domain/index.ts`는 Phase 1 순수 도메인의 유일한 public surface다.
- **live route/runtime은 이 domain module을 아직 import하지 않는다.** `src/app/[locale]/test/[variant]/page.tsx`와 `test-question-client.tsx`는 여전히 compatibility shell로 동작한다. live wiring은 Phase 4 이후 소유다.
- `VariantId`: `string & { readonly __brand: 'VariantId' }` intersection brand 고정. object-wrapping 금지.
- `QuestionIndex`: `number & { readonly __brand: 'QuestionIndex' }` intersection brand 고정.
- `AxisCount`: 현행 plain union `1 | 2 | 4` 유지. branded literal union 격상은 미결 상태다. Phase 3 이후 `AxisCount`가 storage key 구성이나 파생 로직에 나타나면 plain union 기준으로 구현하고, 격상이 필요하다고 판단되면 별도 ADR을 연다.
- `validateVariant(input, registeredVariants, availableVariants): VariantValidationResult` 시그니처와 `{ ok: false; reason: 'MISSING' | 'UNKNOWN' | 'UNAVAILABLE' }` union shape 동결. shape 변경은 새 ADR 대상.
- `question-bank.ts` unknown variant generic fallback은 이미 제거됨. `resolveLandingTestCardByVariant()` miss → `notFound()` fail-close. **same-route recoverable invalid-variant recovery page는 미구현 상태**이며, Phase 4 소유다.

### ADR-B — Storage Key 네이밍 + 5개 상태 플래그 계약

**완료 상태**: done.

**주요 결정**:
- storage prefix: `test:{variant}:...` 고정.
- cleanup bundle: variant-scoped prefix 내부에서만 정리.
- 5개 future flag reserved segment: `test:{variant}:flag:{flagName}`.
- 런타임 key migration은 Phase 3에서 수행. 현재 live key는 `docs/project-analysis.md` §6 기준.

### ADR-E — Representative Variant 범위 + QA Baseline 정비

**완료 상태**: done (`qa:gate:once` GREEN).

**주요 결정**:
- representative anchor SSOT: `tests/e2e/helpers/landing-fixture.ts` (`PRIMARY_AVAILABLE_TEST_VARIANT`, `PRIMARY_OPT_OUT_TEST_VARIANT`).
- baseline PNG는 로컬 QA 자산. Git tracked completeness는 완료 조건 아님.
- combined theme label: `Language ⋅ Theme` 계열로 고정.

### Phase 0 완료 게이트

| ADR | 완료 여부 |
|---|---|
| ADR-A: 네임스페이스 분리 + clean-room ADR | done |
| ADR-B: Storage Key + 5개 플래그 계약 | done |
| ADR-E: Representative Variant 범위 + QA Baseline 정비 | done |

---

## Part 3 — Phase 1 완료 요약

Phase 1 Domain Foundation은 완료되었다. `src/features/test/domain/` 하위 7개 파일 구현과 전용 unit test가 모두 GREEN이며, blocker #7(Question Model), #11(Derivation), #12(Data Integrity), #27(TypeSegment/Qualifier) automated_assertion entry가 `docs/blocker-traceability.json`에 기록되어 있다.

**Phase 2 이상이 안전하게 전제할 수 있는 Phase 1 결과물**:

| 산출물 | 위치 | 역할 |
|---|---|---|
| 브랜드 타입 및 도메인 모델 | `types.ts` | `VariantId`, `QuestionIndex`, `AxisCount`, `ScoringSchema`, `VariantSchema`, `Question`, `QuestionType`, `QualifierFieldSpec`, `ScoreStats`, `DerivedType`, `ResultPayload` |
| `validateVariant()` | `validate-variant.ts` | MISSING/UNKNOWN/UNAVAILABLE 3-way pure gate. 시그니처와 결과 union shape 동결 |
| `validateQuestionModel()` | `validate-question-model.ts` | poleA≠poleB, index 유일성, axis 귀속 불변식 검증 |
| `validateVariantDataIntegrity()` | `validate-variant-data-integrity.ts` | `BlockingDataErrorReason` enum 동결. odd-count rule, duplicate axis/qualifier, unsupported scoringMode 포함 |
| `computeScoreStats()`, `deriveDerivedType()` | `derivation.ts` | schema-driven 도출. profile 문항 제외, MBTI 하드코딩 없음 |
| `parseTypeSegment()`, `buildTypeSegment()` | `type-segment.ts` | qualifier-aware type segment 인코딩·파싱 |
| Public surface | `index.ts` | 위 타입과 함수 전체 export. 내부 helper는 비공개 |

**동결 계약 참조 (Phase 2+ 구현 시 소비)**:

아래 시그니처·타입·enum은 Phase 1에서 동결되었다. shape나 enum 값 추가는 새 ADR 대상이다.

```typescript
// 핵심 타입 — 변경 시 새 ADR 필요
type VariantId     = string & { readonly __brand: 'VariantId' }
type QuestionIndex = number & { readonly __brand: 'QuestionIndex' }
type AxisCount     = 1 | 2 | 4  // branded literal union 격상 미결 — plain union 기준 유지

interface Question {
  index: QuestionIndex
  poleA: string; poleB: string
  questionType: 'scoring' | 'profile'   // sync parser 산출물, source column 아님
}
interface QualifierFieldSpec {
  key: string; questionIndex: QuestionIndex
  values: string[]; tokenLength: number
}
interface AxisSpec { poleA: string; poleB: string; scoringMode: 'binary_majority' | 'scale' }
interface ScoringSchema {
  variantId: VariantId; scoringSchemaId: string   // scoringSchemaId는 URL에 노출하지 않음
  axisCount: AxisCount; axes: AxisSpec[]
  supportedSections: SectionId[]
  qualifierFields?: QualifierFieldSpec[]
}
interface VariantSchema {
  variant: VariantId; schema: ScoringSchema
  questions: Question[]   // scoring + profile 전체, canonical 실행 순서
}
// ScoreStats = Record<axisId, { poleA, poleB, counts: Record<string,number>, dominant: string }>
// ResultPayload = { scoreStats: ScoreStats; shared: boolean }
```

```typescript
// validateVariant — Phase 4 entry path 소비. 시그니처와 union shape 동결
validateVariant(input: unknown, registeredVariants: VariantId[], availableVariants: VariantId[])
  : { ok: true; value: VariantId }
  | { ok: false; reason: 'MISSING' | 'UNKNOWN' | 'UNAVAILABLE' }
```

| reason | 판정 기준 |
|---|---|
| `MISSING` | `null` · `undefined` · `''` · 비-string 타입 입력 |
| `UNKNOWN` | non-empty string이지만 `registeredVariants`에 없음 |
| `UNAVAILABLE` | `registeredVariants`에는 있으나 `availableVariants`에는 없음 |

> 비-string 타입 입력(number, object 등)은 MISSING으로 처리한다. URL segment는 항상 string이므로 이 분기는 unit test 방어선으로 기능한다.

```typescript
// validateVariantDataIntegrity — Phase 2 registry builder 소비. enum 동결
type BlockingDataErrorReason =
  | 'EMPTY_QUESTION_SET'
  | 'QUESTION_MODEL_VIOLATION'
  | 'EVEN_AXIS_QUESTION_COUNT'       // binary_majority scoring axis에만 적용
  | 'AXIS_COUNT_SCHEMA_MISMATCH'     // axes 배열 길이 ≠ axisCount
  | 'DUPLICATE_AXIS_SPEC'            // schema.axes 내 동일 poleA+poleB 중복
  | 'UNSUPPORTED_SCORING_MODE'       // 'scale' 등 미구현 scoringMode
  | 'QUALIFIER_QUESTION_NOT_FOUND'
  | 'QUALIFIER_QUESTION_NOT_PROFILE'
  | 'DUPLICATE_QUALIFIER_KEY'
  | 'QUALIFIER_SPEC_INVALID'
  | 'DUPLICATE_QUALIFIER_VALUE'
// 새 reason 추가는 새 ADR 대상. Phase 2 registry builder와 Phase 4 entry path가 이 enum 전체를 소비한다.

validateVariantDataIntegrity(schema: VariantSchema)
  : { ok: true } | { ok: false; reason: BlockingDataErrorReason; detail?: string }
```

```typescript
// computeScoreStats / deriveDerivedType — Phase 7 derivation loading 소비
// scoring 문항만 필터링; profile 문항 응답은 ScoreStats에 포함하지 않는다
computeScoreStats(questions: Question[], responses: Map<QuestionIndex, string>, schema: ScoringSchema)
  : ScoreStats | { error: 'INCOMPLETE_SCORING_RESPONSES' | 'UNMATCHED_QUESTION' }

deriveDerivedType(scoreStats: ScoreStats, schema: ScoringSchema)
  : DerivedType | { error: 'AXIS_NOT_FOUND' | 'TOKEN_LENGTH_MISMATCH' }

// parseTypeSegment / buildTypeSegment — Phase 8 result URL 수신/생성 소비
// type segment 길이 = axisCount + sum(qualifierFields[i].tokenLength)
parseTypeSegment(typeSegment: string, schema: ScoringSchema)
  : { ok: true; derivedType: string; qualifiers: Record<string, string> }
  | { ok: false; reason: 'LENGTH_MISMATCH' | 'INVALID_QUALIFIER_VALUE' }

buildTypeSegment(derivedType: string, responses: Map<QuestionIndex, string>, schema: ScoringSchema)
  : { ok: true; typeSegment: string }
  | { ok: false; reason: 'QUALIFIER_RESPONSE_MISSING' | 'INVALID_QUALIFIER_VALUE' }
```

**Live runtime 현황 (Phase 4+ 소유)**:

- `src/app/[locale]/test/[variant]/page.tsx`와 `test-question-client.tsx`는 `src/features/test/domain/`을 import하지 않는다. 현재 runtime은 compatibility shell이다.
- invalid-variant 처리는 현재 `resolveLandingTestCardByVariant()` miss → `notFound()` hard fail이다. `validateVariant()` ok:false 결과를 소비하는 runtime wiring이 없다.
- Phase 4 첫 커밋 소유 항목: `validateVariant()` ok:false → §6.1 에러 복구 페이지 wiring, same-route recoverable recovery page 구현, session/run context 미생성 명시적 차단.

---

## Part 4 — Phase 2 예비 요약 (Data Source & Sync Layer)

> Phase 1 완료 후 본 섹션을 확인한다. 아래는 Phase 2 착수 전 결정사항과 산출물 요약이다.

### ⚠️ Phase 2 착수 전 미결 설계 결정 (ADR 신호)

아래 항목은 Phase 2 착수 전에 결정 및 ADR 기록이 완료되어야 한다.  
결정 없이 Phase 2 구현을 시작하면 안 된다.

| # | ADR 주제 | 선택지 | 결정 상태 |
|---|---|---|---|
| ADR-C | Google Sheets API 인증 방식 | **Service Account + 4-env contract** (`GOOGLE_SHEETS_SA_KEY`, `GOOGLE_SHEETS_ID_LANDING`, `GOOGLE_SHEETS_ID_QUESTIONS`, `GOOGLE_SHEETS_ID_RESULTS`) | ✅ 확정 |
| ADR-D | `variant-registry.generated.ts` 버전 관리 방식 | `.gitignore` 제외 / versioned file / 별도 아티팩트 저장소 | ⬜ 미결 |
| ADR-F | attribute 필터링 레이어 결정 | **landing-side resolver 처리로 확정.** `loadVariantRegistry()`와 `resolveLandingCatalog()`가 `attribute` 5종 (`available` \| `unavailable` \| `hide` \| `opt_out` \| `debug`)을 인식해 필터링을 수행한다. consent 상태 기반 필터링(`available` 비노출 / `opt_out` 항상 노출)도 동일 레이어에서 처리한다. registry-side raw access는 채택하지 않는다. 상세 계약: `docs/req-landing.md` §2, §13.9, `docs/req-test.md` §2.5. | ✅ 완료 |

> ADR-F는 landing-side resolver 처리로 확정됐다. `loadVariantRegistry()` / `resolveLandingCatalog()` 수정으로 인해 landing Phase QA 재통과가 Phase 2 DoD에 포함된다.

### Phase 2 착수 전 코드 정리

`question-bank.ts`의 unknown variant generic fallback은 Phase 1 완료 시점에 이미 제거된 상태다. Phase 2 착수 조건으로 추가 코드 변경이 필요하지 않다. Phase 4 소유 항목(recovery page wiring)과 혼동하지 않는다.

### Phase 2의 목적과 주요 산출물

Phase 2의 목적은 variant registry 계약, 3-source integrity 검증, lazy validation/caching을 하나의 데이터 접근 레이어로 정립하는 것이다.

| 산출물 | 내용 |
|---|---|
| `VariantRegistry` 타입 | `variant-registry.generated.ts`의 runtime/export 스키마를 정의한다. `landingCards`와 `testPreviewPayloadByVariant`를 분리 보관하고, source 전용 필드(`seq`, temporary inline preview bridge)는 exported card payload에 남기지 않도록 구현해야 한다. generated registry는 code-owned canonical mapping에서 resolve된 schema를 포함할 수 있다. 상세 타입 계약: `docs/req-test.md` §2.5 |
| `loadVariantRegistry()` | 환경별 registry 파일 로딩 인터페이스. production과 dev fixture가 동일 시그니처 |
| 3-source loader | `GOOGLE_SHEETS_ID_LANDING`, `GOOGLE_SHEETS_ID_QUESTIONS`, `GOOGLE_SHEETS_ID_RESULTS`를 읽어 Landing / Questions / Results source를 각각 로드 |
| Questions parser | Questions workbook에서 `sheet name = variantId`를 적용하고, `seq`에서 `questionType`을 생성하며, source row 순서를 유지한 canonical index 재번호를 수행해야 한다. 이후 preview source를 Questions의 **first scoring question** 으로 교체할 수 있도록 parser/builder 경계를 설계한다 |
| `validateCrossSheetIntegrity(registry)` | Landing source variant set, Questions workbook sheet-name set, Results source variant set의 3자 정합성을 검증하는 pure 함수. GitHub Action 스크립트와 runtime 2차 방어선 모두에서 사용 |
| `getLazyValidatedVariant(variantId)` | 캐싱 포함 lazy validation. 첫 호출 시 `validateVariantDataIntegrity()` 실행 → 이후 캐시 반환 |
| GitHub Action 스크립트 골격 | 3개 source 읽기 → code-owned schema resolution → 3-source 검증 → 성공 시 registry 파일 생성 → 커밋 트리거. sync_script.js 인터페이스 확정 |
| preview derivation | 현재 단계에서는 landing preview payload source를 fixture inline **temporary bridge** 로 유지할 수 있어야 한다. 이 bridge는 source fixture에만 남기고 resolver boundary로만 주입해야 하며, Questions source의 `scoring1`은 다음 단계 migration target으로 문서화한다. profile row는 preview source가 아니다 |
| resolver boundary | landing / test / blog consumer가 raw fixture shape를 직접 읽지 않도록 `resolveTestPreviewPayload()` 같은 단일 resolver/selector 경계를 구현해야 한다. 다음 단계 source 교체 시 변경 범위가 resolver 내부로만 닫혀야 한다 |
| unified meta contract | runtime data key는 `durationM`, `sharedC`, `engagedC`만 사용하도록 고정하고, test/blog별 표기 라벨 분기는 UI 레이어만 담당하도록 구현해야 한다 |
| migration contract | preview source `inline -> Questions first scoring question` 교체, Landing metadata ↔ Questions variant/first-scoring 존재 검증 추가, consumer shape 불변 유지를 TODO가 아니라 명시적 migration contract로 남겨야 한다 |
| EGTT dev/test fixture | `axisCount=1`, `qualifierFields` 1개 구조의 dev fixture. Phase 1 EGTT schema 지원 검증 및 Phase 4 이후 진입 경로 테스트에 사용. fixture source는 3-source topology + code-owned schema registry 결합을 builder를 통해 `variant-registry.generated.ts` runtime/export 인터페이스로 변환해야 한다 |

### Phase 2 DoD (Policy Additions)

- source fixture와 runtime/export 타입을 분리해야 한다. source에만 `seq`와 temporary inline preview bridge를 허용하고, runtime landing card payload에는 이를 노출하지 않는다.
- preview payload는 fixture inline bridge를 유지하더라도 source fixture에만 남겨야 한다. landing / test / blog consumer의 raw fixture access는 금지한다.
- 배열 순서 계약 `seq -> sort -> drop`을 구현해야 한다. missing / duplicate / invalid `seq`는 fixture validation fail로 처리해야 하며, consumer는 배열 순서만 신뢰하게 만든다.
- runtime meta key는 `durationM`, `sharedC`, `engagedC`로 고정해야 한다. test/blog 전용 field name으로 다시 역변환하면 안 된다.
- blog subtitle 회귀 검증을 추가해야 한다. Normal 2줄 clamp와 Expanded 4줄 clamp가 같은 `subtitle` source text를 재사용함을 검증하고, 제거된 blog 전용 보조 필드 및 런타임 카드 우회 shape 재유입도 함께 막아야 한다.
- preview source를 Questions **first scoring question** 으로 교체하는 다음 단계 migration contract를 문서와 테스트 계획에 명시해야 한다. 이때 consumer shape는 바꾸지 않는다.

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

### Gate A — Phase 4 착수 전 확인 (Entry Path · Staged Entry · Invalid Variant Recovery)

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
- vivetest-landing-ingress:{variant} 레코드는 현재 landing runtime에서 { variant, preAnswerChoice, createdAtMs, landingIngressFlag } 형태로 저장된다. createdAtMs 필드는 beginLandingTransition() → writeLandingIngress() 경로에서 기록되며, Phase 4 Gate A-2의 전제 조건은 현재 코드베이스에서 이미 충족된 상태다.

#### A-3. Cross-phase Event Integrity 픽스처 소유권 확인

- blocker #28(`attempt_start` cross-phase integrity, `req-test.md §12.2`) 단언은 blocker #15(Landing Requirements §14.2 check 15)의 픽스처를 공유한다.
- Phase 4에서 `attempt_start` 단언을 작성하기 전에 아래를 결정한다.
- Phase 4 telemetry/integrity 픽스처는 **user-facing scoring label**과 **telemetry canonical index**를 같은 시나리오에서 분리 검증해야 한다. profile question이 있는 fixture를 최소 1개 포함한다.

| 확인 항목 | 결정 기준 |
|---|---|
| 공유 픽스처 파일 경로 | `tests/` 하위 landing fixture 경로 또는 신규 shared fixture 경로 중 하나로 확정 |
| 소유 모듈 | landing fixture가 이미 blocker #15 단언을 포함하면 Phase 4에서 import. 없으면 Phase 4에서 공유 픽스처 생성 후 blocker #15 단언도 함께 포함 |
| 픽스처 공유 확정 시점 | Phase 4 첫 번째 커밋 이전 |

---

### Gate B — Phase 9 착수 전 확인 (Result Page · Content Fallback)

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

### Gate C — Phase 11 착수 전 확인 (Telemetry Contract · Release Gate)

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
  - `attempt_start.question_index_1based`와 향후 `question_answered.questionIndex`는 canonical index 기준이다. user-facing `Q1/Q2`는 scoring order label이므로 픽스처 expectation을 동일 값으로 두면 안 된다.
  - 이 비대칭이 blocker #28 픽스처에 명시되지 않으면 ingress 경로 분석 시 분모 해석 오류가 발생한다.
  - 근거: `req-test.md §9.1` hook 1 주석, `§9.2` transport-patch 계약.

---

*이 문서는 `docs/req-test.md`를 단일 SSOT로 한다. 충돌 시 요구사항 문서 우선.*
