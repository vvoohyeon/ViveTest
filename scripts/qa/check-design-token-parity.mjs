import {createChecker, read} from './_utils.mjs';

const {fail, finish} = createChecker();

/* 같은 시각 개념이 네 곳에 적혀 있는데 어느 둘도 자동으로 대조되지 않았다. 2026-09-07
   중간 점검이 손으로 찾은 표류가 여섯 건이고 그중 하나는 열다섯 wave 를 살아남았다.
   `BQ-38` 은 그래서 "이름 추가는 허용, `design.md` 값 변경은 금지 — 달라져야 하면 쓰기
   전에 등재한다"를 규칙으로 세웠지만, 그 등재가 산문 안에 있어 지키는 것은 주의력뿐이었다.

   이 검사는 네 가지를 본다.
     1. `design.md` §5 의 css fence 대 `colors_and_type.css` 의 **light `:root`** — 이름이
        겹치는 토큰만. 면제 목록은 스크립트 상수가 아니라 `decision-register.md` 의
        `ds-parity-allowlist` 표다. 등재되지 않은 이탈도, 더 이상 이탈이 아닌 등재도 실패다.
     2. `design.md` §5.11 대 §8 — 같은 문서가 모션 토큰을 두 번 적고, 두 사본이 함께 낡은
        전력이 있다.
     3. `ds/README.md` 의 *Visual foundations* — 값을 산문으로 되풀이하지 않는다. hex 금지,
        남은 수치 리터럴은 `<!-- ds-literal: kind -->` 표식을 단다.
     4. 그 절이 이름으로 부르는 토큰이 실제로 `colors_and_type.css` 에 있는가 — 산문 속
        오타난 토큰 이름은 아무 데서도 붉지 않는다.

   **globals.css 는 보지 않는다.** 그 대조는 `tests/unit/design-tokens-dark-parity.test.ts`
   의 `@mirror-*` 가드가 이미 갖고 있고, 같은 규칙을 두 곳에 두면 표류한다.

   **module CSS 대 카탈로그 별칭 비교도 넣지 않았다.** 계획서는 21 개의 scoped
   `--normal-*`/`--expanded-*` 가 하드코딩 hex 라는 전제로 그것을 요구했는데, theme cut
   (`986a956`) 이 21 개를 전부 `var()` 사슬로 바꿔 놓았다(2026-09-11 확인: 하드코딩 0 건).
   사슬은 사본이 아니므로 대조할 두 값이 없다. */

const DESIGN_DOC = 'docs/design/design.md';
const CATALOG_CSS = 'docs/design/ds/colors_and_type.css';
const REGISTER = 'docs/decision-register.md';
const BUNDLE_README = 'docs/design/ds/README.md';

const ALLOWLIST_ANCHOR = '<!-- ds-parity-allowlist -->';
const README_SECTION = '## Visual foundations';
const LITERAL_MARKER = /<!--\s*ds-literal:\s*([a-z-]+)\s*-->/u;
const LITERAL_KINDS = new Set(['contrast', 'ladder', 'gutter', 'component-spec']);
const VALUE_LITERAL = /\d+(?:\.\d+)?(?:px|ms)\b/u;
const HEX_LITERAL = /#[0-9a-fA-F]{3,8}\b/u;
const MAX_CHAIN_DEPTH = 6;

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//gu, '');
}

function normalizeValue(value) {
  return value.toLowerCase().replace(/\s+/gu, '');
}

/** 최상위 블록만 훑어 selector 가 조건을 만족하는 블록의 커스텀 프로퍼티를 모은다. */
function collectScopedCustomProperties(css, matchesSelector) {
  const source = stripCssComments(css);
  const declarations = new Map();
  let depth = 0;
  let selectorStart = 0;
  let blockStart = 0;
  let selector = '';

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (char === '{') {
      if (depth === 0) {
        selector = source.slice(selectorStart, index).trim();
        blockStart = index + 1;
      }
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        if (matchesSelector(selector)) {
          const body = source.slice(blockStart, index);
          for (const match of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/giu)) {
            declarations.set(match[1], match[2].trim());
          }
        }
        selectorStart = index + 1;
      }
    }
  }

  return declarations;
}

