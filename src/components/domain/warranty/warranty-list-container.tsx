'use client';

/**
 * Warranty list container
 *
 * Handles data fetching, filters, and pagination state for warranty list views.
 *
 * @source warranties from useWarranties hook
 */

import { useMemo } from 'react';
import { useWarranties } from '@/hooks/warranty';
import { WarrantyListTable, type WarrantyListItem } from './warranty-list-table';
import type { WarrantyFilters } from '@/lib/schemas/warranty/warranties';
import { WarrantyListFilters } from './warranty-list-filters.tsx';

export type WarrantyListSortField = 'createdAt' | 'expiryDate' | 'status';
export type WarrantyListSortOrder = 'asc' | 'desc';
export type WarrantyListStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'voided'
  | 'transferred';
export type WarrantyPolicyType =
  | 'battery_performance'
  | 'inverter_manufacturer'
  | 'installation_workmanship';

export interface WarrantyListSearchParams {
  search?: string;
  status?: WarrantyListStatus;
  policyType?: WarrantyPolicyType;
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
  const filters: WarrantyFilters = {
    search: search.search,
    status: search.status,
    policyType: search.policyType,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
    limit: search.pageSize,
    offset: (search.page - 1) * search.pageSize,
  };
  const { data, isLoading, error, refetch } = useWarranties(filters);
  const warranties = useMemo(() => data?.warranties ?? [], [data]);
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <WarrantyListFilters
        search={search.search ?? ''}
        status={search.status}
        policyType={search.policyType}
        onSearchChange={(value: string) => onSearchChange({ search: value || undefined })}
        onStatusChange={(value: WarrantyListStatus | undefined) =>
          onSearchChange({ status: value })
        }
        onPolicyTypeChange={(value: WarrantyPolicyType | undefined) =>
          onSearchChange({ policyType: value })
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
        className={className}
      />
    </div>
  );
}
