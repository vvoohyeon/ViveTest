import {createTranslator} from 'next-intl';
import {describe, expect, it} from 'vitest';

import deMessages from '../../src/messages/de.json';
import enMessages from '../../src/messages/en.json';
import esMessages from '../../src/messages/es.json';
import frMessages from '../../src/messages/fr.json';
import hiMessages from '../../src/messages/hi.json';
import idMessages from '../../src/messages/id.json';
import jaMessages from '../../src/messages/ja.json';
import krMessages from '../../src/messages/kr.json';
import ptMessages from '../../src/messages/pt.json';
import ruMessages from '../../src/messages/ru.json';
import zsMessages from '../../src/messages/zs.json';
import ztMessages from '../../src/messages/zt.json';
import {resolveLandingCatalog} from '../../src/features/variant-registry';

const messagesByLocale = {
  de: deMessages,
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  hi: hiMessages,
  id: idMessages,
  ja: jaMessages,
  kr: krMessages,
  pt: ptMessages,
  ru: ruMessages,
  zs: zsMessages,
  zt: ztMessages
} as const;

/** `kr`·`zs`·`zt` 는 URL·저장소의 정본 코드이고 ICU 복수형은 BCP 47 태그를 읽는다. */
const icuLocaleByAppLocale: Record<keyof typeof messagesByLocale, string> = {
  de: 'de',
  en: 'en',
  es: 'es',
  fr: 'fr',
  hi: 'hi',
  id: 'id',
  ja: 'ja',
  kr: 'ko',
  pt: 'pt',
  ru: 'ru',
  zs: 'zh-Hans',
  zt: 'zh-Hant'
};

describe('OPTED_OUT 고지 행', () => {
  it('숨은 개수는 카탈로그 필터 결과의 차다', () => {
    const unknown = resolveLandingCatalog('en', {consentState: 'UNKNOWN'});
    const optedOut = resolveLandingCatalog('en', {consentState: 'OPTED_OUT'});

    // 상수로 적지 않는다 — 픽스처가 바뀌면 이 검사가 그 사실을 말해야 한다.
    expect(optedOut.length).toBeLessThan(unknown.length);
    expect(unknown.length - optedOut.length).toBeGreaterThan(0);
    // `OPTED_IN` 은 `UNKNOWN` 과 같은 집합이므로 고지 행이 서지 않는다.
    expect(resolveLandingCatalog('en', {consentState: 'OPTED_IN'}).length).toBe(unknown.length);
  });

  it('12 locale 의 고지 문구가 실제 숨은 개수로 포맷된다', () => {
    const unknown = resolveLandingCatalog('en', {consentState: 'UNKNOWN'}).length;
    const optedOut = resolveLandingCatalog('en', {consentState: 'OPTED_OUT'}).length;
    const hiddenCount = unknown - optedOut;

    for (const [locale, messages] of Object.entries(messagesByLocale)) {
      const t = createTranslator({
        locale: icuLocaleByAppLocale[locale as keyof typeof messagesByLocale],
        messages,
        namespace: 'landing'
      });

      const notice = t('optedOutNotice', {count: hiddenCount});
      expect(notice, `${locale} 고지 문구`).toContain(String(hiddenCount));
      expect(notice, `${locale} 고지 문구에 ICU 원문이 남았다`).not.toContain('plural');
      expect(t('optedOutNoticeAction').length, `${locale} 해제 링크 라벨`).toBeGreaterThan(0);

      // 단수 경로도 함께 편다 — `=1` 가지가 있는 locale 에서만 다른 문장이 나온다.
      expect(t('optedOutNotice', {count: 1})).toContain('1');
    }
  });
});
