# Theme Matrix Baseline Provenance

This tracked document records the latest shared theme-matrix baseline regeneration
and verification result. The PNG baselines themselves remain local-only under
`tests/e2e/*-snapshots/`.

- Date generated: 2026-05-07 13:55:06 KST
- Git commit SHA: 9b5e62e3f28b633687d7bc22f7cec34301e8a9f5
- Working tree note: generated with visual-improvement token changes present
- OS: macOS 26.4.1 (25E253)
- Node version: v22.18.0
- Playwright version: 1.57.0
- Regeneration command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run qa:visual:full`
- Regeneration result: `288 passed`
- Gate verification command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:gate`
- Gate verification result: `126 passed`
- Reason for regeneration: Accept visual-improvement baseline for dark
  unavailable treatment, landing expanded answer contrast, and disabled Next
  affordance. Implementation notes are recorded in
  `docs/done/2026-05-07-theme-matrix-visual-improvement-followup.md`.

## Theme Matrix Baseline Regeneration 2026-05-11

- Date generated: 2026-05-11 KST
- Git commit SHA: 4a2cf8b4a84620deca8e948e7bfbcc81a86b3947
- Working tree note: Phase A predicate injection refactor committed (commit 90bfaee); 34 pre-existing theme-matrix diffs confirmed — Phase A is structural-only (no DOM/CSS output change) and cannot cause visual regressions.
- OS: macOS Darwin 25.4.0
- Node version: v22.18.0
- Playwright version: 1.57.0
- Regeneration command: `npm run qa:visual:full`
- Regeneration result: `288 passed`
- Reason for regeneration: 34 pre-existing local theme-matrix baseline drifts resolved; Phase A predicate injection refactor confirmed as structural-only with no visual change. Baselines were stale since 2026-05-07 (SHA 9b5e62e).

## Theme Matrix Baseline Regeneration 2026-05-13

- Date generated: 2026-05-13 KST
- Git commit SHA: 0870bbb3a647af185611ccbb9217c79eb8d99859
- Working tree note: Prompt 2 UX/UI implementation present; unrelated shared-surface diffs were classified as preview/dev-runtime environment drift, with no Prompt 2 regression confirmed.
- OS: macOS 26.4.1 (25E253), Darwin 25.4.0 arm64
- Node version: v22.18.0
- Playwright version: 1.57.0
- Regeneration command: `npm run qa:visual:full`
- Regeneration result: `288 passed`
- Theme-matrix rerun command: `npx playwright test tests/e2e/theme-matrix-smoke.spec.ts` against a preview server on port 4173
- Theme-matrix rerun result: `288 passed`
- Gate verification command: `npm run qa:rules`; `npm run lint && npm run typecheck && npm test && npm run build`
- Gate verification result: `qa:rules` passed; lint passed; typecheck passed; `npm test` passed with 381 tests; build passed.
- Reason for regeneration: Prompt 2 UX/UI pass — accepted pre-existing drift accumulated since last regeneration; no Prompt 2 regression confirmed.

## Theme Matrix Baseline Regeneration 2026-05-17

- Date generated: 2026-05-17 KST
- Git commit SHA: 09d7503eca67831284ade9dfe4ce35710f213dd9
- Working tree note: qualifier-reentry-ui implementation present (uncommitted; plan `docs/done/2026-05-16-qualifier-reentry-ui.md`). Theme-matrix test states use `qmbti` (no qualifier/profile): the reentry chip is guarded off (`qualifierItems.length === 0`), the §8f profile filter is a no-op, the §8-D4/Q-F1 `instructionVisible` change is a strict superset (`overlayMode` always `entry`), and the §8-D14 result-panel extraction reproduces byte-identical class strings — so qmbti DOM is unchanged vs pre-change. The pre-regen @gate showed ~117 broad ~1% sub-pixel diffs spanning blog/landing/history-menu and test surfaces (no shared code path to this change); post-regen only 6 PNGs were byte-different, all `theme-layout-test-instruction-kr-*` (Korean instruction-overlay text-wrap across 3 viewports × 2 themes), confirming preview/dev-runtime environment drift, not a qualifier-reentry regression.
- OS: macOS 26.5 (25F71), Darwin 25.5.0 arm64
- Node version: v24.2.0
- Playwright version: 1.57.0
- Regeneration command: `npm run qa:visual:full`
- Regeneration result: `288 passed`
- Gate verification command: `npm run test:e2e:gate`
- Gate verification result: `126 passed`
- Reason for regeneration: qualifier-reentry-ui implementation pass — accepted pre-existing environment drift accumulated since 2026-05-13 (SHA 0870bbb). No qualifier-reentry regression: change diff scope is telemetry + test-feature + `src/messages` + tests only (zero shared code with the drifted blog/landing/history surfaces); qmbti theme-matrix DOM is byte-identical. User-authorized §4 baseline regeneration.

## State Smoke Local Baseline Adjudication

- Date generated: 2026-05-10 10:10:20 KST
- Git commit SHA: 76df1aca2f3040a013ac5e73c4a00c36c45d2839
- Working tree note: Phase A predicate injection refactor present; verified the
  `expanded-focus-shell.png` diff also reproduced before Phase A by stashing the
  refactor and rerunning the focused state-smoke assertion.
- OS: macOS Darwin 25.5.0 arm64
- Node version: v24.2.0
- Playwright version: 1.57.0
- Regeneration command:
  `PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/state-smoke.spec.ts --project=chromium --grep "expanded keyboard focus boundary"`
