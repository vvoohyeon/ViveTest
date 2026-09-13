# 렌즈 i18n-mobile — 12 locale 이 모바일 레이아웃에 가하는 압력

분석 대상: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (read-only clone, `git log -1` = `7616211`, 부모 `a5aec95`). 저장소 파일은 하나도 수정하지 않았다(`git status --porcelain` 빈 출력).

## 0. 이 렌즈가 실제로 잰 것 — 실측과 계산의 경계

**폰트 바이너리 실측(이 세션이 직접 파싱).** `public/fonts/PretendardVariable.woff2`(2,057,688 bytes)를 brotli 해제해 `cmap`·`hmtx`·`hhea`·`OS/2`·`fvar` 를 읽었고, macOS 시스템 fallback 후보 3종(`/System/Library/Fonts/Kohinoor.ttc` = Kohinoor Devanagari · `AppleSDGothicNeo.ttc` · `Hiragino Sans GB.ttc`)의 `head`/`hhea`/`OS/2` 를 같은 방식으로 읽었다. 스크립트: `scratchpad/analysis/vmetrics.mjs` · `vfallback.mjs` · `kohinoor.mjs` · `i18n-mobile-probe.mjs` · `i18n-mobile-probe2.mjs` · `i18n-mobile-probe3.mjs` · `hi-probe.mjs`.

**앞선 맵과 달라진 값이 하나 있다 — hi 의 글자 폭.** `i18n-pressure` 맵은 Pretendard 에 없는 데바나가리 글자를 일괄 0.52em 으로 치환했으나, 실제 fallback face 인 Kohinoor Devanagari 의 `ka`(U+0915) advance 는 **0.770em** 이고 결합 기호는 advance 0 이다. 이 렌즈의 hi 수치는 Kohinoor 의 실제 advance 로 다시 계산한 것이며, 앞선 맵의 hi 항목(예: 지시 오버레이 473px · 동의 배너 426px)을 **390px · 360px 로 정정**한다. 다만 나이브 advance 합은 자음군(conjunct) 결합으로 줄어드는 폭을 반영하지 못하므로 hi 값은 여전히 상한이다.

**계산(폰트 실측에서 유도).** px 폭·줄 수·블록 높이. 문자열 폭 = Σ(advance/upm × font-px), 줄 수는 공백(그리고 CJK 는 문자 단위) greedy wrap. 오차원: `fvar` 기본 인스턴스가 `wght=400` 이라 600/500 라벨은 실제로 2~4% 더 넓다 · GPOS 커닝 미적용 · Han/가나는 fallback face 를 1.0em 으로 치환 · 브라우저의 실제 줄바꿈은 `word-break`/`overflow-wrap` 해석에 따라 다르다. **경계에서 ±1줄을 감안해 읽는다.**

**렌더 미실측.** 이 과제는 읽기 전용이라 브라우저를 띄우지 않았다. 아래의 모든 "WRAPS"·"COLLIDE" 판정은 계산이고, 20px 이상 여유를 가진 항목만 단정적으로 읽는다.

**훑은 표면:** landing · test(문항·지시 오버레이·자격 스텝) · blog(색인·상세) · history · gnb(바·드로어·설정) · consent banner · `/test/error` · `/[locale]` 하위 404(`not-found.tsx`) · global 404(`global-not-found.tsx`) · root layout · proxy. 훑지 못한 것은 §12 에 적었다.

---

## 1. 측정 기준선 — 이 렌즈의 모든 판정이 기대는 네 개의 숫자

**(A) Pretendard 커버리지 = 14,336 코드포인트. 한자 0/20,992 · 데바나가리 0/128 · 한글 11,172/11,172 · 키릴 254/256.** 이것은 `docs/design/ds/colors_and_type.css:225-229` 가 "Pretendard's own Han coverage could not be established reliably from the browser" 라고 열어 둔 질문을 닫는 측정이다 — 브라우저로는 갈리지 않던 것이 `cmap` 에서는 갈리고, 답은 **0** 이다.

**(B) 세로 메트릭 — content area(em).** Pretendard Variable `hhea` ascent 1950 / descent −494 / upm 2048 → **1.1934em**. Kohinoor Devanagari(hi 의 실제 fallback; `Noto Sans Devanagari` 는 이 기계에 설치돼 있지 않다) → **1.5000em**. Hiragino Sans GB(zs/zt/ja 계열) `hhea` → **1.5000em**. Apple SD Gothic Neo → 1.2000em.

**(C) locale 코드 3개가 `Intl` 에서 조용히 `en-US` 로 떨어진다.** Node 24 ICU 실측: `Intl.NumberFormat('kr'|'zs'|'zt').resolvedOptions().locale === 'en-US'`. `Intl.DateTimeFormat('kr',{dateStyle:'medium'})` → `Sep 11, 2026`(`ko` 는 `2026. 9. 11.`). 예외를 던지지 않는다.

**(D) 카드·문항 텍스트는 `src/messages/**` 가 아니라 fixture 에 있고, fixture 는 `en`·`kr` 두 locale 만 갖는다.** `src/features/variant-registry/source-fixture.ts` 에 등장하는 locale 키는 `en`,`kr` 뿐이고(전수 확인), `src/features/test/fixtures/questions/*.ts` 7개 파일도 모두 같다. `src/config/site.ts:54` `defaultLocale = 'en'`, `src/features/variant-registry/localization.ts:35-45` 가 locale → `defaultLocale` 순으로 떨어뜨린다. **따라서 10개 locale 의 카드·문항은 지금 영어로 렌더된다.**

---

## 2. blocker

### 2-1. `<html lang>` 에 BCP 47 이 아닌 값이 나간다 (kr · zs · zt)

`src/app/layout.tsx:23` 이 `<html data-theme="light" lang={locale} suppressHydrationWarning>` 로 앱 locale 코드를 그대로 찍고, `src/i18n/locale-html-lang-sync.tsx:9-13` 이 클라이언트에서 같은 값으로 동기화한다. 값의 출처는 `src/proxy.ts:17` 의 `X-NEXT-INTL-LOCALE` 헤더 → `src/i18n/request-locale-header.ts:13-15` 이므로 **URL 과 `lang` 은 일치한다** — 문제는 일치 여부가 아니라 값 자체다.

`kr` 은 ISO 639-1 에서 **Kanuri** 이고(한국어는 `ko`), `zs`·`zt` 는 미할당 subtag 다. 실측(§1-C)대로 `Intl` 은 셋 모두를 `en-US` 로 해석하며 예외를 던지지 않는다. WCAG 2.2 **1.4.3 이 아니라 3.1.1 Language of Page (Level A)** — "The default human language of each Web page can be programmatically determined" — 을 정면으로 위반한다. 파급은 셋이다: ⑴ 스크린리더가 한국어/중국어 페이지를 영어(또는 Kanuri) 음성으로 읽는다, ⑵ 브라우저의 Han unification 자형 선택 경로(`:lang()` 기반 시스템 폰트 매칭)가 **작동할 수 없어** zs 와 zt 가 같은 자형으로 그려진다, ⑶ `Intl` 을 쓰는 어떤 포맷도 이 세 locale 에서 영어 결과를 낸다.

**어떤 게이트도 잡지 못하는 이유가 구조적이다.** axe 의 `html-lang-valid`(wcag2a/wcag311)는 ISO 639 목록 대조이므로 `kr`(= Kanuri) 은 **통과**한다 — 문법적으로 유효하고 의미만 틀렸기 때문이다. `zs`/`zt` 는 실패할 값인데, `tests/e2e/a11y-smoke.spec.ts` 의 `expectPageToBeAxeClean` 18회 호출은 전부 `/en` 과 `/kr`(`:667-676`) 에서만 돌고 `/zs`·`/zt` 로는 한 번도 가지 않는다. 그리고 현재 값은 **테스트가 고정하고 있다** — `tests/e2e/routing-smoke.spec.ts:150` `expect(html).toMatch(new RegExp('<html[^>]*lang="' + locale + '"'))`.

