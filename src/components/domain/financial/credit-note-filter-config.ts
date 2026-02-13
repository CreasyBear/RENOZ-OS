/**
 * Credit Note Filter Configuration
 *
 * Filter configuration for credit notes list with URL state sync.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import type { FilterBarConfig, FilterOption } from '@/components/shared/filters';
import type { CreditNoteStatus } from '@/lib/schemas/financial/credit-notes';

// ============================================================================
// FILTER STATE TYPE
// ============================================================================

export interface CreditNoteFiltersState extends Record<string, unknown> {
  search: string;
  status: CreditNoteStatus | null;
  customerId: string | null;
}

export const DEFAULT_CREDIT_NOTE_FILTERS: CreditNoteFiltersState = {
  search: '',
  status: null,
  customerId: null,
};

// ============================================================================
// FILTER OPTIONS
// ============================================================================

export const CREDIT_NOTE_STATUS_OPTIONS: FilterOption<CreditNoteStatus>[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
  { value: 'applied', label: 'Applied' },
  { value: 'voided', label: 'Voided' },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const CREDIT_NOTE_FILTER_CONFIG: FilterBarConfig<CreditNoteFiltersState> = {
  search: {
    placeholder: 'Search by credit note number or reason...',
    fields: ['creditNoteNumber', 'reason'],
  },
  filters: [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: CREDIT_NOTE_STATUS_OPTIONS,
      primary: true,
      allLabel: 'All Statuses',
    },
    {
      key: 'customerId',
      label: 'Customer',
      type: 'select',
      options: [], // Populated dynamically
      primary: false,
      allLabel: 'All Customers',
    },
  ],
};

// ============================================================================
// HELPER: Create config with dynamic customer options
// ============================================================================

export function createCreditNoteFilterConfig(
  customers: Array<{ id: string; name: string }>
): FilterBarConfig<CreditNoteFiltersState> {
  const customerOptions: FilterOption<string>[] = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return {
    ...CREDIT_NOTE_FILTER_CONFIG,
    filters: CREDIT_NOTE_FILTER_CONFIG.filters.map((filter) =>
      filter.key === 'customerId' ? { ...filter, options: customerOptions } : filter
    ),
  };
}
