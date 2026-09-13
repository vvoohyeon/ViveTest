# req-landing.md §1–§7 조항 분류 맵 (1–508행)

대상 파일: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis/docs/req-landing.md` (전체 1147행, 본 맵은 1–508행 전수). 읽기 전용 세션이며 저장소 파일은 수정하지 않았다.

## 방법과 판정 기준

전수로 읽고 `###` 조항 단위로 나눈 뒤, 한 조항 안에서 규칙 성격이 갈리는 지점은 행 범위로 더 쪼갰다(예: `6.4-c` = 224–230행). 판정에 쓴 근거는 문서 본문·런타임 소스·측정 규범(WCAG 2.2)·플랫폼 관용 패턴 네 가지뿐이고, 각 판정에 그 출처를 붙였다. 소스를 읽어 확인한 것만 file:line 으로 인용했고, 읽지 않은 것은 「미확인」으로 적었다.

**kind 판정 기준.** behavior = 데이터·라우팅·상태 전이·진입 가능성·저장·접근성 트리 존재 여부. interaction = 제스처·모션·타이밍·hover/tap·dwell·시각 피드백·생명주기. mixed = 한 문장 또는 한 목록 항목 안에서 그 둘이 분리 불가능하게 붙어 있는 것. visual = 순수 치수·색·비율. meta = 문서 운영 규칙.

**widthKeyed 판정 기준 한 줄.** 그 폭이 가리키는 것이 「이만큼의 공간이 있다」면 화면 크기, 「이런 방식으로 조작한다」면 입력 방식이다. 판별법: 폭은 그대로 두고 입력만 마우스↔손가락으로 바꿨을 때 그 조항이 여전히 옳은가 — 틀려지면 그 폭은 입력 방식의 대리 변수다.

**prescriptiveness.** low = 무엇을 할지만 말한다. medium = 값이나 순서를 못박는다. high = 구현 방식을 지정한다. extreme = 이 문장 때문에 더 나은 표준 패턴을 쓸 수 없다.

## 개체수

clauses=86 · behavior=36 · mixed=24 · meta=9 · interaction=8 · visual=8 · 결번(kind 없음)=1 · widthKeyed=14 (입력 방식 대리=6 · 화면 크기=7 · 두 뜻 겸직=1) · shared=62 · desktopOnly=16 · mobileOnly=7 · 해당없음=1 · extreme=13 · high=30 · medium=32 · low=10 · 해당없음=1 · obstructsStandardUx 지목=14 · 문서 내부 모순·결번·코드 불일치=8 · 미확인=7

---

## 표 A — §1 Scope · §2 Terms · §3 Conflict · §4 Invariants · §5 Routing (1–176행)

| id | 행 | kind | mobileScope | widthKeyed | 강제도 | 요약 | 분리 제안 · 근거 |
|:---|:---|:---|:---|:---|:---|:---|:---|
| 1.1 | 6 | meta | shared | — | low | V1 구현 범위 열거(카탈로그 UI·Normal/Expanded 전이·카드 타입 진입 계약·consent filtering·전환 핸드셰이크·ingress 경계·return restoration·telemetry·SSR 안정성) | 분할 불필요. 다만 「Normal/Expanded」가 범위 정의문에 들어 있어 상태 이름 자체가 계약이 됐다 — IA 재설계(결정 5) 시 이 줄부터 바꿔야 한다 |
| 1.2 | 9 | meta | shared | — | low | 비목표: 배경 연출·Sheets 직접 호출·전역 택소노미·본문 고도화 제외 | 유지 |
| 1.3 | 12–15 | mixed | shared | — | high | Visual package B 고정 · 배경 연출 강도 `0` · 카드 tilt 전면 비활성 | visual = package B. interaction = tilt 금지·배경 정지. 「tilt 전면 비활성」은 결과가 아니라 수단 금지다 — WCAG 2.3.3 Animation from Interactions 기준(인터랙션 유발 모션은 reduced-motion 에서 비활성)으로 재진술하면 같은 보호를 유지하면서 모션 설계 자유도가 돌아온다 |
| 1.3-V | 17–19 | meta | shared | — | medium | Manual: tilt/배경 비활성 육안 확인 · Automated: scale/opacity 고정값 위반 검사 | Manual 1건이 사람 노동이다. 시각 회귀 baseline 이 이미 164장 추적 중이므로 자동 게이트로 흡수 가능 |
| 2-T1 | 25–30 | behavior | shared | — | medium | Card Type 5종(`available`·`unavailable`·`hide`·`opt_out`·`debug`)의 가시성·진입 가능성·consent 연동 | 순수 동작. 동작 계약 문서로 그대로 이관 |
| 2-T2 | 31–32 | mixed | shared | — | high | Normal = 기본 탐색 상태, Start/Read more/A-B entry CTA 비노출 · Expanded = 상세 슬롯 노출, Test 는 A/B CTA, Blog 는 Read more 허용 | behavior = 상태 2종의 존재와 각 상태에서의 진입 가능 여부. interaction = 「어느 상태에서 CTA 가 보이는가」. 용어 정의에 노출 규칙이 붙어 있어 상태 이름을 바꾸지 않고는 CTA 배치를 못 바꾼다. 분리 후 Expanded 는 「상세가 열린 상태」로만 정의하고 CTA 노출은 §6.5 로 넘긴다 |
| 2-T3 | 33–34 | interaction | desktop-only | — | high | Card Shell = scale/높이/clip 기준 단위 · Row Baseline = Expanded 직전 같은 row 높이 기준값 | Row Baseline 은 1열 모바일에 row 가 없어 정의 자체가 성립하지 않는다(§6.2 202행이 Mobile 1열). 모바일 표면을 도입하면 대응 용어(시트 표면 기준값 등)가 새로 필요하다 |
| 2-T4 | 35 | interaction | shared | — | medium | Handoff = 카드 A→B 연속 hover/tap 이동 경로 | 한 단어가 두 입력을 덮는다. 입력 축을 가르면 hover handoff(연속 포인터 이동)와 tap handoff(별개의 두 탭)는 취소 조건도 모션도 달라야 하므로 용어도 갈라야 한다 |
| 2-T5 | 36 | behavior | shared | — | low | Settled = 목표 상태 확정 후 추가 변형 없는 안정 시점 | **보존 권고.** 시간이 아니라 상태로 정의돼 있어 자동 검증이 가능하다 — 이 문서에서 가장 잘 쓰인 정의다 |
| 2-T6 | 37–39 | mixed | shared | **768 (입력 방식)** | extreme | Hover-capable Mode = `width>=768` + `(hover:hover && pointer:fine)` · Tap Mode = `width<768` 또는 capability 미감지 · Keyboard Mode = 최근 입력이 Tab 계열 | **결정 2 의 진원지.** 폭을 고정하고 입력만 바꾸면 이 정의가 즉시 틀려지므로 768 은 입력 방식의 대리 변수다. 코드는 이미 두 축을 AND 로 묶었지만(`resolveInteractionMode`, `src/features/landing/grid/use-landing-interaction-controller.ts:71-77`) 생명주기 판정은 폭 단독이다(`const isMobileViewport = viewportTier === 'mobile'`, 같은 파일 157행 · `resolveLandingViewportTier` 는 `viewportWidth<=767`, `src/features/landing/grid/layout-plan.ts:63-66`). 즉 **모드는 두 축, 생명주기는 한 축** — 이 불일치가 900×1200 프로브에서 `tier=tablet, mode=tap, layer=desktop-overlay` 라는 관측을 낳았다. 분리: 입력 축은 capability 단독 판정으로, 폭은 레이아웃 전용으로 |
| 2-T7 | 40–41 | behavior | shared | — | medium | Landing Ingress Flag(`scoring1` preview A/B 선택 후 유입의 variant-scoped 세션 레코드, 7분 만료는 future) · Runtime Entry Commit 경계 | 순수 동작. 단 「A/B 로 선택한 뒤」라는 구절이 진입 제스처를 정의에 포함시킨다 — 동작 정의는 「landing 에서 사전 응답이 발생했다」로 충분하고 그 응답이 어떤 제스처로 만들어지는지는 인터랙션 계약의 몫 |
| 2-T8 | 42–43 | behavior | shared | — | medium | Question Index(canonical 1-based) 와 User-facing Q Label(scoring order) 의 축 분리 | 순수 동작. 유지 |
| 2-T9 | 44–46 | behavior | shared | — | medium | Transition Correlation · Internal Transition Signal(telemetry 아님) · CTA Action Identity(label 과 무관) | 순수 동작. 46행이 스스로 「label 선택 문제가 아니라」고 못박은 것은 정확한 분리다 — 문서 2분할의 본보기로 쓸 만하다 |
| 3.1 | 51–55 | meta | shared | — | medium | 충돌 우선순위: §4 Invariants > §5 Routing > §6~13 > §15 Exception | 문서를 동작/인터랙션 2부로 가르면 우선순위 사슬도 2개가 된다. 교차 충돌(인터랙션 계약이 동작 불변식을 건드릴 때)의 판정 규칙을 새로 써야 한다 |
| 3.2 | 58–76 | meta | shared | — | extreme | 단일 UI 정책 변경 시 동시 갱신해야 하는 섹션쌍 19개 목록 | **문서 분할의 최대 장애물.** 19개 중 다수가 동작과 인터랙션을 가로지른다(예: 68행 「Desktop hover-out collapse 경계/유예 → §8.2, §14.2」는 순수 인터랙션, 70행 「전환 종료 이벤트 시점/필수필드 → §8.6, §12.1…」은 인터랙션 시점과 telemetry 스키마를 한 줄로 묶는다). 분할 설계는 이 19줄을 먼저 재매핑하지 않으면 시작할 수 없다 |
| 3.3 | 79 | meta | shared | — | high | 단일 해석 불가 시 릴리스 정지 후 옵션·근거를 문서에 추가 | 유지. 단 「구현자가」라는 주어가 사람을 지목한다 |
| 3.3.1 | 81–98 | meta | shared | — | high | AR-001 Transition Terminal Timing(Option B 선택) · AR-002 Empty Tags Slot(Option B 선택) | AR-002 는 §6.7 1) 325행과 한 몸이다 — 분할 시 같은 쪽으로 가야 한다. AR-001 은 §8.6·§12 와 한 몸이라 반대쪽 |
| 4.1-a | 104–107 | behavior | shared | — | low | locale prefix 1회 · root layout 이 html/body 소유 · locale layout 은 검증 전용 · 모든 페이지는 `[locale]/**` 하위 | 순수 동작. 유지. 모바일 전용 경로(결정 5)를 만들어도 이 넷은 그대로 성립한다 |
| 4.1-b | 108 | mixed | shared | — | high | Expanded 에서 콘텐츠 crop/clip 으로 식별 불가 상태를 만들면 안 된다 | behavior = 「Expanded 의 콘텐츠는 읽을 수 있어야 한다」. interaction/구현 = 「crop/clip 을 쓰지 말라」. 절대 불변식(§4)에 구현 금지가 들어가 있어, 내부 스크롤을 쓰는 모바일 바텀시트(Material 3 표준)가 이 불변식에 걸릴 여지를 남긴다. 현재 그 여지를 막는 것은 §6.7 5) 369행의 「동일 가독성을 보장하는 동등 구현은 허용한다」 단서 하나뿐이다 — 개정 시 이 단서를 불변식 본문으로 올려야 한다 |
| 4.1-V | 110–111 | meta | shared | — | medium | 검증은 §14.2 Detailed QA Matrix 단일 게이트 | §14.2 는 본 맵 범위 밖(508행 이후). 분할 시 QA 매트릭스도 2부로 갈라지는지 확인 필요 |
| 5.1 | 116–122 | behavior | shared | — | medium | 루트/locale 레이아웃 책임 분리, locale layout 은 redirect·route branching·content fetch 금지 | 순수 동작. 모바일 전용 화면을 도입해도 유지 |
| 5.2 | 125 | behavior | shared | — | low | 최종 URL 은 `/{locale}/...`, locale 세그먼트 정확히 1회 | 유지 |
| 5.3 | 131–144 | behavior | shared | — | medium | proxy 단일 진입 · 쿠키→Accept-Language→defaultLocale 순 · locale-less allowlist(`/blog`·`/blog/[variant]`·`/history`·`/test/[variant]`) · duplicate prefix 는 404 | 순수 동작. **결정 5 가 모바일 전용 경로를 추가하면 139행 allowlist 가 갱신 대상**이다 — 지금 목록에 없는 경로는 locale 주입 없이 404 로 떨어진다 |
| 5.4 | 151–162 | behavior | shared | — | high | typed route helper 강제 · `RouteBuilder.blog()`/`blogArticle()` 분리 · blog detail 의 SSOT 는 route variant 뿐 · `as Route` 캐스팅 금지 | 순수 동작. 모바일 전용 상세 화면을 만들면 RouteBuilder 에 메서드가 늘고 160행 「pending transition 은 보조 신호로만」이 그대로 적용된다 — 개정 부담이 작다 |
| 5.5 | 169–171 | behavior | shared | — | low | segment 404 와 global unmatched 404 2층 분리 | 유지 |

