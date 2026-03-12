# Lesson Learned for the Next Phase Requirements

## Purpose
This document captures the key lessons learned from the landing phase requirements and implementation process.  
Its purpose is to prevent the next phase requirements from repeating the same classes of failure: over-specifying implementation paths, under-specifying state/error contracts, allowing ambiguity across sections, and defining UX intent without enough release-grade verification structure.

The next phase requirements must be detailed enough to support release-grade implementation, but must avoid unnecessary framework-specific or overly prescriptive implementation instructions unless they are essential to correctness.

---

## 1. Write for release-grade clarity, but do not overfit to one implementation path

### Lesson
The landing final document became stronger when it moved from vague UX intent to release-grade contracts.  
However, some parts also became too tightly coupled to specific implementation paths, making the document heavier than necessary.

### Rule
- Write the next phase requirements at a **release-capable detail level**.
- Define **what must be true**, **what must never happen**, and **how correctness is verified**.
- Avoid locking in implementation details unless they are necessary for:
  - correctness,
  - UX stability,
  - determinism,
  - rollback safety,
  - accessibility,
  - telemetry integrity.

### Avoid
- Explaining exact internal implementation structure when multiple implementations can satisfy the same contract.
- Embedding framework-specific decisions into the core requirement body if they are not directly relevant to the phase scope.

---

## 2. The phase document is the active SSOT during definition; global requirements follow later

### Lesson
Conflicts between `requirements.md` and landing-specific requirements created ambiguity.  
For the next phase, the phase requirements should be defined first in sufficient detail, and only then should `requirements.md` be updated.

### Rule
- Treat the **next phase requirements document as the active authoritative source** during drafting and implementation.
- Do not try to prematurely force full alignment with `requirements.md` while the phase document is still evolving.
- After the phase document is stabilized, update `requirements.md` separately at the appropriate abstraction level.

### Implication
- `requirements.md` should remain more abstract.
- The phase document should contain the operational detail needed for correct implementation and QA.

---

## 3. Include UI state, restoration, and exception handling explicitly — not as secondary concerns

### Lesson
What looked like “simple feature requirements” often turned into failures around:
- state restoration,
- entry/exit conditions,
- fallback rendering,
- rollback,
- recovery,
- inconsistent progress or lifecycle behavior.

### Rule
The next phase requirements must explicitly include:
- UI state transitions,
- restoration behavior,
- invalid/partial/error paths,
- fallback behavior,
- failure cleanup,
- retry/re-entry behavior,
- user-visible recovery paths.

### Do not assume
- That domain logic can be specified independently from UI lifecycle.
- That fallback/error UX can be safely added later.

---

## 4. Prioritize UX quality first, then complexity control, then fallback/error integrity

### Failure Priority
The most important failures to prevent are:

1. Overall UX quality degradation  
2. Structural complexity growth  
3. Poor fallback / error UX  
4. Result calculation errors  
5. State tangling / duplicate transitions  

### Rule
When making requirement decisions, prioritize in this order:
- preserve UX quality,
- reduce structural complexity,
- guarantee fallback/error behavior,
- ensure deterministic calculation,
- prevent transition duplication and state leaks.

### Implication
If a requirement increases complexity without materially improving UX quality or correctness, reconsider it.

---

## 5. Ambiguity must be surfaced and resolved, not silently implemented

### Lesson
One of the biggest sources of rework is not “bad implementation,” but “multiple reasonable interpretations allowed by the document.”

### Rule
If a requirement can be interpreted in more than one valid way, do **not** silently choose one and continue.

Instead:
- stop,
- identify the ambiguity,
- compare options,
- record the selected option and rationale.

### Required Mechanism
The next phase requirements should include an **Ambiguity Registry** section when needed.

Each ambiguity entry should contain:
- issue name,
- option A / B / C,
- selected option,
- reason,
- affected sections.

---

## 6. Terminal exclusivity must be defined wherever lifecycles exist

### Lesson
Lifecycle-type interactions fail when a document defines the start condition but not the terminal condition clearly enough.

### Rule
Any lifecycle in the next phase that has a start must define:
- valid start trigger,
- terminal states,
- exclusivity rules,
- invalid duplicate terminal conditions,
- cleanup obligations.

### Required Principle
For any transition/session/process requiring lifecycle control:
- `start = exactly 1`
- `terminal = exactly 1`
- terminal states must be mutually exclusive

### Typical terminal examples
Depending on the feature, terminal states may include:
- complete
- fail
- cancel
- abort
- fallback-resolved

But the allowed set must be explicitly defined.

---

## 7. Rollback cleanup sets must be explicit and exhaustive

### Lesson
Rollback failures often come from partial cleanup, not from the main feature logic itself.

### Rule
If the next phase contains any provisional state, pending computation, staged entry, or temporary UI state, the requirements must define a **rollback cleanup set**.

### The cleanup set must answer
On fail/cancel/interruption, which of the following must be cleared or restored?
- pending derived data
- provisional UI state
- pre-committed answers or draft values
- flags
- locks
- queued actions
- temporary session state
- temporary telemetry correlation state
- restoration markers

