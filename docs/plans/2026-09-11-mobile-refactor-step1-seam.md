# 모바일 전면 리팩터 — step 1: 이음매 분리 (행동 무변경)

**Task mode:** Implementation. **Wave:** rebuild 프로그램 밖 — `docs/wave-roadmap.md` §Programme close 이후의 신규 작업.

**선행 확인:** 이 문서는 step 1 이다. 선행 단계가 없다. 착수 조건은 `origin/main` 이 `a5aec95` 이상이고 `npm test` 가 초록인 것 하나다.

**이 단계는 시각을 건드리지 않는다.** `docs/plans/2026-09-14-mobile-refactor-design-spec.md` 의 명세는 step 3 의 것이다 — 0단계에서는 읽되 적용하지 않는다. 0단계의 성공 기준은 「명세의 어느 항목도 구현하지 않았는데 구조가 갈렸다」이다.

**이 단계가 끝나면:** 랜딩 그리드의 네 대형 파일이 관심사별로 갈라져 있고, 행동은 **한 비트도 바뀌지 않았으며**, 그 사실이 지문 3 종과 baseline 170 장으로 증명돼 있다. step 2 가 축을 옮길 때 diff 가 「파일 교체」로 읽힌다.

---

## 공유 블록 — 세 문서가 같이 갖는 것

### 최상위 목표

모바일의 인터랙션·UX·디자인을 전면 리팩터하되 데스크톱·태블릿과의 호환성, 디자인 일관성, 디자인 시스템 호환성을 유지한다. 배경과 근거는 `docs/plans/2026-09-11-mobile-refactor-analysis.md` 가 갖는다 — **착수 전에 그 문서의 §1·§2 를 읽는다.**

### 사용자 결정 일곱 (확정 — 다시 묻지 않는다)

1. 계약 개정 전면 허용 · 2. 터치 태블릿은 입력 방식 기준으로 통일 · 3. 전 표면 동시 · 4. 0단계로 구조를 먼저 가른다(행동 무변경) · 5. IA 재설계 허용 · 6. 요구사항 문서를 동작/인터랙션으로 분리 · 7. 서명 인터랙션은 3분류로 제시.

### 불변 경계 (세 단계 전부)

- **워크스페이스는 `git clone` 이다. 워크트리를 만들지 않는다**(`AGENTS.md` §4).
- **`qa:visual:full`(baseline `--update`)은 사람 승인 없이 실행하지 않는다**(`AGENTS.md` §4 Hard stops). step 1 에서는 **한 번도 치지 않는다.**
- `.env`·비밀값은 읽지도 출력하지도 커밋하지도 않는다.
- Ask-First 경로: `src/app/globals.css` · `scripts/qa/*.mjs` · `tests/e2e/theme-matrix-manifest.json` · `docs/blocker-traceability.json` · `docs/design/ds/**` · `src/features/variant-registry/{source-fixture,builder,resolvers,types}.ts` · `AGENTS.md` · `package.json`.
- **게이트를 약화시켜 통과시키지 않는다.** 테스트·단언·검사를 지우거나 느슨하게 하지 않는다.

### 기본 게이트 (`AGENTS.md` §5, 순서 고정)

```bash
cd "$(git rev-parse --show-toplevel)" && npm run lint && npm run typecheck && npm test && npm run build
```

---

## 1. 왜 뷰포트 축으로 자르면 안 되는가 — 네 가지 근거

**step 1 에서 가장 흔한 오답이 「모바일 파일과 데스크톱 파일로 가른다」이다. 그것을 하지 않는다.**