---

## 표 B — §6 Information Architecture & Layout (179–417행)

| id | 행 | kind | mobileScope | widthKeyed | 강제도 | 요약 | 분리 제안 · 근거 |
|:---|:---|:---|:---|:---|:---|:---|:---|
| 6.1-a | 183–184 | visual | shared | 768·1024 (화면 크기) | medium | Container max-width `1280px` · side padding Desktop/Tablet `24px`(좁은 폭 `20px`)·Mobile `16px` | 폭이 진짜로 공간을 뜻한다 — 입력을 바꿔도 참이다. 유지. 다만 「좁은 폭」의 실제 경계 `899` 는 코드에만 있고 문서에 없다(`NARROW_PADDING_MAX_VIEWPORT_WIDTH = 899`, `src/features/landing/grid/layout-plan.ts:7`) |
| 6.1-b | 185 | mixed | shared | **768·1024 (두 뜻을 겸함)** | extreme | Breakpoints: Mobile `0~767` · Tablet `768~1023` · Desktop `>=1024` | **한 축이 두 일을 한다.** 열 수·padding 에는 화면 크기로, §2 T6·§6.7 3)·§7.6-a 에는 입력 방식의 대리로 쓰인다. 결정 2 가 요구하는 개정의 최소 단위가 바로 이 한 줄이다. 분리: 이 breakpoint 는 레이아웃 전용으로 좁히고, 입력 축(`(hover:hover and pointer:fine)` 여부)을 동급 1차 축으로 신설한 뒤, 지금 폭을 인용하는 모든 인터랙션 조항의 인용처를 입력 축으로 옮긴다 |
| 6.2-a | 193 | behavior | shared | gridInlineSize (화면 크기) | medium | 컬럼 판정 SSOT 는 `.landing-grid-container` 의 measured grid inline-size, `window.innerWidth - padding` 추정 금지 | **보존 권고.** 측정 기반이라 iOS 주소창 접힘 같은 **높이만의 변동이 plan key 를 흔들지 않는다** — `measureGridInlineSize` 가 `clientWidth` 만 읽고(`src/features/landing/grid/landing-catalog-grid.tsx:40-42`) plan 은 tier·gridInlineSize·cardCount 로만 만들어진다(같은 파일 56–64행). 모바일 리팩터에서 이 성질은 반드시 지켜야 한다 |
| 6.2-b | 194–199 | behavior | desktop-only | 1040·1160 (화면 크기) | high | hero/main 은 row index 해석 · Wide(`>=1160`) Row1=3/Row2+=4 · Medium(`1040~1159`) Row1=2/Row2+=3 · Two-column(`<1040`) 전 row 2 · Row1 미달 시 끌어올림 | 모바일 무관. 폭이 공간을 뜻하므로 유지 |
| 6.2-c | 200–201 | visual | desktop-only | 동상 | high | underfilled 마지막 row 도 목표 컬럼 폭 유지·시작측 정렬 · 잔여 영역 해소용 카드 폭 확장 금지 | 모바일 무관 |
| 6.2-d | 202 | visual | mobile-only | 화면 크기 | medium | Mobile 1열, vertical gap `14~16px` | **결정 5 의 직접 제약.** 1열 고정이 모바일 IA 재설계의 전제를 미리 묶는다. 실측 3,173px = 3.76 화면(390px)의 구조적 원인이 이 한 줄 + 카드 255px 높이다 |
| 6.2-e | 203 | mixed | shared | gridInlineSize (화면 크기) | high | Expanded 활성 중 폭 변경으로 재계산이 필요하면 활성 Expanded 를 **강제 종료**해 Normal settled 복귀 후 1회 재계산 | behavior = 「재측정은 Normal settled 에서만 한다」. interaction = 「사용자가 열어둔 것을 닫는다」. 후자가 모바일에서 문제다 — 회전(orientation change)은 폭을 바꾸므로 이 규칙이 발동해 **열린 카드가 사라진다.** iOS HIG·Material 3 모두 회전에서 열린 시트의 상태 유지를 표준으로 둔다. 분리 후 모바일은 「유지하고 재레이아웃」으로 재작성 권고 |
| 6.3 | 214 | visual | shared | — | low | Hero 는 입력 없는 정보 영역, outline/border/stroke 금지 | 유지 |
| 6.4-a | 218–220 | mixed | shared | 768 (화면 크기) | medium | sticky top `0` · z-index `>=1000` · 높이 Desktop/Tablet `64`·Mobile `56` · `scrollY>4px` 에서 얕은 shadow, 없으면 `1px divider` | 코드 일치 확인: `gnb-desktop hidden h-16 md:flex` / `gnb-mobile flex h-14 md:hidden`(`src/features/gnb/site-gnb.tsx:40-41`) = Tailwind `md` 768px 폭 단독, h-16/h-14 = 64/56px. `scrollY > 4`(`src/features/gnb/hooks/use-gnb-capability.ts:36`). behavior = sticky·z·elevation 임계. visual = 높이·shadow. **모바일 56px 는 safe-area 를 포함하지 않는 값**이라 노치 기기 실효 높이는 다르다(실제 렌더 값 미확인) |
| 6.4-b | 221–223 | behavior | desktop-only | — | medium | Desktop Landing = CI·메뉴·설정 트리거(햄버거 금지) · Blog/History = Back 없는 일반 GNB · Test = Back+Timer 만 | 모바일 무관 |
| 6.4-c | 224–230 | mixed | desktop-only | **1024 (입력 방식)** | extreme | 설정 레이어 기본 열기는 hover(`>=1024`), 포인터 미감지 시 focus/click fallback · 닫기는 Esc·outside·focus out · hover gap 금지, 실효 gap `0px` · 닫힘 유예 `100~180ms` 는 hover 경로에만 · focus out 지연 `<=1 frame` · Esc/outside/focus out 에는 유예 금지 | 코드: `viewportWidth >= DESKTOP_SETTINGS_HOVER_MIN_WIDTH && hoverCapable`, 상수 `1024`(`src/features/gnb/behavior.ts:8-13`, `:2`). 즉 **코드는 이미 폭 AND capability 지만 문서는 폭을 1차 조건으로, capability 를 「포인터 감지 불가 환경」이라는 예외절로 적었다** — 표현이 뒤집혀 있다. 1024 는 공간이 아니라 「hover 를 쓸 만한 기기」의 대리다. 분리: behavior = 「설정 레이어는 열림/닫힘 2상태이며 Esc·바깥 입력·focus out 으로 닫히고 닫힘 시 포커스는 트리거로 복귀한다」, interaction = 「hover 가능한 입력에서 열기 제스처는 hover, 유예 100~180ms, 실효 gap 0px」. 폭 조건은 삭제 |
| 6.4-d | 231–236 | mixed | mobile-only | — | high | 햄버거 우측 끝 `16px` inset · fixed overlay + backdrop 전체 dim · solid 패널 · GNB 포함 전 요소 상위 레이어, 상단 클리핑 금지 · body scroll lock · backdrop 탭으로 닫기 · unlock 은 close transition 종료 시점 | behavior = overlay 존재·scroll lock·unlock 시점. interaction = backdrop 탭·dim·레이어. **표준 대비 누락 2건**: ⑴ 명시적 닫기 컨트롤(X)이 없고 ⑵ 스와이프 닫기가 없다. backdrop 탭 단독은 WCAG 2.5.7 Dragging Movements 는 통과하지만(드래그를 요구하지 않으므로), 패널이 화면 대부분을 덮을 때 남는 backdrop 이 WCAG 2.5.8 의 24px 하한을 넘는지는 실측 미확인 |
| 6.4-e | 237–239 | mixed | mobile-only | — | extreme | 패널 외부 입력은 `pointer down` 시점에 닫힘 **시작** · 스크롤 제스처로 판정되면 취소 · 닫힘 transition 중 추가 닫힘 입력 무시 | behavior = 「바깥 입력은 닫는다」+「닫힘은 idempotent 하다」. interaction = 「시작 시점이 pointerdown 이다」+「스크롤이면 취소한다」. **pointerdown 닫힘은 플랫폼 관용에 어긋난다** — iOS HIG·Material 3 모두 탭(=pointerup)을 확정 시점으로 두고, pointerdown 기준은 누른 뒤 마음을 바꾼 입력을 되돌릴 수 없게 만든다. 문서는 스크롤 취소만 규정하고 「눌렀다가 패널 안으로 끌고 들어온 경우」를 규정하지 않는다. 취소 임계값 `10px` 은 문서에 없고 코드에만 있다(`MOBILE_MENU_SCROLL_CANCEL_THRESHOLD_PX = 10`, `src/features/gnb/behavior.ts:6`) |
| 6.4-f | 240 | behavior | mobile-only | — | medium | 닫힘 완료 후 포커스는 햄버거 트리거로 복귀 | **보존 권고.** WCAG 2.4.3 Focus Order 를 만족하는 올바른 조항이다 |
| 6.4-g | 241 | behavior | mobile-only | — | high | Mobile Landing 최하단 설정 컨트롤은 언어/테마 **2개만** 허용 | **결정 5 를 직접 막는다.** 모바일 전용 설정 화면·시트를 만들 수 없고, 설정 항목이 늘어날 자리가 문서 차원에서 봉쇄돼 있다 |
| 6.4-h | 242–244 | behavior | mobile-only | — | high | Mobile Test 는 Back+Timer 만, instruction/question/result 전 상태 동일 · 햄버거·설정 레이어·언어/테마 비노출 · Back 은 `history.back` 우선, 불가 시 `/{locale}` | **표준 UX 저해 후보.** 테스트 중 테마를 바꾸려면 테스트를 이탈해야 한다. 야간에 밝은 테마로 테스트를 시작한 사용자에게 탈출구가 없다. behavior(Back 폴백)와 interaction/IA(무엇을 노출하지 않는가)를 갈라야 한다 |
| 6.4-i | 245–246 | behavior | shared | — | low | Mobile Blog = Back+햄버거, 설정 컨트롤은 Landing 과 동일 · History 는 Blog 와 동일 컨텍스트 | 유지 |
| 6.4-j | 247 | mixed | desktop-only (문면) | **768 (입력 방식)** | high | Landing keyboard entry: **desktop/tablet 에서** 첫 `Tab` 은 첫 enterable card, 첫 카드에서 `Shift+Tab` 은 마지막 visible GNB control · Blog/History/Test 는 native order 유지 | **§7.6-g(480–481행)와 모순.** §7.6 은 폭 한정 없이 「Landing 컨텍스트에서는」이라 하고 복귀 대상으로 「Mobile menu」를 명시한다. 코드는 모바일을 구현하고 있다 — `isMobileViewport ? ['[data-testid="gnb-mobile-menu-trigger"]', …] : […]`(`src/features/landing/grid/use-landing-keyboard-entry.ts:38-40`). 즉 6.4-j 쪽이 좁고 낡은 조항이다 |
| 6.4-k | 248–249 | mixed | shared | — | medium | 언어 변경은 Desktop 설정 레이어 내부만·Mobile 햄버거 최하단만 · 테마는 최초 system-follow, 수동 변경 후 `light|dark` 를 localStorage 고정 | behavior = 테마 저장·해석 정책(유지). IA = 컨트롤이 놓일 자리(재설계 대상). 위치 고정이 6.4-g 와 겹쳐 모바일 설정 IA 를 두 번 못박는다 |
| 6.5-a | 261 | visual | shared | — | medium | Normal 슬롯 순서 `cardThumbnail → cardTitle → cardSubtitle → tags` | 유지 가능. 다만 모바일 전용 레이아웃(가로형 리스트 아이템 등)을 쓰면 이 순서가 시각 순서와 어긋난다 — 「DOM 순서」인지 「시각 순서」인지 미규정 |
| 6.5-b | 262 | mixed | shared | — | extreme | Normal/front 에서 Start·A/B answerChoice 같은 entry CTA 를 렌더링하지 않는다 · Blog `Read more` 는 whole-card link 내부의 **비상호작용** 시각 affordance 로만 허용 | **표준 UX 저해 최상위 후보.** 목록 항목에서 곧바로 행동하는 것(리스트 = 탭 = 행동)이 모바일 웹의 기본형인데, 이 줄이 그것을 금지해 반드시 한 단계를 거치게 만든다. 실측과 결합하면 비용이 드러난다 — 390px 에서 첫 카드 top 315px, 문서 3,173px = 3.76 화면이므로 아래쪽 카드는 스크롤 + 확장 탭 + 다시 CTA 탭을 요구한다. behavior = 「진입은 명시적 사용자 행동을 요구한다」. interaction = 「그 행동은 Normal 상태에서는 불가능하다」 — 후자만 걷어내면 sticky CTA·리스트 직접 진입 같은 표준 패턴이 열린다 |
| 6.5-c | 263–265 | behavior | shared | — | medium | Expanded 공통 헤더는 `cardTitle` 만 · Test Expanded 는 `subtitle/thumbnail/tags` 제거(숨김 아님) · Blog 는 Expanded 슬롯 미렌더 | behavior 로 분류하되 「무엇을 보여주지 않는가」는 IA 결정이다. 모바일 전용 상세 화면에서는 썸네일을 남기는 편이 표준(맥락 유지)이므로 재검토 대상 |
| 6.5-d | 266–267 | behavior | shared | — | low | `cardThumbnail` 은 슬롯 이름일 뿐, asset 결정 입력은 오직 `variant` · fallback 도 variant 규칙 안에서 | **보존 권고.** 데이터 경계가 깨끗하다 |
| 6.5-e | 268,270–273 | behavior | shared | — | medium | Test Expanded = `previewQuestion`·`answerChoiceA/B`·`meta(3)` · canonical consumer shape 고정 · source 는 `scoring1` projection, resolver 가 주입 · UI 컴포넌트 내부 분산·raw fixture 직접 참조 금지 | 순수 동작. 동작 계약 문서로 이관. 표면이 바뀌어도 consumer shape 는 그대로 쓸 수 있어 개정 부담이 낮다 |
| 6.5-f | 269,274 | mixed | shared | — | extreme | Test entry 는 Expanded 의 `answerChoiceA/B` 에서**만** 시작 가능 · Blog entry 는 Normal card 의 whole-card article link 에서**만** 시작 가능 | **진입 지점을 상태에 못박은 두 줄.** 결정 5(바텀시트·전용 상세 화면·스텝 분할)를 도입하면 즉시 거짓이 된다. 분리: behavior = 「landing 에서의 test 진입은 사전 응답(pre-answer)을 만드는 행위여야 한다」(=텔레메트리·ingress 계약이 기대는 실질), interaction = 「그 행위는 Expanded 상태의 A/B 버튼이다」. 후자만 삭제하면 계약 손실 없이 표면이 열린다 |
| 6.6-a | 282 | mixed | desktop-only | — | high | Desktop/Tablet Normal title 은 normal inline-size 기준 wrap-based 1줄 clamp + overflow 시 ellipsis 노출 필수 | behavior = 없음(순수 표시). visual/interaction = clamp 방식. 「wrap-based」가 구현 방식까지 지정한다 |
| 6.6-b | 283–284 | mixed | desktop-only | — | extreme | Expanded title 은 ellipsis 없이 전문 표시하되 **첫 줄은 widened 폭이 아니라 Normal title 폭 기준 split 결과를 유지** · 나머지는 첫 줄 아래에서만 reveal, 첫 줄 continuity 를 깨는 재래핑 금지 | **문서에서 구현 자유도를 가장 깊게 빼앗는 시각 조항.** 전용 continuity 장치를 강제한다(저장소에 `src/features/landing/grid/landing-card-title-continuity.tsx` 가 존재하고 208행에 자체 ResizeObserver 를 둔다). 모바일 전용 상세 화면에서는 「Normal title 폭」이라는 기준값 자체가 없어 조항이 무의미해진다. 분리: behavior = 「제목은 상태 전환에서 잘리지 않는다」, interaction = 첫 줄 continuity 연출(hover-capable 표면 한정) |
| 6.6-c | 285 | interaction | mobile-only | — | medium | Mobile title 은 Normal/OPENING/OPEN/CLOSING 전 상태에서 전문 표시, ellipsis 금지 | **보존 권고.** 모바일에서 제목을 자를 이유가 없다 |
| 6.6-d | 286–287 | mixed | shared | — | high | Desktop/Tablet Normal subtitle 최대 2줄 + overflow 시 ellipsis 시각 노출 필수 · Mobile Normal subtitle 은 전문 표시, clamp/ellipsis 금지 | 모바일 전문 표시가 3.76 화면(실측)의 직접 기여 요인 중 하나다. 결정 5 로 카드 밀도를 재설계하면 이 줄을 다시 열어야 한다. behavior = 「부제는 어느 표면에서도 동일 source 다」, visual = 줄 수 정책 |
| 6.6-e | 288 | behavior | shared | — | medium | Normal subtitle overflow 처리 결과가 형제 슬롯(썸네일/태그) inline-size 를 바꾸면 안 된다 | **보존 권고.** 측정 가능한 기하 불변식이다 |
| 6.6-f | 289–293 | mixed | shared | — | extreme | tags 1줄 nowrap · 가시 태그는 원본 순서의 단일 prefix, 재배열 금지 · BQ-32 마지막 가시 태그만 `--tag-min-width:56px` 까지 말줄임, 짧은 태그는 전부/숨김만 · 폭 확대 시 같은 prefix identity 로 suffix 재mount, tail 전개는 CSS 소유·JS 는 count 만 · Blog `Read more →` 는 Desktop/Tablet hover/focus reveal·Mobile 항상 표시, CTA 폭을 태그보다 먼저 예약 · 숨긴 suffix 는 DOM/a11y 에서 unmount, probe 는 `aria-hidden`+`inert`, `coming soon` 은 상시 가시 | 5줄이 한 덩어리로 측정 알고리즘까지 규정한다. behavior = 「가시 태그는 원본 순서의 prefix 이고 재배열하지 않는다」+「숨긴 태그는 접근성 트리에 없다」+「`coming soon` 은 항상 노출된다」 — 이 셋은 지킬 값이다. 나머지(56px·CSS/JS 소유 분리·probe 방식·CTA 폭 예약)는 데스크톱 구현 계약. 모바일에서는 `Read more` 가 항상 표시라 예약 규칙의 조건절 자체가 성립하지 않는다 |
| 6.6-g | 294–297 | behavior | shared | — | medium | Expanded Test preview/choices 줄바꿈 허용·truncate 금지 · subtitle 미렌더 · choices 는 버튼 내부 좌측 정렬, 줄 수 제한 없음, truncate/ellipsis/clamp 금지 | **보존 권고.** 선택지 텍스트 절단은 오답을 유발하므로 이건 UX 근거가 있는 금지다 |
| 6.6-h | 298–300 | behavior | shared | — | high | Landing Expanded Blog subtitle 은 같은 `subtitle` 을 continuity 있게 4줄까지 · Normal 2줄과 **같은 source text** 재사용, 보조 소스·요약·후처리 금지 · 제거된 blog 전용 필드 재유입 금지 | 순수 동작(데이터 소스 단일성). 유지 |
| 6.6-i | 301–303 | visual | shared | — | medium | Expanded meta/CTA overflow 시 truncate · Normal/Expanded 간 대표 폰트 1종 유지, 상태별 분기 금지 · 폰트는 `ko`·`en` locale 별 각 1종 + 공통 fallback | **i18n 압력이 미해결로 남아 있다.** 저장소는 12 locale 을 지원하는데(`AGENTS.md` §1 Runtime surface) 이 줄은 `ko`·`en` 둘만 말한다. `zs`/`zt`/`ja`/`hi`/`ru` 의 대표 폰트가 문서에 없다 |
| 6.7-1 | 319–325 | mixed | shared | — | high | Normal 은 content-based compact(auto) + same-row equal-height stretch · 축 정렬 설정으로 stretch 를 깨지 말 것(`min-height:100%` 또는 동등) · 마지막 슬롯은 `tags` 고정 · tags 하단 동적 spacer/margin/pseudo 금지 · equal-height 잔여는 tags 상단에서만 · tags 가 비어도 1줄 높이 유지, chip 렌더 `0` | behavior = 「빈 태그에 chip 을 만들지 않는다」(a11y·DOM 계약, AR-002 와 한 몸). visual = 1줄 높이 유지·잔여 배분 위치. **same-row equal-height 는 1열 모바일에서 자기 자신과의 비교라 항상 자명하게 참** — 문면은 shared 지만 실효는 desktop-only |
| 6.7-2 | 327–343 | mixed | desktop-only (효과) | — | extreme | `base_gap + comp_gap` 이원 정책 · `comp_gap = actual_gap - base_gap` · `needs_comp(card_i) = (natural_height_i < max(natural_height_row))` · `needs_comp=false` 는 전이 중 **단 1프레임도** `comp_gap>0` 금지 · row index 무관 · `margin-top:auto`·`space-between`·filler flex·pseudo spacer 및 동등 메커니즘 금지 · whole px 정규화 · `document.fonts.ready`·후속 font loading·resize·payload 변화에서 재측정 · Mobile OPENING/OPEN/CLOSING 및 Desktop active/frozen/cleanup/handoff 중 spacing write 중단 | **문서에서 가장 길고 가장 구현을 묶는 블록(17줄).** `needs_comp` 는 1열에서 `natural_height_i == max(natural_height_row)` 이므로 **모바일에서는 항상 false, 즉 전 카드 `comp_gap=0`** — 329행이 Mobile 을 명시해 문면은 shared 지만 실효는 desktop-only 다. 그리고 339행이 CSS 표준 해법(`margin-top:auto`·`space-between`)을 이름으로 봉쇄하고 JS 측정을 사실상 강제한다. 분리: behavior = 「같은 row 의 카드는 바닥이 맞고 그 보정은 결정적이며 재실행에 안정적이다」. 나머지 전부는 hover-capable 표면의 구현 계약 |
| 6.7-3 | 345–355 | interaction | desktop-only | **Desktop/Tablet 라벨 (입력 방식)** | extreme | Expanded 높이 정책은 Desktop/Tablet 만(Mobile 은 full-bleed) · fixed height 금지 · settled 는 content-fit, 하단 잔여 금지 · 초장문은 페이지 스크롤로 수용 · Expanded 슬롯이 same-row non-target 의 row track sizing 에 영향 금지 · 활성 중 non-target top/bottom/outer height 오차 `0px` · Row1 규칙을 row2+ 에 동일 적용 · 종료 후 잔류 변화 `0px` · non-target 복귀 전 Normal settled 판정 금지 | 명시적 Desktop/Tablet. **결정 2 적용 시 hover 없는 `>=768` 기기가 모바일 생명주기로 넘어가면 이 11줄과 §6.7 검증 8·9·12·13 이 그 기기에서 주체를 잃는다.** 최소 수정은 「Desktop/Tablet」을 「hover-capable 표면」으로 바꾸는 것 |
| 6.7-4 | 357–365 | interaction | desktop-only | **Desktop/Tablet 라벨 (입력 방식)** | extreme | baseline freeze/release 상태모델 필수 · `BASELINE_READY → BASELINE_FROZEN → BASELINE_READY` 이탈 금지 · 해제 지연은 release timer lock 으로만 · 시작 시 즉시 freeze, 종료 정착 전 해제/재측정 금지 · 해제는 종료 직후 1회 · 활성/handoff/instant 종료 중 재측정 금지 · 폭 변경 시 강제 종료 후에만 재측정 · handoff 의 row A snapshot 은 row B settled 직후에만 해제 | 6.7-3 과 동일. 이 상태모델은 데스크톱 그리드의 row 개념에 전적으로 의존하므로 모바일 표면에는 대응물이 없다 |
| 6.7-5 | 367–369 | mixed | shared | — | high | 전환 중 동일 카드가 Normal/Expanded 로 동시에 보이면 안 됨 · Expanded 가 다른 row 를 덮는 것은 허용 · 식별성을 해치는 clipping(`overflow:hidden` 기반 crop 포함) 금지, **단 동일 가독성을 보장하는 동등 구현은 허용** | §4.1-b 와 한 쌍이다. 369행 뒷단서가 모바일 시트의 내부 스크롤을 허용하는 **유일한 근거**이므로, 개정 시 이 단서를 §4 불변식 본문으로 끌어올려야 한다. behavior = dual-visibility 금지(결정론). interaction = 덮기 허용·clipping 금지 |
| 6.8-a | 389 | visual | shared | — | medium | Normal thumbnail width `100%` · ratio `16 / 6` · `object-fit: cover` (왜곡 금지) | 값은 R(제품이 실제로 렌더). 이 줄에 BQ-22 사고 경위 3문장이 붙어 있다 — 규칙 문서에 사건 서술이 들어간 사례로, `AGENTS.md` §9 「규칙 문서에는 불변식만」과 충돌한다. 분할 시 경위는 `docs/DECISIONS.md` 로 보내고 값만 남기는 것이 옳다 |
| 6.8-b | 390–392 | behavior | shared | — | medium | Normal 슬롯 기하는 subtitle overflow 와 독립 · Expanded 제거 대상은 시각 숨김이 아니라 미렌더링/AT 비노출 · front/back title 불일치 금지 | **보존 권고.** 「시각 숨김이 아니라 AT 비노출」은 a11y 상 올바른 구분이다 |
| 6.8-c | 393–396 | behavior | shared | — | medium | Test Expanded `meta` 3개 고정, 키는 `durationM`·`sharedC`·`engagedC` 만, 라벨만 분기, non-interactive · 별도 Start CTA 금지 · preview/answer CTA 는 canonical payload 만 · A/B 선택이 landing pre-answer·ingress 를 만드는 **유일한** landing-side entry | 뒷줄(396)은 6.5-f 와 같은 못이다 — 두 곳에 같은 제약이 있어 개정 시 동시 갱신 대상 |
| 6.8-d | 397–399 | behavior | shared | — | medium | Blog 는 Expanded `meta`/`primaryCTA` 미렌더, `Read more` 는 비상호작용 affordance, Blog entry 는 pending transition·return restoration 만 생성 · meta 수치 축약(`k`/`m`) 금지, 3자리 `,` 구분 · 카드 텍스트는 활성 locale, 누락 시 default fallback | 순수 동작. 유지 |
| 6.9 | 408–413 | visual | shared | — | medium | 테마는 고정 색상표가 아니라 의미 토큰 + 대비 기준 · 다크모드는 Landing/Test/Blog/History 전부 일관 · Normal/Expanded 동일 적용 · Expanded 핵심 요소(컨테이너·본문) 필수 · 보조요소는 권장이되 릴리스 게이트 검증 대상 | **측정 가능한 규범이 비어 있다.** 「대비 기준으로 정의한다」고만 하고 수치를 쓰지 않는다 — WCAG 1.4.3(본문 4.5:1·대형 텍스트 3:1)과 1.4.11(비텍스트 3:1)을 명시하면 그대로 자동 게이트가 된다. 그리고 「권장」과 「릴리스 게이트 검증 대상」이 한 문장 안에서 충돌한다 |