- Regeneration result: `1 passed`
- Gate verification command:
  `npx playwright test tests/e2e/state-smoke.spec.ts --project=chromium`
- Gate verification result: `15 passed`
- Reason for regeneration: Pre-existing local baseline drift resolved;
  `expanded-focus-shell.png` baseline regenerated after Phase A predicate
  injection refactor, which is structural only and has no intended visual output
  change.

## State Smoke Baseline — tracked under the name Playwright actually resolves (2026-09-11)

- Date generated: 2026-09-11 02:26:51 KST
- Git commit SHA: 21e1de4 (`main` at generation time)
- OS: macOS Darwin 25.6.0 arm64
- Node version: v24.2.0
- Playwright version: 1.57.0
- Regeneration command:
  `PLAYWRIGHT_SERVER_MODE=preview npx playwright test --project=chromium --workers=1 -g "expanded keyboard focus boundary" --update-snapshots`
- Regeneration result: `1 passed`; produced `expanded-focus-shell-chromium-darwin.png` at 398x293, 25,862 bytes. Re-ran the comparison three times unchanged.
- Gate verification command:
  `PLAYWRIGHT_SERVER_MODE=preview npx playwright test --project=chromium --workers=1 tests/e2e/state-smoke.spec.ts`
- Gate verification result: ` 27 passed (34.9s) `
- Reason for regeneration: **the previous baseline was never compared, and the one that was compared was never in the repository.** `62a4121` (2026-03-16) added the named `projects` block to `playwright.config.ts`, so from that commit Playwright resolved `expanded-focus-shell-chromium-darwin.png` while the repository tracked `expanded-focus-shell-darwin.png`. The tracked file was orphaned in that commit and has not been read since; the resolved name existed only as an ignored file on one machine, generated 2026-05-10. The geometry difference between them is not a regression — `f3acb9f` (2026-06-02, adopt `design.md` as visual SSOT) moved the thumbnail slot from `aspect-[6/1]` to `aspect-[16/6]` and the card title to the 20px/1.3 scale, taking the expanded card from 403x211 to 403x291 in one commit; `docs/done/2026-06-01-rc-w1w5-normal-spacing-title-arrow.md` recorded that same reading at the time and deferred the baseline under `BQ-07`. This entry closes that deferral for this one baseline only: it is now tracked under the resolved name, the two orphans are deleted, and `tests/e2e/helpers/local-snapshot.ts` no longer passes a test whose baseline is missing. User-authorized regeneration (2026-09-11).

## BQ-07 Closeout — the whole matrix regenerated, tracked, and reproducible (2026-09-11)

- Date generated: 2026-09-11 15:41:58 KST
- Git commit SHA: `8b0de50` (on `claude/bq07-baseline-closeout`, parent `222a542`)
- OS: macOS 26.6.2 (25G83)
- Node version: `v24.2.0`
- Playwright version: `Version 1.57.0`
- Browsers: bundled Chromium (`chromium` project) · bundled WebKit (`webkit-ghosting` project)
- Regeneration commands: `npm run qa:visual:full` · `PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/safari-hover-ghosting.spec.ts --update-snapshots`
- Result: theme-matrix **164 tracked** (manifest 가 선언한 전부) · safari ghosting **5 tracked**(종전 추적 0). 재생성 직후 재실행 2 회 연속 `280 passed`, safari 단독 4 회 연속 `6 passed`, `npm run test:e2e:gate` 3 회 연속 `122 passed · 0 failed`.
- 사용자 승인: 2026-09-11 (48 장 재생성 · 선언만 되고 없던 케이스 생성 · safari 5 장 동반 생성, 세 건 모두 명시 승인).

### Reason — 종전 baseline 이 무엇이었는지부터

추적 48 장의 마지막 승인은 **2026-05-17** 이고, 그 뒤 `f3acb9f`(2026-06-02, design.md 를 시각 정본으로 채택)의 `aspect-[16/6]`·타입 스케일 이행, rebuild wave 전체, Step 1–4 가 지나갔다. 통제군 실측(`main` = `4cb6be9` 를 그대로 clone 해 `--grep @gate`): **125 failed · 1 passed**. 즉 이 게이트는 붉은 것이 아니라 **작동하지 않고** 있었다.

### 재생성 전에 고쳐야 했던 것 — 도달할 수 없는 상태를 단언하던 케이스 셋

`--update` 를 그대로 쳤다면 **틀린 그림이 baseline 이 됐을 것이다.**

1. `landing-test-expanded` · `landing-blog-expanded` — `expandLandingCard` 가 트리거를 **클릭**했다. 트리거는 blog 에서 `<Link>`, test 에서 전이를 여는 `<button>` 이므로 클릭은 확장이 아니라 라우팅이다. 랜딩 확장 카드 자리에 **블로그 상세 페이지**가 들어앉을 뻔했다. hover 로 바꿨다.
2. `landing-blog-expanded` 의 종착 단언 — 데스크톱/태블릿에서 확장 셸은 **test 카드만** 갖는다(`landing-grid-card.tsx` 의 `DesktopExpandedShell` 이 `isTestCard` 로 막혀 있고 `:969` 가 blog 의 `expanded` 를 `normal` 로 강제한다). blog 의 hover 상태는 read-more 노출과 태그 절삭이므로 그것을 단언한다.
3. `mobile-landing-blog-expanded` — 모바일에서도 blog 카드는 확장되지 않는다(`use-landing-interaction-controller.ts` 의 `handleCardClick` 이 blog 를 전이로 보낸다). **제품이 가질 수 없는 상태**이므로 manifest 에서 제거했다(사용자 승인). 168 → 164.
4. safari ghosting 의 lower-row 두 케이스 — 피사체가 `build-metrics`(blog)였다. 첫 단언에서 영원히 멈추므로 baseline 이 생길 수 없었고, 추적 0 이라 그 사실이 보이지 않았다. lower row 의 사용 가능한 test 카드 `egtt` 로 바꾸고, 카탈로그 순서가 바뀌면 조용히 깨지지 않도록 `expectCardInLowerRow` 가 먼저 전제를 단언한다.

