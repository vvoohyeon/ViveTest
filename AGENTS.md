# AGENTS.md — ViveTest Coding Agent Instructions

## 0. Scope and authority

이 파일은 ViveTest 저장소의 **프로젝트 계약(what this repo requires)** 정본이다.

- **적용:** 코드·테스트·리팩터링·개발 문서·저장소 설정 변경.
- **비적용:** *how to work*(세션 시작·명확화·plan mode·skill·검증 절차·STATE.md·권한/승인 판단)는 도구 전역 오케스트레이션(Codex Settings / Claude Code settings)의 몫이다 — 이 파일에 재진술하지 않는다. Claude Code는 루트 `CLAUDE.md` 어댑터가 이 파일을 SSOT로 참조한다.
- **우선순위:** 호스트·사용자 지시 > 이 프로젝트 계약 > 도구 전역 기본. 저장소 고유 사항은 이 파일이 도구 기본을 override한다. 더 가까운 하위 `AGENTS.md`는 델타만 추가하며 이 파일의 불변 규칙·승인 경계를 완화할 수 없다 — 하위 문서는 그 디렉터리 전용 규칙이 3개 이상이거나 전용 fixture/QA/gold standard가 있을 때만 만든다.

## 1. Project orientation

ViveTest은 다국어 랜딩·테스트 플로우 Next.js 앱이다. 라우팅·i18n·variant registry·telemetry·transition을 결정론적 계약으로 두고, 시각 스킨은 별도 SSOT(`docs/design/design.md`)가 규정한다. 현재 **rebuild wave 진행 중**(§2 Rebuild Workflow Sources).

### Runtime surface

| Fact | Value |
|:---|:---|
| Routes | `/{locale}`, `/{locale}/blog`, `/{locale}/blog/{variant}`, `/{locale}/history`, `/{locale}/test/{variant}`, `/{locale}/test/error`, `/api/telemetry` |
| 404 surface | `src/app/not-found.tsx`, `src/app/global-not-found.tsx` |
| Locales | `en`, `kr`, `zs`, `zt`, `ja`, `es`, `fr`, `pt`, `de`, `hi`, `id`, `ru` (정규화: `ko* → kr` · Simplified Chinese → `zs` · Traditional Chinese → `zt`) |
| Request entry | 단일 진입 `src/proxy.ts` (middleware 없음). `[locale]/layout.tsx`: `dynamicParams = false` |
| `next.config.ts` flags | `typedRoutes`, `experimental.globalNotFound`, `outputFileTracingRoot = cwd`, `allowedDevOrigins = ['127.0.0.1']`, `turbopack.root = cwd` |
| Tech stack | `next@16.2.4`, `react@19.2.4`, `react-dom@19.2.4`, `next-intl@4.9.1`, `motion@12.34.0`, `tailwindcss@4.1.0`, `typescript@5.9.3`; 테스트 `vitest`, `@playwright/test` |
| Tokens/theme | Tailwind v4 tokens/base = `src/app/globals.css`(분할 금지). Landing grid/card motion + scoped visual-skin tokens(`--normal-*`/`--expanded-*`) = `src/features/landing/grid/landing-grid-card.module.css` |

디렉터리 소유권 상세 → `docs/agent-guides/project-rules.md §Ownership`.

## 2. Task Routing Table

| Task Type | SSOT Contract | Project Rules | Verify |
|:---|:---|:---|:---|
| routing / locale / not-found | `docs/req-landing.md §5`, `docs/project-analysis.md §4` | `project-rules.md §Architecture` | `verification-commands.md §routing` |
| landing grid / GNB / theme | `docs/req-landing.md §6–11` | `project-rules.md §Blog-Telemetry-Theme` | `verification-commands.md §landing` |
| transition / telemetry / consent | `docs/req-landing.md §8, §12, §13` | `project-rules.md §Blog-Telemetry-Theme` | `verification-commands.md §telemetry` |
| test flow / domain | `docs/req-test.md`, `docs/req-test-plan.md` | `project-rules.md §TestFlow` | `verification-commands.md §test-flow` |
| variant registry / fixture | `docs/req-landing.md §12`, `docs/req-test.md §2`, `docs/project-analysis.md §5.3` | `project-rules.md §VariantRegistry` | `verification-commands.md §variant-registry` |
| visual skin / design tokens / card visual | `docs/design/design.md` (+ §7 application layer) | `project-rules.md §Visual-Design` | `verification-commands.md §landing` |
| blocker evidence | `docs/blocker-traceability.json` | — | — |

