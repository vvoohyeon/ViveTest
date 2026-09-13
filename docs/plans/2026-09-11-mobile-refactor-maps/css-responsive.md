# CSS 반응형 구조 지도 — ViveTest

**측정 대상:** `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (세션 전용 clone). 읽기 전용. 저장소 파일 수정 0건.
**HEAD:** `7616211` (착수 마커 — 부모가 지시한 `a5aec95` 위의 empty marker commit). 내용 커밋은 `a5aec95`와 동일하다.
**방법:** 파일 전문 읽기 + `grep` 전수 + Tailwind v4.1.0 컴파일 프로브 1회(`node_modules/tailwindcss/dist/lib.js` 의 `compile()` 을 직접 호출해 variant 가 실제로 어떤 `@media` 로 emit 되는지 확인). 프로브는 scratchpad 안에서만 돌았고 저장소에 아무것도 쓰지 않았다.
**브라우저 실측은 하지 않았다.** 아래의 모든 수치는 소스에서 읽은 값이거나 컴파일러 출력이다. 렌더 결과로만 확정되는 항목은 전부 「미확인」으로 표시했다.

---

## 0. CSS 파일 인벤토리 — src 에는 3개뿐이다

| 파일 | 줄 | 역할 |
|:---|---:|:---|
| `src/app/globals.css` | 431 | Tailwind v4 진입 + `@font-face` + 토큰 SSOT + `@layer base` 1개 규칙 |
| `src/features/landing/grid/landing-grid-card.module.css` | 582 | 랜딩 카드 스킨 토큰 + 확장/축소 모션 + 13개 `@keyframes` |
| `src/features/landing/grid/landing-catalog-grid.module.css` | 35 | 컨테이너 쿼리 1개(first-paint 게이트) |

`src/` 밖에는 `docs/design/ds/*.css` 3종(`colors_and_type.css` 871 · `catalog-components.css` 823 · `app-components.css` 659)과 `docs/design/resources/superseded/*.css` 3종이 있다. **전부 런타임 미소비다** — `docs/design/ds/` 는 설계 정의 계층이고(AGENTS.md:25, §2 Rebuild Workflow Sources), `superseded/` 는 기록이다.

**스타일의 무게중심은 CSS 파일이 아니라 TSX 안의 Tailwind 클래스 문자열이다.** `var(--…)` 참조가 17개 TS/TSX 파일에 걸쳐 **315회** 나온다. CSS 1,048줄 대 TSX 클래스 문자열 — 반응형 리팩터의 실제 작업면은 후자다.

---

## 1. globals.css 레이어 구조 — 6층

| # | 줄 | 층 | 내용 |
|---:|:---|:---|:---|
| 1 | 1 | `@import "tailwindcss"` | Tailwind v4.1.0 전체. `@layer theme, base, components, utilities` 를 이 시점에 선언한다 |
| 2 | 31–37 | `@font-face` | `Pretendard Variable`, `font-weight: 45 920`, `font-display: swap`, **preload 없음**. 주석(22–29행)이 1.96 MB 임을 적고 preload 하지 않는 이유를 명시 |
| 3 | 94–227 | **`/* @mirror-begin light */ :root { … } /* @mirror-end light */`** | 87개 선언. 설계 정의의 사본 |
| 4 | 260–324 | `:root` (product layer) | 16개 선언. VIVE 가 이름을 갖지 않은 역할만 |
| 5 | 326–336 | `@media (min-width: …)` ×2 | `--shell-gutter` 만 바꾼다 |
| 6 | 345–407 | **`/* @mirror-begin dark */ [data-theme='dark'] { … } /* @mirror-end dark */`** | 36개 선언 |
| 7 | 409–415 | `[data-theme='dark']` (product) | 2개 선언(scrim 강도 2단이 시스템 scrim 으로 붕괴) |
| 8 | 427–431 | `@layer base { a { color: var(--ink) } }` | 유일한 base 규칙 |

`@theme` · `@custom-variant` · `@utility` · `@apply` · `@source` · `@plugin` **전부 0건**(전수 grep). `@layer` 는 427행 하나뿐이다.

### @mirror 구간이 무엇이고 어디서 왔는가

**계약 정본은 `AGENTS.md:25`(§1 Runtime surface 의 Tokens/theme 행)다. 인용:**

> **런타임**: Tailwind v4 tokens/base = `src/app/globals.css`(분할 금지). 그 안의 `@mirror-begin`/`@mirror-end` 구간은 **설계 정의의 사본**이며 값을 여기서 고치지 않는다 — 설계 정의를 고치고 다시 베낀다(theme cut, 2026-09-07). Landing grid/card motion = `src/features/landing/grid/landing-grid-card.module.css`; 그 파일의 `--normal-*`/`--expanded-*` 는 이제 리터럴이 아니라 전역 토큰을 가리킨다. **설계 정의**(런타임 미소비): `docs/design/ds/colors_and_type.css`(BQ-38)

globals.css 자신의 주석이 같은 것을 더 강하게 적는다(56–60행): "SECTION 1 IS A MIRROR, NOT AN AUTHORSHIP. Every declaration in it is copied verbatim from `docs/design/ds/colors_and_type.css` … Do not edit a value here: edit it there and re-mirror."

**센티널은 globals.css 에만 있고 설계 정의 쪽에는 없다** — `grep -rn "@mirror" docs/design/ds/` 결과 0건. 즉 「어디까지가 미러인가」의 경계는 소비자(globals.css)가 혼자 들고 있고, 정본(ds)은 자기 어느 부분이 베껴지는지 표시하지 않는다. 집행은 `tests/unit/design-tokens-dark-parity.test.ts` 가 한다 — 주석을 제거하고 `--name: value` 선언 집합으로 비교한다(그 파일 51–57행: 주석 안의 `--surface-soft:` 같은 문장 때문에 정규식이 진짜 선언 12건을 삼키던 것을 2026-09-07 에 고쳤다고 적혀 있다).

**미러 비율: `docs/design/ds/colors_and_type.css` 의 `:root` 198개 중 87개만 들어온다**(측정: 두 파일의 `:root` 블록에서 주석 제거 후 선언 이름 추출). globals.css:62–70 이 그 이유를 적는다 — 런타임이 실제로 읽는 이름만 미러하고, 읽는 쪽이 없는 이름이 하나라도 들어오면 파리티 가드가 실패한다. **미러된 87개 중 ds `:root` 에 없는 이름은 0개다**(집합 차 검증).

---

## 2. 토큰 전수 census — `:root` 103개

`D` = `[data-theme='dark']` 에서 **직접** 값이 바뀜(38개). `D*` = 자신은 재선언되지 않지만 `var()` 체인이 D 를 거쳐 간접적으로 바뀜. `M` = 미디어 쿼리로 값이 바뀜.

### 2-1. 미러 light 구간 — 87개 (globals.css:95–226)

#### neutral ramp (13) — 전원 D 없음(이들이 D 의 **소스**다)
| 토큰 | 값 | 줄 |
|:---|:---|---:|
| `--warm-0` | `#ffffff` | 99 |
| `--warm-50` | `#fbfaf7` | 100 |
| `--warm-100` | `#f4f1ea` | 101 |
| `--warm-150` | `#ece8df` | 102 |
| `--warm-200` | `#e6e2d8` | 103 |
| `--warm-300` | `#d6d1c4` | 104 |
| `--warm-400` | `#b3aea1` | 105 |
| `--warm-600` | `#817a72` | 106 |
| `--warm-700` | `#504a43` | 107 |
| `--warm-800` | `#332e28` | 108 |
| `--warm-900` | `#1e1a16` | 109 |
| `--warm-950` | `#141110` | 110 |
| `--warm-975` | `#0c0a09` | 111 |

