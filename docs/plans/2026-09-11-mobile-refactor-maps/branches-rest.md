# 뷰포트·입력 분기 census — 네 파일을 제외한 src/ 전체

분석 대상: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (HEAD `7616211`, 착수 마커 커밋; 그 부모가 `a5aec95`). 읽기 전용으로만 다뤘고 저장소 파일은 수정하지 않았다.

제외한 네 파일: `src/features/landing/grid/landing-grid-card.tsx` · `use-landing-interaction-controller.ts` · `use-mobile-card-lifecycle.ts` · `use-hover-intent-controller.ts`. 이 넷은 census 표에서 빠지지만, 나머지 파일의 분기가 **무엇에서 흘러나오는지**를 설명할 때는 출처로 인용한다 — 그 인용은 §1-1 에 모아 두었다.

## 0. 방법과 재현

지시된 grep 이 `src/` 에서 276 줄을 맞혔고, 네 파일을 뺀 나머지가 123 줄이다. 그 123 줄을 손으로 분류하면서 **지시된 패턴이 구조적으로 놓치는 세 부류**를 추가 sweep 으로 찾아냈다 — 이것들은 census 에 포함돼 있고, 패턴을 그대로 믿었다면 전부 빠졌을 것이다.

| 놓친 부류 | 왜 놓쳤나 | 어디서 찾았나 |
|:---|:---|:---|
| `plan.tier === 'mobile'` 4 건 | 패턴이 `viewportTier` 를 찾는데 실제 식별자는 `plan.tier` | `grep -rnE "tier\s*(===\|!==)"` |
| `@container landing-grid (width < 1160px)` 1 건 | 패턴에 `@media` 만 있고 `@container` 가 없다 | `grep -rn "@container\|container-type"` |
| `interactionMode === 'hover'` 7 건 | 패턴이 `interactionMode` 식별자를 맞히긴 하지만, 타입 선언 줄과 비교 줄이 뒤섞여 눈으로 갈라야 한다 | 위 census 를 파일별로 다시 읽음 |

반대로 지시된 패턴이 만들어 낸 오탐도 있다 — `--shadow-sm/md/lg/xl`(`globals.css:147-150, 372-375`) · `--radius-md/lg/xl`(`:190-192`) · `--body-sm`(`:208`) · `req-test.md:75` 같은 문서 인용(`test-result-panel.tsx:59,62`) · `globals.css:310,316` 과 `landing-grid-card.module.css:568` 의 한국어 주석. 아래 표에는 넣지 않았다.

Tailwind 가 실제로 어떤 미디어 쿼리를 뱉는지는 추정하지 않고 **컴파일해서 쟀다** — probe 스크립트는 `/private/tmp/claude-501/-Users-woohyeon-Local-ViveTest/91a75431-b18f-466b-8d47-1b306568872a/scratchpad/analysis/tw-probe.mjs` 이고, 저장소의 `node_modules/@tailwindcss/postcss` 4.1.0 을 그대로 쓴다. 결과는 §5 에 있다.

## 1. 총계

| 구분 | 개수 | 비고 |
|:---|---:|:---|
| JS 폭 기반 판정 지점 | 29 | §2 |
| 입력 방식(hover/pointer) 판정 지점 | 8 | §3. 그 중 1 개는 폭과 AND 로 묶여 있다 |
| Tailwind 반응형 유틸리티 **인스턴스** | 22 | §4. 줄 수로는 8 줄, 파일로는 5 개 |
| 생 CSS `@media` 뷰포트 쿼리 | 2 | `globals.css:326, 332` |
| 컨테이너 쿼리 | 1 | `landing-catalog-grid.module.css:31` |
| **뷰포트·입력 분기 합계(제외 4파일 밖)** | **62** | |
| (참고) `prefers-reduced-motion` CSS 블록 | 3 | `landing-grid-card.module.css:99, 202, 576` — 뷰포트 아님 |
| (참고) `prefers-color-scheme` / reduced-motion matchMedia | 4 | `use-theme-preference.ts:31, 99` · `theme-transition.ts:41` · `public/theme-bootstrap.js:18` |

뷰포트 경계로 쓰이는 **서로 다른 임계값이 5 개**이고, 그것을 표현하는 **메커니즘이 4 종**(JS 상수 · Tailwind named · Tailwind arbitrary · 생 CSS `@media`)이며, 컨테이너 폭 임계값 2 개가 다섯째 축으로 따로 있다. 같은 경계를 두 메커니즘이 각자 적은 자리가 세 곳이다 — 767/768, 899/900, 1023/1024.

