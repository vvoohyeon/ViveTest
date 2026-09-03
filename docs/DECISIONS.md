# DECISIONS — 왜 이 저장소의 규칙이 이 모양인가

이 문서는 ViveTest의 **작업 규칙·문서 구조가 왜 지금의 모양인지**와 **무엇이 이미 기각됐는지**를 갖는다. 규칙 자체는 `AGENTS.md`가, 제품·설계 결정(`BQ-NN`)은 `docs/decision-register.md`가 갖는다. 규칙을 바꾸자고 제안하거나 어떤 규칙이 틀렸다고 말하기 **전에** 이 문서를 읽는다 — 그 대안은 이미 검토돼 기각됐을 수 있고, 재론은 결정을 사용자에게 되돌려 놓는다.

항목 형식: 배경 · 검토한 대안 · 선택과 근거 · 기각한 대안과 이유 · 영향.

---

## 2026-09-03 — wave별 워크트리 방식 폐지, 격리 작업공간은 clone

**배경.** ViveTest은 Claude Design 산출과 실제 구현 사이의 격차를 발견한 뒤, wave별로 워크트리를 만들어 디자인 개선을 기존 구현에 덧붙이는 방식으로 구축됐다(BQ-13/BQ-14/BQ-15, `docs/archive/rebuild-worktree-setup.md`). 그 방식은 사용자가 워크트리를 쓰지 않겠다는 선호를 확정하기 **전에** 만들어졌다. 이 선호는 전역 지침(`~/.claude/CLAUDE.md` §Parallel work)이 이미 강제하고 있었고, ViveTest만 예외로 남아 있었다.

**검토한 대안.** (a) 워크트리 유지 — 저장소 계약이 토폴로지 재해석을 금지하고 있으므로 그 조항을 근거로 현상 유지. (b) 워크트리 제거 + 브랜치도 삭제. (c) 워크트리만 제거하고 브랜치는 전부 보존.

**선택과 근거 — (c).** 등록된 워크트리는 GitHub Desktop에 `Current Worktree` 선택기를 띄워, 사용자가 **브랜치만으로 리뷰하는 경로**를 깨뜨린다. 이것이 전역 지침이 워크트리를 금지하는 바로 그 근거이며 ViveTest에도 동일하게 적용된다. rollback 앵커의 실체는 **브랜치**이고 워크트리는 그 체크아웃일 뿐이므로, 체크아웃을 없애도 앵커 기능은 하나도 잃지 않는다. 제거 전 각 워크트리가 미커밋 0인지, 내용이 `origin/main` 또는 원격 브랜치에 보존돼 있는지를 기계에서 실측해 증명했다.

**기각한 대안과 이유.** (a)는 이번 개편의 **대상**이지 장애물이 아니다 — 사용자 결정이 저장소 계약을 이긴다. (b)는 되돌릴 수 없는 손실이다: checkpoint 브랜치 5개는 원격에 없는 로컬 전용이고 기계마다 다른 commit을 가리키므로, 삭제하면 그 range의 안정 지점이 영구히 사라진다. 워크트리 제거만으로 목표(등록부 1줄)가 달성되므로 브랜치를 건드릴 이유가 없다.

**영향.** `AGENTS.md §4`가 「Rebuild worktree boundaries」에서 「Workspace and branch roles」로 바뀌었고, 「토폴로지를 재해석하지 않는다」는 「이 저장소는 워크트리를 만들지 않는다 — 격리 작업공간은 clone이다」로 대체됐다. 브랜치 역할표는 계약에 불변식으로 남았다. `docs/rebuild-worktree-setup.md`는 `docs/archive/`로 옮겨졌고 §2 Rebuild Workflow Sources에서 빠졌다. `BQ-13`은 부분 대체, `BQ-14`·`BQ-15`는 문구 조정으로 표시됐다 — id는 유지된다. `docs/plans/**`의 완료된 wave 계획 문서들은 당시 사실의 정확한 기록이므로 **고치지 않았다**; 역사를 소급 수정하면 그 계획이 무엇을 근거로 승인됐는지 읽을 수 없게 된다.

---

## 2026-09-03 — 이중 정본 해소, 루트 `CLAUDE.md` 삭제

**배경.** `AGENTS.md`(180줄)와 루트 `CLAUDE.md`(198줄)는 §0–§9 구조가 같았고 **비어 있지 않은 136줄 중 126줄이 축자 동일**했다. 고유한 것은 헤더 문구와 `CLAUDE.md` §10(guardrails)·§11(response language)뿐이었다. 같은 규칙이 두 곳에 있으면 표류하고, 인용은 패치되지 않은 쪽으로 옮겨 간다.

