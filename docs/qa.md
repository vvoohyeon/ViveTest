# Landing QA Master Checklist (req-landing-final 기준)

구현 완료 후 릴리스 전 QA에 사용하는 단일 기준 문서다.  

## 사용 원칙
- 기준 요구사항 문서: [req-landing-final.md](/Users/woohyeon/Local/VibeTest/docs/req-landing-final.md)
- 문서 충돌 시 우선순위: Global Invariants(§4) > Routing(§5) > 기능계약(§6~§13) > Exception(§15)
- QA와 요구사항이 불일치하면 QA 체크리스트를 임의로 맞추지 말고 요구사항 문서를 먼저 정정한다. (Single-change Synchronization, §3.2)

## 0) Release Gate (차단 규칙)
- [ ] `npm run qa:gate`가 최소 `build && test && test:e2e:smoke` 체인을 포함한다. (§14.1)
- [ ] `qa:gate` 3회 연속 PASS(3/3)를 달성한다. 1회라도 실패하면 릴리스 차단. (§14.1)
- [ ] hydration warning `0건`을 자동화 로그로 증빙한다. 수동 확인만으로 PASS 처리하지 않는다. (§11.1, §14.2)
- [ ] 아래 상세 체크 항목 중 1건이라도 FAIL이면 릴리스 차단한다. (§14.3)

## 1) Routing / Layout / 404
- [ ] `src/app/layout.tsx`는 정적 루트, `src/app/[locale]/layout.tsx`는 locale 검증/i18n 주입 전용으로 책임이 분리되어 있다. (§5.1)
- [ ] 모든 유효 URL은 locale prefix 1회만 가진다. `/en/en`, `/kr/kr` 패턴이 0건이다. (§4.1, §5.2, §14.3)
- [ ] locale-less 경로는 allowlist(`/blog`, `/history`, `/test/[variant]/question`)만 locale 주입 리다이렉트되고, 나머지는 global 404로 귀결된다. (§5.3, §13.9, §14.2)
- [ ] `/` locale 결정이 `쿠키 -> Accept-Language -> defaultLocale` 순서를 따른다. (§4.1, §5.3, §14.2)
- [ ] i18n 엔트리는 `src/proxy.ts` 단일 책임을 유지한다. (`middleware.ts` 예외는 §15 등록이 있어야 함) (§5.3)
- [ ] typed route를 우회하는 `as Route`, `as never`, 수동 locale 문자열 결합이 없다. (§5.4)
- [ ] RouteBuilder는 locale-free 경로만 생성하고 `landing/blog/history/question` 단위 검증이 존재한다. (§5.4, §14.3)
- [ ] segment not-found와 global not-found가 분리 동작한다. duplicate locale는 global unmatched 경로로 처리된다. (§5.5, §13.9)

## 2) GNB / Settings / Responsive Context
- [ ] Desktop Landing에서 설정 레이어는 hover 기본 + 포인터 미감지 환경 focus/click fallback을 지원한다. (§6.4, §14.3)
- [ ] Desktop 설정 레이어 닫힘은 `Esc`, outside click, focus out을 지원하고 Tab/Shift+Tab focus-out은 즉시 닫힌다. (§6.4, §14.3)
- [ ] Mobile Landing/Blog 햄버거는 우측 끝(`16px` inset), overlay/backdrop, body scroll lock, close transition 종료 후 unlock을 준수한다. (§6.4, §14.3)
- [ ] Mobile 하단 설정 컨트롤은 언어/테마 2개만 제공한다. (§6.4)
- [ ] 반응형 매트릭스가 고정 규칙과 일치한다: Mobile Tap-only, Tablet/ Desktop capability 기반. (§10.1)
- [ ] 컨텍스트별 GNB 구성이 고정 규칙과 일치한다: Landing Mobile, Test Mobile(Back+Timer), Blog Mobile(Back+Hamburger). (§10.2)

## 3) Card Layout / Slot / Text
- [ ] `cardTitle`은 Normal/Expanded 모두 카드 최상단(first visible row)에 위치한다. (§4.1, §6.5, §6.8)
- [ ] 슬롯 순서가 고정 규칙과 일치한다: Normal `title -> subtitle -> thumbnail -> tags`, Expanded에서 `subtitle/thumbnail/tags` 제거(숨김 아님). (§6.5, §6.8)
- [ ] 텍스트 정책을 준수한다: Normal title 줄바꿈 허용(ellipsis 금지), subtitle 1줄 truncate, tags 1줄 고정+wrap 금지. (§6.6)
- [ ] Normal thumbnail 규격(`ratio 6:1`, `object-fit: cover`)과 Expanded 타입별 meta/CTA 개수 고정 규칙을 준수한다. (§6.8)
- [ ] Normal은 same-row equal-height stretch를 유지하고 이를 깨는 축 정렬 설정을 사용하지 않는다. (§6.7)
- [ ] `tags`는 terminal slot이며 tags 하단 동적 spacer/margin/pseudo-element가 없다. (§4.1, §6.7, §14.2)
- [ ] row 보정 잔여 높이는 tags 상단에서만 발생한다. same-row 비대상 카드 하단 추가 빈공간은 `0px`다. (§4.1, §6.7)
- [ ] Expanded 전환 중 동일 카드 dual-visibility가 `0건`이다. (§6.7)
- [ ] Desktop/Tablet Expanded는 Card Shell 전체 `scale(1.1)`을 적용하고 내부 콘텐츠-only 확대는 금지한다. (§4.1, §8.4, §14.2)
- [ ] Expanded 전 구간에서 title/body/CTA/meta crop/clipping `0건`이다. (§4.1, §6.7, §8.4)