**제안.** URL 세그먼트와 문서 `lang` 을 분리한다. `src/config/site.ts` 의 `localeMetadata` 에 `htmlLang` 필드를 추가해 `kr → 'ko'`, `zs → 'zh-Hans'`, `zt → 'zh-Hant'`, 나머지는 코드 그대로 매핑하고, `layout.tsx:23` 과 `locale-html-lang-sync.tsx:10` 이 그 필드를 읽게 한다. URL·쿠키·telemetry `locale` 필드(`docs/req-landing.md:789`)·`generateStaticParams`·E2E 라우트 단정은 손대지 않는다 — 이것이 코드 자체를 BCP 47 로 바꾸는 것보다 훨씬 값싼 수정이다. 같은 커밋에서 `docs/req-landing.md §5.3`(`:142`)과 `§11.1`(`:745`)에 "문서 `lang` 은 유효한 BCP 47 태그여야 하며 URL locale 세그먼트와 같을 필요가 없다" 를 명시하고, a11y 스모크의 axe 순회에 `/zs`·`/zt` 를 추가한다.

### 2-2. 종단 표면 3장이 번역되지 않는다 — 그중 하나는 한국어 고정이고 나갈 길이 없다

`src/app/[locale]/test/error/page.tsx:29-31` 이 12개 locale 전부에 **하드코딩 한국어**를 렌더한다: `` const heading = variant ? `이 테스트에 진입할 수 없습니다 (variant: ${variant})` : '이 테스트에 진입할 수 없습니다' ``. 이것은 구현 실수가 아니라 계약이다 — `docs/req-test.md:845` 가 "메시지: `이 테스트에 진입할 수 없습니다`" 라고 값을 못박는다. 그 페이지에는 링크도 CTA 도 0개이고(`:44-56` 전체가 아이콘 + h1 하나), `context="test"`(`:40`)라 GNB 는 뒤로 버튼과 `00:00` 타이머만 그리므로 **언어 전환기에도 닿을 수 없다.** 힌디어 사용자가 여기 도착하면 읽을 수 없는 한국어 한 줄과 브라우저 뒤로가기만 남는다.

404 두 장은 영어 고정이다 — `src/app/not-found.tsx:36-40`("That page is not here" / "This address is valid, but nothing lives at it any more." / "Return home")과 `src/app/global-not-found.tsx:52-56`. 두 파일 모두 주석(`not-found.tsx:10`, `global-not-found.tsx:17`)에서 이를 "내용 결함으로 남김" 이라고 스스로 인정한다. `not-found.tsx` 는 루트 레이아웃 안에서 렌더되므로 `/de/없는경로` 에서 **`<html lang="de">` 안에 영어 본문**이 놓인다 — WCAG 3.1.2 Language of Parts (AA). `global-not-found.tsx:37` 은 `lang={defaultLocale}` = `en` 이라 그 항목만은 정합하다.

**제안.** ⑴ `req-test.md:845` 의 한국어 리터럴을 삭제하고 `test.entryBlockedTitle` / `test.entryBlockedBody` 메시지 키 2개를 12 locale 에 추가한다. ⑵ 같은 페이지에 `req-test.md:848-856` 이 이미 요구하는 복구 CTA(미완료 카드 최대 2장, 0장이면 랜딩 CTA)를 구현해 나갈 길을 만든다. ⑶ 404 두 장의 카피를 `notFound.title` / `notFound.body` / `notFound.action` 키로 옮긴다 — `not-found.tsx` 는 루트 레이아웃 안이라 `getTranslations` 를 쓸 수 있고, `global-not-found.tsx` 는 locale 을 모르므로 영어를 유지하되 `<html lang="en">` 이 이미 맞으므로 그대로 둔다.

### 2-3. 12 locale 중 2개만 시각 baseline 을 갖는다 — 0단계의 증거 모델이 17% 만 성립한다

`tests/e2e/theme-matrix-manifest.json:2` 가 `"locales": ["en", "kr"]` 이고, `tests/e2e/theme-matrix-smoke.spec.ts:14` 가 `type MatrixLocale = 'en' | 'kr'` 로 타입까지 고정하며, `scripts/qa/check-phase11-telemetry-contracts.mjs:214-216` 이 `JSON.stringify(manifest.locales) !== JSON.stringify(['en','kr'])` 이면 **fail 시킨다** — 즉 locale 축을 넓히는 것 자체가 `qa:rules` 를 붉힌다. 추적 PNG 170장 중 모바일 뷰포트 40장은 전부 en 20 / kr 20 이고, zs·zt·ja·hi·es·fr·pt·de·id·ru 는 **어느 뷰포트에서도 0장**이다.

사용자 결정 ④는 "0단계로 구조를 먼저 가른다 — 행동 무변경. 값 불변 지문 + 시각 baseline 이 증거" 다. 이 렌즈가 찾은 결함의 대부분(줄바꿈·행간·줄 수·버튼 행 접힘)은 **en/kr 에서는 보이지 않고 나머지 10개에서만 보인다**. 그러므로 현재 망으로 0단계를 통과시키면 "구조만 갈랐고 값은 안 바뀌었다" 는 주장이 12 locale 중 2개에 대해서만 검증된 채 착지한다.

**제안.** 전면 데카르트 확장(164 → 984장)은 재생성 비용이 과하므로 **모바일 뷰포트에 한해 압력 대표 locale 3개를 추가한다**: `de`(라틴 최장, 총량 1.23×) · `ja`(혼합 face + 행간 충돌 실증) · `hi`(fallback 81.5% + content area 1.5em). 모바일 state case 6개 × theme 2 × locale 3 = **+36장**(전체 164 → 200). 실행 순서는 ⑴ `check-phase11-telemetry-contracts.mjs:214-216` 의 `['en','kr']` 하드코딩을 매니페스트 참조로 바꾸고, ⑵ 매니페스트에 `localeKeys` 를 케이스별로 두어 모바일 케이스에만 5개 locale 을 주고, ⑶ `theme-matrix-smoke.spec.ts:14` 의 `MatrixLocale` 유니온을 넓힌 뒤, ⑷ 사용자 승인 아래 `qa:visual:full` 1회를 돌리고 `tests/e2e/theme-matrix-baseline-provenance.md` 에 등재한다.

---

## 3. major

### 3-1. 10개 locale 이 영어 본문을 `lang` 표시 없이 렌더한다 — 그리고 "12 locale" E2E 3종이 그만큼 동어반복이다

§1-D 대로 fixture 는 `en`/`kr` 만 갖는다. `docs/req-landing.md:399` 가 "locale 값 누락 시 default locale fallback 을 적용한다" 고 허용하므로 **fallback 자체는 계약 위반이 아니다.** 위반은 그 결과물의 표시다 — `<html lang="de">` 문서 안에 영어 카드 제목·부제·문항·선택지가 `lang="en"` 표시 없이 놓이면 WCAG 3.1.2 Language of Parts (AA) 위반이고, 독일어 음성 합성이 영어 문장을 독일어 음소로 읽는다.

같은 사실이 게이트를 무력화한다. `tests/e2e/grid-smoke.spec.ts:487`(mobile full subtitle preserves tag-row geometry across all 12 locales) · `:1196`(assertion:W12-mobile all locales keep full mobile text and contained rows) · `:1342`(tag tail ellipsis … across all 12 locales) 와 `tests/e2e/a11y-smoke.spec.ts:290` 은 `src/config/site.ts` 의 12개를 실제로 순회하지만, 비교 기준이 `resolveLandingCatalog(locale)` 이 돌려준 값 자체(`:1224-1225` `await expect(title).toHaveText(card.title)`)이고 그 값이 10개 locale 에서 **모두 같은 영어 문자열**이다. `docs/req-landing.md:312` Verification 7 이 주장하는 "12 locale 검증" 은 지금 2개 locale 을 12번 재는 것이다 — 번역 길이가 기하를 깨는지는 구조적으로 검출할 수 없다.

