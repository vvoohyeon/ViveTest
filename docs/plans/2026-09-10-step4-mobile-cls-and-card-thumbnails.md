# Step 4 — 모바일 하이드레이션 CLS 와 카드 썸네일 (A · E)

**Date:** 2026-09-10 · **Task mode:** Implementation · **Branch:** `claude/step4-mobile-cls-and-thumbnails` (새로 만든다) · **Wave:** rebaseline 프로그램 밖 · **Opens `src/**`:** yes

**이 계획은 사용자에게 보이는 것을 바꾼다 — Step 3 과 성격이 다르다.** A 는 모바일 첫 화면의 배치를, E 는 카탈로그의 그림을 바꾼다.

**Ask-First 파일:** A 의 갈래에 따라 `src/app/[locale]/layout.tsx` · `public/theme-bootstrap.js` 를 열 수 있고, E 는 `docs/design/ds/README.md`(저장소 밖 push)를 연다. **A 가 `req-landing.md` §6.2 또는 §11.1 의 규칙을 바꿔야 하면 SSOT 개정이므로 멈추고 사용자에게 확인한다.**

**High-Risk — A 는 여기 해당한다.** 계획에 위험 다섯 차원(usability · a11y · responsiveness · performance · design-system consistency)을 명시하고 `grid-smoke`·`state-smoke` 전체를 돌린다.

**Hard stops.** `BQ-07` 시각 baseline 재생성 금지 · `theme-matrix-smoke` 실행 금지 · `qa:visual:full` 과 `--update` 금지. 워크트리 금지, clone 만.

---

## Shared frame — 이 문서 혼자 읽어도 되도록 반복한다

**운영 방침(2026-09-10, BQ-39).** 트랜지션·마이크로인터랙션·UX 판단에서 SSOT 정의서보다 구현자의 판단을 우선하되, 더 나은 대안은 반드시 결정 안건으로 올린다.

**Step 3 이 먼저다.** Step 3(`-step3-`)이 `ds/README.md` 를 정정하지 않으면 E 가 낡은 D-08 행 위에 쓰게 되고, Step 3 의 D 조사가 끝나지 않으면 아래 「Step 3 에서 넘어올 수 있는 단위」의 범위를 알 수 없다.

## 착수 전 확인

```bash
cd "$(git rev-parse --show-toplevel)"
git log --oneline -3                                      # Step 3 착지 커밋이 보여야 한다
ls docs/done/2026-09-10-step3-signal-cleanup-and-ds-truth.md   # expect present
npm run qa:rules; echo "qa:rules exit=$?"                 # expect exit=0 — Step 3 의 완료 신호
grep -n 'D-08' docs/design/ds/README.md                   # Step 3 이 갱신한 표를 확인한다
npm test                                                  # expect 초록
echo "tracked=$(git ls-files 'tests/e2e/*-snapshots/*' | wc -l | tr -d ' ') disk=$(ls tests/e2e/*-snapshots/* | wc -l | tr -d ' ')"   # L11
```

**Step 3 의 D 조사 결과를 읽는다.** 분기 ⑶ 이었고 「시각 결정이 필요하다」로 넘어왔다면 그것이 이 계획서의 **단위 0** 이다. 분기 ⑴·⑵ 였다면 D 는 이미 닫혔으니 다시 열지 않는다.

## 다시 하지 말 것 (Step 2·3 에서 이미 끝났다)

- 동의 배너 가림 · spacer 예약 · 포커스 링 두 층 — Step 2 가 끝냈다. 되살리지 말 것.
- reduced-motion 의 stagger — **이미 `0ms` 다**(L19). `@media` 블록만 읽고 판단하지 말 것.
- `check-phase5-card-contracts` 와 blocker 5 추적 — Step 3 가 끝냈다. `qa:rules` 가 붉으면 그것은 **새 결함**이다.
- `ds/README.md` 의 D-06·D-09·D-02 행 — Step 3 이 사실로 맞췄다. E 는 **D-08 행만** 건드린다.

---

## A — 모바일 하이드레이션 CLS `0.136`

### 실측한 원인 (2026-09-10, chromium, preview 빌드, 390×812)

