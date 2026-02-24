'use client';

import {useEffect, useState} from 'react';
import type {InteractionMode} from '@/features/landing/types';

export type InteractionCapability = {
  mode: InteractionMode;
  width: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isHoverCapable: boolean;
};

const INITIAL_CAPABILITY: InteractionCapability = {
  mode: 'TAP_MODE',
  width: 0,
  isMobile: true,
  isTablet: false,
  isDesktop: false,
  isHoverCapable: false
};

function readCapability(): InteractionCapability {
  const width = window.innerWidth;
  const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const mode: InteractionMode = isMobile ? 'TAP_MODE' : hoverCapable ? 'HOVER_MODE' : 'TAP_MODE';

  return {
    mode,
    width,
    isMobile,
    isTablet,
    isDesktop,
    isHoverCapable: hoverCapable
  };
}

export function useInteractionMode(): InteractionCapability {
  const [capability, setCapability] = useState<InteractionCapability>(INITIAL_CAPABILITY);

  useEffect(() => {
    const sync = () => setCapability(readCapability());

    sync();
    window.addEventListener('resize', sync);

    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    media.addEventListener('change', sync);

    return () => {
      window.removeEventListener('resize', sync);
      media.removeEventListener('change', sync);
    };
  }, []);

  return capability;
}
