# P1: Release gate drift came from ignored baselines and adjacent unit drift

## 요약

P1은 telemetry/transition 런타임 자체가 틀렸다는 뜻이 아니었다.
현재 코드베이스를 다시 확인하면 short-expanded CSS 수정, `test-qmbti` / `qmbti` fixture 정렬,
theme representative helper 안정화는 이미 반영되어 있고 대표 Playwright 케이스도 통과한다.

실제 문제는 두 층으로 나뉘어 있었다.

1. Phase 11은 로컬 디스크에 snapshot PNG가 있으면 통과할 수 있었지만,
   그 파일들이 `.gitignore`에 가려져 저장소 진실로 승격되지 못했다.
2. 전체 release gate(`qa:gate:once`)는 Phase 11 외에도 `npm test`를 포함하므로,
   unit drift가 남아 있으면 여전히 빨간 상태였다.

## 현재 코드 기준 사실관계

- 현재 [package.json](/package.json) 의 `qa:rules`는 아래 순서로 실행된다.
  - `check-phase1-contracts.mjs`
  - `check-phase4-grid-contracts.mjs`
  - `check-phase5-card-contracts.mjs`
  - `check-phase6-spacing-contracts.mjs`
  - `check-phase7-state-contracts.mjs`
  - `check-phase8-accessibility-contracts.mjs`
  - `check-phase9-performance-contracts.mjs`
  - `check-phase10-transition-contracts.mjs`
  - `check-phase11-telemetry-contracts.mjs`
  - `check-blocker-traceability.mjs`
- `qa:static`은 `lint + typecheck + qa:rules`,
  `qa:gate:once`는 `qa:static + build + test + test:e2e:smoke`,
  `qa:gate`는 `qa:gate:once`를 3회 반복한다.
- 현재 [check-phase11-telemetry-contracts.mjs](/Users/woohyeon/Local/ViveTest/scripts/qa/check-phase11-telemetry-contracts.mjs) 는 telemetry 계약만이 아니라
  `tests/e2e/theme-matrix-smoke.spec.ts`, `tests/e2e/theme-matrix-manifest.json`,
  그리고 snapshot completeness까지 함께 검사한다.
- 현재 저장소에는 manifest naming과 맞지 않는 legacy theme baseline 12장이 추적돼 있었고,
  manifest가 실제로 요구하는 168장 theme baseline과 8장 safari baseline은 디스크에는 있어도 `.gitignore` 때문에 저장소에 드러나지 않았다.

## 핵심 해석

이 이슈의 본질은 “telemetry/transition 구현 미완료”가 아니라
아래 두 가지 저장소 드리프트가 동시에 release gate를 흔든 데 있다.

```text
1. Phase 11 green이 로컬의 ignored snapshot 파일 존재 여부에 의존했다.
2. 전체 gate는 unit drift까지 포함하므로 qa:rules만 green이어도 release-ready가 아니었다.
```

따라서 P1은 범위 정의 문제만도 아니고, 런타임 버그만도 아니다.
정확하게는 “현재 동작하는 테스트 상태가 저장소와 QA 문서에 제대로 반영되지 않은 상태”였다.

## 현재 정리 방향

- theme-matrix / safari baselines를 저장소에서 추적 가능한 자산으로 정리한다.
- Phase 11 QA에 representative test variant drift guard를 추가해 fixture 변경 시 조기 실패하게 만든다.
- `gnb-theme-transition` / `landing-card-contract` 같은 unit drift를 현재 runtime 계약에 맞춰 정리한다.
- 그 뒤 `qa:gate:once` 기준으로 다시 release-green 여부를 판단한다.


---

# P2: Ingress bootstrap no longer requires transition correlation


### 요약

landingIngress가 남아 있으면 Q2 시작은 허용한다.
pendingTransition은 Q2 시작의 필수 조건이 아니라, internal transition_complete 정리용 보조 상태다.


## 현재 구현된 코드와 로직

