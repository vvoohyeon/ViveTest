## 2. Wave 3 핸드오프 참고사항

### 진입 조건
Wave 2 완료 ✅ → Wave 3 진입 가능

### Wave 3 목표 (wave-roadmap.md 기준)
Normal 카드 시각 스타일 적용:
- resting / hover / focus border
- shadow
- radius
- thumbnail treatment
- tags compact style

### Attach Point
`NormalCardFace` — collapsed / expandedTitleOnly 양쪽 mode를 통해 4개 슬롯 모두 소유.

### CSS-Only 적용 가능성 (Wave 2 Visual-Ready 보고서 확인 완료)

| 슬롯 | 주요 anchor | Wave 3 skin | CSS-only |
|---|---|---|---|
| `cardThumbnail` | `styles.normalThumbnail`, `landing-grid-card-thumbnail-slot` | thumbnail treatment | ✅ |
| `cardTitle` | `styles.normalTitle`, `landing-grid-card-title-normal` | title style / focus ring | ✅ (W2-LI-01 완료 후) |
| `cardSubtitle` | `styles.normalSubtitle`, `landing-grid-card-subtitle-normal` | subtitle style | ✅ |
| `tags` | `styles.normalTags`, `landing-grid-card-tags`, `data-tag-count` | compact tags | ✅ |
| root/trigger | `styles.root`, `landing-grid-card`, `landing-grid-card-trigger` | border / shadow / radius | ✅ |

- 새 wrapper 불필요
- 새 public `data-slot` 불필요
- layout-affecting change 불필요

### Wave 3 금지 항목 (Wave 11, 8, 9로 분리)
- keyboard behavior hardening (focus-expands, Esc/close) → Wave 11
- Blog `Read more →` tag row → Wave 8
- Unavailable muted surface / dashed pill → Wave 9
- `DesktopExpandedShell`, `ExpandedTestBody`, `ExpandedBlogBody` 수정 금지

### 태그 row 주의사항
Wave 3 tags compact style 적용 시 tag row는 Wave 8 Blog용 확장(`Read more →` 추가)을 위해
extensible 구조 유지 필요. closed 디자인으로 고정하면 Wave 8과 충돌.

---

## 3. Wave 3 사전 분석 3가지 항목 개요

Wave 1과 Wave 2에서 각각 Investigation Report / Logic Improvement Analysis / 전문 조사(Motion-Ready / Visual-Ready)로 구성했던 패턴을 Wave 3에도 적용한다.

---

### 분석 1 — Wave 3 Investigation Report

**핵심 질문:** Wave 2 이후 Normal face의 CSS/className/token 구조가 Wave 3 skin을 받을 준비가 되었는가?

**주안점:**
- 현재 `landing-grid-card.module.css`의 Normal face 관련 class 전체 목록
- root/trigger에 적용된 현재 visual class 및 CSS variable 사용 현황
- 기존 design token(`--landing-card-radius` 등)과 새 Visual Style 스펙 간 갭
- 현재 hover/focus CSS hook 위치 및 형식 (`:has(:focus-visible)` 등)
- thumbnail slot의 현재 aspect ratio, overflow, fit 처리 방식
- tags row/chip의 현재 padding, gap, font-size 처리 방식
- Wave 3 skin을 막는 구조적 결함 여부 (있다면 Wave 2 fallout인지 Wave 3 자체 전제인지 구분)

**권장 산출 구조:**

Context Verification
Current CSS/Token Map (Normal face 전체)
Per-target Current State (border / shadow / radius / thumbnail / tags / hover-focus)
Gap from Visual Style Spec
Stop Conditions
Wave 3 Readiness Summary


---

### 분석 2 — Wave 3 Skin Logic Analysis

**핵심 질문:** Wave 3에서 허용 가능한 skin 적용 후보만 선별하고, W3-VS-* 단위로 approve / conditional / defer / reject 분류할 수 있는가?

**주안점:**
- W3-VS-01 ~ N 형태로 각 skin target을 후보화 (border-resting / border-hover / border-focus / shadow / radius / thumbnail-treatment / tags-compact / hover-focus-ring)
- 각 후보의 적용 위치, change magnitude, risk, 대상 element
- Refactor-First 분류: Visual Style에서 도출된 설계인가, 기존 CSS 패치인가
- token-based 접근 vs hardcoded value 접근의 트레이드오프
- Wave 8(Blog CTA), Wave 9(Unavailable), Wave 11(keyboard) 조기 침범 금지 판단
- test update 필요 여부 (시각적 assertion은 금지, class 존재 여부 assertion만 허용)

**권장 후보 분류 예시:**

| Candidate ID | Target | Approach | Magnitude | RF Class | Risk | Recommend |
|---|---|---|---|---|---|---|
| W3-VS-01 | border resting | CSS token on root | Low | Origin-redesign | Low | Approve |
| W3-VS-02 | border hover | :hover on root/trigger | Low | Origin-redesign | Low | Approve |
| ... | ... | ... | ... | ... | ... | ... |

---

### 분석 3 — Wave 3 Cross-Variant & Interaction Visual Analysis

**핵심 질문:** Wave 3 skin이 Test / Blog / Unavailable Normal 세 variant에 일관되게 적용될 수 있는가? 그리고 hover/focus visual이 Wave 11 keyboard hardening과 올바르게 경계를 유지하는가?

**주안점:**
- Test Normal / Blog Normal / Unavailable Normal의 `NormalCardFace` 공유 경로 재확인
- Unavailable overlay(`UnavailableCardStatusOverlay`)가 Wave 3 skin 위에 올바르게 레이어링되는가 (z-index, opacity, pointer-events 상호작용)
- Blog Normal: Wave 3 tags compact style이 Wave 8 tag row 확장과 충돌하지 않는 extensible 구조인지
- Unavailable Normal: Wave 3 skin이 Wave 9 muted surface와 겹쳐질 때 supersede/layer 전략
- hover visual hook (`:hover` CSS) vs hover behavior (interactionMode 변경) 경계 명확화
- focus-visible ring은 Wave 3 허용 / focus-expands behavior는 Wave 11 → 구분 기준
- `presentation='expandedTitleOnly'` 모드에서 Wave 3 skin이 어떻게 표현되는가 (title만 보이는 상태의 border/shadow 처리)
