'use client';

import {useCallback, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';

import {
  SHEET_SWIPE_CLOSE_RATIO,
  SHEET_SWIPE_CLOSE_VELOCITY
} from '@/features/ui/sheet-motion';

// 스와이프는 손가락을 1:1 로 따라간다(명세 §3-4). 놓았을 때 이동량이 시트 높이의 30% 이상이거나
// 속도가 0.5px/ms 이상이면 닫히고, 아니면 제자리로 돌아온다. 위로 끄는 것은 따라가지 않는다 —
// 시트는 커지지 않는다.

export interface SheetSwipeDecisionInput {
  offsetPx: number;
  sheetHeightPx: number;
  velocityPxPerMs: number;
}

/** 순수 판정 — 제스처 계약을 DOM 없이 단위 검사로 고정할 수 있어야 한다. */
export function shouldCloseOnSwipeRelease({
  offsetPx,
  sheetHeightPx,
  velocityPxPerMs
}: SheetSwipeDecisionInput): boolean {
  if (offsetPx <= 0) {
    return false;
  }
  if (velocityPxPerMs >= SHEET_SWIPE_CLOSE_VELOCITY) {
    return true;
  }
  if (sheetHeightPx <= 0) {
    return false;
  }
  return offsetPx / sheetHeightPx >= SHEET_SWIPE_CLOSE_RATIO;
}

export interface SheetSwipeBindings {
  offsetPx: number;
  dragging: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
}

interface Gesture {
  pointerId: number;
  startY: number;
  lastY: number;
  lastTimeMs: number;
  velocityPxPerMs: number;
}

export function useSheetSwipe({
  enabled,
  sheetRef,
  onClose
}: {
  enabled: boolean;
  sheetRef: {current: HTMLElement | null};
  onClose: () => void;
}): SheetSwipeBindings {
  const [offsetPx, setOffsetPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gestureRef = useRef<Gesture | null>(null);

  const reset = useCallback(() => {
    gestureRef.current = null;
    setDragging(false);
    setOffsetPx(0);
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || event.pointerType === 'mouse') {
        return;
      }
      gestureRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        lastY: event.clientY,
        lastTimeMs: event.timeStamp,
        velocityPxPerMs: 0
      };
      setDragging(true);
    },
    [enabled]
  );

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    const elapsed = event.timeStamp - gesture.lastTimeMs;
    if (elapsed > 0) {
      gesture.velocityPxPerMs = (event.clientY - gesture.lastY) / elapsed;
    }
    gesture.lastY = event.clientY;
    gesture.lastTimeMs = event.timeStamp;

    setOffsetPx(Math.max(0, event.clientY - gesture.startY));
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }

      const decision = shouldCloseOnSwipeRelease({
        offsetPx: Math.max(0, event.clientY - gesture.startY),
        sheetHeightPx: sheetRef.current?.offsetHeight ?? 0,
        velocityPxPerMs: gesture.velocityPxPerMs
      });

      reset();
      if (decision) {
        onClose();
      }
    },
    [onClose, reset, sheetRef]
  );

  return {
    offsetPx,
    dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: reset
  };
}
