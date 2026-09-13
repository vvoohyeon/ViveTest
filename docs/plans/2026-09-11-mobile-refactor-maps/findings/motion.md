# 렌즈: motion — ViveTest 모바일 전면 리팩터 착수 분석

**측정 대상:** `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (세션 전용 clone, HEAD `7616211` = 착수 마커, 내용은 `a5aec95` 와 동일). 읽기 전용 — `git status --porcelain` 빈 출력으로 저장소 무변경 확인.
**방법:** `src/` 전체 CSS 3 파일 전문 + 모션 선언을 가진 TSX/TS 클래스 문자열 전수 + `docs/req-landing.md` §8·§11·§13, `docs/design/design.md` §4.8·§5.11·§8, `docs/design/ds/colors_and_type.css` MOTION 블록, `docs/decision-register.md` BQ-38/BQ-39, `docs/done/2026-09-10-step4-mobile-cls-and-card-thumbnails.md` 를 직접 읽었다. Tailwind v4.1.0 컴파일 프로브 2회를 이 clone 의 `node_modules` 로 직접 돌려 variant emit 형태와 emit 순서를 확인했다(scratchpad 안에서만 실행).
**브라우저 실측은 하지 않았다.** 아래의 모든 수치는 소스에서 읽은 값 · 컴파일러 출력 · 저장소가 스스로 기록한 실측치 중 하나다. 렌더로만 확정되는 항목은 전부 「미확인」으로 표시했다.

---

## 0. 모션 선언 전수 census

### 0-1. 런타임 모션 토큰은 4개뿐이고, 소비처는 7군데다

`src/app/globals.css:195-198` 이 선언하는 전부다.

| 토큰 | 값 | 소비처(전수) |
|:---|:---|:---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | `button-class-names.ts:39` · `blog-destination-client.tsx:43` — **2** |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.2, 1)` | `test-question-client.tsx:67` — **1** |
| `--dur-fast` | `140ms` | `button-class-names.ts:39` · `landing-grid-card.module.css:193` · `blog-destination-client.tsx:43` — **3** |
| `--dur-slow` | `280ms` | `test-question-client.tsx:67` — **1** |

**핵심 관측:** M-01(BQ-38)이 「코어 확장/축소 곡선」으로 확정한 `--ease-in-out` 을 실제로 소비하는 원소는 제품 전체에서 **진행률 바 하나**다(`test-question-client.tsx:67`). M-01 이 겨냥한 랜딩 카드 21개 애니메이션은 이 토큰을 참조하지 않고 같은 값을 `--landing-card-motion-ease` 로 다시 선언해서 쓴다(`landing-grid-card.module.css:41`, 바이트 동일).

### 0-2. 리터럴로 적힌 duration — 토큰보다 3배 많다

`grep -ro` 전수: `140ms` **13회** · `180ms` **7회**(그중 `globals.css:150` 은 shadow alpha `0.18` 오탐이므로 실제 **6회**) · `280ms` **3회** · `120ms` **1회** · stagger `20/40/80/100/140/160ms` **9회**.

| 값 | ds 가 이미 가진 이름 | 런타임 토큰 | 리터럴 자리 |
|:---|:---|:---|:---|
| `140ms` | `--dur-fast` | 있음 | `settings-controls.tsx:29` · `site-gnb.tsx:50,64,101` · `landing-grid-card.tsx:235,239,509` · `module.css:88,89` |
| `180ms` | `--dur-base` (`ds/colors_and_type.css:353`) | **없음** | `site-gnb.tsx:38,82,87(×2)` · `landing-catalog-grid.tsx:31` · `module.css:580` · `landing-grid-card.tsx:1000`(JS `reducedMotion ? 180 : 280`) · `test-question-client.tsx:358`(`duration: 0.18`) |
| `280ms` | `--dur-slow` | 있음 | `landing-grid-card.tsx:213` · `hover-intent.ts:3`(JS 상수) · `mobile-lifecycle.ts:1`(JS 상수) |
| `120ms` | `--dur-micro` (`ds:352`) | **없음** | `module.css:311` |
| `40/100/160ms` | `--stagger-1/2/3` (`ds:359-361`) | **없음** | `module.css:290,295,300,345,350,355` |
| `20/80/140ms` | `--stagger-exit-1/2/3` (`ds:363-365`) | **없음** | `module.css:316,321,327` |

### 0-3. 실제로 출하되는 easing 곡선은 4종이고, 가장 많이 쓰이는 것이 토큰이 아니다

| 곡선 | 실값 | 사용처 수 | 토큰인가 | design.md §5.11 에 있는가 |
|:---|:---|---:|:---:|:---:|
| `ease` 키워드 | `cubic-bezier(0.25, 0.1, 0.25, 1)` | **12** | 아니다 | 아니다 |
| `--landing-card-motion-ease` / `--ease-in-out` | `cubic-bezier(0.45, 0, 0.2, 1)` | 21 애니메이션 + 1 | 절반 | **아니다** |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 2 | 그렇다 | 그렇다 |
| `ease-out` / `easeOut` | `cubic-bezier(0, 0, 0.58, 1)` | 2 | 아니다 | `--ease-out` 은 다른 값(`0.0,0,0.2,1`)이다 |

`ease` 키워드 12자리 전수: `site-gnb.tsx:38,50,64,82,87,101` · `settings-controls.tsx:29` · `landing-grid-card.tsx:235,239` · `landing-catalog-grid.tsx:31` · `module.css:88,89`. 즉 GNB 전체 · 설정 칩 전체 · 두 backdrop · 답변 버튼이 디자인 시스템에 이름이 없는 브라우저 기본 곡선을 쓴다.

### 0-4. `@keyframes` 13개 — 애니메이션하는 속성으로 분류

| keyframes | 줄 | 속성 | 합성 가능 | 모바일 경로 |
|:---|---:|:---|:---:|:---:|
| `landing-card-shell-expand` / `-collapse` | 421 · 443 | `transform: scale` | ✓ | |
| `landing-card-shell-frame-expand` / `-collapse` | 431 · 453 | **`left`, `width`** | ✗ | |
| `landing-card-detail-rise` | 465 | `transform: translateY(4px)` | ✓ | ✓ |
| `landing-card-shell-reduced-open` / `-close` | 475 · 485 | `opacity` | ✓ | ✓ |
| `landing-card-normal-slot-exit` / `-enter` | 495 · 505 | `opacity` | ✓ | ✓ |
| `landing-card-detail-quiet-exit` | 515 | `opacity`, `clip-path` | ✓ | ✓ |
| `landing-card-mobile-open-shell` | 527 | **`left`, `width`, `border-radius`** | ✗ | ✓ |
| `landing-card-mobile-close-shell` | 541 | **`left`, `width`, `border-radius`** | ✗ | ✓ |
| `landing-card-mobile-close-surface` | 555 | `opacity` | ✓ | ✓ |

### 0-5. `prefers-reduced-motion` 커버리지 — 20개 선언 중 16개 보호 = **80%**

보호되는 것(16): `module.css:99`(blogCard) · `module.css:202`(readMore delay) · `module.css:576`(토큰 축소) · `.root.reducedMotion …` 규칙군(module.css:363-417, JS `matchMedia` 가 붙이는 클래스) · `button-class-names.ts:39,97` · `site-gnb.tsx:38,50,87,101` · `landing-grid-card.tsx:235,239,509` · `test-question-client.tsx:67` · `blog-destination-client.tsx:43` · `test-question-client.tsx:358`(`useReducedMotion()`) · `theme-transition.ts:36-41`(View Transition 자체 스킵).

**빠진 것 4개(전수):**

| 파일:줄 | 무엇 | 전이 속성 |
|:---|:---|:---|
| `site-gnb.tsx:64` | `gnbInteractiveButtonBaseClassName` — 뒤로가기 · 햄버거 · 설정 트리거 pill 전부 | border/background/box-shadow/color, 140ms |
| `site-gnb.tsx:82` | `gnbMobileBackdropClassName` — 드로어 스크림 | opacity, 180ms |
| `settings-controls.tsx:29` | `chipBaseClassName` — 12 로케일 칩 + 테마 칩 전부 | border/background/box-shadow/color, 140ms |
| `landing-catalog-grid.tsx:31` | 모바일 카드 스크림 | opacity, 180ms |

넷 다 색/불투명도이고 `design.md:376`(§8 Reduced motion: "drop translate animations and keep opacity fades only")은 색·불투명도 전이를 허용하므로 **계약 위반은 아니다.** 같은 부류 12자리를 가드하면서 이 넷만 빼놓은 것이 문제이므로 내부 비일관으로 분류한다.

### 0-6. 표면별 진입/이탈 모션 유무

| 표면 | 진입 | 이탈 | 근거 |
|:---|:---|:---|:---|
| 랜딩 카드 확장(데스크톱) | 280ms 4단 | 280ms 대칭 | `module.css:243-300` |
| 랜딩 카드 확장(모바일) | 280ms — **가로만** | 280ms — 가로만 | `module.css:330-340` · §1 참조 |
| GNB 모바일 드로어 | **없음** | 12px/180ms | `types.ts:5` 상태 3종에 `opening` 부재 |
| GNB 데스크톱 설정 패널 | **없음** | **없음** | `site-gnb.tsx:75` 클래스 문자열에 transition 0건 |
| instruction overlay(모바일 전면) | **없음** | **없음** | `instruction-overlay.tsx` 전체 transition/animate grep 0건 |
| qualifier step | **없음** | **없음** | `qualifier-chip.tsx` grep 0건 |
| consent banner | **없음** | **없음**(occlusion 은 하드 컷) | `consent-banner.tsx:39,43` |
| transition ghost GNB | **없음** | **없음** | `transition-gnb-overlay.tsx:15` |
| 테스트 문항 전환 | 18px/180ms(선택지만) | **없음** | `test-question-client.tsx:353-358` |
| 블로그 · 히스토리 · 404 · `/test/error` | **없음** | **없음** | 네 파일 전부 grep 0건 |

