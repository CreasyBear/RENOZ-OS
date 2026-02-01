/**
 * Pricing Domain Components
 *
 * Barrel export for supplier pricing UI components.
 * SUPP-PRICING-MANAGEMENT story.
 */

// Status config
export { PRICE_LIST_STATUS_CONFIG, isPriceListExpired, formatValidPeriod } from './pricing-status-config';

// Column definitions
export { createPricingColumns } from './pricing-columns';
export type { PricingTableItem, CreatePricingColumnsOptions } from './pricing-columns';

// Table component
export { PricingTable } from './pricing-table';
export type { PricingTableProps } from './pricing-table';

// --- Filter Config (FILTER-STANDARDS compliant) ---
export {
  PRICING_FILTER_CONFIG,
  PRICING_STATUS_OPTIONS,
  DEFAULT_PRICING_FILTERS,
  createPricingFilterConfig,
  type PricingFiltersState,
} from './pricing-filter-config';

export { PricingManagement } from './pricing-management';
export type { PricingManagementProps, PaginationInfo } from './pricing-management';

export { PriceComparison } from './price-comparison';
export type { PriceComparisonProps } from './price-comparison';

export { PriceAgreements } from './price-agreements';
export type { PriceAgreementsProps } from './price-agreements';
