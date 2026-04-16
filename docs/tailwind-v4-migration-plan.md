# Tailwind v4 중심 점진 리팩토링 계획

> 마지막 갱신: 2026-04-16
> 목적: 다음 세션에서 바로 구현 착수할 수 있도록, 현재 `src/app/globals.css` 중심 스타일 구조를 `Tailwind CSS v4` 중심 구조로 점진 이전하는 상세 계획을 문서화한다.

## 1. 문서 범위

- 이 문서는 구현이 아니라 구현 계획 문서다.
- 구현은 작은 batch로 분할하고, `1~3개 batch` 단위가 아니라 현재 합의된 승인 체크포인트 기준으로 진행한다.
- 이번 계획의 직접 대상은 style 적용 위치와 최소 마크업 조정이며, 라우팅/locale/resolver/registry/telemetry/storage 로직 변경은 범위 밖이다.

## 2. 현재 기준 검증 사실

- `tailwindcss@4.1.0`, `@tailwindcss/postcss@4.1.0`는 설치되어 있다.
- [postcss.config.mjs](/Users/woohyeon/Local/ViveTest/postcss.config.mjs:1)가 존재하며 `@tailwindcss/postcss`를 연결한다.
- [src/app/globals.css](/Users/woohyeon/Local/ViveTest/src/app/globals.css:1) 첫 줄에는 `@import "tailwindcss";`가 있다. 현재도 `tailwind.config.*`는 없다.
- 현재 스타일 중심은 [src/app/globals.css](/Users/woohyeon/Local/ViveTest/src/app/globals.css:1)이며 총 `1395`줄이다.
- [src/app/layout.tsx](/Users/woohyeon/Local/ViveTest/src/app/layout.tsx:1)는 전역 CSS를 `import './globals.css'`로 로드하고, `beforeInteractive`로 [public/theme-bootstrap.js](/Users/woohyeon/Local/ViveTest/public/theme-bootstrap.js:1)를 주입한다.
- [public/theme-bootstrap.js](/Users/woohyeon/Local/ViveTest/public/theme-bootstrap.js:1)는 hydration 이전에 `vivetest-theme`를 읽어 `documentElement.dataset.theme`를 설정한다.
- [src/features/landing/shell/page-shell.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/shell/page-shell.tsx:1)는 모든 localized route에 공통으로 `TransitionGnbOverlay`, `SiteGnb`, `main.page-shell-main`, `TelemetryConsentBanner`를 마운트한다.
- [src/features/landing/gnb/site-gnb.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/gnb/site-gnb.tsx:1)는 약 `791`줄이며, hover/focus fallback, mobile menu choreography, focus return, locale/theme switch, back behavior를 함께 소유한다.
- [src/features/landing/grid/landing-catalog-grid.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/grid/landing-catalog-grid.tsx:438)와 [src/features/landing/grid/landing-grid-card.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/grid/landing-grid-card.tsx:540)는 `data-*`, inline CSS variable, class hook를 함께 사용한다.
- [src/features/test/test-question-client.tsx](/Users/woohyeon/Local/ViveTest/src/features/test/test-question-client.tsx:342)는 `.landing-shell-card`를 test shell에 재사용한다.
- [src/features/landing/blog/blog-destination-client.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/blog/blog-destination-client.tsx:60)와 [src/app/[locale]/history/page.tsx](/Users/woohyeon/Local/ViveTest/src/app/[locale]/history/page.tsx:23)도 `.landing-shell-card`를 공유한다.
- representative anchor SSOT는 [tests/e2e/helpers/landing-fixture.ts](/Users/woohyeon/Local/ViveTest/tests/e2e/helpers/landing-fixture.ts:1)의 `qmbti`, `energy-check`, `ops-handbook`이다.
- theme-matrix closure SSOT는 [tests/e2e/theme-matrix-manifest.json](/Users/woohyeon/Local/ViveTest/tests/e2e/theme-matrix-manifest.json:1)이다.
- `Language ⋅ Theme` wording family는 `src/messages/*.json`과 GNB smoke에서 이미 고정돼 있다.
- [tests/e2e/routing-smoke.spec.ts](/Users/woohyeon/Local/ViveTest/tests/e2e/routing-smoke.spec.ts:1)는 blog index/detail 분리, invalid/non-enterable blog redirect, segment/global not-found 분리를 이미 검증한다.
- `npm run build`는 2026-04-16 기준 현재 workspace에서 GREEN이다.

## 2.1 현재 `globals.css` 소유 구간 맵

| 대략 구간 | 현재 소유 surface | 핵심 내용 | 주 담당 batch |
|---|---|---|---|
| 1~107 | token/theme | `:root`, `html[data-theme='dark']`, color/system token | Batch 1, Batch 7 |
| 109~142 | base/reset | `body`, font, anchor, form font inherit | Batch 1, Batch 7 |
| 144~166 | consent/transition global residual | consent banner layer/spacer, transition source | Batch 2 |
| 168~1105 | landing grid/card | grid, card shell, state selector, reduced-motion, keyframes, unavailable overlay, mobile transient shell | Batch 5~6, Batch 7 |
| 1107~1231 | shared shell/test/blog | `.landing-shell-card`, `.test-*`, `.blog-*` | Batch 3, Batch 7 |
| 1233~1377 | GNB/theme | sticky shell, settings geometry, chips, mobile panel | Batch 4, Batch 7 |
| 1379~끝 | not-found/placeholder | `.nf-shell`, `.placeholder-shell` | Batch 7 |

## 2.2 코드베이스 재검토 없이 착수하기 위한 핵심 앵커

### Tailwind 진입

- Tailwind 진입은 이미 연결되어 있다.
  - [src/app/globals.css](/Users/woohyeon/Local/ViveTest/src/app/globals.css:1)의 `@import "tailwindcss";`
  - [postcss.config.mjs](/Users/woohyeon/Local/ViveTest/postcss.config.mjs:1)의 `@tailwindcss/postcss`
- 따라서 Batch 7은 Tailwind build path를 새로 여는 batch가 아니라, 이미 연결된 진입점을 유지하면서 residual/static surface를 줄이는 batch다.
- `tailwind.config.*`는 content scan 또는 theme extension이 실제로 필요해질 때까지 도입하지 않는다.
- 진입 방식 회귀가 의심될 때만 build output에서 utility selector 생성 여부를 다시 확인한다.

### Theme/bootstrap 경계

- theme bootstrap source of truth는 [public/theme-bootstrap.js](/Users/woohyeon/Local/ViveTest/public/theme-bootstrap.js:1)다.
- runtime theme source of truth는 [src/features/landing/gnb/hooks/use-theme-preference.ts](/Users/woohyeon/Local/ViveTest/src/features/landing/gnb/hooks/use-theme-preference.ts:1)다.
- theme transition style injection source of truth는 [src/features/landing/gnb/hooks/theme-transition.ts](/Users/woohyeon/Local/ViveTest/src/features/landing/gnb/hooks/theme-transition.ts:1)다.
- 유지해야 할 ID contract:
  - `#theme-switch-style`
  - `#theme-switch-base-style`
