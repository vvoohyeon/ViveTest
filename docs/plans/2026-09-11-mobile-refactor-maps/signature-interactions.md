# ViveTest 서명 인터랙션 전수 목록

이 문서는 사용자 결정 7번(「보존 권고 / 교체 권고 / 결정 필요」 3분류)의 **재료**다. 분류 추천은 각 항목의 마지막 문단에 있고, 최종 결정은 사용자가 한다. 모든 숫자와 인용에 `file:line` 을 붙였고, 확인하지 못한 것은 「미확인」으로 적었다. 읽은 저장소는 `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (HEAD 위에 착수 마커 커밋 `7616211` 하나)이며, 모든 경로는 그 기준의 저장소 상대경로다.

## 0. 이 목록을 읽는 법 — 「모바일에 존재하는가」의 세 가지 값

모바일 존재 여부는 세 가지로 갈리며, 그 구분이 이 문서의 가장 중요한 산출물이다. **없음**은 코드가 `isMobileViewport` 로 그 경로를 차단해 모바일 사용자가 그 인터랙션을 아예 경험하지 못한다는 뜻이다. **별도 구현**은 같은 목적의 다른 코드가 모바일에 있다는 뜻이고, 그 둘이 각각 별개의 상태 기계·모션·복원 규칙을 갖는다. **공통**은 한 벌의 코드가 두 층을 다 처리한다는 뜻이다.

핵심 기준선 하나를 먼저 고정한다. `isMobileViewport` 는 **폭만** 본다 — `viewportTier === 'mobile'`(`src/features/landing/grid/use-landing-interaction-controller.ts:157`)이고 그 tier 는 `resolveLandingViewportTier` 가 `viewportWidth <= 767` 로 판정한다(`src/features/landing/grid/layout-plan.ts:63-73`). 반면 `interactionMode` 는 폭과 입력 방식을 함께 본다 — `width < 768` 이면 무조건 `tap`, 그 위에서는 `(hover: hover) and (pointer: fine)` 결과로 갈린다(`use-landing-interaction-controller.ts:71-77`, `:207`). **이 두 축이 어긋나는 구간이 터치 태블릿이다**: 900px 터치 기기는 `interactionMode='tap'` 이면서 `isMobileViewport=false` 라, hover 경로는 꺼지는데 모바일 생명주기도 켜지지 않아 아래 4·13·14번이 모두 부재한 상태로 데스크톱 오버레이만 남는다. 사전 실측(프로브 900×1200: `tier=tablet · mode=tap · layer=desktop-overlay` · 닫기 X 0개 · backdrop 0개)이 이 코드 구조의 직접적 귀결이다.

식별자 `isMobileViewport` 의 원문 출현은 11개 파일에 **105회**다(`grep -ro isMobileViewport src/features/landing`): `landing-grid-card.tsx` 31 · `use-landing-interaction-controller.ts` 22 · `use-hover-intent-controller.ts` 9 · `use-card-keyboard-handler.ts` 8 · `use-mobile-card-lifecycle.ts` 7 · `use-mobile-backdrop-gesture.ts` 5 · `desktop-shell-phase.ts` 5 · `use-landing-keyboard-entry.ts` 4 · `use-desktop-motion-controller.ts` 4 · `use-keyboard-handoff.ts` 4 · `interaction-state.ts` 2. 과제문이 준 「71개」와 수치가 다른 것은 세는 대상이 달라서다(과제문은 「isMobileViewport 계열 분기」, 여기는 식별자 원문 출현). 어느 쪽이 맞는지는 판정하지 않는다 — 두 수치 모두 같은 결론을 가리킨다.

---

## 1. Hover intent — 지연 확장·지연 축소와 「스크롤이 위조한 hover」 방어

**무엇을 하는가.** 마우스를 카드 위에 올리고 160ms 가만히 있으면 카드가 펼쳐진다. 카드를 벗어나면 140ms 뒤에 접힌다. 그런데 포인터를 그대로 둔 채 **휠만 굴려서** 카드가 포인터 밑을 지나가면 그때는 열리지도 닫히지도 않는다 — 「스크롤한다는 것은 곧 그 콘텐츠를 더 보겠다는 뜻」이라는 해석이 코드에 박혀 있다(`docs/req-landing.md:545`). 스크롤로 카드가 화면 밖으로 완전히 나가 버리면 그때 비로소 접힌다.

**코드 규모.** `src/features/landing/grid/use-hover-intent-controller.ts` 527행 전체 + 상수·토큰 `src/features/landing/grid/hover-intent.ts:1-2`(`DESKTOP_EXPAND_DELAY_MS = 160` · `DESKTOP_COLLAPSE_DELAY_MS = 140`) + 호출부 전역 리스너 `use-landing-interaction-controller.ts:516-534`. 단위 테스트는 `tests/unit/landing-hover-intent.test.ts` 62행뿐이고, 실제 검증 무게는 `tests/unit/landing-interaction-controller-handlers.test.ts` 1,260행이 진다.

**계약 근거.** `docs/req-landing.md §8.2`(521-564행). 이 절은 스스로를 **계약(불변식)**과 **조정값** 두 층으로 나눈다(`:522`). 불변식은 「포인터 이동으로 경계를 완전히 벗어나면 collapse」(`:528`)와 「collapse 결정은 실행 시점의 최신 경계 판정」(`:529`)이고, 160/140ms 와 스크롤 유지 규칙 전체는 **조정값**이다(`:542-550`). 조정값은 「구현자가 UX 판단으로 바꾸되 바꾸는 즉시 `docs/decision-register.md` 에 등재한다」(`:522`). 즉 이 항목은 계약상 이미 개정 여지가 열려 있다.

**표준 패턴으로 대체 가능한가.** 지연 확장·지연 축소 자체는 표준이다 — hover intent(Material 3 의 tooltip/menu dwell, macOS 메뉴의 triangle heuristic 이 같은 계열). 대체 불가능한 것은 **스크롤 위조 방어** 쪽이다. 이 코드는 `mouseout/mouseover` 가 좌표 변화 없이 도착하는지를 재서 위조를 판정하는데(`use-hover-intent-controller.ts:211-221`, 허용 오차 1px `:62`), 이것은 「스크롤 중에는 hover 를 잠근다」는 훨씬 단순한 표준 패턴(스크롤 시작 시 `pointer-events: none` 을 그리드에 걸고 스크롤 종료 후 해제)으로 같은 사용자 체감을 만들 수 있다. 저장소가 그 단순한 쪽을 고르지 않은 이유는 문서에 없다 — 미확인.

**대체하면 잃는 것.** 잃는 것은 제품 개성이 아니라 **정밀도**다. 스크롤 도중에도 이미 열린 카드가 계속 열려 있고 답변 버튼이 계속 눌리는 성질은 단순한 잠금 방식에서 사라진다. 접근성 손실은 없다 — 이 경로는 전부 포인터 전용이고 키보드 경로는 §7.6 override 가 따로 소유한다(아래 2번). 성능은 오히려 개선된다: 현재는 window 에 `pointermove`·`mousedown` 전역 리스너 두 개가 랜딩 내내 상주한다(`use-landing-interaction-controller.ts:527-528`).

**모바일에 존재하는가 — 없음.** 두 핸들러가 첫 줄에서 `interactionMode !== 'hover' || isMobileViewport` 로 즉시 반환한다(`use-hover-intent-controller.ts:390-392`, `:483-485`). `recordPointerInput` 도 같은 조건 뒤로는 아무 일도 하지 않는다(`:318-320`). 모바일 사용자는 이 인터랙션의 **어느 부분도** 경험하지 못한다. 터치 태블릿(768px 이상 + hover 없음)도 마찬가지다 — `interactionMode='tap'` 이므로 같은 줄에서 걸린다.

**추천: 결정 필요.** 「보존」으로 기울 근거가 하나 있다 — 이 코드의 주석들은 실측 로그를 그대로 담고 있어(`:200-209` 의 `scrollY 0 → 372` 관찰, `:288-297` 의 이벤트 순서 실측) 그 함정들이 실재함을 증명한다. 지우면 같은 함정을 다시 밟는다. 반대로 「교체」로 기울 근거도 같은 무게다 — 527행 전체가 **모바일 사용자에게 0의 가치**이고, 사용자 결정 2번(터치 태블릿을 입력 방식으로 통일)이 적용되면 이 코드가 커버하는 기기 집합은 더 줄어든다. 결정을 사용자에게 올리되, 그 결정의 형태는 「지울까 말까」가 아니라 **「스크롤 중 hover 잠금이라는 단순 패턴이 저 실측 함정 5종을 전부 덮는가」를 프로토타입으로 먼저 판정하고 그 결과로 정한다**여야 한다.

---

## 2. 키보드 순차 확장 override — 포커스가 닿는 즉시 펼쳐지는 카드

**무엇을 하는가.** Tab 으로 테스트 카드에 포커스가 닿으면 **지연 없이 즉시** 카드가 펼쳐진다. 그 다음 Tab 은 카드 안의 A/B 선택지로 들어가고, 선택지를 다 돌면 다음 카드로 넘어가면서 앞 카드가 닫힌다. Blog 카드는 포커스만 받고 절대 펼쳐지지 않는다. 사용 불가 카드는 양방향 모두 건너뛴다.

**코드 규모.** `src/features/landing/grid/use-card-keyboard-handler.ts` 313행 + 조립부 `use-keyboard-handoff.ts` 95행 + 모드 추적 `use-keyboard-mode-tracker.ts` 57행 + 진입/복귀 `use-landing-keyboard-entry.ts` 65행 + 컨트롤러 쪽 `focusCardFromKeyboard`/`closeDesktopCard`(`use-landing-interaction-controller.ts:301-426`, 126행). 합계 약 656행.

**계약 근거.** `docs/req-landing.md §7.6`(471-491행). 제목 자체가 「Keyboard Sequential Expansion Override (Desktop/Tablet)」이고 둘째 줄이 「**Mobile lifecycle은 본 override 대상이 아니다**」(`:472`)라고 못박는다. 「본 규칙은 기존 키보드 관련 카드 전이 규칙을 override한다」(`:483`)는 마지막 줄이 이 절의 지위를 말한다.

**표준 패턴으로 대체 가능한가.** 「포커스가 닿으면 즉시 펼친다」는 ARIA APG 의 disclosure/accordion 패턴과 정면으로 어긋난다 — 표준은 포커스는 포커스이고 펼침은 `Enter`/`Space` 활성화다. 실제로 이 저장소도 `Enter`/`Space` 를 구현해 두었지만 그것을 **idempotent no-op** 으로 만들었다(§7.6 `:477`: 「Test trigger의 `Enter/Space`는 동일 Test에 대한 idempotent `CARD_EXPAND`」, 구현은 `use-card-keyboard-handler.ts:280-287`). 즉 활성화 키가 존재하되 아무것도 바꾸지 않는다. 표준 대체안은 명확하다: 포커스는 포커스로 두고, `Enter`/`Space` 가 펼침을 소유하며, `Escape` 가 접는다.

**대체하면 잃는 것.** **잃는 것보다 얻는 것이 크다고 볼 근거가 있다.** 현재 구조는 키보드 사용자가 Tab 을 한 번 누를 때마다 화면에서 카드 하나가 280ms 동안 커졌다가 다음 Tab 에 다시 접힌다 — 카드 6개를 지나가면 확장/축소 모션이 6번 재생된다. WCAG 2.2 는 이것을 직접 금지하지 않지만 **2.3.3 Animation from Interactions**(AAA)가 정확히 이 상황을 다루며, 저장소는 `prefers-reduced-motion` 을 존중하므로 AAA 의 조건부 면제를 받는다(`use-landing-interaction-controller.ts:221-248`). 잃는 것은 「키보드로도 마우스와 같은 리듬을 경험한다」는 설계 의도인데, 그 의도가 어느 문서에도 근거로 적혀 있지 않다 — 미확인.

**모바일에 존재하는가 — 부분 존재(별도 구현).** 세 갈래로 갈린다. ⑴ **즉시 확장은 없다**: `resolveKeyboardFocusDisposition` 이 `isMobileViewport` 면 무조건 `'preserve-mobile'` 을 돌려주고(`src/features/landing/model/interaction-state.ts:104-106`), 그 경로는 `CARD_FOCUS` 만 보내고 끝난다(`use-landing-interaction-controller.ts:360-368`). ⑵ **`Enter`/`Space` 는 모바일에서 진짜로 연다**: `use-card-keyboard-handler.ts:272-277` 이 `beginMobileOpen` 을 호출한다 — 데스크톱에서 no-op 인 키가 모바일에서는 유일한 키보드 열기 수단이다. ⑶ **카드 간 handoff 는 별도 경로다**: `beginMobileKeyboardHandoff`(`use-mobile-card-lifecycle.ts:159-189`)가 모바일 전용으로 존재하며 `use-card-keyboard-handler.ts` 안에서 5곳이 `isMobileViewport` 로 갈린다(`:130`, `:155`, `:204`, `:224`, `:272`).

**추천: 교체 권고.** 세 근거가 같은 방향을 가리킨다. 첫째, **표준과의 괴리가 근거 없이 존재한다** — §7.6 이 규칙을 적어 두었을 뿐 왜 표준을 벗어났는지는 어느 문서에도 없다. 둘째, **같은 파일 안에서 데스크톱과 모바일이 `Enter`/`Space` 의 의미를 정반대로 쓴다**(데스크톱 no-op · 모바일 열기) — 이것은 설계가 아니라 두 층을 따로 만든 흔적이고, 사용자 결정 2번으로 입력 방식 기준 통일이 들어오면 어느 쪽 의미를 쓸지 결정 자체가 불가능해진다. 셋째, 표준으로 되돌리면 `use-card-keyboard-handler.ts` 의 `isMobileViewport` 분기 8개가 전부 사라지고 두 층이 **하나의 규칙**으로 합쳐진다. 다만 「A/B 선택지 순회 후 다음 카드로」와 「unavailable 건너뛰기」는 표준 패턴 그 자체이므로 교체 대상이 아니라 **보존 대상**이며, 교체되는 것은 「포커스 = 확장」 한 줄이다.

---

## 3. 데스크톱 확장 모션 컨트롤러 — opening / steady / closing / handoff / cleanup-pending

**무엇을 하는가.** 카드가 펼쳐질 때 원래 카드는 투명한 껍데기로 남고 그 위에 확대된 오버레이가 그려진다. 다른 카드로 hover 를 옮기면 앞 카드는 **0ms 로 즉시** 사라지고 새 카드만 정상 모션으로 펼쳐진다. 닫을 때는 280ms 역모션을 재생한 뒤 두 프레임을 더 기다렸다가 정리한다 — 그 기다림이 없으면 접힌 카드가 한 프레임 깜빡인다(`src/features/landing/grid/use-desktop-motion-controller.ts:122`).

**코드 규모.** `use-desktop-motion-controller.ts` 204행 + 상태 해석기 `desktop-shell-phase.ts` 123행 + CSS 의 데스크톱 모션 블록 `src/features/landing/grid/landing-grid-card.module.css:211-301`(91행) + 그것이 쓰는 keyframes 6종(`:421-525`). 테스트는 `tests/unit/landing-desktop-shell-phase.test.ts` 184행.

**계약 근거.** `docs/req-landing.md §8.3 Core Motion Contract`(566-590행). §8.2 와 같이 계약/조정값 두 층이다(`:568`) — 축·곡선·단조성·복원·플리커 금지·`0ms` 허용 경로가 계약이고 280ms·40/100/160ms stagger 는 조정값이다(`:570`). `0ms` 는 「handoff의 직전 카드(source) 이탈 경로에서만 허용」(`:575`)이라고 좁게 묶여 있고, 상태 5종(`opening`/`steady`/`closing`/`cleanup-pending`/`handoff-*`)의 비상호작용 규칙은 `:581` 이 소유한다.

**표준 패턴으로 대체 가능한가.** 부분적으로만. `opening`/`steady`/`closing` 3상은 어떤 확장 UI 에도 있는 표준이다. 대체 불가능한 것은 **`cleanup-pending`** — 이것은 브라우저 페인트 타이밍의 결함을 막는 2중 `requestAnimationFrame` 지연(`use-desktop-motion-controller.ts:104-117`)이지 사용자에게 보이는 상태가 아니다. 표준 대체안은 CSS `transitionend`/`animationend` 이벤트로 같은 경계를 잡는 것이고, 그쪽이 프레임 수를 추측하지 않는다는 점에서 더 견고하다. 다만 저장소가 rAF 를 고른 이유는 문서에 없다 — 미확인.

**대체하면 잃는 것.** `handoff` 의 `0ms` source 종료를 잃으면 카드 A→B 이동에서 두 카드가 동시에 움직이는 구간이 생긴다. 그것은 §8.3 `:577`(「전이 역전으로 인한 플리커를 금지」)이 막으려던 바로 그 현상이므로, `0ms` 는 장식이 아니라 **다른 계약을 지키는 수단**이다. 성능은 대체 쪽이 유리하다: 현재 컨트롤러는 타이머 1개와 rAF 핸들 2개를 상주시킨다(`:42-44`).

**모바일에 존재하는가 — 없음.** 첫 `useLayoutEffect` 가 `isMobileViewport` 면 상태를 초기값으로 되돌리고 즉시 반환한다(`use-desktop-motion-controller.ts:125-130`). `resolveDesktopShellPhase` 도 같은 조건에서 `'idle'` 을 돌려준다(`desktop-shell-phase.ts:70-72`). 카드 렌더도 `!isMobileViewport && !isUnavailable && isTestCard` 일 때만 `DesktopExpandedShell` 을 그린다(`src/features/landing/grid/landing-grid-card.tsx:1209-1223`). 모바일은 대신 4번의 별도 기계를 쓴다.

**추천: 보존 권고(단, `cleanup-pending` 은 결정 필요).** `opening/steady/closing/handoff` 4상은 §8.3 의 계약층이 직접 요구하는 것이고 모바일에도 같은 개념이 필요하므로 — 4번의 `OPENING/OPEN/CLOSING` 이 바로 그것이다 — 이것은 **보존하되 두 층을 하나로 합치는 것**이 리팩터의 과제다. `cleanup-pending` 만 따로 떼어 결정 필요로 올린다: 이것은 계약이 요구하는 상태가 아니라 구현 결함(`:122` 의 「trigger briefly flashes back in」)을 막는 장치이고, `transitionend` 로 대체 가능한지가 프로토타입 한 번으로 판정된다.

---

## 4. 모바일 카드 확장 생명주기 — 스냅샷 · 유령 껍데기 · 복원 폴링

**무엇을 하는가.** 모바일에서 카드를 탭하면 그 카드가 **제자리에서** 화면 좌우 끝까지 펼쳐진다(`landing-grid-card.tsx:1042`: `rounded-none w-screen min-h-0 mx-[calc(50%-50vw)]`). 위쪽 y 좌표는 1px 도 움직이지 않고, 제목은 원래 있던 그 자리에 그대로 남는다. 뒤의 카드들은 반투명 막에 덮인다. X 버튼이나 막을 탭하면 접히고, 접힌 뒤의 카드 높이는 펼치기 직전과 **정확히 같아야** 한다.

**코드 규모.** 상태 기계 `src/features/landing/grid/mobile-lifecycle.ts` 139행 + 오케스트레이터 `use-mobile-card-lifecycle.ts` 287행 + 복원 폴링 `use-mobile-restore-polling.ts` 120행 + 임시 껍데기 `use-mobile-transient-shell.ts` 57행 + 스크롤 잠금 `use-mobile-scroll-lock.ts` 27행 + DOM 측정 `mobile-card-lifecycle-dom.ts` 48행 + backdrop 제스처 `use-mobile-backdrop-gesture.ts` 100행 = **778행**, 여기에 CSS 의 모바일 블록(`landing-grid-card.module.css:302-361` 60행 + reduced-motion 대응 `:387-419` 33행 + keyframes 3종 `:527-563`)과 카드 렌더 2블록(`landing-grid-card.tsx:1225-1290` 66행)이 붙는다. 테스트는 `tests/unit/landing-mobile-lifecycle.test.ts` 355행 · `landing-mobile-backdrop-gesture.test.ts` 156행 · `landing-mobile-scroll-lock.test.ts` 98행.

**계약 근거.** `docs/req-landing.md §8.5 Mobile Expanded (width<768)`(619-667행) — 34개 규칙과 13개 자동 검증 항목. 문서 전체에서 가장 조밀한 절이다. 핵심 불변식: 생명주기 단방향 고정(`:622`) · y-anchor 편차 0(`:626`) · 제목 기준선 `0px` 일치(`:630`) · 닫힘 후 높이 `0px` 복귀(`:634`) · 스냅샷은 **시퀀스당 1개**이고 교체 금지(`:634`) · `NORMAL` terminal 은 복귀 완료 이후에만(`:635`) · 닫기 경로는 **X 버튼 또는 backdrop 탭만**(`:632`) · OPENING/CLOSING 만 스크롤 잠금, OPEN 은 해제(`:641`) · 레이어 순서 `GNB > Expanded 카드 > backdrop > 기타 카드`(`:644`).

**구현이 계약과 어긋나는가 — 확인한 범위에서 어긋나지 않는다.** 스크롤 잠금은 `shouldLockMobilePageScroll` 이 `'OPENING' || 'CLOSING'` 만 참으로 돌려주므로 `:641` 과 일치한다(`use-mobile-scroll-lock.ts:5-7`). 스냅샷 1회 규칙은 리듀서가 `OPEN_START` 에서 같은 카드·기존 스냅샷이면 스냅샷을 **보존**하는 분기로 지킨다(`mobile-lifecycle.ts:51-58`). `CLOSE_SETTLED` 는 `restoreReady` 가 참일 때만 통과하며(`:131-133`), 그 `restoreReady` 는 실제 기하가 스냅샷과 1px 이내로 수렴했는지를 rAF 로 최대 30프레임 폴링해 정한다(`use-mobile-restore-polling.ts:10`, `:88-97`, 판정식은 `mobile-card-lifecycle-dom.ts:42-47`).

**주목할 구조 하나.** `mobile-lifecycle.ts:130-135` 의 `CLOSE_SETTLED` 는 `break`/`return` 없이 `RESET` 케이스로 **의도적으로 떨어진다**(fall-through). 동작은 올바르지만 — 가드를 통과한 `CLOSE_SETTLED` 는 초기 상태를 돌려준다 — 케이스 사이에 코드가 한 줄이라도 끼어드는 순간 조용히 깨지는 형태다. 리팩터에서 이 파일을 건드린다면 명시적 `return` 으로 바꾸는 것이 안전하다.

**표준 패턴으로 대체 가능한가.** 이 자리에 대한 2026년 모바일 웹의 표준 답은 **바텀시트**다(iOS HIG sheet · Material 3 bottom sheet). 바텀시트로 바꾸면 이 778행 중 사라지는 것이 많다: y-anchor 유지·제목 기준선 일치·높이 `0px` 복귀·복원 폴링·유령 껍데기는 전부 **「카드가 제자리에서 자란다」**는 전제에서만 필요한 것들이고, 시트는 카드와 분리된 표면이라 그 전제 자체가 없어진다. 반대로 시트가 새로 요구하는 것은 드래그 핸들·스냅 포인트·`Escape`/back 제스처 대응이며, 이 중 드래그는 **WCAG 2.2 의 2.5.7 Dragging Movements** 가 「드래그 아닌 단일 포인터 대안」을 요구하므로 X 버튼이 그대로 그 대안 역할을 한다.

**모바일에 존재하는가 — 이것이 모바일 그 자체다. 그러나 그 반대가 문제다.** 이 기계는 `width <= 767` 에서만 돈다. 터치 태블릿(768px 이상 + hover 없음)에서는 `isMobileViewport=false` 이므로 **X 버튼도 backdrop 도 렌더되지 않는다** — X 는 `showMobileExpandedBody`(= `isMobileExpanded` = `isMobileViewport && …`) 조건 안에 있고(`landing-grid-card.tsx:973`, `:979`, `:1236-1245`), backdrop 은 `mobileBackdropBindings.active`(= `isMobileViewport && phase !== 'NORMAL'`) 조건 안에 있다(`use-mobile-backdrop-gesture.ts:61`, `landing-catalog-grid.tsx:198`). 사전 실측의 「닫기 X 0개 · backdrop 0개 · 재탭으로 닫기 불가」가 바로 이 두 줄의 귀결이며, 그 기기에서 **확장된 카드를 닫을 명시적 수단이 하나도 없다**.

**모바일에서 확인된 접근성 결함 셋.** ⑴ **확장 상태가 보조기술에 알려지지 않는다** — `aria-expanded` 가 `!isMobileViewport` 조건 뒤에 있어 모바일에서는 `undefined` 다(`landing-grid-card.tsx:1198-1200`). WCAG **4.1.2 Name, Role, Value** 는 상태 변화의 프로그램적 노출을 요구한다. ⑵ **확장 중에도 다른 카드가 접근성 트리에 남는다** — `inert` 는 `keyboardModeBlocked` 로만 걸리는데(`:1146`) 그 값은 `hoverLock.enabled && keyboardMode` 를 요구하고(`interaction-state.ts:478-482`), tap 모드에서는 `MODE_SYNC` 가 `hoverLock.enabled` 를 false 로 만든다(`:253-265`). 즉 모바일에서 `inert` 는 **결코 걸리지 않는다**. 다른 카드는 `tabIndex=-1` 과 `pointer-events: none` 만 받으므로(`use-landing-interaction-controller.ts:702`, `landing-grid-card.tsx:1166`) 스크린리더 스와이프로는 여전히 도달한다. ⑶ **`Escape` 가 모바일에서 카드를 닫지 않는다** — `handleCardKeyDown` 이 `isMobileViewport` 면 즉시 반환한다(`use-landing-interaction-controller.ts:431`). 다만 이것은 결함이 아니라 **계약이 명시적으로 요구한 것**이다: §8.3 `:582`(「Mobile card-root Escape/blur는 이 Desktop/Tablet close 경로를 실행하거나 mobile state를 변경하면 안 된다」) + §8.5 `:632`(닫기 경로는 X/backdrop 만). 블루투스 키보드를 붙인 태블릿·폰에서는 표준 dismiss 키가 죽어 있다는 뜻이므로, **사용자 결정 1번(계약 개정 전면 허용) 아래에서 다시 판단할 대상**이다.

**추천: 결정 필요 — 그러나 질문의 형태가 「보존/교체」가 아니다.** 이 항목에서 사용자가 결정할 것은 **「모바일 확장을 제자리 확장으로 계속 둘 것인가, 바텀시트/전용 상세 화면으로 옮길 것인가」** 한 가지다(사용자 결정 5번이 이미 그 도입을 허용했다). 그 한 결정이 §8.5 의 34개 규칙 중 최소 12개(y-anchor · 제목 기준선 · 높이 복귀 · 스냅샷 1회 · 복원 폴링 · 유령 껍데기 관련)의 존폐를 한꺼번에 정한다. 위의 접근성 결함 셋은 어느 쪽을 고르든 **반드시 고쳐야 하는 것**이므로 이 결정에 묶지 않는다 — 특히 ⑵는 제자리 확장을 유지하더라도 `inert` 를 tap 모드에서 걸도록 고치는 것이 전부다.

---

## 5. HOVER_LOCK — 확장 중 다른 카드를 무반응으로 만드는 잠금

**무엇을 하는가.** 카드 하나가 펼쳐져 있는 동안 다른 카드들은 마우스에 반응하지 않는다. 어두워지지도 않고 흐려지지도 않는다 — 그냥 반응만 하지 않는다. 키보드로 다니는 중이면 대신 그 카드들이 접근성 트리에서 통째로 빠진다.

**코드 규모.** 상태 `src/features/landing/model/interaction-state.ts` 의 `hoverLock` 필드(`:27-31`)와 그것을 다루는 `enableHoverLock`/`clearHoverLock`/`isKeyboardModeBlocked`/`resolveCardTabIndex`(`:207-227`, `:474-504`) 약 60행 + 카드 쪽 `inert`/`data-hover-lock-*` 표식(`landing-grid-card.tsx:1109-1111`, `:1146`). 테스트 `tests/unit/landing-interaction-state.test.ts` 398행.

**계약 근거.** `docs/req-landing.md §7.5 HOVER_LOCK Contract (Hover-capable only)`(449-469행). 제목의 괄호가 이 항목의 성격을 그대로 말한다. 세부: 「비대상 카드: NORMAL 강제, dim/backdrop 금지, opacity `1.0` 고정」(`:452`) · 키보드 모드 아님이면 `tabIndex=-1`, 키보드 모드면 `inert`(`:454-455`) · `mousedown` 이 키보드 모드를 즉시 종료(`:460`) · `pointermove`·`wheel` 은 종료시키지 않음(`:461-462`). §7.1 의 우선순위 사슬에서는 `EXPANDED` 아래 `NORMAL` 위에 놓인다(`:427`).

**표준 패턴으로 대체 가능한가.** 대체 대상이 두 개로 갈린다. **키보드 모드의 `inert`** 는 이미 표준 그 자체다 — 모달이 아닌 영역을 `inert` 로 빼는 것은 현행 웹 표준의 권장 방식이고 바꿀 이유가 없다. **포인터 모드의 잠금**은 다르다: 「dim 금지·opacity 1.0 고정」(`:452`)이라는 제약 때문에 사용자에게는 **아무 시각 신호 없이 카드가 반응을 멈춘 것**으로 보인다. 표준 대안은 둘이다 — 확장된 카드를 진짜 오버레이로 만들고 뒤에 scrim 을 깔거나(모바일이 이미 그렇게 한다, 4번), 잠금을 아예 없애고 다른 카드 hover 를 handoff 로만 처리하거나(현재도 enterable 카드는 handoff 로 처리된다, `use-hover-intent-controller.ts:424-446`).

**대체하면 잃는 것.** 「dim 금지」는 §8.4 `:607`(「Expanded 카드 opacity는 항상 `1.0`」)·`:648`(모바일 활성 카드 본체 dim/tint `0%`)과 같은 계열의 시각 규율이고, design.md 의 차분한 성격(`docs/design/design.md:105`)과도 맞는다. scrim 을 도입하면 그 성격이 바뀐다 — 그러나 **모바일은 이미 scrim 을 쓰고 있으므로**(`landing-catalog-grid.tsx:31` 의 `bg-[var(--overlay-scrim-medium)]`, design.md `:362` 「A **scrim** dims the grid beneath」) 두 층의 시각 언어가 지금도 갈라져 있다. 잃는 것은 개성이 아니라 **데스크톱만의 예외**다.

**모바일에 존재하는가 — 없음(계약상 배제).** §7.5 제목이 `Hover-capable only` 이고, 구현도 `MODE_SYNC` 가 tap 모드에서 `hoverLock.enabled` 를 끈다(`interaction-state.ts:253-265`). 4번에서 적은 대로 이 결과 모바일에서 `inert` 가 영영 걸리지 않는 부작용이 생겼다 — HOVER_LOCK 의 부재가 모바일 접근성 결함의 **원인**이라는 점이 이 항목의 가장 중요한 사실이다.

**추천: 교체 권고.** 이름 자체가 이미 틀렸다 — 이것이 하는 일은 「hover 잠금」이 아니라 「확장 중 비대상 카드의 비활성화」이고, 그 일은 **입력 방식과 무관하게 모든 층에 필요하다**. 지금은 hover 층에만 있어서 모바일이 같은 일을 `mobileInteractionLocked`(`use-landing-interaction-controller.ts:657-660`)라는 두 번째 이름으로 따로 한다. 교체의 내용은 「없앤다」가 아니라 **「HOVER_LOCK 과 `mobileInteractionLocked` 를 입력 방식 중립의 단일 개념으로 합치고, `inert` 를 두 층 모두에 건다」**이다. 그렇게 하면 4번의 접근성 결함 ⑵가 부수적으로 닫힌다.

---

## 6. 제목 연속성 — 제목을 「보이는 한 줄」과 「넘치는 나머지」로 실측 분할

**무엇을 하는가.** 카드가 펼쳐질 때 제목이 다시 조판되어 튀는 일이 없도록, 접힌 상태에서 제목이 **몇 글자까지 첫 줄에 들어가는지**를 실제로 재서 그 지점에서 잘라 둔다. 펼쳐질 때 첫 줄은 제자리에 그대로 있고 나머지만 나타난다.

**코드 규모.** `src/features/landing/grid/landing-card-title-continuity.tsx` 301행. 핵심은 화면 밖에 숨긴 복제 요소(`buildTextProbe`, `:60-89` — 계산된 폰트 속성 13개를 복사한다)에 텍스트를 넣어 가며 **이분 탐색**으로 경계를 찾는 `measurePrefixLengthForLineCount`(`:101-131`)다. 재측정 트리거는 `ResizeObserver` 와 `document.fonts.ready` 둘(`:236-245`).

**계약 근거.** `docs/req-landing.md §6.6 Text & Clamp Contract`(280-315행)가 조판 계약을 갖는다. 제목 연속성 자체에 붙은 조항으로는 §8.5 `:630`(「Mobile Expanded settled에서 title 시작 기준선은 Expanded 진입 직전 Normal 상태와 `0px` 오차로 일치」)과 §8.5 `:629`(「title은 줄바꿈 허용, truncate/ellipsis 금지, top align 유지」)가 가장 가깝다.

**표준 패턴으로 대체 가능한가.** 가능하다. 「첫 줄은 그대로 두고 나머지만 드러낸다」는 CSS `line-clamp` + 높이 전이로 만들 수 있고, 그쪽은 브라우저가 조판을 한 번만 한다. 저장소가 그것을 고르지 않은 이유는 「넘치는 나머지」를 **별도 DOM 노드로 분리해야** 페이즈별 stagger 를 걸 수 있기 때문으로 보이지만(`landing-grid-card.tsx:1219` 의 `titleSplit` 전달), 문서에 그 이유는 없다 — 미확인.

**대체하면 잃는 것.** **성능이 가장 큰 쟁점이다.** 이 훅은 카드마다 한 벌씩 돌고, 측정 1회는 `document.body` 에 임시 노드를 붙였다 떼면서(`:148`, `:174`) `getBoundingClientRect` 를 **이분 탐색 횟수만큼**(제목 길이 n 에 대해 log₂n ≈ 5~6회) 호출한다 — 각각이 강제 동기 레이아웃이다. 카드 6개면 한 번의 폰트 로드 완료마다 30~36회의 레이아웃 강제가 발생한다. 정확한 프레임 비용은 측정하지 않았다 — 미확인이며, **리팩터 착수 전에 실측할 가치가 가장 높은 항목**이다.

**모바일에 존재하는가 — 없음.** `enabled: !isMobileViewport`(`landing-grid-card.tsx:986`). `enabled` 가 거짓이면 훅은 기본 분할(전체 텍스트가 첫 줄, 나머지 빈 문자열)로 되돌아간다(`landing-card-title-continuity.tsx:191-194`, `:44-50`). 즉 **모바일에서는 301행이 통째로 죽어 있고**, 모바일의 제목 연속성은 완전히 다른 수단 — 스냅샷의 `titleTopPx` 와 복원 폴링(`mobile-card-lifecycle-dom.ts:26`, `:43-45`) — 이 담당한다. §8.5 `:630` 의 `0px` 계약을 지키는 것은 이쪽이다.

**추천: 결정 필요.** 보존 근거: 이것은 제품의 시각적 정체성에 직접 닿는다 — 「같은 카드가 이어서 자란다」는 §8.5 `:637` 의 요구를 데스크톱에서 실현하는 유일한 수단이다. 교체 근거: 301행이 모바일에 0의 가치이고, 성능 비용이 미측정이며, `line-clamp` 대안이 존재한다. **결정 전에 반드시 할 일은 성능 실측 하나다** — 강제 레이아웃 비용이 프레임 예산 안이면 보존이 쉬운 답이고, 넘으면 교체가 쉬운 답이 된다. 측정 없이 결정하면 어느 쪽이든 근거 없는 결정이 된다.

---

## 7. 그리드 지오메트리 — 행 베이스라인 동결 · 보정 갭 · 확장 바닥 · 확장 배율 clamp

**무엇을 하는가.** 카드 하나가 펼쳐질 때 같은 행의 다른 카드들이 위아래로 밀리지 않는다. 카드마다 내용 길이가 달라 생기는 아래쪽 빈 공간은 행 안에서 **보정 갭**으로 균등화된다. 펼쳐진 카드는 확대되지만 화면 밖으로 새지 않을 만큼만 확대된다.

**코드 규모.** `src/features/landing/grid/use-grid-geometry-controller.ts` 446행 + `use-card-inline-geometry.ts` 337행(그중 `useCardExpandedScale` `:87-179` 93행과 태그 가시 개수 계산 `:181-337`) + `spacing-plan.ts` 145행 + `baseline-manager.ts` 72행 + 배율 공식 `layout-plan.ts:112-141`. 합계 약 1,130행.

**계약 근거.** 세 곳으로 나뉜다. 보정 갭과 카드 높이는 `docs/req-landing.md §6.7 Card Height & Bottom Spacing Contract`(316-386행). 확장 배율 clamp 는 §8.4 `:596`(「`max_surface_scale = 1 + available_stage_outset_px / normal_root_width_px`, `resolved_final_scale = min(desired_final_scale, max_surface_scale)`, `frame_inline_scale = resolved_final_scale / 1.04`」 — 구현은 `layout-plan.ts:131-139` 로 한 줄씩 대응한다) 및 `:595`(desktop `1.10` · tablet `1.04`, 구현 `layout-plan.ts:10-11`). 확장 바닥은 BQ-24 로 등재돼 있다(주석 `use-grid-geometry-controller.ts:321-325`).

**표준 패턴으로 대체 가능한가.** 부분적으로. **행 베이스라인 동결**은 CSS Grid 가 스스로 해결하지 못하는 문제(확장 중 행 높이 변화)를 JS 로 막는 것인데, 표준 대안은 확장된 카드를 **문서 흐름에서 빼는 것**(`position: absolute` 오버레이)이고 실제로 데스크톱은 이미 그렇게 한다(`landing-grid-card.tsx:1019-1020` 의 `[background:transparent]` 껍데기 + 오버레이). 즉 동결은 **오버레이가 있음에도 남아 있는 이중 안전장치**다. **보정 갭**은 대체가 어렵다 — 「행 안에서 태그 줄 아래 여백을 맞춘다」는 요구 자체가 표준 레이아웃 원시 자료로는 표현되지 않는다. **확장 배율 clamp** 는 `clamp()`/컨테이너 쿼리로 근사할 수 있으나 `available_stage_outset` 이 CSS 변수 실측값이라(`use-card-inline-geometry.ts:111-114`) 완전 CSS 화는 어렵다.

**대체하면 잃는 것.** 가장 큰 것은 **측정 인프라 자체**다. 이 두 훅은 `ResizeObserver` 를 카드마다·행마다 붙이고(`use-grid-geometry-controller.ts:280-292`, `use-card-inline-geometry.ts:252-255`) `document.fonts.ready` 와 `loadingdone` 을 함께 듣는다(`:295-300`). 그것을 걷어내면 폰트 늦게 로드되는 로케일(12개 로케일이 있다)에서 첫 페인트 이후 재조판이 눈에 보일 위험이 생긴다.

**모바일에 존재하는가 — 부분 존재.** 셋이 각각 다르다. ⑴ **보정 갭 측정은 모바일에서도 돈다**: `measurementSuspended` 는 `mobileLifecyclePhase !== 'NORMAL'` 이거나 `(plan.tier !== 'mobile' && …)` 일 때만 참이므로(`use-grid-geometry-controller.ts:170-172`), 모바일 NORMAL 에서는 측정이 수행된다. ⑵ **행 베이스라인 동결은 모바일에서 배제**: `plan.tier === 'mobile'` 이면 무조건 `RELEASE` 를 보낸다(`:372-376`). 모바일은 1열이므로(`layout-plan.ts:81-87`) 「같은 행의 다른 카드」가 존재하지 않아 개념상 불필요하다. ⑶ **확장 바닥과 확장 배율은 모바일에서 배제**: 바닥은 `plan.tier === 'mobile'` 에서 초기화되고(`use-grid-geometry-controller.ts:327-330`), 배율은 `viewportTier` 가 desktop/tablet 이 아니면 `desiredFinalScale = 1`이다(`layout-plan.ts:124-130`) — 모바일은 확대 대신 full-bleed 로 넓어진다(§8.4 `:600`).

**추천: 보존 권고(구조 재배치는 필요).** 이 항목은 「제품 개성」이 아니라 **레이아웃이 깨지지 않게 하는 물리**다. 교체 대상이 아니며, 사용자 결정 4번(0단계 구조 분리, 행동 무변경)이 겨냥해야 할 대표 대상이다 — 446행과 337행 두 파일이 저장소 규칙의 ~500행 한계(`AGENTS.md §3`) 근처에 있고, 그 안에 데스크톱 전용 관심사(동결·바닥·배율)와 공통 관심사(보정 갭·폰트 대기)가 섞여 있다. 다만 **행 베이스라인 동결만 결정 필요로 따로 올린다**: 데스크톱이 이미 오버레이로 흐름에서 빠지는데 동결이 왜 여전히 필요한지가 문서로 확인되지 않았다 — 미확인이며, 동결을 끄고 시각 baseline 을 돌려 보면 한 번에 판정된다.

---

## 8. 행 위치별 transform-origin — 첫 카드는 왼쪽, 마지막은 오른쪽, 가운데는 가운데

**무엇을 하는가.** 카드가 확대될 때 어느 방향으로 자라는지가 그 카드의 행 내 위치로 정해진다. 왼쪽 끝 카드는 왼쪽 모서리를 고정한 채 오른쪽으로, 오른쪽 끝 카드는 반대로, 가운데 카드는 양쪽으로 균등하게 자란다. 덕분에 확대된 카드가 화면 밖으로 나가지 않는다.

**코드 규모.** 판정 함수 `src/features/landing/grid/hover-intent.ts:38-51`(14행) + 호출부 `landing-catalog-grid.tsx:253-256` + 그것을 받아 CSS 변수로 내리는 `landing-grid-card.tsx:1161`. 매우 작다.

**계약 근거.** `docs/req-landing.md §8.4`(603-606행): 「transform-origin 판정은 Expanded 시작 시점의 settled row 경계를 기준」(`:603`) · 「해당 row의 첫 카드 `0% 0%`, 마지막 카드 `100% 0%`, 그 외 `50% 0%`」(`:604`) · 「row에 카드가 1개인 경우 해당 카드는 row 첫 카드로 간주」(`:605`) · 「row 경계 판정에 고정 인덱스를 사용하면 안 된다」(`:606`). 구현 `hover-intent.ts:42-49` 가 네 줄에 한 줄씩 정확히 대응한다.

**표준 패턴으로 대체 가능한가.** 이것이 곧 표준이다 — 확대 방향을 가용 공간으로 정하는 것은 popover/tooltip 의 flip·shift 와 같은 발상이다. 대체할 것이 없다.

**대체하면 잃는 것.** 해당 없음.

**모바일에 존재하는가 — 실질적으로 없음.** 값 자체는 모바일에서도 계산돼 CSS 변수로 내려가지만(`landing-catalog-grid.tsx:253`, 카드 렌더에 조건이 없다), 모바일은 1열이므로 `rowCardCount <= 1` 분기에 걸려 **항상 `'0%'`** 이 되고(`hover-intent.ts:42-44`), 게다가 모바일은 scale 확대를 하지 않으므로(7번 ⑶) 그 값이 시각에 아무 영향을 주지 않는다.

**추천: 보존 권고.** 14행이고, 계약과 1:1 대응하며, 표준 그 자체다. 리팩터에서 건드릴 이유가 없다.

---

## 9. 테마 전환 — 클릭 지점에서 번지는 2,500ms 블러 원

**무엇을 하는가.** 설정에서 라이트/다크를 누르면 **누른 그 지점**에서 흐릿한 원이 퍼져 나가며 화면 전체의 테마가 바뀐다. 2.5초 동안 이어진다.

**코드 규모.** `src/features/gnb/hooks/theme-transition.ts` 199행 — 인라인 SVG 를 data URI 마스크로 만들고(`:91-93`) 화면 네 모서리까지의 거리로 최종 마스크 크기를 계산한 뒤(`:102-110`) `::view-transition-old/new(root)` 에 붙일 `<style>` 을 런타임에 주입한다(`:112-144`, `:175-182`). 테스트는 `tests/unit/gnb-theme-transition.test.ts` **19행**뿐이고 그 내용은 사실상 `durationMs === 2500` 단언 하나다(`:9-12`).

**계약 근거 — 없다. 이것이 이 항목의 핵심 사실이다.** `2500` 을 저장소 전체에서 찾으면 네 곳이 나오는데 구현(`theme-transition.ts:4`) · 그 값을 고정하는 테스트(`gnb-theme-transition.test.ts:9-10`) · 현상을 **서술한** 분석 문서(`docs/project-analysis.md:275`) 셋뿐이고, **`docs/req-landing.md` · `docs/design/design.md` · `docs/decision-register.md` 중 어디에도 이 인터랙션을 규정한 조항이 없다.** design.md 의 모션 어휘(`docs/design/design.md:373`)가 정한 가장 긴 duration 은 `--dur-expand: 260ms` 이므로, 2,500ms 는 그 어휘의 **9.6배**이며 어휘 밖의 값이다.

**표준 패턴으로 대체 가능한가.** 가능하다. View Transition API 로 테마를 바꾸는 것 자체는 현행 표준이고, 클릭 지점에서 퍼지는 원형 마스크도 널리 쓰이는 관용 패턴이다. 대체 대상은 기법이 아니라 **duration** 이다.

**대체하면 잃는 것.** 제품 개성은 잃지 않는다 — 같은 연출을 400~600ms 로 해도 「눌린 곳에서 번진다」는 인상은 그대로다. 접근성은 **얻는다**: WCAG **2.2.2 Pause, Stop, Hide** 는 5초를 넘는 자동 움직임을 대상으로 하므로 2.5초는 그 기준 안이지만, **2.3.3 Animation from Interactions**(AAA)가 정확히 이 종류의 상호작용 유발 애니메이션을 다룬다. 이 구현은 `prefers-reduced-motion: reduce` 를 존중해 전환을 건너뛰므로(`theme-transition.ts:33-42`, `:55`) AAA 의 면제 조건은 충족한다. 남는 문제는 규범이 아니라 체감이다 — 테마 토글은 **즉시성이 기대되는 설정 변경**인데 2.5초 동안 화면이 두 겹으로 겹쳐 있다.

**모바일에 존재하는가 — 있다. 그러나 진입 경로가 다르다.** 데스크톱 설정 패널은 클릭 좌표를 미리 계산해 `transitionOrigin` 으로 넘기고(`src/features/gnb/site-gnb.tsx:344-349`), 모바일 드로어는 요소 자체를 `sourceEl` 로 넘긴다(`:474-476`). 둘 다 `runBlurCircleTransition` 에 도달하며(`use-theme-preference.ts:127-131`), 원점 해석만 갈린다(`theme-transition.ts:162`). **모바일에서 추가로 발생하는 문제**: 테마 칩을 누르면 드로어가 열린 채로 2.5초 전환이 돌아가는데, 드로어는 `body` 의 `overflow`/`touchAction` 을 잠근 상태다(`use-gnb-mobile-menu.ts:137-147`). 전환 중 사용자가 무엇을 볼지, 드로어가 전환 마스크와 어떻게 겹치는지는 **미확인** — 실기 확인이 필요하다.

**추천: 교체 권고.** 근거가 셋이고 모두 측정 가능하다. ⑴ **어떤 계약도 이 값을 요구하지 않는다** — 이것을 지키는 것은 19행짜리 단위 테스트 하나뿐이고, 그 테스트는 값이 옳음을 증명하지 않고 값이 **변하지 않음**만 고정한다. ⑵ **design.md 의 모션 어휘와 9.6배 어긋난다** — `docs/design/design.md:105`(「Calm and purposeful」)와 `:373`(최대 260ms)이 정한 언어 밖의 값이다. ⑶ **설정 변경의 즉시성 기대와 충돌한다**. 교체의 내용은 「연출을 없앤다」가 아니라 **「duration 을 design.md 의 어휘 안으로 가져온다」**이며, 이것은 사용자 결정 1번 없이도 할 수 있는 유일한 항목이다(개정할 계약이 애초에 없으므로). 다만 값을 바꾸는 순간 `docs/decision-register.md` 등재 의무가 발생한다(`AGENTS.md §3-1` 의 R 분류).

---

## 10. 랜딩→목적지 전환 — GNB 유령 · 1,600ms 타임아웃 · 스크롤 복원

**무엇을 하는가.** 카드에서 A/B 를 고르거나 블로그 카드를 누르면 페이지가 이동하는데, 이동 중에도 **랜딩의 GNB 가 화면 위에 그대로 떠 있는 것처럼** 보인다. 목적지가 준비되면 그 유령이 사라지고 진짜 GNB 로 한 번에 교체된다. 나중에 뒤로 돌아오면 떠날 때 보던 스크롤 위치 그대로다. 목적지가 1.6초 안에 준비되지 않으면 전환이 실패로 처리된다.

**코드 규모.** `src/features/transition/` 전체 = `store.ts` 231 + `runtime.ts` 116 + `use-landing-transition.ts` 72 + `transition-runtime-monitor.tsx` 34 + `transition-gnb-overlay.tsx` 33 + `signals.ts` 31 + `use-pending-landing-transition.ts` 29 + `constants.ts` 1 = **547행**. 여기에 랜딩 쪽 스크롤 복원(`src/features/landing/landing-runtime.tsx:24-65`)과 컨트롤러의 전환 잠금(`use-landing-interaction-controller.ts:489-497`)이 붙는다. 테스트는 `tests/unit/landing-transition-runtime.test.ts` 136행 + E2E `tests/e2e/transition-telemetry-smoke.spec.ts`(유령 GNB 단언이 `:77`, `:317-318`, `:414`, `:980`, `:1022` 다섯 곳).

**계약 근거.** `docs/req-landing.md §13.3 Landing→Destination Handshake`(864-882행)와 §13.8 Return Restoration(999-1006행). 핵심: 「source GNB는 목적지 진입 완료 전까지 유지한다」(`:870`) · 「destination GNB는 목적지 진입 완료 시점에 1회 교체한다」(`:871`) · 「전환 종료 이벤트는 `complete|fail|cancel` 중 정확히 1회만」(`:874`) · 「live timeout 기준은 `1600ms`」(`:879`, 구현 `constants.ts:1`) · 「랜딩 재진입 mount 직후 `1회` 복원 후 즉시 consume」(`:1004`, 구현 `landing-runtime.tsx:46-65`) · 「복원 과정에서 자동 viewport 보정 스크롤을 금지」(`:1006`, 구현 `landing-runtime.tsx:62` 의 `behavior: 'auto'`).

**표준 패턴으로 대체 가능한가.** 이 항목은 셋으로 갈린다. **스크롤 복원**은 표준 그 자체이며(`history.scrollRestoration` 과 같은 계열의 문제) 대체 대상이 아니다. **1,600ms 타임아웃 + fail/cancel 롤백**은 데이터 무결성 장치(pre-answer 가 저장된 채 목적지가 뜨지 않으면 유령 응답이 남는다, `runtime.ts:54-68`)이므로 UI 패턴이 아니다. **유령 GNB 만** 시각 인터랙션이고, 표준 대안은 View Transition API(9번이 이미 쓰고 있다)로 GNB 를 공유 요소로 묶는 것이다.

**대체하면 잃는 것.** 유령 GNB 를 View Transition 으로 바꾸면 코드 66행(`transition-gnb-overlay.tsx` 33 + `use-pending-landing-transition.ts` 29 + 상수)이 사라지고, 대신 **GNB 가 전환 중 실제로 포커스를 가질 수 있게 된다** — 현재 유령은 `pointer-events-none` + `aria-hidden` + `inert` 로 완전히 죽어 있으므로(`transition-gnb-overlay.tsx:14`, `:27-28`) 전환 중 GNB 를 누를 수 없다. 잃는 것은 **명시적 제어**다: 현재 구조는 「언제 교체하는가」를 코드가 결정하지만(§13.3 `:871-873` 의 destination-ready 정의), View Transition 은 브라우저에 맡긴다.

**모바일에 존재하는가 — 있다(공통).** `TransitionGnbOverlay` 는 `context === 'landing'` 이 아닌 모든 문맥에서 렌더되며 뷰포트 조건이 없다(`transition-gnb-overlay.tsx:19-21`). 안에 그리는 `SiteGnb` 가 데스크톱/모바일 두 레이아웃을 모두 갖고 있으므로(`site-gnb.tsx:365-416`), 유령도 그대로 모바일 GNB 모양으로 나온다. 스크롤 복원도 뷰포트 조건이 없다. **다만 모바일에서만 위험한 지점이 하나 있다**: 유령이 `z-[1300]` 의 `fixed inset-x-0 top-0` 이고(`:14`) 모바일 GNB 높이는 약 56px 인데(design.md `:341`), 모바일 브라우저의 주소창 높이 변동 중에 이 고정 요소와 실제 GNB 가 어긋나 보이는지는 **미확인**.

**추천: 보존 권고(유령 GNB 만 결정 필요).** 전환 상태 기계 · 타임아웃 · 롤백 · 스크롤 복원은 데이터 정합성 계약이고 사용자 결정 5번이 라우팅 개정을 허용했더라도 이것들은 **어느 IA 에서도 필요하다**. 유령 GNB 하나만 따로 떼어 결정 필요로 올린다 — 66행이고, 표준 대안이 명확하며, 모바일 주소창 변동과의 상호작용이 미확인이기 때문이다.

---

## 11. 동의 배너 회피 — 확장 카드와 겹치는 동안에만 배너가 비켜선다

**무엇을 하는가.** 화면 아래 고정된 텔레메트리 동의 배너가, 확장된 카드와 **실제로 겹치는 동안에만** 보이지 않게 된다. 겹치지 않으면 그대로 있다. 배너 안에 포커스가 있으면 비켜서지 않는다.

**코드 규모.** `src/features/landing/shell/consent-banner.tsx` 279행, 그중 회피 로직이 `:142-232`(91행). DOM 계약은 `data-consent-banner-avoid` 표식 한 개이고(`:36`) 카드 쪽에서 확장 본문과 유령 껍데기에 붙인다(`landing-grid-card.tsx:1229`, `:1262`). 테스트는 `tests/unit/telemetry-consent-banner.test.ts`(행수 미확인).

**계약 근거.** `docs/req-landing.md §8.4:609` — 「카드 레이어 밖의 뷰포트 고정 표면(telemetry consent banner)도 Expanded 카드를 가리면 안 된다. 겹침은 스크롤 위치의 함수이므로 고정 기하 여유로 해소할 수 없고, **실제로 교차하는 동안에만** 그 표면이 비켜선다 — 교차하지 않는 동안 동의 UI 를 숨기는 구현을 금지한다. … 그 표면이 포커스를 품고 있으면 비켜서지 않는다(BQ-39)」. 검증은 §8.4 Verification 2(`:614`).

**표준 패턴으로 대체 가능한가.** 이 문제의 표준 답은 **배너를 그 자리에서 없애는 것**이다 — 2026년의 관용은 동의 요청을 화면 하단 고정 배너가 아니라 최초 진입 시 한 번의 시트/모달로 처리하거나, 아예 필수 텔레메트리만 쓰고 동의 UI 를 제거하는 쪽이다. 지금 구조는 「하단 고정 배너」라는 선택 때문에 확장 카드와의 충돌이 생겼고, 그 충돌을 91행으로 막고 있다.

**대체하면 잃는 것.** 잃는 것이 별로 없다는 점이 이 항목의 특징이다. 다만 **성능 비용이 실재한다**: 표식이 DOM 에 하나라도 있는 동안 `requestAnimationFrame` 루프가 **매 프레임** 배너 사각형과 모든 표식 사각형의 교차를 다시 잰다(`consent-banner.tsx:186-191`, `:161-176`). 데스크톱에서는 hover 로 소멸하는 일시 상태라 주석이 말하는 대로(`:182-185`) 비용이 짧지만, **모바일에서는 카드가 OPEN 인 동안 무한정 돈다** — 사용자가 확장 카드를 읽는 내내 매 프레임 강제 레이아웃이 발생한다. 실제 프레임 비용은 측정하지 않았다 — 미확인.

**모바일에 존재하는가 — 있다(공통), 그리고 그것이 문제다.** 표식은 모바일 확장 본문(`landing-grid-card.tsx:1229`)과 전환용 유령 껍데기(`:1262`)에 붙는다. 배너 자체는 모바일 레이아웃을 갖고 있고(`consent-banner.tsx:241` 의 `max-[719px]:flex-wrap` 등) `env(safe-area-inset-bottom)` 을 존중한다(`:21`). 그러나 위에 적은 대로 **rAF 루프의 수명이 두 층에서 근본적으로 다르다** — 데스크톱은 hover 가 끝나면 멈추고, 모바일은 사용자가 X 를 누를 때까지 돈다.

**추천: 교체 권고.** 근거 셋. ⑴ **문제의 원인이 해법보다 위에 있다** — 하단 고정 배너라는 선택이 없으면 91행 전체가 없다. ⑵ **모바일에서 비용이 무한정이다** — 데스크톱 전제(「hover 로 소멸하는 일시 상태」, `:182`) 위에 설계된 루프가 모바일의 무한정 OPEN 상태에 그대로 걸려 있다. ⑶ 사용자 결정 5번이 IA 재설계를 허용했으므로 동의 UI 의 위치 자체가 개정 대상에 들어온다. 다만 §8.4 `:609` 가 「교차하지 않는 동안 동의 UI 를 숨기는 구현을 금지한다」고 명시하므로, **배너를 없애는 것이 아니라 다른 형태로 옮기는 것**이어야 그 금지와 충돌하지 않는다.

---

## 12. 랜딩 키보드 진입 — 첫 Tab 이 GNB 를 건너뛰고 첫 카드로 간다

**무엇을 하는가.** 랜딩 페이지에서 처음 Tab 을 누르면 상단 GNB 가 아니라 **첫 번째 사용 가능 카드**로 포커스가 간다. 그 카드에서 Shift+Tab 을 하면 그제야 GNB 의 마지막 컨트롤로 돌아간다. GNB 를 한 번 클릭하거나 포커스하면 그 다음부터는 평범한 순서로 돌아간다.

**코드 규모.** `src/features/gnb/hooks/use-landing-gnb-entry-mode.ts` 87행(GNB 링크들에 `tabIndex=-1` 을 거는 쪽) + `src/features/landing/grid/use-landing-keyboard-entry.ts` 65행(역방향 복귀 대상 찾기) + `use-keyboard-mode-tracker.ts:32-38`(첫 Tab 가로채기) + GNB 쪽 적용 지점 다수(`site-gnb.tsx:264`, `:279`, `:290`, `:319`, `:374`, `:398`).

**계약 근거.** `docs/req-landing.md §7.6:480` — 「Landing 컨텍스트에서는 중립 페이지 상태에서 첫 forward `Tab`이 첫 번째 available 카드로 진입해야 하며, 첫 번째 available 카드 trigger에서 `Shift+Tab`은 마지막 visible GNB control(Desktop settings / Mobile menu)로 복귀해야 한다」. 바로 다음 줄이 「위 landing 진입/복귀 규칙은 landing에만 적용」(`:481`)이라고 범위를 좁힌다.

**표준 패턴으로 대체 가능한가.** 표준 답은 **skip link** 다 — 문서 순서는 그대로 두고 「본문으로 건너뛰기」 링크를 첫 탭 스톱에 둔다. 현재 구조는 문서 순서를 그대로 두는 대신 GNB 요소들의 `tabIndex` 를 런타임에 `-1` 로 바꿔(`use-landing-gnb-entry-mode.ts:53-54`) 순서를 **숨긴다**.

**대체하면 잃는 것.** 잃는 것은 「첫 Tab 이 바로 콘텐츠로 간다」는 무마찰감이다. **얻는 것이 더 크다고 볼 근거가 있다.** 현재 방식은 포커스 순서가 사용자의 직전 행동(GNB 를 눌렀는가)에 따라 **바뀐다** — `focusin`/`pointerdown` 을 문서 전역에서 듣고 모드를 갱신한다(`use-landing-gnb-entry-mode.ts:61-74`). 탭 순서가 상태에 따라 달라지는 것은 WCAG **3.2.3 Consistent Navigation**(AA, 여러 페이지 간 일관성)의 문자 그대로의 대상은 아니지만 **2.4.3 Focus Order**(A, 「의미와 조작 가능성을 보존하는 순서」)의 해석에 걸릴 여지가 있다. 스크린리더 사용자는 GNB 가 때때로 탭 순서에서 사라지는 것을 인지할 방법이 없다.

**모바일에 존재하는가 — 있다(공통), 다만 복귀 대상이 다르다.** `mobileLandingTabIndex` 가 같은 값으로 계산되고(`use-landing-gnb-entry-mode.ts:54`) 모바일 브랜드 링크·메뉴 트리거에 적용된다(`site-gnb.tsx:374`, `:398`). 역방향 복귀 대상만 갈린다 — 모바일은 `gnb-mobile-menu-trigger` → `.gnb-mobile .gnb-ci-link` 순으로 찾고, 데스크톱은 `gnb-settings-trigger` → 마지막 데스크톱 링크 → 브랜드 링크 순이다(`use-landing-keyboard-entry.ts:38-41`).

**추천: 결정 필요.** 보존 근거: §7.6 `:480` 이 명시적으로 요구하고, E2E 가 이를 고정하고 있으며(§7.6 Verification 6, `:491`), 「랜딩의 주인공은 카드다」라는 의도가 분명하다. 교체 근거: skip link 라는 정확한 표준 대안이 있고, 현재 방식은 **탭 순서를 상태에 따라 바꾼다**는 점에서 예측 가능성을 해친다. 또한 이 구현은 GNB DOM 을 CSS 선택자로 뒤지는 계층 위반을 스스로 인정하고 있다(`use-landing-keyboard-entry.ts:17-29` 의 `@future-move R-06` 주석: GNB 훅이 `focusTrigger()` 를 노출해야 한다고 적혀 있다). **사용자 결정 1번 아래에서 §7.6 `:480-481` 을 개정할지가 이 항목의 실제 질문이다.**

---

## 13. 모바일 backdrop 탭 닫기 — 10px 움직이면 스크롤로 재분류

**무엇을 하는가.** 확장된 카드 바깥의 어두운 영역을 탭하면 카드가 닫힌다. 그런데 손가락이 10px 넘게 움직이면 그것은 탭이 아니라 스크롤로 보고 닫지 않는다. 아직 열리는 중(OPENING)에 바깥을 누르면 다 열린 직후에 한 번만 닫힌다.

**코드 규모.** `src/features/landing/grid/use-mobile-backdrop-gesture.ts` 100행 + 리듀서의 `QUEUE_CLOSE`/`QUEUE_CLOSE_CANCEL` 처리(`mobile-lifecycle.ts:85-110`) + backdrop 렌더(`landing-catalog-grid.tsx:198-208`). 임계값은 `MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX = 10`(`use-mobile-backdrop-gesture.ts:7`). 테스트 `tests/unit/landing-mobile-backdrop-gesture.test.ts` 156행.

**계약 근거.** §8.5 `:632`(닫기 경로는 X 또는 backdrop 탭만) · `:643`(「OPENING 중 유효 닫기 입력(X/outside)은 OPEN settled 직후 1회 queue-close로 처리한다. CLOSING 중 추가 open/close 입력은 무시한다」) · `:651`(「Mobile tap 판정은 보수적으로 처리하며, 미세 이동이 감지된 입력은 scroll gesture로 분류해 카드 open/close 전이를 시작하면 안 된다」) · `:645-646`(backdrop 은 확장 카드를 덮지 않고 dim 은 바깥에만).

**표준 패턴으로 대체 가능한가.** 이것이 곧 표준이다. 「backdrop 탭으로 닫기」 + 「이동 임계값으로 탭/스크롤 구분」은 모든 시트·다이얼로그 구현의 기본이고, 10px 라는 값도 관용 범위 안이다(같은 저장소의 GNB 드로어도 같은 10px 를 쓴다, `src/features/gnb/behavior.ts:6`).

**대체하면 잃는 것.** 해당 없음. 오히려 **표준에서 빠진 것이 있다**: backdrop 이 `touch-pan-y` 를 갖고 있어(`landing-catalog-grid.tsx:31`) 세로 스크롤이 통과하는데, OPEN 상태에서는 스크롤 잠금이 해제돼 있으므로(§8.5 `:641`) 사용자가 backdrop 위에서 페이지를 스크롤할 수 있다. 이것이 의도인지 — 「확장 카드를 읽으며 페이지를 함께 스크롤한다」 — 아니면 모달 관용(배경 스크롤 차단)과의 충돌인지는 문서로 확인되지 않았다 — **미확인**.

**모바일에 존재하는가 — 모바일 전용이며, 768px 이상에서는 없다.** `active: isMobileViewport && phase !== 'NORMAL'`(`use-mobile-backdrop-gesture.ts:61`). 터치 태블릿에 backdrop 이 0개인 것이 이 줄이다.

**추천: 보존 권고.** 표준 그 자체이고 계약과 1:1로 맞는다. 리팩터에서 할 일은 **적용 범위를 넓히는 것**이다 — 사용자 결정 2번(입력 방식 기준 통일)이 적용되면 이 100행이 터치 태블릿에서도 켜지고, 그것만으로 사전 실측이 발견한 「닫을 수단 없음」이 해소된다. 다만 OPEN 중 backdrop 스크롤 통과가 의도인지는 별도로 확인해야 한다.

---

## 14. GNB 모바일 드로어 — 바깥 누름으로 닫되 스크롤이면 되돌린다

**무엇을 하는가.** 모바일에서 메뉴를 열면 오른쪽에서 패널이 나온다. 바깥을 누르면 180ms 동안 닫히는 애니메이션이 돌고, 그 사이에 손가락이 10px 넘게 움직이면 **닫히던 것이 취소되고 다시 열린다**. 닫히면 포커스가 메뉴 버튼으로 돌아간다.

**코드 규모.** `src/features/gnb/hooks/use-gnb-mobile-menu.ts` 160행 + 상수·판정 `src/features/gnb/behavior.ts:4`(`MOBILE_MENU_CLOSE_DURATION_MS = 180`)·`:6`(`10`)·`:15-27` + 패널 렌더(`site-gnb.tsx:419-481`). 테스트 `tests/unit/gnb-mobile-menu.test.ts`(행수 미확인).

**계약 근거.** `docs/req-landing.md §6.4 GNB Contract`(216-258행)와 §10.2 GNB by Context(732-736행) — 구체 조항 대조는 하지 않았다(미확인). `Escape` 로 닫는 경로는 `site-gnb.tsx:216-236` 이 문서 전역 리스너로 소유한다.

**표준 패턴으로 대체 가능한가.** 대부분이 이미 표준이다 — `role="dialog"` + `aria-modal="true"`(`site-gnb.tsx:433-434`) · body 스크롤 잠금(`use-gnb-mobile-menu.ts:137-147`) · `Escape` 닫기 · 닫힌 뒤 트리거로 포커스 복귀(`:55`). **비표준인 것은 「닫히던 것을 스크롤로 되돌린다」 한 가지다**(`:80-88`). 표준 대안은 13번과 같다 — `pointerdown` 에서 바로 닫지 말고 `pointerup` 에서 이동량을 보고 판정한다. 실제로 13번의 카드 backdrop 은 그 표준 방식을 쓰는데(`use-mobile-backdrop-gesture.ts:91-97`: `closeOnPointerUp` 을 `pointerup` 에서 평가), **같은 저장소의 두 backdrop 이 서로 다른 방식을 쓴다**.

**대체하면 잃는 것.** 없다. 되돌리기 방식은 닫힘 애니메이션이 시작됐다가 취소되는 것을 사용자가 보게 만들고, `pointerup` 판정 방식은 애초에 시작하지 않는다. 후자가 더 조용하다.

**모바일에 존재하는가 — 모바일 전용이다.** `mobileMenuEnabled` 조건 아래 렌더된다(`site-gnb.tsx:419`). 데스크톱 대응물은 hover 로 열리는 설정 패널이다(17번).

**추천: 교체 권고(범위 극소).** 「드로어를 없애라」가 아니라 **「바깥 닫기 판정을 13번과 같은 `pointerup` 방식으로 통일하라」**이다. 두 backdrop 이 같은 임계값(10px)으로 다른 알고리즘을 쓰는 것은 설계가 아니라 각각 따로 만든 흔적이고, 통일하면 `use-gnb-mobile-menu.ts` 에서 `cancelMobileMenuCloseFromScroll`(`:80-88`)과 `closing` 상태의 되돌림 경로가 사라진다. 드로어의 나머지 — 모달 의미론 · 스크롤 잠금 · `Escape` · 포커스 복귀 — 는 전부 **보존**이다.

---

## 15. Blog 「Read more」 hover 공개 — 그리고 그것이 터치에서 취소되는 방식

**무엇을 하는가.** 데스크톱에서 블로그 카드에 마우스를 올리면 아래쪽에 「Read more」가 나타난다. 터치 기기에서는 처음부터 계속 보인다.

**코드 규모.** 가시성 판정 `landing-grid-card.tsx:465`(한 줄: `ctaVisibility: readMoreLabel ? (interactionMode === 'hover' ? 'hover-focus' : 'always') : 'never'`) + 그것을 소비하는 이벤트 배선(`use-card-inline-geometry.ts:278-309`, 32행) + CSS(`landing-grid-card.module.css:170-208`, 39행).

**계약 근거.** `docs/req-landing.md §6.5 Card Slot Order Contract`(259-279행)와 §6.6(280-315행) — 구체 대조는 하지 않았다(미확인). design.md 쪽은 §7.4 Blog card(`docs/design/design.md:322-330`).

**표준 패턴으로 대체 가능한가.** 이미 대체돼 있다 — 터치 기기에서 항상 보이는 것이 정확히 그 답이다.

**대체하면 잃는 것.** 해당 없음.

**모바일에 존재하는가 — 있다(항상 표시로 대체).** `interactionMode` 로 갈리므로 모바일뿐 아니라 **터치 태블릿에서도** `'always'` 다(`interactionMode` 는 hover capability 를 보므로, §0 참조). 이 항목은 저장소에서 **터치 기기 대응이 올바르게 된 유일한 사례**이며, 그 이유는 판정 축이 `isMobileViewport`(폭)가 아니라 `interactionMode`(입력 방식)이기 때문이다.

**추천: 보존 권고.** 더 나아가 **이 한 줄이 사용자 결정 2번의 참조 구현**이다 — 「폭이 아니라 입력 방식으로 갈린다」가 이미 여기 구현돼 있고 올바르게 동작한다. 리팩터에서 `isMobileViewport` 를 입력 방식 기준으로 바꿀 때 이 줄이 기준선이 된다. 덧붙여 CSS 쪽 주석(`landing-grid-card.module.css:176-189`)은 `display: none` → `visibility` 전환의 실측 근거(250px 에서 태그가 23.33px 잃고 마지막 태그가 3.92px 더 잘렸다)를 담고 있어, **CTA 공개가 레이아웃을 밀면 안 된다**는 규율의 증거로 보존 가치가 있다.

---

## 16. 모바일 테스트 뒤로가기 — 220ms 안에 안 움직이면 홈으로

**무엇을 하는가.** 테스트 화면의 뒤로 버튼을 누르면 브라우저 히스토리를 되돌린다. 그런데 220ms 뒤에도 URL 이 그대로면 홈으로 보낸다.

**코드 규모.** `src/features/gnb/hooks/use-gnb-back-navigation.ts` 104행 + 상수 `behavior.ts:5`(`MOBILE_TEST_BACK_FALLBACK_TIMEOUT_MS = 220`) + 내부 경로 추적을 위한 `sessionStorage` 왕복(`use-gnb-back-navigation.ts:82-97`). 테스트 `tests/unit/gnb-back-navigation.test.ts`(행수 미확인).

**계약 근거.** 대조하지 못했다 — **미확인**. §10.2 GNB by Context(`docs/req-landing.md:732-736`)가 문맥별 GNB 를 규정하지만 이 fallback 타임아웃을 규정하는 조항은 찾지 못했다.

**표준 패턴으로 대체 가능한가.** 「`history.back()` 이 먹히지 않으면 fallback」은 SPA 의 흔한 방어이고, 220ms 타이머보다 표준적인 방법은 `popstate` 이벤트를 듣거나 진입 시점에 히스토리 깊이를 기록해 두는 것이다. 이 구현도 후자를 절반 하고 있다 — `sessionStorage` 에 직전 내부 경로를 적어 두고 그것이 없으면 타이머 없이 바로 홈으로 간다(`:44-50`).

**대체하면 잃는 것.** 잃는 것보다 **위험이 하나 있다**: iOS Safari 의 가장자리 스와이프 뒤로가기와 이 버튼이 같은 목적지를 갖지 않을 수 있다. 스와이프는 브라우저 히스토리를 그대로 되돌리고, 이 버튼은 220ms 뒤 홈으로 갈 수 있다. 같은 화면에서 두 개의 「뒤로」가 다르게 동작하는지는 **미확인**이며 실기 확인 대상이다.

**모바일에 존재하는가 — 이름은 모바일이지만 데스크톱에서도 쓰인다.** `handleTestBack` 이 데스크톱 뒤로 버튼(`site-gnb.tsx:257`)과 모바일 뒤로 버튼(`:381`) 양쪽에 걸려 있다. 상수 이름만 `MOBILE_` 로 시작한다 — 이름과 실제 범위가 어긋난 자리다.

**추천: 결정 필요.** 계약 근거를 찾지 못했고(미확인), iOS 스와이프와의 충돌 여부도 미확인이다. **두 미확인을 먼저 닫아야 판정이 선다.** 다만 상수 이름의 `MOBILE_` 접두사가 실제 범위와 어긋난 것은 미확인과 무관하게 고칠 대상이다.

---

## 17. 데스크톱 설정 패널 hover 열기 — 1,024px 이상 + hover 가능할 때만

**무엇을 하는가.** 넓은 화면에서 GNB 오른쪽 설정 아이콘에 마우스를 올리면 패널이 그냥 열린다. 마우스가 벗어나면 140ms 뒤에 닫힌다. 좁은 화면이거나 hover 가 없는 기기면 클릭해야 열린다.

**코드 규모.** `src/features/gnb/hooks/use-gnb-desktop-settings.ts` 111행 + 판정 `behavior.ts:8-13`(`DESKTOP_SETTINGS_HOVER_MIN_WIDTH = 1024`, `:2`) + 닫기 지연 `behavior.ts:3`(`140ms`) + 배선(`site-gnb.tsx:306-308`, `:319-324`). 테스트 `tests/unit/gnb-desktop-settings.test.ts`(행수 미확인).

**계약 근거.** §6.4 GNB Contract(`docs/req-landing.md:216-258`) — 이 hover 임계값을 규정하는 조항은 대조하지 못했다(**미확인**).

**표준 패턴으로 대체 가능한가.** 「hover 로 메뉴를 연다」는 데스크톱 관용이지만 **접근성 관점에서는 이미 권장에서 밀려난 패턴**이다. 다만 이 구현은 필요한 방어를 갖추고 있다 — 140ms 닫기 지연으로 포인터가 패널로 이동할 시간을 주고(`use-gnb-desktop-settings.ts:58-60`), 포커스로도 열리며(`site-gnb.tsx:319-324`), 클릭 토글도 있고(`:325`), `aria-expanded`/`aria-controls` 가 붙어 있다(`:316-317`). WCAG **1.4.13 Content on Hover or Focus**(AA)의 세 요건 중 Dismissible 은 `Escape`(`site-gnb.tsx:227-229`)로, Hoverable 은 140ms 지연으로, Persistent 는 명시적 닫기 조건으로 충족한다.

**대체하면 잃는 것.** hover 열기를 제거하면 데스크톱 사용자가 클릭 한 번을 더 한다. 그것뿐이다.

**모바일에 존재하는가 — 없다(대체물 있음).** `hoverOpenEnabled` 가 `viewportWidth >= 1024 && hoverCapable` 을 요구한다(`behavior.ts:8-13`). 모바일·태블릿은 14번의 드로어를 대신 쓴다. **주목할 점**: 이 판정은 폭과 hover 를 **둘 다** 보므로 15번과 함께 저장소에서 입력 방식을 제대로 고려한 소수 사례에 속한다. 다만 1,024px 라는 폭 조건이 추가로 붙는 이유는 문서에 없다 — 미확인.

**추천: 보존 권고.** WCAG 1.4.13 의 요건을 이미 충족하고, 대체 없는 진입 경로(클릭·포커스)가 함께 있으며, 모바일에는 별도 대체물이 있다. 리팩터에서 건드릴 이유가 없다. 다만 사용자 결정 2번을 적용할 때 `viewportWidth >= 1024` 조건을 유지할지는 한 줄 확인이 필요하다 — hover 가능한 1,000px 창에서는 지금 hover 열기가 꺼진다.

---

## 부록 A. 3분류 집계

| # | 항목 | 코드 규모 | 모바일 존재 | 추천 |
|---:|:---|---:|:---|:---|
| 1 | Hover intent + 스크롤 위조 방어 | 527행 | 없음 | 결정 필요 |
| 2 | 키보드 순차 확장 override | ~656행 | 부분(별도 구현) | **교체 권고** |
| 3 | 데스크톱 확장 모션 컨트롤러 | ~418행 | 없음 | 보존(단 `cleanup-pending` 결정 필요) |
| 4 | 모바일 카드 확장 생명주기 | ~778행 | 모바일 전용 | 결정 필요(제자리 확장 vs 시트) |
| 5 | HOVER_LOCK | ~60행 | 없음(계약상 배제) | **교체 권고**(모바일 잠금과 통합) |
| 6 | 제목 연속성 | 301행 | 없음 | 결정 필요(성능 실측 선행) |
| 7 | 그리드 지오메트리 | ~1,130행 | 부분(보정 갭만) | 보존(단 행 동결 결정 필요) |
| 8 | 행 위치별 transform-origin | 14행 | 무의미 | 보존 |
| 9 | 테마 전환 블러 원 2,500ms | 199행 | 있음 | **교체 권고**(duration) |
| 10 | 랜딩→목적지 전환 | ~547행 | 있음 | 보존(단 유령 GNB 결정 필요) |
| 11 | 동의 배너 회피 | ~91행 | 있음(비용 무한정) | **교체 권고** |
| 12 | 랜딩 키보드 진입 | ~152행 | 있음 | 결정 필요 |
| 13 | 모바일 backdrop 탭 닫기 | 100행 | 모바일 전용 | 보존(범위 확대) |
| 14 | GNB 모바일 드로어 | 160행 | 모바일 전용 | 교체(바깥 닫기 판정만) |
| 15 | Blog Read more hover 공개 | ~72행 | 있음(항상 표시) | 보존(결정 2번의 참조 구현) |
| 16 | 모바일 테스트 뒤로가기 | 104행 | 공통(이름만 모바일) | 결정 필요(미확인 2건 선행) |
| 17 | 데스크톱 설정 hover 열기 | ~111행 | 없음(대체물 있음) | 보존 |

## 부록 B. 이 목록이 드러낸 구조적 사실 넷

**① 「모바일에 없다」가 5건이고, 그 5건의 합이 1,563행이다**(1·3·5·6·17). 이 코드는 모바일 사용자에게 아무 가치가 없을 뿐 아니라, 사용자 결정 2번(터치 태블릿을 입력 방식 기준으로 통일)이 적용되면 커버하는 기기 집합이 더 줄어든다.

**② 판정 축이 둘로 갈려 있고, 그것이 터치 태블릿 구멍의 유일한 원인이다.** `isMobileViewport`(폭 ≤767)와 `interactionMode`(폭 + hover capability)가 공존하며, 닫기 수단(X·backdrop)이 전자에만 묶여 있다(4번). 15·17번은 후자를 써서 올바르게 동작한다 — **고쳐야 할 것은 새 로직이 아니라 축의 선택이다.**

**③ 같은 문제를 두 번 푼 자리가 최소 넷이다.** HOVER_LOCK 과 `mobileInteractionLocked`(5번) · 데스크톱 모션 3상과 모바일 생명주기 4상(3·4번) · 제목 연속성의 측정 분할과 스냅샷 폴링(6번) · 두 backdrop 의 서로 다른 탭 판정(13·14번). 사용자 결정 4번의 0단계가 겨냥할 실제 표적이 이 넷이다.

**④ 계약 근거가 없는 인터랙션이 최소 셋이다**(9·16·17). 그중 9번(2,500ms)은 **단위 테스트 한 줄만이 그것을 지키고 있다** — 그 테스트는 값이 옳음이 아니라 값이 변하지 않음만 고정한다. 계약이 없다는 것은 개정에 승인이 필요 없다는 뜻이므로, 이 셋은 사용자 결정 1번과 무관하게 먼저 움직일 수 있는 항목이다.