### 재현 가능하게 만든 것 셋

baseline 이 스스로를 재현하지 못하면 회귀를 판정할 수 없다. 재생성 직후 재실행에서 어긋난 것들을 각각 원인까지 특정했다.

- **웹폰트** — Pretendard 는 `swap` 이고 preload 하지 않으므로 캡처가 swap 보다 빠르면 fallback 이 찍힌다. 한국어는 줄바꿈 위치까지 달라진다(2026-05-17 provenance 가 「환경 표류」로 적은 `theme-layout-test-instruction-kr-*` 가 이것이다). 두 스펙 모두 캡처 전에 `document.fonts.ready` 를 기다린다.
- **애니메이션** — 게이트 전체를 돌리면 webkit 스펙이 chromium 120 여 케이스와 CPU 를 나눠 쓰고, 단독으로 4/4 초록이던 스펙이 게이트 안에서 107px 차이로 붉었다. 버퍼 캡처 경로에 `animations: 'disabled'` 를 넘겨 전이를 종료 상태로 고정한다.
- **스쳐 지나가는 위상** — `toHaveAttribute('closing')` 은 살아 있는 속성을 폴링하므로 전이가 폴링 간격보다 빠르면 놓치고, 놓친 것은 「일어나지 않았다」와 구별되지 않는다. 이미 있던 MutationObserver 로그 위에서 기다리고 단언한다. `webkit-ghosting` 프로젝트는 `fullyParallel: false` 로 직렬화했다(병렬 3 회 4·3·4 통과 대 직렬 3 회 6·6·6 통과).

## `expanded-focus-shell.png` 은 기계마다 다른 크기로 렌더된다 — 2026-09-14 검증(재생성 없음)

`expanded-focus-shell-chromium-darwin.png` 는 2026-09-11 에 **398×293** 으로 재생성됐고 그 기계에서 3 회 재현됐다. 다른 기계(macOS Darwin 25.6.0)에서 같은 커밋을 돌리면 **395×292** 가 나오고 1,800 px(전체의 0.02)이 다르다 — 폭 3px · 높이 1px. `maxDiffPixels: 20` 이므로 확정 실패다.

**이것은 회귀가 아니다.** 2026-09-14 에 `origin/main`(`c05850e`)만 체크아웃한 대조 clone 과 step 1 이음매 분리가 적용된 clone에서 **같은 수치**(398×293 기대 · 395×292 수신 · 1,800 px)가 나왔고, 대조 clone 에서 3 회 반복해도 값이 흔들리지 않았다. 즉 이 차이는 커밋의 함수가 아니라 기계의 함수다.

- 검증 명령: `PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/state-smoke.spec.ts --grep "expanded keyboard focus boundary"`
- 대조군: `c05850e` 만 체크아웃한 별도 clone (소스 변경 0)
- 결과: 양쪽 동일 · 3 회 반복 동일

**재생성하지 않았다** — baseline `--update` 는 사람 승인이 필요하고(`AGENTS.md` §4 Hard stops), 재생성하면 이 기계의 값이 정답이 되어 반대편 기계가 붉어진다. 값을 어느 기계에 맞출지는 결정 사항이다.

**주의: `npm run test:e2e` 로는 어떤 스냅샷도 판정할 수 없다.** 그 명령은 `PLAYWRIGHT_SERVER_MODE` 기본값인 **dev** 서버로 돌고, baseline 은 전부 `preview` 로 채취돼 있다. dev 는 Next.js 개발 인디케이터를 그려 넣으므로 `landing-normal` 24 장이 전부 붉어진다(2026-09-14 실측: 같은 트리에서 `test:e2e` 는 24 장 붉고 `test:e2e:smoke` 는 전부 초록). 스냅샷을 보는 상위 게이트는 `npm run test:e2e:smoke` 다.

## `expanded-focus-shell.png` 을 은퇴시킨다 — 2026-09-16 (사용자 결정)

위 절이 「값을 어느 기계에 맞출지는 결정 사항」으로 남겨 둔 것을 닫는다. **어느 기계도 고르지 않는다.** 두 후보 중 하나를 고르면 반대편 기계가 영구히 붉고, 그 상시 붉음이 진짜 회귀를 가리기 때문이다.

대신 그 검사를 **기하 단언으로 바꾸고 PNG 를 지웠다.** 검사가 실제로 주장하는 것은 「포커스 경계가 접힌 카드가 아니라 보이는 오버레이 셸을 따른다」이고, 그것은 세 가지로 정확히 잰다 — 링을 지는 원소가 `[data-slot="expandedSurface"]` 인가 · 그 색이 `--normal-focus-ring` 으로 해석되는가 · 그 상자가 접힌 root 보다 **가로로 넓은가**(실측 434 대 395). 픽셀 비교는 그 주장보다 넓은 것을 재고 있었고, 그 초과분이 기계 종속의 원인이었다.