| 임계값 | JS 상수 | Tailwind | 생 CSS | 성격 |
|---:|:---|:---|:---|:---|
| 719 | 없음 | `max-[719px]:` ×7 | 없음 | **다른 어디에도 근거가 없는 고아 값** |
| 767 / 768 | `MOBILE_MAX_VIEWPORT_WIDTH = 767` (`layout-plan.ts:1`, 포함) · `MOBILE_BREAKPOINT_MAX = 767` (`behavior.ts:1`, **소비자 0**) · 리터럴 `768` (`use-landing-interaction-controller.ts:72`) | `md:` ×6 (=768px 이상) · `max-[767px]:` ×7 (=767px **미만**) | `@media (min-width: 768px)` (`globals.css:326`) | 모바일/그 위의 주 경계 |
| 899 / 900 | `NARROW_PADDING_MAX_VIEWPORT_WIDTH = 899` (`layout-plan.ts:7`) | 없음 | `@media (min-width: 900px)` (`globals.css:332`) | 좌우 여백 3단 중 마지막 단 |
| 1023 / 1024 | `TABLET_MAX_VIEWPORT_WIDTH = 1023` (`layout-plan.ts:2`) · `DESKTOP_SETTINGS_HOVER_MIN_WIDTH = 1024` (`behavior.ts:2`) | 없음 | 없음 | 태블릿/데스크톱 |
| 1280 | `CONTAINER_MAX_WIDTH = 1280` (`layout-plan.ts:3`, 분기 아님 — `max-w`) | `xl:` ×2 | 없음 | 최대 폭 · 그리드 gap 한 단 |
| 1040 / 1160 | `DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE = 1040` · `DESKTOP_WIDE_MIN_GRID_INLINE_SIZE = 1160` (`layout-plan.ts:8-9`) | 없음 | `@container landing-grid (width < 1160px)` | **뷰포트가 아니라 그리드 컨테이너 inline-size** |

### 1-1. 제외된 네 파일이 공급하는 두 축 (출처로만 인용)

`isMobileViewport` 는 **순수 폭**이다 — `viewportTier === 'mobile'`, 즉 `viewportWidth <= 767`. 정의는 두 곳에 각각 있다: `use-landing-interaction-controller.ts:157` 과 `landing-grid-card.tsx:970`. 아래 census 의 `isMobileViewport` 분기 전부가 이 한 값의 하류다.

`interactionMode`(`'hover' | 'tap'`)는 **폭과 입력의 AND**다 — `resolveInteractionMode` (`use-landing-interaction-controller.ts:71-77`)가 `viewportWidth < 768` 이면 무조건 `'tap'`, 그 이상이면 `matchMedia('(hover: hover) and (pointer: fine)')`(`:207`)의 결과를 따른다. 그 `768` 은 **`MOBILE_MAX_VIEWPORT_WIDTH` 를 참조하지 않는 리터럴**이다(`:72`). 값은 지금 일치하지만(`<768` ≡ `<=767`) 두 축이 한 상수를 공유하지 않는다.

이 두 축은 독립적이다 — 768px 이상에서 hover 가 없는 기기는 `interactionMode='tap'` 이면서 `isMobileViewport=false` 다. 사용자 결정 2(「hover 없는 기기는 768px 이상에서도 터치용 생명주기」)가 바꾸려는 것이 정확히 이 조합이며, `isMobileViewport` 를 소비하는 아래 29 개 지점 중 **`interactionMode` 를 함께 보는 곳은 0 개**다.

## 2. JS 폭 기반 분기 — 파일별

semantics 표기: **width** = 뷰포트 폭만 · **input** = 입력 capability 만 · **both** = 둘의 AND · **container** = 컨테이너 inline-size · **unclear** = 판정 불가.