1. **그 축은 곧 움직인다.** 결정 2 가 `isMobileViewport` 의 의미를 폭에서 입력으로 바꾼다. 오늘의 선을 따라 자르면 step 2 가 그 선을 다시 그을 때 두 번째 절단을 해야 한다.
2. **React 훅 정체성이 깨진다 — 이것만으로 「행동 무변경」이 성립하지 않는다.** `LandingGridCard` 는 훅 5 종을 무조건 호출하고 그중 둘이 상태를 보유한다(`landing-card-title-continuity.tsx:185` 의 `useState`, `use-card-inline-geometry.ts:93` 의 `useState`). 형제 컴포넌트로 가르면 tier 가 768·1024 를 가로지르는 순간 리렌더가 아니라 **언마운트/리마운트**가 되고 두 상태가 초기값으로 돌아간다. 스크린샷에 잡히지 않는 종류의 행동 변경이다.
3. **두 경로가 서로소가 아니다.** root `<div>`(`landing-grid-card.tsx:1097-1169`) 하나가 모바일 속성 5 종과 데스크톱 속성 2 종을 같은 노드에 싣고, CSS 모듈이 `.root<modifier> .child` 형태로 그것을 전제한다. 뷰포트 축으로 자르려면 root 를 복제해야 하고 그러면 `data-*` 28 개를 복제하게 되며 그 28 개는 `grid-smoke`·`state-smoke`·`theme-matrix` 가 읽는 계약 표면이다.
4. **상태 기계에 모바일 절반이 없다.** `reduceLandingInteractionState`(`interaction-state.ts:229`)는 뷰포트를 모르고, `expandedCardVariant` 를 모바일 경로와 데스크톱 경로가 함께 쓴다. 잘라낼 「모바일 리듀서」가 존재하지 않는다.

**그래서 관심사 축으로 자른다. 다만 관심사를 임의로 고르지 않는다** — 절단면을 **step 3 가 통째로 교체하거나 통째로 버릴 단위**에 맞춘다.

---

## 2. 작업 순서 — 10 단위, 이 순서를 바꾸지 않는다

| 순 | 단위 | 왜 이 자리인가 | 합격 판정 |
|:--:|:---|:---|:---|
| 1 | **F1·F2·F3 지문 하네스** (소스 변경 0) | 이후 모든 단위의 합격 판정이 이것 없이는 「스크린샷이 같아 보인다」에 머문다 | `npm test` |
| 2 | **S0 타입 계약 분리** | 런타임 JS 가 문자 그대로 동일하다(타입은 지워진다). 9 개 훅 모듈과 테스트 7 종의 import 를 **한 줄도 고치지 않고** 훅→컴포넌트 간선을 끊는다 | typecheck + F2 |
| 3 | **죽은 표면 제거** (§4) | 이후 모든 diff 가 작아진다. 지문이 바이트 동일이면 죽었다는 것이 증명된다 | F2 + `test:e2e:gate` |
| 4 | **M1 셀렉터 분리** | 카드와 5 개 훅이 리듀서 파일에 거는 의존을 끊는다. QA 결합 0 · 파일 하나 · 위험 최소 — 지문의 첫 실전 검증 | F1 + typecheck |
| 5 | **S1 모바일 표면 + S2 데스크톱 셸** | QA 결합 0. step 3 가 통째로 교체할 두 덩어리를 먼저 떼면 이후 diff 가 파일 교체로 보인다 | F2 + baseline 12 장 |
| 6 | **S3 확장 본문** | phase5 1 건만 따라간다 | F2 + phase5 |
| 7 | **C1 데스크톱 닫기 컨트롤러** | 카드가 안정된 뒤에 컨트롤러를 건드린다. 둘을 동시에 흔들면 지문 차이의 원인을 가를 수 없다 | F3 + state-smoke |
| 8 | **H1 스크롤 hold** | 기존 테스트 블록 8 케이스가 그대로 증인 | F3 + webkit ghosting 5 장 |
| 9 | **S4 Normal face** | phase5 3 건 + phase6 1 건 — **QA 결합이 있는 첫 단위**이므로 앞선 8 단계가 전부 초록일 때만 | F2 + baseline 24 장 + phase5·6 |
| 10 | **S5 클래스명** | phase5·6·8·9 네 스크립트(Ask-First). 구조적 이득이 가장 작고 **step 3 가 시각 토큰을 다시 쓸 예정이므로 건너뛸 것을 권고한다** | — |

