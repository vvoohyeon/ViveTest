/**
 * 테스트 플로우 표면의 클래스 어휘.
 *
 * `docs/design/ds/app-components.css` 의 `.vt-panel` / `.vt-floating` / `.vt-well` /
 * `.vt-btn*` / `.vt-progress*` / `.vt-datarow*` 과 `catalog-components.css` 의
 * `.vt-choice--answer` 를 제품 클래스로 옮긴 것이다. 명세 스타일시트는 import 하지 않고
 * 규칙만 읽어 다시 썼다 — `tests/unit/design-ds-boundary.test.ts` 가 그 경계를 집행한다.
 *
 * **세 표면의 차이는 무엇 위에 놓이는가이지 얼마나 중요한가가 아니다.** 패널은 페이지 위에,
 * floating 은 페이지 **위로**, well 은 패널 **안에** 놓인다. 종전 제품은 셋을 구분하지 않고
 * 하나의 미작성 처리(`rounded-[18px]` + 94% 반투명 + `--dialog-shadow` + 테두리 없음)를
 * 복사로 반복했다. VIVE 는 그 반대를 말한다(`design.md` §4.7): 불투명한 면, 1px hairline,
 * 속삭이는 그림자.
 *
 * 여기 한 파일에 모은 이유는 같은 어휘를 `instruction-overlay.tsx` ·
 * `test-question-client.tsx` · `test-result-panel.tsx` 셋이 함께 쓰기 때문이다. 종전에는 셋이
 * 각자 같은 긴 문자열을 따로 갖고 있었고, 그 사본들은 이미 서로 조금씩 달랐다.
 *
 * **다크 분기는 없다.** 모든 표면이 semantic 계층을 통해 해석되므로 `[data-theme]` 분기가
 * 필요하다면 그건 테마가 아니라 집어 든 토큰이 틀린 것이다. 유일한 예외는 floating 인데,
 * 그것도 분기가 아니라 `--border-strong` 한 선언이 라이트에서 hairline · 다크에서 보이는
 * 모서리로 해석되면서 흡수한다 — 다크에서 scrim 은 바닥을 1.04:1 밖에 어둡게 못 한다.
 *
 * **버튼 어휘는 여기 없다.** 같은 어휘를 동의 배너와 404 두 장도 쓰므로 정본은
 * `@/features/ui/button-class-names` 다. 포커스 링과 스킨 전이도 그 파일이 갖는다 — 버튼
 * 전용이 아니라 이 파일의 답변 행·칩이 같은 처리를 쓰기 때문이다.
 */
import {
  buttonFormBaseClassName,
  buttonPrimaryClassName,
  buttonPrimaryLiftClassName,
  buttonQuietClassName,
  buttonSecondaryClassName,
  focusRingClassName,
  skinTransitionClassName
} from '@/features/ui/button-class-names';

/** `.vt-panel` — 페이지 위에 놓이는 면. */
export const testPanelClassName =
  'rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--canvas-elevated)] p-5 shadow-[var(--shadow-rest)]';

/** `.vt-floating` — 페이지 위로 뜨는 면(다이얼로그·메뉴·팝오버). */
export const testFloatingClassName =
  'rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--surface-raised)] shadow-[var(--shadow-overlay)]';

/** `.vt-well` — 패널 안에 잠기는 면. */
export const testWellClassName =
  'rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--surface-sunken)] shadow-none';

/** `.vt-scrim`. */
export const testScrimClassName = 'bg-[var(--overlay-scrim-medium)]';

/**
 * `.vt-btn` — 어휘는 `@/features/ui/button-class-names` 가 갖고, 여기서는 이 표면의 조합만
 * 짓는다. 폼·다이얼로그의 바탕에 세 의도를 얹은 것이며, primary 만 눌림과 1px lift 를 갖는다.
 */
export const testPrimaryButtonClassName =
  `${buttonFormBaseClassName} ${buttonPrimaryClassName} ${buttonPrimaryLiftClassName}`;

export const testSecondaryButtonClassName = `${buttonFormBaseClassName} ${buttonSecondaryClassName}`;

export const testQuietButtonClassName = `${buttonFormBaseClassName} ${buttonQuietClassName}`;

/**
 * `.vt-choice--answer` — 카탈로그의 선택 행에 화살표 대신 라디오 표식을 단 변종.
 *
 * 테스트 플로우는 확장된 카탈로그 카드가 미리 보여 주는 것과 같은 질문을 묻는다. 그래서 둘은
 * 같은 컨트롤로 읽혀야 한다 — 각오하고 누르는 결정이 아니라 가볍게 반복하는 답. 종전 제품의
 * 답변 버튼은 `font-semibold` 의 채워진 중립 칩이었고, 고르면 accent 채움 + inset 링 +
 * 그림자로 옮겨 갔다. 그것은 제출 버튼과 같은 처리이고, 한 회차에 열두 번 하는 행동에는
 * 과한 무게다. 흰 면과 400 굵기를 유지하고 상태는 모서리가 진다.
 *
 * 화살표가 없는 이유: 카탈로그에서 `→` 는 「이것이 테스트로 데려간다」는 뜻인데, 테스트 안에서
 * 답하는 것은 아무 데도 데려가지 않는다.
 *
 * **표식은 라벨 뒤(trailing slot)에 온다.** 카탈로그 선택 행에서 화살표가 있던 자리이고,
 * 명세가 「그 자리는 무언가 골라질 때까지 비어 있다」고 적은 자리다. 표본 둘이 서로 어긋나
 * 있다 — `preview/comp-answer-button.html`(컴포넌트 정의)은 뒤, `preview/test-flow.html`
 * (구성 표본)은 앞. 컴포넌트 정의와 명세 산문이 일치하는 쪽을 따른다.
 */
