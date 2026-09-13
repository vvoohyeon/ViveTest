# 렌즈: over-specification — 초정밀 명세가 더 나은 표준 UX 를 막는 지점

대상: `docs/req-landing.md`(1147행 전수) · `docs/req-test.md`(1319행 전수) · 보조로 `docs/design/design.md`(444행) · `docs/req-test-plan.md`(398행 훑음). 저장소: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (HEAD `a5aec95`, 읽기 전용 — `git status --porcelain` 빈 출력으로 무변경 확인). 모든 조항 인용은 원문을 열어 행 번호를 확인했고, 모든 구현 주장은 소스를 열어 `file:line` 으로 고정했다.

## 판정 기준

이 렌즈는 「조항이 틀렸다」를 찾지 않는다. 조항이 **지키려던 것은 옳은데 수단까지 못박아 더 나은 수단을 배제했거나, 당시 손으로 정한 수치가 표준값과 어긋났거나, 데스크톱 hover 모델을 전제로 쓰여 터치에 어색하거나, 동작과 인터랙션을 한 문장에 묶어 인터랙션만 고칠 수 없거나, 예외가 쌓여 원래 의도를 읽을 수 없게 된」 지점을 찾는다. 그래서 모든 항목은 **「이 조항이 지키려던 것」 → 「그것을 더 잘 지키는 새 문장」** 형태로 쓴다. 조항을 지우자는 제안은 하나도 없다.

`basisKind` 는 근거의 종류다 — `norm`(WCAG 등 측정 가능한 규범) · `pattern`(iOS HIG / Material 3 / 모바일 웹 관행) · `internal-inconsistency`(문서·코드가 서로 어긋남) · `over-specification`(수단 못박음) · `performance` · `i18n` · `design-md` · `measurement`.

---

## 1. `mobile-close-paths-enumerated` — 닫는 방법을 열거해서, 터치 태블릿에는 닫는 방법이 0개가 됐다 · blocker

**조항.** `docs/req-landing.md:632` 「닫기 경로는 `X 버튼` 또는 `카드 외부(backdrop) 탭`만 허용한다.」 같은 계약이 세 곳에서 이 열거를 보강한다 — `docs/req-landing.md:582` 「Mobile card-root Escape/blur는 이 Desktop/Tablet close 경로를 실행하거나 mobile state를 변경하면 안 된다」, `docs/req-landing.md:691` 「카드 disclosure 자체는 dialog로 취급하지 않는다」, `docs/design/design.md:428` 「Swipe-down close as authorized mobile expanded behavior」(§10 Never Reintroduce).

**지금 무엇이 일어나는가.** 열거가 만든 두 구멍이 실제로 열려 있다. ⑴ 닫기 X 와 backdrop 은 둘 다 `isMobileViewport`(폭 ≤767) 게이트 안에 있다 — X 는 `src/features/landing/grid/landing-grid-card.tsx:1236-1245` 가 `showMobileExpandedBody` 아래에서만 렌더하고, backdrop 은 `src/features/landing/grid/landing-catalog-grid.tsx:198-205` 가 `mobileBackdropBindings.active` 일 때만 렌더한다. hover 없는 900×1200 태블릿은 `interactionMode='tap'` 이면서 `viewportTier='tablet'` 이므로 데스크톱 오버레이 경로를 타고, 그 오버레이에는 버튼이 0개이며 트리거는 `showDesktopExpandedShell && 'pointer-events-none'`(`landing-grid-card.tsx:1059`)으로 죽어 있다. 사전 실측의 「닫기 X 0개 · backdrop 0개 · 재탭 불가」가 정확히 이 두 줄의 귀결이다. ⑵ 키보드가 붙은 기기에서 Escape 는 계약상 no-op 이다(`req-landing.md:582`) — 코드도 그대로여서 `src/features/landing/grid/use-landing-interaction-controller.ts:431` 이 `isMobileViewport` 면 즉시 반환한다.

**이 조항이 지키려던 것.** 「탭 한 번이 열기와 닫기를 동시에 뜻해 사용자가 자기 입력의 결과를 예측할 수 없게 되는 것」을 막으려는 것이었다. `req-landing.md:623-624` 가 같은 목적을 이미 따로 적는다 — 「단일 pointer/touch 시퀀스에서 동일 카드 상태 전이는 최대 1회」, 「OPENING 이 시작된 동일 시퀀스에서 즉시 CLOSING 으로 역전 금지」. 즉 보호하려는 성질은 **닫기 수단의 개수**가 아니라 **한 제스처 = 한 전이**다.

**어떻게 다시 쓰나.** 열거를 성질로 바꾼다. 「Expanded 는 **명시적 dismiss 어포던스**(닫기 컨트롤)를 상시 노출해야 하고, **그 어포던스 밖의 dismiss 경로를 최소 하나 이상** 제공해야 한다. 어떤 dismiss 경로도 그것을 연 제스처와 같은 시퀀스 안에서 발화하면 안 된다(§8.5 의 단일-시퀀스 규칙이 이를 소유한다). 입력 방식별 최소 집합: 포인터/터치 = 닫기 컨트롤 + 카드 밖 탭, 키보드 = `Escape`, 플랫폼 back 제스처가 있는 환경 = 시스템 back. 스와이프 다운은 dismiss 경로로 허용하되, 임계 이하 드래그는 원위치로 되돌아가야 하고 스크롤 가능한 콘텐츠 최상단에서만 시작할 수 있다.」 그리고 `design.md:428` 의 「Never Reintroduce」 항목은 삭제가 아니라 **사실에 맞게 정정**한다 — `docs/decision-register.md:104,108`(BQ-11)은 「swipe-down 은 **미결정**이므로 어떤 wave 에도 포함 금지」라고 적혀 있지 「영구 금지」가 아니다. 미결정이 §10 로 옮겨지면서 「never」가 됐다. §10 에서 내리고 BQ 로 재등재해 결정 대상으로 되돌린다.

**규범 근거.** WCAG 2.1.1 Keyboard (A) — 키보드로 도달·조작 가능한 기능은 키보드로 빠져나올 수 있어야 한다. iOS HIG *Sheets*: 시트는 드래그 dismiss 와 명시적 Close 를 함께 갖는다. Material 3 *Bottom sheets*: drag handle + swipe-down + scrim tap.

**게이트.** `tests/e2e/transition-telemetry-smoke.spec.ts:664`(`assertion:B14-mobile-close-*`) · `tests/unit/landing-mobile-lifecycle.test.ts` · `tests/unit/landing-mobile-backdrop-gesture.test.ts` · `docs/req-landing.md:1074`(§14.2 항목 14) · `scripts/qa/check-blocker-traceability.mjs`.

---

## 2. `mobile-expanded-in-flow-mandate` — 「제자리에서 커진다」를 계약으로 못박아 778줄의 전용 기계가 생겼다 · blocker

**조항.** `docs/req-landing.md:625` 「Expanded는 in-flow 위치를 유지하며 top jump를 금지한다」 · `:626` 「OPENING/CLOSING transition window 동안 활성 카드 상단 y-anchor(뷰포트 기준)는 편차 없이 유지되어야 한다」 · `:634-635` 진입 직전 높이 snapshot 을 기록해 닫힘 시 `0px` 오차 복귀를 강제하고 그 복귀 완료 **이전에는 `NORMAL` terminal 확정을 금지** · `:637` 「분리된 별도 카드가 돌출되는 듯한 강한 불연속 전이를 금지한다」 · `:639` 「content-fit 높이 계산은 런타임 실측(`from px -> to px -> auto`) 또는 동등 정확도 방식으로 수행한다」 · `:652` 「y-anchor 규칙은 … 예외를 허용하지 않는다」.

**지금 무엇이 일어나는가.** 이 여섯 줄이 모바일 전용 기계 **778줄**을 만들었다 — `use-mobile-card-lifecycle.ts`(287) · `mobile-lifecycle.ts`(139) · `use-mobile-restore-polling.ts`(120) · `use-mobile-backdrop-gesture.ts`(100) · `use-mobile-transient-shell.ts`(57) · `mobile-card-lifecycle-dom.ts`(48) · `use-mobile-scroll-lock.ts`(27). 이 기계가 하는 일은 전부 「제자리 복귀」의 파생물이다: `captureMobileSnapshot()` 이 카드와 제목의 `getBoundingClientRect()` 를 찍고(`mobile-card-lifecycle-dom.ts:4-28`), `isMobileSnapshotRestoreSettled()` 가 높이와 제목 오프셋을 ±1px 로 대조하며(`:30-47`), rAF 폴링이 최대 30 프레임까지 그것을 기다린다(`use-mobile-restore-polling.ts:10`). 그리고 `:639` 의 「런타임 실측」 요구가 CSS 로 **레이아웃 속성을 애니메이션하게** 만들었다 — `src/features/landing/grid/landing-grid-card.module.css:527-553` 의 `@keyframes landing-card-mobile-open-shell`/`-close-shell` 이 `left` 와 `width` 를 보간한다. 매 프레임 리플로이며, 모바일 열기/닫기가 전부 이 경로를 탄다.

**내부 모순.** 같은 문서 `docs/req-landing.md:754` 가 「Expanded 관련 모션은 transform/opacity 중심으로 구성한다」고 요구한다. §8.3:578 이 「정적 외곽 카드+내부 콘텐츠만 scale 구조」를, §8.4:598 이 「inner counter-scale, surface/body 단독 width 조정」을 각각 금지해 transform 으로 갈 수 있는 길을 닫아 두었으므로, 모바일은 §11.2 를 지킬 수단이 남아 있지 않다. 요구와 금지가 서로를 상쇄한다.

**이 조항이 지키려던 것.** 둘이다. ⑴ **연속성** — 눌린 카드와 펼쳐진 면이 같은 것으로 읽혀야 한다(`:637`). ⑵ **복귀 안정성** — 닫은 뒤 사용자가 있던 자리로 정확히 돌아와야 한다(`:633-635`). 둘 다 옳고, 둘 다 「in-flow 로 커진다」는 수단을 요구하지 않는다.

**어떻게 다시 쓰나.** 수단을 결과로 바꾼다. 「Expanded 진입·이탈은 ⑴ **원본 카드와의 시각적 연속성**(공유 요소 — 최소한 제목 — 이 두 상태 사이에서 끊기지 않고 이어져야 한다)과 ⑵ **복귀 정확성**(닫힌 뒤 문서의 스크롤 위치와 원본 카드의 뷰포트 좌표가 진입 직전과 같아야 하며, 그 판정은 `NORMAL` terminal 의 선행 조건이다)을 만족해야 한다. 이 두 성질을 만족하는 한 표현 형식(in-flow 확장 · 바텀시트 · 전용 상세 화면)은 구현자가 고른다. 높이·위치 전이는 레이아웃 속성(`left`/`width`/`height`)이 아니라 `transform`/`opacity` 로 표현해야 한다(§11.2).」 **바텀시트를 고르면 ⑵ 가 자동으로 성립한다** — 시트는 카드 기하를 건드리지 않으므로 복원할 기하 자체가 없고, 778줄 중 스냅샷·폴링·transient shell·복원(총 ~530줄)이 요구사항과 함께 사라진다.

**게이트.** `tests/e2e/transition-telemetry-smoke.spec.ts:554-946`(`data-mobile-phase` 시퀀스 단언 다수) · `tests/unit/landing-mobile-lifecycle.test.ts` · `tests/unit/landing-mobile-scroll-lock.test.ts` · `docs/req-landing.md:1074`(§14.2 항목 14) · theme-matrix baseline 중 `theme-state-mobile-landing-test-expanded-*` 4장은 `data-mobile-phase="OPEN"` 을 기다리므로 형식이 바뀌면 **재생성이 아니라 케이스 교체** 대상이다(`tests/e2e/theme-matrix-manifest.json`).

---

## 3. `keyboard-contract-width-scoped` — 키보드 계약이 폭에 매여 있어, 결정 2 가 그 주어를 지운다 · blocker

**조항.** `docs/req-landing.md:472` 「Desktop/Tablet 카드 키보드 탐색은 아래 순차 규칙을 최우선으로 따른다. **Mobile lifecycle은 본 override 대상이 아니다.**」 그리고 §7.5 의 절 제목 자체가 `docs/req-landing.md:449` 「HOVER_LOCK Contract (**Hover-capable only**)」인데, 그 절 안에 hover 와 무관한 키보드 규칙이 들어 있다 — `:454-456`(비대상 카드 `tabIndex=-1` / `inert` / queued focus handoff), `:459-462`(키보드 모드 진입·종료 입력 정의).

**지금 무엇이 일어나는가.** 사용자 결정 2(hover 없는 기기는 768px 이상에서도 터치용 생명주기)를 적용하면 블루투스 키보드를 붙인 태블릿이 모바일 생명주기로 넘어온다. 그 순간 `:472` 한 문장 때문에 §7.6 의 키보드 순차 확장 계약 12줄(`:473-483`)이 그 기기에서 **주어를 잃는다**. 코드도 같은 축으로 갈라져 있다 — `src/features/landing/model/interaction-state.ts:99-108` 의 `resolveKeyboardFocusDisposition` 이 `isMobileViewport` 면 무조건 `'preserve-mobile'` 을 반환하고, `use-landing-interaction-controller.ts:431`(Escape) 과 `:455`(blur) 가 모바일에서 통째로 죽는다. 즉 결정 2 를 그대로 적용하면 키보드 태블릿은 **카드를 열 수도 닫을 수도 없다**.

