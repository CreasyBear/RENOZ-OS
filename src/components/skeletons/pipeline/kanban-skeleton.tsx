/**
 * Pipeline Kanban Board Skeleton
 *
 * Layout-preserving skeleton for the pipeline kanban view.
 * Matches: metrics row + filter bar + kanban columns
 */
import { Skeleton } from '@/components/ui/skeleton'

const STAGES = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']

export function PipelineKanbanSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Kanban Board Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="flex-shrink-0 w-72 bg-muted/30 rounded-lg p-3 space-y-3"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>

            {/* Cards */}
            {Array.from({ length: stage === 'New' ? 3 : stage === 'Won' ? 1 : 2 }).map((_, i) => (
              <div key={i} className="bg-card rounded-lg border p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
