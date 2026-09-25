# ViveTest from-scratch cutover — git refs, deploy freeze, sync pipeline

Investigator report, read-only. Measured 2026-09-26 (KST ~02:30) on the Mac mini (`scutil --get ComputerName` = `Mac mini`). Nothing under `/Users/woohyeon/Local/ViveTest` or the prototype scratchpad was modified; no `gh api` write, no push, no ref creation.

## 0. Scorecard (work order)

| # | Item | Recommendation | Owner actions (recurring) | Effort | Effect | Severity if skipped |
|:--|:--|:--|:--:|:--:|:--:|:--:|
| 1 | Production freeze during rebuild | `vercel.json` in the new main with `git.deploymentEnabled.main=false` **and** an `ignoreCommand` that cancels any `VERCEL_ENV=production` build (belt and braces) | 0 | S | High | Critical — the first rebuild landing would otherwise replace the live site |
| 2 | Legacy preservation | Annotated tag `legacy/gen2-final` + branch `legacy/gen2`, both at the squash parent P, pushed **atomically** with the landing | 0 | S | High | High |
| 3 | `sync.yml` | Remove it from the new main tree (it has failed 209/209 runs and never committed anything); keep the three repo secrets | 0 | XS | Medium | Medium (a red X + failure mail on every main push) |
| 4 | Landing form | One squash commit S whose parent is P; `git push --atomic` of main + legacy branch + legacy tag; no force push | 0 | S | High | High |
| 5 | Rehearsal probe | Before the cutover, prove both Vercel skip mechanisms on a throwaway `claude/vercel-freeze-probe` branch | 0 | S | High (removes the only unverified assumption) | Medium |
| 6 | Previews for `claude/*` rebuild branches | Keep (SSO-protected, the only way to see the mobile rebuild on a phone before launch) | 0 | — | Medium | Low |
| 7 | Guard against losing the freeze | The foundation's unit tests assert the freeze keys in `vercel.json`; `vercel.json` is Ask-First in the new `AGENTS.md` | 0 | XS | High | Critical (a scaffold that overwrites `vercel.json` silently launches a half-built app) |
| 8 | Ref immutability (optional) | GitHub rulesets locking `refs/heads/legacy/**` and `refs/tags/{legacy,anchor}/**` | 1 approval, then 0 | XS | Medium | Low |
| 9 | Stale GitHub homepage | `homepage` field points at a dead alias; real production domain is `https://vivetest.vercel.app` | 1 approval | XS | Low | Low |

Owner labour in the recommended path is **0 recurring actions**; the only owner touch is the plan approval that any Ask-First change (`vercel.json`, deletion of `.github/workflows/sync.yml`, `AGENTS.md`, `package.json`) already requires under `AGENTS.md §4`.

## 1. Current state (evidence)

### 1.1 Correction to the task premise — the production URL

The GitHub repo `homepage` is `https://vibe-test-pearl.vercel.app` (`gh repo view vvoohyeon/ViveTest --json homepageUrl`). That host is dead: `curl -sI https://vibe-test-pearl.vercel.app/` → `HTTP/2 404`, `x-vercel-error: DEPLOYMENT_NOT_FOUND`.

The live production domain is **`https://vivetest.vercel.app`**. Evidence: `https://vivetest.vercel.app/en` returns `<title>ViveTest</title>` and `<html data-theme="light" lang="en">`, and its `<link rel="canonical" href="https://vivetest.vercel.app/en"/>` plus twelve `hrefLang` alternates are produced by `resolveSiteOrigin()` (`src/config/site.ts:183-201`), which reads `NEXT_PUBLIC_SITE_URL` then `VERCEL_PROJECT_PRODUCTION_URL` — i.e. the build itself reports this host as the project's production URL. The Vercel project is `vvoohyeons-projects/vive-test` (commit-status `target_url` `https://vercel.com/vvoohyeons-projects/vive-test/2n4zdUTVtwDZymDyGVeiGkkjRYb7` on `20f973a`). Note `vive-test.vercel.app` and `vibe-test.vercel.app` both answer 200 with `<title>Create Next App</title>` — they are unrelated projects, not ours.

Production asset fingerprint at measurement time (sorted unique `/_next/static/...(js|css)` list of `/en`, SHA-256 first 16 hex): **`63afd6dcdf24fe6d`**, identical on two consecutive fetches. The cutover verification below compares against this value (re-measure it at pre-flight; it changes whenever a new production build lands).

Deployment URLs (`vive-test-*-vvoohyeons-projects.vercel.app`) answer `302` to `https://vercel.com/sso-api?...` — Vercel Authentication (deployment protection) is on for generated URLs, while the production alias is public.

### 1.2 What serves production now

GitHub deployments created by `vercel[bot]` (`gh api repos/vvoohyeon/ViveTest/deployments`): the latest `Production` deployment is id `6629072882`, sha `20f973a90f3f595833d6a3763ab907abef8e4616`, created `2026-09-24T02:49:21Z`, status `success`, `environment_url` `https://vive-test-3o8hgx56a-vvoohyeons-projects.vercel.app`. Previous productions: `b735819` (2026-09-19), `5818f73` (2026-09-18). In the last 100 deployment records (2026-09-15 → 2026-09-24): 84 Preview, 16 Production. `origin/main` = `20f973a` (`git ls-remote origin`), so **production currently serves `20f973a`** unless someone performed a dashboard rollback (not observable without Vercel auth; the fingerprint check in §6 makes it observable).

No `vercel.json`, `vercel.ts` or `.vercelignore` has ever existed in any ref (`git log --all -- vercel.json vercel.ts .vercelignore` → empty). All Vercel behaviour today is dashboard defaults: every branch push deploys, `main` is the production branch.

