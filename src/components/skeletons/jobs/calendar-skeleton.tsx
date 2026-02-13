/**
 * Jobs Calendar Skeleton
 *
 * Layout-preserving skeleton for the jobs calendar view.
 *
 * @deprecated Use schedule loading state or ScheduleDashboard skeleton instead.
 * This component is unused. The schedule calendar uses its own loading UI.
 */
import { Skeleton } from '@/components/ui/skeleton'

export function JobsCalendarSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-10" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg">
        {/* Week days header */}
        <div className="grid grid-cols-7 border-b">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="p-3 text-center border-r last:border-r-0">
              <Skeleton className="h-4 w-8 mx-auto" />
            </div>
          ))}
        </div>

        {/* Calendar rows */}
        {Array.from({ length: 5 }).map((_, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b last:border-b-0">
            {Array.from({ length: 7 }).map((_, dayIdx) => (
              <div
                key={dayIdx}
                className="min-h-24 p-2 border-r last:border-r-0 space-y-1"
              >
                <Skeleton className="h-4 w-6" />
                {(weekIdx + dayIdx) % 3 === 0 && (
                  <Skeleton className="h-6 w-full rounded" />
                )}
                {(weekIdx + dayIdx) % 4 === 0 && (
                  <Skeleton className="h-6 w-full rounded" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
