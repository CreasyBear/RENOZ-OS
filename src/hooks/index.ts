/**
 * Custom Hooks
 *
 * Exports for all custom React hooks.
 */

export {
  toast,
  toastSuccess,
  toastError,
  toastWarning,
  toastInfo,
  toastLoading,
  toastPromise,
  dismissToast,
  type ToastOptions,
} from './use-toast'

export {
  useRealtimeSubscription,
  getStatusColor,
  getStatusLabel,
  type ConnectionStatus,
  type RealtimeEvent,
  type RealtimePayload,
  type RealtimeSubscriptionOptions,
  type UseRealtimeSubscriptionResult,
} from './use-realtime-subscription'

export {
  useRealtimeOrders,
  useRealtimeOrdersByStatus,
} from './use-realtime-orders'

export {
  useRealtimePipeline,
  useRealtimePipelineByStage,
  useRealtimeHotLeads,
} from './use-realtime-pipeline'

export {
  useSidebar,
  useSidebarSafe,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
  type SidebarCollapsible,
  type SidebarState,
  type SidebarContextValue,
} from './use-sidebar'

export {
  useIsMobile,
} from './use-mobile'

export {
  useCurrentUser,
  currentUserKeys,
  type CurrentUser,
} from './use-current-user'

export {
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
} from './use-has-permission'

export {
  useCurrentOrg,
  type Organization,
  type UseCurrentOrgResult,
} from './use-current-org'

export {
  fileKeys,
  useAttachments,
  useDownloadUrl,
  useUploadFile,
  useDeleteFile,
  type UseAttachmentsResult,
  type UseUploadFileOptions,
  type UploadFileInput,
} from './use-files'

export {
  customerKeys,
  useCustomers,
  useCustomersInfinite,
  useCustomer,
  useCustomerSearch,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useBulkDeleteCustomers,
  useBulkUpdateCustomers,
  usePrefetchCustomer,
  type UseCustomersOptions,
  type UseCustomerOptions,
  type UseCustomerSearchOptions,
} from './use-customers'

export {
  healthKeys,
  useCustomerHealthMetrics,
  useCustomerHealthHistory,
  useCalculateHealthScore,
  getHealthLevel,
  getHealthColor,
  getHealthBgColor,
  getHealthLabel,
  calculateHealthTrend,
  getHealthRecommendations,
  type HealthMetrics,
  type HealthHistoryPoint,
  type AtRiskCustomer,
  type HealthDistribution,
} from './use-customer-health'

export {
  useDuplicateDetection,
  duplicateDetectionKeys,
  type DuplicateDetectionInput,
  type DuplicateDetectionOptions,
  type DuplicateDetectionResult,
  type DuplicateMatch,
} from './use-duplicate-detection'

// New broadcast-based realtime hooks (org-scoped channels)
export {
  // Generic broadcast hook
  useRealtimeBroadcast,
  getStatusColor as getBroadcastStatusColor,
  getStatusLabel as getBroadcastStatusLabel,
  type BroadcastPayload,
  type UseRealtimeBroadcastOptions,
  type UseRealtimeBroadcastResult,
  // Orders
  useOrdersRealtime,
  type OrderRealtimePayload,
  type UseOrdersRealtimeOptions,
  // Pipeline
  usePipelineRealtime,
  usePipelineByStage,
  type PipelineRealtimePayload,
  type UsePipelineRealtimeOptions,
  // Inventory
  useInventoryRealtime,
  useLowStockAlerts,
  type InventoryRealtimePayload,
  type InventoryBroadcastPayload,
  type UseInventoryRealtimeOptions,
} from './realtime'

// Customer Analytics
export {
  customerAnalyticsKeys,
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
} from './use-customer-analytics'

// Duplicate Scanning
export {
  duplicateScanKeys,
  useDuplicateScan,
  useDismissDuplicate,
  useMergeHistory,
  useDuplicatesPage,
  type ScanDuplicatesOptions,
  type MergeHistoryOptions,
  type DuplicatesPageData,
  type DuplicatePair,
} from './use-duplicate-scan'

// Customer Segments
export {
  segmentKeys,
  useSegments,
  useSegmentDetail,
  type UseSegmentsOptions,
  type UseSegmentDetailOptions,
  type SegmentWithStats,
  type SegmentAnalyticsData,
} from './use-customer-segments'

// Activity Hooks
export {
  activityKeys,
  useActivityFeed,
  useEntityActivities,
  useUserActivities,
  useActivity,
  useActivityStats,
  useActivityLeaderboard,
  useFlattenedActivities,
  useCanLoadMore,
  useInvalidateActivities,
  type UseActivityFeedOptions,
  type UseEntityActivitiesOptions,
  type UseUserActivitiesOptions,
  type UseActivityStatsOptions,
  type UseActivityLeaderboardOptions,
} from './use-activities'

// Inventory Hooks
export {
  useInventory,
  type InventoryItem,
  type MovementRecord,
  type InventoryFilters,
} from './use-inventory'

export {
  useLocations,
  type LocationType,
  type WarehouseLocation,
  type LocationHierarchy,
  type LocationContents,
  type LocationFilters,
} from './use-locations'

// Mobile Hooks
export { useOnlineStatus } from './use-online-status'