**제안.** 두 갈래를 함께 한다. ⑴ `resolveLocalizedText`(`localization.ts:35`)가 fallback 을 탔는지를 호출자에게 알리도록 `{text, resolvedLocale}` 을 반환하게 하고, 카드·문항 렌더가 `resolvedLocale !== locale` 일 때 해당 텍스트 노드에 `lang={resolvedLocale}` 을 붙인다(`landing-grid-card.tsx` 의 title/subtitle/choice, `test-question-client.tsx` 의 question/choice). ⑵ 압력 대표 3개 locale(de·ja·hi)에 대해 카드 8장·문항 fixture 의 title/subtitle/question/answer 를 실제로 번역해 fixture 에 넣는다 — 넣지 않으면 위 3종 E2E 는 계속 동어반복이고 §2-3 의 새 baseline 도 영어를 찍는다.

### 3-2. 확장 카드 meta 숫자가 `en-US` 로 하드코딩돼 6개 locale 에서 값이 틀리게 읽힌다

`src/features/landing/grid/landing-grid-card.tsx:41` `const metaValueFormatter = new Intl.NumberFormat('en-US', {maximumFractionDigits: 0});` 가 locale 인자를 받지 않고, `:159-165` 의 `formatMetaValue()` 가 이 단일 formatter 를 쓰며, `:724`·`:729` 가 확장 카드 meta row 의 모든 수치를 그린다. fixture 값이 4~5자리라 구분자가 실제로 발동한다(`source-fixture.ts:202` `engagedC: 42401`, `:35` `15236`).

Node ICU 실측(§1-C 스크립트와 같은 세션):

| locale | 올바른 15236 | 현재 렌더 | 결과 |
|:--|:--|:--|:--|
| en · ja · hi · kr · zs · zt | `15,236` | `15,236` | 일치(kr/zs/zt 는 우연 — §2-1 대로 `Intl` 이 en-US 로 떨어져도 같은 값) |
| es · pt · de · id | **`15.236`** | `15,236` | **쉼표가 소수 구분자인 로케일이라 "15와 236/1000" 으로 읽힌다** |
| fr · ru | **`15 236`** | `15,236` | 구분자 불일치 |

es/pt/de/id 는 표시 오류가 아니라 **값이 1,000배 작게 전달되는** 결함이다. 그리고 `Intl.NumberFormat(locale)` 로 고치는 것만으로는 kr/zs/zt 가 여전히 `en-US` 로 떨어지므로 §2-1 의 `htmlLang` 매핑이 선행돼야 한다. hi 의 인도식 lakh 그룹(`15,23,600`)은 6자리 이상에서만 드러나며 현재 fixture 최대가 5자리라 아직 보이지 않는다.

**제안.** `metaValueFormatter` 상수를 삭제하고 `formatMetaValue(value, intlLocale)` 로 바꾼다. `intlLocale` 은 §2-1 에서 신설하는 `localeMetadata[locale].htmlLang` 을 그대로 쓴다(BCP 47 태그여야 `Intl` 이 받는다). formatter 는 locale 별로 `Map` 캐시한다 — `Intl.NumberFormat` 생성은 비싸고 카드 8장 × meta 3개가 매 렌더 호출한다.

### 3-3. 행간 토큰이 Pretendard 의 1.1934em 에 맞춰져 있는데 4개 locale 은 1.5000em face 로 그려진다

§1-B 의 실측 두 개를 나란히 놓으면 결함이 바로 나온다. 타입 역할 11개 중 **9개의 line-height 가 1.5 미만**이다 — `--h1: 700 30px/1.2`(`globals.css:205`) · `--h3: 600 20px/1.3`(`:206`) · `--label: 500 14px/1.4`(`:209`) · `--caption: 400 13px/1.45`(`:210`) · `--overline: 600 12px/1.4`(`:211`) · `--button: 600 15px/1`(`:212`) · `--t-card-title: 600 20px/1.3`(`:219`) · `--t-card-subtitle: 400 15px/1.45`(`:220`) · `--t-expanded-question: 600 21px/1.3`(`:221`) · `--t-choice: 400 15px/1.45`(`:222`), 그리고 랜딩 히어로 제목 `leading-[1.2]`(`src/app/[locale]/page.tsx:29`). 1.5 를 넘는 것은 `--body` 1.6 과 `--body-sm` 1.55 둘뿐이다.

CSS 에서 `line-height` 는 요소가 정하고 face 마다 다르지 않으므로, fallback face 로 그려지는 글자의 잉크 상자(1.5em)가 line box 를 넘으면 **인접 줄과 겹친다.** 데바나가리의 위 matra(ि ी ै ौ ं)와 아래 matra(ु ू ृ), 한자의 상하 여백이 그 초과분을 실제로 채운다.

오늘 확정된 충돌 1건: **ja 랜딩 히어로 제목** — `landing.heroTitle` ja 가 358px 에서 2줄, line box 24×1.2 = **28.8px**, Hiragino 잉크 상자 24×1.5 = **36.0px** → 줄당 **7.2px 겹침**. hi 는 1줄, zs/zt 는 1줄이라 오늘은 충돌하지 않는다.

구조적 노출은 훨씬 크다. `docs/req-landing.md:285` 가 "Mobile title: 전 상태에서 전체 title 을 표시해야 하며 ellipsis 를 적용하면 안 된다" 고 못박아 모바일 카드 제목에 clamp 가 없으므로, fixture 가 번역되는 순간 **여러 줄이 되는 모든 카드 제목이 `--t-card-title` 20px/1.3 (line box 26px vs 잉크 30px) 에서 4px 씩 겹친다.** 현재 영어 fixture 에서도 `rhythm-b` 제목(94자)은 모바일 326px 에서 **4줄**이다(측정). 그리고 `--button: 600 15px/1` 은 라틴에서조차 잉크(17.90px)가 line box(15px)를 2.90px 넘고, Kohinoor 로는 22.5px 대 15px 로 **7.5px** 넘는다 — 버튼 라벨이 두 줄이 되는 순간 곧바로 겹친다.

근거 문서가 이 가정을 명문화하고 있다: `docs/design/design.md:82` "**One family does everything: Pretendard Variable** (covers Korean + Latin with matched metrics, so bilingual layouts stay even)". 12 locale 중 4개가 그 family 밖이므로 "matched metrics" 는 성립하지 않는다.

**제안.** 두 층으로 고친다. ⑴ 토큰 층: `--h1`·`--h3`·`--t-card-title`·`--t-expanded-question` 의 line-height 를 **1.5 이상**으로 올리고, `--button` 의 `/1` 을 `/1.2` 로 바꾼 뒤 `min-h-[46px]` 로 상자 높이를 유지한다(버튼은 단일 행이므로 시각 변화가 거의 없고, 두 줄이 될 때만 겹침이 사라진다). 값의 정본은 `docs/design/ds/colors_and_type.css` 이므로 그쪽을 먼저 고치고 `globals.css` 의 `@mirror` 구간에 다시 베낀다(`AGENTS.md:25`). ⑵ 스크립트 층: 위 인상이 라틴 레이아웃을 넓히는 것이 싫다면 `:root:lang(hi), :root:lang(zh-Hans), :root:lang(zh-Hant), :root:lang(ja)` 스코프에서만 행간 토큰을 1.5/1.6 으로 재정의한다 — 이 경로는 §2-1 의 유효 `lang` 값이 선행 조건이다.

### 3-4. §6.6 의 "Mobile Normal subtitle clamp 금지" 가 모바일 스크롤 깊이의 주 원인이다

`docs/req-landing.md:287` "Mobile Landing Normal subtitle: 전체 텍스트를 표시하고 clamp/ellipsis 를 적용하면 안 된다." 구현은 `landing-grid-card.tsx:379` `isMobileViewport ? 'overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-2'` 다. 데스크톱에는 2줄 clamp 가 있는데 모바일에만 없다.

fixture 부제를 모바일 카드 내부 폭 326px · 15px/1.45 에서 재면(측정):

| variant | en 자수 | en 줄 | en 높이 | kr 줄 | kr 높이 |
|:--|--:|--:|--:|--:|--:|
| **ops-handbook** | **371** | **9** | **196px** | 8 | 174px |
| release-gate | 146 | 4 | 87px | 3 | 65px |
| build-metrics | 123 | 3 | 65px | 2 | 44px |
| 나머지 6장 | 36~81 | 1~2 | 22~44px | 1~2 | 22~44px |

