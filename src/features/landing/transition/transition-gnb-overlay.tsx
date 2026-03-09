'use client';

import type {AppLocale} from '@/config/site';
import {SiteGnb, type GnbContext} from '@/features/landing/gnb';
import {usePendingLandingTransition} from '@/features/landing/transition/use-pending-landing-transition';
import {RouteBuilder, type LocaleFreeRoute} from '@/lib/routes/route-builder';

interface TransitionGnbOverlayProps {
  locale: AppLocale;
  context: GnbContext;
  currentRoute: LocaleFreeRoute;
}

export function TransitionGnbOverlay({locale, context}: TransitionGnbOverlayProps) {
  const pendingTransition = usePendingLandingTransition();

  if (!pendingTransition || context === 'landing') {
    return null;
  }

  return (
    <div
      className="landing-transition-source-gnb"
      data-testid="landing-transition-source-gnb"
      aria-hidden="true"
      inert
    >
      <SiteGnb locale={locale} context="landing" currentRoute={RouteBuilder.landing()} />
    </div>
  );
}
