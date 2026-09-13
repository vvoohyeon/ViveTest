# IA 재설계가 건드리는 계약 지도

분석 대상 clone: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (HEAD=`7616211`, 착수 마커 커밋 — 내용은 `a5aec95`와 동일). 모든 `file:line`은 이 체크아웃 기준이며 읽은 것만 인용했다. 읽지 않았거나 실행으로 확인하지 못한 것은 각 항목에 **미확인**으로 표시했다.

---

## 0. 한 줄 요약 — 자유의 실제 폭

라우팅 계약은 생각보다 **얇고**, 화면 전환 계약(transition)은 생각보다 **좁고**(랜딩→테스트/블로그 단 하나), 텔레메트리는 화면 전환에 거의 묶여 있지 **않다**(6개 중 화면 전환에 묶인 것은 `card_answered` 하나뿐). 대신 IA 변경을 실제로 비싸게 만드는 것은 ①`theme-matrix-manifest.json`의 **전수 폐포(exhaustive closure) 게이트**와 ②요구사항 문서에 박힌 **"별도 route가 아니다" / "닫기 경로는 …만 허용한다"** 같은 배타적 조항 두 가지다.

---

## 1. 새 모바일 전용 라우트를 추가하려면 무엇을 고쳐야 하는가

### 1-1. 고쳐야 하는 지점 — 전량 (실행 순서대로)

| # | 파일 | 줄 | 무엇을 | 왜 |
|---:|:---|:---|:---|:---|
| 1 | `src/app/[locale]/<새경로>/page.tsx` | 신규 | 페이지 파일 생성 | `scripts/qa/check-phase1-contracts.mjs:26-32` — 모든 `page.tsx`는 `src/app/[locale]/**` 아래여야 한다. `src/app/m/...` 같은 **locale 밖 모바일 전용 트리는 이 가드가 즉시 막는다** |
| 2 | `src/lib/routes/route-builder.ts` | `1-29` (`LocaleFreeRoute` 유니온), `31-46` (개별 타입), `48-73` (`RouteBuilder`), `75-85` (`buildLocaleFreePath`) | 유니온 멤버 + 타입 + 팩토리 메서드 + 동적 세그먼트라면 `buildLocaleFreePath` 분기 | §5.4가 "경로 문자열 수동 결합 금지, RouteBuilder만 사용"을 못박는다 (`docs/req-landing.md:151`) |
| 3 | `src/i18n/localized-path.ts` | `7-15` (`LocalizedRoutePathFor` 조건부 타입 체인) | 동적 세그먼트를 가진 새 경로면 조건부 분기 1개 추가 | 조건부 타입이 `'/blog/[variant]'`·`'/test/[variant]'`·`'/test/error'`를 **리터럴로 하드코딩**해 놓았다. 새 동적 경로가 이 체인에 없으면 `` `/${AppLocale}${Pathname}` `` 폴백으로 떨어져 `/en/x/[variant]` 같은 **틀린 타입**이 나온다 (런타임은 `buildLocaleFreePath`가 맞게 만들지만 타입만 어긋난다) |
| 4 | `src/i18n/proxy-policy.ts` | `11` (`allowlistPattern`) | locale-less 진입을 허용할 경로면 정규식 추가 | 허용목록에 없으면 `isAppOwnedPath`(`17-19`)가 false → `/_not-found` rewrite. §5.3이 허용목록을 `/blog`·`/blog/[variant]`·`/history`·`/test/[variant]` 넷으로 고정한다 (`docs/req-landing.md:139`) → **요구사항 개정 필요** |
| 5 | `next.config.ts` | `7` `typedRoutes: true` | 설정 변경은 **불필요**. `npm run typecheck`가 `next typegen`을 선행 실행한다 (`package.json:11`) | 재생성 결과는 `.next/types/routes.d.ts:4`의 `AppRoutes` 유니온 |
| 6 | `src/app/[locale]/layout.tsx` | `11` `dynamicParams = false`, `13-15` `generateStaticParams` | **손댈 필요 없음**(아래 1-2 참조) | |
| 7 | `tests/unit/route-builder.test.ts` `:6-24`, `tests/unit/localized-path.test.ts` `:7-15` | 기존 | 새 경로 단언 추가 | 두 테스트가 6개 route를 **전수 열거**한다 |
| 8 | `tests/e2e/routing-smoke.spec.ts` | `53-73` | 허용목록 리다이렉트 스모크에 새 경로 추가 | `@smoke` |
| 9 | `tests/e2e/theme-matrix-manifest.json` + PNG 베이스라인 | `12-33` `closure`, `35-72` `layoutCases`, `73-` `stateCases` | 케이스 등록 + 폐포 등록 + PNG 정확한 개수 | 아래 1-3. **가장 비싼 항목** |
| 10 | `docs/req-landing.md` §5.3/§5.4/§5.5 | `130-176` | 허용목록·RouteBuilder 열거·404 전략 갱신 | 계약 개정 (사용자 결정 1) |

### 1-2. `dynamicParams = false`는 새 라우트를 막지 않는다