- [test-question-client.tsx](/src/features/landing/test/test-question-client.tsx:55) 의 `resolveQuestionBootstrapState()`는 `landingIngress` 존재 여부만으로 `landingIngressFlag`를 결정합니다.
- 같은 함수에서 `currentQuestionIndex`는 `landingIngress !== null`이면 바로 `2`, 아니면 `1`이 됩니다.
- 여기서 `pendingTransition`은 “Q2로 시작할지”를 결정하지 않고, 오직 `pendingTransitionToComplete`를 채워서 나중에 internal `transition_complete`를 닫는 데만 사용됩니다.
- [test-question-client.tsx](/src/features/landing/test/test-question-client.tsx:104) 마운트 시점 로직은 `readPendingLandingTransition()`과 `readLandingIngress(variant)`를 각각 읽고, 둘을 합쳐 bootstrap state를 만듭니다.
- [test-question-client.tsx](/src/features/landing/test/test-question-client.tsx:131) matching pending transition이 있으면 destination-ready 시점에 `completePendingLandingTransition()`을 호출해 pending transition만 정리합니다.
- [test-question-client.tsx](/src/features/landing/test/test-question-client.tsx:152) instruction이 닫히거나 생략되어 실제 test runtime이 시작되면 `trackAttemptStart()`를 발화하고, 그 직후에만 `consumeLandingIngress(variant)`를 수행합니다.
- 즉 현재 구현은 “pending transition이 이미 사라졌더라도 ingress record만 남아 있으면 Q2 시작을 허용”하는 구조입니다.
- [transition/runtime.ts](/src/features/landing/transition/runtime.ts:49) 랜딩 test 카드 A/B 선택 시점에 ingress record를 저장합니다.
- [transition/store.ts](/src/features/landing/transition/store.ts:20) 현재 `LandingIngressRecord`에는 `transitionId`가 없습니다. 저장되는 값은 `variant`, `preAnswerChoice`, `createdAtMs`, `landingIngressFlag`뿐입니다.
- 따라서 현재 구현에서는 ingress record 자체만으로는 “어떤 transition correlation에 묶여 있었는지”를 재검증할 수 없습니다.
- [test-question-bootstrap.test.ts](/tests/unit/test-question-bootstrap.test.ts) 테스트도 이 동작을 고정하고 있습니다. 테스트 이름 그대로 “pending transition이 없어도 ingress가 있으면 Q2에서 시작”하는 것을 기대합니다.


## 요구사항 문서에서 기술된 바

- [req-landing.md](/docs/req-landing.md:819) 13.4는 랜딩 Test 카드 A/B 선택 시 다음을 요구합니다.
- Q1 pre-answer 저장
- `variant + session` 단위 ingress flag 기록
- `/test/[variant]` 진입
- 그리고 ingress flag가 있으면 instructionSeen 여부와 무관하게 Q2부터 시작해야 한다고 명시합니다.
- 같은 13.4는 동일 variant 재진입에서도 ingress flag가 있으면 즉시 시작 + Q2 진입이 가능하다고 적고 있습니다.
- [req-landing.md](/docs/req-landing.md:844) 13.6은 pre-answer lifecycle 규칙으로 `read`와 `consume` 분리를 요구하고, `consume`은 instruction Start 직후 또는 그와 동등한 내부 `test_start` 시점에만 허용합니다.
- 그런데 같은 13.6에는 “`transition correlation + landing ingress flag` 없는 유입에 pre-answer 적용 금지”라는 문구가 남아 있습니다.
- 이 문구를 문자 그대로 읽으면, ingress flag만 있고 transition correlation이 사라진 상태에서는 Q2 시작을 허용하면 안 되는 것으로 해석될 수 있습니다.
- [req-landing.md](/docs/req-landing.md:898) 14.3 QA matrix는 ingress flag 기록, Q2 시작/표시, consume 시점, rollback 3케이스, `start=1 -> terminal=1` 상호배타를 release-blocking으로 둡니다.
- [req-landing.md](/docs/req-landing.md:907) 같은 QA matrix는 `card_answered`와 `attempt_start`의 cross-phase integrity도 요구합니다.
- [requirements.md](/docs/requirements.md:271) 전역 요구사항은 `card_answered`, `attempt_start`, `final_submit`를 현재 global minimum으로 두고 있지만, “orphan ingress를 허용할지” 자체를 별도로 해석해 주지는 않습니다.
- [req-test.md](/docs/req-test.md:152) 다음 Phase 문서는 landing ingress를 staged entry 관점에서 설명하면서 `card_answered`는 landing phase 이벤트이고, test flow는 그 결과를 이어받는다고 적고 있습니다.
- [req-test.md](/docs/req-test.md:1124) 또한 ingress 경로에서는 `card_answered -> attempt_start(question_index_1based=2)` 정합성을 요구합니다.


## 핵심 충돌 지점

- 현재 코드 해석:
`landingIngress`만 남아 있으면 Q2 시작 허용
- 문서 해석 1:
13.4 기준으로 보면 현재 코드가 맞음
- 문서 해석 2:
13.6의 `transition correlation + landing ingress flag` 문구를 엄격히 적용하면 현재 코드는 완전히 맞다고 보기 어려움

## 추가 질문

1. ingress 기반 Q2 시작의 권위를 `landingIngress` 단독으로 볼지, 아니면 `transition correlation`까지 남아 있어야 한다고 볼지
2. 현재 v4 방향을 유지한다면 [req-landing.md](/docs/req-landing.md) 13.6의 correlation 문구를 삭제/완화해야 하는지
3. 반대로 문서를 유지한다면, ingress record에 correlation을 다시 저장하거나 orphan ingress 무효화 규칙을 추가해야 하는지

