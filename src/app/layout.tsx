import type {Metadata} from 'next';
import {headers} from 'next/headers';
import Script from 'next/script';
import type {ReactNode} from 'react';

import {APP_BODY_CLASSNAME} from '@/app/app-body-class';
import {VercelAnalyticsGate} from '@/app/vercel-analytics-gate';
import {VercelSpeedInsightsGate} from '@/app/vercel-speed-insights-gate';
import {resolveRequestLocaleFromHeaderBag} from '@/i18n/request-locale-header';

import './globals.css';

export const metadata: Metadata = {
  title: 'ViveTest',
  description: 'Reset baseline placeholder'
};

export default async function RootLayout({children}: {children: ReactNode}) {
  const requestHeaders = await headers();
  const locale = resolveRequestLocaleFromHeaderBag(requestHeaders);

  return (
    <html data-theme="light" lang={locale} suppressHydrationWarning>
      <body className={APP_BODY_CLASSNAME}>
        <Script src="/theme-bootstrap.js" strategy="beforeInteractive" />
        {children}
        {/* 기존 opt-in 정책을 지킨 사용자에게만 Vercel Analytics를 연결한다. */}
        <VercelAnalyticsGate />
        {/* Speed Insights도 같은 consent source를 따라 opt-in 시에만 활성화한다. */}
        <VercelSpeedInsightsGate />
      </body>
    </html>
  );
}