| 파일:줄 | 분기 | semantics | 제어 대상 |
|:---|:---|:---:|:---|
| `layout-plan.ts:64` | `viewportWidth <= MOBILE_MAX_VIEWPORT_WIDTH` → `'mobile'` | width | 티어 SSOT. 아래 전부의 상류 |
| `layout-plan.ts:68` | `viewportWidth <= TABLET_MAX_VIEWPORT_WIDTH` → `'tablet'` | width | 같음 |
| `layout-plan.ts:81` | `input.tier === 'mobile'` | width | 그리드 열 수 1/1 고정 |
| `layout-plan.ts:126` | `viewportTier === 'desktop'` | width | 확장 카드 목표 배율 1.1 |
| `layout-plan.ts:128` | `viewportTier === 'tablet'` | width | 확장 카드 목표 배율 1.04 (모바일은 1) |
| `layout-plan.ts:89` | `gridInlineSize >= 1160` → `desktop-wide` (3/4열) | container | 열 수. **폭이 아니라 측정된 컨테이너** |
| `layout-plan.ts:97` | `gridInlineSize >= 1040` → `desktop-medium` (2/3열) | container | 열 수 |
| `landing-catalog-grid.tsx:55` | `resolveLandingViewportTier(viewportWidth)` | width | 이 페이지의 티어 |
| `landing-catalog-grid.tsx:125` | `window.innerWidth` 읽기 | width | 티어의 입력값(출처) |
| `landing-catalog-grid.tsx:41` | `containerElement.clientWidth` | container | `gridInlineSize`(출처) |
| `use-grid-geometry-controller.ts:172` | `plan.tier !== 'mobile' && …` | width | baseline 측정 준비 판정 |
| `use-grid-geometry-controller.ts:327` | `plan.tier === 'mobile' \|\| !activeVisualCardVariant` | width | 확장 카드 spacing 모델 |
| `use-grid-geometry-controller.ts:372` | `plan.tier === 'mobile'` | width | resting floor 계산 |
| `use-grid-geometry-controller.ts:415` | `plan.tier !== 'mobile' && activeVisualCardVariant` | width | 같음 |
| `desktop-shell-phase.ts:62` | `!isMobileViewport && (…)` → `'steady'` | width | 데스크톱 모션 역할 |
| `desktop-shell-phase.ts:70` | `input.isMobileViewport \|\| !input.available` → `'idle'` | width | 데스크톱 stage shell 렌더 여부 |
| `use-desktop-motion-controller.ts:125` | `if (isMobileViewport)` → 런타임 리셋 | width | 데스크톱 모션 상태 전량 폐기 |
| `use-card-keyboard-handler.ts:130` | `if (isMobileViewport)` (Shift+Tab, 확장 본문 첫 요소) | width | 모바일 키보드 handoff |
| `use-card-keyboard-handler.ts:155` | `if (isMobileViewport)` (Tab, 확장 본문 마지막 요소) | width | 같음 |
| `use-card-keyboard-handler.ts:204` | `if (isMobileViewport)` (Shift+Tab, first focusable) | width | 같음 |
| `use-card-keyboard-handler.ts:224` | `if (isMobileViewport)` (Shift+Tab, 카드 루트) | width | handoff + GNB 역진입 |
| `use-card-keyboard-handler.ts:272` | `if (isMobileViewport)` (Enter/Space) | width | 확장을 `beginMobileOpen` 으로 대체 |
| `use-keyboard-handoff.ts:74` | `isMobileViewport` 전달 | width | handoff 큐의 모바일 분기 |
| `use-landing-keyboard-entry.ts:38` | `isMobileViewport ? [모바일 GNB 셀렉터] : [데스크톱 GNB 셀렉터]` | width | Shift+Tab 역진입 포커스 대상 |
| `use-mobile-backdrop-gesture.ts:61` | `isMobileViewport && phase !== 'NORMAL'` | width | backdrop 활성 |
| `use-mobile-backdrop-gesture.ts:62` | 같은 조건 | width | backdrop `data-state` |
| `use-mobile-backdrop-gesture.ts:64` | `!isMobileViewport \|\| phase === 'NORMAL'` → early return | width | 바깥 탭으로 닫기 |
| `interaction-state.ts:104` | `if (input.isMobileViewport)` → `'preserve-mobile'` | width | 키보드 포커스 시 확장 여부 |
| `use-card-inline-geometry.ts:95 / :116 / :171` | `viewportTier` 를 `resolveLandingExpandedScale` 에 3 회 전달 | width | 확장 배율(초기·측정·reduced-motion) |
| `interaction-dom.ts:138` | `cardElement.dataset.cardViewportTier === 'mobile'` | width | 카드가 모바일인지 **DOM 을 되읽어** 판정 |
| `gnb/behavior.ts:12` | `viewportWidth >= 1024 && hoverCapable` | **both** | 설정 패널을 hover 로 열지 |

`interaction-dom.ts:136-138` 은 이 census 에서 유일하게 **DOM 을 경유해 티어를 되읽는** 지점이다. 쓰는 쪽은 `landing-grid-card.tsx:1122` 의 `data-card-viewport-tier={viewportTier}` 이고, 읽는 쪽은 React 트리를 벗어난 DOM 유틸이다. 0단계 구조 분리에서 이 왕복이 남으면 티어의 정의가 두 곳(React prop · DOM attribute)에 생긴다.

