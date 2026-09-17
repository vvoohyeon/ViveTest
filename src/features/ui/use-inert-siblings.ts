'use client';

import {useEffect} from 'react';

// 규칙 1 — 오버레이가 열린 동안 그 아래 층은 **배너까지** `inert` 다. 보이되 닿지 않는다
// (포커스·탭·보조기술 전부). 시트는 `document.body` 로 포탈되므로 그 아래 층이란 곧
// **시트 컨테이너가 아닌 body 의 직계 자식 전부**다 — 소유자 목록을 적으면 새 층이 생겼을 때
// 조용히 빠진다.

export function useInertSiblings(container: HTMLElement | null, active: boolean): void {
  useEffect(() => {
    if (!active || !container || typeof document === 'undefined') {
      return;
    }

    const marked: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement) || child === container || child.contains(container)) {
        continue;
      }
      if (child.hasAttribute('inert')) {
        continue;
      }
      child.setAttribute('inert', '');
      marked.push(child);
    }

    return () => {
      for (const child of marked) {
        child.removeAttribute('inert');
      }
    };
  }, [active, container]);
}
