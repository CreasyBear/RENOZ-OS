/**
 * Invoice Detail Skeleton
 *
 * Loading skeleton for the invoice detail view.
 * Matches the 5-zone layout structure of InvoiceDetailView.
 *
 * @see docs/design-system/LOADING-STATE-STANDARDS.md
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// ============================================================================
// ZONE 1: HEADER SKELETON
// ============================================================================

function HeaderSkeleton() {
  return (
    <header className="mb-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left: Title + Status */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-48 mt-2" />
            </div>
          </div>
          {/* Meta row */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        {/* Right: Metrics + Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Key Metrics */}
          <div className="flex items-center gap-6 px-4 py-3 bg-background rounded-lg border">
            <div className="text-center space-y-2">
              <Skeleton className="h-3 w-12 mx-auto" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div className="text-center space-y-2">
              <Skeleton className="h-3 w-12 mx-auto" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div className="text-center space-y-2">
              <Skeleton className="h-3 w-8 mx-auto" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// ZONE 2: PROGRESS SKELETON
// ============================================================================

function ProgressSkeleton() {
  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                <Skeleton className="h-8 w-8 rounded-full mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              {i < 3 && <Skeleton className="h-0.5 flex-1 -mt-5" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ZONE 4+5: TABS + CONTENT SKELETON
// ============================================================================

function TabsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex gap-4 border-b pb-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Tab content skeleton */}
        <div className="space-y-6">
          {/* Summary section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>

          <Separator />

          {/* Line items table */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <div className="rounded-md border">
              <div className="p-4 border-b bg-muted/50">
                <div className="grid grid-cols-5 gap-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 border-b last:border-0">
                  <div className="grid grid-cols-5 gap-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Separator />
              <div className="flex justify-between">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SIDEBAR SKELETON
// ============================================================================

function SidebarSkeleton() {
  return (
    <Card className="sticky top-6">
      <CardContent className="p-5 space-y-6">
        {/* Customer */}
        <div>
          <Skeleton className="h-3 w-16 mb-3" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        </div>

        <Separator />

        {/* Related Order */}
        <div>
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-4 w-32" />
        </div>

        <Separator />

        {/* Key Dates */}
        <div>
          <Skeleton className="h-3 w-16 mb-3" />
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>

        <Separator />

        {/* Audit */}
        <div>
          <Skeleton className="h-3 w-12 mb-3" />
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN SKELETON
// ============================================================================

export function InvoiceDetailSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Zone 1: Header */}
        <HeaderSkeleton />

        {/* Zone 2: Progress */}
        <ProgressSkeleton />

        {/* Zone 4+5: Tabs + Main + Sidebar */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main Content */}
          <TabsSkeleton />

          {/* Sidebar */}
          <div className="hidden lg:block">
            <SidebarSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