**왜 이 한 장만 그랬는가.** 나머지 169 장은 뷰포트라는 **고정 크기 영역**을 찍는데 이 한 장만 **내용이 크기를 정하는 카드 상자**를 찍었다. 그래서 폰트 메트릭 차이가 그대로 캔버스 크기 차이가 됐다. 같은 모양의 검사를 새로 만들 때 이 구분을 먼저 보라.

- 지운 파일: `tests/e2e/state-smoke.spec.ts-snapshots/expanded-focus-shell-chromium-darwin.png`
- 남은 baseline: 169 장(theme-matrix 164 · webkit-ghosting 5)
- 고장 주입: 링을 root 가 지게 하면 붉고, 링 색을 제품 밖 색으로 바꾸면 붉다 — 2026-09-16 확인

## 폰트 포장이 바뀌면서 달라진 baseline — 2026-09-16 (재생성 없음 · 단위 11 대기)

전체 face 한 장을 업스트림 dynamic subset 92 조각 + 보충 조각 하나로 바꾸면서(BQ-47) `safari-hover-ghosting` 의 **1 장**이 붉어졌다 — `steady-row1-short-expanded-content-fit`. 나머지 4 장은 초록이다.

**중간 상태에서는 2 장이었다.** 전체 face 를 backstop 으로 두었을 때는 `hover-out-row1-settled` 도 붉었고, 보충 조각으로 바꾸자 그 한 장이 돌아왔다. 붉은 장수가 **어느 글자가 어느 파일에서 오느냐에 따라 바뀐다**는 사실 자체가 아래 설명(run 경계)의 증거다.

**글리프는 같다 — 그것을 두 엔진에서 쟀다.** 저장소가 갖고 있던 전체 face 는 Pretendard **v1.3.9** 와 sha256 이 같고(`9599f12f…d900b4`), 조각은 같은 릴리스에서 생성된 것이다. 같은 기계·같은 브라우저에서 두 face 를 동시에 올려 글리프 advance 를 비교했다.

| 엔진 | 표본 | 불일치 | 문장 전체 폭 |
|:---|---:|---:|:---|
| chromium | 117 자 | **0** | — |
| webkit | 68 자 | **0** | 4061.816 대 4061.816 |

**그래서 이 차이는 메트릭이 아니다.** 남는 설명은 래스터화다 — 한 줄의 글자가 조각 **여러 파일**에서 오면 엔진이 run 을 나눠 그리고, 그 경계에서 서브픽셀 위치가 달라진다. `maxDiffPixels: 20` 은 그 정도를 잡는다.

**교차 파일 커닝은 실제로 조금 사라진다.** 150 자 표본에서 글자 **하나하나의 폭은 전건 일치**지만 문장 전체 폭은 9,725.541 대 9,725.004 로 **0.537px**(0.006%) 다르다 — 서로 다른 파일에서 온 글자끼리는 커닝 쌍이 적용되지 않기 때문이다. 이것은 `unicode-range` 분할이면 업스트림 조각이든 우리 보충 조각이든 똑같이 갖는 성질이고, 한 글자당 평균 0.0036px 이다.

**캡처 순서 결함도 하나 함께 고쳤다.** `document.fonts.ready` 는 `unicode-range` 분할에서 **일회성 장벽이 아니다** — 로드 직후에 기다려도, 카드를 펼쳐 새 글자가 나오면 그때 새 조각 요청이 시작된다. 그래서 barrier 를 캡처 **직전**으로 옮겼다(`helpers/local-snapshot.ts` 의 `waitForFontsSettled`). 이 수정만으로는 위 2 장이 초록이 되지 않았으므로 원인이 스왑 타이밍이 아니라는 것도 함께 확인된 셈이다.

**재생성하지 않았다.** `--update` 는 사람 승인이 필요하고, 단위 11 이 그 승인 단계다. 이 2 장은 단위 3 이 남긴 176 장과 함께 그때 처리한다.

## 타이포 뷰포트 축이 더한 두 번째 원인 — 2026-09-16 (재생성 없음 · 단위 11 대기)

BQ-48 이 타이포에 모바일 열을 주면서 **모바일 폭의 baseline 은 활자 자체가 달라진다** — 카드 제목 20 → 18px, 부제 15 → 16px, `--body-sm` 14 → 15px. theme-matrix 의 `mobile` 뷰포트 케이스 전부와 `safari-hover-ghosting` 이 여기 해당한다.

앞 절의 폰트 포장 변경과 **원인이 다르다.** 폰트 포장은 래스터화만 바꿨고(글리프 메트릭은 두 엔진에서 전건 일치), 이 변경은 **치수를 의도적으로 바꾼다**. 단위 11 에서 재생성할 때 두 원인이 겹쳐 있다는 것을 알고 보라 — 모바일 케이스의 차이는 대부분 이쪽이다.

데스크톱 폭 baseline 은 이 변경의 영향을 받지 않는다(모바일 열은 `max-width: 767px` 안에만 있다). 그 사실 자체가 축이 스코프를 지킨다는 증거이고, `assertion:TY-01` 이 같은 것을 수로 고정한다.

## 단위 6 이 더한 것은 **없다** — 2026-09-16 (측정된 현재 수치와 함께)

