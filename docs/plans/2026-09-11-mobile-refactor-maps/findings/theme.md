# 렌즈: theme — 테마 전환 · 다크모드 · 부트스트랩

분석 대상 clone: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (HEAD `7616211` = `a5aec95` + 착수 마커). 저장소 무변경 확인 — `git status --porcelain` 빈 출력.

## 0. 측정 방법과 그 결과의 지위

이 렌즈의 판정은 대부분 **실측**이다. clone 에 이미 존재하던 프로덕션 빌드(`.next/BUILD_ID` = `u8k0FudrXYgP2GoSgWaZ`, 2026-09-11 20:58)를 `next start -p 3987` 로 띄우고, 저장소의 `node_modules/@playwright/test` 로 390×844 컨텍스트를 열어 서버가 실제로 내보낸 HTML·컴파일된 CSS·렌더된 computed style·프레임 타이밍을 직접 읽었다. 프로브 스크립트와 산출물은 `/private/tmp/claude-501/-Users-woohyeon-Local-ViveTest/91a75431-b18f-466b-8d47-1b306568872a/scratchpad/analysis/probe/` 에 남아 있다(`fouc3.mjs` · `live-contrast.mjs` · `elev.mjs` · `edges.mjs` · `chip.mjs` · `sysreact.mjs` · `transition.mjs` · `race.mjs` · `perf.mjs` · `contrast.mjs`). 측정이 끝난 뒤 서버 프로세스(PID 88843 과 자식 88861)를 PID 로 개별 종료했고 포트 3987 이 비었음을 확인했다.

**대비비는 토큰 값 계산과 렌더 실측을 둘 다 했고, 둘이 갈리는 자리가 이 렌즈의 가장 값진 발견이다.** 토큰만 계산하면 선택된 칩의 라벨이 light 6.11:1 · dark 6.78:1 로 나오는데, 실제 렌더는 `disabled:opacity-70` 이 걸려 light 3.13:1 · dark 4.21:1 이다(§F10). 토큰 표에 없는 `opacity` 가 값을 바꾸기 때문이며, 이런 종류는 토큰 감사로는 원리적으로 잡히지 않는다.

## 1. 판정: 텍스트 대비는 다크가 라이트보다 낫다 — 다크 텍스트 결함은 **없다**

렌즈 지시가 「라이트만 계산하고 다크를 안 본 결함이 흔하다」고 지목했으므로 먼저 그 답을 적는다. **이 저장소에서는 그 결함이 없다.** 51 개 토큰 쌍을 양 테마에서 계산하고(`probe/contrast.mjs`) 주요 표면을 렌더에서 재측정한 결과, 모든 본문 텍스트 쌍이 양 테마에서 AA 를 통과하며 **다크가 예외 없이 라이트보다 높다**.

| 텍스트 쌍 | LIGHT | DARK |
|:---|---:|---:|
| `--ink` on `--canvas` | 16.57 | 18.01 |
| `--ink-body` on `--canvas-elevated` | 8.74 | 13.37 |
| `--muted-aa` on `--canvas` | 4.86 | 8.49 |
| `--muted-aa` on `--surface-soft` | 4.50 | 8.92 |
| `--accent-fg` on `--accent-subtle` | 6.11 | 5.24 |
| `--fg-on-accent` on `--accent-solid` | 5.09 | 7.21 |
| `--tag-fg` on `--tag-bg` | 7.15 | 8.82 |

렌더 실측도 일치한다 — 카드 제목 17.29(L)/16.57(D), 카드 부제 8.74/13.37, 설정 라벨 8.38/14.53, prev 버튼 13.44/14.14. `docs/design/ds/colors_and_type.css:660-672` 가 「dark runs more generous in the middle on purpose」라고 적은 설계 의도가 실현돼 있다. **다크 텍스트 대비는 이번 리팩터의 수정 대상이 아니다.**

갈리는 것은 텍스트가 아니라 **비텍스트**다 — 경계·고도·선택 상태. 그 셋이 아래 §F4·§F10·§F12 다.

## 2. 판정: 시스템 테마 실시간 반응은 **작동한다 — 첫 수동 탭 전까지만**

`probe/sysreact.mjs` 실측(390×844, system-follow 상태에서 `emulateMedia({colorScheme})` 로 OS 전환):

| 단계 | `data-theme` | body 배경 | `color-scheme` |
|:---|:---|:---|:---|
| 1. system-follow, OS light | `light` | `rgb(251,250,247)` | `light dark` |
| 2. OS 를 dark 로 전환(리로드 없음) | **`dark`** | `rgb(20,17,16)` | `dark` |
| 3. OS 를 다시 light 로 | **`light`** | `rgb(251,250,247)` | `light dark` |
| 4. 사용자가 Dark 칩을 탭 | `dark` | `rgb(20,17,16)` | `dark` |
| 5. OS 를 light 로 (수동 Dark 이후) | `dark` (고정) | `rgb(20,17,16)` | `dark` |
| 6. `/en/blog` 로 이동 | `dark` (유지) | `rgb(20,17,16)` | `dark` |

`use-theme-preference.ts:89-108` 의 `matchMedia('(prefers-color-scheme: dark)')` change 리스너가 `themePreference === 'system'` 일 때만 붙고, 붙어 있는 동안은 정확히 동작한다. 2·3 단계가 그 증거다. 5 단계 이후로는 리스너가 영구히 떨어지고 되돌릴 UI 가 없다 — 그것이 §F7 이다.

## 3. 표면별 테마 적용 (전 표면 훑음)

| 표면 | 경로 | dark 적용 | 실측 |
|:---|:---|:---|:---|
| landing | `/{locale}` | ✅ | `data-theme=dark`, body `rgb(20,17,16)` |
| test (instruction) | `/{locale}/test/{variant}` | ✅ | 시트 `--surface-raised` = `rgb(51,46,40)` |
| test (question) | 동 | ✅ | 진행률 트랙 `rgb(80,74,67)`, prev 버튼 border 4.08:1 |
| test error | `/{locale}/test/error` | ✅ | body `rgb(20,17,16)`, h1 `rgb(251,250,247)` |
| blog index | `/{locale}/blog` | ✅ | panel `rgb(30,26,22)` / border `rgb(80,74,67)` |
| blog detail | `/{locale}/blog/{variant}` | ✅ | h1 `rgb(179,174,161)` (= `--muted`, overline 역할) |
| history | `/{locale}/history` | ✅ | panel `rgb(30,26,22)` |
| GNB bar + 드로어 | 전 라우트 | ✅ | 드로어 panel `rgb(51,46,40)` + `border-left 1px rgb(129,122,114)` |
| settings (칩) | 드로어 하단 / 데스크톱 팝오버 | ✅ | 44×44 실측 |
| segment 404 | `/en/test/INVALID!` → `not-found.tsx` | ✅ | 루트 레이아웃 안에서 렌더 |
| **global 404** | `/foo` · `/ja/ja/blog` · `/en/does-not-exist` → `global-not-found.tsx` | ❌ | **`data-theme` 없음, body `rgb(251,250,247)`** |

