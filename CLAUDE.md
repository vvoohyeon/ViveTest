# CLAUDE.md

> **Role**: Claude Code adapter for ViveTest.
> `AGENTS.md` is the single source of truth for all project facts, commands, boundaries, and templates.
> This file mirrors essential orchestration rules and adds Claude Code-specific guardrails.
> It does not duplicate, summarize, or replace `AGENTS.md`. Cite `AGENTS.md` — not this file — when explaining rules.

---

## Session Startup

At the start of every session:
1. Read root `AGENTS.md`. Internalize critical boundaries (§4), build commands (§5), and the Task Routing Table (§2).
2. If `.planning/STATE.md` exists, read it and restore task state before proceeding.
3. Using the Task Routing Table (§2), identify which contract documents and sub-guides apply to the current task. Load only those — do not read all documents upfront.
4. For rebuild tasks, follow `AGENTS.md` routing to the applicable rebuild operation sources, especially `docs/rebuild-worktree-setup.md`, `docs/wave-roadmap.md`, and `docs/decision-register.md`. Do not load or restate them unless the task scope requires them.
5. When scope narrows to a subdirectory, read the nearest child `AGENTS.md` as a delta.
6. Using the Task Routing Table (§2), identify which contract documents and sub-guides apply to the current task. Load only those — do not read all documents upfront.
7. When scope narrows to a subdirectory, read the nearest child `AGENTS.md` as a delta.

Re-read `AGENTS.md` when: scope shifts to a new subsystem · High-Risk files enter the change set · session context may have drifted from current file state.

**Plan before code. Get approval before execution.**

---

## Core Behavior

**Think Before Coding** — State your interpretation explicitly. Surface multiple valid implementations before choosing. Stop and ask when unclear — never code on silent assumptions.

**Simplicity First** — Write the minimum code that solves the problem. No speculative abstractions, unrequested features, or error handling for impossible scenarios. If 200 lines could be 50, rewrite it.

**Comments** — Write only for non-obvious contracts, timing constraints, exception reasons, or browser/state race conditions. Do not describe self-evident code. Korean-language comments are permitted.

**Surgical Changes** — Touch only what the request requires. Every changed line must trace directly to the request. Remove orphaned imports/variables your changes created; do not touch pre-existing dead code unless asked.

---

## Clarification

Do not begin implementation if any of the following apply:
- The request is ambiguous or has multiple valid interpretations
- The approach conflicts with an `AGENTS.md` architecture constraint
- Acceptance criteria, SSOT document, or impact scope is unclear or contradictory
- A product, UX, or architecture decision is required that the user has not yet made
- The change scope or post-implementation documentation target is unclear

If resolvable in ≤5 questions, ask them and wait for answers before proceeding. If not → output: `"Requirements need to be much more clarified."` and stop.

Minor ambiguity with an obvious safe default: state the assumption in one sentence and continue.
**Do not draft a plan until all decision points are resolved.**

---

## Planning Flow

**Plan mode activates when:**
1. The task touches any file listed under **Ask First** or **High-Risk Areas** in `AGENTS.md §4`
2. The user explicitly requests a plan

For all other tasks, state assumptions in one sentence and proceed in the smallest executable unit.

**When planning:** The plan must include all fields from `AGENTS.md §7`. Save to `docs/plans/YYYY-MM-DD-feature.md`.
For rebuild plans, include these fields before proposing execution:
- Task mode: `Analysis Only`, `Plan Only`, or `Implementation`
- Active wave or approved wave range
- Files expected to be modified
- Reference-only files/worktrees
- Protected contracts that must remain unchanged
- Validation gates to run after implementation
**Do not begin implementation until the user explicitly approves the plan.**
Execute one unit at a time. Verify before advancing. If new requirements emerge during execution, stop and re-confirm before continuing.

---

## Skill Routing

Applies only to non-trivial tasks.

| Situation | Handling |
|:---|:---|
| A non-trivial task requires a plan | First write a plan that includes all fields from `AGENTS.md §7` |
| An Ask First or High-Risk file is included in the change targets | Define failing tests before implementation (enter TDD) |
| A runtime error occurs, or 2 or more fix attempts have failed | Systematically diagnose the root cause before retrying |
| The task includes a UI change and requires E2E regression testing | Run Playwright using the commands in `AGENTS.md §5` |
| A change requested in a Rebuild task crosses the include/exclude boundary of the corresponding wave | Stop immediately before writing the plan — report the boundary violation and wait for instructions |

### Lightweight Path — Small Task Exception

Handle the task directly without a plan only when **all** of the following conditions are met:
- Obvious change: typo, comment update, or copy adjustment
- Simple `docs/` update with no structural or decision change
- Scope, SSOT impact, and product decision are all clear

**Do not use the Lightweight Path when the task involves an Ask First file, SSOT contract, High-Risk area, or product/UX decision** — no exceptions, even if the change appears small.  
Lightweight tasks: state the assumption in one sentence, run the default gates from `AGENTS.md §5`, and use the commit message instead of a separate document.

---

## Implementation

- Execute one approved unit at a time. Verify before advancing.
- Do not touch files or logic outside the approved scope.
- Re-read `AGENTS.md` and the approved plan if context drift is detected mid-session.
- If implementation would push any source code file past **500 lines** or require splitting into **3 or more new source code files**, stop — propose a refactoring plan in markdown and await approval. Documentation files are exempt.

---

## Verification

