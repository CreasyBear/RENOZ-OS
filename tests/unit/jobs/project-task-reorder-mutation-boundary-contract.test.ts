import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task reorder mutation boundary contract', () => {
  it('keeps reorder job-scope lookup and mutation feedback behind a focused hook', () => {
    const tab = read('src/components/domain/jobs/projects/project-tasks-tab.tsx');
    const reorderMutation = read('src/components/domain/jobs/projects/project-task-reorder-mutation.ts');
    const reorderState = read('src/components/domain/jobs/projects/project-task-reorder-state.ts');

    expect(tab).toContain("import { useProjectTaskReorderMutation } from './project-task-reorder-mutation';");
    expect(tab).toContain('useProjectTaskReorderMutation({ tasks })');
    expect(tab).toContain('onReorderTasks={handleReorderTasks}');
    expect(tab).not.toContain('useReorderTasks');
    expect(tab).not.toContain('firstTask?.jobId');
    expect(tab).not.toContain("formatProjectTaskMutationError(error, 'reorder')");

    expect(reorderMutation).toContain('useReorderTasks');
    expect(reorderMutation).toContain('getProjectTaskReorderJobId({ tasks, taskIds })');
    expect(reorderMutation).toContain('jobId,');
    expect(reorderMutation).toContain("toast.success('Task order updated')");
    expect(reorderMutation).toContain("formatProjectTaskMutationError(error, 'reorder')");
    expect(reorderState).toContain('return firstTask?.jobId ?? null');
  });
});
