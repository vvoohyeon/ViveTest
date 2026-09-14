# 모바일 전면 리팩터 — 저장소 분석

**Task mode:** Analysis Only — 이 문서는 코드를 바꾸지 않는다. 구현은 `docs/plans/2026-09-11-mobile-refactor-step1-seam.md` · `docs/plans/2026-09-11-mobile-refactor-step2-axis-and-contract.md` · `docs/plans/2026-09-11-mobile-refactor-step3-surfaces.md` 셋이 순서대로 갖는다.

**이 문서가 답하는 질문:** 모바일을 전면으로 다시 만들려 할 때 ⑴ 무엇이 실제로 지금 일어나고 있는가 ⑵ 어떤 계약이 그것을 붙들고 있는가 ⑶ 그 계약을 고치면 어떤 검사가 붉어지는가 ⑷ 무엇이 표준 이하이며 그 판정의 근거는 무엇인가.

**이 문서가 정본이 아닌 것:** 여기 적힌 계약 인용은 `docs/req-landing.md`·`docs/req-test.md`·`docs/design/design.md` 의 **사본**이다. 값이 갈리면 그쪽이 정본이다(`AGENTS.md` §2). 실측값은 이 문서가 정본이며 측정 조건을 §2-7 이 명시한다.

---

## 0. 배경 — 왜 지금 다시 만드는가

사용자 진술을 그대로 옮긴다. 이 저장소의 요구사항 문서는 동작 정의와 인터랙션 정의가 뒤섞여 있고 디테일이 극도로 깊다. 그 깊이는 프로젝트 착수 당시 Claude Design·Claude Code 양쪽의 표준 UX·인터랙션 스킬이 요구 수준에 못 미쳐서 사용자가 손으로 메운 결과였다. 지금은 그 부족분이 사라졌고, 오히려 그때의 초정밀 명세가 더 나은 UX 완성도를 막고 있다. 목표는 표준 UX·인터랙션·디자인 완성도 관점에서 품질이 떨어지는 요소를 찾아 지금의 스킬로 끌어올리는 것이다. 사용자는 "디자인 개편 리팩토링은 이번이 마지막 기회이고 이후엔 로직 개선과 실제 테스트 플로우 구현이 많으므로 완성도·퀄리티에 한 치의 양보도 하지 않겠다"고 못박았다.

그 진술은 이 분석이 확인했다. §4 가 그 구체적 증거다 — `req-landing.md` §8.5 의 32 개 조항은 모바일 확장을 「제자리에서 자라는 카드」로 못박고, 바텀시트·전용 상세 화면·스와이프 닫기·뒤로가기 닫기를 **문면으로** 배제한다. 그 조항들이 지키려던 것(상태 복원의 정확성·전이의 결정성)은 정당하지만, 지키는 **수단**까지 계약이 소유하는 바람에 더 나은 수단이 후보에서 빠졌다.

---

## 1. 사용자 결정 일곱 — 이 리팩터의 전제

이 일곱은 확정이며 다시 묻지 않는다.

| # | 결정 | 실질 |
|:--:|:---|:---|
| 1 | **계약 개정 전면 허용** | 모바일 최적을 먼저 설계하고 `req-landing.md`·`req-test.md`·`design.md` 를 거기 맞춘다. 기존 조항은 보존 대상이 아니다 |
| 2 | **터치 태블릿은 입력 방식 기준으로 통일** | hover 없는 기기는 768px 이상에서도 터치용 생명주기를 쓴다. `isMobileViewport` 의 의미가 「폭」에서 「입력 방식」으로 바뀐다 |
| 3 | **전 표면 동시** | 랜딩·테스트·블로그·히스토리·설정·GNB·에러·404 |
| 4 | **0단계로 구조를 먼저 가른다** | 행동 무변경. 값 불변 지문 + 시각 baseline 이 증거 |
| 5 | **IA 재설계 허용** | 모바일 전용 화면·경로·배치를 도입해도 된다. 라우팅·transition·telemetry 계약도 개정 범위 |
| 6 | **요구사항 문서를 동작 계약 / 인터랙션 계약으로 분리** | 이후 인터랙션 개정이 동작 계약을 건드리지 않게 한다 |
| 7 | **서명 인터랙션은 3분류로 제시** | 보존 권고 / 교체 권고 / 결정 필요. §9 가 그 표다 |

**판정 근거의 범위(사용자 지시):** 「design.md 내부 일관성은 당연히 갖춰야 하고, 판정 가능한 근거는 이번 기회에 모두 발굴해 리팩터 대상에 넣는다.」 그래서 이 분석은 측정 가능한 규범(WCAG 2.2 · 탭 타깃 · 대비 · reduced-motion · reflow)뿐 아니라 플랫폼 관용 패턴 · 성능 예산 · i18n 압력 · 상태 피드백 · 정보 구조 · 과잉 명세까지 열네 개 렌즈로 훑었다. 각 지적에는 근거의 **종류**와 출처가 붙는다. 「더 나아 보인다」는 이 문서에서 근거가 아니다.

---

## 2. 실측 원장 — 이 세션이 직접 잰 것

**다시 재지 마라.** 아래는 전부 이 세션이 `main`(`a5aec95`) 의 clone 을 `npm run build` 후 `next start --port 4199` 로 띄워 Playwright chromium 으로 잰 값이다. 측정 조건과 한계는 §2-7 에 있다.

### 2-1. 표면별 형상 (390×844, 터치 컨텍스트, light)

| 표면 | 경로 | 문서 높이 | 화면 수 | 가로 오버플로 | 보이는 타깃 | 텍스트 원소 | 16px 미만 |
|:---|:---|---:|---:|---:|---:|---:|---:|
| 랜딩 | `/en` | 3,173px | **3.76** | 0 | 13 | 46 | **35** |
| 블로그 목록 | `/en/blog` | 950px | 1.13 | 0 | 8 | 13 | 12 |
| 블로그 상세 | `/en/blog/ops-handbook` | 1,324px | 1.57 | 0 | 8 | 16 | 13 |
| 히스토리 | `/en/history` | 844px | 1.00 | 0 | 5 | 9 | 8 |
| 테스트 진입 | `/en/test/qmbti` | 844px | 1.00 | 0 | 5 | 14 | 10 |
| 테스트 에러 | `/en/test/error` | 844px | 1.00 | 0 | 1 | 3 | 1 |
| 404 | 없는 경로 | 844px | 1.00 | 0 | 1 | 3 | 2 |

### 2-2. 폭·방향·확대별 랜딩

| 조건 | 문서 높이 | 화면 수 | 가로 오버플로 | 넘치는 원소 |
|:---|---:|---:|---:|---:|
| 320px | 3,313px | 3.93 | 0 | 0 |
| 360px | 3,276px | 3.88 | 0 | 0 |
| 390px | 3,173px | 3.76 | 0 | 2 |
| 430px | 3,172px | 3.76 | 0 | — |
| 768px | 1,607px | 1.57 | 0 | 0 |
| 834px | 1,636px | 1.60 | 0 | 0 |
| 1024px | 1,773px | **1.97** | 0 | 0 |
| 1280px | 1,276px | 1.42 | 0 | 0 |
| 1440px | 1,280px | 1.42 | 0 | 0 |
| 가로 844×390 | 1,643px | **4.21** | 0 | 0 |
| 390px · 텍스트 200% | 4,083px | **4.84** | 0 | **2** |

**읽히는 것 셋.** ⑴ 모바일은 데스크톱의 **2.6 배**를 스크롤한다. ⑵ **1024px 이 768px 보다 나쁘다**(1.97 대 1.57) — 데스크톱 티어로 넘어가며 카드가 커지는데 폭은 아직 좁다. ⑶ **WCAG 1.4.4 Resize Text 200% 가 실패한다** — 390px 에서 텍스트를 200% 로 키우면 태그 chip(`landing-grid-card-tag-chip`)이 뷰포트 우단을 32px 넘어간다(right=422 대 clientWidth 390). 320px 리플로(1.4.10)는 통과한다.

### 2-3. 타이포와 대비 (390px)

랜딩의 폰트 크기 분포: **13px×22 · 14px×1 · 14.08px×1 · 15px×11 · 16px×2 · 20px×8 · 24px×1**. 보이는 텍스트 원소 46 개 중 **35 개(76%)가 16px 미만**이고, 13px 22 개는 태그 chip 과 메타 행이다. 뷰포트에 따라 값이 바뀌는 타이포 토큰은 **없다**(§8 참조) — 즉 데스크톱 타입 스케일이 그대로 모바일에 나간다.

대비는 **두 테마 모두 위반 0 건**이다. 전 표면 텍스트의 최소 대비는 **5.08:1**(필요 4.5)이고 다크도 같다. 첫 측정에서 `color(srgb ...)` 표기를 0–255 로 잘못 읽어 거짓 위반이 나왔고, 파서를 고쳐 다시 쟀다 — **대비는 이 저장소의 강점이며 리팩터 대상이 아니다.**

### 2-4. 터치 타깃

| 표면·상태 | 보이는 타깃 | 24px 미만 | 44px 미만 | 44px 미만의 정체 |
|:---|---:|---:|---:|:---|
| 랜딩 | 13 | 0 | 1 | 로고 링크 68×24 |
| GNB 메뉴 열림 | 30 | 0 | 1 | 같은 로고 링크 |
| 블로그 목록·상세 | 8 | 0 | 0 | — |
| 히스토리 | 5 | 0 | 0 | — |
| 테스트 각 문항 | 4~5 | 0 | 0 | — |

**앞선 세션의 `min-h-8`(32px) 우려는 GNB 에는 해당하지 않는다.** GNB chip 의 클래스 문자열은 `min-h-8` 이지만 계산된 `min-height` 는 44px 이다(실측). 토큰 `--tap-min: 44px` 이 이미 존재한다. 남는 문제는 셋이다 — 로고 링크 24px, 동의 배너 세 버튼의 인접 간격 **0px**, 그리고 **터치 타깃 하한을 보는 검사가 저장소에 하나도 없다**는 것(§7-③).

### 2-5. 인터랙션 실동작 — 뷰포트 × 입력 5 조건

**이 표가 결정 2 의 근거다.**

