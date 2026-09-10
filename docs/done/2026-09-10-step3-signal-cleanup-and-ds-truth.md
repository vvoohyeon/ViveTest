# Step 3 — 가짜 신호 청소와 설계 문서의 사실 정정 (B · C · F · D)

**Date:** 2026-09-10 · **Task mode:** Implementation · **Branch:** `claude/step3-signal-cleanup` (새로 만든다) · **Wave:** rebaseline 프로그램 밖 · **Opens `src/**`:** D 의 처방이 갈래 ⑴ 일 때만

**Ask-First 파일 셋을 연다 — 착수 전에 이 문서의 승인이 곧 그 승인이다.** `scripts/qa/check-phase5-card-contracts.mjs`(B) · `docs/blocker-traceability.json`(C) · `docs/design/ds/README.md`(F, 저장소 밖으로 push 된다). D 는 조사 결과에 따라 `src/features/landing/grid/landing-grid-card.module.css` 를 열 수 있다.

**Hard stops.** `BQ-07` 시각 baseline 재생성 금지 · `theme-matrix-smoke` 실행 금지 · `qa:visual:full` 과 `--update` 금지. 워크트리 금지, clone 만.

---

## Shared frame — 이 문서 혼자 읽어도 되도록 반복한다

**이 묶음의 목적은 기능 추가가 아니라 「거짓말하는 신호를 없애는 것」이다.** `npm run qa:rules` 는 지금 두 곳에서 붉은데 둘 다 제품 결함이 아니고, `docs/design/ds/README.md` 의 findings 표는 이미 끝난 일을 미해결로 적고 있다. 가짜 붉음은 진짜 붉음을 가리고, 낡은 표는 저장소 밖 세션에게 끝난 일을 다시 시킨다. **끝나면 `npm run qa:rules` 가 exit 0 이 된다** — 이것이 이 계획서의 단일 완료 신호다.

**운영 방침(2026-09-10, BQ-39).** 트랜지션·마이크로인터랙션·UX 판단에서 SSOT 정의서보다 구현자의 판단을 우선하되, 더 나은 대안은 반드시 결정 안건으로 올린다.

**Step 4 와의 관계.** Step 4(`-step4-`)는 모바일 CLS 와 카드 썸네일을 갖는다. **D 의 조사 결과가 Step 4 의 범위를 정한다** — 아래 D 의 분기 규칙을 반드시 따른다.

## 착수 전 확인

```bash
cd "$(git rev-parse --show-toplevel)"
git log --oneline -3                                    # aec479a "UX 리팩터 step 2" 가 보여야 한다
ls docs/done/2026-09-10-ux-refactor-step2-banner-motion-ring.md   # expect present
npm run qa:rules; echo "qa:rules exit=$?"               # expect exit=1, 실패 2 건 (B 와 C)
npm test                                                # expect 초록 (594)
echo "tracked=$(git ls-files 'tests/e2e/*-snapshots/*' | wc -l | tr -d ' ') disk=$(ls tests/e2e/*-snapshots/* | wc -l | tr -d ' ')"   # L11
```

## 다시 하지 말 것 (Step 2 에서 이미 끝났다)

- 동의 배너의 확장 카드 가림 — `data-consent-banner-avoid` 계약으로 해소됐고 `consent-smoke` 가 붙들고 있다.
- reduced-motion 의 stagger — **이미 `0ms` 다.** `@media (prefers-reduced-motion: reduce)` 블록만 읽고 「고쳐야 한다」고 판단하지 말 것. 규율은 `.root.reducedMotion …` 클래스가 갖는다(L19).
- 배너 spacer 의 과다/부족 예약 — 실측 기반으로 바뀌었고 `consent-smoke` 가 붙들고 있다.
- 포커스 링의 두 층 구조 — `outline` + `outline-offset` 으로 옮겼고 `--focus-ring-inner`·`--focus-ring-outer` 는 은퇴했다. 되살리지 말 것.

---

## B — `check-phase5-card-contracts` 가 낡았다 · 리터럴이 아니라 토큰을 따라가야 한다