---

## 표 C — §7 State Model (421–505행)

| id | 행 | kind | mobileScope | widthKeyed | 강제도 | 요약 | 분리 제안 · 근거 |
|:---|:---|:---|:---|:---|:---|:---|:---|
| 7.1 | 424–427 | behavior | shared | — | high | PageState `ACTIVE`·`INACTIVE`·`REDUCED_MOTION`·`SENSOR_DENIED`·`TRANSITIONING` · CardState `NORMAL`·`EXPANDED`·`FOCUSED` + Override `HOVER_LOCK` · 우선순위 `INACTIVE > REDUCED_MOTION > TRANSITIONING > EXPANDED > HOVER_LOCK > NORMAL` | **hover 전용 개념이 상태 집합의 1급 시민이다.** hover 없는 기기에서는 영구히 비활성인 override 가 우선순위 사슬 한가운데 박혀 있다. 입력 축 재설계 시 이 사슬을 다시 그려야 하고, `SENSOR_DENIED` 는 §1.3 이 배경 연출을 강도 0 으로 죽인 뒤 무엇을 가리키는지 본 범위에서 확인되지 않는다(미확인) |
| 7.2 | — | **결번** | — | — | — | `### 7.2` heading 이 존재하지 않는다(§7.1 다음이 §7.3, 423행 → 429행) | **dangling reference.** §7.7 496행이 「Section 7.2 우선순위 위반 전이 결과를 금지한다」로 §7.2 를 인용하지만, 우선순위는 실제로 §7.1 427행에 있다. 문서 재작성 시 인용처 교정 필요 |
| 7.3 | 431–433 | mixed | shared | — | high | INACTIVE = 입력 기반 카드 반응 중지·HOVER_LOCK 비활성·enter/leave/focus/click/keydown no-op · ACTIVE 복귀 램프업 `120~180ms`(기본 140), 램프업 중 확장/축소/오버레이 변경 금지 · TRANSITIONING = 스크롤/입력 잠금, 시작 프레임 상태 고정, leave/focusout collapse 금지 | behavior = 입력 무시·잠금·no-op. interaction = 램프업 140ms. **「TRANSITIONING: 스크롤 잠금」이 모바일에서 위험하다** — 전환이 느리거나 실패하면 사용자가 스크롤조차 못 하는 상태에 갇힌다. 모바일 웹 관행은 전환 중 스크롤을 잠그지 않거나 취소 경로를 두는 것이고, 이 문서에는 모바일 전환 취소 제스처(스와이프 뒤로가기 등)에 대한 규정이 본 범위 안에 없다 |
| 7.4 | 440–444 | behavior | shared | — | medium | 상태 전이는 입력 순서·이벤트 편차와 무관하게 결정적 · 동일 상관키 중복 실행은 동일 결과 · 재렌더/재마운트에도 canonical start 와 user-facing scoring label 관계 역전 금지 · `settled` 는 시간이 아니라 상태 기반으로 정의 | **보존 권고.** 자동 검증이 가능한 형태로 쓰여 있고 표면이 바뀌어도 그대로 산다 |
| 7.5-a | 450–453 | interaction | desktop-only | — (폭 아님 · capability 키) | high | HOVER_LOCK 활성 조건 = available 카드 Expanded 또는 unavailable 카드 hover · 비대상 카드 NORMAL 강제, dim/backdrop 금지, opacity `1.0` 고정 · 비대상 카드의 마우스 입력 반응 차단 | **문서에서 유일하게 폭이 아니라 입력 방식으로 올바르게 게이팅된 조항이다**(제목이 「Hover-capable only」). 개정의 본보기로 쓸 것. 다만 「dim/backdrop 금지」는 데스크톱 한정 미학 결정인데 모바일에는 backdrop 이 실제로 존재한다(`src/features/landing/grid/use-mobile-backdrop-gesture.ts`) — 두 표면의 규칙이 정반대라는 사실이 문서에 명시돼 있지 않다 |
| 7.5-b | 454–456 | behavior | shared | — | high | 키보드 모드 아님 → 비대상 카드 `tabIndex=-1` · 키보드 모드 → 비대상 카드에 `inert` 부여로 포커스/AT/활성화 차단 · 카드 간 handoff 는 대상 `CARD_FOCUS` 반영 후 React 가 `inert` 를 제거한 뒤 포커스를 queue 처리 | **hover 전용 절 안에 입력 방식 독립 규칙이 들어 있다.** 키보드 포커스 격리는 hover 여부와 무관하며 모바일(블루투스 키보드)에서도 필요하다. 분리: 이 3줄을 §7.5 에서 떼어 「Focus Containment Contract」로 승격하고 전 표면 적용으로 재작성 |
| 7.5-c | 457–458 | interaction | desktop-only | — | high | handoff 시 직전 카드 이탈 전이는 `0ms` 즉시 종료, 최종 대상만 전이 유지 · handoff 외 종료는 일반 복귀 모션 | 순수 모션. 인터랙션 계약으로 |
| 7.5-d | 459–462 | behavior | shared | — | medium | 키보드 모드 진입 = `Tab/Shift+Tab` 감지 · 종료 = `mousedown` 즉시 · `pointermove` 는 종료하지 않고 위치만 기록 · `wheel` 은 종료 입력 아님, 전역 keyboard-mode 종료 listener 금지 | 입력 방식 독립이므로 7.5-b 와 함께 승격 대상. **터치 미규정**: 터치는 브라우저가 `pointerdown` 뒤 합성 `mousedown` 을 보내므로 터치 탭이 키보드 모드를 종료시키는지가 조항으로는 우연에 맡겨져 있다(실제 런타임 동작 미확인) |
| 7.5-e | 463–464 | behavior | shared | — | low | `relatedTarget` 부재/비-Element/DOM 외부에서도 예외 없이 동작 · hover enter/leave 순서 역전·지연에도 최종 상태 결정적 | **보존 권고** |
| 7.6-a | 472 | mixed | desktop-only | **768 (입력 방식)** | extreme | 「Desktop/Tablet 카드 키보드 탐색은 아래 순차 규칙을 최우선으로 따른다. **Mobile lifecycle 은 본 override 대상이 아니다.**」 | **결정 2 의 직격탄.** hover 없는 900px 태블릿을 모바일 생명주기로 옮기면 이 한 문장 때문에 **키보드 순차 확장 계약 전체(472–483행, 12줄)가 그 기기에서 사라진다.** 블루투스 키보드를 붙인 태블릿은 흔하므로 WCAG 2.1.1 Keyboard 위험으로 직결된다. 분리: behavior = 「키보드로 도달 가능한 카드는 입력 방식과 무관하게 키보드로 확장·진입할 수 있다」(전 표면), interaction = dwell 취소·`0ms` handoff 같은 데스크톱 모션(hover-capable 한정) |
| 7.6-b | 473 | mixed | desktop-only | — | high | 포인터 capability 와 무관하게 `Tab/Shift+Tab` 으로 available Test 카드에 포커스가 닿으면 pending pointer intent 를 취소하고 dwell 없이 **즉시** Expanded | 「포인터 capability 와 무관하게」라고 스스로 말하면서 조항 제목은 Desktop/Tablet 로 폭을 건다 — 한 조항 안에서 축이 두 개다. behavior = 「키보드 포커스는 확장을 유발한다」. interaction = 「dwell 없이 즉시」·「pending pointer intent 취소」 |
| 7.6-c | 474–475 | behavior | shared | — | medium | Blog whole-card link 는 enterable 이지만 expandable 아님, 포커스는 링크에만 · unavailable 은 enterable/expandable 아니며 tab order 제외 | 순수 동작. 유지 |
| 7.6-d | 476 | behavior | shared | — | medium | Expanded Test 에서 다음 `Tab` 은 A/B 선택지로, 모두 순회 후 다음 enterable 카드로 | 순수 동작(포커스 순서). 유지 |
| 7.6-e | 477 | behavior | shared | — | high | Test trigger 의 `Enter/Space` 는 동일 Test 에 대한 **idempotent** `CARD_EXPAND` 이며 URL 이동·전환·pre-answer·telemetry·포커스 이동을 일으키지 않는다. Test 진입은 A/B 선택지만 소유한다 | **표준 UX 저해 후보.** 6.5-f·6.8-c 와 같은 못의 키보드판이다. 키보드 사용자는 포커스된 요소에서 `Enter` 를 누르면 행동이 일어날 것을 기대하는데(WAI-ARIA button pattern), 여기서는 `Enter` 가 이미 열린 것을 다시 여는 no-op 이 된다. 7.6-b 에 따르면 포커스만으로 이미 Expanded 이므로 `Enter` 는 실질적으로 언제나 no-op 이다 |
| 7.6-f | 478–479,482 | interaction | desktop-only | — | high | Test→Test handoff 는 source `0ms`/target 표준 모션 · Test→Blog 는 source 표준 close + Blog focus-only(Blog 를 handoff target 으로 만들지 않음) · `Shift+Tab` 역방향도 동일 · unavailable 은 `tabIndex=-1` 전 상태, 양방향 skip 하되 직전 카드 collapse-prior 유지 (BQ-26/D1) | 모션 부분은 인터랙션, skip/collapse-prior 는 동작 — 한 항목 안에 섞여 있다 |
| 7.6-g | 480–481 | mixed | shared | — | high | Landing 중립 상태에서 첫 forward `Tab` 은 첫 available 카드로 · 첫 available 카드 trigger 에서 `Shift+Tab` 은 마지막 visible GNB control(**Desktop settings / Mobile menu**)로 복귀 · 이 규칙은 landing 에만, Blog/History/Test 는 기본 GNB 순회 유지 | **§6.4-j(247행)와 모순.** 6.4-j 는 같은 규칙을 「desktop/tablet 에서」로 한정하는데 여기서는 폭 한정이 없고 Mobile menu 를 명시한다. 코드는 여기(7.6-g) 편이다 — `src/features/landing/grid/use-landing-keyboard-entry.ts:38-40`. 개정 시 6.4-j 를 폐기하고 이 조항으로 통일 |
| 7.6-h | 483 | meta | shared | — | high | 「본 규칙은 기존 키보드 관련 카드 전이 규칙을 override 한다」 | 우선순위 선언이 §3.1 이 아니라 본문에 박혀 있다. §3.1 의 우선순위 목록과 이 줄 중 어느 쪽이 이기는지 문서가 말하지 않는다 |
| 7.7 | 494–501 | behavior | shared | — | high | 허용 전이 집합 이탈 금지 · §7.2 우선순위 위반 결과 금지 · 동일 입력 시퀀스 재실행 시 최종 settled 동일 · 게이트 실패는 **UI 가시 동작 정상 여부와 무관하게** 릴리스 차단 | **보존 권고**(결정론 게이트는 표면이 바뀌어도 산다). 단 496행이 결번인 §7.2 를 인용한다 — 인용처를 §7.1 로 교정 |

