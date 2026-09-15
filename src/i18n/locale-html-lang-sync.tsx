'use client';

import {useEffect} from 'react';

import {resolveHtmlLang, type AppLocale} from '@/config/site';

/**
 * `<html lang>` 을 현재 locale 의 **표시용 BCP 47 태그**로 맞춘다.
 *
 * 값의 정본은 `resolveHtmlLang` 하나이고 서버(`src/app/layout.tsx`)와 이 클라이언트 동기화가
 * 같은 함수를 읽는다. 제품 locale 코드(`kr`·`zs`·`zt`)를 그대로 쓰면 WCAG 3.1.1 을 어긴다 —
 * `kr` 은 유효한 태그이지만 Kanuri 를 가리키고 `zs`·`zt` 는 태그가 아니다.
 *
 * 종전에는 서버가 태그를, 이 훅이 제품 코드를 써서 **하이드레이션 뒤 서버의 값이 덮였다.**
 * 서버 HTML 을 보는 검사는 그 되돌아감을 구조적으로 볼 수 없다.
 */
export function LocaleHtmlLangSync({locale}: {locale: AppLocale}) {
  useEffect(() => {
    const htmlLang = resolveHtmlLang(locale);

    if (document.documentElement.lang !== htmlLang) {
      document.documentElement.lang = htmlLang;
    }
  }, [locale]);

  return null;
}
