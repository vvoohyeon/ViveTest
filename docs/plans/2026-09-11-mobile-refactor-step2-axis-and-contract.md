# 모바일 전면 리팩터 — step 2: 축 분리와 계약 2 분할

**Task mode:** Implementation. **Ask-First·SSOT 전면 해당** — `docs/req-landing.md`·`docs/req-test.md`·`scripts/qa/*.mjs`·`docs/blocker-traceability.json` 을 모두 건드린다.

**선행 확인 (착수 전에 반드시):**

```bash
cd "$(git rev-parse --show-toplevel)" && ls docs/done/2026-09-11-mobile-refactor-step1-seam.md && git log --oneline -8 && npm test
```

`docs/done/` 에 step 1 문서가 있어야 하고, `npm test` 가 초록이어야 하며, `src/features/landing/grid/` 에 `landing-card-contract.ts`·`interaction-selectors.ts`·`use-desktop-card-close-controller.ts`·`use-hover-scroll-hold.ts` 가 존재해야 한다. **하나라도 없으면 step 1 이 착지하지 않은 것이므로 여기서 멈춘다.**

**시각·인터랙션의 정본은 명세다.** 이 단계가 계약 문장을 다시 쓸 때 그 문장이 서술할 대상은 `docs/plans/2026-09-14-mobile-refactor-design-spec.md` 가 정한 것이다 — 규칙 여덟과 표면별 확정 명세를 **착수 전에 읽는다**. 계약 문장과 명세가 어긋나면 명세가 이긴다.

**이 단계가 끝나면:** 폭·입력·키보드 세 축이 코드와 문서 양쪽에서 갈라져 있고, hover 없는 기기는 폭과 무관하게 터치 생명주기를 쓰며, 요구사항 문서가 「동작 계약」과 「인터랙션 계약」 둘로 나뉘어 있다. **화면에 보이는 것은 터치 태블릿을 빼면 달라지지 않는다** — 시각 재설계는 step 3 이다.

---

## 공유 블록 — 세 문서가 같이 갖는 것

### 최상위 목표

모바일의 인터랙션·UX·디자인을 전면 리팩터하되 데스크톱·태블릿과의 호환성, 디자인 일관성, 디자인 시스템 호환성을 유지한다. 배경과 근거는 `docs/plans/2026-09-11-mobile-refactor-analysis.md` 가 갖는다 — **착수 전에 그 문서의 §1·§2·§3·§5·§6 을 읽는다.**

### 사용자 결정 일곱 (확정 — 다시 묻지 않는다)

1. 계약 개정 전면 허용 · 2. 터치 태블릿은 입력 방식 기준으로 통일 · 3. 전 표면 동시 · 4. 0단계로 구조를 먼저 가른다 · 5. IA 재설계 허용 · 6. 요구사항 문서를 동작/인터랙션으로 분리 · 7. 서명 인터랙션은 3분류로 제시.

### 불변 경계 (세 단계 전부)

- **워크스페이스는 `git clone` 이다. 워크트리를 만들지 않는다**(`AGENTS.md` §4).
- **`qa:visual:full`(baseline `--update`)은 사람 승인 없이 실행하지 않는다.**
- `.env`·비밀값은 읽지도 출력하지도 커밋하지도 않는다.
- **게이트를 약화시켜 통과시키지 않는다.** 테스트 제목만 남기고 단언을 비우는 것이 이 단계에서 가장 위험한 지름길이다 — §6 참조.

### 기본 게이트 (`AGENTS.md` §5, 순서 고정)

```bash
cd "$(git rev-parse --show-toplevel)" && npm run lint && npm run typecheck && npm test && npm run build
```

---

## 1. 단위 0 — 게이트에 터치를 가르친다 (다른 무엇보다 먼저)

**저장소 전체에서 `hasTouch` · `isMobile` · `(pointer: coarse)` · `navigator.maxTouchPoints` 를 쓰는 테스트가 0 건이다.** 현재 390px 테스트가 tap 모드에 도달하는 것은 **폭 게이트 덕분이지 입력 방식 덕분이 아니다.**

