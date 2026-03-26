
### Q1 — pre-answer 유효성 판단 기준

`validated landing-origin context`의 성립 조건에 transition correlation을 포함할 것인가?

> ingress flag 단독으로 충분 (req-test.md 정의 채택)

---

### Q2 — unavailable Test Card 카탈로그 처리 정책

`unavailable: true` Test 카드를 카탈로그에서 어떻게 처리할 것인가?

> Coming Soon 오버레이 표시 (req-landing.md §13.2 유지)

---

### Q3 — `final_responses` 인코딩 방식

`final_submit.final_responses` 필드의 응답값 형식은?

> pole 문자열 직접 사용 (req-test.md §3.8 채택)

---

### Q4 — Storage Key ADR 작성 타이밍

Storage Key ADR을 req-test-plan.md에서 언제 작성하는 것으로 명시할 것인가?

> Phase 1 이전 필수 (issues.md 채택, req-test-plan.md Part 4 개정)

---

### Q5 — `session_id` null 허용 구간 계약 명시화

session_id null 허용 구간 및 non-null 강제 시점 계약을 어느 문서에서 어떻게 명시할 것인가?

> req-test.md §9.1/§9.2에 transport-patch 계약 명시

---

### Q6 — `requirements.md` type segment 정의 업데이트 범위

requirements.md REQ-F-010의 `{type}` 정의를 어느 수준까지 업데이트할 것인가?

> 최소 수정만 (SSOT는 req-test.md, requirements.md는 큰 틀만)

---

### Q7 — `req-test-plan.md` Phase 2 미결 설계 결정 처리 방식

Phase 2 미결 설계 결정 두 항목을 req-test-plan.md에서 어떻게 처리할 것인가?

> 별도 ADR 신호로 표시하고 Phase 2 착수 전 필수 조건으로 명시
