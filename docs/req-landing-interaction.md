# ViveTest — 랜딩 인터랙션 계약

**이 문서는 「어떻게 조작하고 어떻게 움직이는가」의 정본이다.** 짝 문서인 `docs/req-landing.md` 가 「무엇이 결과로 남는가」를 갖는다. 둘로 가른 이유는 이후의 인터랙션 개정이 동작 계약을 건드리지 않게 하기 위해서다(사용자 결정 6).

## 0. 분할 규약

### 0.1 어느 쪽에 속하는가 — 판정 한 줄

**「이 문장을 지키는 방법이 둘 이상 있는가?」** 있으면 인터랙션이고, 없으면(결과가 곧 규칙이면) 동작이다.

| 이 문서 — 인터랙션 계약 | `docs/req-landing.md` — 동작 계약 |
|:---|:---|
| 제스처와 그 판정(탭/hover/스와이프/키) | 스코프 · 용어 · 우선순위 · 불변식 |
| 모션의 시간·곡선·단계 | 라우팅 · locale · 404 |
| 생명주기의 위상과 전이 연출 | 정보 구조와 **공간** 규칙(열 수 · 여백 · clamp) |
| 레이어·dim·스크림의 시각 규칙 | 상태 집합과 전이의 **결과** |
| 닫기 어포던스의 종류와 우선순위 | telemetry · 동의 · storage |
| 포커스의 **이동 연출** | 포커스의 **도달 요건** · 접근성 요건 |
| — | 인수 조건 · QA 매트릭스 |

### 0.2 우선순위 — 두 문서가 충돌하면

`docs/req-landing.md` §3.1 의 사슬을 그대로 잇되, **교차 충돌에서는 동작 계약이 이긴다.** 인터랙션 계약은 동작 계약의 불변식(§4)·라우팅(§5)·상태 결과(§7)·telemetry(§12)·접근성 요건(§9)을 override 하지 않는다. 같은 대상을 두 문서가 서로 다르게 적으면 그것은 분할 실패이고, 고치는 방향은 **인터랙션 쪽을 결과 기준으로 다시 쓰는 것**이다.

`docs/design/design.md` 와의 관계는 `AGENTS.md` §2 의 Visual source precedence 가 그대로 지배한다 — design.md 는 visual-only 이며 이 문서의 behavior/storage/telemetry/routing 계약을 override 하지 않는다.

### 0.3 축 어휘

세 축이 서로 다른 것을 정한다. 폭으로 입력을 대리하거나 입력으로 폭을 대리하지 않는다.

| 축 | 무엇이 정하는가 | 코드 정의처 |
|:---|:---|:---|
| `LayoutBreakpoint` | 뷰포트 **폭** — 열 수 · 여백 · clamp · 타입 스케일 · **확장의 형태** | `src/features/landing/grid/layout-plan.ts` |
| `InputProfile` | `(hover: hover) and (pointer: fine)` — **닫는 법** · hover intent · 설정 hover 열기 | `src/features/landing/grid/input-profile.ts` |
| `KeyboardAffordance` | 둘 중 어느 축에도 속하지 않는다 — 도달 · 확장 · `Escape` | `docs/req-landing.md` §7.6-a |

**형태는 공간이, 닫는 법은 입력이 정한다.** 다 열 레이아웃의 확장은 제자리 오버레이이고 위치를 옮기지 않는다. hover 가 없는 기기에는 dim backdrop 이 깔리고 빈 곳 탭이 닫기가 된다. `Escape` 는 모든 조건에서 닫는다.

---

## 8. Interaction & Motion Spec

### 8.1 Capability Gate
**Rule**:
- `width<768`: 항상 Tap Mode
- `width>=768` + capability 충족: Hover-capable Mode
- `width>=768` + capability 미충족: Tap Mode
- SSR 초기값은 Tap Mode, mount 후 동기화

**Verification**:
1. Automated: media feature mocking으로 모드 판정을 검증한다.

