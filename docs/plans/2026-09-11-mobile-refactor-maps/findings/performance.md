# performance 렌즈 — 모바일 성능 예산 실측

**대상:** `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (세션 전용 clone, HEAD `7616211` = 부모가 지시한 `a5aec95` 위의 빈 마커 커밋). 저장소 파일 수정 0건 — `git status --porcelain` 빈 출력으로 확인했다.

**방법.** 이 렌즈의 판정은 대부분 **실측**이다. 저장소를 `scratchpad/perfbuild/` 로 복사해 그곳에서 `next build` + `next start -p 4731` 를 돌리고(저장소 디렉터리에는 `.next/` 를 만들지 않았다), Playwright chromium 을 390×844 · DPR 3 · `hasTouch` · `isMobile` 컨텍스트로 붙여 CDP `Network.emulateNetworkConditions` + `Emulation.setCPUThrottlingRate(4)` 아래에서 쟀다. 프로브 스크립트는 전부 scratchpad 안에 있다 — `probe-perf.mjs` · `probe-throttle.mjs` · `probe-fontshift.mjs` · `probe-inp.mjs` · `probe-resize.mjs` · `probe-frames.mjs` · `probe-theme.mjs` · `probe-prefetch.mjs` · `probe-nav.mjs` · `probe-transition.mjs` · `probe-ingress.mjs` · `probe-lcp.mjs` · `probe-reflow.mjs` · `probe-spacing.mjs` · `probe-weights.mjs` · `modsize.mjs` · `motionsize.mjs` · `measure.mjs` · `woff2.mjs`.

**측정 환경의 한계를 먼저 적는다.** headless chromium 은 macOS 에서 SwiftShader 소프트웨어 래스터라이저를 쓴다. 따라서 **합성·래스터 비용에 대한 절대값은 신뢰할 수 없고**, 아래에서 `backdrop-filter` 와 테마 전환을 결함으로 올리지 않은 이유가 그것이다 — 둘 다 A/B 를 돌렸으나 유의한 차이가 나오지 않았고, 차이가 없다는 것을 증명한 게 아니라 **이 환경에서는 잴 수 없다**는 것이므로 결함으로 만들지 않았다. 반대로 네트워크·JS 실행·강제 레이아웃·리소스 타이밍은 래스터와 무관하므로 아래 수치는 그대로 유효하다. 실기기(iOS Safari · Android Chrome) 측정은 하지 않았다.

**네트워크 프로파일 정의.** `4G` = 9 Mbps / 170 ms RTT · `Fast 3G` = 1.6 Mbps / 562 ms RTT(Chrome DevTools 프리셋과 같은 값) · `Slow 3G` = 400 kbps / 2000 ms RTT · `3G+(700ms)` = 1.6 Mbps / 700 ms RTT. CPU 는 전부 4× throttle.

---

## 0. 실측 요약 — 모바일 랜딩 1회 방문의 전송량

| 항목 | 압축 후(전송) | 비고 |
|:---|---:|:---|
| HTML (`/kr`) | 11,549 B | raw 83,438 |
| JS (모던 브라우저가 실제로 받는 것) | 220,960 B | script 태그 15개 중 `03~yq9q893hmn.js` 는 `noModule` 이라 받지 않는다 |
| CSS | 13,549 B | 2개 파일, raw 79,355 |
| 썸네일 SVG 8장 | 5,240 B | 391–2,004 B |
| **`PretendardVariable.woff2`** | **2,057,688 B** | 전 라우트 공통 |
| **합계** | **≈ 2,308,986 B (2.20 MiB)** | **폰트가 89.1%** |

JS 내역(gzip, 실측): react-dom 70,728 · Next 클라이언트 런타임 37,332 · 랜딩 상호작용 청크 33,088 · next-intl 13,318 · GNB 11,386 · 기타. 테스트 라우트는 여기에 **motion 48,564** 가 더 붙어 235,695 B 가 된다.

---

## 1. `transition-budget-fails-on-3g` — 랜딩→테스트 전환이 자기 예산(1600 ms)을 3G 에서 넘고, 넘으면 사용자의 답을 조용히 버린다 · **blocker**

`src/features/transition/constants.ts:1` 이 `LANDING_TRANSITION_TIMEOUT_MS = 1600` 을 정하고, `src/features/transition/transition-runtime-monitor.tsx:20-26` 이 그 시각에 `terminatePendingLandingTransition({signal:'transition_fail', resultReason:'DESTINATION_TIMEOUT'})` 를 쏜다. 완료는 목적지가 `runtimeReady` 가 된 뒤 rAF 한 프레임 뒤에 난다(`src/features/test/use-landing-transition-completion.ts:22-29`).

`landing:transition-signal` 커스텀 이벤트(`src/features/transition/signals.ts:5`)를 구독해 `transition_start` → 종료 신호까지의 실경과를 쟀다. 각 조건 2회, 로컬 서버(서버 지연 0)·따뜻한 캐시 상태다.

| 네트워크 | 실측 경과 | 예산 대비 |
|:---|---:|:---|
| 4G (170 ms RTT) | 516 / 513 ms | 여유 1,084 ms |
| Fast 3G (562 ms RTT) | **1,554 / 1,556 ms** | **여유 44 / 46 ms (2.8%)** |
| 3G+ (700 ms RTT) | **1,600 / 1,600 ms → `transition_fail` / `DESTINATION_TIMEOUT`** | **2/2 실패** |

실패는 사용자에게 오류로 보이지 않는다. `terminatePendingLandingTransition` 이 `rollbackLandingTransition({variant})` 를 호출하고(`runtime.ts:114`), 그것이 `SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y` · `LANDING_RETURN_VARIANT` · `variantSessionKeys.landingIngress(variant)` 를 지운다(`src/features/transition/store.ts:216-223`). 사용자 화면에서의 결과를 그대로 쟀다.

| 네트워크 | 도착 URL | 문항 번호 | progress | 남은 세션 키 |
|:---|:---|:---|:---|:---|
| Fast 3G (562 ms) | `/en/test/qmbti` | **Q2** | 1 | ingress 3개 보존 |
| 3G+ (700 ms) | `/en/test/qmbti` | **Q1** | 0 | **[]** |

즉 700 ms RTT 에서는 **랜딩 카드에서 A/B 를 고른 행위가 사라지고 사용자는 같은 문항을 다시 답해야 한다.** 랜딩 복귀 스크롤도 함께 버려진다. 700 ms RTT 는 혼잡한 모바일망에서 드물지 않다.

원인은 대역폭이 아니라 왕복이다. 목적지 RSC 페이로드는 **1,710 B** 에 불과하고(실측), 시간의 거의 전부가 RTT 다. 그리고 **테스트 목적지는 한 번도 prefetch 되지 않는다** — 테스트 카드는 `<Link>` 가 아니라 `router.push` 경로이고(`src/features/transition/use-landing-transition.ts:24-39`), 저장소 전체에 `router.prefetch` 호출이 0건이다. 반면 블로그 카드는 `<Link>`(`landing-grid-card.tsx:1171`)여서 뷰포트 진입 시 **카드당 2회** prefetch 된다(실측: 3개 링크 → 6 요청). 예산을 쓰는 쪽은 prefetch 가 없고, 여유가 있는 쪽은 두 번 받는다.

**제안.** ⑴ 확장 카드가 OPEN 이 되는 순간(또는 카드가 뷰포트에 들어오는 순간) 해당 `/{locale}/test/{variant}` 를 `router.prefetch()` 한다 — RSC 1.7 KB 를 탭 이전에 받아 두면 Fast 3G 경과가 왕복 1회분(≈560 ms) 줄어 예산 여유가 44 ms 에서 600 ms 대가 된다. ⑵ `LANDING_TRANSITION_TIMEOUT_MS` 를 고정 1600 ms 대신 `navigator.connection.effectiveType`/`rtt` 기반으로 최소 1600 ms · 최대 5000 ms 범위로 조정하거나, 타임아웃을 「실패 확정」이 아니라 「진행 표시 전환」으로 재정의한다. ⑶ 타임아웃이 나더라도 `landingIngress:{variant}` 만은 지우지 않는다 — 지금의 rollback 은 전환 연출 상태와 사용자 입력을 같은 키셋으로 묶어 버린다. 이 셋 중 ⑶ 이 가장 작고 가장 급하다.

---

## 2. `font-2mb-unsubset-unpreloaded` — 2.0 MB 폰트가 페이지 무게의 89%를 차지하고, Fast 3G 에서 11.1초 동안 회선을 점유하며, 그 절반은 제품이 쓰지 않는 가변축이다 · **blocker**

`public/fonts/PretendardVariable.woff2` = **2,057,688 B**(`ls -l`). 선언은 `src/app/globals.css:31-37` — `font-weight: 45 920` · `font-display: swap` · preload 없음. `src`·`public`·`next.config.ts` 어디에도 `rel="preload"` 가 없다(렌더된 HTML 의 preload 힌트는 `theme-bootstrap.js` 하나뿐, 실측).

**전송 시간 실측** (`document.fonts.ready` 와 resource timing 양쪽):

| 네트워크 | 폰트 요청 시작 | 종료 | 전송 소요 | FCP | **FOUT 창**(FCP→swap) |
|:---|---:|---:|---:|---:|---:|
| 4G | 406 ms | 2,545 ms | 2,139 ms | 468 ms | **2,180 ms** |
| Fast 3G | 1,351 ms | 12,484 ms | **11,133 ms** | 1,392 ms | **11,092 ms** |
| Slow 3G | — | — | 산술 40.2 s (2,057,688 / 51,200 B/s) | — | 프로브가 완주하지 못해 미실측 |

Fast 3G 워터폴에서 더 나쁜 사실 하나. CSS·JS 는 573–582 ms 에 preload 스캐너가 함께 띄우는데, **폰트가 1,351 ms 부터 11초간 회선을 물고 있어서** 총 5.2 KB 밖에 안 되는 썸네일 SVG 8장이 3,080–3,980 ms 에야 끝난다. LCP 요소가 그 썸네일이라 LCP 가 3,540 ms 가 된다(§6 참조).

**CLS 는 0 이다 — 이건 결함이 아니다.** 폰트를 6초 지연시켜 fallback 렌더를 붙잡아 두고 swap 전후의 `scrollHeight` 와 카드 8장의 top/height 를 전수 비교했다: 전부 바이트 동일, `layout-shift` 엔트리 0건, CLS 0.00000. 다만 이 측정은 macOS 의 fallback(`Apple SD Gothic Neo`, `globals.css:225` 스택 순서)에서 나온 것이다. Android 의 fallback(`Roboto`/`Noto Sans KR`)에서도 메트릭이 일치하는지는 **미확인**이다.

**subset 이 가능한가 — 가능하다. 어디를 깎을지가 이미 수치로 나온다.** woff2 헤더의 `totalSfntSize` 는 **6,759,776 B** 이고(브라우저는 2.0 MB 를 받아 6.76 MB 로 풀어 메모리에 올린다), 테이블 디렉터리를 파싱한 원본 길이 분포는 다음과 같다.

| 테이블 | origLength | 비중 |
|:---|---:|---:|
| `gvar` (가변축 델타) | 3,539,916 | **52.4%** |
| `glyf` (글리프 아웃라인) | 2,687,116 | **39.8%** |
| `GPOS` | 186,056 | 2.8% |
| `post` (글리프 이름) | 150,508 | 2.2% |
| 나머지 12개 합 | 196,180 | 2.9% |

`loca` 가 59,032 B 이므로 글리프 수는 약 14,757 개다. **그리고 제품은 4개의 이산 weight 만 렌더한다** — 7개 표면(`/kr` · `/kr/blog` · `/kr/blog/ops-handbook` · `/kr/history` · `/kr/test/qmbti` · `/kr/test/error` · 404)의 텍스트 보유 요소 전수를 `getComputedStyle` 로 훑은 결과 나온 값은 **400 / 500 / 600 / 700 뿐**이다(각각 103 · 44 · 103 · 11 요소). 토큰도 같다(`globals.css:205-222` 의 `--h1:700` · `--h3:600` · `--body:400` · `--label:500` 등). 저장소 전체에 `font-variation-settings` 가 0건이고 weight 를 애니메이션하는 코드도 0건이다. **즉 파일의 52.4% 를 차지하는 `gvar` 는 이 제품이 한 번도 쓰지 않는 자유도를 위해 실려 있다.**

**제안 — 세 갈래, 서로 독립적이고 셋 다 병행 가능하다.**
1. **가변축 제거.** 400/500/600/700 네 static instance 로 인스턴싱하거나 축을 `400 700` 으로 좁힌다. `gvar` 가 통째로 빠지고 `post` 도 format 3.0 으로 내려간다 — 압축 전 기준 54.6% 감소.
2. **`unicode-range` 분할.** 같은 `font-family: 'Pretendard Variable'` 이름을 유지한 채 `@font-face` 를 Latin / Latin-ext / 한글 / 가나 / CJK 구간으로 쪼갠다. `--font-sans` 토큰(미러 구간 안)은 가족 이름만 말하므로 **건드리지 않아도 되고**, `@font-face` 는 `@mirror-begin/@mirror-end` **밖**(`globals.css:31-37`, 주석 :17-20 이 명시)이라 `design-tokens-dark-parity` 가드에도 걸리지 않는다. 이렇게 하면 `/en` 방문자는 한글 구간을 받지 않는다. `globals.css:26-28` 이 이미 이 해법을 적어 두고 "assets this repository does not have" 로 막아 두었는데, 그 asset 은 `pyftsubset` 한 번으로 생성되며 `package.json` 의 `scripts` 에 생성 단계를 넣으면 두 쪽이 갈라질 여지도 닫힌다.
3. **현재 로케일이 실제로 필요한 슬라이스만 `<link rel="preload" as="font" type="font/woff2" crossorigin>` 한다.** 지금은 CSS 파싱 → 레이아웃 → 폰트 요청이라 Fast 3G 에서 발견이 1,351 ms 로 밀린다. 분할 후 슬라이스 하나(수십 KB)를 preload 하면 발견이 ~575 ms 로 당겨지고 FOUT 창이 두 자릿수 ms 로 떨어진다.

**게이트 주의.** theme-matrix baseline 164장은 캡처 전에 `document.fonts.ready` 를 기다리므로(`theme-matrix-smoke.spec.ts:142`) 폰트가 바뀌면 글리프 메트릭 변화만큼 붉어진다. `unicode-range` 분할만 하고 글리프 자체를 보존하면 영향이 없고, static instancing 은 서브픽셀 차이로 `threshold 0.01 / maxDiffPixels 20`(`playwright.config.ts:16-22`)을 넘길 수 있다 — 재생성은 `qa:visual:full` 이고 사람 승인 대상이다(`AGENTS.md:134`).

---

## 3. `motion-package-for-one-translate` — 18 px 이동 하나를 위해 40 KB(gzip) / 120 KB(parse) 의 motion 이 테스트 플로우에 실린다 · **major**

`motion@12.34.0` 의 사용처는 저장소 전체에서 단 한 곳이다 — `src/features/test/test-question-client.tsx:5` 의 `import {motion, useReducedMotion} from 'motion/react'`. 소비는 `:353-358` 의 `<motion.div key={currentQuestionIndex} initial={{x: answerGridInitialX}} animate={{x: 0}} transition={prefersReducedMotion ? {duration:0} : {duration:0.18, ease:'easeOut'}}>` 하나, 그리고 `:112` 의 `useReducedMotion()` 이다. 이동량은 18 px(`:358` 문맥의 `answerGridInitialX`), 지속은 180 ms.

esbuild 로 각 import 를 번들·minify·gzip 해 실제 기여를 쟀다.

| import | minified | gzip |
|:---|---:|---:|
| `{motion, useReducedMotion} from 'motion/react'` | 120,366 | **40,069** |
| `{useReducedMotion} from 'motion/react'` 만 | 353 | **249** |
| `{animate} from 'motion/mini'` | 7,824 | 3,119 |

실제 빌드에서도 확인된다 — `motion` 은 `/kr/test/qmbti` 에만 실리는 청크 `08emd3kt~soo-.js`(152,814 raw / **48,564 gz**)에 들어 있고, 그 라우트의 모던 JS 총량 235,695 B 의 **20.6%** 다. 테스트 플로우는 모바일 사용자가 가장 오래 머무는 표면이고, 첫 문항이 뜨기 전에 120 KB 를 파싱해야 한다.

저장소는 같은 일을 이미 CSS 로 하고 있다 — `landing-grid-card.module.css` 에 `@keyframes` 13개가 있고 `motion-reduce:` 유틸리티가 12곳에 붙어 있다. `prefers-reduced-motion` 도 `use-landing-interaction-controller.ts:207` 이 이미 `matchMedia` 로 읽는다.

**제안.** `<motion.div>` 를 `key` 로 리마운트되는 평범한 `<div>` + CSS `@keyframes test-answer-slide-in {from{transform:translateX(var(--answer-slide-from))} to{transform:translateX(0)}}` (180 ms, `ease-out`)로 바꾸고 `motion-reduce:[animation:none]` 을 붙인다. `useReducedMotion()` 은 `motion/react` 에서 249 B 만 가져오거나(트리셰이킹이 되면) 저장소가 이미 가진 `matchMedia` 경로를 재사용한다. `package.json` 의 `motion` 의존성 자체가 제거 가능해진다 — 그때 40,069 B gzip / 120,366 B parse 가 통째로 사라진다.

---

## 4. `consent-banner-raf-loop-while-open` — 모바일 카드가 열려 있는 동안 60 fps 상시 루프가 돈다 · **major**

`src/features/landing/shell/consent-banner.tsx:186-204` 의 `runFrame` 은 `[data-consent-banner-avoid]` 표식이 DOM 에 하나라도 있으면 **매 프레임** 스스로를 다시 예약하고, 매번 배너의 `getBoundingClientRect()` + 모든 표식 요소의 `getBoundingClientRect()` 를 읽은 뒤 `setIsOccluding()` 을 호출한다. 같은 파일 `:182-185` 의 주석이 이 설계의 전제를 스스로 적는다 — 「확장은 hover 로 소멸하는 **일시** 상태이므로 루프도 그동안만 존재한다」.

**모바일에서 그 전제가 깨진다.** 표식은 모바일 확장 본문에도 붙고(`landing-grid-card.tsx:1229`) 모바일 transient shell 에도 붙는데(`:1261`), 모바일 OPEN 은 사용자가 X 를 누를 때까지 지속된다(닫기 경로는 X 또는 backdrop 뿐, `docs/req-landing.md:632`).

390×844 · CPU 4× throttle 에서 `getBoundingClientRect` / `requestAnimationFrame` 을 계측해 **사용자 입력이 전혀 없는 2초 구간**을 쟀다.

| 상태 | `getBoundingClientRect()` | `requestAnimationFrame()` |
|:---|---:|---:|
| 카드 닫힘, idle 2 s | **0** | **0** |
| 카드 닫힘, 8×300 px 스크롤 | **0** | **0** |
| **카드 OPEN, idle 2 s** | **302** | **151** |

151 rAF/2 s = 약 75 fps 로 루프가 돌고 프레임마다 2회의 레이아웃 읽기가 일어난다. 배터리와 열 관점에서 이것은 「일시 상태」가 아니라 상시 부하다.

같은 effect 의 `:218-223` 은 `MutationObserver` 를 `document.body` 에 `{subtree:true, childList:true, attributes:true, attributeFilter:[...]}` 로 건다. `attributeFilter` 가 속성 쪽은 좁히지만 **`childList` + `subtree` 는 좁혀지지 않아** 문서 어느 곳의 DOM 추가·삭제든 콜백이 돌고, 콜백은 매번 `document.querySelector(CONSENT_BANNER_AVOID_SELECTOR)` 로 문서를 훑는다. 배너는 `PageShell` 안에 있어 **전 표면**에 마운트된다.

**제안.** ⑴ 프레임 루프를 `IntersectionObserver`(root = viewport, 배너 사각형을 `rootMargin` 으로 표현) 또는 표식 요소의 `ResizeObserver` + 스크롤 `passive` 리스너 + rAF **throttle** 로 바꿔 「매 프레임」을 「변화가 있을 때」로 만든다. ⑵ 그것이 어렵다면 최소한 모션이 끝난 정지 상태에서는 루프를 멈춘다 — `data-mobile-phase="OPEN"` 처럼 정지 상태를 아는 신호가 이미 shell 의 data 속성에 있다(`landing-catalog-grid.tsx` 의 `data-mobile-phase`). ⑶ `MutationObserver` 의 관찰 대상을 `document.body` 에서 랜딩 그리드 shell 로 좁힌다 — 표식을 다는 곳은 `landing-grid-card.tsx:863 · 1229 · 1261` 셋뿐이고 전부 그 shell 안이다.

---

## 5. `mobile-dead-geometry-measurement` — 모바일에서 결과가 상수인 측정 파이프라인이 카드마다 돈다 · **major**

두 개의 측정 기계가 모바일에서도 그대로 돌고, 둘 다 **모바일에서는 답이 상수임이 코드로 증명된다.**

**(a) 행 보정(row compensation).** `use-grid-geometry-controller.ts:163-166` 의 중단 조건은 `mobileLifecyclePhase !== 'NORMAL' || (plan.tier !== 'mobile' && (...))` 이다 — `plan.tier === 'mobile'` 이고 phase 가 NORMAL 이면 **중단되지 않는다**. 그 아래 `measure()`(`:170-256`)는 행마다 `querySelector` + `querySelectorAll` 을 돌고 카드마다 `contentRect` · `tagsRect` 두 번의 `getBoundingClientRect()` 를 읽는다. 그런데 모바일은 항상 1열이고(`layout-plan.ts:81-87`), 1열이면 `buildRowCompensationModel`(`spacing-plan.ts:117-145`)에서 `rowMaxNaturalHeight === measurement.naturalHeight` 라 `delta = 0` → `needsComp = false` → `compGap = 0` 이 **항상** 나온다.

실제로 렌더해 카드 8장의 data 속성을 읽어 확인했다.

| 뷰포트 | `data-comp-gap` | `data-needs-comp` | `nat === rowMax` |
|:---|:---|:---|:---|
| 390×844 | 8장 전부 **0** | 8장 전부 **false** | 8장 전부 **일치** |
| 1440×900 | qmbti 22 · energy-check 22 · 나머지 0 | 2장 true | 2장 불일치 |

**(b) 확장 스케일.** `landing-grid-card.tsx:992-997` 이 카드마다 `useCardExpandedScale` 을 부르고, 그 `measure()`(`use-card-inline-geometry.ts:100-119`)는 `root.getBoundingClientRect()` 와 `getComputedStyle(root).getPropertyValue('--landing-card-stage-shadow-bleed-x')` 를 읽는다. 그런데 `resolveLandingExpandedScale`(`layout-plan.ts:123-129`)은 tier 가 desktop 도 tablet 도 아니면 `desiredFinalScale = 1` 을 주고, `resolvedFinalScale = Math.min(1, maxSurfaceScale)` 인데 `maxSurfaceScale = 1 + stageOutset/rootWidth ≥ 1` 이므로 **모바일에서는 측정값과 무관하게 항상 1** 이다.

**비용 실측.** 390×844 에서 뷰포트 **높이만** 6회 바꿔(모바일 주소창 접힘/펼침의 등가물 — 이 경우 `window.innerWidth` 도 `clientWidth` 도 변하지 않아 모든 결정이 그대로다) 계측했다.

| 조작 | `getBoundingClientRect()` | `getComputedStyle()` | `requestAnimationFrame()` |
|:---|---:|---:|---:|
| 높이만 6회 변경 | **318** (회당 53) | **192** (회당 32) | 108 |
| 가로 회전 844×390 | 221 | 92 | 64 |
| 되돌리기 390×844 | 117 | 60 | 47 |

회당 32회의 `getComputedStyle` 은 스타일 재계산을 강제한다. 모바일 브라우저는 스크롤 방향이 바뀔 때마다 주소창 높이를 바꾸고 그때마다 `resize` 가 발화하는데, `use-grid-geometry-controller.ts:283` · `use-card-inline-geometry.ts:148` · `:246` 세 곳이 각각 `window.addEventListener('resize', …)` 를 건다.

**제안.** ⑴ `use-grid-geometry-controller.ts:163-166` 의 중단 조건에 `plan.tier === 'mobile'` 을 추가해 1열에서는 측정 자체를 걸지 않고 `compGap` 을 0 으로 고정한다. ⑵ `useCardExpandedScale` 은 `viewportTier === 'mobile'` 일 때 `resolveLandingExpandedScale({...,normalRootWidthPx:0,availableStageOutsetPx:0})` 를 즉시 반환하고 effect 를 걸지 않는다 — 이미 `reducedMotion` 에 대해 같은 early-return 이 `use-card-inline-geometry.ts:169-176` 에 있으므로 패턴은 존재한다. ⑶ `resize` 리스너 3벌을 하나의 공유 뷰포트 스토어(`useSyncExternalStore`)로 합치고 **높이 변화는 무시**한다 — 폭이 안 바뀌면 이 저장소의 어떤 레이아웃 결정도 바뀌지 않는다(`measureGridInlineSize` 는 `clientWidth` 만 읽는다, `landing-catalog-grid.tsx:40-42`).

**게이트 주의.** `scripts/qa/check-phase9-performance-contracts.mjs:71-89` 가 `new ResizeObserver(scheduleMeasure)` · `new ResizeObserver(scheduleSettledMeasure)` · `frameRef.current = requestAnimationFrame` 문자열의 **존재**를 요구하고, `check-phase6-spacing-contracts.mjs` 가 `buildRowCompensationModel` / `deriveNaturalHeightFromGeometry` / ResizeObserver / RAF / `document.fonts.ready` 를 요구한다. 조기 반환을 넣어도 그 문자열들은 남으므로 초록으로 통과하겠지만, **그것은 이 게이트가 동작이 아니라 철자를 본다는 뜻**이지 안전하다는 뜻이 아니다.

---

## 6. `lcp-thumbnail-lazy-no-priority` — LCP 요소가 `loading="lazy"` 이미지다 · **major**

모바일 랜딩의 LCP 요소는 실측으로 카드 썸네일 `<img>` 다 — `/kr` 에서 `landing-card-media/rhythm-b/thumbnail.svg`, `/en` 에서 `landing-card-media/qmbti/thumbnail.svg`, 둘 다 `tag: IMG.landing-grid-card-thumbnail.object-cover`.

`landing-grid-card.tsx:425-432` 의 `<Image className=… src=… alt="" fill sizes="100vw" unoptimized />` 에는 `priority` 가 없다. `next/image` 의 기본은 `loading="lazy"` 이고, 렌더된 HTML 이 그대로다(실측): `<img alt="" loading="lazy" decoding="async" data-nimg="fill" … src="/landing-card-media/qmbti/thumbnail.svg"/>`. **`srcset` 도 `sizes` 도 emit 되지 않는다** — `unoptimized` 가 optimizer 를 끄면서 srcset 생성도 끄기 때문에, `:430` 의 `sizes="100vw"` 는 렌더에 도달하지 않는 죽은 prop 이다.

Fast 3G 워터폴 실측이 대가를 보여 준다.

| 리소스 | 요청 시작 | 종료 |
|:---|---:|---:|
| CSS 2개 | 573 / 574 ms | 1,326 / 1,184 ms |
| JS 15개 | 580–582 ms | 1,199–3,408 ms |
| 폰트 (2.0 MB) | 1,351 ms | 12,484 ms |
| 썸네일 8장 (합 5.2 KB) | **1,388–1,389 ms** | **3,080–3,980 ms** |
| **LCP** | | **3,540 ms** |

`<img>` 가 SSR HTML 에 이미 들어 있는데도 요청이 1,388 ms 로 밀린 것은 **preload 스캐너가 `loading="lazy"` 이미지를 건너뛰기 때문**이다 — CSS 대비 **815 ms 의 발견 지연**. 그 뒤 5.2 KB 를 받는 데 1.7–2.6 초가 걸린 것은 §2 의 2 MB 폰트와 회선을 나눠 쓰기 때문이다.

**제안.** ⑴ 첫 행(모바일에서는 첫 카드)의 썸네일에 `priority`(= `loading="eager" fetchPriority="high"`)를 붙인다 — `sequence === 0` 이 이미 카드 prop 으로 내려와 있으므로(`landing-catalog-grid.tsx` 의 `sequence={sequence}`) 조건은 공짜다. preload 스캐너가 ~575 ms 에 집어 가면 LCP 가 3,540 ms 에서 1,500 ms 대로 내려간다. ⑵ 죽은 `sizes="100vw"` 를 지우거나, `unoptimized` 를 걷고 `next.config.ts` 에 `images.dangerouslyAllowSVG` + `contentSecurityPolicy` 를 두어 srcset 을 실제로 살린다 — 다만 원본이 391–2,004 B 의 SVG 이므로 **⑵ 의 이득은 거의 없고 ⑴ 이 이 항목의 전부다**. ⑶ 나머지 7장은 `loading="lazy"` 를 유지한다(390 px 1열에서 첫 화면에 들어오는 것은 1장뿐이다 — 첫 카드 top 315 px, 카드 높이 255 px).

---

## 7. `ssr-desktop-plan-double-work` — 모든 폰이 데스크톱 3열 계획을 하이드레이션한 뒤 버리고 다시 만든다 · **major**

`landing-catalog-grid.tsx:28` 의 `INITIAL_VIEWPORT_WIDTH = 1280` 과 `:53` 의 `useState<number>(INITIAL_VIEWPORT_WIDTH)` 때문에, 모바일 기기가 받는 SSR HTML 이 데스크톱 계획을 선언한다(실측, `/en`):

```
data-grid-tier="desktop"  data-grid-column-mode="desktop-wide"
data-row1-columns="3"     data-grid-inline-size="1232"   data-measured="false"
data-card-viewport-tier="desktop" × 8
```

그 뒤 `:119-158` 의 `useLayoutEffect` 가 `window.innerWidth` 를 읽어 모바일로 재계획하고, 그 결과 카드 하위의 geometry 훅들이 전부 언마운트·재마운트된다. 계측된 비용:

| 지표 | 실측 | 정상 상태에 필요한 수 |
|:---|---:|---:|
| `new ResizeObserver()` 호출 | **43–44** | ~24 (카드 8 × [inline-geometry 2 + expanded-scale 1] = 24, 여기에 grid/catalog 각 1) |
| `observe()` 호출 | **73–89** | ~40 |
| 로드 구간 `getBoundingClientRect()` | **137** | — |
| 로드 구간 long task | 54 / 73 / 59 ms (4× throttle) | — |

시각적 CLS 는 0 이다 — `landing-catalog-grid.module.css:26-34` 의 컨테이너 쿼리 게이트가 그 일을 이미 했고, 그 파일 주석이 수정 전 실측(CLS 0.13647@390×812)을 적어 두었다. **그러니 이 항목은 CLS 결함이 아니라 JS 작업량 결함이다.** 컨테이너 쿼리는 픽셀을 가렸을 뿐 이중 계획 자체를 없애지는 못했다.

**제안.** ⑴ 서버가 이미 아는 것을 쓴다 — `src/proxy.ts` 가 단일 요청 진입점이므로 `Sec-CH-UA-Mobile` / `Sec-CH-Viewport-Width`(Client Hints) 를 읽어 헤더로 주입하고, 랜딩 서버 컴포넌트가 그것으로 초기 tier 를 정한다. 힌트가 없으면 지금의 중립값을 쓴다 — **비결정 API 를 쓰지 않으므로 §11.1(`docs/req-landing.md:741`)을 위반하지 않는다**(헤더는 이미 `layout.tsx:19-20` 이 locale 에 대해 하는 일과 같은 종류다). ⑵ 그것이 과하면, 최소한 첫 계획이 확정되기 전에는 카드별 geometry 훅의 observer 부착을 미룬다 — `data-measured="true"` 플립(`landing-catalog-grid.tsx:166-168`) 이후로 한 프레임 늦추면 재마운트 한 벌이 통째로 사라진다.

**게이트 주의 — 이 동작은 테스트가 계약으로 못 박고 있다.** `tests/e2e/grid-smoke.spec.ts:2351-2353` 이 `expect(probe.plans.length).toBeGreaterThan(1)` · `expect(probe.plans[0]).toBe('desktop|desktop-wide')` 를 단언한다. 즉 **이중 계획을 없애면 이 테스트가 붉어진다** — 고칠 때 이 단언도 함께 개정해야 하고, CLS < 0.05 단언(`:2357`)은 그대로 남겨야 한다. `scripts/qa/check-phase9-performance-contracts.mjs:41-46` 의 `useState<number>(INITIAL_VIEWPORT_WIDTH)` 요구와 `tests/unit/landing-grid-first-paint.test.ts` 도 함께 움직인다.

---

## 8. `mobile-expand-animates-layout-props` — 모바일 확장/축소가 `left` · `width` 를 애니메이션한다(§11.2 와 정면 충돌) · **major**

`docs/req-landing.md:755` 는 「Expanded 관련 모션은 transform/opacity 중심으로 구성한다」고 정한다. 모바일 경로는 그렇지 않다.

`landing-grid-card.module.css:527-553` 의 `@keyframes landing-card-mobile-open-shell` / `landing-card-mobile-close-shell` 는 `left` · `width` · `border-radius` 를 보간한다. 이것을 소비하는 것은 `:330-336` 의 `.transientShell.transientOpening` / `.transientClosing` 이고, 그 요소는 `landing-grid-card.tsx:1257-1290` 의 `position: fixed` 전폭 패널이다(`LANDING_GRID_CARD_MOBILE_TRANSIENT_SHELL_CLASSNAME`, `:292`). `left` 와 `width` 는 레이아웃 속성이라 매 프레임 리플로를 유발하고, `will-change` 는 그 비용을 없애지 못한다(데스크톱 쪽 `:270` 에 `will-change-[left,width]` 가 붙어 있는 것이 이 오해의 흔적이다). 데스크톱 경로도 같은 문제를 갖는다(`:431-463` `landing-card-shell-frame-expand/collapse`).

측정: 카드 탭 직후 **84.7 ms 짜리 프레임 1개**(4× CPU throttle, rAF 델타 실측)와 **103 ms long task** 1개. 그 뒤 280 ms 동안 프레임 델타가 25–26 ms 로 올라가는 구간이 반복된다. 소프트웨어 래스터 환경이므로 절대값은 참고치이지만, **속성 분류(left/width = layout-triggering)는 환경과 무관한 사실**이다.

같은 절의 `docs/req-landing.md:756`(「비확장 row 재계산 유발 구현을 금지한다」)도 모바일에서 성립하지 않는다. 모바일 확장은 in-flow 이므로(`docs/req-landing.md:625` 가 그렇게 **요구**한다) 카드를 열면 뒤 카드가 전부 움직인다 — 실측: qmbti 카드를 열자 뒤 7장이 전부 **+30 px** 이동하고 `scrollHeight` 가 3,173 → 3,203 이 되었다. §8.5 와 §11.2 가 서로를 배제한다.

**제안.** ⑴ transient shell 의 `left`/`width` 보간을 `transform: translateX(...) scaleX(...)` + `transform-origin` 으로 교체한다 — 시작/끝 사각형이 둘 다 알려져 있으므로(`--landing-mobile-card-left` · `--landing-mobile-card-width` 가 이미 JS 에서 주입된다, `landing-grid-card.tsx:1162-1165`) FLIP 변환으로 정확히 같은 궤적을 합성 전용으로 만들 수 있다. `border-radius` 는 별도 `transition` 으로 남기거나 마스크로 처리한다. ⑵ §11.2 의 두 조항을 개정한다 — 755 는 「transform/opacity 중심」을 「레이아웃 속성(`left/top/width/height/margin`) 보간 금지」로 측정 가능하게 다시 쓰고, 756 은 모바일 in-flow 확장을 명시적 예외로 등재하거나(그러면 §8.5 가 우선), 반대로 §8.5 를 시트로 바꿔 in-flow 를 버린다 — 어느 쪽이든 **지금처럼 두 조항이 서로를 부정한 채로 둘 수는 없다**.

---

## 9. `perf-section-has-no-budget` — §11 Performance Constraints 에 측정 가능한 예산이 하나도 없고, 유일한 CLS 게이트는 릴리스 게이트 밖에 있다 · **major**

`docs/req-landing.md:737-765` 의 §11 은 13개 조항인데 전부 ⑴ SSR/hydration 결정성(§11.1, 741-751) ⑵ 애니메이션 속성 선택(§11.2, 755-757) ⑶ reduced-motion 과 커서 정책(§11.3, 760-765)이다. **바이트 예산 · 시간 예산 · LCP/CLS/INP 목표 · 폰트 예산 · 요청 수 예산이 한 줄도 없다.** 이 문서에서 이번 렌즈의 실측치(폰트 2.0 MB · 랜딩 JS 221 KB · Fast 3G LCP 3,540 ms · 전환 여유 44 ms) 중 어느 하나도 위반할 수 있는 조항이 존재하지 않는다.

검사 쪽도 같다. 저장소 전체에서 LCP·INP·번들 크기를 단언하는 검사는 0건이다(`tests/` · `scripts/` 전수 grep). CLS 를 보는 단언은 정확히 하나 — `tests/e2e/grid-smoke.spec.ts:2285-2361`, 390×812 `/en` 에서 `cumulativeLayoutShift < 0.05`. 그런데 그 테스트는 `@smoke` 태그이고 `package.json:19` 의 `test:e2e:gate` 는 `--grep @gate` 이므로 **릴리스 게이트에 들어가지 않는다**. `.github/workflows/` 에는 `sync.yml` 하나뿐이라 **CI 에서 build·test·e2e 를 도는 워크플로가 아예 없다.**

`scripts/qa/check-phase9-performance-contracts.mjs` 는 이름이 performance 지만 내용은 전부 **문자열 존재 검사**다 — `useState<number>(INITIAL_VIEWPORT_WIDTH)` 가 있는가, `new ResizeObserver(scheduleMeasure)` 가 있는가, `package.json` 에 `test:e2e:smoke` 명령 문자열이 그대로 있는가. 어떤 수치도 재지 않는다.

**제안.** §11 에 측정 가능한 소절을 신설한다 — ⑴ **전송 예산**: 랜딩 최초 방문의 압축 후 총합 ≤ 400 KB(폰트 포함), 그중 폰트 ≤ 120 KB / 로케일, 라우트별 모던 JS ≤ 180 KB. ⑵ **시간 예산**: Fast 3G(1.6 Mbps / 562 ms RTT) + CPU 4× 에서 LCP ≤ 2,500 ms · CLS ≤ 0.05 · 랜딩→테스트 전환 완료 ≤ `LANDING_TRANSITION_TIMEOUT_MS × 0.6`. ⑶ **게이트**: 위 세 값을 재는 Playwright 스펙을 `@gate` 로 달아 `test:e2e:gate` 에 넣고, 번들 예산은 `next build` 산출물의 라우트별 script 태그 합계를 세는 vitest 로 고정한다(이 문서가 쓴 `measure.mjs` 가 그 원형이다). ⑷ 기존 CLS 단언에 `@gate` 를 추가한다 — 한 글자 수정으로 유일한 성능 회귀망이 릴리스 게이트 안으로 들어온다.

---

## 10. `public-assets-no-cache-headers` — 2 MB 폰트가 `max-age=0` 으로 나가 매 내비게이션마다 재검증한다 · **major**

`next start` 로 뜬 프로덕션 서버의 응답 헤더 실측:

| 경로 | `Cache-Control` |
|:---|:---|
| `/fonts/PretendardVariable.woff2` | **`public, max-age=0`** |
| `/landing-card-media/qmbti/thumbnail.svg` | **`public, max-age=0`** |
| `/_next/static/chunks/0v9c2uadhpd-i.js` | `public, max-age=31536000, immutable` |

`next.config.ts` 전문에 `headers()` 가 없다(파일 18줄 전수 확인 — `typedRoutes` · `outputFileTracingRoot` · `allowedDevOrigins` · `turbopack` · `experimental.globalNotFound` 뿐). Next 의 `public/` 기본값이 그대로 나간 것이다. `_next/static` 은 해시 파일명이라 자동으로 immutable 이지만 `public/` 은 아니다.

결과: 폰트는 ETag 덕분에 두 번째 방문에 304 로 끝나지만 **매 내비게이션마다 조건부 요청 1왕복을 쓴다** — Fast 3G 에서 562 ms, §1 의 1600 ms 전환 예산과 같은 회선을 두고 다툰다. 그리고 `max-age=0` 은 중간 CDN 이 저장하지 않게 만들 수 있다.

**제안.** `next.config.ts` 에 `headers()` 를 추가해 `/fonts/:path*` 와 `/landing-card-media/:path*` 에 `Cache-Control: public, max-age=31536000, immutable` 을 붙인다. 폰트 파일명에 콘텐츠 해시를 넣어(§2 의 subset 생성 단계에서 함께) immutable 을 정당화한다. `next.config.ts` 는 Ask-First 파일이다(`AGENTS.md:113`, 「빌드·배포·스케줄 설정」).

---

## 11. `desktop-controllers-ship-to-mobile` — 데스크톱 전용 컨트롤러는 확실히 모바일 번들에 실리지만, 무게는 gzip 4.4 KB 로 작다 · **minor**

과제문의 가설(「데스크톱 전용 hover/모션 컨트롤러 1500여 행이 모바일 번들에 들어가는가」)은 **참이다.** 랜딩 전용 청크 `0-hzcc2z7yco6.js`(110,836 raw / **33,088 gz**)를 문자열 검색하면 `onMouseEnter` 7회 · `onMouseLeave` 7회 · `"hover: hover"` 1회 · `"pointer: fine"` 1회 · `"desktop-overlay"` 3회가 들어 있다. `next/dynamic` 분할은 `scripts/qa/check-phase9-performance-contracts.mjs:29-31` 이 **금지**하므로(`LandingCatalogGridLoader must not regress to dynamic ssr:false loading`) 현재 구조로는 분할 자체가 게이트에 막힌다.

다만 **크기는 가설이 암시하는 것보다 훨씬 작다.** esbuild 로 각 모듈을 minify+gzip 해 쟀다.

| 모듈 | minified | gzip | 모바일에서 |
|:---|---:|---:|:---|
| `use-hover-intent-controller.ts` (527줄) | 4,093 | **1,573** | `:318` · `:390` · `:483` 가드로 사실상 전부 죽음 |
| `landing-card-title-continuity.tsx` (301줄) | 3,155 | **1,295** | `enabled: !isMobileViewport`(`landing-grid-card.tsx:986`) → 죽음 |
| `use-desktop-motion-controller.ts` (204줄) | 2,640 | **772** | 죽음 |
| `desktop-shell-phase.ts` (123줄) | 1,075 | **451** | 죽음 |
| `baseline-manager.ts` (72줄) | 609 | **356** | mobile tier 에서 즉시 RELEASE |
| **소계** | 11,572 | **4,447** | — |
| (참고) `landing-grid-card.tsx` | 24,362 | 7,322 | 혼재 |
| (참고) 랜딩 상호작용 15개 모듈 총합 | 70,528 | 24,570 | — |

4,447 B 는 모바일 랜딩 모던 JS 220,960 B 의 **2.0%** 다. 같은 페이지에서 react-dom 이 70,728 B(32%), Next 클라이언트 런타임이 37,332 B(17%)를 차지한다. **따라서 「데스크톱 코드를 떼면 모바일 번들이 가벼워진다」는 기대는 수치가 받쳐 주지 않는다** — 떼야 할 이유는 번들이 아니라 유지보수(0단계 이음매)이고, 번들 관점의 진짜 표적은 §2(폰트 2.0 MB)와 §3(motion 40 KB)이다. 이 항목을 minor 로 두는 이유가 그것이다.

**제안.** 번들 절감을 목적으로 이 분할을 정당화하지 않는다. 분할한다면 `seam-split` 렌즈의 관심사 축을 따르고, 성능 근거는 「4.4 KB gzip · 전체의 2%」라고 정확히 적는다. 굳이 런타임 이득을 노린다면 `landing-catalog-grid.tsx` 수준에서 입력 방식별로 두 컨트롤러 모듈을 `import()` 로 가르는 방법이 있으나, 위 가드가 로더 파일에 대해 `ssr:false`/`next/dynamic` 을 금지하므로 **게이트 개정이 선행**해야 하고 4.4 KB 를 위해 그럴 가치는 없다.

---

## 12. `vercel-analytics-ships-without-consent` — 동의 없이도 코드가 내려간다 · **minor**

`src/app/vercel-analytics-gate.tsx` 와 `src/app/vercel-speed-insights-gate.tsx` 는 둘 다 `'use client'` 이고 모듈 최상단에서 `@vercel/analytics/next` · `@vercel/speed-insights/next` 를 **정적 import** 한 뒤, `consentState !== 'OPTED_IN'` 이면 `null` 을 반환한다. 즉 게이트가 막는 것은 **렌더**이지 **다운로드**가 아니다. 빌드 산출물에서 확인된다 — `va.vercel-scripts` 와 `_vercel/insights` 문자열을 가진 청크는 `100zw4opwoej4.js`(16,619 raw / **5,409 gz**) 하나이고, 이 청크는 7개 라우트 전부의 script 목록에 있다(실측).

동의하지 않은 사용자(=첫 방문자 전원, consent 기본은 `UNKNOWN`)는 5.4 KB gzip 을 받아 파싱하고 버린다.

**제안.** 두 게이트를 `next/dynamic` 의 `ssr:false` 지연 import 로 바꾸거나, `consentState === 'OPTED_IN'` 이 된 시점에 `await import('@vercel/analytics/next')` 하는 형태로 뒤집는다. `check-phase9` 의 `next/dynamic` 금지는 `landing.grid.catalogGridLoader` 한 파일에만 걸리므로(`:28-34`) 이 두 파일은 자유롭다.

---

## 13. `blog-prefetched-twice-test-not-at-all` — 이차 행동만 두 번 prefetch 된다 · **minor**

390×844 에서 랜딩을 로드하고 12회 스크롤하며 네트워크를 관찰한 결과, 블로그 카드 3장에 대해 **6개의 RSC prefetch** 가 나갔다.

```
/en/blog/ops-handbook?_rsc=eqsiq   187 B
/en/blog/ops-handbook?_rsc=1a28h   780 B
/en/blog/build-metrics?_rsc=eqsiq  187 B
/en/blog/build-metrics?_rsc=1a28h  778 B
/en/blog/release-gate?_rsc=eqsiq   186 B
/en/blog/release-gate?_rsc=1a28h   773 B
```

바이트는 합 3,627 B 로 사소하지만 요청은 3개 링크에 6개다. 반대편에서 테스트 카드는 prefetch 가 0 이다(§1). 즉 **왕복이 예산을 넘기는 쪽(테스트)에는 prefetch 가 없고, 여유가 있는 쪽(블로그)에는 두 벌이 있다.**

**제안.** `landing-grid-card.tsx:1171` 의 블로그 `<Link>` 에 `prefetch={false}` 를 주고(전환은 어차피 `beginBlogTransition` 이 소유한다), 절약한 요청 슬롯을 §1 의 테스트 `router.prefetch()` 에 쓴다. 두 벌이 나가는 원인(Next 16 의 layout/page 분리 prefetch 로 추정)은 **미확인**이므로 그것을 고치려 들지 말고 prefetch 를 끄는 쪽을 택한다.

---

## 14. `telemetry-one-fetch-per-event` — 이벤트마다 fetch 하나, 배치도 `keepalive` 도 없다 · **minor**

`src/features/telemetry/runtime.ts:99-108` 의 `sendTelemetryEvent` 는 이벤트 한 건마다 `fetch(TELEMETRY_ENDPOINT, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(event)})` 를 부른다. `keepalive` 도 `navigator.sendBeacon` 도 없다. `flushQueue`(`:107-130`)는 큐를 배치로 보내지 않고 `for` 루프로 한 건씩 같은 함수에 넘긴다. 엔드포인트는 단건 스키마다.

테스트 플로우에서 `question_answered` 는 문항마다 발화하고(`use-answer-handler.ts:71`) 자동 전진이 150 ms 잠금 뒤 다음 문항으로 넘기므로(`use-answer-lock.ts:32`), 사용자가 답할 때마다 새 POST 가 나간다. Fast 3G 에서 각 POST 는 최소 1왕복(562 ms)이고, 같은 시점에 §2 의 폰트가 회선을 물고 있다. `keepalive` 가 없으므로 모바일에서 앱이 백그라운드로 가거나 페이지를 떠날 때 in-flight 요청은 취소된다 — 그 손실률은 **미측정**이다.

**제안.** ⑴ `sendTelemetryEvent` 에 `keepalive: true` 를 추가한다(단건 페이로드가 64 KB 한도보다 훨씬 작다). ⑵ 큐 플러시를 배치로 바꾼다 — `/api/telemetry` 가 배열을 받도록 확장하고 `flushQueue` 가 한 번의 POST 로 보낸다. ⑶ 플러시 시점을 `visibilitychange`(`hidden`)에 묶어 `sendBeacon` 폴백을 둔다. 셋 다 `docs/req-landing.md §12` 의 이벤트 집합·필드 계약을 바꾸지 않는다 — 전송 방식만 바뀐다.

---

## 15. `landing-media-manifest-fs-per-request` — 랜딩 요청마다 11번의 파일시스템 호출 · **minor**

`src/features/landing/media/manifest.server.ts:9-28` 의 `loadLandingCardMediaAssetVariants()` 는 메모이즈되지 않은 채 `readdir(public/landing-card-media)` 1회 + 디렉터리마다 `access(thumbnail.svg)` 를 돈다. 현재 디렉터리가 10개이므로 **요청당 11회의 fs 호출**이고, `src/app/[locale]/page.tsx:35` 가 매 랜딩 렌더에서 이것을 `await` 한다(`/[locale]` 은 `ƒ` 동적 라우트).

로컬 SSD·따뜻한 캐시에서 TTFB 차이는 작다(5회 중앙값: `/kr` 5.1 ms vs fs 를 타지 않는 `/kr/history` 3.9 ms → 약 +1.2 ms). **서버리스/네트워크 파일시스템 배포에서의 비용은 이 세션에서 측정할 수 없었다 — 미확인이다.** 다만 TTFB 는 모바일 LCP 가 그대로 물려받는 값이고, 이 목록은 빌드 시점에 확정되는 정적 사실이다.

**제안.** 모듈 스코프에서 한 번만 계산해 캐시한다 — `let cached: Promise<string[]> | null = null; export function loadLandingCardMediaAssetVariants(){ return (cached ??= compute()); }`. 같은 파일 안 4줄 변경이고 `'server-only'` 경계도 그대로다. 더 나아가면 빌드 시점에 JSON 매니페스트를 생성해 fs 호출을 0으로 만든다.

---

## 16. `stray-public-html-578kb` — 소비자 없는 578 KB 파일이 public 으로 배포된다 · **minor**

`public/56T-ToDo.html` = **578,500 B**. `src/` 전체에서 이 이름을 참조하는 코드가 0건이고 라우트도 없지만, `public/` 에 있으므로 `/56T-ToDo.html` 로 공개 제공된다. 배포 산출물에 매번 포함되고, §10 의 `max-age=0` 헤더까지 그대로 받는다. 사용자 성능 예산에 직접 들어가지는 않지만 배포 페이로드이며, 공개 URL 로 노출된다는 점도 함께 본다.

**제안.** 내용이 필요하면 `docs/` 로 옮기고(거기서는 서빙되지 않는다), 아니면 삭제한다. 어느 쪽이든 `public/` 에서 뺀다.

---

## 결함으로 올리지 않은 것 — 재 보았으나 근거가 서지 않는 항목

- **`backdrop-filter: blur(12px)` (sticky GNB, `site-gnb.tsx:38`).** 390×844 · 4× throttle 에서 120 프레임 프로그램 스크롤을 backdrop-filter 유/무로 각 2회 A/B 했다. 평균 13.49 vs 13.55 ms, 두 번째 쌍 12.95 vs 13.54 ms, 32 ms 초과 프레임 양쪽 0개. **유의한 차이가 없었다.** 소프트웨어 래스터 환경이라 실기기 GPU 비용은 미확인이지만, 이 환경의 측정으로는 결함이라고 말할 수 없다.
- **테마 전환 2,500 ms(`theme-transition.ts:4`).** 모바일 드로어에서 테마를 토글하고 3.2초간 rAF 델타를 수집했다(n=245): 평균 13.3 ms, p95 26 ms, 최대 37.1 ms, 32 ms 초과 프레임 1개. `mask-size`/`mask-position` 을 SVG `feGaussianBlur` 마스크로 2.5초간 애니메이션하는 구조이고 뷰포트 전체 스냅샷 두 벌이 존재하므로 실기기 GPU 에서는 다를 수 있으나, **이 환경에서는 프레임 손실이 관측되지 않았다.** 2,500 ms 라는 값 자체의 문제(계약 근거 없음, `design.md:373` 의 최장 260 ms 대비 9.6배)는 `signature-interactions` 렌즈 소관이라 여기서 중복해 올리지 않는다.
- **스크롤 중 GNB 상태 갱신(`use-gnb-capability.ts:34-45`).** `passive` 리스너이고 `window.scrollY` 만 읽어 강제 레이아웃이 없다. 8×300 px 스크롤 구간에서 `getBoundingClientRect` 0회 · rAF 0회로 실측됐다. 결함 아님.
- **CLS.** 7개 조합(4G/Fast 3G/Slow 3G × 랜딩·테스트, 폰트 6초 지연 포함)에서 전부 **0.00000**, `layout-shift` 엔트리 0건. 썸네일이 `fill` + 컨테이너 `aspect-[16/6]`(`landing-grid-card.tsx:223`)이라 이미지 자리는 미리 예약돼 있고, 하이드레이션 재계획은 컨테이너 쿼리 게이트가 가린다. **CLS 결함 없음.**
- **INP.** 카드 탭의 `click` 이벤트 duration 136 ms(processing 9 ms, input delay 32 ms, 4× throttle). 200 ms 의 "good" 임계 안이다. 탭 직후의 84.7 ms 프레임과 103 ms long task 는 §8 로 올렸다.

---

## 훑은 표면과 훑지 못한 표면

**실측으로 훑은 표면(7개, 각각 390×844 로 로드해 LCP·CLS·JS 전송량·DOM 노드·ResizeObserver 수·폰트 요청을 수집):** `/kr` 랜딩 · `/kr/blog` · `/kr/blog/ops-handbook` · `/kr/history` · `/kr/test/qmbti` · `/kr/test/error` · `/kr/<존재하지 않는 경로>` (404). `/en` 랜딩도 별도로 쟀다. 전 표면 공통 사실: **폰트 2.0 MB 를 전부 요청한다**(404 포함), 모던 JS 는 149 KB(404) ~ 236 KB(테스트) gzip, ResizeObserver 는 랜딩 43–44개 · 블로그/히스토리 1개 · 테스트 0개다.

**GNB·설정:** 모바일 드로어를 열고 테마 토글까지 구동해 프레임을 쟀다(§결함 아님 절). 드로어 내부의 로케일 칩 12개는 `md:hidden`/`md:flex` 두 트리가 **양쪽 다 DOM 에 있는** 구조(`site-gnb.tsx:364`·`:370`)라 모바일에서도 데스크톱 트리가 마운트돼 있으나, DOM 노드 총계가 279개로 작아 성능 결함으로 올릴 근거가 되지 않았다.

**`global-not-found`:** 코드로만 확인했다(`src/app/global-not-found.tsx`). 자체 `<html>` 을 렌더하며 `./globals.css` 를 import 하므로 **역시 2 MB 폰트를 요청한다.** 다만 `next start` 에서 이 라우트를 렌더시키는 경로를 찾지 못해(로케일 없는 최상위 미존재 경로가 `src/i18n/proxy-policy.ts:11` 에서 어떻게 처리되는지 확인하지 않았다) **브라우저 실측은 하지 못했다.**

**훑지 못한 것 — 명시한다.**
- **실기기 측정 0건.** iOS Safari · Android Chrome 어느 쪽도 붙이지 않았다. 따라서 GPU 래스터 비용(§backdrop-filter, §테마 전환), iOS 의 `body{overflow:hidden;touch-action:none}` 스크롤 잠금 비용, Android fallback 폰트 메트릭 차이로 인한 폰트 swap CLS 는 전부 미확인이다.
- **서버 배포 환경 미확인.** 모든 수치가 로컬 `next start` + 로컬 루프백에서 나왔다. 실제 배포의 TTFB · CDN 캐시 동작 · 서버리스 콜드스타트는 재지 않았다. §1 의 전환 예산은 **서버 지연 0** 을 전제한 수치이므로 실배포에서는 더 나쁘다.
- **Slow 3G(400 kbps) 완주 실패.** 프로브가 페이지를 끝까지 로드하지 못해(scrollHeight 888 로 정지) 이 프로파일의 LCP·FOUT 은 미실측이다. 폰트 전송 40.2 s 는 산술값이다.
- **12 locale 중 en·kr 2개만 실측.** 나머지 10개 로케일의 렌더·전송 비용은 재지 않았다. 다만 폰트·JS·CSS 는 로케일 불변이므로 전송 예산 결론은 그대로 유효하다.
- **`npm test` · `npm run qa:rules` · `test:e2e:gate` 를 이 세션에서 실행하지 않았다.** 읽기 전용 분석이라 현재 pass/fail 을 확인하지 않았고, §5 · §7 의 「게이트 주의」는 소스 정규식을 읽어 유도한 것이지 실행 결과가 아니다.
- **`motion` 트리셰이킹의 실제 한계 미확인.** `{useReducedMotion} from 'motion/react'` 만 import 하면 249 B 라는 것은 esbuild 측정이고, Turbopack 이 같은 결과를 내는지는 별도 빌드로 확인하지 않았다.
- **폰트 subset 의 실제 산출 크기 미확인.** 이 기계에 `fonttools`/`pyftsubset` 이 없어 실제로 subset 을 만들어 재지 못했다. §2 의 「52.4% 는 `gvar`」는 woff2 테이블 디렉터리 파싱으로 얻은 **압축 전** 원본 길이 비중이며, 브로틀리 압축 후의 절감률은 그와 같지 않을 수 있다.
