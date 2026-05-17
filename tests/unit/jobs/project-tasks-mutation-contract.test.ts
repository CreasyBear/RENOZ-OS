import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatProjectTaskMutationError } from '@/hooks/jobs/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('project tasks mutation contract', () => {
  it('formats project task mutation failures without leaking unsafe internals', () => {
    expect(
      formatProjectTaskMutationError(
        new Error('duplicate key violates job_tasks_position_idx postgres stack'),
        'create'
      )
    ).toBe('Project task creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProjectTaskMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw auth detail' },
        'delete'
      )
    ).toBe('You do not have permission to manage project tasks.');

    expect(
      formatProjectTaskMutationError(
        {
          statusCode: 400,
          errors: {
            title: ['Task title is required'],
          },
        },
        'update'
      )
    ).toBe('Task title is required');
  });

  it('keeps project task mutations job-scoped, cache-safe, and operator-safe', () => {
    const tab = read('src/components/domain/jobs/projects/project-tasks-tab.tsx');
    const quickAdd = read('src/components/domain/jobs/projects/project-task-quick-add.ts');
    const deleteMutation = read('src/components/domain/jobs/projects/project-task-delete-mutation.ts');
    const statusMutation = read('src/components/domain/jobs/projects/project-task-status-mutation.ts');
    const reorderMutation = read('src/components/domain/jobs/projects/project-task-reorder-mutation.ts');
    const dialogs = read('src/components/domain/jobs/projects/task-dialogs.tsx');
    const createDialog = read('src/components/domain/jobs/projects/task-create-dialog.tsx');
    const createDialogForm = read('src/components/domain/jobs/projects/project-task-create-dialog-form.ts');
    const editDialog = read('src/components/domain/jobs/projects/task-edit-dialog.tsx');
    const hooks = read('src/hooks/jobs/use-job-tasks.ts');
    const jobsIndex = read('src/hooks/jobs/index.ts');
    const server = read('src/server/functions/jobs/job-tasks.ts');
    const schema = read('src/lib/schemas/jobs/job-tasks.ts');
    const compactTab = compact(tab);
    const compactDeleteMutation = compact(deleteMutation);
    const compactReorderMutation = compact(reorderMutation);
    const taskDialogMutationOwners = `${createDialogForm}\n${editDialog}`;
    const compactTaskDialogMutationOwners = compact(taskDialogMutationOwners);
    const compactHooks = compact(hooks);
    const compactServer = compact(server);
    const compactSchema = compact(schema);

    expect(quickAdd).toContain("formatProjectTaskMutationError(error, 'create')");
    expect(tab).not.toContain("formatProjectTaskMutationError(error, 'create')");
    expect(statusMutation).toContain("formatProjectTaskMutationError(error, 'status')");
    expect(tab).not.toContain("formatProjectTaskMutationError(error, 'status')");
    expect(deleteMutation).toContain("formatProjectTaskMutationError(error, 'delete')");
    expect(tab).not.toContain("formatProjectTaskMutationError(error, 'delete')");
    expect(reorderMutation).toContain("formatProjectTaskMutationError(error, 'reorder')");
    expect(tab).not.toContain("formatProjectTaskMutationError(error, 'reorder')");
    expect(tab).not.toContain("toastError('Failed to create task. Please try again.')");
    expect(tab).not.toContain("toast.error('Failed to update task')");
    expect(tab).not.toContain("toast.error('Failed to delete task')");
    expect(tab).not.toContain("toast.error('Failed to reorder tasks')");
    expect(compactDeleteMutation).toContain('constjobId=task.jobId;');
    expect(compactReorderMutation).toContain('jobId,');
    expect(compactTab).not.toContain("constjobId=task.siteVisitId||'';");
    expect(compactDeleteMutation).not.toContain("constjobId=task.siteVisitId||'';");
    expect(compactReorderMutation).not.toContain('jobId:firstTask.siteVisitId');

    expect(dialogs).toContain('TaskCreateDialog');
    expect(createDialog).toContain('useProjectTaskCreateDialogForm');
    expect(createDialogForm).toContain("formatProjectTaskMutationError(error, 'create')");
    expect(editDialog).toContain("formatProjectTaskMutationError(error, 'update')");
    expect(compactTaskDialogMutationOwners).toContain('jobId:task.jobId');
    expect(taskDialogMutationOwners).not.toContain("error instanceof Error ? error.message : 'Unknown error'");
    expect(taskDialogMutationOwners).not.toContain('toast.error(`Failed to create task: ${message}`)');
    expect(taskDialogMutationOwners).not.toContain('toast.error(`Failed to update task: ${message}`)');

    expect(jobsIndex).toContain('formatProjectTaskMutationError');
    expect(compactHooks).toContain('deleteTask({data:{taskId,jobId}})');
    expect(compactHooks).toContain('jobId:input.jobId');
    expect(hooks).toContain('queryKeys.jobTasks.list(variables.jobId)');

    expect(compactSchema).toContain(
      "updateTaskSchema=z.object({taskId:z.string().uuid('InvalidtaskIDformat'),jobId:z.string().uuid('InvalidjobIDformat').optional()"
    );
    expect(compactSchema).toContain(
      "deleteTaskSchema=z.object({taskId:z.string().uuid('InvalidtaskIDformat'),jobId:z.string().uuid('InvalidjobIDformat')"
    );

    expect(server).toContain('async function getOrCreateProjectTaskJob');
    expect(compactServer).toContain('eq(jobAssignments.migratedToProjectId,projectId)');
    expect(compactServer).toContain('projectId=siteVisit.projectId;');
    expect(compactServer).toContain(
      'jobId=awaitgetOrCreateProjectTaskJob(siteVisit.projectId,ctx.organizationId'
    );
    expect(compactServer).toContain('projectId:projectId??null');
    expect(server).not.toContain('temporary workaround');
    expect(server).not.toContain('SV-${siteVisit.visitNumber}');

    expect(server).toContain('if (data.jobId)');
    expect(compactServer).toContain('taskScope.push(eq(jobTasks.jobId,data.jobId))');
    expect(compactServer).toContain(
      'where(and(eq(jobTasks.id,data.taskId),eq(jobTasks.jobId,data.jobId),eq(jobTasks.organizationId,ctx.organizationId)))'
    );
    expect(compactServer).toContain('.returning({id:jobTasks.id})');
    expect(compactServer).toContain("thrownewNotFoundError('Tasknotfound')");
  });
});
