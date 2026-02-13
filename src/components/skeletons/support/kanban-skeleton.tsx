/**
 * Support Kanban Skeleton
 *
 * Loading skeleton for the issues kanban board.
 */
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SupportKanbanSkeleton() {
  const columns = ['New', 'Open', 'In Progress', 'On Hold', 'Escalated', 'Resolved'];

  return (
    <div className="container space-y-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0" />
        ))}
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column} className="w-[300px] shrink-0">
            <Card className="bg-muted/50">
              <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-6 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-3 pt-0">
                {Array.from({ length: 2 + (columns.indexOf(column) % 2) }).map((_, i) => (
                  <Card key={i} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-5 w-5" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex gap-1">
                          <Skeleton className="h-5 w-14" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