---

## mixed 분리 제안 — 핵심 8건

문장을 그대로 인용하고 동작/인터랙션 경계를 어디에 그을지 적는다. 나머지 mixed 24건의 분리안은 위 표의 마지막 칸에 있다.

### M-1. §2 2-T6 (37–39행) — 모드 정의

> `| Hover-capable Mode | `width>=768` + `(hover:hover && pointer:fine)` |` · `| Tap Mode | `width<768` 또는 hover-capability 미감지 |`

**동작 부분**: 랜딩은 두 개의 상호배타 입력 모드를 가지며 SSR 초기값은 보수적인 쪽(Tap)이고 mount 후 동기화된다. **인터랙션 부분**: 각 모드가 어떤 제스처로 확장·진입·이탈을 처리하는가. **분리안**: 모드 판정을 `(hover:hover and pointer:fine)` 단독으로 재정의하고 폭 조건을 삭제한다. 폭은 레이아웃 축으로만 남긴다. 이렇게 하면 코드 쪽 수정은 `resolveInteractionMode` 의 `viewportWidth < 768` 분기 제거(`use-landing-interaction-controller.ts:71-77`)와, 폭 단독인 `isMobileViewport` 를 capability 기반으로 교체(같은 파일 157행)의 둘이다. 후자가 71개 분기(실측)의 의미를 한 번에 바꾸므로 0단계 구조 분리의 핵심 지점이 된다.

