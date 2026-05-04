import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const guardScriptPath = path.resolve('scripts/check-read-path-query-guards.mjs');
const trackerPath = path.resolve('docs/reference/query-normalization-tracker.md');

const tempDirs: string[] = [];

function createTempRepo() {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'wave7a-read-guard-'));
  tempDirs.push(tempDir);
  mkdirSync(path.join(tempDir, 'src/hooks'), { recursive: true });
  mkdirSync(path.join(tempDir, 'docs/reliability/baselines'), { recursive: true });
  writeFileSync(
    path.join(tempDir, 'docs/reliability/baselines/read-path-query-guards.txt'),
    '',
    'utf8'
  );
  return tempDir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const tempDir = tempDirs.pop();
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
});

describe('wave 7a guard hardening', () => {
  it('blocks multiline raw null-sentinel read-hook patterns', () => {
    const tempDir = createTempRepo();
    writeFileSync(
      path.join(tempDir, 'src/hooks/use-temp.ts'),
      `
        import { useQuery } from '@tanstack/react-query';

        export function useTemp() {
          return useQuery({
            queryKey: ['temp'],
            queryFn: async () => {
              const result = await Promise.resolve(null);
              if (result == null) {
                throw new Error('Temp read returned no data');
              }
              return result;
            },
          });
        }
      `,
      'utf8'
    );

    let stderr = '';
    try {
      execFileSync('node', [guardScriptPath], {
        cwd: tempDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      stderr = String((error as { stderr?: string }).stderr ?? '');
    }

    expect(stderr).toContain('Read-path query guard failed');
    expect(stderr).toContain('src/hooks/use-temp.ts');
  });

  it('ignores raw null-sentinel checks in mutation hooks when no read queryFn matches', () => {
    const tempDir = createTempRepo();
    writeFileSync(
      path.join(tempDir, 'src/hooks/use-temp.ts'),
      `
        import { useMutation } from '@tanstack/react-query';

        export function useTempMutation() {
          return useMutation({
            mutationFn: async () => {
              const result = await Promise.resolve(null);
              if (result == null) {
                throw new Error('Temp mutation returned no data');
              }
              return result;
            },
          });
        }
      `,
      'utf8'
    );

    const output = execFileSync('node', [guardScriptPath], {
      cwd: tempDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    expect(output).toContain('Read-path query guard passed.');
  });

  it('records Wave 7 reconciliation in the tracker', () => {
    const trackerSource = readFileSync(trackerPath, 'utf8');

    expect(trackerSource).toContain('### Wave 7: Reconciliation + Deploy Cleanliness');
    expect(trackerSource).toContain('Wave 7 exists because Wave 6 closed under a narrower guard than reality.');
  });
});
