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

모바일의 인터랙션·UX·디자인을 전면 리팩터하되 데스크톱·태블릿과의 호환성, 디자인 일관성, 디자인 시스템 호환성을 유지한다. 배경과 근거는 `docs/plans/2026-09-11-mobile-refactor-analysis.md` 가 갖는다 — **착수 전에 전문을 읽는다.**

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
2. **12 locale × 390px 가로 오버플로 0** — 밀도를 올리거나 clamp 를 도입하면 12 locale 전부에서 다시 잰다.
3. **GNB 모바일 드로어** — `role="dialog"` · `aria-modal` · `aria-label` · 여는 순간 Close 로 포커스 이동 · `body` 스크롤 잠금 · Escape · backdrop · safe-area 하단 32px · 타깃 전부 ≥44px. **다시 만들지 않는다 — 포커스 트랩 하나만 더한다**(실측: Tab 20 회 중 5 회가 드로어 밖 랜딩 카드로 샌다).
4. **테스트 문항 화면** — 이미 한 화면 한 문항, 오버플로 0, 답변 타깃 316×48~70px.
5. **`--tap-min: 44px` 토큰** — 이미 있고 GNB 가 쓴다. 새 토큰을 만들지 말고 이것을 넓게 쓴다.

---

## 0-1. 작업 지시서는 점수표다

이 문서는 **순서와 경계**를 정하고, 무엇을 고칠지는 `docs/plans/2026-09-11-mobile-refactor-maps/scorecard.md` 가 217 행으로 갖는다(blocker 13 · major 96 · minor 108). 이 단계가 가져가는 것은 **표면에 걸린 행 전부** — 즉 계약 개정이 선행 조건이 아닌 나머지 전량이다. 아래 §2~§7 의 각 단위는 그 행들을 묶는 틀이며, 착수할 때 점수표에서 해당 표면의 행을 필터해 순서대로 처리한다.

**세 가지를 지킨다.** ⑴ `정정` 열에 ✓ 가 있으면 렌즈 문서의 「검증이 붙인 정정」을 먼저 읽는다 — `basis` 를 그대로 믿으면 안 된다. ⑵ `[비평]` 행은 적대적 검증을 거치지 않았으니 **착수 전에 재현**한다. ⑶ 반증된 62 건 표를 먼저 본다 — 같은 주장이 다시 떠오르면 이미 무너진 것일 수 있다.

## 1. 단위 1 — 사용자 결정 하나를 먼저 받는다

**결정해야 할 것: 모바일 카드 확장을 제자리 확장으로 둘 것인가, 바텀시트로 옮길 것인가.**

이 한 결정이 `req-landing.md` §8.5 의 32 개 조항 중 12 개 이상의 존폐를 한꺼번에 정하고, 삭제되는 런타임 약 500 행의 운명을 정한다. 분석의 추천은 **바텀시트**이고 근거 넷은 `docs/plans/2026-09-11-mobile-refactor-analysis.md` §11 에 있다 — 요약하면 ⑴ 삭제되는 복잡도가 가장 크고 그 복잡도는 전부 in-flow 확장이 만든 것이다 ⑵ 접근성 결함 다섯이 패턴 교체 한 건으로 닫힌다 ⑶ 데스크톱 계약을 건드리지 않는다 ⑷ 탭 수를 늘리지 않는다.

**결정이 오기 전에 할 수 있는 것은 §2~§6 이다.** 그것들을 먼저 하고 §7 에서 이 결정을 쓴다.

---

## 2. 단위 2 — 타이포 스케일에 뷰포트 축을 준다

**측정:** 랜딩 390px 의 보이는 텍스트 46 개 중 **35 개(76%)가 16px 미만**이고 그중 22 개가 13px 다. **토큰 체계에 뷰포트 축이 없어서** 데스크톱 타입 스케일이 그대로 모바일에 나간다(`:root` 커스텀 프로퍼티 105 개 중 미디어 쿼리로 값이 바뀌는 타이포 토큰 0 개).

**할 일:** `--shell-gutter` 가 이미 보여 준 패턴 — **하나의 토큰을 미디어 쿼리로 단 지어 주고 소비처는 한 곳** — 을 타이포에 적용한다. `src/app/globals.css` 는 **Ask-First** 이고 `@mirror-*` 구간은 `docs/design/ds/colors_and_type.css` 의 사본이므로 **설계 정의를 먼저 고치고 다시 베낀다**(theme cut 규약, `AGENTS.md` §1).

