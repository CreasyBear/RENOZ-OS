'use client';

/**
 * Warranty Claims List Container
 *
 * Handles data fetching and pagination state for warranty claims list.
 *
 * @source claims from useWarrantyClaims hook
 */

import { useMemo } from 'react';
import { useWarrantyClaims } from '@/hooks/warranty';
import type {
  WarrantyClaimListItem,
  WarrantyClaimsListContainerProps,
} from '@/lib/schemas/warranty';
import { WarrantyClaimsListView } from '../views/warranty-claims-list-view';

export function WarrantyClaimsListContainer({
  search,
  onSearchChange,
  onRowClick,
}: WarrantyClaimsListContainerProps) {
  const { data, isLoading, error, refetch } = useWarrantyClaims({
    status: search.status,
    claimType: search.type,
    page: search.page,
    pageSize: search.pageSize,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
  });

  // Server function returns ListWarrantyClaimsResult with productId at source (SCHEMA-TRACE.md)
  const claims = useMemo<WarrantyClaimListItem[]>(
    () => data?.items ?? [],
    [data]
  );
  const pagination =
    data?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 };

  return (
    <WarrantyClaimsListView
      status={search.status}
      type={search.type}
      claims={claims}
      pagination={pagination}
      isLoading={isLoading}
      error={error instanceof Error ? error : null}
      onStatusChange={(value) => onSearchChange({ status: value })}
      onTypeChange={(value) => onSearchChange({ type: value })}
      onClearFilters={() =>
        onSearchChange({
          status: undefined,
          type: undefined,
          page: 1,
          sortBy: 'submittedAt',
          sortOrder: 'desc',
        })
      }
      onPageChange={(page) => onSearchChange({ page })}
      onRowClick={onRowClick}
      onRetry={() => refetch()}
    />
  );
}
