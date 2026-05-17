import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('package script runtime contract', () => {
  it('keeps repo gates runnable without chaining through bun run', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts.test).toBe('vitest run');
    expect(packageJson.scripts.predeploy).toContain('npm run lint');
    expect(packageJson.scripts.predeploy).toContain('npm run typecheck');
    expect(packageJson.scripts['release:verify']).toContain('npm run test:release-hardening');

    for (const [name, command] of Object.entries(packageJson.scripts)) {
      expect(command, `${name} should not chain through bun run`).not.toMatch(/\bbun run\b/);
    }
  });

  it('keeps deploy guards on the package-script fallback path', () => {
    const deploy = read('scripts/deploy-with-guards.mjs');

    expect(deploy).toContain("await run('npm', ['run', 'test:release-hardening'])");
    expect(deploy).toContain("await run('npm', ['run', 'reliability:release-gates'])");
    expect(deploy).toContain("await run('npm', ['run', 'build:vercel'])");
    expect(deploy).toContain('VERCEL_BIN');
    expect(deploy).not.toMatch(/await run\('bun'/);
    expect(deploy).not.toContain("['x', 'vercel'");
  });

  it('documents npm run as the maintainer package-script entrypoint', () => {
    const processDoc = read('docs/reference/maintainer-sprint-process.md');
    const scriptsDoc = read('scripts/README.md');

    expect(processDoc).toContain('npm run lint');
    expect(processDoc).toContain('npm run typecheck');
    expect(processDoc).toContain('Use `npm run` for package-script orchestration');
    expect(scriptsDoc).toContain('Use `npm run` for package-script orchestration');
    expect(scriptsDoc).toContain('scripts should not chain through `bun run`');
  });
});
