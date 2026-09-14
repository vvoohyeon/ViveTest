import type {ReactNode} from 'react';

import type {AppLocale} from '@/config/site';
import {SiteGnb, type GnbContext} from '@/features/gnb';
import {PAGE_SHELL_MAIN_ID, SkipToContentLink} from '@/features/landing/shell/skip-to-content-link';
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
      {/* 문서 순서상 첫 탭 스톱이다 — 탭 순서를 상태로 바꾸는 대신 사용자가 고르게 한다. */}
      <SkipToContentLink />
      <TransitionGnbOverlay locale={locale} context={context} currentRoute={currentRoute} />
      <SiteGnb locale={locale} context={context} currentRoute={currentRoute} />
      <main id={PAGE_SHELL_MAIN_ID} tabIndex={-1} className="page-shell-main mx-auto max-w-[1280px] px-[var(--shell-gutter)] pt-20 pb-6 md:pt-[88px] md:pb-8">
        {children}
      </main>
      {showDefaultConsentBanner ? <TelemetryConsentBanner /> : null}
    </div>
  );
}