**이 조항이 지키려던 것.** 「모바일 생명주기(OPENING→OPEN→CLOSING→NORMAL)는 데스크톱 close command 와 다른 기계이므로 두 경로를 섞지 말 것」이다. 옳다 — 섞으면 `:623-624` 의 단일-시퀀스 불변식이 깨진다. 지키려던 것은 **생명주기의 분리**이지 **키보드의 배제**가 아니다.

**어떻게 다시 쓰나.** 키보드를 폭·입력 방식 어디에도 종속시키지 않는 독립 절로 승격한다. 「**§7.x Focus & Keyboard Contract (입력 방식·뷰포트 무관, 전 표면)** — 키보드로 도달 가능한 모든 카드는 키보드로 확장·축소·진입할 수 있어야 한다. 확장 상태의 카드는 `Escape` 로 닫히고 포커스는 트리거로 돌아온다. 이 규칙은 활성 생명주기(데스크톱 close command / 모바일 lifecycle)가 무엇이든 성립하며, 각 생명주기는 이 계약을 **자기 방식으로 구현할 의무**를 진다.」 §7.6 에서 「Mobile lifecycle 은 본 override 대상이 아니다」는 「모바일 생명주기는 **이 절의 모션·dwell 규격**을 따르지 않는다」로 좁힌다 — 배제 대상이 키보드가 아니라 모션이었음을 문장이 말하게 한다. 그리고 §7.5 안의 키보드 규칙 `:454-456`·`:459-462` 를 이 새 절로 옮겨, hover 전용 절에는 hover 전용 규칙만 남긴다.

**규범 근거.** WCAG 2.1.1 Keyboard (A) · 2.1.2 No Keyboard Trap (A).

**게이트.** `scripts/qa/check-phase7-state-contracts.mjs`(`viewportWidth < 768` 리터럴) · `scripts/qa/check-phase8-accessibility-contracts.mjs` · `tests/unit/landing-interaction-state.test.ts` · `tests/unit/landing-interaction-controller-handlers.test.ts` · `tests/e2e/a11y-smoke.spec.ts` · `tests/e2e/state-smoke.spec.ts` · `tests/unit/contract-citations.test.ts`(§ 인용 실재 검사).

---

## 4. `aria-expanded-desktop-only` — disclosure 상태 노출을 폭으로 한정해 모바일에서 규범이 빈다 · blocker

**조항.** `docs/req-landing.md:705` 「**Desktop/Tablet** available Test trigger가 `aria-expanded`를 소유한다.」

**지금 무엇이 일어나는가.** 구현이 조항을 그대로 따른다 — `src/features/landing/grid/landing-grid-card.tsx:1198-1200` 이 `aria-expanded={!isMobileViewport && !isUnavailable ? isDesktopLogicallyExpanded : undefined}`. 모바일에서 트리거는 `<button>` 이면서 눌리면 상세가 펼쳐지는 disclosure 인데 상태 속성을 아예 갖지 않는다. 같은 표면에 `role="dialog"` 도 `aria-modal` 도 `aria-live` 도 없다(`src/features/landing/` 전체 grep 0건). 즉 모바일 확장은 시각적으로는 모달처럼 보이지만 AT 에는 「아무 일도 없었다」로 들린다.

**이 조항이 지키려던 것.** `docs/req-landing.md:706` 이 바로 다음 줄에서 말한다 — 「always-mounted desktop stage 의 `aria-hidden` 은 같은 logical disclosure 판정을 따른다」. 즉 「데스크톱은 오버레이가 항상 마운트돼 있으므로 시각 상태와 논리 상태가 갈리고, `aria-expanded` 의 진리값은 **논리 상태**를 따라야 한다」는 것이 이 조항의 실제 내용이다. `Desktop/Tablet` 은 그 논리를 설명하려고 붙은 주어이지 **모바일을 면제하려고 붙은 것이 아니다**.

**어떻게 다시 쓰나.** 「카드 확장을 유발하는 1차 트리거는 뷰포트·입력 방식과 무관하게 `aria-expanded` 를 소유한다. 그 값은 시각 상태가 아니라 **논리 disclosure 상태**를 따른다 — `opening`/`steady`/`handoff-target`/모바일 `OPENING`·`OPEN` 은 `true`, `idle`/`closing`/`cleanup-pending`/`handoff-source`/모바일 `CLOSING`·`NORMAL` 은 `false`. 확장된 상세가 배경 입력을 차단하는 표현(전체 화면 시트 등)을 쓰면 그 표면은 추가로 `role="dialog"` + `aria-modal="true"` + 포커스 트랩 + 열릴 때 포커스 이동 + 닫힐 때 포커스 복귀를 갖춰야 한다.」 마지막 문장의 참조 구현이 같은 저장소에 이미 있다 — `src/features/test/instruction-overlay.tsx:113-140`(트랩) · `:84-94`(포커스 복귀) · `:151-152`(dialog 시맨틱).

**규범 근거.** WCAG 4.1.2 Name, Role, Value (A) — 사용자가 설정할 수 있는 상태는 프로그램적으로 판별 가능해야 한다. ARIA APG *Disclosure* 패턴.

**게이트.** `scripts/qa/check-phase8-accessibility-contracts.mjs` · `tests/e2e/a11y-smoke.spec.ts`(390×844 axe 루프) · `tests/unit/landing-card-contract.test.ts` · `docs/req-landing.md:1065`(§14.2 항목 5).

---

## 5. `back-nav-deletes-destination-answer` — 제거 predicate 를 코드 수준으로 못박아, 같은 절의 다른 조항을 위반한다 · blocker

**조항.** `docs/req-test.md:527` 「제거 predicate: `Number(key) < nextIndex` — canonical index가 목적지 index보다 **엄격히 작은** 응답만 보존한다. 목적지 문항(index == nextIndex)과 현재 문항(index > nextIndex)의 응답 모두 제거된다.」 그리고 `:528` 이 그 결과를 예시로 확정한다.

**지금 무엇이 일어나는가.** 구현이 predicate 를 문자 그대로 두 곳에 복사했다 — `src/features/test/use-test-run-controller.ts:199-201`(`Object.entries(runState.answers).filter(([key]) => Number(key) < nextIndex)`) 과 `src/features/test/test-run-reducer.ts:181`(`filterAnswersBeforeIndex(state.answers, nextIndex)`). 그래서 「이전」을 한 번 누르면 **답변 두 개**(현재 문항 + 목적지 문항)가 사라진다. 확인 대화도, 되돌리기도, 사전 경고도 없고, 버튼은 `test-question-client.tsx:389-404` 에서 하단 46px 로 엄지 영역에 놓인다.

**내부 모순 두 건.** ⑴ 같은 절 `docs/req-test.md:513` 「이미 답변된 문항을 재방문하면 기존 답변 상태가 **선택된 상태로 표시되어야 한다**」 — 유일한 후진 경로가 목적지 답변을 지우므로 이 조항은 **구조적으로 성립할 수 없다**. ⑵ `docs/req-test.md:550` 「시스템은 마지막 사용자의 유효 응답을 **임의로 제거하거나 변경하면 안 된다**」 — 비-마지막 문항에서 정면으로 위반한다.

**이 조항이 지키려던 것.** tail reset 이다: 「앞 문항을 고치면 그 뒤 응답과 이전 derivation 산출물은 더 이상 유효하지 않다」(`:518-522`). 옳다. 하지만 tail 의 시작점이 **「목적지 문항 포함」**일 이유는 없다 — 목적지 문항은 아직 고쳐지지 않았다. 지우는 시점을 이동 시점이 아니라 **변경 확정 시점**으로 옮기면 같은 보호가 유지되면서 `:513` 과 `:550` 이 동시에 성립한다.

**어떻게 다시 쓰나.** 「후진 이동은 **어떤 응답도 제거하지 않는다** — 목적지 문항의 기존 응답을 선택된 상태로 표시한다(§3.9 재방문 규칙). tail reset 은 이동이 아니라 **응답 변경 확정**에서 발생한다: 문항 `i` 의 응답이 이전 값과 **다른 값으로** 확정되면, canonical index `> i` 인 모든 응답과 이전 derivation residue 를 원자적으로 폐기한다. 같은 값을 다시 선택하는 것은 변경이 아니며 tail 을 보존한다. tail 이 실제로 폐기되는 경우 사용자에게 폐기 범위(문항 수)를 확정 전에 알리고, 확정 이후 한 번의 실행 취소를 제공한다.」 구현은 predicate 를 `Number(key) <= i` 로 바꾸고 제거 시점을 `NAVIGATE_PREVIOUS` 에서 응답 기록 액션으로 옮기는 것이다.

**규범 근거.** WCAG 3.3.4 Error Prevention (Legal, Financial, Data) (AA) — 사용자가 제어하는 데이터를 수정·삭제하는 동작은 되돌릴 수 있거나, 확인을 받거나, 검토 가능해야 한다. 응답 집합은 `writeResponseSet()` 으로 storage 에 지속된다(`use-test-run-controller.ts:201`).

**게이트.** `tests/unit/test-run-reducer.test.ts`(존재 시) · `docs/req-test.md:1266` §12.2 항목 9(Answer Revision / Tail Reset) · `docs/req-test.md:1314` §12.3 traceability · `tests/e2e/theme-matrix-smoke.spec.ts:252`(`test-prev-button` 단언, 저장소 유일).

---

## 6. `test-error-copy-and-recovery-pinned` — 복구 카드 선정 알고리즘을 9줄 적고, 복구 자체는 0줄 적었다 · blocker

**조항.** `docs/req-test.md:845` 「메시지: `이 테스트에 진입할 수 없습니다`」 · `:846` 「`?variant=...` query가 있으면 차단된 variant를 함께 표시한다」 · `:848-856` 은 「복구 카드 선정 규칙」 4단계와 엣지 케이스 2건을 적는다(카탈로그 선언 순서 순회 → 완료한 것 제외 → 앞에서 2개 → 1개면 1개 → 0개면 랜딩 CTA).

**지금 무엇이 일어나는가.** 조항이 지정한 **문자열은 구현됐고, 복구는 구현되지 않았다.** `src/app/[locale]/test/error/page.tsx:29-31` 이 `이 테스트에 진입할 수 없습니다 (variant: ${variant})` 를 하드코딩 한국어로 만들어 12개 로케일 전부에 내보내고, raw variant id 를 사용자에게 보이는 제목 안에 끼운다. 같은 파일 `:44-56` 전체에 링크·버튼이 **0개**다. 그리고 이 페이지의 GNB 는 `context="test"`(`:40`)라서 `docs/req-landing.md:243` 「Mobile Test: 햄버거, 설정 레이어, 언어/테마 컨트롤을 노출하지 않는다」에 따라 Back + Timer 만 그린다 — 모바일에서 이 페이지를 벗어나는 길은 그 Back 하나뿐이다. `tests/e2e/routing-smoke.spec.ts:119,126` 이 그 한국어 문자열을 계약으로 고정해 두었으므로 문구를 고치면 게이트가 붉어진다.

**이 조항이 지키려던 것.** `docs/req-test.md:935` 가 같은 문서 안에서 이미 옳게 적는다 — 「recoverable error UX는 retry, 다른 테스트 선택, 홈 복귀 중 **적어도 하나 이상의 유효 경로를 제공해야 한다**」. §6.1 이 실패한 지점은 그 요구를 **카드 선정 알고리즘으로 번역**한 것이다. 알고리즘은 구현되지 않았고, 요구는 §6.1 안에 한 줄도 남지 않았다.

**어떻게 다시 쓰나.** 순서를 뒤집는다. 「**에러 복구 페이지는 최소 하나의 유효한 앞으로 가는 경로를 반드시 렌더한다** — 최소 구성은 「랜딩으로 돌아가기」 단일 CTA 다. 메시지는 로케일 메시지 카탈로그가 소유하며 문서는 문자열을 고정하지 않는다(문서는 의미만 고정한다: 「요청한 테스트에 진입할 수 없다」). 차단된 variant 식별자는 사용자에게 보이는 텍스트에 넣지 않는다 — 운영 진단이 필요하면 `data-*` 속성이나 콘솔로 내보낸다. 추천 카드는 **선택 사항**이며, 제공한다면 카탈로그 선언 순서 · 완료 이력 제외 · 최대 2개 규칙을 따른다.」 e2e 단언은 문자열 일치에서 `getByTestId('test-error-recovery')` 안의 **링크 존재**로 바꾼다.

**규범 근거.** WCAG 3.1.2 Language of Parts (AA) — `<html lang="en">` 아래 한국어 문장이 표시되며 `lang` 표시가 없다(`src/app/layout.tsx:23` 이 locale 을 그대로 쏜다). WCAG 3.3.3 Error Suggestion (AA).