#### sage ramp (9) — 전원 D 없음
`--sage-100` `#e8f0ec` (114) · `--sage-200` `#c9dbd1` (115) · `--sage-300` `#a6c5b5` (116) · `--sage-400` `#7daa95` (117) · `--sage-500` `#5c8e78` (118) · `--sage-600` `#4b7764` (119) · `--sage-700` `#396050` (120) · `--sage-800` `#2b4a3e` (121) · `--sage-900` `#1f382e` (122)

#### 의미 계층 (36) — **전원 D**
| 토큰 | light | 줄 | dark | 줄 |
|:---|:---|---:|:---|---:|
| `--canvas` | `var(--warm-50)` | 125 | `var(--warm-950)` | 350 |
| `--surface-raised` | `var(--warm-0)` | 126 | `var(--warm-800)` | 351 |
| `--surface-sunken` | `var(--warm-100)` | 127 | `var(--warm-975)` | 352 |
| `--surface-strong` | `var(--warm-150)` | 128 | `var(--warm-700)` | 353 |
| `--fg-disabled` | `var(--warm-400)` | 131 | `var(--warm-700)` | 356 |
| `--fg-on-accent` | `#ffffff` | 132 | `var(--warm-950)` | 357 |
| `--border-strong` | `var(--warm-300)` | 135 | `var(--warm-600)` | 360 |
| `--accent` | `var(--sage-500)` | 138 | `var(--sage-400)` | 363 |
| `--accent-subtle` | `var(--sage-100)` | 139 | `var(--sage-800)` | 364 |
| `--accent-fg` | `var(--sage-700)` | 140 | `var(--sage-300)` | 365 |
| `--accent-solid` | `var(--sage-600)` | 141 | `var(--sage-400)` | 366 |
| `--accent-solid-hover` | `var(--sage-700)` | 142 | `var(--sage-300)` | 367 |
| `--accent-solid-pressed` | `var(--sage-800)` | 143 | `var(--sage-200)` | 368 |
| `--shadow-xs` | `0 1px 2px rgba(30,26,22,.04)` | 146 | `0 1px 2px rgba(5,4,3,.30)` | 371 |
| `--shadow-sm` | 2층 `rgba(30,26,22,…)` | 147 | 2층 `rgba(5,4,3,…)` | 372 |
| `--shadow-md` | `0 4px 14px rgba(30,26,22,.06)` | 148 | `0 4px 14px rgba(5,4,3,.42)` | 373 |
| `--shadow-lg` | `0 12px 32px rgba(30,26,22,.08)` | 149 | `0 12px 32px rgba(5,4,3,.50)` | 374 |
| `--shadow-xl` | `0 24px 64px rgba(30,26,22,.18)` | 150 | `0 24px 64px rgba(5,4,3,.62)` | 375 |
| `--canvas-elevated` | `var(--warm-0)` | 153 | `var(--warm-900)` | 378 |
| `--surface-soft` | `var(--warm-100)` | 154 | `var(--warm-975)` | 379 |
| `--surface-muted` | `var(--warm-150)` | 155 | `var(--warm-800)` | 380 |
| `--ink` | `var(--warm-900)` | 158 | `var(--warm-50)` | 383 |
| `--ink-soft` | `var(--warm-800)` | 159 | `var(--warm-150)` | 384 |
| `--ink-body` | `var(--warm-700)` | 160 | `var(--warm-200)` | 385 |
| `--muted` | `var(--warm-600)` | 161 | `var(--warm-400)` | 386 |
| `--muted-aa` | `#756d66` | 162 | `var(--warm-400)` | 387 |
| `--hairline` | `var(--warm-200)` | 165 | `var(--warm-700)` | 390 |
| `--hairline-strong` | `var(--warm-300)` | 166 | `var(--warm-600)` | 391 |
| `--sage-muted` | `var(--sage-100)` | 169 | `var(--sage-900)` | 394 |
| `--tag-bg` | `var(--warm-150)` | 172 | `var(--warm-800)` | 397 |
| `--tag-fg` | `var(--warm-700)` | 173 | `var(--warm-300)` | 398 |
| `--tag-bg-unavailable` | `var(--warm-200)` | 174 | `var(--warm-700)` | 399 |
| `--blog-read-more-ink` | `#716b64` | 175 | `var(--warm-300)` | 400 |
| `--focus-ring` | `var(--sage-500)` | 178 | `var(--sage-400)` | 403 |
| `--focus-ring-soft` | `rgba(92,142,120,.22)` | 179 | `rgba(125,170,149,.28)` | 404 |
| `--overlay-scrim` | `rgba(30,26,22,.48)` | 180 | `rgba(5,4,3,.72)` | 405 |

#### elevation roles (4) — **D\***, 자신은 재선언 없음
`--shadow-rest` = `var(--shadow-xs)` (183) · `--shadow-blog-hover` = `0 4px 14px var(--focus-ring-soft)` (184) · `--shadow-expanded` = `var(--shadow-lg), 0 0 0 1px var(--hairline-strong)` (185) · `--shadow-overlay` = `var(--shadow-xl)` (186). 넷 다 D 토큰을 참조하므로 테마를 따라간다.

#### radius (4) — D 없음, M 없음
`--radius-xs` `5px` (189) · `--radius-md` `12px` (190) · `--radius-lg` `16px` (191) · `--radius-xl` `24px` (192)

#### motion (4) — **D 없음, M 없음**
`--ease-standard` `cubic-bezier(0.2, 0, 0, 1)` (195) · `--ease-in-out` `cubic-bezier(0.45, 0, 0.2, 1)` (196) · `--dur-fast` `140ms` (197) · `--dur-slow` `280ms` (198)

#### layout metrics (2) — **D 없음, M 없음**
`--tap-min` `44px` (201) · `--tag-min-width` `56px` (202)

#### type roles (14 + family 1) — **D 없음, M 없음**
`--h1` `700 30px/1.2` (205) · `--h3` `600 20px/1.3` (206) · `--body` `400 16px/1.6` (207) · `--body-sm` `400 14px/1.55` (208) · `--label` `500 14px/1.4` (209) · `--caption` `400 13px/1.45` (210) · `--overline` `600 12px/1.4` (211) · `--button` `600 15px/1` (212) · `--track-tight` `-0.01em` (215) · `--track-over` `0.08em` (216) · `--t-card-title` `600 20px/1.3` (219) · `--t-card-subtitle` `400 15px/1.45` (220) · `--t-expanded-question` `600 21px/1.3` (221) · `--t-choice` `400 15px/1.45` (222) · `--font-sans` (225, 19-family 스택)

### 2-2. product layer — 16개 (globals.css:260–324)

