
## 1. `src/features/landing` 네임스페이스 과부하**
- 현재 blog, test, GNB, telemetry, transition이 모두 이 네임스페이스에 공존

> Phase 1 구현 완료 직후, Phase 2 구현 직전으로 확정

---

## 2. 랜딩 카드 `motion` 적용

- 파일 기준으로 `motion`은 이미 설치되어 있고 React 엔트리포인트는 `motion/react`를 쓰는 형태가 맞습니다. 근거는 [package.json:19](/package.json#L19)와 [node_modules/motion/package.json:26](/node_modules/motion/package.json#L26)입니다.
- 1차 파일럿 카드는 `test-qmbti`보다 `test-energy-check`를 권장합니다. `test-qmbti`는 현재 주 smoke 카드라서 전환/모바일/reduced-motion 테스트가 이 카드의 애니메이션 이름까지 직접 보고 있습니다. 근거는 [tests/e2e/helpers/landing-fixture.ts:3](/tests/e2e/helpers/landing-fixture.ts#L3), [tests/e2e/transition-telemetry-smoke.spec.ts:633](/tests/e2e/transition-telemetry-smoke.spec.ts#L633), [tests/e2e/state-smoke.spec.ts:414](/tests/e2e/state-smoke.spec.ts#L414)입니다.
- 파일럿 범위는 `LandingGridCard` 내부 표현 레이어만 바꾸고, 상태 소유권은 유지하는 방식이 가장 안전합니다. 상태 권한은 [src/features/landing/grid/use-landing-interaction-controller.ts:788](/src/features/landing/grid/use-landing-interaction-controller.ts#L788)부터 [src/features/landing/grid/use-landing-interaction-controller.ts:1582](/src/features/landing/grid/use-landing-interaction-controller.ts#L1582)에 있습니다.
- 외부 에이전트에게는 `isMotionPilotCard(card)` 같은 헬퍼로 카드 1개만 opt-in 하라고 전달하는 편이 좋습니다. 현재 fixture상 후보는 [src/features/landing/data/raw-fixtures.ts:123](/src/features/landing/data/raw-fixtures.ts#L123)입니다.

### 1. 이 프로젝트에서 절대 바꾸지 말아야 할 축
- `useLandingInteractionController`의 reducer, phase, timer는 그대로 두는 게 핵심입니다. hover delay, mobile lifecycle, transition lock, keyboard handoff가 이미 이 레이어에서 일관되게 관리됩니다. 근거는 [src/features/landing/grid/use-landing-interaction-controller.ts:834](/src/features/landing/grid/use-landing-interaction-controller.ts#L834), [src/features/landing/grid/use-landing-interaction-controller.ts:871](/src/features/landing/grid/use-landing-interaction-controller.ts#L871), [src/features/landing/grid/use-landing-interaction-controller.ts:953](/src/features/landing/grid/use-landing-interaction-controller.ts#L953), [src/features/landing/grid/use-landing-interaction-controller.ts:1233](/src/features/landing/grid/use-landing-interaction-controller.ts#L1233)입니다.
- root card 레이아웃을 `layout` 애니메이션으로 흔들면 안 됩니다. grid는 카드 실측으로 spacing model을 계산하고 baseline freeze도 active card 기준으로 걸기 때문입니다. 근거는 [src/features/landing/grid/landing-catalog-grid.tsx:216](/src/features/landing/grid/landing-catalog-grid.tsx#L216)와 [src/features/landing/grid/landing-catalog-grid.tsx:319](/src/features/landing/grid/landing-catalog-grid.tsx#L319)입니다.
- `data-*`, slot 이름, class 이름은 유지해야 합니다. e2e와 static gate가 이 속성들을 직접 읽습니다. 특히 [src/features/landing/grid/landing-grid-card.tsx:445](/src/features/landing/grid/landing-grid-card.tsx#L445)부터 내려가는 `data-mobile-phase`, `data-desktop-motion-role`, `data-expanded-layer`, `data-motion-slot`은 그대로 있어야 합니다.
- title continuity와 baseline restore 로직은 motion으로 대체하지 않는 편이 좋습니다. 근거는 [src/features/landing/grid/landing-card-title-continuity.tsx:92](/src/features/landing/grid/landing-card-title-continuity.tsx#L92)와 [src/features/landing/grid/baseline-manager.ts:24](/src/features/landing/grid/baseline-manager.ts#L24)입니다.

### 2. `motion` 적용 방식: case별 권장안

| 케이스 | 상태 authority | `motion` 적용 위치 | 구현 방향 |
| --- | --- | --- | --- |
| hover | `onMouseEnter/Leave`, `scheduleHoverIntent`, `desktopMotionRole` | desktop overlay 내부의 frame/shell/detail slot | hover delay는 그대로 두고, `desktopMotionRole`이 `opening`, `steady`, `closing`, `handoff-target`일 때만 `motion` variant를 적용합니다. root card는 고정하고 `[data-slot="expandedShell"]`, `[data-slot="expandedSurface"]`, detail slot만 보간합니다. 근거는 [src/features/landing/grid/use-landing-interaction-controller.ts:1391](/src/features/landing/grid/use-landing-interaction-controller.ts#L1391), [src/features/landing/grid/desktop-shell-phase.ts:19](/src/features/landing/grid/desktop-shell-phase.ts#L19)입니다. |
| tap | `onClick`, `onKeyDown`, `beginMobileOpen`, `beginMobileClose` | mobile transient shell과 backdrop | tap 자체는 상태 전환 트리거만 담당하고, 실제 motion은 transient shell에서만 일어나게 둡니다. 클릭/엔터 시 `OPEN_START`와 `CLOSE_START`를 유지하고, `motion`은 이를 시각화만 합니다. 근거는 [src/features/landing/grid/use-landing-interaction-controller.ts:1363](/src/features/landing/grid/use-landing-interaction-controller.ts#L1363), [src/features/landing/grid/use-landing-interaction-controller.ts:1346](/src/features/landing/grid/use-landing-interaction-controller.ts#L1346)입니다. |
| transient shell | `mobileTransientShellState`, snapshot, `MOBILE_EXPANDED_DURATION_MS` | `[data-slot="mobileTransientShell"]` | 이게 모바일 motion의 핵심입니다. `mobileSnapshot`의 `anchorTopPx`, `cardLeftPx`, `cardWidthPx`, `cardHeightPx`를 출발점으로 삼고 fullscreen shell로 보간합니다. 단, mount/unmount 타이밍은 `motion`이 아니라 기존 timer가 유지해야 합니다. 근거는 [src/features/landing/grid/use-landing-interaction-controller.ts:810](/src/features/landing/grid/use-landing-interaction-controller.ts#L810), [src/features/landing/grid/use-landing-interaction-controller.ts:906](/src/features/landing/grid/use-landing-interaction-controller.ts#L906), [src/features/landing/grid/mobile-lifecycle.ts:1](/src/features/landing/grid/mobile-lifecycle.ts#L1)입니다. |
| reduced motion | `interactionState.pageState === 'REDUCED_MOTION'` | 같은 motion wrapper의 reduced variant | `motion`의 `useReducedMotion()`를 별도 source of truth로 쓰지 말고, 기존 page state를 읽어 reduced variant를 태우는 방식이 맞습니다. 현재 CSS 계약은 180ms, no large travel입니다. 근거는 [src/features/landing/grid/use-landing-interaction-controller.ts:491](/src/features/landing/grid/use-landing-interaction-controller.ts#L491), [src/app/globals.css:1331](/src/app/globals.css#L1331), [src/app/globals.css:1424](/src/app/globals.css#L1424)입니다. |
| focus | 기존 focus handler + CSS `:has(:focus-visible)` | 가능하면 motion 미적용, 필요하면 decorative shadow만 | 접근성상 focus는 기존 CSS ring을 유지하는 게 우선입니다. `motion`으로 focusable DOM을 감싸서 reparenting하거나 position을 바꾸면 안 됩니다. 필요하면 overlay surface shadow opacity 정도만 보간합니다. 근거는 [src/app/globals.css:415](/src/app/globals.css#L415), [src/app/globals.css:689](/src/app/globals.css#L689), [src/features/landing/grid/use-landing-interaction-controller.ts:1155](/src/features/landing/grid/use-landing-interaction-controller.ts#L1155)입니다. |

### 3. 구체 구현 원칙
- `AnimatePresence`로 상태를 소유하지 말고, 기존 phase enum을 그대로 variant key로 쓰는 방향이 맞습니다. 이 코드베이스는 timer-driven lifecycle입니다.
- 모바일 transient shell은 `AnimatePresence` exit 완료를 기다리면 안 됩니다. 현재 close settle은 snapshot 복원 완료와 `RESTORE_READY`에 묶여 있고, 그 타이밍은 [src/features/landing/grid/use-landing-interaction-controller.ts:919](/src/features/landing/grid/use-landing-interaction-controller.ts#L919)부터 계산됩니다.
- desktop에서도 `motion`은 `desktopMotionRole`을 해석하는 렌더 레이어여야 합니다. `CARD_EXPAND`/`CARD_COLLAPSE` dispatch 방식 자체를 바꾸면 안 됩니다. 근거는 [src/features/landing/grid/use-landing-interaction-controller.ts:1403](/src/features/landing/grid/use-landing-interaction-controller.ts#L1403)와 [src/features/landing/grid/use-landing-interaction-controller.ts:1471](/src/features/landing/grid/use-landing-interaction-controller.ts#L1471)입니다.
- pilot card에는 `data-motion-pilot="true"` 같은 식별자를 추가하고, 같은 class/slot 구조를 유지한 채 motion wrapper만 얇게 끼우는 방식이 가장 안전합니다.
- `initial={false}` 성격의 접근이 필요합니다. 이 앱은 SSR-neutral 초기값과 hydration 안정성을 강하게 요구합니다. 근거는 [src/features/landing/grid/landing-catalog-grid.tsx:39](/src/features/landing/grid/landing-catalog-grid.tsx#L39)와 [scripts/qa/check-phase9-performance-contracts.mjs:54](/scripts/qa/check-phase9-performance-contracts.mjs#L54)입니다.

### 4. scroll lock 처리 방향
- scroll lock은 그대로 유지해야 합니다. 현재 모바일에서 `OPENING`/`CLOSING`일 때만 `body.style.overflow='hidden'`과 `touchAction='none'`를 걸고, `OPEN` settled에서는 다시 풀어줍니다. 근거는 [src/features/landing/grid/use-landing-interaction-controller.ts:597](/src/features/landing/grid/use-landing-interaction-controller.ts#L597)입니다.
- route transition rollback에서도 overflow를 강제로 초기화합니다. 이 안전장치는 건드리면 안 됩니다. 근거는 [src/features/landing/transition/store.ts:214](/src/features/landing/transition/store.ts#L214)입니다.
- 즉, `motion` 완료 콜백으로 scroll lock을 제어하면 안 되고, lock/unlock은 오직 기존 `mobileLifecycleState.phase`와 transition rollback이 소유해야 합니다.
- backdrop 역시 `motion`이 phase를 만들면 안 됩니다. 현재 backdrop visible 여부는 [src/features/landing/grid/use-landing-interaction-controller.ts:1520](/src/features/landing/grid/use-landing-interaction-controller.ts#L1520)와 [src/features/landing/grid/landing-catalog-grid.tsx:455](/src/features/landing/grid/landing-catalog-grid.tsx#L455)에서 phase 기반으로 제어됩니다.

### 5. QA gate 처리 방향
- static gate는 가능하면 수정하지 않는 것이 최선입니다. 현재 Phase 9/10 스크립트가 CSS selector와 keyframe 이름을 regex로 강하게 검사합니다. 근거는 [scripts/qa/check-phase9-performance-contracts.mjs:110](/scripts/qa/check-phase9-performance-contracts.mjs#L110), [scripts/qa/check-phase10-transition-contracts.mjs:128](/scripts/qa/check-phase10-transition-contracts.mjs#L128)입니다.
- 그래서 1차 파일럿은 “기존 CSS keyframe과 selector는 남기고, pilot card에만 `motion` override를 얹는 방식”이 가장 좋습니다. 이 경우 static gate는 그대로 통과할 가능성이 높습니다.
- e2e는 카드 선택에 따라 전략이 갈립니다. `test-energy-check` 같은 비-primary 카드에 적용하면 기존 smoke를 거의 건드리지 않고 pilot 전용 smoke만 추가하면 됩니다.
- pilot 전용 smoke는 최소한 hover open, mobile open/close, reduced-motion, focus ring 유지, scroll lock hidden/unhidden, `restoreReady`, console/page error 0을 검증해야 합니다. 참고할 기존 assertion 묶음은 [tests/e2e/transition-telemetry-smoke.spec.ts:399](/tests/e2e/transition-telemetry-smoke.spec.ts#L399), [tests/e2e/transition-telemetry-smoke.spec.ts:621](/tests/e2e/transition-telemetry-smoke.spec.ts#L621), [tests/e2e/state-smoke.spec.ts:371](/tests/e2e/state-smoke.spec.ts#L371), [tests/e2e/state-smoke.spec.ts:307](/tests/e2e/state-smoke.spec.ts#L307)입니다.
- 만약 pilot를 `test-qmbti`에 적용한다면 기존 e2e의 `animationName` 체크를 motion-agnostic한 geometry/phase/assertion으로 바꿔야 합니다. 수정 대상은 최소 [tests/e2e/transition-telemetry-smoke.spec.ts:576](/tests/e2e/transition-telemetry-smoke.spec.ts#L576), [tests/e2e/transition-telemetry-smoke.spec.ts:633](/tests/e2e/transition-telemetry-smoke.spec.ts#L633), [tests/e2e/transition-telemetry-smoke.spec.ts:661](/tests/e2e/transition-telemetry-smoke.spec.ts#L661), [tests/e2e/state-smoke.spec.ts:414](/tests/e2e/state-smoke.spec.ts#L414)입니다.

### 6. 핵심 요약
- 이 작업의 정답은 “상태 머신을 `motion`으로 바꾸는 것”이 아니라 “기존 상태 머신을 그대로 두고, 파일럿 카드 1개에 한해 overlay/transient shell만 `motion`으로 시각화하는 것”입니다.  
- 1차 구현에서는 reducer/store/timer/scroll lock은 유지하고, root layout animation과 focus DOM reparenting은 금지하는 방향으로 계획을 세우는 것이 맞습니다.

---

## 3. motion 적용 - 테스트 플로우, GNB 등
4. 
motion 의존성은 [package.json:22](/package.json#L22)에 있고, 랜딩 카드 확장/축소는 [src/features/landing/grid/landing-grid-card.tsx:382](/src/features/landing/grid/landing-grid-card.tsx#L382), [src/app/globals.css:696](/src/app/globals.css#L696), [src/app/globals.css:920](/src/app/globals.css#L920)처럼 이미 상당히 정교합니다. 그래서 랜딩카드를 제외한 나머지 적용 대상은 “아직 정적이지만 사용자 체감이 큰 화면” 아래 화면이 적합합니다.

| 우선순위 | 영역 | 구현 방향 | 기대 효과 |
| --- | --- | --- | --- |
| 1 | 테스트 플로우 | [src/features/test/test-question-client.tsx:81](/src/features/test/test-question-client.tsx#L81)에서 instruction overlay, question panel, result panel을 AnimatePresence 중심으로 전환하고, 질문 본문은 currentQuestion.id 기준으로 짧은 fade/slide, 버튼 영역은 layout 애니메이션 적용 | 시작, 답변, 제출 결과의 단계감이 분명해지고 랜딩에서 테스트로 넘어온 흐름이 덜 끊깁니다. 현재 CSS는 버튼 hover 수준에 머물러 있어 [src/app/globals.css:1535](/src/app/globals.css#L1535) 대비 개선 여지가 가장 큽니다. |
| 2 | 동의 배너 | [src/features/landing/shell/telemetry-consent-banner.tsx:10](/src/features/landing/shell/telemetry-consent-banner.tsx#L10)의 spacer와 banner layer를 layout + enter/exit motion으로 묶어 하단 slide-up/fade 처리 | 현재는 mount/unmount가 즉시 일어나서 하단 레이아웃 점프가 체감될 수 있습니다. 작은 모션만으로도 intrusive 느낌을 줄이고 품질 인상을 높일 수 있습니다. |
| 3 | GNB 모바일 메뉴 / 데스크톱 settings 패널 | [src/features/landing/gnb/site-gnb.tsx:627](/src/features/landing/gnb/site-gnb.tsx#L627), [src/features/landing/gnb/site-gnb.tsx:747](/src/features/landing/gnb/site-gnb.tsx#L747)에서 오버레이/panel의 존재 제어만 motion으로 맡기고, focus/outside-close 로직은 유지 | 메뉴와 설정 패널의 열림/닫힘이 더 일관돼 보이고, CSS의 closing 상태 관리([src/app/globals.css:1893](/src/app/globals.css#L1893), [src/app/globals.css:2126](/src/app/globals.css#L2126))를 점진적으로 정리할 여지가 생깁니다. |
| 4 | 블로그 목적지 도착 연출 | [src/features/landing/blog/blog-destination-client.tsx:20](/src/features/landing/blog/blog-destination-client.tsx#L20)의 selected article와 목록 강조를 짧게 reveal | 랜딩에서 블로그로 넘어왔을 때 “도착했다”는 감각이 생깁니다. 다만 현재 페이지가 정적이라 우선순위는 테스트/배너보다 낮습니다. |
**도입 제안**
도입을 한다면 로컬 설치본 기준 React 엔트리포인트는 motion/react로 잡는 게 맞습니다. 첫 단계는 TestQuestionClient와 TelemetryConsentBanner 두 곳만 적용하는 것이 가장 안전합니다. 이 둘은 사용자 체감은 크고, 랜딩 핵심 상태 머신과 QA 계약을 거의 건드리지 않습니다.
공통 원칙은 3가지면 충분합니다. prefers-reduced-motion에서는 opacity 중심의 0~150ms 축약 전환만 허용하고, 텔레메트리나 transition completion을 애니메이션 완료 시점에 묶지 않으며, 복잡한 shared layout은 랜딩 코어가 아니라 테스트/배너처럼 단순한 컴포넌트부터 시작하는 방향이 좋습니다.
