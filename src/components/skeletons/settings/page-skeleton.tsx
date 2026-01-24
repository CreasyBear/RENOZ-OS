/**
 * Settings Page Skeleton
 *
 * Loading skeleton for settings pages using PageLayout with header + content.
 * Used for templates, targets, and similar list-based settings.
 */
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function SettingsPageSkeleton() {
  return (
    <div className="container space-y-6 py-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Content List */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b pb-4 last:border-0"
            >
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