`project-rules.md`·`verification-commands.md`는 `docs/agent-guides/` 아래에 있다. `docs/requirements.md` = 배경 컨텍스트(직접 SSOT 아님). `docs/archive/**` = 이력 참고(현행 계약 아님). 구현 전 해당 행의 정본만 로드한다.

### Rebuild Workflow Sources

rebuild scope·wave 시퀀싱·worktree 역할·checkpoint·legacy 비교·rollback 앵커가 걸린 작업에서만 로드한다.

- `docs/wave-roadmap.md` — 승인된 wave 시퀀스·전제·include/exclude·리스크·handoff·검증 기대.
- `docs/decision-register.md` — 확정 rebuild 결정·충돌 해소·scope guard·구현 caveat.
- `docs/rebuild-worktree-setup.md` — 확정 worktree/branch 역할·활성 구현 workspace·legacy 참조 경계·checkpoint/rollback 앵커.
- `docs/design/design.md` — 시각 권위(foundations → tokens → components → patterns/application). **visual-only(BQ-21)**: waves/scope/QA/routing/telemetry/storage/behavior/i18n/test-flow/a11y를 지배하지 않는다. 전역 토큰값은 target intent이며 전역 적용 시점은 wave 소관.

**Visual source precedence (BQ-21):** `decision-register.md` → product requirements / active rules → `docs/design/design.md` → patterns/application layer → mockup resources → 기존 구현 evidence → wave-specific CSS(예외만). design.md는 behavior/storage/telemetry/routing/i18n/test-flow/QA/a11y 계약을 override하지 않는다.

## 3. Repo coding principles (domain)

- **Contract-first:** 동작·라우팅·test-flow·telemetry·a11y·시각 토큰 계약은 §2가 라우팅하는 SSOT(`req-*.md`, `design.md`, `project-analysis.md`)에서 온다. 행동 변경 전 해당 계약을 읽고 재해석하지 않는다.
- **No fabrication (domain):** route path·locale code·variant ID·telemetry payload 필드·config 값·test title을 추정으로 만들지 않는다. `src/config/site.ts`·`src/messages/**`·variant registry·실제 소스/생성 파일에서만 가져온다.
- **Generated ≠ hand-written:** `src/features/variant-registry/variant-registry.generated.ts`와 typegen 산출물은 생성물이다. `source-fixture.ts`·`builder.ts`·`resolvers.ts`를 먼저 고치고 재생성한다 — 생성 파일 직접 편집 금지.
- **Single request entry:** `src/proxy.ts`가 유일 요청 진입점. `src/middleware.ts`를 재도입하지 않는다.
- **Tokens SSOT:** Tailwind v4 tokens/base는 `src/app/globals.css` 한 곳 — 여러 CSS로 분할하지 않고 in-place로만 정리한다.
- **Test isolation:** 테스트·골든은 라이브 상태·생성 파일·Playwright 스냅샷을 오염시키지 않는다. baseline 재생성은 승인된 명시 단계(`qa:visual:full` / `--update`)로만.

> *surgical changes*, *minimum code*, *read before asserting(미확인 API·파일·config 발명 금지)*, *verifiable completion* 등 **도구 무관 작업 규율은 전역 Settings 소관**이다 — 여기 재진술하지 않는다.

## 4. Critical boundaries

Codex authorization policy가 참조하는 repo 경계다. Ask-First·High-Risk·SSOT를 건드리는 변경이 plan mode를 발동한다.

### Rebuild worktree boundaries
rebuild 작업에서 확정된 branch/worktree/checkpoint 토폴로지를 재설계·개명·재해석하지 않는다.
- 활성 rebuild 구현 기본 = 확정 로컬 `main` workspace(사용자 명시 지시 없으면).
- `legacy/reference` = read-only 참조 전용(행동·구현 비교·evidence·계약 보존 점검용) — 수정·구현 브랜치 사용 금지.
- checkpoint worktree = 검증·비교·rollback 앵커(일반 구현 공간 아님). branch update/recovery/merge/reset/revert/push는 사용자 명시 승인 전 금지.
- 토폴로지 변경이 필요해 보이면 정지·보고(blocking question).

### Never — do not modify
- `src/middleware.ts` 재도입 금지(단일 진입 `src/proxy.ts`).
- 빌드 산출물 직접 편집 금지: `.next/`·`node_modules/`·`coverage/`·`test-results/`·`playwright-report/`·`dist/`·`out/`·`tsconfig.tsbuildinfo`·`next-env.d.ts`(typegen 산출·비추적).

