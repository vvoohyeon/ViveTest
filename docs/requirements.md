# Functional Requirements Specification

## 1) Overview
This product lets users take multiple kinds of short assessments (test variants/families), receive a variant-defined final result label (a 1-, 2-, or 4-letter token depending on the variant’s axis count) along with axis-based scores, and share or revisit that result without requiring an account.

### Product goals
- Provide a fast, low-friction assessment flow for anonymous users.
- Deliver interpretable result content, not just a type code.
- Enable self-contained result sharing and local revisit history.
- Capture behavioral telemetry to power operator analytics.
- Provide basic admin/ops capabilities for insight monitoring and spreadsheet sync.

### Content and localization principles
- Test content (questions, answers, landing preview inputs, and result interpretation content) is canonically sourced from Google Sheets–managed sources and synchronized into the product.
- Landing preview input의 최종 canonical target은 Questions 데이터의 **first scoring question (`scoring1`)** 이다. 다만 현재 단계에서는 preview source of truth를 temporary inline bridge로 유지할 수 있으며, 이 예외가 runtime consumer contract를 바꾸면 안 된다.
- Runtime consumers must use canonical resolver outputs rather than reading raw source rows or fixture authoring shapes directly.
- UI chrome (CTA labels, navigation, system messages, and error/loading text) uses standard i18n resources.
- Test content localization is provided by adding per-language columns in the synchronized Sheets sources; there is no country-specific variation in questions or scoring logic.
- The active language is selected by the user and applied consistently across UI and test content.
- The initial localized document response must expose the active language in `<html lang>` at SSR time; client-side reconciliation may only act as a fallback after navigation.

### Confirmed policy alignment
- Google Sheets topology is fixed as **three separate spreadsheets**: `Landing`, `Questions`, `Results`.
- Sync/runtime inputs are fixed as `GOOGLE_SHEETS_SA_KEY`, `GOOGLE_SHEETS_ID_LANDING`, `GOOGLE_SHEETS_ID_QUESTIONS`, and `GOOGLE_SHEETS_ID_RESULTS`.
- `Questions` uses **sheet name = variant ID**. `kind` is not authored; `seq` alone determines question type.
- `q.*` rows normalize to profile questions, numeric rows normalize to scoring questions.
- Canonical index, scoring order, and user-facing `Q1/Q2/...` are separate concepts.
- Landing preview always derives from the first scoring question. Landing never asks profile questions.
- Landing A/B selection creates a durable staged entry immediately. Canonical binding happens only at runtime entry commit.
- Same-variant landing reselect always means restart intent. Old active runs are preserved until commit success and replaced only on commit success.
- Landing commit success creates a fresh response set and seeds only the first scoring answer.
- After landing ingress, automatic presentation order is unanswered profile first, then unanswered scoring. Seeded `scoring1` remains revisitable but is not auto-presented.
- Profile questions are overlay-only in runtime, including edit flow. The instruction shell may be reused, but instruction content must not reappear during profile edit.
- Runtime presentation states are logically partitioned into instruction overlay, profile overlay, scoring page, and profile edit overlay.
- Main progress is **scoring-only**. Profile completion is a prerequisite overlay step, not part of the main progress numerator/denominator.
- Telemetry question indexes use canonical index only. UI `Q1/Q2` labels are not sent in telemetry payloads.
- `attempt_start` fires when the first runtime question is actually rendered after instruction.

## 2) Roles and Permissions

| Role | Capabilities | Restrictions |
|---|---|---|
| End User (anonymous) | Browse tests, complete test flow, view/share result, view/delete local history | No admin analytics or ops actions |
| Admin Operator | Access admin insights UI, trigger sync operations, review sync/config status | Should be authenticated in production intent |
| Local Development Operator | Use local development bypass paths for admin workflows | Bypass is non-production only |

## 3) Core User Journeys
1. **Browse catalog and enter content (landing)**
   1) User browses a mixed catalog of standard available items, consent-independent opt-out-capable test items, and unavailable items.
   2) For enterable items, entry into a destination page (test or blog) is initiated only via an explicit call-to-action (CTA) that is available on the card’s back/expanded state (not from the front/browsing face).
   3) For unavailable items, the catalog remains browseable but no entry CTA is provided and navigation must not start.
   
2. **Take a test (happy path)**
   1) User selects or confirms a display language (UI + test content).
   2) User selects an enterable test variant.
   3) User passes through instruction step.
   4) User answers questions and progresses through the test.
   5) System computes the variant-defined final result label and scoreStats, then renders result/profile content.
   6) Result can be shared and stored in local history.

3. **Open a shared result**
   1) User opens a shared result URL.
   2) System parses and validates encoded payload.
   3) If valid, result view is reconstructed without server-side result retrieval.
   4) If invalid, user receives recoverable error state.

4. **Revisit history**
   1) User opens result history page.
   2) System lists locally stored entries (newest first).
   3) User can open, share, delete one entry, or clear all.

5. **Admin insight and sync**
   1) Operator opens admin surfaces.
   2) Operator reviews funnel and trend outputs.
   3) Operator checks sync configuration/readiness and triggers sync.
   4) Operator receives machine-readable success/failure status.
   - Sync operations update the available test variant definitions, questions, and result content mappings used by end-user flows.
   - Sync must be safe and non-disruptive to in-progress end-user sessions.

### Critical edge journeys
- Invalid test type from URL/query/local state routes to an error recovery page; no fallback to a default variant.
- Invalid or corrupted share payload yields error/retry/home path.
- Tracking failures (network/privacy constraints) do not block core test completion.
- Empty/malformed test module is treated as blocking data error.
- History list remains usable even when some entries are malformed.

## 4) Functional Requirements

### REQ-F-001 — Test catalog and availability
- **Statement:** The product must expose multiple test variants and clearly separate end-user-enterable variants from unavailable ones.
- **Rationale:** Users need discoverability while avoiding dead-end flows.
- **Acceptance criteria:**
  - For end-user-enterable catalog items, navigation/entry MUST be triggered only by an explicit CTA in the item’s expanded/back state; clicking/tapping non-CTA regions of the card (front or back) MUST NOT start navigation.
  - The front/browsing face of a catalog card MUST NOT include any start/entry CTA.
  - Enterable test variants may be standard available items or consent-independent opt-out-capable items; both remain gated behind the same back-state CTA and instruction-step entry contracts.
  - Unavailable variants are visible but non-startable and labeled as unavailable/coming soon.
  - Debug variants must never appear in the production end-user catalog.