누름 피드백(`:active`) · 터치 기본값 · `.motionStageLate` 재배정 · `motion` 라이브러리 제거는 **정지 화면을 바꾸지 않는다.** `:active` 는 쉼 상태의 픽셀을 건드리지 않고, `touch-action` 과 `overscroll-behavior` 는 시각 속성이 아니며, stage 재배정은 지연만 바꾸고, 라이브러리 교체는 같은 항등 변환으로 끝난다(실측: `animationDuration 0.18s`, 정착 `matrix(1, 0, 0, 1, 0, 0)`). 그래서 이 단위는 위 두 원인에 **셋째를 더하지 않는다.**

**현재 수치(2026-09-16 실측).** theme-matrix 케이스 **280 전부**가 붉고, 그것은 디스크의 baseline **164 장 전부**다(같은 164 장을 smoke 스펙과 gate 스펙이 각각 돌린다). 재생성 규모를 잡을 때 「일부」가 아니라 **전량**임을 전제로 하라 — 붉지 않은 장이 하나도 없으므로 「이 장은 왜 초록인가」를 물어 원인을 가를 수는 없고, 가르는 근거는 위 두 절의 서술뿐이다.
## 단위 7 이 더한 셋째 원인 — 2026-09-16 (재생성 없음 · 단위 11 대기)

**이번에는 치수가 바뀐다 — 그것도 모바일만이 아니다.** 단위 7 의 세 기구가 전부 정지 화면의 기하를 움직인다.

| 기구 | 무엇이 움직이나 | 영향 폭 |
|:---|:---|:---|
| 부제 모바일 2 줄 clamp | 카드 높이(부제가 3 줄 이상이던 카드) | 모바일만 |
| 썸네일 `16 / 6` → `16 / 4` | 카드 높이(썸네일 121.5 → 81px, 전 카드) · 썸네일 안의 그림 위치 | **전 폭** |
| 히어로 밴드 → 페이지 제목 | 그리드 위 영역 177.6 → 97.6px · 그 아래 전부가 올라온다 | **전 폭** |

앞 두 절의 원인(폰트 포장 · 타이포 뷰포트 축)과 **겹치지 않는다**. 폰트 포장은 래스터화만, 타이포 축은 모바일 폭의 활자만 건드렸고, 이번 것은 **모든 폭의 상자 치수**를 바꾼다. 그래서 데스크톱 baseline 이 이번에 처음으로 의도적으로 움직인다 — 종전 두 원인으로는 데스크톱이 움직일 이유가 없었다는 사실이 이 구분의 근거다.

**실측(2026-09-16).** `safari-hover-ghosting` 6 장 중 **4 장**이 붉고(종전 등재 1 장 → 4 장), 전부 크기 불일치다: `hover-out-row1-settled` 578 → 533px, `hover-out-lower-row-settled` 433 → 506px 처럼 **줄어드는 장과 늘어나는 장이 함께 있다** — 접힌 카드는 낮아지고 확장 셸의 안착 바닥은 자연 높이에서 유도되기 때문이다. theme-matrix 쪽은 이미 280 케이스(= baseline 164 장) 전량이 붉으므로 이 단위가 **개수를 더 늘리지는 않는다.**

**재생성하지 않았다.** `--update` 는 사람 승인이 필요하고 단위 11 이 그 승인 단계다.
## 기계 종속은 「어느 쪽을 고르나」가 아니라 「누구의 픽셀인지 적혀 있나」다 — 2026-09-16 (결정)

단위 11 을 앞두고 남아 있던 질문이 **「기계 종속 PNG 를 어느 기계 값에 맞출까」** 였다. 그 질문을 그대로 답하지 않는다. 답은 셋으로 갈린다.

**⑴ 먼저, 이 저장소에는 고를 「기계」가 둘밖에 없고 CI 는 없다.** `.github/workflows/` 에는 `sync.yml` 하나뿐이고 Playwright 를 돌리는 워크플로가 없다 — 시각 게이트의 유일한 소비자는 개발 기계다. 그래서 「CI 값을 정답으로 둔다」는 흔한 해법은 여기 존재하지 않는다.

**⑵ 검사를 좁힐 수 있으면 좁힌다. 그것이 이미 선 선례다.** `expanded-focus-shell.png` 는 두 기계에서 398×293 대 395×292 로 갈렸고, 2026-09-14 에 **어느 기계도 고르지 않고** 검사를 기하 단언으로 바꾼 뒤 PNG 를 지워 닫았다. 픽셀 비교가 그 검사의 주장보다 넓은 것을 재고 있었고 그 초과분이 기계 종속의 원인이었기 때문이다. 같은 처분이 가능한 검사는 같은 길로 닫는다.

**⑶ theme-matrix 의 164 장은 좁힐 것이 없다** — 주장 자체가 「이 픽셀이 바뀌지 않았다」다. 그래서 여기서는 **기계를 고르는 대신 저자를 적는다.**

| | |
|:---|:---|
| 결정 | 재생성을 실행한 환경이 그 baseline 의 저자이고, 그 환경을 **기계가 읽을 수 있게** 남긴다 |
| 남기는 것 | `tests/e2e/snapshot-environment.json` — `platform` · `release` · `arch` · `cpu` · `playwright` |
| 쓰는 시점 | `--update-snapshots` 실행만. 비교 실행은 절대 쓰지 않는다 |
| 읽는 시점 | 스냅샷 비교가 **붉을 때만**. 초록일 때는 아무 일도 하지 않는다 |
| 금지 | 차이를 `maxDiffPixels` 로 덮는 것. 실패 메시지가 그 문장을 함께 낸다 |

