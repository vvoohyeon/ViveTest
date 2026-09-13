# branches-controller — 랜딩 인터랙션 3종 훅의 뷰포트·입력 분기 전수 맵

읽은 대상: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (HEAD=7616211 — a5aec95 위에 이 세션의 빈 착수 마커 커밋 1개만 얹힌 상태이므로 내용은 a5aec95와 동일). 세 파일을 전수로 읽었고, 판정에 필요한 피호출 모듈(`hover-intent.ts` · `mobile-lifecycle.ts` · `interaction-dom.ts` · `mobile-card-lifecycle-dom.ts` · `use-mobile-*.ts` 4종 · `use-desktop-motion-controller.ts` · `layout-plan.ts` · `interaction-state.ts` 해당 구간)과 유일한 호출자 `landing-catalog-grid.tsx`도 함께 읽었다. 저장소 파일은 수정하지 않았다.

근거의 종류는 각 행에 코드로 표기한다 — **[C]** 코드 실측(file:line), **[S]** 계약 조항(`docs/req-landing.md`), **[W]** WCAG 2.2, **[P]** 플랫폼 관용(iOS HIG / Material 3 / 모바일 웹 관행). 판정하지 못한 것은 **미확인**으로 적었다.

---

## 0. 먼저 확정한 사실 3가지

**뷰포트 판정은 두 갈래로 들어오지만 값은 한 곳에서 온다.** 훅은 `viewportWidth: number`(use-landing-interaction-controller.ts:52)와 `viewportTier: LandingCardViewportTier`(같은 파일 :53)를 **서로 독립한 두 prop**으로 받고, 전자는 `resolveInteractionMode`(:71-77)가, 후자는 `isMobileViewport`(:157)가 쓴다. 그런데 유일한 프로덕션 호출자가 둘 다 같은 `viewportWidth` state에서 파생시킨다 — `landing-catalog-grid.tsx:54-55`가 `resolveLandingViewportTier(viewportWidth)`로 tier를 만들고, `:79`가 `viewportWidth`를, `:80`이 `plan.tier`를 넘긴다. 그래서 오늘은 두 값이 항상 정합하지만, **훅의 타입 계약은 그것을 강제하지 않는다.**

**입력 방식을 읽는 곳은 저장소 전체에 세 곳뿐이고, 그중 이 3파일에 속한 것은 한 곳이다.** `(hover: hover) and (pointer: fine)`은 `use-landing-interaction-controller.ts:207` · `src/features/gnb/hooks/use-gnb-capability.ts:17` · `src/features/landing/grid/landing-grid-card.module.css:92` 세 곳에 각각 **독립적으로** 적혀 있다(전수 grep 결과, `any-hover`/`any-pointer`/`pointer: coarse`는 저장소에 0건). 결정 2(입력 방식 기준 통일)는 이 세 정의 지점을 하나로 접는 일이 된다.

**`|| isMobileViewport`는 오늘 도달 불가능한 분기다.** `interactionMode === 'hover'`는 `viewportWidth >= 768`을 함의하고(:72), `isMobileViewport`는 `viewportTier === 'mobile'` 즉 `viewportWidth <= 767`을 함의한다(`layout-plan.ts:63-66`). 호출자가 같은 값에서 둘을 파생시키므로 `interactionMode !== 'hover' || isMobileViewport`(use-hover-intent-controller.ts:318 · :390 · :483)의 **두 번째 항은 프로덕션에서 절대 참이 되지 않는다.** 테스트 하네스도 정합 쌍만 넘긴다(`tests/unit/landing-interaction-controller-handlers.test.ts:181-182`는 `1280/desktop`, `:567-568`은 `390/mobile`). 결정 2가 `isMobileViewport`의 의미를 「폭」에서 「입력 방식」으로 바꾸는 순간 이 죽은 항이 **살아난다** — 그리고 살아나는 방향이 정확히 반대다(hover 없는 900px 태블릿에서 `interactionMode==='tap'`이면 첫 항이 이미 참이므로, 둘째 항은 여전히 무의미하다). 즉 결정 2 이후 이 세 줄은 `interactionMode !== 'hover'` 한 항으로 접혀야 하며, 그대로 두면 **의미가 중복된 채 갈라진 두 진실**이 남는다.

---

## A. 분기 표

### A-1. `src/features/landing/grid/use-landing-interaction-controller.ts` (738행)

`isMobileViewport` 문자열 22회 · `interactionMode` 18회 = 40회 출현(과제 브리프의 40과 일치). 그중 **실제 판정 지점은 아래 26개**이고 나머지는 dispatch payload 전달·의존성 배열이다.

