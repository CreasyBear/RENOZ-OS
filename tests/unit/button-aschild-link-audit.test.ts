import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const componentsRoot = path.join(repoRoot, 'src/components');

function collectComponentFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectComponentFiles(absolutePath);
    }

    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      return [absolutePath];
    }

    return [];
  });
}

const componentFiles = collectComponentFiles(componentsRoot);
const riskyButtonAsChildLinkPattern =
  /<Button\b[^>]*\basChild\b[^>]*>\s*<\s*([A-Z][A-Za-z0-9]*Link)\b/g;

describe('Button asChild link audit', () => {
  it('does not wrap router or custom link components with Button asChild', () => {
    const offenders: string[] = [];

    for (const absolutePath of componentFiles) {
      const source = fs.readFileSync(absolutePath, 'utf8');
      const relativePath = path.relative(repoRoot, absolutePath);

      for (const match of source.matchAll(riskyButtonAsChildLinkPattern)) {
        offenders.push(`${relativePath}: ${match[1]}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
