import type {ReactNode} from 'react';

import type {AppLocale} from '@/config/site';
import {SiteGnb, type GnbContext} from '@/features/gnb';
import {TelemetryConsentBanner} from '@/features/landing/shell/telemetry-consent-banner';
import {TransitionGnbOverlay} from '@/features/transition/transition-gnb-overlay';
import type {LocaleFreeRoute} from '@/lib/routes/route-builder';

interface PageShellProps {
  locale: AppLocale;
  context: GnbContext;
  currentRoute: LocaleFreeRoute;
  showDefaultConsentBanner?: boolean;
  children: ReactNode;
}

export function PageShell({locale, context, currentRoute, showDefaultConsentBanner = true, children}: PageShellProps) {
  return (
    <div className="page-shell min-h-screen" data-page-context={context}>
      <TransitionGnbOverlay locale={locale} context={context} currentRoute={currentRoute} />
      <SiteGnb locale={locale} context={context} currentRoute={currentRoute} />
      <main className="page-shell-main mx-auto max-w-[1280px] px-4 pt-20 pb-6 md:px-5 md:pt-[88px] md:pb-8 min-[900px]:px-6">
        {children}
      </main>
      {showDefaultConsentBanner ? <TelemetryConsentBanner /> : null}
    </div>
  );
}