`export const dynamicParams = false`와 `generateStaticParams()`는 **`src/app/[locale]/layout.tsx:11,13-15` 한 곳에만** 선언돼 있고, 저장소 전체에서 `generateStaticParams`/`dynamicParams` 선언은 이 두 줄이 전부다(`grep` 결과 2건). 즉 제약은 **`[locale]` 세그먼트에만** 걸려 있고 — 12개 locale 밖의 locale 값은 404 — `[variant]` 등 하위 동적 세그먼트에는 `generateStaticParams`가 없어 **이미 완전히 동적**이다. 새 모바일 전용 경로를 `[locale]` 아래 어디에 추가하든 이 두 줄은 그대로 둔다. (`src/app/[locale]/blog/[variant]/page.tsx`·`test/[variant]/page.tsx`에 `generateStaticParams`가 없다는 것이 그 증거다.)

### 1-3. typedRoutes의 실제 보호 강도 — 최상위 한 세그먼트는 사실상 무검사

`.next/types/link.d.ts:36-42`의 `DynamicRoutes`는 다음과 같다.

```text
| `/${SafeSlug<T>}`
| `/${SafeSlug<T>}/blog`
| `/${SafeSlug<T>}/blog/${SafeSlug<T>}`
| `/${SafeSlug<T>}/history`
| `/${SafeSlug<T>}/test/${SafeSlug<T>}`
| `/${SafeSlug<T>}/test/error`
```

첫 줄 때문에 **`/` 뒤 단일 세그먼트는 무엇이든 타입 통과한다**(`[locale]`이 최상위 동적 세그먼트라서). 반면 `/{locale}/settings` 같은 2단 경로는 위 유니온에 없으므로 타입 에러가 난다. 결론: 모바일 전용 화면을 `/{locale}/xxx`로 만들면 typedRoutes가 실제로 잡아 주고, `/xxx`(locale 없는 최상위)로 만들면 **타입은 통과하지만 `proxy-policy.ts:11` 허용목록이 런타임에서 404로 떨군다** — 실패가 컴파일이 아니라 런타임으로 밀린다. 새 최상위 경로는 피하는 편이 안전하다.

### 1-4. 새 라우트/새 화면이 치르는 시각 베이스라인 비용 (실측)

`scripts/qa/check-phase11-telemetry-contracts.mjs:40-58,353-365`가 매니페스트로부터 기대 PNG 집합을 **정확히 계산**해 파일 목록과 **완전 일치**를 강제한다(`assertExactSnapshotSet`, `67-86`: 누락·초과·개수 셋 다 fail). 현재 디스크: `tests/e2e/theme-matrix-smoke.spec.ts-snapshots/*.png` = **164장**, `safari-hover-ghosting.spec.ts-snapshots` = **5장**, `state-smoke.spec.ts-snapshots` = **1장** (합 170, 실행 확인).

- 매니페스트 전수 폐포는 `layoutCases` 4건 × 2 locale × 2 theme × 6 viewport = 96, `stateCases` 13건(뷰포트 합 17) × 2 × 2 = 68 → 164. 계산이 디스크 수와 정확히 일치한다.
- **새 화면을 layout case로 등록하면 +24장**(6 viewport × 2 × 2), **모바일 전용 state case로 등록하면 +4장**(1 viewport × 2 × 2).
- 새 상호작용 상태(바텀시트 열림 등)를 캡처하려면 `check-phase11...mjs:103-113`의 `allowedSettleRecipes` 9개 집합에 **레시피 이름을 추가**해야 하고, 동시에 `tests/e2e/theme-matrix-smoke.spec.ts`에 그 레시피의 settle 절차를 구현해야 한다.
- 베이스라인 재생성은 `qa:visual:full`(`package.json:22`)이고 `AGENTS.md` §4 Hard stops가 **사람 승인 없이 실행 금지**로 묶어 둔 유일한 항목이다.

---

## 2. transition 계약이 가정하는 「어느 화면에서 어느 화면으로」

### 2-1. 가정의 전량

transition은 **범용 화면 전환 시스템이 아니다**. `PendingLandingTransition.targetType`이 `'test' | 'blog'` 리터럴 유니온으로 못박혀 있다 (`src/features/transition/store.ts:15`). 즉 계약이 아는 전환은 정확히 두 가지다.

| 출발 | 도착 | 생성물 | 완료 판정 위치 |
|:---|:---|:---|:---|
| 랜딩 카드 Expanded A/B | `/{locale}/test/{variant}` | pending transition + return scrollY + landing ingress + `card_answered` | `src/features/test/use-landing-transition-completion.ts:24-29` (runtimeReady + rAF) |
| 랜딩 블로그 카드 전체 | `/{locale}/blog/{variant}` | pending transition + return scrollY + 내부 signal만 | `src/features/blog/blog-destination-client.tsx:89-108` (route model ready + rAF) |

계약 문장: `docs/req-landing.md:881` — "Test card transition은 pending transition + return scroll + landing ingress + `card_answered`를 생성한다. Blog transition은 … landing ingress와 `card_answered`를 생성하지 않는다."