| # | file:line | 조건식 | semantics | 제어 대상 | 근거 | 재배선 위험 |
|:--|:--|:--|:--|:--|:--|:--|
| C1 | :72 | `viewportWidth < 768` → `'tap'` | **width** | `interactionMode` 전체 | [S] req-landing.md:513 §8.1 「`width<768`: 항상 Tap Mode」 · [C] | **최상위.** 결정 2가 지우는 바로 그 줄. 이 리터럴 `768`은 `layout-plan.ts:1`의 `MOBILE_MAX_VIEWPORT_WIDTH=767`과 **별개의 하드코딩**이라 두 곳을 함께 고쳐야 한다 |
| C2 | :76 | `hoverCapability ? 'hover' : 'tap'` | **input** | `interactionMode` (≥768 구간) | [S] req-landing.md:514-515 §8.1 · [C] | 결정 2 후 이 줄이 **유일한** 모드 결정자가 된다. 폭 항이 사라지면 함수 시그니처 `(viewportWidth, hoverCapability)`의 첫 인자가 죽는다 |
| C3 | :112 | `useState<boolean>(false)` | **input** (SSR 중립값) | 초기 `hoverCapability` | [S] req-landing.md:516 §8.1 「SSR 초기값은 Tap Mode」 · req-landing.md:739-751 §11.1 | 결정 2 후에도 유지 필수. 이 false가 곧 「mount 전에는 터치로 간주」이고, 그것이 모바일 최적 기본값과 같은 방향이다 |
| C4 | :123-126 | `useMemo(resolveInteractionMode(viewportWidth, hoverCapability))` | **both** | 모드 합성점 | [C] | 결정 2 후 deps에서 `viewportWidth`가 빠진다 → 리사이즈마다 재계산되던 것이 멈춘다(성능 개선이자 회귀 위험) |
| C5 | :157 | `viewportTier === 'mobile'` | **width** | 아래 C6~C26 전부 | [S] req-landing.md:185 §6.1 「Breakpoints: Mobile `0~767`」 · [C] `layout-plan.ts:63-71` | **핵심 재배선 지점.** 이 한 줄이 「모바일 생명주기를 쓰는가」와 「모바일 레이아웃인가」를 **동시에** 뜻한다. 결정 2는 이 둘을 갈라야 한다 — 레이아웃 tier는 폭, 생명주기는 입력 |
| C6 | :165-168 | `useDesktopMotionController({isMobileViewport})` | width | 데스크톱 모션 상태 전량 | [C] `use-desktop-motion-controller.ts:124-130` | 모바일이면 모션 상태를 `initialDesktopMotionState`로 **동기 초기화**(layout effect). 입력 기준으로 바뀌면 hover 없는 태블릿의 데스크톱 오버레이 모션이 통째로 사라진다 — 의도된 변화지만 시각 baseline 44장+α에 직결 |
| C7 | :174-181 | `useHoverIntentController({interactionMode, isMobileViewport})` | both | hover intent 전량 | [C] | §C 참조. 서명 인터랙션의 게이트 |
| C8 | :191-200 | `useMobileCardLifecycle({interactionMode, isMobileViewport})` | both | 모바일 생명주기 전량 | [C] | §D 참조 |
| C9 | :202-219 | `matchMedia('(hover: hover) and (pointer: fine)')` + `change` 리스너 | **input** | `hoverCapability` | [S] req-landing.md:514-516 §8.1 · [C] | 저장소 3개 정의 지점 중 하나. 결정 2에서 이것이 단일 정본이 되어야 한다 |
| C10 | :221-248 | `matchMedia('(prefers-reduced-motion: reduce)')` | 입력 아님(모션 선호) | `pageState = REDUCED_MOTION` | [W] 2.3.3 Animation from Interactions · [S] req-landing.md:760 §11.3 | 뷰포트 분기가 아니므로 결정 2의 영향권 밖. 단 모바일 전용 모션을 새로 만들면 **이 경로에 대응 축약본이 반드시 필요** |
| C11 | :250-255 | `dispatch MODE_SYNC` on `interactionMode` 변화 | both | `hoverLock` | [S] req-landing.md:449-470 §7.5 「HOVER_LOCK은 hover-capable 모드 전용」 · [C] `interaction-state.ts:253-266` | tap으로 바뀌면 `hoverLock.enabled=false`로 강제. 결정 2 후 태블릿이 tap이 되면 **hoverLock이 태블릿에서 통째로 꺼진다** — §7.5가 태블릿을 어떻게 다뤘는지 재작성 필요 |
| C12 | :308-310 | `if (isMobileViewport) return;` (`closeDesktopCard`) | width | 데스크톱 close 커맨드 | [S] req-landing.md:582 §8.3 「Mobile card-root Escape/blur는 이 Desktop/Tablet close 경로를 실행하면 안 된다」 | 입력 기준으로 바뀌면 hover 없는 태블릿에서 이 경로가 닫힌다 → **현재 태블릿의 유일한 Escape 경로가 사라진다.** 대체 경로를 같이 설계하지 않으면 [W] 2.1.2 키보드 트랩 위험 |
| C13 | :354-358 | `resolveKeyboardFocusDisposition({isMobileViewport,...})` | width | 키보드 포커스 처분 | [C] `interaction-state.ts:99-108` · [S] req-landing.md:472 §7.6 「Mobile lifecycle은 본 override 대상이 아니다」 | 모바일이면 항상 `'preserve-mobile'`. 결정 2 후 터치 태블릿의 **키보드 탐색**(외장 키보드 연결 아이패드)이 이 가지로 넘어간다 — 입력 방식이 hover 없음이라고 키보드가 없는 건 아니다. **이 맵에서 가장 위험한 의미 충돌** |
| C14 | :360-369 | `disposition === 'preserve-mobile'` | width(파생) | `CARD_FOCUS`만 dispatch, 확장 없음 | [C] | C13과 한 몸 |
| C15 | :431 | `isMobileViewport \|\|` (`handleCardKeyDown`, Escape) | width | Escape close | [S] req-landing.md:582 §8.3 | 모바일에서 Escape가 **아무 일도 하지 않는다.** 모바일에 물리 키보드가 붙는 경우가 [P] iPadOS/안드로이드 태블릿에서 일상적이므로, 결정 2 후 「터치 생명주기 + 키보드 있음」 조합이 정식 상태가 된다 |
| C16 | :455 | `isMobileViewport \|\|` (`handleCardBlur`) | width | blur close | [S] req-landing.md:582 §8.3 | C15과 동일 |
| C17 | :499-514 | `useKeyboardHandoff({interactionMode, isMobileViewport})` | both | 키보드 핸드오프 전량 | [C] `use-keyboard-handoff.ts:54-55, 74, 80-81` | 내부에서 `useLandingKeyboardEntry({isMobileViewport})`(:73-75)와 `useCardKeyboardHandler`(:76-91) 둘로 다시 갈린다 — 3파일 밖이지만 같은 플래그를 소비한다 |
| C18 | :553-557 | `isMobileViewport && phase !== 'NORMAL' && (cardVariant !== card.variant \|\| phase !== 'OPEN')` | width | 클릭 차단 | [S] req-landing.md:642 §8.5 「다른 카드 상호작용을 비활성화한다」 | 3중 조건. 결정 2 후 태블릿에서 처음으로 참이 될 수 있다 |
| C19 | :578-583 | `if (isMobileViewport) { if (phase==='NORMAL' && cardVariant!==card.variant) beginMobileOpen(...); return; }` | width | **탭 열기의 유일한 진입점** | [S] req-landing.md:621 §8.5 「탭한 해당 카드만 Expanded로 진입한다」 | `phase === 'NORMAL'` 조건 때문에 **이미 열린 자기 카드를 다시 탭해도 아무 일이 없다**(닫히지 않는다). 브리프의 실측 「재탭으로 닫기 불가」가 여기서 코드로 확인된다. [P] iOS HIG·Material 3의 바텀시트/확장 카드 관용은 재탭 또는 스와이프-다운 닫기를 기대하므로 개정 후보 |
| C20 | :585-592 | (else) `desktopTransitionReasonRef='expand'` + `CARD_EXPAND` | width(파생) | 데스크톱 탭 확장 | [S] req-landing.md:534 §8.2 「Tap Mode fallback(`width>=768`): tap으로 Expanded 진입」 | **여기가 브리프 실측 「터치 태블릿 900×1200 → layer=desktop-overlay」의 출처다.** 결정 2가 정확히 이 줄을 C19 쪽으로 옮긴다 |
| C21 | :639 | `!isMobileViewport && closingCardVariant === card.variant && cardEnterable` | width | 닫힘 잔상 가시성 | [C] | |
| C22 | :641 | `!isMobileViewport && cleanupPendingCardVariant === card.variant && cardEnterable` | width | cleanup 보류 | [S] req-landing.md:581 §8.3 「`closing`, `cleanup-pending`, `handoff-source`의 선택지는 즉시 tab/activation/AT 대상에서 제외」 | [W] 2.4.11 Focus Not Obscured 와 직결 — 닫히는 중 요소를 탭 대상에서 빼는 규칙 |
| C23 | :642-649 | `resolveDesktopMotionRole({isMobileViewport,...})` | width | 모션 역할 | [C] `desktop-shell-phase.ts` (미열람 — **미확인**) | |
| C24 | :650-656 | `resolveDesktopShellPhase({isMobileViewport,...})` | width | 셸 phase | [C] 동상 (**미확인**) | |
| C25 | :657-660 | C18과 동일 식의 두 번째 사본 | width | `interactionBlocked`·`ariaDisabled`·`tabIndex` | [S] req-landing.md:697-712 §9.2 | **같은 3중 조건이 :553-557과 :657-660 두 곳에 복제돼 있다.** 한쪽만 고치면 조용히 갈라진다 |
| C26 | :720-725 | `isMobileViewport ? (모바일 변종) : (데스크톱 4중 fallback)` | width | `activeVisualCardVariant` | [C] | 그리드 기하 컨트롤러로 나가는 출력(`landing-catalog-grid.tsx:105`) |

