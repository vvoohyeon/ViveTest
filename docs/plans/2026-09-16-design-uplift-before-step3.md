# step 3 착수 전 디자인 완성도 — 역반영은 막혀 있고, 공백은 다른 곳에 있다

**Task mode:** Plan Only. 이 문서는 코드도 `docs/design/ds/**` 도 바꾸지 않는다. §5 의 승인 하나가 있어야 착수한다.

**질문.** 「Claude Design 쪽에서 디자인을 한 번 더 개정하고 그것을 저장소에 역반영하면 완성도가 올라가는가.」

**답.** 그 모양으로는 올라가지 않는다. 계약이 막고 도구가 없다(§1). 그런데 재는 동안 더 큰 것이 나왔다 — **step 3 이 만들 표면의 절반을 디자인 시스템이 갖고 있지 않고, 이미 확정된 명세와 세 곳에서 어긋나 있으며, 한 곳은 step 3 이 삭제할 모델을 정본으로 적고 있다**(§2). 완성도는 역반영이 아니라 그 공백을 닫는 데서 온다(§3).

---

## 1. 역반영이 막히는 세 가지 이유

**⑴ 계약이 그 방향을 금지하고, 그 금지에는 측정된 근거가 있다.** `docs/design/ds/SYNC.md` §What each side owns: 「The repository owns the **content**. Claude Design owns the **rendering and the canvas**. Every value is written here and pushed there; nothing is authored on the Claude Design side and copied back by hand.」 `AGENTS.md` §3 이 같은 것을 한국어로 적는다. 이유도 적혀 있다 — 종전에 토큰 값이 저장소 밖 하네스에 있었고 두 쪽이 **세 번**(BQ-21 · R1 · R2) 어긋나 화해 라운드를 세 번 돌았다. 방향을 되돌리면 그 실패가 그대로 돌아온다.

**⑵ 「Claude Design 이 개정한다」를 실행할 도구가 없다.** 이 세션이 가진 `DesignSync` 는 **파일 API** 다 — `list_projects` · `get_project` · `list_files` · `get_file` · `finalize_plan` · `write_files` · `delete_files` · `register_assets`. 디자인을 **생성하라고 시키는 메서드가 없다.** 그러므로 「저쪽에서 개정」은 사람이 claude.ai/design 에 앉아 직접 하는 것을 뜻하고, 그것은 줄이려던 공수 그 자체다.

**⑶ 시점이 틀렸다.** 시각·인터랙션 명세(`docs/plans/2026-09-14-mobile-refactor-design-spec.md`)는 디자인 리뷰 세 차례 + 외부 리뷰 한 차례를 거쳐 **확정**됐고 스스로 「여기 적힌 것은 다시 묻지 않는다」고 선언한다. step 3 계획서 전체가 그 명세를 향해 쓰여 있다. 지금 새 개정 라운드를 열면 확정을 다시 열고, step 3 을 다시 쓰고, 사용자가 이미 세 번 한 결정을 네 번째로 하게 된다.

**그래서 역반영은 하지 않는다.** 다만 **되돌아오는 채널이 이미 하나 있고 그것은 값이 아니라 발견**이다 — `README.md` 의 findings 표(D-01~D-12)와 `preview/catalog-drift.html` 이 그 채널이며, 아래 §3 은 그 채널을 쓴다.

---

## 2. 실제 공백 — 명세 × ds/ × 아트보드 전수 대조

**`docs/design/ds/` 의 findings 표는 전부 닫혀 있다**(D-01~D-12 resolved, 열린 행 0). 즉 「지금 있는 것」은 건강하다. 문제는 **없는 것**이다.

측정: `app-components.css` 와 `catalog-components.css` 의 `.vt-*` 선언 전수, `colors_and_type.css` 의 토큰 전수, 그리고 캔버스 아트보드 24 장의 파일명(2026-09-16).

