/**
 * 계약 문서가 인용하는 사실을 기계가 대조한다.
 *
 * AGENTS.md §9는 「갱신 시 파일 경로·명령·locale·anchor를 실제 저장소와 대조한다」고
 * 요구하지만 집행 장치가 없어서, 2026-09-03 세션은 그 대조를 전건 손으로 했다. 손으로 한
 * 대조는 그 세션에만 유효하고 다음 커밋에 다시 낡는다. 이 파일이 그 요구의 집행부다.
 *
 * 한계(의도된 best-effort): 백틱 안의 토큰만 본다. 산문에 맨몸으로 적힌 경로는 잡지 않는다.
 * 계약 문서가 인용을 백틱으로 감싸는 것은 이미 전건 지켜지고 있으므로(2026-09-07 실측)
 * 커버리지를 넓히는 대신 오탐 0을 택했다 — 오탐이 나는 가드는 느슨해지고, 느슨해진 가드는
 * 침묵한다.
 */
import {describe, expect, it} from 'vitest';

import {
  backtickedTokens,
  gitRefResolves,
  readRepoFile,
  repoDirExists,
  repoPathExists
} from './helpers/repo';

/** 이 가드가 사실을 대조하는 문서. 규칙을 담은 문서는 전부 여기 있어야 한다. */
const CONTRACT_DOCS = [
  'AGENTS.md',
  '.claude/CLAUDE.md',
  'docs/agent-guides/project-rules.md',
  'docs/agent-guides/verification-commands.md'
] as const;

/** 저장소 루트에서 시작하는 것으로 인정하는 최상위 이름. */
const KNOWN_ROOTS = [
  'src/',
  'docs/',
  'tests/',
  'scripts/',
  'public/',
  '.claude/',
  '.github/',
  '.planning/',
  '.next/',
  'node_modules/',
  'coverage/',
  'dist/',
  'out/',
  'test-results/',
  'playwright-report/'
];

const KNOWN_ROOT_FILES = new Set([
  'AGENTS.md',
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'playwright.config.ts',
  'vitest.config.ts',
  'eslint.config.mjs',
  'postcss.config.mjs',
  'tsconfig.json',
  'tsconfig.tsbuildinfo',
  'next-env.d.ts'
]);

/**
 * 존재를 요구하지 않는 인용과 그 사유. 사유 없는 면제는 두지 않는다 —
 * 사유가 없으면 다음 세션이 그것을 지워도 되는지 판단할 수 없다.
 */
const EXEMPT: Record<string, string> = {
  '.next/': '빌드 산출·비추적. 편집 금지 대상으로 인용될 뿐 존재는 무관하다',
  'coverage/': '빌드 산출·비추적',
  'dist/': '빌드 산출·비추적',
  'out/': '빌드 산출·비추적',
  'test-results/': 'Playwright 산출·비추적',
  'playwright-report/': 'Playwright 산출·비추적',
  'node_modules/': '의존성 설치 산출·비추적',
  'tsconfig.tsbuildinfo': 'typegen 산출·비추적',
  'next-env.d.ts': 'typegen 산출·비추적',
  '.planning/': '세션이 전역 체크포인트 조건을 만족할 때 만든다 — 비어 있는 것이 정상',
  '.planning/STATE.md': '위와 같다(2026-09-03에 docs/archive/로 이관)',
  'tests/e2e/*-snapshots/': 'Playwright 로컬 baseline·비추적(.gitignore)'
};

/** 축약 인용 → 그것이 가리키는 실제 경로. 축약을 앵커해 두어야 대상이 움직일 때 발화한다. */
const ABBREVIATIONS: Record<string, string> = {
  'ds/': 'docs/design/ds/',
  'ds/SYNC.md': 'docs/design/ds/SYNC.md',
  'ds/colors_and_type.css': 'docs/design/ds/colors_and_type.css',
  'preview/catalog-drift.html': 'docs/design/ds/preview/catalog-drift.html',
  '[locale]/layout.tsx': 'src/app/[locale]/layout.tsx'
};

/**
 * 실재하면 계약 위반인 경로. 계약 문서는 「재도입 금지」를 이 이름들로 적으므로, 존재를
 * 요구하는 쪽으로 검사하면 정반대의 판정이 된다 — 부정 인용은 부정 방향으로 집행한다.
 */
