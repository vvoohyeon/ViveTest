import {execFileSync} from 'node:child_process';
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** 저장소 루트. 테스트 파일 위치에서 유도하므로 cwd에 의존하지 않는다. */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

/**
 * `root` 아래 파일 전부를 저장소 상대 경로로 돌려준다. `extensions` 를 주면 그것만 남긴다.
 *
 * **소유자 허용목록 대신 쓴다.** 「이 파일 목록만 본다」 형태의 가드는 목록 **밖**에 생긴
 * 같은 결함을 구조적으로 보지 못한다 — 가드의 규칙은 사건의 모양이 아니라 고장의 조건으로
 * 쓴다(`docs/LESSONS_LEARNED.md` L30). 전수를 훑고 발견된 것 전부에 규칙을 묻는 쪽이
 * 목록을 손보는 쪽보다 싸다.
 */
export function walkRepoFiles(root: string, extensions?: readonly string[]): string[] {
  const absolute = path.join(REPO_ROOT, root);
  if (!existsSync(absolute)) {
    return [];
  }

  const found: string[] = [];
  for (const entry of readdirSync(absolute, {withFileTypes: true})) {
    const relative = `${root}/${entry.name}`;
    if (entry.isDirectory()) {
      found.push(...walkRepoFiles(relative, extensions));
      continue;
    }
    if (extensions && !extensions.some((extension) => entry.name.endsWith(extension))) {
      continue;
    }
    found.push(relative);
  }

  return found.sort();
}

export function repoPathExists(relativePath: string): boolean {
  return existsSync(path.join(REPO_ROOT, relativePath));
}

export function repoDirExists(relativePath: string): boolean {
  const absolute = path.join(REPO_ROOT, relativePath);
  return existsSync(absolute) && statSync(absolute).isDirectory();
}

/** 백틱으로 감싼 토큰 전부. 계약 문서의 인용은 예외 없이 백틱을 쓴다. */
export function backtickedTokens(markdown: string): string[] {
  return [...markdown.matchAll(/`([^`\n]+)`/gu)].map((match) => match[1]);
}

/**
 * git ref가 이 체크아웃에서 해석되는지. 원격 추적본(`origin/<ref>`)도 해석으로 친다 —
 * 갓 만든 clone에는 로컬 브랜치가 없고 원격 추적본만 있기 때문이다.
 */
export function gitRefResolves(ref: string): boolean {
  for (const candidate of [ref, `origin/${ref}`]) {
    try {
      execFileSync('git', ['rev-parse', '--verify', '--quiet', `${candidate}^{commit}`], {
        cwd: REPO_ROOT,
        stdio: ['ignore', 'ignore', 'ignore']
      });
      return true;
    } catch {
      // 다음 후보로 넘어간다.
    }
  }
  return false;
}
