import { useCallback, useEffect, useRef, useState } from 'react';

import { formatProjectTaskMutationError } from '@/hooks/jobs/_mutation-errors';
import { useDeleteProjectTask } from '@/hooks/jobs/use-project-tasks';
import { toast } from '@/lib/toast';
import {
  addProjectTaskPendingDeletion,
  removeProjectTaskPendingDeletion,
} from './project-task-delete-state';

import type { TaskWithWorkstream } from '@/lib/schemas/jobs';

const PROJECT_TASK_DELETE_UNDO_MS = 5000;

export function useProjectTaskDeleteMutation({
  projectId,
  onDeleted,
}: {
  projectId: string;
  onDeleted?: () => unknown;
}) {
  const deleteTask = useDeleteProjectTask(projectId);
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set());
  const deleteTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timeouts = deleteTimeouts.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  const removePendingDeletion = useCallback((taskId: string) => {
    setPendingDeletions((prev) =>
      removeProjectTaskPendingDeletion({ pendingDeletions: prev, taskId })
    );
  }, []);

  const clearDeleteTimeout = useCallback((taskId: string) => {
    const timeout = deleteTimeouts.current.get(taskId);
    if (!timeout) return;

    clearTimeout(timeout);
    deleteTimeouts.current.delete(taskId);
  }, []);

  const handleDeleteTask = useCallback(
    (task: TaskWithWorkstream) => {
      const taskId = task.id;
      const jobId = task.jobId;

      setPendingDeletions((prev) =>
        addProjectTaskPendingDeletion({ pendingDeletions: prev, taskId })
      );

      const timeoutId = setTimeout(async () => {
        deleteTimeouts.current.delete(taskId);

        try {
          await deleteTask.mutateAsync({ taskId, jobId });
          removePendingDeletion(taskId);
          onDeleted?.();
        } catch (error) {
          removePendingDeletion(taskId);
          toast.error(formatProjectTaskMutationError(error, 'delete'));
        }
      }, PROJECT_TASK_DELETE_UNDO_MS);

      deleteTimeouts.current.set(taskId, timeoutId);

      toast.success(`Task "${task.title}" deleted`, {
        duration: PROJECT_TASK_DELETE_UNDO_MS,
        action: {
          label: 'Undo',
          onClick: () => {
            clearDeleteTimeout(taskId);
            removePendingDeletion(taskId);
            toast.info('Task restored');
          },
        },
      });
    },
    [clearDeleteTimeout, deleteTask, onDeleted, removePendingDeletion]
  );

  return {
    pendingDeletions,
    handleDeleteTask,
  };
}
