# req-landing Minimal Core Checklist

초기화 후 재구현 시, [req-landing.md](/Users/woohyeon/Local/VibeTest/docs/req-landing.md) 전체를 다시 읽기 전에 먼저 통과해야 하는 최소 핵심(MUST) 체크리스트입니다.  
체크 항목 1개라도 FAIL이면 다음 단계로 진행하지 않습니다.

## 0) 문서 정합성
- [ ] 본문(Section 1~12) 기준으로 구현하고, 충돌 시 구현 중지 후 문구 기준으로 해소한다. (`§0.1`)
- [ ] 본문과 QA(`§12.4`)가 불일치하면 QA를 맞추지 말고 본문을 먼저 정정한다. (`§0.1`)

## 1) 기술/라우팅 베이스라인
- [ ] App Router 2계층 layout 유지: `app/layout.tsx`, `app/[locale]/layout.tsx`. (`§2.2`)
- [ ] `typedRoutes: true` 계약 준수, `as Route/as never` 우회 금지. (`§2.3`)
- [ ] RouteBuilder는 locale-free 경로만 생성, locale 수동 결합 금지. (`§2.3`)
- [ ] 내부 링크/전환에서 `/en/en`, `/kr/kr` 0건. (`§2.3`, `§3.2`)
- [ ] i18n 엔트리는 `proxy.ts` 단일 책임으로 유지. (`§2.4`, `§3.2`)

## 2) 반응형/인터랙션 모드 게이트
- [ ] `width < 768`: hover 전면 금지, 탭 기반만 동작. (`§4.2A`)
- [ ] `width >= 768`: hover-capability 감지 시 hover 모드, 아니면 탭 fallback. (`§4.2A`)
- [ ] SSR 초기 모드는 탭 기준으로 시작 후 mount 뒤 capability 확정. (`§4.2A`)

## 3) 카드 높이/레이아웃 안정성 (핵심)
- [ ] Normal은 row equal-height stretch 유지. (`§4.5`)
- [ ] Desktop/Tablet에서 Expanded 시 Expanded 카드만 커지고, 같은 row 비확장 카드는 높이 변화 없음. (`§4.5`)
- [ ] Same-row handoff(카드1→카드2)에서도 비대상 카드 하단 빈공간 추가 생성 금지(0px). (`§4.5`)
- [ ] Expanded→Normal 전환 시 카드 높이 spike(일시적 과증가) 금지. (`§8.1`)
- [ ] 전환 중 동일 카드 이중 가시화 금지. (`§4.5`)

## 4) 카드 콘텐츠/텍스트
- [ ] Normal title: 줄바꿈 허용, truncate 금지, top/left 정렬. (`§6.6`)
- [ ] Normal subtitle: 1줄 truncate. (`§6.6`)
- [ ] Expanded에서 `subtitle/thumbnail/tags` 제거(숨김 아님). (`§6.4`)
- [ ] required 슬롯 누락 시 throw 금지 + 빈값 렌더로 레이아웃 유지. (`§6.7`)

## 5) 상태머신/hover-lock/handoff
- [ ] `INACTIVE`에서 입력 반응 no-op, `ACTIVE` 복귀 램프업(120~180ms). (`§7.3`)
- [ ] `TRANSITIONING`에서 시작 프레임 고정 + 카드 입력 차단. (`§7.3`, `§10.1`)
- [ ] HOVER_LOCK: 비대상 카드 마우스 반응 0, 키보드 모드 정책 준수. (`§7.5`)
- [ ] handoff는 마지막 hover 카드만 최종 Expanded. (`§8.2`)
- [ ] `0ms` 즉시 종료는 handoff 직전 카드 이탈에만 허용. (`§7.5`, `§8.1`)

## 6) 모션 핵심
- [ ] Core motion: 280ms/ease-in-out, spring/overshoot 금지. (`§8.1`)
- [ ] 상세 reveal stagger 40/100/160ms 유지. (`§8.1`)
- [ ] Mobile full-bleed 전환: 220~360ms(기본 280ms), content-fit, overshoot 금지. (`§9.2`)

## 7) 모바일 full-bleed
- [ ] 탭한 카드 in-flow 위치 유지(top jump 금지). (`§9.1`)
- [ ] `title + X` sticky header 유지, body만 내부 스크롤 허용. (`§9.1`, `§9.2`)
- [ ] full-bleed 동안 page scroll lock, backdrop/레이어 순서 계약 준수. (`§9.2`, `§9.3`)

## 8) 랜딩→목적지 전환/복원
- [ ] 전환 시작 즉시 lock + 완료/실패/취소 상호배타 1회. (`§10.1`, `§10.6`, `§11.3`)
- [ ] `scrollY` 저장/복원(consume 1회) 동작. (`§10.2`)
- [ ] pre-answer는 상관키 유입에서만 적용, consume 시점 계약 준수. (`§10.5`)
- [ ] cancel/fail 시 pre-answer/transition state 누수 없이 롤백. (`§10.6`)

## 9) QA 게이트
- [ ] `npm run qa:gate` = build + test + e2e:smoke 체인. (`§12.4`)
- [ ] 최종 PASS 기준은 `qa:gate` 3회 연속(3/3). (`§12.4`)
- [ ] hydration warning 0건을 자동화 로그로 증명. (`§12.1`)
- [ ] Card/Expanded 회귀 핵심 케이스(hover handoff, same-row 안정성, spike 금지) PASS. (`§12.4`)