Run gate commands from `AGENTS.md §5` after every implementation:
1. **Basic gates (run in order)**: `lint` → `typecheck` → `test` → `build`
2. **Scope-specific checks**: follow change-type anchors in `docs/agent-guides/verification-commands.md` (via `AGENTS.md §8`)

Do not declare work complete until all gates pass with zero errors in terminal output.
Bug fix or behavior change: confirm regression test coverage has been added or updated.

---

## STATE.md — Long-Session Continuity

Write `.planning/STATE.md` when either trigger is met (OR logic):

**Trigger 1 — Complex unfinished plan** (all three must be true):
- Plan has **3 or more stages**
- At least **1 stage completed and verified** (gate passed) this session
- At least **1 remaining stage** involves an **Ask First** or **High-Risk** file

**Trigger 2 — Long session**: **2 or more independent plan units** completed and verified this session.

**Timing:**
- **Base (R):** Write at the unit-completion boundary after the gate passes. Output the session message and wait for instruction before proceeding to the next unit.
- **Override (P):** If the basic gate runs **3 or more times** within one unit without that unit being marked complete, stop and write STATE.md immediately.

**Required fields**: Current Phase/Milestone · Pending Verifications/Debt · Next Immediate Actionable Steps · Key Decisions · Files to Revisit

**After writing STATE.md**, output exactly:
> `".planning/STATE.md saved. Context has accumulated significantly. Recommend starting a fresh session to continue cleanly. Awaiting your instruction — continue here or end session?"`

Do not proceed until the user responds. If continuing, resume from the plan without rewriting STATE.md.

**STATE.md is**: documentation only — never executable code, never substitutes for `docs/plans/` specifications, never authorizes autonomous execution or parallel agents.

---

## Context Restore

At the end of every session, report results then output:

```
### Context Restore

- Current Task: [the task that should continue next session]
- Last Known State: [final verified state; which gates passed or failed]
- Key Decisions: [decisions confirmed this session]
- Open Questions: [questions still needing answers]
- Deferred Options: [options reviewed but not adopted this session]
- Files to Revisit: [files or docs to check first next session]
- Recommended Next Step: [the first action for next session]
```

---

## Security Baseline

- Never hardcode API keys, tokens, or passwords — use `.env` environment variables
- Include input validation for all user-supplied values
- Before modifying any security-sensitive area (auth, permissions, file handling, external integrations), re-read the relevant contract document
- Do not import unvetted external packages without explicit approval

---

## Prohibited Actions

- Do not output placeholder comments (`// insert logic here`, `// TODO: implement`)
- Do not add features beyond scope or silently make product decisions not requested
- Consult **Gold Standards** (`AGENTS.md §6`) before referencing external code patterns; external patterns are acceptable only when they do not conflict
- Do not perform without explicit prior approval: adding external packages · modifying build or deployment configuration · deleting files · accessing external networks · running destructive commands
- Do not invoke automated multi-wave execution, parallel agents, or automated implementation pipelines. `.planning/STATE.md` never authorizes autonomous execution
- Do not redesign, rename, reorganize, or reinterpret the confirmed rebuild branch/worktree/checkpoint/merge topology
- Do not use legacy reference or checkpoint worktrees as implementation targets
- Do not create a source code file exceeding **500 lines**. Exceptions: centralized TypeScript global type declarations; self-contained sequential pipeline logic with no reuse potential across the codebase. (Documentation files exempt.)
- Do not create or extract a source code file under **30 lines** unless reused in multiple places and independently unit-testable; inline single-use code into the caller instead.

---

## Claude Code Guardrails

These address failure modes specific to Claude Code's autonomous editing behavior.

### Rebuild-specific guardrails

- **For rebuild tasks, treat worktree, branch, checkpoint, and merge topology as fixed project facts.** Do not infer, redesign, rename, or reorganize them.
- **Before editing in rebuild scope, verify the applicable wave boundary from `AGENTS.md`-routed project sources.** If the requested change crosses wave include/exclude scope, stop and report the mismatch.
- **Never use legacy reference or checkpoint worktrees as edit targets.** If Claude Code detects itself outside the confirmed active implementation workspace during an edit-intended task, stop before modifying files.
- **Do not execute multiple waves autonomously.** Complete only the approved unit, verify it, and wait for the next instruction.
- **Do not treat checkpoint branches as implementation branches.** Use them only for verification, comparison, or rollback anchoring unless the user explicitly approves a separate recovery/fix branch.

### General autonomous-editing guardrails

- **Never broaden scope opportunistically.** Note adjacent improvements as suggestions — do not apply them without approval.
- **Do not rewrite stable modules** for stylistic or structural cleanup unless explicitly requested.
- **Treat all screenshot diffs and visual baseline changes as regressions** unless provenance is verified in `tests/e2e/theme-matrix-baseline-provenance.md`.
- **Before modifying multiple files**, state the planned execution order and await confirmation.
- **When uncertain about behavioral contracts**, inspect existing E2E coverage before making assumptions.
- **Do not make architectural or design decisions** (directory structure, module boundaries, public API shape) without explicit user approval.
- **Never cite `AGENTS.md` rules from memory.** Re-read the relevant section before explaining any rule or rationale.
- **On child/root `AGENTS.md` conflict**: if any file path, command, or contract reference differs between root and child `AGENTS.md`, halt — list each conflicting item with its source file and report as a documentation conflict. Do not self-resolve.

---

## Response Language

Match the language of the user's message automatically. Korean input → Korean response. English input → English response.
