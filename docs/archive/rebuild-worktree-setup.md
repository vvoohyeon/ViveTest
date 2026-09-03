# ViveTest Rebuild — Local Branch / Worktree Setup (ARCHIVED 2026-09-03)

> **폐기된 문서 — 현행 계약이 아니다.** 여기 기술된 워크트리 토폴로지는 2026-09-03에 철거됐고, 이 저장소는 더 이상 워크트리를 만들지 않는다. 격리 작업공간은 clone이며, 현행 workspace·브랜치 규칙은 `AGENTS.md §4`가, 폐지 근거는 `docs/DECISIONS.md`가 갖는다. 이 문서는 브랜치가 왜 존재하는지를 읽기 위한 이력 기록으로만 남는다 — 여기 적힌 절차를 실행하지 않는다.
>
> 철거 후에도 브랜치는 전부 보존됐다. 앵커의 실체는 브랜치이고 워크트리는 그 체크아웃일 뿐이므로, 체크아웃을 없애도 잃는 것이 없다.

## 1. Purpose

This document records the confirmed local Git branch/worktree setup for the ViveTest rebuild.

It is intended to be used as a project source document that describes:

- the current local branch/worktree topology,
- the role of each worktree,
- the role of each branch,
- the boundary between active rebuild work and legacy reference code,
- the checkpoint worktrees available for verification and rollback anchoring.

---

## 2. Setup Status

Setup-time status: **PASS**

Setup was completed successfully.

Setup-time confirmations:

- No source files were modified.
- No remote push was performed.
- All requested target worktrees were created.
- All requested target worktrees are clean.

Current verification *(2026-06-27, `git worktree list --porcelain` + per-worktree `git status --short --branch`)*:

- The rebuild topology is still present: active `main`, `legacy/reference`, and checkpoint ranges `w01-02`, `w03-06`, `w07-10`, `w11-14`, `w15-17`.
- The active `main` worktree is not clean in the current home environment because of user-owned documentation edits in `docs/decision-register.md` and `docs/wave-roadmap.md`.
- `legacy/reference` and the five checkpoint worktrees are clean.
- Additional temporary/Codex worktrees may exist locally; they are not part of the rebuild topology unless explicitly assigned a role in this document.

---

## 3. Confirmed Local Paths

Environment path rule:

- Canonical path form: `/Users/<user>/Local/...`
- Known environments: `woohyeon` = home, `b-m-2022001` = office.
- Do not normalize one username into the other. The relative worktree layout and branch roles are the invariant.

| Role | Canonical path | Branch | Current observed HEAD | Current observed status |
|---|---|---|---|---|
| Active rebuild implementation workspace | `/Users/<user>/Local/ViveTest` | `main` | `55e2808733b925d699ea9a7a606d1a868765de90` | Home env dirty: user-owned docs `decision-register.md`, `wave-roadmap.md` |
| Legacy reference worktree | `/Users/<user>/Local/vivetest-legacy-reference` | `legacy/reference` | `d3305b7183a9c0f70331ca64baa5531d1164c2c0` | clean |
| Checkpoint worktree | `/Users/<user>/Local/vivetest-checkpoints/w01-02` | `checkpoint/w01-02-card-structure` | `66bc50c1e8522bf417d0239755e4395d2394be06` | clean |
| Checkpoint worktree | `/Users/<user>/Local/vivetest-checkpoints/w03-06` | `checkpoint/w03-06-card-expanded` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | clean |
| Checkpoint worktree | `/Users/<user>/Local/vivetest-checkpoints/w07-10` | `checkpoint/w07-10-blog-unavailable-grid` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | clean |
| Checkpoint worktree | `/Users/<user>/Local/vivetest-checkpoints/w11-14` | `checkpoint/w11-14-landing-stable` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | clean |
| Checkpoint worktree | `/Users/<user>/Local/vivetest-checkpoints/w15-17` | `checkpoint/w15-17-gnb-theme-mobile` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | clean |

