# 렌즈: typography — 모바일 전면 리팩터 분석

**측정 대상:** `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (세션 전용 clone, HEAD `7616211` = 부모가 지시한 `a5aec95` 위의 empty marker). 읽기 전용 — `git status --porcelain` 빈 출력으로 저장소 무변경 확인. 쓰기는 scratchpad 안에서만 했다.

**방법:** 텍스트를 렌더하는 TSX 13개 + CSS 3개 + 설계 정의 3개를 전문 읽기, `grep` 전수 census, 그리고 **폰트 바이너리 직접 파싱 2회**. `public/fonts/PretendardVariable.woff2`(2,057,688 bytes)를 woff2 디렉터리 → brotli → `head`/`hhea`/`hmtx`/`cmap` 순으로 풀어 글리프 advance 와 수직 메트릭을 읽었고, 그 값으로 390px·320px 에서의 줄 수·줄당 글자수·행간 여유를 계산했다. 프로브: `scratchpad/analysis/typo-probe.mjs`(advance·CPL) · `vmetrics.mjs`(수직 메트릭) · `linecount.mjs`(줄바꿈 시뮬레이터) · `surfaces.mjs` · `midword.mjs` · `w320.mjs`. Tailwind preflight 은 `node_modules/tailwindcss/preflight.css` 원문을 읽어 확인했다.

**브라우저 렌더는 하지 않았다.** 아래 모든 수치는 소스에서 읽은 값이거나 폰트 메트릭에서 계산한 값이다. 계산값의 오차원은 §11 에 적었다.

---

## 0. 이 렌즈가 확정한 두 개의 상수

폰트 메트릭을 먼저 확정해야 행간 판정이 가능하다. Pretendard Variable 의 `head.unitsPerEm = 2048`, `hhea.ascender = 1950`, `hhea.descender = -494`, `hhea.lineGap = 0`, `OS/2.fsSelection` 의 `USE_TYPO_METRICS` 비트 = 켜짐, `typoAscender/typoDescender` 도 같은 1950/-494 다. 따라서 **글리프 content area 는 `(1950+494)/2048 = 1.1934em` 이고 line gap 은 0 이다.** 이것이 뜻하는 바: `line-height: 1.2` 는 이 폰트에서 **여유 0.0066em**(30px 에서 0.20px)을 남기고, `line-height: 1` 은 **2.90px(15px 기준) 모자란다**. 이하 모든 행간 판정은 이 상수에 근거한다.

두 번째 상수는 평균 자폭이다. 영문 소문자 26자를 영어 문자 빈도로 가중한 평균 advance 는 `0.4897em`, 스페이스는 `0.2510em`, 영어 평균 어장 4.7자를 섞은 **문자당 유효 폭은 `0.4478em`**. 한글(`가`)은 `0.8643em`. `0` 한 글자(= CSS `ch` 단위)는 `0.5957em`. 한자(U+4E00)는 **cmap 에 없다** — Pretendard 는 한자를 갖지 않으므로 zs/zt/ja 의 한자는 fallback face 로 그려진다(이 사실의 소유자는 i18n 렌즈다).

---

## 1. 타입 역할 전수 census

### 1-1. 토큰이 있는 역할 14개 — `src/app/globals.css:205-222`

`--h1` `700 30px/1.2`(:205) · `--h3` `600 20px/1.3`(:206) · `--body` `400 16px/1.6`(:207) · `--body-sm` `400 14px/1.55`(:208) · `--label` `500 14px/1.4`(:209) · `--caption` `400 13px/1.45`(:210) · `--overline` `600 12px/1.4`(:211) · `--button` `600 15px/1`(:212) · `--track-tight` `-0.01em`(:215) · `--track-over` `0.08em`(:216) · `--t-card-title` `600 20px/1.3`(:219) · `--t-card-subtitle` `400 15px/1.45`(:220) · `--t-expanded-question` `600 21px/1.3`(:221) · `--t-choice` `400 15px/1.45`(:222).

소비 횟수(`[font:var(--X)]` 전수): `--body-sm` 7 · `--h3` 6 · `--caption` 4 · `--t-choice` 3 · `--t-expanded-question` 2 · `--overline` 2 · `--h1` 2 · `--t-card-title` 1 · `--t-card-subtitle` 1 · `--label` 1 · `--button` 1 · **`--body` 1**.

`--h2`·`--h4`·`--body-lg`·`--display-*`·`--t-tag`·`--t-context-label`·`--t-eyebrow`·`--code` 는 설계 정의(`docs/design/ds/colors_and_type.css:243-261, 491-497`)에는 있으나 런타임 미러에 들어오지 않는다. globals.css:69 이 그 사실을 직접 적는다 — 「catalog's `--t-tag` / `--t-context-label` / `--t-eyebrow` have no reader in this [runtime]」.

### 1-2. 토큰이 없는 역할 12개 — 제품이 실제로 렌더하는 활자의 절반

| # | 역할 | 위치 | 실측 조합(390px, root 16px) |
|---:|:---|:---|:---|
| 1 | 랜딩 히어로 `<h1>` | `src/app/[locale]/page.tsx:29` | `clamp(1.5rem,2.4vw,2.2rem)` → **24px** / **400** / 1.2 / `-0.01em` 리터럴 |
| 2 | 랜딩 히어로 본문 `<p>` | `src/app/[locale]/page.tsx:30` | **선언 없음** → 16px / 400 / **1.5**(body 상속) |
| 3 | GNB CI 브랜드 | `src/features/gnb/site-gnb.tsx:45` | `text-base` 16px / **700** / 1.5 / `0.02em` |
| 4 | GNB 데스크톱 nav 링크 | `site-gnb.tsx:50` | `text-[0.96rem]` **15.36px** / 400 / 1.5 |
| 5 | GNB pill(뒤로·햄버거·설정) | `site-gnb.tsx:64` | `text-[0.88rem]` **14.08px** / 600 / 1.5 |
| 6 | GNB 드로어 머리 라벨 | `site-gnb.tsx:98` | `text-[0.78rem]` **12.48px** / **700** / **1.0** / `0.03em` / uppercase |
| 7 | GNB 설정 라벨 | `settings-controls.tsx:18` | `text-[0.78rem]` **12.48px** / 700 / 1.5 / `0.03em` / uppercase |
| 8 | GNB 칩(로케일 12 + 테마 2) | `settings-controls.tsx:29` | `text-[0.8rem]` **12.8px** / 600 / 1.5 |
| 9 | GNB 타이머(데스크톱·모바일) | `site-gnb.tsx:78,79` | **선언 없음** → 16px / 600 / 1.5 |
| 10 | 태그 칩 · 메타 행 · Read more | `landing-grid-card.tsx:230,243,504,537` | `text-[13px] font-medium leading-[1.35]` = 미러되지 않은 `--t-tag` |
| 11 | 테스트 칩 · 진행률 값 | `surface-class-names.ts:93` · `test-question-client.tsx:64` | `text-[13px]` / **600** / 1.45 |
| 12 | 블로그 목록 행 제목 | `blog-destination-client.tsx:47` | `text-[15px]` / 600 / 1.45 |

**토큰 14개 대 비토큰 12개.** 그리고 비토큰 12개 중 **9개가 GNB 계열**이다 — 모든 표면에 항상 떠 있는 단 하나의 공통 컴포넌트가 타입 스케일 밖에 있다.

### 1-3. 실제로 렌더되는 서로 다른 font-size(390px, root 16px)

**30 · 24 · 21 · 20 · 16 · 15.36 · 15 · 14.08 · 14 · 13 · 12.8 · 12.48 · 12 = 13개.** 이 중 스케일 위의 값은 8개(30·21·20·16·15·14·13·12)이고, **24 · 15.36 · 14.08 · 12.8 · 12.48 다섯은 어떤 토큰에도 대응하지 않는다.**

---

## 2. 390px 에서의 줄 길이 — 위반이 없다

폰트 advance 로 계산한 줄당 글자수(영문, 스페이스 포함):

| 역할 | main 358px | 패널 316px | 카드 326px | 답변 선택지 260px | 블로그 목록 행 288px |
|:---|---:|---:|---:|---:|---:|
| `--body` 16px | 50.0 | 44.1 | 45.5 | 36.3 | 40.2 |
| `--t-card-subtitle` / `--t-choice` 15px | 53.3 | 47.1 | 48.5 | 38.7 | 42.9 |
| `--body-sm` 14px | 57.1 | 50.4 | 52.0 | 41.5 | 45.9 |
| `--caption` 13px | 61.5 | 54.3 | 56.0 | 44.7 | 49.5 |

한글 기준(advance 0.8643em)으로는 같은 자리가 18.8~32.0자다.

**결론: 모바일 본문 줄 길이는 전 표면에서 36~62자(영문) · 19~32자(한글)로, 45~75자 관행의 상한을 넘는 자리가 하나도 없고 CJK 25~40자 관행 안에 있다. 이 축에서 모바일 결함은 없다.** 이 렌즈가 발견한 줄 길이 위반은 **데스크톱 쪽에만** 있다(§4 F-16).

---

## 3. iOS Safari 16px 자동 확대 — 오늘은 발화하지 않는다

`grep -rE "<input|<textarea|<select|contentEditable" src` = **0건**. 제품 전체에 폼 입력 컨트롤이 하나도 없으므로, iOS Safari 가 `font-size < 16px` 인 필드에 포커스할 때 일으키는 자동 확대는 **현재 발화할 경로가 없다**. `export const viewport` 도 없어 Next 기본 `width=device-width, initial-scale=1` 이 나가고 `maximum-scale`·`user-scalable=no` 가 없으므로 핀치 줌도 살아 있다(WCAG 1.4.4 의 통상 경로 확보). Tailwind preflight 이 `html { -webkit-text-size-adjust: 100% }` 를 이미 깔아 두어(`node_modules/tailwindcss/preflight.css:31`) iOS 가로 모드 텍스트 자동 팽창도 막혀 있다.

**따라서 「모바일 본문 16px 미만」의 두 근거 중 자동 확대 쪽은 현재 해당 없음이고, 가독성 하한 쪽만 유효하다.** 그 가독성 쪽이 F-02 다. 다만 `docs/req-test.md` §7 결과 파이프라인과 Sheets 주도 콘텐츠가 이후 자유 입력 필드를 들이는 순간 자동 확대 쪽이 살아나므로, 타입 스케일 개정 때 **입력 컨트롤 전용 16px 하한 규칙을 함께 등재**해 두는 것이 값싸다.

---

## 4. 결함 목록

### F-01 타입 스케일에 뷰포트 축이 아예 없다 (major)

`globals.css` 의 `:root` 선언 103개 중 미디어 쿼리로 값이 바뀌는 것은 `--shell-gutter` **단 하나**(:323 → :326-330 → :332-336)다. 타입 역할 14개, `--tap-min`, radius 4개, 모션 4개 어느 것도 폭에 반응하지 않는다. src 전체에서 `md:text-*` · `sm:leading-*` 류 반응형 타이포 유틸리티는 **0건**이고(전수 grep), CSS 파일 3개 안의 `font-size` 선언은 **0건**, `line-height` 선언은 1건(`landing-grid-card.module.css:135`, 태그 칩 1.35)뿐이다.

**결과: 1440px 에서 정한 크기가 390px 로 그대로 나간다.** 예외는 랜딩 히어로 `<h1>` 하나인데, 그것이 유일하게 뷰포트에 반응하면서 **방향이 반대다**(F-04).

**제안:** 토큰 계층에 뷰포트 축을 신설한다. 자리는 미러 구간(`@mirror-begin light` ~ `@mirror-end light`, globals.css:94-227) **밖**이어야 한다 — 미러 안에 쓰면 `tests/unit/design-tokens-dark-parity.test.ts:165` 의 값 대조가 즉시 붉어진다. 두 가지 중 하나를 고른다. ⑴ `docs/design/ds/colors_and_type.css` 에 뷰포트별 역할값을 먼저 정의하고 미러한다(설계 정의가 정본이라는 계약 유지, `AGENTS.md:25`). ⑵ product layer(globals.css:260-324)에 `@media (min-width: 768px) { :root { --h1: …; --body: … } }` 를 두고 그 값의 출처를 §3-1 의 R/C/D/I 로 표기한다. **⑴을 권고한다** — 타입 역할은 시각 정의이고, ds 쪽에 두지 않으면 다음 push 때 두 쪽이 다시 갈린다.

### F-02 본문이 14px 로 나간다 — `--body`(16px)의 소비처가 제품 전체에 한 곳뿐이다 (major)

`[font:var(--body)]` 는 저장소 전체에서 **1회**(`src/features/blog/blog-destination-client.tsx:37`, 블로그 상세 기사 본문)뿐이다. 나머지 모든 표면의 본문은 `--body-sm`(400 **14px**/1.55)이 진다 — `surface-class-names.ts:109` `testBodyClassName`(instruction 본문 · 결과 설명), `history/page.tsx:18`, `not-found.tsx:18`, `global-not-found.tsx:25`, `consent-banner.tsx:245`(동의 문구), `blog-destination-client.tsx:141`(빈 상태), `surface-class-names.ts:102`(결과 데이터 행 값). 그리고 동의 고지문(`instructionNoteClassName`, `instruction-overlay.tsx:28` → `--caption` **13px**)과 블로그 목록 부제(`blog-destination-client.tsx:51` → `--caption` 13px)는 한 단 더 내려간다.

**이것은 구현 일탈이 아니라 설계 정의가 그렇게 적어 둔 것이다.** `docs/design/ds/app-components.css:629` `.vt-banner__body { font: var(--body-sm) }` · `:659` `.vt-empty__body { font: var(--body-sm) }` · `:610` `.vt-datarow__val { font: var(--body-sm) }`. 제품은 명세를 충실히 구현했고, 명세 쪽에 모바일 본문 하한이 없다.

**관행 대비:** iOS HIG Body = 17pt, Material 3 body-large = 16sp / body-medium = 14sp(보조용). 14px 은 두 플랫폼 모두에서 **보조 텍스트 크기**이며, 사용자가 읽고 결정해야 하는 문장(동의 문구 5줄, instruction 본문, 에러 설명)에 배정할 크기가 아니다.

**제안:** 역할 이름을 그대로 두고 **모바일에서의 값만** 올린다 — `--body` 16px 유지, `--body-sm` 을 모바일에서 15px(`400 15px/1.55`)로, `--caption` 13px 은 메타/라벨 전용으로 좁히고 **문장 성격의 텍스트는 `--body-sm` 이상만 허용**한다는 규칙을 `design.md` §4.3 에 한 줄로 넣는다. 그리고 동의 문구·instruction 본문·에러 설명 세 자리는 `--body-sm` → `--body` 로 역할을 올린다(세 자리 모두 그 화면의 주된 읽을거리다).

### F-03 랜딩 `<h1>` 이 굵기 400 으로 렌더된다 (major)

`src/app/[locale]/page.tsx:29` 는 `className="m-0 text-[clamp(1.5rem,2.4vw,2.2rem)] leading-[1.2] tracking-[-0.01em]"` 이고 **font-weight 유틸리티가 없다**. Tailwind v4 preflight 이 `h1,…,h6 { font-size: inherit; font-weight: inherit; }` 를 깔므로(`node_modules/tailwindcss/preflight.css:73-81`) 이 `<h1>` 은 `<body>` 에서 굵기를 상속하는데, `APP_BODY_CLASSNAME`(`src/app/app-body-class.ts:19`)에도 굵기 선언이 없다 — 최종 계산값은 **400** 이다.

**결과: 제품에서 가장 중요한 제목이 바로 아래 카드 제목(600)보다 가볍고, 같은 섹션의 본문 단락과 굵기가 같다.** 토큰 `--h1` 은 700 인데(globals.css:205) 이 `<h1>` 은 그 토큰을 쓰지 않는다.

**제안:** 히어로를 `[font:var(--h1)]` + `[letter-spacing:var(--track-tight)]` 로 바꾸고, 크기의 뷰포트 반응은 F-01 의 토큰 축이 갖게 한다. 리터럴 `tracking-[-0.01em]` 도 `var(--track-tight)` 로 바꾼다(같은 값의 두 번째 철자다).

### F-04 유일하게 뷰포트에 반응하는 제목이 모바일에서 작아진다 (major)

`text-[clamp(1.5rem,2.4vw,2.2rem)]` → 390px 에서 `2.4vw = 9.36px` 이므로 하한 **24px**, 1440px 에서 `2.4vw = 34.56px` 이므로 **34.56px**. 같은 화면의 카드 제목은 두 폭 모두 20px 고정(`--t-card-title`)이다. **히어로/카드 크기비가 데스크톱 1.73 : 모바일 1.20 이다** — 계층이 가장 필요한 좁은 화면에서 계층이 무너진다. 그리고 이 h1 은 블로그 색인의 `<h1>`(`--h1` 30px)보다도 6px 작다.

**제안:** 모바일 하한을 올린다(권고 `clamp(1.625rem, 4.5vw, 2.2rem)` → 390px 에서 26px, 640px 에서 28.8px, 1440px 에서 32px 상한 근처). 다만 F-01 의 토큰 축을 먼저 세우고 `--h1` 자체를 뷰포트 반응형으로 만든 뒤 히어로가 그 토큰을 읽게 하는 쪽이 낫다 — 지금은 히어로만 유동이고 나머지 전부가 고정이라 스케일이 두 벌이다.

### F-05 `line-height: 1.2` 가 이 폰트에서 행간 0.20px 을 남긴다 (major)

§0 에서 확정한 대로 Pretendard 의 content area 는 **1.1934em** 이고 line gap 은 0 이다. 따라서 `--h1`(`700 30px/1.2`)의 줄 상자는 36.00px, 글리프가 차지하는 높이는 35.80px — **행간 0.20px**. 랜딩 히어로(24px/1.2)는 줄 상자 28.80px, content area 28.64px — **행간 0.16px**. 두 값 모두 사실상 solid set 이다.

**그리고 둘 다 모바일에서 실제로 여러 줄이 된다.** 계산(390px):

- 블로그 상세 기사 제목(`--h1` 30px, 패널 안쪽 316px): en `"Operational Handbook for Stable Releases"` → **2줄**, kr `"안정적인 배포를 위한 운영 핸드북"` → **2줄**(줄당 8.5자). 320px(패널 안쪽 246px)에서는 en **3줄 · 블록 108.0px** — `"Operational" / "Handbook for" / "Stable Releases"`.
- 랜딩 히어로(24px, 358px): **12개 locale 중 10개가 2줄**(kr·zs·zt 만 1줄, ja 2줄). en 은 `"Find your working rhythm in one" / "pass"` — 한 단어짜리 orphan 줄이다.

**제안:** `--h1` 의 행간을 `1.2` → **`1.28`** 로 올린다(30px 에서 38.4px 줄 상자, 행간 2.60px). 랜딩 히어로도 `leading-[1.2]` 를 버리고 토큰을 쓴다. 그리고 orphan 은 설계 정의가 이미 답을 갖고 있다 — `docs/design/ds/colors_and_type.css:834` 의 `:where(.vive) p { … text-wrap: pretty }`. 제품에는 `text-wrap` 선언이 **0건**이므로(전수 grep), 제목에는 `text-wrap: balance`, 본문에는 `text-wrap: pretty` 를 base 계층에 넣는다(F-08 과 같은 자리).

### F-06 블로그 상세의 `<h1>` 이 12px 짜리 라벨이고 기사 제목이 `<h2>` 다 (major)

`src/features/blog/blog-destination-client.tsx:112` — `<h1 className={article ? blogKickerClassName : blogPageTitleClassName}>{headingLabel}</h1>`. `article` 이 있으면(= 상세 화면) 이 `<h1>` 은 `blogKickerClassName`(`:32`, `[font:var(--overline)]` = **600 12px/1.4** + `--track-over`)을 받아 `"Selected article"` 을 12px 로 그린다. 그 아래 `:115` 의 `<h2>` 가 `--h1`(**700 30px**)로 기사 제목을, `:121` 의 또 다른 `<h2>` 가 `--h3`(600 20px)로 목록 제목을 그린다.

**한 문서 안에 `<h2>` 가 30px 과 20px 두 벌이고, `<h1>` 은 페이지에서 가장 작은 텍스트다.** WCAG 2.4.6 Headings and Labels(AA)는 제목이 주제 또는 목적을 기술할 것을 요구하는데 `"Selected article"` 은 기사의 주제를 기술하지 않는다. axe 가 이것을 잡지 못하는 것은 `heading-order` / `page-has-heading-one` 이 레벨 건너뜀과 존재만 보기 때문이다.

**제안:** 기사 제목을 `<h1>` 으로 올리고 kicker 를 `<p>` 로 내린다. 목록 섹션 제목은 `<h2>` 로 유지한다. 시각은 그대로여도 되며(kicker 12px, 제목 30px) 바뀌는 것은 태그뿐이다 — 다만 §4 F-05 대로 `--h1` 의 행간을 함께 고친다.

### F-07 테스트 화면의 `<h1>` 이 그 아래 `<h2>` 보다 작다 (minor)

`src/features/test/test-question-client.tsx:255` 의 `<h1 className={testTitleClassName}>` 은 `--h3` = **20px**/600(`surface-class-names.ts:107`)이고, `:352` 의 `<h2 className={testQuestionClassName}>` 은 `--t-expanded-question` = **21px**/600(`:57`)이다. 같은 카드 안에서 h2 가 h1 보다 1px 크다. `instruction-overlay.tsx:160,208` 과 `test-result-panel.tsx:76` 의 `<h2>` 는 `--h3` 20px 이라 h1 과 **정확히 같다**.

`--h1`(30px)은 실제 `<h1>` 여섯 곳 중 **한 곳에서도 쓰이지 않는다** — 랜딩(clamp 24px) · 테스트(`--h3` 20px) · 히스토리(`--h3` 20px, `history/page.tsx:17`) · 테스트 에러(`--h3` 20px, `test/error/page.tsx:16`) · 404 둘(`--h3` 20px, `not-found.tsx:17` · `global-not-found.tsx:24`). `--h1` 을 받는 것은 블로그 색인의 `<h1>`(`blog-destination-client.tsx:33`)과 블로그 상세의 `<h2>` 뿐이다.

**제안:** 페이지 제목 역할을 하나로 정한다. 스케일에 `--h2`(설계 정의는 이미 `600 24px/1.25` 를 갖는다, `colors_and_type.css:249`)를 미러해 들여오고, **모든 표면의 `<h1>` 을 `--h2` 이상으로 통일**한다(카드 제목 20px 과 구분이 서는 최소 단계). 21px 문항은 `--h3` 20px 로 내려 `<h2>` 가 `<h1>` 을 넘지 않게 한다 — 또는 그 21px 이 랜딩 확장 카드와 같아야 한다는 계약(`req-landing.md:294`, `test-question-client.tsx:54-55` 주석)을 지키려면 반대로 테스트 `<h1>` 을 24px 로 올린다. **후자를 권고한다**(계약을 건드리지 않는다).

### F-08 §4.3 의 「전역 줄바꿈 규칙」이 전역이 아니다 — 가장 긴 산문에 빠져 있다 (major)

`docs/design/design.md:84` 은 이것을 **Global wrapping rule** 로 적는다 — 「wrapping text uses `word-break: keep-all; overflow-wrap: anywhere;`」. 설계 정의는 이것을 base 계층으로 구현해 뒀다(`docs/design/ds/colors_and_type.css:842-845`):

```css
:where(.vive) :is(p, h1, h2, h3, h4) {
  word-break: keep-all;
  overflow-wrap: anywhere;
}
```

그 위의 주석이 의도를 못 박는다 — 「Kept at element level and at zero specificity: it is a default that applies to **any prose**」.

**런타임에는 이 base 규칙이 없다.** `src/app/globals.css` 의 `@layer base` 블록(`:427-431`)에 들어 있는 규칙은 `a { color: var(--ink) }` **하나뿐**이다. 대신 제품은 개별 클래스 문자열에 짝을 손으로 적는다 — 전수 결과 **둘 다 가진 곳 9개**(`test/error/page.tsx:16` · `landing-grid-card.tsx:232,237` · `test-question-client.tsx:57` · `surface-class-names.ts:89,102` · `blog-destination-client.tsx:35,47`, 그리고 `landing-grid-card.module.css:128-132` 가 `-normal` 접미 클래스 둘에 부여), **`overflow-wrap` 만 가진 곳 3개**(`landing-grid-card.tsx:219,221,255`), **둘 다 없는 곳 15개 이상**.

**빠진 쪽이 하필 가장 긴 산문이다.** 모바일 390px 에서 계산한 한국어 중간 끊김 비율:

| 자리 | 줄 수 | 중간 끊김 | keep-all 적용 시 줄 수 |
|:---|---:|---:|---:|
| 블로그 상세 본문 `blog-destination-client.tsx:37`(`--body` 16px, 316px) | 9 | **7 / 8** | 9 (변화 없음) |
| 랜딩 히어로 본문 `page.tsx:30`(16px, 358px) | 3 | **2 / 2** | 3 (변화 없음) |
| 동의 문구 `consent-banner.tsx:245`(`--body-sm` 14px, 330px) | 3 | 1 / 2 | 3 (변화 없음) |
| 히스토리 본문 `history/page.tsx:18`(14px, 254px) | 2 | 1 / 1 | 2 (변화 없음) |
| 블로그 목록 부제 `blog-destination-client.tsx:51`(`--caption` 13px, 288px) | 8 | 1 / 7 | 8 (변화 없음) |

블로그 상세 본문의 실제 첫 두 줄이 이렇게 끊긴다 — `"…어떻게 준비할지, 배포 순"` / `"서를 어떤 원칙으로 고정할지…"`. **어느 경우에도 줄 수가 변하지 않는다** — 즉 이 수정은 레이아웃 비용이 0 이다. 이것은 `docs/design/ds/README.md` 의 D-06 가 카드 제목·부제에 대해 이미 측정한 것과 같은 결함이며(「seven of the ten fixture cards broke Korean mid-word … without changing a single line count」), D-06 가 카드 두 슬롯만 닫고 나머지 표면을 열어 둔 것이다.

**제안:** `globals.css` 의 `@layer base` 에 설계 정의와 같은 규칙을 넣는다 — `@layer base { :is(p, h1, h2, h3, h4, li, dd, dt) { word-break: keep-all; overflow-wrap: anywhere; } }`. `@layer base` 안이므로 어떤 유틸리티에도 진다(그 층의 존재 이유를 globals.css:418-426 주석이 이미 적는다). 그러면 개별 클래스에 손으로 적은 9곳 중 중복은 제거해도 되고 남겨도 무해하다. 같은 자리에 F-05 의 `text-wrap: pretty`(본문) / `balance`(제목)도 함께 넣는다.

### F-09 확장 카드의 제목이 14px 로 떨어진다 — 그 시트에서 가장 작은 글씨다 (major)

Normal 카드 제목은 `--t-card-title` = **600 20px**/1.3(`landing-grid-card.tsx:219`). 확장 상태의 제목은 데스크톱 오버레이(`:878-889`)와 모바일 시트(`:1233`, `:1271`) **양쪽 모두** `LANDING_GRID_CARD_EXPANDED_CONTEXT_CLASSNAME`(`:254-255`) = `[font:var(--label)]` = **500 14px**/1.4 를 받는다.

모바일 시트 안의 활자 순서를 크기로 세우면 제목 14px < 선택지 15px(`--t-choice`) < 문항 21px(`--t-expanded-question`) 이다 — **열린 시트의 제목이 그 안에서 가장 작다.** 메타 행 13px 만이 더 작다.

그런데 `docs/req-landing.md:630`(§8.5, `:619` 부터) 은 「Mobile Expanded settled에서 title 시작 기준선은 Expanded 진입 직전 Normal 상태와 `0px` 오차로 일치해야 한다」고 요구한다. 구현은 이 「기준선」을 요소 상자의 `rect.top` 으로 잰다(`src/features/landing/grid/mobile-card-lifecycle-dom.ts:26` `titleTopPx`). **상자 상단이 0px 로 맞아도 글자의 첫 베이스라인은 5.33px 이동한다** — 20px/1.3 은 상자 상단에서 `half-leading 1.07 + ascent 19.04 = 20.11px`, 14px/1.4 는 `1.45 + 13.33 = 14.78px` 다(Pretendard ascent 1950/2048). 게이트는 초록인데 계약이 말하는 연속성은 사용자에게 성립하지 않는다.

**제안:** 확장 제목의 역할을 `--label`(500 14/1.4)에서 Normal 과 같은 `--t-card-title`(600 20/1.3)로 올린다. 그러면 §8.5 의 0px 연속성이 상자 기준이든 베이스라인 기준이든 동시에 성립하고, 시트 안의 크기 순서도 제목 20 > 문항 21… 이 되어 문항이 여전히 크다 — 문항을 `--h3` 20px 로 내리거나 제목을 `--h2` 24px 로 올려 순서를 세운다(F-07 과 같은 결정). 이 변경은 `tests/unit/landing-card-contract.test.ts:589,625` 의 `[font:var(--label)]` 단언 2건과 `tests/e2e/grid-smoke.spec.ts:789-795` 의 `context: {fontSize:'14px', fontWeight:'500', lineHeight:'19.6px'}` 를 함께 고쳐야 한다.

### F-10 확장 제목의 첫 줄 split 을 20px 에서 재고 14px 로 그린다 (major)

`docs/req-landing.md:283` 은 「Desktop/Tablet Expanded title … Expanded의 첫 줄은 … **Normal title 폭 기준으로 계산한 첫 줄 split 결과**를 그대로 유지해야 한다」고 요구하고, `design.md:85`(Catalog title matrix) 이 같은 말을 한다. 구현은 `useLandingCardTitleSplit({… titleRef: normalTitleRef})`(`landing-grid-card.tsx:985-990`)로 **Normal 제목 요소**에서 계산 스타일을 복사해 프로브를 만들고(`landing-card-title-continuity.tsx:60-89` `buildTextProbe`), 그 결과인 `line1Text` / `overflowText` 를 **14px 짜리 `<h2>` 안에** 렌더한다(`landing-grid-card.tsx:878-889` 의 `<h2>` → `DesktopExpandedTitle`, `:913-924`).

**즉 20px 에서 「딱 한 줄에 들어가는 만큼」으로 자른 문자열을 14px 로 그린다.** Normal 카드 폭을 꽉 채우도록 계산된 첫 줄은 14px 에서 약 `14/20 = 70%` 폭만 차지하므로, 확장 제목의 첫 줄은 상자 오른쪽에 **약 30% 의 빈 자리를 남기고** 끊긴다. 보존된 것은 문자열이지 사용자가 본 줄바꿈 위치가 아니다.

**같은 함수에 두 번째 결함이 있다.** `buildTextProbe`(`:60-89`)는 `fontFamily` · `fontSize` · `fontStyle` · `fontStretch` · `fontVariant` · `fontWeight` · `letterSpacing` · `lineHeight` · `textTransform` 을 복사하고 `overflowWrap` 은 `'anywhere'` 로 **하드코딩**하지만, **`wordBreak` 는 복사하지도 설정하지도 않는다**. 실제 Normal 제목에는 `word-break: keep-all` 이 걸려 있다(`landing-grid-card.module.css:128-132`). 따라서 프로브는 `word-break: normal` 로 — 한글 음절 사이 어디서나 끊으며 — 재고, 실제 요소는 공백에서만 끊는다. **프로브가 한 줄에 넣는 글자 수가 실제보다 많아지므로 kr·ja·zs·zt 에서 `line1Text` 가 화면에 보였던 첫 줄보다 길다.**

**제안:** ⑴ `buildTextProbe` 에 `probe.style.wordBreak = computedStyle.wordBreak;` 한 줄을 더한다(하드코딩된 `overflowWrap` 도 복사로 바꾼다). ⑵ 확장 제목의 타입 역할을 F-09 대로 `--t-card-title` 로 맞추면 「20px 에서 재고 14px 로 그린다」가 자동으로 해소된다. 두 수정은 독립이고 ⑴은 ⑵ 없이도 옳다.

### F-11 clamp 행렬이 결정 2 가 재정의할 바로 그 플래그에 걸려 있다 (major)

`landing-grid-card.tsx:379` 는 부제 clamp 를 `isMobileViewport ? 'overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-2'` 로, `:408` 은 제목 clamp 를 `isMobileViewport ? 'block overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-1'` 로 가른다. `isMobileViewport` 는 같은 파일 `:970` 의 `viewportTier === 'mobile'` 이고, **생명주기 판정(`:971-978`)이 쓰는 것과 같은 한 줄**이다.

**결정 2(입력 방식 기준 통일)가 `:970` 을 다시 배선하면 clamp 행렬도 함께 옮겨 간다.** hover 없는 900px 태블릿은 그 순간 제목 1줄 ellipsis → 전체 표시, 부제 2줄 clamp → 전체 표시로 바뀐다. `ops-handbook` 부제 기준으로 그 카드 하나가 **2줄 → 12줄**(260px 열, 15px 계산)이 되고, 그리드 행 높이와 태그 행 기하가 함께 움직인다. clamp 는 **열 폭의 함수**이지 입력 방식의 함수가 아니므로 이것은 명백한 오배선이다.

**제안:** 0단계 구조 분리에서 `isMobileViewport` 를 두 이름으로 가른다 — 생명주기·닫기 경로용 `usesTouchLifecycle`(입력 축)과 레이아웃·clamp·스케일용 `isSingleColumnLayout`(폭 축). `:379` · `:408` 과 `:994`(`useCardExpandedScale`) · `:1042`(full-bleed) · `:1058,:1064`(row stretch)는 후자에 남긴다. 이 변경은 `scripts/qa/check-phase5-card-contracts.mjs:133` 이 위 삼항 연산을 **소스 문자열 그대로** 정규식으로 고정하고 있으므로 그 체커를 함께 고쳐야 한다(qa:rules, release-level).

### F-12 블로그 목록 행의 부제가 13px 로 9줄이다 (major)

`blog-destination-client.tsx:51` 의 `blogArticleLinkSubtitleClassName` 은 `'[font:var(--caption)] text-[var(--ink-body)]'` 가 전부다 — `line-clamp` · `overflow` · `text-overflow` 선언이 하나도 없다(저장소 전체의 `line-clamp` 사용처는 `landing-grid-card.tsx:379,382,408` 3곳뿐, 전수 grep). `ops-handbook` 부제는 371자다(`src/features/variant-registry/source-fixture.ts:194`, 그 문장 자신이 「subtitle clamp 와 overflow 규칙을 검증하려고 의도적으로 길게 썼다」고 밝힌다).

390px 에서 행 안쪽 폭은 `358 − 2(패널 border) − 40(패널 p-5) − 2(행 border) − 28(링크 px-3.5) = 288px`. 계산 결과 **en 9줄 · 169.7px** · kr 8줄 · 150.8px. 같은 행의 제목은 15px 1줄 21.75px 다 — **보조 텍스트가 제목의 7~8배 높이다.** 목록이 목록으로 읽히지 않는다.

**제안:** 목록 행 부제에 `line-clamp-2`(9줄 → 2줄, 169.7px → 37.7px)를 적용한다. 전문 도달 경로는 이미 있다 — 같은 행을 누르면 `/{locale}/blog/{variant}` 에서 같은 `subtitle` 이 `--body` 16px 로 전부 렌더된다(`:116`). **따라서 정보 손실이 아니다.** 동시에 `--caption` 13px 은 부제에 너무 작으므로 `--body-sm` 14px 로 올린다(설계 정의 `app-components.css` 에는 이 컴포넌트의 명세가 아예 없다 — §5 참조).

### F-13 GNB 활자 전체가 스케일 밖이고, 설계 정의와 5곳에서 갈린다 (major)

`docs/design/ds/app-components.css` 는 GNB 타입을 **토큰으로** 명세한다. 제품은 그 다섯을 전부 rem 분수 리터럴로 구현했다:

| 요소 | 설계 정의 | 제품 | 차이 |
|:---|:---|:---|:---|
| CI 브랜드 | `.vt-gnb__brand { font: var(--h4) }` = **600 18px/1.4** (`:293-299`) | `text-base font-bold` = **16px/700/1.5** (`site-gnb.tsx:45`) | −2px, +100 |
| 데스크톱 nav 링크 | `.vt-gnb__link { font: var(--body-sm); font-weight: 500 }` = **14px/1.55/500** (`:303-305`) | `text-[0.96rem]` = **15.36px/400/1.5** (`site-gnb.tsx:50`) | +1.36px, −100 |
| 드로어 링크 | `.vt-drawer__link { font: var(--h4) }` = **18px/600** (`:518-531`) | `text-base font-semibold` = **16px/600** (`site-gnb.tsx:101`) | −2px |
| 설정 라벨 | `.vt-settings__label { font: var(--overline); letter-spacing: var(--track-over); text-transform: uppercase }` = **12px/600/1.4/0.08em** (`:375-383`) | `text-[0.78rem] font-bold uppercase tracking-[0.03em]` = **12.48px/700/1.5/0.03em** (`settings-controls.tsx:18`) | +0.48px, +100, 추적 −0.05em |
| 칩(로케일 12 + 테마 2) | `.vt-chip { font: var(--caption); font-weight: 600 }` = **13px/1.45/600** (`:393-407`) | `text-[0.8rem] font-semibold` = **12.8px/1.5/600** (`settings-controls.tsx:29`) | −0.2px, 행간 +0.05 |

여기에 제품에만 있는 두 자리가 더 붙는다 — pill(뒤로·햄버거·설정 트리거) `text-[0.88rem]` = **14.08px**(`site-gnb.tsx:64`), 드로어 머리 라벨 `text-[0.78rem] … leading-none` = **12.48px / 행간 −2.41px**(`site-gnb.tsx:98`). `--h4` 는 런타임 미러에 없어(globals.css 전수 grep) 설계 정의를 따르려면 먼저 미러에 들여와야 한다.

**이 다섯 갈림은 `docs/decision-register.md` 의 BQ-38 등재 3건에 들어 있지 않고, `docs/design/ds/README.md` 의 findings 표에도 행이 없다** — `AGENTS.md` §3-1 기준 미등재 R/C 갈림 5건이다.

**제안:** GNB 를 스케일 위로 되돌린다. `--h4`(600 18px/1.4)를 미러에 들여오고 브랜드·드로어 링크를 그것으로, 데스크톱 링크를 `--body-sm`+500 으로, 설정 라벨과 드로어 머리 라벨을 `--overline`+`--track-over`+uppercase 로, 칩을 `--caption`+600 으로 바꾼다. pill 은 스케일에 없는 14.08px 이므로 `--body-sm`(14px)로 내린다. **그리고 옮기기 전에 다섯 갈림을 `decision-register.md` 에 등재한다** — 지금 제품 값이 R, ds 값이 C 이므로 어느 쪽으로 수렴할지가 결정 사항이다.

### F-14 px 토큰과 rem 리터럴이 섞여 있어 글꼴 확대 시 계층이 뒤집힌다 (minor)

타입 역할 14개는 **전부 px** 이고(globals.css:205-222), 제품이 손으로 적은 크기 6자리는 **rem/vw** 다(`text-base` ×3 · `0.96rem` · `0.88rem` · `0.78rem` ×2 · `0.8rem` · `clamp(1.5rem,2.4vw,2.2rem)`). 사용자가 브라우저 기본 글꼴을 200%(32px)로 올리면 rem 쪽만 두 배가 된다 — GNB 브랜드 16→**32px**, 랜딩 히어로 하한 24→**48px** 인 반면 블로그 `--h1` 은 **30px 그대로**, 카드 제목은 **20px 그대로**다. 히어로가 블로그 제목의 1.6배가 되고, GNB 바는 `h-14`(56px) 고정인데 브랜드 줄 상자가 48px 이 된다.

핀치 줌이 살아 있으므로 WCAG 1.4.4 위반은 아니지만(§3), 「글꼴만 키우는」 경로에서 타입 계층이 깨지는 것은 사실이다.

**제안:** 한쪽으로 통일한다. 이 저장소는 토큰 값이 px 이고 시각 baseline 170장이 그 px 에 고정돼 있으므로, **rem 리터럴 6자리를 px 토큰으로 되돌리는 방향**이 싸다(F-13 과 같은 작업). rem 을 택하려면 14개 토큰과 baseline 전부가 함께 움직여야 한다.

### F-15 overline 역할이 세 가지로 갈리고, 그중 둘은 uppercase 를 잃었다 (minor)

설계 정의의 overline 은 세 선언이 한 벌이다 — `.t-overline { font: var(--overline); letter-spacing: var(--track-over); text-transform: uppercase; }`(`colors_and_type.css:855-861`), `design.md:78` 도 「ALL CAPS only for the small tracked overline」이라고 못 박는다. 제품에는 네 자리가 있고 셋으로 갈린다.

- `blogKickerClassName`(`blog-destination-client.tsx:32`) — font + tracking, **uppercase 없음**.
- `testOverlineClassName`(`surface-class-names.ts:113-114`) — font + tracking, **uppercase 없음**. 소비처는 문항 번호 `Q{n}`(`test-question-client.tsx:348-350`).
- `gnbMobileHeadLabelClassName`(`site-gnb.tsx:98`) — uppercase 는 있으나 **토큰도 `--track-over` 도 아님**(12.48px/700/`leading-none`/0.03em).
- `settingsLabelClassName`(`settings-controls.tsx:18`) — 같음(12.48px/700/0.03em).

**대문자 조판용으로 만든 0.08em 추적이 소문자 문장에 걸려 있고, 대문자로 그리는 두 자리는 그 추적을 쓰지 않는다** — 정확히 반대로 짝지어져 있다.

**제안:** 역할을 하나로 만든다. `text-transform: uppercase` 를 overline 역할의 일부로 못 박고(클래스 상수 두 개에 추가), GNB 의 두 라벨을 그 상수로 바꾼다. `leading-none`(행간 −2.41px)도 함께 사라진다.

### F-16 유일한 장문 읽기 표면의 측정이 92자다 — 그리고 `ch` 가 그것을 가렸다 (major)

`blogSelectedArticleClassName`(`blog-destination-client.tsx:29`)은 `max-w-[760px]`, 본문은 `--body` 16px(`:37`). 760px 에서 실측 advance 로 계산한 줄당 글자수는 **92.0자**다 — 45~75 관행의 상한을 23% 넘는다. 760 은 설계 정의의 `--container-narrow: 760px`(`colors_and_type.css:371`) 값인데, 그 줄에는 `/* [not realized] */` 주석이 붙어 있다. **실제로는 리터럴로 실현돼 있고 `globals.css` 에는 그 토큰이 없다** — `AGENTS.md` §3-1 기준 미등재 R/C 갈림이다.

랜딩 히어로 본문(`page.tsx:30`)은 `max-w-[70ch]` 로 측정을 제어하려 한다. 그런데 CSS `ch` 는 `0` 글리프의 advance 이고 Pretendard 에서 그 값은 `0.5957em` = 16px 에서 **9.531px** 이다. 따라서 `70ch = 667.2px` 이고, 그 폭에서 실제 줄당 글자수는 **93.1자**다. **`ch` 로 70 을 적으면 프로포셔널 폰트에서는 93자가 된다** — 제어하려 한 값과 결과가 33% 어긋난다.

390px 에서는 두 상한 모두 컨테이너에 눌려 발동하지 않으므로(§2) 이 결함은 데스크톱에만 나타난다.

**제안:** 읽기 폭을 글자수 기준으로 다시 푼다. `--body` 16px 의 문자당 유효 폭 7.16px 기준으로 **66자 = 473px · 75자 = 537px** 이다. `--container-narrow` 를 **540px** 로 재정의하고(75자 상한), `max-w-[70ch]` 를 같은 토큰으로 교체한다. 그리고 그 값을 `decision-register.md` 에 R/C 갈림 해소로 등재한다 — 지금은 토큰이 「미실현」이라고 적혀 있는데 리터럴로 실현돼 있다.

### F-17 1.96MB 웹폰트가 메트릭 보정 없이 swap 된다 (major)

`globals.css:31-37` 의 `@font-face` 는 `font-display: swap` 이고 preload 되지 않으며(:22-29 주석이 그 선택을 명시), **`size-adjust` · `ascent-override` · `descent-override` · `line-gap-override` 가 하나도 없다**(src·public·ds 전수 grep 0건). `font-size-adjust` 도 0건이다. 파일은 2,057,688 bytes 다.

따라서 모든 cold load 에서 fallback face 로 한 번 조판하고 Pretendard 도착 후 다시 조판한다. Pretendard 쪽 메트릭은 §0 에서 확정했다(content 1.1934em, line gap 0). 저장소는 이 리플로를 이미 알고 있다 — `use-grid-geometry-controller.ts` 가 `document.fonts` 준비를 듣고 재측정하며(`scripts/qa/check-phase6-spacing-contracts.mjs:49` 가 그 존재를 강제), `tests/e2e/grid-smoke.spec.ts` 에 「font-ready and resize remeasure preserve settled compensation」 케이스가 있다(`check-phase6:129`). **즉 리플로를 없애지 않고 측정으로 뒤따라가는 구조다.**

**제안:** `@font-face` 에 fallback 대비 메트릭 보정을 넣어 swap 시 줄 수가 바뀌지 않게 한다. 최소 구현은 fallback 전용 `@font-face`(`font-family: 'Pretendard Fallback'; src: local('…'); ascent-override/descent-override/size-adjust`)를 선언하고 `--font-sans` 스택에서 Pretendard 바로 뒤에 두는 표준 패턴이다. **fallback face 의 실제 메트릭은 이 세션에서 재지 않았다**(§11) — 착수 세션이 대상 플랫폼의 첫 fallback(`-apple-system` / `Apple SD Gothic Neo`)을 측정해 보정값을 정해야 한다.

### F-18 확장 블로그 부제의 4줄 clamp 는 도달할 수 없는 코드다 (minor)

`landing-grid-card.tsx:382` 의 `clamp === 'expanded'` 가지는 `'m-0 overflow-hidden text-ellipsis line-clamp-4'` 를 붙인다. 그런데 `LandingCardSubtitleText`(`:355`)의 호출자는 `NormalCardSubtitle`(`:437-448`) **하나뿐이고 언제나 `clamp="normal"` 을 넘긴다**(전수 grep). 게다가 블로그 카드는 확장 상태에 들어갈 수 없다 — `:970` 의 `resolvedState` 가 `(isUnavailable || isBlogCard) && state === 'expanded' ? 'normal' : state` 이고, `ExpandedCardBody`(`:808-828`)는 언제나 `ExpandedTestBody` 만 렌더한다.

그럼에도 `docs/req-landing.md:298-300` 은 「Landing Expanded Blog subtitle: 같은 `subtitle`을 continuity 있게 유지하며 총 4줄까지만 표시한다」(`:298`)와 그 파생 조항 둘(`:299`·`:300`)을 계약으로 유지하고, `scripts/qa/check-variant-only-contracts.mjs:119-121` 이 req-landing.md 안에 `` `subtitle` `` · `4줄` · `재사용` 세 문자열이 있는지를 검사해 그 조항을 살려 둔다. `docs/req-landing.md` §6.6 의 Verification 4번도 같은 상태를 검증하라고 적는다.

**제안:** 계약 개정 때 §6.6 의 Expanded Blog subtitle 조항 3개(`:298`·`:299`·`:300`)를 삭제하고 `:382` 의 죽은 가지를 걷는다. 동시에 `check-variant-only-contracts.mjs:119-121` 의 세 문자열 검사를 지운다 — 그것을 남기면 삭제한 순간 qa:rules 가 붉어진다.

### F-19 13px 이 세 가지 굵기·행간으로 적혀 있다 (minor)

`--caption` = `400 13px/1.45` 를 쓰는 4곳(`surface-class-names.ts:99,111` · `test-question-client.tsx:62` · `blog-destination-client.tsx:51`), `text-[13px] font-medium leading-[1.35]`(= 미러되지 않은 `--t-tag` `500 13px/1.35`)를 쓰는 4곳(`landing-grid-card.tsx:230,243,504,537`), `text-[13px] font-semibold leading-[1.45]` 를 쓰는 2곳(`surface-class-names.ts:93` · `test-question-client.tsx:64`). 태그 칩만은 클래스에 행간이 없고 `landing-grid-card.module.css:135` 가 1.35 를 따로 준다.

**제안:** `--t-tag`(`500 13px/1.35`)를 미러에 들여와 4곳이 그것을 읽게 하고, 세 번째 조합(600/1.45)은 `--t-tag` 로 흡수하거나 별도 역할로 등재한다.

### F-20 GNB 타이머에 크기 선언이 없다 (minor)

`gnbDesktopTimerClassName`(`site-gnb.tsx:78`)과 `gnbMobileTimerClassName`(`:79`)은 `'m-0 font-semibold tabular-nums text-[var(--ink-body)]'` — **font-size 가 없다.** `<body>`(`app-body-class.ts:19`)에도 없으므로 UA 기본 16px 을 상속하고 행간은 `leading-[1.5]` 로 24px 이 된다. 결과적으로 테스트 문맥의 모바일 GNB(56px 바)에서 **수동 표시인 타이머 16px/600 이 유일한 컨트롤인 `뒤로` pill 14.08px/600 보다 크다.**

**제안:** 타이머에 역할을 준다 — `--label`(500 14px/1.4) 또는 F-13 이후의 pill 과 같은 `--body-sm`. `tabular-nums` 는 유지한다.

### F-21 랜딩 히어로 본문에 타입 역할이 없다 (minor)

`page.tsx:30` 은 `className="m-0 max-w-[70ch] text-[var(--ink-body)]"` — 색만 있고 활자 선언이 없다. UA 기본 16px + body 의 `leading-[1.5]` 로 조판되므로 **16px/1.5** 이고, `--body` 는 **16px/1.6** 이다. 크기는 우연히 맞고 행간만 0.1 어긋난 상태로, 제품에서 `--body` 크기로 렌더되는 두 번째 자리가 토큰을 거치지 않는다.

**제안:** `[font:var(--body)]` 를 붙인다. 같은 줄의 `max-w-[70ch]` 는 F-16 대로 토큰으로 바꾼다.

### F-22 `design.md` §5.1 의 타입 토큰 표가 불완전하고 마지막 행이 깨져 있다 (minor)

`docs/design/design.md:133` 은 표 제목을 「Realized type roles (size / weight / line-height)」로 적지만, 실린 것은 카탈로그 역할 **7개**뿐이다 — `--h1` · `--h3` · `--body` · `--body-sm` · `--label` · `--caption` · `--overline` · `--button` **여덟 개가 없다.** 런타임이 실제로 렌더하는 활자의 절반 이상을 시각 SSOT 가 언급하지 않는다.

그리고 `:139` 의 「Expanded question | 20–22px」는 **값이 아니라 범위**다(런타임은 21px). 토큰 표에 범위를 적으면 그것은 토큰이 아니다.

마지막으로 `:143` 은 **4열 표에 셀이 5개**다 — `| Catalog eyebrow / utility line | 14px | 400 | 1.4 | --muted |`. 표 머리는 `| Role | Size | Weight | Line-height |`(:135)이므로 다섯 번째 셀 `--muted` 는 렌더 시 사라진다. 그 값 자체도 문제다 — BQ-29 가 `--muted` 를 흰 바탕 **4.23:1** 로 측정해 AA 미달 판정했고(globals.css:51 이 그 항목을 적는다) 그래서 `--muted-aa` 가 생겼는데, §5.1 은 보이지 않는 셀에서 `--muted` 를 처방하고 있다. 이 역할(`--t-eyebrow` `400 14px/1.4`)은 런타임 소비자가 0 이므로 아직 출시되지 않았지만, 계약 개정에서 §5.1 을 읽고 구현하면 AA 미달이 출시된다.

**제안:** §5.1 을 런타임 역할 전수로 다시 쓴다 — 15개 역할 각각에 size/weight/line-height/tracking/기본 잉크 5열, 그리고 F-01 이후에는 **뷰포트별 값 열**을 더한다. 「20–22px」는 21px 로 확정한다. `--t-eyebrow` 행의 잉크는 `--muted-aa` 로 고친다.

---

## 5. 설계 정의에 명세 자체가 없는 표면

`docs/design/ds/app-components.css:632-635` 가 스스로 적는다 — 「design.md has no pattern for these because they were never extracted」. 실제로 `design.md` §7(Patterns / Application Layer)은 랜딩 카탈로그만 다루고 테스트 플로우·블로그 상세·히스토리·설정·동의 배너·404/에러의 타이포 패턴을 갖지 않는다. `app-components.css` 가 일부를 메우지만(`.vt-empty__title/__body` · `.vt-banner__body` · `.vt-datarow__key/__val`) **블로그 목록 행·블로그 상세 본문·문항 화면의 활자 명세는 어느 문서에도 없다.** F-12 · F-16 이 그 공백에서 나왔다.

계약 개정(결정 1·6)에서 인터랙션 계약과 동작 계약을 가를 때, **타입 스케일은 둘 중 어디에도 속하지 않는 제3의 문서(시각 계약)에 남는다** — `design.md` §4.3 + §5.1 이 그 자리이고, 지금 그 두 절이 위와 같이 불완전하다.

---

## 6. 게이트 영향 요약

| 변경 | 붉어지는 것 |
|:---|:---|
| 타입 토큰 값·이름 변경 | `tests/unit/design-tokens-dark-parity.test.ts:165`(미러 값 대조) · `:218`(소비자 없는 토큰 금지) · `:236`(선언 없는 참조 금지) · 시각 baseline **170장 전부** |
| 미러에 새 토큰(`--h2`/`--h4`/`--t-tag`) 추가 | `docs/design/ds/colors_and_type.css` 를 **먼저** 고쳐야 한다(Ask-First · 저장소 밖 push 표면) → 그 다음 globals.css(Ask-First) |
| 확장 제목 역할 변경(F-09) | `tests/unit/landing-card-contract.test.ts:589,625` · `tests/e2e/grid-smoke.spec.ts:789-795` · 확장 상태 baseline |
| clamp 분기 재배선(F-11) | `scripts/qa/check-phase5-card-contracts.mjs:133`(소스 문자열 정규식) · `tests/unit/landing-card-contract.test.ts:653-665` · `tests/e2e/grid-smoke.spec.ts:477-532,559` |
| §6.6 Expanded Blog subtitle 조항 삭제(F-18) | `scripts/qa/check-variant-only-contracts.mjs:119-121` · `tests/unit/contract-citations.test.ts` · `tests/unit/docs-lifecycle.test.ts` |
| `@layer base` 줄바꿈 규칙 추가(F-08) | 시각 baseline(줄 수는 안 변하지만 줄바꿈 **위치**가 변한다 → kr baseline 다수) |
| 블로그 목록 clamp 추가(F-12) | 블로그 색인 baseline 24장 |
| 히어로 h1 굵기·크기(F-03·F-04) | `theme-layout-landing-normal-*` 8장(en/kr × light/dark × … ) 포함 랜딩 baseline |

baseline 재생성은 `npm run qa:visual:full` 이고 `AGENTS.md:134` 가 사람 승인 없이 실행을 금지한다. 재생성 후 `tests/e2e/theme-matrix-baseline-provenance.md` 등재까지 해야 diff 가 승인된 변경이 된다(`AGENTS.md:241`).

---

## 7. 표면별 커버리지

텍스트를 렌더하는 TSX 는 13개이고 **전부 읽었다**(`grep -rlE "<(p|h[1-6]|span|strong|dt|dd|li|label|em|small)\b" src --include=*.tsx` 결과 + `qualifier-chip.tsx`). landing(`page.tsx` · `landing-grid-card.tsx` · `consent-banner.tsx`) · test(`test-question-client.tsx` · `instruction-overlay.tsx` · `test-result-panel.tsx` · `qualifier-chip.tsx` · `surface-class-names.ts`) · blog(`blog-destination-client.tsx`, 색인·상세 겸용) · history(`history/page.tsx`) · gnb(`site-gnb.tsx` · `settings-controls.tsx`) · settings(= GNB 안 `settings-controls.tsx`) · error(`test/error/page.tsx`) · 404(`not-found.tsx`) · global(`global-not-found.tsx` · `layout.tsx` · `app-body-class.ts` · `page-shell.tsx`) · 공유 버튼 어휘(`button-class-names.ts`). `landing-catalog-grid.tsx` · `transition-gnb-overlay.tsx` · `telemetry-consent-banner.tsx` 셋은 활자 선언이 0건임을 grep 으로 확인했다.

---

## 8. 이 렌즈가 확인한 「결함 없음」

1. **모바일 줄 길이 위반 없다.** 390px 전 표면에서 38~61자(영문) · 20~32자(한글)로 관행 안이다(§2).
2. **iOS Safari 자동 확대 경로가 없다.** 폼 입력 컨트롤 0개(§3).
3. **핀치 줌이 막혀 있지 않다.** `viewport` export 없음 → Next 기본값, `maximum-scale`·`user-scalable` 없음(§3).
4. **iOS 가로 모드 텍스트 자동 팽창이 막혀 있다.** preflight 의 `-webkit-text-size-adjust: 100%`(§3).
5. **320px 가로 오버플로 없다.** 가장 큰 활자(`--h1` 30px)로도 최장 라인이 213.2px(컨테이너 246px), 히어로 24px 에서 273.8px(컨테이너 288px). 최장 단일 토큰 `mean-time-to-detect` 는 본문 16px 에서 152.5px 로 들어간다.
6. **`font` 단축 속성과 개별 유틸리티가 한 원소에서 경쟁하는 자리가 없다.** `[font:var(--X)]` 와 `font-*`/`text-[Npx]`/`leading-*` 가 같은 클래스 문자열에 함께 있는 곳 0건 — L10 함정에 걸린 타이포 자리가 없다.
7. **모바일 Normal 카드의 제목·부제는 잘리지 않는다.** `overflow-visible text-clip`(`landing-grid-card.tsx:379,408`), 계약도 그것을 요구한다(`req-landing.md:285,287`).
8. **답변 선택지 텍스트는 어디서도 잘리지 않는다.** `lineClamp: 'none'` 을 `grid-smoke.spec.ts:810-816` 이 고정한다.

---

## 9. `-webkit-line-clamp` 전수와 정보 손실 판정

| 자리 | clamp | 뷰포트 | 잘린 정보의 다른 경로 | 판정 |
|:---|:---|:---|:---|:---|
| 카드 제목 `landing-grid-card.tsx:408` | `line-clamp-1` | desktop/tablet 만 | 같은 카드 확장 시 전문(`req-landing.md:283`) · 모바일은 전문 | **손실 없음** |
| 카드 부제 `:379` | `line-clamp-2` | desktop/tablet 만 | **blog**: `/blog/{variant}` 가 `--body` 16px 로 전문. **test**: `req-landing.md:295` 「Expanded Test subtitle: 렌더링하지 않는다」 — 전문 경로 없음 | blog 손실 없음 / **test 는 구조적 손실**(현 fixture 부제 36~81자는 2줄에 들어가 미발현) |
| 카드 부제 `:382` | `line-clamp-4` | — | 호출자 없음(F-18) | **죽은 코드** |
| 태그 칩 `:230` | `text-ellipsis whitespace-nowrap` + `--tag-min-width:56px` | 전 뷰포트 | 없음 — 숨긴 suffix 는 a11y 트리에서 unmount(`req-landing.md:293`) | **계약이 명시한 손실** |
| 블로그 목록 부제 `blog-destination-client.tsx:51` | **없음** | — | — | clamp 부재가 결함(F-12) |
| 메타/CTA | `req-landing.md:297` 「overflow 시 truncate」 | 전 뷰포트 | 없음 | 계약대로 |

**모바일에서 실제로 발동하는 clamp 는 태그 칩 하나뿐이다.** 제목·부제는 전문이고, 그것이 390px 3.76화면 스크롤의 직접 원인이다(부제만 `ops-handbook` en 9줄 195.8px · kr 8줄 174.0px).

---

## 10. 계산 근거 요약(재현용)

| 표면 | 390px 콘텐츠 폭 | 산출 |
|:---|---:|:---|
| `<main>` | 358 | `390 − 2 × --shell-gutter(16px, globals.css:323)`, `page-shell.tsx:22` |
| 패널 안쪽(test/blog/history/404) | 316 | `358 − 2 × border(1px) − 2 × p-5(20px)` |
| 랜딩 카드 안쪽 | 326 | `358 − 2 × 16px`(`landing-grid-card.tsx:1058` `[padding:16px]`) |
| 답변 선택지 텍스트 | 260 | `316 − 2 × border(1px) − 2 × px-3.5(14px) − gap-3(12px) − mark 14px` |
| 블로그 목록 행 | 288 | `316 − 2 × border(1px) − 2 × px-3.5(14px)` |
| 동의 배너 | 330 | `390 − 2 × layer px-4(16px) − 2 × banner p-[14px]`(`consent-banner.tsx:22,241`) |
| 모바일 확장 시트 제목 | 302 | 확장 시 카드는 `w-screen` full-bleed(`landing-grid-card.tsx:1042`)이므로 `390 − 2 × px-4(16px) − 44(닫기) − gap-3(12px)` |

폰트 메트릭: `unitsPerEm 2048` · `ascender 1950` · `descender −494` · `lineGap 0` · content **1.1934em** · 영문 문자당 유효 폭 **0.4478em** · 한글 **0.8643em** · `ch`(= `0`) **0.5957em**.

---

## 11. 미확인 — 이 세션이 재지 않은 것

1. **브라우저 렌더를 하지 않았다.** 모든 줄 수·줄당 글자수·행간 여유는 폰트 바이너리의 advance 와 수직 메트릭에서 계산한 값이다. 오차원 셋: ⑴ hmtx 는 가변 폰트의 **기본 인스턴스**(wght 400)만 담으므로 500/600/700 은 실제로 2~4% 넓다 — F-05 의 「2줄」 판정 중 경계에 가까운 것(랜딩 히어로 en, 274.0px vs 288px)은 뒤집히지 않지만 kr 카드 제목(1줄, 여유 확인 안 함)은 뒤집힐 수 있다. ⑵ GPOS 커닝을 적용하지 않았다(실폭이 계산보다 약간 좁다). ⑶ 줄바꿈 시뮬레이터는 UAX #14 전체가 아니라 「공백 + CJK 문자 경계」 근사이며, 문장부호 금칙은 넣지 않았다.
2. **fallback face 의 메트릭을 재지 않았다.** F-17 의 보정값을 정하려면 대상 플랫폼의 첫 fallback(`-apple-system` = SF Pro / `Apple SD Gothic Neo`)을 측정해야 하고, 이 clone 에는 그 파일이 없다. swap 리플로의 **크기**는 미확인이고 **존재**만 소스로 확정했다.
3. **실제 대비비를 재지 않았다.** F-22 의 `--muted` 4.23:1 은 `globals.css:51` 의 BQ-29 기록을 인용한 것이고 이 세션이 픽셀에서 측정한 값이 아니다.
4. **WCAG 1.4.12 Text Spacing 을 실측하지 않았다.** 행간 1.5배 · 자간 0.12em · 어간 0.16em 을 강제했을 때 잘림이 생기는지는 렌더가 필요하다. 소스상 고정 높이를 갖는 자리는 GNB 바(`h-14`/`h-16`)와 버튼(`min-h-[46px]`·`--tap-min`)뿐이고 셋 다 현재 줄 상자보다 여유가 크다는 것까지만 확인했다.
5. **`--h1` 행간 1.28 권고값을 렌더로 검증하지 않았다.** 계산상 30px 에서 행간 2.60px 을 남기지만, 블로그 상세 제목이 2줄일 때 baseline 이 얼마나 밀리는지는 재생성 전까지 알 수 없다.
6. **F-10 의 「30% 빈 자리」를 실측하지 않았다.** 20px 에서 잰 첫 줄을 14px 로 그리면 폭이 70% 가 된다는 산술만 확인했고, `DesktopExpandedTitle` 이 실제로 남기는 ragged 폭은 카드별 제목 길이에 따라 다르다.
7. **`--t-eyebrow` 역할의 의도된 소비처를 확정하지 못했다.** 런타임 소비자 0, `design.md:143` 의 행은 깨져 있고, `docs/design/ds/preview/` 25장 중 어느 것이 이 역할을 그리는지 열어 보지 않았다.
8. **12개 locale 중 en/kr 외의 카드·문항 텍스트가 없다.** `source-fixture.ts` 와 문항 fixture 7개 모두 en/kr 만 갖는다 — F-05 · F-08 · F-12 의 locale 별 줄 수는 `src/messages/*.json` 이 실제로 12 locale 을 갖는 문자열(히어로·동의·히스토리)에 대해서만 12개 전부 계산했고, 카드·문항은 en/kr 만 계산했다.
9. **한자 fallback 이 어느 face 로 잡히는지 확정하지 않았다.** Pretendard cmap 에 CJK Unified 가 0개라는 것은 이 세션이 확인했으나(§0), zs/zt/ja 가 실제로 어느 시스템 폰트로 떨어지고 그 폰트의 메트릭이 무엇인지는 실기 렌더가 필요하다 — 그 항목의 소유자는 i18n 렌즈다.
10. **게이트를 하나도 실행하지 않았다.** `npm test` · `npm run qa:rules` · `npm run test:e2e` 의 현재 통과 여부는 이 세션에서 확인하지 않았다(읽기 전용 과제). §6 의 「붉어지는 것」은 소스와 단언문을 읽어 도출한 목록이다.
