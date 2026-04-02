#!/usr/bin/env node
import { spawn } from 'node:child_process';

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });

    child.on('close', (code) => {
      resolve(code ?? 1);
    });
  });
}

const vitestExitCode = await run('npx', [
  'vitest',
  'run',
  'tests/unit/routes',
  'tests/unit/support/issues-filter-url.test.ts',
  'tests/unit/support/e2e-hardening-guards.test.ts',
]);

if (vitestExitCode !== 0) {
  process.exit(vitestExitCode);
}

const authSmokeExitCode = await run('node', ['scripts/run-auth-redirect-smoke.mjs']);
process.exit(authSmokeExitCode);
