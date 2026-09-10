/**
 * `.vt-btn` — 버튼 어휘 한 벌.
 *
 * 종전에는 같은 어휘가 세 곳에 따로 적혀 있었다 — `src/features/test/surface-class-names.ts`
 * (primary/secondary/quiet + 바탕), `src/features/landing/shell/consent-banner.tsx`(같은 셋을
 * `CONSENT_*` 로), `src/app/not-found.tsx`·`src/app/global-not-found.tsx`(primary 를 각각 한 벌).
 * 셋이 L10 의 두 함정(바탕이 `border-color` 를 정하는 것, `focus-visible:outline-none` 을 링과
 * 함께 쓰는 것)을 같은 방식으로 피하고 있었지만 그것은 우연히 같은 것이지 하나인 것이 아니다.
 *
 * **이 파일은 클래스 문자열만 갖는다 — 컴포넌트가 아니다.** 그래서 조각으로 내보내고 조립은
 * 호출부가 한다. 세 표면이 같은 어휘를 쓰되 같은 조합을 쓰지는 않기 때문이다: 다이얼로그의
 * 버튼은 disabled 처리와 1px lift 를 갖고, 동의 배너의 버튼은 눌림만 가지며, 404 의 링크는
 * 둘 다 갖지 않는다. 조합을 하나로 강제하면 그 차이가 값 변경으로 새는데, 이 이동은 구조
 * 변경이고 동작 변경과 섞지 않는다.
 *
 * **전이 대상 셋은 배타적이다.** 한 원소에 `[transition-property:…]` 를 둘 얹으면 명시도가
 * 같아 Tailwind 의 emit 순서가 승자를 정한다(L10). 아래 세 상수 중 반드시 하나만 고른다.
 *
 * GNB 의 pill 계열(`site-gnb.tsx`)과 칩(`settings-controls.tsx`)은 다른 컴포넌트(`.vt-pill`)
 * 이며 모양과 색은 여기 오지 않는다. **링만은 예외로 `focusRingClassName` 을 함께 쓴다** --
 * 종전에 그쪽이 쓰던 두 층 box-shadow 는 안쪽 층에 *페이지* 지면을 칠해 요소의 지면과
 * 어긋났고, 아래 `focusRingClassName` 의 주석이 적은 대로 링이 컨트롤마다 다를 이유가 없다.
 */

/**
 * 포커스 링. 명세(`.vt-btn:focus-visible`)의 outline + offset 형태다.
 *
 * `focus-visible:outline-none` 을 함께 쓰지 않는다. 둘 다 `outline` 계열이라 명시도가 같고,
 * Tailwind 가 `outline-none`(= `outline-style: none`)을 뒤에 내보내면 링은 색과 offset 만 남고
 * **두께가 0 으로 계산된다** — 실측 `0px none`, 즉 링이 아예 그려지지 않았다.
 *
 * 버튼 전용이 아니다. 답변 행·칩도 같은 링을 쓰고, 링이 컨트롤마다 다를 이유가 없다.
 */
export const focusRingClassName =
  'focus-visible:[outline:2px_solid_var(--focus-ring)] focus-visible:[outline-offset:2px]';

/** 스킨 전이의 지속과 곡선. 무엇을 전이할지는 아래 세 상수가 따로 갖는다. */
export const skinTransitionClassName =
  '[transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-standard)] motion-reduce:transition-none';

const skinTransitionPropertyClassName = '[transition-property:background-color,border-color,box-shadow,color]';
const liftTransitionPropertyClassName = '[transition-property:background-color,border-color,box-shadow,color,transform]';
const colorTransitionPropertyClassName = '[transition-property:background-color,border-color]';

/**
 * 상자와 활자. **색은 여기 없다.**
 *
 * 바탕에 `border-transparent` 를 두었을 때 실측: 세 변종이 각자 적은 테두리 색 임의값
 * 유틸리티가 전부 졌고 모든 버튼의 테두리가 투명이었다 — 한 원소 위에서 같은 속성을 두
 * 유틸리티가 정하면 명시도가 같아 emit 순서가 승자를 정한다(L10). 그래서 색은 변종만 정한다.
 *
 * 이 문단은 그 유틸리티를 **철자로 적지 않는다.** Tailwind v4 는 주석까지 훑어 클래스
 * 후보를 뽑으므로, 산문에 자리표시자를 넣은 임의값(`…`)을 적으면 그대로 무효 CSS 가
 * 생성돼 dev 서버의 PostCSS 가 죽는다. 규율은 `tests/unit/tailwind-candidate-hygiene.test.ts` 가 갖는다.
 *
 * `min-height: 46px` 는 실현값 그대로다. 4px 그리드에서 벗어나 있지만 `design.md` §4.10 의
 * 44px 바닥을 이미 넘고, 실제 규칙을 만족하는 실제 값은 토큰에 맞춰 반올림할 이유가 없다.
 */
