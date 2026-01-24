/**
 * Job Assignment Detail Skeleton
 *
 * Layout-preserving skeleton for job assignment detail view.
 */
import { Skeleton } from '@/components/ui/skeleton'

export function JobAssignmentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {['Tasks', 'Documents', 'Materials', 'Time', 'Checklist'].map((tab) => (
            <Skeleton key={tab} className="h-10 w-24" />
          ))}
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-48" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4 ml-8" />
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-5 w-28" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
