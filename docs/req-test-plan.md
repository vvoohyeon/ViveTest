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

## Part 1A — 확정 정책 baseline 참조

> 아래 항목들은 확정 정책이다. 이 문서의 다른 계획 문장과 충돌하면 아래 SSOT를 우선한다.
>
> - **Source topology·Questions 구조·row classification·canonical normalization·numbering 분리·landing preview 파생·scoringLogicType canonical location** → `docs/requirements.md §1 (Confirmed policy alignment)` 및 `docs/req-test.md §1.3`
> - **Durable staged entry·fresh-run commit·automatic presentation ordering·runtime presentation layer·entry flow·progress policy·telemetry policy·`attempt_start` timing·runtime state partition** → `req-test.md §3, §6, §8, §9`
>
> 이 섹션은 별도 정책 텍스트를 중복 유지하지 않는다.

---

## Part 2 — Phase 0: 착수 전 선결 조건 (완료)

> **Phase 0은 구현 Phase가 아니었다.** 아래 세 ADR이 모두 완료된 상태이므로 Phase 1 이상 착수가 허용된다.  
> 구현 현황 상세: `project-analysis.md §1`, §5.5.

| ADR | 완료 여부 | 핵심 결정 (변경 시 새 ADR 필요) |
|---|---|---|
| **ADR-A**: `src/features/test` 네임스페이스 분리 + `test-question-client.tsx` clean-room 교체 | done | `src/features/test/domain/index.ts`가 Phase 1 도메인 유일 public surface. `VariantId` = `string & { readonly __brand: 'VariantId' }` 고정. `QuestionIndex` = `number & { readonly __brand: 'QuestionIndex' }` 고정. `validateVariant()` 시그니처 + union shape 동결. live route는 domain을 직접 import하지 않고 `lazy-validation` boundary를 통해 entry guard를 소비한다. `test-question-client.tsx` clean-room 상태는 유지된다. |
| **ADR-B**: Storage Key 네이밍 + 5개 상태 플래그 계약 | done | storage prefix: `test:{variant}:...` 고정. cleanup bundle: variant-scoped prefix 내부만. 5개 flag reserved: `test:{variant}:flag:{flagName}`. 런타임 key migration은 Phase 3 소유. 현재 live key는 `project-analysis.md §6` 기준. |
| **ADR-E**: Representative Variant 범위 + QA Baseline 정비 | done (`qa:gate:once` GREEN) | representative anchor SSOT: `tests/e2e/helpers/landing-fixture.ts` (`PRIMARY_AVAILABLE_TEST_VARIANT=qmbti`, `PRIMARY_OPT_OUT_TEST_VARIANT=energy-check`). baseline PNG는 로컬 QA 자산. combined theme label: `Language ⋅ Theme` 계열로 고정. |

---

## Part 3 — Phase 1 완료 요약

Phase 1 Domain Foundation은 완료되었다. `src/features/test/domain/` 하위 7개 파일 구현과 전용 unit test가 모두 GREEN이며, blockers #7/#11/#12/#27이 `docs/blocker-traceability.json`에 기록되어 있다.

> **동결 계약 (TypeScript 시그니처 전체)**: `project-analysis.md §5.5.1` 참조.
> shape·enum 값 변경은 새 ADR 필수.

**Phase 2+ 가 안전하게 전제할 수 있는 Phase 1 산출물:**

