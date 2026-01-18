"use client";

import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { TabsSkeleton } from "../shared/tabs-skeleton";
import { PricingCardSkeleton } from "./pricing-card-skeleton";

interface ProductDetailSkeletonProps {
  showPricing?: boolean;
  tabCount?: number;
  className?: string;
}

export function ProductDetailSkeleton({
  showPricing = true,
  tabCount = 4,
  className,
}: ProductDetailSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header section */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>

          {/* Title */}
          <Skeleton className="h-8 w-64" />

          {/* Subtitle/description */}
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Tabs/Details (2/3 width) */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <TabsSkeleton tabCount={tabCount} />
            </CardContent>
          </Card>
        </div>

        {/* Right column - Pricing/Meta (1/3 width) */}
        <div className="space-y-6">
          {showPricing && <PricingCardSkeleton count={2} layout="grid" />}

          {/* Additional meta card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
