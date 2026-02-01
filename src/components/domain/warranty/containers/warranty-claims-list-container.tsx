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
import {
  WarrantyClaimsListView,
  type WarrantyClaimListItem,
} from '../views/warranty-claims-list-view';
import type { WarrantyClaimStatusValue, WarrantyClaimTypeValue } from '@/hooks/warranty';

export type WarrantyClaimsSortField = 'submittedAt' | 'claimNumber' | 'status' | 'claimType';
export type WarrantyClaimsSortOrder = 'asc' | 'desc';

export interface WarrantyClaimsSearchParams {
  status?: WarrantyClaimStatusValue;
  type?: WarrantyClaimTypeValue;
  page: number;
  pageSize: number;
  sortBy: WarrantyClaimsSortField;
  sortOrder: WarrantyClaimsSortOrder;
}

export interface WarrantyClaimsListContainerProps {
  search: WarrantyClaimsSearchParams;
  onSearchChange: (updates: Partial<WarrantyClaimsSearchParams>) => void;
  onRowClick: (claimId: string) => void;
}

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

  const claims = useMemo(
    () => (data?.items ?? []) as WarrantyClaimListItem[],
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