### M-2. §6.1-b (185행) — Breakpoints

> `- Breakpoints: Mobile `0~767`, Tablet `768~1023`, Desktop `>=1024``

**동작/레이아웃 부분**: 공간이 얼마나 있는가 — 열 수·padding·container. **인터랙션 부분**: 지금 이 줄이 부업으로 하고 있는 일, 즉 입력 방식 추정. **분리안**: 이 줄을 `LayoutBreakpoint` 로 개명해 레이아웃 전용임을 문면에 못박고, 별도로 `InputProfile` 축(`hover-capable` / `touch`)을 신설한다. 그 뒤 폭을 인용하는 모든 인터랙션 조항(2-T6·6.4-c·7.6-a)의 인용처를 `InputProfile` 로 옮긴다. **이 한 줄을 고치지 않으면 결정 2 는 구현할 수 없다** — 나머지 개정은 전부 이 축 분리의 하위 작업이다.

### M-3. §6.4-c (224–230행) — Desktop 설정 레이어

> `- Desktop 설정 레이어: 기본 열기 방식은 hover(`>=1024`), 포인터 감지 불가 환경에서는 focus/click fallback 허용.`

**동작 부분**: 설정 레이어는 열림/닫힘 2상태이고, `Esc`·바깥 입력·focus out 으로 닫히며, 닫힘 시 포커스는 트리거로 복귀한다. **인터랙션 부분**: hover 로 연다 · 유예 `100~180ms` · 실효 gap `0px` · focus out 지연 `<=1 frame` · Esc/outside/focus out 에는 유예 없음. **분리안**: 폭 조건(`>=1024`)을 삭제하고 hover 열기를 `InputProfile=hover-capable` 조건으로 옮긴다. 코드는 이미 `viewportWidth >= 1024 && hoverCapable`(`src/features/gnb/behavior.ts:8-13`)이므로 폭 항을 떼는 것이 곧 구현이다. **부수 효과 주의**: 폭 항을 떼면 hover 가능한 768–1023 창(데스크톱 브라우저 축소 창)이 hover 열기 대상이 된다 — 그것이 의도인지 결정이 필요하다.

