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

describe('landing message labels', () => {
  it('keeps coming-soon tag copy lowercase for case-bearing scripts and unchanged for caseless scripts', () => {
    expect({
      de: deMessages.landing.comingSoon,
      en: enMessages.landing.comingSoon,
      es: esMessages.landing.comingSoon,
      fr: frMessages.landing.comingSoon,
      hi: hiMessages.landing.comingSoon,
      id: idMessages.landing.comingSoon,
      ja: jaMessages.landing.comingSoon,
      kr: krMessages.landing.comingSoon,
      pt: ptMessages.landing.comingSoon,
      ru: ruMessages.landing.comingSoon,
      zs: zsMessages.landing.comingSoon,
      zt: ztMessages.landing.comingSoon
    }).toEqual({
      de: 'demnächst',
      en: 'coming soon',
      es: 'próximamente',
      fr: 'bientôt disponible',
      hi: 'जल्द आ रहा है',
      id: 'segera hadir',
      ja: '近日公開',
      kr: '출시 예정',
      pt: 'em breve',
      ru: 'скоро',
      zs: '即将推出',
      zt: '即將推出'
    });
  });
});