---

## 1. `mobile-expand-height-is-a-single-frame-jump` — blocker

**지금 무엇이 일어나는가.** 모바일 카드 확장에서 **높이는 애니메이션되지 않는다.** `@keyframes` 13개 중 `height`·`max-height`·`grid-template-rows` 를 다루는 것이 0개이고(전문 확인), 카드 루트(`LANDING_GRID_CARD_ROOT_CLASSNAME`, `landing-grid-card.tsx:215`)와 모바일 확장 본문(`LANDING_GRID_CARD_MOBILE_EXPANDED_CLASSNAME`, `:284`) 어느 쪽에도 `transition` 선언이 없다. 대신 이렇게 동작한다 — `isMobileExpanded = isMobileViewport && isTestCard && mobilePhase === 'OPEN'`(`:973`)이므로 **OPENING 280ms 내내 in-flow 카드는 Normal 높이 그대로**이고, `position: fixed` 인 transient shell(`:291`)이 그 위에서 `left`/`width` 만 애니메이션한다. `MOBILE_EXPANDED_DURATION_MS = 280`(`mobile-lifecycle.ts:1`) 타이머가 `OPEN_SETTLED` 를 디스패치하는 **그 한 프레임에**(`use-mobile-card-lifecycle.ts:122-125`) 트리거가 `[min-height:0] [padding:0]`(`:1059`)로, 내용이 `[height:0]`(`:1064`)로, 확장 본문이 `max-h-[calc(100dvh-116px)]` 로 동시에 바뀐다. 즉 카드와 그 아래 모든 행이 한 프레임에 수백 px 이동한다.

**실측 근거로 잡은 이동 폭.** 390×844 에서 모바일 카드 Normal 높이는 255px(주어진 실측), 확장 본문 상한은 `calc(100dvh - 116px)` = 728px(`landing-grid-card.tsx:285`). 모바일은 항상 1열이므로(`layout-plan.ts:81-87`) 뒤따르는 모든 카드가 최대 **473px** 만큼 한 프레임에 내려간다. 픽셀 실측은 하지 않았다 — 상한은 클래스 문자열에서 계산한 값이다.

**계약이 존재하지 않는 메커니즘을 지목한다.** `docs/req-landing.md:638` 「모바일 외곽 컨테이너 높이 전이는 content-fit 목표 높이까지 monotonic(증가/감소)이어야 하며 overshoot를 금지한다」, `:639` 「content-fit 높이 계산은 런타임 실측(`from px -> to px -> auto`) 또는 동등 정확도 방식으로 수행한다」. `from px -> to px -> auto` 패턴은 `src/` 어디에도 없다(전수 grep: `height` 를 애니메이션하는 선언 0건). 한 프레임 점프는 「monotonic」과 「overshoot 없음」을 자동으로 만족하므로 이 두 조항은 **공허하게만 참**이다. 그리고 `:637` 「동일 카드의 연속 전이로 지각되어야 하며, 분리된 별도 카드가 돌출되는 듯한 강한 불연속 전이를 금지한다」는 실질적으로 위반이다 — 사용자가 보는 것은 fixed 오버레이가 가로로 펼쳐지다가 280ms 째에 페이지가 통째로 접히는 두 개의 분리된 사건이다.

**죽은 CSS 가 이 사실을 증언한다.** `module.css:387-389` 의 `.root.reducedMotion.mobilePhaseClosing .mobileExpanded { animation: none }` 는 **존재하지 않는 애니메이션을 취소한다** — `styles.mobileExpanded` 를 겨냥하는 `animation` 규칙이 파일 전체에 이 한 줄뿐이다(전수 grep). 누군가 모바일 확장 본문에 높이 애니메이션이 있다고 가정하고 reduced-motion 예외를 먼저 적어 둔 자리다.

**무엇으로 바꾸는가.** 모바일 확장을 in-flow 높이 전이가 아니라 **바텀시트(별도 레이어)** 로 바꾸면 이 결함과 transient shell · 스냅샷 · 복원 폴링이 함께 사라진다(surface-landing 지도의 선택지 B 와 같은 결론). in-flow 를 유지한다면 최소 구현은 ⑴ OPENING 진입 프레임에 카드 루트에 `height: <snapshot>px` 를 쓰고 ⑵ 다음 프레임에 측정한 목표 높이 px 를 쓰며 ⑶ `transitionend` 에서 `height: auto` 로 풀는 3단계이고, 이것이 `:639` 가 이미 적어 둔 `from px -> to px -> auto` 다. 어느 쪽이든 `:625`(top jump 금지) · `:626`(y-anchor 편차 0) · `:634`(닫힘 복귀 `0px`) 셋과 함께 개정해야 한다.

---

## 2. `decision2-moves-hydration-shift-to-ungated-desktop` — blocker

**렌즈의 질문에 대한 코드 판정: 그렇다. 이동이 생기고, 그 자리는 지금 게이트가 없는 데스크톱이다.**

**현재.** SSR 중립값은 `INITIAL_VIEWPORT_WIDTH = 1280`(`landing-catalog-grid.tsx:28`)이고 `resolveLandingViewportTier(1280) = 'desktop'`(`layout-plan.ts:63-73`), 따라서 `isMobileViewport = viewportTier === 'mobile'`(`landing-grid-card.tsx:970`)은 SSR 에서 **false** 다. `hoverCapability` 는 `useState(false)`(`use-landing-interaction-controller.ts:112`)이므로 `resolveInteractionMode(1280, false) = 'tap'`(`:71-77`) — §8.1(`req-landing.md:516`)의 「SSR 초기값은 Tap Mode」와 일치한다. **즉 지금은 mode 와 lifecycle 의 SSR 중립값이 서로 다른 축에서 와서 우연히 각자 맞다.**

**결정 2 를 적용하면.** 생명주기가 입력 축으로 옮겨 가면 `isMobileViewport` 의 SSR 값은 `hoverCapability === false` → **true**(터치 생명주기)가 된다. §8.1 의 Tap Mode 중립값과 정합하려면 그래야 한다. 그러면 **데스크톱에서** SSR HTML 이 모바일 분기로 렌더된다.

**모바일 분기가 레이아웃을 바꾸는 자리는 정확히 두 줄이다.**
- `landing-grid-card.tsx:379` — 부제: `isMobileViewport ? 'overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-2'`
- `landing-grid-card.tsx:408` — 제목: `isMobileViewport ? 'block overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-1'`

둘 다 clamp 해제이므로 **SSR 이 더 높은 카드를 그린 뒤 하이드레이션이 줄인다.** `source-fixture.ts:194` 의 `ops-handbook` 부제는 371자이며 그 문장 자신이 「clamp 와 overflow 규칙 검증용으로 의도적으로 길게 쓴 문장」이라고 적는다. 데스크톱 카드 폭 395px(1440px 뷰포트, 주어진 실측)에서 clamp 없는 371자는 여러 줄이 되고, 하이드레이션이 2줄로 자른다.

**그리고 데스크톱에는 그 이동을 가릴 것도 잡을 것도 없다.** 첫 페인트 게이트는 `@container landing-grid (width < 1160px) { .container[data-measured='false'] { visibility: hidden } }`(`landing-catalog-grid.module.css:31-34`) 하나뿐이고 **컨테이너 폭 기준**이다. 컨테이너 폭 = `min(1280, viewport) - 2 × 24`(`page-shell.tsx:22` + `globals.css:334`)이므로 뷰포트 **1208px 이상에서 게이트가 발동하지 않는다**(1208 − 48 = 1160). 그리고 CLS 회귀 검사는 `tests/e2e/grid-smoke.spec.ts:2286` 의 **390×812 한 자리뿐**이다 — 데스크톱 CLS 검사가 저장소에 0건이다(전수 확인). 저장소가 기록한 데스크톱 CLS 는 `0.00177`(`docs/done/2026-09-10-step4-mobile-cls-and-card-thumbnails.md`)이고 그 판정 규칙은 「데스크톱 CLS 를 `0.01` 이상으로 올리지 않는다」였다.

**이 위험은 이미 한 번 관측됐다.** 같은 커밋 메시지(`21e1de4`)가 후보 ⑵ 를 기각하며 「**두 번째 이동원(카드의 `viewportTier` 렌더)을 드러냈다**」고 적는다. 그 두 번째 이동원이 바로 위의 379/408 두 줄이고, 결정 2 는 그것을 데스크톱으로 옮긴다.

**무엇으로 바꾸는가.** 세 가지를 한 단위로 묶어야 한다. ⑴ **clamp 판정을 입력 축에서 떼어 폭 축에 남긴다** — 379/408 의 조건을 `isMobileViewport` 가 아니라 `viewportTier === 'mobile'` 또는 컨테이너 쿼리로 바꾼다(clamp 는 공간의 함수이지 입력의 함수가 아니다; 결정 2 가 옮기려는 것은 생명주기이지 레이아웃이 아니다). ⑵ 첫 페인트 게이트를 `width < 1160px` 이 아니라 `.container[data-measured='false']` 전체로 넓히거나, 하이드레이션이 바꿀 수 있는 속성을 SSR 에서 쓰지 않는다. ⑶ `tests/e2e/grid-smoke.spec.ts` 의 CLS 검사를 1440×900 으로 복제하고 임계를 `0.01` 로 둔다 — 저장소 자신이 정한 판정 규칙 값이다.

**주의:** `scripts/qa/check-phase9-performance-contracts.mjs:41` 이 `useState<number>(INITIAL_VIEWPORT_WIDTH)` 철자를 고정하고 `:45` 가 `readViewportWidth` 를 금지한다. 중립값을 손대면 이 검사가 붉어진다.

---

## 3. `layout-property-keyframes-on-mobile-shell` — major

