/**
 * Lazy-loaded Fulfillment Dashboard
 *
 * Bundle optimization for the fulfillment kanban board.
 * Dynamically imports the full dashboard to reduce initial bundle size.
 */

import React, { lazy } from 'react';
import type { FulfillmentDashboardProps } from './index';

// Lazy load the main dashboard component
const FulfillmentDashboard = lazy(() =>
  import('./index').then((module) => ({ default: module.FulfillmentDashboard }))
);

// Loading fallback component
const FulfillmentDashboardSkeleton = () => (
  <div className="space-y-6 p-6">
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <div className="bg-muted h-8 w-48 animate-pulse rounded" />
      <div className="flex gap-2">
        <div className="bg-muted h-8 w-24 animate-pulse rounded" />
        <div className="bg-muted h-8 w-20 animate-pulse rounded" />
      </div>
    </div>

    {/* Stats skeleton */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-muted h-24 animate-pulse rounded-lg" />
      ))}
    </div>

    {/* Kanban skeleton */}
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex h-full w-[300px] flex-1 shrink-0 flex-col lg:w-[340px]">
          <div className="border-border/50 bg-muted/70 flex max-h-full flex-col space-y-2 rounded-2xl border p-2">
            <div className="bg-muted h-12 animate-pulse rounded-full" />
            <div className="flex-1 space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="bg-muted h-24 animate-pulse rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Lazy-loaded wrapper with loading fallback
export const LazyFulfillmentDashboard = (props: FulfillmentDashboardProps) => (
  <React.Suspense fallback={<FulfillmentDashboardSkeleton />}>
    <FulfillmentDashboard {...props} />
  </React.Suspense>
);

export default LazyFulfillmentDashboard;