| 산출물 | 위치 | 역할 |
|---|---|---|
| 브랜드 타입 및 도메인 모델 | `types.ts` | `VariantId`, `QuestionIndex`, `AxisCount`, `ScoringSchema`, `VariantSchema`, `Question`, `QuestionType`, `QualifierFieldSpec`, `ScoreStats`, `DerivedType`, `ResultPayload` |
| `validateVariant()` | `validate-variant.ts` | MISSING/UNKNOWN/UNAVAILABLE 3-way pure gate. 시그니처와 결과 union shape 동결 |
| `validateQuestionModel()` | `validate-question-model.ts` | scoring `poleA`/`poleB` 필수·상호 다름, profile pole optional, index 유일성, bidirectional axis 귀속 불변식 |
| `validateVariantDataIntegrity()` | `validate-variant-data-integrity.ts` | `BlockingDataErrorReason` enum 동결. bidirectional odd-count rule, duplicate axis/qualifier, unsupported scoringMode 포함 |
| `computeScoreStats()`, `deriveDerivedType()` | `derivation.ts` | schema-driven 도출. profile 문항 제외, MBTI 하드코딩 없음. `axisMatchesQuestion()` direct helper export |
| `parseTypeSegment()`, `buildTypeSegment()` | `type-segment.ts` | qualifier-aware type segment 인코딩·파싱 |
| Public surface | `index.ts` | 위 타입과 함수 전체 export |

**ADR-X (완료)**: `Question.poleA`/`poleB`는 `scoring`에서만 필수, `profile`에서는 optional. EGTT `q.*` profile row 소스 shape 충돌 해소. 변경 범위: `types.ts`, `validate-question-model.ts`, `question-source-parser.ts`, 관련 unit tests.

**Live runtime 현황 (Phase 4+ 소유)**:
- `test-question-client.tsx`는 `src/features/test/domain/`을 직접 import하지 않는 clean-room runtime 상태를 유지한다.
- `page.tsx`는 `lazy-validation` boundary를 통해 domain integrity guard를 간접 소비하며, 실패 시 §6.1 stub error route로 redirect한다.
- Phase 4 첫 커밋 소유: `validateVariant()` ok:false → 완성형 §6.1 recovery surface wiring.

---

## Part 4 — Phase 2 예비 요약 (Data Source & Sync Layer)

> Phase 1 완료 후 본 섹션을 확인한다.

### Phase 2 착수 전 ADR 결정 완료

| # | ADR 주제 | 결정 |
|---|---|---|
| ADR-C | Google Sheets API 인증 방식 | **Service Account + 4-env contract** (`GOOGLE_SHEETS_SA_KEY`, `GOOGLE_SHEETS_ID_LANDING`, `GOOGLE_SHEETS_ID_QUESTIONS`, `GOOGLE_SHEETS_ID_RESULTS`) ✅ 확정 |
| ADR-D | `variant-registry.generated.ts` 버전 관리 방식 | **versioned file (git 커밋 포함)**. 매 sync마다 전체 파일 재생성(partial update 금지). `@generated` 주석으로 직접 편집 금지 표시. ✅ 확정 |
| ADR-F | attribute 필터링 레이어 결정 | **landing-side resolver 처리로 확정.** `loadVariantRegistry()` / `resolveLandingCatalog()`가 `attribute` 5종을 인식해 필터링 수행. consent 상태 기반 필터링도 동일 레이어. 상세 계약: `docs/req-landing.md` §2, §13.9, `docs/req-test.md` §2.5. ✅ 완료 |

> ADR-F 확정으로 `loadVariantRegistry()` / `resolveLandingCatalog()` 수정이 발생하므로 landing Phase QA 재통과가 Phase 2 DoD에 포함된다.

### Phase 2의 목적과 주요 산출물

Phase 2의 목적은 variant registry 계약, 3-source integrity 검증, lazy validation/caching을 하나의 데이터 접근 레이어로 정립하는 것이다.