Observed non-topology worktrees *(2026-06-27)*:

| Path | Branch / state | Note |
|---|---|---|
| `/private/tmp/vivetest-head-check` | detached `e0cb8dc5b8ece6d1856a1098ba6ffdf8254c0e6a` | prunable; not a rebuild role |
| `/Users/<user>/.codex/worktrees/44a5/VibeTest` | detached `81006d27fa6d84383d5d4ea89d73023a496322b4` | Codex worktree; not a rebuild role |
| `/Users/<user>/Local/VibeTest-phase7` | `codex/phase-7`, HEAD `10a9f78fc8b27a75c8e5706f6785c75b4171664f` | prunable; not a rebuild role |

---

## 4. Active Main Workspace

The active rebuild implementation workspace is:

```txt
/Users/<user>/Local/ViveTest
```

Known environment examples: `/Users/woohyeon/Local/ViveTest` (home), `/Users/b-m-2022001/Local/ViveTest` (office).

Branch:

```txt
main
```

Setup-time HEAD:

```txt
afe70773a1cde832f1728bf4fc2b857a836db6b9
```

Current observed HEAD in the home environment on 2026-06-27:

```txt
55e2808733b925d699ea9a7a606d1a868765de90
```

Role:

* This is the primary local implementation workspace.
* This directory is the logical `vivetest-main` workspace.
* The directory name remains `ViveTest`; it should not be renamed only to match the logical role name.
* Rebuild implementation work defaults to local `main` unless explicitly directed otherwise.

---

## 5. Legacy Reference Worktree

The legacy reference worktree is:

```txt
/Users/<user>/Local/vivetest-legacy-reference
```

Branch:

```txt
legacy/reference
```

Branch base / setup-time HEAD:

```txt
d3305b7183a9c0f70331ca64baa5531d1164c2c0
```

Role:

* `legacy/reference` is a read-only reference branch.
* It preserves the final pre-rebuild legacy baseline.
* It exists to inspect existing code and logic.
* It may be used for behavior reference, implementation comparison, file evidence, and contract preservation checks.
* It must not be modified.
* It is not the active rebuild workspace.
* It is not a normal implementation branch.
* It is not the primary rollback branch for rebuild work.

---

## 6. Checkpoint Branches and Worktrees

Checkpoint branches were created from local `main` at setup-time HEAD:

```txt
afe70773a1cde832f1728bf4fc2b857a836db6b9
```

Checkpoint worktrees are range-based verification and rollback anchors.

They are not the default implementation space.

| Range | Worktree path | Branch | Setup-time HEAD | Current observed HEAD |
|---|---|---|---|---|
| `w01-02` | `/Users/<user>/Local/vivetest-checkpoints/w01-02` | `checkpoint/w01-02-card-structure` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | `66bc50c1e8522bf417d0239755e4395d2394be06` |
| `w03-06` | `/Users/<user>/Local/vivetest-checkpoints/w03-06` | `checkpoint/w03-06-card-expanded` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` |
| `w07-10` | `/Users/<user>/Local/vivetest-checkpoints/w07-10` | `checkpoint/w07-10-blog-unavailable-grid` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` |
| `w11-14` | `/Users/<user>/Local/vivetest-checkpoints/w11-14` | `checkpoint/w11-14-landing-stable` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` |
| `w15-17` | `/Users/<user>/Local/vivetest-checkpoints/w15-17` | `checkpoint/w15-17-gnb-theme-mobile` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` |

Role:

* Checkpoint branches preserve stable rebuild ranges.
* Checkpoint worktrees may be used for verification, comparison, and rollback anchoring.
* Checkpoint worktrees should not be used for regular implementation.
* If a fix must start from a checkpoint, use a separately approved `fix/*` or `recovery/*` branch.

---

## 7. Final Worktree Layout

