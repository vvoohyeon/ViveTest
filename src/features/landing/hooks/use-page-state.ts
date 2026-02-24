'use client';

import {useEffect, useState} from 'react';
import type {PageState} from '@/features/landing/types';

export function usePageState(isTransitioning: boolean): PageState {
  const [isInactive, setIsInactive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const onVisibilityChange = () => {
      setIsInactive(document.visibilityState !== 'visible');
    };

    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(media.matches);

    sync();
    media.addEventListener('change', sync);

    return () => media.removeEventListener('change', sync);
  }, []);

  if (isInactive) {
    return 'INACTIVE';
  }

  if (reducedMotion) {
    return 'REDUCED_MOTION';
  }

  if (isTransitioning) {
    return 'TRANSITIONING';
  }

  return 'ACTIVE';
}
