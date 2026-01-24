/**
 * Settings Cards Skeleton
 *
 * Loading skeleton for settings pages with multiple card sections.
 * Used for preferences, security, and similar multi-section settings.
 */
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface SettingsCardsSkeletonProps {
  /** Number of card sections to show */
  sections?: number;
  /** Show sidebar navigation */
  showSidebar?: boolean;
}

export function SettingsCardsSkeleton({
  sections = 4,
  showSidebar = false,
}: SettingsCardsSkeletonProps) {
  return (
    <div className="container py-6">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className={showSidebar ? 'flex gap-6' : ''}>
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-48 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        )}

        {/* Cards */}
        <div className="flex-1 space-y-6">
          {Array.from({ length: sections }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-9 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
