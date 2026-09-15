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