- 유지해야 할 storage / DOM contract:
  - localStorage key `vivetest-theme`
  - `document.documentElement.dataset.theme`

### Shared shell 경계

- [src/features/landing/shell/page-shell.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/shell/page-shell.tsx:1)는 route 공통 wrapper다.
- `TransitionGnbOverlay` → `SiteGnb` → `<main className="page-shell-main">` → `TelemetryConsentBanner` 순서를 바꾸지 않는다.
- `LandingRuntime`는 landing route 내부 child로 유지하고, `PageShell` 안으로 흡수하지 않는다.

### Test instruction / CTA 경계

- entry policy source of truth는 [src/features/test/entry-policy.ts](/Users/woohyeon/Local/ViveTest/src/features/test/entry-policy.ts:1)다.
- style migration 중에도 아래 test ID를 바꾸지 않는다.
  - `test-start-button`
  - `test-accept-all-and-start-button`
  - `test-deny-and-abandon-button`
  - `test-deny-and-start-button`
  - `test-keep-current-preference-button`
  - `test-choice-a`
  - `test-choice-b`
  - `test-prev-button`
  - `test-next-button`
  - `test-submit-button`
- overlay visibility contract:
  - `test-instruction-overlay`는 visible/hidden 기준 자체가 smoke/a11y 흐름에 사용된다.
  - `aria-hidden` 토글은 `test-question-panel`에서 유지해야 한다.

### GNB 경계

- [src/features/landing/gnb/site-gnb.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/gnb/site-gnb.tsx:1)는 단순 스타일 컴포넌트가 아니라 focus orchestration과 close/open timing을 소유한다.
- style migration 중에도 아래 data/test contract를 바꾸지 않는다.
  - `data-testid="gnb-settings-trigger"`
  - `data-testid="gnb-settings-panel"`
  - `data-testid="desktop-gnb-theme-controls"`
  - `data-testid="gnb-mobile-menu-trigger"`
  - `data-testid="gnb-mobile-menu-panel"`
  - `data-testid="gnb-mobile-backdrop"`
  - `data-current-theme`
  - `data-theme-option`
  - `data-chip-surface`
  - `aria-pressed`
  - `disabled`
- `SettingsControls`는 `data-chip-surface='theme-preview-light|dark'`를 통해 preview chip surface를 만든다. 이 selector contract는 유지한다.

### Landing grid/card 경계

- [src/features/landing/grid/landing-catalog-grid.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/grid/landing-catalog-grid.tsx:438)의 root `section.landing-grid-shell`은 아래 상태 데이터를 방출한다.
  - `data-grid-tier`
  - `data-grid-column-mode`
  - `data-grid-inline-size`
  - `data-row1-columns`
  - `data-rown-columns`
  - `data-page-state`
  - `data-active-ramp`
  - `data-hover-lock-enabled`
  - `data-hover-lock-card-variant`
  - `data-keyboard-mode`
  - `data-mobile-phase`
  - `data-mobile-restore-ready-card-variant`
  - `data-baseline-phase`
  - `data-baseline-active-card-variant`
  - `data-baseline-frozen-rows`
- [src/features/landing/grid/landing-grid-card.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/grid/landing-grid-card.tsx:540)의 root `div.landing-grid-card`는 아래 contract를 동시에 사용한다.
  - `data-card-variant`
  - `data-card-seq`
  - `data-card-attribute`
  - `data-card-content-type`
  - `data-card-availability`
  - `data-card-state`
  - `data-interaction-mode`
  - `data-hover-lock`
  - `data-keyboard-mode`
  - `data-hover-lock-blocked`
  - `data-base-gap`
  - `data-comp-gap`
  - `data-needs-comp`
  - `data-natural-height`
  - `data-row-natural-max`
  - `data-card-viewport-tier`
  - `data-mobile-phase`
  - `data-mobile-transient-mode`
  - `data-desktop-motion-role`
  - `data-desktop-shell-phase`
  - `data-mobile-snapshot-*`
  - `data-mobile-restore-ready`
  - `data-expanded-layer`
- 유지해야 할 inline CSS variable contract:
  - `--landing-card-base-gap`
  - `--landing-card-comp-gap`
  - `--landing-card-origin-x`
  - `--landing-mobile-anchor-top`
  - `--landing-mobile-card-left`
  - `--landing-mobile-card-width`
  - `--landing-mobile-card-height`
- [src/features/landing/grid/landing-card-title-continuity.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/grid/landing-card-title-continuity.tsx:1)는 동적으로 `landing-grid-card-text-probe` 클래스를 만든다.
- 따라서 `.landing-grid-card-text-probe`는 Batch 7 전까지 무심코 제거하면 안 된다.

### Shared shell/blog/not-found 경계

- `.landing-shell-card`는 현재 test/blog/history가 공유한다.
- Batch 7에서 `.landing-shell-card`를 제거하거나 축소할 때는 [src/features/test/test-question-client.tsx](/Users/woohyeon/Local/ViveTest/src/features/test/test-question-client.tsx:361), [src/features/landing/blog/blog-destination-client.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/blog/blog-destination-client.tsx:83), [src/app/[locale]/history/page.tsx](/Users/woohyeon/Local/ViveTest/src/app/[locale]/history/page.tsx:23)의 local shell ownership을 같은 batch 안에서 닫아야 한다.
- 특히 [src/app/globals.css](/Users/woohyeon/Local/ViveTest/src/app/globals.css:1107)의 `.landing-shell-card h1/h2/p` reset과 muted paragraph rule을 globals에서 제거하려면, 위 consumer들이 spacing/text tone을 직접 소유해야 한다.
- `.blog-*`, `.nf-shell`, `.placeholder-shell`은 1차 migration 핵심 경로는 아니지만 최종 Tailwind 정리에 포함돼야 한다.
- 따라서 이들은 Batch 7의 explicit cleanup 대상으로 관리한다.

## 3. 불변 조건

- 현재 UI의 시각 결과를 유지한다.
- 현재 상호작용 의도를 유지한다.
- 접근성, 반응형, reduced-motion 계약을 유지한다.
- theme bootstrap, theme preview, theme transition 계약을 유지한다.
- landing → destination transition 연속성을 유지한다.
- consent / instruction / test overlay 계약을 유지한다.
- locale / routing / resolver / registry / telemetry / storage 계약을 유지한다.
- 외부 패키지는 추가하지 않는다.
- 반복 class 조합은 새 의존성 대신 local constant 또는 최소 helper로 해결한다.

## 4. 승인 체크포인트