| 토큰 | 값 | 줄 | D | M |
|:---|:---|---:|:---:|:---:|
| `--gnb-surface` | `color-mix(in srgb, var(--canvas) 88%, transparent)` | 266 | D* | |
| `--overlay-scrim-medium` | `var(--overlay-scrim)` | 285 | D (409–415에서 동일값 재선언) | |
| `--overlay-scrim-strong` | `color-mix(in srgb, var(--warm-900) 60%, transparent)` | 286 | **D** → `var(--overlay-scrim)` (414) | |
| `--theme-preview-light-bg` | `#ffffff` | 293 | 의도적 비-테마 | |
| `--theme-preview-light-border` | `#d6d1c4` | 294 | 〃 | |
| `--theme-preview-light-ink` | `#1e1a16` | 295 | 〃 | |
| `--theme-preview-light-hover-bg` | `#f4f1ea` | 296 | 〃 | |
| `--theme-preview-light-hover-border` | `#b3aea1` | 297 | 〃 | |
| `--theme-preview-light-hover-shadow` | `0 1px 3px rgb(30 26 22 / 6%), 0 1px 2px rgb(30 26 22 / 4%)` | 298 | 〃 | |
| `--theme-preview-dark-bg` | `#1e1a16` | 299 | 〃 | |
| `--theme-preview-dark-border` | `#504a43` | 300 | 〃 | |
| `--theme-preview-dark-ink` | `#fbfaf7` | 301 | 〃 | |
| `--theme-preview-dark-hover-bg` | `#332e28` | 302 | 〃 | |
| `--theme-preview-dark-hover-border` | `#817a72` | 303 | 〃 | |
| `--theme-preview-dark-hover-shadow` | `0 1px 3px rgb(5 4 3 / 36%), 0 1px 2px rgb(5 4 3 / 28%)` | 304 | 〃 | |
| **`--shell-gutter`** | `16px` | 323 | | **M: 768→`20px`(328) · 900→`24px`(334)** |

### 2-3. 결론 — 미디어 쿼리로 값이 바뀌는 토큰은 `--shell-gutter` **단 1개**다

103개 중 1개(0.97%). `--tap-min` · `--radius-*` · 타입 역할 14개 · 모션 4개 **어느 것도 뷰포트에 반응하지 않는다.** 모바일 전면 리팩터가 「폰에서 타이포/여백/터치 타깃을 다르게」 하려면 토큰 계층에 뷰포트 축이 **현재 존재하지 않는다** — 새로 만들어야 하고, 그 자리는 미러 구간 밖(product layer)이거나 설계 정의 쪽이다(미러 구간에 직접 쓰면 파리티 가드가 실패한다).

`--shell-gutter` 의 값 정본은 CSS 가 아니라 `src/features/landing/grid/layout-plan.ts:4–7` 의 세 상수(`MOBILE_SIDE_PADDING=16` · `NARROW_TABLET_SIDE_PADDING=20` · `TABLET_DESKTOP_SIDE_PADDING=24`)이고, 경계는 같은 파일의 `MOBILE_MAX_VIEWPORT_WIDTH=767`(1행)·`NARROW_PADDING_MAX_VIEWPORT_WIDTH=899`(7행)다. `tests/unit/shared-shell-gutter.test.ts` 가 CSS 와 상수의 일치를 검사한다(globals.css:306–322 주석).

### 2-4. 런타임이 지역 선언하는 커스텀 프로퍼티 — 23 + 11개

`:root` 밖에서 Tailwind arbitrary-property 유틸리티(`[--x:v]`)로 선언되는 것 **23개**:
`--landing-card-radius` · `--landing-card-stage-shadow-bleed-x` / `-top` / `-bottom` · `--landing-card-origin-y` · `--landing-card-shell-scale` · `--landing-card-shell-inline-scale` · `--landing-card-shell-extra-start` / `-end` · `--landing-card-motion-ms` (전부 `landing-grid-card.tsx:199–213`) · `--gnb-chip-bg` / `-border` / `-ink` / `-hover-bg` / `-hover-border` / `-hover-shadow` (`settings-controls.tsx:29,32,34`) · `--gnb-settings-trigger-size` / `-icon-size` · `--gnb-settings-panel-base-width` / `-extra-top` / `-extra-right` / `-inner-left` / `-inner-bottom` (`site-gnb.tsx:66`).

인라인 `style` 객체로 선언되는 것 **11개**(`landing-grid-card.tsx:1156–1166`, `landing-catalog-grid.tsx:232`):
`--landing-card-base-gap` · `--landing-card-comp-gap` · `--landing-card-shell-scale` · `--landing-card-shell-inline-scale` · `--landing-card-motion-ms` · `--landing-card-origin-x` · `--landing-mobile-anchor-top` · `--landing-mobile-card-left` · `--landing-mobile-card-width` · `--landing-mobile-card-height` · `--landing-grid-columns`.

**`--landing-card-shell-scale` · `--landing-card-shell-inline-scale` · `--landing-card-motion-ms` 셋은 세 층에서 동시에 선언된다** — Tailwind 유틸리티(`landing-grid-card.tsx:213`), CSS 모듈의 reduced-motion 미디어 블록(`landing-grid-card.module.css:576–581`), 인라인 style(`landing-grid-card.tsx:1158–1160`). 우선순위는 inline > CSS module(unlayered) > Tailwind utility(`@layer utilities`)이므로 **인라인이 항상 이긴다.** §6 에서 결과를 다룬다.

---

## 3. @media 전수

### 3-1. CSS 파일에 직접 쓰인 것 — 6개

| # | 파일:줄 | 조건 | 바뀌는 것 |
|---:|:---|:---|:---|
| 1 | `globals.css:326` | `(min-width: 768px)` | `:root { --shell-gutter: 20px }` |
| 2 | `globals.css:332` | `(min-width: 900px)` | `:root { --shell-gutter: 24px }` |
| 3 | `landing-grid-card.module.css:92` | **`(hover: hover) and (pointer: fine)`** | `.root.blogCard:hover` → `border-color: var(--blog-hover-border)` · `box-shadow: var(--blog-hover-shadow)` |
| 4 | `landing-grid-card.module.css:99` | `(prefers-reduced-motion: reduce)` | `.root.blogCard { transition: none }` |
| 5 | `landing-grid-card.module.css:202` | `(prefers-reduced-motion: reduce)` | `.blogReadMoreHover` 3-selector 의 `transition-delay: 0s, 0s` |
| 6 | `landing-grid-card.module.css:576` | `(prefers-reduced-motion: reduce)` | `.root { --landing-card-shell-scale:1; --landing-card-shell-inline-scale:1; --landing-card-motion-ms:180ms }` |

**뷰포트 미디어 쿼리는 CSS 파일 전체에 2개뿐이고 둘 다 같은 토큰 하나만 건드린다.**

### 3-2. Tailwind variant 로 emit 되는 것 — 4종

컴파일 프로브로 확인한 v4.1.0 실제 출력:

| variant | 실제 emit | src 출현 |
|:---|:---|:---|
| `md:` | `@media (width >= 48rem)` | **6회** — `site-gnb.tsx:40,41` · `page-shell.tsx:22`(×2) · `landing-catalog-grid.tsx:211,221` |
| `xl:` | `@media (width >= 80rem)` | **2회** — `landing-catalog-grid.tsx:211,221` |
| `max-[719px]:` | `@media (width < 719px)` | **7회** — `consent-banner.tsx:241`(×4), `:245`(×1), `:248`(×2) |
| `max-[767px]:` | `@media (width < 767px)` | **7회** — `instruction-overlay.tsx:26`(×6), `:145`(×1) |
| `hover:` | `&:hover { @media (hover: hover) { … } }` | **32회** + `group-hover:` 1회 + `group-hover/answerChoice:` 1회 |
| `motion-reduce:` | `@media (prefers-reduced-motion: reduce)` | **12회** (§5) |
| `dark:` | `@media (prefers-color-scheme: dark)` | **0회** (§7 — 이것이 중요하다) |