**검토한 대안.** (a) 두 파일을 쌍둥이 정본으로 유지하고 동시 갱신 규칙을 강화. (b) `AGENTS.md`를 단일 정본으로 두고 루트 `CLAUDE.md`를 얇은 포인터로 축소. (c) `AGENTS.md`를 단일 정본으로 두고 루트 `CLAUDE.md`는 삭제, `.claude/CLAUDE.md` 포인터만 신설.

**선택과 근거 — (c).** kospi-loop과 ddokdan-web에서 루트 `CLAUDE.md`가 존재하는 이유는 **두 번째 독자**가 있기 때문이다 — 전자는 Cloud Routines 회차 실행, 후자는 편집 파이프라인 실행이며, 그 문서는 코딩 세션이 아니라 그 실행이 따르는 지침이다. ViveTest에는 그런 독자가 없다: 런타임 에이전트도 `.claude/skills`도 없고, `package.json`·`scripts/`·전역 훅 어디에서도 루트 `CLAUDE.md`를 참조하지 않는다(실측). 담을 고유 내용이 없는 파일을 남기면 규칙이 다시 두 곳으로 갈라질 자리만 남는다.

**기각한 대안과 이유.** (a)는 실패가 이미 관측된 설계다 — 동시 갱신 규칙이 두 파일에 다 적혀 있었는데도 126줄이 축자 중복인 채로 표류했고, `§0` 헤더와 `§4` 워크트리 문장은 두 파일에서 서로 다른 문구로 갈라져 있었다. (b)는 (c)보다 나은 점이 없다: 포인터가 두 개가 되고, 그중 하나(루트)는 Codex도 Claude Code도 정본으로 쓰지 않는다. 삭제한 `CLAUDE.md`를 `docs/archive/`에 남기는 것도 기각했다 — 99%가 새 `AGENTS.md`와 겹치는 규칙 문서를 아카이브에 두면 그것이 바로 잘못 인용될 두 번째 사본이 된다. 이력은 git이 갖는다.

**영향.** `AGENTS.md`가 단일 저장소 계약이다. `.claude/CLAUDE.md`는 `@../AGENTS.md` 한 줄과 방향 안내 두 문단뿐이며 규칙을 담지 않는다. Ask-First 목록의 `AGENTS.md · CLAUDE.md`는 `AGENTS.md · .claude/CLAUDE.md · .claude/settings.json`으로 바뀌었다. `§9`의 갱신 트리거에서 「쌍둥이 `AGENTS.md`를 같은 변경에서 함께 갱신」 조항이 사라졌다 — 갱신할 쌍둥이가 없다.

---

## 2026-09-03 — `CLAUDE.md §10` 항목별 판정: 전역이 이미 말하는 것은 옮기지 않고 삭제

**배경.** 옛 `CLAUDE.md` §10 「Claude Code guardrails」는 6개 항목이었다. 이 중 일부는 저장소와 무관한 일반 작업 규율이어서 전역 `~/.claude/CLAUDE.md`가 이미 담고 있었다. 그런 항목을 `AGENTS.md`로 옮기면 §0이 선언한 「*how to work*는 여기 재진술하지 않는다」를 스스로 위반한다.

**검토한 대안.** (a) 6개를 전부 `AGENTS.md`로 흡수. (b) 항목별로 전역 문장과 대조해 중복은 삭제하고 저장소 고유인 것만 흡수.

**선택과 근거 — (b).** 판정 결과는 다음과 같다. 삭제한 항목은 어느 전역 문장이 그것을 이미 담고 있는지를 함께 적는다 — 그래야 나중에 「이 규칙이 사라졌다」가 아니라 「이 규칙은 저 위에 있다」로 읽힌다.

