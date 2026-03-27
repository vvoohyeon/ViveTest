import {readFileSync, statSync} from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const traceabilityFile = 'docs/blocker-traceability.json';
const TRACEABILITY_ASSERTION_ID = 'assertion:B19-traceability-registry';
const allowedKinds = new Set(['automated_assertion', 'scenario_test', 'manual_checkpoint']);
const errors = [];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function hasExecutableAssertionReference({content, file, assertionId}) {
  const escapedAssertionId = escapeRegex(assertionId);

  if (file.startsWith('tests/')) {
    return new RegExp(`\\b(?:test|it)\\s*\\(\\s*[\\s\\S]{0,200}?${escapedAssertionId}`, 'u').test(content);
  }

  if (file.startsWith('scripts/qa/')) {
    return new RegExp(`['"\`]${escapedAssertionId}['"\`]`, 'u').test(content);
  }

  return content.includes(assertionId);
}

function fail(message) {
  errors.push(message);
}

function fileExists(relativePath) {
  try {
    return statSync(path.join(rootDir, relativePath)).isFile();
  } catch {
    return false;
  }
}

function hasTraceabilityAnchor({content, file, assertionId, kind}) {
  if (kind === 'automated_assertion') {
    return hasExecutableAssertionReference({content, file, assertionId});
  }

  if (kind === 'manual_checkpoint') {
    return file.startsWith('docs/') && content.includes(assertionId);
  }

  if (kind === 'scenario_test') {
    if (file.startsWith('tests/') || file.startsWith('scripts/qa/')) {
      return hasExecutableAssertionReference({content, file, assertionId});
    }

    return file.startsWith('docs/') && content.includes(assertionId);
  }

  return false;
}

if (!fileExists(traceabilityFile)) {
  fail(`Missing traceability registry: ${traceabilityFile}`);
} else {
  const entries = JSON.parse(readFileSync(path.join(rootDir, traceabilityFile), 'utf8'));
  const blockers = new Set();

  for (const entry of entries) {
    if (typeof entry?.blocker !== 'number') {
      fail(`Traceability entry is missing numeric blocker: ${JSON.stringify(entry)}`);
      continue;
    }

    blockers.add(entry.blocker);

    if (typeof entry.file !== 'string' || entry.file.length === 0) {
      fail(`Traceability entry for blocker ${entry.blocker} is missing file.`);
      continue;
    }

    if (typeof entry.assertionId !== 'string' || entry.assertionId.length === 0) {
      fail(`Traceability entry for blocker ${entry.blocker} is missing assertionId.`);
      continue;
    }

    if (typeof entry.kind !== 'string' || !allowedKinds.has(entry.kind)) {
      fail(`Traceability entry for blocker ${entry.blocker} has invalid kind: ${JSON.stringify(entry.kind)}`);
      continue;
    }

    if (!fileExists(entry.file)) {
      fail(`Traceability entry points to missing file: ${entry.file}`);
      continue;
    }

    const content = readFileSync(path.join(rootDir, entry.file), 'utf8');
    if (!content.includes(entry.assertionId)) {
      fail(`Traceability assertionId not found for blocker ${entry.blocker}: ${entry.assertionId}`);
      continue;
    }

    if (!hasTraceabilityAnchor({content, file: entry.file, assertionId: entry.assertionId, kind: entry.kind})) {
      fail(
        `Traceability assertionId is not anchored to the declared ${entry.kind} surface for blocker ${entry.blocker}: ${entry.assertionId}`
      );
    }
  }

  for (let blocker = 1; blocker <= 30; blocker += 1) {
    if (!blockers.has(blocker)) {
      fail(`Traceability registry is missing blocker ${blocker}.`);
    }
  }
}

if (errors.length > 0) {
  console.error('Blocker traceability checks failed:');
  for (const issue of errors) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`${TRACEABILITY_ASSERTION_ID} checks passed for ${traceabilityFile}.`);
