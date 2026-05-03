# 0. Superseding Addendum — 2026-05-03 Follow-up Investigation

This addendum supersedes the earlier "R-01 hook extraction caused the theme-matrix
pixel drift" assumption in Sections 1, 5, and 6.

## 0-1. Updated conclusion

- The focused desktop GNB screenshot diff is **not introduced by R-01 hook extraction**.
- The same focused case fails with the same 5-pixel diff on all checked commits:
  - `8f65e28` — current latest commit on `codex/r-01-site-gnb-hook-extraction`
  - `08c2296` — pre-extraction parent of R-01
  - `df3143639acd3815ae4374293de4215422ec7bb1`
  - `40a915bfdf0520b512222d2f40d6217158ba6e1b`
  - `5dc4dd285948792e20dd89af97bd9eca115dad58`
- For the focused case, the generated actual PNG hash is identical across all checked
  commits:
  - actual: `77d4eb0da8204d081f6751bbc690bd02edda4edcd6e45d94ddded122f57a5c10`
- The compared local expected baseline hash is also unchanged across the checked commits:
  - expected: `be7c3b3a7b076b4a7868eae36875b21978a9b130ee8c98e307fe23acb327b7c2`
- Therefore the blocker is currently best classified as a **local theme-matrix baseline
  provenance / staleness issue**, not a production-code regression in `site-gnb.tsx` or
  the extracted hooks.

## 0-2. Evidence gathered

Focused command used:

```bash
PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/theme-matrix-smoke.spec.ts --grep "layout landing-normal en light desktop-wide" --reporter=html
```

Result on each checked commit: failed with `5 pixels` different for
`theme-layout-landing-normal-en-light-desktop-wide.png`.

Additional checks:

- SSR `gnb-shell` HTML captured from pre-extraction and post-extraction builds was
  byte-for-byte identical.
- `use-gnb-desktop-settings.ts` has one `settingsOpen` state and one pointerdown
  outside effect for settings behavior. The effect deps are `[closeSettingsImmediate,
  settingsOpen]`, matching the original inline implementation.
- `clearSettingsHoverCloseTimer` has an empty deps array and `closeSettingsImmediate`
  depends only on `clearSettingsHoverCloseTimer`.
- No settings hook effect calls `setState` unconditionally on mount.
- `settingsRootRef` is initialized as `useRef<HTMLDivElement | null>(null)`, returned
  directly from the hook, and attached directly as `ref={settingsRootRef}`.
- The diff bbox for the focused case remains in the desktop center nav glyph area
  (`History` / `Blog` text), not the settings trigger or trailing column.
- The focused actual PNG is byte-identical between `df31436`, `40a915b`, `5dc4dd2`,
  `08c2296`, and `8f65e28` under the same local environment.

## 0-3. Baseline provenance finding

The theme-matrix baseline PNGs used in the failure are not tracked by git in this
repository checkout:

```bash
git ls-files tests/e2e/theme-matrix-smoke.spec.ts-snapshots/theme-layout-landing-normal-en-light-desktop-wide-chromium-darwin.png
# no output

git check-ignore -v tests/e2e/theme-matrix-smoke.spec.ts-snapshots/theme-layout-landing-normal-en-light-desktop-wide-chromium-darwin.png
# .gitignore:9:tests/e2e/*-snapshots/
```

Relevant `.gitignore` entries:

```text
test-results/
playwright-report/
tests/e2e/*-snapshots/
```

The theme-matrix test file, local snapshot helper, and manifest also did not change
between `5dc4dd2` and `8f65e28`:

```bash
git diff 5dc4dd285948792e20dd89af97bd9eca115dad58..8f65e28 -- \
  tests/e2e/theme-matrix-smoke.spec.ts \
  tests/e2e/helpers/local-snapshot.ts \
  tests/e2e/theme-matrix-manifest.json
# no diff
```

This means commit checkout comparisons were all comparing each commit's generated
actual screenshot against the same ignored local baseline PNG. The earlier conclusion
that "baseline refresh is rejected because this is a confirmed R-01 regression" is no
longer supported by the evidence.

## 0-4. Updated next action

Do **not** write a production-code fix for this desktop nav glyph diff unless new
evidence shows current `8f65e28` actual output differs from an approved production
reference. The current code output is stable across the requested commit range.

To make the latest commit pass theme-matrix on this machine, choose and explicitly
authorize one baseline-provenance action:

1. Refresh/regenerate the ignored local theme-matrix baselines from the latest approved
   commit output.
