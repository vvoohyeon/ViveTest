# 시각 baseline 체계 지도 — 모바일 전면 리팩터 착수용

조사 대상: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (branch `claude/mobile-refactor-analysis`, HEAD `7616211`, 부모 `a5aec95`). 읽기 전용. 아래 모든 숫자는 이 체크아웃에서 실행한 명령의 출력이고, 인용은 전부 file:line 을 갖는다. 렌더로 확인하지 않은 것은 「미확인」으로 표시했다.

---

## 0. 한 장 요약 — 착수 전에 알아야 할 세 가지

**① 프롬프트가 준 「모바일 44장」은 틀렸다. 모바일 뷰포트 baseline 은 40장이고, 44는 desktop-wide 의 장수다.** 실측: `ls | grep -c -- '-mobile-chromium-darwin\.png$'` → 40, `ls | grep -c -- '-desktop-wide-chromium-darwin\.png$'` → 44. 매니페스트에서 재계산해도 같다(§2 표).

**② 결정 2(터치 태블릿을 입력 방식으로 통일)를 그대로 구현하면, 재배선 그 자체만으로 모바일 baseline 12장이 뒤집히고 그중 4장은 「다른 그림」이 아니라 「도달 불가」가 된다.** Playwright 컨텍스트에 터치 에뮬레이션이 하나도 없기 때문이다 — `hasTouch`·`isMobile`·`devices[]` 가 `tests/` 와 `playwright.config.ts` 전체에 0개다(실측 grep). 지금 390px baseline 은 **hover 가 가능한 마우스 컨텍스트**에서 찍혔고, `isMobileViewport` 가 폭 전용(`layout-plan.ts:63-73` → `landing-grid-card.tsx:970`)이라서 그 컨텍스트에서도 터치 생명주기가 돌았다. 판정 기준이 입력 방식으로 바뀌면 같은 컨텍스트가 「hover 가능」으로 읽혀 데스크톱 생명주기로 넘어간다. 상세 §4-2.

**③ 「모바일 분기」는 한 겹이 아니라 두 겹이고, 71개 JS 분기는 그중 한 겹만 덮는다.** JS tier(`resolveLandingViewportTier`)는 **랜딩 라우트에서만** 소비된다(`landing-catalog-grid.tsx:55` 가 유일한 소비처, `src/app/[locale]/page.tsx:33` 에서만 도달). blog·history·test 표면의 모바일 대응은 전부 Tailwind CSS 브레이크포인트(`md:` = 768px)다 — 예: 모바일 GNB 바의 `md:hidden`(`site-gnb.tsx:41`). 두 겹은 오늘 **정확히 같은 경계**를 갖기 때문에(JS `MOBILE_MAX_VIEWPORT_WIDTH = 767`, `layout-plan.ts:1` / CSS md = 768px, `globals.css` 에 브레이크포인트 재정의 없음) 서로 다른 기계라는 사실이 지금은 보이지 않는다. 결정 2 는 JS 겹만 움직이므로 두 겹이 갈라진다.

---

## 1. PNG 개체수 — 두 세는 법이 같은 수를 낸다

| 명령 | 결과 |
|:---|---:|
| `find tests/e2e -name "*.png" \| wc -l` | **170** |
| `git ls-files "tests/e2e/**/*.png" \| wc -l` | **170** |
| `git ls-files --others --exclude-standard tests/e2e \| grep '\.png$' \| wc -l` | **0** |

**두 수가 같다 — 추적되지 않은 PNG 도, 디스크에 없는 추적 PNG 도 없다.** 작업 트리는 clean 이다(`git status --short` 무출력).

디렉터리별:

| 디렉터리 | 장수 | 프로젝트 | 비교 방식 |
|:---|---:|:---|:---|
| `tests/e2e/theme-matrix-smoke.spec.ts-snapshots/` | 164 | `chromium` | `toHaveScreenshot` (locator) |
| `tests/e2e/safari-hover-ghosting.spec.ts-snapshots/` | 5 | `webkit-ghosting` | `toMatchSnapshot` (buffer) |
| `tests/e2e/state-smoke.spec.ts-snapshots/` | 1 | `chromium` | `toHaveScreenshot` (locator) |

**프롬프트의 「164 + safari 5」는 `state-smoke` 1장을 빠뜨린 것이다** — `expanded-focus-shell-chromium-darwin.png`. 이 한 장은 `docs/` 의 어떤 목록에도 세 번째 항목으로 등장하지 않고, §6 의 exact-set 가드 두 개 중 어느 쪽도 이 디렉터리를 보지 않는다(가드는 theme-matrix 와 safari 디렉터리만 검사한다 — `check-phase11-telemetry-contracts.mjs:353-388`). 이 저장소에서 **가드 없이 떠 있는 유일한 baseline** 이다.

### 1-1. 결함 — `.gitignore` 가 아직 이 170장을 무시하도록 적혀 있다

`.gitignore:9` 는 `tests/e2e/*-snapshots/` 다. 170장이 살아 있는 이유는 **이미 추적 중인 파일에는 gitignore 가 적용되지 않기** 때문일 뿐이다. 실측:

```
git check-ignore -v --no-index tests/e2e/theme-matrix-smoke.spec.ts-snapshots/theme-state-mobile-bottomsheet-open-en-light-mobile-chromium-darwin.png
→ .gitignore:9:tests/e2e/*-snapshots/   (매칭됨)
```