**게이트.** `tests/e2e/routing-smoke.spec.ts:118-127` · `docs/req-test.md:1266` §12.2 항목 1 · `docs/blocker-traceability.json`(Ask-First) · `scripts/qa/check-blocker-traceability.mjs`.

---

## 7. `esc-aliased-to-consent-button` — `Esc` 를 버튼의 별칭으로 정의해, 취소 키가 개인정보 설정을 영구 저장한다 · blocker

**조항.** `docs/req-test.md:403` 「**`Esc`는 그 단계의 dismiss action과 같다.** instruction step에서는 secondary CTA(`deny_and_start`면 그대로 시작, `deny_and_abandon`·`keep_current_preference`면 랜딩으로) — action identity·consent write·redirect 는 **버튼을 눌렀을 때와 동일하다**. … secondary CTA가 없는 instruction step(`start` 하나뿐)에서는 `Esc`가 아무것도 하지 않는다.」

**지금 무엇이 일어나는가.** 구현이 그대로다 — `src/features/test/instruction-overlay.tsx:80` `const dismissAction = qualifierStep ? qualifierStep.onBack : onSecondaryAction;` 그리고 `:104-111` 이 `Escape` 에서 그것을 호출한다. `UNKNOWN + available` 조합의 secondary 는 `deny_and_abandon` 이고(`src/features/test/entry-policy.ts:173`), 그 액션의 효과는 `writesConsent: 'OPTED_OUT'` + `redirectHome: true`(`:69-74`)다. **즉 `Esc` 한 번이 영구 개인정보 거부를 저장하고 페이지를 떠난다.** 반대 방향도 나쁘다: secondary 가 없는 `[Start]` 단독 화면에서는 `Esc` 가 no-op 인데, 그 다이얼로그에는 닫기 버튼도 없다(`instruction-overlay.tsx:150-245` 전체에 close 컨트롤 0개). 모달의 유일한 출구가 primary CTA 다.

**이 조항이 지키려던 것.** 명문으로 적혀 있다 — 「동의를 묻는 문을 `Esc` 로 통과시키지 않는다」. 즉 **`Esc` 로 동의 결정을 회피해 테스트에 들어가는 것**을 막으려 했다. 옳다. 그런데 그 목적을 지키려고 고른 수단(「Esc = secondary 버튼」)이 정반대 사고를 만들었다 — 회피는 막았지만 **거부를 저장**하게 됐다.

**어떻게 다시 쓰나.** `Esc` 를 「아무 상태도 쓰지 않는 취소」로 되돌리고, 넘어갈 수 없다는 성질은 **다이얼로그를 닫지 않는 것**으로 지킨다. 「`Esc` 는 어떤 단계에서도 **consent 저장·`instructionSeen` 기록·runtime entry commit 을 실행하지 않는다.** qualifier step 에서 `Esc` 는 이전 단계로 돌아간다(Back/Cancel 과 동일하며 둘 다 상태를 쓰지 않는다). instruction step 에서 `Esc` 는 **진입 전 상태로 되돌아간다** — landing ingress 로 들어왔으면 랜딩으로, 딥링크면 다이얼로그를 유지한 채 아무것도 하지 않는다. 어느 경우에도 consent 는 `UNKNOWN` 으로 남는다. 모든 instruction/qualifier 다이얼로그는 `Esc` 와 무관하게 **명시적 닫기 컨트롤**(44×44 이상)을 헤더에 갖는다.」

**규범 근거.** ARIA APG *Dialog (Modal)*: 「Escape: Closes the dialog」 — 닫기는 취소이지 커밋이 아니다. Material 3 *Dialogs*: 「Dismissive actions … return the screen to its previous state」. WCAG 3.3.4 Error Prevention (AA) — 개인정보 설정 저장은 확인 가능하거나 되돌릴 수 있어야 한다.

**게이트.** `tests/e2e/qualifier-overlay.spec.ts` · `tests/e2e/consent-smoke.spec.ts` · `docs/req-landing.md:1078-1080`(§14.2 항목 20-22) · `docs/req-test.md:1266` §12.2 항목 3.

---

## 8. `entry-cta-bound-to-expanded-state` — 「진입은 A/B 에서만」이 IA 재설계를 계약 차원에서 봉쇄한다 · blocker

**조항.** `docs/req-landing.md:262` 「Normal/front 상태에서는 Start, A/B answerChoice 같은 entry CTA를 렌더링하지 않는다」 · `:269` 「Test entry는 Expanded의 `answerChoiceA/B`에서만 시작할 수 있다」 · `:274` 「Blog entry는 Normal card의 whole-card article link에서만 시작할 수 있다」 · `:671`(§8.6)이 `:269` 를 중복 못박고 · `:1105-1107`(§14.4 Visual Redesign Preservation)이 세 번째로 못박는다.

**지금 무엇이 일어나는가.** 390px 에서 랜딩은 3.76 화면이고 첫 카드 top 은 315px 다(사전 실측). 아래쪽 카드로 테스트를 시작하려면 **스크롤 → 확장 탭 → CTA 탭** 세 단계가 필요하고, 확장은 전체 화면을 덮으므로 카드 간 비교가 불가능하다. 모바일 관행의 정답(카드 자체에 `시작` CTA · 목록 아래 sticky CTA · 바텀시트 안의 primary action)은 전부 `:262` 한 줄에 막힌다.

**이 조항이 지키려던 것.** 두 가지다. ⑴ **landing pre-answer 의 출처 단일화** — 랜딩이 수집하는 입력은 `scoring1` preview 의 A/B 선택뿐이어야 하고(`:1108`), 그 값이 `card_answered` + landing ingress 를 만든다(`:1109`). ⑵ **Normal 상태의 시각 밀도 보호** — 카드마다 버튼이 붙으면 카탈로그가 버튼 밭이 된다. ⑴ 은 동작 계약이고 ⑵ 는 시각 판단이다. 그런데 한 문장이 둘을 묶어서, ⑵ 를 바꾸려면 ⑴ 을 건드리게 돼 있다.

**어떻게 다시 쓰나.** 둘로 가른다. **동작 계약(개정 대상 아님)**: 「landing 이 만들 수 있는 test entry 는 `scoring1` preview 의 A/B 선택 하나뿐이다. 그 선택은 pre-answer + landing ingress flag + `card_answered` 를 원자적으로 생성하며, 다른 어떤 landing 컨트롤도 pre-answer 없이 `/test/{variant}` 로 전환해서는 안 된다. Blog entry 는 pending transition + return scroll 만 만들고 ingress·pre-answer·`card_answered` 를 만들지 않는다.」 **인터랙션 계약(개정 자유)**: 「A/B 선택지를 사용자에게 어떤 표면에서 보여줄지는 표면별로 정한다 — 데스크톱은 Expanded 카드 안, 모바일은 바텀시트·전용 상세 화면·sticky CTA 중 무엇이든 쓸 수 있다. Normal 상태의 카드가 **선택지 없이 진입만 하는 CTA** 를 갖는 것은 금지한다(그 CTA 는 pre-answer 를 만들 수 없으므로 동작 계약을 깨뜨린다).」 마지막 문장이 ⑴ 을 완전히 보존하면서 바텀시트를 연다 — 시트를 여는 것은 진입이 아니라 선택지 제시이기 때문이다.

**게이트.** `scripts/qa/check-phase5-card-contracts.mjs` · `scripts/qa/check-phase10-transition-contracts.mjs` · `tests/e2e/grid-smoke.spec.ts` · `tests/e2e/transition-telemetry-smoke.spec.ts` · `docs/req-landing.md:1064,1070`(§14.2 항목 4·6) · `docs/req-landing.md:1104-1114`(§14.4 전체).

---

## 9. `mobile-subtitle-clamp-ban` — clamp 금지 한 줄이 모바일 스크롤 깊이의 주 원인이다 · major

**조항.** `docs/req-landing.md:287` 「Mobile Landing Normal subtitle: 전체 텍스트를 표시하고 clamp/ellipsis를 적용하면 안 된다.」 바로 위 `:286` 은 「Desktop/Tablet Landing Normal subtitle: 최대 2줄까지만 표시」다. 같은 데이터에 대해 **좁은 화면에만 clamp 를 금지**하는 비대칭이다.

**지금 무엇이 일어나는가.** 구현이 그대로다 — `src/features/landing/grid/landing-grid-card.tsx:379` `isMobileViewport ? 'overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-2'`. fixture 의 `ops-handbook` 블로그 부제는 en 기준 **371자**(`src/features/variant-registry/source-fixture.ts:194`)이고, 카드 내부 폭 326px · `--t-card-subtitle: 400 15px/1.45`(`src/app/globals.css:220`, 줄높이 21.75px)에서 라틴 평균 자폭 0.5em 가정으로 약 9줄 ≈ **196px**다. 데스크톱 2줄은 43.5px 이므로 **같은 텍스트가 가장 좁은 화면에서 152px 더 차지한다**. 실측 스크롤 깊이 390px 3.76 화면 / 1440px 1.31 화면의 비대칭에 이 한 줄이 직접 기여한다. 제목도 같은 비대칭을 갖는다(`:285` vs `:282`, 구현은 `landing-grid-card.tsx:408`).

**이 조항이 지키려던 것.** 모바일 블로그 카드에는 **disclosure 가 없다** — `docs/req-landing.md:267` 「Blog는 Expanded 슬롯을 렌더링하지 않는다」. 데스크톱은 hover 로 4줄까지 펼치지만(`:298`) 모바일은 펼칠 방법이 없으므로, 자르면 그 텍스트를 **카드에서 볼 방법이 사라진다**. 지키려던 것은 「모바일 사용자가 부제 전문에 도달할 수 있을 것」이다.

**어떻게 다시 쓰나.** 도달 경로를 카드가 아니라 상세 화면이 갖게 한다 — **그 화면은 이미 있다.** `src/features/blog/blog-destination-client.tsx:116` 이 `<p className={blogArticleBodyClassName}>{article.subtitle}</p>` 로 같은 텍스트 전문을 렌더한다. 그러므로: 「Normal subtitle 은 **모든 뷰포트에서** 최대 2줄 clamp + ellipsis 를 적용한다. 전문 도달 경로는 카드가 아니라 목적지가 소유한다 — Blog 는 `/{locale}/blog/{variant}`, Test 는 Expanded/시트의 상세 슬롯이다. 카드가 텍스트를 자를 때 그 텍스트에 도달하는 경로가 **같은 화면의 한 번의 입력 안에** 존재해야 한다(whole-card link 또는 확장 트리거).」 이 문장은 모바일 카드 높이를 ~150px 줄이면서 도달성을 한 줄도 잃지 않는다.

**규범 근거.** 측정: 위 계산은 폰트 advance 기반 유도값이며 브라우저 실측이 아니다(맵 `i18n-pressure` 와 동일 가정). 다만 clamp 유무의 방향성은 코드로 확정된다. i18n 압력: `fr` 1.30× · `de` 1.23× 확장률에서 같은 부제가 11~12줄이 된다.

**게이트.** `scripts/qa/check-variant-only-contracts.mjs:119-121`(`req-landing.md` 안의 `` `subtitle` ``·`4줄`·`재사용` 문자열 존재를 요구) · `tests/unit/landing-card-contract.test.ts`(clamp matrix) · `docs/req-landing.md:1089`(§14.2 항목 29) · theme-matrix 모바일 랜딩 baseline 12장.

---

## 10. `theme-two-state-lock` — 「수동 변경 이후 고정 저장」이 system-follow 로 돌아갈 길을 지운다 · major

**조항.** `docs/req-landing.md:249` 「테마 상태: 최초는 system-follow, 수동 변경 이후 `light|dark`를 localStorage에 고정 저장한다.」

**지금 무엇이 일어나는가.** 구현이 2상태다 — `src/features/gnb/components/settings-controls.tsx:94-97` 의 `orderedThemeOptions` 는 `['dark','light']` 또는 `['light','dark']` 두 원소뿐이고, `public/theme-bootstrap.js:8-11` 은 저장값이 `'light'|'dark'` 면 그대로 쓰고 아니면 `prefers-color-scheme` 를 읽는다. **한 번 누르면 system-follow 로 돌아갈 UI 가 없다.** 모바일에서 이것이 가장 아픈 이유는 OS 가 시간대에 따라 자동 전환하기 때문이다 — 낮에 라이트를 한 번 누른 사용자는 밤에도 라이트로 고정된다.

**이 조항이 지키려던 것.** 「사용자가 명시적으로 고른 테마는 다음 방문에서도 유지된다」와 「첫 방문은 시스템을 따른다」. 둘 다 옳고, 둘 다 「선택지가 2개」를 요구하지 않는다. 저장 키가 3값(`'light'|'dark'|'system'`)을 가질 수 있는데 계약이 2값으로 좁혀 버린 것이다.

