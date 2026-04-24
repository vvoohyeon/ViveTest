import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const sheetsLoaderMocks = vi.hoisted(() => ({
  createSheetsClient: vi.fn(() => ({kind: 'sheets-client'})),
  loadLandingSheet: vi.fn(),
  loadQuestionsWorkbook: vi.fn()
}));

vi.mock('../../scripts/sync/sheets-loader', () => sheetsLoaderMocks);

import {runSync} from '../../scripts/sync/sync';
import type {NormalizedQuestionSourceRow} from '../../src/features/variant-registry/sheets-row-normalizer';
import type {VariantRegistrySourceCard} from '../../src/features/variant-registry/types';

class ProcessExitError extends Error {
  constructor(readonly code: string | number | null | undefined) {
    super(`process.exit(${String(code)})`);
  }
}

type SyncHarness = {
  env: Record<string, string | undefined>;
  readFile: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
  runGit: ReturnType<typeof vi.fn>;
  stdout: {log: ReturnType<typeof vi.fn>};
  stderr: {error: ReturnType<typeof vi.fn>};
};

const GENERATED_PATH = '/tmp/vivetest/variant-registry.generated.ts';
const DEFAULT_ENV = {
  GOOGLE_SHEETS_SA_KEY: '{"client_email":"sync@example.com","private_key":"secret"}',
  GOOGLE_SHEETS_ID_LANDING: 'landing-sheet',
  GOOGLE_SHEETS_ID_QUESTIONS: 'questions-sheet'
} as const;

function makeTestCard(variant: string, seq = 1): VariantRegistrySourceCard {
  return {
    seq,
    type: 'test',
    variant,
    attribute: 'available',
    title: {en: variant},
    subtitle: {en: `${variant} subtitle`},
    tags: {en: []},
    instruction: {en: `${variant} instruction`},
    durationM: 1,
    sharedC: 0,
    engagedC: 0
  };
}

function makeBlogCard(variant: string, seq = 99): VariantRegistrySourceCard {
  return {
    seq,
    type: 'blog',
    variant,
    attribute: 'available',
    title: {en: variant},
    subtitle: {en: `${variant} subtitle`},
    tags: {en: []},
    durationM: 1,
    sharedC: 0,
    engagedC: 0
  };
}

function makeQuestionRows(question = 'Question?'): NormalizedQuestionSourceRow[] {
  return [
    {
      seq: '1',
      question: {en: question},
      answerA: {en: 'A'},
      answerB: {en: 'B'}
    }
  ];
}