function resolveChain(name, declarations, depth = 0) {
  const raw = declarations.get(name);
  if (raw === undefined || depth > MAX_CHAIN_DEPTH) {
    return raw;
  }

  const reference = raw.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/iu);
  return reference ? resolveChain(reference[1], declarations, depth + 1) : raw;
}

/** `## <n>. ` 부터 다음 같은 깊이 제목까지의 줄. */
function sectionLines(markdown, startPattern, endPattern) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => startPattern.test(line));
  if (start < 0) {
    return null;
  }
  const relativeEnd = lines.slice(start + 1).findIndex((line) => endPattern.test(line));
  return lines.slice(start, relativeEnd < 0 ? lines.length : start + 1 + relativeEnd);
}

function collectFencedCustomProperties(lines) {
  const declarations = new Map();
  let insideCssFence = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      insideCssFence = line.startsWith('```css');
      continue;
    }
    if (!insideCssFence) {
      continue;
    }
    const match = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/u);
    if (match) {
      declarations.set(match[1], match[2].trim());
    }
  }

  return declarations;
}

function readAllowlist(register) {
  const anchorIndex = register.indexOf(ALLOWLIST_ANCHOR);
  if (anchorIndex < 0) {
    fail(`${REGISTER} must carry the ${ALLOWLIST_ANCHOR} anchor above the parity allow-list table.`);
    return new Map();
  }

  const entries = new Map();
  const lines = register.slice(anchorIndex).split('\n');

  for (const line of lines.slice(1)) {
    if (!line.startsWith('|')) {
      if (entries.size > 0) {
        break;
      }
      continue;
    }
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 4) {
      continue;
    }
    const token = cells[0].match(/`(--[a-z0-9-]+)`/u);
    if (!token) {
      continue;
    }
    entries.set(token[1], {
      design: (cells[1].match(/`([^`]+)`/u) ?? [, cells[1]])[1],
      catalog: (cells[2].match(/`([^`]+)`/u) ?? [, cells[2]])[1]
    });
  }

  return entries;
}

const designDoc = read(DESIGN_DOC);
const catalogCss = read(CATALOG_CSS);
const register = read(REGISTER);
const bundleReadme = read(BUNDLE_README);

