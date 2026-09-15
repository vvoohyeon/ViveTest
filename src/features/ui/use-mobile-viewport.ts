'use client';

import {useSyncExternalStore} from 'react';

import {MOBILE_MAX_VIEWPORT_WIDTH} from '@/features/landing/grid/layout-plan';

// **형태는 폭이 정한다**(명세 규칙 3). 폰은 시트, 다 열 레이아웃은 제자리 오버레이·중앙
// 다이얼로그다. 경계의 정본은 저장소의 유일한 모바일 경계 하나이고 여기서 질의를 만든다 —
// 리터럴을 다시 적으면 폭 축이 두 벌로 갈린다.
//
// 닫는 법을 정하는 **입력 축**은 이것이 아니라 `input-profile.ts` 가 갖는다. 둘을 한 훅으로
// 합치지 않는 것이 step 2 가 가른 축 분리다.

const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_MAX_VIEWPORT_WIDTH}px)`;

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }

  const query = window.matchMedia(MOBILE_MEDIA_QUERY);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}

function getClientSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

/**
 * 서버에서는 거짓이다 — 폭을 모르는 곳에서 한쪽을 고르면 틀린 쪽의 비용이 어떤 게이트에도
 * 나타나지 않는다(L22). 이 훅을 쓰는 표면은 첫 렌더에 보이지 않아야 하고, instruction 은
 * `isBooting` 이 그것을 보장한다.
 */
export function useIsMobileViewport(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, () => false);
}