**어떻게 다시 쓰나.** 「테마 선호는 `system | light | dark` 3상태다. 저장되지 않은 초기 상태는 `system` 이며 `prefers-color-scheme` 를 실시간으로 따른다. 설정 컨트롤은 **세 상태를 모두 선택 가능하게 노출**하고 현재 선택을 `aria-pressed`(또는 radiogroup 의 `aria-checked`)로 표시한다. `system` 선택 시 저장 키를 제거하거나 `'system'` 을 저장하며, 이후 OS 테마 변경은 리로드 없이 반영되어야 한다.」 `theme-bootstrap.js` 는 `stored === 'light' || stored === 'dark'` 분기를 그대로 두면 되므로 pre-hydration 계약은 무변경이다.

**규범 근거.** iOS *Settings › Display & Brightness*: Light / Dark / Automatic. Android 13+ *Display › Dark theme*: 스케줄 포함 3상태. 주요 웹 제품(GitHub, Notion, Slack)의 표준 3상태 패턴.

**게이트.** `tests/unit/gnb-theme-transition.test.ts` · `tests/e2e/gnb-smoke.spec.ts` · `tests/e2e/theme-matrix-smoke.spec.ts`(light/dark 2축 매니페스트 — `system` 추가 시 축 설계 결정 필요) · `docs/req-landing.md:1068`(§14.2 항목 8).

---

## 11. `result-loading-min-5s` — 계산이 끝나도 5초를 붙잡아 두는 하한 · major

**조항.** `docs/req-test.md:732` 「**로딩 화면**: 최소 5초(설정값) 로딩 화면 표시. **실제 계산이 빠르더라도 최소 5초 유지.** "뒤로 돌아가기" 옵션 제공.」 `:734-736` 이 그것을 commit 조건으로 못박고, `docs/req-test.md:1266` §12.2 항목 22 가 릴리스 차단 체크로 등재한다.

**지금 무엇이 일어나는가.** 아직 구현되지 않았다 — `docs/req-test.md:728` 이 「현재 live runtime에는 result derivation loading 단계가 없다」고 적고, `src/features/test/response-projection.ts` 는 export 0개 stub 이다. 즉 **지금 고치면 코드 비용 0**이고, 나중에 고치면 이미 만든 화면을 되돌려야 한다.

**이 조항이 지키려던 것.** 결과 도출이 **의미 있는 작업**으로 읽히기를 바란 것이다(즉시 튀어나오는 결과는 「대충 만든 것」으로 지각된다 — labor illusion). 목적 자체는 정당하다.

**어떻게 다시 쓰나.** 대기를 강제하는 대신 **진행을 보여주고, 사용자가 진행시킨다**. 「결과 도출은 계산 완료 즉시 커밋한다 — 인위적 최소 대기를 두지 않는다. 계산이 `400ms` 를 넘으면 진행 표시를 노출하고, `1s` 를 넘으면 결정적(determinate) 진행 표시와 「뒤로 돌아가기」를 함께 노출한다. 결과 도출을 하나의 사건으로 연출할 필요가 있으면 **시간이 아니라 사용자 입력으로** 구현한다 — 계산 완료 후 「결과 보기」 리빌 단계를 두고, 사용자가 그것을 누를 때 결과를 표시한다. 이 경우 리빌 단계 자체가 result screen entry commit 경계다.」 리빌은 재방문·재시도에서 즉시 통과 가능하므로, 5초 하한이 만드는 **반복 비용이 0**이 된다.

**규범 근거.** RAIL / Nielsen Norman Group 응답 시간 한계: 0.1s 즉각 · 1s 흐름 유지 · 10s 주의 이탈. 강제 대기는 이 셋 어디에도 근거가 없다. 모바일 특수 사정: 5초 동안 사용자가 앱을 백그라운드로 보내면 타이머 거동이 계약에 없다(§4.6 전체에 `visibilitychange` 언급 0회).

**게이트.** `docs/req-test.md:1266` §12.2 항목 22(`assertion:B22-result-derivation-loading`) · `docs/blocker-traceability.json`(Ask-First) · `scripts/qa/check-blocker-traceability.mjs`.

---

## 12. `focus-auto-expands-card` — hover dwell 모델을 키보드에 그대로 옮겨, 활성화 키를 무력화했다 · major

**조항.** `docs/req-landing.md:473` 「`Tab/Shift+Tab`으로 available Test 카드에 포커스가 도달하면 pending pointer intent를 취소하고 **dwell 없이 즉시 Expanded가 되어야 한다**」 · `:477` 「Test trigger의 `Enter/Space`는 동일 Test에 대한 **idempotent** `CARD_EXPAND`이며 URL 이동, 전환, pre-answer, telemetry, 포커스 이동을 일으키지 않는다.」

**지금 무엇이 일어나는가.** 표준 disclosure 가 뒤집혀 있다 — 포커스가 활성화 역할을 하고, 활성화 키(`Enter`/`Space`)는 의도적으로 no-op 이다(`src/features/landing/grid/use-card-keyboard-handler.ts:280-287`). 그 결과 키보드로 카탈로그를 훑는 동안 **카드가 하나씩 차례로 펼쳐졌다 닫히고**, 매 Tab 마다 레이아웃과 읽기 순서가 바뀐다. 카드 8장을 지나가려면 8번의 확장/축소 모션을 통과해야 한다.

**이 조항이 지키려던 것.** 명문으로는 「pending pointer intent 취소」다 — 즉 **hover 로 예약된 확장이 키보드 이동 뒤에 늦게 도착해 엉뚱한 카드를 여는 것**을 막으려 했다. 그것은 옳고, 그 목적은 「포커스가 확장을 **취소**한다」로 충분히 달성된다. 「포커스가 확장을 **수행**한다」까지 갈 이유가 없다.

**어떻게 다시 쓰나.** 「`Tab/Shift+Tab` 으로 카드에 포커스가 도달하면 **예약된 포인터 intent 를 즉시 취소**하고, 해당 카드는 **collapsed 상태로 포커스만 받는다**. 확장은 `Enter`/`Space` 가 소유하며 토글이다 — 열린 카드에서 다시 누르면 닫힌다. `Escape` 는 열린 카드를 닫고 포커스를 트리거에 남긴다. 확장된 카드에서 다음 `Tab` 은 A/B 선택지로 들어가고, 선택지를 모두 지나면 다음 enterable 카드로 나간다(§7.6 기존 규칙 유지). 포커스가 카드를 떠나면 그 카드는 닫힌다.」 이것이 ARIA APG Disclosure 그대로이며, `:477` 의 「entry side effect 없음」은 토글이 되어도 그대로 성립한다(진입은 여전히 A/B 만 소유).

**규범 근거.** ARIA APG *Disclosure (Show/Hide)*: 「Enter or Space: activates the disclosure control and toggles the visibility of the disclosure content.」 WCAG 3.2.1 On Focus (A) — 포커스만으로 문맥이 바뀌면 안 된다(확장은 문맥 변화로 판정될 소지가 있으며, 적어도 관용에 반한다).

**게이트.** `tests/e2e/a11y-smoke.spec.ts` · `tests/e2e/state-smoke.spec.ts` · `scripts/qa/check-phase8-accessibility-contracts.mjs` · `docs/req-landing.md:1065`(§14.2 항목 5) · `tests/unit/landing-interaction-state.test.ts`.

---

## 13. `comp-gap-bans-css-by-name` — 표준 CSS 해법을 이름으로 금지하고, 그 금지를 정규식으로 집행한다 · major

**조항.** `docs/req-landing.md:339` 「자동 여백/자동 분배 기반 보정(`margin-top:auto`, `justify-content: space-between`, filler flex, pseudo spacer 및 동등 메커니즘)을 보정 수단으로 사용하면 안 된다.」 `:321` 은 반대 방향으로 수단을 지정한다 — 「카드 shell은 row stretch를 수용해야 한다(`min-height: 100%` 또는 동등 규칙)」. `:377`(Verification 7)이 「auto-spacer 패턴 활성 `0건`」을 요구한다.

**지금 무엇이 일어나는가.** 금지가 **소스 텍스트 정규식**으로 집행된다 — `scripts/qa/check-phase6-spacing-contracts.mjs:85-95` 가 `margin-top\s*:\s*auto` · `space-between` · `flex-grow:1` 을 카드 CSS 블록에서 찾아 fail 시킨다. 그리고 모바일에서 이 전체 규칙은 **항상 무효**다 — `:332` 의 `needs_comp(card_i) = (natural_height_i < max(natural_height_row))` 는 1열에서 항상 false 이므로 모바일 전 카드가 `comp_gap=0` 이다. 즉 모바일은 이 17줄(`:327-343`)로부터 아무 이득도 얻지 못한 채 금지만 상속한다. 반대편 `:321` 의 `min-height: 100%` 는 `landing-grid-card.tsx:1058` 에 리터럴로 박혀 있고, `docs/design/design.md:427` 은 같은 문자열을 「Never Reintroduce」에 올려 두어(맥락은 expanded-overlay) 두 문서가 같은 선언을 요구하고 금지한다.

**이 조항이 지키려던 것.** BQ-31 의 사고다 — 자동 분배를 쓰면 같은 row 의 카드들이 **측정되지 않은 여백**을 갖게 되고, 그 여백이 row 높이에 되먹임되어 `needs_comp=false` 카드에도 잉여 공간이 생긴다. 지키려던 성질은 `:340` 에 이미 정확히 적혀 있다 — 「`needs_comp=false` 카드는 `subtitle -> tags` 구간의 추가 잉여 여백을 가져서는 안 된다(`comp_gap=0`과 동치)」.

**어떻게 다시 쓰나.** 수단 금지를 결과 금지로 바꾸고, 게이트를 텍스트 검사에서 기하 측정으로 바꾼다. 「same-row equal-height 보정은 **측정된 `comp_gap` 으로만** 표현한다. `needs_comp=false` 인 카드의 `subtitle` 하단과 `tags` 상단 사이 실측 거리는 전이 프레임을 포함해 `base_gap` 과 `0px` 오차로 일치해야 한다. 이 불변식을 만족하는 한 구현 메커니즘은 구현자가 고른다.」 `check-phase6` 의 정규식 3건은 삭제하고, 그 자리를 `tests/e2e/grid-smoke.spec.ts` 의 실측 단언(`subtitle` 하단 ~ `tags` 상단 거리 비교)으로 채운다 — 지금의 검사는 「금지된 문자열이 없다」만 보므로 **실제로 잉여 여백이 생겨도 통과한다**. 즉 이 교체는 금지를 완화하는 것이 아니라 게이트를 강화한다.

**게이트.** `scripts/qa/check-phase6-spacing-contracts.mjs:85-95` · `docs/req-landing.md:1071-1072`(§14.2 항목 10·11) · `tests/e2e/grid-smoke.spec.ts` · `tests/unit/qa-registry.test.ts`(검사 개체수를 산문과 대조).

---

## 14. `tag-row-single-line-nowrap` — 1줄 nowrap + 56px tail 이 337줄의 측정 기계를 요구한다 · major

**조항.** `docs/req-landing.md:289` 「Normal tags 영역은 1줄 슬롯과 nowrap을 유지한다」 · `:290` 「BQ-32: 마지막 가시 태그만 scoped border-box `--tag-min-width:56px`까지 말줄임할 수 있다. 자연 너비가 56px 이하인 짧은 태그는 전체 표시 또는 숨김만 허용하고, 다음 tail의 필수 폭이 부족하면 suffix를 우측부터 숨긴다」 · `:291` 「JS는 settled/target width에서 가시 prefix count만 결정해야 한다」 · `:293` 「숨긴 tag suffix는 public DOM/a11y tree에서 unmount해야 한다. 측정 probe는 `aria-hidden` + `inert`여야 하고 …」.

**지금 무엇이 일어나는가.** `src/features/landing/grid/use-card-inline-geometry.ts` 337줄이 이 규칙 하나를 위해 존재하고, 카드마다 **ResizeObserver 2개**를 단다(`:147-148` 루트, `:252-254` 태그 행). 카탈로그 8장 기준 16개다. 모바일에서 이 기계의 산출물은 「몇 개를 보여줄까」 하나인데, 그 답은 1열 그리드에서 카드 폭 = 컨테이너 폭이라 CSS 가 직접 알 수 있는 값이다. 그리고 **숨긴 태그는 사용자에게 도달 경로가 없다** — unmount 되므로 스크롤도 확장도 없다.

**이 조항이 지키려던 것.** `:293` 이 명시한다 — 「숨긴 suffix 가 AT 에 남으면 스크린리더가 보이지 않는 태그를 읽는다」. 그것이 CSS 만으로 풀 수 없는 진짜 제약이고, 그래서 JS 측정이 들어왔다. 즉 지키려던 것은 **「보이는 것과 들리는 것의 일치」**다.