- `Checkpoint 1`: Batch 1~2 완료 후
- `Checkpoint 2`: Batch 3~4 완료 후
- `Checkpoint 3`: Batch 5~6 완료 후
- `Checkpoint 4`: Batch 7 착수 전 최종 범위 확인

## 4.1 Checkpoint 2 상태 동기화 메모

- 2026-04-16 기준 현재 codebase에는 `Checkpoint 1` hardening 이후 `Batch 3~4` utility migration도 이미 반영되어 있다.
- 이번 sync의 목적은 아래 3가지를 현재 코드 기준으로 다시 고정하는 것이다.
  - `Checkpoint 1`에서 옮긴 shell/hero/consent surface의 계약 보존 확인
  - `Checkpoint 2`의 test/GNB utility migration 실반영 상태를 문서에 동기화
  - `Checkpoint 1·2` sign-off를 직접 흔들 수 있는 transition timing / regression gate를 유지
- 2026-04-16 구현 메모:
  - `Checkpoint 1`에서 추가한 utility class가 DOM에는 존재하지만, `@tailwindcss/postcss` 미연결 상태라 build output에 selector가 생성되지 않는 회귀를 확인했고, 최소 `postcss.config.mjs` 연결로 복구했다.
  - 우측 vertical empty space의 마지막 정상 기준선은 `778dbf6f3e16f28ee34c68831b173ac86b55970b`의 “전역 gutter 예약 없음 + body canvas paint” 구조였다.
  - 따라서 fix는 `scrollbar-gutter: stable` 위 seam 덮기가 아니라, Tailwind Checkpoint 1 변경은 보존하면서 `globals.css`의 scroll/canvas 기준선을 그 커밋 구조로 되돌리는 방식으로 정리했다.
  - `gnb-smoke`, `consent-smoke`, `state-smoke`에 추가한 Checkpoint 1 보호 테스트는 유지하고, `state-smoke`의 root canvas 계약은 `html` paint가 아니라 `body` canvas ownership과 gutter 비예약 상태를 검증하도록 재정렬했다.

## 4.2 현재 분리 추적 중인 follow-up

- `registry fixture drift`는 2026-04-16 기준 Batch 6·7 Done 게이트를 닫는 최소 수정으로 해소되었다.
- 더 큰 fixture / registry 정교화가 필요하면 별도 follow-up으로 다시 분리한다.
- `theme-matrix / Safari baseline` closure는 2026-04-16에 복구되었고, 현재는 참고 자산으로 사용할 수 있다.
- 이 항목들은 별도 follow-up 문서에서 재현 명령과 함께 추적한다.
- 추적 문서: [docs/checkpoint-1-2-follow-ups.md](/Users/woohyeon/Local/ViveTest/docs/checkpoint-1-2-follow-ups.md)
- 현재 트랙에서는 남은 follow-up만 새 회귀와 구분해 기록한다.

## 5. Batch 진행 보드

- [x] Batch 1 완료
- [x] Batch 2 완료
- [x] Batch 3 완료
- [x] Batch 4 완료
- [x] Batch 5 완료
- [x] Batch 6 완료
- [x] Batch 7 완료

## 5.1 Checkpoint 4 재감사 메모

- 2026-04-16 구현에서 reopened `Batch 6` sign-off를 먼저 닫은 뒤 `Batch 7` cleanup까지 같은 변경셋에서 마무리했다.
- 정리 결과:
  - landing grid/card root shell ownership은 TSX utility 기준으로 재정렬됐다.
  - `globals.css`에는 machine-enforced contract가 요구하는 최소 selector만 잔류하고, shared shell/blog/not-found static surface는 local ownership으로 회수됐다.
  - Batch 6/7 완료 체크와 검증 결과를 현재 코드 기준으로 동기화했다.

## 6. Batch 상세 계획

### Batch 1 — Tailwind 진입점 검증과 `globals.css` 책임 분리

- 상태: `[x] 완료`
- 목표:
  - 현재 Next/Tailwind v4 빌드 경로를 검증한다.
  - `globals.css`를 `tokens / base / residual selector surface` 구조로 재구획한다.
  - 시각 결과는 바꾸지 않는다.
- 수정 대상:
  - [src/app/globals.css](/Users/woohyeon/Local/ViveTest/src/app/globals.css:1)
  - 필요 시에만 `postcss.config.*`
- Batch 1 착수 시 관찰된 사실:
  - Tailwind 패키지는 설치되어 있었지만, 당시에는 실제 import/config 진입점이 없었다.
  - 따라서 이 batch의 핵심 의사결정은 "설치 여부 확인"이 아니라 "최소 진입점을 어떤 방식으로 연결할지 확정"이었다.
- 권장 접근:
  - 1차 시도는 `@import "tailwindcss"`만으로 가능한지 확인한다.
  - 이 경로가 실제 빌드에서 동작하지 않을 때만 최소 `postcss.config.*`를 도입한다.
  - `tailwind.config.*`는 content scan 또는 theme extension이 실제로 필요해질 때까지 도입하지 않는다.
- preflight 충돌 점검 우선 대상:
  - `a`
  - `button`
  - `input`
  - `select`
  - `textarea`
  - `body`
  - 위 surface는 최종 잔류 base/reset 후보로 유지한다.
- 구현 순서:
  - 1. 현재 `globals.css` 상단에 Tailwind 진입을 붙인다.
  - 2. token/base/residual section comment를 먼저 만든다.
  - 3. selector를 지우지 말고 section 재배치부터 한다.
  - 4. build가 유지되면 이후 batch에서 utility migration을 시작한다.
- `globals.css`에 남길 영역:
  - `:root`
  - `html[data-theme='dark']`
  - reset
  - `body`
  - 전역 anchor / font
  - theme bootstrap 지원
  - 아직 어느 컴포넌트에도 옮기지 않은 selector 블록
- 예상 회귀 포인트:
  - Tailwind preflight와 기존 reset 충돌
  - CSS 로드 순서 변화
  - Tailwind 진입점만 추가하고 실제 utility 미사용 상태에서 build path 누락
- 검증:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
- 수동 확인:
  - `/en`, `/kr`에서 hydration 전 theme bootstrap이 정상인지 확인
  - `/en`, `/kr`의 초기 SSR 응답에서 `html[lang]`가 locale별로 올바르게 유지되는지 확인
- 완료 체크:
  - [x] Tailwind 진입 방식이 확정됐다.
  - [x] `globals.css`가 token/base/residual section으로 재정렬됐다.
  - [x] selector 삭제 없이 section 분리만 먼저 완료됐다.
  - [x] 시각 변화 없이 build가 유지됐다.

### Batch 2 — Shared Shell, Hero, Consent Banner의 저위험 이전

- 상태: `[x] 완료`
- 목표:
  - `page-shell`, `page-shell-main`, `landing-hero`, consent banner의 정적 layout/button surface를 Tailwind로 이전한다.
  - shared shell이 마운트하는 transition/telemetry 경계는 그대로 유지한다.
