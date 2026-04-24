# Functional Requirements Specification

> **Status (2026-04-21): Product intent / background document.**
>
> This file preserves the broader functional product intent and historical evidence map.
> It is not the current implementation source of truth. For active runtime contracts,
> routes, QA gates, and code ownership, use `docs/project-analysis.md`,
> `docs/req-landing.md`, `docs/req-test.md`, and `docs/req-test-plan.md` first.

## 1) Overview
This product lets users take multiple kinds of short assessments (test variants/families), receive a variant-defined final result label (a 1-, 2-, or 4-letter token depending on the variant's axis count) along with axis-based scores, and share or revisit that result without requiring an account.

### Product goals
- Provide a fast, low-friction assessment flow for anonymous users.
- Deliver interpretable result content, not just a type code.
- Enable self-contained result sharing and local revisit history.
- Capture behavioral telemetry to power operator analytics.
- Provide basic admin/ops capabilities for insight monitoring and spreadsheet sync.

### Content and localization principles
- Test content (questions, answers, landing preview inputs, and result interpretation content) is canonically sourced from Google Sheets–managed sources and synchronized into the product.
- Landing preview input은 Questions 데이터의 **first scoring question (`scoring1`)** 에서 파생된다. legacy inline preview source는 제거되었고, runtime consumer contract는 `previewQuestion`, `answerChoiceA`, `answerChoiceB` shape를 유지한다.
- Runtime consumers must use canonical resolver outputs rather than reading raw source rows or fixture authoring shapes directly.
- UI chrome (CTA labels, navigation, system messages, and error/loading text) uses standard i18n resources.
- Test content localization is provided by adding per-language columns in the synchronized Sheets sources; there is no country-specific variation in questions or scoring logic.
- The active language is selected by the user and applied consistently across UI and test content.
- The initial localized document response must expose the active language in `<html lang>` at SSR time; client-side reconciliation may only act as a fallback after navigation.

### Confirmed policy alignment
The following decisions are locked. Detailed SSOT for each is `docs/req-test.md §1.3`, `§2`, `§3`, `§9`.

- Google Sheets topology: three separate spreadsheets (`Landing`, `Questions`, `Results`). Secrets: `GOOGLE_SHEETS_SA_KEY`, `GOOGLE_SHEETS_ID_LANDING`, `GOOGLE_SHEETS_ID_QUESTIONS`, `GOOGLE_SHEETS_ID_RESULTS`.
- Questions uses sheet name = variant ID. `kind` column is not authored; `seq` alone determines question type. `q.*` → profile; numeric → scoring.
- Canonical index, scoring order, and user-facing `Q1/Q2` are three separate concepts. Profile questions appear in canonical `questions[]` but are excluded from UI Q numbering and main progress.
- Landing preview always derives from first scoring question (`scoring1`). Landing never asks profile questions. Landing A/B selection creates a durable staged entry immediately; canonical binding happens at runtime entry commit.
- Same-variant landing reselect is restart intent. Old active runs are preserved until commit success. Commit success creates fresh response set seeded with only the first scoring answer.
- Profile questions are overlay-only. The instruction shell may be reused for profile, but instruction content must not reappear during profile edit.
- Main progress is scoring-only. Profile completion is a prerequisite overlay step.
- Telemetry question indexes use canonical index only. `attempt_start` fires when the first runtime question is actually rendered after instruction.
- `scoringLogicType` canonical location: `src/features/test/schema-registry.ts`. No Schema.xlsx 4th source.

## 2) Roles and Permissions

| Role | Capabilities | Restrictions |
|---|---|---|
| End User (anonymous) | Browse tests, complete test flow, view/share result, view/delete local history | No admin analytics or ops actions |
| Admin Operator | Access admin insights UI, trigger sync operations, review sync/config status | Should be authenticated in production intent |
| Local Development Operator | Use local development bypass paths for admin workflows | Bypass is non-production only |

## 3) Core User Journeys
1. **Browse catalog and enter content (landing)**
   1) User browses a mixed catalog of standard available items, consent-independent opt-out-capable test items, and unavailable items.
   2) For enterable items, entry into a destination page (test or blog) is initiated only via an explicit CTA in the card's expanded/back state (not from the front/browsing face).
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
   1) Operator opens admin surfaces and reviews funnel and trend outputs.
   2) Operator checks sync configuration/readiness and triggers sync.
   3) Operator receives machine-readable success/failure status.
   - Sync operations update variant definitions, questions, and result content mappings used by end-user flows.
   - Sync must be safe and non-disruptive to in-progress end-user sessions.