**어떻게 다시 쓰나.** 「숨기지 않으면 일치 문제가 사라진다」는 방향으로 뒤집는다. 「Normal tags 행은 **모든 태그를 렌더**하며 잘라내지 않는다. 폭이 부족하면 표면이 다음 중 하나를 고른다 — ⑴ 가로 스크롤 행(`overflow-x: auto` + 스크롤 스냅, 모든 태그가 스크롤로 도달 가능하고 AT 에 그대로 노출된다), ⑵ 최대 2줄 wrap 후 넘치는 것만 숨김. ⑵ 를 고르면 숨긴 태그는 public DOM/a11y 트리에서 unmount 해야 하며, 이때만 가시 개수 판정이 필요하다. 어느 경우에도 unavailable `coming soon` 태그는 첫 번째 가시 항목으로 유지된다(§9.3). `--tag-min-width` 같은 tail 말줄임 규격은 ⑵ 를 고른 표면에만 적용한다.」 모바일이 ⑴ 을 고르면 337줄의 측정과 16개의 ResizeObserver 가 모바일 경로에서 사라지고, 데스크톱은 현행 ⑵ 를 그대로 유지한다.

**규범 근거.** WCAG 1.4.10 Reflow (AA) — 320px 에서 2차원 스크롤 없이 콘텐츠를 제공해야 하며, 가로 스크롤 **컨테이너**는 허용된다(페이지 전체 가로 스크롤만 금지). iOS/Material 의 chip group 표준: 가로 스크롤 또는 wrap.

**게이트.** `scripts/qa/check-phase5-card-contracts.mjs` · `tests/e2e/grid-smoke.spec.ts`(12 locale tag-fit) · `docs/req-landing.md:1087-1088`(§14.2 항목 27·28) · `tests/unit/landing-card-contract.test.ts`.

---

## 15. `auto-scroll-correction-blanket-ban` — 「자동 보정 스크롤 금지」가 포커스 관리까지 닫았다 · major

**조항.** `docs/req-landing.md:641` 「**자동 viewport 보정 스크롤을 금지한다.** OPENING/CLOSING transition window 동안 page scroll lock을 적용하고, OPEN settled에서는 unlock을 유지한다.」 같은 금지가 `:1006`(§13.8 return restoration)에도 있다.

**지금 무엇이 일어나는가.** 금지가 완전히 지켜졌다 — `src/` `public/` 전체에서 `scrollIntoView` · `scroll-margin` · `scroll-padding-top` grep **0건**이다. 그 결과 sticky GNB(모바일 56px, `src/features/gnb/site-gnb.tsx:38` z-1100) 아래로 포커스가 들어가도 아무것도 밀어내지 않는다. 모바일 확장 카드 안의 sticky 헤더(`landing-grid-card.tsx:286-287` `sticky top-0 z-[4]`)도 같은 문제를 카드 내부에서 반복한다. 그리고 OPEN 동안 스크롤이 풀려 있으므로(`src/features/landing/grid/use-mobile-scroll-lock.ts:5-7` 이 OPENING/CLOSING 에만 잠근다) 사용자는 확장 카드를 화면 밖으로 스크롤할 수 있는데, backdrop 은 `fixed inset-0`(`landing-catalog-grid.tsx:30-31`)이라 화면은 계속 어둡다.

**이 조항이 지키려던 것.** 「열림·닫힘 순간에 브라우저나 앱이 스크롤 위치를 멋대로 바꿔 사용자가 보던 곳을 잃는 것」이다. 그것은 `:626` 의 y-anchor 규칙과 `:633` 의 「현재 page scroll 위치 유지」가 이미 각각 소유하고 있다. `:641` 의 금지는 그 둘의 중복이면서, **포커스를 보이게 하려는 스크롤**까지 함께 막았다.

**어떻게 다시 쓰나.** 금지의 대상을 「사용자가 요청하지 않은 스크롤」로 좁히고, 포커스 스크롤을 명시적으로 예외로 연다. 「사용자 입력 없이 발생하는 스크롤 위치 변경을 금지한다. **예외**: 키보드 포커스가 sticky/fixed 표면에 가려지는 경우, 그 요소가 완전히 보이도록 최소 거리만큼 스크롤하는 것은 허용하며 권장한다. 그 처리는 명령형 스크롤 대신 선언형(`scroll-margin-top` / `scroll-padding-top`)으로 구현해 브라우저의 기본 포커스 스크롤에 맡긴다. 값은 해당 컨텍스트의 sticky 표면 실높이 이상이어야 한다.」 구현은 `src/app/globals.css` 에 `html { scroll-padding-top: var(--gnb-height) }` 한 줄 + 모바일 확장 컨테이너에 같은 성질을 주는 것이다.

**규범 근거.** WCAG 2.4.11 Focus Not Obscured (Minimum) (AA, WCAG 2.2) — 포커스된 요소가 저작자 콘텐츠에 의해 완전히 가려지면 안 된다. 이 저장소에는 이 SC 에 대응하는 조항도 검사도 없다(axe 기본 룰셋에도 없다).

**게이트.** `tests/e2e/a11y-smoke.spec.ts` · `tests/e2e/gnb-smoke.spec.ts` · `docs/req-landing.md:1074`(§14.2 항목 14) · theme-matrix baseline 전량(스크롤 위치 변화는 스냅샷을 흔든다).

---

## 16. `consent-banner-raf-avoidance` — 「교차하는 동안에만 비켜선다」가 OPEN 내내 도는 rAF 루프를 만든다 · major

**조항.** `docs/req-landing.md:609` 「카드 레이어 밖의 뷰포트 고정 표면(telemetry consent banner)도 Expanded 카드를 가리면 안 된다. 겹침은 스크롤 위치의 함수이므로 고정 기하 여유로 해소할 수 없고, **실제로 교차하는 동안에만** 그 표면이 비켜선다 — 교차하지 않는 동안 동의 UI 를 숨기는 구현을 금지한다. 비켜서는 방식은 문서 흐름의 예약 높이를 바꾸지 않아야 하며, 그 표면이 포커스를 품고 있으면 비켜서지 않는다(BQ-39).」

**지금 무엇이 일어나는가.** 한 불릿에 다섯 개의 조건이 쌓여 있고, 그 조합을 만족하는 구현이 rAF 루프다 — `src/features/landing/shell/consent-banner.tsx:186-191` 이 표식이 DOM 에 있는 동안 매 프레임 `runFrame()` 을 재예약하고, `:160-176` 이 배너와 모든 회피 대상의 `getBoundingClientRect()` 를 읽어 교차를 판정한다. **매 프레임 강제 동기 레이아웃**이다. 같은 파일 `:180-185` 의 주석이 설계 전제를 스스로 적는다 — 「확장은 hover 로 소멸하는 **일시** 상태이므로 루프도 그동안만 존재한다」. 그 전제가 모바일에서 거짓이다: 모바일 확장 본문도 같은 표식을 달고(`src/features/landing/grid/landing-grid-card.tsx:1229`), OPEN 은 사용자가 X 를 누를 때까지 지속된다. 즉 **가장 느린 기기에서 가장 오래 도는** 루프다.

**이 조항이 지키려던 것.** 「동의 UI 가 사라져 사용자가 동의를 철회·변경할 기회를 잃는 것」(그래서 숨김 금지)과 「배너가 확장 카드의 CTA 를 가리는 것」이다. 둘 다 옳다.

**어떻게 다시 쓰나.** 교차 판정을 프레임 루프에서 브라우저에 넘기고, 모바일에서는 겹침 자체가 생기지 않는 배치를 허용한다. 「viewport-fixed 표면은 확장된 카드의 상호작용 영역을 가리면 안 된다. 판정은 **프레임 폴링이 아니라 `IntersectionObserver`** 로 수행하며, 관찰 대상이 없으면 관찰기도 존재하지 않아야 한다. 표면이 포커스를 품고 있으면 비켜서지 않는다. 표면이 문서 흐름의 예약 높이를 바꾸면 안 된다. **모바일에서 확장 표면이 viewport 를 전부 차지하는 표현(전체 화면 시트 등)을 쓰는 경우, 그 표면이 열려 있는 동안 consent 배너를 그 표면 위가 아니라 아래 레이어에 두는 것으로 이 요구를 만족한 것으로 본다** — 이때 동의 UI 는 숨겨진 것이 아니라 가려진 것이며, 표면을 닫으면 즉시 돌아온다.」 마지막 문장이 「숨김 금지」의 의도(동의 기회 상실 방지)를 유지하면서 모바일에서 루프 자체를 없앤다.

**규범 근거.** 성능: `getBoundingClientRect()` 는 강제 동기 레이아웃을 유발하며, 매 프레임 호출 + 스크롤 동시 진행은 모바일에서 프레임 드롭의 전형적 원인이다. `IntersectionObserver` 는 정확히 이 용도의 표준 API 다. (실측 프레임 비용은 측정하지 않았다 — 미확인.)

**게이트.** `tests/e2e/consent-smoke.spec.ts` · `tests/e2e/grid-smoke.spec.ts` · `scripts/qa/check-phase9-performance-contracts.mjs` · `docs/req-landing.md:614`(§8.4 Verification 2).

---

## 17. `gnb-drawer-close-paths-and-pointerdown` — 닫기 수단을 열거해 드로어에 닫기 버튼이 없고, pointerdown 이 확정 시점이 됐다 · major

**조항.** `docs/req-landing.md:236` 「Mobile Landing: **backdrop 탭으로 닫고**, body scroll unlock은 close transition 종료 시점에 수행한다」 · `:237` 「메뉴 확장 상태에서 패널 외부 영역 입력은 **`pointer down` 시점에 닫힘을 시작해야 한다**」 · `:240` 「닫힘 완료 후 포커스는 햄버거 트리거로 복귀해야 한다」.

**지금 무엇이 일어나는가.** ⑴ 드로어에 **보이는 닫기 어포던스가 0개**이고, 코드 주석이 그 이유를 계약으로 지목한다 — `src/features/gnb/site-gnb.tsx:88-95`: 「It deliberately carries NO close control: the panel sits above the bar (z 1200 over 1100) and covers the hamburger, so while the drawer is open there is no visible close affordance — measured with elementFromPoint at the hamburger's centre, which returns the panel. … adding a focusable control here re-orders the drawer's tab traversal, which two @smoke keyboard-matrix checks fix.」 즉 **게이트가 닫기 버튼을 막고 있다.** ⑵ 닫힘이 pointerdown 에서 시작한다 — `src/features/gnb/hooks/use-gnb-mobile-menu.ts:90-105` 가 `pointerdown` 에서 `requestMobileMenuClose('outside')` 를 호출하고, 되돌리기는 10px 이상 이동해야만 발화한다(`src/features/gnb/behavior.ts:6,15-26`). 「눌렀다가 마음을 바꿔 손가락을 떼는」 입력은 되돌릴 수 없다. ⑶ 그리고 `document.body.style.touchAction = 'none'`(`use-gnb-mobile-menu.ts:141`)이 조상 체인 교집합으로 적용되어 **패널 자신의 `overflow-y-auto`(`site-gnb.tsx:87`)도 터치 팬이 막힌다** — 12 locale 칩이 세로로 넘치는 가로 모드·폰트 확대에서 닿을 수 없는 콘텐츠가 된다.

**이 조항이 지키려던 것.** `:236` 은 「모바일 드로어는 뒤를 탭해 닫는다」는 관용을 적으려 한 것이고, `:237` 은 「닫힘이 즉각적으로 느껴질 것」을, `:240` 은 포커스 복귀를 지키려 했다. 셋 다 옳다 — 그런데 `:236` 이 **유일 수단**으로 읽히면서 닫기 버튼이 계약 위반처럼 되었고, `:237` 이 **확정 시점**을 down 으로 못박으면서 취소 가능성이 사라졌다.

**어떻게 다시 쓰나.** 「모바일 메뉴는 **명시적 닫기 컨트롤**(44×44 이상, 패널 헤더)과 **backdrop 입력**을 모두 제공한다. backdrop 입력에 의한 닫힘은 **`pointerup` 에서 확정**하며, `pointerdown` 에서는 시각적 눌림 피드백만 시작한다. down 과 up 사이에 임계(`10px`) 이상의 이동이 있으면 스크롤 제스처로 분류해 닫힘을 취소한다. 닫힘 완료 후 포커스는 햄버거 트리거로 복귀한다. 패널 내부는 스크롤 가능해야 하며, 배경 스크롤 잠금이 패널 자신의 스크롤을 막으면 안 된다 — 잠금은 `body` 의 `touch-action` 이 아니라 `overflow` + 패널의 `overscroll-behavior: contain` 으로 구현한다. 닫기 컨트롤은 패널의 tab 순서 **첫 번째**에 놓는다(순서를 고정하면 keyboard-matrix 검사는 기대값만 갱신하면 된다).」

**규범 근거.** WCAG 2.5.2 Pointer Cancellation (A) — down-event 로 기능을 실행하려면 중단/취소 수단이 있어야 한다(현행의 10px 이동 취소는 경계선이며, up-event 확정이 정공법이다). iOS HIG / Material 3 모두 탭 확정을 up 에서 둔다. Material 3 *Navigation drawer*: 모달 드로어는 닫기 어포던스를 갖는다.

**게이트.** `tests/e2e/gnb-smoke.spec.ts`(keyboard-matrix 2건 — 주석이 지목한 그 검사) · `tests/unit/gnb-mobile-menu.test.ts` · `tests/unit/gnb-keyboard-targets.test.ts` · `docs/req-landing.md:1067`(§14.2 항목 7) · 모바일 메뉴 baseline 12장(`theme-state-mobile-*-menu-open-*`).

