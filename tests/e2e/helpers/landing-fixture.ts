import type {AppLocale} from '../../../src/config/site';
import {
  resolveLandingCatalog,
  type LandingCardAttribute,
  type LandingTestCard
} from '../../../src/features/variant-registry';

export const PRIMARY_AVAILABLE_TEST_VARIANT = 'qmbti';
export const PRIMARY_AVAILABLE_TEST_INGRESS_STORAGE_KEY =
  `vivetest-landing-ingress:${PRIMARY_AVAILABLE_TEST_VARIANT}`;
export const PRIMARY_OPT_OUT_TEST_VARIANT = 'energy-check';
export const PRIMARY_OPT_OUT_TEST_INGRESS_STORAGE_KEY = `vivetest-landing-ingress:${PRIMARY_OPT_OUT_TEST_VARIANT}`;
export const PRIMARY_BLOG_VARIANT = 'ops-handbook';
export const SECONDARY_BLOG_VARIANT = 'build-metrics';
export const NON_ENTERABLE_BLOG_VARIANT = 'burnout-risk';

export interface TestVariantInstructionFixture {
  variant: string;
  attribute: LandingCardAttribute;
  instruction: string;
}

export const TEST_VARIANT_INSTRUCTION_FIXTURES_EN: ReadonlyArray<TestVariantInstructionFixture> =
  resolveLandingCatalog('en', {audience: 'qa'})
    .filter((card): card is LandingTestCard => card.type === 'test')
    .map((card) => ({
      variant: card.variant,
      attribute: card.attribute,
      instruction: card.test.instruction
    }));

export function buildLocalizedTestRoute(locale: AppLocale, variant: string): string {
  return `/${locale}/test/${variant}`;
}

export function buildLocalizedPrimaryTestRoute(locale: AppLocale): string {
  return buildLocalizedTestRoute(locale, PRIMARY_AVAILABLE_TEST_VARIANT);
}

export function buildLocalizedPrimaryOptOutTestRoute(locale: AppLocale): string {
  return buildLocalizedTestRoute(locale, PRIMARY_OPT_OUT_TEST_VARIANT);
}

export function buildLocalizedBlogIndexRoute(locale: AppLocale): string {
  return `/${locale}/blog`;
}

export function buildLocalizedBlogDetailRoute(locale: AppLocale, variant: string): string {
  return `/${locale}/blog/${variant}`;
}
