#!/usr/bin/env node
import { execSync } from 'node:child_process';

const checks = [
  {
    label: 'Route cast: params: {} as never',
    cmd: "rg -n \"params:\\s*\\{\\}\\s*as never\" src/routes src/components src/hooks",
  },
  {
    label: 'Route cast: to as string',
    cmd: "rg -n \"to:\\s*['\\\"][^'\\\"]+['\\\"]\\s+as string\" src/routes src/components src/hooks",
  },
  {
    label: 'Route cast: navigate to as string',
    cmd: "rg -n \"navigate\\(\\{[^}]*to:[^}]*as string\" src/routes src/components src/hooks",
  },
];

let hasFailures = false;

for (const check of checks) {
  try {
    const output = execSync(check.cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    if (output) {
      hasFailures = true;
      console.error(`\\n[FAIL] ${check.label}`);
      console.error(output);
    }
  } catch (error) {
    const output = String(error?.stdout ?? '').trim();
    if (output) {
      hasFailures = true;
      console.error(`\\n[FAIL] ${check.label}`);
      console.error(output);
    }
  }
}

if (hasFailures) {
  console.error('\\nRoute cast guard failed. Remove route-cast escapes before commit.');
  process.exit(1);
}

console.log('Route cast guard passed.');