**실측 (2026-09-10).** 체커 `scripts/qa/check-phase5-card-contracts.mjs:66-71` 이 `landing-grid-card.module.css` 안에서 세 리터럴을 요구한다.

| 체커가 요구하는 것 | 카드 CSS 의 현재 표현 | 값이 최종 해석되는 곳 | 해석값 |
|:---|:---|:---|:---|
| `--normal-tag-bg: #ece8df` | `--normal-tag-bg: var(--tag-bg)` (`:29`) | `globals.css:172` → `--warm-150` (`:102`) | `#ece8df` |
| `--unavailable-tag-bg: #e6e2d8` | `--unavailable-tag-bg: var(--tag-bg-unavailable)` (`:51`) | `globals.css:174` → `--warm-200` (`:103`) | `#e6e2d8` |
| `--tag-min-width: 56px` | 이 파일에 선언 없음, `var(--tag-min-width)` 소비만 (`:143`) | `globals.css:202` | `56px` |

**세 값 모두 바이트 단위로 동일하다. 제품은 멀쩡하고 체커만 엉뚱한 파일을 본다.** 2026-09-07 theme cut(`986a956`)이 리터럴 22 개를 토큰으로 옮겼고, 카드 CSS `:19` 의 주석이 `--tag-min-width` 가 전역 계층으로 간 이유를 이미 적어 두었다. 이 붉음은 **`BQ-07`(시각 baseline 이연)과 무관하다** — baseline 을 하나도 건드리지 않고 고칠 수 있다.

**무엇을 하나.** 체커가 **토큰 사슬을 따라가 최종 해석값을 검사**하게 바꾼다. 카드 CSS 에서 `--normal-tag-bg` / `--unavailable-tag-bg` 가 가리키는 이름을 읽고, `globals.css`(`_path-config.mjs:45` 의 `globals` 가 이미 그 경로를 갖는다)에서 그 이름을 두 단계까지 풀어 최종 hex 가 `#ece8df` / `#e6e2d8` 인지 본다. `--tag-min-width` 는 **선언 위치를 묻지 않고** 최종값이 `56px` 인지만 묻는다.

**가드를 약하게 만들지 않는다 — 이것이 이 항목의 핵심 제약이다.** 「리터럴이 없으니 검사를 지운다」도, 「`var(...)` 이면 통과」도 금지다. 고친 뒤에도 다음 셋이 전부 붉어야 한다: ⑴ `--warm-150` 의 값을 바꾼다 ⑵ `--tag-bg` 가 다른 램프를 가리키게 한다 ⑶ `--tag-min-width` 를 `48px` 로 바꾼다. **셋 다 고장 주입으로 확인한다.**

**주의 — 다크 테마.** `globals.css:366-368` 이 같은 이름을 `--warm-800`/`--warm-700` 로 재선언한다. 검사는 **light `:root` 선언**을 대상으로 한다고 명시하고, 다크 분기를 실수로 집지 않도록 파싱 범위를 좁힌다.

## C — blocker 5 의 고아 추적 항목

**실측.** `docs/blocker-traceability.json` 의 인덱스 8 번이 `{"blocker": 5, "kind": "automated_assertion", "file": "tests/e2e/state-smoke.spec.ts", "assertionId": "assertion:B5-overlay-focus"}` 인데, 저장소 전체에 `B5-overlay-focus` 문자열을 가진 테스트가 없다(wave 9 에서 제거). blocker 5 의 나머지 네 항목(`B5-keyboard-sequential` · `B5-mobile-keyboard-handoff` · `B5-axe-canonical` · `B5-active-run-timeout-boundary-unit`)은 전부 실재한다.

**무엇을 하나 — 두 갈래를 재고 고른다. 둘 중 하나를 고르고 근거를 커밋에 적는다.**

⑴ **항목을 지운다.** wave 9 이 그 테스트를 없앴고 항목 정리만 남았다는 기록을 따른다. 가장 정직하지만, overlay 포커스에 대한 추적이 blocker 5 에서 사라진다.

