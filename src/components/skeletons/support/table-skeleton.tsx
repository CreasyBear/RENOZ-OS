/**
 * Support Table Skeleton
 *
 * Loading skeleton for support list pages (issues, warranties, claims, RMAs).
 */
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SupportTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[140px]" />
        <Skeleton className="h-10 w-[140px]" />
        <Skeleton className="h-10 w-[180px]" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="flex items-center gap-4 border-b p-4">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="hidden h-4 w-[100px] md:block" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="hidden h-4 w-[100px] lg:block" />
            <Skeleton className="hidden h-4 w-[80px] md:block" />
          </div>

          {/* Table Rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
              <Skeleton className="h-5 w-[100px]" />
              <Skeleton className="h-5 w-[200px]" />
              <Skeleton className="hidden h-5 w-[100px] md:block" />
              <Skeleton className="h-6 w-[80px]" />
              <Skeleton className="h-6 w-[80px]" />
              <Skeleton className="hidden h-5 w-[100px] lg:block" />
              <Skeleton className="hidden h-5 w-[80px] md:block" />
            </div>
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t p-4">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