이벤트를 시간순으로 찍었다. **폰트가 아니다.**

```
   48ms  FONTS status@init   loaded          ← 폰트는 첫 프레임 전에 이미 준비됐다
   90ms  PLAN(initial)       desktop|desktop-wide|1232
  169ms  PLAN                mobile|mobile|358
  169ms  FONTS ready         loaded
  170ms  SHIFT               0.13647
```

`landing-catalog-grid.tsx:27` 의 `INITIAL_VIEWPORT_WIDTH = 1280` 때문에 **390px 휴대폰이 첫 페인트에서 데스크톱 3/4 컬럼 그리드를 받는다.** 169ms 에 실측값 `358`(= 390 − 16×2)로 다시 계산되면서 행 구성이 갈아엎히고, 그 결과가 170ms 의 이동 한 번이다.

이동 기여 원소(같은 shift 의 sources):

| 원소 | y / height (전) | y / height (후) |
|:---|---:|---:|
| `landing-grid-row-1` | 513 / 172 | 585 / 227 |
| `landing-grid-row-2` | 700 / 112 | 0 / 0 |
| 카드 제목 | 368 / 26 | 461 / 26 |
| 카드 부제목 | 402 / **44** | 495 / **22** |
| 태그 목록 | 453 / 28 | 525 / 28 |

부제목이 2 줄(44px)에서 1 줄(22px)로 줄어드는 것은 **결과이지 원인이 아니다** — 데스크톱 플랜에서 카드가 좁게 잡혔다가 모바일 플랜에서 358px 폭을 받기 때문이다. 데스크톱 1280×720 의 CLS 는 `0.00177` 로 멀쩡하다. **이것은 모바일만의 문제다.**

### 왜 「그냥 window 를 읽으면」 안 되는가 — 계약 둘이 맞물려 있다

- **`req-landing.md` §11.1** — 「초기 렌더 경로에서 `window` … 비결정 API 분기를 금지한다. `useState initializer` 에도 동일 적용한다. **중립 초기 상태를 사용해야 한다.**」 hydration warning 1 건이면 릴리스 차단이다.
- **`req-landing.md` §6.2** — 「Grid 컬럼 규칙의 source of truth 는 `.landing-grid-container` 의 **measured grid inline-size** 이며, `window.innerWidth - padding` 같은 **viewport 기반 추정값으로 판정하면 안 된다.**」

**즉 현재 구현은 계약 위반이 아니다.** 「중립값으로 그리고, 측정한 뒤 다시 계산한다」는 두 계약이 함께 강제하는 모양이다. 결함은 **고른 중립값이 하필 모바일에 가장 나쁜 것**이라는 데 있다. 그러므로 처방은 §11.1 의 결정성과 §6.2 의 「측정값이 정본」을 **동시에 지키면서** 첫 페인트의 손해를 줄이는 것이어야 한다.

### 후보 넷 — 고르기 전에 각각의 CLS 를 모바일과 데스크톱 양쪽에서 잰다

| 갈래 | 무엇 | 계약 | 비용 | 예상 위험 |
|:---|:---|:---|:---|:---|
| **⑴ 중립값을 모바일로** | `INITIAL_VIEWPORT_WIDTH` 를 모바일 티어 값으로 바꾼다 | §11.1 ✓ (여전히 상수) · §6.2 ✓ | 아주 작다 | 손해가 데스크톱으로 **이동**할 뿐일 수 있다 — 그래서 양쪽을 잰다 |
| **⑵ 첫 페인트를 CSS 가 소유** | 컬럼 수를 `.landing-grid-container` 의 **container query** 로 정한다 | §6.2 를 JS 보다 **더 정확히** 만족한다(진짜 측정값이고 추정이 아니다) · §11.1 ✓ (JS 분기 없음) | 중간 | row1(3) 과 rowN(4) 의 컬럼 수가 달라 한 grid 로 표현하기 어렵다 — 부분 해법일 수 있다 |
| **⑶ 측정 전 페인트 억제** | 첫 측정 전까지 그리드를 `visibility: hidden` 으로 | §11.1 ✓ · §6.2 ✓ | 작다 | CLS 는 0 에 가까워지지만 **FCP/LCP 가 나빠진다** — 지표를 바꿔치기하는 것이므로 LCP 를 함께 재지 않으면 개선이 아니다 |
| **⑷ 행 그룹 DOM 을 걷어낸다** | `landing-grid-row-N` 요소를 없애고 단일 연속 grid + 카드별 배치로 | §6.2 의 「단일 연속 grid」 문구와는 맞지만 검증 4·6 과 E2E 다수가 `landing-grid-row-N` 을 읽는다 | 크다 | 가장 근본적이지만 **SSOT 개정과 E2E 대량 수정**을 부른다 |

