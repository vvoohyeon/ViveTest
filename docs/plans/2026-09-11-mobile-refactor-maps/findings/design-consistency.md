# design-consistency — `docs/design/design.md` 의 원칙과 실제 구현의 어긋남

조사 대상: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis`(이 세션 전용 clone). 모든 `file:line` 은 이 체크아웃 기준이며 저장소 파일은 수정하지 않았다(`git status --porcelain` 빈 출력 확인).

## 0. 읽은 것 / 읽지 않은 것 / 잰 것

전문을 읽었다: `docs/design/design.md`(444줄) · `src/app/globals.css`(431줄) · `src/features/landing/grid/landing-grid-card.tsx` 의 클래스 상수 구간(195–300)과 루트 조립 구간(960–1075)·모바일 본문(1225–1300) · `src/features/landing/grid/landing-grid-card.module.css`(1–140, 197–245) · `src/features/gnb/site-gnb.tsx`(1–150, 368–470) · `src/features/gnb/components/settings-controls.tsx`(1–125) · `src/features/ui/button-class-names.ts`(전문) · `src/features/test/surface-class-names.ts`(전문) · `src/features/blog/blog-destination-client.tsx`(1–70) · `src/features/landing/shell/page-shell.tsx`(전문) · `src/app/app-body-class.ts` · `src/app/not-found.tsx` · `src/app/global-not-found.tsx` · `src/app/[locale]/history/page.tsx` · `src/app/[locale]/test/error/page.tsx` · `src/app/[locale]/page.tsx` · `src/features/test/instruction-overlay.tsx`(1–60, 140–160) · `src/features/test/test-question-client.tsx`(40–110) · `src/features/landing/shell/consent-banner.tsx`(1–60, 228–262) · `docs/design/ds/app-components.css`(1–60, 200–250, 380–450, 470–660) · `docs/design/ds/catalog-components.css`(685–790) · `docs/design/ds/colors_and_type.css`(토큰 선언 구간) · `docs/design/ds/README.md`(108–150) · `docs/decision-register.md`(349–530, `ds-parity-allowlist` 표) · `scripts/qa/check-design-token-parity.mjs`(1–50).

실행해서 잰 것(추정이 아니다):

- **Tailwind v4.1.0 emit 순서 프로브** — `@tailwindcss/postcss` 로 실제 컴파일해 경쟁 유틸리티의 승자를 확정했다. 스크립트: `/private/tmp/claude-501/-Users-woohyeon-Local-ViveTest/91a75431-b18f-466b-8d47-1b306568872a/scratchpad/analysis/dc3.mjs`(높이·반경·패딩) · `dc4.mjs`(`min-h` 3종 + hover/active 랩핑) · `dc5.mjs`(arbitrary breakpoint 의미론).
- **대비·합성 계산** — `design.md` §7.6 이 지정한 활성 칩 잉크와 실현값, scrim 두 강도, 폴백 썸네일의 다크 합성색. 계산은 WCAG 상대휘도 공식 그대로이고 위 디렉터리에서 실행했다.

읽지 않았다: `docs/req-landing.md` 는 §6.1–§6.4 와 §6.2 그리드 규칙만 확인했고 §8 이후는 이 렌즈 밖이라 열지 않았다 · `docs/design/ds/preview/**` 25장 중 `card-mobile-expanded.html` 외 · `docs/design/resources/**` 스크린샷 · `tests/e2e/**` 본문(파일명·앵커만 확인).

**브라우저를 띄우지 않았다.** 아래의 모든 픽셀·기하 주장은 컴파일된 CSS·클래스 문자열·토큰 사슬에서 유도한 것이며, 기기 렌더가 필요한 항목은 각 절에 「미측정」으로 표시했다.

## 1. 한 줄 결론

**이 저장소의 시각 계약은 §5 토큰 한 층만 기계로 지켜지고 있고, §4 Foundations · §6 Components · §7 Patterns · §10 Never Reintroduce 네 층은 자동 검사가 하나도 없다.** `scripts/qa/check-design-token-parity.mjs`(주석 5–24행)가 스스로 밝히듯 그 검사는 `design.md` §5 ↔ `ds/colors_and_type.css` 의 light `:root` 만 대조하고, `tests/unit/design-tokens-dark-parity.test.ts` 는 `globals.css` 의 `@mirror-*` 구간만 본다. 열세 개 `scripts/qa/check-phase*.mjs` 전체에서 `design.md` 문자열이 **0회** 등장한다(grep 확인). 그래서 아래 결함들은 「놓친 것」이 아니라 **구조적으로 볼 수 없는 자리에 있는 것**이고, 모바일 리팩터가 이 네 층을 건드리는 이상 같은 종류가 다시 쌓인다.

그리고 토큰 계층에는 뷰포트 축이 **하나**밖에 없다 — `--shell-gutter`(`src/app/globals.css:323`·`:326-330`·`:332-336`). 나머지 반응형 값은 전부 Tailwind 브레이크포인트 리터럴이거나 arbitrary variant 리터럴이거나 JS 분기이며, 그 셋이 서로 다른 다섯 개의 임계값을 쓴다.

## 2. §4 Foundations 11개 원칙 — 모바일 구현 판정

| § | 원칙이 요구하는 것 | 모바일 구현 판정 | 근거 |
|:---|:---|:---|:---|
| 4.1 Visual personality | 「마케팅 히어로 밴드 없음, 카드 카탈로그가 정체성」 | **위반** | `src/app/[locale]/page.tsx:28-31` 이 `<section className="landing-hero">` 에 24–35.2px h1 + 본문 한 줄을 렌더한다 → §D-01 |
| 4.2 Product voice | sentence case · 판매 언어 금지 | **위반(카피)** | `src/messages/en.json` `landing.heroTitle` = "Find your working rhythm in one pass" → §D-01 |
| 4.3 Typography | 「**Global** wrapping rule: `word-break: keep-all; overflow-wrap: anywhere`」 | **부분 위반** | 9개 원소에 개별 선언, 확장 시트 제목·블로그 본문·동의 배너·히스토리·404 는 빠짐 → §D-11 |
| 4.4 Color | 웜 뉴트럴 · sage 단일 accent · 네온/차가운 파랑 금지 | **위반(썸네일)** | 카탈로그 썸네일 10장 전부 라이트 전용 hex, 다크에서 회록색 블록 → §D-10 |
| 4.5 Spacing | 4px 기본 단위 · 카드 내부 패딩 16px | **부분 위반** | `min-h-[46px]`·`py-[7px]`·`px-[11px]`·`max-[719px]:p-[14px]`·`gap-[15px]` 가 4px 밖. 16px 은 세 철자로 존재 → §D-14, §D-16 |
| 4.6 Radius | 「모바일 메뉴 패널은 extra-large radius」 | **위반** | 드로어 반경 0, 설정 레이어 12px, 지시 다이얼로그 24px → §D-06 |
| 4.7 Elevation | 「true overlays(모바일 시트, 메뉴)는 가장 깊은 단계」 | **위반** | 모바일 확장 시트 `[box-shadow:none]`(`landing-grid-card.tsx:1021-1022`) → §D-03 |
| 4.8 Motion | bounce/spring/parallax/tilt 금지 · reduced-motion 존중 | **금지선은 준수, 어휘는 이탈** | 금지 항목 위반 0. 다만 전이 12곳이 시스템에 없는 `ease` 키워드를 쓴다 → §D-17 |
| 4.9 Imagery | 웜 뉴트럴/sage 계열 저채도 | 준수(라이트) / **다크 미해결** | §D-10 |
| 4.10 Accessibility | 포커스 링 항상 가시 · choices·Read more·close·hamburger 44×44 | **부분 위반** | 모바일 닫기 버튼만 시스템 링이 없다 → §D-04. 44px 자체는 충족(프로브로 확인) |
| 4.11 Localization | keep-all + overflow-wrap | §4.3 과 동일 위반 | §D-11 |

§4.10 에 대해서만 반가운 정정: 사전 조사에서 미확인으로 남아 있던 「모바일 칩이 실제로 44px 인가」는 **충족**이다. `dc4.mjs` 프로브 결과 `.min-h-[var(--tap-min)]`(171행)이 `.min-h-8`(168행)보다 **뒤에** emit 되므로 `settings-controls.tsx:116`·`:118` 의 드로어 칩은 44px 로 계산된다. 같은 이유로 `buttonQuietClassName`(`button-class-names.ts:109`)의 `min-h-[var(--tap-min)]` 도 `buttonShapeClassName` 의 `min-h-[46px]` 를 이겨 44px 가 된다 — 두 파일의 주석이 적은 「실측」과 일치한다.

## 3. §5 토큰 — 리터럴로 우회한 지점 전수

### 3-A. 색

`src/` 전체에서 globals.css 밖의 색 리터럴은 **두 곳**뿐이고 둘 다 썸네일이다: `landing-grid-card.tsx:175` 의 `fill="#e8f0ec"` 와 `public/landing-card-media/*/thumbnail.svg` 10장(7종 hex, `data-drawn-against="#fbfaf7"` 속성이 라이트 기준임을 스스로 적는다). 나머지 색은 전부 `var()` 사슬이다 — theme cut 이 실제로 끝냈다.

### 3-B. 반경

| 자리 | 실현 | 있어야 할 토큰 |
|:---|:---|:---|
| 카드 루트 | `[--landing-card-radius:16px]`(`landing-grid-card.tsx:213`) | `var(--radius-lg)`(globals.css:191, 값 동일) |
| 확장 선택지 | `rounded-[12px]`(`landing-grid-card.tsx:235`) | `var(--radius-md)`(globals.css:190, 값 동일) |
| 설정 레이어 | `rounded-b-[12px]`(`site-gnb.tsx:75`) | §6.8 은 `--radius-xl` 을 요구 |
| 드로어 링크 | `rounded-[8px]`(`site-gnb.tsx:101`) | `--radius-sm`(ds `colors_and_type.css:294`, **런타임 미미러**) |
| 모든 pill | `rounded-full`(9개 자리) | `--radius-pill`(ds `:299`, **런타임 미미러**) |

`--radius-sm` 과 `--radius-pill` 은 설계 정의에는 있고 런타임 토큰 층에는 없다. `globals.css:62-70` 의 미러 규칙(「런타임이 실제로 소비하는 이름만」)이 그 결과다.

### 3-C. 타이포 — 토큰 23회 대 리터럴 25회

`[font:var(--…)]` 소비는 23회(`--body-sm` 7 · `--caption` 4 · `--t-choice` 3 · `--t-expanded-question` 2 · `--overline` 2 · `--t-card-title`/`--t-card-subtitle`/`--label`/`--button`/`--body` 각 1)인 반면, 역할을 리터럴로 다시 적은 자리가 25회다(전수 grep):

- `text-[13px] font-medium leading-[1.35]` ×4 — `landing-grid-card.tsx:230`(태그 칩, line-height 는 module.css:134) · `:243`(메타 행) · `:504`(Read more) · `:537`(Read more **측정 프로브**). 이 값은 ds `--t-tag: 500 13px/1.35`(`colors_and_type.css:496`)와 정확히 같다.
- `text-[13px] font-semibold leading-[1.45]` ×2 — `test-question-client.tsx:64`(진행률 값) · `surface-class-names.ts:93`(자격 칩). ds 는 이것을 `font: var(--caption); font-weight: 600` 으로 **조합**한다(`app-components.css:396`·`:576`).
- `text-[15px] font-semibold leading-[1.45]` ×1 — `blog-destination-client.tsx:47`(목록 행 제목). §5.1 에 없는 역할이다.
- rem 기반 4종 — `text-[0.78rem]`(`site-gnb.tsx:98`·`settings-controls.tsx:18`) = 12.48px · `text-[0.8rem]`(`settings-controls.tsx:29`) = 12.8px · `text-[0.88rem]`(`site-gnb.tsx:64`) = 14.08px · `text-[0.96rem]`(`site-gnb.tsx:50`) = 15.36px. §5.1 의 px 사다리(12·13·14·15·16·20·21·30) 어디에도 없는 네 값이고, 이들만 사용자 기본 글꼴 크기에 따라 움직인다.
- `text-[clamp(1.5rem,2.4vw,2.2rem)]`(`src/app/[locale]/page.tsx:29`) — 제품 유일의 뷰포트 단위 타입.

**그리고 미러 제외 사유가 사실이 아니다.** `globals.css:67-70` 은 `--t-tag`·`--t-context-label`·`--t-eyebrow` 를 「이 제품에 reader 가 없다」는 이유로 미러에서 뺐다고 적는다. 그런데 `--t-tag` 의 값은 위 4곳에 글자 그대로 적혀 있고, `--t-context-label`(500 14px/1.4)의 값은 `--label`(globals.css:209, 같은 값)이라는 다른 이름으로 2곳에서 소비된다. reader 가 없는 것이 아니라 **이름 없이 소비되고 있다**.

### 3-D. 모션 — 180ms 에는 런타임 토큰이 없다

`ms` 리터럴 census(테스트 제외): `140ms` 10회(토큰 `--dur-fast` 존재) · **`180ms` 7회**(`site-gnb.tsx:38`·`:82`·`:87`×3 · `landing-catalog-grid.tsx:31` · `landing-grid-card.module.css` 1회) · `280ms` 2회(토큰 `--dur-slow` 존재) · 카드 module.css 의 stagger 20/40/80/100/140/160ms.

180ms 는 ds 가 `--dur-base`(`colors_and_type.css:353`)로 이름을 갖고 있고 ds README 가 「general UI and the reduced-motion core」라고 사다리에 올려 둔 값인데, `globals.css` 는 그것을 미러하지 않았다. 그래서 **제품에서 가장 많이 쓰이는 UI 지속값이 유일하게 토큰이 없는 값**이 됐고, 모바일에서 그 값을 쓰는 자리가 정확히 GNB 바 · 드로어 · 드로어 backdrop · 카드 backdrop 이다.

### 3-E. 간격·폭 — 컨테이너 세 값이 리터럴

`max-w-[1280px]` ×3(`page-shell.tsx:22` · `site-gnb.tsx:39` · `consent-banner.tsx:241`) — ds `--container: 1280px`(`colors_and_type.css:370`) reader 0. `max-w-[760px]` ×1(`blog-destination-client.tsx:29`) — ds `--container-narrow`(`:371`)는 `[not realized]` 주석을 달고 있는데 값은 실현돼 있다. `max-w-[460px]` ×4 · `max-w-[520px]` ×2 — 대응 토큰 없음. `--card-pad`·`--choice-pad`·`--tag-pad`·`--space-*` 전부 런타임 reader 0.

## 4. §6 Reusable Components 10종 — 정의 대 구현

| § | 컴포넌트 | 판정 | 요지 |
|:---|:---|:---|:---|
| 6.1 Base card | 준수(반경만 리터럴) | 면·테두리·그림자·16px 패딩 일치. 단 같은 선언 묶음이 **6개 파일에 따로** 적혀 있다 → §D-12 |
| 6.2 Thumbnail | 준수 | `aspect-[16/6]` + `--radius-md` + clip 일치 |
| 6.3 Tag / chip | 값 준수 / 타입은 리터럴 | §3-C |
| 6.4 Button / choice-button | **세 벌로 갈라짐** | 랜딩 선택지(`landing-grid-card.tsx:235`, 반경 리터럴·`focusRingClassName` 미사용) · 테스트 선택지(`surface-class-names.ts:83`) · 블로그 목록 행(`blog-destination-client.tsx:43`) 이 같은 프리미티브를 각자 적는다 |
| 6.5 Pill | 토큰 없음 | `--radius-pill` 미미러, 전부 `rounded-full` |
| 6.6 Settings trigger | **위반** | 「hover 가 `--surface-muted` 를 집는다」인데 제품은 **쉴 때 이미** `--surface-muted` 다 → §D-07 |
| 6.7 Navigation surface | 준수 | sticky·translucent·blur·스크롤 시 hairline 일치 |
| 6.8 Menu panel | **위반** | `--radius-xl` 이 어느 패널에도 없다 → §D-06. scrim 강도도 이탈 → §D-09 |
| 6.9 Focus ring | **부분 위반** | 링이 세 철자로 존재하고, 모바일 닫기 버튼만 링이 **없다** → §D-04 |
| 6.10 Meta row | **정의가 둘을 겹친다** | 같은 절을 인용하는 두 구현이 레이아웃·타입·구분자 어느 것도 공유하지 않는다 → §D-19 |

## 5. §7 Patterns — 7.7 / 7.8 실측 대조

### 5-A. §7.7 Responsive catalog

컬럼 규칙(1160/1040 임계, 3→4 / 2→3 / 2→2 / mobile 1)과 shell scale(1.04 / desktop desire 1.10 / tablet 1.04)은 `layout-plan.ts:8-11`·`:81-109`·`:126-130` 과 정확히 일치한다. **어긋나는 것은 gutter 축 하나다.**

`landing-catalog-grid.tsx:211`·`:221` 의 `gap-[15px] md:gap-5 xl:gap-6` 는 뷰포트 브레이크포인트를 쓰고(프로브 확인: `md` = `width >= 48rem`, `xl` = `width >= 80rem`), tier 판정은 `TABLET_MAX_VIEWPORT_WIDTH = 1023`(`layout-plan.ts:2`)이다. 따라서 **뷰포트 1024–1279 구간은 tier 가 `desktop` 인데 gutter 는 20px(tablet 값)** 이다 — §7.7 의 「24px desktop · 20px tablet」과 정면으로 어긋나는 256px 폭의 구간이다. 사전 조사가 지목한 1208–1279 구간(wide 컬럼 + tablet gutter)은 이 구간의 부분집합이며, 더 넓은 쪽이 진짜 경계다.

### 5-B. §7.8 Mobile expanded visual — 5개 조항

| 요구 | 실현 | 판정 |
|:---|:---|:---|
| Full viewport width, no side margin | `w-screen mx-[calc(50%-50vw)]`(`landing-grid-card.tsx:1042`) | ✓ |
| A scrim dims the grid beneath | `bg-[var(--overlay-scrim-medium)]`(`landing-catalog-grid.tsx:31`) | ✓ |
| Visible close button (top right) | `landing-grid-card.tsx:1237-1246`, 44×44 | ✓ (링만 없음, §D-04) |
| No left/right card radius | `rounded-none`(`:1042`) | ✓ |
| top edge **flush to the GNB bottom** | 앵커가 GNB 가 아니라 카드 자신의 `rect.top`(`mobile-card-lifecycle-dom.ts:23`) | ✗ |
| a **`--sage` bottom edge** anchors it | 체인 전체에 border 가 없다 | ✗ → §D-03 |

§7.3 의 「The expanded card uses exact `--canvas-elevated`, a `--sage` edge, and `--shadow-expanded`」는 tier 를 한정하지 않는다. 데스크톱 오버레이는 `--expanded-card-border`(=`--accent`)와 `--expanded-card-shadow`(=`--shadow-expanded`)를 둘 다 갖는데(`landing-grid-card.tsx:274`·`:276`), 모바일 정지 OPEN 은 `[background:var(--expanded-card-surface)] [box-shadow:none]`(`:1021-1022`)뿐이다. **같은 §7.3 조항 하나가 데스크톱에서는 실현되고 모바일에서는 셋 중 하나만 실현된다.**

## 6. §10 Never Reintroduce 16개 — 위반 여부

전수 grep 으로 확인했다. **제품이 실제로 렌더하는 위반은 0건**이다: `PREVIEW QUESTION` 라벨 0 · A/B 레터 배지 0 · 카드 eyebrow 0 · dashed pill 0 · coming soon 내부 dot 0 · 태그 color dot 0(`variant-registry/types.ts` 에 `color` 필드 없음) · 데스크톱 햄버거 0(`md:hidden`) · Read more 밑줄 0(`no-underline`) · Normal test card hover 스킨 0(hover 스킨은 `.root.blogCard` 에만) · unavailable 제목/부제 opacity 감소 0(`.root.unavailableCard .normalThumbnail` 만) · 다크모드 placeholder 문구 0 · 모바일 메뉴 `Catalog` 항목 0 · `layoutId`/`LayoutGroup` 0 · swipe-down 0.

남는 것은 둘이고 둘 다 「문서 대 문서」다:

- **`min-height: 100%` 가 확장 오버레이 체인 세 원소에 선언돼 있다.** `landing-grid-card.tsx:270`·`:272`·`:276` 의 `min-h-full` 이고, `landing-grid-card.module.css:236-241` 의 `.root.desktopOverlayLayer .expandedShellFrame/.expandedShell/.expandedSurface { min-height: 0; height: auto; }` 가 그것을 다시 0 으로 되돌린다. 세 원소는 `showDesktopExpandedShell` 안에서만 렌더되므로 현재 실효는 없지만, **금지된 선언이 금지된 원소 위에 남아 있고 다른 파일의 취소 규칙 하나가 그것을 막고 있다** → §D-21.
- **「Desktop gear / settings icon」 조항이 §7.6 과 정면으로 모순한다.** §7.6:339 는 D-11 정정으로 데스크톱 settings trigger 를 **요구**하고 제품이 실현한다(`site-gnb.tsx:66`). §10 은 고쳐지지 않았다 → §D-20.

## 7. 결함 상세

### D-01 — 랜딩이 §7.1 이 금지한 히어로 밴드를 렌더한다 (major · landing)

`src/app/[locale]/page.tsx:28-31`:

```tsx
<section className="landing-hero grid gap-3 py-5 pb-4" aria-label="Landing Hero">
  <h1 className="m-0 text-[clamp(1.5rem,2.4vw,2.2rem)] leading-[1.2] tracking-[-0.01em]">{t('heroTitle')}</h1>
  <p className="m-0 max-w-[70ch] text-[var(--ink-body)]">{t('heroBody')}</p>
