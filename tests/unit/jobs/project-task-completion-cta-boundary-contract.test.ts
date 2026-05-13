import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('project task completion CTA boundary contract', () => {
  it('keeps the all-tasks-complete CTA behind a focused presenter', () => {
    const tab = read('src/components/domain/jobs/projects/project-tasks-tab.tsx');
    const cta = read('src/components/domain/jobs/projects/project-task-completion-cta.tsx');
    const compactTab = compact(tab);
    const compactCta = compact(cta);

    expect(tab).toContain("import { ProjectTaskCompletionCta } from './project-task-completion-cta';");
    expect(tab).toContain('<ProjectTaskCompletionCta onCompleteProjectClick={onCompleteProjectClick} />');
    expect(tab).toContain("toast.success('All tasks complete!'");
    expect(compactTab).not.toContain('Alltaskscomplete</p>');
    expect(tab).not.toContain('Ready to complete this project?');
    expect(compactTab).not.toContain('Completeproject</Button>');

    expect(cta).toContain('export interface ProjectTaskCompletionCtaProps');
    expect(cta).toContain('export function ProjectTaskCompletionCta');
    expect(compactCta).toContain('Alltaskscomplete</p>');
    expect(cta).toContain('Ready to complete this project?');
    expect(cta).toContain('Complete project');
  });
});