| §10 항목 | 판정 | 근거 |
|:---|:---|:---|
| 계약을 기억으로 인용하지 않는다 | **흡수** | §2 라우팅 표는 이 저장소에만 있다. 전역의 "Do not invent APIs, files, or configuration you have not read"는 발명을 막을 뿐, 읽은 적 있는 계약을 기억으로 재인용하는 것을 다루지 않는다 |
| rebuild 편집 전 자기 위치·wave 경계 확인 | **부분 흡수** | wave include/exclude 경계 확인만 흡수. workspace 위치 확인 절반은 삭제 — 전역 §Parallel work "Decide isolated clone vs. read-only primary checkout yourself, before starting. Never ask." 가 workspace 선택을 통째로 소유하고, 확인 대상이던 워크트리 자체가 사라졌다 |
| 시각 baseline diff는 회귀로 간주 | **흡수** | `theme-matrix-baseline-provenance.md`·BQ-07은 이 저장소 고유 |
| 인접 개선은 제안으로만 | **삭제** | 전역 §Implementation "**Surgical by default.** Touch only what the request requires. No refactoring adjacent code, reformatting unrelated files, or cleaning pre-existing dead code … No unrequested improvements, speculative abstractions, extra features" |
| 행동 계약 불확실 시 E2E 커버리지 먼저 확인 | **흡수** | 이 저장소에서 E2E 스펙이 동작 계약의 실측 기록이라는 사실이 저장소 고유 |
| 여러 파일 수정 시 실행 순서 먼저 밝히기 | **삭제** | 전역 §Implementation "**Codebase-wide changes start with complete discovery.** Search all file types for every variant of the target term, record each reference with its context, and **order updates by dependency**" + "Execute one approved unit at a time; verify before advancing" |

**기각한 대안과 이유.** (a)는 편했겠지만 §0의 경계 선언을 무의미하게 만든다. 전역 규칙을 저장소 계약에 복사하면, 전역이 개정될 때 저장소 사본이 낡은 채로 남아 **더 가까운 문서가 이긴다**는 우선순위 때문에 낡은 쪽이 이긴다.

**영향.** `AGENTS.md §10`은 5개 항목(그중 1개는 절반)으로 줄었고 이름이 「Session guardrails (repo-specific)」로 바뀌었다 — 이제 Codex와 Claude Code가 같은 파일을 읽으므로 도구 이름을 붙일 이유가 없다.

**남은 잔여 — `§11 Response language`.** 「사용자 메시지의 언어를 따른다」는 저장소와 무관한 규칙이지만 전역 `~/.claude/CLAUDE.md`에 해당 문장이 **없다**. 지우면 실재하는 규칙이 사라지므로 `AGENTS.md §11`에 그대로 두었다. 이것은 잘못 놓인 자리이며, 사용자가 다음에 전역 지침을 개정할 때 그쪽으로 옮기고 여기서 지우는 것이 옳다.

---

## 2026-09-03 — 계약 사실 전건 재검증 결과: `§1`·`§2`·`§5`는 낡지 않았다

**배경.** `AGENTS.md`와 `CLAUDE.md`는 2026-07-15 이후 갱신되지 않은 채였으므로, 라우팅 표가 가리키는 파일·게이트 명령·앵커 경로가 아직 실재하는지 의심할 이유가 있었다.

**검토한 대안.** (a) 낡았다고 가정하고 의심스러운 줄을 지운다. (b) 문서에서 인용 경로·명령·버전·앵커를 전부 뽑아 실제 저장소와 대조한 뒤 판정한다.

**선택과 근거 — (b).** 실측 결과 §1·§2·§5의 사실은 **전부 여전히 참**이었다. 라우트 7개가 파일과 일치, locale 12개가 `src/config/site.ts`의 `localeMetadata` 키 및 `src/messages/*.json`과 일치, `next.config.ts` 플래그 5개 일치, 의존성 버전 7개 일치, `dynamicParams = false` 확인, `src/middleware.ts` 부재 확인, §5가 부르는 npm script 14개 전부 `package.json`에 존재, `qa:rules`의 "12 contract checks"가 `run-all.mjs`가 실제로 부르는 checker 수와 일치, `project-rules.md`·`verification-commands.md`의 섹션 앵커 11개가 §2 라우팅 표와 정확히 대응, `req-landing.md §5/§6–11/§8/§12/§13`·`project-analysis.md §4/§5.3`·`req-test.md §2`·`design.md §7`이 모두 실재하는 절을 가리킴.

**기각한 대안과 이유.** (a)는 검증 가능한 것을 추측으로 처리하는 것이다. 실측 비용은 명령 몇 개였고, 그 결과 「낡았을 것」이라는 전제 자체가 틀렸음이 드러났다 — 낡은 것은 워크트리 토폴로지 **하나뿐**이었다. 추측으로 지웠다면 멀쩡한 계약이 사라졌을 것이다.

**영향.** §1·§2·§5·§6·§8은 워크트리 관련 한 줄(`docs/rebuild-worktree-setup.md` bullet)을 뺀 것 외에 내용 변경이 없다. 이 결과 자체가 다음 세션에 유용한 사실이다: **이 저장소의 계약 표는 신뢰할 수 있다.**

---

## 2026-09-03 — `.planning/STATE.md` 아카이브: 부채 하나는 해소, 하나는 재소유