`use-landing-keyboard-entry.ts:38` 은 **폭 축이 어긋난 채로 두 시스템을 잇는 유일한 지점**이다. 이 분기는 `isMobileViewport`(≤767)로 갈라지는데, 그것이 찾는 `.gnb-mobile` / `.gnb-desktop` 은 Tailwind `md:`(≥768)로 보여지고 숨겨진다. 지금은 두 경계가 붙어 있어 일치하지만 같은 상수에서 오지 않는다.

## 3. 입력 방식 분기

| 파일:줄 | 분기 | semantics | 제어 대상 |
|:---|:---|:---:|:---|
| `use-gnb-capability.ts:17` | `matchMedia('(hover: hover) and (pointer: fine)')` | input | `hoverCapable`(출처). resize + change 양쪽 구독 |
| `gnb/behavior.ts:12` | `viewportWidth >= 1024 && hoverCapable` | both | §2 와 동일 항목 |
| `landing-grid-card.module.css:92` | `@media (hover: hover) and (pointer: fine)` | input | 블로그 카드 hover 테두리·그림자 |
| `interaction-state.ts:254` | `event.interactionMode === 'hover'` | both* | `CARD_HOVER_ENTER` 처리 |
| `interaction-state.ts:296` | `event.interactionMode === 'hover'` | both* | 확장 카드 전환 |
| `interaction-state.ts:307` | `event.interactionMode !== 'hover'` | both* | hover leave 무시 |
| `interaction-state.ts:329` | `event.interactionMode !== 'hover'` | both* | 같음 |
| `interaction-state.ts:350` | `event.interactionMode !== 'hover'` | both* | 같음 |
| `interaction-state.ts:376` | `event.interactionMode !== 'hover' \|\| isInteractionBlocked(…)` | both* | hover 잠금 |
| `interaction-state.ts:409` | `event.interactionMode !== 'hover' \|\| …` | both* | 같음 |

\* `interactionMode` 자체가 §1-1 의 AND 축이므로 semantics 는 both 다. 이 7 개 지점은 입력만 보는 것처럼 읽히지만 실제로는 폭 768 이 이미 곱해져 들어와 있다 — 코드 어디에도 그 사실이 적혀 있지 않다.

`(pointer: coarse)` · `(any-hover)` · `(any-pointer)` · `(orientation: …)` · `(prefers-contrast)` · `(forced-colors)` · `@media print` 는 `src/` 와 `public/` 전체에서 **0 건**이다.

### 3-1. 죽은 어휘와 죽은 상수

`interactionModes = ['TAP_MODE', 'HOVER_MODE']`(`state-types.ts:15`)와 그 타입 `InteractionMode`(`:17`)는 `model/index.ts:4, 9` 로 재수출되지만 **`src/`·`tests/` 어디에서도 소비되지 않는다**. 살아 있는 어휘는 `LandingCardInteractionMode = 'hover' | 'tap'`(`landing-grid-card.tsx:48`)이다. 같은 개념에 대소문자가 다른 두 이름이 있고 하나는 쓰이지 않는다.

`MOBILE_BREAKPOINT_MAX = 767`(`behavior.ts:1`)도 `gnb/index.ts:9` 로 재수출되지만 소비자가 **0 개**다. 767 이라는 같은 수가 `layout-plan.ts:1` 에도 있고, 둘 중 살아 있는 쪽은 `layout-plan.ts` 다.

## 4. Tailwind 반응형 유틸리티 — 전수

**이름 있는 브레이크포인트: 2 종 8 인스턴스.** 저장소에 `tailwind.config.*` 파일이 없고 `package.json:38, 49` 가 `@tailwindcss/postcss` · `tailwindcss` 4.1.0 만 선언하므로 v4 기본 스케일(sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536)이 그대로 쓰인다 — 그 5 종 중 **2 종만** 등장하고 `sm:` · `lg:` · `2xl:` 은 0 건이다.

| 파일:줄 | 유틸리티 | 임계 | semantics | 제어 대상 |
|:---|:---|:---|:---:|:---|
| `gnb/site-gnb.tsx:40` | `md:flex` | ≥768 | width | 데스크톱 GNB 행 표시 |
| `gnb/site-gnb.tsx:41` | `md:hidden` | ≥768 | width | 모바일 GNB 행 숨김 |
| `landing/shell/page-shell.tsx:22` | `md:pt-[88px]` | ≥768 | width | main 상단 여백 80→88px |
| `landing/shell/page-shell.tsx:22` | `md:pb-8` | ≥768 | width | main 하단 여백 24→32px |
| `landing/grid/landing-catalog-grid.tsx:211` | `md:gap-5` `xl:gap-6` | ≥768 / ≥1280 | width | 그리드 컨테이너 gap 15→20→24px |
| `landing/grid/landing-catalog-grid.tsx:221` | `md:gap-5` `xl:gap-6` | ≥768 / ≥1280 | width | 행 gap 15→20→24px |