그래서 §2 를 먼저 하면 hover 가능한 Playwright chromium 의 390px 뷰포트가 hover 경로로 떨어지고, 모바일 e2e 31 케이스가 「계약 위반」이 아니라 「테스트가 터치를 흉내 내지 않아서」 붉어진다. **그 상태에서는 붉음의 원인을 가려낼 수 없다.**

**할 일:** 모바일 폭을 쓰는 모든 e2e 케이스에 터치 컨텍스트를 부여한다 — Playwright `test.use({hasTouch: true, isMobile: true})` 또는 `(pointer: coarse)` / `(hover: none)` 의 `matchMedia` 스텁. 대상은 `grid-smoke`(390 사용 6 + `W12_MOBILE_VIEWPORTS` 3) · `state-smoke`(4) · `gnb-smoke`(10) · `transition-telemetry-smoke`(8) · `a11y-smoke`(3 + 3 폭 루프)이다.

**합격 판정:** 이 단위는 **제품 코드를 한 줄도 바꾸지 않는다.** 터치 컨텍스트를 부여한 뒤에도 31 케이스가 전부 초록이어야 한다 — 붉어지면 그것은 이 단위가 발견한 실제 결함이고, §2 로 넘어가기 전에 원인을 적는다.

**함께 신설할 것 — 터치 타깃 가드.** 저장소에 44px/24px 하한을 단언하는 검사가 하나도 없고 `@axe-core/playwright` 는 `target-size`(WCAG 2.5.8)를 기본 규칙에서 돌리지 않는다. `a11y-smoke` 에 **전 표면의 보이는 인터랙티브 원소를 순회해 `min(width,height)` 와 인접 간격을 단언하는 케이스**를 넣는다. 기준선은 분석 세션의 실측이다 — 랜딩 13 개 중 44px 미만 1 개(로고 링크 68×24), 메뉴 열림 30 개 중 1 개(같은 것), 동의 배너 세 버튼의 인접 간격 0px. **먼저 붉히고 고친다.**

---

## 2. 단위 1 — 축을 셋으로 가른다

### 2-1. 새 어휘 (이 이름을 그대로 쓴다)

| 축 | 이름 | 무엇이 정하는가 | 쓰는 곳 |
|:---|:---|:---|:---|
| 공간 | `LayoutBreakpoint` (`mobile`/`tablet`/`desktop`) | **뷰포트 폭** | 열 수 · 좌우 여백 · 썸네일 비율 · clamp · 타입 스케일 |
| 입력 | `InputProfile` (`hover-capable`/`touch`) | **`(hover: hover) and (pointer: fine)`** | 확장 생명주기 · 닫기 어포던스 · hover intent · 설정 hover 열기 |
| 키보드 | `KeyboardAffordance` | **둘 중 어느 축에도 속하지 않는다** | 순차 확장 · 포커스 처분 · Escape |

**세 번째 축이 이 단계의 숨은 핵심이다.** `req-landing.md:472` §7.6-a 는 「Desktop/Tablet 카드 키보드 탐색은 순차 규칙을 따른다. Mobile lifecycle 은 본 override 대상이 아니다」이고, 컨트롤러는 모바일 분기에서 Escape·blur·키보드 확장을 죽인다(`use-landing-interaction-controller.ts:354-358`·`:431`·`:455`). **hover 없는 768px 이상 기기 — 외장 키보드를 붙인 아이패드가 정확히 그것이다 — 를 터치 생명주기로 옮기면 그 기기는 카드를 키보드로 확장할 수단을 잃는다.** WCAG 2.1.1 위반이다.

**그래서 순서가 고정된다: §7.6-a 의 동작 부분(「키보드로 도달 가능한 카드는 키보드로 확장·진입할 수 있고, 순회 순서는 결정적이며, unavailable 은 건너뛴다」)을 폭·입력과 무관한 전 표면 규칙으로 먼저 승격시킨 뒤에 축을 옮긴다.** 승격 없이 축만 옮기면 회귀가 난다.

