/**
 * CustomerCombobox Component
 *
 * Searchable customer selector for financial forms.
 * Wraps EntityCombobox with customer-specific search logic.
 *
 * @see src/components/shared/entity-combobox.tsx
 */

import { useCallback } from 'react';
import { EntityCombobox } from '@/components/shared/entity-combobox';
import { useServerFn } from '@tanstack/react-start';
import { getCustomers } from '@/server/customers';
import type { Customer } from '@/lib/schemas/customers';
import { normalizeCustomerForCombobox } from '@/lib/schemas/customers/normalize';

export interface CustomerComboboxProps {
  /** Currently selected customer */
  value?: Customer | null;
  /** Selection callback */
  onSelect: (customer: Customer | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * CustomerCombobox - Searchable customer selector
 */
export function CustomerCombobox({
  value,
  onSelect,
  placeholder = 'Search customers...',
  disabled,
  className,
}: CustomerComboboxProps) {
  const getCustomersFn = useServerFn(getCustomers);

  const searchCustomers = useCallback(
    async (query: string): Promise<Customer[]> => {
      const result = await getCustomersFn({
        data: {
          search: query,
          status: 'active',
          page: 1,
          pageSize: 20,
        },
      });
      return (result.items ?? []).map((item) =>
        normalizeCustomerForCombobox(item) as Customer
      );
    },
    [getCustomersFn]
  );

  return (
    <EntityCombobox<Customer>
      value={value}
      onSelect={onSelect}
      searchFn={searchCustomers}
      getDisplayValue={(customer) => customer.name ?? customer.email ?? 'Unknown'}
      getKey={(customer) => customer.id}
      placeholder={placeholder}
      emptyMessage="No customers found."
      disabled={disabled}
      className={className}
    />
  );
}
