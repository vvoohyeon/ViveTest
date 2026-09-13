# 표면 지도 — 블로그(`/{locale}/blog`, `/{locale}/blog/{variant}`) · 히스토리(`/{locale}/history`)

기준: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis`, HEAD `a5aec95`. 아래 모든 경로는 그 clone 기준 상대경로이며, 절대경로가 필요하면 그 루트를 앞에 붙인다. 브라우저는 띄우지 않았다 — **실측이라고 적지 않은 수치는 전부 읽은 값에서 유도한 산술(계산값)이거나 미확인**이며 그렇게 표시했다.

---

## 0. 한 문단 요약

블로그 두 라우트와 히스토리 한 라우트는 **소유 코드 5개 파일 327줄에 뷰포트 분기가 정확히 0개**이고, 세 표면이 모바일에서 받는 반응형 처리는 전부 공유 셸(`page-shell.tsx` 의 `md:` 2개 · `globals.css` 의 `--shell-gutter` 미디어 쿼리 2개 · `site-gnb.tsx` 의 `md:hidden`/`md:flex` 바 교체 · 소비자 동의 배너의 `max-[719px]:` 7개)에서 온다. 히스토리는 **목록을 그리는 코드가 존재하지 않고** 빈 상태 하나만 렌더하며, 그 빈 상태에는 행동이 없고 `Locale: en` 디버그 문자열이 세 번째 줄로 남아 있다. 블로그 상세는 본문이 없다 — 레지스트리의 `subtitle` 한 문단이 본문 자리를 대신하고, 같은 레지스트리가 들고 오는 `durationM`/`tags`/`sharedC`/`engagedC` 는 두 표면 모두에서 하나도 렌더되지 않는다. 저장소가 소유한 설계 정의(`docs/design/ds/`)에는 이 세 표면의 명세와 프리뷰가 **이미 있고**, 제품은 그것의 구조만 가져오고 행동(버튼)·메타·카피를 빼놓은 상태다. 시각 baseline 은 블로그 색인 24장·히스토리 24장이 있고 **블로그 상세는 전 뷰포트 0장**이다.

---

## 1. 개체수

| 항목 | 값 | 근거 |
|:---|---:|:---|
| 소유 파일 수 | 5 | `src/app/[locale]/blog/page.tsx` · `src/app/[locale]/blog/[variant]/page.tsx` · `src/app/[locale]/history/page.tsx` · `src/features/blog/blog-destination-client.tsx` · `src/features/blog/server-model.ts` |
| 소유 코드 총 줄수 | 327 | 29 + 60 + 53 + 147 + 38 |
| 소유 코드 내 뷰포트 분기 | **0** | `sm:`/`md:`/`lg:`/`xl:`/`min-[`/`max-[`/`@media`/`matchMedia`/`isMobileViewport`/`innerWidth` 전수 grep 무매치 |
| 클라이언트 컴포넌트 | 1 | `blog-destination-client.tsx:1` (`'use client'`) — 히스토리는 0 |
| 블로그 아티클 개체수 | 3 | `source-fixture.ts:184,205,223` — `ops-handbook` · `build-metrics` · `release-gate`, 모두 `attribute: "available"` |
| 블로그 텍스트가 실존하는 locale | 2 / 12 | 픽스처에 `en`·`kr` 만 존재 — 나머지 10개는 `localization.ts:42-45` 의 `defaultLocale`(=`en`) fallback |
| `history` 네임스페이스 키 | 6 | 그중 소비자 없는 키 **4** (`clearAll` · `goHome` · `open` · `delete`) × 12 locale = 48 문자열 |
| 히스토리 목록 렌더 코드 | **0줄** | `history/page.tsx:33-51` 전체가 빈 상태 하나 |
| 히스토리 저장 모듈 | **0** | `src/features/test/storage/` 8개 파일 중 결과 이력 관련 0개, `grep -rn "resultHistory\|result-history\|HISTORY" src/` 무매치 |
| 시각 baseline — 블로그 색인 | 24 | `theme-layout-blog-default-*` (2 locale × 2 theme × 6 viewport) |
| 시각 baseline — 히스토리 | 24 | `theme-layout-history-default-*` |
| 시각 baseline — 블로그 **상세** | **0** | manifest 의 `layoutCases`/`stateCases` 어디에도 `/{locale}/blog/{variant}` 없음 |
| 두 표면 상태 baseline | 16 | `blog-settings-open` 4 · `history-settings-open` 4 · `mobile-blog-menu-open` 4 · `mobile-history-menu-open` 4 |
| 세 표면 합계 baseline | 64 / 164 | 추적 중 164장 중 39% |
| `loading.tsx` / `error.tsx` | **0 / 0** | `src/app` 전체 파일 목록에 없음 |
| 설계 정의 쪽 명세 | 3 표면 모두 존재 | `docs/design/ds/app-components.css` + `docs/design/ds/preview/secondary-surfaces.html` |
| `docs/design/design.md` §7 패턴 | 두 표면 모두 **없음** | §7.1~7.8 은 카탈로그·카드·내비·반응형 그리드만 다룬다 |

---

## 2. 표면 A — 블로그 색인 `/{locale}/blog`

### 2-1. 컴포넌트 트리와 서버/클라이언트 경계

```text
app/layout.tsx                     [server]  <html lang={헤더 locale}> · theme-bootstrap.js(beforeInteractive)
└ app/[locale]/layout.tsx          [server]  dynamicParams=false · generateStaticParams=locales(12)
  ├ LocaleHtmlLangSync             [client]  useEffect 로 document.documentElement.lang = 라우트 locale
  ├ TransitionRuntimeMonitor       [client]  pending transition 을 1600ms 뒤 DESTINATION_TIMEOUT 로 종료
  └ <div data-locale>
    └ app/[locale]/blog/page.tsx   [server]  isLocale 가드 → getBlogIndexPageModel(locale)
      └ PageShell                  [server]
        ├ TransitionGnbOverlay     [client]  pending 있을 때만 fixed z-1300 에 **랜딩 컨텍스트 GNB 한 벌 더**
        ├ SiteGnb                  [client]  sticky z-1100 · 모바일 h-14(56px) / 데스크톱 h-16(64px)
        ├ <main class="page-shell-main mx-auto max-w-[1280px] px-[var(--shell-gutter)] pt-20 pb-6 md:pt-[88px] md:pb-8">
        │ └ BlogDestinationClient  [client]  ← 유일한 표면 고유 클라이언트 경계
        │   └ <section .blog-shell-card>
        │     ├ <h1 [font:var(--h1)]>{t('blog.allArticles')}</h1>
        │     └ <section .blog-article-list><ul><li×3><Link><strong/><span/>
        └ TelemetryConsentBanner   [client]  동의 UNKNOWN 일 때만 — spacer div + fixed 레이어 z-1075
```

경계의 요지: **페이지 모델은 서버에서 만들고 렌더는 전부 클라이언트 컴포넌트가 한다.** `getBlogIndexPageModel` 이 `server-model.ts:18-24` 에서 `LandingBlogCard[]` 를 만들어 props 로 직렬화해 넘긴다. 클라이언트가 실제로 읽는 필드는 `variant`·`title`·`subtitle` 3개뿐인데(`blog-destination-client.tsx:127,131,133,134`), 직렬화되는 것은 `attribute`·`availability`·`tags`·`localeResolvedText{title,subtitle}`·`blog.meta{durationM,sharedC,engagedC}` 까지 전부다(`resolvers.ts:132-147`). `localeResolvedText` 는 `title`/`subtitle` 과 **같은 문자열을 한 번 더** 담으므로 `ops-handbook` 의 371자 subtitle 은 RSC 페이로드에 두 번 실린다.

`BlogDestinationClient` 가 클라이언트인 이유는 표현이 아니라 **transition 완료 처리** 하나다(`:64-108`). 두 개의 `useEffect` 가 pending transition 을 읽어 rAF 한 프레임 뒤 `completePendingLandingTransition({targetType:'blog'})` 를 부른다. 렌더 트리 전체는 정적이다.

### 2-2. 390px 에서 무엇이 렌더되는가 — 뷰포트 분기 0개이므로 클래스에서 유도

가로 폭 사슬(전부 읽은 값의 산술, 계산값):

| 단계 | 선언 | 390px 결과 |
|:---|:---|---:|
| `<main>` | `px-[var(--shell-gutter)]`, `--shell-gutter: 16px` (`globals.css:323`) | 390 − 32 = **358px** |
| `.blog-shell-card` | `p-5` = 20px (`blog-destination-client.tsx:27`) | 358 − 40 = **318px** |
| `<li>` 테두리 | `border` 1px ×2 (`:43`) | 316px |
| `<a>` 안쪽 | `px-3.5` = 14px ×2 (`:45`) | **288px** |

358px 은 사전 실측된 랜딩 카드 폭 358px(390px 뷰포트)과 일치한다 — 유도 방법이 맞다는 교차 확인이다.

세로 사슬(계산값): GNB 는 `sticky`(`site-gnb.tsx:38`)이므로 **흐름에서 자리를 차지한다**. 모바일 바 56px(`h-14`, `:41`) + `<main>` 의 `pt-20` 80px + 카드 `p-5` 상단 20px = **첫 글자 상단이 y≈156px**. 844px 뷰포트의 18.5%가 콘텐츠 이전에 소모된다. `pt-20` 은 고정 헤더를 비켜서는 여백의 형태를 하고 있지만 헤더는 고정이 아니므로 **56px 과 80px 이 더해진다** — 의도된 여백인지 sticky↔fixed 를 혼동한 잔재인지는 문서에서 확인되지 않는다(미확인).

행당 글자수(계산값, 라틴 평균 자폭 0.5em 가정):

| 요소 | 토큰 | px | 288px 열에서 CPL |
|:---|:---|---:|---:|
| 목록 제목 | `text-[15px] font-semibold leading-[1.45]` (`:47`) | 15 | ≈ 38 |
| 목록 부제 | `--caption` = `400 13px/1.45` (`globals.css:210`) | 13 | ≈ 44 |
| 페이지 제목 | `--h1` = `700 30px/1.2` (`globals.css:205`) | 30 | ≈ 21 (318px 열) |

### 2-3. 목록 행에서 확인된 것

**부제에 clamp 가 없다.** `blogArticleLinkSubtitleClassName`(`:51`)은 `[font:var(--caption)] text-[var(--ink-body)]` 뿐이고 `line-clamp`·`overflow`·`text-ellipsis` 중 어느 것도 없다. 저장소 전체에서 `line-clamp` 는 `landing-grid-card.tsx:379,382,408` 세 곳에만 존재한다. 그런데 픽스처의 `ops-handbook` 부제(`source-fixture.ts:194`)는 **371자(en)** 이고 그 자리에 달린 주석이 "subtitle clamp 와 overflow 규칙을 충분히 검증할 수 있도록 의도적으로 긴 문장 길이를 유지합니다"라고 적혀 있다 — **clamp 를 검증하려고 만든 데이터가, clamp 가 없는 표면에 그대로 들어간다.** 288px/44CPL 로 371자는 약 9줄 = 약 170px, 여기에 2줄 제목과 `py-3`(24px)을 더하면 **한 행이 약 240px**(계산값)이고 나머지 두 행은 약 108px·127px 이다. 세 항목 목록의 절반을 한 항목이 차지한다.

**탭했을 때의 시각 피드백이 없다.** 행의 상태 선언은 `hover:` · `data-[selected=true]:` · `focus-visible:` 뿐이고 `active:` 가 없다(`:43-45`). 그리고 Tailwind v4.1.0 은 `hover` 변형을 `@media (hover: hover)` 로 감싼다(`node_modules/tailwindcss/dist/lib.js` 의 `r.static("hover", f=>{f.nodes=[I("&:hover",[j("@media","(hover: hover)",f.nodes)])]})` — 소스에서 확인). 따라서 **터치 기기에서는 hover 스킨이 아예 적용되지 않고**(붙어 있는 hover 문제는 없다는 뜻이기도 하다) 눌린 상태를 표현하는 선언이 하나도 남지 않는다. 같은 저장소의 GNB 버튼은 `active:bg-[var(--surface-strong)]` 을 갖는다(`site-gnb.tsx:64`) — 어휘는 있는데 이 표면에 안 쓰였다. 남는 피드백은 브라우저 기본 tap highlight 뿐이고 `-webkit-tap-highlight-color` 는 `src/` 어디에도 선언돼 있지 않다.

**행 경계선이 거의 안 보인다(실측 계산).** 행 테두리는 `--hairline-strong` = `--warm-300` = `#d6d1c4`(`globals.css:166,104`), 바닥은 `--canvas-elevated` = `#ffffff`(`:153,99`). WCAG 상대 휘도 공식으로 계산하면 **1.52:1**. 선택 행의 강조 테두리 `--accent` = `#5c8e78` 는 흰 바닥에 3.75:1, 다크에서 `#7daa95` on `#1f382e` 는 4.84:1 이다. 경계선 자체는 1.4.11 위반이라 단정할 수 없다 — 선택 상태는 테두리 **와** 배경(`--sage-muted`)이 함께 바뀌고 링크 텍스트가 항상 보이므로 "구성요소 식별에 필요한 시각 정보"가 색 하나에 걸려 있지 않다. 다만 **1.52:1 의 결과로 세 행이 시각적으로 분리되지 않고 하나의 글 덩어리로 읽힌다** — 스캔 가능성 문제이며 판정 근거는 대비 실측값이다.

**본문 대비는 전부 여유 있게 AA 를 넘는다(계산값).**

| 쌍 | 라이트 | 다크 |
|:---|---:|---:|
| 목록 제목 `--ink` on `--canvas-elevated` | 17.29:1 | (다크 `--ink`/`--canvas-elevated` 동일 구조) |
| 목록 부제 `--ink-body` on `--canvas-elevated` | 8.74:1 | 13.37:1 |
| 목록 부제 `--ink-body` on `--sage-muted`(선택 행) | 7.54:1 | 9.76:1 |
| (반례) `--muted-aa` on `--sage-muted` | **4.38:1** | 5.70:1 |

마지막 줄은 `blog-destination-client.tsx:48-51` 의 주석이 주장하는 값과 **소수점까지 일치**한다. 그 주석의 판단(선택 행 바닥에서는 `--muted-aa` 가 AA 아래라 `--ink-body` 로 갔다)은 재현됐다 — 보존 대상이다.

**탭 타깃은 WCAG 2.5.8 을 통과한다.** 행 높이는 최소 `py-3`(24px) + 제목 21.75px + `gap-1`(4px) + 부제 18.85px ≈ **68.6px**(계산값)이고 44px 도 넘는다. 그리고 `a11y-smoke.spec.ts:532-546` 이 390×844 에서 블로그 색인·블로그 상세·히스토리에 axe 를 돌리는데, 설치된 axe-core 4.11.1 의 기본 룰셋에 `target-size`(`wcag22aa`/`wcag258`)가 **포함돼 있음을 `axe.getRules()` 로 확인**했다. 즉 24px 하한은 게이트가 실제로 지키고 있다. 44px 권장선은 게이트 밖이다.

---

## 3. 표면 B — 블로그 상세 `/{locale}/blog/{variant}`

### 3-1. 트리 차이

색인과 **같은 클라이언트 컴포넌트**를 쓰고 props 만 다르다(`blog/[variant]/page.tsx:51-57`). `article` 이 주어지면 `blog-destination-client.tsx:112` 의 삼항이 뒤집히며 제목 역할이 통째로 바뀐다.

| 슬롯 | 색인 | 상세 |
|:---|:---|:---|
| `<h1>` | `t('allArticles')` @ `--h1` 30px | `t('selected')` @ `--overline` **12px** |
| `<h2>` (기사) | — | `article.title` @ `--h1` 30px |
| `<p>` (본문) | — | `article.subtitle` @ `--body` 16px/1.6 |
| `<h2>` (목록) | 없음(`listLabel` 미전달) | `t('allArticles')` @ `--h3` 20px |
| `<ul>` | 3행 | **3행 — 자기 자신 포함** |

**문서의 `<h1>` 이 12px 짜리 "Selected article" 이다.** 시각적으로 가장 큰 30px 텍스트는 `<h2>` 인 기사 제목이고, 그 아래 다른 `<h2>` 가 20px 다. DOM 위계와 시각 위계가 반대이고, 형제 `<h2>` 두 개가 30px 와 20px 로 갈린다. axe 는 이것을 잡지 못한다 — `heading-order` 는 레벨 건너뛰기만 보고 `page-has-heading-one` 은 존재만 본다(두 룰 모두 `best-practice` 태그, `axe.getRules()` 확인). 근거는 WCAG 2.4.6(Headings and Labels, AA) 의 "제목이 주제나 목적을 설명해야 한다" 이며, 페이지 최상위 제목이 이 페이지의 주제(기사)가 아니라 영역 라벨이다.

**상세 페이지가 전체 목록을 다시 렌더한다.** 현재 읽고 있는 기사가 목록에도 들어 있고 `data-selected="true"` 로 표시된다(`:127`). 모바일 관점에서 이것은 기사 1개 아래에 (미클램프) 3개 행이 또 붙는 구조다 — 상세 페이지 세로 길이의 대부분이 목록이다(계산값: 상세 본문 371자/36CPL ≈ 11줄 ≈ 176px 대 목록 약 494px).

### 3-2. 본문 조판 — 사실은 "본문이 없다"

| 질문 | 답 | 근거 |
|:---|:---|:---|
| 줄 길이 | 읽기 폭이 `max-w-[760px]` 로 선언돼 있으나 **390px 에서는 절대 발동하지 않는다**(가용 318px) | `blog-destination-client.tsx:29` |
| 본문 크기 | `--body` = `400 16px/1.6` — 318px 열에서 ≈ **36 CPL**(계산값) | `globals.css:207` |
| 제목 계층 | `--h1` 30px 고정, **뷰포트별 타입 스케일 없음**. 390px 과 1440px 이 같은 30px | `globals.css:205`, 분기 0 |
| 이미지 처리 | **이미지가 없다.** `<img>`/`next/image` 호출 0. `img{max-width:100%}` 류 기본 규칙도 `globals.css` 의 `@layer base` 에 없다(그 레이어는 `a{color:var(--ink)}` 한 줄뿐, `:427-431`) | 코드 전수 |
| 본문 문단 수 | **1** — `article.subtitle` 한 문단이 전부 | `:116` |
| 메타(읽는 시간·태그·날짜) | **0개 렌더.** 그런데 데이터는 도착해 있다 | 아래 |
| 목록으로 돌아가는 버튼 | 없음 | `:110-146` 전수 |

**데이터는 있는데 안 그린다.** `LandingBlogCard` 는 `tags: string[]` 와 `blog.meta: {durationM, sharedC, engagedC}` 를 갖고(`types.ts:101-126`), `ops-handbook` 은 `durationM: 8`·`tags: ["operations","release"]` 다(`source-fixture.ts:199-201`). 그리고 `metaReadTime`("분 읽기"·"min de leitura"·…)과 `metaViews` 는 **12개 locale 전부에 번역돼 있는데 렌더하는 코드가 없다** — `landing-catalog-grid.tsx:115` 가 copy 객체에 담아 넘기지만 실제 메타 행은 `metaEstimated`/`metaShares`/`metaAttempts` 세 개만 쓴다(`landing-grid-card.tsx:779-781`). 즉 "읽는 시간"은 블로그용으로 번역까지 마쳤고 소비자가 없다. 설계 정의의 블로그 상세 표본은 바로 그 줄을 그린다: `운영 · 배포 · 8 min read`(`docs/design/ds/preview/secondary-surfaces.html:68`).

### 3-3. 죽은 링크의 처리 — 조용한 리다이렉트

`blog/[variant]/page.tsx:42-45` 는 잘못된/진입 불가 variant 를 `redirect(buildLocalizedPath(RouteBuilder.blog(), locale))` 로 색인에 보낸다. **아무 메시지도 남기지 않는다.** `routing-smoke.spec.ts:227-235` 가 이 동작을 계약으로 고정하고 있다. 공유된 링크가 죽었을 때 사용자는 목록에 도착할 뿐 무슨 일이 있었는지 알 수 없다. 설계 정의는 이 상황의 어휘를 이미 갖고 있다 — "That page is not here / The address may have changed, or the test may have been retired."(`docs/design/ds/preview/secondary-surfaces.html:79-80`).

### 3-4. 메타데이터

`generateMetadata`(`blog/[variant]/page.tsx:12-29`)는 **`title` 하나만** 설정한다. `description`·`openGraph`·`twitter` 없음. 루트의 전역 description 은 `'Reset baseline placeholder'`(`app/layout.tsx:15`)다. 블로그 기사를 모바일 메신저로 공유하면 카드에 그 문자열이 붙는다.

---

## 4. 표면 C — 히스토리 `/{locale}/history`

### 4-1. 트리

```text
app/[locale]/history/page.tsx   [server]  — 표면 고유 클라이언트 컴포넌트 0개
└ PageShell
  └ <main …>
    └ <section .landing-shell-card>                      ← .vt-panel 대응
      └ <div mx-auto max-w-[460px] justify-items-center gap-4 px-4 py-10 text-center>   ← .vt-empty 대응
        ├ <span h-11 w-11 rounded-full bg-[--accent-subtle]>  <svg 시계 20px>           ← .vt-empty__mark
        ├ <h1 [font:var(--h3)]>{t('history.title')}</h1>                                 ← .vt-empty__title
        ├ <p [font:var(--body-sm)] text-[--muted-aa]>{t('history.body')}</p>             ← .vt-empty__body
        └ <p 같은 클래스>{`Locale: ${locale}`}</p>                                        ← 명세에 없는 세 번째 줄
```

### 4-2. "표인가 카드인가" — **둘 다 아니다. 목록이 존재하지 않는다.**

`history/page.tsx` 53줄 전체에 반복 렌더도, 데이터 소스도, 저장소 읽기도 없다. `src/features/test/storage/` 에는 결과 이력 모듈이 없고 `resultHistory`/`HISTORY` 전수 grep 도 무매치다. `docs/project-analysis.md:48` 이 "History persistence beyond the placeholder history page shell" 을 미구현으로 명시하고, `docs/req-test.md:822,1206` 이 "history 미구현 상태이므로 … history 구현 단계에서 케이스 3 분기를 반드시 추가해야 한다 (AR-006)" 로 남겨 뒀다. **모바일 표 결함은 없다 — 그릴 것이 없기 때문이다.**

다만 *설계 정의* 쪽에는 채워진 목록의 명세가 있고, **그 명세가 모바일에서 깨질 모양이다.** `preview/secondary-surfaces.html:38-47` 의 "History — populated" 는 `.vt-datarow` 를 쓰는데 그 정의가 `docs/design/ds/app-components.css:599-606` 에서 `display:flex; align-items:baseline; justify-content:space-between; gap:var(--space-4)` 다 — **`flex-wrap` 선언이 없고 왼쪽 텍스트 블록에 `min-width:0` 도 없다.** 390px 에서 왼쪽(제목 + 날짜·결과 메타 2줄)과 오른쪽(Open + Delete 버튼 2개)을 한 줄에 밀어넣는 형태이고, `align-items:baseline` 으로 2줄 텍스트 블록과 버튼 열을 베이스라인 정렬한다. 카드가 아니라 **표의 행**에 가깝다. 그리고 그 표본의 버튼은 `style="min-height:36px"`(`:42,46`)로 시스템 자신의 `--tap-min: 44px`(`globals.css:201`, `design.md §4.10`)보다 8px 낮다 — WCAG 2.5.8(24px)은 통과하지만 시스템이 스스로 선언한 바닥을 밑돈다. **이 세 가지(랩 없음 · min-width 없음 · 36px 버튼)는 아직 제품에 없으므로 리팩터에서 고칠 것이 아니라 명세 단계에서 기각할 대상이다.**

### 4-3. 빈 상태의 결함 셋

1. **행동이 없다.** 설계 정의의 표본은 `<button class="vt-btn vt-btn--primary">Browse tests</button>` 를 갖고(`preview/secondary-surfaces.html:33`), 저장소 자신의 보이스 규칙은 "Empty states are one line of guidance + one action"(`docs/design/ds/README.md:66`)이다. 제품에는 링크도 버튼도 0개다. 그런데 라벨은 이미 번역돼 있다 — `history.goHome`("Go home") · `history.open` · `history.delete` · `history.clearAll` 네 개가 12 locale 에 존재하며 **소비자가 없다**(`t('goHome')` 은 `test` 네임스페이스의 동명 키를 `test-result-panel.tsx:92` 가 쓰는 것이고 `history.goHome` 과 다르다).
2. **디버그 문자열이 남아 있다.** `Locale: ${locale}`(`history/page.tsx:48`). 코드 주석(`:10-11`)이 "페이지 본문에 남아 있는 디버그 문자열이며, 내용 결함으로 보고할 대상"이라고 명시한다 — 이 지도는 그 보고다.
3. **카피가 상태를 말하지 않고 정책을 말한다.** 제품은 `"Local Result History"` + `"Each completed run is stored as an independent entry (newest first, max 50)."` 다(`src/messages/en.json`). 설계 표본은 `"No results yet"` + `"Finish a test and it is kept here on this device — newest first, up to fifty."` 다(`:31-32`). 후자는 상태를 먼저 말하고 정책을 부연하며, 전자는 페이지 제목과 저장 정책만 말해서 **빈 상태로 읽히지 않는다.**

### 4-4. 진입 퍼널이 이 막다른 길로 향한다

`test-result-panel.tsx:95-99` 가 결과 화면에 `RouteBuilder.history()` 링크(`t('test.goHistory')`)를 놓는다. **테스트를 막 끝낸 사용자가 그 CTA 를 누르면, 방금 한 실행이 저장되지 않은 채 "완료된 실행은 항목으로 저장된다"고 적힌 화면에 도착한다.** 코드 세 곳(`test-result-panel.tsx:96` · `history/page.tsx:35-50` · 저장 모듈 부재)으로 확정되는 모순이다.

### 4-5. transition 정리가 이 표면에만 없다

블로그는 `BlogDestinationClient:64-108` 이 pending transition 을 rAF 한 프레임 안에 완료시키거나(정상) 경로 불일치 시 즉시 종료시킨다. **히스토리에는 그 핸들러가 없다.** 유일한 정리 경로는 로케일 레이아웃의 `TransitionRuntimeMonitor` 타임아웃이고 그 값은 `LANDING_TRANSITION_TIMEOUT_MS = 1600`(`transition/constants.ts:1`)이다. `transition-telemetry-smoke.spec.ts:974-980` 이 `/en/history` 에서 오버레이가 뜬 뒤 `DESTINATION_TIMEOUT` 으로 사라지는 것을 계약으로 고정한다. 즉 **히스토리 위에 랜딩 GNB 한 벌이 최대 1.6초 동안 fixed 로 덮여 있을 수 있다**(그 사이 같은 스펙이 hydration mismatch 도 허용한다, `:986-989`).

---

## 5. 공유 셸이 두 표면에 강제하는 것

| 항목 | 선언 | 모바일 결과 |
|:---|:---|:---|
| 좌우 여백 | `--shell-gutter` 16 / 20(≥768) / 24(≥900) — `globals.css:323-336` | 390px 에서 16px. 카드 `p-5`(20px)와 합쳐 **한쪽 36px, 폭의 18.5%** |
| 상단 여백 | GNB 56px(sticky, 흐름 점유) + `pt-20` 80px | 첫 글자 y≈156px |
| 하단 여백 | `pb-6` 24px, `env(safe-area-inset-bottom)` **미참조** | 홈 인디케이터 영역 보정 없음(스크롤 문서라 치명적이진 않음) |
| 최소 높이 | `.page-shell min-h-screen` + body `min-h-screen` = `100vh` ×2 (`page-shell.tsx:19`, `app-body-class.ts:19`) | `100dvh` 가 아니라 `100vh` — 주소창 축소 시 실제 가시 영역보다 크다. **히스토리처럼 내용이 한 카드뿐인 화면에서 스크롤할 것이 없는데 스크롤이 생긴다**(계산값, 브라우저 미검증) |
| safe-area | `src/` 전체에서 `env(safe-area-inset-*)` 은 GNB 드로어(`site-gnb.tsx:87`)와 동의 배너(`consent-banner.tsx:21`) 두 곳뿐 | 두 표면 자체는 0곳 |
| 뒤로 가기 | 모바일에서 브랜드 대신 Back 버튼(`site-gnb.tsx:376-386`), 데스크톱에는 없음 | 아래 별항 |
| 동의 배너 | `<main>` 뒤 형제로 spacer + fixed 레이어 | 아래 별항 |

### 5-1. "위로" 내비게이션이 없다

모바일 Back 은 `handleStandardBack`(`use-gnb-back-navigation.ts:63-80`)이고, `shouldUseHistoryBack`(`behavior.ts:29-43`)이 `history.length > 1` **그리고** `document.referrer` 가 같은 오리진일 때만 `history.back()` 을 쓰고 아니면 `router.push(homeHref)` 로 **랜딩**에 보낸다. 블로그 상세에서 `homeHref` 는 `/{locale}` 이지 `/{locale}/blog` 가 아니다(`site-gnb.tsx:130`). 결과:

- 검색·공유 링크로 기사에 직접 들어온 사용자가 Back 을 누르면 **부모인 블로그 목록을 건너뛰고 랜딩으로** 간다.
- `document.referrer` 는 최초 문서 로드 시점의 값이므로, 블로그 색인에 직접 진입(referrer 없음) 후 소프트 내비게이션으로 기사에 들어간 경우에도 `referrer.length === 0` 이라 `history.back()` 조건이 거짓이 된다 — 실제로는 뒤로 갈 곳이 있는데 랜딩으로 밀어낸다. **이 문단의 `document.referrer` 소프트 내비게이션 거동은 브라우저 사실에 대한 추론이며 이 세션에서 실행 검증하지 않았다(미확인).**
- `router.push` 는 back 이 아니므로 **블로그 목록의 스크롤 위치가 복원되지 않는다.**

Material 3 의 Up vs Back 구분, iOS HIG 의 내비게이션 스택 모두 상세→목록의 조상 이동을 요구한다. 현재 이 표면군에는 조상 이동이 아예 없다.

### 5-2. 동의 배너의 SSR 예약 높이가 모바일에서만 부족하다

`SSR_BANNER_SPACER_ESTIMATE_PX = 120`(`consent-banner.tsx:18`)이고 바로 위 주석(`:15-16`)이 그 값의 출처를 밝힌다 — **"실측(2026-09-10, chromium 1280×720) 배너 80px · 하단 gap 16px"**. 그런데 배너는 `max-[719px]:flex-wrap max-[719px]:justify-start max-[719px]:gap-[14px] max-[719px]:p-[14px]` 로 720px 미만에서 **메시지 한 줄 → 버튼 행**의 2단으로 접힌다(`:241`), 메시지는 `max-[719px]:basis-full`(`:245`), 버튼은 `min-h-[46px]`(`ui/button-class-names.ts:60`) 3개다. 즉 **예약 높이는 배너가 가장 낮은 단 하나의 폭에서 측정됐고, 가장 높아지는 폭에는 적용된 적이 없다.** 첫 페인트에서 과소 예약 → 마운트 후 실측 반영 시 콘텐츠가 밀린다. 390px 실제 배너 높이는 **미측정**.

덧붙여 배너의 회피 계약 `data-consent-banner-avoid`(`consent-banner.tsx:36`)를 **랜딩 카드만** 달고 있다(`landing-grid-card.tsx:863,1229,1262`). 블로그·히스토리·테스트 표면은 0개다. spacer 덕분에 **문서 끝까지 스크롤한 상태**에서는 마지막 행이 배너를 벗어나지만, 스크롤 중간에서 키보드 포커스가 배너 아래 행에 들어가면 가려진다. WCAG 2.4.11(Focus Not Obscured, Minimum, AA)은 **완전히** 가려질 때만 실패하므로 위반 여부는 행 높이와 배너 높이의 실측이 필요하다 — **미확인**. 2.4.12(Enhanced, AAA)라면 부분 가림으로도 실패한다.

---

## 6. 빈 상태 · 로딩 · 에러 — 구현 현황

| 상태 | 블로그 색인 | 블로그 상세 | 히스토리 |
|:---|:---|:---|:---|
| 빈 상태 | `data-testid="blog-empty-state"`, `"No article available."` (`blog-destination-client.tsx:140-144`) | 동일 컴포넌트라 동일 | 페이지 전체가 빈 상태(§4) |
| 빈 상태 i18n | **없음 — 하드코딩 영문**. `blog` 네임스페이스 키는 `selected`·`allArticles` 2개뿐 | 동일 | 번역됨 |
| 빈 상태 도달 가능성 | 픽스처 3건이 모두 `available` 이라 현재 도달 불가 | 동일 | 항상 |
| 로딩 상태 | **없음** — `src/app` 전체에 `loading.tsx` 0개 | 없음 | 없음 |
| 에러 경계 | **없음** — `error.tsx` 0개 | 없음 | 없음 |
| transition 실패 피드백 | `terminatePendingLandingTransition({signal:'transition_fail', resultReason:'DESTINATION_LOAD_ERROR'})` — **텔레메트리만, UI 없음** (`blog-destination-client.tsx:76-80`) | 동일 | 핸들러 자체가 없음(1600ms 타임아웃) |
| 죽은 링크 | — | 조용한 리다이렉트, 메시지 없음(§3-3) | — |

세 표면 모두 **로딩 표시가 구조적으로 불가능**하다: 라우트 세그먼트 `loading.tsx` 도 없고, 컴포넌트 내부에 pending/skeleton 상태도 없다. 서버에서 픽스처를 동기적으로 읽으므로 현재는 지연이 없지만, `blog/[variant]` 에 `generateStaticParams` 가 없어 이 라우트가 정적 프리렌더되는지 요청 시 렌더되는지는 **미확인**(빌드를 돌리지 않았다).

---

## 7. 시각 baseline

`tests/e2e/theme-matrix-manifest.json` 이 정본이다. 뷰포트 정의(`:5-11`): `desktop-wide 1440` · `desktop-medium 1180` · `desktop-narrow 1024` · `tablet-wide 1023` · `tablet-narrow 900` · `mobile 390×844`.

| 케이스 | 라우트 | 뷰포트 | locale×theme | 장수 | manifest |
|:---|:---|:---|---:|---:|:---|
| `blog-default` | `/{locale}/blog` | 6개 전부 | 2×2 | **24** | `:45-51` (id `:46`) |
| `history-default` | `/{locale}/history` | 6개 전부 | 2×2 | **24** | `:54-62` (id `:55`) |
| `blog-settings-open` | `/{locale}/blog` | desktop-wide only | 2×2 | 4 | `:101-108` (id `:102`) |
| `history-settings-open` | `/{locale}/history` | desktop-wide only | 2×2 | 4 | `:110-117` (id `:111`) |
| `mobile-blog-menu-open` | `/{locale}/blog` | mobile only | 2×2 | 4 | `:155-162` (id `:156`) |
| `mobile-history-menu-open` | `/{locale}/history` | mobile only | 2×2 | 4 | `:164-171` (id `:165`) |
| **`/{locale}/blog/{variant}`** | — | — | — | **0** | manifest 전체에 없음 |

- 두 표면의 **모바일(390px) baseline 은 16장**: 색인 레이아웃 4 · 히스토리 레이아웃 4 · 색인 메뉴열림 4 · 히스토리 메뉴열림 4.
- 세 표면 합계 64장은 추적 중 164장의 39%다.
- **블로그 상세는 어떤 뷰포트에서도 픽셀 회귀망이 없다.** 그 표면의 자동 커버리지는 `a11y-smoke.spec.ts:544-546` 의 390×844 axe 1회와 `gnb-smoke.spec.ts:969-1000` 의 390×844 GNB 키보드 순회 1회, 그리고 `routing-smoke.spec.ts:198-235` 의 동작 검증뿐이다. Playwright 기본 뷰포트는 1280×720(`playwright.config.ts` 에 `viewport` 설정 없음)이므로 `routing-smoke` 블로그 검증은 전부 데스크톱 폭에서 돈다.
- 두 표면의 **콘텐츠 영역 자체에 대한 키보드/탭 순회 테스트는 0개**다 — `gnb-smoke` 는 Back → 메뉴 트리거까지만 Tab 한다.

---

## 8. 설계 정의(`docs/design/ds/`)와 제품이 갈리는 지점

`docs/design/design.md` §7 패턴 레이어에는 **블로그 목적지·블로그 상세·히스토리 중 어느 것도 없다**(§7.1 카탈로그 · 7.2~7.5 카드 · 7.6 내비 · 7.7 반응형 그리드 · 7.8 모바일 확장). 이 세 표면의 유일한 시각 권위는 `docs/design/ds/app-components.css` 와 `docs/design/ds/preview/secondary-surfaces.html` 이고, 그 계층은 **런타임이 소비하지 않는 문서 계층**이다(`AGENTS.md §2`).

| # | 항목 | 설계 정의(C) | 제품(R) | 판정 |
|:---|:---|:---|:---|:---|
| 1 | 히스토리 빈 상태 행동 | `Browse tests` 버튼 (`preview:33`) | 없음 | **미실현.** 라벨 4개는 이미 12 locale 번역됨 |
| 2 | 히스토리 빈 상태 카피 | `No results yet` / `Finish a test and it is kept here…` (`preview:31-32`) | `Local Result History` / 저장 정책 문장 / `Locale: en` | **갈림 + 디버그 잔재** |
| 3 | 히스토리 빈 상태 구조 | `.vt-empty` 460px·중앙·gap 16 · mark 44px · icon 20px (`app-components.css:638-659`) | 동일 값으로 Tailwind 재표현, padding 도 표본의 `--space-10 --space-4`(40/16)와 일치 | **일치** — 보존 |
| 4 | 히스토리 채워진 목록 | `.vt-datarow` flex space-between, 버튼 36px (`app-components.css:599-606`, `preview:40-47`) | 미구현 | **명세 단계에서 기각 필요**(§4-2) |
| 5 | 블로그 상세 메타 행 | `운영 · 배포 · 8 min read` (`preview:68`) | 없음 | **미실현.** 데이터·번역 모두 존재 |
| 6 | 블로그 상세 문단 | 복수 문단 (`preview:69-70`) | subtitle 1문단 | **데이터 모델의 한계** — `LandingBlogCard` 에 본문 필드가 없다(`types.ts:121-126`) |
| 7 | 블로그 상세 목록 복귀 | `All articles` 버튼 (`preview:71`) | 전체 목록을 다시 렌더 | **갈림** |
| 8 | 블로그 상세 `<h1>` | 기사 제목이 `h1` @ `--h1` (`preview:17,66`) | 기사 제목이 `h2`, `h1` 은 12px 라벨 | **갈림 — 시멘틱 역전**(§3-1) |
| 9 | 읽기 폭 토큰 | `--container-narrow: 760px; /* [not realized] */` (`colors_and_type.css:371`) | `max-w-[760px]` **리터럴** (`blog-destination-client.tsx:29`) | **토큰 없이 값만 realize.** `globals.css` 에 `--container-narrow` 부재(grep 확인) |
| 10 | `.prose` 조판 | 프리뷰 로컬 `<style>` 에만 존재 (`preview:17-19`) | — | **컴포넌트로 승격된 적 없음** — 설계 정의가 블로그 본문 조판을 소유하지 않는다 |
| 11 | 카탈로그 footer | `design.md §7.1` — "익명 진술 · privacy/terms · locale toggle" | `src/` 전체에 `footer` 0건 | **전 표면 미실현**(블로그/히스토리 포함) |

9번은 `AGENTS.md §3-1` 의 R/C/D/I 분류에 등재되지 않은 새 갈림으로 보인다 — `docs/decision-register.md` 와 `docs/design/ds/README.md` 의 findings 에서 `container-narrow` 검색 결과는 `README.md:108`(일반 서술)뿐이다.

---

## 9. 가로지르는 결함 — 이 표면에서 발견됐으나 전 표면에 해당

**`<html lang>` 에 유효하지 않은 언어 태그가 들어간다.** `app/layout.tsx:23` 이 `lang={locale}` 로, `locale-html-lang-sync.tsx:10` 이 `document.documentElement.lang = locale` 로 **제품 locale 코드를 그대로** 쏜다. Node 의 ICU(`Intl.DisplayNames`)로 대조한 결과:

| 코드 | ICU 해석 | 의도 |
|:---|:---|:---|
| `kr` | **Kanuri** | 한국어(`ko`) |
| `zs` | (미할당 — 코드 그대로 반환) | 간체 중국어(`zh-Hans`) |
| `zt` | (미할당 — 코드 그대로 반환) | 번체 중국어(`zh-Hant`) |
| 나머지 9개 | 의도와 일치 | — |

WCAG 3.1.1(Language of Page, Level A)은 **유효한** 언어 태그를 요구한다. axe 의 `html-lang-valid` 룰이 기본 룰셋에 있음은 확인했으나(`wcag2a`/`wcag311`), `a11y-smoke.spec.ts` 의 모든 축 검사는 `'en'` 라우트에서만 돈다(`:519,532,544`) — **게이트가 구조적으로 못 보는 자리다.** axe 가 `kr`/`zs`/`zt` 를 실제로 위반으로 잡는지는 **미확인**(실행하지 않았다).

**콘텐츠 언어와 선언 언어가 어긋난다.** 블로그 텍스트는 `en`·`kr` 만 실존하고 나머지 10개 locale 은 `localization.ts:42-45` 로 **영어로 폴백**한다. `/de/blog` 는 크롬(`All articles`의 독일어 번역)은 독일어, 기사 제목·부제는 영어인 혼합 화면이 되고, 그 영어 텍스트에 `lang="en"` 이 붙지 않는다 — WCAG 3.1.2(Language of Parts, AA) 대상이다. **블로그는 저장소에서 가장 텍스트가 많은 표면이므로 이 결함이 가장 크게 드러나는 자리다.**

**블로그 색인이 QA 관객으로 카탈로그를 뽑는다.** `server-model.ts:20,34` 가 `resolveLandingCatalog(locale, {audience: 'qa'})` 를 쓰고, `isCatalogVisibleCard` 는 `audience === 'qa'` 면 **무조건 `true` 를 반환한다**(`attribute.ts:48-49`). 랜딩 그리드는 기본값(`end-user`)을 쓴다(`landing-catalog-grid-loader.tsx:19-21`). 현재 픽스처의 블로그 3건이 모두 `available` 이고 뒤이어 `isEnterableCard`(=`available`|`opt_out`) 필터가 걸리므로 **지금은 노출 차이가 없지만**, `opt_out` 블로그 카드가 생기면 랜딩에서는 숨고 `/blog` 에서는 보이는 상태가 된다. 잠재 갈림이다.

---

## 10. IA 재설계 여지 — 모바일 표준 패턴 대비 부족한 것

근거 종류를 각 항목에 적었다. "더 나아 보인다"는 넣지 않았다.

### 블로그 색인

| # | 부족한 것 | 근거 종류 · 출처 |
|:---|:---|:---|
| B1 | **목록 행에 눌린 상태가 없다** | 코드: `active:` 0건(`blog-destination-client.tsx:43-45`), Tailwind v4 가 `hover:` 를 `@media (hover: hover)` 로 감쌈(dist 소스 확인). 관용: Material 3 ripple / iOS 셀 하이라이트 |
| B2 | **부제 clamp 가 없어 한 행이 목록의 절반을 먹는다** | 코드: clamp 선언 0건. 데이터: 371자(`source-fixture.ts:194`) + 그 자리의 "clamp 검증용" 주석. 계산: 288px/44CPL ≈ 9줄 |
| B3 | **행에 메타가 없다 — 읽는 시간·태그가 데이터로 도착해 있는데 안 그린다** | 코드: `blog.meta`·`tags` 직렬화(`resolvers.ts:139-146`), 렌더 0건. i18n: `metaReadTime` 12 locale 번역 존재·소비자 0. 설계: `preview:68` |
| B4 | **행 경계가 1.52:1 로 사실상 안 보인다** | 대비 계산: `#d6d1c4` on `#ffffff` |
| B5 | **필터·검색·정렬 어포던스 0** | 코드: 3건 고정 목록. `design.md §7.1` 은 카탈로그 페이지에 "future search/filter 공간 예약"을 적어 뒀으나 블로그 색인엔 없음 |
| B6 | **본문 상단 156px 이 크롬** | 계산: sticky 56 + `pt-20` 80 + `p-5` 20 |
| B7 | **sticky 상단 CTA/필터 바 자리가 없다** | 모바일 웹 관행. 현재 sticky 는 GNB 하나 |

### 블로그 상세

| # | 부족한 것 | 근거 종류 · 출처 |
|:---|:---|:---|
| D1 | **본문이 없다 — 데이터 모델에 본문 필드가 없다** | 코드: `LandingBlogCard`(`types.ts:121-126`)에 `title`/`subtitle`/`tags`/`meta` 뿐. 설계는 복수 문단을 전제(`preview:69-70`) |
| D2 | **`<h1>` 이 12px 라벨, 기사 제목이 `<h2>`** | 코드: `blog-destination-client.tsx:112,115`. 규범: WCAG 2.4.6(AA). axe 미탐지(룰 태그 확인) |
| D3 | **목록으로 돌아가는 조상 이동이 없다** | 코드: back 이 `homeHref`=랜딩으로(`use-gnb-back-navigation.ts:79`, `site-gnb.tsx:130`). 관용: Material 3 Up · iOS 내비게이션 스택 |
| D4 | **상세 하단에 전체 목록이 통째로 다시 온다** | 코드: `:119-139` 가 상세에서도 무조건 렌더. 계산: 목록 494px > 본문 176px |
| D5 | **뷰포트별 타입 스케일이 없다 — 390px 과 1440px 이 같은 30px/16px** | 코드: 분기 0. `globals.css:205,207` |
| D6 | **읽기 진행 표시·목차·공유 없음** | 코드 전수. 모바일 롱폼 관행 |
| D7 | **공유 메타데이터가 title 하나** | 코드: `blog/[variant]/page.tsx:26-28`, 루트 description = `'Reset baseline placeholder'` |
| D8 | **죽은 링크가 조용히 색인으로 리다이렉트** | 코드: `:42-45`, 계약 고정 `routing-smoke.spec.ts:227-235`. 설계는 어휘 보유(`preview:79-80`) |
| D9 | **시각 회귀망 0장** | manifest 전수 |
| D10 | **이미지 처리 규칙 자체가 없다** | 코드: `<img>`/`next/image` 0건, `@layer base` 에 `img{max-width:100%}` 없음(`globals.css:427-431`) |

### 히스토리

| # | 부족한 것 | 근거 종류 · 출처 |
|:---|:---|:---|
| H1 | **목록이 존재하지 않는다 — 저장 계층 자체가 없다** | 코드 전수 + `project-analysis.md:48` + `req-test.md:822` |
| H2 | **빈 상태에 행동이 0개** | 저장소 자신의 규칙 `ds/README.md:66`. 라벨 4개는 12 locale 번역 완료·소비자 0 |
| H3 | **디버그 문자열 `Locale: en` 이 본문에** | 코드: `history/page.tsx:48` + 같은 파일 주석의 자백 |
| H4 | **빈 상태 카피가 상태가 아니라 저장 정책을 말한다** | 설계 표본 대조(`preview:31-32`) |
| H5 | **결과 화면 CTA 가 이 막다른 길로 보낸다** | 코드 3곳 교차(`test-result-panel.tsx:96` × 저장 모듈 부재 × 빈 화면) |
| H6 | **페이지 `<h1>` 이 20px(`--h3`)** | 코드: `history/page.tsx:17,46`. 설계 표본은 이것을 `<h3>` 로 둠(`preview:31`) — 제품이 레벨만 올리고 크기를 안 올렸다 |
| H7 | **채워진 목록의 *명세*가 모바일에서 깨진다** | `app-components.css:599-606`: `flex` + `space-between`, `flex-wrap` 없음, `min-width:0` 없음. 표본 버튼 36px < `--tap-min` 44px(`globals.css:201`) |
| H8 | **transition 정리 핸들러가 없어 최대 1600ms 동안 GNB 중복** | 코드: `transition/constants.ts:1` + 히스토리 페이지에 핸들러 부재 + 계약 `transition-telemetry-smoke.spec.ts:974-980` |
| H9 | **내용 한 카드인데 `min-h-screen`(100vh)** | 코드: `page-shell.tsx:19`, `app-body-class.ts:19`. `100dvh` 미사용. 브라우저 검증 미실시 |

### 두 표면 공통

| # | 부족한 것 | 근거 종류 · 출처 |
|:---|:---|:---|
| S1 | **로딩·에러 라우트 UI 0** | `src/app` 파일 목록 |
| S2 | **transition 실패가 사용자에게 안 보인다** | `blog-destination-client.tsx:76-80` — 텔레메트리만 |
| S3 | **동의 배너 SSR 예약 120px 이 1280×720 에서만 측정됐다** | `consent-banner.tsx:15-18` 주석 + `:241` 의 `max-[719px]:` 접힘 |
| S4 | **`data-consent-banner-avoid` 를 이 표면들이 안 단다** | `landing-grid-card.tsx` 3곳에만 존재 |
| S5 | **safe-area 미참조** | GNB 드로어·배너 외 0곳 |
| S6 | **`--container-narrow` 가 토큰 없이 리터럴로만 실현** | `blog-destination-client.tsx:29` vs `globals.css` 부재 |
| S7 | **`<html lang>` 3개 locale 무효 태그** | ICU 대조(§9) |
| S8 | **10개 locale 에서 콘텐츠만 영어 폴백, `lang` 표시 없음** | `localization.ts:42-45` — WCAG 3.1.2(AA) |

---

## 11. 명시적 미확인

1. **390px 실제 렌더 높이·스크롤 깊이** — 브라우저를 띄우지 않았다(clone 에 `.next/` 를 만들지 않기 위해). §2-2·§2-3 의 줄수·행높이는 전부 계산값이며 가정(라틴 평균 자폭 0.5em)을 명시했다. CJK 는 1em 이라 `kr` 에서는 CPL 이 대략 절반이다.
2. **390px 동의 배너 실제 높이** — SSR 예약 120px 과의 차이를 수치로 확정하지 못했다.
3. **포커스 가림(WCAG 2.4.11)** — 배너가 포커스된 목록 행을 *완전히* 덮는지는 실측이 필요하다. 구조상 가능하지만 확정하지 않았다.
4. **`document.referrer` 소프트 내비게이션 거동** — §5-1 의 두 번째 항목은 브라우저 사실에 대한 추론이다.
5. **`blog/[variant]` 의 렌더 모드** — `generateStaticParams` 부재는 확인했으나, 로케일 레이아웃의 `dynamicParams = false` 가 자식 세그먼트에 어떻게 작용해 최종적으로 정적/동적 중 무엇이 되는지는 빌드 없이 확정하지 않았다.
6. **axe 가 `kr`/`zs`/`zt` 를 `html-lang-valid` 위반으로 잡는지** — 룰이 기본 세트에 있다는 것만 확인했고 실행하지 않았다.
7. **`pt-20`(80px)의 의도** — sticky GNB 56px 위에 더해지는 구조는 확인했으나, 그것이 의도된 여백인지 fixed 헤더를 전제한 잔재인지는 문서에서 근거를 찾지 못했다.
8. **`--container-narrow` 갈림의 등재 여부** — `decision-register.md`·`ds/README.md` 검색으로는 등재를 찾지 못했으나, 두 문서를 전문 통독하지는 않았다.
9. **`.vt-datarow` 의 모바일 파손** — 제품에 구현이 없으므로 CSS 선언 읽기에서 유도한 예측이며 렌더로 확인하지 않았다.