### A-2. `src/features/landing/grid/use-mobile-card-lifecycle.ts` (287행)

`isMobileViewport` 7회 · `interactionMode` 13회 출현. **실제 판정 지점은 4개뿐**이고, `interactionMode`는 **단 한 번도 비교되지 않는다.**

| # | file:line | 조건식 | semantics | 제어 대상 | 근거 | 재배선 위험 |
|:--|:--|:--|:--|:--|:--|:--|
| M1 | :20, :42 / 소비 :115, :149, :171, :180, :199, :243 | `interactionMode`를 **비교 없이** dispatch payload로만 전달 | **unclear** | 없음(하류에 위임) | [C] | 이 파일은 모드를 모른다. 실제 분기는 `interaction-state.ts`의 `event.interactionMode !== 'hover'` 6곳(:296, :307, :329, :350, :376, :409)에서 일어난다. **모바일 생명주기가 만든 `CARD_EXPAND`는 언제나 `'tap'`을 실어 보내므로 리듀서에서 hover 경로와 다른 가지를 탄다** — 결정 2로 태블릿이 tap이 되면 태블릿의 리듀서 경로도 함께 바뀐다 |
| M2 | :25, :47 | `isMobileViewport` 입력 | width | M3·M4·M6 | [C] | |
| M3 | :193-203 | `if (!isMobileViewport && phase !== 'NORMAL')` → `resetMobileRuntime()` + `CARD_COLLAPSE` | **width** | 리사이즈 강제 종료 | [S] req-landing.md:203 §6.2 「Expanded 활성 중 viewport 변경 시 강제 종료」 · req-landing.md:539 §8.2 「강제 종료는 이 절의 어떤 규칙으로도 완화되지 않는다」 | **결정 2에서 가장 먼저 깨지는 효과.** 「모바일이 아니게 되면 죽인다」를 입력 기준으로 옮기면, 마우스를 꽂거나 뽑는 순간(= `matchMedia` change) 열린 카드가 죽는다. 폭 변경과 입력 변경은 빈도·의도가 전혀 다르므로 **두 트리거를 분리해 설계해야 한다** |
| M4 | :211-228 | `!isMobileViewport \|\| expandedCardVariant === null \|\| phase !== 'NORMAL'` → return; 아니면 rAF로 `beginMobileOpen(variant, false)` | width | 외부 확장의 생명주기 입양 | [C] | 키보드·전환 복귀가 만든 `expandedCardVariant`를 모바일 생명주기가 뒤늦게 흡수하는 경로. rAF 1프레임 지연이 있어 [S] req-landing.md:626 §8.5 「y-anchor 편차 없이 유지」와 경합할 여지 — **미확인**(측정 필요) |
| M5 | :270-275 | `useMobileBackdropGesture({isMobileViewport, phase, ...})` | width | backdrop 활성 여부 | [C] `use-mobile-backdrop-gesture.ts:61-62` `isMobileViewport && phase !== 'NORMAL'` | **브리프 실측 「터치 태블릿에서 backdrop 0개」의 출처.** 결정 2가 직접 고치는 지점 |
| M6 | :191 | `useMobileScrollLock(phase)` — **뷰포트 인자 없음** | 없음 | `document.body.style.overflow/touchAction` | [S] req-landing.md:641 §8.5 「OPENING/CLOSING transition window 동안 page scroll lock, OPEN settled unlock」 · [C] `use-mobile-scroll-lock.ts:5-7` | phase만 보므로 뷰포트 게이트가 없다 — 오늘은 phase가 모바일에서만 움직이니 무해하지만, 결정 2 후 태블릿/데스크톱에서 phase가 움직이면 **데스크톱에서 body scroll이 잠긴다**. [W] 1.4.10 Reflow·[W] 2.1.1 과 충돌 가능 |
| M7 | :132-140 | `phase === 'OPENING'` → `QUEUE_CLOSE` / `phase !== 'OPEN'` → return | 생명주기(뷰포트 아님) | 닫기 큐 | [S] req-landing.md:643 §8.5 「OPENING 중 유효 닫기 입력은 OPEN settled 직후 1회 queue-close」 | |
| M8 | :230-268 | `phase !== 'CLOSING' \|\| closeTimer !== null` → return | 생명주기 | 닫힘 정착 | [S] req-landing.md:635 §8.5 | |

### A-3. `src/features/landing/grid/use-hover-intent-controller.ts` (527행)

`isMobileViewport` 9회 · `interactionMode` 16회 출현. **뷰포트/입력 판정 지점은 4개**, 이벤트 종류 판정이 3개 더 있다.

| # | file:line | 조건식 | semantics | 제어 대상 | 근거 | 재배선 위험 |
|:--|:--|:--|:--|:--|:--|:--|
| H1 | :318-320 | `if (interactionMode !== 'hover' \|\| isMobileViewport) return;` (`recordPointerInput`) | **both**(둘째 항 도달 불가) | 유실 leave 복구 + 스크롤 hold 재판정 | [S] req-landing.md:546 §8.2 조정값 「해제 조건 ⑴」 | **주의: 이 return 앞에서 이미 부작용이 일어난다** — :301-303 `pointerMoveSeq` 증가, :305-311 포인터 좌표 기록, :313-316 카드 소유권 갱신. 즉 tap 모드에서도 좌표·소유권 ref는 계속 갱신된다. 결정 2로 태블릿이 tap이 되면 **쓰지도 않을 상태를 매 pointermove마다 기록한다**(성능 예산 항목) |
| H2 | :367-380 | `interactionMode !== 'hover' \|\| isMobileViewport \|\| state.expandedCardVariant !== held` → `releaseScrollHold()` | both | 스크롤 hold 잔류 방지 | [S] req-landing.md:550 §8.2 「유지 상태는 카드가 다른 이유로 접히거나 hover 모드를 벗어나면 함께 해제」 | 모드 전환이 실제로 일어나는 기기(마우스 연결/해제)에서 **처음으로 발화**하게 된다 |
| H3 | :389-392 | 동일 가드 (`onMouseEnter`) | both | hover 진입 전량 | [S] req-landing.md:511-519 §8.1 | |
| H4 | :482-485 | 동일 가드 (`onMouseLeave`) | both | hover 이탈 전량 | [S] 동상 | |
| H5 | :301-303 | `if (event.type === 'pointermove')` → `pointerMoveSeq += 1` | **input**(이벤트 종류) | 스크롤/포인터 구분의 기준 | [C] :80-85 docstring · [S] req-landing.md:545 §8.2 | `mousedown`은 세지 않는다 — 의도적. 터치 기기에서 `pointermove`는 **손가락이 닿아 있을 때만** 발생하므로 이 시퀀스 개념 자체가 터치에선 다른 의미다 |
| H6 | :305-311 | `'clientX' in event && 'clientY' in event` | input(이벤트 형태) | 포인터 좌표 기록 | [C] | |
| H7 | :327 | `scrollHeldCardVariant !== null && event.type === 'pointermove'` | input | hold 재판정 트리거 | [S] req-landing.md:546 §8.2 해제 조건 ⑴ | |
| H8 | :211-221 | `abs(Δx) <= 1 && abs(Δy) <= 1` (`isPointerStationaryBoundaryEvent`) | input(좌표 해상도) | 위조 진입 차단 | [S] req-landing.md:548-549 §8.2 · [C] :57-62 docstring(실측 `218.66` vs `218`) | 마우스 전용 현상에 대한 보정. 터치 생명주기로 가면 **의미가 없어진다**(교체 후보) |