| 조건 | `interaction-mode` | `expanded-layer` | backdrop | 닫기 X | 탭으로 밀려난 다른 카드 | 바깥 탭 닫힘 | Escape 닫힘 |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|
| 390×844 터치 | `tap` | **`mobile-in-flow`** | **있음** | **44×44** | **7 장 각 Δy=30px** | 예 | 예 |
| 768×1024 터치 | `tap` | `desktop-overlay` | 없음 | **없음** | 없음 | 예 | 예 |
| 900×1200 터치 | `tap` | `desktop-overlay` | 없음 | **없음** | 없음 | 예 | 예 |
| 1024×1366 터치 | `tap` | `desktop-overlay` | 없음 | **없음** | 없음 | 예 | 예 |
| 1440×900 마우스 | `hover` | `desktop-overlay` | 없음 | 없음 | 없음 | 예 | 예 |

**앱은 이미 입력 방식을 안다.** 768·900·1024 터치에서 `interaction-mode` 가 정확히 `tap` 으로 판정된다. 그런데 **생명주기는 폭만 본다** — `mobile-in-flow` 는 768 미만에서만 나온다. 그래서 터치 태블릿은 「탭 모드인데 닫기 버튼도 스크림도 없는 데스크톱 오버레이」를 받는다. 결정 2 가 고치는 것이 정확히 이 한 칸이다.

### 2-6. 확장 중에 일어나는 일 (390px)

| 항목 | 측정값 |
|:---|:---|
| 첫 카드 탭 → 문서 높이 | 3,173 → 3,203px (+30) · 스크롤 위치 불변 · history 항목 **증가 없음** |
| 밀려난 카드 | `rhythm-b`·`energy-check`·`creativity-profile`·`egtt`·`ops-handbook`·`build-metrics`·`release-gate` 각 +30px |
| 확장 카드 기하 | 390×286, 뷰포트 top 315 · bottom 600 (전체 보임) |
| 스크롤한 상태에서 하단 카드 탭 | 카드 위치 불변(vpTop 283 유지), 높이 277 → 286 |
| **확장 중 스크롤 잠금** | **없음** — `body.overflow=visible` · `html.overflow=visible` · `body.position=static` |
| 확장 중 600px 휠 | 확장 카드가 vpTop 283 → **-317** 로 화면 밖. 전면 스크림만 남는다 |
| 트리거 ARIA | `aria-expanded`=**없음** · `aria-controls`=**없음** · `role`=없음 |
| backdrop | `role`·`aria-label` 없는 `div`, `z-index:10`, `pointer-events:auto` |
| 확장 후 포커스 | **트리거에 남는다** — 확장 내용으로도 닫기 버튼으로도 이동하지 않는다 |
| 탭 누름 → 첫 DOM 변화 | pointerdown 직후 **변화 없음**. 첫 변화까지 124ms |

**스크롤 잠금 부재는 구현 결함이 아니라 계약의 결과다.** `req-landing.md:641` 이 「transition window 에 page scroll lock, OPEN settled 에서 unlock」을 요구하고 구현은 그대로 따른다(`use-mobile-scroll-lock.ts`). 즉 전면 스크림을 띄운 채 배경이 스크롤되는 모달-아닌-모달은 **설계된 것**이다. 고칠 자리는 코드가 아니라 조항이다.

### 2-7. 모션·피드백·성능·i18n

| 축 | 측정값 |
|:---|:---|
| `:hover` 규칙 | **39 개** |
| `:active` 규칙 | **5 개** |
| `:focus-visible` / `:focus` 규칙 | 8 / 4 |
| `-webkit-tap-highlight-color` | `html, :host` 에 선언(Tailwind preflight) — 브라우저 기본 탭 피드백이 꺼져 있다 |
| 애니메이션 원소 (일반 / `prefers-reduced-motion: reduce`) | **25 → 22** — 3 개만 줄어든다 |
| reduced-motion 미디어 블록 | 4 |
| `@container` 규칙 | 4 |
| hover/pointer 미디어 쿼리 | `(hover: hover)` · `(hover: hover) and (pointer: fine)` — CSS 층에 이미 있다 |
| 폭 미디어 쿼리 | 10 종 — rem 계열 5(40·48·64·80·96rem) + px 계열 5(768·900 min, 719·767·899 max). **두 벌의 브레이크포인트가 공존한다** |
| `:root` 커스텀 프로퍼티 | 105 개 · `--tap-min: 44px` · `--shell-gutter: 16px` |
| 총 전송 (랜딩 390px) | 2,910KB — **폰트 2,009KB(69%)** · script 736KB · stylesheet 77KB · document 81KB · image 5KB |
| JS 페이로드 | 모바일 390 과 데스크톱 1440 이 **15 개 파일 736KB 를 바이트까지 동일하게** 받는다 |
| Core Web Vitals (로컬) | TTFB 7ms · FCP 36ms · LCP 116ms · CLS **0.0000** · long task 0 |
| head meta | `viewport` 있음 · **`theme-color` 없음** · **manifest 없음** · `description` = `Reset baseline placeholder` · **OG 태그 0** |
| i18n 12 locale × 390px | 가로 오버플로 **0** · 문서 높이 `kr` 3,027 ~ `fr` 3,271 (8% 폭) · **전부 Pretendard Variable 로 렌더**(fallback 없음) · clamp 잘림 각 1 건 |

### 2-8. 테스트 플로우를 끝까지 걸은 결과 (390px)

동의 → Q1…Q8 → Submit 까지 실제로 걸었다. **각 문항 화면은 844px = 1.00 화면이고 가로 오버플로 0, 답변 버튼은 316×48~70px 다** — 이 표면의 모바일 형상 자체는 건강하다. 진행률(`Progress 38%`)과 문항 번호(`Q4`)가 표시된다.

발견된 것은 형상이 아니라 내용과 문맥이다. ⑴ **Q7·Q8 이 자리표시자다** — `Q_placeholder_qmbti_7` · `Option A` · `Option B`. ⑵ **결과 화면에 URL 이 없다** — 제출 후에도 `/en/test/qmbti` 그대로이고 내용은 `Final Result` 아래 `Q1 A … Q8 A` 답변 나열이다(Phase 9 미구현, `docs/plans/2026-05-17-result-pipeline-todos.md`). 모바일에서 결과 공유는 이 제품의 핵심 행동인데 공유할 주소가 없다. ⑶ **결과 화면에도 `Progress 100%` 와 타이머 `00:00` 이 GNB 에 남는다** — 문맥이 전환되지 않는다. ⑷ **테스트를 완료해도 히스토리가 비어 있다** — `src/app/[locale]/history/page.tsx` 에 항목을 렌더하는 코드가 없고(파일 자신의 주석이 그렇게 적는다), 본문에 디버그 문자열 `Locale: en` 이 프로덕션으로 나간다.

### 2-9. 측정 조건과 한계

측정 환경: macOS darwin 25.6.0 · Playwright chromium · 이 세션의 clone 을 `npm run build` 후 `next start --port 4199`. 모바일 컨텍스트는 `viewport 390×844 · deviceScaleFactor 3 · isMobile · hasTouch · iOS 17 Safari UA`.

**믿으면 안 되는 것:** 성능 수치는 **로컬 루프백**이라 네트워크가 없다 — LCP 116ms 와 CLS 0.0000 은 실기기 값이 아니고, 폰트 2,009KB 가 12ms 에 온 것도 그래서다. 실기기 판단은 폰트 **바이트 수**와 `font-display: swap` · preload 부재라는 구조 사실로만 한다. **재보지 않은 것:** 실제 iOS/Android 기기, 주소창 높이 변동 중의 고정 요소, 스크린리더 실사용, 저사양 CPU 스로틀링. 이 넷은 §14 에 남긴다.

---

## 3. 발견 ① — 축이 셋인데 문서는 하나로 쓴다

`req-landing.md` 는 **폭 하나로 세 가지를 구분하려 한다**: 공간(열 수·여백·clamp) · 포인터 방식(hover/tap) · 키보드. 폭이 겸직 중인 조항 14 건을 전수로 가려 보면 그중 **6 건이 실제로는 입력 방식**이다.

| 조항 | 폭 | 문서가 쓰는 뜻 | 실제 의미 |
|:---|:---|:---|:---|
| §2 2-T6 (`:37-38`) | 768 | 화면 크기처럼 서술 | **입력 방식** |
| §6.1-b (`:185`) | 768·1024 | 화면 크기 | **둘 다 — 축이 겸직 중** |
| §6.4-c (`:224`) | 1024 | 화면 크기 | **입력 방식** (코드는 `폭 AND capability`) |
| §6.4-j (`:247`) | desktop/tablet | 화면 크기 | **입력 방식** — 그리고 §7.6-g 와 모순 |
| §6.7-3 (`:345-355`) | Desktop/Tablet | 화면 크기 | **입력 방식** |
| §6.7-4 (`:357-365`) | Desktop/Tablet | 화면 크기 | **입력 방식** |
| §7.6-a (`:472`) | Desktop/Tablet | 화면 크기 | **셋째 축** — 키보드는 폭에도 포인터에도 속하지 않는다 |

나머지 7 건(§6.1-a·§6.2-a~e·§6.4-a)은 폭이 진짜 근거이므로 정당하다.

**코드는 이미 두 축을 갖고 있다. 결함은 축이 없다는 것이 아니라 생명주기가 잘못된 축에 걸려 있다는 것이다.**

- `interactionMode`(`'hover'|'tap'`)는 `resolveInteractionMode`(`use-landing-interaction-controller.ts:71-77`)가 만들고 `matchMedia('(hover: hover) and (pointer: fine)')`(같은 파일 `:207`)를 읽는다 — **입력 축이며 이미 옳다.**
- `isMobileViewport` 는 `viewportTier === 'mobile'`, 곧 순수 폭이다(`use-landing-interaction-controller.ts:157` 과 `landing-grid-card.tsx:970` 에 **각각 따로** 정의돼 있다).
- **모바일 생명주기 전체(전이·레이어·닫기 버튼·full-bleed)를 소유하는 것은 후자다.** §2-5 의 터치 태블릿 행이 그 산물이다.
- **`isMobileViewport` 를 소비하는 지점 중 `interactionMode` 를 함께 보는 곳은 0 개다**(전수 grep).

### 3-1. 경계가 다섯 개, 메커니즘이 네 종, 이중 기재가 세 곳

