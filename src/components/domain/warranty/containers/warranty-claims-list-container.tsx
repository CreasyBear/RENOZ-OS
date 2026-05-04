'use client';

/**
 * Warranty Claims List Container
 *
 * Handles data fetching and pagination state for warranty claims list.
 *
 * @source claims from useWarrantyClaims hook
 */

import { useWarrantyClaims } from '@/hooks/warranty';
import { useCustomers } from '@/hooks/customers';
import type {
  WarrantyClaimsListContainerProps,
} from '@/lib/schemas/warranty';
import { WarrantyClaimsListView } from '../views/warranty-claims-list-view';
import {
  DEFAULT_WARRANTY_CLAIM_SORT_DIRECTION,
  DEFAULT_WARRANTY_CLAIM_SORT_FIELD,
} from '../warranty-claim-sorting';

export function WarrantyClaimsListContainer({
  search,
  onSearchChange,
  onRowClick,
}: WarrantyClaimsListContainerProps) {
  const { data: customersData } = useCustomers({ pageSize: 100 });
  const { data, isLoading, error, refetch } = useWarrantyClaims({
    customerId: search.customerId,
    claimantRole: search.claimantRole,
    claimantMode: search.claimantMode,
    claimantCustomerId: search.claimantCustomerId,
    status: search.status,
    claimType: search.type,
    quickFilter: search.quickFilter,
    page: search.page,
    pageSize: search.pageSize,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
  });

  const claims = data?.items ?? [];
  const commercialCustomerOptions =
    customersData?.items.map((customer) => ({
      id: customer.id,
      name: customer.name ?? 'Unknown customer',
    })) ?? [];
  const pagination =
    data?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 };

  return (
    <WarrantyClaimsListView
      commercialCustomerOptions={commercialCustomerOptions}
      customerId={search.customerId}
      claimantRole={search.claimantRole}
      claimantMode={search.claimantMode}
      status={search.status}
      type={search.type}
      quickFilter={search.quickFilter}
      claims={claims}
      pagination={pagination}
      isLoading={isLoading}
      error={error instanceof Error ? error : null}
      onCommercialCustomerChange={(value) => onSearchChange({ customerId: value, page: 1 })}
      onClaimantRoleChange={(value) => onSearchChange({ claimantRole: value, page: 1 })}
      onClaimantModeChange={(value) => onSearchChange({ claimantMode: value, page: 1 })}
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
          customerId: undefined,
          claimantRole: undefined,
          claimantMode: undefined,
          claimantCustomerId: undefined,
          quickFilter: undefined,
          status: undefined,
          type: undefined,
          page: 1,
          sortBy: DEFAULT_WARRANTY_CLAIM_SORT_FIELD,
          sortOrder: DEFAULT_WARRANTY_CLAIM_SORT_DIRECTION,
        })
      }
      onPageChange={(page) => onSearchChange({ page })}
      onRowClick={onRowClick}
      onRetry={() => refetch()}
    />
  );
}
