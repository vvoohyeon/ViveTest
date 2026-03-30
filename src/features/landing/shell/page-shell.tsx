import type {ReactNode} from 'react';

import type {AppLocale} from '@/config/site';
import {SiteGnb, type GnbContext} from '@/features/landing/gnb';
import {TelemetryConsentBanner} from '@/features/landing/shell/telemetry-consent-banner';
import {TransitionGnbOverlay} from '@/features/landing/transition/transition-gnb-overlay';
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
    <div className="page-shell" data-page-context={context}>
      <TransitionGnbOverlay locale={locale} context={context} currentRoute={currentRoute} />
      <SiteGnb locale={locale} context={context} currentRoute={currentRoute} />
      <main className="page-shell-main">{children}</main>
      {showDefaultConsentBanner ? <TelemetryConsentBanner /> : null}
    </div>
  );
}
