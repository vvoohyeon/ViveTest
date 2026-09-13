# contract-test — `docs/req-test.md` · `docs/req-test-plan.md` 모바일 리팩터 영향 조항 맵

작성 2026-09-11 · 대상 clone `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (HEAD `a5aec95`) · 읽기 전용 분석. 이 문서의 모든 줄 번호는 그 clone 기준이며, 파일 경로는 저장소 루트 상대경로로 적는다.

## 0. 한 문단 결론

`req-test.md` 1319행과 `req-test-plan.md` 398행 어디에도 **폭·기기·입력 방식에 키를 둔 조항이 하나도 없다** — `모바일`·`mobile`·`viewport`·`터치`·`touch`·`hover`·`desktop`·`breakpoint`·`px` 전부 0회이고, `뷰포트`는 `result_viewed` 의 IntersectionObserver 문맥 2회(`:1136`·`:1157`)뿐이다. 따라서 이 두 문서가 모바일 리팩터를 막는 방식은 「모바일에 대해 틀린 것을 적어 놓았다」가 아니라 **「데스크톱 한 장을 전제로 한 인터랙션을 기기 무관의 얼굴로 못박아 두었다」**이다. 실제 차단 조항은 §1.3 의 절대 불변 규칙 한 줄(instruction 은 overlay, 별도 라우트 금지)과, 그것을 네 곳에서 되풀이한 문장들(`:46`·`:399`·`:445`·`:825`), 그리고 그 인터랙션 전체를 릴리스 게이트로 동결한 §12.2 #3(`:1272`)이다.

두 번째 결론: **테스트 플로우는 랜딩과 정반대의 문제를 갖는다.** 랜딩은 390px 에서 3.76 화면을 스크롤하지만, 테스트 문항 화면은 코드에서 추정한 높이가 약 506px 로 한 화면에 들어간다(§4-2). 즉 테스트 표면의 모바일 결함은 「길다」가 아니라 「**컨트롤이 부족하고, 파괴적이고, 계층이 뒤집혀 있다**」이다 — 다음 컨트롤이 없어 전진하려면 다시 답해야 하고(§5 D-03), 이전 버튼 한 번이 답변 두 개를 경고 없이 지우며(D-02), 모달 다이얼로그가 GNB 아래 층에 깔린다(D-01).

## 1. 판정 축 정의

| 축 | 값 | 의미 |
|:---|:---|:---|
| `kind` | behavior / interaction / mixed | 동작(도메인·저장·계산) / 인터랙션(표시·입력·피드백·초점) / 둘이 한 문장에 섞임 |
| `mobileScope` | IA · 레이아웃 · 입력 · 피드백 · 생명주기 · 없음 | 모바일 리팩터가 이 조항을 건드리게 되는 지점 |
| `widthKeyed` | yes / no | 조항이 뷰포트 폭·브레이크포인트·기기를 조건으로 갖는가 |
| `prescriptiveness` | 낮음 / 중간 / 높음 | 높음 = 구현 경로를 코드 수준(값·predicate·클래스·타이머)까지 고정 |
| `obstructs` | 예 / 부분 / 아니오 | 표준 UX·인터랙션 완성도를 실제로 막는가 |

근거 종류는 결함 목록(§5)에서 항목마다 `규범` / `플랫폼 관행` / `문서 내부 일관성` / `코드 실측` / `코드 구조 도출` 로 표기한다.

## 2. 개체수

| 항목 | 값 | 근거 |
|:---|---:|:---|
| 분류 대상 조항 | 78 | 아래 §3 표 |
| kind=behavior | 22 | §3 표 |
| kind=interaction | 29 | §3 표 |
| kind=mixed | 27 | §3 표 |
| widthKeyed=yes | **0** | `grep -c` 로 `모바일`·`mobile`·`viewport`·`터치`·`touch`·`hover`·`desktop`·`breakpoint`·`px` 전부 0 (두 문서 모두) |
| obstructs=예 | 11 | §3 표 |
| obstructs=부분 | 31 | §3 표 |
| obstructs=아니오 | 36 | §3 표 |
| IA 재설계를 막는 §1 조항 | 1 | `req-test.md:46` (되풀이 3곳: `:399`·`:445`·`:825`) |
| `src/features/test/**` 의 뷰포트 분기 라인 | 2 | 둘 다 `instruction-overlay.tsx:26`·`:145` 의 `max-[767px]:` |
| 테스트 플로우 e2e 중 모바일 뷰포트에서 도는 기능 단언 | **0** | `/test/` 로 이동하는 spec 전부가 1280 이상 (`a11y-smoke.spec.ts:719`·`:741` = 1280, `qualifier-overlay.spec.ts:32` = 1280) |
| 테스트 라우트 시각 baseline | 48장 | `tests/e2e/theme-matrix-smoke.spec.ts-snapshots/` |
| 그중 모바일(390×844) | 12장 | `theme-layout-test-instruction-*-mobile` 4 + `theme-state-mobile-test-question-*` 4 + `theme-state-mobile-test-result-*` 4 |
| `/result` 라우트 | **없음** | `src/app/[locale]/` 아래 `test`·`blog`·`history` 뿐, `RouteBuilder` 의 `LocaleFreeRoute` union 에도 없음(`src/lib/routes/route-builder.ts:1-29`) |

## 3. 조항 분류표

번호는 이 문서 전용 참조 ID다. 「행」은 `docs/req-test.md` 의 줄 번호.

### §1 Scope / Locked Decisions

| # | 행 | 조항 | kind | mobileScope | widthKeyed | prescript. | obstructs |
|---:|---:|:---|:---|:---|:---:|:---|:---:|
| 1 | 46 | **절대 불변 규칙** — instruction 은 `/test/{variantId}` 위 overlay 이며 `/instruction` 같은 별도 라우트를 갖지 않는다. 「문서 내 어떤 계약도 instruction 을 독립 페이지·라우트로 해석해서는 안 된다」 | mixed | IA | no | 높음 | **예** |
| 2 | 50 | 진입 경로 = Landing ingress + 직접 접근 둘 다 지원 | behavior | 생명주기 | no | 중간 | 아니오 |
| 3 | 52 | Answer revision 허용 + 이전 문항 수정 시 tail reset | interaction | 입력 | no | 높음 | **예** |
| 4 | 53 | Staged entry 7분 만료(목표 계약, 미구현) | behavior | 생명주기 | no | 중간 | 아니오 |
| 5 | 54–55 | Result URL 구조 `/result/{variant}/{type}?{base64}` · type segment 길이 규칙 | mixed | IA | no | 높음 | 부분 |
| 6 | 57 | Result derivation 최소 로딩 **5초**(변경 가능한 설정값) | interaction | 피드백 | no | 높음 | **예** |
| 7 | 58 | Inactivity timeout 30분, 재진입 시점 판정 | behavior | 생명주기 | no | 중간 | 아니오 |
| 8 | 59 | 응답 데이터 휘발 시점 3종 | behavior | 생명주기 | no | 중간 | 부분 |
| 9 | 61–62 | Share CTA · Nickname 이번 단계 미구현 | behavior | 없음 | no | 낮음 | 아니오 |
| 10 | 64–76 | §1.4 Current Runtime Status Snapshot — 현재 live 동작(placeholder result panel, mount 기반 `result_viewed`, 7분 미집행)을 계약 문장으로 고정 | mixed | 전체 | no | 높음 | **예** |

### §3 Core Domain & UI Lifecycle Definitions

| # | 행 | 조항 | kind | mobileScope | widthKeyed | prescript. | obstructs |
|---:|---:|:---|:---|:---|:---:|:---|:---:|
| 11 | 288 | Staged Entry = landing ingress 전용 미소비 임시 진입 상태 | behavior | 생명주기 | no | 중간 | 아니오 |
| 12 | 295 | **User-facing Q Label** — UI 의 `Q1/Q2` 는 canonical index 가 아니라 scoring order 기준 | interaction | 표시 | no | 중간 | 부분 |
| 13 | 296 | Ingress Flag = 시작 문항 판정의 유일한 근거 | behavior | 생명주기 | no | 중간 | 아니오 |
| 14 | 298 | Result-entry Eligibility = 위치가 아니라 논리 조건 | mixed | 피드백 | no | 중간 | 아니오 |
| 15 | 310 | Recoverable UI Error = retry / 다른 테스트 / 홈 복귀 경로 제공 의무 | interaction | 피드백 | no | 낮음 | 아니오 |
| 16 | 324–328 | 진입 경로 3분류 표와 경로별 **시작 문항** | mixed | 생명주기 | no | 높음 | 부분 |
| 17 | 331 | Direct Resume 는 **프롬프트 없이 즉시 재개**, 위치는 「마지막으로 확정한 문항 다음의 미응답 문항」 | interaction | 입력 | no | 높음 | 아니오 |
| 18 | 335 | landing same-variant 재선택은 항상 restart intent | behavior | 생명주기 | no | 중간 | 아니오 |
| 19 | 337 | qualifier 있는 variant 의 profile question 은 runtime question panel 에 표시하지 않는다 | interaction | 레이아웃 | no | 높음 | 부분 |
| 20 | 341–342 | **시작 위치가 variant 마다 다르다** — qualifier 없는 ingress 는 seed 한 문항 *다음*으로, EGTT 는 seed 한 문항 *그 자체*(canonical 2)로 진입 | interaction | 입력 | no | 높음 | **예** |
| 21 | 349 | runtime entry commit 시점에 함께 확정되는 8개 항목 | behavior | 생명주기 | no | 높음 | 아니오 |
| 22 | 351 | commit 을 Start 버튼 클릭만으로 정의하면 안 된다 | mixed | 입력 | no | 중간 | 부분 |
| 23 | 379 | staged entry 생성 시점 = 랜딩 카드 A/B 선택 시 | behavior | 생명주기 | no | 낮음 | 아니오 |
| 24 | 395–397 | instruction gate 필수 + 이탈은 pre-test abandonment | mixed | 생명주기 | no | 중간 | 아니오 |
| 25 | 399 | overlay 는 booting/committed/redirecting 에서 미표시, re-entry 에서는 active 여도 표시 | interaction | 레이아웃 | no | 높음 | 부분 |
| 26 | 400–401 | entry overlay 표시 조건 4-항 OR + qualifier variant 의 auto-commit 금지 | interaction | 레이아웃 | no | 높음 | 부분 |
| 27 | 402 | **modal dialog 계약** — `role="dialog"`·`aria-modal="true"`·`aria-labelledby`·열릴 때 포커스는 컨테이너(첫 컨트롤 아님)·Tab 순환·닫힐 때 원소 복귀 | interaction | 입력 | no | 높음 | 아니오 |
| 28 | 403 | **`Esc` = 그 단계의 dismiss action** — instruction 은 secondary CTA 와 동일 효과(consent write·redirect 포함), qualifier 는 Back/Cancel, secondary 없으면 무효 | interaction | 입력 | no | 높음 | 부분 |
| 29 | 409 | test route 는 route-local consent banner·confirm dialog·blocked popup 을 렌더하지 않는다 | interaction | 레이아웃 | no | 높음 | 부분 |
| 30 | 410 · 421 | **qualifier variant 의 primary visible label 만 `Next` 로 override** 하고 action identity(`accept_all_and_start`)와 consent 저장 효과는 그대로 실행 | mixed | 입력 | no | 높음 | **예** |
| 31 | 413–419 | consent CTA matrix 4행(ingress × consent × attribute) | mixed | 입력 | no | 높음 | 부분 |
| 32 | 432–438 | qualifier step 계약 — 1 `QualifierFieldSpec` = 1단계, Back, Continue 는 선택 전 disabled, entry final 은 Start label, re-entry final 은 restart confirm label, commit 은 final Continue 에서만 | interaction | 입력 | no | 높음 | 부분 |
| 33 | 441–445 | qualifier re-entry — recap chip 활성화 → re-entry mode, cancel 은 무변경, confirm 은 scoring answers 삭제 후 첫 scoring 으로, **별도 route 이동 금지** | interaction | 입력 | no | 높음 | 부분 |
| 34 | 447–451 | `instructionSeen` 생명주기 — sessionStorage, 기록 시점, 재표시 조건, 리셋 조건 | mixed | 생명주기 | no | 높음 | 부분 |
| 35 | 458 · 461 | inactivity 30분, 재진입 시 판정, 백그라운드 타이머 불필요 | behavior | 생명주기 | no | 중간 | 아니오 |
| 36 | 465 | Strict Mode / bootstrap replay 는 사용자에게 별도 UX 로 노출되지 않는다 | behavior | 없음 | no | 중간 | 아니오 |
| 37 | 497 | canonical index · scoring order · user-facing `Q1/Q2` 3체계 분리 | mixed | 표시 | no | 높음 | 부분 |
| 38 | 501–503 | main progress = answered scoring / total scoring, profile 제외, landing pre-answer 포함 | mixed | 피드백 | no | 높음 | 아니오 |
| 39 | 505 | scoring question 은 이진 pole 선택지만 지원(`scale` 은 예약) | behavior | 입력 | no | 중간 | 부분 |
| 40 | 512–513 | 진행 중 이전 응답 수정 가능 · 재방문 시 기존 답변이 선택 상태로 표시 | interaction | 입력 | no | 중간 | 아니오 |
| 41 | 519–523 | **Tail Reset** — 이전 문항 응답 변경 시 변경 확정 **즉시** 이후 응답 전체 리셋 + eligibility false + derivation residue 폐기 | mixed | 입력 | no | 높음 | **예** |
| 42 | 525–529 | backward navigation **구현 계약** — `moveQuestion(-1)` 시 보존 predicate `Number(key) < nextIndex`, 즉 목적지 문항의 응답도 제거 | mixed | 입력 | no | **높음(코드 수준)** | **예** |
| 43 | 535–551 | Result-entry Eligibility True 조건 · 유지 규칙 · 즉시 상실 규칙 · UI 반영 규칙 | mixed | 피드백 | no | 높음 | 아니오 |
| 44 | 621–636 | Result Rendering — `supportedSections` 선언 모델, mandatory 3(`derived_type`·`axis_chart`·`type_desc`) / optional, content 누락 시 placeholder + console warning | mixed | 레이아웃 | no | 높음 | 부분 |

### §4 Happy-path Contract

| # | 행 | 조항 | kind | mobileScope | widthKeyed | prescript. | obstructs |
|---:|---:|:---|:---|:---|:---:|:---|:---:|
| 45 | 644 | instruction CTA → (qualifier 없음) runtime / (있음) qualifier step. `Next` 여도 base action effect 를 먼저 실행 | mixed | 입력 | no | 높음 | 아니오 |
| 46 | 649 | runtime panel 은 scoring-type question 만 렌더 | interaction | 레이아웃 | no | 높음 | 부분 |
| 47 | 651–656 | `scoring1` pre-answer consume 계약 — read 와 consume 분리, `COMMIT_ENTRY` 이후 active entry effect 에서 소비 | behavior | 생명주기 | no | 높음 | 아니오 |
| 48 | 662–666 | restart intent — old active run 은 commit success 전까지 보존, 새 run 은 상속하지 않고 seed 1개만 | behavior | 생명주기 | no | 높음 | 아니오 |
| 49 | 677 | **scoring 응답 확정 직후 즉시 다음 미응답 scoring question 으로 이동** (정상·revision·resume 모두 동일) | interaction | 입력 | no | 높음 | 부분 |
| 50 | 678 | 자동 이동은 **짧은 지연(현재 150ms)** 동안 answer option 을 잠그는 방식 · 그 구간 중복 클릭 무시 · Previous/전환/unmount 시 예약 취소 | interaction | 입력 | no | **높음(값 고정)** | 부분 |
| 51 | 679 | **「사용자는 이전 문항으로 이동할 수 있다. 다음 문항 이동은 응답 확정 직후 자동 진행으로 처리한다」** — 다음 컨트롤이 계약 수준에서 없다 | interaction | 입력 | no | 높음 | **예** |
| 52 | 683 | 진행 상태는 프로그레스 바와 퍼센트로 표시하고 **문항 번호 텍스트(`Question N of M`)는 표시하지 않는다** | interaction | 피드백 | no | 높음 | 부분 |
| 53 | 691–695 | 현재 placeholder runtime — 마지막 문항에서 locale `submit` CTA, 클릭 시 `final_submit` + placeholder result panel | mixed | 레이아웃 | no | 높음 | 부분 |
| 54 | 697–715 | 「결과 보기」 제공 조건(4경로 동일) · 마지막 문항 응답 보존 · 변경 시 residue 만 무효화 | interaction | 입력 | no | 높음 | 아니오 |
| 55 | 719–724 | completion → eligibility, 「결과 보기」 클릭이 별개 이벤트 | mixed | 피드백 | no | 중간 | 아니오 |
| 56 | 730–744 | Result Derivation Loading — 최소 5초 로딩 화면 + 「뒤로 돌아가기」 · commit = `derivation_computed` AND `min_loading_duration_elapsed` | interaction | 피드백 | no | 높음 | **예** |
| 57 | 748–759 | Back-from-Loading — 항상 마지막 문항으로 복귀, 응답 유지, loading residue 정리 | interaction | 입력 | no | 높음 | 아니오 |

### §5 Result URL & 케이스 분기

| # | 행 | 조항 | kind | mobileScope | widthKeyed | prescript. | obstructs |
|---:|---:|:---|:---|:---|:---:|:---|:---:|
| 58 | 769–809 | self-contained payload 구조 · Base64-URL · 검증 순서 · 불변식 | behavior | IA | no | 높음 | 아니오 |
| 59 | 815–826 | 결과 페이지 케이스 매트릭스 1/2/3/4 와 CTA(다시하기 / 나도 테스트하기 / 랜딩으로) | mixed | IA | no | 높음 | 부분 |

### §6 Error / Fallback / Rollback / Restoration

| # | 행 | 조항 | kind | mobileScope | widthKeyed | prescript. | obstructs |
|---:|---:|:---|:---|:---|:---:|:---|:---:|
| 60 | 841–856 | 에러 복구 페이지 — crash 금지, session 미생성, route `/[locale]/test/error`, 메시지 「이 테스트에 진입할 수 없습니다」, `?variant=` 표시, **미완료 카드 최대 2장 + 0장이면 랜딩 CTA** | mixed | 레이아웃 | no | 높음 | 부분 |
| 61 | 867–885 | blocking data error 목록 + 「명시적 error state 와 안전한 복귀 경로」 | mixed | 피드백 | no | 중간 | 아니오 |
| 62 | 889–900 | invalid result payload → 에러 렌더링 + 랜딩 CTA, **부분 렌더링 금지** | mixed | 레이아웃 | no | 높음 | 아니오 |
| 63 | 914–921 | content fallback — 빈 컨테이너 + 「준비 중」 류 짧은 문구 + operator console warning, **recoverable CTA 없음**, hard crash·blank 금지 | interaction | 피드백 | no | 높음 | 부분 |
| 64 | 931–945 | recoverable error UX 원칙 — loading/error 구분, actionable path, blocking/non-blocking severity 표 7행 | interaction | 피드백 | no | 중간 | 아니오 |
| 65 | 951–966 | Commit-failure — old run 보존, 자동 복귀 금지, **액션 3개**(retry fresh entry / 이전 진행으로 돌아가기 / 홈), 재검증 실패 시 동일 error state 유지 | interaction | 레이아웃 | no | 높음 | 부분 |
| 66 | 976–987 | Derivation-failure — **액션 3개**(마지막 문항으로 / 다시 결과 보기 / 홈), cleanup bundle 후 새 attempt | interaction | 레이아웃 | no | 높음 | 부분 |
| 67 | 997–1011 | 휘발 트리거 3종과 삭제 범위 · variant 범위 격리 · 원자성 | behavior | 생명주기 | no | 높음 | 아니오 |
| 68 | 1022–1026 | Restoration / Continuity — resume 탐지, variant 간 문맥 혼합 금지, qualifier token 유효성 | behavior | 생명주기 | no | 중간 | 아니오 |

### §7–§9 · §12

| # | 행 | 조항 | kind | mobileScope | widthKeyed | prescript. | obstructs |
|---:|---:|:---|:---|:---|:---:|:---|:---:|
| 69 | 1035 | 현재 live result surface = placeholder panel(scoring response row + 랜딩 CTA + history CTA 만, `derived_type`·`axis_chart`·`type_desc`·result URL 생성 안 함) | mixed | 레이아웃 | no | 높음 | 부분 |
| 70 | 1039–1045 | Result 화면 mandatory 3 섹션 + optional `trait_list`(target contract) | interaction | 레이아웃 | no | 높음 | 부분 |
| 71 | 1060–1073 | Terminal Exclusivity — 상태 전이 다이어그램과 terminal 5종 | behavior | 생명주기 | no | 중간 | 아니오 |
| 72 | 1081–1094 | State Hygiene — 5개 플래그를 단일 플래그로 뭉개지 않는다 | behavior | 생명주기 | no | 높음 | 아니오 |
| 73 | 1100–1119 | Cleanup Set 10행 표 + 원자성 | behavior | 생명주기 | no | 높음 | 아니오 |
| 74 | 1136 | `result_viewed` 는 실제 pipeline 에서 `derived_type` 블록 **IntersectionObserver 1회 발화 후 disconnect** | interaction | 피드백 | no | 높음 | 아니오 |
| 75 | 1153 | `question_answered` 필수 필드에 `dwell_ms` 포함 | behavior | 없음 | no | 중간 | 아니오 |
| 76 | 1272 | **§12.2 #3 Instruction Gate** — §3.6 의 instruction/qualifier 인터랙션 전체(라벨 override·action identity·step 구조·Back·Continue disabled·commit 시점·auto-commit 조건·cleanup)를 릴리스 차단 단언으로 동결 | mixed | 전체 | no | 높음 | **예** |
| 77 | 1278 | §12.2 #9 Answer Revision / Tail Reset 를 릴리스 차단 단언으로 동결 | mixed | 입력 | no | 높음 | 부분 |
| 78 | 1292–1296 | §12.2 #21·#22·#23 — Final Question Screen · Result Derivation Loading · Back-from-Loading 을 target contract 로 등록 | mixed | 피드백 | no | 높음 | 부분 |

## 4. 필수 답변

### 4-1. §3 에서 UI 생명주기가 규정하는 인터랙션 조항 — 전부

「UI 생명주기」를 규정하면서 **표시·입력·초점·피드백을 지시하는** §3 조항은 아래 26개다. `behavior` 전용 조항(#11·13·18·21·23·35·36·39·47 등)은 제외했고, 한 문장 안에 도메인과 인터랙션이 섞인 것은 `mixed` 로 표기해 포함했다.

| # | 행 | 무엇을 인터랙션으로 규정하는가 |
|---:|---:|:---|
| 12 | 295 | 화면에 찍히는 번호(`Q1/Q2`)의 의미를 scoring order 로 고정 — 표시 규칙 |
| 14 | 298 | eligibility 를 위치가 아닌 논리로 정의 → CTA 활성/비활성의 근거 |
| 15 | 310 | 오류 상태에 복구 경로(retry/다른 테스트/홈) 제공 의무 |
| 16 | 324–328 | 경로별 **첫 화면에 무엇이 뜨는가**(pre-answer bind, qualifier 수집, 첫 미응답 문항) |
| 17 | 331 | Direct Resume 은 **프롬프트 없이** 재개하고 profile 은 건너뛴다 |
| 19 | 337 | profile question 은 runtime panel 에 **표시하지 않는다** |
| 20 | 341–342 | landing ingress 이후 **첫 runtime 화면이 variant 마다 다르다**(seed 다음 / seed 그 자체) |
| 22 | 351 | commit 을 「버튼 클릭」으로 정의하지 말 것 — 생략 경로에서도 같은 의미 |
| 24 | 395–397 | instruction 단계를 반드시 거치고, 이탈은 pre-test abandonment |
| 25 | 399 | overlay 가 뜨지 않는 상태 3종(booting·committed·redirecting)과 뜨는 예외(re-entry) |
| 26 | 400–401 | overlay 표시 조건 4-항 OR, qualifier variant 는 `instructionSeen` 만으로 auto-commit 금지 |
| 27 | 402 | **모달 a11y 전체** — role/aria-modal/aria-labelledby, 초점 진입 위치, Tab 순환, 닫힐 때 복귀 |
| 28 | 403 | **`Esc` 의 의미를 단계별로 규정** — instruction 에서는 consent write·redirect 까지 동일, secondary 없으면 무효 |
| 29 | 409 | test route 는 자체 consent banner·confirm dialog·popup 을 렌더하지 않는다 |
| 30 | 410 · 421 | 보이는 라벨(`Next`)과 실행되는 action(`accept_all_and_start`)의 **의도적 분리** |
| 31 | 413–419 | 조합별로 어떤 버튼이 몇 개 뜨는지의 매트릭스 |
| 32 | 432–438 | qualifier step 의 단계 수·Back·Continue disabled·final label·commit 시점 |
| 33 | 441–445 | recap chip → re-entry mode, cancel/confirm 의미, route 이동 금지 |
| 34 | 447–451 | `instructionSeen` 이 다음 진입에서 **무엇을 다시 보여 주는가** |
| 37 | 497 | canonical / scoring order / 표시 라벨 3체계 분리 |
| 38 | 501–503 | progress 분모·분자에 무엇이 들어가는가 |
| 40 | 512–513 | 재방문 시 기존 답변이 **선택된 상태로 표시** |
| 41 | 519–523 | tail reset 의 **즉시성** — 변경 확정과 동시에 eligibility·residue 변화 |
| 42 | 525–529 | backward navigation 의 보존 predicate 까지 규정 |
| 43 | 535–551 | eligibility 의 UI 반영 규칙 — 「시스템은 마지막 유효 응답을 임의로 제거·변경하면 안 된다」 |
| 44 | 621–636 | 결과 화면의 섹션 등급과 누락 시 화면 처리 |

합계 26행(#12·14·15·16·17·19·20·22·24·25·26·27·28·29·30·31·32·33·34·37·38·40·41·42·43·44). 이 26개가 모바일 리팩터에서 **다시 써야 하는 §3 의 실질 범위**다.

### 4-2. §4 Happy-path 화면 전환 순서와 모바일 탭·스크롤

#### 문서가 규정하는 순서

```text
[route guard]                      page.tsx:38-51 — runtime blocked / card 없음 / lazy validation 실패
      │                            → notFound() 또는 /test/error?variant=...
      ▼
[booting]                          runtimeReady && consentSnapshot.synced 까지 overlay·panel 모두 미표시
      │                            (req-test.md:399 · test-question-client.tsx:154)
      ▼
┌─ INSTRUCTION overlay (step 'instruction') ──────────────┐   req-test.md:432 · :400-401
│  제목 + variant 고유 instruction 본문                    │   modal: role=dialog, aria-modal (:402)
│  [divider] + consent note (조합에 따라)                  │   Esc = secondary CTA (:403)
│  [secondary quiet] [primary]                            │   primary label 은 qualifier variant 에서 'Next' (:410)
└──────────────┬──────────────────────────────────────────┘
               │ qualifier 없음 → COMMIT_ENTRY
               │ qualifier 있음 ↓
┌─ QUALIFIER step 0..N-1 (같은 overlay, 같은 다이얼로그) ──┐   req-test.md:433-437
│  question text + token 별 선택 버튼                      │
│  [Back] [Continue / Start / 변경하고 처음부터 다시 시작] │   Continue 는 선택 전 disabled (:435)
└──────────────┬──────────────────────────────────────────┘
               │ final Continue = COMMIT_ENTRY  (:437)
               ▼
┌─ QUESTION RUNTIME (scoring only) ───────────────────────┐   req-test.md:675
│  [제목]  [진행률 라벨 ····· NN%]                         │   퍼센트만, 'Question N of M' 금지 (:683)
│  [━━━━━━━━━━━──────────] 6px 트랙                        │
│  [qualifier recap chip]  ← qualifier variant 만          │   (:441)
│  Q{scoring order}                                        │   (:295 · :497)
│  질문 본문                                               │
│  [ 선택지 A                                        ○ ]   │
│  [ 선택지 B                                        ○ ]   │   답하면 150ms 잠금 후 자동 전진 (:677-678)
│  [이전]                                   [제출]         │   '다음' 컨트롤은 존재하지 않음 (:679)
└──────────────┬──────────────────────────────────────────┘
               │ live: Submit → final_submit → 같은 페이지 안에서 패널 교체 (:692-693)
               │ target: '결과 보기' ↓ (:730)
               ▼
        [DERIVATION LOADING ≥ 5초, '뒤로 돌아가기' 제공]        (:732)   ← 미구현
               ▼
        [/result/{variant}/{type}?{base64} 결과 페이지]          (:771)   ← 라우트 자체가 없음
```

live 런타임에서 실제로 일어나는 전환은 위 그림의 마지막 두 상자가 빠지고, `submitted` 가 `true` 가 되면 **같은 `test-shell-card` 안에서 질문 패널이 결과 패널로 교체**되는 것이다(`test-question-client.tsx:281-290`). 헤더(제목 + 진행률 바)는 결과 화면에서도 그대로 남는다 — 즉 100% 로 찬 진행률 바가 결과 위에 계속 떠 있다.

#### 모바일 탭 수 — 코드에서 추정

fixture 문항 수는 `src/features/test/fixtures/questions/` 에서 센 값이다: `qmbti` scoring 8(`qmbti.ts` 의 `seq: '1'`~`'8'`), `egtt` profile 1 + scoring 3(`egtt.ts:5-40`), `rhythm-b`·`energy-check` 각 4행. 프로덕션 문항 수는 Sheets 가 소유하므로 **미확인**이며, 아래는 fixture 기준이다.

| 경로 | `/test` 위에서의 탭 | 내역 |
|:---|---:|:---|
| qmbti · Direct Cold · `OPTED_IN` | **10** | instruction primary 1 + Q1–Q8 8 + Submit 1 |
| qmbti · Landing Ingress | **9** | instruction 1 + Q2–Q8 7 + Submit 1 (Q1 은 랜딩에서 seed, `bootstrap-state-resolver.ts:38-41` 이 다음 문항으로 진입) |
| qmbti · Direct Cold · `UNKNOWN` + `available` | **10** | 버튼은 2개지만 primary 1탭 — secondary 는 랜딩 복귀 |
| egtt · Landing Ingress · `UNKNOWN` | **7** | instruction `Next` 1 + qualifier 선택 1 + qualifier Start 1 + **이미 답해진 Q1 재탭 1** + Q2 1 + Q3 1 + Submit 1 |
| egtt · Direct Cold | **7** | 위와 같되 Q1 이 seed 되어 있지 않으므로 재탭이 아니라 최초 답변 |

랜딩에서 출발하는 경우 카드 확장 1탭 + A/B 1탭이 앞에 붙는다(랜딩 소관). **egtt landing ingress 의 「이미 답해진 Q1 재탭」은 다음 컨트롤이 없어서 생기는 순수한 낭비 탭**이다(§5 D-03).

theme-matrix 의 `completeTestAttempt` 레시피(`tests/e2e/theme-matrix-smoke.spec.ts:274-288`)가 같은 순서를 클릭으로 돌고 있고 루프 상한이 12회로 잡혀 있다 — 문항 수가 12를 넘으면 이 레시피가 깨진다는 뜻이기도 하다.

#### 모바일 스크롤 — 코드에서 추정

390px 폭에서 `--shell-gutter: 16px`(`globals.css:323`) 이므로 콘텐츠 폭 358px 로, 랜딩 카드 실측 폭(358px)과 같다. 질문 화면의 높이를 구성 요소별로 더하면:

| 구성 | 값 | 근거 |
|:---|---:|:---|
| `main` 상단 패딩 | 80 | `page-shell.tsx:22` `pt-20` (모바일; `md:pt-[88px]` 는 768px 이상) |
| 패널 상단 패딩 + 테두리 | 21 | `surface-class-names.ts:41` `p-5` + 1px |
| h1 (`--h3` 600 20px/1.3) 1줄 | 26 | `globals.css:206` |
| header gap-3 | 12 | `test-question-client.tsx:49` |
| 진행률 머리(캡션 13px/1.45) + gap-2 + 트랙 6px | 33 | `:61-65` · `globals.css:210` |
| 카드 gap-5 | 20 | `:48` |
| `Q{n}` 오버라인 12px/1.4 + gap-4 | 33 | `globals.css:211` |
| 질문 본문 (`--t-expanded-question` 21px/1.3) 2줄 + gap-4 | 71 | `globals.css:221` |
| 선택지 2개(각 12+12+21.75+2 ≈ 48) + gap-2 + gap-4 | 120 | `surface-class-names.ts:83` `px-3.5 py-3` · `--t-choice` 15px/1.45 |
| nav row 46px + gap-4 | 62 | `button-class-names.ts:60` `min-h-[46px]` |
| 패널 하단 패딩 + 테두리 | 21 | `p-5` + 1px |
| `main` 하단 패딩 | 24 | `page-shell.tsx:22` `pb-6` |
| **합계(추정)** | **≈ 506** | |

390×844 기기에서 브라우저 크롬을 뺀 가용 높이는 대략 660–780px 이므로 **질문 화면은 0 스크롤**이다. 390×667(SE 급, 가용 ≈ 560px)에서도 들어간다. 질문 본문이 4줄로 늘고 선택지가 각 2줄이 되는 최악의 경우(+ 약 100px)에도 606px 로 한 화면이다. 결과 패널은 문항 수만큼 데이터 행(각 `py-3` + 14px/1.55 ≈ 46px)이 쌓이므로 qmbti 8문항이면 헤더 포함 약 700px 로 **1 화면을 살짝 넘긴다**(추정) — 결과 CTA 두 개가 접힘 아래로 내려갈 수 있다.

instruction overlay 는 `fixed inset-0` 이라 문서 흐름 밖이고 **스크롤 컨테이너가 없다**(`instruction-overlay.tsx:145` 에 `overflow` 선언 없음, `globals.css` 전체에 `overflow` 문자열 0회). 모바일에서는 카드가 `min-h-full` + `pt-[88px]` 로 뷰포트를 채우므로, instruction 본문이 길어지면 하단의 CTA 행이 뷰포트 밖으로 밀려 **닿을 수 없다**. 현재 fixture instruction 은 한국어 40~50자(`source-fixture.ts:29-32` 등)라 2~4줄이지만, 이 값의 정본은 Sheets 의 `instruction_*` 컬럼(`req-test.md:115`)이므로 길이에 상한이 없다.

### 4-3. §6 이 모바일에서 요구하는 UI

§6 은 기기를 말하지 않지만, **실제로 그리라고 지시하는 화면이 5장**이고 그중 모바일에서 문제가 되는 것이 셋이다.

| 조항 | 요구하는 UI | 모바일에서 무엇이 필요한가 | 현재 구현 |
|:---|:---|:---|:---|
| §6.1 (`:841-856`) | 전용 라우트 `/[locale]/test/error` · 메시지 · `?variant=` 표시 · **미완료 카드 최대 2장** · 0장이면 랜딩 CTA | 카드 2장을 390px 에 세로로 쌓으면 랜딩 카드 규격(358×255)으로 510px + 헤딩 — 한 화면을 넘긴다. 에러 화면용 축약 카드 규격이 필요하다 | **stub.** `src/app/[locale]/test/error/page.tsx:44-56` 이 아이콘 + 하드코딩 한국어 헤딩 하나만 렌더한다. **복구 카드 0장, CTA 0개** — 랜딩으로 돌아갈 링크조차 없다 |
| §6.2 (`:885`) | 「명시적 error state 와 안전한 복귀 경로」 | 위와 같은 화면으로 수렴 | 같은 stub 으로 리다이렉트(`page.tsx:38-51`) |
| §6.3 (`:900`) | 에러 렌더링 + 랜딩 CTA, **부분 렌더링 금지** | 결과 라우트가 생길 때 필요 | `/result` 라우트 없음 — 해당 없음 |
| §6.4 (`:914-921`) | 섹션별 **빈 컨테이너 + 「준비 중」 문구 + console warning**, CTA 없음 | 모바일에서 빈 컨테이너가 세로를 먹는다. 섹션 자리를 비워 둘지 접을지의 결정이 필요 | 결과 섹션 자체가 없음 |
| §6.5 (`:931-945`) | loading/error 구분, actionable path, blocking/non-blocking 구분 | 비차단 오류의 표시 자리(토스트/인라인)를 모바일에서 정해야 한다 — 하단 고정 토스트는 safe-area 를 읽어야 한다 | 없음. 비차단 오류 표시 표면이 제품에 존재하지 않는다 |
| §6.6 (`:958-961`) | **액션 3개**: retry fresh entry / 이전 진행으로 돌아가기 / 홈 | 358px 폭에서 46px 버튼 3개를 세로로 쌓으면 CTA 블록만 154px. 우선순위(어느 것이 primary 인가)를 문서가 정하지 않는다 | 없음(commit-failure 상태 자체가 미구현) |
| §6.7 (`:976-979`) | **액션 3개**: 마지막 문항으로 / 다시 결과 보기 / 홈 | 위와 같음 | 없음 |
| §6.8 (`:997-1011`) | 화면 요구 없음(저장소 계약) | — | `storage/volatility.ts` 구현됨 |

모바일 관점에서 §6 의 실질 요구는 **「액션 3개짜리 오류 화면 두 장 + 카드 2장짜리 복구 화면 한 장」**이고, 문서는 그 세 화면의 액션 우선순위·배치·축약 규칙을 하나도 정하지 않았다. 동시에 §6.5 가 요구하는 blocking/non-blocking 구분은 모바일에서 **표시 자리가 다른 두 패턴**(전체 화면 vs 인라인/시트)을 요구하는데, 그 구분이 문서에는 심각도 라벨로만 있고 표현으로는 없다.

### 4-4. §7 Result 화면 — 구현 수준 확정

**결론: 결과 화면은 구현 전이다. 지금 있는 것은 「답변 덤프」이지 결과가 아니다.**

측정값:

1. **`/result` 라우트가 없다.** `src/app/[locale]/` 아래는 `blog`·`history`·`test` 뿐이고, `RouteBuilder` 의 `LocaleFreeRoute` union(`src/lib/routes/route-builder.ts:1-29`)에도 result 가 없다. §5.1 의 `/result/{variant}/{type}?{base64}` 는 문서에만 있다.
2. **현재 표면은 `/test/{variant}` 안의 인라인 패널이다.** `test-question-client.tsx:281` 의 `submitted ? <ResultConnector .../> : ...` 로 같은 셸 카드 안에서 교체된다.
3. **패널이 렌더하는 것 전부**(`test-result-panel.tsx:72-103`): h2 `resultLabel`(「최종 결과」) + p `resultBody` + `<dl>` 안의 답변 행 목록(키 = `question.id.toUpperCase()`, 값 = `'A'`/`'B'` 원문) + 「랜딩으로」 + 「이력 보기」 링크 둘. **mandatory 3섹션(`derived_type`·`axis_chart`·`type_desc`) 중 하나도 없다.**
4. **파생 토큰을 만들 층이 비어 있다.** `src/features/test/response-projection.ts` 는 export 가 하나도 없는 계약 예약 stub 이고, `result-connector.tsx:27-30` 의 주석이 그 사실을 적는다. 도메인(`domain/derivation.ts` 의 `computeScoreStats`·`deriveDerivedType`, `schema-registry.ts`)은 이미 있다.
5. **결과 콘텐츠 스키마가 없다.** `src/features/test/fixtures/results/index.ts` 의 `resultsSourceFixture` 는 `{variantId}` 넷뿐이며, `req-test.md:94` 가 「Result content schema 는 Phase 9 소유」라고 적는다.
6. **`result_viewed` 는 mount 발화**이고 `derived_type` 을 담지 않는다(`test-result-panel.tsx:58-70`). `req-test.md:75` 가 그것을 현재 계약으로 적고 `tests/unit/test-result-panel.test.ts` 가 고정한다.
7. **계획서는 착수 불가를 측정으로 확정했다.** `docs/plans/2026-05-17-result-pipeline-todos.md` 는 Task mode `Plan Only`, 「지금 착수할 수 없다」, 선행 = Phase 9 / result pipeline 이라고 적고(§1-5행), §3 에 6단계 순서를, §5 에 「사용자 확인이 필요한 결정 = 결과 콘텐츠 스키마 자체」를 남긴다. `req-test-plan.md:28` 도 Phase 9 를 전제 7·8 뒤에 둔다.

추가 결함 하나: **현재 패널의 행 라벨이 계약을 어긴다.** `test-result-panel.tsx:85` 가 `question.id`(= `q{canonicalIndex}`, `question-bank.ts:65`)를 대문자로 찍으므로 EGTT 에서는 `Q2·Q3·Q4` 가 나온다 — 런타임이 같은 문항을 `Q1·Q2·Q3` 로 불렀는데도 그렇다. `req-test.md:497` 은 「user-facing `Q1/Q2` 는 scoring question 에만 적용되는 별도 label 체계」라고 규정한다. `근거: 문서 내부 일관성 + 코드 실측`.

또 하나: `resultBody` 의 한국어 원문이 「최종 제출 시점의 답변(**수정된 1번 포함**)으로 결과가 계산됩니다」(`src/messages/kr.json` `test.resultBody`)로, 특정 시나리오(1번을 수정한 경우)를 12로케일 전부에 고정 문구로 내보내고 있다.

### 4-5. §1 Locked Decisions 중 IA 재설계를 막는 조항

**하나 있다 — `req-test.md:46`.**

> 절대 불변 규칙: instruction은 테스트 페이지(`/test/{variantId}`) 위의 overlay로 표시되며, `/instruction`과 같은 별도 라우트를 갖지 않는다. 문서 내 어떤 계약도 instruction을 독립 페이지·라우트로 해석해서는 안 된다.

이 조항이 막는 것과 막지 않는 것을 나누면:

- **막는다**: instruction·qualifier 를 **URL 을 갖는 스텝**으로 분할하는 것. 그래서 모바일의 하드웨어/제스처 뒤로가기가 「한 스텝 뒤로」로 동작하게 만드는 표준 패턴을 쓸 수 없다. 현재 overlay 는 history entry 를 만들지 않으므로, qualifier step 1 에서 스와이프 뒤로 하면 랜딩으로 **나가 버린다**(코드 구조 도출 — `use-test-entry-orchestrator.ts` 가 step 전환에 `router` 를 쓰지 않는다). iOS HIG·Material 3 모두 다단계 진입 플로우에서 시스템 뒤로가기를 스텝 뒤로에 대응시키는 것을 관행으로 삼는다.
- **막지 않는다**: 바텀시트. 바텀시트는 여전히 `/test/{variant}` 위의 overlay 이므로 이 조항과 충돌하지 않는다. 「전용 상세 화면」도 instruction 이 아닌 화면(결과·에러)이라면 충돌하지 않는다.
- **되풀이**: 같은 규칙이 `:399`(§3.6)·`:445`(qualifier re-entry)·`:825`(§5.2 CTA)에 세 번 더 적혀 있으므로, 개정하려면 네 곳을 함께 고쳐야 한다.

§1 의 나머지 조항 중 IA 를 건드리는 것은 **`:54-55` Result URL 구조** 하나인데, 성격이 다르다 — 이것은 *아직 없는* 화면의 라우트를 미리 못박은 것이고, 「결과를 `/test` 안에 머무르게 한다」는 모바일 선택지를 문서 수준에서 배제한다. 다만 절대 불변 규칙이 아니므로 개정 비용은 §11 동기화 표(`:1247` 행)를 따라가는 정도다.

그 외 §1.3 의 항목(진입 경로 2종·tail reset·7분·30분·휘발·5초 로딩)은 전부 **동작 또는 인터랙션**이고 IA 를 고정하지 않는다. 다만 `:57` 의 5초 최소 로딩은 「로딩 화면」이라는 **화면 한 장의 존재**를 강제하므로, IA 라기보다 「화면 수」를 늘리는 조항으로 따로 봐야 한다.

## 5. 표준 UX·인터랙션 관점 결함 — 근거를 붙여서

심각도는 모바일 사용자에게 미치는 영향 기준이다. 각 항목의 `근거` 는 판정의 출처 종류다.

### D-01 · 높음 · 모달 다이얼로그가 GNB 아래 층에 깔린다

`instruction-overlay.tsx:145` 가 `z-[1050]`, `site-gnb.tsx:38` 의 `gnb-shell` 이 `sticky top-0 z-[1100]`. 두 원소는 같은 최상위 스태킹 문맥의 형제(`page-shell.tsx:19-26`)이므로 **GNB 가 모달 위에 그려지고 계속 눌린다**. 모바일 카드가 `pt-[88px]` 를 갖는(`instruction-overlay.tsx:26`) 이유가 바로 그것이다 — 위를 덮은 GNB 를 피해 내용을 밀어 내린 것이지, 모달이 그 영역을 소유한 것이 아니다. 그래서 `aria-modal="true"`(`:152`)와 Tab 트랩(`:113-138`)이 있어도 **터치 사용자는 모달이 열린 채 GNB 링크·설정·모바일 메뉴(z-1200)를 누를 수 있다**. 같은 파일의 주석(`:24`)은 「모바일에서는 표면이 뷰포트를 가득 채워 뒷면이 보이지 않으므로 모서리를 걷는다」고 적지만, GNB 가 덮는 상단 88px 에서는 그 전제가 성립하지 않는다.

`근거: 코드 실측(z-index 6개 전수 — transition 1300 / GNB 메뉴 1200 / GNB 셸 1100 / consent 1075 / instruction 1050) + 규범(WCAG 2.4.11 Focus Not Obscured (Minimum) AA) + 플랫폼 관행(모달은 최상위 층)`

### D-02 · 높음 · 「이전」 한 번이 답변 두 개를 경고 없이 지운다

`req-test.md:527` 이 보존 predicate 를 `Number(key) < nextIndex` 로 못박고, `use-test-run-controller.ts:199-203` 이 그대로 구현한다. 즉 Q8 에서 「이전」을 한 번 누르면 **목적지인 Q7 의 답과 현재 Q8 의 답이 둘 다 사라지고** eligibility 가 false 가 된다(`:521`). 확인 대화도, 되돌리기도, 사전 경고 문구도 없다. 문서 자신이 예시로 그 동작을 적는다(`:528`). 모바일에서 「이전」은 **앞 문항을 다시 읽으려는** 가장 흔한 동작이고, 버튼은 하단 엄지 영역 왼쪽에 46px 로 놓여 있다(`test-question-client.tsx:389-404`). 파괴적 행동과 탐색 행동이 같은 컨트롤에 묶여 있다.

`근거: 규범(파괴적 행동의 확인/취소 — 되돌릴 수 없는 데이터 손실) + 코드 실측 + 문서 내부 일관성(§3.10:550 「시스템은 마지막 사용자의 유효 응답을 임의로 제거하거나 변경하면 안 된다」와 정면 충돌)`

### D-03 · 높음 · 「다음」 컨트롤이 존재하지 않는다

`req-test.md:679` 이 「다음 문항 이동은 응답 확정 직후 자동 진행으로 처리한다」고 적고, 리듀서에 `NAVIGATE_PREVIOUS` 는 있어도 `NAVIGATE_NEXT` 가 없다(`test-run-reducer.ts:44`). 전진하는 유일한 경로는 `useAnswerLock` 의 콜백(`use-answer-handler.ts:87-93`)이다. 결과: **이미 답한 문항에서 앞으로 가려면 다시 답해야 한다.** EGTT landing ingress 는 이 상황으로 *시작한다* — 첫 runtime 화면이 랜딩에서 이미 답한 canonical 2 이기 때문이다(§4-2 표). 진행률은 33%인데 화면은 `Q1` 이고 선택지 하나가 이미 선택돼 있는 상태에서, 사용자가 할 수 있는 것은 같은 답을 다시 누르는 것뿐이다.

`근거: 코드 실측 + 문서 내부 일관성(§3.3:341 vs :342 의 비대칭) + 플랫폼 관행(설문/위저드의 Back·Next 쌍)`

### D-04 · 높음 · 「Next」라고 적힌 버튼이 분석 동의를 저장한다

`req-test.md:410` 과 `:421` 이 그것을 현재 계약으로 명문화한다 — qualifier variant 의 instruction primary 는 visible label 만 `Next` 로 바뀌고 action identity 는 `accept_all_and_start` 이므로 「consent 저장 효과는 그대로 실행된다」. `:417`·`:418`·`:419` 세 행이 그 조합을 표로 적고, §12.2 #3(`:1272`)이 릴리스 차단 단언으로 고정한다. 구현도 그렇다(`test-question-client.tsx:299-307` 이 label 만 `t('next')` 로 갈아 끼우고 `primaryButton.action` 을 그대로 실행). 모바일에서는 note 본문이 더 쉽게 지나쳐지고 `Next` 가 엄지 영역의 primary 다.

`근거: 문서 내부 일관성(라벨↔효과 불일치를 문서가 스스로 기록) + 코드 실측 + 규범(동의는 명시적·정보에 근거해야 한다 — 라벨이 효과를 서술하지 않으면 성립하지 않는다)`

### D-05 · 중간 · EGTT 첫 문항의 「이전」 버튼은 보이고 눌리지만 아무것도 하지 않는다

가시성이 `currentQuestionIndex === 1` 로만 판정된다(`test-question-client.tsx:400`). EGTT 의 첫 runtime 화면은 canonical **2** 이므로 버튼이 보인다. 누르면 `moveQuestion(-1)` → `skipBackwardPastProfile(1)` = 1 → `isProfileQuestion(questions[0])` 이 참이라 **early return**(`use-test-run-controller.ts:194-197`, `question-runtime-utils.ts:26-35`). 죽은 컨트롤이다. 테스트도 없다 — `test-prev-button` 단언은 저장소 전체에서 `theme-matrix-smoke.spec.ts:252` 한 줄뿐이고 그것은 qmbti 경로다.

`근거: 코드 실측(실행 경로 추적) + 규범(작동하지 않는 컨트롤은 노출하지 않는다)`

### D-06 · 중간 · qualifier recap chip 이 32px 이고 `div` 다

`surface-class-names.ts:93` 의 `min-h-8` = 32px. WCAG 2.5.8 의 24px 최소는 통과하지만, **이 저장소 자신의 기준인 44px 바닥**(`button-class-names.ts:57` 이 `design.md` §4.10 을 인용하며 46px 를 그 바닥 위의 값으로 설명한다)을 밑돈다. 같은 파일의 버튼 전부가 46px / `--tap-min` 44px 인데 칩만 32px 다. 더구나 `qualifier-chip.tsx:24-32` 는 네이티브 `<button>` 이 아니라 `div role="button" tabIndex={0}` 이다. 이 칩은 **런타임 안에서 되돌릴 수 있는 유일한 경로**(qualifier 변경)의 입구다.

`근거: 규범(WCAG 2.5.8 통과 / 플랫폼 44px 관행 미달) + 문서 내부 일관성(같은 파일이 44px 바닥을 인용) + 코드 실측`

### D-07 · 중간 · instruction overlay 에 스크롤 컨테이너가 없다

`instruction-overlay.tsx:145` 의 컨테이너는 `fixed inset-0 grid place-items-center p-6 max-[767px]:p-0`, 카드는 `min-h-full … content-start … pt-[88px]`(`:26`). 둘 다 `overflow` 를 선언하지 않고, `globals.css` 전체에 `overflow` 문자열이 0회다. `fixed` 원소는 페이지 스크롤로 움직이지 않으므로, 내용이 뷰포트보다 길어지면 하단 CTA 에 **닿을 방법이 없다**. instruction 본문 길이의 정본은 Sheets `instruction_*` 컬럼(`req-test.md:115`)이라 상한이 없고, `UNKNOWN + opt_out` 조합에서는 61자짜리 note(`kr.json` `test.unknownOptOutNote`)와 divider 와 버튼 2개가 함께 붙는다. 같은 앱의 다른 전체 화면 층인 GNB 모바일 패널은 `overflow-y-auto` + `overscroll-contain` + `[height:100dvh]` + `env(safe-area-inset-bottom)` 를 전부 갖는다(`site-gnb.tsx:87`) — **두 전체 화면 층이 같은 문제를 정반대로 다룬다.**

`근거: 코드 구조 도출(런타임 미측정) + 규범(WCAG 1.4.10 Reflow 320px · 1.4.4 Resize text 200%) + 문서 내부 일관성(GNB 패널과의 비대칭)`

### D-08 · 중간 · 150ms 잠금은 마우스 리듬이지 엄지 리듬이 아니다

`req-test.md:678` 이 「현재 150ms」를 계약으로 적고 `use-answer-lock.ts:32` 가 기본값으로 갖는다. 자동 전진 후 새 문항의 선택지는 **직전에 누른 좌표와 같은 자리**에 나타나고(`test-question-client.tsx:353-386`, 가로 18px 슬라이드 0.18s), 잠금은 150ms 만에 풀린다. 연속 탭 간격이 150ms 를 넘는 흔한 리듬에서는 다음 문항을 **읽기 전에** 답이 확정될 수 있다. 저장소 전체에 `touch-action` 선언이 0건이라는 점(브리핑 실측)도 같은 구간에 겹친다.

`근거: 코드 실측(값·좌표·타이밍) + 플랫폼 관행(터치 연타 간격) + 규범(WCAG 2.5.2 Pointer Cancellation 의 취지 — 실수 입력의 취소 가능성). 실제 오답률은 런타임 미측정 → 미확인`

### D-09 · 중간 · 문항이 바뀌어도 초점과 안내가 따라가지 않는다

`motion.div` 의 `key={currentQuestionIndex}`(`test-question-client.tsx:354`)로 선택지 버튼이 매 문항 언마운트/재마운트된다. 그런데 `src/features/test/**` 전체에 `scrollIntoView`·`scrollTo` 가 0건이고, `focus()` 는 `instruction-overlay.tsx` 안에만 있다. 문항 전환 시 초점은 body 로 흘러가고, 새 질문 텍스트를 알리는 live region 도 없다. 진행률은 `role="progressbar"` + `aria-valuenow` 로 노출되지만(`:263-272`) 값 변화가 발표되지는 않는다.

`근거: 코드 실측 + 규범(WCAG 2.4.3 Focus Order · 4.1.3 Status Messages AA)`

### D-10 · 중간 · `beforeunload` 가드는 모바일에서 지켜 주지 않으면서 bfcache 만 막는다

`use-before-unload-guard.ts:16-32` 가 진행 중에 `beforeunload` 를 등록한다. 이 가드는 `req-test.md` 에 근거 조항이 없다(문서 전체에 `beforeunload` 0회) — 즉 계약 밖의 구현이다. 모바일 브라우저에서 이 확인창은 신뢰할 수 없고, 등록 자체가 back/forward cache 를 무효화해 **스와이프 뒤로 → 앞으로** 왕복에서 페이지를 재마운트시킨다. 응답은 localStorage 에 있으니 살아남지만 dwell·attempt 문맥은 초기화된다.

`근거: 플랫폼 관행(모바일 Safari/Chrome 의 beforeunload·bfcache 취급) + 코드 실측(문서 근거 부재). 실제 브라우저 거동은 런타임 미측정 → 미확인`

### D-11 · 중간 · 에러 복구 페이지가 계약의 절반도 렌더하지 않는다

§6.1(`:848-856`)은 미완료 카드 최대 2장과, 0장일 때의 랜딩 CTA 를 요구한다. 실제 페이지(`src/app/[locale]/test/error/page.tsx:44-56`)는 X 아이콘 하나와 헤딩 하나뿐이며 **어떤 링크도 없다** — 사용자는 브라우저 뒤로가기 말고 나갈 방법이 없다. 헤딩은 12로케일 전부에 하드코딩 한국어(`:29-31`)이고 raw variant id 를 그대로 끼운다. 파일 주석 자신이 그것을 「내용 결함이라 보고 대상」으로 적는다(`:7-9`).

`근거: 문서 내부 일관성(§6.1 미이행) + 코드 실측 + 규범(막다른 화면에는 복귀 경로가 있어야 한다)`

### D-12 · 낮음~중간 · 결과 화면 위에 100% 진행률 바가 남는다

`test-question-client.tsx:254-279` 의 헤더가 `submitted` 분기 밖에 있어서 결과 패널에서도 계속 렌더된다. 끝난 시도 위에 「진행률 100%」가 남는 것은 상태 피드백의 오독을 만든다. 모바일에서는 그 헤더가 결과 첫 화면의 위 100px 가량을 차지한다.

`근거: 코드 실측 + 규범(상태 피드백의 정확성)`

### D-13 · 낮음 · 결과 행 라벨이 canonical index 를 쓴다

§4-4 의 마지막 문단과 같다. EGTT 에서 런타임은 `Q1·Q2·Q3`, 결과는 `Q2·Q3·Q4`.

`근거: 문서 내부 일관성(§3.8:497) + 코드 실측(test-result-panel.tsx:85)`

### D-14 · 낮음 · 모바일 카드 상단 여백 88px 이 셸의 80px 과 어긋난다

`instruction-overlay.tsx:26` 의 `max-[767px]:pt-[88px]` 는 767px 이하에 적용되는데, 같은 폭에서 셸 `main` 의 상단 패딩은 80px 다(`page-shell.tsx:22` `pt-20`; 88px 는 `md:` 이상). 두 리터럴이 서로 다른 브레이크포인트 규칙을 따르고 토큰화돼 있지 않다.

`근거: 코드 실측 + 문서 내부 일관성`

## 6. 서명 인터랙션 3분류

사용자 결정 7 에 따라, 테스트 플로우의 「서명 인터랙션」을 세 갈래로 낸다.

### 보존 권고

| 인터랙션 | 근거 |
|:---|:---|
| **응답 확정 직후 자동 전진**(`:677`) | 모바일에서 탭 수를 최소로 유지하는 유일한 장치다. qmbti 8문항 기준 「답 + 다음」 2탭 구조였다면 17탭이 됐을 것을 10탭으로 만든다. 다만 지연값과 「다음」 보조 컨트롤은 교체 대상(아래) |
| **진행률 바 + 퍼센트, 문항 번호 텍스트 금지**(`:683`) | 12로케일에서 `Question N of M` 은 폭 압력이 크고, 남은 문항 수를 숫자로 보이는 것은 이탈을 늘린다는 것이 설문 UX 의 통상 판단이다. 현재 구현(트랙 6px + 라벨을 트랙 밖 고정)도 이미 한 차례 개선된 결과다(`test-question-client.tsx:58-60` 주석) |
| **instruction overlay 의 모달 a11y 계약**(`:402`) | 초점을 첫 컨트롤이 아니라 컨테이너에 두는 규정까지 포함해 표준과 정합한다. 층 순서(D-01)만 고치면 그대로 쓸 수 있다 |
| **`Esc` = 그 단계의 dismiss action**(`:403`), 특히 secondary 가 없으면 무효 | 동의를 묻는 문을 `Esc` 로 통과시키지 않는다는 판단이 옳다. 모바일에는 `Esc` 가 없으므로 **같은 의미를 제스처/백버튼에 옮기는 작업**이 남는다 |
| **qualifier recap chip 으로 되돌아가기**(`:441-445`) | 런타임 안에서 되돌릴 수 있는 유일한 경로다. 규격(32px·`div`)만 교체 |
| **canonical index 와 표시 라벨의 분리**(`:497`) | 데이터 무결성의 근간. 표시 쪽 버그(D-13)는 이 규칙을 어긴 것이지 규칙의 잘못이 아니다 |

### 교체 권고

| 인터랙션 | 무엇으로 | 근거 |
|:---|:---|:---|
| **「이전」 단일 컨트롤 + tail reset**(`:519-529`, `:679`) | 「되돌아가 보기」와 「고치기」의 분리. 이동은 무해하게, 응답 변경 시에만 이후 응답 폐기를 **확인받고** 수행 | D-02 |
| **다음 컨트롤 부재**(`:679`) | 이미 답한 문항에서는 「다음」을 제공. 자동 전진과 공존 가능하다 | D-03 |
| **150ms answer lock**(`:678`) | 값 재설정 + 새 문항 마운트 직후의 짧은 입력 무시 구간 | D-08 |
| **`Next` 라벨이 `accept_all_and_start` 를 실행**(`:410`·`:421`) | 라벨과 효과의 일치. qualifier 유무가 동의 문구를 바꿔서는 안 된다 | D-04 |
| **5초 최소 로딩**(`:57`·`:732`) | 계산이 끝나면 즉시 결과. 연출이 필요하면 결과 화면 안의 진입 모션으로 | 인위적 대기는 모바일에서 이탈 구간이 되고, 「뒤로 돌아가기」를 그 화면에 두어야 하는 부담까지 만든다 |
| **에러 복구 페이지 stub**(`test/error/page.tsx`) | 12로케일 메시지 + 복구 카드 2장 + 랜딩 CTA | D-11 |
| **`beforeunload` 가드** | 모바일에서 동작하는 이탈 보호(자동 저장은 이미 있다 — 가드 자체가 불필요할 수 있다) | D-10 |
| **결과 패널 위의 진행률 헤더** | `submitted` 분기 안으로 | D-12 |
| **결과 행의 canonical 라벨** | scoring order | D-13 |

### 결정 필요 (사용자 판단)

| 물음 | 걸린 조항 | 양쪽의 대가 |
|:---|:---|:---|
| instruction·qualifier 를 **URL 을 갖는 스텝**으로 낼 것인가 | `:46` 절대 불변 규칙(+ `:399`·`:445`·`:825`) | 낸다: 시스템 뒤로가기가 스텝 뒤로가 되고 딥링크·복원이 쉬워진다 / 안 낸다: 계약 4곳과 §12.2 #3 을 건드리지 않는다 |
| qualifier step 을 **바텀시트**로 내릴 것인가 | `:432-437`(절대 불변 규칙과 충돌하지 않음) | 엄지 영역에 선택지가 오지만, instruction step 과 시각적으로 다른 층이 되어 「같은 창의 다음 단계」라는 현재 모델이 깨진다 |
| 결과를 **`/result` 라우트**로 뺄 것인가, `/test` 안에 둘 것인가 | `:54-55`·§5.1·§5.2 | 뺀다: 공유 URL·뒤로가기·history 가 자연스럽다 / 둔다: 모바일에서 제출→결과가 한 문맥으로 이어지고 라우트 하나가 줄어든다 |
| **tail reset 을 유지할 것인가** | `:52`·`:519-529`·§12.2 #9 | 유지: 응답 집합의 시간 순서 무결성 / 폐기: 모바일 오조작 비용 제거. 중간안(변경한 문항 이후만 무효화하고 「다시 확인하세요」로 표시)도 가능 |
| landing pre-answer 소비를 **어느 쪽으로 통일**할 것인가 | `:341` vs `:342` | 건너뛰기: 탭 1회 절약, 답한 내용을 못 본다 / 다시 보여 주기: 확인 가능, 재탭 강요(D-03 과 묶임) |
| 문항 화면에 **남은 문항 수**를 보일 것인가 | `:683` 의 금지 | 보임: 예측 가능성 / 금지 유지: 이탈 억제. 현행 금지는 유지 권고이나 재확인 대상 |
| 비차단 오류의 **표시 자리** | §6.5 `:931-945` | 하단 토스트(safe-area 필요) vs 인라인 배너. 제품에 아직 어느 것도 없다 |

## 7. 다음 단계가 알아야 할 구조적 사실

1. **0단계(구조 분리)의 증거망은 테스트 플로우에서 이미 성립한다.** 모바일 시각 baseline 12장(instruction 4 · question 4 · result 4)이 `theme-matrix-manifest.json` 의 `test-instruction`·`mobile-test-question`·`mobile-test-result` 케이스로 잡혀 있고, `completeTestAttempt` 레시피가 390px 에서 전체 시도를 돌린다. **행동 무변경을 증명할 시각 축은 있다.**
2. **반대로 기능 e2e 의 모바일 축은 0 이다.** `/test/` 로 이동하는 spec 전부가 1280 이상에서 돈다. 모바일 인터랙션을 바꾸면 **지금 있는 기능 테스트는 하나도 붉어지지 않는다** — 회귀를 잡을 그물이 그 축에 없다.
3. **`req-test.md` 를 고치면 §11 동기화 표(`:1229-1253`)와 §12.2 릴리스 차단 항목(`:1268-1312`)을 같은 변경셋에서 고쳐야 한다.** 특히 §12.2 #3 한 항목이 §3.6 전체를 한 문단으로 재진술하고 있어, instruction/qualifier 인터랙션을 바꾸면 그 문단을 통째로 다시 써야 한다.
4. **결과·로딩·오류 3영역은 「개정」이 아니라 「설계」다.** §4.6·§5·§6.3·§6.4·§6.6·§6.7·§7 은 구현물이 없으므로 기존 조항을 보존할 이유가 없고, 모바일 최적을 먼저 설계한 뒤 문서를 거기 맞추는 사용자 결정 1 이 가장 깨끗하게 적용되는 구간이다.
5. **`response-projection.ts` 한 층이 결과 파이프라인 전체의 잠금 장치다.** export 가 0 이고, 그것 없이는 `derivedType` 이 없고, 그것이 없으면 `derived_type` 블록도 IntersectionObserver 도 `result_viewed` payload 도 없다. 계획서가 그 순서를 이미 적어 두었다(`docs/plans/2026-05-17-result-pipeline-todos.md` §3).

## 8. 미확인

- **프로덕션 문항 수.** 위의 탭 수는 fixture(qmbti 8 · egtt 3 scoring) 기준이다. 실제 문항은 Questions Sheets 가 소유하므로(`req-test.md:105`) 프로덕션에서 한 시도의 탭 수가 몇인지 알 수 없다. §5.1 의 예시 payload(`:786-789`)는 axis 당 9·17·17·17, 합 60문항을 암시하지만 그것은 문서의 예시이지 실 데이터가 아니다.
- **instruction overlay 의 실제 오버플로.** D-07 은 코드 구조에서 도출한 것이고 브라우저에서 재현하지 않았다. 현재 fixture 문구 길이로는 재현되지 않을 가능성이 높다.
- **`beforeunload` 의 모바일 거동과 bfcache 영향**(D-10). 플랫폼 관행 기반 판단이며 이 세션에서 측정하지 않았다.
- **150ms 잠금의 실제 오답 유발률**(D-08). 좌표·타이밍은 코드 실측이지만 사용자 행동은 미측정.
- **`docs/req-landing.md` 와의 경계.** `req-test.md` 는 consent instruction matrix 의 SSOT 를 §13.5 로, 랜딩 카드·attribute 계약을 §2·§13.9 로 위임한다(`:36-37`·`:195`). 그 문서를 이 과제에서 읽지 않았으므로, D-04(라벨↔효과)가 랜딩 쪽 조항으로 어디까지 번지는지는 확인하지 못했다.
- **profile question 이 마지막에 오는 variant.** `isLastQuestion` 이 `currentQuestionIndex >= questions.length`(canonical, profile 포함 — `use-test-run-controller.ts:156`)이므로, profile 이 마지막 canonical index 를 차지하는 variant 에서는 마지막 scoring 문항에서 Submit 이 뜨지 않을 수 있다. 그런 fixture 가 없어 확인하지 못했다.
- **`final_submit.question_index_1based`.** 코드는 `totalQuestions`(canonical 개수)를 보내는데(`use-test-run-controller.ts:254`) 문서는 「최종 answered canonical index」라고 적는다(`:1155`). 현재 fixture 에서는 두 값이 같아 차이가 드러나지 않는다.
