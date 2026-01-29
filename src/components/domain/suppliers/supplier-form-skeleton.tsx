/**
 * Supplier Form Skeleton
 *
 * Loading state for supplier form following the card layout.
 */

import { Skeleton } from '@/components/ui/skeleton';

export function SupplierFormSkeleton() {
  return (
    <div className="max-w-4xl space-y-6">
      {/* Basic Information Card */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Contact Information Card */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Primary Contact Card */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6 grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Business Details Card */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Notes Card */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6">
          <Skeleton className="h-24 w-full" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
