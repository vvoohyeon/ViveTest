export const PRIMARY_AVAILABLE_TEST_CARD_ID = 'test-qmbti';
export const PRIMARY_AVAILABLE_TEST_VARIANT = 'qmbti';
export const PRIMARY_AVAILABLE_TEST_INGRESS_STORAGE_KEY =
  `vivetest-landing-ingress:${PRIMARY_AVAILABLE_TEST_VARIANT}`;

export function buildLocalizedPrimaryTestRoute(locale: 'en' | 'kr'): string {
  return `/${locale}/test/${PRIMARY_AVAILABLE_TEST_VARIANT}`;
}
