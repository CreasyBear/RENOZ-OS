/**
 * CustomerSelectorContainer Component
 *
 * Container component that wraps CustomerSelector (presenter) with data fetching logic.
 * Manages search state and customer data via TanStack Query hooks.
 *
 * Use this component in wizard steps and forms where you need customer selection
 * with automatic data fetching.
 *
 * @see customer-selector.tsx for the presenter component
 */

import { memo, useState, useCallback } from 'react';
import { CustomerSelector, type SelectedCustomer } from './customer-selector';
import { useCustomers } from '@/hooks/customers/use-customers';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerSelectorContainerProps {
  /** Currently selected customer ID */
  selectedCustomerId: string | null;
  /** Callback when a customer is selected or cleared */
  onSelect: (customer: SelectedCustomer | null) => void;
  /** Optional CSS class name */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CustomerSelectorContainer = memo(function CustomerSelectorContainer({
  selectedCustomerId,
  onSelect,
  className,
}: CustomerSelectorContainerProps) {
  // Local state for search
  const [search, setSearch] = useState('');

  // Fetch customers with search filter
  const {
    data: customersData,
    isLoading,
    error,
  } = useCustomers({
    search: search || undefined,
    status: 'active',
    pageSize: 50,
  });

  // Map to CustomerSummary format expected by presenter
  const customers = (customersData?.items ?? []).map((customer) => ({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    type: customer.type,
    status: customer.status,
  }));

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  return (
    <CustomerSelector
      selectedCustomerId={selectedCustomerId}
      onSelect={onSelect}
      search={search}
      onSearchChange={handleSearchChange}
      customers={customers}
      isLoading={isLoading}
      error={error}
      className={className}
    />
  );
});

export default CustomerSelectorContainer;