</section>
```

`design.md:305-309` §7.1 은 「**No hero.** No marketing band, no large headline, no illustration band.」 와 「A single **minimal eyebrow** line (brief service description + **catalog count**) … it must read as utility, not a banner」 를 함께 적는다. §4.1:71 이 같은 규칙을 정체성 차원에서 되풀이한다. 실현된 것은 그 반대다 — 클래스 이름이 `landing-hero` 이고, `heroTitle` 은 `"Find your working rhythm in one pass"`(`src/messages/en.json`)라는 판매 문장이며(§4.2 「no sales language」), 카탈로그 개수는 어디에도 없다.

타입도 시스템 밖이다. `clamp(1.5rem, 2.4vw, 2.2rem)` 은 제품 유일의 뷰포트 단위 타입이고, 390px 에서 `2.4vw` = 9.36px 이므로 하한 **24px** 로 고정된다 — `--h1`(30px)도 `--h3`(20px)도 아닌 값이다. 본문 `<p>` 는 `[font:…]` 역할을 갖지 않아 body 상속 16px/1.5 로 렌더된다.

`docs/req-landing.md:213-214` §6.3 이 「Hero는 입력 없는 정보 영역이며 outline/border/stroke를 사용하지 않는다」 한 줄을 갖지만, 같은 문서 §6.2:194 는 `hero/main` 을 **row index 규칙**으로만 해석하라고 못박는다 — 즉 req-landing 의 hero 는 그리드 1행이고 이 밴드가 아니다. 두 문서 중 어느 쪽도 이 형태를 승인하지 않는다.

모바일 비용: 기존 실측 「390px 첫 카드 top 315px」 중 이 섹션이 `py-5 pb-4`(20+16) + h1 두 줄(24×1.2×2 ≈ 58) + gap 12 + 본문(i18n 맵 실측 89–166px 스프레드)로 대부분을 차지한다.

**제안** — 두 갈래를 계약 차원에서 먼저 가른다. ⑴ §7.1 을 따르기로 하면 밴드를 `--caption`/`--muted-aa` 한 줄 유틸리티 텍스트(서비스 설명 + 카탈로그 개수)로 교체하고 `clamp()` 타입을 제거한다. ⑵ 헤드라인을 유지하기로 하면 §7.1 의 「No hero / minimal eyebrow」 세 줄과 §4.1:71 을 개정하고, 타입을 `--h1`(또는 신설 모바일 단계)으로 고정해 뷰포트 단위를 없앤다. **결정 없이 현행을 두는 것만은 안 된다** — 문서와 코드가 서로를 부정하는 상태가 가장 비싸다.

### D-02 — GNB 드로어의 `100dvh` 선언이 무효다 (blocker · gnb)

`site-gnb.tsx:87` 의 패널 클래스는 같은 속성을 두 번 정한다:

```
h-screen max-h-screen w-[min(87vw,340px)] … [height:100dvh] [max-height:100dvh]
```

둘 다 단일 클래스 선택자라 명시도가 같고, 승자는 Tailwind 의 emit 순서가 정한다. 프로브(`dc3.mjs`, tailwindcss 4.1.0 실제 컴파일) 결과:

```
  156 .\[height\:100dvh\] {
  159 .h-screen {
  162 .\[max-height\:100dvh\] {
  165 .max-h-screen {
```

`.h-screen`(= `height: 100vh`)과 `.max-h-screen`(= `max-height: 100vh`)이 **뒤에** emit 되므로 둘 다 이긴다. 저장소는 이 함정을 이미 네 번 기록했고(`button-class-names.ts:16-17`·`:48-50` · `settings-controls.tsx:32-37` · `globals.css:314-321`), `--shell-gutter` 를 토큰으로 만든 이유가 정확히 같은 사고였는데 드로어에서는 잡히지 않았다.

결과: iOS Safari 에서 `100vh` 는 툴바가 접힌 상태의 큰 뷰포트(lvh)이므로, 툴바가 보이는 동안 패널 상자는 보이는 영역보다 (lvh − svh) 만큼 아래로 내려간다. 그리고 드로어의 설정 블록은 `mt-auto`(`site-gnb.tsx:104` `gnbMobileSettingsClassName`)로 패널 **바닥에 고정**돼 있다 — 테마 칩 2개와 12개 로케일 칩이 그 아래쪽에 놓인다. 패널 내용이 100vh 를 넘지 않으면 `overflow-y-auto` 는 스크롤할 것이 없으므로, 화면 밖으로 밀린 부분에 도달할 경로가 없다.

같은 저장소의 다른 오버레이는 `dvh` 를 제대로 쓴다 — `landing-grid-card.tsx:285`·`:292`·`:296` 의 `max-h-[calc(100dvh-116px)]` 에는 경쟁 클래스가 없어 `dvh` 가 그대로 적용된다. **한 제품 안에서 한 오버레이는 dvh 로, 다른 오버레이는 vh 로 렌더된다.**

미측정: 실기기에서 잘리는 정확한 px 과 로케일별 칩 줄 수. 기기 렌더가 필요하다.

**제안** — `h-screen max-h-screen` 두 유틸리티를 클래스 문자열에서 **삭제**하고 `[height:100dvh] [max-height:100dvh]` 만 남긴다(경쟁이 사라지면 emit 순서가 결과를 바꿀 수 없다). 동시에 `min-h-screen` 3곳(`page-shell.tsx:19` · `app-body-class.ts:19` · `not-found.tsx:11`·`global-not-found.tsx:18`)도 `[min-height:100dvh]` 로 통일해 뷰포트 높이 어휘를 하나로 만들고, 그 값을 `--viewport-h` 같은 토큰으로 승격해 다음 사고를 막는다.

### D-03 — 모바일 확장 시트만 §7.3 의 세 요구 중 하나만 실현한다 (major · landing)

`design.md:317` §7.3: 「The expanded card uses exact `--canvas-elevated`, a `--sage` edge, and `--shadow-expanded`.」 `design.md:102` §4.7: 「true overlays (mobile sheet, menu) use the deepest step.」 `design.md:364` §7.8: 「a `--sage` bottom edge anchors it.」

실현: `landing-grid-card.tsx:1021-1022` 가 모바일 정지 OPEN 의 시각 클래스를 `[background:var(--expanded-card-surface)] [box-shadow:none]` 으로 두고, `:1042` 가 `rounded-none w-screen min-h-0 mx-[calc(50%-50vw)]` 를 더한다. 테두리 선언이 체인 어디에도 없다 — `--expanded-card-border: var(--accent)`(`landing-grid-card.module.css:72`)는 데스크톱 surface(`landing-grid-card.tsx:276`)만 소비한다.

그래서 모바일에서 전면 시트와 그 아래 그리드를 가르는 것은 scrim 하나뿐이고, 시트 자신의 경계는 시각적으로 없다. 다크에서는 이것이 더 나쁘다 — `app-components.css:54-60` 과 `design.md:274` §6.8 이 측정으로 적어 둔 대로, 근검정 지면 위에서 scrim 은 1.04:1 밖에 어둡게 하지 못하므로 **오버레이의 모서리가 분리를 담당해야 하는데 그 모서리가 없다.** 같은 제품의 GNB 드로어와 설정 레이어와 지시 다이얼로그는 셋 다 `--border-strong` 모서리를 갖는다(`site-gnb.tsx:87`·`:75` · `surface-class-names.ts:45`).

`preview/card-mobile-expanded.html:85` 는 이 간극을 「Wave 13 이 구현되지 않았고 BQ-38 이 대체했으므로 고칠 결함이 아니라 디자인 패스의 입력」이라고 처분해 두었다. 이번 리팩터가 그 디자인 패스다.

**제안** — 모바일 OPEN 시각 클래스를 `[background:var(--expanded-card-surface)] [border-top:1px_solid_var(--expanded-card-border)] [border-bottom:1px_solid_var(--expanded-card-border)] [box-shadow:var(--shadow-overlay)]` 로 바꾼다. 좌우 테두리는 `w-screen` 이라 화면 밖이므로 상하만 긋는 것이 §7.8 의 「reads as chrome, not a floating card」 와 §4.7 의 「deepest step」 을 동시에 만족한다. `--sage` 를 쓰라는 §7.8 문면은 `--expanded-card-border` 사슬(→ `--accent`)이 이미 만족한다.

### D-04 — 모바일 닫기 버튼만 시스템 포커스 링이 없다 (major · landing)

`landing-grid-card.tsx:278-279`:

```
'landing-grid-card-mobile-close relative inline-flex min-h-[var(--tap-min)] min-w-[var(--tap-min)] shrink-0 basis-auto items-center justify-center rounded-full border border-[var(--hairline-strong)] bg-[var(--surface-strong)] p-0 font-semibold [color:var(--ink)]'
```

`focus-visible:` 선언도, `focusRingClassName` 참조도, hover 도, active 도, transition 도 없다. 제품의 다른 인터랙티브 컨트롤은 전부 링을 갖는다 — `focusRingClassName` 소비 4곳(`site-gnb.tsx:64` · `settings-controls.tsx:29` · `surface-class-names.ts:83`·`:93`)과 인라인으로 같은 값을 다시 적은 2곳(`landing-grid-card.tsx:235` · `blog-destination-client.tsx:45`). **이 버튼 하나만 UA 기본 링에 맡겨져 있다.**

`design.md:276-278` §6.9 는 「A 2px `--focus-ring` outline with a 2px offset on `:focus-visible`. Always visible; never removed.」 이고 §4.10:111 이 같은 것을 foundation 으로 못박는다. UA 기본 링은 브라우저마다 다르고 다크 테마에서 `--surface-strong` 위에 어떻게 보일지 시스템이 통제하지 못한다.

부수적으로 이 버튼은 링이 셋으로 갈라진 자리이기도 하다 — `focusRingClassName` 한 벌 · `landing-grid-card.tsx:235` 가 `var(--expanded-choice-accent)` 로 다시 적은 것 · `blog-destination-client.tsx:45` 가 `var(--focus-ring)` 로 다시 적은 것. 세 값은 현재 전부 `--sage-500`(다크 `--sage-400`)으로 같지만 같게 유지할 장치가 없다.

**제안** — `LANDING_GRID_CARD_MOBILE_CLOSE_BASE_CLASSNAME` 에 `${focusRingClassName}` 과 `hover:bg-[var(--surface-sunken)] active:bg-[var(--surface-strong)]` + `${skinTransitionClassName}` 을 붙인다(= GNB pill 과 같은 처리). 그리고 `landing-grid-card.tsx:235` 와 `blog-destination-client.tsx:45` 의 인라인 링 두 벌을 `focusRingClassName` 으로 수렴시켜 링 정의를 한 곳으로 되돌린다.

### D-05 — 모바일 확장 시트에서 포커스 링이 전면 카드를 두른다 (major · landing)

`landing-grid-card.module.css:81-84`:

```css
.root:not(.desktopOverlayLayer):has(:focus-visible) {
  outline: 2px solid var(--normal-focus-ring);
  outline-offset: 2px;
}
```

데스크톱 확장에는 이 규칙을 비켜 가는 전용 경로가 있다 — `:211-218` 이 루트의 링을 끄고 `.expandedSurface` 로 옮긴다. **모바일 확장에는 대응 규칙이 없다.** `styles.desktopOverlayLayer` 는 `isDesktopOverlayLayer = showDesktopExpandedShell`(`landing-grid-card.tsx:1009`)일 때만 붙으므로 모바일 OPEN 루트는 `:not(.desktopOverlayLayer)` 쪽에 들어간다.

그래서 모바일 시트 안의 어떤 컨트롤(닫기 버튼, 선택지 A/B)에 키보드 포커스가 가면 **`w-screen` 인 카드 루트 전체에 2px sage outline 이 offset 2px 로 그려진다.** 좌우 변은 뷰포트 밖이라 보이지 않고 상하 변만 보인다. 동시에 선택지는 자기 링도 갖고 있으므로(`landing-grid-card.tsx:235`) 같은 색 링이 두 겹으로 나타난다.

§6.9 는 링이 「the visible expanded-surface boundary」 를 따르라고 하는데, 전면 시트에서 그 경계는 뷰포트를 넘는다 — 조항이 모바일 전면 형태를 상정하지 않은 자리다.

미측정: 두 겹 링의 실제 렌더. 구조는 확정이고 화면은 확인하지 않았다.

**제안** — `.root.mobileExpanded:has(:focus-visible)` 대응 규칙을 신설해 루트 outline 을 끄고, 링을 포커스된 컨트롤 자신에게 맡긴다(닫기 버튼은 D-04 로 링을 얻는다). 동시에 §6.9 를 「Normal 에서는 카드 셸 경계, Expanded 에서는 **포커스된 컨트롤** 경계」로 개정한다 — 전면 시트에는 「확장 표면 경계」라는 시각 대상이 존재하지 않는다.

### D-06 — 오버레이 패널 반경이 세 값이고, 계약값을 쓰는 것은 하나뿐이다 (major · gnb, test)

`design.md:98-99` §4.6: 「the mobile menu panel uses the **extra-large** radius」. `design.md:272` §6.8: 「An overlay panel on `--surface-raised` at **`--radius-xl`** with the deepest overlay shadow」.

| 패널 | 반경 | 근거 |
|:---|:---|:---|
| 모바일 드로어 | **없음**(선언 0) | `site-gnb.tsx:87` |
| 데스크톱 설정 레이어 | `rounded-b-[12px]` | `site-gnb.tsx:75` |
| 지시 다이얼로그 | `rounded-[var(--radius-xl)]` | `surface-class-names.ts:45` |

세 패널 모두 §6.8 이 한 문장으로 규정하는 대상이고(`--surface-raised` + `--border-strong` + `--shadow-overlay` 는 셋 다 맞춘다), 반경만 24 / 12 / 0 으로 갈린다. `ds/app-components.css:484-496` 의 `.vt-drawer` 도 반경을 적지 않으므로 설계 정의 안에서도 §4.6·§6.8 과 `.vt-drawer` 가 어긋나 있다.

**제안** — 드로어는 우측·상하가 뷰포트에 닿으므로 **좌측 모서리 둘만** `--radius-xl` 로 둔다(`rounded-l-[var(--radius-xl)]`). 설정 레이어는 트리거 아래에 매달리므로 하단 둘만 라운드하는 현 형태가 옳고, 값만 `--radius-xl` 로 올리거나 §6.8 에 「트리거에 앵커된 레이어는 `--radius-md`」 예외를 등재한다. `.vt-drawer` 에도 같은 선언을 넣어 설계 정의를 맞춘다(§8 의 push 절차 대상).

### D-07 — GNB pill 의 **쉼 상태**가 명세의 hover 상태다 (major · gnb)

`design.md:262-264` §6.6: 「A **hairline-bordered** pill … **Hover** deepens the border and **picks up `--surface-muted`**.」 `ds/app-components.css:201-226` `.vt-pill` 이 같은 것을 값으로 적는다: 쉼 `background: transparent; border: 1px solid var(--hairline-strong); color: var(--ink-body); font: var(--label); font-weight: 600; padding: 7px 16px`, hover `background: var(--surface-muted); border-color: var(--border-strong); color: var(--ink)`.

실현(`site-gnb.tsx:64`, back·햄버거·설정 트리거가 공유하는 바탕):

```
border-[var(--hairline)] bg-[var(--surface-muted)] px-3 py-[7px] text-[0.88rem] font-semibold text-[var(--ink)]
hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-sunken)] active:bg-[var(--surface-strong)]
```

다섯 속성이 어긋난다 — 쉼 배경이 `transparent` 가 아니라 **명세의 hover 값** `--surface-muted` · 테두리가 `--hairline-strong` 이 아니라 한 단 옅은 `--hairline` · 잉크가 `--ink-body` 가 아니라 `--ink` · 가로 패딩이 16px 이 아니라 12px · 타입이 `--label`(14px/500→600)이 아니라 `0.88rem`(14.08px)/600.

효과는 시각 위계다. §4.1:69-71 은 「Hierarchy is built from **surface tint and hairlines first**」 라고 적는데, 쉴 때 이미 면이 칠해진 pill 은 GNB 바(`--gnb-surface`, canvas 88%) 위에서 항상 한 단 튀어나와 보이고, hover 는 그것을 **다른 색**으로 옮긴다 — ds README 의 hover 규칙(「neutral surfaces pick up `--surface-sunken`」, `README.md:126`)은 만족하지만 쉼 상태가 이미 한 칸 올라가 있어 「calm deepening」이 한 칸씩 밀린다. 모바일에서 이 pill 은 화면에 상시 떠 있는 유일한 컨트롤이다.

**제안** — 쉼을 `bg-transparent border-[var(--hairline-strong)] text-[var(--ink-body)]` 로 내리고 hover 를 `--surface-muted` + `--border-strong` + `--ink` 로 올려 `.vt-pill` 에 맞춘다. 타입은 `[font:var(--label)] font-semibold` 로 바꿔 rem 리터럴을 없앤다(§D-15 와 같은 수정). 패딩은 `px-4`. `aria-expanded='true'` 상태(`.vt-pill[aria-expanded='true']`)는 hover 와 같은 처리를 받아야 하므로 함께 추가한다 — 현재 열린 설정 트리거·햄버거는 열림 표시가 없다.

### D-08 — `.vt-chip` 이 두 벌로 갈라져 서로 다른 면을 쓴다 (major · gnb, test)

`ds/app-components.css:392-403` `.vt-chip`: `min-height: 32px; padding: 5px 11px; border: 1px solid var(--hairline-strong); background: var(--canvas-elevated); color: var(--ink-body); font: var(--caption); font-weight: 600`, hover `--surface-sunken` + `--border-strong`.

| 속성 | GNB 칩(`settings-controls.tsx:29`) | 테스트 칩(`surface-class-names.ts:93`) | 명세 |
|:---|:---|:---|:---|
| 면 | `--surface-muted` | `--canvas-elevated` | `--canvas-elevated` |
| 테두리 | `--hairline` | `--hairline-strong` | `--hairline-strong` |
| 잉크 | `--ink` | `--ink-body` | `--ink-body` |
| 타입 | `0.8rem`(12.8px)/600 | `13px`/600/1.45 | `--caption`(13px/1.45)/600 |
| 패딩 | `10px / 5px` | `11px / 5px` | `11px / 5px` |
| hover | + `--shadow-sm` | 그림자 없음 | 그림자 없음 |

같은 이름의 한 컴포넌트가 두 표면에서 면·테두리·잉크·타입·패딩·그림자 여섯 축 전부에서 다르다. 테스트 칩 쪽이 명세와 일치하고 GNB 칩이 이탈한 쪽이다.

그리고 **테스트 칩에는 드로어 스코프에 해당하는 44px 승격이 없다.** `ds/app-components.css:437-443` 이 「데스크톱 레이어는 fine-pointer 표면이라 24px 이 바닥이지만 드로어 안의 같은 칩은 1차 터치 타깃이므로 `--tap-min` 을 받는다」 는 규칙을 명문화하고 `.vt-drawer .vt-chip` 로 구현하는데, 자격 문항 재진입 칩(`surface-class-names.ts:93`)은 모바일 전면 다이얼로그 안의 1차 터치 타깃인데도 `min-h-8`(32px)로 남아 있다. 그 규칙이 요구하는 것은 뷰포트가 아니라 **그 칩이 무엇 안에 있는가**이므로, 사용자 결정 ②(입력 방식 기준 통일)가 그대로 적용될 선례다.

**제안** — `chipBaseClassName` 의 `[--gnb-chip-bg]`·`[--gnb-chip-border]`·잉크·타입을 `.vt-chip` 값으로 맞추고 `hover:shadow` 를 제거한다. `testChipClassName` 은 `min-h-8` 을 `min-h-[var(--tap-min)]` 으로 올린다(전면 다이얼로그 안이므로 조상 스코프 규칙의 대상). 두 벌을 `features/ui/` 의 공용 `chipClassName` 으로 합쳐 `button-class-names.ts` 가 버튼에 한 것과 같은 수렴을 칩에도 적용한다.

### D-09 — 드로어 scrim 이 0.60 인데 시스템은 0.48 하나만 정의한다 (major · gnb)

`design.md:194` §5.7: `--overlay-scrim: rgba(30,26,22,0.48)` 에 「mobile sheet **+ menu** scrim」 이라는 주석이 붙어 있다. `ds/app-components.css:75-79` `.vt-scrim` 도 `background: var(--overlay-scrim)` 하나다.

실현은 둘이다 — 모바일 카드 backdrop 은 `--overlay-scrim-medium`(`landing-catalog-grid.tsx:31`) = `var(--overlay-scrim)` = 0.48 이고, **GNB 드로어 backdrop 은 `--overlay-scrim-strong`**(`site-gnb.tsx:82`) = `color-mix(in srgb, var(--warm-900) 60%, transparent)` = 0.60 이다(`globals.css:285-286`).

계산으로 확인한 차이(웜 캔버스 `#fbfaf7` 위): 0.48 → `#918e8b`, 지면을 **3.12:1** 로 낮춘다. 0.60 → `#767470`, **4.47:1**. 앞의 3.12 는 `design.md:274` §6.8 과 `ds/app-components.css:55-57` 이 「라이트에서는 scrim 이 혼자 분리를 해낸다」는 논거로 인용한 바로 그 측정값이다 — **그 논거가 설명하는 대상인 메뉴 패널이 정작 그 값을 쓰지 않는다.**

다크에서는 `globals.css:409-415` 가 세 강도를 전부 `--overlay-scrim` 으로 접으므로 차이가 사라진다. 즉 이 이탈은 라이트 테마에서만 존재하고, 그래서 두 테마를 나란히 보지 않으면 드러나지 않는다.

`globals.css:278-284` 의 주석은 `--overlay-scrim-strong` 을 「VIVE 가 이름을 준 것은 잉크이고 강도가 아니므로 그 위 두 단계는 남는다」로 정당화하지만, 「어느 오버레이가 어느 강도를 쓰는가」는 적지 않는다. AGENTS.md §3-1 기준으로 이것은 등재되지 않은 R/C 갈림이다 — `decision-register.md:395-407` 의 `ds-parity-allowlist` 세 행(`--body`·`--dur-base`·`--dur-expand`)에 없다.

**제안** — 드로어 backdrop 을 `--overlay-scrim-medium` 으로 내려 §5.7·§6.8 과 카드 backdrop 에 맞춘다. 0.60 을 유지하기로 하면 `ds-parity-allowlist` 에 행을 추가하고 §5.7 의 주석에서 「menu」를 떼어 별도 강도를 명시한다. 어느 쪽이든 `--overlay-scrim-strong` 의 소비자가 하나뿐이므로 값이 아니라 **어느 표면이 어느 강도인가**를 문서가 말해야 한다.

### D-10 — 카탈로그 썸네일 11장이 라이트 전용 하드코딩이다 (major · landing)

`public/landing-card-media/*/thumbnail.svg` 10장이 라이트 팔레트 hex 7종만 쓴다(전수 grep: `#5c8e78` 30 · `#e8f0ec` 28 · `#c9dbd1` 17 · `#fbfaf7` 16 · `#a6c5b5` 7 · `#ada59d` 3 · `#f4f1ea` 1). 파일들이 `data-drawn-against="#fbfaf7"` 속성으로 라이트 캔버스 기준임을 스스로 적는다. 에셋이 없는 variant 용 폴백도 같다 — `landing-grid-card.tsx:175` 의 `fill="#e8f0ec" opacity="0.55"`.

다크 카드 면은 `--canvas-elevated` → `--warm-900` = `#1e1a16`(`globals.css:378`)이다. 폴백 사각형의 합성색을 계산하면 **`#8d908c`** — 근검정 카드 위의 중간 회록색 블록이다. 라이트에서는 같은 계산이 `#f2f7f5` 로 카드 면과 거의 구분되지 않으므로, 이 요소는 **라이트에서는 보이지 않고 다크에서만 눈에 띈다.** `#fbfaf7`(라이트 캔버스)과 `#f4f1ea`·`#ada59d`(라이트 뉴트럴)를 칠한 10장의 정식 썸네일도 같은 방향이다.

이 구조를 `tests/unit/landing-card-thumbnails.test.ts:65` 가 **집행한다** — 허용 hex 집합에 위 7종을 하드코딩해 두어, 썸네일을 테마 인식형으로 바꾸면 그 테스트가 붉어진다. 즉 게이트가 결함을 고정하고 있다.

모바일에서 비중이 가장 크다: 1열 358px 카드 × `aspect-[16/6]` ≈ 134px 높이 × 카드 8장 = 첫 화면부터 반복되는 요소다.

미측정: 다크에서의 실제 인상과 대비. 합성색은 계산이고 렌더는 확인하지 않았다.

**제안** — 썸네일 SVG 를 `currentColor` + `fill-opacity` 또는 CSS 변수(`var(--accent-subtle)` / `var(--surface-sunken)`)로 다시 그려 테마 사슬에 얹는다. SVG 를 `<img>` 로 싣는 현행 방식은 외부 변수를 상속하지 못하므로 인라인 SVG 컴포넌트로 바꾸거나, 테마별 두 벌을 두고 `[data-theme]` 로 고른다. `landing-card-thumbnails.test.ts:65` 의 허용 목록은 hex 집합 대신 「리터럴 hex 0건 + 허용 토큰 이름 집합」으로 다시 쓴다. `design.md` §4.9 에 「썸네일은 테마 사슬을 통해 해석된다」 한 줄을 신설한다.

### D-11 — §4.3 의 「global wrapping rule」이 9개 opt-in 으로 실현돼 있다 (major · landing, blog, global)

`design.md:84` §4.3: 「**Global wrapping rule:** wrapping text uses `word-break: keep-all; overflow-wrap: anywhere;`」 §4.11:117 이 같은 것을 되풀이한다.

실현은 전역 규칙이 아니라 9개 원소의 개별 선언이다(전수 grep): `test/error/page.tsx:16` · `landing-grid-card.tsx:232`·`:237` · `landing-grid-card.module.css:128-132`(`-normal` 접미 클래스 둘) · `test-question-client.tsx:57` · `surface-class-names.ts:89`·`:102` · `blog-destination-client.tsx:35`·`:47`.

빠진 자리 중 모바일에서 실제로 걸리는 것:

- **모바일 확장 시트의 헤더 제목.** `LANDING_GRID_CARD_MOBILE_TITLE_CLASSNAME`(`landing-grid-card.tsx:298`)은 `LANDING_GRID_CARD_EXPANDED_CONTEXT_CLASSNAME`(`:255`)을 확장하는데 그 문자열의 클래스 이름은 `landing-grid-card-title` 이지 `…-title-normal` 이 아니다. module.css:128-132 의 선택자는 `-normal` 만 겨냥하므로 **같은 카드의 접힌 제목은 keep-all 을 받고 펼친 제목은 받지 않는다.** ko/ja/zs/zt 에서 한 번의 탭을 사이에 두고 줄바꿈 규칙이 바뀐다.
- 블로그 상세 본문(`blog-destination-client.tsx:37`)·목록 부제(`:51`)·페이지 제목(`:33`)·kicker(`:32`), 동의 배너 메시지(`consent-banner.tsx:246`), 히스토리 본문(`history/page.tsx:18`), 404 두 장의 본문, GNB 라벨 전부.

`decision-register.md:480` 은 D-06 해소를 「`.root` 스코프로 올려 desktop·tablet·mobile 전부에 적용한다」로 기록하는데, 실제로 제거된 것은 **티어 스코프**이고 **상태 스코프(`-normal`)는 남았다.** 그 항목의 실측도 「세 티어 × 카드 16개 제목·부제」로 normal 상태만 봤다.

**제안** — 선언을 원소마다 반복하는 대신 `globals.css` 의 `@layer base` 에 `body { word-break: keep-all; overflow-wrap: anywhere; }` 한 줄을 두고(§4.3 이 말하는 그대로의 「global rule」), 9개 개별 선언을 제거한다. 레이어 안이므로 필요한 곳에서 유틸리티로 덮을 수 있다. 12 로케일 중 4개가 CJK 이므로 `line-break` 정책(현재 저장소 전체 0건)을 함께 결정한다.

### D-12 — `.vt-panel` 이 6개 파일에 따로 적혀 있고 빈 상태는 3벌·패딩 3값이다 (minor · global)

같은 다섯 선언(`rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--canvas-elevated)] p-5 shadow-[var(--shadow-rest)]`)이 여섯 곳에 있다: `surface-class-names.ts:41`(유일한 명명 export) · `blog-destination-client.tsx:27` · `history/page.tsx:13` · `not-found.tsx:13` · `global-not-found.tsx:20` · `test/error/page.tsx:11`.

빈 상태(`ds/app-components.css:420-435` `.vt-empty*`)도 세 곳에 복제돼 있고 **패딩이 서로 다르다**: `history/page.tsx:14` 와 `not-found.tsx:14`·`global-not-found.tsx:21` 은 `px-4 py-10`, `test/error/page.tsx:12` 는 `px-4 py-8`, 명세는 `var(--space-16) var(--space-6)` = `64px 24px`. 마크는 세 곳 다 `h-11 w-11`(44px 리터럴, `--tap-min` 과 같은 값을 다른 철자로).

그리고 `landing-shell-card` 라는 클래스 이름이 4개 파일에 붙어 있는데 **저장소의 어떤 CSS 도 그 선택자를 갖지 않는다**(`src/**/*.css` grep 0건).

저장소는 이미 같은 문제를 버튼에서 해결했다 — `button-class-names.ts:1-23` 의 머리말이 「같은 어휘가 세 곳에 따로 적혀 있었다」고 적고 한 파일로 모았다. 면과 빈 상태는 그 수렴을 받지 못했다.

**제안** — `features/ui/surface-class-names.ts`(가칭)를 신설해 `panelClassName` · `emptyStateClassName` · `emptyMarkClassName` · `emptyTitleClassName` · `emptyBodyClassName` 를 한 벌 두고 6개 파일이 import 한다. 패딩은 명세의 `64px 24px` 로 통일하되 모바일에서 64px 상하가 과하면 `py-10`(40px) 하나로 통일하고 `.vt-empty` 를 그 값으로 개정한다 — 세 값이 공존하는 현행만 아니면 된다. 죽은 `landing-shell-card` 이름은 제거한다.

### D-13 — 터치에서 누름 피드백이 사실상 없다 (major · global)

Tailwind v4.1.0 컴파일 프로브(`dc4.mjs`) 결과 `hover:` 는 `&:hover { @media (hover: hover) { … } }` 로 emit 되고 `active:` 는 미디어 래퍼 없이 `&:active` 로 emit 된다. 즉 hover 없는 기기에서 `hover:` 는 **한 번도 발화하지 않는다.**

`active:` 를 가진 클래스 문자열은 저장소 전체에 4개뿐이다(전수 grep, `data-[…]` 제외): `button-class-names.ts:89`·`:97`·`:101` 과 `site-gnb.tsx:64`. 즉 **버튼과 GNB pill 만** 터치 피드백을 갖는다.

`hover:` 만 갖고 `active:` 가 없는 자리 — 전부 모바일의 주요 터치 타깃이다:

| 컨트롤 | 위치 | 탭했을 때 사용자가 보는 것 |
|:---|:---|:---|
| 랜딩 확장 선택지 A/B | `landing-grid-card.tsx:235` | 없음 → 곧바로 라우트 전환 |
| 테스트 답변 선택지 | `surface-class-names.ts:83` | 150ms 뒤 `data-selected` → 다음 문항 |
| 자격 재진입 칩 | `surface-class-names.ts:93` | 없음 |
| 블로그 목록 행 | `blog-destination-client.tsx:43` | 없음 → 전환(최대 1600ms) |
| 드로어 링크 | `site-gnb.tsx:101` | 없음 |
| 로케일·테마 칩 | `settings-controls.tsx:48` | 없음 |
| 블로그 카드(랜딩) | `landing-grid-card.module.css:92-97` | 없음(`@media (hover:hover) and (pointer:fine)` 안) |

`ds/README.md:127` 은 「Interaction states (**all components encode these**) … **Pressed:** one more step in the same direction + a 0.5px nudge down (`translateY`)」 를 시스템 규칙으로 적는다. 실현된 4개 중 어느 것도 그 형태가 아니다 — primary 버튼은 `hover:-translate-y-px` 후 `active:translate-y-0`, 즉 **hover 에서 들렸다가 누르면 제자리로** 돌아오는 형태라 hover 가 없는 기기에서는 이동이 0 이다.

`design.md` §4 에는 pressed 상태 자체가 없다 — §4.8 은 허용/금지 목록만 갖는다.

**제안** — ⑴ `design.md` §4.8 에 「Pressed: 같은 방향으로 한 단 더 + 0.5px 아래로. hover 가 없는 기기에서 상태 피드백의 유일한 통로이므로 모든 인터랙티브 컴포넌트가 이것을 갖는다」 를 신설한다. ⑵ `button-class-names.ts` 에 `pressedClassName = 'active:translate-y-[0.5px] active:brightness-[0.97]'` 같은 한 벌을 두고 위 7개 자리에 붙인다. ⑶ 블로그 카드의 hover 스킨(`--sage` 테두리 + glow)을 `:active` 에도 걸어 터치에서 「누른 카드」가 보이게 한다 — §10 의 「Hover border/shadow on **Normal test cards**」 금지는 블로그 카드에 걸리지 않는다.

### D-14 — 토큰 계층에 뷰포트 축이 하나뿐이고, 반응형이 세 메커니즘 다섯 임계값으로 흩어져 있다 (major · global)

`globals.css` 의 `:root` 선언 중 미디어 쿼리로 값이 바뀌는 토큰은 `--shell-gutter` **하나**다(`:323` 16px → `:326-330` ≥768 20px → `:332-336` ≥900 24px). `--tap-min`·radius 4종·타입 역할 14종·모션 2종 어디에도 뷰포트 분기가 없고, 설계 정의(`ds/colors_and_type.css`, 871줄)에는 폭 기반 `@media` 가 **0개**다.

그래서 반응형 값은 토큰 밖 세 메커니즘으로 표현되고, 서로 다른 임계값을 쓴다:

| 메커니즘 | 임계값 | 자리 |
|:---|:---|:---|
| JS tier | 767 / 1023 | `layout-plan.ts:1-2` |
| JS 측정(container) | 1040 / 1160 | `layout-plan.ts:8-9`, `landing-catalog-grid.module.css:31` |
| 토큰 미디어 쿼리 | 768 / 900 | `globals.css:326`·`:332` |
| Tailwind named | `md`=48rem / `xl`=80rem | `page-shell.tsx:22`, `site-gnb.tsx:40-41`, `landing-catalog-grid.tsx:211`·`:221` |
| Tailwind arbitrary | `<767` / `<719` | `instruction-overlay.tsx:26`·`:145`, `consent-banner.tsx:241` |

셋이 실제로 갈리는 지점을 프로브로 확정했다(`dc5.mjs`):

- **정확히 767px 에서 JS 와 CSS 가 다른 답을 낸다.** `max-[767px]:` 는 `@media (width < 767px)` 로 emit 되어 767 을 **제외**하는데 `resolveLandingViewportTier` 는 `viewportWidth <= 767` 로 **포함**한다(`layout-plan.ts:64`). 폭 767px 에서 랜딩 그리드는 1열 모바일인데 지시 다이얼로그는 전면 시트가 되지 않고, `md:` 도 아직 발화하지 않는다.
- **`md:` 만 rem 이다**(`48rem`). 사용자가 브라우저 기본 글꼴을 키우면 `md:` 경계는 커지고 `max-[767px]`·`layout-plan.ts`·`--shell-gutter` 의 px 경계는 그대로라 세 축이 서로 어긋난다(WCAG 1.4.4 인접).
- **`719` 는 고아 값이다.** `consent-banner.tsx:241`·`:245`·`:248` 의 7개 `max-[719px]:` 에 대응하는 상수·토큰이 저장소 어디에도 없다. 제품의 「모바일」 경계가 한 표면에서만 719 다.

**제안** — 토큰 계층에 입력·폭 두 축을 신설하고 그 아래로 수렴시킨다. ⑴ `--shell-gutter` 와 같은 방식으로 `--card-pad` · `--overlay-radius` · `--sheet-top-offset`(§D-16) 을 미디어 쿼리 토큰으로 승격한다. ⑵ 경계를 상수 하나에서 파생시킨다 — `layout-plan.ts` 의 `MOBILE_MAX_VIEWPORT_WIDTH` 를 정본으로 두고 `tests/unit/shared-shell-gutter.test.ts` 가 `--shell-gutter` 에 한 것처럼 **모든** 폭 리터럴을 그 상수와 대조하는 가드를 확장한다. ⑶ `719` 를 `767` 로 통일하거나 그 값이 배너 고유의 콘텐츠 경계임을 상수 이름으로 명시한다. ⑷ `md:`(rem)를 `max-[767px]`/`min-[768px]`(px)로 통일해 단위를 하나로 만든다.

### D-15 — GNB 타입만 rem 기반이라 §5.1 사다리 밖에 있다 (minor · gnb)

`site-gnb.tsx:50`(`0.96rem`=15.36px) · `:64`(`0.88rem`=14.08px) · `:98`(`0.78rem`=12.48px) · `settings-controls.tsx:18`(`0.78rem`) · `:29`(`0.8rem`=12.8px). §5.1 의 px 사다리에 없는 네 값이고, 제품에서 사용자 글꼴 설정에 따라 움직이는 유일한 타입이다(나머지는 전부 px).

그중 둘은 `--overline` 역할의 중복 정의다. `--overline: 600 12px/1.4`(`globals.css:211`)와 `--track-over: 0.08em`(`:216`)이 있고 `testOverlineClassName`(`surface-class-names.ts:113`)과 `blogKickerClassName`(`blog-destination-client.tsx:32`)이 그것을 쓰는데, `gnbMobileHeadLabelClassName`(`site-gnb.tsx:98`)과 `settingsLabelClassName`(`settings-controls.tsx:18`)은 같은 역할을 `text-[0.78rem] font-bold uppercase tracking-[0.03em]` 로 다시 적는다 — 크기도(12.48 vs 12) 굵기도(700 vs 600) 자간도(0.03 vs 0.08em) 다르다.

**제안** — 다섯 자리를 전부 `[font:var(--label)]`(14px/500) 또는 `[font:var(--overline)] [letter-spacing:var(--track-over)]` 로 옮긴다. 굵기 차이가 필요하면 `font-semibold` 를 얹는다. rem 을 남길 이유가 있으면 그것이 유일한 반응형 타입 정책임을 §5.1 에 등재한다.

### D-16 — 「바 아래 여백」이 세 값이고 셋 다 리터럴이다 (major · global)

같은 개념 — 상단 sticky 바 아래에서 내용이 시작하는 위치 — 이 세 숫자로 존재한다:

| 값 | 자리 | 맥락 |
|:---|:---|:---|
| 80px | `page-shell.tsx:22` `pt-20` | 모바일 본문(바 56px 위에 더해져 시작점 136px) |
| 88px | `page-shell.tsx:22` `md:pt-[88px]` | 데스크톱 본문(바 64px + 88 = 152px) |
| **88px** | `instruction-overlay.tsx:26` `max-[767px]:pt-[88px]` | **모바일** 전면 다이얼로그 — 데스크톱 값을 모바일에 쓴다 |
| 116px | `landing-grid-card.tsx:285`·`:292`·`:296` `max-h-[calc(100dvh-116px)]` | 모바일 시트 높이 예산 |

116px 의 출처를 코드에서 찾지 못했다 — `grep -rn '116' src/` 결과가 이 세 줄뿐이고 주석·상수·토큰이 없다. 모바일 GNB 는 56px(`site-gnb.tsx:41` `h-14`)이므로 남는 60px 이 설명되지 않는다. `decision-register.md:412` 는 2026-09-07 실측을 「GNB 하단 57」로 기록해 유도 관계를 소스만으로 세울 수 없다.

`--shell-gutter` 가 좌우에서 정확히 이 문제(두 표면이 같은 3단 규칙을 각자 다른 철자로 적어 둘 다 자기 규칙을 잃었다, `globals.css:306-322`)를 겪고 토큰으로 해결됐는데, **세로에서는 같은 수정이 이뤄지지 않았다.**

**제안** — `--bar-h`(56/64)와 `--content-top`(바 아래 여백)을 `--shell-gutter` 와 같은 방식의 미디어 쿼리 토큰으로 신설하고, 네 자리를 전부 `calc(var(--bar-h) + var(--content-top))` 로 유도한다. 116px 은 그 유도식으로 대체하거나, 대체 전에 렌더 1회로 출처를 확정한다(미확인 사항). `tests/unit/shared-shell-gutter.test.ts` 와 같은 형태의 단위 가드를 세로 축에도 둔다.

### D-17 — 제품 기본 easing 이 시스템에 없는 `ease` 키워드다 (major · global)

`design.md:373` §8 은 easing 을 셋으로 못박는다: `--ease-standard`(0.2,0,0,1) · `--ease-out`(0,0,0.2,1) · `--ease-in`(0.4,0,1,1). `globals.css` 는 그중 `--ease-standard` 만 미러하고 `--ease-in-out`(0.45,0,0.2,1, M-01 로 결정된 핵심 확장 곡선)을 추가로 갖는다.

실제 전이의 timing function census(전수 grep): **raw `ease` 키워드 12회** · `var(--ease-standard)` 2회 · `var(--ease-in-out)` 1회 · Tailwind `ease-out` 1회 · module.css 의 `--landing-card-motion-ease` 사슬.

`ease` = `cubic-bezier(0.25, 0.1, 0.25, 1)` 로 §8 의 세 곡선 어디에도 없다. 그리고 12회가 걸린 자리가 모바일 사용자가 실제로 보는 전부다: GNB 바 테두리(`site-gnb.tsx:38`) · 데스크톱 링크 색(`:50`) · pill 전이(`:64`) · 드로어 backdrop(`:82`) · **드로어 자신의 transform/opacity**(`:87`) · 드로어 링크 배경(`:101`) · 칩 전이(`settings-controls.tsx:29`) · 카드 backdrop(`landing-catalog-grid.tsx:31`) · 확장 선택지(`landing-grid-card.tsx:235`·`:239`).

`ds/app-components.css:499-501` 의 `.vt-drawer` 는 `var(--ease-standard)` 를 쓴다 — 명세와 제품이 곡선에서 갈린다.

**제안** — 12회를 `var(--ease-standard)` 로 치환한다(진입·상태 변화용 곡선이므로 §8 의 의도와 일치). 동시에 `--dur-base: 180ms` 를 `globals.css` 미러 구간에 추가해(§D-18) 7개 `180ms` 리터럴도 함께 토큰으로 옮긴다. 치환 후 `tests/unit/design-tokens-dark-parity.test.ts` 의 「선언된 토큰은 소비자를 가져야 한다」 규칙이 자동으로 만족된다.

### D-18 — 제품에서 가장 흔한 지속값 180ms 에 런타임 토큰이 없다 (major · global)

`ds/colors_and_type.css:353` 은 `--dur-base: 180ms` 를 「general UI; also the reduced-motion core」로 정의하고 `ds/README.md:137` 의 모션 사다리(120 / 140 / 180 / 280 + 40·100·160 stagger)가 그것을 이름으로 부른다. `globals.css` 는 `--dur-fast`(140ms)와 `--dur-slow`(280ms)만 미러했다.

결과: `180ms` 가 7회 리터럴로 나타난다(`site-gnb.tsx:38`·`:82`·`:87`×3 · `landing-catalog-grid.tsx:31` · `landing-grid-card.module.css` reduced-motion 블록 1회) — **140ms(10회, 토큰 있음)와 280ms(2회, 토큰 있음) 사이에서 유일하게 이름이 없는 단**이다. `--dur-micro: 120ms`(모바일 normal-slot exit)도 같은 상태다.

`design.md` §5.11·§8 이 적는 `--dur-base: 220ms` 는 `decision-register.md:404` 의 `ds-parity-allowlist` 에 등재된 이탈이고 실현값은 180ms 다 — 즉 **값은 이미 결정돼 있고 미러만 되지 않았다.**

**제안** — `globals.css` 의 `@mirror-begin light` 구간에 `--dur-base: 180ms` 와 `--dur-micro: 120ms` 를 추가하고(정본은 `ds/colors_and_type.css` 이므로 편집은 그쪽이 아니라 미러 복사), 리터럴 7+1회를 토큰으로 옮긴다. 미러 규칙은 「런타임이 소비하는 이름만」이므로 소비자를 함께 만드는 이 수정이 그 규칙을 만족한다.

### D-19 — §6.10 한 절이 공통점 없는 두 컴포넌트를 규정한다 (minor · landing, test)

`design.md:290` §6.10 「Meta row / quiet data row」: 「A horizontal, **wrapping** row of small (13px / 500) `--muted` items separated by **thin dot separators**, with the complete leading duration item optionally emphasized at 600 / `--body`.」

두 구현이 이 절을 인용한다:

- `LANDING_GRID_CARD_META_ROW_CLASSNAME`(`landing-grid-card.tsx:241-243`, 주석이 「design §6.10 quiet data row」를 명시) — `flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] font-medium`, dot 구분자 있음. 절과 일치.
- `testDataRowClassName`(`surface-class-names.ts:96-97`, 주석이 「`.vt-datarow` — … (`design.md` §6.10)」) — `flex items-baseline justify-between gap-4 border-b border-[var(--hairline)] py-3`, 줄바꿈 없음·dot 없음·하단 hairline 있음, 키는 `--caption`(13px/400) 값은 `--body-sm`(14px/400).

굵기·구분자·줄바꿈·테두리 네 축이 전부 다르다. 설계 정의는 이것을 이미 `.vt-meta`(`catalog-components.css:772-782`)와 `.vt-datarow`(`app-components.css:584-594`) 둘로 나눠 두었는데 `design.md` §6.10 은 하나로 남아 있다.

**제안** — §6.10 을 `6.10 Meta row`(카탈로그, dot 구분·wrap·13px/500)와 `6.11 Quiet data row`(라벨/값 양끝 정렬·hairline 구분)로 가른다. 두 절이 각각 `.vt-meta`·`.vt-datarow` 를 가리키게 하고 제품 주석의 인용을 새 번호로 갱신한다(`tests/unit/contract-citations.test.ts` 가 §번호 실재를 검사하므로 함께 움직인다).

### D-20 — §10 이 §7.6 이 요구하는 것을 금지한다 (minor · design.md 내부)

`design.md:419` §10 이 「Desktop gear / settings icon」 을 Never Reintroduce 로 유지하는데, 같은 문서 `:339` §7.6 은 D-11 정정으로 「plus a **settings trigger** at the right that opens the language/theme layer」 를 **요구**하고, `:341-343` 이 그 레이어의 hover-open·닫힘 경로·0px hover gap 을 규정한다. 제품은 그 트리거를 실현한다(`site-gnb.tsx:66`, 글리프는 gear 가 아니라 현재 테마 아이콘 — `theme-mode-icon.tsx`).

`ds/README.md:26` 의 D-11 기록은 「all three were corrected in §7.6 itself」 라고만 적고 §10 을 손대지 않았다. 문서 하나가 자기 자신과 모순하는 상태이고, 모바일 리팩터가 §10 을 금지선으로 읽으면 데스크톱 설정 레이어를 제거하게 된다.

**제안** — §10 의 해당 줄을 「Desktop gear icon(기어 글리프). 설정 트리거 자체는 §7.6 이 요구한다」로 좁히거나 삭제하고, §7.6 의 D-11 주석에 §10 을 함께 고쳤다는 문장을 남긴다.

### D-21 — §10 이 금지한 `min-height: 100%` 가 확장 오버레이 체인에 남아 있다 (minor · landing)

`design.md:427` §10: 「`min-height: 100%` as the expanded-overlay height invariant.」 §7.3:319-320 이 같은 것을 「**Do not** express this invariant as `min-height: 100%`」 로 되풀이한다.

그런데 확장 오버레이의 세 원소가 `min-h-full`(= `min-height: 100%`)을 갖는다 — `landing-grid-card.tsx:270`(shell frame) · `:272`(shell) · `:276`(surface). 실효를 막는 것은 다른 파일의 취소 규칙 하나다: `landing-grid-card.module.css:236-241` 의 `.root.desktopOverlayLayer .expandedShellFrame, .expandedShell, .expandedSurface { min-height: 0; height: auto; }`.

세 원소는 `showDesktopExpandedShell` 안에서만 렌더되고 그때 루트는 항상 `.desktopOverlayLayer` 를 갖는다(`landing-grid-card.tsx:1009`·`:1029`). 그래서 **현재 렌더 결과는 옳다.** 다만 금지된 선언이 금지된 원소 위에 남아 있고 그것을 막는 것이 다른 파일의 한 규칙뿐이라, module.css 를 손대는 다음 세션이 조용히 §10 을 되살릴 수 있다.

**제안** — `min-h-full` 세 개를 클래스 문자열에서 제거하고 module.css:236-241 의 취소 규칙도 함께 지운다(둘 다 없으면 결과가 같다). 지우지 않기로 하면 세 클래스 문자열에 「이 선언은 `.desktopOverlayLayer` 규칙이 취소한다」는 포인터 주석을 단다.

### D-22 — ds 의 모바일 닫기 명세가 낡았고 정의되지 않은 토큰을 소비한다 (minor · design.md/ds)

`ds/catalog-components.css:735-751` 의 `.vt-mobile-close` 는 세 가지가 제품과 다르다: `min-width/min-height: 40px`(제품 44px, `landing-grid-card.tsx:278-279`) · `border: 1px solid var(--hairline)`(제품 `--hairline-strong`) · `background: var(--chip-bg)`(제품 `--surface-strong`).

그리고 **`--chip-bg` 는 `docs/design/ds/` 전체에서 정의되지 않는다** — 소비 1회(`catalog-components.css:749`), 선언 0회, 폴백 없음. 명세 시트에서 이 버튼의 배경은 무효다.

`ds/README.md:31` 은 D-09 를 Resolved 로 닫았지만 `catalog-components.css:735-738` 과 `preview/card-mobile-expanded.html:77`·`:85` 는 여전히 「40 × 40, 아직 고쳐야 함」이라고 말한다. 세 문서 중 둘이 낡았다.

`ds/**` 는 AGENTS.md §4 Ask-First 이고 편집이 Claude Design 프로젝트로 나가는 표면이므로, 이 수정은 `SYNC.md` 의 push 절차를 동반한다.

**제안** — `.vt-mobile-close` 를 `min-width/min-height: var(--tap-min)` · `border: 1px solid var(--hairline-strong)` · `background: var(--surface-strong)` 로 갱신하고, `preview/card-mobile-expanded.html:77` 의 채점 행을 ✓ 로 바꾼다. `--chip-bg` 참조를 제거한다. 이 갱신은 `scripts/qa/check-design-token-parity.mjs` 의 ⑷ 「산문이 부르는 토큰의 실존」 검사를 `catalog-components.css` 로 넓힐 근거이기도 하다 — 현재 그 검사는 README 산문만 본다.

### D-23 — `--container-narrow` 가 `[not realized]` 로 표시돼 있는데 실현돼 있다 (minor · blog)

`ds/colors_and_type.css:371`: `--container-narrow: 760px;  /* [not realized] */`. 제품은 그 값을 리터럴로 렌더한다 — `blog-destination-client.tsx:29` 의 `max-w-[760px]`, 그리고 같은 파일 `:28` 의 주석이 「읽기 폭은 `--container-narrow`(760px). 토큰 파일에 있었지만 소비자가 없던 값이다」 라고 그 사실을 적는다.

AGENTS.md §3-1 의 판정 기준(「이 값을 제품 코드에서 바꾸면 이 문장이 거짓이 되는가」)으로 이것은 **R**(Realized)인데 ds 는 **D/I** 로 표시하고 있다. 같은 절이 「출처를 밝히지 않은 값은 쓰지 않는다」 고 요구한다.

**제안** — 주석을 `[realized: src/features/blog/blog-destination-client.tsx:29]` 로 바꾸고, 제품은 `max-w-[760px]` 대신 토큰을 선언·소비하도록 바꾼다(`globals.css` 미러 구간에 `--container-narrow` 추가 + `max-w-[var(--container-narrow)]`). 같은 처분을 `--container: 1280px`(현재 reader 0, 리터럴 3곳)에도 적용한다.

### D-24 — `design.md` §7.6 이 지정한 활성 칩 잉크가 AA 를 통과하지 못한다 (major · gnb)

`design.md:345` §7.6: 「with the active chip on `--sage-muted` background, **`--sage` text**, transparent border, and no hover effect」.

계산: `--sage`(= `--sage-500` `#5c8e78`) on `--sage-muted`(= `--sage-100` `#e8f0ec`) = **3.24:1** — WCAG 1.4.3 AA 의 일반 텍스트 4.5:1 미달이다. 칩 라벨은 12.8px 이므로 대형 텍스트 예외에도 해당하지 않는다.

제품은 `--accent-fg`(= `--sage-700` `#396050`)를 쓴다(`settings-controls.tsx:39` `[--gnb-chip-ink:var(--accent-fg)]`) = **6.11:1**, 통과. 다크에서도 `--accent-fg`(`--sage-300`) on `--sage-muted`(`--sage-900`) = 6.78:1.

즉 **구현이 옳고 §7.6 이 틀렸다.** 그런데 두 가지가 정리되지 않았다. ⑴ 이 갈림이 `decision-register.md:395-407` 의 `ds-parity-allowlist`(세 행: `--body`·`--dur-base`·`--dur-expand`)에 등재돼 있지 않다 — AGENTS.md §2 의 「새 갈림은 쓰기 전에 등재한다」 를 만족하지 않는다. ⑵ `settings-controls.tsx:30-31` 의 코드 주석이 「design.md 7.6 fixes the active chip: `--sage-muted` fill, **`--accent-fg`** text」 라고 적어 **design.md 가 말하지 않은 것을 design.md 의 말로 인용한다.** `ds/app-components.css:386-387` 도 「design.md §7.6 specifies the active chip exactly — `--sage-muted` fill, `--sage` text …」 라고 정확히 인용한 뒤 `:425` 에서 `color: var(--accent-fg)` 를 구현한다.

`scripts/qa/check-design-token-parity.mjs` 는 §5 의 css fence 만 보므로 §7.6 산문의 토큰 이름은 검사 대상이 아니다.

**제안** — §7.6 의 「`--sage` text」 를 「`--accent-fg` text」 로 고치고, 그 줄에 측정값(3.24:1 → 6.11:1)을 근거로 남긴다. `settings-controls.tsx:30-31` 의 잘못된 인용을 정정한다. 그리고 파리티 검사를 §5 밖으로 넓혀 **§6·§7 산문이 이름으로 부르는 토큰이 해당 컴포넌트의 실현에 실제로 쓰이는지**를 보게 한다 — 그 확장이 없으면 §6·§7 의 다음 이탈도 같은 방식으로 조용하다.

### D-25 — §7.7 의 「24px desktop gutter」가 1024–1279px 구간에서 참이 아니다 (major · landing)

`design.md:358` §7.7: 「**Grid gutter (realized):** 24px desktop · 20px tablet · 14–16px mobile.」

실현은 `landing-catalog-grid.tsx:211`·`:221` 의 `gap-[15px] md:gap-5 xl:gap-6` 이고, 프로브로 확인한 경계는 `md` = `width >= 48rem`(768px) · `xl` = `width >= 80rem`(1280px)이다. tier 판정의 데스크톱 경계는 `TABLET_MAX_VIEWPORT_WIDTH = 1023`(`layout-plan.ts:2`)이다.

따라서 **뷰포트 1024–1279px 에서 tier 는 `desktop` 이고 gutter 는 20px(tablet 값)** 이다. 256px 폭의 구간이며, theme-matrix 의 `desktop-narrow`(1024)와 `desktop-medium`(1180) 두 뷰포트가 정확히 그 안에 있다 — 즉 baseline 32장이 이미 그 상태를 찍어 두었고 아무 검사도 §7.7 과 대조하지 않는다.

같은 구간에서 컨테이너 좌우 패딩은 24px 이다(`--shell-gutter` ≥900). 그래서 `design.md:230` §5.10 이 24px 을 「desktop grid gutter, and the container side padding at 900px and wider」 로 **짝지어** 적은 두 값이 실제로는 900 과 1280 에서 따로 계단을 오른다.

**제안** — gutter 도 컬럼과 같은 축(측정된 `gridInlineSize`)에서 유도하거나, 최소한 `xl`(1280) 대신 `min-[1024px]`(tier 경계)로 계단을 옮겨 tier 와 gutter 가 같은 폭에서 바뀌게 한다. 그리고 §7.7 의 gutter 줄을 「24px at `gridInlineSize >= X`」 형태로 다시 써 컬럼 규칙과 같은 어휘를 쓰게 한다 — 현재 §7.7 은 한 절 안에서 컬럼은 측정값으로, gutter 는 「desktop / tablet」이라는 이름으로 말한다.

### D-26 — 시각 일관성 게이트가 §5 토큰 한 층만 덮는다 (major · global)

`scripts/qa/check-design-token-parity.mjs:5-24` 가 스스로 적는 검사 범위는 넷이다: ⑴ `design.md` §5 css fence ↔ `ds/colors_and_type.css` light `:root` ⑵ `design.md` §5.11 ↔ §8 두 사본 ⑶ `ds/README.md` *Visual foundations* 의 hex 금지·`ds-literal` 표식 ⑷ 그 절이 부르는 토큰의 실존. `tests/unit/design-tokens-dark-parity.test.ts` 가 `globals.css` 의 `@mirror-*` 구간을 덮는다.

그 밖은 전부 비어 있다. 열세 개 `scripts/qa/check-phase*.mjs` 전체에서 `design.md` 문자열이 **0회** 등장한다(grep 확인) — 그 검사들은 DOM 앵커와 테스트 제목 문자열을 볼 뿐 시각 값을 보지 않는다. 그래서 다음 넷은 어떤 게이트도 보지 않는다:

- `design.md` §4 Foundations 11개 원칙 (D-01, D-03, D-11, D-13 이 그 자리에서 나왔다)
- `design.md` §6 Components 10종 ↔ `ds/*.css` ↔ 제품 (D-06, D-07, D-08, D-19)
- `design.md` §7 Patterns ↔ 제품 (D-01, D-03, D-25)
- `design.md` §10 Never Reintroduce (D-20, D-21)

이번 리팩터는 §4·§6·§7 전부를 개정하므로, 게이트를 넓히지 않으면 **개정 직후부터 다시 표류가 시작되고 다음 세션이 그것을 손으로 찾게 된다** — `check-design-token-parity.mjs` 주석 5–8행이 기록한 그대로의 실패 모드다.

**제안** — 파리티 검사를 다섯 번째 비교로 넓힌다: `design.md` §6·§7 의 각 조항이 이름으로 부르는 **토큰**이 그 컴포넌트를 실현하는 제품 파일에서 실제로 소비되는지. 구현은 「조항 → 제품 파일 → 필수 토큰 집합」 매핑을 `decision-register.md` 의 등재 표에서 읽는 형태로 두어(현 allowlist 와 같은 방식) 스크립트 상수로 굳지 않게 한다. 0단계 구조 분리 때 함께 넣으면 1단계 이후의 모든 개정이 이 그물 위에서 일어난다. 고장 주입은 양방향으로 확인한다 — 조항의 토큰 이름을 바꿔도, 제품에서 그 토큰 소비를 지워도 붉어져야 한다.

## 8. 이 렌즈로 훑지 못한 것

- **브라우저 렌더 0회.** D-02(iOS 에서 잘리는 px) · D-05(두 겹 링의 실제 모습) · D-10(다크 썸네일 인상) · D-16(116px 의 출처) 은 구조는 확정했고 화면은 확인하지 않았다.
- **`docs/req-landing.md` §8 이후**(모바일 확장·전환·telemetry 계약)를 열지 않았다. §7.8·§8.5 의 시각 조항이 그쪽에서 어떻게 중복되는지는 contract-landing-2 맵의 소관이다.
- **`ds/preview/**` 25장 중 24장의 본문**. 카드 마커와 `card-mobile-expanded.html` 만 읽었다.
- **다크 테마 대비 감사를 다시 돌리지 않았다.** `SYNC.md:105` 가 「저장소의 어떤 게이트도 이 번들을 렌더하지 않으므로 대비 실패는 모든 자동 검사에 보이지 않는다」 고 적는 상태 그대로이며, 이 조사는 D-24 한 쌍만 계산했다.
- **`docs/design/resources/` 스크린샷 3장**을 열지 않았다. `design.md:400-402` 가 모바일 참조 이미지 3종을 전부 「Missing locally」로 적으므로 모바일 시각 참조는 저장소에 없다.
- **게이트를 실행하지 않았다.** `npm test` · `qa:rules` · `test:e2e` 모두 이 세션에서 돌리지 않았다(읽기 전용 과제). 각 결함의 `gates` 는 파일을 읽어 **어느 검사가 그 값을 붙들고 있는지**를 적은 것이고 현재 통과 여부가 아니다.

훑은 표면: landing · test(instruction·question·result·error) · blog(목록·상세) · history · gnb(바·드로어·설정 레이어) · settings · 404 두 장 · consent banner · global. 모든 표면의 클래스 어휘를 파일에서 직접 읽었다.