### 8.2 Desktop/Tablet Expanded Trigger
**Rule**: Desktop/Tablet Expanded 트리거는 지연/취소/handoff 규칙을 모두 준수해야 한다. 이 절의 규칙은 **계약(불변식)**과 **조정값** 두 계층으로 나뉜다(BQ-39). 계약은 개정에 사용자 승인이 필요하고, 조정값은 구현자가 UX 판단으로 바꾸되 **바꾸는 즉시 `docs/decision-register.md` 에 등재한다** — 조정값이라는 지위는 값을 문서에서 지워도 된다는 뜻이 아니다.

**계약(불변식)**:
- 키보드 Test focus: 포인터 capability와 무관하게 dwell `0ms`로 Expanded하며, 예약된 hover timer·intent token·pointer target을 함께 취소한다.
- 키보드 Blog focus: focus-only이며 Expanded/opening/geometry target을 소유하지 않는다.
- 활성 Expanded 카드의 경계는 확장된 카드의 실제 상호작용 영역 전체로 정의한다.
- **포인터 이동으로** 위 경계를 완전히 벗어나면 collapse 전이를 수행해야 하며, 다른 카드 hover 여부와 무관하게 동작해야 한다.
- collapse 결정은 실행 시점의 최신 경계 판정을 기준으로 수행해야 한다.
- handoff는 `다른 enterable 카드(available 또는 opt_out) 진입`에서만 성립한다(unavailable 진입은 handoff로 간주하지 않는다).
- 카드 간 handoff 시 직전 카드의 pending/진행 transition은 즉시 취소하고 마지막 hover 카드만 Expanded로 진입한다.
- handoff(카드 A→B)에서 카드 A는 scale/높이/빈공간 잔류 없이 즉시 Normal 정착해야 하며, same-row 비대상 카드 하단 여백 증가를 금지한다.
- handoff는 아래 조정값의 어떤 유지 규칙보다 우선하며, 두 경로가 각각 collapse를 예약해 이중 전이를 만드는 것을 금지한다.
- Tap Mode fallback(`width>=768`): tap으로 Expanded 진입, 전환 비주얼 계약은 hover 경로와 동일하다.
- hover intent 스케줄러는 전역 단일 timer + intent token으로 관리한다.
- 새 hover 진입 시 이전 예약을 즉시 취소한다.
- 타이머 실행 직전 `현재 hover 대상 == 예약 대상`을 재검증하고 불일치 시 no-op 처리한다.
- handoff 경로는 지연 없이 즉시 전환한다.
- **Expanded 활성 중 폭 변경 시 강제 종료는 이 절의 어떤 규칙으로도 완화되지 않는다**(§14.2 항목 4 · Section 6 Automated 5·11). 아래 유지 규칙은 스크롤 한정이며 resize 경로를 대상으로 하지 않는다.
- 위 키보드 focus 규칙은 기존 pointer hover enter/leave 지연값을 변경하지 않는다.

**조정값**(변경 시 `docs/decision-register.md` 등재 의무):
- Hover-capable: hover enter 후 `120~200ms`에 Expanded — 현행 `160ms`.
- 포인터 이동 기반 collapse는 허용 유예 `100~180ms` 범위 내에서 수행한다 — 현행 `140ms`.
- **collapse를 유발하는 입력의 정의.** 현행 규칙은 이렇다: collapse 예약과 실행 사이에 `pointermove`가 한 번도 없었다면 경계 변화를 만든 것은 포인터가 아니라 스크롤이므로 카드를 닫지 않고 열린 채 유지한다. 스크롤한다는 것은 곧 「그 콘텐츠를 더 보겠다」이기 때문이다.
- 유지된 카드의 해제 조건 ⑴: **다음 실제 포인터 이동에서 재판정한다** — 경계 안이면 계속 열어 두고, 밖이면 위 유예를 거쳐 collapse한다.
- 유지된 카드의 해제 조건 ⑵: **카드가 뷰포트를 완전히 벗어나면 유지를 해제하고 그 시점 판정으로 collapse한다.** 「조금 스크롤해 읽는다」와 「지나쳐 버렸다」를 가시성으로 가르는 자리이며, 이것이 없으면 확장 본문의 답변 버튼·CTA가 화면 밖 탭 스톱으로 남고 grid plan freeze도 풀리지 않는다.
- **스크롤이 위조하는 것은 이탈만이 아니다 — 진입도 같다.** 포인터가 움직이지 않은 채 스크롤 때문에 다른 카드가 포인터 밑으로 들어오면 그것은 hover 진입이 아니므로, 유지 중인 카드를 닫지도 밀려 들어온 카드를 열지도 않는다. 이 경로를 막지 않으면 unavailable/Blog 카드의 진입이 **유예 없이 즉시** 닫아 위 유지 규칙을 통째로 우회한다.
- 진입이 위조인지는 **경계 이벤트가 실어 온 좌표와 마지막으로 기록된 포인터 위치의 일치**로 판정한다. 실측 순서가 `mouseout → mouseover → pointermove` 이므로 정상 경로에서는 진입 시점의 기록이 아직 이전 위치이고 새 좌표와 어긋난다.
- 유지 상태는 카드가 다른 이유로 접히거나(Escape · handoff · 전환 시작) hover 모드를 벗어나면 함께 해제되어야 한다.

