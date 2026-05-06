# Theme Matrix Visual Improvement Follow-up

## Background

2026-05-06 `qa:gate:once`의 Playwright `@gate` theme-matrix 구간에서 35개 screenshot mismatch가 확인되었다. R-06 Landing Namespace Relocation은 path-only 변경이며, 진단 결과 CSS class, selector, `data-*`, `aria-*`, theme token, dark-mode scope, hover/focus/selected 로직 변경은 확인되지 않았다.

실패 expected PNG는 모두 로컬 ignored baseline(`tests/e2e/theme-matrix-smoke.spec.ts-snapshots/`)과 byte-identical이며, 해당 local baseline provenance는 2026-05-03 기준이다. tracked provenance(`tests/e2e/theme-matrix-baseline-provenance.md`)는 2026-05-06 11:05:32 KST 기준 baseline 재생성 및 gate 통과를 기록한다.

## Baseline Decision

현재 actual rendering을 baseline으로 승격한다.

사용자 확인 사항:

- Landing normal desktop/tablet unavailable badge는 neutral 상태에서 숨기고 hover/focus 후 `Coming Soon / 출시 예정` badge를 표시하는 것이 의도된 UX다.
- Landing normal dark mobile, blog/history dark GNB, test-instruction dark overlay, landing-test-expanded answer surface 차이는 치명적 오류가 아니며 현재 상태를 baseline으로 간주해도 된다.
- 이번 baseline 승격은 Visual Improvement backlog를 닫는 것이 아니라, screenshot gate를 현재 구현 상태에 맞추는 조치다.

## Deferred Visual Improvements

아래 항목은 별도 승인된 visual-improvement 작업으로 다룬다.

1. Dark mode unavailable overlay opacity
   - 대상: landing normal/mobile unavailable card overlay and badge treatment
   - 방향: dark mode에서 unavailable 상태가 더 명확히 읽히도록 overlay opacity, badge contrast, dimming balance를 조정한다.
   - 확인 경로: `/en`, `/kr`, mobile `390x844`, desktop/tablet `1440x980` / `1023x980`, dark theme.

2. Expanded answer button hover/neutral contrast
   - 대상: landing expanded QMBTI preview answer buttons
   - 방향: hover와 neutral 상태의 surface/border/shadow 대비를 조금 더 분명하게 만든다. selected처럼 오인되지 않도록 accent 사용은 제한한다.
   - 확인 경로: `/en`, `/kr`, QMBTI card expanded, desktop/tablet, light/dark theme.

3. Test question disabled next button affordance
   - 대상: `/en/test/qmbti`, `/kr/test/qmbti`의 하단 `Next / 다음` disabled 상태
   - 방향: disabled button이 비활성 상태임을 더 분명히 전달하도록 opacity, border, cursor, text contrast를 조정한다.
   - 확인 경로: instruction 시작 후 answer 미선택 상태, desktop/tablet/mobile, light/dark theme.

4. Dark GNB micro contrast review
   - 대상: blog/history/landing mobile and desktop GNB controls
   - 방향: current baseline은 수용하되, future polish에서 dark mode header controls의 contrast consistency를 한 번 더 점검한다.
   - 확인 경로: `/en`, `/kr`, `/en/blog`, `/kr/blog`, `/en/history`, `/kr/history`, dark theme.

## Verification Notes

Baseline regeneration command approved for this follow-up:

```bash
npm run qa:visual:full
```

Actual execution reused the already-running preview server on `127.0.0.1:4173`:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run qa:visual:full
```

Result: `288 passed`.

Gate verification:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:gate
```

Result: `126 passed`.

Do not stage or commit the resulting snapshot/provenance changes without explicit user approval.