**결과: IA 재설계가 새 케이스 id 를 만들면, 재생성된 그 PNG 는 `git status` 에 나타나지 않고 조용히 커밋에서 빠진다.** 로컬에서는 초록이고, 다른 체크아웃에서는 `local-snapshot.ts:35-39` 의 「baseline 이 없다」로 붉다. 이번 리팩터는 정의상 새 케이스 id 를 만드는 작업이므로, **`.gitignore:9` 를 `!` 예외로 여는 것이 0단계 이전에 처리할 항목이다.**

### 1-2. 같은 드리프트가 문서·가드 세 곳에 굳어 있다

BQ-07 종결(2026-09-11)이 PNG 를 추적으로 바꿨는데, 그 전 사실을 주장하는 문장이 셋 남아 있다.

| 위치 | 현재 문장 | 상태 |
|:---|:---|:---|
| `tests/unit/contract-citations.test.ts:80` | `'Playwright 로컬 baseline·비추적(.gitignore)'` | **거짓** — vitest 가 집행하는 주석이 틀린 사실을 고정하고 있다 |
| `AGENTS.md:163` | `Playwright baseline = 로컬 PNG(tests/e2e/*-snapshots/)` | 「로컬」이 비추적을 함의 — 오도 |
| `tests/e2e/theme-matrix-baseline-provenance.md:4-5` | `The PNG baselines themselves remain local-only` | 문서 머리말이 2026-05-07 판 그대로 |

`local-snapshot.ts:17` 의 `` `tests/e2e/*-snapshots/` 는 `.gitignore` 대상이라 `` 도 같은 계열이지만, 이쪽은 **여전히 참이다**(§1-1) — 고칠 대상은 이 주석이 아니라 `.gitignore` 쪽이다.

---

## 2. 매니페스트 구조 — 네 축의 데카르트 곱

정본은 `tests/e2e/theme-matrix-manifest.json` (192줄). 조합기는 `theme-matrix-smoke.spec.ts:72-102`(`buildThemeMatrixCases`)이고, 파일명 규칙은 같은 파일 `:94`:

```
theme-{suite}-{caseId}-{locale}-{theme}-{viewportKey}-chromium-darwin.png
```

### 축 ① locale — 2개 (`manifest:2`)

`en`, `kr`. **저장소가 지원하는 locale 은 12개인데(`AGENTS.md:24`) 매트릭스는 2개만 고정한다.** `qa:rules` 가 이 2개를 하드코딩으로 강제한다(`check-phase11-telemetry-contracts.mjs:214-216`: `JSON.stringify(manifest.locales) !== JSON.stringify(['en','kr'])` → fail). 나머지 10개 locale 의 시각 회귀는 이 체계가 판정하지 않는다 — 프롬프트가 실측한 「12 locale × 390px 가로 오버플로 0」은 **baseline 이 아니라 일회성 프로브**였다.

### 축 ② theme — 2개 (`manifest:3`)

`light`, `dark`. 역시 `qa:rules` 가 하드코딩 강제(`:218-220`).

### 축 ③ viewport — 6개 (`manifest:4-11`)

| key | W×H | `tier` | `boundary` | `stateCanonical` | JS tier 실제값 |
|:---|:---|:---|:---:|:---:|:---|
| `desktop-wide` | 1440×980 | desktop | true | **true** | desktop |
| `desktop-medium` | 1180×980 | desktop | true | false | desktop |
| `desktop-narrow` | 1024×980 | desktop | true | false | desktop (경계 +1) |
| `tablet-wide` | 1023×980 | tablet | true | **true** | tablet (경계 정확히) |
| `tablet-narrow` | 900×980 | tablet | true | false | tablet |
| `mobile` | 390×844 | mobile | true | **true** | mobile |

「JS tier 실제값」은 `resolveLandingViewportTier`(`layout-plan.ts:63-73`)에 각 폭을 넣은 결과이며 매니페스트의 `tier` 라벨과 전부 일치한다. **`desktop-narrow` 1024 와 `tablet-wide` 1023 은 `TABLET_MAX_VIEWPORT_WIDTH = 1023`(`layout-plan.ts:2`) 를 1px 간격으로 끼고 있는 의도된 경계 쌍이다** — 결정 2 가 재정의하려는 바로 그 상수다.

`stateCanonical: true` 인 셋(`desktop-wide`·`tablet-wide`·`mobile`)이 `@gate` 부분집합을 정의한다(`theme-matrix-smoke.spec.ts:111-113`).

### 축 ④ case — 17개 (layout 4 + state 13)

케이스마다 `routeTemplate` · `settleRecipe` · 자신의 `viewportKeys` 를 갖는다. 곱은 케이스별 `viewportKeys` 로 제한되므로 **완전 데카르트 곱이 아니다**(4×2×2×6 + 13×2×2×6 = 408 이 아니라 164).

**`closure` 블록(`manifest:12-33`)은 케이스 목록의 자기참조 사본이다.** `qa:rules` 가 `closure.layoutCaseViewportKeys` · `closure.stateCaseViewportKeys` 의 모든 키가 실제 케이스로 존재하는지 검사한다(`check-phase11-telemetry-contracts.mjs:247-257`). **케이스를 추가·삭제·개명하면 매니페스트 안에서 두 곳을 같이 고쳐야 하고, 한쪽만 고치면 `qa:rules` 가 붉어진다.**