- 수정 대상:
  - [src/features/landing/shell/page-shell.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/shell/page-shell.tsx:1)
  - [src/features/landing/shell/consent-banner.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/shell/consent-banner.tsx:1)
  - [src/features/landing/shell/telemetry-consent-banner.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/shell/telemetry-consent-banner.tsx:1)
  - [src/app/[locale]/page.tsx](/Users/woohyeon/Local/ViveTest/src/app/[locale]/page.tsx:1)
  - [src/app/globals.css](/Users/woohyeon/Local/ViveTest/src/app/globals.css:1)
- `globals.css` 제거 후보:
  - `.page-shell-main` CSS selector
  - `.landing-hero`
  - `.telemetry-consent-banner*` 중 정적 layout/button 규칙
- TSX로 이동할 class 책임:
  - `page-shell-main` max-width / padding / responsive inset
  - hero grid / gap / heading size / body width
  - consent banner container / actions wrap / button surface
- landmark 유지 결정:
  - `.page-shell-main` 클래스명 자체는 유지한다.
  - 이유: 현재 test/hook가 이 landmark를 전제로 하므로 CSS selector를 제거하더라도 DOM class hook은 유지한다.
- 전역에 남길 class 책임:
  - `.telemetry-consent-banner-spacer`
  - `.telemetry-consent-banner-layer`
  - `.landing-transition-source-gnb`
- 우선 잔류시킬 규칙:
  - `.landing-transition-source-gnb`
  - safe-area 관련 계산
  - fixed layer 관련 selector
  - banner spacer height와 ResizeObserver 연계 동작
- 실행 순서:
  - 1. `PageShell`의 `main`에 utility를 먼저 이식한다.
  - 2. landing hero를 utility로 옮긴다.
  - 3. `ConsentBanner` 내부 정적 button/layout을 utility로 옮긴다.
  - 4. 마지막에 `globals.css`에서 대응 정적 selector를 제거한다.
- 경계 보존:
  - [src/features/landing/transition/transition-gnb-overlay.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/transition/transition-gnb-overlay.tsx:1)
  - [src/features/landing/telemetry/consent-source.ts](/Users/woohyeon/Local/ViveTest/src/features/landing/telemetry/consent-source.ts:1)
  - `LandingRuntime`
  - blog/history/test route의 `PageShell` 마운트 순서
  - `TransitionGnbOverlay → SiteGnb → main.page-shell-main → TelemetryConsentBanner` 순서를 고정한다.
- 예상 회귀 포인트:
  - main top padding
  - consent spacer height
  - fixed bottom safe-area
  - banner wrapping
  - transition overlay z-index
- 검증:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test -- tests/unit/landing-telemetry-validation.test.ts tests/unit/landing-telemetry-runtime.test.ts tests/unit/landing-transition-store.test.ts`
  - `node scripts/qa/check-phase10-transition-contracts.mjs`
  - `node scripts/qa/check-phase11-telemetry-contracts.mjs`
  - `npx playwright test tests/e2e/consent-smoke.spec.ts tests/e2e/transition-telemetry-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts tests/e2e/gnb-smoke.spec.ts`
- 수동 확인:
  - `/en`
  - `/kr`
  - `/en/blog`
  - `/en/blog/ops-handbook`
  - `/en/history`
  - `/en/test/qmbti`
- 참고 확인:
  - `theme-matrix`의 `landing-normal`, `test-instruction`
  - baseline이 있는 환경이면 비차단 참고 실행
- 완료 체크:
  - [x] shell/hero/consent banner 정적 스타일이 Tailwind로 이동했다.
  - [x] transition/telemetry contract는 변경되지 않았다.
  - [x] blog/history/test route에서도 shell spacing 비회귀가 확인됐다.
  - [x] route-local consent banner / dialog / popup은 새로 도입되지 않았다.

### Batch 3 — Test Shell, Instruction Overlay, CTA Surface 이전

- 상태: `[x] 완료`
- 2026-04-16 구현 메모:
  - `InstructionOverlay`와 `TestQuestionClient`의 instruction card, question/result panel, button/grid/action row static surface는 TSX utility class로 이동했다.
  - `.landing-shell-card` 공유 범위는 유지하고, selected/hover/focus/disabled 상태는 기존 `.test-*` 글로벌 selector에 남겨 Batch 7 cleanup 대상으로 분리했다.
  - 이번 sync에서 `test-instruction-note` 색상 토큰 drift를 `var(--muted-ink)` 기준으로 정리하고, `test-shell-header`, `test-shell-stage`, `test-nav-row`, `test-result-actions` landmark의 utility ownership을 명시했다.
- 목표:
  - instruction overlay, question panel, result panel, CTA/answer button의 정적 UI를 Tailwind로 이전한다.
  - instruction overlay 계약과 ingress 분기를 유지한다.
- 수정 대상:
  - [src/features/test/instruction-overlay.tsx](/Users/woohyeon/Local/ViveTest/src/features/test/instruction-overlay.tsx:1)
  - [src/features/test/test-question-client.tsx](/Users/woohyeon/Local/ViveTest/src/features/test/test-question-client.tsx:1)
  - [src/app/globals.css](/Users/woohyeon/Local/ViveTest/src/app/globals.css:1)
- 범위 주의:
  - `.landing-shell-card`는 test/blog/history가 공유하므로 이 batch에서 전역 제거 대상으로 바로 다루지 않는다.
  - test-specific class만 우선 옮기고, shared shell card는 별도 후속 batch에서 정리한다.
  - `test-shell-header`, `test-shell-stage`, `test-progress` landmark는 유지 대상으로 먼저 고정한다.
- `globals.css` 제거 후보:
  - `.test-*` 중 정적 panel/grid/button 규칙
- TSX에서 utility로 옮길 대상:
  - `.test-instruction-overlay`
  - `.test-instruction-card`
  - `.test-instruction-divider`
  - `.test-instruction-note`
  - `.test-shell-header`
  - `.test-shell-stage`
  - `.test-question-panel`
  - `.test-result-panel`
  - `.test-answer-grid`
  - `.test-answer-button`
  - `.test-primary-button`
  - `.test-secondary-button`
  - `.test-nav-row`
  - `.test-result-actions`
  - `.test-result-grid`
  - `.test-result-row`
- 우선 잔류시킬 규칙:
  - `data-selected`
  - full-screen mobile overlay 특수 규칙
  - 필요 시 focus-visible state selector
- 전역 유지 이유:
  - selected/hover/focus state는 utility보다 selector 유지가 안전하다.
  - mobile full-screen overlay는 `@media (max-width: 767px)`와 결합돼 있어 마지막에만 제거 여부를 판단한다.
- 실행 순서:
  - 1. `InstructionOverlay`의 wrapper/card/button layout을 utility로 이동
  - 2. `TestQuestionClient`의 result/question panel static layout을 utility로 이동
  - 3. selected/focus state selector는 글로벌 유지
  - 4. mobile override가 깨지지 않는지 확인 후 일부만 제거
- 경계 보존:
  - route-local consent banner/dialog 재도입 금지
  - `data-testid`
  - `aria-hidden`
  - `test-progress`
  - `test-stage`
  - `test-instruction-overlay`
  - instruction overlay mount timing
  - entry-policy action wiring
- 예상 회귀 포인트:
  - mobile full-screen instruction layout
  - CTA wrap
  - selected/focus state 표현
  - instruction hidden 상태에서 question panel 노출 타이밍
- 검증:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test -- tests/unit/test-entry-policy.test.ts tests/unit/test-question-bootstrap.test.ts`
  - `npx playwright test tests/e2e/consent-smoke.spec.ts tests/e2e/transition-telemetry-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts`
