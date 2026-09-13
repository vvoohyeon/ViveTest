# 시각 계약의 모바일 지도 — `docs/design/design.md` + `docs/design/ds/**`

조사 대상 저장소: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (HEAD `a5aec95`). 이 문서의 모든 `file:line` 은 그 체크아웃 기준이다. 읽기 전용 조사이며 저장소 파일은 수정하지 않았다.

## 0. 읽은 것 / 읽지 않은 것

전문을 읽었다: `docs/design/design.md`(444줄) · `docs/design/ds/README.md`(190줄) · `docs/design/ds/SYNC.md`(112줄) · `docs/design/ds/SKILL.md`(35줄) · `docs/design/ds/colors_and_type.css`(871줄) · `docs/design/ds/catalog-components.css`(823줄, 핵심 구간 전량) · `docs/design/ds/app-components.css`(659줄, 핵심 구간 전량).

대조를 위해 읽었다: `src/app/globals.css`(토큰·mirror 구간·미디어쿼리) · `src/features/landing/grid/layout-plan.ts` · `landing-catalog-grid.tsx` · `landing-catalog-grid.module.css` · `landing-grid-card.tsx`(클래스 상수·분기 구간) · `landing-grid-card.module.css` · `use-mobile-scroll-lock.ts` · `mobile-card-lifecycle-dom.ts` · `src/features/gnb/site-gnb.tsx`(클래스 상수만).

읽지 않았다: `docs/design/ds/preview/**` 25개 중 `card-mobile-expanded.html` 외 24개의 본문(카드 마커만 전수 확인) · `docs/design/resources/**` 스크린샷 · `docs/design/ds/_provenance/**` · `docs/req-landing.md`(design.md 가 인용하는 조항 번호만 옮겼고 원문은 이번 과제 범위 밖) · `docs/decision-register.md`.

## 1. 한 줄 결론

**시각 계약에는 뷰포트 축이 없다.** `ds/*.css` 전체의 `@media` 는 14개이고 그중 **폭 기반은 0개**다(`grep -h "@media" ds/*.css | grep -c width` = 0). 내역은 `prefers-reduced-motion` 12개 · `prefers-color-scheme` 1개(`colors_and_type.css:658`) · **입력 방식 1개**(`catalog-components.css:281` `@media (hover: hover) and (pointer: fine)`). design.md 444줄 중 모바일 관련 어휘가 등장하는 줄은 38줄이고, 그중 모바일 **전용 규정**은 `§7.8`(6줄, 360–365)과 `§4.3` 타이틀 매트릭스 2줄(85–86)뿐이다. 나머지는 "모바일에서는 반대로 한다" 수준의 단서이거나 `req-landing.md` 로의 위임이다.

그래서 이번 리팩터에서 design.md 를 「고쳐야 할 제약」으로 다루는 판단은 부분적으로만 맞다. 랜딩 카드에 대해서는 맞고(§4.3·§7.7·§7.8), **테스트 플로우·블로그·히스토리·설정·에러·404 에 대해서는 고칠 조항 자체가 존재하지 않는다** — 그 자리는 개정이 아니라 신설이다.

## 2. §4 Foundations 4.1~4.11 — 각 원칙이 모바일에 요구하는 것

| § | 줄 | 모바일에 요구하는 것 | 판정 |
|:---|:---|:---|:---|
| 4.1 시각 personality | 68–71 | 없음. "카드 카탈로그가 곧 정체성"(71)은 tier 무관 | 모바일 무언급 |
| 4.2 Product voice | 73–79 | 없음. sentence case·이모지 금지·full-digit 숫자는 tier 무관 | 모바일 무언급 |
| 4.3 Typography | 81–86 | **유일하게 구체적**: 85 "Mobile Normal is full text with no ellipsis; Mobile Expanded and transient titles are full text with no ellipsis" · 86 "Mobile Normal subtitles show the full text without ellipsis". **타입 크기에는 모바일 단계가 없다** — §5.1(135–143)의 7개 role 은 단일 값 | 규칙 있음 / 크기 축 없음 |
| 4.4 Color | 88–92 | 없음 | 모바일 무언급 |
| 4.5 Spacing | 94–96 | **없음**. 95는 "카드 내부 패딩 16px"을 tier 무관으로 고정하고, 컨테이너 좌우 패딩의 24/20/16 단계는 §4.5 가 아니라 §5.10 산문(230)이 `req-landing.md §6.1` 로 위임한다. 그리드 gutter 도 §4.5 에 없고 §7.7(358)에 있다 | 모바일 무언급 |
| 4.6 Radius | 98–99 | "the mobile menu panel uses the extra-large radius"(99) 한 줄. 모바일 expanded 시트의 radius 0 은 여기 없고 §7.8(364)에 있다 | 부분 |
| 4.7 Elevation | 101–102 | "true overlays (**mobile sheet**, menu) use the deepest step"(102) = `--shadow-overlay`. **미실현** — 아래 §5-B 참조 | 규칙 있음 / 미실현 |
| 4.8 Motion | 104–105 | 금지 목록(bounce·spring overshoot·parallax·card tilt·auto-play)과 `prefers-reduced-motion` 존중. **터치 고유 모션에 대한 언급 0** — 시트 드래그, 관성 스크롤, rubber-band, pull-to-refresh, 스와이프 제스처 어느 것도 허용·금지 어느 쪽으로도 규정되지 않았다 | 금지선만 있음 |
| 4.9 Imagery | 107–108 | 없음. 썸네일 `16 / 6`(§6.2, 252)은 tier 무관 | 모바일 무언급 |
| 4.10 Accessibility | 110–114 | **44×44 요구가 열거형이다**: 112 "Tap targets are at least **44×44px** for choices, \"Read more,\" the close button, and the hamburger." 네 컨트롤의 **이름을 적은 목록**이지 일반 규칙이 아니다. 111 포커스 링(2px sage + 2px offset, `:focus-visible`, 제거 금지) · 113 coming soon 은 색만으로 전달 금지 · 114 unavailable 은 탭 순서에서 제외 | 열거형 / 일반 규칙 아님 |
| 4.11 Localization | 116–117 | `word-break: keep-all` + `overflow-wrap: anywhere`. 117 은 §4.3 매트릭스를 그대로 재진술한다(같은 규칙이 두 곳에 있고, 그래서 개정 시 두 곳을 함께 고쳐야 한다) | 규칙 있음 / 중복 |