**OS 판으로는 두 기계가 갈리지 않는다 — 실측했다.** provenance 가 「다른 기계(macOS Darwin 25.6.0)」로 적어 둔 그 판이 이 기계(`darwin 25.6.0 arm64 · Apple M2 Pro`)와 같다. 그래서 지문에 **CPU 모델**을 넣는다. Playwright 판까지 함께 적는 것은 Chromium 빌드가 그것으로 결정되기 때문이다.

**기록이 없으면 「모른다」고 말한다.** 지금 디스크의 164 장은 2026-09-11 재생성의 산물이고 어느 기계였는지 기록이 없다. 그 사실을 지금 지어내지 않는다 — 파일은 단위 11 의 승인된 재생성이 처음 만들고, 그 전까지 붉은 실패는 「baseline 을 만든 환경이 기록돼 있지 않다」를 그대로 말한다.

**그래서 3px 질문은 단위 11 이 아니라 그 다음에 답해진다.** 두 번째 기계가 처음 비교를 돌리는 순간 메시지가 두 환경을 나란히 찍는다. 거기서 차이가 0 이면 이 질문은 애초에 없었던 것이고(폰트 작업이 원인을 걷었을 수 있다), 0 이 아니면 그 수치를 여기 적고 ⑵ 의 길 — 검사를 주장으로 좁히기 — 을 먼저 시도한다.

**함께 고친 것: `.gitignore` 가 새 baseline 을 삼키고 있었다.** `tests/e2e/*-snapshots/` 가 무시 목록에 있었다. 이미 추적 중인 169 장은 추적이 유지되므로 증상이 없었지만 **새로 생기는 장은 조용히 빠진다** — 만든 기계에서는 전부 초록이고 다른 clone 에서만 「baseline 이 없다」로 붉는다. 단위 11 은 manifest 에 케이스를 더하기로 되어 있으므로 그 자리가 정확히 여기였다. 줄을 지웠고, 「디스크의 baseline 과 git 이 든 baseline 은 같은 집합이다」를 양방향으로 묻는 단위 검사를 기본 게이트에 뒀다.
## 단위 11 이 실행할 표 — 2026-09-16 (결정: 케이스 집합은 §11 에서 **설계하지 않는다**)

**열린 질문이었던 것.** 「단위 11 에서 baseline 을 어느 시점 값으로 재생성하나」. 기계 쪽 절반은 위 절이 닫았다 — 기계를 고르지 않고 `snapshot-environment.json` 이 저자를 적는다. 남은 절반은 **시점**이었고, 답은 값이 아니라 규칙이다.

**재생성은 §10 이 착지한 뒤 한 번, `--update` 한 번이다.** 그 앞의 어느 단위도 baseline 을 만들지 않는다 — 없는 baseline 은 생성되지 않고 실패로 남는다(`helpers/local-snapshot.ts`), 그 가드가 BQ-07 마감의 것이고 되돌리지 않는다.

**바뀐 것은 케이스 집합을 누가 정하느냐다.** 계획서 §11 은 manifest 개정(1)과 폐쇄 검사 개정(2)을 재생성과 같은 단계에 묶어 두었는데, 그러면 §11 이 「무엇이 바뀌었나」를 뒤늦게 다시 유도해야 한다 — 단위 여섯 개가 지나간 뒤에. **그래서 표를 여기 둔다: 표면을 더하거나 바꾸는 단위는 착지할 때 자기 행을 여기 적고, §11 은 그 표를 실행한다.** §11 은 설계 단계가 아니라 실행 단계가 된다.

