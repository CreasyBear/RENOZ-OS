import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task summary cards boundary contract', () => {
  it('keeps task summary metrics behind a focused presenter', () => {
    const tab = read('src/components/domain/jobs/projects/project-tasks-tab.tsx');
    const summary = read('src/components/domain/jobs/projects/project-task-summary-cards.tsx');

    expect(tab).toContain("import { ProjectTaskSummaryCards } from './project-task-summary-cards';");
    expect(tab).toContain('<ProjectTaskSummaryCards tasks={allTasks} />');
    expect(tab).not.toContain('function TaskSummaryCards');
    expect(tab).not.toContain('Total Tasks</p>');
    expect(tab).not.toContain('Est. Hours</p>');
    expect(tab).not.toContain('Tasks need attention');

    expect(summary).toContain('export interface ProjectTaskSummaryCardsProps');
    expect(summary).toContain('export function ProjectTaskSummaryCards');
    expect(summary).toContain('tasks: TaskWithWorkstream[]');
    expect(summary).toContain('isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))');
    expect(summary).toContain('Total Tasks</p>');
    expect(summary).toContain('Est. Hours</p>');
    expect(summary).toContain('Tasks need attention');
  });
});