### 2-2. 「출발은 항상 랜딩」이 코드에 하드코딩된 4곳

1. `src/features/transition/use-landing-transition.ts:23,47` — 목적지 경로를 `RouteBuilder.question()` / `RouteBuilder.blogArticle()`로만 만든다. 다른 목적지를 만들 API가 없다.
2. `src/features/transition/transition-gnb-overlay.tsx:19,30` — pending이 있는 동안 **항상 `context="landing"` GNB를 오버레이**로 덮는다. 출발 화면이 랜딩이 아니면 이 오버레이는 틀린 GNB를 그린다.
3. `src/features/transition/runtime.ts:50` — `saveLandingReturnScrollY(window.scrollY, …)`. 복귀 대상이 랜딩 한 곳뿐이라고 가정한다(`SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y` 단일 키, `storage-keys.ts:58`).
4. `src/features/landing/landing-runtime.tsx:67-77` — 랜딩에 pending이 남아 있으면 **무조건 `USER_CANCEL`로 종료**한다. "랜딩에 도착했다 = 전환이 취소됐다"는 등식이다.

### 2-3. 바텀시트·전용 상세 화면을 넣으면 깨지는가

| 도입 형태 | 깨지는가 | 근거 |
|:---|:---|:---|
| **같은 라우트 안의 바텀시트**(URL 불변) | **깨지지 않는다.** transition은 전혀 개입하지 않는다 | pending transition은 `router.push` 직전에만 쓰인다 (`use-landing-transition.ts:24-39`). URL이 안 바뀌면 `TransitionRuntimeMonitor`(`transition-runtime-monitor.tsx:14-31`)의 1600ms 타임아웃도 시작되지 않는다 |
| **바텀시트를 새 라우트로**(예: `/{locale}/card/{variant}`) | **깨진다 — 4곳 전부** | `targetType` 유니온(`store.ts:15`)·`completePendingLandingTransition({targetType})`(`runtime.ts:80-84`)이 도착 화면 종류를 요구한다. 세 번째 값을 넣지 않으면 `targetType !== input.targetType`으로 **complete가 영원히 안 나고 1600ms 뒤 `DESTINATION_TIMEOUT` fail**로 떨어진다 |
| **테스트 스텝 분할**(문항 화면을 라우트로 쪼갬) | **직접은 안 깨지되 완료 판정이 이동한다** | 완료 판정이 `runtimeReady` 시점(`use-landing-transition-completion.ts:19`)인데 첫 문항 라우트가 따로 생기면 "destination ready"의 정의(`docs/req-landing.md:678`)를 다시 써야 한다 |
| **전용 결과 화면 라우트**(`/result/...`) | **transition 계약 밖**이다 | 현재 결과는 같은 라우트 안 패널이다 (`src/features/test/test-question-client.tsx:281-290`, `submitted ? <ResultConnector …>`). 전환이 아니라 상태 토글 |

### 2-4. 부수 발견 — GNB는 라우트 간에 살아남지 않는다

`SiteGnb`는 `PageShell` 안에 있고(`src/features/landing/shell/page-shell.tsx:21`), `PageShell`은 **각 page.tsx가 개별적으로 렌더**한다(`[locale]/page.tsx:26`, `blog/page.tsx:25`, `blog/[variant]/page.tsx:50`, `history/page.tsx:34`, `test/[variant]/page.tsx:54`, `test/error/page.tsx:38` — 6곳 전부). `[locale]/layout.tsx`에 GNB가 없으므로 라우트가 바뀌면 **GNB는 언마운트·재마운트된다**. `TransitionGnbOverlay`가 존재하는 이유가 정확히 이 공백을 가리기 위해서다(§13.3 "source GNB는 목적지 진입 완료 전까지 유지한다", `docs/req-landing.md:870`). 모바일 표준인 **지속되는 하단 탭바/앱바를 도입하려면 GNB를 `[locale]/layout.tsx`로 올려야 하고, 그 순간 `TransitionGnbOverlay` 전체가 불필요해진다** — Ask-First 경로 2개(`[locale]/layout.tsx`, GNB)를 동시에 건드리는 변경이다.

---

## 3. 텔레메트리 이벤트 전량과 화면 결합도

### 3-1. 이벤트 6개 (`src/features/telemetry/types.ts:5-11`)