### 축 곱셈 검증 — 164가 나오는 경로

매니페스트에서 재계산한 결과(스크래치패드 `count.mjs`, 스펙 `:72-102` 와 동일 알고리즘):

```
smoke cases: 164  unique png: 164
gate  cases: 116  unique png: 116
theme-matrix 가 실행하는 playwright 테스트 총수: 280
gate 가 한 번도 비교하지 않는 png: 48
```

**중요: `@smoke` 블록(`:352-370`)과 `@gate` 블록(`:372-390`)은 같은 PNG 파일명을 공유한다.** 그래서 테스트 280개가 PNG 164장을 본다 — 116장은 두 번, 48장은 한 번. provenance:109 의 `280 passed` 와 `122 passed`(=gate 116 + safari 6)가 정확히 이 수다.

뷰포트별 분포(실측 파일 개수 = 매니페스트 계산값):

| viewport | smoke png | gate png | gate 미포함 |
|:---|---:|---:|---:|
| `desktop-wide` | 44 | 44 | 0 |
| `tablet-wide` | 32 | 32 | 0 |
| **`mobile`** | **40** | **40** | **0** |
| `desktop-medium` | 16 | 0 | 16 |
| `desktop-narrow` | 16 | 0 | 16 |
| `tablet-narrow` | 16 | 0 | 16 |
| 합 | **164** | **116** | **48** |

**모바일은 40장 전부가 `@gate` 안에 있다** — `mobile` 이 `stateCanonical: true` 이기 때문이다. 즉 이번 리팩터가 모바일을 건드리는 순간 `npm run test:e2e:gate` 가 즉시 붉어진다. 반대로 `desktop-medium`·`desktop-narrow`·`tablet-narrow` 48장은 `test:e2e:gate` 로는 영원히 검사되지 않고, `test:e2e:smoke` 또는 `test:e2e` 로만 걸린다.

---

## 3. 모바일 baseline 40장 — 케이스 이름 전부와 그것이 고정하는 상태

`mobile` 뷰포트(390×844)에서 찍힌 전부. 케이스 10개 × locale 2 × theme 2 = 40.

### layout suite — 16장 (케이스 4개)

| case id | route | settleRecipe | png | 캡처 높이 (en / kr) |
|:---|:---|:---|---:|:---|
| `landing-normal` | `/{locale}` | `landing-normal` (무동작) | 4 | 2958 / 2856 |
| `blog-default` | `/{locale}/blog` | `landing-normal` (무동작) | 4 | 844 / 844 |
| `history-default` | `/{locale}/history` | `landing-normal` (무동작) | 4 | 844 / 844 |
| `test-instruction` | `/{locale}/test/qmbti` | `test-instruction` (무동작) | 4 | 844 / 844 |

### state suite — 24장 (케이스 6개)

| case id | route | settleRecipe | 무엇을 고정하는가 (스펙 근거) | png | 높이 (en / kr) |
|:---|:---|:---|:---|---:|:---|
| `mobile-landing-test-expanded` | `/{locale}` | `mobile-landing-test-expanded` | 카드 트리거를 **JS `element.click()`** 으로 눌러 `data-mobile-phase="OPEN"` + `[data-slot="expandedBody"]` 가시까지 정착 (`:291-304`) | 4 | 2988 / 2859 |
| `mobile-landing-menu-open` | `/{locale}` | `mobile-menu-open` | `gnb-mobile-menu-trigger` JS 클릭 → `gnb-mobile-menu-panel` 가시 (`:306-314`) | 4 | 2958 / 2856 |
| `mobile-blog-menu-open` | `/{locale}/blog` | `mobile-menu-open` | 같음 | 4 | 844 / 844 |
| `mobile-history-menu-open` | `/{locale}/history` | `mobile-menu-open` | 같음 | 4 | 844 / 844 |
| `mobile-test-question` | `/{locale}/test/qmbti` | `test-question` | 안내 오버레이 → 시작 → Q1 패널 가시 · 이전 버튼 숨김 (`:246-254`) | 4 | 844 / 844 |
| `mobile-test-result` | `/{locale}/test/qmbti` | `test-result` | 12문항을 A/B 교대로 답하고 제출 → 결과 패널 (`:274-289`) | 4 | 844 / 844 |

### 이 40장에서 읽히는 사실 넷

**(1) 랜딩만 길다.** 랜딩 3종(`landing-normal` · `mobile-landing-menu-open` · `mobile-landing-test-expanded`)만 2856~2988px 이고 **나머지 7종은 전부 정확히 390×844 = 뷰포트 한 장**이다. blog·history·test-instruction·test-question·test-result 는 390px 에서 스크롤이 없다. 프롬프트의 「랜딩 3.76 화면」은 랜딩 단독의 성질이다.

**(2) 메뉴 열림 상태가 페이지 전체와 한 덩어리로 묶여 있다.** `mobile-landing-menu-open` 은 390×2958 이다 — 메뉴 패널은 그 이미지의 상단 일부일 뿐이고, 나머지 2100px 넘는 랜딩 그리드가 같은 PNG 안에 들어 있다. **랜딩 그리드가 1px 이라도 바뀌면 메뉴 baseline 도 함께 붉어진다.** 메뉴 자체의 회귀와 랜딩의 회귀를 이 baseline 은 구별하지 못한다.

