import {describe, expect, it} from 'vitest';

import {resolveProxyDecision} from '../../src/i18n/proxy-policy';

describe('proxy policy', () => {
  it('redirects root requests using cookie first', () => {
    expect(
      resolveProxyDecision({
        pathname: '/',
        cookieLocale: 'kr',
        acceptLanguage: 'en-US,en;q=0.9'
      })
    ).toEqual({
      action: 'redirect',
      pathname: '/kr'
    });
  });

  it('redirects allowlisted locale-less paths', () => {
    expect(
      resolveProxyDecision({
        pathname: '/blog',
        acceptLanguage: 'zh-CN,zh;q=0.9'
      })
    ).toEqual({
      action: 'redirect',
      pathname: '/zs/blog'
    });

    expect(
      resolveProxyDecision({
        pathname: '/blog/ops-handbook',
        acceptLanguage: 'zh-CN,zh;q=0.9'
      })
    ).toEqual({
      action: 'redirect',
      pathname: '/zs/blog/ops-handbook'
    });

    expect(
      resolveProxyDecision({
        pathname: '/test/alpha',
        acceptLanguage: 'zh-TW,zh;q=0.9'
      })
    ).toEqual({
      action: 'redirect',
      pathname: '/zt/test/alpha'
    });
  });

  it('rewrites duplicate locale prefixes and non-app paths to the global not-found surface', () => {
    expect(
      resolveProxyDecision({
        pathname: '/zs/zt/blog'
      })
    ).toEqual({
      action: 'rewrite',
      pathname: '/_not-found'
    });

    expect(
      resolveProxyDecision({
        pathname: '/foo'
      })
    ).toEqual({
      action: 'rewrite',
      pathname: '/_not-found'
    });

    expect(
      resolveProxyDecision({
        pathname: '/va-123/view'
      })
    ).toEqual({
      action: 'rewrite',
      pathname: '/_not-found'
    });
  });

  it('passes through already localized paths with resolved locale', () => {
    expect(
      resolveProxyDecision({
        pathname: '/kr'
      })
    ).toEqual({action: 'next', locale: 'kr'});

    expect(
      resolveProxyDecision({
        pathname: '/zs/blog'
      })
    ).toEqual({action: 'next', locale: 'zs'});

    expect(
      resolveProxyDecision({
        pathname: '/zs/blog/ops-handbook'
      })
    ).toEqual({action: 'next', locale: 'zs'});

    expect(
      resolveProxyDecision({
        pathname: '/ru'
      })
    ).toEqual({action: 'next', locale: 'ru'});
  });
  /**
   * 제품 locale 코드가 BCP 47 이 아니라서 두 결함이 **같은 원인으로** 났다 — `<html lang>` 이
   * 유효하지 않고, 동시에 BCP 47 로 쓴 경로가 전부 404 였다. 실측(2026-09-11): `/ko`·`/zh`·
   * `/zh-Hans`·`/en-US`·`/pt-BR`·`/KR`·`/jp` 전부 404, `/kr`·`/zs`·`/ja` 는 200.
   *
   * 정본은 그대로 둔다 — 별칭은 canonical 세그먼트로 **redirect** 될 뿐이고 URL·스토리지·
   * telemetry 의 정본 코드는 바뀌지 않는다.
   */
  it('redirects BCP 47 and common locale aliases to the canonical product segment', () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ['/ko', '/kr'],
      ['/ko-KR', '/kr'],
      ['/zh', '/zs'],
      ['/zh-Hans', '/zs'],
      ['/zh-Hant', '/zt'],
      ['/jp', '/ja'],
      ['/en-US', '/en'],
      ['/pt-BR', '/pt'],
      ['/KR', '/kr'],
      ['/ko/blog', '/kr/blog'],
      ['/zh-Hant/test/qmbti', '/zt/test/qmbti'],
      // 지역 변형은 열거표에 없었고 그래서 전부 404 였다(실측 2026-09-15). 같은 토큰을
      // `Accept-Language` 로 보내면 해석되던 것이 결함의 모양이다.
      ['/es-MX', '/es'],
      ['/fr-CA', '/fr'],
      ['/pt-PT', '/pt'],
      ['/en-AU', '/en'],
      // 지역이 script 를 이긴다 — 이 셋이 간체로 새면 번체 사용자가 잘못된 화면을 받는다.
      ['/zh-MO', '/zt'],
      ['/zh-Hant-TW', '/zt'],
      ['/zh-Hans-CN', '/zs']
    ];

    for (const [from, to] of cases) {
      expect(resolveProxyDecision({pathname: from}), from).toEqual({
        action: 'redirect',
        pathname: to
      });
    }
  });

  it('leaves canonical locale segments alone', () => {
    // 전제: canonical 이 별칭 경로로 새면 무한 redirect 가 된다.
    for (const canonical of ['/kr', '/zs', '/zt', '/ja', '/en']) {
      expect(resolveProxyDecision({pathname: canonical}), canonical).toEqual({
        action: 'next',
        locale: canonical.slice(1)
      });
    }
  });

  it('still 404s a segment that is neither a locale nor an alias', () => {
    expect(resolveProxyDecision({pathname: '/not-a-locale'})).toEqual({
      action: 'rewrite',
      pathname: '/_not-found'
    });
  });

  it('keeps locale-shaped-looking ordinary paths on the 404 surface', () => {
    // 지역 subtag 를 떼는 규칙이 script 자리를 임의의 4 자로 열면 `card` 가 정확히 그 모양이라
    // `/id-card` 가 인도네시아어 홈으로 조용히 redirect 된다 — 404 보다 나쁘다.
    for (const pathname of ['/id-card', '/en-route', '/de-luxe/blog', '/va-123/view']) {
      expect(resolveProxyDecision({pathname}), pathname).toEqual({
        action: 'rewrite',
        pathname: '/_not-found'
      });
    }
  });
});