### 1.3 Refs

`git -C /Users/woohyeon/Local/ViveTest ls-remote origin` (complete):

| Ref | SHA | Note |
|:--|:--|:--|
| `refs/heads/main` | `20f973a` | default branch; 357 commits; 950 tracked files; pack 47.53 MiB |
| `refs/heads/legacy/reference` | `d3305b7` | BQ-14 pre-rebuild baseline (2026-05-20), ancestor of main (main is 97 commits ahead) |
| `refs/heads/codex/GS-Sync-GroupB1` | `a1ac8d1` | 2026-04-24, ancestor of main (fully merged) |
| `refs/heads/codex/finding-5-6-bootstrap-resolver` | `ea8c15b` | 2026-05-20, ancestor of main |
| `refs/heads/codex/tailwind-v4-checkpoint-1` | `5bbf10d` | 2026-04-21, ancestor of main |
| `refs/pull/1/head` | `15bb595` | GitHub-managed, PR #1 (closed, merged 2026-05-11); cannot be deleted |
| `refs/tags/anchor/w01-02-card-structure` | tag `60348a7` → `66bc50c` | annotated, tagger vvoohyeon |
| `refs/tags/anchor/w03-06-card-expanded` | tag `3675614` → `afe7077` | annotated |
| `refs/tags/anchor/w07-10-blog-unavailable-grid` | tag `d754cca` → `afe7077` | annotated |
| `refs/tags/anchor/w11-14-landing-stable` | tag `acabb66` → `afe7077` | annotated |
| `refs/tags/anchor/w15-17-gnb-theme-mobile` | tag `54ea76b` → `afe7077` | annotated |

No live session branches: `git ls-remote --heads origin 'claude/*'` → empty. Open PRs: **none** (`gh api repos/vvoohyeon/ViveTest/pulls?state=open` → `[]`). Releases: 0. GitHub Pages: not enabled (404).

Repo settings: `PUBLIC`; `main` not protected (`/branches/main/protection` → 404 "Branch not protected"); rulesets `[]`; no repo webhooks listed; Actions enabled, `allowed_actions: all`; GitHub environments `Production` (2026-03-12) and `Preview` (2026-04-15), both without protection rules (created by the Vercel integration). Actions secrets (names only): `GOOGLE_SHEETS_SA_KEY` (2026-04-02, updated 2026-04-27), `GOOGLE_SHEETS_ID_LANDING`, `GOOGLE_SHEETS_ID_QUESTIONS` (both 2026-04-27).

### 1.4 The `sync.yml` pipeline