**측정 방법(그대로 쓴다).** preview 빌드에 `PerformanceObserver({type: 'layout-shift', buffered: true})` 를 `addInitScript` 로 걸고, 같은 스크립트에서 `landing-grid-shell` 의 `data-grid-tier|data-grid-column-mode|data-grid-inline-size` 를 `MutationObserver` 로 찍고, `document.fonts.ready` 도 함께 찍는다. **`largest-contentful-paint` 와 `first-contentful-paint` 도 같은 관찰에 넣는다** — 갈래 ⑶ 은 이 둘 없이는 판정할 수 없다. 뷰포트는 최소 `390×812`(모바일) 과 `1280×720`(데스크톱) 둘, 가능하면 `768×1024`(태블릿 경계)까지.

**판정 규칙.** 모바일 CLS 를 `0.1` 미만으로 내리면서 **데스크톱 CLS 를 `0.01` 이상으로 올리지 않고 LCP 를 나쁘게 하지 않는** 갈래를 고른다. 어느 갈래도 그러지 못하면 **멈추고 표로 보고한다** — 세 지표의 교환비는 사용자 결정이다.

**해서는 안 되는 것.** ⒜ 초기 렌더에서 `window` 를 읽어 §11.1 을 깨는 것. ⒝ `window.innerWidth - padding` 으로 컬럼을 정해 §6.2 를 깨는 것. ⒞ hydration warning 을 하나라도 만드는 것 — §11.1 이 릴리스 차단으로 못 박았다. ⒟ **한 갈래를 「그럴듯하다」는 이유로 골라 놓고 다음 실행에서 확인하는 것** — 넷 다 로컬에서 잴 수 있다.

### A 의 회귀 검사

**계산값이 아니라 지표를 고정한다.** `tests/e2e/` 에 CLS 검사를 신설한다 — 390×812 에서 랜딩을 열고 `layout-shift` 합계가 임계 미만인지 본다. 임계는 **측정으로 정한 값에 여유를 준 하나**로 쓰고 그 근거를 주석에 적는다.

**전제 단언을 반드시 함께 둔다**(L16): 관찰이 shift 를 하나도 못 받으면 검사는 조용히 초록이 된다. 「관찰이 최소 한 개의 성능 엔트리를 받았다」를 단언해 재현하지 못하는 검사가 통과하지 않게 한다.

**고장 주입 양방향.** `INITIAL_VIEWPORT_WIDTH` 를 다시 1280 으로(또는 고른 갈래를 무력화해) 되돌리면 붉어야 한다.

## E — D-08: 카드 8 장이 그림 한 장을 나눠 쓴다

### 실측한 현재 (2026-09-10)

`public/landing-card-media/` 에 디렉터리가 **하나뿐**이다(`qmbti/thumbnail.svg`). 자산이 없는 variant 는 `landing-grid-card.tsx:165` 의 `createThumbnailFallbackDataUri()` 가 만드는 SVG 를 받는데, **그 SVG 는 `qmbti/thumbnail.svg` 와 같은 그림이다** — 같은 그라디언트(`#FBFAF7 → #C9DBD1`), 같은 원 둘(`r=82 #E8F0EC 0.6`, `r=40 #5C8E78 0.14`). 즉 카탈로그는 **한 장의 그림을 여덟 번 반복해서** 보여 준다.

제안은 이미 있다: `docs/design/ds/preview/thumb-proposal.html` 의 「Proposal — draw for the format, not for the subject」가 16:6 네이티브 세트와 네 규칙을 담는다. 수입해 둔 후보 일곱(`docs/design/ds/assets/`)은 3:2 라 16:6 슬롯에서 세로 43.8% 가 잘려 나가므로 **재색조로 구제되지 않는다**는 것이 D-08 의 판정이다.

