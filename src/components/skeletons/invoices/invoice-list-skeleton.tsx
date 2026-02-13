/**
 * Invoice List Skeleton
 *
 * Loading skeleton for the invoice list view.
 * Matches the layout structure of InvoiceListPresenter.
 *
 * @see docs/design-system/LOADING-STATE-STANDARDS.md
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

// ============================================================================
// SUMMARY CARDS SKELETON
// ============================================================================

function SummaryCardSkeleton() {
  return (
    <Card className="border-0 bg-gray-50 dark:bg-gray-900/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TABLE SKELETON
// ============================================================================

function TableRowSkeleton() {
  return (
    <tr className="border-b">
      <td className="p-4">
        <Skeleton className="h-4 w-4" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="p-4">
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </td>
      <td className="p-4">
        <Skeleton className="h-5 w-16 rounded-full" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-20 ml-auto" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-20 ml-auto" />
      </td>
      <td className="p-4">
        <Skeleton className="h-8 w-14" />
      </td>
    </tr>
  );
}

// ============================================================================
// MAIN SKELETON
// ============================================================================

export function InvoiceListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-80" />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4">
                <Skeleton className="h-4 w-4" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="p-4 text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
              </th>
              <th className="p-4 text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
              </th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  );
}