**임의값 브레이크포인트: 2 종 14 인스턴스. 전부 `max-[…]` 이고 `min-[…]:` 형태는 0 건이다** — `globals.css:316` 에 보이는 `min-[...]` 는 한국어 주석 안의 예시 문자열이지 유틸리티가 아니다. 즉 이 저장소의 임의값 반응형은 전부 **desktop-first 로 모바일을 덮어쓰는** 방향이며, mobile-first 로 데스크톱을 더하는 유틸리티는 이름 있는 `md:`/`xl:` 쪽에만 있다.

| 파일:줄 | 임의값 유틸리티 | 개수 | semantics | 제어 대상 |
|:---|:---|---:|:---:|:---|
| `landing/shell/consent-banner.tsx:241` | `max-[719px]:flex-wrap` · `max-[719px]:justify-start` · `max-[719px]:gap-[14px]` · `max-[719px]:p-[14px]` | 4 | width | 동의 배너 줄바꿈·정렬·간격·패딩 |
| `landing/shell/consent-banner.tsx:245` | `max-[719px]:basis-full` | 1 | width | 배너 메시지 전폭 |
| `landing/shell/consent-banner.tsx:248` | `max-[719px]:basis-full` · `max-[719px]:justify-start` | 2 | width | 배너 액션 행 |
| `test/instruction-overlay.tsx:26` | `max-[767px]:min-h-full` · `max-[767px]:w-full` · `max-[767px]:content-start` · `max-[767px]:rounded-none` · `max-[767px]:border-0` · `max-[767px]:pt-[88px]` | 6 | width | 안내 다이얼로그를 전체 화면으로 |
| `test/instruction-overlay.tsx:145` | `max-[767px]:p-0` | 1 | width | 오버레이 패딩 제거 |

`719` 는 이 저장소의 **어떤 상수·토큰·문서 값과도 대응하지 않는다** — 719/720 경계는 `layout-plan.ts` 에도 `behavior.ts` 에도 `globals.css` 에도 없다. 출처를 확인하지 못했다(§7 미확인).

`instruction-overlay.tsx:26` 의 `max-[767px]:pt-[88px]` 은 `page-shell.tsx:22` 의 **데스크톱** 값 88px 을 **모바일**에 적는다. 두 수가 같은 88 인데 한쪽은 `md:` 이상, 다른 쪽은 767 미만 조건에 걸려 있다. 오버레이는 `fixed inset-0` 이라 PageShell 밖이므로 직접 모순은 아니지만, 88 이라는 값이 두 파일에서 서로 반대 조건 아래 각각 적혀 있다.

## 5. 측정 — Tailwind 가 실제로 뱉는 쿼리

`@tailwindcss/postcss` 4.1.0 으로 컴파일한 결과(2026-09-11, probe 스크립트는 §0):

| 유틸리티 | emit 되는 쿼리 | 경계 포함 여부 |
|:---|:---|:---|
| `md:` | `@media (width >= 48rem)` | 768px **포함** |
| `xl:` | `@media (width >= 80rem)` | 1280px **포함** |
| `max-[767px]:` | `@media (width < 767px)` | 767px **제외** |
| `max-[719px]:` | `@media (width < 719px)` | 719px **제외** |

**정확히 767px 에서 두 시스템이 갈린다.** `resolveLandingViewportTier` 는 `viewportWidth <= 767` 이므로 767px 을 `'mobile'` 로 판정하고(`layout-plan.ts:64`), `max-[767px]:` 는 `width < 767` 이므로 767px 에서 **적용되지 않는다**. 즉 뷰포트 폭이 정확히 767px 일 때 `instruction-overlay.tsx` 의 다이얼로그는 전체 화면이 되지 않는데 랜딩 그리드는 모바일 1열이다. 1px 폭 창이라 실사용 빈도는 낮지만, 두 경계가 같은 수를 적고도 다르게 해석된다는 사실 자체가 0단계가 흡수해야 할 구조다. `719` 도 같은 이유로 실효 경계는 `≤718` 이다.

## 6. CSS 커스텀 프로퍼티로 티어를 표현한 사례 — 전수

**`--shell-gutter` 단 하나다.** 미디어 쿼리 안에서 재정의되는 커스텀 프로퍼티는 `src/` 전체에서 이 하나뿐이다.

