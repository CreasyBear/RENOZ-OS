#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const baselinePath = path.resolve('docs/reliability/baselines/read-path-query-guards.txt');
const shouldUpdateBaseline = process.argv.includes('--update-baseline');

function getOffenderFiles() {
  try {
    const output = execSync(
      "rg -l -P \"if \\(result == null\\)\\s*throw new Error\\(|throw new Error\\('Query returned no data'\\)|throw new Error\\(\\\"Query returned no data\\\"\\)|throw normalizeQueryError\\(\" src/hooks",
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    ).trim();
    return output ? output.split('\n').sort() : [];
  } catch (error) {
    const output = String(error?.stdout ?? '').trim();
    return output ? output.split('\n').sort() : [];
  }
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