| 임계값 | JS 상수 | Tailwind | 생 CSS | 성격 |
|---:|:---|:---|:---|:---|
| 719 | 없음 | `max-[719px]:` ×7 | 없음 | **어디에도 근거가 없는 고아 값** |
| 767 / 768 | `MOBILE_MAX_VIEWPORT_WIDTH = 767`(`layout-plan.ts:1`) · `MOBILE_BREAKPOINT_MAX = 767`(`behavior.ts:1`, **소비자 0 — 죽은 상수**) · 리터럴 `768`(`use-landing-interaction-controller.ts:72`) | `md:` ×6 · `max-[767px]:` ×7 | `@media (min-width: 768px)`(`globals.css:326`) | 주 경계 |
| 899 / 900 | `NARROW_PADDING_MAX_VIEWPORT_WIDTH = 899`(`layout-plan.ts:7`) | 없음 | `@media (min-width: 900px)`(`globals.css:332`) | 좌우 여백 3 단 |
| 1023 / 1024 | `TABLET_MAX_VIEWPORT_WIDTH = 1023` · `DESKTOP_SETTINGS_HOVER_MIN_WIDTH = 1024` | 없음 | 없음 | 태블릿/데스크톱 |
| 1040 / 1160 | `DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE` · `DESKTOP_WIDE_MIN_GRID_INLINE_SIZE` | 없음 | `@container landing-grid` | **뷰포트가 아니라 그리드 컨테이너 폭** |

브라우저가 실제로 받는 폭 쿼리는 10 종이고 두 벌로 갈린다 — Tailwind 의 rem 계열 5(40·48·64·80·96rem)와 저장소가 직접 쓴 px 계열 5(768·900 min / 719·767·899 max). **`768px` 과 `48rem` 이 같은 경계를 두 표기로 적고 있다.**

### 3-2. 입력 방식의 정의가 세 곳에 흩어져 있다

`(hover: hover) and (pointer: fine)` 은 저장소에 **세 번 독립적으로** 적혀 있다 — `use-landing-interaction-controller.ts:207` · `src/features/gnb/hooks/use-gnb-capability.ts:17` · `src/features/landing/grid/landing-grid-card.module.css:92`. CSS 사본은 JS 와 동기화할 방법이 없다. 그리고 `any-hover` · `any-pointer` · `pointer: coarse` 는 저장소 전체에 **0 건**이다.

### 3-3. 결정 2 가 만드는 유일한 회귀 위험

**키보드 계약이 통째로 사라질 수 있다.** `req-landing.md:472` §7.6-a 는 「Desktop/Tablet 카드 키보드 탐색은 순차 규칙을 따른다. Mobile lifecycle 은 본 override 대상이 아니다」이다. hover 없는 768px 이상 기기를 모바일 생명주기로 옮기면 — 외장 키보드를 붙인 아이패드가 정확히 그것이다 — **그 기기는 카드를 키보드로 확장할 수단을 잃는다.** 컨트롤러에서 Escape·blur·키보드 확장이 모바일 분기에서 죽기 때문이다(`use-landing-interaction-controller.ts:354-358`·`:431`·`:455`). WCAG 2.1.1 Keyboard 위반 위험이며, §7.6-a 의 **동작** 부분(키보드로 도달 가능한 카드는 키보드로 확장·진입할 수 있다)을 폭·입력과 무관한 전 표면 규칙으로 **먼저 승격**시키는 것이 전제 조건이다.

---

## 4. 발견 ② — §8.5 의 32 개 조항이 모바일 표준 패턴을 문면으로 배제한다

`req-landing.md` §8.5 `Mobile Expanded (width<768)`(`:619-667`)은 문서에서 가장 조밀한 절이고 자동 검증 항목 13 개가 붙어 있다. **BQ-39 가 도입한 「계약 / 조정값」 2 계층은 §8.2·§8.3·§14.2 항목 13 에만 들어갔고 §8.5 에는 들어가지 않았다** — 따라서 이 32 개는 전부 불변식이며 개정에 사용자 승인이 필요하다.

그중 여섯 줄이 함께 작동해 **제자리 확장 이외의 모든 모바일 확장 형태를 배제한다.**

| 행 | 조항 | 배제하는 표준 패턴 |
|---:|:---|:---|
| `:625` | Expanded 는 in-flow 위치 유지, top jump 금지 | 바텀시트 · 전용 상세 화면 |
| `:626` | OPENING/CLOSING 동안 활성 카드 상단 y-anchor **편차 0** | 같은 것 — in-flow 이외 어떤 전개도 이 단언을 통과할 수 없다 |
| `:637` | Normal→Expanded 는 동일 카드의 연속 전이, 분리된 카드 돌출 금지 | 전용 상세 화면 전환 |
| `:641` | **자동 viewport 보정 스크롤 금지** · transition 중에만 scroll lock, OPEN 에서 unlock | 시트 표준(열린 동안 배경 락) · 확장 후 스크롤 인투 뷰 |
| `:650` | 내부 비-CTA 영역 탭은 no-op, 닫기/전환 유발 금지 | 시트 본문의 어떤 관용 제스처도 |
| `:652` | y-anchor 규칙에 카드 인덱스·스크롤 위치·콘텐츠 길이 예외 불허 | `:626` 의 예외를 원천 봉쇄 |
| `:632` | **닫기 경로는 X 버튼 또는 backdrop 탭만 허용** | **Escape · 스와이프 다운 · 뒤로가기** |

`:632` 의 화이트리스트는 규범 위반까지 만든다 — 키보드를 붙인 태블릿이 결정 2 로 이 생명주기에 들어오면 **Escape 로 닫을 수 없다**(WCAG 2.1.1). §8.3 `:582` 가 Escape 를 한 번 더 막는다.

그리고 `:639` 는 **구현 기법을 계약이 지정한다** — 「content-fit 높이 계산은 런타임 실측(`from px -> to px -> auto`) 또는 동등 정확도 방식」. `interpolate-size` / `calc-size()` 같은 현행 CSS 경로가 문면에서 좁혀진다.

**같은 성질이 §6.7-2 에도 있다.** `:339` 는 「`margin-top:auto` · `justify-content: space-between` · filler flex · 의사요소를 보정 수단으로 쓰지 말라」고 **수단을 금지**한다. 이 조항이 지키려던 결과(「`needs_comp=false` 카드는 잉여 여백을 갖지 않는다」)를 **결과 기준으로 다시 쓰면** 같은 보호를 유지하면서 표준 CSS 해법이 다시 후보가 된다. 이것이 §6(문서 분리) 개정의 전형적인 형태다 — **조항을 지우는 것이 아니라, 지키려던 것을 밝히고 수단을 풀어 준다.**

### 4-1. IA 를 직접 막는 조항 — 개정 대상 9 건

| # | 조항 | 위치 | 무엇을 막는가 | 등급 |
|---:|:---|:---|:---|:---|
| 1 | 닫기 경로 화이트리스트 | `req-landing.md:632` | 뒤로가기 닫기 · 스와이프 닫기 | **개정 필수** |
| 2 | instruction 은 별도 route 가 아니라 overlay | `req-test.md:399` | instruction/qualifier 의 전용 화면화 | **개정 필수** |
| 3 | Mobile Expanded 상세 26 줄 | `req-landing.md:620-652` | **다른 형태의 모바일 확장 전부** | **개정 필수 — 이 과제의 핵심 표면** |
| 4 | locale-less 허용목록 4 개 고정 | `req-landing.md:139` | 새 경로의 locale-less 진입 | 개정 필요 |
| 5 | V1 이벤트셋 최소화 · `expanded/tap 토글` 미수집 | `req-landing.md:772,784` | 시트 열림 같은 새 상호작용 이벤트 | 개정 필요 |
| 6 | `landing_view`: 1 회 | `req-landing.md:777` | 랜딩을 여러 라우트로 분할 | 개정 필요 |
| 7 | §13.3 handshake 12 개 불변식 | `req-landing.md:865-882` | 랜딩 출발이 아닌 전환 | 개정 필요 |
| 8 | 진입 경로 3 분류 | `req-test.md:324-328` | 네 번째 경로 | 개정 필요 |
| 9 | Result URL `/result/{variant}/{type}` | `req-test.md:769-809` | **막지 않는다 — 구현이 0 건이라 지금 정하는 것이 오히려 자유롭다** | 재설계 기회 |

**IA 자유도가 가장 큰 곳은 결과·로딩·히스토리 세 표면이다 — 바꿀 구현이 없기 때문이다.** `grep -rn "'/result\|/result/\|resultUrl\|base64\|btoa\|atob" src` → **0 건**. 도메인 층(`buildTypeSegment`/`parseTypeSegment`/`ResultPayload`)은 이미 있고 없는 것은 라우트와 인코딩 한 층뿐이다.

---

## 5. 발견 ③ — 게이트가 터치를 한 번도 흉내 내지 않는다

**저장소 전체에서 `hasTouch` · `isMobile` · `(pointer: coarse)` · `navigator.maxTouchPoints` 를 쓰는 테스트가 0 건이다**(실측 grep). 터치 흉내는 두 스펙의 `dispatchEvent(..., {pointerType:'touch'})` 25 회뿐이고(`gnb-smoke` 9 · `transition-telemetry-smoke` 16) 그것은 합성 DOM 이벤트라 미디어 특성을 바꾸지 않는다. hover capability 를 조작하는 곳은 `matchMedia` 를 스텁하는 4 스펙뿐이다.

**즉 현재 390px 테스트가 tap 모드에 도달하는 것은 폭 게이트 덕분이지 입력 방식 덕분이 아니다.** 결정 2 로 축을 옮기면 hover 가능한 Playwright chromium 의 390px 뷰포트는 **hover 경로로 떨어지고**, 모바일 e2e 31 케이스가 「계약을 어겨서」가 아니라 「테스트가 터치를 흉내 내지 않아서」 붉어진다. **개정과 같은 커밋에서 모든 모바일 e2e 에 터치 컨텍스트를 부여해야 하고, 그러지 않으면 붉음의 원인을 가려낼 수 없다.** 이것이 step2 의 첫 작업 단위인 이유다.

---

## 6. 계약 ↔ 게이트 — 개정 시 같은 커밋에서 움직일 것

