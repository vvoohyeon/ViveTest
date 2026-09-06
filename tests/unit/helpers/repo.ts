import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** 저장소 루트. 테스트 파일 위치에서 유도하므로 cwd에 의존하지 않는다. */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
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