| 이벤트 | 발화 지점 (file:line) | 화면 전환에 묶였나 | IA가 바뀌면 |
|:---|:---|:---|:---|
| `landing_view` | `src/features/landing/landing-runtime.tsx:84` — 랜딩 마운트 + consent synced | **아니오** (마운트) | `pathname` 기준 dedupe(`telemetry/runtime.ts:238`) 때문에 **랜딩이 여러 모바일 라우트로 쪼개지면 각 경로가 별도 `landing_view`를 낸다** — 지금은 "랜딩 1회"(`docs/req-landing.md:777`)가 깨진다 |
| `card_answered` | `src/features/transition/runtime.ts:62` — `beginLandingTransition` 안, `targetType==='test' && preAnswerChoice` | **예 — 유일하게 화면 전환에 묶인 이벤트** | 카드 A/B를 **라우팅 없이** 바텀시트 안에서 받고 나중에 이동시키면 발화 시점이 전환에서 분리된다. `target_route`(`types.ts:30`)가 필수 필드라 **이동 전에 목적지를 알아야** 한다 |
| `attempt_start` | `src/features/test/use-test-run-controller.ts:113` | 아니오 (runtime entry commit 후 첫 scoring 문항 렌더) | 문항을 라우트로 쪼개도 의미는 유지된다. 다만 §9.1 hook 2(`docs/req-test.md:1133`)가 "첫 scoring runtime question이 실제로 렌더되는 시점"으로 규정 |
| `question_answered` | `src/features/test/use-answer-handler.ts:71` | 아니오 (답변 클릭) | 스텝 분할해도 발화 지점은 같다. `question_index_1based`가 **visible scoring-order ordinal**(canonical 아님, `docs/req-test.md:1141` 비전환 원칙)이라 문항 표시 순서를 바꾸면 **지표 축 자체가 바뀐다** |
| `final_submit` | `src/features/test/use-test-run-controller.ts:250` | 아니오 (Submit 액션) | §9.2(`docs/req-test.md:1154`)가 이미 "result screen entry commit 시점으로 재정렬해야 한다"고 예고 — 결과를 별도 화면으로 분리하면 **이 재정렬이 강제된다** |
| `result_viewed` | `src/features/test/test-result-panel.tsx:64` — 패널 **mount** 시 1회 | 아니오 | 현재 라우트 이동 없이 같은 화면에서 발화. 결과를 전용 라우트로 옮기면 §9.1 hook 5(`docs/req-test.md:1136`)가 요구하는 **IntersectionObserver 1회 후 disconnect** 형태로 교체해야 하고, `validation.ts:110-122`의 post-attempt session-id 요구 집합에도 `result_viewed`를 넣어야 한다(현재 TODO로 빠져 있음) |

### 3-2. 전송되지 않는 내부 신호 4개 (텔레메트리와 구분)

`transition_start` / `transition_complete` / `transition_fail` / `transition_cancel` (`src/features/transition/signals.ts:8-11`). `docs/req-landing.md:783,882`가 **네트워크 전송 금지**를 명시하고, `validation.ts:6`의 `LEGACY_FORBIDDEN_FIELD_PATTERN`이 `transition_id`·`result_reason`·`final_q1_response` 키를 **payload에서 거부**한다. `check-phase11...mjs:146-148`이 `trackTransition*` 헬퍼 존재 자체를 fail시킨다. IA가 바뀌어도 이 경계는 유지 대상이다.

### 3-3. IA 변경이 텔레메트리에 강제하는 것 — 정리

1. **`route` 필드가 전 이벤트 공통 필수**(`types.ts:19`, `validation.ts:29-31`: `/`로 시작해야 함)이고 값은 호출부의 `usePathname()`이다. **라우트를 늘리면 같은 이벤트가 여러 `route` 값으로 흩어진다** — 분석 축이 바뀐다.
2. `landing_view` dedupe 키가 `` `${locale}:${route}` ``(`runtime.ts:238`)이므로 **랜딩을 스텝/시트로 쪼개도 URL만 안 바뀌면 dedupe가 유지된다**. URL을 바꾸면 깨진다.
3. 이벤트 **타입 집합 자체는 `validation.ts:7-14`의 배열과 `types.ts:5-11`의 유니온 두 곳에 이중으로 열거**돼 있다. 새 이벤트(예: `sheet_opened`)를 추가하려면 두 곳 + `check-phase11...mjs:135-144`의 헬퍼 존재 검사 + `docs/req-landing.md:776-785` V1 이벤트셋을 같이 고쳐야 한다. 단 §12.1(`:772,784`)이 "비필수 상호작용 로그 미수집"과 "`expanded/tap 토글` 기본 미수집"을 못박으므로 **시트 열림 같은 이벤트는 요구사항 개정 없이는 추가 불가**.

---

## 4. storage / 세션 계약이 화면 구성을 가정하는 지점

### 4-1. 키 전량

| 저장소 | 키 | 선언 | 화면 가정 |
|:---|:---|:---|:---|
| local | `vivetest-theme` | `storage-keys.ts:19` | 없음 |
| local | `vivetest-telemetry-consent` | `storage-keys.ts:25` | 없음 (단 §13.5 instruction 표가 consent × attribute × ingress 8행을 **오버레이 화면 구성**으로 규정, `docs/req-landing.md:921-934`) |
| local | `vivetest-telemetry-session-id` | `storage-keys.ts:31` | 없음 |
| session | `vivetest-current-path` / `vivetest-previous-path` | `storage-keys.ts:40,46` | **있음 — 아래 4-2** |
| session | `vivetest-landing-pending-transition` | `storage-keys.ts:52` | **있음** — `targetType: 'test'\|'blog'`(`store.ts:15`)이 도착 화면 종류를 **두 가지로 고정** |
| session | `vivetest-landing-return-scroll-y` | `storage-keys.ts:58` | **있음** — 복귀 대상이 랜딩 **한 화면**이라고 가정한 단일 스칼라. 모바일 전용 중간 화면이 생기면 "어느 화면의 스크롤인가"를 표현할 수 없다 |
| session | `vivetest-landing-return-variant` | `storage-keys.ts:64` | 있음 — 복귀 시 복원할 **카드 1개** |
| session | `vivetest-landing-ingress:{variant}` | `storage-keys.ts:77` | **있음** — 「랜딩 카드에서 눌렀다」는 사실 자체가 키 이름이다 |
| session | `vivetest-test-instruction-seen:{variant}` | `instruction-seen.ts:1-3` | **있음 — 아래 4-3** |
| (local) | `test:{variantId}:activeRun` / `:responses` / `:flag:{5종}` | `test-storage-keys.ts:5-19` | 플래그 5종이 `derivation_in_progress`→`result_persisted` 로딩→결과 **화면 파이프라인**을 전제 (`docs/req-test.md:1083-1089`) |

