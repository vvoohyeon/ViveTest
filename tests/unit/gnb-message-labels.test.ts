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

/**
 * 설정 라벨은 `Settings` 다 — 명세 §3-2.
 *
 * 종전에는 도메인 둘을 가운데점으로 이은 합성 라벨(`Language ⋅ Theme`)이었고, 이 파일은
 * 그것만 있을 것을 12 locale 에 걸어 고정하고 있었다. 그 라벨은 좁은 폭에서 **두 줄로 접힌다**
 * — 길어지는 언어(독일어 `Sprache ⋅ Thema`)에서 더 일찍 접힌고, 그러면 테마 컸트롤 행의 높이가
 * 언어마다 달라진다.
 *
 * 그래서 보이는 라벨은 한 단어짜리 `settings` 가 되고, 합성 라벨이 겸직하던 **두 이름**은
 * 이제 각자 제 묶음의 접근 가능한 이름으로 산다 — `theme` 는 `radiogroup` 의, `language` 는 칩 12 개
 * 묶음의 이름이다. 형태를 지키기로 한 결정이 접근성까지 처분한 것은 아니다(명세 §2-4).
 */

const ALL_MESSAGES = {
  en: enMessages,
  kr: krMessages,
  zs: zsMessages,
  zt: ztMessages,
  ja: jaMessages,
  es: esMessages,
  fr: frMessages,
  pt: ptMessages,
  de: deMessages,
  hi: hiMessages,
  id: idMessages,
  ru: ruMessages
} as const;

const GNB_KEYS_REQUIRED_BY_THE_SETTINGS_SURFACES = [
  'settings',
  'theme',
  'language',
  'system',
  'themeEffective',
  'light',
  'dark'
] as const;

describe('gnb settings label messages', () => {
  it('gives every locale the keys the two settings surfaces read', () => {
    // 목록이 아니라 조건이다 — 12 locale 하나만 빠져도 그 언어에서는 next-intl 이 런타임에
    // 던진다. 모든 언어 × 모든 키를 훑는다.
    const missing = Object.entries(ALL_MESSAGES).flatMap(([locale, messages]) =>
      GNB_KEYS_REQUIRED_BY_THE_SETTINGS_SURFACES.filter(
        (key) => typeof (messages.gnb as Record<string, unknown>)[key] !== 'string'
      ).map((key) => `${locale}.gnb.${key}`)
    );

    expect(missing).toEqual([]);
  });

  it('keeps the visible label a single word, never the folded compound', () => {
    const folded = Object.entries(ALL_MESSAGES).flatMap(([locale, messages]) => {
      const label = messages.gnb.settings;
      // 합성 라벨은 구분자로 두 이름을 이었다 — 그 모양이 돌아오면 접힘도 돌아온다.
      return /[⋅·•|/]/u.test(label) ? [`${locale}: ${label}`] : [];
    });

    expect(folded).toEqual([]);
  });

  it('keeps theme and language as separate group names, not one compound', () => {
    expect(enMessages.gnb.settings).toBe('Settings');
    expect(enMessages.gnb.theme).toBe('Theme');
    expect(enMessages.gnb.language).toBe('Language');
    expect(enMessages.gnb.system).toBe('System');

    // 두 묶음의 이름이 같으면 보조기술이 둘을 가를 수 없다.
    const collided = Object.entries(ALL_MESSAGES).flatMap(([locale, messages]) =>
      messages.gnb.theme === messages.gnb.language ? [locale] : []
    );

    expect(collided).toEqual([]);
  });
});
