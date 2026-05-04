#!/usr/bin/env node
/**
 * Deploy with rollout guardrails (Release Gates A + B)
 *
 * 1. Run focused hardening regressions
 * 2. Build fresh artifacts
 * 3. Deploy to production
 * 4. Run post-deploy probes
 *
 * Usage: node scripts/deploy-with-guards.mjs [--skip-probe]
 * Or: bun run deploy:prod
 *
 * Requires: Bun, Vercel CLI via `bun x`, and APP_URL or VERCEL_URL for probe
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
  await run('bun', ['run', 'test:release-hardening']);

  console.log('--- Release Gate A: Reliability Gates ---');
  await run('bun', ['run', 'reliability:release-gates']);

  if (process.env.DATABASE_URL) {
    console.log('--- Release Gate A: Document Schema Gates ---');
    await run('bun', ['run', 'reliability:document-gates']);
  } else {
    console.log('--- Skipping document schema gates (DATABASE_URL not set) ---');
  }

  console.log('--- Release Gate A: Build ---');
  await run('bun', ['run', 'build:vercel']);

  console.log('--- Deploy ---');
  await run('bun', ['x', 'vercel', 'deploy', '--prebuilt', '--prod']);

  if (!skipProbe) {
    console.log('--- Release Gate B: Post-deploy probe (5 min window) ---');
    await run('node', ['scripts/probe-production.mjs']);
    console.log('--- Release Gate B: Post-deploy drift recheck ---');
    await run('bun', ['run', 'reliability:release-gates']);
  } else {
    console.log('--- Skipping probe (--skip-probe) ---');
  }

  console.log('--- Deploy with guards complete ---');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