**배경.** `.planning/STATE.md`는 2026-06-10 커밋(`e18c0c9`)의 Wave 10 세션 앵커이며 제목이 `VALIDATION BLOCKED`이었다. 미해결 부채 2건을 남기고 있었다.

**검토한 대안.** (a) 현재 상태로 다시 쓴다. (b) `docs/archive/`로 옮긴다. (c) 그대로 둔다.

**선택과 근거 — (b).** 두 부채를 실측했다. **Phase 9 stale matcher**(`desktopShellInlineScale` 정규식)는 해소됐다 — 해당 문자열이 `scripts/qa/check-phase9-performance-contracts.mjs`에도 `src/**`에도 없고 런타임은 `frameInlineScale`을 쓴다. **`expanded-focus-shell` 베이스라인 부채**는 해소된 것이 아니라 **재소유**됐다 — `BQ-37`이 그 baseline을 동결 상태로 명시하고 post-W17 재생성으로 이연했으므로, 이제 그 부채의 주인은 세션 앵커가 아니라 `docs/decision-register.md`다. 그리고 `docs/wave-roadmap.md`는 Wave 10·11·12와 R2 checkpoint를 모두 ✅ 완료로 기록한다. 즉 STATE.md는 세션 앵커로서 전부 낡았고, 살아 있는 내용은 이미 더 적합한 문서가 갖고 있다.

**기각한 대안과 이유.** (a)는 이 세션이 구조 개편만 하고 wave 작업을 하지 않았으므로 쓸 현재 상태가 없다. 게다가 상태를 그냥 적는 문서는 적히는 순간부터 낡기 시작한다 — 무엇이 그것을 거짓으로 만드는지를 같은 자리에 적을 수 없다면 적지 않는 편이 낫다. (c)는 `VALIDATION BLOCKED`라고 적힌 문서를 살아 있는 자리에 두는 것이고, 다음 세션이 그것을 현재 상태로 읽는다.

**영향.** `docs/archive/planning-state-wave10-2026-06-10.md`로 이동했고 `.planning/`은 비었다. `AGENTS.md §4`의 `.planning/**` 조항은 남는다 — 다음 세션이 전역 체크포인트 조건을 만족할 때 다시 만든다.

---

## 2026-09-03 — `docs/lessons/`를 만들지 않았다

**배경.** 4계층 배치에서 「기존 게이트·통상 리뷰가 구조적으로 잡지 못하는, 앞으로도 반복될 결함」을 담는 원장을 만들 수 있었다.

**선택과 근거.** 만들지 않았다. 이번 개편에서 그런 결함을 발견·수정한 것이 없다. 이번에 고친 것은 결함이 아니라 **선호가 확정되기 전에 만들어진 설계**이며, 그 기록은 이 문서가 갖는다.

**기각한 대안과 이유.** 빈 원장을 미리 만들어 두는 것은 기각했다. 등재할 것이 없는 원장은 다음 세션에 「여기 뭔가 적어야 하나」라는 질문만 만들고, 채우기 위해 결함이 아닌 것을 결함으로 적게 만든다. 실제로 등재할 함정이 생기는 순간 `docs/lessons/README.md`와 해당 원장을 만든다.

---

## 2026-09-03 — 관측했으나 고치지 않은 것 (제안)

이 세션의 범위 밖이라 **적용하지 않고 보고만 한** 항목이다.

- **`BQ-37`의 baseline 치수 기록이 실제 파일과 다르다.** `BQ-37` Notes는 동결 baseline을 `403×210`으로 적는데, `tests/e2e/state-smoke.spec.ts-snapshots/expanded-focus-shell-darwin.png`의 실측값은 `400×210`이다. 파일명도 `-chromium-darwin.png`에서 `-darwin.png`로 바뀌어 있다(STATE.md가 인용하던 옛 이름). 어느 쪽이 옳은지는 baseline 소유자가 판단할 일이며, `qa:visual:full`은 사람 승인 없이 실행하지 않는다.
- **전역 `block_worktree.sh` 훅이 문서 작성을 오탐한다.** 이 훅은 Bash 명령 문자열 전체에서 `worktree +(add|move)`를 찾으므로, 그 명령을 **금지하는 문서**를 heredoc으로 쓰는 것까지 차단한다. 이번 세션에서 실제로 발생했고 파일 작성 전용 도구로 우회 없이 진행했다. 훅이 fail-closed인 것은 올바른 설계이므로 완화를 제안하지 않는다 — 다만 이 오탐 유형이 존재한다는 사실 자체가 기록될 값이다.