2. Remove the stale ignored local theme-matrix baselines and let
   `expectLocatorToMatchLocalSnapshot()` create missing local baselines again.
3. Replace ignored local-only baselines with a tracked or documented baseline artifact
   workflow so future commit comparisons have a stable source of truth.

The original Section 6 fix protocol remains useful only as a historical investigation
record. It should not be followed as an implementation directive unless the baseline
provenance issue is first resolved and a new actual-output regression is reproduced.

## 0-5. Resolution

- Baseline provenance confirmed as root cause; the theme-matrix blocker was not an
  R-01 production regression.
- Stale local baselines were deleted and regenerated from commit
  `8f65e2805fff94ac726c3be251c2cd20f1f1a0c7`.
- `BASELINE_PROVENANCE.md` was written to
  `tests/e2e/theme-matrix-smoke.spec.ts-snapshots/`.
- `qa:gate:once`: PASS.
- R-01 task status: COMPLETE.

## 0-6. Cleanup Documentation Follow-up

- Cleanup 4/5 documentation was added in `tests/e2e/README.md`.
- It records the local browser setup requirement:
  `npx playwright install chromium webkit`.
- It also records the theme-matrix local baseline regeneration command and the
  local `BASELINE_PROVENANCE.md` fields.
- This is intentionally a lightweight local workflow until T-01 introduces a
  durable baseline artifact process.

# 1. Session Summary

R-01 hook extraction has been implemented on branch `codex/r-01-site-gnb-hook-extraction`: desktop settings behavior, mobile menu behavior, and route-aware back navigation were extracted from `src/features/landing/gnb/site-gnb.tsx` into three focused hooks, while `site-gnb.tsx` retained the JSX, class constants, keyboard routing, Escape priority, cleanup coordination, locale switching, and theme switching. The later theme-matrix failure was resolved as a local baseline provenance issue, not an R-01 production regression. `qa:gate:once` is now passing; Cleanup 4/5 setup and baseline-regeneration notes are recorded in `tests/e2e/README.md`.

# 2. Completed Work (R-01 Hook Extraction)

- `src/features/landing/gnb/hooks/use-gnb-desktop-settings.ts`
  - Change type: created
  - Summary: Added `useGnbDesktopSettings()` to own desktop settings state, root ref, hover close timer, hover/focus/click open paths, blur close, and pointerdown-outside close behavior.

- `src/features/landing/gnb/hooks/use-gnb-mobile-menu.ts`
  - Change type: created
  - Summary: Added `useGnbMobileMenu()` to own mobile menu state, trigger ref, animated close timer/reason, outside gesture cancellation, immediate close, backdrop pointer handlers, and body scroll lock.

- `src/features/landing/gnb/hooks/use-gnb-back-navigation.ts`
  - Change type: created
  - Summary: Added `useGnbBackNavigation()` to own mobile test back fallback timing, previous internal path tracking, sessionStorage updates, standard back behavior, and localized fallback routing.

- `src/features/landing/gnb/site-gnb.tsx`
  - Change type: modified
  - Summary: Removed in-component desktop settings state/refs/effects/callbacks, mobile menu state/refs/effects/callbacks, and route-aware back-navigation state/refs/effects/callbacks; retained JSX, class name constants, `isVisibleFocusableElement`, keyboard routing helpers/effects, Escape priority effect, cleanup effect, `handleLocaleChange`, theme switching, and all visible DOM structure.

- `src/features/landing/gnb/hooks/index.ts`
  - Change type: modified
  - Summary: Added barrel exports for `useGnbBackNavigation`, `useGnbDesktopSettings`, and `useGnbMobileMenu`, while preserving existing `useGnbCapability` and `useThemePreference` exports.

- `src/features/landing/storage/storage-keys.ts`
  - Change type: comment-only
  - Summary: Updated ownership comments for `SESSION_STORAGE_KEYS.CURRENT_PATH` and `SESSION_STORAGE_KEYS.PREVIOUS_PATH` from `src/features/landing/gnb/site-gnb.tsx` to `src/features/landing/gnb/hooks/use-gnb-back-navigation.ts`.

- `docs/plans/2026-05-02-r-01-site-gnb-hook-extraction.md`
  - Change type: created
  - Summary: Added the approved R-01 implementation plan and updated it through execution status; it is the plan of record for the completed hook extraction and the verification expectations.

