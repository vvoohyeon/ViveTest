# BQ-07 마감 — 도달할 수 없는 상태를 먼저 고치고, 시각 회귀망을 실제로 세운다

- **작성·착지** 2026-09-11
- **Task mode** Implementation
- **선행** `222a542`(공유 셸 좌우 여백) 착지 — 그 변경이 ≥900px 폭의 기하를 8px 바꾸므로 baseline 보다 먼저 와야 했다
- **선행 계획** `docs/plans/2026-09-07-step6-baseline-and-closeout.md` 의 baseline 절반. 그 문서의 tier-3 항목(7 · 8 · 10)은 아직 열려 있으므로 문서 자체는 `docs/plans/` 에 남는다

## 1. 착수 전 사실 — 게이트는 붉은 것이 아니라 작동하지 않고 있었다

`main`(`4cb6be9`)을 그대로 clone 해 primary 의 로컬 baseline 을 미러한 통제군에서 `--grep @gate` 를 돌린 결과는 **125 failed · 1 passed** 였다. 추적 48 장의 마지막 승인은 **2026-05-17** 이고 그 뒤 `f3acb9f`(2026-06-02, design.md 를 시각 정본으로 채택)의 `aspect-[16/6]`·타입 스케일 이행, rebuild wave 전체, Step 1–4 가 지나갔다. manifest 가 선언한 168 장 중 48 장만 추적됐고 나머지는 「없으면 만들고 통과」로 남아 있었다 — 랜딩·블로그·히스토리·설정 레이어·모바일 메뉴에는 시각 회귀망이 **0** 이었다.

## 2. 재생성 전에 고쳐야 했던 것 — 도달할 수 없는 상태 넷

`--update` 를 그대로 쳤다면 **틀린 그림이 「승인된 정답」이 됐을 것이다.** 그래서 먼저 `--update` 없이 돌려 실패를 종류별로 갈랐다: 스크린샷 불일치는 재생성 대상이고, 그 앞 단계의 단언 실패는 **도달 불가**다.

| # | 케이스 | 무엇이 잘못됐나 | 처분 |
|:--|:--|:--|:--|
| 1 | `landing-test-expanded` · `landing-blog-expanded` | `expandLandingCard` 가 트리거를 **클릭**했다. 트리거는 blog 에서 `<Link>`, test 에서 전이를 여는 `<button>` 이라 클릭은 확장이 아니라 **라우팅**이다 — 카드가 `normal` 인 채 문서에서 사라진다 | hover 로 바꿨다(`grid-smoke` 의 `hoverDesktopExpandedCard` 와 같은 형태) |
| 2 | `landing-blog-expanded` 의 종착 단언 | 데스크톱/태블릿 확장 셸은 **test 카드만** 갖는다 — `DesktopExpandedShell` 이 `isTestCard` 로 막혀 있고 `landing-grid-card.tsx:969` 가 blog 의 `expanded` 를 `normal` 로 강제한다(`req-landing.md:265`·`:274`). blog 의 hover 상태는 read-more 노출과 태그 절삭이다 | 카드 종류로 종착 단언을 갈랐다. 케이스 이름은 모바일 대응 케이스와 짝이므로 유지 |
| 3 | `mobile-landing-blog-expanded` | 모바일에서도 blog 카드는 확장되지 않는다 — `handleCardClick` 이 `card.type === 'blog'` 를 전이로 보낸다. **제품이 가질 수 없는 상태**다 | manifest 에서 제거(**사용자 승인**). 168 → 164. 커버리지 손실 없음 — 모바일 blog 카드의 유일한 상태인 쉬는 상태는 `landing-normal` mobile 이 이미 담는다 |
| 4 | safari ghosting 의 lower-row 둘 | 피사체가 `build-metrics`(blog)였다. 첫 단언에서 영원히 멈추므로 baseline 이 생길 수 없었고, 추적 0 이라 그 사실이 보이지 않았다 | lower row 의 사용 가능한 test 카드 `egtt` 로 바꾸고, `expectCardInLowerRow` 가 종류·가용성·행 번호를 **전제로 먼저** 단언한다(L16) |

## 3. 재현 가능하게 만든 것 셋

재생성 직후 **같은 커밋을 다시 돌려** 어긋난 것들을 각각 원인까지 특정했다. baseline 이 스스로를 재현하지 못하면 회귀를 판정할 수 없다.