| 파일:줄 | 선언 | 조건 |
|:---|:---|:---|
| `app/globals.css:323` | `--shell-gutter: 16px` | `:root` 기본 |
| `app/globals.css:326-330` | `--shell-gutter: 20px` | `@media (min-width: 768px)` |
| `app/globals.css:332-336` | `--shell-gutter: 24px` | `@media (min-width: 900px)` |

이 토큰이 존재하는 이유는 `globals.css:305-322` 주석이 직접 적고 있다 — 종전에 `page-shell.tsx` 와 `site-gnb.tsx` 가 같은 3단 규칙을 각자 다른 유틸리티 철자로 적었고, Tailwind v4 가 named breakpoint 를 arbitrary breakpoint 뒤에 emit 하는 바람에 둘 다 자기 arbitrary 규칙을 잃었으며, 실측(2026-09-11 chromium) 768px 이상 모든 폭에서 main 은 20px · GNB 는 24px 로 4px 어긋난 채 렌더됐다. 소비자는 두 곳이다 — `page-shell.tsx:22` 의 `px-[var(--shell-gutter)]` 와 `site-gnb.tsx:39` 의 `px-[var(--shell-gutter)]`. 값의 정본은 `layout-plan.ts:4-6` 의 세 상수이고 `tests/unit/shared-shell-gutter.test.ts` 가 둘을 묶는다(테스트는 실행하지 않았다 — §7).

**티어를 표현하지 **않는** 커스텀 프로퍼티**도 구분해 둔다. `--tap-min: 44px`(`globals.css:201`)은 전 폭 고정이며 미디어 분기가 없다. JS 가 인라인으로 심는 커스텀 프로퍼티 12 개(`landing-catalog-grid.tsx:231` 의 `--landing-grid-columns`, `landing-grid-card.tsx:1156-1165` 의 10 개, `use-card-inline-geometry.ts:112` 의 `--landing-card-stage-shadow-bleed-x`)는 측정값·계획값이 흘러드는 통로지 티어 선언이 아니다 — 다만 `--landing-mobile-*` 4 개(`landing-grid-card.tsx:1162-1165`)는 이름에 tier 가 박혀 있어 0단계 분리 때 이름을 다시 봐야 한다.

`--gnb-settings-trigger-size`(`site-gnb.tsx:66`)와 `--tap-min` 은 `settings-controls.tsx:114-118` 에서 **scope prop 으로 갈아끼워진다** — 데스크톱 scope 는 `--gnb-settings-trigger-size`, 모바일 scope 는 `--tap-min`. 이것은 미디어 쿼리가 아니라 prop 분기이므로 §6 의 사례가 아니지만, 티어에 따라 크기 토큰이 바뀌는 **유일한 다른 방식**이다.

## 7. 컨테이너 쿼리 — 지시된 패턴이 놓친 유일한 질적 예외

`landing-catalog-grid.module.css:26-34` 는 뷰포트가 아니라 그리드 자신의 inline-size 로 판정한다.

```css
.shell { container-type: inline-size; container-name: landing-grid; }
@container landing-grid (width < 1160px) { .container[data-measured='false'] { visibility: hidden; } }
```

같은 파일 `:1-25` 의 주석이 근거를 적고 있다 — 첫 페인트에 `window` 를 읽을 수 없어(`req-landing.md §11.1`) 중립 계획(`desktop-wide`)으로 그린 뒤 ~70ms 뒤 1열로 스냅했고, 실측 CLS 가 390×812 에서 0.13647 · 768×1024 에서 0.25045 · 1100×800 에서 0.22699 였다. 컨테이너 쿼리로 바꾼 뒤 데스크톱 LCP 는 40→52ms(9 쌍 실행). `1160` 리터럴은 `DESKTOP_WIDE_MIN_GRID_INLINE_SIZE`(`layout-plan.ts:9`)와 같은 수이고 `tests/unit/landing-grid-first-paint.test.ts` 가 둘을 묶는다.

**이 저장소에서 뷰포트가 아닌 실제 측정으로 적응하는 표면은 여기와 `landing-card-title-continuity.tsx` 둘뿐이다.** 후자(301줄)는 ResizeObserver(`:208, :236-237`)로 제목 줄 수를 재서 잘라내며 티어 분기가 하나도 없다 — 폭 대신 실측을 쓰는 패턴의 선례다.

## 8. 뷰포트 분기가 하나도 없는 표면 파일 — 전수

아래 파일들은 폭 읽기도, `matchMedia` 도, 반응형 유틸리티도, `@media`/`@container` 도 **하나도** 없다. 데스크톱에서 결정된 레이아웃이 그대로 모바일로 나간다.