| 출처 | 더하거나 바꾸는 것 | 상태 |
|:---|:---|:---|
| BQ-47 (폰트 포장) | 기존 케이스의 래스터화 | 위 절에 기술됨 |
| BQ-48 (타이포 뷰포트 축) | 모바일 폭 케이스의 활자 | 위 절에 기술됨 |
| 단위 6 | — (정지 화면 불변) | 더하지 않음 |
| 단위 7 | **전 폭**의 상자 치수(썸네일 비율 · 페이지 제목 영역 · 부제 clamp) | 위 절에 기술됨 |
| 단위 3 | **`UNKNOWN` 동의 상태를 manifest 축에** — 170 장이 전부 한 가지 동의 상태에서 찍혔고 첫 방문자가 보는 화면에 회귀 픽셀이 0 장이다 | **2026-09-17 신설.** `landing-consent-unknown`(state, `/{locale}`, 2 locale × 2 theme × mobile·desktop-wide = **8 장**). 동의 축은 케이스의 `consent` 키로 적고, `UNKNOWN` 은 값을 적는 것이 아니라 **지우는** 상태라 별도 경로를 탄다(`clearTelemetryConsent`). 종전에는 `openThemedPage` 가 `OPTED_IN` 을 하드코딩해 이 축 자체가 불가능했다 |
| 없음(선재) | `/{locale}/blog/{variant}` · `/{locale}/test/error` · 404 두 표면에 baseline 0 장 **2026-09-17: 복구 화면의 기하가 바뀜었다** — `main` 을 `grid place-items-center` 에서 flex 중앙 정렬로 바꿔 패널이 더 이상 max-content 로 재지지 않는다. 실측: 데스크톱 패널 약 500 → **520px**(선언한 `max-w` 를 비로소 그대로 쓴다) · 폰 502(넘침) → **358px**. 이 네 표면은 baseline 이 0 장이라 지금 움직이는 장은 없고, **신설할 때 이 기하로 찍힌다**. **2026-09-17 처분 확정 — 네 표면이 서로 다른 이유로 갈렸다.** `test-error` 는 단위 11 이 4 장으로 신설했다. `segment-not-found` 는 **찍지 않는다 — 도달할 수 없기 때문이다**: `src/app` 의 `notFound()` 여덟 자리가 전부 `!isLocale(<param>)` 을 조건으로 갖고 `[locale]/layout.tsx` 의 `dynamicParams = false` 가 그 조건을 성립 불가로 만든다. 「중요하지 않다」가 아니라 「사용자가 닿을 수 없다」이고, 그 상태를 `segment-404-unreachability.test.ts` 가 조건으로 고정한다. `global-not-found` 도 **찍지 않되 이유가 다르다** — 이 표면에 필요한 것은 그림이 아니라 「스크립트 없이도 본문이 나오는가」이고 `assertion:NF-01` 이 네 갈래로 그것을 잰다. 테마 축은 여전히 무의미하다: 1280x900 에서 light·dark 를 각각 찍어 해시가 같았다(`561cdb47…`, 2026-09-17 재측정) — 테마 부트스트랩이 이 문서에 닿지 않기 때문이다. `blog/{variant}` 는 블로그 행과 함께 미뤄져 있다. |
| 단위 8 | 결과 화면의 주소(`/{locale}/result/[variant]/[type]`) — **라우트 조각은 기존 baseline 을 건드리지 않았고, 배선 조각이 두 장의 피사체를 바꾼다.** 그리는 것은 `.vt-panel` 어휘로 조립한 패널 하나(유효) 또는 하나(에러)이고, 기존 케이스의 피사체는 랜딩·블로그·문항·드로어라 이 라우트에 닿지 않는다. 실측 2026-09-16: 라우트 조각을 얹은 뒤 `--grep @smoke --grep-invert theme-matrix` 전량 초록. **그다음 배선 조각에서 `test-result` · `mobile-test-result` 두 케이스의 피사체가 바뀌었다** — 제출이 결과 주소로 `replace` 하므로 그 두 장이 찍던 것이 인계 패널(응답 나열)에서 도착 화면(`derived_type` 한 칸 + CTA)으로 옮겨 갔다. settle recipe 의 대기 앵커도 `test-result-panel` → `result-screen` 으로 따라갔다 | **케이스는 더하지 않되 두 장은 피사체가 다르다.** §11 에서 그 둘은 「치수가 달라진 장」이 아니라 **다른 화면**이므로, 재생성 뒤 눈으로 한 번 보고 통과시켜라 — 나머지와 판정 기준이 다르다. 새 케이스 신설은 여전히 §11 밖이고, 결과 표면의 시각 회귀는 내용이 생긴 뒤(Phase 9)의 일이다 |
| 단위 9 | 히스토리 목록 — **세 케이스의 피사체가 바뀐다.** `history-default`(6 뷰포트) · `history-settings-open` · `mobile-history-menu-open` 이 찍던 화면이 「제목 + 본문 두 줄 + 디버그 문자열」에서 「제목 + 보관 문구 + 빈 상태 + 다음 행동」으로 옮겨 갔다. 문구도 12 locale 전부 바뀌었다(`history.title` · `body` 신규 문장, `emptyBody` · `browseTests` · `abandoned` 추가, 소비자 없던 `goHome` 삭제) | **케이스는 더하지 않는다.** 이 셋은 §11 에서 「치수가 달라진 장」이 아니라 **다른 화면**이므로 단위 8 의 결과 두 장과 같은 칸에 두고 눈으로 한 번 보고 통과시켜라. 목록이 **있는** 상태의 장은 신설하지 않는다 — baseline 은 저장소가 빈 브라우저에서 찍히므로 그 화면은 이 매트릭스로 재현되지 않고, 재현하려면 케이스가 seed 를 갖는 새 축이 필요하다(§11 밖) |
| 단위 10 (GNB 묶음) | **여덟 케이스의 피사체가 바뀐다.** ⑴ GNB 를 담는 모든 케이스(전 표면·전 폭) — 컨트롤의 보이는 껍데기가 44 → **36px** 이 되고 데스크톱 설정 트리거가 44px 글리프 pill 에서 언어 전체 이름을 담은 **조용한 텍스트 pill**(측정 110×36)로 바뀐다. ⑵ `*-settings-open` 계열 — 레이어가 grid 여백 기구 대신 단순 상자가 되고 `Settings` 라벨이 테마 행 **위**로 올라가며 테마 컨트롤이 둘에서 **셋**(System · dark · light)이 된다. ⑶ `mobile-*-menu-open` 세 장 — 드로어의 블록 순서가 뒤집히고(설정 위 · 이동 아래) 헤더에 보이는 닫기가 생긴다. ⑷ `*-test-expanded` 계열 — 확장 메타 행이 한 줄 점 이음에서 좌우 두 묶음으로 갈라진다. ⑸ `safari-hover-ghosting` 의 `settings-panel-top-seam-free.png`(387×219 → 372×284) | **케이스는 더하지 않는다.** 전부 「치수가 달라진 장」이고 피사체 자체는 같다 — 단위 8·9 의 「다른 화면」 칸과 달리 눈으로 한 장씩 볼 필요는 없다. 다만 **`System` 이 선택된 상태**가 baseline 의 기본이 된다(저장된 테마가 없는 빈 브라우저에서 찍히므로): 종전에는 그 상태에 아무 마크도 없었고 이제 `System` 칩에 선택 표시 + 해석된 쪽 스와치에 배지 점이 있다 |
| 단위 10 (나머지) | **테스트 표면의 모바일 띄가 화면 이름을 갖는다** — `mobile-test-question` 계열이 찍는 띄에 `Back` · 타이머 사이 가운데로 제목 한 줄이 더해진다. 그 밖의 표면은 띄 구성이 그대로다 — 제목은 `context='test'` 에서만 그려진다. 함께: `qmbti` Q7·Q8 · `egtt` Q3 · `energy-check` Q3·Q4 의 문구가 자리표시자에서 실제 문장으로 바뀜다 — baseline 은 첫 문항에서 찍히므로 **그 장들은 영향받지 않는다**(문서화만 해 둔다) **후속(2026-09-17): GNB 알약의 활자가 리터럴에서 토큰으로 바뀜다** — 14.08px / 행간 21.12px → `--label` 의 14px / 19.6px(굵기 600 은 그대로). 알약의 상자는 36×44 로 불변이고 폭만 0.2px 줄었다(실측 62.7 → 62.5). **`Back`·`Menu` 알약을 담는 모든 케이스**가 이 한 글자 분만큼 움직인다 — 데스크톱 설정 pill 은 §2-9 대로 15.36px / 400 그대로라 포함되지 않는다. | **케이스는 더하지 않는다.** 띄에 한 줄이 더해진 것이므로 「치수가 달라진 장」이고 피사체는 같다 |