- 참고 확인:
  - `qmbti`, `energy-check` 기준 `test-instruction`, `test-question`, `test-result`
- 완료 체크:
  - [x] test panel/button 정적 스타일이 Tailwind로 이동했다.
  - [x] instruction contract와 CTA branch가 유지됐다.
  - [x] mobile overlay full-screen layout이 비회귀다.

### Batch 4 — GNB와 Theme Surface의 정적 이전

- 상태: `[x] 완료`
- 2026-04-16 구현 메모:
  - `site-gnb.tsx`와 `settings-controls.tsx`에서 header/inner/column/link/trigger/back/menu/chip base style이 utility constant로 이동했다.
  - `globals.css`에는 elevated state, settings panel geometry, chip state variable, mobile closing selector만 residual surface로 남겨 Checkpoint 2 경계를 고정했다.
  - `Language ⋅ Theme` wording, theme preview chip surface, desktop/mobile focus choreography 계약은 그대로 유지한다.
- 목표:
  - GNB shell, desktop/mobile layout, trigger/button/chip의 정적 스타일을 Tailwind로 이전한다.
  - settings panel geometry와 theme wording 계약은 유지한다.
- 수정 대상:
  - [src/features/landing/gnb/site-gnb.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/gnb/site-gnb.tsx:1)
  - [src/features/landing/gnb/components/settings-controls.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/gnb/components/settings-controls.tsx:1)
  - 필요 시 `src/features/landing/gnb/components/theme-mode-icon.tsx`
  - [src/app/globals.css](/Users/woohyeon/Local/ViveTest/src/app/globals.css:1)
- `globals.css` 제거 후보:
  - `.gnb-shell`
  - `.gnb-inner`
  - `.gnb-column`
  - `.gnb-ci-link`
  - `.gnb-desktop-links`
  - `.gnb-chip*`
  - `.gnb-menu-trigger`
  - `.gnb-back-button`
- utility로 옮길 1차 대상:
  - sticky shell / blur / border-shadow base
  - desktop/mobile inner flex layout
  - CI / nav link / trigger / back button base style
  - chip base style
- 전역에 남길 1차 대상:
  - `.gnb-settings-root`의 custom properties
  - `.gnb-settings-panel`
  - `.gnb-settings-panel::before`
  - `.gnb-settings-panel::after`
  - `.gnb-mobile-layer[data-state='closing'] .gnb-mobile-panel`
  - theme preview chip hover/selected selector
- 우선 잔류시킬 규칙:
  - settings panel absolute geometry
  - `data-state='closing'`
  - theme preview surface selector
  - hover/focus/closing timing에 직접 연결된 state selector
- 명시적 보존 대상:
  - `Language ⋅ Theme` wording
  - theme preview chip surface
  - representative anchors `qmbti`, `energy-check`, `ops-handbook`
- 경계 보존:
  - landing/blog/history/test context 분기
  - focus return
  - mobile close transition 종료 시 scroll unlock
  - hover gap `0px`
  - focus-out `<=1 frame`
- 예상 회귀 포인트:
  - settings panel 정렬값
  - trigger/current-theme button alignment
  - mobile panel padding/close animation
  - locale/theme chip press state
- 실행 순서:
  - 1. header/inner/column/button/chip의 base class를 utility로 이동
  - 2. settings panel geometry는 글로벌 유지 상태로 둔다
  - 3. desktop/mobile close/open animation selector는 그대로 둔다
  - 4. 마지막에 selector 제거 범위를 최소로 줄여가며 정리한다
- 검증:
  - `npm run lint`
  - `npm run typecheck`
  - `node scripts/qa/check-phase4-grid-contracts.mjs`
  - `node scripts/qa/check-phase5-card-contracts.mjs`
  - `node scripts/qa/check-phase6-spacing-contracts.mjs`
  - `node scripts/qa/check-phase7-state-contracts.mjs`
  - `node scripts/qa/check-phase8-accessibility-contracts.mjs`
  - `node scripts/qa/check-phase9-performance-contracts.mjs`
  - `node scripts/qa/check-phase10-transition-contracts.mjs`
  - `npx playwright test tests/e2e/gnb-smoke.spec.ts tests/e2e/state-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts`
- 비회귀 확인:
  - `/en`
  - `/en/blog`
  - `/en/blog/ops-handbook`
  - `/en/history`
  - `/en/test/qmbti`
- 참고 확인:
  - theme-matrix manifest 기준 case id
  - `landing-settings-open`
  - `blog-settings-open`
  - `history-settings-open`
  - `mobile-landing-menu-open`
  - `mobile-blog-menu-open`
  - `mobile-history-menu-open`
  - Safari ghosting의 settings panel 대표 상태
- 완료 체크:
  - [x] GNB 정적 surface가 Tailwind로 이동했다.
  - [x] theme wording과 theme preview surface contract가 유지됐다.
  - [x] desktop/mobile menu/settings geometry 비회귀가 확인됐다.

### Batch 5 — Landing Grid 잔류 CSS 후보 분리

- 상태: `[x] 완료`
- 2026-04-16 구현 메모:
  - `globals.css`의 landing grid/card 구간을 `Landing Grid Static Surface`와 `Landing Grid Residual Selectors` comment block으로 재분류했다.
  - Batch 6 이동 후보는 shell/layout/title/subtitle/tags/preview/meta/CTA base 쪽으로 고정하고, stage geometry, unavailable overlay, keyframes, reduced-motion, text probe는 global residual로 유지했다.
- 목표:
  - 본격 이전 전, landing grid/card CSS를 `Tailwind로 이동할 정적 규칙`과 `globals.css에 잔류할 상태 규칙`으로 분리한다.
- 수정 대상:
  - [src/app/globals.css](/Users/woohyeon/Local/ViveTest/src/app/globals.css:1)
  - 필요 시 [src/features/landing/grid/landing-catalog-grid.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/grid/landing-catalog-grid.tsx:1)
  - 필요 시 [src/features/landing/grid/landing-grid-card.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/grid/landing-grid-card.tsx:1)