| 명세 항목 | `docs/design/ds/` 가 정의하는가 | 아트보드 | 판정 |
|:---|:---|:---|:---|
| 시트 프리미티브 §3-4 | **없음** — `grabber` · `dvh` · `safe-area-inset` · `overscroll-behavior` 가 ds CSS 전체에 **0 회** | 없음 | **공백** |
| 폰 카드 확장은 시트다 (규칙 3) | `.vt-expanded--mobile` 이 **현행 전면 모델**을 정본으로 적는다(「spans the whole viewport, drops every corner radius」) — step 3 §1 이 **삭제**할 모델 | `TapAfter` | **역행** |
| instruction 시트 §2-3 | 없음 | `InstructionKeep` (명세가 **낡았다고 명시**) | **공백** |
| 동의 배너 2 버튼 (규칙 4) | `.vt-banner__actions` 에 무게 구분 없음. 게다가 `docs/done/2026-09-07-step5b-…` 가 「거부는 수락과 같은 버튼 무게를 유지한다」를 **의도된 결정으로 등재** | `EntryAfter` | **충돌** |
| 재호출 배너의 X · 이전 선택 표시 §2-5 | 없음 | `PrivacyRecall` · `PrivacyRecallDeny` | **공백** |
| 조용한 설정 pill §2-9 | `.vt-pill` 이 `border: 1px solid var(--hairline-strong)` + `font-weight: 600`. 명세는 「테두리 없음, 배경 없음, `font-weight` 기본값」 | `DesktopPillAfter` | **충돌** |
| 레이어가 pill 을 덮는다 (규칙 8) | `.vt-settings__panel { top: 100%; right: 0 }` — pill **아래**에 매단다. 명세는 우측 상단 모서리를 pill 의 우측 상단에 맞추고 **덮으며** 펼친다 | `DesktopPillAfter` | **충돌** |
| 마크가 둘이다 (규칙 5) | `System` 선택됨 칩은 있으나 **배지 점 없음** | `ThemeStates` | 부분 |
| 드로어 재배치 §2-4 | `.vt-drawer` 는 있으나 「설정 최상단 · 이동 최하단」 순서를 보여 주는 specimen 없음 | `DrawerAfter` | 부분 |
| `OPTED_OUT` 고지 행 §2-1 | 없음 | 없음 | **공백** |
| skip link §2-13 | 없음 | 없음 | **공백** |
| 랜딩 페이지 제목 영역 §2-12 | 없음 | 없음 | **공백** |
| 확장 메타 행 좌/우 §3-3 | `.vt-meta` 는 단일 wrap flex(`column-gap`) — 좌우 분리 아님 | `MetaDetail` | 부분 |
| GNB 36px 껍데기 / 44px 히트 §3-1 | `.vt-pill` 의 `min-height: var(--tap-min)` 하나 — 보이는 것과 만지는 것이 갈리지 않음 | `GnbDetail` | 부분 |
| 히스토리 목록 항목 §2-7 | 없음(`.vt-datarow` 는 다른 일을 한다) | `HistoryAfter` | **공백** |

**합계: 공백 6 · 충돌 3 · 역행 1 · 부분 5.** 명세가 이름으로 부르는 토큰은 전부 실재한다(`--overlay-scrim` · `--shadow-overlay` · `--radius-xl` · `--tap-min` · `--ease-standard` · `--ease-in` · `--sage-muted` · `--muted-aa` 등 12 종 확인). 즉 **어휘는 있고 문장이 없다.**

**이 표가 말하는 것.** step 3 이 이대로 착수하면 저 15 행을 **제품 코드에서 즉흥으로** 정하게 된다. 그것이 감사의 「디자인 완성도」 렌즈가 이미 잡은 형태다 — 「명세가 말하지 않아 구현이 임의로 채운 자리」(skip link 위치 · `main` 포커스 링). 그리고 충돌 3 건은 더 나쁘다: **디자인 시스템이 step 3 을 적극적으로 오도한다.** 구현자가 `.vt-pill` 을 근거로 테두리를 그리면 명세 위반이고, 근거를 댈 수 있으므로 리뷰도 통과한다.

---

## 3. 대안 — 명세를 다시 열지 않고, 명세가 정한 것을 ds/ 에 **먼저 그린다**

한 문장: **저작 위치를 옮기지 말고, 저작 시점을 앞으로 당긴다.**