export const testAnswerChoiceClassName =
  `group/answer flex w-full cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--hairline-strong)] bg-[var(--canvas-elevated)] px-3.5 py-3 text-left [transition-property:border-color,background-color] ${skinTransitionClassName} hover:border-[var(--accent)] hover:bg-[var(--sage-muted)] active:border-[var(--accent)] active:bg-[var(--sage-muted)] data-[selected=true]:border-[var(--accent)] data-[selected=true]:bg-[var(--sage-muted)] disabled:cursor-default ${focusRingClassName}`;

/**
 * 마크 슬롯. **항상 렌더되는 고정 크기 상자**이고 그것이 이 자리의 핵심이다 — 세 상태가
 * 같은 14×14 를 쓰므로 표식이 붙고 빠져도 라벨이 한 픽셀도 움직이지 않는다. 표식을 옆에
 * 새 원소로 붙이면 그 성질이 깨진다.
 *
 * 세 상태: 미응답(빈 링) · 선택됨(채운 accent) · **과거 응답(링 없이 조용한 체크)**.
 * 과거 응답 표식은 선택이 아니므로 accent 를 쓰지 않는다. 잉크는 `--muted-aa` 다 —
 * 보조 정보의 무게이면서 바탕 대비 AA 를 만족하는 값으로 이 저장소가 이미 갖고 있다.
 */
export const testAnswerChoiceMarkClassName =
  `mt-1 h-3.5 w-3.5 flex-none rounded-full bg-transparent shadow-[inset_0_0_0_1px_var(--hairline-strong)] [transition-property:background-color,box-shadow] ${skinTransitionClassName} group-data-[selected=true]/answer:bg-[var(--accent)] group-data-[selected=true]/answer:shadow-[inset_0_0_0_1px_var(--accent)] group-data-[previous-answer=true]/answer:shadow-none group-data-[previous-answer=true]/answer:text-[var(--muted-aa)]`;

export const testAnswerChoiceTextClassName =
  'min-w-0 flex-1 [font:var(--t-choice)] text-[var(--ink-soft)] [word-break:keep-all] [overflow-wrap:anywhere]';

/** `.vt-chip` — 자격 문항 재진입 칩. */
export const testChipClassName =
  // ds-literal: partial-role --caption — 크기만 같다. 무게 600 · 행간 1.45 로, 토큰의 400 을
  // 단축으로 실으면 옆의 `font-semibold` 가 진다.
  `inline-flex w-fit min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--hairline-strong)] bg-[var(--canvas-elevated)] px-[11px] py-[5px] text-[13px] font-semibold leading-[1.45] text-[var(--ink-body)] [transition-property:background-color,border-color] ${skinTransitionClassName} hover:border-[var(--border-strong)] hover:bg-[var(--surface-sunken)] active:border-[var(--border-strong)] active:bg-[var(--surface-strong)] ${focusRingClassName}`;

/** `.vt-datarow` — 라벨과 값의 조용한 한 줄(`design.md` §6.10). */
export const testDataRowClassName =
  'flex items-baseline justify-between gap-4 border-b border-[var(--hairline)] py-3 last:border-b-0';

export const testDataRowKeyClassName = 'm-0 [font:var(--caption)] text-[var(--muted-aa)]';

export const testDataRowValueClassName =
  'm-0 text-right [font:var(--body-sm)] text-[var(--ink)] [word-break:keep-all] [overflow-wrap:anywhere]';

/** 타이포 역할. VIVE 의 `--h3` / `--body-sm` / `--caption` / `--overline` 을 값으로 옮긴 것이다
 *  — 런타임 토큰 계층은 제품이 실제로 소비하는 이름만 미러하므로 타입 역할은 아직 그 안에
 *  없다(`globals.css` §1). `site-gnb.tsx` 와 `landing-grid-card.tsx` 도 같은 방식으로 쓴다. */
export const testTitleClassName = 'm-0 [font:var(--h3)] text-[var(--ink)]';

export const testBodyClassName = 'm-0 [font:var(--body-sm)] text-[var(--ink-body)]';

export const testCaptionClassName = 'm-0 [font:var(--caption)] text-[var(--muted-aa)]';

export const testOverlineClassName =
  'm-0 [font:var(--overline)] [letter-spacing:var(--track-over)] text-[var(--muted-aa)]';