### BQ-07 과 충돌하지 않는다 — 확인했다

썸네일을 바꾸면 랜딩 픽셀이 바뀌지만 **추적되는 랜딩 baseline 이 하나도 없다.** `git ls-files tests/e2e/theme-matrix-smoke.spec.ts-snapshots/` 는 48 개 전부 `theme-layout-test-*`(테스트 플로우)이고 `landing` 은 **0 개**다. 디스크의 `theme-layout-landing-*` 24 장은 누군가 로컬에서 spec 을 돌려 **생성된** 것이며 추적되지 않는다(L11 · 그 디렉터리의 미추적 파일이 121 개다). 따라서 **E 는 baseline 재생성을 필요로 하지 않고 `--update` 를 치지 않는다.**

### 무엇을 하나

1. **채택 여부를 먼저 판정한다.** `thumb-proposal.html` 을 렌더해서 읽고, 네 규칙이 실제로 「묻지 않고 새로 그릴 수 있을」 만큼 구체적인지 본다. 아니면 규칙을 먼저 구체화하고 그것을 결정 안건으로 올린다.
2. **일곱 장을 16:6(`viewBox="0 0 640 240"`)으로 그린다.** 대상 variant 는 카탈로그에서 읽는다 — `qmbti` 를 뺀 나머지, 즉 `rhythm-b` · `energy-check` · `creativity-profile` · `egtt` · `ops-handbook` · `build-metrics` · `release-gate` · `burnout-risk`. **개수를 하드코딩하지 말고** `resolveLandingCatalog('en', {audience: 'qa'})` 가 주는 목록에서 유도한다(L18 · 하드코딩된 개수는 조용히 낡는다).
3. **`public/landing-card-media/<variant>/thumbnail.svg` 로 넣는다.** 경로 규약은 `landing-grid-card.tsx:175` 와 `src/features/landing/media/manifest.server.ts` 가 갖는다 — 새 기전을 만들지 않는다.
4. **폴백을 다시 본다.** 여덟 장이 다 실물 자산을 가지면 `createThumbnailFallbackDataUri()` 는 아무도 쓰지 않게 될 수 있다. **지우지는 말 것** — variant 가 늘 때의 안전망이다. 다만 「그 폴백이 `qmbti` 와 같은 그림」인 상태는 해소하고, 폴백은 명시적으로 중립적인 것으로 남긴다.
5. **`ds/README.md` 의 D-08 행을 갱신하고 push 한다**(`SYNC.md`: `DesignSync` → `list_files` → `finalize_plan` → `write_files`). `assets/` 를 push 하면 업로드 경로가 SVG 에 C2PA 메타데이터를 주입한다는 것이 이미 기록돼 있다 — **그림은 동일하고 바이트만 다르므로 바이트 비교로 판정하지 않는다**(`SYNC.md`).

### E 의 회귀 검사

- **여덟 카드가 서로 다른 그림을 쓴다.** 카탈로그의 모든 test/blog 카드에 대해 렌더된 `img` 의 `src` 가 **전부 서로 다른지** 단언한다. 지금은 이 검사가 붉다(전부 같은 그림이므로) — **수정 전 붉고 수정 후 초록**이 그대로 성립한다.
- **모든 자산이 16:6 이다.** `public/landing-card-media/**/thumbnail.svg` 의 `viewBox` 가 `0 0 640 240` 인지 단언한다. 3:2 자산이 하나라도 들어오면 붉다.
- **고장 주입.** 한 variant 의 자산을 지우면 첫 검사가(폴백으로 되돌아가므로) 붉어야 한다.

## Step 3 에서 넘어올 수 있는 단위 0 — D-05 의 처방

Step 3 의 D 조사가 **분기 ⑶(카드가 실제로 납작해진다) + 시각 결정 필요** 로 끝났을 때만 존재한다. 그 경우 Step 3 이 남긴 실측(포커스 전/후의 두 `box-shadow` 계산값과 그림자 띠 픽셀)을 근거로 어느 그림자가 옳은지 정하고, `landing-grid-card.module.css:211` 을 고친 뒤 회귀 검사를 붙인다. **Step 3 이 ⑴·⑵ 로 닫았다면 이 단위는 없다 — 다시 열지 않는다.**

