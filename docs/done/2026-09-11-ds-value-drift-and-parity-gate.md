# tier-3 7 · 10 — 산문이 되풀이하던 값을 걷어내고, 그 자리를 게이트로 채운다

- **작성·착지** 2026-09-11
- **Task mode** Implementation
- **선행** `15fd2fd`(BQ-07 마감) 착지
- **원 계획** `docs/done/2026-09-07-candidates_7-readme-value-drift.md` · `docs/done/2026-09-07-candidates_10-drift-gate.md`

## 1. 7 — `README.md` 가 값을 되풀이한다

계획서의 줄 번호는 낡아 있었다(그 뒤 step 3 이 이 파일을 고쳤다). 계획서가 요구한 대로 편집 전에 grep 을 다시 돌렸고, *Visual foundations* 절에서 스물세 줄이 값을 들고 있었다.

**처분은 계획서의 중간 노선이다.** 이름이 요점인 곳은 값을 지우고 토큰 이름만 남겼다 — `--canvas` 가 따뜻한 오프화이트라는 것을 쓰는 데 `#fbfaf7` 은 필요 없고, 필요하면 swatch 카드가 한 번의 클릭 거리에 있으며 그쪽은 절대 낡지 않는다. 살아남은 것은 셋이다: **대비 측정값**(팔레트에 대한 사실이지 팔레트의 사본이 아니다) · **사다리의 모양이 가르침인 것**(타입 · 여백 · 지속시간) · **컴포넌트 스펙**(포커스 링 2px, 스피너 16px 처럼 토큰이 아닌 수). 살아남은 줄은 전부 `<!-- ds-literal: kind -->` 표식을 단다 — 다음 항목의 게이트가 영어 산문을 파싱하지 않고도 찾을 수 있어야 하기 때문이다.

**이미 틀려 있던 한 줄.** 종전의 `Cards lay out 3-up desktop → 2-up tablet → 1-up mobile` 은 `design.md` §7.7 의 **비대칭** 규칙(첫 행 3 · 이후 4)을 관습적인 3-up 격자로 뭉갰다. 제품은 §7.7 쪽이다. 그 줄을 §7.7 의 사다리 전체로 바꾸고 소유자를 §7.7 로 지목했으며, `preview/grid-rhythm.html` 을 가리킨다.

**곁가지 하나 — `design.md` 의 좌우 여백 서술.** §5.10 의 주석과 산문이 24px 을 「desktop/tablet container side padding」이라고 평평하게 적고 있었다. `222a542` 가 그 여백을 3 단(16 / 20 / 24)으로 실현했으므로 24px 은 이제 **900px 이상**에만 참이다. 두 곳을 tier 를 밝혀 고쳤다(`req-landing.md` §6.1 을 인용).

`SYNC.md` 의 「값을 산문으로 되풀이해 조용히 표류하는 파일 **넷**」 표에서 `README.md` 가 빠져 **셋**이 됐다.

## 2. 10 — 아무것도 표류를 탐지하지 않는다

`scripts/qa/check-design-token-parity.mjs` 를 신설하고 `run-all.mjs` 의 열세 번째 검사로 넣었다(`AGENTS.md` §5 의 「12 contract checks」 → 13; `tests/unit/qa-registry.test.ts` 가 그 문장과 실제 목록을 대조한다).

네 가지를 본다.

1. **`design.md` §5 ↔ `colors_and_type.css` 의 light `:root`** — 이름이 겹치는 토큰만. 실측: 45 개가 겹치고 42 개가 일치한다.
2. **면제 목록은 스크립트 상수가 아니라 `decision-register.md`** 의 `ds-parity-allowlist` 표다. `BQ-38` 의 규칙(「달라져야 하면 **쓰기 전에** 등재한다」)을 기계가 집행하게 하려면 등재가 기계가 읽는 형태여야 하는데, 여태 그것은 산문 안에 있었다. 표를 신설하고 실제 이탈 셋(`--body` · `--dur-base` · `--dur-expand`)을 근거와 함께 옮겨 적었다. **등재되지 않은 이탈도, 더 이상 이탈이 아닌 등재도 실패다** — 낡은 면제는 다음 이탈을 가린다.
3. **`design.md` §5.11 ↔ §8** — 같은 문서가 모션 토큰을 두 번 적고 두 사본이 함께 낡은 전력이 있다. 6 개를 대조한다.
4. **번들 `README.md` 의 *Visual foundations*** — hex 금지, 남은 수치 리터럴은 표식 필수, 그리고 **산문이 이름으로 부르는 토큰이 실제로 존재하는지**. 산문 속 오타난 토큰 이름은 아무 데서도 붉지 않는다.

