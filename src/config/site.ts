/**
 * 제품 locale 코드는 URL 세그먼트·스토리지 키·telemetry 필드의 정본이고 **바뀌지 않는다.**
 * 그러나 `kr`·`zs`·`zt` 는 BCP 47 이 아니어서 두 결함이 **같은 원인으로** 났다 —
 * `<html lang>` 이 유효하지 않고(WCAG 3.1.1), BCP 47 로 쓴 경로가 전부 404 였다.
 *
 * `htmlLang` 은 **표시용 태그**이고 `entryAliases` 는 **진입 별칭**이다. 둘 다 정본을 바꾸지
 * 않는다 — 별칭으로 들어오면 canonical 세그먼트로 redirect 한다.
 */
const localeMetadata = {
  en: {
    label: 'English',
    htmlLang: 'en'
  },
  kr: {
    label: '한국어',
    htmlLang: 'ko'
  },
  zs: {
    label: '简体中文',
    htmlLang: 'zh-Hans'
  },
  zt: {
    label: '繁體中文',
    htmlLang: 'zh-Hant'
  },
  ja: {
    label: '日本語',
    htmlLang: 'ja'
  },
  es: {
    label: 'Español',
    htmlLang: 'es'
  },
  fr: {
    label: 'Français',
    htmlLang: 'fr'
  },
  pt: {
    label: 'Português',
    htmlLang: 'pt'
  },
  de: {
    label: 'Deutsch',
    htmlLang: 'de'
  },
  hi: {
    label: 'हिन्दी',
    htmlLang: 'hi'
  },
  id: {
    label: 'Indonesia',
    htmlLang: 'id'
  },
  ru: {
    label: 'Русский',
    htmlLang: 'ru'
  }
} as const;

export type AppLocale = keyof typeof localeMetadata;

export const locales = Object.keys(localeMetadata) as AppLocale[];

export const localeOptions: ReadonlyArray<{
  code: AppLocale;
  label: string;
}> = locales.map((locale) => ({
  code: locale,
  label: localeMetadata[locale].label
}));

export const localeSegmentPatternSource = locales.join('|');

export const defaultLocale: AppLocale = 'en';

export const localeCookieName = 'NEXT_LOCALE';

export function isLocale(value: string): value is AppLocale {
  return Object.hasOwn(localeMetadata, value);
}

/**
 * BCP 47 또는 흔한 변형으로 들어온 진입을 canonical 제품 코드로 보낸다.
 *
 * 실측(2026-09-11): `/ko`·`/zh`·`/zh-Hans`·`/en-US`·`/pt-BR`·`/KR`·`/jp` 전부 404 였고
 * `/kr`·`/zs`·`/ja` 만 200 이었다. 사용자가 손으로 적을 법한 형태가 전부 막혀 있었다.
 *
 * 대소문자는 비교 시 소문자로 접으므로 여기에는 소문자만 적는다.
 */
const localeEntryAliases: Readonly<Record<string, AppLocale>> = {
  ko: 'kr',
  'ko-kr': 'kr',
  zh: 'zs',
  'zh-hans': 'zs',
  'zh-cn': 'zs',
  'zh-sg': 'zs',
  'zh-hant': 'zt',
  'zh-tw': 'zt',
  'zh-hk': 'zt',
  jp: 'ja',
  'ja-jp': 'ja',
  'en-us': 'en',
  'en-gb': 'en',
  'pt-br': 'pt',
  'es-es': 'es',
  'fr-fr': 'fr',
  'de-de': 'de',
  'ru-ru': 'ru',
  'hi-in': 'hi',
  'id-id': 'id'
};

/** 표시용 `<html lang>` 태그. 제품 코드가 BCP 47 이 아닌 셋만 실제로 달라진다. */
export function resolveHtmlLang(locale: AppLocale): string {
  return localeMetadata[locale].htmlLang;
}

/**
 * 진입 세그먼트를 canonical 제품 코드로 푼다. canonical 자신이면 `null` 을 돌려 redirect 가
 * 필요 없음을 알린다 — 「별칭이 아니다」와 「이미 정본이다」를 호출자가 구분해야 한다.
 */
export function resolveLocaleAlias(segment: string): AppLocale | null {
  const normalized = segment.toLowerCase();

  if (isLocale(normalized) && normalized === segment) {
    return null;
  }

  if (isLocale(normalized)) {
    return normalized;
  }

  return localeEntryAliases[normalized] ?? null;
}
