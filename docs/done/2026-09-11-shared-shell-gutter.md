# 공유 셸 좌우 여백 — 선언된 3 단 규칙이 한 번도 렌더된 적 없다

- **작성** 2026-09-11
- **Task mode** Implementation
- **Wave** 해당 없음 (rebuild wave 작업이 아니다 — 출시된 결함의 원인 교정)
- **선행** `4cb6be9`(dev 복구) 착지 · `npm run qa:rules` exit 0

## 1. 사실 — 측정값

`docs/req-landing.md:184` 이 좌우 여백 계약을 갖는다: **Desktop/Tablet `24px`(좁은 폭 `20px` 허용), Mobile `16px`**. `src/features/landing/grid/layout-plan.ts:4-7` 이 그 계약을 세 상수와 경계 하나로 선언한다 — `MOBILE_SIDE_PADDING = 16` · `NARROW_TABLET_SIDE_PADDING = 20` · `TABLET_DESKTOP_SIDE_PADDING = 24` · `NARROW_PADDING_MAX_VIEWPORT_WIDTH = 899`.

공유 셸의 두 표면이 그 3 단 규칙을 **각자 다른 철자로** 적었고, **둘 다 졌다.** 2026-09-11 dev(`next@16.2.4` Turbopack, chromium) 실측:

| viewport | `.page-shell-main` padding-inline | `.gnb-inner` padding-inline | 콘텐츠 좌단 차 |
|---:|---:|---:|---:|
| 390 | 16px | 16px | 0.00 |
| 767 | 16px | 16px | 0.00 |
| 768 | **20px** | **24px** | **-4.00** |
| 899 | **20px** | **24px** | **-4.00** |
| 900 | **20px** | **24px** | **-4.00** |
| 1024 | **20px** | **24px** | **-4.00** |
| 1100 | **20px** | **24px** | **-4.00** |
| 1279 | **20px** | **24px** | **-4.00** |
| 1280 | **20px** | **24px** | **-4.00** |
| 1600 | **20px** | **24px** | **-4.00** |

읽는 법 두 가지. ⑴ `main` 은 768 이상 **모든** 폭에서 20px 이다 — `min-[900px]:px-6` 이 한 번도 이긴 적이 없어 `≥900 → 24px` 계약이 미출시 상태다. ⑵ `gnb-inner` 는 768 이상 모든 폭에서 24px 이다 — `min-[768px]:max-[899px]:px-5` 가 한 번도 이긴 적이 없어 좁은 폭 20px 이 미출시 상태다. 그 결과 **768px 이상 모든 폭에서 GNB 콘텐츠와 본문 콘텐츠가 4px 어긋난 채 출시돼 있다.**

## 2. 원인

Tailwind v4 는 소스에 적힌 순서가 아니라 자체 variant 정렬 순서로 규칙을 emit 한다. 이 설정에서 `md:`(named breakpoint)는 `min-[...]`·`min-[...]:max-[...]`(arbitrary variant) **뒤에** 나온다. 두 규칙은 명시도가 같으므로 뒤에 나온 쪽이 이기고, 따라서 `md:px-N` 이 겹치는 구간 전체를 가져간다. 어느 쪽 표면이든 `md:` 와 arbitrary breakpoint 를 같은 속성에 함께 쓰면 arbitrary 쪽이 죽는다 — `docs/LESSONS_LEARNED.md` L10 과 같은 계열이다.

**두 표면이 같은 값을 각자 적었다는 것이 결함이 두 번 나고 서로 어긋난 이유다.** 원인 교정의 경계는 거기까지다: 여백 정의를 하나로 만들고 두 표면이 그것을 소비하게 한다.

## 3. 변경

| 파일 | 변경 |
|:---|:---|
| `src/app/globals.css` | 제품 레이어 `:root` 에 `--shell-gutter` 신설 + 768 · 900 두 미디어 쿼리. 세 값이 이 파일에 **한 번씩만** 나온다 |
| `src/features/landing/shell/page-shell.tsx` | `px-4 md:px-5 min-[900px]:px-6` → `px-(--shell-gutter)` |
| `src/features/gnb/site-gnb.tsx` | `px-4 md:px-6 min-[768px]:max-[899px]:px-5` → `px-(--shell-gutter)` |
| `tests/unit/shared-shell-gutter.test.ts` | 신설 — `globals.css` 의 세 값이 `layout-plan.ts` 상수와 같은지, 두 표면이 같은 토큰을 쓰는지 |
| `tests/e2e/gnb-smoke.spec.ts` | 신설 케이스 — 6 개 폭에서 두 표면의 computed padding 과 콘텐츠 좌단을 읽어 계약값·상호 일치를 단언 |
| `tests/e2e/grid-smoke.spec.ts` | 경계 viewport 산식이 `NARROW_TABLET_SIDE_PADDING`(20) 을 쓰고 있다 — 그 폭들은 900 이상이므로 `TABLET_DESKTOP_SIDE_PADDING`(24) 이 맞다 |

