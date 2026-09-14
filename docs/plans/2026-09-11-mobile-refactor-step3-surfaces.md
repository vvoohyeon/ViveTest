# 모바일 전면 리팩터 — step 3: 표면 재설계

**Task mode:** Implementation. **Ask-First·SSOT·High-Risk 전면 해당.** 이 단계에서 시각 baseline 재생성이 일어나므로 **`qa:visual:full` 실행 전에 사용자 승인을 받는다**(`AGENTS.md` §4 Hard stops).

**선행 확인 (착수 전에 반드시):**

```bash
cd "$(git rev-parse --show-toplevel)" && ls docs/done/2026-09-11-mobile-refactor-step1-seam.md docs/done/2026-09-11-mobile-refactor-step2-axis-and-contract.md && npm test && npm run qa:rules
```

두 문서가 `docs/done/` 에 있어야 하고, 코드에 `LayoutBreakpoint`·`InputProfile`·`KeyboardAffordance` 세 축이 있어야 하며, 요구사항 문서가 둘로 갈려 있어야 한다. **900×1200 터치 기기에서 확장 카드에 닫기 X 가 보이는지**를 직접 확인한다 — 그것이 step 2 가 실제로 끝났다는 유일한 체감 증거다.

**이 단계가 끝나면:** 모바일이 표준 UX 위에 서 있다. 데스크톱·태블릿의 시각과 인터랙션 정체성은 유지되고, 디자인 시스템 토큰 체계와의 호환이 깨지지 않았다.

---

## 공유 블록 — 세 문서가 같이 갖는 것

### 최상위 목표

모바일의 인터랙션·UX·디자인을 전면 리팩터하되 데스크톱·태블릿과의 호환성, 디자인 일관성, 디자인 시스템 호환성을 유지한다. 배경과 근거는 `docs/plans/2026-09-11-mobile-refactor-analysis.md` 가 갖는다 — **착수 전에 전문을 읽는다. 특히 §15 확정된 제품 결정 열둘.**

### 사용자 결정 일곱 (확정 — 다시 묻지 않는다)

1. 계약 개정 전면 허용 · 2. 터치 태블릿은 입력 방식 기준으로 통일 · 3. 전 표면 동시 · 4. 0단계로 구조를 먼저 가른다 · 5. IA 재설계 허용 · 6. 요구사항 문서를 동작/인터랙션으로 분리 · 7. 서명 인터랙션은 3분류로 제시.

### 불변 경계 (세 단계 전부)

- **워크스페이스는 `git clone` 이다. 워크트리를 만들지 않는다**(`AGENTS.md` §4).
- **`qa:visual:full` 은 사용자 승인 없이 실행하지 않는다.**
- `.env`·비밀값은 읽지도 출력하지도 커밋하지도 않는다.
- **게이트를 약화시켜 통과시키지 않는다.**
- **시각 baseline diff 는 provenance 가 확인되기 전까지 회귀로 간주한다**(`AGENTS.md` §10).

---

## 0. 이 단계가 지켜야 할 것 — 먼저 적는다

리팩터가 **부수면 안 되는 것**이 다섯이고 전부 실측으로 확인됐다.

1. **대비** — 두 테마 모두 WCAG AA 위반 0, 전 표면 최소 5.08:1. 타입·색을 바꿀 때 이 수치를 재측정해 유지한다.
2. **12 locale × 390px 가로 오버플로 0** — 밀도를 바꾸거나 clamp 를 도입하면 12 locale 전부에서 다시 잰다.
3. **GNB 모바일 드로어** — `role="dialog"` · `aria-modal` · `aria-label` · 여는 순간 Close 로 포커스 이동 · `body` 스크롤 잠금 · Escape · backdrop · safe-area 하단 32px · 타깃 전부 ≥44px. **다시 만들지 않는다 — 포커스 트랩 하나만 더한다**(실측: Tab 20 회 중 5 회가 드로어 밖 랜딩 카드로 샌다).
4. **테스트 문항 화면** — 이미 한 화면 한 문항, 오버플로 0, 답변 타깃 316×48~70px.
5. **`--tap-min: 44px` 토큰** — 이미 있고 GNB 가 쓴다. 새 토큰을 만들지 말고 이것을 넓게 쓴다.