---

## B. 세 파일의 맞물림 — 호출 관계와 상태 소유권

```text
                        landing-catalog-grid.tsx
                          viewportWidth (state, :53)
                                 │
                  ┌──────────────┴───────────────┐
                  ▼                              ▼
     resolveLandingViewportTier            (그대로 전달)
      layout-plan.ts:63-71                        │
                  │  tier                         │  viewportWidth
                  ▼                               ▼
     ┌────────────────────── useLandingInteractionController (738행) ──────────────────────┐
     │                                                                                     │
     │  소유 상태 ①  hoverCapability        useState        :112   ← matchMedia :207        │
     │  소유 상태 ②  interactionState       useReducer      :113-116  (interaction-state.ts)│
     │  소유 상태 ③  mobileLifecycleState   useReducer      :117-120  (mobile-lifecycle.ts) │
     │  소유 상태 ④  transitionSourceCardVariant useState   :121                            │
     │  파생        interactionMode  :123  ·  isMobileViewport :157                         │
     │                                                                                     │
     │   ├─► useDesktopMotionController  {expandedCardVariant, isMobileViewport}   :165     │
     │   │        소유: desktopMotionState (opening/closing/cleanup/handoff 4쌍)            │
     │   │                                                                                 │
     │   ├─► useHoverIntentController    {state, dispatch, mode, isMobile, shellRef} :174   │
     │   │        소유: ref 7개뿐 — React state 0개                                          │
     │   │        반환: clearHoverTimer / cancelPendingHoverIntent /                        │
     │   │              recordPointerInput / resolveHoverHandlers                           │
     │   │        ▲ dispatch 로만 ②를 바꾼다. ③은 건드리지 않는다                            │
     │   │                                                                                 │
     │   ├─► useMobileCardLifecycle      {mode, ②, dispatch②, ③, dispatch③,         :191   │
     │   │                                isMobile, shellRef, clearHoverTimer}              │
     │   │        ▲ clearHoverTimer 를 인자로 받아 hover 훅을 역방향으로 끈다 (:91)          │
     │   │        내부 4분할:                                                               │
     │   │          useMobileRestorePolling   소유: mobileRestoreReadyVariant(state)+ref 2  │
     │   │          useMobileTransientShell   소유: mobileTransientShellState(state)        │
     │   │          useMobileScrollLock       소유: document.body 스타일 (DOM 부작용)        │
     │   │          useMobileBackdropGesture  소유: outsideGestureRef                       │
     │   │        + 자체 ref: mobileOpenTimerRef · mobileCloseTimerRef                      │
     │   │                                                                                 │
     │   └─► useKeyboardHandoff          {②, dispatch②, mode, isMobile, ③,          :499   │
     │                                    beginMobileOpen, beginMobileKeyboardHandoff}      │
     │            ▲ ③의 **쓰기 함수**를 받아 모바일 생명주기를 직접 연다                     │
     └─────────────────────────────────────────────────────────────────────────────────────┘
```

**소유권을 한 문장으로.** 오케스트레이터가 **두 리듀서를 모두 소유**하고(`interactionState` ②, `mobileLifecycleState` ③), 세 자식 훅 중 hover 훅은 ②만, 모바일 훅은 ②와 ③ 둘 다, 키보드 훅은 ②와 ③의 쓰기 함수를 받아 쓴다 — **③의 dispatch가 세 경로(모바일 훅 자신 · 키보드 훅 · 오케스트레이터의 `resetMobileRuntime`)로 갈라져 있다**는 것이 이 구조의 핵심 부채다.

**두 리듀서는 서로를 모르면서 같은 것을 표현한다.** ②의 `expandedCardVariant`와 ③의 `cardVariant + phase`는 모바일에서 **같은 사실의 두 사본**이고, 둘을 맞추는 코드가 세 군데에 흩어져 있다 — `beginMobileOpen`이 ②에 `CARD_EXPAND`를 쏘고(use-mobile-card-lifecycle.ts:111-119), `beginMobileClose`가 ②에 `CARD_COLLAPSE`를 쏘고(:146-151), 그리고 **반대 방향으로** ②가 먼저 확장되면 :211-228 효과가 ③을 뒤늦게 입양한다. 세 번째 것이 특히 위험하다 — rAF 한 프레임 뒤에 일어나므로 그 사이에 ②만 확장된 중간 상태가 실재한다.

**hover 훅은 React 상태를 하나도 갖지 않는다.** 7개의 ref(`hoverTimerRef` :72, `hoverIntentTokenRef` :73, `pointerWithinCardVariantRef` :74, `pointerLocationRef` :75, `pointerMoveSeqRef` :86, `scrollHeldCardVariantRef` :87, `detachScrollHoldListenerRef` :88)만으로 돌아가며, 밖으로 나가는 유일한 통로가 `dispatch`다. 그래서 **hover 훅을 통째로 들어내도 렌더 트리에는 아무 구멍이 나지 않는다** — 결정 7의 「교체」 난이도를 크게 낮추는 사실이다.

**역방향 결합은 정확히 한 줄이다.** `useMobileCardLifecycle`이 `clearHoverTimer`를 **인자로** 받아(use-landing-interaction-controller.ts:199) `resetMobileRuntime` 안에서 호출한다(use-mobile-card-lifecycle.ts:91). 모바일 훅이 hover 훅의 내부를 끄는 유일한 지점이고, 결정 2 이후 hover 훅이 태블릿에서 꺼지면 이 줄은 no-op가 된다.

**언마운트 정리는 세 군데에서 중복된다.** 오케스트레이터 :271-281(3종 일괄), 모바일 훅 :205-209(`clearMobileTimers`), hover 훅 :382(`releaseScrollHold`), 복원 폴링 :106-111. 서로를 모른 채 각자 정리하므로 안전하지만, **정리 순서가 보장되지 않는다** — 미확인(실측 안 함).