**`req-landing.md:755` 「Expanded 관련 모션은 transform/opacity 중심으로 구성한다」의 정면 위반이다.** 13개 keyframes 중 4개가 `left`/`width` 를 애니메이션한다(§0-4 표). 그중 **모바일 경로를 타는 둘**이 문제다 — `landing-card-mobile-open-shell`(`module.css:527-539`)과 `landing-card-mobile-close-shell`(`:541-553`)이 `left: var(--landing-mobile-card-left)` → `0`, `width: var(--landing-mobile-card-width)` → `100vw`, `border-radius: var(--landing-card-radius)` → `0` 을 280ms 동안 매 프레임 바꾼다. `left`·`width` 는 레이아웃 속성이므로 매 프레임 리플로 + 리페인트가 발생하고, 대상은 **뷰포트 전폭의 `position: fixed` 요소 안에 확장 카드 본문 전체**다.

**데스크톱 대응물에는 최소한의 힌트라도 있고 모바일에는 없다.** `landing-grid-card.tsx:270` 의 데스크톱 shell frame 은 `will-change-[left,width] [backface-visibility:hidden]` 을 달고 `.desktopStageActive`(`module.css:228-234`)가 `contain: paint; isolation: isolate; transform: translateZ(0)` 까지 건다. 모바일 transient shell(`landing-grid-card.tsx:291`)의 클래스 문자열에는 `will-change`·`contain`·`translateZ` 가 **하나도 없다**(전문 확인). 더 느린 기기에서 도는 쪽이 힌트가 더 적다. (`will-change: left, width` 자체는 레이아웃 비용을 없애지 못하므로 데스크톱 쪽도 유효한 대책은 아니다.)

**`:756` 「비확장 row 재계산 유발 구현을 금지한다」와도 맞물린다.** 모바일에서 shell 은 `fixed` 라 다른 행을 직접 밀지는 않지만, `100vw` 는 세로 스크롤바 폭을 포함하므로 클래식 스크롤바가 있는 환경(결정 2 로 터치 노트북·태블릿이 이 경로로 들어오면 현실이 된다)에서 가로 오버플로를 만든다.

**무엇으로 바꾸는가.** 두 keyframes 를 `transform` 기반으로 재작성한다 — shell 을 항상 `left: 0; width: 100vw` 로 두고 시작 상태를 `transform: translateX(cardLeft + cardWidth/2 - 50vw) scaleX(cardWidth / 100vw)` 로, 끝 상태를 `transform: none` 으로 잡는다. `border-radius` 는 `transform` 으로 표현할 수 없으므로 별도 longhand 로 남기되(리페인트만 유발, 리플로 없음) 시각적으로는 clip-path 로 대체 가능하다. 가로 scaleX 는 내부 콘텐츠를 왜곡하므로 shell 에만 걸고 내부는 역-scale 하거나, shell 을 빈 배경 패널로 두고 콘텐츠는 opacity 로만 등장시킨다(이미 `transientPanel` 이 배경 전용 원소로 분리돼 있다 — `landing-grid-card.tsx:293`). `100vw` 는 `100%` 또는 `100dvw` 로 바꾼다.

---

## 4. `no-feedback-during-landing-to-destination-navigation` — major

**모바일에서 테스트를 시작하는 탭은 아무 시각 반응도 만들지 않고, 그 침묵이 최대 1600ms 지속될 수 있다.**

**탭 자체에 피드백이 없다.** 랜딩 확장 카드의 A/B 버튼은 `ExpandedTestAnswerChoice`(`landing-grid-card.tsx:670-697`)이고 클래스는 `LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME`(`:235`)다. 그 문자열에는 `hover:border-…` · `hover:bg-…` · `focus-visible:…` 만 있고 **`active:` 가 없으며 `data-selected` 같은 상태 속성도 없다**(전문 확인). Tailwind v4.1.0 컴파일 프로브 결과 `hover:` 는 `&:hover { @media (hover: hover) { … } }` 로 emit 되므로 **터치 기기에서 이 140ms 전이는 결코 발화하지 않는다.** 즉 탭의 시각 결과는 0 이다.

**그 다음 화면은 계약상 얼어붙는다.** `req-landing.md:866-868` — 「전환 시작 즉시 `TRANSITIONING` 으로 진입한다 / 시작 프레임의 카드 시각 상태를 고정한다 / 전환 중 상태 되돌림을 금지한다」. 구현은 `INTERACTION_BLOCKING_PAGE_STATES = new Set(['INACTIVE', 'TRANSITIONING'])`(`interaction-state.ts:111`)로 모든 카드 상호작용을 끈다.

**그리고 기다림을 표시하는 것이 제품 전체에 없다.** spinner · skeleton · 진행 표시 · `src/app/**/loading.tsx` **전부 0건**(전수 grep). 타임아웃은 `LANDING_TRANSITION_TIMEOUT_MS = 1600`(`transition/constants.ts:1`)이고 `req-landing.md:878` 이 그 값을 계약으로 못박는다. 셀룰러에서 목적지 라우트가 늦으면 사용자는 최대 1.6초 동안 **탭에도 반응하지 않고 아무 변화도 없는 화면**을 본다. 표준적인 사용자 반응은 재탭이지만 그 입력은 `TRANSITIONING` 이 삼킨다.

**근거 규범.** Nielsen 의 응답시간 3구간에서 1.0초는 「사용자의 사고 흐름이 끊기는 경계이며 이 이상은 반드시 피드백이 필요하다」는 자리다. iOS HIG 의 progress indicator 와 Material 3 의 loading indicator 는 둘 다 「즉시 끝나지 않는 작업에는 진행 표시를 둔다」를 요구한다. 저장소 자신의 계약이 1600ms 를 허용하므로 이 구간은 설계상 존재한다.

**무엇으로 바꾸는가.** 두 겹으로 나눈다. ⑴ **탭 즉시 피드백** — A/B 버튼에 `active:` 압력 상태(`active:bg-[var(--expanded-choice-accent-surface)] active:border-[var(--expanded-choice-accent)]`)와 탭 직후의 `data-committed="true"` 선택 표시를 준다. 이것은 네트워크와 무관하게 항상 즉시 발생한다. ⑵ **지연 표시** — 전환 시작 후 `400ms`(Material 3 의 「짧은 작업에는 표시를 띄우지 않는다」 관행 경계) 넘게 미완료면 버튼 안 또는 카드 헤더에 결정적 진행 표시를 띄운다. §13.3 의 「시작 프레임의 카드 시각 상태를 고정한다」가 이 추가를 막으므로 그 조항에 「고정 대상은 카드의 레이아웃·확장 상태이며, 전환 진행을 나타내는 표시의 추가는 고정 위반이 아니다」를 명시해야 한다.

---

## 5. `single-spec-clause-forbids-mobile-duration-tuning` — major

**모바일 duration 을 데스크톱과 다르게 잡는 것을 계약 한 줄이 금지한다.** `req-landing.md:579` — 「Desktop/Mobile 공통 duration/easing/stagger는 단일 규격으로 관리한다.」 이 문장은 §8.3 의 **계약(불변식)** 층에 있으므로(`:568` 이 계약/조정값 경계를 선언하고 `:570` 만 「(조정값)」으로 표시한다) 개정에 사용자 승인이 필요하다. 즉 이 렌즈가 다루는 「모바일은 짧은 duration 을 선호한다」는 관행을 적용하려면 **먼저 이 줄을 개정해야 한다.**

**구현도 그 한 줄대로 되어 있다.** `CORE_MOTION_DURATION_MS = 280`(`hover-intent.ts:3`, 데스크톱) 과 `MOBILE_EXPANDED_DURATION_MS = 280`(`mobile-lifecycle.ts:1`, 모바일)이 **서로를 참조하지 않는 두 개의 독립 상수인데 값이 같다.** CSS 쪽 `--landing-card-motion-ms` 는 `landing-grid-card.tsx:213`(Tailwind 유틸리티 `[--landing-card-motion-ms:280ms]`)과 `:1160`(인라인 style, 항상 이김)에서 세 번째로 선언된다. **같은 하나의 값이 세 곳에 독립으로 적혀 있고 어느 것도 다른 것에서 유도되지 않는다.**

**§8.5 는 모바일에 별도 대역을 이미 갖고 있어 문서 안에서도 어긋난다.** `:636` 「전환 `220~360ms`(기준 `280ms`), spring/overshoot 금지」는 §8.3 의 「단일 규격」과 병존할 수 없다 — 모바일에 자기 대역이 있다는 것은 단일 규격이 아니라는 뜻이다. 그리고 `:570` 의 데스크톱 규격은 `280ms` 고정이고 대역이 없다.

**관행.** Material 3 의 duration 토큰은 이동 거리·면적의 함수이지 기기 종류의 함수가 아니지만, **enter 와 exit 의 비대칭**은 명시적이다 — `motion.duration.medium2`(300ms) 계열이 enter, `short4`(200ms) 계열이 exit 이며 「사라지는 것은 나타나는 것보다 빨라야 한다」가 규칙이다. `req-landing.md:573` 「Expanded→Normal은 동일 축/곡선으로 대칭 복귀해야 한다」와 BQ-38 의 M-01 결정(`decision-register.md:358`, 감속 전용 곡선을 「닫힘이 열림보다 급하게 끝나 dismissal 로 읽힌다」는 이유로 기각)은 이 관행과 **의도적으로 반대**다. 따라서 이것은 결함이 아니라 **결정 필요** 항목이다 — 다만 그 결정은 데스크톱 hover 확장(마우스가 스쳐 지나갈 뿐인 저비용 상태)을 놓고 내려졌고, 모바일의 전면 전개(사용자가 명시적으로 열고 닫는 고비용 상태)에는 같은 논거가 적용되지 않는다.

