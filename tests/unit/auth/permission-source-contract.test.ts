import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourceRoots = ['src/server/functions', 'src/routes', 'src/lib/server'];

function collectSourceFiles(dir: string): string[] {
  const absoluteDir = join(root, dir);
  return readdirSync(absoluteDir).flatMap((entry) => {
    const relativePath = join(dir, entry);
    const absolutePath = join(root, relativePath);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      return collectSourceFiles(relativePath);
    }

    return /\.(ts|tsx)$/.test(entry) ? [relativePath] : [];
  });
}

function readSource(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('permission source contract', () => {
  it('does not optional-chain canonical permission constants at auth boundaries', () => {
    const offenders = sourceRoots
      .flatMap(collectSourceFiles)
      .flatMap((path) => {
        const source = readSource(path);
        const matches = source.match(/PERMISSIONS\.[A-Za-z0-9_]+\?\.[A-Za-z0-9_]+/g);
        return matches?.map((match) => `${path}: ${match}`) ?? [];
      });

    expect(offenders).toEqual([]);
  });

  it('does not use raw string fallbacks for canonical permission constants', () => {
    const offenders = sourceRoots
      .flatMap(collectSourceFiles)
      .flatMap((path) => {
        const source = readSource(path);
        const matches = source.match(
          /permission:\s*PERMISSIONS\.[A-Za-z0-9_]+\.[A-Za-z0-9_]+\s*\?\?\s*['"][^'"]+['"]/g
        );
        return matches?.map((match) => `${path}: ${match}`) ?? [];
      });

    expect(offenders).toEqual([]);
  });

  it('does not pass raw permission strings to server-function auth checks', () => {
    const offenders = collectSourceFiles('src/server/functions')
      .flatMap((path) => {
        const source = readSource(path);
        const matches = source.match(/withAuth\(\{\s*permission:\s*['"][A-Za-z0-9_.:-]+['"]/g);
        return matches?.map((match) => `${path}: ${match}`) ?? [];
      });

    expect(offenders).toEqual([]);
  });
});