### 2-A. §4.10 의 44px 열거형이 남긴 구멍 (근거: 열거 대상 밖 컨트롤을 소스에서 확인)

44px 하한을 **명시적으로 받는** 것은 네 개뿐이고, 셋은 실제로 실현돼 있다: 모바일 close `min-h-[var(--tap-min)] min-w-[var(--tap-min)]`(`src/features/landing/grid/landing-grid-card.tsx:278-279`) · 햄버거 `min-h-[var(--tap-min)]`(`src/features/gnb/site-gnb.tsx:64`) · 드로어 링크 `min-h-[var(--tap-min)]`(`site-gnb.tsx:101`). `--tap-min: 44px` 는 `src/app/globals.css:201`.

열거 밖에 있어서 **하한이 없는** 컨트롤: 태그 칩(`--tag-pad: 4px 9px` + 13px/1.35 → 약 26px, `colors_and_type.css:480`·`494`) · 로케일/테마 칩 데스크톱 인스턴스(`--vt-chip` `min-height: 32px`, `app-components.css:397`) · GNB 텍스트 링크 · 푸터 링크 · 답변 choice(§7.3 이 `minHeight` 를 **금지**한다, design.md:315).

**§4.10 과 §7.3 은 choice 에 대해 정면으로 부딪힌다.** §4.10:112 는 choice 를 44×44 대상으로 이름 붙여 열거하고, §7.3:315 는 "Equal top/bottom choice padding; **no `minHeight` on choices**" 라고 쓴다. 현재는 우연히 충족된다 — 패딩 `px-3.5 py-3`(12px 상하) + `--t-choice` 15px/1.45(21.75px) + 1px 테두리 ×2 = **약 47.75px**(`landing-grid-card.tsx:235`, `colors_and_type.css:495`). 즉 **하한이 콘텐츠 높이에 의존한다**. 모바일에서 choice 타입을 한 단계라도 줄이거나 패딩을 줄이면 조용히 44 아래로 내려가고, 어떤 게이트도 이를 잡지 않는다.

**§4.10 과 §7.4 도 부딪힌다.** §4.10:112 는 `Read more` 를 44×44 대상으로 열거하지만, §7.4:324 는 그것을 "inside the same **non-interactive affordance**" 라고 규정한다 — 비대화형 장식에는 탭 타깃 크기가 적용될 수 없다. 실현값은 13px/1.35 ≈ 17.55px 높이(`landing-grid-card.tsx:504`)이고, 실제 탭 타깃은 카드 전체다. 둘 중 하나가 틀렸고, 문서는 어느 쪽인지 말하지 않는다.

### 2-B. §4.7 의 "mobile sheet 은 가장 깊은 단계" 는 실현되지 않았다

`design.md:102` 는 모바일 시트를 `--shadow-overlay`(§5.8:203, `0 24px 64px rgba(30,26,22,0.18)`) 사용자로 지정한다. 실현된 steady OPEN 상태의 시각 클래스는 `[background:var(--expanded-card-surface)] [box-shadow:**none**]`(`landing-grid-card.tsx:1021-1022`)이고, 루트 클래스에도 `rounded-none w-screen min-h-0 mx-[calc(50%-50vw)]` 외에 그림자가 없다(`:1042`). 그림자를 갖는 것은 OPENING/CLOSING 의 transient shell 뿐이다(`[box-shadow:var(--expanded-card-shadow)]`, `:292`, → `--shadow-expanded`, `landing-grid-card.module.css:73`). 즉 §4.7 의 모바일 조항은 **Intent**다.

## 3. §5 Tokens — 모바일에서 값이 달라져야 할 토큰 / 뷰포트 축의 유무

### 3-A. 결론: 토큰 체계에 뷰포트 축은 **없다**

`docs/design/ds/colors_and_type.css` 전체(871줄, 고유 토큰 이름 190개, 선언 323건)를 열어 확인했다. 폭 기반 미디어쿼리는 **0개**다. 조건부 재정의는 두 축뿐이다 — 테마(`[data-theme='dark']` 462줄 이하 + `@media (prefers-color-scheme: dark)` 658줄 이하, 두 블록이 선언 단위로 byte-identical 하도록 `tests/unit/design-tokens-dark-parity.test.ts` 가 강제)와 모션(`@media (prefers-reduced-motion: reduce)` 867–870, `--dur-slow: var(--dur-reduced)` 한 줄).

대신 **반응형 값은 "이름이 다른 세 개의 토큰"으로 표현되고, 어느 것을 쓸지는 소비자가 고른다**:

```css
--grid-gutter-mobile:  15px;   /* colors_and_type.css:485 */
--grid-gutter-tablet:  20px;   /* :486 */
--grid-gutter-desktop: 24px;   /* :487 */
```

그리고 소비 방식도 미디어쿼리가 아니라 **클래스 modifier** 다 — `.vt-grid { gap: var(--grid-gutter-mobile) }` 가 기본, `.vt-grid--tablet` / `.vt-grid--desktop` 가 덮어쓴다(`catalog-components.css:52-60`). 그 이유는 파일이 직접 밝힌다: 사양 시트는 Design System 패널의 고정폭 프레임 안에서 렌더되므로 `max-width` 쿼리는 시뮬레이션 대상 tier 가 아니라 **패널의 폭**에 반응한다(`catalog-components.css:33-38`). 같은 논리가 타이틀/서브타이틀 clamp 에도 적용돼, clamp 는 기본값이 아니라 **명시적으로 요청하는 modifier**(`--clamp1` / `--clamp2`)이고 base 는 "잊어버려도 아무것도 위반하지 않는" 무클램프다(`catalog-components.css:128-190`).

### 3-B. 런타임에는 뷰포트 축이 있고, 설계 정의는 그것을 모른다

`src/app/globals.css` 에는 폭 기반 미디어쿼리가 **2개** 있다:

```css
--shell-gutter: 16px;                                  /* globals.css:323 */
@media (min-width: 768px) { :root { --shell-gutter: 20px; } }   /* :326-330 */
@media (min-width: 900px) { :root { --shell-gutter: 24px; } }   /* :332-336 */
```

**이 둘은 mirror 구간 밖에 있다.** mirror 는 `@mirror-begin light`(`:94`) ~ `@mirror-end light`(`:227`)와 `@mirror-begin dark`(`:345`) ~ `@mirror-end dark`(`:407`)이고, 그 안에서만 설계 정의와 byte-equal 이 강제된다(`globals.css:88-92`). 즉 **제품의 유일한 반응형 토큰은 설계 정의에 대응물이 없는 런타임 전용 토큰**이다. 같은 구간 밖에 `--overlay-scrim-medium`(`:285`) · `--overlay-scrim-strong`(`:286`)도 있는데 ds 에는 `--overlay-scrim` 하나뿐이다(`colors_and_type.css:458`) — 그리고 모바일 backdrop 이 실제로 읽는 것은 ds 에 없는 `--overlay-scrim-medium` 이다(`landing-catalog-grid.tsx:31`).

mirror 되는 토큰은 190개 중 **87개**다(`globals.css:62-70` 이 그 숫자와 기준을 적고 있다: "Only the tokens the runtime actually consumes are mirrored — 87 of the design definition's 198"). 문서가 말하는 198 과 내가 센 190(고유 이름 기준, 선언 323건)은 세는 방식이 달라 생긴 차이로 보이며, **어느 쪽이 맞는지는 미확인**이다(파리티 가드의 카운트 규칙을 열어보지 않았다).

모바일 리팩터에 직접 걸리는, **런타임에 reader 가 0인 ds 토큰**(`grep -rn -- "<name>" src/` 으로 전수 확인):

| 토큰 | ds 정의 | 런타임 reader |
|:---|:---|:---:|
| `--grid-gutter-mobile/tablet/desktop` | `colors_and_type.css:485-487` | **0** |
| `--container` (1280px) | `:370` | **0** |
| `--card-pad` (16px) | `:478` | **0** |
| `--choice-pad` (12px 14px) | `:479` | **0** |
| `--tag-pad` (4px 9px) | `:480` | **0** |
| `--thumb-ratio` (16 / 6) | `:482` | **0** |
| `--space-1 … --space-24`, `--space-2xs … --space-section` | `:265-277`, `:470-477` | **0** |
| `--radius-sm`, `--radius-pill` | `:295`, `:300` | **0** |
| `--sage`, `--sage-soft`, `--muted-soft` | `:439-441`, `:411` | **0** |
| `--ease-out`, `--ease-in`, `--dur-base`, `--dur-expand`, `--dur-micro`, `--stagger-*` | `:347-365` | **0** |
| `--t-tag`, `--t-context-label`, `--t-eyebrow` | `:492`, `:494`, `:497` | **0** (`globals.css:69` 이 명시적으로 제외 사유를 적었다) |

그리드 gutter 는 토큰이 아니라 **Tailwind 리터럴**로 실현된다: `gap-[15px] md:gap-5 xl:gap-6`(`landing-catalog-grid.tsx:211`·`:221`).

### 3-C. 모바일에서 값이 달라져야 할 후보 — 그리고 그 판단이 문서 어디에도 없다는 사실

아래는 "현재 단일 값이고, 축이 생긴다면 여기"라는 **사실의 열거**다. 어느 값으로 갈라야 하는지는 이 문서들이 답하지 않으므로 결정 사항으로 남긴다.

- **타입 role 7종** — `--t-card-title` 600 20px/1.3 · `--t-card-subtitle` 400 15px/1.45 · `--t-expanded-question` 600 21px/1.3 · `--t-context-label` 500 14px/1.4 · `--t-choice` 400 15px/1.45 · `--t-tag` 500 13px/1.35 · `--t-eyebrow` 400 14px/1.4 (`colors_and_type.css:491-497`). 모두 단일 값이다. 그리고 `catalog-components.css:697-698` 이 명시한다: "There is no shell scale here. Mobile does not scale its type — the question is 21px on screen, not 21 × 1.04." 즉 데스크톱은 shell scale 1.04(→ Wide/Medium 은 1.10 desire)로 실질 확대되는데 **모바일만 소재 크기 그대로**다. 모바일 카드 내용 폭이 약 326px(358 − 2×16)이라는 점과 함께 보면, 20px 타이틀·13px 태그는 근거를 다시 대야 하는 값이다.
- **`--card-pad: 16px`** — 데스크톱 397px 카드와 모바일 358px 카드가 같은 16px 을 쓴다. 모바일 시트도 `px-4 pb-4`(=16px, `landing-grid-card.tsx:285`)로 동일하다.
- **`--tap-min: 44px`** — 단일 값이고, **ds 는 이미 이것을 조상 스코프로 분기하고 있다**: `.vt-chip { min-height: 32px }`(`app-components.css:397`)이고 `.vt-drawer .vt-chip { min-height: var(--tap-min) }`(`:443`). 그 사유를 파일이 직접 적는다(`:437-442`) — 12개 로케일 칩을 44px 로 깔면 벽이 되고, 데스크톱 레이어는 fine-pointer 표면이라 WCAG 2.2 AA 의 24px 이 적용 바닥이지만, 드로어 안의 같은 칩은 1차 터치 타깃이므로 바닥을 받는다는 것이다. **이것이 저장소 전체에서 입력 방식으로 값이 갈리는 유일한 선례이고, 미디어쿼리가 아니라 스코프로 구현돼 있다.** 사용자 결정 ②(폭 → 입력 방식)의 기존 근거로 그대로 쓸 수 있다.
- **`--overlay-scrim`** — light `rgba(30,26,22,0.48)` / dark `rgba(5,4,3,0.72)`(`:458`, `:657`). 테마 축은 있고 모바일 축은 없다. dark 에서 오버레이가 scrim 이 아니라 **edge** 로 분리된다는 규칙(`colors_and_type.css:646-655`, design.md §6.8:274)은 tier 무관으로 쓰여 있는데, 모바일 시트는 그 edge 를 그리지 않는다(§5-B 참조).
- **shadow 5단계** — 테마 축만 있다. 모바일에서 `--shadow-overlay` 를 쓰라는 §4.7 요구가 미실현이라는 점은 위 2-B.