| 산출물 | 내용 |
|---|---|
| `VariantRegistry` 타입 | `landingCards` / `testPreviewPayloadByVariant` 분리 보관. source 전용 필드(`seq`)와 legacy inline preview field 미포함. 상세: `docs/req-test.md` §2.5 |
| `schema-registry.ts` | code-owned canonical registry. `logicType -> schema template`, `variant -> logicType` 매핑으로 `getSchemaForVariant(variantId)` 제공. 현재 `ScoringLogicType = 'mbti' | 'egtt'`. EGTT: `axisCount=1`, axis `E/T`, qualifier `gender`, values `['M','F']`, `tokenLength=1`. |
| `response-projection.ts` | Phase 4/7 projection layer 예약 파일. 현재는 계약 주석만. `computeScoreStats()` / `buildTypeSegment()`에 raw `A/B` 직접 전달 차단 경계 보존. |
| `loadVariantRegistry()` | production과 dev/test fixture가 동일 `VariantRegistry` 시그니처. production은 `variant-registry.generated.ts`의 static generated registry를 읽고, dev/test는 fixture source와 `questionSourceFixture`를 builder에 주입해 cached fixture registry를 만든 뒤 3-source integrity 검증과 runtime fallback을 실행한다. |
| 3-source loader | Group B-1 완료: `scripts/sync/sheets-loader.ts`가 `googleapis` Service Account client, Landing workbook `Landing` sheet loader, Questions workbook sheet-title loader를 제공한다. Landing은 flat locale columns를 `VariantRegistrySourceCard` nested source shape로 변환하고, Questions는 raw sheet name을 Map key로 유지한 뒤 `normalizeQuestionSheetRow(rawRow, locales)`를 경유한다. Results loader는 Results Sheets 준비 완료 시 `loadResultsSheet(client, spreadsheetId)`로 추가한다. |
| Questions parser / fixture boundary | `src/features/test/question-source-parser.ts`: `parseSeqToQuestionType()`, `buildCanonicalQuestions()`, `findFirstScoringRow()`. dev fixture: `src/features/test/fixtures/questions/**`. |
| Questions row normalizer | `src/features/variant-registry/sheets-row-normalizer.ts`: raw Sheets `question_EN` / `answerA_KR` / `pole_A` 형식을 `QuestionSourceRow` 호환 shape로 변환한다. `NormalizedQuestionSourceRow`는 parser row 타입을 참조하며, unit test가 `buildCanonicalQuestions()` 호환성을 타입/런타임 양쪽에서 검증한다. |
| Questions fixture hardening | enterable set `qmbti`, `energy-check`, `rhythm-b`, `egtt`가 `validateVariantDataIntegrity()`를 통과한다. `qmbti` / `energy-check` / `egtt`는 even-count axis 해소용 `Q_placeholder_*` row가 추가됐고, `rhythm-b`는 변경 없이 odd-count 상태다. `debug-sample`은 B30 실패 경로 전용 intentional error fixture로 유지한다. |
| Results fixture boundary | `src/features/test/fixtures/results/**`: 현재 testable set(`qmbti`, `rhythm-b`, `energy-check`, `egtt`)의 row-level `variantId`만 모사. Result content schema는 Phase 9 소유. |
| `validateCrossSheetIntegrity()` | `validateCrossSheetIntegrity(landingTestVariants, questionVariants, resultsVariants?)`. optional 3번째 인자로 3-source 정합성을 검증하고 `missingInResults` / `extraInResults`를 반환한다. 인자 생략 시 기존 2-source caller 계약을 유지한다. |
| Runtime 2차 방어선 | `loadVariantRegistry()`가 동일 helper를 사용해 fixture runtime을 검증한다. Landing-only mismatch는 `hide` 강등, Questions-only / Results-missing / Results-only mismatch는 entry 차단. test route는 blocked set 확인 후 entry resolver를 사용한다. |
| `getLazyValidatedVariant(variantId)` | 캐싱 포함 lazy validation. 첫 호출 시 `validateVariantDataIntegrity()` 실행 → 이후 모듈 수준 `Map` 캐시 반환. 실패 variant는 다른 variant에 영향 없이 `/[locale]/test/error?variant=...`로 차단된다. `clearLazyValidationCacheForTesting()`는 unit test 격리 전용 helper. |
| GitHub Action / sync orchestration | Group B-2 완료: `scripts/sync/sync.ts`가 `.env.local`/Actions secrets를 통해 Service Account JSON과 Landing/Questions spreadsheet IDs를 읽고, B-1 loader → 2-source `validateCrossSheetIntegrity(landingTestVariants, questionVariants)` → positional `buildVariantRegistry(landingRows, questionSourcesByVariant)` → `serializeRegistryToFile()` → generated file compare/write → git add/commit/push를 수행한다. 불일치 시 파일 write 없음, git 실패 시 원본 generated content를 복구해 last-known-good을 유지한다. `.github/workflows/sync.yml`은 main push trigger, `contents: write`, Node 22, git identity, `npm run sync`, `continue-on-error: false`를 소유한다. Results Sheets 준비 완료 시 `GOOGLE_SHEETS_ID_RESULTS`, `loadResultsSheet()`, 3-source validation으로 확장한다. |
| Generated registry serializer | `src/features/variant-registry/registry-serializer.ts`: `VariantRegistry`를 object-literal 기반 `variant-registry.generated.ts` 파일 문자열로 직렬화한다. 기존 generated header와 typed export를 유지하고 plain object key를 알파벳 순으로 정렬해 재생성 diff noise를 줄인다. 파일 쓰기, Google Sheets API 호출, GitHub Action wiring은 serializer가 아니라 `scripts/sync/sync.ts` 책임이다. |
| Fixture-only generated regeneration / dry-run | `scripts/sync/regenerate-variant-registry-from-fixture.ts`는 fixture + builder 출력으로 `variant-registry.generated.ts` static object literal을 직접 재생성하는 one-shot path다. `scripts/sync/sync-dry-run.ts`는 같은 fixture builder + serializer 경로를 no-write/no-git으로 실행해 stdout에 generated source를 출력하며 `npm run sync:dry`로 호출한다. B-2 완료 시점의 generated artifact는 실 Sheets sync에서 `no changes` smoke를 통과했고, fixture source/test expectations는 해당 artifact와 구조 동등하도록 동기화되어 있다. |
| preview / resolver boundary | Questions `scoring1` 기반 preview migration 완료. consumer는 `resolveTestPreviewPayload()` 경계만 사용하고 runtime consumer shape는 유지한다. |