**Verification**:
1. Automated: handoff 시 직전 카드 pending transition 취소 여부를 검증한다.
2. Automated: 마지막 hover 카드만 최종 Expanded인지 검증한다.
3. Automated: Expanded 상태에서 포인터가 비카드 영역으로 **이동**할 때(다른 카드 hover 없이) 허용 유예 범위 내 Normal 복귀가 수행되는지 검증한다.
4. Automated: hover intent 스케줄러가 전역 단일 timer + intent token으로 동작하는지 검증한다.
5. Automated: 새 hover 진입 시 이전 예약이 즉시 취소되고, 실행 직전 대상 재검증 불일치 시 no-op 처리되는지 검증한다.
6. Automated: 포인터 이동 기반 collapse가 다른 카드 hover 여부와 무관하게 최신 경계 판정으로 수행되는지 검증한다.
7. Automated: unavailable 카드 진입이 handoff로 오인되지 않는지 검증한다.
8. Automated: 키보드 focus가 stale pointer intent를 무효화하고 Blog를 확장 대상으로 만들지 않는지 검증한다.
9. Automated: 포인터 이동 없이 스크롤만으로 경계가 바뀐 경우 Expanded가 유지되고, 이어진 실제 포인터 이동에서 경계 안이면 유지·밖이면 유예 내 Normal 복귀가 수행되는지 검증한다.
10. Automated: 유지 중인 카드가 뷰포트를 완전히 벗어나면 해제 후 Normal 복귀가 수행되고, handoff·Escape·전환 시작에서 유지 상태가 남지 않는지 검증한다.
11. Automated: Expanded 활성 중 폭 변경 강제 종료가 유지 규칙과 무관하게 그대로 수행되는지 검증한다.
12. Automated: 포인터가 고정된 채 스크롤로 다른 카드가 경계 안에 들어와도 Expanded가 닫히지 않고, 실제 포인터 이동으로 비확장 카드에 진입할 때는 종전대로 즉시 collapse 되는지 둘 다 검증한다.