---

# P3: session_id semantics are still split across the active docs

## 요약

현재 구현은 session_id를 transport 시점에 보장하는 모델이다.
이벤트는 pre-sync 상태에서 session_id=null로 생성·큐잉될 수 있고,
실제 전송 직전에 session_id를 patch한다.
requirements.md는 이 모델을 명시적으로 허용하지만,
req-landing.md는 이를 같은 수준으로 풀어 쓰지 않아
리뷰어가 “session_id가 처음부터 필수인지”를 다르게 해석할 여지가 있다.


## 현재 구현된 코드와 로직

- [types.ts](/src/features/landing/telemetry/types.ts#L11) 에서 공개 telemetry 공통 타입 `TelemetryBaseEvent`의 `session_id`는 `string | null`로 정의돼 있습니다.
- 즉 타입 수준에서는 이벤트 객체가 생성되는 초기 시점에 `session_id=null`을 허용하고 있습니다.
- [runtime.ts](/src/features/landing/telemetry/runtime.ts#L146) 의 `createBaseEvent()`는 이벤트 생성 시 `session_id: runtimeState.sessionId`를 넣습니다.
- [runtime.ts](/src/features/landing/telemetry/runtime.ts#L44) 초기 런타임 상태에서 `runtimeState.sessionId`는 `null`입니다.
- [runtime.ts](/src/features/landing/telemetry/runtime.ts#L166) consent source가 아직 sync되지 않았으면 `runtimeState.sessionId`는 계속 `null`로 유지됩니다.
- [runtime.ts](/src/features/landing/telemetry/runtime.ts#L92) `canSendToNetwork()`는 아래 3조건이 모두 맞아야만 `true`입니다.
  - consent sync 완료
  - `consent_state === OPTED_IN`
  - `runtimeState.sessionId !== null`
- [runtime.ts](/src/features/landing/telemetry/runtime.ts#L129) `enqueueOrSend()`는 전송 조건이 안 맞으면 이벤트를 바로 보내지 않고 큐에 넣습니다.
- [runtime.ts](/src/features/landing/telemetry/runtime.ts#L109) `flushQueue()`는 나중에 전송 가능 상태가 되면 큐에 있던 이벤트를 꺼내고,
- [validation.ts](/src/features/landing/telemetry/validation.ts#L111) `patchTelemetryEventForTransport()`로 `session_id`와 `consent_state`를 transport 직전에 다시 덮어씁니다.
- [validation.ts](/src/features/landing/telemetry/validation.ts#L11) `validateTelemetryEvent()`는 `event_id`, `ts_ms`, `route`, `consent_state`는 검사하지만, `session_id !== null`은 강제하지 않습니다.
- 따라서 현재 구현은 아래 방식으로 동작합니다.

```text
1. 이벤트 객체는 session_id=null 상태로 먼저 만들어질 수 있다.
2. 전송 불가 상태이면 큐에 보관한다.
3. 나중에 consent/session이 준비되면 transport 직전에 session_id를 patch한다.
4. session_id를 끝내 만들 수 없으면 네트워크 전송은 하지 않는다.
```

### 현재 테스트가 고정하고 있는 동작

- [landing-telemetry-runtime.test.ts](/tests/unit/landing-telemetry-runtime.test.ts#L55) 는 `UNKNOWN` 상태에서 발생한 이벤트가 큐에 쌓였다가 `OPTED_IN` 전환 후 flush되는 것을 검증합니다.
- [landing-telemetry-runtime.test.ts](/tests/unit/landing-telemetry-runtime.test.ts#L95) 는 persisted consent가 없으면 `sessionId=null`인 채로 전송이 막히고 큐만 쌓이는 것을 검증합니다.
- [landing-telemetry-runtime.test.ts](/tests/unit/landing-telemetry-runtime.test.ts#L120) 는 랜덤 소스가 없어 `sessionId`를 만들 수 없는 경우에도 `OPTED_IN` 이후 전송을 막고 큐만 유지하는 것을 검증합니다.

### 현재 구현 요약

현재 구현은 “모든 이벤트 객체가 처음부터 session_id를 가져야 한다”가 아니라,
“실제 네트워크로 나가는 시점에는 session_id가 있어야 한다”는 모델에 가깝다.

## 요구사항 문서에서 기술된 바

### req-landing.md

- [req-landing.md](/docs/req-landing.md#L720) 12.1은 `OPTED_IN`에서만 네트워크 전송 허용, `UNKNOWN/OPTED_OUT`에서는 로컬 큐 보관 가능이라고 적고 있습니다.
- [req-landing.md](/docs/req-landing.md#L732) 12.2는 “공통 필수 필드(모든 전송 이벤트)”에 `session_id`를 포함합니다.
- [req-landing.md](/docs/req-landing.md#L766) 12.5는 익명 ID 정책을 설명하면서,
- [req-landing.md](/docs/req-landing.md#L770) 랜덤 소스가 모두 불가한 환경에서는 `session_id`를 생성하지 않는다고 적습니다.
- [req-landing.md](/docs/req-landing.md#L772) 그리고 그런 환경에서는 클라이언트 전송을 금지한다고 적습니다.

이 문서만 보면 자연스러운 해석은 다음과 같습니다.

```text
네트워크로 실제 전송되는 이벤트에는 session_id가 반드시 있어야 한다.
단, 전송 이전 로컬 큐 단계의 중간 이벤트 객체가 session_id=null일 수 있는지까지는 명시하지 않는다.
```

### requirements.md

- [requirements.md](/docs/requirements.md#L294) 는 active landing/test SSOT가 우선이라고 적고 있습니다.
- [requirements.md](/docs/requirements.md#L297) 전역 payload requirements는 공통 필수 필드에서 `session_id`를 분리해 적습니다.
- [requirements.md](/docs/requirements.md#L299) 는 `session_id`가 consent/session이 준비되면 transport 단계에서 patch되며, pre-sync queued event는 `session_id=null`에서 시작할 수 있다고 명시합니다.

이 문서는 해석이 훨씬 더 구체적입니다.

```text
이벤트 객체 생성 시점에는 session_id=null 허용
실제 transport 시점에 session_id를 채워 넣는 구조 허용
```

### req-test.md

- `req-test.md`에서는 `session_id`에 대한 직접 규정을 찾지 못했습니다.
- 따라서 P3 쟁점에 대해서는 현재로서는 [req-landing.md](/docs/req-landing.md) 와 [requirements.md](/docs/requirements.md) 의 해석 차이가 핵심입니다.

## 가장 중요한 핵심 충돌 지점

req-landing은 “전송 이벤트에는 session_id가 필수”라고 말하고,
requirements는 “pre-sync 이벤트는 session_id=null로 시작해도 된다”고 더 명시적으로 말한다.


이 충돌을 조금 더 풀면:

- 현재 구현은 [runtime.ts](/src/features/landing/telemetry/runtime.ts#L150), [runtime.ts](/src/features/landing/telemetry/runtime.ts#L129), [validation.ts](/src/features/landing/telemetry/validation.ts#L111) 기준으로 `requirements.md`의 모델을 따르고 있습니다.
- 반면 [req-landing.md](/docs/req-landing.md#L732) 는 “전송 이벤트”라는 말을 쓰고 있어, 엄밀히 보면 구현과 직접 충돌한다고 단정할 정도는 아닐 수 있습니다.
- 하지만 이 문서만 읽는 리뷰어는 “공개 telemetry 이벤트의 공통 필수 필드에 session_id가 있으니 validate 단계에서도 null이면 안 된다”고 해석할 여지가 있습니다.
- 실제 코드에서는 [validation.ts](/src/features/landing/telemetry/validation.ts#L54) 가 `session_id`의 non-null을 강제하지 않기 때문에, 그 해석과는 다릅니다.

즉 P3의 본질은 런타임 오동작보다는 아래 문제입니다.

```text
“session_id 필수”의 적용 시점이
문서에서는 완전히 단일 문장으로 닫혀 있지 않고,
구현은 transport 시점 필수 모델로 굳어져 있다.
```

## 추가 질문

1. `session_id`의 필수성은 “이벤트 객체 생성 시점”부터 적용돼야 하는가, 아니면 “실제 네트워크 전송 시점”에만 적용되면 충분한가?

2. 현재 구현처럼 `session_id=null`인 pre-sync 이벤트를 큐에 두고, transport 직전에 patch하는 모델이 제품/분석/개인정보 관점에서 허용 가능한가?

3. [req-landing.md](/docs/req-landing.md) 12.2에 “모든 전송 이벤트”라고 적은 표현만으로 충분한가, 아니면 [requirements.md](/docs/requirements.md) 처럼 “queued pre-sync events may originate with session_id=null”을 명시적으로 추가해야 하는가?

4. 검증 계층인 [validation.ts](/src/features/landing/telemetry/validation.ts) 가 현재처럼 `session_id !== null`을 강제하지 않는 것이 맞는가, 아니면 transport 직전 검증과 생성 시점 검증을 분리해야 하는가?

5. 랜덤 소스가 불가한 환경에서 현재처럼 “큐 적재는 허용하지만 전송은 영구 차단”하는 정책이 맞는가, 아니면 이런 경우에는 아예 이벤트 객체 생성 자체를 막는 편이 더 명확한가?

6. 외부 리뷰 기준에서 이 이슈를 “문서 정합성 문제”로 볼지, 아니면 “validation contract가 문서보다 느슨한 구현 문제”로 볼지 어느 쪽이 더 정확한가?