### Phase 2 DoD (핵심 정책)

- source fixture와 runtime/export 타입 분리 (source 전용 `seq`는 runtime payload에 미포함).
- 배열 순서 계약 `seq -> sort -> drop` 구현. missing/duplicate/invalid `seq`는 fixture validation fail.
- runtime meta key `durationM`, `sharedC`, `engagedC` 고정. test/blog 전용 역변환 금지.
- blog subtitle 회귀 검증: Normal 2줄 / Expanded 4줄이 같은 `subtitle` source 재사용.
- preview source → Questions `scoring1` 교체 완료 상태 유지 (consumer shape 불변 유지).

### Phase 1과의 인터페이스 제약

Phase 2는 Phase 1의 `VariantSchema`를 registry 계약의 기반 타입으로 사용한다. Phase 1 타입이 불완전하면 Phase 2의 registry/validation 레이어가 즉시 불안정해진다.

---

## Part 5 — Phase 3 예비 요약 (Storage · Session Lifecycle · Data Volatility)

> Phase 1 완료 전에 이 섹션을 확인한다. Phase 3은 Phase 1, 2의 기반 위에 "상태가 저장되는 레이어"를 쌓는 Phase다.

### 목적

Phase 3는 아래 세 관심사를 **하나의 레이어**에서 함께 확립한다. 이 셋을 분리해 구현하면 Phase 4 이후 경로 분기 로직이 불완전한 storage 계약에 의존하게 되어 테스트 불가능한 상태가 생긴다.

1. **Active run 판정** (§3.7): 30분 inactivity timeout, 재진입 시점 평가, 백그라운드 타이머 불필요
2. **5개 상태 플래그 분리** (§8.2): `derivation_in_progress`, `derivation_computed`, `min_loading_duration_elapsed`, `result_entry_committed`, `result_persisted`를 단일 플래그로 뭉개지 않음
3. **3가지 응답 데이터 휘발 트리거** (§6.8): result screen entry commit 완료 / inactivity timeout 판정 / 처음부터 다시 하기 commit success — 각각 `instructionSeen` 포함/제외 범위가 다름

### 핵심 설계 결정 (Phase 3 착수 전 확정 필요)

