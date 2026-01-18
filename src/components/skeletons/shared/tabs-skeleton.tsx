"use client";

import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";

interface TabsSkeletonProps {
  tabCount?: number;
  className?: string;
}

export function TabsSkeleton({ tabCount = 4, className }: TabsSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Tab list */}
      <div className="bg-muted inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px] gap-1">
        {Array.from({ length: tabCount }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-md" />
        ))}
      </div>

      {/* Tab content placeholder */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}