---

## C. `use-hover-intent-controller.ts` 527행이 무엇을 하는가

**한 문장:** 마우스 포인터가 카드 위를 지나가는 것과 「이 카드를 보려고 멈춘 것」을 구분하고, **스크롤이 만들어 낸 가짜 hover 이벤트를 걸러내는** 단일 타이머 상태 기계다. 527행 중 실제 로직은 약 330행이고 나머지는 실측 근거를 담은 한국어 docstring 5개(:57-61, :80-85, :149-158, :197-210, :245-251, :282-298, :363-366)다 — **이 주석들이 사용자가 손으로 메웠다는 그 초정밀 명세의 물리적 증거다.**

### C-1. 임계값 전수 (4개)

| 값 | 상수명 | file:line | 의미 | 조항 |
|:--|:--|:--|:--|:--|
| **160ms** | `DESKTOP_EXPAND_DELAY_MS` | hover-intent.ts:1 | hover 진입 → 확장까지 dwell | [S] req-landing.md:543 §8.2 조정값 「`120~200ms` — 현행 `160ms`」 |
| **140ms** | `DESKTOP_COLLAPSE_DELAY_MS` | hover-intent.ts:2 | 이탈 → 축소까지 유예 | [S] req-landing.md:544 §8.2 조정값 「`100~180ms` — 현행 `140ms`」 |
| **1px** | `POINTER_STATIONARY_TOLERANCE_PX` | use-hover-intent-controller.ts:62 | 「포인터가 안 움직였다」 허용 오차 | [S] req-landing.md:549 §8.2 · [C] docstring 실측 `218.66` vs `218` |
| **280ms** | `CORE_MOTION_DURATION_MS` | hover-intent.ts:3 | (이 훅은 **쓰지 않음**) — `use-desktop-motion-controller.ts:4`가 쓴다 | [S] req-landing.md:570 §8.3 |

### C-2. 타이머·토큰 (전역 단일 쌍)

**타이머는 전체 그리드에 하나뿐이다** — `hoverTimerRef`(:72) + `hoverIntentTokenRef`(:73). [S] req-landing.md:535 §8.2 「hover intent 스케줄러는 전역 단일 timer + intent token으로 관리한다」를 그대로 구현했다. `scheduleHoverIntent`(:223-243)가 매번 ⑴ 기존 타이머 clear(:230) ⑵ 토큰 +1(:231-232) ⑶ 새 `setTimeout` 등록(:234-240)을 하고, 콜백 첫 줄에서 `hoverIntentTokenRef.current !== nextToken.token`이면 no-op(:235-237)한다 — [S] req-landing.md:537 「타이머 실행 직전 재검증, 불일치 시 no-op」.

**scroll hold는 타이머가 아니라 리스너다.** `beginScrollHold`(:159-195)는 passive `scroll` 리스너를 **hold가 사는 동안만** 달고, 해제 함수를 `detachScrollHoldListenerRef`에 보관한다(:190-192). 즉 이 훅의 시간 개념은 「160ms/140ms 타이머」와 「무기한 hold」 두 종류다.

### C-3. 취소·중단 조건 전수 (11개)

**확장 intent 취소 (5개):**
⑴ 새 `scheduleHoverIntent` 호출 — 이전 타이머 clear + 토큰 무효화 (:230-232).
⑵ 발화 시점 토큰 불일치 → no-op (:235-237).
⑶ 발화 시점 `pointerWithinCardVariantRef.current !== card.variant` → no-op (:467-469).
⑷ `cancelPendingHoverIntent()` — 토큰 +1 **하고** 타이머 clear + 소유권 null + hold 해제 (:111-116). 호출처: 키보드 포커스(use-landing-interaction-controller.ts:353) · 데스크톱 close(:319).
⑸ `clearHoverTimer()` — 타이머 clear + 소유권 null + hold 해제, **토큰은 올리지 않는다** (:105-109). 호출처: blog 진입(:412) · unavailable 진입(:449) · collapse(use-landing-interaction-controller.ts:284) · 전환 시작(:490) · 모바일 런타임 리셋(use-mobile-card-lifecycle.ts:91).

> **⑷와 ⑸의 비대칭은 의도가 문서화돼 있지 않다.** 둘 다 타이머를 지우므로 예약된 콜백은 어차피 못 뛰지만, 토큰을 올리는지 여부가 다르다. 오늘은 관측 가능한 차이가 없어 보이나 **확정하지 못했다 — 미확인.** 리팩터에서 둘을 합칠 때 반드시 재확인할 것.

**축소 intent 중단 (3개):** 발화 시점에 ⑹ `pointerWithinCardVariantRef.current !== null`(다른 카드 안에 있음) 또는 ⑺ `isPointerInsideCardBoundary(cardVariant)`(경계 안으로 돌아옴)이면 그대로 중단 (:261-263) — [S] req-landing.md:529 §8.2 「collapse 결정은 실행 시점의 최신 경계 판정을 기준으로」. ⑻ `scrollHoldEligible && pointerMoveSeq가 예약 때와 같음` → 닫지 않고 **hold로 전환** (:270-273) — [S] req-landing.md:545 §8.2.

**scroll hold 해제 (3개, 조항이 ⑴⑵⑶으로 번호까지 매겨 둔 것):**
⑴ 다음 진짜 `pointermove` — hold 해제 후 재판정, 경계 밖이면 평소 유예로 collapse 재예약 (:326-340) — [S] req-landing.md:546.
⑵ hold된 카드가 **뷰포트를 완전히** 벗어남 — rect 교차로 판정, 즉시 collapse (:164-186) — [S] req-landing.md:547. 주석(:149-158)이 `IntersectionObserver`를 쓰지 않은 이유까지 적어 뒀다(jsdom 미제공 + 저장소 선례 없음).
⑶ 다른 이유로 접히거나 hover 모드를 벗어남 — effect (:367-380) + 언마운트 (:382) — [S] req-landing.md:550.
추가로 `onMouseEnter`가 **가장 먼저** `releaseScrollHold()`를 부른다(:403) — handoff가 재판정보다 우선하도록(주석 :400-402), [S] req-landing.md:533 「두 경로가 각각 collapse를 예약해 이중 전이를 만드는 것을 금지」.

### C-4. 진입 경로 4갈래 (`onMouseEnter` :389-481)