`sm:` `lg:` `2xl:` `max-sm:` `max-md:` `max-lg:` `max-xl:` `min-[…]:` **전부 0건.** `test-result-panel.tsx:59,62` 의 `.md:` 2건은 문서 경로 문자열이지 variant 가 아니다.

무엇이 바뀌는지:
- `site-gnb.tsx:40` `gnb-desktop … hidden h-16 md:flex` / `:41` `gnb-mobile … flex h-14 md:hidden` — **GNB 의 데스크톱/모바일 전환은 이 한 쌍이 전부다.** 두 개의 별개 DOM 트리를 CSS 로 토글한다. 바 높이 64px ↔ 56px.
- `page-shell.tsx:22` `pt-20 pb-6 md:pt-[88px] md:pb-8` — main 상하 패딩 80/24 ↔ 88/32.
- `landing-catalog-grid.tsx:211,221` `gap-[15px] md:gap-5 xl:gap-6` — 그리드 gap 15 ↔ 20 ↔ 24px.
- `instruction-overlay.tsx:26` `max-[767px]:min-h-full max-[767px]:w-full max-[767px]:content-start max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:pt-[88px]` + `:145` `p-6 max-[767px]:p-0` — **제품에서 유일한 「모바일 전면(full-bleed) 다이얼로그」 패턴이다.**
- `consent-banner.tsx:241,245,248` `max-[719px]:flex-wrap / justify-start / gap-[14px] / p-[14px] / basis-full / justify-start` — 720px 미만에서 배너가 세로 스택으로 접힌다.

### 3-3. JS `matchMedia` — 6곳, 3종

| 파일:줄 | 쿼리 | 소비처 |
|:---|:---|:---|
| `use-landing-interaction-controller.ts:207` | `(hover: hover) and (pointer: fine)` | `hoverCapability` → 랜딩 상호작용 계층 선택 |
| `use-gnb-capability.ts:17` | `(hover: hover) and (pointer: fine)` | `hoverCapable` |
| `use-landing-interaction-controller.ts:226` | `(prefers-reduced-motion: reduce)` | `REDUCED_MOTION_ENABLE/DISABLE` 디스패치 |
| `theme-transition.ts:41` | `(prefers-reduced-motion: reduce)` | View Transition 스킵 판정 |
| `use-theme-preference.ts:31, 99` | `(prefers-color-scheme: dark)` | 테마 초기값 + 시스템 변경 구독 |
| `public/theme-bootstrap.js:18` | `(prefers-color-scheme: dark)` | pre-hydration `data-theme` 결정 |

**뷰포트 폭은 `matchMedia` 가 아니라 `window.innerWidth` 로 잰다** — `use-gnb-capability.ts:20`, `landing-catalog-grid.tsx:125`. 티어 판정은 `layout-plan.ts:63–73` 의 `resolveLandingViewportTier` 이고 순수 함수다: `<=767 → mobile`, `<=1023 → tablet`, else `desktop`. `isMobileViewport = viewportTier === 'mobile'` (`landing-grid-card.tsx:970`, `use-landing-interaction-controller.ts:157`).

### 3-4. hover/pointer 미디어 쿼리 — 쓰이지만 **두 가지 철자로 갈린다**

- 저장소가 직접 쓴 것: **`(hover: hover) and (pointer: fine)`** — CSS 1곳(`landing-grid-card.module.css:92`) + JS 2곳(위 표).
- Tailwind `hover:` 가 emit 하는 것: **`(hover: hover)` 만**. `pointer` 조건이 없다.

**결함:** `hover: hover` 이면서 `pointer: coarse` 인 기기(스타일러스 기기, 일부 하이브리드, TV 브라우저)에서 Tailwind `hover:` 33개는 발동하고 저장소 자신의 게이트 3곳은 발동하지 않는다. 두 판정이 갈리는 기기 집합이 비어 있지 않다. **근거 종류: 컴파일러 출력 대 소스 문자열 대조. 실기기 확인은 미확인.** 사용자 결정 2(「hover 없는 기기는 768px 이상에서도 터치용 생명주기」)를 구현할 때 이 두 철자를 하나로 합치지 않으면 같은 갈림이 새 코드에 그대로 재생산된다.

---

## 4. 브레이크포인트 좌표계 — 하나의 경계가 **네 가지 철자**로 존재한다

| 개념 | 철자 | 실제 경계 | 위치 |
|:---|:---|:---|:---|
| 모바일/태블릿 | `viewportWidth <= 767` (JS, `innerWidth`) | 767 **포함** → mobile | `layout-plan.ts:1,64` |
| 〃 | `@media (width < 767px)` (Tailwind `max-[767px]:`) | 767 **제외** | `instruction-overlay.tsx:26,145` |
| 〃 | `@media (width >= 48rem)` (Tailwind `md:`) | 768px @16px 루트 | `site-gnb.tsx:40,41` · `page-shell.tsx:22` · `landing-catalog-grid.tsx:211,221` |
| 〃 | `@media (min-width: 768px)` (손으로 쓴 CSS) | 768px 고정 | `globals.css:326` |

**측정된 off-by-one:** 뷰포트 폭이 정확히 **767px** 일 때 — JS 는 `mobile` 티어라고 말하고, `max-[767px]:` 유틸리티는 발동하지 않으며(`width < 767` 이 거짓), `md:` 도 발동하지 않는다(`767 < 768`). 즉 instruction overlay 가 그 한 폭에서 모바일 full-bleed 를 잃고 데스크톱 중앙 카드로 그려진다. 같은 부류가 consent banner 의 `max-[719px]:` 에도 있다(719px 에서 스택 해제). **근거 종류: Tailwind v4.1.0 컴파일 출력(`@media (width < 719px)` / `(width < 767px)`) + 소스 상수. 브라우저 렌더 확인은 미확인.**

**단위 혼재:** `md:` 만 `rem` 이고 나머지 셋은 `px` 다. 사용자가 브라우저 기본 글꼴을 키우면(WCAG 1.4.4 200% 확대의 통상 경로) `md:` 경계만 움직이고 `--shell-gutter` 의 768px 과 `max-[767px]:` 는 제자리다 — GNB 가 모바일 바로 접히는데 gutter 는 데스크톱 값을 쓰는 상태가 생긴다. **근거: CSS 단위 정의. 실측 미확인.**

**그 밖의 수평 좌표:** `CONTAINER_MAX_WIDTH = 1280`(`layout-plan.ts:3`)이 `max-w-[1280px]` 리터럴로 `page-shell.tsx:22`·`site-gnb.tsx:39` 에 두 번 손으로 적혀 있고, `xl:`(=80rem=1280px)이 우연히 같은 수다. `DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE = 1040` · `DESKTOP_WIDE_MIN_GRID_INLINE_SIZE = 1160`(`layout-plan.ts:8,9`)은 **뷰포트가 아니라 그리드 inline-size** 기준이고 CSS 미디어 쿼리로는 표현되지 않는다(§8).

---

## 5. 모션 선언 전수 — 토큰 4개, 리터럴 25개 이상

### 5-1. 토큰

`--ease-standard` `cubic-bezier(0.2, 0, 0, 1)` (globals.css:195) · `--ease-in-out` `cubic-bezier(0.45, 0, 0.2, 1)` (196) · `--dur-fast` `140ms` (197) · `--dur-slow` `280ms` (198).

