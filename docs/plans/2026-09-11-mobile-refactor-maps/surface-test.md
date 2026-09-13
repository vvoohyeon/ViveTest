# surface-test — 테스트 플로우 표면 구조 지도

- **작성** 2026-09-11 · **Task mode** Analysis Only (읽기 전용)
- **대상 저장소** `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (HEAD `a5aec95`)
- **대상 라우트** `/{locale}/test/{variant}` · `/{locale}/test/error`
- 이 문서의 모든 숫자는 **계산값(클래스에서 산출)** / **관측값(추적 중인 baseline PNG)** / **추정값(글자 폭 가정 포함)** 중 하나로 표시한다. 표시 없는 숫자는 없다.

---

## 0. 한 눈에 — 개체수

| 항목 | 값 | 근거 |
|:---|---:|:---|
| `src/features/test/**` 파일 수 | 56 | `find` |
| `src/features/test/**` 총 줄수 | 4,721 | `wc -l` |
| ~500줄 초과 파일 | **0** | 최대 `test-question-client.tsx` 425줄 |
| 라우트 파일 | 2 | `[variant]/page.tsx` 63줄 · `error/page.tsx` 59줄 |
| 뷰포트 조건 유틸리티 (`src/features/test/**` 전체) | **7** | 전부 `instruction-overlay.tsx:26`(6개) · `:145`(1개), 전부 `max-[767px]:` |
| 터치/포인터 이벤트 리스너 | **0** | `grep onPointer\|onTouch` → 없음 |
| `touch-action` 선언 | **0** | 같은 grep |
| `safe-area-inset` 참조 | **0** | 저장소 전체 2건은 GNB 드로어와 동의 배너 |
| `100dvh` 참조 | **0** | 저장소 전체 4건은 GNB 드로어와 랜딩 카드 |
| 인터랙티브 컨트롤 종류 | 9 | §4 표 |
| 44px 미만 터치 타깃 | **1** (qualifier chip 32px) | §4 |
| variant fixture | 7 | `fixtures/questions/index.ts:12-20` |
| qualifier 보유 variant | **1** (`egtt`, 필드 1개) | `schema-registry.ts:44` |
| 추적 중인 모바일 baseline (테스트 표면) | 12장 | instruction 4 · question 4 · result 4 |
| 390px 에서 axe 가 도는 테스트 표면 상태 | **1개** (instruction 만) | `a11y-smoke.spec.ts:532-548` |

---

## 1. 화면 전환 순서 — 파일과 컴포넌트

### 1-0. 서버 게이트 (`src/app/[locale]/test/[variant]/page.tsx`)

순서대로 다섯 관문을 통과해야 클라이언트가 마운트된다. 넷은 `notFound()`, 하나는 `/{locale}/test/error?variant=…` 로 보낸다.

| 순서 | 조건 | 결과 | file:line |
|---:|:---|:---|:---|
| 1 | `!isLocale(locale)` | `notFound()` | `page.tsx:29-31` |
| 2 | `!/^[a-z0-9-]+$/u.test(variant)` | `notFound()` | `page.tsx:33-35` |
| 3 | `isRuntimeTestEntryBlocked(variant)` | redirect → test/error | `page.tsx:38-40` |
| 4 | `resolveLandingTestEntryCardByVariant` 가 null | `notFound()` | `page.tsx:44-46` |
| 5 | `getLazyValidatedVariant(variant).ok === false` | redirect → test/error | `page.tsx:48-51` |

통과하면 `PageShell(context="test", showDefaultConsentBanner={false})` 안에 `TestQuestionClient key={locale:variant}` 하나를 렌더한다(`page.tsx:53-62`). 테스트 라우트에는 동의 배너가 뜨지 않는다.

### 1-1. 전환 순서 전체

```
[서버 게이트]  app/[locale]/test/[variant]/page.tsx
      │
      ▼
[phase: booting]  test-run-reducer.ts:54  buildInitialTestRunState()
      │   ── 이 구간에는 오버레이가 없다(§5-1). 문항 패널이 그대로 보인다.
      │   useTestRunBootstrap (use-test-run-bootstrap.ts:119)
      │     → resolveBootstrapInputs   (:87)  landingIngress → activeRun → responseSet → qualifier 유효성
      │     → resolveQuestionBootstrapState (bootstrap-state-resolver.ts:133)
      │     → queueMicrotask(dispatch BOOTSTRAP_COMPLETE)   (:164)
      ▼
[phase: instruction]  ─────────────────────────────────────────┐
      │   OverlayConnector (overlay-connector.tsx:36)          │ autoCommitEntry=true 면
      │     → InstructionOverlay (instruction-overlay.tsx:59)  │ 이 단계를 건너뛰고
      │   내용·CTA = resolveTestEntryPolicy (entry-policy.ts:143) │ 바로 active 로 간다
      │   실행     = executeInstructionAction (use-test-entry-orchestrator.ts:194)
      │   자동커밋 = useAutoCommit (use-auto-commit.ts:29)      │ (test-run-reducer.ts:121-129)
      │                                                        │
      ├── redirectHome ──▶ [phase: redirecting] → router.replace(landing)  (:207-215)
      │
      ├── qualifierItems.length > 0 ──▶ [qualifier step 0..n-1]
      │        useQualifierOverlayWizard (use-qualifier-overlay-wizard.ts:24)
      │        같은 InstructionOverlay 의 qualifierStep 분기 (instruction-overlay.tsx:158-205)
      │        Back → onQualifierBack (:47) · Continue → tryAdvanceQualifierStep (:76)
      │        마지막 step 의 Continue 에서만 commit (executeFreshEntryCommit :139)
      ▼
[phase: active]  문항 런타임   test-question-client.tsx:332-420
      │   답변 → useAnswerHandler.handleAnswerChoice (use-answer-handler.ts:63)
      │            → updateAnswer → trackQuestionAnswered → lockAnswer(150ms) → moveQuestion(1)
      │   이전 → 인라인 핸들러 (test-question-client.tsx:389-404) → tail reset (test-run-reducer.ts:172-183)
      │
      ├── qualifier 재진입 ──▶ QualifierChip (qualifier-chip.tsx:15) → reopenQualifierOverlay
      │        overlayMode='reentry' → 같은 오버레이가 runtime active 위에 다시 뜬다
      │        Cancel  → 아무것도 바꾸지 않고 닫힘 (use-qualifier-overlay-wizard.ts:48-57)
      │        Confirm → executeReentryCommit (use-test-entry-orchestrator.ts:115)
      │                  scoring 답변 전체 삭제 + 첫 scoring 문항으로 복귀
      ▼
[마지막 문항]  isLastQuestion → Submit 버튼만 추가로 렌더 (test-question-client.tsx:406-418)
      │   handleSubmit (use-test-run-controller.ts:237) → trackFinalSubmit → dispatch SUBMIT
      ▼
[phase: submitted]  ResultConnector (result-connector.tsx:18) → TestResultPanel (test-result-panel.tsx:47)
                    마운트 시 trackResultViewed 1회 (:64)
```

### 1-2. 오버레이 노출 규칙 (`resolveInstructionVisible`, `test-question-client.tsx:80-93`)

| 조건 | 결과 |
|:---|:---|
| `overlayMode === 'reentry'` | 무조건 표시 (runtime active 여도) |
| `isBooting \|\| entryCommitted \|\| redirecting` | 무조건 숨김 |
| 그 외 | `overlayStep !== 'instruction'` ∨ `!instructionSeen` ∨ `!canAutoCommitAfterInstructionSeen` ∨ `hasQualifierItems` |

`isBooting = !runtimeReady || !consentSnapshot.synced` (`test-question-client.tsx:154`). 이 숨김 규칙이 §5-1 의 초기 플래시를 만든다. 계약은 이 숨김을 명시한다 — `req-test.md:399` 「overlay는 booting/sync 대기 … 상태에서는 표시되지 않는다」. 계약은 **그 동안 무엇이 보이는지는 규정하지 않는다.**

### 1-3. entry policy 4종 (`entry-policy.ts:143-193`)

| # | 조건 | primary | secondary | consentNote | divider | auto-commit |
|---:|:---|:---|:---|:---:|:---:|:---:|
| 1 | direct + `OPTED_OUT` + `available` | `accept_all_and_start` | `keep_current_preference` | `optedOutAvailableWarning` | ○ | ✕ |
| 2 | `UNKNOWN` + `available` | `accept_all_and_start` | `deny_and_abandon` | `unknownAvailableNote` | ○ | ✕ |
| 3 | `UNKNOWN` + `opt_out` | `accept_all_and_start` | `deny_and_start` | `unknownOptOutNote` | ○ | ✕ |
| 4 | 그 외 (plain) | `start` | 없음 | — | ✕ | ○ |

qualifier variant 에서는 primary 의 **가시 라벨만** `t('next')` 로 덮어쓴다(`test-question-client.tsx:299-303`) — action identity·consent write·`instructionSeen` 기록은 그대로다(계약: `req-test.md:410`).

---

## 2. 390px 에서 무엇을 그리는가 — 계산과 관측

### 2-1. 레이아웃 사슬

| 층 | 클래스 | 390px 에서의 값 |
|:---|:---|:---|
| GNB | `sticky top-0 z-[1100]` + `h-14 md:hidden` | 높이 **56px**, flow 점유 (`site-gnb.tsx:38,42`) |
| main | `mx-auto max-w-[1280px] px-[var(--shell-gutter)] pt-20 pb-6` | 좌우 **16px**, 상단 **80px**, 하단 24px (`page-shell.tsx:22`, `globals.css:323`) |
| shell card | `landing-shell-card grid gap-5` + `.vt-panel` | 폭 **358px**, 패딩 **20px**, 테두리 1px, `gap-5`=20px (`test-question-client.tsx:48`, `surface-class-names.ts:41`) |
| 카드 내부 폭 | 358 − 2(테두리) − 40(패딩) | **316px** |

`landing-shell-card` · `test-shell-card` · `test-question-panel` · `test-answer-grid` · `test-nav-row` · `test-instruction-card` 에 대응하는 **CSS 규칙은 저장소에 하나도 없다** — 프로젝트 CSS 파일은 `globals.css` 와 랜딩 그리드 모듈 2개뿐이고 이 이름들이 거기 없다. 즉 순수 E2E/시맨틱 앵커이며 레이아웃은 전부 Tailwind 유틸리티가 만든다.

### 2-2. 문항 화면 높이 (계산)

토큰: `--h3` = 600 20px/1.3 → 26px · `--t-expanded-question` = 600 21px/1.3 → **27.3px/줄** · `--t-choice` = 400 15px/1.45 → **21.75px/줄** · `--caption` = 400 13px/1.45 → 18.85px · `--overline` = 600 12px/1.4 → 16.8px · `--body-sm` = 400 14px/1.55 → 21.7px (`globals.css:206-222`).

| 블록 | 계산 | 높이 |
|:---|:---|---:|
| h1 (카드 제목, 1줄) | 26 | 26.0 |
| gap-3 | 12 | 12.0 |
| 진행 라벨 행 (`items-baseline`) | 18.85 | 18.85 |
| gap-2 | 8 | 8.0 |
| 진행 트랙 `h-1.5` | 6 | 6.0 |
| **header 소계** | | **70.85** |
| gap-5 | 20 | 20.0 |
| `Q1` overline | 16.8 | 16.8 |
| gap-4 | 16 | 16.0 |
| 문항 `<h2>` (1줄) | 27.3 | 27.3 |
| gap-4 | 16 | 16.0 |
| 답변 A (1줄) = 1+12+21.75+12+1 | 47.75 | 47.75 |
| gap-2 | 8 | 8.0 |
| 답변 B (1줄) | 47.75 | 47.75 |
| gap-4 | 16 | 16.0 |
| nav row (`min-h-[46px]`, Q1 에서는 `visibility:hidden` 이라 **공간은 그대로 점유**) | 46 | 46.0 |
| **panel 소계** | | **241.6** |
| 카드 패딩 20+20 + 테두리 1+1 | 42 | 42.0 |
| **카드 총 높이** | | **374.45** |

카드 상단 = 56 + 80 = **136px**, 하단 = **510.45px**. 관측값(baseline `theme-state-mobile-test-question-kr-light-mobile`, 390×844)에서 카드 상단 ≈140px · 하단 ≈513px — **계산과 3px 이내로 일치한다.** 이후 계산은 이 검증된 모델을 쓴다.

**결론 ①: 390×844 에서 문항 화면은 뷰포트의 44% 만 쓴다.** 카드 위 공백 80px(9.5%) + 카드 아래 공백 = 844 − 510.45 − 24(pb-6) = **309.6px(36.7%)**. 관측 이미지가 그대로 보여 준다.

**결론 ②: 현재 fixture 로는 문항 화면이 390×844 에서 스크롤되지 않는다.** 최악 케이스는 `rhythm-b` Q1 — 문항 131자(en) / 76자(kr), 답변 kr 37자. 추정(kr 21px ≈ 1글자/21px → 316px 에 15자, kr 15px → 260px 에 17자): 문항 5줄(+109.2) · 답변 각 3줄(+43.5×2) → 카드 570px, 하단 730px < 844. 즉 **스크롤 없음**. 이 추정은 글자 폭 가정에 의존하므로 값 자체는 추정이지만, 여유가 114px 이라 결론의 방향은 안전하다.

### 2-3. 결과 화면 높이 (계산) — 유일하게 스크롤이 걸리는 표면

`qmbti`(scoring 8문항), kr 기준.

| 블록 | 계산 | 높이 |
|:---|:---|---:|
| header (위와 동일) | | 70.85 |
| gap-5 | | 20.0 |
| 결과 제목 `<h2>` | 26 | 26.0 |
| gap-2 | | 8.0 |
| `resultBody` 2줄 (kr, 관측) | 21.7×2 | 43.4 |
| gap-4 | | 16.0 |
| well: `px-4 py-2` + 테두리, 행 8개 (`py-3` + `--body-sm` 21.7 + border-b 1px, 마지막 제외) | 1+8+(7×46.7+45.7)+8+1 | 390.6 |
| gap-4 | | 16.0 |
| CTA 행 (`min-h-[46px]`, `min-w-[132px]` ×2 + gap-2 = 272px < 316) | 46 | 46.0 |
| 카드 패딩+테두리 | 42 | 42.0 |
| **카드 총 높이** | | **678.85** |

하단 = 136 + 678.85 + 24 = **838.85px** — 844px 뷰포트에 **5.15px 남기고 들어간다**. 관측 baseline(`theme-state-mobile-test-result-kr-light-mobile`)에서 카드 하단 ≈805px 로, 같은 자릿수다.

**결론 ③: 결과 화면은 390×844 에서 무스크롤 경계 위에 정확히 걸쳐 있다.** 다음 중 어느 하나만 생겨도 스크롤로 넘어간다 — ⑴ scoring 문항 9개 이상, ⑵ `resultBody` 가 3줄 이상인 로케일(de 122자 · fr 118자 · ru 105자 — 추정상 3~4줄), ⑶ 844px 보다 짧은 뷰포트(iPhone SE 375×667 등). 즉 **이 화면이 한 화면에 들어오는 것은 설계된 결과가 아니라 우연**이다.

### 2-4. 문항 텍스트 폭 / 선택지 폭 (계산)

| 요소 | 사용 가능 폭 | 산출 |
|:---|---:|:---|
| 문항 `<h2>` | **316px** | 카드 내부 폭 그대로 |
| 답변 라벨 `<span>` | **260px** | 316 − 2(테두리) − 28(`px-3.5`) − 12(`gap-3`) − 14(마크 `h-3.5 w-3.5`) |
| 결과 well 값 | 316 − 2 − 32(`px-4`) = 282 에서 `justify-between` + `gap-4` 로 키/값 분할 | |

답변 라벨은 `[word-break:keep-all] [overflow-wrap:anywhere]` 를 진다(`surface-class-names.ts:89`) — 한국어 어절 유지 + 긴 라틴 단어 강제 분할. 문항도 동일(`test-question-client.tsx:57`). **12개 로케일 × 390px 가로 오버플로 0** 이라는 기존 실측과 일관된다.

### 2-5. 진행 표시

- 라벨 행 = `flex items-baseline justify-between`: 왼쪽 `진행률`(caption/`--muted-aa`), 오른쪽 퍼센트(13px semibold `tabular-nums`/`--ink-body`) — `test-question-client.tsx:61-64`.
- 트랙 = `h-1.5`(**6px**) `rounded-full` `bg-[var(--surface-strong)]`, 채움은 `bg-[var(--accent)]` 에 `--dur-slow`(280ms) width 전이 + `motion-reduce:transition-none` (`:65-67`).
- 접근성: `role="progressbar"` + `aria-label`/`valuemin`/`valuemax`/`valuenow`/`valuetext` 완비 (`:263-272`).
- 분모는 **scoring 문항만** (`resolveScoringProgress`, `question-runtime-utils.ts:37-53`). profile/qualifier 는 분모·분자 어디에도 없다(계약 `req-test.md:509`).
- 문항 번호는 별도 overline `Q{n}` (`test-question-client.tsx:347-351`) — 계약이 금지한 것은 `Question N of M` 형식이고(`req-test.md:683`) scoring order 라벨은 허용한다(`:515`).

**타이포 역위**: h1 은 `--h3` **20px**, 문항 `<h2>` 는 `--t-expanded-question` **21px**. 한 카드 안에서 h2 가 h1 보다 크다(`surface-class-names.ts:107` vs `test-question-client.tsx:56`). 의도는 주석이 밝힌다 — 확장된 랜딩 카드가 미리 보여 준 질문과 같은 타입으로 읽히게 하려는 것(`test-question-client.tsx:54-55`). 즉 **의도된 역위이며, 카드 제목이 이 화면에서 주인공이 아니라는 뜻**이다. IA 재설계에서 카드 제목을 GNB 로 올리면 이 역위 자체가 사라진다.

---

## 3. instruction overlay 가 모바일에서 어떻게 동작하는가

### 3-1. 형태 — 767px 를 경계로 두 개의 다른 컴포넌트처럼 동작한다

| | `≤767px` | `≥768px` |
|:---|:---|:---|
| 컨테이너 | `fixed inset-0 z-[1050] grid place-items-center` + **`p-0`** | 같은 컨테이너 + `p-6` |
| 카드 | `min-h-full w-full content-start rounded-none border-0 pt-[88px]` | `rounded-[var(--radius-xl)]`(24px) + `border-[var(--border-strong)]` + `shadow-[var(--shadow-overlay)]`, **폭 제약 없음 → 내용 폭** |
| 결과 | **전체화면 시트**, 내용 상단 정렬 | **중앙 정렬 플로팅 다이얼로그** |

근거: `instruction-overlay.tsx:26`(카드) · `:145`(컨테이너). `max-[767px]:` **7개가 `src/features/test/**` 의 뷰포트 분기 전부**다.

**사용자 결정 2 와의 충돌**: 이 경계는 순수 **폭**(`max-[767px]`)이고 입력 방식을 보지 않는다. hover 없는 900×1200 태블릿(기존 프로브)에서는 중앙 정렬 플로팅 다이얼로그가 뜬다. 결정 2 를 적용하면 이 7개가 첫 번째 개정 대상이다.

### 3-2. 모바일에서의 실제 모습 (관측, `theme-layout-test-instruction-kr-light-mobile`, 390×844)

- 시트가 뷰포트를 가득 채우므로 scrim(`--overlay-scrim-medium`)은 **보이지 않는다** — 코드 주석이 그 이유로 모서리를 걷어냈다고 적는다(`instruction-overlay.tsx:24`).
- 내용 높이 계산: `pt-[88px]` + h2 26 + gap-4 16 + body 2줄 43.4 + gap-4 16 + 액션행 46 = **235.4px**. 관측 이미지의 CTA 하단 ≈235px — 일치.
- **결론 ④: 시트의 72%(844 − 235 = 609px)가 빈 화면이다.** 그리고 유일한 CTA(`시작`, 46px 높이)는 **화면 위쪽 1/4 지점에 우측 정렬**로 놓인다. 한 손 도달 영역(엄지 존) 밖이며, iOS HIG·Material 3 이 공통으로 쓰는 「하단 고정 CTA」와 정반대 위치다.
- 액션 행은 `flex flex-wrap items-center gap-2 justify-end`(`instruction-overlay.tsx:20,227`). CTA 2개인 정책(#1~#3)에서 모바일 카드 내부 폭은 390 − 40(`p-5` 좌우, 테두리 0) = **350px**. 추정: de `Aktuelle Einstellung beibehalten`(32자, 15px semibold ≈ 8px/자 → 약 280px) + gap 8 + `Allen zustimmen und starten`(≈248px) = 536px > 350 → **줄바꿈되어 서로 폭이 다른 두 버튼이 오른쪽으로 계단처럼 쌓인다.** 이 상태의 baseline 은 없다(matrix 는 en/kr 만) — **미확인**, 그러나 `flex-wrap + justify-end` 라는 구조 자체는 확정이다.

### 3-3. 스크롤 — 시트는 스크롤되지 않고, 뒷면도 잠기지 않는다

- 시트 자체: `min-h-full` 만 있고 `overflow-y-auto`·`max-h` 가 없다. 내용이 뷰포트보다 길어지면 `fixed inset-0` 부모가 잘라내는 것이 아니라 카드가 부모 밖으로 넘치고, 부모에 `overflow` 가 없으므로 **잘림 없이 그려지되 스크롤 컨테이너가 없다.** 현재 내용(235px)에서는 드러나지 않는다 — **잠재 결함이며 현 fixture 로는 미발현**.
- 배경 스크롤 잠금(`body { overflow: hidden }` 류)이 **저장소 어디에도 없다**(grep 0건). 테스트 라우트는 문서 높이가 뷰포트보다 낮아 현재는 무해하지만, 시트를 길게 만드는 모든 재설계에서 즉시 문제가 된다.
- iOS Safari 주소창 높이 변동: 컨테이너가 `fixed inset-0`(레이아웃 뷰포트 기준)이고 `100dvh`·`env(safe-area-inset-*)` 를 **하나도 쓰지 않는다**. 지금은 내용이 상단 정렬이라 드러나지 않지만, 하단 고정 CTA 를 도입하는 순간 홈 인디케이터/주소창과 겹친다.

### 3-4. 닫기 수단 — 세 가지가 있고, 셋 다 버튼이다

| 수단 | 동작 | 근거 |
|:---|:---|:---|
| primary CTA | 정책의 action 실행 (start / consent write + start / …) | `instruction-overlay.tsx:238-245` |
| secondary CTA | 정책 #1~#3 에서만 존재. quiet 무게(`min-h-[var(--tap-min)]` = 44px) | `:228-237`, `button-class-names.ts:108-109` |
| `Esc` | **그 단계의 dismiss action 과 동일**. secondary 가 없으면(정책 #4) **아무 일도 하지 않는다** | `:104-111`, 계약 `req-test.md:403` |

**없는 것**: 닫기 X 버튼 0개 · backdrop 탭으로 닫기 0개(scrim 에 핸들러 없음) · 스와이프-다운 제스처 0개. 모바일에서 `Esc` 는 존재하지 않는 키이므로, **터치 사용자에게 정책 #4(가장 흔한 경로)의 유일한 이탈 경로는 GNB 의 `뒤로` 버튼 하나다** — 그리고 그 버튼은 다이얼로그 **바깥**에 있다(§5-2).

### 3-5. 포커스 — 트랩은 JS 로 직접 구현돼 있다

- 열릴 때 포커스는 **첫 컨트롤이 아니라 다이얼로그 컨테이너**로 들어간다(`:99`). 이유를 주석이 명시한다 — 첫 컨트롤에 두면 Enter 한 번이 곧 동의 행동이 되기 때문(`:28-30`). 계약도 같은 말을 한다(`req-test.md:402`).
- Tab/Shift+Tab 순환은 `FOCUSABLE_SELECTOR` 로 직접 계산해 가둔다(`:32-33, 113-139`). `inert` 도 `<dialog>` 도 쓰지 않는다.
- 닫힐 때 열기 직전 원소로 복귀(`:85-94`). 재진입에서는 그것이 chip 이고, 그래서 chip 은 오버레이가 열려 있는 동안에도 마운트를 유지한다(`test-question-client.tsx:337-346`).
- 단계가 바뀌면(지시 → qualifier, 뒤로) 컨테이너로 포커스를 되돌린다(`:98-100`).

---

## 4. 터치 타깃 실측 — 클래스에서 계산

계산 규칙: Tailwind preflight 의 `box-sizing: border-box` 아래 높이 = 테두리 + 패딩 + `line-height`, 단 `min-h-*` 가 더 크면 그것이 이긴다. 토큰 `--tap-min` = **44px** (`globals.css:201`).

| # | 컨트롤 | 클래스 출처 | 계산 | 높이 | 폭(390px) | 판정 |
|---:|:---|:---|:---|---:|:---|:---|
| 1 | 답변 선택지 A/B | `surface-class-names.ts:83` | 1+12+21.75+12+1 | **47.75px** | 316px (`w-full`) | ✅ 44 이상 |
| 2 | qualifier 선택지 | 같은 클래스 (`instruction-overlay.tsx:168`) | 동일 | **47.75px** | 350px | ✅ |
| 3 | 이전 버튼 | `testSecondaryButtonClassName` → `buttonShapeClassName` `min-h-[46px]` | max(46, 2+12+15+12) | **46px** | 내용 폭 | ✅ |
| 4 | 제출 버튼 | `testPrimaryButtonClassName` + `px-[18px]` | 동일 | **46px** | 내용 폭 | ✅ |
| 5 | 오버레이 primary CTA | `testPrimaryButtonClassName` | 동일 | **46px** | 내용 폭 | ✅ |
| 6 | 오버레이 secondary (지시 단계, quiet) | `button-class-names.ts:108` `min-h-[var(--tap-min)]` | max(44, 2+10+15+10) | **44px** | 내용 폭 | ✅ 경계 |
| 7 | qualifier Back / Cancel | `testSecondaryButtonClassName` | | **46px** | 내용 폭 | ✅ |
| 8 | 결과 CTA ×2 (`Link`) | `+ min-w-[132px]` | | **46px** | ≥132px | ✅ |
| 9 | **qualifier chip** | `surface-class-names.ts:93` `min-h-8` | max(**32**, 2+5+18.85+5) | **32px** | `w-fit` — kr `남성` 기준 **≈48px** (추정) | ⚠️ 44px 미달 |

부속: 진행 트랙 6px(비인터랙티브) · 선택 마크 14px(`aria-hidden`, 비인터랙티브) · GNB `뒤로` 44px(`site-gnb.tsx:64`, 공유 pill).

**판정**
- **WCAG 2.5.8 Target Size (Minimum, AA, 24×24)**: 9종 전부 통과. chip 32×48 도 통과한다.
- **`design.md` §4.10 / iOS HIG 44pt / Material 3 48dp**: **chip 하나만 미달**(32px). 그리고 chip 은 `<div role="button" tabIndex={0}>` 이지 네이티브 `<button>` 이 아니다(`qualifier-chip.tsx:24-32`) — Enter/Space 는 직접 구현돼 있으나(`:16-21`), 폼 시맨틱·비활성화·자동 클릭 동작을 갖지 못한다.
- **인접 간격**: 답변 A/B 사이 `gap-2`(8px), 오버레이 CTA 사이 `gap-2`(8px), 결과 CTA 사이 `gap-2`(8px). 모두 24px 미만이지만 타깃 자체가 24px 이상이므로 2.5.8 의 간격 예외를 쓸 필요가 없다 — 통과.
- **WCAG 2.5.7 Dragging Movements**: 이 표면에는 드래그 인터랙션이 **0개**다 — 통과(해당 없음).

**누르는 피드백이 없다.** `testAnswerChoiceClassName` 에는 `active:` 유틸리티가 하나도 없고, 상태 변화는 `hover:` 와 `data-[selected=true]:` 둘뿐이다(`surface-class-names.ts:83`). Tailwind v4 는 `hover:` 를 `@media (hover: hover)` 로 감싸므로(`node_modules/tailwindcss/dist/chunk-ETYEVOII.mjs` 의 `"hover",c=>{c.nodes=[I("&:hover",[U("@media","(hover: hover…` 에서 확인) **진짜 터치 기기에서 hover 스타일은 적용되지 않는다.** 따라서 터치 사용자가 답변을 눌렀을 때 받는 시각 피드백은 `data-selected=true` 하나이고, 그것은 **150ms 뒤 문항이 바뀌면서 사라진다**(`use-answer-lock.ts:32`). 즉 **선택했다는 확인이 사실상 보이지 않는다.**

---

## 5. 모바일에서만 드러나는 구조적 문제 — 근거와 함께

### 5-1. 부팅 중 문항이 먼저 그려진다 (SSR + 하이드레이션 창)

`TestQuestionClient` 는 클라이언트 컴포넌트지만 SSR 된다. 초기 상태는 `phase: 'booting'`(`test-run-reducer.ts:54`) + `consentSnapshot.synced: false`(`consent-source.ts:22`) → `isBooting = true` → `resolveInstructionVisible` 이 **false** 를 반환한다(`test-question-client.tsx:84`). 그 결과 SSR HTML 과 첫 페인트는 **오버레이 없이 문항 패널을 그대로 보여 준다** — `aria-hidden` 도 붙지 않는다(`:334`). 부트스트랩과 consent 동기화는 둘 다 첫 `useEffect` 에서 일어나므로 상태가 바뀌는 것은 **하이드레이션 이후**다. 데스크톱에서는 한 프레임이라 보이지 않지만, 중급 모바일 기기에서는 하이드레이션이 수백 ms 걸린다 — **플래시 지속 시간은 미확인(측정 필요)**.

특히 `egtt` 에서는 이 플래시가 **프로필 문항을 노출한다**. 부팅 중 `currentQuestionIndex = 1` 이고 `skipForwardPastProfile` 은 `isRuntimeActive/Submitted` 일 때만 적용되므로(`use-test-run-controller.ts:157-161`) `currentQuestion = questions[0]` = seq `q.1` = `나의 성별은` / `Male|Female` (`fixtures/questions/egtt.ts:6-15`). 계약은 「profile 문항은 runtime question panel 에 표시되지 않는다」고 못박는다(`req-test.md:675, 429`). 즉 **계약이 금지한 화면이 부팅 창 동안 실제로 그려진다.** 계약 위반으로 단정하지 않는 이유는 §399 가 부팅 중 오버레이 숨김을 명시하면서 그때 무엇을 보여야 하는지는 규정하지 않기 때문이다 — **계약의 공백**이다.

### 5-2. GNB 가 모달 위에 있다 (z-index 1100 > 1050)

| 층 | z-index | 근거 |
|:---|---:|:---|
| transition GNB overlay | 1300 | `transition-gnb-overlay.tsx:14` |
| GNB 모바일 드로어 | 1200 | `site-gnb.tsx:80` |
| **GNB 셸(sticky)** | **1100** | `site-gnb.tsx:38` |
| 동의 배너 | 1075 | `consent-banner.tsx:21` |
| **instruction overlay** | **1050** | `instruction-overlay.tsx:145` |

`page-shell`·`body`·`html` 어디에도 stacking context 를 만드는 `transform`/`isolation`/`opacity` 가 없다(`page-shell.tsx:19`, `app-body-class.ts:18`, `layout.tsx:22-33`). 따라서 GNB 가 오버레이 위에 그려지고 히트 테스트도 GNB 가 가져간다. **관측으로 확인된다** — 모바일·태블릿 두 baseline 모두에서 `뒤로` 와 `00:00` 이 scrim 위에 밝게 렌더되고, 태블릿 이미지에서는 상단 64px 띠만 scrim 이 덮이지 않았다.

귀결:
- `aria-modal="true"` 다이얼로그가 열려 있는 동안 **GNB 의 `뒤로` 버튼이 포인터로 도달 가능하다.** JS 포커스 트랩은 `dialogRef` 안만 순환시키므로 Tab 으로는 못 가지만(`instruction-overlay.tsx:120`), **탭은 막지 않는다.** WAI-ARIA APG 의 dialog 패턴 위반이다.
- 그 `뒤로` 는 `handleTestBack` → `window.history.back()`(`use-gnb-back-navigation.ts:53`). `useBeforeUnloadGuard` 는 문서 언로드에만 걸리므로 **진행 중인 회차가 확인 없이 버려진다**(`use-before-unload-guard.ts:22-27`). 브라우저 새로고침은 경고하고 앱 내 뒤로는 경고하지 않는 **비대칭**이다. iOS 엣지 스와이프·안드로이드 시스템 뒤로도 같은 경로다.
- 테스트 컨텍스트의 GNB 는 `뒤로` + `00:00` 두 요소뿐이다(`site-gnb.tsx:252-268, 397-414`). 모바일 메뉴는 꺼져 있다(`mobileMenuEnabled = context !== 'test'`, `:134`). `00:00` 은 `t('timerPlaceholder')` 리터럴로, **동작하지 않는 플레이스홀더 타이머**다(`messages/en.json` `gnb.timerPlaceholder`).

### 5-3. 모달이 페이지의 절반만 숨긴다

오버레이가 열려 있을 때 `aria-hidden="true"` 가 붙는 것은 `test-question-panel` **하나뿐**이다(`test-question-client.tsx:334`). 같은 `<section>` 안의 `<header>` — `<h1>` 카드 제목 + 진행률 progressbar — 는 `aria-hidden` 도 `inert` 도 아니다(`:254-279`). 그리고 `aria-hidden` 이 붙은 패널 안에는 **비활성화되지 않은 `<button>` 두 개**(답변 A/B, `disabled={isAnswerLocked}` = false)가 그대로 남는다. `inert` 를 쓰지 않으므로 포인터 도달도 막히지 않는다 — 데스크톱/태블릿에서는 다이얼로그가 화면 일부만 덮으므로(§5-4) 실제로 뒤 카드를 누를 수 있는 면적이 남는다.

axe 는 이 상태를 통과로 보고한다(`a11y-smoke.spec.ts:532-548` 의 390px 루프가 테스트 라우트를 포함하고, 그 상태는 오버레이가 열린 instruction 상태다). axe 가 `aria-hidden-focus` 를 통과시키는 정확한 메커니즘(모달 열림 예외로 추정)은 **미확인**. 다만 `inert` 부재와 header 미차폐는 코드에서 확정이다.

### 5-4. `≥768px` 에서 시험지가 scrim 너머로 그대로 읽힌다

관측(`theme-layout-test-instruction-kr-light-tablet-narrow`, 900×980): 중앙 다이얼로그 뒤로 카드 제목·진행률·`Q1`·문항 전문·답변 두 줄이 **모두 판독 가능하게** 보이고, 다이얼로그는 답변 행 위에 겹쳐 앉는다. instruction gate 가 시각적으로 투명하다. 모바일에서만 시트가 이것을 가린다 — 즉 **모바일 쪽이 오히려 올바른 형태이고 데스크톱이 결함**이다.

### 5-5. `/test/error` 는 복구 수단이 0개인 막다른 길

`src/app/[locale]/test/error/page.tsx` 는 X 아이콘(`aria-hidden`) 하나와 `<h1>` 하나만 렌더한다(`:44-56`). **CTA·링크가 하나도 없다.** 제목 문자열은 **12개 로케일 전부에 한국어 하드코딩**이며 raw variant id 가 그 안에 끼워진다(`:29-31`) — 파일 상단 주석이 이것을 알고 있고 시각 결함이 아니라 내용 결함이라 보고 대상으로 남겼다고 적는다(`:7-9`). 현행 계약이 그 문자열을 그대로 요구하고(`req-test.md:845`) `routing-smoke.spec.ts:118-127` 이 고정한다. 복구 카드 2장 + 랜딩 CTA 는 **Phase 4 확장 계약이며 미구현**(`req-test.md:847-857`). 모바일에서 이 페이지에 도달한 사용자의 유일한 출구는 GNB `뒤로` 버튼이다.

### 5-6. 모션

| 전환 | 처리 | 근거 |
|:---|:---|:---|
| 부팅 → 오버레이 | 없음 (마운트) | — |
| 오버레이 → 문항 | 없음 (언마운트, `overlay-connector.tsx:62-64`) | — |
| 문항 → 문항 | `x: ±18 → 0`, 180ms `easeOut`, opacity 없음 | `test-question-client.tsx:353-359` |
| 진행 채움 | width, `--dur-slow`(280ms), `--ease-in-out` | `:66-67` |
| 문항 → 결과 | 없음 (스왑) | `:281-291` |
| 재진입 오버레이 | 없음 | — |

`prefersReducedMotion` 은 슬라이드에서 `duration: 0` 으로 존중되고(`:358`), 진행 채움과 스킨 전이는 `motion-reduce:transition-none` 을 진다. **WCAG 2.3.3 (AAA) 통과.** 시각적 관점에서는 **여섯 전환 중 하나에만 모션이 있고**, 모바일에서 가장 큰 문맥 변화인 「오버레이 → 문항」과 「문항 → 결과」가 무전환 점프다.

### 5-7. 저장과 재개

| 대상 | 저장소 | 키 | 근거 |
|:---|:---|:---|:---|
| activeRun (`startedAtMs`, `lastAnsweredAtMs`) | localStorage | `test:{variantId}:activeRun` | `test-storage-keys.ts:17` |
| 응답 집합 | localStorage | `test:{variantId}:responses` | `:18` |
| 상태 플래그 5종 | localStorage | `test:{variantId}:flag:{name}` | `:5-16` |
| `instructionSeen` | **sessionStorage** | legacy `vivetest-test-instruction-seen:{variant}` | `req-test.md:448`, `storage/instruction-seen.ts` |

비활동 타임아웃 **30분**이 `getActiveRun` 안에서 집행된다(`storage/active-run.ts:6, 66`) — 단, **페이지 로드 시점에만 평가**되고 세션 중 타이머는 없다. 모바일에서 흔한 「탭 백그라운드 → 30분 뒤 복귀」는 다음 로드 때 회차가 사라진 것으로 나타난다. `instructionSeen` 만 sessionStorage 라 **새 탭·앱 전환 복귀 시 응답은 남고 지시만 다시 뜨는 조합**이 가능하다.

---

## 6. 결과 화면의 구현 수준 — 스텁이다

**판정: placeholder. 계약이 그렇게 인정한 상태이며, 구현할 수 없는 상태다.**

현재 렌더되는 것(`test-result-panel.tsx:72-102`): `<h2>` `최종 결과` + 안내 한 문단 + profile 문항을 제외한 scoring 응답을 `Q1 / A` 형식으로 나열한 `<dl>` well + `랜딩으로`·`이력 보기` 링크 버튼 2개. 관측 baseline 이 그대로 보여 준다 — **원시 A/B 토큰 8행이 그대로 노출된다.** 사용자에게 아무 의미가 없는 개발자용 덤프다.

`req-test.md` §7.1 이 요구하는 것과의 거리:

| 계약 섹션 | 등급 | 현재 |
|:---|:---|:---|
| `derived_type` (타입 라벨 강조) | Mandatory | **없음** |
| `axis_chart` (축별 점수 시각화) | Mandatory | **없음** |
| `type_desc` (타입 설명) | Mandatory | **없음** |
| `trait_list` | Optional | **없음** |
| self-contained result URL | §5.1 | **없음** |

계약 본문이 이를 명시한다 — `req-test.md:1035` 「현재 placeholder panel 은 … `derived_type`, `axis_chart`, `type_desc`, self-contained result URL 을 생성하지 않는다」, `:74` 「§4.5~§8.3 의 result 계약은 target contract 로 유지하며 현 시점의 다음 단계 필수 구현 범위로 보지 않는다」.

**왜 지금 채울 수 없는가** — `docs/plans/2026-05-17-result-pipeline-todos.md` 가 측정값으로 적는다.
1. `src/features/test/response-projection.ts` 는 **export 가 하나도 없는 계약 예약 stub** 이다(파일 전체가 docstring 22줄). 런타임 `'A'|'B'` → 도메인 pole 토큰 변환 층이 없어 `deriveDerivedType()` 에 넣을 입력을 만들 수 없다. 도메인 쪽(`domain/derivation.ts` · `domain/type-segment.ts` · `schema-registry.ts`)은 이미 있다 — **없는 것은 그 사이 한 층뿐**이다(계획서 §2-⑴).
2. `fixtures/results/index.ts:5-10` 의 `resultsSourceFixture` 는 `{variantId}` 네 개뿐이고(`ResultSourceRow` 의 필드가 `variantId` 하나다, `types.ts:7-9`) **결과 콘텐츠가 한 글자도 없다.** 섹션 구성은 schema-driven 이어야 하므로(`req-test.md:1037`) 지금 무언가를 렌더하면 그것은 Phase 9 가 소유한 제품 결정을 발명하는 것이다(계획서 §2-⑵).
3. `trackResultViewed` 의 mount 발화는 임시가 아니라 **현재 계약**이다(`req-test.md:75`, `tests/unit/test-result-panel.test.ts:68` 이 고정). IntersectionObserver 로 바꾸려면 관측할 `derived_type` 블록이 존재해야 하는데 그 블록이 없다(계획서 §2-⑶).

코드 안의 TODO 2건이 같은 지점을 가리킨다 — `result-connector.tsx:27-30`, `test-result-panel.tsx:81`.

**모바일 재설계와의 관계**: 결과 화면은 **이번 리팩터에서 시각적으로 새로 짓는 것이 불가능한 유일한 표면**이다. 모바일 IA 를 설계하되 콘텐츠 스키마가 Phase 9 에 있으므로, 이 표면에 대해서는 **레이아웃 골격(섹션 슬롯·스크롤 축·CTA 위치·safe-area)만 확정하고 콘텐츠는 슬롯으로 비워 두는 것**이 유일하게 성립하는 접근이다. 그리고 §2-3 이 보여 주듯 현재 골격은 문항 수·로케일·뷰포트 높이 셋 중 하나만 움직여도 무스크롤 가정이 깨진다 — 즉 골격 자체를 스크롤 전제로 다시 세워야 한다.

---

## 7. IA 재설계 여지 — 표준 모바일 테스트 패턴 대비 현재 위치

| 표준 패턴 | 현재 | 판정 |
|:---|:---|:---|
| **한 화면 한 문항** | ✅ 이미 그렇다. 문항 패널은 언제나 문항 1개 + 선택지 2개 | **보존** |
| **답변 즉시 자동 진행** | ✅ 이미 그렇다. 150ms 잠금 후 다음 미응답 scoring 문항으로 (`use-answer-handler.ts:87-93`) — 계약 `req-test.md:677-678` | **보존** (계약이 값까지 고정) |
| **sticky 진행 표시** | ❌ 진행 바는 카드 header 안에 있고 스크롤과 함께 움직인다. 지금은 스크롤이 없어 무해하지만 구조적으로 sticky 가 아니다 | **재설계 여지** |
| **하단 고정 CTA** | ❌ 오버레이 CTA 는 화면 상단 1/4 우측 정렬(§3-2). 제출 버튼은 카드 안 nav row 우측 | **가장 큰 재설계 여지** |
| **바텀시트** | ❌ 오버레이는 전체화면 top-aligned 시트. 235px 내용에 844px 시트 | **재설계 여지** — 내용 높이에 맞는 바텀시트가 정확히 맞는 형태 |
| **스와이프 전환** | ❌ 터치 리스너 0개. 「이전」은 버튼 하나뿐이고 Q1 에서는 `visibility:hidden` 으로 자리만 차지 | **재설계 여지** (단 WCAG 2.5.7 상 스와이프는 버튼 대안 필수) |
| **스텝 분할 (qualifier)** | ✅ 이미 1필드 = 1스텝 (`use-qualifier-overlay-wizard.ts`) — 단 오버레이 안에서만 | **보존, 표면만 재배치** |
| **닫기 어포던스** | ❌ X 0개 · backdrop 탭 0개 · 스와이프 0개. 정책 #4 에서 터치 이탈 경로 0개(§3-4) | **재설계 필수** |
| **누름 피드백** | ❌ `active:` 0개, hover 는 터치에서 비활성(§4) | **재설계 필수** |
| **안전 영역 / 동적 뷰포트** | ❌ `safe-area` 0 · `100dvh` 0 | **재설계 필수** (하단 CTA 도입의 전제) |
| **스크롤 복원 / pull-to-refresh** | 미확인 — 이 표면에 `overscroll-behavior` 선언 0개 | **측정 필요** |

**핵심 관찰**: 이 표면은 **인터랙션 모델(한 문항·자동 진행·스텝 분할)은 이미 모바일 표준에 도달해 있고, 공간 배치(수직 정렬·CTA 위치·오버레이 형태·진행 표시 고정)만 데스크톱 문서 레이아웃에 머물러 있다.** 결정 4(0단계로 구조를 먼저 가른다)의 관점에서 이것은 좋은 소식이다 — 행동 무변경 구조 분리의 대상이 로직이 아니라 **레이아웃 계층** 하나로 좁혀진다.

**개정 대상이 되는 계약 조항 후보** (결정 1 에 따라 개정 허용이지만, 어디를 건드리는지 명시가 필요한 것):
- `req-test.md:683` — 「진행 상태는 프로그레스 바와 퍼센트(%)로 표시한다」 (sticky 로 옮기는 것은 위배 아님, 형식 변경은 위배)
- `req-test.md:677-678` — 자동 진행과 150ms 값
- `req-test.md:399, 404` — 오버레이가 별도 라우트가 아니라는 것 + `Esc` dismiss 규칙 (모바일 전용 라우트 도입 시 정면 충돌)
- `req-test.md:845` — 에러 페이지의 한국어 하드코딩 메시지
- `req-test.md:675` · `:429` — profile 문항이 runtime panel 에 표시되지 않는다는 것 (§5-1 의 부팅 플래시가 이미 이것을 흐린다)

---

## 8. 미확인 — 측정하지 못한 것

1. **부팅 플래시 지속 시간.** 모바일 기기에서 하이드레이션이 끝나기까지 문항 패널이 몇 ms 보이는지. 코드상 발생은 확정이나 체감 여부는 미측정.
2. **de / fr / ru 로케일에서 오버레이 CTA 2개의 줄바꿈 실제 모습.** theme matrix 는 en/kr 만 베이스라인을 갖는다. §3-2 의 280px 추정은 글자 폭 가정에 의존한다.
3. **axe 가 `aria-hidden` 안의 활성 버튼을 통과시키는 정확한 메커니즘.** 모달 열림 예외로 추정하나 확인하지 않았다.
4. **`overscroll-behavior` / pull-to-refresh 상호작용.** 이 표면에 선언이 없다는 것은 확정이나 실제 iOS/Android 동작은 미측정.
5. **375×667(iPhone SE) 등 844px 미만 뷰포트.** baseline 이 390×844 하나뿐이라 §2-3 의 결과 화면 스크롤 전환점을 실측으로 확인하지 못했다.
6. **실제 대비비.** 토큰 이름(`--muted-aa`)과 코드 주석이 측정 이력을 말하지만, 이 세션에서 렌더 픽셀을 재지 않았으므로 WCAG 1.4.3 판정을 내리지 않았다.
7. **`test/error` 페이지의 모바일 baseline.** theme matrix 시나리오에 없다.
8. **qualifier chip 의 실제 렌더 폭.** `w-fit` + 로케일별 라벨이라 계산이 아니라 추정이다.