```txt
/Users/<user>/Local/
├─ ViveTest/
│  └─ branch: main
│     role: active rebuild implementation workspace
│
├─ vivetest-legacy-reference/
│  └─ branch: legacy/reference
│     role: read-only legacy reference
│     base: d3305b7183a9c0f70331ca64baa5531d1164c2c0
│
└─ vivetest-checkpoints/
   ├─ w01-02/
   │  └─ branch: checkpoint/w01-02-card-structure
   ├─ w03-06/
   │  └─ branch: checkpoint/w03-06-card-expanded
   ├─ w07-10/
   │  └─ branch: checkpoint/w07-10-blog-unavailable-grid
   ├─ w11-14/
   │  └─ branch: checkpoint/w11-14-landing-stable
   └─ w15-17/
      └─ branch: checkpoint/w15-17-gnb-theme-mobile
```

---

## 8. Branch Role Summary

| Branch | Role | Implementation Use |
|---|---|---|
| `main` | Active local rebuild branch | Default implementation branch |
| `legacy/reference` | Read-only legacy reference | Do not implement here |
| `checkpoint/w01-02-card-structure` | Checkpoint / rollback anchor | Do not implement here by default |
| `checkpoint/w03-06-card-expanded` | Checkpoint / rollback anchor | Do not implement here by default |
| `checkpoint/w07-10-blog-unavailable-grid` | Checkpoint / rollback anchor | Do not implement here by default |
| `checkpoint/w11-14-landing-stable` | Checkpoint / rollback anchor | Do not implement here by default |
| `checkpoint/w15-17-gnb-theme-mobile` | Checkpoint / rollback anchor | Do not implement here by default |

---

## 9. Minimal Operating Notes

* Active rebuild work happens in `/Users/<user>/Local/ViveTest` on branch `main`.
* `legacy/reference` is read-only and exists only for reference.
* Checkpoint worktrees are verification and rollback anchors.
* Checkpoint branches should be updated only after completed work on local `main`.
* No remote push was performed during setup.
* Source files were not modified during setup.
* Do not create, rename, or repurpose checkpoint branches unless explicitly approved.

---

## 10. Setup Verification Snapshot

Setup result:

```txt
PASS
```

Setup-time clean worktrees:

```txt
/Users/<user>/Local/ViveTest
/Users/<user>/Local/vivetest-legacy-reference
/Users/<user>/Local/vivetest-checkpoints/w01-02
/Users/<user>/Local/vivetest-checkpoints/w03-06
/Users/<user>/Local/vivetest-checkpoints/w07-10
/Users/<user>/Local/vivetest-checkpoints/w11-14
/Users/<user>/Local/vivetest-checkpoints/w15-17
```

Setup confirmations:

```txt
source files modified: no
remote push performed: no
all target worktrees clean: yes
```

Current observed status on 2026-06-27:

```txt
active main worktree: dirty in home env from user-owned docs/decision-register.md and docs/wave-roadmap.md
legacy/reference worktree: clean
checkpoint worktrees: clean
```

---

## 11. Teardown Record (2026-09-03)

이 절만 아카이브 시점에 추가됐다. 위 §1–§10은 2026-06-27 시점 기록 그대로다.

- 등록부에 남아 있던 워크트리 7개를 전부 제거해 `git worktree list`를 1줄로 되돌렸다: 체크포인트 5개, `legacy/reference` 1개, 그리고 토폴로지 역할이 없던 Codex 워크트리 1개.
- **브랜치는 하나도 삭제하지 않았다.** `main`, `legacy/reference`, `checkpoint/w01-02-card-structure`, `checkpoint/w03-06-card-expanded`, `checkpoint/w07-10-blog-unavailable-grid`, `checkpoint/w11-14-landing-stable`, `checkpoint/w15-17-gnb-theme-mobile`이 모두 보존돼 있고, rollback 앵커로서의 기능도 그대로다.
- 폐지 근거와 기각한 대안은 `docs/DECISIONS.md`에 있다.