**(3) kr 이 en 보다 항상 짧다** (2856 vs 2958, 2859 vs 2988). 한국어 본문이 더 적은 줄을 쓴다는 뜻이고, i18n 압력 판정의 출발점은 이 두 수다. **나머지 10개 locale 은 이 체계에 없다**(§2 축①).

**(4) 40장 전부 텔레메트리 동의가 `OPTED_IN` 으로 미리 심어진 상태에서 찍혔다** — `openThemedPage` 가 `seedTelemetryConsent(page,'OPTED_IN')` 를 항상 호출한다(`theme-matrix-smoke.spec.ts:171`, 헬퍼 `helpers/consent.ts:5-12`). `PageShell` 은 동의 배너를 `showDefaultConsentBanner` 로 렌더하는데(`page-shell.tsx:25`) 동의가 심어져 있으면 배너가 서지 않는다. **결과: 164장 중 어느 것도 기본(미동의) 상태의 동의 배너를 고정하지 않는다.** 모바일에서 배너는 화면 아래를 먹는 가장 큰 단일 요소가 될 수 있는데 시각 회귀망에 전혀 없다. 프롬프트가 실측한 랜딩 스크롤 3,173px 과 이 baseline 의 2,958px 사이 215px 차이도 여기서 올 가능성이 있다 — **미확인, 렌더 비교 필요**(§8).

---

## 4. 무효화 분석 — IA 재설계 vs 뷰포트 분기 재배선

두 질문을 분리해서 센다. 분리의 근거는 **JS tier 의 소비처가 단 하나**라는 실측이다.

### 4-1. 결정적 사실 — JS tier 는 랜딩 라우트에서만 소비된다

`resolveLandingViewportTier` 의 전체 호출처는 `landing-catalog-grid.tsx:55` 하나뿐이고(실측 grep, `layout-plan.ts` 자체 제외), 그 컴포넌트에 도달하는 경로는 `src/app/[locale]/page.tsx:33` 의 `<LandingCatalogGridLoader>` 하나뿐이다. `isMobileViewport` 는 거기서 `viewportTier === 'mobile'` 로 파생된다(`landing-grid-card.tsx:970`, `use-landing-interaction-controller.ts:157`). **blog·history·test 라우트는 JS tier 를 한 번도 읽지 않는다.**

따라서 **프롬프트의 「isMobileViewport 계열 분기 71개」는 전부 랜딩 라우트 안에 있고, 재배선이 픽셀을 바꿀 수 있는 범위도 랜딩 라우트로 닫힌다.**

| 라우트 | JS tier 소비 | png |
|:---|:---:|---:|
| `/{locale}` (랜딩) | **예** | **52** |
| `/{locale}/blog` | 아니오 (CSS만) | 32 |
| `/{locale}/history` | 아니오 (CSS만) | 32 |
| `/{locale}/test/qmbti` | 아니오 (CSS만) | 48 |
| 합 | — | 164 |

랜딩 52장 내역: `landing-normal` 24 + `landing-test-expanded` 8 + `landing-blog-expanded` 8 + `landing-settings-open` 4 + `mobile-landing-test-expanded` 4 + `mobile-landing-menu-open` 4.

### 4-2. 「뷰포트 분기만 재배선」했을 때 — 12장이 뒤집히고 4장은 도달 불가가 된다

결정 2 는 `isMobileViewport` 의 입력을 「폭」에서 「입력 방식」으로 바꾼다. Playwright chromium 컨텍스트는 **hover 가능·터치 없음**이다(`hasTouch`/`isMobile`/`devices[]` 0개, 실측). 그래서 같은 테스트 컨텍스트에서:

| 폭 | 오늘 (폭 기준) | 재배선 후 (입력 방식 기준) | 결과 |
|:---|:---|:---|:---|
| 390px | tier=mobile → `isMobileViewport=true` → **터치 생명주기** | hover 가능 → `isMobileViewport=false` → **데스크톱 생명주기** | **뒤집힘** |
| 900 / 1023px | tier=tablet → hover 경로 | hover 가능 → hover 경로 | 불변 |
| 1024~1440px | tier=desktop → hover 경로 | hover 가능 → hover 경로 | 불변 |

**재배선만으로 뒤집히는 12장** (랜딩 라우트 × `mobile` 뷰포트):

| case id | png | 뒤집힘의 종류 |
|:---|---:|:---|
| `mobile-landing-test-expanded` | 4 | **도달 불가.** 스펙이 `data-mobile-phase="OPEN"` 을 기다리는데(`:301`) 데스크톱 생명주기에는 그 위상이 없다 → 단언에서 영원히 멈춘다 |
| `landing-normal` (mobile) | 4 | 픽셀 변화 — **정착 상태에서 실제로 다른지는 미확인**(§8). 제어흐름 의존은 확인됨: `isMobileViewport` 가 `:1073` 으로 카드에 주입되고 카드 안에서 31회 분기 |
| `mobile-landing-menu-open` (mobile) | 4 | 메뉴 패널 자체는 CSS `md:hidden` 소관이라 불변이지만, 같은 PNG 가 2958px 랜딩 그리드 전체를 담으므로 위 `landing-normal` 변화를 그대로 상속(§3-(2)) |