### 8.3 Core Motion Contract
**Rule**: Expanded core motion은 시간/곡선/단조성/예외 경로를 엄격히 준수해야 한다.
- 본 섹션은 **계약(불변식)**과 **조정값** 두 계층으로 나뉜다(BQ-39). 계약은 축·곡선·단조성·복원·플리커 금지·`0ms` 허용 경로·키보드/포인터 동등성이며, 개정에 사용자 승인이 필요하다. 아래 duration/stagger 수치는 조정값으로, 구현자가 UX 판단으로 바꾸되 **바꾸는 즉시 `docs/decision-register.md` 에 등재한다** — 강등은 값을 문서에서 지우는 것을 허용하지 않으며, 등재되지 않은 변경은 여전히 계약 위반이다.
- 조정값으로 명시되지 않은 이 섹션의 시간·순서 규칙은 권장이 아니라 검증 대상이다.
- Normal→Expanded: Phase A/B/C 각 `280ms`, C stagger `40/100/160ms`(조정값).
- Phase A/B는 전환 시작 프레임에서 시작 가능, Phase C는 상세 블록 활성 이후 시작.
- reveal 항목 순서는 DOM 순서와 일치해야 한다.
- Expanded→Normal은 동일 축/곡선으로 대칭 복귀해야 한다.
- Expanded→Normal 동안 카드 외곽 높이는 non-increasing이어야 하며, 완료 시 확장 진입 직전 Normal 스냅샷 높이와 `0px` 오차로 일치해야 한다. Mobile에서는 전환 중 임시 오차 허용 가능하나 완료 시점에는 동일 규칙을 강제한다.
- `0ms` 전이는 handoff의 직전 카드(source) 이탈 경로에서만 허용한다. handoff target 카드 진입과 키보드 handoff target 모두 표준 Expanded 모션 규격(`0ms` 금지)을 유지해야 한다. 동일 카드 일반 leave/close, 최종 hover 대상 진입, tap 기반 일반 전이에서는 `0ms`를 금지한다.
- HOVER_LOCK 등 보조 잠금 상태는 비대상 반응 차단에만 사용하며 대상 카드 core motion 무효화를 금지한다.
- core motion 진행 중 전이 역전(열림/닫힘의 즉시 반전)으로 인한 플리커를 금지한다.
- easing은 `ease-in-out` 계열로 통일한다. spring/overshoot(탄성 튐), Expanded 전환/유지 중 alpha 애니메이션, 내부 이중 박스 시각, 정적 외곽 카드+내부 콘텐츠만 scale 구조를 금지한다.
- Desktop/Mobile 공통 duration/easing/stagger는 단일 규격으로 관리한다.
- Desktop/Tablet Escape와 true in-page focus-out은 controller-owned 단일 close command를 사용한다. Escape/outside/Blog destination은 `collapse`, 이미 적용된 Test→Test transfer만 `handoff`를 유지하며 후속 source blur는 no-op이어야 한다.
- 논리적 close는 `closing` 시작과 동시에 성립한다. `closing`, `cleanup-pending`, `handoff-source`의 선택지는 즉시 tab/activation/AT 대상에서 제외하되 reverse motion, shell persistence, BQ-24 floor/spacer cleanup은 유지한다.
- Mobile card-root `Escape` 는 이 Desktop/Tablet close 경로를 실행하지 않는다 — 대신 mobile lifecycle 의 닫기로 들어간다(§8.5 닫기 경로). Mobile card-root blur 는 여전히 두 경로 어느 쪽도 실행하지 않으며 mobile state 를 변경하지 않는다 — 터치에서 포커스 이탈은 닫기 의도가 아니다.

**Verification**:
1. Automated: Phase 순서/시간/stagger를 타임라인 단언으로 검증한다.
2. Automated: Expanded→Normal non-increasing 위반 프레임 `0건`을 검증한다.
3. Automated: same-card leave에서 `0ms` 강제 종료가 발생하지 않는지 검증한다.
4. Automated: Desktop/Mobile 반복 토글에서 Expanded→Normal 완료 높이 복원 오차 `0px`를 검증한다.
5. Automated: pointer/keyboard handoff 모두에서 source `0ms` / target 표준 모션 분리를 검증한다.
6. Automated: Escape/focus-out의 단일 close sequence와 handoff 이후 source blur idempotence를 검증한다.