즉 §6.9 의 「Landing/Test/Blog/History 모든 사용자 페이지」는 충족되지만, 그 목록에 없는 global 404 하나가 통째로 비어 있다(§F2).

---

# 결함 상세

## F1 (blocker) — `theme-bootstrap.js` 는 첫 페인트 전에 실행되지 않는다. Fast 4G 에서 **1,343ms**, Slow 4G 에서 **5,483ms** 동안 라이트 페이지가 그려진다

`public/theme-bootstrap.js` 는 존재 이유가 하나다 — 하이드레이션 전에 `data-theme` 를 확정해 플래시를 막는 것. `docs/project-analysis.md:275` 도 「sets `document.documentElement.dataset.theme` **before hydration**」이라고 적는다. 그 일이 일어나지 않는다.

**원인은 App Router 의 `next/script` 계약이다.** `src/app/layout.tsx:25` 가 `<Script src="/theme-bootstrap.js" strategy="beforeInteractive" />` 를 쓰는데, appDir 경로에서 그것은 `<script src>` 태그를 내보내지 않는다. `node_modules/next/dist/client/script.js:271-317` 이 그 사실을 주석으로 직접 적는다 — 「Before interactive scripts need to be loaded by Next.js' runtime instead of native `<script>` tags, because they no longer have `defer`」. 실제 emit 은 `ReactDOM.preload(src, {as:'script'})` 와 `(self.__next_s=self.__next_s||[]).push([...])` 두 개뿐이고, 실행은 `node_modules/next/dist/client/app-bootstrap.js:23-50` 의 `loadScriptsInSequence` 가 런타임 청크가 로드된 **뒤에** `document.createElement('script')` 로 붙여 `onload` 를 기다린 다음 일어난다.

서버가 실제로 내보낸 `/en` HTML 이 그것을 확인해 준다. head 에는 `<link rel="preload" href="/theme-bootstrap.js" as="script"/>` 만 있고(그 앞에 `async` 청크 12 개), body 첫머리에는 `<script>(self.__next_s=self.__next_s||[]).push(["/theme-bootstrap.js",{}])</script>` 만 있다. **문서 어디에도 `<script src="/theme-bootstrap.js">` 가 없다.** 반면 `<html data-theme="light" ...>` 는 `src/app/layout.tsx:23` 에서 하드코딩돼 SSR HTML 에 그대로 박혀 있고, 스타일시트는 렌더 블로킹이라 먼저 도착한다. 결과: 브라우저는 완성된 라이트 페이지를 칠한 뒤, 런타임 청크가 파싱·실행되고 나서야 다크로 뒤집는다.

`probe/fouc3.mjs` 실측(390×844, `colorScheme: dark`, 저장값 없음, CPU 4×):

| 조건 | first-contentful-paint | `data-theme` 가 dark 로 바뀐 시각 | **라이트로 칠해진 구간** |
|:---|---:|---:|---:|
| Fast 4G (150ms RTT, 1.6Mbps) | 568ms | 1,911ms | **1,343ms** |
| Slow 4G (400ms RTT, 400kbps) | 1,736ms | 7,219ms | **5,483ms** |
| 무제한 localhost, CPU 1× | 52ms | 56ms | 4ms |

localhost 에서조차 `light@28ms → dark@56ms` 로 first-paint(52ms) **뒤에** 뒤집힌다. 즉 지연이 0 인 환경에서도 이미 경합에서 지며, 실제 모바일 네트워크에서는 경합이 아니라 확정이다. 5.5 초는 플래시가 아니라 그냥 그 페이지다.

**고칠 것은 파일이 아니라 실어 나르는 방식이다.** `next/script` 를 버리고 부트스트랩 소스를 **인라인 블로킹 클래식 스크립트**로 문서에 직접 넣는다 — `<script dangerouslySetInnerHTML={{__html: THEME_BOOTSTRAP_SOURCE}} />` 를 `<body>` 의 첫 자식으로. 인라인 클래식 스크립트는 파서를 막고 동기 실행되므로 body 콘텐츠가 레이아웃되기 전에 `data-theme` 가 확정된다(next-themes 가 쓰는 것과 같은 패턴). 그리고 `<html data-theme="light">` 하드코딩(`layout.tsx:23`)은 그대로 둬도 되지만, 스크립트가 그 위에 덮어쓰기 전에는 아무것도 칠해지지 않으므로 무해해진다.

**함정 하나 — 소스 문자열을 `src/app/` 안에 두면 게이트가 붉어진다.** `scripts/qa/check-phase1-contracts.mjs:63-80` 이 `src/app` · `src/i18n` · `src/lib/routes` · `src/proxy.ts` 안에서 `window` · `localStorage` · `Date.now(` · `Math.random(` 문자열을 **정규식으로** 금지한다. 부트스트랩 소스는 `window.localStorage` 와 `window.matchMedia` 를 쓰므로 `layout.tsx` 안에 문자열로 적으면 그대로 걸린다. 소스 상수는 `src/features/gnb/theme-bootstrap-source.ts` 같은 곳에 두고 `layout.tsx` 가 import 만 한다. 그리고 `public/theme-bootstrap.js` 를 지운다면 `AGENTS.md` §4 Ask-First 목록에서 그 경로를 함께 걷어야 한다.

## F2 (blocker) — global 404 는 테마를 아예 모른다. 다크 사용자가 잘못된 주소를 열면 전체 화면이 흰색이다

`next.config.ts:14` 의 `experimental.globalNotFound: true` 로 `src/app/global-not-found.tsx` 가 자기 `<html>`/`<body>` 를 직접 렌더한다(`:37-38`). 루트 레이아웃을 거치지 않으므로 `layout.tsx:25` 의 테마 부트스트랩도, `:23` 의 `data-theme` 도 붙지 않는다. 파일 자신의 주석(`:15-16`)이 이미 그것을 「라우팅/부트스트랩 문제라 열린 채로 둔다」고 인정해 뒀다.

**실측**(`vivetest-theme=dark` 저장 + OS dark): `/zzz-top-level` → `data-theme` = `null`, body 배경 `rgb(251,250,247)`, `color-scheme` = `light dark`, 패널 `rgb(255,255,255)` / border `rgb(230,226,216)` — **라이트 토큰 그대로**. 같은 조건에서 `/en` 은 `rgb(20,17,16)` 이다.

적용 범위가 넓다. `tests/e2e/routing-smoke.spec.ts:75-91` 이 `/foo`(라우트 계약 밖 전 경로)와 `/ja/ja/blog`(중복 로케일)을 global 404 로 고정하고, 실측으로 `/en/does-not-exist` 같은 **로케일 안의 미매칭 경로**도 global 404 로 떨어진다. 반면 `/en/test/INVALID!` 는 `src/app/not-found.tsx` 로 가고 그쪽은 루트 레이아웃 안이라 정상적으로 테마가 붙는다 — 두 404 가 같은 카피·같은 클래스를 쓰면서 테마만 갈린다.

