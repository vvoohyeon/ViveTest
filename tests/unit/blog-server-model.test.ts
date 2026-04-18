import {describe, expect, it} from 'vitest';

import {
  getBlogDetailPageModel,
  getBlogIndexPageModel
} from '../../src/features/landing/blog/server-model';

describe('blog server page model', () => {
  it('keeps the blog index route list-only and preserves canonical registry order', () => {
    const pageModel = getBlogIndexPageModel('en');

    expect(pageModel.articles.map((article) => article.variant)).toEqual([
      'ops-handbook',
      'build-metrics',
      'release-gate'
    ]);
  });

  it('resolves blog detail strictly by route variant and rejects invalid or non-enterable variants', () => {
    const detailModel = getBlogDetailPageModel('en', 'build-metrics');

    expect(detailModel?.article.variant).toBe('build-metrics');
    expect(detailModel?.articles.map((article) => article.variant)).toEqual([
      'ops-handbook',
      'build-metrics',
      'release-gate'
    ]);
    expect(getBlogDetailPageModel('en', 'missing-variant')).toBeNull();
    expect(getBlogDetailPageModel('en', 'burnout-risk')).toBeNull();
  });
});