### 2-2. 입력 판정의 단일 정의처

`(hover: hover) and (pointer: fine)` 이 지금 **세 곳에 독립적으로** 적혀 있다 — `use-landing-interaction-controller.ts:207` · `src/features/gnb/hooks/use-gnb-capability.ts:17` · `src/features/landing/grid/landing-grid-card.module.css:92`. **JS 두 곳을 하나로 접는다.** CSS 사본은 JS 와 동기화할 수 없으므로 남기되, **같은 판정을 두 곳이 각자 적고 있다는 사실을 단위 테스트가 고정한다**(문자열 대조).

### 2-3. 재배선 대상과 분류

`isMobileViewport` 의 정의는 두 곳이다 — `use-landing-interaction-controller.ts:157` 과 `landing-grid-card.tsx:970`. **이 두 줄이 축을 옮기는 자리이고, 하류 분기 전부는 소비처다.** `landing-grid-card.tsx` 는 `useState`·`useEffect`·`useMemo`·`useCallback` 이 0 개이므로 상태를 갖지 않는다.

분기 전수 분류표는 `docs/plans/2026-09-11-mobile-refactor-maps/branches-card.md` §3 · `branches-controller.md` §A · `branches-rest.md` §2 가 갖는다. **각 분기를 옮기기 전에 그 표의 `semantics` 열을 확인한다** — `width` 로 분류된 것은 `LayoutBreakpoint` 에 남기고, `input` 으로 분류된 것만 `InputProfile` 로 옮긴다. **둘 다거나 불명(`unclear`)인 것은 옮기지 말고 목록으로 남겨 보고한다.**

### 2-4. 함께 접어야 하는 죽은 분기와 죽은 상수

- `use-hover-intent-controller.ts:318`·`:390`·`:483` 의 `interactionMode !== 'hover' || isMobileViewport` — **둘째 항은 오늘도 도달 불가고 축을 옮긴 뒤에도 도달 불가다.** 세 줄 모두 `interactionMode !== 'hover'` 한 항으로 접는다. 그대로 두면 의미가 중복된 채 갈라진 두 진실이 남는다.
- `src/features/gnb/behavior.ts:1` 의 `MOBILE_BREAKPOINT_MAX = 767` — 재수출될 뿐 **소비자 0** 인 죽은 상수. 제거한다.
- `src/features/test/instruction-overlay.tsx:26` 의 `max-[767px]:` — 어떤 가드도 보지 않는 리터럴. 새 축 어휘로 옮긴다.
- `max-[719px]:` ×7 — **어디에도 근거가 없는 고아 임계값.** 근거를 찾지 못하면 767 로 접거나 컨테이너 쿼리로 옮기고, 어느 쪽이든 `decision-register.md` 에 등재한다.

### 2-5. SSR 이 뒤집힌다 — 미리 대비한다

`req-landing.md:516` 은 「SSR 초기값은 Tap Mode, mount 후 동기화」다. 지금은 안전하다 — 생명주기가 **폭**에 걸려 있고 `INITIAL_VIEWPORT_WIDTH = 1280`(`landing-catalog-grid.tsx:28`)이라 첫 페인트가 데스크톱으로 고정되기 때문이다. **생명주기를 입력으로 옮기면 SSR 이 모든 기기에 터치 셸을 그리고 마운트 후 뒤집는다** — step 4(BQ-39)가 방금 없앤 모바일 하이드레이션 CLS 0.136 과 정확히 같은 모양이다.

**두 해법이 있고 둘 다 이미 이 저장소 안에 있다.**