### 8.4 Expanded Shell Scale and Readability
**Rule**:
- Desktop/Tablet Expanded 콘텐츠 shell scale은 reduced-motion을 제외한 모든 경로에서 `1.04`로 고정해야 한다.
- Desktop `desktop-wide`, `desktop-medium`, `two-column`의 row/anchor 전체는 최종 외곽 가로폭 desired scale `1.10`을 사용한다. Tablet desired final scale은 `1.04`다.
- `max_surface_scale = 1 + available_stage_outset_px / normal_root_width_px`, `resolved_final_scale = min(desired_final_scale, max_surface_scale)`, `frame_inline_scale = resolved_final_scale / 1.04`로 고정한다. reduced motion은 최종 `1.00`이다.
- edge anchor의 allowance는 확장 방향의 measured stage outset, center anchor는 양쪽 중 작은 measured allowance의 2배를 사용한다. 0/non-finite 입력은 유한한 `1.00` 안전값으로 수렴해야 한다.
- `1.04`를 넘는 추가 폭은 expanded frame이 소유하며 shadow/surface/body가 함께 넓어져야 한다. inner counter-scale, surface/body 단독 width 조정, global/stage token 증대로 `1.10`을 강제하는 구현을 금지한다.
- clamp가 `1.10` 미만으로 해석되면 해당 band/anchor의 실측값을 기록해야 하며, clipping/overflow를 만들면서 desired 값을 강제하면 안 된다.
- Mobile은 기존 full-bleed 모바일 전개 규칙을 유지하며, 위 desktop/tablet width-only 예외를 적용하지 않는다.
- 내부 콘텐츠만 확대하는 구현 금지
- Expanded 전 구간(진입/유지/해제)에서 title/body/CTA/meta crop 0건
- transform-origin 판정은 Expanded 시작 시점의 settled row 경계를 기준으로 수행해야 한다.
- transform-origin: 해당 row의 첫 카드 `0% 0%`, 마지막 카드 `100% 0%`, 그 외 `50% 0%`.
- row에 카드가 1개인 경우 해당 카드는 row 첫 카드로 간주해 `0% 0%`를 적용한다.
- row 경계 판정에 고정 인덱스(예: 특정 순번 카드)를 사용하면 안 된다.
- Expanded 카드 opacity는 항상 `1.0`
- Desktop/Tablet에서 Expanded 카드는 GNB와 Settings 레이어를 제외한 카드 레이어 중 최상위여야 하며, 인접 카드에 의해 가려지면 안 된다.
- 카드 레이어 밖의 뷰포트 고정 표면(telemetry consent banner)도 Expanded 카드를 가리면 안 된다. 겹침은 스크롤 위치의 함수이므로 고정 기하 여유로 해소할 수 없고, **실제로 교차하는 동안에만** 그 표면이 비켜선다 — 교차하지 않는 동안 동의 UI 를 숨기는 구현을 금지한다. 비켜서는 방식은 문서 흐름의 예약 높이를 바꾸지 않아야 하며, 그 표면이 포커스를 품고 있으면 비켜서지 않는다(BQ-39).
- **이 조항은 흐름 안에서 펼쳐지는 제자리 오버레이에만 적용된다.** 폰의 확장은 배너보다 **위** 층의 모달 바텀시트이므로 가림이 성립하지 않는다 — 시트가 열린 동안 배너는 스크림 아래에 `inert` 로 **그대로 남고**(§8.5 · 명세 §2-2), 「덮지 말라」 표식을 달지 않으며 비켜서지도 않는다. 시트가 열릴 때 동의 UI 가 사라졌다 돌아오는 구현을 금지한다 (BQ-46).
- 다중 Expanded는 금지하며, 활성 Expanded 카드는 항상 1개여야 한다.

**Verification**:
1. Automated: 스크린샷 기반으로 shell 스케일 적용과 crop 0건을 검증한다.
2. Automated: Desktop/Tablet에서 인접 카드 가림 현상 `0건`과 Expanded hit-target 우선순위를 검증한다. consent banner 가 교차하는 배치에서 가림 `0px`, 교차하지 않는 배치에서 banner 가시성 유지를 함께 검증한다. 폰에서는 시트가 열린 동안 배너가 마운트된 채 `visible` 이고 `inert` 이며 시트 층의 z-index 가 배너 층보다 높음을 검증한다.
3. Automated: Desktop/Tablet의 Wide/Medium/Narrow 및 hero/main 연속 배치에서 row-edge transform-origin 판정 정확성을 검증한다.
4. Automated: row 단일 카드 케이스에서 transform-origin `0% 0%` 적용을 검증한다.
5. Automated: Desktop Wide/Medium/two-column 및 Tablet의 edge/center active state에서 resolved scale, stage containment, grid/container/document horizontal overflow `0px`를 검증한다.