검사는 초록 한 줄로 끝나지 않고 **무엇을 몇 개 비교했는지**를 출력한다 — 0 개를 조용히 비교하고 통과하는 것이 이 장르의 고전적 실패 모드다. 현재 출력: `compared 45 shared tokens (45 in design.md §5, 198 in colors_and_type.css :root), 6 motion tokens restated in §8, 56 token names and 13 marked literals in the bundle README.`

### 계획서의 비교 ④ 는 짓지 않았다 — 전제가 낡았다

계획서는 `landing-grid-card.module.css` 의 scoped `--normal-*`/`--expanded-*` 21 개가 **하드코딩 hex** 라는 전제로 카탈로그 별칭과의 대조표를 요구했다. 2026-09-11 확인: 21 개 전부가 `var()` 사슬이고 하드코딩은 0 건이다 — theme cut(`986a956`)이 이미 그렇게 바꿨다. 사슬은 사본이 아니므로 대조할 두 값이 없고, 「읽는 이름이 전부 선언돼 있는가」는 `tests/unit/design-tokens-dark-parity.test.ts` 가 이미 갖는다. 짓지 않은 이유를 스크립트 머리말에 적어 두었다.

### `globals.css` 도 보지 않는다

계획서의 금지와 같은 결론이되 이유는 다르다. 계획서는 「theme cut 전의 동결 계층이라」고 적었는데 theme cut 은 끝났다. 지금 보지 않는 이유는 **그 대조를 `design-tokens-dark-parity.test.ts` 의 `@mirror-*` 가드가 이미 갖고 있고, 같은 규칙을 두 곳에 두면 표류하기 때문**이다.

## 3. 고장 주입 — 일곱 방향 전부 붉다

| # | 주입 | 결과 |
|:--|:--|:--|
| ① | `colors_and_type.css` 의 `--hairline` 값 변경 | `--hairline diverges without a registered deviation … design.md §5 says "#E6E2D8", … resolves to "#d6d1c4"` |
| ② | 등재 표에서 `--dur-expand` 행 삭제 | `--dur-expand diverges without a registered deviation …` |
| ③ | `design.md` §8 만 `--dur-base: 200ms` 로 | `stated twice … §5.11 "220ms" vs §8 "200ms"` |
| ④ | README 에 hex 복귀 | `restates a colour literal (#c2855b)` |
| ⑤ | README 표식 하나 제거 | `carries a numeric literal with no marker: …` |
| ⑥ | README 토큰 이름 오타 | `names --border-stronger, which … does not declare under ":root"` |
| ⑦ | 일치하는 토큰을 등재 표에 추가 | `registered as a deviation but the two sides now agree — remove the stale row` |

## 4. push

`README.md` 한 장만 `cd630eec-25e4-4613-a58f-c671c80297ca` 로 push 하고 `get_file` 로 되읽어 편집본이 올라갔음을 확인했다(`SYNC.md` 의 `list_files` → `finalize_plan` → `write_files` 순서). `SYNC.md` 자신은 push 대상이 아니다.

## 5. 남은 것 — `candidates_8`

tier-3 의 마지막 항목은 열린 채다. **종전 보고에서 「단방향 규칙 때문에 막혀 있다」고 적은 것은 오독이었다** — 계획서는 막힌다고 말하지 않고 푸는 순서를 지정한다: `vive-components.css` 를 `get_file` 해서 저장소에 **먼저 커밋으로 미러**하고(`SYNC.md` 표 갱신 포함), 그 다음에 편집한다. 즉 규칙을 어기는 게 아니라 지키는 절차다.

다만 그 항목은 사용자 결정을 하나 안고 있고, 계획서가 그것을 「방치로 정하지 말고 명시적으로 정하라」고 적는다: **일반 VIVE 컴포넌트(`.btn` · `.input` · `.card` · `.menu`)가 중요한가.** `step6` 이 확인한 대로 이 항목은 ViveTest 표면에 영향이 없다 — 제품은 `app-components.css` 를 쓰고 그쪽의 `--radius-md` 사용은 `design.md` §6.4 의 선택과 일치한다. 답이 「일반 컴포넌트는 아무도 배포하지 않는 참조물」이면 이 항목은 심각도 하로 떨어지고 가드 문장 한 줄만 남기고 닫을 수 있다.
