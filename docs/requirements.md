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
- Test content (questions, answers, scoring mappings, and result interpretation content) is sourced from a Google Sheets–managed dataset and synchronized into the product.
- UI chrome (CTA labels, navigation, system messages, and error/loading text) uses standard i18n resources.
- Test content localization is provided by adding per-language columns in the Sheets dataset; there is no country-specific variation in questions or scoring logic.
- The active language is selected by the user and applied consistently across UI and test content.
- The initial localized document response must expose the active language in `<html lang>` at SSR time; client-side reconciliation may only act as a fallback after navigation.

## 2) Roles and Permissions

| Role | Capabilities | Restrictions |
|---|---|---|
| End User (anonymous) | Browse tests, complete test flow, view/share result, view/delete local history | No admin analytics or ops actions |
| Admin Operator | Access admin insights UI, trigger sync operations, review sync/config status | Should be authenticated in production intent |
| Local Development Operator | Use local development bypass paths for admin workflows | Bypass is non-production only |

## 3) Core User Journeys
1. **Browse catalog and enter content (landing)**
   1) User browses a mixed catalog of available and unavailable items.
   2) For available items, entry into a destination page (test or blog) is initiated only via an explicit call-to-action (CTA) that is available on the card’s back/expanded state (not from the front/browsing face).
   3) For unavailable items, the catalog remains browseable but no entry CTA is provided and navigation must not start.
   
2. **Take a test (happy path)**
   1) User selects or confirms a display language (UI + test content).
   2) User selects an available test variant.
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
- Invalid test type from URL/query/local state falls back to safe default.
- Invalid or corrupted share payload yields error/retry/home path.
- Tracking failures (network/privacy constraints) do not block core test completion.
- Empty/malformed test module is treated as blocking data error.
- History list remains usable even when some entries are malformed.

## 4) Functional Requirements

### REQ-F-001 — Test catalog and availability
- **Statement:** The product must expose multiple test variants and clearly separate selectable variants from unavailable ones.
- **Rationale:** Users need discoverability while avoiding dead-end flows.
- **Acceptance criteria:**
  - For available catalog items, navigation/entry MUST be triggered only by an explicit CTA in the item’s expanded/back state; clicking/tapping non-CTA regions of the card (front or back) MUST NOT start navigation.
  - The front/browsing face of a catalog card MUST NOT include any start/entry CTA.
  - Unavailable variants are visible but non-startable and labeled as unavailable/coming soon.
  - Debug/sample variants must never appear in the production end-user catalog.
  - Parity note: If the current implementation exposes any debug/sample variant as “available,” this is a known deviation. The rebuild must enforce production filtering so that debug/sample variants are never user-startable nor visible in the production catalog.
- **Confidence:** High

### REQ-F-002 — Test type validation and fallback
- **Statement:** Test type inputs from route/query/storage/session must be validated, with deterministic fallback when invalid.
- **Rationale:** Prevents broken navigation and stale-state failures.
- **Acceptance criteria:**
  - Invalid test type never crashes test/result/history journeys.
  - A single deterministic default test type is used when validation fails.
- **Confidence:** High

### REQ-F-003 — Instruction gate before test start
- **Statement:** A user must pass through an instruction step before starting test execution.
- **Rationale:** Establishes context and supports consistent session tracking.
- **Acceptance criteria:**
  - Test start action is initiated from instruction context.
  - Leaving instruction before start is treated as pre-test abandonment context.
- **Confidence:** High

### REQ-F-004 — Session lifecycle continuity
- **Statement:** Session identity must continue across instruction, test, and result, including explicit handling for session reuse and test-type switching.
- **Rationale:** Maintains continuity for user flow and telemetry correctness.
- **Acceptance criteria:**
  - Reused active sessions are detectable.
  - Switching to a different test type closes/replaces prior context.
  - Inactive session timeout behavior is deterministic.
- **Confidence:** High

### REQ-F-005 — Binary question model
- **Statement:** Each question must provide exactly two answer options mapped to scoring dimensions.
- **Rationale:** Current scoring contract depends on binary option selection.
- **Acceptance criteria:**
  - Question data contract enforces two answer options per question.
  - Answer revision is supported during progression.
- **Confidence:** High

### REQ-F-005A — Single-axis evaluation per question
- **Statement:** Each question must evaluate exactly one axis/metric defined by the variant’s scoring schema.
- **Rationale:** Simplifies derivation logic and ensures interpretability of progress and analytics.
- **Acceptance criteria:**
  - For every question, both answer options map to the same axis (opposite poles/values within that axis).
  - A question must not contribute to multiple axes.