`.github/workflows/sync.yml` (the repo's only workflow, id `265685153`, state `active`): `on: push: branches: [main]`, `permissions: contents: write`, steps checkout (`fetch-depth: 0`) → `setup-node@v4` Node 22 with npm cache → `npm ci` → set git identity `github-actions[bot]` → `npm run sync` with the three secrets.

What `npm run sync` does (`package.json` script `vite-node -c ./vitest.config.ts scripts/sync/sync.ts`; `scripts/sync/sync.ts:97-171`): loads the landing sheet and the questions workbook from Google Sheets, runs `validateCrossSheetIntegrity` (exits 1 on mismatch), builds the registry, serializes it, and if it differs from `src/features/variant-registry/variant-registry.generated.ts` writes that file, then `git add` + `git commit -m "chore: sync variant registry from Sheets [skip ci]"` + `git push` straight to main (on failure it restores the file and exits 1).

It has **never succeeded in CI**: all 209 runs since creation (2026-04-24 → 2026-09-24) concluded `failure` (`gh api .../actions/runs` pages 1–3, `status=success` total_count `0`). Every sampled run fails at step `Install dependencies`. The latest log (job `107472597869`, run `35948788650`, Node `v22.23.2`, npm `10.9.8`) shows `npm error code EUSAGE` — "`npm ci` can only install packages when your package.json and package-lock.json ... are in sync" — `Missing: @swc/helpers@0.5.23 from lock file`. Cause: the lockfile pins `node_modules/@swc/helpers` `0.5.15` (wanted by `next`), while `next-intl/node_modules/@swc/core` declares peer `@swc/helpers >=0.5.17`; the local toolchain (node `v24.2.0`, npm `11.5.2`) accepts the lock, CI's npm 10 does not. The only sync commit that ever landed, `65ccab5` (2026-04-24), was made locally by vvoohyeon, not by the bot. The Vercel build (which uses its own install) is unaffected — every recent deployment is `success`.

Side effects today: a failed `sync` check-run on every main commit (e.g. `20f973a` check-runs: `sync` `failure`), and — under GitHub's default Actions notification setting, which sends failed-run mail to the person who triggered the run — very likely a failure mail to the owner on every push (not verified from here). Also flagged by annotations: actions `checkout@v4`/`setup-node@v4` target the deprecated Node 20 runtime, and `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19.

### 1.5 Local branches in the primary checkout (report only — do not touch)

| Local branch | Tip | Date | Upstream | vs main |
|:--|:--|:--|:--|:--|
| `Codex5.3-Phase6.1` | `10a9f78` | 2026-03-06 | none | merged (ancestor) |
| `codex/phase-7` | `10a9f78` | 2026-03-06 | none | merged |
| `codex/hero` | `05a5268` | 2026-03-22 | none | merged |
| `codex/tailwind-v4-checkpoint-1` | `5bbf10d` | 2026-04-21 | origin (exists) | merged |
| `codex/finding-5-6-bootstrap-resolver` | `ea8c15b` | 2026-05-20 | origin (exists) | merged |
| `claude/Quality-Improvement-S` | `20c33be` | 2026-05-17 | none | merged |
| `claude/Targe7CoverageBundle` | `0d9cb9b` | 2026-05-17 | none | merged |
| `legacy/reference` | `d3305b7` | 2026-05-20 | not configured (origin has it at same SHA) | merged |
| `codex/GS-Sync-preparation` | `94532b5` | 2026-04-21 | origin **gone** | **1 unique commit** "Docs update" (6 files, +198/−1277) |
| `codex/GS-Sync-postRefactor` | `7ee3126` | 2026-04-25 | origin **gone** | **1 unique commit** "fix: stabilize preview global not-found routing" (10 files) |
| `codex/gnb-theme-hover-control` | `5198fb8` | 2026-04-30 | origin **gone** | **1 unique commit** "Restructure AGENTS.md; add agent guides" (13 files) |
| `codex/backup-main-before-origin-sync-20260513` | `1785cd5` | 2026-05-12 | none | **1 unique commit** "Add test entry orchestrator and wire client" (9 files) |

The four branches with one unique commit each exist **only on this machine** (their upstreams are gone and `git cherry` shows the patches are not in main). They are legacy-era work and irrelevant to the rebuild, but deleting them is irreversible; if they are ever cleaned up, tag them first (e.g. `legacy/local/<name>`). Whether the other machine (SDS-MacBook-Pro) holds more such branches cannot be seen from here.

Tracked debris that the cutover will drop: `.playwright-mcp/` (3 tracked MCP dump files). Ignored local artefacts in the primary checkout (`node_modules/`, `.next/`, `output/`, `playwright-report/`, `test-results/`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, `.env.local`, many `.DS_Store`) survive any pull of the new main as long as the new `.gitignore` still ignores them (see §9).

## 2. Vercel behaviour that the procedure relies on (documentation, quoted)

- `git.deploymentEnabled` — "Type: `Object` of key branch identifier `String` and value `Boolean`, or `Boolean`. Default: `true`. Specify branches that should not trigger a deployment upon commits. By default, any unspecified branch is set to `true`." Globs use minimatch ("Use minimatch syntax to define behavior for multiple branches"); "If a branch matches multiple rules and at least one rule is `true`, a deployment will occur."; `"deploymentEnabled": false` turns off all automatic deployments. (vercel.com/docs/project-configuration/git-configuration, last_updated 2026-08-25.) The page does **not** say whether a skipped push posts a commit status — decided by the probe in §6.1.
- `ignoreCommand` — "When the command exits with code 1, the build will continue. When the command exits with 0, the build is ignored." (vercel.com/docs/project-configuration/vercel-json §ignoreCommand). Project settings: the command "is executed within the Root Directory and can access the System Environment Variables that are available at build time"; exit 0 → "the build is immediately aborted, and the deployment state is set to `CANCELED`"; "Canceled builds are counted as full deployments ... count towards your deployment quotas". `VERCEL_ENV` is available at build time with values production / preview / development (vercel.com/docs/project-configuration/project-settings §Ignored Build Step; vercel.com/docs/git/vercel-for-github §System environment variables).
- Same-SHA dedup — "If the SHA of the commit was already deployed in the past, no new Deployment is created. In that case, the last Deployment matching that SHA is returned instead." (project-settings §Ignored Build Step). Consequence: pushing `legacy/gen2` at an already-deployed SHA creates no build.
- Production domains move only on a successful build — "Once the build completes successfully: ... A unique deployment URL is generated for Preview or updated for Production domains." (vercel.com/docs/builds §Build output and deployment). A failed or canceled production build therefore leaves the current production deployment serving.
- Tags do not deploy through the Git integration (vercel.com/kb/guide/can-you-deploy-based-on-tags-releases-on-vercel).
- Instant Rollback — "After a rollback, Vercel turns off auto-assignment of production domains. This means new pushes to your production branch won't replace the rolled-back deployment." Undo by promoting a deployment (dashboard **Undo Rollback**, or `vercel promote <deployment>`), which "re-enables auto-assignment". "Hobby users can roll back to the immediately previous deployment"; Pro/Enterprise to any deployment previously aliased to production (vercel.com/docs/instant-rollback, last_updated 2026-07-07).
- Retention — Hobby default 30 days for every class, but a deployment is kept while "The deployment has a production alias assigned to it", and Hobby additionally keeps the last 3 Ready production deployments (vercel.com/docs/deployment-retention, last_updated 2026-09-16). So the frozen legacy production deployment cannot expire during the rebuild, however long it takes.
- Queueing — "if Vercel is already building a previous commit on the same branch, the current build will complete and any commit pushed during this time will be queued ... the other queued builds will be cancelled" (vercel-for-github §A Deployment for Each Push). Hence the pre-flight waits for P's production build to finish before pushing S.
- Hobby: "only the account owner can trigger deployments" (vercel.com/kb/guide/why-aren-t-commits-triggering-deployments-on-vercel). Session commits authored as `177290488+vvoohyeon@users.noreply.github.com` with a `Co-Authored-By: Claude` trailer deploy fine (all of `39d2869…20f973a` did), so keep that git identity in rebuild clones.
- GitHub Actions `push` events run the workflow definitions of the pushed commit (`GITHUB_SHA` = "Tip commit pushed to the ref"; push workflows need not exist on the default branch — docs.github.com events-that-trigger-workflows §push). A commit whose tree lacks `sync.yml` triggers no run; a workflow with only a `branches` filter does not run for tag pushes.

## 3. (a) Preserving the legacy implementation

Recommended refs, both pointing at **P = the `origin/main` tip immediately before the cutover** (today `20f973a`):

- Annotated tag **`legacy/gen2-final`** — the immutable truth. Message records P, the date, the Vercel production deployment serving it, and that main was replaced by a from-scratch foundation in the next commit.
- Branch **`legacy/gen2`** — read-only by convention, so the owner can browse the legacy tree in GitHub Desktop (which navigates by branch). Precedent: `legacy/reference` is exactly such a permanent read-only branch (BQ-14, `docs/decision-register.md:131-137`). One-line caveat: a permanent branch departs from the global convention "a branch in the list is running or unfinished"; the precedent and the owner's request to "분리" the legacy implementation justify it.

Naming rationale: `legacy/reference` = end of generation 1 (the original implementation, `d3305b7`, 2026-05-20). Everything after it on main — the rebuild waves / design overhaul (2차) and step 3 mobile surface work (3차, from `39d2869` 2026-09-17) — is generation 2 of the codebase, hence `gen2`. Tag and branch names differ on purpose: an identical short name in `refs/tags` and `refs/heads` makes `git` warn "refname is ambiguous".

Collision check (local and remote): `refs/tags/legacy/gen2-final`, `refs/heads/legacy/gen2`, `refs/heads/legacy`, `refs/tags/legacy`, `refs/heads/legacy/gen2-final`, `refs/tags/legacy/gen2` — all absent; the only `legacy*` ref anywhere is `refs/heads/legacy/reference`. `git check-ref-format` accepts both names. `refs/heads/legacy/gen2` coexists with `refs/heads/legacy/reference` (sibling paths, no file/directory conflict); nothing may ever be named plain `legacy` as a branch. The `anchor/*` tags stay untouched and remain resolvable (they point into history that main keeps).

Because S is a normal child of P (not an orphan), every legacy commit stays reachable from main as well; the refs exist for naming and browsing, not to prevent loss. Optional symmetry: an annotated tag `legacy/gen1-final` → `d3305b7` gives generation 1 an immutable tag too (no collision).

Optional hardening (repo-settings write — needs one owner "yes"): rulesets that make the legacy refs immutable; with an empty bypass list they bind the owner too, and deleting the ruleset undoes it.

```bash
gh api -X POST repos/vvoohyeon/ViveTest/rulesets --input - <<'EOF'
{"name":"legacy-branches-read-only","target":"branch","enforcement":"active","conditions":{"ref_name":{"include":["refs/heads/legacy/**"],"exclude":[]}},"rules":[{"type":"update"},{"type":"deletion"},{"type":"non_fast_forward"}]}
EOF
```

```bash
gh api -X POST repos/vvoohyeon/ViveTest/rulesets --input - <<'EOF'
{"name":"legacy-and-anchor-tags-immutable","target":"tag","enforcement":"active","conditions":{"ref_name":{"include":["refs/tags/legacy/**","refs/tags/anchor/**"],"exclude":[]}},"rules":[{"type":"update"},{"type":"deletion"},{"type":"non_fast_forward"}]}
EOF
```

Create them only after the atomic push in §6.3 (a creation rule is deliberately not included, but applying them afterwards removes any doubt).

## 4. (b) Keeping production on the legacy build

### 4.1 Options, with owner actions counted

| Option | Owner actions | Main pushes during rebuild | Production during rebuild | Reversal at launch | Verdict |
|:--|:--:|:--|:--|:--|:--|
| A. `vercel.json` `git.deploymentEnabled: {"main": false}` in the new main | 0 | no deployment at all | stays on P | one commit removing the key | adopt |
| B. `vercel.json` `ignoreCommand` exiting 0 when `VERCEL_ENV=production` | 0 | deployment created then `CANCELED` (counts toward quota) | stays on P | same commit | adopt as belt behind A |
| C. Dashboard: disable auto-assign of production domains (staged production) | 1 now + 1 promote at launch | full production build each push, staged not served | stays on P | toggle / promote | reject — owner labour, builds every push |
| D. Instant Rollback as a freeze | 1 now + 1 undo at launch | builds, not served after rollback | foundation is live until the rollback happens | Undo Rollback | reject — outage window, owner labour |
| E. Point Vercel's production branch at `legacy/gen2` | 1 now + 1 at launch | become previews | P | setting | reject — owner labour |
| F. Disconnect the Git integration | 1 + 1 | none | P | reconnect | reject — loses previews too |
| G. Rely on the foundation failing to build | 0 | `ERROR` builds | P only until the first buildable skeleton lands | — | reject — silently launches a half-built app |
| H. New repository for the rebuild | several (Vercel re-link) | — | — | — | reject — owner labour, breaks history continuity |

A dominates on the owner's stated metric (zero recurring actions) and costs nothing per push; B covers the one residual doubt (whether Vercel honours the branch key for the production branch). With A in force B never fires on main; if A were ever ignored, B cancels the production build; if both were ignored, G's failure path still protects production until the foundation is buildable, and §7.2 is the recovery.

### 4.2 Exact file for the new main

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": {
    "deploymentEnabled": {
      "main": false
    }
  },
  "ignoreCommand": "if [ \"$VERCEL_ENV\" = \"production\" ]; then echo 'rebuild freeze: production build skipped by vercel.json'; exit 0; fi; exit 1"
}
```

Preview builds of every other branch keep building (`exit 1`). The file is read from the commit being pushed, so it takes effect on S itself — S must contain it.

### 4.3 Which commit is deployed or skipped

| Push | What Vercel does | Production serves |
|:--|:--|:--|
| P (today `20f973a`, already deployed 2026-09-24T02:49:21Z) | nothing new | P |
| `legacy/gen2` branch at P (atomic push) | SHA already deployed → no new deployment | P |
| `legacy/gen2-final` tag | tags never deploy | P |
| S = squash commit (parent P, freeze `vercel.json`, sync.yml absent) | skipped by A; if not, canceled by B | P |
| every later main commit while the freeze keys exist | skipped | P |
| `claude/*` rebuild branches | preview deployments (SSO-protected URLs) | P |
| L = launch commit that removes both freeze keys | production build; aliased on success, ignored on failure | L on success, P on failure |

If a later commit lands between today and the cutover, P becomes that commit; the pre-flight in §6.1 requires P's own production build to have finished with `success` before S is pushed.

### 4.4 Hotfixing legacy production during the rebuild (rare path)

Main is frozen and `legacy/gen2` is read-only, so an urgent legacy fix goes to a `claude/legacy-hotfix-<slug>` branch cut from `legacy/gen2-final`; it gets a preview, and that preview is promoted to production ("Promote to Production" in the dashboard, or `vercel promote <url>` with the owner's Vercel login — both need an explicit yes). The freeze on main is unaffected. Name the hotfix branch so it never matches `legacy/**` if the ruleset in §3 is applied.

## 5. (c) The `sync.yml` pipeline

Recommendation: **remove it from the new main** (it is absent from a from-scratch tree by construction; state this deletion explicitly in the plan because `.github/**` is build/schedule configuration and Ask-First under `AGENTS.md §4`).

- If kept unchanged on the new main: `npm ci` fails with whatever lockfile the foundation has, or, once install passes, `npm run sync` fails with `Missing script: "sync"` if the foundation has no such script — a red check and a failure mail on every rebuild landing, for a pipeline that has never produced a commit.
- If it were ever fixed and kept: a CI bot committing straight to main races every session landing (the rejected-push pattern the global rules already treat as normal), and it would write `src/features/variant-registry/variant-registry.generated.ts`, a path the foundation will not have.
- On the legacy refs the file stays but is inert: its only trigger is `push` to `main`, and `legacy/gen2` / tag pushes do not match.
- Keep the three Actions secrets; they are harmless and the rebuild may still use Google Sheets as its content source (open decision, §10). No `gh workflow disable` is needed — a workflow whose file is absent from the pushed commit does not run, so the repo setting stays untouched.
- If Sheets sync returns in the rebuild: make it `workflow_dispatch`/scheduled and land its output through a branch + squash like any other unit (or fetch at build time), never a bot push to main; pin the Node/npm major so CI and local agree (the 209 failures were an npm 10 vs 11 lockfile disagreement); move actions to majors that target Node 24.

## 6. (d) Cutover procedure — exact commands

Values used below: primary checkout `/Users/woohyeon/Local/ViveTest` (read-only, never written), session clone root `/Users/woohyeon/Local/.claude-clones` (exists, currently empty), remote `https://github.com/vvoohyeon/ViveTest.git`, repo `vvoohyeon/ViveTest`, production host `vivetest.vercel.app`. Each block is self-contained because shell state does not persist between agent calls. A push never shares a command with a deletion and never feeds a pipe.

### 6.1 Pre-flight (read-only)

```bash
git -C /Users/woohyeon/Local/ViveTest ls-remote --heads origin 'claude/*'
git -C /Users/woohyeon/Local/ViveTest ls-remote origin refs/heads/main
```

Expect no `claude/*` branches (no session is about to land) and record P from the second line.

```bash
P=$(git -C /Users/woohyeon/Local/ViveTest ls-remote origin refs/heads/main | cut -f1)
D=$(gh api "repos/vvoohyeon/ViveTest/deployments?sha=$P&environment=Production" --jq '.[0].id')
echo "P=$P deployment=$D"
gh api "repos/vvoohyeon/ViveTest/deployments/$D/statuses" --jq '.[0] | "\(.state) \(.created_at) \(.environment_url)"'
curl -sS --max-time 20 https://vivetest.vercel.app/en | grep -oE '/_next/static/[^"]+\.(js|css)' | sort -u | shasum -a 256 | cut -c1-16
```

Expect `success`; record the fingerprint F0 (it was `63afd6dcdf24fe6d` for `20f973a` on 2026-09-26). If the status is `pending`, wait and re-run; if it is `failure`, production is on the previous success and the tag message must say which.

### 6.2 Rehearsal probe (recommended, zero owner actions, decides the one open assumption)

```bash
git clone https://github.com/vvoohyeon/ViveTest.git /Users/woohyeon/Local/.claude-clones/vercel-freeze-probe
git -C /Users/woohyeon/Local/.claude-clones/vercel-freeze-probe switch -c claude/vercel-freeze-probe origin/main
git -C /Users/woohyeon/Local/.claude-clones/vercel-freeze-probe commit --allow-empty -m "착수: Vercel 배포 동결 장치 실측 (control)"
git -C /Users/woohyeon/Local/.claude-clones/vercel-freeze-probe push -u origin claude/vercel-freeze-probe
```

The empty marker is the control: a new SHA on a normal branch, so it must get a preview deployment. Then the treatment for mechanism A:

```bash
printf '%s\n' '{' '  "$schema": "https://openapi.vercel.sh/vercel.json",' '  "git": { "deploymentEnabled": { "claude/vercel-freeze-probe": false } }' '}' > /Users/woohyeon/Local/.claude-clones/vercel-freeze-probe/vercel.json
git -C /Users/woohyeon/Local/.claude-clones/vercel-freeze-probe add vercel.json
git -C /Users/woohyeon/Local/.claude-clones/vercel-freeze-probe commit -m "probe A: deploymentEnabled false for this branch"
git -C /Users/woohyeon/Local/.claude-clones/vercel-freeze-probe push
```

After about three minutes:

```bash
C=/Users/woohyeon/Local/.claude-clones/vercel-freeze-probe
for s in $(git -C "$C" rev-parse HEAD~1 HEAD); do echo "== $s"; gh api "repos/vvoohyeon/ViveTest/deployments?sha=$s" --jq 'length'; gh api "repos/vvoohyeon/ViveTest/commits/$s/statuses" --jq '.[] | "\(.context) \(.state) \(.description)"'; done
```

Expect `1` deployment for the marker and `0` for the probe-A commit (record whatever status line, if any, Vercel posts on a skip). Then mechanism B, mirrored onto the preview environment:

```bash
printf '%s\n' '{' '  "$schema": "https://openapi.vercel.sh/vercel.json",' '  "ignoreCommand": "if [ \"$VERCEL_ENV\" = \"preview\" ]; then echo freeze-probe; exit 0; fi; exit 1"' '}' > /Users/woohyeon/Local/.claude-clones/vercel-freeze-probe/vercel.json
git -C /Users/woohyeon/Local/.claude-clones/vercel-freeze-probe commit -am "probe B: ignoreCommand cancels this environment"
git -C /Users/woohyeon/Local/.claude-clones/vercel-freeze-probe push
```

After about three minutes:

```bash
C=/Users/woohyeon/Local/.claude-clones/vercel-freeze-probe
s=$(git -C "$C" rev-parse HEAD)
D=$(gh api "repos/vvoohyeon/ViveTest/deployments?sha=$s" --jq '.[0].id')
gh api "repos/vvoohyeon/ViveTest/deployments/$D/statuses" --jq '.[] | "\(.state) \(.description)"'
```

Expect a deployment whose final status is not `success` (Vercel sets the deployment `CANCELED`). Then clean up, each in its own command, after reading the outputs above:

```bash
git -C /Users/woohyeon/Local/.claude-clones/vercel-freeze-probe push origin --delete claude/vercel-freeze-probe
```

```bash
rm -rf /Users/woohyeon/Local/.claude-clones/vercel-freeze-probe
```

If probe A deploys anyway, B alone carries the freeze (every main push then produces a canceled deployment — still zero owner actions). If B does not cancel, stop and report: the freeze would rest on A alone.

### 6.3 Foundation branch and landing

Branch publication (global rule: marker before any code):

```bash
git clone https://github.com/vvoohyeon/ViveTest.git /Users/woohyeon/Local/.claude-clones/rebuild-foundation
git -C /Users/woohyeon/Local/.claude-clones/rebuild-foundation switch -c claude/rebuild-foundation origin/main
git -C /Users/woohyeon/Local/.claude-clones/rebuild-foundation commit --allow-empty -m "착수: from-scratch 리빌드 토대 — main 트리 교체 · legacy 동결 · 배포 동결"
git -C /Users/woohyeon/Local/.claude-clones/rebuild-foundation push -u origin claude/rebuild-foundation
```

Tree replacement (the file contents come from the foundation plan; everything tracked is removed first, ignored files do not exist in a fresh clone):

```bash
git -C /Users/woohyeon/Local/.claude-clones/rebuild-foundation rm -r -q -- .
```

Write the foundation files, including `vercel.json` (§4.2) and a `.gitignore` (§9), then commit and push per unit. Before landing, check the branch tip:

```bash
C=/Users/woohyeon/Local/.claude-clones/rebuild-foundation
git -C "$C" cat-file -e claude/rebuild-foundation:vercel.json && echo "vercel.json present"
git -C "$C" cat-file -e claude/rebuild-foundation:.github/workflows/sync.yml 2>/dev/null && echo "FAIL sync.yml still present" || echo "sync.yml absent"
git -C "$C" show claude/rebuild-foundation:vercel.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s);const ok=v.git&&v.git.deploymentEnabled&&v.git.deploymentEnabled.main===false&&/VERCEL_ENV.*production/.test(v.ignoreCommand||"");console.log(ok?"freeze keys OK":"FAIL freeze keys missing");process.exit(ok?0:1)})'
git -C "$C" ls-tree -r --name-only claude/rebuild-foundation | grep -E '(^|/)\.env' && echo "FAIL env file tracked" || echo "no env files tracked"
git -C "$C" check-ignore -q --no-index .env.local && echo ".env.local ignored" || echo "FAIL .env.local not ignored"
```

Landing — one squash commit, legacy refs created in the same atomic push:

```bash
C=/Users/woohyeon/Local/.claude-clones/rebuild-foundation
git -C "$C" fetch origin --tags
git -C "$C" rev-list --count main..origin/main
git -C "$C" rev-list --count origin/main..main
```

Expect `0` local commits ahead (second number). Then fast-forward and confirm the branch is based on the current tip:

```bash
C=/Users/woohyeon/Local/.claude-clones/rebuild-foundation
git -C "$C" switch main
git -C "$C" merge --ff-only origin/main
git -C "$C" merge-base --is-ancestor main claude/rebuild-foundation && echo "branch based on current main"
git -C "$C" rev-parse main
```

The printed SHA is P; it must equal the P recorded in §6.1 (if main moved, a session landed legacy-era work — re-run §6.1 for the new P and rebase the branch onto it before continuing). Create the tag and the squash commit:

```bash
C=/Users/woohyeon/Local/.claude-clones/rebuild-foundation
P=$(git -C "$C" rev-parse main)
git -C "$C" tag -a legacy/gen2-final "$P" -F - <<'EOF'
ViveTest 2세대 코드베이스의 마지막 main — from-scratch 리빌드 착수 직전 동결점.

main 은 다음 커밋에서 프로토타입 기반 토대로 트리 전체가 교체됐다. 이 태그는 그 직전 상태(1차 구현 위의 디자인 개편 wave 와 step 3 모바일 표면)를 가리키며, 리빌드가 공개될 때까지 프로덕션(vivetest.vercel.app)이 서빙하는 빌드의 커밋이다. 1세대 기준선은 legacy/reference(d3305b7)다.
EOF
git -C "$C" merge --squash claude/rebuild-foundation
git -C "$C" commit -F - <<'EOF'
from-scratch 리빌드 토대 — main 트리 교체 · legacy 동결 · 프로덕션 배포 동결

- 2세대 구현 전체를 걷고 프로토타입 기반 토대로 교체한다 (legacy/gen2-final · legacy/gen2 에 보존)
- vercel.json 이 main 의 프로덕션 배포를 동결한다 (git.deploymentEnabled.main=false + ignoreCommand) — 공개 커밋이 이 둘을 지운다
- .github/workflows/sync.yml 을 싣지 않는다 (209 회 전부 실패, 커밋을 만든 적 없음)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git -C "$C" diff --quiet claude/rebuild-foundation HEAD && echo "squash tree == branch tip"
[ "$(git -C "$C" rev-parse HEAD~1)" = "$(git -C "$C" rev-parse 'legacy/gen2-final^{commit}')" ] && echo "S parent == tagged P"
```

(Adjust the task list in the commit body to the foundation plan's actual units.) Run the foundation's own basic gates on this commit, then push all three refs atomically — if main is rejected as non-fast-forward, **nothing** is created, so the legacy refs can never disagree with S's parent:

```bash
git -C /Users/woohyeon/Local/.claude-clones/rebuild-foundation push --atomic origin HEAD:refs/heads/main HEAD~1:refs/heads/legacy/gen2 refs/tags/legacy/gen2-final
```

If the push is rejected because main moved: `git -C /Users/woohyeon/Local/.claude-clones/rebuild-foundation tag -d legacy/gen2-final`, `reset` the local main to `origin/main` (own clone only), re-run §6.1 for the new P, redo the fast-forward, tag and squash on the new tip, rerun gates, retry once; never force-push. If the server refuses `--atomic` itself, the push fails as a whole and nothing is written; fall back to pushing main first, verifying, then the tag and branch at the verified parent.

### 6.4 Verification (each in its own command, after reading the push output)

```bash
C=/Users/woohyeon/Local/.claude-clones/rebuild-foundation
git -C "$C" fetch origin --tags
git -C "$C" rev-list --count origin/main..HEAD
git -C "$C" status --porcelain | wc -l
git -C "$C" branch -r --contains HEAD
```

Expect `0`, `0`, and `origin/main` listed.

```bash
C=/Users/woohyeon/Local/.claude-clones/rebuild-foundation
P=$(git -C "$C" rev-parse 'legacy/gen2-final^{commit}')
echo "P=$P"
git -C "$C" rev-list --count "$P"..origin/main
[ "$(git -C "$C" rev-parse 'origin/main^{tree}')" = "$(git -C "$C" rev-parse 'origin/claude/rebuild-foundation^{tree}')" ] && echo "origin/main tree == reviewed branch tip"
git -C "$C" ls-remote origin refs/heads/legacy/gen2 'refs/tags/legacy/gen2-final^{}' refs/tags/legacy/gen2-final
git -C "$C" cat-file -t refs/tags/legacy/gen2-final
git -C "$C" diff --name-status --no-renames "$P" origin/main | cut -f1 | sort | uniq -c
```

Expect exactly `1` commit after P; tree equality; `legacy/gen2` and `legacy/gen2-final^{}` both equal P; object type `tag` (annotated); the A/M/D counts match the foundation plan's manifest (the D list is the legacy tree minus what the plan carries).

Deploy and CI verification, about five minutes after the push:

```bash
S=$(git -C /Users/woohyeon/Local/.claude-clones/rebuild-foundation rev-parse origin/main)
gh api "repos/vvoohyeon/ViveTest/deployments?sha=$S" --jq '[.[] | {environment, id}]'
gh api "repos/vvoohyeon/ViveTest/commits/$S/statuses" --jq '.[] | "\(.context) \(.state) \(.description)"'
gh api "repos/vvoohyeon/ViveTest/actions/runs?head_sha=$S" --jq '.total_count'
gh api "repos/vvoohyeon/ViveTest/deployments?environment=Production&per_page=1" --jq '.[0].sha'
curl -sS --max-time 20 https://vivetest.vercel.app/en | grep -oE '/_next/static/[^"]+\.(js|css)' | sort -u | shasum -a 256 | cut -c1-16
```

Expect no deployment for S (or, if only B fired, one whose status is not `success`), `0` Actions runs, the latest Production deployment still at P, and the fingerprint equal to F0 from §6.1. Any change in the fingerprint means production moved — go to §7.2 immediately.

### 6.5 Cleanup (only after 6.4 is green)

```bash
git -C /Users/woohyeon/Local/.claude-clones/rebuild-foundation push origin --delete claude/rebuild-foundation
```

```bash
git -C /Users/woohyeon/Local/.claude-clones/rebuild-foundation branch -D claude/rebuild-foundation
```

```bash
rm -rf /Users/woohyeon/Local/.claude-clones/rebuild-foundation
```

Then, optionally and with the owner's yes, the rulesets in §3 and the homepage fix:

```bash
gh repo edit vvoohyeon/ViveTest --homepage https://vivetest.vercel.app
```

## 7. Launch and emergency

### 7.1 Launch (future unit)

One commit on main that deletes both freeze keys from `vercel.json` (and the guard test's assertion). Vercel builds it as production; on success production moves to L, on failure it stays on P. Verify with the same fingerprint command (it must change) and `gh api "repos/vvoohyeon/ViveTest/deployments?environment=Production&per_page=1"` (sha = L, status success). Because no production deployment is created during the freeze, P's deployment is still "the immediately previous" production deployment at launch — the one target a Hobby Instant Rollback can reach. The owner has already said the test-to-stage assignment is settled "최종 배포 시점에" ("어떤 테스트에 어떤 무대를 적용할지는 최종 배포 시점에 다시 한번 고민하고 결정하고" — proto-session `dialog.md:2121`), so the launch timing is the owner's call.

### 7.2 If S (or any frozen-period commit) went live anyway

Detection: §6.4 shows a Production deployment for S with `success`, or the fingerprint changed. Recovery: Instant Rollback to P's deployment (dashboard, or `vercel rollback <deployment>` with the owner's Vercel login — explicit yes required; the CLI's stored login exists on this machine under `~/Library/Application Support/com.vercel.cli/`, contents not read). After a rollback Vercel disables auto-assignment, which keeps every further main push off production — acceptable during the rebuild — and the launch then uses `vercel promote` / **Undo Rollback** instead of a plain push. Then fix the freeze in `vercel.json` and re-verify.

## 8. (e) Preview deployments for rebuild branches

Recommendation: **keep them** (no configuration needed; `claude/*` is not matched by the freeze). Reasons: the rebuild is mobile-first and a preview is the only way to open it on a real phone before launch; generated URLs are behind Vercel Authentication (observed 302 to SSO), so nothing leaks; they cost build minutes only (84 previews in the last nine days is the current rate). Early foundation commits that are not yet buildable will show a failed Vercel status on their branch — noise confined to branches that are deleted on landing. Rejected: `"deploymentEnabled": false` for everything (no way to see progress on a phone); skipping empty marker commits through an extra `ignoreCommand` clause (`git diff --quiet HEAD^ HEAD`) — it saves one build per session but a canceled build still counts as a deployment, and it makes the freeze file harder to remove cleanly at launch.

## 9. Deploy-related carry-forward for the foundation tree

- `vercel.json` with the §4.2 content — new, Ask-First in the new `AGENTS.md`, with the launch procedure written next to it.
- A unit test (in whatever runner the foundation adopts) asserting `git.deploymentEnabled.main === false` and the production clause of `ignoreCommand`, so a scaffold (`create-next-app` and similar) cannot silently delete the freeze.
- `.gitignore` must keep at least `.env.local` / `.env*.local` (the repository is **PUBLIC** and the primary checkout holds an untracked `.env.local`), `node_modules/`, `.next/`, `out/`, `output/`, `dist/`, `coverage/`, `test-results/`, `playwright-report/`, `*.tsbuildinfo`, `next-env.d.ts`, `.DS_Store`, `.vercel`. Otherwise the owner's next GitHub Desktop pull of the primary checkout surfaces hundreds of leftovers as untracked.
- New `AGENTS.md` "Workspace and branch roles": `main` (frozen for production until launch), `legacy/gen2` + `legacy/gen2-final` (generation 2, read-only), `legacy/reference` (generation 1, BQ-14), `anchor/*` (historical wave anchors inside generation 2).
- `src/config/site.ts` `resolveSiteOrigin()` — reference for how canonical/OG URLs obtain `vivetest.vercel.app` without hardcoding a domain.
- `next.config.ts` `headers()` immutable caching for `/fonts/*` and `/landing-card-media/*` — reference; valid only for content-addressed paths.
- `@vercel/analytics` / `@vercel/speed-insights` gates (`src/app/vercel-*-gate.tsx`) — reference; decide per the rebuild's consent design.
- Pin the Node/npm toolchain (`engines` / `packageManager`, and the Vercel project's Node version) so that local, CI and Vercel resolve the lockfile identically.
- Prototype mockup sources: they exist only in the volatile prototype scratchpad `/private/tmp/claude-501/-Users-woohyeon-Local-ViveTest/7b610dca-70f4-41bf-b48e-fe44caf07c81/scratchpad/mockups` (2.1 GB total, of which `shots/` 1.9 GB of PNG and `jdir/` 142 MB) and in the artifact `https://claude.ai/artifact/LPuzkZHX6FTcYwJJa8Vja3`. Preserve the HTML/JS/CSS sources (not `shots/`) as reference material once the prototype session finishes — they are the spec the rebuild is built from.

## 10. Risks, residual uncertainty, open questions

- **Vercel plan** is not verifiable without Vercel auth; the team slug `vvoohyeons-projects` is the default personal (Hobby) naming. Hobby limits Instant Rollback to the immediately previous deployment and defaults retention to 30 days (the aliased production deployment is exempt).
- Whether a `git.deploymentEnabled` skip posts a GitHub commit status is undocumented — §6.2 decides it before the cutover.
- `vivetest.vercel.app` as production host is inferred from the build's own canonical links (high confidence); whether a custom domain is also attached is unknown.
- If any legacy-era commit lands on main before the cutover, P moves; the procedure handles it (tag at the verified parent, atomic push), but the tag message should name the actual P.
- The four local-only branches with unique commits (§1.5) and anything on the other machine are outside this cutover; deleting them is irreversible.
- The global convention treats the branch list as in-flight work; the permanent `legacy/gen2` branch is a deliberate exception with `legacy/reference` as precedent.