### 4-2. `CURRENT_PATH`/`PREVIOUS_PATH` — 뒤로가기를 **경로 문자열 2개**로 근사한다

`src/features/gnb/hooks/use-gnb-back-navigation.ts:82-97`이 pathname이 바뀔 때마다 두 키를 갱신한다. 이것은 **한 화면 = 한 pathname**을 전제한 스택 근사다. 같은 URL 안에서 시트/스텝이 열리고 닫히면 이 두 키는 **아무것도 기록하지 않는다** → 뒤로가기 폴백 판정(`:44-50`)이 시트의 존재를 모른다.

### 4-3. `instructionSeen`은 "이 화면을 봤다"를 저장한다

`docs/req-test.md:399`가 **"instruction은 별도 route가 아니라 `/test/{variant}` 위 overlay다"**로 못박고, `:400`이 오버레이 표시 조건 4개를 열거한다. 즉 요구사항이 **오버레이라는 표현 형식 자체를 계약으로 고정**해 놓았다. 모바일에서 이것을 전용 화면이나 바텀시트로 바꾸는 것은 §3.6 개정이 필요하다(사용자 결정 1·5로 허용 범위 안).

### 4-4. cleanup set은 "화면 상황" 표로 정의돼 있다

`docs/req-test.md:1100-1111`의 cleanup 표 9행 중 5행이 화면 사건 이름이다: `Result screen entry commit 완료` · `Back-from-loading` · `전환 실패/취소 (랜딩→테스트)` · `variant switch` · `마지막/이전 문항 응답 변경`. **IA를 바꾸면 이 표의 행 이름이 가리키는 사건 자체가 달라진다.** 특히 `Back-from-loading`(`:1109`, §4.7 `:746-759`)은 **현재 저장소에 로딩 화면이 존재하지 않으므로**(§8.1 주석 `:1058`이 스스로 그렇게 적는다) 순수 target contract다.

### 4-5. 실측 — `sessionStorage`이므로 탭 단위, 뒤로가기로 살아남는다

`store.ts:32`·`instruction-seen.ts:11`이 모두 `window.sessionStorage`다. **미확인**: bfcache 복귀(`pageshow persisted=true`) 시 React 상태와 sessionStorage가 어긋나는지 — 저장소 전체에 `pageshow`/`pagehide` 리스너가 **0개**이므로(grep 결과) 방어 코드가 없다는 사실만 확인했고, 실제 증상은 브라우저 실행으로 확인하지 않았다.

---

## 5. 뒤로가기 — 현재 각 표면에서 무엇을 하는가

### 5-1. History API 사용 전량 (grep 실측, `src`+`public` 전체)

- `window.history.back()` — **2곳뿐**: `use-gnb-back-navigation.ts:53`(테스트 back), `:75`(일반 back).
- `window.history.length` 읽기 2곳: `:47`, `:70`.
- `pushState` / `replaceState` / `popstate` 리스너 / `history.scrollRestoration` — **각각 0건**.
- `window.location` 읽기 3곳: `:52`, `:57`, `:72`(폴백 판정용).

즉 **앱은 history 스택에 아무것도 직접 쌓지 않는다.** 스택은 전적으로 Next.js `router.push`와 브라우저가 만든다.

### 5-2. 표면별 현재 동작

