import {execFileSync} from 'node:child_process';

import {describe, expect, it} from 'vitest';

import {REPO_ROOT, walkRepoFiles} from './helpers/repo';

/**
 * **디스크에 있는 baseline 과 git 이 들고 있는 baseline 은 같은 집합이다.**
 *
 * `.gitignore` 가 `tests/e2e/*-snapshots/` 를 무시하고 있었다. 이미 추적 중인 169 장은 추적이
 * 유지되므로 아무 증상이 없었지만, **새로 생기는 baseline 은 조용히 빠진다** — 만든 기계에서는
 * 전부 초록이고 다른 clone 에서만 「baseline 이 없다」로 붉는다. 단위 11 이 manifest 에 케이스를
 * 더하기로 되어 있으므로 그 자리가 정확히 여기다.
 *
 * `qa:rules` 에 이미 「디스크의 집합이 manifest 와 일치한다」가 있지만 그것은 **파일 시스템만**
 * 본다. 추적 여부는 다른 축이고, 그래서 두 축을 각각 묻는다. 이 검사는 기본 게이트 안에 둔다 —
 * release 티어에 두면 평시에 한 번도 돌지 않는다(L05).
 *
 * **그리고 `.png` 만 묻지 않는다.** 종전에는 그랬고, 그 사이 같은 디렉터리 안에 `.md` 하나가
 * 넉 달을 살아 있었다 — 2026-05-06 자 `BASELINE_PROVENANCE.md`. `docs/done/` 이 그 파일을 이름까지
 * 적어 「미추적 산문」이라 기록해 두었는데도 어느 게이트도 그것을 묻지 않았는데, 확장자가 달라서다.
 * 금지되는 것은 「추적되지 않는 **그림**」이 아니라 「추적되지 않는 **무엇이든**」이다 — 이 디렉터리는
 * git 이 든 것만 사는 곳이고, 그것이 규칙의 실제 조건이다(L30).
 */
function trackedBaselines(): string[] {
  const output = execFileSync('git', ['ls-files', 'tests/e2e/*-snapshots/*'], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });

  return output.split('\n').filter(Boolean).sort();
}

function baselinesOnDisk(): string[] {
  return filesInSnapshotDirs().filter((file) => file.endsWith('.png'));
}

/** 스냅샷 디렉터리 안의 **모든** 파일. 확장자를 묻지 않는다. */
function filesInSnapshotDirs(): string[] {
  return walkRepoFiles('tests/e2e')
    .filter((file) => file.includes('-snapshots/'))
    .sort();
}

describe('시각 baseline 은 전부 추적된다', () => {
  it('훑을 baseline 이 비어 있지 않다', () => {
    // 전제: 집합이 비면 아래 단언이 공허하게 초록이 된다.
    expect(baselinesOnDisk().length).toBeGreaterThan(100);
  });

  it('디스크의 baseline 이 전부 git 에 있다 — 무시된 채 만들어진 장이 없다', () => {
    const tracked = new Set(trackedBaselines());
    const untracked = baselinesOnDisk().filter((file) => !tracked.has(file));

    expect(untracked, `추적되지 않는 baseline: ${untracked.join(', ')}`).toEqual([]);
  });

  it('git 이 든 baseline 이 전부 디스크에 있다 — 지워진 채 추적만 남은 장이 없다', () => {
    const onDisk = new Set(baselinesOnDisk());
    const missing = trackedBaselines().filter((file) => !onDisk.has(file));

    expect(missing, `디스크에 없는 추적 baseline: ${missing.join(', ')}`).toEqual([]);
  });

  // 확장자를 묻지 않는 쪽이 규칙의 본체다. 위의 `.png` 단언은 그 특수한 경우이고, 둘 다 두는
  // 이유는 실패 메시지가 다르기 때문이다 — 「baseline 이 빠졌다」와 「여기 살면 안 되는 것이
  // 있다」는 읽는 사람이 할 일이 다르다.
  it('스냅샷 디렉터리에는 추적되지 않는 파일이 살지 않는다 — 확장자를 묻지 않는다', () => {
    const tracked = new Set(trackedBaselines());
    const strays = filesInSnapshotDirs().filter((file) => !tracked.has(file));

    expect(
      strays,
      `스냅샷 디렉터리의 미추적 파일: ${strays.join(', ')}\n` +
        '이 디렉터리에는 git 이 든 것만 산다. 필요한 baseline 이면 커밋하고, 산물이면 지운다 — ' +
        '`.gitignore` 로 감추지 않는다(그것이 넉 달치 고아를 만든 경로다).'
    ).toEqual([]);
  });
});
