import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task status mutation boundary contract', () => {
  it('keeps status optimistic cache, rollback, and completion prompting behind a focused hook', () => {
    const tab = read('src/components/domain/jobs/projects/project-tasks-tab.tsx');
    const statusMutation = read('src/components/domain/jobs/projects/project-task-status-mutation.ts');

    expect(tab).toContain("import { useProjectTaskStatusMutation } from './project-task-status-mutation';");
    expect(tab).toContain('useProjectTaskStatusMutation({');
    expect(tab).not.toContain('useUpdateProjectTaskStatus');
    expect(tab).not.toContain('previousProjectTasks');
    expect(tab).not.toContain('queryKeys.projectTasks.byProject(projectId)');
    expect(tab).not.toContain("formatProjectTaskMutationError(error, 'status')");

    expect(statusMutation).toContain('useUpdateProjectTaskStatus(projectId)');
    expect(statusMutation).toContain('queryKeys.projectTasks.byProject(projectId)');
    expect(statusMutation).toContain('previousProjectTasks');
    expect(statusMutation).toContain("formatProjectTaskMutationError(error, 'status')");
    expect(statusMutation).toContain("toast.success('All tasks complete!'");
    expect(statusMutation).toContain("toast.success('Task completed')");
    expect(statusMutation).toContain("toast.success('Task reopened')");
  });
});
