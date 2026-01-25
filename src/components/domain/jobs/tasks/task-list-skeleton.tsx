/**
 * Task List Skeleton
 *
 * Loading placeholder for task list while data is being fetched.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-001c
 */

import { Skeleton } from '@/components/ui/skeleton';

interface TaskListSkeletonProps {
  /** Number of skeleton items to show */
  count?: number;
}

/**
 * Individual task card skeleton.
 */
function TaskCardSkeleton() {
  return (
    <div className="bg-card flex items-center gap-3 rounded-lg border p-4">
      {/* Drag handle placeholder */}
      <div className="flex flex-col gap-1">
        <Skeleton className="h-1 w-4" />
        <Skeleton className="h-1 w-4" />
        <Skeleton className="h-1 w-4" />
      </div>

      {/* Checkbox placeholder */}
      <Skeleton className="h-5 w-5 rounded" />

      {/* Content area */}
      <div className="flex-1 space-y-2">
        {/* Title */}
        <Skeleton className="h-4 w-3/4" />
        {/* Description (shorter) */}
        <Skeleton className="h-3 w-1/2" />
      </div>

      {/* Status badge placeholder */}
      <Skeleton className="h-6 w-16 rounded-full" />

      {/* Menu button placeholder */}
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  );
}

/**
 * Full task list skeleton for loading state.
 */
export function TaskListSkeleton({ count = 5 }: TaskListSkeletonProps) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading tasks" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading tasks...</span>
    </div>
  );
}

export { TaskCardSkeleton };