### 8.5 Mobile Expanded (`width<768`) — 바텀시트

**Rule**: 폰의 카드 확장은 흐름 밖의 **바텀시트**이며, 시트 공통 규격과 닫기 경로 다섯을 준수해야 한다.

**이 절은 2026-09-16 에 전면 재작성됐다.** 종전 조항들은 확장이 **in-flow** 라는 사정에서 나온 것이었다 — 카드가 제자리에서 커지면 형제가 밀리므로, 진입 직전의 높이·좌표·제목 기준선을 snapshot 으로 적어 두고 닫을 때 `0px` 오차로 되돌리는 절차가 필요했다. 시트는 흐름 밖에 있어 아무것도 밀지 않으므로 그 절차 전체가 사라진다. **지우는 것이 아니라 다시 쓰는 이유**는 그 조항들이 지키려던 두 성질이 여전히 유효하기 때문이다: **연속성**(원본 카드와 시트가 같은 것으로 읽힌다)과 **복귀 정확성**(닫은 뒤 스크롤 위치와 카드 좌표가 진입 직전과 같다). 달라진 것은 그 둘을 **절차가 아니라 구조가** 보장한다는 점이다.

- 탭한 해당 카드만 확장으로 진입한다. unavailable 카드는 확장 대상이 아니다.
- 시트의 위상은 `OPENING -> OPEN -> CLOSING -> NORMAL` 단방향이며, **위상의 정본은 시트 자신이다.** 시간을 세는 곳이 둘이면 둘은 반드시 어긋나므로, 계약 표면(`data-mobile-phase`)은 시트가 보고한 값을 그대로 옮긴다.
- 시트는 화면 하단에서 올라오고 grabber 를 가지며, 열린 동안 배경을 잠근다. 형태·높이 상한·내부 스크롤·safe-area·모션·접근성 규격은 **시트 공통 규격 하나**가 갖는다(설계 명세 §3-4) — 카드 시트와 instruction 시트가 같은 규격을 쓴다.
- **닫기 경로는 다섯이다**: 닫기 컨트롤(44×44) · backdrop 탭 · 스와이프 다운 · `Escape` · 시스템 뒤로가기. `Escape` 는 폭과 입력 방식에 무관한 전 표면 규칙이며(§7.6-a Keyboard Affordance), 외장 키보드를 붙인 터치 기기에서 이 확장을 닫을 유일한 키보드 경로다(WCAG 2.1.1 Keyboard · 2.1.2 No Keyboard Trap).
- **회전은 확장을 닫지 않는다.** 폰을 눕히면 폭 축상 제자리 오버레이로, 다시 세우면 시트로 **형태만** 바뀌고 확장 자체는 유지된다(BQ-44). 폭 변경 강제 종료(`req-landing.md` §6.2)는 얼어 있는 row baseline 이 있는 전이 — 다 열 레이아웃 사이 — 에만 적용되며, 시트는 아무것도 얼리지 않는다.
- 시스템 뒤로가기는 오버레이 층 전부를 닫는다 — 층이 열릴 때 history 항목 하나를 넣고 다른 경로로 닫힐 때 거둔다; 뒤로가기 자체로 닫힌 경우에는 거두지 않는다.
- **연속성**: 시트 헤더는 `title + 닫기` 구조를 유지하고 제목은 카드의 제목과 같은 문자열이다. 제목은 줄바꿈을 허용하고 truncate/ellipsis 를 금지한다.
- **복귀 정확성**: 닫은 뒤 page scroll 위치와 카드의 좌표·높이는 진입 직전과 같다. 시트는 흐름을 건드리지 않으므로 이것은 복원 절차가 아니라 **손대지 않음**으로 성립한다. snapshot 채취·복귀 폴링·`NORMAL` terminal 의 높이 복귀 선행조건은 함께 폐지한다.
- 닫힌 뒤 포커스는 트리거(카드)로 돌아간다.
- 진입 `260ms`, 이탈 `220ms`, spring/overshoot 금지. 스크림의 등장·소멸은 시트와 **같은 시간에 시작하고 끝난다** — 한 전이의 두 면이므로 따로 끝나면 둘로 읽힌다.
- **사라지는 중인 스크림은 입력을 삼키지 않는다.** 닫은 직후 화면이 굳어 있으면 안 된다.
- 스와이프는 손가락을 1:1 로 따라가고, 놓았을 때 이동량이 시트 높이의 30% 이상이거나 속도가 `0.5px/ms` 이상이면 닫히며 아니면 제자리로 돌아온다. 위로 끄는 것은 따라가지 않는다.
- `prefers-reduced-motion: reduce` 에서는 이동을 버리고 페이드만 남긴다 — 모션을 통째로 없애지 않는다.
- 시트 본문이 스크롤 컨테이너를 갖고(`overscroll-behavior: contain`) 배경은 잠긴다. 자동 viewport 보정 스크롤을 금지한다.
- **층**: 시트는 GNB **위**에 있다(설계 명세 규칙 1). 시트가 열린 동안 그 아래 층은 배너까지 `inert` 다 — 보이되 닿지 않는다.
- 스크림은 시트를 덮지 않으며, dim 은 시트 밖 영역에만 적용한다. 시트 본체 위 dim/tint 는 `0%` 다.
- 시트 안의 상호작용 우선순위는 `CTA(응답 A/B) > 닫기 컨트롤 > 시트 밖`으로 고정한다. 시트 안 비-CTA 영역 탭은 no-op 이다.
- 시트 안의 마지막 탭 스톱은 **시각적으로 숨긴 닫기 버튼**이다 — 보조기술은 「빈 곳」을 탭할 수 없다.
- tap 판정은 보수적으로 처리하며, 미세 이동이 감지된 입력은 scroll gesture 로 분류한다.

