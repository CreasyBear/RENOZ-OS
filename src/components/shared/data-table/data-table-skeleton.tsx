import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeleton type definitions matching column meta
 */
export type SkeletonType =
  | { type: "checkbox" }
  | { type: "text"; width?: string }
  | { type: "icon-text"; width?: string }
  | { type: "avatar-text"; width?: string }
  | { type: "badge"; width?: string }
  | { type: "tags" }
  | { type: "icon" }
  | { type: "actions" };

export interface SkeletonCellProps {
  /** Skeleton type from column meta */
  skeleton: SkeletonType;
  /** Additional className */
  className?: string;
}

/**
 * Renders a skeleton cell based on column meta type.
 *
 * @example
 * ```tsx
 * // In column definition
 * {
 *   accessorKey: "name",
 *   meta: {
 *     skeleton: { type: "avatar-text", width: "w-32" },
 *   },
 * }
 *
 * // In skeleton row
 * <SkeletonCell skeleton={column.columnDef.meta?.skeleton} />
 * ```
 */
export const SkeletonCell = memo(function SkeletonCell({
  skeleton,
  className,
}: SkeletonCellProps) {
  switch (skeleton.type) {
    case "checkbox":
      return (
        <div className={cn("flex items-center justify-center", className)}>
          <Skeleton className="h-4 w-4 rounded" />
        </div>
      );

    case "text":
      return (
        <Skeleton
          className={cn("h-4 rounded", skeleton.width || "w-24", className)}
        />
      );

    case "icon-text":
      return (
        <div className={cn("flex items-center gap-2", className)}>
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton
            className={cn("h-4 rounded", skeleton.width || "w-20")}
          />
        </div>
      );

    case "avatar-text":
      return (
        <div className={cn("flex items-center gap-2.5", className)}>
          <Skeleton className="h-6 w-6 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton
              className={cn("h-4 rounded", skeleton.width || "w-24")}
            />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        </div>
      );

    case "badge":
      return (
        <Skeleton
          className={cn(
            "h-5 rounded-full",
            skeleton.width || "w-16",
            className
          )}
        />
      );

    case "tags":
      return (
        <div className={cn("flex items-center gap-1", className)}>
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
      );

    case "icon":
      return (
        <div className={cn("flex items-center justify-center", className)}>
          <Skeleton className="h-4 w-4 rounded" />
        </div>
      );

    case "actions":
      return (
        <div className={cn("flex items-center justify-end", className)}>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      );

    default:
      return <Skeleton className={cn("h-4 w-24 rounded", className)} />;
  }
});

SkeletonCell.displayName = "SkeletonCell";

export interface DataTableSkeletonProps {
  /** Number of skeleton rows to display */
  rows?: number;
  /** Column skeleton configurations */
  columns: Array<{
    skeleton?: SkeletonType;
    className?: string;
  }>;
  /** Additional className for the table */
  className?: string;
}

/**
 * Full table skeleton with configurable rows and columns.
 *
 * @example
 * ```tsx
 * <DataTableSkeleton
 *   rows={5}
 *   columns={[
 *     { skeleton: { type: "checkbox" } },
 *     { skeleton: { type: "avatar-text", width: "w-32" } },
 *     { skeleton: { type: "text", width: "w-24" } },
 *     { skeleton: { type: "badge", width: "w-16" } },
 *     { skeleton: { type: "actions" } },
 *   ]}
 * />
 * ```
 */
export const DataTableSkeleton = memo(function DataTableSkeleton({
  rows = 5,
  columns,
  className,
}: DataTableSkeletonProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Header skeleton */}
      <div className="flex items-center border-b px-4 py-3 gap-4">
        {columns.map((col, idx) => (
          <Skeleton
            key={idx}
            className={cn("h-4 rounded", col.className || "w-20")}
          />
        ))}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center border-b px-4 py-3 gap-4"
        >
          {columns.map((col, colIdx) => (
            <div key={colIdx} className={col.className}>
              {col.skeleton ? (
                <SkeletonCell skeleton={col.skeleton} />
              ) : (
                <Skeleton className="h-4 w-24 rounded" />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});

DataTableSkeleton.displayName = "DataTableSkeleton";
