#!/usr/bin/env node
/* global console, process */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const baselinePath = path.resolve('docs/reliability/baselines/read-path-query-guards.txt');
const shouldUpdateBaseline = process.argv.includes('--update-baseline');

const hooksRoot = path.resolve('src/hooks');
const rawNullSentinelPattern =
  /if\s*\(result == null\)\s*(?:\{\s*)?throw new Error\(|throw new Error\(['"]Query returned no data['"]\)|throw normalizeQueryError\(/;
const queryFnStartPattern = /queryFn:\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{/g;

function listHookFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...listHookFiles(fullPath));
      continue;
    }

    if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

function findMatchingBrace(source, openingBraceIndex) {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let index = openingBraceIndex; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inSingleQuote) {
      if (!escaped && char === "'") {
        inSingleQuote = false;
      }
      escaped = !escaped && char === '\\';
      continue;
    }

    if (inDoubleQuote) {
      if (!escaped && char === '"') {
        inDoubleQuote = false;
      }
      escaped = !escaped && char === '\\';
      continue;
    }

    if (inTemplateString) {
      if (!escaped && char === '`') {
        inTemplateString = false;
      }
      escaped = !escaped && char === '\\';
      continue;
    }

    escaped = false;

    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      continue;
    }

    if (char === '`') {
      inTemplateString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function fileHasRawReadPathSentinel(source) {
  const matches = source.matchAll(queryFnStartPattern);

  for (const match of matches) {
    const blockStart = match.index + match[0].length - 1;
    const blockEnd = findMatchingBrace(source, blockStart);
    if (blockEnd === -1) {
      continue;
    }

    const queryFnBody = source.slice(blockStart, blockEnd + 1);
    if (rawNullSentinelPattern.test(queryFnBody)) {
      return true;
    }
  }

  return false;
}

function getOffenderFiles() {
  return listHookFiles(hooksRoot)
    .filter((filePath) => fileHasRawReadPathSentinel(readFileSync(filePath, 'utf8')))
    .map((filePath) => path.relative(process.cwd(), filePath))
    .sort();
}

const offenderFiles = getOffenderFiles();

if (shouldUpdateBaseline) {
  mkdirSync(path.dirname(baselinePath), { recursive: true });
  writeFileSync(baselinePath, `${offenderFiles.join('\n')}\n`, 'utf8');
  console.log(`Read-path query baseline updated: ${baselinePath} (${offenderFiles.length} entries)`);
  process.exit(0);
}

const baselineFiles = existsSync(baselinePath)
  ? readFileSync(baselinePath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  : [];

const baselineSet = new Set(baselineFiles);
const newOffenders = offenderFiles.filter((file) => !baselineSet.has(file));

if (newOffenders.length > 0) {
  console.error('Read-path query guard failed (new raw null-sentinel read-hook patterns detected):');
  for (const file of newOffenders) {
    console.error(`- ${file}`);
  }
  console.error(
    `\nBaseline file: ${baselinePath}\n` +
      'If an intentional debt reconciliation completed, regenerate baseline with:\n' +
      '  node scripts/check-read-path-query-guards.mjs --update-baseline'
  );
  process.exit(1);
}

if (offenderFiles.length > 0) {
  console.log(
    `Read-path query guard passed (baseline mode). Current offenders: ${offenderFiles.length}, baseline: ${baselineFiles.length}.`
  );
} else {
  console.log('Read-path query guard passed.');
}
