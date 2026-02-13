/**
 * Pipeline Kanban Board Skeleton
 *
 * Layout-preserving skeleton for the pipeline kanban view.
 * Uses shared kanban skeletons with Square UI styling.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { Skeleton } from "@/components/ui/skeleton";
import { KanbanBoardSkeleton } from "@/components/shared/kanban";

const STAGES = ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

export function PipelineKanbanSkeleton() {
  return (
    <div className="space-y-6">
      {/* Quick Filter Chips Skeleton */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-lg" />
        ))}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Kanban Board - uses shared skeleton with Square UI styling */}
      <KanbanBoardSkeleton
        columnCount={STAGES.length}
        cardsPerColumn={[3, 2, 2, 2, 1, 1]}
        height="calc(100vh - 400px)"
      />
    </div>
  );
}