- 잔류 CSS 후보:
  - `data-*` 상태 selector
  - `:has()` focus ring
  - reduced-motion 분기
  - desktop/mobile keyframes
  - transient shell geometry
  - unavailable overlay interaction selector
  - Safari/hover ghosting workaround
- 절대 잔류 확정 후보:
  - `.landing-grid-card-text-probe`
  - desktop/mobile `@keyframes`
  - `.landing-grid-shell[data-page-state='REDUCED_MOTION'] ...`
  - `@media (prefers-reduced-motion: reduce) ...`
  - unavailable overlay interaction selector
- 분리 결과물 형태:
  - `globals.css` 내부에 `Landing Grid Residual Selectors` 섹션을 별도로 만든다.
  - 정적 surface selector는 `Landing Grid Static Surface` 섹션으로 묶는다.
- 실행 순서:
  - 1. selector를 제거하지 말고 residual/static으로 먼저 분류
  - 2. static selector 옆에 "Batch 6 이동 대상" 표식을 남김
  - 3. reduced-motion / hover ghosting selector는 별도 블록으로 고정
- 다음 batch에서 이동할 정적 후보:
  - base shell
  - static title/subtitle
  - tags
  - meta
  - CTA
  - answer choice
- 예상 회귀 포인트:
  - selector 순서 역전
  - reduced-motion branch 누락
  - focus-visible 처리 약화