`px-(--shell-gutter)` 는 단일 유틸리티라 같은 속성을 두고 경쟁하는 규칙이 없다 — emit 순서가 결과를 바꿀 수 없는 형태로 만드는 것이 교정의 핵심이다.

## 4. 영향

- **shared shell / GNB** — High-Risk 표면 둘 다. 시각 효과는 768 이상에서 본문 좌우 여백 +4px, GNB 좌우 여백은 768–899 에서 -4px. 두 표면이 모든 폭에서 정렬된다.
- **grid 기하** — `main` 콘텐츠 폭이 900 이상에서 8px 줄어든다(좌우 각 4px). `layout-plan.ts` 의 컬럼 임계(1040 · 1160)는 grid inline-size 기준이므로 임계 자체는 불변이고, 그 임계에 도달하는 **viewport** 폭이 8px 올라간다. theme-matrix 의 여섯 viewport 전부에서 columnMode 는 바뀌지 않는다(1440→1232 wide · 1180→1132 medium · 1024→976 two-column · 1023→975 · 900→852 · mobile 무변).
- **localization / a11y / state contracts / core flow** — 없음. 텍스트·포커스 순서·상태 기계·라우팅 무변경.
- **visual baseline** — theme-matrix 추적 baseline 48 장 중 tablet·desktop viewport 케이스가 4px 만큼 달라진다. **이것이 이 계획이 baseline 재생성보다 먼저 와야 하는 이유다.** 재생성은 사람 승인이 필요한 Hard stop(`AGENTS.md` §4)이므로 §6 에 결정 항목으로 둔다.

## 5. 검증

```
npm run lint
npm run typecheck
npm test
npm run build
npm run qa:rules
```

추가(`verification-commands.md` #landing): `tests/unit/shared-shell-gutter.test.ts` · gnb-smoke · grid-smoke.

고장 주입 — 실행 결과. ⑴ `globals.css` 의 900 구간 값을 `20px` 으로 바꾸니 첫 번째 단위 테스트가 붉어졌다. ⑵ `page-shell.tsx` 에 `md:px-5` 를 되돌려 넣으니 세 번째가 붉어졌다. ⑶ 새 E2E 는 수정 전 코드에서 `gnb padding-left @ 768: Expected 20 Received 24` 로 먼저 실패했다.

## 6. 결과 — 실측 (수정 후)

| viewport | `.page-shell-main` | `.gnb-inner` | 콘텐츠 좌단 차 |
|---:|---:|---:|---:|
| 390 · 767 | 16px | 16px | 0.00 |
| 768 · 899 | 20px | 20px | 0.00 |
| 900 · 1024 · 1100 · 1279 · 1280 · 1600 | 24px | 24px | 0.00 |

## 7. `@gate` E2E 의 실제 상태 — 이 변경과 무관하게 이미 붉다

착수 시점에는 이 변경이 추적 baseline 48 장을 무효화하므로 재생성 승인이 필요하다고 적었다. **측정해 보니 전제가 틀렸다.** `main`(`4cb6be9`) 을 그대로 clone 해 primary 의 로컬 baseline 을 미러한 통제군에서 `--grep @gate` 를 돌린 결과는 **125 failed · 1 passed** 였고, 같은 조건에서 이 변경을 얹은 결과도 **125 failed · 1 passed** 로 동일하다. 즉 이 변경은 초록인 게이트를 붉히지 않는다 — 그 게이트는 이미 전부 붉다.

내역: theme-matrix 시각 비교 ~119 건(추적 48 장의 마지막 재생성은 2026-05-17 이고 그 뒤 `f3acb9f` 의 `aspect-[16/6]`·타입 스케일 변경과 rebuild wave 전체, Step 1–4 가 지나갔다), safari-hover-ghosting 6 건 — 그중 하나는 시각 비교가 아니라 webkit 에서 `data-card-state="expanded"` 가 오지 않는 **행동** 실패다(`safari-hover-ghosting.spec.ts:188`).

따라서 baseline 재생성은 이 계획의 전제 조건이 아니다. BQ-07 마감(별도 계획)의 범위가 「48 장 재생성」보다 훨씬 크다는 사실이 여기서 드러났고, 그 계획은 webkit 행동 실패 1 건을 시각 항목과 분리해 먼저 다뤄야 한다.
