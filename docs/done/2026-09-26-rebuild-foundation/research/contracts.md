# ViveTest contract classification for the from-scratch rebuild

Investigator report (read-only). Snapshot: primary checkout `main` = `20f973a` (clean), prototype workspace `MOCK/` = `/private/tmp/claude-501/-Users-woohyeon-Local-ViveTest/7b610dca-70f4-41bf-b48e-fe44caf07c81/scratchpad/mockups/` as of 2026-09-26 02:2x (the prototype session is still running its final regression; `j3-forks.html` was last written 02:19 and the hub's J copy is still `{{J_SYS}}`/`{{J_CARD}}` placeholders in `_hub-body.html`). Nothing was modified in either location.

## 0. Legend, method, sources

**Classes.** (A) domain contract that survives the rebuild regardless of UI · (B) UI / interaction / visual contract superseded by the prototype · (B0) UI contract the prototype does **not** touch — no replacement exists yet, carry the rule forward and re-skin, or decide · (C) conflict that needs an owner decision (both sides quoted) · (D) obsolete (desktop hover-only, wave process, closed defects, legacy seams). A section can carry two tags when its content splits (e.g. `A/B` = domain semantics survive, presentation superseded).

**"Fully specified"** means the rule is written in a contract document with enough detail to re-implement without reading code. "Code-only" means the only precise statement lives in code/tests or in a decision-register change-log row, not in a `req-*.md`.

**Sources read.** `docs/requirements.md` (381 l.), `docs/req-landing.md` (1031), `docs/req-landing-interaction.md` (236), `docs/req-test.md` (1366), `docs/req-test-plan.md` (398), `docs/project-analysis.md` (760), `docs/decision-register.md` (680), `docs/wave-roadmap.md` (497), `docs/blocker-traceability.json` (67 entries), `docs/agent-guides/project-rules.md` (160); active plans consulted for the result/OG/history decisions: `docs/plans/2026-09-11-mobile-refactor-analysis.md` §0–§1, §15 and `docs/plans/2026-05-17-result-pipeline-todos.md`; code read only to verify facts (`src/config/site.ts`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/opengraph-image.tsx`, `src/app/manifest.ts`, `src/features/test/schema-registry.ts`, `src/features/landing/storage/storage-keys.ts`, `src/features/test/storage/test-storage-keys.ts`, `src/messages/kr.json` keys, `package.json` at HEAD). Prototype: `MOCK/BRIEF.md` (product facts, build rules), `MOCK/BRIEF2.md` (owner rules), `MOCK/BRIEF3.md`, `MOCK/shared/{shell.js,shell.css,content.js,share.js,flow.js}` headers, `MOCK/_hub-body.html` (final hub draft incl. its "제품 계약과 부딪히는 곳" list), `realBuild` notes in `l3-deck.html`, `i3-split.html`, `j3-forks.html`, `d3-story.html`, `v-vote.html`; the extracted dialogue `proto-session/dialog.md` (owner rounds 1–3 verbatim); a targeted grep of the raw transcript (no owner message after round 3 other than two progress questions at 13:33 and 16:59 on 2026-09-25); memory notes `vivetest-owner-interaction-principles.md`, `vivetest-mobile-interaction-mockups.md`.

---

## 1. Executive summary

1. **The domain core is large, precise and UI-independent, and it survives almost intact.** Everything in `req-test.md` §2–§9 that is not a picture of a screen (variants/attributes, canonical index vs scoring order, profile/qualifier questions, schema-driven derivation, type segment, entry paths, staged entry, runtime entry commit, consent × attribute × ingress instruction matrix, `instructionSeen`, answer retention, eligibility, volatility/cleanup, result URL/payload, error taxonomy, telemetry index semantics) is class A and is fully specified. The prototype explicitly re-used it (shell.js header cites `req-landing §13.5` and `req-test §3.6`; realBuild notes map Q1 answer to `§8.6`/`§13.4`).
2. **Almost all of `req-landing.md` §6–§11, all of `req-landing-interaction.md`, and most of `design.md`'s motion bans are class B or D.** The prototype replaces the 1-column catalog + bottom sheet with a horizontal poster deck whose expanded card becomes "the window" hosting the test stage; replaces the bottom-sheet instruction with a centred modal; replaces the bar progress with a palette rail (I/J) or top-edge story bar (D); lifts the spring/parallax/"background animation 0" bans; introduces per-test signature colours. Desktop/tablet hover contracts (§7.5, §8.1–§8.4, grid §6.2/§6.7) have no counterpart in a phone-column prototype and are D.
3. **Only one domain rule is actually overturned by an explicit owner decision:** after re-answering a revisited question the flow advances exactly one question (`"되돌아간 문항부터 한 단계식 이동"`), replacing `req-test.md` §4.3/§3.9 "go to first unanswered". Everything else the prototype needs is **additive** (share/vote, 3–4-answer questions, stage assignment, test colours, reduced-motion stage).
4. **Real owner decisions remain (class C):** desktop/tablet presentation (prototype is a 430px phone column), N-ary answers (structure wanted, scoring undefined), stage assignment per test (owner said they decide at deploy time), share/vote backend + privacy semantics + per-question OG, result-page content and post-submit transition (owner deferred), history/blog/menu/settings/consent-banner visuals (not in prototype), content defects (qmbti Q6 inverted poles, false English consent sentence, placeholder questions, energy-check's real scoring model).
5. **Result page / OG today:** the result *address* exists (`/{locale}/result/{variant}/{type}?{base64}`) and renders only the `derived_type` token; content sections, dynamic OG, and history-entry linking are explicitly "next phase" (`mobile-refactor-analysis.md` §15 #8/#9). The prototype also keeps the result page out of scope (`BRIEF2` rule 8) and adds in-test question sharing with friend voting, end-of-test palette/path share art, and a friend landing page (`v-vote.html`).
6. **Proposed SSOT set (§8): seven documents, one concern each** — Domain (test semantics), Platform (routes/i18n/rendering/SEO/perf), Privacy & Telemetry (consent/events/storage/analytics), Content Pipeline (Sheets/registry/validation), Experience (shell + stages + window + motion + a11y interaction, from the prototype), Sharing (links/votes/OG/9:16), plus the Design System bundle (`docs/design/`) re-synced one-way to Claude Design. Old documents become reference-only; the blocker registry is rebuilt with per-spec IDs (the current one merges two colliding numbering spaces).

---

## 2. What the prototype decided (owner verbatim)

### 2.1 Rebuild mandate (this session's user request)

> "이번 프로토타이핑 결과에 따라 확정된 방향으로 이 저장소를 원점에서부터 다시 쌓아올리고 싶습니다."

### 2.2 Round 1 (2026-09-24, phone + desktop preview, dark) — `dialog.md:379–693`

| Topic | Owner (verbatim) | Contract consequence |
|:---|:---|:---|
| First screen | "테스트를 먼저 고르는 것. 사용자 의향을 묻지 않고 질문을 하는건 바람직하지 않음" | Keeps REQ-F-001 "entry only after choosing a test" (A). |
| Swipe | "랜딩에서 테스트 단위로 좌우 스와이프하면서 브라우징하고, 문항 선택은 탭으로 하는 것이 더 자연스럽습니다." | Horizontal browse deck (B, new); swipe never answers. |
| Dot navigation | "점을 누르는 인터랙션은 (1) 모바일에서 탭 영역 최소 크기 확보 불가로 부적절하고 (2) 누른다고 하더라도 어떤 컨텐츠인지 어포던스나 힌트가 전혀 없어 쓸모없습니다." | a11y floor 44px (A-a11y); no dots (B). |
| Living background | "배경색 흐름 자연스러웠고, 분위기를 잘 살렸으며 읽기를 방해하지 않았습니다." | Overturns `req-landing.md` §1.3 "배경 동적 연출 강도 0" (B). |
| Drag-to-close | "드래그는 UX 상 사용자 주의와 노력을 많이 필요로하는 인터랙션이므로 가급적 피하고, 여기서는 바깥 영역 탭으로 닫히는 인터랙션만으로 충분합니다." | Overturns BQ-43(A) swipe-down close (B). |
| New toys in test | "테스트 과정에서는 문항 답변에 더 집중해야하고, 이 안 처럼 테스트 문항 선택 외 다른 요소에 인터랙션, 모션 적용은 금지합니다. (배경 색 등 효과 적용은 허용, 다른 인터랙티브 요소를 이 안처럼 새로 만들어 추가하는 것만 금지)" | Experience principle (new spec). |
| Share | "지금처럼 이미지 공유보다는 동적인 페이지로 공유하는 방식을 1순위로 고려했지만 … 릴스, 인스타그램 스토리 등 공유를 고려하면 제안한 카드 형태도 적절해보입니다." · "내가 답하기 어려운 질문을 올려 다른 사람들이 대신 A/B 투표해주기" · "테스트 도중에도 자연스럽고 꼭 필요합니다. 단, 공유 전/후 테스트 이탈되지 않도록 훨씬 더 정교한 UX/UI/트랜지션 설계가 필요합니다." | New feature: in-test ask-a-friend link (1st) + 9:16 card (2nd). Overturns `req-test.md` §1.3 "Share CTA 이번 단계 미구현" (C for backend). |
| Revisit defect | "이전 문항으로 돌아가 선택지 탭하면 돌아가서 응답한 문항부터 마지막 응답한 문항까지 그냥 진행해서 중간 문항 답변을 변경할 수 없는 결함이 있습니다." | Root of the §4.3 change (round 2 confirms). |
| After submit | "마지막 제출 이후 트랜지션은 지금의 형태는 마음에 안드는데, 구체적인 피드백은 테스트 플로우 최종 확정 후, 결과 페이지까지 이어지는 부분의 피드백을 추가로 나중에 제공하겠습니다." | Result/after-submit is open (C, deferred by owner). |
| Must keep | "쉽게 테스트 브라우징 하고, 선택한 테스트로 진입해서 테스트를 하고, 그 과정에서 흥미를 유발하는 현란하고 창의적인 UX와 모션 제공하면서 동시에 직관성도 갖춰야 함" · tone "3 ~ 5 수준" | Motion bans in `design.md` lifted (B). |
| Result page | "Test Result 페이지는 아직 고려하지 않아도 됩니다." (midpoint answer, quoted in the session summary `dialog.md:11`) | Result UI out of prototype scope. |

### 2.3 Round 2 (2026-09-25, desktop preview, dark) — `dialog.md:1166–1304`

| Topic | Owner (verbatim) | Consequence |
|:---|:---|:---|
| Opening method | "펼치기가 미세하게 더 낫습니다. 왜냐하면 안에 질문과 선택지 텍스트가 길어질 경우 표현할 공간이 넉넉하고 여유있기 때문입니다." | Card expands in place ("펼치기") — basis of the window. |
| Return continuity | "가급적 정보들이 유지된 채로 사라지거나 하는 식으로 화면의 연속성이 효과/트랜지션 통해 표현되는게 좋겠습니다." | Transition grammar (B). |
| Visual consistency | "Q1 에서 펼쳐진 카드에서 응답 선택은 흰색 round box 에 선택지가 있습니다. 반면 Q2 이후 반반화면에서는 드래그를 하는 `질문` 이 흰색 round box 에 표시되어 양쪽이 정 반대의 요소에 적용됩니다." | "White surface = tap to answer" rule (B). |
| Progress | "팔레트형이 압도적으로 훨씬 더 낫습니다. 왜냐하면 정보 요소가 bar, % 진행 으로 단순하기 때문입니다." | Palette rail; bar+% semantics of §4.3 kept (A), look B. |
| Title | "제목은 제일 위 "ViveTest" 우측 빈 영역에 center align 으로 표시해주세요." | Test top bar (B). |
| One step at a time | "이전 문항으로 돌아가면 한 문항씩 순차 이동해야합니다." | §4.3 change. |
| D swipe | "좌우로 끌 수 있다는 affordance 가 전혀 없어 예측하지 못하고 사용하지 못했습니다." | D gets side-peek cards + locked card (B). |
| Votes | "질문 아래 모이는 친구 투표 표시는? > 있어야 한다" | Vote line under question (Sharing spec). |
| Combination | "I 팔레트형 채택 / J 위 피드백 반영해서 한 가지로 보유 / D 안은 모션 제거 시 폴백으로 채택" | Three stages. |
| **Contract change** | "되돌아가 고치면 한 문항씩 나아가는 방식으로 제품 계약을 바꿀까요? > 되돌아간 문항부터 한 단계식 이동" | **Explicit owner decision** overturning `req-test.md` §4.3 destination rule. |
| Consistency ask | "한 웹사이트 안에 I, J, D 모두 유지한다고 가정할 때 어떻게 해야 모두 한 서비스라고 느껴질 수 있도록 일관성을 갖출 수 있을지 고민해서 모든 안의 일관성 관점 개선도 함께 적용해주세요." | Shared shell. |

### 2.4 Round 3 (2026-09-25, desktop preview, dark) — `dialog.md:2100–2205`

| Topic | Owner (verbatim) | Consequence |
|:---|:---|:---|
| One service | "네, 이제 모두 한 서비스로 느껴집니다. 특히 Q1 프리뷰 질문의 UI 와 인터랙션이 이후에 일관되게 이어지는 점이 아주 마음에 듭니다." | Window architecture adopted. |
| Stage assignment | "동의합니다. 단, 어떤 테스트에 어떤 무대를 적용할지는 최종 배포 시점에 다시 한번 고민하고 결정하고 이번에는 목업 최종 완성을 위한 최종 피드백으로 고려해주세요." · "완성된 후에는 각 테스트 별로 어떤 타입을 적용할지를 사전에 정의하겠습니다." | Stage per test is owner data, decided later (C). |
| Instruction modal | "시작 전 안내 하단 바텀 시트는 화면 위를 덮는 모달 팝업/시트 형태로 변경되는게 더 바람직해보입니다. (모든 안 공통) 왜냐하면 이 메시지와 [시작] 버튼은 Q2 진입 전 필수로 해야하는 아주 중요한 고지의 메시지도 담고 있는데 (요구사항 참고, consent 미선택 Q1 진입 시 고지 함께 하고 있음) 이를 고려하면 optional 해보이는 바텀시트보다 화면을 좀 더 많이 덮는 UI 가 더 바람직합니다." | Overturns `req-landing.md` §13.5 "Mobile: 모달 바텀시트" and analysis §15 #5 (B); consent matrix kept (A). |
| Multi-choice | "나중에 3지선다, 4지선다 응답형 테스트도 있을 수 있습니다. 필수는 아니지만, 이 때 활용 가능하도록 유연한 구조가 되거나 혹은 더 이상적으로는 3지/4지선다 유형에 적용 시 화면도 목업으로 제작되어 볼 수 있으면 좋겠습니다." | Conflicts with binary model (C). |
| J 이전 | "길 중앙으로 이동에 배치되도록 수정하고, 이 때 3D 경로 진행하면서 길이 바뀌는 위치 변화에 맞춰 [이전] 버튼 위치도 동적으로 이동하면 더할나위 없이 좋겠습니다." | Stage-specific (B). |
| J style | "다른 안과 이 서비스 내에서 공존한다고 가정할 때 같은 서비스로 흡수된 것 처럼 보이도록 이 안의 시각적 스타일만 조금 더 고민해주세요." | Final J uses the landing card palette world (still in progress). |
| D progress | "Vertical Bar 는 이 안에서는 안어울립니다. 기존처럼 상단 edge 부분에 horizontal bar 가 더 적합합니다. Vertical Bar 는 갈림길과 1:1 분할 반반화면에 잘 어울리는 Progress Bar UI 입니다." | Two progress presentations (B). |
| All three | "각각의 안이 모두 마음에 들어서 3개안 (반반화면, 갈림길, 스토리) 모두 이 서비스 안에서 사용하겠습니다." | Stages I/J/D all in product. |
| Verdict | "이번 턴에서는 아주 마이너한 수정사항만 반영해 최종 채택" | Direction final; minor polish only. |

### 2.5 The prototype's system as built (final revision)

- **Shell** (`MOCK/shared/shell.js:1–70`, `shell.css:1–20`): top bar = `ViveTest` chip left · test title centred · ask-a-friend right; palette rail on the right edge (I, J) or story bar on the top edge (D, `rail: 'x'`) as the only progress; `이전` pill bottom-centre (J: follows the road centre via `placePrev(x)`), `제출` beside it on the last question (J: spatial gate); one instruction component = **centred modal dialog** (focus on dialog, Tab trapped, Esc no-op on instruction step, Back on qualifier step), consent note + CTA set per `req-landing §13.5`, egtt = `[다음]` then qualifier step; A–D badge on every answer; previous-choice mark; vote line; per-test signature colour `TEST_COLORS` + card palette `LOOK`; motion tokens `--vt-ease-out cubic-bezier(0.2,0.9,0.25,1)`, `--vt-dur-enter 560ms`, `--vt-dur-exit 260ms`, `--vt-dur-flood 700ms`.
- **Window** (`BRIEF3.md` §The window; `l3-deck.html:1232–1237` realBuild): the expanded landing card hosts the stage; the stage draws Q1; answering Q1 grows the window to full screen (no page change), then the instruction modal opens over Q2; the wordmark shrinks the stage back into its card with content visible. Product mapping proposed by the prototype: "앱 셸 하나에 테스트 라우트를 층으로 그리기 … Next 의 parallel + intercepting route, 예: @window/(.)test/[variant]"; "Q1 답 = §8.6 전환 시작 … landing ingress 저장(req-landing §13.4)은 그대로 … 다 커진 순간을 destination-ready 로 봐요(§13.3 의 1600ms 안)"; "/test/{variant} 로 바로 들어오면 전체 모드로 시작해요".
- **Stage assignment** (`shell.js` `stageFor`): override > reduced motion → D > default map (qmbti·egtt → I, energy-check → J); J holds two-answer questions only (a 3–4-answer test resolving to J opens in I).
- **N-ary answers** (`content.js` `demoTests`, `i3-split.html:1333–1341`): I and D render 2–4 answers from the data (`keysOf`), share/vote pages list A–D; demo tests are marked 예시 and are not product data.
- **Share** (`share.js:1–22`, `v-vote.html:223–227`): kinds `ask` (current question, friends vote), `path` (J route art), `palette` (I colours); link first, 9:16 card second; sheet never advances the test; votes shown under the question; friend page "투표 → 나도 해 보기". Build needs: "공유 링크마다 서버에 투표함이 필요해요 — 익명 집계, 중복 투표 방지, 만료 기간" · "링크 미리보기(OG) 이미지를 질문마다 만들려면 서버 이미지 생성이 필요하고, 그 전에 next/og 의 보안 결함을 고친 버전으로 올려야 해요" · "카카오톡·인스타그램 인앱 브라우저에서도 이 페이지가 그대로 열려야 해요 — 로그인 없이, 가벼운 한 화면으로".
- **Phone column only.** `MOCK/shared/tokens.css:61` `--app-w: min(100vw, 430px)`; every fixed layer uses `--app-left/--app-w`. There is no desktop/tablet layout; the owner reviewed rounds 2–3 in "데스크톱 미리보기" of that column.
- **Out of prototype scope** (`l3-deck.html` simulated list; `BRIEF.md` product facts): result page ("결과 화면은 이번 목업 범위 밖이에요"), blog detail, menu/drawer, privacy settings, history, landing consent banner, locale/theme controls.
- **Prototype's own list of product-contract collisions** (`_hub-body.html`, "제품 계약과 부딪히는 곳"): window structure → rewrite `req-landing-interaction` §8; instruction = centred modal → revise `req-landing §13.5`; stage assignment + reduced motion → story is "새 제품 결정이자 접근성 계약"; 3–4 answers → `req-test §4` "채점 문항은 정확히 2개의 선택지(poleA/poleB)", preview shape `answerChoiceA/B`, A/B pre-answer and telemetry are all binary; advance-one → `req-test §4.3`; in-test share/votes → vote server, share events, per-question link preview (Next ≥ 16.3.6); visual: phone sheet/1-column → deck + window; "배경 애니메이션 0 (req-landing §1.3) → 살아 있는 색 배경"; `design.md` spring/parallax/autoplay bans; two progress presentations and per-stage `이전` placement; per-test colour system vs single sage accent.

---

## 3. Section-by-section classification

### 3.1 `docs/requirements.md` (declared background, not SSOT — `requirements.md:3–8`)

| Section | Class | Note |
|:---|:---|:---|
| §1 Overview / goals | A | Anonymous short assessments, schema-driven result label (1/2/4 letters), shareable/revisitable without account. |
| §1 Content & localization principles | A | Sheets-sourced content, `scoring1` preview, resolver-only consumers, i18n for chrome, SSR `<html lang>`. |
| §1 Confirmed policy alignment | A | Three spreadsheets, `seq` classification, canonical index vs scoring order vs Q label, restart intent, qualifier in instruction overlay, `instructionSeen` triggers. |
| §2 Roles | A | End user anonymous; admin/ops roles are future. |
| §3 Journeys 1 (browse/enter) | A/B | "entry … only via an explicit CTA in the card's expanded/back state" survives semantically; the "back state" picture is superseded by the window. |
| §3 Journeys 2–5, edge journeys | A | Happy path, shared result, history, admin sync; invalid variant → recovery page. |
| REQ-F-001 catalog & availability | A/B | Enterable vs unavailable, no entry CTA on front face (prototype's "첫 질문 보기" expands, it does not enter — compatible). |
| REQ-F-002 variant validation & recovery | A | Up to 2 incomplete cards; 0 → landing CTA. |
| REQ-F-003 instruction gate | A | Consent resolved inside instruction; qualifier inside instruction. |
| REQ-F-004 session continuity | A | 30-min inactivity evaluated at re-entry. |
| REQ-F-005 binary question model | **C** | "Each question must provide exactly two answer options" vs owner's 3/4-answer wish (§5 C-2). |
| REQ-F-005A single-axis per scoring question | A (C if N-ary) | Holds for binary; undefined for N-ary. |
| REQ-F-006 progress & completion gating | A | answered scoring / total scoring. |
| REQ-F-007 / 007A derivation, axis model | A | Schema-driven, `axisCount ∈ {1,2,4}`, odd count per axis. |
| REQ-F-008 scoring schema per variant | A | Code-owned registry, no Schema.xlsx. |
| REQ-F-008A/B/C registry boundary, meta keys, preview migration | A | `previewQuestion/answerChoiceA/answerChoiceB` shape (binary — see C-2), meta keys `durationM/sharedC/engagedC`, `seq → sort → drop`. |
| REQ-F-009 result content rendering | A (deferred) | Mandatory sections + fallback; content schema is Phase 9 / next phase. |
| REQ-F-010 shareable self-contained result URL | A | `/result/{variant}/{type}?{base64}`, payload = `scoreStats` + `shared`; optional nickname opt-in. |
| REQ-F-011 nickname | A (deferred) | 15 chars, allowlist, never in telemetry; not implemented. |
| REQ-F-012 history persistence | **C** | Says entries carry share URL, delete one / clear all; `req-test.md` §8.4 (newer) says list-only, no URL, no delete (§5 C-9). |
| REQ-F-013 history integrity | A | Malformed entries skipped. |
| REQ-F-014/015 tracking ingestion & resilience | A | Single+batch, PII rejection, UTC timestamps, degrade gracefully. |
| REQ-F-016 event taxonomy | A | Minimum set + internal signals excluded + reserved `share_clicked`, `share_copied`, `instruction_view`… (sharing will activate reserved events). |
| REQ-F-017 retention | A (open) | Default TBD — unresolved since inception. |
| REQ-F-018/019 admin analytics & access | A (future) | Not implemented; out of rebuild v1 unless owner says. |
| REQ-F-020 spreadsheet sync | A | No partial activation, last-known-good; implemented as GitHub Action. |
| REQ-F-021–025 error UX, data load, share parse safety, history tolerance, sync status | A | 025 (sync status endpoint) is superseded in practice by the Action (no API). |
| REQ-F-026 localization split | A | UI i18n vs Sheets content columns. |
| REQ-F-027 entry gating (device-aware) | B | "first touch = expand only" survives as the window's first tap; device split is D. |
| REQ-F-028 instant-start first question | A | Landing answer = `scoring1`. |
| REQ-F-029 front/back title consistency | A/B | Title mismatch = data error (A); "back" picture superseded. |
| REQ-F-030 unavailable item | A/B | Visible, non-enterable (A); visual (B). |
| REQ-F-031 transition lock | B | Window model changes it. |
| REQ-F-032 return scroll restoration | B | Window keeps landing mounted; return = "same card" (prototype `Flow.backToLanding(testId,color)`). |
| REQ-F-033 keyboard CTA access | A-a11y | Keyboard reaches answers; front face never navigates. |
| REQ-F-034 desktop single-card lock | D | Desktop hover grid. |
| REQ-F-035 mobile scroll lock during back state | B | Window. |
| REQ-F-036 GNB swap timing | B/D | Ghost GNB disappears with the window (landing never unmounts). |
| §5 Conceptual data model | A | Needs additions: stage, test colour, N-ary answers, share/vote records. |
| §6 Assumptions | A | Anonymous use, device-local history, retention unverified. |
| §7 Traceability appendix | D | Historical. |

### 3.2 `docs/req-landing.md` ("무엇이 결과로 남는가")

| Section | Class | Note |
|:---|:---|:---|
| Preamble (split with interaction doc, user decision 6) | A (principle) | Keep the behaviour/interaction split principle; the new Experience spec plays the interaction role. |
| §1.1 Scope V1 | D | Wave-era scope. |
| §1.2 Non-goals | D | "배경 동적 연출" non-goal reversed by the owner. |
| §1.3 Locked decisions (Version B, background animation 0, tilt off) | **B** | Owner: "배경색 흐름 자연스러웠고, 분위기를 잘 살렸으며 …". |
| §2 Terms | A (mostly) | Card types 5 (A), ingress flag, runtime entry commit, question index, CTA action identity (A); Normal/Expanded/Card Shell/Row Baseline/Handoff/Hover-capable (B/D). |
| §3.1 Priority chain | D | Replace with new doc precedence. |
| §3.2 Single-change sync lists | D | Tied to old section layout. |
| §3.3/§3.3.1 Ambiguity registry (AR-001 terminal timing, AR-002 empty tags) | A / D | AR-001 (complete only after destination-ready) survives if the transition model keeps terminals; AR-002 D. |
| §4.1 Invariants 1–4 (single locale prefix, root vs locale layout, pages under `[locale]`) | A | #5 (no crop in Expanded) B. |
| §5.1 Layout responsibility split | A | Root layout = document + request-scoped lang only. |
| §5.2 Locale prefix policy | A | Exactly one `/{locale}` segment. |
| §5.3 proxy single entry + locale resolution | A | Cookie → Accept-Language → default; locale-less allowlist `/blog`, `/blog/[variant]`, `/history`, `/test/[variant]`; duplicate prefix → global 404; BCP 47 aliases redirect; display `html lang` tags. Needs new routes added to allowlist (vote page). |
| §5.4 typed routes & RouteBuilder; blog list/detail rules | A | Blog detail invalid/non-enterable → blog index. |
| §5.5 404 two layers | A | Plus AGENTS §1 rule: never resolve 404 inside `[locale]`. |
| §6.1 container & breakpoints | B/D | Phone column replaces. |
| §6.2 grid composition | D | Desktop multi-column rules. |
| §6.3 hero | D | Hero removed already (register 2026-09-16 unit 7). |
| §6.4 GNB contract | B0/B/D | Desktop settings layer (D); mobile drawer order, `100dvh`, focus trap, system back closes (B0 — not in prototype); Mobile Test "Back + 화면 이름 + Timer" (B — prototype top bar = ViveTest · title · ask-a-friend, no timer); theme `System/dark/light` + localStorage (A-ish preference semantics); language chips 12 with `lang` (A-a11y). |
| §6.5 card slot order | B | Poster deck; the rule "Test entry only from answers" is A. |
| §6.6 text & clamp | B | Keep i18n pressure lessons (12 locales, no truncation of answers) as A-a11y. |
| §6.7 card height & spacing | D | Grid geometry. |
| §6.8 thumbnail & expanded slots | B / A | Meta runtime keys `durationM/sharedC/engagedC`, no `k/m` abbreviation + locale number format (A); visuals B. Prototype shows only minutes + completed count. |
| §6.9 theme & dark coverage | A | Dark on all pages; prototype supports both. |
| §7.1–§7.7 state model, HOVER_LOCK, keyboard sequential expansion | D (7.1–7.5, 7.7), A-a11y (7.6-a) | §7.6-a survives: keyboard is an independent axis, `Escape` closes any expansion, deterministic order, skip link, tab order = document order. |
| §8 (moved) | — | See 3.3. |
| §9.1 keyboard & focus | A-a11y | Visible focus, `aria-label` on icon buttons, no focus trap inside cards (window may be modal — revisit). |
| §9.2 disabled semantics | A-a11y | Semantic `<button>/<a>` triggers, unavailable = `aria-disabled` not `disabled`, stable accessible names. |
| §9.3 coming-soon readability | A-a11y / B | AT-exposed coming-soon, full-opacity title. |
| §10.2 GNB by context | B | Pointer to §6.4. |
| §11.1 SSR/hydration determinism | A | No `window/storage/Date/Math.random` in initial render; consent `UNKNOWN` neutral; hydration warnings block release. |
| §11.2/11.3 (moved) | — | See 3.3. |
| §11.4 transfer & timing budget | A (numbers to re-measure) | Font 200 KB latin / 420 KB CJK, LCP image not lazy, theme bootstrap inline, CLS < 0.05. Prototype adds a WebGL/CSS living field and canvas stages → new budget needed (§5 C-12). |
| §12.1 logging scope & V1 events | A | Network send only when `OPTED_IN`; events `landing_view`, `card_answered`, `attempt_start`, `question_answered`, `final_submit`, `result_viewed`; internal `transition_*` never sent. |
| §12.2 required fields | A (binary codes C) | Common fields; `card_answered` fields; `attempt_start` canonical index; `final_submit` fields; `'A'|'B'` codes (C-2). |
| §12.3 payload boundaries | A | No raw text/PII; validator rejects legacy fields. |
| §12.4 consent state machine | A | `UNKNOWN → OPTED_IN | OPTED_OUT`; opt-out invalidates IDs and drops queue; Vercel Analytics/Speed Insights gated by same source. |
| §12.5 anonymous ID | A | `randomUUID → getRandomValues`, no weak fallback. |
| §12.6 data source contract | A | Generated registry + resolvers; fixture minimums. |
| §12.7 consent UI (bottom banner, 2 buttons, line budget, 3 recall paths) | **B0** | Not in prototype (landing banner and settings are out of mockup scope). Semantics (recall re-opens same UI, close does not change choice, notice row) are A; the banner look must be re-skinned or re-decided (§5 C-8). |
| §13.1 missing slot | D | Tag slot rules. |
| §13.2 unavailable UX | A/B | No expand/CTA/transition (A); tag-row visual (B). Prototype: tap shows toast "출시 예정이에요" — minor divergence from BQ-10 "no tap". |
| §13.3 landing → destination handshake | A/B | Terminal exclusivity `complete|fail|cancel` ×1, rollback set, 1600 ms timeout, duplicate-locale no-op (A if a transition concept remains); scroll/input lock, frozen card, GNB swap (B — window). |
| §13.4 `scoring1` pre-answer & start rule | A | Save provisional pre-answer + ingress flag + `createdAtMs`; bind at runtime entry commit; restart intent; 7-min expiry = future. |
| §13.5 instruction contract | A (matrix) / B (form) | Desktop centred card / Mobile modal bottom sheet → **centred modal for all** (owner round 3). Ingress × consent × attribute matrix, CTA identities, `instructionSeen` recording, test route renders no consent banner — A, reused verbatim by the prototype. |
| §13.6 pre-answer lifecycle / rollback | A | Read/consume split; consume at commit; rollback on fail/cancel. |
| §13.7 dwell time | A | Foreground+background elapsed, accumulated on revisit. |
| §13.8 return restoration (`scrollY`) | B | Window keeps the landing mounted; return target becomes the same card. |
| §13.9 opt-out card contract | A | Visibility matrix (Disagree hides `available`, keeps `opt_out` + `unavailable`), deep-link warning branch; OPTED_OUT notice row semantics A, look B0. |
| §14.1 release gate (`qa:gate` 3/3) | A (process) | Keep the idea; commands will be re-defined. |
| §14.2 QA matrix 30 items | mixed | Items 1, 2, 6 (domain half), 9, 15, 16, 18, 20–23 are A; 3, 4, 5 (desktop), 7, 10–14, 24–30 are B/D. |
| §14.3 traceability closure | A (process) | Rebuild with per-spec IDs. |
| §14.4 visual-redesign preservation contract | A/B | Its list is essentially the domain set that must survive (enterable = `available|opt_out`, catalog filtering, preview = first scoring question, Test transition creates ingress + `card_answered`, Blog does not, consent-gated analytics, semantic a11y guards) — use it as a checklist; "GNB context control set" is B. |
| §15 EX-001 global-not-found | A (version-bound) | `experimental.globalNotFound`; note says 16.1.6 — repo is 16.2.4 (stale). |
| §15 EX-002 no send under UNKNOWN/OPTED_OUT | A | "strictly-necessary server aggregation only" — relevant to votes (§5 C-5). |
| §15 EX-003 request-scoped `html lang` | A | Locale header from proxy is the only input. |

### 3.3 `docs/req-landing-interaction.md` ("어떻게 조작하고 움직이는가")

| Section | Class | Note |
|:---|:---|:---|
| §0.1 one-line test ("방법이 둘 이상이면 인터랙션") | A (principle) | Keep for the new Experience spec. |
| §0.2 precedence (behaviour wins) | A (principle) | Keep. |
| §0.3 three axes (layout / input / keyboard) | A (principle) | Keyboard independent axis survives; layout/input axes need redefinition for a phone-column product (C-1). |
| §8.1 capability gate | D | Hover-capable mode. |
| §8.2 desktop/tablet expanded trigger (hover intent 160 ms, collapse 140 ms, scroll hold) | D | Desktop hover. |
| §8.3 core motion (phases 280 ms, stagger, ease-in-out only, **spring/overshoot banned**) | B | Prototype uses spring curves (`l3-deck.html:37–38` `--spring: cubic-bezier(.2,1.32,.32,1)`) and its own shell timing tokens. |
| §8.4 expanded shell scale 1.04/1.10 | D | Desktop overlay. |
| §8.5 mobile expanded = bottom sheet, five close paths incl. swipe-down, 260/220 ms | B | Replaced by the window; owner rejected drag-to-close. Keeps as A-a11y: `Escape` closes, system back closes overlays without leaving the page, focus returns to trigger, reduced motion keeps fades. |
| §8.6 transition start trigger | A/B | "Test entry = selecting an answer; CTA beats close" (A); destination-ready definitions (A if transitions remain); blog = whole-card link (A). |
| §11.2 animation guardrails | A (principle) | transform/opacity-centred, no runtime exceptions under rapid input. |
| §11.3 reduced motion / low-spec census, touch defaults (`overscroll-behavior-y`, `touch-action: manipulation`), press feedback | A-a11y / B | Reduced motion = no movement, fades remain (A); prototype adds "reduced motion → story stage D" (B, owner decision). Touch defaults and press feedback are good carry-overs. |

### 3.4 `docs/req-test.md` (Test Flow Requirements)

| Section | Class | Note |
|:---|:---|:---|
| §1.1 scope | A | Runtime + result derivation. |
| §1.2 non-goals | A/D | Some reversed later (history, share). |
| §1.3 locked decisions table | A (one C) | Entry paths, schema-driven scoring, answer revision retention, 7-min staged expiry (future), result URL structure/encoding, `shared` flag, 5 s min loading, 30 min inactivity, volatility; "Share CTA 이번 단계 미구현" → reversed by the owner's share decision (Sharing spec). "instruction is an overlay on `/test/{variant}`, never a route" — A (still true in the window model). |
| §1.4 runtime status snapshot | D | Status text; regenerate from code. |
| §2.1–§2.9 data source & sync | A | Three spreadsheets, `sheet name = variantId`, `q.*` = profile, locale column mapping, deployment pipeline, 3-source validation (production still 2-source), runtime fallback (`hide` downgrade vs entry block), lazy per-variant validation, in-progress session protection, fixture policy, preview migration done, qualifier re-entry implementation note. |
| §3.1 core entities | A | Attempt vs `attempt_start`, staged entry, active run, response set, canonical index, scoring order, Q label, ingress flag, eligibility, derivation attempt, completed run, scoreStats, derivedType, question type, profile question, qualifier, type segment, `QualifierFieldSpec`, self-contained payload, error kinds. |
| §3.2 variant resolution | A | Validate every input; failure → recovery page; no session created. |
| §3.3 entry path classification | A | Landing Ingress / Direct Cold / Direct Resume and invariants. |
| §3.4 runtime entry commit | A | Commit is a domain event (bind, seed, replace, activate). |
| §3.5 staged entry | A | 7-min expiry target/future. |
| §3.6 instruction gate | A (form B) | Overlay is `role=dialog aria-modal`, focus to container, Tab cycles, `Esc` writes nothing and is a no-op on the instruction step (BQ-41), qualifier CTA table, qualifier steps, re-entry, `instructionSeen` lifecycle — all A and reused by the prototype modal. |
| §3.7 session/run lifecycle | A | 30 min; Strict-Mode replay idempotence; raw qualifier tokens preserved. |
| §3.8 question model | **A with C** | Exactly two options per scoring question with `poleA/poleB` (C-2 for N-ary). Profile question rules, canonical ordering, response codes. |
| §3.9 progress / revision / answer retention | A with **B-decided change** | Retention ("no move and no change removes another answer", residue-only invalidation) and the previous-answer mark survive. **Navigation contract "응답 확정 후 이동 목적지는 첫 미응답 scoring question" is overturned** by the owner: advance exactly one question. |
| §3.10 result-entry eligibility | A | Logical, not positional. |
| §3.11 derivation model | A (C for N-ary) | `binary_majority`, odd count, bidirectional matching, qualifier concatenation, EGTT example; `scale` reserved. N-ary answers have no scoring mode (C-2). |
| §3.12 result rendering (sections) | A (deferred) | Mandatory `derived_type`, `axis_chart`, `type_desc`; optional `trait_list`; content schema not defined. |
| §4.1 instruction → start | A | Seeded answer kept; qualifier step between instruction and runtime. |
| §4.2 landing ingress + restart intent | A | Fresh response set seeded with one answer on commit. |
| §4.3 question runtime | **A with B-decided change** | Auto-advance, 150 ms lock (tap feedback = selected during lock), no `다음`, revisited = both unselected + previous mark, bar + % and never "N of M" — A. "즉시 다음 미응답 scoring question으로 이동 … 미응답이 없으면 마지막" — **replaced** by "advance exactly one". Prototype adds J arrival guard (350 ms after signs appear) — implementation detail, see C-11. |
| §4.4 final question screen | A | No auto-advance; stays selected; `제출` enabled (J: spatial gate). |
| §4.5 completion → eligibility | A | "결과 보기" is a separate action (target). |
| §4.6 result derivation loading (≥ 5 s) | A (deferred, **C**) | Never implemented; current live flow `router.replace`s immediately. Owner wants to give result-transition feedback later — keep as target or drop (C-6). |
| §4.7 back-from-loading | A (deferred) | Tied to §4.6. |
| §5.1 self-contained payload | A | Fully specified; implemented (`src/app/[locale]/result/[variant]/[type]/page.tsx`). |
| §5.2 result case matrix (own/shared/invalid; `replace` not `push`) | A | CTA semantics 다시하기 / 나도 테스트하기. Case 3 needs history link (AR-006). |
| §6.1 invalid variant recovery page | A | 12-locale copy, `?variant=` kept but not shown, ≥ 1 forward path, never `notFound()` inside `[locale]`, up to 2 incomplete cards (implemented 2026-09-19, commit `5818f73`). |
| §6.2 blocking data errors | A | Full reason list. |
| §6.3 invalid result payload | A | Ten failure branches, "no partial render" by structure (`resolveResultView`). |
| §6.4 result content fallback | A (deferred) | |
| §6.5 recoverable error UX table | A | |
| §6.6 commit-failure | A (target) | |
| §6.7 derivation-failure | A (target) | |
| §6.8 volatility | A | Result-commit trigger still not wired (see §9 finding 1). |
| §6.9 restoration/continuity | A | |
| §7.1 result sections | A (deferred) | Placeholder only. |
| §8.1 terminal exclusivity | A (target) | |
| §8.2 state hygiene / safe storage | A | Storage writes never throw (`src/lib/safe-storage.ts`), degraded mode. |
| §8.3 cleanup set | A | |
| §8.4 local run history (list only) | A (C vs REQ-F-012) | `test:runHistory`, `{variantId, startedAtMs, completedAtMs}`, abandoned computed at read, max 50, not in cleanup set, no row actions. |
| §9.1/§9.2 telemetry | A | Hook positions, per-event index meaning, transport-patch session model, `result_viewed` IO target. |
| §10 AR-001…007 | A | All still valid decisions (AR-006 temporary). |
| §11 single-change sync table | D | Old layout. |
| §12.1–§12.3 release gate & 30 checks | A (content) / D (numbering) | Checks 1–30 are domain assertions; re-key them per new spec. |

### 3.5 `docs/req-test-plan.md`

| Part | Class | Note |
|:---|:---|:---|
| Phases 0–11 summary, Gates A/B/C, SD-1/SD-2 | D (history) / reference | Implementation plan of the old build. |
| ADR-A (`src/features/test/domain` public surface, branded `VariantId`/`QuestionIndex`, `validateVariant` union) | A | Frozen domain signatures worth keeping (`project-analysis.md` §5.5.1). |
| ADR-B storage topology (`test:{variant}:…`, 5 flags) | A | |
| ADR-C Sheets SA + env names; ADR-D generated file versioned; ADR-F attribute filtering in landing resolver | A | |
| ADR-E representative variants | A (QA) | `qmbti` available, `energy-check` opt-out. |

### 3.6 `docs/project-analysis.md`

Class: reference-only for the rebuild. It is an as-built description, several claims are stale at HEAD `20f973a`: "6 namespaces" (actual 8: `meta, gnb, landing, test, blog, history, error, consent`), "`motion@12.34.0` is used" (absent from `package.json`), "placeholder history page shell", "`response-projection.ts` has no exports" (implemented 2026-09-16 per `docs/plans/2026-05-17-result-pipeline-todos.md` §6), `/test/error` "stub". Keep §4 (routes/proxy/locales), §5.3 (catalog data model), §5.5.1 (frozen domain interfaces), §5.6 (telemetry surface), §6 (storage keys) as inputs to the new Platform, Domain and Privacy specs after re-verification.

### 3.7 `docs/agent-guides/project-rules.md`

| Section | Class | Note |
|:---|:---|:---|
| Ownership table | D/rewrite | Tied to old tree. |
| Architecture/routing/locale | A | proxy single entry, RouteBuilder, pages under `[locale]`. |
| Variant registry boundary | A | |
| Test flow/domain/storage | A | Frozen ADR signatures, instruction copy ownership split, storage key SSOT. |
| Blog/telemetry/theme/QA | A/D | "Preferences button no-op" is stale (removed by BQ-46); "`motion` imported in test-question-client" stale. |
| Visual/design system | B/rewrite | "Do not apply design.md global tokens before Wave 16" is stale (theme cut done 2026-09-07). |
| Unimplemented/stub list | D | Stale in parts (result URL is live). |

### 3.8 `docs/blocker-traceability.json`

Class: D as a structure, A as a source of assertion ideas. 67 entries (`kind`, `file`, `assertionId`), blockers 1–30. **The registry merges two numbering spaces that collide**: blockers 7, 11, 12 hold both landing §14.2 items (mobile menu overlay B7, row consistency B11, underfilled row B12) and req-test §12.2 items (question model integrity `assertion:B7-question-model-integrity`, derivation correctness `assertion:B11-derivation-correctness`, odd-count `assertion:B12-odd-count-validation`); similarly blocker 5 mixes `B5-keyboard-sequential` with `B5-active-run-timeout-boundary-unit`. Several entries point at documents instead of tests (`docs/req-test.md` for B24–B30, `docs/req-test-plan.md` for B17 phase 10). Recommendation: rebuild traceability keyed by new spec IDs.

### 3.9 `docs/wave-roadmap.md`

Class: D. Waves 1–12 done, 13–17 superseded by BQ-38, programme closed 2026-09-11 (`wave-roadmap.md:479–497`). "Last reconciled: HEAD 5a1da0f / 2026-07-03". Nothing to carry except as history.

### 3.10 Contract carriers outside the `req-*.md` files

| Carrier | Content | Class |
|:---|:---|:---|
| `AGENTS.md` §1 Runtime surface | Routes row (derived from `src/app/**`, guarded by `tests/unit/contract-citations.test.ts`), 404 surface, error boundaries, locales + normalisation + BCP 47, request entry, `next.config.ts` flags, tech stack, tokens | A (facts) — but the stack row lists `motion@12.34.0` which is not in `package.json` (stale). |
| `decision-register.md` change log 2026-09-16 "공유·설치 정체성" | brand mark in `src/app/brand-assets.ts`, consumed by `icon.svg`, `apple-icon`, `opengraph-image` | A (code-only spec). |
| change log 2026-09-16 "locale 별 문서 메타데이터" | `generateMetadata` emits `meta.description` ×12, `og:locale`, canonical, 12 hreflang (`assertion:SH-01`) | A (code-only). |
| change log 2026-09-16 proxy matcher | `/apple-icon` etc. bypass proxy like `favicon.ico`, `robots.txt`, `sitemap.xml` (`assertion:MB-01`) | A (code-only). |
| `mobile-refactor-analysis.md` §15 (16 confirmed decisions, 2026-09-14) | #1 phone expansion = bottom sheet, #2 desktop in-place overlay, #3–#4 consent bottom banner never shares a container, #5 instruction modal bottom sheet, #6 density/1-column/no 2-col, #7 fonts, #8 result = address only; content + dynamic OG next phase, #9 history list only, #10 no bottom tab bar, #11 hover intent/title continuity/ghost GNB kept, #12 skip link, #13 consent recall links, #14 OPTED_OUT notice, #15 A/B tap enters test directly, #16 no hero | #1, #5, #6, #11 → B (superseded by prototype); #2 → C-1 (desktop); #3, #4, #13, #14 → B0 carry; #7, #12 → A; #8, #9 → A (deferral); #10 → B0 (prototype has no tab bar — consistent); #15 → A (prototype keeps it: answering Q1 enters); #16 → done. |
| `docs/plans/2026-09-14-mobile-refactor-design-spec.md` | Rule 1 layer order (banner above GNB) | Conflicts with `req-landing-interaction.md:182` "층 순서(시트 > GNB > 배너 > 콘텐츠)" — an existing internal contradiction flagged by the prototype session (`dialog.md:365`). Obsolete once the Experience spec defines layers. |

---

## 4. Domain contract catalogue (class A) — normative one-liners

"Spec" = where the rule is written; "Full?" = fully specified in a contract document (Y), partially (P), code/register only (Code).

### 4.1 Routes and request entry

| Item | Spec | Full? | Normative rule |
|:---|:---|:---:|:---|
| Route surface | `AGENTS.md` §1; `project-analysis.md` §4.1 | Y | Pages are `/{locale}`, `/{locale}/blog`, `/{locale}/blog/{variant}`, `/{locale}/history`, `/{locale}/result/{variant}/{type}`, `/{locale}/test/{variant}`, `/{locale}/test/error`, `/{locale}/manifest.webmanifest`, plus `/api/telemetry`; the table is derived from `src/app/**` and guarded bidirectionally. |
| Pages under `[locale]` | `req-landing.md` §4.1 (2–4), §5.1 | Y | Every real page lives under `src/app/[locale]/**`; root layout owns only document + request-scoped `lang`; locale layout validates locale, loads messages, injects context. |
| Single locale prefix | §4.1(1), §5.2 | Y | A valid route has exactly one `/{locale}` segment; duplicates are a global 404. |
| Single request entry | §5.3; `AGENTS.md` §3 | Y | `src/proxy.ts` is the only request entry; no `middleware.ts`; no business state in the proxy. |
| Locale-less redirect allowlist | §5.3 | Y | Only `/blog`, `/blog/[variant]`, `/history`, `/test/[variant]` get locale-injected; anything else locale-less is a global 404. (Rebuild must add new public routes, e.g. a vote page, deliberately.) |
| Typed routes | §5.4 | Y | Build paths only through RouteBuilder + `buildLocalizedPath`; no manual concatenation or `as Route` casts. |
| Blog routing | §5.4 | Y | `/blog` is list-only; `/blog/{variant}` renders only that article; invalid or non-enterable variant redirects to the blog index (no other-article fallback). |
| Test route | `req-test.md` §1.3, §3.2 | Y | Instruction/qualifier/runtime/result-in-progress all live on `/test/{variant}`; instruction is never its own route; invalid/runtime-blocked/lazy-validation-failed variants redirect to `/test/error?variant=…` without creating a session. |
| Result route | `req-test.md` §5.1–§5.2 | Y | `/{locale}/result/{variant}/{type}?{base64}`; arrival from a finished run uses `router.replace`. |

### 4.2 Locales, normalisation, BCP 47 `<html lang>`, i18n message model

| Item | Spec | Full? | Normative rule |
|:---|:---|:---:|:---|
| Locale set | `AGENTS.md` §1; `src/config/site.ts` | Y | `en, kr, zs, zt, ja, es, fr, pt, de, hi, id, ru`; default `en`; cookie `NEXT_LOCALE`; product codes are canonical for URL/storage/telemetry and never change. |
| Accept-Language normalisation | `req-landing.md` §5.3; `project-analysis.md` §4.3 | Y | `/` → valid cookie, else best Accept-Language match (`ko* → kr`, Simplified Chinese → `zs`, Traditional → `zt`), else default. |
| Entry aliases | §5.3; `src/config/site.ts` `localeEntryAliases` | P (code holds the table) | BCP 47 or common variants in the path (`/ko`, `/zh-Hans`, `/en-US`, `/jp`, `/zh-TW`) redirect to the canonical code; region subtags are stripped right-to-left; `zh-tw/hk/mo` → `zt` (region beats script); canonical segments are never aliases; alias resolution precedes app-route ownership. |
| Display `<html lang>` | §5.3, EX-003; `AGENTS.md` §1 | Y | `<html lang>` carries the BCP 47 display tag (`kr→ko`, `zs→zh-Hans`, `zt→zh-Hant`, others identical), SSR-rendered from the proxy-injected header, and client sync must not overwrite it with the product code (register 2026-09-15 BQ-40 audit). |
| UI message model | REQ-F-026; `project-analysis.md` §4.2 | P (namespace list stale) | Chrome copy lives in `src/messages/{locale}.json` via next-intl (namespaces at HEAD: `meta, gnb, landing, test, blog, history, error, consent`); key parity across 12 locales (`message-key-parity.test.ts`). |
| Content localisation | REQ-F-026; `req-test.md` §2.2 | Y | Questions/answers/instruction/titles come from Sheets per-language columns (`question_EN`…); missing locale values fall back to the default locale; no country-specific content or scoring. |
| Instruction copy ownership | `project-analysis.md` §9; `project-rules.md` | Y | Variant-specific instruction body comes from the Landing source; CTA labels and consent notes come from messages; every variant has its own instruction (no generic fallback). |
| Number formatting | `req-landing.md` §6.8; register 2026-09-19 | P | Meta counts use locale-correct grouping (no `k/m` abbreviation); `Intl.NumberFormat` per locale. |

### 4.3 Consent semantics

| Item | Spec | Full? | Normative rule |
|:---|:---|:---:|:---|
| State machine | `req-landing.md` §12.4 | Y | `UNKNOWN → OPTED_IN | OPTED_OUT`; SSR renders `UNKNOWN`; one storage sync after mount; only `OPTED_IN`/`OPTED_OUT` persisted (`vivetest-telemetry-consent`). |
| Transmission gate | §12.1, EX-002 | Y | Client telemetry is sent only in `OPTED_IN`; `UNKNOWN` may queue but not send; `OPTED_OUT` drops the queue and invalidates anonymous IDs. |
| Analytics gate | §12.4, §14.4 | Y | Vercel Analytics and Speed Insights attach only after `OPTED_IN` from the same consent source. |
| Catalog filtering | §13.9, `req-test.md` §2.5 | Y | `available` hidden under `OPTED_OUT`; `opt_out` always shown; `unavailable` always shown with coming-soon; `hide`/`debug` never in the end-user catalog; filtering lives in the registry resolver. |
| Instruction consent matrix | §13.5; `req-test.md` §3.6 | Y | CTA set = f(ingress, consent, attribute): `UNKNOWN+available` → [Accept All and Start]/[Deny and Abandon]; `UNKNOWN+opt_out` → [Accept All and Start]/[Deny and Start]; deep-link `OPTED_OUT+available` → warning + [Accept All and Start]/[Keep Current Preference]; otherwise [Start]; test route renders no other consent UI. |
| `Esc` never writes | `req-test.md` §3.6; BQ-41 | Y | `Esc` never writes consent, `instructionSeen`, commit or redirect; no-op on the instruction step, Back/Cancel on qualifier steps. |
| Recall semantics | §12.7; BQ-46 | Y (UI B0) | Recall re-opens the same consent UI with focus, shows the previous choice (not by colour alone), and closing it never changes the stored choice; OPTED_OUT catalog shows a notice with the hidden count and an undo path. |

### 4.4 Telemetry events, payload, endpoint

| Item | Spec | Full? | Normative rule |
|:---|:---|:---:|:---|
| Event set | `req-landing.md` §12.1; REQ-F-016; `req-test.md` §9.1 | Y | Public events: `landing_view` (once per locale:route), `card_answered` (landing A/B, ingress only), `attempt_start` (first scoring runtime question rendered after instruction; not on resume), `question_answered` (non-last scoring answers; never re-fire `scoring1`), `final_submit`, `result_viewed`; `transition_*` are internal signals only. |
| Common fields | §12.2 | Y | `event_id`, `session_id`, `ts_ms` (UTC), `locale`, `route`, `consent_state`; `session_id` may be null only before `attempt_start` (transport patch). |
| Per-event fields | §12.2; `project-analysis.md` §5.6 | Y | `card_answered`: `source_variant`, `target_route`, `landing_ingress_flag=true`; `attempt_start`: canonical `question_index_1based`, `landing_ingress_flag`; `question_answered`: scoring-order ordinal, `choice`, `dwell_ms`; `final_submit`: `variant`, index, `dwell_ms_accumulated`, `landing_ingress_flag`, `final_responses` (canonical index → `'A'|'B'`, scoring only). |
| Index semantics | `req-test.md` §9.1 | Y | `attempt_start`/`final_submit` use canonical index; `question_answered` uses visible scoring-order ordinal; never mixed with response keys. |
| Payload hygiene | §12.3 | Y | No raw question/answer text, free text, nickname, IP/fingerprint; reject `transition_id`, `result_reason`, `final_q1_response`. |
| Anonymous ID | §12.5 | Y | `randomUUID → getRandomValues`, otherwise no session id; no time-based fallback. |
| Endpoint | `project-rules.md`; `project-analysis.md` §5.6 | Y | `POST /api/telemetry` requires object with `event_type`, shares the transport validator, returns 400/204, no persistence yet. |
| Retention | REQ-F-017 | N | Undecided since inception. |
| Gaps for the prototype | REQ-F-016 reserved list | N | Share/vote events (`share_clicked`, `share_copied` reserved), N-ary `choice`, stage identity in payload — undefined (C-2, C-5). |

### 4.5 Storage keys

| Item | Spec | Full? | Normative rule |
|:---|:---|:---:|:---|
| Registry of keys | `project-analysis.md` §6; `src/features/landing/storage/storage-keys.ts`; `src/features/test/storage/test-storage-keys.ts` | Y | localStorage: `vivetest-theme`, `vivetest-telemetry-consent`, `vivetest-telemetry-session-id`, `test:{variant}:activeRun`, `test:{variant}:responses`, `test:{variant}:flag:{5 flags}`, `test:runHistory`; sessionStorage: `vivetest-current-path`, `vivetest-previous-path`, `vivetest-landing-pending-transition`, `vivetest-landing-return-scroll-y`, `vivetest-landing-return-variant`, `vivetest-test-instruction-seen:{variant}` (legacy form; target `test:{variant}:instructionSeen`), `vivetest-landing-ingress:{variant}`. |
| Key changes are contract changes | `project-analysis.md` §6 | Y | Storage key renames are runtime-contract changes (a from-scratch rebuild may pick a new scheme only with a migration or explicit reset decision). |
| Safe storage | `req-test.md` §8.2 | Y | Every write goes through one helper that never throws; failure = degraded mode, not failure. |
| Theme preference | `req-landing.md` §6.4 | Y | System-follow first, manual `light|dark` persisted, `System` clears it; bootstrap runs before paint without the framework (BQ-47). |
| Variant scoping | `req-test.md` §6.8, §8.3 | Y | Cleanup and volatility never touch another variant; history is not part of cleanup. |

### 4.6 Test domain

| Item | Spec | Full? | Normative rule |
|:---|:---|:---:|:---|
| Variants & attributes | `req-landing.md` §2, §13.9; `req-test.md` §2.5 | Y | Five attributes `available | unavailable | hide | opt_out | debug`; enterable = `available | opt_out`; legacy `unavailable:true` → `attribute:'unavailable'`. |
| Source topology | `req-test.md` §2.1–§2.2 | Y | Landing, Questions (sheet name = variantId), Results spreadsheets; schema is code-owned (`schema-registry.ts`), never a 4th sheet. |
| Question typing & canonical index | §2.2, §3.1, §3.8 | Y | `q.{n}` = profile, numeric = scoring; canonical index = 1-based source order over all rows; Q labels count scoring only; profile rows live in `questions[]`. |
| Binary model | §3.8; REQ-F-005 | Y (C-2) | Each scoring question has exactly two options mapping to `poleA ≠ poleB` of one axis. |
| Scoring / derivation | §3.11 | Y | Per axis `binary_majority` with odd question count (bidirectional); `dominant` per axis; `derivedType` = dominants in schema order; `axisCount ∈ {1,2,4}`; `scale` reserved and blocking. |
| Qualifiers (EGTT gender) | §3.1, §3.6, §3.11, AR-007 | Y | Profile question collected as a qualifier step inside the instruction overlay; token from `QualifierFieldSpec.values` (`['M','F']`, length 1) appended to the type segment (`EM`); not scored, not in progress, not in `final_submit`; recap chip re-entry resets scoring answers. |
| Response projection | §3.8; `result-pipeline-todos.md` §6 | Y | Runtime `A/B` → `poleA/poleB` before derivation; qualifier tokens are stored as tokens and not re-projected. |
| Entry paths | §3.3 | Y | Landing Ingress (pre-answer bound to first scoring index), Direct Cold, Direct Resume (first unanswered scoring after last confirmed, no new `attempt_start`); ingress beats an active run; completed-run re-entry = Direct Cold. |
| Runtime entry commit | §3.4; `req-landing.md` §13.4 | Y | Commit (Start-type CTA, or final qualifier Continue) binds variant/run, seeds, consumes staged entry, replaces old run only on success. |
| Staged entry | §3.5 | P | Pre-answer + flag + `createdAtMs`; 7-min expiry is a target not enforced. |
| Instruction seen | §3.6, §6.8 | Y | Variant-scoped session flag recorded by Start/Accept/Deny-and-Start; not by Abandon/Keep; deleted by timeout, restart commit, result commit; qualifier variants never auto-commit on it alone. |
| Answer lock & auto-advance | §4.3 | Y | Choosing auto-advances after a 150 ms lock (selected during lock); no `다음`; last question does not auto-advance. |
| Revisit mark | §4.3; BQ-42 | Y | Revisited question shows both unselected + a quiet previous-choice mark announced as text (`이전에 선택한 답변`), not `aria-checked`. |
| Navigation destination | §3.9, §4.3 | Y → **changed** | Old: first unanswered, else last. New (owner): after re-answering a revisited question, advance exactly one question. |
| Answer retention | §3.9 | Y | No move and no change removes other answers; only derivation residue is invalidated. |
| Progress | §3.9, §4.3 | Y | answered scoring / total scoring (landing pre-answer counts); shown as bar + %, never "N of M". |
| Eligibility & completion | §3.10, §4.4–§4.5 | Y | Eligible iff last answer valid + all required answered + no blocking state; only qualifier re-entry reset removes it. |
| Session & timeout | §3.7 | Y | Active run expires 30 min after last answer, judged at re-entry. |
| Volatility & cleanup | §6.8, §8.3 | Y | Timeout, restart commit, result commit delete run data incl. `instructionSeen`, atomically and variant-scoped. |
| Result URL & payload | §5.1–§5.2, §6.3 | Y | Path `variant` + `type` (`axisCount + Σ tokenLength`), payload = URL-safe base64 JSON `{scoreStats, shared}` as keyless query; payload untrusted and validated in order; cases own/shared/invalid; invalid = error render, no partial render. |
| History | §8.4 | Y (C-9) | Single key, entries created at run start, completed on submit, abandoned computed at read, newest first, max 50. |
| Error & recovery pages | §6.1–§6.7; `AGENTS.md` §1 | Y | Recovery page in the reader's locale with ≥ 1 forward path and up to 2 incomplete-test cards; blocking data errors stop the run; `[locale]/error.tsx` and `global-error.tsx` are client-side nets only. |
| 404 handling | `req-landing.md` §5.5; `AGENTS.md` §1; register 2026-09-17 | Y | Never resolve a 404 inside `[locale]` (it ships an empty `<body>`); unknown paths are 404'd by the proxy outside `[locale]`; `global-not-found` needs `experimental.globalNotFound`. |
| Content integrity | `req-test.md` §2.4–§2.5, §6.2 | Y | Cross-source mismatch: Landing-only → `hide`; other mismatches → entry blocked; lazy per-variant validation cached; no partial activation. |

### 4.7 Manifest, SEO, OG, analytics

| Item | Spec | Full? | Normative rule |
|:---|:---|:---:|:---|
| Locale manifest | BQ-45 | Code + register | `/{locale}/manifest.webmanifest` serves the translated `meta.description` and `start_url: /{locale}`; root `manifest.ts` keeps `start_url: /`; `name/short_name` untranslated. |
| Document metadata | register 2026-09-16 (`assertion:SH-01`); `src/app/[locale]/layout.tsx:28–56` | Code only | Per-locale `description`, `openGraph` (`og:locale` = display tag, `url /{locale}`), `alternates.canonical` and 12 hreflang entries. |
| Static OG card | register 2026-09-16; `src/app/[locale]/opengraph-image.tsx` | Code only | 1200×630 brand mark + wordmark only, no text (satori cannot read the variable woff2, CJK would render as tofu); per-result dynamic OG explicitly out of scope ("분석 §15 결정 8"). |
| Icons | register 2026-09-16 | Code only | One brand definition (`src/app/brand-assets.ts`) feeds `icon.svg`, `apple-icon`, OG; manifest icons point at `/icon.svg` (`any` + `maskable`); proxy matcher lets `/apple-icon`, `favicon.ico`, `robots.txt`, `sitemap.xml` through (`assertion:MB-01`). |
| robots/sitemap | `project-analysis.md` §4.3 | N | Bypassed by the proxy but no contract defines their content (no files under `src/app` at HEAD). |
| Analytics | `req-landing.md` §12.4 | Y | Vercel Analytics + Speed Insights, consent-gated. |
| Admin analytics | REQ-F-018/019 | Y (future) | Not built. |

### 4.8 Cross-cutting accessibility floor (A-a11y)

Sources: `req-landing.md` §7.6-a, §9; `req-test.md` §3.6; `req-landing-interaction.md` §11.3; owner rule "no tiny dots". Survivors: 44 px targets (`TT-01`), visible focus, semantic `<button>/<a>` triggers, stable accessible names, keyboard independent of width/input, `Escape` closes any expansion/overlay, dialogs trap focus and return it, skip link first + tab order = document order, reduced motion removes movement but keeps fades, contrast ≥ 4.5:1, every gesture has a tap/button alternative (prototype build rule 2, WCAG 2.5.1/2.5.7).

---

## 5. Conflicts that need an owner decision (class C)

Each row quotes both sides; "Recommendation" is the investigator's, not a decision.

**C-1 Desktop/tablet presentation.** Current: `mobile-refactor-analysis.md` §15 #2 "태블릿·데스크톱의 카드 확장은 제자리 오버레이를 유지한다" plus the whole hover contract (`req-landing-interaction.md` §8.1–§8.4) and multi-column grid (`req-landing.md` §6.2). Prototype: `MOCK/shared/tokens.css:61` `--app-w: min(100vw, 430px)` — every surface is a phone column; the owner reviewed rounds 2–3 as "[X] 데스크톱 미리보기" of that column and never asked for a wide layout. Recommendation: rebuild v1 renders the phone-column app centred on wide screens (as the prototype hub does), keep pointer/keyboard parity, and schedule a desktop layout as a later, separately designed surface.

**C-2 N-ary answers.** Current: REQ-F-005 "Each question must provide exactly two answer options"; `req-test.md` §3.8 "각 scoring runtime question은 정확히 2개의 선택지를 가져야 한다"; preview shape `previewQuestion, answerChoiceA, answerChoiceB`; telemetry `'A' | 'B'`. Owner: "나중에 3지선다, 4지선다 응답형 테스트도 있을 수 있습니다. 필수는 아니지만, 이 때 활용 가능하도록 유연한 구조가 되거나 …". Prototype: I/D render 2–4 answers, J is 2-only. Gap: no scoring mode exists for N-ary answers (`binary_majority` is pole-based). Recommendation: the owner's words already settle the *structure* — model answers as an ordered list (`A..D`), keep scoring binary-only until an N-ary scoring mode is designed with a real N-ary test; the owner decides the scoring semantics when such a test exists.

**C-3 Stage assignment per test.** Owner: "어떤 테스트에 어떤 무대를 적용할지는 최종 배포 시점에 다시 한번 고민하고 결정" / "완성된 후에는 각 테스트 별로 어떤 타입을 적용할지를 사전에 정의하겠습니다." Prototype default `qmbti·egtt → I, energy-check → J`, reduced motion → D. No current contract has a stage concept. Recommendation: add a per-variant `stage` field (and `color` fields, C-4) to the registry with a code default; the owner supplies values at deploy time.

**C-4 Per-test signature colours vs single accent.** Current: `design.md` single sage accent; BQ-38 token system. Prototype: `Shell.TEST_COLORS` + `LOOK` palettes per test ("테스트 대표색은 카드 → 무대의 첫 색 → 시작 버튼 → 공유 카드까지 이어집니다", `dialog.md:2034`). Decision needed: who owns the colours (Sheets column vs code) and how new tests get one (the prototype derives a fallback from base/hi).

**C-5 Sharing & voting backend and privacy.** Current: `req-test.md` §1.3 "Share CTA | 이번 단계 미구현"; REQ-F-016 reserves `share_clicked`, `share_copied`; EX-002 forbids client telemetry without consent and allows only "strictly-necessary 서버 집계". Owner: "테스트 도중에도 자연스럽고 꼭 필요합니다" and votes "있어야 한다". Prototype build notes: vote box per link with "익명 집계, 중복 투표 방지, 만료 기간"; friend page must open in KakaoTalk/Instagram in-app browsers without login. Decisions: storage/hosting (the repo has no persistence today — `/api/telemetry` is validation-only), abuse/dedupe/expiry policy, whether a vote is "strictly necessary" functional data or consent-gated, which shared fields are public (question text is content, fine; the sharer's own answer?), and phase (v1 or v1.1).

**C-6 Result page content and post-submit transition.** Current: `req-test.md` §3.12/§7.1 mandatory sections (target), §4.6 "최소 5초 로딩" (target), analysis §15 #8 "결과 화면은 주소까지만 … 내용 구성과 동적 OG 는 다음 phase". Owner: "마지막 제출 이후 트랜지션은 지금의 형태는 마음에 안드는데, 구체적인 피드백은 … 결과 페이지까지 이어지는 부분의 피드백을 추가로 나중에 제공하겠습니다." Prototype: end card "결과 화면은 이번 목업 범위 밖이에요" + palette/path share. Decision: keep the 5 s loading target or drop it; result content schema; when result gets its own prototype round.

**C-7 Per-question / per-result OG images.** Current: static brand OG only; dynamic OG out of scope (`opengraph-image.tsx` header, result-pipeline-todos §6). Prototype: link previews per shared question. Constraints found in the prototype session: `next/og` ImageResponse flaw in Next 16.2.0–16.3.5, fixed in 16.3.6 (source: a press report — "1차 보안 공지는 확인하지 못했습니다", `dialog.md:366`); repo is 16.2.4; ImageResponse is flexbox-only, 500 KB cap incl. fonts, ttf/otf/woff only, and CJK text needs a non-variable font subset. Decision: include in v1 or after sharing lands; stack baseline should start ≥ 16.3.6 regardless.

**C-8 Landing consent banner, GNB menu/drawer, settings, blog and history surfaces (B0).** Current: `req-landing.md` §12.7 bottom banner, §6.4 drawer/settings, analysis §15 #3/#4/#13/#14; blog list/detail; history list. Prototype: all "목업 범위 밖" (`l3-deck.html:1230` "읽을거리·메뉴·개인정보 설정은 동작하지 않아요"). Recommendation: carry the existing behaviour contracts, re-skin in the new language; owner confirms or requests a prototype round for these surfaces.

**C-9 History scope.** REQ-F-012: "Each entry MUST include … the share URL string … Single-item delete and clear-all actions are supported." `req-test.md` §8.4: "이번 범위에서 하지 않는 것: 항목 탭 동작, 항목별 URL 스킴, 삭제/전체 삭제 UI." (message keys `history.clearAll/open/delete` already exist). Prototype: no history. Decision: v1 = list-only (newer contract) or the full REQ-F-012.

**C-10 Content defects in fixtures.** (a) qmbti Q6 "친구들이랑 같이 이야기하면서 배우는게 좋아" is `poleA 'I'` (`src/features/test/fixtures/questions/qmbti.ts:62`; `MOCK/shared/content.js` comment "Fixture poles as written … flagged"); (b) English consent sentence "Nothing you answer is sent." is false because `question_answered` sends A/B (`dialog.md:360`); (c) `Q_placeholder_*` scoring rows added only to satisfy the odd-count rule (`req-test.md` §2.7); (d) `energy-check` is mapped to the MBTI 4-axis schema (`schema-registry.ts` `variantLogicTypeMap`) although it is a different test. Owner must supply intended content/scoring.

**C-11 Timing contracts introduced by stages.** Current: 150 ms answer lock only (`req-test.md` §4.3). Prototype J: "도착 가드(표지판이 다 선 뒤 350ms)는 150ms 연타 잠금과 별개의 새 계약이에요 — 자동 진행 화면 모두에 같은 값을 쓸지 정해야 해요" (`j3-forks.html:1429`). BQ-39(A) already gives micro-interaction timing to the implementer with a duty to surface alternatives — so this can be decided in implementation, recorded in the Experience spec.

**C-12 Performance budget for the living field and canvas stages.** Current: `req-landing.md` §11.4 font/LCP/CLS budgets; BQ-47. Prototype: WebGL field (CSS fallback), canvas 3D J, liquid I; notes "canvas 2D 원근 투영으로 라이브러리 없이 가능(약 4–7KB)". Decision: a JS/GPU budget and low-end fallback policy (the prototype's "GPU 가 없으면 같은 색의 CSS 그라디언트").

**C-13 Reduced-motion switching.** Owner accepted "D 안은 모션 제거 시 폴백으로 채택". Open detail (`d3-story.html:807`): "OS 의 prefers-reduced-motion 과 사이트 설정을 함께 봐야 해요. 테스트 도중 설정이 바뀌면 무대를 바꾸지 말고 …". Decision: add an in-site motion setting or OS only.

**C-14 Transition/terminal model under the window.** Current: `req-landing.md` §13.3 transition terminals, 1600 ms timeout, GNB swap; AR-001 complete-after-ready. Prototype: landing stays mounted, "다 커진 순간을 destination-ready 로 봐요(§13.3 의 1600ms 안)". Recommendation: keep ingress/rollback semantics and a single terminal per attempt; drop scroll restore and ghost GNB. Technical choice (parallel + intercepting routes vs View Transitions) is an implementation spike, not an owner decision.

**C-15 Unavailable card tap.** BQ-10 "no hover/no click/no tap" vs prototype `l3-deck.html:702` `P.toast('출시 예정이에요')` on tap. Minor; implementer may decide under BQ-39(A).

---

## 6. Decision register status (BQ-01 … BQ-48)

"Valid" = still binding in the rebuild; "Superseded" = the prototype or a later decision replaces it; "Obsolete" = tied to the old wave process, desktop grid or a closed defect.

| BQ | Subject (short) | Status for the rebuild |
|:---|:---|:---|
| 01 | Claude Design canonical = prompt, PDF-only elements (A/B badge, PREVIEW QUESTION…) removed | Superseded — the prototype reintroduces an A/B badge on every answer; the rest is obsolete. |
| 02 | Blog card Expanded removed; direct navigation | Valid (behaviour): blog rows navigate directly (prototype list rows; `BRIEF.md` "Blog cards navigate directly"). |
| 03 | Desktop GNB static pill, function later | Obsolete (desktop GNB already realised; no desktop design in prototype). |
| 04 | Light mode only | Obsolete — dark theme shipped (D-10) and the prototype supports both. |
| 05 | First rebuild scope landing-only | Obsolete (old rebuild scope). |
| 06 | Result pipeline excluded | Obsolete as a wave guard; its substance continues as analysis §15 #8 (result content + dynamic OG deferred) → C-6. |
| 07 | Discard/regenerate visual baselines | Closed 2026-09-11; for the rebuild every baseline is invalid anyway → Obsolete. |
| 08 | Normal card order Thumbnail→Title→Subtitle→Tags | Superseded (poster deck cards). |
| 09 | Expanded test: no label/badge, text + →, meta completed | Superseded (window; badges). |
| 10 | Unavailable: no hover/click/tap | Partly valid: non-enterable + inert (A); tap toast in prototype (C-15). |
| 11 | Mobile expanded shape per CD; swipe-down excluded | Superseded (window); the owner independently rejected drag-to-close. |
| 12 | Resolver/telemetry/transition/test-route are preserved surfaces | Valid in spirit for domain (registry, telemetry, test route); transition part superseded (C-14). |
| 13 | `main` = landing target; checkpoint refs = rollback anchors | Valid (branch half); relevant to separating legacy vs rebuild. |
| 14 | `legacy/reference` read-only at `d3305b7` | Valid; the rebuild will need a second read-only anchor for the current `main` (e.g. at `20f973a` or later). |
| 15 | Range anchors `w01-02 … w15-17` | Obsolete as process; keep tags as history. |
| 16 | Wave 1 motion-ready seams only | Obsolete. |
| 17 | W1-LI-03 desktop shell seam | Obsolete. |
| 18 | Business logic "Evaluate first" (Logic Improvement Protocol) | Obsolete as wave process; principle (re-evaluate logic, do not auto-keep) fits a from-scratch rebuild. |
| 19 | Analysis-only gate per wave | Obsolete. |
| 20 | Review exception for approved logic changes | Obsolete. |
| 21 | `design.md` = visual SSOT, visual-only | Principle valid (visual doc never governs behaviour); content superseded by the prototype's visual language. |
| 22 | Thumbnail 16/6 | Superseded (already 16/4 in unit 7; deck posters). |
| 23 | Remove hero band | Done (unit 7) → Obsolete. |
| 24 | Expanded height floor | Obsolete (desktop grid overlay). |
| 25 | Arrow optical nudge after Pretendard | Closed (no nudge) → Obsolete. |
| 26 | Unavailable: out of tab order, semantic button, coming-soon tag | a11y semantics valid (A-a11y); visual superseded. |
| 27 | Card border hairline | Superseded. |
| 28 | Tag chip fill/border/lowercase | Superseded (also by 30); no tag row in the deck. |
| 29 | `--muted` AA revalue | Closed by theme cut; AA ≥ 4.5:1 principle valid. |
| 30 | Tag chip borderless | Superseded. |
| 31 | Grid height rhythm (mockup-fix rev3) | Obsolete. |
| 32 | Tag visible-prefix resolver | Obsolete (no tag row) — the i18n lesson (never truncate by reordering) remains useful. |
| 33 | Desktop keyboard a11y for grid | Obsolete in form; principles (Escape closes once, focus returns, stable names) valid. |
| 34 | Shared token file consumed by code and CD | Valid principle (realised by BQ-38). |
| 35 | Mobile browse card visual (W12) | Superseded. |
| 36 | SSR viewport-tier determinism / mobile 12 px gap | Visual part superseded; "no hydration flip" is A (`req-landing.md` §11.1). |
| 37 | Visual reconciliation R2 gutter | Obsolete. |
| 38 | Design-system rebaseline: repo-owned `docs/design/ds/`, one-way push to Claude Design VIVE Design System v2 `cd630eec-25e4-4613-a58f-c671c80297ca`; sub-decisions A–D, M-01 ease-in-out, `.vt-choice--answer` | Structure valid (repo owns tokens, one-way push); contents superseded (motion bans, §8 freeze, answer button type, single accent). |
| 39 | (A) implementer judgment over SSOT for transitions/micro-interactions, must surface better alternatives; (B–D) desktop hover contract tiers | (A) valid as a working policy; (B–D) obsolete (desktop hover). |
| 40 | Three axes; split behaviour vs interaction documents | Principle valid (keyboard independent axis; behaviour/interaction split); grid specifics obsolete. |
| 41 | `Esc` = cancel, writes nothing; instruction step no-op | Valid (A) — the prototype modal follows it. |
| 42 | No tail reset; revisited = unselected + previous mark; last question selected; destination = first unanswered | Partly superseded: retention, mark and last-question rule valid; destination rule replaced by "advance exactly one" (owner round 2). |
| 43 | Bottom-sheet primitive for phone expansion and instruction; swipe-down close | Superseded (window + centred modal; owner rejected drag-to-close). |
| 44 | Rotation keeps the expansion | Obsolete under the window; re-derive orientation behaviour in the Experience spec. |
| 45 | Locale manifest | Valid (A). |
| 46 | Consent banner: Allow CTA vs plain Deny, no Preferences, line budget, OPTED_OUT notice, three recall paths | Semantics valid (A); visual form not covered by the prototype (B0, C-8). |
| 47 | Font subsets (no preload), inline theme bootstrap, first-card LCP priority, cache headers, §11.4 budgets | Valid (A, non-functional); budgets must be re-measured for the new UI (C-12). |
| 48 | Mobile typography column | Superseded/re-derived by the new design system (phone-first scale). |

Other register rows worth carrying as facts: 2026-09-16 OG/icons/metadata/manifest/proxy-matcher rows (§4.7); 2026-09-16 unit 8 result address; 2026-09-16 unit 9 history; 2026-09-19 recovery cards; 2026-09-19 locale number format.

---

## 7. Result page, blog, history, share, OG — current contracts vs prototype

| Surface | Current contracts (and implementation at HEAD) | Prototype |
|:---|:---|:---|
| **Result page** | URL `/{locale}/result/{variant}/{type}?{base64}` with payload `{scoreStats, shared}` (`req-test.md` §5.1); case matrix own/shared/invalid with CTAs 다시하기 / 나도 테스트하기 and `router.replace` arrival (§5.2); ten invalid branches, no partial render (§6.3); mandatory sections `derived_type`, `axis_chart`, `type_desc` + optional `trait_list` with fallback (§3.12, §6.4, §7.1) — **target only**; ≥ 5 s derivation loading, back-from-loading, derivation failure (§4.6–§4.7, §6.7) — target only; `result_viewed` should fire once by IntersectionObserver on the `derived_type` block (§9.1). Implemented: the route, codec, error screen and a `derived_type`-only render (`result-pipeline-todos.md` §6). Decision: "결과 화면은 주소까지만 만든다 … 내용 구성과 동적 OG 는 다음 phase" (analysis §15 #8). Known gap: result commit does not clear the active run (`clearActiveRun` never called), so "다시하기" within 30 min can resume a finished run (`dialog.md:357`). | Out of scope in every round (`BRIEF2` rule 8; end card "결과 화면은 이번 목업 범위 밖이에요" + `처음부터`). End-of-test share art: I = palette (`i3-split.html:1161`), J = path (`j3-forks.html:1281`). Owner dislikes the current after-submit transition and will give result feedback later (§2.2). |
| **Blog** | `/blog` list-only, `/blog/{variant}` detail; invalid/non-enterable → blog index (§5.4); blog cards navigate directly with whole-card link, no expanded state, no ingress/`card_answered` (§6.5, §6.8, §13.3, BQ-02); detail has `generateMetadata` (`project-analysis.md` §5.5). Content is fixture-driven. | Blog items appear as rows ("읽을거리") in the "모든 테스트와 읽을거리" list below the deck and as a count on the deck's end card; tapping is simulated (`P.toast('목업 범위 밖이에요')`, `l3-deck.html:1099`). No detail design. |
| **History** | `/history` lists runs from `test:runHistory` (max 50, newest first, abandoned computed at read, no row actions, empty state → browse tests) (`req-test.md` §8.4); REQ-F-012 wants share URL per entry + delete/clear-all (conflict C-9); result case 3 depends on history (AR-006). | Not present; menu is out of scope. |
| **Share** | Result sharing = the self-contained URL with `shared:true` and optional opt-in nickname (REQ-F-010/011); "Share CTA 이번 단계 미구현" (`req-test.md` §1.3); reserved events `share_clicked`, `share_copied` (REQ-F-016). No in-test sharing anywhere in contracts. | Core viral feature: in-test "친구에게 묻기" (top-bar icon, one-time coach mark) opens a share sheet — link first ("나 대신 골라 줘"), 9:16 story card second; the test never advances while the sheet is open and resumes on the same question with focus on it; friend votes appear as one line under the question ("친구 3명이 골라 줬어요 · A 2 · B 1"); friend page `v-vote.html` = vote then "나도 해 보기"; 3–4-answer questions supported; end-of-test palette/path share. Requires vote storage, dedupe, expiry, anonymous aggregation, in-app-browser compatibility. |
| **OG / link preview** | Static brand OG per locale (`[locale]/opengraph-image.tsx`, 1200×630, no text), per-locale `og:description`/`og:locale`/canonical/hreflang (`[locale]/layout.tsx`), locale manifest (BQ-45), icons (`brand-assets.ts`). Per-result dynamic OG explicitly deferred. | Per-question link preview for the ask link (`v-vote.html:225`), 9:16 canvas card for stories; requires server image generation and Next ≥ 16.3.6 (C-7). |

---

## 8. Proposed SSOT document set for the rebuild

Principles: few documents, one concern each; behaviour documents never describe pixels or motion; the Experience spec never overrides behaviour (keep `req-landing-interaction.md` §0.2 precedence); every normative rule has a stable ID used by tests (replacing the colliding blocker numbers); history stays in `docs/done/`/`docs/archive/`, decisions in a fresh register.

| # | Proposed document | One concern | Class of content |
|:---:|:---|:---|:---|
| 1 | `docs/spec/domain.md` | Test domain and flow semantics: variants/attributes, question model (ordered answers, binary scoring now), profile/qualifier, scoring/derivation/type segment, entry paths, staged entry, runtime entry commit, instruction gate + consent matrix + `instructionSeen`, answer lock/auto-advance/advance-one/retention/revisit mark, progress, eligibility, session/timeout, volatility/cleanup, result URL/payload/cases, error & recovery taxonomy, history model. | A (+ owner-decided change) |
| 2 | `docs/spec/platform.md` | Routes and request entry, locales + normalisation + aliases + display `html lang`, i18n message model and content localisation, 404/error boundaries, SSR/hydration determinism, metadata/OG/manifest/icons/robots/sitemap, performance budgets, caching, stack baseline (Next ≥ 16.3.6). | A |
| 3 | `docs/spec/privacy-telemetry.md` | Consent state machine & semantics (UI-free), telemetry event taxonomy/fields/index semantics/endpoint/validation, anonymous ID, analytics gating, storage key registry & safe storage, retention. | A |
| 4 | `docs/spec/content-pipeline.md` | Sheets topology, normalisation, generated registry, cross-source and lazy validation, fixtures, sync Action, schema registry ownership, plus new per-test fields (stage, colours). | A |
| 5 | `docs/spec/experience.md` | The prototype, formalised: app shell (phone column; desktop per C-1), landing deck + window, stage protocol (window/full/collapse), stages I/J/D (answering only, no new toys), shell components (top bar, rail/story bar, 이전/제출, instruction modal, badges, previous mark, vote line), transition grammar, motion tokens and reduced-motion policy (D stage), layers, gestures with button alternatives, owner interaction principles, a11y interaction floor. | B (new) |
| 6 | `docs/spec/sharing.md` | Ask-a-friend links, vote aggregation (privacy, dedupe, expiry), friend landing page, 9:16 cards, end-of-test art, share telemetry, per-question/per-result OG. | New (C-5, C-7) |
| 7 | `docs/design/` (design.md rewritten + `ds/` bundle) | Visual foundations and tokens (warm-neutral base + per-test colour system + shell tokens), components, pushed one-way to Claude Design (new or re-connected project). | B (new) |
| — | `docs/decision-register.md` (fresh, new ID prefix) | Rebuild decisions; old BQ-01…48 kept read-only in the legacy snapshot. | — |
| — | `AGENTS.md` (rewritten) + `docs/LESSONS_LEARNED.md` (carried) | Repo contract and trap ledger. | — |

### 8.1 Old → new mapping

| New doc | Feeds from (old sections) |
|:---|:---|
| 1 Domain | `req-test.md` §1.3 (domain rows), §2.5 attribute contract, §3.1–§3.12, §4.1–§4.7 (semantic parts; §4.3 destination replaced), §5.1–§5.2, §6.1–§6.9, §7.1 (deferred), §8.1–§8.4, §10 AR-001…007, §12.2 check list (as assertion ideas); `req-landing.md` §2 (card types, ingress flag, runtime entry commit, question index, CTA action identity), §13.2 (A half), §13.4, §13.5 (matrix and CTA invariants), §13.6, §13.7, §13.9 (visibility matrix), §14.4 checklist; `requirements.md` REQ-F-001…013, 021–024, 028–030 (A halves), §5 data model; `req-test-plan.md` ADR-A/B, `project-analysis.md` §5.5.1 frozen signatures; BQ-41, BQ-42 (retention), owner round-2 decision. |
| 2 Platform | `AGENTS.md` §1 (routes, 404, error boundaries, locales, request entry, next.config flags); `req-landing.md` §4.1, §5.1–§5.5, §6.9 (theme coverage), §11.1, §11.4, §15 EX-001/EX-003; `project-analysis.md` §4; `src/config/site.ts` alias rules; register 2026-09-16 rows (OG, metadata, manifest, proxy matcher), BQ-45, BQ-47; `requirements.md` §1 content/localisation principles, REQ-F-026. |
| 3 Privacy & Telemetry | `req-landing.md` §12.1–§12.6, §12.7 semantics (recall/close/notice), §13.9 notice semantics, EX-002; `req-test.md` §9.1–§9.2; `requirements.md` REQ-F-014–017; `project-analysis.md` §5.6, §6; `project-rules.md` telemetry/storage bullets; BQ-46 semantics; C-5 privacy decision. |
| 4 Content pipeline | `req-test.md` §2.1–§2.9, §6.2 (data error list); `req-test-plan.md` Part 4 (ADR-C, ADR-D, ADR-F); `project-analysis.md` §5.3; `requirements.md` REQ-F-008/008A/008B/008C/020/025; `project-rules.md` §VariantRegistry; C-3/C-4 new fields. |
| 5 Experience | Prototype: `BRIEF3.md` (shell rules 1–7, window, protocol), `BRIEF2.md` owner rules 1–7, `BRIEF.md` build rules 1–11, `shared/shell.js`/`shell.css` headers, stage realBuild notes, owner rounds 1–3 (§2 here), memory `vivetest-owner-interaction-principles.md`; carried from old: `req-landing-interaction.md` §0 principles, §8.6 (entry = answer), §11.2–§11.3 (reduced motion, touch defaults, press feedback); `req-landing.md` §7.6-a, §9 (a11y floor), §6.4 mobile drawer/theme/language rules (B0), §12.7 banner form (B0); analysis §15 #10, #12, #15. |
| 6 Sharing | Prototype `share.js`, `v-vote.html` realBuild, owner share quotes; `requirements.md` REQ-F-010/011/023 (result share), REQ-F-016 reserved events; `req-test.md` §5.1–§5.2 (shared flag, case 2); OG facts from §4.7; C-5, C-7. |
| 7 Design system | `docs/design/design.md` (rewrite), `docs/design/ds/**` (tokens, components, SYNC.md one-way push procedure), prototype `shared/tokens.css` (copied from `ds/colors_and_type.css`), `shell.css` tokens, `Shell.TEST_COLORS`/`LOOK`; BQ-21/34/38 principles. |
| Archive / reference-only | `req-landing.md` §1, §3, §6.1–§6.8, §7.1–§7.5, §7.7, §8 stub, §10, §13.1, §13.3 (B half), §13.8, §14.2 (B/D items); `req-landing-interaction.md` §8.1–§8.5; `wave-roadmap.md`; `blocker-traceability.json`; `req-test-plan.md` phases/gates; `project-analysis.md` (as-built, partly stale); `docs/plans/2026-09-11-mobile-refactor-*`, `2026-09-14-mobile-refactor-design-spec.md`, `2026-05-17-result-pipeline-todos.md` (move with the legacy snapshot). |

---

## 9. Staleness and inconsistency evidence (do not carry)

1. **Result commit never volatilises the run** — `clearActiveRun` (`src/features/test/storage/active-run.ts:101`) has no caller in `src`, and `'result_entry_committed'` appears only as a type member (`storage/volatility.ts:7`) and a flag read (`recovery-cards.ts:74`), never as a volatility call — verified by `git grep` at `20f973a`, first reported by the prototype session (`dialog.md:357`). The result URL is live, yet `req-test.md` §6.8 still labels that trigger "target". A domain gap the rebuild must close.
2. `AGENTS.md` §1 stack lists `motion@12.34.0`; `package.json` at `20f973a` has no `motion` (verified); `project-analysis.md` §9 and `project-rules.md` §Blog-Telemetry-Theme still say it is imported.
3. `project-analysis.md` §4.2 "6 namespaces" vs 8 in `src/messages/kr.json`.
4. `project-rules.md` §Visual-Design "do not apply design.md global tokens before Wave 16" — theme cut already happened 2026-09-07 (BQ-38 4단계).
5. `project-rules.md` "Preferences button … visible no-op" — removed by BQ-46.
6. `req-landing.md` EX-001 says Next `16.1.6`; stack is `16.2.4`.
7. Layer-order contradiction: design spec rule 1 (banner above GNB) vs `req-landing-interaction.md:182` "층 순서(시트 > GNB > 배너 > 콘텐츠)".
8. `blocker-traceability.json` merges two blocker numbering spaces (landing §14.2 and test §12.2) under the same integers (7, 11, 12, 5) and points several entries at documents instead of tests.
9. Theme transition still 2,500 ms (`theme-transition.ts:4`) although the mobile analysis marked it "교체 확정" to ≤ 260 ms (`dialog.md:362`).
10. `wave-roadmap.md` "Last reconciled: HEAD 5a1da0f / 2026-07-03".
11. `docs/plans/` still holds five "active" plans from the previous overhaul (result-pipeline todos, mobile-refactor analysis/maps, step 3 surfaces, design spec) — under the lifecycle rule (`AGENTS.md` §7-1) they must move with the legacy snapshot, not stay active.
12. Fixture placeholders (`Q_placeholder_*`) exist only to pass the odd-count validator; `energy-check` reuses the MBTI schema.

---

## 10. Open questions

1. Desktop/tablet: centred phone column for v1, or a designed wide layout (C-1)?
2. N-ary answers: confirm "structure now, scoring later"; which scoring semantics when the first 3–4-answer test arrives (C-2)?
3. Stage and colour per test: values for qmbti, energy-check, egtt, creativity-profile at deploy time; data home = Sheets columns or code (C-3, C-4)?
4. Sharing/voting: v1 or v1.1; storage/hosting; anonymity/dedupe/expiry; is voting consent-gated; which telemetry events (C-5)?
5. Result page: keep the 5 s loading target; content schema; separate prototype round (C-6)?
6. OG: per-question link previews in v1; accept Next ≥ 16.3.6 as the stack baseline (C-7)?
7. B0 surfaces (consent banner, drawer/settings, blog, history, 404/error): carry and re-skin, or prototype them first (C-8)?
8. History scope: list-only or REQ-F-012 full (C-9)?
9. Content: qmbti Q6 poles, English consent copy, placeholder questions, energy-check's real model (C-10)?
10. Reduced motion: OS only or also an in-site switch (C-13)?
11. Storage keys: keep the current key names for continuity of existing users' consent/theme, or reset with a new scheme?
12. Telemetry retention (REQ-F-017) remains undecided since inception.
13. The J stage's final visual (card-palette world) and hub copy were still in progress when this report was written; the Experience spec should be drafted from the prototype only after that session publishes its final version.