- **Confidence:** High

### REQ-F-006 — Progress and completion gating
- **Statement:** Test completion must occur only after all questions in the selected variant are answered.
- **Rationale:** Prevents invalid or partial result computation.
- **Acceptance criteria:**
  - Progress is computed from answered count versus total question count.
  - Completion transition is blocked until all required answers exist.
- **Confidence:** High

### REQ-F-007 — Variant-specific derivation logic (by test family)
- **Statement:** For each released test variant, the system must derive a finalized `derivedType` label and `scoreStats` according to that variant’s documented scoring schema (“test family” rules).
- **Rationale:** The product will support multiple test families (e.g., full MBTI, single-axis empathy on T/F only, or other non-MBTI axes). Each family needs explicit, deterministic derivation rules.
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
- **Confidence:** Medium

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
  - The product validates that any computed `scoreStats` matches the declared schema before rendering or sharing.
  - Non-released or experimental schemas must not appear in the production end-user catalog (see REQ-F-001).
- **Confidence:** High

### REQ-F-009 — Result content rendering
- **Statement:** Result views must display the computed type and associated explanatory profile content.
- **Rationale:** User value depends on interpretation, not only type code.
- **Acceptance criteria:**
  - Result view displays the derived type and variant-aware profile content when available.
  - If profile content mapping is missing:
    - The system MUST still display the derived type.
    - The system MUST display a visible warning banner plus a minimal fallback message.
    - The user MUST be able to proceed with normal share actions (share remains valid under the minimal reconstruction contract).
    - The user MUST be provided a recoverable path (retry, choose another test, or return home).
  - Result content is schema-driven per variant: a variant may define which result sections are supported.
  - Unsupported sections for a given variant MUST be omitted without warnings (normal behavior).
  - Missing content for a section that the variant declares as supported MUST surface an operator-visible warning and a user-visible minimal fallback.
  - The experience must not hard-crash.
- **Confidence:** High

### REQ-F-010 — Shareable self-contained result URL (reconstructable result view)
- **Statement:** The system must generate a share URL that self-contains the minimum payload required to reconstruct the full result view (result label + scores + essential context) without server-side result lookup.
- **Rationale:** Enables server-independent sharing while allowing profile/content mapping to evolve.
- **Acceptance criteria:**
  - A valid share URL opens and reconstructs the result view without server result retrieval.
  - The share payload MUST include:
    - `testVariantId`,
    - `scoringSchemaId` (or equivalent schema identifier),
    - a variant-defined final `derivedType` token (1/2/4 letters, validated per variant),
    - and `scoreStats` (as defined by the schema) sufficient to render the score/level UI.
  - The derivedType token MUST represent a completed result only (no in-progress/partial sharing).
  - The share payload MAY include an optional `nickname` only if the user explicitly enables “Include nickname in share” at share time.
  - The share URL must NOT be required to freeze profile content. Profile content is rendered using the latest available content mapping at view time.
  - Share payload parsing must be schema-validated (no cryptographic signing requirement).
  - The share payload is not tamper-proof: users may modify the encoded payload. The system MUST treat the payload as untrusted input and rely on schema validation and safe fallbacks (see REQ-F-023), not authenticity guarantees.
  - The share payload MUST be sufficient to reconstruct the result UI for the variant:
    - axis order and label token positions are derived from `scoringSchemaId` (or equivalent schema identifier), not hardcoded.
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
- **Required events:**
  - `test_catalog_view`
  - `instruction_view`
  - `instruction_start_click`
  - `question_answered` (emitted on each answered question; see payload requirements)
  - `test_completed`
  - `result_viewed`
  - `share_clicked`
  - `share_copied`
- **Payload requirements (non-PII):**
  - MUST include `sessionId` and `testVariantId` on every event.
  - For `question_answered`, MUST include `questionIndex` (1-based, consistent and documented) and `totalQuestions`.
  - `questionIndex` MUST NOT vary by locale/language and MUST be computed from the active variant’s question order.
  - For abandonment analytics, reporting MUST derive the “last answered question index” as the maximum observed `questionIndex` per session.
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
  - Sync must validate the dataset schema (required columns, allowed values, per-variant constraints such as odd question counts per axis) before activating new content.
  - If validation fails, the system MUST not partially activate invalid content; it must surface a clear operator error and keep the last known-good dataset active.
  - The dataset may evolve by adding new language columns. If a selected language column is missing or empty for a specific content field, the system MUST fall back to the default language content rather than failing the end-user flow.
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
- **Statement:** UI chrome strings must use standard i18n resources, while test content localization must be provided via per-language columns in the synchronized Sheets dataset.
- **Rationale:** Keeps UI translation decoupled from content operations and ensures consistent content updates via Sheets.
- **Acceptance criteria:**
  - UI CTAs/system messages are served from i18n resources.
  - Questions/answers/result interpretation are served from the synced dataset using the user-selected language columns.
  - There is no country-specific branching of question sets or scoring logic.
