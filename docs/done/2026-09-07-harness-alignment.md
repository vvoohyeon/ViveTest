# 하네스 정렬 — 계약 가드 · 승인 경계 · 문서 생명주기 · 함정 원장

**Date:** 2026-09-07 · **Task mode:** Implementation · **Branch:** `claude/harness-alignment` · **상태:** 착지 완료

kospi-loop의 하네스 구조를 ViveTest에 적용한 기록이다. 무엇을 옮기지 **않았는지**와 그 근거는 `docs/DECISIONS.md`(2026-09-07 세 항목)가 갖는다 — 이 문서는 무엇을 했는지를 적는다.

## 배경

이 저장소는 조사 시점에 이미 하네스의 절반 이상을 갖고 있었다: `AGENTS.md` 단일 계약, `DECISIONS.md`, 프로젝트 메모리와 전역 동기화 훅, `BQ-NN` append-only 원장, Task Routing Table, Gold Standards, 마크다운 1문단 1줄. 전역 훅 6종은 저장소 밖에 있어 이미 적용 중이었다.

실제 격차는 둘이었다. **기계 집행부가 없었다** — 계약 검사 12종은 전부 제품 계약(그리드·카드·텔레메트리)이고, `AGENTS.md` 자신의 인용이 참인지 검사하는 것은 하나도 없었다. **문서 생명주기가 없었다** — `docs/plans/`에 활성과 완료가 섞여 하루 만에 69→84로 늘었고, 그 구분을 `.claude/CLAUDE.md`의 산문 한 줄이 대신 떠받쳤다.

## 병행 상황

착수 시점에 `claude/u2-cards`(tier 2 U2)가 살아 있었다. 충돌면을 `docs/design/ds/**`와 `docs/decision-register.md`로 특정하고 그 둘을 건드리지 않는 순서로 편성했다. U2는 이 작업 도중 `61bf414`로 착지했고, 리베이스에서 충돌 0건이었다. U2가 남긴 완료 기록(`2026-09-07-tier2-u2-truthful-cards.md`)은 새 §7-1 규약에 따라 `docs/done/`으로 옮겼다.

## 한 일

### 1. 계약 사실 가드 — `tests/unit/contract-citations.test.ts`

`AGENTS.md §9`가 요구하던 「파일 경로·명령·anchor를 실제 저장소와 대조」의 집행부. 백틱 인용을 모아 7가지를 검사한다: 경로 실재 · 재도입 금지 경로의 부재 · 낡은 면제 등재 · `문서.md §N` 절 실재 · `가이드.md §Anchor` 실재 · `npm run X` 실재 · §4가 지목한 git ref 해석.

즉시 잡은 사실 오류 3건을 함께 고쳤다.

- **§4 브랜치 역할표.** rollback 앵커로 지목한 `checkpoint/*` 5개가 존재하지 않았다. 실체는 `origin`의 `anchor/*` 주석 태그이고 뒤 넷은 착수 직전 baseline이지 range 완료가 아니다. 역할·금지·`BQ` 인용은 그대로 두고 ref 종류와 caveat만 사실에 맞췄다.
- **부정 인용의 방향.** `src/middleware.ts`·`src/features/landing/test/*`는 「재도입 금지」인데 존재 요구로 읽으면 판정이 반대가 된다. 부정 등재로 옮겨 부재를 단언한다.
- **`result-pipeline-todos.md`.** 실제 파일은 날짜 접두가 붙은 `2026-05-17-result-pipeline-todos.md`다. `src/features/telemetry/validation.ts`의 TODO 주석과 `project-rules.md`의 「HEAD에 그런 파일이 없다」(2026-06-27)가 둘 다 같은 이유로 틀렸다. 양쪽을 고쳤다.

### 2. 등록부·원장·경계 가드 3종

셋 다 「틀려도 아무것도 붉어지지 않는」 자리다.

- `qa-registry.test.ts` — `run-all.mjs`의 체커 배열과 `scripts/qa/check-*.mjs` 파일 집합을 양방향 대조하고, `AGENTS.md §5`의 「12 contract checks」와 `project-rules.md`의 blocker 원장 요약(67건 · 1..30 · 58/7/2)을 실제와 대조한다.
- `decision-register.test.ts` — `BQ-NN`의 중복·결번·역순·미해결 인용·변경 이력 절을 검사한다. 병행 세션이 같은 번호를 쓰는 충돌이 착지 직후 여기서 붉어진다.
- `design-ds-boundary.test.ts` — `AGENTS.md §2`의 「런타임이 소비하지 않는 문서 계층」 선언을 집행한다. 방향은 런타임→`ds/` 한쪽뿐이다.

### 3. 설계 정의 계층의 승인 경계와 값 출처 4분류

`docs/design/ds/**`는 §1·§2가 사실로 인정하고 §4 SSOT 목록에도 있었지만 **승인 경계에는 없었다.** 편집이 Claude Design 프로젝트 `cd630eec`로 단방향 push되는 표면이므로 저장소 안에서 끝나지 않는데, 승인 없이 만질 수 있는 상태였다. §4 Ask-First에 사유와 함께 넣었다.

