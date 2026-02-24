#!/usr/bin/env node
/**
 * Unified release gate runner for controlled cutover.
 *
 * Runs:
 * 1. Serialized lineage hard gates
 * 2. Finance integrity hard gates
 * 3. Route-intent smoke checks
 *
 * Emits JSON artifacts to artifacts/release-gates/.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'release-gates');

function runWithCapture(command, args = []) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      shell: false,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function extractJsonPayload(output) {
  const match = output.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

mkdirSync(ARTIFACT_DIR, { recursive: true });
const generatedAt = new Date().toISOString();

const checks = [
  {
    gateName: 'serialized-lineage',
    command: 'node',
    args: ['scripts/run-serialized-lineage-gates.mjs', '--target', 'website'],
  },
  {
    gateName: 'finance-integrity',
    command: 'node',
    args: ['scripts/run-finance-integrity-gates.mjs'],
  },
  {
    gateName: 'route-intent-smoke',
    command: 'npm',
    args: ['run', 'test:route-intent-smoke'],
  },
];

const results = [];
let hasFailure = false;

for (const check of checks) {
  const result = await runWithCapture(check.command, check.args);
  const parsed = extractJsonPayload(result.stdout) ?? extractJsonPayload(result.stderr);
  const gateResult = {
    gateName: check.gateName,
    status: result.code === 0 ? 'pass' : 'fail',
    generatedAt,
    metrics: parsed?.metrics ?? {},
    failingRules: parsed?.hardGates
      ? Object.entries(parsed.hardGates)
          .filter(([, value]) => Number(value) > 0)
          .map(([key]) => key)
      : [],
    exitCode: result.code,
  };
  results.push(gateResult);
  if (result.code !== 0) hasFailure = true;
}

const summary = {
  gateName: 'release-gates-summary',
  status: hasFailure ? 'fail' : 'pass',
  generatedAt,
  metrics: {
    totalGates: results.length,
    passed: results.filter((r) => r.status === 'pass').length,
    failed: results.filter((r) => r.status === 'fail').length,
  },
  failingRules: results.filter((r) => r.status === 'fail').map((r) => r.gateName),
  checks: results,
};

writeFileSync(
  path.join(ARTIFACT_DIR, `release-gates-${generatedAt.replace(/[:.]/g, '-')}.json`),
  JSON.stringify(summary, null, 2),
  'utf8'
);
writeFileSync(path.join(ARTIFACT_DIR, 'latest.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));

if (hasFailure) process.exit(2);