지금까지 순서는 「명세 → 제품 구현 → (언젠가) ds/ 반영」이었고, 마지막 칸은 실제로 밀렸다(답변 버튼 상태가 그랬고, 그래서 `answer-choice-catalog-parity.test.ts` 가 생겼다). 순서를 「명세 → **ds/ specimen** → 제품 구현」으로 바꾸면 셋이 한꺼번에 해결된다. 완성도가 오르는 지점은 **시트·고지 행·설정 레이어를 React·12 locale·baseline 에 얹기 전에, 독립 HTML 에서 보고 고칠 수 있다**는 것이다. 지금은 같은 수정 한 번에 빌드 + E2E + baseline 주기가 붙는다.

Claude Design 은 계약대로 **렌더와 캔버스**를 계속 맡는다. 저장소가 그린 specimen 을 push 하면 Design System pane 에서 카드로 보이고, 원하면 거기서 눈으로 확인하면 된다. 확인은 선택이고 의무가 아니다.

### 3-1. 단계

| # | 단위 | 산출 | 사람 공수 |
|:--:|:---|:---|:---|
| 1 | **충돌 3 건 정정** | `.vt-pill` 의 테두리·weight, `.vt-settings__panel` 의 위치, `.vt-banner` 의 버튼 무게를 명세에 맞춘다. `docs/done/2026-09-07-step5b` 의 옛 결정이 **명세로 대체됐음**을 `README.md` findings 에 한 행으로 등재한다 | 0 |
| 2 | **공백 6 건 작성** | 시트 프리미티브 · instruction 시트 · 고지 행 · 재호출 배너 · skip link · 랜딩 제목 영역. CSS + `preview/*.html` specimen, 토큰만 쓰고 리터럴 금지 | 0 |
| 3 | **부분 5 건 보강** | 배지 점 · 드로어 순서 · 메타 행 좌우 · GNB 36/44 · 히스토리 행 | 0 |
| 4 | **렌더 비평 루프** | 각 specimen 을 390 · 768 · 1280 × light/dark × en/ko 로 렌더해 **그림을 직접 보고** 명세 §4 의 반복되는 결함 셋(중앙 정렬 기준 · 마크가 레이아웃을 건드림 · 라벨 두 줄 접힘)과 대조해 고친다. 수치는 함께 잰다 — 대비 AA · 타깃 44px · 12 locale 오버플로 0 | 0 |
| 5 | **단방향 push** | `finalize_plan` → `write_files`. Design System pane 에서 카드로 보인다 | 보고 싶으면 본다 |
| 6 | **패리티 가드** | `answer-choice-catalog-parity.test.ts` 의 형태를 넓혀, step 3 이 새 컴포넌트를 제품에 넣으면 대응 specimen 이 있는지를 `npm test` 가 묻게 한다 | 0 |

**4 번이 이 계획의 품질 상승분이 실제로 나오는 자리다.** 이 저장소는 지금까지 수치를 많이 쟀지만 **그림을 보고 고치는 루프**는 거의 돌지 않았다. specimen 은 독립 HTML 이라 그 루프가 초 단위로 돈다.

### 3-2. 출처 표기 — 이것들은 `R` 이 아니라 `I`/`D` 다

`AGENTS.md` §3-1 이 시각 값의 출처를 넷으로 가른다. `docs/design/ds/` 는 지금 **`R`(제품이 실제로 렌더하는 값)의 거울**이다. 아직 만들지 않은 표면의 specimen 은 **`I`(intent)** 이므로 그렇게 **표시해서** 넣는다 — 「realized 로 제시 금지」가 그 조항이다. 구체적으로 specimen 파일 머리와 CSS 블록 주석에 `[intent — step 3 §N 이 구현한다]` 를 적고, step 3 착지 후 실측으로 다시 재어 `R` 로 승격시킨다. 그 승격 자체가 step 3 의 완료 조건 한 줄이 된다.

### 3-3. 하지 않는 것

- **명세를 고치지 않는다.** 확정된 결정은 그대로 구현 대상이다. specimen 이 명세와 어긋나면 **specimen 이 틀린 것**이다.
- **Claude Design 에서 저작하지 않는다.** 값은 저장소에서 쓰고 push 만 한다.
- **`colors_and_type.css` 의 토큰 값을 바꾸지 않는다.** §2 가 확인한 대로 어휘는 이미 충분하다. 새 토큰이 필요하면 그 필요를 먼저 등재한다.
- **`qa:visual:full` 을 치지 않는다.** 이 작업은 제품 픽셀을 건드리지 않는다.
- **step 3 의 IA·형태 결정을 앞질러 정하지 않는다.** specimen 은 명세가 **이미 정한 것**만 그린다.