**핵심은 2 번이다.** 타입 계약을 먼저 떼면 3~10 이 전부 「구현을 옮긴다」가 되고 import 경로 수정이라는 잡음이 diff 에서 사라진다. 마지막에 하면 매 단위마다 9 개 모듈의 import 를 만지게 된다.

---

## 3. 이음매 명세

전체 공개 API 시그니처는 `docs/plans/2026-09-11-mobile-refactor-maps/seam-split.md` §3 에 있다 — **그대로 쓴다.**

### 3-1. `landing-grid-card.tsx` (1308행 → 약 470행)

| # | 새 파일 | 원본 행 | 행수 | 책임 | QA 결합 |
|:---|:---|:---|---:|:---|:---|
| S0 | `landing-card-contract.ts` | 47–120, 1296–1308 | ~95 | 공개 타입·prop 계약·기본 copy | 없음 |
| S1 | `landing-grid-card-mobile-surfaces.tsx` | 1225–1290 | ~110 | 모바일 확장 본문 + transient 셸 | 없음 |
| S2 | `landing-grid-card-desktop-shell.tsx` | 638–669 일부, 829–924 | ~120 | 데스크톱 오버레이 셸 + 확장 타이틀 | 없음 |
| S3 | `landing-grid-card-expanded-body.tsx` | 638–669 일부, 671–827 | ~190 | 확장 본문(질문·선택지·메타) 공용 | phase5 1 건 |
| S4 | `landing-grid-card-normal-face.tsx` | 299–353, 355–636 | ~300 | 접힌 얼굴 전체 | phase5 3 건 · phase6 1 건 |
| S5 | `landing-grid-card-classnames.ts` | 196–298 | ~100 | 클래스명 상수 + `joinClassNames` | phase5·6·8·9 **5 건 — 권고: 건너뛴다** |

잔여 `landing-grid-card.tsx` 는 **prop → 파생 플래그 → root 속성 → 자식 선택** 한 가지 일만 하는 파일이 된다. S0 의 타입은 `export type {...} from './landing-card-contract'` 로 재수출한다 — `:47` 이 `LandingCardVisualState` 에 대해 이미 같은 일을 하므로 새 패턴이 아니다.

### 3-2. `use-landing-interaction-controller.ts` (738행 → 562행)

| # | 새 파일 | 원본 행 | 행수 | 책임 | QA 결합 |
|:---|:---|:---|---:|:---|:---|
| C1 | `use-desktop-card-close-controller.ts` | 301–476 | ~176 | 데스크톱 닫기 + 키보드 포커스 처분 + Escape/blur | 없음 |

네 함수가 같은 의존 집합을 공유하는 닫힌 군집이고 밖으로 나가는 간선은 `useKeyboardHandoff` 가 `focusCardFromKeyboard` 를 받는 것(`:509`) 하나뿐이다.

**562 행으로 남기고 500 미만을 목표로 삼지 않는다. 이것은 보고 사항이지 질문이 아니다.** 남은 62 행을 깎으려면 `resolveCardInteractionBindings` 를 빼야 하는데, ⑴ `scripts/qa/check-phase7-state-contracts.mjs:99` 가 `resolveCardStateForVariant`·`resolveCardTabIndex` 라는 **문자열**이 컨트롤러 파일 본문에 있을 것을 요구하고(Ask-First), ⑵ 그 함수는 컨트롤러의 산출물 그 자체라 밖으로 내면 「이 컨트롤러가 무엇을 만드는가」를 다른 파일에서 찾아야 한다. `AGENTS.md` §3 의 ~500 행은 「넘게 되면 멈추고 계획을 제안한다」이지 「무조건 500 미만」이 아니며, 738 → 562 가 그 방향이다.

### 3-3. `use-hover-intent-controller.ts` (527행 → 427행)

| # | 새 파일 | 원본 행 | 행수 | 책임 | QA 결합 |
|:---|:---|:---|---:|:---|:---|
| H1 | `use-hover-scroll-hold.ts` | 149–195, 363–382, 245–280 의 hold 분기 | ~100 | BQ-39 R1 스크롤 hold 전체 | 없음 |

