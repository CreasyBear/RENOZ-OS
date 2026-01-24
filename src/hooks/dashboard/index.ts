/**
 * Dashboard Hooks
 *
 * TanStack Query hooks for dashboard functionality.
 * Includes metrics, layouts, targets, and scheduled reports.
 *
 * @see src/server/functions/dashboard/
 * @see src/lib/schemas/dashboard/
 */

// Metrics
export {
  useDashboardMetrics,
  useMetricsComparison,
  useEnhancedComparison,
  type UseDashboardMetricsOptions,
  type UseMetricsComparisonOptions,
  type UseEnhancedComparisonOptions,
} from './use-dashboard-metrics';

// Layouts
export {
  useDashboardLayouts,
  useDashboardLayout,
  useUserLayout,
  useAvailableWidgets,
  useCreateDashboardLayout,
  useUpdateDashboardLayout,
  useSaveDashboardLayout,
  useDeleteDashboardLayout,
  useSetDefaultDashboardLayout,
  useCloneDashboardLayout,
  type UseDashboardLayoutsOptions,
  type UseDashboardLayoutOptions,
} from './use-dashboard-layouts';

// Targets
export {
  useTargets,
  useTarget,
  useTargetProgress,
  useCreateTarget,
  useUpdateTarget,
  useDeleteTarget,
  useBulkCreateTargets,
  useBulkUpdateTargets,
  useBulkDeleteTargets,
  type UseTargetsOptions,
  type UseTargetOptions,
  type UseTargetProgressOptions,
} from './use-dashboard-targets';

// Scheduled Reports
export {
  useScheduledReports,
  useScheduledReport,
  useScheduledReportStatus,
  useCreateScheduledReport,
  useUpdateScheduledReport,
  useDeleteScheduledReport,
  useExecuteScheduledReport,
  useBulkUpdateScheduledReports,
  useBulkDeleteScheduledReports,
  type UseScheduledReportsOptions,
  type UseScheduledReportOptions,
} from './use-scheduled-reports';