- 검증:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test -- tests/unit/landing-card-contract.test.ts tests/unit/landing-data-contract.test.ts`
  - `npx playwright test tests/e2e/state-smoke.spec.ts tests/e2e/grid-smoke.spec.ts`
- 참고 확인:
  - `landing-test-expanded`
  - `landing-blog-expanded`
  - Safari ghosting representative landing state
- 완료 체크:
  - [x] 정적 규칙과 residual selector가 명시적으로 분리됐다.
  - [x] reduced-motion / focus / Safari workaround 후보가 고정됐다.
  - [x] 다음 batch의 이동 범위가 class/selector 단위로 명확해졌다.

### Batch 6 — Landing Grid/Card의 저위험 정적 스타일 이전

- 상태: `[x] 완료`
- 2026-04-16 구현 메모:
  - `landing-grid-card.tsx`에서 root shell, expanded body, mobile expanded shell, tags-gap, answer-choice base, CTA base ownership을 TSX utility 중심으로 재정렬했다.
  - `globals.css`에는 focus/ramp/reduced-motion/stage geometry와 QA script가 요구하는 최소 contract selector만 남겼다.
  - reopened 원인이던 root shell 분산 상태는 닫았고, trigger/tags-gap/cursor policy는 machine-enforced contract를 위해 thin global selector로 유지했다.
- 목표:
  - landing grid/card의 base shell, normal slot, meta/CTA/answer choice 같은 정적 surface를 Tailwind로 이전한다.
  - Batch 5에서 분리한 상태 selector는 글로벌에 남긴다.
- 수정 대상:
  - [src/features/landing/grid/landing-catalog-grid.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/grid/landing-catalog-grid.tsx:1)
  - [src/features/landing/grid/landing-grid-card.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/grid/landing-grid-card.tsx:1)
  - 필요 시 `src/features/landing/grid/landing-card-title-continuity.tsx`
  - [src/app/globals.css](/Users/woohyeon/Local/ViveTest/src/app/globals.css:1)
- `globals.css` 제거 후보:
  - `.landing-grid-shell`
  - `.landing-grid-container`
  - `.landing-grid-row`
  - `.landing-grid-card`의 base/static 규칙
  - subtitle/tag/meta/CTA/answer choice 정적 규칙
- utility로 옮길 1차 surface:
  - `.landing-grid-container`
  - `.landing-grid-row`
  - `.landing-grid-card` base shell
  - `.landing-grid-card-trigger`
  - `.landing-grid-card-content`
  - `.landing-grid-card-title`
  - `.landing-grid-card-title-normal`
  - `.landing-grid-card-subtitle*` 중 정적 typography/clamp
  - `.landing-grid-card-thumbnail-slot`
  - `.landing-grid-card-tags-gap`
  - `.landing-grid-card-tags`
  - `.landing-grid-card-tag-item`
  - `.landing-grid-card-tag-chip`
  - `.landing-grid-card-preview-question`
  - `.landing-grid-card-answer-grid`
  - `.landing-grid-card-answer-choice` base
  - `.landing-grid-card-meta-grid`
  - `.landing-grid-card-meta-item`
  - `.landing-grid-card-meta-label`
  - `.landing-grid-card-meta-value`
  - `.landing-grid-card-primary-cta` base
- 글로벌 유지 1차 surface:
  - `.landing-grid-card-origin-*`
  - `.landing-grid-card[data-expanded-layer='*'] ...`
  - `.landing-grid-card-desktop-stage*`
  - `.landing-grid-card-expanded-shell*`
  - `.landing-grid-card-mobile-transient-shell*`
  - `.landing-grid-card-unavailable-overlay*`
  - 모든 motion/reduced-motion selector
- 명시적 보존 대상:
  - `qmbti`
  - `energy-check`
  - `ops-handbook`
  - row planning
  - underfilled row 시작측 정렬
  - subtitle continuity
  - unavailable hover/tap contract
- 경계 보존:
  - `data-slot`
  - `data-testid`
  - `data-card-*`
  - `data-mobile-*`
  - `data-desktop-*`
  - inline CSS var contract
  - DOM 구조 변경 최소화
- 예상 회귀 포인트:
  - card density
  - title/subtitle clamp
  - meta truncation
  - expanded width contract
  - hover/focus visual continuity
- Checkpoint 4 재감사 기준 잔여 확인:
  - `.landing-grid-card-trigger` base layout이 아직 globals에 남아 있다.
  - `.landing-grid-card` normal static shell의 일부 ownership이 아직 TSX / globals 사이에 분산돼 있다.
- 실행 순서:
  - 1. container/row/card base layout utility 이동
  - 2. normal content slot utility 이동
  - 3. expanded body의 static meta/CTA/answer grid utility 이동
  - 4. state selector는 글로벌 유지
  - 5. 마지막에 expanded width/focus continuity만 집중 확인
- 검증:
  - `npm run lint`
  - `npm run typecheck`
  - `node scripts/qa/check-phase4-grid-contracts.mjs`
  - `node scripts/qa/check-phase5-card-contracts.mjs`
  - `node scripts/qa/check-phase6-spacing-contracts.mjs`
  - `node scripts/qa/check-phase7-state-contracts.mjs`
  - `node scripts/qa/check-phase8-accessibility-contracts.mjs`
  - `node scripts/qa/check-phase9-performance-contracts.mjs`
  - `node scripts/qa/check-phase10-transition-contracts.mjs`
  - `npx playwright test tests/e2e/grid-smoke.spec.ts tests/e2e/state-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts tests/e2e/transition-telemetry-smoke.spec.ts`
- 참고 확인:
  - `landing-normal`
  - `landing-test-expanded`
  - `landing-blog-expanded`
  - `mobile-landing-test-expanded`
  - `mobile-landing-blog-expanded`
  - Safari ghosting 대표 상태
- 완료 체크:
  - [x] landing grid/card의 정적 surface가 Tailwind로 이동했다.
  - [x] state selector와 motion/reduced-motion contract는 글로벌에 유지됐다.
  - [x] 대표 anchor와 expanded/focus continuity가 비회귀다.

### Batch 7 — `globals.css` 최종 축소와 Done 게이트

- 상태: `[x] 완료`
- 2026-04-16 구현 메모:
  - `.landing-shell-card`, `.blog-*`, `.nf-shell`, `.placeholder-shell` static surface를 local utility ownership으로 회수했다.
  - `test-question-client.tsx`, `blog-destination-client.tsx`, `history/page.tsx`, `not-found.tsx`, `global-not-found.tsx`가 각자 spacing/text tone을 직접 소유하도록 정리했다.
  - `landing-data-contract` / `landing-question-bank` 선행 실패는 fixture source 최소 수정으로만 닫았고, 전체 `npm test`와 Playwright smoke를 다시 GREEN으로 맞췄다.
- 목표:
  - 더 이상 컴포넌트에 필요 없는 정적 CSS를 제거한다.
  - `globals.css`를 전역 token/reset/residual selector 전용 파일로 마감한다.
- 수정 대상:
  - [src/app/globals.css](/Users/woohyeon/Local/ViveTest/src/app/globals.css:1)
  - 직전 batch에서 수정한 component 파일들
  - [src/features/test/test-question-client.tsx](/Users/woohyeon/Local/ViveTest/src/features/test/test-question-client.tsx:1)
  - [src/features/landing/blog/blog-destination-client.tsx](/Users/woohyeon/Local/ViveTest/src/features/landing/blog/blog-destination-client.tsx:1)
  - [src/app/[locale]/history/page.tsx](/Users/woohyeon/Local/ViveTest/src/app/[locale]/history/page.tsx:1)
  - [src/app/not-found.tsx](/Users/woohyeon/Local/ViveTest/src/app/not-found.tsx:1)
  - `src/app/global-not-found.tsx`
  - 필요 시 `AGENTS.md`, `docs/project-analysis.md`, `docs/req-landing.md`
- 최종 잔류 영역:
  - token / CSS variable
  - theme bootstrap 지원
  - base reset / body background / font
  - `data-*` / `:has()` 상태 selector
  - reduced-motion
  - keyframes
  - Safari workaround
- Batch 7에서 함께 정리할 비핵심 static surface:
  - `.landing-shell-card`
  - `.landing-shell-card h1/h2/p` reset + muted paragraph rule
  - `.blog-*`
  - `.nf-shell`
  - `.placeholder-shell`
- 실행 순서:
  - 1. 이전 batch에서 남긴 static selector 잔여분 제거
  - 2. shared shell/test/blog/history/not-found static utility 이동
  - 3. `globals.css`를 token/base/residual selector 전용으로 재정렬
  - 4. 문서 동기화 필요 여부 확인
- 문서 동기화 규칙:
  - 스크립트 이름/순서 변경 시 문서 동기화
  - representative anchor 변경 시 문서 동기화
  - baseline 상태 변경 시 문서 동기화
  - `tests/e2e/theme-matrix-manifest.json` closure 변경 시 문서 동기화
- 검증:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - `node scripts/qa/check-phase4-grid-contracts.mjs`
  - `node scripts/qa/check-phase5-card-contracts.mjs`
  - `node scripts/qa/check-phase6-spacing-contracts.mjs`
  - `node scripts/qa/check-phase7-state-contracts.mjs`
  - `node scripts/qa/check-phase8-accessibility-contracts.mjs`
  - `node scripts/qa/check-phase9-performance-contracts.mjs`
  - `node scripts/qa/check-phase10-transition-contracts.mjs`
  - `node scripts/qa/check-phase11-telemetry-contracts.mjs`
  - `npm test -- tests/unit/landing-telemetry-validation.test.ts tests/unit/landing-telemetry-runtime.test.ts tests/unit/landing-transition-store.test.ts tests/unit/test-entry-policy.test.ts tests/unit/test-question-bootstrap.test.ts`
  - `npx playwright test tests/e2e/grid-smoke.spec.ts tests/e2e/state-smoke.spec.ts tests/e2e/gnb-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts tests/e2e/consent-smoke.spec.ts tests/e2e/transition-telemetry-smoke.spec.ts tests/e2e/routing-smoke.spec.ts`
- 알려진 병행 blocker:
  - `registry fixture drift`는 이번 변경에서 최소 범위로 해소되었고, 더 큰 구조 정리는 필요할 때 별도 follow-up으로만 분리한다.
- 비차단 참고 확인:
  - theme-matrix
  - Safari ghosting
  - baseline이 있는 환경에서만 참고 실행 또는 수동 비교
- 완료 체크:
  - [x] `globals.css`가 token/reset/residual selector 전용으로 축소됐다.
  - [x] 전체 Done 게이트를 통과했다.
  - [x] 문서/QA 자산 동기화 필요 여부를 확인했다.

## 7. Batch 간 의존성 메모

- Batch 1이 끝나기 전에는 Tailwind utility를 본격적으로 JSX에 옮기지 않는다.
- Batch 2는 공통 shell route surface에 영향을 주므로 batch 내부에서 `/landing`, `/blog`, `/history`, `/test`를 함께 본다.
- Batch 3은 test 전용 surface 위주로 다루되, `.landing-shell-card` 공유 범위 때문에 shared shell class 제거는 미룬다.
- Batch 4는 GNB smoke와 theme-matrix closure를 동시에 보며 진행한다.
- Batch 5는 Batch 6의 선결 조건이다.
- Batch 7은 style cleanup뿐 아니라 문서 동기화 판단 batch다.

## 8. 파일/selector별 구현 플레이북

### 8.1 `src/app/globals.css`

- 이 파일에서 최종적으로 남아야 하는 것은 "전역이어야만 하는 것"뿐이다.
- 최종 잔류 후보 확정 목록:
  - `:root`
  - `html[data-theme='dark']`
  - `*`, `html`, `body`, `a`, `button`, `input`, `select`, `textarea`
  - `.landing-transition-source-gnb`
  - `.telemetry-consent-banner-spacer`
  - `.telemetry-consent-banner-layer`
  - `.landing-grid-card-text-probe`
  - landing grid/card의 `data-*`, `:has()`, reduced-motion, keyframes, Safari workaround selector
  - GNB settings panel geometry / pseudo-element selector
  - GNB mobile closing state selector
- 최종 제거 대상 후보:
  - shell static spacing
  - hero typography/layout
  - test/blog/not-found panel base layout
  - GNB base button/link/chip shell
  - landing grid/card normal static layout

### 8.2 `src/features/landing/shell/*`

- `PageShell`은 utility를 추가해도 구조를 바꾸지 않는다.
- `ConsentBanner`는 ResizeObserver 기반 spacer 측정이 있으므로 `section`과 spacer/layer DOM을 유지한다.
- `TelemetryConsentBanner`는 visible gating만 담당하므로 style 로직을 넣지 않는다.

### 8.3 `src/features/test/*`

- `InstructionOverlay`는 overlay/card/button 구조가 단순하므로 Tailwind 이전 우선순위가 높다.
- `TestQuestionClient`는 아래 class를 utility로 대체해도 contract가 유지되기 쉽다.
  - `landing-shell-card test-shell-card`
  - `test-shell-header`
  - `test-shell-stage`
  - `test-result-panel`
  - `test-result-grid`
  - `test-result-row`
  - `test-result-actions`
  - `test-question-panel`
  - `test-answer-grid`
  - `test-answer-button`
  - `test-primary-button`
  - `test-secondary-button`
  - `test-nav-row`
- 다만 `data-entry-status`, `data-selected`, `aria-hidden`, `data-testid`는 그대로 유지한다.

### 8.4 `src/features/landing/gnb/*`

- `SiteGnb`에서 utility 이전 우선순위가 높은 부분:
  - header shell
  - desktop/mobile inner row
  - column layout
  - CI link
  - primary nav link
  - settings trigger
  - menu trigger
  - back button
- 전역 잔류 우선순위가 높은 부분:
  - settings panel absolute geometry
  - pseudo-element seam removal
  - mobile panel close transition
  - theme preview chip surface selector
- `SettingsControls`는 `aria-pressed`, `disabled`, `data-chip-surface`, `data-theme-option`이 styling과 smoke assertion에 모두 쓰인다.

### 8.5 `src/features/landing/grid/*`

- `LandingCatalogGrid`는 shell/container/row layout utility 이전만 우선한다.
- `LandingGridCard`는 DOM 구조를 바꾸지 않는 것이 핵심이다.
- 최소 유지 DOM landmarks:
  - root `div.landing-grid-card`
  - `button.landing-grid-card-trigger`
  - `div.landing-grid-card-content`
  - desktop stage subtree
  - mobile expanded subtree
  - mobile transient subtree
  - unavailable overlay subtree
- data-slot landmarks:
  - `primaryTrigger`
  - `cardTitle`
  - `cardThumbnail`
  - `cardSubtitle`
  - `tags`
  - `expandedLayer`
  - `expandedShell`
  - `expandedSurface`
  - `expandedBody`
  - `mobileHeader`
  - `mobileTransientShell`
  - `mobileTransientPanel`
  - `unavailableOverlay`
- title/subtitle continuity split 훅이 class 기반 probe를 사용하므로, text measurement path를 바꾸려면 별도 refactor로 취급한다.

### 8.6 theme-matrix / Safari ghosting 참고 기준

- theme-matrix는 settle recipe 이름이 아니라 manifest case id를 기준으로 추적한다.
- 대표 case id:
  - `landing-normal`
  - `blog-default`
  - `history-default`
  - `test-instruction`
  - `landing-test-expanded`
  - `landing-blog-expanded`
  - `landing-settings-open`
  - `blog-settings-open`
  - `history-settings-open`
  - `test-question`
  - `test-result`
  - `mobile-landing-test-expanded`
  - `mobile-landing-blog-expanded`
  - `mobile-landing-menu-open`
  - `mobile-blog-menu-open`
  - `mobile-history-menu-open`
  - `mobile-test-question`
  - `mobile-test-result`
- Safari ghosting은 settings panel seam, expanded shell shadow/hover-out collapse, stage clipping 관련 회귀를 보는 참고 자산이다.

## 9. 구현자가 바로 따라야 할 작업 순서

- [x] Batch 시작 전에 현재 batch의 제거 후보 selector와 잔류 selector를 문서 기준으로 다시 체크한다.
- [x] TSX에 utility를 추가할 때 `data-*`, `aria-*`, `data-testid`, DOM landmark를 먼저 보존한다.
- [x] 정적 class를 utility로 옮긴 뒤에만 `globals.css` 대응 selector를 제거한다.
- [x] grid/GNB/test overlay처럼 상태 selector가 얽힌 surface는 "정적 base 먼저, 상태 selector 나중" 순서를 지킨다.
- [x] batch 종료 시 문서의 해당 Batch 체크박스와 상태를 같이 갱신한다.

## 10. 다음 세션 착수 체크리스트

- [x] Batch 1 범위만 먼저 열고 Tailwind 진입을 확정했다.
- [x] `globals.css` section 분리 전에는 selector 삭제를 하지 않았다.
- [x] Batch 2부터 route 공통 shell 영향 범위를 함께 검증했다.
- [x] Batch 3에서는 `.landing-shell-card` 공유 범위를 건드리지 않고 test 전용 class를 먼저 이동했다.
- [x] Batch 4에서는 settings panel geometry를 전역 유지 상태로 먼저 두었다.
- [x] Batch 5에서 residual/static 분리를 먼저 마쳤다.
- [x] Batch 7 scope에 `src/features/test/test-question-client.tsx`와 shared shell consumer 정리를 다시 포함했다.
- [x] Batch 7 검증 계획에 `tests/e2e/routing-smoke.spec.ts`를 다시 포함했다.

## 11. 다음 세션 착수 권장 순서

- 2026-04-16 기준 reopened `Batch 6` sign-off와 `Batch 7` cleanup은 모두 완료되었다.
- 완료 시점 확인 항목은 아래 4개다.
- [x] Tailwind 진입 방식은 `@import "tailwindcss"` + `postcss.config.mjs` 기준으로 확정돼 있다.
- [x] `globals.css` residual selector 후보 라벨링은 Batch 5에서 완료됐다.
- [x] landing grid/card의 대표 anchor(`qmbti`, `energy-check`, `ops-handbook`)와 expanded/focus continuity smoke를 다시 확인한다.
- [x] shared shell consumer(`src/features/test/test-question-client.tsx`, blog, history)와 routing/not-found QA(`tests/e2e/routing-smoke.spec.ts`)가 Batch 7 범위/검증 계획에 반영돼 있다.

## 12. 비고

- 현재 workspace에서는 Phase 11 baseline이 복구되어 `theme-matrix`, `Safari ghosting`을 참고 자산으로 사용할 수 있다.
- 다만 theme/GNB/landing grid 관련 batch에서는 비차단 참고 확인 대상으로 계속 유지한다.
- 구현 중 스크립트 이름, representative anchor, baseline 상태, manifest closure가 바뀌면 이 문서와 `AGENTS.md` 및 관련 계약 문서를 같은 변경셋에서 갱신한다.