**이 표가 하는 일은 하나다** — §11 이 열렸을 때 「무엇을 다시 찍나」를 묻지 않게 하는 것. 계획서 §11 의 1·2 단계는 이 표를 manifest 로 옮기는 작업이고, 그 둘은 여전히 Ask-First 다.

## 2026-09-17 재생성 — 단위 11 실행

**176 장이 이 날 이 기계에서 다시 찍혔다.** 저자는 `tests/e2e/snapshot-environment.json` 이 적는다(`darwin 25.6.0` · `arm64` · `Apple M2 Pro` · Playwright `1.57.0`). 내역은 164 장 갱신 + **12 장 신설**이고, 신설분은 위 실행표의 단위 3 행과 선재 공백 행이 적은 둘이다 — `landing-consent-unknown`(8) · `test-error`(4).

**`qa:visual:full` 만으로는 게이트가 초록이 되지 않았다.** 그 명령은 `theme-matrix-smoke.spec.ts` 한 파일만 다시 찍는데, 릴리스 게이트는 `safari-hover-ghosting.spec.ts` 의 PNG **다섯 장**도 본다. 그 다섯은 단위 7(썸네일 16 : 6 → 16 : 4 와 히어로 밴드 제거로 카드가 낮아졌다 — 539×578 → 533 · 434×433 → 506)과 단위 10(설정 트리거가 44px 글리프에서 텍스트 pill 이 되며 레이어 모서리가 규칙 8 로 옮겨 갔다 — 387×219 → 372×284) 때문에 **이미 낡아 있었고**, smoke 를 `--grep-invert theme-matrix` 로 돌리는 동안에는 드러나지 않았다. 같은 날 함께 재생성했다.

**눈으로 보고 통과시킨 다섯 장**(단위 8·9 가 「다른 화면」으로 표시해 둔 것): 결과 둘은 응답 나열 패널에서 도착 화면(유형 한 칸 + 행동 둘)으로, 히스토리 셋은 디버그 문자열이 있던 자리에서 빈 상태 + 다음 행동으로 옮겨 간 것을 확인했다. 치수 차이가 아니라 피사체가 바뀐 자리이므로 판정 기준이 나머지와 달랐다.

**검증**: `npm run test:e2e:gate` **123 / 123, 3 회 연속**.

## 2026-09-17 신설 — `OPTED_OUT` 고지 행 (8 장, 176 → 184)

**단위 3 이 만든 `OPTED_OUT` 고지 행에 회귀 픽셀이 한 장도 없었다.** 같은 날 `landing-consent-unknown` 을 만들면서 동의 축이 생겼으므로 — 케이스가 `consent` 키를 갖고 `openThemedPage` 가 세 상태를 받는다 — 이 케이스는 manifest 두 줄이다(`stateCases` 항목 하나 + `closure` 한 줄). `landing-consent-opted-out`(state, `/{locale}`, 2 locale × 2 theme × mobile·desktop-wide = **8 장**, `gate: false`, 형제 케이스와 같은 축).

**한 케이스가 두 가지를 동시에 잡는다.** `OPTED_OUT` 은 고지 행을 띄우는 동시에 카탈로그를 **거른다** — 실측(en, light, mobile): 고지 행 「6 tests need analytics consent. · Change consent」가 `--surface-muted` 위에 서고 그리드는 카드 **둘**로 줄어든다. 네 조합 전부에서 두 가지가 함께 찍혔다.

**기존 176 장은 한 장도 다시 찍지 않았다.** `qa:visual:full` 대신 `--grep "landing-consent-opted-out" --update-snapshots` 로 새 케이스만 썼다 — 바꾼 것이 없는 장을 다시 찍으면 기계 잡음이 baseline 에 들어간다. `git status` 로 확인: 추가 8, 수정 0.
