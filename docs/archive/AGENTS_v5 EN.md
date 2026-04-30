# AGENTS.md

> **Role**: Project-specific facts, runtime constraints, and routing index for ViveTest.
> Skill routing, orchestration rules, and agent workflow → Codex Custom Instructions.
> Rules present here are project-specific deviations or constraints — not restatements of CI defaults.

---

## 1. Session Startup

1. Read this file. Internalize critical boundaries (§4), build commands (§5), and the Task Routing Table (§2).
2. If `.planning/STATE.md` exists, read it and restore task state before proceeding.
3. Using §2, identify which contract documents and sub-guides apply to the current task.
   Load only those files — do not read all documents upfront.
4. When the session narrows to a subdirectory, read the nearest child `AGENTS.md` as a delta.
5. Verify actual script names and flags in `package.json`, `next.config.ts`,
   `playwright.config.ts`, `src/config/site.ts` before executing any command.

---

## 2. Task Routing Table

| Task Type | SSOT Contract | Project Rules | Verify |
|:---|:---|:---|:---|
| routing / locale / not-found | `docs/req-landing.md §5`, `docs/project-analysis.md §4` | `docs/agent-guides/project-rules.md §Architecture` | `docs/agent-guides/verification-commands.md §routing` |
| landing grid / GNB / theme | `docs/req-landing.md §6–11` | `docs/agent-guides/project-rules.md §Blog-Telemetry-Theme` | `docs/agent-guides/verification-commands.md §landing` |
| transition / telemetry / consent | `docs/req-landing.md §8, §12, §13` | `docs/agent-guides/project-rules.md §Blog-Telemetry-Theme` | `docs/agent-guides/verification-commands.md §telemetry` |
| test flow / domain | `docs/req-test.md`, `docs/req-test-plan.md` | `docs/agent-guides/project-rules.md §TestFlow` | `docs/agent-guides/verification-commands.md §test-flow` |
| variant registry / fixture | `docs/req-landing.md §12`, `docs/req-test.md §2`, `docs/project-analysis.md §5.3` | `docs/agent-guides/project-rules.md §VariantRegistry` | `docs/agent-guides/verification-commands.md §variant-registry` |
| blocker evidence | `docs/blocker-traceability.json` | — | — |

`docs/requirements.md` — background context only; not a direct implementation SSOT.  
`docs/archive/**` — historical reference only; not a current contract basis.

---

## 3. Active Runtime Surface

| Fact | Value |
|:---|:---|
| Routes | `/{locale}`, `/{locale}/blog`, `/{locale}/blog/{variant}`, `/{locale}/history`, `/{locale}/test/{variant}`, `/{locale}/test/error`, `/api/telemetry` |
| 404 surface | `src/app/not-found.tsx`, `src/app/global-not-found.tsx` |
| Locales | `en`, `kr`, `zs`, `zt`, `ja`, `es`, `fr`, `pt`, `de`, `hi`, `id`, `ru` |
| Locale normalization | `ko* → kr` · Simplified Chinese → `zs` · Traditional Chinese → `zt` |
| `[locale]/layout.tsx` flag | `dynamicParams = false` |
| `next.config.ts` flags | `typedRoutes = true`, `experimental.globalNotFound = true` |
| Tech stack | `next@16.2.4`, `react@19.2.4`, `next-intl@4.9.1`, `motion@12.34.0` (unused) |
| Tailwind | v4. Tokens/base: `src/app/globals.css`. Landing grid/card motion: `landing-grid-card.module.css`. *(2026-04-21)* |

Directory ownership details → `docs/agent-guides/project-rules.md §Ownership`

---

## 4. Critical Boundaries

### Never — Do Not Modify

- Do not reintroduce `src/middleware.ts`. Single request entry: `src/proxy.ts`.
- Never edit build artifacts directly: `.next/`, `node_modules/`, `coverage/`,
  `test-results/`, `playwright-report/`, `dist/`, `out/`, `output/`, `tsconfig.tsbuildinfo`.

### Ask First — Modify with Caution

Confirm the relevant contract document and test anchor before touching any path below.

- `src/proxy.ts`
- `src/app/layout.tsx`
- `src/app/[locale]/layout.tsx`
- `public/theme-bootstrap.js`
- `src/lib/routes/route-builder.ts`
- `src/i18n/localized-path.ts`
- `src/features/variant-registry/source-fixture.ts`
- `src/features/variant-registry/builder.ts`
- `src/features/variant-registry/resolvers.ts`
- `src/features/variant-registry/types.ts`
- `src/features/variant-registry/variant-registry.generated.ts`
  → Not hand-written. Edit `source-fixture.ts`, `builder.ts`, `resolvers.ts` first.
- `scripts/qa/*.mjs`
- `tests/e2e/theme-matrix-manifest.json`
- `docs/blocker-traceability.json`

