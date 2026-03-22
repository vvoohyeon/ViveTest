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

describe('gnb settings label messages', () => {
  it('keeps only the combined theme label across all locales', () => {
    expect(enMessages.gnb.theme).toBe('Language⋅Theme');
    expect(krMessages.gnb.theme).toBe('언어⋅테마');
    expect(jaMessages.gnb.theme).toBe('言語⋅テーマ');
    expect(zsMessages.gnb.theme).toBe('语言⋅主题');
    expect(ztMessages.gnb.theme).toBe('語言⋅主題');
    expect(esMessages.gnb.theme).toBe('Idioma⋅Tema');
    expect(frMessages.gnb.theme).toBe('Langue⋅Thème');
    expect(ptMessages.gnb.theme).toBe('Idioma⋅Tema');
    expect(deMessages.gnb.theme).toBe('Sprache⋅Thema');
    expect(hiMessages.gnb.theme).toBe('भाषा⋅थीम');
    expect(idMessages.gnb.theme).toBe('Bahasa⋅Tema');
    expect(ruMessages.gnb.theme).toBe('Язык⋅Тема');

    expect('language' in enMessages.gnb).toBe(false);
    expect('language' in krMessages.gnb).toBe(false);
    expect('language' in jaMessages.gnb).toBe(false);
    expect('language' in zsMessages.gnb).toBe(false);
    expect('language' in ztMessages.gnb).toBe(false);
    expect('language' in esMessages.gnb).toBe(false);
    expect('language' in frMessages.gnb).toBe(false);
    expect('language' in ptMessages.gnb).toBe(false);
    expect('language' in deMessages.gnb).toBe(false);
    expect('language' in hiMessages.gnb).toBe(false);
    expect('language' in idMessages.gnb).toBe(false);
    expect('language' in ruMessages.gnb).toBe(false);
  });
});
