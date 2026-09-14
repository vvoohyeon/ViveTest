# 모바일 전면 리팩터 — step 3: 표면 재설계

**Task mode:** Implementation. **Ask-First·SSOT·High-Risk 전면 해당.** 이 단계에서 시각 baseline 재생성이 일어나므로 **`qa:visual:full` 실행 전에 사용자 승인을 받는다**(`AGENTS.md` §4 Hard stops).

**이 문서와 명세의 관계.** 이 문서는 **무엇을 어떤 순서로** 하는지를 정하고, **어떻게 보이고 어떻게 움직이는지**는 `docs/plans/2026-09-14-mobile-refactor-design-spec.md` 가 정한다. **착수 전에 그 명세를 전문으로 읽는다** — 규칙 여덟과 표면별 확정 명세, 그리고 §4 의 「반복되는 결함 셋」이 거기 있다. 두 문서가 어긋나면 명세가 이긴다.

**선행 확인 (착수 전에 반드시):**

```bash
cd "$(git rev-parse --show-toplevel)" && ls docs/done/2026-09-11-mobile-refactor-step1-seam.md docs/done/2026-09-11-mobile-refactor-step2-axis-and-contract.md && npm test && npm run qa:rules
```

두 문서가 `docs/done/` 에 있어야 하고, 코드에 `LayoutBreakpoint`·`InputProfile`·`KeyboardAffordance` 세 축이 있어야 하며, 요구사항 문서가 둘로 갈려 있어야 한다. **900×1200 터치 기기에서 확장 카드가 닫히는지**를 직접 확인한다 — 그것이 step 2 가 실제로 끝났다는 유일한 체감 증거다.

---

## 공유 블록 — 세 문서가 같이 갖는 것

### 최상위 목표

모바일의 인터랙션·UX·디자인을 전면 리팩터하되 데스크톱·태블릿과의 호환성, 디자인 일관성, 디자인 시스템 호환성을 유지한다. 배경과 근거는 `docs/plans/2026-09-11-mobile-refactor-analysis.md` 가 갖는다 — 특히 §15 확정된 제품 결정 열여섯.

### 사용자 결정 일곱 (확정 — 다시 묻지 않는다)

1. 계약 개정 전면 허용 · 2. 터치 태블릿은 입력 방식 기준으로 통일 · 3. 전 표면 동시 · 4. 0단계로 구조를 먼저 가른다 · 5. IA 재설계 허용 · 6. 요구사항 문서를 동작/인터랙션으로 분리 · 7. 서명 인터랙션은 3분류로 제시.

### 불변 경계 (세 단계 전부)

- **워크스페이스는 `git clone` 이다. 워크트리를 만들지 않는다**(`AGENTS.md` §4).
- **`qa:visual:full` 은 사용자 승인 없이 실행하지 않는다.**
- `.env`·비밀값은 읽지도 출력하지도 커밋하지도 않는다.
- **게이트를 약화시켜 통과시키지 않는다.**
- **시각 baseline diff 는 provenance 가 확인되기 전까지 회귀로 간주한다**(`AGENTS.md` §10).

---

## 0. 이 단계가 지켜야 할 것

리팩터가 **부수면 안 되는 것**이 다섯이고 전부 실측으로 확인됐다.

1. **대비** — 두 테마 모두 WCAG AA 위반 0, 전 표면 최소 5.08:1. 타입·색을 바꿀 때 재측정해 유지한다.
2. **12 locale × 390px 가로 오버플로 0** — 밀도를 바꾸거나 clamp 를 도입하면 12 locale 전부에서 다시 잰다.
3. **GNB 모바일 드로어의 모달 의미론** — `role="dialog"` · `aria-modal` · `aria-label` · 여는 순간 포커스 이동 · `body` 스크롤 잠금 · Escape · backdrop · safe-area. **다시 만들지 않는다 — 포커스 트랩 하나만 더한다.**
4. **테스트 문항 화면** — 이미 한 화면 한 문항, 오버플로 0, 답변 타깃 316×48~70px.
5. **`--tap-min: 44px` 토큰** — 이미 있다. 새 토큰을 만들지 말고 이것을 넓게 쓴다.

## 0-1. 작업 지시서는 점수표다

무엇을 고칠지는 `docs/plans/2026-09-11-mobile-refactor-maps/scorecard.md` 가 217 행으로 갖는다(blocker 13 · major 96 · minor 108). **말미의 「확정 결정이 처분한 행」 표를 먼저 보라** — 20 개 행·클러스터는 이미 결론이 나 있다.

