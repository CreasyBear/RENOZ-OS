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
    street2?: string | null;
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
          street2: billing.street2 ?? undefined,
          city: billing.city ?? undefined,
          state: billing.state ?? undefined,
          postcode: billing.postcode ?? undefined,
          country: billing.country ?? undefined,
        }
      : undefined,
    shippingAddress: shipping
      ? {
          street1: shipping.street1 ?? undefined,
          street2: shipping.street2 ?? undefined,
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

  // Fetch full customer (with addresses) when selected from search list
  const { data: selectedCustomerData } = useCustomer({
    id: selectedCustomerId ?? '',
    enabled: !!selectedCustomerId,
  });

  const lastEnrichedCustomerIdRef = useRef<string | null>(null);
  const lastSelectionFingerprintRef = useRef<string>('__none__');
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const getSelectionFingerprint = useCallback((customer: SelectedCustomer | null) => {
    if (!customer) return '__none__';
    const billing = customer.billingAddress;
    const shipping = customer.shippingAddress;
    return [
      customer.id,
      customer.name,
      customer.email ?? '',
      customer.phone ?? '',
      billing?.street1 ?? '',
      billing?.postcode ?? '',
      shipping?.street1 ?? '',
      shipping?.postcode ?? '',
    ].join('|');
  }, []);

  const emitSelection = useCallback((customer: SelectedCustomer | null) => {
    const fingerprint = getSelectionFingerprint(customer);
    if (lastSelectionFingerprintRef.current === fingerprint) return;
    lastSelectionFingerprintRef.current = fingerprint;
    onSelectRef.current(customer);
  }, [getSelectionFingerprint]);

  // Pre-select customer when initialCustomerId is provided and customer loads
  useEffect(() => {
    if (
      initialCustomerId &&
      initialCustomer &&
      !initialSelectDone.current &&
      !selectedCustomerId
    ) {
      initialSelectDone.current = true;
      emitSelection(mapToSelectedCustomer(initialCustomer));
    }
  }, [initialCustomerId, initialCustomer, selectedCustomerId, emitSelection]);

  // Enrich selection with addresses when user selects from search (useCustomers returns no addresses)
  useEffect(() => {
    if (!selectedCustomerId || !selectedCustomerData) return;
    if (lastEnrichedCustomerIdRef.current === selectedCustomerId) return;
    lastEnrichedCustomerIdRef.current = selectedCustomerId;
    emitSelection(mapToSelectedCustomer(selectedCustomerData));
  }, [selectedCustomerId, selectedCustomerData, emitSelection]);

  // Reset refs when selection is cleared
  useEffect(() => {
    if (!selectedCustomerId) {
      lastEnrichedCustomerIdRef.current = null;
      lastSelectionFingerprintRef.current = '__none__';
    }
  }, [selectedCustomerId]);

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

  const handleSelect = useCallback((customer: SelectedCustomer | null) => {
    emitSelection(customer);
  }, [emitSelection]);

  return (
    <CustomerSelector
      selectedCustomerId={selectedCustomerId}
      onSelect={handleSelect}
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
