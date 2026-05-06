'use client';

import type {AppLocale} from '@/config/site';
import {SiteGnb, type GnbContext} from '@/features/gnb';
import {usePendingLandingTransition} from '@/features/transition/use-pending-landing-transition';
import {RouteBuilder, type LocaleFreeRoute} from '@/lib/routes/route-builder';

interface TransitionGnbOverlayProps {
  locale: AppLocale;
  context: GnbContext;
  currentRoute: LocaleFreeRoute;
}

const TRANSITION_GNB_OVERLAY_CLASSNAME = 'landing-transition-source-gnb pointer-events-none fixed inset-x-0 top-0 z-[1300]';

export function TransitionGnbOverlay({locale, context}: TransitionGnbOverlayProps) {
  const pendingTransition = usePendingLandingTransition();

  if (!pendingTransition || context === 'landing') {
    return null;
  }

  return (
    <div
      className={TRANSITION_GNB_OVERLAY_CLASSNAME}
      data-testid="landing-transition-source-gnb"
      aria-hidden="true"
      inert
    >
      <SiteGnb locale={locale} context="landing" currentRoute={RouteBuilder.landing()} />
    </div>
  );
}