### M-4. §6.4-e (237–239행) — 모바일 메뉴 바깥 입력

> `- Mobile Landing/Blog/History: 메뉴 확장 상태에서 패널 외부 영역 입력은 `pointer down` 시점에 닫힘을 시작해야 한다.`

**동작 부분**: 패널 바깥 입력은 메뉴를 닫고, 닫힘은 idempotent 하며(진행 중 추가 입력 무시), 닫힘 후 포커스는 트리거로 돌아간다. **인터랙션 부분**: 닫힘의 시작 시점이 `pointerdown` 이고, 이동이 스크롤로 판정되면 취소한다. **분리안**: 동작 계약은 「바깥 입력은 닫는다 · idempotent · 포커스 복귀」 셋만 남기고, 시작 시점을 `pointerdown` → **확정은 `pointerup`, 시각 피드백만 `pointerdown`** 으로 재작성한다. 미규정 케이스(눌렀다가 패널 안으로 끌고 들어옴)도 함께 정의한다. 그리고 취소 임계값 `10px` 이 코드에만 있으므로(`src/features/gnb/behavior.ts:6`) 어느 쪽 문서든 값을 명시해야 한다.

### M-5. §6.5-b + §6.5-f (262·269·274행) — 진입 지점을 상태에 못박은 세 줄