- **Confidence:** High

### REQ-F-027 — Landing catalog entry gating (device-aware)
- **Statement:** Entry from the landing catalog into any destination (test or blog) MUST be gated behind the card’s back/expanded state and an explicit CTA activation.
- **Acceptance criteria:**
  - On touch devices, the first tap on an available card MUST only toggle the expanded/back state; it MUST NOT start navigation.
  - On pointer/desktop devices, the entry CTA MUST only be available after the card is in its back/expanded state (e.g., after an intentional hover/focus interaction), not on the front face.
- **Confidence:** Medium

### REQ-F-028 — Instant-start first question contract (landing test cards)
- **Statement:** For test items entered from the landing catalog, the card back MUST present exactly two answer choices that act as the entry CTAs, and selecting one MUST both initiate entry into the test flow and commit the first answer (Q1) for that run.
- **Acceptance criteria:**
  - No separate “Start test” CTA is required on the landing card once the two answer-choice CTAs are present.
  - If an instruction step exists in the product flow, it MUST NOT invalidate or overwrite the committed Q1 answer captured at entry; the first unanswered question presented after entry MUST reflect that Q1 is already answered.
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
- **Statement:** For available catalog items, keyboard users MUST be able to reach and activate back/expanded-state CTAs without any navigation trigger existing on the front/browsing face.
- **Rationale:** The entry contract is “CTA on back only”; keyboard navigation must provide an equivalent path to those CTAs.
- **Acceptance criteria:**
  - A keyboard user MUST be able to place focus on an available catalog card and perform an explicit action to enter its back/expanded state.
  - After entering the back/expanded state, the user MUST be able to move focus to the back-state CTAs and activate them (tests: two answer-choice CTAs; blog: “Read more”).
  - Keyboard interactions on the front/browsing face MUST NOT start navigation.
- **Confidence:** Medium

### REQ-F-034 — Single-card attention lock on desktop (landing catalog)
- **Statement:** On desktop/pointer contexts, when a catalog card enters an attention/reading state (available back/expanded open, or unavailable disclosure active), other catalog cards MUST NOT enter back/expanded states nor expose entry CTAs until the attention state ends.
- **Rationale:** Prevents competing interactive states and reduces accidental state transitions during focused reading/decision-making.
- **Acceptance criteria:**
  - While an attention/reading state is active for one card, other cards MUST remain non-expanded and MUST NOT present any entry CTA.
  - The attention/reading state ends when the initiating card exits its back/expanded presentation (available) or its unavailable disclosure is no longer active.
- **Confidence:** Medium

### REQ-F-035 — Mobile catalog scroll/interaction lock during back-state
- **Statement:** On touch devices, while an available catalog card is in its back/expanded state, the landing catalog MUST lock background scrolling and prevent interaction with other catalog items until the back/expanded state is dismissed or navigation begins via a back-state CTA.
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
- **Question:** ordered prompt with two answer options.
- **Answer Option:** display label + dimension contribution.
- **Session:** id, variant, status, start/last activity timestamps.
- **Response Set:** ordered answers, progress, completion state.
- **Result:** finalized `derivedType` (variant-defined label token) and `scoreStats` (schema-defined axes/metrics), with profile/content rendered from the latest mapping at view time.
- **Share Payload:** encoded minimal result data for portable reconstruction of the full result view: `testVariantId`, `scoringSchemaId`, `derivedType`, `scoreStats`, and optional `nickname` (opt-in only).
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

- **REQ-F-001**
  - Evidence: `data/testMetadata.ts` (`testMetadataMap.available`, `getTestTypes("available")`), `pages/index.tsx` (card rendering and non-start behavior), `components/TestCard.tsx` (disabled interaction for unavailable tests).
  - Discrepancy note: A debug/sample variant is marked available.

- **REQ-F-002**
  - Evidence: `data/testMetadata.ts` (`validateTestType`), `lib/testHelpers.ts` (`getValidTestType` multi-stage fallback to default), `pages/test/index.tsx` (normalized test type usage).

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
