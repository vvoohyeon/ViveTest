/**
 * 브라우저 저장소에 **던지지 않고** 쓴다.
 *
 * Safari 의 「모든 쿠키 차단」에서 `localStorage` 는 읽히지만 **쓰기가 던진다**
 * (`QuotaExceededError`). 그 브라우저에서 실측한 결과는 이랬다(2026-09-16, 쓰기를 던지게 한
 * 재현): 테스트의 `시작` 을 눌러도 instruction 시트가 **영원히 닫히지 않는다** — 시작 경로의
 * 저장 한 줄이 던지면서 그 뒤의 상태 전이가 통째로 사라지기 때문이다. 화면은 멀쩡해 보이고
 * 버튼은 눌리는데 아무 일도 일어나지 않는다.
 *
 * **저장 실패는 기능 실패가 아니다.** 저장은 회차를 *이어서 할 수 있게* 하는 일이고, 그것이
 * 안 되는 브라우저에서도 회차 자체는 끝까지 할 수 있어야 한다. 그래서 여기서 삼킨다 —
 * 삼키는 자리를 한 곳으로 모아야 「어디선가 한 군데가 아직 던진다」가 불가능해진다.
 *
 * 읽기는 각 모듈이 이미 접근 자체를 감싸고 있었고(`window.localStorage` 접근이 던지는 브라우저도
 * 있다) 그 경로는 실패해도 `null` 로 끝난다 — 여기서 함께 제공해 사본을 줄인다.
 *
 * `tests/unit/safe-storage-discipline.test.ts` 가 `src` 전체를 훑어 이 파일 밖의 직접 쓰기를
 * 막는다. 목록이 아니라 조건이므로 새 파일이 생겨도 함께 걸린다.
 */

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readLocal(key: string): string | null {
  try {
    return getLocalStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** 썼으면 `true`. 못 썼으면 `false` 이고, 그것은 오류가 아니라 **저하된 모드**의 신호다. */
export function writeLocal(key: string, value: string): boolean {
  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocal(key: string): void {
  try {
    getLocalStorage()?.removeItem(key);
  } catch {
    // 지우지 못한 값은 다음 읽기에서 유효성 검사에 걸린다 — 지우기 실패가 흐름을 멈추지 않는다.
  }
}

export function readSession(key: string): string | null {
  try {
    return getSessionStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: string): boolean {
  const storage = getSessionStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeSession(key: string): void {
  try {
    getSessionStorage()?.removeItem(key);
  } catch {
    // 위와 같다.
  }
}
