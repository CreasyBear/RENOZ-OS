/**
 * CustomerStep Component
 *
 * Step 1: Select a customer for the order.
 */

import { memo, useState, useMemo } from 'react';
import { useCustomers } from '@/hooks/customers/use-customers';
import { CustomerSelector, type CustomerSummary } from '../../customer-selector';
import type { StepProps } from '../types';

export const CustomerStep = memo(function CustomerStep({ state, setState }: StepProps) {
  const [search, setSearch] = useState('');

  // Fetch customers with search filter
  const { data, isLoading, error } = useCustomers({
    search: search || undefined,
    status: 'active',
    pageSize: 50,
  });

  // Map customer data to CustomerSummary format
  const customers: CustomerSummary[] = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      type: c.type,
      status: c.status,
    }));
  }, [data?.items]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Select Customer</h3>
        <p className="text-muted-foreground text-sm">Choose the customer for this order</p>
      </div>
      <CustomerSelector
        selectedCustomerId={state.customer?.id ?? null}
        onSelect={(customer) => setState((s) => ({ ...s, customer }))}
        search={search}
        onSearchChange={setSearch}
        customers={customers}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
});