성립 근거: 스크롤 hold 는 이미 자기 테스트 블록을 갖는다 — `tests/unit/landing-interaction-controller-handlers.test.ts:841` `describe('scroll hold (BQ-39 R1)')` 8 케이스. **개념 경계가 이미 테스트로 그어진 자리를 파일 경계로 승격**시키는 것이다.

**그 외에는 자르지 않는다.** 나머지(`resolveHoverHandlers` 384–518, `recordPointerInput` 282–361)는 전부 `interactionMode !== 'hover'` 가드 뒤에 있고, 그 가드가 결정 2 가 옮길 바로 그 선이다.

### 3-4. `interaction-state.ts` (504행 → 427행)

| # | 새 파일 | 원본 행 | 행수 | 책임 | QA 결합 |
|:---|:---|:---|---:|:---|:---|
| M1 | `interaction-selectors.ts` | 3, 428–504 | ~80 | 상태 → 카드별 표현 파생 4 종 | 없음 |

의존 방향이 근거다 — 리듀서의 소비자는 컨트롤러 **하나**인데 셀렉터의 소비자는 **여섯**이다. 지금은 여섯 모듈이 504 행 파일 전체에 의존한다. `check-phase7-state-contracts.mjs:28-53` 이 이 파일에서 찾는 11 개 토큰은 **전부 1–426 행에 있음을 확인했다.** `src/features/landing/model/index.ts:16,18,19` 의 재수출 출처만 바꾸면 외부 import 경로는 불변이다.

---

## 4. 함께 걷는 죽은 표면 3 건

**① 카드의 포인터 prop 3 종이 죽어 있다.** `onPointerMove`(`:115`) · `onMouseDown`(`:116`) · `onWheel`(`:117`)이 선언·구조분해·배선되지만, 유일한 프로덕션 소비자 `landing-catalog-grid.tsx:238-277` 이 셋을 넘기지 않고 바인딩 타입에도 그 필드가 없다. `src`·`tests` 전수 grep 결과 넘기는 자리 **0 곳** — 세 핸들러는 항상 `undefined` 이고 React 는 리스너를 달지 않는다. **SSR 마크업이 바이트 동일하다는 것이 제거의 증거가 된다.**

**② `LandingCardCopy` 필드 3 개가 읽히지 않는다.** 카드가 실제로 읽는 것은 6 개인데 타입은 9 개를 선언하고 `landing-catalog-grid.tsx:108-118` 이 9 개를 채운다. `close` · `metaReadTime` · `metaViews` 는 12 locale 에서 번역돼 컴포넌트까지 전달된 뒤 버려진다. **이것은 i18n 메시지 키에 닿으므로 ①과 같은 단위로 묶지 않는다** — 별도 항목으로 보고하고 키 삭제 여부는 step 2 의 계약 개정에서 정한다.

**③ CSS 클래스 `.motionStageLate` 가 죽어 있다.** `landing-grid-card.module.css` 의 6 개 규칙(`:297`·`:352`·`:359`·`:376`·`:409`·`:412`)이 겨냥하는데 붙이는 코드가 `src` 어디에도 없다 — **확장 모션의 세 번째 스태거 단계가 실제로 적용되지 않는다.** 죽은 코드인 동시에 시각 결함 후보다. **판단하지 말고 보고한다**: `design.md` 가 3 단 스태거를 규정하는지 확인하고, 규정한다면 step 3 에서 되살릴 대상으로 넘긴다.

---

