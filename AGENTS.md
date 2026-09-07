# AGENTS.md — ViveTest Coding Agent Instructions

## 0. Scope and authority

이 파일은 ViveTest 저장소의 **프로젝트 계약(what this repo requires)** 단일 정본이다. Codex는 이 파일을 직접 읽고, Claude Code는 `.claude/CLAUDE.md` 포인터를 통해 이 파일을 읽는다. 저장소 규칙은 이 파일 한 곳에만 둔다 — 도구별 사본을 만들지 않는다.

- **적용:** 코드·테스트·리팩터링·개발 문서·저장소 설정 변경. 이 저장소에는 런타임 에이전트가 없다 — 이 파일이 곧 코딩 계약이다.
- **비적용:** *how to work*(세션 시작·명확화·plan mode·skill·workspace/git 절차·검증 절차·STATE.md·권한/승인 판단)는 전역 오케스트레이션(`~/.claude/CLAUDE.md` · Codex Settings)의 몫이다 — 여기 재진술하지 않는다.
- **우선순위:** 호스트·사용자 지시 > 이 프로젝트 계약 > 전역 기본. 저장소 고유 사항은 이 파일이 전역 기본을 override한다. 더 가까운 하위 `AGENTS.md`는 델타만 추가하며 이 파일의 불변 규칙·승인 경계를 완화할 수 없다 — 하위 문서는 그 디렉터리 전용 규칙이 3개 이상이거나 전용 fixture/QA/gold standard가 있을 때만 만든다.

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
| Tokens/theme | **런타임**: Tailwind v4 tokens/base = `src/app/globals.css`(분할 금지). 그 안의 `@mirror-begin`/`@mirror-end` 구간은 **설계 정의의 사본**이며 값을 여기서 고치지 않는다 — 설계 정의를 고치고 다시 베낀다(theme cut, 2026-09-07). Landing grid/card motion = `src/features/landing/grid/landing-grid-card.module.css`; 그 파일의 `--normal-*`/`--expanded-*` 는 이제 리터럴이 아니라 전역 토큰을 가리킨다. **설계 정의**(런타임 미소비): `docs/design/ds/colors_and_type.css`(BQ-38) |

디렉터리 소유권 상세 → `docs/agent-guides/project-rules.md §Ownership`.

## 2. Task Routing Table

구현 전 해당 행의 정본만 로드한다 — 전부 선로드하지 않는다.

| Task Type | SSOT Contract | Project Rules | Verify |
|:---|:---|:---|:---|
| routing / locale / not-found | `docs/req-landing.md §5`, `docs/project-analysis.md §4` | `project-rules.md §Architecture` | `verification-commands.md §routing` |
| landing grid / GNB / theme | `docs/req-landing.md §6–11` | `project-rules.md §Blog-Telemetry-Theme` | `verification-commands.md §landing` |
| transition / telemetry / consent | `docs/req-landing.md §8, §12, §13` | `project-rules.md §Blog-Telemetry-Theme` | `verification-commands.md §telemetry` |
| test flow / domain | `docs/req-test.md`, `docs/req-test-plan.md` | `project-rules.md §TestFlow` | `verification-commands.md §test-flow` |
| variant registry / fixture | `docs/req-landing.md §12`, `docs/req-test.md §2`, `docs/project-analysis.md §5.3` | `project-rules.md §VariantRegistry` | `verification-commands.md §variant-registry` |
| visual skin / design tokens / card visual | `docs/design/design.md` (+ §7 application layer) · 토큰 **값**은 `docs/design/ds/colors_and_type.css` | `project-rules.md §Visual-Design` | `verification-commands.md §landing` |
| blocker evidence | `docs/blocker-traceability.json` | — | — |
| 계약·가드·하네스 변경 | 이 파일 · `docs/DECISIONS.md` | `docs/LESSONS_LEARNED.md`(**필수 진입점**) | `npm test` (계약 가드는 vitest에 있다) |

함정 원장은 전문을 읽지 않는다 — `grep '^### L' docs/LESSONS_LEARNED.md`로 제목을 훑고 걸리는 항목만 연다. `project-rules.md`·`verification-commands.md`는 `docs/agent-guides/` 아래에 있다. `docs/requirements.md` = 배경 컨텍스트(직접 SSOT 아님). `docs/done/**`·`docs/archive/**` = 이력 참고(현행 계약 아님 — §7-1 문서 생명주기).

### Rebuild Workflow Sources

rebuild scope·wave 시퀀싱·legacy 비교·rollback 앵커가 걸린 작업에서만 로드한다.