## 0-1. 작업 지시서는 점수표다

이 문서는 **순서와 경계**를 정하고, 무엇을 고칠지는 `docs/plans/2026-09-11-mobile-refactor-maps/scorecard.md` 가 217 행으로 갖는다(blocker 13 · major 96 · minor 108). 이 단계가 가져가는 것은 **표면에 걸린 행 전부** — 즉 계약 개정이 선행 조건이 아닌 나머지 전량이다.

**세 가지를 지킨다.** ⑴ `정정` 열에 ✓ 가 있으면 렌즈 문서의 「검증이 붙인 정정」을 먼저 읽는다 — `basis` 를 그대로 믿으면 안 된다. ⑵ `[비평]` 행은 적대적 검증을 거치지 않았으니 **착수 전에 재현**한다(단 blocker 넷은 이 분석이 이미 재현했다 — 분석 §14 #8). ⑶ 반증된 62 건 표를 먼저 본다.

---

## 1. 단위 1 — 바텀시트 (확정)

**모바일 카드 확장을 제자리 확장에서 바텀시트로 교체한다.** 사용자 결정이며 다시 묻지 않는다.

### 1-1. 시트 명세

- **기하**: 하단에서 올라온다. 높이는 **내용에 맞추되 `100dvh` 의 88% 를 상한**으로 한다(상단에 배경이 보여야 시트임이 읽힌다). 카드 자리는 그대로 남는다 — 시트는 카드 기하를 건드리지 않으므로 **복원할 기하가 없다.**
- **의미론**: `role="dialog" aria-modal="true"` · `aria-labelledby` 가 시트 제목을 가리킨다 · 포커스 트랩 · 열 때 시트 제목으로 포커스 이동 · 닫을 때 트리거로 복귀.
- **닫기 네 경로**: 닫기 컨트롤(44×44, 헤더 우측) · backdrop 탭 · **스와이프 다운** · **Escape**. 스와이프는 임계 이하에서 원위치로 되돌아가고, 스크롤 가능한 내용의 최상단에서만 시작한다.
- **스크롤**: 시트가 열린 동안 **배경을 잠근다**. 내용이 시트 높이를 넘으면 시트 안에서 스크롤한다(`overscroll-behavior: contain`).
- **모션**: 진입 `translateY(100%) → 0` + backdrop `opacity 0 → 1`, 이탈은 그 역. duration 은 `--dur-expand`(260ms) 안. **spring/overshoot 금지**(`design.md` §8 Banned). `prefers-reduced-motion` 에서는 translate 를 버리고 opacity 만 남긴다.
- **뒤로가기**: 시트 열림이 history 항목을 만들고 시스템 뒤로가기가 시트를 닫는다. 이것이 `req-landing.md:632` 개정의 실질이다.
- **회전**: 시트는 회전에서 **살아남아야 한다.** 결정 2 가 적용되면 가로에서도 터치 생명주기가 유지되므로 현행의 회전 파괴(분석 §14-1 ⑵)가 부수적으로 사라진다 — 그것을 E2E 로 고정한다.

### 1-2. 삭제되는 것

`use-mobile-restore-polling.ts`(120) · `mobile-card-lifecycle-dom.ts`(48) · `use-mobile-transient-shell.ts`(57) · `use-mobile-backdrop-gesture.ts`(100, 시트 제스처로 대체) · `mobile-lifecycle.ts`·`use-mobile-card-lifecycle.ts` 대폭 축소 · `landing-grid-card.module.css` 의 transient/mobile 키프레임 구간(`:302-361`·`:527-563`).

### 1-3. 개정되는 계약

`req-landing.md` §8.5 **전면 재작성** — `:625` in-flow 유지 · `:626` y-anchor 편차 0 · `:630` 제목 기준선 0px · `:632` 닫기 화이트리스트 · `:634-635` 스냅샷 복귀 · `:637` 연속 전이 · `:639` 런타임 실측 기법 지정 · `:641` 자동 보정 스크롤 금지 · `:650` 비-CTA 탭 no-op · `:652` 예외 불허가 전부 무의미해지거나 뒤집힌다. **지우지 말고 다시 써라** — 그 조항들이 지키려던 둘은 여전히 유효하다: **연속성**(원본 카드와 시트가 같은 것으로 읽혀야 한다 — 최소한 제목이 이어진다)과 **복귀 정확성**(닫은 뒤 스크롤 위치와 카드 좌표가 진입 직전과 같다).

`design.md` §10 의 「Swipe-down close as authorized mobile expanded behavior」를 **Never Reintroduce 에서 내린다** — `decision-register.md:104,108`(BQ-11)은 「미결정이므로 어떤 wave 에도 포함 금지」라고 적었지 영구 금지가 아니었고, 미결정이 §10 으로 옮겨지면서 `never` 가 됐다. BQ 로 재등재해 결정 대상으로 되돌린다.

### 1-4. 재생성되는 baseline

`theme-state-mobile-landing-test-expanded-{en,kr}-{light,dark}-mobile-chromium-darwin.png` 4 장. **재작성 E2E**: `tests/e2e/state-smoke.spec.ts:1003-1146` · `tests/e2e/grid-smoke.spec.ts:815-870`.

---

## 2. 단위 2 — 동의 바텀시트, 그리고 시트 컨테이너의 공유

**동의 UI 를 하단 고정 배너에서 바텀시트로 옮긴다. 모달 시트가 아니다.**

**왜 모달이 아닌가 (사용자 지시).** 랜딩 직후 화면 전체를 덮어 선택을 강제하면 사용자가 부담을 느끼고 이탈한다. 바텀시트는 하단 일부만 덮고 **뒤에서 카탈로그를 계속 스크롤할 수 있어야 한다** — 즉 이 시트는 `aria-modal` 이 아니고 배경을 잠그지 않으며 backdrop 도 두지 않는다. 단위 1 의 카드 시트와 **의미론이 다르다는 점을 코드가 구분해야 한다.**

**현행 배너의 실측**: 첫 방문 시 하단 214px = 뷰포트의 **25.4%** 를 카탈로그를 훑는 내내 점유한다. 시트로 옮기면 답한 뒤 사라지므로 그 점유가 끝난다.

**instruction 화면의 모달 시트는 유지한다**(사용자 지시). 동의 미선택 상태로 테스트에 진입할 때는 선택을 강제하는 것이 맞다. 즉 **같은 제품에 두 종류의 시트가 있다** — 비모달 동의 시트(랜딩)와 모달 동의 시트(instruction). 그 차이를 문서와 코드에 명시한다.

### 2-1. 시트 컨테이너를 공유할 때의 규율

사용자가 승인한 것: **동의 시트가 떠 있는 상태에서 카드를 탭하면 동의 시트가 사라지고 그 자리를 사전질문 시트가 대체해도 좋다.** 단 **같은 UI 요소를 두 기능이 공유하므로 전환 인터랙션이 아주 정교해야 한다.** 규율 넷:

1. **시트 컨테이너는 하나다.** 두 시트가 동시에 DOM 에 존재하는 프레임이 **한 장도 없어야 한다** — 이것을 E2E 로 고정한다.
2. **전환은 교차 페이드 + 단일 높이 전이다.** 내용이 교차 페이드하고 컨테이너 높이가 하나의 전이로 이어진다. 시트가 내려갔다 다시 올라오면 안 된다(두 번의 모션은 두 개의 시트로 읽힌다).
3. **의미론이 전환과 함께 바뀐다.** 비모달(동의) → 모달(카드 상세)로 갈 때 `aria-modal` 과 포커스 트랩과 배경 잠금이 **같은 프레임에 함께** 켜진다. 스크린리더에게는 새 다이얼로그가 열린 것으로 읽혀야 하므로 전환 시점에 포커스를 새 제목으로 옮긴다.
4. **동의는 사라지지 않는다.** 동의 시트가 대체된 뒤에도 동의 상태는 여전히 미선택이다. 카드 시트를 닫으면 동의 시트가 **되돌아온다**.

### 2-2. 동의 되돌리기 경로 (blocker)

`Deny` 한 번에 카탈로그가 8 장 → 2 장이 되는데 되돌릴 UI 가 제품에 없고, 배너 카피는 「you can change your choice at any time」을 약속한다. `Preferences` 버튼은 핸들러가 빈 함수다. **GNB 드로어 하단 설정 블록에 `Privacy` 행을 추가**해 현재 동의 상태를 칩 둘로 노출하고 `setTelemetryConsentState` 를 직접 호출한다 — 테마·언어와 같은 어휘를 쓴다. `Preferences` 버튼은 그 행으로 보낸다.

---

## 3. 단위 3 — 폰트: 로케일별 subset + preload

**측정**: 전송 2,910KB 중 폰트 **2,009KB(69%)**. Slow 4G 에서 폰트 하나가 **10,886ms**, Slow 3G 에서 **44,405ms**. 그동안 사용자는 fallback 글꼴로 읽다가 한 번에 뒤바뀐다.

**할 일**: Pretendard Variable 을 로케일별로 subset 해 현재 locale 것만 `<link rel="preload">` 한다. **커버리지를 잃지 않아야 한다** — 12 locale 실측에서 전부 Pretendard 로 렌더되고 fallback 이 없으므로, subset 이 글리프를 잘라 먹으면 그 자리에 두부가 뜬다. 한자(zs·zt)와 데바나가리(hi)는 subset 해도 크므로 그 둘은 별도 전략(필요 글리프만 · 또는 시스템 폰트 허용)을 `decision-register.md` 에 등재하고 정한다.

**함께 고칠 것**: `req-landing.md` §11 Performance Constraints 에 **전송 예산 한 줄**을 넣는다 — 현재 §11 에는 수치 예산이 없다. 그리고 fallback 글꼴의 메트릭 오버라이드(`size-adjust`·`ascent-override`)를 주어 swap 시점의 이동을 0 으로 유지한다(현재 CLS 는 0.0000 이므로 **악화시키지 않는 것이 조건**이다).

---

## 4. 단위 4 — 타이포에 뷰포트 축을 준다

**측정**: 랜딩 390px 의 보이는 텍스트 46 개 중 **35 개(76%)가 16px 미만**이고 그중 22 개가 13px 다. 뷰포트에 따라 값이 바뀌는 타이포 토큰은 **0 개** — 데스크톱 타입 스케일이 그대로 모바일에 나간다.

**할 일**: `--shell-gutter` 가 이미 보여 준 패턴 — **하나의 토큰을 미디어 쿼리로 단 지어 주고 소비처는 한 곳** — 을 타이포에 적용한다. `src/app/globals.css` 는 **Ask-First** 이고 `@mirror-*` 구간은 `docs/design/ds/colors_and_type.css` 의 사본이므로 **설계 정의를 먼저 고치고 다시 베낀다**(theme cut 규약).

**판정 기준**: 본문·제목·버튼 라벨을 먼저 올리고, 보조 정보(태그·메타)는 대비와 함께 재판정한다. 모두 16px 로 올리면 밀도가 나빠지고 단위 6 과 충돌한다.

**게이트**: `tests/unit/design-tokens-dark-parity.test.ts` · `scripts/qa/check-design-token-parity.mjs`. **새 이탈은 쓰기 전에 `decision-register.md` 에 등재한다.**

---

## 5. 단위 5 — 누름 피드백과 모션

**측정**: `:hover` 규칙 **39 개** 대 `:active` 규칙 **5 개**. Tailwind preflight 가 `-webkit-tap-highlight-color` 를 `html` 에 선언해 브라우저 기본 탭 피드백이 꺼져 있고, **pointerdown 직후 DOM 변화가 0** 이다(첫 변화까지 124ms). 모바일에는 hover 가 없으므로 `:active` 가 **유일한 즉시 피드백**이다.

**할 일**: hover 로 표현되는 모든 어포던스에 대응하는 `:active` 를 준다. 값은 `design.md` §4.8 의 어휘 안에서 — **새 값을 발명하지 않는다.** `touch-action: manipulation` 을 인터랙티브 원소에 준다(현재 0 건). `overscroll-behavior` 를 문서 루트에 준다(현재 0 건).

**reduced-motion**: 애니메이션 원소가 일반 25 개에서 `reduce` 에서 **22 개**로만 준다. 선언된 모든 transition/animation 을 census 해 처분을 표로 남긴다 — **전부 0 으로 만드는 것이 답이 아니다.** 상태 변화를 알리는 최소 전이는 남긴다. `landing-grid-card.module.css` 의 `.root.reducedMotion …` 클래스가 이미 stagger 를 0ms 로 만들므로 **미디어 블록만 읽고 판정하지 않는다.**

**`.motionStageLate` 를 되살린다.** CSS 는 40/100/160ms 3 단 사다리를 정의하고 `design.md:374` 가 staged stagger 를 요구하는데 meta 가 Middle 로 배정돼 Late 가 비어 있다. `ExpandedMetaRow`(`landing-grid-card.tsx:711`)를 `styles.motionStageLate` 로 바꾼다 — **한 단어**다. DOM 순서(preview → answers → meta)가 단계 순서와 정확히 일치한다.

---

## 6. 단위 6 — 랜딩 밀도: 썸네일만 조정 (확정)

**사용자 결정: 중간안.** 1 열을 유지하고 **썸네일 16:6 → 16:4**, **부제에 모바일 clamp 도입**. 목표 약 3.0 화면(현재 3.76). **2 열 그리드는 배제한다** — 좁은 폭을 다시 가르는 것이 시각 균형과 정보 밀도 양쪽에 불리하다는 사용자 판단이다.

**주의**: `landing-grid-card.tsx:379,408` 이 모바일 clamp 를 **의도적으로 껐고** `req-landing.md` §6.6 과 12 locale E2E 가 그 값을 붙들고 있다(`tests/e2e/grid-smoke.spec.ts:487,1196`). 계약 개정과 12 locale 재검증이 동반된다.

**텍스트 200% 확대 오버플로는 밀도와 무관하게 먼저 고친다** — 390px 에서 태그 chip 이 뷰포트를 32px 넘는다(WCAG 1.4.4 실패).

---

## 7. 단위 7 — 결과 URL 과 동적 OG (확정)

**사용자 결정: 라우트와 OG 까지 넣는다.**

**측정**: 제출 후에도 URL 이 `/en/test/qmbti` 그대로이고 history 항목이 늘지 않는다. 새로고침하면 Q8 + Submit 로 되돌아간다. `grep -rn "'/result\|resultUrl\|base64\|btoa\|atob" src` → **0 건**. 도메인 층(`buildTypeSegment`·`parseTypeSegment`·`ResultPayload`)은 이미 있고 없는 것은 **라우트와 인코딩 한 층**이다.

**할 일**: `req-test.md` §5.1 의 Result URL 을 구현한다. 그 절의 경로 표기는 **locale-free route 표기**이고 실제 URL 은 `/{locale}/result/...` 임을 문서에 한 줄 명시한다(현재 §6.1 은 `/[locale]/test/error` 로 쓰고 §5.1 은 `/result/...` 로 써서 표기가 갈린다). 그리고 동적 OG 카드를 붙인다 — 현재 전 라우트가 같은 `<title>ViveTest</title>` 와 `description="Reset baseline placeholder"` 를 내보내고 OG 태그가 0 이다.

**Phase 9 와의 경계**: 결과 **내용** 스키마(`derived_type`·`axis_chart`·`type_desc`)는 Phase 9 소유다(`req-test.md:94`·`:74`). 이 단위는 **주소와 공유 표면**만 만들고 내용은 현행 placeholder 를 그대로 싣는다. 경계를 `docs/plans/2026-05-17-result-pipeline-todos.md` 에 한 줄로 적어 Phase 9 세션이 이어받게 한다.

---

## 8. 단위 8 — 표면별 나머지

| 표면 | 할 일 |
|:---|:---|
| **테스트 플로우** | ⑴ **문맥 전환** — 결과 화면에 `Progress 100%` 와 타이머 `00:00` 이 남는다. 진행 표시는 문항에서만 ⑵ Q7·Q8 의 자리표시자(`Q_placeholder_qmbti_7`·`Option A`·`Option B`)를 내용으로 채운다 ⑶ **sticky CTA 는 재기 전에 도입하지 않는다** — 문항 화면은 이미 1 화면에 들어온다 |
| **저장소 차단 크래시 (blocker)** | iOS 「모든 쿠키 차단」에서 「Accept all and start」 탭이 앱을 `html#__next_error__` 로 떨어뜨린다(`lang=""` · 테마 없음 · 버튼 69×32 · 영어 고정). `src/features/test/storage/**` 의 쓰기를 전부 try/catch 로 감싸고, 저장 실패를 **기능 실패가 아니라 저하된 모드**로 처리한다(회차는 메모리에서 계속된다) |
| **Next 내장 오류 폴백 (blocker)** | `src/app/**` 에 `error.tsx`·`global-error.tsx` 가 0 건이라 클라이언트 예외 하나가 화면 전체를 Next 의 영어·무테마·32px 화면으로 대체한다. 제품 오류 경계를 만든다 — locale·테마·44px 타깃·복귀 경로를 갖춘 것 |
| **세그먼트 404 (blocker)** | `/en/test/UNKNOWN` 의 서버 HTML body 에 **보이는 텍스트가 0** 이다(최상위 404 는 정상 렌더). `[locale]` 아래 `not-found.tsx` 가 서버에서 본문을 내보내게 한다 |
| **로케일 별칭 (blocker 합류)** | `/ko`·`/zh`·`/zh-Hans`·`/en-US`·`/pt-BR`·`/KR`·`/jp` 가 전부 404 다. **`html lang` 이 BCP 47 이 아닌 것과 같은 원인**이므로 별칭 표 하나로 함께 닫는다 — `src/config/site.ts` 의 `localeMetadata` 에 `htmlLang` 을 더하고 proxy 가 같은 표로 진입 별칭을 canonical 세그먼트로 redirect 한다. **이 단위는 step 2 의 라우팅 계약 개정과 묶인다** |
| **히스토리** | **항목을 렌더하는 코드가 없다**. 테스트를 완주해도 비어 있고 본문에 디버그 문자열 `Locale: en` 이 있다. 표면을 처음부터 만든다 — IA 자유도가 가장 큰 곳이다 |
| **블로그 목록·상세** | 카드 어포던스를 test 카드와 시각적으로 구분한다(같아 보이는 카드가 하나는 시트를 열고 하나는 이동한다). 상세 본문 조판에 단위 4 의 타입 스케일을 먼저 적용하고 줄 길이를 390px 에서 관행(45~75자)과 대조한다 |
| **GNB** | ⑴ **포커스 트랩을 더한다**(Tab 20 회 중 5 회 유출) ⑵ **`h-screen max-h-screen` 두 유틸리티를 지운다** — Tailwind emit 순서상 `.h-screen`(158행)이 `.[height:100dvh]`(155행)을 이겨 iOS 에서 설정 블록 67px 이 가시 영역 밖으로 나간다 ⑶ 바깥 닫기 판정을 카드 시트와 같은 `pointerup` 방식으로 통일 ⑷ 로고 링크 68×24 → 44px |
| **에러 · 404** | `/test/error` 제목이 12 locale 전부 하드코딩 한국어다. 메시지 키로 옮기고 복구 CTA 를 최소 하나 둔다. `?variant=` 반사는 **XSS 가 아니지만**(React 가 이스케이프한다) registry 멤버십을 확인해 임의 문자열이 h1 에 오르지 않게 한다 |
| **회전** | 세로→가로 회전이 펼친 카드를 파괴한다. 결정 2 로 부수적으로 해소되므로 **E2E 로 고정**한다 — 두 방향 모두에서 시트가 살아남는다 |

---

## 9. 단위 9 — baseline 재생성 (단일 승인 단계)

**모든 시각 변경을 끝낸 뒤 한 번에 한다.** 순서가 고정돼 있다.

1. `tests/e2e/theme-matrix-manifest.json` 을 새 케이스 집합으로(**Ask-First**)
2. `scripts/qa/check-phase11-telemetry-contracts.mjs` 의 폐쇄 검사를 그에 맞게(**Ask-First**)
3. **사용자 승인을 받고** `npm run qa:visual:full`
4. `tests/e2e/theme-matrix-baseline-provenance.md` 에 provenance 기록
5. `npm run test:e2e:gate` 3 회 연속 초록 확인

**함께 넣을 것**: 시각 회귀망 170 장이 전부 **한 가지 동의 상태**(OPTED_IN)에서 찍혔다 — 첫 방문자가 보는 UNKNOWN 화면에 회귀 픽셀이 0 장이다. 동의 시트가 새 첫 화면이 되므로 **UNKNOWN 상태를 manifest 축에 넣는다.** 그리고 `/{locale}/blog/{variant}` · `/{locale}/test/error` · 404 두 표면에 baseline 이 0 장이다.

**없는 baseline 은 생성되지 않고 실패로 남는다**(`tests/e2e/helpers/local-snapshot.ts:21-44`) — BQ-07 마감이 세운 그 가드를 되돌리지 않는다.

---

## 10. 완료 조건

- [ ] §0 의 지켜야 할 것 다섯이 전부 유지됐다(대비·12 locale 오버플로 0·GNB 드로어·문항 화면·`--tap-min`).
- [ ] 모바일 카드 확장이 바텀시트이고, 닫기 네 경로·포커스 트랩·배경 잠금·뒤로가기 닫기가 전부 동작한다.
- [ ] 동의 UI 가 **비모달** 바텀시트이고 뒤에서 카탈로그가 스크롤된다. instruction 의 모달 시트는 그대로다.
- [ ] 두 시트가 동시에 DOM 에 존재하는 프레임이 **0** 임을 E2E 가 고정한다.
- [ ] 동의를 드로어에서 되돌릴 수 있다.
- [ ] 폰트가 로케일별 subset + preload 이고, CLS 가 **악화되지 않았다**(현재 0.0000).
- [ ] 타이포에 뷰포트 축이 생겼고 토큰 패리티가 초록이다.
- [ ] `:active` 피드백이 hover 어포던스와 짝을 이루고, `touch-action: manipulation` 과 `overscroll-behavior` 가 들어갔다.
- [ ] reduced-motion 처분표가 문서에 있고 `.motionStageLate` 가 되살아났다.
- [ ] 텍스트 200% 확대에서 390px 오버플로가 0 이다.
- [ ] 랜딩이 약 3.0 화면이다(썸네일 16:4 + 모바일 clamp).
- [ ] 결과 URL 과 동적 OG 가 동작하고 Phase 9 경계가 문서에 있다.
- [ ] 저장소 차단·Next 폴백·세그먼트 404·로케일 별칭 네 blocker 가 닫혔다.
- [ ] 히스토리 표면이 항목을 렌더한다. 디버그 문자열이 없다.
- [ ] 회전 두 방향에서 시트가 살아남는 것을 E2E 가 고정한다.
- [ ] baseline 재생성이 §9 의 5 단계를 그대로 밟았고 provenance 가 기록됐다.
- [ ] `docs/decision-register.md` 에 변경 이력. 함정 원장 등재 또는 등재 불요 판정 한 줄.
- [ ] 이 문서를 `docs/done/` 으로 옮겼다(같은 커밋).

## 11. 이 단계에서 하지 않는 것 (do not)

- **§0 의 다섯을 다시 만들지 않는다** — 특히 GNB 모바일 드로어.
- **2 열 그리드를 만들지 않는다** — 사용자가 배제했다.
- **상시 하단 탭 바를 만들지 않는다** — `no-persistent-primary-nav-on-mobile` 행은 기각됐다.
- **동의를 모달 시트로 만들지 않는다** — 랜딩에서는 비모달이다.
- **밀도(§6)와 확장 모델(§1)을 한 커밋에 묶지 않는다** — 직교하는 축이고, 묶으면 baseline diff 의 원인을 가를 수 없다.
- **`qa:visual:full` 을 승인 없이 치지 않는다.**
- **재기 전에 sticky CTA 를 도입하지 않는다.**
- **결과 **내용** 스키마를 만들지 않는다** — Phase 9 소유다. 주소와 공유 표면까지다.
- **유령 GNB 를 View Transition 으로 바꾸지 않는다** — 별도 단위로 넘겼다.

## 12. 실행 프롬프트

**「`docs/plans/2026-09-11-mobile-refactor-step3-surfaces.md` 를 그대로 실행하라. 선행 확인부터 하고 §1 부터 §9 까지 순서대로 진행하라. 모든 제품 결정은 분석 문서 §15 에 확정돼 있으니 다시 묻지 마라. §6(밀도)과 §1(시트)을 한 커밋에 묶지 말고, §9 의 baseline 재생성은 모든 시각 변경이 끝난 뒤 승인을 받아 한 번에 하라.」**