**④ 행 베이스라인 스냅샷 값이 읽히지 않는다.** `use-grid-geometry-controller.ts` 가 확장할 때마다 행마다 `getBoundingClientRect()` 를 불러 `top`/`bottom`/`height` 를 저장하고, `landing-catalog-grid.tsx:227-229` 가 그것을 `data-baseline-top`/`-bottom`/`-height` 로 내보낸다. 그런데 `src`·`tests`·`scripts` 전수 grep 결과 **읽는 곳이 0** 이다(읽히는 것은 `data-baseline-phase` 와 `data-baseline-frozen-rows` 뿐이다). **동결 자체는 필요하다** — `activeVisualCardVariant !== null` 이 확장 구간을 막고, `phase` 항이 그 억제를 **접힘 애니메이션이 끝날 때까지 연장**한다(없으면 접히는 중 기하로 spacing 을 계산한다). 필요 없는 것은 **값**뿐이다. **판단하지 말고 보고한다** — 속성을 지우면 DOM 이 바뀌어 F2 지문이 달라지므로 0단계의 「행동 무변경」과 충돌한다. step 3 에서 처리할 대상으로 넘긴다.

## 5. 행동 무변경의 증명

### 5-1. 세 겹의 증거 — 각각이 보는 것이 다르다

| 겹 | 도구 | 보는 것 | 보지 못하는 것 |
|:---|:---|:---|:---|
| ① 리듀서 지문 | vitest, 순수 함수 전수 | 상태 전이 표 전체 | 렌더·레이아웃 |
| ② SSR 마크업 지문 | vitest + `renderToStaticMarkup` + jsdom | DOM 구조·속성·클래스 문자열 | **CSS 적용 결과**, 측정 기하, 폰트 |
| ③ 시각 baseline 170 장 | Playwright | 합성된 픽셀 | 상태 기계 내부, 도달하지 않는 조합 |

②가 ①·③ 사이를 메운다. ③은 ②가 구조적으로 볼 수 없는 것 — `.root<modifier> .child` 형태 규칙 30 여 개, `useCardExpandedScale`·`useCardInlineGeometry` 의 측정 결과, Pretendard swap — 의 **유일한** 증거다.

### 5-2. 지문 하네스 3 종 (단위 1)

지문 스펙은 `tests/unit/**/*.test.ts` 에 둔다. **`qa:rules` 에 두면 안 된다** — 그것은 기본 게이트 밖이라 평시에 돌지 않는다.

**F1 — 리듀서 전수 지문** (`tests/unit/landing-interaction-reducer-fingerprint.test.ts`). `reduceLandingInteractionState` 는 순수 함수이므로 전수가 가능하다. 상태 공간 pageState 5 × `activeRampUntilMs` 3 × focused 3 × expanded 3 × `hoverLock.enabled` 2 × `hoverLock.cardVariant` 3 × `keyboardMode` 2 = **1,620 상태**에 이벤트 약 40 종 → 약 64,800 전이. 각 전이를 `sha256(JSON.stringify({from, event, to}))` 로 접어 정렬된 해시 목록을 `tests/fixtures/` 에 커밋한다. **이것은 근사가 아니라 증명이다.**

**F2 — 카드 SSR 마크업 지문** (`tests/unit/landing-card-render-fingerprint.test.ts`). 하네스를 새로 만들 필요가 없다 — `tests/unit/landing-card-contract.test.ts:58-115` 의 `renderCardDocument` 가 이미 `renderToStaticMarkup` + `JSDOM` 으로 정확히 이 일을 한다. 광역 조합 `desktop/tablet` 10,080 렌더 + `mobile` 1,440 렌더, 부수 prop 은 고정하고 일변량으로 각각 30 렌더.

**`useId` 정규화가 F2 의 유일한 함정이고 규칙은 실측으로 확정돼 있다.** React 19.2.4 SSR 의 `useId` 는 `_R_<n>_` 형태이고 그 값은 **`useId` 호출 이전에 렌더된 컴포넌트 경계의 수**에만 의존한다(이 분석 세션이 clone 의 `node_modules` 로 직접 프로브: 호스트 엘리먼트를 겹쳐도 불변, 부모 컴포넌트로 감싸도 불변, 소비자 **앞에** 형제 컴포넌트를 넣으면 밀린다). `LandingGridCard` 의 `useId` 는 함수 본문 첫 문장(`:965`)이므로 **자식만 추출하는 한 값이 변하지 않는다.** 그럼에도 지문은 `_R_\d+_` 를 치환한 뒤 해싱하고, id **관계**(`aria-labelledby` 가 가리키는 노드의 `textContent` === `card.title`)는 별도 단언으로 남긴다.

