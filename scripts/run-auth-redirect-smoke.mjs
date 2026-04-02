#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.AUTH_SMOKE_PORT || '3010';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const START_TIMEOUT_MS = 45_000;

function startServer() {
  const child = spawn('npx', ['vite', '--host', '127.0.0.1', '--strictPort', '--port', PORT], {
    cwd: ROOT,
    shell: false,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let logs = '';
  child.stdout.on('data', (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    logs += chunk.toString();
  });

  return { child, getLogs: () => logs };
}

async function stopServer(child) {
  if (child.killed || child.exitCode !== null) return;

  child.kill('SIGTERM');
  const result = await Promise.race([
    once(child, 'exit').then(() => 'exited'),
    delay(5_000).then(() => 'timeout'),
  ]);

  if (result === 'timeout' && child.exitCode === null) {
    child.kill('SIGKILL');
    await once(child, 'exit');
  }
}

async function waitForServer(getLogs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < START_TIMEOUT_MS) {
    try {
      const response = await fetch(`${BASE_URL}/login`, {
        redirect: 'manual',
        headers: { accept: 'text/html' },
      });

      if (response.status > 0) {
        return;
      }
    } catch {
      // server not ready yet
    }

    await delay(500);
  }

  throw new Error(`Auth smoke server did not become ready in time.\n${getLogs()}`);
}

async function request(pathname) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    redirect: 'manual',
    headers: { accept: 'text/html' },
  });

  return {
    status: response.status,
    location: response.headers.get('location'),
  };
}

function expectResponse(actual, expected, label) {
  const locationMatches =
    expected.location === undefined || actual.location === expected.location;

  if (actual.status !== expected.status || !locationMatches) {
    throw new Error(
      [
        `Auth redirect smoke failed at ${label}.`,
        `Expected: status=${expected.status} location=${expected.location ?? '<none>'}`,
        `Received: status=${actual.status} location=${actual.location ?? '<none>'}`,
      ].join('\n')
    );
  }
}

const { child, getLogs } = startServer();

try {
  await waitForServer(getLogs);

  expectResponse(await request('/login'), { status: 200 }, 'fresh /login');
  expectResponse(
    await request('/customers'),
    {
      status: 307,
      location: '/customers?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc',
    },
    'initial /customers redirect'
  );
  expectResponse(
    await request('/customers?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc'),
    {
      status: 307,
      location: '/login?redirect=%2Fcustomers',
    },
    'normalized /customers redirect to login'
  );
  expectResponse(
    await request('/login?redirect=%2Fcustomers'),
    { status: 200 },
    'login page after anonymous protected-route redirect'
  );
  expectResponse(
    await request('/login'),
    { status: 200 },
    'repeated /login after protected-route redirect'
  );
  expectResponse(await request('/logout'), { status: 200 }, 'direct /logout');
} finally {
  await stopServer(child);
}
