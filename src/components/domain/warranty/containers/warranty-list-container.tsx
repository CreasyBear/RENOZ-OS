'use client';

/**
 * Warranty list container
 *
 * Handles data fetching, filters, and pagination state for warranty list views.
 *
 * @source warranties from useWarranties hook
 */

import { useMemo, useCallback } from 'react';
import { useWarranties } from '@/hooks/warranty';
import { DomainFilterBar } from '@/components/shared/filters';
import { WarrantyListTable, type WarrantyListItem } from '../tables/warranty-list-table';
import type { WarrantyFilters } from '@/lib/schemas/warranty/warranties';
import {
  WARRANTY_FILTER_CONFIG,
  DEFAULT_WARRANTY_FILTERS,
  type WarrantyFiltersState,
} from '../warranty-filter-config';

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

  return (
    <div className="space-y-4">
      <DomainFilterBar
        config={WARRANTY_FILTER_CONFIG}
        filters={filterState}
        onFiltersChange={handleFiltersChange}
        defaultFilters={DEFAULT_WARRANTY_FILTERS}
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
