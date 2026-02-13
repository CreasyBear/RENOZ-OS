'use client';

/**
 * Warranty list container
 *
 * Handles data fetching, filters, and pagination state for warranty list views.
 *
 * @source warranties from useWarranties hook
 */

import { useMemo, useCallback, useState } from 'react';
import {
  useWarranties,
  useWarrantyStatusCounts,
  useVoidWarranty,
  useTransferWarranty,
} from '@/hooks/warranty';
import { useConfirmation } from '@/hooks/_shared/use-confirmation';
import { DomainFilterBar } from '@/components/shared/filters';
import { WarrantyStatusChips } from '../warranty-status-chips';
import { WarrantyListTable, type WarrantyListItem } from '../tables/warranty-list-table';
import { TransferWarrantyDialog } from '../dialogs/transfer-warranty-dialog';
import type { WarrantyFilters } from '@/lib/schemas/warranty/warranties';
import {
  WARRANTY_FILTER_CONFIG,
  DEFAULT_WARRANTY_FILTERS,
  type WarrantyFiltersState,
} from '../warranty-filter-config';

// Import types from schemas per SCHEMA-TRACE.md
import type { WarrantyStatus } from '@/lib/schemas/warranty';
import type { WarrantyPolicyTypeValue } from '@/lib/schemas/warranty/policies';

export type WarrantyListSortField = 'createdAt' | 'expiryDate' | 'status';
export type WarrantyListSortOrder = 'asc' | 'desc';
export type WarrantyListStatus = WarrantyStatus;

export interface WarrantyListSearchParams {
  search?: string;
  status?: WarrantyListStatus;
  policyType?: WarrantyPolicyTypeValue;
  page: number;
  pageSize: number;
  sortBy: WarrantyListSortField;
  sortOrder: WarrantyListSortOrder;
}

export interface WarrantyListContainerProps {
  search: WarrantyListSearchParams;
  onSearchChange: (updates: Partial<WarrantyListSearchParams>) => void;
  onRowClick?: (warranty: WarrantyListItem) => void;
  className?: string;
}

export function WarrantyListContainer({
  search,
  onSearchChange,
  onRowClick,
  className,
}: WarrantyListContainerProps) {
  const confirmation = useConfirmation();
  const voidWarrantyMutation = useVoidWarranty();
  const transferWarrantyMutation = useTransferWarranty();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedWarrantyForTransfer, setSelectedWarrantyForTransfer] = useState<WarrantyListItem | null>(null);

  // Memoize filters to prevent unnecessary object recreation
  const filters: WarrantyFilters = useMemo(
    () => ({
      search: search.search,
      status: search.status,
      policyType: search.policyType,
      sortBy: search.sortBy,
      sortOrder: search.sortOrder,
      limit: search.pageSize,
      offset: (search.page - 1) * search.pageSize,
    }),
    [search.search, search.status, search.policyType, search.sortBy, search.sortOrder, search.pageSize, search.page]
  );
  const { data, isLoading, error, refetch } = useWarranties(filters);
  const { data: statusCounts } = useWarrantyStatusCounts();
  const warranties = useMemo(() => data?.warranties ?? [], [data]);
  const total = data?.total ?? 0;

  // Map container search params to filter state
  const filterState: WarrantyFiltersState = useMemo(
    () => ({
      search: search.search ?? '',
      status: search.status ?? null,
      policyType: search.policyType ?? null,
      customerId: null, // Not used in this view
    }),
    [search.search, search.status, search.policyType]
  );

  // Handle filter changes from DomainFilterBar
  const handleFiltersChange = useCallback(
    (newFilters: WarrantyFiltersState) => {
      onSearchChange({
        search: newFilters.search || undefined,
        status: newFilters.status ?? undefined,
        policyType: newFilters.policyType ?? undefined,
        page: 1, // Reset to first page on filter change
      });
    },
    [onSearchChange]
  );

  // Handle void warranty
  const handleVoidWarranty = useCallback(
    async (warrantyId: string) => {
      const warranty = warranties.find((w) => w.id === warrantyId);
      const { confirmed, reason } = await confirmation.confirm({
        title: 'Void Warranty',
        description: `Are you sure you want to void warranty ${warranty?.warrantyNumber ?? warrantyId}? This action cannot be undone.`,
        confirmLabel: 'Void Warranty',
        variant: 'destructive',
        requireReason: true,
        reasonLabel: 'Reason for voiding',
        reasonPlaceholder: 'Please provide a reason for voiding this warranty...',
      });

      if (!confirmed) return;

      await voidWarrantyMutation.mutateAsync({ id: warrantyId, reason });
    },
    [warranties, confirmation, voidWarrantyMutation]
  );

  // Handle transfer warranty
  const handleTransferWarranty = useCallback(
    (warrantyId: string) => {
      const warranty = warranties.find((w) => w.id === warrantyId);
      if (warranty) {
        setSelectedWarrantyForTransfer(warranty);
        setTransferDialogOpen(true);
      }
    },
    [warranties]
  );

  // Handle transfer dialog submit
  const handleTransferSubmit = useCallback(
    async (payload: { id: string; newCustomerId: string; reason?: string }) => {
      await transferWarrantyMutation.mutateAsync(payload);
    },
    [transferWarrantyMutation]
  );

  // Handle transfer dialog success
  const handleTransferSuccess = useCallback(() => {
    setSelectedWarrantyForTransfer(null);
  }, []);

  // Handle transfer dialog close
  const handleTransferDialogClose = useCallback((open: boolean) => {
    setTransferDialogOpen(open);
    if (!open) {
      setSelectedWarrantyForTransfer(null);
    }
  }, []);

  // Memoize warranty prop to prevent unnecessary re-renders
  const transferWarrantyProps = useMemo(
    () =>
      selectedWarrantyForTransfer
        ? {
            id: selectedWarrantyForTransfer.id,
            warrantyNumber: selectedWarrantyForTransfer.warrantyNumber,
            productName: selectedWarrantyForTransfer.productName ?? undefined,
            customerName: selectedWarrantyForTransfer.customerName ?? undefined,
            customerId: selectedWarrantyForTransfer.customerId,
          }
        : null,
    [selectedWarrantyForTransfer]
  );

  return (
    <>
      {transferWarrantyProps && (
        <TransferWarrantyDialog
          open={transferDialogOpen}
          onOpenChange={handleTransferDialogClose}
          warranty={transferWarrantyProps}
          onSubmit={handleTransferSubmit}
          onSuccess={handleTransferSuccess}
          isSubmitting={transferWarrantyMutation.isPending}
        />
      )}
      <div className="space-y-3">
        <DomainFilterBar
          config={WARRANTY_FILTER_CONFIG}
          filters={filterState}
          onFiltersChange={handleFiltersChange}
          defaultFilters={DEFAULT_WARRANTY_FILTERS}
          presetsSuffix={
            statusCounts ? (
              <WarrantyStatusChips
                counts={statusCounts}
                filters={filterState}
                onFiltersChange={handleFiltersChange}
              />
            ) : undefined
          }
        />

        <WarrantyListTable
          warranties={warranties}
          total={total}
          page={search.page}
          pageSize={search.pageSize}
          isLoading={isLoading}
          error={error instanceof Error ? error : null}
          onRetry={refetch}
          onRowClick={onRowClick}
          onPageChange={(page) => onSearchChange({ page })}
          onVoidWarranty={handleVoidWarranty}
          onTransferWarranty={handleTransferWarranty}
          className={className}
        />
      </div>
    </>
  );
}