게이트 계층이 셋이고 각각 다른 것을 본다. **Default Done gate**(`lint` → `typecheck` → `npm test` → `build`)는 vitest 85 파일만 돌린다. **`qa:rules`** 13 체커는 `qa:static` 안에만 있고, **`test:e2e:gate`** 의 `@gate` 는 theme-matrix 116 + safari 6 = **122 케이스뿐**이다(나머지 e2e 약 300 개는 `@smoke` 로만 태그돼 있다).

붉음은 세 파도로 온다. 전체 표는 `docs/plans/2026-09-11-mobile-refactor-maps/gates-reverse.md` 가 양방향으로 갖는다. 여기에는 **결정별로 직접 겨냥되는 지점만** 옮긴다.

| 결정 | 직접 겨냥되는 검사 | 무엇이 문제인가 |
|:---|:---|:---|
| **2 (입력 축)** | `scripts/qa/check-phase7-state-contracts.mjs:73,77` | **리터럴 `viewportWidth < 768` 과 `hoverCapability ? 'hover' : 'tap'` 과 `matchMedia('(hover: hover) and (pointer: fine)')` 의 철자 존재**를 요구한다. 새 판정 함수로 바꾸는 순간 세 정규식을 함께 다시 써야 한다 |
| **2** | 모바일 e2e 31 케이스 | §5 — 터치 컨텍스트 부여가 선행 조건 |
| **6 (문서 분리)** | `scripts/qa/check-variant-only-contracts.mjs:119-121` | **`docs/req-landing.md` 안에 `` `subtitle` `` · `4줄` · `재사용` 이라는 문자열이 존재할 것**을 요구한다. 문서를 쪼개면 이 세 문자열의 새 거처를 정하고 체커 경로를 바꿔야 한다 |
| **6** | `tests/unit/contract-citations.test.ts` | `AGENTS.md` · `.claude/CLAUDE.md` · `docs/agent-guides/project-rules.md` · `docs/agent-guides/verification-commands.md` 의 §번호·경로 인용이 전부 새 파일을 가리켜야 한다 |
| **1 · 6** | `scripts/qa/check-blocker-traceability.mjs` | `req-landing.md` §14.2 의 30 항목 ↔ `docs/blocker-traceability.json` 67 엔트리 양방향 폐쇄. §14.2 를 손대면 등재부와 67 개 앵커가 같이 움직인다 |
| **5 (IA)** | `scripts/qa/check-phase1-contracts.mjs` | 새 라우트가 `[locale]/` 아래여야 하고 그 페이지에서 `window` 를 읽으면 즉시 붉어진다 |
| **5** | `tests/e2e/routing-smoke.spec.ts:75` | 「비허용 경로는 global 404」가 새 경로를 404 로 판정한다 |
| **5 · 3** | `scripts/qa/check-phase11-telemetry-contracts.mjs:197-365` | manifest 폐쇄 + **baseline 파일 집합 정확 일치(누락·유령 양방향)**. 뷰포트를 하나라도 더하거나 빼면 manifest → 체커 → `qa:visual:full`(**사용자 승인 필수**) → provenance 가 한 덩어리로 움직인다 |
| **3 (모바일 확장 재설계)** | `scripts/qa/check-phase10-transition-contracts.mjs:122-166` | `assertion:B14-mobile-*` 5 개와 `document.body.style.overflow` 단언과 모바일 키프레임·클래스 6 개의 **이름** 존재를 요구한다 |
| **3** | `tests/unit/landing-grid-first-paint.test.ts:31` | **`landing-catalog-grid.module.css` 에 `@media (min\|max)-width` 가 존재하는 것 자체를 금지한다** — 모바일 스타일은 컨테이너 쿼리로 쓰거나 다른 파일로 빼야 한다 |

### 6-1. 붉어지지 않아서 더 위험한 것

**`check-phase*` 13 체커는 전부 정규식으로 「약속한 이름이 약속한 파일에 있는가」만 본다.** 테스트 제목을 그대로 두고 단언 내용만 비우면 열세 개가 전부 초록으로 남는다. `check-phase7-state-contracts.mjs:99` 는 컨트롤러 파일 본문에 `resolveCardStateForVariant` 라는 **글자**가 있는지를 보는데, 그 글자는 import 문에도 있다 — 함수를 다른 파일로 옮기고 import 만 남겨도 초록이다.

**그러므로 계약 개정 시에는 테스트 제목을 새 계약에 맞게 의도적으로 바꾸고, 그 변경에 맞춰 체커 정규식을 고치는 것이 유일하게 안전한 순서다.** 제목을 유지하는 쪽이 편해 보이지만 그 편함이 정확히 가드의 침묵이다. 그리고 `qa:rules` 를 「행동이 안 변했다」의 증거로 쓰지 않는다 — 그것은 「이름이 남아 있다」의 증거다.

---

## 7. 가드 공백 — 개정 전에 알아야 할 무가드 지점

1. **767/768 이 다섯 곳에 따로 적혀 있고 그중 둘은 아무 가드도 없다.** `behavior.ts:1` 의 `MOBILE_BREAKPOINT_MAX = 767` 은 재수출될 뿐 **소비자가 0 인 죽은 상수**이고, `src/features/test/instruction-overlay.tsx:26` 의 `max-[767px]:` 는 어떤 가드도 보지 않는다. 결정 2 를 실행할 때 이 둘은 조용히 뒤처진다.
2. **게이트가 터치를 흉내 내지 않는다** — §5.
3. **터치 타깃 크기를 보는 검사가 하나도 없다.** `@axe-core/playwright` 는 `target-size`(WCAG 2.5.8)를 기본 규칙 집합에서 돌리지 않고, 저장소 어디에도 44px/24px 하한을 단언하는 테스트가 없다.
4. **`tests/e2e/qualifier-overlay.spec.ts` 14 케이스가 전부 1280px 에서만 돈다** — 모바일 qualifier 경로 커버리지 0.
5. **`consent-smoke.spec.ts` 의 유일한 좁은 폭이 480px 이고 390 은 쓰지 않는다.**
6. **B14 타이틀 연속성 가드 둘이 「어긋나면 스스로 꺼지도록」 적혀 있다.** `transition-telemetry-smoke.spec.ts:585-588`·`:658-661` 의 조건부 `test.fixme` 는 타이틀이 1px 넘게 움직이면 실패가 아니라 **skip** 이 된다 — 잡으려던 바로 그 조건에서 침묵한다. 주석이 스스로 `Wave-13` 을 수신인으로 적으며, **이번 리팩터가 그 수신인이다.**
7. **`.motionStageLate` 가 죽어 있다.** `landing-grid-card.module.css` 의 6 개 규칙(`:297`·`:352`·`:359`·`:376`·`:409`·`:412`)이 이 클래스를 겨냥하는데 붙이는 코드가 `src` 어디에도 없다 — **확장 모션의 세 번째 스태거 단계가 실제로는 적용되지 않는다.** 죽은 코드인 동시에 시각 결함 후보이며, design.md 가 3 단 스태거를 규정하는지 확인한 뒤 0단계에서 지울지 step3 에서 되살릴지 정한다.

---

## 8. 뷰포트·입력 분기 전수 — 71 이 아니라 더 많다

| 파일 | 폭 축 | 입력 축 | 비고 |
|:---|---:|---:|:---|
| `landing-grid-card.tsx` (1308행) | 18 직접 + 27 파생 소비 | 2 | `useState`·`useEffect`·`useMemo`·`useCallback` 이 **0 개** — 상태를 갖지 않고 전부 props 소비처다 |
| `use-landing-interaction-controller.ts` (738행) · `use-mobile-card-lifecycle.ts` · `use-hover-intent-controller.ts` | 26 소비 지점 | 3 정의 지점 | `isMobileViewport` 가 「모바일 레이아웃인가」와 「터치 생명주기인가」를 한 불리언에 묶는다 |
| 그 밖의 `src/` 전체 | 29 JS + 22 Tailwind 인스턴스 + 2 생 CSS | 8 | 컨테이너 쿼리 1 |

**재배선의 구조적 핵심:** `landing-grid-card.tsx` 는 상태를 갖지 않으므로 축을 바꾸는 자리는 이 파일이 아니라 **상류 두 줄**이다 — `use-landing-interaction-controller.ts:157` 과 `landing-grid-card.tsx:970` 의 `isMobileViewport` 정의. 파일 안의 45 개 분기는 전부 하류다.

**뷰포트 분기가 하나도 없는 표면 파일이 24 개다.** 그중 무게가 큰 셋은 테스트 플로우(`test-question-client.tsx` 425행)·블로그 상세·히스토리다. 이 표면들은 지금 데스크톱 레이아웃을 그대로 모바일에 내보내고 있으며, §2-1 이 보여 주듯 **그래도 오버플로가 없다** — 즉 "깨지지 않았으나 최적화되지도 않았다".

### 8-1. 결정 2 를 적용할 때 함께 접어야 하는 죽은 분기

`use-hover-intent-controller.ts:318`·`:390`·`:483` 의 `interactionMode !== 'hover' || isMobileViewport` 에서 **둘째 항은 오늘 도달 불가능하다**(`hover` 는 `≥768` 을 함의하고 `isMobileViewport` 는 `≤767` 을 함의한다). 결정 2 이후에도 도달 불가다 — hover 없는 900px 태블릿이면 첫 항이 이미 참이다. **세 줄 모두 `interactionMode !== 'hover'` 한 항으로 접어야 하며, 그대로 두면 의미가 중복된 채 갈라진 두 진실이 남는다.**

---

## 9. 서명 인터랙션 17 건 — 3 분류 (사용자 결정 7)

각 항목의 근거·코드 규모·대체 패턴·잃는 것은 `docs/plans/2026-09-11-mobile-refactor-maps/signature-interactions.md` 가 갖는다. 여기는 판정표다. **「교체」는 「없앤다」가 아니다** — 아래 각 행의 「교체의 내용」이 실제 작업이다.

