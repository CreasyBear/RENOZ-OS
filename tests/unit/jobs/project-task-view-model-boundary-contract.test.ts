import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task view model boundary contract', () => {
  it('keeps task enrichment, counting, filtering, sorting, and grouping outside the tab', () => {
    const tab = read('src/components/domain/jobs/projects/project-tasks-tab.tsx');
    const controller = read('src/components/domain/jobs/projects/project-tasks-tab-controller.ts');
    const viewModel = read('src/components/domain/jobs/projects/project-task-view-model.ts');

    expect(tab).toContain("from './project-tasks-tab-controller';");
    expect(tab).toContain('useProjectTasksTabController({');
    expect(tab).not.toContain("from './project-task-view-model';");
    expect(tab).not.toContain('buildProjectTaskViewModels({');
    expect(tab).not.toContain('filterProjectTasks({');
    expect(tab).not.toContain('groupProjectTasksByWorkstream({ tasks, workstreams })');
    expect(controller).toContain("from './project-task-view-model';");
    expect(controller).toContain('buildProjectTaskViewModels({');
    expect(controller).toContain('filterProjectTasks({');
    expect(controller).toContain('groupProjectTasksByWorkstream({ tasks, workstreams })');

    expect(tab).not.toContain('workstreamName: workstream?.name');
    expect(tab).not.toContain('const byStatus: Record<JobTaskStatus, number>');
    expect(tab).not.toContain('const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }');
    expect(tab).not.toContain('const groups = new Map<string, TaskWithWorkstream[]>');
    expect(tab).not.toContain("groups.set('Unassigned', [])");

    expect(viewModel).toContain('workstreamName: workstream?.name');
    expect(viewModel).toContain('const byStatus: Record<JobTaskStatus, number>');
    expect(viewModel).toContain('const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }');
    expect(viewModel).toContain('const groups = new Map<string, TaskWithWorkstream[]>');
    expect(viewModel).toContain("groups.set('Unassigned', [])");
  });
});