**storage 추상 레이어 선택**: Phase 3는 storage key 네이밍, store 구조, key 목록을 별도 구현/설계 문서에서 정의한다. ADR-B(Phase 0 선결 완료)를 참조해 storage 추상 레이어를 설계한다.

**variant-scoped 격리**: 모든 storage 조작은 해당 variant 범위에만 영향을 준다. 다른 variant 데이터를 건드리지 않는다 (§6.8 삭제 원칙). Phase 3에서 이 격리 경계를 명확히 구조화하지 않으면 Phase 10의 cleanup set 원자성 검증이 불가능해진다.

### 주요 산출물 (예비)

| 산출물 | 내용 |
|---|---|
| `getActiveRun(variantId)` | storage에서 해당 variant의 run 조회 → 30분 경과 여부 판정 → timeout 시 §6.8 휘발 즉시 실행 후 `null` 반환 |
| `StateFlags` 읽기/쓰기 인터페이스 | 5개 플래그를 개별 접근. 단일 플래그 혼용 금지를 구조적으로 강제 |
| `volatilizeRunData(variantId, trigger)` | 3가지 트리거별로 `instructionSeen` 포함/제외 범위를 switch-case로 명확히 분기. 원자적 삭제 보장 |
| timeout fixture 테스트 | 30분 경과 → timeout + Cold Start. 29분 59초 → active run 유효 검증 |
| cleanup set 원자성 검증 기준 | blocker #17 (Cleanup Set Atomicity) · blocker #22 (Result Derivation Loading) ADR-B key 그룹핑 기준 |

### Phase 3이 Phase 1, 2에 주는 설계 제약

Phase 1의 `VariantId` brand type이 storage key prefix로 사용된다. `VariantId`를 brand type으로 강하게 정의해두면 Phase 3 storage 격리 구현이 타입 수준에서 강제된다.

### Phase 3 완료 후 Phase 4가 안전하게 전제할 수 있는 것

- `validateVariant` 실패 → session 생성 없이 에러 복구 페이지 이동 가능
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
- `vivetest-landing-ingress:{variant}` 레코드는 현재 landing runtime에서 `{ variant, preAnswerChoice, createdAtMs, landingIngressFlag }` 형태로 저장된다. `createdAtMs` 필드는 `beginLandingTransition()` → `writeLandingIngress()` 경로에서 기록되며, Phase 4 Gate A-2의 전제 조건은 현재 코드베이스에서 이미 충족된 상태다.
- 만약 `createdAtMs` 구조 변경이 필요하다고 판단되면 Phase 4 착수를 멈추고 landing 계약과의 충돌을 별도 확인한 뒤 재개한다.

#### A-3. Cross-phase Event Integrity 픽스처 소유권 확인

- blocker #28(`attempt_start` cross-phase integrity) 단언은 blocker #15(Landing Requirements §14.2 check 15)의 픽스처를 공유한다.
- Phase 4 telemetry/integrity 픽스처는 **user-facing scoring label**과 **telemetry canonical index**를 같은 시나리오에서 분리 검증해야 한다. profile question이 있는 fixture를 최소 1개 포함한다.

| 확인 항목 | 결정 기준 |
|---|---|
| 공유 픽스처 파일 경로 | `tests/` 하위 landing fixture 경로 또는 신규 shared fixture 경로 중 하나로 확정 |
| 소유 모듈 | landing fixture가 blocker #15 단언을 포함하면 Phase 4에서 import. 없으면 Phase 4에서 공유 픽스처 생성 후 blocker #15 단언도 함께 포함 |
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