`ops-handbook` 한 장이 부제만 196px 를 쓴다. 그리고 그 fixture 의 텍스트는 **제 존재 이유를 스스로 적어 두었다** — `source-fixture.ts:194` "It intentionally includes extended prose so subtitle clamp and overflow rules can be validated against realistic payload sizes in both desktop and mobile layouts." 모바일에는 검증할 clamp 가 `:287` 때문에 존재하지 않으므로, 이 데이터는 모바일에서 목적을 잃은 채 높이만 만든다. 여기에 fr 1.30× / de 1.23× 를 적용하면 11~12줄(240~260px)이다.

`:287` 이 UX 근거를 갖지 않는다는 것도 확인했다 — `docs/design/design.md:86-87` 과 §4.11(`:117`)이 같은 규칙을 반복할 뿐 이유를 적지 않고, `docs/req-landing.md` 전체에서 이 조항의 근거 문장을 찾지 못했다. 모바일 웹 관용(iOS HIG · Material 3 목록 패턴)은 정반대다 — 목록 행은 2~3줄로 자르고 전문은 상세 화면이 갖는다.

**제안.** `:287` 을 "Mobile Landing Normal subtitle: 최대 3줄 clamp 를 적용하고 overflow 시 ellipsis 를 노출한다. 전문은 Expanded 또는 상세 화면이 갖는다" 로 개정한다. 3줄인 이유는 en 기준 `build-metrics`(3줄)까지는 손실 0 이고 `ops-handbook` 만 잘리기 때문이며, de/fr 에서도 `release-gate` 이하가 손실 0 으로 남는다. 개정 시 `docs/design/design.md:86-87`·`:117` 과 `docs/req-landing.md:285`(Mobile title) 을 같은 커밋에서 동기화한다 — 제목은 1~2줄 clamp 를 별도 판단 대상으로 남긴다.

### 3-5. `word-break: keep-all` 이 한국어 근거로 전역 적용돼 zs/zt/ja 의 줄바꿈 기회를 없앤다

`docs/design/design.md:84` 가 "**Global wrapping rule:** wrapping text uses `word-break: keep-all; overflow-wrap: anywhere;`" 이고, §4.11(`:117`)이 그 근거를 밝힌다 — "use `word-break: keep-all` for Korean line-breaking, and use `overflow-wrap: anywhere` as the Latin fallback." **12 locale 제품의 로컬라이제이션 정본이 두 언어만 다룬다.**

CSS Text Level 3 에서 `word-break: keep-all` 은 CJK 문자 **사이의 암묵적 줄바꿈 기회를 억제**한다. 한국어는 어절 사이에 공백이 있어 이 선언이 "어절 중간에서 자르지 말라" 로 정확히 동작하지만(그 실측 근거가 `landing-grid-card.module.css:119-127` 의 D-06 주석에 남아 있다), **중국어·일본어는 공백이 없으므로 문장 전체가 하나의 끊을 수 없는 단위가 된다.** 그 상태에서 유일한 탈출구가 `overflow-wrap: anywhere` 인데, `anywhere` 는 금칙(kinsoku)을 무시하고 어디서든 끊으므로 `。`·`、`·닫는 괄호가 줄머리에 오는 조판 오류가 생긴다. 그리고 `line-break` 선언은 `src/` 전체에 **0건**, `hyphens` 도 **0건**이다(전수 grep) — 즉 CJK 금칙은 브라우저 기본에 맡겨져 있고 독일어·힌디어의 분철은 꺼져 있다.

**제안.** `keep-all` 을 전역에서 떼고 스크립트 스코프로 옮긴다. 기본은 `overflow-wrap: anywhere` 만 남기고, `:lang(ko)` 에서만 `word-break: keep-all` 을 켜며, `:lang(zh-Hans), :lang(zh-Hant), :lang(ja)` 에는 `line-break: strict` 를 준다. `:lang(de)` 에 `hyphens: auto` 를 검토한다(독일어 복합어가 358px 에서 단어 하나로 줄을 넘기는 유일한 라틴 locale 이다). 이 경로도 §2-1 의 유효 `lang` 값이 선행 조건이다 — `:lang(zs)` 로는 어떤 브라우저 규칙도 의도대로 걸리지 않는다. `docs/design/design.md:84`·`:117` 을 같은 커밋에서 "12 locale × 스크립트별 규칙" 으로 재작성한다.

### 3-6. "Global wrapping rule" 이 실제로는 전역이 아니다 — 세 자리에 빠져 있다

전수 grep 결과 `word-break`/`overflow-wrap` 선언은 9곳이고, CSS 모듈의 D-06 수정은 **`-normal` 접미 클래스에만** 걸린다 — `landing-grid-card.module.css:128-131` 의 선택자가 `.root :global(.landing-grid-card-title-normal), .root :global(.landing-grid-card-subtitle-normal)` 이다. 다음 셋은 `keep-all` 을 받지 못한다.

| 자리 | 클래스 | 선언 상태 |
|:--|:--|:--|
| 랜딩 Expanded Blog 부제 | `landing-grid-card.tsx:382` → `landing-grid-card-subtitle-expanded` | base(`:221`)의 `overflow-wrap:anywhere` 만. `keep-all` 없음 |
| 블로그 상세 본문 | `blog-destination-client.tsx:37` `blogArticleBodyClassName` | **둘 다 없음** |
| 블로그 색인 목록 행 부제 | `blog-destination-client.tsx:51` `blogArticleLinkSubtitleClassName` | **둘 다 없음** |

같은 파일의 제목들(`:35` 기사 제목, `:47` 목록 행 제목)은 둘 다 갖고 있으므로 누락은 선택적이지 않고 우발적이다. 결과: **한국어 확장 블로그 부제와 블로그 두 표면의 부제가 D-06 이 Normal 에서 고친 바로 그 어절 중간 끊김을 여전히 일으킨다.** en 에서는 보이지 않고 kr/ja 에서만 보이는 결함이며, 현재 시각망에 `kr` 확장 블로그 카드 baseline 이 없어 잡히지 않는다.

**제안.** 래핑 규칙을 클래스가 아니라 `globals.css` 의 텍스트 base 로 올린다(§3-5 의 스크립트 스코프와 함께). 즉 `.landing-grid-card-title, .landing-grid-card-subtitle, .blog-article-title, .blog-article-body, .blog-article-link-title, .blog-article-link-subtitle` 을 한 규칙으로 묶지 말고, `p`/`h1`~`h3`/`strong`/`span` 에 대한 전역 래핑 규칙 한 벌을 `globals.css` §base 에 두고 `keep-all` 만 `:lang(ko)` 로 스코프한다. `docs/design/design.md:84` 가 이미 "Global" 이라고 적었으므로 계약 개정은 필요 없고 구현이 계약을 따라가면 된다.

### 3-7. 지시 오버레이 액션 행이 8/12 locale 에서 접히고, `justify-end` 때문에 부차 행동이 주 행동 위로 올라간다

`src/features/test/instruction-overlay.tsx:20` `const instructionActionRowClassName = 'flex flex-wrap items-center gap-2';` 이고 `:180`·`:227` 이 `` `${instructionActionRowClassName} justify-end` `` 로 쓴다. 모바일 카드는 `:26` 에서 `max-[767px]:w-full` + `p-5` 이므로 390px 에서 **가용 폭 350px**. 버튼은 `button-class-names.ts:60` `min-h-[46px] px-4` + border 2px = 텍스트 + 34px, `--button` 600 15px.

측정(400 굵기 메트릭 기준이므로 실제는 2~4% 더 넓다):