## 4. §7.7 Responsive catalog — 전문과 대조

### 4-A. 전문 (design.md:347–358, verbatim — 원문 줄바꿈 그대로)

```md
### 7.7 Responsive catalog
- **Wide desktop:** first row 3 columns, following rows 4 columns.
- **Medium:** 2 → 3.
- **Lower tablet:** 2 → 2.
- **Mobile:** single column.
- Realized reference widths: desktop catalog ~1280px container, tablet ~920px, mobile ~390px; content centered within the max width.
- **Top-row prominence comes from wider columns only** — no extra spacing, divider, heading, label, or hero band between rows.
- Same-row tracks remain equal and active expanded surfaces produce zero horizontal overflow in the catalog container and document.
- Expanded content shell scale remains `1.04`. Desktop Wide/Medium/two-column desire final scale `1.10`; Tablet remains `1.04`. The expanded frame supplies any width beyond `1.04` and clamps to measured stage allowance at left / center / right anchors. The expanded card overlays via z-index and **never reflows siblings.**
- **Column-mode thresholds (realized):** Column switching follows the product requirement contract in `docs/req-landing.md §6.2`: the source of truth is the measured `.landing-grid-container` inline-size, not a viewport-width estimate. Desktop/Tablet Wide uses `gridInlineSize >= 1160` (3 → 4 columns); Desktop/Tablet Medium uses `1040 <= gridInlineSize < 1160` (2 → 3); Desktop/Tablet Two-column uses `gridInlineSize < 1040` (2 → 2); Mobile remains `<= 767px` and single column.
- Viewport values such as 1024px / 860px / 768px are manual review approximations only; they do not override the `req-landing` measurement contract.
- **Grid gutter (realized):** 24px desktop · 20px tablet · 14–16px mobile. The 20px tablet gutter sits deliberately off the 4px-derived scale and is a catalog-grid-specific value.
```

### 4-B. 구현 대조

| §7.7 조항 | 구현 | 판정 |
|:---|:---|:---|
| Wide 3→4 / Medium 2→3 / Two-column 2→2 / Mobile 1 | `resolveLandingGridColumns` 가 그대로: `>=1160 → {3,4}`(`layout-plan.ts:89-95`) · `>=1040 → {2,3}`(`:97-103`) · else `{2,2}`(`:105-109`) · tier==='mobile' → `{1,1}`(`:81-87`) | **일치** |
| 임계값 1160 / 1040 | `DESKTOP_WIDE_MIN_GRID_INLINE_SIZE = 1160`(`layout-plan.ts:9`) · `DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE = 1040`(`:8`) | **일치** |
| Mobile `<= 767px` | `MOBILE_MAX_VIEWPORT_WIDTH = 767`(`layout-plan.ts:1`), `resolveLandingViewportTier`(`:63-73`) | **일치** |
| "the source of truth is the measured `.landing-grid-container` inline-size, **not a viewport-width estimate**" | **컬럼 축만 그렇다.** 모바일 tier 판정 자체는 `viewportWidth` 다(`layout-plan.ts:64`). 그리고 gutter 축은 Tailwind 뷰포트 브레이크포인트다 — `gap-[15px] md:gap-5 xl:gap-6`(`landing-catalog-grid.tsx:211`·`:221`) | **부분 일치 / 축이 셋** |
| shell scale 1.04, desktop desire 1.10, tablet 1.04 | `[--landing-card-shell-scale:1.04]`(`landing-grid-card.tsx:213`) · `DESKTOP_EXPANDED_DESIRED_FINAL_SCALE = 1.1`(`layout-plan.ts:10`) · `TABLET_EXPANDED_DESIRED_FINAL_SCALE = 1.04`(`:11`) | **일치** |
| gutter 24 / 20 / **14–16** mobile | 실현은 **15px 단일값**(`gap-[15px]`, `landing-catalog-grid.tsx:211`; ds `--grid-gutter-mobile: 15px`, `colors_and_type.css:485`). §7.7 의 "14–16px" 은 단일값을 범위로 적은 것 | **값은 일치, 표기가 범위** |

### 4-C. §7.7 이 만드는 두 개의 실제 결함

**⑴ gutter 축과 column 축이 서로 다른 것을 읽는다.** column 은 측정된 `gridInlineSize`, gutter 는 뷰포트(`md`=768 / `xl`=1280). 컨테이너 max-width 1280 에 좌우 패딩 24 를 빼면 뷰포트 1208px 에서 `gridInlineSize` 가 1160 에 도달해 `desktop-wide`(3→4열)로 전환되지만, gutter 는 `xl`(1280) 미만이므로 여전히 20px(tablet 값)이다. 즉 **뷰포트 1208–1279 구간에서 "데스크톱 와이드 컬럼 + 태블릿 gutter"** 가 렌더된다 — §7.7 의 "24px desktop" 과 어긋난다. *이 계산은 클래스 이름과 상수에서 유도한 것이고 브라우저에서 측정하지 않았다 — 착수 전 1회 실측으로 확정할 것.*

**⑵ §7.7 은 모바일에 대해 "single column" 한 줄밖에 없다.** 열 수 외에 모바일 그리드가 요구받는 것이 없다 — 카드 최소/최대 폭도, 세로 리듬도, 스크롤 길이 예산도, 카드 개수 증가 시의 동작(현재 8장, 스크롤 3.76화면)도 규정하지 않는다. `card-mobile.html` 마커가 "358px in a 390px frame · nothing is clamped, and the card is wider than a desktop one"(`preview/card-mobile.html:2`)이라고 적고 있고, `catalog-components.css:141-143` 이 같은 사실을 확인한다 — **모바일 카드(약 358px 콘텐츠)가 데스크톱 후열 카드(292px)보다 넓다.** 그래서 "모바일은 좁다"를 전제로 한 어떤 규칙도 이 저장소에서는 틀린다.

## 5. §7.8 Mobile expanded visual — 전문과 대조