---

## 18. `settings-open-triple-path` — hover / focus / click 을 한 줄에 나열해 첫 탭이 열었다 닫는다 · major

**조항.** `docs/req-landing.md:224` 「Desktop 설정 레이어: 기본 열기 방식은 hover(`>=1024`), **포인터 감지 불가 환경에서는 focus/click fallback 허용**.」

**지금 무엇이 일어나는가.** 「focus/click」이 **둘 다** 배선됐다 — `src/features/gnb/site-gnb.tsx:319-323` 의 `onFocus` 가 `openSettingsImmediate` 를 호출하고 `:324` 의 `onClick` 은 항상 toggle 이다. hover 열기가 꺼진 구간(`shouldOpenDesktopSettingsByHover` 가 `viewportWidth >= 1024 && hoverCapable`, `src/features/gnb/behavior.ts:8-13`)에서 포인터로 트리거를 누르면 `pointerdown → focus(open) → click(toggle=close)` 순서가 되어 **패널이 열렸다 즉시 닫힌다**. 768–1023 폭의 마우스 창과 모든 터치 태블릿이 그 구간이다. E2E 는 `trigger.focus()` 를 직접 호출하고 설정 테스트 뷰포트가 1280/1440/1600 뿐이라 이 조합을 한 번도 돌리지 않는다.

**이 조항이 지키려던 것.** 「hover 가 없는 환경에서도 설정에 도달할 수 있을 것」이다. 옳다. 실패한 지점은 fallback 을 **집합**(`focus/click`)으로 적어 배타 관계를 말하지 않은 것이다. 그리고 열기 방식을 폭(`>=1024`)에 건 것도 이 렌즈의 항목이다 — 1024 는 공간이 아니라 「hover 를 쓸 만한 기기」의 대리 변수다.

**어떻게 다시 쓰나.** 「설정 레이어의 열기 방식은 **입력 방식 하나**가 정한다. `(hover: hover) and (pointer: fine)` 인 환경에서는 hover 로 열고, 그 외에는 **활성화(click/tap/`Enter`/`Space`)로만** 연다. 포커스는 어느 환경에서도 레이어를 열지 않는다 — 포커스 열기와 활성화 토글을 동시에 배선하면 첫 활성화가 열고 곧바로 닫는다. 트리거는 `aria-expanded` 를 소유한다. 닫기는 `Esc` · 외부 활성화 · 포커스 이탈로 수행한다.」 폭 항(`>=1024`)은 삭제하고 입력 방식만 남긴다 — 이것이 사용자 결정 2 의 최소 구현 지점 중 하나다.

**게이트.** `tests/e2e/gnb-smoke.spec.ts:373-377`(현행은 `trigger.focus()` 직접 호출 — 실제 클릭 경로 단언을 추가해야 이 결함이 잡힌다) · `tests/unit/gnb-desktop-settings.test.ts` · `docs/req-landing.md:1063`(§14.2 항목 3).

---

## 19. `hover-mode-anded-with-width` — 입력 방식 정의 안에 손으로 정한 폭이 들어 있다 · major

**조항.** `docs/req-landing.md:37` 「Hover-capable Mode | `width>=768` + `(hover:hover && pointer:fine)`」 · `:38` 「Tap Mode | `width<768` 또는 hover-capability 미감지」. 같은 정의가 §8.1 에 한 번 더 있다 — `:513-515`. `:185` 는 그 768 을 레이아웃 breakpoint 로도 쓴다.

**지금 무엇이 일어나는가.** 구현이 두 축의 AND 다 — `src/features/landing/grid/use-landing-interaction-controller.ts:71-77` 의 `resolveInteractionMode`. 그런데 **생명주기 판정은 폭 단독**이다(`:157` `const isMobileViewport = viewportTier === 'mobile'`, `src/features/landing/grid/layout-plan.ts:63-66` 이 `<=767`). 즉 문서가 정의한 두 축이 코드 안에서 이미 갈라져 있고, 900×1200 터치 프로브의 `tier=tablet, mode=tap, layer=desktop-overlay` 가 그 갈림의 직접 관측이다. 같은 경계가 저장소에 **네 가지 철자**로 존재한다 — `layout-plan.ts:1`(`<=767`) · `globals.css:326`(`min-width:768px`) · Tailwind `md:`(`>=48rem`) · Tailwind `max-[767px]:`(`width < 767px`, `src/features/test/instruction-overlay.tsx:26`). 마지막 것은 767px 을 제외하므로 정확히 767px 에서 JS 는 모바일이라 하고 CSS 는 아니라고 한다.

**이 조항이 지키려던 것.** 「hover 가 있다고 보고되지만 실제로는 터치인 기기를 걸러내는 것」이다 — 2010년대 하이브리드 기기 대응으로 폭을 보조 조건으로 붙이는 관행이 있었다. 오늘의 `(hover: hover) and (pointer: fine)` 는 그 자체로 충분히 신뢰할 수 있고, 폭 항은 순수한 오탐 요인만 남았다.

**어떻게 다시 쓰나.** 정의에서 폭을 떼고, 폭은 레이아웃 전용으로 좁힌다. 「**입력 축(1차)**: `Hover-capable` = `(hover: hover) and (pointer: fine)` · `Tap` = 그 외. 폭은 이 판정에 참여하지 않는다. **레이아웃 축(1차, 독립)**: `Mobile 0~767` · `Tablet 768~1023` · `Desktop >=1024` — 열 수·패딩·clamp 등 **공간 배분에만** 쓴다. **키보드 축(1차, 독립)**: §7.x Focus & Keyboard Contract 가 소유하며 앞의 두 축 어디에도 종속되지 않는다. 생명주기(확장 표현·닫기 경로·모션)는 **입력 축**이 정하고, 열 수·여백은 **레이아웃 축**이 정한다.」 그리고 「모든 표면은 위 경계를 단일 상수/토큰에서 읽어야 하며, 같은 경계를 두 번 적지 않는다」를 덧붙여 767/768 의 네 철자를 하나로 모은다.

**게이트.** `scripts/qa/check-phase7-state-contracts.mjs:73,77`(`viewportWidth < 768` · `matchMedia('(hover: hover) and (pointer: fine)')` 리터럴) · `tests/unit/shared-shell-gutter.test.ts:58-65`(gutter 단계 배열 `toEqual`) · `tests/unit/landing-grid-plan.test.ts` · `tests/unit/landing-card-contract.test.ts` · 390px 에서 도는 e2e 31케이스 전부(현재 `hasTouch`/`isMobile` 에뮬레이션 0건이므로 축을 바꾸면 「계약 위반이 아닌 이유」로 붉어진다).

---

## 20. `progress-percent-only` — 위치 표시를 금지해 남은 분량을 알 수 없다 · major

**조항.** `docs/req-test.md:683` 「진행 상태는 프로그레스 바와 퍼센트(%)로 표시한다. **문항 번호 텍스트(예: `Question N of M`)는 표시하지 않는다.**」

**지금 무엇이 일어나는가.** 구현이 그대로다 — `src/features/test/test-question-client.tsx:196,257-275` 가 `progressValue`(`"{percent}%"`, `src/messages/en.json:33`)와 바만 그린다. 문항 번호는 어디에도 없다. 그래서 사용자는 **남은 탭 수를 알 수 없다** — 12%는 60문항 중 7번째일 수도 8문항 중 1번째일 수도 있고, 그 차이가 「지금 할까 나중에 할까」를 가른다. 모바일에서 이것이 특히 아픈 이유는 한 화면 한 문항이라 위치 감각을 줄 다른 단서가 없기 때문이다(질문 화면은 390px 에서 스크롤이 0이고 뷰포트의 44%만 쓴다). 「이전」으로 돌아갔을 때 돌아온 자리를 식별할 랜드마크도 없다.

**이 조항이 지키려던 것.** `docs/req-test.md:684` 가 바로 다음 줄에서 말한다 — 「user-facing `Q1/Q2/...`가 필요한 경우 이는 **scoring order 기준으로만** 해석하며, progress denominator나 canonical response key에 재사용하면 안 된다」. 즉 막으려던 것은 **표시 번호가 canonical index 로 오인되어 telemetry·storage 축에 새어 들어가는 것**이었다. 그것은 옳고, 「표시하지 않는다」는 그 문제에 대한 과잉 처방이다 — 번호를 안 보여줘도 코드가 잘못된 축을 쓸 수 있고, 번호를 보여줘도 축은 분리될 수 있다.

**어떻게 다시 쓰나.** 「진행 표시는 **프로그레스 바 + 위치 텍스트**를 함께 노출한다. 위치 텍스트는 `answered scoring count` 가 아니라 **현재 scoring order / total scoring count** 를 쓴다. 이 표시 번호는 오로지 표시용이며 progress denominator · canonical response key · telemetry payload 의 어떤 index 축으로도 재사용하면 안 된다 — `attempt_start` 와 `final_submit` 은 canonical index 를, `question_answered` 는 scoring-order ordinal 을 각각 소유한다(§9.1). 표시 번호와 저장 축의 분리는 단위 테스트로 고정한다.」 금지를 **코드 경계**로 옮기면 사용자는 위치를 얻고 계약은 그대로 지켜진다.

**규범 근거.** 모바일 폼 관행: 다단계 폼의 진행 표시는 위치(step N of M)를 포함하는 것이 표준(Material 3 *Progress indicators* 의 stepper 사용 지침, iOS HIG *Progress indicators* — determinate 표시는 남은 작업량을 전달해야 한다). WCAG 2.4.8 Location (AAA) 의 취지와도 같은 방향.

**게이트.** `tests/e2e/theme-matrix-smoke.spec.ts`(`test-progress` baseline 4장 — 텍스트가 바뀌면 재생성) · `docs/req-test.md:1266` §12.2 항목 8 · `tests/unit/` 의 progress 계산 테스트.

---

## 21. `no-forward-control-in-runtime` — 「다음」을 자동 진행으로 대체해, 이미 답한 문항에서 전진할 길이 없다 · major

**조항.** `docs/req-test.md:679` 「사용자는 이전 문항으로 이동할 수 있다. **다음 문항 이동은 응답 확정 직후 자동 진행으로 처리한다.**」 · `:678` 「자동 이동은 **짧은 지연(현재 150ms) 동안 answer option을 잠그는 방식**으로 처리한다.」

**지금 무엇이 일어나는가.** 리듀서에 `NAVIGATE_NEXT` 가 없다 — `src/features/test/test-run-reducer.ts:44` 에 `NAVIGATE_PREVIOUS` 만 있고, 화면의 nav 행은 「이전」 하나 + 마지막 문항에서만 나타나는 「제출」뿐이다(`src/features/test/test-question-client.tsx:388-417`). `en.json:35` 의 `"next": "Next"` 키는 qualifier 라벨 override 에만 쓰인다. 그래서 **이미 답한 문항으로 돌아갔다가 앞으로 나오려면 같은 답을 다시 눌러야 한다**. EGTT landing ingress 는 이 상황에서 시작한다 — 랜딩에서 이미 답한 canonical 2 로 진입하므로(`src/features/test/bootstrap-state-resolver.ts:38-41`) 첫 화면부터 재답변이 유일한 전진 경로다. 반면 qmbti 는 seed 다음 문항으로 건너뛴다(`docs/req-test.md:341`) — 같은 제품 안에서 두 규칙이 다르다.

**이 조항이 지키려던 것.** 「선택 즉시 다음으로 넘어가 탭 수를 절반으로 줄이는 것」이다. 옳고, 모바일 관행에도 맞는다(Typeform·Google Forms 의 single-select 자동 진행). 실패한 지점은 자동 진행을 **유일한 전진 경로**로 만든 것이다 — 자동 진행은 「방금 답한 사람」에게 최적이고, 「이미 답한 화면에 서 있는 사람」에게는 경로가 아예 없다.

**어떻게 다시 쓰나.** 「응답이 **새로 확정될 때** 다음 미응답 scoring question 으로 자동 진행한다. 현재 문항에 **이미 유효한 응답이 있는 상태**(재방문·resume·landing ingress seed)에서는 자동 진행하지 않고, 대신 **「다음」 컨트롤을 노출**한다 — 이 컨트롤은 응답을 변경하지 않고 다음 문항으로만 이동한다. 「이전」과 「다음」은 같은 nav 행에 대칭으로 배치한다. 중복 입력 방지는 잠금 시간이 아니라 **멱등성**으로 구현한다 — 같은 문항에 대한 연속 확정은 한 번의 전이만 만든다. 시각적으로 확정을 알리는 짧은 지연은 허용하되 `200ms` 를 넘지 않으며, 그 동안에도 입력을 **차단하지 않고 마지막 입력을 채택**한다.」

**규범 근거.** 모바일 폼 관행: 되돌아간 단계에서 앞으로 나오는 경로가 없는 것은 wizard 안티패턴. 현행 150ms 잠금은 그 자체로는 짧지만, 잠금 방식(입력 무시)은 연타 시 **두 번째 탭이 사라진** 것처럼 느껴진다.

