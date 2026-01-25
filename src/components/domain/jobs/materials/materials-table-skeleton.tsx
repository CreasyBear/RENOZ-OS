/**
 * Materials Table Skeleton
 *
 * Loading skeleton for the job materials table.
 * Displays placeholder rows while data is being fetched.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-002c
 */

import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// TYPES
// ============================================================================

export interface MaterialsTableSkeletonProps {
  /** Number of skeleton rows to display */
  count?: number;
}

// ============================================================================
// SKELETON ROW
// ============================================================================

function MaterialRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b p-4">
      {/* Product info */}
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Quantity required */}
      <div className="w-24 text-center">
        <Skeleton className="mx-auto h-4 w-16" />
      </div>

      {/* Quantity used */}
      <div className="w-24 text-center">
        <Skeleton className="mx-auto h-4 w-16" />
      </div>

      {/* Progress */}
      <div className="w-32">
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Unit cost */}
      <div className="w-24 text-right">
        <Skeleton className="ml-auto h-4 w-16" />
      </div>

      {/* Total cost */}
      <div className="w-24 text-right">
        <Skeleton className="ml-auto h-4 w-20" />
      </div>

      {/* Actions */}
      <div className="w-10">
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  );
}

// ============================================================================
// CARD SKELETON (Mobile)
// ============================================================================

function MaterialCardSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>

      {/* Progress bar */}
      <Skeleton className="h-2 w-full rounded-full" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TABLE SKELETON
// ============================================================================

export function MaterialsTableSkeleton({ count = 3 }: MaterialsTableSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Cost summary skeleton */}
      <div className="bg-muted/50 flex items-center gap-4 rounded-lg p-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Table skeleton - desktop */}
      <div className="hidden overflow-hidden rounded-lg border md:block">
        {/* Table header */}
        <div className="bg-muted/50 flex items-center gap-4 border-b p-4">
          <Skeleton className="h-4 w-24 flex-1" />
          <Skeleton className="h-4 w-16 text-center" />
          <Skeleton className="h-4 w-16 text-center" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <div className="w-10" />
        </div>

        {/* Table rows */}
        {Array.from({ length: count }).map((_, i) => (
          <MaterialRowSkeleton key={i} />
        ))}
      </div>

      {/* Card skeleton - mobile */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: count }).map((_, i) => (
          <MaterialCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Export individual components for reuse
export { MaterialRowSkeleton, MaterialCardSkeleton };