### 5-A. 전문 (design.md:360–365, verbatim — 원문 줄바꿈 그대로)

```md
### 7.8 Mobile expanded visual
- **Full viewport width, no side margin**, top edge **flush to the GNB bottom**.
- A **scrim** dims the grid beneath.
- **Visible close button** (top right).
- **No left/right card radius** — it reads as chrome, not a floating card; a `--sage` bottom edge anchors it.
- This document describes the **visual** only. It does **not** authorize **swipe-down close** as a behavior.
```

### 5-B. 구현 대조 — ds 가 이미 채점표를 갖고 있다

`docs/design/ds/preview/card-mobile-expanded.html` 의 카드 부제가 "The realized OPEN state, and **the four things design.md §7.8 asks for that it does not do**"(`:2`)이고, 본문 표(`:69-77`)가 2026-09-07 에 390×844 실측으로 채점해 두었다. 나는 그 표의 각 행을 소스에서 독립 확인했다.

| §7.8 요구 | 실현 | 근거 | 판정 |
|:---|:---|:---|:---|
| Full viewport width, no side margin | `w-screen mx-[calc(50%-50vw)]` | `landing-grid-card.tsx:1042` | **일치** |
| No left/right card radius | `rounded-none` | `landing-grid-card.tsx:1042` | **일치** (단 상하 radius 까지 0 — §7.8 은 좌우만 말한다) |
| A scrim dims the grid beneath | `fixed inset-0 z-10 bg-[var(--overlay-scrim-medium)]` | `landing-catalog-grid.tsx:31`, 렌더 `:198-206` | **일치** (단 토큰이 ds 에 없는 런타임 전용 `--overlay-scrim-medium`) |
| Visible close button (top right) | sticky header 우단, `min-h/min-w = --tap-min` | `landing-grid-card.tsx:278-279`, header `:286-287` | **일치** |
| **top edge flush to the GNB bottom** | **불일치.** OPEN 상태는 그리드 내 in-flow 이고, transient shell 의 앵커는 GNB 가 아니라 **카드 자신의 `rect.top`** 이다 (`anchorTopPx: cardRect?.top ?? 0`) | `mobile-card-lifecycle-dom.ts:23`, 소비 `landing-grid-card.tsx:1162`·`:292`. 실측: GNB bottom 57, sheet top 338.59 → **281.59px 간극** (`preview/card-mobile-expanded.html:75`) | **미실현 = Intent** |
| **a `--sage` bottom edge anchors it** | **불일치.** 체인 어디에도 border 가 없다. 모바일 OPEN 시각 클래스는 `[background:var(--expanded-card-surface)] [box-shadow:none]` 뿐 | `landing-grid-card.tsx:1021-1022`·`:1042`. `--expanded-card-border: var(--accent)`(`landing-grid-card.module.css:72`)는 **데스크톱** surface 만 소비(`landing-grid-card.tsx:276`) | **미실현 = Intent** |
| (§4.10 파생) close ≥ 44×44 | **해소됨** — ds 문서는 아직 40 이라고 말한다. 아래 §7-A | — |

`preview/card-mobile-expanded.html:85` 는 이 간극들의 처분까지 적어 두었다: "**Wave 13 — \"Mobile expanded shape/position\" — was never implemented, and `BQ-38` superseded it.** So the three gaps above are not defects to fix; they are the difference between a finished shape nobody built and a realized transient-shell implementation that works." **이번 리팩터에서 사용자 결정 ①(계약 개정 전면 허용)이 직접 겨누는 지점이 여기다** — §7.8 의 두 조항은 「구현되지 않은 설계」이지 「깨진 구현」이 아니므로, 구현을 맞출지 조항을 지울지가 열려 있다.

### 5-C. §7.8 이 규정하지 않은 채 실현된 것들 (전부 미규정 영역)

- **높이 상한이 매직 넘버다.** `max-h-[calc(100dvh-116px)]` 가 세 곳에 하드코딩돼 있고(`landing-grid-card.tsx:285`·`:292`·`:296`), 116 의 출처를 적은 주석·상수·토큰이 소스 어디에도 없다(`grep -rn "116" src/features/landing/grid/` 결과 이 세 건뿐). GNB 56px + α 로 보이지만 **미확인**이다.
- **페이지 스크롤 잠금이 OPEN 상태에 걸리지 않는다.** `shouldLockMobilePageScroll` 은 `OPENING` 과 `CLOSING` 에만 true 다(`use-mobile-scroll-lock.ts:5-7`). 정지 OPEN 에서 배경 페이지가 스크롤 가능한지, 시트가 in-flow 이므로 함께 움직이는지는 **미확인**(런타임 미측정).
- **닫힘 경로가 §7.8 에 없다.** "does not authorize swipe-down"(365)이라는 금지만 있고 허용 경로는 없다. 허용 경로는 `req-landing.md §8.5` 가 갖고 있고 ds 가 그것을 옮겨 적는다 — "Closing is the X or a backdrop tap, and nothing else"(`catalog-components.css:701-702`, `preview/card-mobile-expanded.html:89`).
- **safe-area 무언급.** design.md·ds 전체에 `safe-area-inset` 문자열이 0건이다. 전면 시트가 화면 하단까지 닿는 형태인데 iOS 홈 인디케이터 영역 처리 규정이 없다.
- **주소창 높이 변동 무언급.** `100dvh` 를 쓰는 것은 소스의 선택이고(위 매직 넘버) 계약 문서는 `dvh`/`svh`/`lvh` 중 무엇도 언급하지 않는다.

## 6. §8 Motion Guidance — 값별 R/C/D/I 판정 (`AGENTS.md §3-1`)

`design.md:371` 의 자기 규정: "This document defines the **visual motion language only**; it does not decide *when* motion is implemented." §8 의 값은 전부 `:373` 한 줄에 모여 있다.