- `docs/project-analysis.md`
  - Change type: modified
  - Summary: Updated the GNB subsystem analysis, GNB/theme task entry guide, and risk notes to reflect that `site-gnb.tsx` is now about 587 lines and focused hooks own desktop settings, mobile menu, and back navigation.

# 3. Current Hook API (exact return types)

```ts
// src/features/landing/gnb/hooks/use-gnb-desktop-settings.ts
function useGnbDesktopSettings(options: {
  hoverOpenEnabled: boolean;
  viewportWidth: number;
  hoverCapable: boolean;
}): {
  settingsOpen: boolean;
  settingsRootRef: RefObject<HTMLDivElement | null>;
  openSettingsImmediate: () => void;
  toggleSettingsOpen: () => void;
  closeSettingsImmediate: () => void;
  clearSettingsHoverCloseTimer: () => void;
  desktopSettingsEnter: () => void;
  desktopSettingsLeave: () => void;
  desktopSettingsBlurCapture: () => void;
}
```

```ts
// src/features/landing/gnb/hooks/use-gnb-mobile-menu.ts
type CloseReason = 'button' | 'outside' | 'escape';

function useGnbMobileMenu(): {
  mobileMenuState: MobileMenuState;
  mobileMenuTriggerRef: RefObject<HTMLButtonElement | null>;
  setMobileMenuOpen: () => void;
  requestMobileMenuClose: (reason: CloseReason) => void;
  closeMobileMenuImmediate: () => void;
  clearMobileMenuCloseTimer: () => void;
  mobileMenuBackdropPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  mobileMenuBackdropPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  mobileMenuBackdropPointerEnd: () => void;
}
```

```ts
// src/features/landing/gnb/hooks/use-gnb-back-navigation.ts
type AppRouter = ReturnType<typeof useRouter>;

function useGnbBackNavigation(options: {
  pathname: string;
  homeHref: LocalizedRoutePath;
  router: AppRouter;
}): {
  handleTestBack: () => void;
  handleStandardBack: () => void;
  clearMobileBackFallbackTimer: () => void;
}
```

# 4. Gate Status

| Check              | Status  | Notes                                      |
|--------------------|---------|--------------------------------------------|
| lint               | PASS    |                                            |
| typecheck          | PASS    |                                            |
| qa:rules           | PASS    |                                            |
| build              | PASS    |                                            |
| unit tests         | PASS    | 50 files / 275 tests                       |
| webkit ghosting    | PASS    | 6/6 after `npx playwright install webkit`  |
| theme-matrix smoke | PASS    | 168/168 after local baseline regeneration  |
| qa:gate:once       | PASS    | full gate passed after baseline resolution |

# 5. Historical Failure Detail (superseded by §0-5)

## 5-1. Failure count and scope

- Total failing snapshots: 26
- Initially suspected regression: top-GNB pixel drift in the desktop nav text area.
- Final classification: superseded by §0-1 through §0-5; actual output was stable and the root cause was stale local baseline provenance.
- Exact snapshot names that show top-GNB pixel drift in the HTML diff / PNG artifact analysis:
  - `theme-layout-landing-normal-en-light-desktop-wide.png`
  - `theme-layout-blog-default-en-light-desktop-wide.png`
  - `theme-layout-history-default-en-light-desktop-wide.png`
  - `theme-state-landing-test-expanded-en-light-desktop-wide.png`
  - `theme-state-landing-blog-expanded-en-light-desktop-wide.png`
  - `theme-state-landing-settings-open-en-light-desktop-wide.png`
  - `theme-state-blog-settings-open-en-light-desktop-wide.png`
  - `theme-state-history-settings-open-en-light-desktop-wide.png`