**대상 판정 기준:** 13px 은 보조 정보(태그·메타)에 쓰이고 있다. 모바일에서 본문 하한 16px 을 지키되 보조 정보까지 16px 로 올리면 밀도가 나빠진다 — **본문·제목·버튼 라벨을 먼저 올리고, 보조 정보는 대비와 함께 재판정한다.**

**게이트:** `tests/unit/design-tokens-dark-parity.test.ts`(미러 일치 · 고아 토큰 금지 · 미선언 참조 금지) · `scripts/qa/check-design-token-parity.mjs`(design.md §5 ↔ `ds/colors_and_type.css` ↔ allowlist). **새 이탈은 쓰기 전에 `decision-register.md` 에 등재한다.**

---

## 3. 단위 3 — 누름 피드백을 만든다

**측정:** `:hover` 규칙 **39 개** 대 `:active` 규칙 **5 개**. Tailwind preflight 가 `-webkit-tap-highlight-color` 를 `html` 에 선언해 브라우저 기본 탭 피드백이 꺼져 있다. **pointerdown 직후 DOM 변화가 없고**(측정: `null`) 첫 변화까지 124ms 다.

모바일에는 hover 가 없으므로 `:active` 가 **유일한 즉시 피드백**이다. 그것이 없으면 사용자는 탭이 먹혔는지 알 수 없다.

**할 일:** hover 로 표현되는 모든 어포던스에 대응하는 `:active`(또는 `:active` 와 `:focus-visible` 의 공통 표현)를 준다. 기준은 design.md §4.8 Motion 의 어휘 안이다 — **새 값을 발명하지 말고 기존 토큰을 쓴다.** 그리고 `touch-action: manipulation` 을 인터랙티브 원소에 준다(현재 0 건).

---

## 4. 단위 4 — reduced-motion 을 실제로 지킨다

**측정:** 애니메이션이 붙은 원소가 일반 25 개, `prefers-reduced-motion: reduce` 에서 **22 개**. **3 개만 줄어든다.** reduced-motion 미디어 블록은 4 개뿐이다.

**할 일:** 선언된 모든 transition/animation 을 census 해 reduced-motion 하에서의 처분을 명시한다. **전부 0 으로 만드는 것이 답이 아니다** — WCAG 2.3.3 의 취지는 「인터랙션이 유발하는 모션」을 끄는 것이고, 상태 변화를 알리는 최소 전이는 남기는 편이 낫다. **각 항목마다 처분과 근거를 표로 남긴다.**

**주의:** `landing-grid-card.module.css` 의 `.root.reducedMotion …` 클래스가 이미 stagger 를 0ms·transform 을 none 으로 만든다(step 2 의 R3 기록). 미디어 블록만 읽고 판정하면 이미 처리된 것을 다시 처리한다.

---

## 5. 단위 5 — 랜딩 밀도 (확장 모델과 **분리된 축**)

**측정:** 390px 3.76 화면 · 320px 3.93 · 가로 844×390 **4.21** · 텍스트 200% 확대 시 4.84 화면 **그리고 태그 chip 이 뷰포트를 32px 넘어간다**(WCAG 1.4.4 실패). 데스크톱은 1.42 화면 — **모바일이 2.6 배를 스크롤한다.**

**이 축은 §7 의 확장 모델 결정과 직교한다. 한 단위로 묶지 말 것.**

**할 일:** 썸네일 비율(`aspect-[16/6]`)과 카드 높이(255px)를 모바일에서 낮추고, 모바일 subtitle clamp 를 도입한다. **다만 `landing-grid-card.tsx:379,408` 이 모바일 clamp 를 의도적으로 껐고 §6.6 계약과 12 locale E2E 가 그 값을 붙들고 있다** — 계약 개정과 12 locale 재검증이 동반된다.

**200% 확대 오버플로는 밀도와 무관하게 먼저 고친다** — 규범 위반이기 때문이다.

---

## 6. 단위 6 — 표면별 작업 (랜딩 확장 모델 제외)

