# Quality Improvement Set — S-effort Waves

- **Session name**: Quality Improvement Set
- **Date**: 2026-05-17
- **Session type**: Non-functional — no observable production behavior change (Wave B is a
  localization-correctness change to one already-broken fallback string; not a logic change).
- **Gate command (per-wave)**: see each wave; **session-final**: `npm run lint && npm run typecheck && npm test && npm run build && npm run qa:rules && git diff --check`
- **Package manager**: npm only (no `pnpm` anywhere).
- **Source report**: `docs/reports/2026-05-17-refactoring-candidates.md` (Findings 8.1–8.3, A.5, A.6)

---

## AGENTS.md §7 Required Fields

### All files to be modified

| Wave | File | Boundary class (AGENTS.md §4) |
|------|------|-------------------------------|
| A | `src/messages/de.json` `es.json` `fr.json` `hi.json` `id.json` `ja.json` `kr.json` `pt.json` `ru.json` `zs.json` `zt.json` (11) | Always — Modify Freely (`src/messages/**`) |
| B | `src/features/test/instruction-overlay.tsx` | Always — Modify Freely (`src/features/**`) |
| B | `src/features/test/test-question-client.tsx` | Always — Modify Freely (`src/features/**`) |
| B | `src/messages/en.json` + all 11 non-English locale files (new `overlayBack` key) | Always — Modify Freely (`src/messages/**`) |
| C | `docs/agent-guides/project-rules.md` | Always — Modify Freely (`docs/**`); referenced as Project Rules in §2 |
| D | `src/features/test/canonical-key.ts` (NEW) | Always — Modify Freely (`src/features/**`) |
| D | `src/features/test/question-runtime-utils.ts` | Always — Modify Freely (`src/features/**`) |
| D | `src/features/test/storage/response-set.ts` | Always — Modify Freely (`src/features/**`) |
| D | `src/features/telemetry/validation.ts` | Gold Standard (§6 "Telemetry payload hygiene") — import-only change, no logic change |

**Frozen perimeter respected**: `src/features/test/domain/**`, `schema-registry.ts`,
`response-projection.ts`, `tests/e2e/qualifier-overlay.spec.ts`, prior `docs/plans/**` — none modified.

### Relevant SSOT contract (§2 Task Routing Table)

- Wave A/B (test flow / i18n): `docs/req-test.md`, `docs/req-test-plan.md`,
  `docs/agent-guides/project-rules.md §TestFlow`. Project rule confirmed: *"CTA labels and
  consent notes: owned by locale messages."* (`project-rules.md` line 80) — Wave A/B align with this.
- Wave C (telemetry docs): `docs/agent-guides/project-rules.md §Blog-Telemetry-Theme` /
  `§Unimplemented` — doc-only status correction.
- Wave D (telemetry validation + test runtime): test flow / telemetry. `validation.ts` is the
  Gold Standard for telemetry payload hygiene — change is import-substitution only.

### Impact assessment

- **Shared components (shell/GNB)**: none. Overlay + locale messages only.
- **Localization**: Wave A/B are localization changes (intended). All 12 locale files keep an
  identical key set; no key removed; one key (`overlayBack`) added uniformly.
- **a11y**: Wave A localizes `qualifierChipAriaLabel` (screen-reader label) — improves a11y for
  non-English locales. Wave B ensures the entry-mode qualifier back button has a localized
  accessible name instead of an English literal.
- **State contracts**: none touched. Wave D is a regex-source relocation with identical match
  semantics; no state/logic change.
- **Core user flow**: unchanged. Auto-advance, lock timing, reducer, telemetry payloads all
  byte-identical in behavior.

### Decisions requiring user confirmation before execution

None blocking. Two judgment calls were resolved per prompt §8 ("adopt the clearly better
approach and document the deviation") and are logged below (Wave B key choice; Wave B fix
location; Wave D module location). All stay within Always-Modify-Freely boundaries and change
no public API shape. If the user disagrees with the `overlayBack` new-key decision, Wave B can
fall back to `t('prev')` with no other change.

---

## Scope Table

| Wave | Target | Effort | Behavior change | Status |
|------|--------|--------|-----------------|--------|
| A | i18n — English values in `test` namespace across 11 non-English locales | S | No | **complete** |
| B | i18n — hardcoded `"Back"` fallback in `instruction-overlay.tsx` | S | No (corrects broken localization) | **complete** |
| C | Docs — stale telemetry status in `project-rules.md` | S | No | **complete** |
| D | Canonical index regex dedup across 3 modules | S–M | No | **complete** |