- **⒜ CSS 로 가른다.** `@media (hover: hover)` 는 SSR 이후에도 서버 왕복 없이 판정되므로 **하이드레이션 문제가 아예 생기지 않는다.** `landing-grid-card.module.css:92` 가 이미 그 방식이고, 분석은 그 한 줄을 「결정 2 의 참조 구현」으로 지목한다.
- **⒝ 중립값이 틀릴 수 있는 구간에서만 첫 페인트를 미룬다.** step 4 가 컨테이너 쿼리 게이트로 쓴 방식(`docs/done/2026-09-10-step4-mobile-cls-and-card-thumbnails.md`).

**어느 쪽을 택할지는 프로토타입으로 정한다.** 두 판본을 만들어 CLS 와 LCP 를 짝지어 재고(step 4 가 9 회 짝지은 실행으로 판정했다) 그 숫자로 고른다. **측정 없이 고르지 않는다.**

---

## 3. 단위 2 — 요구사항 문서를 둘로 가른다

### 3-1. 가르는 선

| 남는 곳 — **동작 계약** | 옮기는 곳 — **인터랙션 계약** |
|:---|:---|
| 스코프 · 용어 · 우선순위 · 불변식 | 제스처와 그 판정(탭/hover/스와이프/키) |
| 라우팅 · locale · 404 | 모션의 시간·곡선·단계 |
| 정보 구조와 **공간** 규칙(열 수 · 여백 · clamp) | 생명주기의 위상과 전이 연출 |
| 상태 집합과 전이의 **결과** | 레이어·dim·스크림의 시각 규칙 |
| telemetry · 동의 · storage | 닫기 어포던스의 종류와 우선순위 |
| 에러·빈 상태·not-found 의 **결과** | 포커스의 **이동 연출**(도달 요건은 동작에 남는다) |
| 접근성 **요건**(도달 가능·이름·역할) | — |
| 인수 조건 · QA 매트릭스 | — |

**판정 한 줄: 「이 문장을 지키는 방법이 둘 이상 있는가?」** 있으면 인터랙션이고, 없으면(결과가 곧 규칙이면) 동작이다.

### 3-2. mixed 조항 — 문장을 쪼개는 법

`req-landing.md` §1–§7 에서 확인된 mixed 는 32 건이고 그중 8 건이 핵심이다. 전문과 분리안은 `docs/plans/2026-09-11-mobile-refactor-maps/contract-landing-1.md` §「mixed 분리 제안」에 있다. **대표 형태 하나만 여기 옮긴다.**

§6.7-2 `:339` 는 「`margin-top:auto` · `justify-content: space-between` · filler flex · 의사요소를 보정 수단으로 쓰지 말라」고 **수단을 금지**한다. 이 조항이 지키려던 결과는 「`needs_comp=false` 카드는 잉여 여백을 갖지 않는다」이다. **결과 기준으로 다시 쓰면 같은 보호를 유지하면서 표준 CSS 해법이 다시 후보가 된다.**

**이것이 이 단계의 개정 문법이다 — 조항을 지우지 않는다. 지키려던 것을 밝히고, 수단을 푼다.**

### 3-3. §8.5 는 전면 재작성 대상이다

`req-landing.md` §8.5 `Mobile Expanded (width<768)`(`:619-667`)의 32 개 조항은 전부 불변식이다(BQ-39 의 계약/조정값 2 계층이 §8.2·§8.3·§14.2 항목 13 에만 들어갔다). 그중 여섯 줄 — `:625` in-flow 유지 · `:626` y-anchor 편차 0 · `:637` 연속 전이 · `:641` 자동 보정 스크롤 금지 · `:650` 비-CTA 탭 no-op · `:652` 예외 불허 — 이 함께 작동해 **제자리 확장 이외의 모든 형태를 배제**하고, `:632` 의 닫기 화이트리스트는 Escape 와 스와이프를 금지해 **키보드 태블릿에서 WCAG 2.1.1 위반을 만든다.**

**§8.5 의 재작성은 step 3 의 IA 결정(제자리 확장이냐 시트냐)이 정해진 뒤에 한다.** 이 단계에서는 **`:632` 하나만 먼저 연다** — 닫기 경로에 `Escape` 를 더한다. 규범 위반이고 IA 결정과 무관하기 때문이다.