const MUST_NOT_EXIST: Record<string, string> = {
  'src/middleware.ts': 'AGENTS.md §3 Single request entry — 단일 진입은 src/proxy.ts 하나다',
  'src/features/landing/test/': 'project-rules.md §Ownership — 정본 test 표면은 src/features/test/**'
};

/** §4 Workspace and branch roles가 이름으로 지목하는 git ref. */
const CITED_GIT_REFS_SECTION = /## 4\. Critical boundaries[\s\S]*?(?=\n## 5\.)/u;

function isPathLike(token: string): boolean {
  if (token.includes(' ')) return false;
  if (token.startsWith('~') || token.startsWith('@') || token.startsWith('/')) return false;
  if (token.includes('{') && !token.includes('}')) return false;
  return /\.(ts|tsx|css|js|mjs|json|md|html|woff2)$/u.test(token) || token.endsWith('/') || token.includes('*');
}

function isRooted(token: string): boolean {
  return KNOWN_ROOTS.some((root) => token.startsWith(root)) || KNOWN_ROOT_FILES.has(token);
}

/** `a/{x,y}.ts` → [`a/x.ts`, `a/y.ts`]. 중괄호가 없으면 그대로 한 건. */
function expandBraces(token: string): string[] {
  const match = /^(.*)\{([^{}]+)\}(.*)$/u.exec(token);
  if (!match) return [token];
  return match[2].split(',').map((member) => `${match[1]}${member.trim()}${match[3]}`);
}

/** 글로브는 `*` 앞의 마지막 `/`까지로 줄인다 — 그 디렉터리의 실재만 요구한다. */
function globToDirectory(token: string): string | null {
  const starAt = token.indexOf('*');
  if (starAt === -1) return null;
  const slashAt = token.lastIndexOf('/', starAt);
  return slashAt === -1 ? null : token.slice(0, slashAt + 1);
}

type Citation = {token: string; target: string; doc: string};

function collectCitations(): Citation[] {
  const citations: Citation[] = [];
  for (const doc of CONTRACT_DOCS) {
    for (const raw of backtickedTokens(readRepoFile(doc))) {
      const token = raw.includes(' §') ? raw.slice(0, raw.indexOf(' §')) : raw;
      if (token.includes('YYYY') || token.includes('<')) continue;
      if (!isPathLike(token)) continue;
      if (token in EXEMPT || token.replace(/\*+$/u, '') in EXEMPT) continue;
      if (token in ABBREVIATIONS) {
        citations.push({token, target: ABBREVIATIONS[token], doc});
        continue;
      }
      if (!isRooted(token)) continue;
      const directory = globToDirectory(token);
      if (directory !== null) {
        if (!(directory in EXEMPT)) citations.push({token, target: directory, doc});
        continue;
      }
      for (const expanded of expandBraces(token)) {
        citations.push({token, target: expanded, doc});
      }
    }
  }
  return citations;
}

describe('계약 문서의 인용은 실제 저장소와 일치한다', () => {
  it('인용된 저장소 경로가 전부 실재한다', () => {
    const missing = collectCitations()
      .filter(({target}) => !(target in MUST_NOT_EXIST))
      .filter(({target}) => (target.endsWith('/') ? !repoDirExists(target) : !repoPathExists(target)))
      .map(({token, target, doc}) => `${doc}: \`${token}\` → ${target}`);

    expect(missing, `계약 문서가 없는 경로를 인용한다:\n${missing.join('\n')}`).toEqual([]);
  });

  it('재도입 금지 경로는 실재하지 않는다', () => {
    const reintroduced = Object.entries(MUST_NOT_EXIST)
      .filter(([target]) => repoPathExists(target))
      .map(([target, reason]) => `${target} — ${reason}`);

    expect(reintroduced, `금지된 파일이 되살아났다:\n${reintroduced.join('\n')}`).toEqual([]);
  });

  it('면제·축약 등재가 전부 살아 있다', () => {
    const cited = new Set(
      CONTRACT_DOCS.flatMap((doc) =>
        backtickedTokens(readRepoFile(doc)).map((raw) =>
          raw.includes(' §') ? raw.slice(0, raw.indexOf(' §')) : raw
        )
      )
    );
    const stale = [
      ...Object.keys(EXEMPT),
      ...Object.keys(ABBREVIATIONS),
      ...Object.keys(MUST_NOT_EXIST)
    ].filter((token) => !cited.has(token) && !cited.has(`${token}*`) && !cited.has(`${token}**`));

    expect(stale, `더 이상 인용되지 않는 등재 — 지워라:\n${stale.join('\n')}`).toEqual([]);
  });
});