### Critical edge journeys
- Invalid test type from URL/query/local state routes to an error recovery page; no fallback to a default variant.
- Invalid or corrupted share payload yields error/retry/home path.
- Tracking failures (network/privacy constraints) do not block core test completion.
- Empty/malformed test module is treated as blocking data error.
- History list remains usable even when some entries are malformed.

## 4) Functional Requirements

> For verification contracts and QA matrices, see `docs/req-landing.md` §14 and `docs/req-test.md` §12. This section preserves the requirement statement, rationale, confidence, and key acceptance criteria for each REQ-F.

### REQ-F-001 — Test catalog and availability
- **Statement:** Expose multiple test variants; clearly separate enterable from unavailable. Entry from landing is gated behind back/expanded CTA only.
- **Rationale:** Users need discoverability while avoiding dead-end flows.
- **Acceptance criteria:**
  - For enterable catalog items, navigation/entry MUST be triggered only by an explicit CTA in the item's expanded/back state; clicking/tapping non-CTA regions of the card MUST NOT start navigation.
  - The front/browsing face of a catalog card MUST NOT include any start/entry CTA.
  - Enterable variants may be standard available items or consent-independent opt-out-capable items; both remain gated behind the same back-state CTA and instruction-step entry contracts.
  - Unavailable variants are visible but non-startable, labeled as unavailable/coming soon.
  - Debug variants must never appear in the production end-user catalog.
- **Confidence:** High

### REQ-F-002 — Test variant validation and error recovery
- **Statement:** Variant inputs from route/query/storage/session must be validated. Failure blocks runtime entry and routes to an error recovery page.
- **Rationale:** Prevents broken navigation and stale-state failures. Silent fallback to a default variant is not an acceptable recovery path.
- **Acceptance criteria:**
  - Invalid variant input never crashes test/result/history journeys.
  - Variant validation failure immediately blocks runtime entry. No session or run context is created.
  - Error recovery page displays up to 2 incomplete test cards (catalog order, excluding user-completed variants).
  - If 0 incomplete variants exist, no cards are shown and only a landing CTA is provided.
- **Confidence:** High

### REQ-F-003 — Instruction gate before test start
- **Statement:** A user must pass through an instruction step before test execution. Consent-related branching is resolved inside the instruction step; the test route must not expose a separate route-local consent banner or dialog.
- **Rationale:** Establishes context and supports consistent session tracking.
- **Confidence:** High

### REQ-F-004 — Session lifecycle continuity
- **Statement:** Session identity must continue across instruction, test, and result, with explicit handling for session reuse and test-type switching.
- **Rationale:** Maintains continuity for user flow and telemetry correctness.
- **Acceptance criteria:**
  - Reused active sessions are detectable. Switching test type closes/replaces prior context.
  - Inactive session timeout is 30 minutes from the last answered question, evaluated at re-entry point (not by background timer).
  - Landing ingress creates a durable staged entry immediately, but canonical binding of the provisional answer is deferred until runtime entry commit.
  - Same-variant landing reselect is treated as restart intent. Old active runs remain intact until commit success.
  - Commit success for landing ingress creates a fresh response set and seeds only the first scoring answer.
- **Confidence:** High

### REQ-F-005 — Binary question model
- **Statement:** Each question must provide exactly two answer options. Scoring questions map both options to a scoring axis. Profile questions map options to qualifier values and do not contribute to axis scoring. Full contract: Test Flow Requirements §3.8 (SSOT).
- **Confidence:** High

### REQ-F-005A — Single-axis evaluation per scoring question
- **Statement:** Each scoring question must evaluate exactly one axis (including reversed pole order such as schema `E/I` with question `I/E`). A scoring question must not contribute to multiple axes. Profile questions are exempt from axis-mapping requirements.
- **Confidence:** High

### REQ-F-006 — Progress and completion gating
- **Statement:** Test completion must occur only after all required questions are answered.
- **Acceptance criteria:**
  - Main progress = answered scoring-question count / total scoring-question count.
  - Profile questions are prerequisite overlay steps excluded from main progress numerator/denominator.
  - Completion transition is blocked until all required answers exist across the full canonical question set.
  - Result derivation uses only the scoring-question subset.
- **Confidence:** High