- **웹폰트.** Pretendard 는 `font-display: swap` 이고 preload 하지 않는다(전체 face 1.96MB). 캡처가 swap 보다 빠르면 fallback 이 찍히고 한국어는 줄바꿈 위치까지 달라진다 — 실측 2,342px · 706px. 2026-05-17 provenance 가 「환경 표류」로 적고 넘어간 `theme-layout-test-instruction-kr-*` 6 장이 바로 이것이었다. 두 스펙 모두 캡처 전에 `document.fonts.ready` 를 기다린다.
- **애니메이션.** 정착 위상까지 기다려도 게이트 전체를 돌리면 webkit 스펙이 chromium 120 여 케이스와 CPU 를 나눠 쓴다 — 단독 4/4 초록이던 스펙이 게이트 안에서 107px 차이로 붉었다. 버퍼 캡처 경로에 `animations: 'disabled'` 를 넘겨 전이를 종료 상태로 고정한다(`toHaveScreenshot` 은 기본으로 하지만 `page.screenshot` 은 아니다).
- **스쳐 지나가는 위상.** `toHaveAttribute('closing')` 은 살아 있는 속성을 폴링하므로 전이가 폴링 간격보다 빠르면 놓치고, 놓친 것은 「일어나지 않았다」와 구별되지 않는다. 이미 있던 MutationObserver 로그 위에서 기다리고 단언한다. 병렬 3 회 4·3·4 통과 대 직렬 3 회 6·6·6 통과였으므로 `webkit-ghosting` 프로젝트에 `fullyParallel: false` 를 줬다. **단언을 지우는 판본은 더 나빴다**(정착 전에 로그를 읽는다) — 기다림을 관찰자 위로 옮기는 것이 답이다.

## 4. 이연의 해제

`tests/e2e/helpers/local-snapshot.ts` 의 `allowMissingBaseline` 은 이연을 **눈에 보이게** 남겨 두려고 세션 4 가 넣은 예외였다. 호출부가 하나도 남지 않아 함께 지웠다. 그 자리에 더 강한 것을 세운다 — Playwright 의 기본 의미론(`updateSnapshots: 'missing'`)은 없는 baseline 을 **디스크에 쓰고** 그 실행만 실패시키므로 같은 작업공간의 **두 번째 실행이 자기 이미지와 비교해 통과한다**(L11). 그래서 비교 전에 파일 존재를 보고 **쓰기 전에** 멈춘다. `--update-snapshots` 로 들어온 실행만 비켜선다 — 목록을 뒤집어 `!== 'none'` 으로 쓰면 기본값 `'missing'` 이 통과해 가드가 죽는다.

## 5. 곁가지로 드러난 가드 결함 하나

`tests/unit/decision-register.test.ts` 의 인용 census 가 `git grep -ohE` 로 추적 파일 전체를 훑는데, baseline 164 장이 추적되기 시작하자 그중 한 PNG 의 바이트열이 우연히 패턴에 걸렸다. `git grep` 은 바이너리에 대해 매치 텍스트 대신 `Binary file <path> matches` 한 줄을 뱉고 `-o` 도 그 줄에는 듣지 않으므로, 그 줄이 그대로 「인용된 번호」로 파싱돼 붉었다. `-I` 를 더했다 — 텍스트 census 는 텍스트만 읽는다. **함정 원장 등재는 불요로 판정한다**: 고장이 한 줄 플래그로 끝나고 해당 가드에 주석으로 남았으며, 다른 census(`tailwind-candidate-hygiene`)는 이미 확장자로 거른다.

## 6. 결과

| 항목 | 착수 전 | 착지 |
|:--|--:|--:|
| theme-matrix 추적 baseline | 48 / 168 선언 | **164 / 164 선언** |
| safari ghosting 추적 baseline | 0 / 5 | **5 / 5** |
| `npm run test:e2e:gate` | 125 failed · 1 passed | **122 passed · 0 failed** (3 회 연속) |
| `allowMissingBaseline` 호출부 | 2 스펙 | **0** (인자 자체를 제거) |

`npm run lint` · `typecheck` · `test` · `build` · `qa:rules` 전부 초록. 함정 원장 **L27** · **L28** 등재.

## 7. 열린 채 남기는 것

- **`req-landing.md` 내부 충돌 1 건(자체 해소 금지, `AGENTS.md` §10).** `:265`(「Blog 는 Expanded 슬롯을 렌더링하지 않는다」)·`:274` 와 `:32`(상태 표의 「Blog 는 Read more CTA 허용」)·`:298`·`:299`·`:309`(「Landing Expanded Blog subtitle」 4 줄 clamp, 「Desktop Expanded Blog subtitle continuity」)가 같은 대상을 반대로 말한다. 제품은 `:265` 쪽을 구현하고 있다(`landing-grid-card.tsx:969` 의 명시적 강제). 어느 쪽이 계약인지는 문서 소유자의 결정이다 — 이 세션은 제품을 바꾸지 않았고 문서도 고치지 않았다.
- `tests/e2e/theme-matrix-smoke.spec.ts-snapshots/BASELINE_PROVENANCE.md` — 2026-05-06 자 미추적 산문이 baseline 디렉터리 안에 남아 있다. 추적 정본은 `tests/e2e/theme-matrix-baseline-provenance.md` 다.
