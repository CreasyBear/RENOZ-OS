#!/usr/bin/env node
import { spawn } from 'node:child_process';

const args = [
  'vitest',
  'run',
  'tests/unit/routes',
  'tests/unit/support/issues-filter-url.test.ts',
  'tests/unit/support/e2e-hardening-guards.test.ts',
];

const child = spawn('npx', args, {
  stdio: 'inherit',
  shell: false,
  env: process.env,
});

child.on('close', (code) => {
  process.exit(code ?? 1);
});