**소비처는 5곳뿐이다**(전수 grep):
- `button-class-names.ts:39` `skinTransitionClassName` = `[transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-standard)] motion-reduce:transition-none`
- `landing-grid-card.module.css:193` `transition-delay: 0s, var(--dur-fast)`
- `test-question-client.tsx:67` `[transition-duration:var(--dur-slow)] [transition-timing-function:var(--ease-in-out)]`
- `blog-destination-client.tsx:43` `[transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-standard)]`
- (선언 자체 2줄)

### 5-2. 리터럴 duration — 파일:줄 전수

| 값 | 위치 |
|:---|:---|
| `140ms` | `settings-controls.tsx:29` · `site-gnb.tsx:50, 64, 101` · `landing-grid-card.tsx:235, 239, 509` · `landing-grid-card.module.css:88, 89, 176` · `button-class-names.ts:92`(주석) |
| `180ms` | `site-gnb.tsx:38, 82, 87`(×3) · `landing-catalog-grid.tsx:31` · `landing-grid-card.module.css:580` |
| `280ms` | `landing-grid-card.tsx:213`(`[--landing-card-motion-ms:280ms]`) · `consent-banner.tsx:183` |
| `120ms` | `landing-grid-card.module.css:311` (`normal-slot-exit`) |
| stagger `20 / 40 / 80 / 100 / 140 / 160ms` | `landing-grid-card.module.css:290, 295, 300, 316, 321, 327, 345, 350, 355` |

`140ms` 는 `--dur-fast` 와 같은 값이고 `280ms` 는 `--dur-slow` 와 같은 값이다. **토큰이 있는데 11곳이 리터럴로 다시 적혀 있다.** `180ms` 는 어떤 토큰에도 대응이 없다 — GNB 전체(shell / backdrop / drawer)와 랜딩 백드롭, 그리고 reduced-motion 단축값이 이 수를 쓴다.

### 5-3. 리터럴 easing

| 값 | 위치 |
|:---|:---|
| `cubic-bezier(0.45, 0, 0.2, 1)` | `globals.css:196` (`--ease-in-out`) **와** `landing-grid-card.module.css:41` (`--landing-card-motion-ease`) — **바이트 동일한 값이 두 곳에 독립 선언** |
| `ease` (키워드) | `settings-controls.tsx:29` · `site-gnb.tsx:38, 50, 64, 82, 87, 101` · `landing-catalog-grid.tsx:31` · `landing-grid-card.tsx:235, 239` · `landing-grid-card.module.css:88, 89` |
| `ease-out` | `landing-grid-card.tsx:509` |

`--landing-card-motion-ease` (module.css:41) 의 주석은 M-01(BQ-38) 결정을 적으며 `req-landing.md §8.3` 이 ease-in-out 을 요구한다고 쓴다. 그런데 **전역 `--ease-in-out` 을 가리키지 않고 값을 다시 적는다.** AGENTS.md:25 는 이 파일의 `--normal-*`/`--expanded-*` 가 "리터럴이 아니라 전역 토큰을 가리킨다"고 하는데, `--landing-card-motion-ease` 는 그 두 접두사 어디에도 속하지 않아 계약 문장이 닿지 않는 자리에 있다. **근거: 두 값의 문자열 비교(동일) + AGENTS.md:25 의 적용 범위.**

### 5-4. `@keyframes` — 13개, 전부 `landing-grid-card.module.css`

`landing-card-shell-expand`(421) · `landing-card-shell-frame-expand`(431) · `landing-card-shell-collapse`(443) · `landing-card-shell-frame-collapse`(453) · `landing-card-detail-rise`(465) · `landing-card-shell-reduced-open`(475) · `landing-card-shell-reduced-close`(485) · `landing-card-normal-slot-exit`(495) · `landing-card-normal-slot-enter`(505) · `landing-card-detail-quiet-exit`(515) · `landing-card-mobile-open-shell`(527) · `landing-card-mobile-close-shell`(541) · `landing-card-mobile-close-surface`(555).

**`left` 와 `width` 를 애니메이션한다**(`shell-frame-expand/collapse` 431–463, `mobile-open/close-shell` 527–553). 둘 다 레이아웃 속성이라 매 프레임 리플로를 일으킨다. `will-change-[left,width]` 가 `landing-grid-card.tsx:270` 에 붙어 있지만 `will-change` 는 레이아웃 비용을 없애지 못한다. 모바일 열기/닫기 전이가 이 경로를 탄다. **근거: CSS 속성 분류(left/width = layout-triggering). 실제 프레임 비용은 미확인 — 측정하려면 브라우저 프로파일이 필요하다.**

---

## 6. `prefers-reduced-motion` — 있는 곳 15군데, 없는 곳 4군데

### 6-1. CSS 미디어 블록 3개 (전부 `landing-grid-card.module.css`)
99–103 `.root.blogCard { transition: none }` · 202–208 `.blogReadMoreHover` 지연 제거 · 576–581 `.root` 의 스케일/듀레이션 토큰 축소.

### 6-2. Tailwind `motion-reduce:` 12회
`button-class-names.ts:39`(`transition-none`, `buttonBaseClassName`·`buttonFormBaseClassName`·`linkButtonPrimaryClassName` 셋이 이걸 합성) · `:97`(`motion-reduce:hover:translate-y-0`) · `site-gnb.tsx:38, 50, 87`(×2), `101` · `landing-grid-card.tsx:235, 239, 509` · `test-question-client.tsx:67` · `blog-destination-client.tsx:43`.

### 6-3. JS 경로 2개
`use-landing-interaction-controller.ts:222–246` 이 `matchMedia` 를 구독해 리듀서에 디스패치하고, 그 결과가 `landing-grid-card.tsx:998–1000` 의 `resolvedShellScale = reducedMotion ? 1 : 1.04` · `resolvedMotionDurationMs = reducedMotion ? 180 : 280` 을 정한다. `theme-transition.ts:36–41` 은 View Transition 자체를 건너뛴다.

### 6-4. **빠진 곳 4개 — 전수**

| 파일:줄 | 선언 | 무엇 |
|:---|:---|:---|
| `site-gnb.tsx:64` | `[transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color] [transition-timing-function:ease]` | `gnbInteractiveButtonBaseClassName` — **뒤로가기·햄버거·설정 트리거 pill 전부** |
| `site-gnb.tsx:82` | `[transition:opacity_180ms_ease]` | `gnbMobileBackdropClassName` — 드로어 스크림 |
| `settings-controls.tsx:29` | `[transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color] [transition-timing-function:ease]` | `chipBaseClassName` — **12개 로케일 칩 + 테마 칩 전부** |
| `landing-catalog-grid.tsx:31` | `[transition:opacity_180ms_ease]` | `LANDING_GRID_MOBILE_BACKDROP_CLASSNAME` — 모바일 카드 스크림 |

넷 다 클래스 문자열 전문을 읽어 확인했다(합성되는 `focusRingClassName` 에는 `motion-reduce:` 가 없다 — `button-class-names.ts:34–35`). **근거 종류: 소스 전수 대조.** 색/불투명도 140–180ms 이므로 WCAG 2.3.3(AAA, Animation from Interactions)의 전형적 대상은 아니지만, 저장소가 같은 부류 12곳을 가드하고 이 4곳만 빼놓은 것은 일관성 결함이다.

### 6-5. **구조적 함정 — reduced-motion CSS 블록이 인라인 style 에 진다**

