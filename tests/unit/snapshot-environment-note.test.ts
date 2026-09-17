import {describe, expect, it} from 'vitest';

import {
  currentSnapshotEnvironment,
  snapshotEnvironmentNote,
  type SnapshotEnvironment
} from '../e2e/helpers/snapshot-environment';

/**
 * 이 판정은 **승인된 재생성 때 처음 돌아서는 안 된다.**
 *
 * 환경 기록을 쓰는 것은 `--update-snapshots` 뿐이고 그것은 사람 승인이 필요한 실행이다
 * (`AGENTS.md` §4 Hard stops). 판정 로직이 그 실행 안에만 있으면 한 번도 돌아 본 적 없는 코드가
 * 승인 단계 한가운데서 처음 실행된다. 그래서 판정을 순수 함수로 갈라 기본 게이트에서 돌린다.
 */
const BASE: SnapshotEnvironment = {
  platform: 'darwin',
  release: '25.6.0',
  arch: 'arm64',
  cpu: 'Apple M2 Pro',
  playwright: '1.57.0'
};

describe('시각 baseline 의 환경 판정', () => {
  it('기록이 없으면 「모른다」고 말한다 — 없는 기록을 지어내지 않는다', () => {
    const note = snapshotEnvironmentNote(null, BASE);

    expect(note).toContain('기록돼 있지 않다');
    expect(note).toContain('Apple M2 Pro');
    expect(note).not.toContain('다른 항목');
  });

  it('같은 환경이면 기계 차이로 설명되지 않는다고 말한다', () => {
    const note = snapshotEnvironmentNote({...BASE}, BASE);

    expect(note).toContain('같은 환경');
    expect(note).not.toContain('다른 항목');
  });

  it('다른 환경이면 무엇이 다른지 이름으로 말한다', () => {
    const note = snapshotEnvironmentNote({...BASE, cpu: 'Apple M1'}, BASE);

    expect(note).toContain('다른 환경');
    expect(note).toContain('다른 항목: cpu');
    expect(note).toContain('Apple M1');
    expect(note).toContain('Apple M2 Pro');
    // 임계값을 올려 덮는 것이 유일하게 금지된 처분이다 — 그 문장이 메시지에 있어야 한다.
    expect(note).toContain('임계값을 올려 덮지 말 것');
  });

  it('여러 축이 다르면 전부 이름을 댄다', () => {
    const note = snapshotEnvironmentNote({...BASE, arch: 'x64', playwright: '1.50.0'}, BASE);

    expect(note).toContain('다른 항목: arch, playwright');
  });

  it('지금 환경을 읽어 오면 다섯 축이 전부 채워진다', () => {
    const now = currentSnapshotEnvironment('1.57.0');

    expect(Object.values(now).every((value) => typeof value === 'string' && value.length > 0)).toBe(true);
    expect(now.playwright).toBe('1.57.0');
  });
});
