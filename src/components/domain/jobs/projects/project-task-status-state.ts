import type { JobTaskStatus, TaskWithWorkstream } from '@/lib/schemas/jobs';

export function getNextProjectTaskStatus(status: JobTaskStatus): JobTaskStatus {
  return status === 'completed' ? 'pending' : 'completed';
}

export function willCompleteAllVisibleProjectTasks({
  tasks,
  toggledTaskId,
}: {
  tasks: readonly TaskWithWorkstream[];
  toggledTaskId: string;
}): boolean {
  return tasks.length > 0 &&
    tasks.every(task => (task.id === toggledTaskId ? true : task.status === 'completed'));
}
