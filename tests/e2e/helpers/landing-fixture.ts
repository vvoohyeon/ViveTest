import type {AppLocale} from '../../../src/config/site';

export const PRIMARY_AVAILABLE_TEST_CARD_ID = 'test-qmbti';
export const PRIMARY_AVAILABLE_TEST_VARIANT = 'qmbti';
export const PRIMARY_OPT_OUT_TEST_CARD_ID = 'test-energy-check';
export const PRIMARY_OPT_OUT_TEST_VARIANT = 'energy-check';
export const PRIMARY_AVAILABLE_TEST_INGRESS_STORAGE_KEY =
  `vivetest-landing-ingress:${PRIMARY_AVAILABLE_TEST_VARIANT}`;

export function buildLocalizedPrimaryTestRoute(locale: AppLocale): string {
  return `/${locale}/test/${PRIMARY_AVAILABLE_TEST_VARIANT}`;
}

export function buildLocalizedOptOutTestRoute(locale: AppLocale): string {
  return `/${locale}/test/${PRIMARY_OPT_OUT_TEST_VARIANT}`;
}