**무엇으로 바꾸는가.** `:579` 를 「duration/easing/stagger 의 **어휘와 곡선**은 Desktop/Mobile 단일 규격으로 관리하며, 값은 표면별 토큰으로 분기할 수 있다. 분기하는 값은 `docs/decision-register.md` 에 등재한다」로 개정한다. 그 위에서 §11 의 토큰 계층(finding 12)에 `--dur-expand-mobile` / `--dur-collapse-mobile` 을 신설하고 세 하드코딩 자리를 전부 그것으로 수렴시킨다. 값의 출발점 제안: enter `280ms` 유지 · exit `200ms`(M3 `short4`, §8.5:636 의 220 하한을 함께 220 으로 내리거나 하한을 200 으로 개정).

---

## 6. `reduced-motion-visual-and-state-machine-desync` — major

**reduced-motion 에서 그림은 180ms 에 끝나는데 상태 기계는 280ms 를 기다린다.** `landing-grid-card.tsx:1000` 이 `const resolvedMotionDurationMs = reducedMotion ? 180 : 280`, `:1160` 이 그것을 `--landing-card-motion-ms` 로 인라인 주입한다. CSS 애니메이션은 전부 `var(--landing-card-motion-ms)` 를 쓰므로 reduce 에서 180ms 다. 그런데 위상 전환 타이머는 **리터럴 상수**다 — `use-mobile-card-lifecycle.ts:124`·`:258` 이 `MOBILE_EXPANDED_DURATION_MS`(=280), `use-desktop-motion-controller.ts:158,172,183` 이 `CORE_MOTION_DURATION_MS`(=280). 두 상수 어디에도 reduced-motion 분기가 없다(전문 확인).

**결과.** reduced-motion 사용자는 애니메이션이 끝난 뒤 **100ms 동안** 아직 OPENING/closing 위상에 머문다. 모바일에서는 그동안 `position: fixed` transient shell 이 `animation-fill-mode: both` 로 끝 상태를 유지한 채 화면 위에 남아 있고, 상호작용은 차단돼 있다(`use-landing-interaction-controller.ts:553-557` 의 3중 조건). 즉 **모션을 줄여 달라고 요청한 사용자가 요청하지 않은 사용자와 정확히 같은 시간을 기다린다.**

**계약 위반이다.** `req-landing.md:760` — 「`prefers-reduced-motion`에서 대형 이동을 금지하고 `150~220ms` 단순 전환으로 축소한다.」 시각 애니메이션 180ms 는 대역 안이지만, 사용자가 겪는 전환(탭 → 조작 가능한 정착 상태)은 **280ms** 이고 220ms 상한 밖이다. 그리고 `state-smoke.spec.ts:1212` 가 `expect(normalizedMotionMs).toBe(180)` 로 **토큰만** 검사하므로 이 어긋남을 잡지 못한다.

**무엇으로 바꾸는가.** duration 을 값이 아니라 **한 곳에서 읽는 함수**로 만든다. `resolveMotionDurationMs(reducedMotion)` 을 `hover-intent.ts` 또는 새 `motion-durations.ts` 에 두고 ⑴ 인라인 커스텀 프로퍼티 ⑵ 데스크톱 타이머 3곳 ⑶ 모바일 타이머 2곳이 전부 그것을 호출하게 한다. finding 5·12 와 같은 단위로 처리한다.

---

## 7. `mobile-close-settle-is-frame-count-bounded` — major

**모바일 닫기의 정착 상한이 시간이 아니라 프레임 수라, 주사율이 높은 기기일수록 예산이 짧다.** `use-mobile-restore-polling.ts:10` `MOBILE_RESTORE_POLLING_MAX_ATTEMPTS = 30`, `:88-97` 의 `finishRestore` 가 `isRestoreSettled` 가 참이 되거나 `attempts >= 30` 이 될 때까지 매 `requestAnimationFrame` 재시도한다. 60Hz 에서 상한은 **약 500ms**, 120Hz 에서는 **약 250ms** 다. 같은 코드가 기기에 따라 두 배 다른 시간 예산을 갖는다.

**최악 체감.** 280ms 닫기 애니메이션 + 최대 500ms 폴링 + `markMobileRestoreReady` 안의 rAF 1프레임(`:71-74`) ≈ **796ms**(60Hz). 그동안 `mobilePhase !== 'NORMAL'` 이므로 카드 상호작용이 막혀 있다(`use-landing-interaction-controller.ts:553-557`).

**상한에 걸리면 계약이 조용히 깨진다.** `:92` 의 `attempts >= MOBILE_RESTORE_POLLING_MAX_ATTEMPTS` 는 정착 여부와 **무관하게** `markMobileRestoreReady` 를 부른다. `req-landing.md:634` 는 「닫힘 완료 시 해당 snapshot 높이로 `0px` 오차 복귀를 강제한다」, `:635` 는 「`NORMAL` terminal 확정은 복귀 완료(`0px` 오차) 이후에만 허용한다」고 적는데, 상한 경로는 `0px` 오차를 확인하지 않고 NORMAL 을 확정한다. 판정 허용 오차는 `Math.abs(... ) <= 1`(`mobile-card-lifecycle-dom.ts:42`)이라 이미 `1px` 이지 `0px` 도 아니다.

**무엇으로 바꾸는가.** 상한을 프레임이 아니라 `performance.now()` 기준 밀리초(예 `MOBILE_RESTORE_SETTLE_BUDGET_MS = 240`)로 바꾸고, 상한에 걸린 경로를 성공과 구분해 계측 가능한 상태로 남긴다(`data-mobile-restore-timeout="true"`). 그리고 finding 1 의 바텀시트 전환을 택하면 복원할 기하 자체가 없어져 이 훅 전체가 소거된다.

---

## 8. `motion-stage-late-never-applied` — major

**3단 stagger 중 셋째 단이 세 곳에 선언돼 있고 어디에도 적용되지 않는다.**

| 어디 | 무엇 |
|:---|:---|
| 계약 | `req-landing.md:570` 「Normal→Expanded: Phase A/B/C 각 `280ms`, C stagger `40/100/160ms`(조정값)」 |
| CSS | `module.css:297`(desktop enter) · `:352`(mobile transient) · `:359`(transient exit) · `:376`(reduced) · `:409`·`:412` — 6개 규칙이 `.motionStageLate` 를 겨냥 |
| JS 상수 | `hover-intent.ts:4` `CORE_MOTION_REVEAL_DELAYS_MS = [40, 100, 160] as const` |

**전수 grep 결과 `styles.motionStageLate` 를 붙이는 코드가 `src/` 에 0건이다.** 붙는 것은 둘뿐이다 — `motionStageEarly`(`landing-grid-card.tsx:382` 확장 블로그 부제 · `:746` preview question)와 `motionStageMiddle`(`:711` meta row · `:756` answer grid). 그리고 `CORE_MOTION_REVEAL_DELAYS_MS` 는 **저장소 전체(`src/`·`tests/`·`scripts/`·`docs/`)에서 선언 한 줄 말고 참조가 0건**이다.

**그래서 DOM 순서와 노출 순서가 어긋난다.** `ExpandedTestBody`(`landing-grid-card.tsx:737-800`)의 DOM 순서는 `previewQuestion` → `answerChoices` → `meta` 인데, 지연은 40ms → 100ms → **100ms** 다. 세 번째 항목이 두 번째와 **동시에** 나타난다. `req-landing.md:572` 「reveal 항목 순서는 DOM 순서와 일치해야 한다」의 취지 — 순차 공개 — 가 마지막 항목에서 무너진다.

**어떤 게이트도 이것을 보지 않는다.** `state-smoke.spec.ts:1229-1252` 는 `[data-motion-slot]` 전부를 훑지만 **reduced-motion 상태에서만** 돌고 단언은 `animationDelay === '0s'` 다. no-preference 에서 지연이 `40/100/160` 인지 검사하는 단언이 저장소에 없다(전수 grep: `scripts/qa/*.mjs` 에 `160` 0건). `state-smoke.spec.ts:1224-1226` 주석은 「stagger 는 자리마다 따로 적히므로(`40/100/160ms`)」라고 셋을 전제로 쓰고 있다.

**무엇으로 바꾸는가.** `meta` 행(`landing-grid-card.tsx:711`)에 `styles.motionStageMiddle` 대신 `styles.motionStageLate` 를 붙인다. 블로그 확장 본문에도 세 슬롯이 있는지 확인하고 같은 규칙을 적용한다. `CORE_MOTION_REVEAL_DELAYS_MS` 는 CSS 가 읽는 값의 사본이므로, 삭제하거나 인라인 커스텀 프로퍼티로 실제 소비시킨다 — 둘 중 하나를 고르되 참조 0인 상수를 남겨 두지 않는다. no-preference stagger 타임라인 단언을 `state-smoke` 에 신설한다(`req-landing.md:576` Verification 1 이 이미 요구한다: 「Phase 순서/시간/stagger를 타임라인 단언으로 검증한다」).

---

## 9. `theme-transition-2500ms-unanchored` — major

**제품에서 가장 긴 모션이 2500ms 이고 어떤 계약에도 근거가 없다.** `theme-transition.ts:3-9` `THEME_TRANSITION_CONFIG = {durationMs: 2500, easing: "ease-in-out", blurAmount: 2, …}`. 저장소 전체에서 `2500` 이 나오는 곳은 이 선언 · 그것을 고정하는 12줄 테스트(`tests/unit/gnb-theme-transition.test.ts:9-12`) · 현상을 서술한 분석 문서(`docs/project-analysis.md:275`) 셋뿐이다. `req-landing.md`·`design.md`·`decision-register.md` 에 조항이 0건(전수 grep).

**비교 기준.** 제품의 두 번째로 긴 모션은 `280ms` — 2500 은 그 **8.9배**다. `design.md:373`(§8) 이 나열하는 가장 긴 토큰은 `--dur-expand: 260ms` 이고, `docs/design/ds/colors_and_type.css:354` 의 실현 최댓값은 `--dur-slow: 280ms` 다. Material 3 의 가장 긴 duration 토큰은 `long4: 600ms` 이고 그 위(`extra-long`)는 「화면 전체를 가로지르는 큰 전환」 전용으로 최대 1000ms 다. **2500ms 는 M3 최대치의 2.5배다.**

