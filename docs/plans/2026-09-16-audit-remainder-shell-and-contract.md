# 감사 잔여 — 공유 셸의 포커스 링(#10)과 계약에 남은 죽은 기구(#12)

**Task mode:** Plan Only. 이 문서는 코드를 바꾸지 않는다. 두 항목 모두 **승인 전에는 구현하지 않는다** — #10 은 `AGENTS.md` §4 High-Risk 경로이고 #12 는 SSOT 문서다.

**선행 확인 (착수 전에 반드시):**

```bash
cd "$(git rev-parse --show-toplevel)" && git log --oneline -1 && npm test && npm run qa:rules
```

`origin/main` 에 `tests/unit/theme-bootstrap-behavior.test.ts` 가 있어야 하고 `npm test` 가 초록이어야 한다 — 그것이 감사 잔여 앞 묶음(#8 · #9 · #11 · #13)이 착지했다는 뜻이다.

**출처.** 2026-09-15 감사의 「발굴 목록 — 채점된 작업 지시서」 #10 · #12. 같은 감사의 나머지 잔여 중 #8 · #9 · #11 · #13 은 착지했고, #6 · #7 은 자산·카피가 먼저라 이 문서에 없다. #14(데스크톱 skip link 세로 중앙)는 명세 §2-13 이 위치를 정하지 않아 step 3 §10 과 함께 처분하는 것이 낫다 — 여기서 다루지 않는다.

---

## 1. #10 — skip link 목적지 `<main>` 이 브라우저 기본 포커스 링을 그린다

### 1-1. 무엇이 일어나는가 (실측 2026-09-16, preview · chromium)

skip link 를 키보드로 활성화하면 포커스가 `<main id="page-shell-main" tabindex="-1">` 로 가고, 그 순간 **브라우저 기본 링**이 본문 전체를 두른다.

| 경로 | `main` 의 `:focus` | `:focus-visible` | `outline` |
|:---|:---:|:---:|:---|
| 키보드 `Tab` → `Enter` (1280 · 390 동일) | 참 | 참 | `auto 1px rgb(0, 95, 204)` |
| 본문을 마우스로 클릭 (1280 · 390 동일) | 거짓 | 거짓 | `none` — 포커스는 눌린 `BUTTON` 으로 간다 |

읽히는 것 둘. **⑴ 링이 그려지는 경로는 하나뿐이다** — 마우스 사용자는 이 링을 볼 수 없고, 보는 사람은 skip link 를 쓴 키보드 사용자뿐이다. **⑵ 그 하나뿐인 경로에서 제품이 아닌 색이 나온다** — 저장소의 포커스 링은 `--focus-ring`(라이트 `rgb(92, 142, 120)` sage)이고 `focusRingClassName` 이 `outline 2px + offset 2px` 로 그린다. 파란 `rgb(0, 95, 204)` 는 크롬의 기본값이며 두 테마 어디에도 없는 색이다.

### 1-2. 왜 그냥 고치지 않는가

셋이 겹친다. **⑴ `src/features/landing/shell/page-shell.tsx` 는 High-Risk 경로다**(`AGENTS.md` §4) — 라우트 일곱 전부의 공유 셸이고, `main` 은 skip link 의 유일한 목적지다. **⑵ 어느 쪽으로 고칠지가 제품 결정이다** — 「도착을 표시한다」와 「도착 표시를 지운다」 중 하나를 골라야 하고 둘 다 통용되는 관행이다. **⑶ 규범이 한쪽을 강제하지 않는다** — WCAG 2.4.7 Focus Visible 은 *keyboard operable* 컴포넌트를 대상으로 하고 `tabindex="-1"` 컨테이너는 탭 순서에 없으므로 그 대상이 아니다. 즉 지금 상태가 위반은 아니며, 고치는 이유는 **디자인 시스템 일관성**이다.

### 1-3. 선택지 셋 — 하나를 골라 주면 그대로 구현한다

| 안 | 무엇을 하는가 | 사용자가 겪는 것 | 비용 |
|:---|:---|:---|:---|
| **A (추천)** | `main` 에 제품 링을 준다 — `focusRingClassName` 과 같은 어휘(`outline 2px solid var(--focus-ring)` · `offset 2px`), `:focus-visible` 에만 | 본문에 도착한 것이 sage 테두리로 보인다. 색이 제품의 다른 포커스와 같다 | 한 줄. 1280 에서 본문 폭(최대 1280px) 전체를 두르는 큰 사각형이 잠깐 보인다 |
| **B** | `focus:outline-none` — 도착 표시를 지운다 | 링이 사라진다. 도착 신호는 스크롤 위치 변화와 그 다음 `Tab` 이 본문 첫 컨트롤로 가는 것뿐이다 | 한 줄. GOV.UK 등이 쓰는 형태 |
| **C** | 목적지를 `main` 이 아니라 본문 첫 제목(`h1`)으로 바꾼다 | 링이 제목 한 줄만 두른다. 스크린리더가 도착 지점의 이름을 읽는다 | 중간. `page-shell.tsx` 와 라우트 일곱의 본문 구조에 걸린다 — 제목이 없는 표면(404 · 에러)의 처분이 따라온다 |

**추천은 A 다.** 이유 둘. 첫째, 이 저장소는 포커스 표시를 **지우지 않는 쪽**으로 일관돼 있다 — `globals.css` 가 두 층 링을 은퇴시키면서도 링 자체는 `focusRingClassName` 하나로 모았고, 그 결정의 이유가 「링이 컨트롤마다 다를 이유가 없다」였다. B 는 그 일관성에서 `main` 하나만 예외로 빼낸다. 둘째, A 는 링이 **보이는 유일한 경로**를 제품 색으로 되돌리는 것이라 위험이 색 하나에 갇힌다. C 는 도착 지점의 의미가 나아지지만 라우트 일곱의 본문 구조를 건드리므로 이 묶음의 크기가 아니다 — 필요하면 step 3 §10 에서 표면별로 본다.

**A 를 고르면 큰 사각형이 문제가 되는가.** 1280 에서 outline 이 두르는 것은 `max-w-[1280px]` 컨테이너이고 높이는 본문 전체다. 뷰포트를 넘는 outline 은 잘려 보이므로 실제로는 상단 모서리만 보인다. 그래도 거슬리면 A 의 변형으로 `outline-offset` 을 음수로 주어 안쪽에 붙이는 방법이 있다 — 구현 시 실측으로 정한다.

### 1-4. 구현 단위 (승인 후)

- 고칠 파일: `src/features/landing/shell/page-shell.tsx` **한 곳**(High-Risk).
- 관련 SSOT: `docs/req-landing.md` §7.6 `:493-494`(skip link 계약) · §9.2 `:534`「focus ring은 명확히 보여야 한다」 · `docs/design/design.md`(시각) · `docs/plans/2026-09-14-mobile-refactor-design-spec.md` §2-13.
- **계약 갱신 여부**: A·B 어느 쪽이든 §2-13 에 목적지의 포커스 표시를 한 줄 더한다(지금 그 문장이 없어서 구현이 임의로 채웠다). B 를 고르면 §9.2 `:534` 와의 관계를 같은 줄에서 밝힌다 — `main` 은 그 조항이 말하는 컨트롤이 아니라는 것.

### 1-5. 위험 차원 (High-Risk 필수 기재)

| 차원 | 판정 |
|:---|:---|
| usability | 링이 보이는 경로가 하나뿐이라 영향 범위가 좁다. B 는 도착 신호를 없애므로 skip link 를 쓴 사용자가 「눌렸나?」를 알 길이 스크롤 변화뿐이다 |
| a11y | 규범 위반은 어느 쪽도 아니다(§1-2 ⑶). A 는 대비를 확인한다 — sage `--focus-ring` 이 `--canvas` 위에서 비텍스트 3:1 을 넘는지 두 테마 모두 잰다 |
| responsiveness | 390 · 1280 두 폭에서 outline 이 가로 스크롤을 만들지 않는 것을 확인한다(`outline` 은 레이아웃을 밀지 않지만 `offset` 이 양수면 그릴 영역이 넓어진다) |
| performance | 없음 — 정적 클래스 한 줄 |
| design-system consistency | A 의 근거 그 자체. 새 값을 만들지 않고 `focusRingClassName` 의 어휘를 쓴다 |

### 1-6. E2E 회귀 커버리지 (High-Risk 필수)

`assertion:SK-01`(`tests/e2e/a11y-smoke.spec.ts`)에 도착 뒤 `main` 의 `outline` 을 재는 단언을 더한다 — A 면 `--focus-ring` 의 계산값과 같은 색, B 면 `outlineStyle === 'none'`. 두 폭(1280 · 390)에서 잰다. **고장 주입으로 한 번 붉힌다**(L36): 클래스를 빼면 붉어지는 것을 확인한 뒤에 초록을 믿는다.

### 1-7. 검증 명령

```bash
cd "$(git rev-parse --show-toplevel)" && npm run lint && npm run typecheck && npm test && npm run build
```

```bash
cd "$(git rev-parse --show-toplevel)" && PLAYWRIGHT_SERVER_MODE=preview npx playwright test --project=chromium --grep "SK-01|axe-canonical"
```

시각 baseline 은 건드리지 않는다 — `main` 의 포커스 링은 어떤 baseline 장면에도 들어 있지 않다(baseline 은 포커스 없는 상태에서 찍힌다). **`qa:visual:full` 을 실행하지 않는다.**

---

## 2. #12 — 계약이 이미 제거된 기구를 가리킨다

### 2-1. 무엇이 어긋나 있는가

BQ-40 이 랜딩 키보드 진입 기구 셋(`use-landing-gnb-entry-mode` · `use-landing-keyboard-entry` · `use-keyboard-mode-tracker` 의 전역 `Tab` 가로채기)을 제거하고 skip link 로 교체했다. `docs/req-landing.md` §7.6 `:493-494` 가 그 결과를 선언한다 — 「탭 순서는 모든 컨텍스트에서 문서 순서를 따른다」. 그런데 같은 문서의 두 줄이 제거된 기구를 여전히 가리킨다.

| 줄 | 현재 문장 | 왜 죽었나 |
|:---|:---|:---|
| `docs/req-landing.md:556` | `GNB-to-landing keyboard focus transfer must skip card triggers with aria-disabled="true"…` | 그 transfer 를 수행하던 코드가 없다. 탭 순서는 브라우저가 소유하고, unavailable 카드 제외는 `tabIndex=-1`(같은 절 `:496`)이 이미 따로 규정한다 |
| `docs/req-landing.md:901` | 인수 조건 5 의 `Landing-only GNB↔card focus transfer` | 같은 기구. 그 항목을 PASS 로 판정할 E2E 가 이제 없다 — `gnb-smoke` 의 두 keyboard-matrix 케이스는 2026-09-15 에 문서 순서 단언으로 다시 쓰였다 |

한 문서 안에서 `:493-494` 와 `:556`·`:901` 이 서로 다른 것을 말한다. 다음 세션이 어느 쪽을 계약으로 읽을지는 어느 줄을 먼저 여느냐에 달린다.

### 2-2. 제안

두 줄을 **지우는 것이 아니라 결과 기준으로 다시 쓴다**(step 2 가 세운 개정 문법). `:556` 이 지키려던 것은 「unavailable 카드는 키보드로 활성화되지 않는다」이고 그것은 `:496` 과 `:554-555` 가 이미 갖는다 — 그러므로 `:556` 은 **중복이므로 삭제**한다. `:901` 은 인수 조건 목록이라 항목을 지우면 그 자리가 비므로, `Landing-only GNB↔card focus transfer` 를 `문서 순서 탭 이동과 skip link 목적지 도달` 로 **교체**한다. 그 교체본은 실재하는 증인을 갖는다 — `assertion:SK-01` 과 `assertion:B3/B7-gnb-keyboard-matrix`.

### 2-3. 구현 단위 (승인 후)

- 고칠 파일: `docs/req-landing.md` **한 곳**(SSOT · Ask-First).
- 함께 붉어질 것: `tests/unit/contract-citations.test.ts` 가 `AGENTS.md`·`.claude/CLAUDE.md`·`docs/agent-guides/**` 의 §번호·경로 인용을 검사한다. §7.6 의 절 번호는 움직이지 않으므로 영향이 없을 것으로 보이나 **같은 커밋에서 `npm test` 로 확인한다**.
- 검증: 위 §1-7 의 기본 게이트. E2E 는 이미 있는 증인 둘이 그대로 초록이면 된다.

---

## 3. 이 단계에서 하지 않는 것 (do not)

- **#10 을 승인 없이 구현하지 않는다.** High-Risk 경로이고 A·B·C 는 제품 결정이다.
- **#12 를 승인 없이 구현하지 않는다.** SSOT 문서다.
- **`main` 의 목적지를 바꾸지 않는다**(안 C)는 이 문서의 추천이 아니다 — 고르면 라우트 일곱의 본문 구조가 따라오므로 별도 단위로 계획을 다시 쓴다.
- **시각 baseline 을 재생성하지 않는다.** `qa:visual:full` · `--update-snapshots` 금지.
- **skip link 자신의 위치(#14)를 여기서 정하지 않는다** — 명세 §2-13 이 로고와의 관계를 정하지 않았고, step 3 §10 이 GNB 컨트롤 규격(36px 껍데기 · 44px 히트)을 다시 그릴 때 함께 정하는 것이 맞다.

## 4. 실행 프롬프트

**「`docs/plans/2026-09-16-audit-remainder-shell-and-contract.md` 를 그대로 실행하라. §1-3 에서 사용자가 고른 안으로 #10 을 구현하고 §1-6 의 E2E 단언을 같은 커밋에 넣되 고장 주입으로 한 번 붉혀라. #12 는 §2-2 대로 `:556` 삭제 · `:901` 교체다. §1-7 의 게이트를 돌리고 `qa:visual:full` 은 치지 마라.」**