- **Confidence:** High

### REQ-F-002 — Test variant validation and error recovery
- **Statement:** Test variant inputs from route/query/storage/session must be validated. Validation failure blocks runtime entry and routes to an error recovery page.
- **Rationale:** Prevents broken navigation and stale-state failures. Silent fallback to a default variant creates misleading user experience and is not an acceptable recovery path.
- **Acceptance criteria:**
  - Invalid variant input never crashes test/result/history journeys.
  - Variant validation failure immediately blocks runtime entry. No session or run context is created.
  - On validation failure, the system routes to an error recovery page that displays up to 2 incomplete test cards, selected from the catalog in declaration order, excluding variants the user has already completed.
  - If only 1 incomplete variant exists, 1 card is shown. If 0 incomplete variants exist, no cards are shown and only a landing CTA is provided.
  - Completion check basis: local storage (current phase); local storage + history after history feature is implemented.
- **Confidence:** High

### REQ-F-003 — Instruction gate before test start
- **Statement:** A user must pass through an instruction step before starting test execution.
- **Rationale:** Establishes context and supports consistent session tracking.
- **Acceptance criteria:**
  - Test start action is initiated from instruction context.
  - The instruction step may combine variant-specific instruction content with consent-note and CTA branches determined by ingress type, consent state, and attribute.
  - Consent-related branching must be resolved inside the instruction step; the test route must not expose a separate route-local consent banner or dialog outside that context.
  - Leaving instruction before start is treated as pre-test abandonment context.
- **Confidence:** High

### REQ-F-004 — Session lifecycle continuity
- **Statement:** Session identity must continue across instruction, test, and result, including explicit handling for session reuse and test-type switching.
- **Rationale:** Maintains continuity for user flow and telemetry correctness.
- **Acceptance criteria:**
  - Reused active sessions are detectable.
  - Switching to a different test type closes/replaces prior context.
  - Inactive session timeout is 30 minutes from the last answered question, evaluated at re-entry point (not by background timer). Confirmed locked decision per Test Flow Requirements AR-002.
  - Landing ingress creates a durable staged entry immediately, but canonical binding of the provisional answer is deferred until runtime entry commit.
  - Same-variant landing reselect is treated as restart intent. Old active runs remain intact until commit success and are replaced only if commit succeeds.
  - Commit success for landing ingress creates a fresh response set and seeds only the first scoring answer.
- **Confidence:** High

### REQ-F-005 — Binary question model
- **Statement:** Each question must provide exactly two answer options. Scoring questions map both options to a scoring axis/dimension. Profile questions map both options to qualifier values and do not contribute to axis scoring. Full question model contract: Test Flow Requirements §3.8 (SSOT).
- **Rationale:** Current scoring contract depends on binary option selection. Profile questions support qualifier-bearing result segments (e.g., EGTT `type` segment suffix).
- **Acceptance criteria:**
  - Question data contract enforces two answer options per question.
  - Answer revision is supported during progression.
- **Confidence:** High

### REQ-F-005A — Single-axis evaluation per scoring question
- **Statement:** Each scoring question must evaluate exactly one axis/metric defined by the variant’s scoring schema. Profile questions do not evaluate any axis; they collect qualifier responses only (see Test Flow Requirements §3.8).
- **Rationale:** Simplifies derivation logic and ensures interpretability of progress and analytics.
- **Acceptance criteria:**
  - For every scoring question, both answer options map to the same axis (opposite poles/values within that axis).
  - A scoring question must not contribute to multiple axes.
  - Profile questions are exempt from axis-mapping requirements.
- **Confidence:** High

### REQ-F-006 — Progress and completion gating
- **Statement:** Test completion must occur only after all questions in the selected variant are answered.
- **Rationale:** Prevents invalid or partial result computation.
- **Acceptance criteria:**
  - Main progress is computed from answered scoring-question count versus total scoring-question count.
  - Profile questions are prerequisite overlay steps and are excluded from the main progress numerator/denominator.
  - Completion transition is blocked until all required answers exist across the full canonical question set, including profile questions.
  - Result derivation uses only the scoring-question subset.
- **Confidence:** High

### REQ-F-007 — Variant-specific derivation logic (by test family)
- **Statement:** For each released test variant, the system must derive a finalized `derivedType` label and `scoreStats` according to that variant's documented scoring schema ("test family" rules).
- **Rationale:** The product supports multiple test families (e.g., full MBTI, single-axis empathy on T/F only, or other non-MBTI axes). Each family needs explicit, deterministic derivation rules.
- **Acceptance criteria:**
  - Each released variant declares a scoring schema (see REQ-F-008) that defines:
    - the set of axes/metrics,
    - how answers contribute to scores,
    - how `derivedType` is computed from `scoreStats`,
    - and any tie/threshold handling rules.
  - For any completed run, the computed `derivedType` is always a valid, variant-defined final label (1/2/4 letters as defined by the variant).
  - The system must document, per variant, what `derivedType` token is surfaced to users and shared (see REQ-F-010), and it must only represent completed results (no partial/in-progress labels).
  - Each axis must have an odd number of questions in the released dataset, making ties impossible under the standard counting-based scoring rule.
  - If a dataset violates the odd-count rule (data error), the system must treat it as a blocking validation error (see REQ-F-022).
  - Scoring schema is schema-driven. MBTI 4-axis hardcoding is forbidden. `axisCount ∈ {1, 2, 4}`. Confirmed locked decision per Test Flow Requirements §1.3.
- **Confidence:** High