⑵ **현행 검사로 다시 잇는다.** 5c 묶음 A 가 만든 `a11y-smoke` 의 modal dialog 검사(「instruction overlay is a modal dialog — labelled, focus-trapped, Esc is the dismiss action」)가 overlay 포커스를 실제로 덮고 있다. 그 테스트에 `assertion:B5-overlay-focus` 를 붙이고 항목의 `file` 을 `tests/e2e/a11y-smoke.spec.ts` 로 고친다.

**착수 시 그 테스트를 열어 읽고 판정한다.** 그것이 정말 「overlay focus」를 검증하면 ⑵ 가 옳다(추적이 복원된다). 포커스 트랩만 보고 blocker 5 가 뜻한 것과 다르면 ⑴ 이 옳다. **추적을 만들기 위해 테스트의 의미를 늘려 쓰지 않는다.**

**검증.** `node scripts/qa/check-blocker-traceability.mjs` 가 exit 0. 그리고 **반대 방향 고장 주입**: 없는 `assertionId` 를 하나 넣으면 다시 붉어야 한다 — 체커를 느슨하게 만들어 통과시킨 것이 아님을 이것으로 보인다.

## F — `docs/design/ds/README.md` 의 findings 표가 제품보다 뒤처져 있다

**실측 대조 (2026-09-10, 표의 각 행을 제품 코드와 맞춰 봤다).**

| 행 | 표의 기재 | 제품의 실제 | 처분 |
|:---|:---|:---|:---|
| D-06 | 「Decided, **not yet implemented**. 런타임 변경은 step 5」 | **구현됨** — `landing-grid-card.module.css:129-131` 의 `word-break: keep-all; overflow-wrap: anywhere` 가 미디어 쿼리 **밖**에 있고, 같은 파일 `:120` 주석이 모바일 전용에서 전 티어로 넓힌 경위를 적는다 | Resolved 로 갱신 |
| D-09 | 「Decided at the system level, **not yet in the product**」 | **구현됨** — `landing-grid-card.tsx:270` 의 `LANDING_GRID_CARD_MOBILE_CLOSE_BASE_CLASSNAME` 이 `min-h-[var(--tap-min)] min-w-[var(--tap-min)]` 를 갖고 바로 위 주석이 D-09 를 인용한다 | Resolved 로 갱신 |
| D-02 | **표에 행이 없다** | 그런데 `decision-register.md:354` 의 미해결 목록과 세션 노트가 D-02(Pretendard 미로드)를 계속 인용해 왔다. 제품은 `globals.css:32` 에서 Pretendard Variable 을 싣는다(BQ-25) | **행을 신설해 Resolved 로 등재한다** — 인용되는 번호가 표에 없으면 영원히 미해결로 읽힌다 |
| D-05 | 「Five of six closed. **One remains**」 + 「고치기 전에 렌더해서 확인하라」 | **여전히 열려 있다.** 다만 인용이 낡았다 — 표는 `:178` 의 `var(--card-shadow)` 를 지목하지만 현재는 `:211` 의 `.root.desktopOverlayLayer:has(:focus-visible) { box-shadow: var(--shadow-rest); }` 다 | 인용을 현행 위치로 고치고 열린 상태 유지. **D 의 결과를 여기 반영한다** |
| D-08 | 「Proposal, not adopted」 | 그대로 열려 있다 — `public/landing-card-media/` 에 `qmbti` 하나뿐 | 유지. Step 4 가 다룬다고 한 줄 |
| D-01 · D-03 · D-07 · D-10 · D-12 | Resolved | 일치 | 손대지 않는다 |
| D-11 | 문서 충돌 3 건, 「행동 계약이 이긴다」 | `decision-register` 3 단계가 해소했다고 적는다 | **착수 시 `design.md` §7.6 과 `req-landing.md` §6.4 를 직접 대조해 판정한다.** 해소됐으면 Resolved, 아니면 그대로 둔다 |

