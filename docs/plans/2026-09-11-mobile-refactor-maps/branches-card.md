# `landing-grid-card.tsx` — 뷰포트·입력 분기 전수 지도

읽은 대상: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis/src/features/landing/grid/landing-grid-card.tsx`, 1308행 전수. 계약 인용은 같은 clone 의 `docs/req-landing.md`·`docs/decision-register.md`·`docs/design/ds/README.md` 에서 직접 읽은 것만 쓴다. 저장소는 수정하지 않았다.

교차 확인을 위해 함께 읽은 파일: `landing-catalog-grid.tsx`(유일한 호출자) · `use-landing-interaction-controller.ts`(입력 모드 정의) · `layout-plan.ts`(티어 정의) · `desktop-shell-phase.ts` · `use-card-inline-geometry.ts` · `landing-grid-card.module.css`.

---

## 1. 구조 지도 — 1308행의 구성

최상위 함수 22개다(`landing-grid-card.tsx:122–1308` 의 `^function`/`^export function` 22건). 순수 헬퍼 7 · 컴포넌트 13 · 공개 컴포넌트 1(`LandingGridCard`) · 공개 헬퍼 1(`getDefaultCardCopy`). **`useState`·`useEffect`·`useMemo`·`useCallback` 이 0개다**(grep count 0) — 이 파일은 상태를 갖지 않고, 뷰포트·입력 상태는 전부 props 로 들어온다. 이것이 재배선의 구조적 핵심이다: 축을 바꾸는 자리는 이 파일이 아니라 상류이고, 이 파일의 분기 전부는 *소비처*다.

| 행 범위 | 구역 | 내용 |
|:---|:---|:---|
| 1–15 | 모듈 헤더 | `'use client'` · react/next import · 타입 13종 import |
| 17–39 | 저장소 내부 import | 11건. `desktop-shell-phase` · `landing-card-title-continuity` · `use-card-inline-geometry` · `spacing-plan` · `consent-banner` · `variant-registry` · CSS module |
| 41–45 | 모듈 상수 | `metaValueFormatter`(Intl) · `thumbnailDataUriCache` · `SPACING_PRECISION_SCALE` |
| 47–51 | 공개 타입 | `LandingCardInteractionMode`(`'hover'\|'tap'`) · `LandingCardViewportTier`(`'mobile'\|'tablet'\|'desktop'`) · `LandingCardMobilePhase`(4) · `LandingCardMobileTransientMode`(3) |
| 53–68 | 기하 계약 타입 | `LandingMobileSnapshotView`(6 필드) · `LandingCardSpacingContract`(5 필드) |
| 70–80 | `LandingCardCopy` | 9개 문자열 슬롯 |
| 82–120 | `LandingGridCardProps` | **37개 필드**. 그중 뷰포트·입력 축: `interactionMode`·`viewportTier`·`mobilePhase`·`mobileTransientMode`·`mobileRestoreReady`·`desktopMotionRole`·`desktopShellPhase`·`mobileSnapshot`·`desktopTransformOriginX` = 9 |
| 122–210 | 순수 헬퍼 7개 | `roundSpacing` · `resolveSpacingContract` · `formatMetaValue` · `createThumbnailFallbackDataUri`(공개) · `resolveVariantMediaSource` · `resolveTransformOriginClassName` · `joinClassNames` |
| 212–298 | **클래스명 상수 블록 45개** | 파일의 87행. 이 블록에 뷰포트 분기는 없고, 대신 §3-5 의 「분기 없는 뷰포트 의미 리터럴」이 여기 산다 |
| 299–305 | 지역 타입 3 | `LandingTestCard` · `NormalCardFacePresentation` · `ExpandedBodyLayoutMode` |
| 307–353 | Normal face prop 인터페이스 4 | `NormalCardFaceProps` · `NormalCardTitleProps` · `NormalCardThumbnailProps` · `NormalCardSubtitleProps` · `NormalCardTagRowProps`(실제 5) |
| 355–390 | `LandingCardSubtitleText` | subtitle 렌더 원자. **분기 1개(379)** |
| 392–416 | `NormalCardTitle` | **분기 1개(408)** |
| 418–435 | `NormalCardThumbnail` | `aspect-[16/6]` 고정, 분기 0 |
| 437–447 | `NormalCardSubtitle` | passthrough |
| 449–566 | `NormalCardTagRow` | **117행, 하위 컴포넌트 중 최대**. `useCardInlineGeometry` 로 가시 태그 수 결정 · blog CTA · 측정 probe. **입력 분기 2개(465, 506)** |
| 568–585 | `NormalCardGhostBody` | 데스크톱 오버레이 아래 collapsed 기하를 보존하는 invisible 고스트. **`isMobileViewport={false}` 하드코딩(578)** |
| 587–636 | `NormalCardFace` | collapsed / expandedTitleOnly 2 presentation 조립 |
| 638–669 | Expanded prop 인터페이스 3 | `ExpandedCardBodyProps` · `ExpandedTestBodyProps` · `DesktopExpandedShellProps` |
| 671–699 | `ExpandedTestAnswerChoice` | A/B 버튼. `interactive` 로 `tabIndex`/`aria-hidden` 결정 |
| 701–737 | `ExpandedMetaEntry` + `ExpandedMetaRow` | design §6.10 quiet data row |
| 739–807 | `ExpandedTestBody` | **레이아웃 모드 분기(786)**: `desktop-overlay-floor`(flex+spacer) vs `flow`(모바일 grid) |
| 809–827 | `ExpandedCardBody` | `ExpandedTestBody` 로의 얇은 passthrough (19행) |
| 829–906 | `DesktopExpandedShell` | 데스크톱 오버레이 전체. layer → frame → shell → shadow → surface → body 6겹 |
| 908–924 | `DesktopExpandedTitleProps` + `DesktopExpandedTitle` | line1/overflow 2층 제목 |
| **926–1294** | **`LandingGridCard`(369행)** | 아래 6구역으로 다시 쪼개진다 |
| ↳ 926–964 | props 해체·기본값 | `interactionMode = 'tap'`(931) · `viewportTier = 'desktop'`(932) |
| ↳ 965–1018 | **파생 플래그 블록(54행)** | 이 파일의 분기 엔진. `isMobileViewport` 정의(970)에서 11개 파생 플래그가 갈라진다 |
| ↳ 1019–1065 | resolved 클래스명 6종 | root visual · root · desktop stage · transient shell · trigger · content |
| ↳ 1066–1095 | `triggerContent` | normal face + 고스트 |
| ↳ 1097–1169 | root `<div>` 여는 태그 | `data-*` 28개 + inline CSS 변수 10개 |
| ↳ 1170–1207 | trigger | blog=`<Link>` / test=`<button>` 2분기 |
| ↳ 1209–1290 | 3개 확장 표면 | 데스크톱 오버레이(1209) · 모바일 in-flow body(1225) · 모바일 transient shell(1257) |
| 1296–1308 | `getDefaultCardCopy` | 영어 fallback 사본 |

**확장 표면이 3개다(1209 · 1225 · 1257).** 같은 카드가 세 개의 서로 다른 DOM 구조·레이어 모델·모션 체계로 확장되며, 셋은 공유 컴포넌트가 `ExpandedCardBody` 하나뿐이다. 모바일 transient shell(1257–1290)은 OPENING/CLOSING 전용의 네 번째 사본에 가깝다 — `position: fixed`, `aria-hidden="true"`, 닫기 버튼은 `<span>` 고스트(1274–1279).

---

## 2. 두 축은 이미 갈라져 있다 — 재배선의 출발점

| 축 | 이 파일의 입구 | 실제 정의처 | 판정 기준 |
|:---|:---|:---|:---|
| **width** | `viewportTier` prop(88, 기본값 `'desktop'` 932) | `layout-plan.ts:111–119` `resolveLandingViewportTier` | 순수 폭. `≤767` mobile · `≤1023` tablet · 그 외 desktop |
| **input** | `interactionMode` prop(87, 기본값 `'tap'` 931) | `use-landing-interaction-controller.ts:71–77` `resolveInteractionMode` | `width<768` → 무조건 tap, 그 외 `hoverCapability ? hover : tap`. `hoverCapability` 는 `matchMedia('(hover: hover) and (pointer: fine)')`(같은 파일 207) |

**입력 축은 이미 존재하고 이미 옳게 배선돼 있다.** `interactionMode` 는 hover capability 를 읽는다(req-landing §8.1, `docs/req-landing.md:511–516`). 결함은 축이 없다는 것이 아니라 **생명주기가 잘못된 축에 걸려 있다**는 것이다: `isMobileViewport = viewportTier === 'mobile'`(970) 하나가 모바일 생명주기 전체(전이·레이어·닫기 버튼·full-bleed)를 소유하고, 그것은 폭 축이다. 사용자 결정 2번이 고치려는 것이 정확히 이 한 줄이다.

측정된 터치 태블릿 프로브(900×1200: tier=tablet, mode=tap, layer=desktop-overlay)는 이 분열의 직접 산물이다 — `interactionMode` 는 `tap` 으로 옳게 판정됐는데 `viewportTier` 가 `tablet` 이라 970 이 `false` 를 주고, 976·1209 가 데스크톱 오버레이를 띄운다.

**등재된 반대 증거 하나.** `docs/decision-register.md:411` — 「모바일 카드(358px)는 데스크톱 later-row 카드(292px)보다 **넓다** — 티어를 카드 폭에서 유도할 수 없는 이유다」(2026-09-07 실측). 카드 컨테이너 쿼리로 티어를 대체하는 설계는 이 실측에 막힌다. 입력 축으로의 이전은 이 반례를 피해 가지만, 컨테이너 쿼리는 피하지 못한다.

**SSR 초기값 함정.** `landing-catalog-grid.tsx:28` `INITIAL_VIEWPORT_WIDTH = 1280` → 첫 페인트의 `viewportTier` 는 언제나 `'desktop'` 이다. 이는 `docs/decision-register.md:331–336`(BQ-36)에 등재된 기지 사실이며, req-landing §11.1 결정성 때문에 `12px` mobile base_gap 이 보류된 원인이다. 따라서 **폰에서 첫 페인트는 이 파일의 18개 width 분기 전부가 데스크톱 가지를 탄다.** 축을 입력으로 옮겨도 이 문제는 사라지지 않는다 — `hoverCapability` 의 초기 state 도 `false`(`use-landing-interaction-controller.ts:112`)여서 SSR 은 여전히 한쪽으로 고정된다. 다만 `resolveInteractionMode` 의 SSR 기본은 `tap` 이므로(§8.1 이 명시적으로 요구) **입력 축으로 옮기면 SSR 기본값이 데스크톱에서 모바일 쪽으로 뒤집힌다** — 이것 자체가 별도의 회귀 위험이다.

---

## 3. 분기 전수표

`isMobileViewport` 토큰 31건의 내역(합 = 31): 타입 선언 4(311·324·341·368) · 기본 파라미터 1(361) · 해체 3(394·437·591) · prop passthrough 4(444·604·622·1073) · **판단을 담은 19건**(정의 1 + 동결 리터럴 1 + 조건식 17). 아래 네 표가 그 19건, 파생 플래그 소비 27지점, 입력 축 5건, 티어 직접 소비 2건 = **총 53개 지점**을 전부 담는다.

### 3-1. width 축 — `isMobileViewport` 직접 조건식

| file:line | 조건식 원문 | semantics | 제어 대상 | 근거 계약 | 재배선 시 데스크톱 동반 이동 위험 |
|:---|:---|:---:|:---|:---|:---|
| `landing-grid-card.tsx:379` | `isMobileViewport ? 'overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-2'` | **width** | 클래스명(subtitle 2줄 clamp) | req-landing §6.6 `docs/req-landing.md:286–287` | **높음.** hover 없는 1440px 터치 모니터가 subtitle clamp 를 잃는다 → 카드 높이가 콘텐츠 의존이 되어 §6.7 same-row equal-height(`docs/req-landing.md:320`) 리듬이 무너진다 |
| `landing-grid-card.tsx:408` | `isMobileViewport ? 'block overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-1'` | **width** | 클래스명(title 1줄 clamp) | req-landing §6.6 `docs/req-landing.md:282`·`:285` | **높음.** 위와 같고, 추가로 §6.6 `:283–284` 의 「Expanded 첫 줄 = Normal 폭 기준 split」 연속성이 1줄 clamp 에 의존한다 |
| `landing-grid-card.tsx:578` | `isMobileViewport={false}` (하드코딩) | **width(동결)** | 고스트 body 의 subtitle clamp | req-landing §6.6 `:283` | **낮음.** 고스트는 `isDesktopExpanded` 일 때만 마운트(1085)되어 이미 non-mobile. 단 리터럴이라 축이 바뀌어도 따라오지 않는다 — 터치 태블릿이 고스트를 갖게 되면 조용히 틀린다 |
| `landing-grid-card.tsx:970` | `const isMobileViewport = viewportTier === 'mobile'` | **width** | 아래 전부의 근원 | — (정의처는 `layout-plan.ts:111`) | **이 한 줄이 재배선 지점이다.** 여기를 고치면 아래 29개가 동시에 움직인다. 반대로 여기를 두고 개별 분기를 옮기면 두 축이 이 파일 안에서 갈라진다 |
| `landing-grid-card.tsx:971` | `isMobileViewport && isTestCard && mobileTransientMode === 'OPENING' && !isUnavailable` | **input**(진짜 근거는 생명주기) | `styles.mobileTransientOpening` · transient shell 렌더 | req-landing §8.5 `docs/req-landing.md:622` | **중간.** 데스크톱이 transient shell 을 얻는다 — `position: fixed` 전폭 패널(292)이 그리드 위에 뜬다 |
| `landing-grid-card.tsx:972` | `isMobileViewport && isTestCard && mobileTransientMode === 'CLOSING' && !isUnavailable` | **input** | 위와 같음(CLOSING) | §8.5 `:622` | 971 과 동일 |
| `landing-grid-card.tsx:973` | `isMobileViewport && isTestCard && mobilePhase === 'OPEN' && !isUnavailable` | **input** | 모바일 in-flow 확장 body 전체(1225) | §8.5 `:620–625` | **높음.** 1042 의 full-bleed 와 짝이라 함께 움직인다. §3-2 의 1042 행 참조 |
| `landing-grid-card.tsx:974` | `!isMobileViewport && isTestCard && !isUnavailable ? desktopShellPhase : 'idle'` | **width** | 오버레이 phase → CSS 모션 + `aria-hidden` | §8.2 `:521–540` · §9.2 `:705–706` | **높음(반대 방향).** 터치 태블릿이 `'idle'` 로 강제되면 오버레이가 사라지는데, 그 자리를 대신할 모바일 경로는 `mobilePhase` 가 공급돼야 성립한다 — 상류가 함께 바뀌지 않으면 **확장 자체가 사라진다** |
| `landing-grid-card.tsx:976` | `!isMobileViewport && isTestCard && !isUnavailable && shouldRenderDesktopStageShell(...)` | **width** | 오버레이 렌더 트리(1209 와 짝) | §8.2 | 974 와 동일 |
| `landing-grid-card.tsx:986` | `useLandingCardTitleSplit({enabled: !isMobileViewport, ...})` | **width** | 측정 훅 on/off → 확장 제목 DOM 2층 | §6.6 `:283–284` | **중간.** 입력 축으로 옮기면 hover 없는 데스크톱이 제목 split 측정을 잃고 `line1Text`/`overflowText` 가 빈 값이 된다(913–924 가 빈 span 2개를 렌더) |
| `landing-grid-card.tsx:987` | `freeze: !isMobileViewport && desktopStagePhase !== 'idle'` | **width** | 같은 훅의 freeze | §6.6 `:284` 재래핑 금지 | 986 과 동일 |
| `landing-grid-card.tsx:1018` | `isMobileViewport && mobilePhase === 'CLOSING'` | **input** | `styles.mobilePhaseClosing` | §8.5 `:622` | 971 과 동일 |
| `landing-grid-card.tsx:1123` | `data-mobile-phase={isMobileViewport ? mobilePhase : undefined}` | **width** | QA data 속성 | 계약 조항 **없음**(E2E 앵커: `tests/e2e/grid-smoke.spec.ts` 등 4파일) | 낮음(관측용). 단 E2E 셀렉터가 이 조건에 붙어 있어 축이 바뀌면 스펙이 먼저 깨진다 |
| `landing-grid-card.tsx:1124` | `data-mobile-transient-mode={isMobileViewport ? ... : undefined}` | **width** | QA data 속성 | 없음 | 1123 과 동일 |
| `landing-grid-card.tsx:1125` | `data-desktop-motion-role={!isMobileViewport ? ... : undefined}` | **width** | QA data 속성 | 없음 | 1123 과 동일 |
| `landing-grid-card.tsx:1126` | `data-desktop-shell-phase={!isMobileViewport ? ... : undefined}` | **width** | QA data 속성 | 없음 | 1123 과 동일 |
| `landing-grid-card.tsx:1133` | `isMobileViewport && mobilePhase !== 'NORMAL' ? (mobileRestoreReady ? 'true' : 'false') : undefined` | **width** | QA data 속성(복원 준비) | §8.5 `:634–635` 복원 계약의 관측점 | 낮음. 단 §8.5 `:635` 의 「NORMAL terminal 확정」 판정이 이 신호를 읽는 E2E 에 걸려 있다 |
| `landing-grid-card.tsx:1199` | `aria-expanded={!isMobileViewport && !isUnavailable ? isDesktopLogicallyExpanded : undefined}` | **unclear → input 이어야 함** | **ARIA** | §9.2 `docs/req-landing.md:705` | **최고 위험이자 최대 기회.** §9.2 `:705` 가 「Desktop/Tablet available Test trigger 가 `aria-expanded` 를 소유한다」고만 적어, **모바일 확장은 disclosure 인데 `aria-expanded` 를 아예 갖지 않는다**. 축을 옮기면 터치 태블릿이 속성을 잃는다 — 계약 자체에 구멍이 있어 재배선만으로는 개선이 아니라 후퇴다. 계약 개정과 짝지어야 한다 |
| `landing-grid-card.tsx:1209` | `!isMobileViewport && !isUnavailable && isTestCard ? <DesktopExpandedShell/> : null` | **width** | **렌더 트리**(오버레이 전체) | §8.2 · §6.5 `:263–264` | 974·976 과 동일. 이 세 줄이 「데스크톱 오버레이 존재」의 전부다 |

### 3-2. 파생 플래그 소비처 — 970 에서 갈라진 27개 지점(26행, `:1176`/`:1192` 는 한 행에 2지점)

정의 6줄(977 `isExpanded` · 978 `isDesktopExpanded` · 979 `showMobileExpandedBody` · 980 `showMobileTransientShell` · 1009 `isDesktopOverlayLayer` · 1013 `hasDesktopStageGeometry`)은 순수 별칭이라 아래 표에서 뺐다. 별칭이 6개나 붙은 것 자체가 구조 신호다 — 같은 불리언이 네 이름으로 읽힌다.

| file:line | 조건식 원문 | semantics | 제어 대상 | 근거 계약 | 재배선 위험 |
|:---|:---|:---:|:---|:---|:---|
| `:1002` | `showDesktopExpandedShell && typeof expandedRestingFloorPx === 'number' && ... > 0 && resolvedShellScale > 0` | width | `minHeight` 인라인 스타일(오버레이 body floor) | §8.4 `docs/req-landing.md:592`(BQ-24 floor) | 중간. 터치 태블릿이 floor 를 잃으면 확장 body 가 콘텐츠 높이로 주저앉는다 |
| `:1019–1025` | `showDesktopExpandedShell ? ... : isMobileExpanded ? ... : isMobileOpening \|\| isMobileClosing ? ... : (normal)` | **both** | 4분기 배경·그림자·테두리 | §6.9 `:408–413` · §8.5 `:648` | **높음.** 4분기 중 3개가 축에 걸려 있다. 순서가 곧 우선순위라 축이 바뀌면 데스크톱이 2번째 가지(`--expanded-card-surface` + `box-shadow:none`)로 떨어진다 |
| `:1031` | `isDesktopOverlayLayer && styles.desktopOverlayLayer` | width | CSS 모듈 클래스 | §8.3 | 중간 |
| `:1035` | `isMobileOpening && styles.mobileTransientOpening` | input | CSS(normal face 슬롯 fade) — `module.css:302–313` | §8.5 `:637` | 971 참조 |
| `:1036` | `isMobileClosing && styles.mobileTransientClosing` | input | CSS — `module.css:303`·`:314–328` | §8.5 `:637` | 972 참조 |
| `:1037` | `isMobileClosingPhase && styles.mobilePhaseClosing` | input | CSS — `module.css:387` | §8.5 | 1018 참조 |
| `:1041` | `(resolvedState === 'expanded' \|\| isMobileOpening \|\| isMobileClosing) && 'z-20'` | **both** | z-index | §8.5 `:644` 레이어 순서 `GNB > 카드 > backdrop > 기타` | 중간. backdrop 은 `landing-catalog-grid.tsx:31` 에서 `z-10` — 짝이 이 파일 밖에 있다 |
| `:1042` | `isMobileExpanded && 'rounded-none w-screen min-h-0 mx-[calc(50%-50vw)]'` | **width** | 레이아웃(그리드 트랙 탈출 full-bleed) | §8.5 `:620` in-flow full-bleed | **최고.** `w-screen` + `mx-[calc(50%-50vw)]` 는 1열 그리드를 전제한다. 4열 row 안에서 실행되면 카드가 뷰포트 전폭으로 퍼져 형제 카드를 덮는다. **입력 축으로 옮기면 hover 없는 1440px 터치 모니터가 정확히 이 상태가 된다** — 재배선에서 반드시 컬럼 수(width)와 짝지어야 하는 유일한 분기 |
| `:1047` | `hasDesktopStageGeometry && styles.desktopStageActive` | width | CSS(스테이지 활성 기하) — `module.css:220` | §8.4 | 중간 |
| `:1048` | `isDesktopCleanupPending && styles.desktopStageCleanupPending` | width 파생 | CSS — `module.css:263–277` | §8.2 | 중간 |
| `:1053` | `isMobileOpening && styles.transientOpening` | input | CSS — `module.css:330` | §8.5 `:636` | 971 참조 |
| `:1054` | `isMobileClosing && styles.transientClosing` | input | CSS — `module.css:334` | §8.5 `:636` | 972 참조 |
| `:1058` | `isMobileExpanded ? '[min-height:0] [padding:0]' : '[min-height:100%] [padding:16px]'` | **both** | trigger 패딩 + row-stretch 높이 | §6.7 `docs/req-landing.md:321` (`min-height: 100%` 가 계약이 이름으로 요구하는 row-stretch 기구) | **높음.** 데스크톱이 `min-height:0` 을 얻으면 §6.7 `:320–321` same-row equal-height 가 직접 깨진다. 패딩 16px 도 함께 사라진다 |
| `:1059` | `showDesktopExpandedShell && 'pointer-events-none'` | width | **이벤트 타깃** | §8.2 는 **진입만 규정하고 이탈을 규정하지 않는다**(`:521–550` 전체에 재탭 닫기 조항 없음) | **높음이자 이미 결함.** 측정된 「재탭으로 닫기 불가(trigger 가 pointer-events-none)」의 코드 근거가 이 한 줄이다. 터치 기기에서 오버레이가 뜨면 트리거가 죽고, 오버레이에는 닫기 X 가 없다(§3-4 참조). 축을 옮겨도 이 줄은 남으므로 **재배선만으로 고쳐지지 않는다** |
| `:1060` | `isMobileExpanded && 'bg-transparent cursor-default'` | width | 클래스명 | §8.5 `:648` dim 0% | 중간 |
| `:1064` | `isMobileExpanded ? '[height:0] [min-height:0] overflow-hidden' : 'h-full min-h-full'` | **both** | 레이아웃(normal face 를 0높이로 접음) | §6.5 `:263–264` Expanded 는 `cardTitle` 만 | 높음. 1058 과 같은 이유 |
| `:1068` | `isMobileExpanded ? null : <NormalCardFace .../>` | **width** | **렌더 트리** | §6.5 `:263–264`(숨김 아닌 비렌더) | 높음. 데스크톱이 normal face 를 잃으면 카드가 빈 상자가 된다(오버레이는 별도 표면) |
| `:1074` | `presentation={isDesktopExpanded ? 'expandedTitleOnly' : 'collapsed'}` | width | **렌더 트리**(썸네일·subtitle·tags 제거) | §6.5 `:263–264` | 중간 |
| `:1085` | `isDesktopExpanded ? <div ghost><NormalCardGhostBody/></div> : null` | width | **렌더 트리**(invisible 기하 보존체) | §6.7 `:320–321` 기하 보존 | 중간. 578 의 하드코딩과 짝 |
| `:1136–1144` | `showDesktopExpandedShell ? 'desktop-overlay' : isMobileOpening ? 'mobile-opening-shell' : isMobileExpanded ? 'mobile-in-flow' : isMobileClosing ? 'mobile-closing-shell' : 'none'` | both | QA data 속성 | 계약 조항 없음 | 낮음(관측용). **터치 태블릿 프로브가 읽은 `desktop-overlay` 가 이 5분기의 첫 가지다** |
| `:1176` · `:1192` | `data-trigger-state={isExpanded ? 'expanded' : 'collapsed'}` | both | QA data 속성 | 없음 | 낮음 |
| `:1213` | `isVisible={showDesktopExpandedShell}` | width | 오버레이 내부 렌더 게이트(858) | §8.2 | 976 참조 |
| `:1214` | `isInteractive={isDesktopShellLogicallyInteractive(desktopStagePhase)}` | width 파생 | `aria-hidden`(855) · `data-slot` 노출(686·712·747·757) · `tabIndex`(692) | §9.2 `:706` | **높음.** A/B 선택지의 tab order 와 AT 노출이 여기 달렸다. 렌더 게이트(`shouldRenderDesktopStageShell`, `desktop-shell-phase.ts:95–108`)와 상호작용 게이트(`isDesktopShellLogicallyInteractive`, `:110–123`)가 **비대칭**이다 — `closing`·`cleanup-pending` 은 렌더 true / 상호작용 false 라, 그 두 phase 동안 오버레이가 화면에 보이면서 AT 에는 없고 A/B 는 `tabIndex=-1` 이다. §9.2 `docs/req-landing.md:705` 와 일치한다 |
| `:1225` | `showMobileExpandedBody && isTestCard ? <div expandedBody>...` | **width** | **렌더 트리**(모바일 헤더 + X + body) | §8.5 `:627–631` | 973 참조 |
| `:1242` | `disabled={mobileTransientMode === 'CLOSING'}` | **input**(생명주기) | 닫기 버튼 비활성 | §8.5 `docs/req-landing.md:631` 「CLOSING 중에는 비활성 상태」 | 낮음. 이미 생명주기 축 |
| `:1257` | `showMobileTransientShell && isTestCard ? <div transientShell>...` | **width** | **렌더 트리**(fixed 전환 셸) | §8.5 `:636–638` | 971·972 참조 |

### 3-3. input 축 — 이미 올바른 축에 있는 분기

| file:line | 조건식 원문 | semantics | 제어 대상 | 근거 계약 | 재배선 위험 |
|:---|:---|:---:|:---|:---|:---|
| `landing-grid-card.tsx:465` | `ctaVisibility: readMoreLabel ? (interactionMode === 'hover' ? 'hover-focus' : 'always') : 'never'` | **input** | **렌더 트리**(가시 태그 개수 — `<li>` 마운트 수, 467·481) + `use-card-inline-geometry.ts:278–309` 이 `pointerenter`/`pointerleave`/`focusin`/`focusout` 리스너를 카드 root 에 단다 | §6.6 `docs/req-landing.md:292` | **없음(이미 입력 축).** 다만 `pointerenter` 는 터치에서도 발화하고 탭 후 남는다 — `interactionMode==='tap'` 이면 `'always'` 라 이 경로를 타지 않으므로 현행은 안전하다. 축을 바꿔도 안전한 유일한 분기 |
| `landing-grid-card.tsx:506–511` | `interactionMode === 'hover' ? joinClassNames(styles.blogReadMoreHover, 'opacity-0 ... group-hover:opacity-100 group-focus-within:opacity-100 ...') : 'opacity-100'` | **input** | 클래스명 + **a11y 트리 존재 여부**(`module.css:190–194` 가 `visibility: hidden` — 주석 `:179–180` 이 「tab order 와 접근성 트리에서 빼는 것을 잃으면 안 된다」고 명시) | §6.6 `:292` · §9.3 `:720` | **없음(이미 입력 축).** 단 §3-5 의 CSS 비대칭 참조 |
| `landing-grid-card.tsx:452` | `interactionMode = 'tap'`(NormalCardTagRow 기본값) | input | 고스트/probe 렌더가 조용히 tap 으로 동작 | 없음 | 낮음. `NormalCardGhostBody:582` 가 `interactionMode` 를 넘기지 않아 고스트는 항상 `'always'` CTA 폭을 예약한다 — 578 과 같은 종류의 동결 |
| `landing-grid-card.tsx:629` · `:1072` | `interactionMode={interactionMode}` | input | passthrough | — | 없음 |
| `landing-grid-card.tsx:1108` | `data-interaction-mode={interactionMode}` | input | QA data 속성 | 없음 | 없음 |

### 3-4. 티어 직접 소비 — `isMobileViewport` 를 거치지 않는 2건

| file:line | 조건식 원문 | semantics | 제어 대상 | 근거 계약 | 재배선 위험 |
|:---|:---|:---:|:---|:---|:---|
| `landing-grid-card.tsx:994` | `useCardExpandedScale({rootRef, viewportTier, transformOriginX, reducedMotion})` | **width(진짜)** | 확장 스케일. `layout-plan.ts:126–130` 이 desktop `1.1` · tablet `1.04` · mobile `1` 로 3분기 | §8.4 `docs/req-landing.md:592` | **중간이자 설계 질문.** 이것은 진짜 폭 근거다(가용 outset 이 폭에서 나온다). 3분기 중 tablet 가지가 터치 태블릿에서 의미를 잃는다 — `docs/decision-register.md:412` 「모바일에는 shell scale 이 없다」가 실측이므로, 터치 태블릿을 모바일 생명주기로 보내면 `1.04` 가 아니라 `1` 이어야 한다. **입력 축과 폭 축이 동시에 필요한 두 번째 지점**(1042 가 첫째) |
| `landing-grid-card.tsx:1122` | `data-card-viewport-tier={viewportTier}` | width | QA data 속성 | 없음. 단 `docs/decision-register.md:333`·`:411` 이 이 속성을 실측 근거로 인용 | 낮음(관측용) |

### 3-5. 분기가 없는데 뷰포트 의미를 가진 리터럴 — 재배선이 놓치기 쉬운 자리

조건식이 아니라서 위 표에 안 잡히지만, **특정 뷰포트에서만 실행되는 표면에 박힌 값**이다. 축을 옮기면 이것들이 새 뷰포트로 조용히 따라간다.

| file:line | 리터럴 | 의미 | 출처 | 문제 |
|:---|:---|:---|:---|:---|
| `landing-grid-card.tsx:285` · `:292` · `:296` | `max-h-[calc(100dvh-116px)]` **3회** | 모바일 확장/전환 셸의 높이 상한 | **없음.** 저장소 전체에서 `116` 은 이 3줄뿐(`grep -rn '116' src/`) — 토큰도 상수도 계약 조항도 주석도 없다 | **출처 불명 매직 넘버.** GNB 높이에서 유도된 듯하나 확인 불가(§5 미확인 1). 세 곳에 복사돼 있어 한 곳만 고치면 어긋난다 |
| `landing-grid-card.tsx:278–279` | `min-h-[var(--tap-min)] min-w-[var(--tap-min)]` = **44px**(`src/app/globals.css:201`) | 모바일 닫기 X 의 탭 하한 | design.md §4.10 · D-09(`docs/design/ds/README.md:31`) | 값은 정상(WCAG 2.5.8 24px·AAA 2.5.5 44px 통과). 단 **`README.md:31` 이 `landing-grid-card.tsx:270` 을 인용하는데 HEAD 에서는 278–279 다** — 인용이 8–9행 낡았다 |
| `landing-grid-card.tsx:286–287` | `sticky top-0 z-[4]` 모바일 헤더 | 스크롤 컨테이너(285 `overflow-auto`) 안의 sticky 헤더 | §8.5 `docs/req-landing.md:628`·`:631` | sticky 헤더가 스크롤 컨테이너 안 포커스 요소를 가릴 수 있다(WCAG 2.2 §2.4.11 Focus Not Obscured). 실제 가림 여부는 **미확인**(§5 미확인 2) |
| `landing-grid-card.tsx:292` | `fixed ... z-[21]` transient shell | 전환 셸 레이어 | §8.5 `:644` 레이어 순서 | backdrop `z-10`(`landing-catalog-grid.tsx:31`) · 확장 카드 `z-20`(1041) · transient `z-21`. 세 값이 세 파일에 흩어져 있다 |
| `landing-grid-card.module.css:92–97` vs `:196–200` | 앞은 `@media (hover: hover) and (pointer: fine)` 안, 뒤는 밖 | blog 카드 테두리 hover 는 입력 게이트가 있고, `Read more` reveal 의 `:hover` 는 없다 | §6.6 `docs/req-landing.md:292` | **비대칭.** 터치 기기에서 탭 후 `:hover` 가 남으면 CTA 만 켜지고 테두리는 안 켜진다. 이 파일의 `interactionMode === 'hover'`(506) 가 클래스를 안 붙이면 `.blogReadMoreHover` 자체가 없어 현행은 가려져 있으나, 축 재배선으로 두 조건이 어긋나면 드러난다 |

### 3-6. 분기가 아니라 부재 — 데스크톱 오버레이에는 닫기 컨트롤이 없다

`DesktopExpandedShell`(829–906) 전체에 버튼이 0개다. 닫기 X 는 모바일 표면(1236–1245)과 모바일 transient 고스트(1274–1279)에만 있다. 데스크톱 오버레이의 이탈 경로는 포인터 이동 기반 collapse(§8.2 `docs/req-landing.md:528`·`:544`)와 `Escape`(§9.1 `:690`)뿐이며, 둘 다 **터치 기기에 존재하지 않는 입력**이다. 1059 의 `pointer-events-none` 과 합쳐지면 터치 태블릿에서 카드는 열리고 닫히지 않는다 — 측정된 프로브 결과(닫기 X 0개 · backdrop 0개 · 재탭 불가)와 정확히 일치하며, 바깥 탭으로 닫히는 것은 계약이 아니라 포인터 이동 규칙의 부수 효과다.

---

## 4. 재배선 위험 등급 — 사용자 결정 2번 적용 시

**등급 A — 폭 축을 반드시 남겨야 하는 분기(입력 축 단독 이전 금지).** `:1042` full-bleed(컬럼 수 전제) · `:994` expanded scale(가용 outset) · `:379`/`:408` clamp(same-row equal-height) · `:1058`/`:1064` row-stretch 높이. 이 6개는 **입력 ∧ 폭** 두 조건이 동시에 필요하다. 「isMobileViewport 의 의미를 입력 방식으로 바꾼다」를 문자 그대로 적용하면 이 6개가 데스크톱을 따라 움직이며, 그중 1042 는 형제 카드를 덮는 시각적 파손을 즉시 낸다.

**등급 B — 입력 축으로 옮겨야 맞는 분기(현재 폭에 잘못 걸림).** `:971`/`:972`/`:973`/`:1018` 생명주기 4종 · `:974`/`:976`/`:1209` 오버레이 게이트 3종 · `:1059` trigger 이벤트 차단 · `:1225`/`:1257` 표면 렌더 2종. 터치 태블릿 결함의 직접 원인이며, 옮기면 그 기기가 모바일 생명주기·닫기 X·backdrop 을 얻는다.

**등급 C — 계약 개정 없이는 재배선이 후퇴인 분기.** `:1199` `aria-expanded` 하나. §9.2 `docs/req-landing.md:705` 가 소유자를 「Desktop/Tablet」로 한정해 모바일 disclosure 에 속성이 없다. 축만 옮기면 터치 태블릿이 지금 가진 속성을 잃는다. **계약 개정(사용자 결정 1번)과 같은 단위에서 처리해야 한다.**

**등급 D — 관측용, 축을 따라가되 E2E 가 먼저 깨지는 분기.** `:1123`–`:1126` · `:1133` · `:1136–1144` · `:1176`/`:1192` · `:1108` · `:1122`. 계약 조항은 없지만 `tests/unit/landing-interaction-dom.test.ts` · `tests/unit/landing-card-contract.test.ts` · `tests/e2e/grid-smoke.spec.ts` · `tests/e2e/transition-telemetry-smoke.spec.ts` 4파일이 이 속성들을 셀렉터로 쓴다(grep 확인). 0단계 값 불변 지문의 앵커로 쓰기 좋은 동시에, 축이 바뀌면 반드시 함께 바뀐다.

**등급 E — 동결 리터럴(축을 따라가지 않는다).** `:578` `isMobileViewport={false}` · `:452` `interactionMode = 'tap'` 기본값 · `:932` `viewportTier = 'desktop'` 기본값 · `:931` `interactionMode = 'tap'` 기본값. 리터럴이라 재배선에 **반응하지 않는다** — 축이 바뀐 뒤에도 옛 축의 값을 유지해 조용한 불일치를 만든다.

---

## 5. 미확인 — 확인하지 못한 것

1. **`116px` 의 출처.** `src/` 전체에서 `116` 은 `landing-grid-card.tsx:285`·`:292`·`:296` 세 곳뿐이고 토큰·상수·주석·계약 조항이 없다. GNB 높이(`docs/decision-register.md:412` 는 「GNB 하단 57」을 실측으로 기록)와의 관계를 소스만으로는 유도할 수 없다. 렌더 측정이 필요하다.
2. **모바일 sticky 헤더(286–287)가 실제로 포커스를 가리는지.** `overflow-auto` 컨테이너(285) 안에서 A/B 선택지로 Tab 이동 시 sticky 헤더가 포커스 링을 덮는지는 렌더 없이 판정 불가. WCAG 2.2 §2.4.11 대상이다.
3. **`--tap-min` 44px 가 실제 렌더 높이인지.** `min-h` 는 하한이고 내용(`×` 한 글자)이 작아 하한이 지배할 것으로 보이나, `docs/design/ds/README.md:31` 의 「verified 2026-09-10」은 토큰 값 확인이지 렌더 박스 확인이 아니다. 같은 문서 `docs/decision-register.md:414` 는 2026-09-07 에 `40 × 40` 을 실측했고 그 뒤 D-09 로 수정됐다고 적으나, 수정 후 재측정 기록은 찾지 못했다.
4. **터치 태블릿에서 `interactionMode` 가 실제로 `'tap'` 인지의 SSR→hydration 경로.** `resolveInteractionMode`(`use-landing-interaction-controller.ts:71–77`) 는 읽었으나, `hoverCapability` 초기값 `false`(`:112`)에서 `matchMedia` 반영까지의 프레임 수와 그 사이 카드가 무엇을 렌더하는지는 측정하지 않았다.
5. **`ExpandedTestBody:786` 의 `layoutMode === 'desktop-overlay-floor'` 분기.** 뷰포트 조건식이 아니라 호출자가 넘기는 리터럴(`:895` 데스크톱만 `'desktop-overlay-floor'`, `:1247`·`:1281` 모바일은 기본값 `'flow'`)이므로 위 표에 넣지 않았다. 축 재배선 시 이 리터럴 2:1 분배가 함께 움직여야 하는지는 판단하지 않았다 — 레이아웃 모드가 폭 근거인지 표면 근거인지가 갈린다.
