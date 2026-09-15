// @vitest-environment jsdom

import {cleanup, render} from '@testing-library/react';
import {createElement} from 'react';
import {afterEach, describe, expect, it} from 'vitest';

import {locales, resolveHtmlLang} from '../../src/config/site';
import {LocaleHtmlLangSync} from '../../src/i18n/locale-html-lang-sync';

/**
 * `<html lang>` 의 **런타임** 값을 고정한다.
 *
 * 서버 HTML 을 보는 검사(`routing-smoke` 의 `request.get` 루프)는 하이드레이션 **뒤**에
 * 일어나는 덮어쓰기를 구조적으로 볼 수 없다 — 서버가 옳은 태그를 내고 클라이언트가 그것을
 * 제품 코드로 되돌려도 그 루프는 초록이다. 그래서 이 검사가 따로 있고, 이쪽이 기본
 * 게이트(`npm test`) 안에서 돈다.
 */
describe('locale html lang sync', () => {
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('lang');
  });

  it.each(locales)('%s 는 제품 코드가 아니라 BCP 47 태그를 쓴다', (locale) => {
    document.documentElement.lang = '';

    render(createElement(LocaleHtmlLangSync, {locale}));

    expect(document.documentElement.lang).toBe(resolveHtmlLang(locale));
  });

  it('제품 코드와 태그가 갈리는 것은 정확히 셋이다', () => {
    // 전제: 열둘 중 셋만 코드와 태그가 다르다. 셋이 같아지면 위 단언이 공허해지므로,
    // 무엇을 지키는 검사인지를 여기 적어 둔다.
    const diverging = locales.filter((locale) => resolveHtmlLang(locale) !== locale);

    expect(diverging).toEqual(['kr', 'zs', 'zt']);
  });

  it('서버가 이미 쓴 태그를 유지한다', () => {
    document.documentElement.lang = resolveHtmlLang('kr');

    render(createElement(LocaleHtmlLangSync, {locale: 'kr'}));

    expect(document.documentElement.lang).toBe('ko');
  });
});
