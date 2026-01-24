/**
 * Settings Tree Skeleton
 *
 * Loading skeleton for settings pages with tree visualization.
 * Used for categories and hierarchical settings.
 */
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function SettingsTreeSkeleton() {
  return (
    <div className="container space-y-6 py-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Tree Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Level 1 items */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="ml-auto h-6 w-6" />
              </div>
              {/* Level 2 items (nested) */}
              {i < 2 && (
                <div className="ml-6 space-y-2">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="ml-auto h-6 w-6" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
