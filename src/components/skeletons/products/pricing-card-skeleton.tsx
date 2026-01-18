"use client";

import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

interface PricingCardSkeletonProps {
  count?: number;
  layout?: "horizontal" | "grid";
}

export function PricingCardSkeleton({
  count = 1,
  layout = "horizontal",
}: PricingCardSkeletonProps) {
  const cards = Array.from({ length: count });

  return (
    <div
      className={cn(
        layout === "horizontal"
          ? "flex gap-4 overflow-x-auto"
          : "grid grid-cols-1 gap-4"
      )}
    >
      {cards.map((_, i) => (
        <Card
          key={i}
          className={cn(layout === "horizontal" && "min-w-[280px] flex-shrink-0")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Price display */}
            <div className="space-y-1">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>

            {/* Features list */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>

            {/* Action button */}
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