- Full failing snapshot set from the `npm run qa:gate:once` smoke run:
  - `theme-layout-landing-normal-en-light-desktop-wide.png`
  - `theme-layout-landing-normal-kr-dark-desktop-wide.png`
  - `theme-layout-blog-default-en-light-desktop-wide.png`
  - `theme-layout-history-default-en-light-desktop-wide.png`
  - `theme-state-landing-test-expanded-en-light-desktop-wide.png`
  - `theme-state-landing-test-expanded-kr-dark-desktop-wide.png`
  - `theme-state-landing-blog-expanded-en-light-desktop-wide.png`
  - `theme-state-landing-blog-expanded-kr-dark-desktop-wide.png`
  - `theme-state-landing-settings-open-en-light-desktop-wide.png`
  - `theme-state-landing-settings-open-en-dark-desktop-wide.png`
  - `theme-state-landing-settings-open-kr-light-desktop-wide.png`
  - `theme-state-landing-settings-open-kr-dark-desktop-wide.png`
  - `theme-state-blog-settings-open-en-light-desktop-wide.png`
  - `theme-state-blog-settings-open-en-dark-desktop-wide.png`
  - `theme-state-blog-settings-open-kr-light-desktop-wide.png`
  - `theme-state-blog-settings-open-kr-dark-desktop-wide.png`
  - `theme-state-history-settings-open-en-light-desktop-wide.png`
  - `theme-state-history-settings-open-en-dark-desktop-wide.png`
  - `theme-state-history-settings-open-kr-light-desktop-wide.png`
  - `theme-state-history-settings-open-kr-dark-desktop-wide.png`
  - `theme-state-mobile-landing-menu-open-en-dark-mobile.png`
  - `theme-state-mobile-landing-menu-open-kr-dark-mobile.png`
  - `theme-state-mobile-blog-menu-open-en-dark-mobile.png`
  - `theme-state-mobile-blog-menu-open-kr-dark-mobile.png`
  - `theme-state-mobile-history-menu-open-en-dark-mobile.png`
  - `theme-state-mobile-history-menu-open-kr-dark-mobile.png`

## 5-2. Pixel coordinates of confirmed GNB regression

- Desktop nav text area: `x=715-744, y=29-32` (`History` / `Blog` links, top ~64px)
- Settings panel open state: `x=1073-1078, y=155-159`
- Mobile theme control (lower priority): one-pixel diff, `mobileMenuState === 'open'`

## 5-3. Historical root cause hypotheses (superseded; not pursued)

1. `useCallback` deps instability in `use-gnb-desktop-settings.ts` causing extra render cycle (`clearSettingsHoverCloseTimer` may have incorrect deps, causing `closeSettingsImmediate` to be recreated each render, triggering effect re-execution).
2. Rendered HTML attribute difference (`data-*` or `aria-*` value type change).
3. `settingsRootRef` attachment timing difference.

## 5-4. Superseded rejected actions

- Baseline refresh rejection is superseded; stale local baselines were deleted and regenerated in §0-5.
- Cleanup 5 threshold relaxation remains not adopted; provenance documentation replaced threshold loosening.

# 6. Historical Investigation Protocol (do not execute for current R-01)

The protocol below is retained only as historical context for the pre-resolution
state. For current R-01 follow-up work, use §0-5, §0-6, and `tests/e2e/README.md`.
Do not write a production fix or repeat this protocol unless a new actual-output
regression is reproduced after the local baseline provenance workflow is in place.