`landing-grid-card.module.css:576–581` 은 `.root` 에 `--landing-card-shell-scale:1` · `--landing-card-motion-ms:180ms` 를 쓴다. 같은 세 변수를 `landing-grid-card.tsx:1158–1160` 이 **인라인 `style` 객체로** 항상 쓴다(조건 없이 매 렌더). 인라인 선언은 어떤 스타일시트 규칙보다 우선하므로 **이 미디어 블록은 JS 가 도는 한 결코 이기지 못한다.** 지금 렌더가 맞는 이유는 JS 가 같은 값을 따로 계산하기 때문이지(998–1000행) 이 CSS 때문이 아니다. 그 파일 565–575행의 한국어 주석은 이 블록이 "토큰 셋만 줄이고" 실제 규율은 `.root.reducedMotion …` 규칙들이 갖는다고 적지만, **인라인에 진다는 사실은 적지 않는다.** 즉 JS 의 `reducedMotion` 플래그와 CSS 미디어 쿼리가 어긋나는 순간(하이드레이션 이전, 또는 JS 실패)에만 CSS 가 발동하고, 그 창에서 `--landing-card-radius` 등 Tailwind 유틸리티로 선언된 값들과 섞인다. **근거: CSS 캐스케이드 우선순위 규칙 + 세 선언 지점의 소스. 실제 프레임 관찰은 미확인.**

### 6-6. 설계 정의에는 있고 런타임에는 없는 reduced-motion 토큰

`docs/design/ds/colors_and_type.css:867–870` 이 `@media (prefers-reduced-motion: reduce) { :root { --dur-slow: var(--dur-reduced) } }` 를 갖는다. **`--dur-reduced` 는 `src/` 어디에도 없고**(전수 grep 0건) globals.css 는 이 미디어 블록 자체를 미러하지 않는다. 결과: 런타임의 `--dur-slow` 는 reduced-motion 에서도 280ms 그대로다. 유일한 소비자인 `test-question-client.tsx:67` 이 `motion-reduce:transition-none` 을 따로 달고 있어 렌더는 맞지만, **토큰 계층의 reduced-motion 축은 런타임에 존재하지 않는다.**

---

## 7. 다크 모드 — `data-attribute` 단일 방식

**구현 방식:** `[data-theme='dark']` 속성 선택자. `class` 도 `@media (prefers-color-scheme: dark)` 도 쓰지 않는다.

- `src/app/layout.tsx:23` 이 SSR 에서 `<html data-theme="light" …>` 를 낸다(하드코딩된 기본값, `suppressHydrationWarning` 동반).
- `src/app/layout.tsx:25` 가 `<Script src="/theme-bootstrap.js" strategy="beforeInteractive" />` 로 부트스트랩을 실었다.
- `public/theme-bootstrap.js` 20줄: `localStorage['vivetest-theme']` 이 `'light'|'dark'` 면 그대로(8–12행), 아니면 `matchMedia('(prefers-color-scheme: dark)')` 로 결정해 `root.dataset.theme` 에 찍는다(17–19행). storage 실패는 삼키고 시스템 선호로 폴백한다(13–15행).
- 런타임 구독은 `use-theme-preference.ts:31, 99`, 전환 애니메이션은 `theme-transition.ts`(View Transitions API, reduced-motion 시 스킵).
- `globals.css:346–406`(미러) + `409–415`(product) 두 블록이 값을 뒤집는다. **카드 모듈에는 `[data-theme]` 분기가 하나도 없다** — `landing-grid-card.module.css:11–17` 주석이 그것이 wave-16 이전에는 결함이었고(리터럴 22개가 다크에 반응하지 않았다) 이제는 의미 계층을 가리켜 분기 없이 상속한다고 적는다.

### 7-1. 확인된 구조적 공백 3개

**(a) `@media (prefers-color-scheme: dark)` 분기가 런타임에 미러되지 않았다.** 설계 정의 `docs/design/ds/colors_and_type.css` 는 다크를 **두 선택자**로 갖는다 — `[data-theme='dark']`(530행)와 `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }`(658행). 파리티 테스트의 머리말(`tests/unit/design-tokens-dark-parity.test.ts:1–7`)이 그 이유를 적는다: 앞의 것은 제품용, 뒤의 것은 "그 부트스트랩 없이 이 파일을 렌더하는 쪽". **`src/app/globals.css` 는 앞의 것만 갖는다**(346행 하나, 전수 grep 으로 `prefers-color-scheme` 0건). 따라서 **런타임의 다크 테마는 `theme-bootstrap.js` 가 실행되는 것에 100% 의존한다.** JS 차단·스크립트 실패 시 시스템 다크 사용자도 라이트로 렌더된다.

**(b) `color-scheme` 이 라이트 선택과 어긋난다.** `globals.css:96` 이 `:root { color-scheme: light dark }`, `:347` 이 `[data-theme='dark'] { color-scheme: dark }`. **`[data-theme='light']` 규칙은 존재하지 않는다**(전수 grep). 그러므로 시스템이 다크인 사용자가 명시적으로 라이트를 고르면 팔레트는 라이트인데 `color-scheme` 은 `light dark` 로 남아 UA 가 시스템 선호(다크)를 채택한다 — 스크롤바·폼 컨트롤·기본 캔버스가 다크로 그려진다. `<body>` 에는 `bg-[var(--canvas)]`(`app-body-class.ts:19`)가 있어 본문 바닥은 가려지지만 스크롤바와 UA 위젯은 가려지지 않는다. **근거: CSS Color Adjust `color-scheme` 의 used-value 규칙 + 소스에 `[data-theme='light']` 블록이 없다는 전수 확인. 실제 스크롤바 렌더는 미확인 — 브라우저에서 확인해야 확정된다.**

**(c) Tailwind `dark:` variant 는 이 시스템과 통하지 않는다.** 프로브 확인: v4.1.0 기본 `dark:` → `@media (prefers-color-scheme: dark)`. 제품의 테마는 `data-theme` 속성이므로 **`dark:` 유틸리티를 쓰는 순간 토글과 어긋난다.** 현재 사용 0건이고(`dark:` grep 3건은 전부 TS 속성명·주석·번역 키), `@custom-variant` 도 정의되어 있지 않다. 즉 **안전장치 없이 비어 있는 함정**이다 — 리팩터에서 누가 `dark:bg-…` 를 한 줄 쓰면 조용히 틀린다.

---

## 8. 컨테이너 쿼리 — 1개. 그리고 쓸 자리 4곳

**쓰인 곳은 `src/features/landing/grid/landing-catalog-grid.module.css` 하나다.**

```
.shell { container-type: inline-size; container-name: landing-grid; }        /* 26-29 */
@container landing-grid (width < 1160px) { .container[data-measured='false'] { visibility: hidden } }  /* 31-34 */
```

용도는 스타일링이 아니라 **first-paint CLS 게이트**다. 1–25행 주석이 실측을 적는다: 변경 전 CLS 0.13647@390×812 · 0.25045@768×1024 · 0.22699@1100×800, 비용은 desktop LCP 40→52ms(9 paired runs). `1160` 리터럴은 `DESKTOP_WIDE_MIN_GRID_INLINE_SIZE`(`layout-plan.ts:9`)와 짝이며 `tests/unit/landing-grid-first-paint.test.ts` 가 둘을 고정한다(컨테이너 쿼리는 토큰을 읽을 수 없다고 24–25행이 적는다).

**`cqw` / `cqi` / `cqh` / `cqmin` / `cqmax` 단위는 전수 0건.** 컨테이너 쿼리 *길이 단위*는 아직 한 번도 쓰이지 않았다.