## 4) State / HOVER_LOCK / Motion
- [ ] capability gate를 준수한다: `width<768` Tap-only, `width>=768` capability 분기, SSR 초기값 Tap Mode. (§8.1, §14.3)
- [ ] 상태 우선순위가 고정 규칙(`INACTIVE > REDUCED_MOTION > TRANSITIONING > EXPANDED > HOVER_LOCK > NORMAL`)과 일치한다. (§7.2)
- [ ] `INACTIVE` no-op, `ACTIVE` 복귀 램프업(120~180ms), `TRANSITIONING` 시작 프레임 고정/입력잠금/leave-collapse 금지 규칙을 지킨다. (§7.3)
- [ ] HOVER_LOCK 비대상 카드 규칙(`tabIndex`, `aria-disabled`, Enter/Space 차단, pointer 입력 차단)을 준수한다. (§4.1, §7.5, §9.2, §14.3)
- [ ] handoff에서 직전 pending transition 즉시 취소 + 마지막 대상 카드만 Expanded로 수렴한다. (§7.5, §8.2, §14.3)
- [ ] hover intent 스케줄러가 단일 timer + intent token 모델로 동작한다. (§8.2)
- [ ] Core motion을 준수한다: 280ms/ease-in-out, stagger 40/100/160, spring/overshoot 금지, alpha 애니메이션 금지. (§8.3)
- [ ] `0ms` 전이는 handoff 직전 카드 이탈 경로에만 허용되며 일반 leave/close에는 금지된다. (§8.3)
- [ ] Expanded→Normal 구간 외곽 높이 spike가 없고 non-increasing 위반 프레임이 `0건`이다. (§8.3, §14.3)
- [ ] reduced-motion에서 대형 이동을 제거하고 150~220ms 단순 전환으로 축소한다. (§11.3)
- [ ] rapid hover/tap 반복에서 uncaught runtime error `0건`이다. (§7.5, §11.2, §14.3)

## 5) Mobile Full-bleed (`width<768`)
- [ ] 탭한 카드만 in-flow로 Expanded되며 top jump가 없다. (§8.5, §14.3)
- [ ] 헤더는 `title + X`, 첫 행 고정, X는 sticky 우측 끝 고정이다. (§8.5)
- [ ] 닫기 경로는 `X` 또는 `backdrop`만 허용하며 닫은 뒤 Expanded 직전 위치/스크롤로 자연 복귀한다. (§8.5)
- [ ] 전환은 220~360ms(기준 280ms), content-fit 높이로 monotonic하게 수렴하고 overshoot가 없다. (§8.5)
- [ ] 내부 스크롤은 body 영역에서만 허용되고 full-bleed 동안 page scroll lock이 유지된다. (§8.5, §14.3)
- [ ] 레이어 순서가 `GNB > Expanded > backdrop > 기타 카드`를 유지한다. (§8.7)

## 6) Transition / Handshake / Pre-answer / Restore
- [ ] 라우팅 전환 시작은 Expanded 유효 CTA 활성화 시점에만 허용된다. (Test A/B, Blog Read more) (§8.6)
- [ ] 전환 시작 즉시 `TRANSITIONING` 진입, 시작 프레임 고정, 상태 되돌림 금지, 타 카드 상호작용 차단을 지킨다. (§13.3)
- [ ] source GNB는 목적지 진입 완료 전까지 유지되고, destination GNB는 완료 시점 1회 교체된다. (§13.3)
- [ ] 전환 종료 이벤트는 `complete|fail|cancel` 중 정확히 1회만 발생한다. (§4.1, §12.2, §13.3)
- [ ] pre-answer는 `transition correlation + landing ingress flag`가 있는 Test 유입에서만 적용된다. (§13.4, §13.6)
- [ ] ingress flag 존재 시 instructionSeen과 무관하게 Q2 시작, 부재 시 Q1 시작을 보장한다. (§13.4, §14.3)
- [ ] pre-answer read/consume을 분리하고 consume 시점은 `Start click` 직후(또는 instruction 생략 시 `test_start`)다. (§13.6, §14.3)
- [ ] 실패/취소 시 pre-answer 및 pending transition/state/flag/body lock 누수가 없이 롤백된다. (§13.3, §13.6)
- [ ] 최소 롤백 3케이스(사용자 취소, locale duplicate, 목적지 진입 실패)를 통과한다. (§13.6, §14.3)
- [ ] `scrollY`를 라우팅 직전에 저장하고 랜딩 재진입 mount 직후 1회 복원 후 consume한다. (§13.8)
- [ ] 재렌더/재마운트 후 Q2→Q1 역전이 `0건`이다. (§7.4, §14.3)
- [ ] dwell time은 재방문 포함 누적이며 포그라운드/백그라운드 모두 경과시간이 반영된다. (§13.7)

