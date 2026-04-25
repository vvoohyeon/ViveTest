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

  it('passes through already localized and bypass paths', () => {
    expect(
      resolveProxyDecision({
        pathname: '/kr'
      })
    ).toEqual({action: 'next'});

    expect(
      resolveProxyDecision({
        pathname: '/zs/blog'
      })
    ).toEqual({action: 'next'});

    expect(
      resolveProxyDecision({
        pathname: '/zs/blog/ops-handbook'
      })
    ).toEqual({action: 'next'});

    expect(
      resolveProxyDecision({
        pathname: '/ru'
      })
    ).toEqual({action: 'next'});

    expect(
      resolveProxyDecision({
        pathname: '/_next/static/chunk.js'
      })
    ).toEqual({action: 'next'});

    expect(
      resolveProxyDecision({
        pathname: '/_not-found'
      })
    ).toEqual({action: 'next'});
  });
});