---

## 바꾸는 파일

| 파일 | 항목 | 게이트 |
|:---|:---|:---|
| `src/features/landing/grid/landing-catalog-grid.tsx` | A — 중립 초기값 / 첫 페인트 경로 | High-Risk 인접 |
| `src/features/landing/grid/layout-plan.ts` · `use-grid-geometry-controller.ts` | A — 갈래 ⑵·⑷ 를 고르면 | High-Risk |
| `src/features/landing/grid/landing-grid-card.module.css` | A 의 갈래 ⑵(container query) · 단위 0 | High-Risk 인접 |
| `src/app/[locale]/layout.tsx` · `public/theme-bootstrap.js` | A 의 갈래가 pre-hydration 경로를 쓰면 | **Ask-First** |
| `public/landing-card-media/<variant>/thumbnail.svg` × 8 | E — 자산 | — |
| `src/features/landing/grid/landing-grid-card.tsx` | E — 폴백을 중립적인 것으로 | — |
| `docs/design/ds/README.md` | E — D-08 행 | Ask-First · **저장소 밖 push** |
| `tests/e2e/**` · `tests/unit/**` | A · E 의 회귀 검사 | — |
| `docs/req-landing.md` | **A 가 §6.2/§11.1 을 바꿔야 할 때만 — 그 순간 멈추고 확인** | SSOT |
| `docs/decision-register.md` | 변경 이력 + BQ-38/BQ-39 후속 | SSOT |

## Impact assessment (A 의 위험 다섯 차원)

- **usability** — A 는 첫 방문자가 보는 첫 화면이 흔들리지 않게 한다. 갈래 ⑶ 을 고르면 대신 **빈 화면이 길어진다** — 그것이 개선인지 교환인지 LCP 로 판정한다.
- **a11y** — A 는 동작을 바꾸지 않지만 첫 페인트 DOM 이 달라지면 스크린리더의 초기 읽기 순서가 달라질 수 있다. `a11y-smoke` 를 돌리고 axe 를 포함한다.
- **responsiveness** — 이 항목의 본체다. **모든 티어 경계**(767/768 · 1023/1024 · 1040 · 1160)에서 컬럼 규칙이 §6.2 그대로인지 `grid-smoke` 의 sweep 으로 확인한다.
- **performance** — CLS·LCP·FCP 를 함께 재고 표로 보고한다. 하나를 고쳐 다른 하나를 나쁘게 하는 것을 개선이라 부르지 않는다.
- **design-system consistency** — E 가 여덟 장의 그림을 한 가족으로 유지해야 한다. 규칙은 `thumb-proposal.html` 이 갖는다.
- **shared shell / GNB** — 무관. **localization** — E 의 그림은 문자를 담지 않는다(§4.9 「no text」). **state contracts** — 무변경. **core user flow** — A 가 모바일 첫 진입을 직접 개선한다.

## 검증 명령

```bash
cd "$(git rev-parse --show-toplevel)"
npm run lint && npm run typecheck && npm test && npm run build
npm run qa:rules; echo "qa:rules exit=$?"    # Step 3 이 초록으로 만들어 두었다 — 붉으면 새 결함이다

PLAYWRIGHT_SERVER_MODE=preview npx playwright test --project=chromium --workers=1 \
  tests/e2e/grid-smoke.spec.ts tests/e2e/state-smoke.spec.ts
PLAYWRIGHT_SERVER_MODE=preview npx playwright test --project=chromium --workers=1 \
  tests/e2e/a11y-smoke.spec.ts tests/e2e/consent-smoke.spec.ts tests/e2e/gnb-smoke.spec.ts \
  tests/e2e/routing-smoke.spec.ts tests/e2e/transition-telemetry-smoke.spec.ts tests/e2e/qualifier-overlay.spec.ts

# L11 — E2E 실행이 생성한 baseline 을 지워 추적 수와 디스크 수를 맞춘다
echo "tracked=$(git ls-files 'tests/e2e/*-snapshots/*' | wc -l | tr -d ' ') disk=$(ls tests/e2e/*-snapshots/* | wc -l | tr -d ' ')"
```

