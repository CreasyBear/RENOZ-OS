#!/usr/bin/env node
/* global console, process */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const roots = ['src/server/functions'];
const callPattern = /findSerializedItemBySerial\s*\(/g;
const explicitOptOutPattern = /allowAutoUpsert\s*:\s*false/;

function listSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

function findMatchingParen(source, openingParenIndex) {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let index = openingParenIndex; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
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
      if (!escaped && char === "'") inSingleQuote = false;
      escaped = !escaped && char === '\\';
      continue;
    }

    if (inDoubleQuote) {
      if (!escaped && char === '"') inDoubleQuote = false;
      escaped = !escaped && char === '\\';
      continue;
    }

    if (inTemplateString) {
      if (!escaped && char === '`') inTemplateString = false;
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

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function lineNumberForIndex(source, index) {
  return source.slice(0, index).split('\n').length;
}

const offenders = [];

for (const root of roots) {
  for (const file of listSourceFiles(root)) {
    if (file.endsWith(path.join('_shared', 'serialized-lineage.ts'))) continue;

    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(callPattern)) {
      const openingParenIndex = match.index + match[0].lastIndexOf('(');
      const closingParenIndex = findMatchingParen(source, openingParenIndex);
      if (closingParenIndex === -1) {
        offenders.push({
          file,
          line: lineNumberForIndex(source, match.index),
          reason: 'could not parse call expression',
        });
        continue;
      }

      const callSource = source.slice(openingParenIndex, closingParenIndex + 1);
      if (!explicitOptOutPattern.test(callSource)) {
        offenders.push({
          file,
          line: lineNumberForIndex(source, match.index),
          reason: 'missing allowAutoUpsert: false',
        });
      }
    }
  }
}

if (offenders.length > 0) {
  console.error('Serialized read auto-upsert guard failed:');
  for (const offender of offenders) {
    console.error(`- ${offender.file}:${offender.line} (${offender.reason})`);
  }
  console.error(
    '\nUse upsertSerializedItemForInventory in source-of-stock workflows. ' +
      'Use findSerializedItemBySerial with allowAutoUpsert: false in read/fulfillment/support workflows.'
  );
  process.exit(1);
}

console.log('Serialized read auto-upsert guard passed.');