```md
# Superseded Historical Protocol: Desktop GNB pixel drift after hook extraction

## Superseded historical assumptions
- 26 theme-matrix snapshots fail; top-GNB diff at x=715-744, y=29-32 (History/Blog nav text)
- Affects all desktop-wide page variants with settingsOpen === false (normal state)
- Also: settings-panel open variants at x=1073-1078, y=155-159
- Mobile one-pixel diff at mobile theme control area (separate, lower priority)
- This assumption is superseded; current regeneration must follow tests/e2e/README.md.

## Investigation Protocol (complete all steps before writing any fix)

### Step 1 — Rendered HTML diff
Run the app in preview mode and capture the rendered HTML of the desktop GNB:

  git stash   # temporarily restore pre-extraction state
  npm run build && npm run start
  # capture: curl http://localhost:3000/en | grep -A 200 'gnb-shell'  > before.html

  git stash pop   # restore hook-extracted state
  npm run build && npm run start
  # capture: curl http://localhost:3000/en | grep -A 200 'gnb-shell'  > after.html

  diff before.html after.html

Report: are there any differences in rendered attributes, element count, class names,
or aria attributes in the desktop GNB area? Even a data-* attribute change is relevant.

### Step 2 — Extra render cycle check
In use-gnb-desktop-settings.ts, count how many useState and useEffect calls exist.
In the original site-gnb.tsx (pre-extraction, via git), count the same for the
settingsOpen state and its effects.

Check specifically:
- Does the hook's pointerdown-outside useEffect have the correct deps array
  ([closeSettingsImmediate, settingsOpen]) and does it match the original?
- Does any effect in the hook call setState unconditionally on mount
  (which would cause an extra render)?

### Step 3 — Ref attachment timing
The original settingsRootRef was declared inline in SiteGnb.
The hook returns settingsRootRef and site-gnb.tsx attaches it via ref={settingsRootRef}.

Confirm: is settingsRootRef typed as RefObject<HTMLDivElement | null> in the hook return,
and does the JSX in site-gnb.tsx attach it without any wrapper or conditional?

### Step 4 — Narrow the failing slice
Before a full gate run, isolate the diff:

  npx playwright test theme-matrix-smoke \
    --grep "theme-layout-landing-normal-en-light-desktop-wide" \
    --reporter=html

Open the HTML report diff view and identify the exact DOM element in the before/after
screenshot that moved. Is it the nav <a> text, the settings trigger button, or the
layout of the trailing column?

---

## Fix Protocol (based on Step 1-4 findings)

### If Step 1 finds HTML attribute or element differences:
Patch site-gnb.tsx or the hook so the rendered HTML is byte-for-byte identical
to the pre-extraction baseline. Common causes:
  - A data-* attribute is now undefined instead of omitted (renders as data-x="undefined")
  - aria-expanded receives a different value type (boolean vs string)
  - An effect causes an extra setState on mount, producing a second render that
    the screenshot captures instead of the first

### If Step 2 finds an extra render cycle:
The likely cause is closeSettingsImmediate being recreated on every render because
its useCallback deps are unstable. Fix:

  In use-gnb-desktop-settings.ts, verify clearSettingsHoverCloseTimer's useCallback
  has an empty deps array [] (it only reads a ref, never state).
  Verify closeSettingsImmediate's deps is [clearSettingsHoverCloseTimer] only.

  If clearSettingsHoverCloseTimer was mistakenly given [settingsHoverCloseTimerRef]
  as a dep (ref objects should never be in deps), remove it.

### If Step 3 finds a ref attachment issue:
Ensure settingsRootRef in the hook is initialized as:
  const settingsRootRef = useRef<HTMLDivElement | null>(null);
and returned directly without wrapping. No useMemo or useCallback around it.

### If Step 4 shows the trailing column shifted right/left by 1-2px:
The layout engine is reacting to a width change in the settings root div.
Check if gnbSettingsRootClassName or any inline style on the settings root
div changed between before and after extraction.

---

## Mobile one-pixel diff (lower priority, fix after desktop is resolved)
The mobile diff at the theme control area with mobileMenuState === 'open'
may follow the same pattern (extra render cycle in use-gnb-mobile-menu.ts).
Apply the same useCallback deps audit to clearMobileMenuCloseTimer and
completeMobileMenuClose after the desktop regression is fixed.

---

## Verification sequence (run in this order, not full gate first)

1. npx playwright test theme-matrix-smoke \
     --grep "desktop-wide" \
     --reporter=html
   → Confirm zero desktop-wide failures before proceeding.

2. npx playwright test theme-matrix-smoke \
     --reporter=html
   → Confirm all 26 previously failing snapshots now pass.

3. npm run qa:gate:once
   → Full gate must pass with zero failures.

Current R-01 work must not execute this protocol; use tests/e2e/README.md for
future baseline regeneration.
Report findings from Steps 1-4 before writing any fix code.
```

# 7. Key Design Decisions (for context only — do not re-litigate)

- JSX retained in `site-gnb.tsx`: changed scope keeps verification scope narrow.
- Keyboard routing retained in `site-gnb.tsx`: deferred to R-01b due to cross-dependency with DOM classes.
- Escape effect retained in `site-gnb.tsx`: mobile + settings priority must be coordinated in one listener.
- Cleanup effect retained in `site-gnb.tsx`: aggregates all three hook timers.
- Hooks directory: `src/features/landing/gnb/hooks/` (R-06 will relocate to `src/features/gnb/hooks/`).
- Each hook gets its own `@future-move R-06` comment block below `'use client'`: future ownership move remains documented without changing runtime behavior.
- QA scripts: not modified, because only aria-label checks still read `site-gnb.tsx` directly.
- Test files: not modified during R-01.

# 8. Out of Scope for Next Agent

- Do not modify any test files.
- Do not refresh theme-matrix baselines without following `tests/e2e/README.md`.
- Cleanup 4/5 documentation is complete; remaining cleanup items are outside this handoff.
- Do not touch keyboard routing logic; it is deferred to R-01b.
- Do not start R-02 or any other refactoring item.

# 9. Environment Notes

- WebKit installed: `webkit-2227` via `npx playwright install webkit`.
- WebKit ghosting smoke: confirmed 6/6 pass; do not re-investigate.
- Dev-mode noise: Next dev badge appears in screenshots; use preview/build mode for theme-matrix.
