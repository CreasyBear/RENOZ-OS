/**
 * CustomerTableSkeleton Component
 *
 * Loading placeholder for customer list views.
 */
import { cn } from '~/lib/utils';
import { Skeleton } from '~/components/ui/skeleton';

interface CustomerTableSkeletonProps {
  rows?: number;
  className?: string;
}

export function CustomerTableSkeleton({
  rows = 10,
  className,
}: CustomerTableSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters bar */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <div className="ml-auto">
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="border-b bg-muted/50 p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={`customer-row-${i}`} className="border-b last:border-0 p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-16" />
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
        </div>
      </div>
    </div>
  );
}
