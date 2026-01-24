/**
 * Jobs Timeline Skeleton
 *
 * Layout-preserving skeleton for the jobs timeline/Gantt view.
 */
import { Skeleton } from '@/components/ui/skeleton'

export function JobsTimelineSkeleton() {
  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-10" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Timeline grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Date header row */}
        <div className="flex border-b bg-muted/30">
          <div className="w-48 p-3 border-r">
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex-1 flex">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 p-3 text-center border-r last:border-r-0">
                <Skeleton className="h-4 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Timeline rows */}
        {Array.from({ length: 6 }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex border-b last:border-b-0">
            <div className="w-48 p-3 border-r flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex-1 flex relative min-h-16">
              {/* Grid lines */}
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 border-r last:border-r-0" />
              ))}
              {/* Job bar placeholder */}
              {rowIdx % 2 === 0 && (
                <div
                  className="absolute top-2 h-8"
                  style={{
                    left: `${(rowIdx * 15) % 40}%`,
                    width: `${30 + (rowIdx * 10) % 30}%`,
                  }}
                >
                  <Skeleton className="h-full w-full rounded" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
