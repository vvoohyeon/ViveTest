import {describe, expect, it} from 'vitest';

import {
  isLocale,
  localeEntryAliases,
  locales,
  resolveHtmlLang,
  resolveLocaleAlias,
  type AppLocale
} from '../../src/config/site';
import {normalizeLocaleToken} from '../../src/i18n/locale-resolution';

/**
 * 이 저장소에는 locale 해석기가 **둘** 있다.
 *
 * - `normalizeLocaleToken` — `Accept-Language`·쿠키가 쓴다. 일반 BCP 47 정규화기다.
 * - `resolveLocaleAlias` — URL 경로의 첫 세그먼트가 쓴다.
 *
 * 둘을 한 모듈로 합칠 수 없다. `config/site.ts` 는 아무것도 import 하지 않는 데이터 정본이고
 * `locale-resolution.ts` 가 그것을 import 하므로, 반대 방향 의존은 순환이 된다. 합칠 수 없는
 * 사본은 **대조로 고정한다** — 저장소가 CSS/JS 입력 축 사본에 이미 쓰는 방식이다.
 *
 * 토큰 목록을 손으로 적지 않는다. 손으로 적은 목록은 적힌 것만 지키고, 적히지 않은 지역
 * 변형이 404 였던 것이 애초의 결함이었다.
 */

const REGION_SUBTAGS = [
  'US', 'GB', 'AU', 'CA', 'KR', 'CN', 'TW', 'HK', 'MO', 'SG', 'JP', 'BR', 'PT', 'MX', 'ES', 'FR', 'DE', 'RU', 'IN', 'ID'
] as const;

/** canonical 코드는 redirect 가 필요 없어 `null` 이다 — 대조할 때 그 차이를 걷어낸다. */
function resolvePathLocale(segment: string): AppLocale | null {
  const alias = resolveLocaleAlias(segment);

  if (alias) {
    return alias;
  }

  const normalized = segment.toLowerCase();

  return isLocale(normalized) ? normalized : null;
}

function buildTokenMatrix(): string[] {
  const bases = new Set<string>();

  for (const locale of locales) {
    bases.add(locale);
    bases.add(resolveHtmlLang(locale));
  }

  // 일반 규칙으로 풀리지 않아 별칭표에 남은 것들.
  for (const shortcut of ['ko', 'zh', 'jp', 'zh-Hans', 'zh-Hant']) {
    bases.add(shortcut);
  }

  const tokens = new Set<string>();

  for (const base of bases) {
    tokens.add(base);
    tokens.add(base.toUpperCase());
    tokens.add(base.toLowerCase());

    for (const region of REGION_SUBTAGS) {
      tokens.add(`${base}-${region}`);
    }
  }

  return [...tokens];
}

