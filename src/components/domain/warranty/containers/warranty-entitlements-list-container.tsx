'use client'

import { useMemo, useState } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useActivateWarrantyFromEntitlement,
  useWarrantyEntitlements,
} from '@/hooks/warranty';
import type {
  WarrantyEntitlementFilters,
  WarrantyEntitlementListItem,
  WarrantyEntitlementStatus,
} from '@/lib/schemas/warranty/entitlements';
import { ActivateWarrantyDialog } from '../dialogs/activate-warranty-dialog';
import { WarrantyEntitlementReviewDialog } from '../dialogs/warranty-entitlement-review-dialog';
import { WarrantyEntitlementsListView } from '../views/warranty-entitlements-list-view';

export interface WarrantyEntitlementsListSearchParams {
  search?: string;
  status?: WarrantyEntitlementStatus;
}

export interface WarrantyEntitlementsListContainerProps {
  search: WarrantyEntitlementsListSearchParams;
  onSearchChange: (updates: Partial<WarrantyEntitlementsListSearchParams>) => void;
}

/**
 * Warranty entitlement queue container.
 *
 * @source entitlement queue from useWarrantyEntitlements
 * @source activation mutation from useActivateWarrantyFromEntitlement
 */
export function WarrantyEntitlementsListContainer({
  search,
  onSearchChange,
}: WarrantyEntitlementsListContainerProps) {
  const [selectedEntitlement, setSelectedEntitlement] =
    useState<WarrantyEntitlementListItem | null>(null);
  const [reviewEntitlementId, setReviewEntitlementId] = useState<string | null>(null);
  const selectedStatus = search.status ?? 'all';

  const filters: WarrantyEntitlementFilters = useMemo(
    () => ({
      search: search.search || undefined,
      status: selectedStatus === 'all' ? undefined : selectedStatus,
      limit: 50,
      offset: 0,
      sortBy: 'deliveredAt',
      sortOrder: 'desc',
    }),
    [search.search, selectedStatus]
  );

  const { data, isLoading, error, refetch, isRefetching } = useWarrantyEntitlements(filters);
  const activateMutation = useActivateWarrantyFromEntitlement();

  if (error && !data) {
    return (
      <ErrorState
        title="Failed to load warranty entitlements"
        message={error instanceof Error ? error.message : 'An error occurred'}
        onRetry={() => refetch()}
        isRetrying={isRefetching}
      />
    );
  }

  return (
    <>
      {error ? (
        <Alert>
          <AlertDescription>
            {data
              ? error.message || 'Warranty entitlements are temporarily unavailable. Showing the most recent queue.'
              : error.message || 'Warranty entitlements are temporarily unavailable. Please refresh and try again.'}
          </AlertDescription>
        </Alert>
      ) : null}
      <WarrantyEntitlementsListView
        entitlements={data?.entitlements ?? []}
        total={data?.total ?? 0}
        search={search.search ?? ''}
        status={selectedStatus}
        isLoading={isLoading}
        onSearchChange={(value) => onSearchChange({ search: value || undefined })}
        onStatusChange={(value) =>
          onSearchChange({ status: value === 'all' ? undefined : value })
        }
        onActivate={setSelectedEntitlement}
        onReview={setReviewEntitlementId}
      />

      <ActivateWarrantyDialog
        open={selectedEntitlement != null}
        onOpenChange={(open) => {
          if (!open) setSelectedEntitlement(null);
        }}
        entitlement={selectedEntitlement}
        isSubmitting={activateMutation.isPending}
        onSubmit={async (payload) => {
          await activateMutation.mutateAsync(payload);
        }}
        onSuccess={() => setSelectedEntitlement(null)}
      />

      <WarrantyEntitlementReviewDialog
        entitlementId={reviewEntitlementId}
        open={reviewEntitlementId != null}
        onOpenChange={(open) => {
          if (!open) setReviewEntitlementId(null);
        }}
        onActivate={(entitlementId) => {
          const entitlement =
            data?.entitlements.find((item) => item.id === entitlementId) ?? null;
          if (entitlement) {
            setReviewEntitlementId(null);
            setSelectedEntitlement(entitlement);
          }
        }}
      />
    </>
  );
}