**무엇을 하나.** 위 표대로 행을 갱신하고, **표 머리말의 「Rows marked *Decided* are closed in the system only … the runtime change is step 5」 문장을 함께 손본다** — step 5 는 끝났으므로 그 문장이 남아 있으면 갱신한 행과 머리말이 서로 다른 말을 한다.

**갱신한 뒤 반드시 push 한다 — 이 편집은 저장소 안에서 끝나지 않는다.** `SYNC.md` 가 절차의 정본이다: `DesignSync` 도구에 `localDir` 을 `docs/design/ds/` 로 주고 `list_files` → `finalize_plan` → `write_files` 순서를 지킨다. `README.md` 는 push 대상이다(`SYNC.md` 의 표). **`SYNC.md` 자신과 `fonts/`·`_provenance/` 는 push 하지 않는다.** 인가는 기계 단위이고 이 기계에는 이미 되어 있다 — 실패하면 멈추고 보고한다(저장소 커밋은 그대로 두고, push 만 미완으로 보고한다).

**표를 「전부 Resolved」로 만들려는 유혹을 경계한다.** 갱신의 근거는 제품 코드에서 읽은 사실 하나뿐이고, 확인하지 못한 행은 **그대로 둔다**. 확인 못 한 것을 닫는 것이 이 항목이 없애려는 바로 그 결함이다.

## D — D-05 잔존: 확장 카드에 포커스가 들어가면 그림자가 어떻게 되나

**실측한 구조 (2026-09-10).** 확장 카드의 들림은 `landing-grid-card.tsx:266` 의 `expandedShadowPlate` 가 그린다 — `[box-shadow:var(--expanded-card-shadow)]`, 그 토큰은 `--shadow-expanded` = `var(--shadow-lg), 0 0 0 1px var(--hairline-strong)`(`globals.css:185`). 그런데 `landing-grid-card.module.css:211` 이 **카드 루트**에 별도로 `box-shadow: var(--shadow-rest)` 를 얹는다, 포커스가 안에 있을 때만.

**아직 모르는 것.** 그래서 포커스가 들어가면 ⑴ 카드가 납작해 보이는지 ⑵ 희미한 그림자 한 겹이 더 붙을 뿐인지 ⑶ 아무 차이가 없는지. **README 가 「it must be checked before it is fixed」라고 못 박은 유일한 항목이며, 이 지시를 지킨다.**

**무엇을 하나 — 조사가 먼저다.**

```bash
# preview 서버를 띄운 뒤(포트는 비어 있는 것으로 고른다) 데스크톱 1440×980 에서
# 확장 카드에 키보드 포커스를 넣고, 포커스 전/후의 두 상태를 각각 캡처해 비교한다.
# 재는 것 셋: 카드 루트의 계산된 box-shadow · expandedShadowPlate 의 계산된 box-shadow ·
# 카드 바깥 경계 아래쪽 8px 띠의 픽셀 행(그림자가 실제로 그려지는 자리).
```

픽셀 읽기는 **새 의존성 없이** 한다 — 스크린샷을 data URL 로 되돌려 캔버스에 그리고 `getImageData` 로 읽는다. Step 2 의 `a11y-smoke` 헬퍼 `readFocusRingGroundBand` 가 그 기법의 선례다. **한 점이 아니라 띠로 읽는다**(L20 · 안티에일리어싱).

**분기 규칙 — 이 계획서가 Step 4 의 범위를 정하는 지점이다.**

- **⑴ 차이가 없다** → `:211` 의 규칙이 무해하다는 뜻이다. `ds/README.md` 의 D-05 행을 「렌더로 확인했고 시각적 차이 0 — 규칙은 남기되 무해함이 기록됐다」로 닫고 **코드를 고치지 않는다.** F 와 같은 커밋에 들어간다.
- **⑵ 그림자 한 겹이 더 붙지만 눈에 띄지 않는다** → 위와 같이 닫되, 값과 픽셀 차이를 README 에 남긴다. **코드 변경 없음.**
- **⑶ 카드가 실제로 납작해진다** → 결함이다. 처방이 한 줄(그 규칙에서 `box-shadow` 를 빼거나 `--shadow-expanded` 로 맞추는 것)이고 회귀 검사를 붙일 수 있으면 **Step 3 에서 같이 착지한다.** 시각 결정(어느 그림자가 옳은가)이 필요하면 **Step 4 의 단위로 넘기고 이 계획서에는 조사 결과만 남긴다.**

