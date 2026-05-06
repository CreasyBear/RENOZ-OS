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

describe('jobs template dead surface contract', () => {
  it('keeps job template settings UI out of the broad jobs barrel and old templates path', () => {
    const templateSettingsIndex = read('src/components/domain/jobs/job-templates/index.ts');
    const projectsIndex = read('src/components/domain/jobs/projects/index.ts');
    const route = read('src/routes/_authenticated/settings/job-templates.tsx');

    expect(existsSync(join(root, 'src/components/domain/jobs/index.ts'))).toBe(false);
    expect(sourceFiles('src/components/domain/jobs/templates')).toEqual([]);
    expect(
      existsSync(join(root, 'src/components/domain/jobs/templates/job-checklist-tab.tsx'))
    ).toBe(false);
    expect(
      existsSync(join(root, 'src/components/domain/jobs/templates/checklist-item-card.tsx'))
    ).toBe(false);
    expect(
      existsSync(join(root, 'src/components/domain/jobs/templates/apply-checklist-dialog.tsx'))
    ).toBe(false);

    expect(templateSettingsIndex).toContain('JobTemplateFormDialog');
    expect(templateSettingsIndex).toContain('JobTemplateList');
    expect(templateSettingsIndex).not.toContain('JobChecklistTab');
    expect(templateSettingsIndex).not.toContain('ChecklistItemCard');
    expect(templateSettingsIndex).not.toContain('ApplyChecklistDialog');

    expect(route).toContain("from '@/components/domain/jobs/job-templates'");
    expect(route).not.toContain("from '@/components/domain/jobs';");
    expect(route).not.toContain('from "@/components/domain/jobs";');

    expect(projectsIndex).toContain("from './checklists'");
    expect(projectsIndex).toContain('ChecklistItemCard');
    expect(projectsIndex).toContain('ApplyChecklistDialog');
  });
});