### Ask-First — 사용자 승인 없는 구현 금지
관련 계약 문서·테스트 앵커를 확인한 뒤에만 손댄다.
- `src/proxy.ts` · `src/app/layout.tsx` · `src/app/[locale]/layout.tsx`
- `src/app/globals.css` (Tailwind v4 tokens/base SSOT — 분할 금지, in-place 정리만)
- `public/theme-bootstrap.js`
- `src/lib/routes/route-builder.ts` · `src/i18n/localized-path.ts`
- `src/features/variant-registry/{source-fixture,builder,resolvers,types}.ts` 및 `variant-registry.generated.ts`(생성물 — source 먼저)
- `scripts/qa/*.mjs` · `tests/e2e/theme-matrix-manifest.json` · `docs/blocker-traceability.json`
- `AGENTS.md` · `CLAUDE.md` · `package.json`/`package-lock.json` · 빌드·배포·스케줄 설정

테스트 추가·설명 문서라도 위 계약의 동작·정본·승인 경계를 바꾸면 Ask-First로 취급한다.

### High-Risk Areas
계획에 위험 차원(usability / a11y / responsiveness / performance / design-system consistency)을 명시하고 Playwright E2E 회귀 커버리지(§5·§8)를 포함한다.
- `src/features/landing/grid/{use-landing-interaction-controller,use-mobile-card-lifecycle,use-keyboard-handoff}.ts`
- `src/features/gnb/site-gnb.tsx` · `src/features/landing/shell/page-shell.tsx`
- `public/theme-bootstrap.js` · `src/features/telemetry/consent-source.ts` · `src/features/transition/`

### SSOT contracts
동작·플로우·시각 계약 정본: `docs/req-landing.md`, `docs/req-test.md`, `docs/req-test-plan.md`, `docs/project-analysis.md`, `docs/design/design.md`(visual-only), 그리고 이 지침 파일들. rebuild 결정 정본 = `docs/decision-register.md` · `docs/wave-roadmap.md`.

### Always — modify freely
`src/features/**` · `src/i18n/**` · `src/lib/routes/**` · `src/messages/**` · `tests/**` · `docs/**` · `public/**`(bootstrap 계약 유지) · `.planning/**`(문서·세션 상태만, 실행 코드 없음).
`.planning/STATE.md`(세션 연속성) ≠ `docs/plans/`(기능 계획 SSOT) — 상호 대체 금지. 어떤 런타임 모듈도 `.planning/`을 import하지 않는다.

### Hard stops
- 비가역·파괴적 행위(prod 배포·DB·credential 회전·파일 삭제·destructive git·build/deploy 설정·외부 네트워크·미검증 패키지)의 **하드 차단은 이 산문이 아니라 도구 강제층의 몫**이다 — Codex: `.codex/rules`(execpolicy `forbidden`/`prompt`) + approval + sandbox / Claude Code: `permissions.deny` + `sandbox` + `PreToolUse` 훅. 구성된 계층은 우회하지 말고, 막히면 다른 경로를 찾지 말고 정지·보고한다. 강제층이 아직 구성되지 않은 경로에서는 이 산문이 유일 게이트임을 전제로 보수 판단하고, 갭을 플래그한다.
- theme-matrix/golden baseline `--update`(`qa:visual:full`)는 사람 승인 없이 실행하지 않는다.
- `.env`·비밀값은 사용자 입력 영역 — 읽거나 출력하거나 커밋하지 않는다. 사용자 소유 미커밋 diff를 노출·덮어쓰지 않는다.

## 5. Build and verification commands

명령 실행 전 실제 script 이름·flag를 `package.json`·`next.config.ts`·`playwright.config.ts`·`src/config/site.ts`에서 확인한다 — 존재하지 않는 게이트를 발명하지 않는다. 의존성 설치는 `npm ci`, E2E 로컬 실행 전 `npx playwright install chromium webkit`.

### Basic gates — Default Done gate (순서)
```
npm run lint         # eslint .
npm run typecheck    # next typegen && tsc --noEmit
npm test             # vitest run
npm run build        # next build
```

### Reference commands
```
npm run qa:static        # lint + typecheck + qa:rules
npm run qa:rules         # scripts/qa/run-all.mjs (12 contract checks) — Default Done gate 제외, release-level
npm run test:e2e         # playwright test
npm run test:e2e:smoke   # @smoke subset (preview server)
npm run test:e2e:gate    # @gate subset (preview server)
npm run qa:gate:once     # qa:static + build + test + test:e2e:gate — release/flaky 조사용
npm run qa:gate          # qa:gate:once ×3 — full release validation
npm run qa:visual:full   # theme-matrix baseline 재생성(승인 필요)
npm run sync / npm run sync:dry   # Sheets sync / dry-run
```