`mobile-landing-test-expanded` 의 고장 양상은 **이 저장소에 이미 전례가 있다.** `mobile-landing-blog-expanded` 가 정확히 같은 이유(제품이 가질 수 없는 상태를 단언)로 첫 단언에서 멈췄고, 2026-09-11 에 매니페스트에서 제거되며 168 → 164 가 됐다(`theme-matrix-baseline-provenance.md:122`). **재배선을 baseline 대비 없이 하면 같은 함정을 같은 자리에 다시 판다.**

**재배선에 살아남는 152장:**

| 구간 | png | 살아남는 이유 |
|:---|---:|:---|
| 랜딩 · tablet 2종 | 16 | 테스트 컨텍스트가 hover 가능 → 재배선 후에도 hover 경로 |
| 랜딩 · desktop 3종 | 24 | 동일 |
| blog · history · test 전부 | 112 | JS tier 를 읽지 않음 (§4-1) |
| safari ghosting | 5 | 전부 1440×980 데스크톱 hover 시나리오 (`safari-hover-ghosting.spec.ts:31`) |
| state-smoke | 1 | 데스크톱 확장 카드 포커스 셸 |
| 합 | **152** | |

### 4-3. 「살아남는다」와 「여전히 유효하다」는 다르다 — 태블릿 48장의 함정

랜딩 tablet 16장 + blog/history/test tablet 32장 = **48장이 재배선 후에도 초록으로 통과하지만, 그것은 결정 2 가 만들려는 경로를 한 번도 지나가지 않는다.** 테스트 컨텍스트에 터치가 없으므로 「hover 없는 900~1023px 기기」라는 새 경로는 **baseline 0장**으로 출발한다. 초록은 「회귀 없음」이 아니라 「비교한 적 없음」이고, 이 저장소는 그 구별을 잃는 것을 명시적으로 금지한다(`local-snapshot.ts:8-11`: 「되살리는 순간 그 스펙의 초록은 「결함 없음」과 「비교한 적 없음」을 구별하지 못한다」).

**구조적 처방(0단계 이전):** `playwright.config.ts` 의 `projects` 에 `hasTouch: true`(필요하면 `isMobile: true`)를 쓰는 프로젝트 또는 매니페스트에 입력방식 축을 추가하고, `mobile` · `tablet-*` 케이스를 그쪽으로 옮긴다. 이것을 하지 않으면 결정 2 는 **검증 불가능한 변경**이 된다.

### 4-4. IA 재설계로 무효화되는 장수 — 두 가지 「무효」를 구별해야 한다

재설계는 픽셀과 케이스 정체성을 다른 비용으로 무효화한다.

**(A) 픽셀 무효 — `--update` 재승인으로 회복 가능.** 결정 3(전 표면 동시) + 공유 셸(`page-shell.tsx`)·GNB·카드가 전부 범위에 있으므로, 실질적으로 **170장 전부**가 픽셀 무효가 된다. 비용은 재생성 1회 + 승인 1회다.

**(B) 케이스 정체성 무효 — 매니페스트·`closure`·가드·문서를 손으로 고쳐야 하고, 전부 Ask-First 경로다.** 상태 자체가 제품에서 사라지면 `--update` 로는 회복되지 않는다.

| case id | png | 결정 5 하에서의 위험 | 정체성이 죽으면 같이 고쳐야 하는 곳 |
|:---|---:|:---|:---|
| `mobile-landing-test-expanded` | 4 | **높음** — 인그리드 확장이 바텀시트/전용 상세 화면으로 바뀌면 소멸 | `manifest` 케이스 + `closure:27` + `SettleRecipe` 유니온(`spec:17-26`) + `allowedSettleRecipes`(`check-phase11:103-`) |
| `mobile-landing-menu-open` | 4 | **높음** — GNB 메뉴가 바텀시트로 바뀌면 케이스명·recipe 재정의 | 위와 같음 + `closure:28` |
| `mobile-blog-menu-open` | 4 | 높음 | `closure:29` |
| `mobile-history-menu-open` | 4 | 높음 | `closure:30` |
| `landing-test-expanded` | 8 | **중** — hover 확장을 유지할지가 서명 인터랙션 3분류(결정 7)의 대상 | `closure:20` |
| `landing-blog-expanded` | 8 | **중** — 동일 | `closure:21` |
| `mobile-test-question` / `mobile-test-result` | 8 | **중** — 스텝 분할을 도입하면 한 장이 여러 장으로 분해 | `closure:31-32` |
| 소계 (정체성 위험) | **40** | | |
| 나머지 (정체성 존속, 픽셀만 재승인) | **130** | layout 4종 96 + settings-open 3종 12 + test-question/result 데스크톱·태블릿 16 + safari 5 + state-smoke 1 | |

**요약 숫자 (요청된 두 수):**

- **IA 재설계로 무효화 = 170장 (픽셀) 중 정체성까지 무효화되는 것이 40장.** 40장이 계약·가드 편집 비용을 발생시키는 수다.
- **뷰포트 분기만 재배선해도 살아남는 장수 = 152장.** 단, 그중 48장(태블릿)은 「통과하지만 새 경로를 검사하지 않는」 상태가 되므로 실질 커버리지는 104장이다(§4-3).
- 재배선만으로 뒤집히는 = **12장**, 그중 **4장은 도달 불가**.