⑴ **위조 진입** — `isPointerStationaryBoundaryEvent`가 참이면 즉시 return, 소유권도 안 바꾼다 (:396-398).
⑵ **blog 카드** — 확장 대상이 아니므로 열린 카드를 `'collapse'` 이유로 닫고 끝 (:405-421). 주석이 `0ms` 금지 근거를 [S] req-landing.md:575 §8.3에 명시적으로 건다.
⑶ **handoff** — `isEnterableHandoffCandidate`(hover-intent.ts:22-36: enterable && 이전 확장 있음 && 다른 카드)이면 **지연 없이** COLLAPSE→EXPAND 연속 dispatch (:430-446) — [S] req-landing.md:538 「handoff 경로는 지연 없이 즉시 전환」.
⑷ **unavailable** — 열린 카드만 닫고 자신은 안 열림 (:448-460) — [S] req-landing.md:530 「unavailable 진입은 handoff로 간주하지 않는다」.
⑸ **정상** — 160ms 예약 (:462-480).

### C-5. 경계(boundary)의 정의

`resolveCardBoundaryElement`(interaction-dom.ts:141-158)가 `[data-slot="expandedBody"]` → `[data-testid="landing-grid-card-trigger"]` → 카드 루트 순으로 fallback한다. **확장되면 경계가 자동으로 커진다** — [S] req-landing.md:527 §8.2 「활성 Expanded 카드의 경계는 확장된 카드의 실제 상호작용 영역 전체로 정의한다」의 구현.

### C-6. 결정 7 관점의 판정 — 「보존 / 교체 / 결정 필요」

이 파일은 **터치에서 전부 죽는 코드다.** 근거: H1·H3·H4 세 가드가 `interactionMode !== 'hover'`에서 즉시 return하므로, 터치 기기에서 527행 중 실행되는 것은 `recordPointerInput`의 앞 16행(:301-316)뿐이다. 브리프의 실측 「랜딩 그리드에 `touch-action` 선언과 터치 이벤트 리스너가 하나도 없다」와 정확히 맞물린다 — **터치 인터랙션은 여기서 설계된 적이 없다.**

| 항목 | 권고 | 근거 |
|:--|:--|:--|
| 160ms dwell 확장 | **보존 권고** | [P] hover intent는 마우스 UI의 확립된 관용. [S] 조정값 계층이라 값 조정에 승인 불필요(req-landing.md:546) |
| 140ms 이탈 유예 | **보존 권고** | 동상 |
| 스크롤 hold 3종 해제 규칙 | **결정 필요** | 이 문서에서 가장 정교한 부분이고 실측 근거가 두껍다(:197-210 docstring). 그러나 **마우스 전용**이며, 모바일 우선 재설계에서 데스크톱이 부차가 되면 유지 비용 대비 가치가 역전될 수 있다. 값이 아니라 **존치 여부**를 사용자가 정해야 한다 |
| 1px 위조 진입 차단 | **교체 권고** | 브라우저 좌표 반올림 차이라는 **구현 아티팩트에 대한 방어**지 UX 결정이 아니다. 터치 생명주기에서는 의미가 소멸한다 |
| 유실 leave 복구 (:282-298) | **교체 권고** | 카드 확장 시 썸네일 unmount로 `mouseout`이 유실되는 **DOM 구조 문제의 우회**다. 원인(확장 중 노드 제거)을 고치면 이 복구 자체가 불필요해진다 |
| 전역 단일 타이머 + 토큰 | **보존 권고** | [S] req-landing.md:535은 계약(불변식) 계층 — 개정에 사용자 승인 필요. 구조 자체는 터치 생명주기에도 그대로 유효하다 |

---

## D. `use-mobile-card-lifecycle.ts`의 생명주기 상태 기계

### D-1. 상태 집합

**주 상태(phase) 4개** — `NORMAL` · `OPENING` · `OPEN` · `CLOSING` (mobile-lifecycle.ts:3). [S] req-landing.md:622 §8.5 「`OPENING -> OPEN -> CLOSING -> NORMAL` 단방향으로 고정」.

**부가 필드 5개** (mobile-lifecycle.ts:13-20): `cardVariant` · `queuedClose`(boolean) · `snapshot`(5필드 기하) · `snapshotWriteCount` · `restoreReady`(boolean).

**직교하는 두 번째 상태 기계**: `mobileTransientShellState`(use-mobile-transient-shell.ts:6-16) — `mode: 'NONE'|'OPENING'|'CLOSING'` + cardVariant + snapshot. **phase와 동기화되지 않는다** — 별도의 `useState`이고 타이머로 따로 꺼진다(use-mobile-card-lifecycle.ts:123, :252).

**세 번째**: `mobileRestoreReadyVariant`(use-mobile-restore-polling.ts:35) — 400ms 마커(`MOBILE_RESTORE_READY_MARKER_MS` :9).

### D-2. 전이표 (리듀서 전수)

| 이벤트 | 전제 조건 | 결과 | file:line | 조항 |
|:--|:--|:--|:--|:--|
| `OPEN_START` | `phase === 'CLOSING'` | **무시** (state 반환) | :47-49 | [S] req-landing.md:643 「CLOSING 중 추가 open/close 입력은 무시」 |
| `OPEN_START` | `phase !== 'NORMAL'` && 같은 카드 && snapshot 있음 | `OPENING`, `queuedClose=false`, `restoreReady=false`, **snapshot 보존** | :51-58 | [S] req-landing.md:634 「복원 기준 snapshot은 시퀀스 중 교체를 금지하며 시퀀스당 1개만 생성」 |
| `OPEN_START` | 그 외 | 새 `OPENING` + 새 snapshot + `snapshotWriteCount=1` | :60-67 | 동상 |
| `OPEN_SETTLED` | `phase !== 'OPENING'` | 무시 | :69-71 | |
| `OPEN_SETTLED` | `queuedClose === true` | → `CLOSING`, `restoreReady=false` | :73-79 | [S] req-landing.md:643 「OPENING 중 유효 닫기 입력은 OPEN settled 직후 1회 queue-close로 처리」 |
| `OPEN_SETTLED` | 그 외 | → `OPEN` | :81-84 | |
| `QUEUE_CLOSE` | `phase === 'OPENING'` | `queuedClose = true` (phase 유지) | :86-91 | [S] req-landing.md:624 「OPENING이 시작된 동일 시퀀스에서 즉시 CLOSING으로 역전 금지」 |
| `QUEUE_CLOSE` | `phase === 'OPEN'` | → `CLOSING` **직행** | :93-101 | |
| `QUEUE_CLOSE` | 그 외 | 무시 | :93-95 | |
| `QUEUE_CLOSE_CANCEL` | `phase === 'OPENING'` && `queuedClose` | `queuedClose = false` | :102-110 | backdrop 10px 스크롤 판정 취소 경로 |
| `CLOSE_START` | `phase !== 'OPEN'` | 무시 | :112-114 | |
| `CLOSE_START` | `phase === 'OPEN'` | → `CLOSING`, `restoreReady=false` | :116-120 | |
| `RESTORE_READY` | `phase !== 'CLOSING'` | 무시 | :121-123 | |
| `RESTORE_READY` | `phase === 'CLOSING'` | `restoreReady = true` | :125-129 | [S] req-landing.md:635 「`NORMAL` terminal 확정은 pre-open snapshot 높이로의 복귀 완료 이후에만」 |
| `CLOSE_SETTLED` | `phase !== 'CLOSING' \|\| !restoreReady` | 무시 | :130-133 | 동상 |
| `CLOSE_SETTLED` | 통과 | **fallthrough → RESET** = 초기 상태 | :130-135 | |
| `RESET` | 무조건 | 초기 상태 | :134-135 | |