**무엇이 2500ms 동안 도는가.** `buildBlurCircleStyle`(`:96-145`)이 `::view-transition-old(root)` 와 `::view-transition-new(root)` 양쪽에 `mask-size` · `mask-position` 애니메이션을 걸고 `will-change: mask-size, mask-position`(`:123`·`:130`)을 선언한다. 마스크 최종 크기는 `Math.max(viewportSize * 4, maxRadius * 2.5)`(`:108`) — 뷰포트 4배짜리 SVG 마스크가 전 화면 스냅샷 두 장 위에서 2.5초 동안 매 프레임 리샘플링된다. 모바일에서 이 비용이 가장 크다.

**모바일에서 이 2.5초는 드로어가 열린 채로 흐른다.** 모바일에는 설정 팝오버가 없고 `SettingsControls scope="mobile"` 이 드로어 바닥에 인라인으로 들어가므로(`site-gnb.tsx:468`), 테마 칩을 누르는 순간 드로어는 열려 있고 `document.body.style.touchAction = 'none'` 잠금(`use-gnb-mobile-menu.ts:141`)도 걸려 있다.

**보호는 되어 있다.** `supportsThemeTransition`(`:42-56`)이 `isReducedMotionPreferred()` 면 false 를 반환해 `runBlurCircleTransition`(`:150-155`)이 스타일 주입 없이 즉시 적용한다. WCAG 2.3.3 대상 동작은 아니다.

**무엇으로 바꾸는가.** 계약이 없으므로 **사용자 결정 1 을 기다릴 필요 없이 지금 움직일 수 있는 유일한 모션 값**이다. `durationMs` 를 `600ms`(M3 `long4`, 「화면 전체를 덮는 표면 전환」의 상한)로 내리고 `docs/decision-register.md` 에 등재한다. 재진입 가드도 함께 둔다 — 현재 `applyTheme`(`use-theme-preference.ts:119-132`)에 진행 중 전환을 취소하는 경로가 없어, 2.5초 안에 칩을 두 번 누르면 두 번째 `startViewTransition` 이 첫 번째의 스타일 요소를 `removeTransitionStyle()`(`:174`) 로 지우고 덮어쓴다.

---

## 10. `drawer-and-overlays-have-no-entrance-motion` — major

**모바일의 1차 내비게이션 표면이 모션 없이 튀어나오고, 닫힐 때만 12px 움직인다.** `src/features/gnb/types.ts:5` `export type MobileMenuState = 'closed' | 'open' | 'closing';` — **`opening` 상태가 없다.** 패널 클래스(`site-gnb.tsx:87`)는 `opacity-100 [transform:translateX(0)]` 로 마운트되고, `[transition:transform_180ms_ease,opacity_180ms_ease]` 는 이후 `data-[state=closing]:translate-x-[12px] data-[state=closing]:opacity-0` 로만 발화한다. 즉 **열기 = 하드 컷, 닫기 = 12px 슬라이드 + 페이드.**

**12px 은 이동 거리로서도 어긋난다.** 패널 폭은 `w-[min(87vw,340px)]` 이므로 390px 폰에서 339px. 12px 은 그 **3.5%** 다. Material 3 의 side sheet 은 패널 전폭을 `emphasized-decelerate` 로 들어오고(enter 400ms 대) `emphasized-accelerate` 로 나간다; iOS 의 sheet 은 화면 아래에서 전체 높이를 이동한다. 3.5% 이동은 슬라이드로 읽히지 않고 미세한 흔들림으로 읽힌다.

**같은 공백이 다른 오버레이 전부에 있다(§0-6 표).** instruction overlay 는 모바일에서 전면 다이얼로그인데(`instruction-overlay.tsx:26` 의 `max-[767px]:min-h-full max-[767px]:w-full max-[767px]:rounded-none`) 파일 전체에 `transition`·`animate`·`duration` 이 0건이다 — **모바일 사용자가 테스트를 시작하고 처음 보는 화면이 하드 컷으로 나타난다.** 데스크톱 설정 패널(`site-gnb.tsx:75`)도, consent banner(`consent-banner.tsx:43`)도, transition ghost GNB(`transition-gnb-overlay.tsx:15`)도 같다.

**내부 비일관도 있다.** 같은 제품의 `instruction-overlay` 는 `role="dialog" aria-modal="true"` 에 진짜 포커스 트랩과 열릴 때 포커스 이동을 갖는데(surface-gnb 지도의 관측) 모션은 없고, GNB 드로어는 모션은 절반 있는데 트랩이 없다. 두 모달이 서로 다른 절반씩 구현돼 있다.

**무엇으로 바꾸는가.** `MobileMenuState` 에 `'opening'` 을 추가하고(리듀서는 `use-gnb-mobile-menu.ts` 에 있다) 패널을 `translateX(100%)` 에서 `translateX(0)` 으로, 스크림을 `opacity-0` 에서 `opacity-100` 으로 들어오게 한다. 이탈은 `translateX(100%)` 로 되돌린다 — 12px 부분 이동을 전폭 이동으로 바꾼다. duration 은 enter `280ms` / exit `200ms`(finding 5 의 비대칭 제안과 같은 값), 곡선은 `--ease-in-out`. instruction overlay 는 모바일에서 하단 슬라이드업(시트 관행)으로, 데스크톱에서는 `opacity` + `scale(0.98→1)` 로 들어오게 한다. 넷 다 `motion-reduce:` 로 `opacity` 만 남긴다(`design.md:376` 이 그것을 명시적으로 허용한다).

---

## 11. `touch-has-no-press-feedback-and-hover-transitions-are-dead` — major

**Tailwind v4.1.0 컴파일 프로브(이 clone 의 `node_modules` 로 직접 실행)로 확정한 사실:**

```
.hover\:bg-red-500 { &:hover { @media (hover: hover) { background-color: … } } }
.active\:bg-blue-500 { &:active { background-color: … } }
```

`hover:` 는 `@media (hover: hover)` 뒤에 갇히고 `active:` 는 조건 없이 나간다.

**개체수.** `src/` 전체에서 `hover:` 유틸리티 **26회**, `active:` 유틸리티 **6회**(실제 자리 4곳: `button-class-names.ts:89,97,101` · `site-gnb.tsx:64`).

**`hover:` 전이만 있고 `active:` 가 전혀 없는 표면 — 전수, 전부 모바일의 주요 탭 대상이다:**

| 클래스 | 파일:줄 | 무엇을 탭하는가 |
|:---|:---|:---|
| `testAnswerChoiceClassName` | `surface-class-names.ts:83` | **테스트 문항 답변 버튼 — 제품에서 가장 많이 눌리는 컨트롤** |
| `testChipClassName` | `surface-class-names.ts:93` | qualifier 재진입 칩 |
| `chipBaseClassName` | `settings-controls.tsx:29` | 12 로케일 칩 + 테마 칩(모바일 드로어의 주 컨트롤) |
| `gnbMobileLinkClassName` | `site-gnb.tsx:101` | 모바일 드로어 내비게이션 링크 전부 |
| `blogArticleListItemClassName` | `blog-destination-client.tsx:43` | 블로그 목록 행 전부 |
| `LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME` | `landing-grid-card.tsx:235` | 랜딩 확장 카드 A/B(= 테스트 시작) |

여섯 자리 모두 `140ms` 색 전이를 선언하는데 터치에서는 그 선언 자체가 죽어 있고, 대체 피드백도 없다. `testAnswerChoiceClassName` 만 `data-[selected=true]` 를 갖지만 그것은 탭 확정 후의 상태이고 **150ms 뒤 자동 전진으로 사라진다**(`use-answer-lock.ts:32` 기본 `delayMs = 150`).

**근거 규범.** Material 3 의 state layer 사양은 `pressed` 를 enabled/hovered/focused/dragged 와 동급의 **필수 상태**로 규정한다. iOS HIG 는 터치 다운 즉시 하이라이트를 요구한다. WCAG 는 이것을 요구하지 않으므로 규범 위반이 아니라 플랫폼 관행 미달이다.

**무엇으로 바꾸는가.** 여섯 자리에 `active:` 상태를 추가하고 전이 속성에 포함시킨다. 어휘는 저장소가 이미 갖고 있다 — `buttonSecondaryClassName`(`button-class-names.ts:101`)의 `active:bg-[var(--surface-strong)]` 와 `buttonPrimaryPressedClassName`(`:89`)의 `active:bg-[var(--accent-solid-pressed)]`. `--accent-solid-pressed` 는 `globals.css:143`(light) / `:368`(dark) 에 이미 있다. 그리고 `skinTransitionClassName`(`:39`) 에 `active:` 가 포함되도록 전이 속성 상수 셋(`:41-43`)을 그대로 쓰면 된다. 전이 시간은 누름에는 `0ms`(즉시), 놓음에는 `140ms` 가 관행이다 — `transition-duration:0ms` + `[&:not(:active)]:transition-duration:140ms` 형태.

---

## 12. `motion-values-are-literals-not-tokens` — major

**모바일 duration 을 조정하려 해도 고칠 「한 곳」이 없다.** §0-1·§0-2 의 census 가 그 구조다 — 런타임 모션 토큰 4개(소비처 7), 리터럴 duration 23회 + stagger 9회, JS 상수 3개. 특히 **`180ms` 는 런타임에 토큰이 아예 없다** — `docs/design/ds/colors_and_type.css:353` 이 `--dur-base: 180ms` 로 이미 이름을 갖고 있는데 `src/app/globals.css` 의 `@mirror-begin light` 구간(`:95-226`)이 그것을 미러하지 않았다. `--dur-micro: 120ms`(`ds:352`) · `--dur-reduced: var(--dur-base)`(`ds:356`) · `--stagger-1/2/3`(`ds:359-361`) · `--stagger-exit-1/2/3`(`ds:363-365`)도 마찬가지다. 전수 grep 결과 `--dur-base`·`--dur-micro`·`--dur-reduced`·`--stagger-` 가 `src/` 에 **0건**이다.