**F3 — 컨트롤러 시퀀스 지문** (`tests/unit/landing-controller-sequence-fingerprint.test.ts`). `tests/unit/landing-interaction-controller-handlers.test.ts:1-161` 의 하네스를 재사용해 26 개 기존 케이스의 이벤트 시퀀스를 재생하며 매 스텝마다 `{interactionState, mobileLifecycleState, cards.map(resolveCardInteractionBindings)}` 를 직렬화한다. 핸들러 prop 은 값이 아니라 **동일성 토큰**으로 기록한다 — 참조 유지가 계약이기 때문이다(같은 파일 `:653`).

**세 지문 모두 고장 주입 케이스를 같은 스펙 안에 싣는다.** 알려진 입력 하나를 바꾸면 해시가 반드시 달라짐을 보인다. 그것이 없으면 지문은 조용히 초록이 되는 장치다.

### 5-3. 기준선 채취 (소스 변경 0 상태에서 먼저)

```bash
cd "$(git rev-parse --show-toplevel)" && npm run lint && npm run typecheck && npm test && npm run build && npm run qa:rules
```

```bash
cd "$(git rev-parse --show-toplevel)" && npx playwright install chromium webkit && npm run test:e2e
```

`npm test` 의 기준선은 분석 세션이 실측했다 — **85 files / 609 tests 통과 / 5.44s**. 다른 수가 나오면 그 차이부터 설명한 뒤 진행한다.

### 5-4. 이음매마다 돌리는 것

```bash
cd "$(git rev-parse --show-toplevel)" && npm run lint && npm run typecheck && npm test && npm run build && npm run qa:rules && npm run test:e2e:gate
```

통과 조건 셋: ① 지문 JSON 3 종이 **바이트 동일**(diff 0 행) ② baseline 비교 실패 0 ③ 명령 전부 exit 0. **하나라도 어긋나면 그 이음매는 행동을 바꾼 것이다.**

### 5-5. 이음매별 직접 증인 baseline

추적 baseline 170 장 = theme-matrix 164 + safari 5 + state-smoke 1. 164 중 랜딩 카드를 화면에 담는 것은 **52 장**이다.

| 이음매 | 직접 증인 |
|:---|:---|
| S1 모바일 표면 | `theme-state-mobile-landing-test-expanded-{en,kr}-{light,dark}-mobile` 4 장 |
| S2 데스크톱 셸 | `theme-state-landing-test-expanded-*` 8 장 + webkit ghosting 5 장(`closing`·`cleanup-pending` 위상은 여기서만 본다) + `state-smoke` 의 `expanded-focus-shell` 1 장 |
| S3 확장 본문 | 위 12 장 |
| S4 Normal face | `theme-layout-landing-normal-*` 24 장 |
| S5 클래스명 | 52 장 전부 |
| C1 · H1 · M1 | webkit ghosting 5 장 + `state-smoke` 26 케이스 + F1·F3 |

### 5-6. `qa:rules` 는 증거로서 약하다 — 알고 들어간다

`check-phase7-state-contracts.mjs:99` 는 컨트롤러 파일 본문에 `resolveCardStateForVariant` 라는 **글자**가 있는지를 보는데 그 글자는 import 문에도 있다. 함수를 옮기고 import 만 남겨도 초록이다. 같은 성질이 phase5·6·8·9 전반에 있다.

결론 둘. **첫째, `qa:rules` 를 「행동이 안 변했다」의 증거로 쓰지 않는다** — 그것은 「약속한 이름이 약속한 파일에 남아 있다」의 증거다. **둘째, 그럼에도 매 이음매마다 돌린다** — 이름이 옮겨 갔다는 사실 자체가 계약 문서가 참조하는 위치가 바뀌었다는 신호이고, 그때 문서를 따라 고쳐야 한다.

---

## 6. 위험 — 이 분리가 깨뜨릴 수 있는 것

