/**
 * InventoryTableSkeleton Component
 *
 * Loading placeholder for inventory list/table views.
 */
import { cn } from '~/lib/utils';
import { Skeleton } from '~/components/ui/skeleton';

interface InventoryTableSkeletonProps {
  rows?: number;
  showFilters?: boolean;
  className?: string;
}

export function InventoryTableSkeleton({
  rows = 10,
  showFilters = true,
  className,
}: InventoryTableSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters bar */}
      {showFilters && (
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <div className="ml-auto">
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        {/* Header */}
        <div className="border-b bg-muted/50 p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
        </div>

        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={`inventory-row-${i}`}
            className="border-b last:border-0 p-4"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-8 ml-auto" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}