---

## 4. 이것이 실제로 완성도를 올리는가 — 반증

**올리지 못하는 경우가 하나 있다.** specimen 이 제품 구현과 갈라지면 그림만 예뻐지고 화면은 그대로다. 그 위험은 실재하고 이 저장소에서 이미 한 번 났다 — `catalog-components.css` 는 「제품에 이식할 수 없는 스펙 스타일시트」이며 런타임이 소비하지 않는다(`AGENTS.md` §2).

**그래서 6 번 단위가 선택이 아니라 필수다.** 패리티 가드가 없으면 이 계획은 「예쁜 문서를 하나 더 만드는 일」로 끝난다. 가드가 있으면 step 3 이 컴포넌트를 넣을 때마다 specimen 의 존재를 `npm test` 가 묻고, specimen 이 곧 구현 지시서가 된다.

**두 번째 반증.** 「어차피 step 3 이 구현하면서 보게 되는데 미리 그리는 게 낭비 아닌가.」 아니다 — 차이는 **되돌리는 비용**이다. 시트의 헤더 높이를 한 번 고치는 데, specimen 은 파일 저장 + 새로고침이고 제품은 빌드 + E2E + (시각 변경이면) baseline 승인이다. 그리고 step 3 은 밀도(§7)와 확장 모델(§1)을 한 커밋에 묶지 말라고 스스로 적을 만큼 이미 크다.

---

## 5. 사용자 확인이 필요한 결정 — 하나

**`docs/design/ds/**` 는 `AGENTS.md` §4 Ask-First 다**(편집이 저장소 밖으로 나간다). §3 의 여섯 단위를 착수해도 되는지만 답하면 된다. 나머지는 전부 자동이다.

세 갈래가 있고 **A 를 추천한다.**

| 안 | 범위 | 얻는 것 | 잃는 것 |
|:---|:---|:---|:---|
| **A (추천)** | §3-1 의 여섯 단위 전부 | step 3 이 그려진 specimen 을 보고 구현한다. 충돌 3 건이 오도를 멈춘다. 가드가 재발을 막는다 | 이 작업 자체의 시간 |
| B | 1 번(충돌 3 건)만 | 오도는 멈춘다 | 공백 6 건은 여전히 제품 코드에서 즉흥으로 정해진다 |
| C | 아무것도 하지 않고 step 3 착수 | 지금 시작한다 | 15 행이 즉흥이 되고, ds/ 는 다시 뒤처진다 |

**A 를 추천하는 이유.** 충돌 3 건만 고치는 B 는 **디자인 시스템이 틀린 말을 멈추게 할 뿐 옳은 말을 하게 하지는 못한다.** 그리고 공백 6 건 중 넷(시트 · instruction 시트 · 고지 행 · 재호출 배너)은 step 3 §1~§3 이 **첫 세 단위에서 바로** 만드는 것이라 미룰 수 있는 거리가 없다.

## 6. 검증

```bash
cd "$(git rev-parse --show-toplevel)" && npm run lint && npm run typecheck && npm test && npm run build
```

specimen 은 런타임이 소비하지 않으므로 제품 게이트는 영향을 받지 않아야 한다 — **받으면 그것이 결함이다**(`design-ds-boundary.test.ts` 가 그 경계를 지킨다). 추가로 4 번 단위의 렌더 비평은 그 자체가 증거이고, 측정값은 specimen 파일 주석에 `file:line` 과 함께 남긴다.

## 7. 실행 프롬프트

**「`docs/plans/2026-09-16-design-uplift-before-step3.md` 를 그대로 실행하라. §3-1 의 1 → 2 → 3 → 4 → 5 → 6 순서를 지키고, §3-2 대로 새 specimen 을 `I`(intent)로 표시하라. 명세를 고치지 말고, 명세와 specimen 이 어긋나면 specimen 을 고쳐라. 4 번 단위에서는 그림을 실제로 보고 명세 §4 의 결함 셋과 대조하라. 6 번 가드는 고장 주입으로 한 번 붉혀라.」**
