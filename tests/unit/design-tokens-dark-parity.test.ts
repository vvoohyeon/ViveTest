/**
 * 다크 테마 값은 두 셀렉터가 갖는다 — `:root[data-theme='dark']` 와
 * `@media (prefers-color-scheme: dark)` 안의 `:root:not([data-theme='light'])`.
 * 제품은 앞의 것을 쓰고(`public/theme-bootstrap.js` 가 하이드레이션 전에 `data-theme` 를
 * 찍는다), 뒤의 것은 그 부트스트랩 없이 이 파일을 렌더하는 쪽 — 이 번들의 표본들과 Claude
 * Design 캔버스 — 을 위한 것이다.
 *
 * CSS 에는 믹스인이 없으므로 두 블록은 같은 선언을 두 번 쓴다. 사본이 둘이면 표류하고,
 * 표류는 조용하다 — 한쪽만 고친 세션은 자기 화면에서 고쳐진 것을 보고 끝낸다. `SYNC.md` 가
 * 이미 「값을 글로 다시 적어서 조용히 어긋나는 파일 4종」을 세고 있고, 이 테스트는 다섯 번째가
 * 생기지 않게 한다.
 *
 * 주석·공백은 비교하지 않는다. 두 블록이 **선언 집합으로서** 같기만 하면 된다.
 */
import {describe, expect, it} from 'vitest';

import {readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';

import {readRepoFile, REPO_ROOT} from './helpers/repo';

const TOKENS_PATH = 'docs/design/ds/colors_and_type.css';

/**
 * 커스텀 프로퍼티를 읽는 런타임 파일 전부 — `src/**` 와 테마 부트스트랩 하나.
 * 부트스트랩은 하이드레이션 전에 도는 독립 스크립트라 `src/` 밖에 있다.
 */
function runtimeSourceTexts(): string[] {
  const files: string[] = [];
  const walk = (absolute: string) => {
    for (const entry of readdirSync(absolute)) {
      const next = path.join(absolute, entry);
      if (statSync(next).isDirectory()) walk(next);
      else files.push(next);
    }
  };

  walk(path.join(REPO_ROOT, 'src'));
  files.push(path.join(REPO_ROOT, 'src/features/gnb/theme-bootstrap-source.ts'));
  return files.map((absolute) => readFileSync(absolute, 'utf8'));
}

/**
 * 블록 본문에서 `--name: value;` 선언만 순서대로 뽑는다.
 *
 * 주석을 먼저 걷어낸다. 이 파일의 주석에는 `catalog --surface-soft: unavailable card` 처럼
 * **이름과 콜론이 함께** 들어가는 문장이 있고, 걷어내지 않으면 정규식이 주석 안에서 선언을
 * 하나 더 찾은 뒤 다음 `;` 까지 삼켜 **바로 뒤의 진짜 선언을 통째로 잃는다**. 2026-09-07 측정:
 * `:root` 199 건 중 `--warm-25`·`--warm-100`·`--warm-150`·`--warm-300`·`--warm-400`·`--warm-600`
 * 등 12 건이 그렇게 사라지고 있었다. 두 다크 블록은 같은 방식으로 망가져 비교가 우연히
 * 통과했을 뿐이며, 다크가 그 12 개 중 하나를 선언하는 순간 거짓 실패로 바뀐다.
 */
function declarations(body: string): string[] {
  const withoutComments = body.replace(/\/\*[\s\S]*?\*\//gu, '');
  return [...withoutComments.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gu)].map(
    (match) => `${match[1]}: ${match[2].replace(/\s+/gu, ' ').trim()}`
  );
}

function extract(css: string, opener: string): string {
  const start = css.indexOf(opener);
  expect(start, `블록을 찾지 못했다: ${opener}`).toBeGreaterThan(-1);

  let depth = 0;
  for (let index = start + opener.length - 1; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start + opener.length, index);
    }
  }

  throw new Error(`블록이 닫히지 않았다: ${opener}`);
}

