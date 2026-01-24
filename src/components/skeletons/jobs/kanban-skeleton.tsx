/**
 * Jobs Kanban Board Skeleton
 *
 * Layout-preserving skeleton for the jobs kanban view.
 */
import { Skeleton } from '@/components/ui/skeleton'

const COLUMNS = ['To Do', 'In Progress', 'Review', 'Done']

export function JobsKanbanSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div
            key={col}
            className="flex-shrink-0 w-72 bg-muted/30 rounded-lg p-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            {Array.from({ length: col === 'In Progress' ? 3 : 2 }).map((_, i) => (
              <div key={i} className="bg-card rounded-lg border p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
