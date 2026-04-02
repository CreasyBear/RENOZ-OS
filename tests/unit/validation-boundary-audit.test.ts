import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const serverFunctionsRoot = path.join(repoRoot, 'src/server/functions');

function collectServerFunctionFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectServerFunctionFiles(absolutePath);
    }

    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      return [absolutePath];
    }

    return [];
  });
}

const serverFunctionFiles = collectServerFunctionFiles(serverFunctionsRoot);

const riskyGetValidatorPatterns = [
  {
    name: 'raw shared id params on GET',
    pattern:
      /createServerFn\(\{\s*method:\s*['"]GET['"]\s*\}\)[\s\S]{0,240}?\.inputValidator\(idParamSchema\)/g,
  },
  {
    name: 'raw shared pagination on GET',
    pattern:
      /createServerFn\(\{\s*method:\s*['"]GET['"]\s*\}\)[\s\S]{0,240}?\.inputValidator\((paginationSchema|cursorPaginationSchema)\)/g,
  },
  {
    name: 'inline raw z.object GET validator',
    pattern:
      /createServerFn\(\{\s*method:\s*['"]GET['"]\s*\}\)[\s\S]{0,240}?\.inputValidator\(z\.object\(/g,
  },
  {
    name: 'inline ad-hoc z.preprocess GET validator',
    pattern:
      /createServerFn\(\{\s*method:\s*['"]GET['"]\s*\}\)[\s\S]{0,240}?\.inputValidator\(z\.preprocess\(/g,
  },
  {
    name: 'schema.parse passed to GET inputValidator',
    pattern:
      /createServerFn\(\{\s*method:\s*['"]GET['"]\s*\}\)[\s\S]{0,240}?\.inputValidator\([A-Za-z0-9_]+Schema\.parse\)/g,
  },
];

const riskyLocalSchemaPatterns = [
  {
    name: 'server-local ad-hoc preprocess query schema',
    pattern: /const\s+[A-Za-z0-9_]+Schema\s*=\s*z\.preprocess\(/g,
  },
];

const implicitMethodWithValidatorPattern = /createServerFn\(\)\s*\.inputValidator\(/g;

describe('validation boundary audit', () => {
  it('does not rely on implicit createServerFn methods when validators are present', () => {
    const matches: string[] = [];

    for (const absolutePath of serverFunctionFiles) {
      const source = fs.readFileSync(absolutePath, 'utf8');
      const relativePath = path.relative(repoRoot, absolutePath);

      for (const match of source.matchAll(implicitMethodWithValidatorPattern)) {
        matches.push(`${relativePath}: ${match[0]}`);
      }
    }

    expect(matches).toEqual([]);
  });

  it('does not use raw GET object-root validators at server boundaries', () => {
    const matches: string[] = [];

    for (const absolutePath of serverFunctionFiles) {
      const source = fs.readFileSync(absolutePath, 'utf8');
      const relativePath = path.relative(repoRoot, absolutePath);

      for (const { name, pattern } of riskyGetValidatorPatterns) {
        for (const match of source.matchAll(pattern)) {
          matches.push(`${relativePath}: ${name}: ${match[0]}`);
        }
      }
    }

    expect(matches).toEqual([]);
  });

  it('does not define ad-hoc preprocess query helpers in server/functions', () => {
    const matches: string[] = [];

    for (const absolutePath of serverFunctionFiles) {
      const source = fs.readFileSync(absolutePath, 'utf8');
      const relativePath = path.relative(repoRoot, absolutePath);

      for (const { name, pattern } of riskyLocalSchemaPatterns) {
        for (const match of source.matchAll(pattern)) {
          matches.push(`${relativePath}: ${name}: ${match[0]}`);
        }
      }
    }

    expect(matches).toEqual([]);
  });
});