---

## Wave A — i18n Missing Translations

### Pre-edit findings

Reference `src/messages/en.json` `test` namespace values:
`qualifierRestartConfirm` = "Change and restart", `qualifierChipAriaLabel` = "Change qualifier
answers", `cancel` = "Cancel", `qualifierPending` = "—".

**Finding A-pre-1 — `qualifierPending` needs no change.** Actual en.json value is `"—"` (em
dash), and every non-English locale already holds `"—"`. It is a language-neutral symbol
identical to the reference, not an English string. Excluded from translation (documented per
prompt: report's example "Pending" was approximate; real value is "—").

**Finding A-pre-2 — scope is wider than the 4 named keys.** Prompt step 1 = "every key in the
`test` namespace whose value is an English string". Beyond the qualifier/cancel keys, the
consent CTA/note keys are still English in most non-English locales. Per-locale English-valued
`test` keys (compared to en.json):

| Locale | English `test`-namespace keys to localize |
|--------|-------------------------------------------|
| de, es, fr, hi, id, pt, ru, zs, zt | `acceptAllAndStart`, `denyAndAbandon`, `denyAndStart`, `keepCurrentPreference`, `unknownAvailableNote`, `unknownOptOutNote`, `optedOutAvailableWarning`, `qualifierRestartConfirm`, `qualifierChipAriaLabel`, `cancel` (10) |
| ja | `keepCurrentPreference`, `unknownAvailableNote`, `unknownOptOutNote`, `optedOutAvailableWarning`, `qualifierRestartConfirm`, `qualifierChipAriaLabel`, `cancel` (7) — `acceptAllAndStart`/`denyAndAbandon`/`denyAndStart` already Japanese |
| kr | `qualifierRestartConfirm`, `qualifierChipAriaLabel`, `cancel` (3) — all other `test` keys already Korean |

**Finding A-pre-3 — no `npm test` regression risk.** `tests/unit/test-entry-policy.test.ts`
and `tests/unit/use-test-entry-orchestrator.test.ts` assert i18n **key names**
(`labelKey: 'acceptAllAndStart'`), never resolved string values. No vitest unit test loads
locale JSON to assert a translated value. The E2E specs `consent-smoke.spec.ts` /
`qualifier-overlay.spec.ts` reference these strings but (a) are not run by any gate in this
session (`npm test` = vitest only; session-final excludes e2e), and (b) execute against
representative locales, so non-English value changes do not affect them.

### Decision log

- **Localize the full English set, not just the 4 named keys.** Prompt step 1 is explicit
  ("every key … whose value is an English string"); the named 4 are a stated minimum/floor and
  the gate is a floor check. Finding 8.2's risk ("mixed-language test-flow UI") is the same
  defect class for the consent CTA/note keys, so a partial fix would leave the smell. Safe per
  Finding A-pre-3.
- **Match each locale's existing register/tone** (de informal *du*; fr/ru/id formal; kr/ja
  polite; pt Brazilian *você*; zs uses 测试 / zt uses 測試 consistent with each file's existing
  landing copy).
- **`qualifierPending` left as `"—"`** in all locales (Finding A-pre-1).
- **No keys added or removed in Wave A.** (`overlayBack` is added in Wave B, a separate wave
  with explicit authorization.)

### Translation table (final values applied)

EN reference → localized. `qualifierPending` unchanged ("—") everywhere.

**de** — acceptAllAndStart: "Allen zustimmen und starten" · denyAndAbandon: "Ablehnen und
abbrechen" · denyAndStart: "Ablehnen und starten" · keepCurrentPreference: "Aktuelle
Einstellung beibehalten" · unknownAvailableNote: "Für ein besseres Erlebnis stimme bitte den
Bedingungen zu, um mit dem Test fortzufahren." · unknownOptOutNote: "Für ein besseres Erlebnis
stimme bitte den Bedingungen zu, bevor du mit dem Test fortfährst. Du kannst auch ohne
Zustimmung fortfahren." · optedOutAvailableWarning: "Dieser Test ist nur für Nutzer verfügbar,
die zugestimmt haben. Es tut uns leid, aber wenn du deine aktuelle Einstellung beibehältst,
kannst du diesen Test nicht durchführen." · qualifierRestartConfirm: "Ändern und neu starten" ·
qualifierChipAriaLabel: "Qualifizierer-Antworten ändern" · cancel: "Abbrechen"

