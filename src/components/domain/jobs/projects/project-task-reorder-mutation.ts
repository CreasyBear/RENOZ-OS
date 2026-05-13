import { useCallback } from 'react';

import { formatProjectTaskMutationError } from '@/hooks/jobs/_mutation-errors';
import { useReorderTasks } from '@/hooks/jobs/use-job-tasks';
import { toast } from '@/lib/toast';
import { getProjectTaskReorderJobId } from './project-task-reorder-state';

import type { TaskWithWorkstream } from '@/lib/schemas/jobs';

export function useProjectTaskReorderMutation({
  tasks,
}: {
  tasks: readonly TaskWithWorkstream[];
}) {
  const reorderTasks = useReorderTasks();

  const handleReorderTasks = useCallback(
    async (taskIds: string[]) => {
      const jobId = getProjectTaskReorderJobId({ tasks, taskIds });
      if (!jobId) return;

      try {
        await reorderTasks.mutateAsync({
          jobId,
          taskIds,
        });
        toast.success('Task order updated');
      } catch (error) {
        toast.error(formatProjectTaskMutationError(error, 'reorder'));
      }
    },
    [reorderTasks, tasks]
  );

  return {
    handleReorderTasks,
  };
}