| design.md §8 이 쓴 값 | 판정 | 근거 |
|:---|:---:|:---|
| `--ease-standard: cubic-bezier(0.2,0,0,1)` | **R** | 런타임 선언 `src/app/globals.css:195` (mirror 구간 안). ds `colors_and_type.css:346` 동일 |
| `--ease-out: cubic-bezier(0.0,0,0.2,1)` | **C** | ds `:347` 에 정의. 런타임 reader **0** (`grep -rn -- "--ease-out" src/` → 0) |
| `--ease-in: cubic-bezier(0.4,0,1,1)` | **C** | ds `:348`. 런타임 reader **0** |
| `--dur-fast: 140ms` | **R** | `globals.css:197`. 리터럴로도 실현 — blog 스킨 `border-color 140ms / box-shadow 140ms`(`landing-grid-card.module.css:88-89`), choice 전이(`landing-grid-card.tsx:235`) |
| `--dur-base: **220ms**` | **I** | 실현값이 없다. ds 는 같은 이름에 **180ms** 를 준다(`colors_and_type.css:353`). ds `:314-316` 이 명시: "the pre-rebaseline design tokens (which claimed 220ms / 260ms and **were never implemented**)" |
| `--dur-expand: **260ms**` | **I** | ds `:355` 는 `var(--dur-slow)` = **280ms**(`:354`). 런타임 실현값도 **280ms**(`landing-grid-card.tsx:213` `[--landing-card-motion-ms:280ms]`) |

**§8 에 없지만 실현된 값** (= §8 이 현행 구현보다 뒤처져 있다는 증거):

| 값 | 판정 | 근거 |
|:---|:---:|:---|
| `--ease-in-out: cubic-bezier(0.45,0,0.2,1)` — 핵심 expand/collapse 곡선 (M-01) | **R** | `globals.css:196`, `landing-grid-card.module.css:41`. ds `:349`. §8 은 이 이름을 한 번도 쓰지 않는다 |
| 코어 모션 280ms | **R** | `landing-grid-card.tsx:213` |
| reduced-motion 코어 180ms | **R** | `landing-grid-card.module.css:576-581` |
| stagger 40 / 100 / 160ms | **R** | `landing-grid-card.module.css:289`·`:294`·`:299`. §8:374 는 "a short stagger" 라고만 쓰고 값을 말하지 않는다 |
| 모바일 재진입 exit stagger 20 / 80 / 140ms | **R** | `landing-grid-card.module.css:316`·`:321`·`:327`. ds `:363-365`. **design.md 전체에 무언급** |
| 모바일 normal-slot exit 120ms | **R** | `landing-grid-card.module.css:311`. ds `--dur-micro:120ms` `:351`. **design.md 전체에 무언급** |

**등재되지 않은 갈림 1건.** `AGENTS.md §2` 의 Visual source precedence 는 "토큰 값이 design.md §5 와 `ds/colors_and_type.css` 에서 갈리면 `ds/` 가 실현값이고 design.md 가 intent다 — **그 갈림은 등재된 것만 유효하며(현재 BQ-38의 3건)**" 라고 규정한다. BQ-38 의 3건은 `colors_and_type.css:379-393` 에 열거돼 있고 전부 **이름** 문제다(`--ink-body` 개명 · `--tag-bg-unavailable`/`--muted-aa` 선명명 · `--blog-read-more-ink` 신설). `--dur-base` 220↔180 과 `--dur-expand` 260↔280 은 **이름이 아니라 값의 갈림인데 그 3건에 들어 있지 않다.** ds 파일이 사유를 산문으로 적어 두었지만(`:308-313`, "decision B" 를 인용) `decision-register.md` 등재 여부는 이번 과제에서 확인하지 않았다 — **미확인**.

## 7. §10 Never Reintroduce for ViveTest — 전문

design.md:411–428, verbatim(원문 줄바꿈 그대로). **이것이 모바일 리팩터의 금지선이다.**

```md
## 10. Never Reintroduce for ViveTest

- `PREVIEW QUESTION` label in the expanded card.
- A/B letter badges on choices.
- `READ` (or any) eyebrow on cards.
- Dashed `Coming soon` pill.
- A dot inside the `Coming soon` tag.
- Tag color dots in catalog data.
- Desktop gear / settings icon.
- Desktop hamburger.
- Underline on `Read more →`.
- Hover border / shadow / background on Normal test cards.
- Opacity reduction on the unavailable card's title / subtitle.
- `Dark mode is coming in a later phase.` (or any dark-mode placeholder text).
- `Catalog` item in the mobile menu.
- `layoutId` / `LayoutGroup` as a recommended motion approach.
- `min-height: 100%` as the expanded-overlay height invariant.
- Swipe-down close as authorized mobile expanded behavior.
```

이 목록에 대해 세 가지를 기록한다.

**⑴ 16개 중 "Desktop gear / settings icon" 은 이미 죽은 조항이다.** §7.6:339 이 D-11 로 뒤집혀 데스크톱 settings trigger 를 **요구**하고 있고(`req-landing.md §6.4` 가 그 레이어의 hover-open·close path·0px hover gap 을 8줄로 규정하며 그중 4줄에 자동 검사가 걸려 있다), 제품은 그 trigger 를 실현한다(`site-gnb.tsx:66`). **§7.6 은 고쳤는데 §10 은 고치지 않았다** — 같은 문서 안에서 §7.6 과 §10 이 정면으로 모순한다. ds README D-11(`:26`)은 "all three were corrected in §7.6 itself" 라고만 적고 §10 은 손대지 않았다.

**⑵ 모바일 리팩터가 직접 부딪히는 항목은 2개다.** "Swipe-down close as authorized mobile expanded behavior" 와 "`min-height: 100%` as the expanded-overlay height invariant". 앞의 것은 사용자 결정 ⑤(IA 재설계 허용, 바텀시트 도입 가능)와 정면으로 충돌한다 — 바텀시트를 도입하면서 스와이프 닫기를 금지하는 것은 플랫폼 관용(iOS HIG sheet, Material 3 bottom sheet 모두 drag-to-dismiss 를 표준 어포던스로 둔다)과 어긋나고, **동시에 WCAG 2.5.7 Dragging Movements 는 드래그를 유일 경로로 두지 말 것을 요구할 뿐 드래그 자체를 금지하지 않는다**(현재 X + backdrop 탭이 이미 있으므로 스와이프 추가는 2.5.7 을 위반하지 않는다). 이 조항은 「보존 / 교체 / 결정 필요」 중 **결정 필요**로 올려야 한다.