## 7) Accessibility / Disabled Semantics
- [ ] 상호작용 요소는 키보드 도달 가능하며 focus ring이 명확하다. (§9.1)
- [ ] hamburger/settings/back/X에 `aria-label`이 존재한다. (§9.1)
- [ ] CTA/진입 컨트롤은 시맨틱 요소(`<button>`, `<a>`)를 사용한다. (§9.2)
- [ ] unavailable 진입 차단은 `disabled`/`aria-disabled` 규칙에 맞게 구현되고 Enter/Space/click이 차단된다. (§9.2)
- [ ] Coming Soon 오버레이 활성 상태에서도 `cardTitle`과 포커스 식별성이 유지된다. (§9.3)

## 8) Telemetry / Privacy / Data Contract
- [ ] V1 이벤트셋 최소 요구를 충족한다: `landing_view`, `transition_start`, `transition_{complete|fail|cancel}`, `attempt_start`, `final_submit`. (§12.1)
- [ ] 기본 미수집 항목(스크롤/hover/expanded 토글/tilt/unavailable 시도) 로그가 전송되지 않는다. (§12.1)
- [ ] 전환 이벤트 필수 필드(`event_id`, `transition_id`, `source_card_id`, `target_route`, `result_reason`)와 상호배타 종료를 준수한다. (§12.2)
- [ ] payload 금지 항목(원문 질문/답변 텍스트, 자유입력, PII, fingerprint)을 포함하지 않는다. (§12.3, §14.2)
- [ ] `question_index`는 1-based를 유지한다. (§4.1, §12.3)
- [ ] consent는 `UNKNOWN -> OPTED_IN|OPTED_OUT` 상태머신을 따르고 mount 후 저장소 동기화를 1회만 수행한다. (§12.4)
- [ ] `UNKNOWN/OPTED_OUT`에서 클라이언트 텔레메트리 네트워크 전송이 `0건`이다. 동의 UI 전 V1 기본은 `OPTED_OUT`이다. (§12.1, §12.4, §15 EX-002, §14.3)
- [ ] 랜덤 소스 불가 환경에서 `session_id`를 생성하지 않으며 클라이언트 전송이 `0건`이다. (§12.5, §14.3)
- [ ] fixture 최소 개수/다양성(Test 4+, Blog 3+, unavailable Test 2+)를 충족한다. (§12.6)
- [ ] fixture required 슬롯 누락이 없고 adapter는 누락 시 throw하지 않고 normalize+default로 방어한다. (§12.6, §13.1)
- [ ] unavailable Blog는 존재하지 않고 unavailable Test는 Expanded/CTA/전환이 금지된다. (§13.2)

## 9) 회귀 우선 점검 포인트 (기존 qa.md 통합)
기존 문서에서 반복 검출된 고위험 항목을 최신 요구사항 기준으로 재매핑한 목록이다.

- [ ] `transition correlation + ingress flag` 없는 유입에 pre-answer 적용 금지. (§13.6)
- [ ] 짧은 전환(`short transition`)에서도 fail/cancel 정리 생략 금지. (§13.6)
- [ ] `TRANSITIONING` 중 leave/focusout collapse 금지(시작 프레임 고정). (§7.3, §13.3)
- [ ] typedRoutes 우회 캐스팅(`as Route`/`as never`) 금지. (§5.4)
- [ ] locale 수동 문자열 결합 금지(RouteBuilder locale-free 유지). (§5.4)
- [ ] same-row equal-height stretch 붕괴 및 비대상 하단 빈공간 증가 금지. (§6.7)
- [ ] Mobile full-bleed에서 page/body 스크롤 분리 및 lock 규칙 위반 금지. (§8.5)
- [ ] reduced-motion에서 대형 이동 유지 금지. (§11.3)
- [ ] required 슬롯 누락 시 throw 금지 + 레이아웃 유지. (§12.6, §13.1)
- [ ] `qa:gate` 파이프라인 및 Playwright 스모크 누락 금지. (§14.1, §14.3)

## 10) QA 실행 기록 템플릿
- 실행 일시:
- 브랜치/커밋:
- 실행 환경(브라우저/OS/viewport):
- `qa:gate` 결과: 1차 / 2차 / 3차
- Release Blocking 실패 항목:
- 상세 체크 FAIL 항목(섹션 번호와 함께):
- 증빙 링크(로그/스크린샷/리포트 경로):
