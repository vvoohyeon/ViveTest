'use client';

import {useEffect} from 'react';

import type {AppLocale} from '@/config/site';

export function LocaleHtmlLangSync({locale}: {locale: AppLocale}) {
  useEffect(() => {
    if (document.documentElement.lang !== locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return null;
}