| 표면 | 할 일 |
|:---|:---|
| **테스트 플로우** | ⑴ **문맥 전환** — 결과 화면에 `Progress 100%` 와 타이머 `00:00` 이 남는다. 진행 표시는 문항에서만. ⑵ Q7·Q8 의 자리표시자(`Q_placeholder_qmbti_7`·`Option A`·`Option B`)를 내용으로 채운다 ⑶ 하단 CTA 를 sticky 로 둘지 판정 — 현재 1 화면에 들어오므로 **필요 없을 수 있다. 재기 전에 바꾸지 않는다** |
| **결과 화면** | **URL 이 없다** — 제출 후에도 `/en/test/qmbti` 그대로다. `req-test.md:769-809` 의 Result URL 은 **구현이 0 건**이라(`grep -rn "'/result\|resultUrl\|base64\|btoa\|atob" src` → 0) 지금 정하는 것이 가장 자유롭다. 도메인 층(`buildTypeSegment`/`parseTypeSegment`/`ResultPayload`)은 이미 있고 없는 것은 라우트와 인코딩 한 층뿐이다. **공유는 이 제품의 핵심 행동이고 공유할 주소가 없다.** Phase 9 와의 경계는 `docs/plans/2026-05-17-result-pipeline-todos.md` 가 갖는다 |
| **히스토리** | **항목을 렌더하는 코드가 없다**(`src/app/[locale]/history/page.tsx`, 파일 자신의 주석이 그렇게 적는다). 테스트를 완료해도 비어 있다. 프로덕션 본문에 디버그 문자열 `Locale: en` 이 있다. **표면을 처음부터 만든다 — IA 자유도가 가장 큰 곳이다** |
| **블로그 목록** | 1.13 화면으로 형상은 건강. 카드 어포던스를 test 카드와 시각적으로 구분한다 — 지금은 같아 보이는 카드가 하나는 확장(`<button>`)하고 하나는 이동(`<a>`)한다 |
| **블로그 상세** | 본문 조판 — 13px 3 개. 단위 2 의 타입 스케일이 여기에 먼저 적용된다. 줄 길이를 390px 폭에서 재고 관행(45~75자)과 대조한다 |
| **GNB** | ⑴ 바깥 닫기 판정을 카드 backdrop 과 같은 `pointerup` 방식으로 통일(분석 §9-14) ⑵ 로고 링크 68×24 → 타깃 44px ⑶ 동의 배너 세 버튼의 인접 간격 0px |
| **에러 · 404** | 에러 제목이 **12 locale 전부 하드코딩 한국어**다(`src/app/[locale]/test/error/page.tsx:30-31`, `routing-smoke.spec.ts:118-127` 이 그 문자열을 고정한다). 복구 경로를 준다 |
| **동의 배너** | 회피 로직 91 행이 데스크톱 전제(hover 로 소멸하는 일시 상태) 위에 있고 모바일의 무한정 OPEN 에 걸려 있다. §8.4 `:609` 가 「교차하지 않는 동안 숨기기」를 금지하므로 **없애는 것이 아니라 다른 형태로 옮긴다** |

---

## 7. 단위 7 — 확장 모델 (§1 의 결정을 받은 뒤)

**바텀시트를 택한 경우:**

- 카드 자리는 그대로, 하단에서 시트가 올라온다. `role="dialog" aria-modal="true"` · 포커스 트랩 · 열 때 시트 제목으로 포커스 이동 · 닫기 4 경로(X 44×44 · backdrop · 스와이프 다운 · Escape) · **OPEN 동안 배경 스크롤 락**.
- **삭제 가능:** `use-mobile-restore-polling.ts`(120) · `mobile-card-lifecycle-dom.ts`(48) · `use-mobile-transient-shell.ts`(57) · `use-mobile-backdrop-gesture.ts`(100, 시트 제스처로 대체) · `mobile-lifecycle.ts`·`use-mobile-card-lifecycle.ts` 대폭 축소 · `landing-grid-card.module.css` 의 transient/mobile 키프레임 구간.
- **계약:** `req-landing.md` §8.5 전면 재작성 · §9.1 포커스 계약 추가 · §13.8 Return Restoration 재검토 · `design.md` §7 에 sheet 패턴 추가.
- **재생성 baseline 4 장:** `theme-state-mobile-landing-test-expanded-{en,kr}-{light,dark}-mobile-chromium-darwin.png`.
- **재작성 E2E:** `tests/e2e/state-smoke.spec.ts:1003-1146` · `tests/e2e/grid-smoke.spec.ts:815-870`.

**제자리 확장을 유지한 경우 — 어느 쪽이든 반드시 고칠 것 넷:**

