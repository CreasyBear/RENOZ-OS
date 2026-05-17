import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task quick add boundary contract', () => {
  it('keeps quick-add mutation, cache invalidation, and error copy behind a focused hook', () => {
    const tab = read('src/components/domain/jobs/projects/project-tasks-tab.tsx');
    const controller = read('src/components/domain/jobs/projects/project-tasks-tab-controller.ts');
    const quickAdd = read('src/components/domain/jobs/projects/project-task-quick-add.ts');

    expect(tab).toContain("from './project-tasks-tab-controller';");
    expect(tab).not.toContain("import { useProjectTaskQuickAdd } from './project-task-quick-add';");
    expect(tab).not.toContain('useProjectTaskQuickAdd({');
    expect(controller).toContain("import { useProjectTaskQuickAdd } from './project-task-quick-add';");
    expect(controller).toContain('useProjectTaskQuickAdd({');
    expect(tab).toContain('isLoading={isQuickAddPending}');
    expect(tab).not.toContain('useCreateTask');
    expect(tab).not.toContain('toastError(');
    expect(tab).not.toContain('Add a site visit first to create tasks quickly');
    expect(tab).not.toContain("formatProjectTaskMutationError(error, 'create')");

    expect(quickAdd).toContain('useCreateTask');
    expect(quickAdd).toContain("from './project-task-quick-add-default';");
    expect(quickAdd).toContain('queryKeys.projectTasks.byProject(projectId)');
    expect(quickAdd).toContain('Add a site visit first to create tasks quickly');
    expect(quickAdd).toContain("formatProjectTaskMutationError(error, 'create')");
  });
});