- [x] Phase 2에서 `validateCrossSheetIntegrity()` 2-source pure helper 도입 완료 여부 확인
- [x] `validateCrossSheetIntegrity()`를 Results source 포함 3-source 검증과 runtime 호출부에 연결 완료 여부 확인
- [x] test route가 runtime blocked set 확인 및 entry resolver를 통해 2차 방어선을 타는지 확인
- [x] Group B-2 GitHub Action 스크립트가 동일 helper를 pre-commit 차단 함수로 호출하는지 확인. 현재 Results Sheets 미준비 상태에서는 `validateCrossSheetIntegrity(landingTestVariants, questionVariants)` 2-source 모드이며, Results 준비 완료 시 3-source 모드로 전환한다.
- [ ] `adapter.ts`의 malformed → empty string/zero normalization이 Phase 2 validator와 역할 분리 완료 여부 확인
- [ ] 미완료 시: Phase 9 구현 범위에서 adapter tolerant 정책과 validator의 경계를 명시한 뒤 착수. 두 레이어가 동일 데이터를 서로 다른 방식으로 처리하는 상태를 Phase 9 내부에 남기면 안 된다.

---

### Gate C — Phase 11 착수 전 확인 (Telemetry Contract · Release Gate)

> Phase 10 완료 후, Phase 11 착수 전에 아래 인프라 항목이 모두 준비되어 있어야 한다.

#### C-1. blocker-traceability.mjs 상한 확장

- [x] `check-blocker-traceability.mjs` coverage 상한이 `1~30`으로 확장되어 있음
- [x] mixed-evidence registry(`automated_assertion` / `scenario_test` / `manual_checkpoint`)가 `docs/blocker-traceability.json`에 반영되어 있음
- [x] Phase 11 executable-only closure 기준으로 future blocker entry를 재분류할 타이밍과 책임자 기록 완료.
  **현재 상태(2026-04-23)**: blocker 20~23은 `tests/e2e/consent-smoke.spec.ts` automated assertion으로 전환됐다.
  blocker 24, 25, 26, 27, 28, 30에는 manual checkpoint가 남아 있고, blocker 27, 28, 29, 30은 추가 automated evidence도 함께 가진 mixed-evidence 상태다.
  남은 manual checkpoint의 재분류 책임은 해당 Phase 첫 커밋 작성자가 진다. 재분류 불가 항목은 `reason` 필드로 기록하고 `manual_checkpoint`를 유지한다.
- 미완료 시: pre-start traceability scaffolding까지만 확보된 상태로 남고 Phase 11 final closure 해석이 drift할 수 있다.

#### C-2. test-flow telemetry hook 검사 추가

- [ ] `check-phase11-telemetry-contracts.mjs`에 test flow §9.1의 6개 hook 검사 추가 완료
- [ ] 추가 대상 Phase 확정 및 기록 완료 (Phase 11 착수 시점을 기본값으로 한다)
- 미완료 시: Phase 11 DoD의 "§9.1 hook 6개 위치 확보 누락 0건" 항목을 자동으로 단언할 수 없음.

#### C-3. `session_id` non-null 단언 검증

- [ ] `validateTelemetryEvent()` 또는 동등한 검증 함수에서 `attempt_start` 이후 이벤트에 대해 `session_id !== null` 단언 추가 완료
- [ ] e2e smoke에서 session_id non-null 직접 단언 추가 완료
- 근거: `req-test.md §9.2` transport-patch 계약. blocker #18의 telemetry 전체 closure를 넓히기 위한 전제 조건.

#### C-4. `landing_view` 발화 타이밍 비대칭 해석 규칙

- [ ] blocker #28 픽스처 설계에 아래 해석 규칙이 반영되어 있는지 확인
  - `landing_view`는 telemetry consent sync 이후에만 발화한다. `card_answered` · `attempt_start`와 발화 시점 기준이 다르다.
  - cross-phase event integrity 분석 시 `landing_view`는 분모(세션 수 기준)에서 제외한다.
  - `attempt_start.question_index_1based`와 향후 `question_answered.questionIndex`는 canonical index 기준이다. user-facing `Q1/Q2`는 scoring order label이므로 픽스처 expectation을 동일 값으로 두면 안 된다.
  - 근거: `req-test.md §9.1` hook 1 주석, `§9.2` transport-patch 계약.

---

*이 문서는 `docs/req-test.md`를 단일 SSOT로 한다. 충돌 시 요구사항 문서 우선.*
