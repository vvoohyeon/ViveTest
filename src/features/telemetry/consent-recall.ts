'use client';

import {useSyncExternalStore} from 'react';

/**
 * 「같은 배너를 다시 띄워라」는 요청. 저장하지 않는다 — 선택은 `consent-source` 가 갖고,
 * 여기 있는 것은 그 선택을 다시 **보여 달라**는 일시 요청뿐이다.
 *
 * 왜 모듈 store 인가: 요청하는 곳 셋(드로어 링크 · 데스크톱 최하단 링크 · `OPTED_OUT` 고지
 * 행)과 응답하는 곳 하나(배너)가 `PageShell` 아래 서로 다른 가지에 있고, `PageShell` 은
 * 서버 컴포넌트다. context provider 로 묶으면 그 가지 전체가 클라이언트로 넘어간다.
 * `consent-source.ts` 가 이미 같은 이유로 같은 모양을 쓴다.
 *
 * `requestId` 가 따로 있는 이유: 이미 열려 있는 배너에서 링크를 다시 눌러도 포커스가 배너로
 * 가야 한다. `requested` 만으로는 두 번째 누름이 상태 변화를 만들지 않아 아무 일도 일어나지
 * 않는다 — 링크가 죽은 컨트롤로 보이는 그 자리다.
 */
export interface ConsentRecallSnapshot {
  requested: boolean;
  requestId: number;
}

type ConsentRecallListener = () => void;

const listeners = new Set<ConsentRecallListener>();
const INITIAL_RECALL_SNAPSHOT: ConsentRecallSnapshot = {requested: false, requestId: 0};

let recallSnapshot: ConsentRecallSnapshot = INITIAL_RECALL_SNAPSHOT;

function emitRecallChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getConsentRecallSnapshot(): ConsentRecallSnapshot {
  return recallSnapshot;
}

export function subscribeToConsentRecall(listener: ConsentRecallListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function requestConsentRecall(): ConsentRecallSnapshot {
  recallSnapshot = {requested: true, requestId: recallSnapshot.requestId + 1};
  emitRecallChange();
  return recallSnapshot;
}

export function dismissConsentRecall(): ConsentRecallSnapshot {
  if (!recallSnapshot.requested) {
    return recallSnapshot;
  }

  recallSnapshot = {requested: false, requestId: recallSnapshot.requestId};
  emitRecallChange();
  return recallSnapshot;
}

export function resetConsentRecallForTests(): void {
  recallSnapshot = INITIAL_RECALL_SNAPSHOT;
  emitRecallChange();
}

export function useConsentRecall(): ConsentRecallSnapshot {
  return useSyncExternalStore(subscribeToConsentRecall, getConsentRecallSnapshot, getConsentRecallSnapshot);
}