**⑶ 나머지 13개는 tier 무관의 시각 금지이며 모바일에서 완화할 이유가 없다.** 특히 "Hover border / shadow / background on Normal test cards" 는 **hover 가 없는 기기에서는 무의미해지는 금지**이므로, 사용자 결정 ②로 입력 방식 축이 들어오면 「금지의 대상이 사라지는」 첫 조항이다. 다만 그 자리를 무엇이 대신하는지(터치에서 normal 카드의 pressed 피드백)는 design.md 에 없다 — §8 이하 §5-C 와 같은 공백이다.

## 8. design.md 가 **모바일에 대해 아무 말도 하지 않는** 영역

design.md 는 444줄이고 모바일 어휘가 등장하는 줄은 38줄이다. 아래는 그 38줄 어디에도 없는 것들이며, 각 항목에 「왜 없다고 단정할 수 있는가」의 근거를 붙인다.

### 8-A. 표면 전체가 없는 것 — 이번 리팩터의 최대 공백

design.md §7 Patterns 는 **랜딩 카탈로그 하나만** 다룬다(§7.1 catalog page ~ §7.8 mobile expanded). 다음 표면은 §7 에 패턴이 **존재하지 않는다**:

- **테스트 플로우** (instruction / question / result). `app-components.css` 가 `.vt-progress`(`:556-590`)를 만들면서 진행 바를 새로 설계했지만 그 근거를 design.md 가 아니라 realized 관찰에서 가져왔다.
- **블로그 목록 / 블로그 상세.** §7.4 는 랜딩 카탈로그 안의 **블로그 카드**만 다룬다. 상세 화면 자체에 대한 조항이 없다.
- **히스토리 화면.**
- **설정 / 로케일·테마 레이어의 모바일 형태.** §6.6:264 이 "On mobile the same controls sit at the foot of the menu drawer rather than in a layer" 한 줄만 적는다.
- **동의(consent) 배너.** `app-components.css:605-628` 이 `.vt-banner` 를 만들며 "it is a floating surface rather than a panel … but it does not take a scrim" 라고 직접 설계한다 — design.md 에 근거 조항이 없다.
- **404 / 에러 화면.** `app-components.css:632-635` 이 이 공백을 명시적으로 적는다: "**`design.md` has no pattern for these because they were never extracted**; the rule taken is the README's own voice guidance".

교차 확인: ds 의 이 표면들을 담당하는 사양 카드 두 장 — `preview/test-flow.html` 과 `preview/secondary-surfaces.html` — 은 파일 전체에서 `mobile|390px|touch|pointer: coarse` 를 **0회** 언급한다(전수 grep). 즉 랜딩 밖 표면은 **설계 문서에도 사양 카드에도 모바일 규정이 없다**.

### 8-B. 랜딩 안에서도 없는 것

- **입력 방식(hover 유무 / pointer 정밀도) 축.** design.md 전체에 `touch` / `coarse` / `pointer` / `swipe` 어휘가 §7.4:323("click/tap")과 §10 의 swipe-down 금지 외에 없다. ds 에는 `@media (hover: hover) and (pointer: fine)` 가 **단 한 규칙**에만 걸려 있다(blog 카드 hover 스킨, `catalog-components.css:281-287`). `touch-action` · `pointer: coarse` · `hover: none` 은 `docs/design/` 전체에서 **0건**.
- **터치 상태 피드백.** hover 가 없는 기기에서 normal 카드·태그·링크의 눌림(pressed/active) 피드백이 무엇인지 규정이 없다. README 가 일반 규칙으로 "Pressed: one more step in the same direction + a 0.5px nudge down"(`ds/README.md:124`)을 갖지만 design.md §4 어디에도 pressed 상태가 없다.
- **스크롤 관련 일체.** 스크롤 복원, sticky CTA, pull-to-refresh, 관성/overscroll, 스크롤 깊이 예산 — 전부 무언급. 실현 쪽에는 `overscroll-contain` 이 시트에 있다(`landing-grid-card.tsx:285`).
- **포커스가 sticky GNB 에 가려지는 문제 (WCAG 2.2 §2.4.11 Focus Not Obscured).** §6.9(276–279)는 링의 굵기·offset·따라갈 경계만 규정하고 **가려짐**을 다루지 않는다. 실현 쪽에서도 `scroll-padding-top` / `scroll-margin` 이 `src/` 전체에 **0건**인데 GNB 는 `sticky top-0 z-[1100]`(`site-gnb.tsx:38`)이고 모바일 높이 56px(§7.6:341)이다 — 키보드/포커스 이동으로 스크롤된 요소가 GNB 아래로 들어갈 수 있다. *브라우저에서 재현하지 않았다 — 미확인.*
- **확대/리플로우 (WCAG 1.4.4 / 1.4.10).** 320px 기준 리플로우, 200% 확대, 텍스트 간격 조정(1.4.12) 어느 것도 규정이 없다. 실현 reference width 는 390px 이다(§7.7:352).
- **모션 민감도의 나머지 (WCAG 2.3.3).** §8:376 이 `prefers-reduced-motion` 을 다루지만, 그것은 사용자 설정 축이고 2.3.3 이 요구하는 "인터랙션에 의한 모션을 끌 수 있게 하라"의 앱 내 스위치는 없다.
- **12개 로케일의 모바일 압력.** §4.11(116–117)은 한국어/영어 두 언어만 예로 들고, §7.6:345 가 12개 로케일 칩을 보존하라고만 한다. de/ru/pt 처럼 긴 문자열이 358px 카드에서 어떻게 되는지, hi/ja/zs/zt 의 line-height 요구가 무엇인지 규정이 없다.
- **썸네일의 모바일 해상도/용량 예산.** §4.9(107–108)와 §6.2(251–252)는 비율 `16 / 6` 과 톤만 말한다. D-08 로 10개 SVG 가 들어왔지만(`ds/README.md:30`) 모바일 성능 예산 규정은 없다.
- **모바일 expanded 의 타입 스케일.** §7.7:355 의 shell scale 문장은 Desktop/Tablet 만 말하고 모바일을 빠뜨린다. 그 사실을 채우는 문장은 design.md 가 아니라 `catalog-components.css:697-698` 에 있다.

