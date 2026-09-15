import {useEffect} from 'react';

// `body` 스크롤 잠금의 단일 소유자. 종전에는 랜딩 카드 생명주기와 GNB 드로어가 각자
// `document.body.style` 의 이전 값을 저장했다가 복원했고, 둘이 겹치면 나중에 건 쪽이
// 이미 `hidden` 이 된 값을 「이전 값」으로 저장해 마지막 해제가 `hidden` 을 복원했다 —
// 페이지가 영구히 얼어붙는다. 참조 카운트를 한 곳에 두면 저장은 0→1 에서 한 번,
// 복원은 1→0 에서 한 번뿐이라 그 덮어쓰기가 구조적으로 불가능해진다.
//
// **식별은 획득 호출당이지 소비자 종류당이 아니다.** 같은 종류의 두 인스턴스(드로어가 둘,
// 카드가 둘)가 동시에 열릴 수 있고, 이름으로 묶으면 첫 해제가 나머지의 잠금까지 푼다.
// 획득이 해제 함수를 돌려주고 그 함수가 자기 몫 하나만 반납한다.

interface SavedBodyStyle {
  overflow: string;
  touchAction: string;
}

let lockCount = 0;
let saved: SavedBodyStyle | null = null;
const labels: string[] = [];

function applyLock(): void {
  if (typeof document === 'undefined') {
    return;
  }

  saved = {
    overflow: document.body.style.overflow,
    touchAction: document.body.style.touchAction
  };
  document.body.style.overflow = 'hidden';
  document.body.style.touchAction = 'none';
}

function restoreBody(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.body.style.overflow = saved?.overflow ?? '';
  document.body.style.touchAction = saved?.touchAction ?? '';
  saved = null;
}

/**
 * 잠금 한 몫을 얻고 그 몫만 반납하는 함수를 돌려준다. 반납은 몇 번 불러도 한 번만 센다 —
 * effect cleanup 과 명시적 닫기가 둘 다 부를 수 있기 때문이다.
 */
export function acquireBodyScrollLock(label: string): () => void {
  lockCount += 1;
  labels.push(label);
  if (lockCount === 1) {
    applyLock();
  }

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    lockCount -= 1;
    const index = labels.indexOf(label);
    if (index >= 0) {
      labels.splice(index, 1);
    }
    if (lockCount === 0) {
      restoreBody();
    }
  };
}

/** 검사 전용 — 잠금이 실제로 풀렸는지를 스타일이 아니라 카운트로 볼 수 있어야 한다. */
export function bodyScrollLockHolders(): readonly string[] {
  return [...labels];
}

/** 검사 전용 — 모듈 전역 상태를 테스트 사이에 되돌린다. */
export function resetBodyScrollLockForTest(): void {
  lockCount = 0;
  labels.length = 0;
  saved = null;
}

export function useBodyScrollLock(label: string, locked: boolean): void {
  useEffect(() => {
    if (!locked) {
      return;
    }

    return acquireBodyScrollLock(label);
  }, [label, locked]);
}