| # | 인터랙션 | 코드 규모 | 모바일에 있는가 | 추천 | 교체의 내용 / 결정의 형태 |
|:--:|:---|---:|:---|:---|:---|
| 1 | Hover intent (지연 확장·축소 + 스크롤 위조 방어) | 527행 | **없음** | **결정 필요** | 「지울까」가 아니라 「스크롤 중 hover 잠금이라는 단순 패턴이 주석에 실측으로 기록된 함정 5 종을 전부 덮는가」를 프로토타입으로 먼저 판정 |
| 2 | 키보드 순차 확장 override (포커스=확장) | ~656행 | 부분(별도 구현) | **교체** | 「포커스 = 확장」 **한 줄**만 표준(Enter/Space 로 확장)으로 되돌린다. 「A/B 순회 후 다음 카드」·「unavailable 건너뛰기」는 **보존**. `isMobileViewport` 분기 8 개가 사라진다 |
| 3 | 데스크톱 확장 모션 컨트롤러 5 상 | ~418행 | 없음 | **보존**(단 `cleanup-pending` 은 결정 필요) | 4 상은 §8.3 계약이 요구. 모바일의 `OPENING/OPEN/CLOSING` 과 **두 층을 하나로 합치는 것**이 과제 |
| 4 | 모바일 확장 생명주기 (스냅샷·유령 껍데기·복원 폴링) | **778행** | **이것이 모바일 그 자체** | **결정 필요** | 질문은 「보존/교체」가 아니라 **「제자리 확장인가 바텀시트인가」** 하나. 그 한 결정이 §8.5 34 개 규칙 중 12 개 이상의 존폐를 정한다 |
| 5 | HOVER_LOCK | ~60행 | 없음(계약상 배제) | **교체** | 이름이 틀렸다 — 하는 일은 「확장 중 비대상 카드 비활성화」이고 입력 방식과 무관하게 필요하다. `mobileInteractionLocked` 와 **단일 개념으로 합치고 `inert` 를 두 층 모두에** |
| 6 | 제목 연속성 (이분 탐색 실측 분할) | 301행 | 없음 | **결정 필요** | **성능 실측 하나가 결정을 가른다** — 강제 레이아웃 비용이 프레임 예산 안이면 보존, 넘으면 교체 |
| 7 | 그리드 지오메트리 (동결·보정 갭·바닥·배율) | ~1,130행 | 부분 | **보존**(구조 재배치 필요) | 개성이 아니라 레이아웃 물리. 0단계의 대표 대상. **행 베이스라인 동결만** 결정 필요 — 동결을 끄고 baseline 을 돌리면 한 번에 판정된다 |
| 8 | 행 위치별 transform-origin | 14행 | 실질적으로 없음 | **보존** | 표준 그 자체. 건드릴 이유 없음 |
| 9 | 테마 전환 2,500ms 블러 원 | 199행 | 있음 | **교체** | **어떤 계약도 이 값을 요구하지 않는다**(지키는 것은 19행 테스트의 `=== 2500` 단언 하나). `design.md:373` 의 최대 260ms 와 **9.6 배** 어긋난다. 연출을 없애는 것이 아니라 duration 을 design.md 어휘 안으로 |
| 10 | 랜딩→목적지 전환 (유령 GNB·1,600ms·스크롤 복원) | 547행 | 있음(공통) | **보존**(유령 GNB 만 결정 필요) | 상태 기계·타임아웃·롤백·스크롤 복원은 어느 IA 에서도 필요. **유령 GNB 66행만** 별도 — View Transition 공유 요소가 표준 대안 |
| 11 | 동의 배너 회피 (겹치는 동안에만 비켜섬) | 91행 | 있음(공통) — **그리고 그것이 문제** | **교체** | 데스크톱 전제(hover 로 소멸하는 일시 상태) 위의 루프가 모바일의 무한정 OPEN 에 걸려 있다. §8.4 `:609` 가 「교차하지 않는 동안 숨기기」를 금지하므로 **없애는 것이 아니라 다른 형태로 옮긴다** |
| 12 | 랜딩 키보드 진입 (첫 Tab 이 GNB 건너뜀) | ~152행 | 있음(공통) | **결정 필요** | skip link 라는 정확한 표준 대안이 있다. 구현이 스스로 계층 위반을 인정한다(`use-landing-keyboard-entry.ts:17-29` 의 `@future-move R-06`). 실제 질문은 §7.6 `:480-481` 을 개정할지 |
| 13 | 모바일 backdrop 탭 닫기 (10px 이면 스크롤로 재분류) | 100행 | 모바일 전용 | **보존** | 할 일은 **적용 범위를 넓히는 것** — 결정 2 가 적용되면 터치 태블릿에서도 켜지고 실측된 「닫을 수단 없음」이 그것만으로 해소된다 |
| 14 | GNB 모바일 드로어 (바깥 누름 닫기) | ~200행 | 모바일 전용 | **교체(범위 극소)** | 드로어가 아니라 **바깥 닫기 판정만** 13번과 같은 `pointerup` 방식으로 통일. 모달 의미론·스크롤 잠금·Escape·포커스 복귀는 전부 보존 |
| 15 | Blog 「Read more」 hover 공개 | 1행 + CSS | 있음 | **보존** | **이 한 줄이 결정 2 의 참조 구현이다** — 「폭이 아니라 입력 방식으로 갈린다」가 이미 올바르게 구현돼 있다. 재배선의 기준선으로 삼는다 |
| 16 | 모바일 테스트 뒤로가기 (220ms 안에 안 움직이면 홈) | 소 | 모바일 전용 | **결정 필요** | 계약 근거 미확인 · iOS 스와이프 충돌 미확인. **두 미확인을 먼저 닫아야 판정이 선다** |
| 17 | 데스크톱 설정 hover 열기 (≥1024 + hover) | 소 | 있음 | **보존** | WCAG 1.4.13 충족, 대체 진입 경로 있음. 단 결정 2 적용 시 `>= 1024` 를 유지할지 한 줄 확인 — hover 가능한 1,000px 창에서 지금 꺼진다 |

**집계: 보존 7 · 교체 5 · 결정 필요 5.** 「결정 필요」 다섯 중 넷(1·6·7·16)은 **측정이나 프로토타입 한 번으로 판정이 서는 것**이며, 사용자에게 올려야 하는 진짜 결정은 **4번 하나**다 — 모바일 확장을 제자리 확장으로 둘 것인가, 시트로 옮길 것인가.

---

## 10. 표면 인벤토리 — 전 표면 동시(결정 3)

| 표면 | 뷰포트 분기 | 모바일 상태 | 이번에 해야 할 것 |
|:---|:---|:---|:---|
| 랜딩 `/{locale}` | 45(카드) + 26(컨트롤러) | 3.76 화면 · 확장 3 종 사본 · ARIA 없음 | §11 의 IA 결정 + 밀도 |
| 테스트 `/{locale}/test/{variant}` | **0** | 형상은 건강(1 화면·오버플로 0·타깃 48px) · 내용이 자리표시자 · 결과 URL 없음 | 문맥 전환(진행률·타이머) · 결과 화면(Phase 9) · sticky CTA 검토 |
| 블로그 목록 `/{locale}/blog` | 0 | 1.13 화면 · 데스크톱 레이아웃 그대로 | 목록 밀도 · 카드 어포던스 구분 |
| 블로그 상세 `/{locale}/blog/{variant}` | 0 | 1.57 화면 · 본문 조판 미최적화(13px 3 개) | 본문 타입 스케일 · 줄 길이 |
| 히스토리 `/{locale}/history` | 0 | **항목 렌더 코드가 없다** · 프로덕션에 디버그 문자열 `Locale: en` | 표면을 처음부터 만든다 — IA 자유도 최대 |
| GNB · 모바일 드로어 | 다수 | 많은 것이 갖춰져 있다 — `role="dialog"` · `aria-modal` · `aria-label` · 여는 순간 포커스가 Close 로 이동 · `body` 스크롤 잠금 · Escape · backdrop · safe-area 하단 32px · 타깃 전부 ≥44px. **그런데 포커스가 갇히지 않는다** — Tab 20 회 중 5 회가 드로어 밖 랜딩 카드로 나갔다(실측) | 포커스 트랩 · 바깥 닫기 판정 통일(§9-14) · 로고 링크 24px |
| 설정 레이어 | 다수 | 데스크톱 hover 열기 + 모바일 드로어 내 chip | 결정 2 적용 시 `≥1024` 조건 재확인 |
| 에러 `/{locale}/test/error` | 0 | 1 화면 · 타깃 1 개 · **제목이 12 locale 전부 하드코딩 한국어** | 카피 · 복구 경로 |
| 404 | 0 | 1 화면 · 타깃 1 개(`Return home`) · GNB 없음 | 복구 경로 |

**칭찬할 것을 먼저 적는다 — 리팩터가 부수지 말아야 할 것이다.** ⓵ 대비는 두 테마 모두 위반 0, 최소 5.08:1. ⓶ 12 locale × 390px 에서 가로 오버플로 0. ⓷ GNB 모바일 드로어는 모달 의미론·초기 포커스 이동·스크롤 잠금·Escape·safe-area·44px 타깃을 갖췄다(**포커스 트랩만 빠져 있다** — §13). ⓸ 테스트 문항 화면은 이미 한 화면 한 문항이고 타깃이 48px 이다. ⓹ `--tap-min: 44px` 토큰이 이미 있고 GNB 가 그것을 쓴다.

---

## 11. IA 재설계 — 선택지와 추천 (사용자 결정 5)

랜딩 모바일 확장에 대한 다섯 선택지를 계약·파일·대가와 함께 평가했다(전문: `docs/plans/2026-09-11-mobile-refactor-maps/surface-landing.md` §8).

| 선택지 | 하는 일 | 대가 |
|:---|:---|:---|
| A 현행 유지 + 결함만 제거 | ARIA 부여 · 스크롤 락 정합 · `116px` 토큰화 | 탐색 비용과 스냅샷/복원 기계가 그대로. 「마지막 기회」라는 전제와 맞지 않는다 |
| **B 바텀시트 상세** | 카드 자리는 그대로, 하단에서 시트가 올라온다. `role="dialog" aria-modal` · 포커스 트랩 · 닫기 4 경로(X·backdrop·스와이프·Escape) · OPEN 동안 배경 락 | §8.5 전면 재작성 · baseline 4 장 재생성 |
| C 전용 상세 라우트 | 카드 탭 → 페이지 이동 | 페이지 로드가 하나 늘고 「훑어보고 고른다」가 사라진다 |
| D 리스트 밀도 재설계 | 카드를 세로 리스트 아이템으로(255px → 96~120px) | 시각 정체성이 가장 크게 바뀐다. `ds/catalog-components.css` 의 카드 시스템과 정면 충돌 |
| E 세그먼트 필터 / 캐러셀 | 상단 `테스트 \| 읽을거리` 세그먼트 | 가로 캐러셀은 SR·키보드 비용이 크고 카드 8 장 규모에 과하다 |