**어느 분기든 `ds/README.md` 의 D-05 행 인용을 `:178`/`--card-shadow` 에서 현행 `:211`/`--shadow-rest` 로 고친다.** 그것만은 조사 결과와 무관하게 참이다.

---

## 바꾸는 파일

| 파일 | 항목 | 게이트 |
|:---|:---|:---|
| `scripts/qa/check-phase5-card-contracts.mjs` | B — 토큰 사슬 해석 | Ask-First |
| `scripts/qa/_path-config.mjs` | B — 필요하면 globals 경로 노출만 (이미 `:45` 에 있다) | Ask-First |
| `docs/blocker-traceability.json` | C — 항목 삭제 또는 재연결 | Ask-First |
| `tests/e2e/a11y-smoke.spec.ts` | C — 갈래 ⑵ 를 고르면 assertionId 부착 | — |
| `docs/design/ds/README.md` | F · D — findings 표와 머리말 | Ask-First · **저장소 밖 push** |
| `src/features/landing/grid/landing-grid-card.module.css` | D — 분기 ⑶ 이고 처방이 한 줄일 때만 | High-Risk 인접 |
| `tests/e2e/state-smoke.spec.ts` 또는 `tests/unit/landing-card-contract.test.ts` | D — 분기 ⑶ 의 회귀 검사 | — |
| `docs/decision-register.md` | 변경 이력 한 줄 + BQ-38 후속에 F·D 결과 | SSOT |
| `docs/LESSONS_LEARNED.md` | 등재 요건을 만족할 때만 | — |

## 회귀 검사

| 항목 | 무엇을 고정하나 | 어디 | 고장 주입 |
|:---|:---|:---|:---|
| B | 태그 두 채움과 56px 최소폭의 **최종 해석값** | `scripts/qa/check-phase5-card-contracts.mjs` 자신 | `--warm-150` 값 변경 · `--tag-bg` 재지정 · `--tag-min-width: 48px` 셋 다 붉어야 |
| C | blocker 5 의 모든 `assertionId` 가 실재하는 테스트를 가리킨다 | `scripts/qa/check-blocker-traceability.mjs` | 없는 id 를 하나 넣으면 붉어야 |
| D(⑶ 일 때) | 포커스 진입이 확장 카드의 들림을 죽이지 않는다 | E2E 또는 단위 | 규칙을 되살리면 붉어야 |
| F | — | 검사 대상 아님(문서) | `npm test` 의 문서 가드가 링크·수명주기를 본다 |

## Impact assessment

- **shared shell / GNB** — 무관. C 의 갈래 ⑵ 가 `a11y-smoke` 의 테스트 제목만 건드린다.
- **localization** — 무관.
- **a11y** — C 의 갈래 ⑵ 는 추적을 복원할 뿐 동작을 바꾸지 않는다. D 의 분기 ⑶ 은 포커스 가시성에 닿으므로 axe 검사를 포함한다.
- **state contracts** — 무변경.
- **core user flow** — D 의 분기 ⑶ 을 제외하면 사용자에게 보이는 변화가 없다. **이 묶음은 의도적으로 그렇다.**
- **저장소 밖** — F 의 push 가 Claude Design 프로젝트 `cd630eec` 의 `README.md` 를 덮어쓴다. 되돌리려면 같은 절차로 이전 내용을 다시 push 한다.

## 검증 명령

