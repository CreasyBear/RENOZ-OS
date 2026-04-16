import { useCallback } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { EntityCombobox } from '@/components/shared/entity-combobox';
import { listWarranties } from '@/server/functions/warranty/core/warranties';

export interface WarrantySummary {
  id: string;
  warrantyNumber: string;
  customerName?: string | null;
  productName?: string | null;
  productSerial?: string | null;
  status: string;
}

export interface WarrantyComboboxProps {
  value?: WarrantySummary | null;
  onSelect: (warranty: WarrantySummary | null) => void;
  customerId?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

export function WarrantyCombobox({
  value,
  onSelect,
  customerId,
  placeholder = 'Search warranties...',
  disabled,
  className,
  id,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: WarrantyComboboxProps) {
  const listWarrantiesFn = useServerFn(listWarranties);

  const searchWarranties = useCallback(
    async (query: string): Promise<WarrantySummary[]> => {
      const result = await listWarrantiesFn({
        data: {
          search: query,
          customerId,
          limit: 20,
          offset: 0,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      });

      return (result.warranties ?? []).map((warranty) => ({
        id: warranty.id,
        warrantyNumber: warranty.warrantyNumber,
        customerName: warranty.customerName,
        productName: warranty.productName,
        productSerial: warranty.productSerial,
        status: warranty.status,
      }));
    },
    [customerId, listWarrantiesFn]
  );

  return (
    <EntityCombobox<WarrantySummary>
      value={value}
      onSelect={onSelect}
      searchFn={searchWarranties}
      getDisplayValue={(warranty) => warranty.warrantyNumber}
      getDescription={(warranty) =>
        [warranty.customerName, warranty.productName, warranty.productSerial]
          .filter(Boolean)
          .join(' · ')
      }
      getKey={(warranty) => warranty.id}
      placeholder={placeholder}
      searchPlaceholder="Search by warranty number, serial, or customer"
      emptyMessage="No warranties found."
      disabled={disabled}
      className={className}
      id={id}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
    />
  );
}