그리고 **이 표면에는 시각 baseline 이 0 장이다.** `tests/e2e/theme-matrix-manifest.json` 의 `layoutCases` 는 landing / blog / history / test-instruction 넷뿐이라 404 는 164 장 어디에도 없다. 결함이 게이트에 보이지 않는 구조다.

**처방:** `global-not-found.tsx` 가 자기 `<html>` 을 렌더하는 이상 부트스트랩을 스스로 실어야 한다 — F1 에서 만든 `THEME_BOOTSTRAP_SOURCE` 상수를 같은 인라인 스크립트로 이 파일의 `<body>` 첫 자식에 넣고, `<html>` 에 `data-theme="light"` 초기값과 `suppressHydrationWarning` 을 단다. 같은 단위에서 `theme-matrix-manifest.json` 의 `layoutCases` 에 `global-not-found` 케이스를 추가한다(mobile 만이라도 +4 장, 6 뷰포트면 +24 장).

## F3 (major) — 테마 전환이 2,500ms 동안 **UI 전체를 입력 불가로 만든다**. 모바일에서는 드로어가 열린 채 스크롤까지 잠긴 상태로

`src/features/gnb/hooks/theme-transition.ts:4` 의 `durationMs: 2500` 은 View Transition 의 `::view-transition-group/new/old(root)` 세 애니메이션에 그대로 실린다(`:113-131`).

**실측**(`probe/transition.mjs`, 390×844, hasTouch, 모바일 드로어 열고 Dark 칩 탭):

| t | `data-theme` | 실행 중 VT 애니메이션 | `document.activeElement` | 드로어 | `body` |
|---:|:---|:---|:---|:---|:---|
| +44ms | light | 0 | `mobile-gnb-theme-dark` | 열림 | `overflow:hidden; touch-action:none` |
| +450ms | dark | 3 × 2500ms `running` | **`BODY`** | 열림 | 잠김 |
| +1,652ms | dark | 3 × 2500ms `running` | `BODY` | 열림 | 잠김 |
| +2,858ms | dark | 0 | `BODY` | 열림 | 잠김 |

**입력이 실제로 막힌다.** `probe/race.mjs` 에서 전환 중 `document.elementFromPoint(195,300)` 이 그 자리에 보이는 카드가 아니라 `<HTML>` 을 돌려준다 — `::view-transition` 의사요소 트리가 top layer 에서 히트테스트를 삼킨다. 같은 실행에서 전환 중에 넣은 두 번째 탭은 Playwright 의 actionability 대기에 걸려 **약 1.9 초 뒤에야** 전달됐다. 즉 사용자는 테마 칩을 누른 뒤 2.5 초 동안 드로어를 닫는 것을 포함해 아무것도 할 수 없다.

**모바일과 데스크톱이 비대칭이고 모바일이 더 나쁘다.** 데스크톱 경로(`src/features/gnb/site-gnb.tsx:344-349`)는 origin 을 먼저 뜬 다음 `closeSettingsImmediate()` 로 패널을 닫고 전환을 시작한다. 모바일 경로(`:474-476`)는 `applyTheme(theme, {sourceEl})` 만 부르고 **드로어를 닫지 않는다** — 그래서 `use-gnb-mobile-menu.ts:137-145` 의 `body{overflow:hidden; touch-action:none}` 잠금이 2.5 초 내내 유지된다.

**비용은 프레임이 아니라 시간이다.** `probe/perf.mjs` 로 전환 구간의 rAF 간격을 재니 CPU 1× 에서 mean 13.4ms / p95 25.6ms / max 29.8ms, 33ms 초과 0 프레임이고, CPU 4× 에서 mean 14.7ms / p95 27.3ms / max 38.6ms, 33ms 초과 1 프레임 · longtask 4 건(최대 179ms, React 커밋+스타일 주입으로 보인다). 잰 환경에서는 잔킹이 아니다. 문제는 **길이**다.

2,500ms 는 이 시스템의 어떤 모션 값과도 맞지 않는다 — `src/app/globals.css:198` 의 최장 토큰 `--dur-slow: 280ms` 의 **8.9 배**, `docs/design/design.md:373`(§8 Motion Guidance, §5.11 의 `:239` 와 동일)의 최장 의도값 `--dur-expand: 260ms` 의 9.6 배, 카드 확장 실현값 280ms(`landing-grid-card.tsx:213`)의 8.9 배다. 그리고 **계약 근거가 어디에도 없다** — 저장소 전체에서 `2500` 은 구현(`theme-transition.ts:4`), 그것을 고정하는 단위 테스트(`tests/unit/gnb-theme-transition.test.ts:10` `expect(...).toBe(2500)`), 그리고 현상을 서술한 `docs/project-analysis.md:275` 셋뿐이고 `req-landing.md` · `design.md` · `decision-register.md` 어디에도 조항이 없다.

**칭찬할 부분은 하나 있다.** `theme-transition.ts:33-42,53-56` 이 `prefers-reduced-motion: reduce` 를 확인해 전환을 통째로 건너뛰고 즉시 적용한다 — WCAG 2.3.3 대응이 이미 되어 있다. 고칠 것은 duration 이지 reduced-motion 경로가 아니다.

**처방:** duration 을 `--dur-slow`(280ms)에 맞추고 토큰에서 읽는다 — `THEME_TRANSITION_CONFIG.durationMs` 를 상수 리터럴 대신 `280` 으로 두거나, 더 낫게는 CSS 의 `--dur-slow` 를 `getComputedStyle` 로 읽지 말고 `src/features/gnb/theme-transition.ts` 가 `280` 을 `--dur-slow` 와 같은 값으로 선언하고 단위 테스트가 둘의 동치를 검사하게 한다. 그리고 모바일 경로도 데스크톱처럼 전환 **시작 전에** 드로어를 닫는다(`site-gnb.tsx:474-476` 에 `closeMobileMenu()` 상당을 추가하고 origin 은 닫기 전에 `getTransitionOrigin(sourceEl)` 로 떠 둔다 — 데스크톱 `:345` 이 이미 그 형태다).

## F4 (major) — 다크에서 모바일 확장 카드가 **경계를 하나도 그리지 않는다**. 설계 정의가 명시적으로 금지한 바로 그 형태다

`docs/design/ds/colors_and_type.css:648-654` 는 다크 오버레이 규칙을 수치까지 못박는다 — 「in dark the OVERLAY'S EDGE carries the separation: `--border-strong` against the scrimmed ground is 4.73:1 and against the panel 3.18:1, both clear of WCAG 1.4.11's 3:1. **Overlays in dark must draw that edge; in light they may rely on the scrim alone.**」 `docs/design/design.md:274` 가 같은 문장을 반복한다.