**es** — "Aceptar todo y empezar" · "Rechazar y abandonar" · "Rechazar y empezar" · "Mantener
la preferencia actual" · "Para una mejor experiencia, acepta los términos para continuar con la
prueba." · "Para una mejor experiencia, acepta los términos antes de continuar con la prueba.
Aun así puedes continuar sin aceptar." · "Esta prueba solo está disponible para usuarios que
han aceptado. Lo sentimos, pero si mantienes tu preferencia actual, no podrás realizar esta
prueba." · "Cambiar y reiniciar" · "Cambiar las respuestas del calificador" · "Cancelar"

**fr** — "Tout accepter et commencer" · "Refuser et abandonner" · "Refuser et commencer" ·
"Conserver la préférence actuelle" · "Pour une meilleure expérience, veuillez accepter les
conditions afin de poursuivre le test." · "Pour une meilleure expérience, veuillez accepter les
conditions avant de poursuivre le test. Vous pouvez tout de même continuer sans accepter." ·
"Ce test n'est disponible que pour les utilisateurs ayant accepté. Nous sommes désolés, mais si
vous conservez votre préférence actuelle, vous ne pourrez pas passer ce test." · "Modifier et
recommencer" · "Modifier les réponses du qualificateur" · "Annuler"

**hi** — "सब स्वीकार करें और शुरू करें" · "अस्वीकार करें और छोड़ें" · "अस्वीकार करें और शुरू करें" · "मौजूदा
प्राथमिकता बनाए रखें" · "बेहतर अनुभव के लिए, कृपया टेस्ट जारी रखने के लिए शर्तों से सहमत हों।" · "बेहतर अनुभव
के लिए, कृपया टेस्ट जारी रखने से पहले शर्तों से सहमत हों। आप सहमत हुए बिना भी जारी रख सकते हैं।" · "यह टेस्ट
केवल उन उपयोगकर्ताओं के लिए उपलब्ध है जिन्होंने सहमति दी है। हमें खेद है, लेकिन यदि आप अपनी मौजूदा प्राथमिकता
बनाए रखते हैं, तो आप यह टेस्ट नहीं दे पाएंगे।" · "बदलें और फिर से शुरू करें" · "क्वालिफायर उत्तर बदलें" · "रद्द करें"

**id** — "Terima semua dan mulai" · "Tolak dan batalkan" · "Tolak dan mulai" · "Pertahankan
preferensi saat ini" · "Untuk pengalaman yang lebih baik, harap setujui ketentuan untuk
melanjutkan tes." · "Untuk pengalaman yang lebih baik, harap setujui ketentuan sebelum
melanjutkan tes. Anda tetap dapat melanjutkan tanpa menyetujui." · "Tes ini hanya tersedia
untuk pengguna yang telah menyetujui. Maaf, tetapi jika Anda mempertahankan preferensi saat
ini, Anda tidak akan dapat mengikuti tes ini." · "Ubah dan mulai ulang" · "Ubah jawaban
kualifikasi" · "Batal"

**ja** (7 keys) — keepCurrentPreference: "現在の設定を維持" · unknownAvailableNote: "より良い体験のため、
テストを続けるには規約に同意してください。" · unknownOptOutNote: "より良い体験のため、テストを続ける前に
規約に同意してください。同意しなくても続行できます。" · optedOutAvailableWarning: "このテストは同意した
ユーザーのみ利用できます。申し訳ありませんが、現在の設定を維持するとこのテストは受けられません。" ·
qualifierRestartConfirm: "変更して最初からやり直す" · qualifierChipAriaLabel: "資格設問の回答を変更" ·
cancel: "キャンセル"

**kr** (3 keys) — qualifierRestartConfirm: "변경하고 처음부터 다시 시작" · qualifierChipAriaLabel:
"사전 질문 답변 변경" · cancel: "취소"

