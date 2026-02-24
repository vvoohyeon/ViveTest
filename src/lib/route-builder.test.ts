import {describe, expect, it} from 'vitest';
import {
  appRoutes,
  buildBlogRouteWithSource,
  buildTestQuestionRoute,
  hasDuplicateLocaleSegment,
  withLocalePrefix
} from '@/lib/route-builder';

describe('route-builder', () => {
  it('builds locale-free core routes', () => {
    expect(appRoutes.landing).toBe('/');
    expect(appRoutes.blog).toBe('/blog');
    expect(appRoutes.history).toBe('/history');
    expect(buildTestQuestionRoute('vibe-core')).toBe('/test/vibe-core/question');
  });

  it('builds blog route query payload', () => {
    expect(buildBlogRouteWithSource('blog-deep-work')).toEqual({
      pathname: '/blog',
      query: {source: 'blog-deep-work'}
    });
  });

  it('detects duplicated locale segments', () => {
    expect(hasDuplicateLocaleSegment('/en/en/blog')).toBe(true);
    expect(hasDuplicateLocaleSegment('/kr/kr/test/vibe-core/question')).toBe(true);
    expect(hasDuplicateLocaleSegment('/en/blog')).toBe(false);
  });

  it('prefixes locale exactly once', () => {
    expect(withLocalePrefix('en', '/blog')).toBe('/en/blog');
    expect(withLocalePrefix('kr', '/')).toBe('/kr');
  });
});
