import {asVariantId} from '@/features/test/domain';
import {peekActiveRun} from '@/features/test/storage/active-run';
import {TEST_RUN_HISTORY_KEY} from '@/features/test/storage/test-storage-keys';
import {readLocal, removeLocal, writeLocal} from '@/lib/safe-storage';

/**
 * 이 기기에 남는 회차 이력 — `req-test.md` §8.4.
 *
 * **한 회차는 시작할 때 한 줄로 들어오고, 끝나면 그 줄이 완료로 바뀐다.** 끝난 것만 적으면
 * 「중단 여부」를 말할 수 없다: 중단은 **적히지 않은 일**이라 나중에 관찰할 방법이 없기 때문이다.
 *
 * 그래서 `completedAtMs === null` 이 곧 「아직 끝나지 않음」이고, 그것이 **중단**인지 **지금
 * 하는 중**인지는 이력이 아니라 활성 회차가 말한다(`peekActiveRun`). 목록은 그 둘을 합쳐 읽는다 —
 * 이력에 「중단」을 적어 두면 진행 중인 회차를 중단으로 보이게 만들고, 그 거짓은 되돌릴 수 없다.
 *
 * 저장은 실패해도 조용히 지나간다. 이력은 회차를 **설명하는** 것이지 회차의 일부가 아니므로,
 * 저장소가 막힌 브라우저에서 이 실패가 테스트를 멈추게 해서는 안 된다.
 */

export interface RunHistoryEntry {
  variantId: string;
  startedAtMs: number;
  /** `null` 이면 아직 끝나지 않은 회차다 — 중단인지 진행 중인지는 활성 회차가 가른다. */
  completedAtMs: number | null;
}

/**
 * 화면이 읽는 모양. `status` 는 저장하지 않고 **읽을 때 판정한다** — 「중단」을 적어 두면
 * 30 분 안에 돌아와 이어서 끝낸 회차가 영원히 중단으로 남는다.
 */
export type RunHistoryStatus = 'completed' | 'in-progress' | 'abandoned';

export interface ResolvedRunHistoryEntry extends RunHistoryEntry {
  status: RunHistoryStatus;
}

/** `history.body` 가 사용자에게 말하는 수와 같은 값이다 — 두 곳이 갈리면 문구가 거짓이 된다. */
export const RUN_HISTORY_LIMIT = 50;

const EMPTY_HISTORY: ReadonlyArray<ResolvedRunHistoryEntry> = Object.freeze([]);

type RunHistoryListener = () => void;

const listeners = new Set<RunHistoryListener>();
let cachedSnapshot: ReadonlyArray<ResolvedRunHistoryEntry> | null = null;

function isRunHistoryEntry(value: unknown): value is RunHistoryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<RunHistoryEntry>;
  return (
    typeof candidate.variantId === 'string' &&
    candidate.variantId.length > 0 &&
    typeof candidate.startedAtMs === 'number' &&
    Number.isFinite(candidate.startedAtMs) &&
    (candidate.completedAtMs === null ||
      (typeof candidate.completedAtMs === 'number' && Number.isFinite(candidate.completedAtMs)))
  );
}

/**
 * 끝나지 않은 회차가 **아직 이어질 수 있는지**를 활성 회차에게 묻는다.
 *
 * `startedAtMs` 까지 맞춰 보는 이유는 같은 variant 를 다시 시작한 경우 때문이다 — 그때 살아 있는
 * 것은 새 회차이고, 앞의 것은 그것으로 확정된 중단이다.
 */
function resolveStatus(entry: RunHistoryEntry): RunHistoryStatus {
  if (entry.completedAtMs !== null) {
    return 'completed';
  }

  const peeked = peekActiveRun(asVariantId(entry.variantId));

  return peeked.status === 'live' && peeked.run.startedAtMs === entry.startedAtMs ? 'in-progress' : 'abandoned';
}

function readRawEntries(): RunHistoryEntry[] {
  const raw = readLocal(TEST_RUN_HISTORY_KEY);

  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // 읽을 수 없는 값은 지운다 — 남겨 두면 다음 쓰기가 그 위에 덮이면서 이 분기를 매번 지난다.
    removeLocal(TEST_RUN_HISTORY_KEY);
    return [];
  }

  if (!Array.isArray(parsed)) {
    removeLocal(TEST_RUN_HISTORY_KEY);
    return [];
  }

  // 깨진 항목 하나가 목록 전체를 버리게 하지 않는다 — 걸러 내고 나머지를 보인다.
  return parsed
    .filter(isRunHistoryEntry)
    .sort((left, right) => right.startedAtMs - left.startedAtMs)
    .slice(0, RUN_HISTORY_LIMIT);
}

function readFromStorage(): ReadonlyArray<ResolvedRunHistoryEntry> {
  const entries = readRawEntries();

  return entries.length === 0
    ? EMPTY_HISTORY
    : Object.freeze(entries.map((entry) => ({...entry, status: resolveStatus(entry)})));
}

function writeToStorage(entries: ReadonlyArray<RunHistoryEntry>): void {
  writeLocal(TEST_RUN_HISTORY_KEY, JSON.stringify(entries.slice(0, RUN_HISTORY_LIMIT)));
}

function invalidate(): void {
  cachedSnapshot = null;
  for (const listener of listeners) {
    listener();
  }
}

/**
 * `useSyncExternalStore` 가 먹는 스냅샷.
 *
 * 캐시하는 이유는 참조 안정성이다 — 매번 새 배열을 돌려주면 React 가 영원히 다시 그린다.
 */
export function getRunHistorySnapshot(): ReadonlyArray<ResolvedRunHistoryEntry> {
  cachedSnapshot ??= readFromStorage();
  return cachedSnapshot;
}

/** 서버에는 이 기기의 이력이 없다 — 빈 목록이 참이고, 그래서 두 렌더가 어긋나지 않는다. */
export function getServerRunHistorySnapshot(): ReadonlyArray<ResolvedRunHistoryEntry> {
  return EMPTY_HISTORY;
}

export function subscribeRunHistory(listener: RunHistoryListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function recordRunStarted(variantId: string, startedAtMs: number): void {
  const entries = readRawEntries();

  // 같은 회차를 두 번 적지 않는다 — 진입 커밋이 한 번 더 도는 경로가 있으면 목록이 겹쳐 보인다.
  if (entries.some((entry) => entry.variantId === variantId && entry.startedAtMs === startedAtMs)) {
    return;
  }

  writeToStorage([{variantId, startedAtMs, completedAtMs: null}, ...entries]);
  invalidate();
}

export function recordRunCompleted(variantId: string, completedAtMs: number): void {
  const entries = readRawEntries();
  // 그 variant 의 **가장 최근 미완료** 회차가 방금 끝난 것이다.
  const target = entries.find((entry) => entry.variantId === variantId && entry.completedAtMs === null);

  if (!target) {
    return;
  }

  writeToStorage(entries.map((entry) => (entry === target ? {...entry, completedAtMs} : entry)));
  invalidate();
}

/** 테스트에서 쓰는 초기화 — 모듈 캐시와 저장소를 함께 비운다. */
export function resetRunHistoryForTest(): void {
  removeLocal(TEST_RUN_HISTORY_KEY);
  invalidate();
}
