/**
 * 입력 축(`InputProfile`) — 이 저장소에서 「어떻게 조작하는가」의 **유일한 JS 정의처**.
 *
 * 세 축이 서로 다른 것을 정한다.
 *
 * | 축 | 무엇이 정하는가 | 쓰는 곳 |
 * |:---|:---|:---|
 * | `LayoutBreakpoint` (`layout-plan.ts`) | 뷰포트 **폭** | 열 수 · 좌우 여백 · 썸네일 비율 · clamp · 타입 스케일 · **확장의 형태** |
 * | `InputProfile` (이 파일) | `(hover: hover) and (pointer: fine)` | **닫는 법**(닫기 어포던스) · hover intent · 설정 hover 열기 |
 * | `KeyboardAffordance` (`req-landing.md` §7.6-a) | **둘 중 어느 축에도 속하지 않는다** | 순차 확장 · 포커스 처분 · Escape |
 *
 * 폭으로 입력을 대리하지 않는다 — hover 없는 768px 이상 기기(외장 키보드를 붙인 태블릿,
 * 터치 모니터)가 실재하고, 그 기기에 데스크톱 hover 생명주기를 주면 열고 닫을 수 없는 카드가
 * 된다. 반대로 입력으로 폭을 대리하지도 않는다 — 1열이냐 4열이냐는 손가락이 아니라 공간이
 * 정한다.
 *
 * **형태는 공간이, 닫는 법은 입력이 정한다**(BQ-40 (B) · `req-landing-interaction.md` §0.3).
 * 이 축이 정하는 것에 **확장 생명주기 전체가 들어가지 않는다** — 제자리 오버레이냐 시트냐는
 * 폭이 정하고, 이 파일은 그 위에 얹히는 닫기 어포던스만 가른다. 종전 이 표는 계획서의 원안을
 * 옮겨 적어 「확장 생명주기」를 통째로 이 축에 배정했고, 그것은 명세와 등재된 결정이 뒤집은
 * 쪽이다.
 */
export type InputProfile = 'hover-capable' | 'touch';

/**
 * 입력 축의 미디어 질의. **이 문자열은 여기 한 번만 적는다.**
 *
 * CSS 에도 같은 판정이 있다(`landing-grid-card.module.css`). CSS 사본은 JS 와 동기화할 방법이
 * 없으므로 남기되, 두 곳이 같은 질의를 적고 있다는 사실을 단위 테스트가 문자열 대조로
 * 고정한다 — 한쪽만 바뀌면 붉어진다.
 */
export const INPUT_PROFILE_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';

/** SSR 중립값. mount 전에는 터치로 간주한다 — 모바일 최적 기본값과 같은 방향이다. */
export const INITIAL_INPUT_PROFILE: InputProfile = 'touch';

export function resolveInputProfile(hoverCapability: boolean): InputProfile {
  return hoverCapability ? 'hover-capable' : 'touch';
}

export function isHoverCapable(inputProfile: InputProfile): boolean {
  return inputProfile === 'hover-capable';
}

/**
 * 입력 축을 구독한다. 반환값은 현재 `hoverCapability` 이고, 변경 시 콜백이 불린다.
 *
 * `matchMedia` 가 없는 환경(SSR·구형 jsdom)에서는 아무것도 하지 않는다 — 그때의 값은
 * `INITIAL_INPUT_PROFILE` 이다.
 */
export function subscribeToInputProfile(onChange: (hoverCapability: boolean) => void): (() => void) | undefined {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return undefined;
  }

  const query = window.matchMedia(INPUT_PROFILE_MEDIA_QUERY);

  const sync = () => {
    onChange(query.matches);
  };

  sync();
  query.addEventListener('change', sync);

  return () => {
    query.removeEventListener('change', sync);
  };
}