describe('locale alias parity', () => {
  const tokens = buildTokenMatrix();

  it('생성된 토큰 행렬이 실제로 넓다', () => {
    // 전제: 행렬이 비거나 좁아지면 아래 단언이 조용히 공허해진다.
    expect(tokens.length).toBeGreaterThan(300);
  });

  it('헤더가 푸는 토큰은 경로도 같은 locale 로 푼다', () => {
    // **이것이 결함의 방향이다.** `Accept-Language: es-MX` 는 `es` 로 해석되는데 `/es-MX` 는
    // 404 였다. 헤더가 아는 것을 경로가 모르면 붉어진다.
    const missed = tokens
      .map((token) => ({token, path: resolvePathLocale(token), header: normalizeLocaleToken(token)}))
      .filter(({path, header}) => header !== null && path !== header)
      .map(({token, path, header}) => `${token}: path=${path} header=${header}`);

    expect(missed).toEqual([]);
  });

  it('경로만 푸는 토큰은 이름 붙은 두 부류뿐이다', () => {
    // 경로 쪽은 헤더의 **상위집합**이고 그래야 한다 — URL 에 보이는 것은 BCP 47 태그가 아니라
    // 제품 코드이므로 사용자가 `/kr-KR` 이라고 적을 수 있고, `jp` 는 흔한 오기다. 다만
    // 상위집합을 열어 두지 않는다: 이름 없는 확장이 생기면 붉어진다.
    const pathOnly = tokens.filter(
      (token) => resolvePathLocale(token) !== null && normalizeLocaleToken(token) === null
    );

    const unnamed = pathOnly.filter((token) => {
      const lowered = token.toLowerCase();
      const isProductCodeEntry = locales.some(
        (locale) => lowered === locale || lowered.startsWith(`${locale}-`)
      );
      const isJapaneseShorthand = lowered === 'jp' || lowered.startsWith('jp-');

      return !isProductCodeEntry && !isJapaneseShorthand;
    });

    expect(unnamed).toEqual([]);
    expect(pathOnly.length).toBeGreaterThan(0);
  });

  it('별칭표의 모든 항목이 존재 이유를 갖는다', () => {
    // **생성 행렬만으로는 이 검사를 대신할 수 없다.** 행렬은 locale 코드와 태그에서 토큰을
    // 만들어 내므로 표에 새로 들어온 임의의 키(예: `kor`)를 아예 만들어 보지 않는다 — 그
    // 사각지대를 실제 고장 주입으로 확인하고 이 검사를 붙였다. 표 자체를 순회해 닫는다.
    //
    // 정당한 항목은 둘 중 하나다: 헤더 해석기와 같은 답을 주거나(일반 규칙이 못 미치는
    // 자리를 메운다), BCP 47 이 아닌 경로 전용 단축이거나. 후자는 `jp` 하나뿐이다.
    const unjustified = Object.entries(localeEntryAliases)
      .filter(([segment, locale]) => normalizeLocaleToken(segment) !== locale && segment !== 'jp')
      .map(([segment, locale]) => `${segment} -> ${locale} (header=${normalizeLocaleToken(segment)})`);

    expect(unjustified).toEqual([]);
  });

  it('번체 지역은 script 를 생략해도 간체로 새지 않는다', () => {
    // 지역을 떼는 일반 규칙 하나만 있으면 `zh-TW` → `zh` → `zs` 가 된다. 별칭표에 남긴
    // 세 지역이 그것을 막는 유일한 장치이므로 따로 단언한다.
    for (const token of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant-TW', 'zh-Hant-HK']) {
      expect(resolvePathLocale(token), token).toBe('zt');
    }

    for (const token of ['zh-CN', 'zh-SG', 'zh-Hans-CN', 'zh']) {
      expect(resolvePathLocale(token), token).toBe('zs');
    }
  });

  it('지역 변형은 열거하지 않아도 풀린다', () => {
    // 이것이 닫는 결함이다 — 실측(2026-09-15)에서 아래 넷은 전부 404 였고, 같은 토큰을
    // `Accept-Language` 로 보내면 정상 해석됐다.
    expect(resolvePathLocale('es-MX')).toBe('es');
    expect(resolvePathLocale('fr-CA')).toBe('fr');
    expect(resolvePathLocale('pt-PT')).toBe('pt');
    expect(resolvePathLocale('en-AU')).toBe('en');
  });

  it('locale 모양이 아닌 세그먼트는 경로에서만 거부된다', () => {
    // **의도된 유일한 갈림.** 헤더는 브라우저가 보낸 것이라 넓게 받아도 되지만, 경로는
    // 사용자가 적은 것이라 잘못 맞히면 엉뚱한 화면이 200 으로 나간다. `card` 가 정확히
    // script subtag 모양이라는 것이 이 갈림이 필요한 이유다.
    expect(resolvePathLocale('id-card')).toBeNull();
    expect(normalizeLocaleToken('id-card')).toBe('id');

    expect(resolvePathLocale('not-a-locale')).toBeNull();
    expect(resolvePathLocale('va-123')).toBeNull();
  });

  it('canonical 세그먼트는 redirect 를 요구하지 않는다', () => {
    // 전제: canonical 이 별칭으로 새면 무한 redirect 가 된다.
    for (const locale of locales) {
      expect(resolveLocaleAlias(locale), locale).toBeNull();
    }
  });

  it('대소문자만 다른 canonical 은 canonical 로 보낸다', () => {
    expect(resolveLocaleAlias('KR')).toBe('kr');
    expect(resolveLocaleAlias('En')).toBe('en');
  });
});
