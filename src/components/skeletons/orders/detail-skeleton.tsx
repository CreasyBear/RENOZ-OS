/**
 * Order Detail Skeleton
 *
 * Layout-preserving skeleton for order detail view.
 */
import { Skeleton } from '@/components/ui/skeleton'

export function OrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {['Overview', 'Items', 'Fulfillment', 'Activity'].map((tab) => (
            <Skeleton key={tab} className="h-10 w-24" />
          ))}
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order items */}
          <div className="rounded-lg border p-6 space-y-4">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
            <div className="flex justify-end pt-4">
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>

          {/* Shipping */}
          <div className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>

          {/* Timeline */}
          <div className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-5 w-20" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
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
