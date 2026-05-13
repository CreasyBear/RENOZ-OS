import type { TaskWithWorkstream } from '@/lib/schemas/jobs';

export function getProjectTaskReorderJobId({
  tasks,
  taskIds,
}: {
  tasks: readonly TaskWithWorkstream[];
  taskIds: readonly string[];
}): string | null {
  const firstTask = tasks.find(task => task.id === taskIds[0]);
  return firstTask?.jobId ?? null;
}
