R4.1 첫 번째 분석 요청 프롬프트

## Analysis Goal

Audit the structural state of the test destination flow AFTER two completed refactoring passes (Prompt 0 and Prompt 3). The goal is to identify remaining structural problems that exist now — not future-phase features, not UX changes — so a focused structural cleanup pass (Prompt 1) can be scoped and planned.

Prompt 0 completed: run controller extraction, canonical index conversion, tail reset as run contract, `test:{variant}:responses` write path, QA script path updates.
Prompt 3 completed: phase unified reducer (`booting → instruction → active → submitted → redirecting`), active-run resume load path.

Do NOT implement anything. Produce an analysis document only.

---

## Scope Boundaries

### In scope for this analysis
- Remaining structural issues in `test-question-client.tsx` after the two refactoring passes
- Entry phase state management and its relationship to the run controller
- `entry-policy.ts` return shape and its coupling to the client
- Side effect coordination between entry actions and phase transitions (e.g., `markInstructionSeen`, `consumeLandingIngress`)
- `instruction-overlay.tsx` disabled button token inconsistency (style contract gap vs `test-question-client.tsx`)
- Test coverage gaps introduced or exposed by the refactoring
- QA script coherence after path changes

### Explicitly out of scope — do NOT analyze
- Delayed auto-advance, slide-in animations, progress bar UX, layout changes (Prompt 2)
- Qualifier Question integration into Instruction Overlay (Prompt 4)
- `src/features/test/domain/`, `schema-registry.ts`, `response-projection.ts`
- Telemetry event semantics themselves (event names, payload fields)
- Consent smoke or routing behavior

---

## Files to Explore First

Primary — explore fully:
- `src/features/test/test-question-client.tsx`
- `src/features/test/entry-policy.ts`
- `src/features/test/instruction-overlay.tsx`
- The newly extracted run controller file (locate it — likely `src/features/test/use-test-run-controller.ts` or similar)

Supporting — explore as needed:
- `src/features/test/question-bank.ts`
- `src/features/test/storage/test-storage-keys.ts`
- `src/features/test/storage/active-run.ts`
- `src/features/transition/store.ts` (for `markInstructionSeen`, `consumeLandingIngress` call sites)

Test files:
- `tests/unit/test-question-bootstrap.test.ts`
- `tests/unit/test-entry-policy.test.ts`
- Any new unit test files created by Prompt 0 or Prompt 3 for the run controller
- `tests/e2e/consent-smoke.spec.ts`

QA scripts:
- `scripts/qa/check-phase10-transition-contracts.mjs`
- `scripts/qa/_path-config.mjs`

---

## Code Evidence to Verify

For each item, locate the actual current code and report file path + approximate line range.

### 1. Client component residual shape

After the two refactoring passes, what does `test-question-client.tsx` currently own?

- How many `useState` and `useEffect` calls remain?
- Which of the original flags (`instructionSeen`, `entryCommitted`, `started`, `redirecting`) still exist as local state, and which were absorbed by the phase reducer?
- Is there any logic remaining in the client that reads from or writes to the run controller state in a way that could belong inside the controller?
- What is the approximate line count of the current client file?
- Does the client still contain any pure functions (no hooks, no side effects) that are not currently tested independently?

### 2. Run controller internal structure

Locate the extracted run controller file and report:

- What actions does the reducer accept? List all action types.
- What shape is the reducer state? List all fields.
- Does the controller own the `trackAttemptStart` and `trackFinalSubmit` calls, or are they still in the client? If in the controller, how does it invoke them (direct call, returned callback, or dispatched side effect)?
- Does the controller own `consumeLandingIngress` and `markInstructionSeen`, or does the client still call these after receiving a phase transition?
- Are there any `useEffect` blocks in the controller that coordinate timing between the phase reducer and storage writes? If so, what triggers them?
- Does the controller expose any intermediate state that is only used to bridge timing between effects rather than represent a meaningful runtime state?

### 3. Entry policy boundary and coupling

- What does `resolveTestEntryPolicy()` currently return? Is it a discriminated union (e.g., `{ kind: 'instruction' | 'auto_commit' | 'consent_required'; ... }`) or a flat config object assembled by the caller?
- Does the client still construct behavior by reading `entryPolicy.effects[action]` directly, or does it call a more encapsulated entry-policy API?
- Is `executeInstructionAction` (or its equivalent after refactoring) still defined in the client, or has it moved?
- Does `entry-policy.ts` have any dependency on run state (current phase, `instructionSeen`, `landingIngressFlag`)? Or is it fully pure given its inputs?
- How many distinct call sites consume `resolveTestEntryPolicy()` across the codebase?

### 4. `instructionSeen` and sessionStorage coordination

- `instructionSeen` was previously a `useState` that duplicated the `hasSeenInstruction(variant)` sessionStorage read. After the refactoring, where does the source of truth live — in the phase reducer, in a local state, or is the sessionStorage read now the only source?
- Is there any point where the in-memory `instructionSeen` value and the sessionStorage value could diverge (e.g., a race between the effect that reads it and the effect that writes it)?
- `markInstructionSeen(variant)` writes to sessionStorage. Who calls it currently, and at what phase transition?