```bash
cd "$(git rev-parse --show-toplevel)"
npm run lint && npm run typecheck && npm test && npm run build
npm run qa:rules; echo "qa:rules exit=$?"    # 이 계획서의 단일 완료 신호 — expect exit=0
PLAYWRIGHT_SERVER_MODE=preview npx playwright test --project=chromium --workers=1 tests/e2e/a11y-smoke.spec.ts
# D 가 분기 ⑶ 이면 추가로
PLAYWRIGHT_SERVER_MODE=preview npx playwright test --project=chromium --workers=1 tests/e2e/state-smoke.spec.ts

# L11 — E2E 실행이 생성한 baseline 을 지워 추적 수와 디스크 수를 맞춘다
echo "tracked=$(git ls-files 'tests/e2e/*-snapshots/*' | wc -l | tr -d ' ') disk=$(ls tests/e2e/*-snapshots/* | wc -l | tr -d ' ')"
```

`theme-matrix-smoke` 는 돌리지 않고 `--update` 도 치지 않는다(`BQ-07`, `L11`).

## 인수 조건

1. **`npm run qa:rules` exit 0.** 이 묶음의 단일 완료 신호다.
2. B 의 세 고장 주입이 전부 붉고, 복구 후 초록. **가드를 느슨하게 만들어 통과시키지 않았음을 이것으로 보인다.**
3. C 의 반대 방향 고장 주입(없는 `assertionId`)이 붉다.
4. `ds/README.md` 의 갱신된 행이 **전부 제품 코드에서 읽은 사실**에 근거하고, 확인하지 못한 행은 그대로 남아 있다.
5. `ds/README.md` 가 `cd630eec` 로 push 됐음을 확인했다. push 가 실패하면 커밋은 유지하고 **push 미완으로 보고한다** — 조용히 넘어가지 않는다.
6. D 의 조사 결과가 세 분기 중 하나로 명시적으로 판정됐고, ⑶ 이면 Step 4 로 넘길지 여기서 착지할지가 정해졌다.
7. 기본 게이트 4 종 초록. **`src/**` 를 열지 않았다면 E2E 는 `a11y-smoke` 만으로 충분하다.**

## 사용자 확인이 필요한 결정

없다 — B·C·F 의 Ask-First 승인은 이 계획서의 승인으로 갈음한다. 다만 **다음 둘은 멈추고 보고한다**: ⒜ B 를 고치려는데 최종 해석값이 실제로 달라져 있으면(즉 제품이 정말 바뀌었으면) 그것은 청소가 아니라 결함이므로 멈춘다. ⒝ F 의 push 가 실패하면 멈춘다.

## Execution prompt

````
Read `docs/plans/2026-09-10-step3-signal-cleanup-and-ds-truth.md` and `docs/LESSONS_LEARNED.md` L19 · L20. Run the 착수 전 확인 block first and confirm `qa:rules` fails with exactly the two documented items.

Take B → C → D → F in that order, each as its own commit.

B: make `check-phase5-card-contracts.mjs` resolve the token chain into `globals.css` and assert the final resolved values, scoped to the light `:root`. Never weaken the guard — prove it with three fault injections (change `--warm-150`, repoint `--tag-bg`, set `--tag-min-width: 48px`); all three must go red.

C: open the `a11y-smoke` modal-dialog test and decide whether it genuinely covers overlay focus. Reconnect if it does, delete the entry if it does not. Do not stretch the test's meaning to manufacture traceability. Fault-inject a missing assertionId to prove the checker still bites.

D: investigate before prescribing — this is the one item the README explicitly forbids fixing unseen. Render focused and unfocused expanded cards, read the shadow band as a band not a point (L20), and classify into one of the three branches the document defines. That classification decides Step 4's scope.

F: update only the rows you verified against product code, fix the D-05 citation to its current location, add the missing D-02 row, and rewrite the table preamble's step-5 sentence. Then push with the `DesignSync` tool per `SYNC.md` (`list_files` → `finalize_plan` → `write_files`), pushing `README.md` and not `SYNC.md`.

The single completion signal is `npm run qa:rules` exiting 0. Land as one squash on `main`, move this plan to `docs/done/`, add one 변경 이력 row to `docs/decision-register.md`. Never run `theme-matrix-smoke` and never pass `--update`.
````