### REQ-F-007 — Variant-specific derivation logic (by test family)
- **Statement:** For each released test variant, derive a finalized `derivedType` label and `scoreStats` per that variant's documented scoring schema. Scoring schema is schema-driven; MBTI 4-axis hardcoding is forbidden. `axisCount ∈ {1, 2, 4}`.
- **Rationale:** Multiple test families with different axes require explicit, deterministic derivation rules.
- **Acceptance criteria:**
  - Each variant declares axes, derivation rules linking answers → scoreStats → derivedType, and any tie/threshold handling rules.
  - Each axis must have an odd number of questions in the released dataset (bidirectional axis matching). Violation is a blocking validation error.
- **Confidence:** High

### REQ-F-007A — Axis model contract (variable axis count)
- **Statement:** Each variant declares `axisCount ∈ {1,2,4}` and an ordered axis list. `derivedType` token length = `axisCount`. UI must not assume a fixed 4-axis MBTI structure.
- **Confidence:** High

### REQ-F-008 — Scoring schema definition per variant
- **Statement:** Each released variant defines and validates its scoring schema. Schema authoring is code-owned canonical registry (`src/features/test/schema-registry.ts`). No Sheets-authored schema source (no Schema.xlsx).
- **Confidence:** High

### REQ-F-008A — Landing registry source/runtime boundary and preview projection
- **Statement:** Source authoring shape and runtime/export shape must remain distinct. Preview consumer shape (`previewQuestion`, `answerChoiceA`, `answerChoiceB`) remains fixed across source migrations. Source-only fields such as `seq` must not leak into runtime payloads, and Landing source rows do not carry inline preview fields. Arrays follow `seq -> sort -> drop`; missing/duplicate `seq` must fail validation.
- **Confidence:** High

### REQ-F-008B — Unified landing meta contract and blog subtitle continuity
- **Statement:** Runtime meta keys are always `durationM`, `sharedC`, `engagedC`. Blog cards use `subtitle` as the single source text for Normal and Expanded states. Removed blog-only fields must not re-enter the runtime card contract.
- **Confidence:** High

### REQ-F-008C — Preview-source migration contract (completed)
- **Statement:** The preview source swap from legacy inline preview data to Questions `scoring1` is complete. Consumer shape remains unchanged; builder projects the first scoring question into the registry `testPreviewPayloadByVariant` store, and `resolveTestPreviewPayload()` exposes that stable resolver boundary.
- **Confidence:** High

### REQ-F-009 — Result content rendering
- **Statement:** Result views must display the computed type and associated explanatory profile content, with section-level fallback for missing content.
- **Rationale:** User value depends on interpretation, not only type code. Section-level failures must not collapse the entire result experience.
- **Acceptance criteria:**
  - **Mandatory sections** (`derived_type`, `axis_chart`, `type_desc`): always rendered regardless of variant's `supportedSections` declaration.
  - **Optional sections** (e.g. `trait_list`): rendered only when declared in `supportedSections`. Omission without warning is normal behavior.
  - Missing content mapping → empty container + short placeholder message + operator console warning. Hard crash and blank result screen are forbidden.
  - Result content is rendered from the latest available content mapping at view time. The result URL is not required to freeze profile content.
- **Confidence:** High

### REQ-F-010 — Shareable self-contained result URL (reconstructable result view)
- **Statement:** The system must generate a share URL that self-contains the minimum payload required to reconstruct the full result view without server-side result lookup.
- **Rationale:** Enables server-independent sharing while allowing profile/content rendering to remain dynamic at view time.
- **Acceptance criteria:**
  - URL format: `/result/{variant}/{type}?{base64Payload}`
    - `{variant}`: test variant identifier as URL path segment 1. Each variant maps to exactly one fixed scoring logic and rendering schema. No `scoringSchemaId` is required in the payload.
    - `{type}`: result type segment as URL path segment 2. For variants without `qualifierFields`, length equals `axisCount`. For variants with `qualifierFields` (e.g., EGTT), length equals `axisCount + sum(qualifierFields[i].tokenLength)`. Full type segment contract: Test Flow Requirements §3.11 (SSOT).
    - `{base64Payload}`: URL-safe Base64 encoding (`+`→`-`, `/`→`_`, padding `=` removed) of a JSON object.
  - A valid share URL opens and reconstructs the result view without server result retrieval.
  - The base64 payload MUST include `scoreStats` (per variant schema) and `shared` (boolean: `true` when generated as a share link, `false` otherwise).
  - The base64 payload MUST NOT include `scoringSchemaId`, `derivedType`, or `testVariantId`. These are fully expressed by the URL path segments.
  - The `type` path segment MUST represent a completed result only. No in-progress or partial result may be encoded.
  - The share URL must NOT be required to freeze profile content. Profile content is rendered using the latest available content mapping at view time.
  - The share payload is not tamper-proof. The system MUST treat all payload fields as untrusted input and enforce strict schema validation and safe fallbacks rather than authenticity assumptions.
  - The payload MAY include an optional `nickname` only when the user explicitly opts in at share time (default is opt-out). Nickname MUST NOT appear in tracking events or analytics payloads.