**scrim 이 다크에서 아무 일도 못 한다는 것은 실측으로 확인된다**(`probe/overlay.mjs`):

| | scrim 값 | scrim 적용 후 지면 | **지면 어둡힘 비율** |
|:---|:---|:---|---:|
| light | `rgba(30,26,22,0.48)` | `rgb(145,142,139)` | **3.11:1** |
| dark | `rgba(5,4,3,0.72)` | `rgb(9,8,7)` | **1.07:1** |

그래서 다크에서는 오버레이 자신의 edge 가 유일한 분리 수단이 된다. GNB 모바일 드로어는 그 규칙을 정확히 지킨다 — `site-gnb.tsx:84-86` 주석이 「The edge is load-bearing in dark」라고 적고 `:87` 이 `border-l border-[var(--border-strong)]` + `shadow-[var(--shadow-overlay)]` 를 단다. 실측: 드로어 패널 `rgb(51,46,40)` + `border-left 1px rgb(129,122,114)`. **참조 구현이 이미 저장소 안에 있다.**

**모바일 확장 랜딩 카드는 그것을 하지 않는다.** `src/features/landing/grid/landing-grid-card.tsx:1021` 의 모바일 확장 분기는 `'[background:var(--expanded-card-surface)] [box-shadow:none]'` 이 전부다 — border 선언이 없고 shadow 는 명시적으로 none 이다. 바로 아래 Normal 분기(`:1024`)는 `[border:1px_solid_var(--normal-card-border)]` 를 갖는다. 즉 **확장되는 순간 카드가 가진 유일한 경계를 잃는다.** 그 뒤에는 `landing-catalog-grid.tsx:30-31` 의 `fixed inset-0 z-10 bg-[var(--overlay-scrim-medium)]` backdrop 이 깔려 있고 카드는 `z-20` 이므로, 카드 위아래로 scrim 이 적용된 지면이 보인다.

**실측 분리비**(390×844, OPEN 상태, `probe/edges.mjs` · `probe/overlay.mjs`):

| | 확장 카드 표면 | scrim 적용 지면 | **경계 대비** | border | shadow |
|:---|:---|:---|---:|:---|:---|
| light | `rgb(255,255,255)` | `rgb(145,142,139)` | **3.26:1** | 0px | none |
| dark | `rgb(30,26,22)` | `rgb(9,8,7)` | **1.16:1** | 0px | none |

라이트는 scrim 만으로 3.26:1 을 얻어 설계 정의가 허용한 대로 통과한다. 다크는 1.16:1 — WCAG 1.4.11 의 3:1 은 물론이고 지각 임계에도 못 미친다. 다크 모바일에서 카드를 확장하면 **확장됐다는 사실 자체가 보이지 않는다**(내용은 바뀌지만 그 내용이 어디서 시작하고 끝나는지 알 수 없다).

토큰은 이미 있다. `landing-grid-card.module.css:72` 의 `--expanded-card-border: var(--accent)` 가 선언돼 있고 데스크톱 확장 표면만 그것을 소비한다.

**처방:** `landing-grid-card.tsx:1021` 의 모바일 확장 분기를 `'[background:var(--expanded-card-surface)] [box-shadow:none] [border-top:1px_solid_var(--border-strong)] [border-bottom:1px_solid_var(--border-strong)]'` 로 바꾼다 — `w-screen` 풀블리드라 좌우 변은 화면 밖이므로 위아래 변만 의미가 있고, 그 두 변이 설계 정의가 요구하는 edge 다. `--border-strong` 은 다크에서 `--warm-600`(`globals.css:360`) 이라 scrim 지면 대비 4.73:1(설계 정의의 실측값)을 낸다. `--accent` 를 쓰면 다크에서 sage-400 이 scrim 지면 대비 더 높지만 확장 상태에 색 의미를 부여하는 결정이 되므로 `--border-strong` 이 최소 변경이다.

## F5 (major) — `[data-theme='light']` 분기가 없어, 라이트를 고른 OS-다크 사용자에게 네이티브 크롬이 다크로 남는다

`src/app/globals.css:96` 이 `:root { color-scheme: light dark }`, `:347` 이 `[data-theme='dark'] { color-scheme: dark }` 를 선언한다. **`[data-theme='light']` 규칙은 존재하지 않는다**(globals.css 전수 확인). 그런데 `layout.tsx:23` 이 SSR 기본을 `data-theme="light"` 로 못박고, 부트스트랩도 저장값이 `'light'` 면 `data-theme='light'` 를 쓴다(`theme-bootstrap.js:9-12`).

**실측**(`probe/fouc.mjs` 케이스 C 와 `probe/sysreact.mjs` 1·3 단계): OS dark + `vivetest-theme=light` 저장 → `data-theme='light'`, body 배경 `rgb(251,250,247)`, **`getComputedStyle(document.documentElement).colorScheme` = `"light dark"`**. `light dark` 는 UA 에게 「둘 다 지원하니 시스템 설정을 따르라」는 뜻이므로, OS 가 다크면 UA 는 스크롤바·텍스트 선택색·네이티브 위젯·오버스크롤 캔버스를 **다크로** 칠한다. 페이지는 라이트인데.

모바일에서 이것이 보이는 자리는 iOS Safari 의 러버밴드 스크롤 구간이다 — 문서 위아래 끝을 넘겨 당기면 UA 캔버스가 드러나고, 그 색이 `color-scheme` 를 따른다. `src/app/app-body-class.ts:19` 의 `bg-[var(--canvas)]` 는 body 를 칠할 뿐 그 바깥을 칠하지 않는다.

설계 정의 쪽에는 이미 올바른 형태가 있다 — `docs/design/ds/colors_and_type.css:658-659` 의 `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { ... } }` 는 「명시적 light 선택이 항상 이긴다」는 의도를 `:not([data-theme='light'])` 로 표현한다(`:525` 주석). 런타임 미러는 그 미디어 블록을 베끼지 않았고(`globals.css` 에 `prefers-color-scheme` 0 건 — 컴파일된 CSS 의 `@media (prefers-color-scheme:dark)` 는 Lightning CSS 의 `light-dark()` 지원용 `--lightningcss-*` 가드일 뿐이다), 그래서 `color-scheme` 만 반쪽으로 남았다.

**처방:** `[data-theme='light'] { color-scheme: light; }` 한 줄을 추가한다. 값 정본이 `docs/design/ds/colors_and_type.css` 이고 그 디렉터리가 Ask-First + 저장소 밖 push 표면이므로(`AGENTS.md` §4), 설계 정의에 먼저 넣고 `globals.css` 로 다시 미러하는 순서를 지킨다 — 단, 이 선언은 토큰이 아니므로 `@mirror-begin/@mirror-end` 구간 **밖**의 새 셀렉터 블록으로 두면 `tests/unit/design-tokens-dark-parity.test.ts:155-175` 의 sentinel 대조를 건드리지 않는다.