/**
 * `:root` 의 커스텀 프로퍼티를 이름 -> 최종 hex 로 푼다. `var(--a)` 사슬을 따라가고,
 * 사슬이 hex 로 끝나지 않으면(`color-mix()`·키워드) `null` 을 돌려준다 — 잴 수 없는 값을
 * 통과로도 실패로도 읽지 않기 위해서다.
 */
function resolveLightTokens(): Map<string, string | null> {
  const rootBody = extract(readRepoFile(TOKENS_PATH), ':root {');
  const raw = new Map<string, string>();

  for (const line of declarations(rootBody)) {
    const [name, ...rest] = line.split(':');
    raw.set(name.trim(), rest.join(':').trim().replace(/;$/u, '').trim());
  }

  const resolved = new Map<string, string | null>();

  const walk = (name: string, seen: Set<string>): string | null => {
    const value = raw.get(name);
    if (value === undefined || seen.has(name)) return null;

    if (/^#[0-9a-f]{6}$/iu.test(value)) return value.toLowerCase();

    const reference = /^var\(\s*(--[\w-]+)\s*\)$/u.exec(value);
    return reference ? walk(reference[1], new Set([...seen, name])) : null;
  };

  for (const name of raw.keys()) resolved.set(name, walk(name, new Set()));
  return resolved;
}

/** WCAG 상대 휘도. */
function luminance(hex: string): number {
  return [0, 2, 4]
    .map((offset) => parseInt(hex.slice(1 + offset, 3 + offset), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + [0.2126, 0.7152, 0.0722][index] * channel, 0);
}

function contrast(foreground: string, background: string): number {
  const [a, b] = [luminance(foreground), luminance(background)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * 캡션 잉크는 AA 를 넘는 역할을 쓴다.
 *
 * 2026-09-07 에 렌더된 텍스트/배경 쌍을 전수 측정했을 때 **418 건 중 415 건이 한 가지
 * 패턴**이었다 — 표본이 흐린 글자색 역할을 캡션·주석·표 본문에 쓴 것. 렌더링이 필요한
 * 검사라 vitest 로 대비를 **관측**할 수는 없지만, 역할이 어떤 hex 로 풀리는지는 정적으로
 * 계산되므로 **판정**은 할 수 있다.
 *
 * 그래서 금지 목록을 손으로 적지 않는다. 후보 역할들을 `colors_and_type.css` 에서 풀어
 * 캔버스 위 대비를 재고, **4.5:1 미만인 것만** 금지한다. 역할이 교정되면 금지가 스스로
 * 풀리고(D-20 에서 `--fg3` 가 그랬다) 역행하면 스스로 돌아온다 — 목록은 소유자 명단이
 * 아니라 입력이다. 배경·테두리·스와치로 쓰는 것은 그대로 허용한다.
 */
describe('design specimens — caption ink clears AA', () => {
  const previewDir = path.join(REPO_ROOT, 'docs/design/ds/preview');
  const files = readdirSync(previewDir).filter((name) => name.endsWith('.html'));
  const tokens = resolveLightTokens();

  // 흐린 글자 역할의 후보. 이 넷 중 **무엇이** 금지되는지는 아래에서 측정이 정한다.
  const MUTED_TEXT_ROLES = ['--fg3', '--fg4', '--muted', '--muted-soft'];
  // 캔버스는 표본의 페이지 바닥이고, 2026-09-07 감사가 4.06:1 을 잰 그 지면이다.
  const canvas = tokens.get('--canvas');

  const failing = MUTED_TEXT_ROLES.filter((role) => {
    const ink = tokens.get(role);
    return ink !== null && ink !== undefined && canvas != null && contrast(ink, canvas) < 4.5;
  });

  it('표본이 하나 이상 있다', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  // 해석기가 조용히 망가지면 금지 집합이 비고, 빈 집합은 모든 표본을 통과시킨다. 그 통과는
  // 「위반이 없다」가 아니라 「검사가 없다」이므로, 검사가 살아 있다는 것을 따로 고정한다.
  it('금지 집합이 측정으로 채워진다 — 비면 검사가 아니라 해석기가 죽은 것이다', () => {
    expect(canvas).toMatch(/^#[0-9a-f]{6}$/u);
    expect(MUTED_TEXT_ROLES.every((role) => tokens.get(role) != null)).toBe(true);
    expect(failing.length).toBeGreaterThan(0);
  });

  it.each(files)('%s 가 AA 미만 역할을 글자색으로 쓰지 않는다', (file) => {
    const html = readRepoFile(`docs/design/ds/preview/${file}`);
    const offenders = [...html.matchAll(/color:\s*var\((--[\w-]+)\)/gu)]
      .map((match) => match[1])
      .filter((name) => failing.includes(name));

    expect(offenders).toEqual([]);
  });
});

describe('design tokens — dark theme parity', () => {
  const css = readRepoFile(TOKENS_PATH);
  const explicit = declarations(extract(css, "\n[data-theme='dark'] {"));
  const preference = declarations(extract(css, ":root:not([data-theme='light']) {"));

  it('두 다크 블록이 같은 선언 집합을 갖는다', () => {
    expect(preference).toEqual(explicit);
  });

  it('다크 블록이 비어 있지 않다', () => {
    expect(explicit.length).toBeGreaterThan(40);
  });

  it('선호도 블록은 명시적 light 선택에 지지 않도록 :not([data-theme=\'light\'])로 좁혀져 있다', () => {
    const media = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
    expect(media).toContain(":root:not([data-theme='light'])");
  });

  it('다크가 정의하는 이름은 전부 light 에도 정의돼 있다 — 다크는 레이어 2의 remap 이지 두 번째 팔레트가 아니다', () => {
    const rootBody = extract(css, ':root {');
    const lightNames = new Set(declarations(rootBody).map((line) => line.split(':')[0]));
    const darkOnly = explicit
      .map((line) => line.split(':')[0])
      .filter((name) => !lightNames.has(name));

    expect(darkOnly).toEqual([]);
  });
});

/**
 * 런타임 토큰 계층은 설계 정의의 **거울**이다.
 *
 * `BQ-34` 는 "§5를 공유 토큰 파일로 추출해 코드와 하네스가 같은 정의를 소비"하기로 했고,
 * 코드 쪽 소비는 wave 16 = theme cut 으로 이월돼 2026-09-07 에 실행됐다. 다만 `AGENTS.md` §3 은
 * Tailwind 토큰/base 를 `src/app/globals.css` **한 곳**으로 고정하고 분할을 금지하며, §2 는
 * `docs/design/ds/` 를 「런타임이 소비하지 않는 문서 계층」으로 선언한다. 그래서 런타임이
 * 그 파일을 import 하는 대신 필요한 토큰만 **베껴 온다**.
 *
 * 사본이 둘이면 표류하고, 표류는 조용하다 — 한쪽만 고친 세션은 자기 화면에서 고쳐진 것을
 * 보고 끝낸다. `@mirror-begin` / `@mirror-end` 사이의 모든 선언이 설계 정의와 값까지 같아야
 * 하며, 다르면 여기서 빌드가 멈춘다. 어느 쪽을 고칠지는 정해져 있다: **설계 정의를 고치고
 * 다시 베낀다.** 저장소가 정의를 소유하고 Claude Design 이 그것을 소비한다(`SYNC.md`).
 */
describe('runtime token layer mirrors the design definition', () => {
  const runtime = readRepoFile('src/app/globals.css');
  const design = readRepoFile(TOKENS_PATH);

  function sentinel(css: string, name: string): string {
    const start = css.indexOf(`/* @mirror-begin ${name} */`);
    const end = css.indexOf(`/* @mirror-end ${name} */`);
    expect(start, `@mirror-begin ${name} 이 없다`).toBeGreaterThan(-1);
    expect(end, `@mirror-end ${name} 이 없다`).toBeGreaterThan(start);
    return css.slice(start, end);
  }

  const cases = [
    {name: 'light', runtimeBlock: () => sentinel(runtime, 'light'), designOpener: ':root {'},
    {name: 'dark', runtimeBlock: () => sentinel(runtime, 'dark'), designOpener: "\n[data-theme='dark'] {"},
    // 세 번째 열. 타이포가 뷰포트 축을 가지면서 설계 정의에 모바일 블록이 생겼고, 그것도
    // 사본이 둘이므로 같은 이유로 같은 대조가 필요하다 — 미러 쌍을 늘리지 않고 이 구간을
    // 그냥 두면 모바일 값만 조용히 표류한다.
    {
      name: 'mobile-type',
      runtimeBlock: () => sentinel(runtime, 'mobile-type'),
      designOpener: '@media (max-width: 767px) {'
    }
  ] as const;

  // D-21. specimen 은 폰을 **상자**로 그리므로 위 미디어 쿼리가 발동하지 않고, 그래서 같은
  // 열을 `.vt-phone` 으로 한 번 더 적었다. CSS 는 선언 목록을 미디어 쿼리와 클래스가 나눠
  // 갖게 할 수 없고, 둘을 `--h1-mobile` 같은 간접 참조로 잇는 대안은 그 간접을 **제품의**
  // 토큰 층에 집어넣는다 — specimen 을 위해. 그래서 사본을 두되 여기서 붙든다.
  it('설계 정의 안에서 모바일 열과 `.vt-phone` 이 이름과 값까지 같다', () => {
    const toMap = (body: string) =>
      new Map(
        declarations(body).map((line) => {
          const [name, ...rest] = line.split(':');
          return [name.trim(), rest.join(':').trim()];
        })
      );

    const byQuery = toMap(extract(design, '@media (max-width: 767px) {'));
    const byClass = toMap(extract(design, '.vt-phone {'));

    expect(byQuery.size, '전제: 모바일 열이 비면 아래 비교가 공허하다').toBeGreaterThan(0);
    expect(
      Object.fromEntries(byClass),
      '`.vt-phone` 이 모바일 열과 갈렸다 — 둘은 같은 열이고, 한쪽만 고치면 상자 안의 폰이 조용히 다른 활자를 그린다'
    ).toEqual(Object.fromEntries(byQuery));
  });

  it.each(cases)('$name 미러가 설계 정의와 값까지 일치한다', ({runtimeBlock, designOpener}) => {
    const mirrored = new Map(
      declarations(runtimeBlock()).map((line) => {
        const [name, ...rest] = line.split(':');
        return [name.trim(), rest.join(':').trim()];
      })
    );
    const authoritative = new Map(
      declarations(extract(design, designOpener)).map((line) => {
        const [name, ...rest] = line.split(':');
        return [name.trim(), rest.join(':').trim()];
      })
    );

    const drifted: string[] = [];
    const absent: string[] = [];
    for (const [name, value] of mirrored) {
      if (name === 'color-scheme') continue;
      if (!authoritative.has(name)) absent.push(name);
      else if (authoritative.get(name) !== value) {
        drifted.push(`${name}: 런타임 '${value}' ≠ 설계 '${authoritative.get(name)}'`);
      }
    }

    expect(absent, `런타임이 설계 정의에 없는 이름을 미러 구간에 넣었다:\n${absent.join('\n')}`).toEqual([]);
    expect(drifted, `미러가 표류했다 — 설계 정의를 고치고 다시 베껴라:\n${drifted.join('\n')}`).toEqual([]);
  });

  /**
   * 하한은 전멸 방지용 눈금이지 계약이 아니다.
   *
   * 종전 값 80·30 은 theme cut 직후의 개체수(113·49)에서 나온 스모크 상수였고, 소비자 없는
   * 46 개를 걷어내면서 light 가 79 로 내려갔다. 개체수에서 유도된 숫자는 개체수와 함께
   * 움직여야 하지만, 숫자를 낮추는 것으로 끝내면 이 파일은 앞으로도 「무엇이 몇 개여야
   * 하는가」를 모른다. 그래서 하한은 눈금으로만 남기고, 실제 불변식 둘을 아래에 세운다.
   */
  it('미러가 비어 있지 않다', () => {
    expect(declarations(sentinel(runtime, 'light')).length).toBeGreaterThan(60);
    expect(declarations(sentinel(runtime, 'dark')).length).toBeGreaterThan(30);
  });

  /**
   * 이 파일이 선언하는 이름은 전부 소비자를 갖는다.
   *
   * 머리말이 "런타임이 실제로 소비하는 이름만 미러한다"고 적지만 그것을 지키는 것은 지금까지
   * 사람의 주의뿐이었고, 소비자 없는 커스텀 프로퍼티는 아무 렌더링에도 영향을 주지 않으므로
   * **어떤 게이트에도 나타나지 않는다.** 2026-09-09 전수 조사에서 166 개 중 46 개가 그랬다.
   * 죽은 채로 살아 있는 이름은 다음 세션에게 「이건 쓰이는 값」으로 읽히고, 그 위에서 내린
   * 판단은 조용히 틀린다.
   *
   * 미러 구간만이 아니라 파일 전체를 본다 — 죽은 무게에는 출처가 상관없다. globals.css 자신도
   * 소비자로 친다: `--warm-700` 처럼 오직 다른 토큰이 읽는 램프 단계가 있기 때문이다.
   */
  it('globals.css 가 선언하는 이름은 전부 런타임 소비자를 갖는다', () => {
    const sources = runtimeSourceTexts();
    const declared = [...new Set(declarations(runtime).map((line) => line.split(':')[0].trim()))];
    const unread = declared.filter(
      (name) => !sources.some((text) => new RegExp(`var\\(\\s*${name}\\s*[,)]`, 'u').test(text))
    );

    expect(unread, `읽는 곳이 없는 토큰이 남아 있다:\n${unread.join('\n')}`).toEqual([]);
  });

  /**
   * 반대 방향 — 런타임이 읽는 이름은 전부 어딘가에 선언돼 있다.
   *
   * 선언 없는 `var(--x)` 는 오류가 아니라 **빈 값**이고, 그 속성은 조용히 초기값으로 돌아간다
   * (L10 이 기록한 실패 모양과 같다). 미러가 통째로 잘려도 위의 검사는 진공으로 통과하므로
   * 잘림을 잡는 것은 이 방향이다. 모듈 지역 변수와 TSX 인라인 style 로 넘기는 이름도 선언으로
   * 친다 — 선언 위치가 아니라 「해석되는가」가 문제다.
   */
  it('런타임이 읽는 이름은 전부 선언돼 있다', () => {
    const sources = runtimeSourceTexts();
    const declared = new Set<string>();
    for (const text of sources) {
      for (const match of text.replace(/\/\*[\s\S]*?\*\//gu, '').matchAll(/(--[a-z0-9-]+)\s*:/gu)) {
        declared.add(match[1]);
      }
      for (const match of text.matchAll(/['"](--[a-z0-9-]+)['"]\s*:/gu)) {
        declared.add(match[1]);
      }
    }

    const unresolved = [
      ...new Set(sources.flatMap((text) => [...text.matchAll(/var\(\s*(--[a-z0-9-]+)/gu)].map((m) => m[1])))
    ].filter((name) => !declared.has(name));

    expect(unresolved, `선언 없는 참조가 있다:\n${unresolved.join('\n')}`).toEqual([]);
  });
});
