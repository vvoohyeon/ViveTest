# 0단계 이음매 설계 — landing grid 4개 파일

측정 기준점: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis`, HEAD = `7616211`(착수 마커) 위 `a5aec95`. 이 문서의 모든 행 번호·개수는 이 세션에서 그 clone 을 직접 읽어 센 것이다. 저장소는 수정하지 않았다.

세션 중 실측한 게이트 상태: `npm test` = **85 files / 609 tests 전부 통과, 5.44s**(2026-09-11 21:06 실행). 이것이 0단계의 출발 기준선이다.

| 파일 | 총행 | 공백 | 주석 | 코드 | `isMobileViewport` 토큰 |
|:---|---:|---:|---:|---:|---:|
| `src/features/landing/grid/landing-grid-card.tsx` | 1308 | 66 | 24 | 1218 | 31 |
| `src/features/landing/grid/use-landing-interaction-controller.ts` | 738 | 67 | 0 | 671 | 22 |
| `src/features/landing/grid/use-hover-intent-controller.ts` | 527 | 60 | 80 | 387 | 9 |
| `src/features/landing/model/interaction-state.ts` | 504 | 59 | 1 | 444 | 2 |

---

## 1. 구역 지도

### 1-1. `landing-grid-card.tsx` (1308행)

| 행 | 구역 | 성격 |
|:---|:---|:---|
| 1–39 | import | — |
| 41–45 | 모듈 상수 — `metaValueFormatter` · `thumbnailDataUriCache` · `SPACING_PRECISION_SCALE` | 값 |
| 47–51 | 공개 타입 — `LandingCardInteractionMode` · `LandingCardViewportTier` · `LandingCardMobilePhase` · `LandingCardMobileTransientMode`, 그리고 `LandingCardVisualState` 재수출 | **계약** |
| 53–120 | 공개 인터페이스 — `LandingMobileSnapshotView`(53–60) · `LandingCardSpacingContract`(62–68) · `LandingCardCopy`(70–80) · `LandingGridCardProps`(82–120) | **계약** |
| 122–194 | 순수 헬퍼 — `roundSpacing` · `resolveSpacingContract` · `formatMetaValue` · `createThumbnailFallbackDataUri`(export) · `resolveVariantMediaSource` | 지오메트리/값 |
| 196–210 | `resolveTransformOriginClassName` · `joinClassNames` | 렌더 보조 |
| 212–298 | 클래스명 상수 40개 (`LANDING_GRID_CARD_*`) | 시각 |
| 299–305 | 내부 타입 — `LandingTestCard` · `NormalCardFacePresentation` · `ExpandedBodyLayoutMode` | — |
| 307–353 | Normal face prop 인터페이스 4종 | — |
| 355–636 | **Normal face 컴포넌트군** — `LandingCardSubtitleText`(355–390) · `NormalCardTitle`(392–416) · `NormalCardThumbnail`(418–435) · `NormalCardSubtitle`(437–447) · `NormalCardTagRow`(449–566, `useCardInlineGeometry` 호출 460) · `NormalCardGhostBody`(568–585) · `NormalCardFace`(587–636) | 렌더 |
| 638–669 | Expanded/Desktop shell prop 인터페이스 3종 | — |
| 671–737 | `ExpandedTestAnswerChoice`(671–699) · `ExpandedMetaEntry`(701–704) · `ExpandedMetaRow`(706–737) | 렌더 |
| 739–827 | `ExpandedTestBody`(739–807, `resolveTestPreviewPayload` 호출 741) · `ExpandedCardBody`(809–827) | 렌더 |
| 829–924 | `DesktopExpandedShell`(829–906) · `DesktopExpandedTitle`(908–924) | 렌더(데스크톱 전용) |
| 926–964 | `LandingGridCard` prop 구조분해 (38개 prop) | 오케스트레이터 |
| 965–1018 | 파생 플래그 — `useId`(965), `useRef`×3(982–984), `useLandingCardTitleSplit`(985), `useCardExpandedScale`(992), 뷰포트 분기 12건(970–980) | **훅 + 상태 파생** |
| 1019–1065 | 클래스 해석 4개 (`resolvedRootClassName` 등) | 시각 |
| 1066–1095 | `triggerContent` | 렌더 |
| 1097–1169 | root `<div>` — data-attribute 32개, `style` 커스텀 프로퍼티 10개 | **QA/E2E 계약 표면** |
| 1170–1207 | trigger 분기 — blog `<Link>` / test `<button>` | 렌더 |
| 1209–1223 | 데스크톱 셸 마운트 분기 | 렌더 |
| 1225–1255 | 모바일 확장 본문 마운트 분기 | 렌더(모바일 전용) |
| 1257–1290 | 모바일 transient 셸 마운트 분기 | 렌더(모바일 전용) |
| 1296–1308 | `getDefaultCardCopy` | **계약** |

### 1-2. `use-landing-interaction-controller.ts` (738행)

| 행 | 구역 |
|:---|:---|
| 1–48 | import (10개 모듈 합성) |
| 50–69 | `UseLandingInteractionControllerInput` / `...Result` |
| 71–77 | `resolveInteractionMode`(export) — **`viewportWidth < 768` 판정의 유일한 자리** |
| 79–102 | 순수 헬퍼 — `resolveInteractionCard` · `isModifiedBlogActivation` |
| 104–122 | 훅 진입: `useState`×2 + `useReducer`×2 |
| 123–158 | 카드 파생 memo 6종 + `isMobileViewport`(157) + `prefersReducedMotion`(158) |
| 160–200 | 하위 컨트롤러 3종 합성 — `useDesktopMotionController` · `useHoverIntentController` · `useMobileCardLifecycle` |
| 202–248 | `useLayoutEffect`×2 — hover capability(207) · reduced motion(226) |
| 250–281 | `useEffect`×3 — MODE_SYNC · visibilitychange · 언마운트 타이머 정리 |
| 283–299 | `collapseExpandedCard` |
| 301–344 | `closeDesktopCard` |
| 346–426 | `focusCardFromKeyboard` |
| 428–476 | `handleCardKeyDown`(Escape) · `handleCardBlur` |
| 478–487 | `LANDING_TRANSITION_CLEANUP_EVENT` 리스너 |
| 489–497 | `beginTransition` |
| 499–514 | `useKeyboardHandoff` 합성 |
| 516–534 | window `pointermove`/`mousedown` 리스너 |
| 536–542 | `handleMobileClose` |
| 544–607 | `handleCardClick` — blog/모바일/데스크톱 3분기 |
| 609–623 | `handleAnswerChoiceSelect` |
| 625–718 | **`resolveCardInteractionBindings`** — memo 없는 평범한 함수, 렌더마다 카드 수만큼 실행 |
| 720–725 | `activeVisualCardVariant` |
| 727–738 | return |

### 1-3. `use-hover-intent-controller.ts` (527행 / 코드 387행)

| 행 | 구역 |
|:---|:---|
| 1–55 | import · 타입 |
| 57–62 | `POINTER_STATIONARY_TOLERANCE_PX` + 실측 근거 주석 |
| 64–88 | 훅 진입: `useRef`×7 |
| 90–116 | 타이머/hold 해제 4종 |
| 118–134 | `isPointerInsideCardBoundary` — rect 교차 |
| 136–147 | `collapseCard` |
| 149–195 | **`beginScrollHold`** — BQ-39 R1 스크롤 hold + passive `scroll` 리스너 |
| 197–221 | `isPointerStationaryBoundaryEvent` — 스크롤 위조 진입 판별 |
| 223–243 | `scheduleHoverIntent` — 토큰 기반 유예 |
| 245–280 | `scheduleCollapseForCard` (scroll hold 재판정 270–273) |
| 282–361 | `recordPointerInput` — 유실 leave 복구 + hold 재판정(326–340) |
| 363–382 | `useEffect`×2 — hold 해제 조건 ⑶ · 언마운트 |
| 384–518 | `resolveHoverHandlers` — `onMouseEnter`(389–481) · `onMouseLeave`(482–503) |
| 520–527 | return |

### 1-4. `interaction-state.ts` (504행)

| 행 | 구역 |
|:---|:---|
| 1–3 | import + `LandingCardVisualState` |
| 5–20 | `ACTIVE_RAMP_UP_MS` · `PAGE_STATE_PRIORITY` · `ALLOWED_PAGE_TRANSITIONS` |
| 22–32 | `LandingInteractionState` |
| 34–85 | `LandingInteractionEvent` — 14개 변형 |
| 87–97 | `initialLandingInteractionState` |
| 99–109 | `resolveKeyboardFocusDisposition` (`isMobileViewport` 2건 중 1건) |
| 111–227 | 리듀서 내부 헬퍼 — 차단 집합 · `clearInteractionForPageState` · `isAllowedPageTransition` · `transitionPageState` · `settleRampIfNeeded` · `isInteractionBlocked` · `enableHoverLock` · `clearHoverLock` |
| 229–426 | **`reduceLandingInteractionState`** — 14 case |
| 428–504 | **셀렉터 4종** — `resolveCardStateForVariant`(428) · `resolveVisualState`(447) · `isKeyboardModeBlocked`(474) · `resolveCardTabIndex`(485) |

---

## 2. 이음매 축 판정 — (b) 관심사 축. 단, 절단면을 「모바일이 통째로 교체할 단위」에 맞춘다

**(a) 뷰포트/입력 축으로 자르면 안 된다. 네 가지 측정 근거가 있다.**

**① 그 축은 곧 움직인다.** 확정 결정 2는 `isMobileViewport` 의 의미를 「폭」에서 「입력 방식」으로 바꾼다. 오늘의 `viewportTier === 'mobile'`(`landing-grid-card.tsx:970`, `use-landing-interaction-controller.ts:157`) 선을 따라 파일을 가르면, 1단계가 그 선을 다시 그을 때 두 번째 절단을 해야 한다. 0단계의 목적은 1단계를 쉽게 만드는 것이지 1단계가 지워야 할 구조를 세우는 것이 아니다.

**② React 훅 정체성이 깨진다 — 이것만으로 「행동 무변경」이 성립하지 않는다.** `LandingGridCard` 는 훅 5종을 무조건 호출한다: `useId`(965) · `useRef`×3(982–984) · `useLandingCardTitleSplit`(985) · `useCardExpandedScale`(992). 이 중 둘은 상태를 보유한다 — `landing-card-title-continuity.tsx:185` 의 `useState<LandingCardMeasuredTextSplit>`, `use-card-inline-geometry.ts:93` 의 `useState(decision)`. `<MobileGridCard>` / `<DesktopGridCard>` 를 형제 컴포넌트로 가르면 tier 가 바뀌는 순간(리사이즈가 768·1024 를 가로지를 때) 그것은 리렌더가 아니라 **언마운트/리마운트**이고, 두 상태는 초기값으로 되돌아간다. 지금은 같은 컴포넌트가 유지되므로 되돌아가지 않는다. 이 차이는 스크린샷에 잡히지 않는 종류의 행동 변경이다.

**③ 두 경로는 서로소가 아니다.** root `<div>`(1097–1169) 하나가 모바일 속성(`data-mobile-phase` 1123 · `data-mobile-transient-mode` 1124 · `data-mobile-snapshot-*` 1127–1131 · `data-mobile-restore-ready` 1132)과 데스크톱 속성(`data-desktop-motion-role` 1125 · `data-desktop-shell-phase` 1126)을 **같은 노드에** 싣는다. `resolvedRootClassName`(1026–1043)은 `styles.desktopOverlayLayer` 와 `styles.mobileTransientOpening` 을 같은 체인에서 조립한다. CSS 모듈은 그것을 그대로 전제한다 — `.root.desktopMotionEnter .expandedShellFrame`(`landing-grid-card.module.css:243`)과 `.root.mobileTransientClosing .normalTitle`(같은 파일 303)이 같은 `.root` 를 놓고 경쟁한다. 뷰포트 축으로 자르려면 root 를 복제해야 하고, root 를 복제하면 `data-*` 32개를 복제하게 되며, 그 32개는 `grid-smoke` · `state-smoke` · `theme-matrix` 가 읽는 계약 표면이다.

**④ 상태 기계에 모바일 절반이 없다.** `reduceLandingInteractionState`(`interaction-state.ts:229`)는 뷰포트를 모른다 — 이 파일에서 `isMobileViewport` 는 `resolveKeyboardFocusDisposition`(99–109) 안의 2건이 전부다. `expandedCardVariant` 는 모바일 경로(`beginMobileOpen` → `CARD_EXPAND`)와 데스크톱 경로가 함께 쓴다. 잘라낼 「모바일 리듀서」가 존재하지 않는다.

**그래서 (b) 관심사 축이다. 다만 관심사를 임의로 고르지 않는다.** 「지오메트리/상태/렌더/이벤트」라는 교과서적 4분할은 이 리팩터에 맞지 않는다 — 그렇게 자르면 모바일 재설계가 네 파일을 **전부 조금씩** 고치게 된다. 절단면은 **1단계가 통째로 교체하거나 통째로 버릴 단위**에 맞춘다. 구체적으로: 모바일 표면(바텀시트로 대체될 것), 데스크톱 오버레이 셸(hover 소멸과 함께 축소될 것), Normal face(양쪽 공용, 유지될 것), 계약 타입(먼저 안정화돼야 할 것)이 각각 다른 파일이 되게 한다.

---

## 3. 이음매 제안

각 이음매에 「QA 결합」 열을 붙였다. `scripts/qa/*.mjs` 와 `docs/blocker-traceability.json` 은 `AGENTS.md` §4 Ask-First 이므로, **QA 결합이 있는 이음매는 승인 없이 실행하지 않는다.**

### 3-1. 카드 (1308행 → 약 470행)

| # | 새 파일 | 원본 행 | 대략 행수 | 책임 | QA 결합 |
|:---|:---|:---|---:|:---|:---|
| **S0** | `landing-card-contract.ts` | 47–120, 1296–1308 | ~95 | 공개 타입·prop 계약·기본 copy | **없음** |
| **S1** | `landing-grid-card-mobile-surfaces.tsx` | 1225–1290 발췌 | ~110 | 모바일 확장 본문 + transient 셸 | **없음** |
| **S2** | `landing-grid-card-desktop-shell.tsx` | 638–669 일부, 829–924 | ~120 | 데스크톱 오버레이 셸 + 확장 타이틀 | **없음** |
| **S3** | `landing-grid-card-expanded-body.tsx` | 638–669 일부, 671–827 | ~190 | 확장 본문(질문·선택지·메타) 공용 | phase5 1건 |
| **S4** | `landing-grid-card-normal-face.tsx` | 299–353, 355–636 | ~300 | 접힌 얼굴 전체 | phase5 3건 · phase6 1건 |
| **S5** | `landing-grid-card-classnames.ts` | 196–210, 212–298 | ~100 | 클래스명 상수 + `joinClassNames` | phase5·6·8·9 **5건** |

잔여 `landing-grid-card.tsx` ≈ 1308 − 95 − 110 − 120 − 190 − 300 − 100 = **약 400행** (import 중복분 감안 ~470). 남는 것은 오케스트레이터(926–1169)와 trigger 분기(1170–1207)와 마운트 분기 3개 — 즉 **prop → 파생 플래그 → root 속성 → 자식 선택**이라는 한 가지 일만 하는 파일이 된다.

공개 API:

```ts
// landing-card-contract.ts
export type LandingCardInteractionMode = 'hover' | 'tap';
export type LandingCardViewportTier = 'mobile' | 'tablet' | 'desktop';
export type LandingCardMobilePhase = 'NORMAL' | 'OPENING' | 'OPEN' | 'CLOSING';
export type LandingCardMobileTransientMode = 'NONE' | 'OPENING' | 'CLOSING';
export interface LandingMobileSnapshotView { cardHeightPx: number; anchorTopPx: number; cardLeftPx: number; cardWidthPx: number; titleTopPx: number; restoreReady: boolean; }
export interface LandingCardSpacingContract { baseGapPx: number; compGapPx: number; needsComp: boolean; naturalHeightPx: number; rowMaxNaturalHeightPx: number; }
export interface LandingCardCopy { comingSoon: string; close: string; closeExpandedAria: string; metaEstimated: string; metaShares: string; metaAttempts: string; metaReadTime: string; metaViews: string; readMore: string; }
export interface LandingGridCardProps { /* 82–120 그대로 */ }
export function getDefaultCardCopy(): LandingCardCopy;
```

```ts
// landing-grid-card-mobile-surfaces.tsx
export function MobileExpandedSurface(props: {
  card: Extract<LandingCard, {type: 'test'}>;
  locale: AppLocale;
  copy: LandingCardCopy;
  closeDisabled: boolean;
  onClose?: MouseEventHandler<HTMLButtonElement>;
  onExpandedBodyKeyDown?: KeyboardEventHandler<HTMLElement>;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
}): ReactElement;