| 조합 | en | kr | zs | zt | ja | es | fr | pt | de | hi | id | ru |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| acceptAllAndStart + keepCurrentPreference | **370** | 273 | 271 | 271 | 324 | **442** | **489** | **409** | **480** | **390** | **447** | **447** |
| acceptAllAndStart + denyAndAbandon | 332 | 269 | 256 | 256 | 294 | **388** | **424** | **375** | **436** | **358** | **366** | **362** |
| acceptAllAndStart + denyAndStart | 304 | 269 | 256 | 256 | 294 | **375** | **423** | **361** | **411** | **374** | 344 | **367** |

굵은 값이 350px 초과다. 최악 조합에서 **12개 중 8개(en·es·fr·pt·de·hi·id·ru)가 접히고, kr/zs/zt/ja 만 한 줄에 들어간다** — 이 화면이 한국어로만 설계·검증된 흔적이 px 로 남아 있다. 단일 버튼이 350px 를 넘는 경우는 없으므로(최대 `test.keepCurrentPreference` ru 254px) 접힘은 행 단위이고 버튼 내부 줄바꿈은 아니다.

접힘의 결과가 더 나쁘다. `flex-wrap` + `justify-end` 에서 첫 줄은 secondary(quiet 무게의 "동의 거부"·"현재 설정 유지"), 둘째 줄은 primary("모두 동의하고 시작") 가 된다 — **파괴적/부차 행동이 주 행동 위에 놓이고**, 둘 다 우측 정렬이라 시선이 두 번 오른쪽 끝으로 튄다. iOS HIG·Material 3 의 모바일 다이얼로그 관용은 폭이 모자라면 세로 스택하되 **primary 를 위(또는 전폭 하단 고정)** 에 두는 것이다.

**제안.** 모바일에서 액션 행을 wrap 이 아니라 명시적 세로 스택으로 바꾼다 — `max-[767px]:flex-col max-[767px]:items-stretch` 를 `instructionActionRowClassName` 에 더하고 `justify-end` 는 `max-[767px]:justify-start` 로 상쇄하며, DOM 순서를 primary → secondary 로 뒤집어(현재는 secondary 가 먼저 렌더된다: `:228-236` 이 secondary, 그 뒤가 primary) 세로에서 primary 가 위에 오게 한다. 전폭 버튼이므로 라벨 길이와 무관하게 12 locale 이 같은 모양이 된다.

### 3-8. 동의 배너의 세로 예산이 locale 을 모른다 — SSR 120px 대 실제 169~288px

`src/features/landing/shell/consent-banner.tsx:18` `const SSR_BANNER_SPACER_ESTIMATE_PX = 120;` 이고, 바로 위 주석(`:13-17`)이 그 출처를 밝힌다 — "실측(2026-09-10, chromium **1280×720**) 배너 80px · 하단 gap 16px". 즉 **배너가 가장 낮은 단 하나의 폭에서 잰 값이 가장 높아지는 폭에 적용된다.** 마운트 후 `:115-119` 의 `updateSpacerHeight()` 가 실측으로 대체하므로 첫 페인트에서만 어긋나는데, 그 어긋남이 곧 CLS 다.

390px 에서 배너는 `:241` 의 `max-[719px]:flex-wrap max-[719px]:p-[14px]` 분기로 세로 적층되고 메시지가 `basis-full`(`:245`), 액션 행도 `basis-full`(`:248`) 이 된다. 내부 폭 330px, 메시지 `--body-sm` 14px/1.55. 측정:

| locale | 메시지 줄 | 액션 행 | 배너 높이 | spacer(=배너+16) | SSR 120 대비 |
|:--|--:|--:|--:|--:|--:|
| kr · zs · zt | 3 | 1 | 153px | **169px** | −49px |
| hi | 4 | **2** | 229px | 245px | −125px |
| ja | 4 | 1 | 175px | 191px | −71px |
| en | 5 | 1 | 197px | 213px | −93px |
| id | 6 | 1 | 218px | 234px | −114px |
| es · pt · ru | 5 | **2** | 251px | 267px | −147px |
| de | 5 | **2** | 251px | 267px | −147px |
| fr | 6 | **2** | 272px | **288px** | **−168px** |

두 가지가 겹친다. ⑴ 첫 페인트에서 **49~168px 의 상향 점프**가 locale 에 따라 다른 크기로 일어난다. ⑵ 액션 행 3개 버튼(accept/deny/preferences)의 합이 330px 를 넘어 **6개 locale(es·fr·pt·de·hi·ru)에서 접힌다** — 측정 합계 de 371 · hi 360 · ru 357 · es 353 · fr 346 · pt 339 대 330px.

**이 전체가 시각 회귀망에 보이지 않는다.** `tests/e2e/theme-matrix-smoke.spec.ts:171` 의 `openThemedPage` 가 항상 `seedTelemetryConsent(page,'OPTED_IN')` 를 호출하므로 164장 중 **어느 것도 미동의 배너를 고정하지 않는다.** 모바일에서 화면 아래를 가장 크게 먹는 단일 요소가 회귀망 밖에 있다.

**제안.** ⑴ SSR 상수를 지우고 배너 자리를 CSS 로만 예약한다 — 배너를 `fixed` + spacer 조합에서 `position: sticky; bottom: 0` 또는 셸 grid 의 마지막 행으로 바꾸면 JS 측정도 SSR 추정도 필요 없어지고 locale 과 무관하게 정확해진다. 그것이 이번 리팩터 범위를 넘는다면 최소 수정으로 ⑵ `SSR_BANNER_SPACER_ESTIMATE_PX` 를 locale × 뷰포트 함수로 바꾸되(모바일 기본 240px, 데스크톱 120px) 여전히 추정임을 유지한다. ⑶ 액션 행을 모바일에서 `flex-col`(전폭 3개 스택)로 바꿔 접힘 자체를 없앤다. ⑷ 매니페스트에 `landing-consent-banner-mobile` state case 를 신설해 **미동의 상태**를 baseline 으로 고정한다 — §2-3 의 locale 확장과 같은 승인 1회에 묶는다.

### 3-9. 복수형 규칙이 0건인데 수치와 붙는 라벨이 5개다

`src/messages/*.json` 전체에서 ICU `plural`/`select` 구문 **0건**(전수 확인). 그런데 `landing-grid-card.tsx:722-730` 이 meta row 를 `<span>{formatMetaValue(entry.value)}</span><span>{entry.label}</span>` 로 값과 라벨을 인접 렌더하고, 그 라벨 5개(`landing.metaEstimated`·`metaShares`·`metaAttempts`·`metaReadTime`·`metaViews`)가 12 locale 에 번역돼 있다.

`source-fixture.ts:181-182` 에 `sharedC: 1, engagedC: 9` 인 variant 가 **실재한다**. 따라서 ru 는 지금 `1 репостов`(복수 생격 + 단수 값) 같은 비문을 렌더한다. 러시아어는 3형(1 / 2–4 / 5+), es·fr·pt·de·id·hi 는 2형을 요구하고, en 도 `1 shared` / `9 shared` 가 같은 라벨이라 어색하다. kr·zs·zt·ja 만 복수형이 없어 현행이 맞다.

**제안.** 다섯 라벨을 ICU plural 로 바꾼다 — 예 `"metaShares": "{count, plural, one {# share} other {# shares}}"` — 그리고 값과 라벨을 두 `<span>` 으로 쪼개는 대신 메시지 하나가 둘을 다 갖게 한다(next-intl 의 `t.rich` 로 값 부분만 `<strong>` 을 씌우면 현재의 lead/일반 구분도 유지된다). ru 는 `one/few/many/other` 네 분기를 채운다. 이 변경은 `landing-grid-card.tsx:707-736` 의 `entries` 구조를 `{labelKey, value}` 로 바꾸는 것을 포함한다.

### 3-10. 블로그 색인 목록 행이 clamp 도 래핑 규칙도 없이 부제 전문을 렌더한다

`blog-destination-client.tsx:51` `const blogArticleLinkSubtitleClassName = '[font:var(--caption)] text-[var(--ink-body)]';` — `line-clamp` 없음, `word-break`/`overflow-wrap` 없음(§3-6). 저장소 전체의 `line-clamp` 사용처는 `landing-grid-card.tsx:379`·`:382`·`:408` 세 곳뿐이다.

