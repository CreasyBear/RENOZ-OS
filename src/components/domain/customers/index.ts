/**
 * Customer Domain Components
 *
 * Barrel export for customer-related UI components.
 */

// --- Core Components ---
export { CustomerDirectory } from './customer-directory';
export { CustomerTable } from './customer-table'
export { CustomerCard, CustomerCardSkeleton } from './customer-card';

// --- Filter Config (FILTER-STANDARDS compliant) ---
export {
  CUSTOMER_FILTER_CONFIG,
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  CUSTOMER_SIZE_OPTIONS,
  DEFAULT_CUSTOMER_FILTERS,
  createCustomerFilterConfig,
  type CustomerFiltersState,
} from './customer-filter-config';
export { Customer360View } from './customer-360-view';
export { ActivityTimeline } from './activity-timeline';
export { CustomerForm } from './customer-form';
export { CustomerWizard } from './customer-wizard';
export { ContactManager, type ManagedContact } from './contact-manager';
export { AddressManager, type ManagedAddress } from './address-manager';

// --- Container/Presenter Pattern (Gold Standard) ---
export { CustomerDetailContainer, type CustomerDetailContainerProps, type CustomerDetailContainerRenderProps } from './containers/customer-detail-container';
export {
  CustomerActivityTimelineContainer,
  type CustomerActivityTimelineContainerProps,
} from './containers/customer-activity-timeline-container';
export { CustomerDetailView, type CustomerDetailViewProps } from './views/customer-detail-view';

// --- New DataTable-based Components (Gold Standard Pattern) ---
export { CustomersListContainer, type CustomersListContainerProps } from './customers-list-container';
export { CustomersListPresenter, type CustomersListPresenterProps } from './customers-list-presenter';
export { CustomersTablePresenter, type CustomersTablePresenterProps } from './customers-table-presenter';
export { CustomersMobileCards, type CustomersMobileCardsProps } from './customers-mobile-cards';
export { createCustomerColumns, type CustomerTableData, type CreateCustomerColumnsOptions } from './customer-columns';
export {
  CUSTOMER_STATUS_CONFIG,
  CUSTOMER_TYPE_CONFIG,
  CUSTOMER_SIZE_CONFIG,
  getHealthScoreColor,
  formatRelativeTime,
  type CustomerStatus,
  type CustomerType,
  type CustomerSize,
  type SizeConfigItem,
} from './customer-status-config';

// --- Analytics ---
export * from './analytics';

// --- Bulk Operations ---
export * from './bulk';
export type { SelectableCustomer } from './bulk/bulk-selector';

// --- Communications ---
export * from './communications';

// --- Duplicates ---
export * from './duplicates';
export { CompactDuplicateWarning } from './duplicates/duplicate-warning-panel';

// --- Health ---
export * from './health';
export { HealthScoreBadge } from './health/health-score-gauge';

// --- Segments ---
export * from './segments';