**Verification**:
1. Automated: 닫기 경로 다섯이 각각 시트를 닫는지 검증한다.
2. Automated: 닫은 뒤 page scroll 위치와 카드 좌표가 진입 직전과 같은지 검증한다.
3. Automated: 시트 본문이 높이 상한 안에서 스크롤되고 배경이 잠기는지 검증한다.
4. Automated: 층 순서(시트 > GNB > 배너 > 콘텐츠)와 시트 아래 층의 `inert` 를 검증한다.
4-a. Automated: 스크림의 등장이 옅은 데서 올라오고 소멸이 옅어지는 방향으로만 움직이며, 사라지는 동안 입력을 통과시키는지 검증한다(`assertion:BD-01`).
5. Automated: 시트 본체 위 dim/tint `0%` 를 검증한다.
6. Automated: 시트 안 CTA 우선순위와 비-CTA no-op 를 검증한다.
7. Automated: 시트 제목이 카드 제목과 같고 잘리지 않는지 검증한다.
8. Automated: 스와이프의 두 경계(이동량 30% · 속도 `0.5px/ms`)를 검증한다.
9. Automated: `prefers-reduced-motion` 에서 이동이 사라지고 페이드가 남는지 검증한다.
10. Automated: 닫힌 뒤 포커스가 트리거로 돌아가는지 검증한다.

### 8.6 Transition Start Trigger (Landing→Destination)
**Rule**: 라우팅 전환 시작은 카드 타입별 유효 trigger 활성화 시점에만 허용한다.
- Test: Expanded answerChoiceA/B
- Blog: Normal card 전체 링크 trigger
- Blog 전환은 선택된 article 식별자를 목적지로 전달해야 하며, 목적지는 해당 식별자 기준으로 콘텐츠 컨텍스트를 결정해야 한다.
- Test CTA 전환은 선택된 A/B 값을 landing ingress로 저장하고 목적지는 runtime entry commit 경계에서 canonical binding을 수행한다.
- article 식별자 누락/무효 시에는 문서에 정의된 안전 fallback으로 처리해야 한다.
- Mobile에서도 CTA 입력(마우스 클릭/터치 탭)은 닫기 동작보다 우선하며 반드시 `transition_start`로 귀결되어야 한다.
- 본 섹션의 전환 시작 규칙은 Section 13.3/13.6의 fail/cancel/rollback 계약을 변경하지 않는다.
- **Test 페이지 destination-ready 해석**: `/test/{variant}` 진입 시 destination-ready는 variant 유효성 검증 완료 + Runtime Entry Commit 준비 완료를 동시에 만족하는 시점이다 (Test Flow Requirements §2.4 참조).
- **Blog 페이지 destination-ready 해석**: `/blog/{variant}` 진입 시 route variant와 article model이 일치하고 route model ready 이후 animation frame에서 complete 처리할 수 있는 시점이다. Blog index 또는 invalid/non-enterable article fallback은 selected article로 간주하지 않는다.

