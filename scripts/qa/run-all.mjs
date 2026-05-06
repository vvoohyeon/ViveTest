import {spawn} from 'node:child_process';
import path from 'node:path';

const scripts = [
  'check-phase1-contracts.mjs',
  'check-phase4-grid-contracts.mjs',
  'check-phase5-card-contracts.mjs',
  'check-phase6-spacing-contracts.mjs',
  'check-phase7-state-contracts.mjs',
  'check-phase8-accessibility-contracts.mjs',
  'check-phase9-performance-contracts.mjs',
  'check-phase10-transition-contracts.mjs',
  'check-phase11-telemetry-contracts.mjs',
  'check-variant-registry-contracts.mjs',
  'check-variant-only-contracts.mjs',
  'check-blocker-traceability.mjs'
];

function runScript(script) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join('scripts/qa', script)], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      stderr += `${error.message}\n`;
      resolve({script, code: 1, stdout, stderr});
    });
    child.on('close', (code) => {
      resolve({script, code: code ?? 1, stdout, stderr});
    });
  });
}

const results = await Promise.all(scripts.map(runScript));
const failures = results.filter((result) => result.code !== 0);

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`\n${failure.script} failed with exit code ${failure.code}.`);
    if (failure.stdout.trim().length > 0) {
      console.error(failure.stdout.trimEnd());
    }
    if (failure.stderr.trim().length > 0) {
      console.error(failure.stderr.trimEnd());
    }
  }
  process.exit(1);
}

for (const result of results) {
  if (result.stdout.trim().length > 0) {
    process.stdout.write(result.stdout);
  }
}
