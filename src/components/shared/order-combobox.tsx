/**
 * OrderCombobox Component
 *
 * Searchable order/invoice selector for financial forms.
 * Wraps EntityCombobox with order-specific search logic.
 *
 * @see src/components/shared/entity-combobox.tsx
 */

import { useCallback } from 'react';
import { EntityCombobox } from '@/components/shared/entity-combobox';
import { useServerFn } from '@tanstack/react-start';
import { listOrders } from '@/server/functions/orders/orders';

export interface OrderSummary {
  id: string;
  orderNumber: string;
  customerName?: string | null;
  total: number;
  status: string;
}

export interface OrderComboboxProps {
  /** Currently selected order */
  value?: OrderSummary | null;
  /** Selection callback */
  onSelect: (order: OrderSummary | null) => void;
  /** Optional customer ID to filter orders */
  customerId?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * OrderCombobox - Searchable order/invoice selector
 */
export function OrderCombobox({
  value,
  onSelect,
  customerId,
  placeholder = 'Search orders by number...',
  disabled,
  className,
}: OrderComboboxProps) {
  const listOrdersFn = useServerFn(listOrders);

  const searchOrders = useCallback(
    async (query: string): Promise<OrderSummary[]> => {
      const result = await listOrdersFn({
        data: {
          search: query,
          customerId,
          page: 1,
          pageSize: 20,
          sortOrder: 'desc',
        },
      });

      // Transform to OrderSummary format
      return (result.orders ?? []).map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber ?? `Order ${order.id.slice(0, 8)}`,
        customerName: order.customer?.name,
        total: order.total ?? 0,
        status: order.status,
      }));
    },
    [listOrdersFn, customerId]
  );

  const getDisplayValue = useCallback((order: OrderSummary) => {
    const parts = [order.orderNumber];
    if (order.customerName) {
      parts.push(`(${order.customerName})`);
    }
    return parts.join(' ');
  }, []);

  return (
    <EntityCombobox<OrderSummary>
      value={value}
      onSelect={onSelect}
      searchFn={searchOrders}
      getDisplayValue={getDisplayValue}
      getKey={(order) => order.id}
      placeholder={placeholder}
      emptyMessage="No orders found."
      disabled={disabled}
      className={className}
    />
  );
}
