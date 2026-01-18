"use client";

import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { SkeletonCell } from "../skeleton-cell";

interface ProductTableSkeletonProps {
  rowCount?: number;
  showFilters?: boolean;
  className?: string;
}

export function ProductTableSkeleton({
  rowCount = 8,
  showFilters = true,
  className,
}: ProductTableSkeletonProps) {
  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Filter bar skeleton */}
      {showFilters && (
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-64" /> {/* Search */}
          <Skeleton className="h-9 w-32" /> {/* Status filter */}
          <Skeleton className="h-9 w-32" /> {/* Category filter */}
          <div className="ml-auto">
            <Skeleton className="h-9 w-28" /> {/* Add button */}
          </div>
        </div>
      )}

      {/* Table skeleton */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Name</TableHead>
              <TableHead className="w-[100px]">Price</TableHead>
              <TableHead className="w-[80px]">Unit</TableHead>
              <TableHead className="w-[80px]">Usage</TableHead>
              <TableHead className="w-[120px]">Last Used</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <TableRow
                key={`skeleton-product-${i}`}
                className="hover:bg-transparent h-[65px]"
              >
                {/* Name column - flex col structure */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </TableCell>

                {/* Price */}
                <TableCell>
                  <SkeletonCell type="price" />
                </TableCell>

                {/* Unit */}
                <TableCell>
                  <SkeletonCell type="text" width="w-12" />
                </TableCell>

                {/* Usage */}
                <TableCell>
                  <SkeletonCell type="text" width="w-8" />
                </TableCell>

                {/* Last Used */}
                <TableCell>
                  <SkeletonCell type="text" width="w-20" />
                </TableCell>

                {/* Status */}
                <TableCell>
                  <SkeletonCell type="status" />
                </TableCell>

                {/* Actions */}
                <TableCell className="w-[50px]">
                  <Skeleton className="h-8 w-8 rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
