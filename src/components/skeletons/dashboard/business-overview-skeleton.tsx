/**
 * Business Overview Dashboard Skeleton
 *
 * Layout-preserving skeleton for the Business Overview dashboard.
 * Matches the 4-section layout: Financial, Pipeline, Customers, Operations.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function KPICardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="size-8 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

function SectionSkeleton({
  kpiCount = 4,
  hasChart = false,
  hasDoubleChart = false,
}: {
  kpiCount?: number;
  hasChart?: boolean;
  hasDoubleChart?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Grid */}
        <div
          className={`grid gap-4 ${
            kpiCount === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {Array.from({ length: kpiCount }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>

        {/* Single Chart */}
        {hasChart && !hasDoubleChart && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* Double Chart Row */}
        {hasDoubleChart && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerSectionSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Grid - 3 cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>

        {/* Health Distribution with pie chart */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <Skeleton className="h-4 w-40 mb-3" />
          <div className="flex gap-4">
            <Skeleton className="size-24 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OperationsSectionSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-24" />
      </CardHeader>
      <CardContent>
        {/* KPI Grid - 3 cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BusinessOverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Financial Section */}
      <SectionSkeleton kpiCount={4} hasChart />

      {/* Pipeline Section */}
      <SectionSkeleton kpiCount={4} hasDoubleChart />

      {/* Bottom Row: Customers + Operations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CustomerSectionSkeleton />
        <OperationsSectionSkeleton />
      </div>
    </div>
  );
}
