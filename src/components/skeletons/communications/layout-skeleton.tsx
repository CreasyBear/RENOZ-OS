/**
 * Communications Layout Skeleton
 *
 * Full layout skeleton for the main communications route.
 * Shows tabs navigation + content area placeholder.
 */
import { Skeleton } from '@/components/ui/skeleton'

export function CommunicationsLayoutSkeleton() {
  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="border-b">
        <div className="flex gap-1 -mb-px">
          {['Campaigns', 'Emails', 'Calls', 'Templates', 'Signatures', 'Settings'].map((tab) => (
            <Skeleton key={tab} className="h-10 w-28" />
          ))}
        </div>
      </div>

      {/* Content placeholder */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