| 표면 | 브라우저 뒤로가기 | 근거 |
|:---|:---|:---|
| 랜딩 (카드 NORMAL) | 이전 사이트/이전 라우트로 나간다 | 스택 조작 없음 |
| **랜딩 (카드 Expanded — 데스크톱/태블릿)** | **카드를 닫지 않고 페이지를 떠난다** | 확장은 순수 React 상태(`use-landing-interaction-controller.ts` 내 `interactionState.expandedCardVariant`, `:166`). URL·history 개입 0 |
| **랜딩 (카드 Expanded — 모바일)** | **시트처럼 보이지만 뒤로가기는 페이지를 떠난다.** 게다가 `OPENING`/`CLOSING` 중에는 `document.body.style.overflow='hidden'`이 걸려 있다(`use-mobile-scroll-lock.ts:17-25`) | 위와 동일 + 스크롤 락 |
| **GNB 모바일 드로어** (`role="dialog" aria-modal="true"`, `site-gnb.tsx:433-435`) | **닫히지 않고 페이지를 떠난다.** 열려 있는 동안 body 스크롤 락(`use-gnb-mobile-menu.ts:137-147`) | 닫기 경로는 Escape(`site-gnb.tsx:216-236`)·햄버거 재탭(`:399-405`)·backdrop 탭(`use-gnb-mobile-menu.ts:102`) 셋뿐 |
| GNB 설정 패널 (`role="dialog"`, `site-gnb.tsx:331`) | 동일 — 닫히지 않는다 | |
| 테스트 instruction/qualifier 오버레이 | 동일 — 닫히지 않는다. 오버레이 안에 **자체 back 버튼**(`onQualifierBack`, `test-question-client.tsx:329`)이 따로 있다 | 오버레이는 라우트가 아니다(`docs/req-test.md:399`) |
| 테스트 진행 중(started && !submitted) | **네이티브 `beforeunload` 프롬프트**가 뜬다 | `use-before-unload-guard.ts:22-27`. 단 이것은 **문서 언로드에만** 걸리므로 SPA 내부 `router.push`에는 발동하지 않는다 |
| 블로그 상세 → 랜딩 | 정상 복귀. 랜딩 마운트 시 return scrollY 1회 복원 | `landing-runtime.tsx:46-65` |
| GNB "Back" **버튼**(뒤로가기와 별개) | test 컨텍스트: 내부 previous path가 있고 `history.length>1`이면 `history.back()`, 아니면 `router.push(home, {scroll:false})` + 220ms 폴백 타이머(`use-gnb-back-navigation.ts:39-61`, `behavior.ts:5`). 그 외: same-origin referrer가 있으면 `history.back()`, 아니면 home push(`:63-80`, `behavior.ts:29-43`) | |

### 5-3. 모바일 표준(뒤로가기로 시트 닫기)을 도입하려면 필요한 것

**코드 쪽 — 없던 층을 하나 새로 만들어야 한다.**

1. `popstate` 리스너 + `history.pushState`로 **시트 열 때 더미 엔트리를 쌓는 층**. 현재 저장소에 이 패턴이 0건이므로 **완전 신규**다.
2. 그 층을 어디에 둘지: `src/app/**`·`src/i18n/**`·`src/lib/routes/**`·`src/proxy.ts`에는 **`window`·`sessionStorage`·`Date.now()` 사용이 하드 금지**다(`scripts/qa/check-phase1-contracts.mjs:63-93`). 따라서 `src/features/**` 안에 두어야 한다.
3. 랜딩 카드 확장(`use-landing-interaction-controller.ts`, 738줄), GNB 드로어(`use-gnb-mobile-menu.ts`), 설정 패널(`use-gnb-desktop-settings.ts`), instruction 오버레이(`use-test-entry-orchestrator.ts`) **네 개의 독립된 열림/닫힘 상태 기계**가 각각 이 층을 소비해야 한다 — 공용 훅 1개로 묶는 편이 맞다.
4. **Escape 처리와의 중복**: 현재 Escape 핸들러는 `document` 레벨에 있고 드로어→설정 순으로 우선순위를 둔다(`site-gnb.tsx:216-236`). 뒤로가기 층도 같은 우선순위 규칙을 공유해야 한다.
5. **`beforeunload`와의 충돌**: 테스트 진행 중 시트를 뒤로가기로 닫으려 할 때 `popstate`는 `beforeunload`를 발동시키지 않으므로 충돌은 없다. 다만 더미 엔트리를 쌓아 두면 사용자가 "뒤로 두 번"을 눌러야 테스트를 벗어나게 된다 — **의도된 보호로 쓸 수도, 함정으로 읽힐 수도 있다. 판단 필요.**

**계약 쪽 — 두 조항이 정면으로 막는다.**

- `docs/req-landing.md:632` — **"닫기 경로는 `X 버튼` 또는 `카드 외부(backdrop) 탭`만 허용한다."** `만`이 배타적 열거다. 뒤로가기를 닫기 경로로 추가하려면 이 문장을 개정해야 한다.
- `docs/req-landing.md:623-624` — "단일 pointer/touch 시퀀스에서 동일 카드 상태 전이는 최대 1회", "OPENING 동일 시퀀스 즉시 역전 금지". popstate는 pointer 시퀀스가 아니므로 문언상 저촉되지 않지만, **`:643` "OPENING 중 유효 닫기 입력은 OPEN settled 직후 1회 queue-close"** 에 뒤로가기를 어떻게 태울지는 새로 정의해야 한다.
- `docs/req-landing.md:679`(태블릿/데스크톱 §8.2)은 **진입만 규정하고 이탈을 규정하지 않는다** — 이미 실측된 대로(과제 전제) 태블릿 터치 기기에서 닫기 경로가 사실상 없다. 뒤로가기 닫기는 **이 공백을 메우는 가장 표준적인 수단**이다.

