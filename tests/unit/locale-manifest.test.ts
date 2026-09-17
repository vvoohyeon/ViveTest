import {describe, expect, it} from 'vitest';

import {locales} from '../../src/config/site';

import {readRepoFile, repoPathExists} from './helpers/repo';

/**
 * 「홈 화면에 추가」 대화상자는 manifest 의 `name`·`description` 을 읽는다. 루트 manifest 는
 * **한 벌**이라 어느 언어에서 들어왔든 영어 설명을 보여 줬다 — 설명 문장은 이미 12 locale 에
 * 있었는데(`meta.description`, `<meta name="description">` 과 OG 가 쓰던 것) manifest 만 그것을
 * 읽지 않았다.
 *
 * 이 검사가 고정하는 것은 셋이다. ⑴ locale 사본이 존재하고 ⑵ 설명을 **메시지에서** 가져오며
 * (영어 상수로 되돌아가지 않는다) ⑶ 12 locale 전부에 그 메시지가 있다. `name` 은 브랜드명이라
 * 번역 대상이 아니므로 상수인 것이 맞다.
 */
const LOCALE_MANIFEST_ROUTE = 'src/app/[locale]/manifest.webmanifest/route.ts';
const LOCALE_LAYOUT = 'src/app/[locale]/layout.tsx';
const ENGLISH_DESCRIPTION = 'Short personality and aptitude tests you can finish in a few minutes.';

describe('locale 별 manifest', () => {
  it('라우트가 있고 설명을 메시지에서 가져온다', () => {
    expect(repoPathExists(LOCALE_MANIFEST_ROUTE), `${LOCALE_MANIFEST_ROUTE} 가 없다`).toBe(true);

    const route = readRepoFile(LOCALE_MANIFEST_ROUTE);

    expect(route, '설명은 번역에서 온다').toMatch(/description:\s*t\('description'\)/u);
    expect(
      route.includes(ENGLISH_DESCRIPTION),
      'locale 사본이 영어 상수를 들고 있으면 번역이 있으나 마나다'
    ).toBe(false);
    // 설치한 언어로 바로 열린다 — 루트 사본의 `/` 와 다른 유일한 자리다.
    expect(route).toMatch(/start_url:\s*`\/\$\{locale\}`/u);
  });

  it('locale 레이아웃이 그 사본을 가리킨다', () => {
    const layout = readRepoFile(LOCALE_LAYOUT);

    expect(
      layout,
      'generateMetadata 가 가리키지 않으면 사본이 있어도 브라우저가 루트 것을 읽는다'
    ).toMatch(/manifest:\s*`\/\$\{locale\}\/manifest\.webmanifest`/u);
  });

  it('12 locale 전부에 설명 메시지가 있다', () => {
    const missing = locales.filter((locale) => {
      const messages = JSON.parse(readRepoFile(`src/messages/${locale}.json`)) as {
        meta?: {description?: string};
      };
      return !messages.meta?.description;
    });

    expect(locales.length, '전제: locale 목록이 비면 아래 단언이 공허해진다').toBeGreaterThan(0);
    expect(missing, `meta.description 이 없는 locale: ${missing.join(', ')}`).toEqual([]);
  });

  it('영어 아닌 locale 의 설명은 영어와 다르다 — 키만 있고 번역이 안 된 상태를 잡는다', () => {
    const untranslated = locales
      .filter((locale) => locale !== 'en')
      .filter((locale) => {
        const messages = JSON.parse(readRepoFile(`src/messages/${locale}.json`)) as {
          meta?: {description?: string};
        };
        return messages.meta?.description === ENGLISH_DESCRIPTION;
      });

    expect(untranslated, `설명이 영어 그대로인 locale: ${untranslated.join(', ')}`).toEqual([]);
  });
});