### 5. Side effect coordination pattern between entry actions and phase transitions

- After `executeInstructionAction('start')` (or equivalent) is called, trace the exact sequence: what happens in what order? (e.g., consent write → phase transition dispatch → storage write → telemetry → React re-render)
- Is there a `useEffect` that fires after a phase transition to perform storage side effects? If so, what is its dependency array?
- Are there any cases where a phase transition dispatch and a storage write are not atomic — i.e., the UI could briefly reflect the new phase while the storage write has not yet completed?

### 6. `instruction-overlay.tsx` disabled button token inconsistency

- Confirm the exact disabled CSS classes currently on the primary and secondary buttons in `instruction-overlay.tsx`.
- Confirm the disabled CSS classes on the equivalent buttons in `test-question-client.tsx`.
- Are they identical? If not, list the specific tokens or class names that differ.
- Does the inconsistency affect any visual snapshot in `tests/e2e/theme-matrix-smoke.spec.ts`? Check whether the instruction overlay state is captured in the matrix manifest.

### 7. Test coverage gaps after refactoring

- Does the extracted run controller have its own dedicated unit test file? If so, what scenarios does it cover? If not, which behaviors are currently only tested through `test-question-bootstrap.test.ts` (utility level) or E2E?
- After canonical index conversion, are there unit tests that explicitly assert answer keys are canonical index strings (e.g., `"1"`, `"2"`) rather than UI ids (`q1`, `q2`)?
- After tail reset implementation, are there unit tests that assert `NAVIGATE_PREVIOUS` from index N removes answers for indices ≥ N?
- After active-run resume implementation, are there unit tests that verify the resume load path produces the correct initial phase and answers?
- Does `tests/unit/test-entry-policy.test.ts` cover the `canAutoCommitAfterInstructionSeen: true` auto-commit path end-to-end, or only the policy output?

### 8. QA script coherence after path changes

- After Prompt 0 path updates, does `check-phase10-transition-contracts.mjs` still check for `consumeLandingIngress`, `markInstructionSeen`, `trackAttemptStart`, `trackFinalSubmit` in `test-question-client.tsx`? Or was the check target moved to the new run controller file?
- Are there any pattern checks in `check-phase10-transition-contracts.mjs` that reference identifiers that no longer exist in the checked file (e.g., checking for a function name that moved to the controller)?
- Does `_path-config.mjs` contain a path group for the test flow files? If so, does it include the new run controller file?

---

## Refactoring Candidate Selection Criteria

Flag an item as a remaining structural candidate if ANY of the following apply:

- Logic that should belong inside the run controller (or entry policy) is still executed in the client component, creating a split ownership.
- A pure function (no hooks, no side effects) remains in a hook file or component file where it is only incidentally related to the host's state.
- An implicit timing dependency exists between a phase transition dispatch and a storage write, where a React re-render could occur between them and expose an inconsistent UI state.
- A unit of behavior that was refactored in Prompt 0 or Prompt 3 lacks direct unit test coverage at the appropriate level (controller or model), relying only on E2E or bootstrap-level tests.
- A style token inconsistency between two sibling components (`instruction-overlay.tsx` vs `test-question-client.tsx`) represents a broken shared contract rather than an intentional design difference.
- A QA script checks for an identifier or path that no longer reflects the actual post-refactoring file structure.

Do NOT flag:
- Planned future work (Phase unified reducer was handled in Prompt 3; Qualifier overlay is Prompt 4)
- UX behavior differences (auto-advance timing, animation) — those are Prompt 2
- Line count alone
- Any item from `src/features/test/domain/` — frozen

---

## Output Format

### Summary
One paragraph: overall structural health of the test flow after the two refactoring passes, and what the primary remaining concern is.

### Post-refactoring state snapshot
A brief table listing: current file, approximate line count, primary responsibility, and whether the responsibility is correctly bounded or has a spillover. Include `test-question-client.tsx`, the new run controller file, `entry-policy.ts`, and `instruction-overlay.tsx`.

### Candidate: [Name]
For each remaining structural candidate:
- **Current location**: file + approximate line range
- **Description**: what the issue is and why it is structural (not cosmetic)
- **Code evidence**: specific function names, state fields, effect dependency arrays, call sequences
- **Root cause**: why this was not resolved by Prompt 0 or Prompt 3
- **Risk level**: Low / Medium / High + reason
- **UX impact**: None / Indirect / Direct
- **Test coverage**: existing tests that cover this area / tests that need updating / new tests needed
- **Screenshot baseline impact**: Yes / No / Inspect + reason
- **QA script impact**: which script, what pattern, what change needed
- **Doc sync needed**: Yes / No + which sections

### Coverage gap summary
A separate section listing each uncovered behavior (from item 7 above) with: behavior description, current coverage level (none / E2E only / utility level), and recommended coverage level.

### Healthy areas (do not change)
Items verified as correctly structured post-refactoring that should not be touched in Prompt 1.

### Excluded items
Brief list of what was intentionally not analyzed and why.

### Open questions
Any ambiguity in the current code that requires a decision before a cleanup pass can be scoped.