- **Confidence:** High

### REQ-F-011 — Nickname validation and privacy boundaries
- **Statement:** Optional nickname input must be validated using an explicit allowed-character policy and length limit, and must respect strict privacy boundaries.
- **Acceptance criteria:**
  - Nickname is trimmed and length-limited to 15 characters.
  - Unsupported characters are rejected using an explicit allowlist policy.
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
- **Statement:** Malformed history entries are marked or skipped gracefully. Invalid-share attempts return user-facing failure feedback.
- **Confidence:** High

### REQ-F-014 — Tracking ingestion contracts
- **Statement:** Tracking ingestion must accept both single-event and batch-event submissions with required-field validation and compatibility fields.
- **Rationale:** Analytics depends on consistent event intake across clients.
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
- **Statement:** Tracking degrades gracefully under browser privacy constraints or transient network failures. Core test/result flows continue when tracking fails.
- **Confidence:** High

### REQ-F-016 — Tracking event taxonomy (minimum required events)
- **Statement:** The system must emit a minimum standardized set of tracking events to support funnel and abandonment analytics.
- **Rationale:** Funnel and drop-off analytics require consistent event semantics across landing and test-flow phases.

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
  - `final_submit` MUST include `final_responses` containing canonical question-indexed semantic response codes for all questions (scoring and profile). Current runtime payload uses `'A' | 'B'` codes, not raw question/answer text. Domain derivation must first project these codes into pole/qualifier tokens through the Test Flow Requirements §3.8 projection boundary.
  - `transition_id`, `result_reason`, and `final_q1_response` are reserved for internal transition logic and MUST NOT appear in public telemetry payloads.
- **Confidence:** High

### REQ-F-017 — Tracking data retention
- **Statement:** Configurable retention policy. Default TBD — must be confirmed as a product/privacy decision. Admin analytics queries within the configured retention window.
- **Confidence:** Medium

### REQ-F-018 — Admin analytics outputs
- **Statement:** Admin analytics must provide, at minimum, funnel metrics, abandonment diagnostics (including last answered question index), session reuse indicators, and recent activity.
- **Rationale:** Supports operational monitoring and iteration.
- **Acceptance criteria:**
  - Dashboard payload includes aggregate and segmented funnel metrics.
  - Insight payload includes alerts, trend deltas, and recommendations.
  - Date-window calculations are deterministic.
  - Event timestamps must be stored in UTC. Admin analytics reports and dashboards operate in UTC only. Country and locale/language may be used for segmentation, but must not be used as a timezone source.
- **Confidence:** High

### REQ-F-019 — Admin access control (phased)
- **Statement:** Admin capabilities must be access-controlled. For MVP, UI-level gating is acceptable for read-only admin surfaces; for production, all admin endpoints (read and write) must enforce server-side authentication and authorization.
- **Rationale:** Balances MVP scope with eventual security requirements for operational data and controls.
- **Acceptance criteria:**
  - **MVP scope:** Admin UI is not reachable via normal navigation for end users. Read-only admin views may be gated at the UI layer for MVP, but MUST be clearly labeled as an MVP security posture. Any action endpoint (e.g., sync trigger) MUST enforce server-side authentication using Magic Link/OTP login (no UI-only gating for actions).
  - **Production scope:** Every admin endpoint (GET/POST) enforces server-side auth (no UI-only gating). Authorization distinguishes at least "admin operator" vs "non-admin". The auth approach is lightweight but secure (e.g., Supabase Magic Link or equivalent).
- **Confidence:** High