export function MobileTransientShell(props: {
  card: Extract<LandingCard, {type: 'test'}>;
  locale: AppLocale;
  copy: LandingCardCopy;
  shellClassName: string;
  transientMode: Exclude<LandingCardMobileTransientMode, 'NONE'>;
}): ReactElement;
```

```ts
// landing-grid-card-desktop-shell.tsx
export interface DesktopExpandedShellProps { /* 656–669 그대로 */ }
export function DesktopExpandedShell(props: DesktopExpandedShellProps): ReactElement;
```

```ts
// landing-grid-card-expanded-body.tsx
export type ExpandedBodyLayoutMode = 'flow' | 'desktop-overlay-floor';
export function ExpandedCardBody(props: {
  card: Extract<LandingCard, {type: 'test'}>;
  locale: AppLocale;
  copy: LandingCardCopy;
  interactive: boolean;
  layoutMode?: ExpandedBodyLayoutMode;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
}): ReactElement;
```

```ts
// landing-grid-card-normal-face.tsx
export type NormalCardFacePresentation = 'collapsed' | 'expandedTitleOnly';
export interface NormalCardFaceProps { /* 307–320 그대로 */ }
export function NormalCardFace(props: NormalCardFaceProps): ReactElement;
export function NormalCardGhostBody(props: Pick<NormalCardFaceProps, 'card' | 'hasAssetMedia' | 'subtitleRef'>): ReactElement;
```

`landing-grid-card.tsx` 는 S0 의 타입을 `export type {...} from './landing-card-contract'` 로 재수출한다 — 이미 47행이 `LandingCardVisualState` 에 대해 같은 일을 하고 있으므로 새 패턴이 아니다. 이렇게 하면 지금 카드 파일에서 타입만 가져가는 **9개 모듈**(`landing-card-interaction-bindings.ts` · `use-landing-interaction-controller.ts` · `use-hover-intent-controller.ts` · `use-keyboard-handoff.ts` · `use-card-keyboard-handler.ts` · `use-grid-geometry-controller.ts` · `use-mobile-card-lifecycle.ts` · `use-mobile-backdrop-gesture.ts` · `use-mobile-scroll-lock.ts`)과 테스트 7종의 import 경로를 **한 줄도 고치지 않고** 훅→컴포넌트 의존 간선을 끊을 수 있다.

### 3-2. 컨트롤러 (738행 → 562행). **500 미만을 목표로 삼지 않는다**

| # | 새 파일 | 원본 행 | 대략 행수 | 책임 | QA 결합 |
|:---|:---|:---|---:|:---|:---|
| **C1** | `use-desktop-card-close-controller.ts` | 301–476 | ~176 | 데스크톱 닫기 + 키보드 포커스 처분 + Escape/blur | **없음** |
| ~~C2~~ | ~~`landing-card-bindings-resolver.ts`~~ | ~~625–718~~ | ~~94~~ | 바인딩 해석 | phase7:99 — **권고하지 않음** |

```ts
// use-desktop-card-close-controller.ts
export interface DesktopCardCloseControllerInput {
  interactionMode: LandingCardInteractionMode;
  isMobileViewport: boolean;
  shellRef: RefObject<HTMLElement | null>;
  focusedCardVariant: string | null;
  expandedCardVariant: string | null;
  dispatchInteraction: Dispatch<LandingInteractionEvent>;
  cancelPendingHoverIntent: () => void;
  setDesktopTransitionReason: (reason: DesktopTransitionReason) => void;
  setTransitionSourceCardVariant: (cardVariant: string | null) => void;
}
export interface DesktopCardCloseController {
  closeDesktopCard: (input: {sourceCardVariant: string; reason: 'collapse' | 'handoff'; focusDisposition: 'return-trigger' | 'preserve-destination'; nowMs: number}) => void;
  focusCardFromKeyboard: (input: {cardVariant: string; cardEnterable: boolean; cardExpandable: boolean; nowMs: number}) => void;
  handleCardKeyDown: (card: LandingCard, event: ReactKeyboardEvent<HTMLElement>) => void;
  handleCardBlur: (card: LandingCard, event: ReactFocusEvent<HTMLElement>) => void;
}
export function useDesktopCardCloseController(input: DesktopCardCloseControllerInput): DesktopCardCloseController;
```

C1 은 네 함수가 **같은 의존 집합**(`cancelPendingHoverIntent` · `interactionMode` · `isMobileViewport` · `setDesktopTransitionReason` · `shellRef` · `interactionState.focusedCardVariant` · `interactionState.expandedCardVariant`)을 공유하는 닫힌 군집이라서 성립한다. `focusCardFromKeyboard` 는 `closeDesktopCard` 를 호출하고(389), `handleCardKeyDown`·`handleCardBlur` 도 그렇다(443, 468). 밖으로 나가는 간선은 `useKeyboardHandoff` 가 `focusCardFromKeyboard` 를 받는 것(509) 하나뿐이다.

**C2 를 권고하지 않는 이유는 두 가지다.** 첫째, `scripts/qa/check-phase7-state-contracts.mjs:99` 가 `resolveCardStateForVariant` 와 `resolveCardTabIndex` 라는 **문자열**이 컨트롤러 파일 본문에 있을 것을 요구하는데, 그 둘은 `resolveCardInteractionBindings` 안(629, 702)에서만 쓰인다 — 옮기면 QA 스크립트를 고쳐야 하고 그것은 Ask-First다. 둘째, `resolveCardInteractionBindings` 는 컨트롤러의 **산출물 그 자체**다. 그것을 밖으로 내면 컨트롤러는 훅 배선만 남아, 읽는 사람이 「이 컨트롤러가 무엇을 만드는가」를 다른 파일에서 찾아야 한다.

**그래서 컨트롤러는 562행으로 남긴다.** 저장소 규칙(`AGENTS.md` §3 File size discipline)의 ~500행은 「변경으로 넘게 되면 멈추고 계획을 제안한다」이지 「무조건 500 미만」이 아니다. 738 → 562 는 그 방향으로 가는 변화이고, 남은 62행을 깎으려고 Ask-First 게이트를 건드리는 것은 결정 2가 이 파일을 다시 쓸 예정이라는 사실 앞에서 손해다. **이 판단은 보고 사항이지 질문이 아니다.**

### 3-3. hover-intent (527행 → 427행)

| # | 새 파일 | 원본 행 | 대략 행수 | 책임 | QA 결합 |
|:---|:---|:---|---:|:---|:---|
| **H1** | `use-hover-scroll-hold.ts` | 149–195, 363–382, + 245–280 의 hold 분기 | ~100 | BQ-39 R1 스크롤 hold 전체 | **없음** |

```ts
// use-hover-scroll-hold.ts
export interface HoverScrollHoldInput {
  shellRef: RefObject<HTMLElement | null>;
  interactionMode: LandingCardInteractionMode;
  isMobileViewport: boolean;
  expandedCardVariant: string | null;
  collapseCard: (cardVariant: string, nowMs: number) => void;
}
export interface HoverScrollHold {
  scrollHeldCardVariant: () => string | null;
  beginScrollHold: (cardVariant: string) => void;
  releaseScrollHold: () => void;
}
export function useHoverScrollHold(input: HoverScrollHoldInput): HoverScrollHold;
```

이 컷이 성립하는 근거: 스크롤 hold 는 이미 자기 자신의 테스트 블록을 갖는다 — `tests/unit/landing-interaction-controller-handlers.test.ts:841` `describe('scroll hold (BQ-39 R1)')`, 8개 케이스(895·930·971·1017·1057·1132·1180·1219). 개념 경계가 이미 테스트로 그어져 있는 자리를 파일 경계로 승격시키는 것이다.

**그 외에는 자르지 않는다.** 이 파일의 나머지(`resolveHoverHandlers` 384–518, `recordPointerInput` 282–361)는 전부 `interactionMode !== 'hover'` 가드(318 · 390 · 483) 뒤에 있다. 결정 2가 「hover 없는 기기는 768px 이상에서도 터치 생명주기를 쓴다」로 바꾸는 바로 그 가드다. 지금 자르면 곧 옮길 선을 따라 자르는 것이다.

### 3-4. interaction-state (504행 → 427행)

| # | 새 파일 | 원본 행 | 대략 행수 | 책임 | QA 결합 |
|:---|:---|:---|---:|:---|:---|
| **M1** | `interaction-selectors.ts` | 3, 428–504 | ~80 | 상태 → 카드별 표현 파생 4종 | **없음** |

```ts
// interaction-selectors.ts
export type LandingCardVisualState = 'normal' | 'expanded' | 'focused';
export function resolveCardStateForVariant(state: LandingInteractionState, cardVariant: string): CardState;
export function resolveVisualState(input: {cardEnterable: boolean; cardState: CardState; desktopCleanupPending: boolean; desktopClosingVisible: boolean; transitionExpanded: boolean}): LandingCardVisualState;
export function isKeyboardModeBlocked(state: LandingInteractionState, cardVariant: string): boolean;
export function resolveCardTabIndex(state: LandingInteractionState, cardVariant: string, enterable: boolean): number;
```

의존 방향이 근거다. 리듀서(229–426)의 소비자는 컨트롤러 **하나**(`use-landing-interaction-controller.ts:28`)뿐인데, 셀렉터의 소비자는 **여섯**이다 — `landing-grid-card.tsx:33` · `use-landing-interaction-controller.ts:30,32` · `use-card-keyboard-handler.ts` · `use-keyboard-handoff.ts` · `use-keyboard-mode-tracker.ts` · `use-mobile-card-lifecycle.ts`. 지금은 여섯 모듈이 리듀서 504행 파일 전체에 의존한다.

QA 안전성은 확인했다. `check-phase7-state-contracts.mjs:28–53` 이 `interaction-state.ts` 본문에서 찾는 11개 토큰(`ACTIVE_RAMP_UP_MS` · `reduceLandingInteractionState` · `PAGE_STATE_PRIORITY` · `ALLOWED_PAGE_TRANSITIONS` · `isAllowedPageTransition` · `INACTIVE` · `TRANSITIONING` · `KEYBOARD_MODE_ENTER` · `KEYBOARD_MODE_EXIT` · `CARD_FOCUS` · `CARD_ACTIVATE`)은 **전부 1–426행에 있다.** `INACTIVE`/`TRANSITIONING` 은 428행 이후에도 나오지만(432) 14·111·174·200 에도 있으므로 남는다.

`src/features/landing/model/index.ts:16,18,19` 가 셀렉터 3종을 재수출하므로, 그 줄의 출처를 새 모듈로 바꾼다(외부 import 경로는 불변).

---

## 4. 행동 무변경 증명 — 구체 명령

### 4-1. 세 겹의 증거, 각각이 보는 것이 다르다

| 겹 | 도구 | 보는 것 | 보지 못하는 것 |
|:---|:---|:---|:---|
| ① 리듀서 지문 | vitest, 순수 함수 전수 | 상태 전이 표 전체 | 렌더·레이아웃 |
| ② SSR 마크업 지문 | vitest + `renderToStaticMarkup` + jsdom | DOM 구조·속성·클래스 문자열 | **CSS 가 적용된 결과**, 측정 기하, 폰트 |
| ③ 시각 baseline 170장 | Playwright | 합성된 픽셀 | 상태 기계 내부, 도달하지 않는 조합 |

②가 ①·③ 사이의 빈틈을 메운다. ③은 ②가 구조적으로 볼 수 없는 것 — `landing-grid-card.module.css` 의 `.root<modifier> .child` 형태 규칙 30여 개, `useCardExpandedScale`·`useCardInlineGeometry` 의 측정 결과, Pretendard swap — 의 **유일한** 증거다.

### 4-2. 기준선 채취 (소스 변경 0)

```bash
cd /Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis && npm run lint && npm run typecheck && npm test && npm run build && npm run qa:rules
```

```bash
cd /Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis && npx playwright install chromium webkit && npm run test:e2e
```

`npm test` 의 기준선은 이 세션에서 실측했다: **85 files / 609 tests 통과 / 5.44s**. 위 명령이 그와 다른 수를 내면 그 차이부터 설명한 뒤 진행한다.

### 4-3. 지문 하네스 3종 — 0단계의 **첫 번째** 작업 단위

지문 스펙은 `tests/unit/**/*.test.ts` 에 둔다(`vitest.config.ts:12`). `qa:rules` 에 두면 안 된다 — 그것은 기본 게이트 밖이라 평시에 돌지 않는다.

**F1 — 리듀서 전수 지문.** `tests/unit/landing-interaction-reducer-fingerprint.test.ts`. `reduceLandingInteractionState` 는 순수 함수이므로 전수가 가능하다. 상태 공간을 pageState 5 × `activeRampUntilMs` 3(null·과거·미래) × focused 3 × expanded 3 × `hoverLock.enabled` 2 × `hoverLock.cardVariant` 3 × `keyboardMode` 2 = **1,620 상태**로 잡고, 이벤트는 14종 × (`cardVariant` 3 · `interactionMode` 2 해당 시) ≈ 40종을 먹인다 → 약 64,800 전이. 각 전이를 `sha256(JSON.stringify({from, event, to}))` 로 접어 정렬된 해시 목록을 `tests/fixtures/landing-interaction-reducer-fingerprint.json` 에 커밋한다. 이것은 근사가 아니라 **증명**이다: 리듀서의 모든 입력을 덮는다.

**F2 — 카드 SSR 마크업 지문.** `tests/unit/landing-card-render-fingerprint.test.ts`. 하네스는 새로 만들 필요가 없다 — `tests/unit/landing-card-contract.test.ts:58–115` 의 `renderCardDocument` 가 이미 `renderToStaticMarkup` + `JSDOM` 으로 정확히 이 일을 한다. 조합은 두 덩어리로 나눈다.

- 광역: `viewportTier ∈ {desktop, tablet}` → 10 variant × 3 state × 2 interactionMode × 6 desktopMotionRole × 7 desktopShellPhase × 2 reducedMotion × 2 tier = **10,080 렌더**. `viewportTier = 'mobile'` → 10 × 3 × 2 × 4 mobilePhase × 3 mobileTransientMode × 2 reducedMotion = **1,440 렌더**. 부수 prop(`spacing` · `mobileSnapshot` · `expandedRestingFloorPx` · `desktopTransformOriginX` · `tabIndex` · `ariaDisabled` · `interactionBlocked` · `keyboardModeBlocked` · `hoverLockEnabled` · `keyboardMode` · `sequence` · `hasAssetMedia`)은 고정한다.
- 일변량: 위 부수 prop 을 기준 조합 하나에 대해 **하나씩** 바꿔 가며 각각 렌더 — 약 30 렌더.

**`useId` 정규화가 이 지문의 유일한 함정이고, 규칙을 실측으로 확정했다.** React 19.2.4 SSR 의 `useId` 는 `_R_<n>_` 형태를 낸다(이 세션에서 clone 의 `node_modules` 로 직접 프로브). 그리고 그 값은 **`useId` 호출 이전에 렌더된 컴포넌트 경계의 수**에만 의존한다 — 호스트 엘리먼트를 아무리 겹쳐도 `_R_0_` 그대로였고(`<div><span><Probe/></span></div>` → `_R_0_`), 부모 컴포넌트로 한 겹 감싸도 `_R_0_` 였으며(순수 추출), `useId` 소비자 **앞에** 형제 컴포넌트를 하나 넣자 `_R_2_` 로 밀렸다. `LandingGridCard` 의 `useId` 는 함수 본문 첫 문장(965)이므로 **자식만 추출하는 한 값이 변하지 않는다.** 그럼에도 지문은 `_R_\d+_` 를 `«id»` 로 치환한 뒤 해싱하고, id **관계**(`aria-labelledby` 가 가리키는 노드의 `textContent` === `card.title`)는 별도 단언으로 남긴다 — `landing-card-contract.test.ts:317–320` 이 이미 그 형태다.

**F3 — 컨트롤러 시퀀스 지문.** `tests/unit/landing-controller-sequence-fingerprint.test.ts`. `tests/unit/landing-interaction-controller-handlers.test.ts:1–161` 의 하네스(`installBrowserStubs` · `mountShell` · `renderHook` · fake timer)를 그대로 재사용해, 26개 기존 케이스가 밟는 이벤트 시퀀스를 스크립트로 재생하면서 **매 스텝마다** `{interactionState, mobileLifecycleState, cards.map(resolveCardInteractionBindings)}` 를 직렬화한다. 핸들러 prop 은 값이 아니라 **동일성 토큰**으로 기록한다 — 같은 렌더 안에서 참조가 유지되는지가 계약이기 때문이다(같은 파일 653행 `'keeps card handler identities stable while controller state is unchanged'`).

**세 지문 모두 고장 주입 케이스를 함께 싣는다.** 알려진 입력 하나를 바꾸면 해시가 반드시 달라진다는 것을 같은 스펙 안에서 보인다. 그것이 없으면 지문은 조용히 초록이 되는 장치다.

### 4-4. 이음매마다 돌리는 것

```bash
cd /Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis && npm run lint && npm run typecheck && npm test && npm run build
```

```bash
cd /Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis && npm run qa:rules
```

```bash
cd /Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis && npm run test:e2e:gate
```

통과 조건: ① 지문 JSON 3종이 **바이트 동일**(diff 0행), ② baseline 비교 실패 0, ③ 위 명령 전부 exit 0. 셋 중 하나라도 어긋나면 그 이음매는 행동을 바꾼 것이다.

### 4-5. baseline 170장이 증거가 되는 방식 — 정확한 셈

추적 중인 baseline 은 170장이다: `tests/e2e/theme-matrix-smoke.spec.ts-snapshots` **164** + `tests/e2e/safari-hover-ghosting.spec.ts-snapshots` **5** + `tests/e2e/state-smoke.spec.ts-snapshots` **1**.

164장 중 랜딩 카드를 화면에 담는 것은 **52장**이다: `landing-normal` 24 · `landing-test-expanded` 8 · `landing-blog-expanded` 8 · `landing-settings-open` 4 · `mobile-landing-test-expanded` 4 · `mobile-landing-menu-open` 4.

**매니페스트를 계산해 확인한 사실: `theme-matrix-smoke.spec.ts` 는 두 개의 describe 가 같은 PNG 를 친다.** `buildThemeMatrixCases`(72–102)가 164 케이스를, `buildGateThemeMatrixCases`(104–137)가 그중 `gate: true` × `stateCanonical` 뷰포트만 골라 **116 케이스**를 만드는데, 두 쪽의 `screenshotName` 이 같다(94행 = 129행). 따라서

- `npm run test:e2e` — 두 describe 모두 실행 → theme-matrix 테스트 **280개**가 164장을 친다(116장은 두 번 비교). webkit ghosting 6 + 나머지 스펙 포함.
- `npm run test:e2e:smoke` — gate 테스트 제목도 `@gate @smoke`(374행)이므로 **똑같이 280개**가 돈다.
- `npm run test:e2e:gate` — **116** theme-matrix + **6** webkit ghosting = **122 테스트**. 164장 중 116장을 덮는다.

**이음매별로 무엇이 증인인가.**

| 이음매 | 직접 증인 baseline |
|:---|:---|
| S1 모바일 표면 | `theme-state-mobile-landing-test-expanded-{en,kr}-{light,dark}-mobile` 4장 |
| S2 데스크톱 셸 | `theme-state-landing-test-expanded-{en,kr}-{light,dark}-{desktop-wide,tablet-wide}` 8장 + webkit ghosting 5장(`closing`·`cleanup-pending` 위상은 여기서만 본다) + `state-smoke` 의 `expanded-focus-shell` 1장 |
| S3 확장 본문 | 위 12장 전부 |
| S4 Normal face | `theme-layout-landing-normal-*` 24장 + `theme-layout-blog-default-*` |
| S5 클래스명 | 52장 전부 — 클래스 문자열은 ②가 보지만, 그 문자열이 만드는 픽셀은 ③만 본다 |
| C1 · H1 · M1 | webkit ghosting 5장 + `state-smoke` 26 케이스 + F1·F3 지문 |

**`--update` 는 0단계에서 한 번도 치지 않는다.** `npm run qa:visual:full` 은 `AGENTS.md` §4 Hard stops 이고, 0단계는 정의상 baseline 이 변하지 않아야 하는 단계다. 픽셀이 달라졌다면 그것이 결함 보고서다.

### 4-6. QA 하네스가 증거로서 약하다는 점 — 반드시 알고 들어가야 한다

`scripts/qa/check-phase7-state-contracts.mjs:99` 는 컨트롤러 **파일 본문에 `resolveCardStateForVariant` 라는 글자가 있는가**를 본다. 그 글자는 `use-landing-interaction-controller.ts:30` 의 **import 문에도** 있다. 즉 함수를 다른 파일로 옮기고 import 만 남겨도 이 검사는 초록이다. 같은 성질이 phase5·6·8·9 의 정규식 전반에 있다.

결론은 두 가지다. 첫째, `qa:rules` 를 「행동이 안 변했다」의 증거로 쓰지 않는다 — 그것은 「약속한 이름이 약속한 파일에 남아 있다」의 증거다. 둘째, 그럼에도 0단계에서 `qa:rules` 를 돌린다. 이름이 옮겨 갔다는 사실 자체가 **계약 문서가 참조하는 위치가 바뀌었다**는 신호이고, 그때 문서를 따라 고쳐야 하기 때문이다.

---

## 5. 분리 순서 — 무엇을 먼저 가르면 나머지가 쉬워지는가

| 순 | 단위 | 왜 이 자리인가 | 게이트 |
|:---|:---|:---|:---|
| **1** | F1·F2·F3 지문 하네스 (소스 변경 0) | 이후 모든 단위의 합격 판정이 이것 없이는 「스크린샷이 같아 보인다」에 머문다. 소스를 건드리지 않으므로 지문 자체는 현재 행동의 정의가 된다 | `npm test` |
| **2** | **S0 타입 계약 분리** | 런타임 산출 JS 가 문자 그대로 동일하다(타입은 지워진다). 9개 훅 모듈 + 테스트 7종의 import 경로를 **한 줄도 고치지 않고** 훅→컴포넌트 간선을 끊는다. 이후 모든 카드 이음매가 이 계약 파일만 참조하면 된다 | typecheck + F2 |
| **3** | **죽은 표면 제거** (§6 참조) | 이후 모든 diff 가 작아진다. 지문이 바이트 동일이면 죽었다는 것이 증명된다 | F2 + `test:e2e:gate` |
| **4** | **M1 셀렉터 분리** | 카드와 5개 훅이 리듀서 파일에 거는 의존을 끊는다. QA 결합 0, 파일 하나, 위험 최소 — 지문 하네스의 첫 실전 검증으로 적합 | F1 + typecheck |
| **5** | **S1 모바일 표면 + S2 데스크톱 셸** | QA 텍스트 결합 0. 1단계가 통째로 교체할 두 덩어리를 먼저 분리해 두면, 이후 모바일 재설계 diff 가 **파일 교체**로 보인다 | F2 + 12장 baseline |
| **6** | **S3 확장 본문** | phase5 1건(`previewQuestion` 슬롯 정규식)만 따라가면 된다 | F2 + phase5 |
| **7** | **C1 데스크톱 닫기 컨트롤러** | 카드가 안정된 뒤에 컨트롤러를 건드린다. 두 파일을 동시에 흔들면 지문 차이의 원인을 가를 수 없다 | F3 + state-smoke |
| **8** | **H1 스크롤 hold** | 기존 테스트 블록 8케이스가 그대로 증인이다 | F3 + webkit ghosting 5장 |
| **9** | **S4 Normal face** | phase5 3건 + phase6 1건이 따라온다 — QA 결합이 있는 첫 단위이므로 앞선 8단계가 전부 초록인 상태에서 한다 | F2 + 24장 + phase5·6 |
| **10** | **S5 클래스명** *(선택)* | phase5·6·8·9 네 스크립트를 고쳐야 한다(Ask-First). 구조적 이득은 가장 작다. **1단계가 시각 토큰을 다시 쓸 예정이므로 0단계에서 건너뛰는 편을 권고한다** | — |

**핵심은 2번이다.** 타입 계약을 먼저 떼면 3~10번이 전부 「구현을 옮긴다」가 되고, import 경로 수정이라는 잡음이 diff 에서 사라진다. 반대로 이것을 마지막에 하면 매 단위마다 9개 모듈의 import 를 만지게 된다.

---

## 6. 이 분리가 발견한 죽은 표면 — 0단계에서 함께 걷는다

읽는 과정에서 확인한, **어떤 소비자도 없는** 표면 3건이다. 전부 실측으로 확인했다.

**① 카드의 포인터 prop 3종이 죽어 있다.** `onPointerMove`(115) · `onMouseDown`(116) · `onWheel`(117)이 선언되고, 구조분해되고(959–961), root `<div>` 에 배선된다(1151–1153). 그런데 유일한 프로덕션 소비자인 `landing-catalog-grid.tsx:238–277` 은 이 셋을 넘기지 않고, 바인딩 타입 `LandingCardInteractionBindings`(`landing-card-interaction-bindings.ts:18–42`)에도 그 필드가 없다. `src` 와 `tests` 전체 grep 결과 이 셋을 `LandingGridCard` 에 넘기는 자리는 **0곳**이다. 즉 세 핸들러는 항상 `undefined` 이고 React 는 아무 리스너도 달지 않는다 — SSR 마크업이 바이트 동일하다는 것이 제거의 증거가 된다.

**② `LandingCardCopy` 필드 3개가 읽히지 않는다.** 카드가 실제로 읽는 `copy.*` 는 `metaEstimated`(779) · `metaShares`(780) · `metaAttempts`(781) · `readMore`(1076) · `comingSoon`(1077) · `closeExpandedAria`(1239) **여섯**이다. 그런데 타입은 아홉을 선언하고(70–80), `landing-catalog-grid.tsx:108–118` 이 아홉을 전부 채운다. `close` · `metaReadTime` · `metaViews` 는 12개 locale 의 `src/messages/*.json` 에서 번역돼 컴포넌트까지 전달된 뒤 버려진다. **다만 이것은 i18n 메시지 키에 닿으므로 ①과 같은 단위로 묶지 않는다** — 별도 항목으로 보고하고, 메시지 키 삭제 여부는 1단계 계약 개정에서 정한다.

**③ CSS 클래스 `.motionStageLate` 가 죽어 있다.** `landing-grid-card.module.css` 의 6개 규칙(297 · 352 · 359 · 376 · 409 · 412)이 이 클래스를 겨냥하는데, `styles.motionStageLate` 를 붙이는 코드가 `src` 어디에도 없다. 컴포넌트가 쓰는 것은 `motionStageEarly`(382 · 746)와 `motionStageMiddle`(711 · 756)뿐이다. 즉 확장 모션의 **세 번째 단계가 실제로는 적용되지 않는다.** 이것은 죽은 코드인 동시에 **시각 결함 후보**다 — design.md 가 3단 스태거를 규정하는지 확인이 필요하고, 규정한다면 0단계에서 지우는 것이 아니라 1단계에서 되살릴 대상이다. **판단하지 않고 보고한다.**

---

## 7. 위험 — 이 분리가 깨뜨릴 수 있는 것

### 7-1. React 훅 순서 · 정체성

`LandingGridCard` 는 훅 5종을 조건 없이 호출한다(965 · 982–984 · 985 · 992). 제안한 이음매 S1–S4 는 **자식만 추출**하므로 이 다섯은 자리를 지킨다. 위험은 다음 두 가지에서만 발생한다.

- 추출한 자식 안으로 훅을 옮기는 경우. `useLandingCardTitleSplit`(985)은 `enabled: !isMobileViewport`(986)과 `freeze`(987)를 받아 `useState` 를 보유한다(`landing-card-title-continuity.tsx:185`). 이것을 `DesktopExpandedShell` 안으로 옮기면, 셸이 `shouldRenderDesktopStageShell` 에 따라 마운트/언마운트하므로(976, 1213) **확장이 끝날 때마다 split 상태가 초기화된다.** 지금은 초기화되지 않는다. → **훅은 오케스트레이터에 남긴다.**
- `NormalCardTagRow`(449)가 `useCardInlineGeometry`(460)를 호출한다. 이 컴포넌트는 `presentation === 'expandedTitleOnly'` 일 때 렌더되지 않는다(612–614). 지금도 마운트/언마운트하는 구조이므로 S4 추출은 이 성질을 바꾸지 않는다. 바꾸는 것은 **인라인화**뿐이다 — 하지 않는다.

### 7-2. `useId` 값 이동

§4-3 에서 실측한 규칙: `useId` 의 값은 그 호출보다 **먼저 렌더된 컴포넌트 경계의 수**에 의존한다. 호스트 엘리먼트 중첩과 순수 추출은 값을 바꾸지 않지만, `useId` 소비자 **앞에** 컴포넌트를 하나 삽입하면 `_R_0_` → `_R_2_` 로 밀린다. `titleId`/`statusId`(1016–1017)는 `aria-labelledby`/`aria-describedby`(1196–1197)로 나가므로, 값이 밀리면 **접근성 연결 자체는 유지되지만 DOM 문자열이 달라진다.** 지문은 정규화하되, 오케스트레이터의 `useId` 호출 위치(965, 함수 본문 첫 문장)는 **불변으로 고정한다.**

### 7-3. 클로저 캡처 · `useCallback` 의존 배열

C1(컨트롤러 301–476 추출)의 실질적 위험은 여기다. 네 함수는 `interactionState.focusedCardVariant`·`interactionState.expandedCardVariant` 를 **필드 단위로** 의존 배열에 넣는다(338–339, 421–422). 훅 입력으로 객체 하나(`interactionState`)를 통째로 넘기면 의존이 객체 정체성으로 바뀌어 **핸들러가 매 상태 변화마다 새로 만들어진다.** 그것을 `landing-interaction-controller-handlers.test.ts:653` 이 잡는다. → **입력 인터페이스를 필드 단위로 설계한다**(§3-2 의 `focusedCardVariant`/`expandedCardVariant` 분리가 그 이유다).

`resolveCardInteractionBindings`(625–718)는 `useCallback` 이 **아니다** — 평범한 함수이고 렌더마다 카드 수만큼 실행되며, 반환하는 `onCardKeyDown`/`onCardBlur`(707–708)는 매번 새 화살표 함수다. 이 성질은 의도된 것일 수 있으므로 **분리 과정에서 memo 로 "개선"하지 않는다.** 0단계는 행동 보존이고, 핸들러 정체성은 관찰 가능한 행동이다.

### 7-4. 리렌더 경계

S1–S4 는 렌더 트리에 **컴포넌트 경계를 추가**한다. React 는 새 경계마다 별도 reconcile 단위를 갖게 되므로, prop 이 같으면 오히려 작업이 줄 수 있으나 `React.memo` 를 붙이지 않는 한 부모 리렌더 시 자식도 다시 실행된다 — 즉 **현재와 동일**하다. 위험은 최적화를 곁들일 때 생긴다: `React.memo` 를 추가하면 리렌더 횟수가 달라지고, 그것은 `useCardInlineGeometry` 의 `ResizeObserver`/`requestAnimationFrame` 스케줄(`use-card-inline-geometry.ts:241 · 245 · 278`)과 상호작용해 측정 타이밍을 바꿀 수 있다. → **0단계에서 `React.memo`·`useMemo` 를 새로 도입하지 않는다.**

### 7-5. CSS 모듈 스코프

`landing-grid-card.tsx` 는 `styles.*` 를 **36개** 참조하는데, 모듈의 최상위(0열) 클래스 선택자는 **10개**뿐이다. 나머지는 전부 `.root.desktopMotionEnter .expandedShellFrame`(243) · `.root.mobileTransientClosing .normalTitle`(303) · `.transientShell.transientClosing .transientPanel`(338) 같은 **후손/복합 선택자** 안에서만 등장한다. 여기서 나오는 규칙 두 가지.

- **CSS 모듈은 여러 파일에서 같은 모듈을 import 해도 같은 해시 클래스명을 낸다.** 따라서 S1–S4 가 각자 `landing-grid-card.module.css` 를 import 하는 것은 안전하다.
- **하지만 후손 선택자는 DOM 조상 관계를 요구한다.** 어떤 이음매도 마크업을 `.root` 서브트리 밖으로 내보내면 안 된다 — 특히 `MobileTransientShell` 은 `position: fixed` 이지만 **여전히 root 의 자식**이고(1257–1290), `.root.reducedMotion .transientShell.transientClosing`(392 · 403)이 그 관계에 의존한다. **portal 은 0단계에서 금지다.** (1단계에서 바텀시트를 도입할 때는 이 관계를 다시 설계해야 하며, 그때는 CSS 도 함께 옮긴다.)
- `:global(...)` 4건(112 · 129 · 134 등)은 Tailwind 유틸 클래스(`.landing-grid-card-tag-chip` · `.landing-grid-card-subtitle-normal`)를 겨냥한다. 그 문자열은 §3-1 의 S5(클래스명 상수)에 들어 있으므로, S5 를 실행하면 **CSS 와 TSX 가 서로 다른 파일에서 같은 문자열에 의존**하게 된다. 지금도 그렇지만 거리가 멀어진다 — S5 를 마지막에 두고 권고하지 않는 이유 중 하나다.

### 7-6. 소스 텍스트를 읽는 테스트

`tests/unit/landing-card-contract.test.ts:31` 이 `landing-grid-card.tsx` 를 **문자열로 읽는다**(`readLandingGridCardSource`). 같은 파일 24·35행이 CSS 모듈과 `globals.css` 도 읽는다. 클래스 상수 추출(S5)과 Normal face 추출(S4)은 이 테스트를 붉힌다. QA 스크립트와 달리 이것은 `npm test` 안에 있으므로 **기본 게이트에서 즉시 드러난다** — 조용히 통과할 위험은 없다.

### 7-7. Ask-First 경계

`AGENTS.md` §4 에 따라 다음은 승인 없이 손대지 않는다: `scripts/qa/*.mjs`(S3·S4·S5 와 C2 가 건드린다), `src/features/variant-registry/**`(닿지 않는다), `src/app/globals.css`(닿지 않는다). 계획서는 `docs/plans/YYYY-MM-DD-*.md` 에 §7 필드와 함께 저장한다.

---

## 8. 미확인

- **`npm run qa:rules` 의 현재 exit code 를 이 세션에서 실행해 확인하지 않았다.** 프로젝트 메모리는 「이제 exit 0」이라고 기록하지만, 0단계 착수 세션은 §4-2 의 명령으로 직접 확인해야 한다.
- **`npm run test:e2e` / `test:e2e:gate` 를 실행하지 않았다.** 스펙과 매니페스트를 계산해 얻은 수(gate 116 + webkit 6 = 122, 전체 theme-matrix 280 테스트/164 PNG)는 **정적 계산**이며 실행으로 확인하지 않았다. 실행 시 수가 다르면 계산 전제부터 다시 본다.
- **과제 브리프의 「`use-landing-interaction-controller.ts` 뷰포트 분기 40개」를 재현하지 못했다.** 이 세션이 센 `isMobileViewport` 토큰은 **22개**다(파일 전체 `mobile` 대소문자 무시 102건, `viewportTier` 3건). 40 이라는 수가 어떤 정의(예: `mobile*` 식별자 계열 전체)에서 나왔는지 확인하지 못했다. 카드 쪽 31 은 일치한다.
- **`.motionStageLate` 가 `docs/design/design.md` 의 모션 규정에 대응하는지 확인하지 않았다.** 죽은 코드인지 미구현 규정인지가 갈리는 지점이고, 판단은 design.md 를 읽은 뒤에 해야 한다.
- **`renderToStaticMarkup` 11,520 렌더의 실제 소요 시간을 측정하지 않았다.** 현행 `npm test` 전체가 5.44s 이므로 지문 스펙이 그 수십 배를 차지하면 기본 게이트의 비용 구조가 바뀐다. 착수 세션은 축소 조합으로 한 번 계측한 뒤 규모를 확정한다.
- **`use-mobile-card-lifecycle.ts`(287행)와 그 하위 5개 훅은 전수로 읽지 않았다.** C1 이 `clearHoverTimer` 를 통해 그쪽과 얽히므로, C1 착수 전에 그 파일을 전수로 읽어야 한다.