---

## 5. 재생성 명령과 승인 요건 — 정확한 인용

### 5-1. 명령

**theme-matrix 164장** (`package.json:22`):

```bash
npm run qa:visual:full
```

전개하면 `PLAYWRIGHT_SERVER_MODE=preview playwright test tests/e2e/theme-matrix-smoke.spec.ts --update-snapshots` 이다.

**safari ghosting 5장 — `npm run` 경로가 없다.** `qa:visual:full` 은 `theme-matrix-smoke.spec.ts` 만 인자로 받으므로 safari 를 건드리지 않는다. provenance:108 이 기록한 실제 명령은:

```bash
PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/safari-hover-ghosting.spec.ts --update-snapshots
```

**state-smoke 1장 — 역시 `npm run` 경로가 없다.** provenance:92-93 의 명령:

```bash
PLAYWRIGHT_SERVER_MODE=preview npx playwright test --project=chromium --workers=1 -g "expanded keyboard focus boundary" --update-snapshots
```

**즉 「baseline 재생성」은 한 명령이 아니라 셋이고, 그중 둘은 저장소 스크립트에 이름이 없다.** 이번 리팩터가 셋을 다 건드리므로, 세 명령을 하나의 승인 단위로 묶는 것이 맞다.

### 5-2. 승인 요건 — 원문 그대로

`AGENTS.md:133-134`:

> ### Hard stops (repo-specific)
> - theme-matrix/golden baseline `--update`(`qa:visual:full`)는 사람 승인 없이 실행하지 않는다.

`AGENTS.md:65`:

> - **Test isolation:** 테스트는 라이브 상태·생성 파일·Playwright baseline을 오염시키지 않는다. baseline 재생성은 승인된 명시 단계(`qa:visual:full` / `--update`)로만.

`AGENTS.md:241`:

> - **시각 baseline diff는 회귀로 간주한다** — `tests/e2e/theme-matrix-baseline-provenance.md`에서 provenance가 확인되기 전까지. 스냅샷 차이를 "의도된 변경"으로 임의 해석하지 않는다.

`AGENTS.md:158` (명령표):

> `npm run qa:visual:full   # theme-matrix baseline 재생성(승인 필요)`

**해석 — 세 조항이 함께 만드는 절차:** ⑴ `--update` 는 승인 없이 실행 금지(`:134`, `:65`), ⑵ diff 는 provenance 에 등재되기 전까지 회귀로 간주(`:241`), ⑶ 따라서 재생성 후에는 provenance 에 항목을 추가해야 diff 가 「승인된 변경」이 된다. 선례 형식은 provenance:100-110 (BQ-07 종결 항목)이고, **날짜·커밋 SHA·OS·Node·Playwright 버전·명령·결과·승인 사실**을 모두 적는다. `AGENTS.md` §4 는 `scripts/qa/*.mjs` 와 `tests/e2e/theme-matrix-manifest.json` 도 Ask-First 로 지정하므로(`AGENTS.md:106`, `:113`), **매니페스트를 고치는 것과 baseline 을 재생성하는 것은 각각 별도의 승인이다.**

---

## 6. 가드 지도 — baseline 을 지키는 네 겹

| # | 가드 | 위치 | 무엇을 막는가 | 어느 게이트에서 도는가 |
|:--|:---|:---|:---|:---|
| 1 | `assertBaselineExists` | `tests/e2e/helpers/local-snapshot.ts:20-40` | 없는 baseline 을 **쓰기 전에** 멈춘다. Playwright 기본값 `'missing'` 의 「없으면 써 놓고 다음 실행에 통과」를 봉쇄 | 모든 E2E 실행 |
| 2 | theme-matrix exact-set | `scripts/qa/check-phase11-telemetry-contracts.mjs:353-364` | 매니페스트가 낳는 164개 파일명과 디스크 PNG 가 **양방향 정확히 일치**해야 한다 — 누락도 잉여도 fail (`:67-86`) | `qa:rules` (기본 게이트 **밖**) |
| 3 | safari exact-set | 같은 파일 `:367-388` | 5개 stem 이 **스크립트에 하드코딩**(`:10-16`) — 케이스 개명 시 이 스크립트를 고쳐야 한다 | `qa:rules` |
| 4 | 매니페스트 형태 가드 | 같은 파일 `:197-351` | locale=`['en','kr']` · theme=`['light','dark']` · 6개 뷰포트 키 존재 · `closure` 키가 실제 케이스와 일치 · test 라우트가 `PRIMARY_AVAILABLE_TEST_VARIANT`(`landing-fixture.ts:15` = `qmbti`)와 일치 | `qa:rules` |

**두 가지 경고.**

**(a) 가드 2·3·4 는 Default Done gate 에 없다.** `AGENTS.md:162`: 「`qa:rules`는 Default Done gate에서 **제외**(release-level)」. 즉 `lint → typecheck → test → build` 만 돌리면 매니페스트와 PNG 가 어긋나도 초록이다. 리팩터 중에는 **`npm run qa:rules` 를 매 단위마다 별도로 돌려야** 한다.

**(b) 파일명 접미사가 `darwin` 으로 하드코딩돼 있다.** `check-phase11-telemetry-contracts.mjs:8-9`:

```js
const THEME_MATRIX_SNAPSHOT_SUFFIX = '-chromium-darwin.png';
const SAFARI_GHOSTING_SNAPSHOT_SUFFIX = '-webkit-ghosting-darwin.png';
```

이 체계는 **macOS 전용으로 잠겨 있다.** Linux CI 에서 Playwright 는 `-chromium-linux.png` 를 찾으므로 가드 1 과 가드 2 가 동시에 붉는다. 지금 CI 가 E2E 를 돌리지 않으니 드러나지 않을 뿐이다 — **미확인: CI 워크플로 파일은 이번 과제 범위 밖이라 읽지 않았다**(§8).

---

## 7. 0단계(행동 무변경) 증거로서의 baseline — 쓸 수 있다, 조건 셋을 지키면

### 7-1. 결론

**쓸 수 있고, 이 저장소에서 가장 강한 증거다.** 근거는 세 가지 실측이다.

**① `updateSnapshots` 기본값이 `'missing'` 이고 설정에서 재정의하지 않는다.** `playwright.config.ts` 61줄 전체에 `updateSnapshots`·`snapshotPathTemplate`·`ignoreSnapshots` 키가 없다(실측 grep, 무출력). Playwright 1.57.0(실측: `node_modules/@playwright/test/package.json`) 기본값은 `'missing'` 이며, `local-snapshot.ts:23-24` 가 그 기본값을 명시적으로 적어 두고 있다.

**② 기본값의 위험을 가드 1 이 먼저 막는다.** `'missing'` 모드는 원래 「없는 baseline 을 디스크에 쓰고 그 실행만 실패」시키므로 **두 번째 실행이 자기 이미지와 비교해 거짓 초록**이 된다(`local-snapshot.ts:13-18`, 2026-09-07 에 108장이 그렇게 생겼다는 기록). `assertBaselineExists` 는 `'all'`/`'changed'` 일 때만 비켜서므로(`:25-27`), 기본 실행에서는 **없는 baseline 이 영구히 붉다**. 0단계 증거로 쓰기에 정확히 맞는 성질이다.

**③ 비교 허용오차가 0 이 아니다 — 이것이 유일한 약점이다.** `playwright.config.ts:16-22`:

```ts
expect: {
  timeout: 5_000,
  toHaveScreenshot: {
    threshold: 0.01,
    maxDiffPixels: 20
  }
}
```

**PNG 한 장당 최대 20픽셀까지는 다르더라도 통과한다.** 390×2958 = 1,153,620픽셀 이미지에서 20픽셀은 0.0017% 이므로 실무상 매우 촘촘하지만, **「값이 하나도 안 바뀌었다」의 문자 그대로의 증명은 아니다.** 엄밀한 무변경 증명이 필요하면 baseline 비교와 별도로 PNG 바이트 해시를 비교해야 한다(§7-3).

### 7-2. 정확한 명령 — 0단계 증거는 이 한 줄이다

```bash
npm run test:e2e:smoke
```

**이것이 170장 전부를 비교하는 유일한 단일 명령이다.** 근거:

- `package.json:18` → `PLAYWRIGHT_SERVER_MODE=preview playwright test --grep @smoke`
- theme-matrix 의 `@smoke` 블록(164) + `@gate @smoke` 블록(116)이 모두 `@smoke` 를 달고 있다(`spec:354`, `:374`) → 164장 전부 비교
- safari 6개 테스트가 전부 `@smoke @gate`(실측 `grep -c "@smoke @gate"` → 6) → 5장 비교 (6번째 테스트 `:328` 은 스냅샷을 찍지 않는다)
- state-smoke 의 `expanded-focus-shell` 이 `@smoke`(`state-smoke.spec.ts:989`) → 1장 비교
- 스냅샷을 찍는 스펙은 이 셋뿐이다(실측 `grep -rln "toHaveScreenshot\|toMatchSnapshot\|MatchLocalSnapshot" tests/e2e/*.spec.ts`)

**`npm run test:e2e` 를 쓰면 안 된다.** `package.json:17` 은 환경변수 없는 `playwright test` 이고, `playwright.config.ts:6` 의 `serverMode` 기본값이 `'dev'` 이므로 `:55` 가 `npm run dev` 를 띄운다. **baseline 은 전부 preview 모드(프로덕션 빌드)에서 찍혔다** — `qa:visual:full` 이 `PLAYWRIGHT_SERVER_MODE=preview` 를 강제하기 때문이다(`package.json:22`). dev 서버와 preview 서버는 같은 픽셀을 보장하지 않으므로, `npm run test:e2e` 의 diff 는 리팩터가 아니라 서버 모드 차이일 수 있다.

**`npm run test:e2e:gate` 로는 부족하다** — 116장만 보므로 `desktop-medium`·`desktop-narrow`·`tablet-narrow` 48장이 검사되지 않는다(§2).

### 7-3. 0단계 증거 절차 — 이대로 실행한다

