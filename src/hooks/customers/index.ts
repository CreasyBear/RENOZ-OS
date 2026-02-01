/**
 * Customer Hooks
 *
 * Provides hooks for customer management, analytics, and duplicate detection.
 */

// Main CRUD hooks
export {
  useCustomers,
  useCustomer,
  useCustomerTags,
  useCustomerSearch,
  useCustomersInfinite,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useBulkDeleteCustomers,
  useBulkUpdateCustomers,
  usePrefetchCustomer,
} from './use-customers';
export type { CustomerFilters } from '@/lib/query-keys';

// Contact hooks
export {
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
} from './use-customer-contacts';
export type { CreateContactInput, UpdateContactInput } from './use-customer-contacts';

// Address hooks
export {
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
} from './use-customer-addresses';
export type { CreateAddressInput, UpdateAddressInput, AddressType } from './use-customer-addresses';

// Analytics hooks
export {
  useCustomerKpis,
  useHealthDistribution,
  useCustomerTrends,
  useSegmentPerformance,
  useSegmentAnalytics,
  useLifecycleStages,
  useLifecycleCohorts,
  useChurnMetrics,
  useConversionFunnel,
  useAcquisitionMetrics,
  useQuickStats,
  useValueTiers,
  useValueKpis,
  useProfitabilitySegments,
  useTopCustomers,
  useDashboardAnalytics,
  useValueAnalytics,
  useLifecycleAnalytics,
} from './use-customer-analytics';
export { useCustomerHealthMetrics, useCustomerHealthHistory } from './use-customer-health';
export { useSegments, useSegmentDetail } from './use-customer-segments';

// Duplicate detection hooks
export { useDuplicateDetection } from './use-duplicate-detection';
export {
  useDuplicateScan,
  useDismissDuplicate,
  useMergeHistory,
  useDuplicatesPage,
} from './use-duplicate-scan';

// Re-export types
export type {
  Customer,
  CustomerListQuery,
  CreateCustomer,
  UpdateCustomer,
} from '@/lib/schemas/customers';
export type { HealthMetrics } from './use-customer-health';
export type { SegmentWithStats, SegmentAnalyticsData } from './use-customer-segments';
export type { DuplicateMatch, DuplicateDetectionInput } from './use-duplicate-detection';
