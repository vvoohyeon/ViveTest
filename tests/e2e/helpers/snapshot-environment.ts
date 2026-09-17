import {arch, cpus, platform, release} from 'node:os';

/**
 * **이 PNG 들은 누구의 픽셀인가.**
 *
 * `expanded-focus-shell.png` 한 장이 기계마다 다른 크기로 렌더됐다(398×293 대 395×292, 1,800 px).
 * 그 한 장은 검사를 기하 단언으로 바꾸고 PNG 를 지워 닫았지만, theme-matrix 의 164 장은 주장 자체가
 * 「이 픽셀이 바뀌지 않았다」라 좁힐 것이 없다. 그러면 남는 질문은 **재생성한 기계가 어디였나**인데,
 * provenance 는 날짜만 적고 있어서 그 질문에 답하지 못했다.
 *
 * 그래서 재생성이 자기 환경을 기계가 읽을 수 있게 남긴다. 두 기계의 OS 판(`25.6.0`)이 같다는 것을
 * 실측했으므로 OS 만으로는 갈리지 않는다 — CPU 모델까지 함께 적는다.
 *
 * 순수 함수만 여기 둔다. 파일을 읽고 쓰는 쪽은 `local-snapshot.ts` 가 갖는다 — 그래야 이 판정이
 * 승인된 재생성을 기다리지 않고 기본 게이트에서 돌 수 있다(L05: release 티어에 둔 검사는 평시에
 * 한 번도 돌지 않는다).
 */
export interface SnapshotEnvironment {
  platform: string;
  release: string;
  arch: string;
  cpu: string;
  playwright: string;
}

export function currentSnapshotEnvironment(playwrightVersion: string): SnapshotEnvironment {
  return {
    platform: platform(),
    release: release(),
    arch: arch(),
    cpu: cpus()[0]?.model ?? 'unknown',
    playwright: playwrightVersion
  };
}

export function describeEnvironment(environment: SnapshotEnvironment): string {
  return `${environment.platform} ${environment.release} ${environment.arch} · ${environment.cpu} · playwright ${environment.playwright}`;
}

/**
 * baseline 을 만든 환경과 지금 환경의 관계를 한 문단으로. **붉은 실패에만** 붙는다.
 *
 * 3px 기계 차이와 진짜 회귀는 픽셀 수로 구별되지 않고, 구별하는 것은 이 한 줄이다(L14).
 * `recorded` 가 `null` 이면 「모른다」이고, 그렇게 말한다 — 없는 기록을 지금 만들어 넣으면
 * 2026-09-11 의 재생성을 이 기계가 한 것으로 주장하게 된다.
 */
export function snapshotEnvironmentNote(
  recorded: SnapshotEnvironment | null,
  current: SnapshotEnvironment
): string {
  if (!recorded) {
    return (
      '\n\n[환경] baseline 을 만든 환경이 기록돼 있지 않다 — 이 붉음이 회귀인지 기계 차이인지 ' +
      '이 실행만으로는 가를 수 없다. 다음 승인된 재생성이 `tests/e2e/snapshot-environment.json` 을 남긴다.\n' +
      `        지금 환경: ${describeEnvironment(current)}`
    );
  }

  const differing = (Object.keys(current) as Array<keyof SnapshotEnvironment>).filter(
    (key) => recorded[key] !== current[key]
  );

  if (differing.length === 0) {
    return `\n\n[환경] baseline 과 **같은 환경**이다(${describeEnvironment(current)}) — 기계 차이로 설명되지 않는다.`;
  }

  return (
    `\n\n[환경] baseline 과 **다른 환경**이다 — 다른 항목: ${differing.join(', ')}.\n` +
    `        baseline: ${describeEnvironment(recorded)}\n` +
    `        지금:     ${describeEnvironment(current)}\n` +
    '        기계 종속일 수 있다. 임계값을 올려 덮지 말 것 — 차이를 실측해 provenance 에 적고, ' +
    '검사가 실제로 주장하는 것으로 좁힐 수 있는지부터 본다(`expanded-focus-shell` 이 그 선례다).'
  );
}
