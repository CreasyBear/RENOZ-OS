/**
 * Customer Detail Tabs
 *
 * Lazy-loadable tab components for the customer detail view.
 * Each tab is in a separate file to enable code splitting.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Tab Lazy Loading)
 */

export { CustomerOverviewTab } from './customer-overview-tab';
export type { CustomerOverviewTabProps } from './customer-overview-tab';

export { CustomerOrdersTab } from './customer-orders-tab';
export type { CustomerOrdersTabProps } from './customer-orders-tab';

export { CustomerActivityTab } from './customer-activity-tab';
export type { CustomerActivityTabProps } from './customer-activity-tab';
