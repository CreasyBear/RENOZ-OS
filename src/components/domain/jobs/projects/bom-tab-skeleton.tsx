/**
 * BOM Tab Skeleton
 *
 * Loading skeleton for the Bill of Materials tab.
 * Mirrors layout: header bar, 4 summary cards, items table.
 *
 * @see docs/design-system/LOADING-STATE-STANDARDS.md §6 Skeleton matches structure
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTableSkeleton } from '@/components/shared/data-table';

const BOM_TABLE_COLUMNS = [
  { skeleton: { type: 'avatar-text' as const, width: 'w-40' } },
  { skeleton: { type: 'badge' as const, width: 'w-20' } },
  { skeleton: { type: 'text' as const, width: 'w-12' } },
  { skeleton: { type: 'text' as const, width: 'w-16' } },
  { skeleton: { type: 'text' as const, width: 'w-20' } },
  { skeleton: { type: 'icon' as const } },
];

export function BomTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-14" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <DataTableSkeleton columns={BOM_TABLE_COLUMNS} rows={5} />
      </div>
    </div>
  );
}
