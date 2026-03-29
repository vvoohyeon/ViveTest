import {NextIntlClientProvider} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import type {ReactNode} from 'react';

import {isLocale, locales} from '@/config/site';
import {PersistentConsentShell} from '@/features/landing/shell/persistent-consent-shell';
import {TransitionRuntimeMonitor} from '@/features/landing/transition/transition-runtime-monitor';
import {LocaleHtmlLangSync} from '@/i18n/locale-html-lang-sync';
import {messagesByLocale} from '@/i18n/messages';

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      <LocaleHtmlLangSync locale={locale} />
      <TransitionRuntimeMonitor />
      <PersistentConsentShell />
      <div data-locale={locale}>{children}</div>
    </NextIntlClientProvider>
  );
}