describe('계약 문서가 지목하는 절·앵커·명령·ref', () => {
  it('`문서.md §N` 인용이 그 문서의 실재하는 절을 가리킨다', () => {
    const broken: string[] = [];
    for (const doc of CONTRACT_DOCS) {
      const text = readRepoFile(doc);
      for (const raw of backtickedTokens(text)) {
        const at = raw.indexOf(' §');
        if (at === -1) continue;
        const target = raw.slice(0, at);
        if (!target.endsWith('.md') || !isRooted(target) || !repoPathExists(target)) continue;
        const body = readRepoFile(target);
        for (const section of [...raw.slice(at).matchAll(/§\s*(\d+(?:\.\d+)*)/gu)].map((m) => m[1])) {
          const depth = section.split('.').length;
          const heading = new RegExp(`^#{${depth + 1}}\\s+${section.replace(/\./gu, '\\.')}[.\\s]`, 'mu');
          if (!heading.test(body)) broken.push(`${doc}: \`${raw}\` → ${target} §${section}`);
        }
      }
    }

    expect(broken, `없는 절을 가리킨다:\n${broken.join('\n')}`).toEqual([]);
  });

  it('`가이드.md §Anchor` 인용이 그 문서의 실재하는 앵커를 가리킨다', () => {
    const guides: Record<string, string> = {
      'project-rules.md': 'docs/agent-guides/project-rules.md',
      'verification-commands.md': 'docs/agent-guides/verification-commands.md'
    };
    const broken: string[] = [];
    for (const doc of CONTRACT_DOCS) {
      for (const raw of backtickedTokens(readRepoFile(doc))) {
        const match = /^([a-z-]+\.md) §([A-Za-z][\w-]*)$/u.exec(raw);
        if (!match || !(match[1] in guides)) continue;
        const body = readRepoFile(guides[match[1]]);
        if (!body.includes(`{#${match[2]}}`)) broken.push(`${doc}: \`${raw}\``);
      }
    }

    expect(broken.length, `없는 앵커를 가리킨다:\n${broken.join('\n')}`).toBe(0);
    expect(broken).toEqual([]);
  });

  it('인용된 npm script가 package.json에 있다', () => {
    const scripts = new Set(
      Object.keys((JSON.parse(readRepoFile('package.json')) as {scripts: Record<string, string>}).scripts)
    );
    const cited = new Set<string>();
    for (const doc of CONTRACT_DOCS) {
      for (const match of readRepoFile(doc).matchAll(/\bnpm run ([a-z][\w:-]*)/gu)) {
        cited.add(match[1]);
      }
    }
    const missing = [...cited].filter((name) => !scripts.has(name)).sort();

    expect(missing, `없는 npm script를 부른다:\n${missing.join(', ')}`).toEqual([]);
  });

  it('§4가 지목하는 git ref가 이 체크아웃에서 해석된다', () => {
    const section = CITED_GIT_REFS_SECTION.exec(readRepoFile('AGENTS.md'));
    expect(section, 'AGENTS.md §4를 찾지 못했다 — 절 번호가 바뀌었으면 이 가드를 함께 고쳐라').not.toBeNull();

    const refs = [
      ...new Set(
        backtickedTokens(section![0]).filter(
          (token) => /^(main|legacy\/|anchor\/|checkpoint\/)/u.test(token) && !token.includes('*')
        )
      )
    ];
    expect(refs.length, '§4 브랜치 역할표에서 ref를 하나도 찾지 못했다').toBeGreaterThan(0);

    const unresolved = refs.filter((ref) => !gitRefResolves(ref));
    expect(unresolved, `§4가 이 체크아웃에 없는 ref를 계약으로 적는다:\n${unresolved.join('\n')}`).toEqual([]);
  });
});