### 추천 — B (바텀시트 상세)

**이유 1 — 삭제되는 복잡도가 가장 크고, 그 복잡도는 전부 in-flow 확장이 만든 것이다.** 스냅샷 캡처 · 복원 rAF 폴링 · transient fixed 껍데기 · baseline freeze · resting floor 는 모두 「카드가 제 자리에서 커졌다 줄어드는데 그 자리를 픽셀 오차 없이 되돌려야 한다」는 요구의 파생물이다. 시트는 카드 기하를 건드리지 않으므로 **복원할 기하가 없고**, 약 500 행의 모바일 전용 런타임과 §8.5 의 13 개 검증 항목 다수가 요구사항과 함께 사라진다.

**이유 2 — 접근성 결함 다섯이 한 번에 닫힌다.** 시트는 `role="dialog" aria-modal` 과 포커스 트랩이 **기본값인 패턴**이고, 열린 동안 배경 락이 자연스러우며, 닫기 어포던스가 넷이 되고, 높이 0 트리거 문제가 성립하지 않는다. 개별 패치 5 건 대신 패턴 교체 1 건이다.

**이유 3 — 데스크톱 계약을 건드리지 않는다.** 시트는 입력 축 아래에만 산다. 데스크톱 오버레이 확장(§8.2·§8.4) · hover-lock(§7.5) · 키보드 순차 확장(§7.6)은 그대로다. 그리고 결정 2 를 적용하면 **터치 태블릿의 「닫을 방법 없음」이 별도 수정 없이 해소된다** — 시트에는 X 가 있기 때문이다.

**이유 4 — 시작 비용을 늘리지 않는다.** 탭 수는 2 탭 그대로다(카드 → 시트의 A/B). 선택지 C 는 여기에 페이지 로드를 더한다.

**추천에 포함되지 않는 것 — 반드시 분리할 것.** 탐색 비용 3.76 화면은 **확장 모델과 직교하는 축**이므로 B 가 해결하지 못한다. 그것은 카드 밀도의 문제이며 선택지 D 의 축소판(썸네일 비율 인하 + 모바일 subtitle clamp 도입)으로 따로 다뤄야 한다. 다만 `landing-grid-card.tsx:379,408` 이 모바일 clamp 를 **의도적으로 끈** 것이고 §6.6 계약과 12 locale E2E 가 그 값을 붙들고 있으므로, 밀도 변경은 계약 개정과 12 locale 재검증을 동반하는 **별도 단위**다. **두 축을 한 단위로 묶지 말 것.**

---

## 12. 시각 baseline — 무엇이 무효가 되는가

추적 중인 baseline 은 **170 장**이다: theme-matrix 164 + safari-hover-ghosting 5 + state-smoke 1. theme-matrix 는 뷰포트 6 × locale 2 × theme 2 의 조합이고, 그중 파일명이 `-mobile-chromium-darwin.png` 로 끝나는 것이 **40 장**이다.

`npm run test:e2e:gate` 는 theme-matrix **116** + webkit ghosting **6** = 122 케이스이며 164 장 중 116 장을 덮는다. **없는 baseline 은 생성되지 않고 실패로 남는다**(`tests/e2e/helpers/local-snapshot.ts:21-44`) — Playwright 기본값 `'missing'` 이 만드는 거짓 초록을 BQ-07 마감이 막아 두었다.

**0단계에서는 `--update` 를 한 번도 치지 않는다.** `npm run qa:visual:full` 은 `AGENTS.md` §4 Hard stops 이고 0단계는 정의상 baseline 이 변하지 않아야 하는 단계다. 픽셀이 달라졌다면 그것이 결함 보고서다.

**선택지 B 를 채택하면 재생성이 필요한 것은 4 장**이다 — `theme-state-mobile-landing-test-expanded-{en,kr}-{light,dark}-mobile-chromium-darwin.png`. 밀도 변경(§11 의 분리 단위)까지 가면 모바일 40 장 전부가 무효가 된다. 어느 쪽이든 재생성은 **사용자 승인이 있는 단일 단계**로 모으고, manifest → 체커 → `qa:visual:full` → provenance 가 한 커밋에서 함께 움직인다.

---

## 13. 확정된 결함 — 217 행

**작업 지시서는 이 문서가 아니라 `docs/plans/2026-09-11-mobile-refactor-maps/scorecard.md` 다.** 217 행 전부가 점수·표면·공수·건드리는 계약·붉어질 게이트와 함께 거기 있고, 근거 전문은 같은 디렉터리의 `findings/` 아래 렌즈 문서 17 편에 `key` 로 들어 있다. 여기에는 그 목록이 어떻게 만들어졌는지와 blocker 전량만 옮긴다.

### 13-1. 만들어진 경로와 개체수

14 개 렌즈가 **315 건**을 발굴했다 → 키 중복 병합 314 → **적대적 검증**(반증이 기본 태도) **252 확정 · 62 반증** → 세 비평(표면 누락·렌즈 누락·주장 엄밀성)이 **36 건** 추가 → 합계 288 을 **29 개 의미 클러스터로 병합**해 93 행 흡수 → 분석 파이프라인 자신에 대한 비평 7 건 분리 → **최종 217 행**.

| 집계 | 값 |
|:---|:---|
| 최종 행 | 217 — blocker 13 · major 96 · minor 108 |
| 반증되어 제외 | 62 |
| 클러스터 병합 | 29 개가 93 행 흡수 · 그중 13 개는 렌즈들이 심각도를 다르게 매겼다 |
| 검증이 정정을 붙인 행 | 186 |
| 비평 발굴(적대적 검증 미통과) | 27 |
| 표면별 | landing 78 · global 71 · test 61 · gnb 50 · blog 25 · settings 24 · history 12 · 404 8 · error 8 |

**검증이 실제로 한 일.** 각 주장의 `file:line` 을 열어 인용이 맞는지 보고, 이미 다른 곳에서 처리됐는지 grep 하고, 근거로 인용된 규범 번호가 실제 그 내용인지 대조하고, 제안이 다른 계약과 충돌하는지 확인했다. 상당수는 떠 있는 프리뷰 서버에 Playwright 를 붙여 **직접 재현**했다. 62 건이 이 과정에서 무너졌다 — 그 목록과 사유도 점수표에 있으니 **같은 주장이 다시 나오면 거기부터 보라.**

### 13-2. 이 목록을 쓸 때의 경고 셋

**⑴ `basis` 를 그대로 계약 개정의 근거로 인용하지 마라.** 규범을 근거로 든 37 건 중 **19 건(51.4%)** 에서 검증문이 그 조항을 기각하거나 좁혔는데 원래 `basis` 문장은 남아 있다. 가장 흔한 형태가 「WCAG 2.5.8 이 44px 을 요구한다」인데 **2.5.8 의 최소는 24px 이고 44px 은 HIG/Material 권장**이다. 점수표의 `정정` 열에 ✓ 가 있으면 렌즈 문서의 「검증이 붙인 정정」을 먼저 읽는다.

**⑵ 병합된 행의 심각도는 클러스터 최댓값이다.** 13 개 클러스터에서 렌즈들이 같은 결함을 minor 와 blocker 로 동시에 매겼다. 최댓값으로 통일했고 흡수된 key 는 추적 가능하게 남겼다.

**⑶ `[비평]` 행은 적대적 검증을 거치지 않았다.** 비평 에이전트가 스스로 확인해 보고한 것이며 독립 반증을 받지 않았다. **착수 전에 재현부터 한다.**

### 13-3. Blocker 13행 전량