- `docs/wave-roadmap.md` — 승인된 wave 시퀀스·전제·include/exclude·리스크·handoff·검증 기대.
- `docs/decision-register.md` — 확정 rebuild 결정(`BQ-NN`)·충돌 해소·scope guard·구현 caveat.
- `docs/design/design.md` — 시각 권위(foundations → tokens → components → patterns/application). **visual-only(BQ-21)**: waves/scope/QA/routing/telemetry/storage/behavior/i18n/test-flow/a11y를 지배하지 않는다. 전역 토큰값은 target intent이며 전역 적용 시점은 wave 소관.
- `docs/design/ds/` — **토큰과 카탈로그 컴포넌트의 실현 정의(BQ-38)**. `colors_and_type.css`가 §5 토큰의 실제 값을, `catalog-components.css`가 카드 시스템을 갖는다. 저장소가 소유하고 Claude Design의 VIVE Design System v2(`cd630eec`)에 단방향 push한다 — 동기화 절차·운영 함정은 `SYNC.md`, 미해결 항목(M-01 easing, D-01 온도, D-02 Pretendard, D-03 accent 상태, D-05 legacy 잔존 4건)은 `README.md`와 `preview/catalog-drift.html`. **런타임이 소비하지 않는 문서 계층**이며, `catalog-components.css`는 제품에 이식할 수 없는 스펙 스타일시트다.

**Visual source precedence (BQ-21, BQ-38로 보완):** `decision-register.md` → product requirements / active rules → `docs/design/design.md` → patterns/application layer → mockup resources → 기존 구현 evidence → wave-specific CSS(예외만). design.md는 behavior/storage/telemetry/routing/i18n/test-flow/QA/a11y 계약을 override하지 않는다. **토큰 값이 design.md §5와 `ds/colors_and_type.css`에서 갈리면 `ds/`가 실현값이고 design.md가 intent다** — 그 갈림은 등재된 것만 유효하며(현재 BQ-38의 3건), 새 갈림은 쓰기 전에 등재한다.

## 3. Repo coding principles (domain)

- **Contract-first:** 동작·라우팅·test-flow·telemetry·a11y·시각 토큰 계약은 §2가 라우팅하는 SSOT(`req-*.md`, `design.md`, `project-analysis.md`)에서 온다. 행동 변경 전 해당 계약을 읽고 재해석하지 않는다.
- **No fabrication (domain):** route path·locale code·variant ID·telemetry payload 필드·config 값·test title을 추정으로 만들지 않는다. `src/config/site.ts`·`src/messages/**`·variant registry·실제 소스/생성 파일에서만 가져온다.
- **Generated ≠ hand-written:** `src/features/variant-registry/variant-registry.generated.ts`와 typegen 산출물은 생성물이다. `source-fixture.ts`·`builder.ts`·`resolvers.ts`를 먼저 고치고 재생성한다 — 생성 파일 직접 편집 금지.
- **Single request entry:** `src/proxy.ts`가 유일 요청 진입점. `src/middleware.ts`를 재도입하지 않는다.
- **Tokens SSOT:** Tailwind v4 tokens/base는 `src/app/globals.css` 한 곳 — 여러 CSS로 분할하지 않고 in-place로만 정리한다.
- **File size discipline:** 변경으로 소스 파일이 ~500줄을 넘게 되거나 3개 이상의 새 소스 파일 분리가 필요하면 구현을 멈추고 리팩터링 계획을 제안·승인받는다(문서·계획 파일 제외). ~30줄 미만 새 소스 파일은 여러 곳에서 재사용되고 독립 테스트 가능할 때만 만들고, 단일 사용 코드는 호출자에 inline한다.
- **Test isolation:** 테스트는 라이브 상태·생성 파일·Playwright baseline을 오염시키지 않는다. baseline 재생성은 승인된 명시 단계(`qa:visual:full` / `--update`)로만.
- **Design definition is repo-owned and flows one way:** 시각 정의의 정본은 저장소(`docs/design/ds/`)이고 Claude Design은 그것을 **소비**한다. Claude Design 쪽에서 저작해 손으로 베껴 오지 않는다 — 종전에 토큰 값이 저장소 밖 하네스에 있었고 두 쪽이 세 번(BQ-21·R1·R2) 어긋났다. 동기화 절차와 운영 함정은 `docs/design/ds/SYNC.md`가 소유한다(여기 재서술하지 않는다).

### 3-1. 시각 값의 출처 4분류

