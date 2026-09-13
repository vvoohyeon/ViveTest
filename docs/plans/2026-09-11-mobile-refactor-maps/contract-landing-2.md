# contract-landing-2 — `docs/req-landing.md` §8–§15 조항 전수 분류

읽은 대상: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis/docs/req-landing.md` 509–1147행 전수(HEAD `7616211`). 이 파일의 모든 `req-landing.md:N` 인용은 그 체크아웃의 행 번호다.

교차 확인에 실제로 연 파일: `scripts/qa/*.mjs` 16개 중 `check-blocker-traceability.mjs`(전문) · `check-phase8-accessibility-contracts.mjs`(전문 92행) · `check-phase9-performance-contracts.mjs`(1–120행), `docs/blocker-traceability.json`(전문 67 엔트리), `tests/e2e/helpers/axe.ts`(전문), `package.json` scripts, `src/features/landing/grid/use-landing-interaction-controller.ts`(부분), `src/features/landing/grid/layout-plan.ts`(부분), `src/features/landing/grid/landing-catalog-grid.tsx`(부분), `src/features/landing/grid/landing-grid-card.tsx`(부분), `src/features/landing/grid/use-mobile-backdrop-gesture.ts`(부분), `src/features/landing/grid/landing-card-interaction-bindings.ts`(부분), `src/app/globals.css`(부분), `docs/decision-register.md` BQ-39 블록(516–524행), `tests/unit/contract-citations.test.ts`(부분), `docs/req-landing.md` §3.2(57–76행).

읽지 않은 것: `tests/e2e/*.spec.ts` 전문(제목·assertion id·특정 패턴만 grep으로 확인했고 단언 본문을 전수로 읽지 않았다) · `tests/unit/**` 87개 중 어느 것도 전문을 읽지 않았다 · `scripts/qa/check-phase4/5/6/7/10/11-*.mjs`. 이 파일에서 「자동 검증됨」이라고 적은 항목의 근거는 **테스트 제목과 assertion id의 실재**이며, 그 단언이 실제로 무엇을 재는지까지 확인한 것은 §11.2·§11.3·§9(axe 설정)뿐이다.

---

## 1. 개체수

| 항목 | 값 | 산출 근거 |
|:---|---:|:---|
| 범위 행수 | 639 | 509–1147 |
| 절(`##`/`###`/`####`) | 47 | 헤딩 전수 |
| 규칙 조항(`- ` 불릿) | 292 | 스크립트 집계 |
| 표 행(헤더·구분선 제외) | 17 | §13.5 매트릭스 13 + §13.9 노출표 4 |
| §14.2 release-blocking 항목 | 30 | `1061–1090` |
| **규칙 조항 합계** | **339** | 292 + 17 + 30 |
| Verification 번호 항목 | 69 | |
| §13.6 QA 최소 액션 케이스 | 3 | `992–994` |
| **번호 항목 합계** | **102** | |
| 총 조항성 라인 | **411** | 292 + 102 + 17 |
| Mobile/모바일을 문면에 적은 조항 | 30 | |
| 숫자 폭(`768`/`1023`/`폭 변경`)을 문면에 적은 조항 | 8 | `513 514 515 534 539 563 1064 1073` |
| hover/pointer/tap을 문면에 적은 조항 | 43 | |
| Desktop/Tablet·Tablet을 문면에 적은 조항 | 17 | |
| 절 상호인용(`Section N` · `§N` · 외부 문서 §N) | 57 | |
| 이 구간에 `계약/조정값` 2계층이 적용된 절 | 2 | §8.2(`522`) · §8.3(`568`)뿐 |

## 2. 분류 축 정의

- **kind** — `behavior`(상태·데이터·이벤트의 결과를 정한다) / `interaction`(사용자 입력과 시간·모션의 관계를 정한다) / `mixed`(한 조항이 둘을 함께 정한다) / `visual`(보이는 값·배치·레이어) / `meta`(다른 조항에 대한 규칙: 우선순위·동기화·검증 의무).
- **mobileScope** — `mobile-only` / `desktop-only`(Desktop 또는 Desktop/Tablet 한정) / `both` / `n/a`.
- **widthKeyed** — 그 조항을 발동시키는 것이 `폭`(뷰포트 치수)인지 `입력`(포인터 capability·키보드·터치)인지 `둘다` 인지 `없음`인지. **절 헤딩이 폭을 걸면 그 절의 모든 조항은 기본이 `폭`이다** — §8.5는 헤딩 자체가 `width<768`(`619`)이므로 32개 전부가 명시 없이 폭에 걸린다.
- **prescriptiveness** — `값고정`(단일 수치·단일 구현을 못박음) / `범위`(허용 구간) / `금지`(부정 명령) / `원칙`(판정 기준만 준다).
- **obstructsStandardUx** — `예` / `조건부` / `아니오`. `예`·`조건부`에는 근거의 **종류**(WCAG / 플랫폼 관용 / 문서 내부 모순 / 실측)와 출처를 붙인다. 근거 없는 항목은 `아니오`로 두었다.

---

## 3. §8 Interaction & Motion Spec — 조항 전수

### 3.1 §8.1 Capability Gate (`511–519`)

| 행 | 조항 | kind | mobileScope | widthKeyed | 규범강도 | 표준UX저해 |
|---:|:---|:---|:---|:---|:---|:---|
| 513 | `width<768`: 항상 Tap Mode | behavior | both | **폭** | 값고정(768) | 조건부 — 결정 2가 뒤집는 축. 실측: 900×1200 터치 프로브가 `tier=tablet · mode=tap · layer=desktop-overlay` |
| 514 | `width>=768` + capability 충족: Hover-capable Mode | behavior | desktop-only | 둘다 | 원칙 | 아니오 |
| 515 | `width>=768` + capability 미충족: Tap Mode | behavior | both | 둘다 | 원칙 | 예 — 모드는 입력을 보는데 **생명주기는 보지 않는다**(§3.7 Q1) |
| 516 | SSR 초기값은 Tap Mode, mount 후 동기화 | meta+behavior | n/a | 없음 | 값고정 | 예 — 결정 2와 정면 충돌(§3.7 Q1) |
| 519 | V: media feature mocking으로 모드 판정 검증 | meta | n/a | 없음 | 원칙 | — |

`514`·`515`가 말하는 "capability"의 실제 정의는 이 절에 없다. 런타임은 `window.matchMedia('(hover: hover) and (pointer: fine)')`를 쓴다(`src/features/landing/grid/use-landing-interaction-controller.ts:207`) — 문서에 없는 **R(Realized)** 값이며 `AGENTS.md §3-1` 기준으로 출처 표기 대상이다.

### 3.2 §8.2 Desktop/Tablet Expanded Trigger (`521–564`)

`522`가 이 절을 **계약(불변식)**과 **조정값** 두 계층으로 가른다(BQ-39). 이 구간에서 그 2계층을 가진 절은 §8.2와 §8.3 둘뿐이다.

**계약(불변식) — 개정에 사용자 승인 필요 (`524–540`, 16개)**

| 행 | 조항 | kind | mobileScope | widthKeyed | 규범강도 | 표준UX저해 |
|---:|:---|:---|:---|:---|:---|:---|
| 525 | 키보드 Test focus는 capability 무관 dwell `0ms` Expanded + 예약 timer·intent token·pointer target 취소 | interaction | desktop-only | **입력**(키보드) | 값고정(0ms) | 아니오 |
| 526 | 키보드 Blog focus는 focus-only, Expanded/opening/geometry target 미소유 | behavior | desktop-only | 입력 | 금지 | 아니오 |
| 527 | 활성 Expanded 카드의 경계 = 확장 카드의 실제 상호작용 영역 전체 | meta | desktop-only | 없음 | 원칙 | 아니오 |
| 528 | **포인터 이동으로** 경계 완전 이탈 시 collapse, 다른 카드 hover 여부 무관 | interaction | desktop-only | **입력**(포인터) | 원칙 | 예 — 터치에는 지속 `pointermove`가 없어 이 경로 전체가 터치 태블릿에서 성립하지 않는다(§3.7 Q2) |
| 529 | collapse 결정은 실행 시점의 최신 경계 판정 기준 | interaction | desktop-only | 입력 | 원칙 | 아니오 |
| 530 | handoff는 `다른 enterable 카드(available 또는 opt_out) 진입`에서만 성립 | behavior | desktop-only | 입력 | 원칙 | 아니오 |
| 531 | 카드 간 handoff 시 직전 카드 pending transition 즉시 취소, 마지막 hover 카드만 Expanded | interaction | desktop-only | 입력 | 원칙 | 아니오 |
| 532 | handoff에서 카드 A는 scale/높이/빈공간 잔류 없이 즉시 Normal, same-row 하단 여백 증가 금지 | mixed | desktop-only | 없음 | 금지 | 아니오 |
| 533 | handoff가 조정값의 어떤 유지 규칙보다 우선, 이중 전이 금지 | meta | desktop-only | 없음 | 원칙 | 아니오 |
| 534 | **Tap Mode fallback(`width>=768`): tap으로 Expanded 진입, 전환 비주얼은 hover 경로와 동일** | interaction | both | **둘다** | 원칙 | **예 — 진입만 규정하고 이탈을 규정하지 않는다**(§3.7 Q2). 근거: 플랫폼 관용(iOS HIG·Material 3은 모든 확장/시트에 명시적 dismiss를 요구) + 실측(닫기 X `0`개 · backdrop `0`개 · 재탭 불가) |
| 535 | hover intent 스케줄러 = 전역 단일 timer + intent token | behavior | desktop-only | 입력 | **구현지정** | 조건부 — 구현 기법을 계약이 못박는다 |
| 536 | 새 hover 진입 시 이전 예약 즉시 취소 | interaction | desktop-only | 입력 | 원칙 | 아니오 |
| 537 | 타이머 실행 직전 `현재 hover 대상 == 예약 대상` 재검증, 불일치 시 no-op | interaction | desktop-only | 입력 | 구현지정 | 아니오 |
| 538 | handoff 경로는 지연 없이 즉시 전환 | interaction | desktop-only | 입력 | 값고정(0ms) | 아니오 |
| 539 | **Expanded 활성 중 폭 변경 시 강제 종료는 어떤 규칙으로도 완화되지 않는다** | behavior | both | **폭** | 금지 | 예 — 모바일 브라우저의 주소창 높이 변동·회전은 폭 변경을 만든다. 근거: 플랫폼 관용(iOS Safari 주소창 축소는 `visualViewport` 변화이고 폭은 회전에서 변한다) + 결정 2가 폭 기반 판정을 입력 기반으로 옮기면 이 조항의 발동 조건이 정의되지 않는다 |
| 540 | 위 키보드 focus 규칙은 pointer hover enter/leave 지연값을 변경하지 않는다 | meta | desktop-only | 없음 | 원칙 | 아니오 |

**조정값 — 구현자 재량 + 즉시 등재 의무 (`542–550`, 8개)**

| 행 | 조항 | kind | widthKeyed | 규범강도 | 표준UX저해 |
|---:|:---|:---|:---|:---|:---|
| 543 | Hover enter 후 `120~200ms`에 Expanded — 현행 `160ms` | interaction | 입력 | 범위+현행값 | 아니오 |
| 544 | 포인터 이동 기반 collapse 유예 `100~180ms` — 현행 `140ms` | interaction | 입력 | 범위+현행값 | 아니오 |
| 545 | collapse 유발 입력의 정의: 예약~실행 사이 `pointermove`가 없었으면 스크롤이므로 열어 둔다 | interaction | 입력 | 원칙 | 아니오 |
| 546 | 유지 해제 ⑴: 다음 실제 포인터 이동에서 재판정 | interaction | 입력 | 원칙 | 예 — 터치에는 「다음 포인터 이동」이 없다 |
| 547 | 유지 해제 ⑵: 카드가 뷰포트를 완전히 벗어나면 해제 후 collapse | interaction | 없음 | 원칙 | 아니오 |
| 548 | 스크롤이 위조한 **진입**도 무시한다 | interaction | 입력 | 원칙 | 아니오 |
| 549 | 진입 위조 판정 = 경계 이벤트 좌표와 마지막 기록 포인터 위치의 일치 | behavior | 입력 | 구현지정 | 조건부 — 판별자를 계약에 못박았다 |
| 550 | 유지 상태는 Escape·handoff·전환 시작·hover 모드 이탈에서 함께 해제 | behavior | 입력 | 원칙 | 아니오 |

**Verification `553–564` (12개)** — 전부 `Automated`. 추적 자산은 `assertion:B13-hover-collapse`(`tests/e2e/grid-smoke.spec.ts`)와 `tests/unit/landing-hover-intent.test.ts`(`docs/blocker-traceability.json` blocker 13).

### 3.3 §8.3 Core Motion Contract (`566–590`)

`568`이 2계층을 선언한다. 계약 = 축·곡선·단조성·복원·플리커 금지·`0ms` 허용 경로·키보드/포인터 동등성. 조정값 = duration/stagger 수치. `569`가 「조정값으로 명시되지 않은 시간·순서 규칙은 권장이 아니라 검증 대상」이라고 닫는다.

| 행 | 조항 | kind | mobileScope | widthKeyed | 규범강도 | 표준UX저해 |
|---:|:---|:---|:---|:---|:---|:---|
| 570 | Normal→Expanded Phase A/B/C 각 `280ms`, C stagger `40/100/160ms`(조정값) | interaction | both | 없음 | 값고정(조정값) | 아니오 |
| 571 | Phase A/B는 시작 프레임, Phase C는 상세 블록 활성 이후 | interaction | both | 없음 | 원칙 | 아니오 |
| 572 | reveal 항목 순서 = DOM 순서 | mixed | both | 없음 | 원칙 | 아니오 |
| 573 | Expanded→Normal 동일 축/곡선 대칭 복귀 | interaction | both | 없음 | 원칙 | 아니오 |
| 574 | 닫는 동안 외곽 높이 non-increasing, 완료 시 `0px` 일치. Mobile은 전환 중 임시 오차 허용, 완료 시 동일 강제 | mixed | both | 폭(Mobile 예외) | 값고정(0px) | 조건부 — `0px`은 dvh 변동(주소창) 아래에서 재현 조건이 불안정하다. 근거: 플랫폼 관용(모바일 주소창 높이 변동) + 미확인(실측 안 함) |
| 575 | `0ms` 전이는 handoff source 이탈 경로에서만 허용 | interaction | both | 입력 | 금지 | 아니오 |
| 576 | HOVER_LOCK 등 보조 잠금은 비대상 차단에만, 대상 카드 core motion 무효화 금지 | behavior | desktop-only | 입력 | 금지 | 아니오 |
| 577 | core motion 중 전이 역전 플리커 금지 | interaction | both | 없음 | 금지 | 아니오 |
| 578 | easing `ease-in-out` 계열 통일. spring/overshoot·Expanded 중 alpha 애니메이션·내부 이중 박스·정적 외곽+내부만 scale 금지 | mixed | both | 없음 | 금지 | **예 — spring/overshoot 전면 금지.** 근거: 플랫폼 관용(iOS HIG의 기본 시트 표현과 Material 3 Expressive의 motion physics 양쪽이 spring을 기본으로 쓴다). WCAG 2.3.3은 「감소 요청 시 끄라」이지 「쓰지 말라」가 아니다 |
| 579 | Desktop/Mobile 공통 duration/easing/stagger를 단일 규격으로 관리 | meta | both | 없음 | 원칙 | **예 — 데스크톱 hover 확장과 모바일 전면 시트는 서로 다른 지각 과제인데 하나의 규격에 묶인다.** 근거: 플랫폼 관용 + 문서 내부 모순(§8.5:636이 `220~360ms` 범위를 따로 갖는데 §8.3:570은 `280ms` 고정을 준다) |
| 580 | Desktop/Tablet Escape·true focus-out은 controller-owned 단일 close command. Escape/outside/Blog destination=`collapse`, 적용된 Test→Test transfer만 `handoff`, 후속 source blur는 no-op | behavior | desktop-only | 입력 | 원칙 | 아니오 |
| 581 | 논리적 close는 `closing` 시작과 동시. `closing`/`cleanup-pending`/`handoff-source`는 tab/activation/AT 대상에서 즉시 제외하되 reverse motion·shell persistence·BQ-24 floor/spacer cleanup 유지 | mixed | desktop-only | 없음 | 원칙 | 아니오 |
| 582 | **Mobile card-root Escape/blur는 이 close 경로를 실행하거나 mobile state를 변경하면 안 된다** | behavior | mobile-only | **폭** | 금지 | **예 — 결정 2 아래에서 키보드 붙은 태블릿(iPad + Magic Keyboard, hover 없음)이 모바일 생명주기로 들어가면 `Escape`가 계약상 no-op이 된다.** 근거: WCAG 2.1.1 Keyboard(모든 기능이 키보드로 조작 가능) + 플랫폼 관용(Escape = dismiss) |

**Verification `585–590` (6개)** — 전부 Automated.

### 3.4 §8.4 Expanded Shell Scale and Readability (`592–617`)

2계층 선언 없음 → 17개 전부 계약. `609`만 BQ-39를 인용한다.

| 행 | 조항 | kind | mobileScope | widthKeyed | 규범강도 | 표준UX저해 |
|---:|:---|:---|:---|:---|:---|:---|
| 594 | Desktop/Tablet Expanded shell scale은 reduced-motion 제외 전 경로에서 `1.04` 고정 | visual | desktop-only | 폭 | 값고정 | 아니오 |
| 595 | Desktop 3밴드는 최종 외곽 desired scale `1.10`, Tablet은 `1.04` | visual | desktop-only | 폭 | 값고정 | 아니오 |
| 596 | `max_surface_scale` · `resolved_final_scale` · `frame_inline_scale` 공식 고정, reduced motion은 `1.00` | visual | desktop-only | 폭 | **공식고정** | 조건부 — 계약이 계산식을 소유한다 |
| 597 | edge anchor allowance = 확장 방향 measured stage outset, center는 작은 쪽 ×2. 0/non-finite는 `1.00`으로 수렴 | visual | desktop-only | 없음 | 공식고정 | 아니오 |
| 598 | `1.04` 초과 폭은 expanded frame 소유, shadow/surface/body 동반 확장. inner counter-scale·단독 width 조정·global token 증대 금지 | visual | desktop-only | 없음 | 금지 | 조건부 — 구현 수단 3종을 명시 금지 |
| 599 | clamp가 `1.10` 미만으로 해석되면 실측값 기록, clipping/overflow 만들며 강제 금지 | meta | desktop-only | 없음 | 원칙 | 아니오 |
| 600 | **Mobile은 기존 full-bleed 모바일 전개 규칙 유지, 위 width-only 예외 미적용** | visual | mobile-only | **폭** | 금지 | 조건부 — 모바일 IA 재설계(바텀시트·전용 상세 화면)를 이 한 줄이 full-bleed로 고정한다 |
| 601 | 내부 콘텐츠만 확대 금지 | visual | desktop-only | 없음 | 금지 | 아니오 |
| 602 | Expanded 전 구간 title/body/CTA/meta crop `0건` | visual | both | 없음 | 값고정 | 아니오 |
| 603 | transform-origin 판정은 Expanded 시작 시점의 settled row 경계 기준 | visual | desktop-only | 없음 | 원칙 | 아니오 |
| 604 | transform-origin: row 첫 카드 `0% 0%`, 마지막 `100% 0%`, 그 외 `50% 0%` | visual | desktop-only | 없음 | 값고정 | 아니오 |
| 605 | row 카드 1개면 첫 카드로 간주해 `0% 0%` | visual | desktop-only | 없음 | 값고정 | 아니오 |
| 606 | row 경계 판정에 고정 인덱스 사용 금지 | meta | desktop-only | 없음 | 금지 | 아니오 |
| 607 | Expanded 카드 opacity 항상 `1.0` | visual | both | 없음 | 값고정 | 아니오 |
| 608 | Desktop/Tablet Expanded는 GNB·Settings 제외 카드 레이어 최상위, 인접 카드에 가려지면 안 됨 | visual | desktop-only | 없음 | 금지 | 아니오 |
| 609 | 뷰포트 고정 표면(consent banner)도 Expanded를 가리면 안 되고 **실제 교차 중에만** 비켜선다. 예약 높이 불변, 포커스 보유 시 비켜서지 않음 (BQ-39) | mixed | both | 없음 | 원칙 | 아니오 — WCAG 2.4.11 Focus Not Obscured의 취지를 만족시키는 몇 안 되는 조항 |
| 610 | 다중 Expanded 금지, 활성 Expanded 항상 1개 | behavior | both | 없음 | 금지 | 아니오 |

**Verification `613–617` (5개)** — 전부 Automated. 스크린샷 기반 2건 포함.

### 3.5 §8.5 Mobile Expanded (`width<768`) (`619–667`) — 32개 전수

**이 절에는 계약/조정값 2계층이 없다.** BQ-39(B)는 「`req-landing.md` §8 을 두 계층으로 가른다」고 적었으나(`docs/decision-register.md:517`), 실제 개정은 §8.2·§8.3·§14.2 항목 13 셋에만 들어갔다(`docs/decision-register.md:519`). 따라서 **§8.5의 32개는 전부 계약(불변식)이고 개정에 사용자 승인이 필요하다** — 모바일 전면 리팩터의 가장 큰 문서적 제약이 여기 있다.

`619` 헤딩이 `width<768`이므로 **32개 전부가 명시 없이 폭에 걸린다**. 아래 `widthKeyed` 열은 헤딩의 폭 게이트를 걷어냈을 때 그 조항이 **실질적으로** 무엇에 걸리는지를 적는다 — 결정 2를 적용하면 그 실질이 그대로 새 게이트가 된다.

| 행 | 조항 | kind | 실질 widthKeyed | 규범강도 | 표준UX저해 |
|---:|:---|:---|:---|:---|:---|
| 621 | 탭한 해당 카드만 Expanded 진입 | behavior | **입력**(tap) | 원칙 | 아니오 |
| 622 | lifecycle `OPENING -> OPEN -> CLOSING -> NORMAL` 단방향 고정 | behavior | **입력** | 값고정 | 아니오 |
| 623 | 단일 pointer/touch 시퀀스에서 동일 카드 상태 전이 최대 1회 | interaction | **입력** | 값고정 | 아니오 |
| 624 | collapsed 유효 탭으로 OPENING 시작한 동일 시퀀스에서 즉시 CLOSING 역전 금지 | interaction | **입력** | 금지 | 아니오 |
| 625 | Expanded는 in-flow 위치 유지, top jump 금지 | mixed | **폭**(레이아웃) | 금지 | 예 — 바텀시트·전용 상세 화면(결정 5)을 문면으로 배제한다. 근거: 플랫폼 관용(iOS HIG Sheets · Material 3 Bottom sheets) |
| 626 | OPENING/CLOSING window 동안 활성 카드 상단 y-anchor 편차 없이 유지 | interaction | **폭** | 값고정(0 편차) | 예 — 같은 이유. in-flow 확장 이외의 어떤 전개 방식도 이 단언을 통과할 수 없다 |
| 627 | Expanded 헤더는 `title + X` 구조 유지 | visual | **폭** | 값고정 | 조건부 — 헤더 구성을 계약이 못박아 grabber·드래그 핸들 같은 관용 요소를 배제 |
| 628 | 헤더는 카드 최상단 첫 행 | visual | **폭** | 값고정 | 아니오 |
| 629 | title 줄바꿈 허용, truncate/ellipsis 금지, top align | visual | **폭** | 금지 | 아니오 — i18n 압력(12 locale)에 유리한 방향 |
| 630 | settled에서 title 시작 기준선이 진입 직전 Normal과 `0px` 일치 | visual | **폭** | 값고정(0px) | 조건부 — in-flow 전개를 전제해야만 성립 |
| 631 | X는 아이콘 단일 표현, 헤더 우측 끝 sticky. OPENING 시작~CLOSING 종료 직전 시각 노출, CLOSING 중 비활성 | mixed | **입력** | 값고정 | 아니오 — 실측상 `--tap-min: 44px` 충족(`src/app/globals.css:201` · `src/features/landing/grid/landing-grid-card.tsx:279`) |
| 632 | **닫기 경로는 `X 버튼` 또는 `카드 외부(backdrop) 탭`만 허용** | interaction | **입력** | **금지(화이트리스트)** | **예 — `Escape`와 스와이프-다운이 계약으로 금지된다.** 근거: WCAG 2.1.1 Keyboard(키보드 태블릿에서 Escape 불가) + 플랫폼 관용(시트의 스와이프-다운 dismiss). §8.3:582가 Escape를 별도로 한 번 더 막는다 |
| 633 | 닫힘 후 직전 형상/높이/타이틀 연속성으로 자연 복귀, Expanded 중 이동한 page scroll 위치 유지 | mixed | **폭** | 원칙 | 아니오 |
| 634 | 진입 직전 Normal 외곽 높이 snapshot 기록, 닫힘 완료 시 `0px` 복귀. snapshot은 시퀀스당 1개, 교체 금지 | behavior | 없음 | 값고정+구현지정 | 조건부 — 복원 기법을 계약이 소유 |
| 635 | `NORMAL` terminal 확정은 pre-open snapshot 높이 복귀 완료 이후에만 | behavior | 없음 | 원칙 | 아니오 |
| 636 | 전환 `220~360ms`(기준 `280ms`), spring/overshoot 금지 | interaction | 없음 | 범위+금지 | 예 — spring 금지는 §8.3:578과 같은 문제. 또한 이 `220~360` 범위는 §8.3:570의 `280ms` 고정과 **문서 내부에서 갈린다** |
| 637 | Normal→Expanded는 동일 카드의 연속 전이로 지각, 분리된 카드 돌출 금지 | interaction | **폭** | 금지 | 예 — 전용 상세 화면 전환(결정 5)을 문면으로 배제 |
| 638 | 외곽 컨테이너 높이 전이는 content-fit 목표까지 monotonic, overshoot 금지 | interaction | 없음 | 금지 | 아니오 |
| 639 | **content-fit 높이 계산은 런타임 실측(`from px -> to px -> auto`) 또는 동등 정확도 방식** | behavior | 없음 | **구현지정** | 예 — 계약이 구현 기법을 지정한다. `interpolate-size`/`calc-size()` 같은 현행 CSS 경로를 문면으로 좁힌다 |
| 640 | 내부 콘텐츠 스크롤은 body에서 허용(OPEN settled 이후 page scroll도 허용). 콘텐츠가 viewport를 안 넘으면 내부 스크롤 없음 | behavior | **폭** | 원칙 | 조건부 — 실측 `max-h-[calc(100dvh-116px)]`(`landing-grid-card.tsx:285,292,296`)의 `116px`이 문서에 없는 R 값 |
| 641 | 자동 viewport 보정 스크롤 금지. transition window에 page scroll lock, OPEN settled에서 unlock | interaction | **폭** | 금지+원칙 | **예 — 화면 밖으로 열린 카드를 보정하지 않는다.** 근거: 실측(390px 랜딩 문서 높이 3,173px = 3.76 화면 · 첫 카드 top 315px) + WCAG 2.4.11 Focus Not Obscured(확장 후 CTA가 뷰포트 밖일 수 있다) |
| 642 | 다른 카드 상호작용 비활성화. unavailable은 Expanded 진입/닫기 토글 대상 아님 | behavior | 없음 | 금지 | 아니오 |
| 643 | OPENING 중 유효 닫기 입력은 OPEN settled 직후 1회 queue-close. CLOSING 중 추가 입력 무시 | interaction | **입력** | 값고정 | 조건부 — 사용자가 「빨리 닫기」를 눌러도 전체 전개를 본 뒤에 닫힌다 |
| 644 | 레이어 순서 `GNB > Expanded 카드 > backdrop > 기타 카드` 고정 | visual | 없음 | 값고정 | 아니오 |
| 645 | backdrop은 Expanded 카드를 덮지 않음 | visual | 없음 | 금지 | 아니오 |
| 646 | dim은 Expanded 외부 영역에만 | visual | 없음 | 금지 | 아니오 |
| 647 | X는 backdrop보다 상위 레이어, 항상 클릭 가능 | interaction | 없음 | 원칙 | 아니오 |
| 648 | settled에서 활성 카드 본체 위 dim/tint `0%` | visual | 없음 | 값고정 | 아니오 |
| 649 | 내부 상호작용 우선순위 `CTA(응답 A/B, Read more) > X 버튼 > 카드 외부 영역` 고정 | interaction | **입력** | 값고정 | 아니오 |
| 650 | **내부 비-CTA 영역 탭은 no-op, 닫기/전환 유발 금지** | interaction | **입력** | 금지 | 예 — 시트 본문에서 어떤 관용 제스처도 못 붙인다. 근거: 플랫폼 관용 + WCAG 2.5.7 Dragging Movements의 대안 경로 설계 여지를 없앤다 |
| 651 | tap 판정은 보수적으로, 미세 이동이 감지된 입력은 scroll gesture로 분류해 open/close 시작 금지 | interaction | **입력** | 원칙 | 아니오 — 다만 실현은 backdrop 경로에만 있다(아래) |
| 652 | y-anchor 규칙은 transition window 기준으로 카드 인덱스/스크롤 위치/콘텐츠 길이 예외 불허 | meta | **폭** | 금지 | 예 — 626의 예외를 원천 봉쇄해 대안 설계를 남기지 않는다 |

`651`의 실현 범위 확인: 카드 트리거는 `onClick` + `onMouseEnter`/`onMouseLeave`만 바인딩한다(`src/features/landing/grid/landing-card-interaction-bindings.ts:36–38`). 미세 이동 임계는 backdrop 전용 경로에만 있다 — `MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX = 10`(`src/features/landing/grid/use-mobile-backdrop-gesture.ts:7,37–38`). 즉 **열기 경로의 tap/scroll 판별은 브라우저의 기본 click 억제에 위임돼 있고 계약이 요구하는 「보수적 판정」의 소유자가 코드에 없다.** 실측으로 확인된 「랜딩 그리드에 `touch-action` 선언과 터치 이벤트 리스너가 0개」와 정확히 같은 사실의 다른 면이다.

**Verification `655–667` (13개)** — 전부 Automated이고, `docs/blocker-traceability.json`에서 blocker 14가 7개 assertion을 붙든다(`assertion:B14-mobile-baseline` · `-open-continuity` · `-close-perception` · `-close-choreography` · `-title-continuity` · `-queue-close` · `-reduced-motion`, 모두 `tests/e2e/transition-telemetry-smoke.spec.ts:534–880`). 단위 층은 `tests/unit/landing-mobile-lifecycle.test.ts` · `landing-mobile-scroll-lock.test.ts` · `landing-mobile-backdrop-gesture.test.ts`. **§8이 이 구간에서 가장 촘촘히 자동화된 절이다** — 그래서 개정 비용이 문서가 아니라 테스트에 있다.

### 3.6 §8.6 Transition Start Trigger (`669–679`) — 9개

| 행 | 조항 | kind | mobileScope | widthKeyed | 규범강도 | 표준UX저해 |
|---:|:---|:---|:---|:---|:---|:---|
| 671 | Test: Expanded answerChoiceA/B | behavior | both | 없음 | 값고정 | 조건부 — 랜딩에서 답을 고르는 것이 유일 진입점이므로 sticky CTA·전용 진입 버튼을 배제 |
| 672 | Blog: Normal card 전체 링크 trigger | behavior | both | 없음 | 값고정 | 아니오 |
| 673 | Blog 전환은 article 식별자를 전달하고 목적지가 그 기준으로 컨텍스트 결정 | behavior | both | 없음 | 원칙 | 아니오 |
| 674 | Test CTA 전환은 A/B를 landing ingress로 저장, 목적지가 runtime entry commit에서 canonical binding | behavior | both | 없음 | 원칙 | 아니오 |
| 675 | article 식별자 누락/무효 시 문서에 정의된 안전 fallback | behavior | both | 없음 | 원칙 | 아니오 |
| 676 | **Mobile에서도 CTA 입력은 닫기 동작보다 우선하며 반드시 `transition_start`로 귀결** | behavior | mobile-only | 폭 | 원칙 | 아니오 |
| 677 | 본 절의 전환 시작 규칙은 §13.3/§13.6의 fail/cancel/rollback 계약을 변경하지 않는다 | meta | both | 없음 | 원칙 | — |
| 678 | Test destination-ready = variant 유효성 + Runtime Entry Commit 준비 동시 충족 | behavior | both | 없음 | 원칙 | 아니오 |
| 679 | Blog destination-ready = route variant ↔ article model 일치 + route model ready 이후 animation frame | behavior | both | 없음 | 구현지정 | 아니오 |

---

## 4. §9 Accessibility Requirements (`683–726`) — 28개

§9.1·§9.2에는 **Verification 블록이 없다**. `722–726`의 4개가 §9 전체를 대표한다(Manual 1 + Automated 3).

### 4.1 §9.1 Keyboard & Focus (`685–695`) — 9개

| 행 | 조항 | kind | mobileScope | widthKeyed | 규범강도 | 자동검증 | 표준UX저해 |
|---:|:---|:---|:---|:---|:---|:---|:---|
| 687 | 모든 상호작용 요소 키보드 도달 가능(HOVER_LOCK 가드 예외) | behavior | both | 입력 | 원칙 | **부분** — axe 기본 룰셋(`tests/e2e/helpers/axe.ts`)이 `tabindex`/`focusable-content` 계열만 잡는다 | 아니오 |
| 688 | focus ring은 명확히 보여야 한다 | visual | both | 없음 | **원칙(측정 불가)** | **아니오** — axe에 대응 룰 없음. `check-phase8:60`이 style 소스에 `focus-visible` 문자열이 있는지만 본다 | 예 — 「명확히」에 임계가 없다. 근거: WCAG 2.4.11/2.4.13은 측정 가능한 기준을 준다 |
| 689 | 카드 탐색 포커스의 시각 경계 = Card Shell 외곽, 내부 일부만 감싸는 표시 금지 | visual | both | 없음 | 금지 | **부분** — `tests/e2e/a11y-smoke.spec.ts:85–130`이 outline 기하·색을 읽어 스크린샷 클립 검사 | 아니오 |
| 690 | Desktop/Tablet available Test의 trigger/선택지에서 `Escape` → 단일 close + trigger 포커스 반환, 선택지 시작 시 동기 포커스 확보 | behavior | desktop-only | 입력 | 원칙 | 예 — §14.2 항목 5 ↔ `assertion:B5-keyboard-sequential`(`tests/e2e/state-smoke.spec.ts`) | 아니오 |
| 691 | 더 높은 우선순위 non-hidden `role="dialog"`가 열려 있으면 첫 `Escape`는 그 dialog만 닫음. 카드 disclosure는 dialog가 아님 | behavior | desktop-only | 입력 | 원칙 | 예 — `tests/e2e/a11y-smoke.spec.ts:679` | 아니오 |
| 692 | trigger↔A↔B 이동은 카드 내부 이동이라 close하지 않음. true focus-out은 close하되 destination 포커스 회수 안 함 | behavior | desktop-only | 입력 | 원칙 | 예 | 아니오 |
| 693 | `relatedTarget === null` + document/window focus 상실은 pure window blur로 보고 disclosure 유지 | behavior | desktop-only | 입력 | 구현지정 | 예 | 아니오 |
| 694 | **first/last grid edge 포함 카드 내부 focus trap 금지** | behavior | both | 없음 | 금지 | **아니오** — `tests/e2e/*.spec.ts`에서 "trap"은 instruction overlay가 *trap이어야 한다*는 반대 방향 단언 하나뿐(`a11y-smoke.spec.ts:679`). 카드 no-trap 단언 `0건` | 아니오(조항 자체는 옳다) |
| 695 | Mobile hamburger/desktop settings/back/X 버튼은 `aria-label` 필수 | behavior | both | 없음 | 원칙 | 예 — `check-phase8:46,50` 정적 + 실현 확인(`landing-grid-card.tsx:1239`) | 아니오 |

### 4.2 §9.2 Disabled Semantics (`697–711`) — 13개

전부 `behavior`, `mobileScope=both`, `widthKeyed=없음`. 자동검증은 `scripts/qa/check-phase8-accessibility-contracts.mjs`의 **정적 grep 4건**(`30`,`34`,`38`,`74`)과 axe 실행(`a11y-smoke`)이 나눠 갖는다. `qa:rules`는 Default Done gate 밖이므로 그 정적 4건은 평시에 돌지 않는다.

| 행 | 조항 | 규범강도 | 자동검증 | 비고 |
|---:|:---|:---|:---|:---|
| 699 | CTA/클릭 컨트롤은 기본적으로 `<button>`/`<a>` | 원칙 | 예(`check-phase8:30`) | |
| 700 | 카드 확장/진입 1차 트리거는 반드시 시맨틱 컨트롤 | 원칙 | 예 | §14.2 항목 5·Verification `726` |
| 701 | 비시맨틱 컨테이너 단독 활성화 트리거 금지 | 금지 | 예 | |
| 702 | unavailable 진입 불가를 시맨틱으로 표현 | 원칙 | 예 | |
| 703 | unavailable 1차 트리거 = `<button aria-disabled="true" tabindex="-1">`. native `disabled` 금지, `role` 대체 금지 (BQ-26/D1) | **구현지정** | 예(`check-phase8:34`) | 이유까지 조항에 적혀 있다 |
| 704 | available trigger accessible name = locale별 `card.title` 단일값, 전 구간 byte-identical | 값고정 | 예(§14.2 항목 5의 12-locale name cycle) | |
| 705 | Desktop/Tablet available trigger가 `aria-expanded` 소유. `opening`/`steady`/`handoff-target`=true | 값고정 | 예 | |
| 706 | always-mounted desktop stage의 `aria-hidden`은 같은 논리 판정. `aria-controls` 미사용 | 구현지정 | 예 | |
| 707 | unavailable의 `aria-disabled`/name/status/tabIndex ownership은 button 하나에만 | 원칙 | 예 | |
| 708 | `aria-disabled="true"` 대상은 click/keydown(`Enter/Space`) 기본 동작 차단 | 원칙 | 예 | |
| 709 | HOVER_LOCK 키보드 모드 비대상 카드는 `aria-disabled`가 아니라 `inert` | 구현지정 | 예 | |
| 710 | GNB→landing focus transfer는 `aria-disabled="true"` 트리거와 `inert` 조상 카드를 건너뛴다 | 원칙 | 예 | **이 절에서 유일하게 영어로 쓰인 조항** — 문서 일관성 결함 |
| 711 | `role="button"` 대체 금지, 불가피하면 §15 Exception Registry 등록 후에만 | meta | 예(`check-phase8:34`) | |

### 4.3 §9.3 Coming-soon Indicator Readability (`713–726`) — 6개 + V4

| 행 | 조항 | kind | 규범강도 | 자동검증 |
|---:|:---|:---|:---|:---|
| 715 | coming-soon 표준 태그는 tags-row에 상시 표시, `aria-hidden` 금지 | mixed | 금지 | 예(§14.2 항목 28) |
| 716 | unavailable button은 visible title=name, public coming-soon tag=description | behavior | 원칙 | 예 |
| 717 | coming-soon은 BQ-32 visible prefix의 첫 필수 항목, 가용 폭·Blog CTA 규칙으로 숨김 금지, hidden suffix unmount 제외 | mixed | 금지 | 예(§14.2 항목 27·28) |
| 718 | unavailable title/subtitle은 full opacity 유지, dim은 thumbnail에만 | visual | 금지 | 예(theme-matrix baseline) |
| 719 | `--surface-soft` 위에서도 포커스 링이 시각적으로 식별 가능 | visual | **원칙(측정 불가)** | **아니오** — 대비 임계 없음. axe `color-contrast`는 텍스트 대상이지 포커스 링 대상이 아니다 |
| 720 | tags row는 hard-coded group name 없이 native list semantics. Blog `Read more →`는 decorative, AT/focus 제외 | behavior | 원칙 | 예 |
| 723 | V1: **Manual** — 키보드-only 탐색 확인 | meta | — | **이 구간 72개 번호 항목 중 Manual은 셋뿐이고(`723` · `1101` · `1127`) 그중 §9가 하나를 갖는다** |
| 724 | V2: Automated axe-core + Playwright 키보드 시나리오 | meta | — | 예 |
| 725 | V3: Automated 오버레이 활성 시 포커스 스타일·`cardTitle` 식별 스크린샷 | meta | — | 예 |
| 726 | V4: Automated 1차 트리거 시맨틱 DOM 감사 | meta | — | 예 |

---

## 5. §10 Responsive Requirements (`730–733`)

**이 절에는 조항이 0개다.** `## 10`(`730`) 아래에 `### 10.2 GNB by Context`(`732`) 하나만 있고, 그 내용은 `GNB 컨텍스트 규칙은 Section 6.4를 단일 소스로 따른다(중복 정의 금지).`(`733`) 한 줄의 포인터다. **`### 10.1`은 존재하지 않으며, 저장소의 어떤 문서도 §10.1을 인용하지 않는다**(`docs/**/*.md` 전수 grep 결과 0건).

판정: **「Responsive Requirements」라는 이름의 절이 반응형 요구사항을 하나도 갖고 있지 않다.** 반응형 계약의 실체는 §6.1(Container & Breakpoints) · §6.6(Text & Clamp) · §6.7(Card Height & Bottom Spacing) · §8.4 · §8.5에 흩어져 있고, §8.5는 헤딩으로만 폭을 건다. 결과로 세 가지가 따라온다.

첫째, §3.2 Single-change Synchronization이 「테마/다크모드 정책 변경 시 Section 6, 8, **10**, 14를 동기화한다」(`65`)와 「Desktop settings 열기/닫기/gap 정책 변경 시 Section 6.4, **10.2**, 14.2를 동기화한다」(`74`)로 §10을 두 번 동기화 대상에 올리지만, §10에는 동기화할 내용이 없다 — 지시가 가리키는 곳이 비어 있다.

둘째, 320px Reflow(WCAG 1.4.10)·200% 확대(1.4.4)·터치 타깃 하한(2.5.8)처럼 **반응형 절이 마땅히 가져야 할 측정 가능한 요구가 문서 어디에도 없다.** 실측으로 320px은 재지 않았으므로 미확인이지만, 계약의 부재 자체는 확인된 사실이다.

셋째, 결정 2(입력 방식 기준 통일)를 등재할 자리가 **구조적으로 없다.** 폭/입력 판정은 §8.1이 갖고, 생명주기 분기는 §8.5 헤딩이 갖고, 레이아웃 티어는 §6.1이 갖는다. 세 곳에 흩어진 판정을 하나로 모으는 것이 이번 리팩터의 문서 측 첫 과제다 — §10이 그 빈 그릇이다.

---

## 6. §11 Performance Constraints (`737–765`) — 13개

### 6.1 §11.1 SSR/Hydration Determinism (`739–751`) — 7개 + V2

| 행 | 조항 | kind | 규범강도 | 자동검증 |
|---:|:---|:---|:---|:---|
| 741 | 초기 렌더에서 `window`/`localStorage`/`sessionStorage`/`Date.now`/`Math.random` 분기 금지. `useState initializer`·provider default·context init 동일 적용 | behavior | 금지 | **예** — `scripts/qa/check-phase9-performance-contracts.mjs:39–46,105–118`의 정적 grep(단, `qa:rules`는 Default Done gate 밖) |
| 742 | 중립 초기 상태 사용(consent `UNKNOWN`, interaction mode는 SSR neutral) | behavior | 원칙 | 예(같은 파일 `39–46`) |
| 743 | `useSearchParams()` Client Component는 가장 가까운 위치에 Suspense 경계 | behavior | 구현지정 | 예(§14.2 항목 1) |
| 744 | 위 조건 미충족으로 정적 렌더 구간이 CSR bailout 되는 구성 불허 | behavior | 금지 | 부분 — build 통과로 간접 |
| 745 | root layout의 request-scoped `lang` 해석은 proxy 주입 locale header만 입력일 때 허용 | behavior | 원칙 | 예(EX-003 V1) |
| 746 | hydration warning 1건이라도 발생하면 릴리스 차단 | meta | 금지 | 예 |
| 747 | hydration warning `0건`은 자동화 로그로 증명, 수동 확인만으로 PASS 금지 | meta | 금지 | **예** — `tests/e2e/routing-smoke.spec.ts:23,168–184`가 console을 수집해 `toEqual([])` |
| 750–751 | V1 build/preview 로그 수집 · V2 금지 API 정적 분석 | meta | — | 둘 다 실재 |

### 6.2 §11.2 Animation Guardrails (`753–757`) — 3개

| 행 | 조항 | kind | 규범강도 | 자동검증 |
|---:|:---|:---|:---|:---|
| 755 | Expanded 관련 모션은 transform/opacity 중심 | interaction | **원칙(측정 불가)** | **아니오** — 「중심으로 구성한다」에 임계가 없다. 어떤 grep도 이 절 이름으로 걸려 있지 않다 |
| 756 | 비확장 row 재계산 유발 구현 금지 | behavior | 금지 | **부분** — §14.2 항목 4의 「same-row 비대상 카드 top/bottom/outer height 오차 `0px`」가 근접 대리 단언이지만 §11.2를 직접 인용하지 않는다 |
| 757 | rapid hover/tap 반복에서 런타임 예외 0건 | behavior | 값고정(0건) | **예** — `tests/e2e/state-smoke.spec.ts:1176–1182,1262`가 `pageerror`를 모아 `toEqual([])`. `tests/e2e/transition-telemetry-smoke.spec.ts:764–767,836` 동일 |

**Verification 블록 없음.** 이 절은 §14.2 어느 항목도 명시적으로 인용하지 않으며, 세 조항 중 하나만 자동 단언을 갖는다.

### 6.3 §11.3 Reduced Motion / Low-spec (`759–765`) — 3개 + 구조 결함 1

`760`이 **Rule** 본문이다: `prefers-reduced-motion`에서 대형 이동 금지, `150~220ms` 단순 전환으로 축소, 저사양 fallback은 시각 효과보다 상태 일관성 우선.

`762`에 **두 번째 `**Rule**:` 블록이 제목 없이 붙어 있다** — 그 아래 3개(`763` 커스텀 커서 금지 · `764` available 카드/CTA에만 pointer · `765` unavailable은 기본 커서)는 커서 정책이며 「Reduced Motion / Low-spec」과 주제가 다르다. **이것은 절 없는 고아 규칙이고, 인용할 절 번호가 없다** — §3.2가 커서 정책 변경의 동기화 대상을 지정할 수 없는 이유다.

| 행 | 조항 | kind | 규범강도 | 자동검증 |
|---:|:---|:---|:---|:---|
| 760 | reduced-motion에서 대형 이동 금지, `150~220ms` 단순 전환, 저사양은 상태 일관성 우선 | interaction | 범위 | **예** — `tests/e2e/state-smoke.spec.ts:1212`가 `expect(normalizedMotionMs).toBe(180)`. `assertion:B14-mobile-reduced-motion`(모바일 측) |
| 763 | 커스텀 커서 금지 | visual | 금지 | 예 — `check-phase9:50–65` 정적 grep |
| 764 | available 카드/CTA에만 pointer | visual | 원칙 | 예 — 같은 검사 |
| 765 | unavailable 카드는 기본 커서 유지 | visual | 원칙 | 예 — 같은 검사(`aria-[disabled=true]:cursor-default`) |

`763–765`는 **터치 기기에서 의미가 없는 조항이 절 이름 없이 계약에 남아 있는 경우**다. 커서 정책은 hover-capable 입력에만 적용되므로 결정 2 아래에서는 입력 게이트를 명시해야 한다.

---

## 7. §12 Telemetry / Logging Contract (`769–843`) — 41개

**이 절의 41개는 전수 확인했고 `kind=behavior` · `mobileScope=both` · `widthKeyed=없음` · `obstructsStandardUx=아니오`가 41/41이다.** 뷰포트·입력·모션을 언급하는 조항이 하나도 없다. 따라서 조항별 행 대신 아래 요약으로 적고, **예외로 갈라져 나오는 조항만** 개별로 적는다 — 이 구간에서 예외는 0건이다.

| 절 | 행 | 조항 수 | 규범강도 분포 | 자동검증 | 결정 5(telemetry 계약 개정 범위) 관련 |
|:---|:---|---:|:---|:---|:---|
| 12.1 Logging Scope & V1 Event Set | 771–785 | 7 | 값고정 5 · 금지 2 | 예 — `assertion:B9-opted-out-no-send`, §14.2 항목 9·18 | `transition_start/complete/fail/cancel`은 내부 신호이며 전송 대상이 아니다(`783`) — IA 재설계로 전환 표면이 늘어도 이벤트셋은 늘지 않는다 |
| 12.2 Required Fields per Event | 787–803 | 9 | 값고정 9 | 예 — `assertion:B18-final-submit-validation` 외 4건(`tests/unit/landing-telemetry-validation.test.ts` · `telemetry-route.test.ts`) | `card_answered`의 `source_variant`/`target_route`/`landing_ingress_flag`(`790`)는 카드 UI 형태와 무관 |
| 12.3 Payload Boundaries | 805–812 | 6 | 금지 4 · 값고정 2 | 예 — validator가 legacy field를 거부(`812`) | — |
| 12.4 Consent State Machine | 814–822 | 7 | 값고정 4 · 금지 3 | 예 — §14.2 항목 9, `assertion:B20~B23`(`tests/e2e/consent-smoke.spec.ts`) | `816` SSR/초기 렌더 `UNKNOWN` 고정은 §11.1:742와 짝. **결정 2가 SSR 중립값을 건드릴 때 함께 읽어야 하는 선례** |
| 12.5 Anonymous ID Policy | 824–830 | 5 | 값고정 3 · 금지 2 | 부분 — 생성 우선순위(`827`)의 직접 단언 미확인 | — |
| 12.6 Data Source Contract | 832–843 | 7 + V1 | 원칙 4 · 값고정 3 | 예 — `assertion:B29-*`, `tests/unit/landing-data-contract.test.ts` | `840` fixture 최소(Test `4+` · Blog `3+` · unavailable `2+`)는 그리드 배치 재설계 시 카드 개수 하한으로 작용 |

§12에서 이번 리팩터가 실제로 건드릴 수 있는 자리는 **`822`(Vercel Analytics/Speed Insights bridge가 동일 consent source를 따르고 `OPTED_IN` 전 render/network attach 금지)** 하나뿐이며, 그것도 §8.4:609의 consent banner 회피 계약과 이어진다.

## 8. §13 Error / Empty / Not-Found Handling (`846–1046`) — 107개(규칙 불릿 90 + 표 행 17. 별도로 §13.6 QA 최소 액션 케이스 3 · Verification 번호 항목 19)

§13은 대부분 `behavior` · `widthKeyed=없음`이다. 아래는 절 단위 요약이고, **`interaction`/`mixed`이거나 mobileScope가 `both`가 아닌 조항만** 개별로 뽑았다.

| 절 | 행 | 조항 수 | 지배 kind | 자동검증 | 개별로 뽑을 조항 |
|:---|:---|---:|:---|:---|:---|
| 13.1 Missing Slot Handling | 848–853 | 4 | visual | 예(§14.2 항목 10) | `851` tags 빈값에서도 슬롯 1줄 높이 유지 — `visual`, 폭 무관, 모바일 세로 예산에 직접 영향 |
| 13.2 Unavailable Card UX | 855–862 | 4 + adapter 1 | behavior | 예(§14.2 항목 28) | `859` coming-soon은 **모든 입력 모드(hover/tap)**에서 상시 표시 — 이 구간에서 입력 모드를 문면으로 열거한 드문 조항 |
| 13.3 Landing→Destination Handshake | 864–882 | 17 | behavior | 예 — `assertion:B15/B16/B28-*` | `879` pending transition timeout `1600ms` = 값고정. 모바일 회선에서 fail terminal을 만드는 유일한 수치 |
| 13.4 `scoring1` Pre-answer & Instruction Start | 884–900 | 15 | behavior | 예 — `assertion:B6/B28-*` | `899` staged entry 7분 만료는 **target/future contract이고 live가 enforce하지 않는다** — 문서가 미구현을 스스로 적은 자리 |
| 13.5 Instruction Contract | 902–964 | 3 + 7 + 13표행 + 2 + 8 | behavior | 예 — `assertion:B20~B23`(V 10개) | `906` **Desktop: centered card overlay / Mobile: full-screen overlay** — §13에서 유일하게 폭에 걸린 시각 조항. `mobileScope=both`이지만 표현이 갈린다 |
| 13.6 Pre-answer Lifecycle / Failure Rollback | 966–994 | 16 + QA 3 | behavior | 예 — `assertion:B16-rollback-cleanup` 외 3 | — |
| 13.7 Question Dwell Time | 996–997 | 1 | behavior | 예(V4 `1012`) | — |
| 13.8 Return Restoration | 999–1012 | 6 + V4 | behavior | 예 — `assertion:B17-return-restore` | `1006` **복원 과정에서 자동 viewport 보정 스크롤 금지** — §8.5:641과 같은 금지가 두 곳에 있다 |
| 13.9 Opt-out Card Contract | 1014–1046 | 7 + 4표행 + V5 | behavior | 예 — `assertion:B20~B23` | `1030` 「페이지 리로드 없이 반영을 **권장**하나 구현 방식은 구현자 재량」 — 이 구간에서 재량을 명시한 유일한 조항 |

## 9. §14 Acceptance Criteria & DoD (`1050–1114`) · §15 Exception Registry (`1118–1147`)

### 9.1 §14.1 Release Gate (`1052–1057`) — 4개, 그리고 실측 불일치

| 행 | 조항 | 문서가 말하는 것 | 저장소가 하는 것 | 판정 |
|---:|:---|:---|:---|:---|
| 1054 | 릴리스 게이트 명령은 `npm run qa:gate`로 고정 | — | `qa:gate = qa:gate:once ×3`(`package.json`) | 일치 |
| 1055 | `qa:gate`는 **최소 `build && test && test:e2e:smoke`**를 포함해야 한다 | `test:e2e:smoke` 포함 | `qa:gate:once = qa:static && build && test && **test:e2e:gate**` | **불일치** |
| 1056 | 1건 실패 시 릴리스 차단 | — | — | 일치 |
| 1057 | 최종 PASS는 연속 3회 통과(3/3) | — | `qa:gate:once` ×3 | 일치 |

`1055`의 불일치는 규모가 크다. `test:e2e:smoke = playwright test --grep @smoke`이고 `@smoke` 태그는 `tests/e2e/*.spec.ts`에 **153개**, `test:e2e:gate = --grep @gate`이고 `@gate` 태그는 **7개 선언 지점**뿐이다 — `tests/e2e/safari-hover-ghosting.spec.ts:289,308,328,342,359,369`의 6개와 `tests/e2e/theme-matrix-smoke.spec.ts:374` 한 개(이것만 matrixCase 루프 안이라 다수로 펼쳐진다).

그래서 **릴리스 게이트가 실제로 도는 e2e는 「테마 매트릭스 시각 baseline + safari hover ghosting 6건」이고, §8·§9·§11·§12·§13의 행동 단언을 담은 `grid-smoke`·`state-smoke`·`a11y-smoke`·`transition-telemetry-smoke`·`consent-smoke`·`gnb-smoke`·`routing-smoke`는 `qa:gate`에 들어 있지 않다.** 이들은 `npm run test:e2e` 또는 `test:e2e:smoke`를 따로 부를 때만 돈다. Default Done gate(`lint`/`typecheck`/`test`/`build`)에는 vitest만 있으므로 **이 구간 Verification의 절대다수가 어떤 상시 게이트에도 걸려 있지 않다.**

### 9.2 §14.2 Detailed QA Matrix (`1059–1090`) — 30개

30개 전부 `meta`(다른 절의 조항을 릴리스 차단 항목으로 승격). 이 구간과 직접 짝을 이루는 것은 항목 4(§6,7,8,9) · 5(§7,8,9) · 6(§8,12,13) · 13(§8.2,8.3) · 14(§8.5) · 24(§8.4) · 26(§6.7) · 27(§6.6) · 28(§6.6,9.3,13.2) · 29(§6.6,8.5)다.

**§14.2 항목 14가 §8.5 전체를 대표하고, 그 아래 7개 assertion이 모두 `tests/e2e/transition-telemetry-smoke.spec.ts`에 있다**(`docs/blocker-traceability.json` blocker 14). 모바일 생명주기를 바꾸면 이 7개가 함께 붉어진다 — 개정 비용의 대부분이 여기다.

### 9.3 §14.3 Release Traceability Closure (`1092–1101`) — 3 + V2, 그리고 의미 공백

`1095`가 「§14.2의 각 항목은 최소 1개 이상의 automated assertion에 매핑되어야 한다」고 요구하고 `1100`이 그 검사를 Automated로 지정한다. 집행부는 `scripts/qa/check-blocker-traceability.mjs`다.

그 검사가 실제로 보는 것은 **⑴ `docs/req-landing.md` §14.2에서 번호 집합을 읽고**(`readBlockerItemNumbers`, `17–40행`), **⑵ `docs/blocker-traceability.json`의 각 엔트리가 `blocker`(수) · `file`(실재) · `assertionId`(그 파일 안에 실재) · `kind`(3종 중 하나)를 갖는지 보고**(`88–130행`), **⑶ 문서 번호 집합과 등록부 번호 집합을 양방향으로 대조한다**(`135–150행`). **의미 대조는 하지 않는다** — 번호 N의 assertion이 §14.2 항목 N을 실제로 재는지는 검사 대상이 아니다.

그 공백이 실제로 벌어져 있다. 등록부에서 blocker 24–30은 전부 `docs/req-test.md` 또는 test-flow 단위 테스트를 가리킨다.

| §14.2 항목 | req-landing이 말하는 주제 | 등록부가 붙든 assertion | 그 assertion의 주제 |
|---:|:---|:---|:---|
| 24 | Active Expanded Width / Overflow (§8.4) | `assertion:B24-commit-failure` (`docs/req-test.md:1297`, manual_checkpoint) | runtime entry commit 실패 |
| 25 | Settled Measurement Invalidation (§6.7) | `assertion:B25-derivation-failure` (`docs/req-test.md:1299`) | scoring derivation 실패 |
| 26 | Transition Non-comp Stability (§6.7) | `assertion:B26-traceability-closure` (`docs/req-test.md:1301`) | traceability |
| 27 | BQ-32 Tag Fit (§6.6) | `assertion:B27-type-segment-parsing-*` | type segment 파싱 |
| 28 | CTA / Status Priority (§6.6,§9.3,§13.2) | `assertion:B28-cross-phase-event-integrity-*` | telemetry 이벤트 무결성 |
| 29 | Responsive Subtitle Matrix (§6.6,§8.5) | `assertion:B29-sheets-sync-*` | Google Sheets sync |
| 30 | BQ-30 Tag Visuals (§6.6, design.md) | `assertion:B30-runtime-lazy-validation-*` | runtime lazy validation |

판정: **§14.3이 요구하는 「매핑 누락 `0건`」은 번호 차원에서 초록이고 의미 차원에서 7/30이 공백이다.** 그중 24와 29는 이 리팩터가 직접 건드리는 §8.4·§8.5를 주제로 하며, 지금 그 둘에 붙어 있는 것은 이번 리팩터와 무관한 test-flow 문서의 manual checkpoint다. 등록부 파일은 Ask-First(`AGENTS.md §4`)이므로 손대기 전에 승인이 필요하다.

`1101` V2는 「Manual: 릴리스 리뷰에서 매핑 표 샘플링 검수」다. 이 구간에서 사람을 행위자로 지목한 항목은 셋뿐이다 — `723`(키보드-only 탐색) · `1101`(매핑 표 샘플링) · `1127`(production build 404 화면·상태코드 확인). **셋 다 기계가 할 수 있는 일이다**: `723`은 Playwright 키보드 시나리오가 이미 `a11y-smoke`에 있고, `1101`은 §9.3에서 적은 의미 대조 공백을 메우는 검사가 대신할 수 있으며, `1127`은 `assertion:B30-runtime-lazy-validation-error-route`(`tests/e2e/routing-smoke.spec.ts`)가 이미 인접 영역을 덮는다.

### 9.4 §14.4 Visual Redesign Preservation Contract (`1103–1114`) — 9개

§3.7 Q5에서 별도로 판정한다.

### 9.5 §15 Exception Registry (`1118–1147`) — 3건

| 항목 | 행 | 주제 | kind | 이번 리팩터 영향 |
|:---|:---|:---|:---|:---|
| EX-001 | 1120–1127 | `global-not-found` 버전 종속 운용. 현행 버전 표기 `16.1.6` | meta | **문서 오류** — `AGENTS.md §1`이 스택을 `next@16.2.4`로 적는다. EX-001의 `16.1.6`은 낡은 값이다 |
| EX-002 | 1129–1133 | `UNKNOWN`/`OPTED_OUT`에서 비필수 클라이언트 텔레메트리 전송 금지 | meta | 없음 |
| EX-003 | 1135–1147 | request-scoped root `html lang` | meta | 없음 |

§9.2:711이 「`role="button"` 대체는 §15 등록 후에만 허용」이라고 §15를 확장 지점으로 지정하지만, 현재 §15에 a11y 예외 항목은 0건이다.

---

## 10. 집중 질문 5

### Q1 — §8.1 Capability Gate의 SSR 초기값과 결정 2의 충돌

**조항 원문** — `req-landing.md:516`: `- SSR 초기값은 Tap Mode, mount 후 동기화`. 이 한 줄이 SSR 초기값을 정하는 이 절의 전부다.

**구현이 그것을 지키는 방식** — `resolveInteractionMode(viewportWidth, hoverCapability)`가 `width<768`이면 `'tap'`, 아니면 `hoverCapability ? 'hover' : 'tap'`을 준다(`src/features/landing/grid/use-landing-interaction-controller.ts:71–77`). SSR에서 `hoverCapability`는 `useState<boolean>(false)`(`:112`)이고 `viewportWidth`는 `INITIAL_VIEWPORT_WIDTH = 1280`(`src/features/landing/grid/landing-catalog-grid.tsx:28`, `:53`)이다. 따라서 SSR 초기값은 `(1280, false) → 'tap'`이고 `516`은 지켜진다. 동기화는 `window.matchMedia('(hover: hover) and (pointer: fine)')`를 `useLayoutEffect`에서 읽어 이뤄진다(`use-landing-interaction-controller.ts:207–219`).

**충돌의 정확한 자리는 「모드」가 아니라 「생명주기」다.** `516`이 중립값을 정하는 축은 `interactionMode`(hover/tap) 하나뿐이다. 그런데 모바일/데스크톱 생명주기를 가르는 축은 그것이 아니라 `isMobileViewport = viewportTier === 'mobile'`(`use-landing-interaction-controller.ts:157`)이고, `viewportTier = resolveLandingViewportTier(viewportWidth)`(`landing-catalog-grid.tsx:55`)는 `viewportWidth <= MOBILE_MAX_VIEWPORT_WIDTH(767)`만 본다(`src/features/landing/grid/layout-plan.ts:63–73`, `:1`). **즉 SSR 초기 상태는 「tap mode이면서 desktop tier」이고, 이것이 실측된 터치 태블릿 프로브(900×1200 → `tier=tablet · mode=tap · layer=desktop-overlay`)와 같은 상태다.** 프로브가 본 것은 버그가 아니라 SSR 중립값이 mount 후에도 유지된 결과다.

**결정 2가 요구하는 변경과 §8.1의 충돌은 셋이다.**

⑴ **결정 2는 §8.1이 정하지 않은 축에 값을 요구한다.** `516`은 `interactionMode`의 SSR 중립값만 정한다. 결정 2는 `isMobileViewport`(생명주기 축)를 입력 방식에 걸라고 요구하므로, **SSR에서 그 축이 무엇이어야 하는지를 정하는 조항이 신설되어야 한다.** 현행 §8.1에는 그 자리가 없다.

⑵ **그 새 중립값은 §11.1과 정면으로 만난다.** `req-landing.md:741`이 초기 렌더 경로의 `window` 분기를 `useState initializer`까지 포함해 금지하고 `742`가 중립 초기 상태를 요구한다. 입력 방식은 `matchMedia`로만 알 수 있고 그것은 mount 후에만 읽을 수 있으므로(`use-landing-interaction-controller.ts:207`), SSR은 둘 중 하나를 고를 수밖에 없다 — **(a) 터치 생명주기를 중립값으로 두면** hover 데스크톱 사용자 전원이 mount 시 desktop 생명주기로 뒤집힌다, **(b) desktop 생명주기를 중립값으로 두면** hover 없는 기기 전원이 mount 시 모바일 생명주기로 뒤집힌다. `hoverCapability`의 현행 초기값이 `false`(`:112`)이므로 코드는 이미 (a) 쪽 기본값을 갖고 있으면서 `viewportWidth = 1280`으로 (b) 쪽 결과를 내고 있다 — **두 축의 중립값이 서로 반대를 가리킨다.**

⑶ **뒤집힘이 일어나는 자리를 §8.5가 금지한다.** `625`(in-flow 유지, top jump 금지)와 `626`(transition window y-anchor 편차 없이 유지)은 지금 「전개/축소 전환」에만 걸린다. 결정 2 아래에서는 하이드레이션 경계에서 레이아웃 티어가 바뀔 수 있으므로 **전환이 아닌 첫 페인트 직후에 배치가 뒤집히는 경로**가 새로 생긴다. 현행 문서에는 그 경로를 규율하는 조항이 없고, 대신 `tests/e2e/grid-smoke.spec.ts:2285`(「mobile landing paints its grid once — no hydration re-plan shift」)가 그 성질을 이미 테스트로 붙들고 있다 — **결정 2를 적용하면 이 테스트가 결정과 충돌하는 첫 번째 자산이 된다.**

부수적으로, `514`·`515`가 말하는 "capability"의 정의(`(hover: hover) and (pointer: fine)`)가 문서에 없다. 결정 2는 그 정의를 계약의 중심으로 끌어올리므로 등재가 필요하다.

### Q2 — §8.2가 「진입」만 규정하는가

**규정한다 — 단 포인터 경로에 한정해서다. 터치(Tap Mode, `width>=768`)의 이탈은 규정하지 않는다.**

§8.2가 이탈을 규정하는 조항은 여섯이다: `528`(**포인터 이동으로** 경계 완전 이탈 시 collapse) · `529`(실행 시점 최신 경계 판정) · `544`(유예 `100~180ms`, 현행 `140ms`) · `546`(다음 **실제 포인터 이동**에서 재판정) · `547`(뷰포트 완전 이탈 시 hold 해제 후 collapse) · `550`(Escape·handoff·전환 시작·hover 모드 이탈에서 hold 해제). **여섯 중 다섯이 문면에 「포인터 이동」 또는 「hover 모드」를 전제로 적는다.**

Tap Mode를 다루는 조항은 `534` 하나뿐이고 그 문장은 이렇다: `- Tap Mode fallback(`width>=768`): tap으로 Expanded 진입, 전환 비주얼 계약은 hover 경로와 동일하다.` — **「진입」과 「전환 비주얼」 둘만 적고 이탈을 적지 않는다.**

Tap Mode에서 남는 이탈 경로는 계약상 넷이며 넷 다 사용자가 「닫으려고」 쓰는 동작이 아니다: §8.3:580의 Escape/true focus-out(키보드) · §8.4:610의 다중 Expanded 금지가 만드는 handoff(다른 카드 탭) · §8.2:539의 폭 변경 강제 종료 · §8.6의 전환 시작. **터치 사용자가 「이 카드를 닫겠다」는 의도로 쓸 수 있는 명시적 dismiss는 `width>=768`에 존재하지 않는다.**

실측과의 대조: 900×1200 프로브에서 닫기 X `0`개 · backdrop `0`개 · 재탭 불가(trigger가 `pointer-events-none`이고 답변 버튼이 가로챔)는 계약의 침묵과 정확히 일치한다. 반면 **「바깥 탭은 닫힘」은 어떤 조항도 규정하지 않은 창발 동작**이다 — 브라우저가 터치를 마우스 이벤트로 에뮬레이트하면서 `mouseout`이 발생하고 `528`의 포인터 이탈 경로가 우연히 성립한 결과로 보인다(이 인과는 실측으로 확인하지 않았다 — 미확인). 계약이 규정하지 않은 채 우연히 동작하는 유일한 탈출구이므로, 리팩터 중 포인터 경로를 손대면 **경고 없이 사라질 수 있다.**

대조로 §8.5(`width<768`)는 `632`에서 닫기 경로를 명시 화이트리스트로 규정한다(`X 버튼` 또는 `카드 외부(backdrop) 탭`만). **같은 터치 입력인데 폭 하나로 한쪽은 닫기 계약이 있고 한쪽은 없다** — 결정 2가 해소하려는 결함의 문서 측 원형이 이것이다.

### Q3 — §8.5 하위 규칙 32개와 폭/입력 귀속

전수 표는 §3.5에 있다. 귀속만 모으면 이렇다.

- **실질이 입력(터치/탭 시퀀스)에 걸린 것 — 10개**: `621 622 623 624 631 632 643 649 650 651`. 결정 2 아래에서 이 10개는 **폭 게이트를 떼고 「hover 없는 입력」 게이트로 그대로 옮기면 된다** — 의미가 보존된다.
- **실질이 폭(레이아웃 치수)에 걸린 것 — 11개**: `625 626 627 628 629 630 633 637 640 641 652`. 이들은 **입력 게이트로 옮기면 의미가 깨진다** — 1280px 터치 모니터에서 `625`(in-flow full-bleed)와 `641`(자동 보정 스크롤 금지)을 그대로 적용하면 데스크톱 폭에 전면 시트가 펼쳐진다. **결정 2를 적용할 때 이 11개는 폭 조건을 별도로 남겨야 하며, 이것이 「isMobileViewport를 입력 방식으로 통일」이 문자 그대로는 불가능한 이유다** — 한 축을 입력으로 옮기면 폭 축이 사라지는 것이 아니라 **두 축이 필요해진다.**
- **폭·입력 어느 쪽에도 걸리지 않는 순수 상태·레이어 불변식 — 11개**: `634 635 636 638 639 642 644 645 646 647 648`. 결정 2와 무관하게 그대로 남는다.

10 + 11 + 11 = 32. 경계가 애매한 둘은 `633`(닫힘 후 형상 연속성 + page scroll 위치 유지 — 앞은 폭, 뒤는 상태)과 `640`(스크롤 소유자 + viewport 초과 판정 — 앞은 상태, 뒤는 폭)이며, 둘 다 §11의 mixed 분리 대상에 올려 두었다.

- 이 중 **`636`(전환 `220~360ms`, 기준 `280ms`)은 폭에도 입력에도 걸리지 않는 순수 모션 값이면서 §8.3:570의 `280ms` 고정과 갈린다** — 같은 전환을 두 절이 다른 규범강도(범위 vs 고정)로 규정하는 문서 내부 모순이다.

### Q4 — §9·§10·§11의 자동 검증 실태

판정은 `tests/**`와 `scripts/qa/**`를 실제로 grep한 결과이며, 「자동」은 **그 조항을 재는 실행 가능한 단언이 실재한다**는 뜻이고 그 단언의 본문까지 읽은 것은 표시한 항목뿐이다.

| 조항 | 자동/산문 | 근거 | 어느 게이트에서 도는가 |
|:---|:---|:---|:---|
| §9.1:687 키보드 도달 | **부분 자동** | axe 기본 룰셋(`tests/e2e/helpers/axe.ts` — 태그 필터·비활성 룰 없음) | `test:e2e`/`test:e2e:smoke`만 |
| §9.1:688 focus ring 「명확히」 | **산문** | 대응 axe 룰 없음. `check-phase8:60`은 style 소스의 `focus-visible` 문자열 존재만 본다 | `qa:rules`(release-level) |
| §9.1:689 focus 경계=Card Shell | **자동** | `tests/e2e/a11y-smoke.spec.ts:85–130`(outline 기하·색 → 스크린샷 클립) | smoke만 |
| §9.1:690–693 Escape/focus-out | **자동** | §14.2 항목 5 ↔ `assertion:B5-keyboard-sequential`, `a11y-smoke.spec.ts:679` | smoke만 |
| §9.1:694 **카드 내부 focus trap 금지** | **산문** | `tests/e2e/**`의 "trap" 일치는 instruction overlay가 *trap이어야 한다*는 반대 단언 1건뿐 | 없음 |
| §9.1:695 aria-label 필수 | **자동(정적)** | `check-phase8:46,50` | `qa:rules` |
| §9.2 전체(13) | **자동(정적 4 + axe)** | `check-phase8:30,34,38,74` + axe | `qa:rules` + smoke |
| §9.3:715–718,720 | **자동** | §14.2 항목 27·28, theme-matrix baseline | `qa:gate`(theme-matrix만) + smoke |
| §9.3:719 `--surface-soft` 위 포커스 링 식별 | **산문** | 임계 없음. axe `color-contrast`는 텍스트 대상 | 없음 |
| §9 V1(`723`) | **Manual 명시** | 조항 스스로 Manual | — |
| **§10 전체** | **해당 없음** | 조항 0개 | — |
| §11.1:741–747 | **자동** | `check-phase9:39–46,105–118` 정적 + `tests/e2e/routing-smoke.spec.ts:23,168–184` console 수집 → `toEqual([])` | `qa:rules` + smoke |
| §11.2:755 transform/opacity 중심 | **산문** | 임계 없음. 이 절을 인용하는 검사 0건 | 없음 |
| §11.2:756 비확장 row 재계산 금지 | **부분 자동** | §14.2 항목 4의 same-row `0px` 단언이 근접 대리이나 §11.2를 인용하지 않는다 | smoke |
| §11.2:757 rapid 반복 예외 `0건` | **자동(본문 확인)** | `tests/e2e/state-smoke.spec.ts:1176–1182,1262` · `transition-telemetry-smoke.spec.ts:764–767,836` — `pageerror` 수집 후 `toEqual([])` | smoke만 |
| §11.3:760 reduced-motion `150~220ms` | **자동(본문 확인)** | `tests/e2e/state-smoke.spec.ts:1212` — `expect(normalizedMotionMs).toBe(180)`. 모바일은 `assertion:B14-mobile-reduced-motion` | smoke만 |
| §11.3:763–765 커서 정책 | **자동(정적)** | `check-phase9:50–65` | `qa:rules` |

**측정 규범과의 대조 — 이 구간에 계약이 아예 없는 항목.** WCAG 2.5.8 Target Size(24px)는 **조항은 없지만 검사는 돈다** — axe-core `4.11.1`(`package-lock.json:4407`)의 `target-size` 룰이 기본 활성이고(`axe.getRules()`에서 `tags: [cat.sensory-and-visual-cues, wcag22aa, wcag258]` 확인) `expectPageToBeAxeClean`이 룰 필터 없이 전체를 돌린다. 실측된 `testChipClassName` `min-h-8 = 32px`가 24px 하한을 통과하므로 이 검사는 초록이고, **44px 플랫폼 관용치는 WCAG 요구가 아니므로 어떤 검사도 잡지 않는다.** 반면 WCAG 2.4.11 Focus Not Obscured · 2.5.7 Dragging Movements · 1.4.10 Reflow(320px) · 1.4.4 Resize text(200%)는 **조항도 없고 axe 룰도 없다** — 이 넷은 이 구간 전체에서 완전한 공백이다. 1.4.3 대비는 axe `color-contrast`(기본 활성)가 커버하되 **텍스트 한정**이며 포커스 링·경계선은 대상이 아니다.

**axe가 도는 범위도 한정적이다.** `a11y-smoke.spec.ts`의 axe 호출은 landing canonical / GNB open / mobile expanded + destination / transition overlay / **KR 대표** / test flow 6묶음이다(`227,397,513,532,550,662,736`). **12 locale 중 axe가 도는 것은 `en`과 `kr` 둘뿐이다.**

### Q5 — §14.4 Visual Redesign Preservation Contract가 이번 리팩터를 얼마나 묶는가

**판정: 문면으로는 9개 전부가 보존 명령이고, 실효로는 이번 리팩터를 묶는 조항이 0개다. 다만 그 이유가 「약해서」가 아니라 「전부 다른 절의 사본이어서」이며, 그 사본성 자체가 이번 리팩터의 실질 위험이다.**

⑴ **적용 전제가 성립하지 않는다.** `1105`가 절을 여는 조건절은 「**시각 스타일 또는 디자인 시스템을 재구현하더라도**」다. 이번 작업은 사용자 결정 1(계약 개정 전면 허용)·3(전 표면 동시)·5(IA 재설계 허용)에 의해 계약 개정이지 시각 재구현이 아니다. 문면상 §14.4의 발동 조건 밖이다.

⑵ **9개 전부가 다른 절에 정본을 갖는 사본이다.** `1106`(Normal에 entry CTA 금지 · Test A/B는 Expanded에서만 · Blog는 whole-card link) → §8.6:671–672와 §6.5. `1107`(enterable = `available|opt_out`) → §8.2:530 · §13.2. `1108`(end-user catalog 필터) → §13.9:1020–1033 + 노출표. `1109`(landing preview는 first scoring question만) → §12.6:838. `1110`(Test는 ingress+`card_answered` 생성, Blog는 미생성) → §13.3:881. `1111`(pending/terminal/rollback · duplicate-locale no-op · return scroll 1회 · destination-ready complete) → §13.3:874–880 · §13.6 · §13.8. `1112`(GNB context별 control set · landing-only focus transfer) → §6.4 · §9.2:710. `1113`(consent-gated telemetry + Vercel bridge) → §12.4:822. `1114`(data-testid · semantic button/link · inert/aria-disabled 가드) → §9.2 전체. **§14.4 고유의 조항은 0개다.**

⑶ **§14.4에는 Verification 블록이 없고, §3.2 동기화 대상 목록에도 없다.** §3.2(`57–76`)는 §14.2를 12번 지목하지만 §14.4는 **한 번도 지목하지 않는다.** 즉 본절(§8.6·§13.3·§13.9·§12.4·§9.2)을 고칠 때 §14.4를 함께 고칠 문서상의 의무가 없다. **사본이면서 동기화 의무가 없는 절이므로, 구조상 조용히 어긋나게 되어 있다.** 이번 리팩터가 본절을 전면 개정하면 §14.4는 자동으로 낡은 계약이 되고, 그때 어느 쪽이 정본인지 문서는 말하지 않는다.

⑷ **그럼에도 실제로 걸리는 한 줄이 있다면 `1106`이다.** 「Normal/front 상태에는 별도 entry CTA를 추가하지 않는다」는 모바일 IA 재설계가 흔히 쓰는 두 패턴 — Normal 카드의 명시적 열기 버튼, 그리고 sticky CTA — 를 문면으로 막는다. 다만 이것도 §8.6:671의 사본이므로, **§8.6을 개정하면서 §14.4를 남겨 두는 것이 유일한 위험 시나리오**다.

**권고(결정 아님, 사용자 판단 대상)**: §14.4를 「보존 계약」이 아니라 「본절 인덱스」로 다시 쓰거나, `1114`(a11y 가드 보존) 한 줄만 남기고 나머지 8개를 정본 절로 되돌린다. `1114`는 `check-phase8`의 정적 4건과 짝이 맞는 유일한 조항이라 보존 가치가 실재한다.

---

## 11. mixed 조항 — 문장 인용과 분리안

이 구간에서 한 조항이 behavior와 interaction(또는 visual)을 함께 규정해 **결정 6(동작 계약/인터랙션 계약 분리)을 적용할 때 반드시 갈라야 하는 조항**은 아래 11건이다.

| 행 | 인용 | 동작 계약으로 갈 부분 | 인터랙션 계약으로 갈 부분 |
|---:|:---|:---|:---|
| 532 | `handoff(카드 A→B)에서 카드 A는 scale/높이/빈공간 잔류 없이 즉시 Normal 정착해야 하며, same-row 비대상 카드 하단 여백 증가를 금지한다.` | 「handoff 시 source는 Normal 상태로 정착한다」 + 「비대상 카드의 레이아웃은 불변」 | 「정착은 즉시(`0ms`)이며 scale/높이/빈공간 잔류가 없다」 |
| 572 | `reveal 항목 순서는 DOM 순서와 일치해야 한다.` | 「상세 블록의 DOM 순서가 읽기 순서의 정본」 | 「reveal 연출 순서는 그 DOM 순서를 따른다」 |
| 574 | `Expanded→Normal 동안 카드 외곽 높이는 non-increasing이어야 하며, 완료 시 확장 진입 직전 Normal 스냅샷 높이와 `0px` 오차로 일치해야 한다. Mobile에서는 전환 중 임시 오차 허용 가능하나 완료 시점에는 동일 규칙을 강제한다.` | 「닫힘 완료 시 pre-open snapshot 높이와 `0px` 일치」(측정 가능한 최종 상태) | 「닫는 동안 높이는 non-increasing」 + 「Mobile은 전환 중 임시 오차 허용」 |
| 578 | `easing은 `ease-in-out` 계열로 통일한다. spring/overshoot(탄성 튐), Expanded 전환/유지 중 alpha 애니메이션, 내부 이중 박스 시각, 정적 외곽 카드+내부 콘텐츠만 scale 구조를 금지한다.` | 「내부 이중 박스 시각 금지」 + 「정적 외곽+내부만 scale 구조 금지」(구조 규정) | 「easing 계열」 + 「spring/overshoot 금지」 + 「alpha 애니메이션 금지」(모션 규정) |
| 581 | `논리적 close는 `closing` 시작과 동시에 성립한다. `closing`, `cleanup-pending`, `handoff-source`의 선택지는 즉시 tab/activation/AT 대상에서 제외하되 reverse motion, shell persistence, BQ-24 floor/spacer cleanup은 유지한다.` | 「논리적 close 시점 정의」 + 「그 시점부터 tab/activation/AT 대상 제외」(a11y 계약) | 「reverse motion·shell persistence·cleanup은 그 뒤로도 계속된다」(모션 수명) |
| 609 | `카드 레이어 밖의 뷰포트 고정 표면(telemetry consent banner)도 Expanded 카드를 가리면 안 된다. … 실제로 교차하는 동안에만 그 표면이 비켜선다 … 그 표면이 포커스를 품고 있으면 비켜서지 않는다(BQ-39).` | 「교차 판정의 정의」 + 「포커스 보유 시 비켜서지 않는다」 + 「문서 흐름 예약 높이 불변」 | 「비켜서는 연출 자체」 |
| 627+631 | `Expanded 헤더는 `title + X` 구조를 유지한다.` / `X 버튼은 아이콘 `X` 단일 표현으로 헤더 우측 끝에 sticky 고정. OPENING 시작 시점부터 CLOSING 종료 직전까지 시각 노출 유지. CLOSING 중에는 비활성 상태.` | 「Expanded에는 명시적 dismiss 컨트롤이 존재한다」 + 「CLOSING 중 비활성」 | 「아이콘 `X` 단일 표현」 + 「헤더 우측 끝 sticky」 + 「노출 구간」 |
| 633 | `닫힘 후 Expanded 직전 카드 형상/높이/타이틀 연속성으로 자연 복귀해야 하며, Expanded 중 사용자가 이동한 현재 page scroll 위치는 유지해야 한다.` | 「닫힘 후 page scroll 위치 유지」(상태 계약) | 「형상/높이/타이틀 연속성으로 자연 복귀」(지각 계약) |
| 640 | `Expanded 내부 콘텐츠 스크롤은 body에서 허용하며(OPEN settled 이후 page scroll도 허용). 콘텐츠가 viewport를 넘지 않으면 내부 스크롤이 없어야 한다.` | 「스크롤 소유자는 body」 + 「OPEN settled 이후 page scroll 허용」 | 「콘텐츠가 viewport를 안 넘으면 내부 스크롤 없음」(지각 계약) |
| 715 | `coming-soon 표준 태그는 tags-row에 상시 표시되며 텍스트 가독성을 보장한다(`aria-hidden` 금지 — AT에 노출).` | 「`aria-hidden` 금지 · AT 노출」(a11y 계약) | 「tags-row 상시 표시 · 텍스트 가독성」(시각 계약) |
| 717 | `coming-soon은 BQ-32 visible prefix의 첫 번째 필수 항목이며 가용 폭이나 Blog CTA 규칙으로 숨겨지면 안 된다. hidden suffix unmount 대상에서도 제외한다.` | 「hidden suffix unmount 제외」(DOM 계약) | 「visible prefix 첫 항목 · 폭 압력에도 숨기지 않음」(레이아웃 계약) |

분리 규칙 한 줄: **「이 값을 제품 코드에서 바꾸면 사용자가 보는 결과가 달라지는가, 저장·전송되는 것이 달라지는가」로 가른다** — 후자면 동작 계약, 전자면 인터랙션 계약, 둘 다면 두 문장으로 쪼갠다.

---

## 12. 서명 인터랙션 3분류 — 이 구간 소관분

결정 7이 요구하는 3분류 중, §8–§15가 소유한 서명 인터랙션만 뽑았다. **보존/교체의 최종 판정은 사용자 결정 대상이므로 여기서는 근거와 함께 분류만 제시한다.**

| 인터랙션 | 정본 조항 | 분류 | 근거 |
|:---|:---|:---|:---|
| 스크롤은 확장을 닫지 않는다(hold) + 스크롤이 위조한 진입 무시 | §8.2:545,546,548,549 | **보존 권고** | 실측으로 도출된 판별자이고(BQ-39 `decision-register.md:518,522`) `consent-smoke` 간헐 실패의 실제 원인을 해소했다. 포인터 입력에서만 성립하므로 결정 2의 대상 밖이며, 충돌하지 않는다 |
| 뷰포트 완전 이탈에서 hold 해제 | §8.2:547 | **보존 권고** | 「조금 스크롤해 읽는다」와 「지나쳐 버렸다」를 가시성으로 가른다. 화면 밖 탭 스톱을 막는 유일한 조항이고 WCAG 2.4.11의 취지와 같은 방향 |
| consent banner가 교차 중에만 비켜선다 | §8.4:609 | **보존 권고** | WCAG 2.4.11 Focus Not Obscured의 취지를 만족시키는 이 구간의 유일한 조항. 실측으로 3후보 중 2개가 무너진 뒤 남은 안(`decision-register.md:524`) |
| Desktop hover dwell `160ms` / collapse 유예 `140ms` | §8.2:543,544 | **결정 필요** | 조정값 계층이라 구현자 재량이 이미 열려 있다(§8.2:522). 결정 2로 hover 경로 자체의 적용 대상이 좁아지므로 값을 유지할지 재측정할지가 갈린다 |
| Mobile in-flow full-bleed 전개(top jump 금지 · y-anchor `0px`) | §8.5:625,626,652 | **교체 권고** | 결정 5(바텀시트·전용 상세 화면 허용)와 문면으로 충돌한다. 근거: 플랫폼 관용(iOS HIG Sheets · Material 3 Bottom sheets) + 실측(390px 랜딩 3.76 화면 · 첫 카드 top 315px — in-flow 전개는 열린 카드를 화면 밖으로 밀어내기 쉽다). **교체 비용이 이 구간에서 가장 크다** — `assertion:B14-*` 7건이 여기 붙어 있다 |
| Mobile 닫기 화이트리스트(X 또는 backdrop만) | §8.5:632 + §8.3:582 | **교체 권고** | WCAG 2.1.1(키보드 태블릿에서 Escape 불가) + 플랫폼 관용(스와이프-다운 dismiss). 결정 2가 키보드 붙은 태블릿을 모바일 생명주기로 넣으면 결함이 실재하게 된다 |
| Mobile 내부 비-CTA 탭 no-op | §8.5:650 | **교체 권고** | 어떤 관용 제스처도 붙일 수 없게 만든다. 다만 「본문 탭으로 실수 닫힘」을 막는 원래 목적은 유효하므로, 금지가 아니라 「닫기/전환을 유발하지 않는다」로 좁히는 것이 최소 교체 |
| Desktop/Tablet Tap Mode의 dismiss 부재 | §8.2:534(침묵) | **교체 권고** | 실측(닫기 X `0` · backdrop `0` · 재탭 불가)과 계약의 침묵이 일치한다. 신설이지 교체가 아니지만, 결정 2가 이 구간을 모바일 생명주기로 흡수하면 §8.5:632의 개정으로 자동 해소된다 |
| spring/overshoot 전면 금지 | §8.3:578 + §8.5:636 | **결정 필요** | WCAG 2.3.3은 「감소 요청 시 끄라」이지 금지가 아니다. 다만 이 금지가 어떤 실패를 막으려고 들어왔는지는 이 구간에 적혀 있지 않다 — `docs/DECISIONS.md`/`docs/done/` 확인이 선행되어야 한다(미확인) |
| Desktop/Mobile 단일 모션 규격 | §8.3:579 | **교체 권고** | §8.5:636(`220~360ms` 범위)과 §8.3:570(`280ms` 고정)이 이미 갈려 있어 조항이 스스로 지켜지지 않는다 |
| content-fit 높이 계산 기법 지정 | §8.5:639 | **교체 권고** | 계약이 구현 기법(`from px -> to px -> auto`)을 소유한다. 검증 가능한 것은 결과(overshoot `0건`, monotonic)이지 기법이 아니다 |

---

## 13. 미확인 — 확인하지 못했거나 판단이 갈리는 지점

- **테스트 단언의 본문을 읽은 것은 5건뿐이다**(`state-smoke.spec.ts:1176–1262` · `transition-telemetry-smoke.spec.ts:764–836` · `routing-smoke.spec.ts:23,168–184` · `a11y-smoke.spec.ts:85–130` · `helpers/axe.ts`). 나머지 「자동 검증됨」 판정은 **테스트 제목과 `assertion:` id의 실재**에 근거하며, 그 단언이 해당 조항을 실제로 재는지는 확인하지 않았다.
- **`assertion:B13-hover-collapse`(`tests/e2e/grid-smoke.spec.ts`)의 본문을 읽지 않았다.** §8.2 계약 16개 중 몇 개가 실제로 이 하나에 걸려 있는지 미확인.
- **`theme-matrix-manifest.json`이 펼치는 실제 케이스 수를 세지 않았다.** 매니페스트 키(`locales` `themes` `viewports` `closure` `layoutCases` `stateCases`)만 확인했고, `@gate`가 몇 개 테스트로 펼쳐지는지는 미확인 — 「qa:gate의 e2e가 시각 baseline 중심」이라는 판정은 태그 분포(`@gate` 7 선언 지점 vs `@smoke` 153)에 근거한다.
- **「바깥 탭은 닫힘」의 인과를 실측으로 확인하지 않았다.** §8.2:528의 포인터 이탈 경로가 브라우저의 마우스 에뮬레이션으로 성립한 결과라는 서술은 추론이다.
- **`max-h-[calc(100dvh-116px)]`의 `116px`이 무엇을 예약한 값인지 확인하지 않았다**(`landing-grid-card.tsx:285,292,296`). BQ-39 step 2가 consent banner spacer를 「`ceil(배너 높이) + 하단 gap` 실측」으로 바꿨다고 적는데(`decision-register.md:524`), 이 `116px` 상수가 그 변경과 같은 것인지 다른 것인지 미확인. 390px에서 배너가 줄바꿈해 199px에 이른다는 기록이 있으므로 **모바일 확장 카드의 세로 예산이 실제로 맞는지는 열려 있다.**
- **spring/overshoot 금지(§8.3:578 · §8.5:636)가 어떤 실패에서 왔는지 미확인.** `docs/DECISIONS.md`와 `docs/done/**`를 읽지 않았다. 교체 권고 전에 선행 확인이 필요하다.
- **WCAG 1.4.10 Reflow(320px) · 1.4.4 Resize text(200%) · 2.4.11 Focus Not Obscured · 2.5.7 Dragging Movements는 실측하지 않았다.** 확인한 것은 「§8–§15에 이 넷에 대응하는 조항이 없고, axe 기본 룰셋에도 대응 룰이 없다」는 계약·검사 측 공백뿐이다.
- **§14.2 항목 24–30의 등록부 의미 공백이 의도된 것인지 표류인지 미확인.** `docs/blocker-traceability.json`은 Ask-First 파일이고, `docs/req-test.md`에도 자체 blocker 번호 체계가 있어 두 문서가 같은 번호 공간을 공유하려던 흔적일 수 있다. `docs/req-test.md`의 §14 계열 절을 읽지 않았다.
- **§13의 100개 중 개별 행으로 뽑지 않은 조항의 kind 판정은 절 단위 표본에 근거한다.** 전수로 읽었으나 조항별 표를 만들지는 않았다 — 뷰포트·입력·모션을 언급하는 조항이 §13.5:906 하나뿐이라는 사실이 그 축약의 근거다.
- **`EX-001`의 `16.1.6` 버전 표기가 `AGENTS.md §1`의 `next@16.2.4`와 다르다.** `next.config.ts`를 열어 `experimental.globalNotFound`가 여전히 요구되는지 확인하지 않았다.
