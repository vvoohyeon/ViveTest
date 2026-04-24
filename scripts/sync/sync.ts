import { config } from 'dotenv';
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { locales } from "@/config/site";
import {
  buildVariantRegistry,
  type QuestionSourcesByVariant,
} from "@/features/variant-registry/builder";
import { validateCrossSheetIntegrity } from "@/features/variant-registry/cross-sheet-integrity";
import { serializeRegistryToFile } from "@/features/variant-registry/registry-serializer";

import {
  createSheetsClient,
  loadLandingSheet,
  loadQuestionsWorkbook,
} from "./sheets-loader";

config({ path: '.env.local', quiet: true });

const execFileAsync = promisify(execFile);
const GENERATED_FILE_PATH = path.resolve(
  process.cwd(),
  "src/features/variant-registry/variant-registry.generated.ts",
);
const COMMIT_MESSAGE = "chore: sync variant registry from Sheets [skip ci]";

type SyncStatus = "no-changes" | "updated";

interface SyncRuntime {
  env?: Record<string, string | undefined>;
  generatedRegistryPath?: string;
  readFile?: typeof readFile;
  writeFile?: typeof writeFile;
  runGit?: (args: string[]) => Promise<unknown>;
  stdout?: Pick<typeof console, "log">;
  stderr?: Pick<typeof console, "error">;
}

interface RequiredSyncEnv {
  GOOGLE_SHEETS_SA_KEY: string;
  GOOGLE_SHEETS_ID_LANDING: string;
  GOOGLE_SHEETS_ID_QUESTIONS: string;
}

function readRequiredEnv(
  env: Record<string, string | undefined>,
  stderr: Pick<typeof console, "error">,
): RequiredSyncEnv {
  const requiredKeys = [
    "GOOGLE_SHEETS_SA_KEY",
    "GOOGLE_SHEETS_ID_LANDING",
    "GOOGLE_SHEETS_ID_QUESTIONS",
  ] as const;
  const missingKeys = requiredKeys.filter((key) => !env[key]);

  if (missingKeys.length > 0) {
    stderr.error(`Missing required sync env: ${missingKeys.join(", ")}`);
    process.exit(1);
  }

  return {
    GOOGLE_SHEETS_SA_KEY: env.GOOGLE_SHEETS_SA_KEY as string,
    GOOGLE_SHEETS_ID_LANDING: env.GOOGLE_SHEETS_ID_LANDING as string,
    GOOGLE_SHEETS_ID_QUESTIONS: env.GOOGLE_SHEETS_ID_QUESTIONS as string,
  };
}

function toQuestionSourcesByVariant(
  questionSourcesByVariant: Map<string, QuestionSourcesByVariant[string]>,
): QuestionSourcesByVariant {
  return Object.fromEntries(questionSourcesByVariant.entries());
}

function shouldAutoRun(): boolean {
  return process.env.VITEST !== "true" && process.env.NODE_ENV !== "test";
}

function formatIntegrityError(
  integrity: ReturnType<typeof validateCrossSheetIntegrity>,
): string {
  return [
    "Cross-sheet integrity validation failed.",
    `missingInQuestions: ${integrity.missingInQuestions.join(", ") || "(none)"}`,
    `extraInQuestions: ${integrity.extraInQuestions.join(", ") || "(none)"}`,
    `missingInResults: ${integrity.missingInResults.join(", ") || "(none)"}`,
    `extraInResults: ${integrity.extraInResults.join(", ") || "(none)"}`,
  ].join("\n");
}

async function defaultRunGit(args: string[]): Promise<void> {
  await execFileAsync("git", args, { cwd: process.cwd() });
}

export async function runSync(runtime: SyncRuntime = {}): Promise<SyncStatus> {
  const env = readRequiredEnv(
    runtime.env ?? process.env,
    runtime.stderr ?? console,
  );
  const stdout = runtime.stdout ?? console;
  const stderr = runtime.stderr ?? console;
  const readGeneratedFile = runtime.readFile ?? readFile;
  const writeGeneratedFile = runtime.writeFile ?? writeFile;
  const runGit = runtime.runGit ?? defaultRunGit;
  const generatedRegistryPath =
    runtime.generatedRegistryPath ?? GENERATED_FILE_PATH;
  const client = createSheetsClient(env.GOOGLE_SHEETS_SA_KEY);

  const [landingRows, questionSourcesByVariant] = await Promise.all([
    loadLandingSheet(client, env.GOOGLE_SHEETS_ID_LANDING),
    loadQuestionsWorkbook(client, env.GOOGLE_SHEETS_ID_QUESTIONS, locales),
  ]);
  const landingTestVariants = landingRows
    .filter((card) => card.type !== "blog")
    .map((card) => card.variant);
  const questionVariants = [...questionSourcesByVariant.keys()];
  const integrity = validateCrossSheetIntegrity(
    landingTestVariants,
    questionVariants,
  );

  // TODO(results): Results Sheets 준비 완료 시:
  // 1. loadResultsSheet(client, process.env.GOOGLE_SHEETS_ID_RESULTS) 호출
  // 2. validateCrossSheetIntegrity(landingTestVariants, questionVariants, resultsVariants) 3-source 모드로 교체
  // 3. workflow에 GOOGLE_SHEETS_ID_RESULTS secret 추가

  if (!integrity.ok) {
    stderr.error(formatIntegrityError(integrity));
    process.exit(1);
  }

  // buildVariantRegistry는 builder.ts 기준 positional 2인자(sourceCards, questionSourcesByVariant)를 사용한다.
  const registry = buildVariantRegistry(
    landingRows,
    toQuestionSourcesByVariant(questionSourcesByVariant),
  );
  const nextGeneratedSource = serializeRegistryToFile(registry);
  const originalContent = await readGeneratedFile(
    generatedRegistryPath,
    "utf8",
  );

  if (originalContent === nextGeneratedSource) {
    stdout.log("variant registry sync: no changes");
    return "no-changes";
  }

  try {
    await writeGeneratedFile(
      generatedRegistryPath,
      nextGeneratedSource,
      "utf8",
    );
    await runGit(["add", generatedRegistryPath]);
    await runGit(["commit", "-m", COMMIT_MESSAGE]);
    await runGit(["push"]);
  } catch (error: unknown) {
    stderr.error("git operation failed, restoring original file:", error);
    stderr.error(
      "git push failed. If branch protection rules require PRs, configure a PAT with bypass permission or exempt the Actions bot.",
    );
    await writeGeneratedFile(generatedRegistryPath, originalContent, "utf8");
    process.exit(1);
  }

  stdout.log("variant registry sync: committed and pushed changes");

  return "updated";
}

if (shouldAutoRun()) {
  void runSync().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