`docs/design/ds/**`·`docs/design/design.md`·계획서에 시각 값을 적을 때는 그 값이 **어디서 왔는지**를 함께 적는다. 판정 기준 한 줄: **"이 값을 제품 코드에서 바꾸면 이 문장이 거짓이 되는가?"** — 그렇다면 R이다. 출처를 밝히지 않은 값은 쓰지 않는다.

| 코드 | 종류 | 정본 소유자 | 예 | 처분 |
|:---:|:---|:---|:---|:---|
| **R** | Realized — 제품이 실제로 렌더하는 값 | 런타임 소스(`src/app/globals.css` · `src/features/landing/grid/landing-grid-card.module.css`) | 확장 모션 280ms, sage `#5c8e78` | ds/는 이 값을 베끼되 **어느 file:line에서 읽었는지** 적는다 |
| **C** | Catalog — 확정된 설계 정의 | `docs/design/ds/colors_and_type.css` | VIVE 토큰 이름·구조 | 제품이 여기로 수렴한다(테마 컷) |
| **D** | Derived — 아직 실현되지 않은 파생값 | 그것을 파생한 문서 | `--accent-hover` | **realized로 제시 금지.** 파생임을 값 옆에 적는다 |
| **I** | Intent — 목표값이지 현재값이 아님 | `docs/design/design.md` | §5.11의 260ms | R과 갈리면 등재 후에만 유효(§2 Visual source precedence) |

R과 C가 갈리는 지점은 등재된 것만 유효하다. 새 갈림을 발견하면 **쓰기 전에** `decision-register.md`에 등재하고, 미해결 상태로 남길 것은 `docs/design/ds/README.md`의 findings에 적는다.

> *surgical changes*, *minimum code*, *read before asserting(미확인 API·파일·config 발명 금지)*, *verifiable completion* 등 **도구 무관 작업 규율은 전역 오케스트레이션 소관**이다 — 여기 재진술하지 않는다.

## 4. Critical boundaries

전역 오케스트레이션의 authorization·planning 정책이 참조하는 repo 경계다. Ask-First·High-Risk·SSOT를 건드리는 변경이 plan mode를 발동한다.

### Workspace and branch roles

**이 저장소는 워크트리를 만들지 않는다 — 격리 작업공간은 `git clone`이다.** 워크트리 생성·이동 명령은 금지이며, 어떤 문서·계획·프롬프트도 그것을 지시할 수 없다. clone 생성·브랜치 공개·커밋·push·착지 절차는 전역 오케스트레이션이 소유한다.

브랜치·태그 역할은 고정된 프로젝트 사실이다 — 개명·용도 변경·삭제는 사용자 명시 승인 전 금지.

| Ref | Role |
|:---|:---|
| `main` | 기본 브랜치이자 유일한 착지 대상 |
| `legacy/reference` (`d3305b7`) | pre-rebuild 기준선. 읽기 전용 참조(행동·구현 비교·evidence·계약 보존 점검) — 구현·수정 금지 (BQ-14) |
| `anchor/w01-02-card-structure` | waves 1–2 range rollback 앵커이자 **wave-2 완료 시점** (BQ-13, BQ-15) |
| `anchor/w03-06-card-expanded` · `anchor/w07-10-blog-unavailable-grid` · `anchor/w11-14-landing-stable` · `anchor/w15-17-gnb-theme-mobile` | 각 range의 **착수 직전 setup baseline**. 넷이 같은 커밋을 가리키며 그 range의 완료 상태가 아니다 — 이름이 시사하는 것과 값이 다르므로 rollback 기준으로 꺼낼 때 구분한다 (BQ-13, BQ-15) |

rollback 앵커의 실체는 `origin`의 주석 태그이지 브랜치가 아니다. 종전의 `checkpoint/*` 로컬 브랜치는 원격에 없어 기계마다 다른 커밋으로 흘렀고, 2026-09-03에 태그 보존을 증명한 뒤 삭제됐다. 태그는 clone에 딸려 오므로 어느 체크아웃에서도 같은 값으로 해석된다 — `tests/unit/contract-citations.test.ts`가 그 해석을 검사한다.

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
- `docs/design/ds/**` — 편집이 저장소 밖으로 나간다. 이 디렉터리는 Claude Design 프로젝트 `cd630eec`로 단방향 push되는 표면이므로, 여기서의 편집은 저장소 안에서 끝나지 않는다. push 여부·경로별 대상은 `SYNC.md`가 소유한다.
- `AGENTS.md` · `.claude/CLAUDE.md` · `.claude/settings.json` · `package.json`/`package-lock.json` · 빌드·배포·스케줄 설정

