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
export { SavedFilterPresets } from './saved-filter-presets';
export { CustomerHierarchyTree, type CustomerNode } from './customer-hierarchy-tree';
// NOTE: Customer360View deleted (replaced by CustomerDetailView)
// NOTE: ActivityTimeline deprecated (use CustomerActivityTimelineContainer or UnifiedActivityTimeline)
export { CustomerForm } from './customer-form';
export { CustomerWizard } from './customer-wizard';
export { ContactManager, type ManagedContact } from './contact-manager';
export { AddressManager, type ManagedAddress } from './address-manager';

// --- Container/Presenter Pattern (Gold Standard) ---
export { CustomerDetailContainer, type CustomerDetailContainerProps } from './containers/customer-detail-container';
export {
  CustomerActivityTimelineContainer,
  type CustomerActivityTimelineContainerProps,
} from './containers/customer-activity-timeline-container';
export { CommunicationsContainer, type CommunicationsContainerProps } from './containers/communications-container';
export { DuplicatesContainer, type DuplicatesContainerProps } from './containers/duplicates-container';
export { SegmentsContainer, type SegmentsContainerProps } from './containers/segments-container';
export { CustomerHierarchyContainer, type CustomerHierarchyContainerProps } from './containers/customer-hierarchy-container';
export { CustomerDetailView, type CustomerDetailViewProps } from './views/customer-detail-view';

// --- Reusable Components ---
export { MobileSidebarSheet, type MobileSidebarSheetProps, CustomerSidebar, type CustomerSidebarProps } from './components';

// --- New DataTable-based Components (Gold Standard Pattern) ---
export {
  CustomersListContainer,
  type CustomersListContainerProps,
} from './customers-list-container';
export { CustomersTriageSection } from './customers-triage-section';
export { buildCustomerQuery } from '@/lib/utils/customer-filters';
export { CustomersListPresenter, type CustomersListPresenterProps } from './customers-list-presenter';
export { CustomersTablePresenter, type CustomersTablePresenterProps } from './customers-table-presenter';
export { CustomersMobileCards, type CustomersMobileCardsProps } from './customers-mobile-cards';
export { createCustomerColumns, type CustomerTableData, type CreateCustomerColumnsOptions } from './customer-columns';
export {
  CUSTOMER_STATUS_CONFIG,
  CUSTOMER_TYPE_CONFIG,
  CUSTOMER_SIZE_CONFIG,
  getHealthScoreColor,
  getSizeColorClasses,
  formatRelativeTime,
  type CustomerStatus,
  type CustomerType,
  type CustomerSize,
  type SizeConfigItem,
} from './customer-status-config';

// --- Analytics ---
export {
  AnalyticsDashboard,
  LifecycleAnalytics,
  MetricsDashboard,
  SegmentAnalytics,
  ValueAnalysis,
} from './analytics';

// --- Bulk Operations ---
export {
  BulkCommunications,
  BulkExport,
  BulkImport,
  BulkOperations,
  BulkSelector,
} from './bulk';
export type { SelectableCustomer } from './bulk/bulk-selector';

// --- Communications ---
export {
  CommunicationTemplates,
  CommunicationTimeline,
} from './communications';
export type {
  Template,
  TemplateCategory,
  TemplateType,
  Communication,
  CommunicationType,
  CommunicationDirection,
  CommunicationStatus,
} from './communications';

// --- Duplicates ---
export {
  DuplicateComparison,
  DuplicateDetection,
  DuplicateReviewQueue,
  DuplicateScanButton,
  DuplicateWarningPanel,
  MergeHistory,
  MergeWizard,
} from './duplicates';
export { CompactDuplicateWarning } from './duplicates/duplicate-warning-panel';

// --- Health ---
export {
  HealthDashboardContainer,
  HealthDashboard,
  HealthDashboardPresenter,
  HealthRecommendations,
  HealthScoreGauge,
  RiskAlerts,
  ActionPlans,
} from './health';
export type {
  HealthDashboardProps,
  HealthDashboardContainerProps,
  HealthDashboardPresenterProps,
} from './health';
export { HealthScoreBadge } from './health/health-score-gauge';

// --- Segments ---
export {
  SegmentBuilder,
  SegmentManager,
} from './segments';

// --- Detail View Extended (Alerts, Active Items) ---
export { CustomerAlerts, CustomerAlertsSkeleton, type CustomerAlertsProps } from './alerts';
export { CustomerActiveItems, CustomerActiveItemsSkeleton, type CustomerActiveItemsProps } from './active-items';