**게이트.** `src/features/test/use-answer-lock.ts:32`(기본 `delayMs = 150`) · `tests/unit/` 의 answer-lock 테스트 · `docs/req-test.md:1266` §12.2 항목 9 · `tests/e2e/theme-matrix-smoke.spec.ts:252`(`test-prev-button`).

---

## 22. `spring-overshoot-blanket-ban` — 근거 없이 기록된 전면 금지가 시트 모션의 표준을 막는다 · major

**조항.** `docs/req-landing.md:578` 「easing은 `ease-in-out` 계열로 통일한다. **spring/overshoot(탄성 튐)**, Expanded 전환/유지 중 alpha 애니메이션, 내부 이중 박스 시각, 정적 외곽 카드+내부 콘텐츠만 scale 구조를 금지한다.」 `:636` 이 모바일에서 같은 금지를 반복하고, `docs/design/design.md:105`(§4.8)와 `:374`(§8)가 「Banned: bounce, spring overshoot, parallax, card tilt」로 세 번째·네 번째로 적는다.

**지금 무엇이 일어나는가.** 금지의 **근거가 어느 문서에도 없다** — `docs/decision-register.md` 와 `docs/DECISIONS.md` 에서 `spring`/`overshoot` grep 0건이다. `design.md:105` 는 같은 불릿에서 `card tilt` 와 묶는데, tilt 는 `req-landing.md:16`(§1.3 Locked Decisions)이 별도로 금지한 항목이라 「과한 장식 모션을 한 묶음으로 치웠다」는 흔적으로 읽힌다. 그 묶음이 오늘 바텀시트 표준 모션을 막는다 — iOS 시트와 Material 3 bottom sheet 는 둘 다 spring 기반이고, 드래그 dismiss 에서 임계 미달 시 원위치로 **되돌아가는 동작 자체가 spring** 이다.

**이 조항이 지키려던 것.** 두 가지로 읽힌다. ⑴ **장식적 튐**(카드가 통통 튀는 bounce)이 제품 톤에 맞지 않는다는 시각 판단. ⑵ **단조성 위반** — `:638` 이 「content-fit 목표 높이까지 monotonic 이어야 하며 overshoot 를 금지한다」고 따로 적는데, 높이를 overshoot 하면 레이아웃이 목표를 넘었다 돌아오면서 아래 카드가 두 번 움직인다. ⑵ 는 진짜 제약이고 ⑴ 은 취향이다. 한 단어(`spring`)가 둘을 함께 금지하고 있다.

**어떻게 다시 쓰나.** 대상을 속성으로 가른다. 「**레이아웃에 영향을 주는 축**(높이·폭·위치가 형제 요소를 움직이는 경우)의 전이는 목표값까지 monotonic 이어야 하며 overshoot 를 금지한다. **레이아웃에 영향을 주지 않는 축**(`transform`·`opacity`, 그리고 자기 자신만 움직이는 오버레이/시트의 `translate`)에서는 임계 감쇠(critically damped) 이상의 spring 을 허용한다 — 가시적 bounce(목표를 넘어 되돌아오는 진동)는 금지한다. 드래그 dismiss 의 되돌림(rubber-band return)은 이 허용 범위 안이다. `prefers-reduced-motion` 에서는 모든 spring 을 단순 페이드로 축약한다.」 이 문장은 ⑵ 를 그대로 지키면서 ⑴ 의 톤 판단도 유지한다(bounce 는 여전히 금지).

**규범 근거.** Material 3 *Motion — Easing and duration*: expressive spring 이 표준 트랙 중 하나이며 bottom sheet 가 그것을 쓴다. iOS HIG *Sheets*: 드래그 dismiss 의 되돌림이 기본 동작. WCAG 2.3.3 Animation from Interactions (AAA) 는 reduced-motion 축약으로 충족된다.

**게이트.** `src/features/landing/grid/landing-grid-card.module.css`(keyframes 13개) · `scripts/qa/check-phase9-performance-contracts.mjs` · `tests/e2e/state-smoke.spec.ts:1212`(reduced-motion 180ms 단언) · `docs/design/design.md:105,374`(§4.8·§8 동시 개정, Ask-First `docs/design/ds/**` 는 별도).

---

## 23. `font-policy-two-locales` — 12 로케일 제품의 폰트 계약이 2개 언어만 규정한다 · major

**조항.** `docs/req-landing.md:303` 「폰트는 `ko`, `en` locale별로 각 1종의 대표 폰트를 허용하고 공통 fallback 체인을 사용한다.」 바로 위 `:302` 는 「동일 locale에서 Normal/Expanded 상태 간 대표 폰트 1종을 유지해야 하며 상태별 폰트 분기를 금지한다」다.

**지금 무엇이 일어나는가.** 제품은 12 로케일이다(`en kr zs zt ja es fr pt de hi id ru`). 폰트 바이너리를 직접 파싱한 결과(맵 `i18n-pressure` 의 cmap 파싱) Pretendard Variable 은 한자 0/20,992 · 데바나가리 0/128 이고, 실제 렌더 문자 중 fallback 으로 넘어가는 비율이 `zs` 85.5% · `zt` 85.6% · `hi` 81.5% · `ja` 34.3% 다. `ja` 는 **한 문장 안에서** 가나(Pretendard)와 한자(fallback)가 섞인다 — 그런데 `:302` 의 「대표 폰트 1종」은 **상태 간**에만 걸려 있어 이 혼합은 계약 위반조차 아니다. 즉 계약이 12 로케일 중 2개만 규정하고, 나머지 10개에서 일어나는 일에 대해 참·거짓을 말하지 못한다.

**이 조항이 지키려던 것.** 「같은 카드가 상태를 바꾸는 동안 글자꼴이 바뀌어 보이지 않을 것」(`:302`)과 「폰트 체인이 로케일마다 제각각이 되지 않을 것」(`:303`)이다. 둘 다 옳다.

**어떻게 다시 쓰나.** 규정 단위를 로케일에서 **문자 체계(script)**로 옮긴다. 「카드 타이포그래피는 동일 locale 에서 Normal/Expanded 상태 간 글자꼴이 바뀌면 안 된다. 폰트는 **script 별로 1종의 대표 폰트**를 선언하며, 각 script 는 그 script 의 문자를 **완전히 커버하는** face 를 첫 순위로 가져야 한다 — Latin/Cyrillic/Hangul/Kana · Han(Simplified) · Han(Traditional) · Devanagari 를 각각 선언한다. 한 문장 안에서 두 face 가 섞이는 것은 커버리지 결손이며, 릴리스 전에 각 locale 의 실제 문자 집합에 대해 커버리지를 검증한다. 공통 fallback 체인은 script 선언 뒤에 온다.」 검증은 이미 가능한 형태다 — 메시지 파일의 문자 집합과 폰트 cmap 을 대조하는 단위 테스트 하나로 게이트가 된다.

**규범 근거.** i18n: 같은 문장 안 face 혼합은 자형 높이·굵기가 어긋나 가독성을 떨어뜨린다. 추가로 `zs`/`zt` fallback 이 스택 순서(`src/app/globals.css:225`)상 일본어·간체 자형으로 잡힐 수 있다(미확인 — 실기 렌더 확인 필요).

**게이트.** `tests/unit/design-tokens-dark-parity.test.ts`(토큰 파리티) · `docs/design/ds/colors_and_type.css`(Ask-First, 저장소 밖 push 표면) · `docs/req-landing.md:1068`(§14.2 항목 8) · 신설 단위 테스트(커버리지 대조).

---

## 24. `instruction-overlay-form-pinned` — 「full-screen overlay」를 형식으로 못박고, 그 형식의 스크롤 계약을 안 적었다 · major