### Requirement
Partial cleanup is not acceptable if it leaves inconsistent UX or stale state behind.

---

## 8. Single-change synchronization must be a first-class section

### Lesson
A change to one policy often affects multiple sections, but that dependency is easy to miss if not documented.

### Rule
The next phase requirements should include a **Single-change Synchronization** section.

This section must describe which sections must be updated together when one policy changes.

### Example policy groups
Depending on the phase, likely synchronization groups include:
- result derivation logic ↔ fallback rendering ↔ telemetry payload ↔ share/revisit rules
- progress model ↔ restoration ↔ terminal conditions ↔ rollback
- UI content contract ↔ empty/error states ↔ accessibility text ↔ QA assertions

### Goal
Prevent stale or partially updated requirements when a single rule changes.

---

## 9. Separate semantic contracts from rendering/geometry contracts

### Lesson
A requirement becomes unstable when it mixes:
- semantic meaning,
- visual structure,
- error policy,
- layout behavior,
- measurement/restore behavior
in one undifferentiated block.

### Rule
When writing the next phase requirements, separate at least these layers:
1. Semantic/data contract  
2. UI state and lifecycle contract  
3. Rendering/content visibility contract  
4. Error/fallback/empty-state contract  
5. Verification/QA contract  

### Benefit
This reduces accidental contradictions and makes synchronization easier.

---

## 10. Define recovery behavior as carefully as happy-path behavior

### Lesson
In practice, many UX failures come from “almost worked” states:
- invalid payload but partial UI render,
- missing content but visible container,
- stale progress restored incorrectly,
- retry that duplicates prior state,
- error states that block the user without next action.

### Rule
For each major feature, requirements must define:
- blocking failure behavior,
- non-blocking failure behavior,
- visible user messaging expectations,
- allowed recovery actions,
- state after recovery,
- what data/state must remain valid.

### Minimum question
For every critical feature, ask:
> “If this fails halfway, what must the user still be able to do?”

---

## 11. Traceability and release gate must be included from the start

### Lesson
If traceability and release-gate thinking are added late, the document has to be reorganized under pressure.

### Rule
The next phase requirements must include:
- traceability from critical rules to validation targets,
- release-blocking items,
- at least one verification path per blocking item.

### Requirement
Every important contract should be mappable to one or more of:
- automated assertion,
- scenario test,
- manual QA checkpoint.

### Avoid
- large sections of requirements that have no planned validation path.
- release-critical policies that are only described narratively and cannot be checked.

---

## 12. Keep the global document abstract, and keep the phase document operational

### Lesson
The landing phase showed that trying to make one document do both jobs leads to either:
- too much abstraction for implementation, or
- too much implementation detail in the global spec.

### Rule
Use this split going forward:
- `requirements.md`: product-wide abstraction and stable cross-phase contracts
- phase requirements: detailed implementation-facing operational requirements for the current phase

### Do not
- Overload `requirements.md` with phase-local operational detail
- Weaken the phase document just to match the abstraction level of `requirements.md`

---

## 13. Use “deterministic requirement language,” not aspirational wording

### Lesson
Terms like “natural,” “smooth,” “appropriate,” or “intuitive” are useful for intent but dangerous as primary acceptance language.

### Rule
Where correctness matters, use requirement language that is testable and deterministic:
- must / must not
- exactly once
- mutually exclusive
- before / after only
- allowed / forbidden
- blocking / non-blocking
- retryable / not retryable
- restored / consumed / cleared

### Use aspirational language only for
- background rationale,
- UX intent explanation,
- design notes,
not for the main acceptance contract.

---

## 14. The next phase document should stay focused on phase scope, not legacy infrastructure concerns

### Lesson
Some framework and bootstrap constraints had to be included in the landing document because the foundation was still being established.  
That is no longer the case.

### Rule
For the next phase:
- exclude framework/setup details unless they directly affect feature correctness,
- exclude infrastructure exceptions from the main requirements unless unavoidable,
- avoid re-documenting already-settled platform foundations.

### Include only if truly necessary
- a framework behavior that changes the user-visible contract,
- a rendering behavior that affects correctness,
- a runtime constraint that changes lifecycle or fallback handling.

---

## 15. Default writing workflow for the next phase

When drafting the next phase requirements, follow this order:

1. Scope / Non-goals / Locked decisions  
2. Core domain and UI lifecycle definitions  
3. Happy-path contract  
4. Error / fallback / rollback / restoration contract  
5. Terminal exclusivity and cleanup set  
6. Ambiguity Registry (if needed)  
7. Single-change Synchronization  
8. Acceptance / Traceability / Release gate  

### Reason
This order reduces the chance of:
- writing detailed behavior before the lifecycle is defined,
- adding fallback behavior too late,
- forgetting verification structure,
- scattering one policy across many sections without synchronization.

---

## Final Reminder
Do not optimize primarily for completeness of prose.  
Optimize for:
- clarity of contract,
- determinism,
- low ambiguity,
- high UX quality,
- controlled complexity,
- recoverability,
- traceability.

If a section feels “complete” but still allows multiple reasonable implementations that would differ in UX behavior, then it is **not yet sufficiently specified**.
