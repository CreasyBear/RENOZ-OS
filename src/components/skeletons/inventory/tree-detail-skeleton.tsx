/**
 * TreeDetailSkeleton Component
 *
 * Loading placeholder for tree + detail panel views (locations).
 */
import { cn } from '~/lib/utils';
import { Skeleton } from '~/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '~/components/ui/card';

interface TreeDetailSkeletonProps {
  className?: string;
}

export function TreeDetailSkeleton({
  className,
}: TreeDetailSkeletonProps) {
  return (
    <div className={cn('grid gap-6 lg:grid-cols-[1fr,400px]', className)}>
      {/* Tree view */}
      <div className="border rounded-lg p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`tree-node-${i}`}
            className="flex items-center gap-2"
            style={{ paddingLeft: `${(i % 3) * 16}px` }}
          >
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-12 ml-auto" />
          </div>
        ))}
      </div>

      {/* Detail panel */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`detail-${i}`} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`item-${i}`} className="flex items-center justify-between p-2 border rounded">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