- `qa:rules`는 Default Done gate에서 **제외**(release-level). 현재 pass/fail은 실행으로 확인한다.
- Playwright baseline = 로컬 PNG(`tests/e2e/*-snapshots/`); provenance = `tests/e2e/theme-matrix-baseline-provenance.md`.
- 변경 유형별 추가 명령 → `docs/agent-guides/verification-commands.md`(§8).
- 버그·행동 변경은 회귀 커버리지를 추가하거나 갱신한다. 테스트 러너 전후 라이브 상태 해시 불변 검사를 우회하지 않는다.

## 6. Gold Standards

외부 패턴을 참조하기 전에 확인하고 아래를 그대로 replicate한다.

| Purpose | File |
|:---|:---|
| Thin route reference | `src/app/[locale]/page.tsx` |
| Locale-free route authoring | `src/lib/routes/route-builder.ts` |
| Locale prefix application | `src/i18n/localized-path.ts` |
| Resolver boundary | `src/features/variant-registry/resolvers.ts` |
| Builder | `src/features/variant-registry/builder.ts` |
| Source/runtime type separation | `src/features/variant-registry/types.ts` |
| Pure domain public surface | `src/features/test/domain/index.ts` |
| Pure validator | `src/features/test/domain/validate-variant.ts` |
| Instruction entry policy | `src/features/test/entry-policy.ts` |
| Telemetry payload hygiene | `src/features/telemetry/validation.ts` |
| Transition storage/runtime | `src/features/transition/runtime.ts` |
| Representative e2e anchor | `tests/e2e/helpers/landing-fixture.ts` |

## 7. Plan fields

Ask-First·High-Risk·SSOT 작업 계획은 `docs/plans/YYYY-MM-DD-feature.md`에 저장하며 다음을 포함한다: All files to be modified · Relevant SSOT(§2) · Impact assessment(shared shell/GNB · localization · a11y · state contracts · core user flow) · Validation commands(`verification-commands.md`) · 사용자 확인이 필요한 결정.

**Rebuild 작업 추가 필드:** 해당 wave 번호/범위 · Task mode(`Analysis Only` / `Plan Only` / `Implementation`) · reference-only 파일·worktree(수정 금지 대상 명시) · 해당 wave Exclude 보존 계약 · wave scope 내 검증 게이트.

## 8. Change-type verification anchors

Basic gates(§5) 이후 변경 유형별 추가 검증. 실제 명령은 `docs/agent-guides/verification-commands.md`.

| 변경 유형 | 추가 검증·문서 확인 |
|:---|:---|
| routing / locale / proxy | `#routing` — route-builder·localized-path·locale-resolution·proxy-policy 단위 + routing-smoke E2E |
| landing grid / GNB / theme | `#landing` — phase4~10 contract checks + grid/GNB/state/theme 단위 + grid/state/gnb/a11y smoke |
| transition / telemetry / consent | `#telemetry` — phase10/11 contracts + telemetry/transition 단위 + consent/transition smoke |
| test flow / domain / entry-policy | `#test-flow` — domain·entry-policy·question-bank 단위 (+ consent-smoke) |
| variant registry / fixture | `#variant-registry` — registry/variant-only contracts + data/card/serializer 단위 |
| blog detail / subtitle continuity | `blog-server-model`·`landing-card-contract` 단위 |

## 9. Documentation

- 비사소한 변경 후 실제 동작과 달라진 문서를 점검·갱신한다: 라우팅된 `req-*.md`/`project-analysis.md`(계약 변경 시), `docs/design/design.md` patterns/application(신규 시각 결정 확정 시 — implementation-only refactor엔 미갱신, BQ-21), `docs/wave-roadmap.md` 상태, `docs/decision-register.md`. 범위 밖 문서가 갱신 필요하면 조용히 확장하지 말고 보고한다.
- 지침 파일(`AGENTS.md`·`CLAUDE.md`) 수정은 사용자가 규칙 개정을 명시 요청하고 승인된 계획이 있을 때만. **AGENTS.md 갱신 트리거:** 명령·script 변경 / 프로젝트 사실(route·locale·stack·anchor·생성-SSOT 경계) 변경 / 소유권·구조·gold standard 변경 / repo 고유 실수 2회 이상 반복. 갱신 시 파일 경로·명령·locale·anchor를 실제 저장소와 대조한다.
- `.planning/STATE.md`는 Codex↔Claude Code 교대용 공유 컨텍스트다 — 실행 권한·계획 승인을 부여하지 않으며 실제 저장소·승인된 계획·게이트 결과보다 우선하지 않는다.