| # | 위험 | 대응 |
|:--:|:---|:---|
| 1 | **React 훅 순서·정체성** | 자식만 추출하고 훅 호출을 옮기지 않는다. 훅이 딸린 컴포넌트를 형제로 가르지 않는다(§1-②) |
| 2 | **`useId` 값 이동** | §5-2 의 실측 규칙. `useId` 는 `:965` 첫 문장이므로 자식 추출은 안전. 그래도 지문은 정규화한다 |
| 3 | **클로저 캡처·`useCallback` 의존 배열** | C1·H1 은 의존 집합이 닫힌 군집임을 확인하고 자른다. 핸들러 **동일성**을 F3 이 본다 |
| 4 | **리렌더 경계** | 자식 컴포넌트를 새로 만들면 memo 경계가 생긴다 — `React.memo` 를 **추가하지 않는다**(추가는 행동 변경) |
| 5 | **CSS 모듈 스코프** | `.root<modifier> .child` 규칙 30 여 개가 root 와 자식이 같은 트리에 있음을 전제한다. 자식을 다른 파일로 옮기되 **DOM 위치는 바꾸지 않는다** |
| 6 | **소스 텍스트를 읽는 테스트** | `qa:rules` 13 체커와 일부 unit 테스트가 파일 본문의 철자를 본다. §5-6 |
| 7 | **Ask-First 경계** | S5 와 C2 가 `scripts/qa/*.mjs` 를 건드린다 — **둘 다 하지 않는 것이 이 단계의 권고다** |

---

## 7. 완료 조건

- [ ] 단위 1~9 가 각각 §5-4 의 게이트를 통과했고, 지문 3 종이 매번 바이트 동일이었다.
- [ ] `landing-grid-card.tsx` ≤ 약 470행 · `use-landing-interaction-controller.ts` ≤ 약 562행 · `use-hover-intent-controller.ts` ≤ 약 427행 · `interaction-state.ts` ≤ 약 427행.
- [ ] 죽은 표면 ①이 제거됐고 ②·③은 **보고만** 됐다.
- [ ] `qa:visual:full` 을 **한 번도 실행하지 않았다.**
- [ ] `docs/decision-register.md` 에 변경 이력 1 행.
- [ ] 이 문서를 `docs/done/` 으로 옮겼다(같은 커밋).

## 7-1. 점수표는 이 단계의 대상이 아니다

`docs/plans/2026-09-11-mobile-refactor-maps/scorecard.md` 의 217 행은 **전부 행동 변경**이므로 이 단계에서 하나도 손대지 않는다. 0단계의 성공 기준은 「그 217 행 중 아무것도 고치지 않았는데 구조가 갈렸다」이다. 유일한 예외가 §4 의 죽은 표면 ① — 그것은 SSR 마크업이 바이트 동일함으로 「행동이 아니었다」가 증명되는 종류다.

## 8. 이 단계에서 하지 않는 것 (do not)

- 뷰포트·입력 축을 **옮기지 않는다** — step 2 의 일이다.
- 값을 **하나도 바꾸지 않는다** — 색·간격·duration·임계값 전부.
- `React.memo`·`useMemo` 를 **추가하지 않는다**.
- S5(클래스명)와 C2(바인딩 해석기)를 **하지 않는다** — 둘 다 Ask-First QA 스크립트를 건드리고 이득이 가장 작다.
- 죽은 표면 ②(i18n 키)와 ③(`.motionStageLate`)을 **지우지 않는다** — 보고만 한다.
- `docs/req-landing.md`·`docs/req-test.md`·`docs/design/design.md` 를 **고치지 않는다**.

## 9. 실행 프롬프트

이 문서를 읽은 세션에게 다음 한 문장이면 충분하다 — **「`docs/plans/2026-09-11-mobile-refactor-step1-seam.md` 를 그대로 실행하라. §2 의 10 단위를 순서대로, 각 단위마다 §5-4 의 게이트를 돌리고 지문 3 종이 바이트 동일인지 확인한 뒤 다음으로 넘어가라. §8 의 금지 목록을 지켜라.」**
