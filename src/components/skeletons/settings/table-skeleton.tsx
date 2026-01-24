/**
 * Settings Table Skeleton
 *
 * Loading skeleton for settings pages with table layout.
 * Used for API tokens, delegations, and similar tabular settings.
 */
import { Skeleton } from '@/components/ui/skeleton';

export function SettingsTableSkeleton() {
  return (
    <div className="max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        {/* Table Header */}
        <div className="flex items-center gap-4 border-b bg-gray-50 px-4 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>

        {/* Table Rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b px-4 py-3 last:border-0"
          >
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="ml-auto h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
