import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { formatProjectTaskMutationError } from '@/hooks/jobs/_mutation-errors';
import { useUpdateProjectTaskStatus } from '@/hooks/jobs/use-project-tasks';
import { toast } from '@/lib/toast';
import { queryKeys } from '@/lib/query-keys';
import {
  getNextProjectTaskStatus,
  willCompleteAllVisibleProjectTasks,
} from './project-task-status-state';

import type {
  ProjectTaskResponse,
  TaskWithWorkstream,
} from '@/lib/schemas/jobs';

export function useProjectTaskStatusMutation({
  projectId,
  tasks,
  onCompleteProjectClick,
}: {
  projectId: string;
  tasks: readonly TaskWithWorkstream[];
  onCompleteProjectClick?: () => void;
}) {
  const queryClient = useQueryClient();
  const updateStatus = useUpdateProjectTaskStatus(projectId);

  const handleToggleTask = useCallback(
    async (task: TaskWithWorkstream) => {
      const newStatus = getNextProjectTaskStatus(task.status);

      const projectTasksKey = queryKeys.projectTasks.byProject(projectId);
      const previousProjectTasks = queryClient.getQueryData<{ tasks: ProjectTaskResponse[] }>(projectTasksKey);
      if (previousProjectTasks) {
        queryClient.setQueryData(projectTasksKey, {
          tasks: previousProjectTasks.tasks.map(previousTask =>
            previousTask.id === task.id ? { ...previousTask, status: newStatus } : previousTask
          ),
        });
      }

      try {
        await updateStatus.mutateAsync({
          taskId: task.id,
          jobId: task.jobId,
          status: newStatus,
        });
        if (newStatus === 'completed') {
          const allComplete = willCompleteAllVisibleProjectTasks({
            tasks,
            toggledTaskId: task.id,
          });
          if (allComplete && onCompleteProjectClick) {
            toast.success('All tasks complete!', {
              action: {
                label: 'Complete project',
                onClick: onCompleteProjectClick,
              },
            });
          } else {
            toast.success('Task completed');
          }
        } else {
          toast.success('Task reopened');
        }
      } catch (error) {
        if (previousProjectTasks) {
          queryClient.setQueryData(projectTasksKey, previousProjectTasks);
        }
        toast.error(formatProjectTaskMutationError(error, 'status'));
      }
    },
    [onCompleteProjectClick, projectId, queryClient, tasks, updateStatus]
  );

  return {
    handleToggleTask,
  };
}