### 3-4. 문서 분리가 붉히는 것 — 같은 커밋에서 고친다

| 검사 | 무엇을 요구하는가 | 함께 할 일 |
|:---|:---|:---|
| `scripts/qa/check-variant-only-contracts.mjs:119-121` | **`docs/req-landing.md` 안에 `` `subtitle` `` · `4줄` · `재사용` 이라는 문자열이 존재할 것** | 세 문자열의 새 거처를 정하고 체커가 보는 경로를 바꾼다 |
| `tests/unit/contract-citations.test.ts` | `AGENTS.md` · `.claude/CLAUDE.md` · `docs/agent-guides/project-rules.md` · `docs/agent-guides/verification-commands.md` 의 §번호·경로 인용이 실재할 것 | 네 문서의 인용을 새 파일로 돌린다 |
| `scripts/qa/check-blocker-traceability.mjs` | §14.2 의 30 항목 ↔ `docs/blocker-traceability.json` 67 엔트리 양방향 폐쇄 | §14.2 를 어느 쪽 문서에 둘지 정하고 등록부 경로를 맞춘다 |
| `tests/unit/docs-lifecycle.test.ts` | 살아 있는 문서의 링크가 실재할 것 | 새 문서를 만들면서 링크를 같이 |
| `AGENTS.md` §2 Task Routing Table | 작업 유형 → SSOT 매핑 | 새 문서를 라우팅 표에 넣는다(**Ask-First**) |

---

## 4. 단위 3 — 축 이동이 붉히는 게이트

| 검사 | 무엇을 요구하는가 | 함께 할 일 |
|:---|:---|:---|
| `scripts/qa/check-phase7-state-contracts.mjs:73,77` | **리터럴 `viewportWidth < 768` · `hoverCapability ? 'hover' : 'tap'` · `matchMedia('(hover: hover) and (pointer: fine)')` 의 철자 존재** | 세 정규식을 새 판정 함수 이름으로 다시 쓴다. **이름만 남기고 단언을 비우지 않는다** |
| `tests/unit/landing-interaction-state.test.ts:22-51` | `isMobileViewport` → `preserve-mobile` 분류 | 새 축 어휘로 |
| `tests/unit/landing-interaction-controller-handlers.test.ts` | Mobile 분기 4 건 + `matchMedia` 스텁 | 스텁이 폭이 아니라 입력을 흉내 내도록 |
| `tests/unit/landing-interaction-dom.test.ts:34,99` | `data-card-viewport-tier="mobile"` 로 모바일 카드 판정 | 속성 이름을 축에 맞게(그러면 `theme-matrix`·`grid-smoke`·`state-smoke` 가 읽는 계약 표면이 바뀐다 — **속성 이름 변경은 별도 단위로 분리하고 baseline 영향을 먼저 확인한다**) |
| `tests/unit/gnb-behavior.test.ts:12-32` | hover-open 이 폭 AND capability | `>= 1024` 를 유지할지 한 줄 결정 — **hover 가능한 1,000px 창에서 지금 hover 열기가 꺼진다** |
| `tests/unit/gnb-keyboard-targets.test.ts:116,137` | mobile closed/open 대상 순서 | 새 축으로 |
| `tests/unit/landing-desktop-shell-phase.test.ts:168` | `isMobileViewport:true → 'idle'` | 새 축으로 |
| `tests/e2e` 모바일 31 케이스 | — | 단위 0 이 이미 터치 컨텍스트를 부여해 두었다 |

---

## 4-1. 이 단계에 속하는 결함 행

작업 지시서는 `docs/plans/2026-09-11-mobile-refactor-maps/scorecard.md` 다(217 행). 이 단계가 가져가는 것은 **축·계약·게이트에 걸린 행**이다 — 점수표에서 `건드리는 계약` 열이 비어 있지 않거나 `붉어질 게이트` 가 `scripts/qa/` 를 가리키는 행, 그리고 `over-specification` 렌즈에서 온 행 전부. 특히 blocker 중 `html lang` 이 BCP 47 이 아니다 · `esc-aliased-to-consent-button` · `「이전」 이동이 목적지 응답을 삭제한다` 셋은 계약 개정이 선행돼야 고칠 수 있다.