**High-Risk Areas** — Any plan touching paths below must explicitly identify which dimension is
at risk (usability / a11y / responsiveness / performance / design system consistency) and must
include Playwright E2E regression coverage (§5).

- `src/features/landing/grid/use-landing-interaction-controller.ts`
- `src/features/landing/grid/use-mobile-card-lifecycle.ts`
- `src/features/landing/grid/use-keyboard-handoff.ts`
- `src/features/landing/gnb/site-gnb.tsx`
- `src/features/landing/shell/page-shell.tsx`
- `public/theme-bootstrap.js`
- `src/features/landing/telemetry/consent-source.ts`
- `src/features/landing/transition/`

### Always — Modify Freely

`src/features/**` · `src/i18n/**` · `src/lib/routes/**` · `src/messages/**` · `tests/**` ·
`docs/**` · `public/**` (bootstrap contract must not break) · `.planning/**`
(documentation and session state only — no executable code)

**`.planning/` vs `docs/plans/` boundary**: `.planning/STATE.md` = session continuity anchor
(temporal progress only). `docs/plans/` = SSOT for feature engineering plans and specifications.
These must not substitute for each other. No runtime module may import from `.planning/`.

---

## 5. Essential Commands

### Basic Gates — Default Done gate (run in order)

```
npm run lint
npm run typecheck
npm test
npm run build
```

### Reference Commands

```
npm run sync            # Sheets sync
npm run sync:dry        # Dry-run sync verification
npm run qa:static
npm run qa:rules        # Release-level pipeline — excluded from default Done gate
npm run qa:gate:once    # Heavy — run before release or when investigating flakiness
npm run qa:gate         # Full release validation pipeline
npm run test:e2e
npm run test:e2e:smoke
```

**QA baseline notes**
- `qa:rules` excluded from default Done gate. As of 2026-04-25: passes Phase 11,
  variant registry, variant-only, and blocker traceability checks.
- Playwright baselines: local PNGs under `tests/e2e/*-snapshots/`.
  Visual smoke helper auto-creates missing baselines; falls back to comparison when baseline exists.

→ Change-type specific commands: `docs/agent-guides/verification-commands.md`

---

## 6. Gold Standards

Consult before referencing external patterns. Replicate the following exactly.

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
| Telemetry payload hygiene | `src/features/landing/telemetry/validation.ts` |
| Transition storage/runtime | `src/features/landing/transition/runtime.ts` |
| Representative e2e anchor | `tests/e2e/helpers/landing-fixture.ts` |

---

## 7. Plan Document Requirements

A `docs/plans/YYYY-MM-DD-feature.md` is required when Plan mode is triggered (Codex Custom
Instructions §3): tasks touching an **Ask First** path, a **High-Risk Area**, or an SSOT
contract document. Trivial tasks: commit message is sufficient.

Required fields before approval and before implementation begins:
- [ ] All files to be modified
- [ ] Relevant SSOT contract (per §2 Task Routing Table)
- [ ] Impact assessment: shared components (shell/GNB) · localization · a11y · state contracts · core user flow
- [ ] Validation commands (per `docs/agent-guides/verification-commands.md`)
- [ ] Decisions requiring user confirmation before execution

Any plan missing these fields must be revised before approval.

---

## 8. Local Definition of Done

- Default Done gate: run Basic Gates (§5) in order.
- `qa:rules` excluded from Done gate — release-level reference pipeline only.
- `qa:gate:once` / `qa:gate` — run only before release or when investigating flakiness.
- Bug fix or behavior change: confirm regression test coverage has been added or updated.
- If the change triggers a §9 update condition, update AGENTS.md in the same commit.
- `AGENTS.md` changes: cross-reference file paths, commands, locale set, and representative
  anchors against the actual repository before marking done.

→ Scope-specific verification: `docs/agent-guides/verification-commands.md`

---

## 9. Document Maintenance

Update AGENTS.md when any of the following change:

- **Commands / scripts**: script names, execution order, QA script list or responsibilities,
  `qa:rules` baseline status
- **Project facts**: active contract documents, route surface, locale set, tech stack,
  representative anchors, generated/SSOT boundary, baseline availability status
- **Ownership / structure**: directory ownership, Gold Standard files,
  subdirectory AGENTS.md delegation scope
- **Persistent agent error**: a repo-specific mistake observed two or more times
  in code review or agent execution

`docs/plans/` — create or update after any non-trivial task touching an Ask First, High-Risk,
or SSOT file. Must reflect actual outcome, not original intent. See §7 for required fields.  
`.planning/STATE.md` — write when trigger is met (Codex Custom Instructions §7).  
Skill routing, orchestration, and clarification rules → Codex Custom Instructions only.

---

## 10. Subdirectory Rule Delegation

Create a child `AGENTS.md` when three or more rules apply exclusively to that directory,
or that directory has its own dedicated fixture, QA loop, or gold standard.

- Child documents contain only deltas — no repetition of parent content.
- Conflict between child document and repo-wide fact: update root AGENTS.md first.
