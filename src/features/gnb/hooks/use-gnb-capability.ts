'use client';

import {useEffect, useLayoutEffect, useState} from 'react';

import {subscribeToInputProfile} from '@/features/landing/grid/input-profile';

interface GnbCapabilityState {
  viewportWidth: number;
  hoverCapable: boolean;
  elevated: boolean;
}

export function useGnbCapability(): GnbCapabilityState {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [hoverCapable, setHoverCapable] = useState(false);
  const [elevated, setElevated] = useState(false);

  // 폭과 입력은 서로 다른 축이므로 구독도 따로 건다. 입력 축의 정의처는 `input-profile.ts`.
  useLayoutEffect(() => {
    const syncViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };

    syncViewportWidth();
    window.addEventListener('resize', syncViewportWidth, {passive: true});

    return () => {
      window.removeEventListener('resize', syncViewportWidth);
    };
  }, []);

  useLayoutEffect(() => subscribeToInputProfile(setHoverCapable), []);

  useEffect(() => {
    const syncScroll = () => {
      setElevated(window.scrollY > 4);
    };

    syncScroll();
    window.addEventListener('scroll', syncScroll, {passive: true});

    return () => {
      window.removeEventListener('scroll', syncScroll);
    };
  }, []);

  return {
    viewportWidth,
    hoverCapable,
    elevated
  };
}