> **`CLOSE_SETTLED`에는 `return`도 `break`도 없다** (mobile-lifecycle.ts:130-135). 가드를 통과하면 `case 'RESET'`으로 **의도적 fallthrough**한다. 동작은 맞지만 결과적으로 **`CLOSE_SETTLED`와 `RESET`이 구별 불가능한 동일 종점**이라서, 「정상 종료」와 「강제 리셋」을 상태로 구분할 방법이 없다. 리팩터에서 둘을 가르고 싶다면 여기가 시작점이다.

### D-3. 구동자(누가 무엇을 언제 쏘는가)

**`beginMobileOpen(cardVariant, syncInteraction=true)`** (:98-129) — ⑴ 스냅샷 캡처(`captureMobileSnapshot`, mobile-card-lifecycle-dom.ts:3-28: 카드 rect 4값 + title top) ⑵ 타이머 3종 정리 ⑶ restore-ready 리셋 ⑷ transient shell `'OPENING'` 시작 ⑸ `OPEN_START` ⑹ `syncInteraction`이면 ②에 `CARD_EXPAND` ⑺ **280ms 타이머** → `OPEN_SETTLED` + transient shell 리셋. 호출처: 탭(use-landing-interaction-controller.ts:580) · 키보드 훅(:511) · 입양 효과(:222, `syncInteraction=false`).

**`beginMobileClose()`** (:131-157) — `OPENING`이면 `QUEUE_CLOSE`만 쏘고 즉시 return(:132-135); `OPEN`이 아니면 return(:137-139); `OPEN`이면 open 타이머 해제 → 닫힘 스냅샷 재캡처 → transient shell `'CLOSING'` → ②에 `CARD_COLLAPSE` → `CLOSE_START`. 호출처: X 버튼(use-landing-interaction-controller.ts:536-542) · backdrop(use-mobile-backdrop-gesture.ts:76, :95).

**CLOSING 효과** (:230-268) — `phase === 'CLOSING'`에 진입하면 **280ms 타이머** 후 `settleMobileCloseAfterRestore`로 넘긴다. 그것은 rAF 폴링(use-mobile-restore-polling.ts:79-104)으로 `isMobileSnapshotRestoreSettled`(mobile-card-lifecycle-dom.ts:30-48: 높이 오차 ≤1px **그리고** title offset 오차 ≤1px)를 검사하며, **최대 30프레임**(`MOBILE_RESTORE_POLLING_MAX_ATTEMPTS` :10) 뒤에는 조건 불성립이어도 포기하고 진행한다.

> **30프레임 = 60Hz에서 약 500ms, 120Hz에서 약 250ms.** 폴링 상한이 **프레임 수**로 잡혀 있어 기기 주사율에 따라 실제 대기 시간이 2배 차이 난다 — [S] req-landing.md:635 「`NORMAL` terminal 확정은 복귀 완료 이후에만」이 시간 기반이 아니라 상태 기반임을 요구하므로(req-landing.md:443 §7.4 「`settled`는 시간 기반이 아니라 상태 기반으로 정의한다」) 이 상한 자체는 안전망이지만, **상한에 걸렸을 때 `0px` 오차 계약이 깨진 채로 NORMAL이 확정된다.** 실제로 상한에 도달하는지는 **미확인**(측정 안 함).

**입양 효과** (:211-228) — 모바일 && ②가 확장 && phase가 NORMAL이면 rAF 한 프레임 뒤 `beginMobileOpen(variant, false)`.

**리사이즈 강제 종료 효과** (:193-203) — M3 참조.

**스크롤 락** (:191 → use-mobile-scroll-lock.ts:9-27) — `OPENING|CLOSING`에서만 `body.style.overflow='hidden'` + `touchAction='none'`, 이전 값을 저장해 복원. [S] req-landing.md:641 §8.5 준수. **[W] 2.5.7 Dragging Movements·[W] 1.4.10 Reflow 관점에서 `touch-action: none`은 그 구간의 모든 제스처를 죽인다** — 280ms 동안이라 현재는 문제되지 않지만, D-3의 폴링 상한 때문에 CLOSING이 500ms를 넘을 수 있다는 점과 함께 봐야 한다.

**backdrop 제스처** (use-mobile-backdrop-gesture.ts) — `pointerdown`에서 `phase==='OPENING'`이면 즉시 `beginMobileClose()`(=큐), `phase==='OPEN'`이면 `closeOnPointerUp=true`만 무장(:63-78). `pointermove`가 **10px**(`MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX` :7)를 넘으면 취소(:79-90). `pointerup`에서 무장돼 있으면 닫는다(:91-97). [S] req-landing.md:651 「Mobile tap 판정은 보수적으로 처리하며, 미세 이동이 감지된 입력은 scroll gesture로 분류」.

### D-4. 열린 카드를 다시 탭하면 어떻게 되는가

**아무 일도 일어나지 않는다.** `handleCardClick`(use-landing-interaction-controller.ts:544-607)에서 자기 카드가 `OPEN`이면 `mobileInteractionLocked`가 거짓이라 차단은 통과하지만(:553-557), `isMobileViewport` 가지의 조건이 `phase === 'NORMAL'`이므로(:579) `beginMobileOpen`이 불리지 않고 그대로 return한다(:582). 브리프의 터치 태블릿 실측 「재탭으로 닫기 불가」가 **모바일에서도 같은 이유로 성립한다** — 태블릿만의 문제가 아니다. [S] req-landing.md:632 「닫기 경로는 `X 버튼` 또는 `카드 외부(backdrop) 탭`만 허용한다」가 이것을 명시적으로 규정하고 있으므로 **계약 위반은 아니고, 개정 후보다** — [P] iOS HIG·Material 3의 확장 카드/바텀시트 관용은 재탭·스와이프다운·드래그핸들을 기대한다.

---

## E. 입력 방식(hover 유무)을 실제로 읽는 지점 전수

**세 파일 안에서 `matchMedia` 호출은 정확히 2개, 그중 입력 방식은 1개다.**

| # | file:line | 쿼리 | 용도 | 비고 |
|:--|:--|:--|:--|:--|
| E1 | use-landing-interaction-controller.ts:207 | `(hover: hover) and (pointer: fine)` | `hoverCapability` | **3파일 유일의 입력 방식 프로브.** `useLayoutEffect`, `change` 리스너 등록·해제 완비(:214-218) |
| E2 | use-landing-interaction-controller.ts:226 | `(prefers-reduced-motion: reduce)` | `REDUCED_MOTION` 페이지 상태 | 입력 방식 아님 |

**저장소 전체로 넓히면 입력 방식 정의 지점은 3곳이고, 서로를 모른다.**

