# req-test 개정 — tail reset 폐지와 이전 응답 표식

**Task mode:** Implementation. **Ask-First·SSOT 해당** — `docs/req-test.md`(동작 계약 정본)를 개정한다.

**승인 경위.** 2026-09-15 감사 발굴 #2 가 「step 2 가 배정받았으나 하지 않은 `req-test.md` 개정 둘」을 드러냈고, 그중 `Esc`(개정안 A)는 BQ-41 로 먼저 닫혔다. 남은 후진 이동 개정(개정안 B)에 대해 사용자가 두 가지를 확정했다 — **⑴ 표시 규칙은 「가」안**(마지막 문항은 예외로 선택 상태 유지), **⑵ tail reset 규칙 자체를 폐지**.

## 1. 왜 tail reset 을 폐지하는가 — 도메인 근거가 없다

조언 단계에서 확인한 사실이 결정을 지었다.

- **도출은 축별 독립 집계다.** `computeScoreStats`(`src/features/test/domain/derivation.ts:34-72`)가 각 scoring 문항을 자기 축의 pole 카운트에 `+1` 하고 다수 pole 을 `dominant` 로 뽑는 것이 전부다. 문항 사이에 조건도 가중치도 없다.
- **문항 집합은 고정이다.** `req-test.md` §3.8 이 「`questions[]` 배열은 실행 순서의 유일한 소스」라고 못박는다 — 적응형이 아니므로 앞 응답이 뒤 문항 구성을 바꾸지 않는다.
- 즉 앞 응답을 고쳐도 뒤 응답이 무의미해지는 경로가 **구조적으로 없다.** `req-test-plan.md` 는 tail reset 을 구현 사실로만 적고(`:25`·`:268`) 근거는 어디에도 없다.

그리고 **개정 B 가 tail reset 을 그대로 두면 상황이 나빠진다.** 종전에는 파괴가 「이전」을 누르는 순간 일어나 원인과 결과가 붙어 있었다. 이동이 안전해지면 파괴가 **탭으로 옮겨 가** — 되돌아가 둘러보는 동안 아무 일도 없다가 하나를 고치는 순간 뒤가 사라진다. 직전 상호작용이 「돌아다니는 건 안전하다」를 가르쳐 놓고 배신하는 구조다.

폐지 대신 남기려면 **경고 다이얼로그**가 따라붙어야 하고, 그것은 [다음] 버튼 없이 탭 하나로 흐르는 이 플로우의 성격과 정면으로 부딪친다.

## 2. 개정 내용

| # | 무엇 | 어디 |
|:--|:---|:---|
| 1 | **이동도 변경도 응답을 제거하지 않는다.** 폐기 대상은 derivation residue 뿐 | `req-test.md` §3.9 · §8.3 |
| 2 | eligibility 를 잃는 경로는 응답 집합이 실제로 줄어드는 경우(qualifier 재진입 reset) 하나뿐 | §3.10 |
| 3 | **기존 응답이 있는 문항은 두 선택지 모두 unselected + 과거 응답 쪽 표식.** 표식은 선택이 아니며 보조기술에 텍스트 대안으로 간다 | §3.9 · §4.3 |
| 4 | **마지막 문항은 예외** — 자동 진행이 없어 선택 상태가 머무를 수 있고 그것이 "결과 보기" CTA 가 활성인 이유다 | §4.4 |
| 5 | 응답 확정 후 목적지는 첫 미응답 scoring question, 없으면 **마지막 scoring question** | §4.3 |

§11 Single-change Synchronization 표가 이 정책의 동반 절을 이미 `3.9, 3.10, 4.3, 4.4, 8.3, 12.2` 로 적고 있어 그것을 체크리스트로 썼다.

## 3. 바뀐 파일

**계약·문서**: `docs/req-test.md`(§1.1·§1.3·§1.4·§3.9·§3.10·§4.3·§4.4·§8.3·§11·§12.2 항목 9·20) · `docs/req-test-plan.md` · `docs/project-analysis.md` · `docs/plans/2026-09-14-mobile-refactor-design-spec.md`(§2-2 · §3-5 신설) · `docs/plans/2026-09-11-mobile-refactor-step3-surfaces.md`(§0-2) · `docs/decision-register.md` · `docs/LESSONS_LEARNED.md`

**런타임**: `src/features/test/test-run-reducer.ts`(`NAVIGATE_PREVIOUS` 에서 tail 절단 제거, `filterAnswersBeforeIndex` 폐기) · `use-test-run-controller.ts`(후진 이동이 응답 집합을 읽지도 쓰지도 않음, 목적지 fallback) · `answer-choice-state.ts`(신설, 순수) · `test-question-client.tsx` · `surface-class-names.ts` · `src/messages/*.json` 12 개

**검사**: `tests/unit/answer-choice-state.test.ts`(신설) · `test-run-reducer.test.ts` · `use-test-run-controller.test.ts` · `tests/e2e/question-flow-smoke.spec.ts`(신설)

## 4. Impact assessment

- **공유 셸·GNB**: 없음. 변경은 테스트 런타임 표면 안에서 끝난다.
- **localization**: 메시지 키 `test.previouslySelected` 12 locale 추가. 표식은 글리프라 텍스트 길이 압력이 없다.
- **a11y**: 표식은 `aria-checked`·`aria-pressed` 를 쓰지 않는다 — 선택이 아닌 것을 선택으로 주장하지 않기 위해서다. 시각적으로 숨긴 텍스트가 이름에 들어간다. 글리프 대비 실측 light **5.08:1** · dark **7.81:1**(비텍스트 기준 3:1).
- **상태 계약**: `all-required-answered` 가 후진 이동·변경으로 더 이상 거짓이 되지 않는다 — §3.10 의 「단순 이동만으로는 eligibility 를 상실하지 않는다」가 **처음으로 도달 가능해진다.**
- **핵심 사용자 흐름**: 되돌아가 하나를 고친 사용자가 원래 있던 자리로 돌아온다. 종전에는 거기서부터 끝까지 한 문항씩 탭해 내려와야 했다.

## 5. Validation

```bash
cd "$(git rev-parse --show-toplevel)" && npm run lint && npm run typecheck && npm test && npm run build && npm run qa:rules
```

E2E 는 `#test-flow` 앵커에 더해 신설 스펙을 preview 로 돌린다.

```bash
cd "$(git rev-parse --show-toplevel)" && npm run test:e2e:smoke -- --grep "AR-01|AR-02"
```

**고장 주입 여섯이 전부 의도대로 갈렸다**: 마지막 문항 예외 제거 · 과거 응답을 선택으로 렌더 · 이동이 다시 응답을 지움 · 목적지 fallback 되돌림 · 마크 슬롯 확대(라벨 폭 260→250) · 표식 자리 이동. 다섯 번째는 **처음에 통과했고** 그것이 단언의 결함을 드러냈다 — §6.

## 6. 남은 것과 판단

- **`docs/design/ds/catalog-components.css` 는 건드리지 않았다.** `.vt-choice--answer` 의 마크는 두 상태만 갖는데 제품은 이제 셋이다. 그 디렉터리는 Ask-First 이고 편집이 Claude Design 으로 push 되므로 **별도 승인 사항**으로 남긴다. 런타임이 소비하지 않는 문서 계층이라 제품 동작에는 영향이 없다.
- **함정 원장 L36·L37 등재.** 기하 단언을 시작 좌표로만 쓰면 뒤쪽 원소가 흔들 때 공허하다는 것과, 서버를 띄운 채 재빌드하면 헬스체크가 구 서버를 보고 초록을 준다는 것.