**게이트 쪽.** `scripts/qa/check-phase10-transition-contracts.mjs:122-133`이 모바일 라이프사이클 E2E 단언 이름 5개(`assertion:B14-mobile-close-perception` 등)를 **문자열로 요구**한다. 닫기 경로가 늘면 이 스펙에 케이스를 추가해야 하고, 단언 이름은 유지해야 한다.

---

## 6. 스크롤 복원 — 직접 다루는가, Next.js에 맡기는가

### 6-1. 결론: **둘 다다. 그리고 두 경로가 한 번도 조율되지 않았다.**

| 경로 | 누가 처리 | 근거 |
|:---|:---|:---|
| 랜딩 → 테스트/블로그 → **앱 내부 복귀**(GNB Back, 드로어 Home 링크) | **앱이 직접**. 전환 시작 시 `saveLandingReturnScrollY(window.scrollY)`(`transition/runtime.ts:49-51`) → 랜딩 마운트 시 `window.scrollTo({top, behavior:'auto'})` 1회 후 consume(`landing-runtime.tsx:46-65`) | `docs/req-landing.md:999-1006` §13.8 |
| 그 외 모든 라우트 이동 | **Next.js 기본**(상단으로 스크롤). `scroll={false}`는 **랜딩으로 가는 링크 3곳 + router.push 3곳에만** 걸려 있다 | `site-gnb.tsx:264,373,446`; `use-gnb-back-navigation.ts:48,58,79` |
| **브라우저 뒤로가기(popstate)** | **Next.js/브라우저 기본에 전적으로 맡긴다.** `history.scrollRestoration` 조작 0건 | grep 실측 |
| 페이지 내부 스크롤 컨테이너(모바일 Expanded 내부) | body에 위임 — `docs/req-landing.md:640` "Expanded 내부 콘텐츠 스크롤은 body에서 허용" | |

### 6-2. 이미 존재하는 구조적 위험 — 이중 복원

브라우저 뒤로가기로 랜딩에 돌아오면 **브라우저(Next)가 자체 스크롤 복원**을 하고, 그 직후 `LandingRuntime`의 이펙트가 **`LANDING_RETURN_SCROLL_Y`를 읽어 한 번 더 `window.scrollTo`** 한다(`landing-runtime.tsx:56-64`). 성공한 전환은 return scroll 레코드를 지우지 않기 때문에(`docs/req-landing.md:876` "성공 complete는 pending transition만 정리한다") 레코드는 살아 있다. 두 값이 같으면 무증상이고 다르면 점프다.

- **미확인**: 실제로 점프가 보이는지, 그리고 Next 16의 App Router popstate 복원 타이밍이 이 이펙트보다 앞인지 뒤인지 — 브라우저 실행으로 확인하지 않았다. 다음 단계에서 재현해야 할 1순위 항목이다.
- 부분적 방어는 있다: `resolveLandingReturnScrollTop`(`landing-runtime.tsx:37-39`)이 문서 높이로 클램프하므로 **짧아진 문서에서 바닥 아래로 튀지는 않는다**.

### 6-3. IA를 바꾸면 이 구조가 받는 압력

- 복원 단위가 `scrollY` **스칼라 하나**다. 모바일 전용 중간 화면이나 탭 전환이 생기면 "무엇의 스크롤인가"를 표현할 수 없다.
- `docs/req-landing.md:1006` — **"복원 과정에서 자동 viewport 보정 스크롤을 금지한다."** 바텀시트를 열 때 흔히 쓰는 `scrollIntoView` 류 보정이 이 조항에 걸린다(현재 저장소에 `scrollIntoView` 0건).
- `docs/req-landing.md:626,641` — 모바일 Expanded의 y-anchor 무편차·transition window 스크롤 락은 **"열 때 화면이 움직이지 않는다"**는 매우 강한 약속이다. 바텀시트(화면 하단에서 올라옴)는 이 약속과 **다른 종류의 약속**이라 §8.5 전체를 다시 써야 한다.

---

## 7. 요구사항 문서가 IA를 직접 막는 조항 — 개정 대상 목록

| # | 조항 | 위치 | 무엇을 막는가 | 등급 |
|---:|:---|:---|:---|:---|
| 1 | "닫기 경로는 `X 버튼` 또는 `카드 외부(backdrop) 탭`**만** 허용한다" | `req-landing.md:632` | 뒤로가기로 닫기, 스와이프 다운으로 닫기 | **개정 필수** |
| 2 | "instruction은 별도 route가 아니라 `/test/{variant}` 위 overlay다" | `req-test.md:399` | instruction/qualifier의 전용 화면화·스텝 라우트화 | **개정 필수** |
| 3 | locale-less 허용목록 4개 고정 | `req-landing.md:139` | 새 경로의 locale-less 진입 | 개정 필요 |
| 4 | V1 이벤트셋 최소화 + "`expanded/tap 토글` 기본 미수집" | `req-landing.md:772,784` | 시트 열림 등 새 상호작용 이벤트 | 개정 필요 |
| 5 | "`landing_view`: 1회" | `req-landing.md:777` | 랜딩을 여러 라우트로 분할 | 개정 필요 |
| 6 | Mobile Expanded 상세 규정 26줄 (y-anchor 0px, 220~360ms, 헤더 `title + X`, 레이어 순서 등) | `req-landing.md:620-652` | 바텀시트·전용 상세 화면 등 **다른 형태의 모바일 확장 전부** | **개정 필수 — 이 과제의 핵심 표면** |
| 7 | Result URL `/result/{variant}/{type}?{base64}` | `req-test.md:769-809` | (막지 않음) **구현이 0건**이므로 IA를 지금 정하는 것이 오히려 자유롭다 | 재설계 기회 |
| 8 | §13.3 handshake 12개 불변식 | `req-landing.md:865-882` | 랜딩 출발 아닌 전환, 3번째 `targetType` | 개정 필요 |
| 9 | 진입 경로 3분류(Landing Ingress / Direct Cold / Direct Resume) | `req-test.md:324-328` | 4번째 경로(예: 시트에서 이어하기) | 개정 필요 |