390px 에서 목록 행 내부 폭은 358(셸) − 40(`p-5`) − 28(`px-3.5`) = **290px**, `--caption` 13px/1.45. 측정:

| variant | en 자수 | en 줄 | en 부제 높이 | kr 줄 | kr 높이 |
|:--|--:|--:|--:|--:|--:|
| ops-handbook | 371 | **9** | **170px** | 8 | 151px |
| release-gate | 146 | 3 | 57px | 3 | 57px |
| build-metrics | 123 | 3 | 57px | 2 | 38px |

목록 3행 합계가 en 462px · kr 424px 다. 그리고 `ops-handbook` 한 행이 170px 로 다른 두 행의 3배가 되어 **목록으로서의 스캔 가능성이 사라진다** — 행 높이가 균일하지 않으면 목록이 아니라 블록 3개다. 랜딩 카드는 §3-4 의 조항 때문에 clamp 가 금지된 것이지만, 블로그 색인 목록에는 그 조항조차 없다 — 단순 누락이다. de/fr 번역이 들어오면 11~12줄이 된다.

**제안.** `blogArticleLinkSubtitleClassName` 에 `overflow-hidden text-ellipsis line-clamp-2` 를 더한다(목록 행은 2줄이 관용이고, 전문은 한 탭 뒤 상세가 갖는다). 같은 줄에 §3-6 의 래핑 규칙을 더한다. 이 표면은 `docs/req-landing.md`·`docs/design/design.md` 어디에도 패턴이 없으므로(design.md §7 에 블로그 상세·색인 패턴 0건) 계약 개정이 아니라 신설이다 — `docs/design/design.md §7` 에 "Secondary surface list row" 패턴을 추가하고 clamp 를 거기 적는다.

### 3-11. 드로어의 12개 locale 칩 격자가 4행 200px 을 차지하고, 칩마다 `lang` 이 없다

`src/features/gnb/components/settings-controls.tsx:118` `const localeChipClassName = scope === 'desktop' ? chipBaseClassName : `${chipBaseClassName} min-h-[var(--tap-min)] px-[14px]`;` 이고 `:19` 가 `chipRowClassName = 'gnb-chip-row flex flex-wrap gap-2'` 다. 드로어 폭은 `site-gnb.tsx:87` `w-[min(87vw,340px)]` + `px-4` → 390px 에서 내부 **307px**.

칩 폭 측정(라벨 + `px-[14px]`×2 + border 2px, `text-[0.8rem]` = 12.8px semibold): en 71 · kr 63 · zs 81 · zt 81 · ja 68 · es 75 · fr 78 · pt 89 · de 78 · hi 57 · id 85 · ru 79 → **합계 906px, 307px 에서 4행, 블록 높이 44×4 + 8×3 = 200px**.

파일이 이 결과를 예견하고 있다 — `:20-24` 주석이 데스크톱 레이어에서 32px 를 고른 이유로 "at 44 each the grid becomes a wall" 을 적고, 같은 문장이 "Inside the drawer the same chips are a primary touch target and take the floor" 로 모바일에서는 44px 를 택한다고 밝힌다. **의도된 트레이드오프지만 그 결과가 벽이라는 것도 같은 주석이 인정한다** — 340px 드로어에서 200px 가 언어 선택 하나다.

두 번째 결함이 겹친다. `:185` 가 `{label}` 을 그대로 렌더하는데 그 라벨은 **각 언어의 자기 이름**(`src/config/site.ts:1-36` 의 `한국어`·`简体中文`·`日本語`·`हिन्दी`·`Русский`)이고 **`lang` 속성이 하나도 없다.** 독일어 사용자의 스크린리더가 `한국어`·`日本語`·`हिन्दी` 를 독일어 음소로 읽는다 — WCAG 3.1.2 Language of Parts (AA) 의 교과서적 위반 자리이며, 언어 전환기는 이 규칙이 가장 명확히 적용되는 컴포넌트다. 그리고 그 12개 라벨 중 4개(`简体中文`·`繁體中文`·`日本語`·`हिन्दी`)는 §1-A 때문에 **현재 locale 과 무관하게 항상 fallback face 로 그려진다** — 한 행 안에서 자형이 섞인다.

**제안.** ⑴ 칩 격자를 목록으로 바꾼다 — 드로어 안에서는 `flex-wrap` 칩 대신 전폭 목록 행(44px, 좌측 라벨 + 우측 체크)으로 두면 12행 × 44px = 528px 가 되어 더 길어지므로, 대신 **언어 선택을 드로어 안 인라인에서 분리해 전용 시트/화면으로 뺀다**(결정 5 의 IA 재설계 범위). 드로어에는 "언어: 한국어 ›" 한 행만 남는다. ⑵ 어느 형태든 각 옵션에 `lang={localeMetadata[code].htmlLang}` 을 붙인다 — §2-1 의 매핑이 그대로 재사용된다.

---

## 4. minor

### 4-1. `⋅`(U+22C5) 가 Pretendard 에 없어 12 locale 전부에서 라벨 한가운데가 fallback 을 탄다

측정: Pretendard `cmap` 에 U+22C5 **ABSENT**(같은 용도의 U+00B7 MIDDLE DOT 은 PRESENT, U+2192 `→` 도 PRESENT, U+2026 `…` 도 PRESENT). `gnb.theme` 이 12 locale 모두 이 문자를 쓴다(`"Language ⋅ Theme"`·`"언어 ⋅ 테마"`·`"भाषा ⋅ थीम"` …). 데바나가리 danda `।`(U+0964)도 ABSENT 인데 hi 문장 종결에 쓰인다.

한 라벨 안에서 앞뒤 글자는 Pretendard, 가운데 점만 시스템 face 라 굵기·베이스라인·좌우 여백이 어긋난다. 그리고 이 문자열은 `tests/unit/gnb-message-labels.test.ts:18-29` 가 12 locale 전부 하드코딩으로 고정한다.

**제안.** 12개 메시지의 `⋅`(U+22C5)를 `·`(U+00B7)로 치환하고 같은 커밋에서 `gnb-message-labels.test.ts:18-29` 의 기대 문자열을 갱신한다. 확장 카드 meta 구분자는 이미 U+00B7 을 쓴다(`landing-grid-card.tsx:719`) — 한 저장소 안에서 같은 역할의 문자가 둘로 갈려 있던 것을 하나로 합치는 수정이다.

### 4-2. 랜드마크 `aria-label` 4개가 영어 하드코딩이다

전수 grep 결과: `src/app/[locale]/page.tsx:28` `aria-label="Landing Hero"` · `src/features/gnb/site-gnb.tsx:275` `aria-label="Primary"` · `:443` `aria-label="Mobile Primary"` · `src/features/landing/grid/landing-catalog-grid.tsx:178` `aria-label="Landing Catalog Grid"`. 12 locale 전부에서 이 영어가 낭독된다 — 랜드마크 순회는 모바일 스크린리더 사용자의 1차 내비게이션 수단이므로 힌디어·러시아어 사용자가 자기 언어 페이지에서 영어 구조 이름을 듣는다. `docs/req-landing.md:695` 는 "Mobile hamburger/desktop settings/back/X 버튼은 `aria-label` 필수다" 만 적고 **랜드마크 이름의 번역 의무는 어디에도 없다.**

**제안.** 네 문자열을 `landing.heroRegion` · `gnb.primaryNav` · `gnb.mobilePrimaryNav` · `landing.catalogRegion` 메시지 키로 옮기고 12 locale 을 채운다. `landing-catalog-grid.tsx` 는 이미 `copy` 객체를 받으므로 추가 배선 비용이 거의 없다. `docs/req-landing.md §9`(a11y)에 "landmark accessible name 은 활성 locale 로 제공한다" 한 줄을 신설한다.

### 4-3. 퍼센트 기호가 리터럴이고, 날짜·상대시간 포맷터가 0개다