### 8-1. 마크업을 렌더하는 표면 (24 개)

| 파일 | 줄 수 | 렌더하는 것 | 모바일에서 그대로 나가는 것 |
|:---|---:|:---|:---|
| `src/features/test/test-question-client.tsx` | 425 | 테스트 문항 전체(진행 바 · 문항 · 답변 그리드 · 네비 행) | `grid gap-5` 패널, `flex flex-wrap justify-between` 네비 행(`:51`), `grid gap-2` 답변 그리드(`:52`) — 전 폭 동일 |
| `src/features/landing/grid/landing-card-title-continuity.tsx` | 301 | 카드 제목 줄 수 측정·절단 | 측정 기반이라 티어 무관 (의도된 설계) |
| `src/features/gnb/components/settings-controls.tsx` | 193 | 테마·로케일 칩 12 종 | `scope` **prop** 으로만 갈린다(`:104-122`) — 뷰포트를 직접 보지 않는다 |
| `src/features/blog/blog-destination-client.tsx` | 147 | 블로그 본문 · 아티클 목록 | `max-w-[760px]`(`:29`) 고정, 목록 `grid gap-3`(`:39`) |
| `src/features/ui/button-class-names.ts` | 118 | 버튼 어휘 SSOT(404 · 동의 배너 · 테스트 표면 공용) | `min-h-[46px]`(`:60`) · quiet 만 `min-h-[var(--tap-min)]`(`:109`) |
| `src/features/test/surface-class-names.ts` | 114 | 테스트 표면 어휘 SSOT | `testChipClassName` 의 `min-h-8`(`:93`) = 32px — 전 폭 동일 |
| `src/features/test/test-result-panel.tsx` | 104 | 결과 패널 · 데이터 행 · 액션 | `flex flex-wrap gap-2` 액션 행(`:33`), 버튼 `min-w-[132px]`(`:34-35`) |
| `src/features/test/overlay-connector.tsx` | 104 | 안내/자격 오버레이 연결 | 오버레이 자체는 `instruction-overlay.tsx` 가 분기를 갖는다 |
| `src/app/global-not-found.tsx` | 62 | 루트 404 (자체 `<html>`) | `grid min-h-screen place-items-center px-4 py-6`(`:18`) |
| `src/app/[locale]/test/[variant]/page.tsx` | 63 | 테스트 라우트 → PageShell | 마크업 없음, PageShell 위임 |
| `src/app/[locale]/blog/[variant]/page.tsx` | 60 | 블로그 상세 → PageShell | 같음 |
| `src/app/[locale]/test/error/page.tsx` | 59 | 테스트 진입 실패 표면 | `max-w-[460px] px-4 py-8 text-center`(`:12`) |
| `src/app/[locale]/history/page.tsx` | 53 | 히스토리 빈 상태 | `max-w-[460px] px-4 py-10`(`:14`), 아이콘 `h-11 w-11`(`:16`) |
| `src/app/not-found.tsx` | 45 | 세그먼트 404 | `grid min-h-screen place-items-center px-4 py-6`(`:11`) |
| `src/features/gnb/components/theme-mode-icon.tsx` | 43 | 테마 아이콘 SVG | 크기는 호출자가 준다 |
| `src/features/test/result-connector.tsx` | 42 | 결과 패널 연결 | — |
| `src/app/[locale]/layout.tsx` | 39 | `<div data-locale>` 래퍼 | — |
| `src/app/[locale]/page.tsx` | 36 | 랜딩 hero | `text-[clamp(1.5rem,2.4vw,2.2rem)]`(`:29`) — **저장소 유일의 fluid type**, 분기가 아니라 연속 반응 |
| `src/features/test/qualifier-chip.tsx` | 36 | 자격 재진입 칩 | `testChipClassName` 그대로 → 32px 높이 |
| `src/features/landing/shell/telemetry-consent-banner.tsx` | 35 | 동의 배너 게이트 | 배너 본체는 `consent-banner.tsx` 가 분기를 갖는다 |
| `src/app/layout.tsx` | 34 | `<html>`/`<body>` | `APP_BODY_CLASSNAME` |
| `src/features/transition/transition-gnb-overlay.tsx` | 33 | 전이 중 GNB 복제 | `fixed inset-x-0 top-0 z-[1300]`(`:14`) |
| `src/app/[locale]/blog/page.tsx` | 29 | 블로그 목록 → PageShell | 마크업 없음 |
| `src/features/landing/grid/landing-catalog-grid-loader.tsx` | 26 | 그리드 로더 | — |

