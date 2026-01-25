import { JobTasksTab } from '@/components/domain/jobs';
import {
  useJobTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useReorderTasks,
  useToggleTaskStatus,
} from '@/hooks';
import type { JobTaskStatus } from '@/lib/schemas';

interface JobTasksTabContainerProps {
  jobId: string;
}

export function JobTasksTabContainer({ jobId }: JobTasksTabContainerProps) {
  const { data: tasks, isLoading, isError, error, refetch } = useJobTasks({ jobId });

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const reorderTasks = useReorderTasks();
  const toggleStatus = useToggleTaskStatus();

  return (
    <JobTasksTab
      tasks={tasks ?? []}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      onCreateTask={async (values) => {
        await createTask.mutateAsync({ jobId, priority: 'normal', ...values });
      }}
      onUpdateTask={async (taskId, values) => {
        await updateTask.mutateAsync({ taskId, ...values });
      }}
      onDeleteTask={async (taskId) => {
        await deleteTask.mutateAsync({ taskId, jobId });
      }}
      onReorderTasks={(taskIds) => reorderTasks.mutate({ jobId, taskIds })}
      onToggleStatus={(taskId, currentStatus: JobTaskStatus) =>
        toggleStatus.mutate({ taskId, currentStatus })
      }
      isSubmitting={createTask.isPending || updateTask.isPending}
      isReordering={reorderTasks.isPending}
      isTogglingStatus={toggleStatus.isPending}
    />
  );
}
