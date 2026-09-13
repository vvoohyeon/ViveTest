# touch-gesture — 터치 타깃 · 제스처 · 히트 영역 · hover-only 어포던스

분석 대상 clone: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis`(읽기 전용). 아래 모든 `file:line` 은 그 clone 기준 저장소 상대경로다. 저장소는 수정하지 않았다 — `git status --porcelain` 빈 출력 확인.

근거 표기: **[W]** WCAG 2.2 성공기준 · **[P]** 플랫폼 관용(iOS HIG / Material 3 / 모바일 웹 관행) · **[C]** 저장소 계약(`req-*.md` · `design.md`) · **[S]** 코드 구조·내부 일관성 · **[측-계산]** 클래스에서 계산 · **[측-픽셀]** baseline PNG 디코드 실측 · **[측-컴파일]** Tailwind/axe 를 이 clone 의 `node_modules` 로 직접 실행해 확정 · **[미]** 미확인.

이 렌즈에서 새로 **실행해서 확정한 것 넷**을 먼저 적는다. 이 넷이 아래 판정의 토대이고, 기존 맵 둘이 서로 반대로 적어 둔 항목 하나를 여기서 결론 낸다.

1. **Tailwind v4.1.0 emit 순서를 이 clone 의 컴파일러로 직접 확인했다**(프로브: `/private/tmp/.../scratchpad/analysis/tw-touch-probe.mjs`). 결과 ⑴ `[height:100dvh]` 가 `h-screen` 보다 **먼저** emit 되므로 같은 원소에 둘 다 있으면 **`h-screen`(100vh)이 이긴다**(`max-height` 도 동일). ⑵ `min-h-8` 이 `min-h-[var(--tap-min)]` 보다 먼저 emit 되므로 **`min-h-[var(--tap-min)]`(44px)이 이긴다** — 드로어 안 칩은 실제로 44px 이다. ⑶ `hover:` 는 `&:hover { @media (hover: hover) { … } }` 로만 감싸이며 **`pointer` 조건이 없다**. ⑷ 임의값 `text-[0.96rem]` 은 `font-size` 만 내보내고 `line-height` 를 내보내지 않는다.
2. **axe-core 4.11.1 의 `target-size` 규칙은 기본 비활성이다** — `axe._audit.rules` 에서 `enabled = false` 를 직접 읽어 확정했다(비활성 기본 규칙 목록: `aria-roledescription, audio-caption, color-contrast-enhanced, duplicate-id-active, duplicate-id, identical-links-same-purpose, meta-refresh-no-exceptions, target-size`). `tests/e2e/helpers/axe.ts:21` 은 `new AxeBuilder({page}).analyze()` 로 태그·규칙 지정 없이 돌므로 이 규칙은 **한 번도 실행되지 않는다**. `contract-landing-2` 맵의 「axe-core 4.11.1의 target-size 룰이 기본 활성이라 검사는 돈다」는 서술은 **틀렸고**, `gates-reverse` 맵의 「터치 타깃 크기를 보는 검사가 0건」이 맞다. 결과: 저장소 전체에서 터치 타깃 크기를 재는 단언은 `tests/unit/landing-card-contract.test.ts:721-723` 하나뿐이며 그것도 **클래스 문자열에 `min-h-[var(--tap-min)]` 이 들어 있는지**만 본다(계산된 박스를 재지 않는다).
3. **Tailwind preflight 가 `-webkit-tap-highlight-color: transparent` 를 `html` 에 건다**(`node_modules/tailwindcss/preflight.css:45`, `src/app/globals.css:1` 의 `@import "tailwindcss"` 로 실제 적재). 즉 이 제품에는 **브라우저 기본 탭 하이라이트조차 없다** — 눌림 피드백은 전적으로 저자가 쓴 `active:` 에 달려 있다.
4. **baseline PNG 를 직접 디코드해 기하를 실측했다**(디코더: `/private/tmp/.../scratchpad/analysis/png-scan.mjs` · `png-row.mjs`, zlib + PNG 필터 복원). 확정한 값은 각 항목에서 `[측-픽셀]` 로 인용한다.

---

## 0. 전 표면 터치 타깃 전수표 — 클래스와 CSS 에서 계산

계산 규칙: Tailwind preflight 의 `box-sizing: border-box` 아래 높이 = 테두리 + 패딩 + line-box, 단 `min-h-*` 가 크면 그것이 이긴다. 토큰 `--tap-min: 44px`(`src/app/globals.css:201`), `--shell-gutter: 16px`(<768, `globals.css:323`), body 상속 `line-height: 1.5`(`src/app/app-body-class.ts:19`), `--t-choice: 400 15px/1.45`(`globals.css:222`), `--body-sm: 400 14px/1.55`(`globals.css:208`), `--caption: 400 13px/1.45`(`globals.css:210`).

### 0-1. 랜딩 `/{locale}` (≤767)

| # | 컨트롤 | file:line | 크기 결정 | 계산/실측 h × w | 44 | 24 |
|--:|:---|:---|:---|:---|:-:|:-:|
| L1 | 카드 트리거(Normal) | `landing-grid-card.tsx:1056`(`[min-height:100%] [padding:16px]`) · `:1171`/`:1203` | 카드 전체 | 255 × 358(사전 실측) | ✅ | ✅ |
| L2 | **같은 카드 트리거(Mobile Expanded 중)** | `landing-grid-card.tsx:1056` `[min-height:0] [padding:0]` + 내용 `:1062` `[height:0] [min-height:0] overflow-hidden` | 박스 0 | **0 × 390** | ❌ | ❌ |
| L3 | 모바일 닫기 X | `landing-grid-card.tsx:278-279` · `:1241` | `min-h/min-w-[var(--tap-min)]` | 44 × 44 | ✅ | ✅ |
| L4 | Expanded 답변 A/B | `landing-grid-card.tsx:234` | `px-3.5 py-3` + `--t-choice` + border 1px×2 | 47.75 × 358 | ✅ | ✅ |
| L5 | 카드 backdrop(닫기 영역) | `landing-catalog-grid.tsx:30-31`, `:199-207` | `fixed inset-0 z-10 touch-pan-y` | **[측-픽셀] 390 × (57–314 위 258px + 600–843 아래 244px)** | ✅ | ✅ |
| — | 태그 칩 | `landing-grid-card.tsx:229`, `:487-497` | `<li><span>` — 핸들러 0 | 비인터랙티브 | — | — |
| — | Blog `Read more` | `landing-grid-card.tsx:502-516` | `<span aria-hidden="true">` — 카드 버튼 안 | 비인터랙티브 | — | — |

### 0-2. GNB 모바일 행 (<768, 전 표면)

| # | 컨트롤 | file:line | 크기 결정 | 계산/실측 h × w | 44 | 24 |
|--:|:---|:---|:---|:---|:-:|:-:|
| G1 | **CI 브랜드 링크** | `site-gnb.tsx:45` · `:373` | `text-base font-bold` — **min-height 없음, padding 없음** | **24 × ≈70**(flex item blockify → 16px × 1.5) | ❌ | ✅(경계) |
| G2 | Back pill | `site-gnb.tsx:63-64` · `:377` | `min-h-[var(--tap-min)] px-3 py-[7px]` | 44 × ≈52 | ✅ | ✅ |
| G3 | 햄버거 | `site-gnb.tsx:77` · `:391` | 동일 | **[측-픽셀] 44 × 64**(x 310–373, y 6–49) | ✅ | ✅ |
| G4 | 드로어 nav 링크 ×3 | `site-gnb.tsx:100-101` · `:454` | `min-h-[var(--tap-min)] -mx-3 px-3` | 44 × 331 | ✅ | ✅ |
| G5 | 드로어 테마 스와치 ×2 | `components/settings-controls.tsx:117` | `min-h/min-w-[var(--tap-min)] p-0`(**[측-컴파일] `min-h-8` 을 이긴다**) | 44 × 44 | ✅ | ✅ |
| G6 | 드로어 로케일 칩 ×12 | `components/settings-controls.tsx:117`(mobile 분기) | `min-h-[var(--tap-min)] px-[14px]` | 44 × 60–90 | ✅ | ✅ |
| G7 | **드로어 backdrop(유일한 가시 닫기 수단)** | `site-gnb.tsx:81-82` · `:421-429` | `absolute inset-0`, 패널 `w-[min(87vw,340px)]` 아래 | **[측-픽셀] 51 × 844**(x 0–50; 패널 테두리 x=51, 패널 x 52–389) | ✅ | ✅ |
| — | 드로어 head | `site-gnb.tsx:96` | `min-h-10`, 컨트롤 0개 | 40, 비인터랙티브 | — | — |

### 0-3. GNB 데스크톱 행 (≥768 — **hover 없는 터치 태블릿이 여기로 온다**)

| # | 컨트롤 | file:line | 크기 결정 | 계산 h × w | 44 | 24 |
|--:|:---|:---|:---|:---|:-:|:-:|
| D1 | **CI 브랜드 링크** | `site-gnb.tsx:45` · `:264` | 위와 동일 | **24 × ≈70** | ❌ | ✅ |
| D2 | **nav 링크 History/Blog ×2** | `site-gnb.tsx:49-50` · `:276`,`:287` | `py-2 text-[0.96rem]` — min-height 없음, **[측-컴파일] 임의값 font-size 는 line-height 를 내보내지 않아 body 상속 1.5 적용** | **39.04 × ≈55**(8+15.36×1.5+8) | ❌ | ✅ |
| D3 | 설정 트리거 | `site-gnb.tsx:67-68` · `:310` | `h/w-[var(--gnb-settings-trigger-size)] !p-0`(=`--tap-min`) | 44 × 44 | ✅ | ✅ |
| D4 | 설정 테마 스와치 ×2 | `components/settings-controls.tsx:113` | `min-h/min-w-[var(--gnb-settings-trigger-size)] p-0` | 44 × 44 | ✅ | ✅ |
| D5 | **설정 로케일 칩 ×12** | `components/settings-controls.tsx:117`(desktop 분기 = `chipBaseClassName` 만) | `min-h-8 px-[10px] py-[5px] text-[0.8rem]` | **32 × 60–90** | ❌ | ✅ |

### 0-4. 테스트 `/{locale}/test/{variant}`

| # | 컨트롤 | file:line | 크기 결정 | 계산 h × w | 44 | 24 |
|--:|:---|:---|:---|:---|:-:|:-:|
| T1 | 답변 A/B | `features/test/surface-class-names.ts:83` · `test-question-client.tsx:362`,`:373` | `px-3.5 py-3` + `--t-choice` + border | 47.75 × 316 | ✅ | ✅ |
| T2 | 이전 / 제출 | `surface-class-names.ts:61`,`:58` → `ui/button-class-names.ts:60` | `min-h-[46px] px-4 py-3` | 46 × 내용 | ✅ | ✅ |
| T3 | 오버레이 primary | `surface-class-names.ts:58` · `instruction-overlay.tsx:198`,`:241` | 동일 | 46 | ✅ | ✅ |
| T4 | 오버레이 quiet secondary | `ui/button-class-names.ts:108-109` · `instruction-overlay.tsx:232` | `min-h-[var(--tap-min)] px-3 py-[10px]` | 44(경계) | ✅ | ✅ |
| T5 | qualifier 선택지 | `instruction-overlay.tsx:168`(T1 과 같은 클래스) | 동일 | 47.75 × 350 | ✅ | ✅ |
| T6 | **qualifier 칩** | `surface-class-names.ts:93` · `qualifier-chip.tsx:24-32` | `min-h-8 px-[11px] py-[5px] text-[13px] leading-[1.45]` → max(**32**, 2+5+18.85+5=30.85) | **32 × ≈50** | ❌ | ✅ |
| T7 | 결과 CTA ×2 | `test-result-panel.tsx:34-35` · `:91`,`:94` | `min-h-[46px] min-w-[132px]` | 46 × 132 | ✅ | ✅ |

### 0-5. 나머지 표면

| 표면 | 인터랙티브 원소 | 계산 h × w | 판정 |
|:---|:---|:---|:---|
| 블로그 목록·상세 | 목록 행 `<Link>` `blog-destination-client.tsx:44-45`, `:129` — `grid gap-1 px-3.5 py-3` | ≥80 × 316(제목 21.75 + gap 4 + 부제 18.85×N + 24) | ✅ ✅ |
| 히스토리 | **0개**(`src/app/[locale]/history/page.tsx:33-51` 에 링크·버튼 없음) | — | 해당 없음 |
| 동의 배너 | Accept/Deny `consent-banner.tsx:249`,`:257` 46px · **Preferences** `:265` 44px | 46 / 44 | ✅ ✅ |
| `/test/error` | **0개**(`src/app/[locale]/test/error/page.tsx:44-56`) — GNB Back 뿐 | — | 해당 없음 |
| 404 두 장 | `Return home` 1개 `not-found.tsx:38` · `global-not-found.tsx:53` — `linkButtonPrimaryClassName` | 46 × ≈130 | ✅ ✅ |

### 0-6. 표에서 나오는 결론 넷

**첫째, 44px 미달은 5종이고 전부 24px 은 통과한다** — G1/D1 CI 링크(24px, 경계), D2 데스크톱 nav 링크(39px), D5 데스크톱 로케일 칩(32px ×12), T6 qualifier 칩(32px), 그리고 크기가 아예 0 인 L2. 즉 **[W 2.5.8 AA] 위반은 L2 하나뿐**이고 나머지 넷은 **[W 2.5.5 AAA]** 과 **[P iOS HIG 44pt / Material 3 48dp]**, 그리고 **[C design.md:112]** 의 44px 요구에 미달한다.

**둘째, 그 넷이 계약 위반이 아닌 이유가 계약의 결함이다** — `docs/design/design.md:112` 는 44×44 대상을 「choices, "Read more," the close button, and the hamburger」 **네 가지만 열거**하고, `docs/req-landing.md` §9(683-720)에는 터치 타깃 크기 조항이 **아예 없다**. 그래서 G1·D1·D2·D5·T6 은 어느 조항도 위반하지 않은 채 미달해 있다. 게다가 그 네 항목 중 「Read more」는 제품에서 `aria-hidden="true"` 인 비인터랙티브 `<span>`(`landing-grid-card.tsx:502-516`)이라 **타깃이 아닌 것을 44px 타깃으로 열거**하고 있다.

**셋째, 인접 간격은 대체로 안전하고 한 곳만 좁다** — 답변 A/B `grid gap-2`(8px, `test-question-client.tsx:52`), 오버레이 CTA `gap-2`(`instruction-overlay.tsx:20`), 결과 CTA `gap-2`(`test-result-panel.tsx:33`), 로케일 칩 `flex flex-wrap gap-2`(`settings-controls.tsx:19`), 블로그 목록 행 `grid gap-2`(`blog-destination-client.tsx:40`) — 전부 8px 이고 타깃 자체가 24px 이상이므로 **[W 2.5.8]** 의 간격 예외를 쓸 필요가 없다. 유일하게 좁은 곳은 **드로어 nav 링크 3개 사이 `grid gap-1` = 4px**(`site-gnb.tsx:99`)로, 전폭 44px 행 셋이 4px 간격으로 붙어 있어 **[P HIG/M3 의 8px 하한]** 아래다.

**넷째, 사용자 결정 2 의 실측 근거가 0-3 표다** — `--tap-min` 44px 로 만들어진 올바른 터치 컨트롤 한 벌은 **이미 존재한다**(G4·G5·G6). 그것이 `md:hidden`(`site-gnb.tsx:41`) 뒤에, 마우스용 한 벌은 `md:flex`(`:40`) 뒤에 있고, 그 경계는 **Tailwind `md` = 768px 폭 하나뿐이며 입력 방식이 전혀 관여하지 않는다**. `useGnbCapability` 는 `hoverCapable` 을 계산하지만(`hooks/use-gnb-capability.ts:17`) 그 값의 소비처는 저장소 전체에서 **설정 레이어 hover 열기 판정 한 곳뿐**이다(`site-gnb.tsx:122`,`:135-138`,`:320` — grep 전수 확인). 결과: hover 없는 900px 터치 태블릿은 24px CI 링크 · 39px nav 링크 · 32px 로케일 칩 12개를 손가락으로 만지고, 44px 짜리 드로어 한 벌에는 **도달할 경로가 없다**.

---

## 1. `touch-action` 부재의 실제 의미 — viewport meta 와 CSS 로 판정

**저장소 전체 `touch-action` 선언은 3건이고 셋 다 「막는」 쪽이다.** `src/features/landing/grid/landing-catalog-grid.tsx:31` 의 `touch-pan-y`(모바일 카드 backdrop), `src/features/gnb/hooks/use-gnb-mobile-menu.ts:141` 의 `document.body.style.touchAction='none'`, `src/features/landing/grid/use-mobile-scroll-lock.ts:20` 의 동일 선언. **인터랙티브 원소에 `touch-action: manipulation` 을 건 곳은 0건**이다(전수 grep). `public/56T-ToDo.html` 의 선언 2건은 제품 코드가 아니다.

**viewport meta 는 Next 기본값이다** — `src/` 전체에 `export const viewport` 도 `width=device-width` 문자열도 **없다**(전수 grep). 따라서 App Router 가 넣는 기본 `width=device-width, initial-scale=1` 이고, `maximum-scale`/`user-scalable=no` 가 없으므로 **핀치 줌과 더블탭 줌이 모두 살아 있다**. 줌을 살려 둔 것 자체는 **[W 1.4.4 Resize text]** 관점에서 옳다 — 이것은 고칠 대상이 아니다.

**그래서 「300ms 지연」은 대부분 해당 없고, 「더블탭 줌」은 해당된다.** Chrome for Android 는 `width=device-width` 뷰포트에서 탭 지연을 제거하므로 지연 문제는 없다 **[P]**. 그러나 페이지가 확대 가능한 상태에서 브라우저는 두 번째 탭을 기다려야 더블탭 줌인지 판정할 수 있고, WebKit 이 그 대기를 원소 단위로 없애는 공식 수단이 `touch-action: manipulation` 이다 **[P]** — 그것이 한 곳도 없다. 실기기 측정은 하지 않았다 **[미]**.

**실질 위험이 가장 큰 자리는 테스트 문항이다.** `use-answer-lock.ts:32` 가 답변 확정 후 **150ms** 만에 자동 전진하고(`req-test.md:678-679` 가 자동 진행을 계약으로 요구), 답변 A/B 는 세로로 8px 간격에 47.75px 높이로 고정 배치된다(`test-question-client.tsx:52`,`:362-386`). 즉 연속 두 문항을 빠르게 답하면 **거의 같은 화면 좌표를 300ms 안에 두 번 탭**하게 되고, 그것은 브라우저의 더블탭 줌 후보와 정확히 같은 입력이다. `touch-action: manipulation` 이 없으므로 그 판정이 브라우저에 맡겨져 있다. 더블탭의 거리 임계는 브라우저 내부값이라 재지 않았다 **[미]**.

**`overscroll-behavior` 는 2곳뿐이고 `html`/`body` 에는 없다** — `site-gnb.tsx:87`(드로어 패널)과 `landing-grid-card.tsx:285`(모바일 확장 카드 본문). 전수 grep 확인. 따라서 **pull-to-refresh 가 전 표면에서 살아 있다.** 테스트 진행 중에는 `use-before-unload-guard.ts:22-27` 이 `beforeunload` 로 한 번 막아 주지만 **그 가드는 `started && !submitted` 일 때만 걸리므로**(`:18`) 지시 오버레이 단계와 랜딩·블로그·히스토리에서는 아무 보호가 없다.

**스크롤 체이닝이 전면 모달을 통과한다** — `instruction-overlay.tsx:145` 의 `fixed inset-0 z-[1050] grid place-items-center` 에는 `overflow` 도 `overscroll-behavior` 도 없고, 이 컴포넌트는 body 스크롤을 **잠그지 않는다**(파일 전체에서 `document.body.style` 0건; 저장소의 body 스타일 쓰기는 위 2곳뿐). 모바일에서 이 카드는 `max-[767px]:min-h-full max-[767px]:w-full`(`:26`)로 화면을 가득 채우므로, **그 위에서 손가락을 끌면 보이지 않는 뒤 페이지가 스크롤되고 스크롤 최상단에서는 pull-to-refresh 가 발동한다.**

**드래그·스와이프·롱프레스는 제품 전체에 0건이다.** `onTouchStart/Move/End` · `draggable` · `setPointerCapture` · `onContextMenu` · 롱프레스 타이머 전수 grep 결과 **한 건도 없다**. 포인터 핸들러는 두 backdrop 제스처(`use-mobile-backdrop-gesture.ts:63-98`, `use-gnb-mobile-menu.ts:90-130`)와 hover intent 의 window `pointermove`(`use-landing-interaction-controller.ts:527`)뿐이다. 따라서 **[W 2.5.7 Dragging Movements] 는 공허하게 통과한다** — 위반이 없는 것이 아니라 판정 대상이 없다. 이것은 결함이 아니라 **제스처 어휘가 비어 있다는 사실**이며, 사용자 결정 5(IA 재설계)로 스와이프 닫기·스와이프 문항 전환을 도입하면 그 순간 2.5.7 이 적용되어 **모든 스와이프에 단일 포인터 대안(버튼)이 함께 있어야 한다**.

---

## 2. hover-only 어포던스 전수 — 결정 2 의 핵심 근거

**「hover 가능」의 철자가 제품 안에 셋 있고 서로 다른 기기 집합을 가리킨다.**

| 철자 | 정의 | 출현 | 커버 |
|:---|:---|:---|:---|
| Tailwind `hover:` | **[측-컴파일]** `&:hover { @media (hover: hover) }` — **`pointer` 조건 없음** | **37회 / 10파일** | `hover:hover` 이면 `pointer:coarse` 여도 발동 |
| 저장소 capability 게이트 | `(hover: hover) and (pointer: fine)` | **3곳** — `use-gnb-capability.ts:17` · `use-landing-interaction-controller.ts:207` · `landing-grid-card.module.css:92` | `pointer:fine` 필요 |
| `isMobileViewport` | `viewportTier === 'mobile'` = 폭 ≤767 — **입력 축 없음** | 생명주기 전체 | 폭만 |

**결과: `hover:hover` + `pointer:coarse` 기기(마우스 붙은 터치 노트북, 일부 안드로이드 태블릿)에서 37개 Tailwind hover 스타일은 발동하고 저장소 게이트 3곳은 발동하지 않는다.** 결정 2 를 구현할 때 이 세 철자를 하나로 합치지 않으면 같은 갈림이 그대로 재생산된다 **[S]**.

**터치에서 도달 불가능해지는 기능을 전수로 찾았다. 결론은 「기능 자체가 hover 뒤에 숨은 곳은 없다」이고, 대신 셋이 다른 방식으로 끊긴다.**

**⑴ 올바르게 처리된 유일한 사례 — 그리고 그것이 본보기다.** Blog `Read more` 는 `ctaVisibility: interactionMode === 'hover' ? 'hover-focus' : 'always'`(`landing-grid-card.tsx:465`) 한 줄로 터치에서 상시 노출된다. 판정 축이 `isMobileViewport`(폭)가 아니라 `interactionMode`(입력)이기 때문이고, `resolveInteractionMode`(`use-landing-interaction-controller.ts:71-77`)가 `width<768 → tap`, 그 위는 `hoverCapability` 로 가른다. 결정 2 의 구현 본보기로 이 한 줄을 쓸 것.

**⑵ 카드 확장은 터치에서 열리지만 닫히지 않는다 — hover 부재가 아니라 축 불일치 때문이다.** hover 없는 768–1023 기기는 `interactionMode='tap'` 이라 탭으로 확장되는데, 닫기 X 는 `isMobileExpanded`(폭 ≤767) 조건 안(`landing-grid-card.tsx:973`,`:1236-1245`)이고 backdrop 도 `isMobileViewport && phase !== 'NORMAL'` 조건 안(`use-mobile-backdrop-gesture.ts:61`)이다. 게다가 확장 중 트리거는 `showDesktopExpandedShell && 'pointer-events-none'`(`:1059`)로 죽어 재탭도 막힌다. 사전 실측의 「닫기 X 0개 · backdrop 0개 · 재탭 불가」가 이 세 줄의 산술적 귀결이다. 다른 렌즈가 이미 다룬 결함이므로 여기서는 **터치 히트 영역의 관점으로만** 기록한다: 그 기기에서 확장 카드의 유효 닫기 히트 영역은 **0px²** 다.

**⑶ hover 로만 도달하는 텍스트가 셋 있다 — `title` 속성.** `site-gnb.tsx:314`(설정 트리거, `aria-label` 도 같은 값이라 정보 손실 없음) · `components/settings-controls.tsx:154`(테마 스와치, `aria-label` 동일) · **`consent-banner.tsx:269`(`title={preferencesTitle}` = `"Preferences panel coming soon"`)**. 셋째는 `aria-label` 대응물이 없고 **버튼 자체가 아무 일도 하지 않는다** — `telemetry-consent-banner.tsx:32` 의 `onPreferencesAction={() => {}}`. 즉 44px 짜리 포커스 가능한 컨트롤이 터치 사용자에게 **누르면 무반응 + 이유를 읽을 길 없음**으로 나타난다 **[S][P 상태 피드백]**.

**⑷ 장식용 hover 는 터치에서 전부 죽고, 그 자리를 메울 `active:` 가 거의 없다.** `active:` 유틸리티는 저장소 전체에서 **4개 문자열**에만 있다 — `ui/button-class-names.ts:89`(primary 눌림) · `:97`(lift) · `:101`(secondary) · `site-gnb.tsx:63-64`(GNB pill). **없는 곳**: `surface-class-names.ts:83` 답변 A/B(제품에서 가장 많이 눌리는 컨트롤) · `:92-93` qualifier 칩 · `settings-controls.tsx:28-29` 설정 칩 14개 · `site-gnb.tsx:100-101` 드로어 nav 링크 3개 · `site-gnb.tsx:49-50` 데스크톱 nav 링크 · `blog-destination-client.tsx:42-43` 목록 행 · `landing-grid-card.tsx:234-235` 확장 답변 A/B · `landing-grid-card.tsx:278,:280` 모바일 닫기 X.

---

## 3. 결함 상세

### TG-01 (blocker) 두 개의 body 스크롤 잠금이 서로의 저장값을 덮어써 페이지를 영구히 얼린다

**두 훅이 같은 두 인라인 스타일을 각자 저장·복원한다** — `use-mobile-scroll-lock.ts:17-25`(랜딩 카드 OPENING/CLOSING)와 `use-gnb-mobile-menu.ts:137-147`(GNB 드로어). 둘 사이에 어떤 조정도 없다: `closeMobileMenuImmediate` 호출처는 로케일 변경 한 곳뿐이고(`site-gnb.tsx:210`), 모바일 생명주기에는 드로어를 아는 코드가 없다(`mobile-lifecycle.ts:23-30` 의 이벤트 8종에 스크롤·메뉴가 없다).

**겹치면 값이 샌다. 순서를 적는다.** ① 카드 탭 → `OPENING` → 잠금 A 가 `prev=''` 를 저장하고 `overflow:hidden; touch-action:none` 을 건다. ② 280ms 창 안에 햄버거 탭(GNB 는 z-1100 이라 항상 히트 가능) → 잠금 B 가 `prev='hidden'/'none'` 을 저장한다. ③ `OPENING→OPEN` → 잠금 A 의 cleanup 이 `''` 를 복원한다 — **드로어가 열린 채 페이지 잠금이 풀린다.** ④ 드로어 닫기 → `mobileMenuState` 가 `'closing'` 으로 바뀌며 B 의 cleanup 이 `'hidden'/'none'` 을 복원하고, 새 effect 가 그 값을 `prev` 로 다시 저장한다. ⑤ `'closed'` → cleanup 이 `'hidden'/'none'` 을 복원하고 effect 는 조기 반환한다. **끝난 상태: `body { overflow: hidden; touch-action: none }` 이 영구히 남는다 — 페이지 스크롤도, 어떤 터치 팬도 되지 않고, 새로고침 말고는 회복 경로가 없다** **[S]**.

`CLOSING` 위상도 같은 창을 연다. 이 결함을 잡는 테스트는 없다 — E2E 는 터치를 흉내 내지 않고(§TG-12), 단위 테스트는 두 훅을 따로 돈다.

**처방:** body 잠금을 두 훅에서 걷어내고 **참조 카운트를 갖는 단일 모듈**(예: `src/features/ui/body-scroll-lock.ts` — `acquire(token) / release(token)`, 카운트 0→1 에서만 저장·설정, 1→0 에서만 복원)로 옮긴다. 소비자는 토큰만 넘긴다. 그리고 `document.body.style` 직접 쓰기를 `scripts/qa` 규칙 또는 vitest 소스 검사로 금지해 세 번째 소비자가 같은 방식으로 생기지 않게 한다.

### TG-02 (blocker) `body{touch-action:none}` 이 드로어 자신의 터치 스크롤까지 막는다

`use-gnb-mobile-menu.ts:141` 이 `document.body.style.touchAction='none'` 을 건다. **[W CSS Touch Action §효과적 터치 동작]** 은 제스처의 허용 여부를 「히트된 원소부터 그 제스처를 구현하는 조상까지의 `touch-action` 교집합」으로 정한다. 드로어 패널은 `body` 의 자손이므로(`site-gnb.tsx:419` 가 `</header>` 뒤 fragment 안에 렌더), 패널의 `overflow-y-auto ... overscroll-contain`(`:87`)은 **손가락으로 팬되지 않는다** — `overscroll-contain` 도 이것을 되돌리지 못한다.

**현재 세로 화면에서는 드러나지 않고, 세 조건에서 드러난다.** **[측-픽셀]** 390×844 baseline 에서 패널 내용은 y 0–844 안에 들어가고 설정 블록(`mt-auto`)이 y≈614–812 를 차지한다 — 넘치지 않는다. 그러나 ⑴ **가로 모드**(폰 390×844 를 눕히면 844×390): 패널 높이가 390 인데 내용은 대략 16(pt-4)+40(head)+20+140(nav 3×44+2×4)+20+44(테마 행)+12+≈148(칩 3줄)+32(pb) ≈ **472px** 로 넘친다. ⑵ **브라우저 200% 확대**(**[W 1.4.4]**): 레이아웃 뷰포트가 195×422 CSS px 이 되어 칩이 더 줄바꿈하며 훨씬 더 넘친다. ⑶ **320px 폭**(**[W 1.4.10 Reflow]**). 세 경우 모두 **넘친 부분 — 즉 모바일에서 언어·테마에 닿는 유일한 경로인 설정 블록 — 을 손으로 스크롤할 수 없다.**

**처방:** body 를 `touch-action:none` 으로 얼리는 방식을 버리고, ⑴ 레이어(`site-gnb.tsx:80` 의 `fixed inset-0 z-[1200]`)에 `overscroll-behavior: contain` 을 걸어 체이닝만 끊고, ⑵ 배경 잠금은 `body { overflow: hidden }` + (iOS 대응이 필요하면) `position: fixed; top: -scrollY` 복원 방식으로만 하며, ⑶ **`touch-action` 은 backdrop 원소 하나에만 `none` 으로 걸어** 패널 자신의 팬을 남긴다. 그리고 내용이 넘칠 수 있음을 전제로 `site-gnb.tsx:87` 의 세로 예산을 재작성한다.

### TG-03 (major) `h-screen` 이 `[height:100dvh]` 를 이겨 드로어가 동적 툴바 아래로 잘린다

`site-gnb.tsx:87` 이 같은 원소에 `h-screen max-h-screen` 과 `[height:100dvh] [max-height:100dvh]` 를 **함께** 적는다. **[측-컴파일]** Tailwind 4.1.0 이 `.[height:100dvh]` 를 `.h-screen` 보다 **먼저** 내보내므로(`max-height` 도 동일) 명시도가 같은 두 규칙 중 **`h-screen`(100vh)이 이긴다**. 즉 저자가 의도한 `dvh` 는 한 번도 적용된 적이 없다.

100vh 는 「툴바가 접힌 최대 뷰포트」이므로, 주소창이 보이는 기본 상태의 iOS Safari·Chrome Android 에서 드로어는 보이는 영역보다 툴바 높이(대략 60–90px)만큼 길어지고, **`mt-auto` 로 바닥에 붙은 설정 블록이 그만큼 화면 밖으로 내려간다.** TG-02 와 합치면 그 부분은 스크롤로도 못 가져온다. headless Chromium 에서는 visual viewport = layout viewport 라 **[측-픽셀]** baseline(x=380 열에서 흰 패널이 y 0–843, y=844 에서 끝남)이 두 값을 구별하지 못한다 — **시각 회귀망이 구조적으로 못 보는 자리**다. 실기기 측정은 하지 않았다 **[미]**.

**처방:** 경쟁 유틸리티를 지우고 한 벌만 남긴다 — `h-screen max-h-screen` 을 삭제하고 `[height:100dvh] [max-height:100dvh]` 만 남기거나, `h-[100dvh] max-h-[100dvh]` 한 벌로 쓴다. 같은 부류의 경쟁을 저장소가 이미 네 번 기록했으므로(`ui/button-class-names.ts:16-17`,`:48-50` · `components/settings-controls.tsx:33-37` · `globals.css:306-322`), 「같은 속성을 두 유틸리티가 정하는 것」을 vitest 소스 검사로 금지하는 편이 낫다.

### TG-04 (blocker) GNB 가 모달 다이얼로그 **위** 층에 있고, 터치로 뚫린다

`site-gnb.tsx:38` 의 GNB 는 `sticky top-0 z-[1100]`, `instruction-overlay.tsx:145` 의 다이얼로그 레이어는 `z-[1050]`. 그 사이에 스태킹 컨텍스트를 만드는 속성이 없다 — `page-shell.tsx:19`(`min-h-screen` 뿐) · `app-body-class.ts:18` · `layout.tsx:22-33` 어디에도 `transform`/`isolation`/`opacity`/`filter` 가 없다. 따라서 루트 스태킹 컨텍스트에서 1100 > 1050 이고 **히트 테스트도 GNB 가 가져간다**.

**[측-픽셀] 로 확정했다** — `theme-layout-test-instruction-en-light-mobile` 에서 x=3 열은 y 0–56 이 `251,251,248`(GNB 지면), y=57 부터 `255,255,255`(다이얼로그 카드). 그리고 y=28 행에 x=16–90 구간의 pill 이 그대로 그려져 있다. 즉 **모바일 전면 다이얼로그의 상단 56px 띠를 GNB 가 덮고 그 안의 `뒤로` 버튼(44×≈52)이 살아 있다**. `instruction-overlay.tsx:26` 의 `max-[767px]:pt-[88px]` 은 그 GNB 를 피해 내용을 밀어 내린 흔적이다.

**결과가 나쁜 쪽으로 구체적이다** — 그 `뒤로` 는 `handleTestBack`(`site-gnb.tsx:380`) → `window.history.back()`(`use-gnb-back-navigation.ts:53`)이고, `useBeforeUnloadGuard` 는 문서 언로드에만 걸리므로(`use-before-unload-guard.ts:22-27`) **진행 중 회차가 확인 없이 버려진다**. 그리고 `aria-modal="true"`(`instruction-overlay.tsx:152`)가 보조기술에는 「나머지는 없다」고 말하는 동안 눈 뜬 터치 사용자에게는 그 나머지가 만질 수 있게 남아 있다 **[W 2.4.11 · 4.1.2]**.

같은 관계가 랜딩에도 있다 — 모바일 확장 카드의 backdrop(`landing-catalog-grid.tsx:31`)은 **[측-픽셀]** `theme-state-mobile-landing-test-expanded-en-light-mobile` 에서 y 0–56 까지 덮고 있으나(GNB 지면 `238,237,234` = 0.88×251 + 0.12×145 으로 산술 일치) 그 위에 GNB 가 그려져 조작 가능하다. 랜딩에서는 `req-landing.md:644`(`GNB > Expanded 카드 > backdrop`)가 그것을 **계약으로 요구**하므로 개정 대상이고, 테스트 다이얼로그에서는 요구한 조항이 없다.

**처방:** ⑴ 모달 계층을 GNB 위로 올린다 — 다이얼로그·시트·드로어를 `z-[1200]` 이상 한 층으로 통일하고 그 값을 `globals.css` 토큰(`--z-modal` 등)으로 못박는다. ⑵ 모달이 열린 동안 GNB 를 `inert` 로 만든다(제품에 이미 `inert` 사용 선례가 있다 — `transition-gnb-overlay.tsx:28`). ⑶ `req-landing.md:644` 의 레이어 순서를 「모달 계층 > GNB > 확장 카드 > backdrop」으로 개정하고, 테스트 다이얼로그에 대응 조항을 신설한다.

### TG-05 (blocker) 터치 태블릿이 마우스용 타깃 한 벌을 받는다 — 44px 한 벌은 이미 있는데 폭으로 가려져 있다

§0-3 표가 근거다. `site-gnb.tsx:40`/`:41` 의 `md:flex` / `md:hidden` 이 유일한 분기이고 입력 방식이 관여하지 않는다. hover 없는 900×1200 기기(사전 실측 프로브)는 **24px CI 링크 · 39.04px nav 링크 ×2 · 32px 로케일 칩 ×12 · 44px 설정 트리거**를 받고, `--tap-min` 으로 만들어진 드로어 한 벌(44px nav 링크 ×3 · 44×44 스와치 · 44px 로케일 칩 ×12)에는 **도달할 경로가 없다** — 햄버거 자체가 `md:hidden` 뒤에 있기 때문이다.

`components/settings-controls.tsx:20-24` 의 주석이 32px 을 **의도**로 적으며 그 근거를 「데스크톱 레이어는 WCAG 24px 이 바닥이고 44 로 하면 grid 가 wall 이 된다」로 든다. 그 전제가 「데스크톱 레이어 = fine pointer 표면」인데, **결정 2 는 정확히 그 전제를 무효화한다.** 설계 정의 쪽 `docs/design/ds/app-components.css:437-443`가 이미 「드로어 안에서는 같은 칩이 1차 터치 타깃이므로 바닥을 44 로 올린다」를 **조상 스코프로** 구현해 두었으므로, 필요한 것은 새 규칙이 아니라 **그 스코프의 판정 기준을 폭에서 입력으로 바꾸는 것**이다.

**처방:** ⑴ `useGnbCapability` 가 이미 내는 `hoverCapable`(`use-gnb-capability.ts:17`)을 GNB 행 선택의 1차 축으로 승격한다 — `md:flex`/`md:hidden` 을 CSS 에서 걷고 `hoverCapable && viewportWidth >= 768` 일 때만 데스크톱 행을 렌더한다(조건부 렌더로 바꾸면 §TG-13 의 이중 트리 문제도 함께 닫힌다). ⑵ `settings-controls.tsx:113`·`:117` 의 `scope` 를 `'desktop' | 'mobile'` 이 아니라 `'fine' | 'coarse'` 로 재명명하고 `min-h` 바닥을 그 값으로 고른다. ⑶ `site-gnb.tsx:45`(CI 링크)와 `:49-50`(nav 링크)에 `min-h-[var(--tap-min)]` 과 `inline-flex items-center` 를 더해 두 행 공통으로 44px 을 만든다 — 데스크톱에서도 `py-2` 를 `min-h` 로 바꾸는 것뿐이라 시각 변화가 작다. ⑷ `design.md:112` 의 열거형을 「모든 포인터 타깃은 coarse 입력 표면에서 44×44 이상, fine 입력 전용 표면에서 24×24 이상」이라는 **규칙**으로 개정하고, 「Read more」를 그 목록에서 빼 `§7.4` 의 비인터랙티브 규정과 일치시킨다.

### TG-06 (blocker) 열린 모바일 카드의 트리거가 0px 타깃으로 남아 포인터·탭 순서에 걸쳐 있다

`landing-grid-card.tsx:1056` 가 `isMobileExpanded` 일 때 트리거에 `[min-height:0] [padding:0]` 을 주고 `:1062` 이 내용에 `[height:0] [min-height:0] overflow-hidden` 을 준다. 그 트리거는 `<button>`/`<Link>`(`:1171`,`:1203`)이고 `onClick` 과 `tabIndex` 를 그대로 갖는다. 즉 **폭 390px · 높이 0px 의 활성 타깃**이 남는다 — **[W 2.5.8]** 의 24×24 하한을 명백히 밑돌고, 포커스가 들어와도 링을 그릴 면적이 없어 **[W 2.4.7]** 도 함께 무너진다.

**처방:** 확장 중에는 트리거를 `hidden`(또는 `inert` + `tabIndex={-1}` + `pointer-events:none`)으로 **타깃 집합에서 빼거나**, 사용자 결정 5 로 확장을 바텀시트로 옮겨 접힌 카드를 원래 크기로 남긴다. 후자면 이 결함은 패턴 교체로 사라진다.

### TG-07 (major) 터치에서 누름 피드백이 사실상 0이다

**[측-컴파일]** Tailwind preflight 가 `html { -webkit-tap-highlight-color: transparent }` 를 걸어 **브라우저 기본 하이라이트가 없고**, `hover:` 는 `@media (hover: hover)` 안에 있어 진짜 터치 기기에서 적용되지 않는다. 그러면 남는 것은 `active:` 뿐인데 그것은 저장소 전체 4개 문자열에만 있다(§2-⑷ 목록).

**가장 아픈 자리가 답변 A/B 다.** `surface-class-names.ts:83` 에는 `hover:border-[var(--accent)] hover:bg-[var(--sage-muted)]` 와 `data-[selected=true]:…` 만 있고 `active:` 가 없다. 터치 사용자가 받는 신호는 `data-selected=true` 하나이고, 그것은 **150ms 뒤 자동 전진**(`use-answer-lock.ts:32`)과 동시에 18px 슬라이드(`test-question-client.tsx:358` `duration: 0.18`)로 사라진다. 한 회차에 열두 번 이상 반복하는 행동에서 「내가 눌렀다」는 확인이 실질적으로 보이지 않는다 **[P 상태 피드백]**.

**처방:** `ui/button-class-names.ts` 에 `pressFeedbackClassName`(예: `active:bg-[var(--surface-strong)] active:[transform:scale(0.985)] motion-reduce:active:transform-none`)을 신설하고, `testAnswerChoiceClassName`(`surface-class-names.ts:83`) · `testChipClassName`(`surface-class-names.ts:92-93`) · `chipBaseClassName`(`settings-controls.tsx:28-29`) · `gnbMobileLinkClassName`(`site-gnb.tsx:100-101`) · `gnbDesktopLinkClassName`(`:49-50`) · `blogArticleListItemClassName`(`blog-destination-client.tsx:42-43`) · `LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME`(`landing-grid-card.tsx:234-235`) · `LANDING_GRID_CARD_MOBILE_CLOSE_CLASSNAME`(`:280`)에 붙인다. 답변 확정에는 그와 별도로 **150ms 잠금 동안 지속되는 확정 표시**를 준다 — 현재 표식(`testAnswerChoiceMarkClassName`, `:86`)이 채워지는 것은 맞지만 슬라이드와 동시라 체류 시간이 없다.

### TG-08 (major) 인터랙티브 원소에 `touch-action: manipulation` 이 0건이고, 테스트 문항이 더블탭 줌 후보를 만든다

§1 의 판정이 근거다. 특히 `test-question-client.tsx:362`/`:373` 의 A/B 가 8px 간격·47.75px 높이로 고정 배치되고 150ms 자동 전진이 걸려 있어, 빠르게 답하면 **같은 좌표 근처를 300ms 안에 두 번 탭**하게 된다.

**처방:** `ui/button-class-names.ts:60`(`buttonShapeClassName`)와 `focusRingClassName` 과 같은 층에 `touchActionClassName = '[touch-action:manipulation]'` 을 두고, 모든 `<button>`/`<a>`/`role="button"` 조합에 합친다 — 구체적으로 `buttonShapeClassName` · `testAnswerChoiceClassName` · `testChipClassName` · `chipBaseClassName` · `gnbInteractiveButtonBaseClassName`(`site-gnb.tsx:63-64`) · `gnbMobileLinkClassName` · `gnbDesktopLinkClassName` · `blogArticleLinkClassName` · `LANDING_GRID_CARD_TRIGGER_BASE_CLASSNAME`(`landing-grid-card.tsx:214`) · `LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME` · `LANDING_GRID_CARD_MOBILE_CLOSE_BASE_CLASSNAME`. `manipulation` 은 해당 원소의 더블탭 줌만 끄고 **페이지 핀치 줌은 그대로 두므로 [W 1.4.4] 와 충돌하지 않는다.** viewport meta 에 `maximum-scale`/`user-scalable=no` 를 추가하는 방식은 **금지** — 그것이 1.4.4 위반이다.

### TG-09 (major) `overscroll-behavior` 가 문서 루트에 없어 pull-to-refresh 와 스크롤 체이닝이 열려 있다

§1 의 판정이 근거다. 전면 모달인 `instruction-baseline` 상태에서 손가락을 끌면 보이지 않는 뒤 페이지가 스크롤되고, 최상단에서는 pull-to-refresh 가 발동한다. 지시 오버레이 단계는 `started === false` 라 `beforeunload` 가드도 없다(`use-before-unload-guard.ts:18`).

**처방:** ⑴ `globals.css` 에 `html { overscroll-behavior-y: contain }` 을 더해 전 표면에서 pull-to-refresh 를 끈다 — 이 저장소에 「당겨서 새로고침」이 의미를 갖는 화면은 없다. ⑵ `instruction-overlay.tsx:145` 의 레이어에 `overscroll-contain` 과 `overflow-y-auto`(+ `max-h-[100dvh]`)를 더해 시트 자신이 스크롤 컨테이너가 되게 하고, 열려 있는 동안 §TG-01 의 단일 잠금 모듈을 `acquire` 한다. ⑶ 같은 처리를 결정 5 로 도입할 모든 시트에 적용한다.

### TG-10 (major) 드로어의 유일한 가시 닫기 수단이 51px 좌측 띠이고, 그 띠가 iOS 뒤로가기 제스처 구역과 겹친다

**[측-픽셀]** 390px 에서 패널은 x 52–389, 테두리 x=51, **탭 가능한 backdrop 은 x 0–50 의 51px 띠**다(`w-[min(87vw,340px)]`, `site-gnb.tsx:87`). 320px 폭이면 41.6px, 360px 이면 46.8px 로 더 좁아진다. 패널 안에는 닫기 버튼이 **없고**, `site-gnb.tsx:88-95` 의 주석이 그 부재를 「탭 순회가 바뀌어 @smoke 키보드 매트릭스 두 건이 붉어지므로 유보」라고 명시적으로 기록한다.

**[W 2.5.8]** 은 51px 이면 통과한다. 문제는 셋이다 — ⑴ 그 띠가 **화면 왼쪽 가장자리**여서 iOS 의 interactive back-swipe 구역과 겹치고 `touch-action` 으로는 시스템 제스처를 막을 수 없다 **[P]**; ⑵ 패널이 열릴 때 포커스가 이동하지 않아 포커스는 햄버거에 남는데 **패널이 그 햄버거를 완전히 덮는다**(같은 주석의 `elementFromPoint` 실측) **[W 2.4.11]**; ⑶ `req-landing.md:695` 는 「Mobile hamburger / desktop settings / back / **X 버튼**은 `aria-label` 필수」라고 **X 버튼의 존재를 전제**하고 `design.md:112` 는 그것을 44×44 목록에 넣는다 — **계약이 전제하는 컨트롤이 구현에 없다** **[C]**.

**처방:** `gnbMobileHeadClassName`(`site-gnb.tsx:96`) 행에 44×44 닫기 버튼을 넣고, 드로어를 여는 시점에 그 버튼으로 포커스를 옮긴다. 주석이 유보 사유로 든 「탭 순회가 바뀐다」는 `use-gnb-keyboard-targets.ts:71-74` 의 순서 배열에 그 버튼을 첫 항목으로 등재하고 두 @smoke 매트릭스의 기대 순서를 함께 고치면 닫힌다 — 계약이 요구하는 컨트롤을 빼는 것보다 테스트를 고치는 쪽이 옳다.

### TG-11 (major) 드로어 backdrop 이 `pointerdown` 에 닫고, 취소 조건이 10px 이동 하나뿐이다

`use-gnb-mobile-menu.ts:90-105` 가 `pointerdown` 에서 즉시 `requestMobileMenuClose('outside')` 를 부르고, `:107-126` 이 10px 초과 이동(`behavior.ts:6` `MOBILE_MENU_SCROLL_CANCEL_THRESHOLD_PX = 10`)에서만 되돌린다. 취소 창은 `MOBILE_MENU_CLOSE_DURATION_MS = 180`(`behavior.ts:4`)뿐이다. **[W 2.5.2 Pointer Cancellation]** 은 down-event 로 기능을 실행하려면 중단·되돌리기가 가능하거나 up-event 가 완료를 맡아야 한다고 요구한다 — 손가락을 움직이지 않고 떼기만 하는 동작으로는 되돌릴 수 없으므로 미달 가능성이 높다.

**같은 조항이 계약에 있다** — `req-landing.md:237` 「패널 외부 영역 입력은 `pointer down` 시점에 닫힘을 시작해야 한다」. 즉 **구현 결함이 아니라 계약 자체가 표준과 충돌하는 자리**이고, 사용자 결정 1 이 적용될 1순위 조항이다.

**대비가 결정적이다** — 같은 저장소의 카드 backdrop 은 **이미 올바르다**: `use-mobile-backdrop-gesture.ts:72` 가 `closeOnPointerUp: phase === 'OPEN'` 을 저장하고 `:91-97` 이 `pointerup` 에서 닫는다. 두 backdrop 이 같은 10px 임계로 반대 규칙을 쓴다 **[S]**.

**처방:** `req-landing.md:237` 을 「패널 외부 영역 입력은 `pointer up` 시점에 닫힘을 시작하며, down 시점에는 시각 예고(backdrop 불투명도 감쇠)만 허용한다」로 개정하고, `use-gnb-mobile-menu.ts:90-130` 을 `use-mobile-backdrop-gesture.ts:63-98` 의 구조(=`closeOnPointerUp` 플래그 + `onPointerCancel`)로 교체한다. 두 곳이 같은 코드를 쓰게 되므로 `MOBILE_MENU_SCROLL_CANCEL_THRESHOLD_PX` 와 `MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX`(둘 다 10) 도 한 상수로 합친다.

### TG-12 (major) Playwright 하네스에 터치 에뮬레이션이 0건이라 이 렌즈의 결함 전부가 게이트에 보이지 않는다

`playwright.config.ts`(61줄 전체)와 `tests/` 전수 grep 결과 `hasTouch` · `isMobile` · `devices[…]` 가 **한 건도 없다**. 두 프로젝트(`chromium`, `webkit-ghosting`)는 `browserName` 만 지정한다(`:30-50`). 따라서 **390px 로 폭만 줄인 모든 「모바일」 테스트와 40장의 모바일 baseline 은 `(hover: hover)` 와 `(pointer: fine)` 이 모두 참인 마우스 컨텍스트에서 만들어졌다.**

귀결 셋 — ⑴ `hover:` 로 감싼 37개 스타일이 baseline 에 그대로 찍히므로 **모바일 baseline 은 터치 사용자가 보는 화면이 아니다**; ⑵ `(hover: hover) and (pointer: fine)` 게이트 3곳의 false 분기는 **한 번도 실행되지 않는다**; ⑶ 결정 2 를 구현하면 390px 케이스들이 「계약 위반」이 아니라 「테스트가 터치를 흉내 내지 않아서」 붉어진다. 여기에 §0 의 사실 — 타깃 크기를 재는 검사가 저장소에 0건이고 axe `target-size` 는 기본 비활성 — 이 겹쳐, **이 문서의 결함 중 어느 하나도 현재 게이트가 잡지 못한다.**

**처방:** ⑴ `playwright.config.ts` projects 에 `{name: 'mobile-touch', use: {browserName: 'chromium', hasTouch: true, isMobile: true, viewport: {width: 390, height: 844}}}` 를 추가하고, `theme-matrix-manifest.json` 의 `viewports` 에 입력 방식 축(`mobile-touch`, `tablet-touch`)을 신설한다 — 이것은 Ask-First 경로(`AGENTS.md` §4)이고 baseline 장수를 늘리므로 착수 전에 승인이 필요하다. ⑵ 타깃 크기를 재는 게이트를 새로 만든다 — `AxeBuilder` 에 `.withRules([... , 'target-size'])` 를 더해 24px 바닥을 자동화하고, 44px 바닥은 `boundingBox()` 로 재는 전용 스펙(`tests/e2e/touch-target-smoke.spec.ts`)으로 고정한다(제품이 렌더하는 모든 `button, a[href], [role="button"]` 을 순회해 coarse 프로젝트에서 44 미만을 실패로 만든다). ⑶ `scripts/qa` 에 `document.body.style` 직접 쓰기와 `touch-action` 없는 인터랙티브 클래스 상수를 잡는 소스 검사를 더한다.

### TG-13 (major) 설정 트리거의 첫 탭이 열자마자 닫는다 — 터치 태블릿 전 폭에서

`shouldOpenDesktopSettingsByHover`(`behavior.ts:8-13`)가 `viewportWidth >= 1024 && hoverCapable` 을 요구한다. 그 값이 false 면 `site-gnb.tsx:319-323` 의 `onFocus` 가 `openSettingsImmediate()` 를 부르는데, `onClick` 은 조건 없이 `toggleSettingsOpen`(`:324`)이다. 포인터 입력의 이벤트 순서는 `pointerdown → focus → pointerup → click` 이므로, **`hoverOpenEnabled === false` 인 모든 환경 — ① 768–1023px 마우스 데스크톱, ② 모든 폭의 hover 없는 터치 기기 — 에서 첫 탭은 focus 로 열고 곧바로 click 이 닫는다.** 두 번째 탭에서야 열린다(이미 포커스가 있어 focus 가 재발화하지 않는다).

E2E 는 이 조합을 덮지 않는다 — `gnb-smoke.spec.ts:347-378` 의 non-hover 테스트가 `trigger.focus()` 를 직접 부르고 클릭하지 않으며, 설정 관련 테스트의 뷰포트는 1280/1440/1600 뿐이다. 코드 경로는 확정이고 브라우저 재현은 하지 않았다 **[미]** — 900px 폭에서 `gnb-settings-trigger` 를 **클릭**하는 Playwright 검사 하나면 판정된다.

**처방:** `onFocus` 의 열기를 **키보드 포커스일 때만** 걸리게 좁힌다 — `:focus-visible` 기반 판정(제품에 이미 `use-keyboard-mode-tracker.ts` 가 있다)을 쓰거나, `onFocus` 대신 `onKeyDown(Enter/Space)` + `onClick` 조합으로 바꾼다. 그리고 `behavior.ts:12` 의 `viewportWidth >= 1024` 항은 결정 2 아래에서 근거가 없으므로(1024 는 「hover 를 쓸 만한 기기」의 대리 변수였다) `hoverCapable` 단독으로 줄인다 — 그러면 hover 가능한 1000px 축소 창에서 hover 열기가 꺼지는 현행 이상 동작도 함께 사라진다.

### TG-14 (major) `Preferences` 는 아무 일도 하지 않고, 그 사실을 알리는 문구가 hover 에만 있다

`telemetry-consent-banner.tsx:32` 의 `onPreferencesAction={() => {}}`, 그리고 유일한 설명이 `consent-banner.tsx:269` 의 `title={preferencesTitle}`(= `consent.preferencesTitle`, en 값 "Preferences panel coming soon")이다. `title` 은 터치에서 표시되지 않으므로 **모바일 사용자에게는 44px 컨트롤을 눌렀는데 아무 일도 일어나지 않는 것만 남는다** **[S][P]**. 배너는 랜딩·블로그·히스토리 세 표면에 뜬다(`page-shell.tsx:25`).

**처방:** 세 중 하나를 고른다 — ⑴ 버튼을 제거하고 라벨을 두 선택지(Accept/Deny)로 줄인다, ⑵ 실제 preferences 시트를 구현한다(결정 5 아래 바텀시트가 자연스러운 형태), ⑶ 최소한 `disabled` + 보이는 보조 문구로 바꿔 상태를 시각으로 말한다. `title` 만으로 상태를 말하는 구현은 어느 경우에도 남기지 않는다.

### TG-15 (major) 확장된 모바일 카드가 고정 scrim 아래로 스크롤돼 사라진다

`req-landing.md:641` 이 「OPENING/CLOSING 동안만 page scroll lock, OPEN settled 에서는 unlock 유지」를 요구하고 `use-mobile-scroll-lock.ts:5-7` 이 그대로 구현한다. backdrop 은 `fixed inset-0 … touch-pan-y`(`landing-catalog-grid.tsx:31`)라 뷰포트에 고정되는데 **확장 카드는 문서 흐름 안에 있다**(`landing-grid-card.tsx:1042` 의 `rounded-none w-screen min-h-0 mx-[calc(50%-50vw)]` — position 은 static). 그리고 모바일 생명주기 이벤트 8종(`mobile-lifecycle.ts:23-30`)에 스크롤 관련 이벤트가 **없고**, `use-mobile-card-lifecycle.ts` 에 스크롤 리스너가 **없다**(grep 전수 확인).

**결과: OPEN 상태에서 손가락으로 페이지를 밀면 카드가 화면 밖으로 나가고, 화면에는 전면 scrim 만 남는다.** 사용자는 무엇이 열려 있는지 보이지 않는 채 아무 데나 탭해야 닫힌다. 데스크톱에는 이 상황을 처리하는 조항이 있는데(`req-landing.md:547` 「카드가 뷰포트를 완전히 벗어나면 유지를 해제하고 collapse 한다」) **모바일에는 대응 조항이 없다** **[C 공백]**.

**처방:** ⑴ 짧게는 모바일에도 §8.5 에 「확장 카드가 뷰포트를 완전히 벗어나면 close 를 시작한다」를 신설하고 `IntersectionObserver` 로 구현한다(제품에 이미 사용 선례가 있다 — `result_viewed` 경로). ⑵ 옳게는 사용자 결정 5 로 확장을 **바텀시트**로 옮긴다 — 시트는 뷰포트 고정이라 스크롤로 사라질 수 없고, 그 순간 `req-landing.md:640-641` 의 「OPEN 에서 unlock 유지」 조항 자체가 불필요해진다.

### TG-16 (minor) 드로어 backdrop 의 스크롤 취소가 「취소할 스크롤이 없는」 상태에서 메뉴를 되살린다

`use-gnb-mobile-menu.ts:113-123` 이 10px 초과 이동에서 닫힘을 취소하는데, 그 순간 body 는 `overflow:hidden` + `touch-action:none`(`:140-141`)이라 **취소가 되살리려는 「스크롤 제스처」가 애초에 일어날 수 없다**. 즉 취소 경로의 유일한 실효는 「닫으려고 눌렀다가 손가락이 10px 넘게 흔들린 사용자에게 메뉴를 다시 열어 주는 것」이다. 10px 은 Material 의 touch slop(8dp)보다 조금 클 뿐이라 큰 손가락·이동 중 조작에서는 흔한 범위다 **[P]**.

**처방:** TG-11 의 `pointerup` 전환으로 이 경로 전체를 대체한다 — `pointerup` 에서 닫는 구조에서는 「이동했으면 닫지 않는다」가 취소가 아니라 자연스러운 조건이 되고, 되살릴 상태가 없다.

### TG-17 (minor) 드로어 nav 링크 3개 사이 간격이 4px 이다

`site-gnb.tsx:99` 의 `gnbMobileLinksClassName = 'gnb-mobile-links grid gap-1'` → 전폭 44px 행 셋이 4px 간격. **[W 2.5.8]** 은 타깃이 24px 이상이므로 통과하지만 **[P iOS HIG / Material 3 의 8px 하한]** 아래다. 같은 드로어의 칩 행은 `gap-2`(8px, `settings-controls.tsx:19`)를 쓰므로 내부 비일관이기도 하다 **[S]**.

**처방:** `gap-1` → `gap-2` 로 올린다. 세로 24px 이 늘어나므로 TG-02/TG-03 의 세로 예산 재작성과 같은 단위에서 처리한다.

### TG-18 (minor) `-webkit-overflow-scrolling: touch` 는 죽은 선언이다

`site-gnb.tsx:87` 의 `[-webkit-overflow-scrolling:touch]`. iOS 13 에서 제거돼 현행 WebKit 에서 아무 효과가 없고, TG-02 때문에 그 자리에서 스크롤 자체가 일어나지 않는다 **[P]**.

**처방:** 삭제한다. 클래스 문자열이 길어 읽기를 방해하는 것 외에 위험은 없지만, 이 선언이 남아 있으면 「iOS 스크롤은 처리돼 있다」는 잘못된 신호를 준다.

### TG-19 (minor) blog 카드의 hover 두 규칙이 서로 다른 게이트 뒤에 있다

`landing-grid-card.module.css:92-97` 의 `.root.blogCard:hover`(테두리·그림자)는 `@media (hover: hover) and (pointer: fine)` 안에 있는데, `:196-200` 의 `.root.blogCard:hover .blogReadMoreHover`(CTA 가시성)는 **그 밖에** 있다. 지금은 `landing-grid-card.tsx:506-511` 이 tap 모드에서 `blogReadMoreHover` 클래스를 붙이지 않아 가려져 있지만, 결정 2 로 축을 재배선할 때 두 조건이 어긋나면 **터치 기기에서 CTA 만 켜지고 테두리는 안 켜지는** 상태가 나올 수 있다 **[S]**.

**처방:** `:196-200` 을 `:92` 의 미디어 블록 안으로 옮기거나, 두 규칙 모두 미디어 쿼리를 버리고 §TG-05 로 통일된 단일 capability 판정이 붙이는 클래스에 의존하게 한다.

### TG-20 (minor) 드로어가 열린 채 가로로 눕히면 트리거가 사라지고 포커스 복귀 대상이 없어진다

드로어 레이어의 렌더 조건은 `mobileMenuEnabled && mobileMenuState !== 'closed'`(`site-gnb.tsx:419`)이고 `mobileMenuEnabled = context !== 'test'`(`:134`)로 **폭 조건이 없다**. 반면 트리거는 `md:hidden` 행 안에 있다(`:41`,`:391`). 그리고 리사이즈로 메뉴를 닫는 코드가 없다 — `closeMobileMenuImmediate` 호출처는 로케일 변경 한 곳뿐이다(`:210`, grep 전수 확인).

**결과:** 390×844 폰을 가로로 눕히면 폭 844 ≥ 768 이 되어 데스크톱 행이 뜨고 햄버거가 사라지는데 **드로어는 열린 채 남는다.** `completeMobileMenuClose` 가 포커스를 돌려보낼 `mobileMenuTriggerRef`(`use-gnb-mobile-menu.ts:55`)는 그때 `display:none` 이라 포커스가 갈 곳을 잃는다. 같은 회전이 TG-02·TG-03 의 세로 넘침 조건이기도 하다.

**처방:** TG-05 의 조건부 렌더로 전환하면서 「데스크톱 행으로 바뀌면 드로어를 즉시 닫는다」를 같은 판정에 묶는다.

---

## 4. 결함이 아닌 것 — 확인하고 통과시킨 항목

**[W 2.5.7 Dragging Movements] 위반 없음.** 드래그를 요구하는 인터랙션이 제품에 0건이다(§1). 판정 대상이 없어 공허하게 통과한다.

**[W 2.5.8 Target Size (Minimum) AA] 위반 1건.** §0 표에서 24px 을 밑도는 것은 TG-06 의 0px 트리거 하나뿐이다. 44px 미달 넷은 전부 24px 을 넘는다.

**인접 간격 위반 없음.** 모든 타깃이 24px 이상이므로 2.5.8 의 간격 예외를 쓸 필요가 없다(§0-6 셋째).

**핀치 줌·더블탭 줌이 살아 있다.** viewport meta 에 `maximum-scale`/`user-scalable=no` 가 없다(§1) — **[W 1.4.4]** 관점에서 옳고, TG-08 의 처방은 이것을 건드리지 않는다.

**모바일 드로어 칩은 실제로 44px 이다.** `min-h-8` 과 `min-h-[var(--tap-min)]` 의 emit 순서를 컴파일로 확정했다(§서두 1-⑵) — 기존 맵이 「[미]」로 남긴 항목의 답이다.

**카드 backdrop 의 닫기 히트 영역은 넉넉하다.** **[측-픽셀]** 390×844 에서 카드 위 258px + 아래 244px, 폭 전체. 드로어(51px 띠)와 대조된다.

**`req-landing.md:232` 「backdrop 은 메뉴 패널 외 전체 viewport 를 dimmed 처리한다」는 지켜진다.** **[측-픽셀]** 로 확인했다(x 0–50 이 `116,114,110` = `--overlay-scrim-strong` 0.60 over `--canvas` 251, 산술 일치).

**transition 유령 GNB 는 터치를 가로채지 않는다.** `transition-gnb-overlay.tsx:14` 에 `pointer-events-none` 이 있고 내부에서 `pointer-events: auto` 로 되살리는 클래스가 없다.

---

## 5. 커버리지와 미확인

**훑은 표면:** 랜딩(`/{locale}`) · 테스트(`/{locale}/test/{variant}`, 지시 오버레이 · qualifier 단계 · 문항 · 결과) · 테스트 에러(`/{locale}/test/error`) · 블로그 목록·상세 · 히스토리 · GNB(모바일 행·데스크톱 행·드로어·설정 레이어) · 동의 배너 · segment 404 · global 404 · page-shell · transition GNB 오버레이. `src/` 에서 `onClick` / `role="button"` / `<Link>` 를 갖는 원소를 전수 grep 으로 열거해 41개 지점을 모두 표에 반영했다.

**훑지 못한 표면:** 없다. 다만 `/{locale}/blog/{variant}` 상세는 **어떤 뷰포트에서도 시각 baseline 이 0장**이라(매니페스트 `layoutCases`/`stateCases` 에 해당 라우트 없음) 픽셀 실측 없이 클래스 계산만으로 판정했다.

**미확인 — 다음 단계가 재야 할 것:**

1. **TG-01 의 실제 재현.** 코드 경로는 확정이지만 브라우저에서 「카드 OPENING 중 햄버거 탭 → 드로어 닫기」 순서를 밟아 `getComputedStyle(document.body).touchAction` 이 `none` 으로 남는지 관측하지 않았다. `hasTouch` 프로젝트 하나와 10줄짜리 스펙이면 판정된다.
2. **TG-02·TG-03 의 실기기 확인.** `body{touch-action:none}` 아래에서 드로어 패널이 정말 팬되지 않는지, `h-screen` 승리로 iOS Safari 에서 설정 블록이 주소창 아래로 내려가는지 — 둘 다 실기기 또는 device-emulation 이 필요하다. headless Chromium 의 baseline 은 이 차이를 보지 못한다.
3. **TG-08 의 더블탭 줌 발동 여부.** 더블탭의 시간·거리 임계는 브라우저 내부값이라 재지 않았다. 150ms 자동 전진 아래에서 실제로 줌이 발동하는지는 실기기 관측이 필요하다.
4. **TG-13 의 브라우저 재현.** 900px 폭에서 `gnb-settings-trigger` 를 `focus()` 가 아니라 **클릭**했을 때 패널이 남아 있는지.
5. **global 404 의 viewport meta.** `src/app/global-not-found.tsx:37` 은 루트 레이아웃을 거치지 않고 자체 `<html>` 을 렌더한다. Next 가 이 라우트에도 기본 viewport meta 를 주입하는지 확인하지 않았다 — 주입되지 않으면 모바일에서 980px 레이아웃 뷰포트로 렌더되어 46px `Return home` 링크의 실효 크기가 대략 18 device px 로 줄어든다. 확인 비용보다 **`export const viewport = {width: 'device-width', initialScale: 1}` 를 `layout.tsx` 와 `global-not-found.tsx` 양쪽에 명시하는 편이 싸고 결정적이다.**
6. **12 로케일에서의 타깃 폭.** §0 표의 폭은 en/kr 기준 추정이다. 특히 D5(32px 로케일 칩 12개)와 T6(qualifier 칩)의 실제 폭은 로케일별 라벨 길이에 달려 있고, baseline 은 en·kr 2개뿐이다.
7. **iOS edge-swipe 구역과 드로어 51px 띠의 실제 충돌.** 플랫폼 관용에 근거한 판정이고 실기기에서 재현하지 않았다.
8. **`react` 합성 마우스 이벤트가 터치에서 hover intent 경로를 타는지.** 현행은 `interactionMode==='tap'` 가드에 막혀 도달하지 않지만(`use-hover-intent-controller.ts:318`,`:390`,`:483`), 결정 2 재배선 후 `use-card-inline-geometry.ts:298-301` 의 `pointerenter`/`pointerleave` 가 터치에서 어떻게 동작하는지는 측정하지 않았다.
9. **게이트 현재 상태.** `npm test` · `npm run qa:rules` · `npm run test:e2e:gate` 를 이 세션에서 **실행하지 않았다**(읽기 전용 과제). axe 규칙 상태와 Tailwind emit 순서는 `node_modules` 를 직접 실행해 확정했지만, 게이트의 pass/fail 은 확인하지 않았다.