**설계 정의 쪽에는 reduced-motion 축까지 있는데 런타임에는 없다.** `ds/colors_and_type.css:867-870` 이 `@media (prefers-reduced-motion: reduce) { :root { --dur-slow: var(--dur-reduced) } }` 를 갖는다. `globals.css` 는 이 미디어 블록을 미러하지 않았으므로 **런타임 토큰 계층에 reduced-motion 축이 존재하지 않고**, 대신 JS 가 같은 일을 따로 계산한다(`landing-grid-card.tsx:1000`). 그래서 finding 6 의 desync 가 발생할 여지가 열린다.

**미러 구간에 직접 쓸 수 없다는 제약이 있다.** `AGENTS.md:25` — 「`@mirror-begin`/`@mirror-end` 구간은 설계 정의의 사본이며 값을 여기서 고치지 않는다 — 설계 정의를 고치고 다시 베낀다」. `tests/unit/design-tokens-dark-parity.test.ts:165` 가 값까지 대조하고 `:218` 이 「선언된 토큰이 전부 소비자를 갖기를」 요구하므로, **소비처를 먼저 만들지 않고 토큰만 미러하면 즉시 붉어진다.**

**무엇으로 바꾸는가.** 순서가 정해져 있다. ⑴ `docs/design/ds/colors_and_type.css` 에 부족한 이름을 추가한다(`--dur-expand-mobile` 등, finding 5). `ds/**` 는 Ask-First 이며 저장소 밖으로 push 되므로 승인이 필요하다. ⑵ 리터럴 자리들을 `var(--dur-…)` 로 바꿔 **소비처를 먼저 만든다.** ⑶ 그런 다음 `globals.css` 미러 구간에 해당 토큰을 베껴 넣는다. ⑷ JS 상수 3개(`hover-intent.ts:3,4` · `mobile-lifecycle.ts:1`)를 하나의 `motion-durations.ts` 로 합치고 reduced-motion 분기를 그 안에 둔다. `ease` 키워드 12자리(finding 16)도 같은 단위에서 정리한다.

---

## 13. `design-md-motion-vocabulary-is-not-the-shipped-one` — major

**`AGENTS.md` §2 의 Task Routing Table 은 「visual skin / design tokens」 작업을 `docs/design/design.md` 로 라우팅한다. 그 문서의 모션 어휘는 제품이 출하하는 것과 다르다.**

`design.md:232-240`(§5.11)이 선언하는 6개와 `:373`(§8)이 되풀이하는 같은 6개:

| design.md §5.11 | 값 | 런타임에 존재하는가 | 실제 소비처 |
|:---|:---|:---:|:---|
| `--ease-standard` | `cubic-bezier(0.2,0,0,1)` | ✓ | 2곳 |
| `--ease-out` | `cubic-bezier(0.0,0,0.2,1)` | ✗ | 0 |
| `--ease-in` | `cubic-bezier(0.4,0,1,1)` | ✗ | 0 |
| `--dur-fast` | `140ms` | ✓ | 3곳 |
| `--dur-base` | `220ms` | ✗ (실현값 `180ms`) | 0 |
| `--dur-expand` | `260ms` | ✗ (실현값 `280ms`) | 0 |

**6개 중 2개만 런타임에 있고, 제품이 실제로 기대는 둘은 이 문서에 아예 없다** — `--ease-in-out`(M-01 이 확정한 코어 곡선, 21개 애니메이션이 쓴다)과 `--dur-slow: 280ms`(코어 확장 duration). stagger 6개도 없다.

**이 문서는 스스로 「visual motion language only」라고 선언하지만(`design.md:371`) 값을 여섯 개 적고 있고, 그 값 중 넷이 틀렸거나 죽었다.** `--dur-base` 220↔180 과 `--dur-expand` 260↔280 의 갈림은 `decision-register.md:404-405` 의 `ds-parity-allowlist` 표에 **등재돼 있으므로** AGENTS.md §3-1 기준 유효한 I(intent) 다 — 새 결함이 아니다. 문제는 **그 표가 `docs/decision-register.md` 에 있고 `design.md` §5.11 자신은 자기 값이 intent 라고 말하지 않는다**는 것이다. `design.md` 만 열어 본 세션은 220/260 을 현행값으로 읽는다.

**게이트가 구조적으로 이것을 잡지 못한다.** `scripts/qa/check-design-token-parity.mjs:221-252` 의 비교 ⑵ 는 `design.md` §5.11 ↔ §8 **같은 문서의 두 사본**만 대조한다. 비교 ⑴(§5 ↔ `ds/colors_and_type.css`)은 `--dur-base`·`--dur-expand` 를 allowlist 로 면제한다. 그리고 `decision-register.md:354` 가 정한 규칙은 「이름 추가는 허용, `design.md` 값 변경은 금지」이므로 **ds 에만 있고 design.md 에 없는 이름은 규칙상 위반이 아니다.** 그래서 「코어 곡선이 시각 정본에 없다」는 어떤 검사도 붉히지 않는다.

**무엇으로 바꾸는가.** `design.md` §5.11 을 실현값으로 재작성한다 — `--ease-standard` · `--ease-in-out`(신설, `cubic-bezier(0.45,0,0.2,1)`, 「core expand/collapse (M-01)」 주석 포함) · `--ease-out` · `--ease-in` · `--dur-micro 120` · `--dur-fast 140` · `--dur-base 180` · `--dur-slow 280` · `--dur-reduced` · `--stagger-1/2/3` · `--stagger-exit-1/2/3`. §8 의 두 번째 사본도 함께 고친다(파리티 검사 ⑵ 가 두 사본의 일치를 요구한다). 이 개정으로 `ds-parity-allowlist` 의 `--dur-base`·`--dur-expand` 두 행이 「더 이상 이탈이 아닌 등재」가 되어 파리티 검사가 붉어지므로(`decision-register.md:564` 가 그 동작을 명시한다) 표에서 함께 지운다. `design.md` 와 `ds/**` 둘 다 Ask-First 이며 후자는 저장소 밖으로 push 된다.

---

## 14. `font-swap-reflow-unbudgeted` — major

**1.96 MB 가변 폰트를 `font-display: swap` 으로, preload 없이, 폴백 메트릭 보정 없이 싣는다.** `globals.css:32-37`:

```
@font-face { font-family: 'Pretendard Variable'; font-weight: 45 920; font-style: normal;
             font-display: swap; src: url('/fonts/PretendardVariable.woff2') format('woff2-variations'); }
```

실측 파일 크기 `public/fonts/PretendardVariable.woff2` = **2,057,688 bytes**. `size-adjust`·`ascent-override`·`descent-override`·`line-gap-override`·`unicode-range` **전부 0건**(`src/`·`docs/design/ds/*.css` 전수 grep). preload 링크 0건. 폴백 스택은 19 패밀리(`globals.css:225`)이고 첫 폴백은 `-apple-system`.

**저장소 자신의 코드가 이 스왑이 레이아웃을 바꾼다는 것을 증언한다.** 두 시스템이 폰트 로드에 재측정을 건다 — `use-card-inline-geometry.ts:249-274`(`fonts.addEventListener('loadingdone', …)`, 태그 행 개수 재판정) 와 `landing-card-title-continuity.tsx:243`(`document.fonts?.ready?.then(…)`, 제목 2줄 분할 재계산). 재측정이 필요하다는 것은 스왑이 텍스트 기하를 바꾼다는 뜻이다.

**저장소의 "폰트가 아니다" 측정은 localhost 산출물이다.** `docs/done/2026-09-10-step4-mobile-cls-and-card-thumbnails.md:48-56` 의 타임라인은 `48ms FONTS status@init loaded` — preview 서버가 로컬 디스크에서 즉시 낸 값이다. 실제 모바일 셀룰러(예 1.5 MB/s)에서 1.96 MB 는 약 1.3초이고, `swap` 의 block period 가 끝난 뒤 폴백으로 페인트되었다가 나중에 교체된다. **그 순간의 리플로는 이 저장소에서 한 번도 측정된 적이 없다.**

**미확인:** 스로틀 네트워크에서의 실제 CLS 기여를 재지 않았다. 확정한 것은 구조적 사실(크기 · `swap` · preload 부재 · 메트릭 보정 부재 · 폰트 로드 훅 2개)뿐이다.

**무엇으로 바꾸는가.** 세 갈래를 함께 재고 표로 제시해야 한다(저장소의 step4 판정 규칙 그대로 — 모바일 CLS `<0.1`, 데스크톱 `≤0.01`, LCP 악화 없음, **스로틀 프로파일에서**). ⑴ **`size-adjust` + `ascent-override` + `descent-override`** 를 폴백 첫 후보(`-apple-system`)에 맞춰 계산한 별도 `@font-face` 로 선언한다 — 코드 변경이 가장 작고 payload 를 늘리지 않는다. ⑵ **`unicode-range` 로 분할** — `globals.css:22-29` 주석이 이미 이 갈래와 그 비용(빌드 단계 · 두 쪽 표류)을 적어 뒀으므로 새 논의가 아니다. ⑶ **라틴 서브셋만 preload** 하고 CJK 는 `swap` 으로 뒤따르게 한다. 어느 갈래든 `docs/decision-register.md` 등재 대상이고 `globals.css` 는 Ask-First 다.

---

## 15. `consent-banner-raf-loop-never-ends-on-mobile` — major

**프레임 루프의 설계 전제가 코드 주석에 적혀 있고, 모바일에서 그 전제가 거짓이다.** `consent-banner.tsx:181-185`:

> 표식이 하나라도 있는 동안에만 프레임 루프를 돌린다. **확장은 hover 로 소멸하는 일시 상태이므로** 루프도 그동안만 존재한다 — 쉴 때의 비용은 0 이고, 확장 모션(280ms 동안 프레임이 아래로 29px 자란다)과 그 사이의 스크롤을 같은 방식으로 따라간다.