### 모바일 리팩터에서 컨테이너 쿼리가 유효할 자리 — 근거와 함께

1. **랜딩 카드 내부 (`landing-grid-card.module.css` 전체).** 카드는 1/2/3/4 열에 따라 실제 폭이 달라진다 — 이미 실측된 카드 크기가 `358×255`(390px 뷰포트, 1열) · `354×276`(768px, 2열) · `478×322`(1024px) · `395×291`(1440px)로, **뷰포트가 넓어질 때 카드가 좁아지는 구간이 있다**(1024→1440 에서 478→395). 뷰포트 미디어 쿼리로는 이 비단조성을 표현할 수 없고 컨테이너 쿼리로는 정확히 표현된다. 카드 본문(제목 clamp, 태그 행, 썸네일 비율)은 전부 카드 폭의 함수다.
2. **태그 행 (`landing-grid-card.module.css:138–168`).** 현재는 JS 측정(`.tagMeasurementProbe` — `position:absolute; visibility:hidden; contain:layout paint style`)으로 몇 개가 들어가는지 재고 `--tag-min-width` 로 폭을 잡는다. 이것은 컨테이너 쿼리가 해결하도록 설계된 문제의 JS 구현이다 — 측정 프로브와 그것을 읽는 `use-card-inline-geometry.ts` 가 통째로 사라질 여지가 있다. **다만 태그 개수 결정이 CSS 만으로 가능한지는 미확인** — `flex-wrap` 이 아니라 「N개까지만 보이고 나머지는 잘린다」 규칙이면 CSS 단독으로는 안 될 수 있다.
3. **GNB 내부 (`site-gnb.tsx:39–41`).** 현재 두 DOM 트리를 `md:hidden`/`md:flex` 로 토글한다. GNB 자신은 항상 뷰포트 폭이므로 컨테이너 쿼리 이득이 크지 않다 — **여기는 유효 자리가 아니다.** 다만 `gnb-settings-panel`(`site-gnb.tsx:75`)이 `min(324px, 100vw - 24px)` 로 뷰포트를 직접 읽는 것은 패널 부모 기준으로 바꿀 여지가 있다.
4. **테스트 표면 (`test-question-client.tsx` 425줄 + `surface-class-names.ts` 114줄).** 이 둘에 뷰포트 분기가 **0개**라는 것은 이미 실측돼 있다. 모바일 대응을 새로 넣을 때, 이 표면은 `page-shell-main`(`max-w-[1280px]`) 안의 고정 폭 컨테이너 안에 있으므로 뷰포트가 아니라 컨테이너 기준이 자연스럽다.
5. **consent banner (`consent-banner.tsx:241`).** `max-w-[1280px]` 안에서 접히므로 `max-[719px]:` 는 사실 컨테이너 폭을 뷰포트로 근사한 것이다. 719/720 off-by-one(§4)도 컨테이너 쿼리로 옮기면 사라진다.

---

## 9. `landing-grid-card.module.css` 의 `--normal-*` / `--expanded-*` 체계 — 전수 대조

`.root`(1–76행)에 선언된 **21개**. AGENTS.md:25 가 말하는 "리터럴이 아니라 전역 토큰을 가리킨다"가 아래에서 검증된다.

### `--normal-*` — 9개 (23–31행)

| 로컬 토큰 | 줄 | 가리키는 전역 토큰 | 전역 정의 줄 | light 실값 | dark 실값 |
|:---|---:|:---|---:|:---|:---|
| `--normal-card-surface` | 23 | `--canvas-elevated` | 153 / 378 | `#ffffff` | `#1e1a16` |
| `--normal-card-border` | 24 | `--hairline` | 165 / 390 | `#e6e2d8` | `#504a43` |
| `--normal-card-shadow` | 25 | `--shadow-rest` → `--shadow-xs` | 183 → 146/371 | `0 1px 2px rgba(30,26,22,.04)` | `0 1px 2px rgba(5,4,3,.30)` |
| `--normal-focus-ring` | 26 | `--focus-ring` | 178 / 403 | `#5c8e78` | `#7daa95` |
| `--normal-thumb-radius` | 27 | `--radius-md` | 190 | `12px` | 동일 |
| `--normal-subtitle-ink` | 28 | `--ink-body` | 160 / 385 | `#504a43` | `#e6e2d8` |
| `--normal-tag-bg` | 29 | `--tag-bg` | 172 / 397 | `#ece8df` | `#332e28` |
| `--normal-tag-ink` | 30 | `--tag-fg` | 173 / 398 | `#504a43` | `#d6d1c4` |
| `--normal-tag-radius` | 31 | `--radius-xs` | 189 | `5px` | 동일 |

### `--expanded-*` — 12개 (64–75행)

| 로컬 토큰 | 줄 | 가리키는 전역 토큰 | 전역 정의 줄 | light 실값 | dark 실값 |
|:---|---:|:---|---:|:---|:---|
| `--expanded-question-ink` | 64 | `--ink` | 158 / 383 | `#1e1a16` | `#fbfaf7` |
| `--expanded-choice-surface` | 65 | `--canvas-elevated` | 153 / 378 | `#ffffff` | `#1e1a16` |
| `--expanded-choice-border` | 66 | `--hairline-strong` | 166 / 391 | `#d6d1c4` | `#817a72` |
| `--expanded-choice-ink` | 67 | `--ink-soft` | 159 / 384 | `#332e28` | `#ece8df` |
| `--expanded-choice-arrow-ink` | 68 | `--muted` | 161 / 386 | `#817a72` | `#b3aea1` |
| `--expanded-choice-accent` | 69 | `--accent` | 138 / 363 | `#5c8e78` | `#7daa95` |
| `--expanded-choice-accent-surface` | 70 | `--sage-muted` | 169 / 394 | `#e8f0ec` | `#1f382e` |
| `--expanded-card-surface` | 71 | `--canvas-elevated` | 153 / 378 | `#ffffff` | `#1e1a16` |
| `--expanded-card-border` | 72 | `--accent` | 138 / 363 | `#5c8e78` | `#7daa95` |
| `--expanded-card-shadow` | 73 | `--shadow-expanded` → `--shadow-lg` + `--hairline-strong` | 185 → 149/374 · 166/391 | 2층 | 2층 |
| `--expanded-context-ink` | 74 | `--muted-aa` | 162 / 387 | `#756d66` | `#b3aea1` |
| `--expanded-meta-strong` | 75 | `--ink-body` | 160 / 385 | `#504a43` | `#e6e2d8` |

### 접두사 밖의 5개 — **계약 문장이 닿지 않는 자리**

| 토큰 | 줄 | 값 | 종류 |
|:---|---:|:---|:---|
| `--landing-card-motion-ease` | 41 | `cubic-bezier(0.45, 0, 0.2, 1)` | **리터럴** — `--ease-in-out`(globals.css:196)과 바이트 동일하나 참조하지 않는다 |
| `--blog-hover-border` | 45 | `var(--accent)` | 토큰 참조 |
| `--blog-hover-shadow` | 46 | `var(--shadow-blog-hover)` | 토큰 참조 |
| `--unavailable-surface` | 50 | `var(--surface-soft)` | 토큰 참조 |
| `--unavailable-tag-bg` | 51 | `var(--tag-bg-unavailable)` | 토큰 참조 |
| `--unavailable-thumb-opacity` | 52 | `0.72` | **리터럴** — 주석이 "design.md §7.5 subtle dim; 구체값은 BQ-26/§8" 이라고 출처를 적는다 |