## 9. ds/ 내부의 불일치·미해결 (착수 전에 알아야 할 것)

**⑴ `--chip-bg` 는 정의되지 않은 채 소비된다.** `catalog-components.css:749` 가 모바일 close 버튼 배경으로 `background: var(--chip-bg)` 를 쓰는데, `grep -rn -- "--chip-bg" docs/design/ds/` 결과가 **그 한 줄뿐**이다. 폴백도 없으므로 사양 시트에서 이 버튼 배경은 무효가 된다. (제품 쪽은 `bg-[var(--surface-strong)]` 를 쓴다 — `landing-grid-card.tsx:279`.)

**⑵ D-09(close 44×44)는 README 에서 닫혔는데 CSS 와 사양 카드는 아직 40 이라고 말한다.** `ds/README.md:31` 은 "Resolved 2026-09-07 (step 5) … `landing-grid-card.tsx:270` sets `min-h-[var(--tap-min)] min-w-[var(--tap-min)]`" 라고 적는다. 그러나 `catalog-components.css:735-738` 은 "**40 × 40 in the product**, against the 44 × 44 `design.md` §4.10 requires … The specimen renders what ships" 라고, `preview/card-mobile-expanded.html:77`·`:85` 는 "**40 × 40** ✗ … Raising it is a runtime change and belongs to the surface work" 라고 적는다. **제품은 44 다**(`landing-grid-card.tsx:278-279` 에서 직접 확인). 세 문서 중 둘이 낡았다.

**⑶ README D-09 의 행 번호가 HEAD 와 어긋난다.** README 는 `landing-grid-card.tsx:270` 을 인용하지만 `a5aec95` 에서 `:270` 은 `landing-grid-card-expanded-shell-frame` 클래스 상수이고, close 클래스는 `:278-279` 다(D-09 주석은 `:277`). 값은 맞고 줄 번호만 밀렸다.

**⑷ README Index 가 이 저장소에 없는 파일 4종을 가리킨다.** `ds/README.md:159` `vive-components.css` · `:173-174` `ui_kits/app/` · `ui_kits/catalog/` · `:184` 의 사용 예시가 `vive-components.css` 를 `<link>` 한다. 실제 `ds/` 에는 없다. `SYNC.md:32-36` 이 이를 설명한다 — 그 파일들은 Claude Design 쪽(`cd630eec`)에만 있고 미러 대상이 아니다(저장소 46 파일 / 프로젝트 82 파일, `SYNC.md:30`). **README 는 push 대상이므로 저 문장들은 그쪽에서는 참이고 이쪽에서는 거짓이다.** ds 파일을 읽고 작업하는 세션이 없는 파일을 찾게 된다.

**⑸ findings 표는 전 행 닫힘.** `ds/README.md:17` — "Every row is now closed — D-08, the last one open, was adopted and drawn on 2026-09-10." D-01·D-02·D-03·D-05·D-06·D-07·D-08·D-09·D-10·D-11·D-12 전부 Resolved. M-01 도 결정됨. **즉 ds 쪽에 열린 설계 결정은 없다** (프로젝트 메모리의 `ds/README findings 표는 열린 행이 없다` 항목과 일치).

**⑹ 대비 감사는 자동 게이트 밖이다.** `SYNC.md:105` — "Nothing in the repository's gates renders this bundle, so a contrast failure here is invisible to every automated check." 2026-09-07 수동 감사에서 418건 실패, 415건이 `--fg3`/`--fg4` 를 caption ink 로 쓴 한 패턴. `tests/unit/design-tokens-dark-parity.test.ts` 가 그 패턴을 정적으로 금지하지만 대비 자체는 측정하지 못한다.

**⑺ `ds/**` 는 Ask-First 이고 편집이 저장소 밖으로 나간다.** `AGENTS.md §4` 와 `SYNC.md:9` — 저장소가 내용을 소유하고 Claude Design 으로 **단방향 push** 한다. 이번 리팩터가 토큰 값을 건드리면 push 절차(`list_files` → `finalize_plan` → `write_files`, `SYNC.md:69`)가 따라온다.

## 10. 미확인 (결함보다 값진 정보)

- **뷰포트 1208–1279 구간의 "wide 컬럼 + 20px gutter"** — 클래스·상수에서 유도했을 뿐 브라우저 측정을 하지 않았다.
- **정지 OPEN 상태의 배경 스크롤 거동** — `use-mobile-scroll-lock.ts:5-7` 이 OPENING/CLOSING 에만 잠근다는 것은 확정. 그 결과 사용자가 무엇을 보는지는 미측정.
- **`calc(100dvh-116px)` 의 116px 출처** — 소스에 주석·상수·토큰이 없다. GNB 56 + α 로 추정되나 확인하지 못했다.
- **포커스가 sticky GNB 에 가려지는지 (WCAG 2.4.11)** — `scroll-padding-top` 부재와 GNB `sticky z-[1100]` 은 확정. 실제 가려짐은 재현하지 않았다.
- **`--dur-base`/`--dur-expand` 값 갈림의 `decision-register.md` 등재 여부** — BQ-38 의 3건에 없다는 것까지만 확인했고 register 원문을 열지 않았다.
- **ds 토큰 총수 190 vs `globals.css:62-70` 의 198** — 세는 방식 차이로 보이나 파리티 가드의 카운트 규칙을 열어보지 않았다.
- **`preview/` 25장 중 24장의 본문** — 카드 마커만 전수 확인했다. `test-flow.html`·`secondary-surfaces.html` 이 mobile 어휘 0회라는 사실은 grep 으로 확정했지만, 그 카드들이 무엇을 설계했는지는 읽지 않았다.
- **`docs/design/resources/` 스크린샷 3장** — §9 Resource Manifest 가 "Mobile browse / Mobile expanded / Mobile menu" 를 전부 "Missing locally"(design.md:400-402)로 적고 있어 모바일 참조 이미지가 저장소에 없다는 것은 확정. 데스크톱 3장은 열지 않았다.
