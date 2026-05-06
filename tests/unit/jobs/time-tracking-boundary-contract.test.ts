import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function sourceFiles(dir: string): string[] {
  const absoluteDir = join(root, dir);
  if (!existsSync(absoluteDir)) return [];

  return readdirSync(absoluteDir).flatMap((entry) => {
    const path = join(dir, entry);
    const absolutePath = join(root, path);
    if (statSync(absolutePath).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

describe('project time tracking boundary', () => {
  it('keeps project time tracking owned by the projects domain', () => {
    const sidebar = read('src/components/domain/jobs/projects/sidebar/time-card.tsx');
    const projectTimeIndex = read('src/components/domain/jobs/projects/time-tracking/index.ts');
    const src = sourceFiles('src').map((path) => [path, read(path)] as const);

    expect(existsSync(join(root, 'src/components/domain/jobs/index.ts'))).toBe(false);
    expect(sourceFiles('src/components/domain/jobs/time')).toEqual([]);
    expect(sidebar).toContain("from '../time-tracking'");
    expect(projectTimeIndex).toContain('Project-domain components for project-scoped time tracking');

    for (const [path, source] of src) {
      expect(source, path).not.toContain('@/components/domain/jobs/time');
      expect(source, path).not.toContain('components/domain/jobs/time/');
      expect(source, path).not.toContain("from '../../time/");
    }
  });
});