export const buttonShapeClassName =
  'inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-md)] border px-4 py-3 [font:var(--button)] [letter-spacing:var(--track-tight)]';

/** 비활성. `!` 는 hover 변종까지 눌러야 해서 붙는다. */
export const buttonDisabledClassName =
  'disabled:!cursor-not-allowed disabled:!border-[var(--hairline)] disabled:!bg-[var(--surface-sunken)] disabled:!text-[var(--fg-disabled)] disabled:!opacity-100 disabled:!shadow-none disabled:!translate-y-0 disabled:hover:!border-[var(--hairline)] disabled:hover:!bg-[var(--surface-sunken)] disabled:hover:!text-[var(--fg-disabled)] disabled:hover:!shadow-none disabled:hover:!translate-y-0';

/** 색을 전이하는 바탕. 동의 배너가 그대로 쓴다. */
export const buttonBaseClassName =
  `${buttonShapeClassName} ${skinTransitionPropertyClassName} ${skinTransitionClassName} ${focusRingClassName}`;

/**
 * 폼·다이얼로그의 바탕. 위에 라벨 정렬·밑줄 제거·`transform` 전이·비활성 처리를 더한 것이다.
 * 라벨 정렬과 밑줄 제거는 이 자리에만 있다 — 같은 어휘가 `<a>` 로도 렌더되는 표면이기 때문.
 */
export const buttonFormBaseClassName =
  `${buttonShapeClassName} text-center no-underline ${liftTransitionPropertyClassName} ${skinTransitionClassName} ${buttonDisabledClassName} ${focusRingClassName}`;

/**
 * 채워진 accent 의 쉼과 hover. **`--accent` 가 아니라 `--accent-solid` 를 읽는다**(D-12):
 * accent 는 선이나 링일 때 3:1 이면 되고 3.75 로 넘지만, 제 라벨 아래 깔린 **면**일 때는 그
 * 라벨에 대해 4.5:1 이 필요하고 흰 라벨이 3.75 다. 라벨을 어둡게 뒤집어도 해결되지 않는다 —
 * 쉴 때 4.61 에서 눌릴수록 3.39 · 2.44 로 *내려간다*. 면을 한 단 깊게 하면 흰 라벨을 유지한
 * 채 5.09 → 7.09 → 9.76 으로 올라간다.
 */
export const buttonPrimaryClassName =
  'border-[var(--accent-solid)] bg-[var(--accent-solid)] text-[var(--fg-on-accent)] hover:border-[var(--accent-solid-hover)] hover:bg-[var(--accent-solid-hover)]';

/** 눌림. 이동하지 않는 표면(동의 배너)은 이것만 얹는다. */
export const buttonPrimaryPressedClassName =
  'active:border-[var(--accent-solid-pressed)] active:bg-[var(--accent-solid-pressed)]';

/**
 * 1px lift. `design.md` §4.8 은 bounce 와 overshoot 를 금지하고, 140ms ease 아래의 1px 이동이
 * 제스처의 전부다. primary 에만 얹으며 `buttonFormBaseClassName` 과 짝이다 — 그 바탕만
 * `transform` 을 전이 대상에 넣는다.
 */
export const buttonPrimaryLiftClassName =
  'hover:-translate-y-px hover:shadow-[var(--shadow-md)] active:translate-y-0 active:shadow-none motion-reduce:hover:translate-y-0';

/** 중립. 테스트 표면과 동의 배너가 같은 문자열을 쓴다. */
export const buttonSecondaryClassName =
  'border-[var(--hairline-strong)] bg-[var(--canvas-elevated)] text-[var(--ink-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-sunken)] active:bg-[var(--surface-strong)]';

/**
 * Quiet — 제품이 필요로 하면서 이름을 준 적 없는 세 번째 무게. 「동의하지 않고 시작」·「취소」
 * 처럼 경쟁하면 안 되는 행동이다. 바탕의 46px 대신 `--tap-min` 을 다시 정하므로 실제 높이는
 * 44px 로 계산된다(실측).
 */
export const buttonQuietClassName =
  'min-h-[var(--tap-min)] border-[transparent] bg-transparent px-3 py-[10px] text-[var(--muted-aa)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink-body)]';

/**
 * 빈 상태의 단일 행동을 링크로 낸 완성형. 404 두 장이 함께 쓴다.
 *
 * 눌림도 lift 도 갖지 않는다 — 이동만 하는 링크에 눌린 면은 의미가 없고, 그 라우트에는 모션
 * 이야기가 없다. 그래서 전이 대상도 색 둘뿐이다.
 */
export const linkButtonPrimaryClassName =
  `${buttonShapeClassName} no-underline ${colorTransitionPropertyClassName} ${skinTransitionClassName} ${focusRingClassName} ${buttonPrimaryClassName}`;
