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

import {readdirSync} from 'node:fs';
import path from 'node:path';

import {readRepoFile, REPO_ROOT} from './helpers/repo';

const TOKENS_PATH = 'docs/design/ds/colors_and_type.css';

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
 * 캡션 잉크는 `--muted-aa` 를 쓴다.
 *
 * `--muted`(=`--fg3`)는 캔버스에서 4.06:1, `--muted-soft`(=`--fg4`)는 2.43:1 로 둘 다 AA 미만이다
 * (BQ-29). 그런데 표본들이 그 둘을 캡션·주석·표 본문의 글자색으로 쓰고 있었고, 2026-09-07 에
 * 렌더된 텍스트/배경 쌍을 전수 측정했을 때 **418 건 중 415 건이 이 한 가지 패턴**이었다.
 *
 * 렌더링이 필요한 검사라 vitest 로는 대비를 잴 수 없다. 대신 원인이 된 패턴 하나를 정적으로
 * 막는다 — 표본이 `--fg3`·`--fg4`·`--muted`·`--muted-soft` 를 **글자색으로** 선언하지 않는 것.
 * 배경·테두리·스와치로 쓰는 것은 그대로 허용한다.
 */
describe('design specimens — caption ink clears AA', () => {
  const previewDir = path.join(REPO_ROOT, 'docs/design/ds/preview');
  const files = readdirSync(previewDir).filter((name) => name.endsWith('.html'));

  it('표본이 하나 이상 있다', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files)('%s 가 AA 미만 토큰을 글자색으로 쓰지 않는다', (file) => {
    const html = readRepoFile(`docs/design/ds/preview/${file}`);
    const offenders = [
      ...html.matchAll(/color:\s*var\((--fg3|--fg4|--muted|--muted-soft)\)/gu)
    ].map((match) => match[1]);

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
    {name: 'dark', runtimeBlock: () => sentinel(runtime, 'dark'), designOpener: "\n[data-theme='dark'] {"}
  ] as const;

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

  it('미러가 비어 있지 않다', () => {
    expect(declarations(sentinel(runtime, 'light')).length).toBeGreaterThan(80);
    expect(declarations(sentinel(runtime, 'dark')).length).toBeGreaterThan(30);
  });
});
