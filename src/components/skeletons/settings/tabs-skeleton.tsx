/**
 * Settings Tabs Skeleton
 *
 * Loading skeleton for settings pages with tabs layout.
 * Used for delegations and similar tabbed settings.
 */
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function SettingsTabsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Alert Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-center gap-4 py-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>

        {/* Card List */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 py-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