```bash
cd /Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis

# 0. 구조 분리 착수 전: PNG 170장의 바이트 지문을 고정한다 (허용오차 20px 를 우회하는 엄밀 증거)
find tests/e2e -name '*.png' | sort | xargs shasum -a 256 > /tmp/baseline-before.sha256
wc -l < /tmp/baseline-before.sha256   # 170 이어야 한다

# 1. 구조 분리 수행 (행동 무변경)

# 2. 시각 무변경 증명 — 170장 전부, baseline 이 찍힌 것과 같은 preview 모드
npm run test:e2e:smoke

# 3. 계약 무변경 증명 — 매니페스트 ↔ PNG exact-set 가드는 기본 게이트 밖이라 따로 돈다
npm run qa:rules

# 4. PNG 가 단 한 바이트도 바뀌지 않았음을 증명 (2번이 20px 허용오차로 통과시킨 것까지 잡는다)
shasum -a 256 -c /tmp/baseline-before.sha256 | grep -v ': OK$' || echo '170장 전부 바이트 동일'

# 5. 기본 게이트
npm run lint && npm run typecheck && npm test && npm run build
```

**4번이 핵심이다.** 2번이 초록이어도 PNG 파일 자체는 바뀌지 않는다(비교만 하므로). 4번은 「비교가 통과했다」가 아니라 **「baseline 파일이 손대지지 않았다」**를 증명한다 — 0단계에서 누군가 실수로 `--update` 를 섞어 넣었는지까지 잡는 유일한 검사다.

**0단계에서 `--update` 계열 명령을 한 번도 실행하지 않는 것이 규율이다.** 0단계의 정의(행동 무변경)가 참이면 재생성할 것이 없고, 재생성이 필요하다면 그것은 0단계가 아니다.

### 7-4. 0단계 전에 처리해야 할 선결 항목 둘

| # | 항목 | 이유 | 근거 |
|:--|:---|:---|:---|
| 1 | `.gitignore:9` 를 예외 처리 | 리팩터가 새 케이스 id 를 만드는 순간 그 PNG 가 조용히 커밋에서 빠진다 — 로컬 초록, 타 체크아웃 붉음 | §1-1 |
| 2 | Playwright 에 터치 컨텍스트 추가 | 결정 2 가 만드는 「hover 없는 기기」 경로에 baseline 이 0장이면 그 결정은 검증 불가능한 변경이 된다 | §4-3 |

둘 다 `AGENTS.md:113` 의 Ask-First 경로(`scripts/qa/*.mjs` · `tests/e2e/theme-matrix-manifest.json`)와 `playwright.config.ts` 를 건드리므로 **0단계 계획서에 승인 항목으로 명시**해야 한다.

---

## 8. 미확인 — 확인하지 못한 것과 그 이유

| # | 미확인 사항 | 왜 확인하지 못했나 | 확인 방법 |
|:--|:---|:---|:---|
| 1 | **재배선 후 `landing-normal` (mobile) 4장이 실제로 픽셀이 달라지는가** | 제어흐름 의존(`isMobileViewport` → `landing-grid-card.tsx:1073` → 31개 분기)은 읽어서 확인했지만, **정착된 `normal` 상태의 렌더 결과가 두 생명주기에서 같은지는 렌더 없이 판정 불가**. 이 과제는 읽기 전용이고 서버를 띄우지 않았다 | 390px 에서 `isMobileViewport` 를 강제로 false 로 둔 빌드를 preview 로 띄우고 해당 4장과 비교 |
| 2 | **랜딩 스크롤 3,173px(프롬프트 실측) vs baseline 2,958px 의 215px 차이** | 동의 배너(§3-(4))가 가장 유력하지만 **추정이다.** `.page-shell` 요소 높이와 `document.scrollHeight` 의 차이일 수도 있다 | 동의를 심은 경우와 안 심은 경우를 390px 에서 각각 측정 |
| 3 | **CI 가 E2E 를 실행하는가 — `darwin` 하드코딩(§6-b)이 실제로 터지는가** | CI 워크플로 파일은 이번 과제의 읽기 대상에 없었다 | `.github/workflows/**` 확인 |
| 4 | **`mobile-*-menu-open` 12장이 재배선에 정말 불변인가** | 모바일 GNB 바가 `md:hidden`(`site-gnb.tsx:41`) 이라는 CSS 게이트인 것은 확인했으나, `useGnbCapability` 가 `hoverCapable` 을 함께 반환하고(`use-gnb-capability.ts:48-49`) 그 소비처(`site-gnb.tsx:136-137`)가 무엇을 결정하는지는 끝까지 읽지 않았다 | `site-gnb.tsx:122-140` 및 그 하위 소비처 추적 |
| 5 | **`qa:rules` 13개 검사의 현재 pass/fail** | 실행하지 않았다(읽기 전용 과제, `AGENTS.md:162` 는 실행으로 확인하라고 지시). 프로젝트 메모리는 「exit 0 이다」라고 기록하지만 **이 HEAD 에서 확인한 것이 아니다** | `npm run qa:rules` |
| 6 | **`threshold: 0.01` 의 의미** | Playwright 의 `threshold` 는 YIQ 색공간 픽셀당 허용 편차(0–1)이고 `maxDiffPixels` 와 AND 가 아니라 **각각의 조건**으로 동작한다고 알고 있으나, 1.57.0 문서를 이 세션에서 읽어 확인하지 않았다 | Playwright 1.57 문서 확인 |
| 7 | **12개 locale 중 en/kr 외 10개의 시각 상태** | 매트릭스에 없고(§2 축①) 이번 과제 범위 밖 | 별도 프로브 필요 — baseline 화는 장수를 6배로 늘리므로 설계 결정 사항 |