**대조 결과:** `--normal-*`/`--expanded-*` 21개는 **전부** 전역 토큰을 가리킨다 — AGENTS.md:25 의 문장은 참이다. 리터럴 2개(`--landing-card-motion-ease`, `--unavailable-thumb-opacity`)는 그 두 접두사 밖에 있어 계약 문장의 적용 대상이 아니다. 앞의 것은 중복(§5-3), 뒤의 것은 출처가 적힌 의도적 리터럴이다.

**토큰 값이 뷰포트에 반응하는 것은 21개 중 0개다.** 카드 스킨 전체에 모바일/데스크톱 축이 없다.

---

## 10. 모바일 관련 CSS 사실 — 리팩터 착수 전 알아야 할 것

### 10-1. `touch-action` 은 제품 전체에 **1개**

`landing-catalog-grid.tsx:31` 의 `touch-pan-y`(모바일 백드롭). 카드·그리드 컨테이너·GNB 드로어·instruction overlay·consent banner **전부 0개**. `overscroll-contain` 은 2개 — `site-gnb.tsx:87`(드로어) · `landing-grid-card.tsx:285`(모바일 확장 본문). 모바일 transient surface(`:296`)는 `overflow-hidden` 이라 스크롤 자체가 없다. instruction overlay 는 `fixed inset-0` 인데 overscroll 제어가 없다 — **body 스크롤 체이닝이 가능한 구조다. 실제 발생 여부는 미확인.**

### 10-2. 뷰포트 단위

`100dvh` 3곳 — `landing-grid-card.tsx:285, 296`(둘 다 `max-h-[calc(100dvh-116px)]`) · `site-gnb.tsx:87`(`[height:100dvh] [max-height:100dvh]`, 단 같은 문자열에 `h-screen max-h-screen`=`100vh` 도 함께 있어 두 벌이 겹친다). `100vw` 6곳 — `landing-grid-card.module.css:394, 530, 536, 544, 550` + `landing-grid-card.tsx:292`. **`100vw` 는 세로 스크롤바 폭을 포함하므로 데스크톱에서 가로 오버플로 원인이 되는 고전적 값이다** — 여기서는 모바일 transient shell 에만 쓰이므로 실제 영향은 미확인이나, `reducedMotion` 경로(`module.css:391–397`)가 `width: 100vw` 를 뷰포트 티어와 무관하게 적용한다는 점은 소스에서 확인된다.

**`116px` 리터럴이 두 번**(`landing-grid-card.tsx:285, 296`) — `calc(100dvh-116px)`. 어떤 토큰에도 대응이 없고 주석도 없다. 모바일 GNB 는 `h-14`=56px 이므로 116 = 56 + 60 인지 다른 계산인지 **소스에서는 확인되지 않는다. 미확인.**

### 10-3. `env(safe-area-inset-*)` — 2곳

`consent-banner.tsx:21` `bottom-[max(16px,env(safe-area-inset-bottom))]` · `site-gnb.tsx:87` `pb-[calc(32px+env(safe-area-inset-bottom,0px))]`. **모바일 확장 카드(`landing-grid-card.tsx:285`)와 instruction overlay 전면 모드(`instruction-overlay.tsx:26`)에는 없다** — 둘 다 화면을 가득 채우는 표면이므로 노치/홈 인디케이터 영역과 겹칠 여지가 있다. **근거: 소스 전수. 실기기 확인 미확인.**

### 10-4. 상하 여백의 모바일/데스크톱 값이 두 표면에서 어긋난다

`page-shell.tsx:22` 는 `pt-20`(80px) / `md:pt-[88px]`(88px). `instruction-overlay.tsx:26` 은 `max-[767px]:pt-[88px]` — **모바일에서 88px** 를 쓴다. 즉 같은 「GNB 아래 확보」를 랜딩 shell 은 모바일 80 / 데스크톱 88 로, instruction overlay 는 모바일 88 로 잡는다. GNB 실제 높이는 모바일 56px(`h-14`) / 데스크톱 64px(`h-16`)이다. 네 수 중 어느 것도 다른 것에서 유도되지 않고 전부 리터럴이다. **근거: 소스 대조. 어느 쪽이 의도인지는 미확인 — `req-landing.md` 확인이 필요하다.**

### 10-5. Tailwind theme 을 쓰지 않는다 → 시맨틱 유틸리티가 없다

`@theme` 0건이므로 `--canvas` 등 103개 토큰은 **Tailwind 의 테마가 아니다.** `bg-canvas` · `text-ink` · `rounded-lg`(토큰의 lg) 같은 유틸리티는 존재하지 않고, 모든 사용이 `bg-[var(--canvas)]` 형태의 arbitrary value 다(315회). 부수 효과 셋:
- `globals.css` 의 `:root` 가 **unlayered** 라 Tailwind 의 `@layer theme` 안 `--font-sans` 를 덮어쓴다. 의도대로 동작하지만 층 순서에 의존한다.
- 유틸리티 간 경쟁이 명시도가 아니라 **emit 순서**로 결정된다 — 이 저장소는 이미 그 함정을 네 번 기록했다(`button-class-names.ts:16–17, 48–50` · `settings-controls.tsx:24–28` · `globals.css:314–321` · `globals.css:418–426`).
- 반응형 토큰(§2-3)을 새로 만들 때, `@theme` 을 도입하면 `md:gap-…` 같은 기존 유틸리티와 토큰이 처음으로 같은 이름 공간에 들어온다 — 도입 여부는 **결정 필요 사항**이다.

---

## 11. 미확인 — 확정하려면 무엇이 필요한가

1. **`color-scheme: light dark` 의 실제 UA 렌더** (§7-1b). 시스템 다크 + 명시적 라이트 선택 상태에서 스크롤바/폼 컨트롤 색을 브라우저에서 봐야 확정된다.
2. **767px · 719px off-by-one 의 렌더 결과** (§4). 컴파일러 출력으로 경계는 확정했으나 그 한 폭에서 실제로 레이아웃이 바뀌는지는 보지 않았다.
3. **`left`/`width` 키프레임의 프레임 비용** (§5-4). 레이아웃 속성이라는 분류는 확실하나 실제 드롭 프레임 수는 프로파일이 필요하다.
4. **`116px` 의 유래** (§10-2). 소스에 근거가 없다.
5. **instruction overlay 의 스크롤 체이닝 / safe-area 겹침** (§10-1, §10-3). 실기기 필요.
6. **`hover:hover` + `pointer:coarse` 기기 집합** (§3-4). 두 판정이 갈리는 것은 소스로 확정, 어떤 기기가 그 상태인지는 실측 필요.
7. **태그 행을 컨테이너 쿼리로 대체 가능한지** (§8-2). 「N개까지만」 규칙이 CSS 단독으로 표현되는지 `req-landing.md §6` 확인 필요.
8. **`pt-20` / `md:pt-[88px]` / `max-[767px]:pt-[88px]` 중 무엇이 계약값인지** (§10-4). `req-landing.md` 미확인.
9. **`docs/design/ds/` 의 `catalog-components.css`(823줄) · `app-components.css`(659줄) 내용.** 이번 과제 범위(`src/` 의 모든 CSS)를 벗어나 읽지 않았다. 둘 다 런타임 미소비지만 리팩터의 시각 정본이므로 별도 조사가 필요하다.
10. **`qa:rules` / `npm test` 의 현재 상태.** 읽기 전용 과제라 실행하지 않았다.