모바일 확장 본문에도 같은 표식이 붙고(`landing-grid-card.tsx:1229`, transient shell 은 `:1262`), 모바일 OPEN 은 **사용자가 X 를 누를 때까지 무기한 지속된다**(`req-landing.md:632` 가 닫기 경로를 X/backdrop 둘로 한정한다). 즉 데스크톱에서 280ms 짜리로 설계된 루프가 모바일에서는 끝이 없다.

**매 프레임의 비용.** `runFrame`(`:186-191`)이 `setIsOccluding(intersectsBanner())` 를 호출하고, `intersectsBanner`(`:157-188`)는 배너에 `getBoundingClientRect()` 1회 + `document.querySelectorAll(CONSENT_BANNER_AVOID_SELECTOR)` 1회 + 표식 원소마다 `getBoundingClientRect()` 를 돈다. `getBoundingClientRect` 는 강제 동기 레이아웃이므로 **카드가 열려 있는 내내 60fps 로 레이아웃이 강제된다** — finding 3 의 `left`/`width` 애니메이션이 이미 리플로를 만드는 280ms 구간과 겹친다.

**그리고 그 결과는 하드 컷이다.** `CONSENT_BANNER_OCCLUDED_CLASS = 'invisible opacity-0'`(`:39`)이고 `CONSENT_BANNER_SURFACE_CLASS`(`:43`)에 `transition` 이 없다. 교차가 프레임 경계에서 흔들리면 배너가 60Hz 로 점멸할 수 있다. 스크롤 중(모바일 OPEN 에서는 스크롤이 허용된다 — `req-landing.md:641`) 배너 상단과 확장 본문 하단이 스칠 때 그 조건이 성립한다. **미확인:** 점멸을 렌더로 재현하지 않았다. 확정한 것은 루프가 매 프레임 상태를 다시 쓴다는 것과 전이 선언이 없다는 것뿐이다.

**무엇으로 바꾸는가.** rAF 루프를 `IntersectionObserver` 로 바꾼다 — 두 사각형의 교차를 묻는 것이 정확히 그 API 의 용도이고, 브라우저가 레이아웃을 강제하지 않고 판정한다. 배너를 root 로 두고 표식 원소를 관찰하되, `rootMargin` 을 0 으로 두고 `threshold: [0, 0.01]` 로 진입/이탈만 받는다. 관찰이 스크롤과 애니메이션 양쪽을 함께 따라가므로 현행 루프가 하던 일을 전부 대체한다. 그리고 `invisible opacity-0` 에 `[transition:opacity_140ms_ease] motion-reduce:transition-none` 을 얹어 하드 컷과 점멸 위험을 함께 없앤다(`visibility` 는 지연 전이로 `module.css:191-194` 의 `blogReadMoreHover` 와 같은 패턴을 쓴다 — 저장소에 이미 있는 어휘다).

---

## 16. `ease-keyword-is-the-de-facto-curve` — minor

**제품에서 가장 많이 쓰이는 easing 이 디자인 시스템에 이름이 없는 브라우저 기본값이다.** §0-3 표 — CSS `ease` 키워드(`cubic-bezier(0.25, 0.1, 0.25, 1)`) 12자리 대 `--ease-standard` 2자리. `ease` 는 `design.md` §5.11 에도 `globals.css` 에도 `ds/colors_and_type.css` 에도 없다.

**그리고 `--ease-standard` 와 실제로 다른 곡선이다.** `ease` 는 진입 구간이 완만하고 끝에서 다시 느려지는 대칭에 가까운 곡선이고, `--ease-standard`(`0.2, 0, 0, 1`)는 즉시 가속해 끝에서 완전히 멈추는 감속 곡선이다. 140ms 색 전이에서는 차이가 작지만, 같은 제품 안에서 GNB 전체와 설정 칩 전체가 디자인 시스템 밖 곡선을 쓴다는 사실은 남는다.

**중복 선언도 한 건 있다.** `module.css:41` 의 `--landing-card-motion-ease: cubic-bezier(0.45, 0, 0.2, 1)` 은 `globals.css:196` 의 `--ease-in-out` 과 **바이트 동일한 값을 참조 없이 다시 적는다.** `AGENTS.md:25` 는 이 파일의 `--normal-*`/`--expanded-*` 가 「리터럴이 아니라 전역 토큰을 가리킨다」고 하는데, `--landing-card-motion-ease` 는 그 두 접두사 어디에도 속하지 않아 그 문장의 적용 대상 밖에 있다.

**무엇으로 바꾸는가.** `ease` 12자리를 `var(--ease-standard)` 로 바꾼다(전이 성격이 「상태 변화」이므로 §5.11 이 그 이름에 붙인 용도와 일치한다). `--landing-card-motion-ease` 를 `var(--ease-in-out)` 로 바꿔 중복을 없앤다. `landing-grid-card.tsx:509` 의 `ease-out` 은 `--ease-out`(`cubic-bezier(0.0,0,0.2,1)`)과 다른 값(`cubic-bezier(0,0,0.58,1)`)이므로 둘 중 하나로 결정한다. finding 12 와 같은 단위.

---

## 17. `four-transitions-miss-motion-reduce` — minor

§0-5 의 네 자리다 — `site-gnb.tsx:64`(뒤로가기·햄버거·설정 트리거 pill 전부) · `site-gnb.tsx:82`(드로어 스크림) · `settings-controls.tsx:29`(12 로케일 칩 + 테마 칩 전부) · `landing-catalog-grid.tsx:31`(모바일 카드 스크림).

**계약 위반은 아니다.** `design.md:376` 은 reduce 에서 「drop translate animations and keep opacity fades only」를 요구하고 넷은 전부 색 또는 불투명도다. WCAG 2.3.3 은 「motion animation」(이동·시차)을 대상으로 하므로 해당 없다. `req-landing.md:760` 의 「대형 이동을 금지」에도 걸리지 않는다.

**그러나 같은 부류 12자리는 가드돼 있다** — `site-gnb.tsx:38`(border-color) · `:50`(color) · `:101`(background-color) · `landing-grid-card.tsx:235,239`(color/border) 전부 `motion-reduce:transition-none` 을 단다. 같은 종류의 전이를 어떤 자리는 끄고 어떤 자리는 안 끄는 것이 문제다. 그리고 합성되는 `focusRingClassName`(`button-class-names.ts:34-35`)에도 `motion-reduce:` 가 없다.

**무엇으로 바꾸는가.** 넷에 `motion-reduce:transition-none` 을 추가한다. 더 나은 구조는 `skinTransitionClassName`(`button-class-names.ts:39`)이 이미 duration + easing + `motion-reduce:transition-none` 을 묶어 갖고 있으므로 GNB pill 과 칩이 그것을 합성해 쓰는 것이다 — `button-class-names.ts:19-22` 주석이 「GNB 의 pill 계열과 칩은 다른 컴포넌트(`.vt-pill`)이며 모양과 색은 여기 오지 않는다. **링만은 예외로** `focusRingClassName` 을 함께 쓴다」고 적으므로, 전이 시간·곡선도 같은 예외로 편입할지는 결정 사항이다.

**emit 순서는 안전하다.** 프로브로 확인 — `motion-reduce:` 변종은 기본 변종보다 **뒤에** emit 되므로 같은 명시도에서 이긴다(`site-gnb.tsx:87` 의 `motion-reduce:[transition:opacity_180ms_ease]` 가 실제로 작동한다). L10 함정이 여기서는 발동하지 않는다.

---

## 18. `progress-fill-animates-width-and-outruns-the-cadence` — minor

`test-question-client.tsx:66-67` 의 `testProgressFillClassName` 은 `[transition-duration:var(--dur-slow)] [transition-property:width] [transition-timing-function:var(--ease-in-out)] motion-reduce:transition-none` 이고, 채움은 `style={{width: `${scoringProgress.percent}%`}}`(`:275`)로 제어된다.

**두 가지가 어긋난다.** ⑴ `width` 는 레이아웃 속성이다 — `req-landing.md:755` 의 「transform/opacity 중심」은 Expanded 모션에 걸린 조항이라 이 자리를 문면상 지배하지는 않지만, 같은 원칙이 적용되지 않을 이유가 없다. `transform: scaleX()` + `transform-origin: left` 가 동등한 결과를 합성만으로 낸다. ⑵ **duration 280ms 가 자동 전진 주기 150ms 보다 길다** — `use-answer-lock.ts:32` 의 기본 `delayMs = 150` 이므로 답변 → 150ms 뒤 다음 문항이고, 그때 진행률 바는 아직 이전 전이의 46% 지점이다. 연타하면 채움이 계속 이전 목표를 향해 가다 목표만 바뀌는 상태가 된다.

**그리고 `--dur-slow` 는 코어 확장용 이름이다.** 진행률 바는 마이크로 인터랙션이고 `--dur-fast`(140ms) 또는 ds 의 `--dur-base`(180ms)가 그 자리의 값이다.

**무엇으로 바꾸는가.** `transition-property` 를 `transform` 으로, 채움을 `transform: scaleX(percent/100)` + `transform-origin: left` 로 바꾼다. duration 은 `--dur-fast`(140ms)로 내려 자동 전진 150ms 안에 끝나게 한다. `--ease-in-out` 대신 `--ease-standard`(감속)가 진행 표시의 관행에 맞다.

---

## 19. `question-slide-has-no-exit-and-the-question-text-does-not-move` — minor

`test-question-client.tsx:353-358` 이 테스트 플로우의 **유일한** 애니메이션이다:

```
<motion.div key={currentQuestionIndex} initial={{x: answerGridInitialX}} animate={{x: 0}}
            transition={prefersReducedMotion ? {duration: 0} : {duration: 0.18, ease: 'easeOut'}}>
```

`answerGridInitialX = prefersReducedMotion ? 0 : slideDirection === 'forward' ? 18 : -18`(`:202`).

