import {SHEET_ENTER_DURATION_MS, SHEET_EXIT_DURATION_MS} from '@/features/ui/sheet-motion';

// 이탈은 **렌더 중에** 판정한다. effect 에서 켜면 활성이 거짓이 된 커밋에 한 번 언마운트되고
// 다음 커밋에 다시 마운트되며, 그 재마운트가 등장 애니메이션을 다시 걸어 이탈이 거꾸로
// 재생된다 — 최종 상태는 옳으므로 끝 값만 보는 단언도 스크린샷도 전부 초록이다(L38).

export type SheetPhase = 'closed' | 'entering' | 'open' | 'closing';

export function nextSheetPhase({
  phase,
  open,
  skipEnterMotion
}: {
  phase: SheetPhase;
  open: boolean;
  skipEnterMotion: boolean;
}): SheetPhase {
  if (open) {
    return skipEnterMotion ? 'open' : 'entering';
  }
  return phase === 'closed' ? 'closed' : 'closing';
}

export function initialSheetPhase({
  open,
  skipEnterMotion
}: {
  open: boolean;
  skipEnterMotion: boolean;
}): SheetPhase {
  if (!open) {
    return 'closed';
  }
  return skipEnterMotion ? 'open' : 'entering';
}

/** `entering` 은 진입 시간 뒤 `open` 이 되고, `closing` 은 이탈 시간 뒤 사라진다. */
export function sheetPhaseSettleMs(phase: SheetPhase): number | null {
  if (phase === 'entering') {
    return SHEET_ENTER_DURATION_MS;
  }
  if (phase === 'closing') {
    return SHEET_EXIT_DURATION_MS;
  }
  return null;
}

/** 시트가 트리로 존재하는가. `closing` 동안에도 존재해야 이탈이 보인다. */
export function isSheetMounted(phase: SheetPhase): boolean {
  return phase !== 'closed';
}

/** 상호작용이 가능한가. 닫히는 동안에는 `inert` 다 — `disabled` 는 포커스를 떨어뜨린다. */
export function isSheetInteractive(phase: SheetPhase): boolean {
  return phase === 'entering' || phase === 'open';
}