## F6 (major) — `theme-color` meta 가 없어 모바일 브라우저 UI 가 테마를 따라가지 않는다

서버가 실제로 내보낸 `/en` 문서의 meta 는 정확히 셋이다 — `charSet`, `viewport`, `description`. **`theme-color` 도 `color-scheme` meta 도 없다.** 소스에도 없다: `src/` 전체에 `theme-color` · `themeColor` · `export const viewport` · `colorScheme` 이 0 건이고, `public/` 에 web app manifest 도 없다. 렌더 실측으로도 4 개 표면 모두 `document.querySelector('meta[name="theme-color"]')` 가 `null` 이다.

모바일에서 이것이 결정하는 것은 **브라우저 크롬 자체의 색**이다. Android Chrome 은 `theme-color` 로 상태 표시줄을 칠하고, iOS Safari 15+ 는 툴바 틴트에 쓴다. 없으면 브라우저 기본값이 남는다 — 즉 다크 테마를 고른 사용자의 화면 위아래에 밝은 브라우저 바가 그대로 붙어 있고, 390px 화면에서 그것은 무시할 수 없는 면적이다. 앱처럼 보이려는 표면에서 가장 먼저 눈에 띄는 이음매다.

`theme-color` 는 정적 meta 라 `data-theme` 를 따라가지 못한다는 점이 함정이다. 표준 해법은 `media` 속성으로 두 벌을 내보내는 것이다:

```html
<meta name="theme-color" content="#fbfaf7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#141110" media="(prefers-color-scheme: dark)">
```

**처방:** `src/app/layout.tsx` 에 `export const viewport: Viewport = { themeColor: [{media:'(prefers-color-scheme: light)', color:'#fbfaf7'}, {media:'(prefers-color-scheme: dark)', color:'#141110'}], colorScheme: 'light dark' }` 를 추가한다(Next 의 `Viewport` 타입이 그대로 지원한다). 두 색은 `--canvas` 의 라이트·다크 실현값(`globals.css:125` → `--warm-50` `#fbfaf7`, `:350` → `--warm-950` `#141110`)이므로 리터럴이 아니라 **R 값의 전사**이고, `AGENTS.md` §3-1 에 따라 어느 file:line 에서 읽었는지 주석으로 남긴다. 다만 `media` 속성은 OS 선호만 따르므로 **수동 선택과는 어긋난다** — 수동 선택까지 반영하려면 `use-theme-preference.ts:51-74` 의 `writeThemePreferenceToDom` 이 DOM 의 `meta[name=theme-color]` 를 함께 갱신해야 한다. 두 단계로 나눠 잡을 것: meta 두 벌은 즉시(OS-follow 사용자 전원 해결), DOM 갱신은 §F7 의 3 상태 컨트롤과 같은 단위에서.

## F7 (major) — 수동 선택이 **되돌릴 수 없는 일방통행**이다. system-follow 로 돌아갈 UI 가 없다

`src/features/gnb/components/settings-controls.tsx:94-97` 의 `orderedThemeOptions` 는 `['dark','light']` 또는 `['light','dark']` — **두 값뿐이다.** `applyTheme` 의 시그니처도 `(theme: 'light' | 'dark', ...)` 로 `'system'` 을 받지 못한다(`use-theme-preference.ts:23,119`). 실측으로도 드로어에 존재하는 테마 컨트롤은 `mobile-gnb-theme-light` 와 `mobile-gnb-theme-dark` 둘뿐이고 현재 테마 쪽은 항상 `disabled` 다.

그 결과 `use-theme-preference.ts:89-108` 의 시스템 리스너는 첫 탭 이후 영구히 떨어지고(§2 의 5 단계 실측), `writeThemePreferenceToDom` 의 `themePreference === 'system'` 분기(`:60-67`, localStorage 키를 지우는 코드)는 **도달 불가능한 죽은 코드**가 된다 — 그 분기를 실행시킬 호출자가 없다.

**이것은 버그가 아니라 등재된 결정이다.** `docs/design/design.md:344` 가 「Theme control is **two chips, Light and Dark** … **There is no System option to select**: `req-landing.md` §6.4 makes system-follow the *initial* state」라고 적고, `docs/req-landing.md:249` 가 「테마 상태: 최초는 system-follow, 수동 변경 이후 `light|dark`를 localStorage에 고정 저장한다」로 그것을 계약화한다. 그래서 이 항목은 구현 결함이 아니라 **계약 개정 대상**이다(사용자 결정 1).

**개정해야 하는 이유는 플랫폼 관용이다.** iOS(설정 > 디스플레이 > 밝은 모드/어두운 모드/자동)와 Android·Material 3(「시스템 기본값 사용」)은 모두 **3 상태**를 표준으로 둔다. 두 OS 모두 일몰 기준 자동 전환을 기본 제공하므로, 낮에 라이트를 한 번 고른 사용자는 그날 밤부터 영구히 눈부신 페이지를 보게 되고 되돌릴 방법이 제품 안에 없다(브라우저 저장소를 지우는 것 말고는). 「최초 상태가 system-follow」라는 계약은 **처음 한 번만** 시스템을 존중하고 그 뒤로는 존중하지 않겠다는 뜻이다.

**처방:** 칩을 셋(`Light` / `Dark` / `System`)으로 만들고 `ThemePreference` 유니온이 이미 `'system'` 을 포함하므로(`src/features/gnb/types.ts`) `applyTheme` 시그니처를 `(preference: ThemePreference, ...)` 로 넓혀 기존 `writeThemePreferenceToDom` 의 system 분기를 살린다. 44px 칩 3 개는 390px 드로어(실측 가용 폭 306px)에 들어간다 — 현재 두 칩이 44+8+44 = 96px 를 쓰므로 셋이면 140px. `docs/req-landing.md:249` 와 `docs/design/design.md:344` 를 같은 단위에서 고친다.

## F8 (major) — 테마를 바꾸면 **포커스가 사라진다**. 포커스 트랩 없는 `aria-modal` 드로어 안에서

`settings-controls.tsx:158` 이 현재 테마 칩에 `disabled={isCurrentTheme}` 를 건다. 탭한 칩은 그 즉시 현재 테마가 되므로 **자기가 눌린 순간 disabled 가 된다**. 브라우저는 disabled 가 된 요소에서 포커스를 떨어뜨린다.

**실측**(`probe/transition.mjs`): 탭 직후 `document.activeElement` = `mobile-gnb-theme-dark` → 테마 적용 후 **`BODY`**. 그리고 그 시점에 드로어는 여전히 열려 있고 `role="dialog" aria-modal="true"`(`site-gnb.tsx:433-435`)인데, 이 드로어에는 포커스 트랩이 없다(`use-gnb-tab-routing.ts:51-56` 이 범위를 벗어나면 랩도 `preventDefault` 도 하지 않는다 — surface-gnb 지도의 확인과 일치). 즉 키보드·스크린리더 사용자는 모달이 열린 채 문서 최상단으로 튕겨 나가고, 다음 Tab 은 scrim 뒤 배경 콘텐츠로 들어간다.

