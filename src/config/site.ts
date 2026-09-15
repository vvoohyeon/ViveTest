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
 * 일반 규칙으로는 풀 수 없는 진입 별칭만 적는다. **나머지는 열거하지 않는다** —
 * `resolveLocaleAlias` 가 지역 subtag 를 떼면서 이 표와 canonical 코드를 다시 본다.
 *
 * 스무 개짜리 열거표가 있던 자리다. 그래도 `/es-MX`·`/fr-CA`·`/en-AU` 처럼 적히지 않은 지역
 * 변형은 404 였고, 같은 토큰을 `Accept-Language` 로 보내면 `locale-resolution.ts` 의 일반
 * 정규화기가 정상 해석했다 — **해석기가 둘이었던 것이 결함의 원인**이다.
 *
 * 남는 것은 일반 규칙이 못 풀거나 틀리게 푸는 것들뿐이다.
 * - `ko`·`zh`·`jp`: 떼어 낼 지역 subtag 가 없고 canonical 코드도 아니다.
 * - `zh-hans`/`zh-hant`: script 가 정본을 가른다.
 * - `zh-tw`·`zh-hk`·`zh-mo`: **지역이 script 를 이긴다.** 이 셋을 빼면 지역을 떼는 순간
 *   `zh` → `zs` 가 되어 번체 사용자가 간체를 받는다.
 *
 * 항목을 더하기 전에 일반 규칙이 이미 푸는지 확인한다 — 중복 항목은 `zh-tw` 같은 진짜
 * 예외를 잡음 속에 묻는다. `tests/unit/locale-alias-parity.test.ts` 가 그것을 고정한다.
 *
 * 대소문자는 비교 시 소문자로 접으므로 여기에는 소문자만 적는다. 가드가 읽어야 하므로
 * export 한다.
 */
export const localeEntryAliases: Readonly<Record<string, AppLocale>> = {
  ko: 'kr',
  zh: 'zs',
  'zh-hans': 'zs',
  'zh-hant': 'zt',
  'zh-tw': 'zt',
  'zh-hk': 'zt',
  'zh-mo': 'zt',
  jp: 'ja'
};

/**
 * 경로 세그먼트를 locale 후보로 볼지 정하는 모양 검사 — 언어 2~3 자 + 선택적 script +
 * 선택적 지역(2 자 또는 숫자 3 자).
 *
 * script 를 임의의 4 자로 열어 두면 안 된다. `/id-card` 의 `card` 가 정확히 script 모양이라
 * 존재하지 않는 경로가 인도네시아어 홈으로 조용히 redirect 된다 — 404 보다 나쁘다. 이 제품이
 * 구분하는 script 는 한자 둘뿐이므로 그 둘만 받는다.
 *
 * 이 모양 검사가 `Accept-Language` 해석기와 이 함수가 **의도적으로** 갈리는 유일한 지점이다.
 * 헤더는 브라우저가 보낸 것이라 넓게 받아도 되지만, 경로는 사용자가 적은 것이고 잘못 맞히면
 * 엉뚱한 화면이 200 으로 나간다.
 */
const LOCALE_ENTRY_SEGMENT_PATTERN = /^[a-z]{2,3}(?:-(?:hans|hant))?(?:-(?:[a-z]{2}|[0-9]{3}))?$/u;

/** 표시용 `<html lang>` 태그. 제품 코드가 BCP 47 이 아닌 셋만 실제로 달라진다. */
export function resolveHtmlLang(locale: AppLocale): string {
  return localeMetadata[locale].htmlLang;
}

/**
 * 진입 세그먼트를 canonical 제품 코드로 푼다. canonical 자신이면 `null` 을 돌려 redirect 가
 * 필요 없음을 알린다 — 「별칭이 아니다」와 「이미 정본이다」를 호출자가 구분해야 한다.
 *
 * 지역 subtag 를 오른쪽부터 떼면서 별칭표와 canonical 코드를 다시 본다. 그래서 `/es-MX` 는
 * `es` 로, `/zh-Hant-TW` 는 `zh-hant` 단계에서 `zt` 로 풀린다 — 열거하지 않아도 된다.
 * 이 함수의 판정은 `locale-resolution.ts` 의 `normalizeLocaleToken` 과 같아야 하며
 * `tests/unit/locale-alias-parity.test.ts` 가 생성된 토큰 행렬로 그것을 고정한다.
 */
export function resolveLocaleAlias(segment: string): AppLocale | null {
  const normalized = segment.toLowerCase();

  if (isLocale(normalized)) {
    return normalized === segment ? null : normalized;
  }

  if (!LOCALE_ENTRY_SEGMENT_PATTERN.test(normalized)) {
    return null;
  }

  let candidate = normalized;

  while (candidate.length > 0) {
    const mapped = localeEntryAliases[candidate];

    if (mapped) {
      return mapped;
    }

    if (isLocale(candidate)) {
      return candidate;
    }

    const lastSubtagStart = candidate.lastIndexOf('-');

    if (lastSubtagStart === -1) {
      return null;
    }

    candidate = candidate.slice(0, lastSubtagStart);
  }

  return null;
}

/**
 * 절대 URL 의 기준 origin. OG 이미지와 canonical 은 상대 경로로는 성립하지 않는다 —
 * 크롤러가 그것을 해석할 문서 문맥을 갖지 않기 때문이다.
 *
 * **도메인을 여기 적지 않는다.** 저장소에 배포 도메인의 근거가 없다(전수 검색: `vercel.json`
 * 없음 · 하드코딩된 origin 0 건). 그래서 호스트가 스스로 알려 주는 값만 읽는다 —
 * `NEXT_PUBLIC_SITE_URL`(명시 지정) → `VERCEL_PROJECT_PRODUCTION_URL`(Vercel 이 빌드에 주는
 * 프로덕션 도메인) → 로컬 폴백. 셋 다 없으면 로컬 값이 나가고, 그때 공유 미리보기는 종전과
 * 같은 상태로 남는다 — 없는 도메인을 지어내는 것보다 낫다.
 */
export function resolveSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/u, '');
  }

  const vercelProductionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProductionHost) {
    return `https://${vercelProductionHost.replace(/^https?:\/\//u, '').replace(/\/$/u, '')}`;
  }

  return `http://localhost:${process.env.PORT?.trim() || '3000'}`;
}
