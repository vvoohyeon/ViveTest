import type {SheetPhase} from '@/features/ui/sheet-phase';

// 폰의 카드 확장은 **바텀시트**다(명세 규칙 3). 그래서 이 모듈은 더 이상 위상 기계가 아니라
// **시트 위상을 계약 이름으로 옮기는 사전**이다.
//
// 종전에는 여기 스냅샷(카드 높이·앵커·좌표·제목 기준선)과 복귀 준비 플래그가 있었다. 확장이
// in-flow 였기 때문이다 — 카드가 그 자리에서 커지면 형제가 밀리고, 닫을 때 스크롤 위치와 카드
// 좌표를 진입 직전으로 되돌리는 일을 누군가 해야 했다. 시트는 흐름 밖에 있으므로 **아무것도
// 밀지 않고**, 복귀 정확성은 되돌리는 절차가 아니라 구조가 보장한다. 그 절차를 지키던 코드
// (스냅샷 채취 · 복귀 폴링 · transient 셸 둘)가 함께 사라진 이유가 그것이다.

export type LandingMobileExpandedPhase = 'NORMAL' | 'OPENING' | 'OPEN' | 'CLOSING';

export interface LandingMobileLifecycleState {
  phase: LandingMobileExpandedPhase;
  cardVariant: string | null;
}

export const initialLandingMobileLifecycleState: LandingMobileLifecycleState = {
  phase: 'NORMAL',
  cardVariant: null
};

const SHEET_PHASE_TO_MOBILE_PHASE: Record<SheetPhase, LandingMobileExpandedPhase> = {
  closed: 'NORMAL',
  entering: 'OPENING',
  open: 'OPEN',
  closing: 'CLOSING'
};

/**
 * 시트가 위상의 정본이다. `data-mobile-phase` 는 QA 와 E2E 가 읽는 계약 표면이므로 이름을
 * 유지하되, 그 값을 만드는 시간 계산은 시트 하나가 갖는다 — 두 곳이 같은 전이를 각자 세면
 * 둘은 반드시 어긋난다.
 */
export function mobilePhaseFromSheetPhase(phase: SheetPhase): LandingMobileExpandedPhase {
  return SHEET_PHASE_TO_MOBILE_PHASE[phase];
}

/** 시트가 열려 있거나 닫히는 중인가 — 그 동안 다른 카드의 활성화는 막힌다. */
export function isMobileLifecycleActive(state: LandingMobileLifecycleState): boolean {
  return state.phase !== 'NORMAL';
}