// ---------------------------------------------------------------- 1. §5 ↔ 카탈로그
const designSection5 = sectionLines(designDoc, /^## 5\. /u, /^## 6\. /u);
if (!designSection5) {
  fail(`${DESIGN_DOC} must contain a "## 5." token section.`);
}

const designTokens = designSection5 ? collectFencedCustomProperties(designSection5) : new Map();
const catalogTokens = collectScopedCustomProperties(catalogCss, (selector) => selector === ':root');
const allowlist = readAllowlist(register);

if (designTokens.size === 0) {
  fail(`${DESIGN_DOC} §5 declared no tokens — the fence parser found nothing to compare.`);
}
if (catalogTokens.size === 0) {
  fail(`${CATALOG_CSS} declared no tokens under a bare ":root" selector.`);
}

const sharedNames = [...designTokens.keys()].filter((name) => catalogTokens.has(name));
const divergent = new Set();

for (const name of sharedNames) {
  const designValue = normalizeValue(designTokens.get(name));
  const catalogValue = normalizeValue(resolveChain(name, catalogTokens) ?? '');

  if (designValue === catalogValue) {
    continue;
  }

  divergent.add(name);

  if (!allowlist.has(name)) {
    fail(
      `${name} diverges without a registered deviation: ${DESIGN_DOC} §5 says "${designTokens.get(name)}", ` +
        `${CATALOG_CSS} resolves to "${resolveChain(name, catalogTokens)}". ` +
        `Register it under the ${ALLOWLIST_ANCHOR} table in ${REGISTER} before writing the divergence (BQ-38).`
    );
  }
}

for (const name of allowlist.keys()) {
  if (!designTokens.has(name)) {
    fail(`${name} is registered as a deviation but ${DESIGN_DOC} §5 no longer declares it — remove the stale row.`);
    continue;
  }
  if (!divergent.has(name)) {
    fail(
      `${name} is registered as a deviation but the two sides now agree — remove the stale row, ` +
        'otherwise it silently exempts the next real divergence.'
    );
  }
}

// ------------------------------------------------------- 2. §5.11 ↔ §8 (같은 문서, 두 사본)
const motionTokens = designSection5
  ? collectFencedCustomProperties(sectionLines(designSection5.join('\n'), /^### 5\.11 /u, /^### 5\.12 /u) ?? [])
  : new Map();
const motionGuidance = sectionLines(designDoc, /^## 8\. /u, /^## 9\. /u);

if (motionTokens.size === 0) {
  fail(`${DESIGN_DOC} §5.11 declared no motion tokens.`);
}
if (!motionGuidance) {
  fail(`${DESIGN_DOC} must contain a "## 8." motion section.`);
}

const guidanceText = (motionGuidance ?? []).join('\n');
let motionComparisons = 0;

for (const [name, value] of motionTokens) {
  const restated = guidanceText.match(new RegExp(`\`${name}:\\s*([^\`]+)\``, 'u'));
  if (!restated) {
    continue;
  }
  motionComparisons += 1;
  if (normalizeValue(restated[1]) !== normalizeValue(value)) {
    fail(
      `${name} is stated twice in ${DESIGN_DOC} and the copies disagree: §5.11 "${value}" vs §8 "${restated[1].trim()}".`
    );
  }
}

if (motionComparisons === 0) {
  fail(`${DESIGN_DOC} §8 restated none of §5.11's motion tokens — the second-copy check compared nothing.`);
}

// ------------------------------------------------ 3·4. 번들 README 의 Visual foundations
const foundations = sectionLines(bundleReadme, new RegExp(`^${README_SECTION}$`, 'u'), /^## /u);
if (!foundations) {
  fail(`${BUNDLE_README} must contain a "${README_SECTION}" section.`);
}

let markedLiteralLines = 0;
let namedTokenReferences = 0;

for (const line of foundations ?? []) {
  const hex = line.match(HEX_LITERAL);
  if (hex) {
    fail(
      `${BUNDLE_README} "${README_SECTION}" restates a colour literal (${hex[0]}). ` +
        'Name the token instead — the swatch cards render the value and never go stale.'
    );
  }

  for (const reference of line.matchAll(/`(--[a-z0-9-]+)`/gu)) {
    namedTokenReferences += 1;
    if (!catalogTokens.has(reference[1])) {
      fail(`${BUNDLE_README} names ${reference[1]}, which ${CATALOG_CSS} does not declare under ":root".`);
    }
  }

  if (!VALUE_LITERAL.test(line)) {
    continue;
  }

  const marker = line.match(LITERAL_MARKER);
  if (!marker) {
    fail(
      `${BUNDLE_README} "${README_SECTION}" carries a numeric literal with no marker: ${line.trim().slice(0, 120)}. ` +
        'Either name the token instead, or mark the line <!-- ds-literal: kind --> when the number itself teaches something.'
    );
    continue;
  }

  markedLiteralLines += 1;
  if (!LITERAL_KINDS.has(marker[1])) {
    fail(
      `${BUNDLE_README} marks a literal with unknown kind "${marker[1]}". ` +
        `Known kinds: ${[...LITERAL_KINDS].join(', ')}.`
    );
  }
}

console.log(
  `Design token parity: compared ${sharedNames.length} shared tokens ` +
    `(${designTokens.size} in ${DESIGN_DOC} §5, ${catalogTokens.size} in ${CATALOG_CSS} :root), ` +
    `${motionComparisons} motion tokens restated in §8, ` +
    `${namedTokenReferences} token names and ${markedLiteralLines} marked literals in the bundle README.`
);

finish('Design token parity');
