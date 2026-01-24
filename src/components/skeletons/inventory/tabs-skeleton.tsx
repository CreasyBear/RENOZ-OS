/**
 * InventoryTabsSkeleton Component
 *
 * Loading placeholder for inventory tabbed views (alerts, analytics, etc).
 */
import { cn } from '~/lib/utils';
import { Skeleton } from '~/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '~/components/ui/card';

interface InventoryTabsSkeletonProps {
  tabCount?: number;
  showMetrics?: boolean;
  className?: string;
}

export function InventoryTabsSkeleton({
  tabCount = 3,
  showMetrics = false,
  className,
}: InventoryTabsSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Metrics row */}
      {showMetrics && (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={`metric-${i}`}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-2">
          {Array.from({ length: tabCount }).map((_, i) => (
            <Skeleton key={`tab-${i}`} className="h-10 w-28" />
          ))}
        </div>
      </div>

      {/* Content area */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Table-like content */}
          <div className="rounded-lg border">
            <div className="border-b bg-muted/50 p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`row-${i}`} className="border-b last:border-0 p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-20 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