---

---

## 11. Motion Constraints

### 11.2 Animation Guardrails
**Rule**:
- Expanded 관련 모션은 transform/opacity 중심으로 구성한다.
- 비확장 row 재계산 유발 구현을 금지한다.
- rapid hover/tap 반복에서도 런타임 예외 0건이어야 한다.

### 11.3 Reduced Motion / Low-spec
**Rule**: `prefers-reduced-motion`에서 대형 이동을 금지하고 `150~220ms` 단순 전환으로 축소한다. 저사양 fallback은 시각 효과보다 상태 일관성 우선.

**감소 모드에서 남는 것 — 「전부 0」이 아니다(2026-09-16 census).** `prefers-reduced-motion` 은 *움직임*에 대한 선호이지 색과 불투명도에 대한 선호가 아니다. 랜딩에서 카드를 펼친 상태로 전수 census 한 결과 전이를 가진 원소가 **31 → 18** 로 줄었고, 남은 18 은 **하나도 움직이지 않는다**(강제 `transform` 0 건).

| 남은 원소 | 수 | 무엇이 전이하는가 | 처분 |
|:---|---:|:---|:---|
| GNB pill·칩(설정 트리거 · 테마 스와치 둘 · 언어 칩 12 · 메뉴 트리거) | 16 | `border-color` · `background-color` · `box-shadow`, 140ms | **남긴다** — 위치도 크기도 움직이지 않는다 |
| 시트 · 스크림 | 2 | `opacity`, 140ms | **남긴다** — §8.5 가 「이동을 버리고 페이드만 남긴다」고 정한 그 페이드다 |

그래서 이 절의 회귀는 **개수가 아니라 성질**로 고정한다(`assertion:MO-01`): 감소 모드에서 `transform`·위치·크기를 전이하는 원소가 0 이고, 평소 모드에서는 0 이 아니다. 개수로 재면 「몇 개면 충분한가」라는 답할 수 없는 질문이 남고, 개체수가 바뀔 때마다 숫자를 내리는 것으로 끝난다.

**터치 기본값 둘**(`assertion:MO-02`): 문서 루트가 `overscroll-behavior-y: none` 으로 당겨-새로고침과 스크롤 체이닝을 끊고, 모든 컨트롤이 `touch-action: manipulation` 으로 더블탭 대기를 버린다. 본문 텍스트에는 걸지 않는다 — 더블탭 단어 선택이 함께 사라진다. 핀치 확대는 그대로 남으므로 WCAG 1.4.4 와 충돌하지 않는다.

**누름 피드백**(`assertion:PF-01`): hover 로 스킨(면·선·글자색·그림자)을 바꾸는 자리는 누름으로도 바꾼다. Tailwind v4 는 `hover:` 유틸리티를 `@media (hover:hover)` 로 감싸므로 터치 기기에서 그 스킨은 **아예 적용되지 않고**, preflight 가 `-webkit-tap-highlight-color` 까지 끄므로 `active:` 가 없으면 손가락이 닿은 순간부터 목적지가 그려질 때까지 화면이 아무 말도 하지 않는다. CSS 파일의 hover 스킨은 `@media (hover: hover)` 안에 두어 스스로 hover 전용임을 선언한다.

**Rule**:
- 커스텀 커서 금지
- available 카드/CTA에만 pointer
- unavailable 카드는 기본 커서 유지

---