**조항.** `docs/req-landing.md:906` 「Desktop: centered card overlay. **Mobile: full-screen overlay.**」 · `docs/req-test.md:399` 「instruction은 별도 route가 아니라 `/test/{variant}` 위 overlay다.」 후자는 `:445`·`:825` 와 `docs/req-test.md:1272`(§12.2 #3, 릴리스 차단)에서 세 번 더 반복된다.

**지금 무엇이 일어나는가.** 형식은 구현됐고 형식의 필수 조건은 빠졌다. `src/features/test/instruction-overlay.tsx:145` 의 `fixed inset-0` 컨테이너와 `:26` 의 `max-[767px]:min-h-full … max-[767px]:pt-[88px]` 카드 **둘 다 `overflow` 선언이 없다**. instruction 본문 길이의 정본은 Sheets `instruction_*` 컬럼이라 상한이 없는데(`docs/req-test.md:115`), 넘치면 스크롤할 컨테이너가 없다. 같은 앱의 GNB 드로어는 `overflow-y-auto` · `overscroll-contain` · `[height:100dvh]` · `env(safe-area-inset-bottom)` 를 모두 갖는다(`src/features/gnb/site-gnb.tsx:87`) — **두 전체 화면 층이 같은 문제를 정반대로 다룬다.** 그리고 `:26` 의 `pt-[88px]` 는 모바일 분기인데 데스크톱 GNB 높이(88)를 쓴다(모바일 GNB 는 56px). 덧붙여 이 다이얼로그는 z-1050 이고 GNB 는 z-1100(`src/features/gnb/site-gnb.tsx:38`)이라 `aria-modal="true"` 인 채로 **GNB Back 이 터치로 도달 가능하다**.

**이 조항이 지키려던 것.** `docs/req-test.md:399` 의 목적은 「instruction 이 별도 URL 을 가져 뒤로가기·새로고침·딥링크에서 runtime 과 어긋나는 것」을 막는 것이다. 옳다. `req-landing.md:906` 의 목적은 「좁은 화면에서 instruction 이 작은 카드로 갇히지 않을 것」이다. 옳다. 둘 다 **형식**으로 표현되어 형식이 요구하는 나머지 계약(스크롤·레이어·safe-area)이 따라오지 않았다.

**어떻게 다시 쓰나.** 형식을 성질로 바꾸고, 성질이 요구하는 것을 같은 자리에 적는다. 「instruction/qualifier 단계는 **`/test/{variant}` 의 상태이며 별도 URL 을 만들지 않는다** — 그 상태에서 새로고침하면 같은 상태로 복원되어야 한다. 표현 형식은 표면이 고른다(centered dialog · full-screen sheet · 전용 스텝 화면). 어떤 형식을 고르든 다음을 만족해야 한다: ⑴ 내용이 뷰포트를 넘으면 **그 표면 안에서 스크롤**되며 배경으로 스크롤이 체이닝되지 않는다(`overscroll-behavior: contain`), ⑵ 상단/하단 safe-area 를 침범하지 않는다, ⑶ 페이지의 어떤 고정 표면보다 **위 레이어**에 있고 그 아래 표면은 `inert` 다, ⑷ primary CTA 는 스크롤과 무관하게 항상 도달 가능하다(하단 고정 또는 스크롤 컨테이너 밖).」 ⑷ 는 부수적으로 현재의 배치 결함도 고친다 — 지금 CTA 는 `justify-end` 로 화면 위쪽 1/4 우측에 놓여 한 손 도달 영역 밖이다(`instruction-overlay.tsx:227`).

**규범 근거.** WCAG 1.4.10 Reflow (AA) — 320px 에서 콘텐츠 손실 없이 제공. WCAG 2.4.11 Focus Not Obscured (AA) — GNB 가 다이얼로그 위에 있어 포커스가 가려질 수 있다. ARIA APG *Dialog (Modal)*: 배경 콘텐츠는 비활성이어야 한다. iOS HIG / Material 3: primary action 은 하단 도달 영역.

**게이트.** `tests/e2e/qualifier-overlay.spec.ts`(14케이스, 전부 1280px — 모바일 커버리지 0) · `tests/e2e/a11y-smoke.spec.ts` · `docs/req-test.md:1272`(§12.2 #3) · `theme-layout-test-instruction-*-mobile` baseline 4장.

---

## 25. `mobile-test-gnb-strips-settings` — 테스트 중에는 테마·언어에 닿을 방법이 없다 · minor

**조항.** `docs/req-landing.md:243` 「Mobile Test: 햄버거, 설정 레이어, 언어/테마 컨트롤을 노출하지 않는다.」 `:223` 이 데스크톱에 같은 규칙을 적용한다.

**지금 무엇이 일어나는가.** 구현이 그대로다 — `SettingsControls` 는 `.gnb-desktop`(≥768px) 안과 모바일 드로어 바닥에만 있고(`src/features/gnb/site-gnb.tsx:329-351,468`), test 컨텍스트는 둘 다 렌더하지 않는다(`:302,410-414`). 테스트는 문항 수에 따라 수 분이 걸릴 수 있는 유일한 장시간 체류 화면인데, 그 동안 **잘못 고른 언어를 고칠 수도, 밤에 라이트 테마를 끌 수도 없다**. 그리고 §6.1 에러 복구 페이지도 같은 컨텍스트를 쓰므로(항목 6) 같은 제약을 상속한다.

**이 조항이 지키려던 것.** 「테스트 중에 주의를 분산시키는 컨트롤을 치우는 것」과 「테스트 도중 이탈 경로를 늘리지 않는 것」이다. 정당하다. 다만 **테마와 언어는 이탈이 아니다** — 둘 다 현재 화면에 머무르는 설정이며, 오히려 잘못된 언어로 문항을 읽고 있는 사용자에게는 필수 복구 수단이다.

**어떻게 다시 쓰나.** 「Test 컨텍스트의 GNB 는 Back + Timer 를 기본 구성으로 하고, **이탈을 유발하는 내비게이션 링크**(History/Blog/CI home)를 노출하지 않는다. 테마·언어 컨트롤은 현재 화면을 떠나지 않으므로 노출을 허용하며, 모바일에서는 Back 과 구분되는 별도 컨트롤 하나에 담는다. 언어 변경은 진행 중 응답 집합을 보존해야 한다(문항 텍스트만 교체된다).」 마지막 문장이 이 개정의 실제 조건이다 — 응답이 canonical index 로 저장되므로(`docs/req-test.md:474-505`) locale 교체가 응답을 건드리지 않는다는 것은 이미 성립한다.

**게이트.** `tests/e2e/gnb-smoke.spec.ts`(Test 컨텍스트 control set 단언) · `docs/req-landing.md:1063`(§14.2 항목 3 — 「Desktop/Mobile Test의 Back+Timer-only control set」) · theme-matrix test 라우트 baseline 12장.

---

## 26. `active-ramp-swallows-input` — 목적이 삭제된 기계가 입력만 삼키고 남았다 · minor

**조항.** `docs/req-landing.md:432` 「ACTIVE 복귀: 입력 **램프업 `120~180ms`(기본 140)**, 램프업 중 확장/축소/오버레이 변경 금지.」 같은 §7.1 `:425` 가 `SENSOR_DENIED` PageState 를 선언한다.

**지금 무엇이 일어나는가.** `ACTIVE_RAMP_UP_MS = 140`(`src/features/landing/model/interaction-state.ts:5`)이 `visibilitychange` 로 탭에 돌아올 때마다 설정되고(`:161`, `use-landing-interaction-controller.ts:260`), 그 창 동안 `CARD_FOCUS`(`:291`) · `CARD_EXPAND`(`:341`) · `CARD_COLLAPSE`(`:357`) · `HOVER_LOCK`(`:376`)이 전부 **조용히 무시된다**(리듀서가 state 를 그대로 반환). 모바일 탭 경로는 리듀서를 거치지 않으므로(`use-landing-interaction-controller.ts:578-582` 가 `beginMobileOpen` 을 직접 호출) 영향을 받지 않지만, **터치 태블릿(tap mode + tablet tier)은 `CARD_EXPAND` 경로를 타므로 탭이 삼켜진다.** 그리고 `CARD_FOCUS` 가 무시되면 DOM 포커스는 이동했는데 리듀서의 `focusedCardVariant` 는 갱신되지 않아 시각 상태와 어긋난다. `SENSOR_DENIED` 는 저장소 전체에서 **한 번도 dispatch 되지 않는다**(grep 0건).

**이 조항이 지키려던 것.** 배경 동적 연출(센서 기반)이 있던 시절, 탭 복귀 직후 연출이 아직 안정되지 않은 상태에서 확장이 겹치는 것을 막으려던 것이다. 그런데 `docs/req-landing.md:14`(§1.3 Locked Decisions)가 「배경 동적 연출은 강도 `0`/정지 상태로 비활성화한다」로 그 연출을 이미 죽였다. **보호 대상이 사라졌고 보호 장치만 남았다.**

**어떻게 다시 쓰나.** 「탭 복귀(`visibilitychange` → visible) 시 카드 상태는 복귀 직전 상태를 유지하며, **입력은 즉시 처리한다**. 복귀 직후 진행 중이던 모션이 있으면 그 모션은 중간 프레임 없이 최종 상태로 정착시킨다(모션 재생이 아니라 상태 확정). 입력을 지연·무시하는 램프업 구간을 두지 않는다.」 그리고 §7.1 의 `SENSOR_DENIED` 는 PageState 집합에서 내린다 — 그것을 발생시키는 입력이 §1.3 으로 삭제됐으므로 상태 기계에 도달 불가 상태를 남겨 둘 이유가 없다(`src/features/landing/model/state-types.ts:5` 와 전이 표 `interaction-state.ts:15-19` 가 함께 줄어든다).

**게이트.** `tests/unit/landing-interaction-state.test.ts` · `scripts/qa/check-phase7-state-contracts.mjs` · `tests/e2e/state-smoke.spec.ts` · `docs/req-landing.md:437`(§7.3 Verification 2).

---

## 27. `blog-detail-silent-redirect` — 「fallback 없이 index 로 redirect」가 침묵을 계약으로 만들었다 · minor

**조항.** `docs/req-landing.md:159` 「blog detail route에서 invalid variant 또는 non-enterable variant(`hide`, `debug`, `unavailable`)는 **다른 글 fallback 없이 localized blog index로 redirect한다**.」

**지금 무엇이 일어나는가.** 구현이 그대로다 — `src/app/[locale]/blog/[variant]/page.tsx:42-44` 가 `redirect(buildLocalizedPath(RouteBuilder.blog(), locale))` 이고, `tests/e2e/routing-smoke.spec.ts:227-235` 가 그 침묵을 계약으로 고정한다. 사용자가 공유받은 링크를 열면 **아무 설명 없이 목록으로 튕긴다** — 오타인지, 글이 내려갔는지, 앱이 고장났는지 알 수 없다. 모바일에서 더 나쁜 이유는 링크 유입이 압도적으로 모바일이기 때문이다.

**이 조항이 지키려던 것.** 명문으로 적혀 있다 — 「**다른 글 fallback 없이**」. 즉 막으려던 것은 「요청하지 않은 다른 기사를 보여주는 것」이다. 옳다. redirect 는 그 목적을 달성하는 **한 가지 수단**일 뿐이고, 「알리고 목록을 보여주는 것」도 같은 목적을 달성한다.

**어떻게 다시 쓰나.** 「blog detail route 에서 invalid 또는 non-enterable variant 는 **다른 기사를 대신 렌더하면 안 된다.** 대신 blog index 로 이동하되, 도착 화면에서 **무엇이 일어났는지 한 줄로 알린다**(예: 「요청한 글을 찾을 수 없습니다」). 안내는 `aria-live="polite"` 영역에 넣어 AT 에도 전달한다. 이 안내는 세션당 1회 소비되며 새로고침 시 반복되지 않는다.」 저장소의 설계 정의가 이미 이 상황의 어휘를 갖고 있다(`docs/design/ds/preview/secondary-surfaces.html:79-80`).

**규범 근거.** WCAG 3.3.1 Error Identification (A) 의 취지(오류를 텍스트로 알림) · 4.1.3 Status Messages (AA). 모바일 웹 관행: 죽은 딥링크는 침묵 리다이렉트가 아니라 안내 후 대안 제시.

**게이트.** `tests/e2e/routing-smoke.spec.ts:227-235` · `docs/req-landing.md:164`(§5.4 Verification) · `docs/req-landing.md:1062`(§14.2 항목 2).

---

## 28. `motion-duration-three-definitions` — 같은 모션이 세 이름 세 값으로 적혀 있다 · minor

**조항·값.** `docs/req-landing.md:570` 「Normal→Expanded: Phase A/B/C 각 `280ms`」 · `docs/req-landing.md:636` 「전환 `220~360ms`(기준 `280ms`)」 · `docs/design/design.md:373` 「`--dur-base: 220ms`, `--dur-expand: 260ms`」 · 런타임 `src/app/globals.css:196-197` 「`--dur-fast: 140ms` · `--dur-slow: 280ms`」(그 이름들은 `--dur-base`/`--dur-expand` 와 다르고, 실현 확장 시간은 `src/features/landing/grid/landing-grid-card.tsx:213` 의 `[--landing-card-motion-ms:280ms]`).

**지금 무엇이 일어나는가.** 같은 확장 모션이 **네 곳에 서로 다른 이름과 값**으로 적혀 있고, 그중 `--dur-base: 220ms`/`--dur-expand: 260ms` 는 한 번도 구현된 적이 없다(`docs/design/ds/colors_and_type.css:314-316` 이 스스로 'never implemented' 라고 적는다). `docs/req-landing.md:568` 은 이 수치들을 「조정값」으로 강등하면서 「바꾸는 즉시 `docs/decision-register.md` 에 등재한다」를 요구하는데, 이 갈림 자체는 등재돼 있지 않다(BQ-38 의 3건은 전부 이름 문제).

**이 조항이 지키려던 것.** `docs/req-landing.md:579` 가 말한다 — 「Desktop/Mobile 공통 duration/easing/stagger 는 **단일 규격으로 관리한다**」. 목적은 단일 정본이고, 현재 상태는 그 목적의 정확한 반대다.

**어떻게 다시 쓰나.** 「모션 duration·easing·stagger 의 정본은 **런타임 토큰 하나**다(`src/app/globals.css` 의 `--dur-*` / `--ease-*`). 요구사항 문서와 설계 문서는 **토큰 이름만 인용하고 수치를 적지 않는다.** 수치가 필요한 검증은 토큰을 읽어 단언한다. 설계 문서가 아직 실현되지 않은 목표값을 제시할 때는 그 값이 intent 임을 값 옆에 명시하고, realized 값과의 갈림을 `docs/decision-register.md` 에 등재한다(AGENTS.md §3-1).」 그리고 이번 개정에서 이름을 하나로 모은다 — `--dur-base`/`--dur-expand`/`--dur-slow` 셋 중 살아 있는 이름을 정하고 나머지를 그것으로 치환한다.

**게이트.** `tests/unit/design-tokens-dark-parity.test.ts:165`(mirror 구간 값 대조) · `scripts/qa/check-design-token-parity.mjs` · `docs/design/ds/colors_and_type.css`(Ask-First, 저장소 밖 push 표면) · `docs/decision-register.md` 등재.

---

## 훑은 표면과 훑지 못한 표면

**전수로 훑음.** `docs/req-landing.md` 1147행 전부 · `docs/req-test.md` 1319행 전부 · `docs/design/design.md` 444행 전부. 표면 기준으로는 landing(§6–§9·§11·§13) · test(req-test 전체 + req-landing §13.4–§13.6) · gnb/settings(§6.4·§10.2) · error(req-test §6.1·§6.5–§6.7) · 404/global(§5.5 + `src/app/not-found.tsx`·`global-not-found.tsx` 원문) · blog(§5.4·§6.5·§6.6) · global(§4 Invariants·§11 Performance·§12 Telemetry).

**조항이 없어 이 렌즈로 판정할 것이 없던 표면.** **history** — `docs/req-landing.md` 와 `docs/req-test.md` 통틀어 history 를 다루는 조항은 GNB 컨텍스트 위임 한 줄(`req-landing.md:246`)과 라우트 허용목록(`:139`)뿐이고, 목록·항목·빈 상태의 UI 계약이 **0줄**이다. 구현도 빈 상태 하나뿐이다(`src/app/[locale]/history/page.tsx:33-51`). 이것은 over-specification 이 아니라 그 반대이므로 이 렌즈의 항목으로 올리지 않았다 — 다만 「계약이 없는 표면에 IA 를 설계하면 다른 표면들과 어긋난 채 굳는다」는 점에서 착수 전 처리 대상이다. **telemetry payload 스키마**(§12.2·§12.3)와 **variant registry / sync 계약**(§12.6, req-test §2)은 사용자 눈에 닿는 인터랙션을 규정하지 않으므로 이 렌즈에서 판정하지 않았다.

**훑었으나 findings 를 내지 않은 문서.** `docs/req-test-plan.md`(398행) — 헤딩 전수와 Part 4·5·Gate A/B/C 를 읽었고, 내용이 Phase 구현 기록과 ADR 요약이라 모바일 UX 를 제약하는 조항이 없다. `docs/decision-register.md` 는 BQ-11(swipe-down)과 BQ-38·BQ-39 인용 확인 목적으로만 부분 열람했고 전수 독해하지 않았다.

**미확인으로 남긴 것.** ⑴ 항목 9 의 부제 줄 수·픽셀은 폰트 advance 기반 계산이며 브라우저 실측이 아니다. ⑵ 항목 16 의 rAF 루프 프레임 비용을 프로파일링하지 않았다. ⑶ 항목 22 의 spring 금지가 어떤 실패에서 왔는지 `docs/done/**` 를 전수로 뒤지지 않았다 — `decision-register.md`·`DECISIONS.md` grep 0건까지만 확정했다. ⑷ 항목 23 의 fallback face 가 실제로 어느 자형으로 잡히는지는 스택 순서에서 유도한 예측이며 실기 렌더로 확인하지 않았다. ⑸ 어떤 게이트도 이 세션에서 **실행하지 않았다**(읽기 전용 과제) — `gates` 열의 이름은 소스를 열어 확인한 실재 파일·단언이지만 현재 pass/fail 은 확인 대상이다. ⑹ `docs/design/ds/**`(46파일)는 `design.md` 와의 값 갈림 확인에 필요한 구간만 열었고 전수로 읽지 않았다.