### REQ-F-007A — Axis model contract (variable axis count)
- **Statement:** Each released test variant must declare an axis model with an axisCount of 1, 2, or 4, and a deterministic ordering of axes that defines the `derivedType` token length and character positions.
- **Rationale:** Multiple test families are supported; the system must render and share results consistently without assuming a fixed 4-axis MBTI structure.
- **Acceptance criteria:**
  - Each variant declares `axisCount ∈ {1,2,4}` and an ordered list of axes/metrics.
  - The `derivedType` token length equals `axisCount`, and each character position maps to a specific declared axis in order.
  - The UI can render axis-based score summaries using the declared axis order without variant-specific hardcoding.
- **Confidence:** High

### REQ-F-008 — Scoring schema definition per variant (multi-family support)
- **Statement:** Each released test variant must define and validate its scoring schema, including the axes/metrics captured in `scoreStats` and the finalized `derivedType` token surfaced to users.
- **Rationale:** Different test families require different axes/metrics (e.g., 4-axis MBTI, single-axis T/F empathy, or other custom axes). A clear schema prevents ambiguity in UI rendering, sharing, and analytics.
- **Acceptance criteria:**
  - Each released variant defines:
    - `scoreStats` shape (axes/metrics, ranges, units/levels if applicable),
    - derived label format (`derivedType` token length and allowed values),
    - and derivation rules linking answers → scoreStats → derivedType.
  - Schema authoring may be code-owned canonical registry / variant-to-schema mapping rather than Sheets-authored content, so long as the runtime remains schema-driven.
  - The product validates that any computed `scoreStats` matches the declared schema before rendering or sharing.
  - Non-released or experimental schemas must not appear in the production end-user catalog (see REQ-F-001).
- **Confidence:** High

### REQ-F-008A — Landing registry source/runtime boundary and preview bridge
- **Statement:** The landing-facing registry contract must keep source authoring shape and runtime/export shape distinct, while preserving a stable preview consumer boundary across source migrations.
- **Rationale:** Prevents temporary source-only fields from leaking into runtime contracts and keeps future source replacement scoped to builder/resolver internals.
- **Acceptance criteria:**
  - The current stage MAY keep landing preview source of truth inline in a source fixture, but this MUST be documented and treated as a **temporary bridge** rather than a permanent contract.
  - The canonical preview consumer shape remains fixed as `previewQuestion`, `answerChoiceA`, and `answerChoiceB`, regardless of source authoring details.
  - Landing, test, and blog consumers MUST use canonical registry resolver outputs and MUST NOT read raw fixture/source shapes directly.
  - Source-only fields such as `seq` and temporary inline preview inputs MUST NOT leak into runtime/export landing-card payloads.
  - Source arrays MUST follow `seq -> sort -> drop`; missing or duplicate `seq` values MUST fail validation, and consumers MUST trust array order rather than runtime `seq` access.
- **Confidence:** High

### REQ-F-008B — Unified landing meta contract and blog subtitle continuity
- **Statement:** Landing runtime metadata and blog subtitle rendering must use a single canonical data contract across content types, with presentation differences handled only at the UI-label layer.
- **Rationale:** Prevents runtime schema drift, keeps registry contracts simple, and locks subtitle behavior against legacy-field regression.
- **Acceptance criteria:**
  - Landing runtime meta keys MUST always be `durationM`, `sharedC`, and `engagedC`.
  - UI labels MAY vary by content type, but runtime MUST NOT reverse-map into test-specific or blog-specific field names.
  - Test cards use labels equivalent to estimated time / shares / attempts; blog cards use labels equivalent to read time / shares / views.
  - Blog cards MUST use `subtitle` as the single source text for both Normal and Expanded states; the Normal 2-line clamp and Expanded 4-line clamp MUST reuse the same source text.
  - Removed blog-only fields or alternate runtime-only shapes MUST NOT re-enter the runtime card contract.
- **Confidence:** High

### REQ-F-008C — Preview-source migration contract
- **Statement:** The next-stage swap from temporary inline preview source to the Questions **first scoring question (`scoring1`)** must be preserved as an explicit migration contract, not an implicit TODO.
- **Rationale:** Makes the migration decision-complete and prevents consumer churn when Questions data becomes the live preview source.
- **Acceptance criteria:**
  - Documentation, code, and tests MUST explicitly record that the preview source will migrate from inline temporary bridge to the Questions first scoring question.
  - The migration MUST add validation that Landing metadata and Questions data agree on variant presence and first-scoring-question availability.
  - The migration MUST preserve the existing preview consumer shape and keep the change scope inside builder/resolver boundaries.
- **Confidence:** High

### REQ-F-009 — Result content rendering
- **Statement:** Result views must display the computed type and associated explanatory profile content, with section-level fallback for missing content.
- **Rationale:** User value depends on interpretation, not only type code. Section-level failures must not collapse the entire result experience.
- **Acceptance criteria:**
  - **Section classification:**
    - Mandatory sections (`derived_type`, `axis_chart`, `type_desc`): always rendered regardless of variant's `supportedSections` declaration.
    - Optional sections (e.g. `trait_list`): rendered only when declared in variant's `supportedSections`. Omission without warning is normal behavior.
  - **Mandatory sections** are rendered even when absent from `supportedSections`.
  - **Missing content mapping** (applies to both mandatory and declared optional sections):
    - `derived_type` MUST continue to display.
    - The affected section renders with an empty container and a short placeholder message.
    - An operator-visible console warning is emitted.
    - No separate recoverable CTA is required for the affected section. `derived_type` display guarantees the minimum result experience.
  - Hard crash and blank result screen are forbidden. The core result experience must remain intact under any content failure.
  - Result content is rendered from the latest available content mapping at view time. The result URL is not required to freeze profile content.
- **Confidence:** High