> `- Normal/front 상태에서는 Start, A/B answerChoice 같은 entry CTA를 렌더링하지 않는다.` · `- Test entry는 Expanded의 `answerChoiceA/B`에서만 시작할 수 있다.` · `- Blog entry는 Normal card의 whole-card article link에서만 시작할 수 있다.`

**동작 부분**: landing 에서의 test 진입은 **사전 응답(pre-answer)을 만드는 행위**여야 하고, 그 행위가 landing ingress 와 `card_answered` 를 생성한다. blog 진입은 pending transition 과 return restoration 만 만든다. — telemetry·ingress·복귀 계약이 실제로 기대는 것은 여기까지다. **인터랙션 부분**: 그 행위가 `Expanded` 라는 특정 상태 안의 특정 버튼이라는 것. **분리안**: 동작 계약은 「진입 행위의 종류와 그것이 만드는 레코드」로만 쓰고, 표면·상태·버튼 위치는 인터랙션 계약으로 옮긴다. **이 셋을 가르지 않으면 결정 5(바텀시트·전용 상세 화면·스텝 분할)는 계약 위반 없이는 불가능하다.**

### M-6. §6.6-b (283–284행) — Expanded title 첫 줄 continuity

> `- Desktop/Tablet Expanded title: ellipsis 없이 전체 title을 표시해야 하며, Expanded의 첫 줄은 widened expanded 폭이 아니라 **Normal title 폭 기준으로 계산한 첫 줄 split 결과**를 그대로 유지해야 한다.`

**동작 부분**: 제목은 상태 전환에서 잘리지 않으며 front/back 이 동일 텍스트다(§6.8-b 392행과 같은 실질). **인터랙션 부분**: 첫 줄이 그대로 남고 나머지만 아래로 펼쳐지는 연출. **분리안**: 인터랙션 계약으로 전부 이관하고 hover-capable 표면 한정으로 명시한다. 모바일 전용 상세 화면에는 「Normal title 폭」이라는 기준값이 없으므로 이 조항의 적용 대상이 아님을 문면에 적는다.

### M-7. §6.7-2 (327–343행) — comp_gap 이원 정책

> `- `needs_comp=false` 카드의 `comp_gap`은 항상 `0px`여야 하며, 전이 중 단 1프레임이라도 `comp_gap>0`이면 안 된다.` · `- 자동 여백/자동 분배 기반 보정(`margin-top:auto`, `justify-content: space-between`, filler flex, pseudo spacer 및 동등 메커니즘)을 보정 수단으로 사용하면 안 된다.`

**동작 부분**: 같은 row 의 카드는 바닥이 맞고, 그 보정은 결정적이며(같은 입력 → 같은 값), 재측정 트리거는 열거 가능하다. **인터랙션/구현 부분**: 판정식·프레임 단위 불변식·금지 CSS 목록·whole px 정규화·write 중단 구간. **분리안**: 동작 계약에는 첫 문단만 남긴다. 나머지는 hover-capable 표면의 구현 계약으로 옮기되, 옮기면서 **금지 목록을 결과 기준으로 바꾼다** — 「`margin-top:auto` 를 쓰지 말라」가 아니라 「`needs_comp=false` 카드는 잉여 여백을 갖지 않는다」로 쓰면 같은 보호를 유지하면서 표준 CSS 해법이 다시 후보가 된다. 모바일에는 이 블록이 적용되지 않음을 명시한다(1열에서 `needs_comp` 는 항상 false).

### M-8. §7.6-a (472행) — 키보드 순차 확장의 폭 게이트

> `**Rule**: Desktop/Tablet 카드 키보드 탐색은 아래 순차 규칙을 최우선으로 따른다. Mobile lifecycle은 본 override 대상이 아니다.`

**동작 부분**: 키보드로 도달 가능한 카드는 키보드로 확장·진입할 수 있고, 순회 순서는 결정적이며, unavailable 은 건너뛴다. **인터랙션 부분**: dwell 없이 즉시 확장 · pending pointer intent 취소 · `0ms` handoff · Test→Blog 처리. **분리안**: 동작 부분을 입력 방식·폭과 무관한 전 표면 규칙으로 승격한다. 그러지 않고 결정 2 만 적용하면 hover 없는 `>=768` 기기가 모바일 생명주기로 넘어가면서 키보드 확장 계약을 통째로 잃는다 — 이것이 이번 리팩터에서 **결정 2 가 만들어내는 유일한 회귀 위험**이며, 0단계 구조 분리 때 함께 처리해야 한다.

---

## widthKeyed 원장 — 14건과 각각의 진짜 의미