`§3-1`은 kospi-loop의 스케줄 리터럴 4분류를 **방향을 뒤집어** 옮긴 것이다. 그쪽은 정본이 저장소 밖이라 「사본을 갖지 마라」이고, 이쪽은 정본이 저장소 안이라 「값의 출처를 밝혀라」가 된다. 판정 기준은 「이 값을 제품 코드에서 바꾸면 이 문장이 거짓이 되는가」이고 R(Realized)·C(Catalog)·D(Derived)·I(Intent)로 가른다. 세 번의 재조정(`BQ-21`·R1·R2)은 Intent를 Realized로 읽어서 났고, step 1의 D-03은 Derived를 Realized로 제시할 위험을 이미 경고한다.

§9 계층표에는 **저장소 밖 독자** 한 줄을 붙였다 — `SKILL.md`는 Claude Design 쪽 세션이 읽는 진입점이자 push 대상이므로, 저장소 세션용 규칙을 거기 적으면 §0이 금지한 도구별 사본이 저장소 밖에 생긴다.

### 4. 문서 생명주기 물리 분리 — `§7-1`

`docs/plans/` 84건을 활성 13 · `docs/done/` 69 · `docs/done/closed/` 2로 갈랐다. 종결 2건은 wave 13 분석(구현되지 않았고 `BQ-38`이 대체)과 sd1-sd2 `_OLD` 판본이다. 생명주기 색인 파일은 만들지 않는다 — 상태를 위치와 색인이 함께 주장하면 어느 쪽이 옳은지 알 수 없다.

**역사는 소급 수정하지 않았다.** 이관으로 낡은 경로 인용 62건이 `docs/done/**`·`docs/archive/**`에 남아 있고 그대로 둔다. 링크 가드가 계약 문서와 살아 있는 계획서에만 걸리는 것이 그 때문이고, 그래서 실제 편집 비용은 `wave-roadmap.md` 4줄 + theme-matrix provenance 2줄뿐이었다.

### 5. 함정 원장 — `docs/LESSONS_LEARNED.md`

2026-09-03이 「실제로 등재할 함정이 생기는 순간 만든다」로 걸어 둔 조건이 충족됐다. 이 세션이 발견·수정한 구조적 함정 5건(L01~L05)을 담아 만들었고 `AGENTS.md §2`가 필수 진입점으로 라우팅, §9가 등재 의무를 갖는다.

## 검증

- `npm run lint` · `npm run typecheck` · `npm test` 전건 통과. 최종 트리에서 **80 files / 544 tests**.
- 새 가드 6파일 · **28단언** 전부를 고장 주입으로 발화 확인(28/28). 주입은 `git stash` 없이 파일 내용 치환·복원으로 했고, 매 회 주입이 실제로 무언가를 바꿨는지 먼저 단언했다 — 첫 시도에서 원장 JSON의 들여쓰기 때문에 치환 0건인 「침묵」이 한 번 나왔고, 그것은 가드가 아니라 주입의 결함이었다.
- `npm run build`·E2E는 돌리지 않았다. 변경 전량이 `docs/**`·`tests/unit/**`·`AGENTS.md`와 `src/features/telemetry/validation.ts`의 **주석 한 줄**이라 렌더 표면이 없다.

## 남긴 것

- **preview 카드의 토큰 리터럴 대조 가드.** `radius-scale.html`·`motion.html`이 토큰 값을 문자열로 인쇄한다(`SYNC.md`가 그 사실을 적는다). 대조 가드는 만들 수 있지만 tier 2 U3·U4가 그 카드들을 다시 측정·재작성하므로 그 뒤가 맞다.
- **토큰 이름 드리프트 게이트.** tier 3 `candidates_10`이 소유한다.
- **`docs/design/ds/catalog-components.css`의 낡은 경로 인용 1건** — `docs/plans/2026-09-06-design-system-rebaseline-step1b.md`가 `docs/done/`으로 옮겨졌다. 그 파일은 U3·U4가 계속 편집하므로 그쪽 커밋에서 함께 고치는 편이 충돌이 없다. 링크 가드 범위 밖이라 게이트는 붉어지지 않는다.
- **`docs/archive/`의 대체된 규칙 문서 11건**(`AGENTS_v2/v3/v5`, `Codex_Custom_Instructions_v2/v3/v5/v6`, 구 `project-rules`·`verification-commands`). `DECISIONS.md` 2026-09-03이 삭제한 `CLAUDE.md`를 아카이브에 남기지 않기로 한 것과 같은 계열의 위험(잘못 인용될 두 번째 사본)이지만, 사용자 소유의 역사 파일을 요청 없이 지우지 않았다. 지운다면 `git rm docs/archive/AGENTS_v*.md docs/archive/Codex_Custom_Instructions_v*.md docs/archive/project-rules.md docs/archive/verification-commands.md` 한 줄이고 이력은 git이 갖는다.
