import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { formatProjectTaskMutationError } from '@/hooks/jobs/_mutation-errors';
import { useCreateTask } from '@/hooks/jobs/use-job-tasks';
import { toastError } from '@/hooks';
import { queryKeys } from '@/lib/query-keys';
import {
  getDefaultProjectTaskSiteVisitId,
  type ProjectTaskQuickAddSiteVisit,
} from './project-task-quick-add-default';

export interface ProjectTaskQuickAddInput {
  title: string;
  description?: string;
}

export function useProjectTaskQuickAdd({
  projectId,
  siteVisits,
}: {
  projectId: string;
  siteVisits: readonly ProjectTaskQuickAddSiteVisit[];
}) {
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const defaultSiteVisitId = getDefaultProjectTaskSiteVisitId(siteVisits);

  const handleQuickAdd = useCallback(
    async (data: ProjectTaskQuickAddInput) => {
      if (!defaultSiteVisitId) {
        toastError('Add a site visit first to create tasks quickly, or use "Add Task" for full options.');
        return;
      }

      try {
        await createTask.mutateAsync({
          siteVisitId: defaultSiteVisitId,
          title: data.title,
          description: data.description,
          status: 'pending',
          priority: 'normal',
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectTasks.byProject(projectId),
        });
      } catch (error) {
        toastError(formatProjectTaskMutationError(error, 'create'));
      }
    },
    [createTask, defaultSiteVisitId, projectId, queryClient]
  );

  return {
    handleQuickAdd,
    isQuickAddPending: createTask.isPending,
  };
}