WCAG 2.4.3 Focus Order(A)와 3.2.2 On Input(A) 둘 다에 걸리는 형태다 — 컨트롤을 활성화했을 뿐인데 포커스 컨텍스트가 예고 없이 바뀐다.

`disabled` 자체도 재고 대상이다. 이 칩들은 **비활성 컨트롤이 아니라 선택된 컨트롤**이고, `aria-pressed={isCurrentTheme}`(`:152`)로 이미 상태를 노출한다. `disabled` 를 붙이면 탭 순서에서 빠져 스크린리더 사용자가 「두 개 중 하나가 눌려 있다」는 짝 구조 자체를 지각하지 못한다.

**처방:** `disabled` 를 걷고 `aria-pressed` 만 남긴다. 현재 테마 칩을 눌렀을 때의 no-op 은 핸들러에서 `if (isCurrentTheme) return;` 로 처리한다(같은 파일 `:183` 의 로케일 칩이 이미 `onClick={isCurrentLocale ? undefined : ...}` 형태를 쓴다). 시각적 「선택됨」 표현은 `chipSwatchSelectedStateClassName`(`:46-47`)의 링이 이미 갖고 있으므로 잃는 것이 없고, `disabled:opacity-70` 이 사라지면서 §F10 도 함께 닫힌다. `disabled` 를 유지해야 한다면 최소한 `applyTheme` 뒤에 형제 칩으로 포커스를 옮겨야 한다.

## F9 (major) — 다크모드에는 **자동 검증이 하나도 없다**. §6.9 가 약속한 릴리스 차단 게이트는 픽셀 비교뿐이다

`docs/req-landing.md:417` 은 「Automated: 페이지×테마 매트릭스에서 핵심 요소/보조요소 모두 검증하며 위반 시 릴리스를 차단한다」고 적고, `:1068`(§14.2 항목 8)이 「Theme Matrix: … light/dark, Expanded 다크모드, 핵심 요소/보조요소 **톤 정합** PASS」를 블로킹 체크로 올린다. 그 항목의 등재 증거는 `docs/blocker-traceability.json` 에서 `{"blocker": 8, "kind": "automated_assertion", "file": "tests/e2e/theme-matrix-smoke.spec.ts", "assertionId": "assertion:B8-theme-matrix"}` 하나다.

그런데 `tests/e2e/theme-matrix-smoke.spec.ts:354` 과 `:374` 의 `assertion:B8-theme-matrix` 는 `captureRepresentativeState(...)` — **스크린샷 비교**다. 스크린샷은 「전에 승인된 그림과 달라졌는가」만 판정하며 「톤이 정합하는가」도 「대비가 기준을 넘는가」도 판정할 수 없다. 승인 당시 대비가 1.16:1 이었다면 그 1.16:1 을 영원히 초록으로 지킨다.

**그리고 axe 는 다크에서 한 번도 돌지 않는다.** `tests/e2e/a11y-smoke.spec.ts` 에 `theme` · `dark` · `colorScheme` · `color-scheme` 문자열이 **0 건**이고, `playwright.config.ts` 의 `use:` 블록에 `colorScheme` 설정이 없어 기본값 `'light'` 로 떨어진다. `tests/e2e/helpers/axe.ts:21` 의 `new AxeBuilder({page}).analyze()` 는 룰 제한이 없어 `color-contrast`(WCAG 1.4.3)가 기본 활성이지만, 그 검사가 보는 팔레트는 언제나 라이트 하나다.

**대비를 재는 단언이 저장소 전체에 0 건이다.** `tests/` 와 `scripts/qa/` 에서 `contrast` 를 grep 하면 `scripts/qa/check-design-token-parity.mjs:37` 의 `LITERAL_KINDS` 문자열 하나가 나올 뿐이고, `scripts/qa/check-phase8-accessibility-contracts.mjs` 에는 `contrast` · `theme` · `dark` 가 모두 0 건이다.

**처방 둘.** ⑴ `a11y-smoke.spec.ts` 의 axe 루프를 `for (const theme of ['light','dark'])` 로 감싸고, 페이지 진입 전에 `theme-matrix-smoke.spec.ts:156-161` 의 `setTheme`(localStorage 시드) 과 같은 방식으로 테마를 심는다 — 기존 케이스 수가 2 배가 되지만 axe 의 `color-contrast` 가 즉시 다크 팔레트를 덮는다. ⑵ 픽셀이 잡지 못하는 비텍스트 대비(§F4·§F10·§F12)는 axe 도 잡지 못하므로(axe 의 `color-contrast` 는 텍스트만 본다) 별도의 단위 검사를 세운다 — `globals.css` 의 라이트·다크 토큰 쌍을 파싱해 「오버레이 표면 대 scrim 적용 지면」·「컨트롤 fill 대 그 지면」·「선택 상태 표시자 대 그 지면」 세 종류의 쌍을 명시 목록으로 두고 각각 3:1 을 단언하는 `tests/unit/theme-contrast.test.ts`. 목록 기반이므로 새 표면이 자동으로 들어오지는 않지만, `docs/design/ds/colors_and_type.css:648-654` 가 이미 수치로 적어 둔 규칙을 처음으로 실행 가능하게 만든다.

## F10 (major) — 선택된 칩의 `disabled:opacity-70` 이 선택 표시자와 라벨을 임계 아래로 떨어뜨린다. 토큰 계산으로는 보이지 않는 결함

`settings-controls.tsx:29` 의 `chipBaseClassName` 끝에 `disabled:cursor-default disabled:opacity-70` 이 있다. 선택된 칩은 `disabled`(`:158`, `:182`)이므로 **선택 상태를 표현하는 모든 픽셀이 70% 불투명도로 합성된다** — 링도, 틴트도, 라벨도.

**렌더 실측**(`probe/chip.mjs`)으로 `opacity: "0.7"` 을 확인하고, 합성값을 계산했다(`probe/contrast.mjs`):

| 대상 | 토큰만 계산 | **실제 합성값** | 기준 |
|:---|---:|---:|:---|
| 테마 칩 선택 링(`--accent`) 대 드로어 — LIGHT | 3.75 | **2.37** | 1.4.11 3:1 ❌ |
| 테마 칩 선택 링 대 드로어 — DARK | 5.16 | 3.32 | 3:1 ✅ |
| 선택된 로케일 칩 라벨 대 자기 fill — LIGHT | 6.11 | **3.13** | 1.4.3 4.5:1 ❌ |
| 선택된 로케일 칩 라벨 대 자기 fill — DARK | 6.78 | **4.21** | 4.5:1 ❌ |
| 선택된 로케일 칩 fill 대 드로어 — LIGHT | 1.16 | 1.10 | — |
| 선택된 로케일 칩 fill 대 드로어 — DARK | 1.06 | 1.04 | — |

