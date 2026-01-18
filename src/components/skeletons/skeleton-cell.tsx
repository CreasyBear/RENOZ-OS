"use client";

import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";

export type SkeletonType =
  | "checkbox"
  | "text"
  | "avatar-text"
  | "icon-text"
  | "badge"
  | "tags"
  | "icon"
  | "price"
  | "status";

interface SkeletonCellProps {
  type: SkeletonType;
  width?: string;
}

export function SkeletonCell({ type, width = "w-24" }: SkeletonCellProps) {
  switch (type) {
    case "checkbox":
      return <Skeleton className="h-4 w-4 rounded" />;

    case "text":
      return <Skeleton className={cn("h-3.5", width)} />;

    case "avatar-text":
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
          <Skeleton className={cn("h-3.5", width)} />
        </div>
      );

    case "icon-text":
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 flex-shrink-0" />
          <Skeleton className={cn("h-3.5", width)} />
        </div>
      );

    case "badge":
      return <Skeleton className={cn("h-5 rounded-full", width)} />;

    case "status":
      return <Skeleton className="h-6 w-16 rounded-full" />;

    case "tags":
      return (
        <div className="flex items-center gap-1">
          <Skeleton className="h-5 w-12 rounded" />
          <Skeleton className="h-5 w-16 rounded" />
        </div>
      );

    case "icon":
      return <Skeleton className="h-5 w-5" />;

    case "price":
      return <Skeleton className="h-4 w-16" />;

    default:
      return <Skeleton className={cn("h-3.5", width)} />;
  }
}
