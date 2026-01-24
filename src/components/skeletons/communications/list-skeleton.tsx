/**
 * Communications List Skeleton
 *
 * Simple list skeleton for communications sub-routes.
 * Used inside the layout Outlet for list views.
 */
import { Skeleton } from '@/components/ui/skeleton'

export function CommunicationsListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Toolbar/filters row */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* List items */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border p-4 flex items-center justify-between"
          >
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