**pt** — "Aceitar tudo e começar" · "Recusar e abandonar" · "Recusar e começar" · "Manter a
preferência atual" · "Para uma experiência melhor, aceite os termos para continuar o teste." ·
"Para uma experiência melhor, aceite os termos antes de continuar o teste. Você ainda pode
continuar sem aceitar." · "Este teste está disponível apenas para usuários que aceitaram.
Lamentamos, mas se você mantiver sua preferência atual, não poderá fazer este teste." ·
"Alterar e recomeçar" · "Alterar as respostas do qualificador" · "Cancelar"

**ru** — "Принять все и начать" · "Отклонить и выйти" · "Отклонить и начать" · "Сохранить
текущую настройку" · "Для лучшего опыта примите условия, чтобы продолжить тест." · "Для
лучшего опыта примите условия, прежде чем продолжить тест. Вы всё равно можете продолжить без
согласия." · "Этот тест доступен только пользователям, давшим согласие. К сожалению, если вы
сохраните текущую настройку, вы не сможете пройти этот тест." · "Изменить и начать заново" ·
"Изменить ответы квалификатора" · "Отмена"

**zs** — "全部接受并开始" · "拒绝并放弃" · "拒绝并开始" · "保持当前设置" · "为了获得更好的体验，请同意条款
以继续测试。" · "为了获得更好的体验，请在继续测试前同意条款。你也可以不同意继续。" · "此测试仅对已同意的
用户开放。很抱歉，如果你保持当前设置，将无法进行此测试。" · "更改并重新开始" · "更改资格问题答案" · "取消"

**zt** — "全部接受並開始" · "拒絕並放棄" · "拒絕並開始" · "保持目前設定" · "為了獲得更好的體驗，請同意
條款以繼續測試。" · "為了獲得更好的體驗，請在繼續測試前同意條款。你也可以不同意繼續。" · "此測試僅開放給
已同意的使用者。很抱歉，如果你保持目前設定，將無法進行此測試。" · "變更並重新開始" · "變更資格問題答案" ·
"取消"

### `[TODO: translate]` placeholders

**None.** All 11 locales are well-resourced languages translated with confidence. No
placeholder strings introduced.

### Gate

`npm test` — all unit tests pass. Plus: no locale file contains an unchanged English value for
the four named keys (`qualifierRestartConfirm`, `qualifierChipAriaLabel`, `qualifierPending`
[neutral "—"], `cancel`).

### Result

**PASS.** 11 locale files edited (de/es/fr/hi/id/pt/ru/zs/zt = 10 keys each; ja = 7 keys;
kr = 3 keys). All 12 locale JSON files parse. Verification grep for English remnants
(`"Accept all and start"`, `"Change and restart"`, `"Cancel"`, `"For a better experience…"`,
etc.) across the 11 files → none found. `npm test` → **69 files, 453/453 tests passed**
(5.08s). No `[TODO: translate]` placeholders introduced.

---

## Wave B — Hardcoded "Back" String in InstructionOverlay

### Pre-edit findings

`instruction-overlay.tsx` line 96: `{qualifierStep.backLabel ?? 'Back'}`. The component is
**purely presentational** — it has no `useTranslations`/`t` import and receives every label as
a prop (`title`, `primaryLabel`, `secondaryLabel`, `qualifierStep.backLabel`, …). The prompt's
step-3 premise ("the `t` function is already used in the file; do not add a new import") does
not hold for this file.

Caller: `test-question-client.tsx` line 382 builds `qualifierStep.backLabel` as
`overlayMode === 'reentry' ? t('cancel') : undefined`. Entry mode passes `undefined`, so the
overlay falls back to the English literal `'Back'`. `test-question-client.tsx` **does** use
`t = useTranslations('test')` (line 55) and is the only production caller. No dedicated unit
test exists for `instruction-overlay.tsx` (report Finding 7.1); no `tests/unit/**` asserts the
`'Back'` literal.

### Decision log (deviations per prompt §8 + CLAUDE.md "do not self-resolve silently")

- **Fix location deviation**: The hardcoded string is removed by (1) threading a localized
  `backLabel` from the i18n-aware caller `test-question-client.tsx` for entry mode, and (2)
  deleting the English literal fallback in `instruction-overlay.tsx`. This preserves the
  overlay's presentational architecture (no `useTranslations` added to a props-only component
  — which would itself be an unrequested architectural change and contradicts "do not add a
  new import"). The prompt's own note ("entry mode now falls through to … instead of the
  English literal") confirms the prop-threading model is intended.
