# ViveTest Rebuild — Local Branch / Worktree Setup

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

Status: **PASS**

Setup was completed successfully.

Confirmed:

- No source files were modified.
- No remote push was performed.
- All requested target worktrees were created.
- All requested target worktrees are clean.

---

## 3. Confirmed Local Paths

| Role | Path | Branch | HEAD | Status |
|---|---|---|---|---|
| Active rebuild implementation workspace | `/Users/woohyeon/Local/ViveTest` | `main` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | clean |
| Legacy reference worktree | `/Users/woohyeon/Local/vivetest-legacy-reference` | `legacy/reference` | `d3305b7183a9c0f70331ca64baa5531d1164c2c0` | clean |
| Checkpoint worktree | `/Users/woohyeon/Local/vivetest-checkpoints/w01-02` | `checkpoint/w01-02-card-structure` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | clean |
| Checkpoint worktree | `/Users/woohyeon/Local/vivetest-checkpoints/w03-06` | `checkpoint/w03-06-card-expanded` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | clean |
| Checkpoint worktree | `/Users/woohyeon/Local/vivetest-checkpoints/w07-10` | `checkpoint/w07-10-blog-unavailable-grid` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | clean |
| Checkpoint worktree | `/Users/woohyeon/Local/vivetest-checkpoints/w11-14` | `checkpoint/w11-14-landing-stable` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | clean |
| Checkpoint worktree | `/Users/woohyeon/Local/vivetest-checkpoints/w15-17` | `checkpoint/w15-17-gnb-theme-mobile` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` | clean |

---

## 4. Active Main Workspace

The active rebuild implementation workspace is:

```txt
/Users/woohyeon/Local/ViveTest
```

Branch:

```txt
main
```

Setup-time HEAD:

```txt
afe70773a1cde832f1728bf4fc2b857a836db6b9
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
/Users/woohyeon/Local/vivetest-legacy-reference
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

| Range | Worktree Path | Branch | Setup-time HEAD |
|---|---|---|---|
| `w01-02` | `/Users/woohyeon/Local/vivetest-checkpoints/w01-02` | `checkpoint/w01-02-card-structure` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` |
| `w03-06` | `/Users/woohyeon/Local/vivetest-checkpoints/w03-06` | `checkpoint/w03-06-card-expanded` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` |
| `w07-10` | `/Users/woohyeon/Local/vivetest-checkpoints/w07-10` | `checkpoint/w07-10-blog-unavailable-grid` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` |
| `w11-14` | `/Users/woohyeon/Local/vivetest-checkpoints/w11-14` | `checkpoint/w11-14-landing-stable` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` |
| `w15-17` | `/Users/woohyeon/Local/vivetest-checkpoints/w15-17` | `checkpoint/w15-17-gnb-theme-mobile` | `afe70773a1cde832f1728bf4fc2b857a836db6b9` |

Role:

* Checkpoint branches preserve stable rebuild ranges.
* Checkpoint worktrees may be used for verification, comparison, and rollback anchoring.
* Checkpoint worktrees should not be used for regular implementation.
* If a fix must start from a checkpoint, use a separately approved `fix/*` or `recovery/*` branch.

---

## 7. Final Worktree Layout

```txt
/Users/woohyeon/Local/
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

* Active rebuild work happens in `/Users/woohyeon/Local/ViveTest` on branch `main`.
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

Confirmed clean worktrees:

```txt
/Users/woohyeon/Local/ViveTest
/Users/woohyeon/Local/vivetest-legacy-reference
/Users/woohyeon/Local/vivetest-checkpoints/w01-02
/Users/woohyeon/Local/vivetest-checkpoints/w03-06
/Users/woohyeon/Local/vivetest-checkpoints/w07-10
/Users/woohyeon/Local/vivetest-checkpoints/w11-14
/Users/woohyeon/Local/vivetest-checkpoints/w15-17
```

Setup confirmations:

```txt
source files modified: no
remote push performed: no
all target worktrees clean: yes
```
