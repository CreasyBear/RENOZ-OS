/**
 * Calendar Skeleton Component
 *
 * Loading skeleton for the job calendar that matches the actual calendar layout.
 * Prevents layout shift and provides visual feedback during data loading.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function CalendarSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-10" />
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex items-center gap-4 rounded-lg border p-4">
        <Skeleton className="h-4 w-16" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-18" />
        </div>
        <Skeleton className="ml-auto h-4 w-12" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>

      {/* Calendar Container Skeleton */}
      <div className="overflow-hidden rounded-lg border">
        {/* Calendar Header */}
        <div className="bg-muted/50 flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-8" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-16" />
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-border grid grid-cols-7 gap-px">
          {/* Day Headers */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`header-${i}`} className="bg-background p-3 text-center">
              <Skeleton className="mx-auto h-4 w-8" />
            </div>
          ))}

          {/* Calendar Cells */}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={`cell-${i}`} className="bg-background min-h-[120px] p-2">
              <Skeleton className="mb-2 h-4 w-4" />
              {/* Random number of events per cell */}
              {Math.random() > 0.7 && (
                <div className="space-y-1">
                  {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, j) => (
                    <Skeleton key={`event-${i}-${j}`} className="h-3 w-full rounded" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar Skeleton */}
      <Card className="w-80">
        <div className="border-b p-4">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`job-${i}`} className="space-y-2 rounded-lg border p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/**
 * Timeline Skeleton Component
 */
export function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      {/* Timeline Container */}
      <div className="overflow-hidden rounded-lg border">
        {/* Timeline Header */}
        <div className="bg-muted/50 flex border-b">
          <div className="w-48 border-r p-4">
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex-1 p-4">
            <div className="flex justify-between">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={`day-${i}`} className="text-center">
                  <Skeleton className="mx-auto mb-1 h-4 w-8" />
                  <Skeleton className="mx-auto h-3 w-6" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Rows */}
        <div className="divide-y">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={`row-${i}`} className="flex">
              <div className="w-48 border-r p-4">
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="relative flex-1">
                {/* Timeline bars */}
                {Math.random() > 0.6 && (
                  <div
                    className="bg-primary/20 border-primary/30 absolute top-2 h-6 rounded border"
                    style={{
                      left: `${Math.random() * 60}%`,
                      width: `${Math.random() * 30 + 10}%`,
                    }}
                  >
                    <Skeleton className="h-full w-full rounded opacity-50" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Kanban Skeleton Component
 */
export function KanbanSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`column-${i}`} className="w-80 flex-shrink-0">
            <Card>
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-6" />
                </div>
              </div>
              <div className="space-y-3 p-4">
                {Array.from({ length: Math.floor(Math.random() * 5) + 2 }).map((_, j) => (
                  <Card key={`card-${i}-${j}`} className="p-4">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <div className="flex items-center justify-between pt-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Job Detail Skeleton Component
 */
export function JobDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      {/* Job Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-18" />
              <Skeleton className="h-5 w-28" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-28" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-6 w-18" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Skeleton */}
      <div className="border-b">
        <div className="flex gap-6">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-18" />
          <Skeleton className="h-10 w-22" />
          <Skeleton className="h-10 w-16" />
        </div>
      </div>

      {/* Content Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