**점수표의 `basis` 를 그대로 개정 근거로 인용하지 마라.** 규범 근거 37 건 중 19 건에서 검증이 그 조항을 기각·축소했는데 `basis` 문장은 남아 있다. `정정` 열에 ✓ 가 있으면 렌즈 문서의 「검증이 붙인 정정」을 먼저 읽는다.

## 4-2. 단위 3-1 — 로케일 별칭 표 (blocker 둘을 함께 닫는다)

제품 locale 코드(`kr`·`zs`·`zt`)가 BCP 47 이 아니라서 두 결함이 **같은 원인으로** 난다 — `<html lang>` 이 유효하지 않고(WCAG 3.1.1), **동시에** BCP 47 로 쓴 경로가 전부 404 다(실측: `/ko`·`/zh`·`/zh-Hans`·`/en-US`·`/pt-BR`·`/KR`·`/jp` 전부 404, 반면 `/kr`·`/zs`·`/ja` 는 200).

**할 일**: `src/config/site.ts` 의 `localeMetadata` 각 항목에 `htmlLang` 을 더하고(`kr→ko` · `zs→zh-Hans` · `zt→zh-Hant` · 나머지 9 개는 코드 그대로), 같은 표에 진입 별칭을 둔다. `src/app/layout.tsx` 와 locale-html-lang 동기화가 `htmlLang` 을 읽고, `src/proxy.ts` 가 별칭을 canonical 세그먼트로 redirect 한다. **URL 세그먼트·스토리지 키·telemetry 필드의 정본은 그대로 둔다** — 바뀌는 것은 표시용 태그와 진입 별칭뿐이다.

**함께 붉어질 것**: `tests/e2e/routing-smoke.spec.ts:150` 의 `<html lang="{locale}">` 정규식 · `tests/unit/locale-config.test.ts:7` 의 12 개 코드 · `req-landing.md` §5.1(`:117`)·§5.3(`:142`)·§12(`:789`) · `AGENTS.md` §1 Runtime surface 의 Locales 표(**Ask-First**).

## 4-3. 단위 3-2 — 랜딩 키보드 진입을 skip link 로 교체 (확정)

`req-landing.md` §7.6 `:480-481` 이 「첫 Tab 이 GNB 를 건너뛰고 첫 카드로 간다」를 요구하고, 구현이 GNB DOM 을 CSS 선택자로 뒤지는 계층 위반을 **스스로 인정한다**(`use-landing-keyboard-entry.ts:17-29` 의 `@future-move R-06`). 탭 순서를 상태에 따라 바꾸는 것은 예측 가능성을 해친다. **표준 대안(skip link)으로 교체하고 §7.6 `:480-481` 을 개정한다.** `use-landing-gnb-entry-mode.ts`(87행)와 `use-landing-keyboard-entry.ts`(65행)가 사라지고 `site-gnb.tsx` 의 `tabIndex` 분기 여섯이 함께 정리된다.

## 5. 단위 4 — `theme-color` · manifest · OG (작고 독립적)

축과 무관하고 위험이 0 이며 모바일 체감에 직결하는 넷을 이 단계에 붙인다. ⑴ `theme-color` meta 가 없어 모바일 브라우저 크롬이 테마를 따라가지 않는다 — 라이트/다크 두 값을 `media` 로 준다. ⑵ web app manifest 가 없다. ⑶ `description` 이 `Reset baseline placeholder` 인 채로 프로덕션에 나간다. ⑷ OG 태그가 0 이라 **결과 공유 링크의 미리보기가 비어 있다** — 이 제품의 핵심 행동이 공유다.