즉 **「지금 어느 테마인가」를 알려 주는 유일한 시각 신호가 라이트에서 2.37:1** 이고, 「지금 어느 언어인가」의 라벨이 양 테마에서 AA 아래다. 그리고 이 결함은 **라이트가 다크보다 나쁘다** — 다른 모든 항목과 방향이 반대라, 다크만 감사하면 놓치고 라이트만 감사해도 (`opacity` 를 합성하지 않으면) 놓친다.

WCAG 상 `disabled` 컨트롤은 1.4.3·1.4.11 의 예외이므로 **문면상 위반은 아니다**. 그러나 여기서 `disabled` 는 「비활성」이 아니라 「선택됨」을 표현하는 수단이고(§F8), 예외 조항이 겨냥한 상황이 아니다. 예외에 기대어 선택 표시자를 2.37:1 로 두는 것은 규범의 자구를 지키고 목적을 어기는 형태다.

**처방:** §F8 의 `disabled` 제거가 이 항목을 함께 닫는다 — `disabled` 가 없으면 `disabled:opacity-70` 도 적용되지 않고 링은 3.75(L)/5.16(D), 로케일 라벨은 6.11(L)/6.78(D) 로 돌아간다. `disabled` 를 유지하는 선택을 한다면 `disabled:opacity-70` 을 선택된 칩에서만 걷어내야 한다(`chipSelectedStateClassName` · `chipSwatchSelectedStateClassName` 에 `opacity-100` 추가) — 단 Tailwind v4 의 emit 순서 함정(`settings-controls.tsx:32-37` 주석이 기록한 L10)에 걸리므로 유틸리티 경쟁이 아니라 변수/별도 선택자로 풀어야 한다.

## F11 (major) — §6.9 는 측정 가능한 기준이 없고 자체 모순이 있어, 게이트가 될 수 없다

`docs/req-landing.md:407-417` 전문을 읽으면 세 문제가 겹쳐 있다.

첫째, **수치가 하나도 없다.** `:409` 는 「테마 색상은 … 의미 토큰과 **대비 기준**으로 정의한다」고 하면서 그 기준이 무엇인지 적지 않는다. 어떤 숫자도 없는 조항은 자동 검사로 번역될 수 없고, 실제로 번역되지 않았다(§F9). WCAG 1.4.3(일반 텍스트 4.5:1 · 대형 텍스트 3:1)과 1.4.11(비텍스트 3:1)을 명시하면 그대로 게이트가 된다.

둘째, **`:413` 이 한 줄 안에서 스스로를 뒤집는다** — 「보조요소(경계선/아이콘/2차 버튼/칩 등)는 다크 팔레트 정합을 **권장**하며, **릴리스 게이트에서 검증 대상으로 포함한다**」. 권고인지 차단 조건인지 읽는 사람이 결정할 수 없고, §14.2 항목 8(`:1068`)은 그것을 차단 조건 쪽으로 확정한다. 그리고 이번 렌즈가 찾아낸 다크 결함(§F4·§F12)은 전부 이 「보조요소」 범주다 — 즉 결함이 있는 바로 그 범주가 권고와 차단 사이에 걸쳐 있다.

셋째, **범위가 표면 목록으로 적혀 있어 목록 밖이 비어도 위반이 아니다.** `:410` 은 「Landing/Test/Blog/History 모든 사용자 페이지」라고 쓰는데, 404·에러·consent 배너는 그 목록에 없다. §F2 의 global 404 가 정확히 그 틈으로 빠진다.

**처방:** §6.9 를 동작 계약(어느 표면에 테마가 적용되는가)과 인터랙션/시각 계약(무엇이 어떤 수치를 만족해야 하는가)으로 가른다(사용자 결정 6). 동작 쪽은 표면 열거를 「사용자에게 렌더되는 모든 문서」로 바꿔 404·에러를 자동 포함시킨다. 시각 쪽은 수치를 명시한다 — 텍스트 4.5:1(대형 3:1), 비텍스트·경계·상태 표시자 3:1, **그리고 오버레이는 다크에서 edge 를 그려야 한다**(`docs/design/ds/colors_and_type.css:648-654` 가 이미 쓴 문장을 요구사항으로 승격). `:413` 의 「권장」을 삭제하고 차단 조건으로 확정한다.

## F12 (minor) — 다크에서 `--surface-muted` 와 `--surface-raised` 가 같은 램프 단계로 충돌해, 드로어 위 칩의 fill 대비가 **1.00:1** 이다

`src/app/globals.css:380` 이 다크에서 `--surface-muted: var(--warm-800)` 을, `:351` 이 `--surface-raised: var(--warm-800)` 을 준다 — **같은 값**이다. 라이트에서는 `--surface-muted` 가 `--warm-150`, `--surface-raised` 가 `--warm-0` 로 갈린다(`:155`, `:126`).

`settings-controls.tsx:29` 의 칩 기본값은 `[--gnb-chip-bg:var(--surface-muted)]` 이고 드로어 패널은 `bg-[var(--surface-raised)]`(`site-gnb.tsx:87`)다. 그래서 **다크 드로어 안의 미선택 로케일 칩 12 개는 배경이 지면과 완전히 같다.**

**실측**(`probe/chip.mjs` · `probe/live-contrast.mjs`):

| | 칩 fill | 드로어 | fill 대비 | 칩 border | border 대비 |
|:---|:---|:---|---:|:---|---:|
| light | `rgb(236,232,223)` | `rgb(255,255,255)` | 1.22 | `rgb(230,226,216)` | 1.29 |
| dark | `rgb(51,46,40)` | `rgb(51,46,40)` | **1.00** | `rgb(80,74,67)` | 1.54 |

남은 유일한 경계는 1.54:1 의 1px 테두리다. 칩 안의 로케일 라벨은 12.88:1 로 잘 읽히지만, **그 글자들이 「누를 수 있는 것」이라는 신호는 사실상 없다** — 다크에서 드로어 하단은 12 개의 떠 있는 단어처럼 보인다. WCAG 1.4.11 의 「사용자 인터페이스 구성요소를 식별하는 데 필요한 시각 정보」에 걸리는 형태이며, 라이트도 1.22/1.29 로 통과하지 못하지만 다크의 1.00 은 퇴화한 경우다.

minor 로 두는 이유는 라벨 텍스트가 고대비로 읽히고 탭하면 동작하므로 기능 도달이 막히지 않기 때문이고, 그럼에도 고쳐야 하는 이유는 이것이 **다크 remap 이 만들어 낸 토큰 충돌**이라 리팩터가 손대지 않으면 영구히 남기 때문이다.

