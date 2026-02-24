'use client';

/**
 * Warranty Claims List Container
 *
 * Handles data fetching and pagination state for warranty claims list.
 *
 * @source claims from useWarrantyClaims hook
 */

import { useWarrantyClaims } from '@/hooks/warranty';
import type {
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
    quickFilter: search.quickFilter,
    page: search.page,
    pageSize: search.pageSize,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
  });

  const claims = data?.items ?? [];
  const pagination =
    data?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 };

  return (
    <WarrantyClaimsListView
      status={search.status}
      type={search.type}
      quickFilter={search.quickFilter}
      claims={claims}
      pagination={pagination}
      isLoading={isLoading}
      error={error instanceof Error ? error : null}
      onStatusChange={(value) => onSearchChange({ status: value })}
      onTypeChange={(value) => onSearchChange({ type: value })}
      onQuickFilterChange={(value) =>
        onSearchChange({
          quickFilter: value,
          status: value === 'submitted' ? 'submitted' : undefined,
          page: 1,
        })
      }
      onClearFilters={() =>
        onSearchChange({
          quickFilter: undefined,
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