### REQ-F-020 — Spreadsheet sync operation
- **Statement:** Operators can check sync readiness and trigger sync via machine-readable APIs. Sync validates schema before activating new content. Partial activation on validation failure is forbidden; last-known-good sources remain active. Missing language column → fallback to default locale, not flow failure.
- **Current implementation note (2026-04-24):** Group B-2 implements the production sync path as a GitHub Actions workflow plus `scripts/sync/sync.ts`, not as an admin/operator API. It reads Landing and Questions Sheets, performs 2-source Action-level blocking while Results Sheets loading is pending, regenerates the full `variant-registry.generated.ts` only after validation, and restores the original generated file if post-write git operations fail.
- **Confidence:** High

### REQ-F-021 — Recoverable error UX
- **Statement:** Instruction/test/result/history journeys must expose recoverable error and loading states with severity levels (blocking vs non-blocking) and actionable recovery paths.
- **Confidence:** Medium

### REQ-F-022 — Test data load validation
- **Statement:** Missing module or invalid structure produces explicit blocking error. Empty question sets are rejected.
- **Confidence:** High

### REQ-F-023 — Share payload parse safety
- **Statement:** Invalid payload schema is rejected. Payload fields treated as untrusted input; strict schema validation and safe fallbacks required.
- **Confidence:** High

### REQ-F-024 — Client-side history tolerance
- **Statement:** Malformed history entries are marked or skipped gracefully; valid entries remain interactive.
- **Confidence:** Medium

### REQ-F-025 — Sync status endpoint contract
- **Statement:** Status-check mode (preflight) and execution mode are separate API surfaces with distinct payload fields.
- **Confidence:** High

### REQ-F-026 — Localization split (UI i18n vs Sheets-based content)
- **Statement:** UI CTAs/system messages use i18n resources. Questions/answers/result interpretation use synced Sheets sources with the user-selected language column. No country-specific question sets or scoring logic.
- **Confidence:** High

### REQ-F-027 — Landing catalog entry gating (device-aware)
- **Statement:** Entry must be gated behind the card's back/expanded state and an explicit CTA activation. First tap on touch expands only; it must not start navigation.
- **Confidence:** Medium

### REQ-F-028 — Instant-start first question contract (landing test cards)
- **Statement:** Landing test card back presents two answer-choice CTAs. Selecting one both initiates entry and commits the `scoring1` answer. Instruction step must not invalidate this committed answer. Profile/qualifier steps may appear before the next runtime scoring question even though `scoring1` was committed at entry.
- **Confidence:** Medium

### REQ-F-029 — Front/back title consistency
- **Statement:** Front/back title mismatch is a blocking content/data validation error for that item.
- **Confidence:** Medium

### REQ-F-030 — Unavailable catalog interaction contract
- **Statement:** Unavailable test items are visible but must not allow expanded/flip behavior or expose any entry CTA. Coming-soon disclosure must be default-visible on touch. Keyboard focus may land on unavailable cards for accessibility but must not provide any path to entry CTAs.
- **Confidence:** Medium

### REQ-F-031 — Transition lock policy (landing → destination)
- **Statement:** Navigation initiation enters a transitioning state that locks scroll and input-driven state changes, and freezes the initiating card's visual state until navigation completes. No other catalog items may become interactive while transitioning.
- **Confidence:** Medium

### REQ-F-032 — Return-to-landing restoration scope
- **Statement:** Returning from a destination page must restore prior landing scroll position. Transient interactive states (expanded cards, hover-driven emphasis, prior keyboard focus) may reset to defaults.
- **Confidence:** High

### REQ-F-033 — Keyboard access path to back-state CTAs
- **Statement:** Keyboard users must be able to reach and activate back/expanded-state CTAs. Keyboard interactions on the front face must not start navigation.
- **Confidence:** Medium

### REQ-F-034 — Single-card attention lock on desktop
- **Statement:** While one card is in back/expanded state or unavailable disclosure is active, other catalog cards must not enter back/expanded states or expose entry CTAs.
- **Confidence:** Medium

### REQ-F-035 — Mobile catalog scroll/interaction lock during back-state
- **Statement:** While an enterable catalog card is in back/expanded state on touch, background catalog scrolling must be locked and other catalog items must not become interactive.
- **Confidence:** Medium

### REQ-F-036 — Navigation bar swap timing during transitions
- **Statement:** The GNB must remain in the source-page configuration throughout the transitioning state and switch to destination-page configuration only after navigation completes.
- **Confidence:** Medium