- **i18n key deviation — new `overlayBack` key (not `t('prev')`)**: `prev` ("Previous") is
  semantically the **scoring-question** Previous-navigation control (`test-question-client.tsx`
  line 466, `test-prev-button`). The qualifier overlay back control is a distinct
  wizard-back/cancel affordance (`test-qualifier-back-button`, different test id, different
  handler `onQualifierBack`). Reusing `prev` would conflate two unrelated controls and risk
  future copy drift. The prompt's "Key decision" section explicitly authorizes creating
  `overlayBack` in all 12 locale files when `prev` is semantically wrong — it is. New key
  `overlayBack` added to **all 12** locale files (en + 11), localized (not English
  placeholders): en "Back", de "Zurück", es "Atrás", fr "Retour", hi "वापस", id "Kembali",
  ja "戻る", kr "뒤로", pt "Voltar", ru "Назад", zs "返回", zt "返回". (Adding a key in Wave B is
  not constrained by Wave A's "no new keys" rule — different wave, explicit authorization.)
- **`backLabel` stays optional** (`backLabel?: string`). Not promoted to required → no public
  API shape change (CLAUDE.md guardrail). The single production caller will always pass it; the
  overlay simply renders `{qualifierStep.backLabel}` with the literal removed.

### Planned edits

1. `test-question-client.tsx` line 382: `backLabel: overlayMode === 'reentry' ? t('cancel') : undefined`
   → `backLabel: overlayMode === 'reentry' ? t('cancel') : t('overlayBack')`.
2. `instruction-overlay.tsx` line 96: `{qualifierStep.backLabel ?? 'Back'}` → `{qualifierStep.backLabel}`.
3. Add `"overlayBack"` key to all 12 `src/messages/*.json` `test` namespaces (values above).
   Placed adjacent to `cancel` for locality.

### Gate

`npm test` — all unit tests pass. `grep -n '"Back"' src/features/test/instruction-overlay.tsx`
→ no match.

### Result

**PASS.** Three changes applied: (1) `test-question-client.tsx` line 382
`… : undefined` → `… : t('overlayBack')`; (2) `instruction-overlay.tsx` line 96
`{qualifierStep.backLabel ?? 'Back'}` → `{qualifierStep.backLabel}` (literal removed, no
import added, interface unchanged — `backLabel?` still optional); (3) `overlayBack` key added
to all 12 locale files adjacent to `cancel`, localized. `grep '"Back"'
instruction-overlay.tsx` → no match. `overlayBack` present & non-empty in all 12 locales.
`npm test` → **69 files, 453/453 tests passed** (4.33s).

---

## Wave C — Docs Status Correction

### Pre-edit findings

`docs/agent-guides/project-rules.md` § "Unimplemented / Stub Areas" (header line 119,
"Do not treat the following as completed contracts:" line 121) lists at **line 126**:
`- Question-level telemetry hooks`. This is the single stale bullet.

Current source reality: `trackQuestionAnswered` + `trackResultViewed` exist
(`src/features/telemetry/runtime.ts`), validated in `validation.ts`, unit-tested
(`tests/unit/telemetry-question-answered.test.ts`), Phase 11 QA enforces helper presence.
`question_answered` fires from `test-question-client.tsx` on each non-last scoring answer
(lines 245–255). `result_viewed` fires mount-based (temporary) from `TestResultPanel`.

`docs/plans/result-pipeline-todos.md` exists and documents the deferred work
("ResultViewedEvent.derived_type 실제 파생 타입 + IntersectionObserver 교체. trackResultViewed
마운트 임시 발화 제거", under "2위 result pipeline"). It will be cross-referenced.

### Decision log

- **Minimal surgical edit**: replace only line 126's bullet with an accurate status bullet.
  No section restructure, no other lines touched. The bullet stays inside "Unimplemented /
  Stub Areas" but is rescoped so the "do not treat as completed" framing now correctly applies
  **only** to the genuinely remaining deferred piece (real `derived_type` + IntersectionObserver
  replacement of the temporary mount fire), not to the implemented events.
- The rewritten bullet must not describe `question_answered`/`result_viewed` themselves as
  "unimplemented" or "pending" (gate check).

### Planned replacement (line 126)

`- Question-level telemetry hooks`
→
`` - Question-level telemetry: `question_answered` implemented (validated; `trackQuestionAnswered` runtime helper; Phase 11 QA-enforced; fires from `test-question-client.tsx` on each non-last scoring answer) and `result_viewed` implemented (validated; optional `derived_type`; temporary mount-based fire from `TestResultPanel`). Remaining deferred follow-up only: real `derived_type` + IntersectionObserver replacement of the temporary mount fire — tracked in `docs/plans/result-pipeline-todos.md`. ``

### Gate

`npm run qa:rules` — all 12 checks pass (no QA script anchors this doc; confirm no accidental
edit elsewhere). Manual: updated line contains neither "unimplemented" nor "pending" for the
two event types.

### Result

**PASS.** Single bullet at line 126 replaced (anchored between the response-projection
placeholder bullet and the history-persistence bullet — no other line touched, no section
restructure). New bullet states `question_answered`/`result_viewed` are implemented and scopes
the remaining deferred follow-up (real `derived_type` + IntersectionObserver replacement),
cross-referencing `docs/plans/result-pipeline-todos.md`. Manual grep of the updated block →
no "unimplemented"/"pending". `npm run qa:rules` → **all 12 checks passed** (Phase
1/4/5/6/7/8/9/10/11 + Variant registry + Variant-only + Blocker traceability).

---

## Wave D — Canonical Index Key Regex Deduplication

**Executed only after Waves A, B, C each pass their gates.**

### D-1 — Are the three regexes semantically identical?

| File | Line | Literal | Flags |
|------|------|---------|-------|
| `src/features/test/question-runtime-utils.ts` | 7 | `/^[1-9]\d*$/` | none |
| `src/features/test/storage/response-set.ts` | 6 | `/^[1-9]\d*$/` | none |
| `src/features/telemetry/validation.ts` | 6 | `/^[1-9]\d*$/u` | `u` |

**Conclusion: functionally identical match semantics.** The pattern uses only ASCII
constructs (`^`, `[1-9]`, `\d`, `*`, `$`). `\d` is always `[0-9]` in JS regardless of the `u`
flag. None use `g`/`y`, so there is no shared-`lastIndex` hazard from a module-level constant.
The `u` flag only enforces stricter *pattern* parsing (already-valid here) and stricter unicode
*input* handling; for `^[1-9]\d*$` (which rejects any non-`[0-9]` code unit, including lone
surrogates, identically with or without `u`) the accept/reject result is the same for every
input. **Canonical form chosen: `/^[1-9]\d*$/u`** — strictly-superset-safe and matches the
Gold Standard `validation.ts`'s existing choice, minimizing semantic risk for the Gold
Standard file.

### D-2 — Where should the shared constant live?

**Chosen: NEW `src/features/test/canonical-key.ts`** (zero-dependency single-purpose module),
exporting `export const CANONICAL_INDEX_KEY_PATTERN: RegExp = /^[1-9]\d*$/u;`.

Rationale (deviation note — prompt listed `question-runtime-utils.ts` as first candidate):
- `validation.ts` is correctly excluded by the prompt (telemetry must not own test-domain
  primitives).
- `question-runtime-utils.ts` imports `@/features/transition/store`,
  `@/features/test/question-bank`, `@/features/test/storage`. Importing the constant from
  there would pull that transitive graph into the **Gold Standard** `validation.ts` (currently
  type-only imports). That is an undesirable, backwards-heavy coupling for a payload-hygiene
  boundary.
- A dedicated zero-import module keeps every consumer's dependency surface minimal and is
  explicitly justified under CLAUDE.md's "<30 line file" exception (reused in 3 places **and**
  independently unit-testable).
- Location `src/features/test/canonical-key.ts` is outside the frozen perimeter
  (`src/features/test/domain/**`) and outside Ask-First/High-Risk paths.

### D-3 — All import / usage sites to update

Full `grep -rn "CANONICAL_INDEX_KEY" src/` result (no external importers; all definitions are
module-private, no `export`):

| File | Definition | Usage |
|------|-----------|-------|
| `question-runtime-utils.ts` | line 7 (`…_PATTERN`, no flags) | line 83 (`filterResponseSetForQuestions`) |
| `storage/response-set.ts` | line 6 (`…_PATTERN`, no flags) | line 28 (`filterResponseSet`) |
| `telemetry/validation.ts` | line 6 (`CANONICAL_INDEX_KEY`, `/u`) | line 169 (`final_submit` response-key check) |

Each file: remove the local `const` definition; add
`import {CANONICAL_INDEX_KEY_PATTERN} from '<rel-or-alias path>';`; rename the single in-file
reference where the name differs (`validation.ts` uses `CANONICAL_INDEX_KEY` → switch the
line-169 reference to `CANONICAL_INDEX_KEY_PATTERN`). No logic change. Import path: alias
`@/features/test/canonical-key` (consistent with existing `@/features/...` import style in all
three files).

### Task

1. Create `src/features/test/canonical-key.ts` exporting `CANONICAL_INDEX_KEY_PATTERN`.
2. Replace the three inline `const` definitions with the import.
3. Update the single reference in `validation.ts` from `CANONICAL_INDEX_KEY` to the imported name.
4. No other change.

### Gate

`npm test` (453+ tests, no regression) · `npm run qa:rules` (12 checks) ·
`grep -rn "positive.integer\|/\^\\\\d" src/features/test/question-runtime-utils.ts
src/features/test/storage/response-set.ts src/features/telemetry/validation.ts` → no inline
duplicate definitions (grep heuristic note: the literal is `/^[1-9]\d*$/`, which the prompt's
`/\^\\d` sub-pattern does not lexically match; the binding requirement is "no inline regex
*definition* remains; all three import the shared constant" — verified by re-running the
`grep -rn "CANONICAL_INDEX_KEY"` map and confirming each file has exactly one `import` line and
zero `const … = /…/`).

### Result

**PASS.** Created `src/features/test/canonical-key.ts` (2 lines: one contract comment + one
`export const CANONICAL_INDEX_KEY_PATTERN = /^[1-9]\d*$/u;`). Removed the three inline `const`
definitions; added the shared import to all three; renamed the single `validation.ts`
reference (`CANONICAL_INDEX_KEY` → `CANONICAL_INDEX_KEY_PATTERN`, line 169). Post-change
`grep -rn "CANONICAL_INDEX_KEY" src/` → exactly: 1 export (canonical-key.ts:2); import+usage
pairs in question-runtime-utils.ts (4, 82), response-set.ts (3, 27), validation.ts (2, 169);
**zero** remaining inline definitions. Prompt heuristic grep over the 3 consumer files →
empty. `npm test` → **69 files, 453/453 passed** (4.15s). `npm run qa:rules` → **all 12
checks passed**. No logic change; behavior byte-identical (D-1 confirmed identical match
semantics; canonical form standardized on `/u`).

---

## Verification Results (session-final)

| Gate | Command | Result |
|------|---------|--------|
| Wave A | `npm test` | **PASS** — 69 files, 453/453; no English remnants; JSON valid |
| Wave B | `npm test` + grep | **PASS** — 453/453; no `"Back"` literal; `overlayBack` in 12 locales |
| Wave C | `npm run qa:rules` + manual | **PASS** — 12/12 checks; no "unimplemented"/"pending" wording |
| Wave D | `npm test` + `npm run qa:rules` + grep | **PASS** — 453/453; 12/12; no inline duplicates |
| Final — lint | `npm run lint` | **PASS** — `eslint .` no findings |
| Final — typecheck | `npm run typecheck` | **PASS** — typegen + `tsc --noEmit` clean |
| Final — test | `npm test` | **PASS** — 69 files, 453/453 |
| Final — build | `npm run build` | **PASS** — `next build`, 52 static pages, all routes |
| Final — qa:rules | `npm run qa:rules` | **PASS** — all 12 contract checks |
| Final — whitespace | `git diff --check` | **PASS** — clean (no whitespace/conflict markers) |

**Session result: all four waves complete; all per-wave and session-final gates green.**
No production behavior change (Wave B corrects a previously-broken English fallback to a
localized label; Wave D is byte-identical match semantics; Waves A/C are translations/docs).

---

## Deferred Items

**None.** No wave was blocked; the frozen perimeter
(`src/features/test/domain/**`, `schema-registry.ts`, `response-projection.ts`,
`tests/e2e/qualifier-overlay.spec.ts`, prior `docs/plans/**`) was not touched by any wave.
Out-of-scope refactor targets from `docs/reports/2026-05-17-refactoring-candidates.md`
(Targets 1–7, A.1–A.4) remain untouched by design — not part of this S-effort set.