테스트 추가·설명 문서라도 위 계약의 동작·정본·승인 경계를 바꾸면 Ask-First로 취급한다.

### High-Risk Areas
계획에 위험 차원(usability / a11y / responsiveness / performance / design-system consistency)을 명시하고 Playwright E2E 회귀 커버리지(§5·§8)를 포함한다.
- `src/features/landing/grid/{use-landing-interaction-controller,use-mobile-card-lifecycle,use-keyboard-handoff}.ts`
- `src/features/gnb/site-gnb.tsx` · `src/features/landing/shell/page-shell.tsx`
- `public/theme-bootstrap.js` · `src/features/telemetry/consent-source.ts` · `src/features/transition/`

### SSOT contracts
동작·플로우·시각 계약 정본: `docs/req-landing.md`, `docs/req-test.md`, `docs/req-test-plan.md`, `docs/project-analysis.md`, `docs/design/design.md`(visual-only), `docs/design/ds/colors_and_type.css`(토큰 실현값, BQ-38), 그리고 이 파일과 `docs/agent-guides/**`. rebuild 결정 정본 = `docs/decision-register.md` · `docs/wave-roadmap.md`.

### Always — modify freely
`src/features/**` · `src/i18n/**` · `src/lib/routes/**` · `src/messages/**` · `tests/**` · `docs/**` · `public/**`(bootstrap 계약 유지) · `.planning/**`(문서·세션 상태만, 실행 코드 없음).

`.planning/STATE.md`(세션 연속성) ≠ `docs/plans/`(기능 계획 SSOT) — 상호 대체 금지. 어떤 런타임 모듈도 `.planning/`을 import하지 않는다.

### Hard stops (repo-specific)
- theme-matrix/golden baseline `--update`(`qa:visual:full`)는 사람 승인 없이 실행하지 않는다.
- `.env`·비밀값은 사용자 입력 영역 — 읽거나 출력하거나 커밋하지 않는다.

## 5. Build and verification commands

명령 실행 전 실제 script 이름·flag를 `package.json`·`next.config.ts`·`playwright.config.ts`·`src/config/site.ts`에서 확인한다 — 존재하지 않는 게이트를 발명하지 않는다. 의존성 설치는 `npm ci`, E2E 로컬 실행 전 `npx playwright install chromium webkit`.

### Basic gates — Default Done gate (순서)
```bash
npm run lint         # eslint .
npm run typecheck    # next typegen && tsc --noEmit
npm test             # vitest run
npm run build        # next build
```