| 조항 | 폭 | 문서가 쓰는 뜻 | 실제 의미 | 근거 |
|:---|:---|:---|:---|:---|
| 2-T6 (37–38행) | 768 | 화면 크기처럼 서술 | **입력 방식** | 폭 고정·입력만 바꾸면 거짓이 됨. 코드는 두 축 AND(`use-landing-interaction-controller.ts:71-77`) |
| 6.1-a (184행) | 768·1024 | 화면 크기 | 화면 크기 (정당) | padding 은 공간 함수. 단 실경계 899 미등재(`layout-plan.ts:7`) |
| 6.1-b (185행) | 768·1024 | 화면 크기 | **둘 다 — 축이 겸직 중** | 열 수에는 공간, 2-T6·6.7-3·7.6-a 에는 입력 방식 대리 |
| 6.2-a (193행) | gridInlineSize | 화면 크기 | 화면 크기 (정당) | 측정 기반. `landing-catalog-grid.tsx:40-42` |
| 6.2-b (195–197행) | 1040·1160 | 화면 크기 | 화면 크기 (정당) | `layout-plan.ts:8-9` |
| 6.2-c (200–201행) | 동상 | 화면 크기 | 화면 크기 (정당) | — |
| 6.2-d (202행) | Mobile | 화면 크기 | 화면 크기 (정당하나 재설계 대상) | 1열 고정이 결정 5 의 전제를 묶음 |
| 6.2-e (203행) | gridInlineSize | 화면 크기 | 화면 크기 (정당) | 회전 시 강제 종료라는 **결과**가 문제이지 축은 맞음 |
| 6.4-a (218행) | 768 | 화면 크기 | 화면 크기 (정당) | `md:flex`/`md:hidden`, `site-gnb.tsx:40-41` |
| 6.4-c (224행) | 1024 | 화면 크기 | **입력 방식** | `viewportWidth>=1024 && hoverCapable`, `behavior.ts:8-13`, 상수 `:2` |
| 6.4-j (247행) | desktop/tablet | 화면 크기 | **입력 방식** (그리고 §7.6-g 와 모순) | `use-landing-keyboard-entry.ts:38-40` 은 모바일도 구현 |
| 6.7-3 (345–355행) | Desktop/Tablet | 화면 크기 | **입력 방식** | 블록 전체가 hover 확장 생명주기 전용 |
| 6.7-4 (357–365행) | Desktop/Tablet | 화면 크기 | **입력 방식** | baseline freeze 모델은 row 개념에 전적 의존 — 1열 모바일에 대응물 없음 |
| 7.6-a (472행) | Desktop/Tablet | 화면 크기 | **입력 방식** (그러나 키보드는 둘 다 아님) | 키보드는 폭·포인터 어느 축에도 속하지 않는 제3축 |

**축이 셋이라는 결론.** 이 문서는 폭 하나로 세 가지를 구분하려 한다 — 공간(열 수·padding·clamp), 포인터 방식(hover/tap), 그리고 키보드. 결정 2 는 앞의 둘을 가르지만 셋째는 여전히 어느 쪽에도 속하지 않는다. §7.5-b·§7.5-d·§7.6-a 의 키보드 규칙을 두 계약 어느 쪽에도 종속시키지 않는 독립 절로 빼는 것이 분할 설계의 필수 조건이다.

---

## obstructsStandardUx 지목 14건 — 심각도 순

| 순위 | 조항 | 막고 있는 표준 | 근거 종류 |
|:---:|:---|:---|:---|
| 1 | 6.5-b·6.5-f·6.8-c (262·269·274·396행) | 목록에서 직접 행동(리스트 = 탭 = 진입), 바텀시트·전용 상세 화면·sticky CTA | 플랫폼 관용(iOS HIG·Material 3) + 실측(390px 3.76 화면) |
| 2 | 7.6-a (472행) | 키보드 사용 태블릿의 카드 확장·진입 자체 | WCAG 2.1.1 Keyboard |
| 3 | 6.1-b (185행) | 입력 방식 기반 분기 일체 | 결정 2 · 코드 실측(폭 단독 `isMobileViewport`) |
| 4 | 6.7-2 (339행) | `margin-top:auto`·`space-between` 등 CSS 표준 정렬 해법 | 수단 금지형 조항 |
| 5 | 6.4-e (237행) | 탭 확정 = pointerup 관용, 눌렀다 취소 | iOS HIG·Material 3 |
| 6 | 6.2-e (203행) | 회전 시 열린 시트 상태 유지 | iOS HIG·Material 3 |
| 7 | 7.3 (433행) | 전환 중 스크롤 가능·취소 경로 | 모바일 웹 관행 |
| 8 | 6.6-b (283–284행) | 모바일 전용 상세 화면의 제목 레이아웃 자유 | 기준값 부재로 조항이 무의미해짐 |
| 9 | 6.4-g·6.4-k (241·248행) | 모바일 전용 설정 화면·시트 | 결정 5 |
| 10 | 6.4-h (243행) | 테스트 중 테마 전환 | 상태 피드백·야간 사용성 |
| 11 | 7.6-e (477행) | 포커스된 컨트롤에서 `Enter` 가 행동을 일으킨다는 기대 | WAI-ARIA button pattern |
| 12 | 6.4-d (231–236행) | 명시적 닫기 컨트롤·스와이프 닫기 | 플랫폼 관용 (WCAG 2.5.7 은 통과) |
| 13 | 4.1-b (108행) | 내부 스크롤 시트 | 단서 하나(369행)에만 의존 |
| 14 | 6.9 (409행) | 자동 대비 게이트 | WCAG 1.4.3·1.4.11 수치 부재 |

---

## 문서 내부 모순 · 결번 · 코드 불일치

1. **§7.2 결번.** `### 7.2` heading 이 없다(423행 §7.1 → 429행 §7.3). §7.7 496행이 「Section 7.2 우선순위」를 인용하지만 우선순위는 §7.1 427행에 있다.
2. **§10.1 결번(범위 밖 참고).** §10 Responsive Requirements 의 첫 하위 조항이 `### 10.2` 다(730·732행). 본 맵 범위 밖이지만 같은 종류의 결번이라 함께 적는다.
3. **§6.4-j ↔ §7.6-g 모순.** landing keyboard entry 의 적용 범위가 「desktop/tablet」(247행)과 「Landing 컨텍스트 · Mobile menu 포함」(480–481행)으로 갈린다. 코드는 후자를 구현한다(`src/features/landing/grid/use-landing-keyboard-entry.ts:38-40`).
4. **§6.9 자체 모순.** 보조요소를 「권장」이라 한 뒤 같은 줄에서 「릴리스 게이트에서 검증 대상으로 포함한다」고 한다(413행) — 권고인지 차단 조건인지 한 문장 안에서 갈린다.
5. **§6.6-i i18n 미해결.** 12 locale 지원 저장소에서 대표 폰트를 `ko`·`en` 둘만 규정한다(303행).
6. **§6.4-c 표현 역전.** 코드는 `폭 AND capability`(`src/features/gnb/behavior.ts:8-13`)인데 문서는 폭을 규칙 본문에, capability 를 「포인터 감지 불가 환경」이라는 예외절에 둔다(224행).
7. **문서에 없고 코드에만 있는 값 2건.** 좁은 padding 경계 `899`(`layout-plan.ts:7`), 메뉴 닫힘 스크롤 취소 임계 `10px`(`gnb/behavior.ts:6`).
8. **§6.8-a 에 사건 서술.** 389행이 BQ-22 경위 3문장을 규칙 본문에 담고 있어 `AGENTS.md` §9(규칙 문서에는 불변식만)와 충돌한다.

---

## 미확인

1. **모바일 GNB 56px 의 safe-area 포함 여부.** 6.4-a 가 `56` 을 못박지만 노치 기기의 실효 높이는 렌더 측정이 필요하다. 저장소에 safe-area 참조가 2곳 있다는 사실(주어진 실측)만 알고, 그것이 GNB 에 걸리는지는 확인하지 않았다.
2. **모바일 메뉴 backdrop 의 최소 터치 타깃(WCAG 2.5.8).** 패널이 화면을 얼마나 덮는지, 남는 backdrop 이 24px 하한을 넘는지 실측하지 않았다.
3. **터치 입력이 키보드 모드를 종료시키는지.** §7.5-d 가 `mousedown` 을 종료 조건으로 두는데, 터치 탭의 합성 `mousedown` 이 이 경로를 타는지 런타임에서 확인하지 않았다.
4. **`SENSOR_DENIED` 의 현재 의미.** §7.1 이 PageState 로 열거하지만, §1.3 이 배경 연출을 강도 `0` 으로 죽인 뒤 이 상태가 무엇을 가리키는지 본 범위(1–508행)에서는 확인되지 않는다.
5. **§14.2 QA 매트릭스의 조항별 대응.** 4.1-V 가 단일 게이트로 지목하는 §14.2 는 본 맵 범위 밖이다. 문서 2분할 시 QA 매트릭스가 어느 쪽에 속하는지, 혹은 함께 갈라지는지 판단하려면 §14 를 읽어야 한다.
6. **§8.1(511–516행)과 §2 2-T6 의 중복 관계.** 두 곳이 같은 모드 판정을 각각 정의한다. §8 은 본 맵 범위 밖이므로 두 정의가 완전히 같은지, 미세하게 다른지는 다음 맵에서 대조해야 한다 — 다르다면 개정 대상이 한 곳이 아니라 두 곳이다.
7. **§6.5-a 슬롯 순서가 DOM 순서인지 시각 순서인지.** 261행이 구분하지 않는다. 모바일 전용 레이아웃(가로형 리스트 아이템)에서 둘이 갈릴 때 어느 쪽이 계약인지 문서로 판정할 수 없다.
