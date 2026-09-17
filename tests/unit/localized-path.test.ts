import {describe, expect, it} from 'vitest';

import {buildLocalizedPath} from '../../src/i18n/localized-path';
import {RouteBuilder} from '../../src/lib/routes/route-builder';

describe('buildLocalizedPath', () => {
  it('injects a single locale prefix from locale-free route objects', () => {
    expect(buildLocalizedPath(RouteBuilder.landing(), 'en')).toBe('/en');
    expect(buildLocalizedPath(RouteBuilder.blog(), 'kr')).toBe('/kr/blog');
    expect(buildLocalizedPath(RouteBuilder.blogArticle('ops-handbook'), 'kr')).toBe('/kr/blog/ops-handbook');
    expect(buildLocalizedPath(RouteBuilder.blog(), 'zs')).toBe('/zs/blog');
    expect(buildLocalizedPath(RouteBuilder.history(), 'en')).toBe('/en/history');
    expect(buildLocalizedPath(RouteBuilder.result('egtt', 'EM'), 'ja')).toBe('/ja/result/egtt/EM');
    expect(buildLocalizedPath(RouteBuilder.question('alpha'), 'ru')).toBe('/ru/test/alpha');
    expect(buildLocalizedPath(RouteBuilder.testError(), 'kr')).toBe('/kr/test/error');
  });
});