`theme-matrix-smoke` 는 돌리지 않고 `--update` 도 치지 않는다(`BQ-07`, `L11`). **E 는 그것을 필요로 하지 않는다** — 추적된 랜딩 baseline 이 0 개임을 위에서 확인했다.

## 인수 조건

1. **모바일 390×812 CLS `< 0.1`.** 수정 전 `0.13647`. 실측으로 보인다.
2. **데스크톱 1280×720 CLS 가 `0.01` 을 넘지 않는다.** 수정 전 `0.00177` — 손해를 데스크톱으로 옮긴 것이 아님을 이것으로 보인다.
3. **LCP·FCP 가 나빠지지 않았다.** 세 지표를 한 표로 보고한다.
4. hydration warning **`0 건`** — §11.1 이 릴리스 차단으로 못 박았다. build/preview 로그로 증명한다.
5. `grid-smoke` 의 티어 경계 sweep 이 §6.2 의 컬럼 규칙을 그대로 지킨다.
6. **여덟 카드의 썸네일 `src` 가 전부 서로 다르다**(수정 전 전부 같다). 모든 자산의 `viewBox` 가 `0 0 640 240`.
7. A·E 의 회귀 검사가 고장 주입 양방향으로 발화한다.
8. 기본 게이트 4 종 + chromium E2E(theme-matrix 제외) 초록. `qa:rules` exit 0 유지.

## 사용자 확인이 필요한 결정

1. **A 의 갈래** — 넷의 CLS·LCP·FCP 를 모바일·데스크톱 양쪽에서 잰 표를 붙여 제시한다. 판정 규칙(모바일 `<0.1`, 데스크톱 `≤0.01`, LCP 악화 없음)을 만족하는 갈래가 **하나뿐이면 그것으로 진행하고 보고만 한다.** 둘 이상이거나 하나도 없으면 **멈추고 표로 묻는다** — 교환비는 사용자 결정이다.
2. **A 가 `req-landing.md` §6.2 또는 §11.1 의 규칙을 바꿔야 하면** — SSOT 개정이므로 착수 전에 멈춘다. 특히 갈래 ⑷ 는 `landing-grid-row-N` DOM 계약과 §6.2 검증 4·6 을 건드린다.
3. **E 의 네 규칙이 구체적이지 않으면** — 규칙을 먼저 정하는 것이 시각 결정이므로 안건으로 올린다. 그리지 않고 묻는다.

## Execution prompt

````
Read `docs/plans/2026-09-10-step4-mobile-cls-and-card-thumbnails.md` and `docs/LESSONS_LEARNED.md` L11 · L16 · L18 · L20. Run the 착수 전 확인 block and confirm Step 3 landed and `qa:rules` exits 0.

A first. The cause is already measured and is NOT fonts: `INITIAL_VIEWPORT_WIDTH = 1280` in `landing-catalog-grid.tsx:27` makes a 390px phone paint a desktop-wide grid, and the re-plan to `mobile|mobile|358` at 169ms is the 0.13647 shift. Do not re-derive this; do not "fix" fonts.

Read `req-landing.md` §6.2 and §11.1 before touching anything — together they FORCE the "neutral plan then measure" shape, so the current code is not a contract violation. Never read `window` in the initial render path, never decide columns from a viewport estimate, never introduce a hydration warning.

Measure all four candidates locally — CLS, LCP and FCP, at 390x812 and 1280x720 — before choosing. Candidate 3 cannot be judged without LCP. If exactly one candidate meets the decision rule, take it and report; if zero or several do, stop and put the table to the user.

Then E. Eight cards currently share one drawing because the fallback is the same artwork as `qmbti/thumbnail.svg`. Derive the variant list from `resolveLandingCatalog`, never hardcode the count. E does not need baseline regeneration — no landing baseline is tracked; verify that yourself before relying on it. Keep the fallback but make it neutral.

Write each regression to fail first and fault-inject both ways. Land as one squash on `main`, move this plan to `docs/done/`, add one 변경 이력 row. Never run `theme-matrix-smoke` and never pass `--update`.
````