`test.progressValue` 가 12 locale 전부 `"{percent}%"` 이고 `test-question-client.tsx:196` 이 `t('progressValue', {percent: scoringProgress.percent})` 로 쓴다. ICU 의 `{percent}` 는 숫자만 locale 포맷하고 `%` 는 리터럴이므로 fr·ru 의 관용인 narrow no-break space 선행(`50 %`)이 적용되지 않는다. 그리고 kr/zs/zt 는 §2-1 때문에 숫자조차 `en-US` 규칙을 탄다.

날짜·상대시간은 렌더되는 곳이 하나도 없다 — `src` 전체에서 `toLocaleString`/`toLocaleDateString`/`Intl.DateTimeFormat`/`Intl.RelativeTimeFormat`/next-intl `useFormatter` 사용처 **0건**(전수 grep). `gnb.timerPlaceholder` 는 12 locale 전부 리터럴 `"00:00"` 이고 `test.qualifierPending` 은 전부 `"—"` 다. `/{locale}/history` 가 실제 항목을 그리기 시작하는 순간 날짜 포맷이 필요해지고, 그때 kr/zs/zt 는 §2-1 의 `en-US` 함정을 그대로 밟는다(실측: `Intl.DateTimeFormat('kr',{dateStyle:'medium'})` → `Sep 11, 2026`).

**제안.** ⑴ `progressValue` 를 `"{percent, number, percent}"` 로 바꾸고 `percent` 를 0~1 스케일로 넘긴다 — ICU 가 locale 별 기호 위치와 공백을 처리한다. ⑵ history 구현 **전에** §2-1 의 `htmlLang` 매핑을 착지시키고, 날짜·상대시간은 next-intl 의 `useFormatter()` 를 통해서만 쓴다는 규칙을 `AGENTS.md §3`(No fabrication 옆)에 한 줄로 신설한다 — `new Intl.*(...)` 를 직접 생성하는 자리가 §3-2 하나뿐인 지금이 그 규칙을 세울 마지막 시점이다.

### 4-4. `--track-over: 0.08em` 이 데바나가리 시로레카를 끊는다

`globals.css:216` `--track-over: 0.08em` 이 `--overline`(600 12px/1.4) 과 함께 두 곳에 적용된다 — `blog-destination-client.tsx:32` `blogKickerClassName`("Selected article", hi 는 `"चुना गया लेख"`) 과 `surface-class-names.ts:114` `testOverlineClassName`. 데바나가리는 단어 위를 가로지르는 시로레카(शिरोरेखा)가 글리프 가장자리에서 이어져 한 단어를 시각적으로 묶는데, `letter-spacing` 은 자소 클러스터 사이에 간격을 넣어 그 선을 **단어 안에서 끊는다**. 12px × 0.08em = 클러스터당 +0.96px 이므로 6클러스터 단어에서 약 5px 의 틈이 생긴다.

`--track-tight: -0.01em`(`:215`)은 카드 제목·테스트 문항·블로그 제목에 걸리는데(`landing-grid-card.tsx:219`·`:232`, `test-question-client.tsx:57`, `blog-destination-client.tsx:33`·`:35`) CJK 에서 20px × −0.01 = −0.2px 로 영향이 작아 별도 조치가 필요 없다고 판단했다.

**제안.** `--track-over` 를 `:lang(hi)` 에서 `0` 으로 재정의한다(같은 이유로 아랍/태국계를 추가할 여지를 남긴다). 값의 정본은 `docs/design/ds/colors_and_type.css` 이므로 그쪽을 먼저 고치고 `globals.css` 의 `@mirror` 구간에 다시 베낀다. 이 경로도 §2-1 의 유효 `lang` 값이 선행 조건이다.

### 4-5. 1.96 MB 폰트를 zs/zt/hi 는 자기 문자의 15~19% 에만 쓴다

`public/fonts/PretendardVariable.woff2` = 2,057,688 bytes, 선언은 `globals.css:31-36`(`font-display: swap`, preload 하지 않음 — `:22-29` 가 그 결정과 근거를 적는다). `src/messages/*.json` 전문 기준으로 Pretendard 에 없는 문자 비율을 세면 zs **85.5%** · zt **85.6%** · hi **81.5%** · ja **34.3%** · 나머지 8개 locale 0.1~0.2%(전부 §4-1 의 `⋅` 한 글자)다.

카드 텍스트가 번역되면 zs/zt 사용자는 **문서 문자의 약 90% 가 시스템 폰트로 그려지는 상태에서 2 MB 를 내려받는다.** `swap` 이라 텍스트가 기다리지는 않지만 모바일 데이터·디코드 비용은 그대로다. `globals.css:26-28` 이 해법(upstream dynamic subset per-unicode-range)을 이미 적고 "assets this repository does not have" 로 막아 두었다.

**제안.** 서브셋 빌드 단계를 추가하지 않고도 닫을 수 있다 — `@font-face` 를 **`unicode-range` 로 두 벌 선언**한다. 하나는 Latin+Cyrillic+구두점(`U+0000-024F, U+0370-03FF, U+0400-04FF, U+2000-206F`), 다른 하나는 Hangul(`U+1100-11FF, U+3130-318F, U+AC00-D7AF`). 같은 파일을 가리켜도 브라우저는 페이지가 실제로 그 범위 글자를 쓸 때만 내려받으므로, **zs/zt/ja/hi 는 한 벌도 받지 않는다**(§1-A 대로 그 locale 문자가 두 범위 어디에도 없다). 파일이 하나뿐이므로 `SYNC.md` 가 경계한 "두 쪽이 어느 글리프가 있는지로 갈라지는" 위험이 생기지 않는다.

### 4-6. BQ-32 의 56px tail 이 CJK 에서 2글자만 남긴다 (조건부)

`docs/req-landing.md:290` 이 마지막 가시 태그를 `--tag-min-width:56px`(`globals.css:202`)까지 말줄임하도록 허용한다. 칩은 `landing-grid-card.tsx:230` 에서 `px-[9px] text-[13px]` 이므로 텍스트 상자는 **38px**, Pretendard 의 `…`(U+2026) 가 13px 에서 9.9px 이므로 글자 예산은 **28.1px** 다. 측정:

`en "comi…"(4/11)` · `kr "출시 …"(3/5)` · `zs "即将…"(2/4)` · `zt "即將…"(2/4)` · `ja "近日…"(2/4)` · `es "próx…"(4/12)` · `fr "bien…"(4/18)` · `pt "em …"(3/8)` · `de "dem…"(3/9)` · `hi "जल्द…"(4/13)` · `id "seg…"(3/12)` · `ru "ско…"(3/5)`

한자 2글자 말줄임(`即将…`·`近日…`)은 의미를 거의 전달하지 못한다. **다만 이 경로는 오늘 발동하지 않는다** — `landing-grid-card.tsx:459` `const normalizedTags = comingSoonLabel ? [comingSoonLabel] : card.tags;` 가 unavailable 카드의 태그를 coming-soon 하나로 치환하므로 경쟁 태그가 없고, 그 자연 폭(zs/zt/ja 70px)은 모바일 카드 태그 행 326px 에 여유롭게 들어간다. 위험은 **available 블로그 카드에서 `Read more` CTA 예약(`:465`, 모바일은 항상 표시)과 태그가 경쟁할 때**이고, 그 카드의 태그는 fixture(en/kr)만 있어 아직 번역 압력이 없다. 참고로 `ru "скоро"` 는 자연 폭 54px 로 56px 하한보다 **좁아** `:290` 의 "short-tail full-or-hidden" 분기에 들어가지만, `:717` 이 coming-soon 을 hidden suffix unmount 대상에서 명시적으로 제외하므로 숨겨지지 않는다 — 두 조항이 ru 에서만 마주치되 `:717` 이 이긴다.

**제안.** `--tag-min-width` 를 px 단수로 두지 말고 "말줄임 후 최소 2 자소 + 말줄임표" 라는 결과 기준으로 `:290` 을 재작성하고, 구현은 `min-width: max(56px, 4ch)` 로 둔다 — `ch` 는 요소의 실제 face 를 따르므로 CJK fallback 에서 자동으로 넓어진다. §2-3 의 새 baseline 에 `ja` 가 들어가면 이 자리가 회귀망에 처음 들어온다.

