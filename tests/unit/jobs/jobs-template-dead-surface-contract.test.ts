import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('jobs template dead surface contract', () => {
  it('keeps migrated checklist UI out of the legacy jobs/templates barrel', () => {
    const templatesIndex = read('src/components/domain/jobs/templates/index.ts');
    const jobsIndex = read('src/components/domain/jobs/index.ts');
    const projectsIndex = read('src/components/domain/jobs/projects/index.ts');

    expect(
      existsSync(join(root, 'src/components/domain/jobs/templates/job-checklist-tab.tsx'))
    ).toBe(false);
    expect(
      existsSync(join(root, 'src/components/domain/jobs/templates/checklist-item-card.tsx'))
    ).toBe(false);
    expect(
      existsSync(join(root, 'src/components/domain/jobs/templates/apply-checklist-dialog.tsx'))
    ).toBe(false);

    expect(templatesIndex).toContain('JobTemplateFormDialog');
    expect(templatesIndex).toContain('JobTemplateList');
    expect(templatesIndex).not.toContain('JobChecklistTab');
    expect(templatesIndex).not.toContain('ChecklistItemCard');
    expect(templatesIndex).not.toContain('ApplyChecklistDialog');

    expect(jobsIndex).toContain("export { JobTemplateList } from './templates/job-template-list';");
    expect(jobsIndex).toContain(
      "export { JobTemplateFormDialog } from './templates/job-template-form-dialog';"
    );
    expect(jobsIndex).not.toContain('./templates/job-checklist-tab');
    expect(jobsIndex).not.toContain('./templates/checklist-item-card');
    expect(jobsIndex).not.toContain('./templates/apply-checklist-dialog');

    expect(projectsIndex).toContain("from './checklists'");
    expect(projectsIndex).toContain('ChecklistItemCard');
    expect(projectsIndex).toContain('ApplyChecklistDialog');
  });
});