**처방:** 다크의 `--surface-muted` 를 `--warm-700` 으로 한 단계 올린다 — 드로어(`--warm-800`) 대비 1.54:1 로 여전히 3:1 미만이므로, 칩 테두리를 `--gnb-chip-border: var(--hairline)`(다크 `--warm-700`, 1.54)에서 `--border-strong`(다크 `--warm-600`, 2.15)으로 올리는 편을 함께 본다. 3:1 을 실제로 넘기려면 칩 fill 을 `--warm-600`(드로어 대비 4.08:1)까지 올리거나 드로어 지면을 `--surface` 단계로 낮춰야 하므로, 이 결정은 값 하나가 아니라 다크 고도 램프의 재배치다 — `docs/design/ds/colors_and_type.css`(Ask-First · 저장소 밖 push)에서 결정하고 미러한다. **쓰기 전에 `docs/decision-register.md` 에 R/C 갈림으로 등재해야 한다**(`AGENTS.md` §3-1).

## F13 (minor) — 전환 스타일 정리 타이머가 재진입에서 서로를 지운다. §F3 을 고치는 순간 도달 가능해지는 잠복 결함

`theme-transition.ts:196-198` 이 `window.setTimeout(() => { removeTransitionStyle(); }, nextDurationMs)` 를 걸면서 **핸들을 저장하지 않는다**. 그리고 `:173` 이 새 전환을 시작할 때마다 `removeTransitionStyle()` 로 id 가 같은 스타일 요소를 지운 뒤 새로 주입한다.

그래서 duration 안에 두 번째 전환이 들어오면: 1 회차 타이머가 만료하면서 **2 회차의** 스타일 요소를 지운다(id 로 지우므로 세대를 구분하지 못한다). 2 회차 애니메이션은 마스크 정의를 잃고, `injectBaseStyles`(`:81-88`)가 깔아 둔 `animation: none` 으로 떨어져 새 스냅샷이 즉시 튄다.

**현재는 도달 불가능하다.** §F3 에서 측정한 대로 전환 중에는 입력이 막혀 두 번째 탭이 2.5 초 뒤에나 전달되기 때문이다(`probe/race.mjs`: 두 번째 탭이 `t+2580ms` 에 전달 — 1 회차 타이머 만료 이후). 그러나 §F3 의 처방대로 duration 을 280ms 로 줄이면 연타가 쉬워지고, `await transition?.ready`(`:189`) 뒤의 비동기 구간이 그대로 남아 있어 경합이 열린다.

**처방:** 타이머 핸들을 모듈 스코프 변수에 저장하고 `removeTransitionStyle()` 진입 시 `clearTimeout` 한다. 더 나은 형태는 `transition.finished` 를 기다려 정리하는 것이지만(`ViewTransitionLike` 인터페이스가 `:21-23` 에서 `ready` 만 선언하고 있으므로 타입 확장이 필요하다), 최소 변경은 핸들 저장 + clear 다. §F3 과 같은 단위에서 고친다 — duration 을 줄이는 커밋이 이 결함을 활성화하므로 분리하면 안 된다.

---

# 훑지 못한 것 / 미확인

측정 환경은 macOS + headless Chromium 하나다. iOS Safari · Android Chrome 의 실기기 거동은 재현하지 않았다 — 특히 ⑴ `color-scheme: light dark` 가 iOS 러버밴드 캔버스를 실제로 다크로 칠하는지(§F5), ⑵ `theme-color` 부재 시 iOS Safari 툴바가 어떤 색을 쓰는지(§F6), ⑶ 4176px 마스크 레이어(`theme-transition.ts:107-108` 의 `finalMaskSize` 를 390×844 에 대입한 값)를 2.5 초 애니메이션하는 비용이 저사양 Android 에서 프레임을 떨어뜨리는지(§F3 — 잰 환경에서는 CPU 4× 에서도 33ms 초과 1 프레임뿐이었다).

View Transition 의사요소가 입력을 막는 **정확한 메커니즘**은 확인하지 않았다. 실측으로 `elementFromPoint` 가 `<html>` 을 돌려주고 클릭이 1.9 초 지연된다는 결과는 확정이지만, 그것이 UA 스타일시트의 `pointer-events` 선언 때문인지 top layer 히트테스트 순서 때문인지는 사양을 읽어 확인하지 않았다. 처방(duration 단축)은 어느 쪽이든 같으므로 판정에 영향이 없다.

`webkit` 프로젝트에서의 테마 거동은 재지 않았다. Playwright 에 webkit-2227 이 설치돼 있지만 이번 프로브는 전부 chromium 이다. `tests/e2e/safari-hover-ghosting.spec.ts` 의 5 장 baseline 이 webkit 이라 webkit 경로가 존재하기는 하나 테마와는 무관하다. Safari 의 View Transition 지원(18+)과 미지원 구형에서의 폴백(`supportsThemeTransition:53-56` 이 `startViewTransition` 부재를 확인해 즉시 적용으로 떨어진다)은 코드로만 확인했다.

`/en/test/nope` 가 `<html id="__next_error__">` 셸을 반환하는 이유를 끝까지 추적하지 않았다. `/en/test/INVALID!` 는 `segment-not-found`(테마 정상), `/en/does-not-exist` 는 `global-not-found`(§F2)로 갈리는데, `nope` 가 세 번째 경로인지 스트리밍 셸이 클라이언트에서 해소되는 중간 상태인지는 확인하지 않았다. §F2 의 처방에는 영향이 없다 — `global-not-found.tsx` 에 부트스트랩을 실으면 세 경로 중 그것을 타는 것은 모두 덮인다.

consent 배너의 다크 렌더를 개별 측정하지 못했다. `probe/edges.mjs` 의 셀렉터가 배너 루트를 잡지 못해(`data-testid` 가 `consent-banner.tsx:243` 의 `rootTestId` prop 으로 주입되어 리터럴이 아니다) 투명 요소를 읽었다. 배너는 `PageShell` 안이므로 `data-theme` 은 정상 적용되지만, 그 표면의 대비·경계는 이 렌즈에서 실측되지 않았다 — 390px 에서 뷰포트의 25~32% 를 차지하는 표면이므로(surface-gnb 지도) 별도 확인이 필요하다.

데스크톱 설정 팝오버(`gnb-settings-panel`)의 다크 edge 를 측정하지 않았다. 모바일 390px 에서는 렌더되지 않기 때문인데, 사용자 결정 2(hover 없는 ≥768 기기를 터치 생명주기로)를 적용하면 터치 태블릿이 이 팝오버를 쓰게 되고 그때 §F4 와 같은 오버레이 edge 질문이 이 표면에도 생긴다. 팝오버가 `--border-strong` edge 를 갖는지 미확인.

`qa:rules`(13 검사) · `npm test` · `test:e2e:gate` 를 이 세션에서 **실행하지 않았다.** 읽기 전용 과제이고, 위 처방들이 무엇을 붉힐지는 소스를 읽어 도출한 것이다. 특히 `scripts/qa/check-phase1-contracts.mjs:63-80` 의 `window`/`localStorage` 금지가 §F1 처방을 막는다는 판정은 정규식과 대상 디렉터리 목록을 읽어 내린 것이며 실행으로 확인하지 않았다.