---

## 5. 결함이 아니라고 판정한 것 — 재조사 비용을 아끼기 위해 남긴다

**GNB 바 자체는 12 locale 전부 안전하다.** 모바일 `h-14`(56px) · `px-[var(--shell-gutter)]`(16px) → 내부 358px, 3열(`flex-1 min-w-0`). pill 최대 폭 측정: `gnb.back` de 70 / id 76, `gnb.menu` ja 79, `gnb.close` de 88. 어느 조합도 358px 를 위협하지 않는다.

**테스트 문항 화면의 폭 압력은 낮다.** 하단 nav 최대 조합은 id `prev 117 + next 106 = 223px` 로 358px 에 여유가 크다. `test-question-client.tsx`(425줄)·`surface-class-names.ts`(114줄)에 뷰포트 분기가 0개라는 기존 실측과 마찬가지로 **locale 분기도 0개**이고, 그것이 여기서는 문제가 아니다.

**메시지에 있는 제목들은 모바일에서 지금 줄바꿈하지 않는다.** `blog.selected`(`--h1` 30px/1.2, 318px) · `blog.allArticles`(`--h3`) · `test.instructionTitle`(`--h3`) · `consent.preferencesTitle` 은 12 locale 전부 1줄이고, `history.title` 만 ru 에서 2줄인데 ru 는 Pretendard 로 그려지므로 §3-3 의 충돌에 걸리지 않는다. 행간 결함은 §3-3 에 적은 ja 히어로 제목 1건과 번역 후의 카드 제목에 국한된다.

**`--body`(16px/1.6)와 `--body-sm`(14px/1.55)은 fallback face 에서도 안전하다.** 잉크 상자 1.5em 대비 line box 가 각각 25.6px vs 24.0px, 21.7px vs 21.0px 로 넘지 않는다. 동의 배너 메시지·히스토리 본문·지시 오버레이 본문이 이 둘을 쓰므로, 산문이 가장 긴 자리들은 행간 문제에서 자유롭다.

**RTL 은 이번 범위 밖이다.** 지원 12 locale(`site.ts:1-36`)에 아랍어·히브리어가 없으므로 `dir` 속성 부재는 현재 결함이 아니다. 다만 §2-1 의 `htmlLang` 매핑을 만들 때 같은 메타데이터 객체에 `dir` 필드를 함께 두면 나중 확장 비용이 0 이 된다.

---

## 6. 착수 순서 권고 — 무엇이 무엇의 선행 조건인가

`lang` 수정(§2-1)이 **네 개의 다른 수정을 잠금 해제한다**: 숫자 포맷(§3-2)은 `Intl` 이 받는 태그가 있어야 하고, 스크립트별 줄바꿈(§3-5)·행간(§3-3)·tracking(§4-4)은 전부 `:lang()` 선택자를 쓰므로 `lang="zs"` 로는 어떤 규칙도 걸리지 않는다. 그러므로 §2-1 은 비용이 작음에도 **1순위**다.

그다음이 baseline locale 확장(§2-3)이다 — 그것 없이 §3-3·§3-4·§3-5·§3-6·§3-10 을 손대면 회귀를 볼 수 없고, 그 다섯은 전부 en/kr 에서 보이지 않는 결함이다. 그리고 §3-1 의 fixture 번역(de·ja·hi)은 §2-3 의 새 baseline 이 영어를 찍지 않게 하는 선행 조건이므로 같은 단위로 묶는다.

계약 개정이 필요한 것은 넷이다 — `docs/req-landing.md:287`(모바일 부제 clamp, §3-4) · `:285`(모바일 제목 clamp, §3-3 과 함께) · `:303`(대표 폰트 ko/en 2개 → 스크립트별 face + 메트릭 규칙, §3-3) · `docs/req-test.md:845`(한국어 리터럴, §2-2). `docs/design/design.md` 쪽은 `:82`(One family) · `:84`(Global wrapping rule) · `:117`(§4.11 Localization 전문)이 같은 커밋에서 따라간다.

---

## 7. 미확인 — 확인하지 못했거나 브라우저·실기기 실측이 필요한 것

1. **모든 px 값은 계산이다.** 브라우저를 띄우지 않았다(`.next/` 를 만들지 않기 위해). §0 의 오차원 4가지가 적용되며, 경계 근처 판정(id 동의 배너 318/330, hi acceptAll+denyAndAbandon 358/350, ja 지시 오버레이 324/350)은 실측에서 뒤집힐 수 있다.
2. **fallback face 가 실제로 어느 것으로 잡히는지.** `Noto Sans Devanagari` 가 이 기계에 없어 hi 가 Kohinoor Devanagari 로 간다고 판단했으나, 이는 이 Mac 의 설치 상태에서 유도한 것이고 실제 타깃(iOS/Android)의 매칭은 다를 수 있다. Android 는 Noto 계열이 설치돼 있어 다른 메트릭을 갖는다 — §3-3 의 1.5000em 은 **iOS/macOS 기준**이다.
3. **zs/zt 의 한자가 `Hiragino Sans`(일본어 자형)로 가는지.** `--font-sans`(`globals.css:225`)의 순서가 `Apple SD Gothic Neo` → `Hiragino Sans` → `PingFang SC` → `PingFang TC` 이므로 CSS 사양상 zs/zt 한자 중 Hiragino 가 덮는 것은 일본어 자형으로, zt 중 PingFang SC 가 덮는 것은 간체 자형으로 그려질 것으로 보인다. **예측이며 실기 렌더로 확인하지 않았다.** §2-1 의 `lang` 수정이 이 문제를 자동으로 고치는지도 브라우저 구현에 달려 있어 미확인이다.
4. **`word-break: keep-all` 이 zs/zt/ja 에서 실제 금칙 위반(줄머리 `。`/`、`)을 만드는지.** CSS Text 3 정의에서 유도한 예측이고 브라우저 구현차가 있다.
5. **axe 의 `html-lang-valid` 가 `lang="zs"`/`"zt"` 를 실제로 위반으로 잡는지.** 그 룰이 axe-core 기본 룰셋(wcag2a/wcag311)에 있고 `/zs`·`/zt` 에서 한 번도 돌지 않는다는 것까지는 확인했으나, 룰의 내부 언어 목록을 열어보지 않았다. `kr` 이 ISO 639-1 의 Kanuri 라서 통과한다는 판정도 목록 대조가 아니라 표준 지식에 근거한다.
6. **`getDefaultCardCopy()`(`landing-grid-card.tsx:1295-1307`)의 소비처**를 확인하지 않았다. 이 함수가 `en.json` 과 다른 영어 문자열 5개를 갖는다는 것(`'Est. time'` vs `"min"` 등)은 확인했으나, 프로덕션 경로인지 테스트 전용인지에 따라 "라벨 정본 2곳" 의 등급이 달라진다.
7. **`docs/req-test-plan.md`·`docs/wave-roadmap.md`·`docs/decision-register.md` 를 읽지 않았다.** §3-4 의 `:287` 개정이 등재된 BQ 결정과 충돌하는지, §2-3 의 locale 축 확장이 어느 wave 의 exclude 에 걸리는지는 착수 세션이 확인해야 한다.
8. **어떤 게이트도 실행하지 않았다.** `npm test` · `qa:rules` · `test:e2e:*` 의 이 HEAD 에서의 현재 pass/fail 은 미확인이다. 이 문서의 gates 항목은 소스 독해로 유도한 "붉어질 것" 목록이지 실행 결과가 아니다.
9. **12 locale 카드 번역이 들어왔을 때의 실제 확장률.** fixture 에 번역이 없어 카드 제목·부제 특유의 확장률은 잴 수 없다. §3-3·§3-4 의 "de 1.23× / fr 1.30×" 는 메시지 총 문자 수 비율에서 유도한 추정이다.
10. **`/test/error` 의 모바일 시각 baseline 이 없다.** theme-matrix 시나리오에 그 라우트가 없어 §2-2 의 한국어 고정 화면은 어느 뷰포트에서도 스냅샷이 없다.
