import {readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

export function createChecker() {
  const errors = [];

  return {
    fail(message) {
      errors.push(message);
    },
    finish(label) {
      if (errors.length > 0) {
        console.error(`${label} contract checks failed:`);
        for (const issue of errors) {
          console.error(`- ${issue}`);
        }
        process.exit(1);
      }

      console.log(`${label} contract checks passed.`);
    }
  };
}

export function fileExists(relativePath) {
  try {
    return statSync(path.join(rootDir, relativePath)).isFile();
  } catch {
    return false;
  }
}

export function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8');
}

export function readExisting(relativePaths) {
  return relativePaths.filter(fileExists).map(read).join('\n');
}

export function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

export function walkFiles(startDir, filter) {
  const absolute = path.join(rootDir, startDir);
  const stack = [absolute];
  const results = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    for (const entry of readdirSync(current, {withFileTypes: true})) {
      const absoluteEntry = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absoluteEntry);
        continue;
      }
      if (entry.isFile() && filter(absoluteEntry)) {
        results.push(absoluteEntry);
      }
    }
  }

  return results;
}