1. **ARIA 가 없다** — 트리거에 `aria-expanded`·`aria-controls` 가 없고 backdrop 은 role/label 없는 `div` 다. 확장이 보조기술에 아무 일도 아니다(WCAG 4.1.2).
2. **포커스가 트리거에 남는다** — 확장 내용으로도 닫기 버튼으로도 가지 않는다.
3. **스크림 뒤에서 배경이 스크롤된다** — `:641` 이 OPEN settled 에서 unlock 을 요구하고 구현이 그대로 따른다. 600px 스크롤하면 확장 카드가 화면 밖으로 나가고 스크림만 남는다. **모달이면 잠그고, 모달이 아니면 스크림을 없앤다 — 둘 중 하나를 고른다.**
4. **scrim 뒤의 카드 7 장이 접근성 트리에 남는다** — `inert` 를 tap 층에도 건다(분석 §9-5 의 HOVER_LOCK 통합이 이것을 부수적으로 닫는다).

---

## 8. 단위 8 — baseline 재생성 (단일 승인 단계)

**모든 시각 변경을 끝낸 뒤 한 번에 한다.** 순서가 고정돼 있다.

1. `tests/e2e/theme-matrix-manifest.json` 을 새 케이스 집합으로(**Ask-First**)
2. `scripts/qa/check-phase11-telemetry-contracts.mjs` 의 폐쇄 검사를 그에 맞게(**Ask-First**)
3. **사용자 승인을 받고** `npm run qa:visual:full`
4. `tests/e2e/theme-matrix-baseline-provenance.md` 에 provenance 기록
5. `npm run test:e2e:gate` 3 회 연속 초록 확인

**없는 baseline 은 생성되지 않고 실패로 남는다**(`tests/e2e/helpers/local-snapshot.ts:21-44`) — BQ-07 마감이 Playwright 기본값 `'missing'` 의 거짓 초록을 막아 두었다. 그 가드를 되돌리지 않는다.

---

## 9. 완료 조건

- [ ] §0 의 지켜야 할 것 다섯이 전부 유지됐다(대비·12 locale 오버플로 0·GNB 드로어·문항 화면·`--tap-min`).
- [ ] 타이포에 뷰포트 축이 생겼고 `design.md` §5 ↔ `ds/colors_and_type.css` 패리티가 초록이다.
- [ ] `:active` 피드백이 hover 어포던스와 짝을 이룬다.
- [ ] reduced-motion 처분표가 문서에 있고, 각 항목에 근거가 붙어 있다.
- [ ] 텍스트 200% 확대에서 390px 오버플로가 0 이다.
- [ ] 히스토리 표면이 항목을 렌더한다. 디버그 문자열이 없다.
- [ ] 결과 화면에 공유 가능한 URL 이 있거나, 없는 이유가 Phase 9 경계로 문서에 적혀 있다.
- [ ] 확장 모델 결정이 실행됐고 §7 의 「어느 쪽이든 고칠 것 넷」이 전부 닫혔다.
- [ ] baseline 재생성이 §8 의 5 단계를 그대로 밟았고 provenance 가 기록됐다.
- [ ] `docs/decision-register.md` 에 변경 이력. 함정 원장 등재 또는 등재 불요 판정 한 줄.
- [ ] 이 문서를 `docs/done/` 으로 옮겼다(같은 커밋).

## 10. 이 단계에서 하지 않는 것 (do not)

- **§0 의 다섯을 다시 만들지 않는다** — 특히 GNB 모바일 드로어.
- **밀도(§5)와 확장 모델(§7)을 한 단위로 묶지 않는다** — 직교하는 축이고, 묶으면 baseline diff 의 원인을 가를 수 없다.
- **`qa:visual:full` 을 승인 없이 치지 않는다.**
- **step 1 의 지문을 지우지 않는다** — 이 단계에서는 지문이 바뀌는 것이 정상이고, 바뀐 해시를 커밋하되 무엇이 왜 바뀌었는지 적는다.
- **재기 전에 sticky CTA 를 도입하지 않는다** — 테스트 문항 화면은 이미 1 화면에 들어온다.

## 11. 실행 프롬프트

**「`docs/plans/2026-09-11-mobile-refactor-step3-surfaces.md` 를 그대로 실행하라. 선행 확인부터 하고, §1 의 확장 모델 결정을 사용자에게 물어 받은 뒤 §2~§6 을 먼저 진행하라. §5(밀도)와 §7(확장 모델)을 한 커밋에 묶지 말고, §8 의 baseline 재생성은 모든 시각 변경이 끝난 뒤 승인을 받아 한 번에 하라.」**