**세 가지를 지킨다.** ⑴ `정정` 열에 ✓ 가 있으면 렌즈 문서의 「검증이 붙인 정정」을 먼저 읽는다 — `basis` 를 그대로 믿으면 안 된다. ⑵ `[비평]` 행은 적대적 검증을 거치지 않았으니 착수 전에 재현한다(단 blocker 넷은 분석 §14 #8 이 이미 재현했다). ⑶ 반증된 62 건 표를 먼저 본다.

---

## 1. 단위 1 — 폰의 카드 확장을 바텀시트로 교체

명세 §2-2 와 규칙 3 을 따른다.

**삭제되는 것**: `use-mobile-restore-polling.ts`(120) · `mobile-card-lifecycle-dom.ts`(48) · `use-mobile-transient-shell.ts`(57) · `use-mobile-backdrop-gesture.ts`(100, 시트 제스처로 대체) · `mobile-lifecycle.ts`·`use-mobile-card-lifecycle.ts` 대폭 축소 · `landing-grid-card.module.css` 의 transient/mobile 키프레임 구간(`:302-361`·`:527-563`).

**개정되는 계약**: `req-landing.md` §8.5 전면 재작성. `:625` in-flow 유지 · `:626` y-anchor 편차 0 · `:630` 제목 기준선 0px · `:632` 닫기 화이트리스트 · `:634-635` 스냅샷 복귀 · `:637` 연속 전이 · `:639` 런타임 실측 기법 지정 · `:641` 자동 보정 스크롤 금지 · `:650` 비-CTA 탭 no-op · `:652` 예외 불허가 전부 무의미해지거나 뒤집힌다. **지우지 말고 다시 쓴다** — 그 조항들이 지키려던 둘은 여전히 유효하다: **연속성**(원본 카드와 시트가 같은 것으로 읽힌다)과 **복귀 정확성**(닫은 뒤 스크롤 위치와 카드 좌표가 진입 직전과 같다).

`design.md` §10 의 「Swipe-down close as authorized mobile expanded behavior」를 Never Reintroduce 에서 내린다 — `decision-register.md:104,108`(BQ-11)은 「미결정」이었지 영구 금지가 아니었다. BQ 로 재등재한다.

**시트 프리미티브는 이 단위에서 만든다** — 명세 §3-4 의 공통 규격대로, `src/features/ui/` 아래 하나의 컴포넌트로. 단위 1-2 의 instruction 시트가 같은 컴포넌트를 prop 셋(grabber · 제스처 닫기 · history 항목)만 끄고 쓴다. 두 시트가 CSS 를 따로 갖게 되면 이 단위가 잘못 끝난 것이다.

**전환의 시작 프레임**은 명세 §2-2 대로 시트다 — 탭한 답변에 `data-pending` 을 즉시 걸고, 시트·스크림을 내리지 않은 채 유령 GNB 전환을 진행한다. `req-landing.md:867` 의 「시작 프레임」을 시트로 개정하고, `tests/e2e/transition-telemetry-smoke.spec.ts` 의 시작 프레임 단언을 그에 맞춘다.

**재생성 baseline 4 장**: `theme-state-mobile-landing-test-expanded-{en,kr}-{light,dark}-mobile-chromium-darwin.png`. **재작성 E2E**: `tests/e2e/state-smoke.spec.ts:1003-1146` · `tests/e2e/grid-smoke.spec.ts:815-870`.

## 1-2. 단위 1-2 — instruction 을 같은 시트 프리미티브로 옮긴다

명세 §2-3 과 §3-4 를 따른다. **형태만 바뀌고 행동은 한 비트도 바뀌지 않는다** — 이 단위의 합격 판정은 「액션 효과 표·`instructionSeen`·qualifier 진행·재진입·auto-commit 을 보는 기존 단위 테스트가 **수정 없이** 초록」이다. 그 테스트들은 `tests/unit/test-entry-policy.test.ts` · `use-test-entry-orchestrator.test.ts` · `test-entry-orchestrator-qualifier.test.ts` · `test-entry-orchestrator-reentry.test.ts` 다. 바뀌어야 하는 것은 렌더를 보는 둘, `tests/unit/instruction-overlay.test.ts` · `overlay-connector.test.ts` 뿐이다.

### 1-2-1. 코드 지도 — 무엇이 어디에 있는가

이 흐름은 여섯 파일이 나눠 갖고, **행동은 넷이 갖고 형태는 둘이 갖는다.** 형태 둘만 손댄다.

| 파일 | 행 | 소유 | 이 단위에서 |
|:---|---:|:---|:---|
| `src/features/test/entry-policy.ts` | 194 | 액션 다섯의 **효과 표**(`ACTION_EFFECTS`: consent 쓰기 · 랜딩 복귀 · commit · `instructionSeen` 기록)와 `ingress × consent × attribute` → CTA 분기(`resolveTestEntryPolicy`) | **손대지 않는다** |
| `src/features/test/use-test-entry-orchestrator.ts` | 296 | `executeInstructionAction` — 부수효과 적용 → 랜딩 복귀 분기 → qualifier 단계 전진 → 재진입 commit / 신규 commit. `useAutoCommit` 호출 | **손대지 않는다** |
| `src/features/test/use-qualifier-overlay-wizard.ts` | 95 | 단계 상태(`'instruction' \| number`) · 재진입 모드 · draft · Back 의미 | **손대지 않는다** |
| `src/features/test/use-auto-commit.ts` | 52 | `instructionSeen` + auto-commit 가능 + qualifier 없음이면 시트를 그리지 않고 `start` 를 microtask 로 실행 | **손대지 않는다** |
| `src/features/test/overlay-connector.tsx` | 104 | props 를 단계별 라벨·핸들러로 접어 `InstructionOverlay` 에 넘긴다. `visible=false` 면 **`null` 을 반환** | 이탈 모션을 위해 **presence 를 갖게 한다**(아래 유의 ③) |
| `src/features/test/instruction-overlay.tsx` | 258 | 전면 fixed 레이어(`z-[1050]`) + 중앙 다이얼로그. 포커스 트랩 · `Esc` · 컨테이너 포커스 · 복귀 포커스 · 단계별 본문과 액션 행 | **시트 프리미티브 위에 다시 그린다** — 트랩·포커스·`Esc` 처리는 프리미티브가 갖게 되므로 여기서 걷어 낸다 |

호출 지점은 `src/features/test/test-question-client.tsx` 하나다 — `resolveInstructionVisible`(`:69-88`)이 보이기 여부를 정하고, `OverlayConnector` 를 렌더하며(`:293-330`), 뒤의 `test-question-panel` 에 `aria-hidden` 을 건다(`:332-334`). 이 파일에서 바뀌는 것은 **닫힌 뒤 포커스를 문항 제목으로 보내는 한 줄**이다.

**Q2 가 뒤이어 나오는 기전.** 랜딩에서 A/B 를 누르면 `transition/store.ts` 가 `preAnswerChoice` 를 담은 `LandingIngressRecord` 를 sessionStorage 에 쓰고, `use-test-run-bootstrap.ts:92` 가 그것을 읽어 `scoring1` 을 seed 한다. instruction 은 그 seed 를 건드리지 않는다(`req-test.md` §3.6 「instruction 은 기존 `scoring1` pre-answer 를 무효화하거나 덮어쓰면 안 된다」). commit 뒤 런타임은 seeded `scoring1` **다음** 문항부터 시작한다 — 이것이 §3.6 의 「qualifier 없는 landing ingress 는 seeded scoring1 다음 scoring question 부터」이고, EGTT 같은 qualifier variant 는 첫 runtime-presentable scoring question(canonical index 2)부터다. **시트로 바꾸면서 이 문장이 참으로 남는지가 이 단위의 핵심 회귀 검사다** — `tests/e2e/consent-smoke.spec.ts` 의 「Deny and Start begins at Q1」·「landing ingress ignores an older active-run」·「EGTT … starts scoring」이 그 증인이다.

### 1-2-2. 계약 개정 — 한 줄

`req-landing.md:906` 「Desktop: centered card overlay. Mobile: full-screen overlay.」 의 뒤 절반을 「Mobile: 모달 바텀시트(명세 §2-3 · §3-4)」로 고친다. `req-test.md` §3.6 은 **한 글자도 바뀌지 않는다** — `:399` 의 「별도 route 가 아니라 `/test/{variant}` 위 overlay」는 시트도 만족하고, `:402` 의 모달 다이얼로그 요건(역할 · 제목 · 컨테이너 포커스 · Tab 순환)은 프리미티브가 그대로 충족한다. `:403` 의 `Esc` 의미는 step 2 가 이미 개정했다.

### 1-2-3. 구현 시 유의 — 여섯

① **commit 시점을 늦추지 않는다.** 시트 이탈 모션을 위해 commit 을 애니메이션 뒤로 미루면 `useAutoCommit` 의 microtask 경로와 `redirecting` 분기가 어긋난다. commit 은 지금처럼 탭 즉시이고, 시트는 **닫힌 상태로 그려지며 사라지는** 쪽이다.

② **`aria-hidden` 은 즉시 뒤집는다.** 뒤 패널의 `aria-hidden` 은 `instructionVisible` 을 그대로 따른다 — 시트가 내려가는 220ms 동안 보조기술에는 이미 문항이 보여야 하고, 시각적으로는 시트 아래에 Q2 가 그려져 있다. 이것이 「Q2 가 뒤이어 나온다」의 실제 모양이다.

③ **presence 는 커넥터가 갖고 상태 기계는 모른다.** `OverlayConnector` 가 `visible=false` 에서 곧바로 `null` 을 반환하면 이탈 모션이 불가능하다. 커넥터가 마지막 props 를 220ms 동안 붙들고 `data-state="closing"` 으로 그린 뒤 언마운트한다 — 드로어의 `data-[state=closing]` 과 같은 방식이다. 그 동안 시트의 버튼은 `disabled` 가 아니라 **`inert`** 다(disabled 는 포커스를 떨어뜨린다).

④ **랜딩 진입에서는 진입 모션을 끈다.** `landingIngressFlag` 가 참이면 시트는 첫 페인트에 이미 열린 상태다 — 전환의 목적지 프레임이 바로 이 화면이고, 여기서 다시 올라오면 모션이 두 번이다. 직접 진입(`ingressType === 'direct'`)에서만 §3-4 의 진입 모션을 쓴다. `use-landing-transition-completion.ts` 가 전환 완료를 아는 곳이다.

⑤ **재진입 모드의 복귀 포커스를 잃지 않는다.** 칩(`qualifier-chip.tsx`)이 시트를 열면 닫힐 때 포커스가 칩으로 돌아가야 한다 — 지금 `restoreFocusRef` 가 하는 일이고, 프리미티브의 「트리거로 복귀」가 이것을 대체한다. 칩은 시트가 열린 동안에도 마운트를 유지한다(현행 주석 그대로).

⑥ **층과 잠금.** 시트는 GNB 위(`z` 1200 계열)로 올리고, 잠금은 단위 1 이 만든 참조 카운트 모듈을 쓴다. instruction 은 지금 잠금이 **없다** — 뷰포트보다 긴 지시문에서 뒤 페이지가 스크롤됐다(scroll-viewport F5). 시트 본문이 스크롤 컨테이너를 갖고 배경은 잠긴다.

### 1-2-4. 붉어질 것 — 같은 커밋에서

| 검사 | 케이스 | 할 일 |
|:---|---:|:---|
| `tests/e2e/qualifier-overlay.spec.ts` | 14 | 전부 1280px 이다 — **390px 터치 컨텍스트 사본**을 더한다(step 2 단위 0 이 가르친 방식). 데스크톱 14 는 다이얼로그 유지이므로 그대로 초록이어야 한다 |
| `tests/e2e/consent-smoke.spec.ts` | 17 | testid(`test-instruction-overlay` · `test-instruction-body` · `test-start-button` 등)를 **그대로** 유지하면 대부분 초록. 붉어지는 것은 기하를 보는 것만 |
| `tests/e2e/a11y-smoke.spec.ts:679,714` | 2 | 모달 의미론·`Esc` 단언 — 시트가 같은 역할을 지므로 초록이어야 한다. 붉으면 프리미티브의 결함이다 |
| `tests/e2e/transition-telemetry-smoke.spec.ts` | 6 | `test-instruction-overlay` 가시성 단언 — 유지 |
| `theme-matrix` `test-instruction` recipe | 6 뷰포트 × 2 locale × 2 theme | **mobile 4 장만 바뀐다.** 데스크톱·태블릿 20 장이 바뀌면 다이얼로그를 건드린 것이다. recipe 이름 `test-instruction` 은 `check-phase11-telemetry-contracts.mjs:108` 이 고정하므로 바꾸지 않는다 |

## 2. 단위 2 — 태블릿·데스크톱 제자리 오버레이에 dim backdrop

명세 §2-11 과 규칙 3 을 따른다. **위치를 옮기지 않는다.** hover 없는 기기에 dim backdrop 을 깔고 빈 곳 탭을 닫기로 만든다. **보이는 X 는 두지 않는다** — 대신 시각적으로 숨긴 닫기 버튼을 마지막 탭 스톱에 둔다. `Escape` 는 모든 조건에서 닫는다.

**높이 상한**을 준다 — `max-height: calc(100dvh − GNB − 24px)` 과 본문 내부 스크롤. 가로 844×390 폰이 이 조건으로 들어오고 그 뷰포트에서 오버레이가 넘친다(명세 규칙 3).

회전으로 펼친 카드가 파괴되지 않는 것과 **가로에서 오버레이가 잘리지 않고 스크롤되는 것**을 **E2E 로 고정**한다(세로→가로, 가로→세로 양방향).

## 3. 단위 3 — 동의 배너 정리와 재호출 경로

명세 §2-1 · §2-2 · §2-5 와 규칙 4 를 따른다. 배너의 형태는 유지하고 **버튼을 둘로 줄인다**(`Preferences` 제거, `Allow` CTA + `Deny` 평문 텍스트). 미선택 상태에서 카드 탭 시 사전질문 시트가 **배너보다 위 층**에 뜨고 배너는 남는다(`inert`). 본문의 줄 수 예산(390px 2 줄 · 320px 3 줄)을 12 locale 에서 잰다.

**`OPTED_OUT` 고지 행**을 만든다 — 그리드 상단에 `n개 테스트는 분석 동의가 필요합니다 · 동의 변경` 한 줄(명세 §2-1). 숨은 개수는 `isCatalogVisibleCard`(`variant-registry/attribute.ts:56-58`)의 필터 결과에서 세고, `req-landing.md` §13 에 「`OPTED_OUT` 카탈로그는 숨겨진 항목 수와 해제 경로를 그리드 상단에 고지한다」를 더한다. 첫 페인트 후 축소 자체(`:741-742` 초기 렌더 window 분기 금지)는 건드리지 않는다.

**재호출 경로**를 만든다 — 모바일 드로어 설정 블록의 우측 정렬 얇은 링크, 데스크톱 페이지 최하단 중앙의 같은 링크, 그리고 고지 행의 `동의 변경`. 누르면 같은 배너가 뜨고 이전 선택이 표시되며, **재호출 배너에만 닫기 X(44×44)** 가 있다.

`req-landing.md` §8.4 의 배너 회피 계약(`:609` 포함)을 다시 읽는다 — 시트가 배너 위 층으로 오면 회피 rAF 루프 91 행의 전제가 바뀐다.

## 4. 단위 4 — 폰트: 로케일별 subset + preload

**측정**: 전송 2,910KB 중 폰트 **2,009KB(69%)**. Slow 4G **10,886ms** · Slow 3G **44,405ms**.

현재 locale 것만 `<link rel="preload">` 한다. **커버리지를 잃지 않아야 한다** — 12 locale 이 전부 Pretendard 로 렌더되고 fallback 이 없으므로 subset 이 글리프를 잘라 먹으면 두부가 뜬다. 한자(zs·zt)와 데바나가리(hi)는 별도 전략을 `decision-register.md` 에 등재하고 정한다.

`req-landing.md` §11 에 **전송 예산 한 줄**을 넣는다(현재 수치 예산이 없다). fallback 메트릭 오버라이드로 swap 이동을 0 으로 유지한다 — **현재 CLS 0.0000 을 악화시키지 않는 것이 조건**이다.

**같은 단위에 붙이는 첫 페인트 둘.** ⑴ `public/theme-bootstrap.js`(Ask-First)가 첫 페인트 전에 실행되지 않아 Fast 4G 에서 다크 사용자가 **1,343ms**, Slow 4G 에서 5,483ms 동안 라이트 화면을 본다(점수표 `theme-bootstrap-never-runs-before-paint`) — 인라인 동기 스크립트로 `<head>` 첫머리에 두거나 그와 동등한 경로로 옮기고, CDP 스로틀링으로 라이트 프레임이 0 임을 잰다. ⑵ 첫 행 카드 이미지가 `loading="lazy"` 라 preload 스캐너가 건너뛰어 발견이 815ms 늦다(`lcp-thumbnail-lazy-no-priority`) — 모바일에서는 첫 카드, 데스크톱에서는 첫 행에 `priority` 를 준다. 둘 다 축과 무관하고 폰트와 같은 「첫 화면이 언제 제대로 보이는가」 문제라 여기 묶는다.

## 5. 단위 5 — 타이포에 뷰포트 축을 준다

**측정**: 랜딩 390px 의 보이는 텍스트 46 개 중 **35 개(76%)가 16px 미만**. 뷰포트에 따라 값이 바뀌는 타이포 토큰은 **0 개**다.

`--shell-gutter` 가 보여 준 패턴 — 하나의 토큰을 미디어 쿼리로 단 지어 주고 소비처는 한 곳 — 을 타이포에 적용한다. `src/app/globals.css` 는 **Ask-First** 이고 `@mirror-*` 구간은 `docs/design/ds/colors_and_type.css` 의 사본이므로 **설계 정의를 먼저 고치고 다시 베낀다**.

본문·제목·버튼 라벨을 먼저 올리고 보조 정보는 대비와 함께 재판정한다 — 모두 올리면 단위 7 과 충돌한다.

## 6. 단위 6 — 누름 피드백과 모션

**측정**: `:hover` **39 개** 대 `:active` **5 개**. Tailwind preflight 가 `-webkit-tap-highlight-color` 를 끄고 있어 **pointerdown 직후 DOM 변화가 0** 이다(첫 변화까지 124ms).

hover 어포던스마다 대응하는 `:active` 를 준다. 값은 `design.md` §4.8 어휘 안에서 — 새 값을 발명하지 않는다. `touch-action: manipulation` 과 문서 루트 `overscroll-behavior` 를 준다(둘 다 현재 0 건).

**reduced-motion**: 애니메이션 원소가 25 → **22** 로만 준다. 전부 census 해 처분을 표로 남긴다 — 전부 0 으로 만드는 것이 답이 아니다. `.root.reducedMotion …` 클래스가 이미 stagger 를 0ms 로 만드므로 미디어 블록만 읽고 판정하지 않는다.

**`.motionStageLate` 를 되살린다.** CSS 는 40/100/160ms 3 단을 정의하고 `design.md:374` 가 staged stagger 를 요구하는데 meta 가 Middle 로 배정돼 Late 가 비어 있다. `ExpandedMetaRow`(`landing-grid-card.tsx:711`)를 `styles.motionStageLate` 로 바꾼다 — **한 단어**다.

## 7. 단위 7 — 랜딩 밀도

명세 §2-1 을 따른다. 1 열 유지, 썸네일 **16:6 → 16:4**, 부제에 모바일 clamp 도입하되 **최대 두 줄**까지 허용. 목표 약 3.0 화면.

`landing-grid-card.tsx:379,408` 이 모바일 clamp 를 **의도적으로 껐고** `req-landing.md` §6.6 과 12 locale E2E 가 그 값을 붙들고 있다(`tests/e2e/grid-smoke.spec.ts:487,1196`). 계약 개정과 12 locale 재검증이 동반된다.

**텍스트 200% 확대 오버플로는 밀도와 무관하게 먼저 고친다** — 390px 에서 태그 chip 이 뷰포트를 32px 넘는다(WCAG 1.4.4 실패).

**히어로 밴드를 걷는다**(명세 §2-12). `src/app/[locale]/page.tsx:28-30` 의 `landing-hero` 섹션을 제목 한 줄 + 부제 한 줄의 페이지 제목 영역으로 바꾸고 — `h1` 은 단위 5 의 제목 역할, 부제는 한 줄 clamp, `aria-label` 은 메시지 키 — `design.md` §7.1 의 「No hero」 문장을 「마케팅 밴드·큰 헤드라인·일러스트 밴드 금지 — 한 줄 페이지 제목은 히어로가 아니다」로 다듬어 `decision-register.md` 에 등재한다. 3.0 화면 목표는 이 영역을 포함해 잰다.

## 8. 단위 8 — 결과 화면의 주소

명세 §2-6 을 따른다. `req-test.md` §5.1 의 Result URL 을 구현한다. 그 절의 경로 표기는 **locale-free route 표기**이고 실제 URL 은 `/{locale}/result/...` 임을 문서에 한 줄 명시한다(현재 §6.1 과 §5.1 의 표기가 갈린다). GNB 문맥을 전환해 진행률·타이머를 걷는다.

**뒤로가기 목적지를 정한 대로 만든다** — 결과 URL 은 `router.replace` 로 `/test/{variant}` 항목을 대체하고, GNB `Back` 은 랜딩이다(명세 §2-6). 결과에서 브라우저 뒤로가기가 완료된 회차를 다시 부트스트랩하지 않는 것을 E2E 로 고정한다.

**내용 구성과 동적 OG 는 만들지 않는다.** 경계를 `docs/plans/2026-05-17-result-pipeline-todos.md` 에 한 줄로 적어 다음 phase 가 이어받게 한다.

## 9. 단위 9 — 히스토리 목록

명세 §2-7 을 따른다. 실제 회차를 목록으로 렌더하고 디버그 문자열을 제거하고 빈 상태에 다음 행동을 준다. **항목 탭 동작과 URL 스킴은 만들지 않는다.**

## 10. 단위 10 — 표면별 나머지

| 표면 | 할 일 |
|:---|:---|
| **GNB 컨트롤 전체** | 명세 §3-1 — 보이는 껍데기 **36px**, 히트 영역 **44px**. `Menu` · `Back` · 데스크톱 설정 pill · 드로어 헤더 닫기 전부 |
| **설정 라벨** | 명세 §3-2 — `LANGUAGE · THEME` → **`Settings`**(데스크톱·모바일 공통). 좁은 폭에서 두 줄로 접히기 때문이다 |
| **확장 메타 행** | 명세 §3-3 — 왼쪽 `소요 · 완료`, 오른쪽 정렬 `공유`. 폰 시트와 제자리 오버레이 공통 |
| **GNB 드로어** | 명세 §2-4 — 설정 최상단 · 이동 최하단 · Privacy 우측 정렬 얇은 링크 · 언어 12 개 그대로(**칩마다 `lang` · 묶음 이름**) · 테마 컨트롤 `radiogroup` + 배지 점 텍스트 대안 · **포커스 트랩** · **시스템 뒤로가기로 닫힘**(규칙 3) · `h-screen max-h-screen` 제거로 `100dvh` 살리기 |
| **데스크톱 설정** | 명세 §2-9 — 조용한 pill(전체 언어 이름 · 기본 weight · 테두리·배경 없음) · 레이어가 **pill 을 덮으며** 펼쳐짐 · `System` 텍스트 버튼 · 테마 마크 규칙 5·6 · 시스템 뒤로가기로 닫힘 |
| **데스크톱 최하단** | 명세 §2-10 — `Privacy preferences` 중앙 얇은 링크 · 더 흐린 회색이되 **4.5:1 이상** · 여백 최소 · 콘텐츠 끝에 붙는 footer 행(고정 아님) · 테스트 진행 중 표면 제외 |
| **instruction GNB 제목** | 명세 §2-3 — 제목을 **컨테이너 전체 폭 기준** 중앙 정렬하고 `Back` 을 절대 위치로 얹는다(시트 전환 자체는 단위 1-2) |
| **skip link** | 명세 §2-13 — 포커스 시에만 보이는 pill · GNB 왼쪽 상단 · 12 locale 라벨 · 목적지 `<main>`. step 2 단위 3-2 가 걷어 낸 키보드 진입의 자리 |
| **테스트 플로우** | 결과 화면에 남는 `Progress 100%`·타이머 제거 · Q7·Q8 자리표시자를 내용으로 · **sticky CTA 는 재기 전에 도입하지 않는다**(문항 화면은 이미 1 화면) |
| **저장소 차단 크래시 (blocker)** | iOS 「모든 쿠키 차단」에서 시작 버튼이 앱을 `html#__next_error__` 로 떨어뜨린다. `src/features/test/storage/**` 의 쓰기를 try/catch 로 감싸고 저장 실패를 **저하된 모드**로 처리한다 |
| **Next 내장 오류 폴백 (blocker)** | `error.tsx`·`global-error.tsx` 가 0 건이라 예외 하나가 화면을 Next 의 영어·무테마·32px 화면으로 대체한다. 제품 오류 경계를 만든다 |
| **세그먼트 404 (blocker)** | `/en/test/UNKNOWN` 의 서버 HTML body 에 보이는 텍스트가 0 이다. `[locale]` 아래 `not-found.tsx` 가 서버에서 본문을 내보내게 한다 |
| **에러 · 404 카피** | 명세 §2-8 |
| **블로그 목록·상세** | 카드 어포던스를 test 카드와 시각적으로 구분한다(같아 보이는 카드가 하나는 시트를 열고 하나는 이동한다) · 상세 본문에 단위 5 의 타입 스케일을 적용하고 줄 길이를 390px 에서 관행(45~75자)과 대조 |

## 11. 단위 11 — baseline 재생성 (단일 승인 단계)

**모든 시각 변경을 끝낸 뒤 한 번에 한다.** 순서가 고정돼 있다.

1. `tests/e2e/theme-matrix-manifest.json` 을 새 케이스 집합으로(**Ask-First**)
2. `scripts/qa/check-phase11-telemetry-contracts.mjs` 의 폐쇄 검사를 그에 맞게(**Ask-First**)
3. **사용자 승인을 받고** `npm run qa:visual:full`
4. `tests/e2e/theme-matrix-baseline-provenance.md` 에 provenance 기록
5. `npm run test:e2e:gate` 3 회 연속 초록 확인

**함께 넣을 것**: 시각 회귀망 170 장이 전부 **한 가지 동의 상태**에서 찍혔다 — 첫 방문자가 보는 UNKNOWN 화면에 회귀 픽셀이 0 장이다. **UNKNOWN 상태를 manifest 축에 넣는다.** 그리고 `/{locale}/blog/{variant}` · `/{locale}/test/error` · 404 두 표면에 baseline 이 0 장이다.

**없는 baseline 은 생성되지 않고 실패로 남는다**(`tests/e2e/helpers/local-snapshot.ts:21-44`) — BQ-07 마감이 세운 그 가드를 되돌리지 않는다.

---

## 12. 완료 조건

- [ ] §0 의 다섯이 전부 유지됐다(대비 · 12 locale 오버플로 0 · 드로어 모달 의미론 · 문항 화면 · `--tap-min`).
- [ ] 명세 §4 의 **반복되는 결함 셋**이 전 표면에서 0 이다 — 중앙 정렬 기준 · 마크가 레이아웃을 건드림 · 라벨 두 줄 접힘.
- [ ] 폰 확장이 바텀시트이고 닫기 다섯 경로가 동작한다(컨트롤 · backdrop · 스와이프 · Escape · 뒤로가기). 시트가 §3-4 규격(높이 상한 · 내부 스크롤 · safe-area · 모션 · inert)을 지킨다.
- [ ] instruction 이 같은 시트 프리미티브 위에 있고 grabber·제스처 닫기·history 항목이 없으며, 행동을 보는 단위 테스트 4 종이 **수정 없이** 초록이다. 랜딩 진입 후 시작하면 Q2 가 시트 아래에 이미 그려져 있다.
- [ ] 태블릿·데스크톱 확장이 **제자리**이고 dim backdrop 의 빈 곳 탭으로 닫힌다. **보이는 X 가 없고** 숨긴 닫기 버튼이 마지막 탭 스톱이다. 가로 844×390 에서 오버레이가 잘리지 않고 스크롤된다.
- [ ] 회전 양방향에서 확장이 살아남는 것을 E2E 가 고정한다.
- [ ] 시트·드로어·설정 레이어가 전부 시스템 뒤로가기로 닫힌다.
- [ ] 동의 배너가 버튼 둘이고, 미선택 상태의 카드 탭에서 사전질문이 **위 층**에 뜨며 배너가 남는다(`inert`). 본문 줄 수 예산이 12 locale 에서 지켜진다.
- [ ] `OPTED_OUT` 카탈로그 상단에 숨은 개수와 `동의 변경` 링크가 있는 고지 행이 있다.
- [ ] 동의 재호출 경로 셋이 동작하고 이전 선택이 표시되며, 재호출 배너에만 닫기 X 가 있다.
- [ ] 랜딩 히어로 밴드가 걷혔고 제목 한 줄 + 부제 한 줄만 남았다. `design.md` §7.1 문장이 갱신됐다.
- [ ] 결과에서 브라우저 뒤로가기가 테스트를 다시 부트스트랩하지 않고, GNB `Back` 은 랜딩이다.
- [ ] 테마 부트스트랩이 첫 페인트 전에 돌고(스로틀링 실측 라이트 프레임 0), 첫 카드 이미지가 `priority` 다.
- [ ] skip link 가 포커스 시 보이고 `<main>` 으로 간다.
- [ ] 폰트가 로케일별 subset + preload 이고 CLS 가 **악화되지 않았다**.
- [ ] 타이포에 뷰포트 축이 생겼고 토큰 패리티가 초록이다.
- [ ] `:active` 피드백 · `touch-action` · `overscroll-behavior` 가 들어갔고 `.motionStageLate` 가 되살아났다.
- [ ] 텍스트 200% 확대에서 390px 오버플로가 0 이다.
- [ ] 랜딩이 약 3.0 화면이고 카드 부제가 최대 두 줄이다.
- [ ] 결과에 주소가 생겼고 히스토리가 목록을 렌더한다. 두 경계가 문서에 적혀 있다.
- [ ] blocker 넷(저장소 차단 · Next 폴백 · 세그먼트 404 · 로케일 별칭)이 닫혔다.
- [ ] 설정 라벨이 `Settings` 이고 어디서도 두 줄로 접히지 않는다.
- [ ] baseline 재생성이 §11 의 5 단계를 그대로 밟았고 provenance 가 기록됐다.
- [ ] `docs/decision-register.md` 에 변경 이력. 함정 원장 등재 또는 등재 불요 판정 한 줄.
- [ ] 이 문서와 명세를 `docs/done/` 으로 옮겼다(같은 커밋).

## 13. 이 단계에서 하지 않는 것 (do not)

- **§0 의 다섯을 다시 만들지 않는다** — 특히 드로어의 모달 의미론.
- **태블릿·데스크톱 확장을 하단으로 옮기지 않는다.** 제자리 오버레이에 **보이는 X 를 두지 않는다.**
- **동의를 오버레이로 만들지 않는다.** 배너와 시트가 컨테이너를 공유하지 않는다. **Deny 의 시각 무게를 올리지 않는다** — 평문 텍스트가 확정이다.
- **instruction 시트에 grabber·스와이프 닫기·backdrop 탭 닫기·history 항목을 주지 않는다.** 행동 파일 넷(`entry-policy` · `use-test-entry-orchestrator` · `use-qualifier-overlay-wizard` · `use-auto-commit`)을 건드리지 않는다.
- **시트에서 A/B 를 고른 뒤 「다음」 CTA 를 두지 않는다.** 탭이 곧 진입이다. 문항 화면에도 「다음」 버튼을 두지 않는다 — 자동 진행이 확정이다.
- **히스토리 항목의 형태를 바꾸지 않는다** — 카드와 그림자 그대로, 어포던스 추가 없음.
- **언어 칩을 접거나 줄이지 않는다.** 드로어 가운데 여백을 이번에 채우지 않는다.
- **2 열 그리드를 만들지 않는다. 상시 하단 탭 바를 만들지 않는다.**
- **결과 화면의 내용과 동적 OG 를 만들지 않는다. 히스토리 항목 동작과 URL 스킴을 만들지 않는다.**
- **밀도(§7)와 확장 모델(§1)을 한 커밋에 묶지 않는다** — 직교하는 축이고, 묶으면 baseline diff 의 원인을 가를 수 없다.
- **`qa:visual:full` 을 승인 없이 치지 않는다.**
- **유령 GNB 를 View Transition 으로 바꾸지 않는다.**

## 14. 실행 프롬프트

**「`docs/plans/2026-09-11-mobile-refactor-step3-surfaces.md` 를 그대로 실행하라. 착수 전에 `docs/plans/2026-09-14-mobile-refactor-design-spec.md` 를 전문으로 읽어라 — 시각과 인터랙션의 정본은 그 문서다. 선행 확인부터 하고 §1 → §1-2 → §2 … §11 순서로 진행하라. 모든 제품 결정은 분석 문서 §15 와 명세에 확정돼 있으니 다시 묻지 마라. §1-2(instruction 시트)는 행동 파일 넷을 건드리지 않고 행동 단위 테스트 4 종이 수정 없이 초록인 것이 합격 판정이다. §7(밀도)과 §1(시트)을 한 커밋에 묶지 말고, §11 의 baseline 재생성은 모든 시각 변경이 끝난 뒤 승인을 받아 한 번에 하라. 표면을 하나 끝낼 때마다 명세 §4 의 결함 셋을 대조하라.」**