### 8-2. 마크업이 없는 파일 (참고, 5 개)

`src/features/landing/landing-runtime.tsx`(91) · `src/features/transition/transition-runtime-monitor.tsx`(34) · `src/app/vercel-speed-insights-gate.tsx`(16) · `src/app/vercel-analytics-gate.tsx`(15) · `src/i18n/locale-html-lang-sync.tsx`(15). 전부 `return null` 계열이라 분기가 없는 것이 정상이다.

### 8-3. 이 목록에서 실제로 무게가 큰 셋

**`test-question-client.tsx`(425줄) + `surface-class-names.ts`(114줄) = 테스트 플로우 전체가 반응형 규칙 0 개다.** 사전 실측이 이미 확인한 사실이며 이 census 가 독립적으로 재확인한다 — 두 파일을 지시된 grep 과 §0 의 세 추가 sweep 모두에 걸어 0 건이다. 테스트 플로우는 사용자 결정 3 의 「전 표면 동시」 대상 중 가장 큰 표면이고, 현재 모바일 대응이 **문자 그대로 존재하지 않는다**.

**`settings-controls.tsx`(193줄)는 뷰포트를 보지 않지만 티어에 따라 두 벌이 동시에 렌더된다.** `site-gnb.tsx:364` 와 `:370` 이 데스크톱 행과 모바일 행을 **둘 다 항상 DOM 에 넣고** `md:flex`/`md:hidden`(`:40-41`)이 CSS 로 하나를 숨긴다. `use-gnb-mobile-menu.ts` 에는 뷰포트 게이팅이 전혀 없다(grep 0 건) — 즉 데스크톱에서도 모바일 메뉴의 훅·이펙트·`document.body.style.touchAction` 조작(`use-gnb-mobile-menu.ts:138-145`)이 마운트된 채로 있다. 입력 방식 기준으로 생명주기를 통일하는 결정 2 를 적용할 때, GNB 는 「CSS 로 숨기기」에서 「조건부 렌더」로 바꿔야 하는지가 먼저 결정돼야 한다.

**404 두 장과 PageShell 이 `min-h-screen`(=`100vh`)을 쓴다** — `page-shell.tsx:19` · `not-found.tsx:11` · `global-not-found.tsx:18`. 같은 저장소가 `100dvh` 를 아는데도(`site-gnb.tsx:87` 의 `[height:100dvh]`, `landing-grid-card.tsx:285, 292, 296` 의 `max-h-[calc(100dvh-116px)]`) 이 세 곳만 `100vh` 다. 모바일 주소창 높이 변동에 대해 두 어휘가 한 저장소 안에 공존한다.

## 9. 미확인

- `max-[719px]:` 의 `719` 가 어디서 왔는지 확인하지 못했다. `layout-plan.ts` · `behavior.ts` · `globals.css` · `design.md` 어디에도 719/720 이 없다. `docs/req-landing.md` 의 동의 배너 조항은 읽지 않았다 — 거기 있을 수 있다.
- `tests/unit/shared-shell-gutter.test.ts` · `tests/unit/landing-grid-first-paint.test.ts` 의 **존재는 주석 인용으로만 확인**했고 파일을 열지도 실행하지도 않았다. 두 테스트가 실제로 무엇을 고정하는지는 미확인이다.
- `settings-controls.tsx` 의 `scope` prop 이 `site-gnb.tsx:339`(desktop) · `:469`(mobile) 두 곳에서만 오는지는 grep 으로 확인했으나, 두 GNB 행이 **동시에 접근성 트리에 남는지**는 확인하지 않았다 — `md:hidden` 은 `display:none` 이라 트리에서 빠질 것으로 보이나 렌더로 재지 않았다.
- `interaction-state.ts` 의 7 개 `interactionMode` 분기가 각각 어떤 사용자 행동에 대응하는지는 이벤트 타입 이름 수준에서만 읽었다. 상태 기계 전체(504줄)를 읽지는 않았다.
- `landing-grid-card.module.css` 582줄 중 `@media` 4 개 위치만 확인했고 나머지 규칙이 티어별 클래스(`.mobileExpanded` 등)로 갈리는지는 이 과제 범위 밖이라 census 하지 않았다 — 제외된 `landing-grid-card.tsx` 가 그 클래스를 붙이므로 그쪽 분석과 함께 읽어야 한다.
- `npm run lint` · `typecheck` · `test` 를 포함해 어떤 게이트도 실행하지 않았다. 읽기 전용 과제였고 저장소를 수정하지 않았다.
