'use client';

import {useEffect, useLayoutEffect, useState} from 'react';

interface GnbCapabilityState {
  viewportWidth: number;
  hoverCapable: boolean;
  elevated: boolean;
}

export function useGnbCapability(): GnbCapabilityState {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [hoverCapable, setHoverCapable] = useState(false);
  const [elevated, setElevated] = useState(false);

  useLayoutEffect(() => {
    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

    const syncCapability = () => {
      setViewportWidth(window.innerWidth);
      setHoverCapable(hoverQuery.matches);
    };

    syncCapability();
    window.addEventListener('resize', syncCapability, {passive: true});
    hoverQuery.addEventListener('change', syncCapability);

    return () => {
      window.removeEventListener('resize', syncCapability);
      hoverQuery.removeEventListener('change', syncCapability);
    };
  }, []);

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
