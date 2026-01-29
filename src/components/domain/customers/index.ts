/**
 * Customer Domain Components
 *
 * Barrel export for customer-related UI components.
 */

// --- Core Components ---
export { CustomerDirectory } from './customer-directory';
export { CustomerTable, type CustomerTableData } from './customer-table'
export { CustomerCard, CustomerCardSkeleton } from './customer-card';
export { CustomerFilters, ActiveFilterChips, type CustomerFiltersState } from './customer-filters';
export { Customer360View } from './customer-360-view';
export { ActivityTimeline } from './activity-timeline';
export { CustomerForm } from './customer-form';
export { CustomerWizard } from './customer-wizard';
export { ContactManager, type ManagedContact } from './contact-manager';
export { AddressManager, type ManagedAddress } from './address-manager';

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