| # | file:line | 형태 | 소비자 | 결정 2 영향 |
|:--|:--|:--|:--|:--|
| E1 | use-landing-interaction-controller.ts:207 | JS `matchMedia` | 랜딩 카드 인터랙션 | 정본이 되어야 할 후보 |
| E3 | src/features/gnb/hooks/use-gnb-capability.ts:17 | JS `matchMedia` (+ `resize`로 `viewportWidth`도 함께 동기화, :20-21) | GNB | **E1과 완전히 동일한 쿼리의 독립 사본.** 두 훅이 각자 리스너를 달아 같은 것을 두 번 계산한다 |
| E4 | src/features/landing/grid/landing-grid-card.module.css:92 | CSS `@media` | `.root.blogCard:hover` 시각 | JS가 아니므로 JS 모드와 **구조적으로 동기화될 수 없다**. 결정 2가 JS 판정을 바꿔도 이 CSS는 그대로 hover를 적용한다 |

**`interactionMode`를 조건으로 **읽는** 지점 (3파일 내 4곳):** use-hover-intent-controller.ts:318 · :374 · :390 · :483. **그게 전부다.**

**나머지 `interactionMode` 출현 30여 회는 전부 dispatch payload 전달이거나 의존성 배열이다.** 실제 분기는 리듀서에서 일어난다 — `src/features/landing/model/interaction-state.ts`의 `event.interactionMode === 'hover'` / `!== 'hover'` 비교가 :254(MODE_SYNC) · :296(CARD_FOCUS) · :307 · :329 · :350 · :376 · :409 총 7곳. **결정 2는 3파일뿐 아니라 이 리듀서 7곳도 재검토 대상에 넣어야 한다.**

**`isMobileViewport`를 넘겨받는 하위 훅 (3파일 밖, 같은 플래그의 확산):** `use-desktop-motion-controller.ts:125` · `use-keyboard-handoff.ts:74, :81`(→ `useLandingKeyboardEntry`, `useCardKeyboardHandler`) · `use-mobile-backdrop-gesture.ts:61-62, :64` · `landing-grid-card.tsx:970`(자체 재계산 `viewportTier === 'mobile'`). **`landing-grid-card.tsx:970`은 훅에서 받지 않고 `viewportTier` prop에서 스스로 다시 파생한다** — 같은 판정의 **두 번째 독립 계산**이며, 결정 2에서 반드시 함께 고쳐야 할 지점이다.

---

## F. 재배선 위험 — 우선순위 요약

| 순위 | 위험 | 지점 | 왜 위험한가 |
|:--:|:--|:--|:--|
| 1 | **`isMobileViewport`가 두 가지를 동시에 뜻한다** | use-landing-interaction-controller.ts:157 | 「모바일 레이아웃인가」와 「터치 생명주기인가」가 한 불리언에 묶여 있다. 결정 2는 이 둘을 갈라야 하는데, 26개 소비 지점 중 **어느 쪽 의미로 쓰는지 코드만 봐서는 판정 불가한 것**이 C21~C24처럼 여럿이다 |
| 2 | **터치 + 키보드 조합이 정의돼 있지 않다** | C13(:354-358) · C15(:431) · C16(:455) | 모바일이면 Escape·blur·키보드 확장이 전부 죽는다. 결정 2로 외장 키보드 달린 아이패드가 「터치 생명주기」로 분류되면 **키보드로 카드를 닫을 방법이 사라진다** — [W] 2.1.2 No Keyboard Trap 위반 위험 |
| 3 | **리사이즈 강제 종료를 입력 변경에 그대로 옮기면 오발화한다** | M3(:193-203) | 마우스 연결/해제가 `matchMedia` change를 쏜다. 폭 변경(드물고 의도적)과 입력 변경(우발적)은 다른 트리거로 분리해야 한다 |
| 4 | **body 스크롤 락에 뷰포트 게이트가 없다** | M6(:191, use-mobile-scroll-lock.ts:5-7) | phase만 보므로, 생명주기가 태블릿/데스크톱으로 확장되는 순간 큰 화면에서 `touch-action: none`이 걸린다 |
| 5 | **같은 3중 조건이 두 곳에 복제돼 있다** | C18(:553-557) · C25(:657-660) | 한쪽만 고치면 클릭 차단과 `aria-disabled`/`tabIndex`가 갈라진다 — [S] req-landing.md:697-712 §9.2 위반이 조용히 발생 |
| 6 | **입력 방식 정의가 3곳(JS 2 + CSS 1)에 흩어져 있다** | E1 · E3 · E4 | CSS 사본(E4)은 JS와 동기화 불가. 결정 2 후에도 blog 카드는 터치 태블릿에서 hover 시각을 계속 적용한다 |
| 7 | **rAF 폴링 상한이 프레임 수 기반** | use-mobile-restore-polling.ts:10, :88-94 | 주사율에 따라 대기 시간 2배 차이. 상한 도달 시 `0px` 계약이 깨진 채 NORMAL 확정 |
| 8 | **③의 dispatch가 세 경로로 갈라짐** | use-mobile-card-lifecycle.ts:95, :106, :152, :165 + use-keyboard-handoff 경유 | 단일 소유자가 없어 전이 순서가 호출 순서에 의존한다 |

---

## G. 미확인 (확인하지 못한 것)

- `desktop-shell-phase.ts`의 `resolveDesktopMotionRole` / `resolveDesktopShellPhase` 내부 — C23·C24의 제어 대상을 파일 내부까지 확인하지 않았다.
- `use-keyboard-handoff.ts`가 위임하는 `useCardKeyboardHandler` · `useLandingKeyboardEntry` · `useKeyboardModeTracker` 본문 — `isMobileViewport`가 그 안에서 몇 갈래로 더 갈라지는지 세지 않았다(3파일 범위 밖).
- `clearHoverTimer`와 `cancelPendingHoverIntent`의 **토큰 처리 비대칭**(:105-109 vs :111-116)이 관측 가능한 동작 차이를 만드는지 — 코드상 차이는 확인했으나 결과 차이를 실증하지 못했다.
- 입양 효과(use-mobile-card-lifecycle.ts:211-228)의 rAF 1프레임 지연이 [S] req-landing.md:626 §8.5 y-anchor `0px` 계약과 실제로 충돌하는지 — 측정하지 않았다.
- `MOBILE_RESTORE_POLLING_MAX_ATTEMPTS=30` 상한에 실제 기기에서 도달하는지 — 측정하지 않았다.
- 언마운트 정리 4지점(오케스트레이터 :271-281 · 모바일 :205-209 · hover :382 · 폴링 :106-111)의 실행 순서 보장 여부.
- E2E(`tests/e2e/**`)에서 이 3파일의 동작이 어디까지 고정돼 있는지 — 단위 테스트 4개 파일(`landing-hover-intent` 62행 · `landing-interaction-controller-handlers` 1260행 · `landing-mobile-lifecycle` 355행 · `landing-mobile-backdrop-gesture` 156행)의 **제목만** 훑었고 본문을 전수로 읽지 않았다.