---

## 8. 미구현 target contract — "고칠 것이 없어서 자유로운" 영역

실행 확인: `grep -rn "'/result\|/result/\|resultUrl\|base64\|btoa\|atob" src` → **0건**.

- **결과 URL·공유 페이로드 전체가 미구현**이다. 도메인 층은 있다(`src/features/test/domain/index.ts:2` `buildTypeSegment`/`parseTypeSegment`, `types.ts:54-57` `ResultPayload`) — 없는 것은 **라우트와 인코딩/디코딩 한 층**뿐이다.
- 결과 화면도 미구현이다. 현재는 같은 라우트 안 패널이며(`test-question-client.tsx:281-290`), 패널 스스로 주석에 "결과 fixture는 `{variantId}` 뿐"이라 적는다(`test-result-panel.tsx:58-63`).
- 로딩 화면(`DERIVATION_LOADING`)·Back-from-Loading·5개 state flag(`test-storage-keys.ts:5-11`)도 전부 target contract다(`req-test.md:1058,1079` 주석이 스스로 그렇게 적는다).
- `/{locale}/history`는 **빈 화면이고 디버그 문자열이 남아 있다**(`history/page.tsx:48`: `` {`Locale: ${locale}`} `` — 파일 자신이 주석 `:8-11`에서 보고 대상이라 적는다).
- `/{locale}/test/error`의 제목은 **12개 로케일 전부에 하드코딩된 한국어**다(`test/error/page.tsx:30-31`, 파일 주석 `:7-9`가 스스로 적고 `routing-smoke.spec.ts:118-127`이 그 문자열을 고정한다).

**따라서 IA 재설계의 실질 자유도는 결과·로딩·히스토리 세 표면에서 가장 크다 — 바꿀 구현이 없기 때문이다.**

---

## 9. 미확인 목록 (확인하지 못한 것 = 다음 단계의 작업 항목)

1. 브라우저 뒤로가기로 랜딩 복귀 시 **Next의 popstate 스크롤 복원과 `LandingRuntime`의 `scrollTo`가 실제로 충돌하는지** — 코드상 두 경로가 모두 살아 있음만 확인했고, 실행하지 않았다(§6-2).
2. bfcache 복귀 시 sessionStorage(pending transition / ingress)와 React 상태의 정합 — `pageshow`/`pagehide` 리스너 0건만 확인했다(§4-5).
3. iOS Safari **에지 스와이프 뒤로가기**가 모바일 Expanded 스크롤 락(`touch-action:none` on body, `use-mobile-scroll-lock.ts:20`)과 어떻게 상호작용하는지 — 실기기·WebKit 미검증.
4. `beforeunload` 가드(`use-before-unload-guard.ts:22`)가 **모바일 Safari/Chrome에서 실제로 프롬프트를 띄우는지** — `tests/e2e/consent-smoke.spec.ts:532-557`이 데스크톱 chromium에서만 단언한다.
5. `qa:rules` 13개 스크립트의 **현재 실제 exit code** — 실행하지 않았다(읽기 전용 과제). 메모리는 exit 0이라 기록하고 있으나 이 clone에서 확인하지 않았다.
6. GNB 모바일 드로어가 **라우트 이동 시 자동으로 닫히는지** — `SiteGnb`가 각 page.tsx의 `PageShell` 안에 있어 라우트 전환 시 언마운트된다는 **구조적 추론**은 확실하나(`page-shell.tsx:21` + 6개 page.tsx), 명시적 close 코드는 없고 실행 확인도 하지 않았다.
7. `typedRoutes`가 `href={{pathname: string}}` **객체 형태**를 얼마나 엄격히 검사하는지 — `.next/types/link.d.ts:44-49` `RouteImpl`까지만 읽었고 `LinkProps` 전문은 읽지 않았다.
8. `docs/design/design.md`의 라우팅/IA 관련 서술 — 이번 과제 범위 밖이라 읽지 않았다. 단 BQ-21에 따라 design.md는 routing/telemetry/behavior를 지배하지 않으므로(`AGENTS.md` §2) 계약 충돌원은 아니다.