**정적 OG 까지만 넣는다.** 결과별로 달라지는 **동적 OG 카드는 이번 리팩터 범위 밖**이다(분석 §15 결정 8) — 결과 화면의 내용 스키마가 정해진 뒤에야 만들 수 있고, 그것은 다음 phase 소유다.

---

## 6. 이 단계에서 가장 위험한 지름길

**`check-phase*` 13 체커는 전부 「약속한 이름이 약속한 파일에 있는가」만 본다.** 테스트 제목을 그대로 두고 단언 내용만 새 축에 맞게 비우면 열세 개가 전부 초록으로 남는다. `check-phase7:99` 는 컨트롤러 본문에 `resolveCardStateForVariant` 라는 **글자**가 있는지를 보는데 그 글자는 import 문에도 있다.

**그러므로 이 단계의 안전한 순서는 하나뿐이다 — 테스트 제목을 새 계약에 맞게 의도적으로 바꾸고, 그 변경에 맞춰 체커 정규식을 고친다.** 제목을 유지하는 쪽이 편해 보이지만 그 편함이 정확히 가드의 침묵이다.

---

## 7. 완료 조건

- [ ] 단위 0 이 제품 코드 변경 0 으로 통과했고, 터치 타깃 가드가 신설돼 **먼저 붉힌 뒤** 고쳐졌다.
- [ ] `LayoutBreakpoint` · `InputProfile` · `KeyboardAffordance` 세 축이 코드에 있고, §7.6-a 의 동작 부분이 전 표면 규칙으로 승격됐다.
- [ ] 입력 판정의 JS 정의처가 1 곳이고, CSS 사본과의 일치를 단위 테스트가 고정한다.
- [ ] hover 없는 900×1200 기기가 **닫기 X 와 backdrop 을 갖는다**(분석 §2-5 표의 두 번째 행이 첫 번째 행과 같아진다).
- [ ] SSR 판본 선택이 CLS·LCP **짝지은 실측**으로 결정됐고 그 수치가 `decision-register.md` 에 있다.
- [ ] 요구사항 문서가 둘로 갈렸고, §3-4 의 다섯 검사가 같은 커밋에서 함께 움직였다.
- [ ] `:632` 에 `Escape` 가 더해졌다.
- [ ] 죽은 분기 3 줄·죽은 상수 1 개·고아 임계값 `max-[719px]:` 이 정리됐다.
- [ ] `qa:visual:full` 을 실행하지 않았거나, 실행했다면 **사용자 승인 기록이 있다.**
- [ ] `docs/decision-register.md` 에 새 BQ 와 변경 이력.
- [ ] 이 문서를 `docs/done/` 으로 옮겼다(같은 커밋).

## 8. 이 단계에서 하지 않는 것 (do not)

- **시각을 바꾸지 않는다** — 색·간격·타입 스케일·모션 값. step 3 의 일이다.
- **§8.5 를 전면 재작성하지 않는다** — `:632` 에 Escape 를 더하는 것 하나만. 나머지는 IA 결정 뒤에.
- **IA 를 바꾸지 않는다** — 바텀시트·전용 라우트·밀도. step 3 이다.
- **`data-*` 속성 이름을 바꾸는 것을 축 이동과 같은 단위로 묶지 않는다** — baseline 과 세 e2e 스펙이 읽는 계약 표면이다.
- **step 1 의 지문 3 종을 지우지 않는다** — 이 단계에서는 지문이 **바뀌어야** 정상이고, 바뀐 해시를 커밋하되 **무엇이 왜 바뀌었는지 한 줄씩 적는다.**

## 9. 실행 프롬프트

**「`docs/plans/2026-09-11-mobile-refactor-step2-axis-and-contract.md` 를 그대로 실행하라. 선행 확인부터 하고, 단위 0 → 1 → 2 → 3 → 4 순서를 지켜라. §2-1 의 키보드 축 승격을 축 이동보다 **먼저** 하고, §2-5 의 SSR 판본은 짝지은 실측으로 고르고, §6 의 지름길을 택하지 마라.」**