| 점수 | 결함 | 표면 | 공수 | 병합 | 무엇이 문제인가 | 무엇으로 바꾸나 |
|---:|:---|:---|:--:|:--:|:---|:---|
| 8 | 무가드 storage 쓰기가 앱을 크래시시킨다 **[비평]** | /{locale}/test/{variant} — src/features/ | S | 2 | 저장소 쓰기가 무보호라 「모든 쿠키 차단」 하나로 테스트 진입이 크래시한다 | ⑴ writeResponseSet 이 getLocalStorage() 를 쓰도록 고치고 저장소 계층의 모든 쓰기를 volatility.ts 와 같은 try/catch 로 감싼다. ⑵ 쓰기 실패를 삼키지 말고 상태로 올려 「이 브라우저에서는 진행이 저장되지 않습니다」를 1 회 고지하고 메모리 상태로 진행시킨다 — consent 계층이 이미 같은 선택을 했다… |
| 8 | GNB 드로어가 100dvh 가 아니라 100vh 다 | gnb\|settings\|global\|history\|error\|4 | S | 4 ⚠ | GNB 모바일 드로어의 설정 컨트롤이 화면 밖으로 밀려 있고 스크롤로도 닿을 수 없다 | site-gnb.tsx:87 에서 `h-screen max-h-screen` 두 유틸리티를 삭제하고 `[height:100dvh] [max-height:100dvh]` 만 남긴다(경쟁 규칙이 사라지면 emit 순서가 결과를 바꿀 수 없다 — globals.css:306-322 의 --shell-gutter 가 같은 함정을 같은 방식으로 푼 선례다). 더 … |
| 7 | `next-builtin-error-fallback-is-the-eleventh-screen` **[비평]** | error-boundary (Next 16 내장 폴백, 전 라우트 공통) | M | — | 제품에 열한 번째 화면이 있고 그것은 Next 의 것이다 — lang 빈 문자열 · 테마 무시 · 32px 버튼 · 영어 고정 | `src/app/[locale]/error.tsx` 를 `next-intl` 메시지 · `PageShell` · `--tap-min` 으로 만든다(라벨은 이미 12 로케일 번역돼 있다). 루트에 `global-error.tsx` 를 두되 그것은 자기 `<html lang>` 을 내야 하므로 `src/app/global-not-found.tsx` 를 선례로… |
| 7 | /test/error 막다른 길 | error\|404 | M | 6 ⚠ | /test/error 에 복구 경로가 0개이고 12 로케일 전부에 한국어 제목이 나간다 | 제목 문자열을 messages 의 test.entryBlockedTitle 키로 옮겨 12 로케일 번역하고(raw variant id 는 제목에서 빼 aria 없는 보조 <p> 로 내린다), 패널 안에 랜딩 CTA 를 linkButtonPrimaryClassName 으로 최소 1개 둔다 — req-test.md:848-856 의 복구 카드 2장은 Phas… |
| 7 | `html lang` 이 BCP 47 이 아니다 | global | M | 2 | <html lang> 에 BCP 47 에 없는 태그 kr·zs·zt 가 나간다 | 제품 locale 코드(URL 세그먼트·스토리지 키·telemetry 필드의 정본)는 그대로 두고, 표시용 BCP 47 태그 매핑을 src/config/site.ts 에 신설한다 — localeMetadata 각 항목에 htmlLang 필드를 더해 kr→'ko', zs→'zh-Hans', zt→'zh-Hant', 나머지는 코드 그대로. layout.tsx… |
| 7 | Consent Preferences no-op · 되돌리기 불가 | landing\|global\|blog\|history | M | 4 ⚠ | Deny 한 번에 카탈로그 8장이 2장으로 줄고, 그 선택을 되돌릴 UI 가 제품에 없다 | 드로어 하단 설정 블록(site-gnb.tsx:467-478)에 세 번째 행으로 `Privacy` 행을 추가해 현재 동의 상태를 칩 2개(Allow optional / Deny)로 노출하고 `setTelemetryConsentState` 를 직접 호출한다 — 테마·언어와 같은 어휘(settings-controls.tsx:116 의 `min-h-[var(-… |
| 7 | 두 body 스크롤 잠금이 서로의 저장값을 덮어써 페이지가 영구히 얼어붙는다 | landing\|gnb\|global | M | 2 | 두 개의 body 스크롤 잠금이 서로의 저장값을 덮어써 페이지가 영구히 얼어붙는다 | body 잠금을 두 훅에서 걷어내고 참조 카운트를 갖는 단일 모듈 `src/features/ui/body-scroll-lock.ts`(`acquire(token)` / `release(token)`; 카운트 0→1 에서만 저장·설정, 1→0 에서만 복원)로 옮긴다. 소비자는 토큰만 넘긴다. 그리고 `document.body.style` 직접 쓰기를 vit… |
| 7 | `segment-404-has-no-server-rendered-body` **[비평]** | src/app/not-found.tsx (세그먼트 404), `[loca | M | — | 세그먼트 404 는 서버 HTML 에 본문이 한 글자도 없다 — JS 가 도착할 때까지 흰 화면이고, 실패하면 영구히 흰 화면이다 | `notFound()` 경로가 서버에서 렌더되도록 `src/app/[locale]/not-found.tsx` 를 두거나(현재는 루트에만 있다), `next.config.ts` 의 `experimental.globalNotFound` 와의 상호작용을 확정해 `not-found.tsx` 를 전역 404 와 같은 SSR 경로에 올린다. 검증은 `javaScri… |
| 7 | `esc-aliased-to-consent-button` | test | M | — | Esc 를 버튼의 별칭으로 정의해, 취소 키가 개인정보 설정을 영구 저장한다 | 「Esc 는 어떤 단계에서도 consent 저장·instructionSeen 기록·runtime entry commit 을 실행하지 않는다. qualifier step 에서 Esc 는 이전 단계로 돌아간다(Back/Cancel 과 동일하며 둘 다 상태를 쓰지 않는다). instruction step 에서 Esc 는 진입 전 상태로 되돌아간다 — landi… |
| 6 | 탭에서 목적지까지 피드백이 0 | landing\|global\|test | L | 2 ⚠ | 탭에서 목적지 페인트까지 피드백이 0이고, 계약이 그 공백을 요구한다 | req-landing.md:867 을 「시작 프레임의 카드 **콘텐츠·기하**를 고정한다 — pending 표시의 추가는 상태 되돌림이 아니다」로 가른다(원 의도는 rollback 금지이지 추가 금지가 아니다). 그 위에 셋을 구현: ⑴ 탭한 답변 버튼에 즉시 `data-pending="true"` 를 걸어 눌림+선택 표식을 남긴다 ⑵ pageState=… |
| 6 | 「이전」 이동이 목적지 응답을 삭제한다 | test | L | 2 ⚠ | 제거 predicate 를 코드 수준으로 못박아, 같은 절의 다른 조항을 위반한다 | 「후진 이동은 어떤 응답도 제거하지 않는다 — 목적지 문항의 기존 응답을 선택된 상태로 표시한다. tail reset 은 이동이 아니라 응답 변경 확정에서 발생한다: 문항 i 의 응답이 이전 값과 다른 값으로 확정되면 canonical index > i 인 모든 응답과 이전 derivation residue 를 원자적으로 폐기한다. 같은 값 재선택은 변경… |
| 6 | `answer-choice-selection-not-exposed` | test | L | — | 답변·qualifier 선택 상태가 접근성 트리에 존재하지 않는다 (data-selected 만) | 답변 쌍과 qualifier 선택지를 `role="radiogroup" aria-labelledby={문항 h2 id}` + `role="radio" aria-checked` 로 바꾸고 APG 키보드 계약을 함께 구현한다 — 그룹 전체가 탭 스톱 1개(roving tabindex: 선택된 것만 tabIndex=0), 화살표 키로 이동+선택, Home/En… |
| 6 | GNB 가 모달 다이얼로그 위 층에 있다 | test\|gnb\|landing\|global | L | 4 ⚠ | 다이얼로그 포커스 트랩이 GNB 의 document 레벨 Tab 라우팅 하나로 무효화된다 | use-gnb-tab-routing.ts 의 document 핸들러에 모달 가드를 넣는다 — targets[0].focus() 앞에서 document.querySelector('[role="dialog"][aria-modal="true"]:not([hidden])') 이 있으면 즉시 반환한다. 저장소에 이미 같은 판정 함수가 있다(use-landing-i… |

**셋은 이 세션이 직접 재현했다.** ⑴ **두 body 스크롤 잠금이 서로의 저장값을 덮어써 페이지가 영구히 얼어붙는다** — 390px 에서 카드를 탭하고 확장 전이가 끝나기 전(~60ms)에 GNB `Menu` 를 탭한 뒤 Escape 를 누르면 `body{overflow:hidden;touch-action:none}` 가 남고 그 뒤 어떤 입력으로도 풀리지 않는다. 기전은 메뉴 락이 **이미 잠긴 값**을 자기 원본으로 저장하고 그것을 복원하는 것이며, 카드는 `req-landing.md:641` 에 따라 OPEN 에서 이미 자기 락을 풀었으므로 되돌릴 주체가 없다. 카드가 **이미 OPEN 인** 상태에서 메뉴를 열면 정상이다 — 겹치는 창이 카드 OPENING 의 280ms 뿐이라 흔하지 않지만, 모바일에서 카드를 탭하고 바로 메뉴를 누르는 것은 충분히 일어난다. ⑵ **GNB 드로어의 `aria-modal="true"` 가 거짓이다** — Tab 20 회 중 5 회가 scrim 뒤 랜딩 카드로 샌다. ⑶ **instruction 다이얼로그가 GNB 아래 층이다** — 다이얼로그 `z-index: auto` 대 GNB `z-[1100]`.

### 13-4. 이 분석 자체에 대한 비평 7건

세 번째 비평이 결함 목록 자체를 겨눴고 **내 오류 하나를 잡았다** — 비평에 1 차 검증 생존 62 건을 넘기지 않아 목록이 190 건이었고, 그래서 비평이 이미 확정돼 있던 스크롤 락 blocker 를 「빠졌다」며 다시 발견했다. 최종 병합은 252 확정 전량 + 비평 36 을 대상으로 다시 했다. 일곱 지적의 처분은 점수표 말미에 한 행씩 적혀 있다. **구현 세션이 할 일이 아니다.**

---

## 14. 미확인 8건 — 전부 닫혔다 (2026-09-14)

분석이 남긴 미확인 여덟을 후속 세션에서 측정·실험·저장소 분석으로 닫았다. **다시 재지 마라.**

| # | 미확인이었던 것 | 어떻게 닫았나 | 결론 |
|:--:|:---|:---|:---|
| 1 | 실기기 성능 | CDP 네트워크 스로틀링(Slow 4G · Fast 3G · Slow 3G)으로 빌드된 서버를 실측 | **폰트가 지배 요인이다.** Slow 4G 에서 폰트 하나가 **10,886ms**, Slow 3G 에서 **44,405ms**. 그동안 사용자는 fallback 글꼴로 읽는다. LCP 는 Slow 4G 1,892ms · Fast 3G 2,200ms · Slow 3G **7,240ms**. CLS 는 네 프로필 모두 0.0000 |
| 2 | 주소창 높이 변동 중의 고정 요소 | Tailwind 4.1 컴파일러를 직접 돌려 emit 순서를 확정하고, 드로어 내용 하단을 실측해 iOS 의미를 대입 | **`h-screen` 이 이긴다.** `.[height:100dvh]` 155행 · `.h-screen` **158행**. 드로어 내용 하단이 812px 이므로 `100vh`(844) 의미에서 **67px 이 가시 영역 밖**이고, `scrollHeight === clientHeight` 라 스크롤할 것도 없다. blocker 확정 |
| 3 | 스크린리더 실사용 | CDP `Accessibility.getFullAXTree` 로 세 상태의 접근성 트리를 덤프 | **확장 트리거에 `expanded` 속성이 없다** — 확장이 보조기술에 아무 일도 아니다. 뒤 카드 7 장은 `disabled=true` 로 트리에 남아 훑인다. 랜드마크 이름이 하드코딩 영어. **정정: live region 은 0 이 아니라 1 인데 그것은 제품의 것이 아니라 Next 의 라우트 안내자다** |
| 4 | 저사양 CPU | CDP `Performance.getMetrics` 의 레이아웃 카운터로 확장 1 회의 강제 레이아웃을 직접 계측 | **제목 연속성은 보존한다.** 확장 1 회당 layout 22~23 회 — 1× 3.3ms/task 23.9ms · 4× 11.9ms/74.9ms · 6× 16.8ms/115.5ms(대조군 0회/0ms). 1×·4× 는 예산 안이고, 결정 2 이후 이 코드는 **hover 가능 기기에만 존재**하므로 6× 는 대상 기기가 아니다 |
| 5 | `.motionStageLate` 사망이 의도인가 | CSS 지연값과 배정처, `design.md` §8 을 대조 | **죽은 코드가 아니라 배정 누락이다.** CSS 는 40/100/160ms 3 단 사다리를 정의하고 `design.md:374` 가 「staged expand … with a short stagger」를 요구하는데, 확장 본문 세 블록(preview → answers → meta) 중 meta 가 Middle 로 배정돼 Late 가 비었다. **고치는 것은 한 단어** — `ExpandedMetaRow` 를 `motionStageLate` 로. reduced-motion 규칙이 이미 Late 를 덮고 `state-smoke:1229` 가 모든 슬롯을 훑으므로 안전하다 |
| 6 | 행 베이스라인 동결이 여전히 필요한가 | 게이트 표현식과 스냅샷 소비처를 전수로 추적 | **phase 는 필요하고 스냅샷 값은 아니다.** `activeVisualCardVariant !== null` 이 이미 확장 구간을 막으므로, `phase` 항이 하는 일은 **접힘 애니메이션이 끝날 때까지 억제를 연장**하는 것이다(없으면 접히는 중 기하로 spacing 을 계산한다). 반면 `top`/`bottom`/`height` 는 `data-baseline-*` 로 나가기만 하고 **읽는 곳이 0** — 행마다 `getBoundingClientRect()` 를 부를 이유가 없다 |
| 7 | 뒤로가기 220ms 홈 폴백의 계약 근거 | 계약 전문 검색 | **동작은 계약이고 값은 아니다.** `req-landing.md:244` 「Mobile Test Back: 우선 `history.back`, 불가 시 `/{locale}`로 fallback」과 `:254` 의 자동 검증 요구가 있다. **220ms 라는 값에는 근거가 없고** `tests/unit/gnb-back-navigation.test.ts` 가 고정할 뿐이다. iOS 스와이프와의 충돌은 없다 — 이 경로는 GNB Back **버튼**에서만 발화하고 엣지 스와이프는 브라우저 자신의 네비게이션이다 |
| 8 | 비평 발굴 27행의 재현 | blocker 를 직접 재현 | **네 건 전부 성립.** ⑴ localStorage 를 막으면(iOS 「모든 쿠키 차단」) 「Accept all and start」 탭이 앱을 `html#__next_error__` 로 떨어뜨린다 — `lang=""` · 테마 없음 · 버튼 69×32·59×32 · 영어 고정 ⑵ 세그먼트 404 는 서버 HTML 의 body 에 **보이는 텍스트가 0** 이다(최상위 404 는 정상 렌더) ⑶ `?variant=` 가 h1 에 반사된다 — **다만 React 가 이스케이프하므로 XSS 가 아니다** ⑷ `/ko`·`/zh`·`/zh-Hans`·`/en-US`·`/pt-BR`·`/KR`·`/jp` 가 전부 404 |

### 14-1. 측정이 드러낸 합류점 둘

**⑴ `html lang` 과 `/ko` 404 는 같은 원인이다.** 제품 locale 코드(`kr`·`zs`·`zt`)가 BCP 47 이 아니라서 `<html lang>` 이 유효하지 않고(WCAG 3.1.1), **동시에** BCP 47 로 쓴 경로가 전부 404 다. 로케일 별칭 표 하나(`kr↔ko` · `zs↔zh-Hans` · `zt↔zh-Hant`)가 두 결함을 함께 닫는다 — 표시용 `htmlLang` 과 proxy 의 진입 별칭이 같은 표를 읽으면 된다.

**⑵ 회전이 결정 2 의 세 번째 증거다.** 세로 844 에서 펼친 카드(`mobile-in-flow` · backdrop · 닫기 X)가 가로 844×390 으로 돌리면 **파괴된다**(`expanded:""` · `phase:NORMAL` · tier `tablet`). 반대 방향(가로→세로)은 보존된다. 같은 물리 동작이 방향에 따라 반대로 갈리는 이유는 하나 — **가로에서 폰이 폭 844 라 `tier=tablet` 이 되어 닫기 버튼 없는 데스크톱 오버레이를 받기 때문**이다. 결정 2(입력 방식 기준)를 적용하면 가로에서도 터치 생명주기가 유지되므로 **회전 파괴가 부수적으로 사라진다.**

---

## 15. 확정된 제품 결정

**이 열셋은 확정이다. 새 세션은 다시 묻지 않는다.** 시각·인터랙션의 구체는 `docs/plans/2026-09-14-mobile-refactor-design-spec.md` 가 갖는다 — 그 문서가 이 표의 아래에 있는 모든 「어떻게」의 정본이다.

| # | 결정 | 근거 |
|:--:|:---|:---|
| 1 | **폰의 카드 확장은 바텀시트다** | 삭제되는 복잡도가 가장 크고(스냅샷·복원 폴링·transient 껍데기 등 약 500행), 접근성 결함 다섯이 패턴 교체 한 건으로 닫힌다 |
| 2 | **태블릿·데스크톱의 카드 확장은 제자리 오버레이를 유지한다** | 좁지 않은 화면에서 위치를 옮길 이유가 없다. hover 없는 기기에는 **dim backdrop 을 깔고 빈 곳 탭으로 닫는다** — 더해지는 것은 그 하나이고 X 는 두지 않는다 |
| 3 | **동의 UI 는 하단 배너다** | 랜딩 직후 화면 전체를 덮으면 사용자가 부담을 느끼고 이탈한다. 배너는 스크림이 없고 뒤에서 카탈로그가 스크롤된다 |
| 4 | **동의 배너는 어떤 컨테이너도 공유하지 않는다** | 미선택 상태에서 카드를 탭하면 사전질문 시트가 **배너보다 위 층**에 뜨고 배너는 스크림 아래 그대로 남는다. 두 UI 를 한 컨테이너로 묶지 않는다 |
| 5 | **instruction 화면의 모달 시트는 현행을 유지한다** | 마찰 사다리의 마지막 칸이고, 이미 사전질문에 답한 사용자에게는 선택을 강제하는 것이 맞다 |
| 6 | **랜딩 밀도는 중간안** | 1 열 유지, 썸네일 16:6 → 16:4, 모바일 clamp 도입, 약 3.0 화면. 카드 부제는 **최대 두 줄**. **2 열 그리드는 배제** — 좁은 폭을 다시 가르는 것이 시각 균형과 정보 밀도 양쪽에 불리하다 |
| 7 | **폰트는 로케일별 subset + preload** | Slow 4G 10.9 초의 지배 요인이 폰트 하나다. 12 locale 이 전부 Pretendard 로 렌더되고 fallback 이 없으므로 **커버리지를 잃지 않는 subset** 이어야 한다 |
| 8 | **결과 화면은 주소까지만 만든다** | 공유·새로고침 복원·뒤로가기가 그것만으로 열린다. **내용 구성과 동적 OG 는 다음 phase** |
| 9 | **히스토리는 목록까지만 만든다** | 항목 탭 동작과 URL 스킴은 결과 화면 내용과 함께 다음 phase |
| 10 | **상시 하단 탭 바를 만들지 않는다** | 화면이 일곱뿐이라 과하고 하단 밴드 경쟁을 영구화한다 |
| 11 | **hover intent · 제목 연속성 · 유령 GNB 는 보존한다** | 앞의 둘은 데스크톱 전용이고 측정이 예산 안임을 보였다. 유령 GNB 는 전환 계약 전체를 건드리므로 별도 단위다 |
| 12 | **랜딩 키보드 진입은 skip link 로 교체한다** | 표준 대안이 정확히 존재하고, 현재 구현이 스스로 계층 위반을 인정한다. 탭 순서를 상태에 따라 바꾸는 것은 예측 가능성을 해친다 |
| 13 | **동의 수정 경로는 얇은 텍스트 링크 하나다** | 모바일은 드로어 설정 블록의 우측 정렬 링크, 데스크톱은 페이지 최하단 중앙. 누르면 **같은 배너**가 다시 뜨고 이전 선택이 표시된다 |

## 16. 상세 문서 색인

전부 `docs/plans/2026-09-11-mobile-refactor-maps/` 아래에 있다. **이 문서가 요약이고 그쪽이 근거다.**

| 문서 | 무엇을 갖는가 |
|:---|:---|
| `scorecard.md` | **작업 지시서** — 217 행 전량, 점수·공수·계약·게이트·병합 이력·검증 정정 표시, 반증 62 건, 클러스터 29 개, 메타 비평 처분 |
| `gates-reverse.md` | 계약 ↔ 검사 **양방향** 지도. 모바일 계약 개정 시 붉어질 검사 집중 목록과 가드 공백 6 건 |
| `contract-landing-1.md` · `contract-landing-2.md` | `req-landing.md` 전 조항 분류(동작/인터랙션/혼합), mixed 분리안, widthKeyed 원장, 표준 UX 저해 지목 |
| `contract-test.md` · `contract-design.md` | `req-test.md` 와 `design.md`·`ds/` 의 같은 분류 |
| `branches-card.md` · `branches-controller.md` · `branches-rest.md` | 뷰포트·입력 분기 전수와 semantics 분류 |
| `surface-landing.md` · `surface-test.md` · `surface-blog-history.md` · `surface-gnb.md` | 표면별 구조·IA·재설계 선택지 |
| `signature-interactions.md` | 서명 인터랙션 17 건의 3 분류 재료 |
| `seam-split.md` | step 1 이음매 설계와 행동 무변경 증명 절차 |
| `ia-contracts.md` | IA 재설계가 건드리는 라우팅·transition·telemetry·storage 계약 |
| `baseline-inventory.md` · `css-responsive.md` · `i18n-pressure.md` | 시각 baseline 무효화 분석 · CSS 반응형 구조 · 12 locale 압력 |
| `findings/*.md` (17 편) | 결함 근거 전문 — 14 렌즈 + 비평 3 |

**신뢰도 한 줄.** 맵과 결함 문서는 이 세션의 서브에이전트가 썼고, 계약 인용과 수치에는 `file:line` 이 붙어 있다. **실측값(§2)과 어긋나면 실측이 이긴다.** 계약 조항의 정본은 언제나 `docs/req-landing.md`·`docs/req-test.md`·`docs/design/design.md` 다.
