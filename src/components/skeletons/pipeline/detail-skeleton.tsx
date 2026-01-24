/**
 * Pipeline Opportunity Detail Skeleton
 *
 * Layout-preserving skeleton for opportunity detail view.
 * Matches: header info + tabs + content sections
 */
import { Skeleton } from '@/components/ui/skeleton'

export function PipelineDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header info row */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {['Overview', 'Quote', 'Activities', 'Versions'].map((tab) => (
            <Skeleton key={tab} className="h-10 w-24" />
          ))}
        </div>
      </div>

      {/* Content - Overview layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="rounded-lg border p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          </div>

          {/* Quote Preview Card */}
          <div className="rounded-lg border p-6 space-y-4">
            <Skeleton className="h-5 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
            <div className="border-t pt-4 flex justify-end">
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-36" />
          </div>

          {/* Contact Card */}
          <div className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-40" />
          </div>

          {/* Timeline Card */}
          <div className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-5 w-28" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
