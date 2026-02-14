/**
 * CustomerSelectorContainer Component
 *
 * Container component that wraps CustomerSelector (presenter) with data fetching logic.
 * Manages search state and customer data via TanStack Query hooks.
 * Supports initialCustomerId for pre-selecting when coming from customer context (e.g. ?customerId= in URL).
 *
 * Use this component in wizard steps and forms where you need customer selection
 * with automatic data fetching.
 *
 * @see customer-selector.tsx for the presenter component
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { CustomerSelector, type SelectedCustomer } from './customer-selector';
import { useCustomers, useCustomer } from '@/hooks/customers';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerSelectorContainerProps {
  /** Currently selected customer ID */
  selectedCustomerId: string | null;
  /** Callback when a customer is selected or cleared */
  onSelect: (customer: SelectedCustomer | null) => void;
  /** Pre-select customer when coming from customer context (e.g. ?customerId= in URL) */
  initialCustomerId?: string;
  /** Optional CSS class name */
  className?: string;
}

/** Map customer from API to SelectedCustomer format */
function mapToSelectedCustomer(c: {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  type: string;
  status: string;
  addresses?: Array<{
    type: string;
    street1?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  }>;
}): SelectedCustomer {
  const billing = c.addresses?.find((a) => a.type === 'billing');
  const shipping = c.addresses?.find((a) => a.type === 'shipping');
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? null,
    phone: c.phone ?? null,
    type: c.type,
    status: c.status,
    billingAddress: billing
      ? {
          street1: billing.street1 ?? undefined,
          city: billing.city ?? undefined,
          state: billing.state ?? undefined,
          postcode: billing.postcode ?? undefined,
          country: billing.country ?? undefined,
        }
      : undefined,
    shippingAddress: shipping
      ? {
          street1: shipping.street1 ?? undefined,
          city: shipping.city ?? undefined,
          state: shipping.state ?? undefined,
          postcode: shipping.postcode ?? undefined,
          country: shipping.country ?? undefined,
        }
      : undefined,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CustomerSelectorContainer = memo(function CustomerSelectorContainer({
  selectedCustomerId,
  onSelect,
  initialCustomerId,
  className,
}: CustomerSelectorContainerProps) {
  // Local state for search
  const [search, setSearch] = useState('');
  const initialSelectDone = useRef(false);

  // Fetch initial customer when coming from customer context
  const { data: initialCustomer } = useCustomer({
    id: initialCustomerId ?? '',
    enabled: !!initialCustomerId && !selectedCustomerId,
  });

  // Pre-select customer when initialCustomerId is provided and customer loads
  useEffect(() => {
    if (
      initialCustomerId &&
      initialCustomer &&
      !initialSelectDone.current &&
      !selectedCustomerId
    ) {
      initialSelectDone.current = true;
      onSelect(mapToSelectedCustomer(initialCustomer));
    }
  }, [initialCustomerId, initialCustomer, selectedCustomerId, onSelect]);

  // Reset ref when initialCustomerId changes (e.g. user navigated with different customer)
  useEffect(() => {
    if (!initialCustomerId) {
      initialSelectDone.current = false;
    }
  }, [initialCustomerId]);

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