### Reference commands
```bash
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

**Rebuild 작업 추가 필드:** 해당 wave 번호/범위 · Task mode(`Analysis Only` / `Plan Only` / `Implementation`) · reference-only 파일·브랜치(수정 금지 대상 명시) · 해당 wave Exclude 보존 계약 · wave scope 내 검증 게이트.

### 7-1. 문서 생명주기 — 물리 위치가 유일한 정본

| 위치 | 상태 |
|:---|:---|
| `docs/plans/` | **활성** — 진행 중이거나 아직 착수하지 않은 계획·확인표 |
| `docs/done/` | 반영 완료 기록 |
| `docs/done/closed/` | 미구현 종결(SUPERSEDED · REJECTED · CANCELLED) |
| `docs/archive/` | 대체된 규칙 문서와 옛 세션 앵커. 현행 계약이 아니다 |

계획이 착지하면 같은 커밋에서 `docs/done/`으로 옮긴다 — 나중에 하기로 하면 하지 않게 되고, 그 순간 `docs/plans/`는 다시 활성과 완료가 섞인 목록이 된다. **생명주기 색인 파일(`PLANS_INDEX.md` 등)을 만들지 않는다**: 상태를 위치와 색인이 함께 주장하면 어느 쪽이 옳은지 알 수 없고, 수기 색인은 파일이 늘 때 조용히 어긋난다. `tests/unit/docs-lifecycle.test.ts`가 두 규약을 집행한다.

**역사는 소급 수정하지 않는다.** `docs/done/**`·`docs/archive/**`의 경로 인용이 이관으로 낡아도 고치지 않는다 — 그 문서는 당시 사실의 기록이고, 고치면 그 계획이 무엇을 근거로 승인됐는지 읽을 수 없게 된다. 링크 가드가 계약 문서와 살아 있는 계획서에만 걸리는 것이 그 때문이다.

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

배운 것은 네 계층이 나눠 갖고, 각 계층은 서로 다른 질문에 답한다. 사실은 그 질문이 사는 곳에, 그곳에만 둔다 — 같은 규칙이 두 곳에 있으면 표류하고 인용은 패치되지 않은 쪽으로 옮겨 간다.

| 계층 | 답하는 질문 | 위치 |
|:---|:---|:---|
| 전역 오케스트레이션 | 어느 저장소에서든 어떻게 일하는가 | `~/.claude/CLAUDE.md`(저장소 밖 — 여기 재서술하지 않는다) |
| 저장소 계약 | 이 저장소에서 세션이 알아야 하는 것 | 이 파일 · `.claude/CLAUDE.md`(포인터) · `docs/agent-guides/**` · 코드 docstring |
| 프로젝트 메모리 | 기계 종속이거나 적용되는 순간에 떠올라야 하는 사실 | `~/.claude/projects/<슬러그>/memory/`(기계 로컬, 훅이 동기화) |
| 결정의 이유 | 왜 이 모양인가, 무엇이 이미 기각됐나 | `docs/DECISIONS.md` |

이 넷 말고 **저장소 밖 독자**가 하나 있다. `docs/design/ds/SKILL.md`는 Claude Design 쪽 세션이 읽는 진입점이며 push 대상이다 — 저장소 세션을 위한 규칙을 거기 적지 않는다(§0의 「도구별 사본을 만들지 않는다」가 같은 이유로 여기에도 적용된다). 그 파일이 말할 것은 그 시스템을 **쓰는 법**이고, 저장소가 정의를 소유한다는 사실 한 줄이다.

- 비사소한 변경 후 실제 동작과 달라진 문서를 점검·갱신한다: 라우팅된 `req-*.md`/`project-analysis.md`(계약 변경 시), `docs/design/design.md` patterns/application(신규 시각 결정 확정 시 — implementation-only refactor엔 미갱신, BQ-21), `docs/wave-roadmap.md` 상태, `docs/decision-register.md`. 범위 밖 문서가 갱신 필요하면 조용히 확장하지 말고 보고한다.
- **이 파일 갱신 트리거**(승인된 규칙 개정 요청 하에서만): 명령·script 변경 / 프로젝트 사실(route·locale·stack·anchor·생성-SSOT 경계) 변경 / 소유권·구조·gold standard 변경 / repo 고유 실수 2회 이상 반복. 갱신 시 파일 경로·명령·locale·anchor를 실제 저장소와 대조한다.
- **함정 원장 등재 의무:** 세션이 ⑴ 앞으로도 반복될 구현 패턴에서 ⑵ 기존 게이트·통상 리뷰가 **구조적으로** 잡지 못하는 결함을 발견·수정·회피했고 ⑶ 다음 세션이 착수 전에 알았다면 피할 수 있었다면, **착지 전에** `docs/LESSONS_LEARNED.md`에 그 형식대로 등재하거나 등재 불요 판정을 보고에 한 줄 남긴다. 1회성 버그와 이미 테스트로 고정된 회귀는 등재하지 않는다 — 그것들은 테스트가 기억한다. 포함·제외 기준과 항목 형식·번호 규약은 그 문서의 머리말이 소유한다.
- 규칙 문서(이 파일·`docs/agent-guides/**`)에는 불변식만 적는다. 사건 예시·경위·기각된 대안은 `docs/DECISIONS.md`와 `docs/done/`이 갖는다.

## 10. Session guardrails (repo-specific)

자율 편집 실패 모드를 이 저장소 맥락에서 막는 규칙이다.

- **계약을 기억으로 인용하지 않는다.** 규칙·근거를 설명하거나 그에 따라 행동하기 전에 §2가 라우팅하는 해당 섹션을 다시 읽는다.
- **행동 계약이 불확실하면 가정하기 전에 기존 E2E 커버리지(`tests/e2e/**`)를 먼저 확인한다.** 이 저장소에서는 E2E 스펙이 동작 계약의 실측 기록이다.
- **시각 baseline diff는 회귀로 간주한다** — `tests/e2e/theme-matrix-baseline-provenance.md`에서 provenance가 확인되기 전까지. 스냅샷 차이를 "의도된 변경"으로 임의 해석하지 않는다.
- **wave 경계를 넘기 전에 정지한다.** 요청이 `docs/wave-roadmap.md`의 해당 wave include/exclude 경계를 넘으면 계획 작성 전에 정지·보고한다.
- **지침 충돌 시 자체 해소 금지.** 파일 경로·명령·계약 참조가 이 파일과 하위 `AGENTS.md` 사이에서 다르면 정지 — 충돌 항목을 출처와 함께 나열하고 문서 충돌로 보고한다.
