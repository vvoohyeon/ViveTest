import {createChecker, fileExists, read} from './_utils.mjs';

const traceabilityFile = 'docs/blocker-traceability.json';
const TRACEABILITY_ASSERTION_ID = 'assertion:B19-traceability-registry';
const allowedKinds = new Set(['automated_assertion', 'scenario_test', 'manual_checkpoint']);
const {fail, finish} = createChecker();

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

if (TRACEABILITY_ASSERTION_ID !== 'assertion:B19-traceability-registry') {
  fail('Traceability assertion ID drifted from the blocker 19 registry anchor.');
}

if (!fileExists(traceabilityFile)) {
  fail(`Missing traceability registry: ${traceabilityFile}`);
} else {
  const entries = JSON.parse(read(traceabilityFile));
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

    const content = read(entry.file);
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

finish('Blocker traceability');
