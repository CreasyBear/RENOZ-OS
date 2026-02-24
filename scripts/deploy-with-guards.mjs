#!/usr/bin/env node
/**
 * Deploy with rollout guardrails (Release Gates A + B)
 *
 * 1. Run unit tests (redirect graph, auth policy)
 * 2. Build fresh artifacts
 * 3. Deploy to production
 * 4. Run post-deploy probes
 *
 * Usage: node scripts/deploy-with-guards.mjs [--skip-probe]
 * Or: npm run deploy:prod
 *
 * Requires: vercel CLI, APP_URL or VERCEL_URL for probe
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: ROOT,
      shell: false,
      ...opts,
    });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function main() {
  const skipProbe = process.argv.includes('--skip-probe');

  console.log('--- Release Gate A: Tests ---');
  await run('npx', [
    'vitest',
    'run',
    'tests/unit/auth',
    'tests/unit/routes',
    'tests/unit/build-asset-paths.test.ts',
  ]);

  console.log('--- Release Gate A: Reliability Gates ---');
  await run('node', ['scripts/run-release-gates.mjs']);

  console.log('--- Release Gate A: Build ---');
  await run('npm', ['run', 'build:vercel']);

  console.log('--- Deploy ---');
  await run('npx', ['vercel', 'deploy', '--prebuilt', '--prod']);

  if (!skipProbe) {
    console.log('--- Release Gate B: Post-deploy probe (5 min window) ---');
    await run('node', ['scripts/probe-production.mjs']);
    console.log('--- Release Gate B: Post-deploy drift recheck ---');
    await run('node', ['scripts/run-release-gates.mjs']);
  } else {
    console.log('--- Skipping probe (--skip-probe) ---');
  }

  console.log('--- Deploy with guards complete ---');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