## 5) Conceptual Data Model
- **Test Variant:** identifier, availability status, display metadata.
- **Source Row:** source-authoring record. May include `seq`; source-only concerns must not leak into runtime shapes. Landing source rows are metadata-only and do not include inline preview fields.
- **Runtime Registry Card:** exported landing/blog/test card shape after source normalization. Excludes source-only fields such as `seq` and other temporary authoring details.
- **Resolved Preview Payload:** resolver-provided landing preview with canonical fields `previewQuestion`, `answerChoiceA`, `answerChoiceB`. Currently projected from Questions `scoring1` and stable across source migrations.
- **Question:** ordered prompt with two answer options. Canonical index includes both profile and scoring questions; user-facing `Q1/Q2` applies only to scoring order.
- **Answer Option:** display label + dimension contribution.
- **Session:** id, variant, status, start/last activity timestamps, staged-entry context where applicable.
- **Response Set:** ordered answers, progress, completion state. Landing ingress commit creates a fresh response set seeded with only the first scoring answer. Main progress uses the scoring subset; completion still requires the full canonical question set.
- **Runtime Presentation State:** logical state partition for instruction overlay, profile overlay, scoring page, and profile edit overlay. Overlay shell reuse does not permit instruction content to reappear during profile edit.
- **Result:** finalized `derivedType` (variant-defined label token) and `scoreStats` (schema-defined axes/metrics), with profile/content rendered from the latest mapping at view time.
- **Share Payload:** encoded minimal result data for portable reconstruction of the full result view. URL structure: `/result/{variant}/{type}?{base64Payload}`. `variant` and `type` (derivedType token) are URL path segments. The base64 payload contains `scoreStats` and `shared` (boolean). `scoringSchemaId` is not included; `variant` serves as the sole schema identifier. Optional `nickname` may be included only when the user explicitly opts in at share time.
- **History Entry:** a per-run record containing runId, createdAt, testVariantId, derivedType, and the stored share URL string. The UI may optionally provide a grouped view keyed by (testVariantId, derivedType).
- **Tracking Event:** identifier, event type, metadata, environment, processing timestamp.
- **Admin Insight:** funnel stats, trends, alerts, recommendations.

## 6) Assumptions (Explicitly Non-Verified or Product-Intent)
- Anonymous usage without sign-in remains acceptable for end-user test-taking.
- Local history remains device-local (no account sync) for parity rebuild.
- Sync cadence expectations (e.g., "1–2 times/day") are operational guidance, not validated system constraints.
- Admin role model remains single-operator for current scope.
- Tracking retention target (e.g., 365 days) is not verified in the current repo and must be confirmed as a product/privacy decision.
- Cross-session "same user" analytics is limited if only `sessionId` is used. If cross-session attribution becomes a priority, an anonymous non-PII `clientInstanceId` may be introduced (opt-out capable), subject to privacy policy decisions.
- The product will support multiple test families with different scoring schemas; requirements and payloads must remain schema-driven rather than MBTI-only.

## 7) Traceability Appendix (Historical Evidence Map)

> **Note:** Most concrete file references below come from earlier implementation generations (pre-App Router, `pages/*` era) and are superseded by the current SSOT in `docs/project-analysis.md`, `docs/req-landing.md`, and `docs/req-test.md`. Treat this appendix as **historical traceability context only**.

**Key historical discrepancies (superseded evidence):**
- **REQ-F-002**: Prior implementation used `getValidTestType` fallback to default. Current policy routes to an error recovery page. Evidence: `lib/testHelpers.ts`, `pages/test/index.tsx` — superseded.
- **REQ-F-007**: Earlier implementation was MBTI 4-axis hardcoded (`lib/personality-test.ts getMBTITypeFromStats`). Current requirement is schema-driven — superseded.
- **REQ-F-010**: URL structure changed to `/result/{variant}/{type}?{base64Payload}`. Prior implementation (`lib/personality-test.ts createResultURL/parseResultURL`) — superseded.
- **REQ-F-012**: Prior implementation deduped history by share URL. Current policy preserves per-run entries with no URL dedupe — superseded.

**Verified numeric constraints (historical datasets):**
- Question counts: kids=60, simple=48, teen=66 (pre-App Router era).
- Nickname maximum length: 15 characters.
- Local history maximum size: 50 items.
- Session inactivity timeout: 30 minutes.
- No verified repository evidence for mandatory 1-year tracking retention.

For current implementation evidence, use git log and `docs/project-analysis.md`.