**세 가지 관측.** ⑴ **문항 텍스트는 움직이지 않는다.** `<h2 className={testQuestionClassName}>{currentQuestion?.question}</h2>`(`:352`)는 `motion.div` **밖**에 있고 전이가 없다 — 질문은 하드 컷으로 바뀌고 선택지만 슬라이드한다. 한 화면에 한 문항인 플로우에서 「화면이 바뀌었다」를 전하는 것은 질문 텍스트인데 그것만 모션이 없다. ⑵ **이탈 애니메이션이 없다.** `AnimatePresence` 가 없어 `key` 변경 시 이전 선택지는 즉시 언마운트된다 — 나가는 것 없이 들어오는 것만 있다. ⑶ **18px 은 관행 대비 작다.** M3 의 shared-axis / forward-backward 패턴은 컨테이너 폭의 일부(통상 20–30px 또는 `translateX(30%)`)를 쓴다. 390px 화면에서 18px 은 4.6% 다.

**보호는 되어 있다.** `useReducedMotion()`(`:112`)이 `duration: 0` 과 `x: 0` 을 함께 준다.

**무엇으로 바꾸는가.** `motion.div` 의 범위를 `<h2>` + 선택지 그리드 전체(문항 블록)로 넓히고, `AnimatePresence mode="popLayout"` 으로 이탈(`exit: {x: -18, opacity: 0}`)을 추가한다. 거리는 24–32px 로 올린다. duration 은 enter 180ms / exit 140ms. `ease: 'easeOut'` 은 ⑴ 토큰이 아니고 ⑵ `--ease-out`(`0.0,0,0.2,1`)과 다른 값이므로 finding 16 과 함께 토큰 값으로 맞춘다.

---

## 20. `reduced-motion-transient-shell-hardcodes-100vw` — minor

`module.css:391-397`:

```
.root.reducedMotion .transientShell.transientOpening,
.root.reducedMotion .transientShell.transientClosing { left: 0; width: 100vw; border-radius: 0; animation-duration: var(--landing-card-motion-ms); }
```

그리고 no-preference 경로의 keyframes 도 `width: 100vw` 로 끝난다(`:536`·`:544`).

**두 문제.** ⑴ **tier 게이트가 없다.** 오늘은 `.transientShell` 이 `isMobileViewport` 일 때만 렌더되므로(`landing-grid-card.tsx:978`) 문제가 드러나지 않는다. **결정 2 로 터치 태블릿·터치 노트북이 모바일 생명주기에 들어오면** 1024px 이상 폭에서 이 규칙이 발화한다. ⑵ **`100vw` 는 세로 스크롤바 폭을 포함한다.** 오버레이 스크롤바를 쓰는 폰에서는 무해하지만 클래식 스크롤바가 있는 환경에서는 가로 오버플로가 생긴다 — `100vw` 는 `src/` 에 6곳 있고(`module.css:394,530,536,544,550` + `landing-grid-card.tsx:292`) 전부 이 경로다.

**무엇으로 바꾸는가.** `100vw` → `100dvw` 로 바꾸거나, shell 을 `left: 0; right: 0` 으로 잡아 폭 선언 자체를 없앤다(후자가 스크롤바 문제를 원천 제거한다). finding 3 의 `transform` 재작성과 같은 단위에서 처리한다.

---

## 부록 A — 렌즈 질문별 답

| 질문 | 답 | 근거 |
|:---|:---|:---|
| 모든 transition/animation 선언 census | §0 전체 | 소스 전수 |
| 모바일 duration 이 데스크톱보다 짧은가 | **아니다. 계약이 같게 하라고 요구한다** | `req-landing.md:579` · 두 독립 상수가 둘 다 280 |
| reduced-motion 커버리지 % | **80% (20 중 16)** | §0-5 |
| 빠진 것 전부 | 4개, §0-5 표 | 소스 전수 |
| WCAG 2.3.3 | **위반 없음** — 이동을 동반하는 모션(카드 detail-rise · 드로어 translateX · 문항 슬라이드 · 테마 전환)은 전부 보호된다 | §0-5 |
| 결정 2 로 하이드레이션 이동이 생기는가 | **그렇다. 데스크톱 ≥1208px 에서, 게이트 없이** | finding 2 |
| 레이아웃 시프트 후보 — 폰트 | **있다(미측정)** | finding 14 |
| 레이아웃 시프트 후보 — 이미지 | **없다** — `aspect-[16/6]` 슬롯에 `next/image fill`(`landing-grid-card.tsx:223,425`), 썸네일은 전부 2KB 미만 SVG | 소스 + `ls` |
| 레이아웃 시프트 후보 — 지연 렌더 | 있다: 태그 행 JS 측정 · 제목 분할 이분 탐색 · consent spacer 120→실측 | finding 14 · 부록 B |
| 카드 확장이 다른 카드를 미는 시프트 | **있다. 한 프레임에.** | finding 1 |
| 모션 값이 토큰인가 리터럴인가 | 토큰 4개(소비처 7) · 리터럴 32회 | finding 12 |
| design.md §5.11/§8 intent vs realized | 6개 중 2개만 실현, 실현된 코어 둘은 문서에 없음 | finding 13 |

## 부록 B — 결함으로 보고하지 않은 것과 그 이유

- **consent banner spacer 120 → 실측 보정**(`consent-banner.tsx:101,119`). `useLayoutEffect` 가 아니라 `useEffect` 라 페인트 뒤에 보정되고, 390px 에서 120 → 약 215px 로 95px 늘어난다. 그러나 spacer 는 문서의 **마지막 흐름 원소**라 아무것도 밀지 않는다. 저장소가 수정 전후 CLS 동일을 실측으로 기록했다(`decision-register.md:524`: 1280×720 `0.001769` · 390×812 `0.136468`). 결함 아님.
- **`state-smoke` 의 reduced-motion 검사가 1440px 전용**(`:1191`). 모바일 reduced-motion 커버리지는 별도로 있다 — `state-smoke.spec.ts:1050`(390×844, 두 모드 루프) · `transition-telemetry-smoke.spec.ts:775-776`(390×844). 공백 아님.
- **`.blogReadMoreHover` 의 `visibility` 지연 전이**(`module.css:191-208`). D-07 주석이 실측(250px 에서 태그 23.33px 손실)으로 근거를 적고 reduced-motion 가드도 있다. 잘 된 자리다.
- **`--dur-base` 220↔180 · `--dur-expand` 260↔280 갈림.** `decision-register.md:404-405` 의 `ds-parity-allowlist` 에 근거와 함께 등재돼 있다. AGENTS.md §3-1 기준 유효한 I(intent) 이므로 미등재 갈림이 아니다. finding 13 은 갈림 자체가 아니라 **문서가 스스로 intent 라고 말하지 않는다**는 점을 다룬다.
- **`will-change: left, width`**(`landing-grid-card.tsx:270`). 레이아웃 속성에 `will-change` 는 효과가 없지만 해를 끼치지도 않는다. finding 3 의 `transform` 재작성에서 함께 `will-change: transform` 으로 정리된다.

## 부록 C — 훑은 표면과 훑지 못한 표면

**훑었다(모션 선언 전수 확인):** 랜딩(`landing-grid-card.tsx` 1308줄 · `landing-catalog-grid.tsx` · `landing-grid-card.module.css` 582줄 · `landing-catalog-grid.module.css` 35줄 · `use-landing-interaction-controller.ts` · `use-desktop-motion-controller.ts` · `use-mobile-card-lifecycle.ts` · `use-mobile-restore-polling.ts`) · 테스트(`test-question-client.tsx` · `surface-class-names.ts` · `instruction-overlay.tsx` · `qualifier-chip.tsx` · `use-answer-lock.ts`) · 블로그(`blog-destination-client.tsx`) · 히스토리(`history/page.tsx`) · GNB(`site-gnb.tsx` · `settings-controls.tsx` · `theme-transition.ts` · `use-theme-preference.ts` · `types.ts`) · 설정(모바일은 드로어 인라인, 데스크톱은 팝오버 — 둘 다 확인) · 에러(`test/error/page.tsx`) · 404(`not-found.tsx` · `global-not-found.tsx`) · 전역(`globals.css` 431줄 · `page-shell.tsx` · `consent-banner.tsx` · `transition-gnb-overlay.tsx` · `button-class-names.ts`).

**훑지 못한 것:**
- **브라우저 렌더를 하지 않았다.** finding 1 의 점프 폭(최대 473px), finding 15 의 점멸, finding 14 의 스로틀 CLS, finding 3 의 드롭 프레임 수는 전부 소스에서 유도한 값이거나 미측정이다.
- **`use-grid-geometry-controller.ts`(1130줄)와 `use-card-inline-geometry.ts` 를 전문으로 읽지 않았다.** 모션 선언(`transition`/`animation`)이 없음은 grep 으로 확인했고 폰트 로드 훅(`:249-274`)만 읽었다. 두 파일이 만드는 기하 변경이 애니메이션 없이 즉시 적용된다는 사실은 확인했으나, 그 변경들이 정착 과정에서 몇 번 일어나는지는 세지 않았다.
- **`docs/design/ds/catalog-components.css`(823줄)와 `app-components.css`(659줄) 의 모션 선언을 census 하지 않았다.** 런타임 미소비 계층이지만 리팩터의 시각 정본이므로 모바일 패턴을 쓸 때 별도 조사가 필요하다.
- **`npm test` · `qa:rules` · `test:e2e` 를 실행하지 않았다.** 읽기 전용 과제다. 각 finding 의 `gates` 는 소스를 읽어 유도한 것이고 현재 pass/fail 은 확인하지 않았다.
- **`tests/e2e/theme-matrix-manifest.json` 이 펼치는 케이스가 모션 상태를 몇 장 고정하는지 세지 않았다.** baseline 170장 중 모션 중간 프레임을 찍는 것이 있는지(정착 상태만 찍는 것으로 보이나) 확인하지 않았다.