### REQ-F-010 — Shareable self-contained result URL (reconstructable result view)
- **Statement:** The system must generate a share URL that self-contains the minimum payload required to reconstruct the full result view without server-side result lookup.
- **Rationale:** Enables server-independent sharing while allowing profile/content rendering to remain dynamic at view time.
- **Acceptance criteria:**
  - URL format: `/result/{variant}/{type}?{base64Payload}`
    - `{variant}`: test variant identifier as URL path segment 1. Each variant maps to exactly one fixed scoring logic and one fixed rendering schema. No `scoringSchemaId` is required in the payload.
    - `{type}`: result type segment as URL path segment 2. For variants without `qualifierFields`, length equals `axisCount`. For variants with `qualifierFields` (e.g., EGTT), length equals `axisCount + sum(qualifierFields[i].tokenLength)`. Full type segment contract: Test Flow Requirements §3.11 (SSOT).
    - `{base64Payload}`: URL-safe Base64 encoding (`+`→`-`, `/`→`_`, padding `=` removed) of a JSON object.
  - A valid share URL opens and reconstructs the result view without server result retrieval.
  - The base64 payload MUST include:
    - `scoreStats` (as defined by the variant's schema) sufficient to render the score/level UI.
    - `shared` (boolean): `true` when this URL was generated as a share link, `false` otherwise.
  - The base64 payload MUST NOT include `scoringSchemaId`, `derivedType`, or `testVariantId`. These are fully expressed by the URL path segments.
  - The `type` path segment MUST represent a completed result only. No in-progress or partial result may be encoded.
  - The share URL must NOT be required to freeze profile content. Profile content is rendered using the latest available content mapping at view time.
  - Share payload parsing must validate against the variant's declared schema before reconstruction.
  - The share payload is not tamper-proof. The system MUST treat all payload fields as untrusted input and enforce strict schema validation and safe fallbacks rather than authenticity assumptions.
  - Missing or invalid section-level content must not hard-crash the result page. The core result (type token display) must remain visible. Affected sections render with a fallback indicator only.
  - The payload MAY include an optional `nickname` only when the user explicitly opts in at share time (default is opt-out). Nickname MUST NOT appear in tracking events or analytics payloads.
- **Confidence:** High

### REQ-F-011 — Nickname validation and privacy boundaries
- **Statement:** Optional nickname input must be validated using an explicit allowed-character policy and length limit, and must respect strict privacy boundaries.
- **Rationale:** Prevents malformed presentation and avoids leaking user-provided text into analytics.
- **Acceptance criteria:**
  - Nickname is trimmed and length-limited to 15 characters.
  - Unsupported characters are rejected using an explicit allowlist policy.
  - Nickname is user-visible presentation data only.
  - Nickname MUST NOT be included in tracking events or analytics ingestion payloads.
  - Nickname MAY be included in the share payload only when the user explicitly opts in at share time (default is opt-out).
- **Confidence:** High

### REQ-F-012 — Local result history persistence (URL-based entries)
- **Statement:** The system must persist recent results locally with bounded retention, preserving each completed run as a distinct history entry.
- **Rationale:** Supports revisit behavior while controlling storage growth and preserving time-based runs.
- **Acceptance criteria:**
  - Each completed result is stored as a distinct run entry, even if multiple runs yield the same derivedType or the same share URL.
  - Each entry MUST include at least: runId (locally generated unique id), createdAt, testVariantId, derivedType, and the share URL string.
  - Entries are ordered newest-first.
  - Maximum retained entries is 50 (fixed).
  - Single-item delete and clear-all actions are supported.
  - The UI MAY provide an optional grouped view that clusters entries by (testVariantId, derivedType) for convenience, but the default history view preserves per-run entries as separate rows.
- **Confidence:** High

### REQ-F-013 — History integrity handling
- **Statement:** History must surface invalid entries and prevent invalid share operations from silently succeeding.
- **Rationale:** Protects user trust when local data degrades.
- **Acceptance criteria:**
  - Invalid links are visibly marked.
  - Invalid-share attempts return user-facing failure feedback.
- **Confidence:** High

### REQ-F-014 — Tracking ingestion contracts
- **Statement:** Tracking ingestion must accept both single-event and batch-event submissions with required-field validation and compatibility fields.
- **Rationale:** Analytics depends on consistent event intake across clients.
- **Tracking Event:** identifier, event type, metadata (non-PII), country, locale/language, environment, processing timestamp.
- **Acceptance criteria:**
  - Required fields include test/session identifier and event type.
  - Batch payloads support mixed success/failure accounting.
  - Preflight/CORS handling is supported.
  - Compatibility fields are accepted for legacy senders.
  - The ingestion contract must reject or ignore clearly personal identifiers (e.g., name, email, phone, exact address).
  - Allowed metadata fields must be limited to operational/analytics context (e.g., test variant, session id, event type, country, locale, device/browser category), not user identity.
  - Tracking payloads must not include user-provided free-text fields (e.g., nickname, open-ended comments).
	- Country and locale/language may be collected for aggregate analytics and segmentation only. Event timestamps are stored in UTC; the system MUST NOT infer user timezone from country or locale/language.
- **Confidence:** High

### REQ-F-015 — Tracking resilience under constrained environments
- **Statement:** Tracking must degrade gracefully under browser privacy constraints or transient network failures.
- **Rationale:** Core test flow should remain usable even when analytics is degraded.
- **Acceptance criteria:**
  - Known constrained contexts can yield non-fatal tracking responses.
  - User-facing test/result flows continue when tracking fails.
- **Confidence:** High

### REQ-F-016 — Tracking event taxonomy (minimum required events)
- **Statement:** The system must emit a minimum standardized set of tracking events to support funnel and abandonment analytics.
- **Rationale:** Funnel and drop-off analytics require consistent event semantics.

The current global telemetry minimum baseline MUST be aligned to the active landing/test SSOT.

#### Current global minimum
The product-wide minimum required events are:

- `landing_view` — Landing phase
- `card_answered` — Landing phase, ingress path only. Fires when the user selects an A/B answer on a landing test card. MUST NOT fire on direct-entry paths.
- `attempt_start` — Test Flow phase
- `question_answered` — Test Flow phase, canonical question index 기준, profile 포함
- `final_submit` — Test Flow phase

#### Internal system signals (not telemetry)
The following signals drive internal state-machine transitions (transition integrity, rollback boundary control, GNB swap timing). They are explicitly excluded from telemetry transmission and MUST NOT appear in any analytics payload:

- `transition_start`
- `transition_complete`
- `transition_fail`
- `transition_cancel`

#### Reserved future subsets
The following events are RESERVED for future phase-specific adoption and MUST NOT be treated as part of the current global minimum baseline:

- `result_viewed`
- `instruction_view`
- `instruction_start_click`
- `share_clicked`
- `share_copied`

#### Interpretation rule
If a lower-trust global document and an active landing/test SSOT differ, the active SSOT takes precedence for current implementation and QA gating.

- **Payload requirements (non-PII):**
  - Every public telemetry event MUST include `event_id`, `ts_ms`, `locale`, `route`, and `consent_state`.
  - `session_id` is transport-patched when consent/session are available; queued pre-sync events may originate with `session_id=null` before transport patching.
  - `card_answered` MUST include `source_variant`, `target_route`, and `landing_ingress_flag=true`.
  - `attempt_start` and `final_submit` MUST include `variant`, `question_index_1based`, `dwell_ms_accumulated`, and `landing_ingress_flag`.
  - `question_answered` MUST include canonical question index and MUST apply to profile and scoring questions alike, excluding the landing-preanswered first scoring answer.
  - `question_index_1based` is canonical-index based, not user-facing `Q1/Q2` based.
  - `question_answered.questionIndex` MUST use canonical index rather than scoring-order UI labels.
  - `final_submit` MUST include `final_responses` containing canonical pole-value responses for all questions (scoring and profile); responses are the selected `poleA`/`poleB` string, not abstract `A|B` symbols. Raw question/answer text and PII are forbidden. Full encoding contract: Test Flow Requirements §3.8.
  - `transition_id`, `result_reason`, and `final_q1_response` are reserved for internal transition logic and MUST NOT appear in public telemetry payloads.
- **Confidence:** High

### REQ-F-017 — Tracking data retention
- **Statement:** The system must support a configurable retention policy for tracking event logs to enable longitudinal analytics.
- **Rationale:** Retention requirements vary by operational needs, cost constraints, and privacy policy.
- **Acceptance criteria:**
  - Retention duration is configurable (e.g., 30/90/365 days).
  - Default retention duration is TBD and must be confirmed as a product/privacy decision.
  - Admin analytics can query data within the configured retention window.
  - Expiration is deterministic and policy-based.
- **Confidence:** Medium

### REQ-F-018 — Admin analytics outputs
- **Statement:** Admin analytics must provide, at minimum, funnel metrics, abandonment diagnostics (including last answered question index), session reuse indicators, and recent activity.
- **Rationale:** Supports operational monitoring and iteration.
- **Acceptance criteria:**
  - Dashboard payload includes aggregate and segmented funnel metrics.
  - Insight payload includes alerts, trend deltas, and recommendations.
  - Date-window calculations are deterministic.
  - Event timestamps must be stored in UTC.
  - Admin analytics reports and dashboards operate in UTC only. Country and locale/language may be used for segmentation, but must not be used as a timezone source.
- **Confidence:** High

### REQ-F-019 — Admin access control (phased)
- **Statement:** Admin capabilities must be access-controlled. For MVP, UI-level gating is acceptable for read-only admin surfaces; for production, all admin endpoints (read and write) must enforce server-side authentication and authorization.
- **Rationale:** Balances MVP scope with eventual security requirements for operational data and controls.
- **Acceptance criteria:**
  - **MVP scope**
    - Admin UI is not reachable via normal navigation for end users.
    - Read-only admin views may be gated at the UI layer for MVP, but MUST be clearly labeled as an MVP security posture.
    - Any action endpoint (e.g., sync trigger) MUST enforce server-side authentication using Magic Link/OTP login (no UI-only gating for actions).
  - **Production scope**
    - Every admin endpoint (GET/POST) enforces server-side auth (no UI-only gating).
    - Authorization distinguishes at least “admin operator” vs “non-admin”.
    - The auth approach is lightweight but secure (e.g., Supabase Magic Link or equivalent).
- **Confidence:** High

### REQ-F-020 — Spreadsheet sync operation
- **Statement:** Operators must be able to check sync readiness and trigger spreadsheet synchronization through machine-readable APIs.
- **Rationale:** Enables lightweight operations and external data maintenance.
- **Acceptance criteria:**
  - Readiness status is queryable without exposing raw secrets.
  - Trigger endpoint returns structured success/failure payload.
  - API contracts distinguish method support and error states.
  - Sync must validate the synchronized source schema (required columns, allowed values, per-variant constraints such as odd question counts per axis) before activating new content.
  - If validation fails, the system MUST not partially activate invalid content; it must surface a clear operator error and keep the last known-good synchronized sources active.
  - The synchronized sources may evolve by adding new language columns. If a selected language column is missing or empty for a specific content field, the system MUST fall back to the default language content rather than failing the end-user flow.
- **Confidence:** High

### REQ-F-021 — Recoverable error UX
- **Statement:** User-critical journeys (instruction/test/result/history) must expose recoverable error and loading states.
- **Rationale:** Prevents user dead ends in parse/load failures.
- **Acceptance criteria:**
  - Error and loading states are distinct.
  - Error states provide actionable retry or navigation path.
  - Error handling must define severity levels (blocking vs non-blocking) and apply consistent UX patterns across instruction/test/result/history.
- **Confidence:** Medium

### REQ-F-022 — Test data load validation
- **Statement:** Test data loading must validate module presence and structural correctness before allowing execution.
- **Rationale:** Prevents runtime failures from malformed or missing variant data.
- **Acceptance criteria:**
  - Missing module or invalid structure produces explicit blocking error.
  - Empty question sets are rejected as invalid.
- **Confidence:** High

### REQ-F-023 — Share payload parse safety
- **Statement:** Share payload parsing must validate type/schema integrity before reconstruction.
- **Rationale:** Reduces broken render paths and malformed-link risks.
- **Acceptance criteria:**
  - Invalid payload schema is rejected.
  - Valid payload reconstructs result context deterministically.
  - Because share payloads are not tamper-proof, validation MUST treat payload fields as untrusted input and enforce strict schema checks and safe fallbacks rather than authenticity assumptions.
- **Confidence:** High

### REQ-F-024 — Client-side history tolerance
- **Statement:** History rendering must tolerate partially invalid stored records and continue presenting remaining valid items.
- **Rationale:** Local storage corruption should not collapse the entire history experience.
- **Acceptance criteria:**
  - Malformed entries are marked or skipped gracefully.
  - Valid entries remain interactive.
- **Confidence:** Medium

### REQ-F-025 — Sync status endpoint contract
- **Statement:** The sync surface must support a status-check mode separate from execution mode.
- **Rationale:** Operators need safe preflight visibility before running sync.
- **Acceptance criteria:**
  - Status mode returns configuration readiness fields.
  - Execution mode returns execution result fields.
- **Confidence:** High

### REQ-F-026 — Localization split (UI i18n vs Sheets-based content)
- **Statement:** UI chrome strings must use standard i18n resources, while test content localization must be provided via per-language columns in the synchronized Sheets sources.
- **Rationale:** Keeps UI translation decoupled from content operations and ensures consistent content updates via Sheets.
- **Acceptance criteria:**
  - UI CTAs/system messages are served from i18n resources.
  - Questions/answers/result interpretation are served from the synced sources using the user-selected language columns.
  - There is no country-specific branching of question sets or scoring logic.
- **Confidence:** High

### REQ-F-027 — Landing catalog entry gating (device-aware)
- **Statement:** Entry from the landing catalog into any destination (test or blog) MUST be gated behind the card’s back/expanded state and an explicit CTA activation.
- **Acceptance criteria:**
  - On touch devices, the first tap on an enterable card MUST only toggle the expanded/back state; it MUST NOT start navigation.
  - On pointer/desktop devices, the entry CTA MUST only be available after an enterable card is in its back/expanded state (e.g., after an intentional hover/focus interaction), not on the front face.
- **Confidence:** Medium

### REQ-F-028 — Instant-start first question contract (landing test cards)
- **Statement:** For enterable test items entered from the landing catalog, the card back MUST present exactly two answer choices that act as the entry CTAs, and selecting one MUST both initiate entry into the test flow and commit the first scoring question (`first scoring question`) answer for that run.
- **Acceptance criteria:**
  - No separate “Start test” CTA is required on the landing card once the two answer-choice CTAs are present.
  - If an instruction step exists in the product flow, it MUST NOT invalidate or overwrite the committed first scoring question answer captured at entry.
  - If profile/qualifier steps exist, they MAY appear before the next runtime scoring question even though the landing CTA already committed the first scoring question.
- **Confidence:** Medium

### REQ-F-029 — Catalog front/back title consistency
- **Statement:** The catalog card title shown on the back/expanded state MUST be identical to the title shown on the front/browsing face for the same item.
- **Rationale:** Prevents user confusion and enforces a single canonical title across browse vs decision states.
- **Acceptance criteria:**
  - Any mismatch between front and back titles is treated as a blocking content/data validation error for that item.
  - The back/expanded header MUST treat the title as the canonical identifier and MUST NOT assume automatic duplication of other front-face metadata.
- **Confidence:** Medium

### REQ-F-030 — Unavailable catalog interaction contract (tests)
- **Statement:** Unavailable test items in the landing catalog MUST be visible for browse/discovery but MUST NOT allow flip/expanded behavior nor expose any entry CTA.
- **Rationale:** Keeps discovery intact while preventing dead-end or misleading interactions.
- **Acceptance criteria:**
  - Unavailable test cards MUST NOT transition into a back/expanded state via pointer, touch, or keyboard interactions.
  - No entry CTA MUST be present or become reachable for unavailable test cards.
  - On touch devices, the “coming soon/unavailable” disclosure MUST be presented by default for unavailable test cards, and taps MUST NOT produce flip/expanded toggles or any navigation trigger.
  - On pointer/desktop devices, hovering or focusing an unavailable test card MAY present a “coming soon/unavailable” disclosure, but MUST NOT enable navigation.
  - Defensive rule: If an unavailable test card is ever rendered in a back/expanded presentation due to an unexpected state, it MUST NOT reveal any back-only content (e.g., preview question, answer choices, meta) and MUST continue to present only the unavailable/coming-soon disclosure with no entry CTA
  - Keyboard focus MAY land on an unavailable test card for accessibility, but focus MUST NOT provide any path to entry CTAs or back/expanded content.
  - Any unavailable disclosure presented on hover/focus MUST NOT obscure or eliminate the ability to perceive focus (focus visibility must be preserved).
- **Confidence:** Medium

### REQ-F-031 — Transition lock policy (landing → destination)
- **Statement:** When navigation is initiated from the landing catalog into a destination page (test or blog), the product MUST enter a transitioning state that locks scroll and input-driven state changes and freezes the initiating visual state until navigation completes.
- **Rationale:** Prevents mid-transition state thrash and preserves a coherent entry experience.
- **Acceptance criteria:**
  - The transitioning state MUST begin at the moment a back-state CTA is activated (tests: answer-choice CTA; blog: “Read more” CTA).
  - During transitioning, landing scroll MUST be locked and no catalog card state (including expanded/back) may change due to incidental interactions.
  - The initiating card’s visual/interaction state at transition start MUST remain stable (not dismissed or altered) until navigation completes.
  - No other catalog items may become interactive while transitioning is active.
  - Accessibility stability: If a transition is initiated via keyboard activation of a CTA, the experience MUST preserve a stable focus indicator (it MUST NOT appear to disappear) through the transition and subsequent page entry.
- **Confidence:** Medium

### REQ-F-032 — Return-to-landing restoration scope
- **Statement:** When returning to the landing catalog from a destination page (test or blog), the product MUST restore the prior landing scroll position but MUST NOT require restoration of transient interactive states.
- **Rationale:** Limits state complexity while preserving the most important spatial continuity for browsing.
- **Acceptance criteria:**
  - Expanded/back states, hover-driven emphasis, and prior keyboard focus targets may reset to defaults on return, as long as scroll position is restored.
  - No requirement exists to restore the last expanded card or the prior keyboard focus target.
- **Confidence:** High

### REQ-F-033 — Keyboard access path to back-state CTAs (landing catalog)
- **Statement:** For enterable catalog items, keyboard users MUST be able to reach and activate back/expanded-state CTAs without any navigation trigger existing on the front/browsing face.
- **Rationale:** The entry contract is “CTA on back only”; keyboard navigation must provide an equivalent path to those CTAs.
- **Acceptance criteria:**
  - A keyboard user MUST be able to place focus on an enterable catalog card and perform an explicit action to enter its back/expanded state.
  - After entering the back/expanded state, the user MUST be able to move focus to the back-state CTAs and activate them (tests: two answer-choice CTAs; blog: “Read more”).
  - Keyboard interactions on the front/browsing face MUST NOT start navigation.
- **Confidence:** Medium

### REQ-F-034 — Single-card attention lock on desktop (landing catalog)
- **Statement:** On desktop/pointer contexts, when a catalog card enters an attention/reading state (enterable back/expanded open, or unavailable disclosure active), other catalog cards MUST NOT enter back/expanded states nor expose entry CTAs until the attention state ends.
- **Rationale:** Prevents competing interactive states and reduces accidental state transitions during focused reading/decision-making.
- **Acceptance criteria:**
  - While an attention/reading state is active for one card, other cards MUST remain non-expanded and MUST NOT present any entry CTA.
  - The attention/reading state ends when the initiating card exits its back/expanded presentation (available) or its unavailable disclosure is no longer active.
- **Confidence:** Medium

### REQ-F-035 — Mobile catalog scroll/interaction lock during back-state
- **Statement:** On touch devices, while an enterable catalog card is in its back/expanded state, the landing catalog MUST lock background scrolling and prevent interaction with other catalog items until the back/expanded state is dismissed or navigation begins via a back-state CTA.
- **Rationale:** Maintains interaction stability on touch and prevents accidental navigation/scroll conflicts.
- **Acceptance criteria:**
  - Back/expanded state on touch MUST NOT allow background catalog scrolling.
  Other catalog items MUST NOT become interactive while a card is in back/expanded state.
  - Navigation MUST still be triggered only by explicit back-state CTAs (see REQ-F-027)
- **Confidence:** Medium

### REQ-F-036 — Navigation bar swap timing during transitions
- **Statement:** During a landing-to-destination transition, the top navigation (GNB/header) MUST remain in the source-page configuration and MUST switch to the destination-page configuration only after navigation completes.
- **Rationale:** Preserves orientation and prevents mid-transition UI reconfiguration that can destabilize user perception and focus.
- **Acceptance criteria:**
  - The landing header/nav MUST remain visible and unchanged throughout the transitioning state.
  - The destination header/nav MUST be applied only once the destination page is fully entered.
- **Confidence:** Medium


## 5) Conceptual Data Model
- **Test Variant:** identifier, availability status, display metadata.
- **Source Row:** a source-authoring record used only during sync/build. It may include ordering fields such as `seq` and a temporary inline preview bridge, but those are source-only concerns.
- **Runtime Registry Card:** the exported landing/blog/test card shape consumed at runtime after source normalization. It must exclude source-only fields such as `seq` and other temporary authoring details.
- **Resolved Preview Payload:** a resolver-provided landing preview object with canonical fields `previewQuestion`, `answerChoiceA`, and `answerChoiceB`. It is distinct from raw source authoring shape and remains stable across source migrations.
- **Question:** ordered prompt with two answer options. Canonical index includes both profile and scoring questions; user-facing `Q1/Q2` applies only to scoring order.
- **Answer Option:** display label + dimension contribution.
- **Session:** id, variant, status, start/last activity timestamps, staged-entry context where applicable.
- **Response Set:** ordered answers, progress, completion state. Landing ingress commit creates a fresh response set seeded with only the first scoring answer. Main progress uses the scoring subset; completion still requires the full canonical question set.
- **Runtime Presentation State:** logical state partition for instruction overlay, profile overlay, scoring page, and profile edit overlay. Overlay shell reuse does not permit instruction content to reappear during profile edit.
- **Result:** finalized `derivedType` (variant-defined label token) and `scoreStats` (schema-defined axes/metrics), with profile/content rendered from the latest mapping at view time.
- **Share Payload:** encoded minimal result data for portable reconstruction of the full result view. URL structure: `/result/{variant}/{type}?{base64Payload}`. `variant` and `type` (derivedType token) are URL path segments. The base64 payload contains `scoreStats` and `shared` (boolean). `scoringSchemaId` is not included; `variant` serves as the sole schema identifier. Optional `nickname` may be included only when the user explicitly opts in at share time.
- **History Entry:** a per-run record containing runId, createdAt, testVariantId, derivedType, and the stored share URL string; presentation data (variant/type) is reconstructed from the URL payload. The UI may optionally provide a grouped view keyed by (testVariantId, derivedType).
- **Tracking Event:** identifier, event type, metadata, environment, processing timestamp.
- **Admin Insight:** funnel stats, trends, alerts, recommendations.

## 6) Assumptions (Explicitly Non-Verified or Product-Intent)
- Anonymous usage without sign-in remains acceptable for end-user test-taking.
- Local history remains device-local (no account sync) for parity rebuild.
- Sync cadence expectations (e.g., “1–2 times/day”) are operational guidance, not validated system constraints.
- Admin role model remains single-operator for current scope.
- Tracking retention target (e.g., 365 days) is not verified in the current repo and must be confirmed as a product/privacy decision.
- Cross-session “same user” analytics is limited if only `sessionId` is used. If cross-session attribution becomes a priority, the product may introduce an anonymous, non-PII `clientInstanceId` generated client-side and stored locally (opt-out capable), subject to privacy policy decisions.
- The product will support multiple test families with different scoring schemas; requirements and payloads must remain schema-driven rather than MBTI-only.

## 7) Traceability Appendix (Evidence Map)

> Implementation references are intentionally confined to this appendix.
>
> Most concrete file references below come from earlier implementation generations and may be superseded by the current App Router/runtime SSOT in `docs/project-analysis.md`, `docs/req-landing.md`, and `docs/req-test.md`. Treat this appendix as historical traceability context, not the current implementation source of truth.

- **REQ-F-001**
  - Evidence: `data/testMetadata.ts` (`testMetadataMap.available`, `getTestTypes("available")`), `pages/index.tsx` (card rendering and non-start behavior), `components/TestCard.tsx` (disabled interaction for unavailable tests).
  - Discrepancy note: A debug variant is marked available.

- **REQ-F-002**
  - Evidence: `data/testMetadata.ts` (`validateTestType`), `lib/testHelpers.ts` (`getValidTestType` multi-stage fallback to default), `pages/test/index.tsx` (normalized test type usage).
  - Discrepancy note: Prior implementation used `getValidTestType` fallback to default. Current policy (per REQ-F-002 and Test Flow Requirements AR-001) routes to an error recovery page. This evidence is superseded.

- **REQ-F-003**
  - Evidence: `pages/test/instruction/[testType].tsx` (`handleStartTest`, start/back flows and abandonment events).

- **REQ-F-004**
  - Evidence: `lib/testHelpers.ts` (`ModernTestSession`, `TestSession`, inactive timeout logic), `hooks/useTestManager.ts` (session reuse/start behavior), `pages/test/instruction/[testType].tsx` (session switch handling).

- **REQ-F-005**
  - Evidence: `data/kids-personality-test.ts`, `data/simple-personality-test.ts`, `data/teen-personality-test.ts` (two-option question objects), `hooks/useTestQuestion.ts` (answer revision/back handling).

- **REQ-F-006**
  - Evidence: `hooks/useTestQuestion.ts` (progress updates and completion transition), `hooks/useTestManager.ts` (`totalQuestions` derived from loaded dataset).

- **REQ-F-007**
  - Evidence: `lib/personality-test.ts` (`calculateScoreStats`, `getMBTITypeFromStats`), `scripts/verify-mbti-calculation.js` (deterministic tie/case checks).

- **REQ-F-008**
  - Evidence: `lib/personality-test.ts` (fixed MBTI dimension derivation), `data/*-personality-test.ts` (MBTI dimension options), `data/*-personality-class-groups.ts` (MBTI profile mappings).
  - Discrepancy note: Earlier extensibility claim was not supported as a current requirement.

- **REQ-F-009**
  - Evidence: `components/test/test-result.tsx` (result profile rendering blocks), `data/*-personality-class-groups.ts` (profile content by type).

- **REQ-F-010**
  - Evidence: `lib/personality-test.ts` (`createResultURL`, `parseResultURL`, `parseBase64URLFromLocation`, `reconstructTestResultFromShareData`), `pages/test/result.tsx` (URL-first reconstruction path).
  - Discrepancy note: URL structure changed to `/result/{variant}/{type}?{base64Payload}`. Prior implementation paths above are superseded. New implementation reference to be added on completion.

- **REQ-F-011**
  - Evidence: `lib/personality-test.ts` (`isValidNickname` regex + trim + 15-char rule), `scripts/test-nickname-validation.js`.

- **REQ-F-012**
  - Evidence: `lib/testHelpers.ts` (`ResultHistory.MAX_ITEMS=50`, dedupe by URL, newest-first insert, remove/clear APIs), `pages/test/result/history/index.tsx` (history operations).
  - Discrepancy note: The current implementation dedupes history entries by share URL. The parity rebuild should preserve per-run entries (no URL dedupe) and optionally support grouped display by (testVariantId, derivedType).

- **REQ-F-013**
  - Evidence: `components/test/test-result-history.tsx` (`validateShareableURL`, invalid-link indicator, invalid-share feedback path).

- **REQ-F-014**
  - Evidence: `pages/api/track.ts` (single + batch handlers, required field validation, legacy compatibility fields, CORS/preflight support).
  - Discrepancy note: No repository-level evidence confirming mandatory one-year retention or formal PII policy enforcement.

- **REQ-F-015**
  - Evidence: `pages/api/track.ts` (`SafariRequestProcessor`, tolerant/non-fatal responses for Safari ITP/fetch-related failures), client tracking callsites that do not block core UX.

- **REQ-F-018**
  - Evidence: `pages/api/admin.ts` (funnel metrics, abandonment/session analysis, insights/alerts/recommendations, deterministic date-window calculations), `pages/admin/index.tsx` (dashboard consumption/rendering).

- **REQ-F-019**
  - Evidence: `pages/admin/index.tsx` (`useAuth` email checks + local-dev bypass), `pages/auth/callback.tsx` (session callback), `pages/api/admin.ts` (GET endpoint lacks explicit auth guard; POST checks authorization header presence).
  - Discrepancy note: Server-side admin enforcement is not uniformly implemented.

- **REQ-F-020**
  - Evidence: `pages/api/sync-sheets.ts` (GET readiness + POST trigger with structured responses), `pages/api/admin/sync.ts` (POST trigger endpoint), `components/admin/SheetsAdminComponent.tsx` (status check + trigger UX).

- **REQ-F-021**
  - Evidence: `pages/test/result.tsx` (loading/error/retry behavior), `pages/test/result/history/index.tsx` (error states and recovery actions), `hooks/useTestManager.ts` (load/retry error propagation).

- **REQ-F-022**
  - Evidence: `data/testMetadata.ts` (`loadTestModule` structure checks and empty-array rejection), `hooks/useTestManager.ts` (explicit load-failure handling).

- **REQ-F-023**
  - Evidence: `lib/personality-test.ts` (`isShareableResultData`, `validateResultData`, parse failure handling/caching), `pages/test/result.tsx` (reject invalid parsed payload).

- **REQ-F-024**
  - Evidence: `components/test/test-result-history.tsx` (per-entry validation/marking), `pages/test/result/history/index.tsx` (history rendering with malformed-entry resilience).

- **REQ-F-025**
  - Evidence: `pages/api/sync-sheets.ts` (GET status mode vs POST execution mode, distinct payload fields).

### Numeric Constraints Verification Notes
- Verified question counts by current datasets: kids=60, simple=48, teen=66.
- Verified nickname maximum length: 15 characters.
- Verified local history maximum size: 50 items.
- Verified session inactivity timeout in active-session logic: 30 minutes.
- No verified repository evidence for mandatory 1-year tracking retention.
