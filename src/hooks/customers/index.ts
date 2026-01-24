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

// Analytics hooks
export {
  useCustomerKpis,
  useHealthDistribution,
  useCustomerTrends,
  useSegmentPerformance,
  useSegmentAnalytics,
  useLifecycleStages,
  useValueTiers,
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