function createHarness(overrides: Partial<SyncHarness> = {}): SyncHarness {
  return {
    env: {...DEFAULT_ENV},
    readFile: vi.fn().mockResolvedValue('current generated source'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    runGit: vi.fn().mockResolvedValue(undefined),
    stdout: {log: vi.fn()},
    stderr: {error: vi.fn()},
    ...overrides
  };
}

async function runWithHarness(harness: SyncHarness) {
  return runSync({
    env: harness.env,
    generatedRegistryPath: GENERATED_PATH,
    readFile: harness.readFile,
    writeFile: harness.writeFile,
    runGit: harness.runGit,
    stdout: harness.stdout,
    stderr: harness.stderr
  });
}

describe('sync variant registry orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sheetsLoaderMocks.loadLandingSheet.mockResolvedValue([makeTestCard('qmbti')]);
    sheetsLoaderMocks.loadQuestionsWorkbook.mockResolvedValue(
      new Map<string, NormalizedQuestionSourceRow[]>([['qmbti', makeQuestionRows()]])
    );
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new ProcessExitError(code);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('환경변수 누락 시 process.exit(1)로 종료하고 파일을 수정하지 않는다', async () => {
    const harness = createHarness({
      env: {
        ...DEFAULT_ENV,
        GOOGLE_SHEETS_ID_QUESTIONS: undefined
      }
    });

    await expect(runWithHarness(harness)).rejects.toMatchObject({code: 1});

    expect(process.exit).toHaveBeenCalledWith(1);
    expect(sheetsLoaderMocks.createSheetsClient).not.toHaveBeenCalled();
    expect(harness.writeFile).not.toHaveBeenCalled();
    expect(harness.runGit).not.toHaveBeenCalled();
  });

  it('Landing과 Questions variant가 불일치하면 process.exit(1)로 종료하고 파일을 수정하지 않는다', async () => {
    const harness = createHarness();
    sheetsLoaderMocks.loadLandingSheet.mockResolvedValue([makeTestCard('qmbti'), makeTestCard('landing-only', 2)]);
    sheetsLoaderMocks.loadQuestionsWorkbook.mockResolvedValue(
      new Map<string, NormalizedQuestionSourceRow[]>([['qmbti', makeQuestionRows()]])
    );

    await expect(runWithHarness(harness)).rejects.toMatchObject({code: 1});

    expect(process.exit).toHaveBeenCalledWith(1);
    expect(harness.stderr.error).toHaveBeenCalledWith(expect.stringContaining('missingInQuestions'));
    expect(harness.writeFile).not.toHaveBeenCalled();
    expect(harness.runGit).not.toHaveBeenCalled();
  });

  it('직렬화 결과가 현재 generated 파일과 같으면 git 작업 없이 정상 종료한다', async () => {
    const harness = createHarness();
    const firstRun = await runWithHarness({
      ...harness,
      readFile: vi.fn().mockResolvedValue('')
    });
    const serialized = harness.writeFile.mock.calls[0]?.[1] as string | undefined;
    expect(firstRun).toBe('updated');
    expect(serialized).toBeTruthy();

    vi.clearAllMocks();
    sheetsLoaderMocks.createSheetsClient.mockReturnValue({kind: 'sheets-client'});
    sheetsLoaderMocks.loadLandingSheet.mockResolvedValue([makeTestCard('qmbti')]);
    sheetsLoaderMocks.loadQuestionsWorkbook.mockResolvedValue(
      new Map<string, NormalizedQuestionSourceRow[]>([['qmbti', makeQuestionRows()]])
    );
    const sameHarness = createHarness({
      readFile: vi.fn().mockResolvedValue(serialized)
    });

    await expect(runWithHarness(sameHarness)).resolves.toBe('no-changes');

    expect(sameHarness.writeFile).not.toHaveBeenCalled();
    expect(sameHarness.runGit).not.toHaveBeenCalled();
    expect(sameHarness.stdout.log).toHaveBeenCalledWith(expect.stringContaining('no changes'));
  });

  it('직렬화 결과가 현재 파일과 다르면 전체 파일을 쓰고 git add/commit/push를 호출한다', async () => {
    const harness = createHarness();

    await expect(runWithHarness(harness)).resolves.toBe('updated');

    expect(harness.writeFile).toHaveBeenCalledWith(
      GENERATED_PATH,
      expect.stringContaining('variantRegistryGenerated'),
      'utf8'
    );
    expect(harness.runGit).toHaveBeenNthCalledWith(1, ['add', GENERATED_PATH]);
    expect(harness.runGit).toHaveBeenNthCalledWith(2, [
      'commit',
      '-m',
      'chore: sync variant registry from Sheets [skip ci]'
    ]);
    expect(harness.runGit).toHaveBeenNthCalledWith(3, ['push']);
  });

  it('git push 실패 시 원본 generated 파일로 복구하고 process.exit(1)로 종료한다', async () => {
    const harness = createHarness({
      readFile: vi.fn().mockResolvedValue('original generated source'),
      runGit: vi.fn().mockImplementation(async (args: string[]) => {
        if (args[0] === 'push') {
          throw new Error('push failed');
        }
      })
    });

    await expect(runWithHarness(harness)).rejects.toMatchObject({code: 1});

    expect(harness.writeFile).toHaveBeenNthCalledWith(
      1,
      GENERATED_PATH,
      expect.stringContaining('variantRegistryGenerated'),
      'utf8'
    );
    expect(harness.writeFile).toHaveBeenNthCalledWith(2, GENERATED_PATH, 'original generated source', 'utf8');
    expect(harness.stderr.error).toHaveBeenCalledWith(
      'git operation failed, restoring original file:',
      expect.any(Error)
    );
    expect(harness.stderr.error).toHaveBeenCalledWith(
      'git push failed. If branch protection rules require PRs, configure a PAT with bypass permission or exempt the Actions bot.'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('blog variant는 landingTestVariants에서 제외하고 Questions 불일치로 취급하지 않는다', async () => {
    const harness = createHarness();
    sheetsLoaderMocks.loadLandingSheet.mockResolvedValue([makeTestCard('qmbti'), makeBlogCard('ops-handbook')]);
    sheetsLoaderMocks.loadQuestionsWorkbook.mockResolvedValue(
      new Map<string, NormalizedQuestionSourceRow[]>([['qmbti', makeQuestionRows()]])
    );

    await expect(runWithHarness(harness)).resolves.toBe('updated');

    expect(harness.stderr.error).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
    expect(harness.writeFile).toHaveBeenCalled();
  });
});
